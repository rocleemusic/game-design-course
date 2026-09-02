import raw from "./sceneShortNames.json";

/**
 * GP-96 (2026-08-12, Roc: "derive") — the scene_id -> short name map the
 * SceneRail needs so a scene reads as its thread and conversation
 * (`toby-the-shelf-C4`) rather than a bare address (`SC-T2-11`).
 *
 * DERIVED AT BUILD from the authored line files' H1 by
 * scripts/gen-scene-short-names.mjs, never hand-maintained — the same rule
 * threadProse follows, for the same reason: a second hand-typed copy drifts.
 * scene-graph.json carries no thread or conversation field, so the line files
 * are the only place the pairing is stated.
 */
const SHORT_NAMES: Record<string, string> = raw;

/**
 * A scene's readable handle, or null when no line file claims it.
 *
 * Null, not the id: the caller decides how to show an unmapped scene, and the
 * rail shows its raw `SC-*`. NEVER invent a name for an unmapped scene — a
 * scene with no line file (SC-T2-04, the SC-T7-* pair) is a real state, and
 * so is a scene whose line file was never written.
 */
export function sceneShortName(sceneId: string): string | null {
  return SHORT_NAMES[sceneId] ?? null;
}

/**
 * The rail's label: the address always, the short name when there is one.
 * The `·` separator matches the scene header's existing grammar
 * (`SC-T2-01 · toby · N lines · N choices`), so the two read as one system.
 */
export function sceneRailLabel(sceneId: string): string {
  const short = sceneShortName(sceneId);
  return short ? `${sceneId} · ${short}` : sceneId;
}
