"""Manim Video Studio — FastAPI backend.

Nhận mã Manim từ frontend, biên dịch thành video MP4 và trả về kết quả.
"""

from __future__ import annotations

import ast
import asyncio
import logging
import os
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from generate import (
    generate_geogebra,
    generate_manim_from_geogebra,
    generate_manim_from_storyboard,
    generate_problem_solution,
    generate_storyboard,
    repair_manim_loop,
    revise_manim_code,
)
from validate_manim import validate_manim_code
from voiceover import (
    generate_script,
    list_voices,
    merge_audio_video,
    synthesize_speech,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("manim-studio")

ROOT = Path(__file__).resolve().parent
EXAMPLES_DIR = ROOT / "examples"
MEDIA_ROOT = ROOT.parent / "media"
OUTPUT_DIR = MEDIA_ROOT / "outputs"
JOBS_DIR = MEDIA_ROOT / "jobs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# Chất lượng render: (resolution flag, fps, mô tả)
QUALITY_PRESETS: dict[str, dict[str, Any]] = {
    "480p15": {
        "flag": "-ql",
        "label": "480p - 15 FPS — Nhanh nhất, nên dùng trên Render",
        "resolution": "854x480",
        "fps": 15,
    },
    "720p30": {
        "flag": "-qm",
        "label": "720p - 30 FPS — Cân bằng",
        "resolution": "1280x720",
        "fps": 30,
    },
    "1080p60": {
        "flag": "-qh",
        "label": "1080p - 60 FPS — Chất lượng cao",
        "resolution": "1920x1080",
        "fps": 60,
    },
}

# Mẫu minh họa có sẵn
TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "parabola",
        "name": "Đồ thị Parabol",
        "file": "parabola.py",
        "default_scene": "ParabolaGraphWithTikz",
    },
    {
        "id": "linear",
        "name": "Hàm số bậc nhất",
        "file": "linear.py",
        "default_scene": "LinearFunction",
    },
    {
        "id": "circle",
        "name": "Diện tích hình tròn",
        "file": "circle.py",
        "default_scene": "CircleArea",
    },
    {
        "id": "pythagoras",
        "name": "Định lý Pythagore",
        "file": "pythagoras.py",
        "default_scene": "PythagoreanTheorem",
    },
]

# Lưu trạng thái job trong bộ nhớ (đủ cho demo đơn máy)
jobs: dict[str, dict[str, Any]] = {}

app = FastAPI(title="Manim Video Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompileRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Mã nguồn Manim (scene.py)")
    scene: str = Field(..., min_length=1, description="Tên class Scene cần chạy")
    quality: str = Field(default="480p15", description="Preset chất lượng")
    validate_first: bool = Field(
        default=True,
        description="Chặn biên dịch nếu validate Manim fail (cấm Tex, thiếu Scene...)",
    )


class CompileResponse(BaseModel):
    job_id: str
    status: str
    message: str


class GenerateRequest(BaseModel):
    problem_text: str = Field(default="", description="Nội dung đề bài")
    image_base64: str | None = Field(
        default=None, description="Ảnh đề dạng base64 hoặc data URL"
    )
    mime_type: str = Field(default="image/png")
    solution_text: str = Field(default="", description="Lời giải (tuỳ chọn, hỗ trợ dựng hình)")


class GenerateManimRequest(BaseModel):
    problem_text: str = Field(default="", description="Đề bài (bắt buộc)")
    solution_text: str = Field(default="", description="Lời giải (bắt buộc)")
    solution_steps: list[str] = Field(default_factory=list, description="Các bước giải")
    user_guidance: str = Field(
        default="",
        description="Prompt thêm: đối tượng, hiệu ứng, vị trí sắp xếp mong muốn",
    )
    geogebra_commands: list[str] | str = Field(
        default_factory=list, description="Lệnh GeoGebra đã chỉnh hoàn chỉnh"
    )
    geogebra_mode: str = Field(default="geometry")
    image_base64: str | None = Field(
        default=None,
        description="Ảnh PNG hình GeoGebra đã lưu sau kéo thả/chỉnh",
    )
    mime_type: str = Field(default="image/png")
    storyboard: dict | str | None = Field(
        default=None,
        description="Kịch bản video JSON (nếu có thì chỉ sinh code từ kịch bản)",
    )


