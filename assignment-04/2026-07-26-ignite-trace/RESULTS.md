# RESULTS — ignite × 7 receivers, 2026-07-26

Human-gate summary. Full agent-by-agent trail: [`run-log.md`](run-log.md). Everything below is **open for Roc's veto or accept**, per item — nothing in this run self-approves.

---

## 1. Physical-outcome table (Roc-confirmed before the run)

| Receiver | Outcome | Basis |
|---|---|---|
| Stick | Catches | Existing canon — starter-spell example. |
| Hedge | Catches | Existing canon — traversal-gate example ("burn a dry hedge to clear it"). |
| Furnace | State-dependent — unlit+fuel: catches (lights it); already lit: no effect | New ruling this run. **QA flagged an open question:** does lighting it consume a tracked fuel resource, and is there a way to unlight it later? Not yet specced. |
| Bread | Scorches, does not catch | New ruling this run — a real physical change (visible, ruins it) that doesn't propagate or gate anything. A third bucket beyond catches/no-effect. |
| Cat | No physical effect — behavioral reaction only | New ruling this run, generalizing the existing person-rule: **living receivers never catch, only inert material does.** Candidate for `04-magic-system.md` if ratified. |
| Toby, Ilsa | No physical effect — in-character reaction only | Existing canon (ignite-on-a-person does nothing). |

---

## 2. Cat — final action beat

> **[action]** The spell's light washes over the cat's fur and fades without catching. The cat flattens, ears back, bolts under the fence, and stops. It watches from there, then bends to groom its ruffled fur.

(34 words, `slot_type: action`, one revision — original implied a recurring individual tell via "again," removed.)

**Verifier: PASS.** One optional QA note, not a defect: the fear→groom transition happens fast within a single beat; confirm on read-through that it plausibly reads as stress-grooming, not as the cat shrugging the spell off (which would edge toward failure-framing the miss).

---

## 3. Toby — final line, for veto or accept

> "Save that for whatever still wants doing."

(8 words, `matter_of_fact`, `receiving-flat`, one revision — original invented an ungrounded, role-bound prop, "the stove.")

**Verifier: PASS WITH FLAGS, not fully clean.** Two things to weigh at the gate:
- The imperative opening ("Save that for—") carries residual curt/brusque risk that the fix only partially offsets. The rescue is "wants doing" over "needs doing" — softer, more inviting — but it's a thin margin, not a clean pass.
- "Wants doing" is a specific dialectal construction (the "the garden wants weeding" pattern) new to this soul — nothing in Toby's approved lines from the Giver run uses this register, so there's no baseline to confirm it matches his voice elsewhere. Flagging for your ear, not proposing a further AI revision.

**Also carried up (not a line defect — a checklist gap):** QA read this line as implying an unnamed, untracked task ("whatever still wants doing") — a real narrative hook with nothing behind it. If Toby has no actual pending task in whatever scene this fires in, the line over-promises. Worth deciding whether that's acceptable for a one-off ambient bark, or whether it needs binding to something real.

**Card gap surfaced, unresolved:** the Architect flagged that Toby's card has no axis for attention that's neither a gift (creates debt) nor a need (creates a job) — which is what a no-stakes spell-poke actually is. The reaction above is the Architect's best inference from the existing axes, not something the card explicitly licenses.

---

## 4. Ilsa — final line, for veto or accept

> "Your place is set beside mine."

(6 words, `matter_of_fact`, `settled-certainty`, zero revisions — no defect the Content Agent could fix by rewording.)

**Verifier: PASS WITH FLAGS — a design question, not a line defect.** The authored `speaker_intent` is clean (pre-existing disposition, not something the cast earned), and every mechanical check passes. The open flag is about **adjacency**: the player just cast a spell at her, and this line fires immediately after. Players don't see the `speaker_intent` doc — only the line, right after the act — which risks reading as "I targeted her and now I'm included" even though nothing in the line's grammar actually confers anything new. This is exactly the risk Ilsa's own canon_flag exists to guard against (she is never *converted*; belonging is never a payout for an act). **The Verifier explicitly declined to rewrite this** — it's a call for your ear on whether the adjacency itself is a problem the line's wording can even fix, or whether it needs a beat of space (a different line, a delay) rather than different words.

