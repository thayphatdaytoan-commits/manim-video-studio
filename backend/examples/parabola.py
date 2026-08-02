from manim import *
import numpy as np

# Hỗ trợ tiếng Việt trong LaTeX
config.tex_template.add_to_preamble(r"\usepackage[utf8]{vietnam}")
config.tex_template.add_to_preamble(r"\usepackage{amsmath}")


class ParabolaGraphWithTikz(Scene):
    def construct(self):
        title = Tex(r"Khảo sát và vẽ đồ thị hàm số $y = x^2$").to_edge(UP)
        self.play(Write(title))

        solution_label = Tex(r"Lời giải:").next_to(title, DOWN, buff=0.5).to_edge(LEFT)
        self.play(Write(solution_label))

        domain_text = Tex(r"Tập xác định $D = \mathbb{R}$").next_to(
            solution_label, DOWN, buff=0.5
        ).to_edge(LEFT)
        self.play(Write(domain_text))

        # Bảng giá trị
        table = MathTable(
            [
                ["x", "-2", "-1", "0", "1", "2"],
                ["y", "4", "1", "0", "1", "4"],
            ],
            include_outer_lines=True,
        ).scale(0.55)
        table.next_to(domain_text, DOWN, buff=0.6).to_edge(LEFT, buff=0.8)
        self.play(Create(table))

        # Hệ trục + đồ thị parabol
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-1, 5, 1],
            x_length=4.5,
            y_length=4,
            axis_config={"include_numbers": True, "font_size": 22},
        ).to_edge(RIGHT, buff=0.6)

        labels = axes.get_axis_labels(x_label="x", y_label="y")
        graph = axes.plot(lambda x: x**2, color=BLUE, x_range=[-2.2, 2.2])
        graph_label = MathTex(r"y=x^2", color=BLUE).scale(0.8).next_to(graph, UR, buff=0.1)

        dots = VGroup(
            *[
                Dot(axes.c2p(x, x**2), color=YELLOW)
                for x in [-2, -1, 0, 1, 2]
            ]
        )

        self.play(Create(axes), Write(labels))
        self.play(Create(graph), Write(graph_label))
        self.play(LaggedStart(*[FadeIn(d, scale=0.5) for d in dots], lag_ratio=0.15))
        self.wait(1.5)
