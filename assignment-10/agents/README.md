# Agents — project-level seats

Runnable role prompts for agents that serve **the project as a whole** rather than a step in the narrative pipeline. Each is handed to an isolated subagent so it has only its role's context and returns a typed output.

The distinction that decides which directory a seat lives in:

| This directory | [`../narrative-pipeline/agents/`](../narrative-pipeline/agents/) |
|---|---|
| Runs no pipeline step | Runs a numbered step of `pipeline.md` |
| The Orchestrator never dispatches it | Dispatched by the Orchestrator, call-down/signal-up |
| Roc talks to it directly | Receives a prepared input, returns a typed output to the Orchestrator |
| Spans tracks and weeks | Scoped to one content batch |

| Agent | File | Feature owned | When |
|---|---|---|---|
| **Production / PM** | [`production-pm.md`](production-pm.md) | Delivery state — backlog, review queue, milestone risk, scope-cut recommendations | Weekly (Sunday) + sprint boundaries |
| **Role Spell Designer** | [`role-spell-designer.md`](role-spell-designer.md) | Three spells per role, derived from that role's festival goal and daily work | On demand, one role per call |
| **Component Item Designer** | [`component-item-designer.md`](component-item-designer.md) | The items that satisfy a gated spell batch's `component_requirements` | After a spell batch clears its gate |
| **Gate Recorder** | [`gate-recorder.md`](gate-recorder.md) | A ruling written into the records — statuses, roll-ups, indexes. Decides nothing | Immediately after Roc rules on a batch |
| **Ruling Promoter** | [`ruling-promoter.md`](ruling-promoter.md) | The same ruling written into the *contracts*, so the next run needs no correction | After the Gate Recorder, same pass |
| **Stale Rule Auditor** | [`stale-rule-auditor.md`](stale-rule-auditor.md) | The sentences a ruling just made false. Flags only | Second half of a promotion pass |
| **Systems Documentarian** | [`systems-documentarian.md`](systems-documentarian.md) | The `phaser/src/` architecture record — mermaid seam diagram + module/interface table, regenerated from disk | Stage boundaries, or after a module gains/loses a public interface |
| **Assignment Scout** | [`assignment-scout.md`](assignment-scout.md) | Candidate work toward a future `game-design-course` assignment, and the BEFORE half of every before/after | End of any session that built or changed something |
| **UI Builder** | [`ui-builder.md`](ui-builder.md) | One game UI screen, from mockup + spec to a shipped Phaser scene matching the design system | A new screen to build, or a fix pass from the UI Verifier |
| **UI Verifier** | [`ui-verifier.md`](ui-verifier.md) | The fidelity-and-gate verdict on a built UI screen — findings only, never fixes | After a UI Builder handoff, or directly on an existing screen |
| **QA Adversary** | [`qa-adversary.md`](qa-adversary.md) | Whether the build breaks under abuse — 250 headless steps of deliberately invalid input, triaged. Findings only, never fixes | Build-phase boundaries · before content freeze · before the capstone · after any change to save, gates, inventory, cast or the day loop |
| **Audio Implementer** | [`audio-implementer/`](audio-implementer/) | Every sound in the build — proposes interactions that need one, tracks them in a ledger, wires up what Roc drops in `staging/`, routed through the Music/SFX/Ambience/Spell-Cast buses that back `OptionsScene`'s Sound category | On demand — run the propose stage when starting a new sweep, the wire stage whenever `staging/` has files waiting |

## The gate trio

The last three run together, in order, and they exist because a ruling has **three** landing places, not one:

| Where the ruling lands | Seat | If skipped |
|---|---|---|
| The **data** | Gate Recorder | Stale indexes; roll-ups that keep rejected work alive |
| The **contracts** | Ruling Promoter | The next run emits the old shape and is corrected again |
| The **rules the ruling falsified** | Stale Rule Auditor | A contract still asserts something now untrue, and a run obeys it correctly |