**Also carried up:** same QA finding as Toby's — "your place is set beside mine" is a strong relational claim with nothing tracking whether it's actually true later. If nothing sets a flag confirming this, later dialogue that assumes she's *not* extended that far would contradict it.

**Card gap surfaced, unresolved:** her `deflection_target` (Placement) is written and licensed only for *verbal* attention ("a question about herself"). Extending it to cover a physical act aimed at her body — what a spell cast is — was the Architect's inference, not something the card states.

---

## 5. Spec-change candidates (the "does the pipeline adapt" answer)

Full reasoning in [`run-log.md`](run-log.md#spec-change-candidates-surfaced-by-this-run). Six real gaps, none blocking the lines above, all worth a ruling before the next new-magic entry hits the same wall:

1. No schema for ambient/reactive content outside a scripted scene (root cause of Toby's first-draft prop invention).
2. No creature-reaction schema (the cat has nothing to anchor register or consistency against).
3. No stated word ceiling for `action` slots (dialogue: 40, object: 60 exist; action doesn't).
4. QA's checklist has no check for dialogue implying unbacked mechanical consequence (both Toby's and Ilsa's lines tripped this).
5. Neither Toby's nor Ilsa's card has an axis for no-stakes or hostile-coded attention directed at them.
6. Furnace's ignite state machine (fuel consumption, reversibility) is new canon, not yet specced.

---

## Gate ruling — Roc, 2026-07-26

| Item | Ruling |
|---|---|
| Cat's beat | **Accepted as-is.** |
| Toby, direct cast | **Overridden.** Roc rejected the crew's "Save that for whatever still wants doing" and directed "Save that for the oven" instead. Not a defect fix — the oven is real, already-established furniture in Toby's approved `bakery-feast-dough` scene, so this resolves the Verifier's original ungrounded-prop / essence-vs-role flags by grounding the reaction in a real scene rather than patching the wording of an ambient, contextless one. **This is the practical answer to spec-change candidate 1** (no schema for ambient/reactive content) — situate the interaction in an established scene where props already exist. |
| Ilsa, direct cast | **Nulled — no reaction, by design.** Roc considered two options (a settled-certainty line redirecting to the literal fire, "That belongs at the forge"; or a system-level "You think better of it" notification bypassing dialogue entirely) and chose neither — exercising the "null is a legitimate Content output" rule set before the run started. This also fully resolves the Verifier's causal-implicature flag: no line, no adjacency risk. |
| Hedge | **Expanded.** Roc added that igniting the hedge also clears it as a traversal obstacle — this was already-established canon (`04-magic-system.md`'s "burn a dry hedge to clear it" example) that the initial prop-table pass hadn't carried into the reaction text. |
| Bread | **Expanded.** Roc added a third-party bark: if Toby is present when the player ignites bread, Toby reacts — "What did you do that for?" New content, not run through the crew (Roc-authored directly, same standing as any other human-gate line). |
| Physical-outcome table, incl. the "living receivers never catch" rule | **Implicitly ratified** by shipping into the GDD's worked example ([`../../gdd/11-ai-agents-and-pipeline.md`](../../gdd/11-ai-agents-and-pipeline.md)). Not yet separately written into `04-magic-system.md` — still open. |
| Six spec-change candidates | **Still open** — next discussion topic. |

**Note on the bread bystander bark and the Toby-present conditional:** neither of these went through Architect/Content/Verifier/QA — they're Roc-authored directly at the gate, same as the Kinbound run's Bram-naming and coal-wording gate edits. Recorded here for the trail; not evidence of the crew's own output quality.
