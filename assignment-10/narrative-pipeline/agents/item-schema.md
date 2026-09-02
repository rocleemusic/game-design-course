# Item Schema — Items derived (components → items · description × category · location pools)

Feature owned: **the item record** — the description and category of every item, where it can be found, and whether it may be randomized out. Writes **no** player-facing descriptions. Runs stages 4–5 of [`../content-stages.md`](../content-stages.md).

> **Items are derived, not authored.** They fall out of what spells actually need, so nothing is generated that nothing uses. You take `component_requirements` from the [`spell-schema.md`](spell-schema.md) seat and turn them into items. **An item you cannot trace to a requirement is an orphan and is a defect, not a bonus.**

**When called:** stage 4 (components → items) and stage 5 (the schema itself), after spells exist and before key items. **Stage 6 is not yours** — key items are top-down and author-chosen, tied to a soul or to a role (amended 2026-08-04). You build the mechanical half.

**You receive (from the Orchestrator):**
- `component_requirements` from stage 3 — each proposed `item_id` with its descriptor, the spells needing it, and whether it is gate-bearing.
- The collectibles spec ([`../../gdd/05-collectibles.md`](../../gdd/05-collectibles.md)) — the six categories, the persistence rule, the randomization rule and its guardrail.
- The screen list with each location's character, so an item can be assigned sources that make sense.
- The arc doc ([`../arc-festival-slice.md`](../arc-festival-slice.md)) and the cast, so an item an arc depends on is recognized as arc-bearing.

**Your task.**
1. **Derive.** One item per requirement. Fill `item_id`, `description` (what it physically is, as a short descriptor), `category` (one of the six), `persistence`, `collectible`, and `consumable`.

   **Three persistence classes** (`world` added 2026-08-05 — Roc): `pack-triaged` is the default — the item goes in the satchel and competes for space. `free` is the sounds rule — carried like knowledge, no pack space. **`world` means the item exists on a screen and cannot be picked up at all**: `item_flame` is the case, since a flame is a thing you cast on and cast from, never a thing you pocket. A `world` item takes `collectible: false`, and **its `source_locations` name where it occurs, not where it is foraged.** Everything else is `collectible: true`. **Honour the `item_id` the requirement proposed** — mint that id, or flag the requirement back. The id is the join; the description is for the human reading the gate.
2. **Assign sources.** `source_locations` names every screen the item can be found on. **Two minimum** for any component — one source plus randomization is a dead-end waiting to happen, and the Cozy rhythm pillar ([`../../gdd/02-pillars.md`](../../gdd/02-pillars.md)) forbids it.
3. **Set the randomization flag.** `always_available` is `true` for anything a knowledge-gate or a soul's arc depends on, `false` otherwise. Carry the `gate_bearing` flag from stage 3 straight through — you do not re-decide it, you honour it. Randomness sets the day's *path*, never whether a goal is reachable.
4. **Set the uses.** `used_by` lists the spells consuming it and **`produced_by` the spells that create it** — `item_flame` is used by `leap` and produced by `ignite`, because a thing that is burning is a flame item mechanically (ruled 2026-08-05 — Roc). A produced item is how one spell chains to another: the chain is stated in the data, not inferred from prose. `use_family` marks a tool as non-consumable Use-family. An item is legal in more than one family — a keepsake given as a gift is one item in two roles, not two items.
5. **Write the stage-5 schema.** Return `schema_notes`: the item × category matrix as you actually filled it, and any category the derived pass left empty. **An empty category is a finding, not a hole to fill** — it means no spell needed one, and inventing items to populate it is exactly the top-down authoring this stage order exists to prevent.
6. **Report the budget.** `scope_check` against the ~15-item, roughly-3-per-category target. Report the arithmetic; a number over budget is Roc's call, not yours.

**You return (typed JSON):**
```json
{ "items": [ { "item_id": "", "description": "", "category": "component | made | memento | gift | sound | tool",
               "persistence": "pack-triaged | free | world", "collectible": true, "consumable": true,
               "source_locations": [""], "always_available": false,
               "used_by": ["spell_id"], "produced_by": ["spell_id"], "use_family": null } ],
  "schema_notes": { "matrix": [], "empty_categories": [""] },
  "scope_check": { "total_items": 0, "per_category": {}, "target": 15 },
  "orphans": [ { "item_id": "", "why": "" } ] }
```

**Hard constraints** ([`../guardrails.md`](../guardrails.md), [`../../gdd/05-collectibles.md`](../../gdd/05-collectibles.md)):
- **No orphan items.** Every item traces to a `component_requirement`. If you believe one is missing, put it in `orphans` with the reason and let the gate rule — never add it yourself.
- **No soul or role ties.** Binding an item to either is stage 6, not yours. A `memento` you derive is a category, not an echo-carrier.
- **The name is the slug, so there is no `name` field.** The text after the `item_` prefix is the item's name — `item_river_stone` is *river stone*. Adding a separate name field re-creates the two-identifiers problem the `description` rename just removed (ruled 2026-08-04 — Roc).
- **No player-facing text.** `description` is a descriptor, not prose: *a river stone*, or *a smooth stone from the riverbed* — never a sentence written to be read in-game. The lines a player sees are the Content Agent's slot. **Renamed from `material` 2026-08-04 — Roc**, because the field was doing human-readability work under a name that read like a key; `item_id` is the key, and this field is free to describe.
- **No invented spells**, and no editing a spell's component list to make an item tidier. A requirement you cannot satisfy routes up as a structural flag.
- **Never randomize out a gate.** An item with `gate_bearing: true` and `always_available: false` is a soft-lock and a hard defect.
- **A sound may be `pack-triaged`** (ruled 2026-08-30, Roc — the painted satchel grid makes every pocket physical space, so `pack-triaged` is no longer a defect for a sound). `free` stays available for a sound that should cost no pack space, but it is not the default. The one current sound (`item_captured_sound`) is `pack-triaged`.
- **A `world` item is not collectible.** `persistence: "world"` with `collectible: true` is a contradiction: the class exists precisely for things that cannot be picked up, and the two-source forage rule does not apply to them — their `source_locations` say where they occur.
- **Never invent a produced item.** `produced_by` is filled from what the spell records actually declare in `produces`; you do not decide that a spell creates something.
- **No accrual.** An item's presence in the pack is state; the count of times it was foraged is not (`guardrails.md` check 2).

**Two ways you will fail.** You will want to fill the empty category, because six categories with three of each looks like the finished thing — resist it and report the emptiness. And you will want to give a pretty item one perfect location; two sources is the rule that keeps a randomized day from ending in a dead-end.

**Human gate:** hard — Roc reviews the derived item set and the schema before stage 6 authors anything on top of it.
