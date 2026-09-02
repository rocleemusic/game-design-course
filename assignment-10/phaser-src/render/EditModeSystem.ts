/**
 * Step 8 of `plans/2026-08-17-mode5-srp-merge-plan.md` — scoped down to
 * HOTSPOT DRAWING ONLY (Roc, 2026-08-17). The plan named three things —
 * "hotspot drawing, lock toggle, story-beat insertion" — but only hotspot
 * drawing has a real target: 19 of 20 screens have no authored region
 * geometry, and `world/view/HotspotPlacement.ts`'s own header already says
 * "edit mode is the tool that will eventually author the geometry." Lock
 * toggle was never defined beyond two words anywhere in the repo, and
 * story-beat insertion would need a write path into
 * `scene-graph.json`/`threads/` that does not exist — the plan's own
 * predecessor doc calls that "the most likely thing to slip." Neither is
 * built here; both need their own spec first.
 *
 * WHAT THIS DOES. Mounted on `CollectScene` (mode5) only — `"edit-mode"` in
 * `MODE5.systems`, the same activation shape as `save`/`receiver-states`/
 * `vfx`. FIRST BUILT mounted on `ScreenScene` (mode 1) instead, behind a
 * `?edit=1` URL flag — wrong call, corrected the same day: this is THE MODE5
 * PLAN, mode 1 is supposed to stay untouched, and every other system in this
 * plan turns on through the descriptor, not a URL flag. `ScreenScene.ts` is
 * back to byte-for-byte what it was before this file existed. `CollectScene`
 * draws no region-hotspot geometry of its own today (only forage dots, a
 * different mechanic — `HotspotSystem`) — this is the only thing that shows
 * a region rect there, so there is no second renderer to coexist with the
 * way there was on `ScreenScene`.
 *
 * THE WORKFLOW THIS PRODUCES. There is no backend and no write API into
 * `public/story/regions.json` — it is a static asset, fetched once at boot.
 * So this does not "save" anything live. It draws a rect wherever the author
 * drags on the backdrop, keeps it in memory for the session, and an export
 * action serialises EVERY drawn rect — merged onto the regions this run
 * already loaded — into the exact `regions.json` shape, copied to the
 * clipboard (and logged, since clipboard access can silently fail outside a
 * secure context). A human pastes that into the real file and rebuilds —
 * the same "write to the authoring layer needs a build to appear in-game"
 * shape the plan already describes for story-beat insertion, just for a
 * file this codebase can actually produce today.
 *
 * INTERACTION. Every declared/authored region id for the current screen is
 * listed as a clickable label in a palette row at the top. Clicking one ARMS
 * it (highlighted); dragging anywhere on the backdrop while armed draws a
 * live rectangle and commits it on release. A drag only starts when the
 * pointer-down has nothing interactive under it (the palette labels and any
 * already-shaped boxes both guard their own clicks), so arming an id and
 * drawing its rect are two separate gestures, never one race.
 *
 * TWO CORRECTIONS, Roc 2026-08-23 (review notes 42 + 43).
 *
 * 1. IT DRAWS IN PICTURE SPACE, NOT CANVAS SPACE. A region rect is a fraction
 *    of the backdrop, and the backdrop is bigger than the canvas (`PAN_ZOOM`)
 *    and slides under it as the pan moves. Measuring a drag against the canvas
 *    stored a number that meant nothing once the pan moved, and drew the
 *    already-authored boxes off their painted features. Every pixel here now
 *    goes through `PanModel` — `unplace()` on the way in, `place()` on the way
 *    out — so a box sits on its feature and travels with it.
 *
 * 2. WHAT IT DRAWS IS LIVE IMMEDIATELY. `onRegionCommitted` hands each
 *    finished rect straight back to the scene, which writes it into the run's
 *    own region map — so leaving edit mode leaves a region that `HotspotSystem`
 *    renders and the player can hover, instead of a rectangle that vanished
 *    with the editor. The clipboard export is still how it reaches disk;
 *    this is only what makes the session's work testable while you are in it.
 *
 * TWO KINDS, ONE EDITOR (GP-203, 2026-08-24 —
 * `plans/2026-08-24-move-region-editor-plan.md`).
 *
 * `regions.json` holds two maps: `screens` (examinable hotspots, gold, keyed by
 * authored `r_*` region id) and `moves` (T14 §1's click-to-walk boxes, dusk,
 * keyed by DESTINATION screen id). T14 shipped the runtime consumer of `moves`
 * and the empty key, but nothing could author it — every screen ran on
 * `MoveRegionPlacement`'s margin fallback. This class is that authoring tool,
 * EXTENDED rather than cloned: the pan-corrected drag, the live-commit seam and
 * the merge-on-export are ~90% of the job and are already solved (and already
 * corrected once by review — a sibling tool would risk re-shipping note 43's
 * canvas-space bug). What differs is three small things: which map a committed
 * rect lands in, which id set the palette shows, and the box colour.
 *
 * So: a `[ examinables | moves ]` kind chip above the palette row, and `armed`
 * carries a kind alongside its id. Arming is exclusive ACROSS both kinds — one
 * armed thing, one drag gesture, no collision, and the drag path itself is
 * untouched. No new hotkey: the HUD bar already owns `S N H L O W E` plus this
 * editor's own Shift+E, and a dev overlay does not get to spend another letter.
 *
 * WHERE THE MOVE IDS COME FROM, AND WHAT IS *NOT* AUTHORED. The move palette is
 * the screen's LIVE hub exits, handed in by `CollectScene` through the same
 * `exitMoveInputs` derivation `MoveRegions.draw` uses — so the editor and the
 * renderer can never disagree about a screen's exit keys. The palette chip IS
 * the destination: arm "T2", drag, and the rect lands in
 * `moves[currentScreen]["T2"]`. Nothing is typed, nothing is name-matched.
 * The label and the gate logic are NOT authored here — `MoveRegions.buildRegion`
 * derives both at runtime whether or not a rect exists. The authored artifact is
 * geometry, which is all the `moves` map has ever held.
 *
 * KNOWN EDGE, ACCEPTED: at night, or on a screen offering no exits, the hub
 * offers no `hubAction === "exit"` choices and the move palette is empty. Walk
 * to the screen in daytime to author it. A dev tool may have a time of day.
 */

