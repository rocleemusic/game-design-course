# Draft — the emotional-grammar declaration

**Status: draft, uncommitted.** `cast/mara.md` and `cast/bex.md` are untouched. These are the blocks that would be added to `voice_register` if the test passes.

---

## The field

Three lines, added to `voice_register` (the pinned half — the generator must see them, or the loosening never reaches the writer). Roughly 40 words per card, so the 400-word `card-lint.mjs` budget should hold.

| Declaration | What it sets | Default if absent |
|---|---|---|
| `deflection:` | Whether the soul routes feeling onto tasks and objects, names it plainly, or does both and when | Deflects — the current tight default |
| `escalation:` | What the soul does under weight: goes shorter, goes longer, or holds | Goes shorter — the current tight default |
| `tone_range:` | Which tones from the enum this soul may occupy | The five low-arousal originals |

**A card that declares nothing keeps today's behaviour.** That is the whole safety property. Loosening is opt-in per soul, so an unrevised card cannot drift.

---

## Mara

> **`deflection:` mixed, and the split is the character.** She names feeling about **objects, the work, and the past** — a thing is beautiful, a season is unkind, a way of doing it was nicer before. She does not name feeling about **herself, the drawer, or Adren**. That asymmetry is her arc, and it is the one thing the loosening must not touch: the drawer stays unspeakable.
>
> **`escalation:` she runs longer and warmer.** Under weight her sentences join up rather than break apart. She is the soul the old grief-is-fragments rule fit worst, because her tell is the past tense arriving mid-task and a fragment has no room for it. Her provenance long run stays, and no longer needs a per-scene ration.
>
> **`tone_range:` all ten.** `delighted` and `amused` are hers by right — she finds things beautiful and says so plainly, as fact, and she is dry about her brother and about the bench. `sharp` belongs to her on frost and on waste. `stung` is available and should be rare, and never adjacent to the drawer.

**What must not change.** The past-tense tell stays uninvited and unremarked. Warmth stays invariant. She still does not greet and does not offer — her welcome is a job put in your hands. Her band widens rather than moves: 12–25 stays her ordinary, with room above it when she is warm.

---

## Bex

> **`deflection:` names, always.** Unchanged. This was already his authored exception and is now simply the field saying what the card always said. `deflection_target` stays empty forever (canon flag 2).
>
> **`escalation:` none — he goes shortest of all.** Also unchanged, and now a declaration rather than an accident of world law. His 3–8 word naming band is his character, not the register's grip on him. Canon flag 3 stands: any long run about a feeling is barred, no exception.
>
> **`tone_range:` adds `amused` only.** He gets dryness. He does not get `stung`, `urgent`, or `delighted` — levelness is his warmth channel, and canon flag 7 makes grave, hushed, smug, or diagnostic delivery a defect. High arousal in his mouth breaks the man.

**Bex barely moves, and that is the point.** He is the control inside the arm. If the loosening is working, Mara should separate from him further than she does today, while his own lines stay recognisably his. A Bex who gets more expressive is a sign the change is leaking past its declarations.

---

## The one risk worth naming

Widening `tone_range` is the change most likely to be over-used. A generator handed ten tones will reach for the new five because they are new.

The guard is check 6's warmth fidelity plus the declarations above — Bex's three-value range is a hard stop, not a suggestion. If arm B shows Bex drifting warm or Mara reaching `stung` near the drawer, the field needs a ceiling and not just a range.
