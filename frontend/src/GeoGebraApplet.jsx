import { useEffect, useRef } from 'react'

/**
 * Nhúng GeoGebra applet và chạy danh sách lệnh.
 * Script deployggb.js được nạp trong index.html.
 */
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
      appletOnLoad: (api) => {
        if (cancelled) return
        apiRef.current = api
        for (const cmd of commands) {
          try {
            api.evalCommand(String(cmd))
          } catch {
            /* bỏ qua lệnh lỗi đơn lẻ */
          }
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
    // revision buộc remount khi AI sinh lệnh mới
  }, [commands, mode, revision])

  return <div className="ggb-host" ref={hostRef} />
}
