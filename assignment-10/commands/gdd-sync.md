# GDD-SYNC Command

## Trigger

Roc says "gdd-sync" or invokes `/gdd-sync`, at the end of any game-project session. Also runs as a named step whenever `pause` or `post-mortem` runs in a game-project context — before the PAUSED.md write or the candidate list, so rulings are reconciled while the session is still open.

## What It Does

Reconciles this session's rulings into `ProjectOS/game-project/gdd/`, so the GDD stays the source of truth as iteration moves past it. The command proposes; it never writes without Roc's approval. Every diff is gated, because GDD content is design.

## Scope

A **ruling** is a decision Roc made this session that carries a date: a scope call, a date change, a technology choice, a process rule, a reversal of a prior decision. If Roc decided it and a future session could act on it, it is a ruling.

Out of scope:
- **Task status** — that is Paca ("Paca holds state; markdown holds reasoning").
- **Session handoff** — that is `pause`.
- **Working-style discoveries** — that is `post-mortem`.

## Protocol

1. **List this session's rulings.** Scan the conversation for decisions matching the Scope definition above. If there are none, say "no rulings this session" and stop — a no-ruling session costs one line.
2. **Map each ruling to its GDD home.** Before mapping: read `ProjectOS/game-project/gdd/CONTEXT.md` (the index — its "How the pieces fit" table says which file owns which topic). Name the one GDD file that should carry each ruling. A ruling with no natural home is flagged to Roc as a structural question, not forced into a file.
3. **Check for reversed reference docs.** For each ruling, ask: does it reverse a recommendation in `knowledge-base/` or another reference doc the GDD points at? Find candidates by searching `knowledge-base/` and every doc the target GDD file links to for the ruling's topic terms. If a doc is reversed, it needs a supersession banner (rule below).
4. **Propose all diffs in one batch.** For each: the file, the diff, and a one-line why. Include the supersession banners. Do not write anything yet.
5. **Roc approves.** Per diff: apply, skip, or reshape. Write only what was approved. Edits auto-commit through the repo hook. When a ruling also lives in `game-project/CONTEXT.md`: CONTEXT.md may keep an operational summary, but the GDD file it cites is the authority. Do not delete the CONTEXT.md copy — make it point at the GDD.

## The Banner Rule

A ruling that reverses a research or reference doc gets a supersession banner at the top of that doc, in the same session as the ruling:

> **⚠ SUPERSEDED (ruling YYYY-MM-DD): [the new decision].** [One line on why.] Authority: `[the GDD file that holds the ruling]`.

The doc's body stays untouched — the analysis remains useful history. The banner exists because the GDD forwards readers to reference docs, and a forwarded reader must hit the reversal before the stale recommendation.

## What It Prevents

The Inkpot case (2026-08-02): the runtime ruling landed in `CONTEXT.md` and chat, while `gdd/12-technical-overview.md` still presented the choice as open — with the rejected option listed first — and forwarded readers to a knowledge-base doc that concluded "ship via inkcpp" with no banner. One day of drift, and the GDD was routing readers to the reversed answer.
