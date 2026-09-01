"""Shorts 9:16 — MẪU VÀNG: đồng bộ chữ ↔ đường ↔ góc ↔ điểm (phong cách TQH / Tiệm Toán Tư Duy).

Gem BẮT BUỘC bám file này khi sinh code — thứ tự dựng hình + play_sync mỗi beat.

Render:
  manim -pq style_shorts_sync_choreography.py ShortsSyncChoreographyDemo
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

DOT_RADIUS = 0.08
STROKE_CIRCLE = 4
STROKE_SEGMENT = 3
RUN_CREATE_MAJOR = 1.0
RUN_CREATE_LINE = 0.75
RUN_FADEIN_DOT = 0.45
RUN_WRITE = 0.65
RUN_INDICATE = 0.55
RUN_ANGLE = 0.5
LAG_TEXT = 0.14
WAIT_BEAT = 0.85


def center_block(mob):
    mob.set_x(0)
    return mob


def center_x(mob):
    mob.set_x(0)
    return mob


def vn(text, size=28, color=None, justify=False):
    kw = dict(font="Arial", font_size=size, color=color or STYLE_VN["text"], disable_ligatures=True)
    if justify:
        return Text(text, width=TEXT_W, justify=True, **kw)
    return Text(text, **kw)


def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h:
        fig.scale_to_fit_height(max_h)
    return fig


def interior_angle_at(vertex, arm1, arm2, radius=0.28, color=None, **kwargs):
    v, a1, a2 = vertex.get_center(), arm1.get_center(), arm2.get_center()
    return Angle(
        Line(v, a1, buff=0),
        Line(v, a2, buff=0),
        radius=radius,
        other_angle=False,
        color=color or STYLE_VN["highlight"],
        **kwargs,
    )


def right_angle_at(vertex, arm1, arm2, length=0.22, **kwargs):
    v, a1, a2 = vertex.get_center(), arm1.get_center(), arm2.get_center()
    return RightAngle(Line(v, a1, buff=0), Line(v, a2, buff=0), length=length, **kwargs)


def play_sync(self, text_anim, *figure_anims, run_time=None):
    anims = [text_anim, *figure_anims]
    rt = run_time or max(RUN_WRITE, RUN_INDICATE, RUN_ANGLE)
    self.play(AnimationGroup(*anims, lag_ratio=0.0), run_time=rt)
    self.wait(WAIT_BEAT)


class ShortsSyncChoreographyDemo(Scene):
    """Tam giác ABC — mỗi dòng lời giải đồng bộ Indicate/Create góc với Write chữ."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]

        title = vn("Chứng minh tam giác vuông", 30, STYLE_VN["highlight"])
        problem_lines = VGroup(
            vn("Cho tam giác ABC có AB = 3, BC = 4, AC = 5.", 28),
            vn("Chứng minh tam giác ABC vuông tại B.", 28, STYLE_VN["highlight"]),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        problem_block = VGroup(title, problem_lines).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        problem_block.to_edge(UP, buff=TOP_BUFF)
        center_block(problem_block)

        # --- Hình tam giác (tọa độ chuẩn) ---
        B = np.array([-1.2, -0.9, 0.0])
        A = np.array([-1.2, 1.0, 0.0])
        C = np.array([1.5, -0.9, 0.0])
        dA = Dot(A, color=STYLE_VN["point"], radius=DOT_RADIUS)
        dB = Dot(B, color=STYLE_VN["point"], radius=DOT_RADIUS)
        dC = Dot(C, color=STYLE_VN["point"], radius=DOT_RADIUS)
        AB = Line(A, B, color=STYLE_VN["segment"], stroke_width=STROKE_SEGMENT)
        BC = Line(B, C, color=STYLE_VN["segment"], stroke_width=STROKE_SEGMENT)
        AC = Line(A, C, color=STYLE_VN["segment"], stroke_width=STROKE_SEGMENT)
        la = vn("A", 26).next_to(dA, UP, buff=0.05)
        lb = vn("B", 26).next_to(dB, DL, buff=0.05)
        lc = vn("C", 26).next_to(dC, DR, buff=0.05)
        figure = VGroup(AB, BC, AC, dA, dB, dC, la, lb, lc)

        avail_h = config.frame_height / 2 - problem_block.height - 0.2
        fit_figure_full_width(figure, max(avail_h, 2.5))
        figure.next_to(problem_block, DOWN, buff=0.1)
        center_x(figure)

        # === Giai đoạn 1: đề + dựng hình TUẦN TỰ (cạnh → điểm → nhãn) ===
        self.play(Write(title))
        self.play(LaggedStart(*[Write(l) for l in problem_lines], lag_ratio=LAG_TEXT))
        self.wait(0.4)
        self.play(
            LaggedStart(Create(AB), Create(BC), Create(AC), lag_ratio=0.1),
            run_time=RUN_CREATE_LINE,
        )
        self.play(
            LaggedStart(FadeIn(dA, scale=0.6), FadeIn(dB, scale=0.6), FadeIn(dC, scale=0.6), lag_ratio=0.1),
            run_time=RUN_FADEIN_DOT,
        )
        self.play(Write(la), Write(lb), Write(lc), run_time=RUN_WRITE)
        self.wait(WAIT_BEAT)

        # === Giai đoạn 2: ẩn đề, hình lên trên ===
        self.play(FadeOut(problem_block))
        fit_figure_full_width(figure, config.frame_height * FIGURE_RATIO)
        figure.to_edge(UP, buff=TOP_BUFF)
        center_x(figure)
        self.play(figure.animate)
        self.wait(0.35)

        solution_stack = VGroup()
        bottom_limit = -config.frame_height / 2 + BOTTOM_BUFF

        beats = [
            ("Ta có AB = 3, BC = 4.", [Indicate(AB, color=STYLE_VN["highlight"]), Indicate(BC, color=STYLE_VN["highlight"])]),
            ("Theo định lý Pythagore:", [Indicate(AC, color=STYLE_VN["highlight"])]),
            (MathTex(r"AB^2 + BC^2 = 3^2 + 4^2 = 25"), [Indicate(VGroup(AB, BC), color=STYLE_VN["highlight"])]),
            (MathTex(r"AC^2 = 5^2 = 25"), [Indicate(AC, color=STYLE_VN["highlight"])]),
            (MathTex(r"\Rightarrow AB^2 + BC^2 = AC^2"), None),
            ("Vậy tam giác ABC vuông tại B.", None),
        ]

        right_mark = None
        for part, fig_anims in beats:
            if isinstance(part, str):
                mob = vn(part, 28)
            else:
                mob = part

            if len(solution_stack) >= MAX_LINES_PER_PAGE or (
                solution_stack and solution_stack.get_bottom().y < bottom_limit + 0.5
            ):
                self.play(FadeOut(solution_stack))
                solution_stack = VGroup()

            if len(solution_stack) == 0:
                mob.next_to(figure, DOWN, buff=0.08)
            else:
                mob.align_to(solution_stack, LEFT).next_to(solution_stack, DOWN, buff=0.08)

            extra = list(fig_anims or [])
            if part == "Vậy tam giác ABC vuông tại B.":
                right_mark = right_angle_at(dB, dA, dC, length=0.25, color=STYLE_VN["highlight"])
                figure.add(right_mark)
                extra = [Create(right_mark), Indicate(right_mark, color=STYLE_VN["highlight"])]

            play_sync(self, Write(mob), *extra)
            solution_stack.add(mob)
            center_block(solution_stack)

        conclusion = vn("ĐPCM.", 30, STYLE_VN["conclusion"])
        conclusion.align_to(solution_stack, LEFT).next_to(solution_stack, DOWN, buff=0.1)
        solution_stack.add(conclusion)
        center_block(solution_stack)
        box = SurroundingRectangle(conclusion, color=STYLE_VN["highlight"], buff=0.1)
        center_block(box)
        self.play(Write(conclusion), Create(box), run_time=RUN_WRITE)
        self.wait(2.0)
