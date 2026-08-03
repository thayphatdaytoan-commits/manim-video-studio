"""AI generation tách 2 bước: (1) đề -> GeoGebra, (2) GeoGebra -> Manim."""

from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("manim-studio.generate")

GEMINI_MODELS = (
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
)

GEOGEBRA_PROMPT = """Bạn là chuyên gia dựng hình GeoGebra cho giáo viên Toán Việt Nam.
Nhiệm vụ DUY NHẤT: từ đề bài (văn bản và/hoặc ảnh) tạo lệnh GeoGebra vẽ hình CHUẨN XÁC như đề.
Lệnh sẽ chạy trên GeoGebra WEB applet (deployggb) — chỉ dùng cú pháp an toàn bên dưới.

Trả về ĐÚNG 1 JSON (không markdown):
{
  "title": "tiêu đề ngắn",
  "geogebra_mode": "geometry" | "graphing" | "3d",
  "geogebra_commands": ["lệnh1", "lệnh2", ...],
  "notes": "ghi chú ngắn"
}

QUY TẮC VẼ CHUẨN (BẮT BUỘC):
1. Đọc kỹ đề/ảnh: đúng số đo, góc, quan hệ (vuông, song song, trung điểm, tiếp xúc...).
2. Chỉ HIỆN đối tượng thuộc hình hoàn chỉnh (điểm đề nêu, cạnh, đường tròn chính, nhãn cần thiết).
3. Đường phụ / trung gian: đặt tên rõ (c1, l1, ...) rồi ẨN bằng đúng 1 trong 2 dạng:
   - "SetVisible(c1, false)"
   - hoặc comment "# hide: c1, c2"
4. Thứ tự: dựng đối tượng → dùng giao/quan hệ → ẨN phụ → còn hình sạch.
5. CÚ PHÁP AN TOÀN CHO WEB (ưu tiên):
   - Điểm: "A = (0, 0)", "B = (4, 0)"
   - Đoạn/đường/tròn: "s = Segment(A, B)", "c = Circle(O, 5)", "c = Circle(O, A)"
   - Đa giác: "poly1 = Polygon(A, B, C)" rồi dùng tên poly1 (KHÔNG viết Polygon(...) lồng trong SetColor)
   - Giao: "D = Intersect(c1, c2, 1)"
   - Trung điểm: "M = Midpoint(A, B)"
   - Vuông góc / song song: "p = PerpendicularLine(A, s)", "q = ParallelLine(A, s)"
6. CẤM / TRÁNH (gây lỗi popup trên web):
   - KHÔNG dùng Point(circle, t) kiểu tham số cung
   - KHÔNG dùng biến chưa gán (G, H...) nếu chưa tạo
   - KHÔNG viết SetColor(Polygon(A,B,C), ...) — phải đặt tên trước
   - KHÔNG dùng lệnh lạ ngoài danh sách trên
7. Nhãn: "ShowLabel(A, true)" cho điểm chính; đường phụ thì ẩn + không hiện nhãn.
8. Không bịa chi tiết không có trong đề.
9. graphing nếu đồ thị hàm; 3d nếu hình không gian; còn lại geometry.
10. Không sinh mã Manim trong bước này.
"""

MANIM_PROMPT = """Bạn là chuyên gia Manim Community cho video bài giảng Toán Việt Nam.
Nhiệm vụ DUY NHẤT: từ đề bài + danh sách lệnh GeoGebra ĐÃ CHỈNH SỬA HOÀN CHỈNH, viết mã Manim dựng HÌNH ĐÚNG như GeoGebra (không phụ thuộc runtime GeoGebra).

Trả về ĐÚNG 1 JSON (không markdown):
{
  "scene_name": "TenClassScene",
  "manim_code": "from manim import *\\n...",
  "notes": "ghi chú ngắn"
}

QUY TẮC MANIM:
1. Manim Community Edition; class kế thừa Scene hoặc ThreeDScene.
2. scene_name khớp tên class trong manim_code.
3. Tái tạo đúng hình từ lệnh GeoGebra đã cho (tọa độ, đoạn, góc, đường tròn...).
4. BỎ qua / không vẽ các đối tượng đã SetVisible(..., false) trong GeoGebra — chỉ animation phần hình hoàn chỉnh.
5. Animation rõ ràng từng bước (Create/Write/FadeIn), có self.wait() hợp lý, không quá dài.
6. Chữ tiếng Việt: Text(...) hoặc Tex + preamble vietnam:
   config.tex_template.add_to_preamble(r"\\\\usepackage[utf8]{vietnam}")
7. Chỉ import manim / numpy. Code chạy được ngay, không placeholder.
8. Không trả về lệnh GeoGebra.
"""


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise ValueError("AI không trả về JSON hợp lệ")
        return json.loads(match.group(0))


def _call_gemini(
    api_key: str,
    prompt: str,
    image_b64: str | None = None,
    mime_type: str = "image/png",
    model: str = "gemini-2.0-flash",
) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if image_b64:
        raw = image_b64
        if "," in raw and raw.strip().startswith("data:"):
            header, raw = raw.split(",", 1)
            if "image/" in header:
                mime_type = header.split(";")[0].split(":")[-1]
        parts.insert(0, {"inline_data": {"mime_type": mime_type, "data": raw}})

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.25,
            "responseMimeType": "application/json",
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        logger.warning("Gemini HTTP %s: %s", exc.code, err_body[:500])
        raise RuntimeError(f"Gemini lỗi {exc.code}: {err_body[:300]}") from exc

    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini không trả candidate: {payload}")
    parts_out = candidates[0].get("content", {}).get("parts") or []
    texts = [p.get("text", "") for p in parts_out if p.get("text")]
    if not texts:
        raise RuntimeError("Gemini trả về rỗng")
    return "\n".join(texts)


