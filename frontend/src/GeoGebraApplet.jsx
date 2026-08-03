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
  a.click()
  URL.revokeObjectURL(url)
}

function downloadText(filename, text, mime) {
  downloadBlob(filename, new Blob([text], { type: mime }))
}

function downloadDataUrl(filename, dataUrl) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
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
    exportPNG: (filename = 'geogebra.png') => {
      const api = apiRef.current
      if (!api?.getPNGBase64) {
        throw new Error('Applet chưa sẵn sàng để xuất PNG')
      }
      const b64 = api.getPNGBase64(2, false, 150)
      if (!b64) throw new Error('Không lấy được PNG từ GeoGebra')
      downloadDataUrl(filename, `data:image/png;base64,${b64}`)
    },
    exportSVG: (filename = 'geogebra.svg') => {
      const api = apiRef.current
      if (!api) throw new Error('Applet chưa sẵn sàng để xuất SVG')

      // Một số bản có getSVG()
      if (typeof api.getSVG === 'function') {
        const svg = api.getSVG()
        if (svg) {
          downloadText(filename, svg, 'image/svg+xml;charset=utf-8')
          return
        }
      }

      // exportSVG(filename) — GeoGebra tự tải
      if (typeof api.exportSVG === 'function') {
        try {
          api.exportSVG(filename)
          return
        } catch {
          /* fall through */
        }
      }

      // Callback dạng exportSVG(cb) nếu có
      if (typeof api.exportSVG === 'function') {
        api.exportSVG((svg) => {
          if (typeof svg === 'string' && svg.includes('<svg')) {
            downloadText(filename, svg, 'image/svg+xml;charset=utf-8')
          }
        })
        return
      }

      throw new Error(
        'Bản GeoGebra web này không hỗ trợ SVG. Hãy dùng xuất PNG.',
      )
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
