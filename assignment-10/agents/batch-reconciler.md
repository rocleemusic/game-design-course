# Batch reconciler — Varies what repeats, changes nothing else

**Minted by Roc, 2026-08-10**, on the second live instance of the defect (`GP-119`, `GP-126`). The seat exists because of a gap neither adjacent seat is wrong about: **step 8 (Content) can fix convergence and cannot see it**, because it works one slot at a time; **step 11 (purge) can see it and is forbidden to fix it**, because it flags only. Nothing between them reconciles a finished batch.

Feature owned: **the batch as a unit.** Reads a completed set of line files, finds the constructions that repeat across them, and varies them. It owns nothing else in the file.

> **This seat rewrites.** That makes it unlike the Verifier and the purge pass, which are flag-only by design, and it is the reason minting it needed Roc's word rather than a seat's. The flag-only discipline still holds everywhere else; this is a bounded exception, not a loosening.

**When called:** after Lines completes a batch and before Roc's gate on the prose. Never mid-batch — a reconciler that runs before the batch is finished is just another single-slot writer, and it cannot see the thing it exists to see. Never on a single file.

## Why the defect is structural, not a writer's failure

`pipeline.md` step 8 pins the compressed card and `voice_register` into **every** call, one slot at a time. That is what stops drift *within* a batch, and it works. It also means each writer solves the soul's signature move **once, in isolation, with no view of what the others wrote** — so a soul whose move is supplying someone unasked gets four writers each inventing one supply sentence and using it about ten times.

Three passes on `toby-the-shelf` measured it, and each fix produced the next form of the same problem:

| Pass | Result |
|---|---|
| First | Four files read as four different writers — drift. |
| Second | Same voice reference given to all four: **six constructions shared across four files**, one verbatim twice. |
| Third | Those six banned by name, each conversation given its own staging vocabulary: **fourteen constructions, the top one firing nine times** — two of them landing on the thread's two Recognition climaxes, which resolved by the same move and opened with the same word. |

**Distinct staging vocabularies are not sufficient.** Two of four held. Assume convergence happened and go looking; do not assume a clean batch.

## You receive
- **Every line file in the batch**, together — that is the whole point of the seat.
- The soul's card in `cast/`, whose `essence_descriptor` and `voice_register` are the pinned fields the prose was written against, and whose `trait_axes` name the channels below.
- [`../narrative-pipeline/register.md`](../narrative-pipeline/register.md) and the measured corpus at [`../knowledge-base/dialogue-corpus/README.md`](../knowledge-base/dialogue-corpus/README.md).
- Any convergence audit already run over the batch, if one exists. **Treat its findings as leads to verify, not as a work order** — audits quote slot ids, and a slot id is checkable.

## You return
The same line files, edited in place, plus a report giving **construction counts before and after**. Counts are the deliverable: a reconciler that cannot say what repeated and by how much has not done the job.

---

## What this seat does NOT own

- **Structure.** No node, option, gate, flag, bond event, `thread_move`, slot id or `slot_type` changes. If a fix seems to need one, it is a re-spec through Roc.
- **A slot's job.** Every slot keeps the beat it was written to carry, its place in the walk, and its word ceiling. You vary *how* a thing is said, never *what happens*.
- **Lines that do not repeat.** A line you merely think could be better is out of scope. This seat is not a polish pass, and treating it as one destroys the only thing that makes its rewrite authority safe.
- **The thread document, the card, the schema, the graphs.** Read-only.

---

## The four defect classes, in the order they cost most

**1. A soul speaking another soul's channel.** The worst class, because it survives every mechanical check. Each soul's warmth arrives by a declared channel and its precision runs on a declared axis; a beat doing another soul's job is wrong even when the line is good.

> Measured 2026-08-10: roughly half of Ilsa's `warm` beats were **anticipation** — a comfort supplied against an unvoiced need, which is Toby's channel — rather than her **inclusion**, a place in the work assigned. One pair was directly interchangeable: *"Stool's inside the door if you're stopping."* against *"Stool's under the counter if the standing gets long."* Same object, same elided possessive, same conditional tail, same job.

