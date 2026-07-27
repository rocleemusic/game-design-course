# The Giver — Toby. Approved persona_card + echo

Stage-2 output of the Phase 2 demo run, 2026-07-25. Produced by the Narrative Architect (Opus 5), verified by the Consistency Verifier (Sonnet 5), **approved by Roc at the human gate**. The run trail is [`run-log.md`](run-log.md); Phase 1's benchmark is [`RESULTS.md`](RESULTS.md).

This closes the **§6.3 Giver stub** and feeds Task 2.

Schemas: [`../../narrative-pipeline/templates/persona-card-schema.md`](../../narrative-pipeline/templates/persona-card-schema.md), [`../../narrative-pipeline/templates/echo-template-schema.md`](../../narrative-pipeline/templates/echo-template-schema.md). Steering layer: [`../../narrative-pipeline/arc-festival-slice.md`](../../narrative-pipeline/arc-festival-slice.md).

> **Status.** The card and the echo_template are **approved and final**. Four of the scene's dialogue lines are approved. Two items remain open and are recorded at the foot of this file — they do not block the card.

---

## persona_card — toby

### Essence fields (invariant across reshuffles)

| Field | Value |
|---|---|
| `npc_id` | `toby` |
| `name` | Toby |
| `essence_descriptor` | Wants to be kept, and believes keeping must be earned. Manufactures need for himself: sees how everyone in a room connects, supplies what each is short of before asking, and converts anything given to him into a debt he pays back. Against a player who moves through lives taking nothing with him, Toby cannot hold what is offered. |
| `suit_tag` | `giving` |
| `conviction` | He will not accept care he has not paid for. |
| `backstory_guideline` | Large family, attention always short. Learned that being useful got him noticed, so usefulness became the price of a place. |
| `notice_and_want` | Notices who is short of what and who is not talking to whom — the whole web, live, without being told. Wants to be the piece the web cannot be missing. Reads an unrepaid gift as a standing debt, and a thank-you as a bill. |
| `authored_exceptions` | `null` — not a sanctioned rule-break |

### `trait_axes` — orthogonal

| Axis | Value |
|---|---|
| `deflection_target` | The unfinished task in the room — turns any attention on himself into a job that still needs doing. |
| `precision_profile` | Exact about other people's quantities, timings and shortfalls; vague about his own (what he ate, slept, is owed). |
| `warmth_channel` | Anticipation — supplies the thing before it is asked for, and never names why. |

**Orthogonality, as argued by the Architect and passed by the Verifier on the first attempt:** deflecting to tasks does not require exactness, since a sloppy soul can deflect the same way; exactness about others' quantities does not imply warmth, since it can serve a ledger-keeper; and anticipatory warmth can exist without either. No axis value predicts another.

*This is the check that disqualified the cheaper Architect config in Phase 1, where two axes both encoded "he goes blank on his own needs."*

### `voice_register`

> World dialect: one clause, plain, deflect not name, 40-word ceiling absolute. His signature is tempo, never length — fastest to answer, first to offer, questions aimed outward. The animation is a learned trick and runs hottest when he owes. When attention turns back on him he goes flat and short. Verbose equals defect.

**The spread.** Toby sits at roughly **70% animated** on a monotone↔animated scale. Three properties, all load-bearing:

- **A trained skill, not a temperament.** It is the thing that worked in a crowded household, and it runs fastest when he is most in debt.
- **Tempo and uptake, never word count.** Fast to answer, quick to offer, questions pointed outward. The one-clause preference and the 40-word ceiling bind absolutely.
- **The asymmetry.** Animated when attention points outward; **flat and short when attention turns back on him.** A Toby line that stays animated while *receiving* care is a defect.

**Amendment earned by this run — warmth is invariant across the spread.** The spread governs **tempo and uptake only.** Warmth is not on that scale: it is a constant, and its channel is fixed as anticipation. A receiving-flat line that reads brusque, clipped, dismissive, transactional or irritated is a **defect**, even though it satisfies "flat and short." This was not specified in Phase 2's seed, the Architect encoded the spread correctly without it, the Verifier passed all four spread sub-checks, and the resulting line was still cold. Only the human gate caught it. See the proposed guardrail in [`run-log.md`](run-log.md).

**Held distinct from the Content Server**, who hums while working and is genuinely at peace being needed. Same warmth on the surface, opposite engine underneath. A line Toby could speak that an at-peace soul could speak unchanged is a Verifier flag, and this test caught two defects during the run.

### Role fields (re-dealt each life)

| Field | Value |
|---|---|
| `role_tag` | Baker. Role-goal this life: the communal feast. |
| `age_band` | `young` (late teens – late 20s). Re-dealt each life like the role. Three bands — `young` / `middle` / `older` — all deliberately role-capable, so the re-deal can never hand a soul an age that makes its role implausible (v5 §6.3). |

