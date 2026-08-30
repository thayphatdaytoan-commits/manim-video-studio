"""Hậu xử lý code Manim Shorts 9:16 — đảm bảo full-frame."""

from __future__ import annotations

import re

SHORTS_CONFIG_BLOCK = """config.pixel_width = 1080
config.pixel_height = 1920
TOP_BUFF = 0.05
BOTTOM_BUFF = 0.05
MARGIN = 0.08
SAFE_W = config.frame_width - 2 * MARGIN
TEXT_W = SAFE_W
FIGURE_RATIO = 0.58
MAX_LINES_PER_PAGE = 4"""


SHORTS_HELPERS_BLOCK = """
TEXT_W = SAFE_W


def center_block(mob):
    \"\"\"Đặt khối chữ vào giữa màn hình (các dòng canh trái bên trong).\"\"\"
    mob.set_x(0)
    return mob


def center_x(mob):
    \"\"\"Đặt hình vào giữa màn hình.\"\"\"
    mob.set_x(0)
    return mob


def vn(s, size=30, color=None, justify=False):
    kw = dict(font_size=size, font="Arial", color=color or "#FFFFFF", disable_ligatures=True)
    if justify:
        return Text(s, width=TEXT_W, justify=True, **kw)
    return Text(s, **kw)


def fit_figure_full_width(fig, max_h):
    \"\"\"Phóng hình/chữ full chiều ngang khung Shorts — không để viền đen.\"\"\"
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h:
        fig.scale_to_fit_height(max_h)
    return fig


def _pt(m):
    return m.get_center() if hasattr(m, "get_center") else m


def interior_angle_at(vertex, arm1, arm2, radius=0.28, color=None, **kwargs):
    \"\"\"∠(arm1 — vertex — arm2) góc TRONG < 180°.\"\"\"
    v, a1, a2 = _pt(vertex), _pt(arm1), _pt(arm2)
    return Angle(
        Line(v, a1, buff=0),
        Line(v, a2, buff=0),
        radius=radius,
        other_angle=False,
        color=color or "#FFD700",
        **kwargs,
    )


def right_angle_at(vertex, arm1, arm2, length=0.22, **kwargs):
    v, a1, a2 = _pt(vertex), _pt(arm1), _pt(arm2)
    return RightAngle(Line(v, a1, buff=0), Line(v, a2, buff=0), length=length, **kwargs)
"""

SHORTS_LANDSCAPE_PATTERNS = [
    re.compile(r"\.move_to\s*\(\s*LEFT\s*\*\s*2\.8"),
    re.compile(r"\.to_edge\s*\(\s*RIGHT"),
    re.compile(r"\.scale\s*\(\s*0\.38\s*\)"),
    re.compile(r"scale_to_fit_height\s*\(\s*4\.0\s*\)"),
    re.compile(r"move_to\s*\(\s*ORIGIN\s*\)"),
]

SHORTS_GEMINI_MANDATORY = """
=== SHORTS 9:16 — BẮT BUỘC KHI video_format="shorts" (ĐỌC TRƯỚC KHI VIẾT CODE) ===

1. ĐẦU FILE (copy nguyên khối — KHÔNG bỏ):
   config.pixel_width = 1080
   config.pixel_height = 1920
   TOP_BUFF = 0.05
   BOTTOM_BUFF = 0.05
   MARGIN = 0.08
   SAFE_W = config.frame_width - 2 * MARGIN
   FIGURE_RATIO = 0.58
   + hàm center_block(), center_x(), vn() và fit_figure_full_width() (xem mẫu)

2. LUỒNG TQH FULL-FRAME (khối chữ giữa màn, canh trái bên trong):
   (a) Đề trên: problem_block.arrange(LEFT) → to_edge(UP, buff=TOP_BUFF) → center_block(problem_block)
   (b) Hình dưới đề: fit_figure_full_width(figure, avail_h); next_to(problem_block, DOWN, buff=0.1); center_x(figure)
   (c) FadeOut(problem_block) → fit_figure_full_width(figure, frame_height*FIGURE_RATIO); to_edge(UP, buff=TOP_BUFF); center_x(figure)
   (d) Lời giải DƯỚI hình: solution_stack + center_block; aligned_edge=LEFT; font 28–32
   (e) Đoạn đề dài: vn("...", justify=True) — canh đều 2 bên trong TEXT_W

3. VENN / TẬP HỢP / ĐỒ THỊ:
   - figure = VGroup(các vòng tròn/axes); LUÔN fit_figure_full_width + center_x
   - CẤM đặt figure nhỏ bên trái với khoảng trống bên phải
   - Công thức inclusion-exclusion: MathTex scale 1.0, trong khối center_block

4. KÝ HIỆU GÓC (< 180°):
   - interior_angle_at(vertex, arm1, arm2) — 2 tia xuất phát TỪ vertex
   - right_angle_at(vertex, arm1, arm2) cho góc vuông
   - CẤM Arc reflex, CẤM other_angle=True, CẤM Angle(Line(A,B), Line(C,D)) không chung đỉnh

5. CẤM TUYỆT ĐỐI:
   - center_x từng dòng chữ (canh giữa từng dòng) — dùng center_block + aligned_edge=LEFT
   - align_to(LEFT_EDGE, LEFT) sát mép trái màn hình
   - move_to(LEFT * 2.8), to_edge(RIGHT), panel.scale(0.38)
   - TOP_BUFF > 0.12 hoặc FIGURE_RATIO < 0.52 (gây viền đen trên/dưới)
   - figure.animate.shift(UP*2) không phóng to
   - font_size ≤ 24

5. MẪU CHUẨN: backend/examples/style_shorts_tqh_geometry.py, style_shorts_venn_sets.py
"""


