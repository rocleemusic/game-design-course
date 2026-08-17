# Festival of Souls — Game Design Course

Assignment staging area for [Festival of Souls](gdd/01-concept.md), a cozy roguelite point-and-click adventure. This repo holds coursework submissions built from the full design/build spec, which is developed and maintained separately.

## Contents

| Path | What it is |
|---|---|
| [`RocLee-GDD-v10.pdf`](RocLee-GDD-v10.pdf) | Full GDD (v10), compiled to PDF from the 13 files in `gdd/` |
| [`RocLee-GDD-v10-summary.pdf`](RocLee-GDD-v10-summary.pdf) | Printable pitch summary of the GDD (v10) — condensed for an external/collaborator read |
| [`gdd/`](gdd/CONTEXT.md) | The full design-and-build spec, split into 13 linked files (concept, pillars, core loop, magic system, cast, levels, AI pipeline, scope/risks, etc.) |
| [`assignment-03/`](assignment-03/README.md) | Dev-crew agent role prompts — runnable specs for the Narrative Director, Orchestrator, Narrative Architect, Content/Dialogue, Consistency Verifier, and QA/Playtest agents |
| [`assignment-04/`](assignment-04/README.md) | Pipeline benchmark run — model-arm comparison plus full generation runs for two souls (Toby the Giver, Ilsa the Kinbound), with results and run logs |
| [`assignment-05/`](assignment-05/assignment-5/roc-lee-rebirth-assignment-5-readme.md) | Goal-oriented coding agents — a one-shot `/goal` run that proved ink-in-Unreal integration, plus the Choice Designer agent that builds branching dialogue graphs |
| [`assignment-06/`](assignment-06/roc-lee-rebirth-README.md) | GER pipeline — runnable Generator / Evaluator / Refiner / Circuit Breaker over one NPC dialogue slot, enforcing guardrails check 6 (voice register) with a 2-revision cap and a structural exit |
| [`assignment-07/`](assignment-07/roc-lee-rebirth-README.md) | Style Guide Agent — the game's five written constraint types ([`style-guide.md`](assignment-07/style-guide.md)), a three-layer evaluator scoring distance from those rules, and a recorded run catching a real lore contradiction that was sitting in the game repo |

## The game, briefly

You play a mage who arrives in a town before the Festival of Souls — a night when the Lantern Arch lights the way for souls to return so their loved ones can remember them. You forage, craft, learn folk magic, and build bonds across many festivals in one life. Starting a new life reshuffles every soul's role in town (essence and personality stay fixed), so the same cast tells a different story each time. Festival night resolves as a spectrum — Quiet, Warm, Grand, and a rare top tier — driven by how much of the town's collective work got done and which bonds got deepened. There's no hard-lose: every festival ends with something.

Full details live in [`gdd/`](gdd/CONTEXT.md), starting with [`01-concept.md`](gdd/01-concept.md).
