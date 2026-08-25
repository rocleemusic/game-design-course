# Assignment #8 — Virtual DM

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure.

A facts-ledger virtual DM, built using a blackboard pattern with context prompts: no SDK, no API key, no code holding state in memory. I had to build it this way because I don't have an API key subscription.  So instead of a JSON facts ledger an agent runs a turn by reading a small set of markdown files in a fixed order and editing them directly. The character is Mara, the herbalist NPC from the full game — real reuse, not a toy world.

## What's in this folder

| Path | What it is |
|---|---|
| `characters/mara/brief.md` | Mara's persona card — essence, trait axes, voice register, magic, hard limits |
| `characters/mara/CONTEXT.md` | The turn contract: what to read, in what order, and what to write back |
| `world/hearthlight-brief.md`, `world/truth-guard.md` | The shared world and the one rule every character folder inherits |
| `sessions/_template/` | Blank ledger + transcript, copied per new session |
| `sessions/cold-test/` | A 6-turn walk under the **original** register — clipped, deflective, 12-25 word band |
| `sessions/playtest-2-warmtest/` | A 7-turn walk under the **retuned** register — warmer, wordier, forthcoming — same character, same hard limits |

## What I built

A turn runs the same way every time, in a fixed order: read the world files,
read Mara's card, read the session's ledger (everything established so
far) and transcript (the last few lines, for phrasing), then read the
player's new line. Update the ledger *first* — only what actually
happened, never a bare claim the player made — then write Mara's line
reacting to the *updated* ledger, then append both to the transcript. If
the line got written before the ledger, nothing would stop it from
inventing a fact the ledger never saw; the order is the whole point.

`ledger.md` is the shared state both the update step and the dialogue step
read and write. There's no live back-and-forth over an API in this build —
the ledger file does that job instead, so anyone can open it mid-session
and see exactly what's been established, with nothing lost to a hidden
context window.

## Register retune — before / after

`sessions/cold-test/` and `sessions/playtest-2-warmtest/` are the same
character, same hard limits, same world, walked under two different voice
registers:

- **Before (cold-test):** 12-25 word band, deflection as a near-total dodge
  — ask her almost anything and she answers with an object's history
  instead. Landed three narrow proof points (a false-claim catch, a
  five-turn recall, a truth-guard hold) over 6 turns.
- **After (playtest-2-warmtest):** 20-50 word band (75-word ceiling),
  deflection scoped to *questions about her specifically*, forthcoming by
  default about the world and her craft, spellcasting shown as a physical
  act (a real component, a spoken trigger word) instead of just named. Over
  7 turns: a name exchange, festival lore, a spell taught and demonstrated
  on-page, a gift, and a farewell that leaves a reason to come back — while
  still holding every hard limit (no World Truth spoken, the drawer never
  explained, she's never released from the grief).

The retune's goal was compression: the full game runs 10-20 minutes, so a
single NPC conversation needs to land real bonding in 6-8 turns, not 20.
Cutting deflection back to only where it belongs (the character's own
grief, not the world around her) did most of that work — most turns in the
cold version were spent getting *past* a deflection instead of getting an
answer.

## Local LLM testing

Ran this same folder against several local, fiction-tuned models via
koboldcpp on a separate machine (full findings live in the main project
repo, `pipeline-runs/2026-08-17-register-loosening/`) — the retuned,
warmer register held up well across models, once the card actually
contained the canon it needed (see below). The practical conclusion: local
LLMs are a viable way to run this pipeline without an API key, and this
folder is the runnable example of that pipeline working — the same
`brief.md` and `CONTEXT.md` that a human walks by hand here are what a
local model would be handed for the same turn.

## Did it catch something I would have missed?

Yes — a real content bug, not just a tone one. The card's sample line
implied Mara might elaborate on "Ovin," a name attached to an object in her
drawer. Six different local models, given room to elaborate, each invented
a different backstory for him — a romantic history, a forty-year
partnership, a trade story. Checking the game's own NPC codex against the
card turned up the actual rule: Ovin's objects get zero provenance, ever —
stricter than the character's normal deflection, not softer — and Mara's
real grief figure is her *sister*, Adren, not Ovin. A doll in the drawer is
Adren's, and it's the one object canon says Mara *will* go deep on, naming
the person. `brief.md` was missing both facts entirely, which is exactly
why every model free-associated in the same wrong direction. Fixed by
pulling the missing detail in from the codex and adding two explicit hard
limits (no inventing Ovin, no "remember/memory" language when explaining
magic — a separate leak the same testing round caught). The lesson that
generalizes: when a model invents something wrong, check whether it was
ever given the actual answer before concluding it's a model-quality
problem.

## Were you able to run this in your game?

Not yet — this is the standalone prototype the assignment calls for.
Wiring it into the live build (handing off to this kind of runtime
dialogue after a player exhausts the day's authored content) is scoped for
after the capstone, per the current design ruling on NPC dialogue.

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
