# RESULTS — Giver benchmark (Toby), 2026-07-25

Phase 1 of Task 1's pipeline proof. Plan: [`../benchmark-plan.md`](../benchmark-plan.md). Blind arms: [`arms/`](arms/). Ten agents, no errors, ~19 minutes, 563,789 total subagent tokens.

Roc read the five arms with model identity withheld and ranked before any reveal. Blind labels were re-randomized (`Card-K/M`, `Lines-P/Q/R`) because the plan's own arm table names the models against `A1…B3` — reading files labeled `A1` would not have been a blind read.

---

## Verdict

| Slot | Config | Confidence |
|---|---|---|
| **Content / Dialogue** | **Fable 5 · medium** — adopt | Good. Won the blind read outright and tied on flags. |
| **Narrative Architect** | **Opus 5 · xhigh**, with a terseness constraint added to the role prompt | Held, not proven. The blind read and the objective check disagreed — see below. |

**What changed because of it:** the plan's premise for arm set A — that Sonnet in the Architect slot is *the budget lever* — is **not settled by this run.** The three token measures disagree (see the accounting section), and the one closest to real billing favours Sonnet for a reason that is an artifact of turn count rather than a property of the model. **The Opus decision therefore rests entirely on the orthogonality disqualifier, not on cost.** Sonnet is owed a second sample rather than being written off.

---

## Benchmark table — with the reveal

### Set A — Narrative Architect

| Blind label | Model | Effort | Roc's read | Verifier flags | Output tokens |
|---|---|---|---|---|---|
| **Card-K** | **Sonnet 5** | xhigh | **Preferred** — better content, concise | **2** — incl. one disqualifier | 23,898 |
| **Card-M** | **Opus 5** | xhigh | 2nd — more thorough, verbose | **1** — non-structural | 22,538 |

### Set B — Content / Dialogue

All three wrote from the same card (Card-M / Opus), per the plan's control.

| Blind label | Model | Effort | Roc's rank | Lines Roc would ship | Verifier flags | Output tokens |
|---|---|---|---|---|---|---|
| **Lines-Q** | **Fable 5** | medium | **1st** | **6 of 6** | 1 | 5,475 |
| **Lines-R** | **Opus 5** | medium | 2nd | 4 of 6 (2, 3, 4, 6) | 1 | 3,128 |
| **Lines-P** | **Sonnet 5** | medium | 3rd | 1 of 6 (3) | 1 | 4,208 |

---

## The Content result — the register question, answered

The plan called this one genuinely unknown: *does a prose-tuned model help or hurt a deliberately anti-ornamental voice?* Fable is tuned toward richness; the register wants the opposite.

**It helped, and not marginally.** Fable took 6 of 6 shippable lines against Opus's 4 and Sonnet's 1. The plausible reading is that holding a flat register is a *prose* skill rather than a restraint problem — knowing where the weight lands in a short clause is exactly what a prose-tuned model is tuned for. Restraint turned out not to be the hard part; *cadence* was.

Flag counts were identical (1 each), so they didn't separate the arms. The blind read did all the work here, which is appropriate — §9.1 makes the human read the acceptance bar.

**Cost note:** Fable was the most expensive of the three (5,475 vs 3,128 output tokens) and still the cheapest slot overall by a wide margin. Paying ~75% more per call for a 6-of-6 hit rate over 4-of-6 is not a close decision.

---

## The Architect result — where the read and the check disagree

This is the honest headline of the run, and the plan anticipated it: *"Cheap tier is close but carries flags → the flags decide. Invariant breaks are structural failures, not preferences."*

**Roc preferred Card-K (Sonnet). The Verifier flagged Card-K's trait axes as non-orthogonal** — the one failure the plan names as a hard disqualifier rather than a taste difference:

> `essence_vs_role` — trait_axes not orthogonal: deflection target ("redirects when asked about himself") and precision profile ("blank on own hunger/fatigue/hurt") both encode the same fact; one predicts the other.

That check is correct on inspection. Both of Sonnet's axes say *he goes blank on his own needs*. Knowing one tells you the other, which is precisely the failure that makes a generated cast read as one archetype in different hats.

Opus's axes do vary independently — deflection to *the asker*, precision about *sequence and timing* while vague about *credit and ownership*, warmth as *brokerage*. Nothing about redirecting to the asker predicts being exact about the order of a morning.

**So the two objections are not the same kind of problem.** Roc's objection to Opus is **verbosity** — a presentation defect, fixable with a sentence in the role prompt. The Verifier's objection to Sonnet is **correlated axes** — a structural defect that propagates into every line written from the card and into every soul generated the same way. Verbosity is cheap to fix. Orthogonality is the thing the slot exists to get right.

