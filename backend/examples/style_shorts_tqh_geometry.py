"""Shorts 9:16 — hình học TQH, FULL MÀN HÌNH (đề trên → hình dưới; khối lời giải giữa màn).

Render dọc:
  manim -pq style_shorts_tqh_geometry.py ShortsTQHGeometryDemo
"""

from manim import *

config.pixel_width = 1080
config.pixel_height = 1920

STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
}

TOP_BUFF = 0.05
BOTTOM_BUFF = 0.05
MARGIN = 0.08
FIGURE_RATIO = 0.58
MAX_LINES_PER_PAGE = 4
SAFE_W = config.frame_width - 2 * MARGIN
TEXT_W = SAFE_W


def center_block(mob):
    mob.set_x(0)
    return mob


def center_x(mob):
    mob.set_x(0)
    return mob


def vn(text, size=28, color=None, justify=False):
    kw = dict(
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )
    if justify:
        return Text(text, width=TEXT_W, justify=True, **kw)
    return Text(text, **kw)


def shorts_safe_width():
    return config.frame_width - 2 * MARGIN


def fit_figure_full_width(figure, max_height):
    """Phóng hình tối đa trong khung portrait — không để viền đen hai bên."""
    figure.scale_to_fit_width(shorts_safe_width())
    if figure.height > max_height:
        figure.scale_to_fit_height(max_height)
    return figure


def _pt(m):
    return m.get_center() if hasattr(m, "get_center") else m


def interior_angle_at(vertex, arm1, arm2, radius=0.28, color=None, **kwargs):
    """∠(arm1 — vertex — arm2) góc TRONG < 180°."""
    v, a1, a2 = _pt(vertex), _pt(arm1), _pt(arm2)
    return Angle(
        Line(v, a1, buff=0),
        Line(v, a2, buff=0),
        radius=radius,
        other_angle=False,
        color=color or STYLE_VN["highlight"],
        **kwargs,
    )


def right_angle_at(vertex, arm1, arm2, length=0.22, **kwargs):
    v, a1, a2 = _pt(vertex), _pt(arm1), _pt(arm2)
    return RightAngle(Line(v, a1, buff=0), Line(v, a2, buff=0), length=length, **kwargs)


