"""Bộ nguyên tắc style video Toán VN — 4 kênh + NTSM + motion-skills."""

from __future__ import annotations

# Font có dấu tiếng Việt — bắt buộc cho Text/MarkupText (tránh ô vuông □)
VN_FONT_WINDOWS = "Arial"
VN_FONT_LINUX = "DejaVu Sans"
VN_FONT = VN_FONT_WINDOWS  # mặc định prompt; Render/Docker dùng DejaVu Sans

STYLE_VN: dict[str, str] = {
    "bg": "#0d1117",
    "bg_alt": "#0a0e1a",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
    "conclusion_alt": "#22c55e",
}

BEAT_ORDER: list[str] = [
    "title",
    "problem",
    "construction",
    "solution_steps",
    "conclusion",
    "check_question",
]

BEAT_ORDER_SHORTS_TQH_GEOMETRY: list[str] = [
    "title",
    "problem_and_figure",
    "transition_hide_problem",
    "solution_steps",
    "page_break",
    "conclusion",
]

SHORTS_TQH_LAYOUT_RULES = """
=== SHORTS 9:16 — FULL MÀN HÌNH (BẮT BUỘC — KHÔNG VIỀN ĐEN) ===
Render dọc: config.pixel_width=1080, pixel_height=1920 (hoặc manim -pq).
Khung Manim portrait: frame_width ≈ 4.5, frame_height = 8 — KHÔNG dùng tọa độ landscape 14×8.

【CẤU HÌNH & HẰNG SỐ — copy vào đầu file】
config.pixel_width = 1080
config.pixel_height = 1920
MARGIN = 0.18
SAFE_W = config.frame_width - 2*MARGIN      # ~4.1 — phóng hình/chữ gần hết chiều ngang
LEFT_EDGE = LEFT * (config.frame_width/2 - MARGIN)

def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h: fig.scale_to_fit_height(max_h)
    return fig

【FONT — đủ lớn cho điện thoại】
- Đề / lời giải: font_size 28–32 (CẤM ≤24)
- Nhãn điểm: 26–28 (CẤM 22)
- MathTex: scale 1.0 (CẤM scale 0.9 hoặc panel.scale 0.38)

【GIAI ĐOẠN 1 — problem_and_figure: CHỮ TRÊN → HÌNH DƯỚI】
- problem_block.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT)
- avail_h = config.frame_height/2 - problem_block.height - 0.35
- figure = fit_figure_full_width(figure, avail_h)
- figure.next_to(problem_block, DOWN, buff=0.2).align_to(LEFT_EDGE, LEFT)
- CẤM: move_to(DOWN*0.8), scale_to_fit_height(3.6) không kèm scale_to_fit_width(SAFE_W)
- CẤM: đặt hình giữa màn hình khi còn trống trên/dưới

【GIAI ĐOẠN 2 — transition_hide_problem: ẨN ĐỀ, HÌNH LÊN TRÊN (phóng to)】
- self.play(FadeOut(problem_block))
- fig_h = config.frame_height * 0.52   # ~55% khung cho hình
- fit_figure_full_width(figure, fig_h)
- figure.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT)
- CẤM: figure.animate.shift(UP*2) mù — không phóng to, gây viền đen

【GIAI ĐOẠN 3 — solution_steps: HÌNH TRÊN → CHỮ DƯỚI】
- Dòng đầu: new_line.next_to(figure, DOWN, buff=0.15).align_to(LEFT_EDGE, LEFT)
- Các dòng sau: next_to(solution_stack, DOWN, buff=0.12).align_to(LEFT_EDGE, LEFT)
- Mỗi bước: Write 1 dòng + Indicate/RightAngle; self.wait(0.8)

【GIAI ĐOẠN 4 — page_break】
- MAX_LINES_PER_PAGE = 4
- Khi đủ 4 dòng HOẶC stack.get_bottom().y < -config.frame_height/2 + MARGIN:
  FadeOut(solution_stack) — GIỮ figure

【Tự kiểm tra full-frame】
- Không có khoảng trống lớn trên/dưới/trái/phải
- Hình chiếm gần hết SAFE_W
- Chữ canh trái LEFT_EDGE, không thu nhỏ scale(0.38)
"""

