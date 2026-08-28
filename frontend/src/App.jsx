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
  Wrench,
  X,
} from 'lucide-react'
import GeoGebraApplet, { sanitizeGgbCommands } from './GeoGebraApplet'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const KEY_STORAGE = 'mvs_gemini_api_keys'
const KEY_STORAGE_LEGACY = 'mvs_gemini_api_key'
const VALIDATION_MODE_STORAGE = 'mvs_validation_mode'

const CE_CHECKLIST_RENDER_FREE = [
  { id: 'scene', label: 'class kế thừa Scene (không MovingCamera / 3D)' },
  { id: 'text', label: 'Text / MarkupText tiếng Việt (disable_ligatures=True)' },
  { id: 'notex', label: 'Không Tex / MathTex / Label("A") / Typst' },
  { id: 'geom', label: 'Dot, Line, Circle, Polygon, Angle, VGroup, ImageMobject' },
  { id: 'layout', label: 'Hình trái / chữ phải + scale_to_fit_height' },
  { id: 'wait', label: 'Mỗi bước lời giải có animation + self.wait()' },
]

const CE_CHECKLIST_LOCAL = [
  { id: 'scene', label: 'class Scene (2D) — không MovingCamera / 3D' },
  { id: 'hybrid', label: 'Text tiếng Việt + MathTex(r"...") cho công thức' },
  { id: 'font', label: 'Text: font="Arial" + disable_ligatures=True (tránh ô vuông □)' },
  { id: 'latex', label: 'MathTex dùng chuỗi thô r"..."; LaTeX đã cài (MiKTeX)' },
  { id: 'geom', label: 'Dot, Line, Circle, Polygon, Angle, TransformMatchingTex' },
  { id: 'layout', label: 'Hình trái / chữ phải + scale_to_fit_height + self.wait()' },
]

function loadValidationMode() {
  try {
    const saved = localStorage.getItem(VALIDATION_MODE_STORAGE)
    if (saved === 'local_latex' || saved === 'render_free') return saved
  } catch {
    /* ignore */
  }
  return 'auto'
}

function buildGeminiProPrompt(problem, solution, mode = 'local_latex') {
  const p = (problem || '').trim() || '(dán đề bài đầy đủ vào đây)'
  const s = (solution || '').trim() || '(dán lời giải từng bước vào đây)'
  const local = mode === 'local_latex'

  const constraints = local
    ? `RÀNG BUỘC (máy LOCAL — Manim CE + MiKTeX/LaTeX):
- class kế thừa Scene (KHÔNG MovingCameraScene / ThreeDScene)
- CHIẾN LƯỢC HYBRID (bắt buộc):
  • Tiếng Việt: Text("...", font="Arial", font_size=28, disable_ligatures=True)
  • CÔNG THỨC ONLY trong MathTex(r"...") — KHÔNG nhét "Ta có", "Chứng minh", "tứ giác" vào MathTex (gây ô vuông □)
- Nhãn điểm hình học: Text("A", font_size=28, disable_ligatures=True)
- Biến đổi công thức: TransformMatchingTex(eq1, eq2) hoặc ReplacementTransform
- Bố cục: figure = VGroup(...).scale_to_fit_height(5).move_to(LEFT * 3)
  text_panel = VGroup(...).arrange(DOWN, aligned_edge=LEFT, buff=0.2).scale(0.42).to_edge(RIGHT, buff=0.35)
- Màu STYLE_VN (NTSM): nền #0d1117; điểm #8b1a1a; cạnh #1e40af; tròn #3d6b2f; highlight #FFD700; kết luận #FF8C00
- BEAT_ORDER: title → problem → construction → solution_steps → conclusion → check_question
- self.wait(≥0.8) mỗi bước; kết luận có SurroundingRectangle vàng
- Comment tiếng Việt trước mỗi bước; không TODO/placeholder
- API: Dot, Line, DashedLine, Circle, Arc, Polygon, Angle, RightAngle, VGroup, SurroundingRectangle`
    : `RÀNG BUỘC (Render Free / Docker):
- class kế thừa Scene (KHÔNG MovingCameraScene / ThreeDScene / ZoomedScene)
- Text/MarkupText tiếng Việt, disable_ligatures=True
- CẤM: Tex, MathTex, SingleStringMathTex, Label("A"), Typst, MathTypst
- Nhãn điểm: Text("A", font_size=28) — không Label("A")
- Hình trái / chữ phải; VGroup(...).scale_to_fit_height(5).move_to(LEFT * 3)
- API: Dot, Line, Circle, Polygon, Angle, RightAngle, Create, Write, FadeIn, Indicate, ReplacementTransform, self.wait`

  return `Bạn là lập trình viên Manim Community Edition (ManimCE) — video bài giảng Toán Việt Nam.
Tôi đưa ĐỀ + LỜI GIẢI hoàn chỉnh. CHỈ viết 1 file Python Manim CE (1 class Scene).

${constraints}

OUTPUT:
- Trả về DUY NHẤT code trong khối \`\`\`python ... \`\`\`
- scene_name = tên class Scene
- Mỗi bước lời giải = 1 khối animation + self.wait()

ĐỀ BÀI:
${p}

LỜI GIẢI:
${s}
`
}

