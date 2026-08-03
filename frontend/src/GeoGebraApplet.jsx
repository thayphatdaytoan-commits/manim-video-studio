import { useEffect, useRef } from 'react'

/**
 * Chạy lệnh GeoGebra an toàn trên applet web.
 * - Tắt hộp thoại lỗi phiền
 * - SetVisible / ShowLabel / SetColor dùng JS API (evalCommand hay báo "chưa định nghĩa")
 */
function applyCommands(api, commands) {
  if (typeof api.setErrorDialogsActive === 'function') {
    api.setErrorDialogsActive(false)
  }

  const hideLater = []

  for (const raw of commands) {
    const cmd = String(raw || '').trim()
    if (!cmd || cmd.startsWith('#')) {
      // # hide: c1, c2
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

    // SetVisible(obj, false) | SetVisible[obj, false]
    const vis = cmd.match(
      /^SetVisible\s*[(\[]\s*([A-Za-z_][\w]*)\s*,\s*(true|false)\s*[)\]]\s*$/i,
    )
    if (vis) {
      try {
        api.setVisible(vis[1], vis[2].toLowerCase() === 'true')
      } catch {
        /* ignore */
      }
      continue
    }

    // ShowLabel(obj, true|false)
    const lab = cmd.match(
      /^ShowLabel\s*[(\[]\s*([A-Za-z_][\w]*)\s*,\s*(true|false)\s*[)\]]\s*$/i,
    )
    if (lab) {
      try {
        if (typeof api.setLabelVisible === 'function') {
          api.setLabelVisible(lab[1], lab[2].toLowerCase() === 'true')
        } else {
          api.evalCommand(`ShowLabel[${lab[1]}, ${lab[2]}]`)
        }
      } catch {
        /* ignore */
      }
      continue
    }

    // SetColor(obj, "red") hoặc SetColor(obj, 255, 0, 0)
    const colorNamed = cmd.match(
      /^SetColor\s*[(\[]\s*([A-Za-z_][\w]*)\s*,\s*"([^"]+)"\s*[)\]]\s*$/i,
    )
    if (colorNamed && typeof api.setColor === 'function') {
      const rgb = namedColorToRgb(colorNamed[2])
      if (rgb) {
        try {
          api.setColor(colorNamed[1], rgb[0], rgb[1], rgb[2])
        } catch {
          /* ignore */
        }
        continue
      }
    }
    const colorRgb = cmd.match(
      /^SetColor\s*[(\[]\s*([A-Za-z_][\w]*)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*[)\]]\s*$/i,
    )
    if (colorRgb && typeof api.setColor === 'function') {
      try {
        api.setColor(
          colorRgb[1],
          Number(colorRgb[2]),
          Number(colorRgb[3]),
          Number(colorRgb[4]),
        )
      } catch {
        /* ignore */
      }
      continue
    }

    // Lệnh dựng hình thông thường
    try {
      // Ưu tiên cú pháp ngoặc vuông cho script nếu AI gửi ngoặc tròn kiểu CAS
      const normalized = normalizeEvalCommand(cmd)
      api.evalCommand(normalized)
    } catch {
      /* ignore single bad command */
    }
  }

  for (const name of hideLater) {
    try {
      api.setVisible(name, false)
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

function normalizeEvalCommand(cmd) {
  // Point(c, t) trên một số bản không ổn — giữ nguyên, lỗi sẽ bị nuốt
  // Đổi SetVisible/ShowLabel dạng ( ) đã xử lý ở trên
  return cmd
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
      // Giảm popup lỗi của GeoGebra
      showErrorDialogs: false,
      appletOnLoad: (api) => {
        if (cancelled) return
        apiRef.current = api
        try {
          applyCommands(api, commands)
        } catch {
          /* ignore batch errors */
        }
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
