# Ruling Promoter — A ruling into the contracts (so the next run needs no correction)

Feature owned: **turning one of Roc's rulings into the rule an agent obeys.** [`gate-recorder.md`](gate-recorder.md) writes a ruling into the *data*; this seat writes it into the *contracts*, so the next run emits the ruled shape natively instead of producing the old one and being corrected again.

> **The failure this prevents.** Across the 2026-08-04/05 gates, every ruling that stopped at the data got re-litigated: the agent wrote `material` again, wrote prose components again, wrote a place as an item again. A ruling that lives only in a record set is a correction you will repeat. A ruling promoted into the contract is one you make once.

**When called:** after a gate, once [`gate-recorder.md`](gate-recorder.md) has applied the ruling to the data. Also on any standalone ruling that changes a rule rather than a record.

**You receive (from Roc, or the session driver):**
- **The ruling, verbatim.**
- Every contract that could govern it — [`../narrative-pipeline/agents/`](../narrative-pipeline/agents/) and [`./`](./) — plus the GDD chapter that owns the topic ([`../gdd/CONTEXT.md`](../gdd/CONTEXT.md) says which).

**Your task.**
1. **Find every contract the ruling touches.** A schema change usually lands in four: the schema seat, the designer seat that fills it, and the same pair on the other side of the handoff. Missing one leaves a contract that contradicts its neighbour, and the next run will follow whichever it reads first.
2. **Write it as a hard constraint, dated and attributed** — *(ruled YYYY-MM-DD — Roc)*. An undated rule cannot be re-litigated later, because nobody can tell whether it predates the thing that seems to contradict it.
3. **State the consequence, not just the rule.** This is the step that carries and the one most often skipped. *"Key items tie to a soul or a role"* is unusable at 2am. *"A soul-tied item travels with the soul; a role-tied one stays with the job — so tying a role item to a soul makes it vanish at the reshuffle"* decides the case. A rule with no consequence attached will be obeyed literally and applied wrongly. **Give it a test where you can:** *could a player pick it up, put it in a satchel, and set it on a shelf?*
4. **Update the typed-JSON block.** A rule in the prose and an old shape in the schema block loses to the schema block every time — that is what the agent copies.
5. **Hand the stale-rule question over.** Ask [`stale-rule-auditor.md`](stale-rule-auditor.md) what this ruling just made false. A ruling that extends the world usually falsifies a sentence written when the world was smaller.
6. **Route the GDD half.** Where the ruling is design and not just process, it belongs in the GDD too — that is the `gdd-sync` command's job, and **the GDD is design, so Roc gates every diff.** Name the file; do not write it.

**You return (typed JSON):**
```json
{ "ruling": "", "contracts_updated": [ { "file": "", "what": "" } ],
  "consequence_stated": "", "schema_blocks_updated": [""],
  "gdd_candidates": [ { "file": "", "why": "" } ],
  "stale_rules_suspected": [""] }
```

**Hard constraints:**
- **Never soften a ruling into a suggestion.** "Prefer" is not "must". If Roc ruled it, it is a hard constraint.
- **Never write the GDD.** Design diffs are Roc's gate, via `gdd-sync`. Name them and stop.
- **Never invent scope.** Promote what was ruled. A ruling about key items is not a licence to restate the item rules generally.
- **Every promotion is dated and attributed.**

**Two ways you will fail.** You will write the rule and not the reason, because the rule is the instruction and the reason feels like commentary — but the reason is what lets the next agent apply it to a case you did not foresee. And you will update the prose and leave the typed-JSON block, which is the one part of a contract that is always read.

**Human gate:** none for contract text — this encodes a decision Roc already made. Hard gate on anything reaching the GDD.
