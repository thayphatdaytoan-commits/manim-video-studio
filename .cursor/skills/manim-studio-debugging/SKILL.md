---
name: manim-studio-debugging
description: Gỡ lỗi Manim Video Studio — triệu chứng → file đúng → GitNexus trace nếu có MCP.
---

# Debug Manim Video Studio

## Bước 0 — Chỉ mục triệu chứng (đọc PROJECT-GRAPH §8)

| Triệu chứng | File / API |
|-------------|------------|
| Video im lặng sau Compile | `voiceover.py`, `beat_voiceover.py`; kiểm tra `VoiceoverScene` trong code |
| Nút beat TTS không thấy | `git pull origin main`, restart `Mo-Manim-Studio.bat`, Ctrl+F5 |
| Lỗi validate Manim | `validate_manim.py`, `POST /api/validate-manim` |
| Compile timeout / lỗi LaTeX | `main.py` `run_manim()`, cài `latex` local |
| JSON kịch bản lỗi | `generate.py` `_balance_json_brackets`, `storyboardTimeline.js` |
| Hình lệch / chữ không canh | `manim_style.py`, `shorts_layout.py` |
| GeoGebra không khớp code | `figureReference.js`, `generate.py` `export_figure_reference` |

## Bước 1 — Thu thập

- Thông báo lỗi đầy đủ (UI, terminal backend, log compile job).
- Bước giáo viên đang làm (cột 1/2/3).
- Có `jobId` không → `GET /api/jobs/{id}`.

## Bước 2 — GitNexus (nếu có MCP)

```
query({ search_query: "<đoạn lỗi hoặc tên hàm>", repo: "manim-video-studio" })
context({ name: "<hàm nghi ngờ>", repo: "manim-video-studio" })
trace({ from: "<caller>", to: "<callee>", repo: "manim-video-studio" })
```

Ví dụ compile lỗi: `context({ name: "compile_video" })` → xem `run_manim`, validate, subprocess.

## Bước 3 — Xác nhận bằng source

Đọc đúng đoạn code (không đoán). Báo cáo kèm: repo, index GitNexus fresh/stale (nếu dùng).

## Lưu ý Windows

- Chạy lệnh trong `C:\Users\ADMIN\manim-video-studio`, không phải `System32`.
- Sau `git pull`: đóng Studio, mở lại `Mo-Manim-Studio.bat`.