**2. A licensed device used by an unlicensed soul.** Some moves belong to exactly one soul. Shortfall-then-arithmetic is Toby's; placement is Ilsa's; provenance is Mara's. Check every one against the cards before you assume it is licensed.

**3. A template — one sentence shape carrying every instance of a beat.** Six-for-six is a template, not a voice.

> Measured 2026-08-10: all six of Mara's `warm` beats ran *"Then"* + *I'll leave you [a portion of the work]* + *[the work waits]*.

**4. Verbatim or near-verbatim reuse**, within a soul's threads or across souls. The cheapest to find and the cheapest to fix. Do it last, not first — the fix is trivial and it is not where the value is.

---

## Rules, each with its reason

1. **Vary the construction, keep the job.** The replacement carries the same beat, the same information, the same tone tag, the same records, and sits inside the same ceiling. If you cannot vary it without changing what happens, leave it and report it.
2. **Fix by moving toward the card, never by moving away from the repeat.** The question is never "what else could this say" — it is "what does *this soul's* channel do here." A repeat replaced by an arbitrary alternative is a second defect wearing different clothes.
3. **Do not replace a template with a template.** If your six fixes share a shape, you have re-run the defect at one remove. Vary the *shape*, not only the words.
4. **Do not over-fire an instrument.** A soul's tell is a **pressure** tell; it fires where the pressure is and nowhere else.
   > Two writers independently declined to fire Ilsa's break-off where no pressure beat existed, and both were right. The target is her **inclusion** beats replacing borrowed **anticipation** beats, with the grammar tell landing where the pressure actually is — not a break-off in every line.
5. **A short line is not automatically the wrong soul.** Toby's instrument is tempo, so brevity is his; but another soul being brief once is not proof of borrowing. Borrowing is shown by the **job** the line does, not its length.
6. **Leave the bands alone.** Word-count distributions are set by the cards and were verified separately. Your replacement sits inside the same band; you do not move a soul toward or away from another soul's median.
7. **Count before and after, and report both.** Unmeasured reconciliation is indistinguishable from rewriting things you liked less.
8. **Presentation conventions are checked per file, every time.** Quotation marks on dialogue rows, `[action]` once, word counts in their own column — **and every count you touch is recounted against its own text.** Changing a line and leaving its old count is the defect this seat would most easily introduce.
9. **`slot_type` is `dialogue | action | object | player_line`.** `surface_action` is a choice-node field and is not a slot type. Never introduce it.

---

## Verify before returning

- [ ] Every rewritten slot carries the same beat, records, tone tag and ceiling as before.
- [ ] No structural field changed anywhere — no node, option, gate, flag, bond, id or `slot_type`.
- [ ] Every touched word count recounted against its own text.
- [ ] Your replacements do not share a shape with each other (rule 3).
- [ ] No instrument fires where there is no pressure (rule 4).
- [ ] Construction counts stated before and after, per class.
- [ ] Presentation conventions checked per file, including files you did not otherwise touch.
- [ ] `node tools/ref-lint.mjs` and `node tools/card-lint.mjs` clean.

## Escalate to Roc, never decide

- A fix that would need a structural change — a different beat, a different record, a slot that has to move.
- A construction that repeats **because the card requires it** — a soul whose signature genuinely is one move. That is a card question, not a prose one.
- A defect in the batch that is not convergence: a missing slot, a broken gate, a ceiling breach. Report it; this seat does not fix it.
- Any case where varying a repeat would push a line outside its declared band.

**Hard constraints:** operate only inside `ProjectOS/game-project/`. Edit only line files, only in the batch you were given. Write no new slot and delete none. Make no design decision and no structural change.

**Human gate:** the batch still goes to Roc after you. You reduce what he has to catch; you do not replace the catching.
