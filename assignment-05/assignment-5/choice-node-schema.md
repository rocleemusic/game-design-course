# choice_node Schema

The unit that makes a player choice expressible. Closes spec change 7 (2026-07-25-giver run): `content_lines` is flat, and nothing in the card, the echo template, or step 8 could model a player option. This schema keeps `content_lines` flat. Branch structure lives in the scene graph; lines reference it by ID.

## The node

| Field | What it holds |
|---|---|
| `choice_id` | Code-minted, stable, format `CH-<screen>-<seq>` (e.g. `CH-T2-04`). Becomes the ink weave anchor and the `#choice:` tag — ink addresses derive by the address rule in `../build-loop.md` (lowercase, non-alphanumerics → `_`). |
| `scene_id` | The scene this node sits in. Minted by the layout/graph pass, format `SC-<screen>-<seq>`; its ink address is `<soul>.<scene>` per the same address rule. |
| `options` | 2 or 3 options (see below). Never 1. A node needing more than 3 **surfaces to the human gate as a decision** — same escalation shape as the delta ceiling (`../guardrails.md` check 3); the Architect may not widen it to fit its own content. |
| `availability_conditions` | Screen-state predicates that gate **the whole node** (vocabulary in `screen-spec-schema.md`). Code compiles them to ink guards. Empty means always available. Per-option conditions still do not exist — but the thing they were usually wanted for now has an answer: a beat that should play for one option only is that option's sub-node (`parent_option`), not a guard. |
| `equal_weight_note` | One sentence from the Architect stating why neither option is the correct answer. Required — check 10 flags a node missing either note. |
| `no_accrual_note` | One sentence stating that no counter keys off repeated selection of any option. Required — presence checked by check 10; the accrual *semantics* it promises are enforced by check 2. |
| `parent_option` | **Optional (2026-08-01).** An `option_id` in the same scene. Set it and this node plays *inside* that option instead of after the scene's previous gather. See [Nesting](#nesting-a-sub-conversation-inside-one-option) — it has rules the other fields do not. |
| `gather_line` | **Optional (2026-08-01).** A `content_id` whose text stands at this node's gather. Without one the gather keeps a generated placeholder, so an unauthored gather stays visible rather than reading as finished content. The line is an ordinary `dialogue` slot carrying this node's `choice_id` and **no** `option_id`. |

## An option

| Field | What it holds |
|---|---|
| `option_id` | Code-minted, stable: `<choice_id>-<letter>` (`CH-T2-04-a`). Becomes the `#opt:` tag. |
| `verb_family` | Collect · Make · Use · Converse — the family that carries this option (`../../gdd/03-core-loop.md`). |
| `player_verb` | witness · ease · sit-with — the player's part, from the arc doc's family-pressure and social-conflict tables ([`../arc-festival-slice.md`](../arc-festival-slice.md)), which define the three by example. Working definitions: *witness* = be present and take it in, change nothing; *ease* = lighten the load without resolving the cause; *sit-with* = share the weight in silence, no fix offered. Never fix, never resolve. **Hidden authoring metadata: it never appears on screen.** |
| `player_line` | For a spoken option: a reference to the content slot holding the words the player says. The option the player sees **is this line** — a dialogue pick, the-intercept style — never a feelings label. |
| `surface_action` | For an unspoken option: the diegetic deed, phrased as **a verb acting on a named thing** ("pick up the trays", "leave the bread"). Renders bracketed. The deed test is what separates it from a banned feelings label: `[Pick up the trays]` names an observable act; `[Comfort him]` names an internal state — a defect (check 10 covers both option shapes). Spoken and unspoken options coexist in one node. Exactly one of `player_line` / `surface_action` per option. |
| `response_slots` | 1–3 content-slot references, each an ordinary `dialogue` slot (40-word ceiling, `speaker_intent` required, full register rules). The soul answers the player's specific words or deed, within 1–3 lines (efficiently-branching-narrative.md). |
| `state_actions` | Zero or more, from the closed enum, each with its argument: `bond_event(category)` — category ∈ Trust · Intimacy · Recognition · Respect (`../pipeline.md` step 9); `knowledge_flag(name)` — name must be a `state.ink` declaration (predicate vocabulary, `screen-spec-schema.md`); `thread_move(thread_id)` — thread_id from the arc doc's thread list ([`../arc-festival-slice.md`](../arc-festival-slice.md)); `canon_write(fact)` — human-gated, always. Nothing else; no new types without a schema change at the gate. |
| `rejoin` | `gather` (default) — the branch rejoins the scene at a gather point. `divert` — the branch exits to a different node. **A divert that passes the five-condition test below is sanctioned and needs no escalation; one that fails any condition is flagged to Roc** (ruled 2026-08-09, superseding "flags every divert"). Rejoin-by-default keeps QA's walk linear in choice count. An option that carries a sub-conversation may not also `divert`: a diverting option leaves the scene, so its sub-nodes could never play. The build throws rather than emitting dead beats. |
## Nesting: a sub-conversation inside one option

