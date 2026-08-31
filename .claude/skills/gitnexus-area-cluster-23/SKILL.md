---
name: gitnexus-area-cluster-23
description: "Skill for the Cluster_23 area of manim-video-studio. 6 symbols across 2 files."
---

# Cluster_23

6 symbols | 2 files | Cohesion: 75%

## When to Use

- Working with code in `frontend/`
- Understanding how handleApplyFullframe, handleSaveLayers, layerTransformsFromState work
- Modifying cluster_23-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/sceneLayers.js` | layerTransformsFromState, rectDeltaToManimShift, round3, shiftsFromSlots |
| `frontend/src/App.jsx` | handleApplyFullframe, handleSaveLayers |

## Entry Points

Start here when exploring this area:

- **`handleApplyFullframe`** (Function) — `frontend/src/App.jsx:1043`
- **`handleSaveLayers`** (Function) — `frontend/src/App.jsx:1005`
- **`layerTransformsFromState`** (Function) — `frontend/src/sceneLayers.js:237`
- **`rectDeltaToManimShift`** (Function) — `frontend/src/sceneLayers.js:212`
- **`shiftsFromSlots`** (Function) — `frontend/src/sceneLayers.js:463`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleApplyFullframe` | Function | `frontend/src/App.jsx` | 1043 |
| `handleSaveLayers` | Function | `frontend/src/App.jsx` | 1005 |
| `layerTransformsFromState` | Function | `frontend/src/sceneLayers.js` | 237 |
| `rectDeltaToManimShift` | Function | `frontend/src/sceneLayers.js` | 212 |
| `shiftsFromSlots` | Function | `frontend/src/sceneLayers.js` | 463 |
| `round3` | Function | `frontend/src/sceneLayers.js` | 78 |

## How to Explore

1. `context({name: "handleApplyFullframe"})` — see callers and callees
2. `query({search_query: "cluster_23"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
