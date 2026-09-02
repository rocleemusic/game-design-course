import type { Graph } from "../types";

/**
 * Display names for the cast.
 *
 * Ids are lowercase (`toby`); the name is authored (`Toby`). Everything a
 * person's name appears on — line cards, the play transcript, stage markers —
 * reads through here, so one lookup keeps them consistent.
 *
 * Title-casing the id was the obvious shortcut and it is wrong: it would turn
 * an id like `old-bram` into "Old-Bram" rather than the authored "Bram". When
 * a soul carries no name we fall back to the id unchanged, which reads as the
 * data gap it is instead of inventing a spelling.
 */
export function soulNames(graph: Graph): Map<string, string> {
  const names = new Map<string, string>();
  for (const soul of graph.souls ?? []) {
    if (soul.name) names.set(soul.soul_id, soul.name);
  }
  return names;
}

/** One name, with the id as the fallback. `player` is the reader, not a soul. */
export function soulName(
  names: Map<string, string>,
  soulId: string | undefined
): string {
  if (!soulId) return "";
  if (soulId === "player") return "You";
  return names.get(soulId) ?? soulId;
}
