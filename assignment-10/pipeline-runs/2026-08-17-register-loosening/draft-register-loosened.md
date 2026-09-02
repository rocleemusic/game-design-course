# Draft — the loosened register

**Status: draft, uncommitted.** Nothing here has touched `narrative-pipeline/register.md`. This file is the proposed amendment, written so Roc can read the change before it exists. If the test fails, delete this folder and nothing has moved.

Ruled by Roc 2026-08-17: **drop flat affect, keep technique.** New line classes (player intro, gate reactions, final vignettes) are out of scope — deferred to polish.

---

## 1. The tone enum — the cheapest change, and probably the biggest

`pipeline.md` step 8 and `agents/content-dialogue.md` define a **fixed enum of five**:

> quiet · wistful · matter_of_fact · warm · distant

Every one is low-arousal and inward. There is no tone in the vocabulary for delight, sharpness, urgency, mischief, or hurt. A writer handed that list cannot produce a dynamic line, because the palette has no high notes. Shipped v01 content only ever reaches for three of the five.

**This enum is the flat affect, stated as a spec.**

It is **not enforced in the resolver** — `tools/resolver/src/` contains no tone validation. Changing it is a documentation edit with zero Track B cost, which is why it does not fall into the deferred polish bucket.

### Proposed enum — ten values

| Existing (all low-arousal) | Added (the arousal dimension) |
|---|---|
| `quiet` | `delighted` — pleasure that shows |
| `wistful` | `amused` — wry, dry, a joke about a thing |
| `matter_of_fact` | `sharp` — edged, quick, an opinion with a point on it |
| `warm` | `urgent` — pressure and pace, the morning running out |
| `distant` | `stung` — something landed and it showed |

Five in, nothing out. The addition is a single axis: **arousal**. The existing five stay exactly as they are and keep their current meanings.

**`stung` carries a caution.** It is the one that can be used to fake depth. A soul is stung when something lands visibly, not whenever a scene is sad. It does not license self-narration — check 6's no-soul-states-its-own-trait rule is untouched.

---

## 2. What drops from world law to card declaration

These stop being rules everyone obeys and become fields each card sets. **This is a demotion, not a deletion.** A soul with nothing declared falls through to the current tight default, so silence on a card is safe.

| Was world law | Becomes |
|---|---|
| Deflect, do not name. Never confirm a feeling. | `deflection:` on the card |
| Weight is preloaded, never performed. Amplification destroys. | `escalation:` on the card |
| Grief is fragments only. Never write a grief beat as a run-on. | `escalation:` on the card |
| One long run per scene, four licensed reasons | `escalation:` on the card |
| One thought per turn | `cadence:` on the card |

**The mechanism already exists and is proven.** Bex's card carries a hand-written exemption from deflect-not-name — he is the "authored exception" who names feelings plainly. This change does not invent anything. It promotes Bex's one-off exemption into a field every card can set.

That matters for risk: the thing being generalized has already shipped and been gated.

---

## 3. What stays world law

Cut this list and the register stops doing its job.

- **The hard ceilings** — 40 dialogue · 60 action · 60 object · 12 player_line. Walls, not targets.
- **No soul states its own trait.** Effect before definition. The explainer needs standing.
- **Withhold significance, never orientation.** The player always knows why they are here.
- **Plain language, no jargon** (guardrails check 9).
- **A spoken slot must contain speech** (check 8).
- **Action slots carry no interiority, ever.** Observable change only.
- **The action/object slot ratio** — roughly one per three to five dialogue slots. That is the picture problem, not the affect problem, and `register.md` already says no amount of rewriting lines will fix it.
- **Warmth fidelity** (check 6). A soul's warmth never drifts from its card, and cold by accident is still a defect. This guard gets *more* important as the range widens, not less.

---

## 4. Bucket C — Roc's own gate rulings, untouched

`register.md` braids three sources of authority together. Separating them is most of the work of a clean loosening.

- **A — corpus measurements** (median 5–7 words, long-run rates, the grief shape). These describe Frieren. They demote from **targets** to **reference**. They stay in the file, correctly labelled as what a different show measured.
- **B — world design law.** The flat affect. Demoted above.
- **C — Roc's hand-pass rulings.** The offer-stands-alone rule, the five Toby moves, the player-voice amendment. **Not touched.**

Bucket C survives intact because it is not flat-affect law — it is craft, and two items in it actively generate variety. "Let people sound like people" (the discourse-marker finding) and "arranged prose is not speech" both push *against* sameness. Cutting them would work against the goal.

---

## 5. What Frieren is still for

The ruling was *drop flat affect, keep technique*. So the corpus keeps its authority over:

- Silence carrying weight, and the action slot being where silence lives
- Effect before definition
- A payoff that was planted properly needing almost nothing
- The reconciliation rule's question: did the swell land in the picture, or did the words just get bigger?

It loses its authority over how much feeling a soul may show, how loud, and whether a scene may turn.

**On the reconciliation rule:** it says the text stays flat or silent at the exact beat the swell lands. That is flat affect stated at the most important moment. It is flagged here rather than ruled — Roc decides after reading the test.

---

## 6. Knock-ons if this is adopted

1. **`card-lint.mjs`** — `voice_register` caps at 400 words. Three declaration lines per card is ~40 words, so the cap likely holds. Verify before the card pass.
2. **Guardrails check 8** — the 75-word long-run ceiling and its four licensed reasons are written as world law. They read from the card instead.
3. **Guardrails check 6** — unchanged, and load-bearing.
4. **Eight cards** need an emotional-grammar declaration, or they inherit the tight default.
