import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/** Bảng màu NTSM: điểm đỏ đậm, đoạn xanh dương, tròn xanh lục */
export const NTSM_COLORS = {
  point: [139, 26, 26],
  label: [220, 38, 38],
  segment: [30, 64, 175],
  line: [30, 64, 175],
  circle: [61, 107, 47],
  angle: [96, 165, 250],
}

function applyCommands(api, commands) {
  try {
    api.setErrorDialogsActive?.(false)
  } catch {
    /* ignore */
  }

  const hideLater = []

  for (const raw of commands) {
    const cmd = String(raw || '').trim()
    if (!cmd) continue

    if (cmd.startsWith('#')) {
      const hideMatch = cmd.match(/^#\s*hide\s*:\s*(.+)$/i)
      if (hideMatch) {
        hideMatch[1]
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((name) => hideLater.push(name))
      }
      continue
    }

    const name = cmd.replace(/;+\s*$/, '').trim()

    if (/^SetVisibleInView\b/i.test(name)) {
      const m = name.match(
        /^SetVisibleInView\s*[(\[]\s*([^,\])]+)\s*,\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i,
      )
      if (m) safeSetVisible(api, m[1].trim(), parseBool(m[3]))
      continue
    }

    if (/^SetVisible\b/i.test(name)) {
      const m = name.match(
        /^SetVisible\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i,
      )
      if (m) safeSetVisible(api, m[1].trim(), parseBool(m[2]))
      continue
    }

    if (/^ShowLabel\b/i.test(name)) {
      const m = name.match(
        /^ShowLabel\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i,
      )
      if (m) {
        try {
          api.setLabelVisible?.(m[1].trim(), parseBool(m[2]))
        } catch {
          /* ignore */
        }
      }
      continue
    }

    if (/^SetColor\b/i.test(name)) {
      handleSetColor(api, name)
      continue
    }

    if (/^SetLineThickness\b/i.test(name) || /^SetLineWidth\b/i.test(name)) {
      const m = name.match(
        /^SetLine(?:Thickness|Width)\s*[(\[]\s*([^,\])]+)\s*,\s*([\d.]+)\s*[)\]]/i,
      )
      if (m) {
        try {
          api.setLineThickness?.(m[1].trim(), Number(m[2]))
        } catch {
          /* ignore */
        }
      }
      continue
    }

    if (/^SetLineStyle\b/i.test(name)) {
      const m = name.match(
        /^SetLineStyle\s*[(\[]\s*([^,\])]+)\s*,\s*([\d.]+)\s*[)\]]/i,
      )
      if (m) {
        try {
          api.setLineStyle?.(m[1].trim(), Number(m[2]))
        } catch {
          /* ignore */
        }
      }
      continue
    }

    if (/^SetPointSize\b/i.test(name)) {
      const m = name.match(
        /^SetPointSize\s*[(\[]\s*([^,\])]+)\s*,\s*([\d.]+)\s*[)\]]/i,
      )
      if (m) {
        try {
          api.setPointSize?.(m[1].trim(), Number(m[2]))
        } catch {
          /* ignore */
        }
      }
      continue
    }

    if (
      /^SetFixed\b/i.test(name) ||
      /^SetCaption\b/i.test(name) ||
      /^SetLayer\b/i.test(name)
    ) {
      continue
    }

    try {
      api.evalCommand(name)
    } catch {
      /* ignore */
    }
  }

  for (const obj of hideLater) safeSetVisible(api, obj, false)
}

