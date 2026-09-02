/**
 * Scene authoring helper (W1 content pass).
 *
 * Hand-writing choice-node JSON is how id-rule and guardrail slips get in, so
 * scenes are declared as a compact spec here and expanded to the schema shape
 * by one generator. Naming follows the fixture rule exactly
 * (choice-node-schema.md / the SC-T2-01 fixture all 59 resolver tests run on):
 *
 *   choice_id   CH-<scene tail>-<beat>      SC-T4-02 beat 2 -> CH-T4-02-2
 *   option_id   <choice_id>-<a|b|c>
 *   set-up line L-<scene_id>-NN
 *   player line L-<option_id>-p
 *   response    L-<option_id>-rN
 *
 * Prose is PLACEHOLDER by design — "graph before prose" (pipeline.md step 6).
 * Structure (option count, verb families, state_actions, gates, both required
 * notes) is real from pass 1, because the topology is what Roc reviews.
 *
 * Run: node scripts/author-scenes.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = join(ROOT, "data", "scene-graph.json");

const LETTERS = ["a", "b", "c"];

/** Word ceilings are a register/guardrails contract, not tuning. */
const CEILINGS = { dialogue: 40, action: 60, player_line: 12 };
const words = (s) => s.trim().split(/\s+/).length;

function expand(spec) {
  const tail = spec.scene_id.replace(/^SC-/, "");
  const lines = [];
  const choice_nodes = [];

  spec.beats.forEach((beat, bi) => {
    const choice_id = `CH-${tail}-${bi + 1}`;
    const setupId = `L-${spec.scene_id}-${String(bi + 1).padStart(2, "0")}`;

    if (words(beat.setup) > CEILINGS.dialogue) {
      throw new Error(`${choice_id}: set-up over the ${CEILINGS.dialogue}-word dialogue ceiling`);
    }
    lines.push({
      content_id: setupId,
      slot_type: "dialogue",
      speaker_id: spec.soul,
      text: beat.setup,
      choice_id,
    });

    if (beat.options.length < 2 || beat.options.length > 3) {
      throw new Error(`${choice_id}: ${beat.options.length} options — the schema allows 2 or 3`);
    }

    const options = beat.options.map((opt, oi) => {
      const option_id = `${choice_id}-${LETTERS[oi]}`;
      const out = {
        option_id,
        verb_family: opt.verb_family ?? "Converse",
        response_slots: [],
        state_actions: (opt.actions ?? []).map(([type, arg]) => ({ type, arg })),
        rejoin: opt.divert_to ? "divert" : "gather",
      };
      if (opt.divert_to) out.divert_to = opt.divert_to;
      if (opt.player_verb) out.player_verb = opt.player_verb;

      // Exactly one of player_line / surface_action (schema).
      if (opt.say !== undefined) {
        if (words(opt.say) > CEILINGS.player_line) {
          throw new Error(`${option_id}: player_line over the ${CEILINGS.player_line}-word ceiling`);
        }
        const pid = `L-${option_id}-p`;
        out.player_line = pid;
        lines.push({
          content_id: pid,
          slot_type: "player_line",
          speaker_id: "player",
          text: opt.say,
          choice_id,
          option_id,
        });
      } else if (opt.do !== undefined) {
        if (words(opt.do) > CEILINGS.action) {
          throw new Error(`${option_id}: surface_action over the ${CEILINGS.action}-word ceiling`);
        }
        out.surface_action = opt.do;
      } else {
        throw new Error(`${option_id}: needs exactly one of say / do`);
      }

      (opt.responses ?? []).forEach((text, ri) => {
        if (words(text) > CEILINGS.dialogue) {
          throw new Error(`${option_id}: response over the ${CEILINGS.dialogue}-word ceiling`);
        }
        const rid = `L-${option_id}-r${ri + 1}`;
        out.response_slots.push(rid);
        lines.push({
          content_id: rid,
          slot_type: "dialogue",
          speaker_id: spec.soul,
          text,
          choice_id,
          option_id,
        });
      });
      return out;
    });

    if (!beat.equal_weight || !beat.no_accrual) {
      throw new Error(`${choice_id}: both notes are required (guardrails check 10)`);
    }
    choice_nodes.push({
      choice_id,
      scene_id: spec.scene_id,
      options,
      availability_conditions: beat.conditions ?? [],
      equal_weight_note: beat.equal_weight,
      no_accrual_note: beat.no_accrual,
    });
  });

  return {
    scene_id: spec.scene_id,
    soul: spec.soul,
    screen_id: spec.screen_id,
    note: spec.note,
    lines,
    choice_nodes,
  };
}

