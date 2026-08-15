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

# Model mới trước; bỏ 1.5 / 2.0 (đã shutdown → 404 trên nhiều key).
GEMINI_MODELS = (
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
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

PROBLEM_SOLUTION_PROMPT = """Bạn là giáo viên Toán Việt Nam.
Nhiệm vụ: từ ảnh đề và/hoặc gợi ý văn bản, tạo ĐỀ BÀI rõ ràng và LỜI GIẢI từng bước để làm video bài giảng.

Trả về ĐÚNG 1 JSON (không markdown):
{
  "title": "tiêu đề ngắn",
  "problem_text": "đề bài đầy đủ, rõ ràng (cho biết gì, hỏi gì)",
  "solution_text": "lời giải từng bước; trong JSON dùng \\\\n để xuống dòng, KHÔNG xuống dòng thật trong chuỗi",
  "solution_steps": ["bước 1...", "bước 2...", "..."],
  "notes": "ghi chú ngắn (tuỳ chọn)"
}

YÊU CẦU:
- Tiếng Việt chuẩn sư phạm.
- JSON hợp lệ: mọi xuống dòng trong chuỗi phải là \\n; không cắt JSON giữa chừng.
- Đề bài tự chứa đủ dữ kiện; nếu chỉ có ảnh thì đọc/diễn đạt lại đề từ ảnh.
- Lời giải logic, đủ bước để minh họa hình; không nhảy cóc.
- solution_steps phải khớp solution_text (tách từng ý chính).
- Không viết mã GeoGebra/Manim ở bước này.
"""

STORYBOARD_PROMPT = """Bạn là đạo diễn video bài giảng Toán theo phong cách Math-To-Manim.
Nhiệm vụ: CHỈ viết KỊCH BẢN VIDEO dạng JSON — chưa viết code Python.
Suy nghĩ theo pipeline: hiểu học sinh → kiến thức cần trước → chuỗi giảng → chọn toán → kế hoạch hình/camera → beats.

Trả về ĐÚNG 1 JSON:
{
  "scene_name": "TenClassScene",
  "title": "tiêu đề ngắn",
  "learner": {
    "level": "THCS/THPT/...",
    "assume_knows": ["kiến thức đã biết"],
    "goal": "học sinh hiểu được gì sau video"
  },
  "prerequisites": ["ý cần ôn trước khi vào bài"],
  "teaching_order": ["bước dạy 1", "bước dạy 2", "bước dạy 3"],
  "check_question": "1 câu hỏi kiểm tra cuối (ngắn)",
  "camera": {
    "focus": "figure_then_text",
    "notes": "hình trái, chữ phải; không zoom phức tạp"
  },
  "layout": {
    "figure_area": "left",
    "text_area": "right",
    "figure_fit": "scale_to_fit_height_5_then_shift_left"
  },
  "figure_objects": [
    {"id": "A", "kind": "dot", "x": 0.0, "y": 0.0, "label": "A", "color": "RED"},
    {"id": "B", "kind": "dot", "x": 3.0, "y": 0.0, "label": "B", "color": "RED"},
    {"id": "AB", "kind": "segment", "from": "A", "to": "B", "color": "BLUE", "label": ""}
  ],
  "beats": [
    {
      "id": 1,
      "phase": "problem",
      "comment_vi": "Hiện đề bài",
      "teach_point": "nêu đề",
      "text_lines": ["Đề: ..."],
      "actions": [
        {"op": "write_text", "target": "problem_block"},
        {"op": "wait", "seconds": 1.0}
      ],
      "reveal_objects": [],
      "camera_hint": "nhìn toàn cảnh"
    },
    {
      "id": 2,
      "phase": "solution",
      "comment_vi": "Bước 1: dựng đoạn AB",
      "teach_point": "xác định cạnh AB",
      "text_lines": ["1) Dựng đoạn AB"],
      "actions": [
        {"op": "create", "targets": ["A", "B", "AB"]},
        {"op": "indicate", "targets": ["AB"]},
        {"op": "wait", "seconds": 0.8}
      ],
      "reveal_objects": ["A", "B", "AB"],
      "camera_hint": "nhấn mạnh AB"
    },
    {
      "id": 99,
      "phase": "check",
      "comment_vi": "Câu hỏi kiểm tra",
      "teach_point": "kiểm tra hiểu bài",
      "text_lines": ["Hỏi: ...?"],
      "actions": [
        {"op": "write_text", "target": "check_block"},
        {"op": "wait", "seconds": 1.2}
      ],
      "reveal_objects": [],
      "camera_hint": "nhìn chữ kiểm tra"
    }
  ],
  "notes": "ghi chú"
}

=== QUY TẮC KỊCH BẢN ===
1. learner / prerequisites / teaching_order / check_question: BẮT BUỘC có (ngắn gọn tiếng Việt).
2. Tọa độ figure_objects trong x∈[-3.5,3.5], y∈[-2.5,2.5] (đã scale; KHÔNG copy tọa độ GeoGebra lớn).
3. kind chỉ: dot | segment | line | circle | polygon | label | angle_mark
4. op chỉ: write_text | create | fade_in | indicate | set_color | wait
5. Beat đầu phase=problem; giữa = solution theo teaching_order; beat cuối phase=check.
6. Mỗi bước lời giải = 1 beat; text_lines ≤ 2 dòng.
7. camera.focus + camera_hint từng beat — CHỈ gợi ý bố cục (không MovingCameraScene).
8. Không viết code Manim/Python.
9. Hướng dẫn người dùng: ưu tiên bố cục/hiệu ứng theo đó.
10. Bỏ object GeoGebra đã ẩn (SetVisibleInView false).
"""

MANIM_FROM_STORYBOARD_PROMPT = """Bạn là lập trình viên Manim Community Edition (ManimCE).
Nhiệm vụ: chuyển KỊCH BẢN JSON thành mã Python Manim AN TOÀN cho Docker/Render Free.

Trả về ĐÚNG 1 JSON:
{
  "scene_name": "TenClassScene",
  "manim_code": "from manim import *\\n...",
  "notes": "tóm tắt"
}

=== SYSTEM / KIẾN TRÚC CODE (BẮT BUỘC) ===
from manim import *

class TenClassScene(Scene):  # CHỈ Scene — không MovingCameraScene/ThreeDScene
    def construct(self):
        # 1) Text/MarkupText tiếng Việt (font mặc định OK; disable_ligatures=True)
        # 2) Dot/Line/Circle/Polygon/Angle từ figure_objects
        # 3) Có thể ImageMobject(path) nếu có ảnh GeoGebra
        # 4) figure = VGroup(...).scale_to_fit_height(5).move_to(LEFT * 3)
        # 5) text_panel = VGroup(...).arrange(DOWN, aligned_edge=LEFT).scale(0.45).to_edge(RIGHT, buff=0.3)
        # 6) từng beat: comment tiếng Việt + Create/Write/Indicate + self.wait()

=== API ƯU TIÊN (Manim CE) ===
Text, MarkupText, Paragraph,
Dot, Line, DashedLine, Circle, Arc, Polygon, Triangle, Square, Rectangle,
Angle, RightAngle, VGroup, ImageMobject,
SurroundingRectangle, BackgroundRectangle,
Create, Write, FadeIn, FadeOut, Indicate, ReplacementTransform,
self.wait, scale_to_fit_height, move_to, to_edge, next_to, arrange,
RED, BLUE, GREEN, YELLOW, WHITE, ORANGE, LEFT, RIGHT, UP, DOWN

Nhãn điểm: Text("A", font_size=28, disable_ligatures=True) — KHÔNG Label("A").

=== CẤM (Render Free / CE traps) ===
Tex, MathTex, SingleStringMathTex, tex_template, add_to_preamble, Typst, MathTypst;
Label("chuỗi"), LabeledLine với chuỗi trần (mặc định MathTex);
MovingCameraScene, ThreeDScene, ZoomedScene, OpenGL*;
Brace.get_tex / DecimalNumber mặc định nếu kéo LaTeX;
import ngoài manim/numpy/math; placeholder/TODO; code cắt cụt.

=== ĐỒNG BỘ ===
Mỗi beat = comment # tiếng Việt + text_lines + create/indicate + wait.
scene_name khớp class. JSON manim_code: xuống dòng là \\n.
"""


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _repair_json_string_escapes(text: str) -> str:
    """Escape raw control chars inside JSON strings; close dangling quote if truncated."""
    out: list[str] = []
    in_str = False
    escape = False
    for ch in text:
        if in_str:
            if escape:
                out.append(ch)
                escape = False
                continue
            if ch == "\\":
                out.append(ch)
                escape = True
                continue
            if ch == '"':
                out.append(ch)
                in_str = False
                continue
            if ch == "\n":
                out.append("\\n")
                continue
            if ch == "\r":
                out.append("\\r")
                continue
            if ch == "\t":
                out.append("\\t")
                continue
            if ord(ch) < 32:
                out.append(f"\\u{ord(ch):04x}")
                continue
            out.append(ch)
            continue
        if ch == '"':
            in_str = True
        out.append(ch)
    if in_str:
        out.append('"')
    return "".join(out)


def _balance_json_brackets(text: str) -> str:
    """Append missing } / ] after truncation (best-effort)."""
    stack: list[str] = []
    in_str = False
    escape = False
    for ch in text:
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]":
            if stack and stack[-1] == ch:
                stack.pop()
    return text + "".join(reversed(stack))


