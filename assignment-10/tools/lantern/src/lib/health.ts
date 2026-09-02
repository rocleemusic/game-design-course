import type { Approvals, Day, EditPatch, Graph, Region } from "../types";
import { listArtifacts, statusOf } from "../store";
import { buildWeek, sceneBands } from "./week";

/**
 * Graph health — a pure readout for the rail, mirroring the reference tool's
 * HEALTH block (Reachable / Unreachable / Errors / Warnings).
 *
 * Reachability is an undirected flood over `connects_to` from every start
 * screen: a screen with no path back to a start is an island, which is a
 * structural fault the layout hides. Gating is not reachability — a locked
 * screen still connects, so it stays reachable here.
 *
 * Errors are structural and named individually (dangling diverts, missing
 * region refs, orphaned edits). Warnings are content-completeness signals and
 * aggregated per category so the count stays small and glanceable.
 */

export interface Health {
  reachable: string[];
  unreachable: string[];
  errors: string[];
  warnings: string[];
}

function isNullShape(shape: Region["shape"]): boolean {
  return shape === null || shape === undefined;
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

export function computeHealth(
  graph: Graph,
  manifest: Record<string, string> | null,
  approvals: Approvals,
  edits: EditPatch[],
  /** the run's day.json, or null when the folder has none */
  day: Day | null = null
): Health {
  // ---- reachability: undirected flood over connects_to from start screens ----
  const adjacency = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    let s = adjacency.get(id);
    if (!s) adjacency.set(id, (s = new Set()));
    return s;
  };
  for (const s of graph.screens) {
    ensure(s.screen_id);
    for (const t of s.connects_to) {
      ensure(s.screen_id).add(t);
      ensure(t).add(s.screen_id); // undirected
    }
  }
  const reachable = new Set<string>();
  const queue = graph.screens
    .filter((s) => s.status === "start")
    .map((s) => s.screen_id);
  for (const root of queue) reachable.add(root);
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of adjacency.get(id) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  const unreachable = graph.screens
    .map((s) => s.screen_id)
    .filter((id) => !reachable.has(id));

  // ---- errors ----
  const errors: string[] = [];

  // known ids, for divert + edit resolution
  const artifacts = listArtifacts(graph);
  const knownIds = new Set<string>();
  for (const a of artifacts) knownIds.add(a.id);
  for (const sc of graph.scenes) for (const l of sc.lines) knownIds.add(l.content_id);

  // dangling diverts: an option that diverts must aim at a known id
  for (const sc of graph.scenes) {
    for (const ch of sc.choice_nodes) {
      for (const o of ch.options) {
        if (o.rejoin === "divert") {
          const target = o.divert_to;
          if (!target || !knownIds.has(target)) {
            errors.push(`dangling divert: ${o.option_id} → ${target ?? "(none)"}`);
          }
        }
      }
    }
  }

  // missing region refs: an examinable must point at a region the screen declares
  for (const s of graph.screens) {
    const regionIds = new Set((s.regions ?? []).map((r) => r.region_id));
    for (const ex of s.examinables ?? []) {
      if (!regionIds.has(ex.region)) {
        errors.push(`${s.screen_id}/${ex.id} → missing region ${ex.region}`);
      }
    }
  }

  // Unreachable CONTENT, not just unreachable screens (W2). The screen flood
  // above says nothing about whether a scene can ever open, and a scene gated
  // past the end of a life is invisible in every other view — it simply never
  // appears. Derived from the same day-floor rule the week view uses.
  for (const sceneId of buildWeek(graph).unreachable) {
    errors.push(`${sceneId} can never open: its day floor is past the end of a life`);
  }


  // orphaned edits: a target that resolves to no artifact or line. Targets are a
  // content_id or "<id>.<field>"; strip the last dot to recover the base id, the
  // same split the resolver uses.
  for (const e of edits) {
    const base = e.target.includes(".")
      ? e.target.slice(0, e.target.lastIndexOf("."))
      : e.target;
    if (!knownIds.has(e.target) && !knownIds.has(base)) {
      errors.push(`orphaned edit: ${e.target}`);
    }
  }

  // ---- warnings (aggregated) ----
  const warnings: string[] = [];

  // A band-gated scene that does not cover all three bands falls through
  // silently for the missing band, because the emitter's gate fallback
  // correctly skips it. Silent is the problem; the fallback is not.
  for (const scene of graph.scenes) {
    const bands = new Set(sceneBands(scene));
    if (bands.size === 0 || bands.size === 3) continue;
    warnings.push(
      `${scene.scene_id} covers only ${[...bands].sort().join(", ")} — a run in another band falls through`,
    );
  }

  const nullShapes = graph.screens.reduce(
    (n, s) => n + (s.regions ?? []).filter((r) => isNullShape(r.shape)).length,
    0
  );
  if (nullShapes > 0) {
    warnings.push(`${nullShapes} region${plural(nullShapes)} with no shape yet`);
  }

  const missingImages = graph.screens.filter(
    (s) => !(manifest && manifest[s.screen_id])
  ).length;
  if (missingImages > 0) {
    warnings.push(`${missingImages} screen${plural(missingImages)} without an image`);
  }

  const pending = artifacts.filter(
    (a) => statusOf(approvals, a.id) === "pending"
  ).length;
  if (pending > 0) {
    warnings.push(`${pending} node${plural(pending)} pending review`);
  }

  // `resolver build` does NOT write day.json — `resolve-day` does, and a run
  // folder built without it looks broken rather than incomplete: nobody stands
  // on any screen, and every npc_present() gate fails, so scenes open with no
  // options. Say so, because both symptoms otherwise read as tool bugs.
  if (!day) {
    warnings.push(
      "no day.json — nobody will appear on a screen and npc_present() gates " +
        "cannot pass; run: resolver resolve-day --input <day-input.json> --out <run>/day.json"
    );
  } else if (day.slot_fill.length === 0) {
    warnings.push("day.json places nobody — every screen will be empty");
  }

  return { reachable: [...reachable], unreachable, errors, warnings };
}
