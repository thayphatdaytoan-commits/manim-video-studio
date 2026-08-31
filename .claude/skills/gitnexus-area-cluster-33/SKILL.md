---
name: gitnexus-area-cluster-33
description: "Skill for the Cluster_33 area of manim-video-studio. 6 symbols across 1 files."
---

# Cluster_33

6 symbols | 1 files | Cohesion: 91%

## When to Use

- Working with code in `frontend/`
- Understanding how GeoGebraApplet, fit, measure work
- Modifying cluster_33-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | GeoGebraApplet, fit, measure, onResize, start (+1) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `GeoGebraApplet` | Function | `frontend/src/GeoGebraApplet.jsx` | 816 |
| `fit` | Function | `frontend/src/GeoGebraApplet.jsx` | 929 |
| `measure` | Function | `frontend/src/GeoGebraApplet.jsx` | 900 |
| `onResize` | Function | `frontend/src/GeoGebraApplet.jsx` | 962 |
| `start` | Function | `frontend/src/GeoGebraApplet.jsx` | 955 |
| `timer` | Function | `frontend/src/GeoGebraApplet.jsx` | 983 |

## How to Explore

1. `context({name: "GeoGebraApplet"})` — see callers and callees
2. `query({search_query: "cluster_33"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
