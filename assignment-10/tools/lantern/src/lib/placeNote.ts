import { validRect } from "./markers";
import type { Rect } from "./stage";

/**
 * Placement notes (L8, D8) — the escape hatch sign-off #5 always pointed at.
 *
 * SIGN-OFF #5 (Roc, 2026-07-30) says the tool may fill in geometry for a
 * region the screen already declares, and may NEVER mint a region for
 * something unspecced: a new examinable is not just a rectangle, it needs a
 * clue tier and maybe a gate, and it changes what the screen means.
 *
 * So marking something NEW writes a note addressed to the pipeline instead —
 * this module is that note's format. Nothing here posts a region edit, and
 * nothing downstream of it may.
 *
 * WHY LINE-BASED AND NOT JSON. NotesPanel renders a note body as PLAIN TEXT
 * in a <p> (NotesPanel.tsx:163) — no markdown, no code block. The body has to
 * read cleanly raw to a human AND parse mechanically, so it is a short block
 * of `key: value` lines followed by free prose:
 *
 *   @place
 *   id: item_ash
 *   kind: item
 *   screen: sq_bench
 *   rect: 0.3100 0.4400 0.1200 0.0900
 *
 *   ash on the bench, near the forge end
 *
 * DETECTION IS THE `@place` HEADER ON LINE 1 AND NOTHING ELSE. Sniffing for a
 * `rect:` line would let ordinary prose — someone typing coordinates into a
 * sentence — be read as a placement, and the pipeline would then act on a
 * human's remark. A false positive here is worse than a missed note.
 */

export const PLACE_HEADER = "@place";

export type PlacementKind = "item" | "key-item" | "npc" | "examinable" | "general";

export const PLACEMENT_KINDS: PlacementKind[] = [
  "item",
  "key-item",
  "npc",
  "examinable",
  "general",
];

export interface Placement {
  /** null ONLY for `general` — the fast path that skips the taxonomy call */
  id: string | null;
  kind: PlacementKind;
  screen: string;
  rect: Rect;
  /** free human context; never parsed, never required */
  prose: string;
  /**
   * Where to find this placement's note again, so an edit to the ghost can be
   * written back to the SAME note rather than minting a duplicate. (target,
   * timestamp) is the stable identity — `postNoteResolve` already keys off
   * exactly this pair. Populated only when the source carried both fields,
   * so a placement built by hand (e.g. in a test) can omit it.
   */
  source?: { target: string | null; timestamp: string; body: string };
}

/** 4 decimals, matching the `tidy` rounding every rect in markers.ts goes through. */
function fmtRect(rect: Rect): string {
  return [rect.x, rect.y, rect.w, rect.h].map((n) => n.toFixed(4)).join(" ");
}

export function formatPlaceNote(p: Placement): string {
  const lines = [PLACE_HEADER];
  // `general` omits the id LINE entirely rather than writing `id: null` or an
  // empty value — an empty key reads to a human as a field someone forgot.
  if (p.kind !== "general" && p.id) lines.push(`id: ${p.id}`);
  lines.push(`kind: ${p.kind}`);
  lines.push(`screen: ${p.screen}`);
  lines.push(`rect: ${fmtRect(p.rect)}`);
  const prose = p.prose.trim();
  if (prose !== "") lines.push("", prose);
  return lines.join("\n");
}

function parseRectLine(value: string): Rect | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (!nums.every((n) => Number.isFinite(n))) return null;
  const [x, y, w, h] = nums;
  // Through the read path's own validator, same as every other rect the tool
  // produces — a placement the stage could not render is not a placement.
  return validRect({ x, y, w, h });
}

/**
 * Read a note body back as a placement, or null when it is not one.
 *
 * Returns null unless line 1 is exactly `@place`. Unknown keys are ignored on
 * purpose, so the format can grow a field without invalidating old notes.
 */
