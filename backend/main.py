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

from generate import generate_from_problem

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


def resolve_gemini_key(header_key: str | None) -> str:
    key = (header_key or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            400,
            "Thiếu Gemini API key. Nhập API key trên giao diện hoặc đặt GEMINI_API_KEY trên server.",
        )
    return key


@app.post("/api/generate")
async def generate_geometry(
    req: GenerateRequest,
    x_gemini_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    api_key = resolve_gemini_key(x_gemini_api_key)
    try:
        result = await asyncio.to_thread(
            generate_from_problem,
            api_key=api_key,
            problem_text=req.problem_text,
            image_b64=req.image_base64,
            mime_type=req.mime_type,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("generate failed")
        raise HTTPException(502, str(exc)) from exc
    return result


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
    ready = manim_ok and ffmpeg_ok
    return {
        "status": "ok" if ready else "degraded",
        "ready": ready,
        "message": "Backend sẵn sàng" if ready else "Backend thiếu phụ thuộc",
        "deps": {
            "manim": manim_ok,
            "latex": latex_ok,
            "ffmpeg": ffmpeg_ok,
        },
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
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


@app.post("/api/compile", response_model=CompileResponse)
async def compile_video(req: CompileRequest) -> CompileResponse:
    if req.quality not in QUALITY_PRESETS:
        raise HTTPException(400, f"Chất lượng không hợp lệ: {req.quality}")

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
    candidates = sorted(OUTPUT_DIR.glob(f"{job_id}_*.mp4"))
    if not candidates:
        job = jobs.get(job_id)
        if job and job.get("video_path") and Path(job["video_path"]).exists():
            path = Path(job["video_path"])
        else:
            raise HTTPException(404, "Video chưa sẵn sàng")
    else:
        path = candidates[-1]

    return FileResponse(
        path,
        media_type="video/mp4",
        filename=path.name,
        headers={"Content-Disposition": f'inline; filename="{path.name}"'},
    )


@app.get("/api/video/{job_id}/download")
def download_video(job_id: str) -> FileResponse:
    candidates = sorted(OUTPUT_DIR.glob(f"{job_id}_*.mp4"))
    if not candidates:
        raise HTTPException(404, "Video chưa sẵn sàng")
    path = candidates[-1]
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
