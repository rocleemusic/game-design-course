# Plan — thread-driven scene generation, fresh pass

Supersedes the 2026-08-25 full-content-generation run's dialogue output
(single lines, no real structure) and the old `lantern-projects/v01/threads/`
structure (4 conversations, 6-9 choice nodes each — ratified but retired now
as too overwhelming for a player). This is a full fresh pass, not a patch on
either.

Two trials ran first (`trial-thread-authoring/`) to settle the one open
architecture question: can a local model do structural authoring (threads,
choice graphs), or only line-level prose? Both trials — a simple thread row
and a full C1 graph — showed the same result: local models test clean on
line-level prose and register judgment (long-run placement, word ceilings)
but produce internally self-contradictory structure (duplicated options
across nodes, invented numbers that break canon, broken mermaid). **Ruling:
Claude authors structure, local models write lines.**

## What gets built

**Scene size, every category:** 6-8 beats, one choice point with 2-3
options that gather back to a close. Not the old thread format's 4
conversations per thread — one scene per slot.

### Encounters (`ENC-<soul>-1/2/3`, deep three only)

Three separate scenes per soul, escalating states of that soul's festival
goal — matches the existing ratified festival-arc thread rows
(`toby-feast-short`, `ilsa-forge-short`, `mara-tonic-frost` in
`cast/*-threads.md`), restaged small instead of across 4 conversations.

**New mechanical ruling (Roc, this session) — supersedes the old thread's
design:** each `ENC-<soul>-N` is a pass/fail gate. Completing all three
successfully is what finishes that soul's festival goal this run. The old
threads were built on the opposite premise — "no amount of help may
accumulate into anything, the number closes because of world events, not
the player" — and that premise does not carry forward. Claude's structure
pass needs an explicit success/fail branch per encounter, not just a
flavor choice.

Each encounter's choice point must include: an option to help using a real
item (`content/items/`), an option to help using a role-relevant spell
(`content/magic/`), and — Claude's call per scene — a third conversational
option or not.

### Festival-night (`NGT-<soul>`, deep three only)

One scene per soul, seeded from the essence thread and/or the another-NPC
thread (`toby-the-shelf`/`toby-kept-and-returned`,
`ilsa-kin-no-show`/`ilsa-not-family`, `mara-set-for-two`/`mara-said-out-loud`).
Choice point offers witness / ease / sit-with — never "fix". Respect each
soul's card-specific heavy-beat rule (Toby: barred from any long run while
receiving/thanked/seen, barred absolutely at a payoff — festival night is
exactly that; Mara: grief is fragments + action slots only, her provenance
license never covers the loss itself; Ilsa: no bond-band gating, her
canon bars it outright).

### Spell-beats (`SPB-*`, 13 role spells)

Not soul-thread-keyed — spells attach to roles. Simpler single-scene
structure, same Claude-then-local-model split for consistency. Real
component table from `content/magic/<spell>.json` stays in context, same
as both prior passes (half of round 2's canon failures traced to a missing
table, not a model problem).

### Greetings (`GRT-*`) — not threaded, no change to the split

Single lines, no choice point, generated directly by local models — this is
exactly what's tested clean across every round so far.

- Deep three: 3 bond-level lines each, unchanged (already generated and fine
  per Roc's read).
- **Texture five — new scope:** each gets a first-meeting line AND a generic
  ("already met") line — 2 rows each, 10 total, up from the prior 1-row
  (runtime-varies) design. `gdd/15-dialogue-inventory.md`'s texture-greeting
  scope note needs updating to reflect this before the run, since it
  currently says "1 authored greeting each, runtime LLM generates variants."

### Intro (`INT-1`)

Unchanged in shape (2 bounded calls) — not flagged as a problem, not
rebuilt structurally. Lines regenerate under the new model assignment below.

## Model assignment (Roc's ruling)

| Content | Models | Notes |
|---|---|---|
| Intro, festival-night | Muse-12B, Violet-Lotus (`MN-Violet-Lotus-12B.Q5_K_M`) | 2 variants each |
| Encounters, spell-beats ("conversations") | StyleTune Q5 (`Gemma-4-12B-StyleTune.Q5_K_M`), Violet-Lotus, Crimson-Constellation-12B (`.Q6_K`), gemma4-26b-fiction-bf16 | 4 variants each |
| Greetings, items/key-items/magic descriptions | gemma4-26b-fiction-bf16 only | Unchanged — already generated and approved as-is |

**Pick method:** side-by-side comparison file per unit, one column per
model (same shape as `assignment-8-icm/_kobold-tests/round2-full-text.csv`),
Roc picks manually. No automated judge pass.

## Sequence

1. **Claude authors structure** for every ENC/NGT/SPB scene: a compact
   Architect brief + Choice-designer content block + mermaid graph, 6-8
   beats, 2-3 options, gather close. Seeded from the existing ratified
   thread rows where one exists (deep three); authored fresh against the
   card + role for spell-beats. Written to
   `pipeline-runs/2026-08-25-thread-driven-scenes/structure/`.
2. **Update `gdd/15-dialogue-inventory.md`'s texture-greeting scope note**
   (1 row → 2 rows per texture soul) before generating greetings.
3. **Local models write lines into Claude's approved structure**, one call
   per option/response slot pair per model (not one call per whole scene —
   the structure is now fixed, so this is closer to the real pipeline's
   "one slot per call" than either prior pass managed). N model variants
   per unit per the assignment table.
4. **Build the comparison files** for Roc's manual pick.
5. **RESULTS.md** — same shape as prior runs, plus an explicit note on
   what changed from the two earlier passes and why (the retired v01
   thread format, the local-model structural-authoring finding, the new
   encounter pass/fail ruling).

Nothing in this run touches `cast/`, `content/`, the old
`lantern-projects/v01/threads/` files, or `gdd/15-dialogue-inventory.md`
beyond the one greeting-scope edit named in step 2 — same discipline as
both prior passes.

## Open, before build starts

None outstanding — this doc is the confirmation checkpoint. Flag anything
here that doesn't match before the build kicks off.
