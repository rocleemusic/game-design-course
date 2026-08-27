# Run note — 2026-08-26, seed 20260826

The run of record for the assignment. 250 steps, mode 5, real headless Chromium.
`findings.json` and `findings.csv` sit beside this note. The earlier run is kept
at `../2026-08-24-seed20260824/` as a trail.

## What the build looked like

Today's Phaser build, after the HUD relayout, the forage reconcile, and the
Satchel/Hub scene changes that all landed since the 8/24 run. Those are the
exact scenes several findings point at, so the 8/24 report no longer described
what the build does. That is why this run exists.

## Two tool fixes were needed to run at all

The adversary would not boot against today's build. Both fixes are in the live
tool (`phaser/tools/adversary/`), not in this folder.

1. **`lib/harness.mjs` — strip ANSI before matching the dev-server URL.** Vite
   now wraps the port in bold color codes (`localhost:\x1b[1m5173\x1b[22m/`),
   which split the digits off the colon and defeated the URL matcher. The
   harness timed out waiting for a URL that was already printed. Fix: match
   against an ANSI-stripped copy of the buffer. The 8/24 run predates this vite
   coloring, so it never hit this.

2. **`run.mjs` — recover at story-end instead of stalling.** The agent plays to
   festival night, the end of the one playable week. The finished week leaves a
   resumable save on the board, and `enterPlay`'s naming one-shot is already
   spent from cold boot. Left alone, the loop kept re-resuming an *ended* life
   and gave up after ~13 tries (this was the terminal stop in the first attempt
   at this seed, step 106). Fix, on the story-end path only: drop the finished
   life's save so the board comes up cold, re-arm naming, and start a fresh
   week. This run played two full weeks and ended cleanly.

## What changed since 8/24

| | 8/24 (seed 20260824) | 8/26 (seed 20260826) |
|---|---|---|
| Findings | 36 | 46 |
| Blocking | 6 | 10 |
| Player-reachable | 8 | 24 |
| Steps completed | 250 | 250 |

- **All four blocking families from 8/24 still reproduce.** Nothing was fixed:
  gate drift, save round-trip, key-mash scene-loss, cast double-spend.
- **New regression: item art fails to load.** `INV-PAGE-CONSOLE-ERROR`, 14
  findings / 28 occurrences — `Failed to process file: image "art:item:item_dirt"`.
  Not present 8/24. The session that produced this run opened with every
  `item_*.json` file modified, which is the likely source.
- **The gate-tracking split got louder:** 110 occurrences in the 8/24 narrative,
  133 here.

## Coverage

17 invariants checked, 13 not reached this seed. That count is structural, not a
gap from an early stop — the 8/24 run left exactly 13 unreached too, and 12 are
the same ids. Several "not reached" invariants only produce a finding when
something breaks (no uncaught exception, scene never lost, no probe threw), so
their silence is the good news. The rest are corrupt-save sub-attacks the
randomizer did not select this run.