**Decision: Opus 5 · xhigh for the Architect, with an explicit terseness constraint added** (a field-length cap on `essence_descriptor`, `voice_register`, and `notice_and_want`, which is where the bloat was). Sonnet is not ruled out — it is *unproven at n=1 with a live disqualifier*, which is a different thing.

Sonnet's second flag (`echo_mismatch` — a payoff condition phrased as exposure rather than a named deduction) points the same direction.

Opus's single flag was `knowledge_travels`: an echo cited "the gate hinge" as an established Mara fact when it isn't in her locked store. Real, but a canon-store lookup error, not a structural failure of the card.

---

## Token cost — full accounting

Pulled per-agent from the run transcripts. **There are three legitimate ways to count this and they give very different answers, so every figure below is labelled.** Mixing them was an error in the first draft of this report and is the single easiest mistake to make here.

| Measure | What it means | Use it for |
|---|---|---|
| **Output** | Tokens the agent generated — reasoning plus its typed result. Each counted once. | How much work the agent actually did |
| **Footprint** | The agent's final context size (cached prefix + new). This is what the progress panel shows and what the harness reports as `subagent_tokens`. | How big the job was |
| **Billed volume** | Per-call usage summed across the agent's whole loop. Every turn re-bills the cached prefix, so a long tool-calling loop inflates this even with no new content. | Closest proxy for what you pay |

### Per agent

| Agent | Model | Turns | Output | Footprint | Billed volume | **Cost** |
|---|---|---|---|---|---|---|
| **A1 — Architect** | Opus 5 · xhigh | 8 | 21,890 | 54,278 | 414,372 | **$1.34** |
| **A2 — Architect** | Sonnet 5 · xhigh | 5 | 23,906 | 58,640 | 292,324 | **$0.68** |
| **B1 — Content** | Fable 5 · medium | 4 | 5,480 | 51,301 | 197,034 | **$1.65** |
| **B2 — Content** | Opus 5 · medium | 4 | 3,134 | 51,277 | 194,632 | **$0.76** |
| **B3 — Content** | Sonnet 5 · medium | 4 | 4,214 | 55,576 | 212,224 | **$0.51** |
| verify:A1 | Sonnet 5 · high | 4 | 27,488 | 61,292 | 250,006 | $0.90 |
| verify:A2 | Sonnet 5 · high | 3 | 10,519 | 58,474 | 174,614 | $0.35 |
| verify:B1 | Sonnet 5 · high | 4 | 20,651 | 57,637 | 228,557 | $0.77 |
| verify:B2 | Sonnet 5 · high | 4 | 17,383 | 57,674 | 225,437 | $0.72 |
| verify:B3 | Sonnet 5 · high | 4 | 14,587 | 57,609 | 222,367 | $0.68 |
| **TOTAL** | | | **149,252** | **563,758** | **2,411,567** | **$8.37** |

The footprint total (563,758) matches the harness's reported `subagent_tokens` of 563,789 to within 0.006%, which confirms what that field is measuring.

**How cost is derived, and a correction.** Computed per call from the transcripts at current rates — Opus 5 $5/$25, Sonnet 5 $3/$15, Fable 5 $10/$50 per million input/output tokens, with cache writes at 1.25× input and cache reads at 0.1×. **For billing, summing per-call usage is correct** — a cached prefix is genuinely re-billed on every turn. The earlier caution against summing applies to reading that total as *job size*, not as spend.

### Two conclusions that change once measured in dollars

1. **The Architect budget lever is real — Sonnet costs half.** $0.68 against Opus's $1.34, because Opus bills 1.67× per token *and* took more turns. Tokens said inconclusive; dollars say 2×. **The honest statement is therefore sharper than either earlier version: Sonnet is half the price and still fails the orthogonality check.** That is a real trade-off being declined, not a free choice.

2. **"The register decision is free" was wrong.** Fable is the *most expensive* Content arm at **$1.65**, against Sonnet's $0.51 — it bills $10/$50, double Opus. It is **3.2× the cheapest option** for 6-of-6 versus 1-of-6 shippable lines. Still clearly worth paying; it is a paid choice, not a free one.

### What the numbers actually say

