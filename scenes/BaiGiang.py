from manim import *
import numpy as np

STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "aux": "#38bdf8",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
}

# Panel: font lớn rồi scale 0.38 → còn ~23 (nằm trong 22–26)
_PANEL_FS = 60
_PANEL_SCALE = 0.38


def vn(text, size=24, color=None):
    return Text(
        text,
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )


def mx(tex, color=None):
    m = MathTex(r"" + tex, font_size=_PANEL_FS)
    m.set_color(color or STYLE_VN["text"])
    return m


def vn_p(text, color=None):
    return vn(text, _PANEL_FS, color)


def mix(*parts):
    return VGroup(*parts).arrange(RIGHT, buff=0.28, aligned_edge=DOWN)


class BaiGiang(Scene):
    """Chứng minh AHCK nội tiếp và tam giác ACF cân tại A."""

    def construct(self):
        self.camera.background_color = STYLE_VN["bg"]
        self.panel = VGroup()
        self._morph_leftover = None

        # Beat tiêu đề
        title = vn("Tứ giác nội tiếp và tam giác cân", 28, STYLE_VN["highlight"])
        title.to_edge(UP, buff=0.35)
        self.play(FadeIn(title))
        self.wait(0.8)

        def place_panel(rows):
            g = VGroup(*rows).arrange(DOWN, aligned_edge=LEFT, buff=0.42)
            g.scale(_PANEL_SCALE)
            if g.width > 5.3:
                g.scale_to_fit_width(5.3)
            g.to_edge(RIGHT, buff=0.4)
            g.next_to(title, DOWN, buff=0.28, aligned_edge=RIGHT)
            g.to_edge(RIGHT, buff=0.4)
            return g

        def show_panel(*rows):
            new = place_panel(rows)
            anims = []
            if len(self.panel) > 0:
                anims.append(FadeOut(self.panel))
            leftover = self._morph_leftover
            self._morph_leftover = None
            if leftover is not None:
                anims.append(FadeOut(leftover))
            if anims:
                self.play(*anims, Write(new), run_time=1.0)
            else:
                self.play(Write(new), run_time=1.1)
            self.panel = new
            self.wait(0.8)
            return new

        def morph_eq(old_eq, new_tex, color=None):
            new_eq = mx(new_tex, color)
            new_eq.match_height(old_eq)
            new_eq.move_to(old_eq)
            self.play(TransformMatchingTex(old_eq, new_eq))
            self._morph_leftover = new_eq
            self.wait(0.8)
            return new_eq

        # Beat đề bài
        show_panel(
            mix(vn_p("Cho đường tròn"), mx(r"(O; R)")),
            mix(vn_p("đường kính"), mx(r"AB")),
        )
        show_panel(
            mix(vn_p("H nằm giữa"), mx(r"O"), vn_p("và"), mx(r"B")),
            mix(mx(r"CD \perp AB"), vn_p("tại"), mx(r"H")),
        )
        show_panel(
            mix(vn_p("E trên cung nhỏ"), mx(r"AC")),
            mix(mx(r"CK \perp AE"), vn_p("tại"), mx(r"K")),
        )
        show_panel(
            mix(mx(r"DE"), vn_p("cắt"), mx(r"CK"), vn_p("tại"), mx(r"F")),
            vn_p("Câu a, b bên dưới", STYLE_VN["highlight"]),
        )
        show_panel(
            mix(vn_p("a)"), vn_p("Tứ giác"), mx(r"AHCK"), vn_p("nội tiếp")),
            mix(vn_p("b)"), vn_p("Tam giác"), mx(r"ACF"), vn_p("cân")),
        )

        # Tọa độ hình (trước khi scale)
        R = 2.0
        O = np.array([0.0, 0.0, 0.0])
        A = np.array([-R, 0.0, 0.0])
        B = np.array([R, 0.0, 0.0])
        H = np.array([R / 2.0, 0.0, 0.0])
        hy = float(np.sqrt(R**2 - (R / 2.0) ** 2))
        C = np.array([R / 2.0, hy, 0.0])
        D = np.array([R / 2.0, -hy, 0.0])
        E = np.array(
            [R * np.cos(2 * PI / 3), R * np.sin(2 * PI / 3), 0.0]
        )
        ae_vec = E - A
        t_k = float(np.dot(C - A, ae_vec) / np.dot(ae_vec, ae_vec))
        K = A + t_k * ae_vec
        de_vec = E - D
        ck_vec = K - C
        mat = np.column_stack((de_vec[:2], -ck_vec[:2]))
        su = np.linalg.solve(mat, (C - D)[:2])
        F = D + float(su[0]) * de_vec

        circle = Circle(radius=R, color=STYLE_VN["circle"], stroke_width=4).move_to(O)
        line_ab = Line(A, B, color=STYLE_VN["segment"], stroke_width=4)
        line_cd = Line(C, D, color=STYLE_VN["segment"], stroke_width=4)

        def mk_dot(p):
            return Dot(p, color=STYLE_VN["point"], radius=0.08)

        dot_o, dot_a, dot_b = mk_dot(O), mk_dot(A), mk_dot(B)
        dot_h, dot_c, dot_d = mk_dot(H), mk_dot(C), mk_dot(D)
        dot_e, dot_k, dot_f = mk_dot(E), mk_dot(K), mk_dot(F)

        figure = VGroup(
            circle, line_ab, line_cd,
            dot_o, dot_a, dot_b, dot_h, dot_c, dot_d, dot_e, dot_k, dot_f,
        )
        figure.scale_to_fit_height(4.0).move_to(LEFT * 2.8 + DOWN * 0.35)

        def lbl(name, dot, direction):
            t = vn(name, 22)
            t.next_to(dot, direction, buff=0.08)
            return t

        lab_o = lbl("O", dot_o, DOWN)
        lab_a = lbl("A", dot_a, LEFT)
        lab_b = lbl("B", dot_b, RIGHT)
        lab_h = lbl("H", dot_h, DOWN)
        lab_c = lbl("C", dot_c, UR)
        lab_d = lbl("D", dot_d, DR)
        lab_e = lbl("E", dot_e, UL)
        lab_k = lbl("K", dot_k, UP)
        lab_f = lbl("F", dot_f, UL)

        pO, pA = dot_o.get_center(), dot_a.get_center()
        pH, pC, pD = dot_h.get_center(), dot_c.get_center(), dot_d.get_center()
        pE, pK, pF = dot_e.get_center(), dot_k.get_center(), dot_f.get_center()
        r_screen = np.linalg.norm(pA - pO)

        line_ak = Line(pA, pK, color=STYLE_VN["aux"], stroke_width=3.5)
        line_ck = Line(pC, pK, color=STYLE_VN["aux"], stroke_width=3.5)
        line_cf = Line(pC, pF, color=STYLE_VN["aux"], stroke_width=3.5)
        line_df = Line(pD, pF, color=STYLE_VN["aux"], stroke_width=3.5)
        line_kh = Line(pK, pH, color=STYLE_VN["highlight"], stroke_width=3.5)
        line_ac = Line(pA, pC, color=STYLE_VN["highlight"], stroke_width=3.5)

        ra_h = RightAngle(
            Line(pH, pA), Line(pH, pC),
            length=0.22, color=STYLE_VN["highlight"],
        )
        ra_k = RightAngle(
            Line(pK, pA), Line(pK, pC),
            length=0.22, color=STYLE_VN["highlight"],
        )

        def polar(dot):
            v = dot.get_center() - pO
            return np.arctan2(v[1], v[0])

        arc_ac = Arc(
            radius=r_screen,
            start_angle=polar(dot_a),
            angle=-2 * PI / 3,
            arc_center=pO,
            color=STYLE_VN["highlight"],
            stroke_width=7,
        )

        mid_ac = (pA + pC) / 2
        r_ac = np.linalg.norm(pA - mid_ac)
        circ_ahck = DashedVMobject(
            Circle(radius=r_ac, color=STYLE_VN["highlight"], stroke_width=3).move_to(mid_ac),
            num_dashes=28,
        )

        ang_khc = Angle(
            Line(pH, pK), Line(pH, pC),
            radius=0.32, color=STYLE_VN["highlight"],
        )
        ang_eac = Angle(
            Line(pA, pE), Line(pA, pC),
            radius=0.36, color=STYLE_VN["highlight"],
        )
        ang_edc = Angle(
            Line(pD, pE), Line(pD, pC),
            radius=0.32, color=STYLE_VN["conclusion"],
        )

        def mid_ticks(p1, p2, n=1, color=None):
            mpt = (p1 + p2) / 2.0
            d = p2 - p1
            u = d / np.linalg.norm(d)
            nv = np.array([-u[1], u[0], 0.0]) * 0.11
            g = VGroup()
            for i in range(n):
                off = u * 0.05 * (i - (n - 1) / 2.0)
                g.add(Line(
                    mpt + off - nv, mpt + off + nv,
                    color=color or STYLE_VN["highlight"], stroke_width=3.5,
                ))
            return g

        ticks_cd = VGroup(mid_ticks(pC, pH, 1), mid_ticks(pH, pD, 1))
        ticks_cf = VGroup(mid_ticks(pC, pK, 2), mid_ticks(pK, pF, 2))

        quad = Polygon(
            pA, pH, pC, pK,
            color=STYLE_VN["highlight"],
            stroke_width=4,
            fill_opacity=0.10,
        )
        tri_acf = Polygon(
            pA, pC, pF,
            color=STYLE_VN["conclusion"],
            stroke_width=4,
            fill_opacity=0.10,
        )

        # Beat dựng hình
        show_panel(
            vn_p("Dựng hình tuần tự"),
            mix(vn_p("Đường tròn"), mx(r"(O; R)")),
        )
        self.play(Create(circle), run_time=1.2)
        self.play(FadeIn(dot_o), FadeIn(lab_o))
        self.wait(0.8)

        show_panel(
            mix(vn_p("Đường kính"), mx(r"AB")),
            vn_p("H nằm giữa O và B"),
        )
        self.play(Create(line_ab), FadeIn(dot_a), FadeIn(dot_b), FadeIn(lab_a), FadeIn(lab_b))
        self.wait(0.8)
        self.play(FadeIn(dot_h), FadeIn(lab_h), Indicate(dot_h, color=STYLE_VN["highlight"]))
        self.wait(0.8)

        show_panel(
            mix(mx(r"CD \perp AB"), vn_p("tại"), mx(r"H")),
            mix(mx(r"\Rightarrow"), vn_p("dây cung"), mx(r"CD")),
        )
        self.play(Create(line_cd), FadeIn(dot_c), FadeIn(dot_d), FadeIn(lab_c), FadeIn(lab_d))
        self.play(Create(ra_h))
        self.wait(0.8)

        show_panel(
            mix(vn_p("E trên cung nhỏ"), mx(r"AC")),
            mix(vn_p("E khác"), mx(r"A, C")),
        )
        self.play(Create(arc_ac), run_time=1.0)
        self.play(FadeIn(dot_e), FadeIn(lab_e), Indicate(dot_e, color=STYLE_VN["highlight"]))
        self.play(FadeOut(arc_ac), run_time=0.5)
        self.wait(0.8)

        show_panel(
            mix(vn_p("Kẻ"), mx(r"CK \perp AE")),
            mix(vn_p("tại"), mx(r"K")),
        )
        self.play(Create(line_ak), Indicate(VGroup(dot_a, dot_e), color=STYLE_VN["aux"]))
        self.wait(0.8)
        self.play(Create(line_ck))
        self.play(FadeIn(dot_k), FadeIn(lab_k), Create(ra_k))
        self.wait(0.8)

        show_panel(
            mix(mx(r"DE"), vn_p("cắt"), mx(r"CK"), vn_p("tại"), mx(r"F")),
            vn_p("Đủ dữ kiện — bắt đầu chứng minh"),
        )
        self.play(Create(line_df))
        self.play(
            ReplacementTransform(line_ck, line_cf),
            FadeIn(dot_f),
            FadeIn(lab_f),
            Indicate(dot_f, color=STYLE_VN["conclusion"]),
        )
        self.wait(0.8)

        # pause_practice câu a
        show_panel(
            vn_p("Hãy tạm dừng video", STYLE_VN["highlight"]),
            vn_p("Tự chứng minh câu a"),
        )
        self.wait(1.2)

        # Câu a
        show_panel(
            vn_p("Câu a", STYLE_VN["highlight"]),
            mix(vn_p("Tứ giác"), mx(r"AHCK"), vn_p("nội tiếp?")),
        )
        self.play(Create(quad), run_time=0.8)
        self.wait(0.8)

        show_panel(
            mix(vn_p("Ta có"), mx(r"CK \perp AE"), vn_p("tại"), mx(r"K")),
            mix(mx(r"\Rightarrow \angle AKC = 90^\circ")),
        )
        self.play(Indicate(ra_k, color=STYLE_VN["highlight"], scale_factor=1.4))
        self.wait(0.8)

        show_panel(
            mix(vn_p("Ta có"), mx(r"CD \perp AB"), vn_p("tại"), mx(r"H")),
            mix(mx(r"\Rightarrow \angle AHC = 90^\circ")),
        )
        self.play(Indicate(ra_h, color=STYLE_VN["highlight"], scale_factor=1.4))
        self.wait(0.8)

        eq_sum = mx(r"\angle AKC + \angle AHC = 90^\circ + 90^\circ")
        show_panel(
            vn_p("Xét tứ giác AHCK:"),
            eq_sum,
        )
        morph_eq(eq_sum, r"\angle AKC + \angle AHC = 180^\circ", STYLE_VN["highlight"])
        show_panel(
            mix(mx(r"\angle AKC + \angle AHC = 180^\circ", STYLE_VN["highlight"])),
            vn_p("hai góc đối diện nhau"),
        )
        self.play(Indicate(quad, color=STYLE_VN["highlight"]))
        self.wait(0.8)

        show_panel(
            vn_p("AHCK nội tiếp", STYLE_VN["conclusion"]),
            mix(vn_p("đường tròn đường kính"), mx(r"AC")),
        )
        box_a = SurroundingRectangle(self.panel, color=STYLE_VN["highlight"], buff=0.12)
        self.play(Create(line_ac), Create(circ_ahck), Create(box_a))
        self.wait(1.0)
        self.play(FadeOut(box_a), FadeOut(quad))
        self.wait(0.8)

        # pause_practice câu b
        show_panel(
            vn_p("Hãy tạm dừng video", STYLE_VN["highlight"]),
            vn_p("Tự chứng minh câu b"),
        )
        self.wait(1.2)

        # Câu b
        show_panel(
            vn_p("Câu b", STYLE_VN["highlight"]),
            mix(vn_p("Tam giác"), mx(r"ACF"), vn_p("cân?")),
        )
        self.play(Create(tri_acf), run_time=0.8)
        self.wait(0.8)

        self.play(Create(line_kh))
        eq_b1 = mx(r"\angle KHC = \angle KAC")
        show_panel(
            vn_p("AHCK nội tiếp nên"),
            eq_b1,
        )
        self.play(Create(ang_khc), Indicate(line_kh, color=STYLE_VN["highlight"]))
        self.wait(0.8)
        morph_eq(eq_b1, r"\angle KHC = \angle EAC")
        show_panel(
            mix(mx(r"\angle KHC = \angle EAC", STYLE_VN["highlight"])),
            mix(vn_p("cùng chắn cung"), mx(r"KC")),
        )
        self.play(Create(ang_eac), Indicate(line_ac, color=STYLE_VN["highlight"]))
        self.wait(0.8)

        eq_b2 = mx(r"\angle EAC = \angle EDC")
        show_panel(
            mix(vn_p("Trong"), mx(r"(O)")),
            eq_b2,
        )
        self.play(Create(ang_edc), Indicate(circle, color=STYLE_VN["circle"]))
        self.wait(0.8)
        morph_eq(eq_b2, r"\angle EAC = \angle FDC")
        show_panel(
            mix(mx(r"\angle EAC = \angle FDC", STYLE_VN["highlight"])),
            mix(vn_p("cùng chắn cung"), mx(r"EC")),
        )
        self.wait(0.8)

        show_panel(
            mix(mx(r"\Rightarrow \angle KHC = \angle FDC")),
            vn_p("hai góc đồng vị"),
        )
        self.play(Indicate(ang_khc), Indicate(ang_edc))
        self.wait(0.8)

        show_panel(
            mix(mx(r"KH \parallel FD", STYLE_VN["highlight"])),
            mix(vn_p("hay"), mx(r"KH \parallel FE")),
        )
        self.play(Indicate(line_kh), Indicate(line_df))
        self.wait(0.8)

        show_panel(
            mix(mx(r"AB"), vn_p("đường kính"), mx(r"\perp CD")),
            mix(mx(r"\Rightarrow"), vn_p("H trung điểm"), mx(r"CD")),
        )
        self.play(FadeIn(ticks_cd), Indicate(dot_h, color=STYLE_VN["highlight"]))
        self.wait(0.8)

        show_panel(
            mix(vn_p("Tam giác"), mx(r"CDF")),
            mix(vn_p("H giữa"), mx(r"CD"), mx(r"KH \parallel DF")),
        )
        self.play(Indicate(VGroup(dot_c, dot_d, dot_f), color=STYLE_VN["conclusion"]))
        self.wait(0.8)

        show_panel(
            mix(mx(r"K"), vn_p("thuộc"), mx(r"CF")),
            mix(mx(r"\Rightarrow"), vn_p("K trung điểm"), mx(r"CF")),
        )
        self.play(FadeIn(ticks_cf), Indicate(dot_k, color=STYLE_VN["highlight"]))
        self.wait(0.8)

        show_panel(
            mix(vn_p("Tam giác"), mx(r"ACF")),
            mix(mx(r"AK \perp CF"), vn_p("tại"), mx(r"K")),
        )
        self.play(Indicate(ra_k), Indicate(line_ak), Indicate(line_cf))
        self.wait(0.8)

        show_panel(
            vn_p("AK là đường cao"),
            vn_p("AK là đường trung tuyến"),
        )
        self.play(Indicate(line_ak, color=STYLE_VN["highlight"]), Indicate(ticks_cf))
        self.wait(0.8)

        # Kết luận
        show_panel(
            vn_p("Tam giác ACF cân tại A", STYLE_VN["conclusion"]),
            mix(mx(r"AC = AF")),
        )
        box_b = SurroundingRectangle(self.panel, color=STYLE_VN["highlight"], buff=0.12)
        self.play(Create(box_b), Indicate(tri_acf, color=STYLE_VN["conclusion"]))
        self.wait(1.4)
        self.play(FadeOut(box_b))
        self.wait(0.8)

        # check_question
        show_panel(
            vn_p("Câu hỏi kiểm tra", STYLE_VN["highlight"]),
            vn_p("Đường cao trùng trung tuyến"),
        )
        self.wait(1.0)
        show_panel(
            vn_p("thì tam giác cân tại đâu?"),
            vn_p("(Hãy tạm dừng và trả lời)"),
        )
        self.wait(1.4)
        show_panel(
            vn_p("Cân tại đỉnh kẻ đường đó", STYLE_VN["conclusion"]),
            mix(vn_p("Hai tam giác vuông bằng nhau")),
        )
        box_q = SurroundingRectangle(self.panel, color=STYLE_VN["highlight"], buff=0.12)
        self.play(Create(box_q))
        self.wait(2.0)
