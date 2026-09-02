# Audio Implementer — the seat that gives the game sound

Feature owned: **every sound in the build, from "this interaction could use one" to
a file playing through the right volume bus.** Named as the other unstaffed
candidate in [`../README.md`](../README.md); this is that seat, staffed.

**Why a folder, not a single role-prompt file like its siblings.** The other seats
in `../` are stateless — call them, get a typed answer, done. This one runs a loop
across sessions (propose → human makes the sound → stage it → wire it), so the loop
needs a place to keep state between calls. `asset-list.json` is that state. Built to
the [`icm-architect`](P:\GitHub\icm-architect) conventions: this file routes, it
doesn't explain — the explanation is in [`CONTEXT.md`](CONTEXT.md).

**Nothing plays yet.** `OptionsScene.ts`'s Sound category (Music / Sound Effects /
Forest & Town Ambience / Spell Cast Sounds) is a marked-`INERT` mockup, and no
`this.sound` call exists anywhere in `phaser/src/`. The first run of this seat
stands up the bus each category needs before anything can be proposed against it —
see `CONTEXT.md`'s Stage 0.

## Where things live

| Path | What it holds |
|---|---|
| `CONTEXT.md` | the loop's contract — one stage per step, reads/does/writes/human-check |
| `asset-list.json` | the ledger — one entry per sound slot, `status` is the state machine |
| `categories/` | factory reference — one file per bus, mapped 1:1 to `OptionsScene`'s Sound rows |
| `staging/` | drop zone — human puts finished audio files here, named by slot id |

## Where we are right now

Status is derivable by scanning `asset-list.json` — don't keep a separate tracker:

| `status` count | Reading |
|---|---|
| `proposed` > 0 | Waiting on Roc — make the sound, or reject the slot |
| `staged` > 0 | Waiting on the agent — run Stage 3 (wire) |
| Everything `implemented` or `rejected`, nothing `proposed`/`staged` | Loop is dry — run Stage 1 (propose) to find the next batch |

## Route by what just happened

| If | Go to |
|---|---|
| Starting the seat for the first time | `CONTEXT.md` Stage 0 (bus bootstrap) |
| Looking for what needs sound | `CONTEXT.md` Stage 1 (propose) |
| Roc dropped a file in `staging/` | `CONTEXT.md` Stage 3 (wire) |
| Asked "what's the status" | the table above, read straight from `asset-list.json` |
| Adding a whole new category (not one of the current 4) | `CONTEXT.md`'s "Adding a category" note, and update `OptionsScene.ts` together — a bus with no slider is unreachable by the player |

## The one rule

A slot never leaves `staged` for `implemented` without the sound actually playing
through its category's bus in a real build. Wiring code that isn't heard is the
same failure as not wiring it, and harder to notice.
