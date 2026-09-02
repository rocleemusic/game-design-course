import type { Graph, Screen } from "../types";

/**
 * Level view is spatial, not a flow: Town cluster left, Forest cluster right,
 * the seam edge between. No flow axis — fixed positions from location clusters.
 */

/**
 * How a pane draws the level.
 *
 * - `constellation` — each cluster spreads around its hub; radius is hops from
 *   the hub, so position still means proximity, not progression. Holds the
 *   no-flow-axis rule above.
 * - `tree` — ranked by depth from the start screen. Reads the structure most
 *   plainly, and does introduce a flow axis; offered as a deliberate choice.
 * - `list` — no canvas at all, a sortable table of every screen.
 */
export type LevelLayoutMode = "constellation" | "tree" | "list";

export const LEVEL_LAYOUT_MODES: LevelLayoutMode[] = [
  "constellation",
  "tree",
  "list",
];

export function isLevelLayoutMode(v: unknown): v is LevelLayoutMode {
  return (
    typeof v === "string" &&
    (LEVEL_LAYOUT_MODES as string[]).includes(v)
  );
}

export interface LevelNode {
  id: string;
  screen: Screen;
  position: { x: number; y: number };
}

export interface LevelEdge {
  id: string;
  source: string;
  target: string;
  seamName?: string;
}

/* Card dimensions the spacing is derived from. Blueprint node cards (a later
   phase) change these — retune here, the geometry follows. */
const NODE_W = 260;
const NODE_H = 120;

/** clear space between two cards sitting side by side on the same ring */
const GUTTER = 48;
/** the arc one card needs to itself */
const SLOT = NODE_W + GUTTER;

/** radius of the first ring out from a hub */
const RING_BASE = NODE_W + NODE_H;
/** how much further out each subsequent ring sits */
const RING_GAP = NODE_W + GUTTER;
/** clear space between the outer edges of two clusters */
const CLUSTER_PAD = NODE_W * 2;

/**
 * Adjacency within one cluster. The level graph is undirected — `connects_to`
 * names a neighbour, not a direction — so every edge is recorded both ways.
 */
function clusterAdjacency(screens: Screen[]): Map<string, string[]> {
  const inCluster = new Set(screens.map((s) => s.screen_id));
  const adj = new Map<string, string[]>(screens.map((s) => [s.screen_id, []]));
  for (const s of screens) {
    for (const t of s.connects_to) {
      if (!inCluster.has(t)) continue; // a seam leaves the cluster
      adj.get(s.screen_id)!.push(t);
      adj.get(t)!.push(s.screen_id);
    }
  }
  return adj;
}

/**
 * The screen a cluster organises itself around: its ENTRANCE — the screen you
 * arrive through, which is how the place is actually experienced. That is any
 * screen with a connection crossing the cluster boundary, counted in both
 * directions since `connects_to` is often recorded on one side of a seam only.
 *
 * A cluster nobody enters (or one whose seams are not yet authored) falls back
 * to its best-connected screen. Ties go to the run's start screen, then to
 * connection count, then to graph order — so the hub never depends on Map
 * iteration luck and the layout is reproducible.
 */
function hubOf(
  screens: Screen[],
  adj: Map<string, string[]>,
  all: Screen[]
): Screen {
  const inCluster = new Set(screens.map((s) => s.screen_id));
  const entrances = new Set<string>();
  for (const s of all) {
    for (const t of s.connects_to) {
      const from = inCluster.has(s.screen_id);
      const to = inCluster.has(t);
      if (from && !to) entrances.add(s.screen_id);
      if (!from && to) entrances.add(t);
    }
  }

  const pool = screens.filter((s) => entrances.has(s.screen_id));
  const candidates = pool.length > 0 ? pool : screens;

  let best = candidates[0];
  for (const s of candidates) {
    if (s.status === "start" && best.status !== "start") best = s;
    else if (best.status === "start" && s.status !== "start") continue;
    else if (adj.get(s.screen_id)!.length > adj.get(best.screen_id)!.length) best = s;
  }
  return best;
}

/**
 * Hops from the hub, plus the tree that discovery walked — the parent that
 * first reached each screen is the branch it hangs off. Anything the hub cannot
 * reach comes back separately, to be parked beyond the last ring.
 */
function ringsFromHub(
  screens: Screen[],
  adj: Map<string, string[]>,
  hub: Screen
): {
  ring: Map<string, number>;
  children: Map<string, string[]>;
  islands: Screen[];
} {
  const ring = new Map<string, number>([[hub.screen_id, 0]]);
  const children = new Map<string, string[]>(screens.map((s) => [s.screen_id, []]));
  let frontier = [hub.screen_id];
  let depth = 0;
  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (ring.has(n)) continue;
        ring.set(n, depth);
        children.get(id)!.push(n);
        next.push(n);
      }
    }
    frontier = next;
  }

  const islands = screens.filter((s) => !ring.has(s.screen_id));
  const outer = depth + 1;
  for (const s of islands) ring.set(s.screen_id, outer);

  return { ring, children, islands };
}

