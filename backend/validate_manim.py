"""Validate Manim CE code before render.

Modes:
- render_free: Docker/Render — no LaTeX, Text/MarkupText only.
- local_latex: Windows/local with MiKTeX — MathTex for formulas, Text for Vietnamese.
"""

from __future__ import annotations

import ast
import re
import shutil
from typing import Any, Literal

ValidationMode = Literal["render_free", "local_latex"]

_RENDER_FREE_FORBIDDEN: list[tuple[str, str]] = [
    (r"\bMathTex\s*\(", "Cấm MathTex — dùng Text/MarkupText (Render Free)"),
    (r"\bTex\s*\(", "Cấm Tex — dùng Text/MarkupText (Render Free)"),
    (r"\bSingleStringMathTex\s*\(", "Cấm SingleStringMathTex — dùng Text/MarkupText"),
    (r"tex_template", "Cấm tex_template / preamble LaTeX"),
    (r"add_to_preamble", "Cấm add_to_preamble"),
    (
        r"\bMathTypst\s*\(|\bTypst\s*\(",
        "Cấm Typst/MathTypst (chưa cài trên Render) — dùng Text/MarkupText",
    ),
    (
        r"\bLabel\s*\(\s*[\"']",
        'Cấm Label("...") — dùng Text("...") hoặc Label(Text("..."))',
    ),
    (
        r"\bLabeledLine\s*\([^)]*[\"']",
        "Cấm LabeledLine với chuỗi trần — truyền Text(...) cho nhãn",
    ),
]

_LOCAL_LATEX_FORBIDDEN: list[tuple[str, str]] = [
    (
        r"\bTex\s*\(",
        "Cấm Tex() — dùng Text(font='Arial') cho tiếng Việt và MathTex(r'...') cho công thức LaTeX đẹp",
    ),
    (
        r"\bMathTypst\s*\(|\bTypst\s*\(",
        "Cấm Typst/MathTypst — dùng MathTex hoặc Text",
    ),
]

_COMMON_FORBIDDEN: list[tuple[str, str]] = [
    (r"\bMovingCameraScene\b", "Cấm MovingCameraScene (tốn RAM) — dùng Scene"),
    (r"\bThreeDScene\b", "Cấm ThreeDScene — dùng Scene (2D hình học)"),
    (r"\bZoomedScene\b", "Cấm ZoomedScene — dùng Scene"),
    (r"\bOpenGL(Scene|Mobject)\b", "Cấm OpenGL renderer/scene"),
    (r"\bTODO\b|\bFIXME\b", "Code còn placeholder/TODO"),
    (r"^\s*\.\.\.\s*$", "Code còn placeholder (...)"),
]

_WARNING_PATTERNS: list[tuple[str, str]] = [
    (r"\bDecimalNumber\s*\(", "DecimalNumber mặc định MathTex — cân nhắc Text hoặc mob_class=Text"),
    (r"\bInteger\s*\(", "Integer mặc định MathTex — cân nhắc Text hoặc mob_class=Text"),
    (r"\bNumberLine\s*\(", "NumberLine nhãn mặc định MathTex — đặt label_constructor=Text nếu dùng"),
    (r"\bBrace\s*\(", "Brace.get_text/get_tex dùng LaTeX — ưu tiên Text + next_to"),
]

_LOCAL_WARNINGS: list[tuple[str, str]] = [
    (
        r"\bMathTex\s*\(\s*(?![rf][\"'])",
        "MathTex: BẮT BUỘC dùng chuỗi thô r\"...\" (vd: MathTex(r\"x^2\"))",
    ),
    (
        r"\bMathTex\s*\(\s*r?[\"'][^\"']*\$[^\"']*[\"']",
        "MathTex không cần dấu $ bọc ngoài — dùng MathTex(r\"x^2\") không phải r\"$x^2$\"",
    ),
    (
        r"\bLabel\s*\(\s*[\"']",
        'Label("A") mặc định MathTex — ưu tiên Text("A", font_size=28)',
    ),
]

_HEAVY_SCENE_BASES = {
    "MovingCameraScene",
    "ThreeDScene",
    "ZoomedScene",
    "OpenGLScene",
    "OpenGLSurface",
}

_ALLOWED_IMPORT_ROOTS = {"manim", "numpy", "np", "math", "random", "typing", "__future__"}

_VN_DIACRITIC = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]",
    re.I,
)


def latex_available() -> bool:
    return shutil.which("latex") is not None or shutil.which("pdflatex") is not None


def default_validation_mode() -> ValidationMode:
    return "local_latex" if latex_available() else "render_free"


