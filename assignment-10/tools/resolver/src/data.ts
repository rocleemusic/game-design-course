// Load the four data JSONs from a directory. The sibling data pass writes
// tools/resolver/data/*.json; the fixtures/ set matches the same schemas so
// real data swaps in via --data with no code change.
//
// The 2026-07-29 layout-pass files arrive in a provisional envelope
// ({ provisional, note, <payload> }) with a few field-name variants. The
// loader normalizes both forms and reports every accommodation as a warning —
// it never rewrites the data files themselves (they are human-gated).

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ChoiceNode,
  ResolverData,
  RoleWorkplace,
  Scene,
  SceneGraph,
  ScreenSpec,
  Seam,
  SlotType,
  Soul,
} from "./types.ts";

// guardrails.md check 8 (Slot typing): the closed enum content_id.slot_type
// must belong to. Mirrors the SlotType union in types.ts.
const SLOT_TYPES: readonly SlotType[] = ["dialogue", "action", "object", "player_line"];

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES_DIR = join(PACKAGE_ROOT, "fixtures");

function readJson(dir: string, file: string): unknown {
  return JSON.parse(readFileSync(join(dir, file), "utf8"));
}

function unwrap<T>(raw: unknown, key: string, file: string, warnings: string[]): T {
  if (Array.isArray(raw)) return raw as T;
  const obj = raw as Record<string, unknown>;
  if (obj && Array.isArray(obj[key])) {
    if (obj.provisional) warnings.push(`${file}: provisional envelope unwrapped ("${key}")`);
    return obj[key] as T;
  }
  throw new Error(`${file}: expected an array or an object with "${key}"`);
}

function normalizeScreens(raw: unknown, warnings: string[]): ScreenSpec[] {
  const screens = unwrap<ScreenSpec[]>(raw, "screens", "screen-specs.json", warnings);
  let toForm = 0;
  for (const screen of screens) {
    screen.connects_to = (screen.connects_to ?? []).map((c) => {
      if (typeof c === "object" && c !== null && "to" in c && !("screen_id" in c)) {
        toForm += 1;
        const edge = c as unknown as { to: string; seam?: string };
        return edge.seam ? { screen_id: edge.to, seam: edge.seam } : edge.to;
      }
      return c;
    });
  }
  if (toForm > 0) {
    warnings.push(`screen-specs.json: ${toForm} connects_to entries used {to} form; normalized to {screen_id}`);
  }
  return screens;
}

function normalizeRoleWorkplace(raw: unknown, warnings: string[]): RoleWorkplace[] {
  const rows = unwrap<Record<string, unknown>[]>(raw, "roles", "role-workplace.json", warnings);
  return rows.map((r) => {
    if (r.role_tag === undefined && typeof r.role === "string") {
      warnings.push(`role-workplace.json: row "${r.role}" uses "role"; read as role_tag`);
      return { ...(r as object), role_tag: r.role } as unknown as RoleWorkplace;
    }
    return r as unknown as RoleWorkplace;
  });
}

function normalizeSceneGraph(raw: unknown, warnings: string[]): SceneGraph {
  const obj = raw as Record<string, unknown>;
  if (obj?.provisional) warnings.push("scene-graph.json: provisional envelope");
  const souls: Soul[] = ((obj?.souls as Record<string, unknown>[] | undefined) ?? []).map((s) => {
    if (s.deep === undefined && (s.depth === "deep" || s.depth === "texture")) {
      warnings.push(
        `scene-graph.json: soul "${s.soul_id}" uses depth "${s.depth}"; read as deep=${s.depth === "deep"}`,
      );
      return { ...(s as object), deep: s.depth === "deep" } as Soul;
    }
    return s as unknown as Soul;
  });
  const scenes = (obj?.scenes as Scene[] | undefined) ?? [];
  const looseNodes = (obj?.choice_nodes as ChoiceNode[] | undefined) ?? [];

  if (!obj?.souls) warnings.push("scene-graph.json: no souls[] roster");

  for (const scene of scenes) {
    if (!scene.lines) {
      warnings.push(`scene-graph.json: scene ${scene.scene_id} has no lines[]; defaulted empty`);
      scene.lines = [];
    }
    for (const line of scene.lines) {
      if (!SLOT_TYPES.includes(line.slot_type)) {
        throw new Error(
          `scene-graph.json: scene ${scene.scene_id} line "${line.content_id}" has slot_type ` +
            `"${line.slot_type}" (guardrails.md check 8 closed enum: ${SLOT_TYPES.join(" | ")})`,
        );
      }
    }
    if (!scene.choice_nodes) scene.choice_nodes = [];
  }
  // Top-level choice_nodes join their scenes by scene_id.
  for (const node of looseNodes) {
    const scene = scenes.find((s) => s.scene_id === node.scene_id);
    if (!scene) {
      warnings.push(`scene-graph.json: choice_node ${node.choice_id} names unknown scene ${node.scene_id}; dropped`);
      continue;
    }
    warnings.push(`scene-graph.json: choice_node ${node.choice_id} was top-level; joined to ${node.scene_id}`);
    scene.choice_nodes.push(node);
  }
  for (const scene of scenes) {
    for (const node of scene.choice_nodes) {
      if (!node.options) {
        warnings.push(`scene-graph.json: ${node.choice_id} has no options[] (schema wants 2-3); defaulted empty`);
        node.options = [];
      }
      if (!node.availability_conditions) node.availability_conditions = [];
    }
  }
  // Souls referenced by scenes but missing from the roster get a bare entry so
  // addresses and declarations still derive. No role/home/deep data is invented.
  const known = new Set(souls.map((s) => s.soul_id));
  for (const scene of scenes) {
    if (!known.has(scene.soul)) {
      warnings.push(`scene-graph.json: no souls[] entry for "${scene.soul}"; derived a bare soul (no role, no home, not deep)`);
      souls.push({ soul_id: scene.soul });
      known.add(scene.soul);
    }
  }
  return { souls, scenes };
}

export function loadData(dataDir: string = FIXTURES_DIR, warnings: string[] = []): ResolverData {
  return {
    screens: normalizeScreens(readJson(dataDir, "screen-specs.json"), warnings),
    seams: unwrap<Seam[]>(readJson(dataDir, "seams.json"), "seams", "seams.json", warnings),
    sceneGraph: normalizeSceneGraph(readJson(dataDir, "scene-graph.json"), warnings),
    roleWorkplace: normalizeRoleWorkplace(readJson(dataDir, "role-workplace.json"), warnings),
  };
}
