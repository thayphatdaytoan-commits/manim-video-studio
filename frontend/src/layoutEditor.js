/** Chuyển kéo thả trên preview → shift Manim + chèn vào code Python. */

const STUDIO_LAYOUT_MARKER = '# === STUDIO LAYOUT — kéo thả (tự động) ==='

export const DEFAULT_LAYOUT_SLOTS_SHORTS = [
  {
    id: 'problem',
    label: 'Chữ đề / tiêu đề',
    varName: 'problem_block',
    rect: { x: 0.06, y: 0.03, w: 0.88, h: 0.14 },
  },
  {
    id: 'figure',
    label: 'Hình / đồ thị',
    varName: 'figure',
    rect: { x: 0.06, y: 0.2, w: 0.88, h: 0.38 },
  },
  {
    id: 'solution',
    label: 'Lời giải / công thức',
    varName: 'solution_stack',
    rect: { x: 0.06, y: 0.62, w: 0.88, h: 0.32 },
  },
]

export const DEFAULT_LAYOUT_SLOTS_LANDSCAPE = [
  {
    id: 'figure',
    label: 'Hình trái',
    varName: 'figure',
    rect: { x: 0.04, y: 0.15, w: 0.42, h: 0.7 },
  },
  {
    id: 'text',
    label: 'Panel chữ phải',
    varName: 'text_panel',
    rect: { x: 0.52, y: 0.12, w: 0.44, h: 0.76 },
  },
]

export function defaultLayoutSlots(videoFormat = 'shorts') {
  const base =
    videoFormat === 'landscape'
      ? DEFAULT_LAYOUT_SLOTS_LANDSCAPE
      : DEFAULT_LAYOUT_SLOTS_SHORTS
  return base.map((s) => ({
    ...s,
    rect: { ...s.rect },
  }))
}

function slotCenter(rect) {
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2 }
}

/** Delta từ vị trí gốc (normalized 0–1) → shift Manim (RIGHT, UP). */
export function rectDeltaToManimShift(rect, baseRect, videoFormat = 'shorts') {
  const frameW = videoFormat === 'landscape' ? 14 : 4.5
  const frameH = videoFormat === 'landscape' ? 8 : 8
  const a = slotCenter(rect)
  const b = slotCenter(baseRect)
  const dx = (a.cx - b.cx) * frameW
  const dy = -(a.cy - b.cy) * frameH
  return { x: round3(dx), y: round3(dy) }
}

function round3(n) {
  return Math.round(n * 1000) / 1000
}

export function shiftsFromSlots(slots, baseSlots, videoFormat) {
  const baseById = Object.fromEntries(baseSlots.map((s) => [s.id, s]))
  const out = {}
  for (const slot of slots) {
    const base = baseById[slot.id]
    if (!base) continue
    const { x, y } = rectDeltaToManimShift(slot.rect, base.rect, videoFormat)
    if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) {
      out[slot.varName] = { x, y }
    }
  }
  return out
}

function formatShiftExpr(shift) {
  if (!shift || (Math.abs(shift.x) < 0.001 && Math.abs(shift.y) < 0.001)) {
    return 'ORIGIN'
  }
  const parts = []
  if (Math.abs(shift.x) >= 0.001) {
    parts.push(`RIGHT * ${shift.x}`)
  }
  if (Math.abs(shift.y) >= 0.001) {
    parts.push(`UP * ${shift.y}`)
  }
  return parts.join(' + ') || 'ORIGIN'
}

export function buildStudioLayoutBlock(shifts) {
  const entries = Object.entries(shifts || {}).filter(
    ([, v]) => v && (Math.abs(v.x) >= 0.001 || Math.abs(v.y) >= 0.001),
  )
  if (!entries.length) return ''

  const lines = [STUDIO_LAYOUT_MARKER]
  for (const [varName, shift] of entries) {
    const expr = formatShiftExpr(shift)
    lines.push(`        try:`)
    lines.push(`            ${varName}.shift(${expr})`)
    lines.push(`        except (NameError, AttributeError):`)
    lines.push(`            pass`)
  }
  return lines.join('\n')
}

