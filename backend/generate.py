"""AI generation: đề bài (text/ảnh) -> GeoGebra commands + Manim code via Gemini."""

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

SYSTEM_PROMPT = """Bạn là trợ lý hình học cho giáo viên Toán Việt Nam.
Nhiệm vụ: từ đề bài (văn bản và/hoặc ảnh), tạo:
1) Lệnh GeoGebra để dựng hình chính xác
2) Mã Manim Community (Python) để làm video minh họa

YÊU CẦU BẮT BUỘC — trả về ĐÚNG 1 JSON object (không markdown, không giải thích ngoài JSON):
{
  "title": "tiêu đề ngắn",
  "geogebra_mode": "geometry" | "graphing" | "3d",
  "geogebra_commands": ["lệnh1", "lệnh2", ...],
  "scene_name": "TenClassScene",
  "manim_code": "from manim import *\\n...",
  "notes": "ghi chú ngắn cho giáo viên"
}

QUY TẮC GEOGEBRA:
- Dùng cú pháp GeoGebra chuẩn (tiếng Anh): Point, Segment, Line, Circle, Polygon, Angle, Intersect, ...
- Ví dụ: "A = (0, 0)", "B = (4, 0)", "c = Circle(A, B)", "f: y = x^2"
- Đặt tên điểm rõ ràng; hiện nhãn cần thiết
- Không dùng lệnh không tồn tại; ưu tiên hình tối giản đúng đề
- Nếu là đồ thị hàm: geogebra_mode = "graphing"
- Nếu hình không gian: geogebra_mode = "3d"

QUY TẮC MANIM:
- Manim Community Edition, class kế thừa Scene hoặc ThreeDScene
- scene_name phải khớp tên class trong manim_code
- Với chữ tiếng Việt dùng Text(...) hoặc Tex kèm:
  config.tex_template.add_to_preamble(r"\\\\usepackage[utf8]{vietnam}")
- Animation ngắn gọn (Write/Create/FadeIn), self.wait() hợp lý
- Không import thư viện ngoài manim/numpy
- Code chạy được ngay, không placeholder
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
        parts.insert(
            0,
            {"inline_data": {"mime_type": mime_type, "data": raw}},
        )

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.35,
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


def generate_from_problem(
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

    user_prompt = SYSTEM_PROMPT + "\n\n--- ĐỀ BÀI ---\n"
    user_prompt += problem_text.strip() or "(Xem hình ảnh đề bài đính kèm)"

    last_err: Exception | None = None
    raw = ""
    for model in GEMINI_MODELS:
        try:
            raw = _call_gemini(
                api_key=api_key.strip(),
                prompt=user_prompt,
                image_b64=image_b64,
                mime_type=mime_type,
                model=model,
            )
            break
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            logger.info("Model %s failed: %s", model, exc)
    else:
        raise RuntimeError(str(last_err) if last_err else "Không gọi được Gemini")

    data = _extract_json(raw)

    commands = data.get("geogebra_commands") or []
    if isinstance(commands, str):
        commands = [c.strip() for c in commands.split("\n") if c.strip()]
    commands = [str(c).strip() for c in commands if str(c).strip()]

    manim_code = str(data.get("manim_code") or "").strip()
    scene_name = str(data.get("scene_name") or "GeometryScene").strip()
    mode = str(data.get("geogebra_mode") or "geometry").strip().lower()
    if mode not in {"geometry", "graphing", "3d"}:
        mode = "geometry"

    if not manim_code:
        raise ValueError("AI không sinh được mã Manim")
    if "class " not in manim_code:
        raise ValueError("Mã Manim thiếu class Scene")

    # Đảm bảo scene_name khớp class nếu có thể
    m = re.search(r"class\s+(\w+)\s*\([^)]*Scene", manim_code)
    if m:
        scene_name = m.group(1)

    return {
        "title": str(data.get("title") or "Hình minh họa"),
        "geogebra_mode": mode,
        "geogebra_commands": commands,
        "scene_name": scene_name,
        "manim_code": manim_code,
        "notes": str(data.get("notes") or ""),
    }


def image_file_to_b64(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")
