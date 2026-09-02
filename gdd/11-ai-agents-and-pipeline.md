# AI Agents & Pipeline

The dev-crew roster, token budgets, operating rules, the workflow, a worked example, and the build-time agent-to-component plan. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. This file names the crew and its I/O contract; [`../narrative-pipeline/CONTEXT.md`](../narrative-pipeline/CONTEXT.md) is the full working spec for how the narrative agents actually run.

A small, human-gated crew turns approved GDD decisions into game content and validates it — one agent per feature, each doing bounded, structured work.

## The roster

| Agent                     | Input                                                                         | Output / Responsibility                                                                                                                                                                                      | Token Budget |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Orchestrator**          | Session goal, pipeline stage, arc-doc + NPC-codex refs, human authored intent | Sequences the crew: hands each worker its input, collects the typed output, and surfaces the human gates. Resolves conflicts when outputs disagree.                                                          | 200K         |
| **Narrative Director**    | Corpus lore, roster seeds, human steering intent                              | Steering — surfaces corpus lore, proposes the arc-doc fields + generative tables, drafts the arc doc for Roc's ratification. Distinct from the Architect: Director sets *direction*, Architect builds *structure* from the ratified arc doc. Full role prompt: [`../narrative-pipeline/agents/narrative-director.md`](../narrative-pipeline/agents/narrative-director.md). | not yet budgeted |
| **Narrative Architect**   | NPC descriptions, scene list, voice guide; layout pass: the ratified layout draft + structure schemas | Story structure: persona cards, the seed→payoff echo map, and the NPC codex of locked facts. In the layout/graph pass (2026-07-29): screen_specs, the scene graph, and choice_nodes — structure and branch intent, with code minting IDs and compiling conditions. Writes no player-facing lines. | 300K         |
| **Choice designer** *(split off the Architect, RULED 2026-08-06)* | A thread document with the Architect's brief complete: thread shape, dependency order, flag table, conversation count | Conversations, gates and predicates, options, outcomes, fallbacks; action-slot placement; marking a sanctioned long run. Writes no player-facing lines. Contract: [`../agents/choice-designer.md`](../agents/choice-designer.md) | — |
| **Content / Dialogue**    | Persona card, scene context, tone enum, output from Narrative Architect       | All player-facing text — NPC lines, lore, descriptions.                                                                                                                                                      | 700K         |
| **Spell Schema**          | Arc doc, [`04-magic-system.md`](04-magic-system.md), the cast, the screen list | The spell record — phrase, components as `item_id`s, `produces`, and the receiver-outcome matrix across inert / stateful / creature / soul. Writes no lines. Stage 3, and stage 7 for the cross-pass. Contract: [`../narrative-pipeline/agents/spell-schema.md`](../narrative-pipeline/agents/spell-schema.md). **Staffed 2026-08-04.** | not yet budgeted |
| **Item Schema**           | `component_requirements` from the spell seat, [`05-collectibles.md`](05-collectibles.md), the screen list | The item record — description, category, persistence (`pack-triaged` / `free` / `world`), sources, and the never-randomize-out-a-gate flag. Items are **derived, never authored top-down**. Stages 4–5. Contract: [`../narrative-pipeline/agents/item-schema.md`](../narrative-pipeline/agents/item-schema.md). **Staffed 2026-08-04.** | not yet budgeted |
| **Consistency Verifier**  | New lines, active canon, the locked invariant set ([`../narrative-pipeline/guardrails.md`](../narrative-pipeline/guardrails.md)) | Flags each batch against the invariant set + voice register. Flags only — never rewrites.                                                                                                                    | 300K         |
| **QA / Playtest**         | Scene graph, gates, interaction specs                                         | Verifies the assembled slice is traversable and works as specced: no soft-locks, dead-ends, or unreachable wins. Flags only.                                                                                 | 250K         |
| **Style / Art-Direction** | New assets, palette bands, silhouette vocabulary                              | Checks each art variant against the color grammar + silhouette rules; flags palette drift and silhouette breaks. Full system + schema: [`09-art-direction.md`](09-art-direction.md). | 100K         |
| **Production / PM**       | Milestone calendar, the Paca board, review-queue depth, remaining time        | Maintains the backlog, tracks the human-review queue, flags the unscheduled review-week and back-loaded work, and produces a weekly readiness summary. Makes no design or content decisions; surfaces risk and sequencing to the human. **Writes task and status state to Paca directly; scope, dates and priority order require Roc's approval.** | 50K          |

