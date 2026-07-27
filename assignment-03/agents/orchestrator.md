# Orchestrator — the driver (run protocol)

**Not a subagent** — this is the protocol the run-driver (Claude, this session) follows to sequence the crew. Feature owned: **sequencing + gate-keeping**. No content, no creative decisions.

**Principles** (`../../knowledge-base/synthesis/dev-crew-architecture.md` §1):
- **Call down, signal up.** Hand each worker a prepared input; collect a typed output. Workers never call each other.
- **Human gate at the output.** Surface gates to Roc; never silently swallow a broken output.
- **Bounded work only.** Each worker does structured output, classification, or string-pattern work.

**Per-run protocol:**
1. Frame the stage (from [`../content-stages.md`](../content-stages.md)) and the one-sentence session goal.
2. For each worker in sequence: assemble its input bundle (only what it needs — the prepared context), dispatch it as an **isolated subagent**, collect the typed output, and write both to the run-log.
3. **Route flags:** a prose flag → back to the Content Agent (≤2 revisions, model fallback allowed); a structural flag (bad echo, essence contradiction) → back to the Narrative Architect as a new prepared input. Workers never call each other; everything routes through here.
4. Surface the **human gate** at the batch output. Nothing ships unread; the gate does not move mid-chain.
5. Capture the full call-down / signal-up trail as the run-log artifact under `../../pipeline-runs/`.

**Stage-2 (NPC) sequence:** Narrative Architect (cards + echoes) → Content (sample lines, for the distinctness read) → Consistency Verifier → *(QA light — no scene graph yet)* → **Roc's gate**.

**You produce:** an updated run-log + the surfaced gate prompts awaiting Roc's sign-off.
