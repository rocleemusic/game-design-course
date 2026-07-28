# Run log — ignite × 7 receivers, 2026-07-26

Third pipeline run, and the first not shaped around a soul's card. Purpose was double: (1) trace one player decision — casting `ignite` — through the crew end-to-end across a spread of receivers, for the TA feedback on [`../../gdd/11-ai-agents-and-pipeline.md`](../../gdd/11-ai-agents-and-pipeline.md)'s worked example; (2) stress-test the pipeline itself against content that isn't a scripted scene — an ambient spell-reaction with no delta facts, no scene props, and for five of the seven receivers, no persona card at all. Orchestrator: Claude (main session). No worker called another; every flag routed up and back down. Human gate: open, this file plus [`RESULTS.md`](RESULTS.md) are what goes to Roc.

## Config

| Slot | Model | Inlined? |
|---|---|---|
| Narrative Architect | Opus 5 | Yes — full persona card bundled in, zero tool calls |
| Content / Dialogue | Fable 5 | Yes — zero tool calls |
| Consistency Verifier | Sonnet 5 | Yes — zero tool calls |
| QA (light) | Sonnet 5 | Yes — zero tool calls |

Per the 2026-07-25 finding ("handing workers their material instead of making them fetch it cut billed volume 6.9×"), every agent was explicitly told not to use tools and was handed its material directly in the prompt.

## Pre-run — the ▶ Roc decisions (resolved before dispatch)

