import type { Graph, Scene } from "../types";
import { sceneThreads } from "./week";

/**
 * The Cast tab's data shape (D5).
 *
 * Field names mirror narrative-pipeline/templates/persona-card-schema.md
 * exactly (essence fields, role fields, exceptions) so a reader can hold the
 * schema doc next to this file and check them off. `authored` distinguishes
 * a real, human-approved card from the un-authored placeholder shape — see
 * the blocker note in fixtures/personas.json and out-calib/personas.json for
 * which souls currently have one.
 *
 * HARD CONSTRAINT (persona-card-schema.md:31-35, world.ts:15-25): the bond
 * score "accretes host-side, never on the card, never surfaced." This type
 * has no bond field, raw or coarse. The coarse band lives on PlayView
 * (play.ts's `bondBands`) and is rendered by CastPanel as its OWN "live play
 * state" section, never merged into a PersonaCard object — so a card can
 * never even accidentally carry a bond value through this type.
 */
export interface PersonaCard {
  soul_id: string;
  /** true = transcribed from an approved pipeline-runs card; false = the
   *  template's shape with placeholder text, clearly marked in the UI. */
  authored: boolean;
  essence: {
    primal_seed?: string;
    essence_descriptor?: string;
    trait_axes?: {
      deflection_target?: string;
      precision_profile?: string;
      warmth_channel?: string;
    };
    voice_register?: string;
    conviction?: string;
    backstory_guideline?: string;
    notice_and_want?: string;
  };
  role: {
    role_tag?: string;
    age_band?: string;
  };
  /** authored_exceptions — a sanctioned schema break, in-character reason */
  authored_exceptions?: string;
  /** free note, mainly used to explain a placeholder card's gap */
  note?: string;
}

/**
 * The Soul Arc Spine (persona-card-schema.md:33): "lives in the arc doc as
 * a human note ... not a machined parameter and has no scripting guard."
 * Explicitly NOT a card field, so it is kept out of PersonaCard on purpose
 * and surfaced by CastPanel as its own "arc progress" section.
 *
 * Condensed by hand from narrative-pipeline/arc-festival-slice.md's "Soul
 * Arc Spines" section (2026-07-25 amendment). Only the three deep souls with
 * an authored line are listed here — texture souls have none yet, which is a
 * real gap, not an omission in this file.
 */
export const SOUL_ARC_SPINES: Record<string, string> = {
  toby:
    "The Giver: from can't receive to can — freed by being claimed unearned; " +
    "the player's \"I see you\" is the corrective.",
  mara: "The Keeper: from clutch to transform — the bond re-forms; loss isn't final.",
  ilsa:
    "The Kinbound: from blood is given to blood is tended — stays blood-first; " +
    "learns only that a bond you were handed does not hold itself up.",
};

/**
 * Threads a soul's own authored scenes move, derived straight from graph
 * data (`scene.soul` + week.ts's `sceneThreads`) rather than a second
 * hand-maintained id list that could drift from the graph. Cross-referenced
 * against PlayView.threadMoves by CastPanel to show which of a soul's
 * threads have actually moved THIS session, distinct from which scenes are
 * merely authored to move one (the same live-vs-authored split D4's
 * ThreadsPanel already draws).
 */
export function soulThreads(graph: Graph, soulId: string): string[] {
  const out: string[] = [];
  const scenes: Scene[] = graph.scenes.filter((s) => s.soul === soulId);
  for (const scene of scenes) {
    for (const t of sceneThreads(scene)) {
      if (!out.includes(t)) out.push(t);
    }
  }
  return out;
}
