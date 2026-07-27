# The Kinbound — Ilsa. Approved persona_card + echo

Stage-2 output of the second soul run, 2026-07-25. Produced by the Narrative Architect (Opus 5), lines by Content/Dialogue (Fable 5), verified by the Consistency Verifier (Sonnet 5), QA light (Sonnet 5), **approved by Roc at the human gate** — card, echo, and all six lines. The run trail is [`run-log.md`](run-log.md).

This closes the **§6.3 Kinbound stub** — the last one. Note v5 §6.3 still reads "never changes, and not the player's to resolve" and must be updated in Task 2 to the ratified qualifying arc.

Schemas: [`../../narrative-pipeline/templates/persona-card-schema.md`](../../narrative-pipeline/templates/persona-card-schema.md), [`../../narrative-pipeline/templates/echo-template-schema.md`](../../narrative-pipeline/templates/echo-template-schema.md). Steering layer: [`../../narrative-pipeline/arc-festival-slice.md`](../../narrative-pipeline/arc-festival-slice.md) (Kinbound amendment + family-pressure pool).

> **Status.** Card, echo_template, and all six scene lines are **approved and final** (Roc, 2026-07-25). Zero Verifier flags outstanding. One QA note resolved at the gate (referent lag, superseded by the Bram naming ruling).

---

## persona_card — ilsa

### Essence fields (invariant across reshuffles)

| Field | Value |
|---|---|
| `npc_id` | `ilsa` |
| `name` | Ilsa — name and gender (female) fixed across lives; they do not re-deal |
| `essence_descriptor` | Wants her people gathered where she can see them, and holds that being hers is a fact, not an achievement. Sets places before anyone answers, counts arrivals against a number she never says, and quietly covers a gap so no one notices. Against a player whose bonds must be re-made from nothing, she cannot see a bond as needing keeping. |
| `suit_tag` | `blood` |
| `conviction` | Family above all — loyal to blood, and slow to accept that loyalty runs both ways. No bond state buys this out: bond level moves *whether she notices tending is required*; it never moves *blood first*. |
| `backstory_guideline` | (Roc-authored, verbatim) Grew up in a house where the door was never closed to family and never opened to anyone else. When anyone was in need, it was always family that helped — and generations before her held, unexamined, that family comes first. Watched her father give everything for family even when it cost him; his answer was "that's just what we do — it's what makes the world work." Belonging was never in question and never had to be earned, which is why it never occurred to her that it might need keeping up. |
| `notice_and_want` | Notices the count before the conversation — who is here, who is not, which chair stays empty. Notices anyone standing at an edge and moves them in without asking. Wants the whole of hers in one room, and wants no one to have to remark on who is missing. |
| `authored_exceptions` | `arc_turn_bond_gate` — **sanctioned** (arc doc amendment, 2026-07-25). Her arc-turn echo fires on a **bond level**, not a named deduction. Scope: the arc-turn echo only; all her other echoes obey the deduction rule. In-character reason: nobody in her family ever says the absence out loud and she has no sentence for it either, so there is no deduction available to hold — only how long the player has actually been kept a place can gate the payoff. |

### `trait_axes` — orthogonal

| Axis | Value |
|---|---|
| `deflection_target` | **Placement.** Attention turned on her is moved onto where people are standing or sitting. She answers a question about herself by putting someone somewhere: a chair pulled out, a spot cleared at the bench, "there's room by the door." |
| `precision_profile` | **Exact across long spans, loose across recent ones.** Names lineage, years, and which table this is without hesitating; rounds off what was promised, when, and by whom. Recent commitments blur; three generations do not. |
| `warmth_channel` | **Inclusion.** She assumes you into the group instead of welcoming you into it. The plate is already down before anyone said you were coming, and nobody is told it was set for them. |

**Orthogonality, as argued by the Architect and passed by the Verifier on the first attempt:** placement-deflection does not predict the precision profile — a soul could seat you and then audit you, so her looseness on recent promises is an independent deal (and precisely what lets absence go unexamined). Long-span genealogical precision does not predict inclusion-warmth — exactness about lineage is classically an instrument of *exclusion*. And inclusion-warmth does not predict placement-deflection — Juno includes at full strength and deflects into stories about the people she collected. No axis value predicts another.

### `voice_register`

> World dialect: one clause, plain, confirm facts never feelings, 40-word ceiling absolute. Her signature is grammar, not tempo — arrangements arrive already decided, stated in the flat present. She does not ask where you'll sit. When a given bond visibly fails to hold, she does not sharpen; she runs out of sentence.

