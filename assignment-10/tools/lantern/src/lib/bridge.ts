import type { Approvals, Day, EditPatch, Graph, ReviewStatus } from "../types";
import { normalizeGraph } from "./normalizeGraph";
import type { PersonaCard } from "./personaCard";
import { overlayRegions, type RegionMap } from "./regionMap";

/**
 * Client side of the Vite dev-middleware file bridge.
 * All filesystem access lives behind /__bridge (see vite.config.ts).
 */

export interface WeekIndex {
  slot: number;
  life: number;
  days: number;
  files: string[];
}

export type NoteKind = "structure" | "question" | "todo";

export interface Note {
  /**
   * D4: was `string`, hardcoding every note to the global sceneId ?? screenId
   * selection. `null` is a real, first-class value here — "a general note,
   * addressed to nothing in particular" — not an absent field; NotesPanel
   * lets the target be cleared to it on purpose.
   */
  target: string | null;
  kind: NoteKind;
  body: string;
  resolved: boolean;
  timestamp: string;
}

/**
 * One row of the generated content index (`content-index.json` in the run
 * folder): the authored items and key items, by id.
 *
 * Lantern reads ONLY this generated file and never the content directory —
 * the index is the contract, so the tool cannot drift into parsing content
 * source itself. `status` is key-items only.
 */
export interface ContentEntry {
  id: string;
  kind: "item" | "key-item";
  label: string;
  category: string;
  source_locations: string[];
  status?: string;
}

export interface RunPayload {
  dir: string;
  graph: Graph;
  day: Day | null;
  /**
   * The whole life, when `resolver resolve-week` has written it. Empty for a
   * run folder built before W1d — `day` stays the day-1 file either way, so
   * every existing reader keeps working and this is purely additive.
   */
  days: Day[];
  week: WeekIndex | null;
  /** compiled story JSON (story.json in the run folder), null when absent */
  story: string | null;
  /** manifest.json: { screen_id: "images/t1.png" } — image paths only.
   *  null when the run folder has no manifest (every screen falls back). */
  manifest: Record<string, string> | null;
  approvals: Approvals;
  edits: EditPatch[];
  /** structural notes addressed to the pipeline; separate from approvals */
  notes: Note[];
  /**
   * D5 — personas.json in the run folder: soul_id -> authored persona card.
   * A run folder with no personas.json (every fixture pre-D5) resolves to
   * {}, and CastPanel reads a missing entry as "no card authored" rather
   * than throwing — see the blocker note in personaCard.ts.
   */
  personas: Record<string, PersonaCard>;
  /**
   * D8 — the generated content index, or null for a run folder without one.
   * Feeds the placement dialog's id list; it is a lookup, never a write path.
   */
  contentIndex: ContentEntry[] | null;
  /**
   * L9 — <dir>/regions.json: the run folder's own compact geometry map,
   * keyed on (screen_id, region_id). Applied over `graph` in `loadRun` so the
   * tool shows the last-drawn geometry even when graph.json predates it.
   */
  regions: RegionMap;
}

/**
 * The file on disk is `{ generated, entries }`; every reader in the app wants
 * the rows. Normalized once here rather than at each use, and tolerant of a
 * bare array so an older or hand-written index still loads.
 */
function normalizeContentIndex(raw: unknown): ContentEntry[] | null {
  if (Array.isArray(raw)) return raw as ContentEntry[];
  const entries = (raw as { entries?: unknown } | null)?.entries;
  return Array.isArray(entries) ? (entries as ContentEntry[]) : null;
}

/** URL for a screen image inside the open run folder (dev bridge). */
export function imageUrl(dir: string, imagePath: string): string {
  return `/__bridge/image?dir=${encodeURIComponent(dir)}&path=${encodeURIComponent(imagePath)}`;
}

