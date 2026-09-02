# Agent Contract Audit — the rubric

Audits the seat contracts in this directory and in [`../narrative-pipeline/agents/`](../narrative-pipeline/agents/). Adapted from Anthropic's skill-authoring guidance, which targets skills discovered from a metadata pool; these are seats dispatched by name, so four of its criteria are dropped (see **Out of scope**).

**When to run:** after any contract is edited, and at a gate or sprint boundary. Contracts drift fastest right after a ruling, when the Ruling Promoter has written a new rule into three files and the terminology has not yet settled.

**Output:** one table per contract, plus one set-wide section. Findings only — this audit rewrites nothing.

---

## Band 1 — Blocking

A fail here can break a live run.

### 1.1 Degrees of freedom match task fragility

Specificity should track how fragile the task is. Fragile and sequence-dependent → exact steps, no deviation. Judgment-dependent with several valid routes → direction and heuristics, then trust the seat.

- **Pass:** a recording or applying seat reads as locked (exact commands, "never decide"); a designing or judging seat reads as directional.
- **Fail:** a judgment seat carries step-by-step prescription it cannot follow when context differs, or a fragile seat leaves the sequence to the agent.

### 1.2 Trigger clarity

The **Feature owned** and **When called** lines must be enough to pick this seat over its neighbours without reading either body.

- **Pass:** a dispatcher reading only those two lines routes correctly.
- **Fail:** two contracts' trigger lines both fit the same call.

### 1.3 Escape hatch present and typed

Every seat needs a bounded way to say "this is outside me" — `needs_roc`, `uncovered`, `PROPOSE`. The alternative is a seat that guesses, and a guess from a recording seat is indistinguishable from a ruling.

- **Pass:** a named field in the return schema, with a stated rule for what routes there.
- **Fail:** no hatch, or a hatch with no criterion for using it.

### 1.4 Reference depth ≤ 1

A file reached through another file gets partially read, so a rule two hops out is a rule that may not arrive.

- **Pass:** every binding rule is in the contract or one file it links directly.
- **Fail:** a contract links a file that defers to a third file for the actual rule.

---

## Band 2 — Drift

A fail here is invisible today and wrong in a month.

### 2.1 Terminology consistency

One term per concept, held across the contract.

- **Pass:** the same word every time — flag, or defect, not both.
- **Fail:** a concept named two ways in one file. (Cross-file drift is **S.1**, below.)

### 2.2 No time-sensitive information in the instruction path

Dates belong to two different jobs and only one of them is an instruction.

- **Pass:** a date appears because the agent applies it — a retention rule that differs by ruling, an invariant dated because two versions are live.
- **Fail:** a date is changelog — "added 2026-08-08; reworded 2026-08-09" — sitting in the runtime instruction. It moves to **Why these rules** (below).

### 2.3 Verification step present

The validator loop: run the check, fix, repeat, and only then report.

- **Pass:** a named check the seat must clear before returning (`content-check.mjs`, a reread against a checklist).
- **Fail:** the seat produces output and reports with nothing between.

---

## Band 3 — Cost

A fail here spends context without buying behaviour.

### 3.1 Instruction vs justification separated

Every paragraph is one of two things: something the agent needs while working, or something a human needs once to trust the rule.

- **Pass:** the body is instruction; justification sits in **Why these rules**.
- **Fail:** runtime reasoning addressed to Roc rather than to the seat executing.

### 3.2 A default, not a menu

- **Pass:** one approach named, with an escape hatch for the case that breaks it.
- **Fail:** several approaches offered with no default, leaving the choice to be re-litigated every call.

### 3.3 Every rule traces to an observed failure

A rule that prevents nothing that has happened is a rule guessing at a future.

- **Pass:** each rule maps to a run, gate, or session where its absence cost something.
- **Fail:** a rule with no traceable origin — a candidate to cut, not automatically a cut.

---

## Set-wide checks

These cannot be judged one file at a time. Run once over all contracts.

### S.1 Cross-contract terminology

The same concept named differently across seats — seat / agent / satellite, flag / defect, record / item / card. Report each concept with the variants and their files, then name the term that wins.

### S.2 Seat overlap

Two contracts whose triggers admit the same call. Report the pair and which claim is weaker.

### S.3 Coverage gaps

A defect class no seat owns. The Consistency Verifier's `uncovered` returns are the primary evidence — an `uncovered` flag that recurs is a missing seat or a missing check, not a one-off.

### S.4 Shared-file consistency

Where several contracts bind to one file (`../narrative-pipeline/guardrails.md`, a schema), confirm they describe it the same way. One contract's stale summary of a shared file outranks the file for whoever reads that contract.

### S.5 One home per origin story

An **origin story** is the incident a rule traces to — the run that failed, the measurement, the line Roc cut at a gate. Criterion 3.3 requires each rule to carry that trace, and S.5 bounds it: **the story is told in full in exactly one place; every other contract that needs it cites that place in a clause.**

Check by picking two or three of the set's load-bearing incidents and grepping for them. If the same measurement is narrated in three documents, two of those narrations are cost — the rule is already in force in all three, and only one reader needs the story.

*Found by running this rubric on 2026-08-09: the pipeline's "banning six constructions produced fourteen" experiment was told in full in three separate contracts. No existing criterion caught it. S.4 covers a contract's stale **description** of a shared file; this covers the same **rationale** narrated in several homes, which is a different defect and the noisier one.*

**Not a licence to strip traces.** A rule with no trace anywhere fails 3.3. The fix for repetition is a citation, never deletion.

---

## The rationale-split convention

Criteria 2.2 and 3.1 pull against 3.3: strip the history, but keep every rule traceable. Both survive if the provenance leaves the instruction path instead of the file.

Each contract ends with:

```markdown
## Why these rules

<details>
<summary>Origin and history</summary>

- **<rule>** — <the run, gate or session that produced it, dated>
- **<rule>** — <what failed without it>

</details>
```

Runtime instructions stay tight; the design record survives. A rule the agent applies *by date* stays in the body — the split is by function, not by whether a date appears.

---

## Report template

Per contract:

| # | Criterion | Verdict | Note |
|---|---|---|---|
| 1.1 | Freedom matches fragility | pass / fail / n-a | |
| 1.2 | Trigger clarity | | |
| 1.3 | Escape hatch | | |
| 1.4 | Reference depth | | |
| 2.1 | Terminology consistency | | |
| 2.2 | No changelog in instructions | | |
| 2.3 | Verification step | | |
| 3.1 | Instruction vs justification | | |
| 3.2 | Default not menu | | |
| 3.3 | Rules trace to failures | | |

Then, once for the set:

| # | Check | Finding |
|---|---|---|
| S.1 | Cross-contract terminology | |
| S.2 | Seat overlap | |
| S.3 | Coverage gaps | |
| S.4 | Shared-file consistency | |
| S.5 | One home per origin story | |

Order findings by band. A Band 1 fail is fixed before the seat runs again; Band 2 and 3 are queued.

---

## Out of scope

Recorded so they are not re-derived:

- **YAML frontmatter (`name` / `description`)** — these seats are dispatched by the Orchestrator or by Roc, not selected from a metadata pool.
- **500-line ceiling** — the longest contract is 165 lines.
- **Gerund naming ("Processing PDFs")** — noun-phrase role names are correct for seats.
- **Script error-handling guidance** — contracts are markdown; this applies to `../tools/`, not here.
