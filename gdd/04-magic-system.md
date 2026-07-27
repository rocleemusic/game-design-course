# Magic System

Spell learning, casting, and receiver-determined outcomes. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

**Learned by exploring the world or conversing, confirmed by doing.** Seeing a neighbor cast on a target gives a clue, not the spell; you confirm by trying it yourself or talking to them.

- **A spell is a phrase plus components.** A spellbook section in the notebook records the spells you have learned. You learn them by successfully casting them once.
- To cast, select components from your inventory and input the phrase.
- **Physical outcomes only.** Spells produce physical effects, never a mood or a dictated behavior; the outcome is receiver-determined, and "no effect" is an honest result.
- **Cost and quality.** Anyone can cast; **mage is the pool's one high-mana role**, casting bigger and cleaner. Every other role the player picks casts at one flat, shared baseline mana — no other role carries its own mana value. Mana shapes a cast's *quality* (a bigger or smaller fire), never whether you can cast at all. *(Mana floors that a low-mana caster can't meet are parked for post-slice — no slice spell gates on mana; see [`../parking-lot.md`](../parking-lot.md).)*
- **Starter set:** `ignite` (sticks), `scratch` (wool), `breath` (grass + dirt).
- **Magic unlocks screens.** Casting is a knowledge-key: watch a neighbor burn a dry hedge to clear it, then do it yourself to open the way. Traversal is gated by what you know, not a flag.
- **Slice count:** 10 spells.

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
