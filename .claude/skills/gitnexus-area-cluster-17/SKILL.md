---
name: gitnexus-area-cluster-17
description: "Skill for the Cluster_17 area of manim-video-studio. 11 symbols across 2 files."
---

# Cluster_17

11 symbols | 2 files | Cohesion: 91%

## When to Use

- Working with code in `frontend/`
- Understanding how applyGgbToPreview, handleSaveGgbFigure, applyNtsmTheme work
- Modifying cluster_17-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | applyTheme, appletOnLoad, applyCommands, applyNtsmTheme, handleSetColor (+4) |
| `frontend/src/App.jsx` | applyGgbToPreview, handleSaveGgbFigure |

## Entry Points

Start here when exploring this area:

- **`applyGgbToPreview`** (Function) — `frontend/src/App.jsx:2306`
- **`handleSaveGgbFigure`** (Function) — `frontend/src/App.jsx:1724`
- **`applyNtsmTheme`** (Function) — `frontend/src/GeoGebraApplet.jsx:134`
- **`sanitizeGgbCommands`** (Function) — `frontend/src/GeoGebraApplet.jsx:798`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `applyGgbToPreview` | Function | `frontend/src/App.jsx` | 2306 |
| `handleSaveGgbFigure` | Function | `frontend/src/App.jsx` | 1724 |
| `applyNtsmTheme` | Function | `frontend/src/GeoGebraApplet.jsx` | 134 |
| `sanitizeGgbCommands` | Function | `frontend/src/GeoGebraApplet.jsx` | 798 |
| `applyTheme` | Function | `frontend/src/GeoGebraApplet.jsx` | 825 |
| `appletOnLoad` | Function | `frontend/src/GeoGebraApplet.jsx` | 920 |
| `applyCommands` | Function | `frontend/src/GeoGebraApplet.jsx` | 12 |
| `handleSetColor` | Function | `frontend/src/GeoGebraApplet.jsx` | 207 |
| `namedColorToRgb` | Function | `frontend/src/GeoGebraApplet.jsx` | 253 |
| `parseBool` | Function | `frontend/src/GeoGebraApplet.jsx` | 193 |
| `safeSetVisible` | Function | `frontend/src/GeoGebraApplet.jsx` | 199 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleSaveGgbFigure → Round3` | cross_community | 5 |
| `HandleSaveGgbFigure → DefaultConstructionOrder` | cross_community | 4 |
| `HandleSaveGgbFigure → ManimPosExpr` | cross_community | 4 |
| `HandleSaveGgbFigure → NormalizeFigureCoords` | cross_community | 4 |
| `HandleGenerateGeogebra → ParseBool` | cross_community | 3 |
| `HandleSaveGgbFigure → ParseBool` | intra_community | 3 |

## How to Explore

1. `context({name: "applyGgbToPreview"})` — see callers and callees
2. `query({search_query: "cluster_17"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
