# Collectibles

The six item categories, scope counts, and the per-screen randomization rule. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

| Category                   | Role                                                                  | Persistence          | Examples                            |
| -------------------------- | --------------------------------------------------------------------- | -------------------- | ------------------------------------ |
| **Components**             | Foraged magic ingredients, consumable; feed Magic casting and Make    | pack-triaged         | a berry · a river stone · a feather |
| **Made things**            | Outputs of Make (dishes, crafts, art); some consumable, some giftable | pack-triaged         | a warm loaf · a small carving       |
| **Mementos / keepsakes**   | Hub decoration and achievement markers                                | pack-triaged         | a worn ribbon · a pressed flower    |
| **Gifts**                  | Key Items to give to NPCs to advance story                            | drawn from above     | a given keepsake                    |
| **Sounds** (audio-objects) | Travel free, no pack space; show / gift / spell-component             | free, like knowledge | a festival bell · a hummed tune     |
| **Tools**                  | Non-consumable Use-family items                                       | pack-triaged         | a lantern · a small knife           |

**Scope:** roughly 3 per category, about 15 distinct items (gifts overlap mementos and made-things); final counts from the content budget.

**Availability is randomized per screen.** What you can forage or find on a screen is drawn from that location's pool, so no two visits offer the same spread — the forest may hold river stones today and feathers tomorrow. This feeds the limited-timeline engine ([`01-concept.md`](01-concept.md)): you adapt the day's goals to what's actually out. **Guardrail:** the *items* a knowledge-gate or a soul's arc depends on are exempt — always obtainable, never randomized out. The *components* you forage to cast the spells that acquire them may be random, but they come from the location pools with more than one source, so a missing component means foraging elsewhere or coming back, never a dead-end (the **Cozy rhythm** pillar — see [`02-pillars.md`](02-pillars.md)). Randomness sets the day's *path*, not whether the goal is reachable.
