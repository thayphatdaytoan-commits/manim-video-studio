---
name: gitnexus-area-cluster-30
description: "Skill for the Cluster_30 area of manim-video-studio. 7 symbols across 2 files."
---

# Cluster_30

7 symbols | 2 files | Cohesion: 67%

## When to Use

- Working with code in `frontend/`
- Understanding how syncLayersFromCode, defaultLayoutSlots, defaultRectForLayer work
- Modifying cluster_30-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/sceneLayers.js` | defaultLayoutSlots, defaultRectForLayer, fallbackLayers, mergeLayersWithCode, parseLayersFromCode (+1) |
| `frontend/src/App.jsx` | syncLayersFromCode |

## Entry Points

Start here when exploring this area:

- **`syncLayersFromCode`** (Function) — `frontend/src/App.jsx:959`
- **`defaultLayoutSlots`** (Function) — `frontend/src/sceneLayers.js:459`
- **`defaultRectForLayer`** (Function) — `frontend/src/sceneLayers.js:151`
- **`fallbackLayers`** (Function) — `frontend/src/sceneLayers.js:186`
- **`mergeLayersWithCode`** (Function) — `frontend/src/sceneLayers.js:165`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `syncLayersFromCode` | Function | `frontend/src/App.jsx` | 959 |
| `defaultLayoutSlots` | Function | `frontend/src/sceneLayers.js` | 459 |
| `defaultRectForLayer` | Function | `frontend/src/sceneLayers.js` | 151 |
| `fallbackLayers` | Function | `frontend/src/sceneLayers.js` | 186 |
| `mergeLayersWithCode` | Function | `frontend/src/sceneLayers.js` | 165 |
| `parseLayersFromCode` | Function | `frontend/src/sceneLayers.js` | 403 |
| `uid` | Function | `frontend/src/sceneLayers.js` | 82 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleRescanLayers → Uid` | cross_community | 4 |
| `SyncLayersFromCode → InferLabel` | cross_community | 4 |
| `SyncLayersFromCode → InferType` | cross_community | 4 |
| `SyncLayersFromCode → Uid` | cross_community | 4 |
| `App → DefaultRectForLayer` | cross_community | 3 |
| `HandleRescanLayers → DefaultRectForLayer` | cross_community | 3 |
| `App → Uid` | cross_community | 3 |
| `SyncLayersFromCode → DefaultRectForLayer` | intra_community | 3 |

## How to Explore

1. `context({name: "syncLayersFromCode"})` — see callers and callees
2. `query({search_query: "cluster_30"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
