"""Shorts 9:16 — Venn / tập hợp / bao hàm loại trừ — FULL MÀN HÌNH.

Mẫu cho Gemini Pro / Gem: hình Venn phóng full SAFE_W, khối chữ giữa màn (canh trái bên trong).

Render:
  manim -pq style_shorts_venn_sets.py ShortsVennSetsDemo
"""

from manim import *

config.pixel_width = 1080
config.pixel_height = 1920

STYLE_VN = {
    "bg": "#0d1117",
    "circle_t": "#1e40af",
    "circle_v": "#8b1a1a",
    "circle_a": "#3d6b2f",
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


def vn(text, size=30, color=None, justify=False):
    kw = dict(
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )
    if justify:
        return Text(text, width=TEXT_W, justify=True, **kw)
    return Text(text, **kw)


def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h:
        fig.scale_to_fit_height(max_h)
    return fig


class ShortsVennSetsDemo(Scene):
    """Venn 3 tập — đề trên, hình full width, khối lời giải giữa màn."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        # --- Đề (khối giữa màn, canh trái bên trong) ---
        title = vn("Bài toán tập hợp", 30, STYLE_VN["highlight"])
        problem_lines = VGroup(
            vn(
                "Lớp có 33 HS giỏi ít nhất 1 trong 3 môn: Toán, Văn, Anh.",
                28,
                justify=True,
            ),
            vn("Biết |T|=15, |V|=18, |A|=20 và các giao hai tập như hình.", 28),
            vn("Tính số HS giỏi ít nhất 1 môn.", 28, STYLE_VN["highlight"]),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
        problem_block = VGroup(title, problem_lines).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        problem_block.to_edge(UP, buff=TOP_BUFF)
        center_block(problem_block)

        # --- Hình Venn (3 vòng) ---
        r = 1.15
        c_t = Circle(radius=r, color=STYLE_VN["circle_t"], stroke_width=3).shift(LEFT * 0.75 + UP * 0.2)
        c_v = Circle(radius=r, color=STYLE_VN["circle_v"], stroke_width=3).shift(RIGHT * 0.75 + UP * 0.2)
        c_a = Circle(radius=r, color=STYLE_VN["circle_a"], stroke_width=3).shift(DOWN * 0.55)
        lt = vn("T (15)", 24).next_to(c_t, UP, buff=0.05)
        lv = vn("V (18)", 24).next_to(c_v, UP, buff=0.05)
        la = vn("A (20)", 24).next_to(c_a, DOWN, buff=0.05)
        figure = VGroup(c_t, c_v, c_a, lt, lv, la)

        avail_h = config.frame_height / 2 - problem_block.height - 0.2
        fit_figure_full_width(figure, max(avail_h, 2.5))
        figure.next_to(problem_block, DOWN, buff=0.1)
        center_x(figure)

        self.play(Write(title), LaggedStart(*[Write(l) for l in problem_lines], lag_ratio=0.12))
        self.wait(0.4)
        self.play(Create(c_t), Create(c_v), Create(c_a), Write(lt), Write(lv), Write(la))
        self.wait(0.8)

        # --- Ẩn đề, hình lên trên (phóng to, sát mép trên) ---
        self.play(FadeOut(problem_block))
        fit_figure_full_width(figure, config.frame_height * FIGURE_RATIO)
        figure.to_edge(UP, buff=TOP_BUFF)
        center_x(figure)
        self.wait(0.3)

        solution_stack = VGroup()

        steps = [
            vn("Gọi T, V, A là tập HS giỏi Toán, Văn, Anh.", 28),
            MathTex(r"n(T \cup V \cup A) = n(T)+n(V)+n(A)"),
            MathTex(r"- n(T \cap V)-n(T \cap A)-n(V \cap A)+n(T \cap V \cap A)"),
            MathTex(r"= 15+18+20-(6+10+7)+3 = 33"),
            vn("Vậy có 33 học sinh.", 30, STYLE_VN["conclusion"]),
        ]

        for part in steps:
            if len(solution_stack) >= MAX_LINES_PER_PAGE:
                self.play(FadeOut(solution_stack))
                solution_stack = VGroup()

            if len(solution_stack) == 0:
                part.next_to(figure, DOWN, buff=0.08)
            else:
                part.align_to(solution_stack, LEFT).next_to(solution_stack, DOWN, buff=0.08)

            self.play(Write(part))
            solution_stack.add(part)
            center_block(solution_stack)
            self.wait(0.85)

        box = SurroundingRectangle(solution_stack[-1], color=STYLE_VN["highlight"], buff=0.08)
        center_block(box)
        self.play(Create(box))
        self.wait(2.0)
