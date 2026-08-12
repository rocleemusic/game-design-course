# Cohesion Guardrails

The Consistency Verifier (see [`../gdd/11-ai-agents-and-pipeline.md`](../gdd/11-ai-agents-and-pipeline.md)) checks a finite, locked list, written before the first card exists — "consistent" has no definition until it does (dev-crew-architecture.md). The Verifier checks structure: facts, boundaries, grammar. Whether a line lands or feels right is the human gate's call (`review.md`), because judging resonance is measuring it — that boundary holds for every check below. Authored exceptions are marked on the card, so a sanctioned rule-break is never a flag. The Verifier flags. It never rewrites.

Each check states the rule and its flag conditions. Design rationale lives where cited — mostly `pipeline.md` and the GDD — not here.

**Check numbers are permanent IDs** (referenced from code, schemas, and role prompts). New checks append to the end; a retired check keeps its number, marked retired. Never renumber.

*(Rewritten plain and deduplicated 2026-08-02. Every rule, citation, and dated ruling preserved.)*

1. **Essence vs role.** An essence_descriptor, card note, or line that phrases a trait in role terms is flagged. "Gruff blacksmith" is a defect: the blacksmith may be the postman next life, and the essence must read true either way (creating-strong-characters.md). Highest stakes in the pipeline: if a role ever stands in for an essence, the winnable deduction quietly breaks.

2. **Superposition.** The essence side is fact: assertable, confirmable at a threshold, revisable. The bond side is emergent: hidden, accreted, one of several endings. Bond never gates an essence fact; a confirmed essence never adds bond. [`../gdd/06-world-and-progression.md`](../gdd/06-world-and-progression.md) sets this; the check enforces it.

   The bond is one hidden number fed by a scoring function — the full model is `pipeline.md` step 9. Flagged: a second stored bond-number per soul, any per-category score kept as state (Trust, Intimacy, Recognition, and Respect weight the single delta; they are never persisted dimensions), and card traits that accrue instead of acting as coefficients. That is the quantified-emotion model this pipeline refuses (neverendingquest-ai-dm-architecture.md, its Companion Memory Core, is the running example; the same flatten-into-numbers failure is named in `../knowledge-base/narrative/primal-world-beliefs-npc-lens.md`).

   The same no-accrual rule covers choices (`templates/choice-node-schema.md`): repeated selection of an option accumulates nothing. The `state_actions` enum contains no counter type, so the real vectors are misuse of the legal ones. Flagged on sight: a `knowledge_flag` used as a tally (`helped_toby_3`), a `thread_move` ladder that advances per identical pick, and a per-pick `bond_event` pattern that makes one option's repetition threshold-bearing.

