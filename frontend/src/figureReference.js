/** Chuyển manifest GeoGebra → tọa độ Manim + mã tham chiếu + figure_objects JSON. */

function round3(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x * 1000) / 1000
}

function parseArgList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function kindLabel(kind) {
  const map = {
    dot: 'điểm',
    segment: 'cạnh',
    line: 'đường',
    circle: 'tròn',
    polygon: 'đa giác',
    angle: 'góc',
    arc: 'cung',
    label: 'nhãn',
  }
  return map[kind] || kind
}

export function normalizeFigureCoords(objects) {
  const points = (objects || []).filter(
    (o) => o.kind === 'dot' && Number.isFinite(o.x) && Number.isFinite(o.y),
  )
  if (!points.length) {
    return { scale: 1, cx: 0, cy: 0 }
  }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const w = Math.max(maxX - minX, 0.5)
  const h = Math.max(maxY - minY, 0.5)
  const scale = Math.min(5.5 / w, 3.2 / h, 2.5)
  return { scale, cx, cy }
}

export function toManimXY(x, y, norm) {
  return [round3((x - norm.cx) * norm.scale), round3((y - norm.cy) * norm.scale)]
}

export function defaultConstructionOrder(manifest) {
  if (!manifest?.objects?.length) return []
  const visible = manifest.objects.filter((o) => o.visible !== false && o.kind !== 'label')
  const order = (manifest.constructionOrder || []).filter((id) =>
    visible.some((o) => o.id === id),
  )
  const rest = visible.map((o) => o.id).filter((id) => !order.includes(id))
  const labels = manifest.objects.filter((o) => o.kind === 'label' && o.visible !== false)
  return [...order, ...rest, ...labels.map((o) => o.id)]
}

export function manifestToFigureObjects(manifest, constructionOrder) {
  if (!manifest?.objects?.length) return []
  const norm = normalizeFigureCoords(manifest.objects)
  const byId = Object.fromEntries(manifest.objects.map((o) => [o.id, o]))
  const order = constructionOrder?.length
    ? constructionOrder
    : defaultConstructionOrder(manifest)

  const out = []
  for (const id of order) {
    const o = byId[id]
    if (!o || o.visible === false) continue
    if (o.kind === 'dot') {
      const [mx, my] = toManimXY(o.x, o.y, norm)
      out.push({
        id: o.id,
        kind: 'dot',
        x: mx,
        y: my,
        label: o.label || o.id,
        color: '#8b1a1a',
        construction_step: out.length + 1,
      })
    } else if (o.kind === 'segment' || o.kind === 'line') {
      out.push({
        id: o.id,
        kind: o.kind === 'line' ? 'line' : 'segment',
        from: o.from,
        to: o.to,
        color: '#1e40af',
        construction_step: out.length + 1,
      })
    } else if (o.kind === 'circle') {
      const center = byId[o.center]
      const [mx, my] = toManimXY(center?.x ?? 0, center?.y ?? 0, norm)
      out.push({
        id: o.id,
        kind: 'circle',
        center: o.center,
        x: mx,
        y: my,
        radius: round3((o.radius || 1) * norm.scale),
        color: '#3d6b2f',
        construction_step: out.length + 1,
      })
    } else if (o.kind === 'angle') {
      out.push({
        id: o.id,
        kind: 'angle_mark',
        points: o.points || [],
        color: '#FFD700',
        construction_step: out.length + 1,
      })
    } else if (o.kind === 'polygon') {
      out.push({
        id: o.id,
        kind: 'polygon',
        vertices: o.vertices || [],
        color: '#1e40af',
        construction_step: out.length + 1,
      })
    } else if (o.kind === 'label') {
      out.push({
        id: o.id,
        kind: 'label',
        text: o.text || o.id,
        attach_to: o.attachTo,
        construction_step: out.length + 1,
      })
    }
  }
  return out
}

function manimPosExpr(mx, my) {
  if (mx === 0 && my === 0) return 'ORIGIN'
  if (mx === 0) return my > 0 ? `UP * ${my}` : `DOWN * ${Math.abs(my)}`
  if (my === 0) return mx > 0 ? `RIGHT * ${mx}` : `LEFT * ${Math.abs(mx)}`
  const parts = []
  if (mx > 0) parts.push(`RIGHT * ${mx}`)
  else if (mx < 0) parts.push(`LEFT * ${Math.abs(mx)}`)
  if (my > 0) parts.push(`UP * ${my}`)
  else if (my < 0) parts.push(`DOWN * ${Math.abs(my)}`)
  return `ORIGIN + ${parts.join(' + ')}`
}

