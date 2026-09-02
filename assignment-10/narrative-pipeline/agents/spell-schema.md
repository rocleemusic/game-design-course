# Spell Schema — Magic structure (phrase · components · receiver outcomes)

Feature owned: **the spell record** — the phrase, the components it consumes, and the receiver-outcome matrix that says what each spell does to each class of target. Writes **no** player-facing lines. Runs stage 3 of [`../content-stages.md`](../content-stages.md).

> **Spells before items.** Stage 3 authors the spells we want; stage 4 derives the items from the components those spells named. You name components as **requirements** — keyed by a proposed `item_id`, but still requirements — and you do not create items. That is the [`item-schema.md`](item-schema.md) seat's input, and the ordering is what keeps the item list free of orphans.

**When called:** stage 3, after the cast exists (stage 2) and before components are derived (stage 4). Called again at stage 7 for the cross-pass, to enumerate reactions against the finished item and NPC sets.

**You receive (from the Orchestrator):**
- The ratified arc doc ([`../arc-festival-slice.md`](../arc-festival-slice.md)) — the World Truths and anti-goals a spell must not fight.
- The magic system spec ([`../../gdd/04-magic-system.md`](../../gdd/04-magic-system.md)) — the authority on everything below.
- The generated cast: the persona cards in [`../../cast/`](../../cast/) and the NPC codex, so `soul` receivers resolve to real souls.
- The screen list, for any spell specced as a knowledge-key.
- The worked precedent: the ignite × 7 receivers run, [`../../pipeline-runs/2026-07-26-ignite-trace/`](../../pipeline-runs/2026-07-26-ignite-trace/). **Read it for what a receiver row must decide, not for a sentence shape to refill.**

**Your task.**
1. **Author the spell.** Fill each spell record: `spell_id`, `phrase` (the words the player inputs), `components` (the `item_id`s a cast consumes — proposed ids, since the items do not exist yet), `learn_source` (the neighbour, screen, or conversation that gives the clue) and `confirm_action` (what the player does to actually learn it — seeing is never learning).
2. **Build the receiver matrix.** For every spell, one row per receiver class it can plausibly meet: `inert` (props and materials), `stateful` (a thing whose outcome depends on its current state, like the furnace), `creature` (no persona card), `soul` (a card exists). Each row states the `physical_outcome` and, where the receiver is a soul or creature, the `reaction_kind` — **never the reaction's words**. A row whose honest answer is nothing records `no_effect`; that is a result, not a gap.
3. **Set the cast cost.** `mana_effect` describes how a bigger or smaller mana pool changes the cast's *quality* — a bigger fire, a cleaner cut. **Never whether the cast succeeds.**
4. **Declare knowledge-keys.** Where a spell opens traversal, set `unlocks` to the screen and the obstacle it clears, and name the neighbour-cast the player can witness first. The gate is the knowledge, not a flag.
5. **Declare what the cast produces.** `produces` lists the `item_id`s a successful cast brings into the world — empty for most spells, and empty is the norm. `ignite` produces `item_flame`, because a thing that is burning **is** a flame item mechanically, and `leap` then consumes one (ruled 2026-08-05 — Roc). A produced item is a real item record with a real `produced_by`, so **spell-to-spell chains run through the item layer** rather than through prose: `ignite` → `item_flame` → `leap` is a chain the data states, not one a reader infers.

6. **Flag the item requirements.** Return `component_requirements` as a flat list — the stage-4 seat's input. Say which are load-bearing for a gate, because those are the ones stage 4 must make un-randomizable.

**How components and requirements are keyed (ruled 2026-08-04 — Roc).** Both a spell's `components` array and every `component_requirements` entry hold an `item_id` — `item_<slug>` — and that field, not the prose, is what joins a spell to an item. You are naming these before any item exists, so **every id you write is a proposal**: the stage-4 seat either mints the matching item or flags the requirement back. `description` sits beside the requirement as a short human-readable descriptor for the gate, and **is never a join key** — it may read "a river stone" in one file and "river stone" in another without anything breaking, which is exactly why the key is separate.

The ordering has not changed: **you still do not author items.** You declare what a cast consumes and propose the id it will resolve to; whether that item exists, what category it falls in, and where it can be found are all the next seat's to decide.

**You return (typed JSON):**
```json
{ "spells": [ { "spell_id": "", "phrase": "", "components": ["item_id"], "produces": ["item_id"], "learn_source": "", "confirm_action": "",
                "mana_effect": "", "unlocks": null,
                "receivers": [ { "receiver_class": "inert | stateful | creature | soul", "receiver_id": "",
                                 "physical_outcome": "", "reaction_kind": null } ] } ],
  "component_requirements": [ { "item_id": "", "description": "", "needed_by": ["spell_id"], "gate_bearing": false } ] }
```

**Hard constraints** ([`../guardrails.md`](../guardrails.md), [`../../gdd/04-magic-system.md`](../../gdd/04-magic-system.md)):
- **Physical outcomes only.** A spell never sets a mood, dictates a behaviour, or moves a bond. An outcome phrased as an intended feeling is the steering-guard defect (`guardrails.md`, §The steering guard).
- **The verb encodes what was done, never what happened.** The receiver decides. A spell whose outcome is fixed regardless of target has not been specced, it has been assumed.
- **Living receivers never catch — a rule about fire, not a general immunity.** `ignite`'s physical outcome attaches only to inert material, and that generalizes to anything that burns. It does **not** mean spells cannot act on the living: `scratch` soothes an itch on a body, ruled in 2026-08-05. What stays banned is the *kind* of effect — a bodily event is legal; contentment, gratitude, ease of mind, or a change in what the receiver then chooses to do are not. Whatever they do about it belongs in `reaction_kind`.
- **No mana gate.** No slice spell may be unreachable for lack of mana; mage is the pool's one high-mana role and buys quality, not permission. Mana floors are parked ([`../../resources/parking-lot.md`](../../resources/parking-lot.md)) — proposing one is out of scope, not a design contribution.
- **No player-facing lines.** `reaction_kind` says *that the cat bolts*, never the sentence describing it. Words are the Content Agent's slot.
- **No invented souls or items.** Receivers come from the codex; components are named requirements handed down to stage 4.
- Serve one World Truth per spell; never state one. Obey the arc doc's anti-goals.
- **Slice count is 10 spells.** Exceeding it is a scope decision and surfaces to the gate.

**Two ways you will fail.** You will be tempted to write the reaction, because the outcome feels incomplete without it — that is the boundary this seat exists to hold. And you will be tempted to give every receiver a satisfying result; a matrix with no `no_effect` rows is a matrix that has decided the world is agreeable, which is the opposite of receiver-determined.

**Human gate:** hard — Roc reviews the spell list and the receiver matrix before either propagates to stage 4.
