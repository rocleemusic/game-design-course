# Scope & Risks

MUST/SHOULD/STRETCH tiers, sequencing gates, top risks with fallbacks, planned scoping cuts, and the milestone calendar. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

## MUST / SHOULD / STRETCH

The floor stated directly (not inferred from a cut-list). MUST is the true MVP — it is exactly [`12-technical-overview.md`](12-technical-overview.md)'s Definition of Done. SHOULD is the intended slice. STRETCH is reach.

| Tier        | Narrative                                                                                      | World / Levels                                                                                          | AI-Pipeline                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **MUST**    | 1 deep soul's arc complete end-to-end ([`07-cast.md`](07-cast.md)); one seed→payoff echo lands                        | Forest (1 screen + 2 unlocks) + Town (Square + 1 scene) + Festival; one week playable to festival night | Persistence save works (close and reopen resumes); Content + Consistency agents produce & check one soul's lines; **Production/PM agent maintains the board** |
| **SHOULD**  | 3 deep souls' key lines authored & distinct side-by-side; oblique reciprocity (dialogue warms) | 3 festival tiers rendered; bond-driven dialogue change on a repeat reshuffle                          | Full crew runs; a second hand-authored reshuffle instance demonstrated on camera |
| **STRETCH** | All 5 texture souls fully written; the souls-of-the-world display top tier                     | Extra forest screens; richer effects                             | Style/Art-Direction agent automated |

**Two tier moves, 2026-08-01.** The **Production/PM agent** went STRETCH → MUST: with 24 days left and three built-but-unreviewed items on day one, losing track of delivery state *is* the failure mode, so the board that prevents it is part of the floor. Built the same day — [`../agents/production-pm.md`](../agents/production-pm.md), with task state in Paca (project `game-project`, prefix `GP`). And **ink→UE integration** went STRETCH → MUST on Roc's ruling that Unreal is the ship target, not the fallback; it is the only MUST-tier item starting from zero, which is why it carries a hard-dated go/no-go (below).

**Two MUST-tier removals, 2026-08-17 (Roc).**

- **ink→UE integration → POST-CAPSTONE.** Amends the 2026-08-01 tier move above. The capstone ships from the Phaser build ([`12-technical-overview.md`](12-technical-overview.md)), so the UE seam is no longer part of the floor. The spike stands, `RebirthCore` compiles, and both become the port target. Nothing is discarded.
- **Reshuffle → out of the Definition of Done.** The mechanic is unchanged in [`06-world-and-progression.md`](06-world-and-progression.md); it is simply not demonstrated at the capstone. This is a slice scope call, not a design deletion.

**The amended DoD is three items:** save and restore (close, reopen, resume), one week playable to festival night, and soul storylines complete.

## Sequencing gates (do-not-until rules)

- **Don't author a second hand-authored reshuffle instance until one plays end-to-end.**
- **Don't build out texture souls until the 3 deep souls read as distinct** side by side.
- **Don't gate Track B (visual build) on content** — keep Tracks A/B parallel so review never blocks assets ([`12-technical-overview.md`](12-technical-overview.md)). **The B→A blocking allowlist is exactly three:** `GP-18` (gather_line render), `GP-19` (divert_to address), `GP-20` (ungated set-up line). A fourth cross-track `blocks` link is a parallelism breach — the PM agent flags it, Roc rules on it, nobody resolves it silently.
- **Don't wire the leitmotif to any counter** — it triggers on a noticed-and-matched detail (see [`10-audio.md`](10-audio.md)).
- **Week-1: prove save/load carries state across a reshuffle** before content depends on it.

## Top risks (with fallback)

