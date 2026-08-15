"""Validate Manim CE code before render — CE checklist for Render Free."""

from __future__ import annotations

import ast
import re
from typing import Any

# Hard errors: break Free/Docker renders or silently pull in LaTeX
_FORBIDDEN_PATTERNS: list[tuple[str, str]] = [
    (r"\bMathTex\s*\(", "Cấm MathTex — dùng Text/MarkupText"),
    (r"\bTex\s*\(", "Cấm Tex — dùng Text/MarkupText"),
    (r"\bSingleStringMathTex\s*\(", "Cấm SingleStringMathTex — dùng Text/MarkupText"),
    (r"tex_template", "Cấm tex_template / preamble LaTeX"),
    (r"add_to_preamble", "Cấm add_to_preamble"),
    (r"\bMathTypst\s*\(|\bTypst\s*\(", "Cấm Typst/MathTypst (chưa cài trên Render) — dùng Text/MarkupText"),
    # Label("A") defaults to MathTex in Manim CE
    (r"\bLabel\s*\(\s*[\"']", "Cấm Label(\"...\") — dùng Text(\"...\") hoặc Label(Text(\"...\"))"),
    (r"\bLabeledLine\s*\([^)]*[\"']", "Cấm LabeledLine với chuỗi trần — truyền Text(...) cho nhãn"),
    (r"\bMovingCameraScene\b", "Cấm MovingCameraScene (tốn RAM) — dùng Scene"),
    (r"\bThreeDScene\b", "Cấm ThreeDScene trên Render Free — dùng Scene"),
    (r"\bZoomedScene\b", "Cấm ZoomedScene — dùng Scene"),
    (r"\bOpenGL(Scene|Mobject)\b", "Cấm OpenGL renderer/scene trên Render Free"),
    (r"\.get_tex\s*\(", "Cấm .get_tex() (kéo LaTeX) — dùng Text + next_to"),
    (r"\bTODO\b|\bFIXME\b", "Code còn placeholder/TODO"),
    (r"^\s*\.\.\.\s*$", "Code còn placeholder (...)"),
]

_WARNING_PATTERNS: list[tuple[str, str]] = [
    (r"\bDecimalNumber\s*\(", "DecimalNumber mặc định MathTex — cân nhắc Text hoặc mob_class=Text"),
    (r"\bInteger\s*\(", "Integer mặc định MathTex — cân nhắc Text hoặc mob_class=Text"),
    (r"\bNumberLine\s*\(", "NumberLine nhãn mặc định MathTex — đặt label_constructor=Text nếu dùng"),
    (r"\bBrace\s*\(", "Brace.get_text/get_tex dùng LaTeX — ưu tiên Text + next_to"),
]

_HEAVY_SCENE_BASES = {
    "MovingCameraScene",
    "ThreeDScene",
    "ZoomedScene",
    "OpenGLScene",
    "OpenGLSurface",
}

_ALLOWED_IMPORT_ROOTS = {"manim", "numpy", "np", "math", "random", "typing", "__future__"}


def validate_manim_code(code: str) -> dict[str, Any]:
    """Return {ok, errors, warnings, scene_names}."""
    errors: list[str] = []
    warnings: list[str] = []
    text = (code or "").strip()
    if not text:
        return {
            "ok": False,
            "errors": ["Mã Manim trống"],
            "warnings": [],
            "scene_names": [],
        }

    if "from manim import" not in text and "import manim" not in text:
        errors.append("Thiếu `from manim import *` (hoặc import manim)")

    for pat, msg in _FORBIDDEN_PATTERNS:
        if re.search(pat, text, flags=re.M):
            errors.append(msg)

    for pat, msg in _WARNING_PATTERNS:
        if re.search(pat, text, flags=re.M):
            warnings.append(msg)

    scene_names: list[str] = []
    try:
        tree = ast.parse(text)
    except SyntaxError as exc:
        errors.append(f"Lỗi cú pháp Python: {exc.msg} (dòng {exc.lineno})")
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
            "scene_names": [],
        }

    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root = (alias.name or "").split(".")[0]
                    if root and root not in _ALLOWED_IMPORT_ROOTS:
                        errors.append(f"Import không an toàn: {alias.name}")
            else:
                mod = node.module or ""
                root = mod.split(".")[0] if mod else ""
                if root and root not in _ALLOWED_IMPORT_ROOTS:
                    errors.append(f"Import không an toàn: {mod}")

        if isinstance(node, ast.ClassDef):
            base_names: list[str] = []
            for base in node.bases:
                if isinstance(base, ast.Name):
                    base_names.append(base.id)
                elif isinstance(base, ast.Attribute):
                    base_names.append(base.attr)
            heavy = [b for b in base_names if b in _HEAVY_SCENE_BASES]
            if heavy:
                errors.append(
                    f"Class {node.name} kế thừa {', '.join(heavy)} — chỉ dùng Scene trên Render Free"
                )
            if any(b == "Scene" or b.endswith("Scene") for b in base_names):
                # Still collect name even if heavy (for UI); heavy already errored
                scene_names.append(node.name)
                has_construct = any(
                    isinstance(n, ast.FunctionDef) and n.name == "construct"
                    for n in node.body
                )
                if not has_construct:
                    errors.append(f"Class {node.name} thiếu def construct(self)")

    if not scene_names:
        errors.append("Thiếu class kế thừa Scene")

    if "scale_to_fit_height" not in text and "scale_to_fit_width" not in text:
        warnings.append("Nên scale VGroup (scale_to_fit_height) để tránh cắt hình")

    if "self.wait" not in text:
        warnings.append("Nên có self.wait() giữa các bước")

    if "Text(" in text and "disable_ligatures" not in text:
        warnings.append("Nên Text(..., disable_ligatures=True) cho tiếng Việt / tô màu substring")

    if "MarkupText(" in text and ("<" in text) and ("&lt;" not in text and "&amp;" not in text):
        # Soft hint only when markup likely present without escapes — keep mild
        if re.search(r"MarkupText\s*\(\s*[f]?[\"'][^\"']*<[^/]", text):
            warnings.append("MarkupText: escape < > & thành &lt; &gt; &amp; nếu cần")

    return {
        "ok": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "scene_names": scene_names,
    }


def validation_as_log(result: dict[str, Any]) -> str:
    """Format validation errors like a compile log for the reviser."""
    lines = ["=== VALIDATE MANIM CE (trước khi render) ==="]
    for e in result.get("errors") or []:
        lines.append(f"ERROR: {e}")
    for w in result.get("warnings") or []:
        lines.append(f"WARNING: {w}")
    if result.get("ok"):
        lines.append("OK: mã đạt kiểm tra Manim CE cơ bản")
    return "\n".join(lines)