1. **The Architect cost comparison is inconclusive — the three measures disagree.**

   | Measure | Opus (A1) | Sonnet (A2) | Winner |
   |---|---|---|---|
   | Output | 21,890 | 23,906 | Opus, by 9% |
   | Footprint | 54,278 | 58,640 | Opus, by 8% |
   | Billed volume | 414,372 | 292,324 | **Sonnet, by 29%** |

   Billed volume is the measure closest to real cost, and it favours Sonnet — but **only because Opus took 8 turns to Sonnet's 5**, and every extra turn re-bills the whole cached prefix. Turn count on a single soul is noise, not a model property. **The cost question is therefore open, and the Opus decision stands on the orthogonality disqualifier alone.**

2. **Context is overwhelmingly spec, not work.** Every agent's footprint lands in a narrow 51K–61K band regardless of model, effort, or job — because each one independently reads the same six or seven spec files. Output ranges 3K–27K; footprint barely moves. **The crew's cost is dominated by re-reading the spec, not by thinking.** See the cache section below.

3. **Verification is not a rounding error.** The five Verifier passes are **292,686 of 563,758 footprint (52%)** and **1,100,981 of 2,411,567 billed (46%)** — comparable to all five generation agents combined. Any per-soul projection counting only generation understates the truth by roughly half.

4. **The register decision is free.** Fable vs Opus in the Content slot: footprint 51,301 vs 51,277 (0.05% apart), billed 197,034 vs 194,632 (1.2% apart). Fable produced 6 of 6 shippable lines against Opus's 4. There is no cost argument against it.

5. **Content does less work than the Architect, but does not cost proportionally less.** On output the Architect is 4–7× larger (21.9K vs 3–5K). On footprint they are near-identical, because both carry the same spec load. Optimising Content's model is therefore close to pointless; optimising what Content *reads* is not.

**Not converted to dollars** on purpose — v5 §8 sets the crew budget in token capacity, not currency, and the plan's caveat 1 warns against reading these as a dollar figure. Say the word if you want the currency lens for the class.

## Cache — where the money actually goes, and how to cut it

The finding above (context is spec, not work) has a concrete cause and concrete fixes.

**The cause.** Each subagent is isolated, so **none of them share a prompt cache.** All ten independently read `narrative-architect.md`, `arc-festival-slice.md`, `register.md`, `guardrails.md`, and the two schemas. Each pays its own cache-write for that content. Then, because each file arrives via a tool call, each read is another turn — and every turn re-bills the entire cached prefix. A1 shows the pattern exactly: its cache read went 0 → 42,065 → 48,216 → 50,248 → 53,104 across the loop, so roughly the same 50K prefix was billed eight times. That single agent's 54K job became 414K of billed volume.

**The fixes, in order of leverage.**

| Fix | Mechanism | Estimated saving |
|---|---|---|
| **1. Inline the spec bundle into the prompt** instead of having each agent Read it | Collapses 6–8 tool-call turns into 1. The prefix is cached once and billed once instead of once per turn. | **~4–7× on billed volume.** A1's 414K → roughly 60–80K |
| **2. Batch souls per Architect call** | The ~50K spec load is paid once for N souls instead of N times. The card schema already takes an array, so this is native. | **Approaches N× on the Architect slot** across the 8-soul roster |
| **3. Give the Verifier a condensed invariant sheet** rather than six source files | It is 52% of footprint and re-reads the whole spec to apply a finite checklist. | Up to ~half of the Verifier's ~58K footprint |
| **4. Scope the arc doc per call** | Workers get the sections they steer against, not the whole document. Trades against the plan's control that every worker receives the ratified doc — a deliberate call, not a free win. | Modest; do last |

Fix 1 is the big one and costs nothing in quality — the agent gets identical content, just handed to it instead of fetched.

### Tested and ruled out: a shared prompt preamble

An obvious-looking fifth fix — give every worker a **byte-identical spec preamble at the top of its prompt** so agent 1 writes the cache and agents 2…N read it — **does not work.** Tested directly (3 Haiku agents, one turn each, 106K tokens, 15 seconds):

| Agent | Preamble | Cache read | Cache write |
|---|---|---|---|
| ALPHA (first) | 7K-token spec bundle | **0** | 35,437 |
| BETA | **byte-identical to ALPHA** | **20,121** | 15,316 |
| GAMMA (control) | same content, sections reordered | **20,121** | 15,316 |

BETA did get a cache hit — but the shuffled control got **the identical hit, to the token.** Had the matching preamble been reused, BETA would have read ~7K more than GAMMA. It did not.

The 20,121 being shared is the **harness prefix** (system prompt + tool definitions), which is identical across every agent and is **already cached automatically at no cost to us.** Our own content sits past the last cache breakpoint — breakpoints are set at the system/tools boundary, not inside the user message — so it is re-written on every agent regardless of how identical it is. That is the 15,316 both BETA and GAMMA paid.

