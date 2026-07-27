# AI Agents & Pipeline

The dev-crew roster, token budgets, operating rules, the workflow, a worked example, and the build-time agent-to-component plan. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. This file names the crew and its I/O contract; [`../narrative-pipeline/CONTEXT.md`](../narrative-pipeline/CONTEXT.md) is the full working spec for how the narrative agents actually run.

A small, human-gated crew turns approved GDD decisions into game content and validates it — one agent per feature, each doing bounded, structured work.

## The roster

| Agent                     | Input                                                                         | Output / Responsibility                                                                                                                                                                                      | Token Budget |
| ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Orchestrator**          | Session goal, pipeline stage, arc-doc + NPC-codex refs, human authored intent | Sequences the crew: hands each worker its input, collects the typed output, and surfaces the human gates. Resolves conflicts when outputs disagree.                                                          | 200K         |
| **Narrative Director**    | Corpus lore, roster seeds, human steering intent                              | Steering — surfaces corpus lore, proposes the arc-doc fields + generative tables, drafts the arc doc for Roc's ratification. Distinct from the Architect: Director sets *direction*, Architect builds *structure* from the ratified arc doc. Full role prompt: [`../narrative-pipeline/agents/narrative-director.md`](../narrative-pipeline/agents/narrative-director.md). | not yet budgeted |
| **Narrative Architect**   | NPC descriptions, scene list, voice guide                                     | Story structure: persona cards, the seed→payoff echo map, and the NPC codex of locked facts. Writes no player-facing lines. | 300K         |
| **Content / Dialogue**    | Persona card, scene context, tone enum, output from Narrative Architect       | All player-facing text — NPC lines, lore, descriptions.                                                                                                                                                      | 700K         |
| **Consistency Verifier**  | New lines, active canon, the 8 locked invariants                              | Flags each batch against the invariant set + voice register. Flags only — never rewrites.                                                                                                                    | 300K         |
| **QA / Playtest**         | Scene graph, gates, interaction specs                                         | Verifies the assembled slice is traversable and works as specced: no soft-locks, dead-ends, or unreachable wins. Flags only.                                                                                 | 250K         |
| **Style / Art-Direction** | New assets, palette bands, silhouette vocabulary                              | Checks each art variant against the color grammar + silhouette rules; flags palette drift and silhouette breaks. Full system + schema: [`09-art-direction.md`](09-art-direction.md). | 100K         |
| **Production / PM**       | Milestone calendar, task status, review-queue depth, remaining time           | Maintains the backlog, tracks the human-review queue, flags the unscheduled review-week and back-loaded work, and produces a weekly readiness summary. Makes no design or content decisions; surfaces risk and sequencing to the human. | 50K          |

**Note on the Narrative Director.** This agent runs in `narrative-pipeline/agents/` and owns Stage 1 (Arc), but earlier GDD drafts (v4, v5) never listed it in the roster table above — an accuracy gap fixed by this restructure. See [`../narrative-pipeline/agents/README.md`](../narrative-pipeline/agents/README.md) for the "Director vs. Architect" distinction.

**Production / PM Agent, in detail.** Owns the schedule, not the content: maintains the milestone-aligned backlog, tracks the human-review queue (the load-bearing bottleneck — see the measured-cost breakdown below), flags the unscheduled review-week and back-loaded work, and produces a weekly readiness summary. Makes no design or content decisions.
- *In:* `{ milestone_calendar, task_status, review_queue_depth, remaining_time }`
- *Out:* `{ prioritized_backlog, scope_cut_recommendations, review_week_flags, readiness_summary }`
- *When:* weekly, and at each milestone boundary. *Gate:* advisory only; the human decides.

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

## Operating rules

- **Call down, signal up.** The Orchestrator hands each worker its input and collects a typed output; workers never call each other, so each stays testable in isolation.
- **The human gate lives at the output.** A human reviews and approves; nothing ships unread, and a broken output is never silently swallowed.
- **Bounded work only.** Every agent does structured output, classification, or string-pattern work.
- **Scope the model to the task.** Use stronger reasoning models for orchestration, lower-tiered models for individual tasks. **Benchmarked, not assumed** (2026-07-25): the structure slot needs the stronger model — the cheaper one produced a card whose personality axes were not independent, the defect that makes a whole cast read as one character in different hats. The prose slot went the *other* way than expected: a prose-tuned model beat the general ones on a deliberately flat register, because holding that register is a cadence skill rather than a restraint problem. Both choices cost more than the alternative; quality decides, cost breaks ties.
- **Two revisions per item, then a human looks.** Any worker, any flag type, and the count **does not reset at a human gate**.
- **Every revision brief restates the full constraint set**, never only the defect. A brief that names one problem is an instruction to trade something else for it.
- **When handing down an axis that varies, state what stays constant.** A spread given without its invariant is an underspecification, and the crew will resolve it in whichever direction the words lean.

## Recommended workflow

The content pipeline runs in stages, each gated at its output:

1. **Steer.** Human directs the Narrative Director on intent and story arc — the per-arc doc: where each soul is heading, the threads to keep alive, and what the arc is *not*.
2. **Schema.** The Narrative Architect fills the persona cards, the echo map, and the NPC codex. *[human gate]*
3. **Graph.** Orchestrator lays the scene graph as preconditioned encounters, and specs each gate.
4. **Prose.** The Content Agent writes one slot at a time in the voice register.
5. **Check.** The Consistency Verifier flags the batch against the invariant set; an automated pass strips the AI tells and checks against [`../narrative-pipeline/register.md`](../narrative-pipeline/register.md).
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
| Level / gate layout → scene graph                                       | Human → QA Agent                     | Human authors layout; QA validates traversal            |
| Traversal / reachability QA                                             | QA / Playtest Agent                  | Triages flags; human playtest is the fun signal         |
| Style guide (color grammar + silhouette vocab)                          | Style / Art-Direction Agent          | Single review eye signs off flags                      |
| Audio tag contract (GameplayTags → Wwise)                               | Audio-Tag Agent — see [`10-audio.md`](10-audio.md) | Soft gate: library delta auto-commits on no objection |
| Schedule + review-queue tracking                                        | Production / PM Agent                | Human decides on flags and scope-cut recommendations    |
| **Engineering track (persistence · ink↔UE · tag-to-asset · save/load)** | **Human, AI-assisted**               | Human owns architecture; AI assists, never decides       |

**The Engineering track** is human-owned with AI assist. The persistence save is load-bearing (see [`06-world-and-progression.md`](06-world-and-progression.md)), and the pillar says AI never decides architecture, so a human owns it and AI assists. A **week-1 save/load smoke test** proves the reshuffle carries state before any content depends on it. The two parallel build tracks (Track A: narrative proof, Track B: visual/asset build) are described in [`12-technical-overview.md`](12-technical-overview.md).