**The spread** — `settled-certainty ↔ wordless-pause`, resting ~85% settled. Governs tempo, uptake, and sentence completion only.

- **Settled-certainty pole:** states arrangements as already true. Declarative present, no proposal grammar, no question mark. "You'll sit here." "That's yours."
- **Wordless-pause pole:** not coldness, not curtness — *absence of available language*. She stops mid-arrangement because there is no settled sentence for a bond that didn't hold. The gap is the arc showing. She never fills it with an explanation.
- **INVARIANT (stated with the spread, per the rule the Giver run earned):** certainty is never coldness and never instruction. Warmth is constant at every point on the spread; its channel is **inclusion** — she assumes you into the group, never welcomes you into it. A line where certainty reads bossy, brusque, clipped, or as issuing an order is a **defect**, however well it satisfies "settled."

**Held distinct from Juno** (Found-Family Keeper, also `older`, also gathers people): Juno *chose* everyone at her table and can say so; Ilsa was *born* to hers and has no reason to remark on belonging at all. Same warmth on the surface, opposite engine underneath. A line Ilsa could speak that Juno could speak unchanged is a Verifier flag.

### Role fields (re-dealt each life)

| Field | Value |
|---|---|
| `role_tag` | Blacksmith. Role-goal this life: forge the Lantern Arch centerpiece. **Deliberately plot-inert** — her pressure is family-side (the family-pressure pool), and the role stays out of the way. This soul is the pipeline's proof that a role which does not generate the arc still works. |
| `age_band` | `older` (60s+). Re-dealt each life like the role; nothing essence-side depends on it. |

---

## echo_template — `ilsa_second_apron`

| Field | Value |
|---|---|
| `echo_id` | `ilsa_second_apron` |
| `seed_scene` | `ilsa_forge_centerpiece_week` — Ilsa's yard during festival week; coal up a coin this week, a wasp working the slack tub, centerpiece stock heating. |
| `seed_event` | Coal up a coin this week. Ilsa lays a second apron and tongs at the empty end of the bench, and works around them. *(gate edit: coal phrasing per Roc)* |
| `payoff_scene` | `ilsa_forge_late_festival` — the arch nearly done; the same bench, same wasp, same bench-end. |
| `payoff_condition` | **Bond level** (sanctioned exception `arc_turn_bond_gate`; named as a bond level, not a deduction). Fires only at the tier where Ilsa has begun setting things out *for the player* as a matter of course. |
| `payoff_voice` / `reveal_npc_id` | `mara` — third-party notice using only her carded behavior: she has been keeping the second apron in the drawer of unclaimed objects, and returns it without comment on who it was for. |
| `prerequisite_theme` | World Truth 1 — a bond re-forms as a thing tended, not a thing stored. |
| `The Idea` | The place she keeps for someone *is* the tending, and it only reads as tending once the player has been kept a place too. |
| `shape` | `deferred-gap` |
| `tier` | `hidden` |

**The not-the-job test:**

> An ordinary blacksmith keeps one set at their own bench and puts out a second apron and tongs only once a second pair of hands has actually turned up — not laid out in advance, every day, for someone who does not come, and then hammered around.

**Slot typing:** the seed is planted as **`action`** — she performs it and never mentions it; actor unambiguous. Specced correctly at generation (rule 2, earned by the Giver run, held: zero passes burned on slot typing).

**Bounds held:** the seed reads as an untidy bench for a player who never returns; at payoff the apron is present at the player's end of the bench, so a present object changes meaning — no dump.

---

## delta_rule and canon_flags

**`delta_rule`**

> Every Ilsa scene declares exactly two facts: one `delta_world` and one `delta_personal` — a hard ceiling, not a target, and not raisable by any agent downstream. A fact is a possession, a habit, a price, an arrangement, or a line she does not cross; it is never a feeling, never an interpretation, and never a statement of her stance ("she values family" is bias-tier, not a fact). `delta_world` is public and would be true whoever walked in; `delta_personal` is soul-bound and travels with Ilsa across lives regardless of the seat she is dealt. Quiet beats are exempt from the floor, never from the ceiling. If a scene's beat cannot fit inside two facts, that is a scene-spec defect to fix or surface, never a reason to add a third.

**`canon_flags`**

