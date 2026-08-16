# GER harness — NPC dialogue slots

Generator · Evaluator · Refiner · Circuit Breaker, closing one loop over one slot of
NPC dialogue for the capstone game.

**The argument for the design is one level up, in [`../README.md`](../README.md).** This file is
the operating manual.

```bash
npm install
export ANTHROPIC_API_KEY=...

node src/index.js                    # one slot, live
node src/index.js --slot all         # every slot in slots/demo.json
node src/index.js --slot <slot_id>   # one named slot
node src/index.js --offline          # replay recorded fixtures, no API key needed
```

Exit codes: `0` everything shipped · `1` error or pre-flight trip · `2` at least one slot parked.

A parked slot is not a crash, but it is not a success either, which is why it has its own code.

## Files

```
pipeline/
├─ src/
│  ├─ index.js       the loop — generate → evaluate → refine → break
│  ├─ generate.js    GENERATOR
│  ├─ evaluate.js    EVALUATOR, both layers
│  ├─ breaker.js     CIRCUIT BREAKER
│  ├─ card.js        the pinning split, enforced in code
│  ├─ ceilings.js    word ceilings + the counting convention
│  ├─ cardlint.js    pinned-context hygiene — the pre-flight gate
│  ├─ llm.js         Claude wrapper + fixture record/replay
│  ├─ config.js      paths, the revision cap, the enforced check
│  └─ log.js         run log — the human gate's artifact
├─ cards/            ilsa · toby · mara, six fields each
├─ slots/demo.json   three prepared slots: two warm beats and one player_line
├─ fixtures/         recorded responses for --offline (empty until the first live run)
└─ runs/             run logs, one JSON per run
```

## Where this runs

**Step 6 of the storyline authoring process (Lines)** — steps 8 → 10 → 11 → 13 of
`narrative-pipeline/pipeline.md`.

It runs *after* the Choice Designer's graphs clear Roc's gate, so it never writes prose
against a structure that might still be rejected. Its input is a slot that already knows
its `slot_type`, tone, word ceiling and beat.

```
step 5  Choice Designer → graphs → ROC'S GATE
step 6  ─────────── THIS HARNESS ───────────
step 7  Seam pass → scene-graph.json → ink → the game
```

Output feeds `scene-graph.json` → the resolver → `.ink` → `story.json` → lantern and Unreal
via Inkpot.

## Offline mode

`--offline` replays `fixtures/*.json`, keyed by a hash of model + system + prompt. Fixtures
are **recordings of live runs**, not hand-written answers — an online run saves what it
received. Changing a prompt changes the key, so a stale fixture can never silently stand in
for a call that was never made.

**`fixtures/` ships empty**, so `--offline` reports a missing fixture until the harness has
been run online at least once. That is the intended failure: an empty fixture set should
error loudly rather than quietly replay something nobody recorded.

## Two files are copies

`src/ceilings.js` carries the word ceilings and `countWords` from `tools/line-lint.mjs`.
`cards/*.json` carries six fields each from `cast/*.md`. Both are inlined so this folder runs
standalone, and each names its source and date in its own header. If the live files change,
these change with them.

`tools/line-lint.mjs` was changed once for this work: it used to run its whole lint at import
time and could call `process.exit(1)`. Its main block is now guarded so it runs only when
invoked as a script, and `countWords` and `CEILING` are exported. Behaviour as a CLI is
unchanged — still 1138 slots checked, still clean, still exit 1 on defects.
