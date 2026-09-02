/**
 * Blueprint card surfaces (L5b) — the contrast the existing test cannot see.
 *
 * test/contrast.test.ts parses `--name: #rrggbb` literals out of tokens.css. It
 * is the accessibility ruling and is not edited to pass. But the blueprint
 * card's surfaces are DERIVED — `color-mix(in srgb, …)` of two primitives — so
 * that test cannot check them, and this is exactly the gap the sign-off warned
 * about: a card whose real background is a computed blend can drop under the
 * 4.5:1 floor while the hex-parsing suite stays green.
 *
 * So this file resolves the mixes itself, from the same tokens.css, and pins:
 *
 *   1. Every surface is OPAQUE. No stop is `transparent`, so no card fill is a
 *      blend with the night canvas behind it.
 *   2. Text on each surface clears 4.5:1.
 *   3. The Blueprint read holds: the BODY is darker than the HEAD, for every
 *      kind alias — including --teal and --forest, the darkest ones, where a
 *      heavier kind wash would flip it. This only applies to the REVIEWED
 *      wash head (approved/edited/flagged) — see 4.
 *   4. RULED 2026-08-01: the head is only ever solid-filled while PENDING —
 *      the fill IS the "needs review" signal, and reviewed cards render the
 *      ordinary wash from point 3 instead. Pending is therefore the one state
 *      allowed to break the head-lighter-than-body rule on purpose; what this
 *      file checks for it instead is that each kind's pending fill + text
 *      pairing clears 4.5:1, same floor as everywhere else. Two kinds' fills
 *      (line/--dusk-deep, screen/--forest) are the same family as a status
 *      dot colour — safe only because fill and status colour can never
 *      appear on one card at once; every other kind is checked against that
 *      NOT holding by accident.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "../src/styles/tokens.css"), "utf-8");
const blueprintCss = readFileSync(join(here, "../src/styles/blueprint.css"), "utf-8");
/** declarations only — a comment may name rgba() while explaining why not to */
const blueprintRules = blueprintCss.replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];

function hexTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

const tokens = hexTokens(css);

