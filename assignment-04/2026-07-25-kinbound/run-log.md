# Run log — the Kinbound (Ilsa), 2026-07-25

Second soul through the stage-2 pipeline. Orchestrator: Claude (Fable 5, main session). Sequence run: Narrative Architect → Content/Dialogue → Consistency Verifier → QA light → Roc's gate. No worker called another; every flag routed up and back down. Approved output: [`ilsa-persona-card.md`](ilsa-persona-card.md).

## Config

| Slot | Model | Effort | Inlined? |
|---|---|---|---|
| Narrative Architect | Opus 5 | session `high`* | Yes — full bundle, zero tool calls |
| Content / Dialogue | Fable 5 | session `high`* | Yes — zero tool calls |
| Consistency Verifier | Sonnet 5 | session `high`* | Yes — zero tool calls |
| QA (light) | Sonnet 5 | session `high`* | Yes — zero tool calls |

\* The Agent tool exposes no per-call effort override, so every worker inherited the session's `high` — against the proof-run config of `xhigh` Architect / `medium` Content. Recorded as an open config deviation; results did not visibly suffer (card passed first attempt).

## Pre-run — the ▶ Roc decisions (resolved before dispatch)

- **suit_tag:** `blood` (Roc).
- **backstory_guideline:** proposed text accepted **with Roc's additions** — in need it was always family that helped; generations held family-first unexamined; the father who gave everything, "that's just what we do — it's what makes the world work."
- **voice_register:** certainty spread + inclusion invariant + wordless-pause flat end, accepted as proposed.
- **Role/scene:** Blacksmith (plot-inert) + family-pressure row 1, accepted as proposed.

## Call-down / signal-up trail

| # | Call | Direction | Result |
|---|---|---|---|
| 1 | Orchestrator → Architect (Opus 5) | down | Full card + echo + delta/canon + 6-slot scene spec, one pass. Field caps held (essence 60w / voice 51w / notice 50w). Orthogonality argued. `arc_turn_bond_gate` recorded sanctioned. Orchestrator noted two items for the Verifier: the `festival_runner` walk-on, and the Mara payoff routing. |
| 2 | Orchestrator → Content (Fable 5) | down | All 6 slots, first pass, dialogue 13–19w. |
| 3 | Orchestrator tell-pass (step 11, mechanical) | — | 1 flag: em-dash in slot 4. |
| 4 | Orchestrator → Verifier (Sonnet 5) | down | Card PASS, echo PASS, facts PASS, 5 of 6 lines PASS. **1 flag:** `register_drift` on slot 2 (causal "so" fuses two clauses — breaks the one-clause dialect). Walk-on runner ruled permissible (no soul invented); Mara usage ruled within her locked store. Noted-not-flagged: the apron seed surface-rhymes with Toby's anticipatory service; held PASS on engine grounds (place-keeping vs debt-cancelling). |
| 5 | Orchestrator → Content, revision 1 (slots 2, 4) | down | Full-constraint brief (defect + all 9 constraints + self-check). Slot 2: clause fusion removed. Slot 4: em-dash removed, trailing weight kept ("That's hands enough, the two of us"). Nothing traded away. |
| 6 | Orchestrator → Verifier, re-verify | down | Both PASS. Zero flags outstanding. |
| 7 | Orchestrator → QA light (Sonnet 5) | down | 1 non-blocking flag: referent lag — slot 3's "yours" resolves only at slot 4's "us." All else PASS. |
| 8 | **Roc's gate, round 1** | up | Lines 1, 4, 5, 6 approved. Roc asked for plain-language explanations (coke price, the echo, the W column, the referent reasoning) before ruling on the rest. |
| 9 | **Roc's gate, round 2** | up | Ruling: sentiment correct, **wording flagged — jargon harms clarity.** Directed: "Price of coal went up a coin this week" (drop coke/per-sack) and the runner names the absent relative: "[name] sent word, they're not coming." The referent-lag question was superseded by the naming ruling. |
| 10 | Orchestrator → Content, gate revision (slots 2, 3) | down | Full-constraint brief. Slot 2 = revision 2 (**cap reached**). Slot 3 = revision 1. Name "Bram" supplied as a proposal, flagged for gate confirmation. Coal phrasing applied to `seed_event` and `delta_world` as gate edits, charged to no worker. |
| 11 | Orchestrator → Verifier, re-verify 2 | down | Both PASS. Bram ruled a licensed identifier, not a third fact; two-fact ceiling holds. Zero flags. |
| 12 | **Roc's gate, round 3** | up | **Bram confirmed. Card, echo, and all six lines approved.** |

## Flags — complete list