/** A ring must be wide enough that its cards do not touch. */
function ringRadius(ring: number, count: number): number {
  const byDepth = RING_BASE + (ring - 1) * RING_GAP;
  const byCrowding = (count * SLOT) / (2 * Math.PI);
  return Math.max(byDepth, byCrowding);
}

/**
 * Constellation: each location spreads around its hub, ring by ring.
 *
 * Radius means hops from the hub — proximity, not progression — so this keeps
 * the level view spatial rather than turning it into a flow. Rings widen when
 * they get crowded, and each cluster is placed clear of the one before it, so
 * the layout stays readable as screens are added.
 */
export function constellationLayout(graph: Graph): LevelNode[] {
  const byLocation = new Map<string, Screen[]>();
  for (const s of graph.screens) {
    const list = byLocation.get(s.location) ?? [];
    list.push(s);
    byLocation.set(s.location, list);
  }

  const nodes: LevelNode[] = [];
  let cursorX = 0;
  let previousOuter = 0;

  for (const [, screens] of byLocation) {
    const byId = new Map(screens.map((s) => [s.screen_id, s]));
    const adj = clusterAdjacency(screens);
    const hub = hubOf(screens, adj, graph.screens);
    const { ring, children, islands } = ringsFromHub(screens, adj, hub);

    // how many screens share each ring — a crowded ring has to widen
    const perRing = new Map<number, number>();
    for (const r of ring.values()) perRing.set(r, (perRing.get(r) ?? 0) + 1);

    /** leaves under a screen — how much of the circle its branch deserves */
    const weight = new Map<string, number>();
    const weigh = (id: string): number => {
      const kids = children.get(id)!;
      const n = kids.length === 0 ? 1 : kids.reduce((sum, k) => sum + weigh(k), 0);
      weight.set(id, n);
      return n;
    };
    weigh(hub.screen_id);

    const at = new Map<string, { x: number; y: number }>([
      [hub.screen_id, { x: 0, y: 0 }],
    ]);
    let outer = 0;

    /**
     * Each branch owns a wedge of the circle and its children divide that
     * wedge between them. A branch therefore trails outward in one direction
     * instead of every ring restarting at the same angle — which is what made
     * a chain of single-child screens stack in a straight line.
     */
    const spread = (id: string, from: number, to: number) => {
      const kids = children.get(id)!;
      if (kids.length === 0) return;
      const total = kids.reduce((sum, k) => sum + weight.get(k)!, 0);
      let cursor = from;
      for (const kid of kids) {
        const span = ((to - from) * weight.get(kid)!) / total;
        const r = ring.get(kid)!;
        const radius = ringRadius(r, perRing.get(r)!);
        outer = Math.max(outer, radius);
        const angle = cursor + span / 2;
        at.set(kid, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
        spread(kid, cursor, cursor + span);
        cursor += span;
      }
    };
    spread(hub.screen_id, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI);

    // screens the hub cannot reach get their own ring beyond everything else
    if (islands.length > 0) {
      const r = Math.max(...ring.values());
      const radius = ringRadius(r, islands.length);
      outer = Math.max(outer, radius);
      const step = (2 * Math.PI) / islands.length;
      islands.forEach((s, i) => {
        const angle = -Math.PI / 2 + i * step;
        at.set(s.screen_id, {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      });
    }

    // slide this cluster clear of the previous one
    if (nodes.length > 0) cursorX += previousOuter + outer + CLUSTER_PAD;
    for (const s of screens) {
      const p = at.get(s.screen_id)!;
      nodes.push({
        id: s.screen_id,
        screen: byId.get(s.screen_id)!,
        position: { x: Math.round(p.x + cursorX), y: Math.round(p.y) },
      });
    }
    previousOuter = outer;
  }

  return nodes;
}

/** one depth step right */
const TREE_COL_W = NODE_W + 140;
/** one leaf row down */
const TREE_ROW_H = NODE_H + 60;

/** Adjacency across the whole graph — seams included, unlike the cluster version. */
function fullAdjacency(screens: Screen[]): Map<string, string[]> {
  const known = new Set(screens.map((s) => s.screen_id));
  const adj = new Map<string, string[]>(screens.map((s) => [s.screen_id, []]));
  for (const s of screens) {
    for (const t of s.connects_to) {
      if (!known.has(t)) continue; // an edge to a screen this run does not hold
      adj.get(s.screen_id)!.push(t);
      adj.get(t)!.push(s.screen_id);
    }
  }
  return adj;
}

/** Where the tree is rooted: the run's start screen, else the best-connected one. */
function rootOf(screens: Screen[], adj: Map<string, string[]>): Screen {
  return (
    screens.find((s) => s.status === "start") ??
    screens.reduce((best, s) =>
      adj.get(s.screen_id)!.length > adj.get(best.screen_id)!.length ? s : best
    )
  );
}

/**
 * Tree: depth from the start screen runs left to right, children stack down.
 *
 * This DOES introduce a flow axis — x means "how far in", which the spatial
 * default deliberately avoids. It is offered as a second reading, not the
 * default, because it shows parent/child structure more plainly than any
 * spatial arrangement can.
 *
 * A screen the root cannot reach starts its own tree below the last one, so a
 * disconnected run still lays out rather than piling up at the origin.
 */
export function treeLayout(graph: Graph): LevelNode[] {
  const screens = graph.screens;
  if (screens.length === 0) return [];

  const adj = fullAdjacency(screens);
  const byId = new Map(screens.map((s) => [s.screen_id, s]));

  const depth = new Map<string, number>();
  const children = new Map<string, string[]>(screens.map((s) => [s.screen_id, []]));
  const roots: string[] = [];

  /** breadth-first from one root, recording depth and the parent that found each */
  const walk = (rootId: string) => {
    roots.push(rootId);
    depth.set(rootId, 0);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const n of adj.get(id) ?? []) {
          if (depth.has(n)) continue;
          depth.set(n, depth.get(id)! + 1);
          children.get(id)!.push(n);
          next.push(n);
        }
      }
      frontier = next;
    }
  };

  walk(rootOf(screens, adj).screen_id);
  // anything the first root never reached becomes its own tree
  for (const s of screens) if (!depth.has(s.screen_id)) walk(s.screen_id);

  // Leaves take the next free row; a parent centres on its own children.
  let row = 0;
  const y = new Map<string, number>();
  const place = (id: string): number => {
    const kids = children.get(id)!;
    if (kids.length === 0) {
      const at = row * TREE_ROW_H;
      row += 1;
      y.set(id, at);
      return at;
    }
    const kidYs = kids.map(place);
    const at = (kidYs[0] + kidYs[kidYs.length - 1]) / 2;
    y.set(id, at);
    return at;
  };
  for (const r of roots) {
    place(r);
    row += 1; // a blank row between separate trees
  }

  return screens.map((s) => ({
    id: s.screen_id,
    screen: byId.get(s.screen_id)!,
    position: {
      x: depth.get(s.screen_id)! * TREE_COL_W,
      y: Math.round(y.get(s.screen_id)!),
    },
  }));
}

