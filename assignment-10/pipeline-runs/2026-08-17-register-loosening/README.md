# Register loosening — the Mara test

**Run date:** 2026-08-17. **Status: awaiting Roc's read.** Nothing in the live spec has changed.

## The question

Roc's report: the souls sound the same, and the tone is wrong. Frieren stays as inspiration, the flat affect goes.

This run asks whether loosening the register produces **more soul-specific** lines, or just longer ones.

## What was found before anything was written

Two things, both from reading the spec rather than guessing.

**1. The per-soul machinery already works.** The cards declare real, distinct bands — 3–8 (Pip, Bex) through 12–25 (Mara) — and they do reach the generator. Mara's pinned `voice_register` carries her band, her tense tell, and her own exemplar lines. The sameness is not a plumbing failure.

**2. The tone enum is the flat affect, stated as a spec.** `pipeline.md` step 8 fixes five tones — quiet · wistful · matter_of_fact · warm · distant. Every one is low-arousal and inward. There is no word in the vocabulary for delight, sharpness, urgency, mischief, or hurt. Shipped v01 content only ever reaches for three of the five.

The enum is **not enforced in the resolver** — no tone validation exists in `tools/resolver/src/`. Expanding it is a documentation edit with zero Track B cost, so it does not fall into the polish bucket the new line classes went into.

## The design

The control is free. `mara-said-out-loud-C1.md` already puts **Mara and Bex in the same scene** — the widest declared band gap in the cast, co-located and gate-approved.

| Arm | What it is |
|---|---|
| **A — control** | The shipped file, unchanged. Read at `lantern-projects/v01/threads/lines/mara-said-out-loud-C1.md` |
| **B — loosened** | `arms/B-loosened.md`. Same graph, same 36 slots, same story beats. Register, tone enum and two card declarations vary. Nothing else. |

**The story is held constant.** The non-change after Bex's naming is canon, and Arm B preserves it exactly — Mara does not react, her hands do not falter, no line of hers touches what was said. A version where she reacts would be a story change wearing a register change's clothes, and would invalidate the run.

## Files

| File | What it is |
|---|---|
| `SORT-TEST.md` | **Read this first.** The blind instrument. Reading the arms first contaminates it. |
| `draft-register-loosened.md` | The proposed `register.md` amendment |
| `draft-cards.md` | The proposed `voice_register` declarations for Mara and Bex |
| `arms/B-loosened.md` | The regenerated conversation |

Nothing here has touched `narrative-pipeline/register.md`, `pipeline.md`, or `cast/*.md`. If the test fails, delete this folder and the capstone build is untouched.

## Caveats, so the result isn't over-read

1. **The generator is not perfectly controlled.** Arm A was produced historically and hand-gated by Roc. Arm B was written in-session. So a cross-arm *quality* comparison is confounded by more than the register. The substitution test is the primary instrument precisely because it measures an internal property of each arm and largely survives that confound.
2. **n = 1 conversation, 2 souls.** Per `benchmark-plan.md`'s own rule: if the arms land close, that is **inconclusive, not equal.**
3. **The local model stays out.** One variable. The StyleTune arm runs after this resolves, or a bad result is unattributable.
4. **Bex barely moves by design.** His card already carried the deflect-not-name exemption this change generalises. He is the leak check, not a second sample.

## What the answer decides

**If tone alone carried it** — the fix is a doc edit to the enum, and the eight-card rewrite can wait until after the capstone.

**If it needed the full loosening** — that is eight card edits inside 8 days, against a capstone on 2026-08-25.

Then the standing question from before the run, still open: regenerate v01 at the new register for consistency, or apply to new content only and accept a two-voice build. My read is still the second, with regeneration folded into the same polish pass as the new line classes.
