import type { Graph } from "../types";

/**
 * Scene presence — the single source of truth for "which screens hold dialogue."
 * Pure: groups graph.scenes by screen_id. Feeds both the SceneRail (the primary
 * navigator) and the count badge on the level-map nodes, so the rail and the map
 * can never disagree about a screen's scene count.
 */

/** screen_id -> the scene_ids on that screen, in graph.scenes order. */
export type SceneIndex = Map<string, string[]>;

export function sceneIndex(graph: Graph): SceneIndex {
  const idx: SceneIndex = new Map();
  for (const sc of graph.scenes) {
    const list = idx.get(sc.screen_id);
    if (list) list.push(sc.scene_id);
    else idx.set(sc.screen_id, [sc.scene_id]);
  }
  return idx;
}

export function sceneCountOf(index: SceneIndex, screenId: string): number {
  return index.get(screenId)?.length ?? 0;
}

export interface ScreenWithScenes {
  screen_id: string;
  name: string;
  location: string;
  scene_ids: string[];
}

/**
 * Screens that hold at least one scene, in graph.screens order. This is the
 * rail's list — a screen with no dialogue never appears, so the rail reads as
 * "here is where the words are." Empty-screen context is the map's job (badge).
 */
export function screensWithScenes(graph: Graph): ScreenWithScenes[] {
  const idx = sceneIndex(graph);
  const out: ScreenWithScenes[] = [];
  for (const s of graph.screens) {
    const scene_ids = idx.get(s.screen_id);
    if (scene_ids && scene_ids.length > 0) {
      out.push({
        screen_id: s.screen_id,
        name: s.name,
        location: s.location,
        scene_ids,
      });
    }
  }
  return out;
}
