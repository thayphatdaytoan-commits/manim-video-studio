import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Clapperboard,
  Code2,
  Copy,
  Download,
  FileImage,
  FileText,
  ImagePlus,
  KeyRound,
  Loader2,
  Mic,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Volume2,
  Wifi,
  WifiOff,
  Wand2,
  X,
} from 'lucide-react'
import GeoGebraApplet, { sanitizeGgbCommands } from './GeoGebraApplet'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const KEY_STORAGE = 'mvs_gemini_api_keys'
const KEY_STORAGE_LEGACY = 'mvs_gemini_api_key'

function loadStoredApiKeys() {
  try {
    const multi = localStorage.getItem(KEY_STORAGE)
    if (multi) {
      const parsed = JSON.parse(multi)
      if (Array.isArray(parsed)) {
        return parsed.map((k) => String(k).trim()).filter(Boolean)
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
    }
  } catch {
    /* ignore */
  }
  const legacy = localStorage.getItem(KEY_STORAGE_LEGACY)
  if (legacy?.trim()) return [legacy.trim()]
  return []
}

function saveStoredApiKeys(keys) {
  const cleaned = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
  if (cleaned.length) {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(cleaned))
  } else {
    localStorage.removeItem(KEY_STORAGE)
  }
  localStorage.removeItem(KEY_STORAGE_LEGACY)
  return cleaned
}

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
  const [savedGgbImage, setSavedGgbImage] = useState(null)
  const [savingGgb, setSavingGgb] = useState(false)
  const [ggbCommandsText, setGgbCommandsText] = useState(
    '# AI sẽ tạo lệnh GeoGebra tại đây\n# Đường phụ phải có SetVisible(..., false)',
  )
  const [ggbMode, setGgbMode] = useState('geometry')
  const [ggbRevision, setGgbRevision] = useState(0)
  const [aiNotes, setAiNotes] = useState('')
  const [aiTitle, setAiTitle] = useState('')
  const [apiKeys, setApiKeys] = useState(() => loadStoredApiKeys())
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [draftKeys, setDraftKeys] = useState('')
  const [exportMsg, setExportMsg] = useState(null)
  const [exportPreview, setExportPreview] = useState(null)
  const [svgCodePreview, setSvgCodePreview] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Lồng tiếng Edge TTS
  const [voiceScript, setVoiceScript] = useState('')
  const [voiceTitle, setVoiceTitle] = useState('')
  const [ttsVoices, setTtsVoices] = useState([])
  const [ttsVoice, setTtsVoice] = useState('vi-VN-HoaiMyNeural')
  const [ttsRate, setTtsRate] = useState('+0%')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [applyingVoice, setApplyingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)

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
        const [tpls, quals, voices] = await Promise.all([
          api('/api/templates'),
          api('/api/qualities'),
          api('/api/tts-voices').catch(() => []),
        ])
        setTemplates(tpls)
        setQualities(quals)
        if (Array.isArray(voices) && voices.length) {
          setTtsVoices(voices)
          setTtsVoice(voices[0].id)
        }
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
    setAudioUrl(null)
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

  const handleGenerateScript = async () => {
    if (!code.trim()) {
      setError('Chưa có mã Manim để viết lời thoại.')
      return
    }
    if (!requireApiKey()) return
    setGeneratingScript(true)
    setError(null)
    try {
      const data = await api('/api/generate-script', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          manim_code: code,
          scene_name: scene,
        }),
      })
      setVoiceScript(data.script || '')
      setVoiceTitle(data.title || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingScript(false)
    }
  }

  const handleApplyVoiceover = async () => {
    if (!jobId || !videoUrl) {
      setError('Hãy tạo video Manim trước, rồi mới lồng tiếng.')
      return
    }
    if (!voiceScript.trim()) {
      setError('Nhập hoặc tạo lời thoại trước.')
      return
    }
    setApplyingVoice(true)
    setError(null)
    try {
      const data = await api('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          script: voiceScript,
          voice: ttsVoice,
          rate: ttsRate,
        }),
      })
      const bust = Date.now()
      setVideoUrl(`${API_BASE}${data.video_url}?t=${bust}`)
      if (data.audio_url) {
        setAudioUrl(`${API_BASE}${data.audio_url}?t=${bust}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setApplyingVoice(false)
    }
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

  const saveApiKeys = () => {
    const list = draftKeys
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter(Boolean)
    const cleaned = saveStoredApiKeys(list)
    setApiKeys(cleaned)
    setShowKeyModal(false)
  }

  const requireApiKey = () => {
    if (apiKeys.length || backend.gemini_configured) return true
    setDraftKeys(apiKeys.join('\n'))
    setShowKeyModal(true)
    setError('Cần ít nhất 1 Gemini API key (nút API KEY góc trên).')
    return false
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(apiKeys.length ? { 'X-Gemini-Api-Key': apiKeys.join('\n') } : {}),
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
      setSavedGgbImage(null)
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

  const handleSaveGgbFigure = async () => {
    setExportMsg(null)
    setError(null)
    setSavingGgb(true)
    try {
      if (!ggbRef.current?.saveSnapshot) {
        setError('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const snap = await ggbRef.current.saveSnapshot(`geogebra-saved-${Date.now()}.png`)
      const cmds = (snap.commands || []).filter(Boolean)
      if (cmds.length) {
        // Cập nhật textarea theo hình đã kéo — KHÔNG remount applet
        setGgbCommandsText(sanitizeGgbCommands(cmds.join('\n')))
      }
      setSavedGgbImage(snap.dataUrl)
      setManimReady(false)
      setExportMsg('Đã lưu hình sau chỉnh sửa — có thể tạo code Manim')
    } catch (err) {
      setError(err.message || 'Lưu hình thất bại')
    } finally {
      setSavingGgb(false)
    }
  }

  const handleGenerateManim = async () => {
    if (!ggbCommands.length && !savedGgbImage) {
      setError('Chưa có hình GeoGebra. Hãy sinh hình, chỉnh, rồi bấm Lưu hình.')
      return
    }
    if (!savedGgbImage) {
      setError('Hãy kéo thả/chỉnh hình xong rồi bấm “Lưu hình đã chỉnh” trước khi tạo Manim.')
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
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
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
    setSavedGgbImage(null)
    setManimReady(false)
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

  const handleExportSvgCode = async () => {
    setExportMsg(null)
    setError(null)
    setExporting(true)
    try {
      if (!ggbRef.current?.captureSVG) {
        setExportMsg('Applet chưa sẵn sàng. Đợi hình load xong.')
        return
      }
      const payload = await ggbRef.current.captureSVG(`geogebra-${Date.now()}.svg`)
      const text = String(payload?.text || '').trim()
      if (!text) throw new Error('Không lấy được mã SVG')
      setSvgCodePreview({
        filename: payload.filename,
        text,
        dataUrl: payload.dataUrl,
        blob: payload.blob,
        mime: payload.mime,
      })
      setExportMsg('Đã xuất mã SVG — có thể sao chép hoặc tải file')
    } catch (err) {
      setExportMsg(err.message || 'Xuất mã SVG thất bại')
    } finally {
      setExporting(false)
    }
  }

  const copySvgCode = async () => {
    if (!svgCodePreview?.text) return
    try {
      await navigator.clipboard.writeText(svgCodePreview.text)
      setExportMsg('Đã sao chép mã SVG')
    } catch {
      // Fallback chọn text trong textarea
      const el = document.getElementById('svg-code-textarea')
      if (el) {
        el.focus()
        el.select()
        setExportMsg('Giữ / chọn toàn bộ → Copy')
      } else {
        setExportMsg('Không sao chép được — hãy chọn thủ công trong ô mã')
      }
    }
  }

  const downloadSvgCodeFile = () => {
    if (!svgCodePreview) return
    const a = document.createElement('a')
    a.href = svgCodePreview.dataUrl
    a.download = svgCodePreview.filename
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => document.body.removeChild(a), 400)
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
              setDraftKeys(apiKeys.join('\n'))
              setShowKeyModal(true)
            }}
          >
            <KeyRound size={16} />
            {apiKeys.length ? `API KEY (${apiKeys.length})` : 'API KEY'}
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
            <code>SetVisibleInView(tên, 1, false)</code>. Chỉnh/kéo thả xong →{' '}
            <strong>Lưu hình đã chỉnh</strong> → tạo Manim (AI dựa vào ảnh đã lưu).
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
            <button
              type="button"
              className="btn ghost export-btn"
              onClick={handleExportSvg}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="spin" size={15} /> : <FileImage size={15} />}
              SVG
            </button>
            <button
              type="button"
              className="btn ghost export-btn"
              onClick={handleExportSvgCode}
              disabled={exporting}
              title="Xem và sao chép mã nguồn SVG"
            >
              {exporting ? <Loader2 className="spin" size={15} /> : <Code2 size={15} />}
              Mã SVG
            </button>
            <button
              type="button"
              className="btn ghost export-btn"
              onClick={handleExportPng}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
              PNG
            </button>
            <button type="button" className="btn ghost export-btn" onClick={handleApplyTheme}>
              <Sparkles size={15} /> Màu NTSM
            </button>
          </div>
          {exportMsg && <div className="export-msg">{exportMsg}</div>}

          <div className="ggb-wrap">
            <GeoGebraApplet
              ref={ggbRef}
              commands={ggbCommands}
              mode={ggbMode}
              revision={ggbRevision}
            />
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={handleSaveGgbFigure}
            disabled={savingGgb || !ggbCommands.length}
          >
            {savingGgb ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
            {savingGgb ? 'Đang lưu hình...' : 'Lưu hình đã chỉnh'}
          </button>

          {savedGgbImage && (
            <div className="saved-ggb-preview">
              <div className="saved-ggb-label">Hình đã lưu (dùng để tạo Manim)</div>
              <img src={savedGgbImage} alt="GeoGebra đã lưu" />
            </div>
          )}

          <button
            className="btn primary"
            type="button"
            onClick={handleGenerateManim}
            disabled={generatingManim || (!ggbCommands.length && !savedGgbImage)}
          >
            {generatingManim ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingManim ? 'Đang tạo Manim...' : 'Tạo code Manim bằng AI'}
          </button>
          {!savedGgbImage && ggbCommands.length > 0 && (
            <div className="export-msg">Chỉnh hình xong hãy bấm “Lưu hình đã chỉnh” trước.</div>
          )}
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

          <div className="voiceover-box">
            <h3 className="voiceover-title">
              <Mic size={16} /> Lồng tiếng AI (Edge TTS — miễn phí)
            </h3>
            <p className="step-hint">
              AI viết lời thoại gồm <strong>đề bài</strong> + <strong>hướng dẫn giải</strong>, rồi Edge
              TTS đọc và ghép vào MP4.
            </p>

            <label className="field">
              <span className="field-label">GIỌNG ĐỌC</span>
              <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
                {(ttsVoices.length
                  ? ttsVoices
                  : [
                      { id: 'vi-VN-HoaiMyNeural', label: 'Hoài My (nữ)' },
                      { id: 'vi-VN-NamMinhNeural', label: 'Nam Minh (nam)' },
                    ]
                ).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">TỐC ĐỘ</span>
              <select value={ttsRate} onChange={(e) => setTtsRate(e.target.value)}>
                <option value="-20%">Chậm (−20%)</option>
                <option value="-10%">Hơi chậm (−10%)</option>
                <option value="+0%">Bình thường</option>
                <option value="+10%">Hơi nhanh (+10%)</option>
                <option value="+20%">Nhanh (+20%)</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">
                LỜI THOẠI {voiceTitle ? `— ${voiceTitle}` : ''}
              </span>
              <textarea
                rows={5}
                value={voiceScript}
                onChange={(e) => setVoiceScript(e.target.value)}
                placeholder="Bấm “AI viết lời thoại” để tạo đề bài + hướng dẫn giải, hoặc tự gõ..."
              />
            </label>

            <div className="export-row">
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleGenerateScript}
                disabled={generatingScript || !code.trim()}
              >
                {generatingScript ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
                AI viết đề + lời giải
              </button>
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleApplyVoiceover}
                disabled={applyingVoice || !videoUrl || !voiceScript.trim()}
              >
                {applyingVoice ? <Loader2 className="spin" size={15} /> : <Volume2 size={15} />}
                {applyingVoice ? 'Đang lồng tiếng...' : 'Lồng tiếng vào video'}
              </button>
            </div>

            {audioUrl && (
              <div className="audio-preview">
                <span>Nghe thử audio:</span>
                <audio key={audioUrl} src={audioUrl} controls />
              </div>
            )}
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

      {exportPreview && (
        <div className="modal-backdrop" onClick={() => setExportPreview(null)}>
          <div className="modal narrow export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Xuất {exportPreview.kind.toUpperCase()}</h2>
              <button
                className="icon-btn"
                onClick={() => setExportPreview(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="export-hint">
                Trên iPad: <strong>giữ vào ảnh</strong> → Lưu ảnh, hoặc bấm <strong>Chia sẻ</strong> →
                Lưu vào Files.
              </p>
              <div className="export-preview-frame">
                {exportPreview.kind === 'png' ? (
                  <img src={exportPreview.dataUrl} alt="GeoGebra PNG" />
                ) : (
                  <img src={exportPreview.dataUrl} alt="GeoGebra SVG" />
                )}
              </div>
              <div className="export-actions">
                <button type="button" className="btn primary" onClick={sharePreviewAgain}>
                  <Upload size={16} /> Chia sẻ / Lưu
                </button>
                <button type="button" className="btn secondary" onClick={downloadPreviewDesktop}>
                  <Download size={16} /> Mở / Tải
                </button>
                {exportPreview.kind === 'svg' && exportPreview.text && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setSvgCodePreview({
                        filename: exportPreview.filename,
                        text: exportPreview.text,
                        dataUrl: exportPreview.dataUrl,
                        blob: exportPreview.blob,
                        mime: exportPreview.mime,
                      })
                      setExportPreview(null)
                    }}
                  >
                    <Code2 size={16} /> Xem mã SVG
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {svgCodePreview && (
        <div className="modal-backdrop" onClick={() => setSvgCodePreview(null)}>
          <div className="modal export-modal svg-code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Mã SVG</h2>
              <button
                className="icon-btn"
                onClick={() => setSvgCodePreview(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="export-hint">
                Sao chép mã bên dưới để dán vào Word, HTML, Canva… hoặc tải file{' '}
                <code>{svgCodePreview.filename}</code>.
              </p>
              <textarea
                id="svg-code-textarea"
                className="svg-code-textarea mono"
                readOnly
                value={svgCodePreview.text}
                spellCheck={false}
                onFocus={(e) => e.target.select()}
              />
              <div className="export-actions">
                <button type="button" className="btn primary" onClick={copySvgCode}>
                  <Copy size={16} /> Sao chép mã
                </button>
                <button type="button" className="btn secondary" onClick={downloadSvgCodeFile}>
                  <Download size={16} /> Tải file .svg
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Gemini API Keys</h2>
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
                . Có thể nhập <strong>nhiều key</strong> (mỗi dòng 1 key). Khi key bị limit, hệ thống
                tự chuyển sang key tiếp theo.
              </p>
              <textarea
                rows={6}
                value={draftKeys}
                onChange={(e) => setDraftKeys(e.target.value)}
                placeholder={'AIza...key1\nAIza...key2\nAIza...key3'}
                className="key-input mono"
                spellCheck={false}
              />
              <p className="key-count">
                Đang có: <strong>{apiKeys.length}</strong> key đã lưu
              </p>
              <button type="button" className="btn primary" onClick={saveApiKeys}>
                <Upload size={16} /> Lưu danh sách API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
