/**
 * Seeded PRNG — the whole reason a finding is reproducible.
 *
 * mulberry32. Small, fast, and good enough for choosing between eight actions.
 * The point is not statistical quality, it is that `--seed 1234` replays the
 * exact same run, so a finding's `repro.seed` + `repro.step` is a real repro
 * and not a story about one.
 *
 * Every probe takes the rng from the context and never calls `Math.random`.
 * `lib/invariants.mjs`'s INV-ADV-DETERMINISM has no way to catch a probe that
 * cheats, so this is a convention held by review, not by code.
 */

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** float in [0,1) */
    next,
    /** integer in [0,n) */
    int: (n) => Math.floor(next() * n),
    /** uniform pick, or undefined for an empty list */
    pick: (arr) => (arr.length === 0 ? undefined : arr[Math.floor(next() * arr.length)]),
    /** true with probability p */
    chance: (p) => next() < p,
    /**
     * Weighted pick over `[{weight}]`. Entries with weight <= 0 never come up.
     * Returns undefined when everything is filtered out, which the loop reads
     * as "no probe can fire from this state" rather than as an error.
     */
    weighted: (arr) => {
      const live = arr.filter((e) => (e.weight ?? 1) > 0);
      if (live.length === 0) return undefined;
      const total = live.reduce((s, e) => s + (e.weight ?? 1), 0);
      let roll = next() * total;
      for (const e of live) {
        roll -= e.weight ?? 1;
        if (roll <= 0) return e;
      }
      return live[live.length - 1];
    },
    /** Fisher-Yates, in place, so a probe can walk options in a random order. */
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}
