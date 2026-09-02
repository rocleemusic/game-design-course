/**
 * Shell contrast (L6) — the surfaces the depth restyle INVENTED.
 *
 * test/contrast.test.ts pins the palette: it parses `--name: #rrggbb` out of
 * tokens.css and checks the token-on-token pairings. It cannot see this file's
 * subject, because the chrome the restyle added is not a token — it is a
 * `color-mix()` blend written in app.css (a sunken trough, a gold-washed chip,
 * a letterspaced section band). Those blends are where a depth pass quietly
 * breaks the floor: the palette test stays green while the shipped background
 * is something no token names.
 *
 * So this test resolves each blend in sRGB, exactly as the browser does for two
 * OPAQUE colours, and measures the text that actually sits on it. Everything
 * here is opaque on both sides — that is the point. A translucent fill would
 * make the real background depend on whatever is beneath, and neither this test
 * nor contrast.test.ts could see it (sign-off #6).
 *
 * Anything below 4.5:1 is not a styling preference. It is a shipped defect.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(here, "../src/styles/tokens.css"), "utf-8");
const appCss = readFileSync(join(here, "../src/styles/app.css"), "utf-8");

/**
 * Every `--name: #rrggbb` literal in tokens.css, PLUS the plain aliases
 * (`--border-strong: var(--muted)`) resolved through to their hex. The legacy
 * names the components consume are almost all aliases, so a test that skipped
 * them would silently read `undefined` and pass nothing meaningful.
 */
function parseHexTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  const aliases: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)\s*;/g)) {
    aliases[m[1]] = m[2];
  }
  // a handful of passes is plenty for a two-deep alias chain
  for (let pass = 0; pass < 5; pass++) {
    for (const [name, target] of Object.entries(aliases)) {
      if (out[name] === undefined && out[target] !== undefined) out[name] = out[target];
    }
  }
  return out;
}
const T = parseHexTokens(tokensCss);

const channels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const toHex = (c: number[]): string =>
  "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * `color-mix(in srgb, <a> P%, <b>)` for two opaque colours: a straight
 * per-channel lerp in sRGB. Alpha premultiplication never enters, because
 * neither side has alpha — which is exactly why the rule is opaque-only.
 */
function mix(a: string, pct: number, b: string): string {
  const [ar, ag, ab] = channels(T[a]);
  const [br, bg, bb] = channels(T[b]);
  const f = pct / 100;
  return toHex([ar * f + br * (1 - f), ag * f + bg * (1 - f), ab * f + bb * (1 - f)]);
}