- **NPC perceptual distinctness (the differentiator's soft spot).** Whether the essence-signature card pipeline yields perceptibly distinct neighbors needs real writing samples against the voice guide. Because each soul is derived from a different primal (the `primal_seed` field, [`../narrative-pipeline/templates/persona-card-schema.md`](../narrative-pipeline/templates/persona-card-schema.md), added 2026-07-29 — the deep-soul assignments carry forward from the archived phase-3 table on their next card revision), the distinctness is generated and **checkable on paper**, not merely asserted. *Validate:* generate the 3 deep souls' key lines and read them side by side (see [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)'s worked example). *Fallback:* hand-author the 3 deep souls; agents handle texture NPCs only.
- **The reshuffle / persistence engine coherence.** The on-camera role-swap must read as the same soul in a new role. *Validate:* the ink prototype demonstrates one reshuffle end to end. *Fallback:* hand-script the single on-camera swap for the slice; generalize later.
- **Ink-to-Unreal integration — now the top risk (raised 2026-08-01).** The narrative engine must carry from ink into UE. Roc ruled Unreal is the ship target, moving this to MUST; **until 2026-08-01 it had zero task coverage in any tracker**, despite UE 5.8, the Perforce workspace `roclee_CCI-MSiAegis-02_459` and a documented dependency on `inkcpp` or `Inkpot`. It is the only MUST-tier item starting from nothing. *Validate:* a deliberately minimal spike — one scene from `story.json` playable in `rebirth.uproject`. *Fallback:* ship the slice as the ink/html build. **The fallback is bound to a hard-dated GO/NO-GO on Mon 2026-08-10; if the spike has not landed by then, NO-GO fires by default. Silence is not a GO.** Taking the fallback deliberately on 8/10 is a good outcome; taking it by accident on 8/24 is not.

  **RESOLVED, then SUPERSEDED.** The spike landed 2026-08-03 and GO fired seven days early. On **2026-08-17 Roc pivoted the capstone to the Phaser build** and this risk left the MUST tier. **Read carefully: this is not the 8/01 fallback taken late.** The fallback was "ship the ink/html build *instead*"; what happened is that the browser build matured into the ship target while the UE work continued in parallel and remains valid. The real finding was that the UE snags were a **missing host layer**, not an ink-integration failure — `LanternPlayer` owns state that `RebirthCore` never ported. Full record: [`../plans/2026-08-17-phaser-pivot-mode4-plan.md`](../plans/2026-08-17-phaser-pivot-mode4-plan.md).
- **Human-review bottleneck (about half a week of review time).** Measured, not assumed: the count of items built but not yet reviewed by Roc. A rising count is this risk materialising, and it headlines every PM readiness summary. *Fallback:* cut to the MUST column only — 1 soul, 1 reshuffle instance, 1 ending.
  **Review lifecycle (status-based, ruled by Roc 2026-08-07 — supersedes the `review:built-unreviewed` tag):** review is a **board status**, not a tag. When Claude finishes a piece of work it moves the card to **In Review**. Roc reviews it there and moves it to **Done**. **Done means reviewed.** Nobody moves their own card out of In Review — that move is Roc's, and it is the review.

  *Why this replaced the tag.* A tag sits beside the work, so the work could be genuinely reviewed while the tag said otherwise — which is how the queue metric needed re-censusing twice. A status is the work's position: there is no "reviewed but not cleared" state to fall into, because the review and the move are one act. The prior scheme also had no entry for a review that happened at a content gate rather than in an R-track slot, which produced cards that were genuinely reviewed and could not be cleared (GP-94/95/97/98, 2026-08-05).

  *Cards closed by a ruling on the artifact they produced* — where the `ruled:` and `done:` tags are the evidence — are **already reviewed and carry no review tag**. Where such an item was raised and addressed inside a single session, the card is a record of what happened, not a queue entry. (Ruled by Roc 2026-08-07, closing GP-64; applied to GP-116, GP-117, GP-70.)

  *Retired:* `review:built-unreviewed`. `review:reviewed` survives only on cards cleared under the old scheme, as history. Do not apply either to new work.

- **The pickup model has no implementation (found 2026-08-07, on the first authored thread).** R5 ([`../plans/2026-08-03-storyline-authoring-process.md`](../plans/2026-08-03-storyline-authoring-process.md)) promises that a missed fact makes a thread **shallower, never closed** — *"the jam jar is still on the shelf, and clicking it later opens the deeper path"* — and every thread's closed paths depend on it. **Examinables cannot set knowledge flags.** The `Examinable` type carries `id`, `clue_tier`, `promotes_to` and `region`, and nothing in the resolver or Lantern joins one to a flag. R5 states "no new machinery"; that is false, and it went unnoticed because a *proposed* examinable and a *built* one are indistinguishable on paper. On `toby-the-shelf` it leaves the payoff conversation permanently unreachable for any player who skips a single option in the first conversation — R3 lost rather than shallowed, which is the one outcome R5 forbids. *Validate:* a walk that skips the opening option, clicks the examinable, and still reaches the last conversation. *Fallback:* author threads with **no closed paths** — every reveal reachable from more than one option — which costs authoring effort per thread and flattens the shallow/deep distinction the bond weights are built on; **or** withdraw the pickup promise from R5 and accept that a missed fact closes that branch for the life. **Owner: `GP-111` (`tier:must`, S2); the check that would have caught it is `GP-112`.**

## Planned scoping cuts

Ordered by what goes first if time runs short; the top of the list is cut before the bottom.

1. **The second hand-authored reshuffle instance.** Ship one on-camera reshuffle hand-scripted; a second is the first cut.
2. **The Farm (third location).** Already cut from the slice; a reserved slot that adds without reworking Town or Forest.
3. **The texture souls beyond what the deep arcs need.** Trim toward the minimum that populates a life.
4. **The upper festival tiers.** Ship the quiet/warm read; grand + the souls-of-the-world display are the last polish.
5. **The role pool.** If time runs short, trim back toward the minimum viable set (Mage + Blacksmith — the only two the slice actually needs to select between) rather than fully authoring goals/mishaps for Herbalist/Priest/Farmer.

## Milestone calendar

**⚠ Corrected 2026-08-01 (clarification from the teacher): a syllabus date is when an assignment is ASSIGNED. It is DUE one week later.** The dates below are due dates. **The capstone is the sole exception — 8/25 is both its session and its deadline, and it does not move.** Every milestone in this table was previously stated a week early.

Each milestone carries what must be spec'd before it closes and who or what verifies it.

| Assigned     | **Due**      | Milestone / deliverable                                                                 | Blocking sub-rows                                                               | Verified by                                       |
| ------------ | ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Tue 7/14     | Tue 7/21     | **GDD first draft** (Assignment #1)                                                     | Concept + pillars locked                                                        | Submitted                                         |
| Thu 7/16     | Thu 7/23     | **Final GDD draft** (Assignment #2)                                                     | Hole-filling substantially closed                                               | Phase-3 decisions                                 |
| Tue 7/21     | Tue 7/28     | **Agent crew** (Assignment #3: 3+ agents, shared output, dev artifact)                  | Dev-crew roster + JSON I/O ([`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)); session-state bus field schema | This GDD, then the review panel                   |
| Thu 7/23     | Thu 7/30     | **Dynamic content pipeline** (Assignment #4: RAG, 3+ content types, consistency checks) | Content Agent + Consistency Verifier contracts; voice register + tone enum | QA / Consistency agents + review of sample output |
| Thu 7/30     | **Thu 8/13** | **Goal-oriented coding agent** (Assignment #5) | **Package assembled 2026-08-11** — the submitted agent is the **Choice Designer** seat ([`../agents/choice-designer.md`](../agents/choice-designer.md)), with a before/after run on `toby-the-shelf` and a README at [`../assignments/assignment-5/`](../assignments/assignment-5/). Supersedes both the 2026-08-01 "built — awaiting submission only" and the 2026-08-07 "needs a rebuild": the feature-gap-auditor approach was **scrapped** (Roc, 2026-08-11) after the teacher relaxed the brief in class on 2026-07-30. `GP-49` (submit) is the only step left. | Submitted |
| Tue 8/4      | **Tue 8/18** | **GER pipeline** (Assignment #6)                                                        | Level layout → gate/verb table; content-budget inputs. **Due date corrected 8/11 → 8/18 (Roc, 2026-08-11), from the brief itself — #6 runs two weeks, so the assigned-plus-one-week rule does not hold for it.** Staged at [`../assignments/assignment-6/STAGING.md`](../assignments/assignment-6/STAGING.md) | QA Agent traversal pass on the generated layout   |
| Thu 8/6      | **Thu 8/20** | **Style-guide agent** (Assignment #7) → Style/Art-Direction Agent                       | Color grammar + silhouette vocabulary as machine-checkable rules ([`09-art-direction.md`](09-art-direction.md)). **Due date corrected 8/13 → 8/20 (Roc, 2026-08-16)**, matching the board (`GP-40`, `ruled:2026-08-16`). Built 2026-08-16; only the push to the course repo remains (`GP-163`) | Style agent + single review eye               |
| Tue 8/11     | Tue 8/18     | *Narrative engine prototype* (Assignment #8 — **optional**)                             | Branching narrative with player profiling — substantially already built          | —                                                 |
| Thu 8/13     | Thu 8/20     | *Adversarial QA agent* (Assignment #9 — **optional**)                                   | Autonomous testing agent with structured reports — the walker is most of this    | —                                                 |
| Tue 8/18     | **Tue 8/25** | **Complete AI dev pipeline** (Assignment #10)                                           | Token budget calibrated ([`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)); end-to-end prompt-to-engine documented | Cost analysis against real generation             |
| Tue 8/25     | **Tue 8/25** | **Capstone: final playable game** — *the one date that did not move*                    | Slice contract + Definition of Done met ([`12-technical-overview.md`](12-technical-overview.md)); 1 ending shipped | Human playtest (primary) + QA Agent pre-ship pass |

**One consequence of the correction.** Assignment #10 now lands on the **same day as the capstone** — 8/25 carries two deliverables, and that is the new crunch point, not 8/4.

*(A second consequence once read "Assignment #5 was never in this table at all; it is built and needs only submitting." That was wrong twice over — #5 is in the table, on the 8/13 row, and nothing was built until 2026-08-11. Struck 2026-08-11.)*

**Scope note on #10:** it is a *documentation* deliverable — show the end-to-end pipeline works, prompt to engine. No new build. That matters given the date it shares.

The Production/PM Agent (see [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md) and [`../agents/production-pm.md`](../agents/production-pm.md)) owns tracking against these dates and explicitly schedules the human-review week — the back-loaded review is the top delivery risk (above).

**Task state lives in Paca** (project `game-project`, prefix `GP`), not in markdown. [`../resources/_archive/game-project-tasks.md` *(retired; Paca `/pm` holds task state)*](../resources/_archive/game-project-tasks.md) *(retired — task state is in Paca, `/pm`)* is frozen as history from 2026-08-01. Markdown holds reasoning; Paca holds state — status banners in this repo have been materially wrong and cost a session. There is no spare week for review, so the human-review week is scheduled as **one review slot per sprint plus a content freeze on Fri 2026-08-21**, after which only review, fixes and ship work happen.
