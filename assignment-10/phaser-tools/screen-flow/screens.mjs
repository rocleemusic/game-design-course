/**
 * screens.mjs — the screen-flow manifest (single source of truth).
 *
 * Both halves of the tool read this file and nothing else about screen order:
 *   - capture.mjs drives the live mode5 build to each screen that has a
 *     `capture` block and writes shots/<id>.png.
 *   - build-flow.mjs lays every screen out in this order. A screen with a
 *     captured shot shows the screenshot; a screen without one falls back to a
 *     PLACEHOLDER card that embeds an image-gen prompt built from `refs` +
 *     `artNote` + ART_DIRECTION.
 *
 * "Gate" here is navigational, not a `G-*` id: it is the thing a reviewer does
 * (or the condition that must hold) to arrive at the screen in mode5. The
 * capture `steps` reuse the same tiny action vocabulary as tools/playtest.mjs
 * scenarios (wait / press / key / click / evalTrue) so the two stay legible
 * side by side.
 *
 * REF_DIR points at Roc's off-repo reference board. build-flow.mjs embeds each
 * referenced image as a data: URI when the file is present, and degrades to the
 * bare filename when it is not — the page is always self-contained either way.
 */

export const REF_DIR = "C:/Users/rocle/Desktop/8-16-refs/savescreen-inventory";

/** House style baked into every placeholder image-gen prompt. */
export const ART_DIRECTION =
  "Hand-painted, cozy storybook illustration at 1920x1080 (16:9). Warm, " +
  "lived-in interiors, soft natural light, painterly texture and a gentle " +
  "line. Muted-but-saturated palette. Spiritfarer / Frieren register — no " +
  "hard UI chrome, no flat vector panels; diegetic, tactile surfaces.";

/**
 * The T13 boot gate (added 2026-08): mode5 now opens on the save-slot board.
 * A screen deep in the game must first pick the left slot, click Begin (unnamed
 * is allowed), and land on LocationSelectScene. Every in-game capture replays
 * this from its own fresh page load. Coordinates are 1920x1080, the capture
 * viewport. Before this, the steps clicked straight at a location card and got
 * stuck on the name-entry modal.
 */
const PICK_SLOT_AND_BEGIN = [
  { action: "wait", ms: 2000 }, // the lives board takes a beat to come up on a cold load
  { action: "click", x: 565, y: 543 }, // first-column slot → name modal (coords + timing proven by playtest/t13-slot-set.mjs)
  { action: "wait", ms: 800 },
  { action: "press", key: "Enter" }, // Enter on an empty field begins an unnamed life
  { action: "wait", ms: 3000 }, // the board transition out is slow — under ~3s the shot catches the modal
];
/** ...then pick the day's first location card → CollectScene. */
const ENTER_GAME = [
  ...PICK_SLOT_AND_BEGIN,
  { action: "click", x: 172, y: 460 }, // Forager's Clearing card (LEFT), not centre — per t13-slot-set.mjs
  { action: "wait", ms: 3500 },
];

/**
 * The mode5 screen order. Screens with a `capture` block are reachable in the
 * live build today and get a real screenshot; the rest are design targets whose
 * art does not exist yet, so they render as placeholders.
 */
