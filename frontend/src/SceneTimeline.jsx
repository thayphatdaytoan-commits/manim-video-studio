import { Eye, EyeOff, GripVertical, Mic } from 'lucide-react'
import { phaseLabel } from './storyboardTimeline'

export default function SceneTimeline({
  timeline,
  onMove,
  onToggleVisible,
  onNarrationChange,
  disabled = false,
  showNarration = false,
}) {
  if (!timeline?.length) {
    return (
      <p className="step-hint timeline-empty">
        Chưa có cảnh — tạo kịch bản JSON trước, timeline sẽ hiện danh sách beat tại đây.
      </p>
    )
  }

  const visibleCount = timeline.filter((t) => t.visible).length
  const narratedCount = timeline.filter((t) => t.visible && (t.narrationText || '').trim()).length

  return (
    <div className="scene-timeline">
      <div className="scene-timeline-head">
        <span className="field-label">TIMELINE CẢNH + LỜI ĐỌC</span>
        <span className="timeline-meta">
          {visibleCount}/{timeline.length} hiện
          {showNarration ? ` · ${narratedCount} có giọng` : ''}
        </span>
      </div>
      <p className="step-hint">
        ↑↓ đổi thứ tự beat · 👁 ẩn/hiện · Mỗi beat có lời đọc riêng (đề / câu a / câu b…) — ghép theo
        timeline sau khi render video.
      </p>
      <ol className="scene-timeline-list">
        {timeline.map((item, idx) => (
          <li
            key={item.id}
            className={`scene-timeline-item ${item.visible ? '' : 'is-hidden'} ${showNarration && item.narrationText ? 'has-narration' : ''}`}
          >
            <div className="timeline-row-main">
              <GripVertical size={14} className="timeline-grip" aria-hidden />
              <span className="timeline-index">{idx + 1}</span>
              <span className="timeline-phase">{phaseLabel(item.phase)}</span>
              <span className="timeline-summary" title={item.summary}>
                {item.summary}
              </span>
              <span className="timeline-actions">
                <button
                  type="button"
                  className="btn ghost construction-move-btn"
                  onClick={() => onMove(idx, -1)}
                  disabled={disabled || idx === 0}
                  title="Lên"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost construction-move-btn"
                  onClick={() => onMove(idx, 1)}
                  disabled={disabled || idx === timeline.length - 1}
                  title="Xuống"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={`btn ghost timeline-eye-btn ${item.visible ? '' : 'off'}`}
                  onClick={() => onToggleVisible(idx)}
                  disabled={disabled}
                  title={item.visible ? 'Ẩn cảnh' : 'Hiện cảnh'}
                >
                  {item.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </span>
            </div>
            {showNarration && item.visible && onNarrationChange && (
              <label className="timeline-narration-field">
                <span className="timeline-narration-label">
                  <Mic size={12} /> Lời đọc (TTS)
                </span>
                <textarea
                  rows={2}
                  className="timeline-narration-input"
                  value={item.narrationText || ''}
                  onChange={(e) => onNarrationChange(idx, e.target.value)}
                  disabled={disabled}
                  placeholder="Để trống = beat im lặng (chỉ hình)…"
                />
              </label>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
