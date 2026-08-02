import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Clapperboard,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''

async function api(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return res.json()
}

export default function App() {
  const [templates, setTemplates] = useState([])
  const [qualities, setQualities] = useState([])
  const [templateId, setTemplateId] = useState('')
  const [scene, setScene] = useState('')
  const [scenes, setScenes] = useState([])
  const [code, setCode] = useState('')
  const [quality, setQuality] = useState('480p15')
  const [backend, setBackend] = useState({ ready: false, message: 'Đang kết nối...' })
  const [compiling, setCompiling] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [log, setLog] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)
  const parseTimer = useRef(null)

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )

  // Health check
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const data = await api('/api/health')
        if (!cancelled) setBackend(data)
      } catch {
        if (!cancelled) {
          setBackend({ ready: false, message: 'Backend không phản hồi' })
        }
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Load templates + qualities
  useEffect(() => {
    ;(async () => {
      try {
        const [tpls, quals] = await Promise.all([
          api('/api/templates'),
          api('/api/qualities'),
        ])
        setTemplates(tpls)
        setQualities(quals)
        if (tpls.length) {
          const first = tpls[0]
          setTemplateId(first.id)
          setCode(first.code)
          setScenes(first.scenes)
          setScene(first.default_scene)
        }
        if (quals.length) setQuality(quals[0].id)
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  const applyTemplate = (id) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setCode(tpl.code)
    setScenes(tpl.scenes)
    setScene(tpl.default_scene)
    setError(null)
  }

  // Re-parse scenes when code changes (debounced)
  const handleCodeChange = useCallback((value) => {
    const next = value ?? ''
    setCode(next)
    clearTimeout(parseTimer.current)
    parseTimer.current = setTimeout(async () => {
      try {
        const data = await api('/api/parse-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: next }),
        })
        if (data.scenes?.length) {
          setScenes(data.scenes)
          setScene((prev) => (data.scenes.includes(prev) ? prev : data.scenes[0]))
        }
      } catch {
        /* ignore parse errors while typing */
      }
    }, 500)
  }, [])

  useEffect(() => () => clearTimeout(parseTimer.current), [])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const pollJob = (id) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const job = await api(`/api/jobs/${id}`)
        setLog(job.log || '')
        if (job.status === 'done') {
          stopPolling()
          setCompiling(false)
          setVideoUrl(`${API_BASE}/api/video/${id}?t=${Date.now()}`)
        } else if (job.status === 'error') {
          stopPolling()
          setCompiling(false)
          setShowLog(true)
          setError('Biên dịch thất bại. Xem nhật ký để biết chi tiết.')
        }
      } catch (err) {
        stopPolling()
        setCompiling(false)
        setError(err.message)
      }
    }, 1500)
  }

  useEffect(() => () => stopPolling(), [])

  const handleCompile = async () => {
    if (!code.trim() || !scene || compiling) return
    setError(null)
    setCompiling(true)
    setLog('Đang gửi yêu cầu biên dịch...\n')
    setVideoUrl(null)
    try {
      const res = await api('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, scene, quality }),
      })
      setJobId(res.job_id)
      setLog((prev) => prev + `Job ${res.job_id} đã bắt đầu.\n`)
      pollJob(res.job_id)
    } catch (err) {
      setCompiling(false)
      setError(err.message)
    }
  }

  const handleDownload = () => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `${API_BASE}/api/video/${jobId}/download`
    a.download = `${scene || 'manim'}.mp4`
    a.click()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Clapperboard size={26} strokeWidth={2} />
          </div>
          <div>
            <h1>Manim Video Studio</h1>
            <p>Biên dịch mã Manim thành video Toán học</p>
          </div>
        </div>
        <div className={`status ${backend.ready ? 'ok' : 'bad'}`}>
          {backend.ready ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{backend.message || (backend.ready ? 'Backend sẵn sàng' : 'Backend offline')}</span>
        </div>
      </header>

      <main className="layout">
        <section className="panel left">
          <label className="field">
            <span className="field-label">MẪU MINH HỌA</span>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">SCENE CẦN CHẠY</span>
            <select value={scene} onChange={(e) => setScene(e.target.value)}>
              {scenes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {!scenes.length && <option value="">— Không có Scene —</option>}
            </select>
          </label>

          <div className="editor-wrap">
            <div className="editor-tab">
              <span>scene.py</span>
              {currentTemplate && (
                <span className="editor-hint">{currentTemplate.name}</span>
              )}
            </div>
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>
        </section>

        <section className="panel right">
          <label className="field">
            <span className="field-label">CHẤT LƯỢNG VIDEO</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {qualities.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>

          <div className="preview">
            {videoUrl ? (
              <video key={videoUrl} src={videoUrl} controls autoPlay />
            ) : (
              <div className="preview-empty">
                {compiling ? (
                  <>
                    <Loader2 className="spin" size={36} />
                    <p>Đang biên dịch video...</p>
                  </>
                ) : (
                  <p>Video sẽ hiện ở đây sau khi biên dịch</p>
                )}
              </div>
            )}
          </div>

          {error && <div className="alert">{error}</div>}

          <div className="actions">
            <button
              className="btn primary"
              onClick={handleCompile}
              disabled={compiling || !backend.ready || !scene}
            >
              {compiling ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {compiling ? 'Đang biên dịch...' : 'Biên dịch video'}
            </button>
            <button
              className="btn secondary"
              onClick={handleDownload}
              disabled={!videoUrl}
            >
              <Download size={18} />
              Tải video MP4
            </button>
          </div>

          <button className="log-link" onClick={() => setShowLog(true)} type="button">
            <FileText size={16} />
            Nhật ký biên dịch
          </button>
        </section>
      </main>

      {showLog && (
        <div className="modal-backdrop" onClick={() => setShowLog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Nhật ký biên dịch</h2>
              <button className="icon-btn" onClick={() => setShowLog(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <pre className="log-body">{log || 'Chưa có nhật ký.'}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
