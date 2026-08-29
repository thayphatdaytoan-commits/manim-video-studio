# Tạo Gem Gemini Pro — viết code Manim (không cần biết lập trình)

Dùng khi bạn muốn chat trực tiếp trên [gemini.google.com](https://gemini.google.com) thay vì nút AI trong Studio.

---

## Bước 1: Tạo Gem

1. Mở **Gemini** → menu **Gems** (hoặc **Quản lý Gem**) → **Tạo Gem**
2. **Tên:** `Manim Toán VN Shorts`
3. **Hướng dẫn (Instructions):** mở file trong repo và copy toàn bộ:
   - `docs/GEM-INSTRUCTIONS-MANIM.txt`
4. **Kiến thức (Knowledge)** — upload các file (tùy chọn nhưng nên có):
   - `docs/GEM-INSTRUCTIONS-MANIM.txt`
   - `docs-gem-manim-ce-cheatsheet.md`
   - `backend/examples/style_shorts_tqh_geometry.py` (hình học)
   - `backend/examples/style_shorts_venn_sets.py` (Venn / tập hợp)
5. **Lưu** Gem

---

## Bước 2: Làm 1 video (3 tin nhắn)

### Tin 1 — Kịch bản

Copy nội dung file `docs/mau-prompt-buoc-1-kich-ban.txt`, thay phần ĐỀ và LỜI GIẢI, gửi Gem.

Gem trả về **JSON** → dán vào ô **Kịch bản** trên Manim Video Studio (cột 2).

### Tin 2 — Code Manim

Copy `docs/mau-prompt-buoc-2-code.txt`, dán **JSON từ Bước 1** vào cuối prompt, gửi Gem.

Gem trả về khối `python` → copy vào editor **Manim** (cột 3) → **Validate** → **Biên dịch**.

### Tin 3 — Sửa (nếu cần)

Copy `docs/mau-prompt-buoc-3-sua.txt`, điền yêu cầu sửa + code hiện tại, gửi Gem.

---

## Hoặc: Copy từ Manim Video Studio

Trên web Studio (cột 3 → **Gemini Pro** → mở rộng):

- **Bước 1 — Kịch bản** — đã gắn sẵn đề + lời giải + hình GeoGebra
- **Bước 2 — Code** — đã gắn kịch bản JSON
- **Bước 3 — Sửa** — đã gắn code + ghi chú

Dán vào Gem/chat Pro → nhận kết quả → dán lại Studio.

---

## File mẫu trong repo

| File | Dùng cho |
|------|----------|
| `backend/examples/style_shorts_tqh_geometry.py` | Hình học Shorts 9:16 full-frame |
| `backend/examples/style_shorts_venn_sets.py` | Venn, tập hợp, bao hàm loại trừ |
| `backend/examples/style_landscape_muon_noi.py` | Video ngang 16:9 |

Chạy thử mẫu trên máy:

```powershell
cd manim-video-studio
manim -pq backend/examples/style_shorts_venn_sets.py ShortsVennSetsDemo
```

---

## Lỗi thường gặp

| Lỗi | Cách nhắc Gem (Bước 3) |
|-----|-------------------------|
| Viền đen trên/dưới, chữ lệch trái | TOP_BUFF lớn / align LEFT | "center_x() cho đề+lời giải; TOP_BUFF=0.05; FIGURE_RATIO=0.58" |
| Ô vuông thay chữ Việt | "CẤM Tex; tiếng Việt dùng vn(), công thức MathTex(r'...')" |
| Lời giải hiện một lúc | "Tách từng dòng solution_steps + self.wait(0.8)" |

Chi tiết: `docs/HUONG-DAN-GEMINI-PRO-MANIM.md`
