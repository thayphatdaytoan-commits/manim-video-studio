/**
 * Scene layers — trích object từ code Manim, kéo thả, scale, z-order, fullframe.
 */

const STUDIO_LAYERS_MARKER = '# === STUDIO LAYERS (tự động — kéo thả) ==='
const STUDIO_FULLFRAME_MARKER = '# === STUDIO FULLFRAME (Shorts 9:16) ==='

const SKIP_NAMES = new Set([
  'self',
  'config',
  'MARGIN',
  'SAFE_W',
  'LEFT_EDGE',
  'LEFT',
  'RIGHT',
  'UP',
  'DOWN',
  'ORIGIN',
  'STYLE_VN',
  'MAX_LINES_PER_PAGE',
  'title',
  'O',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'i',
  'j',
  'k',
  'n',
  'm',
  'x',
  'y',
  'a',
  'b',
  'f',
  'g',
  'h',
  'eq',
  'eq1',
  'eq2',
  'line',
  'circle',
  'dot',
  'fig_h',
  'avail_h',
  'safe_w',
  'left',
  'bottom_limit',
  'new_line',
  'new_parts',
  'panel',
  'steps',
  'text_vi',
  'latex',
  'indicate_targets',
])

const MOBJ_PATTERNS = [
  /^(\w+)\s*=\s*VGroup\s*\(/,
  /^(\w+)\s*=\s*vn\s*\(/,
  /^(\w+)\s*=\s*(?:Text|MathTex|MarkupText|Circle|Dot|Line|DashedLine|Polygon|Arc|Axes|NumberPlane|SurroundingRectangle)\s*\(/,
]

const TYPE_HINTS = {
  VGroup: 'group',
  Text: 'text',
  MathTex: 'math',
  MarkupText: 'text',
  Circle: 'figure',
  Axes: 'figure',
  NumberPlane: 'figure',
}

function round3(n) {
  return Math.round(n * 1000) / 1000
}

function uid() {
  return `layer-${Math.random().toString(36).slice(2, 9)}`
}

function inferType(line) {
  if (/VGroup/.test(line)) return 'group'
  if (/MathTex/.test(line)) return 'math'
  if (/Text|MarkupText|vn\(/.test(line)) return 'text'
  if (/Circle|Line|Polygon|Axes|Arc|Dot/.test(line)) return 'figure'
  return 'group'
}

function inferLabel(varName) {
  const map = {
    figure: 'Hình / đồ thị',
    problem_block: 'Đề / tiêu đề',
    problem_lines: 'Dòng đề',
    solution_stack: 'Lời giải',
    text_panel: 'Panel chữ',
    title: 'Tiêu đề',
    venn: 'Venn',
    diagram: 'Sơ đồ',
    content: 'Nội dung',
  }
  return map[varName] || varName
}

/** Trích các biến Mobject trong construct(). */
export function extractLayersFromCode(code) {
  const text = code || ''
  const constructIdx = text.search(/def\s+construct\s*\(\s*self\s*\)\s*:/)
  if (constructIdx < 0) return []

  const after = text.slice(constructIdx)
  const lines = after.split('\n').slice(1)
  const found = []
  const seen = new Set()

  for (const line of lines) {
    if (/^\s{0,4}\S/.test(line) && !line.startsWith('        ') && line.trim()) break
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (/self\.(play|wait|add|remove)/.test(trimmed)) continue

    for (const pat of MOBJ_PATTERNS) {
      const m = trimmed.match(pat)
      if (!m) continue
      const name = m[1]
      if (SKIP_NAMES.has(name) || seen.has(name) || name.length < 2) continue
      if (/^[A-Z]$/.test(name)) continue
      seen.add(name)
      found.push({
        id: uid(),
        varName: name,
        label: inferLabel(name),
        type: inferType(trimmed),
        visible: true,
        zIndex: found.length,
        scale: 1,
        rect: null,
      })
      break
    }
  }

  return found
}

export function defaultRectForLayer(index, total, videoFormat = 'shorts') {
  const n = Math.max(total, 1)
  const marginX = videoFormat === 'landscape' ? 0.04 : 0.05
  const usableH = 0.9
  const h = usableH / n
  const y = 0.05 + index * h
  return {
    x: marginX,
    y,
    w: 1 - marginX * 2,
    h: Math.max(h - 0.02, 0.08),
  }
}

export function mergeLayersWithCode(prevLayers, extracted, videoFormat) {
  const prevByVar = Object.fromEntries((prevLayers || []).map((l) => [l.varName, l]))
  return extracted.map((ext, i) => {
    const old = prevByVar[ext.varName]
    if (old) {
      return {
        ...old,
        label: ext.label,
        type: ext.type,
        visible: old.visible !== false,
      }
    }
    return {
      ...ext,
      rect: defaultRectForLayer(i, extracted.length, videoFormat),
      scale: 1,
      zIndex: i,
    }
  })
}

export function fallbackLayers(videoFormat = 'shorts') {
  const names =
    videoFormat === 'landscape'
      ? [
          { varName: 'figure', label: 'Hình trái', type: 'group' },
          { varName: 'text_panel', label: 'Panel chữ', type: 'text' },
        ]
      : [
          { varName: 'problem_block', label: 'Đề / tiêu đề', type: 'text' },
          { varName: 'figure', label: 'Hình / đồ thị', type: 'group' },
          { varName: 'solution_stack', label: 'Lời giải', type: 'text' },
        ]
  return names.map((n, i) => ({
    id: uid(),
    ...n,
    visible: true,
    zIndex: i,
    scale: 1,
    rect: defaultRectForLayer(i, names.length, videoFormat),
  }))
}

function layerCenter(rect) {
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2 }
}

export function rectDeltaToManimShift(rect, baseRect, videoFormat = 'shorts') {
  const frameW = videoFormat === 'landscape' ? 14 : 4.5
  const frameH = 8
  const a = layerCenter(rect)
  const b = layerCenter(baseRect)
  return {
    x: round3((a.cx - b.cx) * frameW),
    y: round3(-(a.cy - b.cy) * frameH),
  }
}

export function manimShiftToRectDelta(shift, baseRect, videoFormat = 'shorts') {
  const frameW = videoFormat === 'landscape' ? 14 : 4.5
  const frameH = 8
  const b = layerCenter(baseRect)
  const cx = b.cx + (shift?.x || 0) / frameW
  const cy = b.cy - (shift?.y || 0) / frameH
  return {
    x: cx - baseRect.w / 2,
    y: cy - baseRect.h / 2,
    w: baseRect.w,
    h: baseRect.h,
  }
}

export function layerTransformsFromState(layers, baseLayers, videoFormat) {
  const baseByVar = Object.fromEntries((baseLayers || []).map((l) => [l.varName, l]))
  const out = []
  for (const layer of layers || []) {
    if (layer.visible === false) continue
    const base = baseByVar[layer.varName]
    if (!base?.rect || !layer.rect) continue
    const shift = rectDeltaToManimShift(layer.rect, base.rect, videoFormat)
    const scale = round3(layer.scale || 1)
    const hasShift = Math.abs(shift.x) > 0.001 || Math.abs(shift.y) > 0.001
    const hasScale = Math.abs(scale - 1) > 0.001
    if (hasShift || hasScale) {
      out.push({
        varName: layer.varName,
        shift,
        scale: hasScale ? scale : 1,
        zIndex: layer.zIndex ?? 0,
      })
    }
  }
  return out.sort((a, b) => a.zIndex - b.zIndex)
}

function formatShift(shift) {
  const parts = []
  if (Math.abs(shift.x) >= 0.001) parts.push(`RIGHT * ${shift.x}`)
  if (Math.abs(shift.y) >= 0.001) parts.push(`UP * ${shift.y}`)
  return parts.join(' + ') || 'ORIGIN'
}

export function buildLayersBlock(transforms) {
  if (!transforms?.length) return ''
  const lines = [STUDIO_LAYERS_MARKER]
  for (const t of transforms) {
    lines.push(`        try:`)
    lines.push(`            _obj = ${t.varName}`)
    if (Math.abs(t.shift.x) >= 0.001 || Math.abs(t.shift.y) >= 0.001) {
      lines.push(`            _obj.shift(${formatShift(t.shift)})`)
    }
    if (t.scale && Math.abs(t.scale - 1) > 0.001) {
      lines.push(`            _obj.scale(${t.scale})`)
    }
    lines.push(`        except (NameError, AttributeError):`)
    lines.push(`            pass`)
  }
  const zSorted = [...transforms].sort((a, b) => a.zIndex - b.zIndex)
  for (const t of zSorted) {
    lines.push(`        try:`)
    lines.push(`            self.bring_to_front(${t.varName})`)
    lines.push(`        except (NameError, AttributeError):`)
    lines.push(`            pass`)
  }
  return lines.join('\n')
}

export function buildFullframeBlock(varNames, videoFormat = 'shorts') {
  if (videoFormat !== 'shorts' || !varNames?.length) return ''
  const lines = [STUDIO_FULLFRAME_MARKER]
  lines.push('        _ff_margin = 0.12')
  lines.push('        _ff_safe_w = config.frame_width - 2 * _ff_margin')
  lines.push('        _ff_left = LEFT * (config.frame_width / 2 - _ff_margin)')
  lines.push('        _ff_parts = []')
  for (const name of varNames) {
    lines.push('        try:')
    lines.push(`            _ff_parts.append(${name})`)
    lines.push('        except NameError:')
    lines.push('            pass')
  }
  lines.push('        if _ff_parts:')
  lines.push('            _ff_all = VGroup(*_ff_parts)')
  lines.push('            _ff_all.arrange(DOWN, buff=0.12, aligned_edge=LEFT)')
  lines.push('            _ff_all.scale_to_fit_width(_ff_safe_w)')
  lines.push('            if _ff_all.height > config.frame_height - 2 * _ff_margin:')
  lines.push('                _ff_all.scale_to_fit_height(config.frame_height - 2 * _ff_margin)')
  lines.push('            _ff_all.to_edge(UP, buff=_ff_margin).align_to(_ff_left, LEFT)')
  return lines.join('\n')
}

function stripMarkedBlock(code, marker) {
  const lines = (code || '').split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    if (line.includes(marker)) {
      skipping = true
      continue
    }
    if (skipping) {
      const t = line.trim()
      if (
        t.startsWith('try:') ||
        t.startsWith('except') ||
        t === 'pass' ||
        t.startsWith('_obj') ||
        t.startsWith('_ff_') ||
        t.startsWith('if _ff_') ||
        t.includes('.shift(') ||
        t.includes('.scale(') ||
        t.includes('bring_to_front') ||
        t.includes('VGroup(') ||
        t.includes('.arrange(') ||
        t.includes('.scale_to_fit') ||
        t.includes('.to_edge(') ||
        t.includes('.align_to(') ||
        t === ''
      ) {
        continue
      }
      skipping = false
    }
    if (!skipping) out.push(line)
  }
  return out.join('\n').trimEnd() + '\n'
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
  }
  if (lastWait >= 0) return lastWait
  return body.length
}

function injectBlockBeforeEndOfConstruct(code, block) {
  if (!block) return code
  let next = code
  const constructMatch = next.match(/\n(\s+)def construct\(self\):\s*\n/)
  if (!constructMatch) {
    return `${next.trimEnd()}\n\n${block}\n`
  }
  const indent = constructMatch[1]
  const methodStart = next.indexOf(constructMatch[0]) + constructMatch[0].length
  const afterConstruct = next.slice(methodStart)
  const insertAt = methodStart + findConstructInsertPoint(afterConstruct, indent)
  return next.slice(0, insertAt) + `\n${block}\n` + next.slice(insertAt)
}

export function injectLayersIntoCode(code, transforms, options = {}) {
  let next = stripMarkedBlock(code, STUDIO_LAYERS_MARKER)
  next = stripMarkedBlock(next, STUDIO_FULLFRAME_MARKER)

  const block = buildLayersBlock(transforms)
  if (block) {
    next = injectBlockBeforeEndOfConstruct(next, block)
  }
  if (options.fullframe && options.varNames?.length) {
    const ff = buildFullframeBlock(options.varNames, options.videoFormat)
    next = injectBlockBeforeEndOfConstruct(next, ff)
  }
  return next
}

export function parseLayersFromCode(code) {
  const transforms = []
  const text = code || ''
  if (!text.includes(STUDIO_LAYERS_MARKER)) return transforms

  const reBlock = /try:\s*\n\s*_obj = (\w+)\s*\n(?:\s*_obj\.shift\(([^)]*)\)\s*\n)?(?:\s*_obj\.scale\(([^)]+)\)\s*\n)?/g
  let m
  while ((m = reBlock.exec(text)) !== null) {
    const varName = m[1]
    const shiftStr = m[2] || ''
    const scale = parseFloat(m[3] || '1') || 1
    const sx = /RIGHT\s*\*\s*([-\d.]+)/.exec(shiftStr)
    const sy = /UP\s*\*\s*([-\d.]+)/.exec(shiftStr)
    transforms.push({
      varName,
      shift: { x: parseFloat(sx?.[1] || '0') || 0, y: parseFloat(sy?.[1] || '0') || 0 },
      scale,
      zIndex: transforms.length,
    })
  }
  return transforms
}

