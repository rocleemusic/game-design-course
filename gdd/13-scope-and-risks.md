# Scope & Risks

MUST/SHOULD/STRETCH tiers, sequencing gates, top risks with fallbacks, planned scoping cuts, and the milestone calendar. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

## MUST / SHOULD / STRETCH

The floor stated directly (not inferred from a cut-list). MUST is the true MVP — it is exactly [`12-technical-overview.md`](12-technical-overview.md)'s Definition of Done. SHOULD is the intended slice. STRETCH is reach.

| Tier        | Narrative                                                                                      | World / Levels                                                                                          | AI-Pipeline                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **MUST**    | 1 deep soul's arc complete end-to-end ([`07-cast.md`](07-cast.md)); one seed→payoff echo lands                        | Forest (1 screen + 2 unlocks) + Town (Square + 1 scene) + Festival; one week playable to festival night | Persistence save + reshuffle works; Content + Consistency agents produce & check one soul's lines |
| **SHOULD**  | 3 deep souls' key lines authored & distinct side-by-side; oblique reciprocity (dialogue warms) | 3 festival tiers rendered; bond-driven dialogue change on a repeat reshuffle                          | Full crew runs; a second hand-authored reshuffle instance demonstrated on camera |
| **STRETCH** | All 5 texture souls fully written; the souls-of-the-world display top tier                     | Extra forest screens; richer effects                             | Style/Art-Direction agent automated; Production/PM agent live; ink→UE integration spike |

## Sequencing gates (do-not-until rules)

- **Don't author a second hand-authored reshuffle instance until one plays end-to-end.**
- **Don't build out texture souls until the 3 deep souls read as distinct** side by side.
- **Don't gate Track B (visual build) on content** — keep Tracks A/B parallel so review never blocks assets ([`12-technical-overview.md`](12-technical-overview.md)).
- **Don't wire the leitmotif to any counter** — it triggers on a noticed-and-matched detail (see [`10-audio.md`](10-audio.md)).
- **Week-1: prove save/load carries state across a reshuffle** before content depends on it.

## Top risks (with fallback)

- **NPC perceptual distinctness (the differentiator's soft spot).** Whether the essence-signature card pipeline yields perceptibly distinct neighbors needs real writing samples against the voice guide. Because each soul is derived from a different primal ([`../narrative-pipeline/templates/persona-card-schema.md`](../narrative-pipeline/templates/persona-card-schema.md)), the distinctness is generated and **checkable on paper**, not merely asserted. *Validate:* generate the 3 deep souls' key lines and read them side by side (see [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)'s worked example). *Fallback:* hand-author the 3 deep souls; agents handle texture NPCs only.
- **The reshuffle / persistence engine coherence.** The on-camera role-swap must read as the same soul in a new role. *Validate:* the ink prototype demonstrates one reshuffle end to end. *Fallback:* hand-script the single on-camera swap for the slice; generalize later.
- **Ink-to-Unreal integration.** The narrative engine must carry from ink into UE. *Validate:* an early integration spike. *Fallback:* ship the slice as the ink/html build if UE integration slips.
- **Human-review bottleneck (about half a week of review time).** *Fallback:* cut to the MUST column only — 1 soul, 1 reshuffle instance, 1 ending.

## Planned scoping cuts

Ordered by what goes first if time runs short; the top of the list is cut before the bottom.

1. **The second hand-authored reshuffle instance.** Ship one on-camera reshuffle hand-scripted; a second is the first cut.
2. **The Farm (third location).** Already cut from the slice; a reserved slot that adds without reworking Town or Forest.
3. **The texture souls beyond what the deep arcs need.** Trim toward the minimum that populates a life.
4. **The upper festival tiers.** Ship the quiet/warm read; grand + the souls-of-the-world display are the last polish.
5. **The role pool.** If time runs short, trim back toward the minimum viable set (Mage + Blacksmith — the only two the slice actually needs to select between) rather than fully authoring goals/mishaps for Herbalist/Priest/Farmer.

## Milestone calendar

Anchored to the course assignment dates. Each milestone carries what must be spec'd before it closes and who or what verifies it.

| Date         | Milestone / deliverable                                                                 | Blocking sub-rows                                                               | Verified by                                       |
| ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Tue 7/14     | **GDD first draft** (Assignment #1)                                                     | Concept + pillars locked                                                        | Submitted                                         |
| Thu 7/16     | **Final GDD draft** (Assignment #2)                                                     | Hole-filling substantially closed                                               | Phase-3 decisions                                 |
| Tue 7/21     | **Agent crew** (Assignment #3: 3+ agents, shared output, dev artifact)                  | Dev-crew roster + JSON I/O ([`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)); session-state bus field schema | This GDD, then the review panel                   |
| Thu 7/23     | **Dynamic content pipeline** (Assignment #4: RAG, 3+ content types, consistency checks) | Content Agent + Consistency Verifier contracts; voice register + tone enum | QA / Consistency agents + review of sample output |
| Tue 8/4      | **GER pipeline** (Assignment #6)                                                        | Level layout → gate/verb table; content-budget inputs                           | QA Agent traversal pass on the generated layout   |
| Thu 8/6      | **Style-guide agent** (Assignment #7) → Style/Art-Direction Agent                       | Color grammar + silhouette vocabulary as machine-checkable rules ([`09-art-direction.md`](09-art-direction.md)) | Style agent + single review eye               |
| **Tue 8/18** | **Complete AI dev pipeline** (Assignment #10)                                           | Token budget calibrated ([`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)); end-to-end prompt-to-engine documented | Cost analysis against real generation             |
| **Tue 8/25** | **Capstone: final playable game**                                                       | Slice contract + Definition of Done met ([`12-technical-overview.md`](12-technical-overview.md)); 1 ending shipped | Human playtest (primary) + QA Agent pre-ship pass |

The Production/PM Agent (see [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)) owns tracking against these dates and explicitly schedules the human-review week — the back-loaded review is the top delivery risk (above).
