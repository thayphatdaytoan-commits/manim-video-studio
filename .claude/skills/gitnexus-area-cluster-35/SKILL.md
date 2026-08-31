---
name: gitnexus-area-cluster-35
description: "Skill for the Cluster_35 area of manim-video-studio. 7 symbols across 1 files."
---

# Cluster_35

7 symbols | 1 files | Cohesion: 75%

## When to Use

- Working with code in `frontend/`
- Understanding how captureSVG, captureSvgText, prepareGraphicsForExport work
- Modifying cluster_35-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | captureSVG, captureSvgText, prepareGraphicsForExport, readCanvasSize, svgFromPngDataUrl (+2) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `captureSVG` | Function | `frontend/src/GeoGebraApplet.jsx` | 869 |
| `captureSvgText` | Function | `frontend/src/GeoGebraApplet.jsx` | 467 |
| `prepareGraphicsForExport` | Function | `frontend/src/GeoGebraApplet.jsx` | 365 |
| `readCanvasSize` | Function | `frontend/src/GeoGebraApplet.jsx` | 457 |
| `svgFromPngDataUrl` | Function | `frontend/src/GeoGebraApplet.jsx` | 444 |
| `waitFrames` | Function | `frontend/src/GeoGebraApplet.jsx` | 379 |
| `step` | Function | `frontend/src/GeoGebraApplet.jsx` | 381 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CaptureSvgText → Finish` | cross_community | 3 |
| `CaptureSvgText → NormalizeSvgText` | cross_community | 3 |
| `CaptureSvgText → Step` | intra_community | 3 |

## How to Explore

1. `context({name: "captureSVG"})` — see callers and callees
2. `query({search_query: "cluster_35"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
