import type { Graph } from "../types";

/**
 * Navigation reconciliation for live reload (L7).
 *
 * THE CARRIED INVARIANT: a reload is not a user action. Re-reading the same run
 * must leave panes, selection, layouts and viewport exactly as they were. Two
 * bugs of this shape were already caught and fixed by hand; once SSE fires on
 * every file save, anything that resets on load fires constantly.
 *
 * So this keeps what still exists and clears only what genuinely went away,
 * saying which — a selection that silently vanishes reads as the tool losing
 * your place.
 */

export interface NavState {
  screenId: string | null;
  sceneId: string | null;
  selectedNodeId: string | null;
}

export interface Reconciled {
  next: NavState;
  /** what was dropped and why — surfaced as a toast, never swallowed */
  lost: string[];
  /** true when nothing moved, so a caller can skip a state update entirely */
  unchanged: boolean;
}

/** Every id a selection could legitimately point at in the new graph. */
function knownIds(graph: Graph): Set<string> {
  const ids = new Set<string>();
  for (const screen of graph.screens) ids.add(screen.screen_id);
  for (const scene of graph.scenes) {
    ids.add(scene.scene_id);
    for (const line of scene.lines) ids.add(line.content_id);
    for (const node of scene.choice_nodes) {
      ids.add(node.choice_id);
      for (const opt of node.options) ids.add(opt.option_id);
    }
  }
  return ids;
}

export function reconcileNav(graph: Graph, state: NavState): Reconciled {
  const ids = knownIds(graph);
  const screens = new Set(graph.screens.map((s) => s.screen_id));
  const scenes = new Map(graph.scenes.map((s) => [s.scene_id, s.screen_id]));

  const lost: string[] = [];
  let screenId = state.screenId;
  let sceneId = state.sceneId;
  let selectedNodeId = state.selectedNodeId;

  if (screenId !== null && !screens.has(screenId)) {
    lost.push(`screen ${screenId} is gone`);
    screenId = null;
  }
  if (sceneId !== null && !scenes.has(sceneId)) {
    lost.push(`scene ${sceneId} is gone`);
    sceneId = null;
  }
  // A scene that MOVED screens keeps the selection and follows it, rather than
  // clearing: the thing you were looking at still exists, it is just elsewhere.
  if (sceneId !== null) {
    const home = scenes.get(sceneId)!;
    if (screenId !== home) screenId = home;
  }
  if (selectedNodeId !== null && !ids.has(selectedNodeId)) {
    lost.push(`selection ${selectedNodeId} is gone`);
    selectedNodeId = null;
  }

  const next = { screenId, sceneId, selectedNodeId };
  const unchanged =
    next.screenId === state.screenId &&
    next.sceneId === state.sceneId &&
    next.selectedNodeId === state.selectedNodeId;

  return { next, lost, unchanged };
}

/**
 * Should a reload apply itself, or wait and offer a banner?
 *
 * Auto-reloading under an open textarea would eat what someone is typing, and
 * that is the difference between helpful and infuriating. Everything else
 * applies silently, because a reload nobody asked for should not need a click.
 */
export function shouldAutoReload(opts: { editing: boolean }): boolean {
  return !opts.editing;
}

/**
 * Collapse a burst of file writes into one reload.
 *
 * `resolver build` rewrites graph.json, story.json and the day files in quick
 * succession, so an un-debounced watcher would fire four reloads for one build
 * — and the middle ones would read a half-written folder.
 */
export function makeDebounce(delayMs: number, schedule: (fn: () => void, ms: number) => unknown = setTimeout) {
  let pending: unknown = null;
  return {
    call(fn: () => void): void {
      if (pending !== null) clearTimeout(pending as never);
      pending = schedule(() => {
        pending = null;
        fn();
      }, delayMs);
    },
    get scheduled(): boolean {
      return pending !== null;
    },
  };
}
