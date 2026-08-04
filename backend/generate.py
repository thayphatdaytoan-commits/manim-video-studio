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

GEOGEBRA_PROMPT = """Bạn là chuyên gia dựng hình GeoGebra theo PHONG CÁCH NTSM (sách giáo khoa sạch sẽ).
Nhiệm vụ: từ đề bài (văn bản và/hoặc ảnh) tạo lệnh GeoGebra WEB — hình CHUẨN, ÍT ĐƯỜNG DƯ.

Trả về ĐÚNG 1 JSON (không markdown):
{
  "title": "tiêu đề ngắn",
  "geogebra_mode": "geometry" | "graphing" | "3d",
  "geogebra_commands": ["lệnh1", "lệnh2", ...],
  "notes": "ghi chú ngắn"
}

=== NGUYÊN TẮC HÌNH ĐẸP (BẮT BUỘC, học từ NTSM) ===
1. Phân tách Line vs Segment:
   - Line / PerpendicularLine / ParallelLine = đường PHỤ để dựng → tạo xong PHẢI ẨN ngay.
   - Segment = phần HIỆN trên hình (cạnh tam giác, đường cao hữu hạn, dây cung...).
2. Ẩn đường phụ bằng đúng lệnh (sau mỗi Line/Perp/Parallel):
   SetVisibleInView(tên_đối_tượng, 1, false)
   KHÔNG dùng SetVisible(...).
3. Đặt tên rõ ràng kiểu NTSM:
   - Tròn: c_O = Circle(O, 4)
   - Đoạn hiện: seg_AB = Segment(A, B)
   - Đường phụ: line_AC = Line(A, C) rồi SetVisibleInView(line_AC, 1, false)
   - Vuông góc phụ: perp_B = PerpendicularLine(B, line_AC) rồi SetVisibleInView(perp_B, 1, false)
4. Chỉ ShowLabel cho điểm đề bài cần (A,B,C,O,H,...). Không hiện nhãn line_/perp_/seg_ trừ khi đề yêu cầu.
5. Không để Line vô hạn chồng lên hình. Sau khi Intersect xong phải SetVisibleInView đường phụ.
6. Tọa độ gọn, cân đối (ví dụ tam giác nội tiếp: O=(0,0), A=(0,4), B≈(-3.5,-1.94), C≈(3.5,-1.94)).
7. Thứ tự: điểm → đường tròn/cạnh → đường phụ + ẨN ngay → giao điểm → Segment hiện → nhãn.
8. Màu sắc NTSM (thêm cuối script, sau khi dựng xong):
   - Điểm: SetColor(A, 139, 26, 26) và SetPointSize(A, 5)
   - Segment/Line hiện: SetColor(seg_AB, 30, 64, 175) và SetLineThickness(seg_AB, 3)
   - Đường tròn: SetColor(c_O, 61, 107, 47) và SetLineThickness(c_O, 3)
   (Hệ thống cũng tự tô màu NTSM; vẫn nên ghi SetColor cho rõ.)

=== MẪU CHUẨN (Euler / đường cao — copy phong cách này) ===
O = (0, 0)
c_O = Circle(O, 4)
A = (0, 4)
B = (-3.5, -1.94)
C = (3.5, -1.94)
seg_AB = Segment(A, B)
seg_BC = Segment(B, C)
seg_CA = Segment(C, A)
line_AC = Line(A, C)
SetVisibleInView(line_AC, 1, false)
perp_B = PerpendicularLine(B, line_AC)
SetVisibleInView(perp_B, 1, false)
E = Intersect(perp_B, line_AC)
seg_BE = Segment(B, E)
line_AB = Line(A, B)
SetVisibleInView(line_AB, 1, false)
perp_C = PerpendicularLine(C, line_AB)
SetVisibleInView(perp_C, 1, false)
F = Intersect(perp_C, line_AB)
seg_CF = Segment(C, F)
H = Intersect(perp_B, perp_C)
line_BC = Line(B, C)
SetVisibleInView(line_BC, 1, false)
perp_A = PerpendicularLine(A, line_BC)
SetVisibleInView(perp_A, 1, false)
seg_AH = Segment(A, H)
line_AO = Line(A, O)
SetVisibleInView(line_AO, 1, false)
D = Intersect(line_AO, c_O, 2)
seg_AD = Segment(A, D)
seg_BH = Segment(B, H)
seg_HC = Segment(H, C)
seg_CD = Segment(C, D)
seg_DB = Segment(D, B)
M = Midpoint(B, C)
seg_AM = Segment(A, M)
G = Centroid(A, B, C)
line_Euler = Line(H, O)
ShowLabel(A, true)
ShowLabel(B, true)
ShowLabel(C, true)
ShowLabel(O, true)
ShowLabel(H, true)
ShowLabel(E, true)
ShowLabel(F, true)
ShowLabel(D, true)
ShowLabel(M, true)
ShowLabel(G, true)

=== CẤM ===
- SetVisible(...) (sai trên web; dùng SetVisibleInView(obj, 1, false))
- Point(circle, t) tham số cung
- Để Line/PerpendicularLine hiện mà không ẩn
- SetColor(Polygon(...), ...) chưa đặt tên
- Bịa điểm chưa tạo

geogebra_mode: graphing nếu đồ thị; 3d nếu không gian; còn lại geometry.
Không sinh mã Manim ở bước này.
"""