export async function loadRun(dir: string): Promise<RunPayload> {
  const res = await fetch(`/__bridge/run?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `bridge error ${res.status}`);
  }
  const payload = (await res.json()) as RunPayload;
  // D3: `?? { screens: {} }` only guards a MISSING `regions` field. A
  // hand-edited or truncated regions.json can arrive as `{}` — present,
  // truthy, but with no `screens` key — and `overlayRegions` below indexes
  // `map.screens[screen_id]` unconditionally, so without this second guard
  // that shape throws and the whole run fails to load. The resolver already
  // guards this same shape (`map.screens ?? {}` in regions.ts).
  const rawRegions = payload.regions as { screens?: RegionMap["screens"] } | null | undefined;
  const regions: RegionMap = { screens: rawRegions?.screens ?? {} };
  return {
    ...payload,
    // Overlaid AFTER normalizeGraph so the patch lands on the same shape
    // every other reader sees — the tool shows applied geometry even when
    // graph.json predates the last Apply.
    graph: overlayRegions(normalizeGraph(payload.graph), regions),
    manifest: payload.manifest ?? null,
    days: payload.days ?? [],
    week: payload.week ?? null,
    notes: payload.notes ?? [],
    personas: payload.personas ?? {},
    contentIndex: normalizeContentIndex(payload.contentIndex) ?? null,
    regions,
  };
}

/**
 * Set one artifact's review status.
 *
 * `"pending"` returns it to unreviewed: the server deletes the record rather
 * than storing a pending one, because absence already reads as pending
 * (`store.ts`). Two ways to say one thing would eventually disagree.
 */
export async function postApprove(
  dir: string,
  artifact_id: string,
  status: ReviewStatus | "pending",
  note?: string
): Promise<Approvals> {
  const res = await fetch("/__bridge/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, artifact_id, status, note }),
  });
  if (!res.ok) throw new Error(`approve failed: ${res.status}`);
  return (await res.json()).approvals;
}

/**
 * Upload one screen image and point the manifest at it.
 *
 * The body is the raw File — the browser sets Content-Type from the File's own
 * type, which the server checks against the extension. Returns the new manifest.
 */
export async function postImage(
  dir: string,
  screen_id: string,
  file: File,
  opts: { overwrite?: boolean } = {}
): Promise<Record<string, string>> {
  const q = new URLSearchParams({ dir, screen_id, name: file.name });
  if (opts.overwrite) q.set("overwrite", "1");
  const res = await fetch(`/__bridge/image?${q}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `image upload failed: ${res.status}`);
  }
  return (await res.json()).manifest;
}

