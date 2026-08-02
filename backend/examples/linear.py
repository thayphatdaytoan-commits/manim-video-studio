from manim import *

config.tex_template.add_to_preamble(r"\usepackage[utf8]{vietnam}")
config.tex_template.add_to_preamble(r"\usepackage{amsmath}")


class LinearFunction(Scene):
    def construct(self):
        title = Tex(r"Đồ thị hàm số bậc nhất $y = 2x + 1$").to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-3, 5, 1],
            x_length=7,
            y_length=5,
            axis_config={"include_numbers": True, "font_size": 24},
        ).shift(DOWN * 0.3)

        labels = axes.get_axis_labels(x_label="x", y_label="y")
        line = axes.plot(lambda x: 2 * x + 1, color=TEAL, x_range=[-2.5, 2])
        line_label = MathTex(r"y=2x+1", color=TEAL).next_to(line, UR, buff=0.15)

        p1 = Dot(axes.c2p(0, 1), color=YELLOW)
        p2 = Dot(axes.c2p(1, 3), color=YELLOW)
        t1 = MathTex("(0,1)").scale(0.7).next_to(p1, LEFT)
        t2 = MathTex("(1,3)").scale(0.7).next_to(p2, RIGHT)

        self.play(Create(axes), Write(labels))
        self.play(Create(line), Write(line_label))
        self.play(FadeIn(p1), FadeIn(p2), Write(t1), Write(t2))
        self.wait(1.5)
