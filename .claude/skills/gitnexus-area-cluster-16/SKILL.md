---
name: gitnexus-area-cluster-16
description: "Skill for the Cluster_16 area of manim-video-studio. 11 symbols across 2 files."
---

# Cluster_16

11 symbols | 2 files | Cohesion: 92%

## When to Use

- Working with code in `frontend/`
- Understanding how applyFigureManifest, handleRefreshFigureReference, moveConstructionItem work
- Modifying cluster_16-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/figureReference.js` | buildManimReferenceCode, defaultConstructionOrder, manifestToFigureObjects, manimPosExpr, normalizeFigureCoords (+2) |
| `frontend/src/App.jsx` | applyFigureManifest, handleRefreshFigureReference, moveConstructionItem, updateConstructionOrder |

## Entry Points

Start here when exploring this area:

- **`applyFigureManifest`** (Function) — `frontend/src/App.jsx:904`
- **`handleRefreshFigureReference`** (Function) — `frontend/src/App.jsx:1753`
- **`moveConstructionItem`** (Function) — `frontend/src/App.jsx:928`
- **`updateConstructionOrder`** (Function) — `frontend/src/App.jsx:915`
- **`buildManimReferenceCode`** (Function) — `frontend/src/figureReference.js:151`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `applyFigureManifest` | Function | `frontend/src/App.jsx` | 904 |
| `handleRefreshFigureReference` | Function | `frontend/src/App.jsx` | 1753 |
| `moveConstructionItem` | Function | `frontend/src/App.jsx` | 928 |
| `updateConstructionOrder` | Function | `frontend/src/App.jsx` | 915 |
| `buildManimReferenceCode` | Function | `frontend/src/figureReference.js` | 151 |
| `defaultConstructionOrder` | Function | `frontend/src/figureReference.js` | 54 |
| `manifestToFigureObjects` | Function | `frontend/src/figureReference.js` | 65 |
| `normalizeFigureCoords` | Function | `frontend/src/figureReference.js` | 29 |
| `toManimXY` | Function | `frontend/src/figureReference.js` | 50 |
| `manimPosExpr` | Function | `frontend/src/figureReference.js` | 139 |
| `round3` | Function | `frontend/src/figureReference.js` | 2 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFixCanvasFromError → Round3` | cross_community | 5 |
| `HandleRefreshFigureReference → Round3` | intra_community | 5 |
| `HandleSaveGgbFigure → Round3` | cross_community | 5 |
| `HandleFixCanvasFromError → DefaultConstructionOrder` | cross_community | 4 |
| `HandleFixCanvasFromError → ManimPosExpr` | cross_community | 4 |
| `HandleFixCanvasFromError → NormalizeFigureCoords` | cross_community | 4 |
| `HandleRefreshFigureReference → DefaultConstructionOrder` | intra_community | 4 |
| `HandleRefreshFigureReference → ManimPosExpr` | intra_community | 4 |
| `HandleRefreshFigureReference → NormalizeFigureCoords` | intra_community | 4 |
| `HandleSaveGgbFigure → DefaultConstructionOrder` | cross_community | 4 |

## How to Explore

1. `context({name: "applyFigureManifest"})` — see callers and callees
2. `query({search_query: "cluster_16"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
