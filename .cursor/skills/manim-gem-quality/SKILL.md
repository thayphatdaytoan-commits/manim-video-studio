---
name: manim-gem-quality
description: Nâng chất lượng code Manim từ Gemini Gem — màu NTSM, play_sync, ví dụ thống nhất, GEM-INSTRUCTIONS.
---

# Chất lượng Gem / Manim Shorts

## Khi nào dùng

- User phàn nàn Gem sinh video xấu / lệch hiệu ứng / màu không nhất quán
- Cập nhật `GEM-INSTRUCTIONS-MANIM.txt` hoặc file mẫu `backend/examples/style_shorts_*.py`
- Tạo Gem mới trên gemini.google.com

## Nguồn chân lý (đọc theo thứ tự)

1. `docs/GEM-INSTRUCTIONS-MANIM.txt` — paste vào Gem Instructions
2. `docs/GEM-KNOWLEDGE-PACK.md` — danh sách file upload Knowledge
3. `backend/examples/style_shorts_sync_choreography.py` — **mẫu vàng** đồng bộ chữ+hình
4. `backend/manim_style.py` — `GEMINI_ANIMATION_CHOREOGRAPHY`, `STYLE_VN`, prompts

## Quy tắc chất lượng (tóm tắt)

| Khía cạnh | Chuẩn |
|-----------|--------|
| Màu | NTSM: bg `#0d1117`, segment `#1e40af`, point `#8b1a1a`, circle `#3d6b2f`, highlight `#FFD700` |
| Nét | Circle stroke 4, segment 3, Dot radius 0.08 |
| Dựng hình | tròn → cạnh → điểm → nhãn (không FadeIn cả figure một cục) |
| Lời giải | `play_sync(Write, Indicate/Create góc)` — **cùng AnimationGroup** |
| JSON beat | `"sync": true`, `"figure_anims": ["indicate:AB"]` khớp nội dung dòng |
| Góc | `interior_angle_at` / `right_angle_at` — luôn <180° |

## Kênh tham chiếu

- TQH geometry: youtube.com/@tranquanghungmath
- Tư duy beat ngắn: youtube.com/@tiemtoantuduy
- Manim patterns: github.com/iart-ai/manim-skills

## File mẫu (giữ đồng bộ khi sửa)

```
backend/examples/style_shorts_sync_choreography.py  ← mẫu vàng
backend/examples/style_shorts_tqh_geometry.py
backend/examples/style_shorts_venn_sets.py
backend/examples/shorts_animation_kit_snippet.py
```

**Không** dùng `circle.py`, `parabola.py` làm mẫu Gem (Tex, layout cũ).

## Khi sửa prompt / examples

1. Sửa `manim_style.py` nếu đổi rule backend generate
2. Sửa `GEM-INSTRUCTIONS-MANIM.txt` + `mau-prompt-buoc-*.txt`
3. Cập nhật ít nhất 1 example chạy được (`manim -pq file.py SceneName`)
4. Nhắc user upload lại Knowledge lên Gem
