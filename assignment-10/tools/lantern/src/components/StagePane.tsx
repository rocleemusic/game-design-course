import { useMemo, useState, type ReactNode } from "react";
import type { Day, Graph, Screen } from "../types";
import type { PlayView } from "../lib/play";
import { MarkerLayer } from "./MarkerLayer";
import { imageUrl, type ContentEntry, type Note } from "../lib/bridge";
import { pendingPlacements, placementLabel, type Placement } from "../lib/placeNote";
import { soulName, soulNames } from "../lib/souls";
import {
  decideStagePath,
  rectToCss,
  type Rect,
  stageExaminables,
  stageExits,
  stageItems,
  stagePresence,
  type StageExaminable,
  type StageExit,
  type StageItem,
  type StagePresence,
} from "../lib/stage";

/**
 * Mode B stage: the current screen during play.
 *
 * Image path — manifest.json names an image and it loads: the image renders
 * with region hotspots (soft dashed outlines) from the screen_spec regions in
 * graph.json, normalized 0-1 coords mapped to CSS percentages. Regions with
 * null shapes (the real-data specs until art exists) keep their interactions
 * as text buttons under the image.
 *
 * Fallback path — no manifest entry, or the image fails to load: the same
 * interactions as a stacked text-button list. The tool never blocks on art.
 *
 * NPC presence markers have no geometry in any spec, so they always render
 * as a marker strip (silhouette + name + Converse), on both paths.
 */

export interface StageActions {
  onExit: (screenId: string) => void;
  onConverse: (sceneId: string) => void;
  onExamine: (address: string) => void;
  onPickup: (slotId: string, item: string) => void;
  onAdvanceTime: () => void;
  /** D6 — pack-triage: bank now and end the day early. Returns false (no-op)
   *  when "End the day" is not currently offered. */
  onPackTriage: () => void;
}

function itemLabel(it: StageItem): string {
  if (it.picked) return `${it.slot_id} — picked`;
  if (it.item === "empty") return `${it.slot_id} — empty`;
  return `Pick up ${it.item} (${it.slot_id})`;
}

function ItemButton(props: { it: StageItem; act: StageActions }) {
  const { it, act } = props;
  return (
    <button
      className={`stage-item${it.picked ? " picked" : ""}`}
      disabled={!it.rolled}
      onClick={() => act.onPickup(it.slot_id, it.item)}
      aria-label={itemLabel(it)}
    >
      {itemLabel(it)}
    </button>
  );
}