/** Every image file in the run folder, assigned or not. */
export async function loadImages(dir: string): Promise<string[]> {
  const res = await fetch(`/__bridge/images?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) throw new Error(`image list failed: ${res.status}`);
  return (await res.json()).images;
}

/**
 * Point a screen at an image already in the folder, or clear it with `null`.
 *
 * Reuse deliberately does NOT go through the upload route: uploading the same
 * file twice hits the name clash and asks about overwriting, when the real
 * intent is "use that same picture here too".
 */
export async function postManifest(
  dir: string,
  screen_id: string,
  imagePath: string | null
): Promise<Record<string, string>> {
  const res = await fetch("/__bridge/manifest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, screen_id, path: imagePath }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `manifest write failed: ${res.status}`);
  }
  return (await res.json()).manifest;
}

/**
 * Resolve one real day off the resolver (D2) — replaces the old reroll, which
 * ignored slot/life/day and simply re-read whatever day.json already said.
 *
 * `movedThreads` is `WorldState.movedThreads()` off the live player: the
 * host's day-end record of thread_move events, folded into the resolver's
 * thread record through `applyOutcome` (week.ts) server-side. `pickedLocation`
 * is the Home Hub calendar's pick, read off the story's own `pickedLocation`
 * VAR — the resolver's DayInput.picked_location contract (types.ts).
 */
export async function postReroll(
  dir: string,
  input: { slot: number; life: number; day: number; movedThreads: string[]; pickedLocation?: string }
): Promise<Day> {
  const res = await fetch("/__bridge/reroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, ...input }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `reroll failed: ${res.status}`);
  }
  return (await res.json()).day as Day;
}

export async function postEdit(
  dir: string,
  patch: Omit<EditPatch, "timestamp">
): Promise<EditPatch[]> {
  const res = await fetch("/__bridge/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, ...patch }),
  });
  if (!res.ok) throw new Error(`edit failed: ${res.status}`);
  return (await res.json()).edits;
}

/**
 * Leave a note on a node, addressed to the pipeline.
 *
 * Deliberately NOT an approval: "this beat needs to do X" is a request for a
 * change, and folding it into approvals.json would make a request look like a
 * verdict. This is the channel Roc's authoring loop runs on — he notes a
 * structural change, Claude acts on it, and the graph repaints.
 */
export async function postNote(
  dir: string,
  note: { target: string | null; kind: NoteKind; body: string }
): Promise<Note[]> {
  const res = await fetch("/__bridge/note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, ...note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `note failed: ${res.status}`);
  }
  return (await res.json()).notes;
}

/**
 * Set one note's `resolved` flag (D4). `resolved` existed on `Note` since L7
 * but nothing in the UI ever set it — this is that write path. Notes have no
 * stable id, so the match is (target, timestamp): the pair `postNote` already
 * stamps uniquely per note, mirroring how edits.json matches on
 * (target, timestamp) elsewhere in this bridge.
 */
export async function postNoteResolve(
  dir: string,
  note: { target: string | null; timestamp: string },
  resolved: boolean
): Promise<Note[]> {
  const res = await fetch("/__bridge/note-resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, target: note.target, timestamp: note.timestamp, resolved }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `note-resolve failed: ${res.status}`);
  }
  return (await res.json()).notes;
}

/**
 * Notes as markdown, so structural feedback leaves the tool in a form Claude
 * can act on directly. Grouped by target, because the pipeline works node by
 * node rather than in the order the notes happened to be written.
 */
export function notesAsMarkdown(notes: Note[]): string {
  if (notes.length === 0) return "";
  // A no-target note groups under "(general)" — a real bucket, not dropped.
  const byTarget = new Map<string, Note[]>();
  for (const n of notes) {
    const key = n.target ?? "(general)";
    const list = byTarget.get(key);
    if (list) list.push(n);
    else byTarget.set(key, [n]);
  }
  const out: string[] = ["# Lantern notes", ""];
  for (const [target, list] of byTarget) {
    out.push(`## ${target}`, "");
    for (const n of list) {
      out.push(`- **${n.kind}**${n.resolved ? " _(resolved)_" : ""}: ${n.body}`);
    }
    out.push("");
  }
  return out.join("\n");
}

/**
 * Rewrite one note's `body` in place (target, timestamp still identify it —
 * notes carry no other id). This is the route a rect adjustment goes
 * through: a pending placement's rect lives only inside its @place note
 * body, so moving the ghost means rewriting that note in place, not
 * resolving it and reposting a new one under a fresh timestamp.
 */
export async function postNoteUpdate(
  dir: string,
  key: { target: string | null; timestamp: string },
  body: string
): Promise<Note[]> {
  const res = await fetch("/__bridge/note-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, target: key.target, timestamp: key.timestamp, body }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errBody.error ?? `note-update failed: ${res.status}`);
  }
  return (await res.json()).notes;
}

/**
 * Merge one or more geometry entries into <dir>/regions.json — last write
 * wins per (screen_id, region_id). `rect: null` deletes that key, the same
 * way undo restores a region that had no shape.
 *
 * Sign-off #5 still holds: this only fills in geometry for a region_id the
 * spec already declares, never mints a new one — "mark something new" goes
 * through postNote instead.
 */
export async function postRegions(
  dir: string,
  entries: {
    screen_id: string;
    region_id: string;
    rect: { x: number; y: number; w: number; h: number } | null;
  }[]
): Promise<RegionMap> {
  const res = await fetch("/__bridge/regions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir, entries }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `regions write failed: ${res.status}`);
  }
  return (await res.json()).regions;
}
