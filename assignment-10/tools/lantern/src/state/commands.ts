/**
 * Undo/redo for Lantern's document state.
 *
 * Why commands and not a snapshot stack: every mutation here is an HTTP write
 * to an append-only file, so `past.pop()` on client state would leave the disk
 * disagreeing with the screen. Each command therefore carries a real FORWARD
 * inverse — undoing an approval issues a write that sets the previous status,
 * and undoing an edit appends the reversed patch. Both `store.ts` and
 * `resolver/src/edits.ts` replay patches in timestamp order with later-wins, so
 * the reversed patch simply becomes the newest truth. No tombstones, and no
 * change to either file format.
 *
 * WHAT UNDO COVERS — document state only (ruled, Roc 2026-07-30): approvals,
 * edits, and the run payload. It must NOT capture view state: each pane's view
 * and per-view settings, right-pane visibility, collapsed groups, splitter
 * sizes, or the per-pane level layout. Nobody undoes "I switched to Tree".
 * That boundary holds here by construction, because a Command is only ever
 * built around a write, and view state never goes through one.
 *
 * The history lives in a ref rather than state because commands hold async
 * closures: those are not serializable, and under StrictMode a state-held
 * command would be invoked twice.
 */

export interface Command {
  /** shown on the undo/redo control, e.g. "approve T2" */
  label: string;
  do: () => Promise<void>;
  undo: () => Promise<void>;
}

export interface CommandHistory {
  /** run a command for the first time and record it; clears the redo branch */
  run: (cmd: Command) => Promise<void>;
  /** step back one command; resolves to the command undone, or null */
  undo: () => Promise<Command | null>;
  /** replay the last undone command; resolves to it, or null */
  redo: () => Promise<Command | null>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** labels for the controls — null when that direction is empty */
  labels: () => { undo: string | null; redo: string | null };
  /** drop all history — used when the run folder changes */
  clear: () => void;
  /** bumps on every change, so a view can re-render off it */
  version: () => number;
}

/** Default cap. Deep enough for a review session, bounded so closures don't pile up. */
export const HISTORY_LIMIT = 50;

export function createHistory(limit: number = HISTORY_LIMIT): CommandHistory {
  let past: Command[] = [];
  let future: Command[] = [];
  let version = 0;

  return {
    async run(cmd) {
      // A command that throws is not recorded — the write did not land, so
      // there is nothing to undo, and recording it would offer a phantom step.
      await cmd.do();
      past.push(cmd);
      if (past.length > limit) past = past.slice(past.length - limit);
      future = [];
      version++;
    },

    async undo() {
      const cmd = past[past.length - 1];
      if (!cmd) return null;
      // Only move it once the inverse write actually lands; a failed undo
      // leaves the stack exactly where it was so the user can retry.
      await cmd.undo();
      past.pop();
      future.push(cmd);
      version++;
      return cmd;
    },

    async redo() {
      const cmd = future[future.length - 1];
      if (!cmd) return null;
      await cmd.do();
      future.pop();
      past.push(cmd);
      version++;
      return cmd;
    },

    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    labels: () => ({
      undo: past.length ? past[past.length - 1].label : null,
      redo: future.length ? future[future.length - 1].label : null,
    }),
    clear() {
      past = [];
      future = [];
      version++;
    },
    version: () => version,
  };
}

// ---------- command builders ----------
//
// These take the two primitive writes and pair each with its inverse. They are
// pure factories: no React, no fetch, so the whole undo contract is testable
// without a DOM.

import type { ReviewStatus } from "../types";

/** The reviewed state of one artifact — what an approval command restores. */
export interface StatusSnapshot {
  status: ReviewStatus | "pending";
  note?: string;
}

/** Writes a status (and optional note); "pending" clears the record. */
export type SetStatus = (
  id: string,
  status: ReviewStatus | "pending",
  note?: string
) => Promise<void>;

/** Appends one edit patch. */
export type ApplyEdit = (
  target: string,
  oldText: string,
  newText: string
) => Promise<void>;

/**
 * Change one artifact's review status, restoring exactly what was there before.
 *
 * `before` must be captured by the caller BEFORE the command runs — reading it
 * inside `do()` would capture the post-write value on a redo and make the
 * inverse a no-op.
 */
export function statusCommand(
  setStatus: SetStatus,
  id: string,
  next: StatusSnapshot,
  before: StatusSnapshot,
  label: string
): Command {
  return {
    label,
    do: () => setStatus(id, next.status, next.note),
    undo: () => setStatus(id, before.status, before.note),
  };
}

/**
 * Edit one text target. The inverse is the reversed patch, which works because
 * patches replay later-wins.
 *
 * An edit also marks its artifact `edited`, so the command carries that second
 * write and restores the artifact's previous status on undo. Without this,
 * undoing an edit would put the text back but leave the card claiming it had
 * been changed.
 */
export function editCommand(
  applyEdit: ApplyEdit,
  setStatus: SetStatus,
  args: {
    target: string;
    artifactId: string;
    oldText: string;
    newText: string;
    before: StatusSnapshot;
  },
  label: string
): Command {
  const { target, artifactId, oldText, newText, before } = args;
  return {
    label,
    do: async () => {
      await applyEdit(target, oldText, newText);
      await setStatus(artifactId, "edited");
    },
    undo: async () => {
      await applyEdit(target, newText, oldText);
      await setStatus(artifactId, before.status, before.note);
    },
  };
}
