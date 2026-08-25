# Assignment #8 — Virtual DM

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure.

A facts-ledger virtual DM, built using a blackboard pattern with context prompts: no SDK, no API key, no code holding state in memory. I had to build it this way because I don't have an API key subscription.  So instead of a JSON facts ledger an agent runs a turn by reading a small set of markdown files in a fixed order and editing them directly. The character is Mara, the herbalist NPC from the full game — real reuse, not a toy world.

## What's in this folder

| Path | What it is |
|---|---|
| `agent.md` | **Start here.** The turn contract: what to read, in what order, and what to write back |
| `characters/mara/brief.md` | Mara's persona card — essence, trait axes, voice register, magic, hard limits |
| `world/hearthlight-brief.md`, `world/truth-guard.md` | The shared world and the one rule agent.md inherits |
| `sessions/_template/` | Blank ledger + transcript, copied per new session |
| `sessions/cold-test/` | A 6-turn walk under the **original** register — clipped, deflective, 12-25 word band |
| `sessions/playtest-2-warmtest/` | A 7-turn walk under the **retuned** register — warmer, wordier, forthcoming — same character, same hard limits |

## What I built

A self-contained folder that runs one NPC — Mara, the herbalist from the
full game — as a virtual DM, with no code and no API key: a persona card,
two shared world files, and a session ledger + transcript, all plain
markdown. `agent.md`, at the folder root, is the only "program" — a turn
contract an agent (or a person) follows by hand: read the world and the
card, read what the session ledger already knows, update it with what
actually happened this turn, then write Mara's line reacting to that
updated state. Two test sessions are included as evidence
(`sessions/cold-test/`, `sessions/playtest-2-warmtest/`), showing the same
character walked under two different voice registers.

## Short ReadMe

**A brief description of the world you built.**

Hearthlight is a small hand-painted village where the year turns on one
night: the Festival of Souls, when the Lantern Arch is said to light the
way for the dead to return so the living can remember them. The player is
a traveling mage collecting folk magic from around the world; magic here is
ordinary craft (an herbalist's *steep*, a blacksmith's *temper*), never
spellbook fireworks, and every cast produces a physical outcome only, never
a feeling. Mara keeps the town's anchor spot and brews the festival tonic
from the season's last herbs — and keeps a drawer of things nobody's come
back to claim.

**An explanation of what your ledger tracks.**

Two kinds of state. A YAML block up top tracks the player's concrete
situation — name, location, what they're holding, which spells they've
cast, plus two story flags. Below that, plain markdown sections track
everything Mara's turns depend on: **Actions** (things confirmed to have
happened — never a claim taken at face value), **Promises** (things Mara
said she'd do), **Mara observed** (what the player told her about
themself), and **Mara has already shared** (so she doesn't repeat a story
or re-teach a spell). A **Reasoning log** section holds the *why* behind an
update or a line choice, so that reasoning stays in the file instead of
leaking into the visible conversation.

**One specific moment where the agent surprised you during testing.**

The register retune itself was the biggest surprise: going in, I expected
"warmer" to mean softer rules, and instead the fix was almost entirely
about *where* deflection was allowed to fire. The cold version wasn't
failing because it was too terse — it was spending most of its turns on
deflections that never actually answered anything. Scoping deflection to
only the character's own grief (never the world, never her craft) freed up
the exact same character to answer real questions directly, and that alone
compressed a full arc — name, lore, a taught spell, a gift, a goodbye with
a hook — into 7 turns instead of the cold version's 6 turns spent mostly
getting *past* her.

Testing this same card against local models (koboldcpp, several
fiction-tuned 9B-12B models plus a 26B MoE model, full findings in the main
project's `pipeline-runs/2026-08-17-register-loosening/`) turned up two
moments that stuck with me. **MN-Violet-Lotus-12B**, asked about an object
in Mara's drawer tied to an unelaborated background name ("Ovin"), invented
a full 163-word romantic history on its own — a first date, a festival
role inherited from his father — none of it canon, none of it asked for.
Nobody told it to invent a relationship; given an unexplained name and room
to run, it just did. The other model I tested, a 26B MoE model
(`gemma4-26b-fiction-bf16`), given the *same* prompt, produced this
instead: *"It was Ovin's favorite — no, it was just a hinge."* It started
down the same path the other model took — reaching for sentiment — then
caught itself mid-sentence and landed on flat understatement. That's the
card's own deflection rule (hesitate, then give something real instead)
performed correctly, unprompted, by a model that was never told the
structure — the best individual line either round of testing produced.

## How to run it

1. Copy this folder somewhere local.
2. Copy `sessions/_template/` to `sessions/<name>/` to start a new session.
3. Point an agent (Claude Code or any coding agent with file read/write) at
   the folder and tell it to read `characters/mara/CONTEXT.md` and follow
   it, using your new session folder.
4. Talk to it as the player — type a line, get Mara's line back. Every
   turn updates `ledger.md` and `transcript.md` in your session folder, so
   you can open either file at any point and see exactly what's been
   established.

No install, no key, no server — the whole loop is reading and editing
markdown files in order.
