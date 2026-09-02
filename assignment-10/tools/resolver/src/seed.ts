// Determinism rule (permutation-design_draft.md, RULED): the day's seed is
// SHA-256 of "slot|life|day". Reloading a day re-rolls nothing.

import { createHash } from "node:crypto";

export function daySeed(slot: number, life: number, day: number): string {
  return createHash("sha256").update(`${slot}|${life}|${day}`).digest("hex");
}

export type Rng = () => number;

/** sfc32 PRNG seeded from the first 16 bytes of the SHA-256 hex. Deterministic. */
export function prngFromSeed(seedHex: string): Rng {
  let a = parseInt(seedHex.slice(0, 8), 16) >>> 0;
  let b = parseInt(seedHex.slice(8, 16), 16) >>> 0;
  let c = parseInt(seedHex.slice(16, 24), 16) >>> 0;
  let d = parseInt(seedHex.slice(24, 32), 16) >>> 0;
  return function sfc32(): number {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const out = (t + d) | 0;
    c = (c + out) | 0;
    return (out >>> 0) / 4294967296;
  };
}

/**
 * Weighted pick over [value, weight] pairs. Deterministic given the rng.
 * Returns undefined when total weight is zero or the pool is empty.
 */
export function weightedPick<T>(rng: Rng, pool: [T, number][]): T | undefined {
  const total = pool.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) return undefined;
  let roll = rng() * total;
  for (const [value, w] of pool) {
    if (w <= 0) continue;
    roll -= w;
    if (roll < 0) return value;
  }
  return pool[pool.length - 1][0];
}

/** Seeded sample of n distinct entries, preserving determinism (order by draw). */
export function sample<T>(rng: Rng, pool: T[], n: number): T[] {
  const src = [...pool];
  const out: T[] = [];
  while (out.length < n && src.length > 0) {
    const i = Math.floor(rng() * src.length);
    out.push(src.splice(i, 1)[0]);
  }
  return out;
}
