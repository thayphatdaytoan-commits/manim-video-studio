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
=== SHORTS 9:16 — HÌNH HỌC (PHONG CÁCH TQH — MẶC ĐỊNH) ===
Render dọc: config.pixel_width=1080, pixel_height=1920 (hoặc manim -pq).

【GIAI ĐOẠN 1 — problem_and_figure: ĐỀ + HÌNH CÙNG LÚC】
- problem_block: to_edge(UP, buff=0.3), font 24–28, tối đa 3–4 dòng đề
- figure: scale_to_fit_height(3.6), move_to(DOWN * 0.8) — nằm dưới đề
- Dựng hình tuần tự (Create) trong cùng giai đoạn hoặc ngay sau khi hiện đề

【GIAI ĐOẠN 2 — transition_hide_problem: ẨN ĐỀ, ĐẨY HÌNH LÊN】
- self.play(FadeOut(problem_block))
- self.play(figure.animate.shift(UP * 2.0))   # hình cố định phía trên
- KHÔNG FadeOut hình khi sang lời giải

【GIAI ĐOẠN 3 — solution_steps: TỪNG DÒNG + HIỆU ỨNG HÌNH】
- solution_stack = VGroup(), xếp DOWN dưới figure (buff≈0.35)
- MỖI bước: Write 1 dòng (vn hoặc MathTex) + Indicate/RightAngle/Create trên hình
- 1 dòng / animation; self.wait(0.8)

【GIAI ĐOẠN 4 — page_break: HẾT KHUNG MÀN HÌNH】
- MAX_LINES_PER_PAGE = 4 (shorts 9:16)
- Khi đủ 4 dòng HOẶC stack tràn mép dưới (y < -3.5):
  FadeOut(solution_stack) → reset stack rỗng → GIỮ figure ở vị trí trên
  Tiếp tục lời giải (có thể lặp page_break nhiều lần)

【Kết luận】
- 1 dòng ngắn + SurroundingRectangle vàng

CODE KHUNG:
  problem_block.to_edge(UP)
  figure.scale_to_fit_height(3.6).move_to(DOWN*0.8)
  # sau transition: figure.shift(UP*2.0)
  # solution: next_to(figure, DOWN, buff=0.35)
"""

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
- Beat transition_hide_problem: FadeOut đề → figure.animate.shift(UP*2)
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