3. **Delta.** Three different things move a scene, and they are rationed differently. **(Ruled 2026-08-03 — Roc.)**

   **Situation** (`delta_situation`) is what the scene is dealing with: the dough went flat, coal is up a coin, the centerpiece is being forged in her yard. It is public, it would be true whoever walked in, and it is what pushes the story forward. **It is not counted and not capped.** A scene needs its situation, and situation is the cover the cast facts arrive under — a scene whose only job is exposition is the failure mode, so removing the cover is not a saving.

   **Cast facts** (`delta_cast`) are the rationed thing. A cast fact is a possession, a habit, or a line a soul does not cross. It is soul-bound and travels with the soul across lives, never with the vacated seat. It is never a feeling, never an interpretation, and never a statement of stance — "she values family" is bias-tier, not a fact, and "the player feels closer" fills no slot.

   **Relational facts** (`delta_relational`) are the third type, and they are **not cast facts**. A relational fact is true only because these two are in the room: a debt between them, a subject they route around, who defers to whom. It is bound to the pair, not to either soul, so **it does not travel across lives** — the reshuffle re-deals the pairing, which is why the arc doc's conflict table is keyed to stances and not to named souls. A cast fact travels; a relational fact re-keys. That is the whole reason it needs its own type. **One per scene.**

   **Floor: one.** Every delta scene adds at least one new thing: a cast fact, a situation, or a relational fact.

   **Ceilings.**

   | Scene | Cast facts | Relational |
   |---|---|---|
   | One cast member | 2 | — |
   | Two or more cast members | **1 per cast member present** | 1 |

   Three or more cast facts in a solo scene is a flag, and the Architect may not raise the ceiling to fit its own content; a request to exceed it surfaces to the human gate as a decision. A scene that cannot fit its beat inside its ceiling is a scene-spec problem, not a ceiling problem.

   **The shared-scene rule is a trade, not a bonus.** A solo scene goes deep on one soul with two facts. A shared scene goes broad: one fact each, plus the relational. Co-presence buys the pairing and costs depth. It is never a way to move more cast facts past the ceiling.

   **No cast member is a prop.** Each soul's fact must feed one of **that soul's own** threads, because you cannot know which soul the player is actually following — either could be the primary. A second soul who is present only to make the first one's beat land is a flag. Walk-ons are the exception and are the reason the walk-on codex class exists: they carry business, no card, no thread, and no facts.

   **Reference is free, and this is a slot rule, not a text rule.** Any established cast fact or situation may be spoken about, acted on, worked around, or built on in any later scene, as often as the story needs. None of that is a delta, and none of it is flagged — it is how threads stay connected, and the arc doc's thread table depends on it.

   What is flagged is a **delta slot holding something already delivered and unchanged**. The slot is the declaration of what this scene adds, so filling it with old news means the scene adds nothing while still spending a beat. That is a **structural** flag: it routes up through the Orchestrator to the Architect to be **re-specced, not down to Content to be re-worded** (`pipeline.md` step 13), and it spends one of the two revisions on the cap.

   **Situation is stateful.** Dough went flat → starter begged off a neighbour → still twelve short with the square filling is three situations, not one restated three times. Each state change is a new `delta_situation`, and situation is uncapped precisely so a thread can advance as often as the story wants it to. This is also what the arc doc means by "move means new information, not resolution": a thread moves when the situation changes state or a cast fact lands, and stays warm by being referenced in between. A scene that only references and changes nothing has not moved its thread — that is not a flag, just a scene doing something else.

   **Cosmetic movement is a human-gate call, not a check (ruled 2026-08-03 — Roc).** "Still short of flour" re-declared as "flour is still short" is a defect, but any threshold for how much change counts as a new state would be arbitrary, and the Verifier cannot measure it. It surfaces at the gate.

   A quiet beat carries no slots at all; it is exempt from the floor, not from the ceiling.

   *This count replaced an earlier "one WORLD fact + one PERSONAL fact" form that rationed the wrong thing; the history is in [`register-audit.md`](register-audit.md).*

4. **Knowledge travels.** A fact learned in one scene or one life persists correctly into the next: soul-bound facts move with the soul, never with the vacated seat (side-characters-to-worldbuild.md). The check reads against the NPC codex — the universal registry of souls and their locked facts, each entry recording its origin arc, built at Intake (`pipeline.md` step 2, which defines it; the file is [`npc-codex.md`](npc-codex.md), real as of 2026-08-09) — so no worker invents or contradicts a soul, and each fact stays indexed to the places and threads it touches. Declared inventions are check 12's territory; this check owns contradiction and invention in undeclared prose.

5. **Feedback vs motive.** The feedback to a player action is specific and teaching; a wrong deduction attempt still yields something usable (narrative-deduction-mechanics.md). The soul's motive stays open. Spelling out the inner life is a flag. Vague feedback is also a flag (emergent-storytelling-the-sims.md).

