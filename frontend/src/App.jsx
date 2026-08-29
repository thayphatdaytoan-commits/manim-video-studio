import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Clapperboard,
  Code2,
  Copy,
  Download,
  FileImage,
  FileText,
  ImagePlus,
  KeyRound,
  Loader2,
  Mic,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Volume2,
  Wifi,
  WifiOff,
  Wand2,
  Wrench,
  X,
  Bot,
  Maximize2,
  Minimize2,
  Film,
  Move,
  Layers,
} from 'lucide-react'
import GeoGebraApplet, { sanitizeGgbCommands } from './GeoGebraApplet'
import {
  buildFigureContextBlock,
  buildManimReferenceCode,
  defaultConstructionOrder,
  kindLabel,
  manifestToFigureObjects,
} from './figureReference'
import SceneTimeline from './SceneTimeline'
import {
  applyTimelineToStoryboard,
  beatsToTimeline,
  moveTimelineItem,
  parseStoryboardJson,
  storyboardWithVisibleBeats,
  toggleTimelineVisibility,
} from './storyboardTimeline'
import {
  applyLayoutTemplateToStoryboard,
  getLayoutTemplate,
  listLayoutTemplates,
  saveCustomLayoutTemplate,
} from './layoutTemplates'
import { getGraphPreset, GRAPH_PRESETS } from './graphPresets'
import DraggableLayoutPreview from './DraggableLayoutPreview'
import {
  applyShiftsToSlots,
  defaultLayoutSlots,
  injectLayoutShiftsIntoCode,
  parseLayoutShiftsFromCode,
  shiftsFromSlots,
} from './layoutEditor'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const KEY_STORAGE = 'mvs_gemini_api_keys'
const KEY_STORAGE_LEGACY = 'mvs_gemini_api_key'
const VALIDATION_MODE_STORAGE = 'mvs_validation_mode'

const CE_CHECKLIST_RENDER_FREE = [
  { id: 'scene', label: 'class kế thừa Scene (không MovingCamera / 3D)' },
  { id: 'text', label: 'Text / MarkupText tiếng Việt (disable_ligatures=True)' },
  { id: 'notex', label: 'Không Tex / MathTex / Label("A") / Typst' },
  { id: 'geom', label: 'Dot, Line, Circle, Polygon, Angle, VGroup, ImageMobject' },
  { id: 'layout', label: 'Hình trái / chữ phải + scale_to_fit_height' },
  { id: 'wait', label: 'Mỗi bước lời giải có animation + self.wait()' },
]

const CE_CHECKLIST_LOCAL = [
  { id: 'scene', label: 'class Scene (2D) — không MovingCamera / 3D' },
  { id: 'hybrid', label: 'Text tiếng Việt + MathTex(r"...") cho công thức' },
  { id: 'notex', label: 'CẤM Tex() — chỉ MathTex(r"...") cho công thức LaTeX đẹp' },
  { id: 'font', label: 'Text: font="Arial" + disable_ligatures=True (tránh ô vuông □)' },
  { id: 'latex', label: 'MathTex bắt buộc r"..."; không dùng $ bọc ngoài' },
  { id: 'geom', label: 'Dot, Line, Circle, Polygon, Angle, TransformMatchingTex' },
  { id: 'layout', label: 'Hình trái scale≤4.0 / chữ phải — không chồng, không tràn mép' },
]

function loadValidationMode() {
  try {
    const saved = localStorage.getItem(VALIDATION_MODE_STORAGE)
    if (saved === 'local_latex' || saved === 'render_free') return saved
  } catch {
    /* ignore */
  }
  return 'auto'
}

const LAYOUT_SAFE_RULES = `
=== CANH KHUNG & KHÔNG ĐÈ CHỮ (BẮT BUỘC) ===
Khung 16:9 Manim: rộng ~14, cao ~8 (từ -7 đến 7, -4 đến 4).

1) VÙNG BỐ CỤC (không chồng nhau):
   - title_block: to_edge(UP, buff=0.35) — chỉ tiêu đề ngắn, font_size ≤ 30
   - figure_zone: move_to(LEFT * 2.8), scale_to_fit_height(4.0) — KHÔNG vượt mép trái/trên
   - text_panel: to_edge(RIGHT, buff=0.4).scale(0.38) — tối đa 2 dòng / beat
   - KHÔNG đặt title + hình + text cùng tọa độ ORIGIN

2) MỖI BEAT — tránh đè chữ:
   - Trước beat mới: FadeOut(text_panel_cũ) hoặc ReplacementTransform(panel, panel_mới)
   - Hoặc dùng 1 VGroup panel cố định bên phải, chỉ đổi nội dung bên trong
   - text_lines ≤ 2 dòng; font_size lời giải 22–26

3) HÌNH KHÔNG RA NGOÀI:
   - Luôn: figure = VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
   - Nhãn điểm: font_size 22, next_to(dot, buff=0.08) — không để nhãn tràn mép
   - Sau khi code xong: tự kiểm tra mọi mobject trong [-6.5, 6.5] x [-3.5, 3.5]

4) CODE MẪU KHUNG:
   title = vn("Bài toán hình học", 28).to_edge(UP, buff=0.35)
   figure = VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
   panel = VGroup().to_edge(RIGHT, buff=0.4).align_to(title, UP)
   # mỗi bước: self.play(FadeOut(old_panel)) rồi Write(new_panel) nếu cần
`

const MATH_LATEX_RULES = `
=== CÔNG THỨC LaTeX ĐẸP (BẮT BUỘC — Local + LaTeX) ===
CẤM Tex(...) hoàn toàn. Tex render xấu, không morph được, dễ lỗi.

PHÂN LOẠI:
- Tiếng Việt → Text(font="Arial", disable_ligatures=True) hoặc vn()
- Công thức / góc / ⊥ / △ / ∠ → MathTex(r"...") — LUÔN có chữ r

SAI → ĐÚNG:
❌ Tex(r"Ta có $CK \\perp AE$")  →  ✅ VGroup(vn("Ta có"), MathTex(r"CK \\perp AE"))
❌ Tex(r"$\\angle AKC = 90^\\circ$")  →  ✅ MathTex(r"\\angle AKC = 90^\\circ")
❌ MathTex("x^2")  →  ✅ MathTex(r"x^2")
❌ MathTex(r"$x^2$")  →  ✅ MathTex(r"x^2")   (không bọc $)
❌ MathTex(r"Chứng minh tứ giác...")  →  ✅ vn("Chứng minh...") + MathTex(r"\\Rightarrow")

BIẾN ĐỔI: TransformMatchingTex(eq1, eq2) khi đổi dòng công thức.
`

const CHANNEL_STYLE_HINT = `
=== PHONG CÁCH MẶC ĐỊNH: SHORTS 9:16 HÌNH HỌC (TQH) — FULL MÀN HÌNH ===
1. problem_and_figure: CHỮ ĐỀ trên → HÌNH dưới (phóng full chiều ngang SAFE_W)
2. transition_hide_problem: ẩn đề → hình phóng to sát mép trên (KHÔNG shift UP*2 mù)
3. solution_steps: HÌNH trên → CHỮ lời giải dưới, canh trái, font 28–32
4. page_break: ≥4 dòng — không để viền đen dư trên/dưới/hai bên
Tham khảo: backend/examples/style_shorts_tqh_geometry.py
`

const SHORTS_TQH_LAYOUT_RULES = `
=== SHORTS 9:16 — FULL MÀN HÌNH (BẮT BUỘC — KHÔNG VIỀN ĐEN) ===
config.pixel_width=1080, pixel_height=1920 (hoặc manim -pq).
Khung portrait: frame_width≈4.5, frame_height=8 — KHÔNG layout landscape 14×8.

【HẰNG SỐ】MARGIN=0.18 | SAFE_W=config.frame_width-2*MARGIN (~4.1)
LEFT_EDGE=LEFT*(config.frame_width/2-MARGIN)

【GIAI ĐOẠN 1 — problem_and_figure: CHỮ TRÊN → HÌNH DƯỚI】
- problem_block.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT); font 28–32
- fit_figure_full_width(figure, avail_h); figure.next_to(problem_block, DOWN, buff=0.2)
- CẤM move_to(DOWN*0.8), scale_to_fit_height(3.6) không kèm scale_to_fit_width(SAFE_W)

【GIAI ĐOẠN 2 — transition: ẨN ĐỀ, HÌNH PHÓNG LÊN TRÊN】
- FadeOut(problem_block)
- fit_figure_full_width(figure, config.frame_height*0.52); to_edge(UP, buff=MARGIN)
- CẤM figure.animate.shift(UP*2) — gây hình nhỏ + viền đen

【GIAI ĐOẠN 3 — solution_steps: HÌNH TRÊN → CHỮ DƯỚI】
- new_line.next_to(figure, DOWN, buff=0.15).align_to(LEFT_EDGE, LEFT); font 28–32
- MathTex scale 1.0; CẤM panel.scale(0.38)

【GIAI ĐOẠN 4 — page_break】MAX_LINES_PER_PAGE=4; bottom_limit=-frame_height/2+MARGIN
`

const GEMINI_SHORTS_TQH_JSON_GUIDE = `
=== KỊCH BẢN JSON — SHORTS TQH FULL-FRAME ===
{
  "video_format": "shorts",
  "layout": {
    "mode": "shorts_tqh_fullframe",
    "margin": 0.18,
    "safe_width": "config.frame_width - 2*margin",
    "max_lines_per_page": 4,
    "problem_layout": "text_top_figure_below",
    "solution_layout": "figure_top_text_below",
    "figure_initial": "next_to(problem_block,DOWN) + scale_to_fit_width(SAFE_W)",
    "figure_after_transition": "to_edge(UP) + scale_to_fit_width(SAFE_W) + height 52% frame"
  },
  ...
}
`

const GEMINI_SHORTS_TQH_CODE_SKELETON = `
=== CODE PYTHON — SHORTS FULL-FRAME ===
config.pixel_width = 1080
config.pixel_height = 1920
MARGIN = 0.18
SAFE_W = config.frame_width - 2 * MARGIN
LEFT_EDGE = LEFT * (config.frame_width / 2 - MARGIN)

def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h: fig.scale_to_fit_height(max_h)
    return fig

# Đề trên, hình dưới
problem_block.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT)
avail_h = config.frame_height/2 - problem_block.height - 0.35
fit_figure_full_width(figure, avail_h)
figure.next_to(problem_block, DOWN, buff=0.2).align_to(LEFT_EDGE, LEFT)

# Ẩn đề → hình trên (phóng to)
self.play(FadeOut(problem_block))
fit_figure_full_width(figure, config.frame_height * 0.52)
figure.to_edge(UP, buff=MARGIN).align_to(LEFT_EDGE, LEFT)

# Lời giải dưới hình
new_line.next_to(figure, DOWN, buff=0.15).align_to(LEFT_EDGE, LEFT)  # vn(size=28)
`

const GEMINI_ANTI_PATTERNS = `
=== LỖI GEMINI THƯỜNG GẶP — TUYỆT ĐỐI TRÁNH ===
1. Tex(...) → CẤM; chỉ MathTex(r"...")
2. Tiếng Việt trong MathTex → ô vuông □
3. shorts mà layout landscape (LEFT*2.8 + panel RIGHT) → SAI
4. Hình/chữ nhỏ giữa màn + viền đen dư → THIẾU scale_to_fit_width(SAFE_W)
5. move_to(DOWN*0.8) + scale_to_fit_height(3.6) — layout cũ, trống trên/dưới
6. shift(UP*2) không phóng to hình — lời giải lọt giữa khoảng trống
7. panel.scale(0.38), font≤24, MathTex.scale(0.9) — chữ quá nhỏ
8. Thiếu config.pixel_width=1080, pixel_height=1920 đầu file
9. problem_and_figure hiện lời giải → SAI
10. page_break FadeOut cả figure → SAI
11. Label("A") → vn("A", 26)
12. Dump cả lời giải một lúc
`

const GEMINI_ACTION_MAP = `
=== ÁNH XẠ actions → CODE (shorts full-frame) ===
fade_out_problem → FadeOut(problem_block)
shift_figure_up → fit_figure_full_width + figure.to_edge(UP).align_to(LEFT_EDGE, LEFT)
write_line → next_to(figure/solution_stack, DOWN).align_to(LEFT_EDGE, LEFT); font 28+
`

const GEMINI_SELF_CHECK = `
=== TỰ KIỂM TRA ===
□ config 1080×1920 + SAFE_W + LEFT_EDGE?
□ Đề trên / hình dưới (giai đoạn 1); hình trên / chữ dưới (lời giải)?
□ scale_to_fit_width(SAFE_W) — không viền đen hai bên?
□ Font ≥28, không scale(0.38)?
□ Không shift(UP*2) mù?
`

const GEMINI_CODE_FILE_HEADER = `
=== ĐẦU FILE PYTHON (shorts full-frame) ===
from manim import *
config.pixel_width = 1080
config.pixel_height = 1920
MARGIN = 0.18
SAFE_W = config.frame_width - 2 * MARGIN
LEFT_EDGE = LEFT * (config.frame_width / 2 - MARGIN)
MAX_LINES_PER_PAGE = 4

def vn(text, size=28, color=None):
    return Text(text, font="Arial", font_size=size,
                color=color or "#FFFFFF", disable_ligatures=True)

def fit_figure_full_width(fig, max_h):
    fig.scale_to_fit_width(SAFE_W)
    if fig.height > max_h: fig.scale_to_fit_height(max_h)
    return fig
`

function layoutRulesForFormat(videoFormat) {
  if (videoFormat === 'shorts') return SHORTS_TQH_LAYOUT_RULES
  return LAYOUT_SAFE_RULES
}