- **Physical-outcome table for the 5 non-soul receivers** — Claude proposed, Roc confirmed without edits. See [`RESULTS.md`](RESULTS.md) for the table.
- **Cat classification** — creature, not prop: behavioral reaction, no persona card, no dialogue (parallels the existing person-rule: living receivers don't catch).
- **Toby / Ilsa** — full dialogue reaction expected, in-character; **a null line is a legitimate Content output** meaning no reaction, not an error. Roc reviews and vetoes or accepts at the gate — this run does not self-approve.
- **Framing** — explicitly also a stress test of how the pipeline needs to adapt for new magic entries, not only a TA-feedback deliverable.

## Receiver classification (the Orchestrator's first move, before any worker is called)

The routing decision itself is the main "call down, signal up" evidence this run produces — the Orchestrator does not run the same five pipeline steps for every receiver:

| Receiver | Class | Routed to |
|---|---|---|
| Stick, Hedge, Furnace, Bread | Inert prop | Resolved directly by Orchestrator/world logic. **No crew agent touches these.** |
| Cat | Creature, no persona card | Content/Dialogue only (Architect skipped — nothing to pull) → Verifier → QA |
| Toby, Ilsa | Soul, persona card exists | Architect → Content/Dialogue → Verifier → QA (full chain) |

## Call-down / signal-up trail

| # | Call | Direction | Result |
|---|---|---|---|
| 1 | Orchestrator classifies all 7 receivers | — | 3-tier routing above. Props resolved with no agent call (see [`RESULTS.md`](RESULTS.md) outcome table). |
| 2 | Orchestrator → Architect, Toby (Opus 5) | down | `reaction_warranted: yes`. beat_spec: tone `matter_of_fact`, `receiving-flat`, essence_link = `deflection_target`. Card-gap flagged: no axis for attention with no material stake (not gift, not need). |
| 3 | Orchestrator → Architect, Ilsa (Opus 5) | down | `reaction_warranted: yes`. beat_spec: tone `matter_of_fact`, `settled-certainty`, essence_link = `deflection_target` (Placement) + `notice_and_want`. Card-gap flagged: no axis for hostile/testing intent; deflection_target specified only for verbal attention, extending to a physical act is an unlicensed inference. |
| 4 | Orchestrator → Content, cat (Fable 5) | down | `[action]` beat, 33w, first pass. Self-flagged a schema gap: no home for a creature reaction with no card to anchor register. |
| 5 | Orchestrator → Content, Toby (Fable 5) | down | "Fire like that'd do the stove more good." (8w), first pass. Self-flagged: "the stove" is an assumed placeholder, no scene props were supplied. |
| 6 | Orchestrator → Content, Ilsa (Fable 5) | down | "Your place is set beside mine." (6w), first pass, no self-flag. |
| 7 | Orchestrator → Verifier, Toby (Sonnet 5) | down | **PASS WITH FLAGS.** Essence-vs-role flag + ungrounded-prop flag on "the stove" (checks 1, 4b, 7). |
| 8 | Orchestrator → Verifier, Ilsa (Sonnet 5) | down | **PASS WITH FLAGS.** One flag (check 8): causal-implicature risk — a hostile-looking cast immediately followed by an inclusion line reads as earned-by-the-act even though the authored intent is pre-existing disposition. Flagged for review, not rewrite. |
| 9 | Orchestrator → Verifier, cat (Sonnet 5) | down | **PASS WITH FLAGS.** One flag: "licks one shoulder flat **again**" implies a recurring individual tell despite no persona card. Separate note: no action-slot word ceiling exists anywhere in spec. |
| 10 | Orchestrator → Content, Toby, revision 1 (Fable 5) | down | Full-constraint brief (defect + full essence/voice/invariant set + self-check demanded). New line: "Save that for whatever still wants doing." (8w). Self-check: no ungrounded prop, role-independent. |
| 11 | Orchestrator → Content, cat, revision 1 (Fable 5) | down | Full-constraint brief. New beat: drops "again," swaps to "bends to groom its ruffled fur." Self-check: no recurring-identity implication. |
| 12 | Orchestrator → Verifier, re-check both (Sonnet 5) | down | Toby: **PASS WITH FLAGS** — clean on the original two flags, but a new borderline flag on "Save that for" reading curt, and an unconfirmed register question on "wants doing" (dialectal phrasing, no baseline to check against). Cat: **PASS** — generic, no remaining defect; one optional pacing note (fear→groom transition inside one beat). |
| 13 | Orchestrator → QA (Sonnet 5), all 7 | down | Applied its normal checklist to all 7 receivers in one pass. 5 of 7 (stick, hedge, bread, cat, furnace) are state/consumption questions; 2 of 7 (**Toby, Ilsa**) surfaced a **new failure mode the QA checklist has no slot for**: dialogue that implies mechanical consequence (a task, a claimed relationship) with nothing actually backing it. Furnace flagged separately as the one genuine state-machine question in the prop table (fuel consumption, reversibility unspecified). |
| 14 | **Roc's gate** | up | **Open** — this run stops here by design (Roc: "on review i will veto or accept"). Candidate lines and every outstanding flag are compiled in [`RESULTS.md`](RESULTS.md). |

## Flags — complete list

| Source | Item | Type | Resolution |
|---|---|---|---|
| Architect | Toby card | gap — no axis for no-stakes attention (not gift, not need) | Carried to gate, unresolved |
| Architect | Ilsa card | gap — no axis for hostile/testing intent; deflection_target licensed for verbal attention only | Carried to gate, unresolved |
| Verifier | Toby line 1 | essence-vs-role + ungrounded prop ("the stove") | Revision 1 — fixed, re-verified PASS WITH FLAGS (new, smaller flag) |
| Verifier | Toby line 2 (post-revision) | borderline curt read on "Save that for"; unconfirmed dialectal register ("wants doing") | Carried to gate, unresolved — QA agent's read: "PASS but not a clean one" |
| Verifier | Ilsa line | causal-implicature risk (cast-then-inclusion-line adjacency) | Carried to gate as a design judgment call, not a rewrite target |
| Verifier | cat beat 1 | recurring-identity implication ("again") | Revision 1 — fixed, re-verified PASS |
| Content (self-flag) | cat beat | schema gap — no persona-card-equivalent for creatures | Carried to gate as a spec-change candidate |
| Content (self-flag) | Toby line 1 | ungrounded prop, no scene context supplied to an ambient interaction | Same root cause as the Verifier flag above; fixed in revision |
| QA | Toby + Ilsa lines | new failure class: implied mechanical consequence with no backing state | Carried to gate — checklist gap, not a line defect |
| QA | Furnace | state-machine underspecified (fuel consumption? reversible?) | Carried to gate as a canon question |
| QA | Cat | minor — does "flees" mean despawn, if the cat is ever needed again | Carried to gate, low priority |

## Revisions vs the cap (two per item, no reset at the gate)

| Item | Revisions | Cap state |
|---|---|---|
| Toby's line | 1 (prop grounding + essence-vs-role) | 1 remaining |
| Cat's beat | 1 (recurring-identity) | 1 remaining |
| Ilsa's line | 0 | 2 remaining — no revision was attempted; the flag is a design question, not a defect the Content Agent can fix by rewording (Verifier's own words: "flagging for review, not rewrite") |

## Tokens

Every call was zero-tool-call (fully inlined); figures are `subagent_tokens` (footprint) per invocation, the harness-reported measure.

