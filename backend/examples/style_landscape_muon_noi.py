"""Mẫu Landscape — phong cách Toán Học Muôn Nơi (lời giải từng bước SGK)."""

from manim import *

STYLE_VN = {
    "bg": "#0a0e1a",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
}


def vn(text, size=24, color=None):
    return Text(
        text, font="Arial", font_size=size,
        color=color or STYLE_VN["text"], disable_ligatures=True,
    )


class LandscapeMuonNoiDemo(Scene):
    """16:9 — hình trái, lời giải phải, từng bước Indicate + Write."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # Beat title + problem
        header = vn("Ví dụ: Tam giác vuông", 28, STYLE_VN["highlight"]).to_edge(UP, buff=0.35)
        de = vn("Cho tam giác ABC vuông tại A, AB=3, AC=4. Tính BC.", 22)
        de.next_to(header, DOWN, buff=0.25)
        self.play(FadeIn(header), Write(de))
        self.wait(1.0)

        # Construction — tam giác
        A = LEFT * 3.2 + DOWN * 1.0
        B = A + RIGHT * 2.4
        C = A + UP * 3.2
        dot_a = Dot(A, color=STYLE_VN["point"])
        dot_b = Dot(B, color=STYLE_VN["point"])
        dot_c = Dot(C, color=STYLE_VN["point"])
        ab = Line(A, B, color=STYLE_VN["segment"], stroke_width=4)
        ac = Line(A, C, color=STYLE_VN["segment"], stroke_width=4)
        bc = Line(B, C, color=STYLE_VN["segment"], stroke_width=4)
        ra = RightAngle(Line(A, B), Line(A, C), length=0.25, color=STYLE_VN["highlight"])
        labels = VGroup(
            vn("A", 22).next_to(dot_a, DL, buff=0.08),
            vn("B", 22).next_to(dot_b, DR, buff=0.08),
            vn("C", 22).next_to(dot_c, UL, buff=0.08),
        )
        figure = VGroup(dot_a, dot_b, dot_c, ab, ac, bc, ra, labels)
        figure.scale_to_fit_height(4.8).move_to(LEFT * 3)

        panel_steps = []
        step_panel = VGroup().to_edge(RIGHT, buff=0.35)

        self.play(LaggedStart(Create(ab), Create(ac), lag_ratio=0.2))
        self.wait(0.8)
        self.play(FadeIn(dot_a), FadeIn(dot_b), FadeIn(dot_c), FadeIn(labels), Create(ra))
        self.wait(0.8)
        self.play(Create(bc))
        self.wait(0.8)

        # Bước 1
        s1 = vn("Bước 1: Áp dụng định lý Pythagore", 22)
        s1_formula = MathTex(r"BC^2 = AB^2 + AC^2").scale(0.75)
        block1 = VGroup(s1, s1_formula).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        block1.scale(0.5).to_edge(RIGHT, buff=0.4).shift(UP * 0.5)
        self.play(Indicate(bc), Write(s1), Write(s1_formula))
        self.wait(1.0)

        # Bước 2
        s2 = vn("Bước 2: Thay số", 22)
        s2_formula = MathTex(r"BC^2 = 3^2 + 4^2 = 25").scale(0.75)
        block2 = VGroup(s2, s2_formula).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        block2.scale(0.5).next_to(block1, DOWN, aligned_edge=LEFT, buff=0.35)
        self.play(Indicate(VGroup(ab, ac)), Write(s2), Write(s2_formula))
        self.wait(1.0)

        # Kết luận
        kl = vn("Vậy BC = 5", 30, STYLE_VN["conclusion"])
        kl.next_to(block2, DOWN, aligned_edge=LEFT, buff=0.4)
        frame = SurroundingRectangle(kl, color=STYLE_VN["highlight"], buff=0.15)
        self.play(Write(kl), Create(frame))
        self.wait(2.0)