export function applyNtsmTheme(api) {
  if (!api || typeof api.getObjectNumber !== 'function') return

  try {
    api.setAxesVisible?.(false, false)
    api.setGridVisible?.(false)
  } catch {
    /* ignore */
  }

  const n = api.getObjectNumber()
  for (let i = 0; i < n; i++) {
    let name
    try {
      name = api.getObjectName(i)
    } catch {
      continue
    }
    if (!name) continue
    try {
      if (typeof api.getVisible === 'function' && !api.getVisible(name)) continue
    } catch {
      /* ignore */
    }

    let type = ''
    try {
      type = String(api.getObjectType(name) || '').toLowerCase()
    } catch {
      continue
    }

    try {
      if (type === 'point' || type === 'point3d') {
        api.setColor?.(name, ...NTSM_COLORS.point)
        api.setPointSize?.(name, 5)
        api.setPointStyle?.(name, 0)
      } else if (type === 'circle' || type === 'conic') {
        api.setColor?.(name, ...NTSM_COLORS.circle)
        api.setLineThickness?.(name, 3)
      } else if (
        type === 'segment' ||
        type === 'line' ||
        type === 'ray' ||
        type === 'vector' ||
        type === 'polyline' ||
        type === 'polygon'
      ) {
        api.setColor?.(name, ...NTSM_COLORS.segment)
        api.setLineThickness?.(name, type === 'segment' || type === 'polygon' ? 3 : 2)
      } else if (type === 'angle') {
        api.setColor?.(name, ...NTSM_COLORS.angle)
      }
    } catch {
      /* ignore */
    }
  }
}

function parseBool(raw) {
  const v = String(raw).trim().toLowerCase().replace(/["']/g, '')
  if (v === 'false' || v === '0' || v === 'no') return false
  return true
}

function safeSetVisible(api, obj, visible) {
  try {
    api.setVisible?.(obj, visible)
  } catch {
    /* ignore */
  }
}

function handleSetColor(api, name) {
  if (typeof api.setColor !== 'function') return

  let m = name.match(
    /^SetColor\s*[(\[]\s*([^,\])]+)\s*,\s*"?#?([0-9A-Fa-f]{6})"?\s*[)\]]/i,
  )
  if (m) {
    const hex = m[2]
    try {
      api.setColor(
        m[1].trim(),
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      )
    } catch {
      /* ignore */
    }
    return
  }

  m = name.match(/^SetColor\s*[(\[]\s*([^,\])]+)\s*,\s*"([^"]+)"\s*[)\]]/i)
  if (m) {
    const rgb = namedColorToRgb(m[2])
    if (rgb) {
      try {
        api.setColor(m[1].trim(), ...rgb)
      } catch {
        /* ignore */
      }
    }
    return
  }

  m = name.match(
    /^SetColor\s*[(\[]\s*([^,\])]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*[)\]]/i,
  )
  if (m) {
    try {
      api.setColor(m[1].trim(), Number(m[2]), Number(m[3]), Number(m[4]))
    } catch {
      /* ignore */
    }
  }
}

function namedColorToRgb(name) {
  const map = {
    red: [220, 38, 38],
    green: [61, 107, 47],
    blue: [30, 64, 175],
    black: [0, 0, 0],
    white: [255, 255, 255],
    orange: [255, 165, 0],
    yellow: [255, 255, 0],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
  }
  return map[String(name).toLowerCase()] || null
}

