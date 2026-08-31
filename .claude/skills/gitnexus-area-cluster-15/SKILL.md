---
name: gitnexus-area-cluster-15
description: "Skill for the Cluster_15 area of manim-video-studio. 10 symbols across 3 files."
---

# Cluster_15

10 symbols | 3 files | Cohesion: 61%

## When to Use

- Working with code in `frontend/`
- Understanding how App, applyTemplate, check work
- Modifying cluster_15-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | App, applyTemplate, check, handleApplyGraphPreset, onPickImage (+3) |
| `frontend/src/figureReference.js` | kindLabel |
| `frontend/src/graphPresets.js` | getGraphPreset |

## Entry Points

Start here when exploring this area:

- **`App`** (Function) — `frontend/src/App.jsx:762`
- **`applyTemplate`** (Function) — `frontend/src/App.jsx:1280`
- **`check`** (Function) — `frontend/src/App.jsx:1228`
- **`handleApplyGraphPreset`** (Function) — `frontend/src/App.jsx:1193`
- **`onPickImage`** (Function) — `frontend/src/App.jsx:1573`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `App` | Function | `frontend/src/App.jsx` | 762 |
| `applyTemplate` | Function | `frontend/src/App.jsx` | 1280 |
| `check` | Function | `frontend/src/App.jsx` | 1228 |
| `handleApplyGraphPreset` | Function | `frontend/src/App.jsx` | 1193 |
| `onPickImage` | Function | `frontend/src/App.jsx` | 1573 |
| `persistValidationMode` | Function | `frontend/src/App.jsx` | 888 |
| `getGraphPreset` | Function | `frontend/src/graphPresets.js` | 69 |
| `fileToDataUrl` | Function | `frontend/src/App.jsx` | 753 |
| `loadStoredApiKeys` | Function | `frontend/src/App.jsx` | 696 |
| `kindLabel` | Function | `frontend/src/figureReference.js` | 15 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `App → PhaseLabel` | cross_community | 4 |
| `App → DefaultRectForLayer` | cross_community | 3 |
| `App → Uid` | cross_community | 3 |

## How to Explore

1. `context({name: "App"})` — see callers and callees
2. `query({search_query: "cluster_15"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