import Phaser from "phaser";
import type { AnchorMap, AnchorPoint, RegionMap, RegionRect } from "../ink/loadRun";
import { anchorPointToBase, baseToPicturePixels, regionRectToBase } from "../world/view/HotspotPlacement";
import type { PanModel } from "../world/view/PanModel";
import {
  anchorsFilePayload,
  baseToAnchorPoint,
  pixelDragToRegionRect,
  regionsFilePayload,
} from "../world/view/RegionExport";
import { COLOR, FONT } from "../ui/theme";
import { utilityPill } from "../ui/buttons";

const GOLD = COLOR.gold;
const INK = COLOR.onAccent;
/** WAS a local `#8d8371`, the exact literal `theme.ts`'s `COLOR.dim` header
 * documents as a real AA failure (as low as ~1.8:1 on a dark chip). Same fix,
 * same reason — the token is contrast-verified, the copy was not. */
const DIM = COLOR.dim;

/**
 * Which of `regions.json`'s two maps a palette chip and a committed rect belong
 * to. Not a boolean: `"examine" | "move"` reads at the call site, and the two
 * kinds have separate id spaces that must never be conflated (`loadRun.Run
 * .moveRegions`'s header on why they are two maps at all).
 */
export type RegionKind = "examine" | "move";

/**
 * The two POINT kinds (A10/A11, 2026-08-30) — things that carry their own size
 * and only need a position, so the gesture that authors them is a DRAG-TO-MOVE
 * on a handle, not a drag-to-draw of a rectangle.
 *
 * Deliberately NOT more members on `RegionKind`: a rect kind and a point kind
 * write different shapes (`RegionRect` vs `AnchorPoint`) into different maps,
 * and every rect code path here — `editsFor`, `baseFor`, `rectFor`, the whole
 * `wireDrag` gesture — is typed on `RegionKind` and must stay that way or a
 * point could be committed as a zero-size region nobody can hover.
 */
export type AnchorKind = "npc" | "forage";

/** What the chip row can be showing. */
export type EditKind = RegionKind | AnchorKind;

/** Gold for examinables, dusk for moves — matching the two runtime renderers
 * exactly (`HotspotSystem`'s gold boxes, `MoveRegions`' dashed dusk ones), so a
 * box in the editor is the same colour as the box it is authoring. Ember and
 * green mark the two point kinds; neither has a runtime outline of its own to
 * match, so they are picked to read as clearly NOT a region box. */
const KIND_COLOR: Record<EditKind, number> = {
  examine: COLOR.goldNum,
  move: COLOR.duskNum,
  npc: COLOR.emberNum,
  forage: COLOR.greenNum,
};

/** Radius of a draggable anchor handle, and of its delete pip. */
const HANDLE_R = 20;
/** Portrait scale bounds and step for wheel-resize — the same ±0.1 step
 * `HubScene`'s decoration editor uses on its own pieces. */
const SCALE_STEP = 0.1;
const SCALE_MIN = 0.3;
const SCALE_MAX = 2.5;

/** Anything an anchor handle can be, for repositioning on the pan. */
interface Positioned {
  setPosition(x: number, y: number): unknown;
}

export interface EditModeSystemDeps {
  readonly scene: Phaser.Scene;
  readonly viewWidth: number;
  readonly viewHeight: number;
  /** `run.regions` as loaded at boot — the base an export merges onto. Never
   * mutated by this class; only read at export time. */
  readonly initialRegions: RegionMap;
  /**
   * `run.moveRegions` — the OTHER map in `regions.json` (T14 §1's click-to-walk
   * boxes), the base a move export merges onto, exactly as `initialRegions` is
   * for examinables. Also what makes the export write the WHOLE file: emit
   * `{ screens }` alone and pasting it silently deletes every authored move
   * region.
   *
   * WAS CARRY-ONLY until GP-203 (2026-08-24) — "this editor neither draws nor
   * authors them". It does both now; see this file's "two kinds, one editor".
   */
  readonly moveRegions: RegionMap;
  /** The scene's shared pan, so a drawn rect is a fraction of the PICTURE and
   * the boxes travel with it. Same instance every other panning system takes
   * (`BackdropSystem.pan`) — a second `PanModel` here would put the editor's
   * boxes out of lockstep with the backdrop they are drawn on. */
  readonly pan: PanModel;
  /** Called once per committed EXAMINE rect, so the scene can make it live for
   * the player immediately instead of only after an export + rebuild. */
  readonly onRegionCommitted?: (screen: string, regionId: string, rect: RegionRect) => void;
  /**
   * The same seam for a MOVE rect — `(fromScreen, destScreenId, rect)`, the
   * `moves` map's own keying. Separate callback rather than a `kind` argument
   * on the one above, because the scene writes them into two different maps
   * read by two different systems; one callback with a discriminator would just
   * move that switch across the boundary.
   */
  readonly onMoveRegionCommitted?: (screen: string, destScreenId: string, rect: RegionRect) => void;