function toDataUrl(b64OrUrl, mime = 'image/png') {
  const s = String(b64OrUrl || '')
  if (s.startsWith('data:')) return s
  return `data:${mime};base64,${s}`
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

function canvasToDataUrl(hostEl) {
  if (!hostEl) return null
  const canvases = Array.from(hostEl.querySelectorAll('canvas')).sort(
    (a, b) => b.width * b.height - a.width * a.height,
  )
  const canvas = canvases[0]
  if (!canvas || canvas.width < 2) return null
  try {
    const dataUrl = canvas.toDataURL('image/png')
    if (!dataUrl || dataUrl === 'data:,') return null
    return dataUrl
  } catch {
    return null
  }
}

/** Lấy PNG dạng dataUrl (không tự tải — để UI iPad xử lý Share/xem trước) */
async function capturePngDataUrl(api, hostEl) {
  if (typeof api.getPNGBase64 === 'function') {
    try {
      // DPI = undefined: GeoGebra docs — DPI chậm, dễ treo trên iPad/Safari
      const b64 = api.getPNGBase64(2, false, undefined)
      if (b64) return toDataUrl(b64)
    } catch {
      /* continue */
    }
    try {
      const b64 = api.getPNGBase64(1.5, false)
      if (b64) return toDataUrl(b64)
    } catch {
      /* continue */
    }
  }

  if (typeof api.getScreenshotBase64 === 'function') {
    try {
      const data = await new Promise((resolve, reject) => {
        let done = false
        api.getScreenshotBase64((val) => {
          if (done) return
          done = true
          if (!val) reject(new Error('Screenshot rỗng'))
          else resolve(val)
        })
        setTimeout(() => {
          if (!done) {
            done = true
            reject(new Error('Timeout screenshot'))
          }
        }, 5000)
      })
      return toDataUrl(data)
    } catch {
      /* continue */
    }
  }

  const fromCanvas = canvasToDataUrl(hostEl)
  if (fromCanvas) return fromCanvas

  throw new Error('Không chụp được ảnh từ GeoGebra')
}

function normalizeSvgText(raw) {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null

  if (s.startsWith('data:image/svg+xml')) {
    const comma = s.indexOf(',')
    if (comma < 0) return null
    const meta = s.slice(0, comma)
    const data = s.slice(comma + 1)
    try {
      s = /;base64/i.test(meta) ? atob(data) : decodeURIComponent(data)
    } catch {
      return null
    }
  }

  if (!/<svg[\s>]/i.test(s)) return null
  return s
}

function prepareGraphicsForExport(api) {
  try {
    api.setPerspective?.('G')
  } catch {
    /* ignore */
  }
  try {
    // Một số bản GeoGebra chỉ export đúng khi Graphics View 1 active
    api.setActiveView?.(1)
  } catch {
    /* ignore */
  }
}

function waitFrames(n = 2) {
  return new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) resolve()
      else requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })
}

function exportSvgViaApi(api, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (err, val) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err) reject(err)
      else resolve(val)
    }

    const timer = setTimeout(() => finish(new Error('Timeout SVG')), timeoutMs)

    try {
      const maybe = api.exportSVG(function onSvg(val) {
        const svg = normalizeSvgText(val)
        if (svg) finish(null, svg)
        else finish(new Error('SVG rỗng'))
      })

      if (maybe && typeof maybe.then === 'function') {
        maybe
          .then((val) => {
            const svg = normalizeSvgText(val)
            if (svg) finish(null, svg)
            else finish(new Error('SVG rỗng'))
          })
          .catch((err) => finish(err || new Error('SVG thất bại')))
        return
      }

      const sync = normalizeSvgText(maybe)
      if (sync) finish(null, sync)
    } catch (err) {
      finish(err)
    }
  })
}

function svgFromDom(hostEl) {
  if (!hostEl) return null
  const el = hostEl.querySelector('svg')
  if (!el) return null
  try {
    const clone = el.cloneNode(true)
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }
    return normalizeSvgText(new XMLSerializer().serializeToString(clone))
  } catch {
    return null
  }
}

/** Fallback: bọc PNG trong SVG để luôn tải được (khi exportSVG treo trên Safari/iPad) */
function svgFromPngDataUrl(dataUrl, width = 800, height = 600) {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const href = String(dataUrl || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
    `  <image width="${w}" height="${h}" href="${href}" xlink:href="${href}"/>\n` +
    `</svg>`
  )
}

function readCanvasSize(hostEl) {
  if (!hostEl) return { width: 800, height: 600 }
  const canvases = Array.from(hostEl.querySelectorAll('canvas')).sort(
    (a, b) => b.width * b.height - a.width * a.height,
  )
  const canvas = canvases[0]
  if (!canvas || canvas.width < 2) return { width: 800, height: 600 }
  return { width: canvas.width, height: canvas.height }
}

