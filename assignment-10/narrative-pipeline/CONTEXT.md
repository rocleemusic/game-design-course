# Narrative Pipeline

The full spec for how the dev crew constructs narrative content for the game. [`../gdd/11-ai-agents-and-pipeline.md`](../gdd/11-ai-agents-and-pipeline.md) is the GDD-altitude summary; this folder is the working spec the crew builds from. Derived from the narrative knowledge base (see `SOURCES.md`).

## The constraint (the north star, everything here serves it)

We write stories; we do not script payoff. Two things in this pipeline are scripted: the mechanical recognition (the player asserts a soul's essence, the game confirms at a threshold, wrong guesses revise and teach) and the text itself (every line authored through this process and approved by a person). One thing is invited: what the player feels when a plain detail from another life turns out to have been load-bearing. We author content that makes room for that reaction. No agent produces it, no field records it, no metric measures it, and no scene claims it happened. Procedural technique is primary; cohesion and a compelling story are secondary, and both are in service of the invitation.

## How the pieces fit

| File | Holds |
|---|---|
| `pipeline.md` | The generation procedure: the ordered steps and the agent flow. Start here to see how the machine runs. |
| `steering-layer.md` | The arc doc: World Truths, the Arc Question, Soul Arc Spines (human notes), Threads to Not Drop, What This Arc Is NOT. What gives the pipeline direction. |
| `guardrails.md` | The cohesion invariant checklist the Consistency Verifier runs, plus the constraint guards. |
| `register.md` | The output voice contract (Frieren-flat) for all player-facing text — including the player voice (Roc+Frieren blend, ratified 2026-07-28) and the per-card warmth/length loosening (2026-07-29). |
| `build-loop.md` | The build-time authoring loop in ink, the S4 file split + ink-address rule + tag contract, and the four pieces that must be custom-built. |
| `extending-content.md` | The reusable process for adding a new conversation or a new thread: author the line file, declare the entry gate, import, re-emit, verify. Real commands, the known-red tests, and the trap list. |
| `review.md` | The human gate and the SDT review checklist (human-only). |
| `templates/` | Fillable schemas: the arc doc, the persona_card (now with `primal_seed`), the echo_template, and — added 2026-07-29 — the `choice_node` (player choices, Intercept-style) and the `screen_spec` (screens, gates, item slots, the predicate vocabulary). |
| `examples/worked-example-mara.md` | One soul run end to end across two lives. |
| `prior-art-neq.md` | The NeverEndingQuest read: what this pipeline adopts, adapts, and refuses from a running AI-DM, including the bond-scoring design and the NPC codex. |
| `SOURCES.md` | The provenance record, grouped by lens. |

## The map to the §11 agents

The pipeline feeds the crew defined in [`../gdd/11-ai-agents-and-pipeline.md`](../gdd/11-ai-agents-and-pipeline.md). This spec references those agents; it does not redefine them. `11-ai-agents-and-pipeline.md` stays the single source of truth for each agent's I/O.

| Pipeline step | §11 agent |
|---|---|
| Steering | Narrative Director (`agents/narrative-director.md`) |
| Intake, Cards, Echoes, Delta and canon, Graph, Recognition gates | Narrative Architect (Agent 1) |
| Lines | Content / Dialogue Agent (Agent 2) |
| Verify | Consistency Verifier (Agent 3) |
| Purge the tells | The Content Agent's automated tell pre-pass (Agent 2) |
| QA | QA / Playtest Agent (Agent 5) |
| Sequencing, escalation | Orchestrator (Agent 0) |
| The human gate, SDT review | Roc |

## How to run it

Steering → Generation → Verify → Purge → QA → Escalate → the human gate. **Generation produces the full dialogue graph and proposed lines for every node, through to the end** — Cards, Echoes, Delta, Graph, Recognition gates, then Lines for all nodes, not per-batch fragments. The build-time realization of all of it is in ink; see `build-loop.md`. The order and the detail are in `pipeline.md`.

**Terms:** a **stage** is a content class (`content-stages.md`, 1–7: Arc, NPCs, Spells…); a **step** is one move of the generation procedure (`pipeline.md`, 1–13). The two numberings are independent — a stage runs its batch through the steps.

## The full loop — content to engine

The chain above covers authoring. Approved content then travels:

1. Approved data JSONs land in `../tools/resolver/data/` (the Architect's layout pass, human-gated).
2. **Resolver build** — mints `graph.json`, the ink scaffold, and compiled `story.json` (commands in `../CONTEXT.md` §Running the current build).
3. **Lantern review** — graph review + greybox playtest; per-node approve/flag/edit writes `approvals.json` + `edits.json`.
4. **Rebuild with edits** — resolver `build --edits` folds the patches back in.
5. **Unreal** — the compiled `story.json` (`inkVersion 21`) is the seam into Inkpot (`../gdd/12-technical-overview.md`). **This step is in process, not built yet — it is the intention, gated on the 8/10 spike.**

## The tooling (built 2026-07-30, lives outside this folder)

The pipeline's deterministic half is real code at [`../tools/`](../tools/): **resolver/** (mints IDs, builds `graph.json`, emits the compiling ink scaffold, resolves seeded days, applies review-tool edit patches; reads `data/tuning.json` — the single home for tunable game settings) and **lantern/** (the review tool: graph review + greybox playtest, per-node approve/edit, spec in `../resources/review-tool-spec_draft.md`). The Architect's layout-pass data (provisional, human-gated) is in `../tools/resolver/data/`. Open review decisions live in `../plans/2026-07-30-phase23-review.md`.