1. **She is never converted.** The endpoint is *blood is tended*, never *blood is chosen*. Any brief resolving toward chosen-family collapses her into Juno and is rerouted.
2. **The conviction survives.** Her movement qualifies the belief; it does not flip it. "Family above all" is true of her at the end of the arc.
3. **The player is a witness.** No quest step, dialogue option, or scene outcome repairs the family or delivers the absent relative. Ease, never fix.
4. **Pressure is accumulated small absence.** No betrayal set-piece, no dramatic wound, no confrontation scene.
5. **Certainty is warm.** Any line where settled-certainty reads as command, coldness, or brusqueness is a defect regardless of how well it satisfies the spread. Warmth is invariant; channel is inclusion.
6. **The flat end is a pause, not a chill.** She loses the sentence; she does not harden.
7. **Nothing essence-side depends on `older` or on `blacksmith`.** She may be the postman at twenty next life and every essence field must still hold.
8. **She never states her own trait, and no World Truth is spoken in-scene.** Her blood-first stance is bias-tier; it shows as repeated behavior and third-party notice only.
9. **The bond score is host-side.** Never carded, never surfaced, never sub-scored.
10. **Juno separation is load-bearing.** Any interchangeable line between them is a Verifier flag. Same surface warmth, opposite engine.
11. **`arc_turn_bond_gate` is the only bond-gated echo.** Any second bond-gated payoff is drift.
12. **Name and gender do not re-deal.** Ilsa, female, every life.
13. **Bram is a Roc-authored fact (gate, 2026-07-25):** the family member who did not come to the arch raising is named Bram — name only; relation, reason, and backstory deliberately unstated.

---

## Scene — `ilsa_forge_centerpiece_week`

Location: Ilsa's forge and yard. Late afternoon, festival week, second day of arch work. Tone `matter_of_fact`, fixed. `max_words: 40`.

**World Truth served (never stated):** *A bond re-forms across lives as a thing tended, not a memory stored.*

**Pressure in play** (arc doc, family-pressure pool row 1): someone Ilsa counts as family doesn't turn up for a festival task they promised. The Blacksmith's centerpiece work is the plot-inert business the seed hides inside. The player's part is witness/ease — the scene does not resolve, repair, or explain the no-show.

**Declared facts (ceiling two)**

| Slot | Fact |
|---|---|
| `delta_world` | The Lantern Arch centerpiece is being forged in Ilsa's yard, and the price of coal is up a coin this week. |
| `delta_personal` | Ilsa keeps a second apron and tongs laid out at the empty end of her bench. |

### Approved lines

| # | Speaker | Type | Line | W | Position |
|---|---|---|---|---|---|
| 1 | ilsa | action | **[action]** Ilsa waves a wasp off the slack tub, lays a second apron and tongs at the bench's empty end, and works around them while the centerpiece stock heats. *(echo_flag: true)* | 29 | settled-certainty |
| 2 | ilsa | dialogue | You're on the bellows. Price of coal went up a coin this week. We waste none of it. | 18 | settled-certainty |
| 3 | festival_runner | dialogue | Arch raising's short a pair of hands. Bram sent word. Not coming. | 12 | third-party |
| 4 | ilsa | dialogue | Put us down for it, then. That's hands enough, the two of us. | 13 | settled-certainty |
| 5 | ilsa | action | **[action]** Ilsa reaches toward the empty end of the bench, stops partway, and turns the stock in the fire. | 18 | wordless-pause |
| 6 | — | object | **[object]** The second apron lies at the empty end of the bench, tongs beside it. The wasp is back at the rim of the slack tub. | 25 | — |

**`speaker_intent`** (dialogue slots)

- **2** — Slots the player into work that was already allocated to them; the coal price is stated as plain fact, not reason, and the inclusion itself goes unremarked.
- **3** — Passing along a roster change so the tally sheet can be corrected; wants an answer for the sheet, nothing more.
- **4** — Closes the gap by arrangement; treats the player's help as already given, and the sheet as the only thing that changed.

**How the arc shows without being said:** line 4 is the essence working — the gap covered by arrangement so no one has to notice it, the player assumed in rather than asked. Line 5 is the only beat the belief's qualification gets: she reaches toward the place she keeps for Bram, and the reach doesn't finish. No line follows. The absence of language is the wound landing at the size the arc doc requires — accumulated small absence, not a set-piece.

**Distinct from Toby by engine, visible in the lines:** Toby's signature is tempo with an outward/receiving asymmetry (16–17 words out, 7 receiving); Ilsa's is grammar, uniform flat declaratives with the arc carried by an unfinished *motion* rather than a shortened *line*. Toby converts gifts to debts; Ilsa converts absences to arrangements.

---

## Cross-life canon store

Fields 1–13 of `canon_flags` persist across reshuffles. The essence, the conviction, the recognition hook (always gathers people to a table), the laid-out second place, and the count-before-the-conversation habit travel with `ilsa`, never with the forge.