export const SCREENS = [
  {
    id: "mode-picker",
    name: "Mode Picker",
    gate: "App boot with no ?mode= — the entry menu that lists all four modes.",
    capture: {
      // No mode selected → ModePickerScene renders the menu.
      url: "?",
      steps: [{ action: "wait", ms: 900 }],
    },
  },
  {
    id: "location-select",
    name: "Location Select",
    gate: "Choose Mode 5 → LocationSelectScene (mode5's declared entry).",
    capture: {
      url: "?mode=mode5",
      steps: [...PICK_SLOT_AND_BEGIN],
    },
  },
  {
    id: "collect-forage",
    name: "Forage Screen",
    gate: "Pick a starting location card → CollectScene backdrop with the satchel/hotspot HUD.",
    capture: {
      url: "?mode=mode5",
      steps: [...ENTER_GAME],
    },
  },
  {
    id: "spellbook",
    name: "Spellbook",
    gate: "Press N in CollectScene, then the notebook's Spells tab.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "N" },
        { action: "wait", ms: 500 },
        {
          action: "evalTrue",
          // Deterministic entry: jump to the Spells tab and select a starter
          // spell (echo is a day-1 Mage spell, always known). No pixel-hunting
          // the index rows — see NotebookScene's __notebook.select probe.
          expression: `(() => {
            if (!window.__notebook) return false;
            window.__notebook.select("echo");
            return true;
          })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: [
      "spell-book-bg.jpg",
      "spellbook-layout-inspo-spells-on-left-spell-vfx-and-description-right.jpg",
      "book over bg.jpg",
    ],
    artNote:
      "An open grimoire: spells listed down the left as a hand-written index; the " +
      "right page shows the selected spell's framed almanac illustration above its " +
      "field-notes description. Reads as a book, not a menu.",
  },
  {
    id: "notebook",
    name: "Notebook",
    gate: "Press N (or the top-right [ notebook — N ] button) in CollectScene.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "N" },
        { action: "wait", ms: 500 },
        {
          action: "evalTrue",
          // collectMode notebook defaults to the Spells tab (that IS the
          // Spellbook screen), so switch to Knowledge for this shot.
          expression: `(() => {
            if (!window.__notebook) return false;
            window.__notebook.setTab("knowledge");
            return true;
          })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["npc details in notebook.jpg"],
    artNote:
      "An NPC dossier spread: portrait, name, and the clues/relationships the player " +
      "has gathered, laid out like journal entries rather than a data table.",
  },
  {
    id: "calendar",
    name: "Calendar",
    gate: "Press L (or the top-right [ calendar — L ] button) in CollectScene.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "L" },
        { action: "wait", ms: 700 },
      ],
    },
    refs: ["calendar-has-where-you-visited.webp"],
    artNote:
      "A week/month spread that also records where the player has already been — " +
      "visited locations marked on the days, so the calendar doubles as a travel log.",
  },
  {
    id: "hub-decor",
    name: "Home Hub (Decoration)",
    gate: "Press H in CollectScene → HubScene, the decoratable mage's workspace.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "H" },
        { action: "wait", ms: 800 },
      ],
    },
    refs: [
      "mage-workspace.jpg",
      "workspace-inspiration.webp",
      "worspace-arrangement.webp",
      "shelf-in-mage-workspace.webp",
      "table-look.jpg",
      "cozy-corners-game-reference.jpg",
      "make-room-game-reference.jpg",
    ],
    artNote:
      "A cozy mage's corner the player arranges: shelves, a work table, and small " +
      "found objects placed by hand. Warm clutter that reflects what this life has " +
      "actually collected — the room is the save file made visible.",
  },
  {
    id: "satchel",
    name: "Satchel (Inventory)",
    gate: "Press S in CollectScene → the full SatchelScene (grant materials with U first so it has contents).",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "KeyU" }, // DEV unlock — fill the satchel so it is not empty
        { action: "wait", ms: 400 },
        { action: "press", key: "KeyS" }, // open SatchelScene
        { action: "wait", ms: 700 },
      ],
    },
    refs: ["inventory-bag.jpg", "inventory-alt.jpg", "inventory-inspect.jpg"],
    artNote:
      "The opened satchel as a painted bag interior: gathered materials as tactile " +
      "objects the player can inspect, not icons in a grid. Includes a close-up inspect " +
      "state for a single item.",
  },
  {
    id: "save-load",
    name: "Save / Load",
    gate: "Boot mode5 — the save-slot board (SaveLoadScene) shows first (T13 Phase 4).",
    capture: {
      // The board IS the first thing mode5 shows now, so no slot pick — just
      // let it come up.
      url: "?mode=mode5",
      steps: [{ action: "wait", ms: 2000 }],
    },
    refs: ["save-load-screen.jpg"],
    artNote:
      "Save slots shown as book plates or shelf entries, each with its day/season and a " +
      "small snapshot of that life. Loading feels like pulling a volume off the shelf.",
  },
  {
    id: "options",
    name: "Options",
    gate: "Press O in CollectScene → OptionsScene.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "KeyO" }, // open OptionsScene
        { action: "wait", ms: 500 },
      ],
    },
    refs: ["options.jpg"],
    artNote:
      "A quiet settings page in the same painted frame: audio, text, and accessibility " +
      "controls styled as diegetic dials/labels rather than OS-style form rows.",
  },

  // ── mode5 sub-STATES (2026-08-29) ──────────────────────────────────────────
  // Every screen above is a distinct top-level screen; the entries below are the
  // deeper STATES a reviewer would otherwise never see a shot of — a notebook
  // tab, an inspect card, a hover tooltip, a confirm step. Each reuses
  // ENTER_GAME and drives a DEV probe (`__notebook`/`__satchel`/`__hub`/`__npc`/
  // `__collect`) or the new `hover` action for deterministic entry, never a
  // blind click on a dynamically-placed target.

  {
    id: "notebook-relationships",
    name: "Notebook — Relationships",
    gate: "Notebook (N) → Relationships tab: souls met and their bond bands.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "N" },
        { action: "wait", ms: 500 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__notebook) return false; window.__notebook.setTab("relationships"); return true; })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["npc details in notebook.jpg"],
    artNote:
      "The relationships spread: each soul met listed with a bond band (dots, never a " +
      "number), read as a page of acquaintances rather than a stats table. Empty early " +
      "in a life — bonds build by talking.",
  },
  {
    id: "notebook-collection",
    name: "Notebook — Collection",
    gate: "Forage real items, Notebook (N) → Collection tab: satchel / arms / banked.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // The Collection tab reads view.satchel/arms/banked — the LanternPlayer
          // POOL arrays, which the U dev-unlock does NOT touch (it fills
          // Inventory.held only). So forage real items through __collect, which
          // writes the pool arrays, giving the tab genuine contents.
          expression: `(() => {
            const c = window.__collect;
            if (!c) return false;
            const slots = c.forage();
            if (!slots.length) return false;
            for (const s of slots) c.pickup(s.slotId, s.item);
            return true;
          })()`,
        },
        { action: "press", key: "N" },
        { action: "wait", ms: 500 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__notebook) return false; window.__notebook.setTab("collection"); return true; })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["npc details in notebook.jpg"],
    artNote:
      "The collection spread: what this life is carrying (satchel), holding (arms) and " +
      "has banked at home, grouped as journal lists on the parchment page.",
  },
  {
    id: "satchel-arms",
    name: "Satchel — Arms tab",
    gate: "Forage real items, Satchel (S), move the first to Arms, then the Arms tab.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // armFirst() needs a real SATCHEL SLOT (LanternPlayer.satchel), which
          // only a genuine pickup writes — the U dev-unlock fills Inventory.held
          // (unslotted extras) and has nothing to move to arms. So forage first.
          expression: `(() => {
            const c = window.__collect;
            if (!c) return false;
            const slots = c.forage();
            if (!slots.length) return false;
            for (const s of slots) c.pickup(s.slotId, s.item);
            return true;
          })()`,
        },
        { action: "press", key: "KeyS" },
        { action: "wait", ms: 700 },
        {
          action: "evalTrue",
          // Move a real slotted item to arms so the Arms tab is not empty, then switch.
          expression: `(() => { if (!window.__satchel) return false; if (!window.__satchel.armFirst()) return false; return window.__satchel.setTab("arms"); })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["inventory-bag.jpg", "inventory-alt.jpg"],
    artNote:
      "The Arms tab of the satchel: the smaller over-flow buffer the player carries in " +
      "hand, grouped by type, with the To-Satchel / Drop actions on the inspect side.",
  },
  {
    id: "satchel-inspect",
    name: "Satchel — Inspect card",
    gate: "Satchel (U then S), inspect the first pocket (its hero image + description).",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "KeyU" },
        { action: "wait", ms: 400 },
        { action: "press", key: "KeyS" },
        { action: "wait", ms: 700 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__satchel) return false; return window.__satchel.select(0); })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["inventory-inspect.jpg"],
    artNote:
      "The inspect side of the satchel focused on one material: a large centred hero " +
      "image, its full description, and the spells that still need it.",
  },
  {
    id: "satchel-drop-confirm",
    name: "Satchel — Drop confirm",
    gate: "Satchel (U then S), arm the two-step Drop on the first item (Confirm Drop).",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "KeyU" },
        { action: "wait", ms: 400 },
        { action: "press", key: "KeyS" },
        { action: "wait", ms: 700 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__satchel) return false; return window.__satchel.confirmDropFirst(); })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    refs: ["inventory-inspect.jpg"],
    artNote:
      "The destructive-drop confirm step: the Drop button relabelled 'Confirm Drop' with " +
      "the warn line above it — the second click a discard needs.",
  },
  {
    id: "forage-examine-known",
    name: "Forage — Examine (known)",
    gate: "CollectScene, mark items discovered, then hover the first forage dot → named examine card.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // Mark every material discovered (as if found before) so the examine
          // card shows the real name + description, then fire the dot's own
          // pointerover with the pointer parked on it. `getData("slotId")` tags
          // every forage Arc (see HotspotSystem.sync).
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            for (const it of [...collect.run.items, ...collect.run.keyItems]) collect.inventory.give(it.item_id);
            const dot = collect.children.list.find((o) => o.data && o.data.get && o.data.get("slotId"));
            if (!dot) return false;
            const p = collect.input.activePointer; p.x = dot.x; p.y = dot.y;
            dot.emit("pointerover");
            return true;
          })()`,
        },
        { action: "wait", ms: 500 },
      ],
    },
    artNote:
      "The forage examine card in its KNOWN state: a parchment tooltip by the hotspot dot " +
      "with the material's real name and its field-notes description.",
  },
  {
    id: "forage-examine-unknown",
    name: "Forage — Examine (unknown)",
    gate: "Fresh life (no unlock): hover the first forage dot → the '???' mystery card.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            const dot = collect.children.list.find((o) => o.data && o.data.get && o.data.get("slotId"));
            if (!dot) return false;
            const p = collect.input.activePointer; p.x = dot.x; p.y = dot.y;
            dot.emit("pointerover");
            return true;
          })()`,
        },
        { action: "wait", ms: 500 },
      ],
    },
    artNote:
      "The forage examine card BEFORE the item type is known: a dashed-border '???' card " +
      "withholding the name, prompting 'pick it up to find out'.",
  },
  {
    id: "region-tooltip",
    name: "Examine Region tooltip",
    gate: "CollectScene: hover the first authored examine region → its cursor-following tooltip.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // Examine regions tag their hit box with data "regionId"
          // (HotspotSystem.syncRegions). Fire its pointerover with a synthetic
          // pointer so `showRegionTip`/`positionRegionTip` have coords to read.
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            const box = collect.children.list.find((o) => o.data && o.data.get && o.data.get("regionId"));
            if (!box) return false;
            box.emit("pointerover", { x: box.x, y: box.y });
            return true;
          })()`,
        },
        { action: "wait", ms: 500 },
      ],
    },
    artNote:
      "A place-in-the-painting examine region hovered: a small parchment tooltip naming it, " +
      "tracking the cursor rather than pinned to the box.",
  },
  {
    id: "gate-hint-generous",
    name: "Gated move — generous hint",
    gate: "Set hint strength = generous, then hover a gated exit → its '[needs: …]' hint.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // Flip the device setting in-memory via the SAME PlayerSettings module
          // MoveRegions reads (Vite dev dedups the dynamic import to the live
          // singleton), then re-render so gated regions rebuild WITH their hint.
          expression: `(async () => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            const mod = await import("/src/world/PlayerSettings.ts");
            mod.PlayerSettings.setHintStrength("generous");
            collect.render();
            return true;
          })()`,
        },
        { action: "wait", ms: 400 },
        {
          action: "evalTrue",
          // Hover every move region; only a gated one (generous + authored gate)
          // carries a hint to reveal. `false` if this screen has no exits at all.
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            const built = (collect && collect.moveRegions && collect.moveRegions.built) || [];
            if (!built.length) return false;
            for (const r of built) r.box.emit("pointerover", { x: r.box.x, y: r.box.y });
            return true;
          })()`,
        },
        { action: "wait", ms: 400 },
      ],
    },
    artNote:
      "A locked exit at the most generous hint strength: the fiction label 'the way is " +
      "blocked' plus the raw '[needs: …]' requirement line surfaced on hover.",
  },
  {
    id: "npc-modal",
    name: "NPC portrait row",
    // The spell-hint modal this screen used to capture was retired 2026-08-30 —
    // `__npc.open()` now does what a portrait click does: enters the
    // conversation, or flashes a note when there is none to enter. The shot is
    // therefore the portrait row and whatever the click led to, not a panel.
    gate: "Walk to a soul (via __collect), then __npc.open() → the portrait click's own outcome.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // Day-1 morning starts have no present soul, so greedily walk toward
          // town (Market Row day-1 morning has mara + toby) using the existing
          // __collect probe, opening the modal the moment a talkable soul is on
          // screen. Bounded so a dead end fails as a miss, never hangs.
          expression: `(() => {
            const c = window.__collect, npc = window.__npc;
            if (!c || !npc) return false;
            for (let step = 0; step < 14; step++) {
              if (npc.presentSouls().length) return npc.open();
              const moves = c.snapshot().choices.filter((ch) => ch.kind === "move");
              if (!moves.length) return false;
              const pref = moves.find((m) => /Market/i.test(m.display))
                || moves.find((m) => /Town|Square|Commons/i.test(m.display))
                || moves[0];
              c.choose(pref.index);
            }
            return false;
          })()`,
        },
        { action: "wait", ms: 600 },
      ],
    },
    refs: ["npc details in notebook.jpg"],
    artNote:
      "The NPC talk modal: the soul's name and role, the one spell-clue they offer today " +
      "with its component hint, any freely-offered gift, and the 'talk with' row.",
  },
  {
    id: "spell-trial",
    name: "Spell Trial",
    gate: "See a clue spell (__collect.seeSpell), Notebook (N), then __notebook.trial → SpellTrialScene.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // Make `portion` a CLUE (seen, not learned) so the trial opens its
          // component-guessing UI rather than the known-cast one. No dev unlock:
          // U learns every spell, which would skip the guess entirely.
          expression: `(() => { if (!window.__collect) return false; window.__collect.seeSpell("portion"); return true; })()`,
        },
        { action: "press", key: "N" },
        { action: "wait", ms: 500 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__notebook) return false; return window.__notebook.trial("portion"); })()`,
        },
        { action: "wait", ms: 600 },
      ],
    },
    artNote:
      "The standalone trial-cast board for an unconfirmed clue: the component chips from " +
      "the satchel and banked pools, a 'try it' action, and the result line.",
  },
  {
    id: "hub-placed",
    name: "Home Hub — piece placed",
    gate: "Home Hub (H), bank stock via __hub, then __hub.placeFirst() — a decorated room.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "H" },
        { action: "wait", ms: 900 },
        {
          action: "evalTrue",
          // A fresh life has nothing banked, so seed the banked palette with the
          // debug seam, then place its first piece — the real Decor.place path.
          expression: `(() => {
            if (!window.__hub) return false;
            window.__hub.bank(window.__hub.collectibleIds().slice(0, 4));
            return window.__hub.placeFirst();
          })()`,
        },
        { action: "wait", ms: 500 },
      ],
    },
    refs: ["mage-workspace.jpg", "worspace-arrangement.webp"],
    artNote:
      "The Home Hub with a banked piece placed into the room — the decorate loop mid-arrangement, " +
      "the banked palette drawn down by one.",
  },
  {
    id: "hub-holding",
    name: "Home Hub — holding a piece",
    gate: "Home Hub (H), bank stock, then __hub.holdFirst() — the 'Holding: X' place hint.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "H" },
        { action: "wait", ms: 900 },
        {
          action: "evalTrue",
          expression: `(() => {
            if (!window.__hub) return false;
            window.__hub.bank(window.__hub.collectibleIds().slice(0, 4));
            return window.__hub.holdFirst();
          })()`,
        },
        { action: "wait", ms: 500 },
      ],
    },
    refs: ["mage-workspace.jpg"],
    artNote:
      "The click-to-place state: a palette piece armed, the bar showing 'Holding: X — click a " +
      "spot in the room to place it' (the non-drag placement path).",
  },
  {
    id: "hub-shelf",
    name: "Home Hub — Shelf close-up",
    gate: "Home Hub (H), then __hub.openShelf() → the sixteen-cubby HubShelfScene.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        { action: "press", key: "H" },
        { action: "wait", ms: 900 },
        {
          action: "evalTrue",
          expression: `(() => { if (!window.__hub) return false; window.__hub.openShelf(); return true; })()`,
        },
        { action: "wait", ms: 700 },
      ],
    },
    refs: ["shelf-in-mage-workspace.webp", "shelf-in-mage-workspace.webp"],
    artNote:
      "The shelf close-up: sixteen cubbies to arrange small found objects into, the palette " +
      "of banked pieces along the bottom.",
  },
  {
    id: "calendar-active",
    name: "Calendar — start-of-day picker",
    gate: "The ACTIVE calendar (today's card is a location picker) — launched with a picks list.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME,
        {
          action: "evalTrue",
          // The real route (hub 'Start the Next Day') is only reachable at
          // night, after a full day — not deterministic in a capture. So launch
          // the SAME CalendarScene in its ACTIVE state with the two canonical
          // starts, over the paused CollectScene, using its real live view.
          // choiceIndex is synthetic (never clicked here); the card render is real.
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            const view = collect.ink.view();
            const picks = [
              { screenId: "T1", name: "Town Square", choiceIndex: 0 },
              { screenId: "F1", name: "Forager's Clearing", choiceIndex: 1 },
            ];
            collect.scene.pause();
            collect.scene.launch("CalendarScene", { view, picks, onPick() {}, onClose() { collect.scene.resume(); } });
            return true;
          })()`,
        },
        { action: "wait", ms: 700 },
      ],
    },
    refs: ["calendar-has-where-you-visited.webp"],
    artNote:
      "The calendar in ACTIVE picker mode: today's card offers the two canonical starts as " +
      "clickable location thumbnails, past days show where they were begun.",
  },
  {
    id: "save-naming",
    name: "Save — name entry",
    gate: "Boot board (SaveLoadScene): pick the first empty slot → the name-entry field (before Enter).",
    capture: {
      url: "?mode=mode5",
      steps: [
        { action: "wait", ms: 2000 }, // the board takes a beat on a cold load
        { action: "click", x: 565, y: 543 }, // first-column slot → NAME THIS LIFE
        { action: "wait", ms: 600 },
      ],
    },
    refs: ["save-load-screen.jpg"],
    artNote:
      "A save slot mid-name-entry: the 'NAME THIS LIFE' field with a blinking caret and " +
      "Begin / Cancel, before the name is confirmed.",
  },
  {
    id: "save-filled",
    name: "Save — filled slot",
    gate: "Enter a life (autosaves), then re-open the board so a slot reads FILLED.",
    capture: {
      url: "?mode=mode5",
      steps: [
        ...ENTER_GAME, // entering CollectScene fires the first autosave to the slot
        { action: "wait", ms: 1200 },
        {
          action: "evalTrue",
          // Re-boot the board reading the just-written slot. It reads
          // localStorage on create, so the running session's own autosave now
          // shows as a filled column. Real save data, not a seeded fake.
          expression: `(() => {
            const collect = game.scene.getScene("CollectScene");
            if (!collect) return false;
            collect.scene.stop();
            game.scene.start("SaveLoadScene", { run: collect.run, ink: collect.ink, magic: collect.magic, mode: collect.mode });
            return true;
          })()`,
        },
        { action: "wait", ms: 1200 },
      ],
    },
    refs: ["save-load-screen.jpg"],
    artNote:
      "The lives board with a filled slot: a life's heading, place, spells learned and last " +
      "played, with Resume / Start over — the other columns still empty.",
  },
  {
    // FLAGGED — no capture block on purpose (design-only placeholder). Festival
    // Night / the final results screen needs day-5 `FS` + `ended` state, and
    // there is NO deterministic dev jump to it: reaching it means playing the
    // full week (~100 story steps) or a day-jump probe that does not exist. Left
    // as a placeholder rather than faked with cold day-1 scoring data (which
    // would violate the never-fabricate rule). See the handoff report.
    id: "festival-results",
    name: "Festival Results",
    gate: "Day 5 Festival Night — FestivalResults over the final screen. NEEDS a day-5/FS dev jump (none exists yet).",
    refs: ["save-load-screen.jpg"],
    artNote:
      "The end-of-week festival results: the two entered goals, the warmth tier they produced " +
      "(never a raw number), and the year-rollover band beneath — a warm, ceremonial close.",
  },
];

/** Build the image-gen prompt embedded in a placeholder card for one screen. */
export function genPrompt(screen) {
  const refs = screen.refs && screen.refs.length ? screen.refs.join(", ") : "(no reference on file)";
  const note = screen.artNote ? ` ${screen.artNote}` : "";
  return (
    `Screen: ${screen.name}. Derive the composition and mood from reference ` +
    `image(s): ${refs}.${note} ${ART_DIRECTION}`
  );
}
