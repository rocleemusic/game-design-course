# Assignment #5 — Goal-Oriented Coding Agent

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure, built with ink inside Unreal 5.8.

---

## A note on which brief this answers

The written brief and the class slides asked for a scaffold-based agent — an LLM call loop,
a `priority_score()` to implement, a gap-detection pass — with a 6–10 hour estimate. In class
on 2026-07-30 that was withdrawn and replaced:

> "What we're really trying to accomplish in this class is to create a goal-oriented agent.
> So all I really want for this assignment is that you create agents that have goal orientation,
> that have a goal in mind and can accomplish things with a goal. That's it." *(transcript 01:58–02:09)*
>
> "So just create a goal-oriented agent. Run it on your repository, create a readme that
> explains what it did and how it works. That's it. That's all I want." *(03:10)*

This submission answers the spoken version. It is an agent that already exists in the project,
was built to solve a real problem, and has been run on real content — rather than a scaffold
built to satisfy a rubric.

I did start the scaffold version first. It is in `_abandoned/gap-auditor/` with a note explaining
why it was dropped.

---

## The agent

**[`agents/choice-designer.md`](../../agents/choice-designer.md)** — the Choice Designer seat.

The agent *is* that file: a 24KB role contract, dispatched to an isolated subagent. It is
referenced here rather than copied, because this project treats a copied contract as a defect —
copies diverge from the source of record and the next run obeys the stale one.

**Its goal, in one sentence:** every conversation in a thread must be *reachable* — every state a
real player can arrive in reaches the end, and the structure compiles into something the game engine
can actually execute.

The seat split off the Narrative Architect on 2026-08-04 because "what gets revealed" and "when it
can be reached" are two different decisions. Three seats divide the work, one line each:

| Seat | Owns | The line |
|---|---|---|
| Narrative Architect | Cards, arc, threads, which conversation carries which reveal | **revealed** |
| **Choice Designer** | The conversations inside that frame — nodes, gates, options, outcomes, fallbacks | **reachable** |
| Lines | The prose | **spoken** |

### How it runs

Agents in this project are markdown role contracts dispatched as isolated subagents, one per call,
under a call-down / signal-up protocol (`narrative-pipeline/agents/orchestrator.md`). Each gets a
prepared input and returns a typed output. Workers never call each other, and nothing ships unread —
there is a human gate at the output.

To run this one: hand a subagent the full text of
[`agents/choice-designer.md`](../../agents/choice-designer.md) plus one thread document, with read
access to [`narrative-pipeline/templates/choice-node-schema.md`](../../narrative-pipeline/templates/choice-node-schema.md)
(the node its graphs must map onto) and
[`narrative-pipeline/guardrails.md`](../../narrative-pipeline/guardrails.md)
(the invariant set — checks 2 and 10 bind it directly).

**Input:** a thread document whose conversation sections read *Awaiting Choice designer*. The document
already carries the open question, the reveals, dependency order, the flag table, constraints, pacing,
and the card fields that must not be contradicted. It also reads `tools/resolver/data/scene-graph.json`
for the data shape its design compiles into.

**Output:** the same document, edited in place. Each conversation section gets a content block (what is
open, what is closed, what the soul reveals, per incoming state) and a mermaid graph in a fixed
convention — hexagons for gates, rounded nodes for options, parallelograms for what an option records,
double circles for rejoins, subgraphs for nesting.

### The reasoning layer

This is the part the assignment cares about, so it is worth being concrete. The agent is not
free-associating; it decides under 17 numbered rules, each carrying its reason. A sample:

- **Sizing** — start from a seed of 6 choice nodes per conversation and vary −2 to +3. Every
  conversation lands in 4–9, and no two conversations in one thread land on the same count. The seed
  is the measured median of v01's existing scenes. A conversation resolving in two picks reads as a
  menu, not a scene.
- **Variety** — a thread whose every conversation is "ungated node → gate → node" is a defect *even
  when every individual rule passes*. Sameness of shape is a structural finding, not a style note.
- **Bounded reads** — a conversation reads at most two prior facts, because each fact read doubles the
  variants. Two facts is four states, which is writable and walkable.
- **No dead ends** — all four incoming states must walk to the end. A missed fact makes a conversation
  *shallower*, never rerouted, because not-knowing is legal play.
- **Equal weight** — no option is the correct answer. If one option is always right, the choice is
  decoration.

It also knows what it does **not** own: no prose, no deciding what gets revealed, no new flags, no
editing any file but the thread document in hand. When a design needs one of those, it escalates
instead of reaching for it.

---

## The run

`sample-run/` holds a real run on `lantern-projects/v01/threads/toby-the-shelf.md`, taken from git
history rather than staged for this submission.

| File | What |
|---|---|
| `01-before_toby-the-shelf.md` | Commit `de9db649` — 128 lines. Four sections reading *Awaiting Choice designer* |
| `02-after_toby-the-shelf.md` | Commit `b7522f33` — 236 lines. Four content blocks, four mermaid graphs |
| `03-diff.patch` | The diff: **+112 / −4** |

### What the agent built

Structure for four conversations in Toby's shelf thread — the thread where a baker quietly converts
gifts he is given into goods and sends them back, and will not have attention turned on him for it.