export function stripStudioLayoutBlock(code) {
  const lines = (code || '').split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    if (line.includes(STUDIO_LAYOUT_MARKER)) {
      skipping = true
      continue
    }
    if (skipping) {
      const t = line.trim()
      if (
        t.startsWith('try:') ||
        t.startsWith('except') ||
        t === 'pass' ||
        t.includes('.shift(') ||
        t === ''
      ) {
        continue
      }
      skipping = false
    }
    if (!skipping) out.push(line)
  }
  return out.join('\n').trimEnd() + (out.length ? '\n' : '')
}

/** Chèn block shift vào cuối construct() — trước dòng self.wait cuối hoặc trước hết method. */
export function injectLayoutShiftsIntoCode(code, shifts) {
  let next = stripStudioLayoutBlock(code)
  const block = buildStudioLayoutBlock(shifts)
  if (!block) return next

  const constructMatch = next.match(/\n(\s+)def construct\(self\):\s*\n/)
  if (!constructMatch) {
    return `${next.trimEnd()}\n\n${block}\n`
  }
  const indent = constructMatch[1]

  const methodStart = next.indexOf(constructMatch[0]) + constructMatch[0].length
  const afterConstruct = next.slice(methodStart)

  const classEnd = findConstructInsertPoint(afterConstruct, indent)
  const insertAt = methodStart + classEnd
  const injected = `\n${block}\n`

  return next.slice(0, insertAt) + injected + next.slice(insertAt)
}

function findConstructInsertPoint(body, classIndent) {
  const lines = body.split('\n')
  let lastWait = -1
  let lineOffset = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed.startsWith('def ') && line.startsWith(classIndent) && !line.startsWith(classIndent + ' ')) {
      break
    }
    if (/self\.wait\s*\(/.test(trimmed)) {
      lastWait = lineOffset
    }
    lineOffset += line.length + 1
    if (trimmed && !line.startsWith(classIndent + ' ') && line.startsWith(classIndent)) {
      break
    }
  }
  if (lastWait >= 0) return lastWait
  return body.length
}

export function parseLayoutShiftsFromCode(code) {
  const text = code || ''
  if (!text.includes(STUDIO_LAYOUT_MARKER)) return {}
  const shifts = {}
  const re = /(\w+)\.shift\(\s*(?:RIGHT\s*\*\s*([-\d.]+))?(?:\s*\+\s*)?(?:UP\s*\*\s*([-\d.]+))?\s*\)/g
  let m
  while ((m = re.exec(text)) !== null) {
    shifts[m[1]] = {
      x: parseFloat(m[2] || '0') || 0,
      y: parseFloat(m[3] || '0') || 0,
    }
  }
  return shifts
}

/** Áp shift đã lưu ngược lên rect (để hiện khung khi mở lại). */
export function applyShiftsToSlots(slots, baseSlots, shifts, videoFormat) {
  const frameW = videoFormat === 'landscape' ? 14 : 4.5
  const frameH = 8
  const baseById = Object.fromEntries(baseSlots.map((s) => [s.id, s]))
  return slots.map((slot) => {
    const shift = shifts[slot.varName]
    if (!shift) return { ...slot, rect: { ...slot.rect } }
    const base = baseById[slot.id]
    if (!base) return { ...slot, rect: { ...slot.rect } }
    const b = slotCenter(base.rect)
    const cx = b.cx + shift.x / frameW
    const cy = b.cy - shift.y / frameH
    return {
      ...slot,
      rect: {
        x: cx - slot.rect.w / 2,
        y: cy - slot.rect.h / 2,
        w: slot.rect.w,
        h: slot.rect.h,
      },
    }
  })
}
