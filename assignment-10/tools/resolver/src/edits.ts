// applyEdits: the edits.json patch flow (resources/review-tool-spec_draft.md).
// Three rules:
//   1. old_text mismatch -> rejected and surfaced, never silently dropped or forced
//   2. missing target -> orphan report at the same surface
//   3. two patches to one target apply in timestamp order, later wins
// A regenerated graph never eats an edit silently; a stale edit never eats
// regenerated content silently.

import type { Edit, EditReport, Graph } from "./types.ts";

interface TextRef {
  get: () => string;
  set: (text: string) => void;
}

/** Fields on a choice node / option that the "<id>.<field>" target form may patch. */
const PATCHABLE_FIELDS = new Set([
  "equal_weight_note",
  "no_accrual_note",
  "surface_action",
]);

function findTarget(graph: Graph, target: string): TextRef | undefined {
  // content_id form: a line in some scene's flat lines array.
  for (const scene of graph.scenes) {
    for (const line of scene.lines) {
      if (line.content_id === target) {
        return { get: () => line.text, set: (t) => { line.text = t; } };
      }
    }
  }
  // "<choice_id>.<field>" (or "<option_id>.<field>") form.
  const dot = target.lastIndexOf(".");
  if (dot === -1) return undefined;
  const id = target.slice(0, dot);
  const field = target.slice(dot + 1);
  if (!PATCHABLE_FIELDS.has(field)) return undefined;
  for (const scene of graph.scenes) {
    for (const node of scene.choice_nodes) {
      const holder: Record<string, unknown> | undefined =
        node.choice_id === id
          ? (node as unknown as Record<string, unknown>)
          : (node.options.find((o) => o.option_id === id) as unknown as
              | Record<string, unknown>
              | undefined);
      if (holder && typeof holder[field] === "string") {
        return { get: () => holder[field] as string, set: (t) => { holder[field] = t; } };
      }
    }
  }
  return undefined;
}

/**
 * Apply edits.json patches to a graph. Mutates and returns the given graph;
 * the report surfaces every rejected and orphaned patch.
 */
export function applyEdits(graph: Graph, edits: Edit[]): EditReport {
  const report: EditReport = { applied: [], rejected: [], orphans: [] };
  // Rule 3: timestamp order, later wins. Stable sort keeps file order for ties.
  const ordered = [...edits].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  for (const edit of ordered) {
    const ref = findTarget(graph, edit.target);
    if (!ref) {
      // Rule 2: missing target -> orphan report.
      report.orphans.push({ edit, reason: `target "${edit.target}" no longer exists` });
      continue;
    }
    const current = ref.get();
    if (current !== edit.old_text) {
      // Rule 1: old_text mismatch -> reject and surface.
      report.rejected.push({
        edit,
        reason: "old_text no longer matches the current text",
        current_text: current,
      });
      continue;
    }
    ref.set(edit.new_text);
    report.applied.push(edit);
  }
  return report;
}
