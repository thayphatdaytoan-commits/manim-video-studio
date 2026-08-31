---
name: gitnexus-area-cluster-43
description: "Skill for the Cluster_43 area of manim-video-studio. 8 symbols across 1 files."
---

# Cluster_43

8 symbols | 1 files | Cohesion: 93%

## When to Use

- Working with code in `frontend/`
- Understanding how buildFullframeBlock, buildLayersBlock, codeWithoutStudioBlocks work
- Modifying cluster_43-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/sceneLayers.js` | buildFullframeBlock, buildLayersBlock, codeWithoutStudioBlocks, findConstructInsertPoint, formatShift (+3) |

## Entry Points

Start here when exploring this area:

- **`buildFullframeBlock`** (Function) — `frontend/src/sceneLayers.js:292`
- **`buildLayersBlock`** (Function) — `frontend/src/sceneLayers.js:267`
- **`codeWithoutStudioBlocks`** (Function) — `frontend/src/sceneLayers.js:477`
- **`injectLayersIntoCode`** (Function) — `frontend/src/sceneLayers.js:388`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildFullframeBlock` | Function | `frontend/src/sceneLayers.js` | 292 |
| `buildLayersBlock` | Function | `frontend/src/sceneLayers.js` | 267 |
| `codeWithoutStudioBlocks` | Function | `frontend/src/sceneLayers.js` | 477 |
| `injectLayersIntoCode` | Function | `frontend/src/sceneLayers.js` | 388 |
| `findConstructInsertPoint` | Function | `frontend/src/sceneLayers.js` | 355 |
| `formatShift` | Function | `frontend/src/sceneLayers.js` | 260 |
| `injectBlockBeforeEndOfConstruct` | Function | `frontend/src/sceneLayers.js` | 374 |
| `stripMarkedBlock` | Function | `frontend/src/sceneLayers.js` | 317 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `InjectLayersIntoCode → FormatShift` | intra_community | 3 |
| `InjectLayersIntoCode → FindConstructInsertPoint` | intra_community | 3 |

## How to Explore

1. `context({name: "buildFullframeBlock"})` — see callers and callees
2. `query({search_query: "cluster_43"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
