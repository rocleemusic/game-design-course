# Design Pillars

The 7 design pillars, each carrying the thing a builder must never do that would violate it. The refusal is the contract; the phrase is the reason. See [`CONTEXT.md`](CONTEXT.md) for how this fits with the rest of the GDD.

| Pillar                                               | What a builder must never do                                                                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discovery is the reward**                          | Never hand the player the answer. Watching a neighbor cast gives clues, not the spell; the player still confirms by trying.                                |
| **Cozy rhythm**                                      | Never hard-stop the player. No single-chain dead-ends, no forced sequence. A stuck player always has another live thing to do.                                                            |
| **Pull, not push**                                   | Never issue a directed command or a quest-arrow. The world *offers* leads; it never orders.                                                          |
| **Knowledge lives in the player's head, not a flag** | Never flag-block a gate the player has the knowledge to solve. Gates are *performed* (cast the correct spell, know where to find the item), never checked against a "visited X?" boolean. |
| **Non-violent core**                                 | Never resolve a beat with a fight, a fail-punish, or a threat. Conflict is social and internal, never combat.                                                                             |
| **Strategy over dexterity**                          | Never gate anything on timing, aim, reflex, or precision input. Every gate is knowledge, recall, or a social state.                                                                       |
| **Agentic AI accelerates, it never decides**         | Never ship a line no human approved. Agents generate volume and check consistency; a human reviews and approves every line before it ships.                                               |

**Note on scope.** An earlier draft (v4) also carried a Non-Goals list (no multiplayer/co-op, no tactical combat, no live-service, no hard-lose, no red-herring content). That list was dropped in the v5 revision and is not being restored — confirmed intentional, not an oversight.