**Consequence: cross-agent cache sharing of crew content is not reachable from here.** Every saving must come from *within* a single agent's loop (fix 1) or from *fewer* agent invocations (fix 2). This also retro-explains Phase 1's ten cold starts: they were not a prompt-design mistake, they are the floor.

**Why this matters for scope.** At the winning config, one soul through a production pass (Architect + Content + both Verifier passes) came to **224,508 footprint / 1,089,969 billed**. Across the 8-soul roster that is **~1.8M footprint / ~8.7M billed**, before revision passes. Against v5 §8's 2M crew budget, the roster fits on footprint and **overruns badly on billed volume** — so *which unit the 2M is denominated in* is a live question, not a bookkeeping detail. **Confirm against the demo run before any scope decision leans on these numbers.**

> **Superseded by Phase 2.** Inlining collapsed every call to one turn, so footprint and billed converged and the unit question is closed. More importantly, a *per-soul* figure turned out to be the wrong unit entirely — cards scale with souls, but lines and verification scale with **scenes**. See the Phase 2 budget section for the corrected model.

## Success criteria

## Success criteria

| # | Criterion | Status |
|---|---|---|
| 1 | The crew produces an approvable Giver end-to-end, honoring call-down/signal-up + the gate | **Architecture: met. Content: substantially met, one line open.** Phase 2 ran the full stage-2 sequence: no worker ever called another, every flag routed up to the Orchestrator and back down, and the gate held. The persona_card was **approved in full, unchanged, on the first attempt**, and 4 of 6 lines were approved. Line 04 (the receive-beat) remains unapproved after four attempts. See the Phase 2 section. |
| 2 | The Arc-Question shape validates as a per-soul template | **Superseded — and productively.** See below. |
| 3 | A defensible model/effort config per slot with cost attached | **Met**, with the Architect held rather than proven. |

### On criterion 2

Testing the shape against the cast broke it in a useful way. It fit the Keeper. It **failed on the Kinbound**, whose spine was written as *unshiftable by design* — "stay X or become Y?" presupposes movement, so it produced a question with a pre-authored answer.

Chasing that failure surfaced a bigger problem the template was only a symptom of: **an unshiftable soul generates nothing inside a single life.** The irony only existed after a reshuffle, so in a one-life slice the Kinbound was inert content.