GEMINI_ANTI_PATTERNS = """
=== LỖI GEMINI THƯỜNG GẶP — TUYỆT ĐỐI TRÁNH ===
1. Tex(...) cho công thức → CẤM; chỉ MathTex(r"...")
2. Tiếng Việt / nhãn điểm trong MathTex → ô vuông □; dùng vn() hoặc Text(font="Arial")
3. shorts mà dùng layout landscape (figure LEFT*2.8 + panel RIGHT) → SAI
4. problem_and_figure hiện lời giải → SAI (chỉ đề + dựng hình)
5. Quên FadeOut(problem_block) hoặc quên figure.animate.shift(UP*2.0)
6. Gộp 2+ dòng lời giải vào 1 beat solution_steps → SAI (1 dòng/beat)
7. page_break FadeOut cả figure → SAI (chỉ FadeOut solution_stack)
8. Không chèn page_break sau mỗi 4 dòng solution_steps
9. Label("A") → dùng vn("A", 22).next_to(dot, buff=0.06)
10. MathTex(r"$x^2$") — không bọc $ trong MathTex
11. latex_lines có tiếng Việt hoặc bọc $ trong JSON
12. Dump toàn bộ lời giải một lúc thay vì từng dòng + Indicate
13. Hình/chữ nhỏ giữa màn + viền đen dư → THIẾU scale_to_fit_width(SAFE_W) và config portrait
14. move_to(DOWN*0.8) + scale_to_fit_height(3.6) — layout cũ gây trống trên/dưới
15. shift(UP*2) không kèm phóng to hình — lời giải bị chèn giữa khoảng trống
16. panel.scale(0.38), font_size≤24, MathTex.scale(0.9) — chữ quá nhỏ trên Shorts
17. Thiếu config.pixel_width=1080, pixel_height=1920 ở đầu file
"""

GEMINI_SELF_CHECK = """
=== TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI ===
□ video_format đúng ("shorts" mặc định)?
□ shorts: có beats problem_and_figure → transition_hide_problem → solution_steps → page_break → conclusion?
□ Mỗi solution_steps = đúng 1 text_line HOẶC 1 latex_line?
□ Bước nói cạnh/góc có indicate_targets hoặc actions right_angle?
□ Code có vn(), STYLE_VN, MAX_LINES_PER_PAGE=4, self.wait(≥0.8) mỗi beat?
□ Không Tex(), Label(), MovingCameraScene, ThreeDScene?
□ Hình đã scale_to_fit_width(SAFE_W) + chữ font≥28 — không viền đen dư?
□ config.pixel_width=1080, pixel_height=1920 ở đầu file?
"""

GEMINI_ACTION_MAP = """
=== ÁNH XẠ actions JSON → CODE MANIM (shorts TQH) ===
| action JSON | Code Manim |
| write_problem | Write(problem_block) hoặc LaggedStart từng dòng đề |
| create_figure | Create(circle), FadeIn(dots), Create(segments) tuần tự |
| fade_out_problem | self.play(FadeOut(problem_block)) |
| shift_figure_up | fit_figure_full_width + figure.to_edge(UP).align_to(LEFT_EDGE, LEFT) |
| write_line | Write(new_line) — 1 dòng vn() hoặc MathTex |
| indicate:AB | Indicate(segment_AB, color=STYLE_VN["highlight"]) |
| right_angle:ACB | RightAngle(AC, BC, length=0.22, color=STYLE_VN["highlight"]) |
| fade_out_solution_stack | self.play(FadeOut(solution_stack)); solution_stack = VGroup() |
| surround_rect | SurroundingRectangle(conclusion, color=STYLE_VN["highlight"]) |
"""

