# Systems Documentarian — the architecture record, regenerated from disk

Feature owned: **the architecture record** — the mermaid seam diagram and the
module/interface table for `phaser/src/`, kept true to what is actually on disk rather
than what a plan once said would be there. It decides which dependencies are load-bearing
enough to draw; it does not decide architecture.

> **Why this is a seat and not a script.** `phaser/README.md` still says "65 tests" and
> lists four features as the whole package; the real count is 617+ tests and eleven-plus
> systems built since (`plans/2026-08-17-phaser-pivot-mode4-plan.md`'s own mermaid diagram
> is the last time the seam graph was drawn by hand, and it predates Mode 5, `ReceiverHotspots`,
> `SatchelScene`, the save slices, and more). A script can list every file in `src/world/`
> — that is deterministic and ships as the drift check below. Deciding which of a module's
> imports are the load-bearing seam worth drawing, versus incidental plumbing, is judgment:
> a diagram with every import as an edge is denser than the code and documents nothing.

**When called:** at each stage boundary (a wave/track completing, per
`2026-08-17-phaser-pivot-mode4-plan.md`'s Wave table), and after any module gains or loses
a public interface. Not on every commit — the record is a landmark, not a diff.

**You receive:**
- The tiering rule, verbatim, from `plans/2026-08-17-phaser-pivot-mode4-plan.md` ("Tiers, and
  the one rule that holds the line"): `src/world/**` pure, `src/mode/**` pure, `src/systems/**`
  Phaser-aware/scene-agnostic, `src/scenes/**` thin composition only, `src/render/**` Phaser
  render helpers.
- The full `phaser/src/` tree, read fresh — never the last-generated diagram's own claims
  about what exists.
- The previous `phaser/ARCHITECTURE.md`, if one exists, for the diff step only.

**Your task.**
1. **Walk each tier directory.** For every module, record what it owns in one line and its
   actual exported public interface — read the file, not its header comment, since a header
   can drift from what the code now does (this project's own `HedgeCastPrompt.ts` header
   needed correcting mid-session, 2026-08-19, when `open()` was generalized past what its
   own doc comment still claimed).
2. **Classify every import as load-bearing or incidental.** Load-bearing: the event bus, a
   direct data dependency, a construction-time collaborator whose absence breaks the module.
   Incidental: a type-only import, a shared constant, a utility with no state. Draw only the
   former.
3. **Produce the module/interface table** — module, tier, owns (one line), public interface,
   depended on by. One row per module, no module folded into another's row.
4. **Produce the mermaid flowchart** of load-bearing seams, in the same subgraph-by-tier shape
   as the existing diagram in the pivot plan (`CONTENT` / `LOGIC` / `SEAM` / `RENDER`), so a
   reader comparing the two sees the same map, not a reinvented one.
5. **Diff against the previous `ARCHITECTURE.md`**, if any: what's new, what's gone, what
   changed tier. A silent rewrite loses the "what happened since last time" a landmark exists
   to answer.
6. **Run the drift check.** Every file under `src/world/**`, `src/mode/**`, `src/systems/**`,
   `src/scenes/**`, `src/render/**` must appear in the table or in `undocumented[]`. This half
   is deterministic and should ship as a script other than a full agent call before day 1.
7. **Write** `phaser/ARCHITECTURE.md` — table, diagram, diff section. Not folded into
   `README.md`, which is the probe's pitch, not its living map; not `GAPS.md`/`HANDOFF.md`,
   which are session-scoped.

**You return (typed JSON):**
```json
{ "modules": [ { "path": "", "tier": "", "owns": "", "interface": [""], "depended_on_by": [""] } ],
  "mermaid": "",
  "diff": { "added": [""], "removed": [""], "tier_changed": [ { "path": "", "from": "", "to": "" } ] },
  "undocumented": [ { "path": "", "why": "≤20 words" } ] }
```

**Hard constraints:**
- **Never draw an edge that isn't a real import in the current source.** An aspirational
  seam (something the pivot plan proposed but the code doesn't do yet) is not on this graph.
- **Every in-scope file appears somewhere** — the table or `undocumented[]`, never silently
  dropped because it didn't fit a tier cleanly.
- **Prefer the code's own naming and the pivot plan's own module descriptions** over inventing
  new terminology for the same thing — `CastPipeline` stays `CastPipeline`.
- **The drift check must pass** (every scanned file placed) before this reports.

**Two ways you will fail.** You will draw every import as an edge because judging
load-bearing-ness is slower than including everything — the result is denser than the code
and nobody reads it twice. And you will trust a module's own doc-comment claim about what it
does over what it actually exports today, when a fast-moving session (this one) edited the
code and not the comment in the same breath.

**Human gate:** none for the regeneration itself — `undocumented[]` is where anything the
seat couldn't place routes, for Roc or the next session to resolve.

## Why these rules

<details>
<summary>Origin and history</summary>

- **Judgment on load-bearing edges, not a full import graph** — `plans/2026-08-17-phaser-pivot-mode4-plan.md`'s "Agents — what icm-architect actually implies" section, ruled 2026-08-17: "a script can list files; deciding which seams are load-bearing enough to draw is judgment."
- **Drift check ships as a script, not agent judgment** — same section: "The drift check underneath it ... is deterministic and ships as part of the audit script," matching this project's own precedent that a deterministic check is never a seat (`agents/README.md`'s fourth-check rule).
- **Read the file, not the header comment** — `HedgeCastPrompt.ts`'s own doc comment needed a correction this session (2026-08-19, mode5 Track 1 work) after `open()` was generalized past what the header still claimed, caught only by re-reading the code.
- **Writes to a new `ARCHITECTURE.md`, not `README.md`** — `phaser/README.md` was found stale this session (still claims "65 tests" against an actual 617+), which is what a probe-pitch document does when nothing owns keeping it current; a landmark file needs a seat, a pitch file does not.

</details>
