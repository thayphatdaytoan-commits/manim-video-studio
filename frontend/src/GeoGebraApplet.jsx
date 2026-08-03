import { useEffect, useRef } from 'react'

/**
 * Chạy lệnh GeoGebra an toàn trên applet web.
 * Mọi lệnh scripting (SetVisible/SetColor/...) KHÔNG được đưa vào evalCommand
 * vì GeoGebra web hay popup "Câu lệnh chưa định nghĩa".
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

    // Comment: # hide: c1, c2
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

    // ---- Scripting commands: chỉ dùng JS API ----
    if (/^SetVisible\b/i.test(name)) {
      const m = name.match(
        /^SetVisible\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i,
      )
      if (m) {
        const obj = m[1].trim()
        const vis = parseBool(m[2])
        safeSetVisible(api, obj, vis)
      }
      continue
    }

    if (/^ShowLabel\b/i.test(name)) {
      const m = name.match(
        /^ShowLabel\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i,
      )
      if (m) {
        const obj = m[1].trim()
        const vis = parseBool(m[2])
        try {
          if (typeof api.setLabelVisible === 'function') {
            api.setLabelVisible(obj, vis)
          }
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
      if (m && typeof api.setLineThickness === 'function') {
        try {
          api.setLineThickness(m[1].trim(), Number(m[2]))
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
      if (m && typeof api.setPointSize === 'function') {
        try {
          api.setPointSize(m[1].trim(), Number(m[2]))
        } catch {
          /* ignore */
        }
      }
      continue
    }

    if (/^SetFixed\b/i.test(name) || /^SetCaption\b/i.test(name) || /^SetLayer\b/i.test(name)) {
      // Bỏ qua các lệnh script khác dễ lỗi trên web
      continue
    }

    // ---- Lệnh dựng hình ----
    try {
      api.evalCommand(name)
    } catch {
      /* ignore single bad command */
    }
  }

  for (const obj of hideLater) {
    safeSetVisible(api, obj, false)
  }
}

function parseBool(raw) {
  const v = String(raw).trim().toLowerCase().replace(/["']/g, '')
  if (v === 'false' || v === '0' || v === 'no') return false
  return true
}

function safeSetVisible(api, obj, visible) {
  try {
    if (typeof api.setVisible === 'function') {
      api.setVisible(obj, visible)
    }
  } catch {
    /* ignore */
  }
}

function handleSetColor(api, name) {
  if (typeof api.setColor !== 'function') return

  // SetColor(obj, "#RRGGBB")
  let m = name.match(
    /^SetColor\s*[(\[]\s*([^,\])]+)\s*,\s*"?#?([0-9A-Fa-f]{6})"?\s*[)\]]/i,
  )
  if (m) {
    const hex = m[2]
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    try {
      api.setColor(m[1].trim(), r, g, b)
    } catch {
      /* ignore */
    }
    return
  }

  // SetColor(obj, "red")
  m = name.match(/^SetColor\s*[(\[]\s*([^,\])]+)\s*,\s*"([^"]+)"\s*[)\]]/i)
  if (m) {
    const rgb = namedColorToRgb(m[2])
    if (rgb) {
      try {
        api.setColor(m[1].trim(), rgb[0], rgb[1], rgb[2])
      } catch {
        /* ignore */
      }
    }
    return
  }

  // SetColor(obj, r, g, b)
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
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
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

/** Lọc trước khi đưa vào applet: đổi SetVisible thành # hide */
export function sanitizeGgbCommands(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const t = line.trim()
      const m = t.match(/^SetVisible\s*[(\[]\s*([^,\])]+)\s*,\s*([^)\]]+)\s*[)\]]/i)
      if (m && !parseBool(m[2])) {
        return `# hide: ${m[1].trim()}`
      }
      if (m && parseBool(m[2])) {
        return `# show: ${m[1].trim()}`
      }
      return line
    })
    .join('\n')
}

export default function GeoGebraApplet({
  commands = [],
  mode = 'geometry',
  revision = 0,
}) {
  const hostRef = useRef(null)
  const apiRef = useRef(null)

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
          if (typeof api.setErrorDialogsActive === 'function') {
            api.setErrorDialogsActive(false)
          }
        } catch {
          /* ignore */
        }
        // Chạy sau 1 tick để applet ổn định, giảm dialog
        setTimeout(() => {
          if (cancelled) return
          try {
            applyCommands(api, commands)
          } catch {
            /* ignore */
          }
        }, 50)
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
  }, [commands, mode, revision])

  return <div className="ggb-host" ref={hostRef} />
}
