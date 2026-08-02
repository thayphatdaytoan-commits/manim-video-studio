from manim import *

config.tex_template.add_to_preamble(r"\usepackage[utf8]{vietnam}")
config.tex_template.add_to_preamble(r"\usepackage{amsmath}")


class PythagoreanTheorem(Scene):
    def construct(self):
        title = Tex(r"Định lý Pythagore: $a^{2} + b^{2} = c^{2}$").to_edge(UP)
        self.play(Write(title))

        A = ORIGIN + LEFT * 2.5 + DOWN * 1.5
        B = A + RIGHT * 3
        C = A + UP * 2

        triangle = Polygon(A, B, C, color=WHITE)
        right = Square(side_length=0.35, color=YELLOW).move_to(A + RIGHT * 0.175 + UP * 0.175)

        a_label = MathTex("a").next_to(Line(A, B), DOWN)
        b_label = MathTex("b").next_to(Line(A, C), LEFT)
        c_label = MathTex("c").next_to(Line(B, C), UR, buff=0.1)

        formula = MathTex(r"a^{2}+b^{2}=c^{2}").scale(1.3).to_edge(RIGHT).shift(LEFT * 0.5)

        self.play(Create(triangle), FadeIn(right))
        self.play(Write(a_label), Write(b_label), Write(c_label))
        self.play(Write(formula))
        self.wait(1.5)