  // -- A10/A11: the two point maps ------------------------------------------

  /** `run.npcAnchors` — the boot-time base an NPC export merges onto, and the
   * SAME object `NpcTalkSystem` reads, so a dragged portrait stays where it was
   * dropped on the very next render. */
  readonly npcAnchors?: AnchorMap;
  /** `run.forageAnchors` — the same relationship with `HotspotSystem`. */
  readonly forageAnchors?: AnchorMap;
  /**
   * The forage dots ACTUALLY on screen right now, straight from
   * `HotspotSystem.forageHandles()` — slot id, offered index and base position
   * per dot. This is what makes SEEDED dots editable: nothing is in
   * `forageAnchors` for an unauthored screen, so without asking the renderer
   * what it drew, the forage editor had nothing to hang a handle on and only
   * ever showed an empty row. Each dot's index keys its positional spot
   * (`spot_{index+1}`), so a drag repositions and the delete pip tombstones the
   * exact dot the author grabbed. Same "ask the renderer, don't re-derive
   * placement" contract as `npcHandles`.
   */
  readonly forageHandles?: () => readonly { slotId: string; index: number; baseX: number; baseY: number }[];
  /**
   * Where the cast is standing RIGHT NOW, feet-anchored, scene-local — handed
   * in by the scene from `NpcTalkSystem.castAnchorHandles()` rather than
   * re-derived here.
   *
   * This is the whole reason A10 needs no placement math of its own: the
   * renderer already resolved "authored anchor or default slot" when it drew
   * the row, so a handle placed on its answer is on the portrait BY
   * CONSTRUCTION, at any pan, for both cases. Re-deriving the slot row here
   * would be a second copy of geometry that only agrees until someone edits one
   * of them.
   */
  readonly npcHandles?: () => readonly { soul: string; baseX: number; baseY: number; scale: number }[];
  /** A moved/resized NPC anchor, live to the renderer immediately — the same
   * seam `onRegionCommitted` is for rects. */
  readonly onNpcAnchorCommitted?: (screen: string, soulId: string, anchor: AnchorPoint) => void;
  /** A moved, created or deleted forage spot. `null` is a DELETE — the only
   * destructive act in this editor, and only for spots the author added, since
   * a spot is pure placement with no authored meaning attached to it. */
  readonly onForageAnchorCommitted?: (screen: string, spotId: string, anchor: AnchorPoint | null) => void;
  /**
   * A12 — one line of live festival scoring for the debug readout. A closure
   * rather than the numbers themselves: edit mode repaints on every render, and
   * the scene owns `FestivalScore`'s inputs (the ledger, the ink var).
   * Formatting stays at the call site so this file never learns what a tier is.
   */
  readonly scorePeek?: () => string;
}

export class EditModeSystem {
  private active = false;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private statusText?: Phaser.GameObjects.Text;
  /** screen -> region id -> rect the author has actually drawn this
   * session. Only entries touched this session — an export must not freeze
   * every OTHER screen's current values into the file, or a later
   * re-authoring of one screen would silently also "commit" every other
   * screen's untouched geometry as if it had been reviewed. */
  private readonly edited: RegionMap = {};
  /** The same thing for the `moves` map — `screen -> destination screen id ->
   * rect`. A SECOND map, not more entries in `edited`: the two have separate id
   * spaces and separate merge bases, and an export writes them to separate keys
   * (`loadRun.Run.moveRegions`'s header). */
  private readonly editedMoves: RegionMap = {};
  /** The same session-edits idea for the two POINT maps (A10/A11) — `screen ->
   * soul_id -> point` and `screen -> spot_id -> point`. Separate again for
   * separate id spaces, separate merge bases and separate file keys. */
  private readonly editedNpcs: AnchorMap = {};
  private readonly editedForage: AnchorMap = {};
  private armed: { kind: RegionKind; id: string } | null = null;
  /**
   * Examine region ids INVENTED this session (A11) — ids that exist in neither
   * `regions.json` nor the screen spec's declared list, so nothing else can
   * offer them as a palette chip until one is exported and rebuilt. Per screen,
   * because a region id belongs to the screen it is painted on.
   *
   * They are ordinary palette chips the moment they are added: arm, drag, and
   * the commit path is byte-for-byte the one an authored id already takes.
   */
  private readonly addedIds: Record<string, string[]> = {};
  /** Which palette the chip row is showing. Independent of `armed` — flipping
   * the chip while something is armed does NOT disarm it, so you can flip back
   * and still be holding the same id. */
  private kind: EditKind = "examine";
  private currentScreen: string | null = null;
  /** The last id sets handed in by `draw()`, kept so an internal redraw (a chip
   * click, a commit) can repaint both palettes without the scene re-rendering. */
  private currentIds: readonly string[] = [];
  private currentMoveIds: readonly string[] = [];
  /** Scene-local (pan-relative), not canvas pixels — see this file's header. */
  private dragOrigin: { baseX: number; baseY: number } | null = null;
  private dragPreview?: Phaser.GameObjects.Rectangle;
  /** The drawn region boxes, with the scene-local centre each one keeps, so
   * `reposition()` can ride the pan without re-deriving the geometry. */
  private boxes: { obj: Positioned; baseX: number; baseY: number }[] = [];

