import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Clapperboard,
  Download,
  FileImage,
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
import GeoGebraApplet, { sanitizeGgbCommands } from './GeoGebraApplet'
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
  const [generatingGgb, setGeneratingGgb] = useState(false)
  const [generatingManim, setGeneratingManim] = useState(false)
  const [ggbReady, setGgbReady] = useState(false)
  const [manimReady, setManimReady] = useState(false)
  const [ggbCommandsText, setGgbCommandsText] = useState(
    '# AI sẽ tạo lệnh GeoGebra tại đây\n# Đường phụ phải có SetVisible(..., false)',
  )
  const [ggbMode, setGgbMode] = useState('geometry')
  const [ggbRevision, setGgbRevision] = useState(0)
  const [aiNotes, setAiNotes] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [exportMsg, setExportMsg] = useState(null)
  const [exportPreview, setExportPreview] = useState(null) // { kind, filename, dataUrl, blob, mime, text? }
  const [exporting, setExporting] = useState(false)

  const pollRef = useRef(null)
  const parseTimer = useRef(null)
  const fileRef = useRef(null)
  const ggbRef = useRef(null)

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
    setManimReady(true)
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

  const requireApiKey = () => {
    if (apiKey || backend.gemini_configured) return true
    setDraftKey(apiKey)
    setShowKeyModal(true)
    setError('Cần Gemini API key (nút API KEY góc trên).')
    return false
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-Gemini-Api-Key': apiKey } : {}),
  })

  const handleGenerateGeogebra = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Nhập nội dung đề hoặc tải ảnh đề trước.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingGgb(true)
    setError(null)
    setManimReady(false)
    try {
      const data = await api('/api/generate-geogebra', {
        method: 'POST',
        headers: authHeaders(),
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
      setGgbCommandsText(sanitizeGgbCommands((data.geogebra_commands || []).join('\n')))
      setGgbRevision((n) => n + 1)
      setGgbReady(true)
      setVideoUrl(null)
      setCode('# Chỉnh xong hình GeoGebra rồi bấm "Tạo code Manim bằng AI"')
      setScenes([])
      setScene('')
    } catch (err) {
      setError(err.message)
      setGgbReady(false)
    } finally {
      setGeneratingGgb(false)
    }
  }

  const handleGenerateManim = async () => {
    if (!ggbCommands.length) {
      setError('Chưa có lệnh GeoGebra. Hãy sinh/chỉnh hình trước.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingManim(true)
    setError(null)
    try {
      const data = await api('/api/generate-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          geogebra_commands: ggbCommands,
          geogebra_mode: ggbMode,
        }),
      })

      setCode(data.manim_code || '')
      setScenes([data.scene_name])
      setScene(data.scene_name)
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      if (data.notes) setAiNotes(data.notes)
    } catch (err) {
      setError(err.message)
      setManimReady(false)
    } finally {
      setGeneratingManim(false)
    }
  }

  const applyGgbToPreview = () => {
    const cleaned = sanitizeGgbCommands(ggbCommandsText)
    if (cleaned !== ggbCommandsText) setGgbCommandsText(cleaned)
    setGgbRevision((n) => n + 1)
  }

  const isIos = () =>
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  const shareOrShowExport = async (payload) => {
    // iPad/iOS: ưu tiên Share Sheet (Files / Ảnh / AirDrop)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([payload.blob], payload.filename, {
          type: payload.mime,
        })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: payload.filename,
          })
          setExportMsg('Đã mở Share — chọn Lưu vào Files / Ảnh')
          return
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          setExportMsg('Đã hủy chia sẻ')
          return
        }
        // fall through to preview modal
      }
    }

    // Hiện modal xem trước — trên iPad: giữ vào ảnh để lưu
    setExportPreview(payload)
    setExportMsg(
      isIos()
        ? 'Giữ vào ảnh → Lưu ảnh / hoặc bấm Chia sẻ'
        : 'Xem trước — bấm Tải về hoặc Chia sẻ',
    )
  }

  const handleExportPng = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.capturePNG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.capturePNG(`geogebra-${Date.now()}.png`)
      await shareOrShowExport(payload)
    } catch (err) {
      setExportMsg(err.message || 'Xuất PNG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const handleExportSvg = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.captureSVG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.captureSVG(`geogebra-${Date.now()}.svg`)
      await shareOrShowExport(payload)
    } catch (err) {
      setExportMsg(err.message || 'Xuất SVG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const handleApplyTheme = () => {
    setExportMsg(null)
    try {
      if (!ggbRef.current?.applyTheme) {
        setExportMsg('Applet chưa sẵn sàng.')
        return
      }
      ggbRef.current.applyTheme()
      setExportMsg('Đã áp màu NTSM')
    } catch (err) {
      setExportMsg(err.message || 'Không áp được màu NTSM')
    }
  }

  const sharePreviewAgain = async () => {
    if (!exportPreview) return
    try {
      const file = new File([exportPreview.blob], exportPreview.filename, {
        type: exportPreview.mime,
      })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: exportPreview.filename })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    // Desktop fallback: mở tab mới
    window.open(exportPreview.dataUrl, '_blank', 'noopener,noreferrer')
  }

  const downloadPreviewDesktop = () => {
    if (!exportPreview) return
    const a = document.createElement('a')
    a.href = exportPreview.dataUrl
    a.download = exportPreview.filename
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 400)
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
            <p>1) GeoGebra từ đề → 2) chỉnh hình → 3) Manim → 4) video</p>
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
        {/* Cột 1: Nhập đề + AI GeoGebra */}
        <section className="panel">
          <h2 className="panel-title">1. Đề bài → GeoGebra</h2>
          <p className="step-hint">
            Bước 1: AI chỉ tạo lệnh vẽ GeoGebra (hình chuẩn, ẩn đường phụ). Chưa tạo Manim.
          </p>
          <label className="field">
            <span className="field-label">NỘI DUNG ĐỀ (VĂN BẢN)</span>
            <textarea
              rows={6}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder={'Ví dụ:\nCho tam giác ABC vuông tại A, AB = 3, AC = 4. Vẽ hình minh họa.'}
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
            onClick={handleGenerateGeogebra}
            disabled={generatingGgb}
          >
            {generatingGgb ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
            {generatingGgb ? 'Đang vẽ GeoGebra...' : 'AI tạo code GeoGebra'}
          </button>

          {aiTitle && (
            <div className="ai-meta">
              <strong>{aiTitle}</strong>
              {aiNotes && <p>{aiNotes}</p>}
            </div>
          )}
          {ggbReady && (
            <div className="step-ok">Đã có GeoGebra — sang cột 2 để chỉnh hình cho chuẩn.</div>
          )}
        </section>

        {/* Cột 2: GeoGebra */}
        <section className="panel">
          <h2 className="panel-title">2. Chỉnh hình GeoGebra</h2>
          <p className="step-hint">
            Phong cách NTSM: cạnh dùng <code>Segment</code>; đường dựng dùng{' '}
            <code>Line</code>/<code>PerpendicularLine</code> rồi{' '}
            <code>SetVisibleInView(tên, 1, false)</code>. Xong hình mới tạo Manim.
          </p>
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
              onChange={(e) => {
                setGgbCommandsText(e.target.value)
                setManimReady(false)
              }}
            />
          </label>

          <button type="button" className="btn secondary" onClick={applyGgbToPreview}>
            <RefreshCw size={16} />
            Áp dụng lệnh lên hình
          </button>

          <div className="export-row">
            <button type="button" className="btn ghost export-btn" onClick={handleExportSvg}>
              <FileImage size={15} /> SVG
            </button>
            <button type="button" className="btn ghost export-btn" onClick={handleExportPng}>
              <Download size={15} /> PNG
            </button>
            <button type="button" className="btn ghost export-btn" onClick={handleApplyTheme}>
              <Sparkles size={15} /> Màu NTSM
            </button>
          </div>

          <div className="ggb-wrap">
            <GeoGebraApplet
              ref={ggbRef}
              commands={ggbCommands}
              mode={ggbMode}
              revision={ggbRevision}
            />
          </div>

          <button
            className="btn primary"
            type="button"
            onClick={handleGenerateManim}
            disabled={generatingManim || !ggbCommands.length}
          >
            {generatingManim ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingManim ? 'Đang tạo Manim...' : 'Tạo code Manim bằng AI'}
          </button>
          {manimReady && (
            <div className="step-ok">Đã có Manim — sang cột 3 để biên dịch video.</div>
          )}
        </section>

        {/* Cột 3: Manim + Video */}
        <section className="panel">
          <h2 className="panel-title">3. Manim → video</h2>
          <p className="step-hint">
            Chỉ biên dịch sau khi đã có mã Manim. Chọn 480p trên Render Free.
          </p>

          <label className="field">
            <span className="field-label">MẪU MANIM SẴN (TÙY CHỌN)</span>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— Dùng mã AI / đang soạn —</option>
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
              {!scenes.length && <option value="">— Chưa có Scene (hãy tạo Manim) —</option>}
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
              {compiling ? <Loader2 className="spin" size={18} /> : <Clapperboard size={18} />}
              {compiling ? 'Đang biên dịch...' : 'Tạo video (biên dịch Manim)'}
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