async function captureSvgText(api, hostEl) {
  prepareGraphicsForExport(api)
  await waitFrames(2)

  if (typeof api.getSVG === 'function') {
    try {
      const svg = normalizeSvgText(api.getSVG())
      if (svg) return svg
    } catch {
      /* continue */
    }
  }

  if (typeof api.exportSVG === 'function') {
    // GeoGebra đôi khi treo callback trên Safari/iPad — không chặn UX quá lâu
    try {
      const svg = await exportSvgViaApi(api, 4500)
      if (svg) return svg
    } catch {
      /* fallback bên dưới */
    }
  }

  const fromDom = svgFromDom(hostEl)
  if (fromDom) return fromDom

  // Fallback đáng tin: PNG → SVG (file .svg vẫn mở được ở hầu hết app)
  try {
    const pngDataUrl = await capturePngDataUrl(api, hostEl)
    const { width, height } = readCanvasSize(hostEl)
    return svgFromPngDataUrl(pngDataUrl, width, height)
  } catch {
    /* ignore */
  }

  throw new Error('Không xuất được SVG từ GeoGebra')
}

function roundCoord(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x * 1000) / 1000
}

function isFreePointType(type) {
  return type === 'point' || type === 'point3d'
}

/**
 * Xuất lại lệnh GeoGebra từ trạng thái applet hiện tại
 * (sau kéo thả điểm tự do, tọa độ được cập nhật).
 */
export function exportConstructionCommands(api) {
  if (!api || typeof api.getObjectNumber !== 'function') return []

  const n = api.getObjectNumber()
  const names = []
  for (let i = 0; i < n; i++) {
    try {
      const name = api.getObjectName(i)
      if (name) names.push(name)
    } catch {
      /* ignore */
    }
  }

  const commands = []
  const hideLater = []

  for (const name of names) {
    let type = ''
    try {
      type = String(api.getObjectType(name) || '').toLowerCase()
    } catch {
      continue
    }

    // Bỏ qua đối tượng hệ thống / phụ trợ thường gặp
    if (!name || name.startsWith('_')) continue

    let cmd = ''
    try {
      if (typeof api.getCommandString === 'function') {
        cmd = String(api.getCommandString(name) || '').trim()
      }
    } catch {
      cmd = ''
    }

    // Điểm tự do: luôn lấy tọa độ hiện tại sau kéo thả
    if (isFreePointType(type)) {
      let independent = true
      try {
        if (typeof api.isIndependent === 'function') {
          independent = !!api.isIndependent(name)
        } else if (cmd && !/^\s*[A-Za-z_]\w*\s*=\s*\(/.test(cmd)) {
          independent = false
        }
      } catch {
        /* ignore */
      }
      if (independent && typeof api.getXcoord === 'function') {
        try {
          const x = roundCoord(api.getXcoord(name))
          const y = roundCoord(api.getYcoord(name))
          commands.push(`${name} = (${x}, ${y})`)
          cmd = '' // đã ghi
        } catch {
          /* fall through */
        }
      }
    }

    if (cmd) {
      // Chuẩn hóa: đảm bảo có "Name = ..." nếu API chỉ trả biểu thức
      if (!cmd.includes('=') && /^[A-Za-z_]/.test(name)) {
        commands.push(`${name} = ${cmd}`)
      } else {
        commands.push(cmd)
      }
    } else if (!isFreePointType(type) && typeof api.getDefinitionString === 'function') {
      try {
        const def = String(api.getDefinitionString(name) || '').trim()
        if (def && def !== name) {
          commands.push(`${name} = ${def}`)
        }
      } catch {
        /* ignore */
      }
    }

    // Visibility
    try {
      let visible = true
      if (typeof api.getVisible === 'function') {
        try {
          visible = !!api.getVisible(name, 1)
        } catch {
          visible = !!api.getVisible(name)
        }
      }
      if (!visible) hideLater.push(name)
    } catch {
      /* ignore */
    }
  }

  for (const name of hideLater) {
    commands.push(`SetVisibleInView(${name}, 1, false)`)
  }

  return commands
}

export function sanitizeGgbCommands(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (/^SetVisibleInView\b/i.test(t)) return line
      const m = t.match(/^SetVisible\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i)
      if (m && !parseBool(m[2])) {
        return `SetVisibleInView(${m[1].trim()}, 1, false)`
      }
      if (m && parseBool(m[2])) {
        return `SetVisibleInView(${m[1].trim()}, 1, true)`
      }
      return line
    })
    .join('\n')
}

