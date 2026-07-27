# World & Progression

Save-state, the game clock, and the persistence/bond runtime mechanics. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD. The soul roster itself lives in [`07-cast.md`](07-cast.md); the full bond-accretion algorithm lives in [`../narrative-pipeline/pipeline.md`](../narrative-pipeline/pipeline.md) step 9 and [`../narrative-pipeline/guardrails.md`](../narrative-pipeline/guardrails.md) check 2 — this file states the GDD-altitude account, not the mechanism.

## Save-state: what the save file records

The game tracks save-state across two boundaries: **within a life** (festival to festival, as the calendar turns) and **across a new life** (starting a fresh save slot, which reshuffles). A player can delete a single save slot to wipe just that life — the meta-hub and other slots are untouched. A hard wipe of the save data from disk erases everything, including the meta-hub; nothing survives it (a distinction carried over from v4, dropped in the v5 consolidation, restored here since it holds for all data, not per-slot). There are 3 save slots — three parallel lives on separate timelines; the meta-hub collection is shared across all of them, while each life's in-game home starts empty. On a true new game — no save data yet anywhere on disk — the player is always dealt mage. Once any save exists, creating another save slot lets the player pick a role instead, from [`07-cast.md`](07-cast.md)'s pool — for the slice, a choice between Mage and Blacksmith; the full pool is the eventual full-game set.

| Data                                                          | Within a life (festival → festival)                                        | Across a new life (new slot)                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Spells**                                                    | Yes, in the notebook                                                       | Yes, in the notebook                                                                               |
| **Sounds** (audio-objects)                                    | Yes                                                                        | Yes                                                                                               |
| **Physical items** (components, made things, mementos, tools) | Kept in your home across festivals; the satchel carries between locations  | **No** — the new life's home starts empty                                                         |
| **Bond level** (per soul)                                     | Yes, grows                                                                 | Yes, carries across lives                                                                          |
| **Roles / relationships**                                     | Fixed                                                                      | Re-dealt                                                                                           |
| **In-game home** (this life's décor)                          | Yes, accrues across festivals                                              | **No** — a new life starts empty                                                                   |
| **Meta-hub collection** (items *held* · sounds *heard*)       | Grows as you discover                                                      | **Yes** — permanent; shared across lives; new finds unlock as display pieces, never for use in play |

*Roles are chosen once per life — the player's alongside that life's present souls, dealt from what's left after the player's pick — and locked for the life. On a true new game (no save data yet on disk) the player is always dealt mage; once any save exists, creating another save slot lets the player choose instead. For the slice, that choice is Mage or Blacksmith only; the full pool ([`07-cast.md`](07-cast.md)) is the full-game set. The only way to get a different player role is creating another save slot, or clearing an existing one down to no-save-data.*

## The game clock

Time in the game follows this structure:

- **Day.** A day runs **morning → afternoon → evening**. You open in the morning with a move budget (about 3–5 screen-moves); the time then turns to afternoon, where you may move to a new location or stay for a few more moves (about 3). The day ends in the **evening**, at whatever screen you're on — when evening-only spots like the Tavern are open — then you return home and pick the next day's location.
- **Festival cycle.** The lead-up to a festival night — one week (currently 5 days, expandable) in the slice, up to three weeks in the full game — then festival night and its ending vignette.
- **The turn of the year.** After each festival the calendar advances toward next year's festival; time passes, neighbors remember, and the next cycle begins in the same life. Continuing a life through further turns of the year like this one is the full-game target; for the slice this path is grayed out, so a slice life doesn't reach a second turn of the year.
- **A life (a save slot).** Many festival cycles, continuous: `cycle → festival → turn of the year → cycle …`. Roles are chosen once, at creation, and stay fixed for as long as that life runs; home, bonds, and collection accrue across whatever festivals that life reaches.
- **A new life (a new timeline).** Starting a fresh save slot reshuffles / re-deals roles (essence and personality fixed); bonds carry across.

## Essence vs. bond — two things tracked, never feeding each other

**The essence side is fact** — assertable, confirmable, and revisable: what you have learned and can prove about who a soul is. It is what any future recognition gate would check. **The bond side is emergent** — a single hidden count that accretes from how you treat a soul, never shown and never split into stored sub-scores. It is what warms a soul's dialogue across lives ([`03-core-loop.md`](03-core-loop.md)) and produces the oblique reciprocity described below. Essence is deduction; bond is relationship — neither feeds the other. This split is load-bearing for the narrative pipeline: [`../narrative-pipeline/guardrails.md`](../narrative-pipeline/guardrails.md) check 2 (Superposition) enforces it directly.

## The persistence engine (runtime)

The shipped game's memory is ordinary game code, not a model call. A persistence engine remembers your incarnations, tracks the bond level per soul (the single hidden count above, accreted from weighted interactions across four action-categories — trust · intimacy · recognition · respect — with per-soul card-trait coefficients; the full weighting mechanism is specced in [`../narrative-pipeline/pipeline.md`](../narrative-pipeline/pipeline.md) step 9), gates the calendar, re-deals roles and relationships at life boundaries, and surfaces soft in-world reminders.

**That same hidden count drives the oblique reciprocity** ([`03-core-loop.md`](03-core-loop.md)): as it rises, the runtime selects warmer dialogue variants for that soul — a bond-driven text *selection*, not a new system. Runtime LLM calls, cloud-token usage, and AI cost are all zero at play time; the dev-crew's only obligation toward this system is to author the schema the runtime reads (see [`11-ai-agents-and-pipeline.md`](11-ai-agents-and-pipeline.md)).
