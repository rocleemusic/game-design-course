/**
 * Recent run folders — a most-recent-first list in localStorage, so the header
 * can offer the folders you actually use and the app can reopen the last one
 * on startup.
 *
 * The list math is a pure function (`withFolder`); only the two thin wrappers
 * touch storage, and they swallow failures the way `panes.ts` does — a desk
 * tool in private mode still works, it just forgets.
 */

const STORAGE_KEY = "lantern-folders-v1";

/** how many folders the dropdown remembers */
export const RECENT_LIMIT = 8;

/**
 * `dir` moves to the front; blanks are ignored, duplicates collapse, and the
 * tail past RECENT_LIMIT drops off. Pure — no storage, no trimming surprises
 * beyond leading/trailing whitespace.
 */
export function withFolder(list: readonly string[], dir: string): string[] {
  const next = dir.trim();
  if (!next) return [...list];
  return [next, ...list.filter((d) => d !== next)].slice(0, RECENT_LIMIT);
}

/** Stored folders, garbage-tolerant: only non-empty strings survive. */
export function readRecentFolders(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d): d is string => typeof d === "string" && d.trim() !== "")
      .slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

/** Record a successful load. Returns the new list even if storage refused it. */
export function rememberFolder(dir: string): string[] {
  const next = withFolder(readRecentFolders(), dir);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — the in-session list is still correct
  }
  return next;
}

/** The folder to open on startup, or null for the built-in default. */
export function lastFolder(): string | null {
  return readRecentFolders()[0] ?? null;
}
