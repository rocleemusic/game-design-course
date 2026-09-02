# SPB-portion — line comparison

## Approved structure (Phase 1)

<details><summary>Structure (click to expand)</summary>

# SPB-portion — Baker spell beat: portion

## Part A — Mini Architect Brief

**Reveal carried:** First sight of `portion`, via Toby dividing the feast
batch at the counter (`content/magic/portion.json` `learn_source`).
Component: `item_river_stone`. Clean effect on `feast_dough_mass` (parts
into equal loaf-measures); no_effect on `single_berry` (too little to
divide).

**State:** Ordinary workday, generic — no thread material folded in
(the `toby-feast-short` pressure lives in `ENC-toby-*`, not here).

**Sizing:** 6 beats — 2 setting beats, one 3-option choice node, one close.

**Constraint worth naming:** Toby's card still governs his one dialogue
line here — fast, deflecting to the task, never elaborating past the
practical.

---

## Part B — Choice Designer Output

### Content block

**Incoming state (O-SPB-PRT-1):** Toby's counter, mid-morning. A large
mass of feast dough sits ready to be divided; no scale in the shop is
built for it.

**A-SPB-PRT-1:** Toby eyes the mass, picks up a river stone kept for
exactly this, sets it against the dough without a word wasted on the
setup.

**CH-SPB-PRT-1 (3 options, ungated):**
- **a · Converse · witness** — `player_line`: "How do you get it even?" —
  Toby: "Stone does that part." Fast, flat, already moving. Records
  `knowledge_flag(portion_seen)`.
- **b · Use · ease** — `surface_action`: hands Toby a second river stone
  to work a smaller batch the same way — it parts clean into matched
  measures. Records `knowledge_flag(portion_attempted)` + `bond_event
  (Trust, weight 2)`.
- **c · Collect · witness** — `surface_action`: picks up a single berry
  from a nearby bowl and sets it where the stone would go instead — too
  little there to divide into anything, nothing happens. Records
  `knowledge_flag(portion_boundary_seen)`.

Converges at **J-SPB-PRT-1**.

**Close (AS-SPB-PRT-1):** The dough sits parted into even measures on the
counter. Toby's already reaching for the next tray.

**Action-slot ratio:** 2 action beats across the scene ≈ within range.

**Long-run placement:** None.

**Equal weight:** a explains, b tries and succeeds, c finds the boundary
on too-little material.

### Mermaid graph

```mermaid
flowchart TD
    O1(["O-SPB-PRT-1 · Toby's counter, mid-morning<br>a large mass of feast dough, no scale big enough"])
    O1 --> A1
    A1(["A-SPB-PRT-1 · Toby picks up a river stone kept for this, sets it against the dough"])
    A1 --> N1

    N1["CH-SPB-PRT-1<br>the player's move at the dough mass"]
    N1 --> N1a("a · Converse · witness · 'How do you get it even?'")
    N1 --> N1b("b · Use · ease · hands Toby a second river stone for a smaller batch")
    N1 --> N1c("c · Collect · witness · sets a single berry where the stone would go")
    N1a --> R1a[/"flag: portion_seen"/]
    N1b --> R1b[/"flag: portion_attempted<br>bond: Trust"/]
    N1c --> R1c[/"flag: portion_boundary_seen"/]
    R1a --> J1((g))
    R1b --> J1
    R1c --> J1
    J1 --> AS1

    AS1(["AS-SPB-PRT-1 · the dough sits parted into even measures on the counter"])
```

**Self-verify:** parses clean, options match prose, genuine gather,
component table respected, no phrase spoken as instruction.


</details>

## Generated lines, by model

### setup

| Model | Word count | Text |
|---|---|---|
| styletune | 33 | A massive lump of feast dough rests on Toby's counter, too large for the shop's standard scales. Toby picks up a smooth river stone and presses it against the dough without a word. |
| violetlotus | 62 | Toby eyes the mass of feast dough on the counter, picks up a river stone kept for this exact task, and sets it against the dough without a word wasted on the setup. He rolls it back and forth, watching the dough part cleanly into even measures. "Stone does that part," he says, already reaching for the next tray to be portioned. |
| crimson | 32 | Toby surveys the mound of dough, picks up a river stone, and places it against the dough's side without a word, letting the stone's weight do the work of dividing the mass. |
| gemma26b | 30 | Toby eyes the mass of dough, then picks up a river stone kept for this purpose and sets it against the pile without wasting a word. "Stone does that part." |

### option_a

| Model | Word count | Text |
|---|---|---|
| styletune | 26 | The player watches the stone settle against the dough. "How do you get it even?"<br><br>Toby adjusts his grip without looking up. "Stone does that part." |
| violetlotus | 17 | The player: "How do you get it even?"<br><br>Toby: "Stone does that part." Fast, flat, already moving. |
| crimson | 24 | The player asks, "How do you get it even?" Toby answers, "Stone does that part," fast and flat, already moving to the next task. |
| gemma26b | 25 | The player asks, "How do you get it even?" Toby picks up a river stone and presses it against the mass. "Stone does that part." |

### option_b

| Model | Word count | Text |
|---|---|---|
| styletune | 15 | The player hands Toby a second river stone. The dough parts clean into matched measures. |
| violetlotus | 31 | The player hands Toby a second river stone. Toby takes it, sets it against the dough, and parts it clean into matched measures. "It's not much," Toby says. "But it's fair." |
| crimson | 41 | The player hands Toby a second river stone. Toby takes it without pause and works a smaller batch, the stones parting the dough cleanly into matched measures. "That's right," he says, speeding through the words like he's just describing the weather. |
| gemma26b | 22 | The player hands Toby a second river stone for the smaller batch. It parts clean into matched measures. "Stone does that part." |

### option_c

| Model | Word count | Text |
|---|---|---|
| styletune | 30 | The player picks up a single berry from a nearby bowl and sets it where the stone would go instead. Toby glances at the berry, then back at the dough. |
| violetlotus | 47 | The player picks up a single berry from a nearby bowl and sets it where the stone would go instead. Toby watches for a moment, then: "That's not enough." He takes the berry, puts it back in the bowl, and returns to the dough without another word. |
| crimson | 43 | The player picks up a single berry from a nearby bowl and sets it where the stone would go instead. Toby glances at it, then back to the dough, shaking his head slightly. "Too little there to divide into anything," he says flatly. |
| gemma26b | 27 | The player picks up a single berry from a nearby bowl and sets it where the stone would go instead. There is not enough there to divide. |

