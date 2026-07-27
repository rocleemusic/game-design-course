# Run Log — Phase 2, the Giver (Toby), 2026-07-25

The call-down/signal-up trail for the clean demo run. This is the game-40 evidence that the architecture in [`../../narrative-pipeline/agents/README.md`](../../narrative-pipeline/agents/README.md) ran as specified: every worker took a prepared input from the Orchestrator and returned a typed output, no worker called another, every flag routed up and back down, and the human gate held.

Phase 1 results and the config decision are in [`RESULTS.md`](RESULTS.md). Phase 2 does not re-run the benchmark.

**Config as run.** Narrative Architect — Opus 5. Content / Dialogue — Fable 5. Consistency Verifier — Sonnet 5. QA / Playtest — Sonnet 5. Session effort `high` throughout; per-agent effort is a Workflow feature and Phase 2 ran in-session.

**Inlining applied.** The Orchestrator assembled every spec bundle into each worker's prompt. No worker read a file. **17 invocations, 17 turns, zero tool calls.** That is the whole of Phase 1's cache fix 1, and it is what makes billed volume equal footprint on every call below.

---

## Summary of the run

| | Calls | Revisions |
|---|---|---|
| Narrative Architect | 4 | 3 structural round-trips |
| Content / Dialogue | 6 | 5 revisions |
| Consistency Verifier | 6 | 5 re-verifications |
| QA / Playtest | 1 | — |
| **Total** | **17** | |

Nine distinct Verifier flags were raised across six passes. Two human gates were held. Two lines remain unapproved at the close of the run.

---

## Stage 2 — the sequence

Narrative Architect → Content → Consistency Verifier → *(QA light)* → Roc's gate.

---

### Call 1 — Orchestrator → Narrative Architect (Opus 5)

**Prepared input (inlined, no file access).** The Architect role prompt; the terseness constraint capping `essence_descriptor`, `voice_register` and `notice_and_want` at ~60 words each; the locked Toby soul seed; the voice_register spread passed *as a spread* (~70% animated, with the outward/receiving asymmetry stated); the scene context for `bakery-feast-dough`; the echo re-cut instruction with the rejected stool seed and the reason it failed; the ratified arc doc; both schemas; the register; the guardrails; the NPC codex; the Mara worked example as the bar for concrete detail.

**Typed output.** `persona_cards[1]`, `echo_templates[1]`, `delta_rule`, `canon_flags[9]`, `scene_brief_for_content`.

**Result.** Terseness held — 57 / 55 / 48 words against the ~60 cap. Trait axes orthogonal on the first attempt. Echo re-cut as `toby-unopened-jam`, with its own not-the-job test attached.

**Signal up.** No flags raised by the worker. 51,359 footprint, 1 turn, 0 tools.

---

### Call 2 — Orchestrator → Content / Dialogue (Fable 5)

**Prepared input (inlined).** The Content role prompt; an explicit terseness section; the register contract in full; the persona_card as returned by the Architect; the voice_register spread with the asymmetry marked as the single most important item and a stated defect condition; the scene context and fixed tone; the Architect's scene brief with both declared deltas; the echo_template with planting instructions; the Mara example as the bar; a six-line slot brief naming each line's job.

**Typed output.** `content_lines[6]`, `human_review_required: false`.

**Result.** The asymmetry appeared in the word counts unprompted — outward lines 17–20 words, receiving lines 5 and 7.

**Signal up.** No flags raised by the worker. 48,053 footprint, 1 turn, 0 tools.

---

### Call 3 — Orchestrator → Consistency Verifier (Sonnet 5)

**Prepared input (inlined).** The Verifier role prompt; the seven invariants plus the speaker_intent and steering guards; the added dialogue-slot check (Phase 1 follow-up 3); the added register-spread check; the register; the arc doc's World Truths, arc question and anti-goals; the NPC codex; the full batch — card, echo, delta_rule, canon_flags, six lines; the rejected stool seed with an instruction to judge the replacement independently rather than pass it because it was a fix.

**Typed output.** `verification_report[10]`, `register_spread_check`, `dialogue_slot_check`, `echo_seed_not_explained_by_the_role`, `summary`.

**Flags — 2.**

| content_id | flag_type | reason |
|---|---|---|
| `toby-dough-02` | `knowledge_travels` | Stated a standing relational fact about two souls outside the NPC codex |
| `delta_rule` | `delta` | "Exactly one declared new fact" then defined it as a world fact *and* a personal fact |