function rgb(name: string): Rgb {
  const hex = tokens[name];
  if (!hex) throw new Error(`--${name} is not an opaque hex token in tokens.css`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** color-mix(in srgb, a pct%, b) — gamma-encoded sRGB, matching the browser. */
function mix(a: Rgb, pct: number, b: Rgb): Rgb {
  const t = pct / 100;
  return [0, 1, 2].map((i) => a[i] * t + b[i] * (1 - t)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(fg: Rgb, bg: Rgb): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** the value side of a custom property in tokens.css, comments stripped */
function decl(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} is not declared in tokens.css`);
  return m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

/** the kind aliases, and what each resolves to */
const KINDS: [alias: string, primitive: string][] = [
  ["node-line", "dusk"],
  ["node-choice", "amber"],
  ["node-option", "teal"],
  ["node-gather", "muted"],
  ["node-scene", "blossom"],
  ["node-screen", "forest"],
];

const WASH = Number(decl("node-wash").replace("%", ""));

/** the head under a given kind: kind colour washed INTO --node-head */
const headFor = (primitive: string) => mix(rgb(primitive), WASH, rgb("paper"));

const BODY = rgb("cream-edge"); // --node-body
const FOOT = rgb("cream"); // --node-foot
const HEAD_BASE = rgb("paper"); // --node-head

/** the --node-wash percentage a kind class actually ships, off blueprint.css
 *  itself — not the conservative single-token floor above. */
function realWash(kindClass: string): number {
  const re = new RegExp(`\\.bp-node\\.${kindClass}\\s*\\{[^}]*--node-wash:\\s*([\\d.]+)%`);
  const m = blueprintRules.match(re);
  if (!m) throw new Error(`--node-wash override not found for .bp-node.${kindClass}`);
  return Number(m[1]);
}

/** "node-line" -> "kind-line", matching BlueprintNode.tsx's `kind-${kind}` class */
const kindClassFor = (alias: string) => alias.replace("node-", "kind-");

/** a kind class's --bp-pending-fill / --bp-pending-text, as the token name it
 *  resolves to (e.g. "dusk-deep") — RULED 2026-08-01: the head is only ever
 *  solid-filled while PENDING; reviewed cards keep the wash from the describe
 *  blocks above, unchanged. */
function pendingVar(kindClass: string, prop: "fill" | "text"): string {
  const re = new RegExp(
    `\\.bp-node\\.${kindClass}\\s*\\{[^}]*--bp-pending-${prop}:\\s*var\\(--([\\w-]+)\\)`
  );
  const m = blueprintRules.match(re);
  if (!m) throw new Error(`--bp-pending-${prop} not found for .bp-node.${kindClass}`);
  return m[1];
}

describe("blueprint cards: the palette stays frozen", () => {
  it("every kind colour is an ALIAS onto an approved primitive, not a new value", () => {
    for (const [alias, primitive] of KINDS) {
      expect(decl(alias)).toBe(`var(--${primitive})`);
    }
  });

  it("defines no new hex colour of its own", () => {
    // Anything the blueprint block introduced would show up as a hex literal
    // inside it. The approved primitives are all declared above it.
    const block = css.slice(css.indexOf("blueprint node cards"));
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    // and the stylesheet may not smuggle one in either
    expect(blueprintRules).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe("blueprint cards stay OPAQUE (sign-off 6)", () => {
  // The trap: a translucent card over --night makes the real background a
  // blend, so contrast.test.ts keeps passing on the nominal hex while shipped
  // contrast falls under the floor.
  it("no card surface token mixes with `transparent`", () => {
    for (const name of ["node-head", "node-body", "node-foot", "node-seam"]) {
      expect(decl(name)).not.toMatch(/transparent/);
    }
  });

  it("the stylesheet sets no alpha or opacity on a card surface", () => {
    // rgba()/hsla() and bare opacity are how translucency creeps back in. The
    // shadow ladder in tokens.css is the sanctioned exception, and it is not
    // in this file.
    expect(blueprintRules).not.toMatch(/\brgba\(|\bhsla\(/);
    for (const m of blueprintRules.matchAll(/^\s*opacity:\s*([\d.]+)/gm)) {
      expect(Number(m[1]), "opacity on a blueprint surface").toBe(1);
    }
  });
});

describe("blueprint cards: the Blueprint read", () => {
  it.each(KINDS)("body is darker than the head for %s", (_alias, primitive) => {
    const head = luminance(headFor(primitive));
    const body = luminance(BODY);
    expect(body, `${primitive} head ${head} vs body ${body}`).toBeLessThan(head);
  });

  it("the step is big enough to SEE, not just to assert", () => {
    // The darkest wash is the tightest case. Anything under ~1.1:1 reads as one
    // flat card and the whole header/body organisation is lost.
    for (const [, primitive] of KINDS) {
      const r = ratio(headFor(primitive), BODY);
      expect(r, `--${primitive} head vs body = ${r.toFixed(3)}:1`).toBeGreaterThan(1.1);
    }
  });
});

describe("blueprint cards: the SHIPPED per-kind wash, not just the conservative floor", () => {
  // Each kind alias overrides --node-wash locally, past the single-token
  // floor the two describe blocks above check (blueprint.css's own comment:
  // "checked by hand against tokens.css's own hex values"). This closes that
  // gap — the real numbers a browser actually renders, pinned the same way,
  // so raising one past its safe ceiling fails here instead of needing
  // another by-hand check.
  it.each(KINDS)("%s's shipped wash keeps the head lighter than the body", (alias, primitive) => {
    const kindClass = kindClassFor(alias);
    const head = mix(rgb(primitive), realWash(kindClass), rgb("paper"));
    expect(luminance(BODY), `${kindClass} @ ${realWash(kindClass)}%`).toBeLessThan(luminance(head));
  });

  it.each(KINDS)("%s's shipped wash keeps the head/body step visible (>1.1:1)", (alias, primitive) => {
    const kindClass = kindClassFor(alias);
    const head = mix(rgb(primitive), realWash(kindClass), rgb("paper"));
    const r = ratio(head, BODY);
    expect(r, `${kindClass} @ ${realWash(kindClass)}% head vs body = ${r.toFixed(3)}:1`).toBeGreaterThan(1.1);
  });

  it.each(KINDS)("%s's shipped wash keeps --muted on the head at 4.5:1", (alias, primitive) => {
    const kindClass = kindClassFor(alias);
    const head = mix(rgb(primitive), realWash(kindClass), rgb("paper"));
    const r = ratio(rgb("muted"), head);
    expect(
      r,
      `--muted on ${kindClass} @ ${realWash(kindClass)}% = ${r.toFixed(3)}:1`
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("blueprint cards: the PENDING solid fill — the one state allowed to be heaviest", () => {
  it.each(KINDS)("%s's pending fill + text clear 4.5:1", (alias) => {
    const kindClass = kindClassFor(alias);
    const fillToken = pendingVar(kindClass, "fill");
    const textToken = pendingVar(kindClass, "text");
    const r = ratio(rgb(textToken), rgb(fillToken));
    expect(
      r,
      `${kindClass} pending: --${textToken} on --${fillToken} = ${r.toFixed(3)}:1`
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("kind-line's pending fill reuses --dusk-deep, the 'edited' status colour — by design", () => {
    // Safe only because fill and status colour can never coexist: reviewed
    // cards never show the pending fill (see describe block above), so a
    // dusk pending fill and a dusk edited-status dot never appear together.
    expect(pendingVar("kind-line", "fill")).toBe("dusk-deep");
  });

  it("kind-screen's pending fill reuses --forest, the 'approved' status colour — same reasoning", () => {
    // forest already clears 4.5:1 on its own (no -deep needed, unlike dusk),
    // which is exactly why it was picked as Screen's fill — but it's still
    // the same family as the approved dot's --forest/--forest-deep, so it
    // gets the same by-design exemption as kind-line above.
    expect(pendingVar("kind-screen", "fill")).toBe("forest");
  });

  it("no OTHER kind's pending fill reuses a status colour (forest/forest-deep, dusk/dusk-deep, clay)", () => {
    const statusColours = new Set(["forest", "forest-deep", "dusk", "dusk-deep", "clay"]);
    const exempt = new Set(["kind-line", "kind-screen"]); // the two deliberate, documented cases above
    for (const [alias] of KINDS) {
      const kindClass = kindClassFor(alias);
      if (exempt.has(kindClass)) continue;
      const fillToken = pendingVar(kindClass, "fill");
      expect(statusColours.has(fillToken), `${kindClass}'s pending fill is --${fillToken}`).toBe(
        false
      );
    }
  });
});

describe("blueprint cards: text clears the 4.5:1 floor", () => {
  it("--ink on the body (the snippet's surface)", () => {
    expect(ratio(rgb("ink"), BODY)).toBeGreaterThanOrEqual(4.5);
  });

  it("--muted micro-labels on the head, under every kind wash", () => {
    for (const [, primitive] of KINDS) {
      const r = ratio(rgb("muted"), headFor(primitive));
      expect(r, `--muted on ${primitive} head = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it("--ink and --muted on the foot (chips, the review note)", () => {
    expect(ratio(rgb("ink"), FOOT)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(rgb("muted"), FOOT)).toBeGreaterThanOrEqual(4.5);
  });

  it("the pin labels' status colours hold on the foot", () => {
    for (const name of ["forest-deep", "dusk-deep", "clay", "ink"]) {
      const r = ratio(rgb(name), FOOT);
      expect(r, `--${name} on the foot = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("--ink on the plain head, for a kind with no wash applied", () => {
    expect(ratio(rgb("ink"), HEAD_BASE)).toBeGreaterThanOrEqual(4.5);
  });
});
