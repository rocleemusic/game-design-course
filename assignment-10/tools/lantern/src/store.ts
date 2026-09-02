import type { Approvals, EditPatch, Graph, ReviewStatus } from "./types";

/** Derived helpers over the two record files. Pure — unit tested. */

export function statusOf(approvals: Approvals, id: string): ReviewStatus | "pending" {
  return approvals[id]?.status ?? "pending";
}

/** The note left with a review, if any. Undefined reads as "no note". */
export function noteOf(approvals: Approvals, id: string): string | undefined {
  const note = approvals[id]?.note;
  return note && note.trim() !== "" ? note : undefined;
}

/**
 * Current display text for an edit target: patches replay in timestamp
 * order, later wins — the same rule the resolver uses (resolver/src/edits.ts),
 * so both sides always agree. The sort is stable; ties keep file/append order.
 */
export function textOf(edits: EditPatch[], target: string, original: string): string {
  const ordered = [...edits].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
  let text = original;
  for (const e of ordered) {
    if (e.target === target) text = e.new_text;
  }
  return text;
}

/** Every reviewable artifact id in the graph, in reading order. */
export interface Artifact {
  id: string;
  kind: "screen" | "scene" | "choice" | "option" | "line";
  label: string;
  screen_id: string;
  scene_id?: string;
}

export function listArtifacts(graph: Graph): Artifact[] {
  const out: Artifact[] = [];
  for (const s of graph.screens) {
    out.push({ id: s.screen_id, kind: "screen", label: s.name, screen_id: s.screen_id });
  }
  for (const sc of graph.scenes) {
    out.push({
      id: sc.scene_id,
      kind: "scene",
      label: `${sc.soul} @ ${sc.screen_id}`,
      screen_id: sc.screen_id,
      scene_id: sc.scene_id,
    });
    for (const line of sc.lines) {
      out.push({
        id: line.content_id,
        kind: "line",
        label: line.text,
        screen_id: sc.screen_id,
        scene_id: sc.scene_id,
      });
    }
    for (const ch of sc.choice_nodes) {
      out.push({
        id: ch.choice_id,
        kind: "choice",
        label: ch.choice_id,
        screen_id: sc.screen_id,
        scene_id: sc.scene_id,
      });
      for (const opt of ch.options) {
        out.push({
          id: opt.option_id,
          kind: "option",
          label: opt.surface_action ? `[${opt.surface_action}]` : opt.option_id,
          screen_id: sc.screen_id,
          scene_id: sc.scene_id,
        });
      }
    }
  }
  return out;
}

/** Review sweep: unreviewed and flagged only. approved/edited pass the gate. */
export function sweepList(graph: Graph, approvals: Approvals): Artifact[] {
  return listArtifacts(graph).filter((a) => {
    const st = statusOf(approvals, a.id);
    return st === "pending" || st === "flagged";
  });
}

/**
 * Every flagged artifact, and nothing else (D4). SweepPanel mixes flags in
 * with every pending node and never shows the flag's own note — this is the
 * flags-only list FlagsPanel renders, note included.
 */
export function flaggedList(graph: Graph, approvals: Approvals): Artifact[] {
  return listArtifacts(graph).filter((a) => statusOf(approvals, a.id) === "flagged");
}
