---
name: manim-studio-impact
description: Phân tích blast radius trước khi sửa Manim Studio — GitNexus impact hoặc PROJECT-GRAPH map.
---

# Impact analysis trước khi sửa

## Khi nào bắt buộc

- Đổi signature hàm backend được gọi từ `main.py` hoặc `App.jsx`
- Sửa format JSON `beats[]` / `narration_text`
- Đổi rule layout Shorts (`manim_style.py`, `SHORTS_TQH_LAYOUT_RULES`)
- Refactor handler lớn trong `App.jsx`

## Cách 1 — GitNexus MCP (ưu tiên)

```
impact({ target: "<tên hàm>", direction: "upstream", repo: "manim-video-studio" })
```

| Depth | Ý nghĩa |
|-------|---------|
| d=1 | Gọi trực tiếp — **sẽ vỡ nếu đổi API** |
| d=2 | Ảnh hưởng gián tiếp |
| d=3 | Cần test thêm |

Trước commit:

```
detect_changes({ scope: "all", repo: "manim-video-studio" })
```

CLI khi không có MCP (trong thư mục repo):

```bash
npx gitnexus@latest impact "merge_beats_voiceover" --direction upstream --repo .
npx gitnexus@latest detect-changes --scope all --repo .
```

## Cách 2 — PROJECT-GRAPH (không cần GitNexus)

Đọc §6 API index + §7 File map + §8 Chỉ mục sửa nhanh:

| Sửa file | Thường ảnh hưởng |
|----------|------------------|
| `manim_style.py` | `generate.py`, `GEM-INSTRUCTIONS-MANIM.txt`, `App.jsx` prompts, examples |
| `beat_voiceover.py` | `main.py` routes, `App.jsx` beat voiceover handlers |
| `storyboardTimeline.js` | `SceneTimeline.jsx`, `App.jsx` storyboard state |
| `generate.py` prompts | UI generate buttons, output JSON/code |

## Rủi ro đặc thù dự án

- **Frontend ↔ Backend**: field Python (`beat_id`, `timeline`) có thể không link cross-language trong GitNexus — grep thêm `App.jsx` khi `risk: UNKNOWN`.
- **Gem instructions**: đổi rule code → cập nhật `docs/GEM-INSTRUCTIONS-MANIM.txt` cùng lúc.
- **Mẫu examples**: đổi layout → sync 3 file `style_shorts_*.py`.

Cảnh báo user nếu impact HIGH/CRITICAL trước khi sửa.
