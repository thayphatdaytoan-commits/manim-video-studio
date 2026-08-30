"""Shorts 9:16 + manim-voiceover — giọng khớp từng đoạn animation.

Cài đặt (một lần, trên máy Windows có Manim):
  pip install "manim-voiceover[gtts]"

Render (cần internet — GTTSService tiếng Việt):
  manim -pq style_shorts_voiceover_demo.py ShortsVoiceoverTQHDemo

Ghi âm giọng thật (không cần internet, chất lượng tốt nhất):
  pip install "manim-voiceover[recorder]"
  manim --write_to_movie style_shorts_voiceover_demo.py ShortsVoiceoverTQHDemo
  (plugin sẽ hỏi bạn đọc từng câu vào micro khi render)

Lưu ý: file này chạy bằng lệnh manim trực tiếp — Studio web chưa tích hợp plugin.
"""

from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.gtts import GTTSService

config.pixel_width = 1080
config.pixel_height = 1920

STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
}

TOP_BUFF = 0.05
MARGIN = 0.08
FIGURE_RATIO = 0.58
SAFE_W = config.frame_width - 2 * MARGIN


def center_x(mob):
    mob.set_x(0)
    return mob


def vn(text, size=28, color=None):
    return Text(
        text,
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )


def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h:
        fig.scale_to_fit_height(max_h)
    return fig


def right_angle_at(vertex, arm1, arm2, length=0.22, **kwargs):
    v = vertex.get_center()
    a1, a2 = arm1.get_center(), arm2.get_center()
    return RightAngle(
        Line(v, a1, buff=0),
        Line(v, a2, buff=0),
        length=length,
        color=STYLE_VN["highlight"],
        **kwargs,
    )


class ShortsVoiceoverTQHDemo(VoiceoverScene):
    """Mỗi khối with self.voiceover(...) = một câu đọc + animation cùng lúc."""

    def construct(self):
        # Giọng tiếng Việt (Google Translate TTS — miễn phí, cần mạng)
        # Đổi sang RecorderService() nếu muốn tự đọc vào micro
        self.set_speech_service(GTTSService(lang="vi", tld="com.vn"))

        self.camera.background_color = STYLE_VN["bg"]

        # --- Đề (chỉ hiện chữ, chưa lời giải) ---
        title = vn("Bài toán hình học", 30, STYLE_VN["highlight"])
        problem_lines = VGroup(
            vn("Cho đường tròn (O), đường kính AB.", 28),
            vn("C là điểm trên cung. Chứng minh góc ACB vuông.", 28),
        ).arrange(DOWN, aligned_edge=ORIGIN, buff=0.1)
        problem_block = VGroup(title, problem_lines).arrange(DOWN, aligned_edge=ORIGIN, buff=0.12)
        problem_block.to_edge(UP, buff=TOP_BUFF)
        center_x(problem_block)

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
        figure = VGroup(circle, AB, AC, BC, A, B, C, la, lb, lc)

        avail_h = config.frame_height / 2 - problem_block.height - 0.2
        fit_figure_full_width(figure, max(avail_h, 2.8))
        figure.next_to(problem_block, DOWN, buff=0.1)
        center_x(figure)

        # === VOICEOVER 1: đọc đề + vẽ hình (khớp thời lượng audio) ===
        with self.voiceover(
            text="Cho đường tròn O, đường kính A B. "
            "C là điểm trên cung. Chứng minh góc A C B vuông."
        ) as tracker:
            self.play(Write(title), run_time=tracker.duration * 0.25)
            self.play(LaggedStart(*[Write(l) for l in problem_lines], lag_ratio=0.2), run_time=tracker.duration * 0.25)
            self.play(Create(circle), FadeIn(A), FadeIn(B), FadeIn(C), run_time=tracker.duration * 0.25)
            self.play(Create(AB), Create(AC), Create(BC), Write(la), Write(lb), Write(lc), run_time=tracker.duration * 0.25)

        # --- Ẩn đề, hình lên trên ---
        self.play(FadeOut(problem_block))
        fit_figure_full_width(figure, config.frame_height * FIGURE_RATIO)
        figure.to_edge(UP, buff=TOP_BUFF)
        center_x(figure)

        solution_stack = VGroup()

        # === VOICEOVER 2: bước 1 lời giải + chữ hiện cùng lúc ===
        line1 = vn("Ta có AB là đường kính.", 28)
        with self.voiceover(text="Ta có A B là đường kính.") as tracker:
            line1.next_to(figure, DOWN, buff=0.08)
            center_x(line1)
            self.play(Write(line1), Indicate(AB, color=STYLE_VN["highlight"]), run_time=tracker.duration)
        solution_stack.add(line1)

        # === VOICEOVER 3: góc vuông + công thức ===
        line2 = MathTex(r"\Rightarrow \angle ACB = 90^\circ")
        ang = right_angle_at(C, A, B, length=0.25)
        figure.add(ang)
        with self.voiceover(text="Suy ra góc A C B bằng chín mươi độ.") as tracker:
            line2.next_to(solution_stack, DOWN, buff=0.08)
            center_x(line2)
            self.play(Write(line2), Create(ang), run_time=tracker.duration)
        solution_stack.add(line2)

        # === VOICEOVER 4: kết luận ===
        line3 = vn("Vậy tam giác ACB vuông tại C. ĐPCM.", 30, STYLE_VN["highlight"])
        with self.voiceover(text="Vậy tam giác A C B vuông tại C. Điều phải chứng minh.") as tracker:
            line3.next_to(solution_stack, DOWN, buff=0.08)
            center_x(line3)
            box = SurroundingRectangle(line3, color=STYLE_VN["highlight"], buff=0.08)
            center_x(box)
            self.play(Write(line3), Create(box), run_time=tracker.duration)

        self.wait(1.0)
