# Handoff — Toby set + SPB-bind done; encounter rebuild complete; wiring next

Paste the block at the bottom into a new session. Everything above it is context for a human.

**Written 2026-08-30.** Content freeze (2026-08-28) and capstone (2026-09-01) are both past.
This session did content-rebuild work on Roc's explicit, scene-by-scene direction. Surface
the freeze is passed early; it is a fact, not a reason to refuse work Roc asks for.

**Supersedes** [`2026-08-30-ilsa-rebuild-and-toby-next-handoff.md`](2026-08-30-ilsa-rebuild-and-toby-next-handoff.md)
for the Toby work. That handoff's state still holds underneath.

---

## What happened this session

1. **Toby's full set rebuilt** — ENC-toby-1/2/3 + NGT-toby, on **Muse-12B**, beat-by-beat per
   the playbook. Distinct mishap per encounter, graded give-loop, learn-by-watching, three
   divergent closes. Model **stayed Muse** at Roc's call, including NGT (where FINDINGS #1 had
   it failing twice before) — it held with the tuned card + beat-by-beat method.
   - **ENC-1** — supply shortfall (a hundred short). Toby casts `portion` → **player learns
     `portion`**. Graded: lend hands 0.5 / mage `portion` 1.0.
   - **ENC-2** — oven fire failing (distinct kind: heat). Toby hand-fixes (no own spell fits
     fire). Graded: hand-feed `item_sticks` 0.5 / mage `breath` 1.0. Owed dep: `breath` ←
     Farmer (unauthored; falls to hand-fix — same as Mara ENC-2's `seal`).
   - **ENC-3** — transport (bread's baked, can't carry it and mind the last trays both).
     Toby casts `weigh` to measure → **player learns `weigh`**. Graded: hand-carry 0.5 / mage
     sustained `weigh` 1.0. The **arc-turn** (his repay-reflex finds nothing; they take the
     feast in *together*) seeds NGT.
   - **NGT-toby** — reshaped to **the lull** (nothing to do, rite not called, Toby not moving
     for the first time all week, visibly uncomfortable). Runs on the parked
     `toby-nothing-needs-doing` thread. Fork: give him a task (the trap) vs sit with him (the
     corrective, claimed unearned). Naming the shelf fires the `toby-unopened-jam` echo.
2. **`SPB-bind` built** — the last missing learn scene. `bind` was revived 2026-08-29 after
   the 2026-08-25 SPB run, so it had no spell beat. Built on **gemma4-26b single-pass** to
   match its 13 siblings. **Learn scenes are now complete for the whole 17-spell roster.**
3. **Canon added/changed this session (all Roc-gated):**
   - **`weigh` duration axis** — quality grades how long a hold lasts, not only accuracy
     (`content/magic/weigh.json` `mana_effect` + `gdd/04-magic-system.md`). A baker sustains
     `weigh` only to read heft; the mage holds it continuously to bear a load. Content-check clean.
   - **Toby register tuned** — fast **forward complete sentences**, never clipped fragments
     (`cast/toby.md` voice_register + the gen card). His mark is pace, not amputation.
   - **Two NGT-only softenings** (`cast/toby.md`): flag 8 (one *outward* anxious long run at
     the payoff) and flag 1 (he explains the shelf once at the direct question). Both scoped
     to NGT, both keep the receiving-flat tell firing. Different registers, no collision.
   - **`bind.json` status note** — learn scene no longer owed.
4. **Findings #15–18 logged** in `pipeline-runs/2026-08-27-icm-thread-docs/FINDINGS.md` —
   Toby's register tune, "let Muse breathe," the NGT reshape + both softenings, and the two
   learn-scene mechanisms (SPB beats vs encounter learn-by-watching; reviving a spell owes an
   SPB scene).
5. **Approved lines compiled** into `pipeline-runs/2026-08-30-approved-lines/` — 44 approved
   player-facing files copied (originals untouched) into category folders: intro (1),
   greetings (14), encounters (9), night-scenes (3), spell-beats (14), vignettes (3). Intro +
   greetings are from the 2026-08-25 run (generated-output format); the rest from the
   icm-thread-docs rebuild (slot-table format). See its `README.md`.

---

## State — done / owed

**Encounter rebuild is COMPLETE.** All three authored souls now have rebuilt ENC-1/2/3 + NGT:
**Mara, Ilsa, Toby.** Threads reconciled, raws preserved, canon recorded, in
`pipeline-runs/2026-08-27-icm-thread-docs/`. Learn scenes complete for the 17-spell roster.

**Owed / not started (non-encounter — the next session's work):**
- **`{player_name}` mechanic** + ink var for VIG-grand's ending.
- **Ink / host wiring:** route `festival_vignette` by goal count; expose **bond level** to the
  ink (NGT-mara's doll gate reads bond ≥ 4; ENC arc-landing reads the ENC-3 grade); the
  `ore_sourced` key item (cave F7) → the ENC-ilsa-3 give; wire the Toby thread moves
  (`toby-feast-short`, `toby-the-shelf`) and NGT flags (`toby_repays_every_gift`).
- **`breath` ← Farmer learn scene:** the Farmer soul is unauthored, so `SPB-breath` exists but
  the *encounter* dependency for ENC-toby-2's `breath` option can't be reached in play until
  the Farmer is authored. Low priority (the hand-fix covers it).
- **Second-person sweep** of pre-ruling scenes (`VIG-quiet`, `SPB-*`, other `ENC-*`/`NGT-*`
  that predate the second-person ruling).

**Flagged, not mine to fix:** `content-check` reports one defect —
`item item_captured_sound: sounds cost no pack space`. Unrelated to any spell/Toby work; the
file was auto-updated at 03:22 this session (an `auto:` commit, not a hand edit). Look when in
that area.

**Deferred:** the **plain-language hook review** (due 2026-08-30). Run
`python resources/response-quality-mine.py` for the after-numbers; process spec
`resources/response-quality-process.md`.

---

## The method (unchanged, if more rebuild work appears)

Governing doc: `pipeline-runs/2026-08-27-icm-thread-docs/ENCOUNTER-REBUILD-PLAYBOOK.md`. Read
it in full before any encounter work, plus FINDINGS (#3–18). Spec the beats, get Roc's
per-beat confirm, generate beat-by-beat (cap runaway beats short), scrub the raw, assemble,
take Roc's edits, then write lines + thread doc + preserve the raw. **Per-soul model:** Mara →
Muse; Ilsa → Violet-Lotus; Toby → Muse. SPB beats → gemma4-26b single-pass. koboldcpp on port
5001, one model at a time, `taskkill` before switching (`assignments/assignment-8-icm/
_kobold-tests/README.md`). Cards in `_kobold-tests/cards/`.

---

## Prompt for the new session

```
Read ProjectOS/game-project/CONTEXT.md, then this handoff
(plans/_handoffs/2026-08-30-toby-complete-and-wiring-next-handoff.md).

Content freeze was 2026-08-28 — surface it early; this is work on Roc's explicit direction.

The encounter rebuild is COMPLETE: Mara, Ilsa, and Toby all have rebuilt ENC-1/2/3 + NGT,
and learn scenes are done for the whole 17-spell roster (SPB-bind was the last, built
2026-08-30). Threads reconciled, raws preserved, canon recorded in
pipeline-runs/2026-08-27-icm-thread-docs/.

This session's work is the OWED non-encounter items (ask Roc which to take first):
- {player_name} mechanic + ink var for VIG-grand's ending.
- Ink / host wiring: route festival_vignette by goal count; expose bond level to the ink
  (NGT-mara doll gate reads bond >= 4; ENC arc-landing reads the ENC-3 grade); ore_sourced
  key item (cave F7) -> the ENC-ilsa-3 give; wire Toby's thread moves + NGT flags.
- Second-person sweep of pre-ruling scenes (VIG-quiet, SPB-*, other ENC-*/NGT-*).

Also open: content-check reports one unrelated defect (item_captured_sound: sounds cost no
pack space) — flag for Roc, not part of the rebuild. And the plain-language hook review is
due (run resources/response-quality-mine.py).

koboldcpp is on port 5001 if any generation is needed (relaunch per
assignments/assignment-8-icm/_kobold-tests/README.md; one model at a time, taskkill before
switching).
```