/** Add state_actions to an existing option without touching a word of its prose. */
function addActions(scene, optionId, actions) {
  for (const node of scene.choice_nodes) {
    const opt = node.options.find((o) => o.option_id === optionId);
    if (!opt) continue;
    for (const [type, arg] of actions) {
      if (opt.state_actions.some((a) => a.type === type && a.arg === arg)) continue;
      opt.state_actions.push({ type, arg });
    }
    return true;
  }
  throw new Error(`addActions: option ${optionId} not found in ${scene.scene_id}`);
}

export { expand, addActions, FILE };

// ---------------------------------------------------------------------------

const doc = JSON.parse(readFileSync(FILE, "utf8"));
const sg = doc.scene_graph ?? doc;
const byId = new Map(sg.scenes.map((s) => [s.scene_id, s]));

const upsert = (scene) => {
  const at = sg.scenes.findIndex((s) => s.scene_id === scene.scene_id);
  if (at >= 0) sg.scenes[at] = scene;
  else sg.scenes.push(scene);
};

// ===========================================================================
// 1. Bond for Ilsa's existing scenes.
//
// Her two authored scenes carried ZERO bond_events, so her count could never
// leave 0 and SC-T7-ilsa's mid/high variants were unreachable by construction —
// no threshold would have helped. Only state_actions are added; not one word of
// the ratified forge prose is touched. Intimacy is the honest category for
// these beats: pipeline.md step 9 defines it as "shared time, disclosure,
// presence", which is exactly what standing at the forge with her is.
// ===========================================================================
const t401 = byId.get("SC-T4-01");
addActions(t401, "CH-T4-01-2-a", [["bond_event", "Trust"]]); // asks whose the apron is
addActions(t401, "CH-T4-01-3-a", [["bond_event", "Trust"]]); // asks who Bram is
addActions(t401, "CH-T4-01-4-a", [["bond_event", "Intimacy"]]); // "the two of us, then"
addActions(t401, "CH-T4-01-5-b", [["bond_event", "Intimacy"]]); // lets the apron wait
addActions(t401, "CH-T4-01-6-a", [["bond_event", "Recognition"]]); // returns tomorrow
t401.note =
  (t401.note ? t401.note + " " : "") +
  "W1 (2026-07-31): state_actions only — five bond_events added so a deep arc can move its own band. " +
  "No ratified prose altered. Before this the scene scored nothing and Ilsa's band could never leave low.";

const t101 = byId.get("SC-T1-01");
addActions(t101, "CH-T1-01-1-a", [["bond_event", "Trust"]]);
addActions(t101, "CH-T1-01-2-a", [["bond_event", "Recognition"]]);
addActions(t101, "CH-T1-01-3-a", [["bond_event", "Intimacy"]]);
t101.note =
  (t101.note ? t101.note + " " : "") +
  "W1 (2026-07-31): three bond_events added (state_actions only, prose untouched).";

// Toby's opener already carries Intimacy; the shelf scene should score the beat
// where he is actually seen, which is the Recognition category's whole point.
addActions(byId.get("SC-T2-07"), "CH-T2-07-5-a", [["bond_event", "Recognition"]]);
addActions(byId.get("SC-F1-02"), "CH-F1-02-4-a", [["bond_event", "Trust"]]);
addActions(byId.get("SC-T6-01"), "CH-T6-01-6-a", [["bond_event", "Recognition"]]);

