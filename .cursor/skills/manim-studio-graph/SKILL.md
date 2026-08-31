---
name: manim-studio-graph
description: Bản đồ hệ thống Manim Video Studio — đọc trước khi explore/sửa repo để tiết kiệm token.
---

# Skill: Manim Studio Project Graph

## Khi nào dùng

- Bất kỳ task nào trên repo `manim-video-studio` (sửa UI, API, prompt, layout Shorts, TTS, Gem).
- **Trước** khi `grep` / `Task explore` toàn repo.

## Bước bắt buộc

1. Đọc **`docs/PROJECT-GRAPH.md`** (nguồn chân lý, ~150 dòng).
2. Chỉ mở file cụ thể từ mục **§8 Chỉ mục sửa nhanh** hoặc **§7 File map**.
3. Không đọc `frontend/node_modules/`, `frontend/dist/`, `.git/`.

## Quy tắc token

| Làm | Không làm |
|-----|-----------|
| Đọc PROJECT-GRAPH + 1–3 file liên quan | Quét toàn bộ App.jsx (3800+ dòng) nếu chỉ sửa TTS |
| Dùng grep có `path` hẹp | `glob **/*` trên node_modules |
| Sửa `manim_style.py` khi đổi layout Shorts | Copy rule vào 5 file nếu 1 file đủ |

## Workflow giáo viên (tóm tắt)

```
Đề (cột1) → GeoGebra → Kịch bản JSON + timeline (cột2) → Manim code → Compile (cột3)
→ Ghép giọng beat HOẶC VoiceoverScene HOẶC lồng tiếng 1 đoạn
```

## Layout Shorts hiện tại

- `center_block()` + `aligned_edge=LEFT` cho chữ; `center_x()` cho hình.
- Không dùng rule cũ `center_x` từng dòng / `MARGIN=0.18` trong `.mdc` lỗi thời.

## Cập nhật graph

Khi thêm endpoint, module, hoặc cột UI mới → cập nhật `docs/PROJECT-GRAPH.md` trong cùng PR.