Card, echo, canon_flags and the other five lines PASS. Register spread passed all four sub-checks. Dialogue-slot check passed.

**Signal up.** 59,087 footprint, 1 turn, 0 tools.

**Routing decision (Orchestrator).** Prose flag → back to Content as revision 1 of 2. Structural flag → up to the Architect as new input. Flags never routed sideways; both went through the Orchestrator. Both existing agents were continued rather than cold-started, since fewer agent calls is one of only two savings levers Phase 1 left available.

---

### Call 4 — Orchestrator → Content (revision 1 of 2)

**Prepared input.** The single flag, its cause traced to the "invents no soul, trait, or fact" constraint, the instruction not to touch the five cleared lines, and the bounds within which the web line could be re-cut.

**Typed output.** Six lines, five byte-identical, `toby-dough-02` replaced. 47,370 footprint.

### Call 5 — Orchestrator → Narrative Architect (structural round-trip 1)

**Prepared input.** The single flag, the source spec's base rule and permitted richer two-slot form, and the properties the field had to preserve.

**Typed output.** `delta_rule` re-cut with a floor of one and a ceiling of two named slots, plus a change_note. 50,530 footprint.

---

### Call 6 — Orchestrator → Verifier (re-verification 1)

**Prepared input.** Only the two changed items, each with its prior version, the flag it drew, and the worker's own note. Instruction: judge independently, do not pass because it is a fix.

**Flags — 2.**

| content_id | flag_type | reason |
|---|---|---|
| `toby-dough-02` | `essence_vs_role` | The fix over-corrected into generic bakery kindness; failed the not-the-job test and blurred into the Content Server |
| `delta_rule` | `delta` | Count now consistent, but the closing quiet-beat clause contradicts the opening floor |

**Signal up.** 59,173 footprint. This pass caught its own prior clearance being over-corrected — the check working as designed.

---

### Calls 7 and 8 — Content (revision 2 of 2) and Architect (structural round-trip 2)

Content was given the failure named precisely: *noticing that someone is sad and sending them bread is kindness, and any warm person does it.* The discriminator — he inserts himself as the necessary piece, and he forecloses the debt — was stated as a constraint, with the not-the-job and Content Server tests to run before returning. 50,374 footprint.

The Architect was given the floor-versus-quiet-beat contradiction and told to resolve it without dropping either half. 51,606 footprint.

### Call 9 — Verifier (re-verification 2)

**Both items PASS.** Line 02's debt-foreclosure signature was judged present *in the text* rather than merely asserted in `speaker_intent`. delta_rule's contradiction resolved by binding the floor to a named unit. Batch clears with no outstanding flags. 65,573 footprint.

### Call 10 — Orchestrator → QA / Playtest (light)

**Prepared input.** The design rules that bind the scene — hook not fail-state, the four verb families, omitted verbs, a wrong action teaches, orientation versus significance, entry-order safety, no forced beat and no payout for helpfulness; the scene as authored; the echo's standalone requirement. Instruction: no scene graph exists, so check traversal properties as authored and do not invent nodes.

**Typed output.** 7 of 8 PASS, `blocking: false`. One non-blocking flag: proper nouns without an in-scene referent on a first or only visit. 50,813 footprint.

---

## 🚦 Human gate 1

The Orchestrator surfaced the card, the echo, all six lines, both agents' states and the token accounting. **No file was written. Nothing self-approved.**

**Roc's ruling.**

- **APPROVED** — the persona_card in full.
- **APPROVED** — lines 01, 02, 05, 06.
- **REJECTED** — line 03: *"the list reads as disjointed and doesn't flow."*
- **REJECTED** — line 04: *"reads brusque and unwarm."*

The Orchestrator flagged that the constraint was the missing element in the direction and asked for the diagnosis before routing, rather than spending a revision cycle guessing at the defect. Roc supplied both in one line each.

**Why line 04 matters more than a style note.** The register spread had been passed down as *tempo* — animated outward, flat and short when attention turns back on him. The Architect encoded it that way, Content executed it literally, and the Verifier passed it on all four spread sub-checks. All three were correct against the brief and the result was cold. **Nobody had specified that warmth is invariant across the spread and only tempo varies.** That gap was invisible to every structural check in the pipeline and was caught only at the human gate.

