"""Mẫu Landscape — phong cách median (câu hỏi trước, hình dẫn, Transform mượt)."""

from manim import *

STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#22c55e",
}


def vn(text, size=26, color=None):
    return Text(text, font_size=size, color=color or STYLE_VN["text"], disable_ligatures=True)


class LandscapeMedianDemo(Scene):
    """16:9 — khái niệm: tại sao cos 2α có hai dạng?"""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # title
        hook = vn("Tại sao cos 2α có hai công thức?", 30, STYLE_VN["highlight"]).to_edge(UP, buff=0.4)
        self.play(Write(hook))
        self.wait(1.0)

        # Hình minh họa trái (đơn vị tròn đơn giản)
        O = ORIGIN + LEFT * 3.2
        circle = Circle(radius=1.2, color=STYLE_VN["circle"], stroke_width=3).move_to(O)
        A = Dot(O + RIGHT * 1.2, color=STYLE_VN["point"])
        B = Dot(O + UP * 1.2, color=STYLE_VN["point"])
        seg = Line(A.get_center(), B.get_center(), color=STYLE_VN["segment"], stroke_width=4)
        la = vn("α", 24).next_to(A, DR, buff=0.1)
        figure = VGroup(circle, A, B, seg, la).scale_to_fit_height(4.5).move_to(LEFT * 3)

        # Panel phải — câu hỏi trước
        q = vn("Hỏi: Liên hệ cos 2α với cos α, sin α?", 24)
        panel = VGroup(q).arrange(DOWN, aligned_edge=LEFT, buff=0.25).scale(0.45).to_edge(RIGHT, buff=0.4)

        self.play(Create(circle), FadeIn(A), FadeIn(B))
        self.wait(0.8)
        self.play(Create(seg), Write(la), Write(q))
        self.wait(1.0)

        # Trả lời sau — Transform công thức
        eq1 = MathTex(r"\cos 2\alpha = \cos^2\alpha - \sin^2\alpha").scale(0.85)
        eq2 = MathTex(r"\cos 2\alpha = 2\cos^2\alpha - 1").scale(0.85)
        eq1.next_to(q, DOWN, aligned_edge=LEFT, buff=0.3)
        self.play(Write(eq1))
        self.wait(0.8)
        eq2.move_to(eq1)
        self.play(TransformMatchingTex(eq1, eq2))
        self.wait(0.8)

        ans = vn("Hai dạng tương đương!", 28, STYLE_VN["conclusion"])
        ans.next_to(eq2, DOWN, aligned_edge=LEFT, buff=0.35)
        box = SurroundingRectangle(ans, color=STYLE_VN["highlight"], buff=0.12)
        self.play(Write(ans), Create(box))
        self.wait(2.0)
