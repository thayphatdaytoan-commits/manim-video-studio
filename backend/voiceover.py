"""Lồng tiếng AI bằng Edge TTS (Microsoft) — miễn phí, không cần API key riêng."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from generate import _extract_json, _gemini_with_fallback

logger = logging.getLogger("manim-studio.voiceover")

# Giọng tiếng Việt phổ biến của Edge TTS
VI_VOICES: list[dict[str, str]] = [
    {
        "id": "vi-VN-HoaiMyNeural",
        "label": "Hoài My (nữ) — mặc định",
        "locale": "vi-VN",
        "gender": "female",
    },
    {
        "id": "vi-VN-NamMinhNeural",
        "label": "Nam Minh (nam)",
        "locale": "vi-VN",
        "gender": "male",
    },
]

SCRIPT_PROMPT = """Bạn là giáo viên Toán Việt Nam. Viết LỜI THOẠI để đọc khi chiếu video bài toán.

Cấu trúc BẮT BUỘC của lời thoại (liền mạch, một đoạn đọc):
1) ĐỀ BÀI: Đọc rõ đề toán (cho biết gì, hỏi gì). Nếu đề có hình, mô tả ngắn các điểm/đoạn chính trên hình.
2) HƯỚNG DẪN GIẢI: Hướng dẫn học sinh giải từng bước, logic rõ, dễ theo dõi cùng hình động trên video.
   - Nêu ý tưởng chính trước (dùng định lý/tính chất gì).
   - Lần lượt các bước lập luận / tính toán.
   - Kết luận đáp án hoặc kết quả cần chứng minh.

Yêu cầu trình bày:
- Tiếng Việt tự nhiên, rõ ràng, phù hợp text-to-speech (Edge TTS).
- Độ dài khoảng 60–150 giây khi đọc (khoảng 150–350 từ); bài khó có thể dài hơn một chút nhưng không lang mang.
- Câu ngắn; đọc được thành tiếng: viết "góc A", "đoạn AB", "tam giác ABC"; KHÔNG dùng LaTeX thô (\\angle, ^2, \\frac...).
- Số và công thức viết dạng nói được: ví dụ "a bình phương cộng b bình phương bằng c bình phương", "tỉ số một phần hai".
- Không markdown, không gạch đầu dòng ký tự đặc biệt; dùng "Thứ nhất,", "Tiếp theo,", "Cuối cùng,".
- Không chào hỏi dài, không kết thúc bằng "cảm ơn các em đã theo dõi".
- Bám sát đề bài và mã Manim/hình minh họa được cung cấp; không bịa dữ kiện không có trong đề.

Trả về ĐÚNG JSON:
{{
  "script": "toàn bộ lời thoại: đề bài rồi hướng dẫn giải, liền mạch",
  "title": "tiêu đề ngắn của bài"
}}

Ngữ cảnh đề bài (ưu tiên dùng đúng nội dung này):
{problem}

Tên scene Manim: {scene}

