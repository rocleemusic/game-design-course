import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  BASE_TEXT_PX,
  CARD_RADIUS_PX,
  TOKEN_COLORS,
  TOKEN_NAMES,
} from "../styles/tokenValues";

/**
 * In-app token drawer — the token sheet's "Tweak tokens" panel as a proper
 * component (design/tokens.html, approved 2026-07-30; drawer asked for by Roc).
 *
 * Live-edits the same list the sheet exposes: 18 colors + base text size +
 * card corner radius. Writes go to document.documentElement inline style, so
 * they override tokens.css without touching it; persisted to localStorage
 * under the sheet's key; Copy CSS emits a paste-ready :root block; Reset
 * clears both the storage and the inline overrides.
 */

const STORAGE_KEY = "lantern-tokens-v2";

/** saved shape: color names -> hex, plus "font-size" and "r-card" (numbers as strings) */
type Saved = Record<string, string>;

function readSaved(): Saved {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}

function applyToken(key: string, value: string) {
  const root = document.documentElement;
  if (key === "font-size") root.style.setProperty("--text-body", `${value}px`);
  else if (key === "r-card") root.style.setProperty("--r-card", `${value}px`);
  else root.style.setProperty(`--${key}`, value);
}

function clearToken(key: string) {
  const root = document.documentElement;
  if (key === "font-size") root.style.removeProperty("--text-body");
  else if (key === "r-card") root.style.removeProperty("--r-card");
  else root.style.removeProperty(`--${key}`);
}

/** apply everything saved — exported so App can restore on startup */
export function applySavedTokens() {
  Object.entries(readSaved()).forEach(([k, v]) => applyToken(k, v));
}

function buildCss(saved: Saved): string {
  const lines = TOKEN_NAMES.map(
    (n) => `  --${n}: ${saved[n] ?? TOKEN_COLORS[n]};`
  );
  lines.push(`  --r-card: ${saved["r-card"] ?? CARD_RADIUS_PX}px;`);
  lines.push(`  /* base font-size: ${saved["font-size"] ?? BASE_TEXT_PX}px */`);
  return `:root{\n${lines.join("\n")}\n}`;
}

export function SettingsDrawer(props: {
  /**
   * Called whenever a token changes the geometry cards are measured against.
   *
   * Card heights are measured, not guessed (`useNodesInitialized` + `measured`),
   * and the relayout runs once per `sceneId + direction + styleEpoch`. Changing
   * base text size reflows every card, so without this signal the graph keeps
   * the old measurements and the nodes overlap. This closes the loop the old
   * `nodeHeight()` comment admitted it could not.
   */
  onStyleChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Saved>(() => readSaved());
  const [copied, setCopied] = useState(false);

  // restore persisted overrides once on mount
  useEffect(() => {
    applySavedTokens();
  }, []);

  const update = (key: string, value: string) => {
    applyToken(key, value);
    setSaved((prev) => {
      const next = { ...prev, [key]: value };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    // Colour changes cannot move a card, but size ones can. Signalling on every
    // token is cheaper than deciding which are geometric, and a relayout is
    // idempotent.
    props.onStyleChange?.();
  };

  const reset = () => {
    Object.keys(saved).forEach(clearToken);
    window.localStorage.removeItem(STORAGE_KEY);
    setSaved({});
    props.onStyleChange?.();
  };

  const copyCss = async () => {
    const css = buildCss(saved);
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (permissions / non-secure context) — show the
      // block so the values are still recoverable by hand
      window.prompt("Copy the token CSS:", css);
    }
  };

  return (
    <>
      <button
        className="pill-quiet settings-btn"
        aria-expanded={open}
        aria-controls="settings-drawer"
        onClick={() => setOpen((o) => !o)}
      >
        <Settings2 aria-hidden="true" /> Tokens
      </button>

      {open && (
        <div
          id="settings-drawer"
          className="settings-drawer"
          role="dialog"
          aria-label="design token settings"
        >
          <h2>Tweakable tokens</h2>
          <p className="settings-note">
            Live in this app, saved in your browser. Copy CSS to hand the
            values back.
          </p>

          {TOKEN_NAMES.map((name) => (
            <label key={name} className="settings-row">
              <span className="token-name">--{name}</span>
              <input
                type="color"
                value={saved[name] ?? TOKEN_COLORS[name]}
                aria-label={`token ${name}`}
                onChange={(e) => update(name, e.target.value)}
              />
            </label>
          ))}

          <label className="settings-row">
            Base text size
            <input
              type="range"
              min={14}
              max={19}
              step={0.5}
              value={Number(saved["font-size"] ?? BASE_TEXT_PX)}
              aria-label="base text size"
              onChange={(e) => update("font-size", e.target.value)}
            />
          </label>
          <label className="settings-row">
            Card corner radius
            <input
              type="range"
              min={4}
              max={20}
              step={1}
              value={Number(saved["r-card"] ?? CARD_RADIUS_PX)}
              aria-label="card corner radius"
              onChange={(e) => update("r-card", e.target.value)}
            />
          </label>

          <div className="settings-actions">
            <button className="pill-ghost" onClick={() => void copyCss()}>
              {copied ? "Copied" : "Copy CSS"}
            </button>
            <button className="pill-quiet" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
}
