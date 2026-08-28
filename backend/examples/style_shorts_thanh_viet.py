"""Mẫu Shorts — phong cách Thanh Thầy Việt (9:16, 1 khung, text tối thiểu)."""

from manim import *

# Shorts dọc: bỏ comment dưới khi render 9:16
# config.pixel_width = 1080
# config.pixel_height = 1920

STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
}


def vn(text, size=32, color=None):
    return Text(
        text, font="Arial", font_size=size,
        color=color or STYLE_VN["text"], disable_ligatures=True,
    )


class ShortsThanhVietDemo(Scene):
    """1 kỹ năng / 30–60s — tập trung giữa màn hình."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # Beat 0: title
        title = vn("Công thức cos 2α", 36, STYLE_VN["highlight"]).to_edge(UP, buff=0.6)
        self.play(FadeIn(title))
        self.wait(1.2)

        # Beat 1: problem (từng dòng)
        line1 = vn("Cho góc α", 28).next_to(title, DOWN, buff=0.5)
        self.play(Write(line1))
        self.wait(0.8)
        ask = vn("Tính cos 2α ?", 30, STYLE_VN["highlight"]).next_to(line1, DOWN, buff=0.35)
        self.play(Write(ask))
        self.wait(1.0)

        # Beat 2: construction + công thức (giữa khung)
        formula = MathTex(r"\cos 2\alpha = \cos^2\alpha - \sin^2\alpha").scale(1.1)
        formula.set_color(STYLE_VN["text"])
        box = SurroundingRectangle(formula, color=STYLE_VN["segment"], buff=0.2)
        group = VGroup(formula, box).move_to(ORIGIN)
        self.play(Write(formula), Create(box))
        self.wait(1.0)

        # Beat 3: conclusion
        done = vn("Nhớ: cos2α = cos²α − sin²α", 26, STYLE_VN["conclusion"])
        done.next_to(group, DOWN, buff=0.5)
        frame = SurroundingRectangle(done, color=STYLE_VN["highlight"], buff=0.15)
        self.play(Write(done), Create(frame))
        self.wait(2.0)
