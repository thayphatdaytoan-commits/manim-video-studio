---
name: gitnexus-area-cluster-21
description: "Skill for the Cluster_21 area of manim-video-studio. 5 symbols across 1 files."
---

# Cluster_21

5 symbols | 1 files | Cohesion: 89%

## When to Use

- Working with code in `frontend/`
- Understanding how geminiProCodePrompt, geminiProRevisePrompt work
- Modifying cluster_21-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/App.jsx` | geminiProCodePrompt, geminiProRevisePrompt, buildGeminiProCodePrompt, buildGeminiProRevisePrompt, layoutRulesForFormat |

## Entry Points

Start here when exploring this area:

- **`geminiProCodePrompt`** (Function) — `frontend/src/App.jsx:1970`
- **`geminiProRevisePrompt`** (Function) — `frontend/src/App.jsx:1989`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `geminiProCodePrompt` | Function | `frontend/src/App.jsx` | 1970 |
| `geminiProRevisePrompt` | Function | `frontend/src/App.jsx` | 1989 |
| `buildGeminiProCodePrompt` | Function | `frontend/src/App.jsx` | 428 |
| `buildGeminiProRevisePrompt` | Function | `frontend/src/App.jsx` | 493 |
| `layoutRulesForFormat` | Function | `frontend/src/App.jsx` | 356 |

## How to Explore

1. `context({name: "geminiProCodePrompt"})` — see callers and callees
2. `query({search_query: "cluster_21"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