GEMINI_SHORTS_TQH_PROMPT = (
    SHORTS_TQH_LAYOUT_RULES
    + GEMINI_ACTION_MAP
    + GEMINI_ANTI_PATTERNS
    + """

=== GEMINI — KỊCH BẢN JSON (video_format=shorts) ===
beats BẮT BUỘC: title → problem_and_figure → transition_hide_problem
→ solution_steps (1 dòng/beat, lặp nhiều lần)
→ page_break (sau mỗi 4 dòng solution_steps)
→ conclusion.
Mỗi solution_steps: text_lines HOẶC latex_lines (không cả hai dài) + indicate_targets.

Ví dụ beat solution_steps:
{"phase": "solution_steps", "text_lines": ["Ta có AB là đường kính."],
 "actions": ["write_line", "indicate:AB"], "indicate_targets": ["AB"]}
{"phase": "solution_steps", "latex_lines": ["\\\\Rightarrow \\\\angle ACB = 90^\\\\circ"],
 "actions": ["write_line", "right_angle:ACB"], "indicate_targets": ["ACB"]}

=== GEMINI — CODE PYTHON (video_format=shorts) ===
1. Đầu file: config 1080×1920; MARGIN; SAFE_W; LEFT_EDGE; fit_figure_full_width(); vn(size=28+)
2. Đề: problem_block.to_edge(UP).align_to(LEFT_EDGE, LEFT)
3. Hình dưới đề: fit_figure_full_width + next_to(problem_block, DOWN)
4. FadeOut đề → fit_figure_full_width(figure, frame_height*0.52) + to_edge(UP) — KHÔNG shift(UP*2)
5. Lời giải: next_to(figure, DOWN), align LEFT_EDGE; font 28–32
6. page_break khi ≥4 dòng
Mẫu: backend/examples/style_shorts_tqh_geometry.py
CẤM Tex(). CẤM landscape. CẤM hình/chữ nhỏ giữa màn hình.
"""
    + GEMINI_SELF_CHECK
)

VIDEO_FORMATS: dict[str, dict[str, str | int | list[str]]] = {
    "shorts": {
        "aspect": "9:16",
        "pixel_width": 1080,
        "pixel_height": 1920,
        "layout": "shorts_tqh_geometry",
        "duration": "45-90s",
        "beats": "5-12",
        "channel_ref": "Shorts 9:16 — hình học TQH (đề+hình → ẩn đề → lời giải từng dòng)",
    },
    "landscape": {
        "aspect": "16:9",
        "pixel_width": 1920,
        "pixel_height": 1080,
        "layout": "figure_left_text_right",
        "duration": "3-10 phút",
        "beats": "8-15",
        "channel_ref": "median / Toán Học Muôn Nơi — hình trái, lời giải phải",
    },
}

STYLE_VN_PROMPT = (
    """
=== MÀU SẮC & NỀN (NTSM + 4 kênh VN) ===
STYLE_VN = {
  "bg": "#0d1117",           # nền đen xanh (hoặc #0a0e1a)
  "circle": "#3d6b2f",       # đường tròn — xanh lá NTSM
  "segment": "#1e40af",      # cạnh/đoạn — xanh dương NTSM
  "point": "#8b1a1a",        # điểm — đỏ đậm NTSM
  "text": "#FFFFFF",
  "highlight": "#FFD700",    # nhấn mạnh — vàng
  "conclusion": "#FF8C00"    # kết luận — cam (hoặc #22c55e)
}
Trong Manim: self.camera.background_color = STYLE_VN["bg"]
Dot/Line/Circle dùng color="#hex" hoặc hằng số.

=== THỨ TỰ BEAT (BẮT BUỘC) ===
BEAT_ORDER = ["title", "problem", "construction", "solution_steps", "conclusion", "check_question"]
1. title — tiêu đề ngắn 1–2s
2. problem — đề từng dòng (không dump hết một lúc)
3. construction — dựng hình tuần tự (Create từng element)
4. solution_steps — mỗi bước: Indicate đối tượng → Write chữ; Transform khi cập nhật
5. conclusion — SurroundingRectangle + màu highlight/conclusion
6. check_question — chỉ video dài (landscape); câu hỏi trước — trả lời sau (median)

self.wait(≥0.8) sau MỖI beat. Một màn hình = một ý.

=== FORMAT VIDEO ===
video_format: "shorts" | "landscape"  — MẶC ĐỊNH: "shorts" (9:16)
- shorts (9:16): phong cách TQH hình học — đề+hình → ẩn đề → lời giải từng dòng + page_break
- landscape (16:9): figure trái + text_panel phải; 8–15 beats; có check_question
"""
    + SHORTS_TQH_LAYOUT_RULES
    + """

=== FONT TIẾNG VIỆT (BẮT BUỘC — tránh ô vuông □) ===
- Text/MarkupText: font="Arial", disable_ligatures=True (Windows local)
- Docker/Render: font="DejaVu Sans" hoặc cài Noto Sans
- CẤM nhét chữ tiếng Việt (có dấu) vào MathTex/Tex — chỉ ký hiệu toán trong MathTex
- Tách dòng: vn("Ta có CK") + MathTex(r"CK \perp AE") + vn("nên") — KHÔNG gộp chữ Việt vào MathTex

def vn(text, size=28, color=None):
    return Text(text, font_size=size, font="Arial", color=color or "#FFFFFF", disable_ligatures=True)

=== KỊCH BẢN median ===
- Câu hỏi gợi mở TRƯỚC, đáp án SAU (không vào thẳng kết quả)
- Hình minh họa dẫn trước lời giải chữ
- Transform/ReplacementTransform khi cập nhật — không FadeOut/FadeIn đột ngột cả khung
"""
)

