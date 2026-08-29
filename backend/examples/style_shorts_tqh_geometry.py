"""Shorts 9:16 — hình học phong cách TQH (đề+hình → ẩn đề → lời giải từng dòng).

Render dọc (tuỳ chọn trong file hoặc CLI):
  manim -pq style_shorts_tqh_geometry.py ShortsTQHGeometryDemo
"""

from manim import *

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

MAX_LINES_PER_PAGE = 4


def vn(text, size=26, color=None):
    return Text(
        text,
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )


class ShortsTQHGeometryDemo(Scene):
    """Mẫu luồng: đề + hình → ẩn đề, hình lên cao → lời giải từng dòng + Indicate."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # --- Giai đoạn 1: ĐỀ + HÌNH cùng lúc ---
        title = vn("Bài toán hình học", 28, STYLE_VN["highlight"]).to_edge(UP, buff=0.35)
        problem_lines = VGroup(
            vn("Cho đường tròn (O), đường kính AB.", 24),
            vn("C là điểm trên cung. Chứng minh:", 24),
            vn("góc ACB vuông.", 24, STYLE_VN["highlight"]),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        problem_block = VGroup(title, problem_lines).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        problem_block.to_edge(UP, buff=0.3)

        O = ORIGIN + DOWN * 0.5
        circle = Circle(radius=1.35, color=STYLE_VN["circle"], stroke_width=3).move_to(O)
        A = Dot(O + LEFT * 1.35, color=STYLE_VN["point"])
        B = Dot(O + RIGHT * 1.35, color=STYLE_VN["point"])
        C = Dot(O + UP * 1.35, color=STYLE_VN["point"])
        AC = Line(A.get_center(), C.get_center(), color=STYLE_VN["segment"])
        BC = Line(B.get_center(), C.get_center(), color=STYLE_VN["segment"])
        AB = Line(A.get_center(), B.get_center(), color=STYLE_VN["segment"], stroke_width=5)
        la = vn("A", 22).next_to(A, DL, buff=0.06)
        lb = vn("B", 22).next_to(B, DR, buff=0.06)
        lc = vn("C", 22).next_to(C, UP, buff=0.06)
        lo = vn("O", 22).next_to(O, DOWN, buff=0.06)
        figure = VGroup(circle, AB, AC, BC, A, B, C, la, lb, lc, lo)
        figure.scale_to_fit_height(3.6).move_to(DOWN * 0.9)

        self.play(Write(title))
        self.play(LaggedStart(*[Write(l) for l in problem_lines], lag_ratio=0.2))
        self.wait(0.6)
        self.play(
            Create(circle),
            FadeIn(A),
            FadeIn(B),
            FadeIn(C),
            run_time=1.2,
        )
        self.play(Create(AB), Create(AC), Create(BC), Write(la), Write(lb), Write(lc), Write(lo))
        self.wait(1.0)

        # --- Giai đoạn 2: Ẩn đề, đẩy hình lên ---
        self.play(FadeOut(problem_block))
        self.play(figure.animate.shift(UP * 2.0))
        self.wait(0.5)

        solution_stack = VGroup()
        stack_anchor = figure.get_bottom() + DOWN * 0.45

        steps = [
            ("Ta có AB là đường kính.", None, None),
            (None, r"\Rightarrow \angle ACB = 90^\circ", "ACB"),
            ("Vậy tam giác ACB vuông tại C.", None, ("AC", "BC")),
            ("Kết luận: góc ACB vuông.", None, "ACB"),
        ]

        for text_vi, latex, indicate_targets in steps:
            new_parts = VGroup()
            if text_vi:
                new_parts.add(vn(text_vi, 24))
            if latex:
                new_parts.add(MathTex(latex).scale(0.9))
            new_parts.arrange(DOWN, aligned_edge=LEFT, buff=0.08)

            if len(solution_stack) >= MAX_LINES_PER_PAGE:
                self.play(FadeOut(solution_stack))
                solution_stack = VGroup()
                stack_anchor = figure.get_bottom() + DOWN * 0.45

            if len(solution_stack) == 0:
                new_parts.move_to(stack_anchor, aligned_edge=UP + LEFT)
            else:
                new_parts.next_to(solution_stack, DOWN, aligned_edge=LEFT, buff=0.18)

            anims = [Write(new_parts)]
            if indicate_targets:
                if isinstance(indicate_targets, str):
                    targets = [figure] if indicate_targets == "ACB" else []
                    if indicate_targets == "ACB":
                        ang = RightAngle(AC, BC, length=0.22, color=STYLE_VN["highlight"])
                        targets = [ang]
                        figure.add(ang)
                else:
                    targets = [AC if t == "AC" else BC for t in indicate_targets]
                if targets:
                    anims.append(Indicate(VGroup(*targets), color=STYLE_VN["highlight"]))

            self.play(*anims)
            solution_stack.add(new_parts)
            self.wait(0.85)

        conclusion = vn("ĐPCM.", 28, STYLE_VN["conclusion"])
        conclusion.next_to(solution_stack, DOWN, buff=0.25, aligned_edge=LEFT)
        box = SurroundingRectangle(conclusion, color=STYLE_VN["highlight"], buff=0.12)
        self.play(Write(conclusion), Create(box))
        self.wait(2.0)
