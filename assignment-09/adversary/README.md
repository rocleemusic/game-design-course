# adversary — the adversarial QA agent

Plays mode 5 badly on purpose, for 250 steps, in a real headless Chromium, and
writes a structured report of what broke.

```bash
npm run adversary
npm run adversary -- --seed 20260824 --steps 250
npm run adversary -- --url http://localhost:5188 --headed
```

Output lands in `.adversary/run-<seed>/` — `findings.json` and `findings.csv`.
Exit code 0 when nothing new was found, 1 when something was, 2 for a harness
failure.

The seat that runs and triages this is
[`agents/qa-adversary.md`](../../agents/qa-adversary.md). The tool produces raw
findings; the seat decides which ones are real.

## Why this exists beside `walk` and `sweep`

Everything else in `tools/` plays the game correctly.

| | Strategy |
|---|---|
| `npm run walk` | walks the whole week, checks the game kept working |
| `npm run sweep` | drives all 89 authored cast pairs, checks the prose reaches the screen |
| `playtest/*.mjs` | 33 scripts, each replaying one known-good flow |
| `npm test` | 743 unit tests over the pure seams |
| **`npm run adversary`** | **takes invalid actions on purpose, checks the game refused** |

None of the others sends bad input. That is the gap.

## How it decides what "broken" means

One place: [`lib/invariants.mjs`](lib/invariants.mjs). Each entry is a
relationship that must hold no matter what just happened — "the compacted
satchel matches its pockets", "a refused gate is never cleared", "the player
never stands on a screen whose gates still block it".

The loop checks **every applicable invariant after every step**, whichever probe
fired. A probe's job is only to create a state worth checking. That split is why
adding a rule is one entry in one file, and why six probes do not each carry
their own copy of `movesLeft >= 0`.

## The six probes

| Probe | Attacks |
|---|---|
| [`clock`](probes/clock.mjs) | out-of-range choice index · a stale index taken after the view moved · double-clicking one traversal pill |
| [`gates`](probes/gates.mjs) | clicking a locked pill · taking the same blocked move through the story layer instead |
| [`inventory`](probes/inventory.mjs) | the same forage slot twice · a slot holding an item it never offered · a slot id no screen has · drop-and-count |
| [`cast`](probes/cast.mjs) | a spell not in the spellbook · no components · a receiver not on this screen · spending one component twice |
| [`save`](probes/save.mjs) | truncated · version-bumped · mode-swapped · a shape-valid envelope around an empty payload · invented item and gate ids · then one honest save/reload/load round trip |
| [`soak`](probes/soak.mjs) | opening and closing one panel 20x and counting what is left · mashing 14 random real keys |

About 45% of steps are honest play, so the loop actually reaches day 4. An
adversary that only ever sends bad input never leaves the first screen.

## Surviving a build that is being rewritten underneath it

Three mechanisms, because Groups 1-4 of
`plans/2026-08-23-roc-notes-triage-plan.md` were mid-build when this landed.

**1. It discovers, it never hard-codes.** No screen id, item id, spell id, gate
id or pool name appears in an invariant or a probe. Everything is read off the
live game. The forage reconcile turning `"herbs"` into `"item_berry"` changes
nothing here, because nothing here ever knew the string.

**2. One file per seam.** Two things can break it, and each has exactly one home:

| When this changes | Fix this |
|---|---|
| A rule about what must hold | [`lib/invariants.mjs`](lib/invariants.mjs) |
| How the game's state is reached | [`lib/agentApi.mjs`](lib/agentApi.mjs) |

**3. `known-issues.json`, with expiry.** A bug a plan already owns reports as
`status: "known"` instead of burying a real finding. Every entry carries an ISO
date; past it the entry stops muting and the finding comes back as `new` with a
note naming the plan that was supposed to fix it. Without that, the file quietly
becomes a permanent mute button.

## Reading the report

Four fields carry the weight.

**`location`** — screen, system, scene, and the source file that owns it.

**`game_context`** — day, block, moves, carry, spellbook, cleared gates, and
what the choices were. What the world looked like at the moment it broke.

**`repro`** — `seed` plus `step`, and the last dozen actions. `--seed N` replays
the run exactly, so a fixer gets back to the state instead of hunting for it.

**`reachability`** — the field that decides triage, and the one easiest to fudge.

| Value | Means |
|---|---|
| `player` | a mouse click or a keypress did it. A shipping bug |
| `model-only` | the probe called into the game's own objects past the UI. Not a bug a player can hit today, but a real statement about where enforcement lives |
| `environment` | tampered input — a corrupted save, cleared storage |

Reporting a `model-only` finding as if a player could hit it is the fastest way
to make this tool worthless. The seat contract makes checking it a step.

## Two things the report says that most do not

**`coverage`.** A run with no findings means one of two very different things:
the build is clean, or the loop never got there. `screensVisited`, `probesFired`
and `notReached` tell them apart. `notReached` lists what went unchecked as
plainly as the findings list what did.

**Self-inflicted state is attributed, not counted.** The gates probe walks the
player past a gate on purpose. Every step after that happens in a world no real
session reaches, so `ctx.markBypassed()` tells the loop it was our doing and the
always-on standing-somewhere-locked check stops re-filing the consequence as a
second bug. The first run filed four findings that were all the wake of one
deliberate bypass. An adversary that counts its own cheating is padding.

## Files

```
run.mjs                 the loop, the CLI, the coverage accounting
known-issues.json       what is already owned, with expiry dates
lib/
  invariants.mjs        THE definition of broken. Edit here when a rule changes
  agentApi.mjs          THE page-side adapter. Edit here when the build moves
  harness.mjs           dev server + Playwright lifecycle
  findings.mjs          finding shape, dedupe, reachability
  knownIssues.mjs       the matcher, and the expiry that keeps it honest
  report.mjs            findings.json + findings.csv + the terminal summary
  rng.mjs               seeded PRNG — the reason repro works
probes/                 six files, one per attack strategy
```