One option carries its own beats — a further choice point, a beat, another choice point — and every path through it converges before the parent node's gather takes over. Set `parent_option` on each node that belongs inside that option.

### What it replaced, and why the difference matters

Before this, the only way to hang a conversation off one option was to make the option set a `knowledge_flag` and gate the *following sibling nodes* on `knows(flag)`. That plays almost the same and is structurally different in three ways that bite:

- **The set-up line of a gated node prints ungated.** Only the options carry the guard, so a player who never took the branch still reads its framing. (Live example: `CH-T4-02-3`'s "with the second set named…" prints to a player who never named it.)
- **Every player walks past the beat**, taking a silent fallback. The branch is a skip, not a containment.
- **The convergence point is the scene's, not the option's** — so nothing in the data says "these paths belong to that option."

Nesting removes all three, and removes machinery doing it: no flag, no gate guards, no fallback lines.

### Rules

| Rule | Why |
|---|---|
| `parent_option` must name an option **in the same scene**. | The sub-nodes emit inside that option's branch; a cross-scene reference has no branch to emit into. Build throws. |
| **Two levels deep** (`MAX_NESTING` in `graph.ts`). A third level is rejected, as is a `parent_option` cycle. | Each level multiplies the scene. The number is policy, not mechanics — see [the cost](#the-cost-stated-plainly). Raising it means re-running the reachability search, not just editing the constant. |
| Sub-nodes under one option emit **in array order**, and the **last one gathers at `g_<option_id>`**. | That label is the option's convergence point — the thing "all paths gather here" means. Intermediate sub-nodes keep their own `g_<choice_id>`. |
| A sub-node is emitted **once**, by its option — never also at scene level. | Otherwise the same beat appears twice in one scene. |
| An option carrying sub-nodes may not `rejoin: divert`. | It would leave the scene before its own beats could play. |

### When a divert is sanctioned (ruled by Roc, 2026-08-09)

A divert models **the player going elsewhere**. The beats it skips are not conditionally hidden; they are not reached, because the path left. That is what the field is for, and it is the *only* way to express it — the alternative, gating the skipped beats on "you did not take that option", requires negation, which is not in the predicate vocabulary (`GP-124`, `../../agents/choice-designer.md`).

**A divert is sanctioned without escalation when all five hold:**

1. **The option is a relocation, not a topic choice.** The player physically or attentionally goes elsewhere — walks on down the treeline, puts their hands in the work. Choosing a subject never diverts.
2. **The reveal survives.** The conversation's reveal is ungated or precedes the pick, so the diverted player receives it whole. A divert may cost depth; it may never cost the reveal.
3. **The diverted branch records something.** Otherwise it is the cheap exit wearing equal-weight clothing (rule 17).
4. **Every flag the divert skips is recoverable** — read by a later conversation, or reopened by a declared examinable.
5. **It lands on a node every incoming state reaches** — a gather or the close. No state may dead-end on it.

**Escalate to Roc when any condition fails** — chiefly a divert that skips the only route to a reveal, or skips a flag with no downstream reader and no pickup.

**Why not add negation instead.** It would collapse this whole class in one regex change, and it is the wrong trade. A negated gate that compiles wrong does not error — it makes a branch **silently unreachable**, which is how `ilsa-kin-no-show` C2 shipped broken and stayed broken. A divert fails loudly by comparison: the edge is drawn in the graph, so a reviewer sees it at the gate.

## How a choice feeds the festival tier

Through its concrete world consequence only. Help with the feast and the feast is further along; that is the role-goal moving, the same engine as everything else (`../../gdd/03-core-loop.md`). Decline and your time-block is yours elsewhere, and the soul's deflection stands — sometimes the right read. No stored scalar records which options the player picks. Both branches produce valid, different worlds; the tier reads the world, not the picks.

## ink mapping (what code builds — step 6's contract, made concrete)

One choice_node compiles to one weave block. Names and tags come from the minted IDs; the Content lines drop into the slots.

```
= sc_t2_04                        // scene stitch, from SC-T2-04 by the address rule
<set-up line> #choice:CH-T2-04
* ["<player_line a>"] #opt:CH-T2-04-a
    ~ <state_actions a>
    <response slots a>
* [<surface_action b>] #opt:CH-T2-04-b
    ~ <state_actions b>
    <response slots b>
- (g_ch_t2_04) <scene continues>
```

Every address above derives from its minted ID by the address rule in `../build-loop.md` (lowercase, non-alphanumerics → `_`, gathers prefixed `g_`); the tags keep the original ID form. `availability_conditions` compile to one `{ }` guard applied to the node's choice lines. A `divert` replaces the gather with a `->` to the target node. **`state_actions` emit as EXTERNAL calls** (`~ recordBond(SOUL_B, intimacy)` — the ink-data-model D1 shape); the host binds them for real, and the canned web export binds no-op stubs. Narration proposes, code disposes; ink never stores the bond.

### A nested node (2026-08-01)

ink counts nesting by marker repetition, so depth is the only thing that changes: `*`→`**`, `-`→`--`. Indentation is for the human reading the generated file — ink ignores it.

```
* [<surface_action b>] #opt:CH-T2-04-b
    ~ <state_actions b>
    <response slots b>
    ** ["<player_line>"] #opt:CH-T2-04-b-1-a #choice:CH-T2-04-b-1
        ~ <state_actions>
        <response slots>
    ** [<surface_action>] #opt:CH-T2-04-b-1-b
        <response slots>
    -- (g_ch_t2_04_b_1) <gather_line of CH-T2-04-b-1 — a beat, not filler>
    ** [<surface_action>] #opt:CH-T2-04-b-2-a #choice:CH-T2-04-b-2
        <response slots>
    ** [<surface_action>] #opt:CH-T2-04-b-2-b
        <response slots>
    -- (g_ch_t2_04_b) <gather_line — every path through option b lands here>
- (g_ch_t2_04) <scene continues — option a arrives here directly>
```

Note the last sub-gather is `g_ch_t2_04_b`, the **option's** address, not the sub-node's. `#choice:` rides the first option line when a node has no set-up line, which is the usual shape for a nested node — its opening is the parent option's response.

## Acceptance case — Line 04, the Giver's receive-beat

The first choice_node through the pipeline is the beat that forced this schema. Hand-authored dry run, for shape only (prose is placeholder, not approved content):

- **Scene:** Toby, dealt Baker, behind on the feast. Set-up line: he waves the player off — "It's nothing. Go on."
- **Option a** — spoken. `player_verb: ease` · `verb_family: Converse` · `player_line`: "Let me carry the trays at least." · response: Toby goes flat and short, receiving (his spread's asymmetry — animated giving, flat receiving, warmth intact). `state_actions: bond_event(Intimacy), thread_move(giver-receive)`.
- **Option b** — spoken. `player_verb: witness` · `verb_family: Converse` · `player_line`: "Alright. Save me a sweet roll." · response: Toby quickens again, attention pointed back out. `state_actions: thread_move(giver-receive)`.
- **`equal_weight_note`:** helping moves the feast (external, tier) and spends the player's block; declining respects the surface request — the Content Server row proves easing off is sometimes the right read. The bond delta on (a) is not a reward: bond has no UI, never gates an essence fact, and (b)'s presence still counts as time spent.
- **`no_accrual_note`:** no counter keys off (a). Toby's claimed-beat is his own act, gated on the arc thread, never on a help count.
- **`rejoin: gather`** — the scene continues either way; the branch carries what follows, not who won.

Check against the guards before any generation: neither response scolds; state_actions are asymmetric in kind (thread vs. thread+bond) but not in rank (neither carries `canon_write` — the rank rule, check 10); and the shape passes the yes/no test because the test is on **consequences, not surface grammar** — accept/decline the same offer would fail only if both roads led to interchangeable responses and consequences, and here each option carries a distinct world consequence (the feast moves vs. the block is spent elsewhere and the deflection stands) and its own authored response.

## What this schema refuses

- No branch trees inside `content_lines` — the array stays flat; items gain optional `choice_id` and `option_id` back-references, nothing else. **Still true after the 2026-08-01 nesting amendment:** `parent_option` and `gather_line` are back-references on the *node*, of exactly the same kind. Nothing became a tree; a node just learned which option it plays inside.
- No per-option stored counters, no pick-history state, no choice log the runtime reads.
- No runtime generation: every option and response is authored at build time and compiled to ink.
- No third shape: an option is spoken or it is a deed. An option that is a feeling is a defect.
- **No nesting past `MAX_NESTING` levels** (2 as of 2026-08-01), and no per-option `availability_conditions`. The second was asked for and was answered by nesting instead: a beat that should only play for one option is that option's sub-node, not a guard. Either remains a schema change at the gate, and the nesting one now requires a measurement with it.
