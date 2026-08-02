# Manim Video Studio

Ứng dụng web biên dịch mã **Manim** thành video Toán học (giao diện tiếng Việt).

## Tính năng

- Chọn mẫu minh họa (Parabol, hàm bậc nhất, hình tròn, Pythagore)
- Chọn Scene cần chạy
- Soạn / chỉnh sửa mã Python Manim (Monaco Editor)
- Chọn chất lượng: 480p15 / 720p30 / 1080p60
- Biên dịch video, xem trước, tải MP4
- Nhật ký biên dịch & trạng thái backend

## Yêu cầu hệ thống

- Python 3.10+
- Node.js 18+
- FFmpeg
- LaTeX (TeX Live) — cần cho `Tex` / `MathTex` tiếng Việt

Trên Ubuntu/Debian:

```bash
sudo apt install ffmpeg python3-venv \
  texlive-latex-base texlive-latex-recommended texlive-fonts-recommended \
  texlive-latex-extra texlive-lang-other dvisvgm cm-super \
  libcairo2-dev libpango1.0-dev pkg-config
```

## Cài đặt nhanh

```bash
cd manim-video-studio

# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

## Chạy phát triển

Terminal 1 — API:

```bash
source .venv/bin/activate
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 — UI:

```bash
cd frontend
npm run dev
```

Mở http://localhost:5173

## Chạy production (một cổng)

```bash
source .venv/bin/activate
cd frontend && npm run build && cd ..
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

Mở http://localhost:8000

## API chính

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/health` | Trạng thái backend & phụ thuộc |
| GET | `/api/templates` | Danh sách mẫu + mã nguồn |
| GET | `/api/qualities` | Preset chất lượng |
| POST | `/api/compile` | Biên dịch `{ code, scene, quality }` |
| GET | `/api/jobs/{id}` | Trạng thái / log job |
| GET | `/api/video/{id}` | Xem video |
| GET | `/api/video/{id}/download` | Tải MP4 |

## Cấu trúc

```
manim-video-studio/
├── backend/
│   ├── main.py              # FastAPI
│   ├── requirements.txt
│   └── examples/            # Mẫu Manim
├── frontend/                # React + Vite + Monaco
├── media/                   # Output render (tự tạo)
└── README.md
```

## Ghi chú Manim

- Class Scene phải kế thừa `Scene` (hoặc biến thể như `ThreeDScene`)
- Với tiếng Việt trong `Tex`, thêm:

```python
config.tex_template.add_to_preamble(r"\usepackage[utf8]{vietnam}")
```

- Render lần đầu có thể chậm vì LaTeX biên dịch công thức
