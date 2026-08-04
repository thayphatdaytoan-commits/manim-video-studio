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

## Đưa lên online (Render) — dùng được trên iPad

Repo đã có `Dockerfile` + `render.yaml`. Cách nhanh nhất:

1. Mở Safari → [render.com](https://render.com) → **Sign up / Log in** bằng GitHub
2. **New +** → **Blueprint** (hoặc **Web Service**)
3. Chọn repo `thayphatdaytoan-commits/manim-video-studio`
4. Render đọc `Dockerfile` / `render.yaml` → **Create**
5. Đợi build xong (lần đầu có thể **10–20 phút** vì cài LaTeX + Manim)
6. Mở URL dạng: `https://manim-video-studio.onrender.com`

**Lưu ý quan trọng**
- Gói **Free** sẽ ngủ sau ~15 phút không dùng; lần mở lại chờ 30–60 giây
- Manim cần RAM khá nhiều: nếu build/render lỗi (OOM), nâng lên gói **Starter** (~$7/tháng)
- Trên host nên chọn chất lượng **480p - 15 FPS** (nhanh nhất)

### Tính năng AI (GeoGebra + Manim)

Luồng tách bước (sư phạm):

1. **API KEY** → Gemini key từ [Google AI Studio](https://aistudio.google.com/apikey)
2. Tải ảnh đề / gợi ý → **AI tạo đề bài và lời giải**
3. **AI tạo code GeoGebra** (dựa đề + lời giải) → chỉnh/kéo thả → **Lưu hình**
4. (Tuỳ chọn) Prompt hướng dẫn Manim → **Tạo code Manim bằng AI**
   - Video có đề + lời giải từng bước
   - Mỗi bước giải kèm hiệu ứng hình tương ứng
   - Comment tiếng Việt trong code
5. Biên dịch video + lồng tiếng Edge TTS (tuỳ chọn)

API:
- `POST /api/generate-problem-solution`
- `POST /api/generate-geogebra`
- `POST /api/generate-manim`
- `POST /api/generate-script` — Gemini viết lời thoại
- `GET /api/tts-voices` — danh sách giọng Edge TTS
- `POST /api/voiceover` — TTS + ghép audio vào video

Tuỳ chọn: đặt `GEMINI_API_KEY` trên Render.

### Docker local (nếu có máy tính)

```bash
docker build -t manim-video-studio .
docker run --rm -p 8000:8000 manim-video-studio
```

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
