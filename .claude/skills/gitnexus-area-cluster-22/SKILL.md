---
name: gitnexus-area-cluster-22
description: "Skill for the Cluster_22 area of manim-video-studio. 6 symbols across 3 files."
---

# Cluster_22

6 symbols | 3 files | Cohesion: 63%

## When to Use

- Working with code in `frontend/`
- Understanding how handleApplyBeatVoiceover, handleSaveCustomTemplate, saveCustomLayoutTemplate work
- Modifying cluster_22-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | handleApplyBeatVoiceover, handleSaveCustomTemplate |
| `frontend/src/layoutTemplates.js` | saveCustomLayoutTemplate, saveCustomTemplates |
| `frontend/src/storyboardTimeline.js` | parseStoryboardJson, timelineToNarrationSegments |

## Entry Points

Start here when exploring this area:

- **`handleApplyBeatVoiceover`** (Function) — `frontend/src/App.jsx:1112`
- **`handleSaveCustomTemplate`** (Function) — `frontend/src/App.jsx:1179`
- **`saveCustomLayoutTemplate`** (Function) — `frontend/src/layoutTemplates.js:74`
- **`parseStoryboardJson`** (Function) — `frontend/src/storyboardTimeline.js:31`
- **`timelineToNarrationSegments`** (Function) — `frontend/src/storyboardTimeline.js:113`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleApplyBeatVoiceover` | Function | `frontend/src/App.jsx` | 1112 |
| `handleSaveCustomTemplate` | Function | `frontend/src/App.jsx` | 1179 |
| `saveCustomLayoutTemplate` | Function | `frontend/src/layoutTemplates.js` | 74 |
| `parseStoryboardJson` | Function | `frontend/src/storyboardTimeline.js` | 31 |
| `timelineToNarrationSegments` | Function | `frontend/src/storyboardTimeline.js` | 113 |
| `saveCustomTemplates` | Function | `frontend/src/layoutTemplates.js` | 58 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSaveCustomTemplate → SaveCustomTemplates` | intra_community | 3 |
| `HandleTimelineMove → ParseStoryboardJson` | cross_community | 3 |
| `HandleSaveCustomTemplate → LoadCustomTemplates` | cross_community | 3 |
| `HandleTimelineNarrationChange → ParseStoryboardJson` | cross_community | 3 |
| `HandleTimelineToggle → ParseStoryboardJson` | cross_community | 3 |

## How to Explore

1. `context({name: "handleApplyBeatVoiceover"})` — see callers and callees
2. `query({search_query: "cluster_22"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