**Roc's call: the Kinbound gets an arc, of a different shape** — *blood is given → blood is tended*. The belief qualifies rather than flips, and the pressure is generated by other people's behavior rather than by a dealt role. Written into [`../../narrative-pipeline/arc-festival-slice.md`](../../narrative-pipeline/arc-festival-slice.md) as a ratified amendment, with a new family-pressure pool, an endpoint guard (never lands on chosen-family — that stays the Found-Family Keeper's), a no-betrayal-set-piece guard, and the bond gate recorded as a sanctioned `authored_exceptions` break.

**Scope, decided:** deep souls only. Texture souls get no arc question in the slice.

So the per-soul template is **not adopted as a universal shape.** It works where a belief flips and needs a second shape where a belief qualifies. That is a better answer than a clean yes.

---

## Follow-ups

**Input defects — mine, not the models'**

1. **The 70/30 voice register was never passed down.** Roc specified a *spread* between monotone and animated; the seed said `"ANIMATED, not monotone"` — a binary. Neither arm could hit a ratio it was never given, and both missed it identically, so the K-vs-M comparison still stands. **The winning card needs a voice_register fix pass regardless of which one goes forward.** Pass the spread as a spread next time.

**Spec updates**

2. **v5 §6.3 is now stale on the Kinbound** — still reads "never changes, and not the player's to resolve." Must be corrected in Task 2.
3. **The Verifier missed a slot violation.** `Lines-P` line 05 was written as third-person stage direction — *"He drags the stool to the flour table…"* — in a dialogue slot with `speaker_id: toby`. The Verifier flagged that line for `essence_vs_role` but never noticed it wasn't a spoken line at all. Add a check that a dialogue slot contains dialogue.
4. **The stool echo seed is weak, and two independent passes said so.** Both `Lines-Q` and `Lines-P` were flagged on the stool line for the same reason — refusing a seat reads as ordinary baker practicality, so the role explains away the essence it was meant to seed. Two independent flags on the same seed is signal. This is an Architect-level defect inherited by Content: fix the seed, not the lines.

**Budget**

5. **The plan's slot-cost premise needs re-checking.** It treats Content as the largest slot (700K of the 2M crew budget). Observed per call, the Architect does **4–7× more work** than Content on output tokens (21.9K vs 3–5K) while costing about the same in context. The plan's figure may still hold at scale, since Content is called once per text slot across every scene while the Architect runs once per soul — Content's total would then be driven by call volume, not call cost. Worth confirming against the demo run before any scope math leans on it.

6. **Decide what unit the 2M crew budget is in.** Footprint and billed volume differ by ~4× on this run, and the 8-soul roster fits comfortably under one and overruns badly under the other. Until that is settled, no scope decision should quote a budget percentage.

7. **Apply cache fix 1 before the demo run.** Inlining the spec bundle rather than having each agent fetch it is worth roughly 4–7× on billed volume at zero quality cost, and it makes the demo's per-soul figure representative of production rather than of a benchmark harness.

**Caveats, so the numbers aren't over-read**

6. **n=1 on one soul.** The plan is explicit: arms landing close is *inconclusive, not equal.* The Content result was decisive enough to act on; the Architect result is not, and is recorded as held.
7. **Three token measures, never mixed.** Output, footprint, and billed volume answer different questions and differ by up to ~7× on the same agent. The benchmark-table columns quote `budget.spent()` output deltas; the accounting section recomputes output from the transcripts and the two differ by under 3% (duplicate usage records in the transcript). Any figure quoted downstream must carry its measure.
8. **The Orchestrator's cost is invisible** in these figures — it is the main session's reasoning. Any per-soul figure derived from this run is a floor, not a ceiling.
9. **Set A and Set B ran sequentially, not in parallel**, so per-arm token deltas attribute to a single agent. Verifiers ran in parallel and their cost is not separated per arm.

---

---

# Phase 2 — the demo run

Ran in a fresh session at the Phase 1 config. 17 invocations, 17 turns, **zero tool calls** — inlining applied to every worker. Full handback preserved in [`run-log.md`](run-log.md).

## The headline

**The architecture is proven. The process is what costs money.**

- No worker ever called another. Every flag routed up to the Orchestrator and back down. The gate held. **The core claim of `dev-crew-architecture.md` ran as specified, live.**
- The persona_card was approved **in full, unchanged, first attempt** — terseness constraint held (57 / 55 / 48 words against a ~60 cap), and orthogonality passed the Verifier with no revision. That is the slot Phase 1 was most worried about.
- **Run cost was 209,312. Revisions cost 799,782 — 79% of the run.** Generation is cheap; iteration is not.

## The three fixes — all landed

| Fix | Result |
|---|---|
| **70/30 register spread** | **Landed.** Passed all four spread sub-checks on the first pass. The asymmetry is visible in word count alone: outward lines 16–17 words, receiving lines 5–7. Passing a spread *as a spread* worked. **But it exposed a gap in its own spec — see below.** |
| **Re-cut echo seed** | **Survived comprehensively.** The unopened-jam seed passed the not-the-job test on first generation and on every independent pass, including one where the Verifier was told to try to fail it. *"An ordinary baker eats the jam or puts it on the counter; nobody trades a free jar into unbilled goods to cancel the thanks."* The essence was right immediately; only its **rendering** took five attempts, for an unrelated reason (see seed slot typing). |
| **Inlining** | **Worked, inside the predicted band.** 6.9× reduction in billed volume like-for-like; zero tool calls across 17 invocations; no quality cost. Phase 1 predicted 60–80K for the Architect slot — actual **51,359**. |

## Tokens

Billed ≈ footprint throughout, because every call was one turn with no tool calls.

| | Footprint / billed |
|---|---|
| **Run cost** (one call per agent — the architecture as designed) | **209,312** |
| Revision cost (13 further calls) | 799,782 |
| **Full run** (17 invocations) | **1,009,094** |

**Against Phase 1's per-soul 224,508 footprint / 1,089,969 billed:**

| Comparison | Result |
|---|---|
| Like-for-like (Architect + Content + Verifier, no QA) — 158,499 | footprint **−29.4%**, billed **−85.5%** (6.9×) |
| Run cost including QA — 209,312 | billed **−80.8%** |
| Full run including every revision — 1,009,094 | billed **still −7.4%**, while doing 4× the invocations |

## The budget question — the unit is settled, the headroom is not

Phase 1 left one question live: which unit is v5 §8's 2M crew budget in? **At this run's efficiency it no longer matters** — footprint and billed are equal, because inlining reduced every call to a single turn. That question is closed.

**A per-soul figure is the wrong unit, though.** This run's 209,312 bought one card, one echo, **one scene** of six lines, one verification and one QA pass. Multiplying it by 8 souls gives a *setup* cost, not a content cost. The two halves scale on different axes:

| Component | Cost | Scales with |
|---|---|---|
| **Architect** | 51,359 | **Souls** — once each; cards and echoes do not regenerate per scene |
| **Content + Verifier** | 107,140 | **Scenes** — every scene needs new lines and a new verification pass |
| QA | 50,813 | Light, stage 6–7 only; not modelled below |

```
total ≈ (souls × 51,359) + (scenes × 107,140)
```

**What 2M actually buys.** Cards for all 8 souls cost 410,872, leaving ~1.59M — which is **roughly 15 scenes of dialogue across the entire cast**, at this run's efficiency, with **zero revisions**.

**The slice needs about that many.** v5 §6.2 puts the festival cycle at 5 days, each running morning → afternoon → evening: **15 scene-slots.** So the slice fits the budget with essentially no margin — and this run's revisions ran **3.8× generation**, which would cut the affordable count to about **4 scenes**.

Two consequences, both now load-bearing rather than nice-to-have:

1. **Cache fix 3 is the margin.** Halving the Verifier's 59K takes per-scene cost to ~78K and buys ~20 scenes instead of ~15. Without it there is no slack at all.
2. **The revision cap is a scope control.** At 3.8× the slice does not fit at *any* generation efficiency. Discipline on revisions, not cheaper models, is what makes the roster shippable.

> **The 2M crew budget is not a generation budget. It is a revision-discipline budget.**

### And in dollars — the token budget binds long before spend does

Phase 2 did not preserve its input/output split, so these apply the rate card to its footprints and are **estimates**, not measurements:

| Unit | Model | Est. cost |
|---|---|---|
| Architect — one soul's card | Opus 5 | ~$0.87 |
| Content + Verifier — one soul-appearance | Fable 5 + Sonnet 5 | ~$1.30 |
| **8 cards + 15 appearances — the whole slice** | | **~$26** |
| Same, with revisions at Phase 2's 3.8× | | ~$100 |

**Fifteen soul-appearances is a hard ceiling in tokens and roughly a bar tab in money.** That reframes what the 2M budget is actually protecting: if the constraint is genuinely *capacity* rather than *spend*, then model-tier decisions should be made on **quality, with cost as a tiebreak** — which is what the Fable and Opus choices above already do, but for the first time that ordering is justified by the numbers rather than assumed. Worth stating explicitly in the GDD's §8 so the budget's purpose is unambiguous.

**Caveat that must be pinned before this anchors a scope decision:** the arithmetic assumes one Content call ≈ one scene ≈ one game time-block, carrying one soul. If a scene carries two souls' lines, or a screen-visit needs several Content calls, the affordable scene count moves — possibly by a lot. Settle that mapping in Task 2.

## The deepest finding — warmth invariance

Roc rejected line 04 as *"brusque and unwarm."* Neither the Architect nor the Verifier caught it, because both read *"goes flat and short when attention turns back on him"* as the whole of the asymmetry — so Content produced something **correct and cold**.

> **The spread governs tempo and uptake only. Warmth is invariant across it.**

That was never written down because nobody realised it needed writing. **This is the same class of defect as Phase 1's, one level deeper:** Phase 1 passed a *switch* where a *spread* was meant; Phase 2 passed the *spread* but not *what holds constant across it*. Both are failures to specify the invariant rather than the variable.

**Principle earned, worth promoting into `steering-layer.md`:** when handing down an axis that varies, state what does **not** vary along it. A spread without an invariant is an underspecification, and the model will resolve it in whichever direction the words lean.

## The costliest finding — single-axis revision briefs

Observed **four times**: given a one-axis instruction, the Content Agent fixes that axis and **silently spends another constraint.**

| Told to fix | Silently lost |
|---|---|
| the invented fact | the essence signature |
| flow | the echo's canon |
| warmth | the refusal |
| self-narration | the offer's target |

The only pass that traded nothing was the one where the **full constraint set was restated plus a self-check.**

This is the mechanism behind the 79% revision cost, and it generalises past this project: **a revision brief that names only the defect is an instruction to trade something else away.** The revision cap treats the symptom; restating the full constraint set treats the cause. Both are needed.

## A tension to resolve before applying cache fix 3

The Verifier **caught every defect it was given a check for — including two of its own prior clearances, once new criteria were supplied.** It is criteria-bound, not judgment-bound: it finds what it is told to look for and nothing else.

That sits in direct tension with Phase 1's cache fix 3 (*give the Verifier a condensed invariant sheet instead of six source files*), which is still the largest remaining saving — verification was **42% of this run**, consistent with Phase 1's 46%.

> **Fix 3 must be a complete distillation of the checks, not a truncation of the inputs.** Any check dropped from the sheet becomes a class of defect the Verifier can no longer see. Condense deliberately, and diff the resulting checklist against `guardrails.md` before adopting it.

## Spec changes this run earned

| # | Change | Where |
|---|---|---|
| 1 | **Warmth invariance** — warmth is invariant across the voice_register spread; a receiving-flat line that reads brusque, clipped, dismissive, transactional or irritated is a flag regardless of word count, as is one indistinguishable from a soul at peace being needed | new invariant → `guardrails.md`, `register.md` |
| 2 | **Seed slot typing** — a seed whose content is an act the soul performs and does not mention **cannot** be carried by a dialogue slot; it becomes stage direction (banned) or self-narration (banned), so it must be planted as scene business. The Mara worked example already does this correctly; the rule was never written down, so the Orchestrator specced it wrong and burned four Content passes | `templates/echo-template-schema.md` |
| 3 | **Revision cap** — two revisions per item for **any** worker and **any** flag type, then surface. Counts Architect round-trips as well as Content returns, and **does not reset at the human gate** | `pipeline.md` step 13 (currently caps only prose flags to Content) |
| 4 | **Full-constraint briefing** — every revision brief restates the complete constraint set plus a self-check, never only the defect | `pipeline.md`, agent role prompts |
| 5 | **Specify the invariant** — when handing down a varying axis, state what holds constant across it | `steering-layer.md` |
| 6 | **Hard delta ceiling** — 2 facts per scene (one world, one personal). The Architect may not raise it; a request to exceed **surfaces to Roc**. Closes the governance-drift flag | `pipeline.md`, `guardrails.md` item 3 |
| 7 | **Choice-node unit type** — *(post-7/30)*. `content_lines` is a flat array with no branch structure; nothing in the card, echo template, or Content role prompt models a player choice. The receive-beat needs a branching unit before Content can generate it. **First player-choice content in the pipeline** — spec it properly rather than squeezing it into this scene | `templates/`, `content-dialogue.md`, `pipeline.md` |
| 8 | **Brief for concreteness, not shape** — a worked example handed down as a quality bar must say *match the density, not the skeleton*, or the crew reproduces its structure and the Verifier flags our own instruction | agent role prompts, `pipeline.md` |
| 9 | **`slot_type` field + `[action]` prefix.** The field **does not currently exist** — Phase 2 recorded "scene_business / NON-DIALOGUE" in prose because the schema had no way to represent it, which is exactly why the Orchestrator could spec a seed into a dialogue slot. Create it with values `dialogue` \| `action` \| `object` (the 40/60-word split in the role prompt already assumes this distinction without naming it). Every non-dialogue slot renders `[action]` in review. **Attribution rule (Roc):** an `action` must make its actor unambiguous — either named in the action text itself, or carried by `speaker_id`. *Not* a null-speaker rule. Word ceilings key off `slot_type` as they already effectively do | `templates/`, `content-dialogue.md` |
| 10 | **`age_band` as a role field** — NPCs have no age in the spec, so the Content Agent cannot reliably pick address terms and the Verifier cannot check them. Line 06's *"that boy"* leaked an unlicensed age fact that no check caught. **Age is role-side, not essence** — it is re-dealt each life like the job, and nothing on the essence side may depend on it (a "youthful" trait would be a defect). Needed for inter-relationships: who defers to whom, who mentors, who is "that boy" to whom | `templates/persona-card-schema.md` role fields |

**Phase 1's follow-up 3 is closed:** the dialogue-slot check was added and passed every batch. No stage direction reached a dialogue slot.

## Resolved at the gate (2026-07-25, Roc)

**1. Line 04 — the bind was self-inflicted, and the beat becomes a player choice.**

The arc doc's Baker row states the hook plainly: *"Collect/Converse — **must accept help** (Giver's receive-beat)."* Phase 2 wrote the beat as a **refusal** — version 1 was marked down for *"accepts the help rather than refusing it"* — and the foreclosure trap follows entirely from that framing, not from the spec. The Orchestrator inverted the beat.

