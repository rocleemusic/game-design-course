# Orchestrator — the driver (run protocol)

**Not a subagent** — this is the protocol the run-driver (Claude, this session) follows to sequence the crew. Feature owned: **sequencing + gate-keeping**. No content, no creative decisions.

**Principles** (`../../knowledge-base/synthesis/dev-crew-architecture.md` §1):
- **Call down, signal up.** Hand each worker a prepared input. Collect a typed output. Workers never call each other.
- **Human gate at the output.** Surface gates to Roc. Never silently swallow a broken output.
- **Bounded work only.** Each worker does structured output, classification, or string-pattern work.

**Per-run protocol:**
1. Frame the stage (from [`../content-stages.md`](../content-stages.md)) and the one-sentence session goal.
2. For each worker in sequence:
   - Assemble its input bundle — only what it needs (the prepared context).
   - **Pinning rule (2026-08-08).** A Content bundle carries exactly two card fields: `essence_descriptor` and `voice_register`. `voice_enforcement` goes to the Verifier only. Run `node tools/card-lint.mjs` before any generation pass; a lint failure blocks dispatch. **Run `node tools/ref-lint.mjs` after any pass that adds or moves a document** (2026-08-09) — it fails when a link, wikilink or cited path names something that does not exist. Its unreferenced-notes report is a trend report, not a gate.
   - Dispatch it as an **isolated subagent**.
   - Collect the typed output.
   - Write both to the run-log.
3. **Route flags** (everything routes through here):
   - Prose flag → back to the Content Agent (≤2 revisions, model fallback allowed).
   - Structural flag (bad echo, essence contradiction) → back to the Narrative Architect as a new prepared input.
4. Surface the **human gate** at the batch output. Nothing ships unread. The gate does not move mid-chain.
   - **You write the codex, and the lint verifies it (2026-08-09).** When Roc ratifies a proposed invention, **you** transcribe it into `../npc-codex.md` — status, origin arc, and the committed source it came from. You write nothing creative here; you record a decision that has already been made. Then run `node tools/codex-lint.mjs`. It fails if a ratified entry quotes a line that appears in no committed file, cites a file that does not exist, duplicates an id, or sits under the wrong heading. **Run it after every codex write and before any pass that reads the codex** — Content and the Verifier both read it, so a bad entry propagates immediately.
   - **Harvest the gate (added 2026-08-08).** After Roc edits a batch, diff his lines against the generated ones. Three or more edits sharing a shape is a contract gap, not a batch of one-off fixes: surface it at the same gate as a candidate before/after entry for `../register.md` § "Harvested from Roc's hand pass". A ruling that never reaches a contract gets re-violated next batch.
5. Capture the full call-down / signal-up trail as the run-log artifact under `../../pipeline-runs/`.

**Stage-2 (NPC) sequence:** Narrative Architect (cards + echoes) → Content (sample lines, for the distinctness read) → Consistency Verifier → *(QA light — no scene graph yet)* → **Roc's gate**.

**You produce:** an updated run-log + the surfaced gate prompts awaiting Roc's sign-off.

## Why these rules

<details>
<summary>Origin and history</summary>

- **Pinning rule** — a generator handed a checker's vocabulary writes to avoid flags instead of writing to sound like a person; the enforcement/register split was made 2026-08-08 for this reason (`../templates/persona-card-schema.md`).
- **ref-lint** — the ex-shelf defect: `ex-shelf` was declared load-bearing, never built, and survived a design pass, a review, two line-writing passes and three QA walks before 2026-08-09.
- **codex-lint after every write** — the seeding pass on 2026-08-09 put a fabricated quote into a ratified entry on the codex's first day.
- **Harvest the gate** — 26 hand edits on the C2/C4 batch (2026-08-08) changed nothing for two days because no seat owned this step.

</details>
