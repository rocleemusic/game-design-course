// state_actions compilation (choice-node-schema.md, closed enum).
// state_actions emit as EXTERNAL calls — narration proposes, code disposes;
// ink never stores the bond. knowledge_flag additionally sets the in-ink
// KnownPhrases list, because the knows(...) predicate reads it in-story.

import { inkAddress } from "./ids.ts";
import type { StateAction } from "./types.ts";

export interface CompiledActions {
  /** ink lines, each starting with "~ " */
  inkLines: string[];
  /** state.ink variable names conceptually written by these actions */
  writes: string[];
  /** EXTERNAL function names used */
  externals: string[];
}

/**
 * The full EXTERNAL surface the emitted project declares (with no-op fallbacks).
 *
 * The first four are WRITE-side: `compileStateActions` emits them from a
 * choice's `state_actions`, and they return nothing meaningful.
 *
 * `gateCleared` is READ-side and is the odd one out on purpose. RULED
 * 2026-08-17: the host owns gate state and decides when a gate clears, and ink
 * reads that fact through an external rather than owning a `LIST GatesCleared`.
 * Ink has no concept of a spell — zero matches for cast|spell|ignite|mana
 * across all 22 .ink files — so moving the decision into ink would drag 89
 * receiver outcomes into the story graph and force an inklecate recompile on
 * every content edit. Declared once here, it then serves unlimited authored
 * reactions with no further resolver work:
 *
 *     {gateCleared("G-F7-light"): Toby mentions the cave is open.}
 *
 * It is not emitted by any state_action, so it never appears in
 * compileStateActions. It only needs the declaration and the fallback, and the
 * shared `~ return 0` fallback is already correct for it — an unbound host
 * means "no gate is cleared", which is the safe reading.
 */
export const EXTERNAL_FUNCTIONS = [
  { name: "recordBond", params: ["soul", "category"] },
  { name: "recordKnowledge", params: ["phrase"] },
  { name: "recordThreadMove", params: ["thread_id"] },
  { name: "recordCanonWrite", params: ["fact"] },
  { name: "gateCleared", params: ["gate_id"] },
  // Learn-scene bridge (2026-08-30). WRITE-side, emitted by the see_spell /
  // cast_learn state_actions. `seeSpell` records a clue; `castSpell` runs the
  // real host cast (consume + VFX + learn-on-effect). Like the others they have
  // no-op fallbacks in externals.ink, so the canned build compiles unbound; the
  // phaser host binds the real handlers where MagicDB/Inventory/Knowledge exist.
  { name: "seeSpell", params: ["spell_id"] },
  { name: "castSpell", params: ["spell_id"] },
] as const;

export function compileStateActions(actions: StateAction[] | undefined, soulId: string): CompiledActions {
  const inkLines: string[] = [];
  const writes: string[] = [];
  const externals: string[] = [];
  for (const a of actions ?? []) {
    switch (a.type) {
      case "bond_event":
        inkLines.push(`~ recordBond("${soulId}", "${a.arg}")`);
        writes.push(`bondLevel_${inkAddress(soulId)}`);
        externals.push("recordBond");
        break;
      case "knowledge_flag":
        inkLines.push(`~ KnownPhrases += ${inkAddress(a.arg)}`);
        inkLines.push(`~ recordKnowledge("${a.arg}")`);
        writes.push("KnownPhrases");
        externals.push("recordKnowledge");
        break;
      case "thread_move":
        inkLines.push(`~ recordThreadMove("${a.arg}")`);
        externals.push("recordThreadMove");
        break;
      case "canon_write":
        inkLines.push(`~ recordCanonWrite("${a.arg}")`);
        externals.push("recordCanonWrite");
        break;
      case "see_spell":
        // Records a spell CLUE (host binds seeSpell -> Knowledge.see). No LEARN,
        // no cast — fired on the beat where the scene shows the spell cast.
        inkLines.push(`~ seeSpell("${a.arg}")`);
        externals.push("seeSpell");
        break;
      case "cast_learn":
        // Runs the real cast host-side (bind castSpell -> CastPipeline): consumes
        // the components, plays VFX, and LEARNS on a landed effect. Without the
        // components the host cast fails gracefully (no consume, no learn).
        inkLines.push(`~ castSpell("${a.arg}")`);
        externals.push("castSpell");
        break;
      case "score":
        // The festival grade (arg is the weight: "1.0" full, "0.5" partial, "0"
        // none). Ink OWNS the running total, so this is an in-ink increment, not
        // an external: the final-sequence vignette router branches on
        // festival_score in-story, and the host only peeks it read-only for the
        // results panel. Rides state.ink like `day`, so it survives save/load
        // with no host storage (ruled 2026-08-30, Roc).
        inkLines.push(`~ festival_score += ${a.arg}`);
        writes.push("festival_score");
        break;
      default:
        throw new Error(`Not a state_action (choice-node-schema.md closed enum): "${(a as StateAction).type}"`);
    }
  }
  return { inkLines, writes, externals };
}