6. **Voice register.** Three separate line items, never collapsed: does the line obey the shared world dialect (short, deflecting, wrong-register); do its deflection, precision, and warmth match this soul's card and no other's (voice-style-guide.md); and **is warmth intact**. The register itself is in `register.md`.

   **Read the checkable half from `voice_enforcement` (added 2026-08-08).** The card's voice is split in two: `voice_register` is in-voice prose pinned into every generation call, and `voice_enforcement` holds the length band, warmth temperature, sanctioned breaks and failure modes this check tests against (`templates/persona-card-schema.md`). Where a check below says "the card declares" a band or a temperature, the value lives in `voice_enforcement`. The Verifier reads both fields; the Content Agent is only ever given the first. That is the point of the split — verdict vocabulary in a generator's context teaches it to write for the checker.

   **"Short" does not apply to a marked long run** (added 2026-08-06). A `dialogue` item carrying the scene's sanctioned-run mark is exempt from the dialect item's "short" clause and is checked against check 8's 75-word ceiling instead. The other two items — card match and warmth intact — **still bind**: a long run is still this soul's voice and is still warm.

   **A walk-on is not checked against a soul's card, because it has none** (added 2026-08-06). Walk-ons take the walk-on band in `register.md` — looser and warmer than the deep souls' baseline. A walk-on written in a carded soul's clipped, deflecting register is a flag: that guardedness is `deflection_target` and `conviction`, which a walk-on does not have. See GP-117.

   **Warmth fidelity (loosened 2026-07-29 — warmth is per-card, not universal).** Each card may set its soul's warmth temperature and natural length band (`register.md`). The check is that a line matches **this card's** settings — cool is legal only where the card declares it. Where a card sets a register *spread* (e.g. monotone↔animated), the spread governs **tempo and uptake only**. Two flags: a flat-end line that reads brusque, clipped, dismissive, transactional, or irritated without the card licensing it — even though it satisfies "flat and short" — and a flat line indistinguishable from a soul who is genuinely at peace: same surface, wrong engine. The human gate found this on 2026-07-25, after both the Architect and the Verifier encoded the spread correctly and still produced a cold line — because nobody had stated what the spread does *not* govern.

7. **Fact tier vs bias tier.** Locked canon and confirmed essence are fact-tier. A soul's stance on a World Truth is bias-tier: partial, slanted, allowed to contradict another soul's. A line that promotes a bias-tier stance to stated fact, or states a World Truth outright, is flagged. Each batch must serve its assigned truth without saying it (npcs-with-agency-80-days.md; D&D arc doc: World Truths).

8. **Slot typing.** Every content item declares a `slot_type`: `dialogue`, `action`, `object`, or `player_line`. A `player_line` is player speech inside a choice option: it requires `choice_id` + `option_id`, its ceiling is 12 words, and its register is the player entry in `register.md`. A `player_line` whose `choice_id` points at a node with no matching option, or an option whose `player_line` slot is never filled, is a structural flag for QA's walk.

   **A spoken slot must contain speech** — `dialogue` and `player_line` both. Third-person narration inside a spoken slot is flagged, whether it reads as stage direction or as a soul narrating itself (no soul states its own trait, check 6). **A seed whose content is an act the soul performs and does not mention cannot be carried by a `dialogue` slot at all** — it has no legal spoken rendering and must be planted as `action`. Word ceilings key off the type: 40 dialogue, 60 action, 60 object, 12 player_line.

   **The sanctioned long run — ruled by Roc 2026-08-06, ceiling 75 words.** A `dialogue` slot may exceed 40 words, up to **75**, when it is marked as the scene's single sanctioned long run. **The mark lives on the content item, not the card.** That is the point of it: a long run is a one-off for one scene, and the card-level `authored_exceptions` hatch only covers a soul that is *always* long. Without an item-level mark there is no way to sanction a one-off, and this check rejects the register's own rule.
   - **One marked run per scene, maximum.** A second is a flag.
   - **What it may carry**, in the source's observed order: exposition an explainer with standing is delivering; instruction; a confession *answering a question*. A soul whose card declares run-on as its standing register is the fourth case and does not need the per-scene mark.
   - **Never a grief beat.** The source carries grief as short fragments separated by long silence, not as a run. A marked run tagged `quiet` is a flag.
   - The corpus numbers behind the ceiling — long-run rates per scene and attested run lengths — live in `register.md`'s measured table; cite it, do not restate it here. The 75-word ceiling sits above the attested norm on purpose — it is a wall, not a target. An `action` must make its actor unambiguous, either named in the text or carried by `speaker_id`. The 2026-07-25 run burned four Content passes on a seed specced into the wrong slot type, because the schema had no way to express the distinction.