def _loads_json_lenient(text: str) -> dict[str, Any]:
    """Parse JSON with repairs for Gemini quirks (newlines in strings, truncation)."""
    candidates = [text]
    repaired = _repair_json_string_escapes(text)
    if repaired != text:
        candidates.append(repaired)
    # trailing commas before } or ]
    no_trail = re.sub(r",\s*([}\]])", r"\1", repaired)
    if no_trail not in candidates:
        candidates.append(no_trail)
    balanced = _balance_json_brackets(no_trail)
    if balanced not in candidates:
        candidates.append(balanced)

    last_err: Exception | None = None
    for cand in candidates:
        try:
            data = json.loads(cand)
            if isinstance(data, dict):
                return data
            raise ValueError("JSON không phải object {}")
        except (json.JSONDecodeError, ValueError) as exc:
            last_err = exc
            continue
    raise ValueError(
        "AI trả JSON lỗi (chuỗi bị cắt hoặc sai escape). "
        "Thử lại, rút gọn đề/lời giải, hoặc dùng «Đề + lời giải thủ công». "
        f"Chi tiết: {last_err}"
    ) from last_err


def _extract_json(text: str) -> dict[str, Any]:
    text = _strip_code_fence(text or "")
    if not text:
        raise ValueError("AI trả về rỗng (không có JSON)")
    try:
        return _loads_json_lenient(text)
    except ValueError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return _loads_json_lenient(match.group(0))


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
    model: str = "gemini-2.5-flash",
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
            "temperature": 0.2,
            "maxOutputTokens": 8192,
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
    finish = str(candidates[0].get("finishReason") or "")
    if finish and finish.upper() not in {"STOP", "FINISH_REASON_UNSPECIFIED", ""}:
        logger.warning("Gemini finishReason=%s (có thể JSON bị cắt)", finish)
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