Per the arc doc, every Baker mishap tilts toward the Giver having to receive — the role-goal manufactures the tension the arc pays off. The essence must read true when he is dealt the postman next life.

---

## echo_template — `toby-unopened-jam`

| Field | Value |
|---|---|
| `echo_id` | `toby-unopened-jam` |
| `seed_scene` | Toby's bakery kitchen, morning, festival week — planted between a wasp at the window and the price of a sack of flour. |
| `seed_event` | A neighbor leaves jam on the step as thanks. Toby shelves it unopened and slips two extra rolls into her next order. |
| `payoff_scene` | Festival night, the communal feast, once the tables are already served. |
| `payoff_condition` | Knowledge flag `toby_repays_every_gift` — set only when the player has given Toby something with nothing owed on it and then named the unopened shelf back to him. |
| `payoff_voice` / `reveal_npc_id` | `toby` |
| `prerequisite_theme` | Belonging as something earned versus something given. |
| `The Idea` | Show that Toby cannot let a gift stay a gift, so that later, when he keeps one, the change is visible without anyone saying it. |
| `shape` | `deferred-gap` |
| `tier` | `mid` |

**The not-the-job test — the reason this seed replaced the stool.**

> An ordinary baker eats the jam or puts it on the counter; nobody trades a free jar into unbilled goods to cancel the thanks.

Phase 1's seed had Toby drag a stool to the flour table, then put it back and work standing. Two independent Verifier passes flagged it: refusing a seat reads as ordinary baker practicality, so **the role explained away the essence it was meant to seed.** The replacement passed the test on first generation and on every subsequent pass, including one where the Verifier was explicitly instructed not to pass it merely because it was a fix.

**Slot typing — a rule this run discovered.** The seed is planted as **scene business, not dialogue.** A seed whose content is an act the soul performs *and does not mention* cannot be carried by a spoken line: it becomes stage direction or self-narration, both banned. Four Content passes failed on exactly this before the slot type was corrected. The Mara worked example already plants its seed this way; the schema does not yet say so.

**As planted** (`toby-dough-seed`, scene_business, 25 words, `echo_flag: true`):

> **[action]** A wasp at the window; flour up two coppers a sack. Toby shelves a neighbor's jam unopened, adds two rolls to her order, mentions neither.

**Rendering convention (Roc, 2026-07-25):** every non-dialogue slot is prefaced **`[action]`** wherever content is shown for review. Without it a scene-business line reads as spoken text — which it is not, and which caused a misread at the gate. The prefix is a *review-render* convention: the data carries `slot_type`, and `[action]` is how a non-dialogue slot is displayed in run-logs, cards, and review docs. Whether it also appears in-game is a UI decision, not a content one.

Passed 6 of 7 checks — actor unambiguous, unopened intact, cover independent of the seed, recognisable at payoff, matches the approved template, still legible as a gift rather than stock. One open flag, below.

---

## delta_rule and canon_flags

**`delta_rule`** — amended twice during the run; final state carries an open governance flag.

> Every delta scene must add at least one new fact and may add at most three: one new world fact and up to two new personal facts, in the same scene where possible; a fact is a possession, a habit, or a line not crossed, never a feeling, so "the player feels closer" fills no slot. A delta scene that restates or paraphrases an already-delivered fact is rejected and re-cut, with no exceptions. The quiet beat is a separate scheduled unit type carrying no fact slots and is not subject to the floor; it is authored on purpose as the breathing room later recognition needs, never a gap to fill.

**`canon_flags`**

1. Toby's essence, conviction, and recognition hook are locked and never drift, whatever role he is dealt.
2. Essence is fixed, role is re-dealt: no Toby trait may be phrased or justified in baker terms.
3. Facts bound to `toby`'s ID travel with the soul across lives; they never attach to the bakery or to whoever holds the role next.
4. Toby's warmth is anticipatory and debt-driven — it must never be writable as the Content Server's at-peace warmth.
5. Toby's animation is outward-facing only; he goes flat and short while receiving. *(Warmth stays constant — see the amendment above.)*
6. No World Truth is ever stated in-scene; no scene grants Toby a "fix" as a quest reward.
7. No new facts may be attributed to Mara, the Content Server, the Kinbound, or any other soul beyond their locked store.
8. The 40-word ceiling and one-clause preference bind absolutely, tightest at payoffs; amplification is visual or sonic, never verbal.
9. Bond state lives host-side, never on a card, never surfaced.

---

## Scene — `bakery-feast-dough`

Location: Toby's bakery kitchen. Morning, festival week. Tone `matter_of_fact`, fixed. `max_words: 40`.

**World Truth served (never stated):** *Belonging is not only earned — a person can be claimed unearned, and being claimed is not a debt.*

**Mishap in play** (arc doc, per-occupation pool): the feast dough went flat, not enough for the turnout. The arc doc marks this row as the **receive-beat** — verb hook Collect/Converse, and Toby must accept help.