// ===========================================================================
// 2. SC-T4-02 — Ilsa, day 3. Branch-and-bottleneck, six beats, one gated
//    branch, one divert. The gated branch is the "choices on branches" shape:
//    the branch does not merely exist, it carries its own choice.
// ===========================================================================
upsert(
  expand({
    scene_id: "SC-T4-02",
    soul: "ilsa",
    screen_id: "T4",
    note:
      "PROPOSAL, placeholder prose (W1, 2026-07-31). Day-3 beat: Ilsa covers for the relative who " +
      "does not come, and the covering is by arrangement rather than by accident. Six beats, " +
      "branch-and-bottleneck, one knows()-gated branch carrying its own choice, one divert. " +
      "Moves kinbound-absence. Real prose goes through the crew, gated by Roc.",
    beats: [
      {
        setup: "Placeholder set-up: a second set of tools is laid out, clean, and clearly unused.",
        equal_weight: "Naming the tools costs her the pretense; working past them costs you the opening.",
        no_accrual: "No counter keys off either pick; the tools are laid out the same tomorrow.",
        options: [
          {
            say: "Two sets today.",
            player_verb: "witness",
            actions: [["knowledge_flag", "second_set"], ["bond_event", "Trust"]],
            responses: ["Placeholder response: she says the second set is easier than putting it away."],
          },
          {
            do: "take the near set and start without asking",
            actions: [["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: she adjusts your grip, and does not mention the other set."],
          },
        ],
      },
      {
        setup: "Placeholder set-up: she works a piece that plainly needs two people, alone.",
        equal_weight: "Stepping in takes the task off her; standing by leaves her the version she chose.",
        no_accrual: "Helping repeatedly accumulates nothing — she is not keeping score of hands.",
        options: [
          {
            do: "take the far end of the piece",
            verb_family: "Use",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: the work goes quicker and she does not say so."],
          },
          {
            say: "You've done this alone a while.",
            player_verb: "witness",
            actions: [["knowledge_flag", "alone_a_while"]],
            responses: ["Placeholder response: she agrees in a way that closes the subject."],
          },
        ],
      },
      {
        // The gated branch. It carries its own 3-option choice rather than
        // being a single unlocked line — a branch with no decision in it is
        // just a longer corridor.
        setup: "Placeholder set-up: with the second set named, she talks about who it was cut for.",
        conditions: ["knows(second_set)"],
        equal_weight: "Each read gives her something different to correct, and none of them is the right one.",
        no_accrual: "No pick is tallied; the set stays cut for the same person either way.",
        options: [
          {
            say: "He'll come when the work's done.",
            player_verb: "ease",
            actions: [["bond_event", "Trust"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: she lets the excuse stand without taking it."],
          },
          {
            say: "You cut them to his hand.",
            player_verb: "witness",
            actions: [["bond_event", "Recognition"], ["knowledge_flag", "cut_to_hand"]],
            responses: ["Placeholder response: she looks at the tools as though newly."],
          },
          {
            do: "set the second pair back in the rack",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she leaves them where you put them."],
          },
        ],
      },
      {
        setup: "Placeholder set-up: the forge quiets, and the quiet is the loudest part of the hour.",
        equal_weight: "Filling the quiet spares her it; holding it lets her decide what goes in.",
        no_accrual: "Sitting with silence twice is not worth more than sitting with it once.",
        options: [
          {
            do: "sit with the quiet",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she works slower, and does not fill it either."],
          },
          {
            say: "Coal's holding, at least.",
            player_verb: "ease",
            actions: [],
            responses: ["Placeholder response: she takes the small subject gratefully."],
          },
        ],
      },
      {
        // Divert: naming the arrangement jumps the close, so a second life can
        // legitimately play a different shape.
        setup: "Placeholder set-up: she describes the arrangement plainly, as a thing agreed years ago.",
        conditions: ["knows(cut_to_hand)"],
        equal_weight: "Calling it an arrangement is accurate and cold; leaving it costs you the plain word.",
        no_accrual: "Neither reading is banked; the arrangement is the same arrangement.",
        options: [
          {
            say: "That's an arrangement, not a visit.",
            player_verb: "witness",
            actions: [["bond_event", "Recognition"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: she does not argue, which is the answer."],
            divert_to: "CH-T4-02-6",
          },
          {
            do: "let the word go by",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she moves on, and the hour keeps its shape."],
          },
        ],
      },
      {
        setup: "Placeholder set-up: she banks the forge for the night and counts what is left to do.",
        equal_weight: "Offering tomorrow commits you; leaving it open leaves her the room to not ask.",
        no_accrual: "Coming back is not a tally — the count is the same whether you say so or not.",
        options: [
          {
            say: "Same time tomorrow.",
            player_verb: "ease",
            actions: [["bond_event", "Recognition"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: she says the door is not locked, which is a yes."],
          },
          {
            do: "bank the far side of the forge without being asked",
            verb_family: "Use",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she lets you, and checks it anyway."],
          },
        ],
      },
    ],
  }),
);

// ===========================================================================
// 3 + 4. The two arc turns. Each selects a variant by bond_band, which is the
//    game's own spectrum applied to a soul. These are the scenes W1a's whole
//    binding exists for: before it, bondLevel never left 0, so only the `low`
//    beat could EVER fire and two thirds of each turn was dead content.
//
//    Shape note: the three bands are mutually exclusive gated beats, so exactly
//    one fires and the other two auto-skip through the emitter's gate fallback.
// ===========================================================================
const arcTurn = ({ scene_id, soul, screen_id, thread, note, beats }) =>
  expand({ scene_id, soul, screen_id, note, beats });

upsert(
  arcTurn({
    scene_id: "SC-T7-toby",
    soul: "toby",
    screen_id: "T7",
    thread: "giver-receive",
    note:
      "PROPOSAL, placeholder prose (W1, 2026-07-31). The Giver's arc turn on festival night: " +
      "can't receive -> can, freed by being claimed unearned. Three bond_band variants (low / mid / " +
      "high) plus a shared close, so how the week went changes how the turn lands. Requires W1a — " +
      "before the externals were bound, bondLevel_toby was pinned at 0 and only `low` could fire.",
    beats: [
      {
        setup: "Placeholder set-up: the grounds are lit and Toby is still carrying, not standing.",
        // Festival night. Without this the arc turn is playable on day 1 —
        // T7 is a start screen, so the player can simply begin there — and the
        // turn would land while the bond band is still low, which is the one
        // reading it must never get by accident.
        conditions: ["day >= 5"],
        equal_weight: "Taking a tray keeps him moving; stopping him costs him the job he is hiding in.",
        no_accrual: "No counter tracks how often you have taken something from his hands.",
        options: [
          {
            do: "take one end of the tray",
            verb_family: "Use",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: he hands it over and immediately finds another."],
          },
          {
            say: "It's lit. You can stop.",
            player_verb: "ease",
            actions: [["bond_event", "Recognition"]],
            responses: ["Placeholder response: he says he will, in a minute, the way he always does."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (LOW): someone thanks him and he redirects it to the ovens.",
        conditions: ["day >= 5", "bond_band(toby) = low"],
        equal_weight: "Naming the deflection exposes it; letting it go leaves him the shape he trusts.",
        no_accrual: "Neither pick banks anything — the gift becomes goods again either way.",
        options: [
          {
            say: "You did that.",
            player_verb: "witness",
            actions: [["bond_event", "Recognition"]],
            responses: ["Placeholder response: he agrees about the ovens."],
          },
          {
            do: "let him hand the thanks along",
            actions: [],
            responses: ["Placeholder response: the thanks lands somewhere else, and he looks lighter for it."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (MID): someone presses a wrapped thing on him and he keeps it, unnamed.",
        conditions: ["day >= 5", "bond_band(toby) = mid"],
        equal_weight: "Naming what he is doing risks it; leaving it lets him keep it without the word.",
        no_accrual: "Keeping is not a score; the wrapped thing is the same either way.",
        options: [
          {
            say: "You kept it.",
            player_verb: "witness",
            actions: [["bond_event", "Recognition"], ["thread_move", "giver-receive"]],
            responses: ["Placeholder response: he looks at his own hands, surprised by them."],
          },
          {
            do: "say nothing and stand with him",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: he does not put it down for the rest of the hour."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (HIGH): he keeps it, and then he says the thing out loud himself.",
        conditions: ["day >= 5", "bond_band(toby) = high"],
        equal_weight: "Answering in kind meets him; staying quiet leaves the sentence his alone.",
        no_accrual: "His act is his, not a payout — nothing you did purchased this line.",
        options: [
          {
            say: "I see you too.",
            player_verb: "witness",
            actions: [["bond_event", "Intimacy"], ["thread_move", "giver-receive"]],
            responses: ["Placeholder response: he laughs, and does not deflect it."],
          },
          {
            do: "let the sentence stand",
            player_verb: "sit-with",
            actions: [["bond_event", "Recognition"], ["thread_move", "giver-receive"]],
            responses: ["Placeholder response: he lets it stand too, which is new."],
          },
        ],
      },
      {
        setup: "Placeholder set-up: the lanterns go up together and the ovens are, finally, someone else's.",
        conditions: ["day >= 5"],
        equal_weight: "Staying gives him company; going leaves him the night he actually built.",
        no_accrual: "No tally on leaving or staying; the lanterns go up the same.",
        options: [
          {
            do: "stay for the lighting",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: he watches the lanterns instead of the trays."],
          },
          {
            say: "Save me a sweet roll.",
            player_verb: "ease",
            actions: [["thread_move", "giver-receive"]],
            responses: ["Placeholder response: he says he already did, hours ago."],
          },
        ],
      },
    ],
  }),
);

upsert(
  arcTurn({
    scene_id: "SC-T7-ilsa",
    soul: "ilsa",
    screen_id: "T7",
    thread: "kinbound-absence",
    note:
      "PROPOSAL, placeholder prose (W1, 2026-07-31). The Kinbound's arc turn on festival night: " +
      "given -> tended, never converted to chosen-family. Three bond_band variants. Mara appears " +
      "only through her already-carded behaviour (she returns the second apron) — no new persona " +
      "material, so the Soul-3 watch item stays closed. Requires W1a.",
    beats: [
      {
        setup: "Placeholder set-up: Ilsa has taken a bench-end at the edge, with room beside her.",
        conditions: ["day >= 5"],
        equal_weight: "Sitting takes the room she left; standing leaves it for whoever it was left for.",
        no_accrual: "The bench-end is the same bench-end however often you take it.",
        options: [
          {
            do: "take the space beside her",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she moves her coat without comment."],
          },
          {
            say: "Saving that?",
            player_verb: "witness",
            actions: [["bond_event", "Trust"]],
            responses: ["Placeholder response: she says she is not, and does not move the coat."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (LOW): the apron stays folded on the bench, and no one names it.",
        conditions: ["day >= 5", "bond_band(ilsa) = low"],
        equal_weight: "Asking makes her account for it; leaving it lets the folded thing stay a folded thing.",
        no_accrual: "Nothing accrues here — the apron is folded the same at the end of the night.",
        options: [
          {
            say: "Whose is that?",
            player_verb: "witness",
            actions: [["bond_event", "Trust"]],
            responses: ["Placeholder response: she gives a name and changes the subject in one breath."],
          },
          {
            do: "leave the folded apron alone",
            actions: [],
            responses: ["Placeholder response: it stays folded, and she keeps a hand near it."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (MID): Mara notices the bench-end, and notices who it is for.",
        conditions: ["day >= 5", "bond_band(ilsa) = mid"],
        equal_weight: "Making room for Mara costs Ilsa the reservation; not doing costs Mara the seat.",
        no_accrual: "No counter for who sat where; the bench holds the same number either way.",
        options: [
          {
            do: "shift down so there is room for both",
            actions: [["bond_event", "Intimacy"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: Ilsa allows it, which is not nothing."],
          },
          {
            say: "There's room.",
            player_verb: "ease",
            actions: [["bond_event", "Recognition"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: Mara sits, and Ilsa does not move the coat back."],
          },
        ],
      },
      {
        setup: "Placeholder set-up (HIGH): Mara brings the second apron back, shaken out and worn.",
        conditions: ["day >= 5", "bond_band(ilsa) = high"],
        equal_weight: "Naming it makes it a moment; letting it pass lets it be ordinary, which is the point.",
        no_accrual: "Mara's act is Mara's — nothing you did bought the apron back.",
        options: [
          {
            say: "It fits her.",
            player_verb: "witness",
            actions: [["bond_event", "Recognition"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: Ilsa says it was cut for someone taller, and lets her keep it."],
          },
          {
            do: "let it be an ordinary thing",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"], ["thread_move", "kinbound-absence"]],
            responses: ["Placeholder response: nobody remarks on it, and that is the whole of it."],
          },
        ],
      },
      {
        setup: "Placeholder set-up: the lanterns go up, and the bench is fuller than it was.",
        conditions: ["day >= 5"],
        equal_weight: "Staying keeps the bench full; leaving lets her have the end of the night her way.",
        no_accrual: "No tally on the last beat; the lanterns go up regardless.",
        options: [
          {
            do: "stay until the lanterns are up",
            player_verb: "sit-with",
            actions: [["bond_event", "Intimacy"]],
            responses: ["Placeholder response: she stays too, longer than she meant to."],
          },
          {
            say: "Good night, Ilsa.",
            player_verb: "ease",
            actions: [["bond_event", "Recognition"]],
            responses: ["Placeholder response: she uses your name back, which she has not done before."],
          },
        ],
      },
    ],
  }),
);

doc.note =
  (doc.note ?? "") +
  " | W1 content pass 2026-07-31: bond_events added across both deep arcs (Ilsa's carried none, so her band could never move); SC-T4-02, SC-T7-toby and SC-T7-ilsa authored at structure level with placeholder prose.";

writeFileSync(FILE, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`scene-graph.json: ${sg.scenes.length} scenes written`);
for (const s of sg.scenes) {
  const bonds = s.choice_nodes.flatMap((n) =>
    n.options.flatMap((o) => (o.state_actions ?? []).filter((a) => a.type === "bond_event")),
  );
  console.log(`  ${s.scene_id} ${s.soul} ${s.screen_id} beats=${s.choice_nodes.length} bond=${bonds.length}`);
}