---

## Post-gate — the revision loop

Gate direction was treated as a fresh prepared input rather than a third revision against the cap. **In hindsight this was the process defect of the run** — see the closing section.

| Call | Agent | What changed | Outcome |
|---|---|---|---|
| 11 | Content | Lines 03 and 04 re-cut against Roc's two diagnoses | 54,539 |
| 12 | Verifier | Both **FLAG**. 03 delegated the shelving to the player, implied an opened jar against locked canon, and fused its only cover to the seed. 04 warm but merely deferred the offer, went generic, and validated the offer before declining | 72,621 |
| 13 | Content | Re-cut with the full constraint set restated and the trade-one-for-another pattern named | 59,594 |
| 14 | Verifier | Both **FLAG**. 03's actor now fully ambiguous and the seed too thin to recognise at payoff. 04's *"Saw you coming"* narrates the anticipation mechanism aloud, and *"second batch at dawn"* softens line 01's shortfall and adds an undeclared fact | 80,015 |

**Orchestrator diagnosis at this point — the loop was not converging, and one cause was the Orchestrator's own.**

1. **Line 03 was mis-specced.** The echo seed was being carried by a *spoken* line. A seed whose content is a thing Toby does and does not mention cannot be spoken by him: it becomes stage direction (banned) or self-narration (banned). The worked example plants Mara's seed correctly as scene business, not dialogue. Four attempts failed on exactly this, and the constraint set was not satisfiable in the slot it had been given.
2. **Line 04's mechanism had no fact slot.** Foreclosure by anticipation requires that he *already did* something, which is by definition a new fact. The scene brief had allocated exactly two, both spent. The Verifier was correct to flag the pre-emption as undeclared.

Both were put to Roc rather than routed to another Content pass.

## 🚦 Human gate 2

**Roc's decisions.**

- Move the echo seed to a **scene-business slot**, per the Mara precedent.
- **Allocate the fact slot** for the receive-beat rather than constraining Content around its absence.
- **Cap agent revisions at 2** before surfacing for review.

---

### Call 15 — Architect (structural round-trip 3)

**Prepared input.** Both decisions as settled rulings to implement, not re-open; the constraint that the new fact must not soften `delta_world` or collide with line 01's timeline; the not-the-job test; the instruction that if three declared facts violate its own `delta_rule`, it must amend the rule rather than leave the scene in violation.

**Typed output.** `scene_brief_v2` with `delta_personal_2` allocated (the refilled flask); `delta_rule` amended to one world fact plus up to two personal; a `seed_carrier_slot` spec with a hard actor-clarity requirement; a replacement brief for the freed dialogue slot; not-the-job test and collision check. 54,443 footprint.

**Orchestrator call.** The Architect's brief for the freed line-03 slot described the foreclosure job, which is line 04's. With the seed moved out, line 03 had no remaining job. **Line 03 dropped.** Inventing a job for an empty slot would be adding, and the register says cut before adding. Recorded as reversible.

### Call 16 — Content

**Typed output.** A non-dialogue `scene_business` slot carrying the seed, plus a re-cut line 04, plus the four approved lines byte-identical. 65,477 footprint.

### Call 17 — Verifier

**Flags — 2, both open at the close of the run.**

| content_id | flag_type | reason |
|---|---|---|
| `toby-dough-seed` | `register_drift` | Skeleton mirrors the Mara worked example's shape with nouns swapped |
| `toby-dough-04` | `feedback_law` | Answers a feast-help offer with an unrelated flask fact — non-sequitur rather than legible refusal, and indistinguishable from the Content Server |

The seed passed 6 of its 7 substantive checks — actor unambiguous, unopened intact, cover independent, recognisable at payoff, matches the approved template, still legible as a gift rather than stock. Moving it out of dialogue fixed everything that had been failing for four passes.

The Verifier also flagged that `delta_rule`'s ceiling was raised in the same pass that needed exactly one more slot — *"the rule bending to fit this scene's content rather than the content conforming to a standing rule"* — logically sound but named as governance drift.

88,467 footprint.

---

## 🚦 Human gate 3 — state at close

**Approved and final:** the persona_card; the echo_template; lines 01, 02, 05, 06.
**Pending ruling:** the seed slot's Mara-shaped skeleton.
**Open, not approved:** line 04, four versions, all flagged.
**Dropped:** line 03.
**Open:** `delta_rule`'s raised ceiling.