**Declared facts**

| Slot | Fact |
|---|---|
| `delta_world` | The feast dough went flat; forty loaves short if the square turns out, and festival night is fixed. |
| `delta_personal_1` | Toby keeps a shelf of thank-you gifts he has never opened, and repays each one in goods. |
| `delta_personal_2` | Toby refilled the player's water flask and set it by the door before the player woke; a standing habit, done for whoever is in his kitchen. |

### Approved lines

| # | Speaker | Line | W | Position |
|---|---|---|---|---|
| 01 | toby | Dough went flat overnight. Forty loaves short if the whole square turns out. Pass me the starter. | 17 | outward-animated |
| 02 | toby | Smith's out of salt; tuck a measure in with his loaves and call it bakery weight. | 16 | outward-animated |
| 05 | toby | You haven't eaten. Roll's on the board. | 7 | receiving-flat |
| 06 | juno | That boy has never once let me carry my own basket. | 11 | third-party |

**`speaker_intent`**

- **01** — Shortfall converted to arithmetic and a next step; distress rerouted into logistics before it can register.
- **02** — Supplies a shortfall nobody named and mislabels the gift as routine measure so no thanks can ever attach.
- **05** — Reverses the direction of the gift; help offered to him comes back as him supplying the helper.
- **06** — Mild observation of a pattern; no idea what it costs him.

**The asymmetry is visible in word count alone:** outward lines 16–17, receiving lines 7. Line 05 is the clearest instance — the player offers again and he answers by feeding them, so the offer is reversed before it can land.

Line 02 carries the recognition hook (*always the one who sees how people connect*) as behavior, and forecloses the debt in the same clause — "call it bakery weight" is the move that makes a gift unrepayable. Line 06 is third-party notice, which is how the register confirms character without any soul stating its own trait.

**Dropped:** line 03. Its only job was carrying the echo seed; the seed moved to scene business, so the slot had no remaining job. Orchestrator call, reversible.

---

## Open — does not block the card

1. **Line 04, the receive-beat — not approved.** Four versions, all flagged. The bind is structural: foreclosing an offer requires already having done the thing offered; the thing offered is feast help; anything pre-empting feast help reduces the deficit; the deficit must stay open. Routes under consideration are recorded in [`run-log.md`](run-log.md). This is the beat the Giver arc turns on, so it is the highest-priority open item.
2. **The seed's sentence skeleton.** Flagged `register_drift` — `[Name] [act 1], [act 2], [withholding clause]` is structurally the Mara worked example's shape with different nouns. Whether that is the shared world dialect (fine) or this soul's signature colliding with another's (invariant 6) is unruled. Ruling on it sets the pattern for the remaining seven seeds.
3. **`delta_rule`'s raised ceiling.** Went from two facts to three in the same pass that needed one more slot. Logically sound; flagged by the Verifier as the rule bending to fit content rather than governing it. Review before it propagates.
4. **QA's non-blocking flag — RESOLVED (Roc, 2026-07-25).** Proper nouns without an in-scene referent on a first visit are **left to the player to infer.** Not blocking, no change. Consistent with the register: withhold significance, never orientation.
5. **"That boy" (line 06) — RESOLVED (Roc, 2026-07-25), and it earned a schema change.** The phrase is licensed **if the speaker is older than Toby**. Line 06 stands, with its speaker fixed as **Juno** — the Found-Family Keeper, `age_band: older` — rather than an anonymous villager. Juno earns the line twice over: she is already in the cast, so it costs no walk-on, and a woman who collects strays noticing a young man who will not be looked after is the observation landing on exactly the right person. Toby's `age_band` this life is **`young`**.

   **The real finding: NPCs have no age in the spec at all.** That is why the Content Agent reached for "that boy" unlicensed and why no Verifier check caught it. Age is now a required field — and it sits on the **role side, re-dealt each life**, exactly like the job. A soul is a pattern, not a station; it is also not an age. Nothing on the essence side may depend on it, so a "youthful" or "world-weary" trait would be an essence-vs-role defect.

   Age is load-bearing for **inter-relationships**: who defers to whom, who is addressed as "boy" or "sir", who mentors, and which pairings the reshuffle makes newly strange when a soul who was elder last life is dealt a child this one. Spec change 10.

## Downstream

**Task 2 — v5 §6.3.** This card is the Giver's canonical entry. Note that §6.3 is also stale on the **Kinbound**, which still reads "never changes, and not the player's to resolve" against the ratified amendment in [`../../narrative-pipeline/arc-festival-slice.md`](../../narrative-pipeline/arc-festival-slice.md). Both corrections land in the same pass.

**Cross-life canon store.** Fields 1–9 of `canon_flags` are what persists across reshuffles. The essence, the conviction, the recognition hook, the shelf of unopened gifts and the flask habit travel with `toby`, never with the bakery.
