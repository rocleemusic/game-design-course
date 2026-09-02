import type { Graph, PlayState, Scene } from "../types";

/**
 * Maps the running story (raw ids out of the tag contract) onto graph nodes.
 * The graph never re-derives ink addresses — graph.json carries them
 * (build-loop.md address rule); this index only looks them up.
 */

export interface OptionInfo {
  spoken: boolean;
  playerLineId?: string;
  choiceId: string;
  sceneId: string;
  /** the option's weave text (player_line text or surface_action) for
   *  matching runtime choices back to option ids — inkjs does not carry
   *  the #opt tag on Choice objects, only on the post-choice line */
  matchText: string;
}

export interface GraphIndex {
  /** content_id -> owning scene */
  sceneOfLine: Map<string, Scene>;
  /** option_id -> option info */
  options: Map<string, OptionInfo>;
  /** choice_id -> option ids in authored order */
  choiceOptions: Map<string, string[]>;
  /** choice_id -> scene */
  sceneOfChoice: Map<string, Scene>;
  /** any node id -> the ChoosePathString address for a jump (null = no jump) */
  jumpAddress: (nodeId: string) => string | null;
  /**
   * Screen display name -> its status, for "locked(gate_id[, gate_id])"
   * exits only. screen-spec-schema.md is explicit that "reachable(gate_id)"
   * is NOT a lock ("a knowledge-demonstration site that is never blocked...
   * walking up is free, the demonstration is the gate") — LevelView.tsx's
   * own `screen.status.startsWith("locked(")` is the precedent this mirrors.
   * "start" / "hub" / "reachable" screens are absent — nothing to show. ink.ts
   * emits a "Go to <name>" exit choice per screen name (`cleanText(target.name)`),
   * and — like #opt — inkjs does not carry the exit's #lock: tag on the
   * pre-selection Choice object (verified against the compiled fixture: it
   * lands on the post-choice content line instead), so a pre-click lock badge
   * has to come from the same graph data the emitter itself locked the exit
   * from, matched back by name.
   */
  lockForScreenName: Map<string, string>;
  /**
   * B7 (2026-08-30) — `soul_id -> workplace_screens`, for DEEP souls only.
   *
   * The three deep souls hold a role (`Soul.role_tag`) whose
   * `RoleWorkplace.workplace_screens` declares where that job is done — Toby
   * bakes at T2, Ilsa forges at T4, Mara's herbalism is T2/F1. The day resolver
   * ignores that entirely and scatters them across the map (day-1.json has
   * Ilsa in the Forager's Clearing and Toby on a forest road), so the deep cast
   * read as wandering rather than as people with work. `LanternPlayer.
   * applyPresence` uses this to pin them; see its own header for exactly how.
   *
   * DEEP ONLY, on purpose. The texture cast (Nell, Pip, Juno, Bex…) is meant to
   * drift — they are ambience, and pinning them would empty every screen that
   * is nobody's workplace. Souls with no role, or a role whose
   * `workplace_screens` is empty (the Mage roams by design), are absent from
   * this map, and an absent soul is never pinned.
   */
  deepWorkplaces: Map<string, string[]>;
}

const GATHER_LINE = /^GB-(.+)-GATHER$/;

/** A raw id from the tag stream -> the graph node id it lights. */
export function mapRawId(id: string): string {
  const gather = GATHER_LINE.exec(id);
  return gather ? `g_${gather[1]}` : id;
}

/** Strip one layer of surrounding straight quotes for text matching. */
export function unquote(text: string): string {
  const t = text.trim();
  return t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t.slice(1, -1) : t;
}

