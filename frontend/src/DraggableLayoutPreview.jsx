import { useCallback, useEffect, useRef, useState } from 'react'
import { Move, Save } from 'lucide-react'

const SLOT_COLORS = {
  figure: 'rgba(59, 130, 246, 0.35)',
  problem: 'rgba(250, 204, 21, 0.35)',
  solution: 'rgba(34, 197, 94, 0.35)',
  text: 'rgba(168, 85, 247, 0.35)',
}

function slotColor(id) {
  return SLOT_COLORS[id] || 'rgba(45, 212, 191, 0.35)'
}

export default function DraggableLayoutPreview({
  imageUrl,
  slots,
  onSlotsChange,
  editMode,
  onSaveLayout,
  layoutDirty = false,
}) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return undefined
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setFrameSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [imageUrl])

  const onPointerDown = useCallback(
    (e, slotId) => {
      if (!editMode) return
      e.preventDefault()
      const frame = frameRef.current
      if (!frame) return
      const rect = frame.getBoundingClientRect()
      const slot = slots.find((s) => s.id === slotId)
      if (!slot) return

      dragRef.current = {
        slotId,
        startX: e.clientX,
        startY: e.clientY,
        orig: { ...slot.rect },
        frameW: rect.width,
        frameH: rect.height,
      }

      const onMove = (ev) => {
        const d = dragRef.current
        if (!d) return
        const dx = (ev.clientX - d.startX) / d.frameW
        const dy = (ev.clientY - d.startY) / d.frameH
        const nextRect = {
          ...d.orig,
          x: clamp01(d.orig.x + dx, d.orig.w),
          y: clamp01(d.orig.y + dy, d.orig.h),
        }
        onSlotsChange(
          slots.map((s) => (s.id === d.slotId ? { ...s, rect: nextRect } : s)),
        )
      }

      const onUp = () => {
        dragRef.current = null
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editMode, slots, onSlotsChange],
  )

  if (!imageUrl) return null

  return (
    <div className="layout-preview-root">
      <div
        ref={frameRef}
        className={`layout-preview-frame ${editMode ? 'is-editing' : ''}`}
      >
        <img src={imageUrl} alt="Preview Manim" className="layout-preview-img" draggable={false} />
        {editMode &&
          slots.map((slot) => {
            const left = slot.rect.x * frameSize.w
            const top = slot.rect.y * frameSize.h
            const width = slot.rect.w * frameSize.w
            const height = slot.rect.h * frameSize.h
            return (
              <div
                key={slot.id}
                className="layout-drag-slot"
                style={{
                  left,
                  top,
                  width,
                  height,
                  background: slotColor(slot.id),
                  borderColor: slotColor(slot.id).replace('0.35', '0.9'),
                }}
                onPointerDown={(e) => onPointerDown(e, slot.id)}
                title={`Kéo để di chuyển: ${slot.label}`}
              >
                <span className="layout-drag-label">
                  <Move size={12} /> {slot.label}
                </span>
                <span className="layout-drag-var">{slot.varName}</span>
              </div>
            )
          })}
      </div>
      {editMode && (
        <div className="layout-edit-toolbar">
          <div className="layout-var-names">
            {slots.map((slot) => (
              <label key={slot.id} className="layout-var-field">
                <span>{slot.label}</span>
                <input
                  type="text"
                  className="layout-var-input"
                  value={slot.varName}
                  onChange={(e) =>
                    onSlotsChange(
                      slots.map((s) =>
                        s.id === slot.id ? { ...s, varName: e.target.value.trim() } : s,
                      ),
                    )
                  }
                  placeholder="tên biến trong code"
                />
              </label>
            ))}
          </div>
          <p className="step-hint layout-edit-hint">
            Kéo từng khung → chỉnh <strong>tên biến</strong> khớp code (vd. <code>figure</code>,{' '}
            <code>solution_stack</code>) → <strong>Lưu bố cục</strong> → Preview lại → Biên dịch.
          </p>
          <button
            type="button"
            className="btn primary export-btn"
            onClick={onSaveLayout}
            disabled={!layoutDirty}
          >
            <Save size={15} />
            Lưu bố cục vào code Manim
          </button>
        </div>
      )}
    </div>
  )
}

function clamp01(v, size) {
  return Math.max(0, Math.min(1 - size, v))
}
