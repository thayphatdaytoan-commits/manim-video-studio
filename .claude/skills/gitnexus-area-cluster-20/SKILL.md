---
name: gitnexus-area-cluster-20
description: "Skill for the Cluster_20 area of manim-video-studio. 6 symbols across 2 files."
---

# Cluster_20

6 symbols | 2 files | Cohesion: 91%

## When to Use

- Working with code in `frontend/`
- Understanding how cursorAgentBrief, cursorAgentFixBrief, geminiProStoryboardPrompt work
- Modifying cluster_20-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | cursorAgentBrief, cursorAgentFixBrief, geminiProStoryboardPrompt, buildCursorAgentBrief, buildGeminiProStoryboardPrompt |
| `frontend/src/figureReference.js` | buildFigureContextBlock |

## Entry Points

Start here when exploring this area:

- **`cursorAgentBrief`** (Function) — `frontend/src/App.jsx:2024`
- **`cursorAgentFixBrief`** (Function) — `frontend/src/App.jsx:2060`
- **`geminiProStoryboardPrompt`** (Function) — `frontend/src/App.jsx:1949`
- **`buildFigureContextBlock`** (Function) — `frontend/src/figureReference.js:254`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `cursorAgentBrief` | Function | `frontend/src/App.jsx` | 2024 |
| `cursorAgentFixBrief` | Function | `frontend/src/App.jsx` | 2060 |
| `geminiProStoryboardPrompt` | Function | `frontend/src/App.jsx` | 1949 |
| `buildFigureContextBlock` | Function | `frontend/src/figureReference.js` | 254 |
| `buildCursorAgentBrief` | Function | `frontend/src/App.jsx` | 589 |
| `buildGeminiProStoryboardPrompt` | Function | `frontend/src/App.jsx` | 361 |

## How to Explore

1. `context({name: "cursorAgentBrief"})` — see callers and callees
2. `query({search_query: "cluster_20"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
