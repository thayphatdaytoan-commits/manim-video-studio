---
name: gitnexus-area-backend
description: "Skill for the Backend area of manim-video-studio. 83 symbols across 6 files."
---

# Backend

83 symbols | 6 files | Cohesion: 94%

## When to Use

- Working with code in `backend/`
- Understanding how export_figure_reference, fix_canvas_from_error, generate_from_problem work
- Modifying backend-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backend/main.py` | _resolve_validation_mode, api_validate_manim, compile_video, _run, extract_scene_names (+27) |
| `backend/generate.py` | _append_figure_context_to_prompt, _balance_json_brackets, _call_gemini, _extract_json, _gemini_with_fallback (+17) |
| `backend/beat_voiceover.py` | _make_silence_mp3, compose_beat_audio_track, merge_beats_voiceover, synthesize_beat_segments, _strip_latex_for_speech (+6) |
| `backend/validate_manim.py` | validation_as_log, _strip_hash_comments, default_validation_mode, latex_available, normalize_validation_mode (+2) |
| `backend/voiceover.py` | generate_script, _edge_tts_save, merge_audio_video, probe_duration_seconds, probe_has_audio_stream (+2) |
| `backend/shorts_layout.py` | _inject_after_import, detect_landscape_leaks, enforce_shorts_fullframe_code, is_shorts_format |

## Entry Points

Start here when exploring this area:

- **`export_figure_reference`** (Function) — `backend/generate.py:809`
- **`fix_canvas_from_error`** (Function) — `backend/generate.py:1292`
- **`generate_from_problem`** (Function) — `backend/generate.py:1373`
- **`generate_geogebra`** (Function) — `backend/generate.py:736`
- **`generate_manim_from_geogebra`** (Function) — `backend/generate.py:1136`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `export_figure_reference` | Function | `backend/generate.py` | 809 |
| `fix_canvas_from_error` | Function | `backend/generate.py` | 1292 |
| `generate_from_problem` | Function | `backend/generate.py` | 1373 |
| `generate_geogebra` | Function | `backend/generate.py` | 736 |
| `generate_manim_from_geogebra` | Function | `backend/generate.py` | 1136 |
| `generate_manim_from_storyboard` | Function | `backend/generate.py` | 974 |
| `generate_problem_solution` | Function | `backend/generate.py` | 681 |
| `generate_storyboard` | Function | `backend/generate.py` | 873 |
| `repair_manim_loop` | Function | `backend/generate.py` | 1041 |
| `revise_manim_code` | Function | `backend/generate.py` | 1212 |
| `validation_as_log` | Function | `backend/validate_manim.py` | 311 |
| `generate_script` | Function | `backend/voiceover.py` | 72 |
| `api_validate_manim` | Function | `backend/main.py` | 554 |
| `compile_video` | Function | `backend/main.py` | 1229 |
| `extract_scene_names` | Function | `backend/main.py` | 620 |
| `find_rendered_mp4` | Function | `backend/main.py` | 650 |
| `health` | Function | `backend/main.py` | 838 |
| `list_templates` | Function | `backend/main.py` | 894 |
| `parse_scenes` | Function | `backend/main.py` | 915 |
| `preview_frame` | Function | `backend/main.py` | 1136 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Generate_from_problem → _balance_json_brackets` | intra_community | 5 |
| `Generate_from_problem → _repair_json_string_escapes` | intra_community | 5 |
| `Generate_from_problem → _is_rate_limit_error` | intra_community | 5 |
| `Api_generate_beat_narrations → _strip_latex_for_speech` | intra_community | 5 |
| `Repair_manim_loop → _balance_json_brackets` | intra_community | 5 |
| `Generate_manim_from_geogebra → _repair_json_string_escapes` | intra_community | 5 |
| `Generate_manim_from_geogebra → _is_rate_limit_error` | intra_community | 5 |
| `Repair_manim_loop → _repair_json_string_escapes` | intra_community | 5 |
| `Repair_manim_loop → _is_rate_limit_error` | intra_community | 5 |
| `Generate_from_problem → _strip_code_fence` | intra_community | 4 |

## How to Explore

1. `context({name: "export_figure_reference"})` — see callers and callees
2. `query({search_query: "backend"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