function luminance(hex: string): number {
  const chan = channels(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** [what it is, foreground token, background (token name or resolved hex)] */
type Pairing = [use: string, fg: string, bg: string];

const TEXT_ON_BLENDED_CHROME: Pairing[] = [
  // the sunken troughs. Each is deliberately shallow: --muted is the label
  // colour on all of them, and it has only ~0.3 of headroom to give.
  ["seg-btn inactive label, on the segmented trough", "muted", mix("cream-edge", 32, "cream")],
  ["rail section label (ARCS/HEALTH), on its band", "muted", mix("cream-edge", 26, "cream")],
  ["health footing labels", "muted", mix("cream-edge", 22, "cream")],
  ["timeline trough", "muted", mix("cream-edge", 24, "cream")],
  ["satchel + unused-asset troughs", "muted", mix("cream-edge", 24, "cream")],

  // gold/blossom washes. These replaced `color-mix(..., transparent)` fills,
  // whose real background was whatever card happened to be underneath.
  ["gate chip label", "ink", mix("gold", 28, "paper")],
  ["active marker chip label", "ink", mix("gold", 30, "paper")],
  ["current asset chip label", "ink", mix("gold", 26, "paper")],
  ["week thread chip label", "ink", mix("blossom", 14, "cream")],
  ["scene-count badge", "ink", mix("blossom", 16, "cream")],
  ["locked level row", "ink", mix("amber", 8, "cream")],
  ["locked level row, quiet cell", "muted", mix("amber", 8, "cream")],

  // the amber seal on the active view tab, sampled at BOTH gradient stops
  ["active view tab label, gradient head", "night", "gold"],
  ["active view tab label, gradient foot", "night", "amber"],

  // the amber family as WORDS is --gold-ink, never --amber (2.3:1 on cream).
  ["gold-ink labels on cream chrome", "gold-ink", "cream"],
  ["gold-ink labels on paper chips", "gold-ink", "paper"],

  // empty-state hint, now surface-aware
  ["empty hint in the cream navigator", "muted", "cream"],
  ["empty hint on the night canvas", "milk-soft", "night"],
];

/** 1.4.11 — component boundaries and focus rings need 3:1, not 4.5:1 */
const NON_TEXT: Pairing[] = [
  ["field boundary against the panel it is cut into", "border-strong", "cream"],
  ["field boundary against a paper card", "border-strong", "paper"],
  ["focus ring on the paper side", "teal", "cream"],
  ["focus ring on the night canvas", "gold", "night"],
  ["selected-row band", "teal", "paper"],
  // The splitter grip is the only thing that says "this seam is draggable", so
  // it is a UI component and owes 3:1 against the gutter it sits in. It used to
  // be --border-strong at 0.55 opacity (well under), and hover recoloured the
  // gutter --amber, which is 1.9:1 against it — the affordance was decorative.
  ["splitter grip against its gutter", "teal", "border"],
  ["splitter grip against the plates either side", "teal", "cream"],
  ["hovered splitter gutter against the plates", "teal", "cream"],
  ["hovered splitter grip against the hovered gutter", "gold", "teal"],
];

describe("shell contrast (L6 depth restyle)", () => {
  it.each(TEXT_ON_BLENDED_CHROME)("%s holds at 4.5:1", (_use, fg, bg) => {
    const bgHex = bg.startsWith("#") ? bg : T[bg];
    expect(bgHex, `background for "${_use}" did not resolve`).toMatch(/^#[0-9a-f]{6}$/);
    const r = ratio(T[fg], bgHex);
    expect(r, `--${fg} on ${bgHex} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT)("%s holds at 3:1", (_use, fg, bg) => {
    const bgHex = bg.startsWith("#") ? bg : T[bg];
    const r = ratio(T[fg], bgHex);
    expect(r, `--${fg} on ${bgHex} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  /**
   * The rule that makes both contrast tests trustworthy. If a surface fill goes
   * translucent, the real background becomes a blend of whatever is beneath —
   * on the night canvas that is a huge swing — and the hex-parsing tests keep
   * passing regardless. So no `color-mix(..., transparent)` may be spelled out
   * inside a `background`. Borders, shadows and rings may: they carry no text.
   *
   * KNOWN LIMIT, stated rather than hidden: this reads literal declarations, so
   * it does not follow `background: var(--gold-wash)` or `var(--teal-tint)`
   * through tokens.css to the mix inside. Those remaining translucent fills are
   * the button hover washes and the card medallions. Widening the check means
   * changing the card files, which belong to another pass.
   */
  it("no background in app.css spells out a mix toward transparent", () => {
    const offenders: string[] = [];
    for (const m of appCss.matchAll(/background(?:-color)?:\s*([^;}]+)/g)) {
      const value = m[1].trim().replace(/\s+/g, " ");
      // NB: not [^)]* — `var(--amber)` closes a paren before `transparent` does
      if (!/color-mix\(.*transparent/.test(value)) continue;
      const line = appCss.slice(0, m.index).split("\n").length;
      offenders.push(`line ${line}: ${value}`);
    }
    // The one sanctioned exception: .marker-preview, the drag rectangle, which
    // must show the photograph it is measuring. It carries no text.
    const SANCTIONED = "color-mix(in srgb, var(--amber) 18%, transparent)";
    const unexplained = offenders.filter((o) => !o.includes(SANCTIONED));
    expect(unexplained, `translucent fill(s):\n${unexplained.join("\n")}`).toHaveLength(0);
  });

  /**
   * The elevation block is shadows and edges. None of it is a fill, and none of
   * it may smuggle in a colour — the palette is frozen, so every value in there
   * has to route through an existing token (or be a plain shadow alpha).
   */
  it("the elevation block introduces no colour literal", () => {
    const start = tokensCss.indexOf("--sh-1:");
    const end = tokensCss.indexOf("--well-night:");
    expect(start, "--sh-1 missing from tokens.css").toBeGreaterThan(-1);
    expect(end, "--well-night missing from tokens.css").toBeGreaterThan(start);
    const block = tokensCss.slice(start, tokensCss.indexOf(";", end) + 1);
    const hexes = [...block.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hexes, `elevation block introduced ${hexes.join(", ")}`).toHaveLength(0);
    // rgba() is allowed for shadow depth ONLY, and only as neutral black:
    // a night-tinted shadow is invisible on the night canvas.
    for (const m of block.matchAll(/rgba?\(([^)]*)\)/g)) {
      expect(m[1].replace(/\s/g, ""), `non-black shadow alpha: ${m[0]}`).toMatch(
        /^0,0,0,0?\.\d+$/
      );
    }
  });
});