Skipping the third is the least visible and the most expensive: a falsified rule reads as authoritative, so nothing downstream treats it as suspect.

**A fourth check is deterministic and is not a seat.** `node tools/content-check.mjs` verifies that every id resolves, every reverse index matches, no item is orphaned, no `world` item is collectible, and no soul exceeds the two-key-item slice cap. An agent would re-derive those answers each run and could get them wrong; a script cannot. The Gate Recorder must see it exit clean before it reports.

The crew-wide roster, with I/O contracts and token budgets for every seat including the narrative ones, is [`../gdd/11-ai-agents-and-pipeline.md`](../gdd/11-ai-agents-and-pipeline.md).

## Auditing a contract

[`contract-audit.md`](contract-audit.md) is the rubric every seat contract is held to — the ones in this directory **and** the pipeline seats in [`../narrative-pipeline/agents/`](../narrative-pipeline/agents/). Ten criteria in three bands (blocking · drift · cost), plus four set-wide checks that cannot be judged one file at a time: terminology drift, seat overlap, coverage gaps, and shared-file consistency.

Run it after any contract is edited, and at a gate or sprint boundary — contracts drift fastest right after a ruling, when the same new rule has just been written into three files. **The run is manual;** no seat invokes it and nothing enforces it.

## The UI pair

The **UI Builder** and **UI Verifier** run as a build↔verify loop, and they are two
seats for the same reason a builder never grades its own work: the Verifier is an
independent check. The loop enters at either seat — **build-first** for a new or
redesigned screen (Builder builds → Verifier grades → fix loop), or **verify-first**
for a screen already in the tree (Verifier grades as-is → findings → Builder fixes).
The Verifier's `fixes` array is the Builder's fix-pass input verbatim; the loop runs
until the verdict is `clean`, then Roc gates the result. Both judge fidelity against
one design system — `gdd/14-visual-style-guide.md` and its rendered `design-system.html`.

## The QA pair

The **QA Adversary** and the **UI Builder** run the same build-fix loop the UI pair
does, entered from the other end: the Adversary attacks the build, and its `fixes`
array is the Builder's fix-pass input verbatim. Two seats for the same reason — the
seat that breaks the game is not allowed to be the seat that repairs it.

It is a seat and not just a script for the reason its contract states: the script half
is deterministic (`phaser/tools/adversary/run.mjs`, seeded, replayable), and the
judgment half is not. A raw run cannot tell a real defect from a consequence of its own
deliberate bypass, from a time gate shutting behind the player, from a mechanic nobody
has ruled on. Filing all four as "blocking" teaches the team to stop reading the report.

Everything else in `phaser/tools/` plays the game CORRECTLY — `walk` walks the week,
`sweep` drives all 89 cast pairs, the 33 `playtest/` scenarios each replay a known-good
flow, and 743 unit tests cover the pure seams. None of them sends bad input. That gap is
what this seat owns.

## Adding a seat

A new seat needs **a clear, distinct why and a passing capability check** — not a guess that "an agent could help" ([`../knowledge-base/synthesis/dev-crew-architecture.md`](../knowledge-base/synthesis/dev-crew-architecture.md) §1). Absorption beats proliferation: where two concerns are really one feature, they share an agent.

§8A of that document names the expansion candidates. The Production/PM seat was one of them, and its stated *Watch* — "it overlaps the orchestrator's sequencing; keep it a separate seat only if task tracking/reporting is a distinct load from run-time routing" — is what this directory answers. The Orchestrator sequences content runs inside one session; the PM tracks work across weeks and five tracks, including the Unreal build the pipeline never touches. Distinct load, so it earns a seat — beside the pipeline, not inside it.

**Audio Implementer** was the other named candidate. It's staffed now, in
[`audio-implementer/`](audio-implementer/) — the one seat here with a folder
instead of a single file, because its loop (propose → human makes the sound →
stage → wire) carries state across sessions that a stateless role-prompt can't
hold.