export function parsePlaceNote(body: string): Placement | null {
  const lines = body.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== PLACE_HEADER) return null;

  const fields = new Map<string, string>();
  for (let i = 1; i < lines.length; i += 1) {
    // Everything after the FIRST blank line is human context, full stop.
    if (lines[i].trim() === "") break;
    const at = lines[i].indexOf(":");
    if (at === -1) continue; // not a field line; ignore rather than fail
    const key = lines[i].slice(0, at).trim().toLowerCase();
    if (!fields.has(key)) fields.set(key, lines[i].slice(at + 1).trim());
  }

  const kind = fields.get("kind") as PlacementKind | undefined;
  if (!kind || !PLACEMENT_KINDS.includes(kind)) return null;

  const screen = fields.get("screen") ?? "";
  if (screen === "") return null;

  const rectRaw = fields.get("rect");
  if (rectRaw === undefined) return null;
  const rect = parseRectLine(rectRaw);
  if (!rect) return null;

  const rawId = fields.get("id")?.trim() ?? "";
  // `general` carries no id even if someone hand-typed one; every other kind
  // needs one, and a headed block missing it is malformed, not a general note.
  const id = kind === "general" ? null : rawId;
  if (kind !== "general" && (id === null || id === "")) return null;

  const blank = lines.findIndex((l, i) => i > 0 && l.trim() === "");
  const prose = blank === -1 ? "" : lines.slice(blank + 1).join("\n").trim();

  return { id, kind, screen, rect, prose };
}

/**
 * The minimum a note has to look like for this module to read it. Structural
 * on purpose rather than importing `Note` from bridge.ts: this file is pure
 * and DOM-free, and the derivation below should not drag the fetch client in.
 */
export interface PlaceNoteSource {
  body: string;
  resolved: boolean;
  /** Note identity, when the caller has it — see `Placement.source`. */
  target?: string | null;
  timestamp?: string;
}

/**
 * The outstanding placement requests for one screen, derived from the run's
 * notes (D8 follow-up).
 *
 * WHY FROM THE NOTES AND NOT FROM COMPONENT STATE. A confirmed placement is
 * already durable — it is a note, it round-trips through the bridge, and Roc
 * reviews it later. Holding it in ephemeral state as well would mean a reload
 * silently erased the visual half of a marking pass. Notes are the one source.
 *
 * RESOLVED NOTES ARE DROPPED, not dimmed. This layer is a worklist of what the
 * pipeline still owes an answer on; `resolved` is exactly the pipeline saying
 * "acted on, done", and once that is true either the screen now DECLARES the
 * region (in which case it renders as a real region and a ghost beside it
 * would double-count it) or it was rejected (in which case it is not going to
 * happen). Either way keeping it on the image would misreport the screen.
 *
 * Nothing produced here is a region. These are provisional and must never be
 * counted among the screen's declared regions, become a drag target, or reach
 * `onCommit` — a pending placement is a note to the pipeline and has no
 * region_id any consumer knows, so there is nothing for it to commit as
 * (sign-off #5).
 */
export function pendingPlacements(
  notes: readonly PlaceNoteSource[] | null | undefined,
  screenId: string | null | undefined
): Placement[] {
  if (!notes || !screenId) return [];
  const out: Placement[] = [];
  for (const n of notes) {
    if (n.resolved) continue;
    if (typeof n.body !== "string") continue;
    const p = parsePlaceNote(n.body);
    // parsePlaceNote already returns null for anything that is not a
    // well-formed @place block, so a malformed body is a skip, not a throw.
    if (p && p.screen === screenId) {
      // Only attach `source` when the caller actually gave us both halves of
      // the note's identity — a placement without it just can't be re-found,
      // and a half-populated source would be worse than none.
      if (n.target !== undefined && n.timestamp !== undefined) {
        p.source = { target: n.target, timestamp: n.timestamp, body: n.body };
      }
      out.push(p);
    }
  }
  return out;
}

/**
 * Rewrite a placement note's body with a new rect, keeping everything else —
 * prose, id, kind, screen — untouched. This is how a ghost's drag/resize gets
 * back to the note it came from: reparse, swap the rect, reformat.
 *
 * Returns the body UNCHANGED if it is not a well-formed placement note. That
 * (rather than null) means a caller that blindly pipes an arbitrary note body
 * through this function can't accidentally erase content it didn't recognize.
 */
export function placeNoteWithRect(body: string, rect: Rect): string {
  const p = parsePlaceNote(body);
  if (!p) return body;
  return formatPlaceNote({ ...p, rect });
}

/** The chip label for a pending placement: its id, or an honest `(general)`. */
export function placementLabel(p: Placement): string {
  return p.id && p.id !== "" ? p.id : "(general)";
}
