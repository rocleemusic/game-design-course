# GDD

The full design-and-build spec for Festival of Souls, as one folder of linked domain files. This is build-support knowledge, not a separate public-facing document — no "deferred/cut" framing lives here; everything in this folder is in-scope reference for whoever is building.

Retires the `resources/build-gdd*_draft.md` lineage, archived to [`../resources/_archive/`](../resources/_archive/) as each compile cycle retires it (v1–v9 as of 2026-07-26). Where an older note or file says "Build GDD section N," it means the file listed below.

Files are numbered `01`–`13` to match reading order (see below) — a fresh sequential order, not the old fractional v5/v6 section numbers, since `07-cast.md` and `06-world-and-progression.md` both used to be "§6," and `09-art-direction.md` / `10-audio.md` / `13-scope-and-risks.md` never had a v5/v6 number at all (v4-only content folded in on 2026-07-26).

## Workflow: compiling a review draft

For a full read-through or a class submission, Roc asks for a **"gdd compile."** The steps:

1. **Compile.** Run [`compile.ps1`](compile.ps1) — it stitches all 13 files into a new `../resources/build-gdd-vN_draft.md` (auto-incrementing N), the same shape as the retired v1–v6 drafts. Purely mechanical, no per-file judgment: each file's H1 becomes `## N. Title` (N = the file's numeric prefix) and each H2 inside it becomes `### N.x Title`, numbered in document order — nothing skipped or folded. Cross-file links like `[cast.md](cast.md)` become `#N`; `../resources/X` links collapse to `X` since the draft lives in `resources/` itself. Part headers (Part I–IV) come from a small fixed table at the top of the script, since grouping isn't derivable from the files themselves.
2. **Edit.** Roc reads and edits the draft directly — it's a normal working file, not read-only.
3. **Patch.** When Roc says the edit is done, Claude re-diffs the draft against the 13 `gdd/` files (the pattern used on 2026-07-26: cast.md's Juno line, the Narrative Director gap, the hard-wipe note, etc.), flags each divergence, confirms ambiguous ones with Roc, then patches the resolved changes into the relevant `gdd/*.md` files.
4. **Retire.** The draft moves to `../resources/_archive/`, same as v1–v6.

## How the pieces fit

| File | Holds | Was |
|---|---|---|
| [`01-concept.md`](01-concept.md) | The pitch, the hook, inspirations, the cozy-roguelite inversion table | v5 §1, §1.1 |
| [`02-pillars.md`](02-pillars.md) | The 7 design pillars, each with its "never do" refusal | v5 §2 |
| [`03-core-loop.md`](03-core-loop.md) | The four verbs, a life, the festival cycle, festival-outcome spectrum, onboarding | v5 §3, §3.1, §3.2 |
| [`04-magic-system.md`](04-magic-system.md) | Spell learning/casting, receiver-determined outcomes | v5 §4, §4.1 |
| [`05-collectibles.md`](05-collectibles.md) | Item categories, scope, per-screen randomization | v5 §5 |
| [`06-world-and-progression.md`](06-world-and-progression.md) | Save-state table, game clock, persistence/bond runtime mechanics | v5 §6.1–6.2 + v4 §8.1, §14 |
| [`07-cast.md`](07-cast.md) | The 8-soul roster (3 deep + 5 texture), age bands, essence/role split, the shared role pool | v5 §6.3 |
| [`08-levels.md`](08-levels.md) | Town, Forest, Festival Grounds, Home Hub | v5 §7 |
| [`09-art-direction.md`](09-art-direction.md) | Tone, 3D-build rationale, palette/silhouette system, going-big register map, Style/Art-Direction Agent | v4 §10 (visual) + v4 §13 (Agent 6) |
| [`10-audio.md`](10-audio.md) | Sonic identity, leitmotif recognition, GameplayTag→Wwise system, Audio-Tag Agent | v4 §10 (sonic) + v4 §18–19 + v4 §13 (Agent 4) |
| [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) | Full dev-crew roster, token budget + measured cost, operating rules, workflow, worked example, build-time agent plan | v5 §8 (+8.0–8.3) + v4 §13 (Agent 7), §14–15 |
| [`12-technical-overview.md`](12-technical-overview.md) | Engine, build tracks, min/target acceptance, definition of done | v5 §9, §9.1, §9.2 + v4 §17 |
| [`13-scope-and-risks.md`](13-scope-and-risks.md) | MUST/SHOULD/STRETCH, sequencing gates, risks + fallbacks, milestone calendar | v4 §20, §21 |

## Superseded, not carried forward

- v4 §12 "A Worked Soul Arc" (an empty fill-in template) — superseded by the real generated cards ([Toby's](../pipeline-runs/2026-07-25-giver/giver-persona-card.md), [Ilsa's](../pipeline-runs/2026-07-25-kinbound/ilsa-persona-card.md)) and [`../narrative-pipeline/examples/worked-example-mara.md`](../narrative-pipeline/examples/worked-example-mara.md) — see [`07-cast.md`](07-cast.md).
- v4 §11 "The Narrative Process" — fully superseded by [`../narrative-pipeline/`](../narrative-pipeline/CONTEXT.md).
- v4's Non-Goals list (§4) — confirmed dropped intentionally, not restored (see [`02-pillars.md`](02-pillars.md)).
- The "community / diffuse / solitary-release" endings taxonomy some older notes cite — superseded by the festival-tier spectrum in [`03-core-loop.md`](03-core-loop.md); the taxonomy itself is preserved in [`../parking-lot.md`](../parking-lot.md), not deleted.

## Related, not duplicated here

- [`../narrative-pipeline/`](../narrative-pipeline/CONTEXT.md) — the full narrative-generation spec (steering, cards, echoes, gates, register, guardrails). `11-ai-agents-and-pipeline.md` names the crew; `narrative-pipeline/` is how they actually run.
- [`../resources/phase-3-decisions_draft.md`](../resources/phase-3-decisions_draft.md) — the underlying decisions log (H1–H18) these files were assembled from.
- [`../knowledge-base/`](../knowledge-base/_index.md) — distilled *external* reference material (Frieren essays, Myst docs, craft-talk distillations). Not our own design decisions — those live here in `gdd/`.
- [`../resources/_archive/`](../resources/_archive/) — the retired draft lineage (v1–v9 as of 2026-07-26 + process artifacts), kept for history, not for reference.