**Two project-level designer seats sit beside this roster**, in [`../agents/`](../agents/) rather than `narrative-pipeline/agents/`, because the Orchestrator never dispatches them and Roc calls them directly. **Staffed 2026-08-04.**

| Seat | In | Out |
|---|---|---|
| **Role Spell Designer** ([`../agents/role-spell-designer.md`](../agents/role-spell-designer.md)) | One role from the pool in [`07-cast.md`](07-cast.md) | Exactly 3 spells that role would know, derived from its festival goal and daily labour, in the Spell Schema shape |
| **Component Item Designer** ([`../agents/component-item-designer.md`](../agents/component-item-designer.md)) | A gated batch's `component_requirements` | The items that satisfy them, in the Item Schema shape — no orphans, two sources minimum, gates never randomized out |

The pairing is the point: the schema seats own the record contract, the designer seats own the content. **A spell attaches to a role, never to a soul** — any soul dealt Baker next life knows the baker's spells, and a spell keyed to a soul's want is the check-1 essence/role defect.

**Note on the Narrative Director.** This agent runs in `narrative-pipeline/agents/` and owns Stage 1 (Arc), but earlier GDD drafts (v4, v5) never listed it in the roster table above — an accuracy gap fixed by this restructure. See [`../narrative-pipeline/agents/README.md`](../narrative-pipeline/agents/README.md) for the "Director vs. Architect" distinction.

**The UI seats — staffed 2026-08-19.** `../agents/` also holds a **UI Builder** and a **UI Verifier**, a build↔verify loop for the Phaser menu/panel layer. The Builder ports or redesigns one screen to Phaser from its mockup and [`14-visual-style-guide.md`](14-visual-style-guide.md), flagging greenfield data rather than faking it. The Verifier grades the result **findings-only** against that same design system — running the deterministic gate (`tsc`/`vitest`/`playtest` render) and judging fidelity and legibility from a screenshot — and never edits code. Two seats because the builder must not grade its own work. Like the designer seats, the Orchestrator never dispatches them and Roc calls them directly. Full project-level roster: [`../agents/README.md`](../agents/README.md).

**The QA Adversary — staffed 2026-08-24.** A third findings-only seat, [`../agents/qa-adversary.md`](../agents/qa-adversary.md), paired to the UI Builder the same way the Verifier is. It runs `phaser/tools/adversary/` — 250 steps of deliberately invalid input against mode 5 in a real headless Chromium — then triages the raw findings into `real`, `known`, `by-design` or `self-inflicted`, and hands the Builder a `fixes` array. It exists because every other tool in `phaser/tools/` plays the game CORRECTLY: `walk` walks the week, `sweep` drives all 89 cast pairs, the `playtest/` scenarios replay known-good flows, and 743 unit tests cover the pure seams. None of them sends bad input. Called at build-phase boundaries, before content freeze, before the capstone, and after any change to save, gates, inventory, cast or the day loop — never during a narrative content run.

