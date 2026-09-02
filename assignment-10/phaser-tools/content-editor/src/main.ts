/**
 * Content Approval Editor — entry point.
 *
 * A standalone review surface for the game's under-authored content. It runs
 * with the game stopped and imports NO game scene: it fetches the assembled
 * payload from the dev server's `/api/content` (which reuses the shipped audit),
 * renders four tabs of rows, and records Approve / Reject / notes into a sidecar
 * (`review.json`) that the content JSON never sees.
 *
 * The one live piece is the VFX preview: each spell row plays the real cue from
 * `cues.json` in a shared Phaser canvas — see `preview.ts`.
 */
import "./styles.css";
import type {
  ContentPayload,
  Finding,
  ItemRow,
  ReceiverRow,
  ScreenRow,
  SpellRow,
} from "./types";
import { ReviewState } from "./review";
import { mountPreview, type VfxPreview } from "./preview";

const review = new ReviewState();
let preview: VfxPreview | null = null;

/* ------------------------------------------------------------ tiny DOM helpers */

type Child = Node | string | null | undefined;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function findingList(findings: Finding[]): HTMLElement | null {
  if (findings.length === 0) return null;
  return el(
    "ul",
    { class: "findings" },
    ...findings.map((f) => el("li", {}, el("code", {}, f.rule), " — " + f.detail)),
  );
}

/* ----------------------------------------------------------------- the tabs */

interface Tab {
  id: string;
  label: string;
  render(payload: ContentPayload): HTMLElement;
}

function reviewCell(entryId: string): HTMLElement {
  const td = el("td", { class: "review-cell" });
  const rerender = () => {
    // Restyle the row from the decision.
    const tr = td.closest("tr");
    if (tr) tr.dataset.status = review.get(entryId)?.status ?? "undecided";
  };
  td.append(review.controls(entryId, rerender));
  rerender();
  return td;
}

const spellsTab: Tab = {
  id: "spells",
  label: "Spells",
  render(payload) {
    const rows = payload.spells.map((s: SpellRow) => {
      const comps = s.components.map((c) => c.label ?? c.id).join(", ") || "—";
      const teacher = el(
        "div",
        { class: s.teacher.matched ? "teacher ok" : "teacher flag" },
        s.teacher.matched ? "teacher: " + s.teacher.reason : "NO TEACHER — " + s.teacher.reason,
      );
      const learn = el("div", { class: "learn" }, s.learn_source || "—");

      const playBtn = (outcome: "effect" | "no-effect", has: boolean) => {
        const b = el("button", { class: "btn play" }, outcome);
        if (!has) {
          b.classList.add("play-missing");
          b.title = "no cue row authored for this outcome — plays the neutral fallback";
        }
        b.addEventListener("click", () => preview?.play(s.spell_id, outcome));
        return b;
      };
      const vfx = el(
        "div",
        { class: "vfx" },
        playBtn("effect", s.cue.effect),
        playBtn("no-effect", s.cue.noEffect),
      );

      const tr = el(
        "tr",
        {},
        el("td", {}, el("strong", {}, s.phrase), el("div", { class: "sub" }, s.spell_id + " · " + s.role)),
        el("td", {}, comps, s.produces.length ? el("div", { class: "sub" }, "produces: " + s.produces.join(", ")) : null),
        el("td", {}, learn, teacher, findingList(s.findings)),
        el("td", { class: "vfx-cell" }, vfx),
        reviewCell(s.entryId),
      );
      return tr;
    });
    return table(["Spell", "Components", "Learn source / teacher", "VFX preview", "Review"], rows);
  },
};

const screensTab: Tab = {
  id: "screens",
  label: "Screen unlocks",
  render(payload) {
    const rows = payload.screens.map((sc: ScreenRow) => {
      const gates = sc.gates.length ? sc.gates.join(", ") : "—";
      const tr = el(
        "tr",
        { "data-reachable": String(sc.reachable) },
        el("td", {}, el("strong", {}, sc.screen_id), el("div", { class: "sub" }, sc.name)),
        el("td", {}, sc.status),
        el("td", {}, gates),
        el(
          "td",
          {},
          sc.reachable
            ? el("span", { class: "ok" }, "reachable")
            : el("span", { class: "flag" }, "UNREACHABLE"),
          el("div", { class: "sub" }, sc.reason),
          sc.strandedScenes.length
            ? el("div", { class: "sub flag" }, "stranded scenes: " + sc.strandedScenes.join(", "))
            : null,
        ),
        reviewCell(sc.entryId),
      );
      if (!sc.reachable) tr.classList.add("row-flag");
      return tr;
    });
    return table(["Screen", "Status", "Gate", "Reachability", "Review"], rows);
  },
};

