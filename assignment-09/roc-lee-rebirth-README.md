# Assignment #9 — Adversarial QA Agent

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure.

An agent that plays the capstone badly on purpose. 250 steps in a real headless
Chromium, then a structured report of what broke. Every other test tool in the
project plays the game *correctly*: a walker takes the week end to end, a sweep
drives all 89 spell pairs, 33 scripts replay known-good flows, 743 unit tests
cover the logic. None of them sends bad input. This agent does nothing else.

## What's in this folder

| Path | What it is |
|---|---|
| `adversary/` | The runnable tool: the step loop, the six probes, and the invariant registry it checks after every step |
| `agent/qa-adversary.md` | The agent contract: how a raw finding gets triaged into real, known, by-design, or self-inflicted |
| `report/2026-08-26-seed20260826/` | **The run of record.** 250 steps against the current build: `findings.json`, `findings.csv`, and `run-note.md` |
| `report/2026-08-24-seed20260824/` | The first run, kept as a trail |

The tool runs inside the full game-project Phaser build (it drives the real game
through Playwright). The copy in `adversary/` is here so the code is reviewable on
its own. The code boxes below are from it.

## How it works

The agent boots the real game and drives it through Playwright, the same way the
project's other playtest tools do. Each step is one of two things: honest play
(about 45% of steps, so it reaches day 3–4 instead of sitting on screen one) or a
deliberate attack from one of six probes. After *every* step, either kind, it
checks a fixed list of invariants that must hold no matter what just happened.

**The same check runs after every step.** An invariant that applies to this game
mode is run against the current snapshot. A violation becomes one report row.

```js
for (const inv of INVARIANTS) {
  if (!inv.appliesTo(mode)) continue;
  if (inv.needsResolved !== false && !snap.resolved) continue;   // skip mid-transition frames
  const violation = inv.check(snap, prev, state);
  if (violation) ctx.record(inv.id, violation, snap);
}
```

**An invariant is one relationship that must hold.** This is the loudest finding
in both runs: two separate parts of the code track which gates are cleared, and
they are allowed to disagree about the same door.

```js
// INV-GATE-TWO-CLEARED-SETS-AGREE — two writers, one fact.
// Gates.ts (the graph parse) keeps one cleared-set; GateEngine keeps another.
// The hover text reads the first; the click veto reads the second.
check: (snap) => {
  const engine = new Set(snap.gates.cleared);
  const graph  = new Set(snap.graphGates.cleared);
  const onlyEngine = [...engine].filter((x) => !graph.has(x));
  const onlyGraph  = [...graph].filter((x) => !engine.has(x));
  if (!onlyEngine.length && !onlyGraph.length) return null;      // agree → no finding
  return {
    summary: `cleared-gate sets disagree — engine only: [${onlyEngine}], graph only: [${onlyGraph}]`,
    location: { system: "gates", file: "phaser/src/world/Gates.ts" },
  };
}
```

**Each violation is one report row** with `location`, `error_type`, and
`game_context`. Those are the fields the assignment asks for. A developer can act
on this without the game open:

```json
{
  "id": "ADV-0024",
  "error_type": "resource_duplication",
  "severity": "blocking",
  "location": { "screen": "F1", "scene": "CollectScene", "system": "cast", "file": "phaser/src/world/Inventory.ts" },
  "game_context": { "day": 3, "timeBlock": "evening", "spell": "ignite", "component": "item_sticks",
                    "before": 1, "afterFirst": 0, "afterSecond": 0 },
  "summary": "\"item_sticks\" was consumed by the first cast (1 -> 0) and the second cast landed anyway (still 0). One component paid for two casts."
}
```

## What did the agent find?

Two runs are kept: **8/24** (seed 20260824) and **8/26** (seed 20260826, the run
of record). Both ran the full 250 steps. The 8/26 run turned up **46 findings: 10
blocking, 36 material.**

Four blocking bugs. **All four were in the 8/24 run, and all four still reproduce
on 8/26.** None was fixed:

| Bug | Where | Hits (8/26) |
|---|---|---|
| Save + reload returns a different world: different screen, empty satchel, a cleared gate no longer cleared. Item one of the project's own Definition of Done | `SaveCoordinator.ts` | 1 |
| A burst of ordinary keys loses the whole play scene: zero live scenes, no console error, no exception. It fails silently | `CollectScene.ts` | 2 |
| Casting a spell twice consumed the component once and let the second cast land free | `Inventory.ts` | 4 |
| A bond-gated screen was walkable with its gate never cleared this life | `TraversalRow.ts` | 24 |

**New on 8/26, a live regression:** item art fails to load. The console throws
`Failed to process file: image "art:item:item_dirt"` **28 times**. It was not
present 8/24.

**Loudest single finding:** the gate-tracking split above fired **133 times** in
the 8/26 run (110 in 8/24). `CastPipeline.ts`'s own comment says the second
tracker is not yet wired: *"it belongs to the GateEngine in Wave 2 Track B."* The
agent walked straight through the gap the code names.

Coverage: 17 invariants checked, 13 not reached this seed. That is normal
sampling. The 8/24 run left 13 unreached too, 12 of them the same. Several
"not reached" invariants only fire when something breaks (no uncaught exception,
scene never lost), so their silence is the good news, not a blind spot. The
report lists them in `coverage.notReached` rather than passing them silently. The
8/26 run's full reasoning is in that folder's `run-note.md`.

## Were you surprised?

**The save/restore bug, because it's the entry flow, not the save code** (found
8/24, again 8/26). The save layer is careful. Its own header says a defect must
be reported, never coerced, and it correctly refused every corrupted save the run
threw at it: truncated JSON, a bumped version, invented item and gate ids. The
gap is upstream. Reopening the game routes back through the day's location picker,
which starts a fresh day in ink *before* the save can restore over it. Each piece
does its job. The sequence between them is what's missing.

**The gate-tracking split, because the codebase already knows about it** (8/24,
110 times; 8/26, 133 times). I didn't find a hidden bug. I found a comment in
`CastPipeline.ts` admitting the exact gap the agent then walked straight through.
That's the most useful kind of adversarial finding: not a mystery, but a
confirmation that a known architectural debt is player-reachable right now.

**The item-art regression, because the agent caught it as a side effect** (8/26).
I was re-running to refresh the numbers, not hunting art bugs. The adversary never
targets asset loading. It just watches the console after every step, so a broken
art path surfaced for free, 28 times. Worth stating plainly: on 8/26, none of the
four blocking bugs from 8/24 had been fixed. An adversarial pass is only worth
running if someone acts on it.

## How to run it

The tool runs from inside the game-project Phaser build:

```bash
cd phaser
npm run adversary                                   # random seed, 250 steps
npm run adversary -- --seed 20260826 --steps 250    # replay the run of record
```

Exit code 0 means nothing new was found, 1 means something was, 2 is a harness
failure. Output lands in the `--out` folder (default `.adversary/run-<seed>/`) as
`findings.json` and `findings.csv`. The agent contract in `agent/qa-adversary.md`
is the seat that runs this and decides which raw findings are real.
