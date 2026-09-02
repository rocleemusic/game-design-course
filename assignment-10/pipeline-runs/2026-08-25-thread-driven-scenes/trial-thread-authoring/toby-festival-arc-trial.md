# Trial — Toby's festival-arc thread, authored blind by two engines

Both engines got the identical brief: Toby's essence fields, the arc doc's Baker
mishap pool, and `thread-registry-schema.md`'s slot-a rules + five tests.
Neither saw `cast/toby-baker-threads.md` — the real ratified answer below was
pulled in afterward, for comparison only.

## A — Claude (general-purpose agent, blind)

| Thread | The open question | Moves when | Action / conflict | Type | Reveals | Status |
|---|---|---|---|---|---|---|
| `toby-feast-shortfall` | Can Toby let the town's help actually count, or does every offering he accepts get quietly converted into a debt he owes back? | He takes a specific offered contribution (flour, hands, a finished batch) and lets it stand unrepaid, at least for a scene, without manufacturing an equivalent task to even the ledger. | The dough falls short for the turnout and neighbors start showing up with their own flour and time before he's asked for it — Toby tries to clock what each contribution cost so he can match it back before the ovens are even lit, and someone has to physically stop him from running off mid-prep to "make it even." | situation | That his anticipatory warmth only runs one direction — he can supply what a room is short of, but the same silent giving aimed at him reads as a debt, not a gift, because a gift with no string attached has nowhere to file. | CANDIDATE |

## B — gemma4-26b-fiction-bf16 (Q4_K_M, `--moecpu 999`, blind)

| Thread | The open question | Moves when | Action / conflict | Type | Reveals | Status |
|---|---|---|---|---|---|---|
| `toby-feast-needs-many` | the Baker's feast can't be finished alone | a shortage is announced to the crowd | a guest offers a handful of yeast or a sack of flour and Toby must accept the debt of the contribution | situation | the fear that being needed is the only way to be accepted | CANDIDATE |

## C — Real ratified answer (`cast/toby-baker-threads.md`, main thread)

| Thread | The open question | Moves when | Action / conflict | Type | Reveals | Status |
|---|---|---|---|---|---|---|
| `toby-feast-short` | Can the feast be finished at all? | The shortfall changes state: dough flat → starter begged → twelve down from forty → holds | The shortfall lands in front of the player in a new state each visit — dough flat, forty loaves short, festival night fixed — and he converts it to arithmetic and a next step, putting a job (the starter, a tray, an order run) in the player's hands before the distress can register | situation | `role_tag` · `precision_profile` exact half · `deflection_target` (distress rerouted into arithmetic) · tempo | **RATIFIED — main thread** |

---

## Read against the schema's own tests

**A (Claude).** Passes the open-question test — it's a real question, not a
restated goal. The action escalates and is physical (neighbors arriving,
someone physically stopping him). `Reveals` opens a facet the real ratified
row doesn't state this way: the *directionality* of the warmth channel —
outward is generosity, the same thing inbound reads as debt. That's a
genuinely distinct angle from C's `precision_profile`/tempo framing, not a
restatement.

**B (26B).** Weaker against three of the five tests. The "open question"
column is just the schema's own exception-phrase example ("the Baker's feast
can't be finished alone") copied in as if it were the question — it isn't a
question, and it's the literal example text from the brief, not an authored
one. `Moves when` is thin — "a shortage is announced" isn't a state change,
it's a one-time event. And `Reveals` — "the fear that being needed is the
only way to be accepted" — restates `primal_seed` ("I have value when I am
needed") almost verbatim rather than opening a *different* facet, which is
what test 3 asks for. It reads as a rough first-pass sketch, not gate-ready
structural work.

**C (real, ratified).** For reference. Note it also folds in three
escalating states (dough flat → starter begged → twelve short) that neither
blind candidate reached — that shape is closer to what the arc doc's mishap
pool actually offers (four rows, a state progression), and neither engine
used more than one mishap-pool row.

## What this suggests for the plan

One data point, not a verdict — but it lines up with the existing finding in
`gdd/11-ai-agents-and-pipeline.md` ("the structure slot needs the stronger
model — the cheaper one produced a card whose personality axes were not
independent"). Local-model thread-*authoring* (Architect-tier structural
work) looks weaker than local-model line-level *prose* (which tested clean
across two rounds). Worth deciding before the big run: do local models
author threads at all, or is thread material read from what's already
ratified (Toby/Ilsa/Mara already have full ratified sets) and local models
kept to what they tested well on — scene prose, staged from those threads?