function buildGeminiProStoryboardPrompt(
  problem,
  solution,
  videoFormat = 'shorts',
  figureCtx = {},
) {
  const p = (problem || '').trim() || '(dán đề bài đầy đủ vào đây)'
  const s = (solution || '').trim() || '(dán lời giải từng bước vào đây)'
  const fmt = videoFormat === 'shorts'
    ? 'shorts 9:16 — TQH hình học (đề+hình → ẩn đề → lời giải từng dòng)'
    : 'landscape 16:9 — hình trái + chữ phải'

  const beatOrder = videoFormat === 'shorts'
    ? 'title → problem_and_figure → transition_hide_problem → solution_steps → page_break → conclusion'
    : 'title → problem → construction → solution_steps → conclusion → check_question'

  const figureBlock = buildFigureContextBlock({
    constructionOrder: figureCtx.constructionOrder,
    figureReferenceCode: figureCtx.figureReferenceCode,
    ggbCommands: figureCtx.ggbCommands,
    figureObjects: figureCtx.figureObjects,
    hasSavedImage: figureCtx.hasSavedImage,
  })

  return `Bạn là đạo diễn video Toán Manim CE (Math-To-Manim).
Nhiệm vụ BƯỚC 1: CHỈ viết KỊCH BẢN JSON — CHƯA viết code Python.

⚠️ MẶC ĐỊNH: video_format = "${videoFormat === 'shorts' ? 'shorts' : 'landscape'}"
${videoFormat === 'shorts' ? 'HÌNH HỌC → BẮT BUỘC luồng TQH shorts (đề+hình → ẩn đề → lời giải từng dòng + page_break).' : ''}

ĐỊNH DẠNG: ${fmt}

${layoutRulesForFormat(videoFormat)}
${videoFormat === 'shorts' ? GEMINI_SHORTS_TQH_JSON_GUIDE : ''}
${videoFormat === 'shorts' ? GEMINI_ACTION_MAP : ''}
${GEMINI_ANTI_PATTERNS}

BEAT_ORDER: ${beatOrder}
STYLE_VN: nền #0d1117; điểm #8b1a1a; cạnh #1e40af; tròn #3d6b2f; highlight #FFD700

${CHANNEL_STYLE_HINT}

${figureBlock ? `\n=== HÌNH GEOGEBRA ĐÃ LƯU (BẮT BUỘC BÁM) ===\n${figureBlock}\n` : ''}

Trả về ĐÚNG 1 JSON (không markdown) gồm:
- scene_name, title, video_format ("${videoFormat}")
- layout: { mode, max_lines_per_page (shorts=4), figure_initial, figure_after_transition }
- figure_objects (tọa độ x∈[-3.5,3.5], y∈[-2.5,2.5]) — BÁM manifest/figure_objects bên trên
- beats[]: phase, comment_vi, text_lines (shorts: 1 dòng/beat ở solution_steps),
  latex_lines, actions, indicate_targets, figure_targets
${videoFormat === 'shorts' ? '- BẮT BUỘC có beats: problem_and_figure, transition_hide_problem, solution_steps, page_break' : ''}
${figureCtx.constructionOrder?.length ? '- beat problem_and_figure: figure_targets THEO ĐÚNG THỨ TỰ DỰNG HÌNH ở trên' : ''}

OUTPUT: chỉ JSON. KHÔNG code Python.
${GEMINI_SELF_CHECK}

ĐỀ BÀI:
${p}

LỜI GIẢI:
${s}
`
}

function buildGeminiProCodePrompt(problem, solution, storyboard, mode = 'local_latex', videoFormat = 'shorts') {
  const p = (problem || '').trim() || '(dán đề bài)'
  const s = (solution || '').trim() || '(dán lời giải)'
  const sb = (storyboard || '').trim() || '(dán kịch bản JSON từ Bước 1 vào đây)'
  const local = mode === 'local_latex'

  const shortsCodeRules = videoFormat === 'shorts'
    ? `- SHORTS full-frame: đề trên/hình dưới → FadeOut đề → hình phóng to_edge(UP) → chữ dưới hình
- Bám GEMINI_SHORTS_TQH_CODE_SKELETON; tham khảo style_shorts_tqh_geometry.py
${GEMINI_CODE_FILE_HEADER}
${GEMINI_SHORTS_TQH_CODE_SKELETON}
${GEMINI_ACTION_MAP}
${GEMINI_ANTI_PATTERNS}`
    : ''

  const constraints = local
    ? `RÀNG BUỘC CODE (Local + LaTeX):
- Bám ĐÚNG kịch bản JSON — không đổi thứ tự beat trừ khi JSON ghi khác
- video_format trong JSON: ${videoFormat}
- Tiếng Việt: Text(..., font="Arial", disable_ligatures=True)
- Công thức: MathTex(r"...") — CẤM Tex() hoàn toàn
- latex_lines trong JSON → MathTex(r"..."); text_lines → Text/vn()
- class Scene; self.camera.background_color = "#0d1117"
${shortsCodeRules}
${MATH_LATEX_RULES}
${layoutRulesForFormat(videoFormat)}
`
    : `RÀNG BUỘC CODE (Render Free):
- Bám kịch bản JSON; chỉ Text/MarkupText, không MathTex
- video_format: ${videoFormat}
${shortsCodeRules}
${layoutRulesForFormat(videoFormat)}`

  return `Bạn là lập trình viên Manim CE.
Nhiệm vụ BƯỚC 2: chuyển KỊCH BẢN JSON thành 1 file Python (1 class Scene).

${constraints}

OUTPUT: DUY NHẤT khối \`\`\`python ... \`\`\`
${GEMINI_SELF_CHECK}

ĐỀ (tham khảo):
${p}

LỜI GIẢI (tham khảo):
${s}

KỊCH BẢN JSON (BẮT BUỘC — bám sát):
${sb}
`
}

function buildGeminiProRevisePrompt(problem, solution, storyboard, code, revisionNotes, mode = 'local_latex', videoFormat = 'shorts') {
  const notes = (revisionNotes || '').trim() || '(ghi thay đổi kịch bản: ví dụ "tiêu đề nhỏ hơn", "hình scale nhỏ lại", "bước 2 tách 2 dòng")'
  const sb = (storyboard || '').trim() || '(kịch bản hiện tại — dán JSON nếu có)'
  const py = (code || '').trim() || '(code Manim hiện tại — dán vào đây)'
  const local = mode === 'local_latex'

  return `Bạn là lập trình viên Manim CE.
Nhiệm vụ BƯỚC 3 (SỬA): người dùng muốn chỉnh KỊCH BẢN / bố cục → cập nhật code cho khớp.

QUY TẮC:
1. Đọc YÊU CẦU SỬA và áp dụng vào kịch bản + code
2. ${local ? 'Giữ font="Arial" + MathTex(r"..."); CẤM Tex()' : 'Giữ Text/MarkupText'}
3. ${local ? MATH_LATEX_RULES : ''}
4. ${layoutRulesForFormat(videoFormat)}
5. ${videoFormat === 'shorts' ? 'GIỮ luồng TQH: đề+hình → ẩn đề → figure lên → lời giải từng dòng → page_break mỗi 4 dòng. KHÔNG đổi sang landscape.' : 'Giữ layout landscape hình trái / panel phải.'}
6. Trả về TOÀN BỘ file Python đã sửa trong \`\`\`python ... \`\`\`
7. Nếu kịch bản đổi nhiều: trả thêm JSON kịch bản mới TRƯỚC khối python
${GEMINI_ANTI_PATTERNS}
${GEMINI_SELF_CHECK}

YÊU CẦU SỬA CỦA NGƯỜI DÙNG:
${notes}

KỊCH BẢN HIỆN TẠI:
${sb}

CODE MANIM HIỆN TẠI:
\`\`\`python
${py}
\`\`\`

ĐỀ / LỜI GIẢI (ngữ cảnh):
${(problem || '').trim()}
${(solution || '').trim()}
`
}

function buildGeminiProPrompt(problem, solution, mode = 'local_latex') {
  const p = (problem || '').trim() || '(dán đề bài đầy đủ vào đây)'
  const s = (solution || '').trim() || '(dán lời giải từng bước vào đây)'
  const local = mode === 'local_latex'

  const constraints = local
    ? `RÀNG BUỘC (máy LOCAL — Manim CE + MiKTeX/LaTeX):
- class kế thừa Scene (KHÔNG MovingCameraScene / ThreeDScene)
- CHIẾN LƯỢC HYBRID (bắt buộc):
  • Tiếng Việt: Text("...", font="Arial", font_size=28, disable_ligatures=True)
  • CÔNG THỨC ONLY trong MathTex(r"...") — CẤM Tex() hoàn toàn
  • KHÔNG nhét "Ta có", "Chứng minh", "tứ giác" vào MathTex (gây ô vuông □)
  • KHÔNG bọc $ trong MathTex — dùng MathTex(r"x^2") không phải r"$x^2$"
- Nhãn điểm hình học: Text("A", font_size=28, disable_ligatures=True)
- Biến đổi công thức: TransformMatchingTex(eq1, eq2) hoặc ReplacementTransform
- Bố cục: figure = VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
  text_panel = VGroup(...).arrange(DOWN, aligned_edge=LEFT, buff=0.2).scale(0.38).to_edge(RIGHT, buff=0.4)
- Màu STYLE_VN (NTSM): nền #0d1117; điểm #8b1a1a; cạnh #1e40af; tròn #3d6b2f; highlight #FFD700; kết luận #FF8C00
- BEAT_ORDER: title → problem → construction → solution_steps → conclusion → check_question
- self.wait(≥0.8) mỗi bước; kết luận có SurroundingRectangle vàng
- Comment tiếng Việt trước mỗi bước; không TODO/placeholder
- API: Dot, Line, DashedLine, Circle, Arc, Polygon, Angle, RightAngle, VGroup, SurroundingRectangle`
    : `RÀNG BUỘC (Render Free / Docker):
- class kế thừa Scene (KHÔNG MovingCameraScene / ThreeDScene / ZoomedScene)
- Text/MarkupText tiếng Việt, disable_ligatures=True
- CẤM: Tex, MathTex, SingleStringMathTex, Label("A"), Typst, MathTypst
- Nhãn điểm: Text("A", font_size=28) — không Label("A")
- Hình trái / chữ phải; VGroup(...).scale_to_fit_height(4.0).move_to(LEFT * 2.8)
- API: Dot, Line, Circle, Polygon, Angle, RightAngle, Create, Write, FadeIn, Indicate, ReplacementTransform, self.wait`

  return `Bạn là lập trình viên Manim Community Edition (ManimCE) — video bài giảng Toán Việt Nam.

⚠️ QUY TRÌNH 3 BƯỚC (BẮT BUỘC):
Bước 1 → Kịch bản JSON (dùng prompt "Copy Bước 1 — Kịch bản")
Bước 2 → Code Python (dùng prompt "Copy Bước 2 — Code" + dán kịch bản)
Bước 3 → Sửa nhẹ (dùng prompt "Copy Bước 3 — Sửa" + kịch bản + code + ghi chú)

KHÔNG nhảy thẳng sang code nếu chưa có kịch bản JSON.

${constraints}

${local ? MATH_LATEX_RULES : ''}

${LAYOUT_SAFE_RULES}

OUTPUT bước này (nếu chưa có kịch bản): yêu cầu người dùng làm Bước 1 trước.

ĐỀ BÀI:
${p}

LỜI GIẢI:
${s}
`
}

function buildCursorAgentBrief({
  problem,
  solution,
  guidance,
  videoFormat,
  storyboard,
  ggbCommands,
  hasGgbImage,
  validationMode,
  existingCode,
  compileLog,
  fixMode = false,
  constructionOrder,
  figureReferenceCode,
  figureObjects,
}) {
  const p = (problem || '').trim() || '(chưa có — nhập ở cột 1)'
  const s = (solution || '').trim() || '(chưa có — nhập ở cột 1)'
  const g = (guidance || '').trim()
  const sb = (storyboard || '').trim()
  const ggb = (ggbCommands || []).filter((l) => l && !String(l).trim().startsWith('#')).join('\n')
  const fmt = videoFormat === 'shorts' ? 'shorts (9:16)' : 'landscape (16:9, hình trái + chữ phải)'
  const local = validationMode === 'local_latex'
  const py = (existingCode || '').trim()
  const log = (compileLog || '').trim()

  const task = fixMode
    ? `NHIỆM VỤ: SỬA file Manim trong thư mục scenes/ (hoặc code giáo viên dán) theo lỗi Validate/biên dịch bên dưới.
Giữ nguyên từng bước lời giải và layout (hình trái, panel phải). Trả về TOÀN BỘ file .py đã sửa.`
    : `NHIỆM VỤ: VIẾT MỚI file Python Manim CE — đường dẫn gợi ý: scenes/BaiGiang.py (1 class Scene).
Giáo viên sẽ copy code vào Manim Video Studio → Validate → biên dịch video.`

  const latexBlock = local
    ? `${MATH_LATEX_RULES}`
    : '- Render Free: chỉ Text/MarkupText, không MathTex/Tex.'

  const fmtNote = videoFormat === 'shorts'
    ? 'SHORTS 9:16 TQH — bắt buộc luồng: problem_and_figure → transition_hide_problem → solution_steps (+ page_break mỗi 4 dòng)'
    : 'LANDSCAPE 16:9 — hình trái + panel phải'

  const figureCtxBlock = buildFigureContextBlock({
    constructionOrder,
    figureReferenceCode,
    ggbCommands,
    figureObjects,
    hasSavedImage: hasGgbImage,
  })

  let body = `Bạn là lập trình viên Manim CE trong repo manim-video-studio (Hướng A — Cursor Agent).

${task}

CHẾ ĐỘ: ${local ? 'Local + LaTeX (MiKTeX)' : 'Render Free'}
ĐỊNH DẠNG VIDEO: ${fmt} — ${fmtNote}

${latexBlock}
${videoFormat === 'shorts' ? SHORTS_TQH_LAYOUT_RULES : LAYOUT_SAFE_RULES}
${CHANNEL_STYLE_HINT}
${figureCtxBlock ? `\n${figureCtxBlock}\n` : ''}

THAM CHIẾU CODE MẪU TRONG REPO:
- backend/examples/style_shorts_tqh_geometry.py (shorts 9:16 hình học — MẶC ĐỊNH)
- backend/examples/style_landscape_muon_noi.py (landscape hình học)
- .cursor/rules/manim-video-lessons.mdc (rule bắt buộc)

ĐỀ BÀI:
${p}

LỜI GIẢI (từng bước — bám sát, không bỏ ý):
${s}
`

  if (g) {
    body += `\nHƯỚNG DẪN THÊM CỦA GIÁO VIÊN:\n${g}\n`
  }
  if (sb) {
    body += `\nKỊCH BẢN JSON (nếu có — bám beats):\n${sb}\n`
  }
  if (ggb) {
    body += `\nLỆNH GEOGEBRA (tham khảo tọa độ/hình):\n${ggb}\n`
  }
  if (hasGgbImage) {
    body += `\n(Giáo viên đã lưu ảnh hình GeoGebra trên Studio — nếu chat cho phép, hãy xin ảnh hoặc bám lệnh GeoGebra trên.)\n`
  }

  if (fixMode) {
    if (log) {
      body += `\n--- LỖI VALIDATE / BIÊN DỊCH ---\n${log.slice(-8000)}\n`
    }
    if (py && !py.startsWith('#')) {
      body += `\n--- CODE HIỆN TẠI ---\n\`\`\`python\n${py.slice(0, 24000)}\n\`\`\`\n`
    }
  } else if (py && !py.startsWith('#') && py.includes('class ')) {
    body += `\n(Có code nháp trong editor — có thể cải thiện thay vì viết từ đầu.)\n`
  }

  return body
}