const GeoGebraApplet = forwardRef(function GeoGebraApplet(
  { commands = [], mode = 'geometry', revision = 0, onReady },
  ref,
) {
  const hostRef = useRef(null)
  const apiRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getApi: () => apiRef.current,
    applyTheme: () => {
      if (apiRef.current) applyNtsmTheme(apiRef.current)
    },
    /** Xuất lệnh từ trạng thái hiện tại (sau kéo thả) */
    exportCommands: () => {
      const api = apiRef.current
      if (!api) throw new Error('Applet chưa sẵn sàng — đợi hình load xong.')
      return exportConstructionCommands(api)
    },
    /** Chụp PNG + xuất lệnh sau khi chỉnh hình */
    saveSnapshot: async (filename = `geogebra-saved-${Date.now()}.png`) => {
      const api = apiRef.current
      if (!api) throw new Error('Applet chưa sẵn sàng — đợi hình load xong.')
      const commands = exportConstructionCommands(api)
      const dataUrl = await capturePngDataUrl(api, hostRef.current)
      const blob = await dataUrlToBlob(dataUrl)
      return {
        kind: 'png',
        filename,
        dataUrl,
        blob,
        mime: 'image/png',
        commands,
      }
    },
    /** Trả về { kind, filename, dataUrl?, text?, blob, mime } để UI iPad Share/xem trước */
    capturePNG: async (filename = `geogebra-${Date.now()}.png`) => {
      const api = apiRef.current
      if (!api) throw new Error('Applet chưa sẵn sàng — đợi hình load xong.')
      const dataUrl = await capturePngDataUrl(api, hostRef.current)
      const blob = await dataUrlToBlob(dataUrl)
      return {
        kind: 'png',
        filename,
        dataUrl,
        blob,
        mime: 'image/png',
      }
    },
    captureSVG: async (filename = `geogebra-${Date.now()}.svg`) => {
      const api = apiRef.current
      if (!api) throw new Error('Applet chưa sẵn sàng — đợi hình load xong.')
      const text = await captureSvgText(api, hostRef.current)
      const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
      return {
        kind: 'svg',
        filename,
        text,
        dataUrl,
        blob,
        mime: 'image/svg+xml',
      }
    },
  }))

  // Chỉ remount khi bấm "Áp dụng lệnh" (revision) hoặc đổi mode — không reset khi kéo thả / lưu
  const commandsRef = useRef(commands)
  commandsRef.current = commands

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    let cancelled = false
    host.innerHTML = ''

    const appName =
      mode === '3d' ? '3d' : mode === 'graphing' ? 'graphing' : 'geometry'

    const params = {
      appName,
      width: host.clientWidth || 640,
      height: Math.max(320, host.clientHeight || 360),
      showToolBar: true,
      showAlgebraInput: true,
      showMenuBar: false,
      enableRightClick: true,
      enableShiftDragZoom: true,
      showResetIcon: true,
      language: 'vi',
      showErrorDialogs: false,
      appletOnLoad: (api) => {
        if (cancelled) return
        apiRef.current = api
        try {
          api.setErrorDialogsActive?.(false)
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          if (cancelled) return
          try {
            applyCommands(api, commandsRef.current)
            applyNtsmTheme(api)
            onReady?.(api)
          } catch {
            /* ignore */
          }
        }, 80)
      },
    }

    const start = () => {
      if (cancelled || typeof window.GGBApplet === 'undefined') return
      const applet = new window.GGBApplet(params, true)
      applet.inject(host)
    }

    if (typeof window.GGBApplet !== 'undefined') {
      start()
    } else {
      const timer = setInterval(() => {
        if (typeof window.GGBApplet !== 'undefined') {
          clearInterval(timer)
          start()
        }
      }, 200)
      return () => {
        cancelled = true
        clearInterval(timer)
        host.innerHTML = ''
        apiRef.current = null
      }
    }

    return () => {
      cancelled = true
      host.innerHTML = ''
      apiRef.current = null
    }
  }, [mode, revision, onReady])

  return <div className="ggb-host" ref={hostRef} />
})

export default GeoGebraApplet
