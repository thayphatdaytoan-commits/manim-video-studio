---
name: gitnexus-area-cluster-37
description: "Skill for the Cluster_37 area of manim-video-studio. 6 symbols across 1 files."
---

# Cluster_37

6 symbols | 1 files | Cohesion: 80%

## When to Use

- Working with code in `frontend/`
- Understanding how exportSvgViaApi, finish, maybe work
- Modifying cluster_37-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | exportSvgViaApi, finish, maybe, timer, normalizeSvgText (+1) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `exportSvgViaApi` | Function | `frontend/src/GeoGebraApplet.jsx` | 389 |
| `finish` | Function | `frontend/src/GeoGebraApplet.jsx` | 392 |
| `maybe` | Function | `frontend/src/GeoGebraApplet.jsx` | 403 |
| `timer` | Function | `frontend/src/GeoGebraApplet.jsx` | 400 |
| `normalizeSvgText` | Function | `frontend/src/GeoGebraApplet.jsx` | 344 |
| `svgFromDom` | Function | `frontend/src/GeoGebraApplet.jsx` | 428 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CaptureSvgText → Finish` | cross_community | 3 |
| `CaptureSvgText → NormalizeSvgText` | cross_community | 3 |

## How to Explore

1. `context({name: "exportSvgViaApi"})` — see callers and callees
2. `query({search_query: "cluster_37"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
