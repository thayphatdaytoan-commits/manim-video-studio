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

VIDEO_FORMATS: dict[str, dict[str, str | int | list[str]]] = {
    "shorts": {
        "aspect": "9:16",
        "pixel_width": 1080,
        "pixel_height": 1920,
        "layout": "single_focus",
        "duration": "30-60s",
        "beats": "3-5",
        "channel_ref": "Thanh Thầy Việt — 1 khung, text tối thiểu, 1 kỹ năng",
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

STYLE_VN_PROMPT = """
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
video_format: "shorts" | "landscape"
- shorts (9:16): 1 khung tập trung giữa; 3–5 beats; text tối thiểu; config pixel 1080×1920
- landscape (16:9): figure trái + text_panel phải; 8–15 beats; subtitle nhỏ; có check_question

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