def is_shorts_format(storyboard: dict | None) -> bool:
    if not storyboard:
        return True
    fmt = str(storyboard.get("video_format") or "shorts").strip().lower()
    return fmt != "landscape"


def _inject_after_import(code: str, block: str) -> str:
    lines = code.split("\n")
    out: list[str] = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and re.match(r"^\s*from manim import", line):
            out.append("")
            out.extend(block.strip().split("\n"))
            out.append("")
            inserted = True
    if not inserted:
        return block.strip() + "\n\n" + code
    return "\n".join(out)


def detect_landscape_leaks(code: str) -> list[str]:
    warnings: list[str] = []
    for pat in SHORTS_LANDSCAPE_PATTERNS:
        if pat.search(code):
            warnings.append(f"Còn pattern landscape trong shorts: {pat.pattern}")
    if re.search(r"align_to\s*\(\s*LEFT_EDGE\s*,\s*LEFT\s*\)", code):
        warnings.append("Shorts: CẤM align_to(LEFT_EDGE, LEFT) sát mép trái màn")
    if re.search(r"aligned_edge\s*=\s*ORIGIN", code) and re.search(r"problem_block|solution_stack|problem_lines", code):
        warnings.append("Shorts: khối chữ nên arrange(DOWN, aligned_edge=LEFT) + center_block")
    return warnings


def enforce_shorts_fullframe_code(
    code: str,
    storyboard: dict | None = None,
) -> tuple[str, list[str]]:
    """Chèn config/helpers Shorts nếu thiếu; cảnh báo pattern landscape."""
    if not is_shorts_format(storyboard):
        return code, []

    notes: list[str] = []
    result = code

    if "config.pixel_width" not in result:
        result = _inject_after_import(result, SHORTS_CONFIG_BLOCK)
        notes.append("Đã chèn config 1080×1920 + SAFE_W + FIGURE_RATIO")

    if "def fit_figure_full_width" not in result:
        result = _inject_after_import(result, SHORTS_HELPERS_BLOCK)
        notes.append("Đã chèn center_block() + center_x() + vn() + fit_figure_full_width()")

    if "def center_block(" not in result and re.search(r"\bcenter_block\s*\(", result):
        result = _inject_after_import(result, "def center_block(mob):\n    mob.set_x(0)\n    return mob")
        notes.append("Đã chèn hàm center_block()")

    if "def center_x(" not in result and re.search(r"\bcenter_x\s*\(", result):
        result = _inject_after_import(result, "def center_x(mob):\n    mob.set_x(0)\n    return mob")
        notes.append("Đã chèn hàm center_x()")

    if "def vn(" not in result and re.search(r"\bvn\s*\(", result):
        result = _inject_after_import(result, SHORTS_HELPERS_BLOCK.split("def fit_figure")[0])
        notes.append("Đã chèn hàm vn()")

    leaks = detect_landscape_leaks(result)
    notes.extend(leaks)

    return result, notes
