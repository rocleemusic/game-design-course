/**
 * Views — the unit a pane shows.
 *
 * The shell has two view-hosts (centre and right). Each host lists every view
 * and independently shows the one the user picked, so the same view can sit in
 * either pane and two panes never fight over one tab bar.
 *
 * Mode is DERIVED here, not set by a click: the tool is "playing" when a
 * play-surface view (Stage or Play) is actually on screen. That keeps a hidden
 * right pane from holding the shell in play mode.
 */

import type { LevelLayoutMode } from "./levelLayout";

export type ViewId =
  | "dialogue"
  | "level"
  | "week"
  | "stage"
  | "play"
  | "sweep"
  | "flags"
  | "variables"
  | "notes"
  | "assets"
  | "cast"
  | "notebook"
  | "festival";

export type Mode = "review" | "play";

/**
 * Everything one host remembers. Panes are self-contained: each keeps its own
 * view AND its own per-view settings, so the centre can hold a constellation
 * while the right holds a tree.
 *
 * One object per host rather than a scalar per setting — the next per-pane
 * setting adds a field here instead of another pair of useStates in App.
 */
export interface PaneState {
  view: ViewId;
  levelMode: LevelLayoutMode;
  /** Dialogue view: is the scene picker strip open above the tree? */
  sceneListOpen: boolean;
}

export function paneWith(state: PaneState, patch: Partial<PaneState>): PaneState {
  return { ...state, ...patch };
}

export interface ViewDef {
  id: ViewId;
  /** tab label */
  label: string;
  /** one-line hint shown in the pane title */
  hint: string;
}

export const VIEWS: ViewDef[] = [
  { id: "dialogue", label: "Dialogue", hint: "flow top to bottom, options fan across, gates in amber" },
  { id: "level", label: "Level", hint: "town and forest clusters, seam between" },
  { id: "week", label: "Week", hint: "the whole life by day, threads running between" },
  { id: "stage", label: "Stage", hint: "the screen you are standing on" },
  { id: "play", label: "Play", hint: "continue line by line · click a node to jump" },
  { id: "sweep", label: "Sweep", hint: "unreviewed and flagged only" },
  { id: "flags", label: "Flags", hint: "every flag, with its note — clear or edit from the list" },
  { id: "variables", label: "Variables", hint: "readers and writers per variable" },
  { id: "notes", label: "Notes", hint: "structural notes addressed to the pipeline" },
  { id: "assets", label: "Assets", hint: "assign a screen image" },
  { id: "cast", label: "Cast", hint: "persona card, live bond band, and arc progress per soul" },
  { id: "notebook", label: "Notebook", hint: "knowledge collected this session — referenced any time (D6)" },
  { id: "festival", label: "Festival", hint: "festival tier as it currently resolves — external role goals only (D7)" },
];

const BY_ID = new Map<ViewId, ViewDef>(VIEWS.map((v) => [v.id, v]));

export function viewDef(id: ViewId): ViewDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`unknown view: ${id}`);
  return def;
}

/** Stage and Play are the two play-mode surfaces. */
export function isPlayView(id: ViewId): boolean {
  return id === "stage" || id === "play";
}

/**
 * Mode from what is visible. Pass only the views a user can actually see —
 * a hidden right pane contributes nothing.
 */
export function modeForViews(visible: readonly ViewId[]): Mode {
  return visible.some(isPlayView) ? "play" : "review";
}

/** The views on screen right now, given the shell's two hosts. */
export function visibleViews(
  centre: ViewId,
  right: ViewId,
  rightVisible: boolean
): ViewId[] {
  return rightVisible ? [centre, right] : [centre];
}
