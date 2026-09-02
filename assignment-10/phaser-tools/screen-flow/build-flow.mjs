#!/usr/bin/env node
/**
 * build-flow.mjs — emits tools/screen-flow/flow.html, a SELF-CONTAINED review
 * page for the mode5 screen flow.
 *
 * Reads screens.mjs for the order + gates + reference map, and shots/ for any
 * captured PNGs. Every image (captured shot AND reference thumbnail) is inlined
 * as a data: URI, so the finished flow.html is one portable file that opens with
 * a double-click and needs no server.
 *
 * Per screen it renders: the screen name, the gate that reaches it, and a
 * feedback textarea. A screen WITH a captured shot shows the screenshot; a
 * screen WITHOUT one shows a PLACEHOLDER card carrying the image-gen prompt
 * (screen name + reference filenames + art direction) and a thumbnail of the
 * first reference image that exists on disk. prev/next buttons and ←/→ keys
 * page through the screens. Feedback is kept in the browser's localStorage and
 * can be exported as JSON.
 *
 * Runs against zero shots (all placeholders), a partial set, or a full set —
 * whatever is in shots/. That is also the generator's dry run.
 *
 * Usage:
 *   node tools/screen-flow/build-flow.mjs [--out FILE]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SCREENS, REF_DIR, genPrompt } from "./screens.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = path.join(HERE, "shots");

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function parseArgs(argv) {
  const opts = { out: path.join(HERE, "flow.html") };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out") opts.out = path.resolve(argv[++i]);
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("build-flow.mjs [--out FILE] — emits a self-contained flow.html");
      process.exit(0);
    } else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return opts;
}

/** Read a file as a data: URI, or null if it is missing/unreadable. */
function dataUri(file) {
  try {
    const buf = fs.readFileSync(file);
    const mime = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildScreenModel(screen) {
  const shotFile = path.join(SHOT_DIR, `${screen.id}.png`);
  const shot = fs.existsSync(shotFile) ? dataUri(shotFile) : null;

  // First reference that actually exists on disk becomes the visible thumbnail.
  let refThumb = null;
  let refThumbName = null;
  const refList = screen.refs ?? [];
  for (const ref of refList) {
    const uri = dataUri(path.join(REF_DIR, ref));
    if (uri) {
      refThumb = uri;
      refThumbName = ref;
      break;
    }
  }

  return {
    id: screen.id,
    name: screen.name,
    gate: screen.gate,
    hasShot: Boolean(shot),
    shot,
    refs: refList,
    refThumb,
    refThumbName,
    prompt: refList.length || screen.artNote ? genPrompt(screen) : null,
  };
}

function render(models) {
  const captured = models.filter((m) => m.hasShot).length;
  const placeholders = models.length - captured;

  const slides = models
    .map((m, i) => {
      const heroCaptured = m.hasShot
        ? `<div class="hero shot">
             <div class="shotwrap" data-screen="${esc(m.id)}">
               <img alt="${esc(m.name)} — captured screen" src="${m.shot}">
               <div class="pins"></div>
             </div>
             <div class="markers" data-screen="${esc(m.id)}">
               <div class="markers-head">
                 <span class="tag">markers</span>
                 <span class="markers-hint">click the screenshot to drop a numbered pin</span>
               </div>
               <div class="marker-list"></div>
             </div>
           </div>`
        : "";

      const refThumb = m.refThumb
        ? `<figure class="refthumb"><img alt="reference: ${esc(m.refThumbName)}" src="${m.refThumb}">
             <figcaption>reference · ${esc(m.refThumbName)}</figcaption></figure>`
        : m.refs.length
          ? `<div class="refmissing">reference not on disk: ${esc(m.refs[0])}</div>`
          : "";

      const promptBlock = m.prompt
        ? `<div class="prompt">
             <div class="prompt-head">
               <span class="tag">image-gen prompt</span>
               <button class="copy" data-copy="prompt-${i}">copy</button>
             </div>
             <textarea id="prompt-${i}" class="prompt-text" readonly rows="6">${esc(m.prompt)}</textarea>
             <div class="reflist">refs: ${m.refs.map((r) => `<code>${esc(r)}</code>`).join(" ") || "—"}</div>
           </div>`
        : "";

      const heroPlaceholder = m.hasShot
        ? ""
        : `<div class="hero placeholder">
             <div class="placeholder-badge">no captured art — design target</div>
             ${refThumb}
           </div>`;

      // For captured screens that still carry a redesign reference, show the
      // art-direction prompt below the shot as a collapsible aside.
      const asideForCaptured =
        m.hasShot && m.prompt
          ? `<details class="artdir"><summary>target art direction (${m.refs.length} ref${m.refs.length === 1 ? "" : "s"})</summary>
               ${refThumb}
               ${promptBlock}
             </details>`
          : "";

      const placeholderBody = m.hasShot ? "" : promptBlock;

      return `
      <section class="slide" data-index="${i}" ${i === 0 ? "" : 'hidden'}>
        <header class="slide-head">
          <div class="counter">${String(i + 1).padStart(2, "0")} / ${String(models.length).padStart(2, "0")}</div>
          <h2>${esc(m.name)}</h2>
          <div class="badges">
            ${m.hasShot ? '<span class="badge ok">captured</span>' : '<span class="badge todo">placeholder</span>'}
          </div>
        </header>
        <p class="gate"><span class="glabel">gate</span> ${esc(m.gate)}</p>
        ${heroCaptured}${heroPlaceholder}
        ${placeholderBody}
        ${asideForCaptured}
        <div class="feedback">
          <label for="fb-${i}">Feedback — ${esc(m.name)}</label>
          <textarea id="fb-${i}" class="fb" data-screen="${esc(m.id)}" rows="4"
            placeholder="Notes on this screen: what works, what to change, art direction…"></textarea>
        </div>
      </section>`;
    })
    .join("\n");

  const navList = models
    .map(
      (m, i) =>
        `<button class="navchip" data-goto="${i}">${String(i + 1).padStart(2, "0")} ${esc(m.name)}
           <span class="dot ${m.hasShot ? "ok" : "todo"}"></span></button>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mode 5 — Screen Flow Review</title>
<style>
  :root {
    --bg: #14110c; --panel: #1e1a12; --panel2: #262016; --ink: #ece3d2;
    --dim: #a89a80; --line: #3a3122; --ok: #7fb069; --todo: #d9a441; --accent: #c9a15a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
    font: 15px/1.5 ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
  header.top { padding: 16px 24px; border-bottom: 1px solid var(--line);
    display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  header.top h1 { font-size: 18px; margin: 0; letter-spacing: .3px; }
  header.top .meta { color: var(--dim); font-size: 13px; }
  .wrap { display: grid; grid-template-columns: 240px 1fr; min-height: calc(100vh - 58px); }
  nav.rail { border-right: 1px solid var(--line); padding: 12px; overflow-y: auto;
    max-height: calc(100vh - 58px); position: sticky; top: 0; }
  .navchip { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
    background: transparent; color: var(--dim); border: 1px solid transparent;
    padding: 7px 9px; border-radius: 7px; cursor: pointer; font-size: 13px; margin-bottom: 2px; }
  .navchip:hover { background: var(--panel); color: var(--ink); }
  .navchip.active { background: var(--panel2); color: var(--ink); border-color: var(--line); }
  .navchip .dot { width: 8px; height: 8px; border-radius: 50%; margin-left: auto; flex: none; }
  .dot.ok { background: var(--ok); } .dot.todo { background: var(--todo); }
  main { padding: 24px 28px 64px; max-width: 1100px; }
  .slide-head { display: flex; align-items: center; gap: 14px; }
  .slide-head h2 { margin: 0; font-size: 22px; }
  .counter { color: var(--dim); font-variant-numeric: tabular-nums; font-size: 13px; }
  .badges { margin-left: auto; }
  .badge { font-size: 11px; text-transform: uppercase; letter-spacing: .6px;
    padding: 3px 8px; border-radius: 20px; border: 1px solid var(--line); }
  .badge.ok { color: var(--ok); border-color: #3d5a30; }
  .badge.todo { color: var(--todo); border-color: #5a4a20; }
  .gate { color: var(--dim); font-size: 14px; margin: 10px 0 18px; }
  .glabel { display: inline-block; font-size: 11px; text-transform: uppercase;
    letter-spacing: .6px; color: var(--accent); border: 1px solid var(--line);
    border-radius: 4px; padding: 1px 6px; margin-right: 8px; }
  .hero { border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
    background: var(--panel); margin-bottom: 18px; }
  .hero.shot img { display: block; width: 100%; height: auto; }
  .shotwrap { position: relative; cursor: crosshair; }
  .pins { position: absolute; inset: 0; pointer-events: none; }
  .pin { position: absolute; transform: translate(-50%, -50%); min-width: 26px; height: 26px;
    padding: 0 6px; border-radius: 14px; background: var(--accent); color: #1a1208;
    font: 700 13px/26px ui-monospace, monospace; text-align: center; pointer-events: auto;
    cursor: pointer; border: 2px solid #1a1208; box-shadow: 0 1px 4px rgba(0,0,0,.5); }
  .pin.sel { background: var(--ok); }
  .markers { border: 1px solid var(--line); border-top: none; border-radius: 0 0 10px 10px;
    background: var(--panel); padding: 12px 14px; }
  .markers-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .markers-hint { color: var(--dim); font-size: 12px; }
  .marker-list:empty::after { content: "no markers yet"; color: var(--dim); font-size: 13px; font-style: italic; }
  .marker-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
  .marker-num { flex: none; width: 26px; height: 26px; border-radius: 14px; background: var(--accent);
    color: #1a1208; font: 700 13px/26px ui-monospace, monospace; text-align: center; }
  .marker-note { flex: 1; resize: vertical; background: var(--bg); color: var(--ink);
    border: 1px solid var(--line); border-radius: 7px; padding: 8px; font: 14px/1.5 inherit; }
  .marker-note:focus { outline: none; border-color: var(--accent); }
  .marker-del { flex: none; background: var(--panel2); color: var(--dim); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 13px; }
  .marker-del:hover { color: var(--ink); border-color: var(--accent); }
  .hero.placeholder { padding: 22px; display: flex; flex-direction: column; gap: 16px;
    background: repeating-linear-gradient(45deg, var(--panel), var(--panel) 12px, var(--panel2) 12px, var(--panel2) 24px); }
  .placeholder-badge { align-self: flex-start; font-size: 12px; color: var(--todo);
    border: 1px solid #5a4a20; border-radius: 20px; padding: 4px 12px; background: var(--bg); }
  .refthumb { margin: 0; max-width: 520px; }
  .refthumb img { display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line); }
  .refthumb figcaption { color: var(--dim); font-size: 12px; margin-top: 6px; }
  .refmissing { color: var(--dim); font-size: 13px; font-style: italic; }
  .prompt { border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
    padding: 14px; margin-bottom: 18px; }
  .prompt-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .tag { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: var(--accent); }
  .copy { margin-left: auto; background: var(--panel2); color: var(--ink); border: 1px solid var(--line);
    border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 12px; }
  .copy:hover { border-color: var(--accent); }
  .prompt-text { width: 100%; resize: vertical; background: var(--bg); color: var(--ink);
    border: 1px solid var(--line); border-radius: 7px; padding: 10px; font: 13px/1.5 ui-monospace, monospace; }
  .reflist { color: var(--dim); font-size: 12px; margin-top: 8px; }
  .reflist code { background: var(--panel2); padding: 1px 6px; border-radius: 4px; }
  .artdir { margin-bottom: 18px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
  .artdir summary { cursor: pointer; padding: 12px 14px; color: var(--accent); font-size: 13px; }
  .artdir[open] summary { border-bottom: 1px solid var(--line); }
  .artdir > *:not(summary) { margin: 14px; }
  .feedback { margin-top: 22px; }
  .feedback label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .6px;
    color: var(--dim); margin-bottom: 6px; }
  .fb { width: 100%; resize: vertical; background: var(--panel); color: var(--ink);
    border: 1px solid var(--line); border-radius: 8px; padding: 11px; font: 14px/1.5 inherit; }
  .fb:focus, .prompt-text:focus { outline: none; border-color: var(--accent); }
  .pager { position: sticky; bottom: 0; display: flex; gap: 10px; align-items: center;
    padding: 14px 0 0; margin-top: 26px; border-top: 1px solid var(--line); background: var(--bg); }
  .pager button { background: var(--panel2); color: var(--ink); border: 1px solid var(--line);
    border-radius: 8px; padding: 9px 18px; cursor: pointer; font-size: 14px; }
  .pager button:hover:not(:disabled) { border-color: var(--accent); }
  .pager button:disabled { opacity: .4; cursor: default; }
  .pager .spacer { flex: 1; }
  .pager .export { color: var(--accent); }
  @media (max-width: 760px) { .wrap { grid-template-columns: 1fr; } nav.rail { display: none; } }
</style>
</head>
<body>
<header class="top">
  <h1>Mode 5 — Screen Flow Review</h1>
  <span class="meta">${models.length} screens · ${captured} captured · ${placeholders} placeholder${placeholders === 1 ? "" : "s"} · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")}</span>
</header>
<div class="wrap">
  <nav class="rail">${navList}</nav>
  <main>
    ${slides}
    <div class="pager">
      <button id="prev">← Prev</button>
      <button id="next">Next →</button>
      <span class="spacer"></span>
      <button id="export" class="export">Export feedback (JSON)</button>
    </div>
  </main>
</div>
<script>
  const slides = Array.from(document.querySelectorAll('.slide'));
  const chips = Array.from(document.querySelectorAll('.navchip'));
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const STORE = 'mode5-screenflow-feedback';
  let idx = 0;

  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, n) => s.hidden = n !== idx);
    chips.forEach((c, n) => c.classList.toggle('active', n === idx));
    prev.disabled = idx === 0;
    next.disabled = idx === slides.length - 1;
    chips[idx] && chips[idx].scrollIntoView({ block: 'nearest' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  prev.addEventListener('click', () => show(idx - 1));
  next.addEventListener('click', () => show(idx + 1));
  chips.forEach((c) => c.addEventListener('click', () => show(Number(c.dataset.goto))));
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // Persist feedback across reloads.
  const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
  document.querySelectorAll('.fb').forEach((t) => {
    const key = t.dataset.screen;
    if (saved[key]) t.value = saved[key];
    t.addEventListener('input', () => {
      const cur = JSON.parse(localStorage.getItem(STORE) || '{}');
      cur[key] = t.value;
      localStorage.setItem(STORE, JSON.stringify(cur));
    });
  });

  // Copy image-gen prompts.
  document.querySelectorAll('.copy').forEach((b) => {
    b.addEventListener('click', () => {
      const el = document.getElementById(b.dataset.copy);
      el.select();
      navigator.clipboard && navigator.clipboard.writeText(el.value);
      const was = b.textContent; b.textContent = 'copied'; setTimeout(() => (b.textContent = was), 1200);
    });
  });

  // ── Markers: click a screenshot to drop auto-numbered pins, each with a
  // numbered note. Persisted per screen; included in the JSON export so the
  // notes are readable off disk (export lands in Downloads).
  const MSTORE = 'mode5-screenflow-markers';
  const loadMarks = () => JSON.parse(localStorage.getItem(MSTORE) || '{}');
  const saveMarks = (m) => localStorage.setItem(MSTORE, JSON.stringify(m));

  function renderMarks(screen) {
    const list = (loadMarks()[screen]) || [];
    document.querySelectorAll('.shotwrap[data-screen="' + screen + '"] .pins').forEach((pins) => {
      pins.innerHTML = '';
      list.forEach((mk, i) => {
        const pin = document.createElement('div');
        pin.className = 'pin';
        pin.textContent = String(i + 1);
        pin.style.left = mk.x + '%';
        pin.style.top = mk.y + '%';
        pin.dataset.i = String(i);
        pins.appendChild(pin);
      });
    });
    document.querySelectorAll('.markers[data-screen="' + screen + '"] .marker-list').forEach((box) => {
      box.innerHTML = '';
      list.forEach((mk, i) => {
        const row = document.createElement('div');
        row.className = 'marker-row';
        const num = document.createElement('div');
        num.className = 'marker-num';
        num.textContent = String(i + 1);
        const ta = document.createElement('textarea');
        ta.className = 'marker-note';
        ta.rows = 2;
        ta.value = mk.note || '';
        ta.placeholder = 'Note for marker ' + (i + 1) + '…';
        ta.addEventListener('input', () => {
          const cur = loadMarks();
          if (cur[screen] && cur[screen][i]) { cur[screen][i].note = ta.value; saveMarks(cur); }
        });
        const del = document.createElement('button');
        del.className = 'marker-del';
        del.textContent = '✕';
        del.title = 'delete marker ' + (i + 1);
        del.addEventListener('click', () => {
          const cur = loadMarks();
          if (!cur[screen]) return;
          cur[screen].splice(i, 1);
          if (!cur[screen].length) delete cur[screen];
          saveMarks(cur);
          renderMarks(screen);
        });
        row.appendChild(num); row.appendChild(ta); row.appendChild(del);
        box.appendChild(row);
      });
    });
  }

  document.querySelectorAll('.shotwrap').forEach((wrap) => {
    const screen = wrap.dataset.screen;
    wrap.addEventListener('click', (e) => {
      if (e.target.classList.contains('pin')) {
        const notes = document.querySelectorAll('.markers[data-screen="' + screen + '"] .marker-note');
        const el = notes[Number(e.target.dataset.i)];
        if (el) el.focus();
        return;
      }
      const r = wrap.getBoundingClientRect();
      const cur = loadMarks();
      const arr = (cur[screen] = cur[screen] || []);
      arr.push({
        x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10,
        y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10,
        note: '',
      });
      saveMarks(cur);
      renderMarks(screen);
      const notes = document.querySelectorAll('.markers[data-screen="' + screen + '"] .marker-note');
      if (notes.length) notes[notes.length - 1].focus();
    });
    renderMarks(screen);
  });

  // Export all feedback + markers as a downloadable JSON.
  document.getElementById('export').addEventListener('click', () => {
    const data = {};
    document.querySelectorAll('.fb').forEach((t) => { if (t.value.trim()) data[t.dataset.screen] = t.value; });
    const payload = { generatedAt: new Date().toISOString(), feedback: data, markers: loadMarks() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'screen-flow-feedback.json';
    a.click();
  });

  show(0);
</script>
</body>
</html>`;
}

function main() {
  const opts = parseArgs(process.argv);
  const models = SCREENS.map(buildScreenModel);
  const html = render(models);
  fs.writeFileSync(opts.out, html);

  const captured = models.filter((m) => m.hasShot).length;
  const refsFound = models.filter((m) => m.refThumb).length;
  console.log(`flow.html written → ${opts.out}`);
  console.log(`  ${models.length} screens · ${captured} captured · ${models.length - captured} placeholder(s)`);
  console.log(`  ${refsFound} screen(s) had a reference image embedded from ${REF_DIR}`);
  console.log(`\nOpen it:`);
  console.log(`  start "" "${opts.out}"        (Windows)`);
  console.log(`  or just double-click flow.html — it is fully self-contained.`);
}

main();