**Roc's ruling:** the receive-beat is where the **player gets a choice** — *help anyway*, or *take the surface request at face value and don't*. This turns the beat from an authored outcome into a player verb, which is what the arc requires: the corrective is the player's "I see you," so the player must be the one who does it. Toby's deflection stays a genuine deflection; the branch carries what follows.

**Line 04 is deferred, not failed** — it cannot be written until the choice-node unit exists (spec change 7). Recording it as *deferred pending the choice-node spec* is the honest state.

Two guards the branch design must hold:
- **Neither branch is the right answer.** The arc doc's Content Server row is the counter-case — *"the help isn't wanted"* — so easing off is sometimes the correct read. If *help anyway* is always correct, the choice is decoration and the festival tier degrades into a niceness meter.
- **Being helped is not being claimed.** The anti-goal is explicit: the Giver *"is not 'fixed' by a quest step — being claimed is a beat that lands, never a reward for niceness."* Repeated *help anyway* must not accumulate into an unlock. The two acts stay distinct or the branch walks into the anti-goal.

**2. The seed's Mara-shaped skeleton — approved as house style; the briefing is what changes.**

The flag was on `toby-dough-seed`, the **non-dialogue scene-business line** that plants the echo (the `toby-unopened-jam` template itself was approved unchanged). Its skeleton — *[ordinary business] + [soul does a quiet uncounted thing] + [and doesn't mention it]* — mirrors Mara's gate hinge.

**It mirrors it because the Phase 2 prompt instructed it to:** *"the bar for concrete detail. Match this density."* The Verifier was flagging compliance with our own briefing. **Fix the instruction, not the output** — future briefs say *match the concreteness, not the shape.*

**The real homogenisation test is two *generated* souls side by side, not generated against hand-authored.** Mara has never run through the pipeline. Running her through it validates the crew against a known-good target *and* answers the drift question empirically. Queued for after 7/30.

**3. `delta_rule` — ceiling stays at 2, exceptions are human-gated.**

The Verifier's objection was never the number; it was *the rule bending to fit the content mid-run.* Ruling: **the ceiling is hard at 2** (one world fact, one personal fact), and any request to exceed it **surfaces to Roc** rather than being self-granted by the Architect. That closes the governance drift without re-arguing the arithmetic. For this scene the two slots are WORLD *the dough is flat and short for the turnout* and PERSONAL *he shelves the jam unopened.*

## Still open

4. **The Orchestrator's own cost remains invisible.** Every per-soul figure here is a floor, not a ceiling.
5. **Scene-mapping assumption unverified** — the budget model assumes one Content call ≈ one scene ≈ one time-block carrying one soul. Settle in Task 2.

---

# Soul 2 — did the fixes hold?

The ten spec changes above were written between the Giver run and the **Kinbound run (Ilsa, 2026-07-25)**, which generated the second deep soul under all of them. That run is the control: same crew, same config, same stage, with the fixes in force.

| | Giver | Kinbound |
|---|---|---|
| Verifier flags raised | 9 | **1** |
| Silent constraint-trades in revision | **4 of 4** | **0 of 3** |
| Revision share of total run | **79%** | **52%** |
| Content passes burned on slot typing | 4 | **0** |
| Full run | 1,009,094 | **457,268** |

**Half the tokens for a comparably scoped soul, and one lever explains most of it.** Full-constraint briefing took silent constraint-trades from four-for-four to zero-for-three, which is what drove revision share down. Warmth invariance worked as **prevention** — the first run where it was pre-specified, and the cold-line defect class simply never appeared. Slot typing saved four Content passes outright. Nothing in the ten got in the way.

**The homogenisation question is answered: two souls, not one archetype.** Toby's engine is *tempo* — fast, outward, animation collapsing to seven-word lines when attention turns on him. Ilsa's is *grammar* — uniform flat declaratives, her arc carried by an unfinished motion rather than a shortened line. He converts gifts into debts; she converts absences into arrangements. Their trait axes differ in kind, not just in wording, and the distinctness test against Juno passed on every line.

**But the schema has a tell, and it is ours.** Both cards closed on the same *"Against a player who …"* construction, and both precision axes used the exact/vague frame. Neither is model drift — the schema *asks* for a contrast, and `register.md` names exactness-and-vagueness as its characterization tool, so both shapes were written into the spec and then handed back to us. **This is the third instance of the same pattern**, after the Mara-skeleton flag came from a "match this density" brief. Ruled 2026-07-25: the contrast construction must vary and is now checked against existing cards; the exact/vague frame is **ratified as house style** with a specific revisit trigger — the *axis of asymmetry* must differ, and self-versus-other and long-span-versus-recent are now in use. The general rule ("a spec that describes a shape will get you that shape back") is in the Architect's role prompt.

**Two further changes this run earned**, both now in the specs: **`guardrails.md` check 9, plain language** — jargon caused half the run's revisions and no check covered it, though it turned out to be an unenforced half of the register's existing *withhold significance, never orientation* rule — and a **`walk_on` codex class**, so functionaries carrying scene business can't quietly accrete into unauthored souls.