function PresenceStrip(props: {
  npcs: StagePresence[];
  act: StageActions;
  /** soul_id -> authored name; people are shown by name, never by id */
  nameOf: (soulId: string) => string;
}) {
  if (props.npcs.length === 0)
    return <p className="stage-note">No one here this time block.</p>;
  return (
    <div className="npc-strip" aria-label="present npcs">
      {props.npcs.map((n) => (
        <span key={n.soul} className="npc-marker">
          <span className="npc-silhouette" aria-hidden="true" />
          <span className="npc-name">
            {props.nameOf(n.soul)}
            {n.conversed && (
              <span className="npc-check" title="conversed today">
                {" "}
                ✓
              </span>
            )}
          </span>
          {n.scene_id ? (
            <button
              onClick={() => props.act.onConverse(n.scene_id!)}
              aria-label={`converse with ${props.nameOf(n.soul)}`}
            >
              Converse
            </button>
          ) : (
            <span className="stage-note">no scene here</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ExitStrip(props: { exits: StageExit[]; act: StageActions }) {
  if (props.exits.length === 0) return null;
  return (
    <div className="exit-strip" aria-label="exits">
      {props.exits.map((e) => (
        <button
          key={e.to}
          disabled={!e.resolvable}
          title={e.resolvable ? undefined : `${e.to} is not in this graph`}
          onClick={() => props.act.onExit(e.to)}
          aria-label={`go to ${e.name}`}
        >
          Go to {e.name}
          {e.seam ? ` (seam: ${e.seam})` : ""}
        </button>
      ))}
    </div>
  );
}

/**
 * D6 (GDD 03-core-loop.md:14): the satchel is capped (SATCHEL_CAPACITY) —
 * "you carry from the screen only what fits the satchel." Once full, any
 * further pickup spills into a small arms-carry buffer instead, kept only if
 * the player pack-triages: banks now and ends the day early instead of
 * leaving the item behind ("bank a full pack plus what you can carry in
 * your arms").
 */
function SatchelStrip(props: {
  satchel: string[];
  satchelCapacity: number;
  arms: string[];
  armsCapacity: number;
  act: StageActions;
}) {
  const full = props.satchel.length >= props.satchelCapacity;
  const hasArms = props.arms.length > 0;
  return (
    <div className="satchel-strip" aria-label="satchel">
      <span className="hint">
        satchel · {props.satchel.length}/{props.satchelCapacity}
        {full ? " — full" : ""}
      </span>
      {props.satchel.length === 0 && <span className="hint">— empty</span>}
      {props.satchel.map((item, i) => (
        <span key={`${item}-${i}`} className="satchel-chip">
          {item}
        </span>
      ))}
      {hasArms && (
        <>
          <span className="hint" aria-label="arms-carry">
            arms · {props.arms.length}/{props.armsCapacity}
          </span>
          {props.arms.map((item, i) => (
            <span key={`arms-${item}-${i}`} className="satchel-chip arms-chip">
              {item}
            </span>
          ))}
        </>
      )}
      {(full || hasArms) && (
        <button
          className="pill-primary"
          onClick={props.act.onPackTriage}
          aria-label="pack-triage: bank now and end the day early"
          title="Bank what you're carrying and head home now, before the day would otherwise end"
        >
          Pack-triage — bank &amp; head home
        </button>
      )}
    </div>
  );
}

/** The image with region hotspots; geometry-less interactions drop below. */
function StageImage(props: {
  src: string;
  screen: Screen;
  items: StageItem[];
  exams: StageExaminable[];
  act: StageActions;
  onImgError: () => void;
  /** L8: region authoring, active ONLY in an explicit Place-markers mode */
  markers?: ReactNode;
  /**
   * D8 follow-up: outstanding placement REQUESTS, drawn on the image itself
   * rather than inside the authoring layer.
   *
   * They used to live in MarkerLayer, which exists only while Place-markers is
   * on — so a confirmed placement disappeared the moment you finished placing,
   * while a declared region stayed put as a hotspot. That asymmetry is exactly
   * backwards for reviewing: the proposals are the thing you came back to look
   * at. They belong to the screen, not to the mode that authored them.
   *
   * Inert by construction — a div, never a button. A pending placement has no
   * region_id and no ink stitch behind it, so there is nothing to click.
   */
  ghosts?: Placement[];
}) {
  return (
    <div className="stage-imgwrap">
      <img
        className="stage-img"
        src={props.src}
        alt={`${props.screen.name} greybox`}
        onError={props.onImgError}
      />
      {props.items
        .filter((it) => it.rect)
        .map((it) => (
          <button
            key={it.slot_id}
            className={`hotspot hotspot-item${it.picked ? " picked" : ""}`}
            style={rectToCss(it.rect!)}
            disabled={!it.rolled}
            onClick={() => props.act.onPickup(it.slot_id, it.item)}
            aria-label={itemLabel(it)}
            title={itemLabel(it)}
          >
            <span className="hotspot-label">
              {it.picked || it.item === "empty" ? "" : it.item}
            </span>
          </button>
        ))}
      {props.exams
        .filter((ex) => ex.rect)
        .map((ex) => (
          <button
            key={ex.id}
            className="hotspot hotspot-exam"
            style={rectToCss(ex.rect!)}
            onClick={() => props.act.onExamine(ex.address)}
            aria-label={`examine ${ex.id}`}
            title={`examine ${ex.id}`}
          >
            <span className="hotspot-label">{ex.id}</span>
          </button>
        ))}
      {(props.ghosts ?? []).map((p, i) => (
        <div
          key={`ghost-${i}-${p.id ?? "general"}`}
          className="place-ghost"
          style={rectToCss(p.rect)}
          data-testid="pending-marker"
          title={`proposed: ${placementLabel(p)} (${p.kind}) — a note to the pipeline, not a region`}
        >
          <span className="hotspot-label">{placementLabel(p)}</span>
        </div>
      ))}
      {props.markers}
    </div>
  );
}

export function StagePane(props: {
  graph: Graph;
  day: Day | null;
  manifest: Record<string, string> | null;
  dir: string;
  view: PlayView | null;
  act: StageActions;
  /** L8: commit geometry for a declared region. Absent = authoring disabled. */
  onRegionShape?: (screenId: string, regionId: string, oldShape: unknown, rect: Rect) => void;
  /**
   * D8: a formatted placement note for something the screen does NOT declare.
   * Optional so every existing caller keeps working; absent means the marker
   * layer offers no new-placement chip. It is a note, never a region write.
   */
  onPlaceNote?: (body: string) => void;
  /** D8: generated content index, for the placement dialog's id picker */
  contentIndex?: ContentEntry[] | null;
  /**
   * D8 follow-up: the run's notes, the ONLY source of the pending-placement
   * markers. Read here rather than kept in the marker layer's state so a
   * confirmed placement survives a reload — the note does, so the marker does.
   */
  notes?: Note[];
  /**
   * L9 — how many (screen_id, region_id) placements are sitting in memory,
   * not yet written to disk. Absent/0 renders no Apply control at all.
   */
  pendingRegionCount?: number;
  /** L9 — flush every pending placement to <dir>/regions.json in one write. */
  onApplyRegions?: () => void;
  /**
   * Gesture-machine pass — dragging a ghost that carries `source` rewrites
   * that placement's rect via a note update, never a region commit. Absent
   * means a ghost drag is inert (MarkerLayer only grabs a ghost when this and
   * the ghost's own `source` are both present).
   */
  onAdjustPlacement?: (placement: Placement, newRect: Rect) => void;
}) {
  // Optimistic per-image health: assume a manifested image loads; the img
  // error event flips it and the pane falls back to the text-button list.
  //
  // Keyed by screen_id, NOT by image path (bug 4). Several screens may point at
  // one placeholder image, and keying by path made a single failure break every
  // screen sharing it — the same shared-key shape as the flag-everything bug.
  /** L8: region authoring is a MODE, off by default — a mis-click during
   *  playtest must never move geometry. */
  const [placing, setPlacing] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const [brokenScreens, setBrokenScreens] = useState<ReadonlySet<string>>(
    new Set()
  );

  const names = useMemo(() => soulNames(props.graph), [props.graph]);

  const v = props.view;
  const screenId = v?.pos.currentScreen ?? null;
  const screen = props.graph.screens.find((s) => s.screen_id === screenId);

  // Derived from the notes every render — no local placement state anywhere,
  // so nothing to lose on reload and nothing to keep in sync. Computed above
  // the early return because it is a hook.
  const placements = useMemo(
    () => pendingPlacements(props.notes, screenId),
    [props.notes, screenId]
  );

  if (!v || !screen) {
    // Without a compiled story there is no play view, so these buttons look
    // live and do nothing. Say why instead of rendering dead controls.
    const noStory = !v;
    return (
      <section className="pane stage-pane" aria-label="stage">
        <h2 className="pane-title">
          Stage{" "}
          <span className="hint">
            {noStory ? "not playable yet" : "no screen yet — enter one"}
          </span>
        </h2>
        <div className="stage-body">
          {noStory && (
            <p className="empty-note">
              No <code>story.json</code> in this run folder. The graph is
              reviewable, but play needs a compiled story — run{" "}
              <code>resolver build --emit-story</code> against this folder.
            </p>
          )}
          <div className="exit-strip">
            {props.graph.screens.map((s) => (
              <button
                key={s.screen_id}
                onClick={() => props.act.onExit(s.screen_id)}
                aria-label={`go to ${s.name}`}
              >
                Enter {s.name}
              </button>
            ))}
          </div>
          {v && (
            <SatchelStrip
              satchel={v.satchel}
              satchelCapacity={v.satchelCapacity}
              arms={v.arms}
              armsCapacity={v.armsCapacity}
              act={props.act}
            />
          )}
        </div>
      </section>
    );
  }

  const manifestPath = props.manifest?.[screen.screen_id] ?? null;
  const imageOk = manifestPath !== null && !brokenScreens.has(screen.screen_id);
  const path = decideStagePath(manifestPath, imageOk);

  const picked = new Set(v.pickedSlots);
  const items = stageItems(screen, props.day, picked);
  const exams = stageExaminables(screen);
  const npcs = stagePresence(
    props.graph,
    props.day,
    screen.screen_id,
    v.timeBlock,
    v.pos.visited
  );
  const exits = stageExits(props.graph, screen);

  // On the image path, only geometry-less interactions need buttons below;
  // on the fallback path, everything is a button.
  const listItems = path === "image" ? items.filter((it) => !it.rect) : items;
  const listExams = path === "image" ? exams.filter((ex) => !ex.rect) : exams;

  return (
    <section className="pane stage-pane" aria-label="stage">
      <h2 className="pane-title">
        Stage · {screen.name}
        <span className="hint">
          {v.timeBlock} ·{" "}
          {path === "image" ? "greybox image" : "no image — text buttons"}
        </span>
        {/* Region authoring is opt-in. Off, the marker layer does not exist,
            so playtest clicks can never move geometry. */}
        {path === "image" && props.onRegionShape && (
          <button
            className={placing ? "pill-primary" : "pill-quiet"}
            aria-pressed={placing}
            onClick={() => {
              setPlacing((p) => !p);
              setRegion(null);
            }}
          >
            {placing ? "Done placing" : "Place markers"}
          </button>
        )}
        {/* Visible whenever there is unapplied work — not gated on `placing`,
            so leaving the mode never hides that something still needs Apply. */}
        {(props.pendingRegionCount ?? 0) > 0 && props.onApplyRegions && (
          <button className="pill-primary" onClick={props.onApplyRegions}>
            {`${props.pendingRegionCount} placement${
              props.pendingRegionCount === 1 ? "" : "s"
            } pending → Apply`}
          </button>
        )}
      </h2>
      <div className="stage-body">
        {path === "image" && manifestPath && (
          <StageImage
            src={imageUrl(props.dir, manifestPath)}
            screen={screen}
            items={items}
            exams={exams}
            act={props.act}
            onImgError={() =>
              setBrokenScreens((prev) => new Set(prev).add(screen.screen_id))
            }
            /* Drawn in every mode, unlike `markers` below — see StageImage. */
            ghosts={placements}
            markers={
              // Active ONLY in the explicit mode: a mis-click during playtest
              // must never move geometry (sign-off #5's spirit).
              placing && props.onRegionShape ? (
                <MarkerLayer
                  regions={screen.regions ?? []}
                  selected={region}
                  onSelect={setRegion}
                  onCommit={(regionId, oldShape, rect) =>
                    props.onRegionShape!(screen.screen_id, regionId, oldShape, rect)
                  }
                  /* D8. screenId and npcIds are read here rather than passed
                     down from App: this pane already holds the live screen and
                     already computes `names` off graph.souls, and a second
                     source for either would be a second thing to drift. */
                  screenId={screen.screen_id}
                  contentIndex={props.contentIndex ?? null}
                  npcIds={[...names.keys()]}
                  onPlaceNote={props.onPlaceNote}
                  placements={placements}
                  onAdjustPlacement={props.onAdjustPlacement}
                />
              ) : null
            }
          />
        )}

        {(listItems.length > 0 || listExams.length > 0) && (
          <div className="stage-list" aria-label="screen interactions">
            {listItems.map((it) => (
              <ItemButton key={it.slot_id} it={it} act={props.act} />
            ))}
            {listExams.map((ex) => (
              <button
                key={ex.id}
                onClick={() => props.act.onExamine(ex.address)}
                aria-label={`examine ${ex.id}`}
              >
                Examine {ex.id}
              </button>
            ))}
          </div>
        )}

        <PresenceStrip
          npcs={npcs}
          act={props.act}
          nameOf={(id) => soulName(names, id)}
        />
        <ExitStrip exits={exits} act={props.act} />
        <div className="stage-time">
          <button onClick={props.act.onAdvanceTime} aria-label="advance time block">
            Advance time · {v.timeBlock} ▸
          </button>
          <span className="hint">advances ink's clock and re-applies presence</span>
        </div>
        <SatchelStrip
          satchel={v.satchel}
          satchelCapacity={v.satchelCapacity}
          arms={v.arms}
          armsCapacity={v.armsCapacity}
          act={props.act}
        />
      </div>
    </section>
  );
}