export function applyTransformsToLayers(layers, baseLayers, transforms, videoFormat) {
  const tByVar = Object.fromEntries(transforms.map((t) => [t.varName, t]))
  const baseByVar = Object.fromEntries((baseLayers || []).map((l) => [l.varName, l]))
  return layers.map((layer) => {
    const t = tByVar[layer.varName]
    const base = baseByVar[layer.varName]
    if (!t || !base?.rect) return layer
    const rect = manimShiftToRectDelta(t.shift, base.rect, videoFormat)
    return { ...layer, rect, scale: t.scale || 1, zIndex: t.zIndex ?? layer.zIndex }
  })
}

export function moveLayerZ(layers, id, direction) {
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex)
  const idx = sorted.findIndex((l) => l.id === id)
  if (idx < 0) return layers
  const j = idx + direction
  if (j < 0 || j >= sorted.length) return layers
  ;[sorted[idx], sorted[j]] = [sorted[j], sorted[idx]]
  return sorted.map((l, i) => ({ ...l, zIndex: i }))
}

export function updateLayer(layers, id, patch) {
  return layers.map((l) => (l.id === id ? { ...l, ...patch } : l))
}

// Backward compat exports
export {
  STUDIO_LAYERS_MARKER as STUDIO_LAYOUT_MARKER,
  injectLayersIntoCode as injectLayoutShiftsIntoCode,
  parseLayersFromCode as parseLayoutShiftsFromCode,
}

export function defaultLayoutSlots(videoFormat) {
  return fallbackLayers(videoFormat)
}

export function shiftsFromSlots(layers, baseLayers, videoFormat) {
  const transforms = layerTransformsFromState(layers, baseLayers, videoFormat)
  const out = {}
  for (const t of transforms) {
    out[t.varName] = { ...t.shift, scale: t.scale }
  }
  return out
}

export function applyShiftsToSlots(layers, baseLayers, shifts, videoFormat) {
  const transforms = Object.entries(shifts || {}).map(([varName, v], i) => ({
    varName,
    shift: { x: v.x || 0, y: v.y || 0 },
    scale: v.scale || 1,
    zIndex: i,
  }))
  return applyTransformsToLayers(layers, baseLayers, transforms, videoFormat)
}
