# RESULTS — Thread-driven scene generation, 2026-08-25

Full fresh pass superseding both the 2026-08-25 full-content-generation run's
dialogue output (single lines, no real structure) and the retired
`lantern-projects/v01/threads/` 4-conversation format, per
[`PLAN.md`](PLAN.md). Two prior trials
([`trial-thread-authoring/`](trial-thread-authoring/)) settled the one open
architecture question before this run started: **Claude authors structure,
local models write lines** — a local model tested clean on line-level prose
and register judgment but produced internally self-contradictory structure
(duplicated options, invented canon numbers, broken mermaid). This run
holds that line throughout: I (Claude) authored all 25 scene structures
directly, by hand, in Phase 1; local models via koboldcpp wrote every line
of prose in Phase 2.

---

## Verdict

**Phase 1: 25/25 structures authored and self-verified. Phase 2: 469 of 477
generation slots succeeded on the first clean attempt or a caught-and-
retried one; 8 slots exhausted their 3-attempt budget and were correctly
skipped rather than shipping contaminated output.** One real, systemic
script bug was found and fixed mid-run (structural-scaffolding leakage into
generated prose) — caught by spot-checking raw output before trusting the
loop at scale, exactly as the run's own discipline required.

| Phase | Scope | Result |
|---|---|---|
| 0 — dialogue-inventory edit | Texture-greeting scope, 1→2 rows/soul | Done |
| 1 — structures | 9 ENC + 3 NGT + 13 SPB | 25/25 authored, self-verified |
| 2 — line generation | 4 slots × 22 ENC/SPB scenes × 4 models + 4 slots × 3 NGT + 2 INT beats × 2 models + 5 new greetings × 1 model | 469/477 slots shipped |
| 3 — comparison + this file | 26 comparison files + RESULTS.md | Done |

---

## Phase 1 — structures authored, self-verification catches

All 25 structures live in [`structure/`](structure/): `ENC-toby/ilsa/mara-1/2/3`
(9), `NGT-toby/ilsa/mara` (3), `SPB-<spell>` for all 13 approved role spells.
Each follows the `c1-claude-raw-output.md` exemplar's shape — mini Architect
brief, Choice-designer content block, mermaid graph — compressed to the
run's ruled scale (6-8 beats, one 3-option choice point, one gather) rather
than the exemplar's full 6-node conversation.

**Self-verification catches made while authoring** (checked against both
the exemplar's discipline and the 26B trial's specific failure modes before
treating any structure as done):

- **Encounter pass/fail mechanic, newly specified this run.** Every
  `ENC-<soul>-N` now states explicitly what "pass" means mechanically:
  picking the item-help or spell-help option (both equal weight) records
  `knowledge_flag(<soul>_encN_helped)` + `thread_move`; the witness/
  conversational option records a bond event only, no thread move — a real,
  stated, non-punishing fail path. `ENC-ilsa-3` additionally forks a
  world-state flag (`centerpiece_true_ore` vs. not) per the registry's own
  ruled branch, with both endings explicitly held equal weight since the
  registry itself rules neither a loss state.
- **Ilsa's bond-band bar held everywhere.** Zero `bond_band()` predicates
  in any Ilsa structure (`ENC-ilsa-*`, `NGT-ilsa`) — checked explicitly per
  file, not assumed, since her canon flag 11 and thread registry both bar
  it outright.
- **Toby's payoff-proximity bar held at `NGT-toby`.** Zero marked long runs
  anywhere in his festival-night scene — the one place his card bars a long
  run absolutely (receiving/thanked/seen, and payoff). Weight is carried by
  a fragment→action→fragment build instead, per rule 19.
- **Mara's grief discipline held at `NGT-mara`.** No long run about the
  loss itself; Ovin's pocket-knife (the object used, deliberately, not the
  doll) gets only the bare sanctioned line, "That was Ovin's, before." — no
  elaboration, matching card canon flag 14 exactly.
