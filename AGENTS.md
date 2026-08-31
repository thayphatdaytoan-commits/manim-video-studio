<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **manim-video-studio** (1112 symbols, 2783 relationships, 96 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact analysis before editing.** Use `impact({target: "symbolName", direction: "upstream"})` (MCP) or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .` (CLI fallback); report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/manim-video-studio/context` | Codebase overview, check index freshness |
| `gitnexus://repo/manim-video-studio/clusters` | All functional areas |
| `gitnexus://repo/manim-video-studio/processes` | All execution flows |
| `gitnexus://repo/manim-video-studio/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |
| Work in the Backend area (83 symbols) | `.claude/skills/gitnexus-area-backend/SKILL.md` |
| Work in the Examples area (26 symbols) | `.claude/skills/gitnexus-area-examples/SKILL.md` |
| Work in the Cluster_18 area (22 symbols) | `.claude/skills/gitnexus-area-cluster-18/SKILL.md` |
| Work in the Cluster_16 area (11 symbols) | `.claude/skills/gitnexus-area-cluster-16/SKILL.md` |
| Work in the Cluster_17 area (11 symbols) | `.claude/skills/gitnexus-area-cluster-17/SKILL.md` |
| Work in the Cluster_15 area (10 symbols) | `.claude/skills/gitnexus-area-cluster-15/SKILL.md` |
| Work in the Cluster_36 area (9 symbols) | `.claude/skills/gitnexus-area-cluster-36/SKILL.md` |
| Work in the Cluster_28 area (8 symbols) | `.claude/skills/gitnexus-area-cluster-28/SKILL.md` |
| Work in the Cluster_43 area (8 symbols) | `.claude/skills/gitnexus-area-cluster-43/SKILL.md` |
| Work in the Cluster_30 area (7 symbols) | `.claude/skills/gitnexus-area-cluster-30/SKILL.md` |
| Work in the Cluster_35 area (7 symbols) | `.claude/skills/gitnexus-area-cluster-35/SKILL.md` |
| Work in the Cluster_20 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-20/SKILL.md` |
| Work in the Cluster_22 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-22/SKILL.md` |
| Work in the Cluster_23 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-23/SKILL.md` |
| Work in the Cluster_24 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-24/SKILL.md` |
| Work in the Cluster_33 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-33/SKILL.md` |
| Work in the Cluster_34 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-34/SKILL.md` |
| Work in the Cluster_37 area (6 symbols) | `.claude/skills/gitnexus-area-cluster-37/SKILL.md` |
| Work in the Cluster_21 area (5 symbols) | `.claude/skills/gitnexus-area-cluster-21/SKILL.md` |
| Work in the Cluster_26 area (5 symbols) | `.claude/skills/gitnexus-area-cluster-26/SKILL.md` |

<!-- gitnexus:end -->
