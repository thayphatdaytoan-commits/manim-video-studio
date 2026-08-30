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

## Windows (máy giáo viên)

### Mở Studio nhanh

Trong **PowerShell**, bắt buộc có `.\` ở đầu:

```powershell
cd C:\Users\ADMIN\manim-video-studio
.\Mo-Manim-Studio.bat
```

(Nếu gõ `Mo-Manim-Studio.bat` không có `.\` thì PowerShell báo *not recognized*.)

### Mở thủ công (2 cửa sổ)

**Cửa sổ 1 — Backend:**
```powershell
cd C:\Users\ADMIN\manim-video-studio
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Cửa sổ 2 — Frontend:**
```powershell
cd C:\Users\ADMIN\manim-video-studio\frontend
npm run dev
```

Mở trình duyệt: http://localhost:5173

### Cập nhật code từ GitHub

```powershell
cd C:\Users\ADMIN\manim-video-studio
git pull origin main
```

Kiểm tra phiên bản: `git log -1 --oneline`  
- `bac187c` trở lên = Cursor Agent (Hướng A) + MathTex rules

### Cài manim-voiceover (giọng khớp từng câu)

**Không** chạy lệnh trong `C:\WINDOWS\System32`. Vào đúng folder repo trước:

```powershell
cd C:\Users\ADMIN\manim-video-studio
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Chi tiết / xử lý lỗi: [docs/HUONG-DAN-MANIM-VOICEOVER.md](docs/HUONG-DAN-MANIM-VOICEOVER.md)

### Luồng làm video (Hướng A — khuyến nghị)

1. **Studio** (trình duyệt): đề + lời giải, GeoGebra, **Copy brief cho Cursor** (cột 3)
2. **Cursor** (IDE): mở cùng folder → chat Agent → viết `scenes/TenBai.py`
3. **Studio**: dán code → Validate → Biên dịch video

Chi tiết: [docs/HUONG-DAN-CURSOR-AGENT-MANIM.md](docs/HUONG-DAN-CURSOR-AGENT-MANIM.md)

Gemini Pro trong app = **tùy chọn** (kịch bản nháp / khi không có Cursor).

---

## Chạy phát triển (Linux / macOS)

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

**Hướng A (khuyến nghị):** [Cursor Agent](docs/HUONG-DAN-CURSOR-AGENT-MANIM.md) viết code trong `scenes/` — Studio chỉ Validate/render.

Luồng **Math-To-Manim** với Gemini (tùy chọn trong web):

1. **API KEY** → Gemini key từ [Google AI Studio](https://aistudio.google.com/apikey) *(chỉ cần nếu dùng AI trong web)*
2. **Nhập đề + lời giải thủ công** — hoặc tải ảnh → **AI tạo đề + lời giải**
3. **AI tạo code GeoGebra** → chỉnh/kéo thả → **Lưu hình**
4. **Cursor Agent:** Copy brief → viết `scenes/*.py` → dán vào editor → **Validate CE** → biên dịch
5. (Tuỳ chọn) Gemini Pro trong web — không khuyến nghị cho code chính
6. **Lồng tiếng theo beat** (khuyến nghị): cột 2 → «Tạo lời đọc từng beat» → biên dịch video → cột 3 → «Ghép giọng theo timeline»
7. Hoặc lồng tiếng một đoạn dài (Edge TTS — tuỳ chọn)

API:
- `POST /api/generate-problem-solution`
- `POST /api/generate-geogebra`
- `POST /api/generate-storyboard`
- `POST /api/generate-manim`
- `POST /api/validate-manim`
- `POST /api/revise-manim` / `POST /api/repair-manim`
- `POST /api/generate-script` — Gemini viết lời thoại
- `GET /api/tts-voices` — danh sách giọng Edge TTS
- `POST /api/generate-beat-narrations` — TTS text từng beat (đề / câu a / câu b…) từ kịch bản JSON
- `POST /api/voiceover/beats` — Edge TTS từng beat + ghép timeline lên MP4
- `POST /api/voiceover` — TTS một đoạn dài + ghép audio vào video

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
| POST | `/api/compile` | Biên dịch `{ code, scene, quality, validate_first? }` |
| GET | `/api/jobs/{id}` | Trạng thái / log job |
| GET | `/api/video/{id}` | Xem video |
| GET | `/api/video/{id}/download` | Tải MP4 |

## Cấu trúc

```
manim-video-studio/
├── backend/
│   ├── main.py              # FastAPI
│   ├── generate.py          # Gemini prompts + storyboard / repair
│   ├── validate_manim.py    # Kiểm tra trước render
│   ├── voiceover.py         # Edge TTS
│   ├── requirements.txt
│   └── examples/            # Mẫu Manim
├── frontend/                # React + Vite + Monaco
├── media/                   # Output render (tự tạo)
└── README.md
```

## Ghi chú Manim

- Class Scene kế thừa `Scene` hoặc `VoiceoverScene` (manim-voiceover — giọng khớp từng câu)
- **Local + LaTeX:** bật chế độ trên web → cho phép `MathTex` (cần MiKTeX); tiếng Việt vẫn dùng `Text`
- **Render Free:** ưu tiên `Text` / `MarkupText` — không `Tex` / `MathTex`
- Hướng dẫn Gemini Pro / Gem: [`docs/HUONG-DAN-GEMINI-PRO-MANIM.md`](docs/HUONG-DAN-GEMINI-PRO-MANIM.md) — tạo Gem chat: [`docs/TAO-GEM-GEMINI-PRO.md`](docs/TAO-GEM-GEMINI-PRO.md)
- Giọng khớp từng câu (plugin): [`docs/HUONG-DAN-MANIM-VOICEOVER.md`](docs/HUONG-DAN-MANIM-VOICEOVER.md) — mẫu `backend/examples/style_shorts_voiceover_demo.py`
- Windows: double-click `Mo-Manim-Studio.bat` để mở backend + frontend
- Validate CE: cấm scene nặng, import lạ; chế độ local cho phép LaTeX
- Render lần đầu có thể chậm