export function buildGraphIndex(graph: Graph): GraphIndex {
  const sceneOfLine = new Map<string, Scene>();
  const sceneOfChoice = new Map<string, Scene>();
  const options: GraphIndex["options"] = new Map();
  const choiceOptions = new Map<string, string[]>();
  const addresses = new Map<string, string>();
  const lockForScreenName = new Map<string, string>();

  // B7 — deep souls' declared workplaces. Both sides are optional in older
  // graph.json files (see `Graph.souls`/`Graph.role_workplace`), so a graph
  // missing either simply yields an empty map and nothing is pinned.
  const deepWorkplaces = new Map<string, string[]>();
  const workplaceOfRole = new Map(
    (graph.role_workplace ?? []).map((r) => [r.role_tag, r.workplace_screens]),
  );
  for (const soul of graph.souls ?? []) {
    if (!soul.deep || !soul.role_tag) continue;
    const screens = workplaceOfRole.get(soul.role_tag);
    if (screens?.length) deepWorkplaces.set(soul.soul_id, [...screens]);
  }

  for (const s of graph.screens) {
    addresses.set(s.screen_id, s.ink_address);
    // Mirrors ink.ts emitScreen's own (corrected) lockTag rule: only
    // "locked(gate_id[, gate_id])" is a lock. "reachable(gate_id)" is
    // explicitly not one (screen-spec-schema.md) — it is a free-to-walk-up
    // knowledge-demonstration site — so it is deliberately left out here.
    if (s.status.startsWith("locked(")) lockForScreenName.set(s.name, s.status);
  }

  for (const sc of graph.scenes) {
    addresses.set(sc.scene_id, sc.ink_address);
    const lineText = new Map(sc.lines.map((l) => [l.content_id, l.text]));
    for (const line of sc.lines) {
      sceneOfLine.set(line.content_id, sc);
      // a line jumps to its scene (weave interiors have no stable address)
      addresses.set(line.content_id, sc.ink_address);
    }
    for (const ch of sc.choice_nodes) {
      sceneOfChoice.set(ch.choice_id, sc);
      addresses.set(ch.choice_id, sc.ink_address);
      // the gather IS labelled — full address scene.gather (build-loop.md)
      if (ch.gather_address) {
        addresses.set(`g_${ch.choice_id}`, `${sc.ink_address}.${ch.gather_address}`);
      }
      choiceOptions.set(
        ch.choice_id,
        ch.options.map((o) => o.option_id)
      );
      for (const opt of ch.options) {
        addresses.set(opt.option_id, sc.ink_address);
        const spoken = opt.player_line !== undefined;
        options.set(opt.option_id, {
          spoken,
          playerLineId: opt.player_line,
          choiceId: ch.choice_id,
          sceneId: sc.scene_id,
          matchText: spoken
            ? unquote(lineText.get(opt.player_line!) ?? "")
            : (opt.surface_action ?? ""),
        });
      }
    }
  }

  return {
    sceneOfLine,
    options,
    choiceOptions,
    sceneOfChoice,
    jumpAddress: (nodeId) => addresses.get(nodeId) ?? null,
    lockForScreenName,
    deepWorkplaces,
  };
}

/** Owning scene id for any raw id (line, choice, option, gather line). */
function sceneIdOf(index: GraphIndex, rawId: string): string | null {
  const line = index.sceneOfLine.get(rawId);
  if (line) return line.scene_id;
  const choice = index.sceneOfChoice.get(rawId);
  if (choice) return choice.scene_id;
  const gather = GATHER_LINE.exec(rawId);
  if (gather) return index.sceneOfChoice.get(gather[1])?.scene_id ?? null;
  return index.options.get(rawId)?.sceneId ?? null;
}

/** Raw runtime position, straight out of the play engine's tag stream. */
export interface PlayPos {
  currentScreen: string | null;
  currentLine: string | null;
  /** set while the story is waiting at this choice's options */
  currentChoice: string | null;
  /** every raw id seen this playthrough: screens, lines, choices, options */
  visited: ReadonlySet<string>;
}

/**
 * Fold a runtime position into per-node play states:
 * current knot glows, visited path holds the warm trace; the app dims
 * everything else while play mode is on (unvisited branches stay dim).
 */
export function playStates(index: GraphIndex, pos: PlayPos): Map<string, PlayState> {
  const states = new Map<string, PlayState>();
  const mark = (nodeId: string | null, state: "visited" | "current") => {
    if (!nodeId) return;
    if (state === "visited" && states.get(nodeId) === "current") return;
    states.set(nodeId, state);
  };

  for (const id of pos.visited) {
    mark(mapRawId(id), "visited");
    mark(sceneIdOf(index, id), "visited");
    const opt = index.options.get(id);
    if (opt?.playerLineId) mark(opt.playerLineId, "visited");
  }

  for (const id of [pos.currentScreen, pos.currentChoice, pos.currentLine]) {
    if (!id) continue;
    mark(sceneIdOf(index, id), "current");
    mark(mapRawId(id), "current");
  }

  return states;
}
