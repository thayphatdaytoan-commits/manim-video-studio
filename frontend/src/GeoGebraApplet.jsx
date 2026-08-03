import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/** Bảng màu NTSM: điểm đỏ đậm, đoạn xanh dương, tròn xanh lục */
export const NTSM_COLORS = {
  point: [139, 26, 26], // maroon
  label: [220, 38, 38], // bright red (GeoGebra thường dùng màu điểm cho nhãn)
  segment: [30, 64, 175], // dark blue
  line: [30, 64, 175],
  circle: [61, 107, 47], // olive green
  angle: [96, 165, 250], // light blue arcs
}

/**
 * Chạy lệnh GeoGebra an toàn trên applet web.
 * Scripting (SetVisible/SetColor/...) dùng JS API — không evalCommand.
 */
function applyCommands(api, commands) {
  try {
    if (typeof api.setErrorDialogsActive === 'function') {
      api.setErrorDialogsActive(false)
    }
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

/** Áp màu NTSM lên mọi đối tượng đang hiện */
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
      /* ignore per-object */
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

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 500)
}

function downloadText(filename, text, mime) {
  downloadBlob(filename, new Blob([text], { type: mime }))
}

function downloadDataUrl(filename, dataUrl) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 500)
}

function canvasToPngDownload(hostEl, filename) {
  if (!hostEl) return false
  const canvases = Array.from(hostEl.querySelectorAll('canvas')).sort(
    (a, b) => b.width * b.height - a.width * a.height,
  )
  const canvas = canvases[0]
  if (!canvas || canvas.width < 2) return false
  try {
    const dataUrl = canvas.toDataURL('image/png')
    if (!dataUrl || dataUrl === 'data:,') return false
    downloadDataUrl(filename, dataUrl)
    return true
  } catch {
    return false
  }
}

async function exportPngLikeNtsm(api, hostEl, filename) {
  // 1) getPNGBase64 — ổn định nhất trên web
  if (typeof api.getPNGBase64 === 'function') {
    try {
      const b64 = api.getPNGBase64(2, false, 300)
      if (b64) {
        const href = String(b64).startsWith('data:')
          ? b64
          : `data:image/png;base64,${b64}`
        downloadDataUrl(filename, href)
        return { ok: true, method: 'getPNGBase64' }
      }
    } catch {
      /* continue */
    }
  }

  // 2) getScreenshotBase64 (callback) — cách NTSM dùng
  if (typeof api.getScreenshotBase64 === 'function') {
    await new Promise((resolve, reject) => {
      try {
        let done = false
        api.getScreenshotBase64((data) => {
          if (done) return
          done = true
          if (!data) {
            reject(new Error('getScreenshotBase64 trả về rỗng'))
            return
          }
          const href = String(data).startsWith('data:')
            ? data
            : `data:image/png;base64,${data}`
          downloadDataUrl(filename, href)
          resolve()
        })
        setTimeout(() => {
          if (!done) {
            done = true
            reject(new Error('Timeout getScreenshotBase64'))
          }
        }, 5000)
      } catch (err) {
        reject(err)
      }
    })
    return { ok: true, method: 'getScreenshotBase64' }
  }

  // 3) Chụp canvas DOM (iPad / fallback)
  if (canvasToPngDownload(hostEl, filename)) {
    return { ok: true, method: 'canvas' }
  }

  // 4) Lệnh ExportImage
  try {
    const ok = api.evalCommand(
      `ExportImage("filename","${filename}","type","png","scale",2,"view",1)`,
    )
    if (ok !== false) return { ok: true, method: 'ExportImage' }
  } catch {
    /* continue */
  }

  throw new Error(
    'Không xuất được PNG. Thử menu GeoGebra (☰ → Download as → PNG).',
  )
}

function exportSvgLikeNtsm(api, filename) {
  if (typeof api.exportSVG !== 'function') {
    throw new Error('Bản GeoGebra này chưa hỗ trợ xuất SVG.')
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (svg) => {
      if (settled) return
      settled = true
      if (!svg || !String(svg).includes('<svg')) {
        reject(new Error('Không thể xuất SVG.'))
        return
      }
      downloadText(filename, svg, 'image/svg+xml;charset=utf-8')
      resolve({ ok: true })
    }

    try {
      // NTSM: exportSVG(callback) nhận chuỗi SVG
      const maybe = api.exportSVG((svg) => finish(svg))
      if (typeof maybe === 'string' && maybe.includes('<svg')) {
        finish(maybe)
      }
      // Nếu callback không bao giờ gọi
      setTimeout(() => {
        if (!settled) reject(new Error('GeoGebra không trả SVG (timeout).'))
      }, 8000)
    } catch (err) {
      reject(err)
    }
  })
}

/** Chuẩn hoá lệnh: SetVisible → SetVisibleInView */
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
    exportPNG: async (filename = 'geogebra.png') => {
      const api = apiRef.current
      if (!api) throw new Error('Applet GeoGebra chưa sẵn sàng — đợi hình load xong.')
      return exportPngLikeNtsm(api, hostRef.current, filename)
    },
    exportSVG: async (filename = 'geogebra.svg') => {
      const api = apiRef.current
      if (!api) throw new Error('Applet GeoGebra chưa sẵn sàng — đợi hình load xong.')
      if (typeof api.getSVG === 'function') {
        const svg = api.getSVG()
        if (svg && String(svg).includes('<svg')) {
          downloadText(filename, svg, 'image/svg+xml;charset=utf-8')
          return { ok: true, method: 'getSVG' }
        }
      }
      return exportSvgLikeNtsm(api, filename)
    },
  }))

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
            applyCommands(api, commands)
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
  }, [commands, mode, revision, onReady])

  return <div className="ggb-host" ref={hostRef} />
})

export default GeoGebraApplet