9. **Plain language.** Every word in a player-facing line must be parseable by a player who has never seen the workplace, trade, or custom it comes from. Trade jargon, in-world units, and process nouns the scene has not shown are flagged. *"Coke at nine a sack"* is a flag; *"price of coal went up a coin"* is not. This is the unenforced half of an existing rule: `register.md` requires that content *withhold significance, never orientation*, and jargon withholds orientation. The check needs scene context — a term the player has been shown is fine, the same term cold is not — which is why it lives here rather than in the mechanical tell-pass (`pipeline.md` step 11). Found at the Kinbound gate 2026-07-25, where jargon caused half the run's revisions and no existing check covered it.

10. **Choice equal weight.** Every choice_node carries an `equal_weight_note` and a `no_accrual_note` (`templates/choice-node-schema.md`). This check owns the *presence* of both; check 2 owns the accrual semantics the second note promises. A node missing either is a structural flag and routes to the Architect (`pipeline.md` step 13).

    Three mechanical reads on the node itself:
    - **Rank asymmetry.** An option carrying `canon_write` while a sibling carries none is flagged. Differences among `bond_event` / `thread_move` / `knowledge_flag` are asymmetry in kind and legal, because none of the three surfaces to the player. That is the rank rule, stated here once.
    - **Scolding the unpicked option.** A response slot that scolds, corrects, or mopes at the unpicked option is flagged. The soul answers the words spoken.
    - **Yes/no/maybe shape.** Flagged — the test is on consequences, not surface grammar. Options whose responses and world consequences would be interchangeable up to agree/refuse/defer are the defect. Accept-vs-decline with distinct authored responses and distinct consequences passes (efficiently-branching-narrative.md).

    Presentation, both option shapes: a `player_line` that names a feeling as a label rather than speaking as the player, and a `surface_action` that names an internal state instead of a verb acting on a named thing (`[Comfort him]` vs. `[Pick up the trays]`), are defects (the feelings-menu ban, `build-loop.md`).

11. **Required examinables.** A thread document **declares** its examinables; `tools/resolver/data/screen-specs.json` says which are **built**. This check joins the two and flags every declaration the build does not satisfy.

    The declaration is the thread document's examinables table — id, screen, the flag it sets, the path it reopens (`templates/choice-node-schema.md`, ruled 2026-08-04). Four flags, all read off that table:
    - **Not built.** No examinable of that id exists in `screen-specs.json`. Every path the declaration says this pickup reopens is unreachable.
    - **Wrong screen.** Built, but not on the screen declared. The player cannot reach it from where the thread expects.
    - **No flag.** Built on the right screen, but it sets no `knowledge_flag` — a pickup that picks nothing up. It satisfies the declaration in name only.
    - **Flag mismatch.** Built setting a different flag from the one declared.

    **Invented props are declarations (ruled 2026-08-08 — Roc).** The Content seat may invent a physical prop to fill an `object` or `action` slot (`agents/content-dialogue.md`), and every invented prop must be declared so it registers as an examinable in its scene. An invented prop that reaches shipped content with no examinables-table entry is flagged: it exists only in prose, this check joins declarations to builds, and an undeclared prop is invisible to it by construction.

    Structural, so it routes to the Architect, not to Content. The examinable's `knowledge_flag` is the field it checks against (`../tools/resolver/src/types.ts`), and it is what makes R5's pickup model real: a missed thing stays in the world, and examining it records the fact the closed conversational path would have.

    Implemented in `../tools/resolver/src/examinables.ts`. Run it as `node src/cli.ts check-examinables [--threads <dir>]`, or as part of `build` by passing `--threads`. It **fails** on any flag; `--warn-only` reports without failing, which is the legitimate mid-authoring state before a thread is marked ready for prose.

    **The same defect outside examinables is covered by `../tools/ref-lint.mjs` (added 2026-08-09).** This check joins *declared* examinables to *built* ones; ref-lint joins every other kind of declaration — a markdown link, a wikilink, a cited path — to the file it claims exists. Three instances turned up on 2026-08-09: the NPC codex specified in ten documents and never created, Pip's playable-signal block that sat outside the pinned section, and a technique note with no inbound reference.

    *(Added 2026-08-07, GP-112. `ex-shelf` was declared on T2 in `lantern-projects/v01/threads/toby-the-shelf.md`, called load-bearing, and never built — and it survived a design pass, a review, two line-writing passes and three QA walks, because a proposal nothing verifies is indistinguishable from a thing that exists.)*

