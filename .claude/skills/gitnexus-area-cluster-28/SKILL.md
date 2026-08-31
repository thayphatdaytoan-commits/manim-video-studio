---
name: gitnexus-area-cluster-28
description: "Skill for the Cluster_28 area of manim-video-studio. 8 symbols across 2 files."
---

# Cluster_28

8 symbols | 2 files | Cohesion: 93%

## When to Use

- Working with code in `frontend/`
- Understanding how handleTimelineMove, handleTimelineNarrationChange, handleTimelineToggle work
- Modifying cluster_28-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | handleTimelineMove, handleTimelineNarrationChange, handleTimelineToggle, syncTimelineToStoryboard |
| `frontend/src/storyboardTimeline.js` | applyTimelineToStoryboard, moveTimelineItem, toggleTimelineVisibility, updateTimelineNarration |

## Entry Points

Start here when exploring this area:

- **`handleTimelineMove`** (Function) — `frontend/src/App.jsx:1060`
- **`handleTimelineNarrationChange`** (Function) — `frontend/src/App.jsx:1074`
- **`handleTimelineToggle`** (Function) — `frontend/src/App.jsx:1067`
- **`syncTimelineToStoryboard`** (Function) — `frontend/src/App.jsx:1048`
- **`applyTimelineToStoryboard`** (Function) — `frontend/src/storyboardTimeline.js:62`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleTimelineMove` | Function | `frontend/src/App.jsx` | 1060 |
| `handleTimelineNarrationChange` | Function | `frontend/src/App.jsx` | 1074 |
| `handleTimelineToggle` | Function | `frontend/src/App.jsx` | 1067 |
| `syncTimelineToStoryboard` | Function | `frontend/src/App.jsx` | 1048 |
| `applyTimelineToStoryboard` | Function | `frontend/src/storyboardTimeline.js` | 62 |
| `moveTimelineItem` | Function | `frontend/src/storyboardTimeline.js` | 87 |
| `toggleTimelineVisibility` | Function | `frontend/src/storyboardTimeline.js` | 97 |
| `updateTimelineNarration` | Function | `frontend/src/storyboardTimeline.js` | 104 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleTimelineMove → ApplyTimelineToStoryboard` | intra_community | 3 |
| `HandleTimelineMove → ParseStoryboardJson` | cross_community | 3 |
| `HandleTimelineNarrationChange → ApplyTimelineToStoryboard` | intra_community | 3 |
| `HandleTimelineNarrationChange → ParseStoryboardJson` | cross_community | 3 |
| `HandleTimelineToggle → ApplyTimelineToStoryboard` | intra_community | 3 |
| `HandleTimelineToggle → ParseStoryboardJson` | cross_community | 3 |

## How to Explore

1. `context({name: "handleTimelineMove"})` — see callers and callees
2. `query({search_query: "cluster_28"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
