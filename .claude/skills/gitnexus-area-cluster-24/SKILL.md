---
name: gitnexus-area-cluster-24
description: "Skill for the Cluster_24 area of manim-video-studio. 6 symbols across 2 files."
---

# Cluster_24

6 symbols | 2 files | Cohesion: 77%

## When to Use

- Working with code in `frontend/`
- Understanding how handleApplyLayoutTemplate, layoutTemplates, applyLayoutTemplateToStoryboard work
- Modifying cluster_24-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/layoutTemplates.js` | applyLayoutTemplateToStoryboard, getLayoutTemplate, listLayoutTemplates, loadCustomTemplates |
| `frontend/src/App.jsx` | handleApplyLayoutTemplate, layoutTemplates |

## Entry Points

Start here when exploring this area:

- **`handleApplyLayoutTemplate`** (Function) — `frontend/src/App.jsx:1162`
- **`layoutTemplates`** (Function) — `frontend/src/App.jsx:947`
- **`applyLayoutTemplateToStoryboard`** (Function) — `frontend/src/layoutTemplates.js:93`
- **`getLayoutTemplate`** (Function) — `frontend/src/layoutTemplates.js:70`
- **`listLayoutTemplates`** (Function) — `frontend/src/layoutTemplates.js:66`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleApplyLayoutTemplate` | Function | `frontend/src/App.jsx` | 1162 |
| `layoutTemplates` | Function | `frontend/src/App.jsx` | 947 |
| `applyLayoutTemplateToStoryboard` | Function | `frontend/src/layoutTemplates.js` | 93 |
| `getLayoutTemplate` | Function | `frontend/src/layoutTemplates.js` | 70 |
| `listLayoutTemplates` | Function | `frontend/src/layoutTemplates.js` | 66 |
| `loadCustomTemplates` | Function | `frontend/src/layoutTemplates.js` | 47 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleApplyLayoutTemplate → LoadCustomTemplates` | intra_community | 4 |
| `HandleSaveCustomTemplate → LoadCustomTemplates` | cross_community | 3 |

## How to Explore

1. `context({name: "handleApplyLayoutTemplate"})` — see callers and callees
2. `query({search_query: "cluster_24"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
