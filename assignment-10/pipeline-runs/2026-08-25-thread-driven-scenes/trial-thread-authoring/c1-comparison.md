# Trial 2 — full C1 graph (Architect brief + Choice-designer graph), blind

Both engines got the same brief: Toby's card, the ratified `toby-feast-short`
registry row, the already-delivered canon (flat dough, forty short, the
flask gesture), the choice-node-schema basics, the exact mermaid convention,
and choice-designer.md's 22 rules condensed. Neither saw the real
`toby-feast-short.md`. Raw outputs: `c1-claude-raw-output.md`,
`c1-26b-raw-output.md`. Real answer for reference: `toby-feast-short.md` C1
(lines 176–256).

## Scorecard against choice-designer.md's rules

| Check | Claude | 26B | Real C1 |
|---|---|---|---|
| Mermaid syntax (`flowchart TD`, correct shapes) | Correct throughout | Uses `graph TD` (asked for `flowchart TD`); **subgraph declared with the same id as an already-declared node** (`subgraph CH-2` reuses the `CH-2` rectangle's id) — this is a parse conflict, not just a style slip | `flowchart TD`, exact convention |
| Node count (rule 15: seed 6, range 4–9) | 6 top-level + 1 nested depth-2 | 4 top-level, wrapped in subgraphs it calls nodes | 6 top-level + 1 nested depth-1 |
| Internal consistency (same option/content appearing once) | Clean — each node's options are unique to it | **Broken.** "How much more do we need?" and `shortfall_count: 18` appear twice, once inside the `CH-2` subgraph and again inside the `CH-3` subgraph, as if the same option belongs to two different nodes. The prose content-block's node numbering doesn't match the mermaid's node numbering either — Part B's prose describes options under "CH-1" that the mermaid draws inside the `CH-2` subgraph | Clean |
| Nesting used correctly (an option contains a sub-node, not a generic wrapper) | Yes — `N3a_sub` is a real nested choice node inside option `-a`, correct depth-2 mechanics, correct `g_<option_id>` rejoin label | **No.** Every node's options are wrapped in a `subgraph` regardless of nesting — this reuses the subgraph shape as a container for a normal node's own options, not as the schema's nesting device (an option containing a further choice) | Nested child inside option `-a`, correct label `g_CH-T2-15-2-a` |
| Action/object slots actually drawn (rule 18) | 2 stadium shapes (`OS1`, `AS1`), matches its stated 1:3 ratio | **Zero drawn anywhere in the mermaid**, despite the text claiming "Action-Slot Ratio: 1:3" — the ratio is asserted, not built | 5 action/object slots, ratio ≈1:3.6 |
| Rule 19 (fragment → action → fragment weight build) | Explicitly built at the long-run/conversion beat, ties to the one action slot present | Not attempted — no weight-beat construction discussed at all | Explicit rule-19 build on node 4 |
| Rule 20 (long run: placement, word count, ceiling) | Placed at the conversion/arithmetic beat, correctly reasoned (not receiving/thanked/payoff) | Placed at CH-2's arithmetic beat, 72 words — **also correctly reasoned and within ceiling** — this is the one place the 26B matches Claude and the real answer | Placed at node 2's set-up, the arithmetic beat |
| Numeric fidelity to canon | Deliberately withholds the exact shortfall count, reasoning (unprompted) that exact numbers belong to a later conversation | **States an exact number** — "twenty-two loaves on the bench, eighteen-loaf deficit" — contradicting the real thread's own design, where the exact count ("twelve down from forty") is reveal R2, held back until conversation 2. The 26B invented its own numbers (22, 18) that don't even match the real canon's 40 | Exact count deliberately absent from C1; it's C2's reveal |
| Rule 7 (equal weight, no correct answer) | Discussed explicitly per node | Not discussed | Discussed explicitly |
| Rule 6 (closed-path examinables) | Named (the flask, the debt-deflection flag left for later) | Not addressed | Named (`ex-order-slate`, etc.) |
| Option lettering / verb_family tagging | Correct, unique per option | **Every option mislabeled "a ."** regardless of its actual letter (b and c options all say "a . Converse ..." etc.) — a copy-paste artifact, not a one-off typo | Correct |

## Read

The first trial (the simple 7-column thread row) showed the 26B producing a
*thin* but structurally valid answer. This harder trial — a real graph with
gates, nesting, action slots, and internal cross-references — is where the
gap actually opens up. The 26B's output isn't just weaker prose; it's
**internally inconsistent with itself**: the same option text and flag
appear attached to two different nodes, the prose content-block's node
numbering disagrees with its own mermaid diagram's numbering, the nesting
convention is used as a generic grouping device rather than the schema's
actual sub-choice mechanism, and it introduces a numeric shortfall figure
that contradicts both the real thread's reveal sequencing and the canon
number already established (forty, not twenty-two). None of that is a
matter of taste — a downstream build step (or a human reviewer) would flag
all of it as broken, not just plain.

Claude's output held together as an actually-implementable graph: valid
mermaid, no self-contradiction, correct nesting mechanics, action slots
drawn and their ratio truthfully stated rather than just claimed, and it
independently reasoned its way to a real pipeline discipline (withhold the
exact number, since the reveal table implied a sequence) that wasn't spelled
out as an explicit rule in the brief — it inferred it from context the way
the real Architect brief does.

**One genuine bright spot for the 26B:** its long-run placement and word
count (72/75) were correct and well-reasoned, on both trials now. Whatever
is making structural/graph work hard for it isn't touching its grasp of the
register's line-length and placement rules — consistent with round 2's
finding that this model tested clean on prose-level register discipline.

## What this adds to the standing question

Two trials now point the same direction: local-model output is trustworthy
for line-level prose (confirmed across two full rounds of testing before
today) and for register-scale judgment calls (the long-run placement, both
times), but it does not hold up on multi-part structural authoring —
thread rows that don't restate their own brief back, and now a full choice
graph that contradicts itself mid-document. That's a harder, more expensive
failure mode than a bad line: a bad line gets caught at review; a
self-contradictory graph could get built and only surface as a broken game
state later.