LAYOUT_SAFE_RULES = """
=== CANH KHUNG & KHÔNG ĐÈ CHỮ (BẮT BUỘC) ===
Khung 16:9 Manim: rộng ~14, cao ~8 (từ -7 đến 7, -4 đến 4).

1) VÙNG BỐ CỤC (không chồng nhau):
   - title_block: to_edge(UP, buff=0.35) — chỉ tiêu đề ngắn, font_size ≤ 30
   - figure_zone: move_to(LEFT * 2.8), scale_to_fit_height(4.0) — KHÔNG vượt mép trái/trên
   - text_panel: to_edge(RIGHT, buff=0.4).scale(0.38) — tối đa 2 dòng / beat
   - KHÔNG đặt title + hình + text cùng tọa độ ORIGIN

2) MỖI BEAT — tránh đè chữ:
   - Trước beat mới: FadeOut(text_panel_cũ) hoặc ReplacementTransform(panel, panel_mới)
   - Hoặc dùng 1 VGroup panel cố định bên phải, chỉ đổi nội dung bên trong
   - text_lines ≤ 2 dòng; font_size lời giải 22–26

3) HÌNH KHÔNG RA NGOÀI:
   - Luôn: figure = VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
   - Nhãn điểm: font_size 22, next_to(dot, buff=0.08) — không để nhãn tràn mép
   - Sau khi code xong: tự kiểm tra mọi mobject trong [-6.5, 6.5] x [-3.5, 3.5]

4) CODE MẪU KHUNG:
   title = vn("Bài toán hình học", 28).to_edge(UP, buff=0.35)
   figure = VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
   panel = VGroup().to_edge(RIGHT, buff=0.4).align_to(title, UP)
   # mỗi bước: self.play(FadeOut(old_panel)) rồi Write(new_panel) nếu cần
"""