class StoryboardRequest(BaseModel):
    problem_text: str = Field(default="")
    solution_text: str = Field(default="")
    solution_steps: list[str] = Field(default_factory=list)
    user_guidance: str = Field(default="")
    geogebra_commands: list[str] | str = Field(default_factory=list)
    geogebra_mode: str = Field(default="geometry")
    image_base64: str | None = Field(default=None)
    mime_type: str = Field(default="image/png")


class ReviseManimRequest(BaseModel):
    manim_code: str = Field(..., min_length=1, description="Mã Manim hiện tại")
    revision_prompt: str = Field(default="", description="Yêu cầu chỉnh sửa bằng lời")
    compile_log: str = Field(default="", description="Nhật ký biên dịch / lỗi")
    problem_text: str = Field(default="")
    solution_text: str = Field(default="")
    include_compile_log: bool = Field(
        default=True, description="Có dùng nhật ký lỗi khi sửa không"
    )
    max_rounds: int = Field(default=2, ge=1, le=3, description="Số vòng repair")


class ValidateManimRequest(BaseModel):
    manim_code: str = Field(..., min_length=1)


class ScriptRequest(BaseModel):
    problem_text: str = Field(default="", description="Ngữ cảnh đề bài")
    manim_code: str = Field(default="", description="Mã Manim để viết lời thoại")
    scene_name: str = Field(default="", description="Tên scene")


class VoiceoverRequest(BaseModel):
    job_id: str = Field(..., min_length=1, description="Job video đã render")
    script: str = Field(..., min_length=1, description="Lời thoại cần đọc")
    voice: str = Field(default="vi-VN-HoaiMyNeural", description="Giọng Edge TTS")
    rate: str = Field(default="+0%", description="Tốc độ đọc, ví dụ +0% / -10% / +10%")
    sync_to_narration: bool = Field(
        default=True,
        description="Kéo giãn/nén nhịp hình để khớp tương đối độ dài lời đọc",
    )


def resolve_video_path(job_id: str) -> Path:
    """Ưu tiên file voiced mới nhất, không thì video gốc."""
    candidates = sorted(OUTPUT_DIR.glob(f"{job_id}_*.mp4"), key=lambda p: p.stat().st_mtime)
    if candidates:
        # Ưu tiên bản chưa lồng tiếng làm nguồn (tránh lồng chồng)
        originals = [p for p in candidates if "_voiced" not in p.name]
        if originals:
            return originals[-1]
        return candidates[-1]
    job = jobs.get(job_id)
    if job and job.get("video_path") and Path(job["video_path"]).exists():
        return Path(job["video_path"])
    raise HTTPException(404, "Chưa có video để lồng tiếng — hãy biên dịch Manim trước")


def resolve_gemini_keys(header_key: str | None) -> list[str]:
    """Nhận nhiều key từ header (cách nhau bởi xuống dòng / dấu phẩy) + env."""
    keys: list[str] = []
    seen: set[str] = set()

    def add_chunk(chunk: str | None) -> None:
        if not chunk:
            return
        for part in re.split(r"[\n,;]+", chunk):
            k = part.strip()
            if k and not k.startswith("#") and k not in seen:
                seen.add(k)
                keys.append(k)

    add_chunk(header_key)
    add_chunk(os.environ.get("GEMINI_API_KEYS"))
    add_chunk(os.environ.get("GEMINI_API_KEY"))

    if not keys:
        raise HTTPException(
            400,
            "Thiếu Gemini API key. Nhập một hoặc nhiều key trên giao diện "
            "(mỗi dòng 1 key) hoặc đặt GEMINI_API_KEY / GEMINI_API_KEYS trên server.",
        )
    return keys