function itemRowsTable(items: ItemRow[]): HTMLElement {
  const rows = items.map((i) => {
    const flags: string[] = [];
    if (i.kind === "item") {
      if (i.obtainable === false) flags.push("UNOBTAINABLE");
      if (i.used === false) flags.push("unused");
    } else if (i.categorised === false) {
      flags.push("UNCATEGORISED");
    }
    const badge = flags.length
      ? el("span", { class: "flag" }, flags.join(" · "))
      : el("span", { class: "ok" }, "referenced");
    const refs =
      i.kind === "item"
        ? (i.usedBy ?? []).length
          ? "used by: " + (i.usedBy ?? []).join(", ")
          : "used by: nothing"
        : i.role
          ? "role: " + i.role
          : "";
    const tr = el(
      "tr",
      {},
      el("td", {}, el("strong", {}, i.id), el("div", { class: "sub" }, i.description)),
      el("td", {}, i.kind),
      el("td", {}, i.category || "—"),
      el("td", {}, badge, el("div", { class: "sub" }, refs), findingList(i.findings)),
      reviewCell(i.entryId),
    );
    if (flags.some((f) => f === f.toUpperCase() && f.length > 5)) tr.classList.add("row-flag");
    return tr;
  });
  return table(["Record", "Kind", "Category", "Cross-reference", "Review"], rows);
}

const itemsTab: Tab = {
  id: "items",
  label: "Items / Key items",
  render(payload) {
    const wrap = el("div", {});
    wrap.append(
      el("h3", { class: "group" }, `Items (${payload.items.length})`),
      itemRowsTable(payload.items),
      el("h3", { class: "group" }, `Key items (${payload.keyItems.length})`),
      itemRowsTable(payload.keyItems),
    );
    return wrap;
  },
};

const receiversTab: Tab = {
  id: "receivers",
  label: "Receiver interactions",
  render(payload) {
    const forms = Object.entries(payload.noEffectForms)
      .map(([f, n]) => `"${f}" ×${n}`)
      .join("  ·  ");
    const note = el(
      "p",
      { class: "tab-note" },
      `No-effect phrasings in use: ${forms}. Canonical form is ` +
        `"${payload.canonicalNoEffect}"; rows using another form are flagged as a string mismatch.`,
    );
    // Stateful pairs first (the primary subject of this tab), then the rest.
    const ordered = [...payload.receivers].sort(
      (a, b) => Number(b.stateful) - Number(a.stateful) || a.entryId.localeCompare(b.entryId),
    );
    const rows = ordered.map((r: ReceiverRow) => {
      const tags: HTMLElement[] = [];
      if (r.stateful) tags.push(el("span", { class: "tag stateful" }, "stateful"));
      if (r.mismatch) tags.push(el("span", { class: "tag flag" }, `mismatch: "${r.noEffectForm}"`));
      else if (r.noEffect) tags.push(el("span", { class: "tag ok" }, r.noEffectForm ?? "no-effect"));
      const tr = el(
        "tr",
        {},
        el("td", {}, el("strong", {}, r.spell_id), el("div", { class: "sub" }, "→ " + r.receiver_id)),
        el("td", {}, r.receiver_class),
        el("td", {}, r.physical_outcome, r.reaction_kind ? el("div", { class: "sub" }, "reaction: " + r.reaction_kind) : null),
        el("td", {}, ...tags),
        reviewCell(r.entryId),
      );
      if (r.mismatch) tr.classList.add("row-flag");
      if (r.stateful) tr.classList.add("row-stateful");
      return tr;
    });
    const wrap = el("div", {});
    wrap.append(note, table(["Pair", "Class", "Physical outcome", "Flags", "Review"], rows));
    return wrap;
  },
};