MATH_LATEX_RULES = """
=== CÔNG THỨC LaTeX ĐẸP (BẮT BUỘC — Local + LaTeX) ===
CẤM Tex(...) hoàn toàn. Tex render xấu, không morph công thức, dễ lỗi font.

PHÂN LOẠI BẮT BUỘC:
| Nội dung | Dùng |
| Tiếng Việt (đề, lời giải, nhãn A/B/C) | Text(font="Arial", disable_ligatures=True) hoặc vn() |
| Công thức, góc, ký hiệu ⊥, △, ∠ | MathTex(r"...") — LUÔN có chữ r trước chuỗi |

SAI → ĐÚNG (copy mẫu):
❌ Tex(r"Ta có $CK \\perp AE$")
✅ VGroup(vn("Ta có"), MathTex(r"CK \\perp AE"))

❌ Tex(r"$\\angle AKC = 90^\\circ$")
✅ MathTex(r"\\angle AKC = 90^\\circ")

❌ MathTex("x^2")                    # thiếu r
✅ MathTex(r"x^2")

❌ MathTex(r"$x^2$")                 # thừa dấu $
✅ MathTex(r"x^2")

❌ MathTex(r"Chứng minh tứ giác nội tiếp")   # tiếng Việt trong MathTex → ô vuông
✅ vn("Chứng minh tứ giác nội tiếp")

❌ Text("CK ⊥ AE")                    # ký hiệu toán trong Text → xấu
✅ MathTex(r"CK \\perp AE")

MẪU HÌNH HỌC:
  MathTex(r"\\angle ABC"), MathTex(r"CK \\perp AE"), MathTex(r"\\triangle ABC")
  MathTex(r"\\Rightarrow"), MathTex(r"\\therefore")   # mũi tên suy luận

BIẾN ĐỔI CÔNG THỨC (bắt buộc khi đổi dòng):
  eq1 = MathTex(r"AB^2 = AC^2 + BC^2")
  eq2 = MathTex(r"BC^2 = 9 + 16")
  self.play(TransformMatchingTex(eq1, eq2))
"""

CHANNEL_STYLE_PROMPT = """
=== HỌC PHONG CÁCH 2 KÊNH THAM CHIẾU ===

【Tiệm Toán Tư Duy / Trạm Dừng Toán Học — tư duy, tiểu học/THCS】
- Giọng thầy cô thân thiện; mỗi video = 1 kỹ năng / 1 dạng
- Beat "pause_practice": nhắc học sinh dừng video tự làm (text_lines: "Hãy tạm dừng và thử...")
- Lời giải chia nhỏ: đọc đề → gợi ý → làm mẫu 1 bước → kiểm tra đáp án
- Hình đơn giản, ít hiệu ứng; chữ lớn, dễ đọc; màu tươi (vàng highlight câu hỏi)
- check_question cuối video: 1 câu tương tự để luyện

【Kênh hình học Shorts 9:16 — phong cách TQH (MẶC ĐỊNH cho hình học)】
- Beat problem_and_figure: đề bài + dựng hình CÙNG LÚC (đề trên, hình dưới)
- Beat transition_hide_problem: FadeOut đề → fit_figure_full_width + to_edge(UP) — KHÔNG shift(UP*2)
- Beat solution_steps: từng dòng lời giải + Indicate/RightAngle trên hình
- Beat page_break: khi ≥4 dòng hoặc tràn mép → FadeOut chữ, GIỮ hình, tiếp tục
- Tham khảo: backend/examples/style_shorts_tqh_geometry.py

【Kênh hình học Landscape — Euclidean】
- Layout: hình trái lớn, lời giải phải ngắn (≤2 dòng/beat)
- Dựng hình theo thứ tự logic: đường tròn → đường kính → điểm trên cung → phụ
- Mỗi bước chứng minh: Indicate cạnh/góc đang nói + MathTex(r"\\angle ... = 90^\\circ")
- Góc vuông: RightAngle; góc nhọn: Angle màu vàng
- Kết luận: SurroundingRectangle vàng quanh dòng quan trọng
- Không dump cả bài chứng minh một lúc — reveal từng nhận xét

Lưu ý: Thầy Trần Quang Hùng (HSGS Hà Nội) đã cảnh báo một số kênh YouTube dùng tên ông không chính thức.
Học phong cách trình bày hình học, không sao chép watermark/tên người khác.
"""

MANIM_STYLE_CODE_SNIPPET = '''
# --- Style VN (copy vào đầu construct hoặc module) ---
STYLE_VN = {
    "bg": "#0d1117",
    "circle": "#3d6b2f",
    "segment": "#1e40af",
    "point": "#8b1a1a",
    "text": "#FFFFFF",
    "highlight": "#FFD700",
    "conclusion": "#FF8C00",
}

def vn(text, size=28, color=None):
    return Text(
        text,
        font="Arial",
        font_size=size,
        color=color or STYLE_VN["text"],
        disable_ligatures=True,
    )
'''
