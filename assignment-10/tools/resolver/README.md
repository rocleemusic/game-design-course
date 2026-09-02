# resolver

The build-time assembler for the game's narrative pipeline. Deterministic
Node/TypeScript — no LLM calls, no network. Data JSONs go in; `graph.json`,
the `ink/` file tree, and `day.json` come out. Same inputs, same outputs,
every time.

## What it does

- **buildGraph** — turns the four data files into `graph.json`, the pinned
  shape the review tool reads: screens with ink addresses, seams, scenes with
  lines and choice nodes inline, and every state variable with its readers
  and writers.
- **emitInk** — writes the `ink/` tree (`main.ink`, `state.ink`,
  `world/<screen>.ink`, `souls/<soul>.ink`, `system/externals.ink`) with
  placeholder lines. Ink addresses follow the address rule in
  `narrative-pipeline/build-loop.md`; every line carries its tags
  (`#screen:` / `#choice:` / `#opt:` / `#id:`). State actions emit as
  EXTERNAL calls with no-op fallbacks so the canned web build runs unbound.
  A test compiles the whole tree with inkjs's compiler — the emit is only
  done when it compiles clean.
- **resolveDay** — one resolved day from the seed (SHA-256 of
  `slot|life|day`): NPC slot fill with role-anchor and evening-home weights,
  the live-thread guarantee floor in the player's picked location, item-slot
  rolls with explicit empty entries, and 2–3 live leads picked from the
  authored pool. Reloading a day re-rolls nothing.
- **applyEdits** — applies the review tool's `edits.json` patches. A stale
  `old_text` is rejected and surfaced. A missing target lands in the orphan
  report. Two patches to one target apply in timestamp order.
- **mintIds / inkAddress** — fills missing pipeline IDs and derives every
  ink address (`T1` → `t1`, `CH-T2-04` → `ch_t2_04`, scene `toby.sc_t2_04`,
  gather `g_ch_t2_04`).

## Use

Needs Node 23.6+ (runs TypeScript directly). Then:

```
npm install
npm test                                # full suite, includes the ink compile proof

node src/cli.ts build                                   # fixtures -> out/
node src/cli.ts build --data data --out out-realdata    # real layout-pass data
node src/cli.ts build --data data --out out-calib --emit-story   # also emit compiled story.json (inkVersion 21)
node src/cli.ts resolve-day --input fixtures/day-input.sample.json --data data
node src/cli.ts resolve-week --data data --out out-calib         # resolve a full week of days
node src/cli.ts apply-edits --graph out/graph.json --edits edits.json
node src/cli.ts build --data data --out out2 --edits out/out/edits.json   # regenerate with edits
node scripts/compile-check.ts [dataDir]                 # end-to-end compile proof

node src/cli.ts check-examinables --data data            # guardrails check 11
node src/cli.ts check-examinables --data data --threads ../../lantern-projects/v01/threads --warn-only
node src/cli.ts build --data data --threads ../../lantern-projects/v01/threads   # same check, at build time
```

`check-examinables` reconciles the examinables a thread document **declares**
(its examinables table) against the ones `data/screen-specs.json` actually
**builds** — id, screen, and the `knowledge_flag` each one sets. Non-zero exit
on any mismatch. `--threads` defaults to `lantern-projects/v01/threads`;
`--warn-only` reports without failing, for the mid-authoring state where
proposing is legitimate.

## The Lantern round trip

Edits survive regeneration. Lantern opens a run folder (a `build` output),
and when a reviewer rewrites a line its bridge appends
`{ target, old_text, new_text, timestamp }` to `<run>/out/edits.json`. To
rebuild, run `build --edits <that file>`: the resolver regenerates the graph
from source data, applies the patches on top, then emits ink — so the edited
text lands in the new `graph.json` and `ink/` tree and the story still
compiles and plays. The patch report is written to `<out>/edit-report.json`.
If the source line changed upstream, the stale patch is rejected (old_text
mismatch), printed to stderr, and the exit code goes non-zero — the source
text wins, never silently. If the target was deleted, the patch lands in the
orphan report the same way. `test/roundtrip.test.ts` proves the whole cycle.

`--data` points at any directory holding `screen-specs.json`, `seams.json`,
`scene-graph.json`, and `role-workplace.json`. Without it, the small fixture
set in `fixtures/` is used. The loader accepts both the plain schema form and
the layout pass's provisional envelope, and prints a warning for every
accommodation it makes — it never edits the data files.

## Tuning

`data/tuning.json` is the one home for tunable global game settings (Roc's
rule, 2026-07-30). The resolver reads it from the same `--data` directory as
the other files: NPC availability weights (role anchor / evening home / base),
the live-lead count range, the global slot-capacity multiplier (round half-up,
never below 0), the Arch's promotion thresholds (stamped into the graph's
`promotes_to` condition — `arch-promote-proposal.json` stays the human-gated
record), and the floor's `prefer_unlocked_screens` switch (when `true`, the
guarantee floor keeps souls on start/reachable screens; `null` = pending
ruling, behaves like today). Aliveness band thresholds are listed but still
`null` — nothing consumes them yet.

No file, or a missing field, means the built-in defaults — and those match
the old hard-coded constants exactly, so same seeds give the same `day.json`
as before tuning existed (`test/tuning.test.ts` pins this). Unknown keys and
wrong types get a warning and are ignored, same as the data loader.

## Layout

```
src/        the library (ids, predicates, actions, graph, ink, seed, day, edits) + cli
fixtures/   2 screens, 1 scene, 1 choice node — schema-true test data
data/       the real layout-pass output (provisional, human-gated; not edited here)
test/       node:test suites; helpers/compile.ts wraps the inkjs compiler
scripts/    compile-check.ts — end-to-end proof for any data directory
```

Generated output directories (`out*/`) are disposable; regenerate at will.
To change a line, use the review tool's `edits.json` flow — hand edits to
emitted ink get clobbered on purpose.