@app.post("/api/generate-problem-solution")
async def api_generate_problem_solution(
    req: GenerateRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Bước đầu: ảnh/gợi ý -> đề bài + lời giải."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        return await asyncio.to_thread(
            generate_problem_solution,
            api_key=api_keys,
            problem_text=req.problem_text,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-problem-solution failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/generate-geogebra")
async def api_generate_geogebra(
    req: GenerateRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Bước tiếp: đề (+ lời giải) -> lệnh GeoGebra (ẩn đường phụ)."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        return await asyncio.to_thread(
            generate_geogebra,
            api_key=api_keys,
            problem_text=req.problem_text,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
            solution_text=req.solution_text,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-geogebra failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/generate-storyboard")
async def api_generate_storyboard(
    req: StoryboardRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Tạo kịch bản video (JSON) trước khi viết code Manim."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        return await asyncio.to_thread(
            generate_storyboard,
            api_key=api_keys,
            geogebra_commands=req.geogebra_commands,
            problem_text=req.problem_text,
            solution_text=req.solution_text,
            solution_steps=req.solution_steps,
            user_guidance=req.user_guidance,
            geogebra_mode=req.geogebra_mode,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-storyboard failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/generate-manim")
async def api_generate_manim(
    req: GenerateManimRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Sinh Manim từ kịch bản (ưu tiên) hoặc tự tạo kịch bản rồi code."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        if req.storyboard:
            return await asyncio.to_thread(
                generate_manim_from_storyboard,
                api_key=api_keys,
                storyboard=req.storyboard,
                user_guidance=req.user_guidance,
            )
        return await asyncio.to_thread(
            generate_manim_from_geogebra,
            api_key=api_keys,
            geogebra_commands=req.geogebra_commands,
            problem_text=req.problem_text,
            solution_text=req.solution_text,
            solution_steps=req.solution_steps,
            user_guidance=req.user_guidance,
            geogebra_mode=req.geogebra_mode,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
            storyboard=None,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-manim failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/revise-manim")
async def api_revise_manim(
    req: ReviseManimRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Chỉnh sửa mã Manim theo prompt và/hoặc nhật ký lỗi biên dịch."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    log = req.compile_log if req.include_compile_log else ""
    try:
        return await asyncio.to_thread(
            revise_manim_code,
            api_key=api_keys,
            manim_code=req.manim_code,
            revision_prompt=req.revision_prompt,
            compile_log=log,
            problem_text=req.problem_text,
            solution_text=req.solution_text,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("revise-manim failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/validate-manim")
async def api_validate_manim(req: ValidateManimRequest) -> dict[str, Any]:
    """Kiểm tra mã Manim trước khi render (cấm Tex, Scene, import...)."""
    return validate_manim_code(req.manim_code)


@app.post("/api/repair-manim")
async def api_repair_manim(
    req: ReviseManimRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Vòng repair kiểu Math-To-Manim: validate → sửa theo lỗi/log → validate lại."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    log = req.compile_log if req.include_compile_log else ""
    try:
        return await asyncio.to_thread(
            repair_manim_loop,
            api_key=api_keys,
            manim_code=req.manim_code,
            compile_log=log,
            revision_prompt=req.revision_prompt,
            problem_text=req.problem_text,
            solution_text=req.solution_text,
            max_rounds=req.max_rounds,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("repair-manim failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/generate")
async def generate_geometry_legacy(
    req: GenerateRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """Legacy: GeoGebra rồi Manim (giữ tương thích)."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        ggb = await asyncio.to_thread(
            generate_geogebra,
            api_key=api_keys,
            problem_text=req.problem_text,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
            solution_text=req.solution_text,
        )
        manim = await asyncio.to_thread(
            generate_manim_from_geogebra,
            api_key=api_keys,
            geogebra_commands=ggb["geogebra_commands"],
            problem_text=req.problem_text,
            solution_text=req.solution_text or "",
            geogebra_mode=ggb["geogebra_mode"],
        )
        return {**ggb, **manim}
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate failed")
        raise HTTPException(502, str(exc)) from exc


def extract_scene_names(code: str) -> list[str]:
    """Trích xuất các class kế thừa Scene từ mã nguồn."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Fallback regex nếu AST lỗi
        return re.findall(r"class\s+(\w+)\s*\([^)]*Scene[^)]*\)", code)

    scenes: list[str] = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            for base in node.bases:
                name = ""
                if isinstance(base, ast.Name):
                    name = base.id
                elif isinstance(base, ast.Attribute):
                    name = base.attr
                if name.endswith("Scene") or name in {
                    "Scene",
                    "ThreeDScene",
                    "MovingCameraScene",
                    "ZoomedScene",
                    "VectorScene",
                    "LinearTransformationScene",
                }:
                    scenes.append(node.name)
                    break
    return scenes


def find_rendered_mp4(media_dir: Path, scene: str) -> Path | None:
    """Tìm file MP4 sau khi manim render xong."""
    candidates = sorted(media_dir.rglob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in candidates:
        if scene in path.name or path.stem == scene:
            return path
    return candidates[0] if candidates else None


def run_manim(
    code: str,
    scene: str,
    quality: str,
    job_id: str,
) -> dict[str, Any]:
    """Chạy manim trong thư mục tạm và trả về kết quả."""
    preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["480p15"])
    work_dir = JOBS_DIR / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    scene_file = work_dir / "scene.py"
    scene_file.write_text(code, encoding="utf-8")

    media_dir = work_dir / "media"
    log_path = work_dir / "compile.log"

    cmd = [
        "manim",
        "render",
        preset["flag"],
        "--media_dir",
        str(media_dir),
        "--disable_caching",
        str(scene_file),
        scene,
    ]

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    logger.info("Job %s: %s", job_id, " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            timeout=600,
            env=env,
        )
    except subprocess.TimeoutExpired:
        log_path.write_text("Timeout: biên dịch vượt quá 10 phút.\n", encoding="utf-8")
        return {
            "status": "error",
            "log": "Timeout: biên dịch vượt quá 10 phút.",
            "video_path": None,
        }
    except FileNotFoundError:
        msg = "Không tìm thấy lệnh `manim`. Hãy cài: pip install manim"
        log_path.write_text(msg, encoding="utf-8")
        return {"status": "error", "log": msg, "video_path": None}

    log_text = (result.stdout or "") + "\n" + (result.stderr or "")
    log_path.write_text(log_text, encoding="utf-8")

    if result.returncode != 0:
        return {"status": "error", "log": log_text, "video_path": None}

    mp4 = find_rendered_mp4(media_dir, scene)
    if not mp4 or not mp4.exists():
        return {
            "status": "error",
            "log": log_text + "\n\nKhông tìm thấy file MP4 sau khi render.",
            "video_path": None,
        }

    # Sao chép ra thư mục outputs để phục vụ lâu dài
    out_name = f"{job_id}_{scene}.mp4"
    out_path = OUTPUT_DIR / out_name
    shutil.copy2(mp4, out_path)

    return {
        "status": "done",
        "log": log_text,
        "video_path": str(out_path),
        "video_url": f"/api/video/{job_id}",
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    manim_ok = shutil.which("manim") is not None
    latex_ok = shutil.which("latex") is not None or shutil.which("pdflatex") is not None
    ffmpeg_ok = shutil.which("ffmpeg") is not None
    edge_tts_ok = False
    try:
        import edge_tts  # noqa: F401

        edge_tts_ok = True
    except ImportError:
        edge_tts_ok = False
    ready = manim_ok and ffmpeg_ok
    return {
        "status": "ok" if ready else "degraded",
        "ready": ready,
        "message": "Backend sẵn sàng" if ready else "Backend thiếu phụ thuộc",
        "deps": {
            "manim": manim_ok,
            "latex": latex_ok,
            "ffmpeg": ffmpeg_ok,
            "edge_tts": edge_tts_ok,
        },
        "gemini_configured": bool(
            os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GEMINI_API_KEYS", "").strip()
        ),
    }


@app.get("/api/qualities")
def list_qualities() -> list[dict[str, Any]]:
    return [
        {"id": key, **{k: v for k, v in val.items() if k != "flag"}}
        for key, val in QUALITY_PRESETS.items()
    ]


@app.get("/api/templates")
def list_templates() -> list[dict[str, Any]]:
    items = []
    for tpl in TEMPLATES:
        path = EXAMPLES_DIR / tpl["file"]
        code = path.read_text(encoding="utf-8") if path.exists() else ""
        scenes = extract_scene_names(code)
        if "scene_filter" in tpl:
            scenes = [s for s in scenes if s in tpl["scene_filter"]]
        items.append(
            {
                "id": tpl["id"],
                "name": tpl["name"],
                "default_scene": tpl["default_scene"],
                "scenes": scenes or [tpl["default_scene"]],
                "code": code,
            }
        )
    return items


@app.post("/api/parse-scenes")
def parse_scenes(payload: dict[str, str]) -> dict[str, list[str]]:
    code = payload.get("code", "")
    return {"scenes": extract_scene_names(code)}


@app.get("/api/tts-voices")
def api_tts_voices() -> list[dict[str, str]]:
    return list_voices()


@app.post("/api/generate-script")
async def api_generate_script(
    req: ScriptRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    """AI viết lời thoại tiếng Việt từ đề + mã Manim."""
    api_keys = resolve_gemini_keys(x_gemini_api_key)
    try:
        return await asyncio.to_thread(
            generate_script,
            api_key=api_keys,
            problem_text=req.problem_text,
            manim_code=req.manim_code,
            scene_name=req.scene_name,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate-script failed")
        raise HTTPException(502, str(exc)) from exc


@app.post("/api/voiceover")
async def api_voiceover(req: VoiceoverRequest) -> dict[str, Any]:
    """Edge TTS + FFmpeg: ghép lời thoại vào video đã render."""
    video_path = resolve_video_path(req.job_id)
    work_dir = JOBS_DIR / req.job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    audio_path = work_dir / "narration.mp3"
    scene = (jobs.get(req.job_id) or {}).get("scene") or "scene"
    out_path = OUTPUT_DIR / f"{req.job_id}_{scene}_voiced.mp4"

    def _run() -> dict[str, Any]:
        synthesize_speech(req.script, audio_path, voice=req.voice, rate=req.rate)
        merged = merge_audio_video(
            video_path,
            audio_path,
            out_path,
            sync_to_narration=req.sync_to_narration,
        )
        return {
            "job_id": req.job_id,
            "status": "done",
            "video_url": f"/api/video/{req.job_id}",
            "audio_url": f"/api/audio/{req.job_id}",
            "voice": req.voice,
            "message": f"Đã lồng tiếng — {merged.get('sync_note', '')}",
            "sync_to_narration": req.sync_to_narration,
            "speed_ratio": merged.get("speed_ratio"),
            "video_duration": merged.get("video_duration"),
            "audio_duration": merged.get("audio_duration"),
            "sync_note": merged.get("sync_note"),
        }

    try:
        result = await asyncio.to_thread(_run)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("voiceover failed")
        raise HTTPException(502, str(exc)) from exc

    # Cập nhật job in-memory để /api/video lấy bản voiced
    if req.job_id in jobs:
        jobs[req.job_id]["video_path"] = str(out_path)
        jobs[req.job_id]["video_url"] = result["video_url"]
        jobs[req.job_id]["status"] = "done"
        jobs[req.job_id]["has_voiceover"] = True
    else:
        jobs[req.job_id] = {
            "status": "done",
            "video_path": str(out_path),
            "video_url": result["video_url"],
            "has_voiceover": True,
            "scene": scene,
        }
    return result


@app.get("/api/audio/{job_id}")
def get_audio(job_id: str) -> FileResponse:
    path = JOBS_DIR / job_id / "narration.mp3"
    if not path.exists():
        raise HTTPException(404, "Chưa có file âm thanh")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        filename=f"{job_id}_narration.mp3",
        headers={"Content-Disposition": f'inline; filename="{job_id}_narration.mp3"'},
    )


@app.post("/api/compile", response_model=CompileResponse)
async def compile_video(req: CompileRequest) -> CompileResponse:
    if req.quality not in QUALITY_PRESETS:
        raise HTTPException(400, f"Chất lượng không hợp lệ: {req.quality}")

    if req.validate_first:
        validation = validate_manim_code(req.code)
        if not validation["ok"]:
            detail = {
                "message": "Mã Manim chưa đạt kiểm tra trước khi render",
                "validation": validation,
                "hint": "Dùng AI sửa code / Repair loop, hoặc tắt validate_first",
            }
            raise HTTPException(400, detail)

    scenes = extract_scene_names(req.code)
    if req.scene not in scenes:
        # Vẫn cho phép nếu người dùng chỉ định tên hợp lệ (có thể AST miss)
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", req.scene):
            raise HTTPException(400, "Tên scene không hợp lệ")

    job_id = uuid.uuid4().hex[:12]
    jobs[job_id] = {
        "status": "running",
        "log": "Đang biên dịch...\n",
        "video_url": None,
        "scene": req.scene,
        "quality": req.quality,
    }

    async def _run() -> None:
        result = await asyncio.to_thread(
            run_manim, req.code, req.scene, req.quality, job_id
        )
        jobs[job_id].update(result)

    asyncio.create_task(_run())

    return CompileResponse(
        job_id=job_id,
        status="running",
        message="Đã bắt đầu biên dịch video",
    )


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, Any]:
    job = jobs.get(job_id)
    if not job:
        # Thử đọc từ disk nếu server restart
        work_dir = JOBS_DIR / job_id
        log_path = work_dir / "compile.log"
        video_candidates = list(OUTPUT_DIR.glob(f"{job_id}_*.mp4"))
        if not log_path.exists() and not video_candidates:
            raise HTTPException(404, "Không tìm thấy job")
        status = "done" if video_candidates else "error"
        return {
            "job_id": job_id,
            "status": status,
            "log": log_path.read_text(encoding="utf-8") if log_path.exists() else "",
            "video_url": f"/api/video/{job_id}" if video_candidates else None,
        }
    return {
        "job_id": job_id,
        "status": job["status"],
        "log": job.get("log", ""),
        "video_url": job.get("video_url"),
        "scene": job.get("scene"),
        "quality": job.get("quality"),
    }


@app.get("/api/video/{job_id}")
def get_video(job_id: str) -> FileResponse:
    candidates = sorted(
        OUTPUT_DIR.glob(f"{job_id}_*.mp4"),
        key=lambda p: p.stat().st_mtime,
    )
    if not candidates:
        job = jobs.get(job_id)
        if job and job.get("video_path") and Path(job["video_path"]).exists():
            path = Path(job["video_path"])
        else:
            raise HTTPException(404, "Video chưa sẵn sàng")
    else:
        voiced = [p for p in candidates if "_voiced" in p.name]
        path = voiced[-1] if voiced else candidates[-1]

    return FileResponse(
        path,
        media_type="video/mp4",
        filename=path.name,
        headers={"Content-Disposition": f'inline; filename="{path.name}"'},
    )


@app.get("/api/video/{job_id}/download")
def download_video(job_id: str) -> FileResponse:
    candidates = sorted(
        OUTPUT_DIR.glob(f"{job_id}_*.mp4"),
        key=lambda p: p.stat().st_mtime,
    )
    if not candidates:
        raise HTTPException(404, "Video chưa sẵn sàng")
    voiced = [p for p in candidates if "_voiced" in p.name]
    path = voiced[-1] if voiced else candidates[-1]
    return FileResponse(
        path,
        media_type="video/mp4",
        filename=path.name,
        headers={"Content-Disposition": f'attachment; filename="{path.name}"'},
    )


# Serve frontend build nếu có
FRONTEND_DIST = ROOT.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
