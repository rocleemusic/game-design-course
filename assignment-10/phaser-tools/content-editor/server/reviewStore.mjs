/**
 * The review sidecar: read and write `tools/content-editor/review.json`.
 *
 * THE ONE HARD RULE OF THIS EDITOR: content JSON is never written. Every Approve
 * / Reject / note the editor records lands HERE, in a file the game never reads,
 * as `[{ entryId, status, note, ts }]`. A row is keyed by `entryId` (the same id
 * the data collector stamps on each row), so hydration on load is a lookup, and
 * a later re-review of the same row overwrites its one entry rather than
 * appending a duplicate.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REVIEW_FILE = path.resolve(here, "..", "review.json");

/** The current sidecar as an array. Missing or corrupt file reads as empty. */
export async function readReview() {
  try {
    const raw = await fs.readFile(REVIEW_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const VALID_STATUS = new Set(["approved", "rejected", "cleared"]);

/**
 * Upsert one review entry. `status: "cleared"` (or a null status) removes the
 * row, so un-deciding is possible and does not leave a dangling entry.
 */
export async function upsertReview({ entryId, status, note }) {
  if (typeof entryId !== "string" || entryId.length === 0) {
    throw new Error("entryId is required");
  }
  if (status != null && !VALID_STATUS.has(status)) {
    throw new Error(`status must be one of ${[...VALID_STATUS].join(", ")}`);
  }
  const list = await readReview();
  const next = list.filter((e) => e.entryId !== entryId);
  const cleared = status == null || status === "cleared";
  if (!cleared || (typeof note === "string" && note.length > 0)) {
    next.push({
      entryId,
      status: cleared ? null : status,
      note: typeof note === "string" ? note : "",
      ts: new Date().toISOString(),
    });
  }
  next.sort((a, b) => a.entryId.localeCompare(b.entryId));
  await fs.writeFile(REVIEW_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}
