# Assignment #6 — GER pipeline · staging

**Due:** 18 August 2026, 11:59 ET *(corrected on the board and in the milestone calendar, Roc 2026-08-11)*
**Status:** Harness built 2026-08-11 → [`pipeline/`](pipeline/). Made standalone and submitted
2026-08-16. The live run was cut on purpose — see open decision 4.

---

## The claim being tested

The narrative pipeline already **is** a GER pipeline. This document checks that claim component
by component, and names the one place it does not hold.

| GER component | What the project already has | Runnable? |
|---|---|---|
| **Generator** | Content/Dialogue agent — `pipeline.md` step 8, one prepared slot per call (card, echo template, scene context, assigned tone, `voice_register`, `slot_type`, `max_words`). Choice Designer generates the structure the lines sit in. | Markdown contract, dispatched to a subagent |
| **Evaluator** | Two layers. **LLM:** Consistency Verifier reads each batch against a locked 12-check invariant set (`guardrails.md`, permanent check IDs, never renumbered) plus QA's reachability / soft-lock / dead-end walk. **Deterministic:** `content-check.mjs`, `card-lint.mjs`, `codex-lint.mjs`, `ref-lint.mjs`, `line-lint.mjs`, `registry-lint.mjs`. | **Lints yes — real, runnable, blocking.** Verifier is a contract |
| **Refiner** | `pipeline.md` step 13 — a prose flag returns to the Content Agent for revision inside the same canon. The **batch reconciler** (`agents/batch-reconciler.md`) is the one seat with rewrite authority, and it reports construction counts before and after. | Markdown contracts |
| **Circuit Breaker** | See below — this is the strongest part. | Partly |

### The circuit breaker is the good part

Most implementations of this assignment will bolt a retry counter onto a loop. This pipeline has
a **typed exit** that distinguishes "retrying will help" from "retrying cannot help":

1. **A cap.** Prose flags return to Content for **at most 2 revisions**, with model fallback allowed
   on repeated failure.
2. **A structural exit.** A flag naming a *structural* cause — a bad echo template, an essence
   contradiction, a delta slot re-declaring something already delivered — **leaves the loop entirely**
   and routes *up* to the Architect as a new prepared input. It is never re-worded by the generator,
   because re-wording cannot fix it.
3. **A pre-flight gate.** `node tools/card-lint.mjs` runs *before* any generation pass and a failure
   **blocks dispatch** — the breaker can trip before a single token is spent.
4. **A human stop.** Nothing ships unread, and the gate does not move mid-chain.

Worth stating plainly in the README: point 2 is the part that is actually hard, and the pipeline
got it right because it was built to solve a real routing problem, not to satisfy a rubric.

---

## The gap — read this before building

The deliverable says **"Your pipeline code (Generator, Evaluator, Refiner, Circuit Breaker)."**

The evaluator layer is real code. The rest is markdown contracts executed by a human orchestrator
dispatching subagents. **There is no single runnable program that closes the G→E→R→CB loop.**

This is the same tension Assignment #5 had — and #5 only resolved cleanly because the teacher
relaxed the brief in class. **No such relaxation is on record for #6.**

**Recommended fix, and it is small:** write a thin harness that automates one full loop over one
slot type. Generate a line → run `line-lint.mjs` → dispatch a Verifier pass against the relevant
guardrail checks → refine on a prose flag → stop at 2 revisions → exit to the human gate on a
structural flag. Every component already exists; only the loop is missing. That harness *is* the
submission, and it is honest — it automates a pipeline that genuinely runs today.

---

## Pre-Build Declaration — DRAFT

*Superseded 2026-08-16. The submitted version is in [`README.md`](README.md) — same rule, same
measurement, cut from 144 words to 112. Kept here as the working draft.*

> **1. What content type does your game currently generate manually, inconsistently, or not at all?**
>
> NPC dialogue lines. Three souls, nine threads, four conversations each. The pipeline writes one
> slot per call, so every writer solves a soul's signature move in isolation, blind to the others.
>
> **2. What specific rule from your GDD must every piece of that content satisfy?**
>
> Guardrails check 6 — voice register. A soul's warmth must arrive by that soul's declared channel
> and its precision must run on its declared axis, matching this soul's card and no other's.
>
> **3. What does a failure look like — concretely, in your game's terms?**
>
> Measured 2026-08-10: half of Ilsa's warm beats were *anticipation* — comfort supplied
> against an unvoiced need, which is Toby's channel — rather than her *inclusion*, a place in the
> work assigned. One pair was directly interchangeable: "Stool's inside the door if you're stopping"
> against "Stool's under the counter if the standing gets long." Same object, same elided
> possessive, same conditional tail, same job. Two neighbours the player is meant to tell apart
> read as one person.

**Why this rule and this failure:** they cohere, they are already measured with real numbers, and
the failure is invisible to every mechanical check — which is exactly the blocker the assignment
describes ("technically valid but wrong for your game").

---

## Open decisions

1. ~~**Due date.**~~ **Resolved 2026-08-11 — 8/18.** `GP-6` and the milestone calendar both corrected.
   The old 8/11 came from the assigned-plus-one-week rule; #6 runs two weeks and is the exception.
2. ~~**Build the harness?**~~ **Built 2026-08-11 — `pipeline/`.** Closes the gap: the G→E→R→CB loop
   is now runnable code. See [`pipeline/README.md`](pipeline/README.md).
3. ~~**Which slot type?**~~ Both. `slots/demo.json` carries two `dialogue` warm beats (Ilsa and
   Toby, the pair whose channels actually converged) and one `player_line` at the 12-word ceiling.
4. ~~**A live run is still needed.**~~ **Cut 2026-08-16.** A recorded generate → flag → refine → trip
   demonstration is Assignment #7's deliverable, which asks for three before/after examples and a
   scoring evaluator, and is due two days after this one. Spending the run here would hand #7's
   evidence to #6. So #6 submits the architecture, the declaration and the code; #7 submits the loop
   in action. "Did it catch something you would have missed" is answered from the Kinbound run,
   which is already on record and already shipped with Assignment #4.
5. **Made standalone 2026-08-16.** The harness reached four levels up into `tools/` and `cast/`,
   which breaks the moment it is copied to the course repo. `src/ceilings.js`, `src/cardlint.js` and
   `cards/*.json` are declared copies of the live files; every path now resolves inside `pipeline/`.
6. **Does the batch reconciler go in?** It is a second refiner with rewrite authority and measurable
   before/after counts. Strong material, but it operates on a finished batch rather than inside the
   per-slot loop, so it may be cleaner as a README section than as a pipeline stage. **Still open.**

## Files this will draw on

| File | Role |
|---|---|
| `narrative-pipeline/pipeline.md` | The 13-step procedure — steps 8, 10, 11, 12, 13 are G/E/R/CB |
| `narrative-pipeline/guardrails.md` | The evaluator's locked check list |
| `narrative-pipeline/agents/content-dialogue.md` | Generator contract |
| `narrative-pipeline/agents/consistency-verifier.md` | Evaluator contract |
| `narrative-pipeline/agents/orchestrator.md` | The loop, the retry cap, the routing rules |
| `agents/batch-reconciler.md` | Refiner with rewrite authority |
| `tools/line-lint.mjs`, `tools/card-lint.mjs`, `tools/content-check.mjs` | Deterministic evaluator, already runnable |
