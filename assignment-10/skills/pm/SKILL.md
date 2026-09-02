---
name: pm
description: Run the Production/PM agent for the game-project — reconcile the Paca board, measure the review queue, audit track parallelism, check milestone burn against the 2026-08-25 capstone, and write a readiness summary. Use when Roc says "/pm", "run the PM agent", "what's the board look like", "are we on track", "readiness check", "what should I work on next" in a game-project context, or at a sprint boundary. Do NOT use during a narrative content run.
---

# Production / PM agent

Dispatches the project-level PM seat defined at `ProjectOS/game-project/agents/production-pm.md`.

## How to run it

1. **Read the role prompt** — `ProjectOS/game-project/agents/production-pm.md`. It is the contract; this file is only the launcher.

2. **Launch it as an isolated subagent** via the Agent tool, `subagent_type: "general-purpose"`. Do **not** run it inline in the main session — the seat exists to hold delivery state separately from whatever else the session is doing, and inlining it defeats that.

3. **The subagent prompt must contain**, verbatim:
   - the full text of `production-pm.md`
   - today's date
   - the Paca project id `5db8b37f-8976-49be-9d30-106c53c48303` (prefix `GP`)
   - anything this session changed that the board may not know about yet
   - this boundary line: *You may read files only under `ProjectOS/game-project/`. You may write nothing to disk. Your only writes are Paca MCP calls against project `game-project`.*

4. **Report back to Roc** the `readiness_summary`, the review-queue numbers, any milestone that is not `ON_TRACK`, every entry in `approval_required`, and every `track_parallelism.breaches` entry. Relay these — the subagent's output is not shown to Roc.

## Authority — the line that matters

**Ungated:** creating tasks, updating status, adding comments, writing the readiness doc.

**Requires Roc's explicit approval, every time:** scope cuts, due-date changes, priority reshuffles.

If the agent returns a non-empty `approval_required`, surface each item as a question and **do not act on any of them** until Roc rules. Ruled by Roc 2026-08-01; amends the GDD's original "advisory only" (`gdd/11-ai-agents-and-pipeline.md:26`, the *Gate:* row).

## Scope

Only `ProjectOS/game-project/` and only the `game-project` Paca project. Never another project, never another directory, never the repo root.

The agent reads markdown and writes none. **Status lives in Paca; markdown holds reasoning.** If the agent proposes writing a status into a markdown file, that is the failure this seat was built to end — refuse it.

## Cadence

Weekly on Sunday, at each sprint boundary, and on demand after a session that changed the board. **Never during a narrative content run** — it would pollute the run log.

## Sanctioned cross-track links

Exactly three `blocks` links may cross `track:B-tool` → `track:A-story`: the `gather_line` render (GP-18), the `divert_to` address (GP-19), the ungated set-up line (GP-20). A fourth is a parallelism breach — the agent flags it, Roc rules on it, and nobody resolves it silently.