**Production / PM Agent, in detail.** Owns the schedule, not the content: maintains the milestone-aligned backlog, tracks the human-review queue (the load-bearing bottleneck — see the measured-cost breakdown below), flags the unscheduled review-week and back-loaded work, and produces a weekly readiness summary. Makes no design or content decisions. **Staffed 2026-08-01** — the runnable role prompt is [`../agents/production-pm.md`](../agents/production-pm.md). Note it lives in `agents/`, **not** `narrative-pipeline/agents/`: it runs no pipeline step, the Orchestrator never dispatches it, and Roc talks to it directly. It is the answer to the §8A *Watch* in [`../knowledge-base/synthesis/dev-crew-architecture.md`](../knowledge-base/synthesis/dev-crew-architecture.md) — task tracking across weeks and five tracks (including the Unreal build the pipeline never touches) is a distinct load from run-time routing.
- *In:* `{ milestone_calendar, paca_board, review_queue_depth, remaining_time }` — **the Paca board (project `game-project`, prefix `GP`) is the source of truth for task state**, superseding `../resources/_archive/game-project-tasks.md` *(retired; Paca `/pm` holds task state)*, which is frozen as history.
- *Out:* `{ prioritized_backlog, scope_cut_recommendations, review_week_flags, readiness_summary }` plus `track_parallelism` (breaches of the Track B → Track A blocking allowlist) and `approval_required`.
- *When:* weekly, and at each milestone boundary. Never during a content run.
- *Gate:* **split.** Task creation and status updates are **ungated** — the agent maintains the board. Scope cuts, date changes and priority reshuffles are **advisory only** and require Roc's explicit approval. *Amended 2026-08-01: the original "advisory only" made the agent unable to maintain the backlog it was specced to own.*

**Budget.** One chat's context window is ~1M tokens. We assume a **3M total budget**: the crew above shares **2M**, and **1M is reserved for the technical track** (programming, Unreal MCP integration).

## Measured cost — what the crew actually costs

The per-agent allocations above were estimates. On 2026-07-25 the crew was **run**, not modelled: a 5-arm model benchmark plus a full generation of one soul through the stage-2 sequence, 27 agents across two phases. Evidence: [`../pipeline-runs/2026-07-25-giver/RESULTS.md`](../pipeline-runs/2026-07-25-giver/RESULTS.md).

**Cost does not scale by soul. It scales by how many times a soul speaks.**

| Unit | Measured | Scales with |
|---|---|---|
| Architect — one soul's persona card + echoes | ~51K tokens | **Souls** — paid once each |
| Content + Verifier — one soul appearing in one scene | ~107K tokens | **Soul-appearances** |

```
cards        8 souls × 51K   =  411K
remaining    2M − 411K       = 1.59M
appearances  1.59M ÷ 107K    =  ~15
```

The slice runs five days × three time-blocks = **15 scene-slots**. So the 2M crew budget affords roughly **one soul-appearance per time-block across the whole festival week, with zero revisions.** That is the real scope constraint on the roster in [`07-cast.md`](07-cast.md) and on how populated any given scene can feel.

**Three findings that change how the budget should be read:**

1. **Revisions, not generation, are the cost.** The demo run spent **79% of its tokens on revisions** — 3.8× the generation they corrected. The 2M is therefore **a revision-discipline budget, not a generation budget.** Two levers hold it: a hard cap of two revisions per item for any worker (which does not reset at a human gate), and — the one that actually makes revisions *rare* — briefing every revision with the **full constraint set** rather than just the defect. Given a single-axis instruction, the Content Agent reliably fixes that axis and silently spends another constraint; it did so four times out of four.
2. **Depth is not the cost driver.** A texture soul costs nearly the same per call as a deep soul, because the cost is the spec context each worker carries, not the soul's complexity. Adding texture souls is cheap only if they rarely appear.
3. **Handing workers their material instead of making them fetch it cut billed volume 6.9×.** This is a harness decision, not a model decision, and it was the single largest efficiency lever found.

**In money, the same slice is ~$26** at run cost (~$100 with revisions at the observed rate). **The token budget binds long before spend does** — so model-tier choices are made on **quality, with cost as the tiebreak**.