MANIM_PROMPT = """Bạn là chuyên gia Manim Community cho video bài giảng Toán Việt Nam.
Nhiệm vụ DUY NHẤT: từ đề bài + HÌNH GEOGEBRA ĐÃ CHỈNH (ảnh chụp) + danh sách lệnh GeoGebra, viết mã Manim dựng ĐÚNG hình đã chỉnh (không phụ thuộc runtime GeoGebra).

Trả về ĐÚNG 1 JSON (không markdown):
{
  "scene_name": "TenClassScene",
  "manim_code": "from manim import *\\n...",
  "notes": "ghi chú ngắn"
}

QUY TẮC MANIM:
1. Manim Community Edition; class kế thừa Scene hoặc ThreeDScene.
2. scene_name khớp tên class trong manim_code.
3. NẾU CÓ ẢNH HÌNH ĐÃ LƯU: ưu tiên bám theo ảnh (vị trí điểm, đoạn, đường tròn, nhãn) — đây là hình sau khi giáo viên kéo thả/chỉnh trên GeoGebra.
4. Dùng lệnh GeoGebra kèm theo để lấy tên đối tượng / quan hệ dựng hình; nếu lệch với ảnh thì ưu tiên ảnh cho tọa độ và bố cục.
5. BỎ qua / không vẽ các đối tượng đã SetVisibleInView(..., false) hoặc SetVisible(..., false) — chỉ animation phần hình hoàn chỉnh (Segment, Circle hiện, điểm có nhãn).
6. Animation rõ ràng từng bước (Create/Write/FadeIn), có self.wait() hợp lý, không quá dài.
7. Chữ tiếng Việt: Text(...) hoặc Tex + preamble vietnam:
   config.tex_template.add_to_preamble(r"\\\\usepackage[utf8]{vietnam}")
8. Chỉ import manim / numpy. Code chạy được ngay, không placeholder.
9. Không trả về lệnh GeoGebra.
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


class GeminiRateLimitError(RuntimeError):
    """Key bị quota / rate limit — nên thử key khác."""


def _is_rate_limit_error(exc: BaseException, code: int | None = None, body: str = "") -> bool:
    text = f"{exc} {body}".lower()
    if code in {429, 403}:
        if any(
            k in text
            for k in (
                "quota",
                "rate limit",
                "resource_exhausted",
                "too many requests",
                "exceeded",
                "limit: 0",
            )
        ):
            return True
        if code == 429:
            return True
    return any(
        k in text
        for k in ("quota", "rate limit", "resource_exhausted", "too many requests")
    )


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
        msg = f"Gemini lỗi {exc.code}: {err_body[:300]}"
        if _is_rate_limit_error(exc, exc.code, err_body):
            raise GeminiRateLimitError(msg) from exc
        raise RuntimeError(msg) from exc

    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini không trả candidate: {payload}")
    parts_out = candidates[0].get("content", {}).get("parts") or []
    texts = [p.get("text", "") for p in parts_out if p.get("text")]
    if not texts:
        raise RuntimeError("Gemini trả về rỗng")
    return "\n".join(texts)


def _normalize_api_keys(api_key: str | list[str] | None) -> list[str]:
    if api_key is None:
        return []
    if isinstance(api_key, list):
        raw_items = api_key
    else:
        raw_items = re.split(r"[\n,;]+", str(api_key))
    keys: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        k = str(item).strip()
        if not k or k.startswith("#"):
            continue
        if k not in seen:
            seen.add(k)
            keys.append(k)
    return keys


def _gemini_with_fallback(
    api_key: str | list[str],
    prompt: str,
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> str:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")

    last_err: Exception | None = None
    for idx, key in enumerate(keys):
        for model in GEMINI_MODELS:
            try:
                result = _call_gemini(
                    api_key=key,
                    prompt=prompt,
                    image_b64=image_b64,
                    mime_type=mime_type,
                    model=model,
                )
                if idx > 0:
                    logger.info("Đã chuyển sang API key #%s (model %s)", idx + 1, model)
                return result
            except GeminiRateLimitError as exc:
                last_err = exc
                logger.info(
                    "Key #%s model %s bị limit → thử tiếp: %s",
                    idx + 1,
                    model,
                    exc,
                )
                # Limit: thử model khác cùng key, rồi key kế
                continue
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                logger.info("Key #%s model %s lỗi: %s", idx + 1, model, exc)
                # Lỗi khác (auth sai, model 404...): thử model khác; nếu hết model thì key tiếp
                continue
    raise RuntimeError(
        str(last_err)
        if last_err
        else "Không gọi được Gemini (hết key hoặc tất cả bị limit)"
    )


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
        # SetVisibleInView(obj, 1, false) — giữ nguyên (phong cách NTSM)
        if re.match(r"^SetVisibleInView\s*[(\[]", cmd, re.I):
            out.append(cmd)
            continue
        # SetVisible(...) → SetVisibleInView(..., 1, false/true)
        m_vis = re.match(
            r"^SetVisible\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]\s*;?\s*$",
            cmd,
            re.I,
        )
        if m_vis:
            obj = m_vis[1].strip()
            flag = m_vis[2].strip().lower().strip("'\"")
            vis = "false" if flag in {"false", "0", "no"} else "true"
            out.append(f"SetVisibleInView({obj}, 1, {vis})")
            continue
        # # hide: a, b → SetVisibleInView
        m_hide = re.match(r"^#\s*hide\s*:\s*(.+)$", cmd, re.I)
        if m_hide:
            for obj in re.split(r"[,;\s]+", m_hide[1].strip()):
                if obj:
                    out.append(f"SetVisibleInView({obj}, 1, false)")
            continue
        # SetColor(Polygon(A,B,C), ...) → bỏ qua
        if re.match(r"^SetColor\s*\(\s*Polygon\s*\(", cmd, re.I):
            continue
        # Point(circle, t) tham số cung — dễ lỗi trên web; bỏ
        if re.match(r"^[A-Za-z_]\w*\s*=\s*Point\s*\(\s*[A-Za-z_]\w*\s*,\s*[-+]?\d", cmd):
            continue
        out.append(cmd)
    return out


def generate_geogebra(
    *,
    api_key: str | list[str],
    problem_text: str = "",
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")
    if not problem_text.strip() and not image_b64:
        raise ValueError("Cần nhập nội dung đề hoặc tải ảnh đề")

    user_prompt = GEOGEBRA_PROMPT + "\n\n--- ĐỀ BÀI ---\n"
    user_prompt += problem_text.strip() or "(Xem hình ảnh đề bài đính kèm)"

    raw = _gemini_with_fallback(
        api_key=keys,
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
        "keys_available": len(keys),
    }


def generate_manim_from_geogebra(
    *,
    api_key: str | list[str],
    geogebra_commands: list[str] | str,
    problem_text: str = "",
    geogebra_mode: str = "geometry",
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")

    commands = _normalize_commands(geogebra_commands)
    if not commands and not image_b64:
        raise ValueError("Chưa có lệnh GeoGebra hoặc ảnh hình đã lưu để sinh Manim")

    user_prompt = MANIM_PROMPT
    user_prompt += "\n\n--- ĐỀ BÀI (ngữ cảnh) ---\n"
    user_prompt += problem_text.strip() or "(Không có mô tả thêm)"
    user_prompt += f"\n\n--- GEOGEBRA MODE ---\n{geogebra_mode}"
    if image_b64:
        user_prompt += (
            "\n\n--- ẢNH HÌNH GEOGEBRA ĐÃ LƯU (sau kéo thả/chỉnh) ---\n"
            "Ảnh đính kèm là hình HOÀN CHỈNH cần tái tạo trong Manim. "
            "Ưu tiên đúng bố cục và vị trí trên ảnh."
        )
    user_prompt += "\n\n--- LỆNH GEOGEBRA ĐÃ CHỈNH (tham chiếu tên/quan hệ) ---\n"
    user_prompt += "\n".join(commands) if commands else "(không có lệnh — bám theo ảnh)"

    raw = _gemini_with_fallback(
        api_key=keys,
        prompt=user_prompt,
        image_b64=image_b64,
        mime_type=mime_type,
    )
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
        "keys_available": len(keys),
        "used_saved_image": bool(image_b64),
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