export function buildManimReferenceCode(manifest, constructionOrder) {
  if (!manifest?.objects?.length) {
    return '# Chưa có manifest hình — hãy Lưu hình GeoGebra trước.'
  }

  const norm = normalizeFigureCoords(manifest.objects)
  const byId = Object.fromEntries(manifest.objects.map((o) => [o.id, o]))
  const order = constructionOrder?.length
    ? constructionOrder
    : defaultConstructionOrder(manifest)

  const lines = [
    '# === Mã tham chiếu tọa độ Manim (từ GeoGebra đã lưu) ===',
    '# Dùng làm khung: copy vào scenes/*.py hoặc gửi kèm Gemini Pro Bước 2',
    '# Tọa độ GGB đã chuẩn hóa về khung Manim (scale_to_fit_height ~3.6)',
    '',
    'import numpy as np',
    'from manim import *',
    '',
    'STYLE_VN = {',
    '    "bg": "#0d1117", "circle": "#3d6b2f", "segment": "#1e40af",',
    '    "point": "#8b1a1a", "text": "#FFFFFF", "highlight": "#FFD700",',
    '}',
    '',
    'def vn(text, size=22, color=None):',
    '    return Text(text, font="Arial", font_size=size,',
    '                color=color or STYLE_VN["text"], disable_ligatures=True)',
    '',
    '# --- Điểm ---',
  ]

  for (const o of manifest.objects) {
    if (o.kind !== 'dot' || o.visible === false) continue
    const [mx, my] = toManimXY(o.x, o.y, norm)
    const pos = manimPosExpr(mx, my)
    lines.push(`${o.id} = Dot(${pos}, color=STYLE_VN["point"])`)
    if (o.label && o.label !== o.id) {
      lines.push(`l${o.id} = vn("${o.label}", 22).next_to(${o.id}, DL, buff=0.06)`)
    }
  }

  lines.push('', '# --- Cạnh / đường ---')
  for (const o of manifest.objects) {
    if ((o.kind !== 'segment' && o.kind !== 'line') || o.visible === false) continue
    if (!o.from || !o.to) continue
    const stroke = o.kind === 'line' ? '' : ', stroke_width=3'
    lines.push(
      `${o.id} = Line(${o.from}.get_center(), ${o.to}.get_center(), color=STYLE_VN["segment"]${stroke})`,
    )
  }

  lines.push('', '# --- Đường tròn ---')
  for (const o of manifest.objects) {
    if (o.kind !== 'circle' || o.visible === false) continue
    const center = byId[o.center]
    if (!center) continue
    const [mx, my] = toManimXY(center.x, center.y, norm)
    const pos = manimPosExpr(mx, my)
    const r = round3((o.radius || 1) * norm.scale)
    lines.push(
      `${o.id} = Circle(radius=${r}, color=STYLE_VN["circle"], stroke_width=3).move_to(${pos})`,
    )
  }

  lines.push('', '# --- Góc (nếu có) ---')
  for (const o of manifest.objects) {
    if (o.kind !== 'angle' || o.visible === false) continue
    const pts = o.points || []
    if (pts.length >= 3) {
      lines.push(
        `# ∠${pts[0]}${pts[1]}${pts[2]} tại ${pts[1]} — góc TRONG <180°:`,
      )
      lines.push(
        `ang_${pts[1]}_${pts[0]}${pts[2]} = interior_angle_at(${pts[1]}, ${pts[0]}, ${pts[2]}, radius=0.28, color=STYLE_VN["highlight"])`,
      )
      lines.push(
        `# Góc vuông tại ${pts[1]}: right_angle_at(${pts[1]}, ${pts[0]}, ${pts[2]}, length=0.22, color=STYLE_VN["highlight"])`,
      )
    }
  }

  lines.push('', 'figure = VGroup(')
  const figParts = order.filter((id) => {
    const o = byId[id]
    return o && o.visible !== false && o.kind !== 'label'
  })
  lines.push(`    ${figParts.join(', ') || '...'}`)
  lines.push(')')
  lines.push('# Sau ẩn đề: fit_figure_full_width(figure, config.frame_height*FIGURE_RATIO); figure.to_edge(UP, buff=TOP_BUFF); center_x(figure)')
  lines.push('# Lời giải: next_to(figure, DOWN, buff=0.08); center_x(dòng) — CANH GIỮA')
  lines.push('')
  lines.push('# --- Thứ tự dựng hình (problem_and_figure beat) ---')
  lines.push(`CONSTRUCTION_ORDER = ${JSON.stringify(order)}`)
  lines.push('')
  lines.push('# Ví dụ animation tuần tự:')
  lines.push('# for obj_id in CONSTRUCTION_ORDER:')
  lines.push('#     mobj = locals()[obj_id]')
  lines.push('#     self.play(Create(mobj) if isinstance(mobj, VMobject) else FadeIn(mobj))')
  lines.push('#     self.wait(0.4)')

  return lines.join('\n')
}

export function buildFigureContextBlock({
  constructionOrder,
  figureReferenceCode,
  ggbCommands,
  figureObjects,
  hasSavedImage,
}) {
  const parts = []
  if (hasSavedImage) {
    parts.push(
      '⚠️ Giáo viên đã LƯU ảnh hình GeoGebra — nếu chat hỗ trợ ảnh, hãy xin ảnh đính kèm từ Studio.',
    )
  }
  if (constructionOrder?.length) {
    parts.push(
      `THỨ TỰ DỰNG HÌNH (BẮT BUỘC — beat problem_and_figure, figure_targets theo đúng thứ tự):\n${constructionOrder.map((id, i) => `${i + 1}. ${id}`).join('\n')}`,
    )
  }
  if (figureObjects?.length) {
    parts.push(
      `figure_objects (tọa độ Manim đã tính — dùng trong JSON):\n${JSON.stringify(figureObjects, null, 2)}`,
    )
  }
  if (figureReferenceCode?.trim()) {
    parts.push(`MÃ THAM CHIẾU TỌA ĐỘ MANIM:\n${figureReferenceCode.trim()}`)
  }
  if (ggbCommands?.length) {
    parts.push(`LỆNH GEOGEBRA (sau chỉnh sửa):\n${ggbCommands.join('\n')}`)
  }
  return parts.join('\n\n')
}

export { kindLabel, round3 }
