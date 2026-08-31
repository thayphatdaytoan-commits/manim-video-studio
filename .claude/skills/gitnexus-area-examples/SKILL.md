---
name: gitnexus-area-examples
description: "Skill for the Examples area of manim-video-studio. 26 symbols across 6 files."
---

# Examples

26 symbols | 6 files | Cohesion: 100%

## When to Use

- Working with code in `backend/`
- Understanding how center_block, center_x, fit_figure_full_width work
- Modifying examples-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backend/examples/style_shorts_tqh_geometry.py` | _pt, center_block, center_x, fit_figure_full_width, interior_angle_at (+4) |
| `backend/examples/style_shorts_voiceover_demo.py` | center_block, center_x, fit_figure_full_width, right_angle_at, vn (+1) |
| `backend/examples/style_shorts_venn_sets.py` | center_block, center_x, fit_figure_full_width, vn, construct |
| `backend/examples/style_landscape_median.py` | vn, construct |
| `backend/examples/style_landscape_muon_noi.py` | vn, construct |
| `backend/examples/style_shorts_thanh_viet.py` | vn, construct |

## Entry Points

Start here when exploring this area:

- **`center_block`** (Function) — `backend/examples/style_shorts_tqh_geometry.py:30`
- **`center_x`** (Function) — `backend/examples/style_shorts_tqh_geometry.py:35`
- **`fit_figure_full_width`** (Function) — `backend/examples/style_shorts_tqh_geometry.py:56`
- **`interior_angle_at`** (Function) — `backend/examples/style_shorts_tqh_geometry.py:68`
- **`right_angle_at`** (Function) — `backend/examples/style_shorts_tqh_geometry.py:81`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `center_block` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 30 |
| `center_x` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 35 |
| `fit_figure_full_width` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 56 |
| `interior_angle_at` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 68 |
| `right_angle_at` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 81 |
| `shorts_safe_width` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 52 |
| `vn` | Function | `backend/examples/style_shorts_tqh_geometry.py` | 40 |
| `center_block` | Function | `backend/examples/style_shorts_voiceover_demo.py` | 39 |
| `center_x` | Function | `backend/examples/style_shorts_voiceover_demo.py` | 44 |
| `fit_figure_full_width` | Function | `backend/examples/style_shorts_voiceover_demo.py` | 61 |
| `right_angle_at` | Function | `backend/examples/style_shorts_voiceover_demo.py` | 68 |
| `vn` | Function | `backend/examples/style_shorts_voiceover_demo.py` | 49 |
| `center_block` | Function | `backend/examples/style_shorts_venn_sets.py` | 32 |
| `center_x` | Function | `backend/examples/style_shorts_venn_sets.py` | 37 |
| `fit_figure_full_width` | Function | `backend/examples/style_shorts_venn_sets.py` | 54 |
| `vn` | Function | `backend/examples/style_shorts_venn_sets.py` | 42 |
| `vn` | Function | `backend/examples/style_landscape_median.py` | 15 |
| `vn` | Function | `backend/examples/style_landscape_muon_noi.py` | 15 |
| `vn` | Function | `backend/examples/style_shorts_thanh_viet.py` | 19 |
| `construct` | Method | `backend/examples/style_shorts_tqh_geometry.py` | 89 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Construct → Shorts_safe_width` | intra_community | 3 |

## How to Explore

1. `context({name: "center_block"})` — see callers and callees
2. `query({search_query: "examples"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