| Agent | Invocations | Footprint per call | Sum |
|---|---|---|---|
| Architect (Opus 5) | 2 | 43,913 / 44,509 | 88,422 |
| Content (Fable 5) | 5 | 42,329 / 43,880 / 43,134 / 43,087 / 42,187 | 214,617 |
| Verifier (Sonnet 5) | 4 | 49,706 / 52,523 / 50,517 / 49,918 | 202,664 |
| QA (Sonnet 5) | 1 | 50,089 | 50,089 |
| **Total** | 12 | | **555,792** |

Cheaper than either the Giver (563,789) or the Kinbound (457,268) proof runs despite covering 7 receivers, not 1 — driven by the 4 props costing zero agent calls, and by only 2 of the 12 invocations being revisions (vs. the Giver's heavier repair cost).

## Spec-change candidates surfaced by this run

This is the actual answer to "how does the pipeline need to adapt for new magic entries" — none of these block Toby/Ilsa/cat's lines from reaching the gate, but each is a real gap the existing schema doesn't cover:

1. **No schema for ambient/reactive content.** Every existing pipeline document (`pipeline.md`, `guardrails.md`, the persona-card and echo-template schemas) is built around *scenes*: delta facts, scene props, a mishap in play. A receiver-reaction to a spell cast anywhere, anytime has none of that — which is exactly what caused Toby's first line to invent an ungrounded prop ("the stove") out of thin air, because the Architect's beat_spec correctly named an essence-level deflection target but nothing supplied a concrete object to deflect onto. **This is a structural gap, not a one-off writing miss** — any future ambient interaction (not just ignite) will hit it the same way.
2. **No creature-reaction schema.** The cat has no persona card and no clear substitute for one. The Content Agent flagged this itself: nothing to anchor register or repeatable behavior against, so a second creature (or the same cat later) has nothing to check consistency against. Proposed shape: a lightweight species-level unit — a few observable-behavior notes per creature type, no voice, no soul fields, distinct from a scene's delta-fact structure and distinct from a full persona_card.
3. **No action-slot word ceiling.** `pipeline.md` step 8 states 40 words for dialogue; `guardrails.md` check 8 states 40 dialogue / 60 object. Action has no stated number. The cat's beat (33w) happened to sit safely under both neighboring caps, so nothing broke this run — but the gap is real and will eventually produce an inconsistent ruling.
4. **QA's checklist has no "implied consequence" check.** The existing checklist (traversability, soft-locks, dead-ends, consumed state) is tuned to catch resources *disappearing*. Toby's and Ilsa's lines both gesture at consequence that isn't backed by any actual state — "whatever still wants doing" (an unnamed task with nothing tracking it) and "your place is set beside mine" (a relational claim with no flag behind it). Neither is a traversal risk; both are a different failure mode: dialogue that over-promises relative to what the system actually does. Worth a new QA check alongside the existing consumed-state one.
5. **Both souls' cards have no axis for no-stakes or hostile-coded attention.** Toby's card explains attention-as-gift (debt) and attention-as-need (a job); it has nothing for attention that is neither, and possibly testing or mocking. Ilsa's `deflection_target` is licensed only for *verbal* attention ("a question about herself"); extending it to a physical act (a spell cast at her body) was an inference the Architect made, not something the card explicitly covers. If more spells get tested against named souls this way, this gap will recur every time.
6. **Furnace's state machine is genuinely new canon, not yet specced.** Does lighting it consume a tracked fuel resource? Is there a way to unlight it, if a later screen ever needs it cold? This is the one prop-table entry QA correctly flagged as a live open question rather than a settled physical-outcome ruling.

## Open

1. ~~**The human gate is where this run stops.**~~ **Ruled, 2026-07-26** — see [`RESULTS.md`](RESULTS.md#gate-ruling--roc-2026-07-26). Cat accepted; Toby overridden to a scene-grounded line ("Save that for the oven"); Ilsa nulled by design; hedge and bread expanded with Roc-authored additions outside the crew.
2. **Spec-change candidates above are unruled.** None block the gate review of the lines themselves; they're separate design decisions about the pipeline's shape. Next discussion topic.
3. **New canon proposed, not yet ratified:** "living receivers (souls and creatures) never catch on ignite — physical outcomes attach only to inert material." Currently stated only in `04-magic-system.md`'s existing person-rule; this run's cat result generalizes it. Should be written into the magic system doc explicitly if ratified. The GDD worked-example table now ships this ruling implicitly; `04-magic-system.md` itself hasn't been touched yet.
