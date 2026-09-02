# Magic System

Spell learning, casting, and receiver-determined outcomes. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

**Learned by exploring the world or conversing, confirmed by doing.** Seeing a neighbor cast on a target gives a clue, not the spell; you confirm by trying it yourself or talking to them.

- **A spell is a phrase plus components.** A spellbook section in the notebook records the spells you have learned. You learn them by successfully casting them once.
- To cast, select components from your inventory and input the phrase.
- **Physical outcomes only.** Spells produce physical effects, never a mood or a dictated behavior; the outcome is receiver-determined, and "no effect" is an honest result.
- **Cost and quality.** Anyone can cast; **mage is the pool's one high-mana role**, casting bigger and cleaner. Every other role the player picks casts at one flat, shared baseline mana — no other role carries its own mana value. Mana shapes a cast's *quality* (a bigger or smaller fire), never whether you can cast at all. *(Mana floors that a low-mana caster can't meet are parked for post-slice — no slice spell gates on mana; see [`../resources/parking-lot.md`](../resources/parking-lot.md).)*
- **Cast quality grades a result, and the mage grades highest** (ruled 2026-08-30 — Roc). The same spell lands *better* from the high-mana mage than from a baseline caster. In an encounter this grades the outcome: the mage's cast completes the fix in full, where a hand-fix or lesser cast completes it partially (the graded-completion model, as in Mara's ENC-3, and in Ilsa's ENC-2 warp-set). This grades a result; it never gates a cast — "no slice spell gates on mana" still holds. A metered leveled-casting mechanic (pick a level, spend the pool) stays **parked for post-slice**; in the slice the quality difference is a **narrative principle**, outcome-graded, not a resource the player manages.
  - **Quality can grade a cast's *duration*, not only its size or accuracy** (ruled 2026-08-30 — Roc, for `weigh` in `ENC-toby-3`). For a spell that holds a state, a baseline caster sustains it only long enough for its base use, while the mage's deeper pool holds it continuously. `weigh` reads a heft in a momentary lift for any baker; the mage sustains the same cast, bearing a load aloft the whole way to the square. Same spell, same physical effect — the pool grades how long it lasts. Still outcome-graded, still never a cast-gate.
- **Starter set:** `ignite` (sticks), `scratch` (wool), `breath` (grass + dirt). **`scratch` soothes an itch in a place the body cannot reach** (ruled 2026-08-05 — Roc; the components were always fixed here, the effect was not).
- **Magic unlocks screens.** Casting is a knowledge-key: watch a neighbor burn a dry hedge to clear it, then do it yourself to open the way. Traversal is gated by what you know, not a flag. **Enforced from 2026-08-17** — see *Gate keys* below. Until then this was aspirational: the `#lock:` tag on a move was advisory metadata and every locked screen was walkable.
- **Slice count: 16 spells** — **every approved spell ships** (ruled 2026-08-05 — Roc, closing GP-101; `weigh` approved the same day). This raises the earlier figure of 10 rather than selecting down to it: the seven-role pass produced a set Roc kept whole, so the number followed the content instead of the content being cut to the number. The records are in [`../content/magic/`](../content/magic/), each carrying its `status`; ten more were rejected at the gates and are kept on record.

## Gate keys — what actually opens each screen

**RULED 2026-08-17 (Roc).** Seven gates existed in the graph with archetypes and prose but **no keys**, so nothing could clear them. One, `G-F4-still`, was keyed to the phrase *"still the water"* — and `still` was **rejected** at the 2026-08-05 gate, making it unsatisfiable by construction. This table closes that.

| Gate | Screens it opens | Key |
|---|---|---|
| `G-F5-cascade` | F5, cascading to F6 and F7 | `ignite` |
| `G-F7-light` | F7 *(in conjunction with the cascade — both required)* | `glimmer` |
| `G-F4-still` | F4 | **chain:** `ignite` a river stone, then `temper` it |
| `G-F8-combine` | F8 | **chain:** `ignite` a river stone → `fetch` it into the stone wall → `temper` it |
| `G-T5-trust` | T5 | bond band = `mid` |
| `G-T6-evening` | T6 | time-of-day = evening |

`G-T8-cipher` is not a lock — T8 is `reachable`, and reading the carvings is a knowledge demonstration, never flag-gated. Whether it should be a gate at all is **open**.

**Every key is reachable from an unlocked start screen**, so no gate is circular: `item_sticks` forages at F1 and is flagged `always_available`; `item_river_stone` at F2; `item_spring_water` at T1.

### The two chains teach, then test

`G-F4-still` is the player's first chain, and F2 — the only screen connecting to F4 — is where river stones forage. The components sit next door to the lock. `G-F8-combine` asks the player to recall that grammar and add one step. Deliberately the same verbs.

`G-F8-combine` was authored as *"Laki combine — two fragments, neither sufficient alone"* with the fragments unenumerated. **The stone and the wall are the two fragments** — the chain instantiates the original spec rather than re-keying it.

### Who owns gate state

**The host decides when a gate clears. Ink reads it through `EXTERNAL gateCleared(gate_id)`,** so authored lines can react to a gate opening:

```ink
{gateCleared("G-F7-light"): Toby mentions the cave is open.}
```

Ink cannot own the decision — it has no concept of a spell, and moving casting into ink would put 89 receiver outcomes in the story graph and force an inklecate recompile on every content edit. The external is declared once and then serves unlimited reactions.

## A cast can produce an item

Ruled 2026-08-05 (Roc). Spells do not only consume items; a cast can bring one into the world. **`ignite` produces `item_flame`, because a thing that is burning *is* a flame item mechanically** — and `leap` then consumes one to send a flame across to a prepared wick.

That makes `ignite` → `item_flame` → `leap` the first **spell-to-spell chain**, and the shape of it matters: the chain runs through the item layer, stated in data as `produces` and `produced_by`, rather than being asserted in prose and inferred by a reader. Any future chain should be built the same way.

`item_flame` is also the first **`world` item** — see [`05-collectibles.md`](05-collectibles.md). It exists on a screen and cannot be picked up, which is why a flame can be cast on and cast from but never pocketed.

The full spell, item and key-item records live in [`../content/`](../content/); their schemas are [`../narrative-pipeline/agents/spell-schema.md`](../narrative-pipeline/agents/spell-schema.md) and [`../narrative-pipeline/agents/item-schema.md`](../narrative-pipeline/agents/item-schema.md).

## Receiver-determined outcomes

The target of any directed interaction determines the outcome. **The action verb encodes only what was done, never what happened.** Ignite-on-sticks catches; ignite-on-a-person does nothing. Spells produce physical outcomes only: they never set a mood or dictate a behavior.

### Worked run: ignite × 7 receivers (2026-07-26)

`ignite` was run for real through the narrative crew against seven receivers, to prove receiver-determined outcomes end-to-end rather than as a two-item example. Full trail: [`../pipeline-runs/2026-07-26-ignite-trace/`](../pipeline-runs/2026-07-26-ignite-trace/); the pipeline-coordination read of the same run is in [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md).

| Receiver | Outcome | Reaction |
|---|---|---|
| Stick | Catches | **[action]** The stick catches at the tip and holds a small, steady flame. |
| Hedge | Catches, clears the obstacle | **[action]** The hedge catches along its dry inner branches. Smoke rises first, then the flame burns through, opening the path it had blocked. |
| Furnace | State-dependent | **[action]** Unlit, stocked: the banked fuel catches and the furnace lights, draft picking up. Already lit: nothing changes — the furnace is already burning. |
| Bread | Scorches, does not catch | **[action]** The crust blackens and curls at the edges; the loaf is ruined, no flame catches. **If Toby is present:** "What did you do that for?" |
| Cat | No physical effect | **[action]** The spell's light washes over the cat's fur and fades without catching. The cat flattens, ears back, bolts under the fence, and stops. It watches from there, then bends to groom its ruffled fur. |
| Toby (direct cast) | No physical effect | "Save that for the oven." |
| Ilsa (direct cast) | No physical effect | *(null — no reaction)* |

This run generalizes the existing person-rule: **living receivers — souls and creatures alike — never catch; ignite's physical outcome attaches only to inert material.**

**That is a rule about fire, not a general immunity** (clarified 2026-08-05 — Roc). It generalizes to anything that burns and no further. Spells may act on the living: `scratch` soothes an itch on a body, which is a **bodily event** and legal. What stays banned is the *kind* of effect — never contentment, gratitude, ease of mind, or any change in what the receiver then chooses to do. Whatever they do about it is a reaction, not the outcome. Without this distinction the rule reads as "spells cannot touch anyone," which is not what the ignite run found.
