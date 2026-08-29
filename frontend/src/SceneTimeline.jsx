import { Eye, EyeOff, GripVertical } from 'lucide-react'
import { phaseLabel } from './storyboardTimeline'

export default function SceneTimeline({
  timeline,
  onMove,
  onToggleVisible,
  disabled = false,
}) {
  if (!timeline?.length) {
    return (
      <p className="step-hint timeline-empty">
        Chưa có cảnh — tạo kịch bản JSON trước, timeline sẽ hiện danh sách beat tại đây.
      </p>
    )
  }

  const visibleCount = timeline.filter((t) => t.visible).length

  return (
    <div className="scene-timeline">
      <div className="scene-timeline-head">
        <span className="field-label">TIMELINE CẢNH</span>
        <span className="timeline-meta">
          {visibleCount}/{timeline.length} hiện
        </span>
      </div>
      <p className="step-hint">
        ↑↓ đổi thứ tự beat · 👁 ẩn/hiện cảnh · Thứ tự này được ghi vào JSON kịch bản.
      </p>
      <ol className="scene-timeline-list">
        {timeline.map((item, idx) => (
          <li
            key={item.id}
            className={`scene-timeline-item ${item.visible ? '' : 'is-hidden'}`}
          >
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
          </li>
        ))}
      </ol>
    </div>
  )
}
