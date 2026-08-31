---
name: gitnexus-area-cluster-26
description: "Skill for the Cluster_26 area of manim-video-studio. 5 symbols across 3 files."
---

# Cluster_26

5 symbols | 3 files | Cohesion: 67%

## When to Use

- Working with code in `frontend/`
- Understanding how handleGenerateBeatNarrations, SceneTimeline, beatsToTimeline work
- Modifying cluster_26-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/storyboardTimeline.js` | beatSummary, beatsToTimeline, phaseLabel |
| `frontend/src/App.jsx` | handleGenerateBeatNarrations |
| `frontend/src/SceneTimeline.jsx` | SceneTimeline |

## Entry Points

Start here when exploring this area:

- **`handleGenerateBeatNarrations`** (Function) — `frontend/src/App.jsx:1080`
- **`SceneTimeline`** (Function) — `frontend/src/SceneTimeline.jsx:3`
- **`beatsToTimeline`** (Function) — `frontend/src/storyboardTimeline.js:44`
- **`phaseLabel`** (Function) — `frontend/src/storyboardTimeline.js:14`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleGenerateBeatNarrations` | Function | `frontend/src/App.jsx` | 1080 |
| `SceneTimeline` | Function | `frontend/src/SceneTimeline.jsx` | 3 |
| `beatsToTimeline` | Function | `frontend/src/storyboardTimeline.js` | 44 |
| `phaseLabel` | Function | `frontend/src/storyboardTimeline.js` | 14 |
| `beatSummary` | Function | `frontend/src/storyboardTimeline.js` | 18 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `App → PhaseLabel` | cross_community | 4 |
| `HandleGenerateBeatNarrations → PhaseLabel` | intra_community | 4 |

## How to Explore

1. `context({name: "handleGenerateBeatNarrations"})` — see callers and callees
2. `query({search_query: "cluster_26"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
