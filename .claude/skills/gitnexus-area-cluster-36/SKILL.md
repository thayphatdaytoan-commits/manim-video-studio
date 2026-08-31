---
name: gitnexus-area-cluster-36
description: "Skill for the Cluster_36 area of manim-video-studio. 9 symbols across 1 files."
---

# Cluster_36

9 symbols | 1 files | Cohesion: 95%

## When to Use

- Working with code in `frontend/`
- Understanding how exportConstructionCommands, exportFigureManifest work
- Modifying cluster_36-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/GeoGebraApplet.jsx` | exportCommands, exportFigureManifest, exportConstructionCommands, exportFigureManifest, ggbKindFromType (+4) |

## Entry Points

Start here when exploring this area:

- **`exportConstructionCommands`** (Function) — `frontend/src/GeoGebraApplet.jsx:696`
- **`exportFigureManifest`** (Function) — `frontend/src/GeoGebraApplet.jsx:571`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `exportConstructionCommands` | Function | `frontend/src/GeoGebraApplet.jsx` | 696 |
| `exportFigureManifest` | Function | `frontend/src/GeoGebraApplet.jsx` | 571 |
| `exportCommands` | Function | `frontend/src/GeoGebraApplet.jsx` | 829 |
| `exportFigureManifest` | Function | `frontend/src/GeoGebraApplet.jsx` | 834 |
| `ggbKindFromType` | Function | `frontend/src/GeoGebraApplet.jsx` | 552 |
| `isFreePointType` | Function | `frontend/src/GeoGebraApplet.jsx` | 511 |
| `parseArgList` | Function | `frontend/src/GeoGebraApplet.jsx` | 545 |
| `parseDefinitionRefs` | Function | `frontend/src/GeoGebraApplet.jsx` | 515 |
| `roundCoord` | Function | `frontend/src/GeoGebraApplet.jsx` | 505 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExportFigureManifest → IsFreePointType` | intra_community | 3 |
| `ExportFigureManifest → RoundCoord` | intra_community | 3 |
| `ExportFigureManifest → ParseArgList` | intra_community | 3 |

## How to Explore

1. `context({name: "exportConstructionCommands"})` — see callers and callees
2. `query({search_query: "cluster_36"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
