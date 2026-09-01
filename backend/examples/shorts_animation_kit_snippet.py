"""Bộ helper + hằng số hiệu ứng Shorts NTSM — COPY NGUYÊN KHỐI vào đầu mọi file Gem sinh ra.

Không render trực tiếp. Mẫu dùng kit: style_shorts_sync_choreography.py
Upload file này vào Gem Knowledge cùng GEM-INSTRUCTIONS-MANIM.txt.
"""

from manim import *

# --- Màu NTSM (BẮT BUỘC — không đổi hex tùy ý) ---
STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",       # đường tròn, cung
    "segment": "#1e40af",     # cạnh, đoạn thẳng, trục
    "point": "#8b1a1a",       # Dot điểm
    "text": "#FFFFFF",
    "highlight": "#FFD700",   # Indicate, góc, nhấn mạnh
    "conclusion": "#FF8C00",  # kết luận
    "venn_t": "#1e40af",      # Venn tập T (cùng segment)
    "venn_v": "#8b1a1a",      # Venn tập V (cùng point)
    "venn_a": "#3d6b2f",      # Venn tập A (cùng circle)
}

# --- Độ dày nét (nhất quán mọi ví dụ) ---
DOT_RADIUS = 0.08
STROKE_CIRCLE = 4
STROKE_SEGMENT = 3
STROKE_AUX = 2          # đường phụ, median
ANGLE_RADIUS = 0.28
RIGHT_ANGLE_LEN = 0.22

# --- Thời lượng hiệu ứng (đồng bộ chữ ↔ hình) ---
RUN_CREATE_MAJOR = 1.0    # Circle, Axes
RUN_CREATE_LINE = 0.75    # Line, Polygon cạnh
RUN_FADEIN_DOT = 0.45
RUN_WRITE = 0.65
RUN_INDICATE = 0.55
RUN_ANGLE = 0.5
LAG_TEXT = 0.14           # LaggedStart giữa các dòng đề
WAIT_BEAT = 0.85          # sau MỖI beat solution / problem


def interior_angle_at(vertex, arm1, arm2, radius=ANGLE_RADIUS, color=None, **kwargs):
    v = vertex.get_center() if hasattr(vertex, "get_center") else vertex
    a1 = arm1.get_center() if hasattr(arm1, "get_center") else arm1
    a2 = arm2.get_center() if hasattr(arm2, "get_center") else arm2
    return Angle(
        Line(v, a1, buff=0),
        Line(v, a2, buff=0),
        radius=radius,
        other_angle=False,
        color=color or STYLE_VN["highlight"],
        **kwargs,
    )


def right_angle_at(vertex, arm1, arm2, length=RIGHT_ANGLE_LEN, **kwargs):
    v = vertex.get_center() if hasattr(vertex, "get_center") else vertex
    a1 = arm1.get_center() if hasattr(arm1, "get_center") else arm1
    a2 = arm2.get_center() if hasattr(arm2, "get_center") else arm2
    return RightAngle(Line(v, a1, buff=0), Line(v, a2, buff=0), length=length, **kwargs)


def dot_at(point, color=None, radius=DOT_RADIUS):
    return Dot(point, color=color or STYLE_VN["point"], radius=radius)


def play_sync(self, text_anim, *figure_anims, run_time=None):
    """Một beat lời giải: chữ + hình CÙNG LÚC (không Write xong rồi mới Indicate)."""
    anims = [text_anim, *figure_anims]
    rt = run_time or max(RUN_WRITE, RUN_INDICATE, RUN_ANGLE, 0.55)
    if len(anims) == 1:
        self.play(anims[0], run_time=rt)
    else:
        self.play(AnimationGroup(*anims, lag_ratio=0.0), run_time=rt)
    self.wait(WAIT_BEAT)


def reveal_figure_build(self, circles=None, lines=None, dots=None, labels=None):
    """Thứ tự dựng hình chuẩn TQH: tròn → cạnh → điểm → nhãn."""
    circles = circles or []
    lines = lines or []
    dots = dots or []
    labels = labels or []
    if circles:
        self.play(*[Create(c) for c in circles], run_time=RUN_CREATE_MAJOR)
    if lines:
        self.play(
            LaggedStart(*[Create(l) for l in lines], lag_ratio=0.08),
            run_time=RUN_CREATE_LINE,
        )
    if dots:
        self.play(
            LaggedStart(*[FadeIn(d, scale=0.6) for d in dots], lag_ratio=0.1),
            run_time=RUN_FADEIN_DOT,
        )
    if labels:
        self.play(LaggedStart(*[Write(l) for l in labels], lag_ratio=0.1), run_time=RUN_WRITE)