### Track, don't cap (ruled 2026-07-29)

The 2M figure was a class-review model, and its job is done. **Spend is tracked, not capped**: every run keeps logging its footprint in its run-log, and the running total below is extended per run. The proof runs alone already crossed the notional 2M — evidence the cap was a model, not a constraint. The discipline levers stay exactly as they were (two-revision cap, full-constraint briefing, handing workers their material) because they were always about quality, not the ceiling.

| Run | Logged footprint |
|---|---|
| 2026-07-25-giver, Phase 1 (benchmark) | 563,789 |
| 2026-07-25-giver, Phase 2 (generation) | 1,009,094 |
| 2026-07-25-kinbound | 457,268 |
| **Running total** | **2,030,151** |

**Branched scenes (the choice_node era).** Cost is dominated by per-call spec context (~50K), not output — so the working rule is **batch, don't split**: a choice_node's slots (2–3 player_lines + their 1–3 response lines) ride inside the scene's existing Content call and Verifier pass, landing a one-choice scene at roughly 1.1–1.2× the flat-scene 107K. Splitting the same slots into separate calls costs ~2×. Rejoin-by-default (`../narrative-pipeline/templates/choice-node-schema.md`) keeps QA's permutation walk linear in choice count — a structure guard that also happens to keep QA passes flat.

**Instrument the first branched run** to settle the open scene-mapping assumption (PAUSED item 4): the model above holds only if one Content call still covers one scene when the scene carries a choice. Log per-scene calls, slots per call, and revision counts; if a branched scene forces call-splitting, the batching rule — not the tracking — is what gets revisited.

## Operating rules

- **Call down, signal up.** The Orchestrator hands each worker its input and collects a typed output; workers never call each other, so each stays testable in isolation.
- **The human gate lives at the output.** A human reviews and approves; nothing ships unread, and a broken output is never silently swallowed.
- **Bounded work only.** Every agent does structured output, classification, or string-pattern work.
- **Scope the model to the task.** Use stronger reasoning models for orchestration, lower-tiered models for individual tasks. **Benchmarked, not assumed** (2026-07-25): the structure slot needs the stronger model — the cheaper one produced a card whose personality axes were not independent, the defect that makes a whole cast read as one character in different hats. The prose slot went the *other* way than expected: a prose-tuned model beat the general ones on a deliberately flat register, because holding that register is a cadence skill rather than a restraint problem. Both choices cost more than the alternative; quality decides, cost breaks ties.
- **Two revisions per item, then a human looks.** Any worker, any flag type, and the count **does not reset at a human gate**.
- **Every revision brief restates the full constraint set**, never only the defect. A brief that names one problem is an instruction to trade something else for it.
- **When handing down an axis that varies, state what stays constant.** A spread given without its invariant is an underspecification, and the crew will resolve it in whichever direction the words lean.

## Recommended workflow

The content pipeline runs in **steps**, each gated at its output — this list is the altitude summary of [`../narrative-pipeline/pipeline.md`](../narrative-pipeline/pipeline.md)'s 13 steps. ("Stages" are something else: the content classes in [`../narrative-pipeline/content-stages.md`](../narrative-pipeline/content-stages.md).)

1. **Steer.** Human directs the Narrative Director on intent and story arc — the per-arc doc: where each soul is heading, the threads to keep alive, and what the arc is *not*.
> **The Architect was split in two — RULED by Roc, 2026-08-06.** The Architect had grown to own six of thirteen pipeline steps, which broke the crew's own rule that each worker does bounded work, and concentrated risk: the 2026-07-25 run's failures were nearly all structural and nearly all came from that seat.
>
> | Seat | Owns |
> |---|---|
> | **Architect (soul)** | Card, arc, threads, thread shape, dependency order, **and how many conversations a thread gets** |
> | **Choice designer** | Conversations, gates and predicates, options, outcomes, fallbacks |
>
> The line is **what gets revealed** versus **when and how it can be reached** — different skills and different failure modes. Character work fails by being generic; structure work fails by being unreachable, and one reviewer cannot hold both standards at once. QA now checks the Choice designer's output rather than the Architect checking its own graph.
>
> **Proven on one thread before adoption**, per the plan doc's own condition. `toby-the-shelf` ran through it 2026-08-06: a separate instance working only from the brief and the contract independently reached two conclusions the Architect had deliberately withheld. **The finding worth carrying into the eight-soul batch: the seat's first pass produced correct, boring work — a contract that constrains only correctness gets exactly that. It needed rules about richness (size, shape variety, action-slot density) before it produced anything usable.**

