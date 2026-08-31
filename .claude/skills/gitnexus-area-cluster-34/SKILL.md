---
name: gitnexus-area-cluster-34
description: "Skill for the Cluster_34 area of manim-video-studio. 6 symbols across 1 files."
---

# Cluster_34

6 symbols | 1 files | Cohesion: 86%

## When to Use

- Working with code in `frontend/`
- Understanding how capturePNG, saveSnapshot, canvasToDataUrl work
- Modifying cluster_34-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | capturePNG, saveSnapshot, canvasToDataUrl, capturePngDataUrl, dataUrlToBlob (+1) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `capturePNG` | Function | `frontend/src/GeoGebraApplet.jsx` | 856 |
| `saveSnapshot` | Function | `frontend/src/GeoGebraApplet.jsx` | 840 |
| `canvasToDataUrl` | Function | `frontend/src/GeoGebraApplet.jsx` | 281 |
| `capturePngDataUrl` | Function | `frontend/src/GeoGebraApplet.jsx` | 298 |
| `dataUrlToBlob` | Function | `frontend/src/GeoGebraApplet.jsx` | 276 |
| `toDataUrl` | Function | `frontend/src/GeoGebraApplet.jsx` | 270 |

## How to Explore

1. `context({name: "capturePNG"})` — see callers and callees
2. `query({search_query: "cluster_34"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
