# Manim Community Edition — cheat sheet (Render Free + Local)

> Hướng dẫn đầy đủ: [`docs/HUONG-DAN-GEMINI-PRO-MANIM.md`](docs/HUONG-DAN-GEMINI-PRO-MANIM.md)  
> Tạo Gem chat: [`docs/TAO-GEM-GEMINI-PRO.md`](docs/TAO-GEM-GEMINI-PRO.md) + [`docs/GEM-INSTRUCTIONS-MANIM.txt`](docs/GEM-INSTRUCTIONS-MANIM.txt)

## Phiên bản
- ManimCE (ManimCommunity/manim), không phải ManimGL (3b1b/manim).
- Lệnh: `manim -ql scene.py TenScene` → 854x480 @ 15fps.

## Text tiếng Việt (Pango) — KHÔNG LaTeX
- Dùng: Text, MarkupText, Paragraph
- Nên: Text("...", disable_ligatures=True)
- MarkupText: escape &lt; &gt; &amp;
- CẤM: Tex, MathTex, SingleStringMathTex, tex_template, Typst/MathTypst (nếu môi trường chưa cài)

## Bẫy MathTex ẩn
- Label("A") → mặc định MathTex → dùng Text("A") hoặc Label(Text("A"))
- LabeledLine với chuỗi trần → MathTex
- DecimalNumber / Integer / NumberLine nhãn mặc định → MathTex
- Brace.get_tex() → LaTeX

## Scene an toàn
- CHỈ: class Foo(Scene)
- CẤM: MovingCameraScene, ThreeDScene, ZoomedScene, OpenGL*

## Hình học
- Dot, Line, DashedLine, Circle, Arc, Polygon, Triangle, Square, Rectangle
- Angle, RightAngle, VGroup, ImageMobject
- SurroundingRectangle, BackgroundRectangle
- Create, Write, FadeIn, FadeOut, Indicate, ReplacementTransform
- **Shorts 9:16 full-frame (mặc định):** đề chữ trên/hình dưới → ẩn đề → hình trên/chữ dưới **canh giữa** (`center_x`); `TOP_BUFF=0.05`; `FIGURE_RATIO=0.58`; font≥28
- Landscape: figure LEFT, text RIGHT; scale_to_fit_height(4.0)

## Đồng bộ bài giảng
- Mỗi bước lời giải = 1 khối animation + self.wait()
- Comment tiếng Việt trước mỗi bước
- Không placeholder TODO / ...

## Output
- Chỉ trả 1 file Python hoàn chỉnh trong ```python
- scene_name khớp class
