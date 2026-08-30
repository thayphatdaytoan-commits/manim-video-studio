# manim-voiceover — giọng khớp từng câu / từng animation

Plugin chính thức của cộng đồng Manim: [voiceover.manim.community](https://voiceover.manim.community)

**Khác với lồng tiếng Studio (cột 4):** plugin gắn audio **ngay trong lúc render**, mỗi `with self.voiceover(...)` = một câu đọc + animation trong block đó **cùng thời lượng**.

---

## 1. Cài trên máy Windows (một lần)

### Lỗi thường gặp

Bạn đang ở `C:\WINDOWS\System32` → lệnh `cd manim-video-studio` **không tìm thấy** folder.

Phải `cd` tới **đúng chỗ đã clone repo**, ví dụ:

`C:\Users\ADMIN\manim-video-studio`

### Bước 1 — Mở đúng thư mục

```powershell
cd C:\Users\ADMIN\manim-video-studio
```

Nếu báo *Cannot find path*: tìm folder trên máy:

```powershell
Get-ChildItem -Path C:\Users\ADMIN -Filter manim-video-studio -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 3 FullName
```

Hoặc mở File Explorer → tìm `manim-video-studio` → trong thanh địa chỉ gõ `powershell` + Enter.

### Bước 2 — Kích hoạt môi trường Python (`.venv`)

```powershell
cd C:\Users\ADMIN\manim-video-studio
.\.venv\Scripts\Activate.ps1
```

Nếu báo *ExecutionPolicy*:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Nếu **chưa có** `.venv` (lần đầu cài Studio):

```powershell
cd C:\Users\ADMIN\manim-video-studio
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

(`requirements.txt` đã gồm `manim-voiceover` — bước 3 có thể bỏ qua sau `pip install -r`.)

### Bước 3 — Cài manim-voiceover (nếu chưa có trong requirements)

```powershell
pip install "manim-voiceover[gtts]"
```

Phải thấy `(.venv)` ở đầu dòng PowerShell trước khi chạy `pip`.

### Bước 4 — Cập nhật code + mở Studio

```powershell
cd C:\Users\ADMIN\manim-video-studio
git pull
.\Mo-Manim-Studio.bat
```

| Gói cài thêm | Dùng cho |
|--------------|----------|
| `[gtts]` | Giọng AI tiếng Việt qua Google (miễn phí, cần mạng) |
| `[recorder]` | Bạn tự đọc vào micro khi render (khớp nhất) |
| `[azure]` | Giọng Azure rất tự nhiên (cần tài khoản Azure) |
| `[openai]` | OpenAI TTS (trả phí) |

**Edge TTS (Hoài My / Nam Minh)** hiện **chưa có sẵn** trong plugin bản chính thức — Studio vẫn dùng Edge TTS qua bước lồng tiếng sau render.

---

## 2. Ý tưởng cốt lõi

```python
from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.gtts import GTTSService

class BaiGiangScene(VoiceoverScene):   # kế thừa VoiceoverScene, KHÔNG Scene
    def construct(self):
        self.set_speech_service(GTTSService(lang="vi", tld="com.vn"))

        dong_chu = vn("Ta có AB là đường kính.", 28)

        # Câu 1: audio + animation KHỚP nhau
        with self.voiceover(text="Ta có A B là đường kính.") as tracker:
            self.play(Write(dong_chu), run_time=tracker.duration)
            # tracker.duration = độ dài file audio vừa tạo

        # Câu 2: chỉ bắt đầu SAU khi câu 1 đọc xong
        with self.voiceover(text="Suy ra góc A C B vuông.") as tracker:
            self.play(Write(dong_chu_2), run_time=tracker.duration)
```

| Thành phần | Vai trò |
|------------|---------|
| `VoiceoverScene` | Class scene có sẵn mixer audio + video |
| `set_speech_service(...)` | Chọn engine TTS (gTTS, Recorder, Azure…) |
| `with self.voiceover(text="...") as tracker` | Tạo audio cho câu đó |
| `tracker.duration` | Đặt `run_time=` animation = đúng thời gian đọc |

**Quy tắc vàng:** mỗi dòng chữ trên màn hình nên nằm trong **một** block `voiceover` riêng, với `run_time=tracker.duration`.

---

## 3. File mẫu trong repo

```
backend/examples/style_shorts_voiceover_demo.py
```

Chạy thử:

```powershell
cd manim-video-studio
manim -pq backend/examples/style_shorts_voiceover_demo.py ShortsVoiceoverTQHDemo
```

Video xuất ra **đã có tiếng** — không cần bấm "Lồng tiếng" trên Studio.

---

## 4. Chọn giọng đọc

### A. GTTSService — nhanh, miễn phí (mẫu trong repo)

```python
self.set_speech_service(GTTSService(lang="vi", tld="com.vn"))
```

- Ưu: không API key, tiếng Việt
- Nhược: chất lượng trung bình, cần internet

### B. RecorderService — giọng thầy cô (khuyên dùng nếu cần hay)

```python
from manim_voiceover.services.recorder import RecorderService
self.set_speech_service(RecorderService())
```

Render:

```powershell
pip install "manim-voiceover[recorder]"
manim -pq file.py TenScene
```

Plugin hiện lời từng câu → bạn đọc vào micro → animation chờ đúng thời gian bạn nói.

### C. Azure / OpenAI — giọng AI đẹp (trả phí / đăng ký)

Xem [Speech Services](https://voiceover.manim.community/en/stable/services.html).

---

## 5. Khớp chữ Shorts TQH + voiceover

Áp dụng layout Shorts như file mẫu thường (`center_x`, `FIGURE_RATIO`…), nhưng **mỗi bước lời giải** bọc voiceover:

```python
# Bước lời giải thứ N
line = vn("Nội dung dòng chữ", 28)
with self.voiceover(text="Nội dung đọc thành tiếng, không LaTeX") as tracker:
    line.next_to(figure, DOWN, buff=0.08)
    center_x(line)
    self.play(Write(line), run_time=tracker.duration)
solution_stack.add(line)
```

**Lời đọc (`text=`)** viết dạng nói được: "góc A C B", "a bình phương" — không dùng `\\angle`, `^2`.

---

## 6. So sánh 2 cách lồng tiếng

| | Studio cột 4 (Edge TTS) | manim-voiceover trong code |
|--|-------------------------|----------------------------|
| Khớp từng câu | Khó (chỉ chỉnh tốc độ cả video) | **Tốt** (từng block) |
| Giọng VN | Hoài My, Nam Minh | gTTS (`lang="vi"`) |
| Cần sửa code | Không | Có (`VoiceoverScene`) |
| Render | Studio web (sau render) | **Studio Validate + Biên dịch** |
| Micro | Không cần | Cấm `RecorderService` trên web |

---

## 7. Dùng trên Manim Video Studio (web)

1. Chọn mẫu **Shorts 9:16 — Voiceover** (hoặc dán code có `VoiceoverScene`)
2. **Validate** — phải có `GTTSService(lang="vi")`, không dùng `RecorderService`
3. **Biên dịch** — video xuất ra **đã có tiếng** (lần đầu chậm hơn, cần internet)
4. Không cần bấm “Lồng tiếng” cột 4 (trừ khi muốn giọng Edge Hoài My / Nam Minh)

Cài backend (máy local / Docker):

```powershell
pip install "manim-voiceover[gtts]"
```

---

## 8. Dùng với Gemini / Gem

Thêm vào prompt Bước 2 (code):

```
- Kế thừa VoiceoverScene (from manim_voiceover import VoiceoverScene)
- set_speech_service(GTTSService(lang="vi", tld="com.vn"))
- Mỗi bước lời giải: with self.voiceover(text="...") as tracker: self.play(Write(...), run_time=tracker.duration)
- text voiceover viết dạng đọc được, không LaTeX
```

Hoặc copy file mẫu `style_shorts_voiceover_demo.py` làm khung.

---

## 9. Hạn chế hiện tại

1. **RecorderService** (tự đọc micro) không chạy trên Studio web — chỉ `GTTSService`
2. Plugin **chưa có Edge TTS** chính thức (Hoài My / Nam Minh) — gTTS chất lượng trung bình
3. Lần render đầu **chậm** vì tạo audio từng câu (cache lại lần sau nhanh hơn)

---

## 10. Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| `No module named manim_voiceover` | `pip install "manim-voiceover[gtts]"` |
| gTTS lỗi mạng | Kiểm tra internet; hoặc dùng `RecorderService` |
| Animation quá nhanh/chậm so với giọng | Luôn `run_time=tracker.duration` |
| Video im lặng | Quên `set_speech_service(...)` trước các block voiceover |
