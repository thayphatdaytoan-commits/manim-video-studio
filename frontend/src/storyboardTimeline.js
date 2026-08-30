/** Timeline cảnh — parse / sync beats từ kịch bản JSON (Hướng A). */

const PHASE_LABELS = {
  title: 'Tiêu đề',
  problem: 'Đề bài',
  problem_and_figure: 'Đề + hình',
  transition_hide_problem: 'Ẩn đề → hình lên',
  construction: 'Dựng hình',
  solution_steps: 'Lời giải',
  page_break: 'Sang trang',
  conclusion: 'Kết luận',
  check_question: 'Câu hỏi kiểm tra',
}

export function phaseLabel(phase) {
  return PHASE_LABELS[phase] || phase || 'Cảnh'
}

function beatSummary(beat, index) {
  const phase = beat?.phase || `beat_${index + 1}`
  const lines = beat?.text_lines || beat?.comment_vi || []
  const first = Array.isArray(lines) ? lines[0] : lines
  const text = typeof first === 'string' ? first.trim() : ''
  if (text) return text.slice(0, 72) + (text.length > 72 ? '…' : '')
  const targets = beat?.figure_targets || beat?.indicate_targets
  if (Array.isArray(targets) && targets.length) {
    return `Hình: ${targets.slice(0, 3).join(', ')}`
  }
  return phaseLabel(phase)
}

export function parseStoryboardJson(text) {
  const raw = (text || '').trim()
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return data
  } catch {
    return null
  }
}

/** Chuyển beats JSON → mảng timeline (id, order, visible). */
export function beatsToTimeline(beats) {
  if (!Array.isArray(beats)) return []
  return beats.map((beat, index) => {
    const id = beat?.id ?? `beat-${index}`
    const narrationText = beat?.narration_text || ''
    return {
      id,
      order: index,
      visible: beat?.visible !== false,
      phase: beat?.phase || `beat_${index + 1}`,
      summary: beatSummary(beat, index),
      narrationText,
      beat: { ...beat, id, narration_text: narrationText },
    }
  })
}

/** Gộp timeline (đổi thứ tự / ẩn hiện) ngược vào storyboard JSON. */
export function applyTimelineToStoryboard(storyboard, timeline) {
  if (!storyboard || !Array.isArray(timeline) || !timeline.length) return storyboard
  const sorted = [...timeline].sort((a, b) => a.order - b.order)
  const beats = sorted.map((item) => {
    const beat = { ...(item.beat || {}) }
    beat.visible = item.visible !== false
    beat.id = item.id
    if (item.narrationText != null) {
      beat.narration_text = item.narrationText
    }
    return beat
  })
  return { ...storyboard, beats }
}

/** Chỉ giữ beat visible=true (cho codegen / preview). */
export function storyboardWithVisibleBeats(storyboard) {
  if (!storyboard?.beats) return storyboard
  return {
    ...storyboard,
    beats: storyboard.beats.filter((b) => b?.visible !== false),
    _timeline_hidden_count: storyboard.beats.filter((b) => b?.visible === false).length,
  }
}

export function moveTimelineItem(timeline, index, direction) {
  const next = timeline.map((item, i) => ({ ...item, order: i }))
  const j = index + direction
  if (j < 0 || j >= next.length) return next
  const tmp = next[index].order
  next[index] = { ...next[index], order: next[j].order }
  next[j] = { ...next[j], order: tmp }
  return next.sort((a, b) => a.order - b.order)
}

export function toggleTimelineVisibility(timeline, index) {
  return timeline.map((item, i) =>
    i === index ? { ...item, visible: !item.visible } : item,
  )
}

/** Cập nhật lời đọc TTS của một beat trên timeline. */
export function updateTimelineNarration(timeline, index, narrationText) {
  return timeline.map((item, i) => {
    if (i !== index) return item
    const beat = { ...(item.beat || {}), narration_text: narrationText }
    return { ...item, narrationText, beat }
  })
}

/** Lấy danh sách segment gửi API voiceover/beats. */
export function timelineToNarrationSegments(timeline) {
  return timeline
    .filter((item) => item.visible && (item.narrationText || '').trim())
    .map((item) => ({
      beat_id: item.id,
      phase: item.phase,
      label: item.beat?.comment_vi || item.summary?.slice(0, 40) || item.phase,
      narration_text: (item.narrationText || '').trim(),
    }))
}
