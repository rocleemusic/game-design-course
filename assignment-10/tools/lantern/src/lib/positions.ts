/**
 * Hand-dragged node positions, persisted per canvas.
 *
 * Sign-off 4 (Roc, 2026-07-30): positions live in localStorage, NOT in the run
 * folder — the resolver regenerates that folder and git tracks it, and a
 * dragged card is view state, not a document fact. The same reasoning keeps
 * these out of undo: nobody undoes "I nudged a card".
 *
 * Scoped, because one saved position only makes sense inside the layout that
 * produced it. A scope is `<run dir>|<canvas>|<variant>`: change scene, flip
 * the flow direction, or switch level layout, and you get a different scope
 * rather than cards landing at coordinates computed for a different arrangement.
 *
 * Garbage-tolerant like `prefs.ts` and `panes.ts` — a corrupt blob falls back
 * to "nothing saved", because a desk tool with a bad pref should still open.
 */

const STORAGE_KEY = "lantern-positions-v1";

export interface XY {
  x: number;
  y: number;
}

/** Every scope's saved positions: scope -> node id -> point. */
type Store = Record<string, Record<string, XY>>;

/** Cap the store so a long session cannot grow localStorage without bound. */
const MAX_SCOPES = 40;

export function positionScope(
  dir: string,
  canvas: string,
  variant: string
): string {
  return `${dir}|${canvas}|${variant}`;
}

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Store = {};
    for (const [scope, nodes] of Object.entries(parsed as Record<string, unknown>)) {
      if (!nodes || typeof nodes !== "object") continue;
      const clean: Record<string, XY> = {};
      for (const [id, p] of Object.entries(nodes as Record<string, unknown>)) {
        const pt = p as Partial<XY>;
        if (typeof pt?.x === "number" && typeof pt?.y === "number" &&
            Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
          clean[id] = { x: pt.x, y: pt.y };
        }
      }
      if (Object.keys(clean).length > 0) out[scope] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    const scopes = Object.keys(store);
    let trimmed = store;
    if (scopes.length > MAX_SCOPES) {
      // Drop the oldest-inserted scopes; insertion order is good enough here,
      // and losing a stale layout is cheaper than an unbounded blob.
      trimmed = {};
      for (const scope of scopes.slice(scopes.length - MAX_SCOPES)) {
        trimmed[scope] = store[scope];
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full or unavailable — dragging still works, it just won't persist
  }
}

/** Saved positions for one canvas. Empty when nothing has been dragged. */
export function readPositions(scope: string): Record<string, XY> {
  return readStore()[scope] ?? {};
}

/** Remember one node's position. */
export function writePosition(scope: string, id: string, at: XY): void {
  const store = readStore();
  store[scope] = { ...(store[scope] ?? {}), [id]: { x: at.x, y: at.y } };
  writeStore(store);
}

/** Forget one canvas's positions — what "Reset layout" clears. */
export function clearPositions(scope: string): void {
  const store = readStore();
  if (!(scope in store)) return;
  delete store[scope];
  writeStore(store);
}

/**
 * Lay saved positions over freshly computed ones.
 *
 * A node with nothing saved keeps its computed position, so adding a beat to a
 * scene you had already arranged places the new card sensibly instead of at
 * the origin.
 */
export function applyPositions<T extends { id: string; position: XY }>(
  nodes: T[],
  saved: Record<string, XY>
): T[] {
  if (Object.keys(saved).length === 0) return nodes;
  return nodes.map((n) => (saved[n.id] ? { ...n, position: saved[n.id] } : n));
}
