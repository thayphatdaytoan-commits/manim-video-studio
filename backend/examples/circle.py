from manim import *

config.tex_template.add_to_preamble(r"\usepackage[utf8]{vietnam}")
config.tex_template.add_to_preamble(r"\usepackage{amsmath}")


class CircleArea(Scene):
    def construct(self):
        title = Tex(r"Diện tích hình tròn $S = \pi r^{2}$").to_edge(UP)
        self.play(Write(title))

        circle = Circle(radius=2, color=BLUE).shift(LEFT * 2.2 + DOWN * 0.2)
        radius = Line(circle.get_center(), circle.get_right(), color=YELLOW)
        r_label = MathTex("r").next_to(radius, DOWN, buff=0.15)

        formula = MathTex(r"S = \pi r^{2}").scale(1.4).shift(RIGHT * 2.5)
        note = Tex(r"với $r$ là bán kính").scale(0.8).next_to(formula, DOWN)

        self.play(Create(circle))
        self.play(Create(radius), Write(r_label))
        self.play(Write(formula), FadeIn(note))
        self.play(Indicate(circle, color=TEAL))
        self.wait(1.5)
