# Findings — register loosening session, 2026-08-17

**Nothing in the live spec has changed.** `register.md`, `pipeline.md` and `cast/*.md` are untouched. Everything here is drafts and probes in this folder.

**Roc's standing verdict at close of session:** the loosening as specced is *not quite enough to steer correctly*. That verdict is the most important result in this file, and finding 5 is why.

---

## 1. The tone enum is the flat affect, written as a spec

`pipeline.md` step 8 and `agents/content-dialogue.md` fix a **closed enum of five tones**:

> quiet · wistful · matter_of_fact · warm · distant

Every one is low-arousal and inward. There is no word in the vocabulary for delight, sharpness, urgency, mischief, or hurt. Shipped v01 content only ever reaches for three of the five.

A writer handed that list cannot produce a dynamic line. The palette has no high notes.

**It is not enforced in the resolver.** `tools/resolver/src/` contains no tone validation — verified by grep. Expanding it is a documentation edit with zero Track B cost, so it does not belong in the polish bucket the new line classes went into.

Proposed expansion in `draft-register-loosened.md`: keep all five, add `delighted`, `amused`, `sharp`, `urgent`, `stung`. One new axis — arousal.

## 2. The per-soul machinery is not broken

Working theory going in was that the declared bands never reached the generator. **Wrong, and worth recording so nobody re-opens it.**

The cards declare real, distinct bands — 3–8 (Pip, Bex) through 12–25 (Mara). They do reach the generator: `voice_register` is a pinned field, and Mara's carries her band, her tense tell, and her own exemplar lines. `voice_enforcement` is the Verifier-only half, correctly.

The sameness is not a plumbing failure.

## 3. The loosening buys almost nothing

Two probes written at the loosened register, then audited for which lines actually needed the change.

| Probe | Slots | Slots requiring the loosening |
|---|---|---|
| `vignette-probe.md` — Mara on Adren, end of arc | ~14 | **1** (`L-V-5`, seven words) |
| `intro-probe.md` — first meeting, mage clocked | ~15 | **1** (`L-I-2`, the word `delighted`) |

Everything else in both probes is legal under the register **as it stands today**.

And both of those slots need only the **tone enum**. Neither needs the deflection change, the escalation change, or the cadence change.

**The implication is a scope decision.** Tone is a free doc edit. The full loosening is eight card rewrites in the eight days before the 2026-08-25 capstone. On the evidence here, the second is not buying what it costs.

## 4. `register.md` braids three sources of authority

Separating them is most of the work of any clean loosening.

| Source | Examples | Disposition |
|---|---|---|
| **A — corpus measurements** | Median 5–7 words, long-run rates, the grief shape | Demote from *target* to *reference*. They describe Frieren. |
| **B — world design law** | Deflect-not-name, tone-lock, weight-preloaded, grief-never-run-on | The flat affect. Demote to per-card. |
| **C — Roc's own gate rulings** | Offer-stands-alone, the five Toby moves, the player-voice amendment | **Untouched.** Two of these actively generate variety. |

## 5. ★ The steering gap — relationship distance is undeclared

**This is the finding that explains Roc's verdict, and it came out of him rejecting a probe.**

The first `intro-probe` pass had Mara hand a total stranger a job on line one. Roc's note: *"i don't think she would be this way with a stranger."* He was right, and the error is instructive — I was **following the card correctly** and still got it wrong.

Her card says: *"Her welcome is a small imperative. She does not greet and does not offer. She asks you for a hand and puts a job in it. Being enlisted into the tending is how she lets someone in."*

That is her **warmth channel** — how she lets someone in once she has decided about them. It is not her opening move with an unknown person. Nothing on the card says which, because **no card declares how a soul behaves across relationship distance.**

Every card declares how a soul *sounds*. None declares how a soul sounds **to a stranger versus to someone already inside the work.**

The only proximity rule in the whole system is the walk-on band, and that is about the *speaker* being minor — not about the *listener* being unknown.

### Why this matters more than the loosening

The register is a **constraint layer**. It says what not to do. It does not say what this soul does at this moment, which is the thing a generator actually needs.

A rule read without a situation produces a confident wrong answer. That is exactly the failure mode here, and no amount of loosening or tightening the constraints fixes it — the missing information is situational, not permissive.

### What it looks like once declared

Rewritten with proximity in mind, Mara's second pass moves **5–10 words with a stranger, 19–25 once the player is inside the work — inside one scene.** That range *is* the arc of the conversation, and it was available under the card as written. The card just never said the low end was allowed.

Same finding, other direction: a stranger who offers to help gets **refused** (*"No. They want doing right, not doing fast."*). That refusal is what makes the mage branch land. It is completely consistent with her card and nothing on the card would have produced it.

### Proposed shape — not yet drafted

A `proximity:` declaration alongside `deflection:` / `escalation:` / `tone_range:`, stating what the soul does at three distances: **stranger · known · inside the work.** For most souls that is one line. For Mara it is the difference between a scene that turns and a scene that doesn't.

**This is the change most likely to fix what Roc actually reported.** Recommend it is drafted and probed before any card gets the emotional-grammar rewrite.

## 6. The new line classes are cheaper than assumed

Both probes use only `dialogue`, `action`, `object`, `player_line`. Neither needs a resolver change. The vignette is a scene like any other and the only open question is what triggers it.

The `final vignette` and `player intro` classes may not need Track B work at all. Worth checking before that bucket is scoped.

## 7. Technique outperformed permission, in both probes

The strongest beat in each probe is an **action slot with no dialogue in it**.

- Vignette: *"Mara sets the folded lantern in the crate. She does not reach for the next one."*
- Intro: *"She looks at the player properly for the first time. Then back at the line, and at the heap on the bench."*

Both are legal today. Both do work no line could. The corpus finding that silence lives in the action slot survives the loosening completely intact, and it is still the most powerful tool in the register.

---

## Open rulings

1. **Is role-dealing in-fiction?** Decides whether Mara can say *"the mage they dealt us this year"* — much better and much stranger — or has to stay with *"you'll be the new mage."*
2. **How often does the Adren vignette fire?** Once ever, or once per arc. If she opens up every life, the withholding stops meaning anything.
3. **Vignette ending A or B** — defer the finish, or let the tending finish once with a witness. B resolves the arc and cannot be taken back.
4. **Does the intro replace or precede `mara-set-for-two-C1`?** Variant of that scene, or a separate opening.
5. **The reconciliation rule** — it holds the text flat at the exact beat the swell lands. That is flat affect at the most important moment. In scope under "drop flat affect," not yet ruled.
6. **v01 consistency** — regenerate at the new register, or apply to new content only and accept a two-voice capstone build. Standing recommendation: the second.

## Not yet done

- `SORT-TEST.md` is written and unread. The substitution scores are the only quantitative result this run was designed to produce.
- The `proximity:` declaration (finding 5) is not drafted.
- The local-model arm has not run. Setup in `local-model-setup.md`.
