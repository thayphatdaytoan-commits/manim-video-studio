---
name: gitnexus-area-cluster-18
description: "Skill for the Cluster_18 area of manim-video-studio. 22 symbols across 2 files."
---

# Cluster_18

22 symbols | 2 files | Cohesion: 92%

## When to Use

- Working with code in `frontend/`
- Understanding how authHeaders, handleAiRefineFigureReference, handleApplyProPaste work
- Modifying cluster_18-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | authHeaders, handleAiRefineFigureReference, handleApplyProPaste, handleApplyVoiceover, handleCodeChange (+16) |
| `frontend/src/storyboardTimeline.js` | storyboardWithVisibleBeats |

## Entry Points

Start here when exploring this area:

- **`authHeaders`** (Function) — `frontend/src/App.jsx:1602`
- **`handleAiRefineFigureReference`** (Function) — `frontend/src/App.jsx:1763`
- **`handleApplyProPaste`** (Function) — `frontend/src/App.jsx:2171`
- **`handleApplyVoiceover`** (Function) — `frontend/src/App.jsx:1535`
- **`handleCodeChange`** (Function) — `frontend/src/App.jsx:1291`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `authHeaders` | Function | `frontend/src/App.jsx` | 1602 |
| `handleAiRefineFigureReference` | Function | `frontend/src/App.jsx` | 1763 |
| `handleApplyProPaste` | Function | `frontend/src/App.jsx` | 2171 |
| `handleApplyVoiceover` | Function | `frontend/src/App.jsx` | 1535 |
| `handleCodeChange` | Function | `frontend/src/App.jsx` | 1291 |
| `handleCompile` | Function | `frontend/src/App.jsx` | 1355 |
| `handleFixCanvasFromError` | Function | `frontend/src/App.jsx` | 1434 |
| `handleGenerateGeogebra` | Function | `frontend/src/App.jsx` | 1671 |
| `handleGenerateManim` | Function | `frontend/src/App.jsx` | 1862 |
| `handleGenerateProblemSolution` | Function | `frontend/src/App.jsx` | 1607 |
| `handleGenerateScript` | Function | `frontend/src/App.jsx` | 1508 |
| `handleGenerateStoryboard` | Function | `frontend/src/App.jsx` | 1804 |
| `handlePreviewFrame` | Function | `frontend/src/App.jsx` | 1396 |
| `handleRepairManim` | Function | `frontend/src/App.jsx` | 2255 |
| `handleReviseManim` | Function | `frontend/src/App.jsx` | 2209 |
| `handleValidateManim` | Function | `frontend/src/App.jsx` | 1926 |
| `pollJob` | Function | `frontend/src/App.jsx` | 1321 |
| `requireApiKey` | Function | `frontend/src/App.jsx` | 1594 |
| `stopPolling` | Function | `frontend/src/App.jsx` | 1314 |
| `storyboardWithVisibleBeats` | Function | `frontend/src/storyboardTimeline.js` | 78 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFixCanvasFromError → Round3` | cross_community | 5 |
| `HandleFixCanvasFromError → DefaultConstructionOrder` | cross_community | 4 |
| `HandleFixCanvasFromError → ManimPosExpr` | cross_community | 4 |
| `HandleFixCanvasFromError → NormalizeFigureCoords` | cross_community | 4 |
| `HandleCompile → Api` | intra_community | 3 |
| `HandleCompile → StopPolling` | intra_community | 3 |
| `HandleGenerateGeogebra → ParseBool` | cross_community | 3 |

## How to Explore

1. `context({name: "authHeaders"})` — see callers and callees
2. `query({search_query: "cluster_18"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
