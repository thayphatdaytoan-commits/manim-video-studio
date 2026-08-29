import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Move,
  Save,
} from 'lucide-react'
import { moveLayerZ } from './sceneLayers'

const LAYER_COLORS = [
  'rgba(59, 130, 246, 0.4)',
  'rgba(250, 204, 21, 0.4)',
  'rgba(34, 197, 94, 0.4)',
  'rgba(168, 85, 247, 0.4)',
  'rgba(244, 114, 182, 0.4)',
  'rgba(45, 212, 191, 0.4)',
]

function layerColor(index) {
  return LAYER_COLORS[index % LAYER_COLORS.length]
}

export default function SceneLayerEditor({
  imageUrl,
  layers,
  onLayersChange,
  selectedId,
  onSelectLayer,
  editMode,
  onSaveLayers,
  onApplyFullframe,
  onRescanLayers,
  layersDirty,
  videoFormat,
}) {
  const frameRef = useRef(null)
  const imgRef = useRef(null)
  const layersRef = useRef(layers)
  const dragRef = useRef(null)
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  layersRef.current = layers

  const measureFrame = useCallback(() => {
    const img = imgRef.current
    if (!img) return
    setFrameSize({ w: img.clientWidth, h: img.clientHeight })
  }, [])

  useEffect(() => {
    measureFrame()
    const el = frameRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(measureFrame)
    ro.observe(el)
    return () => ro.disconnect()
  }, [imageUrl, measureFrame])

  const updateLayerById = useCallback(
    (id, patch) => {
      onLayersChange(layersRef.current.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    },
    [onLayersChange],
  )

  const onPointerDownDrag = useCallback(
    (e, layerId) => {
      if (!editMode) return
      e.preventDefault()
      e.stopPropagation()
      const frame = frameRef.current
      const layer = layersRef.current.find((l) => l.id === layerId)
      if (!frame || !layer?.rect) return

      onSelectLayer(layerId)
      const rect = frame.getBoundingClientRect()
      dragRef.current = {
        mode: 'move',
        layerId,
        startX: e.clientX,
        startY: e.clientY,
        orig: { ...layer.rect },
        frameW: rect.width,
        frameH: rect.height,
      }
      e.currentTarget.setPointerCapture(e.pointerId)

      const onMove = (ev) => {
        const d = dragRef.current
        if (!d || d.mode !== 'move') return
        const dx = (ev.clientX - d.startX) / d.frameW
        const dy = (ev.clientY - d.startY) / d.frameH
        updateLayerById(d.layerId, {
          rect: {
            ...d.orig,
            x: clamp(d.orig.x + dx, 0, 1 - d.orig.w),
            y: clamp(d.orig.y + dy, 0, 1 - d.orig.h),
          },
        })
      }

      const onUp = (ev) => {
        dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editMode, onSelectLayer, updateLayerById],
  )

  const onPointerDownResize = useCallback(
    (e, layerId) => {
      if (!editMode) return
      e.preventDefault()
      e.stopPropagation()
      const frame = frameRef.current
      const layer = layersRef.current.find((l) => l.id === layerId)
      if (!frame || !layer?.rect) return

      onSelectLayer(layerId)
      const rect = frame.getBoundingClientRect()
      dragRef.current = {
        mode: 'resize',
        layerId,
        startX: e.clientX,
        startY: e.clientY,
        orig: { ...layer.rect },
        frameW: rect.width,
        frameH: rect.height,
      }
      e.currentTarget.setPointerCapture(e.pointerId)

      const onMove = (ev) => {
        const d = dragRef.current
        if (!d || d.mode !== 'resize') return
        const dw = (ev.clientX - d.startX) / d.frameW
        const dh = (ev.clientY - d.startY) / d.frameH
        updateLayerById(d.layerId, {
          rect: {
            ...d.orig,
            w: clamp(d.orig.w + dw, 0.08, 1 - d.orig.x),
            h: clamp(d.orig.h + dh, 0.06, 1 - d.orig.y),
          },
        })
      }

      const onUp = (ev) => {
        dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [editMode, onSelectLayer, updateLayerById],
  )

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)
  const selected = layers.find((l) => l.id === selectedId)

  if (!imageUrl) return null

  return (
    <div className="scene-layer-editor">
      <div className="layer-canvas-col">
        <div
          ref={frameRef}
          className={`layer-canvas-frame ${editMode ? 'is-editing' : ''}`}
          style={{ width: frameSize.w || undefined, height: frameSize.h || undefined }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Preview"
            className="layer-canvas-img"
            draggable={false}
            onLoad={measureFrame}
          />
          {editMode &&
            sortedLayers.map((layer, idx) => {
              if (layer.visible === false || !layer.rect) return null
              const isSel = layer.id === selectedId
              const left = layer.rect.x * frameSize.w
              const top = layer.rect.y * frameSize.h
              const width = layer.rect.w * frameSize.w
              const height = layer.rect.h * frameSize.h
              return (
                <div
                  key={layer.id}
                  className={`layer-overlay ${isSel ? 'is-selected' : ''}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    background: layerColor(idx),
                    borderColor: layerColor(idx).replace('0.4', '1'),
                    zIndex: 10 + layer.zIndex,
                  }}
                  onPointerDown={(e) => onPointerDownDrag(e, layer.id)}
                >
                  <span className="layer-overlay-label">
                    <Move size={11} /> {layer.label}
                  </span>
                  {isSel && (
                    <div
                      className="layer-resize-handle"
                      onPointerDown={(e) => onPointerDownResize(e, layer.id)}
                      title="Kéo để đổi kích thước"
                    />
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {editMode && (
        <aside className="layer-panel">
          <div className="layer-panel-head">
            <Layers size={16} />
            <span>Lớp (Layers)</span>
            <span className="layer-count">{layers.length}</span>
          </div>
          <ul className="layer-list">
            {sortedLayers.map((layer, idx) => (
              <li
                key={layer.id}
                className={`layer-list-item ${layer.id === selectedId ? 'is-selected' : ''} ${layer.visible === false ? 'is-hidden' : ''}`}
              >
                <button
                  type="button"
                  className="layer-list-select"
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <span className="layer-swatch" style={{ background: layerColor(idx) }} />
                  <span className="layer-list-name">{layer.label}</span>
                  <code className="layer-list-var">{layer.varName}</code>
                </button>
                <span className="layer-list-actions">
                  <button
                    type="button"
                    className="btn ghost construction-move-btn"
                    title="Lên trên (z-order)"
                    onClick={() => onLayersChange(moveLayerZ(layers, layer.id, -1))}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost construction-move-btn"
                    title="Xuống dưới"
                    onClick={() => onLayersChange(moveLayerZ(layers, layer.id, 1))}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost construction-move-btn"
                    onClick={() => updateLayerById(layer.id, { visible: layer.visible === false })}
                    title={layer.visible === false ? 'Hiện' : 'Ẩn'}
                  >
                    {layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="layer-props">
              <div className="field-label">THUỘC TÍNH — {selected.label}</div>
              <div className="layer-props-grid">
                <label>
                  X (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((selected.rect?.x || 0) * 100)}
                    onChange={(e) =>
                      updateLayerById(selected.id, {
                        rect: {
                          ...selected.rect,
                          x: clamp(Number(e.target.value) / 100, 0, 1 - (selected.rect?.w || 0.1)),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Y (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((selected.rect?.y || 0) * 100)}
                    onChange={(e) =>
                      updateLayerById(selected.id, {
                        rect: {
                          ...selected.rect,
                          y: clamp(Number(e.target.value) / 100, 0, 1 - (selected.rect?.h || 0.1)),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Rộng (%)
                  <input
                    type="number"
                    min={8}
                    max={100}
                    step={1}
                    value={Math.round((selected.rect?.w || 0.3) * 100)}
                    onChange={(e) =>
                      updateLayerById(selected.id, {
                        rect: {
                          ...selected.rect,
                          w: clamp(Number(e.target.value) / 100, 0.08, 1 - (selected.rect?.x || 0)),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Cao (%)
                  <input
                    type="number"
                    min={6}
                    max={100}
                    step={1}
                    value={Math.round((selected.rect?.h || 0.2) * 100)}
                    onChange={(e) =>
                      updateLayerById(selected.id, {
                        rect: {
                          ...selected.rect,
                          h: clamp(Number(e.target.value) / 100, 0.06, 1 - (selected.rect?.y || 0)),
                        },
                      })
                    }
                  />
                </label>
                <label className="layer-scale-field">
                  Scale
                  <input
                    type="number"
                    min={0.3}
                    max={3}
                    step={0.05}
                    value={selected.scale || 1}
                    onChange={(e) =>
                      updateLayerById(selected.id, { scale: Number(e.target.value) || 1 })
                    }
                  />
                </label>
                <label>
                  Tên biến
                  <input
                    type="text"
                    value={selected.varName}
                    onChange={(e) =>
                      updateLayerById(selected.id, { varName: e.target.value.trim() })
                    }
                  />
                </label>
              </div>
            </div>
          )}

          <div className="layer-panel-actions">
            <button
              type="button"
              className="btn ghost export-btn"
              onClick={onRescanLayers}
              title="Đọc lại tên biến VGroup/Text từ code Manim"
            >
              Làm mới từ code
            </button>
            <button
              type="button"
              className="btn secondary export-btn"
              onClick={onApplyFullframe}
              title="Xếp tất cả layer full chiều ngang khung 9:16"
            >
              <Maximize2 size={14} /> Fullframe Shorts
            </button>
            <button
              type="button"
              className="btn primary export-btn"
              onClick={onSaveLayers}
              disabled={!layersDirty}
            >
              <Save size={14} /> Lưu layers → code Manim
            </button>
          </div>
          <p className="step-hint layer-hint">
            Chọn layer bên phải → kéo trên ảnh hoặc nhập X/Y/Rộng/Cao/Scale → Lưu → Preview lại →
            Biên dịch.
          </p>
        </aside>
      )}
    </div>
  )
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