2. **Schema.** The Narrative Architect fills the persona cards and the echo map. **The NPC codex is not the Architect's** (RULED 2026-08-09): Intake seeds it at arc start, Roc's gate ratifies every entry, the Orchestrator transcribes the ratified entry, and `tools/codex-lint.mjs` verifies it. The Architect authors cards; the codex indexes them. *[human gate]*
3. **Graph.** The Narrative Architect lays the scene graph as preconditioned encounters in its layout/graph pass — screen_specs, gates, choice_nodes — and code builds the IDs, conditions, and ink scaffold (the Orchestrator routes the pass; it generates nothing — reconciled 2026-07-29 with [`../narrative-pipeline/pipeline.md`](../narrative-pipeline/pipeline.md) step 6). *[human gate]*
4. **Prose.** **The Content Agent receives only two card fields** — `essence_descriptor` and `voice_register` — as prose to sound like (RULED 2026-08-08). The checkable half lives in a new `voice_enforcement` field that reaches the Verifier and never the generator, because a writer handed a checker's vocabulary writes to avoid flags instead of sounding like a person. Each card also declares a **per-soul length band** where its behaviour implies one; a soul without a declared band inherits the world median and drifts toward the tersest soul on the roster. The agent writes each line's `speaker_intent` **before** the line and writes the line to satisfy it. The Content Agent writes one slot at a time in the voice register, across the full dialogue graph — proposed lines for every node through to the end, not a partial batch (ruled 2026-08-02).
5. **Check.** Two deterministic gates run first and block on failure: `tools/card-lint.mjs` (pinned-field hygiene — no checker vocabulary, word budgets) and `tools/codex-lint.mjs` (every ratified codex claim traced to a committed file) and `tools/ref-lint.mjs` (every link, wikilink and cited path resolves to a file that exists), plus `tools/registry-lint.mjs` on the per-life thread registries. They are scripts, not agents, because the answers are deterministic. The Consistency Verifier flags the batch against the invariant set; an automated pass strips the AI tells and checks against [`../narrative-pipeline/register.md`](../narrative-pipeline/register.md).
5a. **Invention.** **Invented texture is licensed, not barred (RULED 2026-08-09).** The Content Agent checks the NPC codex first and reuses an existing soul, walk-on or fact where one fits; where nothing fits it may invent, and must declare what it invented, typed — prop, offstage person, or world fact. The Verifier carries a third disposition, **PROPOSE**: a legal invention is a candidate for canon rather than a defect. Roc's gate ratifies or revises; ratified entries enter the codex with the arc they originated in. Quantities ("eleven jars") are scene colour, bind nothing, and need no declaration. Guardrails check 12 owns the flags. This is how the town's lore accumulates on purpose instead of leaking in.

6. **QA.** The Playtest Agent confirms the slice is traversable and every interaction works.
7. **Approve.** A human approves every line at the output. Nothing ships unread.

## Worked example: one decision through the crew

To show *call down, signal up* end-to-end rather than in principle, one player action — casting **ignite** — was run for real through the crew against seven receivers on 2026-07-26. Full agent-by-agent trail, every flag, and the pipeline gaps it exposed: [`../pipeline-runs/2026-07-26-ignite-trace/`](../pipeline-runs/2026-07-26-ignite-trace/).