def normalize_validation_mode(mode: str | None) -> ValidationMode:
    if mode in ("local_latex", "local", "latex"):
        return "local_latex"
    return "render_free"


def validate_manim_code(
    code: str,
    mode: ValidationMode | str | None = None,
) -> dict[str, Any]:
    """Return {ok, errors, warnings, scene_names, mode}."""
    resolved_mode = normalize_validation_mode(mode) if mode else default_validation_mode()
    if resolved_mode == "local_latex" and not latex_available():
        resolved_mode = "render_free"

    errors: list[str] = []
    warnings: list[str] = []
    text = (code or "").strip()
    if not text:
        return {
            "ok": False,
            "errors": ["Mã Manim trống"],
            "warnings": [],
            "scene_names": [],
            "mode": resolved_mode,
        }

    if "from manim import" not in text and "import manim" not in text:
        errors.append("Thiếu `from manim import *` (hoặc import manim)")

    forbidden = list(_COMMON_FORBIDDEN)
    if resolved_mode == "local_latex":
        forbidden.extend(_LOCAL_LATEX_FORBIDDEN)
    else:
        forbidden.extend(_RENDER_FREE_FORBIDDEN)
        forbidden.append((r"\.get_tex\s*\(", "Cấm .get_tex() — dùng Text + next_to"))

    for pat, msg in forbidden:
        if re.search(pat, text, flags=re.M | re.I):
            errors.append(msg)

    warn_patterns = list(_WARNING_PATTERNS)
    if resolved_mode == "local_latex":
        warn_patterns.extend(_LOCAL_WARNINGS)

    for pat, msg in warn_patterns:
        if re.search(pat, text, flags=re.M | re.I):
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
            "mode": resolved_mode,
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
                    f"Class {node.name} kế thừa {', '.join(heavy)} — chỉ dùng Scene"
                )
            if any(b == "Scene" or b.endswith("Scene") for b in base_names):
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

    if resolved_mode == "local_latex":
        if "MathTex(" in text and "TransformMatchingTex" not in text and text.count("MathTex(") > 1:
            warnings.append(
                "Nhiều MathTex: cân nhắc TransformMatchingTex khi biến đổi công thức"
            )
        if "MathTex(" in text and not re.search(r"MathTex\s*\(\s*r[\"']", text):
            warnings.append("MathTex: dùng chuỗi thô r\"...\" cho công thức LaTeX")

    has_vn = bool(_VN_DIACRITIC.search(text))

    if has_vn and ("Text(" in text or "MarkupText(" in text):
        if "disable_ligatures" not in text:
            errors.append(
                "Text tiếng Việt cần disable_ligatures=True — tránh lỗi tô màu / font"
            )
        if not re.search(r'\bfont\s*=\s*["\']', text):
            errors.append(
                'Text tiếng Việt cần font="Arial" (Windows) hoặc font="DejaVu Sans" — '
                "thiếu font gây ô vuông □ thay chữ có dấu"
            )

    if "Text(" in text and "disable_ligatures" not in text and not has_vn:
        warnings.append("Nên Text(..., disable_ligatures=True) cho tiếng Việt / tô màu substring")

    if "MarkupText(" in text and ("<" in text) and ("&lt;" not in text and "&amp;" not in text):
        if re.search(r"MarkupText\s*\(\s*[f]?[\"'][^\"']*<[^/]", text):
            warnings.append("MarkupText: escape < > & thành &lt; &gt; &amp; nếu cần")

    # Chữ tiếng Việt trong MathTex/Tex → ô vuông hoặc lỗi LaTeX
    for m in re.finditer(
        r"(?:MathTex|Tex)\s*\(\s*([rf]?)([\"'])(.*?)\2", text, re.S
    ):
        inner = m.group(3)
        if _VN_DIACRITIC.search(inner):
            errors.append(
                "MathTex/Tex chứa tiếng Việt có dấu — tách: vn()/Text(font='Arial') "
                "+ MathTex chỉ công thức (gây ô vuông □)"
            )
            break

    return {
        "ok": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "scene_names": scene_names,
        "mode": resolved_mode,
    }


def validation_as_log(result: dict[str, Any]) -> str:
    """Format validation errors like a compile log for the reviser."""
    mode = result.get("mode") or "render_free"
    lines = [f"=== VALIDATE MANIM CE ({mode}) ==="]
    for e in result.get("errors") or []:
        lines.append(f"ERROR: {e}")
    for w in result.get("warnings") or []:
        lines.append(f"WARNING: {w}")
    if result.get("ok"):
        lines.append("OK: mã đạt kiểm tra Manim CE")
    return "\n".join(lines)
