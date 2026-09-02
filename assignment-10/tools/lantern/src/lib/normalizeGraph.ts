import type { Graph } from "../types";

/**
 * The resolver's graph.json is the pinned shape plus two provisional spellings
 * this tool folds down to milestone 1's types (never editing the file itself):
 *
 *   - connects_to entries may be `"T2"` or `{ screen_id: "F1", seam: "..." }`
 *     -> always the screen_id string (the seam edge already lives in `seams`)
 *   - state_actions may be `"bond_event(Intimacy)"` or
 *     `{ type: "bond_event", arg: "Intimacy" }` -> always `"type(arg)"`
 *
 * Pure — unit tested. Hand-authored graphs already in the m1 shape pass
 * through untouched.
 */
export function normalizeGraph(raw: unknown): Graph {
  const g = raw as Graph;
  return {
    ...g,
    // Older graph.json files predate the souls export; an empty cast just
    // means names fall back to ids.
    souls: g.souls ?? [],
    // Older graph.json files predate the D7 role-goal export; empty just
    // means no soul reports a goal_authored role yet.
    role_workplace: g.role_workplace ?? [],
    screens: (g.screens ?? []).map((s) => ({
      ...s,
      connects_to: (s.connects_to ?? []).map((c: unknown) =>
        typeof c === "string" ? c : String((c as { screen_id: string }).screen_id)
      ),
    })),
    scenes: (g.scenes ?? []).map((sc) => ({
      ...sc,
      choice_nodes: (sc.choice_nodes ?? []).map((ch) => ({
        ...ch,
        options: (ch.options ?? []).map((opt) => ({
          ...opt,
          state_actions: (opt.state_actions ?? []).map((a: unknown) =>
            typeof a === "string"
              ? a
              : formatAction(a as { type: string; arg?: string })
          ),
        })),
      })),
    })),
  };
}

function formatAction(a: { type: string; arg?: string }): string {
  return a.arg !== undefined ? `${a.type}(${a.arg})` : a.type;
}