def _gemini_with_fallback(
    api_key: str,
    prompt: str,
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> str:
    last_err: Exception | None = None
    for model in GEMINI_MODELS:
        try:
            return _call_gemini(
                api_key=api_key.strip(),
                prompt=prompt,
                image_b64=image_b64,
                mime_type=mime_type,
                model=model,
            )
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            logger.info("Model %s failed: %s", model, exc)
    raise RuntimeError(str(last_err) if last_err else "Không gọi được Gemini")


def _normalize_commands(commands: Any) -> list[str]:
    if isinstance(commands, str):
        commands = [c.strip() for c in commands.split("\n") if c.strip()]
    if not isinstance(commands, list):
        return []

    out: list[str] = []
    for raw in commands:
        cmd = str(raw).strip()
        if not cmd:
            continue
        # Sửa lỗi AI hay gặp
        cmd = cmd.replace("Polvgon", "Polygon")
        # SetColor(Polygon(A,B,C), ...) → bỏ qua (gây lỗi); nhắc dùng tên đã gán
        if re.match(r"^SetColor\s*\(\s*Polygon\s*\(", cmd, re.I):
            continue
        # Point(circle, t) tham số cung — dễ lỗi trên web; bỏ
        if re.match(r"^[A-Za-z_]\w*\s*=\s*Point\s*\(\s*[A-Za-z_]\w*\s*,\s*[-+]?\d", cmd):
            continue
        out.append(cmd)
    return out


def generate_geogebra(
    *,
    api_key: str,
    problem_text: str = "",
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    if not api_key.strip():
        raise ValueError("Thiếu Gemini API key")
    if not problem_text.strip() and not image_b64:
        raise ValueError("Cần nhập nội dung đề hoặc tải ảnh đề")

    user_prompt = GEOGEBRA_PROMPT + "\n\n--- ĐỀ BÀI ---\n"
    user_prompt += problem_text.strip() or "(Xem hình ảnh đề bài đính kèm)"

    raw = _gemini_with_fallback(
        api_key=api_key,
        prompt=user_prompt,
        image_b64=image_b64,
        mime_type=mime_type,
    )
    data = _extract_json(raw)
    commands = _normalize_commands(data.get("geogebra_commands"))
    if not commands:
        raise ValueError("AI không sinh được lệnh GeoGebra")

    mode = str(data.get("geogebra_mode") or "geometry").strip().lower()
    if mode not in {"geometry", "graphing", "3d"}:
        mode = "geometry"

    return {
        "title": str(data.get("title") or "Hình GeoGebra"),
        "geogebra_mode": mode,
        "geogebra_commands": commands,
        "notes": str(data.get("notes") or ""),
    }


def generate_manim_from_geogebra(
    *,
    api_key: str,
    geogebra_commands: list[str] | str,
    problem_text: str = "",
    geogebra_mode: str = "geometry",
) -> dict[str, Any]:
    if not api_key.strip():
        raise ValueError("Thiếu Gemini API key")

    commands = _normalize_commands(geogebra_commands)
    if not commands:
        raise ValueError("Chưa có lệnh GeoGebra để sinh Manim")

    user_prompt = MANIM_PROMPT
    user_prompt += "\n\n--- ĐỀ BÀI (ngữ cảnh) ---\n"
    user_prompt += problem_text.strip() or "(Không có mô tả thêm)"
    user_prompt += f"\n\n--- GEOGEBRA MODE ---\n{geogebra_mode}"
    user_prompt += "\n\n--- LỆNH GEOGEBRA ĐÃ CHỈNH (hình hoàn chỉnh) ---\n"
    user_prompt += "\n".join(commands)

    raw = _gemini_with_fallback(api_key=api_key, prompt=user_prompt)
    data = _extract_json(raw)

    manim_code = str(data.get("manim_code") or "").strip()
    scene_name = str(data.get("scene_name") or "GeometryScene").strip()
    if not manim_code:
        raise ValueError("AI không sinh được mã Manim")
    if "class " not in manim_code:
        raise ValueError("Mã Manim thiếu class Scene")

    m = re.search(r"class\s+(\w+)\s*\([^)]*Scene", manim_code)
    if m:
        scene_name = m.group(1)

    return {
        "scene_name": scene_name,
        "manim_code": manim_code,
        "notes": str(data.get("notes") or ""),
    }


# Giữ tương thích cũ nếu còn chỗ gọi
def generate_from_problem(**kwargs: Any) -> dict[str, Any]:
    ggb = generate_geogebra(**kwargs)
    manim = generate_manim_from_geogebra(
        api_key=kwargs["api_key"],
        geogebra_commands=ggb["geogebra_commands"],
        problem_text=kwargs.get("problem_text") or "",
        geogebra_mode=ggb["geogebra_mode"],
    )
    return {**ggb, **manim}


def image_file_to_b64(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")