def _is_model_not_found(exc: BaseException, code: int | None = None, body: str = "") -> bool:
    text = f"{exc} {body}".lower()
    if code == 404:
        return True
    return "not_found" in text or "is not found" in text or "not found for api version" in text


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
    not_found_models: list[str] = []
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
                continue
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                err_text = str(exc)
                if _is_model_not_found(exc, body=err_text):
                    not_found_models.append(model)
                    logger.info("Key #%s model %s không tồn tại (404) → thử model khác", idx + 1, model)
                else:
                    logger.info("Key #%s model %s lỗi: %s", idx + 1, model, exc)
                continue

    if not_found_models and last_err and _is_model_not_found(last_err, body=str(last_err)):
        raise RuntimeError(
            "Không gọi được Gemini: các model đã thử không còn hỗ trợ "
            f"({', '.join(dict.fromkeys(not_found_models))}). "
            "Hãy dùng nút «Dùng đề + lời giải thủ công» hoặc tạo API key mới trên Google AI Studio."
        ) from last_err

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


def generate_problem_solution(
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
        raise ValueError("Cần tải ảnh đề hoặc nhập gợi ý văn bản")

    user_prompt = PROBLEM_SOLUTION_PROMPT + "\n\n--- GỢI Ý / ĐỀ THÔ ---\n"
    user_prompt += problem_text.strip() or "(Xem ảnh đề bài đính kèm)"

    raw = _gemini_with_fallback(
        api_key=keys,
        prompt=user_prompt,
        image_b64=image_b64,
        mime_type=mime_type,
    )
    data = _extract_json(raw)
    problem = str(data.get("problem_text") or "").strip()
    solution = str(data.get("solution_text") or "").strip()
    steps = data.get("solution_steps") or []
    if isinstance(steps, str):
        steps = [s.strip() for s in steps.split("\n") if s.strip()]
    if not isinstance(steps, list):
        steps = []
    steps = [str(s).strip() for s in steps if str(s).strip()]
    if not problem:
        raise ValueError("AI không tạo được đề bài")
    if not solution:
        if steps:
            solution = "\n".join(f"{i + 1}) {s}" for i, s in enumerate(steps))
        else:
            raise ValueError("AI không tạo được lời giải")
    if not steps:
        steps = [
            ln.strip()
            for ln in re.split(r"\n+", solution)
            if ln.strip() and not ln.strip().startswith("#")
        ]

    return {
        "title": str(data.get("title") or "Đề bài").strip(),
        "problem_text": problem,
        "solution_text": solution,
        "solution_steps": steps,
        "notes": str(data.get("notes") or ""),
        "keys_available": len(keys),
    }


def generate_geogebra(
    *,
    api_key: str | list[str],
    problem_text: str = "",
    image_b64: str | None = None,
    mime_type: str = "image/png",
    solution_text: str = "",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")
    if not problem_text.strip() and not image_b64:
        raise ValueError("Cần nhập nội dung đề hoặc tải ảnh đề")

    user_prompt = GEOGEBRA_PROMPT + "\n\n--- ĐỀ BÀI ---\n"
    user_prompt += problem_text.strip() or "(Xem hình ảnh đề bài đính kèm)"
    if solution_text.strip():
        user_prompt += "\n\n--- LỜI GIẢI (để dựng đúng hình minh họa) ---\n"
        user_prompt += solution_text.strip()

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


def generate_storyboard(
    *,
    api_key: str | list[str],
    geogebra_commands: list[str] | str,
    problem_text: str = "",
    solution_text: str = "",
    solution_steps: list[str] | None = None,
    user_guidance: str = "",
    geogebra_mode: str = "geometry",
    image_b64: str | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")

    problem = (problem_text or "").strip()
    solution = (solution_text or "").strip()
    if not problem:
        raise ValueError("Thiếu đề bài — hãy điền thủ công hoặc dùng AI tạo đề + lời giải")
    if not solution:
        raise ValueError("Thiếu lời giải — hãy điền thủ công hoặc dùng AI tạo đề + lời giải")

    commands = _normalize_commands(geogebra_commands)
    if not commands and not image_b64:
        raise ValueError("Chưa có lệnh GeoGebra hoặc ảnh hình đã lưu để lập kịch bản")

    steps = solution_steps or []
    if isinstance(steps, str):
        steps = [s.strip() for s in steps.split("\n") if s.strip()]
    if not isinstance(steps, list):
        steps = []
    steps = [str(s).strip() for s in steps if str(s).strip()]

    user_prompt = STORYBOARD_PROMPT
    user_prompt += "\n\n--- ĐỀ BÀI ---\n" + problem
    user_prompt += "\n\n--- LỜI GIẢI ---\n" + solution
    if steps:
        user_prompt += "\n\n--- CÁC BƯỚC GIẢI ---\n"
        user_prompt += "\n".join(f"{i + 1}. {s}" for i, s in enumerate(steps))
    user_prompt += f"\n\n--- GEOGEBRA MODE ---\n{geogebra_mode}"
    if user_guidance.strip():
        user_prompt += "\n\n--- HƯỚNG DẪN THÊM CỦA NGƯỜI DÙNG (ƯU TIÊN) ---\n"
        user_prompt += user_guidance.strip()
    if image_b64:
        user_prompt += (
            "\n\n--- ẢNH HÌNH GEOGEBRA ĐÃ LƯU ---\n"
            "Dùng ảnh để chọn đối tượng/hướng bố cục; nhớ scale tọa độ vào [-3.5,3.5]×[-2.5,2.5]."
        )
    user_prompt += "\n\n--- LỆNH GEOGEBRA (tham chiếu; bỏ object ẩn) ---\n"
    user_prompt += "\n".join(commands) if commands else "(không có lệnh — bám theo ảnh)"

    raw = _gemini_with_fallback(
        api_key=keys,
        prompt=user_prompt,
        image_b64=image_b64,
        mime_type=mime_type,
    )
    data = _extract_json(raw)
    if not isinstance(data.get("beats"), list) or not data["beats"]:
        raise ValueError("Kịch bản thiếu beats")
    if not isinstance(data.get("figure_objects"), list):
        data["figure_objects"] = []
    scene_name = str(data.get("scene_name") or "GeometryScene").strip() or "GeometryScene"
    data["scene_name"] = scene_name
    return {
        "storyboard": data,
        "scene_name": scene_name,
        "title": str(data.get("title") or "Kịch bản video"),
        "notes": str(data.get("notes") or ""),
        "keys_available": len(keys),
        "used_saved_image": bool(image_b64),
    }


def generate_manim_from_storyboard(
    *,
    api_key: str | list[str],
    storyboard: dict[str, Any] | str,
    user_guidance: str = "",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")

    if isinstance(storyboard, str):
        storyboard = _extract_json(storyboard)
    if not isinstance(storyboard, dict) or not storyboard.get("beats"):
        raise ValueError("Kịch bản video không hợp lệ — hãy tạo kịch bản trước")

    user_prompt = MANIM_FROM_STORYBOARD_PROMPT
    if user_guidance.strip():
        user_prompt += "\n\n--- HƯỚNG DẪN THÊM (ƯU TIÊN KHI VIẾT CODE) ---\n"
        user_prompt += user_guidance.strip()
    # Pass teaching metadata if present (Math-To-Manim style)
    for key in ("learner", "prerequisites", "teaching_order", "check_question", "camera"):
        if storyboard.get(key):
            user_prompt += f"\n\n--- {key.upper()} ---\n"
            user_prompt += json.dumps(storyboard[key], ensure_ascii=False)
    user_prompt += "\n\n--- KỊCH BẢN JSON ---\n"
    user_prompt += json.dumps(storyboard, ensure_ascii=False, indent=2)[:20000]

    raw = _gemini_with_fallback(api_key=keys, prompt=user_prompt)
    data = _extract_json(raw)
    manim_code = str(data.get("manim_code") or "").strip()
    scene_name = str(
        data.get("scene_name") or storyboard.get("scene_name") or "GeometryScene"
    ).strip()
    if not manim_code:
        raise ValueError("AI không sinh được mã Manim từ kịch bản")
    if "class " not in manim_code:
        raise ValueError("Mã Manim thiếu class Scene")
    m = re.search(r"class\s+(\w+)\s*\([^)]*Scene", manim_code)
    if m:
        scene_name = m.group(1)

    from validate_manim import validate_manim_code

    validation = validate_manim_code(manim_code)
    return {
        "scene_name": scene_name,
        "manim_code": manim_code,
        "notes": str(data.get("notes") or ""),
        "storyboard": storyboard,
        "validation": validation,
        "keys_available": len(keys),
    }


def repair_manim_loop(
    *,
    api_key: str | list[str],
    manim_code: str,
    compile_log: str = "",
    revision_prompt: str = "",
    problem_text: str = "",
    solution_text: str = "",
    max_rounds: int = 2,
) -> dict[str, Any]:
    """Validate → revise from errors/log → re-validate (Math-To-Manim repair loop)."""
    from validate_manim import validate_manim_code, validation_as_log

    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")
    code = (manim_code or "").strip()
    if not code:
        raise ValueError("Chưa có mã Manim")

    rounds: list[dict[str, Any]] = []
    notes_all: list[str] = []
    scene_name = "GeometryScene"

    for i in range(max(1, min(int(max_rounds), 3))):
        validation = validate_manim_code(code)
        # If already ok and no compile log to fix, stop
        if validation["ok"] and not (compile_log or "").strip() and i == 0 and not revision_prompt:
            return {
                "scene_name": (validation.get("scene_names") or [scene_name])[0],
                "manim_code": code,
                "notes": "Mã đã đạt validate — không cần sửa",
                "validation": validation,
                "rounds": rounds,
                "repaired": False,
            }

        log_blob = ""
        if not validation["ok"]:
            log_blob += validation_as_log(validation) + "\n\n"
        if (compile_log or "").strip():
            log_blob += (compile_log or "")[-12000:]

        prompt = (revision_prompt or "").strip()
        if not prompt:
            prompt = (
                "Sửa mã để PASS validate Manim CE và/hoặc hết lỗi biên dịch. "
                "Đổi Tex/MathTex/Label(\"...\") sang Text/MarkupText(disable_ligatures=True). "
                "Chỉ dùng Scene (không MovingCameraScene/ThreeDScene). Giữ ý đồ bài giảng."
            )

        revised = revise_manim_code(
            api_key=keys,
            manim_code=code,
            revision_prompt=prompt,
            compile_log=log_blob,
            problem_text=problem_text,
            solution_text=solution_text,
        )
        code = revised["manim_code"]
        scene_name = revised["scene_name"]
        notes_all.append(revised.get("notes") or f"Vòng {i + 1}")
        post = validate_manim_code(code)
        rounds.append(
            {
                "round": i + 1,
                "notes": revised.get("notes") or "",
                "validation_before": validation,
                "validation_after": post,
            }
        )
        # Clear compile_log after first repair attempt (already applied)
        compile_log = ""
        revision_prompt = ""
        if post["ok"]:
            return {
                "scene_name": scene_name,
                "manim_code": code,
                "notes": " | ".join(notes_all),
                "validation": post,
                "rounds": rounds,
                "repaired": True,
            }

    final_v = validate_manim_code(code)
    return {
        "scene_name": scene_name,
        "manim_code": code,
        "notes": " | ".join(notes_all) or "Đã thử sửa nhưng vẫn còn cảnh báo/lỗi",
        "validation": final_v,
        "rounds": rounds,
        "repaired": True,
    }


def generate_manim_from_geogebra(
    *,
    api_key: str | list[str],
    geogebra_commands: list[str] | str,
    problem_text: str = "",
    solution_text: str = "",
    solution_steps: list[str] | None = None,
    user_guidance: str = "",
    geogebra_mode: str = "geometry",
    image_b64: str | None = None,
    mime_type: str = "image/png",
    storyboard: dict[str, Any] | str | None = None,
) -> dict[str, Any]:
    """Nếu đã có storyboard thì chỉ codegen; không thì tạo storyboard rồi codegen."""
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")

    sb = storyboard
    if isinstance(sb, str) and sb.strip():
        sb = _extract_json(sb)
    if not isinstance(sb, dict) or not sb.get("beats"):
        sb_pack = generate_storyboard(
            api_key=keys,
            geogebra_commands=geogebra_commands,
            problem_text=problem_text,
            solution_text=solution_text,
            solution_steps=solution_steps,
            user_guidance=user_guidance,
            geogebra_mode=geogebra_mode,
            image_b64=image_b64,
            mime_type=mime_type,
        )
        sb = sb_pack["storyboard"]

    result = generate_manim_from_storyboard(
        api_key=keys,
        storyboard=sb,
        user_guidance=user_guidance,
    )
    result["used_saved_image"] = bool(image_b64)
    return result


REVISE_MANIM_PROMPT = """Bạn là chuyên gia sửa mã Manim Community Edition (ManimCE) cho bài giảng Toán Việt Nam trên Render Free.

Nhiệm vụ: chỉnh SỬA mã Manim hiện có theo yêu cầu người dùng và/hoặc nhật ký biên dịch / validate.
Giữ nguyên ý đồ video (đề bài, lời giải từng bước, hiệu ứng hình) trừ khi yêu cầu bảo thay đổi.

Trả về ĐÚNG 1 JSON (không markdown):
{
  "scene_name": "TenClassScene",
  "manim_code": "from manim import *\\n...",
  "notes": "tóm tắt đã sửa gì (tiếng Việt)"
}

QUY TẮC MANIM CE:
1. Trả về TOÀN BỘ file Python đã sửa (không truncation, không diff).
2. scene_name khớp class; class CHỈ kế thừa Scene (không MovingCameraScene/ThreeDScene).
3. Ưu tiên sửa lỗi trong nhật ký / validate (SyntaxError, NameError, Tex, Label...).
4. Tex/MathTex/Label(\"...\") → Text/MarkupText(..., disable_ligatures=True).
5. API an toàn: Text, MarkupText, Dot, Line, Circle, Polygon, Angle, RightAngle, VGroup,
   ImageMobject, SurroundingRectangle, Create, FadeIn, Write, Indicate, ReplacementTransform, wait.
6. Giữ comment tiếng Việt; scale_to_fit_height để tránh cắt hình.
7. Không import ngoài manim/numpy/math; không Typst/MathTypst.
"""


def revise_manim_code(
    *,
    api_key: str | list[str],
    manim_code: str,
    revision_prompt: str = "",
    compile_log: str = "",
    problem_text: str = "",
    solution_text: str = "",
) -> dict[str, Any]:
    keys = _normalize_api_keys(api_key)
    if not keys:
        raise ValueError("Thiếu Gemini API key")
    code = (manim_code or "").strip()
    if not code:
        raise ValueError("Chưa có mã Manim để chỉnh sửa")
    prompt_user = (revision_prompt or "").strip()
    log_text = (compile_log or "").strip()
    if not prompt_user and not log_text:
        raise ValueError("Nhập yêu cầu chỉnh sửa hoặc cần có nhật ký lỗi biên dịch")

    user_prompt = REVISE_MANIM_PROMPT
    if problem_text.strip():
        user_prompt += "\n\n--- ĐỀ BÀI (ngữ cảnh) ---\n" + problem_text.strip()
    if solution_text.strip():
        user_prompt += "\n\n--- LỜI GIẢI (ngữ cảnh) ---\n" + solution_text.strip()
    if prompt_user:
        user_prompt += "\n\n--- YÊU CẦU CHỈNH SỬA CỦA NGƯỜI DÙNG ---\n" + prompt_user
    if log_text:
        # Truncate very long logs but keep error tails
        clipped = log_text[-12000:] if len(log_text) > 12000 else log_text
        user_prompt += "\n\n--- NHẬT KÝ BIÊN DỊCH / LỖI ---\n" + clipped
    user_prompt += "\n\n--- MÃ MANIM HIỆN TẠI ---\n```python\n"
    user_prompt += code[:24000]
    user_prompt += "\n```"

    raw = _gemini_with_fallback(api_key=keys, prompt=user_prompt)
    data = _extract_json(raw)
    new_code = str(data.get("manim_code") or "").strip()
    scene_name = str(data.get("scene_name") or "GeometryScene").strip()
    if not new_code:
        raise ValueError("AI không trả được mã Manim đã sửa")
    if "class " not in new_code:
        raise ValueError("Mã Manim thiếu class Scene")
    m = re.search(r"class\s+(\w+)\s*\([^)]*Scene", new_code)
    if m:
        scene_name = m.group(1)
    from validate_manim import validate_manim_code

    validation = validate_manim_code(new_code)
    return {
        "scene_name": scene_name,
        "manim_code": new_code,
        "notes": str(data.get("notes") or ""),
        "validation": validation,
        "keys_available": len(keys),
    }


# Giữ tương thích cũ nếu còn chỗ gọi
def generate_from_problem(**kwargs: Any) -> dict[str, Any]:
    ggb = generate_geogebra(**kwargs)
    manim = generate_manim_from_geogebra(
        api_key=kwargs["api_key"],
        geogebra_commands=ggb["geogebra_commands"],
        problem_text=kwargs.get("problem_text") or "",
        solution_text=kwargs.get("solution_text") or "",
        geogebra_mode=ggb["geogebra_mode"],
        image_b64=kwargs.get("image_b64"),
        mime_type=kwargs.get("mime_type") or "image/png",
    )
    return {**ggb, **manim}


def image_file_to_b64(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")
