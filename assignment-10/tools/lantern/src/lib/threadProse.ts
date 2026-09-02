import raw from "./threadProse.json";

/**
 * GP-96 (2026-08-10, Roc: "go with option 1") — the id -> prose map for the
 * nine live threads, PARSED AT BUILD from the per-soul thread registries
 * (`cast/[soul]-[role]-threads.md`, GP-92's authoritative home for thread
 * ids) by scripts/gen-thread-prose.mjs. Never hand-maintained: a second
 * hand-typed copy is exactly the drift the registries' id column exists to
 * expose. See test/threadProseFixture.test.ts for the staleness gate.
 *
 * Only RATIFIED rows are in the map. Texture souls (Juno, Pip, Bex) have no
 * registry and contribute no rows — the panel must not expect them to.
 */
const THREAD_PROSE: Record<string, string> = raw;

/**
 * A thread id's open-question prose, or the raw id when the id is not in the
 * map. NEVER hide an unmapped id behind a blank: a thread the runtime fires
 * that no registry authorises (e.g. the retired `giver-receive`, still
 * emitted by v01 content per GP-90) is exactly the drift the id column was
 * added to expose, and it must stay visible.
 */
export function threadProse(id: string): string {
  return THREAD_PROSE[id] ?? id;
}