| Source | Item | Type | Resolution |
|---|---|---|---|
| Verifier | slot 2 | `register_drift` (clause fusion via "so") | Revision 1 — fixed, re-verified PASS |
| Orchestrator tell-pass | slot 4 | em-dash | Revision 1 — fixed, re-verified PASS |
| QA | slot 3→4 | referent lag (non-blocking) | Superseded — Roc's naming ruling made the referent explicit ("Bram sent word") |
| Roc (gate) | slots 2, 3 + seed_event + delta_world | jargon/clarity | Gate revision — fixed, re-verified PASS, approved |
| Verifier (noted, not flagged) | apron seed | Toby-rhyme observation | Held PASS on engine grounds; carried to the gate for visibility; Roc approved |

## Revisions vs the cap (two per item, no reset at the gate)

| Item | Revisions | Cap state |
|---|---|---|
| slot 2 (ilsa-places-player) | 2 (fusion; coal wording) | **Cap reached** — any further change is Roc's directly |
| slot 3 (runner-no-show) | 1 (Bram naming) | 1 remaining |
| slot 4 (ilsa-absorbs) | 1 (em-dash) | 1 remaining |
| Card / echo / all other slots | 0 | — |
| Architect structural round-trips | 0 | — |

## Tokens

Three measures, never mixed. Every call was zero-tool-call (fully inlined), so **billed ≈ footprint per invocation**; summed invocations are the billed-volume proxy (resumed calls re-bill their prior context). Output tokens were not separately captured by this harness — figures below are `subagent_tokens` (footprint) per invocation.

| Agent | Invocations | Footprint per call | Sum (billed proxy) |
|---|---|---|---|
| Architect (Opus 5) | 1 | 54,521 | 54,521 |
| Content (Fable 5) | 3 | 48,035 / 47,477 / 49,574 | 145,086 |
| Verifier (Sonnet 5) | 3 | 69,183 / 68,086 / 71,050 | 208,319 |
| QA (Sonnet 5) | 1 | 49,342 | 49,342 |
| **Total** | 8 | | **457,268** |

**Against the Giver reference:** Architect 54.5K vs ~51K — in band. First-pass Content + Verifier (48,035 + 69,183 = 117,218) vs the Giver's ~107K per soul-appearance — in band, slightly high (the Verifier carried a larger inlined codex this run). Run cost at one-call-per-agent: **221,081**. Revision/re-verify cost: **236,187** (2 Content + 2 Verifier resumptions) — **52% of the full run**, a large improvement on the Giver's 79%, and two of the four resumption calls were gate-directed wording, not defect repair. Orchestrator cost invisible as ever; all figures are a floor.

## The ten rules — did they hold

1. **Warmth invariance** — held as prevention: shipped on the card with the spread, checked as Verifier sub-item 6c, and no cold line was ever produced. The rule's first run as a *pre-specified* invariant rather than a gate catch.
2. **Seed slot typing** — held: seed specced `action` at generation; zero passes burned (vs 4 on the Giver).
3. **Revision cap** — bound once (slot 2 hit 2). Did not obstruct; the second revision was Roc's own wording direction.
4. **Full-constraint briefs** — used on all revision briefs; **zero silent constraint-trades observed (0/3 vs the Giver's 4/4)**. The mechanism that caused 79% revision cost last run did not recur.
5. **Specify the invariant** — the certainty spread shipped with its warmth invariant; the defect class it guards against never appeared.
6. **Two-fact ceiling** — held; Bram explicitly ruled an identifier, not a third fact.
7. **No player choice** — scene specced without one; never hit.
8. **Brief for concreteness, not shape** — mostly held; two schema-induced shape echoes noted in the homogenisation read (persona-card doc, and handback §8).
9. **`slot_type` + `[action]`** — used throughout; QA found no actor ambiguity.
10. **`age_band` role-side** — held; no essence field references `older`; no unlicensed age terms appeared in any line.

## Open

1. **Effort deviation** — workers ran at session `high`, not the proof-run's per-slot `xhigh`/`medium` (tooling limitation). Decide whether the per-slot efforts matter enough to enforce by other means.
2. **Homogenisation watch-items for soul 3** (from the handback): the `essence_descriptor`'s closing "Against a player who…" contrast sentence and the precision axis's "exact about X / loose about Y" frame are schema-induced shapes now used twice. Vary them deliberately on the next soul or accept them as house style, the same ruling the seed skeleton got on the Giver run.
3. **`festival_runner`** — ruled permissible as a nameless functionary this run; if runners recur, decide whether walk-on functionaries need a codex entry class.
4. **Task 2 still owes** the v5 §6.3 update (Giver entry + stale Kinbound text), now with this card as the Kinbound's canonical entry.