12. **Invention register.** Invention is licensed (ruled 2026-08-09 — Roc; the loop is `agents/content-dialogue.md`) and this check owns its bookkeeping: everything invented is declared, checked against the codex ([`npc-codex.md`](npc-codex.md)), and typed correctly. A declared invention that is new, non-duplicating, non-contradicting and correctly typed is **not a flag — it is PROPOSE**, routed to the human gate as a canon candidate (`agents/consistency-verifier.md`). The flags:

    - **Undeclared.** An invented offstage person, world fact, or geography appears in shipped prose with no `inventions` declaration. Texture that leaks in undeclared is how lore accumulates by accident instead of on purpose.
    - **Duplicate.** A declaration whose referent an existing codex entry could carry — reuse was available and was not taken. The Juno precedent (`pipeline.md` step 2): the notice goes on an existing soul, not a new villager.
    - **Contradiction.** A declaration, or the prose behind it, contradicting a codex entry's locked facts. This is the invention-side face of check 4, which owns contradiction in non-invented prose.
    - **Mistyped — the scene-locality and fact-class criterion (derived by the Verifier on a live run; ratified here 2026-08-09).** A prop must be examinable from where the scene happens. A declaration typed `prop` whose real content is world geography or an offstage person — the blue door past the well, the household at the lane end — is flagged as mistyped: that content is Architect work routed up for ratification, never a Content-seat prop declaration registered as scene furniture.

    **Quantities are scene colour and are never flagged.** "Eleven jars" binds nothing, needs no declaration, enters no codex entry, and a later scene counting differently contradicts nothing. Only the existence-level fact — a shelf of preserve jars — is canon-bearing.

    Division of labour with check 11 (required examinables): 11 owns the declared-versus-built join for props — a declared prop the build never satisfies. This check owns whether the declaration itself should exist, is typed right, and squares with the codex. A prop can pass 12 (declared, legal, correctly typed) and still fail 11 (never built); the two never flag the same defect.

## The speaker_intent guard

speaker_intent describes the speaker only: what the line means from their side. It is write-only input to generation and a check target for register, nothing else (dialogue-of-hades.md). A value that names a player feeling, sets a felt target, or reads as a score ("lands as grief, 0.8") is flagged on sight.

## The steering guard

World Truths steer content and shape direction, structurally. A World Truth phrased as a player outcome, or a delta phrased as an intended emotion, is flagged. The Soul Arc Spine is a human note in the arc doc, not a machined field (`steering-layer.md`), so the Verifier has nothing to check there; a spine treated as a required ending is caught at the human gate. The spine biases which content a human chooses to seed; the bond still collapses only from what the player actually did.
