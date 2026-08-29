/** Khung mẫu bố cục — lưu / tải layout (Hướng A). */

const STORAGE_KEY = 'mvs_layout_templates_v1'

export const BUILTIN_LAYOUT_TEMPLATES = [
  {
    id: 'shorts_tqh_fullframe',
    name: 'Shorts 9:16 — TQH full màn hình',
    videoFormat: 'shorts',
    guidance:
      'Đề + hình cùng khung → ẩn đề → hình phóng lên trên → lời giải từng dòng dưới hình. Page break mỗi 4 dòng.',
    layout: {
      mode: 'shorts_tqh_fullframe',
      margin: 0.18,
      max_lines_per_page: 4,
      problem_layout: 'text_top_figure_below',
      solution_layout: 'figure_top_text_below',
    },
  },
  {
    id: 'landscape_two_panel',
    name: 'Landscape 16:9 — hình trái + chữ phải',
    videoFormat: 'landscape',
    guidance: 'Hình scale_to_fit_height(4.0) bên trái; panel lời giải bên phải; median (câu hỏi trước — trả lời sau).',
    layout: {
      mode: 'landscape_two_panel',
      figure_zone: 'LEFT * 2.8',
      text_panel: 'RIGHT, scale 0.38',
      max_lines_per_beat: 2,
    },
  },
  {
    id: 'shorts_graph',
    name: 'Shorts 9:16 — đồ thị hàm',
    videoFormat: 'shorts',
    guidance:
      'Axes + đồ thị hàm; đề trên; vùng đồ thị full SAFE_W; lời giải dưới (cực trị, nghiệm, tiệm cận).',
    layout: {
      mode: 'shorts_graph_fullframe',
      margin: 0.18,
      graph_height_ratio: 0.55,
      problem_layout: 'text_top_graph_below',
      solution_layout: 'graph_top_text_below',
    },
  },
]

function loadCustomTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomTemplates(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function listLayoutTemplates() {
  return [...BUILTIN_LAYOUT_TEMPLATES, ...loadCustomTemplates()]
}

export function getLayoutTemplate(id) {
  return listLayoutTemplates().find((t) => t.id === id) || null
}

export function saveCustomLayoutTemplate(template) {
  const name = (template?.name || '').trim()
  if (!name) return null
  const id = `custom_${Date.now()}`
  const entry = {
    id,
    name,
    videoFormat: template.videoFormat || 'shorts',
    guidance: template.guidance || '',
    layout: template.layout || {},
    custom: true,
  }
  const customs = loadCustomTemplates()
  customs.push(entry)
  saveCustomTemplates(customs)
  return entry
}

/** Áp khung mẫu lên storyboard (nếu có) + trả state patch cho App. */
export function applyLayoutTemplateToStoryboard(storyboard, template) {
  if (!template) return { storyboard, patch: {} }
  const next = storyboard ? { ...storyboard } : {}
  next.video_format = template.videoFormat
  next.layout = { ...(next.layout || {}), ...(template.layout || {}) }
  return {
    storyboard: next,
    patch: {
      videoFormat: template.videoFormat,
      manimGuidance: template.guidance,
    },
  }
}