Taking C1 as the example: an ungated first-contact node with three ways in (ask about the jar shelf,
pitch in on the order, talk about the order), then a second node gated on `knows(shelf_seen)` that
only opens if the player marked the shelf. Ask about the jars and attention turns on him, which his
card says he deflects — so he goes flat and reaches for an unfinished task. Don't ask, and the scene
ends at the first gather, with the `ex-shelf` examinable left in the world to reopen it later.

That is the rule set doing visible work: the closed path still delivers content, the shallow player
is not punished, and neither option is the right answer.

### Why it picked that feature

It didn't pick from a ranked backlog — the gap is marked in the input. A conversation section reading
*Awaiting Choice designer* **is** the detected gap, and the seat is only called once the Architect's
brief above it is complete (thread shape, dependency order, flag table, constraints all present).

Prioritization happens *inside* the thread instead: which conversation carries which device, how many
nodes each gets, which of the four incoming states justifies opening extra structure, and which paths
get closed and reopened by an examinable.

---

## Did it run in the game?

Yes. The output is not a document that describes the game — it compiles into it:

```
thread doc (mermaid + content blocks)
  → tools/resolver/data/scene-graph.json
  → resolver  →  .ink
  → story.json  (inkVersion 21)
  → lantern (browser player)  ·  Unreal 5.8 via Inkpot
```

The Unreal side was proven separately: the v01 ink tree was imported into the Perforce workspace
(`rebirth/Content/Ink/v01/`) with The Chinese Room's **Inkpot** runtime and a spike Blueprint,
`BP_InkSpikeSpawner`, making the story clickable in-engine. Inkpot was chosen over inkcpp on
2026-08-02 because inkcpp's Fab listing stops at UE 5.7 and the engine is 5.8.

---

## What I changed before accepting it

Two things, and both became permanent rules — which is the useful part.

**1. The agent designed a gate the engine cannot execute.**

C2 of `ilsa-kin-no-show` was drawn with the gate `not knows(bench_end_taken)`. It reads correctly,
it passed human review, and it is silently broken: the resolver parses gates as

```
^knows\(([^)]+)\)$
```

No `not`, no `!`, no `&&`. A gate using negation compiles to nothing and the branch becomes
**unreachable without erroring** — the worst failure shape, because nothing downstream treats it as
suspect. The conversation had to be rebuilt.

On 2026-08-09 I ruled (GP-124) to redesign around the constraint rather than extend the compiler,
and wrote the reason into the contract: express the not-knowing case as the **ungated fallback**
instead. The knowing case takes the gated node; everyone else walks the path that was already
required to exist.

This is the whole lesson of the assignment in one bug. The agent's reasoning was sound and its
output was ungrounded in what the codebase could actually run. The fix was not a better prompt —
it was writing the engine's real constraint into the agent's contract, with the story of how it
was found, so the next run cannot repeat it.

**2. It escalated rather than silently fixing a defect it found.**

Designing C2 of `toby-the-shelf`, the agent noticed that a player who completes the conversation
without `shelf_seen` can never set `shelf_named` — no examinable reopens it and the conversation
does not replay — which permanently closes C4's entry gate for that player. It flagged this to me
in the output and did not fix it, because reveal-reachability belongs to the Architect.

That is the behaviour I want from a goal-oriented agent with bounded authority: pursue the goal,
and when the goal requires crossing a line the contract draws, surface it instead of crossing it.

---

## Files

```
assignment-5/
├─ README.md                          this file
├─ pipeline-position.md               where the agent sits — graph + the 7 steps
├─ sample-run/
│  ├─ 01-before_toby-the-shelf.md     input — gaps marked
│  ├─ 02-after_toby-the-shelf.md      output — structure generated
│  └─ 03-diff.patch                   +112 / −4
├─ report/
│  └─ gap-audit-2026-08-03.md         run log from the abandoned attempt, kept for the record
└─ _abandoned/
   ├─ NOTE.md                         why the scaffold version was dropped
   └─ gap-auditor/                    incomplete, does not run
```

The agent and the contracts it reads live in the project, not in this folder:

| File | Role |
|---|---|
| [`agents/choice-designer.md`](../../agents/choice-designer.md) | **The agent** — 17 rules, output convention, escalations |
| [`narrative-pipeline/templates/choice-node-schema.md`](../../narrative-pipeline/templates/choice-node-schema.md) | The node its graphs must map onto |
| [`narrative-pipeline/guardrails.md`](../../narrative-pipeline/guardrails.md) | The invariant set |
| [`narrative-pipeline/agents/orchestrator.md`](../../narrative-pipeline/agents/orchestrator.md) | How seats are dispatched — call down, signal up |
| [`lantern-projects/v01/threads/toby-the-shelf.md`](../../lantern-projects/v01/threads/toby-the-shelf.md) | The thread it was run on (current state) |

### Packaging for upload

To produce a standalone bundle, copy the four files above alongside this folder. Do not commit
those copies back into the repo — `node tools/ref-lint.mjs` fails on them, because their relative
links no longer resolve from the new location. That check is a gate here, and it is the reason
this README references rather than duplicates.