The Orchestrator's first move is classification, not generation — a cast doesn't automatically invoke the crew:

| Receiver | Class | Crew involved |
|---|---|---|
| Stick, hedge, furnace, bread | Inert prop | None — resolved by world/physics logic directly |
| Cat | Creature, no persona card | Content/Dialogue only (Architect skipped — nothing to pull) |
| Toby, Ilsa | Soul, persona card exists | Full chain — Architect → Content → Verifier → QA |

Roc's gate then ruled on the crew's outputs — overriding one line, nulling another — to reach the shipped result:

| Receiver | Outcome | Reaction |
|---|---|---|
| Stick | Catches | **[action]** The stick catches at the tip and holds a small, steady flame. |
| Hedge | Catches, clears the obstacle | **[action]** The hedge catches along its dry inner branches. Smoke rises first, then the flame burns through, opening the path it had blocked. |
| Furnace | State-dependent | **[action]** Unlit, stocked: the banked fuel catches and the furnace lights, draft picking up. Already lit: nothing changes — the furnace is already burning. |
| Bread | Scorches, does not catch | **[action]** The crust blackens and curls at the edges; the loaf is ruined, no flame catches. **If Toby is present:** "What did you do that for?" |
| Cat | No physical effect | **[action]** The spell's light washes over the cat's fur and fades without catching. The cat flattens, ears back, bolts under the fence, and stops. It watches from there, then bends to groom its ruffled fur. |
| Toby (direct cast) | No physical effect | "Save that for the oven." |
| Ilsa (direct cast) | No physical effect | *(null — no reaction)* |

Every worker took its input from the Orchestrator and returned a typed output; nothing shipped unread — *call down, signal up*, with no worker-to-worker calls.

## Build-time agent-to-component plan

Which agent builds each component, and the human role at each gate.

| Component                                                               | Build agent(s)                      | Human role                                            |
| ----------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Orchestration + session-state bus                                       | Orchestrator                         | Frames scope, reads surfaced gates                     |
| Steering / arc doc                                                      | Narrative Director                   | Ratifies the arc doc before it propagates              |
| Persona cards + echo map                                                | Narrative Architect                  | Hard gate: reviews cards + echo map                    |
| Player-facing text (dialogue, lore, echoes)                             | Content / Dialogue Agent             | Reviews flagged / echo / retrospective lines            |
| Consistency check vs. canon                                             | Consistency Verifier                 | Signs off every flag                                   |
| Level / gate layout → scene graph                                       | Human → Narrative Architect → code → QA Agent | Human authors layout intent; Architect formalizes (screen_specs, graph, choice_nodes); code assembles; QA validates traversal; Roc gates |
| Traversal / reachability QA                                             | QA / Playtest Agent                  | Triages flags; human playtest is the fun signal         |
| Style guide (color grammar + silhouette vocab)                          | Style / Art-Direction Agent          | Single review eye signs off flags                      |
| Audio tag contract (GameplayTags → Wwise)                               | Audio-Tag Agent — see [`10-audio.md`](10-audio.md) | Soft gate: library delta auto-commits on no objection |
| Schedule + review-queue tracking                                        | Production / PM Agent                | Human decides on flags and scope-cut recommendations    |
| **Engineering track (persistence · ink↔UE · tag-to-asset · save/load)** | **Human, AI-assisted**               | Human owns architecture; AI assists, never decides       |

**The Engineering track** is human-owned with AI assist. The persistence save is load-bearing (see [`06-world-and-progression.md`](06-world-and-progression.md)), and the pillar says AI never decides architecture, so a human owns it and AI assists. A **week-1 save/load smoke test** proves the reshuffle carries state before any content depends on it. The two parallel build tracks (Track A: narrative proof, Track B: visual/asset build) are described in [`12-technical-overview.md`](12-technical-overview.md).
