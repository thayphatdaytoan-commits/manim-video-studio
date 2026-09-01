# Gem Knowledge Pack — upload vào Gemini Pro Gem

> Dùng khi tạo Gem tại [gemini.google.com](https://gemini.google.com). Copy **Instructions** từ `GEM-INSTRUCTIONS-MANIM.txt`, upload **Knowledge** các file bên dưới.

## 1. Instructions (dán vào ô Instructions)

File: **`docs/GEM-INSTRUCTIONS-MANIM.txt`** (~120 dòng)

Chứa: quy trình 3 bước, bảng màu NTSM, đồng bộ hiệu ứng `play_sync`, thứ tự dựng hình, JSON `figure_anims`.

## 2. Knowledge — upload theo thứ tự ưu tiên

| # | File | Vai trò |
|---|------|---------|
| 1 | `backend/examples/style_shorts_sync_choreography.py` | **Mẫu vàng** — chữ + cạnh + góc cùng lúc |
| 2 | `backend/examples/style_shorts_tqh_geometry.py` | Đường tròn, đường kính, góc vuông |
| 3 | `backend/examples/style_shorts_venn_sets.py` | Venn 3 tập, màu NTSM |
| 4 | `backend/examples/shorts_animation_kit_snippet.py` | Hằng số màu, RUN_*, play_sync |
| 5 | `docs/mau-prompt-buoc-1-kich-ban.txt` | Prompt Bước 1 JSON |
| 6 | `docs/mau-prompt-buoc-2-code.txt` | Prompt Bước 2 code |
| 7 | `docs/mau-prompt-buoc-3-sua.txt` | Prompt Bước 3 sửa |

**Không upload:** `circle.py`, `parabola.py`, `linear.py`, `pythagoras.py` (layout cũ, dùng Tex).

## 3. Prompt 3 bước trên Manim Video Studio

| Cột Studio | File prompt |
|------------|-------------|
| Bước 1 — Kịch bản | `mau-prompt-buoc-1-kich-ban.txt` |
| Bước 2 — Code | `mau-prompt-buoc-2-code.txt` |
| Bước 3 — Sửa | `mau-prompt-buoc-3-sua.txt` |

## 4. Kiểm tra chất lượng sau khi Gem sinh code

- [ ] Màu đúng bảng NTSM (không random hex)
- [ ] Dựng hình: tròn → cạnh → điểm → nhãn
- [ ] Mỗi beat lời giải: `AnimationGroup(Write, Indicate/Create góc)` — không lệch nhịp
- [ ] `interior_angle_at` / `right_angle_at` — không cung >180°
- [ ] `center_block` chữ, `center_x` hình
- [ ] `self.wait(0.85)` mỗi beat

## 5. Kênh tham chiếu phong cách

| Kênh | Học gì |
|------|--------|
| [@tranquanghungmath](https://youtube.com/@tranquanghungmath) | Hình Euclidean sạch, Indicate cạnh/góc đang nói |
| [@tiemtoantuduy](https://youtube.com/@tiemtoantuduy) | Beat ngắn, chữ rõ, ít hiệu ứng thừa |

## 6. Cập nhật Gem

Sau `git pull origin main`, upload lại file Knowledge nếu examples thay đổi.

Skill Cursor hỗ trợ: `.cursor/skills/manim-gem-quality/SKILL.md`