class ShortsTQHGeometryDemo(Scene):
    """Mẫu full-frame: đề+chữ trên / hình dưới → ẩn đề → hình trên / khối lời giải giữa màn."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # --- Giai đoạn 1: ĐỀ (trên) + HÌNH (dưới đề) ---
        title = vn("Bài toán hình học", 30, STYLE_VN["highlight"])
        problem_lines = VGroup(
            vn("Cho đường tròn (O), đường kính AB.", 28),
            vn("C là điểm trên cung. Chứng minh:", 28),
            vn("góc ACB vuông.", 28, STYLE_VN["highlight"]),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        problem_block = VGroup(title, problem_lines).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        problem_block.to_edge(UP, buff=TOP_BUFF)
        center_block(problem_block)

        O = ORIGIN
        circle = Circle(radius=1.35, color=STYLE_VN["circle"], stroke_width=4)
        A = Dot(LEFT * 1.35, color=STYLE_VN["point"])
        B = Dot(RIGHT * 1.35, color=STYLE_VN["point"])
        C = Dot(UP * 1.35, color=STYLE_VN["point"])
        AC = Line(A.get_center(), C.get_center(), color=STYLE_VN["segment"], stroke_width=3)
        BC = Line(B.get_center(), C.get_center(), color=STYLE_VN["segment"], stroke_width=3)
        AB = Line(A.get_center(), B.get_center(), color=STYLE_VN["segment"], stroke_width=4)
        la = vn("A", 26).next_to(A, DL, buff=0.05)
        lb = vn("B", 26).next_to(B, DR, buff=0.05)
        lc = vn("C", 26).next_to(C, UP, buff=0.05)
        lo = vn("O", 26).next_to(O, DOWN, buff=0.05)
        figure = VGroup(circle, AB, AC, BC, A, B, C, la, lb, lc, lo)

        avail_h = config.frame_height / 2 - problem_block.height - 0.2
        fit_figure_full_width(figure, max(avail_h, 2.8))
        figure.next_to(problem_block, DOWN, buff=0.1)
        center_x(figure)

        self.play(Write(title))
        self.play(LaggedStart(*[Write(l) for l in problem_lines], lag_ratio=0.14))
        self.wait(0.4)
        self.play(Create(circle), run_time=1.0)
        self.play(
            LaggedStart(Create(AB), Create(AC), Create(BC), lag_ratio=0.1),
            run_time=0.75,
        )
        self.play(
            LaggedStart(FadeIn(A, scale=0.6), FadeIn(B, scale=0.6), FadeIn(C, scale=0.6), lag_ratio=0.1),
            run_time=0.45,
        )
        self.play(Write(la), Write(lb), Write(lc), Write(lo), run_time=0.65)
        self.wait(0.85)

        # --- Giai đoạn 2: Ẩn đề → hình phóng full phía trên ---
        self.play(FadeOut(problem_block))
        fig_h = config.frame_height * FIGURE_RATIO
        fit_figure_full_width(figure, fig_h)
        figure.to_edge(UP, buff=TOP_BUFF)
        center_x(figure)
        self.play(figure.animate)
        self.wait(0.4)

        solution_stack = VGroup()

        steps = [
            ("Ta có AB là đường kính.", None, None),
            (None, r"\Rightarrow \angle ACB = 90^\circ", "ACB"),
            ("Vậy tam giác ACB vuông tại C.", None, ("AC", "BC")),
            ("Kết luận: góc ACB vuông.", None, "ACB"),
        ]

        bottom_limit = -config.frame_height / 2 + BOTTOM_BUFF

        for text_vi, latex, indicate_targets in steps:
            new_parts = VGroup()
            if text_vi:
                new_parts.add(vn(text_vi, 28))
            if latex:
                new_parts.add(MathTex(latex))
            new_parts.arrange(DOWN, aligned_edge=LEFT, buff=0.06)

            if len(solution_stack) >= MAX_LINES_PER_PAGE or (
                solution_stack and solution_stack.get_bottom().y < bottom_limit + 0.5
            ):
                self.play(FadeOut(solution_stack))
                solution_stack = VGroup()

            if len(solution_stack) == 0:
                new_parts.next_to(figure, DOWN, buff=0.08)
            else:
                new_parts.align_to(solution_stack, LEFT).next_to(solution_stack, DOWN, buff=0.08)

            fig_anims = []
            if indicate_targets:
                if isinstance(indicate_targets, str) and indicate_targets == "ACB":
                    ang = right_angle_at(C, A, B, length=0.25, color=STYLE_VN["highlight"])
                    figure.add(ang)
                    fig_anims = [Create(ang), Indicate(ang, color=STYLE_VN["highlight"])]
                elif isinstance(indicate_targets, str) and indicate_targets == "AB":
                    fig_anims = [Indicate(AB, color=STYLE_VN["highlight"])]
                elif isinstance(indicate_targets, tuple):
                    targets = [AC if t == "AC" else BC for t in indicate_targets]
                    fig_anims = [Indicate(VGroup(*targets), color=STYLE_VN["highlight"])]

            self.play(
                AnimationGroup(Write(new_parts), *fig_anims, lag_ratio=0.0),
                run_time=max(0.65, 0.55),
            )
            solution_stack.add(new_parts)
            center_block(solution_stack)
            self.wait(0.85)

        conclusion = vn("ĐPCM.", 30, STYLE_VN["conclusion"])
        conclusion.align_to(solution_stack, LEFT).next_to(solution_stack, DOWN, buff=0.1)
        solution_stack.add(conclusion)
        center_block(solution_stack)
        box = SurroundingRectangle(conclusion, color=STYLE_VN["highlight"], buff=0.1)
        center_block(box)
        self.play(Write(conclusion), Create(box))
        self.wait(2.0)
