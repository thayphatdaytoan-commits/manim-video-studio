import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Clapperboard,
  Download,
  FileText,
  ImagePlus,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  Wifi,
  WifiOff,
  Wand2,
  X,
} from 'lucide-react'
import GeoGebraApplet from './GeoGebraApplet'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const KEY_STORAGE = 'mvs_gemini_api_key'

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

  // AI / GeoGebra
  const [problemText, setProblemText] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [imageName, setImageName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [ggbCommandsText, setGgbCommandsText] = useState('A = (0, 0)\nB = (4, 0)\nC = (1, 3)\npolygon1 = Polygon(A, B, C)')
  const [ggbMode, setGgbMode] = useState('geometry')
  const [ggbRevision, setGgbRevision] = useState(0)
  const [aiNotes, setAiNotes] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [draftKey, setDraftKey] = useState('')

  const pollRef = useRef(null)
  const parseTimer = useRef(null)
  const fileRef = useRef(null)

  const ggbCommands = useMemo(
    () =>
      ggbCommandsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    [ggbCommandsText],
  )

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const data = await api('/api/health')
        if (!cancelled) setBackend(data)
      } catch {
        if (!cancelled) setBackend({ ready: false, message: 'Backend không phản hồi' })
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

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
        /* ignore */
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

  const onPickImage = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Chỉ nhận file ảnh (PNG/JPG/WEBP).')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setImageDataUrl(dataUrl)
    setImageName(file.name)
  }

  const saveApiKey = () => {
    const k = draftKey.trim()
    setApiKey(k)
    if (k) localStorage.setItem(KEY_STORAGE, k)
    else localStorage.removeItem(KEY_STORAGE)
    setShowKeyModal(false)
  }

  const handleGenerate = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Nhập nội dung đề hoặc tải ảnh đề trước.')
      return
    }
    if (!apiKey && !backend.gemini_configured) {
      setDraftKey(apiKey)
      setShowKeyModal(true)
      setError('Cần Gemini API key để sinh GeoGebra + Manim.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const data = await api('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Gemini-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          problem_text: problemText,
          image_base64: imageDataUrl,
          mime_type: imageDataUrl?.startsWith('data:')
            ? imageDataUrl.slice(5, imageDataUrl.indexOf(';'))
            : 'image/png',
        }),
      })

      setAiTitle(data.title || '')
      setAiNotes(data.notes || '')
      setGgbMode(data.geogebra_mode || 'geometry')
      setGgbCommandsText((data.geogebra_commands || []).join('\n'))
      setGgbRevision((n) => n + 1)
      setCode(data.manim_code || '')
      setScenes([data.scene_name])
      setScene(data.scene_name)
      setTemplateId('')
      setVideoUrl(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const applyGgbToPreview = () => setGgbRevision((n) => n + 1)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <Clapperboard size={26} strokeWidth={2} />
          </div>
          <div>
            <h1>Manim Video Studio</h1>
            <p>AI đề bài → GeoGebra + Manim → biên dịch video</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setDraftKey(apiKey)
              setShowKeyModal(true)
            }}
          >
            <KeyRound size={16} />
            {apiKey ? 'API KEY ✓' : 'API KEY'}
          </button>
          <div className={`status ${backend.ready ? 'ok' : 'bad'}`}>
            {backend.ready ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{backend.message || (backend.ready ? 'Backend sẵn sàng' : 'Backend offline')}</span>
          </div>
        </div>
      </header>

      <main className="layout three">
        {/* Cột 1: Nhập đề + AI */}
        <section className="panel">
          <h2 className="panel-title">1. Nhập đề bài</h2>
          <label className="field">
            <span className="field-label">NỘI DUNG ĐỀ (VĂN BẢN)</span>
            <textarea
              rows={6}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder={'Ví dụ:\nCho tam giác ABC vuông tại A, AB = 3, AC = 4. Vẽ hình và minh họa định lý Pythagore.'}
            />
          </label>

          <div className="upload-row">
            <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} />
              Tải ảnh đề
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
            {imageDataUrl && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setImageDataUrl(null)
                  setImageName('')
                }}
              >
                <X size={16} /> Xóa ảnh
              </button>
            )}
          </div>
          {imageDataUrl && (
            <div className="image-preview">
              <img src={imageDataUrl} alt="Đề bài" />
              <span>{imageName}</span>
            </div>
          )}

          <button
            className="btn primary"
            type="button"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
            {generating ? 'Đang sinh GeoGebra + Manim...' : 'AI sinh hình & mã Manim'}
          </button>

          {aiTitle && (
            <div className="ai-meta">
              <strong>{aiTitle}</strong>
              {aiNotes && <p>{aiNotes}</p>}
            </div>
          )}

          <label className="field">
            <span className="field-label">MẪU MANIM SẴN (TÙY CHỌN)</span>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— Giữ mã hiện tại / từ AI —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Cột 2: GeoGebra */}
        <section className="panel">
          <h2 className="panel-title">2. GeoGebra — chỉnh hình</h2>
          <label className="field">
            <span className="field-label">CHẾ ĐỘ</span>
            <select value={ggbMode} onChange={(e) => setGgbMode(e.target.value)}>
              <option value="geometry">Hình học phẳng</option>
              <option value="graphing">Đồ thị</option>
              <option value="3d">Hình học 3D</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">LỆNH GEOGEBRA (MỖI DÒNG 1 LỆNH)</span>
            <textarea
              rows={7}
              className="mono"
              value={ggbCommandsText}
              onChange={(e) => setGgbCommandsText(e.target.value)}
            />
          </label>

          <button type="button" className="btn secondary" onClick={applyGgbToPreview}>
            <RefreshCw size={16} />
            Áp dụng lệnh lên hình
          </button>

          <div className="ggb-wrap">
            <GeoGebraApplet
              commands={ggbCommands}
              mode={ggbMode}
              revision={ggbRevision}
            />
          </div>
        </section>

        {/* Cột 3: Manim + Video */}
        <section className="panel">
          <h2 className="panel-title">3. Manim — biên dịch video</h2>

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

          <div className="editor-wrap compact">
            <div className="editor-tab">
              <span>scene.py</span>
              {currentTemplate && <span className="editor-hint">{currentTemplate.name}</span>}
            </div>
            <Editor
              height="220px"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 8 },
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="preview compact">
            {videoUrl ? (
              <video key={videoUrl} src={videoUrl} controls autoPlay />
            ) : (
              <div className="preview-empty">
                {compiling ? (
                  <>
                    <Loader2 className="spin" size={32} />
                    <p>Đang biên dịch video...</p>
                  </>
                ) : (
                  <p>Video Manim hiện ở đây sau khi biên dịch</p>
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
              {compiling ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              {compiling ? 'Đang biên dịch...' : 'Biên dịch video'}
            </button>
            <button className="btn secondary" onClick={handleDownload} disabled={!videoUrl}>
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

      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Gemini API Key</h2>
              <button className="icon-btn" onClick={() => setShowKeyModal(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Lấy key miễn phí tại{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                  Google AI Studio
                </a>
                . Key chỉ lưu trên trình duyệt của bạn.
              </p>
              <input
                type="password"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="AIza..."
                className="key-input"
              />
              <button type="button" className="btn primary" onClick={saveApiKey}>
                <Upload size={16} /> Lưu API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