### The line 04 bind, recorded

Foreclosing an offer requires already having done the thing offered. The thing offered is feast help. Anything pre-empting feast help reduces the deficit. The deficit must stay open. Every version broke on one horn or the other, and the constraint that produced the final non-sequitur — *the new fact must not touch the dough* — was the Orchestrator's.

| Version | Got right | Broke |
|---|---|---|
| "Oven wants wood. Back door." | Structurally legal | Brusque; and it accepts the help rather than refusing it |
| "Kind of you. Dough's past helping till the next proof." | Warm | Defers rather than forecloses; generic; validates the offer |
| "Saw you coming. Second batch went in at dawn." | Warm, forecloses | States the mechanism aloud; softens the deficit; undeclared fact |
| "Your flask's full. It's by the door." | Warm, no self-narration, deficit untouched | Answers a different offer; any at-peace soul could say it |

---

## Architecture — did it hold

| Claim | Result |
|---|---|
| Every arrow into a worker is a prepared input | **Held.** All 17 calls. |
| Every arrow out is a typed output | **Held.** All 17 calls returned schema-conforming JSON. |
| Workers never call each other | **Held.** Zero worker-to-worker edges. |
| Flags route up, never sideways | **Held.** All 9 flags went to the Orchestrator and were re-dispatched. |
| The Verifier flags only, never rewrites | **Held.** No Verifier pass produced replacement text. |
| The human gate is real | **Held.** Three gates. Nothing self-approved. No file written before approval. |

The architecture is not what strained. The **revision governance** is.

## What the run cost

Every call was one turn with zero tool calls, so billed volume equals footprint throughout.

| | Architect | Content | Verifier | QA | Total |
|---|---|---|---|---|---|
| **Run cost** (1 call each) | 51,359 | 48,053 | 59,087 | 50,813 | **209,312** |
| **Revision cost** | 156,579 (3) | 277,354 (5) | 365,849 (5) | — | **799,782** |
| **Total** | 207,938 (4) | 325,407 (6) | 424,936 (6) | 50,813 (1) | **1,009,094** |

**Revisions were 79% of the run.**

| Comparison against Phase 1's 224,508 footprint / 1,089,969 billed per soul | Footprint | Billed |
|---|---|---|
| Like-for-like — Architect + Content + Verifier, matching Phase 1's composition | 158,499 | **158,499 — a 6.9× reduction** |
| Run cost including QA | 209,312 | 209,312 — −80.8% |
| Full run including every revision | 1,009,094 | 1,009,094 — still −7.4%, at 4× the invocations |

Inlining landed inside Phase 1's predicted 4–7× band. Phase 1 projected the Architect slot at roughly 60–80K against its 414,372; actual was **51,359**.

Output tokens were not separately recoverable this run — the harness reported `subagent_tokens` (footprint) only. Resumed-agent footprints do not accumulate monotonically, so per-call figures on continued agents are approximate.

## What this run changes

1. **A revision cap is a budget control, not only a process one.** Run cost projects the 8-soul roster to ~1.67M on both measures, which fits under the v5 §8 2M crew budget *whichever unit it is denominated in* — the question Phase 1 left open. At this run's revision ratio it overruns badly.
2. **The existing cap did not bind.** `pipeline.md` step 13 caps prose flags to Content at two revisions. It does not cover Architect round-trips, and it reset at the human gate. Content reached five calls and line 04 reached four versions inside a spec that reads as though it caps at two.
3. **Warmth invariance was invisible to every structural check.** Only the human gate caught it.
4. **Seed slot typing was never written down.** The worked example does it correctly; the schema does not say so; the Orchestrator specced it wrong and burned four Content passes.
5. **The Content Agent trades away unnamed constraints.** Observed four times. Every revision brief must restate the full constraint set, not just the defect. The one pass where it traded nothing was the one where the full set was restated with a self-check attached.
6. **Verification is again the largest slot** — 424,936 of 1,009,094 (42%), against Phase 1's 46%. Phase 1's cache fix 3, a condensed invariant sheet for the Verifier, remains unapplied and is the highest-leverage saving left.
7. **Phase 1 follow-up 3 is closed.** The dialogue-slot check was added and passed every batch; no stage direction reached a dialogue slot.
