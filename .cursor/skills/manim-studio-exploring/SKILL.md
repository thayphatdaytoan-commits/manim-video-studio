---
name: manim-studio-exploring
description: Khám phá kiến trúc Manim Video Studio — đọc PROJECT-GRAPH trước, dùng GitNexus MCP nếu có.
---

# Khám phá codebase (GitNexus + Project Graph)

## Khi nào dùng

- "Luồng TTS beat hoạt động thế nào?"
- "API compile gọi file nào?"
- "Timeline JSON đi qua những module nào?"
- Lần đầu sửa một vùng (backend / frontend / prompt Gem)

## Bước 1 — Bản đồ thủ công (luôn làm trước)

1. Đọc **`docs/PROJECT-GRAPH.md`** (~150 dòng).
2. Mở **1–3 file** từ §7 File map hoặc §8 Chỉ mục sửa nhanh.
3. Không quét `App.jsx` toàn bộ nếu chỉ cần một handler (grep có `path` hẹp).

## Bước 2 — GitNexus (nếu MCP đã cài)

Xem `docs/HUONG-DAN-GITNEXUS.md` để cài MCP trên Windows.

```
1. list_repos {}  hoặc READ gitnexus://repos
2. READ gitnexus://repo/manim-video-studio/context   → kiểm tra index còn mới
3. query({ search_query: "<khái niệm>", repo: "manim-video-studio" })
4. context({ name: "<symbol>", repo: "manim-video-studio" })
5. READ gitnexus://repo/manim-video-studio/process/{tên flow}
```

Index cũ → trong thư mục repo: `npx gitnexus@latest analyze`

## Vùng quan trọng (Manim Studio)

| Chủ đề | Bắt đầu từ | GitNexus area skill |
|--------|------------|---------------------|
| API FastAPI | `backend/main.py` | `.claude/skills/gitnexus-area-backend/SKILL.md` |
| Prompt Gemini | `backend/generate.py` | backend area |
| TTS beat | `backend/beat_voiceover.py` | backend area |
| UI 3 cột | `frontend/src/App.jsx` | cluster App handlers |
| Timeline | `storyboardTimeline.js`, `SceneTimeline.jsx` | cluster timeline |
| Mẫu Manim | `backend/examples/style_shorts_*.py` | `.claude/skills/gitnexus-area-examples/SKILL.md` |

## Luồng giáo viên (nhắc nhanh)

```
Đề (cột1) → GeoGebra → Kịch bản beats (cột2) → Manim code → Compile (cột3)
→ Ghép giọng beat / lồng tiếng / VoiceoverScene
```

Skill graph tổng: `.cursor/skills/manim-studio-graph/SKILL.md`