Mã Manim (tham khảo hình / animation để khớp lời giải):
```python
{code}
```
"""

def list_voices() -> list[dict[str, str]]:
    return list(VI_VOICES)


def generate_script(
    *,
    api_key: str | list[str],
    problem_text: str = "",
    manim_code: str = "",
    scene_name: str = "",
) -> dict[str, Any]:
    prompt = SCRIPT_PROMPT.format(
        problem=problem_text.strip() or "(không có mô tả đề)",
        scene=scene_name.strip() or "(không rõ)",
        code=(manim_code or "")[:8000],
    )
    raw = _gemini_with_fallback(api_key=api_key, prompt=prompt)
    data = _extract_json(raw)
    script = str(data.get("script") or "").strip()
    if not script:
        raise ValueError("Gemini không trả lời thoại")
    # Làm sạch nhẹ cho TTS
    script = re.sub(r"[`*_#]+", "", script)
    script = re.sub(r"\s+\n", "\n", script).strip()
    return {
        "script": script,
        "title": str(data.get("title") or "Lời thoại").strip(),
    }


async def _edge_tts_save(text: str, voice: str, out_path: Path, rate: str = "+0%") -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
    await communicate.save(str(out_path))


def synthesize_speech(
    text: str,
    out_path: Path,
    voice: str = "vi-VN-HoaiMyNeural",
    rate: str = "+0%",
) -> Path:
    text = (text or "").strip()
    if not text:
        raise ValueError("Lời thoại trống")
    if voice not in {v["id"] for v in VI_VOICES}:
        voice = "vi-VN-HoaiMyNeural"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        asyncio.run(_edge_tts_save(text, voice, out_path, rate=rate))
    except RuntimeError:
        # Đang trong event loop sẵn (uvicorn) — chạy vòng lặp riêng
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_edge_tts_save(text, voice, out_path, rate=rate))
        finally:
            loop.close()

    if not out_path.exists() or out_path.stat().st_size < 64:
        raise RuntimeError("Edge TTS không tạo được file âm thanh")
    return out_path


def probe_has_audio_stream(path: Path) -> bool:
    """True nếu file media có ít nhất một stream audio."""
    if not path.exists() or not shutil.which("ffprobe"):
        return False
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        str(path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return bool((result.stdout or "").strip())
    except (subprocess.TimeoutExpired, OSError):
        return False


def probe_duration_seconds(path: Path) -> float:
    """Đọc độ dài media bằng ffprobe; lỗi thì trả 0."""
    if not shutil.which("ffprobe"):
        return 0.0
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return float((result.stdout or "").strip() or 0)
    except (ValueError, subprocess.TimeoutExpired, OSError):
        return 0.0


def merge_audio_video(
    video_path: Path,
    audio_path: Path,
    out_path: Path,
    *,
    sync_to_narration: bool = True,
) -> dict[str, Any]:
    """Ghép audio vào video.

    Nếu sync_to_narration=True: kéo giãn/nén nhịp hình (setpts) để độ dài
    video khớp tương đối với lời đọc (giới hạn 0.55×–2.4× để không quá nhanh/chậm).
    """
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Thiếu ffmpeg trên máy chủ")
    if not video_path.exists():
        raise FileNotFoundError(f"Không thấy video: {video_path}")
    if not audio_path.exists():
        raise FileNotFoundError(f"Không thấy audio: {audio_path}")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    video_dur = probe_duration_seconds(video_path)
    audio_dur = probe_duration_seconds(audio_path)
    speed_ratio = 1.0
    sync_note = "giữ nguyên tốc độ hình"

    if sync_to_narration and video_dur > 0.25 and audio_dur > 0.25:
        raw_ratio = audio_dur / video_dur
        # Khớp tương đối: không slow hơn 2.4×, không nhanh hơn ~1/0.55
        speed_ratio = max(0.55, min(raw_ratio, 2.4))
        if abs(speed_ratio - 1.0) < 0.08:
            speed_ratio = 1.0
            sync_note = "độ dài gần khớp — giữ nguyên tốc độ"
        elif speed_ratio > 1.0:
            sync_note = f"làm chậm hiệu ứng ×{speed_ratio:.2f} cho khớp lời đọc"
        else:
            sync_note = f"làm nhanh hiệu ứng ×{speed_ratio:.2f} cho khớp lời đọc"

        # setpts>1 = chậm hơn; nếu vẫn ngắn hơn audio sau clamp → pad khung cuối
        need_pad = raw_ratio > speed_ratio + 0.05
        if speed_ratio == 1.0 and not need_pad:
            vf = "[0:v]null[v]"
        elif need_pad:
            vf = (
                f"[0:v]setpts={speed_ratio:.6f}*PTS,"
                f"tpad=stop_mode=clone:stop_duration=600[v]"
            )
        else:
            vf = f"[0:v]setpts={speed_ratio:.6f}*PTS[v]"
    else:
        # Không sync: pad nếu lời dài hơn (cách cũ)
        vf = "[0:v]tpad=stop_mode=clone:stop_duration=600[v]"
        sync_note = "không chỉnh nhịp — chỉ ghép tiếng"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(audio_path),
        "-filter_complex",
        vf,
        "-map",
        "[v]",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(out_path),
    ]
    logger.info("FFmpeg merge: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0 or not out_path.exists():
        err = (result.stderr or result.stdout or "")[-800:]
        raise RuntimeError(f"Ghép audio thất bại: {err}")

    return {
        "path": out_path,
        "video_duration": video_dur,
        "audio_duration": audio_dur,
        "speed_ratio": speed_ratio,
        "sync_note": sync_note,
    }