/** Undirected connections, de-duplicated, seam edges named. Shared by layouts. */
export function levelEdges(graph: Graph): LevelEdge[] {
  const seamByPair = new Map<string, string>();
  for (const seam of graph.seams) {
    seamByPair.set(pairKey(seam.from, seam.to), seam.name);
  }

  const edges: LevelEdge[] = [];
  const seen = new Set<string>();
  for (const s of graph.screens) {
    for (const target of s.connects_to) {
      const key = pairKey(s.screen_id, target);
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        id: `e-${key}`,
        source: s.screen_id,
        target,
        seamName: seamByPair.get(key),
      });
    }
  }
  return edges;
}

export interface LevelRow {
  id: string;
  name: string;
  location: string;
  /** the raw status string, e.g. "start" or "locked(G-F1-fernpath)" */
  status: string;
  locked: boolean;
  /** "archetype · gate_id" for a locked screen, else null */
  gate: string | null;
  neighbours: string[];
}

/**
 * The gate ids a status lock names, in order.
 *
 * A lock may name two gates — `locked(a, b)` is a conjunction, both keys
 * required, never an OR (schema, ruled 2026-07-30). Returns [] for an unlocked
 * screen, so callers can treat "no keys" and "not locked" the same way.
 */
export function lockGateIds(status: string): string[] {
  if (!status.startsWith("locked(")) return [];
  return status
    .slice(7, -1)
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * List rows: every screen, found by name rather than by position.
 *
 * Covers what the scene rail cannot — the rail only lists screens that hold
 * dialogue, so a screen with no scenes appears nowhere else outside the canvas.
 * Scene counts are the caller's to add; this stays a pure read of the graph.
 */
export function levelRows(graph: Graph): LevelRow[] {
  const order = new Map<string, number>();
  for (const s of graph.screens) {
    if (!order.has(s.location)) order.set(s.location, order.size);
  }

  return graph.screens
    .map((s): LevelRow => {
      const locked = s.status.startsWith("locked(");
      const gateIds = lockGateIds(s.status);
      const label = (gateId: string): string => {
        // The key may be held by another screen (F7 opens on F5's cascade), so
        // an unresolved id is normal — show the id alone, never the word "null".
        const gate = s.gates.find((g) => g.gate_id === gateId);
        return gate?.archetype ? `${gate.archetype} · ${gate.gate_id}` : gateId;
      };
      return {
        id: s.screen_id,
        name: s.name,
        location: s.location,
        status: s.status,
        locked,
        gate: gateIds.length ? gateIds.map(label).join(" + ") : null,
        neighbours: [...s.connects_to],
      };
    })
    .sort(
      (a, b) =>
        order.get(a.location)! - order.get(b.location)! ||
        a.id.localeCompare(b.id)
    );
}

/** the two modes that draw on the canvas; `list` renders a table instead */
export type CanvasLayoutMode = Exclude<LevelLayoutMode, "list">;

export function levelLayout(
  graph: Graph,
  mode: CanvasLayoutMode = "constellation"
): { nodes: LevelNode[]; edges: LevelEdge[] } {
  const nodes = mode === "tree" ? treeLayout(graph) : constellationLayout(graph);
  return { nodes, edges: levelEdges(graph) };
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("--");
}
