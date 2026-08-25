# Assignment #8 — Virtual DM, ICM (folder-as-agent)

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure.

A facts-ledger virtual DM, built ICM-style: no SDK, no API key, no code
holding state in memory. The originating spec calls for a JSON facts
ledger; this build's ledger is plain markdown with a YAML frontmatter
block instead, since ICM's whole premise is state an agent edits by
reading and writing a file directly, not a data structure a program
parses. An agent runs a turn by reading a small set of markdown files in a
fixed order and editing them directly. The character is Mara, the
herbalist NPC from the full game — real reuse, not a toy world.

## What's in this folder

| Path | What it is |
|---|---|
| `characters/mara/brief.md` | Mara's persona card — essence, trait axes, voice register, magic, hard limits |
| `characters/mara/CONTEXT.md` | The turn contract: what to read, in what order, and what to write back |
| `world/hearthlight-brief.md`, `world/truth-guard.md` | The shared world and the one rule every character folder inherits |
| `sessions/_template/` | Blank ledger + transcript, copied per new session |
| `sessions/cold-test/` | A 6-turn walk under the **original** register — clipped, deflective, 12-25 word band |
| `sessions/playtest-2-warmtest/` | A 7-turn walk under the **retuned** register — warmer, wordier, forthcoming — same character, same hard limits |

## The ICM approach

No TypeScript, no `messages.create` call, no `Ledger` object held in memory.
State lives in `ledger.md`, a plain file. Running a turn means: read the
player's line, read what the ledger already knows, decide what actually
happened (not what the player merely claimed), write that to the ledger,
*then* write Mara's spoken line reacting to the updated ledger — never the
other way around. If the line gets written first, nothing stops it from
inventing a fact the ledger never saw. The two-call shape (verify state,
then react to it) is the same shape a coded pipeline enforces with an
extractor call and a DM call; here one agent does both, in order, by
following the contract in `CONTEXT.md`.

## The blackboard pattern — why a ledger instead of an API call

This prototype has no API key wired up, so there's no live back-and-forth
between a "player" model and a "DM" model happening over the wire. Instead,
`ledger.md` acts as a **blackboard**: a shared piece of state that every
turn reads before it writes, and writes before the next turn reads. That's
the same coordination problem a real two-call system solves by passing
messages — here it's solved by both sides reading and writing the same
file. It's slower and it's manual, but it's legible in a way a hidden
context window isn't: anyone can open `ledger.md` mid-session and see
exactly what's been established, with nothing lost to summarization.

## Local LLM findings

Ran this same persona card against several local, fiction-tuned models via
koboldcpp on a separate machine (full findings live in the main project
repo, `pipeline-runs/2026-08-17-register-loosening/`) — the retuned,
warmer register held up well across models, once the card actually
contained the canon it needed (see below). The practical conclusion: local
LLMs are a viable way to run this pipeline without an API key, and **this
ICM folder is the runnable example of that pipeline working** — the same
`brief.md` and `CONTEXT.md` that a human walks by hand here are what a
local model would be handed for the same turn.

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

## A canon-accuracy catch

Testing surfaced a real content bug, not just a tone one. The card's sample
line implied Mara might elaborate on "Ovin," a name attached to an object in
her drawer. Six different local models, given room to elaborate, each
invented a different backstory for him — a romantic history, a forty-year
partnership, a trade story. Checking `narrative-pipeline/npc-codex.md`
against the card turned up the actual rule: **Ovin's objects get zero
provenance, ever** — stricter than the character's normal deflection, not
softer — and Mara's real grief figure is her *sister*, Adren, not Ovin. A
doll in the drawer is Adren's, and it's the one object the canon says Mara
*will* go deep on, naming the person. `brief.md` was missing both facts
entirely, which is exactly why every model free-associated in the same
wrong direction. Fixed by pulling the missing detail in from the codex and
adding two explicit hard limits (no inventing Ovin, no "remember/memory"
language when explaining magic — the second one a separate leak the same
testing round caught, tied to the world's truth-guard). The lesson that
generalizes: when a model invents something wrong, check whether it was
ever given the actual answer before concluding it's a model-quality
problem.

## How to run it

1. Copy `sessions/_template/` to `sessions/<name>/` for a new session.
2. Open `characters/mara/CONTEXT.md` and follow it in order: read
   `brief.md`, the two `world/` files, then the session's `ledger.md` and
   `transcript.md`.
3. Given the player's line, update the ledger first — only what actually
   happened, never a bare claim. Reasoning about *why* goes in the ledger's
   own Reasoning log, not into the visible conversation.
4. Write Mara's line reacting to the updated ledger, append both files to
   `transcript.md`, and check the line against `brief.md`'s hard limits
   before it's final.

No install, no key, no server — the whole loop is reading and editing
markdown files in order.