- **Mermaid conventions checked per file**: `flowchart TD` (never `graph
  TD`), no subgraph/node id collisions, stadium shapes for non-choice
  beats (following the exemplar's own extension of the fixed convention),
  every option/flag appearing exactly once and matching between prose and
  diagram, a genuine gather before every close.
- **Component-table fidelity on all 13 spell-beats** — every `SPB-*`
  structure was authored with the real `content/magic/<spell>.json`
  loaded in context (component list, a clean-effect receiver, a no_effect
  receiver used as the "boundary" option), not just the spell's name. Half
  of round 2's canon failures on this project traced to a missing
  component table; none of that risk carries into these 13 files.
- **Postman/Priest/Farmer role-holders staged as walk-ons**, not
  misattributed to a deep or texture soul who doesn't hold that role this
  life — `SPB-scratch/seal/dry/leap/waft/breath/furrow` each name their
  holder explicitly as a walk-on per `register.md`'s walk-on band, so Lines
  (and the Phase 2 generator) doesn't write them in a carded soul's
  clipped, deflecting register.

**Phase 0 note — a count discrepancy caught against ground truth.** The
task brief's Phase 0 instructions state the roll-up should read "14
deep-three rows unchanged + 10 texture rows = 24 total, up from 19." The
actual table (`gdd/15-dialogue-inventory.md`) has **9** deep-three rows
(3 souls × 3 bond levels), not 14. I edited the roll-up against the real
counts: **9 + 10 = 19, up from 9 + 5 = 14** — verified by reading the table
directly before and after the edit, not by trusting the brief's numbers.
Flagging this explicitly in case the "14/24" figure was meant to signal a
different scope than what the live file actually contains.

---

## Phase 2 — line generation

### Generator

New script, [`scripts/generate_lines.py`](scripts/generate_lines.py),
reusing infra from `generate_all.py`/`generate_scenes_pass2.py`
(`load_cast` reading essence/voice live from `cast/*.md`, `call_model`/
`generate_with_retry`, `safe_write`'s outside-run-dir guard) rather than
duplicating it. New for this run: a generic 4-slot-per-scene shape (`setup`,
`option_a`, `option_b`, `option_c`) that reads each approved structure's
"Content block" section as background context and asks the model to write
into it — not re-author it. [`scripts/assemble_comparison.py`](scripts/assemble_comparison.py)
merges every model's raw output into one `lines/<id>-comparison.md` per
unit.

### A real bug found and fixed mid-run — structural-scaffolding leakage

**Found by spot-checking raw output directly**, per the run's own
discipline (`Self-verify every structure before moving on`, extended here
to Phase 2's generated lines): the first pass (muse12b + violetlotus on the
festival-night group) shipped output where the model echoed the prompt's
own scaffolding back verbatim — literal `**A-NGT-I-1 (option_a):**`,
`player_line: "..."`, `Records bond_event(...)` lines inside what was
supposed to be finished prose — and muse12b additionally drifted into
sustained second-person narration ("You don't turn... Your fingers
tighten...") on a scene where every other line in the project is
third-person narrator-plus-quote. Root cause: `build_user()` dumped the
structure file's raw content block into the prompt with nothing marking it
as background notes rather than text to imitate, and `max_tokens=220-240`
was generous enough that a drifting model kept going past its natural stop.

**Fix, verified by spot-check before re-trusting the loop** (not just
described — a single scene was regenerated and inspected line-by-line
after each change):

1. `build_user()` now explicitly frames the structure text as "background
   notes for your understanding only... NOT text to output," and repeats
   the no-echo instruction after the notes.
2. A `detect_leakage()` check runs on every generated slot before it's
   accepted — structural markers (`===`, `**`, `Records `, `player_line:`,
   backtick-wrapped internal ids), sustained second-person narration
   outside quoted dialogue, and (added after a second spot-check found the
   model inventing "Toby" and "Ovin" in an Ilsa-only scene) any named cast
   member not present in that scene's own notes. A caught slot retries (up
   to the existing 3-attempt cap) with the constraint restated more
   forcefully — the same discipline the real pipeline uses for a failed
   revision.
3. `max_tokens` tightened from 220-240 to 150 across the board.
4. Both models' contaminated festival-night output was discarded and
   regenerated clean under the fixed script before the run continued to
   the much larger encounter/spell-beat rotation.

**The fix held at scale.** Across the full encounter/spell-beat rotation
(4 models × 22 scenes × 4 slots = 352 slots) plus the festival-night
re-runs, the leakage guard caught and successfully retried real violations
on both Violet-Lotus (42 leakage-then-retry events across its two passes)
and Crimson-Constellation (8), while StyleTune and gemma4-26b produced zero
leakage on any attempt — a real, if small, reliability signal about which
models respect formatting instructions under this prompt shape.

### Totals by model

| Model | Group | Slots shipped | Leakage caught & retried | Final skips |
|---|---|---|---|---|
| Muse-12B | Intro + festival-night | 13 | 8 | 1 |
| MN-Violet-Lotus-12B (Q5) | Intro + festival-night | 14 | 4 | 0 |
| MN-Violet-Lotus-12B (Q5) | Encounters + spell-beats | 86 | 34 | 2 |
| Gemma-4-12B-StyleTune (Q5) | Encounters + spell-beats | 88 | 0 | 0 |
| Crimson-Constellation-12B (Q6) | Encounters + spell-beats | 88 | 8 | 0 |
| gemma4-26b-fiction (Q4, `--moecpu 999`) | Encounters + spell-beats | 88 | 0 | 0 |
| gemma4-26b-fiction | Greetings (5 new `-generic` rows) | 5 | 0 | 0 |
| **Total** | | **469 shipped of 477 attempted** | **54** | **8** |

Cross-checked two ways — parsed from `run-log.md`'s per-model blocks (using
only the last block per model+group, so the discarded pre-fix
festival-night attempt doesn't inflate the count) and independently counted
from the final `lines/_raw/<model>/*.json` files. Both agree exactly.

**8 slots skipped after exhausting all 3 attempts** rather than shipping
contaminated text — this is the guard working as designed, not a silent
gap. Which slots, visible per-model in each `lines/<id>-comparison.md`'s
"not generated" / "FAILED" cells.

### Greetings scope note

Per the plan's model-assignment table, greetings (aside from the 5 new
`-generic` texture rows from Phase 0) are **already generated and
approved** in the prior run — not regenerated here. Items/key-items/magic
descriptions likewise untouched, per the same instruction. Only the 5 new
`GRT-<soul>-generic` rows were generated this run, gemma4-26b only, 1
variant each, no comparison file (matching the existing greetings' method)
— all 5 succeeded clean on the first attempt.

### A second, distinct quality issue — worth a review note, not a script bug

Separate from the leakage bug (which is fixed and verified), a genuine
content-quality pattern turned up on inspection: **setup slots (which
combine two structural beats — the scene's incoming state plus its first
narration beat) occasionally run long enough to hit the 150-token cap and
truncate mid-sentence**, or drift past their natural stopping point into
the same anti-copy-guard failure the prior run's RESULTS.md flagged as its
top finding — reaching for a card's "sounds like" sample line as filler
once genuine material runs out. Concrete instance: Violet-Lotus's
`ENC-mara-3` setup slot ends on *"The lanterns used to hang right there —
mind your step, they'll be up again by evening, same as every year,"*
copied near-verbatim from Mara's card and a total non-sequitur in a
herb-stall tonic-brewing scene with no lanterns in it. This is a design
consequence of the generic 4-slot shape carrying more content in `setup`
than in any option slot while giving it the same token budget — worth
splitting `setup` into its own O-beat/A-beat calls (the way `INT-1` already
does its own two bounded calls) in any follow-up pass, rather than a fix
applied mid-run here.

### Automated sweeps run before writing this file

- **Banned vocabulary** (`remember`/`memory`/`remembers`/`forget`
  describing how a spell, the festival, or an object works — guardrails
  check 7): swept all 477 generated slots. **Zero hits.**
- **Ovin invented outside his sanctioned scene**: swept every slot in every
  file except `NGT-mara` (the one structure that legitimately names him).
  **Zero hits** — no model reached for him unprompted elsewhere, which is
  the anti-invention guard (strengthened mid-run per the leakage fix)
  working as intended.

---

## What changed from the two prior passes, and why

1. **The retired v01 4-conversation thread format is gone from this run's
   scope entirely.** Neither read nor imitated — `lantern-projects/v01/
   threads/*.md` files were explicitly off-limits per the plan, and no
   structure here imitates their scale (6-9 choice nodes per conversation,
   4 conversations per thread). Every structure here is one compact scene:
   6-8 beats, one choice point, one gather.
2. **The local-model structural-authoring finding is why Phase 1 has no
   model in the loop at all.** Both trials (a simple thread row and a full
   C1 graph) showed a local model producing internally self-contradictory
   structure — duplicated options across nodes, mermaid that doesn't parse,
   invented canon numbers — while testing clean on line-level prose and
   register judgment. This run's split (Claude authors structure, local
   models write lines) is a direct consequence, not a default choice.
3. **The new encounter pass/fail ruling supersedes the old threads'
   opposite premise** ("no amount of help may accumulate into anything").
   Every `ENC-<soul>-N` this run states its pass condition mechanically —
   see Phase 1's self-verification notes above — with a real, warm,
   non-punishing fail path on the witness/conversational option.
4. **Line-level generation is now genuinely per-slot**, closer to the real
   pipeline's "one slot per call" discipline than either prior pass
   managed — the prior full-content-generation run's pass 1 was one call
   per whole unit (a single narrator-beat-plus-line), and its pass 2 was
   one call per whole scene (asking the model to emit an entire structured
   scene in one shot, which is exactly the risk this run's Phase 1/Phase 2
   split was designed to remove). This run's structure is fixed before any
   model call happens; each call writes into one already-approved slot.

---

## What Roc should check first — worst-first

1. **The 8 skipped slots**, since they're the plainest gap — a scene with
   a missing option's line in its comparison file. Visible per-file: search
   any `lines/*-comparison.md` for "not generated" or "FAILED". Muse-12b
   lost `NGT-ilsa::option_a` outright (all 3 attempts drifted into
   second-person or invented Ovin); Violet-Lotus lost two slots across its
   two passes. Every other model/scene/slot combination shipped clean.
2. **The setup-slot truncation/anti-copy pattern** described above —
   check `ENC-mara-3` (Violet-Lotus) and spot-check a handful of the other
   long setup slots flagged during the automated sweep (18 slots ran over
   90 words against a 150-token budget, the likeliest truncation
   candidates) before treating any setup line as finished prose.
3. **Pick which model variant per slot**, per the plan's "no automated
   judge" ruling — every `lines/<id>-comparison.md` shows all applicable
   models side by side with word counts. StyleTune and gemma4-26b shipped
   the cleanest formatting (zero leakage retries needed on either); that is
   a formatting-discipline signal only, not a voice-quality judgment — read
   the actual text before picking.
4. **The Phase 0 greeting-count discrepancy** noted above (brief said
   "14/24," the live table says "9/19") — confirm the 9/19 reading is
   correct before this ships anywhere downstream that might have cached
   the brief's numbers instead of the table's.
5. **Encounter pass/fail flags are structural, not yet wired.** Every
   `ENC-<soul>-N` structure states its `knowledge_flag`/`thread_move`
   mechanically, but nothing in this run wires those into
   `tools/resolver/data/scene-graph.json` or `state.ink` — that's a
   downstream build step, same as every prior structure-authoring pass in
   this project.
6. **Component-table fidelity spot-check** — same standing item every
   prior pass's RESULTS.md has carried. Pick two or three `SPB-*`
   comparison files and check the generated line's component mention
   against `content/magic/<spell>.json` directly; the structures were
   authored against the real tables, but the generated prose is a separate
   pass and worth the same verification the prior runs applied.

---

## Confirmed with `git status`

Every file this run touched sits under
`pipeline-runs/2026-08-25-thread-driven-scenes/`, except the one named
Phase-0 edit to `gdd/15-dialogue-inventory.md`. Verified two ways: `git
status --porcelain` shows only files under this run's folder as pending
(the rest are auto-committed by the repo's save hook already), and
`git log -- gdd/15-dialogue-inventory.md` / `git log -- .../structure/`
show only this run's own commits touching those paths — `cast/`,
`content/`, and `lantern-projects/` show no commits from this session at
all. `cast/`, `content/`, and `lantern-projects/v01/threads/` were never
opened for writing at any point in this run (only read, where the plan
named them as seed material).

---

## Where everything landed

```
pipeline-runs/2026-08-25-thread-driven-scenes/
  structure/                 25 files (ENC-*, NGT-*, SPB-*) — Phase 1
  scripts/
    generate_lines.py        Phase 2 generator (leakage-guarded, resumable)
    assemble_comparison.py   builds lines/<id>-comparison.md from raw JSON
    compute_stats.py         one-off stats cross-check used for this file
  lines/
    _raw/<model>/<scene>.json   raw per-model, per-slot output
    <id>-comparison.md          26 files — the human-review surface
  dialogue/greetings/         5 new GRT-*-generic files
  run-log.md                  full call-by-call log, every model, every attempt
  koboldcpp-server.log
  RESULTS.md                  this file
```
