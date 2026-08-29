"""Hậu xử lý code Manim Shorts 9:16 — đảm bảo full-frame."""

from __future__ import annotations

import re

SHORTS_CONFIG_BLOCK = """config.pixel_width = 1080
config.pixel_height = 1920
MARGIN = 0.12
SAFE_W = config.frame_width - 2 * MARGIN
LEFT_EDGE = LEFT * (config.frame_width / 2 - MARGIN)
MAX_LINES_PER_PAGE = 4"""

SHORTS_HELPERS_BLOCK = """
def vn(s, size=30, color=None):
    return Text(
        s,
        font_size=size,
        font="Arial",
        color=color or "#FFFFFF",
        disable_ligatures=True,
    )


def fit_figure_full_width(fig, max_h):
    \"\"\"Phóng hình/chữ full chiều ngang khung Shorts — không để viền đen.\"\"\"
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h:
        fig.scale_to_fit_height(max_h)
    return fig
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
   MARGIN = 0.12
   SAFE_W = config.frame_width - 2 * MARGIN
   LEFT_EDGE = LEFT * (config.frame_width / 2 - MARGIN)
   + hàm vn() và fit_figure_full_width() (xem mẫu)

2. LUỒNG TQH FULL-FRAME:
   (a) Đề trên: problem_block.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT)
   (b) Hình dưới đề: fit_figure_full_width(figure, avail_h); next_to(problem_block, DOWN)
   (c) FadeOut(problem_block) → fit_figure_full_width(figure, frame_height*0.52); to_edge(UP)
   (d) Lời giải DƯỚI hình: next_to(figure, DOWN).align_to(LEFT_EDGE, LEFT); font 30

3. VENN / TẬP HỢP / ĐỒ THỊ:
   - figure = VGroup(các vòng tròn/axes); LUÔN fit_figure_full_width(figure, max_h)
   - CẤM đặt figure nhỏ bên trái với khoảng trống bên phải
   - Công thức inclusion-exclusion: MathTex font scale 1.0, canh LEFT_EDGE dưới hình

4. CẤM TUYỆT ĐỐI (gây viền đen / hình nhỏ):
   - move_to(LEFT * 2.8), to_edge(RIGHT), panel.scale(0.38)
   - scale_to_fit_height(4.0) không kèm scale_to_fit_width(SAFE_W)
   - figure.animate.shift(UP*2) không phóng to
   - move_to(ORIGIN) cho toàn bộ nội dung mà không scale full SAFE_W
   - font_size ≤ 24

5. MẪU CHUẨN: backend/examples/style_shorts_tqh_geometry.py
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
        notes.append("Đã chèn config 1080×1920 + SAFE_W + LEFT_EDGE")

    if "def fit_figure_full_width" not in result:
        result = _inject_after_import(result, SHORTS_HELPERS_BLOCK)
        notes.append("Đã chèn vn() + fit_figure_full_width()")

    if "def vn(" not in result and re.search(r"\bvn\s*\(", result):
        result = _inject_after_import(result, SHORTS_HELPERS_BLOCK.split("def fit_figure")[0])
        notes.append("Đã chèn hàm vn()")

    leaks = detect_landscape_leaks(result)
    notes.extend(leaks)

    return result, notes