  constructor(private readonly deps: EditModeSystemDeps) {
    this.wireDrag();
    // Repositioning is per-frame and belongs to this system, so it listens to
    // the scene's own update rather than making `CollectScene.update()` carry
    // a line for an editor that is off in normal play.
    this.deps.scene.events.on(Phaser.Scenes.Events.UPDATE, this.reposition, this);
    this.deps.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.deps.scene.events.off(Phaser.Scenes.Events.UPDATE, this.reposition, this);
    });
  }

  /** Keep every drawn box on the picture as the pan eases. */
  private reposition(): void {
    if (!this.active) return;
    for (const b of this.boxes) {
      const p = this.deps.pan.place(b.baseX, b.baseY);
      b.obj.setPosition(p.x, p.y);
    }
  }

  /** The size the backdrop actually occupies on screen — what a region
   * fraction is a fraction OF. */
  private picture(): { width: number; height: number } {
    return { width: this.deps.pan.pictureWidth, height: this.deps.pan.pictureHeight };
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(): void {
    this.active = !this.active;
    if (!this.active) this.clear();
  }

  /**
   * Redraw the palettes + rects for `screen`.
   *
   * `ids` is every EXAMINE region id `ScreenScene.drawHotspots` already resolves
   * for the screen (declared ∪ shaped). `moveIds` is every destination screen id
   * the hub currently offers an exit to (`exitMoveInputs`). Both are handed in
   * rather than re-derived, so this editor and the two runtime renderers can
   * never read a screen's region sets differently.
   */
  draw(screen: string, ids: readonly string[], moveIds: readonly string[] = []): void {
    this.currentScreen = screen;
    this.currentIds = ids;
    this.currentMoveIds = moveIds;
    this.repaint();
  }

  /** The palette the active kind shows. Examinables include this session's
   * invented ids (A11) — they are chips like any other the moment they exist,
   * and nothing else can supply them until an export is pasted and rebuilt. */
  private paletteIds(): readonly string[] {
    if (this.rectKind !== "examine") return this.currentMoveIds;
    const extra = (this.currentScreen && this.addedIds[this.currentScreen]) || [];
    return [...this.currentIds, ...extra.filter((id) => !this.currentIds.includes(id))];
  }

  /**
   * Paint everything from current state. Split off `draw()` so an internal
   * event (a kind flip, an arm, a commit) repaints without needing the caller's
   * arguments again — the old code passed `ids` back into `draw()` by closure,
   * which only worked while there was exactly one id set to remember.
   */
  private repaint(): void {
    this.clear();
    const screen = this.currentScreen;
    if (!this.active || !screen) return;

    const { scene, viewWidth: W, viewHeight: H } = this.deps;

    this.statusText = scene.add
      .text(40, H - 160, this.statusLine(), {
        fontFamily: FONT.mono,
        fontSize: "18px",
        color: DIM,
      })
      .setDepth(30);
    this.layer.push(this.statusText);

    // A12 — the score peek. Deliberately plain: a dev readout that has to be
    // legible while edit mode is up, not a designed surface.
    const scoreLine = this.deps.scorePeek?.();
    if (scoreLine) {
      const peek = scene.add
        .text(40, H - 130, `score — ${scoreLine}`, {
          fontFamily: FONT.mono,
          fontSize: "18px",
          color: COLOR.ember,
        })
        .setDepth(30);
      this.layer.push(peek);
    }

    // The kind toggle, on its own row above the palette so a long id list never
    // pushes it off the edge. A chip per kind rather than one that names the
    // OTHER kind: "which am I in" has to be readable without knowing the
    // convention. Four now — two rect kinds and two point kinds (A10/A11).
    let kindX = 40;
    const kindY = 72;
    const kinds: readonly { kind: EditKind; label: string }[] = [
      { kind: "examine", label: "examinables" },
      { kind: "move", label: "moves" },
      { kind: "npc", label: "npcs" },
      { kind: "forage", label: "forage dots" },
    ];
    for (const k of kinds) {
      const on = this.kind === k.kind;
      const chip = scene.add
        .text(kindX, kindY, on ? `[ ${k.label} ]` : `  ${k.label}  `, {
          fontFamily: FONT.mono,
          fontSize: "18px",
          color: on ? INK : COLOR.dim,
          backgroundColor: on ? this.kindHex(k.kind) : COLOR.panelHex,
          padding: { x: 10, y: 6 },
        })
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      chip.on("pointerdown", () => {
        this.kind = k.kind;
        this.repaint();
      });
      this.layer.push(chip);
      kindX += chip.width + 8;
    }

    // Styled §14 pill (`ui/buttons.ts`), not the old `[ bracket ]` text — the
    // dev row reads as the same control family as everything else now.
    const exportBtn = utilityPill(scene, W - 220, 110, "[ export — X ]", () => this.exportToClipboard(), {
      depth: 30,
      fontSize: "18px",
    });
    this.layer.push(...exportBtn.objects);

    // THE FORK (A10/A11). A point kind has no palette and no drag-to-draw — it
    // paints one draggable handle per thing and returns. Everything below this
    // line is rect authoring and is unchanged.
    if (this.kind === "npc" || this.kind === "forage") {
      this.paintAnchors(screen, this.kind);
      return;
    }

    let paletteX = 40;
    const paletteY = 110;
    const paletteIds = this.paletteIds();
    for (const id of paletteIds) {
      const armed = this.isArmed(id);
      const rect = this.rectFor(screen, id);
      const chip = scene.add
        .text(paletteX, paletteY, `${id}${rect ? "" : " (unshaped)"}`, {
          fontFamily: FONT.mono,
          fontSize: "18px",
          color: armed ? INK : "#e8dcc0",
          backgroundColor: armed ? this.kindHex(this.kind) : "#2a2419",
          padding: { x: 10, y: 6 },
        })
        .setDepth(30)
        .setInteractive({ useHandCursor: true });
      chip.on("pointerdown", () => {
        // Exclusive across BOTH kinds — arming a move disarms whatever
        // examinable was held, because there is one drag gesture to spend.
        this.armed = armed ? null : { kind: this.rectKind, id };
        this.repaint();
      });
      this.layer.push(chip);
      paletteX += chip.width + 10;
    }
    if (paletteIds.length === 0) {
      // The move palette's known empty case (night, or a screen with no exits)
      // would otherwise be an unexplained blank row.
      const empty = scene.add
        .text(
          paletteX,
          paletteY,
          this.kind === "move"
            ? "no exits offered here right now — walk here in daytime to author its moves"
            : "no examine regions declared for this screen",
          { fontFamily: FONT.mono, fontSize: "18px", color: COLOR.dim },
        )
        .setDepth(30);
      this.layer.push(empty);
    }

    // A11 — "and it should be possible to create brand new hotspot regions."
    // Only for examinables: a move region's id IS a live destination screen, so
    // there is nothing to invent there (see this file's "where the move ids come
    // from"). The prompt is best-effort — a blocked or cancelled `prompt()`
    // falls back to a generated id rather than doing nothing, because a dev
    // overlay that silently no-ops on click is worse than one that names the
    // region for you.
    const addBtn = utilityPill(scene, W - 220, 160, "[ + new region ]", () => this.addExamineRegion(), {
      depth: 30,
      fontSize: "18px",
    });
    this.layer.push(...addBtn.objects);

    // Only the ACTIVE kind's boxes. Both kinds already have a live runtime
    // renderer drawing underneath (`HotspotSystem` gold, `MoveRegions` dashed
    // dusk), so the editor's own overlay is there to show what the palette is
    // talking about — stacking the other kind's boxes on top of that would just
    // double every outline on the screen.
    const fill = KIND_COLOR[this.rectKind];
    for (const id of paletteIds) {
      const rect = this.rectFor(screen, id);
      if (!rect) continue;
      // PICTURE space, placed through the pan — not `rect * canvas`, which is
      // what put these boxes off their painted features (Roc, note 43).
      const g = regionRectToBase(rect, this.picture());
      const at = this.deps.pan.place(g.baseX, g.baseY);
      const box = scene.add
        .rectangle(at.x, at.y, g.width, g.height, fill, this.editsFor(this.rectKind)[screen]?.[id] ? 0.32 : 0.14)
        .setStrokeStyle(2, fill, this.isArmed(id) ? 1 : 0.6)
        .setDepth(11);
      this.layer.push(box);
      this.boxes.push({ obj: box, baseX: g.baseX, baseY: g.baseY });
    }
  }

  /**
   * Which RECT kind the rect half of this editor is working in.
   *
   * `this.kind` grew two point members (A10/A11) that the rect paths must never
   * see — `editsFor`/`baseFor`/`rectFor` are typed on `RegionKind` precisely so
   * a point can never be filed as a rect. Everything below the fork in
   * `repaint()` goes through this instead of `this.kind`, so the compiler is
   * checking that rule rather than a comment.
   */
  private get rectKind(): RegionKind {
    return this.kind === "move" ? "move" : "examine";
  }

  /** True when `id` is the armed one AND the armed one belongs to the palette
   * currently on screen — an id could in principle appear in both spaces. */
  private isArmed(id: string): boolean {
    return this.armed?.kind === this.rectKind && this.armed.id === id;
  }

  /** The CSS-string form of a kind's colour, for Phaser `Text` backgrounds
   * (which take a string, never a numeric fill). */
  private kindHex(kind: EditKind): string {
    if (kind === "npc") return COLOR.ember;
    if (kind === "forage") return COLOR.green;
    return kind === "examine" ? GOLD : COLOR.dusk;
  }

  private statusLine(): string {
    if (this.kind === "npc") {
      return "edit mode — drag a soul's handle to move them, wheel over it to resize. Shift+E to leave.";
    }
    if (this.kind === "forage") {
      return "edit mode — drag a dot to move it, [ + new dot ] to add one, [ × ] to remove. Shift+E to leave.";
    }
    const noun = this.kind === "examine" ? "a region" : "an exit";
    if (!this.armed) {
      return `edit mode — click ${noun} above to arm it, then drag on the backdrop. Shift+E to leave.`;
    }
    const what = this.armed.kind === "examine" ? "region" : "the way to";
    return `editing ${what} "${this.armed.id}" — drag on the backdrop to draw it. Shift+E to leave edit mode.`;
  }

  /** This session's edits for a kind — the map a commit lands in. */
  private editsFor(kind: RegionKind): RegionMap {
    return kind === "examine" ? this.edited : this.editedMoves;
  }

  /** The boot-time map a kind's rect falls back to when this session has not
   * drawn one. */
  private baseFor(kind: RegionKind): RegionMap {
    return kind === "examine" ? this.deps.initialRegions : this.deps.moveRegions;
  }

  /** The rect to draw for a palette id, in the kind currently on screen. */
  private rectFor(screen: string, id: string): RegionRect | undefined {
    return this.editsFor(this.rectKind)[screen]?.[id] ?? this.baseFor(this.rectKind)[screen]?.[id];
  }

  // ------------------------------------------------------------ point kinds

  /**
   * The point-kind half of `repaint()` (A10/A11): one draggable handle per
   * thing, no palette, no drag-to-draw.
   *
   * NPCs and forage dots differ in exactly three ways — where the list comes
   * from, whether the wheel resizes, and whether there is an add/remove — so
   * they share this one painter rather than getting a method each.
   */
  private paintAnchors(screen: string, kind: AnchorKind): void {
    const { scene, viewWidth: W } = this.deps;
    const fill = KIND_COLOR[kind];

    if (kind === "forage") {
      // A11's other half: "it should be possible to create brand new pickup
      // dots." Drops one in the middle of what is on screen right now, already
      // draggable — the same shape as every other authored spot the instant it
      // exists.
      const addBtn = utilityPill(scene, W - 220, 160, "[ + new dot ]", () => this.addForageSpot(), {
        depth: 30,
        fontSize: "18px",
      });
      this.layer.push(...addBtn.objects);
    }

    const entries = kind === "npc" ? this.npcEntries() : this.forageEntries(screen);
    if (!entries.length) {
      const empty = scene.add
        .text(
          40,
          110,
          kind === "npc"
            ? "nobody is standing on this screen right now — an NPC has to be here to be placed"
            : "no forage dots on this screen right now — nothing is offered here to move or remove",
          { fontFamily: FONT.mono, fontSize: "18px", color: COLOR.dim },
        )
        .setDepth(30);
      this.layer.push(empty);
      return;
    }

    for (const e of entries) {
      const at = this.deps.pan.place(e.baseX, e.baseY);
      const marker = scene.add
        .circle(at.x, at.y, HANDLE_R, fill, 0.45)
        .setStrokeStyle(3, fill, 1)
        .setDepth(32)
        .setInteractive({ useHandCursor: true, draggable: true });
      const label = scene.add
        .text(at.x + HANDLE_R + 8, at.y - 10, e.label, {
          fontFamily: FONT.mono,
          fontSize: "16px",
          color: INK,
          backgroundColor: this.kindHex(kind),
          padding: { x: 6, y: 3 },
        })
        .setDepth(32);
      this.layer.push(marker, label);

      // Both objects ride the pan through the same list the region boxes use,
      // and the DRAG mutates those stored bases rather than the objects' screen
      // positions — otherwise `reposition()` would drag the handle back to its
      // old base on the very next frame.
      const markerRec = { obj: marker as Positioned, baseX: e.baseX, baseY: e.baseY };
      const labelRec = { obj: label as Positioned, baseX: e.baseX + HANDLE_R + 8, baseY: e.baseY - 10 };
      this.boxes.push(markerRec, labelRec);

      marker.on("drag", (pointer: Phaser.Input.Pointer) => {
        const b = this.deps.pan.unplace(pointer.x, pointer.y);
        markerRec.baseX = b.baseX;
        markerRec.baseY = b.baseY;
        labelRec.baseX = b.baseX + HANDLE_R + 8;
        labelRec.baseY = b.baseY - 10;
        this.reposition();
      });
      marker.on("dragend", (pointer: Phaser.Input.Pointer) => {
        const b = this.deps.pan.unplace(pointer.x, pointer.y);
        const picture = this.picture();
        const point = baseToAnchorPoint(b.baseX, b.baseY, picture.width, picture.height);
        this.commitAnchor(screen, kind, e.id, kind === "npc" ? { ...point, scale: e.scale } : point);
      });

      if (kind === "npc") {
        // Scroll-to-resize, the same ±0.1 gesture `HubScene`'s decoration
        // editor uses on a placed piece — one interaction vocabulary for
        // "move and size a thing in a scene."
        marker.on("wheel", (_p: unknown, _dx: number, dy: number) => {
          const next = Math.min(SCALE_MAX, Math.max(SCALE_MIN, e.scale + (dy > 0 ? -SCALE_STEP : SCALE_STEP)));
          const picture = this.picture();
          const point = baseToAnchorPoint(e.baseX, e.baseY, picture.width, picture.height);
          this.commitAnchor(screen, kind, e.id, { ...point, scale: next });
        });
      } else {
        // A dot is pure placement with no authored meaning attached, so it is
        // the one thing here that may be removed. Delete writes a HIDDEN
        // tombstone at the dot's positional spot rather than clearing the key:
        // a seeded dot has no key to clear, and only a tombstone in the same
        // `forage` map makes `HotspotSystem` skip that offered slot and keeps it
        // gone across the next render/resync (see `AnchorPoint.hidden`).
        const pip = scene.add
          .text(at.x + HANDLE_R + 8, at.y + 14, "[ × ]", {
            fontFamily: FONT.mono,
            fontSize: "16px",
            color: COLOR.danger,
            backgroundColor: COLOR.panelHex,
            padding: { x: 6, y: 3 },
          })
          .setDepth(32)
          .setInteractive({ useHandCursor: true });
        const picture = this.picture();
        const point = baseToAnchorPoint(e.baseX, e.baseY, picture.width, picture.height);
        pip.on("pointerdown", () => this.commitAnchor(screen, kind, e.id, { ...point, hidden: true }));
        this.layer.push(pip);
        this.boxes.push({ obj: pip, baseX: e.baseX + HANDLE_R + 8, baseY: e.baseY + 14 });
      }
    }
  }

  /** Where the cast is standing right now, straight from the renderer — see
   * `EditModeSystemDeps.npcHandles` on why this is not re-derived here. */
  private npcEntries(): { id: string; label: string; baseX: number; baseY: number; scale: number }[] {
    return (this.deps.npcHandles?.() ?? []).map((h) => ({
      id: h.soul,
      label: `${h.soul} ×${h.scale.toFixed(1)}`,
      baseX: h.baseX,
      baseY: h.baseY,
      scale: h.scale,
    }));
  }

  /**
   * The dots to hang handles on — the ones `HotspotSystem` ACTUALLY drew this
   * render (`forageHandles`), seeded and authored alike. This is the fix for
   * "seeded forage dots can't be moved or removed": an unauthored screen has
   * nothing in `forageAnchors`, so reading that map gave an empty row and the
   * seeded dots on screen had no handle. Each dot's offered index keys its
   * positional spot (`spot_{index+1}`), which a drag repositions and the delete
   * pip tombstones — the same key `HotspotSystem` reads back.
   */
  private forageEntries(screen: string): {
    id: string;
    label: string;
    baseX: number;
    baseY: number;
    scale: number;
  }[] {
    const entries: { id: string; label: string; baseX: number; baseY: number; scale: number }[] = [];
    const seen = new Set<string>();

    // The dots on screen right now, seeded and authored alike — the real fix.
    for (const h of this.deps.forageHandles?.() ?? []) {
      const id = `spot_${h.index + 1}`;
      seen.add(id);
      entries.push({ id, label: id, baseX: h.baseX, baseY: h.baseY, scale: 1 });
    }

    // Authored spots the renderer did NOT draw this frame — a `+ new dot` spot
    // past the day's offered slots, or one whose slot has been picked — still
    // get a handle so they remain moveable/removable. Hidden tombstones are
    // not dots and are skipped. Session edits win over the boot-time map, the
    // same precedence `rectFor` gives rects.
    const authored = { ...(this.deps.forageAnchors?.[screen] ?? {}), ...(this.editedForage[screen] ?? {}) };
    const picture = this.picture();
    for (const [id, point] of Object.entries(authored)) {
      if (seen.has(id) || point.hidden) continue;
      seen.add(id);
      const b = anchorPointToBase(point, picture);
      entries.push({ id, label: id, baseX: b.baseX, baseY: b.baseY, scale: 1 });
    }

    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * The point-kind commit — the exact counterpart of `wireDrag`'s rect commit:
   * into this session's map, then straight out to the scene so the renderer
   * shows it before any export. `null` deletes (forage only).
   */
  private commitAnchor(screen: string, kind: AnchorKind, id: string, anchor: AnchorPoint | null): void {
    const edits = kind === "npc" ? this.editedNpcs : this.editedForage;
    if (anchor) (edits[screen] ??= {})[id] = anchor;
    else if (edits[screen]) delete edits[screen][id];
    if (kind === "npc") {
      if (anchor) this.deps.onNpcAnchorCommitted?.(screen, id, anchor);
    } else {
      this.deps.onForageAnchorCommitted?.(screen, id, anchor);
    }
    this.repaint();
  }

  /** A11 — a brand new forage dot, dropped in the centre of the view (which is
   * wherever the author has panned to) and immediately draggable. */
  private addForageSpot(): void {
    const screen = this.currentScreen;
    if (!screen) return;
    const taken = new Set([
      ...Object.keys(this.deps.forageAnchors?.[screen] ?? {}),
      ...Object.keys(this.editedForage[screen] ?? {}),
    ]);
    let n = taken.size + 1;
    while (taken.has(`spot_${n}`)) n++;
    const b = this.deps.pan.unplace(this.deps.viewWidth / 2, this.deps.viewHeight / 2);
    const picture = this.picture();
    this.commitAnchor(screen, "forage", `spot_${n}`, baseToAnchorPoint(b.baseX, b.baseY, picture.width, picture.height));
  }

  /**
   * A11 — a brand new EXAMINE region id, armed and ready to drag.
   *
   * The id is asked for, because a region id is authored vocabulary that has to
   * match `graph.json`'s own `region_id` when the export is pasted back. A
   * blocked or cancelled prompt falls back to a generated `r_new_N` rather than
   * doing nothing: this is a dev overlay, and a button that silently no-ops is
   * worse than one that names the thing for you.
   */
  private addExamineRegion(): void {
    const screen = this.currentScreen;
    if (!screen) return;
    const taken = new Set(this.paletteIds());
    let n = 1;
    while (taken.has(`r_new_${n}`)) n++;
    const suggested = `r_new_${n}`;
    let asked: string | null = null;
    try {
      asked = window.prompt?.("new examine region id", suggested) ?? null;
    } catch {
      asked = null;
    }
    const id = (asked ?? "").trim() || suggested;
    const list = (this.addedIds[screen] ??= []);
    if (!taken.has(id) && !list.includes(id)) list.push(id);
    // Armed on creation, so the next drag on the backdrop shapes it — one
    // gesture from "new region" to "region with geometry."
    this.kind = "examine";
    this.armed = { kind: "examine", id };
    this.repaint();
  }

  private wireDrag(): void {
    const { scene, pan } = this.deps;
    scene.input.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // A point kind (A10/A11) spends the drag gesture on its own handles, so
        // the rect drag must not also start underneath them — `armed` survives
        // a chip flip on purpose (see `kind`'s header), and without this a
        // stale armed examinable would quietly draw a rect while the author
        // thought they were moving an NPC.
        if (!this.active || !this.armed || over.length > 0) return;
        if (this.kind === "npc" || this.kind === "forage") return;
        // Stored pan-relative: the picture may well have eased under the
        // pointer between press and release, and the rect must describe the
        // painting, not the pixels the mouse happened to cross.
        this.dragOrigin = pan.unplace(pointer.x, pointer.y);
      },
    );
    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragOrigin) return;
      const now = pan.unplace(pointer.x, pointer.y);
      const baseX = Math.min(this.dragOrigin.baseX, now.baseX);
      const baseY = Math.min(this.dragOrigin.baseY, now.baseY);
      const w = Math.abs(now.baseX - this.dragOrigin.baseX);
      const h = Math.abs(now.baseY - this.dragOrigin.baseY);
      const at = pan.place(baseX + w / 2, baseY + h / 2);
      this.dragPreview?.destroy();
      this.dragPreview = scene.add
        .rectangle(at.x, at.y, w, h, COLOR.canvas, 0.12)
        .setStrokeStyle(2, COLOR.canvas, 0.9)
        .setDepth(31);
    });
    scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const armed = this.armed;
      if (!this.dragOrigin || !armed || !this.currentScreen) {
        this.dragOrigin = null;
        this.dragPreview?.destroy();
        this.dragPreview = undefined;
        return;
      }
      const now = pan.unplace(pointer.x, pointer.y);
      const baseX = Math.min(this.dragOrigin.baseX, now.baseX);
      const baseY = Math.min(this.dragOrigin.baseY, now.baseY);
      const w = Math.abs(now.baseX - this.dragOrigin.baseX);
      const h = Math.abs(now.baseY - this.dragOrigin.baseY);
      this.dragOrigin = null;
      this.dragPreview?.destroy();
      this.dragPreview = undefined;
      // A click with no real drag draws nothing — a 2px rect is a mis-click,
      // not a hotspot.
      if (w < 8 || h < 8) return;
      // Normalized against the PICTURE, which is what `regions.json` fractions
      // have always claimed to be (`HotspotPlacement`'s header) and what they
      // now actually are.
      const picture = this.picture();
      const topLeft = baseToPicturePixels(baseX, baseY, picture);
      const rect = pixelDragToRegionRect(topLeft.x, topLeft.y, w, h, picture.width, picture.height);
      // THE ONE PLACE THE TWO KINDS DIVERGE. Same drag, same arithmetic, same
      // pan correction — only the destination map and the live-commit seam
      // differ, which is the whole argument for extending this editor instead
      // of building a second one.
      const target = this.editsFor(armed.kind);
      (target[this.currentScreen] ??= {})[armed.id] = rect;
      // Live to the player the moment it is drawn — the fix for "edit mode
      // sets regions but then the regions are not hoverable or clickable."
      // For a move that also means the dashed box jumps off its fallback
      // margin position onto the drawn rect on the next render.
      if (armed.kind === "examine") this.deps.onRegionCommitted?.(this.currentScreen, armed.id, rect);
      else this.deps.onMoveRegionCommitted?.(this.currentScreen, armed.id, rect);
      this.repaint();
    });
  }

  private exportToClipboard(): void {
    // ALL FOUR maps, each merged onto its own boot-time base — see
    // `regionsFilePayload` and `anchorsFilePayload`. `moves` used to pass
    // through untouched here; it carries this session's authored geometry now,
    // and `npcs`/`forage` (A10/A11) join it. The spread is what keeps the file
    // WHOLE: emit one payload alone and pasting it silently deletes the other
    // two maps.
    const json = JSON.stringify(
      {
        ...regionsFilePayload(this.deps.initialRegions, this.edited, this.deps.moveRegions, this.editedMoves),
        ...anchorsFilePayload(
          this.deps.npcAnchors ?? {},
          this.editedNpcs,
          this.deps.forageAnchors ?? {},
          this.editedForage,
        ),
      },
      null,
      2,
    );
    console.log("[edit-mode] regions.json — paste into public/story/regions.json:\n" + json);
    navigator.clipboard?.writeText(json).catch(() => {
      console.warn("[edit-mode] clipboard write failed — copy the console output above instead.");
    });
    if (this.statusText) this.statusText.setText("exported — see console (and clipboard, if it worked).");
  }

  private clear(): void {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    this.boxes = [];
    this.statusText = undefined;
    this.dragPreview?.destroy();
    this.dragPreview = undefined;
    this.dragOrigin = null;
  }
}