function extractPythonFromPaste(raw) {
  const text = (raw || '').trim()
  if (!text) return ''
  const fence = text.match(/```(?:python)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  return text
}

function loadStoredApiKeys() {
  try {
    const multi = localStorage.getItem(KEY_STORAGE)
    if (multi) {
      const parsed = JSON.parse(multi)
      if (Array.isArray(parsed)) {
        return parsed.map((k) => String(k).trim()).filter(Boolean)
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
    }
  } catch {
    /* ignore */
  }
  const legacy = localStorage.getItem(KEY_STORAGE_LEGACY)
  if (legacy?.trim()) return [legacy.trim()]
  return []
}

function saveStoredApiKeys(keys) {
  const cleaned = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
  if (cleaned.length) {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(cleaned))
  } else {
    localStorage.removeItem(KEY_STORAGE)
  }
  localStorage.removeItem(KEY_STORAGE_LEGACY)
  return cleaned
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
      if (detail && typeof detail === 'object') {
        const msg = detail.message || 'Yêu cầu thất bại'
        const errs = detail.validation?.errors
        if (Array.isArray(errs) && errs.length) {
          detail = `${msg}\n- ${errs.join('\n- ')}`
        } else {
          detail = msg
        }
        const err = new Error(detail)
        err.payload = data.detail
        throw err
      }
    } catch (e) {
      if (e instanceof Error && e.payload) throw e
      /* ignore parse errors */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [templates, setTemplates] = useState([])
  const [qualities, setQualities] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [scene, setScene] = useState('')
  const [scenes, setScenes] = useState([])
  const [code, setCode] = useState('')
  const [quality, setQuality] = useState('480p15')
  const [backend, setBackend] = useState({ ready: false, message: 'Đang kết nối...' })
  const [validationMode, setValidationMode] = useState(loadValidationMode)
  const [compiling, setCompiling] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [log, setLog] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)

  // AI / GeoGebra
  const [problemText, setProblemText] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [imageName, setImageName] = useState('')
  const [generatingGgb, setGeneratingGgb] = useState(false)
  const [generatingManim, setGeneratingManim] = useState(false)
  const [generatingProblem, setGeneratingProblem] = useState(false)
  const [ggbReady, setGgbReady] = useState(false)
  const [manimReady, setManimReady] = useState(false)
  const [problemReady, setProblemReady] = useState(false)
  const [solutionText, setSolutionText] = useState('')
  const [solutionSteps, setSolutionSteps] = useState([])
  const [manimGuidance, setManimGuidance] = useState('')
  const [videoFormat, setVideoFormat] = useState('shorts')
  const [storyboardText, setStoryboardText] = useState('')
  const [storyboardReady, setStoryboardReady] = useState(false)
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false)
  const [revisePrompt, setRevisePrompt] = useState('')
  const [useLogForRevise, setUseLogForRevise] = useState(true)
  const [revisingManim, setRevisingManim] = useState(false)
  const [reviseNotes, setReviseNotes] = useState('')
  const [manimValidation, setManimValidation] = useState(null)
  const [repairingManim, setRepairingManim] = useState(false)
  const [repairRounds, setRepairRounds] = useState(2)
  const [proPaste, setProPaste] = useState('')
  const [proStoryboardPaste, setProStoryboardPaste] = useState('')
  const [proRevisionNotes, setProRevisionNotes] = useState('')
  const [proPromptStep, setProPromptStep] = useState('storyboard')
  const [proPromptMsg, setProPromptMsg] = useState('')
  const [showProPrompt, setShowProPrompt] = useState(false)
  const [showGeminiWorkflow, setShowGeminiWorkflow] = useState(false)
  const [cursorAgentMsg, setCursorAgentMsg] = useState('')
  const [showCursorBrief, setShowCursorBrief] = useState(false)
  const [savedGgbImage, setSavedGgbImage] = useState(null)
  const [figureManifest, setFigureManifest] = useState(null)
  const [constructionOrder, setConstructionOrder] = useState([])
  const [figureObjects, setFigureObjects] = useState([])
  const [figureReferenceCode, setFigureReferenceCode] = useState('')
  const [generatingFigureRef, setGeneratingFigureRef] = useState(false)
  const [figureRefReady, setFigureRefReady] = useState(false)
  const [savingGgb, setSavingGgb] = useState(false)
  const [ggbCommandsText, setGgbCommandsText] = useState(
    '# AI sẽ tạo lệnh GeoGebra tại đây\n# Đường phụ phải có SetVisible(..., false)',
  )
  const [ggbMode, setGgbMode] = useState('geometry')
  const [ggbRevision, setGgbRevision] = useState(0)
  const [aiNotes, setAiNotes] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [apiKeys, setApiKeys] = useState(() => loadStoredApiKeys())
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [draftKeys, setDraftKeys] = useState('')
  const [exportMsg, setExportMsg] = useState(null)
  const [exportPreview, setExportPreview] = useState(null)
  const [svgCodePreview, setSvgCodePreview] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [ggbFullscreen, setGgbFullscreen] = useState(false)
  const [sceneTimeline, setSceneTimeline] = useState([])
  const [layoutTemplateId, setLayoutTemplateId] = useState('shorts_tqh_fullframe')
  const [customTemplateName, setCustomTemplateName] = useState('')
  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [fixingCanvas, setFixingCanvas] = useState(false)
  const [canvasFixMsg, setCanvasFixMsg] = useState('')
  const [layoutEditMode, setLayoutEditMode] = useState(false)
  const [layoutSlots, setLayoutSlots] = useState(() => defaultLayoutSlots('shorts'))
  const [layoutBaseSlots, setLayoutBaseSlots] = useState(() => defaultLayoutSlots('shorts'))
  const [layoutDirty, setLayoutDirty] = useState(false)
  const [layoutMsg, setLayoutMsg] = useState('')

  // Lồng tiếng Edge TTS
  const [voiceScript, setVoiceScript] = useState('')
  const [voiceTitle, setVoiceTitle] = useState('')
  const [ttsVoices, setTtsVoices] = useState([])
  const [ttsVoice, setTtsVoice] = useState('vi-VN-HoaiMyNeural')
  const [ttsRate, setTtsRate] = useState('+0%')
  const [syncToNarration, setSyncToNarration] = useState(true)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [applyingVoice, setApplyingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [voiceSyncMsg, setVoiceSyncMsg] = useState(null)

  const pollRef = useRef(null)
  const parseTimer = useRef(null)
  const fileRef = useRef(null)
  const ggbRef = useRef(null)

  const ggbCommands = useMemo(
    () =>
      ggbCommandsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    [ggbCommandsText],
  )

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )

  const persistValidationMode = useCallback((mode) => {
    setValidationMode(mode)
    try {
      localStorage.setItem(VALIDATION_MODE_STORAGE, mode)
    } catch {
      /* ignore */
    }
  }, [])

  const effectiveValidationMode = useMemo(() => {
    if (validationMode === 'auto') {
      return backend.default_validation_mode || 'render_free'
    }
    return validationMode
  }, [validationMode, backend.default_validation_mode])

  const applyFigureManifest = useCallback((manifest) => {
    if (!manifest?.objects?.length) return
    const order = defaultConstructionOrder(manifest)
    setFigureManifest(manifest)
    setConstructionOrder(order)
    setFigureObjects(manifestToFigureObjects(manifest, order))
    setFigureReferenceCode(buildManimReferenceCode(manifest, order))
    setFigureRefReady(true)
  }, [])

  const updateConstructionOrder = useCallback(
    (nextOrder) => {
      if (!figureManifest?.objects?.length) return
      setConstructionOrder(nextOrder)
      setFigureObjects(manifestToFigureObjects(figureManifest, nextOrder))
      setFigureReferenceCode(buildManimReferenceCode(figureManifest, nextOrder))
      setFigureRefReady(true)
      setStoryboardReady(false)
      setManimReady(false)
    },
    [figureManifest],
  )

  const moveConstructionItem = useCallback(
    (index, direction) => {
      const next = [...constructionOrder]
      const j = index + direction
      if (j < 0 || j >= next.length) return
      ;[next[index], next[j]] = [next[j], next[index]]
      updateConstructionOrder(next)
    },
    [constructionOrder, updateConstructionOrder],
  )

  const constructionItems = useMemo(() => {
    if (!figureManifest?.objects?.length) return []
    const byId = Object.fromEntries(figureManifest.objects.map((o) => [o.id, o]))
    return constructionOrder
      .map((id) => byId[id])
      .filter(Boolean)
      .filter((o) => o.visible !== false)
  }, [figureManifest, constructionOrder])

  const layoutTemplates = useMemo(() => listLayoutTemplates(), [])

  useEffect(() => {
    const sb = parseStoryboardJson(storyboardText)
    if (sb?.beats?.length) {
      setSceneTimeline(beatsToTimeline(sb.beats))
    } else {
      setSceneTimeline([])
    }
  }, [storyboardText])

  useEffect(() => {
    const base = defaultLayoutSlots(videoFormat)
    setLayoutBaseSlots(base)
    const parsed = parseLayoutShiftsFromCode(code)
    if (Object.keys(parsed).length) {
      setLayoutSlots(applyShiftsToSlots(base, base, parsed, videoFormat))
    } else {
      setLayoutSlots(base)
    }
    setLayoutDirty(false)
  }, [videoFormat, code])

  const handleLayoutSlotsChange = useCallback((next) => {
    setLayoutSlots(next)
    setLayoutDirty(true)
  }, [])

  const handleSaveLayout = useCallback(() => {
    const shifts = shiftsFromSlots(layoutSlots, layoutBaseSlots, videoFormat)
    const nextCode = injectLayoutShiftsIntoCode(code, shifts)
    setCode(nextCode)
    setLayoutDirty(false)
    setLayoutMsg(
      Object.keys(shifts).length
        ? `Đã lưu bố cục (${Object.keys(shifts).join(', ')}) — bấm Preview lại rồi Biên dịch video.`
        : 'Đã xóa offset kéo thả — bố cục về mặc định.',
    )
    setManimReady(true)
  }, [layoutSlots, layoutBaseSlots, videoFormat, code])

  const syncTimelineToStoryboard = useCallback(
    (nextTimeline) => {
      const sb = parseStoryboardJson(storyboardText)
      if (!sb?.beats) return
      const updated = applyTimelineToStoryboard(sb, nextTimeline)
      setStoryboardText(JSON.stringify(updated, null, 2))
      setSceneTimeline(nextTimeline)
      setManimReady(false)
    },
    [storyboardText],
  )

  const handleTimelineMove = useCallback(
    (index, direction) => {
      syncTimelineToStoryboard(moveTimelineItem(sceneTimeline, index, direction))
    },
    [sceneTimeline, syncTimelineToStoryboard],
  )

  const handleTimelineToggle = useCallback(
    (index) => {
      syncTimelineToStoryboard(toggleTimelineVisibility(sceneTimeline, index))
    },
    [sceneTimeline, syncTimelineToStoryboard],
  )

  const handleApplyLayoutTemplate = useCallback(
    (templateId) => {
      const tpl = getLayoutTemplate(templateId)
      if (!tpl) return
      setLayoutTemplateId(templateId)
      if (tpl.videoFormat) setVideoFormat(tpl.videoFormat)
      if (tpl.guidance) setManimGuidance(tpl.guidance)
      const sb = parseStoryboardJson(storyboardText)
      if (sb) {
        const { storyboard: nextSb } = applyLayoutTemplateToStoryboard(sb, tpl)
        setStoryboardText(JSON.stringify(nextSb, null, 2))
        setStoryboardReady(true)
      }
      setManimReady(false)
    },
    [storyboardText],
  )

  const handleSaveCustomTemplate = useCallback(() => {
    const sb = parseStoryboardJson(storyboardText)
    const entry = saveCustomLayoutTemplate({
      name: customTemplateName,
      videoFormat,
      guidance: manimGuidance,
      layout: sb?.layout || {},
    })
    if (entry) {
      setCustomTemplateName('')
      setCanvasFixMsg(`Đã lưu khung mẫu «${entry.name}»`)
    }
  }, [customTemplateName, videoFormat, manimGuidance, storyboardText])

  const handleApplyGraphPreset = useCallback((presetId) => {
    const preset = getGraphPreset(presetId)
    if (!preset) return
    setGgbMode('graphing')
    setGgbCommandsText(preset.commands)
    setGgbRevision((r) => r + 1)
    setManimReady(false)
    setStoryboardReady(false)
  }, [])

  useEffect(() => {
    if (!ggbFullscreen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setGgbFullscreen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    const resizeTimer = setTimeout(() => window.dispatchEvent(new Event('resize')), 200)
    return () => {
      clearTimeout(resizeTimer)
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [ggbFullscreen])

  const ceChecklist = useMemo(
    () =>
      effectiveValidationMode === 'local_latex'
        ? CE_CHECKLIST_LOCAL
        : CE_CHECKLIST_RENDER_FREE,
    [effectiveValidationMode],
  )

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const data = await api('/api/health')
        if (!cancelled) {
          setBackend(data)
          if (
            validationMode === 'auto' &&
            data.default_validation_mode === 'local_latex'
          ) {
            persistValidationMode('local_latex')
          }
        }
      } catch {
        if (!cancelled) setBackend({ ready: false, message: 'Backend không phản hồi' })
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [validationMode, persistValidationMode])

  useEffect(() => {
    ;(async () => {
      try {
        const [tpls, quals, voices] = await Promise.all([
          api('/api/templates'),
          api('/api/qualities'),
          api('/api/tts-voices').catch(() => []),
        ])
        setTemplates(tpls)
        setQualities(quals)
        if (Array.isArray(voices) && voices.length) {
          setTtsVoices(voices)
          setTtsVoice(voices[0].id)
        }
        if (tpls.length) {
          const first = tpls[0]
          setTemplateId(first.id)
          setCode(first.code)
          setScenes(first.scenes)
          setScene(first.default_scene)
        }
        if (quals.length) setQuality(quals[0].id)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  const applyTemplate = (id) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setCode(tpl.code)
    setScenes(tpl.scenes)
    setScene(tpl.default_scene)
    setManimReady(true)
    setError(null)
  }

  const handleCodeChange = useCallback((value) => {
    const next = value ?? ''
    setCode(next)
    clearTimeout(parseTimer.current)
    parseTimer.current = setTimeout(async () => {
      try {
        const data = await api('/api/parse-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: next }),
        })
        if (data.scenes?.length) {
          setScenes(data.scenes)
          setScene((prev) => (data.scenes.includes(prev) ? prev : data.scenes[0]))
        }
      } catch {
        /* ignore */
      }
    }, 500)
  }, [])

  useEffect(() => () => clearTimeout(parseTimer.current), [])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const pollJob = (id) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const job = await api(`/api/jobs/${id}`)
        setLog(job.log || '')
        if (job.status === 'done') {
          stopPolling()
          setCompiling(false)
          setVideoUrl(`${API_BASE}/api/video/${id}?t=${Date.now()}`)
        } else if (job.status === 'error') {
          stopPolling()
          setCompiling(false)
          setShowLog(true)
          setError('Biên dịch thất bại. Xem nhật ký để biết chi tiết.')
        }
      } catch (err) {
        stopPolling()
        setCompiling(false)
        setError(err.message)
      }
    }, 1500)
  }

  useEffect(() => () => stopPolling(), [])

  const handleCompile = async () => {
    if (!code.trim() || !scene || compiling) return
    setError(null)
    setCompiling(true)
    setLog('Đang gửi yêu cầu biên dịch...\n')
    setVideoUrl(null)
    setAudioUrl(null)
    try {
      const res = await api('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          scene,
          quality,
          validate_first: true,
          validation_mode: effectiveValidationMode,
        }),
      })
      setJobId(res.job_id)
      setLog((prev) => prev + `Job ${res.job_id} đã bắt đầu.\n`)
      pollJob(res.job_id)
    } catch (err) {
      setCompiling(false)
      if (err.payload?.validation) {
        setManimValidation(err.payload.validation)
        setShowLog(true)
        setLog(
          (err.payload.validation.errors || [])
            .map((e) => `VALIDATE ERROR: ${e}`)
            .concat((err.payload.validation.warnings || []).map((w) => `VALIDATE WARN: ${w}`))
            .join('\n') + '\n',
        )
      }
      setError(err.message)
    }
  }

  const handlePreviewFrame = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để preview.')
      return
    }
    if (!scene) {
      setError('Chưa chọn tên Scene.')
      return
    }
    setPreviewing(true)
    setError(null)
    try {
      const data = await api('/api/preview-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          scene,
          validate_first: true,
          validation_mode: effectiveValidationMode,
        }),
      })
      setPreviewImageUrl(`${API_BASE}${data.image_url}?t=${Date.now()}`)
      if (data.log) setLog((prev) => `${prev}\n--- PREVIEW ---\n${data.log.slice(-4000)}`)
    } catch (err) {
      if (err.payload?.validation) {
        setManimValidation(err.payload.validation)
      }
      if (err.payload?.log) {
        setLog((prev) => `${prev}\n--- PREVIEW LỖI ---\n${err.payload.log.slice(-6000)}`)
        setShowLog(true)
      }
      setError(err.message || 'Preview thất bại')
    } finally {
      setPreviewing(false)
    }
  }

  const handleFixCanvasFromError = async () => {
    const validationLog = (manimValidation?.errors || [])
      .map((e) => `VALIDATE: ${e}`)
      .join('\n')
    const errorLog = [validationLog, useLogForRevise ? log : '', revisePrompt]
      .filter(Boolean)
      .join('\n')
      .trim()
    if (!errorLog) {
      setError('Chưa có lỗi — hãy Validate hoặc biên dịch thất bại trước, hoặc ghi mô tả lỗi.')
      return
    }
    if (!requireApiKey()) return

    let storyboard
    try {
      storyboard = storyboardText.trim() ? JSON.parse(storyboardText) : null
    } catch {
      storyboard = null
    }

    setFixingCanvas(true)
    setError(null)
    setCanvasFixMsg('')
    try {
      const data = await api('/api/fix-canvas-from-error', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          error_log: errorLog,
          revision_prompt: revisePrompt.trim(),
          problem_text: problemText,
          solution_text: solutionText,
          storyboard,
          geogebra_commands: ggbCommands,
          figure_reference_code: figureReferenceCode,
          construction_order: constructionOrder,
          manim_code: code,
        }),
      })
      if (data.geogebra_commands?.length) {
        setGgbCommandsText(data.geogebra_commands.join('\n'))
        setGgbRevision((r) => r + 1)
      }
      if (data.storyboard) {
        setStoryboardText(JSON.stringify(data.storyboard, null, 2))
        setStoryboardReady(true)
      }
      if (data.figure_reference_code) {
        setFigureReferenceCode(data.figure_reference_code)
        setFigureRefReady(true)
      }
      if (data.construction_order?.length) {
        updateConstructionOrder(data.construction_order)
      }
      setCanvasFixMsg(
        data.notes || 'Đã gợi ý sửa GeoGebra / kịch bản — kiểm tra cột 2 và GeoGebra phía trên.',
      )
      setManimReady(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setFixingCanvas(false)
    }
  }

  const handleDownload = () => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/video/${jobId}/download`
    a.download = `${scene || 'manim'}.mp4`
    a.click()
  }

  const handleGenerateScript = async () => {
    if (!code.trim()) {
      setError('Chưa có mã Manim để viết lời thoại.')
      return
    }
    if (!requireApiKey()) return
    setGeneratingScript(true)
    setError(null)
    try {
      const data = await api('/api/generate-script', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          manim_code: code,
          scene_name: scene,
        }),
      })
      setVoiceScript(data.script || '')
      setVoiceTitle(data.title || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingScript(false)
    }
  }

  const handleApplyVoiceover = async () => {
    if (!jobId || !videoUrl) {
      setError('Hãy tạo video Manim trước, rồi mới lồng tiếng.')
      return
    }
    if (!voiceScript.trim()) {
      setError('Nhập hoặc tạo lời thoại trước.')
      return
    }
    setApplyingVoice(true)
    setError(null)
    setVoiceSyncMsg(null)
    try {
      const data = await api('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          script: voiceScript,
          voice: ttsVoice,
          rate: ttsRate,
          sync_to_narration: syncToNarration,
        }),
      })
      const bust = Date.now()
      setVideoUrl(`${API_BASE}${data.video_url}?t=${bust}`)
      if (data.audio_url) {
        setAudioUrl(`${API_BASE}${data.audio_url}?t=${bust}`)
      }
      setVoiceSyncMsg(data.sync_note || data.message || 'Đã lồng tiếng')
    } catch (err) {
      setError(err.message)
    } finally {
      setApplyingVoice(false)
    }
  }

  const onPickImage = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Chỉ nhận file ảnh (PNG/JPG/WEBP).')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setImageDataUrl(dataUrl)
    setImageName(file.name)
  }

  const saveApiKeys = () => {
    const list = draftKeys
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter(Boolean)
    const cleaned = saveStoredApiKeys(list)
    setApiKeys(cleaned)
    setShowKeyModal(false)
  }

  const requireApiKey = () => {
    if (apiKeys.length || backend.gemini_configured) return true
    setDraftKeys(apiKeys.join('\n'))
    setShowKeyModal(true)
    setError('Cần ít nhất 1 Gemini API key (nút API KEY góc trên).')
    return false
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(apiKeys.length ? { 'X-Gemini-Api-Key': apiKeys.join('\n') } : {}),
  })

  const handleGenerateProblemSolution = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Nhập gợi ý đề hoặc tải ảnh đề trước.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingProblem(true)
    setError(null)
    setProblemReady(false)
    setGgbReady(false)
    setManimReady(false)
    try {
      const data = await api('/api/generate-problem-solution', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          image_base64: imageDataUrl,
          mime_type: imageDataUrl?.startsWith('data:')
            ? imageDataUrl.slice(5, imageDataUrl.indexOf(';'))
            : 'image/png',
        }),
      })
      setAiTitle(data.title || '')
      setAiNotes(data.notes || '')
      setProblemText(data.problem_text || '')
      setSolutionText(data.solution_text || '')
      setSolutionSteps(Array.isArray(data.solution_steps) ? data.solution_steps : [])
      setProblemReady(true)
    } catch (err) {
      setError(err.message)
      setProblemReady(false)
    } finally {
      setGeneratingProblem(false)
    }
  }

  const handleUseManualProblemSolution = () => {
    const problem = problemText.trim()
    const solution = solutionText.trim()
    if (!problem) {
      setError('Hãy nhập đề bài vào ô ĐỀ BÀI trước.')
      return
    }
    if (!solution) {
      setError('Hãy nhập lời giải vào ô LỜI GIẢI trước.')
      return
    }
    setError(null)
    setSolutionSteps(
      solution
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    setProblemReady(true)
    setAiTitle((t) => t || 'Đề + lời giải thủ công')
    setAiNotes('Đã xác nhận đề và lời giải nhập tay — không cần AI ở bước này.')
    setGgbReady(false)
    setManimReady(false)
    setStoryboardReady(false)
  }

  const handleGenerateGeogebra = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Cần đề bài (hoặc ảnh) trước khi tạo GeoGebra.')
      return
    }
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Cần đủ đề bài + lời giải. Nhập tay rồi bấm «Dùng đề + lời giải thủ công», hoặc dùng AI.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingGgb(true)
    setError(null)
    setManimReady(false)
    try {
      const data = await api('/api/generate-geogebra', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          solution_text: solutionText,
          image_base64: imageDataUrl,
          mime_type: imageDataUrl?.startsWith('data:')
            ? imageDataUrl.slice(5, imageDataUrl.indexOf(';'))
            : 'image/png',
        }),
      })

      setAiTitle(data.title || aiTitle || '')
      if (data.notes) setAiNotes(data.notes)
      setGgbMode(data.geogebra_mode || 'geometry')
      setGgbCommandsText(sanitizeGgbCommands((data.geogebra_commands || []).join('\n')))
      setGgbRevision((n) => n + 1)
      setGgbReady(true)
      setProblemReady(true)
      setSavedGgbImage(null)
      setFigureManifest(null)
      setConstructionOrder([])
      setFigureObjects([])
      setFigureReferenceCode('')
      setFigureRefReady(false)
      setVideoUrl(null)
      setCode('# Chỉnh xong hình GeoGebra, lưu hình, rồi tạo Manim')
      setScenes([])
      setScene('')
    } catch (err) {
      setError(err.message)
      setGgbReady(false)
    } finally {
      setGeneratingGgb(false)
    }
  }

  const handleSaveGgbFigure = async () => {
    setExportMsg(null)
    setError(null)
    setSavingGgb(true)
    try {
      if (!ggbRef.current?.saveSnapshot) {
        setError('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const snap = await ggbRef.current.saveSnapshot(`geogebra-saved-${Date.now()}.png`)
      const cmds = (snap.commands || []).filter(Boolean)
      if (cmds.length) {
        setGgbCommandsText(sanitizeGgbCommands(cmds.join('\n')))
      }
      setSavedGgbImage(snap.dataUrl)
      if (ggbRef.current?.exportFigureManifest) {
        const manifest = ggbRef.current.exportFigureManifest()
        applyFigureManifest(manifest)
      }
      setManimReady(false)
      setStoryboardReady(false)
      setExportMsg('Đã lưu hình — kiểm tra thứ tự dựng hình, rồi xuất mã tọa độ / tạo kịch bản')
    } catch (err) {
      setError(err.message || 'Lưu hình thất bại')
    } finally {
      setSavingGgb(false)
    }
  }

  const handleRefreshFigureReference = () => {
    if (!figureManifest?.objects?.length) {
      setError('Chưa có manifest hình — hãy Lưu hình GeoGebra trước.')
      return
    }
    setError(null)
    updateConstructionOrder(constructionOrder.length ? constructionOrder : defaultConstructionOrder(figureManifest))
    setExportMsg('Đã cập nhật mã tọa độ từ hình hiện tại')
  }

  const handleAiRefineFigureReference = async () => {
    if (!savedGgbImage) {
      setError('Hãy Lưu hình GeoGebra trước khi dùng AI tinh chỉnh tọa độ.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingFigureRef(true)
    setError(null)
    try {
      const data = await api('/api/export-figure-reference', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          solution_text: solutionText,
          geogebra_commands: ggbCommands,
          construction_order: constructionOrder,
          figure_manifest: figureManifest,
          figure_reference_code: figureReferenceCode,
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
        }),
      })
      if (data.figure_reference_code) setFigureReferenceCode(data.figure_reference_code)
      if (data.figure_objects?.length) setFigureObjects(data.figure_objects)
      if (data.construction_order?.length) setConstructionOrder(data.construction_order)
      setFigureRefReady(true)
      setStoryboardReady(false)
      setManimReady(false)
      if (data.notes) setAiNotes(data.notes)
      setExportMsg('AI đã tinh chỉnh mã tọa độ — kiểm tra rồi tạo kịch bản')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingFigureRef(false)
    }
  }

  const handleGenerateStoryboard = async () => {
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Cần đề bài + lời giải ở cột 1 trước khi tạo kịch bản.')
      return
    }
    if (!ggbCommands.length && !savedGgbImage) {
      setError('Chưa có hình GeoGebra. Hãy sinh hình, chỉnh, rồi bấm Lưu hình.')
      return
    }
    if (!savedGgbImage) {
      setError('Hãy Lưu hình đã chỉnh trước khi tạo kịch bản video.')
      return
    }
    if (!figureRefReady && !figureReferenceCode.trim()) {
      setError('Hãy xuất mã tọa độ (tự động sau Lưu hình) hoặc bấm «Cập nhật mã tọa độ» trước.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingStoryboard(true)
    setError(null)
    setStoryboardReady(false)
    setManimReady(false)
    try {
      const data = await api('/api/generate-storyboard', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          solution_text: solutionText,
          solution_steps: solutionSteps,
          user_guidance: manimGuidance,
          geogebra_commands: ggbCommands,
          geogebra_mode: ggbMode,
          video_format: videoFormat,
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
          construction_order: constructionOrder,
          figure_manifest: figureManifest,
          figure_reference_code: figureReferenceCode,
          figure_objects: figureObjects,
        }),
      })
      const sb = data.storyboard || data
      setStoryboardText(JSON.stringify(sb, null, 2))
      setStoryboardReady(true)
      if (data.notes) setAiNotes(data.notes)
      if (data.title) setAiTitle(data.title)
    } catch (err) {
      setError(err.message)
      setStoryboardReady(false)
    } finally {
      setGeneratingStoryboard(false)
    }
  }

  const handleGenerateManim = async () => {
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Manim cần đề bài và lời giải. Hãy tạo/điền ở cột 1 trước.')
      return
    }
    if (!storyboardText.trim()) {
      setError('Hãy tạo kịch bản video trước, rồi mới tạo code Manim.')
      return
    }
    let storyboard
    try {
      storyboard = JSON.parse(storyboardText)
    } catch {
      setError('Kịch bản JSON không hợp lệ — hãy kiểm tra lại hoặc tạo lại kịch bản.')
      return
    }
    storyboard = storyboardWithVisibleBeats(storyboard)
    if (!requireApiKey()) return

    setGeneratingManim(true)
    setError(null)
    try {
      const data = await api('/api/generate-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          solution_text: solutionText,
          solution_steps: solutionSteps,
          user_guidance: manimGuidance,
          geogebra_commands: ggbCommands,
          geogebra_mode: ggbMode,
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
          storyboard,
        }),
      })

      setCode(data.manim_code || '')
      setScenes([data.scene_name])
      setScene(data.scene_name)
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      setReviseNotes('')
      if (data.validation) setManimValidation(data.validation)
      if (data.storyboard) {
        setStoryboardText(JSON.stringify(data.storyboard, null, 2))
        setStoryboardReady(true)
      }
      if (data.notes) setAiNotes(data.notes)
      if (data.validation && !data.validation.ok) {
        setError('Mã Manim đã tạo nhưng chưa qua validate — dùng Repair loop hoặc sửa tay.')
      }
    } catch (err) {
      setError(err.message)
      setManimReady(false)
    } finally {
      setGeneratingManim(false)
    }
  }

  const handleValidateManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để kiểm tra.')
      return
    }
    setError(null)
    try {
      const data = await api('/api/validate-manim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manim_code: code, validation_mode: effectiveValidationMode }),
      })
      setManimValidation(data)
      if (data.scene_names?.length) {
        setScenes(data.scene_names)
        if (!data.scene_names.includes(scene)) setScene(data.scene_names[0])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const geminiProStoryboardPrompt = useMemo(
    () =>
      buildGeminiProStoryboardPrompt(problemText, solutionText, videoFormat, {
        constructionOrder,
        figureReferenceCode,
        ggbCommands,
        figureObjects,
        hasSavedImage: Boolean(savedGgbImage),
      }),
    [
      problemText,
      solutionText,
      videoFormat,
      constructionOrder,
      figureReferenceCode,
      ggbCommands,
      figureObjects,
      savedGgbImage,
    ],
  )

  const geminiProCodePrompt = useMemo(
    () =>
      buildGeminiProCodePrompt(
        problemText,
        solutionText,
        proStoryboardPaste || storyboardText,
        effectiveValidationMode,
        videoFormat,
      ),
    [
      problemText,
      solutionText,
      proStoryboardPaste,
      storyboardText,
      effectiveValidationMode,
      videoFormat,
    ],
  )

  const geminiProRevisePrompt = useMemo(
    () =>
      buildGeminiProRevisePrompt(
        problemText,
        solutionText,
        proStoryboardPaste || storyboardText,
        proPaste || code,
        proRevisionNotes,
        effectiveValidationMode,
        videoFormat,
      ),
    [
      problemText,
      solutionText,
      proStoryboardPaste,
      storyboardText,
      proPaste,
      code,
      proRevisionNotes,
      effectiveValidationMode,
      videoFormat,
    ],
  )

  const geminiProPrompt = useMemo(() => {
    if (proPromptStep === 'storyboard') return geminiProStoryboardPrompt
    if (proPromptStep === 'revise') return geminiProRevisePrompt
    return geminiProCodePrompt
  }, [
    proPromptStep,
    geminiProStoryboardPrompt,
    geminiProCodePrompt,
    geminiProRevisePrompt,
  ])

  const cursorAgentBrief = useMemo(
    () =>
      buildCursorAgentBrief({
        problem: problemText,
        solution: solutionText,
        guidance: manimGuidance,
        videoFormat,
        storyboard: proStoryboardPaste || storyboardText,
        ggbCommands,
        hasGgbImage: Boolean(savedGgbImage),
        validationMode: effectiveValidationMode,
        existingCode: code,
        compileLog: log,
        fixMode: false,
        constructionOrder,
        figureReferenceCode,
        figureObjects,
      }),
    [
      problemText,
      solutionText,
      manimGuidance,
      videoFormat,
      proStoryboardPaste,
      storyboardText,
      ggbCommands,
      savedGgbImage,
      effectiveValidationMode,
      code,
      log,
      constructionOrder,
      figureReferenceCode,
      figureObjects,
    ],
  )

  const cursorAgentFixBrief = useMemo(
    () =>
      buildCursorAgentBrief({
        problem: problemText,
        solution: solutionText,
        guidance: manimGuidance,
        videoFormat,
        storyboard: proStoryboardPaste || storyboardText,
        ggbCommands,
        hasGgbImage: Boolean(savedGgbImage),
        validationMode: effectiveValidationMode,
        existingCode: code,
        compileLog: log,
        fixMode: true,
        constructionOrder,
        figureReferenceCode,
        figureObjects,
      }),
    [
      problemText,
      solutionText,
      manimGuidance,
      videoFormat,
      proStoryboardPaste,
      storyboardText,
      ggbCommands,
      savedGgbImage,
      effectiveValidationMode,
      code,
      log,
      constructionOrder,
      figureReferenceCode,
      figureObjects,
    ],
  )

  const copyProPrompt = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text)
      setProPromptMsg(msg)
    } catch {
      setProPromptMsg('Không copy được — chọn toàn bộ prompt và Ctrl+C.')
    }
  }

  const handleCopyGeminiProStoryboard = () => {
    setProPromptStep('storyboard')
    copyProPrompt(
      geminiProStoryboardPrompt,
      'Đã copy Bước 1 (kịch bản) — dán vào Gemini Pro, nhận JSON rồi dán vào ô Kịch bản bên dưới.',
    )
  }

  const handleCopyGeminiProCode = () => {
    setProPromptStep('code')
    copyProPrompt(
      geminiProCodePrompt,
      'Đã copy Bước 2 (code) — cần đã có kịch bản JSON trong ô Kịch bản.',
    )
  }

  const handleCopyGeminiProRevise = () => {
    setProPromptStep('revise')
    copyProPrompt(
      geminiProRevisePrompt,
      'Đã copy Bước 3 (sửa) — gửi lại Gemini Pro, dán code mới vào ô Code.',
    )
  }

  const handleCopyGeminiProPrompt = handleCopyGeminiProCode

  const handleCopyCursorAgentBrief = async () => {
    try {
      await navigator.clipboard.writeText(cursorAgentBrief)
      setCursorAgentMsg(
        'Đã copy brief — mở Cursor (cùng thư mục repo), dán vào chat Agent và yêu cầu viết scenes/TenBai.py',
      )
      setProPromptMsg('')
    } catch {
      setCursorAgentMsg('Không copy được — bấm “Xem brief” rồi Ctrl+A, Ctrl+C.')
    }
  }

  const handleCopyCursorAgentFixBrief = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có code Manim để gửi Cursor sửa.')
      return
    }
    setError(null)
    try {
      await navigator.clipboard.writeText(cursorAgentFixBrief)
      setCursorAgentMsg(
        'Đã copy brief SỬA LỖI — dán vào Cursor Agent kèm @mention file scenes/ hoặc code hiện tại.',
      )
    } catch {
      setCursorAgentMsg('Không copy được — mở “Xem brief” và copy thủ công.')
    }
  }

  const handleApplyProStoryboard = () => {
    const raw = (proStoryboardPaste || '').trim()
    if (!raw) {
      setError('Chưa có kịch bản JSON để áp dụng.')
      return
    }
    setError(null)
    setStoryboardText(raw)
    setStoryboardReady(true)
    setManimReady(false)
    setProPromptMsg('Đã lưu kịch bản — bấm Copy Bước 2 để tạo code Manim.')
  }

  const handleApplyProPaste = async () => {
    const extracted = extractPythonFromPaste(proPaste)
    if (!extracted || !extracted.includes('class ')) {
      setError('Dán code Python Manim (hoặc khối ```python). Cần có class Scene.')
      return
    }
    setError(null)
    setCode(extracted)
    setTemplateId('')
    setManimReady(true)
    setVideoUrl(null)
    setProPromptMsg('Đã đưa code vào editor — bấm Validate CE rồi Biên dịch.')
    try {
      const data = await api('/api/validate-manim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manim_code: extracted, validation_mode: effectiveValidationMode }),
      })
      setManimValidation(data)
      if (data.scene_names?.length) {
        setScenes(data.scene_names)
        setScene(data.scene_names[0])
      } else {
        const parsed = await api('/api/parse-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: extracted }),
        })
        if (parsed.scenes?.length) {
          setScenes(parsed.scenes)
          setScene(parsed.scenes[0])
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReviseManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để chỉnh sửa.')
      return
    }
    const prompt = revisePrompt.trim()
    const hasLog = Boolean(log?.trim()) && useLogForRevise
    if (!prompt && !hasLog) {
      setError('Nhập yêu cầu chỉnh sửa, hoặc bật dùng nhật ký lỗi sau khi biên dịch thất bại.')
      return
    }
    if (!requireApiKey()) return

    setRevisingManim(true)
    setError(null)
    setReviseNotes('')
    try {
      const data = await api('/api/revise-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          manim_code: code,
          revision_prompt: prompt,
          compile_log: useLogForRevise ? log : '',
          include_compile_log: useLogForRevise,
          problem_text: problemText,
          solution_text: solutionText,
        }),
      })
      setCode(data.manim_code || code)
      if (data.scene_name) {
        setScenes([data.scene_name])
        setScene(data.scene_name)
      }
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      if (data.validation) setManimValidation(data.validation)
      setReviseNotes(data.notes || 'Đã cập nhật mã Manim')
    } catch (err) {
      setError(err.message)
    } finally {
      setRevisingManim(false)
    }
  }

  const handleRepairManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để repair.')
      return
    }
    if (!requireApiKey()) return

    setRepairingManim(true)
    setError(null)
    setReviseNotes('')
    try {
      const data = await api('/api/repair-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          manim_code: code,
          revision_prompt: revisePrompt.trim(),
          compile_log: useLogForRevise ? log : '',
          include_compile_log: useLogForRevise,
          problem_text: problemText,
          solution_text: solutionText,
          max_rounds: repairRounds,
        }),
      })
      setCode(data.manim_code || code)
      if (data.scene_name) {
        setScenes([data.scene_name])
        setScene(data.scene_name)
      }
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      if (data.validation) setManimValidation(data.validation)
      const n = (data.rounds || []).length
      const ok = data.validation?.ok
      setReviseNotes(
        data.notes ||
          (ok
            ? `Repair xong sau ${n} vòng — validate OK`
            : `Đã thử ${n} vòng repair — vẫn còn lỗi validate`),
      )
      if (!ok) {
        setError('Repair chưa đủ — xem validate / nhật ký, sửa tay hoặc chạy lại.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRepairingManim(false)
    }
  }

  const applyGgbToPreview = () => {
    const cleaned = sanitizeGgbCommands(ggbCommandsText)
    if (cleaned !== ggbCommandsText) setGgbCommandsText(cleaned)
    setGgbRevision((n) => n + 1)
    setSavedGgbImage(null)
    setFigureManifest(null)
    setConstructionOrder([])
    setFigureObjects([])
    setFigureReferenceCode('')
    setFigureRefReady(false)
    setStoryboardReady(false)
    setManimReady(false)
  }

  const isIos = () =>
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  const shareOrShowExport = async (payload) => {
    // iPad/iOS: ưu tiên Share Sheet (Files / Ảnh / AirDrop)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([payload.blob], payload.filename, {
          type: payload.mime,
        })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: payload.filename,
          })
          setExportMsg('Đã mở Share — chọn Lưu vào Files / Ảnh')
          return
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          setExportMsg('Đã hủy chia sẻ')
          return
        }
        // fall through to preview modal
      }
    }

    // Hiện modal xem trước — trên iPad: giữ vào ảnh để lưu
    setExportPreview(payload)
    setExportMsg(
      isIos()
        ? 'Giữ vào ảnh → Lưu ảnh / hoặc bấm Chia sẻ'
        : 'Xem trước — bấm Tải về hoặc Chia sẻ',
    )
  }

  const handleExportPng = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.capturePNG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.capturePNG(`geogebra-${Date.now()}.png`)
      await shareOrShowExport(payload)
    } catch (err) {
      setExportMsg(err.message || 'Xuất PNG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const handleExportSvg = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.captureSVG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.captureSVG(`geogebra-${Date.now()}.svg`)
      await shareOrShowExport(payload)
    } catch (err) {
      setExportMsg(err.message || 'Xuất SVG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const handleExportSvgCode = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.captureSVG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.captureSVG(`geogebra-${Date.now()}.svg`)
      const text = String(payload?.text || '').trim()
      if (!text) throw new Error('Không lấy được mã SVG')
      setSvgCodePreview({
        filename: payload.filename,
        text,
        dataUrl: payload.dataUrl,
        blob: payload.blob,
        mime: payload.mime,
      })
      setExportMsg('Đã xuất mã SVG — có thể sao chép hoặc tải file')
    } catch (err) {
      setExportMsg(err.message || 'Xuất mã SVG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const copySvgCode = async () => {
    if (!svgCodePreview?.text) return
    try {
      await navigator.clipboard.writeText(svgCodePreview.text)
      setExportMsg('Đã sao chép mã SVG')
    } catch {
      // Fallback chọn text trong textarea
      const el = document.getElementById('svg-code-textarea')
      if (el) {
        el.focus()
        el.select()
        setExportMsg('Giữ / chọn toàn bộ → Copy')
      } else {
        setExportMsg('Không sao chép được — hãy chọn thủ công trong ô mã')
      }
    }
  }

  const downloadSvgCodeFile = () => {
    if (!svgCodePreview) return
    const a = document.createElement('a')
    a.href = svgCodePreview.dataUrl
    a.download = svgCodePreview.filename
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 400)
  }

  const handleApplyTheme = () => {
    setExportMsg(null)
    try {
      if (!ggbRef.current?.applyTheme) {
        setExportMsg('Applet chưa sẵn sàng.')
        return
      }
      ggbRef.current.applyTheme()
      setExportMsg('Đã áp màu NTSM')
    } catch (err) {
      setExportMsg(err.message || 'Không áp được màu NTSM')
    }
  }

  const sharePreviewAgain = async () => {
    if (!exportPreview) return
    try {
      const file = new File([exportPreview.blob], exportPreview.filename, {
        type: exportPreview.mime,
      })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: exportPreview.filename })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    // Desktop fallback: mở tab mới
    window.open(exportPreview.dataUrl, '_blank', 'noopener,noreferrer')
  }

  const downloadPreviewDesktop = () => {
    if (!exportPreview) return
    const a = document.createElement('a')
    a.href = exportPreview.dataUrl
    a.download = exportPreview.filename
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 400)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Clapperboard size={26} strokeWidth={2} />
          </div>
          <div>
            <h1>Manim Video Studio</h1>
            <p>1) Đề+lời giải → 2) GeoGebra → 3) Mã tọa độ → 4) Kịch bản → Manim → video</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setDraftKeys(apiKeys.join('\n'))
              setShowKeyModal(true)
            }}
          >
            <KeyRound size={16} />
            {apiKeys.length ? `API KEY (${apiKeys.length})` : 'API KEY'}
          </button>
          <div className={`status ${backend.ready ? 'ok' : 'bad'}`}>
            {backend.ready ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{backend.message || (backend.ready ? 'Backend sẵn sàng' : 'Backend offline')}</span>
          </div>
        </div>
      </header>

      <main className="studio-layout">
        <section className={`panel panel-ggb-workspace ${ggbFullscreen ? 'is-fullscreen' : ''}`}>
          <div className="ggb-workspace-head">
            <div>
              <h2 className="panel-title">2. Chỉnh hình GeoGebra</h2>
              <p className="step-hint ggb-workspace-hint">
                Kéo thả điểm trên hình lớn bên dưới → <strong>Lưu hình</strong> → sang cột «Mã tọa độ &
                kịch bản».
              </p>
            </div>
            <div className="ggb-workspace-actions">
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setGgbFullscreen((v) => !v)}
                title={ggbFullscreen ? 'Thu nhỏ' : 'Phóng to toàn màn hình'}
              >
                {ggbFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {ggbFullscreen ? 'Thu nhỏ' : 'Phóng to'}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={handleSaveGgbFigure}
                disabled={savingGgb || !ggbCommands.length}
              >
                {savingGgb ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                {savingGgb ? 'Đang lưu...' : 'Lưu hình đã chỉnh'}
              </button>
            </div>
          </div>

          <div className="ggb-wrap">
            <GeoGebraApplet
              ref={ggbRef}
              commands={ggbCommands}
              mode={ggbMode}
              revision={ggbRevision}
            />
          </div>

          <div className="ggb-workspace-toolbar">
            <label className="field ggb-mode-field">
              <span className="field-label">CHẾ ĐỘ</span>
              <select value={ggbMode} onChange={(e) => setGgbMode(e.target.value)}>
                <option value="geometry">Hình học phẳng</option>
                <option value="graphing">Đồ thị</option>
                <option value="3d">Hình học 3D</option>
              </select>
            </label>
            {(ggbMode === 'graphing' || ggbMode === 'geometry') && (
              <div className="graph-presets-box">
                <span className="field-label">CHẾ ĐỘ ĐỒ THỊ — PRESET NHANH</span>
                <div className="graph-presets-row">
                  {GRAPH_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="btn ghost graph-preset-btn"
                      onClick={() => handleApplyGraphPreset(preset.id)}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="export-row ggb-export-row">
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleExportSvg}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="spin" size={15} /> : <FileImage size={15} />}
                SVG
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleExportSvgCode}
                disabled={exporting}
                title="Xem và sao chép mã nguồn SVG"
              >
                {exporting ? <Loader2 className="spin" size={15} /> : <Code2 size={15} />}
                Mã SVG
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleExportPng}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
                PNG
              </button>
              <button type="button" className="btn ghost export-btn" onClick={handleApplyTheme}>
                <Sparkles size={15} /> Màu NTSM
              </button>
              <button type="button" className="btn ghost export-btn" onClick={applyGgbToPreview}>
                <RefreshCw size={15} /> Áp dụng lệnh
              </button>
            </div>
          </div>
          {exportMsg && <div className="export-msg">{exportMsg}</div>}

          <details className="ggb-commands-details">
            <summary>Lệnh GeoGebra (mỗi dòng 1 lệnh) — bấm để mở chỉnh</summary>
            <label className="field">
              <textarea
                rows={6}
                className="mono"
                value={ggbCommandsText}
                onChange={(e) => {
                  setGgbCommandsText(e.target.value)
                  setManimReady(false)
                }}
              />
            </label>
            <p className="step-hint">
              NTSM: cạnh <code>Segment</code>; đường phụ <code>Line</code> rồi{' '}
              <code>SetVisibleInView(tên, 1, false)</code>.
            </p>
          </details>

          {savedGgbImage && (
            <div className="saved-ggb-preview saved-ggb-preview-inline">
              <div className="saved-ggb-label">Hình đã lưu</div>
              <img src={savedGgbImage} alt="GeoGebra đã lưu" />
            </div>
          )}
        </section>

        <div className="layout three">
        {/* Cột 1: Ảnh/đề → AI đề+lời giải → GeoGebra */}
        <section className="panel">
          <h2 className="panel-title">1. Đề bài & lời giải</h2>
          <p className="step-hint">
            Nhập <strong>đề + lời giải thủ công</strong> (khuyến nghị nếu Gemini lỗi), hoặc tải ảnh /
            gợi ý rồi nhờ AI. Sau đó mới tạo GeoGebra.
          </p>

          <div className="upload-row">
            <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} />
              Tải ảnh đề
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
            {imageDataUrl && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setImageDataUrl(null)
                  setImageName('')
                }}
              >
                <X size={16} /> Xóa ảnh
              </button>
            )}
          </div>
          {imageDataUrl && (
            <div className="image-preview">
              <img src={imageDataUrl} alt="Đề bài" />
              <span>{imageName}</span>
            </div>
          )}

          <label className="field">
            <span className="field-label">ĐỀ BÀI (CHỈNH ĐƯỢC)</span>
            <textarea
              rows={5}
              value={problemText}
              onChange={(e) => {
                setProblemText(e.target.value)
                setProblemReady(false)
              }}
              placeholder={'Ví dụ: Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Tính BC.'}
            />
          </label>

          <label className="field">
            <span className="field-label">LỜI GIẢI TỪNG BƯỚC (CHỈNH ĐƯỢC)</span>
            <textarea
              rows={7}
              value={solutionText}
              onChange={(e) => {
                setSolutionText(e.target.value)
                setSolutionSteps(
                  e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                )
                setProblemReady(false)
              }}
              placeholder={'1) ...\n2) ...\n3) ...'}
            />
          </label>

          <div className="export-row">
            <button
              className="btn primary"
              type="button"
              onClick={handleUseManualProblemSolution}
              disabled={!problemText.trim() || !solutionText.trim()}
            >
              <Save size={18} />
              Dùng đề + lời giải thủ công
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={handleGenerateProblemSolution}
              disabled={generatingProblem}
            >
              {generatingProblem ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
              {generatingProblem ? 'Đang tạo đề + lời giải...' : 'AI tạo đề + lời giải'}
            </button>
          </div>

          {aiTitle && (
            <div className="ai-meta">
              <strong>{aiTitle}</strong>
              {aiNotes && <p>{aiNotes}</p>}
            </div>
          )}
          {problemReady && (
            <div className="step-ok">Đã có đề + lời giải — tiếp tục tạo GeoGebra bên dưới.</div>
          )}

          <button
            className="btn secondary"
            type="button"
            onClick={handleGenerateGeogebra}
            disabled={
              generatingGgb || !problemText.trim() || !solutionText.trim()
            }
          >
            {generatingGgb ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingGgb ? 'Đang vẽ GeoGebra...' : 'AI tạo code GeoGebra'}
          </button>

          {ggbReady && (
            <div className="step-ok">Đã có GeoGebra — sang cột 2 để chỉnh hình cho chuẩn.</div>
          )}
        </section>

        {/* Cột 2: Mã tọa độ → kịch bản */}
        <section className="panel panel-workflow">
          <h2 className="panel-title">Mã tọa độ → kịch bản</h2>
          <p className="step-hint">
            Sau khi <strong>Lưu hình</strong> ở khung GeoGebra phía trên: sắp thứ tự dựng hình → mã
            tọa độ → tạo kịch bản.
          </p>
          {constructionItems.length > 0 && (
            <div className="construction-order-box">
              <div className="field-label">THỨ TỰ DỰNG HÌNH (kéo ý tưởng: cái nào hiện trước / sau)</div>
              <p className="step-hint">
                Dùng ↑↓ để đổi thứ tự. Beat <code>problem_and_figure</code> trong kịch bản sẽ bám đúng
                danh sách này.
              </p>
              <ol className="construction-order-list">
                {constructionItems.map((item, idx) => (
                  <li key={item.id} className="construction-order-item">
                    <span className="construction-order-index">{idx + 1}</span>
                    <span className="construction-order-name">{item.id}</span>
                    <span className="construction-order-kind">{kindLabel(item.kind)}</span>
                    <span className="construction-order-actions">
                      <button
                        type="button"
                        className="btn ghost construction-move-btn"
                        onClick={() => moveConstructionItem(idx, -1)}
                        disabled={idx === 0}
                        title="Lên trên"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn ghost construction-move-btn"
                        onClick={() => moveConstructionItem(idx, 1)}
                        disabled={idx === constructionItems.length - 1}
                        title="Xuống dưới"
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="export-row">
                <button
                  type="button"
                  className="btn secondary export-btn"
                  onClick={handleRefreshFigureReference}
                >
                  <RefreshCw size={15} /> Cập nhật mã tọa độ
                </button>
                <button
                  type="button"
                  className="btn secondary export-btn"
                  onClick={handleAiRefineFigureReference}
                  disabled={generatingFigureRef || !savedGgbImage}
                >
                  {generatingFigureRef ? (
                    <Loader2 className="spin" size={15} />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  AI tinh chỉnh tọa độ
                </button>
              </div>
            </div>
          )}

          {figureReferenceCode && (
            <label className="field">
              <span className="field-label">MÃ THAM CHIẾU TỌA ĐỘ MANIM (chỉnh được)</span>
              <textarea
                rows={12}
                className="mono"
                value={figureReferenceCode}
                onChange={(e) => {
                  setFigureReferenceCode(e.target.value)
                  setFigureRefReady(Boolean(e.target.value.trim()))
                  setStoryboardReady(false)
                  setManimReady(false)
                }}
              />
            </label>
          )}
          {figureRefReady && (
            <div className="step-ok">
              Đã có mã tọa độ — tiếp theo tạo kịch bản (AI hoặc copy prompt Gemini Pro cột 3).
            </div>
          )}

          <label className="field">
            <span className="field-label">ĐỊNH DẠNG VIDEO</span>
            <select
              className="select"
              value={videoFormat}
              onChange={(e) => setVideoFormat(e.target.value)}
            >
              <option value="shorts">Shorts 9:16 — hình học TQH (mặc định): đề+hình → lời giải từng dòng</option>
              <option value="landscape">Landscape 16:9 — hình trái + lời giải phải</option>
            </select>
          </label>

          <div className="layout-templates-box">
            <div className="layout-templates-head">
              <Layers size={15} />
              <span className="field-label">KHUNG MẪU BỐ CỤC</span>
            </div>
            <div className="layout-templates-row">
              {layoutTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`btn secondary export-btn ${layoutTemplateId === tpl.id ? 'active-mode' : ''}`}
                  onClick={() => handleApplyLayoutTemplate(tpl.id)}
                  title={tpl.guidance}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            <div className="layout-save-row">
              <input
                type="text"
                className="layout-name-input"
                placeholder="Tên khung mẫu tùy chỉnh..."
                value={customTemplateName}
                onChange={(e) => setCustomTemplateName(e.target.value)}
              />
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleSaveCustomTemplate}
                disabled={!customTemplateName.trim()}
              >
                <Save size={14} /> Lưu khung mẫu
              </button>
            </div>
          </div>

          <label className="field">
            <span className="field-label">PROMPT HƯỚNG DẪN (CHO KỊCH BẢN + MANIM)</span>
            <textarea
              rows={4}
              value={manimGuidance}
              onChange={(e) => setManimGuidance(e.target.value)}
              placeholder={
                'Ví dụ (shorts TQH):\n- Đề + hình cùng lúc, sau đó ẩn đề đẩy hình lên\n- Lời giải từng dòng + Indicate góc/cạnh\n- Hết 4 dòng thì page_break, giữ hình'
              }
            />
          </label>

          <button
            className="btn secondary"
            type="button"
            onClick={handleGenerateStoryboard}
            disabled={generatingStoryboard || !savedGgbImage || !figureRefReady}
          >
            {generatingStoryboard ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
            {generatingStoryboard ? 'Đang tạo kịch bản từ hình...' : 'AI tạo kịch bản từ hình'}
          </button>

          <label className="field">
            <span className="field-label">KỊCH BẢN VIDEO (JSON — CHỈNH ĐƯỢC)</span>
            <p className="step-hint">
              Shorts TQH: problem_and_figure → ẩn đề → solution_steps (+ page_break mỗi 4 dòng).
              Màu NTSM: điểm đỏ, cạnh xanh dương, tròn xanh lá.
            </p>
            <textarea
              rows={10}
              className="mono"
              value={storyboardText}
              onChange={(e) => {
                setStoryboardText(e.target.value)
                setStoryboardReady(Boolean(e.target.value.trim()))
                setManimReady(false)
              }}
              placeholder="Bấm “AI tạo kịch bản video” — mỗi beat = 1 bước lời giải + hiệu ứng hình..."
            />
          </label>

          <SceneTimeline
            timeline={sceneTimeline}
            onMove={handleTimelineMove}
            onToggleVisible={handleTimelineToggle}
            disabled={!storyboardReady}
          />

          {storyboardReady && (
            <div className="step-ok">Đã có kịch bản — chỉnh timeline cảnh ở trên, hoặc copy brief Cursor Agent (cột 3).</div>
          )}

          <button
            type="button"
            className="btn secondary"
            onClick={handleCopyCursorAgentBrief}
            disabled={!problemText.trim() || !solutionText.trim()}
            title="Gửi đề + lời giải + kịch bản cho Cursor Agent"
          >
            <Bot size={16} /> Copy brief → Cursor Agent
          </button>

          <button
            className="btn primary"
            type="button"
            onClick={handleGenerateManim}
            disabled={generatingManim || !storyboardText.trim()}
          >
            {generatingManim ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingManim ? 'Đang tạo Manim từ kịch bản...' : 'Tạo code Manim từ kịch bản'}
          </button>
          {!problemText.trim() || !solutionText.trim() ? (
            <div className="export-msg">Cần đề bài + lời giải ở cột 1.</div>
          ) : null}
          {!savedGgbImage && ggbCommands.length > 0 && (
            <div className="export-msg">Chỉnh hình xong hãy bấm “Lưu hình đã chỉnh” → sắp thứ tự → mã tọa độ.</div>
          )}
          {savedGgbImage && !figureRefReady && (
            <div className="export-msg">Đã lưu hình — bấm «Cập nhật mã tọa độ» nếu chưa thấy mã bên trên.</div>
          )}
          {manimReady && (
            <div className="step-ok">Đã có Manim — sang cột 3 để validate / preview / biên dịch video.</div>
          )}

          <div className="canvas-fix-box">
            <h3 className="voiceover-title">
              <Wrench size={16} /> Gửi lỗi → sửa canvas (GeoGebra + kịch bản)
            </h3>
            <p className="step-hint">
              Sau Validate hoặc biên dịch lỗi: AI gợi ý sửa lệnh GeoGebra, thứ tự beat và mã tọa độ — không
              thay toàn bộ code Manim.
            </p>
            <button
              type="button"
              className="btn secondary export-btn"
              onClick={handleFixCanvasFromError}
              disabled={fixingCanvas}
            >
              {fixingCanvas ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
              {fixingCanvas ? 'Đang phân tích lỗi...' : 'AI sửa hình + kịch bản từ lỗi'}
            </button>
            {canvasFixMsg && <div className="step-ok">{canvasFixMsg}</div>}
          </div>
        </section>

        {/* Cột 3: Manim + Video */}
        <section className="panel">
          <h2 className="panel-title">3. Manim → video</h2>
          <p className="step-hint">
            <strong>Khuyến nghị — Hướng A:</strong> Copy brief → <strong>Cursor Agent</strong> viết{' '}
            <code>scenes/*.py</code> → dán vào editor → Validate → Biên dịch. Chế độ{' '}
            <strong>{effectiveValidationMode === 'local_latex' ? 'Local + LaTeX' : 'Render Free'}</strong>
            {backend.deps?.latex ? ' (LaTeX OK)' : ' (chưa có LaTeX)'}.
          </p>

          <div className="cursor-agent-box">
            <h3 className="voiceover-title">
              <Bot size={16} /> Cursor Agent — viết / sửa code (Hướng A)
            </h3>
            <ol className="ce-checklist pro-steps">
              <li>
                <strong>Studio:</strong> đề + lời giải (cột 1), GeoGebra (cột 2) — bấm Copy brief
              </li>
              <li>
                <strong>Cursor:</strong> mở folder <code>manim-video-studio</code> → chat Agent → dán brief
              </li>
              <li>
                <strong>Agent viết</strong> <code>scenes/TenBai.py</code> — xem{' '}
                <code>docs/HUONG-DAN-CURSOR-AGENT-MANIM.md</code>
              </li>
              <li>
                <strong>Studio:</strong> copy code vào editor → Validate CE → Biên dịch 480p
              </li>
            </ol>
            <div className="export-row pro-step-buttons">
              <button type="button" className="btn primary export-btn" onClick={handleCopyCursorAgentBrief}>
                <Copy size={15} /> Copy brief cho Cursor
              </button>
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleCopyCursorAgentFixBrief}
                disabled={!code.trim() || code.trim().startsWith('#')}
                title="Gửi code + log lỗi cho Agent sửa"
              >
                <Wrench size={15} /> Copy brief sửa lỗi
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setShowCursorBrief((v) => !v)}
              >
                <FileText size={15} /> {showCursorBrief ? 'Ẩn brief' : 'Xem brief'}
              </button>
            </div>
            {showCursorBrief && (
              <label className="field">
                <span className="field-label">BRIEF GỬI CURSOR AGENT</span>
                <textarea rows={10} className="mono" readOnly value={cursorAgentBrief} />
              </label>
            )}
            {cursorAgentMsg && <div className="step-ok">{cursorAgentMsg}</div>}
          </div>

          <div className="validation-mode-row">
            <span className="field-label">CHẾ ĐỘ KIỂM TRA CODE</span>
            <div className="export-row">
              <button
                type="button"
                className={`btn secondary export-btn ${effectiveValidationMode === 'local_latex' ? 'active-mode' : ''}`}
                onClick={() => persistValidationMode('local_latex')}
                disabled={!backend.deps?.latex}
                title={backend.deps?.latex ? 'Cho phép MathTex' : 'Cài MiKTeX trước'}
              >
                Local + LaTeX
              </button>
              <button
                type="button"
                className={`btn secondary export-btn ${effectiveValidationMode === 'render_free' ? 'active-mode' : ''}`}
                onClick={() => persistValidationMode('render_free')}
              >
                Render Free
              </button>
            </div>
          </div>

          <div className="pro-workflow-box gemini-optional">
            <div className="gemini-optional-header">
              <h3 className="voiceover-title">
                <Code2 size={16} /> Tùy chọn: Gemini Pro
              </h3>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setShowGeminiWorkflow((v) => !v)}
              >
                {showGeminiWorkflow ? 'Thu gọn' : 'Mở rộng'}
              </button>
            </div>
            {showGeminiWorkflow && (
              <>
            <p className="step-hint step-hint-tight">
              Không khuyến nghị cho code chính — dùng khi không có Cursor.
              Mặc định <strong>Shorts 9:16 TQH</strong>: đề+hình → ẩn đề → lời giải từng dòng.
            </p>
            <ol className="ce-checklist pro-steps">
              <li>
                <strong>Cột 2:</strong> Lưu hình GeoGebra → sắp thứ tự dựng hình → có mã tọa độ
              </li>
              <li>
                <strong>Bước 1 — Kịch bản:</strong> Copy prompt (đã lồng hình + thứ tự) → Gemini Pro → dán JSON
              </li>
              <li>
                <strong>Bước 2 — Code:</strong> Copy prompt (có kịch bản) → nhận Python → dán vào ô Code
              </li>
              <li>
                <strong>Bước 3 — Sửa:</strong> Ghi chú thay đổi → Copy prompt sửa → dán code mới
              </li>
            </ol>

            <div className="export-row pro-step-buttons">
              <button
                type="button"
                className={`btn secondary export-btn ${proPromptStep === 'storyboard' ? 'active-mode' : ''}`}
                onClick={handleCopyGeminiProStoryboard}
              >
                <Copy size={15} /> Bước 1 — Kịch bản
              </button>
              <button
                type="button"
                className={`btn primary export-btn ${proPromptStep === 'code' ? 'active-mode' : ''}`}
                onClick={handleCopyGeminiProCode}
              >
                <Copy size={15} /> Bước 2 — Code
              </button>
              <button
                type="button"
                className={`btn secondary export-btn ${proPromptStep === 'revise' ? 'active-mode' : ''}`}
                onClick={handleCopyGeminiProRevise}
              >
                <Copy size={15} /> Bước 3 — Sửa
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setShowProPrompt((v) => !v)}
              >
                <FileText size={15} /> {showProPrompt ? 'Ẩn prompt' : 'Xem prompt'}
              </button>
            </div>

            {showProPrompt && (
              <label className="field">
                <span className="field-label">
                  PROMPT{' '}
                  {proPromptStep === 'storyboard'
                    ? 'BƯỚC 1 (KỊCH BẢN)'
                    : proPromptStep === 'revise'
                      ? 'BƯỚC 3 (SỬA)'
                      : 'BƯỚC 2 (CODE)'}
                </span>
                <textarea rows={8} className="mono" readOnly value={geminiProPrompt} />
              </label>
            )}

            <label className="field">
              <span className="field-label">KỊCH BẢN JSON TỪ GEMINI (BƯỚC 1)</span>
              <textarea
                rows={5}
                className="mono"
                value={proStoryboardPaste}
                onChange={(e) => setProStoryboardPaste(e.target.value)}
                placeholder="Dán JSON kịch bản từ Gemini Pro (Bước 1). Có thể chỉnh nhẹ rồi bấm Áp dụng."
              />
            </label>
            <div className="export-row">
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleApplyProStoryboard}
                disabled={!proStoryboardPaste.trim()}
              >
                <Upload size={15} /> Áp dụng kịch bản
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => {
                  setProStoryboardPaste('')
                  setProPromptMsg('')
                }}
                disabled={!proStoryboardPaste.trim()}
              >
                <X size={15} /> Xóa ô kịch bản
              </button>
            </div>

            <label className="field">
              <span className="field-label">YÊU CẦU SỬA KỊCH BẢN / BỐ CỤC (BƯỚC 3)</span>
              <textarea
                rows={3}
                value={proRevisionNotes}
                onChange={(e) => setProRevisionNotes(e.target.value)}
                placeholder={
                  'Ví dụ:\n- Tiêu đề nhỏ hơn, đẩy lên trên\n- Hình scale nhỏ lại (4.0), không cắt điểm K\n- Bước 2 tách 2 dòng, không đè lên tiêu đề'
                }
              />
            </label>

            <label className="field">
              <span className="field-label">DÁN CODE MANIM TỪ GEMINI PRO (BƯỚC 2 / 3)</span>
              <textarea
                rows={6}
                className="mono"
                value={proPaste}
                onChange={(e) => setProPaste(e.target.value)}
                placeholder={'Dán toàn bộ file .py hoặc khối ```python ... ``` từ Gemini Pro'}
              />
            </label>
            <div className="export-row">
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleApplyProPaste}
                disabled={!proPaste.trim()}
              >
                <Upload size={15} /> Áp dụng vào editor + Validate CE
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => {
                  setProPaste('')
                  setProPromptMsg('')
                }}
                disabled={!proPaste.trim()}
              >
                <X size={15} /> Xóa ô dán
              </button>
            </div>
            {proPromptMsg && <div className="step-ok">{proPromptMsg}</div>}

            <ul className="ce-checklist">
              {ceChecklist.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
              </>
            )}
          </div>

          <label className="field">
            <span className="field-label">MẪU MANIM SẴN (TÙY CHỌN)</span>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— Dùng mã AI / đang soạn —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">SCENE CẦN CHẠY</span>
            <select value={scene} onChange={(e) => setScene(e.target.value)}>
              {scenes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {!scenes.length && <option value="">— Chưa có Scene (hãy tạo Manim) —</option>}
            </select>
          </label>

          <label className="field">
            <span className="field-label">CHẤT LƯỢNG VIDEO</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {qualities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>

          <div className="editor-wrap compact">
            <div className="editor-tab">
              <span>scene.py</span>
              {currentTemplate && <span className="editor-hint">{currentTemplate.name}</span>}
            </div>
            <Editor
              height="220px"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 8 },
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>

          {manimValidation && (
            <div className={`validation-box ${manimValidation.ok ? 'ok' : 'bad'}`}>
              <strong>{manimValidation.ok ? 'Validate OK' : 'Validate có lỗi'}</strong>
              {(manimValidation.errors || []).length > 0 && (
                <ul>
                  {manimValidation.errors.map((err, i) => (
                    <li key={`ve-${i}`}>{err}</li>
                  ))}
                </ul>
              )}
              {(manimValidation.warnings || []).length > 0 && (
                <ul className="validation-warn">
                  {manimValidation.warnings.map((w, i) => (
                    <li key={`vw-${i}`}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="revise-box">
            <h3 className="voiceover-title">
              <Wrench size={16} /> AI sửa / repair (Math-To-Manim)
            </h3>
            <p className="step-hint">
              Validate chặn Tex &amp; import nguy hiểm trước khi render. Repair loop: validate → AI
              sửa theo lỗi/log → validate lại (1–3 vòng).
            </p>
            <label className="field">
              <span className="field-label">PROMPT CHỈNH SỬA</span>
              <textarea
                rows={4}
                value={revisePrompt}
                onChange={(e) => setRevisePrompt(e.target.value)}
                placeholder={
                  'Ví dụ:\n- Chữ lời giải nhỏ hơn, đặt bên phải\n- Bước 2 hãy Indicate đoạn AH\n- Đổi Tex sang Text; sửa lỗi theo nhật ký'
                }
              />
            </label>
            <label className="field check-row">
              <input
                type="checkbox"
                checked={useLogForRevise}
                onChange={(e) => setUseLogForRevise(e.target.checked)}
              />
              <span>
                Dùng nhật ký biên dịch / lỗi để sửa ({log?.trim() ? 'đã có log' : 'chưa có log'})
              </span>
            </label>
            <label className="field">
              <span className="field-label">SỐ VÒNG REPAIR</span>
              <select
                value={repairRounds}
                onChange={(e) => setRepairRounds(Number(e.target.value))}
                disabled={repairingManim}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <div className="export-row">
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleValidateManim}
                disabled={!code.trim() || revisingManim || repairingManim}
              >
                <FileText size={15} /> Validate
              </button>
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleReviseManim}
                disabled={revisingManim || repairingManim || !code.trim()}
              >
                {revisingManim ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
                {revisingManim ? 'Đang sửa...' : 'AI sửa 1 lần'}
              </button>
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleRepairManim}
                disabled={revisingManim || repairingManim || !code.trim()}
              >
                {repairingManim ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
                {repairingManim ? 'Đang repair...' : 'Repair loop'}
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setShowLog(true)}
              >
                <FileText size={15} /> Xem nhật ký
              </button>
            </div>
            {reviseNotes && <div className="step-ok">{reviseNotes}</div>}
          </div>

          <div className="preview compact">
            {videoUrl ? (
              <video key={videoUrl} src={videoUrl} controls autoPlay />
            ) : previewImageUrl ? (
              <div className="preview-frame-wrap">
                <DraggableLayoutPreview
                  imageUrl={previewImageUrl}
                  slots={layoutSlots}
                  onSlotsChange={handleLayoutSlotsChange}
                  editMode={layoutEditMode}
                  onSaveLayout={handleSaveLayout}
                  layoutDirty={layoutDirty}
                />
                <div className="layout-edit-toggle-row">
                  <button
                    type="button"
                    className={`btn secondary export-btn ${layoutEditMode ? 'active-mode' : ''}`}
                    onClick={() => setLayoutEditMode((v) => !v)}
                  >
                    <Move size={15} />
                    {layoutEditMode ? 'Tắt kéo thả' : 'Bật kéo thả chữ & hình'}
                  </button>
                  {!layoutEditMode && (
                    <span className="preview-frame-caption">
                      Preview khung cuối — bật kéo thả để chỉnh vị trí hình/chữ
                    </span>
                  )}
                </div>
                {layoutMsg && <div className="step-ok">{layoutMsg}</div>}
              </div>
            ) : (
              <div className="preview-empty">
                {compiling || previewing ? (
                  <>
                    <Loader2 className="spin" size={32} />
                    <p>{previewing ? 'Đang render preview...' : 'Đang biên dịch video...'}</p>
                  </>
                ) : (
                  <p>Video hoặc ảnh preview hiện ở đây</p>
                )}
              </div>
            )}
          </div>

          {error && <div className="alert">{error}</div>}

          <div className="actions">
            <button
              className="btn secondary"
              type="button"
              onClick={handlePreviewFrame}
              disabled={previewing || compiling || !backend.ready || !scene || !code.trim()}
              title="Render khung cuối (-ql) — nhanh hơn video đầy đủ"
            >
              {previewing ? <Loader2 className="spin" size={18} /> : <Film size={18} />}
              {previewing ? 'Đang preview...' : 'Preview nhanh (1 khung)'}
            </button>
            <button
              className="btn primary"
              onClick={handleCompile}
              disabled={compiling || previewing || !backend.ready || !scene}
            >
              {compiling ? <Loader2 className="spin" size={18} /> : <Clapperboard size={18} />}
              {compiling ? 'Đang biên dịch...' : 'Tạo video (biên dịch Manim)'}
            </button>
            <button className="btn secondary" onClick={handleDownload} disabled={!videoUrl}>
              <Download size={18} />
              Tải video MP4
            </button>
          </div>

          <div className="voiceover-box">
            <h3 className="voiceover-title">
              <Mic size={16} /> Lồng tiếng AI (Edge TTS — miễn phí)
            </h3>
            <p className="step-hint">
              AI viết lời thoại gồm <strong>đề bài</strong> + <strong>hướng dẫn giải</strong>, rồi Edge
              TTS đọc và ghép vào MP4. Bật “Khớp nhịp hình” để kéo giãn/nén hiệu ứng cho gần với độ dài
              lời đọc (tương đối).
            </p>

            <label className="field check-row">
              <input
                type="checkbox"
                checked={syncToNarration}
                onChange={(e) => setSyncToNarration(e.target.checked)}
              />
              <span>Khớp nhịp hình với lời đọc (tương đối)</span>
            </label>

            <label className="field">
              <span className="field-label">GIỌNG ĐỌC</span>
              <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                {(ttsVoices.length
                  ? ttsVoices
                  : [
                      { id: 'vi-VN-HoaiMyNeural', label: 'Hoài My (nữ)' },
                      { id: 'vi-VN-NamMinhNeural', label: 'Nam Minh (nam)' },
                    ]
                ).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">TỐC ĐỘ</span>
              <select value={ttsRate} onChange={(e) => setTtsRate(e.target.value)}>
                <option value="-20%">Chậm (−20%)</option>
                <option value="-10%">Hơi chậm (−10%)</option>
                <option value="+0%">Bình thường</option>
                <option value="+10%">Hơi nhanh (+10%)</option>
                <option value="+20%">Nhanh (+20%)</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">
                LỜI THOẠI {voiceTitle ? `— ${voiceTitle}` : ''}
              </span>
              <textarea
                rows={5}
                value={voiceScript}
                onChange={(e) => setVoiceScript(e.target.value)}
                placeholder="Bấm “AI viết lời thoại” để tạo đề bài + hướng dẫn giải, hoặc tự gõ..."
              />
            </label>

            <div className="export-row">
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleGenerateScript}
                disabled={generatingScript || !code.trim()}
              >
                {generatingScript ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
                AI viết đề + lời giải
              </button>
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleApplyVoiceover}
                disabled={applyingVoice || !videoUrl || !voiceScript.trim()}
              >
                {applyingVoice ? <Loader2 className="spin" size={15} /> : <Volume2 size={15} />}
                {applyingVoice ? 'Đang lồng tiếng...' : 'Lồng tiếng vào video'}
              </button>
            </div>

            {voiceSyncMsg && <div className="step-ok">{voiceSyncMsg}</div>}

            {audioUrl && (
              <div className="audio-preview">
                <span>Nghe thử audio:</span>
                <audio key={audioUrl} src={audioUrl} controls />
              </div>
            )}
          </div>

          <button className="log-link" onClick={() => setShowLog(true)} type="button">
            <FileText size={16} />
            Nhật ký biên dịch
          </button>
        </section>
        </div>
      </main>

      {showLog && (
        <div className="modal-backdrop" onClick={() => setShowLog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Nhật ký biên dịch</h2>
              <button className="icon-btn" onClick={() => setShowLog(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <pre className="log-body">{log || 'Chưa có nhật ký.'}</pre>
          </div>
        </div>
      )}

      {exportPreview && (
        <div className="modal-backdrop" onClick={() => setExportPreview(null)}>
          <div className="modal narrow export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Xuất {exportPreview.kind.toUpperCase()}</h2>
              <button
                className="icon-btn"
                onClick={() => setExportPreview(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="export-hint">
                Trên iPad: <strong>giữ vào ảnh</strong> → Lưu ảnh, hoặc bấm <strong>Chia sẻ</strong> →
                Lưu vào Files.
              </p>
              <div className="export-preview-frame">
                {exportPreview.kind === 'png' ? (
                  <img src={exportPreview.dataUrl} alt="GeoGebra PNG" />
                ) : (
                  <img src={exportPreview.dataUrl} alt="GeoGebra SVG" />
                )}
              </div>
              <div className="export-actions">
                <button type="button" className="btn primary" onClick={sharePreviewAgain}>
                  <Upload size={16} /> Chia sẻ / Lưu
                </button>
                <button type="button" className="btn secondary" onClick={downloadPreviewDesktop}>
                  <Download size={16} /> Mở / Tải
                </button>
                {exportPreview.kind === 'svg' && exportPreview.text && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setSvgCodePreview({
                        filename: exportPreview.filename,
                        text: exportPreview.text,
                        dataUrl: exportPreview.dataUrl,
                        blob: exportPreview.blob,
                        mime: exportPreview.mime,
                      })
                      setExportPreview(null)
                    }}
                  >
                    <Code2 size={16} /> Xem mã SVG
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {svgCodePreview && (
        <div className="modal-backdrop" onClick={() => setSvgCodePreview(null)}>
          <div className="modal export-modal svg-code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Mã SVG</h2>
              <button
                className="icon-btn"
                onClick={() => setSvgCodePreview(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="export-hint">
                Sao chép mã bên dưới để dán vào Word, HTML, Canva… hoặc tải file{' '}
                <code>{svgCodePreview.filename}</code>.
              </p>
              <textarea
                id="svg-code-textarea"
                className="svg-code-textarea mono"
                readOnly
                value={svgCodePreview.text}
                spellCheck={false}
                onFocus={(e) => e.target.select()}
              />
              <div className="export-actions">
                <button type="button" className="btn primary" onClick={copySvgCode}>
                  <Copy size={16} /> Sao chép mã
                </button>
                <button type="button" className="btn secondary" onClick={downloadSvgCodeFile}>
                  <Download size={16} /> Tải file .svg
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Gemini API Keys</h2>
              <button className="icon-btn" onClick={() => setShowKeyModal(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Lấy key miễn phí tại{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Google AI Studio
                </a>
                . Có thể nhập <strong>nhiều key</strong> (mỗi dòng 1 key). Khi key bị limit, hệ thống
                tự chuyển sang key tiếp theo.
              </p>
              <textarea
                rows={6}
                value={draftKeys}
                onChange={(e) => setDraftKeys(e.target.value)}
                placeholder={'AIza...key1\nAIza...key2\nAIza...key3'}
                className="key-input mono"
                spellCheck={false}
              />
              <p className="key-count">
                Đang có: <strong>{apiKeys.length}</strong> key đã lưu
              </p>
              <button type="button" className="btn primary" onClick={saveApiKeys}>
                <Upload size={16} /> Lưu danh sách API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