function extractPythonFromPaste(raw) {
  const text = (raw || '').trim()
  if (!text) return ''
  const fence = text.match(/```(?:python)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  return text
}

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
      if (detail && typeof detail === 'object') {
        const msg = detail.message || 'Yêu cầu thất bại'
        const errs = detail.validation?.errors
        if (Array.isArray(errs) && errs.length) {
          detail = `${msg}\n- ${errs.join('\n- ')}`
        } else {
          detail = msg
        }
        const err = new Error(detail)
        err.payload = data.detail
        throw err
      }
    } catch (e) {
      if (e instanceof Error && e.payload) throw e
      /* ignore parse errors */
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
  const [validationMode, setValidationMode] = useState(loadValidationMode)
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
  const [generatingProblem, setGeneratingProblem] = useState(false)
  const [ggbReady, setGgbReady] = useState(false)
  const [manimReady, setManimReady] = useState(false)
  const [problemReady, setProblemReady] = useState(false)
  const [solutionText, setSolutionText] = useState('')
  const [solutionSteps, setSolutionSteps] = useState([])
  const [manimGuidance, setManimGuidance] = useState('')
  const [videoFormat, setVideoFormat] = useState('landscape')
  const [storyboardText, setStoryboardText] = useState('')
  const [storyboardReady, setStoryboardReady] = useState(false)
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false)
  const [revisePrompt, setRevisePrompt] = useState('')
  const [useLogForRevise, setUseLogForRevise] = useState(true)
  const [revisingManim, setRevisingManim] = useState(false)
  const [reviseNotes, setReviseNotes] = useState('')
  const [manimValidation, setManimValidation] = useState(null)
  const [repairingManim, setRepairingManim] = useState(false)
  const [repairRounds, setRepairRounds] = useState(2)
  const [proPaste, setProPaste] = useState('')
  const [proPromptMsg, setProPromptMsg] = useState('')
  const [showProPrompt, setShowProPrompt] = useState(true)
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
  const [syncToNarration, setSyncToNarration] = useState(true)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [applyingVoice, setApplyingVoice] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [voiceSyncMsg, setVoiceSyncMsg] = useState(null)

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

  const persistValidationMode = useCallback((mode) => {
    setValidationMode(mode)
    try {
      localStorage.setItem(VALIDATION_MODE_STORAGE, mode)
    } catch {
      /* ignore */
    }
  }, [])

  const effectiveValidationMode = useMemo(() => {
    if (validationMode === 'auto') {
      return backend.default_validation_mode || 'render_free'
    }
    return validationMode
  }, [validationMode, backend.default_validation_mode])

  const ceChecklist = useMemo(
    () =>
      effectiveValidationMode === 'local_latex'
        ? CE_CHECKLIST_LOCAL
        : CE_CHECKLIST_RENDER_FREE,
    [effectiveValidationMode],
  )

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const data = await api('/api/health')
        if (!cancelled) {
          setBackend(data)
          if (
            validationMode === 'auto' &&
            data.default_validation_mode === 'local_latex'
          ) {
            persistValidationMode('local_latex')
          }
        }
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
  }, [validationMode, persistValidationMode])

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
        body: JSON.stringify({
          code,
          scene,
          quality,
          validate_first: true,
          validation_mode: effectiveValidationMode,
        }),
      })
      setJobId(res.job_id)
      setLog((prev) => prev + `Job ${res.job_id} đã bắt đầu.\n`)
      pollJob(res.job_id)
    } catch (err) {
      setCompiling(false)
      if (err.payload?.validation) {
        setManimValidation(err.payload.validation)
        setShowLog(true)
        setLog(
          (err.payload.validation.errors || [])
            .map((e) => `VALIDATE ERROR: ${e}`)
            .concat((err.payload.validation.warnings || []).map((w) => `VALIDATE WARN: ${w}`))
            .join('\n') + '\n',
        )
      }
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
    setVoiceSyncMsg(null)
    try {
      const data = await api('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          script: voiceScript,
          voice: ttsVoice,
          rate: ttsRate,
          sync_to_narration: syncToNarration,
        }),
      })
      const bust = Date.now()
      setVideoUrl(`${API_BASE}${data.video_url}?t=${bust}`)
      if (data.audio_url) {
        setAudioUrl(`${API_BASE}${data.audio_url}?t=${bust}`)
      }
      setVoiceSyncMsg(data.sync_note || data.message || 'Đã lồng tiếng')
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

  const handleGenerateProblemSolution = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Nhập gợi ý đề hoặc tải ảnh đề trước.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingProblem(true)
    setError(null)
    setProblemReady(false)
    setGgbReady(false)
    setManimReady(false)
    try {
      const data = await api('/api/generate-problem-solution', {
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
      setProblemText(data.problem_text || '')
      setSolutionText(data.solution_text || '')
      setSolutionSteps(Array.isArray(data.solution_steps) ? data.solution_steps : [])
      setProblemReady(true)
    } catch (err) {
      setError(err.message)
      setProblemReady(false)
    } finally {
      setGeneratingProblem(false)
    }
  }

  const handleUseManualProblemSolution = () => {
    const problem = problemText.trim()
    const solution = solutionText.trim()
    if (!problem) {
      setError('Hãy nhập đề bài vào ô ĐỀ BÀI trước.')
      return
    }
    if (!solution) {
      setError('Hãy nhập lời giải vào ô LỜI GIẢI trước.')
      return
    }
    setError(null)
    setSolutionSteps(
      solution
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    )
    setProblemReady(true)
    setAiTitle((t) => t || 'Đề + lời giải thủ công')
    setAiNotes('Đã xác nhận đề và lời giải nhập tay — không cần AI ở bước này.')
    setGgbReady(false)
    setManimReady(false)
    setStoryboardReady(false)
  }

  const handleGenerateGeogebra = async () => {
    if (!problemText.trim() && !imageDataUrl) {
      setError('Cần đề bài (hoặc ảnh) trước khi tạo GeoGebra.')
      return
    }
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Cần đủ đề bài + lời giải. Nhập tay rồi bấm «Dùng đề + lời giải thủ công», hoặc dùng AI.')
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
          solution_text: solutionText,
          image_base64: imageDataUrl,
          mime_type: imageDataUrl?.startsWith('data:')
            ? imageDataUrl.slice(5, imageDataUrl.indexOf(';'))
            : 'image/png',
        }),
      })

      setAiTitle(data.title || aiTitle || '')
      if (data.notes) setAiNotes(data.notes)
      setGgbMode(data.geogebra_mode || 'geometry')
      setGgbCommandsText(sanitizeGgbCommands((data.geogebra_commands || []).join('\n')))
      setGgbRevision((n) => n + 1)
      setGgbReady(true)
      setProblemReady(true)
      setSavedGgbImage(null)
      setVideoUrl(null)
      setCode('# Chỉnh xong hình GeoGebra, lưu hình, rồi tạo Manim')
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
        setGgbCommandsText(sanitizeGgbCommands(cmds.join('\n')))
      }
      setSavedGgbImage(snap.dataUrl)
      setManimReady(false)
      setStoryboardReady(false)
      setExportMsg('Đã lưu hình sau chỉnh sửa — tiếp theo tạo kịch bản video')
    } catch (err) {
      setError(err.message || 'Lưu hình thất bại')
    } finally {
      setSavingGgb(false)
    }
  }

  const handleGenerateStoryboard = async () => {
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Cần đề bài + lời giải ở cột 1 trước khi tạo kịch bản.')
      return
    }
    if (!ggbCommands.length && !savedGgbImage) {
      setError('Chưa có hình GeoGebra. Hãy sinh hình, chỉnh, rồi bấm Lưu hình.')
      return
    }
    if (!savedGgbImage) {
      setError('Hãy Lưu hình đã chỉnh trước khi tạo kịch bản video.')
      return
    }
    if (!requireApiKey()) return

    setGeneratingStoryboard(true)
    setError(null)
    setStoryboardReady(false)
    setManimReady(false)
    try {
      const data = await api('/api/generate-storyboard', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          problem_text: problemText,
          solution_text: solutionText,
          solution_steps: solutionSteps,
          user_guidance: manimGuidance,
          geogebra_commands: ggbCommands,
          geogebra_mode: ggbMode,
          video_format: videoFormat,
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
        }),
      })
      const sb = data.storyboard || data
      setStoryboardText(JSON.stringify(sb, null, 2))
      setStoryboardReady(true)
      if (data.notes) setAiNotes(data.notes)
      if (data.title) setAiTitle(data.title)
    } catch (err) {
      setError(err.message)
      setStoryboardReady(false)
    } finally {
      setGeneratingStoryboard(false)
    }
  }

  const handleGenerateManim = async () => {
    if (!problemText.trim() || !solutionText.trim()) {
      setError('Manim cần đề bài và lời giải. Hãy tạo/điền ở cột 1 trước.')
      return
    }
    if (!storyboardText.trim()) {
      setError('Hãy tạo kịch bản video trước, rồi mới tạo code Manim.')
      return
    }
    let storyboard
    try {
      storyboard = JSON.parse(storyboardText)
    } catch {
      setError('Kịch bản JSON không hợp lệ — hãy kiểm tra lại hoặc tạo lại kịch bản.')
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
          solution_text: solutionText,
          solution_steps: solutionSteps,
          user_guidance: manimGuidance,
          geogebra_commands: ggbCommands,
          geogebra_mode: ggbMode,
          image_base64: savedGgbImage,
          mime_type: savedGgbImage?.startsWith('data:')
            ? savedGgbImage.slice(5, savedGgbImage.indexOf(';'))
            : 'image/png',
          storyboard,
        }),
      })

      setCode(data.manim_code || '')
      setScenes([data.scene_name])
      setScene(data.scene_name)
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      setReviseNotes('')
      if (data.validation) setManimValidation(data.validation)
      if (data.storyboard) {
        setStoryboardText(JSON.stringify(data.storyboard, null, 2))
        setStoryboardReady(true)
      }
      if (data.notes) setAiNotes(data.notes)
      if (data.validation && !data.validation.ok) {
        setError('Mã Manim đã tạo nhưng chưa qua validate — dùng Repair loop hoặc sửa tay.')
      }
    } catch (err) {
      setError(err.message)
      setManimReady(false)
    } finally {
      setGeneratingManim(false)
    }
  }

  const handleValidateManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để kiểm tra.')
      return
    }
    setError(null)
    try {
      const data = await api('/api/validate-manim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manim_code: code, validation_mode: effectiveValidationMode }),
      })
      setManimValidation(data)
      if (data.scene_names?.length) {
        setScenes(data.scene_names)
        if (!data.scene_names.includes(scene)) setScene(data.scene_names[0])
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const geminiProPrompt = useMemo(
    () => buildGeminiProPrompt(problemText, solutionText, effectiveValidationMode),
    [problemText, solutionText, effectiveValidationMode],
  )

  const handleCopyGeminiProPrompt = async () => {
    try {
      await navigator.clipboard.writeText(geminiProPrompt)
      setProPromptMsg('Đã copy prompt — dán vào Gemini Pro chat, rồi copy code trả về vào ô bên dưới.')
    } catch {
      setProPromptMsg('Không copy được — hãy chọn toàn bộ prompt và Ctrl+C.')
    }
  }

  const handleApplyProPaste = async () => {
    const extracted = extractPythonFromPaste(proPaste)
    if (!extracted || !extracted.includes('class ')) {
      setError('Dán code Python Manim (hoặc khối ```python). Cần có class Scene.')
      return
    }
    setError(null)
    setCode(extracted)
    setTemplateId('')
    setManimReady(true)
    setVideoUrl(null)
    setProPromptMsg('Đã đưa code vào editor — bấm Validate CE rồi Biên dịch.')
    try {
      const data = await api('/api/validate-manim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manim_code: extracted, validation_mode: effectiveValidationMode }),
      })
      setManimValidation(data)
      if (data.scene_names?.length) {
        setScenes(data.scene_names)
        setScene(data.scene_names[0])
      } else {
        const parsed = await api('/api/parse-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: extracted }),
        })
        if (parsed.scenes?.length) {
          setScenes(parsed.scenes)
          setScene(parsed.scenes[0])
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReviseManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để chỉnh sửa.')
      return
    }
    const prompt = revisePrompt.trim()
    const hasLog = Boolean(log?.trim()) && useLogForRevise
    if (!prompt && !hasLog) {
      setError('Nhập yêu cầu chỉnh sửa, hoặc bật dùng nhật ký lỗi sau khi biên dịch thất bại.')
      return
    }
    if (!requireApiKey()) return

    setRevisingManim(true)
    setError(null)
    setReviseNotes('')
    try {
      const data = await api('/api/revise-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          manim_code: code,
          revision_prompt: prompt,
          compile_log: useLogForRevise ? log : '',
          include_compile_log: useLogForRevise,
          problem_text: problemText,
          solution_text: solutionText,
        }),
      })
      setCode(data.manim_code || code)
      if (data.scene_name) {
        setScenes([data.scene_name])
        setScene(data.scene_name)
      }
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      if (data.validation) setManimValidation(data.validation)
      setReviseNotes(data.notes || 'Đã cập nhật mã Manim')
    } catch (err) {
      setError(err.message)
    } finally {
      setRevisingManim(false)
    }
  }

  const handleRepairManim = async () => {
    if (!code.trim() || code.trim().startsWith('#')) {
      setError('Chưa có mã Manim để repair.')
      return
    }
    if (!requireApiKey()) return

    setRepairingManim(true)
    setError(null)
    setReviseNotes('')
    try {
      const data = await api('/api/repair-manim', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          manim_code: code,
          revision_prompt: revisePrompt.trim(),
          compile_log: useLogForRevise ? log : '',
          include_compile_log: useLogForRevise,
          problem_text: problemText,
          solution_text: solutionText,
          max_rounds: repairRounds,
        }),
      })
      setCode(data.manim_code || code)
      if (data.scene_name) {
        setScenes([data.scene_name])
        setScene(data.scene_name)
      }
      setTemplateId('')
      setManimReady(true)
      setVideoUrl(null)
      if (data.validation) setManimValidation(data.validation)
      const n = (data.rounds || []).length
      const ok = data.validation?.ok
      setReviseNotes(
        data.notes ||
          (ok
            ? `Repair xong sau ${n} vòng — validate OK`
            : `Đã thử ${n} vòng repair — vẫn còn lỗi validate`),
      )
      if (!ok) {
        setError('Repair chưa đủ — xem validate / nhật ký, sửa tay hoặc chạy lại.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRepairingManim(false)
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
            <p>1) Đề+lời giải → 2) GeoGebra → kịch bản → Manim → video</p>
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
        {/* Cột 1: Ảnh/đề → AI đề+lời giải → GeoGebra */}
        <section className="panel">
          <h2 className="panel-title">1. Đề bài & lời giải</h2>
          <p className="step-hint">
            Nhập <strong>đề + lời giải thủ công</strong> (khuyến nghị nếu Gemini lỗi), hoặc tải ảnh /
            gợi ý rồi nhờ AI. Sau đó mới tạo GeoGebra.
          </p>

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

          <label className="field">
            <span className="field-label">ĐỀ BÀI (CHỈNH ĐƯỢC)</span>
            <textarea
              rows={5}
              value={problemText}
              onChange={(e) => {
                setProblemText(e.target.value)
                setProblemReady(false)
              }}
              placeholder={'Ví dụ: Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Tính BC.'}
            />
          </label>

          <label className="field">
            <span className="field-label">LỜI GIẢI TỪNG BƯỚC (CHỈNH ĐƯỢC)</span>
            <textarea
              rows={7}
              value={solutionText}
              onChange={(e) => {
                setSolutionText(e.target.value)
                setSolutionSteps(
                  e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                )
                setProblemReady(false)
              }}
              placeholder={'1) ...\n2) ...\n3) ...'}
            />
          </label>

          <div className="export-row">
            <button
              className="btn primary"
              type="button"
              onClick={handleUseManualProblemSolution}
              disabled={!problemText.trim() || !solutionText.trim()}
            >
              <Save size={18} />
              Dùng đề + lời giải thủ công
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={handleGenerateProblemSolution}
              disabled={generatingProblem}
            >
              {generatingProblem ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
              {generatingProblem ? 'Đang tạo đề + lời giải...' : 'AI tạo đề + lời giải'}
            </button>
          </div>

          {aiTitle && (
            <div className="ai-meta">
              <strong>{aiTitle}</strong>
              {aiNotes && <p>{aiNotes}</p>}
            </div>
          )}
          {problemReady && (
            <div className="step-ok">Đã có đề + lời giải — tiếp tục tạo GeoGebra bên dưới.</div>
          )}

          <button
            className="btn secondary"
            type="button"
            onClick={handleGenerateGeogebra}
            disabled={
              generatingGgb || !problemText.trim() || !solutionText.trim()
            }
          >
            {generatingGgb ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingGgb ? 'Đang vẽ GeoGebra...' : 'AI tạo code GeoGebra'}
          </button>

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

          <label className="field">
            <span className="field-label">ĐỊNH DẠNG VIDEO</span>
            <select
              className="select"
              value={videoFormat}
              onChange={(e) => setVideoFormat(e.target.value)}
            >
              <option value="landscape">Landscape 16:9 — hình trái + lời giải phải (median, Muôn Nơi)</option>
              <option value="shorts">Shorts 9:16 — 1 khung tập trung (Thanh Thầy Việt)</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">PROMPT HƯỚNG DẪN (CHO KỊCH BẢN + MANIM)</span>
            <textarea
              rows={4}
              value={manimGuidance}
              onChange={(e) => setManimGuidance(e.target.value)}
              placeholder={
                'Ví dụ:\n- Hình bên trái, lời giải bên phải\n- Bước 1 hiện đoạn AB rồi Indicate\n- Chữ lời giải cỡ nhỏ, màu trắng'
              }
            />
          </label>

          <button
            className="btn secondary"
            type="button"
            onClick={handleGenerateStoryboard}
            disabled={generatingStoryboard || !savedGgbImage}
          >
            {generatingStoryboard ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
            {generatingStoryboard ? 'Đang tạo kịch bản...' : 'AI tạo kịch bản video'}
          </button>

          <label className="field">
            <span className="field-label">KỊCH BẢN VIDEO (JSON — CHỈNH ĐƯỢC)</span>
            <p className="step-hint">
              Math-To-Manim + STYLE_VN: video_format → beats (title → problem → construction →
              solution_steps → conclusion → check). Màu NTSM: điểm đỏ, cạnh xanh dương, tròn xanh lá.
            </p>
            <textarea
              rows={10}
              className="mono"
              value={storyboardText}
              onChange={(e) => {
                setStoryboardText(e.target.value)
                setStoryboardReady(Boolean(e.target.value.trim()))
                setManimReady(false)
              }}
              placeholder="Bấm “AI tạo kịch bản video” — mỗi beat = 1 bước lời giải + hiệu ứng hình..."
            />
          </label>
          {storyboardReady && (
            <div className="step-ok">Đã có kịch bản — có thể chỉnh JSON rồi tạo code Manim.</div>
          )}

          <button
            className="btn primary"
            type="button"
            onClick={handleGenerateManim}
            disabled={generatingManim || !storyboardText.trim()}
          >
            {generatingManim ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {generatingManim ? 'Đang tạo Manim từ kịch bản...' : 'Tạo code Manim từ kịch bản'}
          </button>
          {!problemText.trim() || !solutionText.trim() ? (
            <div className="export-msg">Cần đề bài + lời giải ở cột 1.</div>
          ) : null}
          {!savedGgbImage && ggbCommands.length > 0 && (
            <div className="export-msg">Chỉnh hình xong hãy bấm “Lưu hình đã chỉnh” trước.</div>
          )}
          {manimReady && (
            <div className="step-ok">Đã có Manim — sang cột 3 để validate / biên dịch video.</div>
          )}
        </section>

        {/* Cột 3: Manim + Video */}
        <section className="panel">
          <h2 className="panel-title">3. Manim → video</h2>
          <p className="step-hint">
            Luồng Pro: copy prompt → Gemini Pro → dán code → Validate → Biên dịch 480p. Chế độ{' '}
            <strong>{effectiveValidationMode === 'local_latex' ? 'Local + LaTeX' : 'Render Free'}</strong>
            {backend.deps?.latex ? ' (LaTeX OK)' : ' (chưa có LaTeX)'}.
          </p>

          <div className="validation-mode-row">
            <span className="field-label">CHẾ ĐỘ KIỂM TRA CODE</span>
            <div className="export-row">
              <button
                type="button"
                className={`btn secondary export-btn ${effectiveValidationMode === 'local_latex' ? 'active-mode' : ''}`}
                onClick={() => persistValidationMode('local_latex')}
                disabled={!backend.deps?.latex}
                title={backend.deps?.latex ? 'Cho phép MathTex' : 'Cài MiKTeX trước'}
              >
                Local + LaTeX
              </button>
              <button
                type="button"
                className={`btn secondary export-btn ${effectiveValidationMode === 'render_free' ? 'active-mode' : ''}`}
                onClick={() => persistValidationMode('render_free')}
              >
                Render Free
              </button>
            </div>
          </div>

          <div className="pro-workflow-box">
            <h3 className="voiceover-title">
              <Code2 size={16} /> Dán code từ Gemini Pro
            </h3>
            <ol className="ce-checklist">
              {ceChecklist.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ol>

            <div className="export-row">
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={() => setShowProPrompt((v) => !v)}
              >
                <FileText size={15} /> {showProPrompt ? 'Ẩn prompt mẫu' : 'Hiện prompt mẫu'}
              </button>
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleCopyGeminiProPrompt}
              >
                <Copy size={15} /> Copy prompt (kèm đề + lời giải)
              </button>
            </div>

            {showProPrompt && (
              <label className="field">
                <span className="field-label">PROMPT MẪU (CHỈNH ĐƯỢC TRƯỚC KHI COPY)</span>
                <textarea
                  rows={8}
                  className="mono"
                  readOnly
                  value={geminiProPrompt}
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">DÁN CODE MANIM TỪ GEMINI PRO</span>
              <textarea
                rows={6}
                className="mono"
                value={proPaste}
                onChange={(e) => setProPaste(e.target.value)}
                placeholder={'Dán toàn bộ file .py hoặc khối ```python ... ``` từ Gemini Pro'}
              />
            </label>
            <div className="export-row">
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleApplyProPaste}
                disabled={!proPaste.trim()}
              >
                <Upload size={15} /> Áp dụng vào editor + Validate CE
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => {
                  setProPaste('')
                  setProPromptMsg('')
                }}
                disabled={!proPaste.trim()}
              >
                <X size={15} /> Xóa ô dán
              </button>
            </div>
            {proPromptMsg && <div className="step-ok">{proPromptMsg}</div>}
          </div>

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

          {manimValidation && (
            <div className={`validation-box ${manimValidation.ok ? 'ok' : 'bad'}`}>
              <strong>{manimValidation.ok ? 'Validate OK' : 'Validate có lỗi'}</strong>
              {(manimValidation.errors || []).length > 0 && (
                <ul>
                  {manimValidation.errors.map((err, i) => (
                    <li key={`ve-${i}`}>{err}</li>
                  ))}
                </ul>
              )}
              {(manimValidation.warnings || []).length > 0 && (
                <ul className="validation-warn">
                  {manimValidation.warnings.map((w, i) => (
                    <li key={`vw-${i}`}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="revise-box">
            <h3 className="voiceover-title">
              <Wrench size={16} /> AI sửa / repair (Math-To-Manim)
            </h3>
            <p className="step-hint">
              Validate chặn Tex &amp; import nguy hiểm trước khi render. Repair loop: validate → AI
              sửa theo lỗi/log → validate lại (1–3 vòng).
            </p>
            <label className="field">
              <span className="field-label">PROMPT CHỈNH SỬA</span>
              <textarea
                rows={4}
                value={revisePrompt}
                onChange={(e) => setRevisePrompt(e.target.value)}
                placeholder={
                  'Ví dụ:\n- Chữ lời giải nhỏ hơn, đặt bên phải\n- Bước 2 hãy Indicate đoạn AH\n- Đổi Tex sang Text; sửa lỗi theo nhật ký'
                }
              />
            </label>
            <label className="field check-row">
              <input
                type="checkbox"
                checked={useLogForRevise}
                onChange={(e) => setUseLogForRevise(e.target.checked)}
              />
              <span>
                Dùng nhật ký biên dịch / lỗi để sửa ({log?.trim() ? 'đã có log' : 'chưa có log'})
              </span>
            </label>
            <label className="field">
              <span className="field-label">SỐ VÒNG REPAIR</span>
              <select
                value={repairRounds}
                onChange={(e) => setRepairRounds(Number(e.target.value))}
                disabled={repairingManim}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <div className="export-row">
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={handleValidateManim}
                disabled={!code.trim() || revisingManim || repairingManim}
              >
                <FileText size={15} /> Validate
              </button>
              <button
                type="button"
                className="btn secondary export-btn"
                onClick={handleReviseManim}
                disabled={revisingManim || repairingManim || !code.trim()}
              >
                {revisingManim ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
                {revisingManim ? 'Đang sửa...' : 'AI sửa 1 lần'}
              </button>
              <button
                type="button"
                className="btn primary export-btn"
                onClick={handleRepairManim}
                disabled={revisingManim || repairingManim || !code.trim()}
              >
                {repairingManim ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
                {repairingManim ? 'Đang repair...' : 'Repair loop'}
              </button>
              <button
                type="button"
                className="btn ghost export-btn"
                onClick={() => setShowLog(true)}
              >
                <FileText size={15} /> Xem nhật ký
              </button>
            </div>
            {reviseNotes && <div className="step-ok">{reviseNotes}</div>}
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
              TTS đọc và ghép vào MP4. Bật “Khớp nhịp hình” để kéo giãn/nén hiệu ứng cho gần với độ dài
              lời đọc (tương đối).
            </p>

            <label className="field check-row">
              <input
                type="checkbox"
                checked={syncToNarration}
                onChange={(e) => setSyncToNarration(e.target.checked)}
              />
              <span>Khớp nhịp hình với lời đọc (tương đối)</span>
            </label>

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

            {voiceSyncMsg && <div className="step-ok">{voiceSyncMsg}</div>}

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