function table(headers: string[], rows: HTMLElement[]): HTMLElement {
  const thead = el("thead", {}, el("tr", {}, ...headers.map((h) => el("th", {}, h))));
  const tbody = el("tbody", {}, ...rows);
  return el("table", { class: "grid" }, thead, tbody);
}

const TABS: Tab[] = [spellsTab, screensTab, itemsTab, receiversTab];

/* ------------------------------------------------------------------- bootstrap */

async function boot() {
  const app = document.getElementById("app")!;
  app.textContent = "loading content…";

  let payload: ContentPayload;
  try {
    const [res] = await Promise.all([fetch("/api/content"), review.load()]);
    if (!res.ok) throw new Error(`/api/content → ${res.status}: ${(await res.json()).error ?? ""}`);
    payload = await res.json();
  } catch (err) {
    app.textContent = "";
    app.append(el("pre", { class: "error" }, "Failed to load: " + String(err)));
    return;
  }

  app.textContent = "";

  // Header + source line.
  const s = payload.source;
  // Export the review decisions as a downloadable handoff JSON — the content
  // editor's counterpart to the screen editor's "Export feedback" button. The
  // decisions already live server-side in review.json; this fetches the current
  // set fresh and hands it off with a timestamp.
  const exportBtn = el("button", { class: "btn export" }, "Export review (JSON)");
  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    try {
      const res = await fetch("/api/review");
      const decisions = res.ok ? await res.json() : [];
      const out = { generatedAt: new Date().toISOString(), decisions };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "content-review-feedback.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      exportBtn.disabled = false;
    }
  });

  app.append(
    el(
      "header",
      {},
      el("h1", {}, "Content Approval Editor"),
      el(
        "p",
        { class: "meta" },
        `${s.approvedSpells} approved spells · ${s.rejectedSpells} rejected · run ${s.runDir} ` +
          `(${s.days} days) · audit: ${payload.audit.findings.length} findings, ` +
          `${payload.audit.unchecked.length} unchecked · sidecar review.json`,
      ),
      exportBtn,
    ),
  );

  if (payload.audit.unchecked.length) {
    app.append(
      el(
        "div",
        { class: "unchecked" },
        el("strong", {}, "Unchecked: "),
        payload.audit.unchecked.join(" | "),
      ),
    );
  }

  // The shared VFX preview, docked full-width above the scrolling content —
  // its own pane, not a floating box overlapping rows underneath it.
  // Collapsible, so it can get out of the way when you just want to read the
  // list. State persists across reloads.
  const COLLAPSE_KEY = "content-editor-preview-collapsed";
  const dock = el("aside", { class: "preview-dock" });
  const toggle = el("button", { class: "preview-toggle", title: "collapse / expand" }, "–");
  const head = el("div", { class: "preview-head" }, el("div", { class: "preview-title" }, "VFX preview"), toggle);
  const canvasHost = el("div", { class: "preview-canvas" });
  const hint = el("div", { class: "preview-hint" }, "Click a spell's effect / no-effect button");
  const body = el("div", { class: "preview-body" }, canvasHost, hint);
  dock.append(head, body);
  const setCollapsed = (c: boolean) => {
    dock.classList.toggle("collapsed", c);
    toggle.textContent = c ? "+" : "–";
    localStorage.setItem(COLLAPSE_KEY, c ? "1" : "");
  };
  toggle.addEventListener("click", () => setCollapsed(!dock.classList.contains("collapsed")));
  app.append(dock);
  preview = mountPreview(canvasHost, payload.spells.map((sp) => sp.spell_id));
  setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");

  // Tab bar + panels. `.panel` is the ONLY thing that scrolls — the header and
  // preview above it stay put, which is the whole point of docking the preview.
  const bar = el("nav", { class: "tabs" });
  const panel = el("section", { class: "panel" });
  const buttons = new Map<string, HTMLButtonElement>();
  const show = (tab: Tab) => {
    panel.textContent = "";
    panel.append(tab.render(payload));
    for (const [id, b] of buttons) b.classList.toggle("active", id === tab.id);
  };
  for (const tab of TABS) {
    const b = el("button", { class: "tab" }, tab.label);
    b.addEventListener("click", () => show(tab));
    buttons.set(tab.id, b);
    bar.append(b);
  }
  app.append(bar, panel);
  show(TABS[0]);
}

boot();
