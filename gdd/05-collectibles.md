# Collectibles

The six item categories, scope counts, and the per-screen randomization rule. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

| Category                   | Role                                                                  | Persistence          | Examples                            |
| -------------------------- | --------------------------------------------------------------------- | -------------------- | ------------------------------------ |
| **Components**             | Foraged magic ingredients, consumable; feed Magic casting and Make    | pack-triaged         | a berry · a river stone · a feather |
| **Made things**            | Outputs of Make (dishes, crafts, art); some consumable, some giftable | pack-triaged         | a warm loaf · a small carving       |
| **Mementos / keepsakes**   | Hub decoration and achievement markers                                | pack-triaged         | a worn ribbon · a pressed flower    |
| **Gifts**                  | Key Items to give to NPCs to advance story                            | drawn from above     | a given keepsake                    |
| **Sounds** (audio-objects) | show / gift / spell-component. **Replaying one does not consume it** (ruled 2026-08-04). Take a satchel pocket like any component (ruled 2026-08-30) | pack-triaged | a festival bell · a hummed tune     |
| **Tools**                  | Non-consumable Use-family items                                       | pack-triaged         | a lantern · a small knife           |

**Scope:** roughly 3 per category, about 15 distinct items (gifts overlap mementos and made-things); final counts from the content budget. *(As built: 14 derived items and 11 key items — [`../content/items/`](../content/items/) and [`../content/key-items/`](../content/key-items/). The derived set is all components plus one sound, because every derived item falls out of a spell and the spells consume raw materials; the empty categories are filled top-down by key items instead.)*

## Three persistence classes

Ruled 2026-08-05 (Roc), when a flame turned out to fit neither existing class.

| Class | Means | Example |
|---|---|---|
| `pack-triaged` | Goes in the satchel and competes for space. The default | a river stone |
| `free` | Carried like knowledge, costs no pack space | *(no current items — see note)* |
| **`world`** | **Exists on a screen and cannot be picked up at all** | an existing flame |

**`free` currently has no members (ruled 2026-08-30, Roc).** The captured sound — the sole `free` item — moved to `pack-triaged` when the painted satchel grid made every pocket a physical space. A component that "never takes a pocket" broke that model, and as an `echo` ingredient the sound should compete for early-game slots like any other. The class stays defined for a future sound that should travel like knowledge, but nothing uses it today.

A `world` item takes `collectible: false`. It is exempt from the two-source forage rule, and its locations say **where it occurs** rather than where it is gathered — a flame is a thing you cast on and cast from, never a thing you pocket. It also cannot be an ingredient in anything made, for the same reason.

**Availability is randomized per screen.** What you can forage or find on a screen is drawn from that location's pool, so no two visits offer the same spread — the forest may hold river stones today and feathers tomorrow. This feeds the limited-timeline engine ([`01-concept.md`](01-concept.md)): you adapt the day's goals to what's actually out. **Guardrail:** the *items* a knowledge-gate or a soul's arc depends on are exempt — always obtainable, never randomized out. The *components* you forage to cast the spells that acquire them may be random, but they come from the location pools with more than one source, so a missing component means foraging elsewhere or coming back, never a dead-end (the **Cozy rhythm** pillar — see [`02-pillars.md`](02-pillars.md)). Randomness sets the day's *path*, not whether the goal is reachable. **The Home Hub is not a forage point** (ruled 2026-08-04) — it is where you bank and decorate, not where you gather, so no item draws a source from it.

**Forage pools author `item_id` directly (ruled 2026-08-23, Roc).** The pool-name vocabulary (`"herbs"`, `"lantern-oil"`, `"wool"`) is retired — `screen-specs.json`'s `forage` arrays now hold real item ids (`item_berry`, `item_beeswax`, `item_wool`), so what you pick up joins to a real item record instead of a bare string with no category or persistence class. The two joins the old vocabulary left as guesses are ratified: `"herbs"` was `item_berry`, `"lantern-oil"` was `item_beeswax`. **No rarity mechanic exists or is planned** — `Forage.offer()` rotates a screen's pool by seed with no weighting; a screen's *reliability* is a side effect of its pool size, not an authored scarcity system, and that stays true. The per-screen pools are laid out so **every approved spell has at least one screen carrying all its components** — see [`../tools/resolver/data/screen-specs.json`](../tools/resolver/data/screen-specs.json) for the authored table.

## Key items — soul-tied or role-tied

Key items are the authored half of the collection: they are chosen top-down rather than derived from what spells need, and each is either **found** whole or **made** from up to three derived items. Records: [`../content/key-items/`](../content/key-items/); the production order is stage 6 of [`../narrative-pipeline/content-stages.md`](../narrative-pipeline/content-stages.md).

**Each ties to a soul or to a role** (amended 2026-08-04 — Roc; stage 6 originally allowed only soul ties). The difference is what happens at the reshuffle: a **soul-tied** item travels with the soul across lives because it belongs to the person; a **role-tied** item stays with the job, so whoever is dealt Baker gets the baker's key items. Tying a role item to a soul would make it vanish when the job is re-dealt; tying a soul's keepsake to a role would hand it to a stranger. That consequence decides which tie an item takes — not preference.

**A place is not an item** (ruled 2026-08-05 — Roc). A laid setting, a kept seat, a held-open door, a cleared spot are arrangements of space, not objects: they cannot be picked up, carried, given or shelved, however well they express a soul. The working test is *could a player pick it up, put it in a satchel, and set it on a shelf in the hub?* Rewording an arrangement to sound like an object does not pass — the carrying or the transfer has to be real. This cost six records on the first pass, all of them for souls whose character is expressed through placement.

**Soul-tied key items are capped at two per soul for the slice** (ruled 2026-08-05).
