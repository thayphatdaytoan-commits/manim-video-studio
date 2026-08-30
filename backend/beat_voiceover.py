"""TTS từng beat kịch bản + ghép timeline âm thanh lên video."""

from __future__ import annotations

import logging
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from voiceover import probe_duration_seconds, synthesize_speech

logger = logging.getLogger("manim-studio.beat-voiceover")

PHASE_LABELS: dict[str, str] = {
    "title": "Tiêu đề",
    "problem": "Đề bài",
    "problem_and_figure": "Đề bài",
    "construction": "Dựng hình",
    "solution_steps": "Lời giải",
    "conclusion": "Kết luận",
    "check_question": "Câu hỏi",
}

PHASE_SKIP_NARRATION = frozenset({"transition_hide_problem", "page_break"})

PHASE_BASE_WEIGHT: dict[str, float] = {
    "title": 1.8,
    "problem": 5.0,
    "problem_and_figure": 6.0,
    "transition_hide_problem": 0.6,
    "construction": 4.0,
    "solution_steps": 3.2,
    "page_break": 0.4,
    "conclusion": 2.5,
    "check_question": 3.0,
}

BEAT_PAUSE_S = 0.25


def _strip_latex_for_speech(text: str) -> str:
    s = text or ""
    s = re.sub(r"\\Rightarrow", " suy ra ", s)
    s = re.sub(r"\\therefore", " do đó ", s)
    s = re.sub(r"\\angle\s*([A-Za-z]+)", r"góc \1", s)
    s = re.sub(r"\\triangle\s*([A-Za-z]+)", r"tam giác \1", s)
    s = re.sub(r"\\perp", " vuông góc ", s)
    s = re.sub(r"\\cap", " giao ", s)
    s = re.sub(r"\\cup", " hợp ", s)
    s = re.sub(r"\\frac\{([^}]+)\}\{([^}]+)\}", r"\1 phần \2", s)
    s = re.sub(r"\^\{\\circ\}|°", " độ", s)
    s = re.sub(r"\^2", " bình phương", s)
    s = re.sub(r"\^3", " lập phương", s)
    s = re.sub(r"\\[a-zA-Z]+", " ", s)
    s = re.sub(r"[{}$\\\\]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def display_line_to_speech(line: str) -> str:
    s = (line or "").strip()
    if not s:
        return ""
    s = re.sub(r"^[(\[]?([a-zđ])(?:\)|\]|\.)\s*", lambda m: f"Câu {m.group(1)}. ", s, flags=re.I)
    s = _strip_latex_for_speech(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def beat_label(beat: dict[str, Any], index: int) -> str:
    phase = str(beat.get("phase") or "")
    comment = str(beat.get("comment_vi") or "").strip()
    if comment:
        return comment[:40]
    lines = beat.get("text_lines") or []
    first = lines[0] if lines else ""
    m = re.match(r"^([a-zđ])(?:\)|\.)\s*", str(first).strip(), flags=re.I)
    if m and phase == "solution_steps":
        return f"Câu {m.group(1).lower()}"
    return PHASE_LABELS.get(phase, f"Beat {index + 1}")


def beat_visual_weight(beat: dict[str, Any]) -> float:
    phase = str(beat.get("phase") or "")
    w = PHASE_BASE_WEIGHT.get(phase, 2.0)
    actions = beat.get("actions") or []
    for action in actions:
        if isinstance(action, dict):
            if action.get("op") == "wait":
                w += float(action.get("seconds") or 0.8)
        elif isinstance(action, str) and "wait" in action.lower():
            w += 0.8
    text_n = len(beat.get("text_lines") or []) + len(beat.get("latex_lines") or [])
    w += text_n * 0.45
    return max(w, 0.35)


def narration_text_from_beat(beat: dict[str, Any], index: int = 0) -> str:
    existing = str(beat.get("narration_text") or "").strip()
    if existing:
        return existing
    phase = str(beat.get("phase") or "")
    if phase in PHASE_SKIP_NARRATION:
        return ""
    parts: list[str] = []
    for line in beat.get("text_lines") or []:
        spoken = display_line_to_speech(str(line))
        if spoken:
            parts.append(spoken)
    if not parts and beat.get("comment_vi"):
        parts.append(display_line_to_speech(str(beat["comment_vi"])))
    for line in beat.get("latex_lines") or []:
        spoken = _strip_latex_for_speech(str(line))
        if spoken:
            parts.append(spoken)
    return " ".join(parts).strip()


def build_narration_segments(
    beats: list[dict[str, Any]],
    *,
    problem_text: str = "",
    solution_steps: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Mỗi beat visible có thể có narration_text riêng (đề / câu a / câu b…)."""
    segments: list[dict[str, Any]] = []
    step_idx = 0
    for i, beat in enumerate(beats):
        if beat.get("visible") is False:
            continue
        phase = str(beat.get("phase") or "")
        text = narration_text_from_beat(beat, i)
        if not text and phase in ("problem", "problem_and_figure") and problem_text.strip():
            text = display_line_to_speech(problem_text.strip()[:500])
        if not text and phase == "solution_steps" and solution_steps:
            while step_idx < len(solution_steps) and not text:
                text = display_line_to_speech(solution_steps[step_idx])
                step_idx += 1
        if not text:
            continue
        bid = str(beat.get("id") or f"beat-{i}")
        segments.append(
            {
                "beat_id": bid,
                "order": i,
                "phase": phase,
                "label": beat_label(beat, i),
                "narration_text": text,
                "weight": beat_visual_weight(beat),
            }
        )
    return segments


def allocate_beat_timeline(
    beats: list[dict[str, Any]],
    video_duration: float,
) -> list[dict[str, Any]]:
    """Chia video theo trọng số beat → start_s / slot_s cho từng beat visible."""
    visible = [b for b in beats if b.get("visible") is not False]
    if not visible or video_duration <= 0:
        return []
    weights = [beat_visual_weight(b) for b in visible]
    total_w = sum(weights) or 1.0
    cursor = 0.0
    slots: list[dict[str, Any]] = []
    for i, beat in enumerate(visible):
        w = weights[i]
        slot_s = video_duration * w / total_w
        orig_idx = next((j for j, b in enumerate(beats) if b is beat), i)
        bid = str(beat.get("id") or f"beat-{orig_idx}")
        slots.append(
            {
                "beat_id": bid,
                "phase": beat.get("phase") or "",
                "start_s": cursor,
                "slot_s": slot_s,
                "end_s": cursor + slot_s,
            }
        )
        cursor += slot_s
    return slots


def synthesize_beat_segments(
    segments: list[dict[str, Any]],
    out_dir: Path,
    *,
    voice: str = "vi-VN-HoaiMyNeural",
    rate: str = "+0%",
) -> list[dict[str, Any]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    result: list[dict[str, Any]] = []
    for seg in segments:
        text = str(seg.get("narration_text") or "").strip()
        if not text:
            continue
        beat_id = re.sub(r"[^\w.-]+", "_", str(seg.get("beat_id") or "beat"))
        audio_path = out_dir / f"{beat_id}.mp3"
        synthesize_speech(text, audio_path, voice=voice, rate=rate)
        duration_s = probe_duration_seconds(audio_path)
        result.append({**seg, "audio_path": str(audio_path), "duration_s": duration_s})
    return result


def _make_silence_mp3(duration_s: float, out_path: Path) -> None:
    if duration_s <= 0.01:
        return
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Thiếu ffmpeg")
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=mono",
        "-t",
        f"{duration_s:.3f}",
        "-q:a",
        "9",
        str(out_path),
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=True)


def compose_beat_audio_track(
    slots: list[dict[str, Any]],
    segments_audio: list[dict[str, Any]],
    out_path: Path,
    video_duration: float,
) -> dict[str, Any]:
    """Ghép các MP3 beat vào một track theo start_s trên timeline."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("Thiếu ffmpeg")
    by_id = {s["beat_id"]: s for s in segments_audio}
    timeline: list[dict[str, Any]] = []
    parts: list[Path] = []
    cursor = 0.0

    for slot in slots:
        bid = slot["beat_id"]
        start = float(slot["start_s"])
        if start > cursor + 0.02:
            sil = out_path.parent / f"_sil_{len(parts)}.mp3"
            _make_silence_mp3(start - cursor, sil)
            parts.append(sil)
            cursor = start
        seg = by_id.get(bid)
        if seg and seg.get("audio_path"):
            ap = Path(seg["audio_path"])
            parts.append(ap)
            dur = float(seg.get("duration_s") or probe_duration_seconds(ap))
            timeline.append(
                {
                    "beat_id": bid,
                    "label": seg.get("label"),
                    "start_s": round(start, 2),
                    "audio_duration_s": round(dur, 2),
                    "slot_s": round(float(slot["slot_s"]), 2),
                }
            )
            cursor = start + dur + BEAT_PAUSE_S

    if cursor < video_duration - 0.05:
        sil = out_path.parent / f"_sil_tail.mp3"
        _make_silence_mp3(video_duration - cursor, sil)
        parts.append(sil)

    if not parts:
        raise ValueError("Không có đoạn audio nào để ghép")

    list_file = out_path.parent / "_concat_list.txt"
    with list_file.open("w", encoding="utf-8") as f:
        for p in parts:
            f.write(f"file '{p.resolve()}'\n")

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "4",
        str(out_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0 or not out_path.exists():
        err = (result.stderr or result.stdout or "")[-600:]
        raise RuntimeError(f"Ghép track beat thất bại: {err}")

    audio_dur = probe_duration_seconds(out_path)
    return {
        "path": out_path,
        "timeline": timeline,
        "audio_duration": audio_dur,
        "segment_count": len(segments_audio),
    }


def merge_beats_voiceover(
    video_path: Path,
    beats: list[dict[str, Any]],
    segments: list[dict[str, Any]],
    out_path: Path,
    *,
    voice: str = "vi-VN-HoaiMyNeural",
    rate: str = "+0%",
    sync_to_narration: bool = True,
) -> dict[str, Any]:
    """TTS từng beat → đặt theo timeline → ghép vào MP4."""
    from voiceover import merge_audio_video

    work_dir = out_path.parent / "_beats_audio"
    work_dir.mkdir(parents=True, exist_ok=True)

    video_dur = probe_duration_seconds(video_path)
    slots = allocate_beat_timeline(beats, video_dur)
    if not slots:
        raise ValueError("Không chia được timeline — kiểm tra kịch bản beats")

    audio_segments = synthesize_beat_segments(segments, work_dir, voice=voice, rate=rate)
    if not audio_segments:
        raise ValueError("Không có đoạn nào để đọc — kiểm tra narration_text từng beat")

    composed_path = work_dir / "beats_composed.mp3"
    composed = compose_beat_audio_track(slots, audio_segments, composed_path, video_dur)

    merged = merge_audio_video(
        video_path,
        composed_path,
        out_path,
        sync_to_narration=sync_to_narration,
    )

    return {
        **merged,
        "beat_timeline": composed["timeline"],
        "segment_count": composed["segment_count"],
        "sync_note": (
            f"{merged.get('sync_note', '')} — {composed['segment_count']} đoạn theo beat"
        ).strip(" —"),
    }
