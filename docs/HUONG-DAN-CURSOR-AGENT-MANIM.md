# Hướng A — Cursor Agent viết code Manim (khuyến nghị)

Thay vì copy-paste Gemini Pro, bạn dùng **Cursor** trên Windows để Agent **viết và sửa trực tiếp** file Python. Manim Video Studio chỉ lo **GeoGebra, Validate, render video**.

---

## Chuẩn bị (một lần)

1. Cài [Cursor](https://cursor.com) trên Windows.
2. **File → Open Folder** → chọn `C:\Users\ADMIN\manim-video-studio`
3. Cài Manim Studio như README (Python venv, MiKTeX, `Mo-Manim-Studio.bat`).
4. Trong repo đã có rule `.cursor/rules/manim-video-lessons.mdc` — Agent tự bám quy tắc khi sửa `scenes/*.py`.

---

## Quy trình mỗi bài

```
┌──────────────────────────────────────────────────────────┐
│ 1. Manim Studio (trình duyệt)                            │
│    Cột 1: Đề + lời giải từng bước                        │
│    Cột 2: GeoGebra → Lưu hình                            │
│    Cột 3: Copy brief cho Cursor Agent                    │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Cursor (cửa sổ IDE)                                    │
│    Chat Agent: dán brief + (tuỳ chọn) đính kèm ảnh hình   │
│    Yêu cầu: "Viết scenes/TenBai.py"                      │
│    Lỗi? Dán log Validate/Biên dịch → "Sửa file"          │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Manim Studio lại                                       │
│    Mở scenes/TenBai.py trong Cursor → Ctrl+A, Ctrl+C     │
│    Dán vào editor cột 3 → Validate CE → Biên dịch 480p   │
└──────────────────────────────────────────────────────────┘
```

---

## Nút trên Studio

**Cột 3 → Cursor Agent (khuyến nghị) → Copy brief**

Brief gồm: đề, lời giải, hướng dẫn, kịch bản JSON (nếu có), lệnh GeoGebra, quy tắc MathTex/layout, code hiện tại (nếu đang sửa).

---

## Mẫu tin nhắn trong Cursor

**Tạo mới:**

```
Viết file scenes/BaiHinhHoc_AHCK.py — 1 class Scene.
Bám brief bên dưới. Local + LaTeX, CẤM Tex(), MathTex(r"...") cho công thức.
Tham khảo backend/examples/style_landscape_muon_noi.py

[dán brief từ Studio]
```

**Sửa sau khi Validate/biên dịch lỗi:**

```
Sửa scenes/BaiHinhHoc_AHCK.py theo lỗi sau. Giữ layout và từng bước lời giải.

LỖI VALIDATE / BIÊN DỊCH:
[dán log]

CODE HIỆN TẠI:
[dán hoặc @mention file]
```

---

## So với Gemini

| | Cursor Agent (A) | Gemini Pro |
|--|------------------|------------|
| Chất lượng code | Cao, sửa nhiều vòng | Không ổn định |
| MathTex / layout | Bám rule repo | Hay dùng Tex(), tràn khung |
| Cần API Gemini | Không | Có |
| Cần Cursor | Có (subscription) | Không |

Gemini trong Studio vẫn dùng được cho **kịch bản JSON nháp** hoặc **GeoGebra** — không khuyến nghị cho code Manim chính.

---

## Mẹo

- Mở **2 màn hình**: Studio trái, Cursor phải.
- Render thử **480p** trước; 720p khi ổn.
- Ảnh GeoGebra: trong Cursor chat bấm **@** hoặc kéo thả ảnh đã lưu từ Studio.
- File mẫu nằm trong `backend/examples/style_*.py`.

---

*Tài liệu đồng bộ với Manim Video Studio — workflow Hướng A.*
