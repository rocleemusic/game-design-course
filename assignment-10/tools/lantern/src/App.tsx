import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadRun,
  postApprove,
  postEdit,
  postNote,
  postNoteResolve,
  postNoteUpdate,
  postRegions,
  postReroll,
  type Note,
  type RunPayload,
} from "./lib/bridge";
import {
  deletePendingRegionEntry,
  pendingRegionGet,
  regionMapGet,
  setPendingRegionEntry,
  type PendingRegionMap,
} from "./lib/regionMap";
import { parseRectShape, type Rect } from "./lib/stage";
import { placeNoteWithRect, placementLabel, type Placement } from "./lib/placeNote";
import { lastFolder, readRecentFolders, rememberFolder } from "./lib/folders";
import { noteOf, statusOf, textOf } from "./store";
import type { Artifact } from "./store";
import type { ReviewStatus } from "./types";
import {
  createHistory,
  editCommand,
  statusCommand,
  type Command,
} from "./state/commands";
import { buildGraphIndex, playStates } from "./lib/playMap";
import { LanternPlayer, type PlayView } from "./lib/play";
import { DEFAULT_BOND_TUNING } from "./lib/world";
import { paneSize } from "./lib/panes";
import { sceneIndex as buildSceneIndex, sceneCountOf } from "./lib/sceneIndex";
import { computeHealth } from "./lib/health";
import { reconcileNav, shouldAutoReload } from "./lib/reconcileNav";
import { soulName, soulNames } from "./lib/souls";
import { LevelView } from "./components/LevelView";
import { WeekView } from "./components/WeekView";
import { SceneView } from "./components/SceneView";
import { SceneRail } from "./components/SceneRail";
import { AssetsPanel } from "./components/AssetsPanel";
import { CastPanel } from "./components/CastPanel";
import { FestivalPanel } from "./components/FestivalPanel";
import { NotebookPanel } from "./components/NotebookPanel";
import { HealthReadout } from "./components/HealthReadout";
import { VariablesPanel } from "./components/VariablesPanel";
import { NotesPanel } from "./components/NotesPanel";
import { SweepPanel } from "./components/SweepPanel";
import { FlagsPanel } from "./components/FlagsPanel";
import { ThreadsPanel } from "./components/ThreadsPanel";
import { PlayPane } from "./components/PlayPane";
import { StagePane, type StageActions } from "./components/StagePane";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Splitter } from "./components/Splitter";
import { ViewHost } from "./components/ViewHost";
import {
  isPlayView,
  modeForViews,
  paneWith,
  viewDef,
  visibleViews,
  type PaneState,
  type ViewId,
} from "./lib/views";
import {
  levelModeFor,
  readPrefs,
  sceneListOpenFor,
  withCollapsed,
  writeCollapsed,
  writeLevelMode,
  writeSceneListOpen,
} from "./lib/prefs";
import type { LevelLayoutMode } from "./lib/levelLayout";
import type { ReviewApi } from "./components/reviewApi";

const DEFAULT_DIR = "fixtures";

/** defaults the shell seeds its size vars to when nothing is persisted */
const RAIL_W_DEFAULT = 340;
const SIDE_W_DEFAULT = 340;

/** dom ids — also the keys each host's stored preferences hang off */
const CENTRE_ID = "col-centre";
const RIGHT_ID = "col-right";

const LEVEL_MODE_DEFAULT: LevelLayoutMode = "constellation";

/** GP-53: the navigator's threads section collapses through the same
 *  persisted collapsed-list as the scene-rail groups; screen ids are
 *  SCR-*, so this sentinel can never collide with one. */
const THREADS_RAIL_KEY = "__threads__";

/** what each host opens on for a fresh run, layout restored from prefs */
function paneDefault(hostId: string, view: ViewId): PaneState {
  return {
    view,
    levelMode: levelModeFor(hostId, LEVEL_MODE_DEFAULT),
    sceneListOpen: sceneListOpenFor(hostId),
  };
}
const centreDefault = () => paneDefault(CENTRE_ID, "dialogue");
const rightDefault = () => paneDefault(RIGHT_ID, "level");

/**
 * Patch one region's shape into a RunPayload's graph. `rect: null` clears it —
 * the same shape a never-drawn region already has. Returns a NEW payload;
 * `commitRegionShape`'s do/undo both call this, so a rewound placement patches
 * the graph back to exactly what it looked like before.
 */
function patchGraphRegion(
  run: RunPayload,
  screen_id: string,
  region_id: string,
  rect: Rect | null
): RunPayload {
  return {
    ...run,
    graph: {
      ...run.graph,
      screens: run.graph.screens.map((s) =>
        s.screen_id !== screen_id
          ? s
          : {
              ...s,
              regions: (s.regions ?? []).map((reg) =>
                reg.region_id !== region_id ? reg : { ...reg, shape: rect ? { rect } : null },
              ),
            },
      ),
    },
  };
}

/**
 * Flatten a PendingRegionMap into the entries `postRegions` wants. Tombstones
 * (`rect: null`) pass straight through — the server's delete branch (D1) is
 * exactly what applies them.
 */
function entriesOf(
  map: PendingRegionMap
): { screen_id: string; region_id: string; rect: Rect | null }[] {
  const out: { screen_id: string; region_id: string; rect: Rect | null }[] = [];
  for (const [screen_id, regions] of Object.entries(map.screens)) {
    for (const [region_id, rect] of Object.entries(regions)) {
      out.push({ screen_id, region_id, rect });
    }
  }
  return out;
}

export default function App() {
  const [dirInput, setDirInput] = useState(DEFAULT_DIR);
  const [recent, setRecent] = useState<string[]>(() => readRecentFolders());
  const [run, setRun] = useState<RunPayload | null>(null);
  /**
   * D1 — the LATEST `run`, readable from inside an undo closure that was
   * created earlier (at the original placement's `do`, before an Apply may
   * have happened in between). `commitRegionShape`'s undo needs to know
   * whether a region is on disk RIGHT NOW, not whether it was on disk back
   * when the user first drew the rect; a plain closure over `run` would give
   * the stale, wrong answer.
   */
  const runRef = useRef<RunPayload | null>(null);
  useEffect(() => {
    runRef.current = run;
  }, [run]);
  const [error, setError] = useState<string | null>(null);
  const [screenId, setScreenId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [sweep, setSweep] = useState(false);
  const [varSel, setVarSel] = useState<string | null>(null);
  /**
   * L9 — geometry accumulates here, in memory, per gesture; Apply is the only
   * thing that reaches disk (postRegions). Cleared whenever the run folder
   * changes (see `load`'s `movedFolder` branch) or Apply succeeds.
   */
  const [pendingRegions, setPendingRegions] = useState<PendingRegionMap>({ screens: {} });

  /** Each host is self-contained — its own view and its own view settings. */
  const [centre, setCentre] = useState<PaneState>(centreDefault);
  const [right, setRight] = useState<PaneState>(rightDefault);
  const [rightVisible, setRightVisible] = useState(true);
  /** rail groups you folded away — open is the default, collapsing is opt-in */
  const [collapsed, setCollapsed] = useState<string[]>(() => readPrefs().collapsed);
  /** Focus mode: the navigator collapses and the right pane hides. */
  const [focusDialogue, setFocusDialogue] = useState(false);
  const playerRef = useRef<LanternPlayer | null>(null);
  const [playView, setPlayView] = useState<PlayView | null>(null);
  const [rerollNote, setRerollNote] = useState<string | null>(null);
  /** a reload arrived while a text field was open — offered, not applied */
  const [stale, setStale] = useState(false);
  /** the folder the SSE watcher is attached to; re-subscribes when it changes */
  const [runDir, setRunDir] = useState<string | null>(null);

  /** D8 #5: below this the masthead's zone-B toggles and zone C (utilities)
   *  collapse into a single dropdown — the CSS media query only ever hid
   *  three text items (app.css, 1100px); nothing restructured the layout.
   *  Read via window.innerWidth + a resize listener rather than matchMedia,
   *  which jsdom does not implement. */
  const [headerNarrow, setHeaderNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 860
  );
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  useEffect(() => {
    const onResize = () => setHeaderNarrow(window.innerWidth < 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Mode is read off the screen, never off a click: the tool is playing when a
   *  play surface is actually visible. A hidden right pane holds nothing. */
  const mode = useMemo(
    () => modeForViews(visibleViews(centre.view, right.view, rightVisible)),
    [centre.view, right.view, rightVisible]
  );

  /** the .shell grid element — splitters write their size vars here inline */
  const shellRef = useRef<HTMLDivElement>(null);
  /** navigator width stashed while focus-dialogue collapses it to zero */
  const stashRef = useRef<{ rail: string } | null>(null);

  const index = useMemo(
    () => (run ? buildGraphIndex(run.graph) : null),
    [run]
  );

  // Scene presence — one source of truth for the rail and the map badge.
  const sceneIdx = useMemo(
    () => (run ? buildSceneIndex(run.graph) : null),
    [run]
  );
  const countScenes = useCallback(
    (screenId: string) => (sceneIdx ? sceneCountOf(sceneIdx, screenId) : 0),
    [sceneIdx]
  );

  const health = useMemo(
    () =>
      run
        ? computeHealth(run.graph, run.manifest, run.approvals, run.edits, run.day)
        : null,
    [run]
  );

  /**
   * The folder currently on screen — a reload of the same one is not a move.
   *
   * Every write targets THIS, never `dirInput`. `dirInput` is the text box, so
   * typing a path without pressing Load used to send approvals and edits to a
   * folder that was never opened (bug 6). Null means nothing is loaded, and a
   * write with nothing loaded is a no-op rather than a guess.
   */
  const loadedDirRef = useRef<string | null>(null);

  /**
   * Undo history. A ref, not state: commands hold async closures, which are
   * not serializable and would double-invoke under StrictMode. `histVersion`
   * exists only so the controls re-render when the stack moves.
   *
   * Declared before `load` because loading a different folder clears it.
   */
  const historyRef = useRef(createHistory());
  const [histVersion, setHistVersion] = useState(0);

  /**
   * Bumps whenever a design token changes. Card heights are MEASURED, so a
   * text-size change reflows every card; the graph must re-measure or the
   * nodes overlap. This is the signal the old `nodeHeight()` could not send.
   */
  const [styleEpoch, setStyleEpoch] = useState(0);

  const load = useCallback(async (dir: string) => {
    try {
      setError(null);
      const payload = await loadRun(dir);
      const movedFolder = loadedDirRef.current !== dir;
      loadedDirRef.current = dir;
      setRunDir(dir);
      setStale(false);
      setRun(payload);
      // only a folder that actually loaded is worth offering again
      setRecent(rememberFolder(dir));

      // Reset the workspace only when you actually moved to a different run.
      // Re-reading the same folder must leave your panes, selection and layout
      // alone — otherwise a live-reload would throw you back to the defaults
      // on every save.
      if (movedFolder) {
        // History belongs to one run's record files — undoing into a folder
        // you have left would write to the wrong place.
        historyRef.current.clear();
        setHistVersion((v) => v + 1);
        setScreenId(null);
        setSceneId(null);
        setCentre(centreDefault);
        setRight(rightDefault);
        setRightVisible(true);
        // drop any collapsed-flank state so the size vars and the toggle agree
        setFocusDialogue(false);
        stashRef.current = null;
        // Unapplied geometry belongs to one run folder's record files — moving
        // to another folder must not carry it along or silently drop it later.
        setPendingRegions({ screens: {} });
      }
      // the story is rebuilt either way — a reload may have recompiled it
      playerRef.current = null;
      setPlayView(null);
      setRerollNote(null);
    } catch (e) {
      // nothing is open, so nothing may be written to
      loadedDirRef.current = null;
      setRun(null);
      setError(String(e instanceof Error ? e.message : e));
    }
  }, []);

  // Reopen where you left off; the bundled fixtures are the first-run default.
  useEffect(() => {
    const start = lastFolder() ?? DEFAULT_DIR;
    setDirInput(start);
    void load(start);
  }, [load]);

  /** Pick a folder from the dropdown: it becomes the input and loads at once. */
  const openFolder = useCallback(
    (dir: string) => {
      if (!dir) return;
      setDirInput(dir);
      void load(dir);
    },
    [load]
  );

  const refreshPlay = useCallback(() => {
    setPlayView(playerRef.current ? playerRef.current.view() : null);
  }, []);

  const startPlay = useCallback(() => {
    if (!run?.story || !index) return;
    // Bond tuning rides graph.json (stamped there from tuning.json at build).
    // A graph built before W1a has no bond block, so the player falls back to
    // its own defaults rather than scoring nothing.
    const player = new LanternPlayer(
      run.story,
      index,
      run.day,
      run.graph?.bond ?? DEFAULT_BOND_TUNING,
      run.days,
    );
    player.continueOnce(); // through day_start: TimeOfDay set, hub reached
    playerRef.current = player;
    setPlayView(player.view());
  }, [run, index]);

  const playAct = useCallback(
    (fn: (p: LanternPlayer) => void) => {
      const p = playerRef.current;
      if (!p) return;
      fn(p);
      refreshPlay();
    },
    [refreshPlay]
  );

  // Showing a play surface is what starts the story — no separate play button
  // to fall out of step with the panes.
  useEffect(() => {
    if (mode === "play" && !playerRef.current) startPlay();
  }, [mode, startPlay]);

  /**
   * Exit play mode (D3): mode has always been DERIVED from whether a Stage or
   * Play view is on screen (views.ts's modeForViews), but there was no
   * explicit way OUT of it — the mode-pip was a plain, non-interactive
   * `<span>`, and the session was torn down only by loading a different run
   * folder (`load()`). Swap every pane currently showing a play surface back
   * to a review view (each host's own default: dialogue for centre, level
   * for right), so `mode` derives back to "review" on the next render, and
   * tear the session down the same way `load()` already does — a fresh
   * re-entry into play should not resume mid-transcript.
   */
  const exitPlay = useCallback(() => {
    setCentre((c) => (isPlayView(c.view) ? paneWith(c, { view: "dialogue" }) : c));
    setRight((r) => (isPlayView(r.view) ? paneWith(r, { view: "level" }) : r));
    playerRef.current = null;
    setPlayView(null);
    setRerollNote(null);
  }, []);

  /**
   * Leave a structural note. Not routed through the Command history: a note is
   * a message to the pipeline, and "undo my question" is not a thing anyone
   * means — unlike an approval, which is a verdict you can change your mind on.
   */
  const addNote = useCallback(
    (note: { target: string | null; kind: "structure" | "question" | "todo"; body: string }) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      void postNote(dir, note)
        .then((notes) => setRun((r) => (r ? { ...r, notes } : r)))
        .catch((e) => setError(String(e)));
    },
    []
  );

  /**
   * Flip one note's resolved flag (D4). `resolved` existed on `Note` since L7
   * with no UI writer at all — this is that write path, matched server-side
   * on (target, timestamp) since notes carry no other stable id.
   */
  const resolveNote = useCallback((note: Note, resolved: boolean) => {
    const dir = loadedDirRef.current;
    if (dir === null) return;
    void postNoteResolve(dir, { target: note.target, timestamp: note.timestamp }, resolved)
      .then((notes) => setRun((r) => (r ? { ...r, notes } : r)))
      .catch((e) => setError(String(e)));
  }, []);

  /**
   * Live variable values for the panel (L5a). Recomputed off `playView` so it
   * refreshes on every play action; `graph.variables` is the authoritative
   * declaration list, so the player never enumerates inkjs internals.
   */
  const liveVars = useMemo(() => {
    const p = playerRef.current;
    if (!p || !playView || !run) return null;
    return p.peekVars(run.graph.variables.map((v) => v.name));
  }, [playView, run]);

  const forced = playerRef.current?.isForced() ?? false;

  /**
   * Set a variable by hand. Routed through a Command so Ctrl+Z undoes a forced
   * state like any other mutation — the inverse is simply the prior value,
   * read before the write.
   *
   * Unlike approvals and edits this touches only the in-memory story, never a
   * file, so nothing on disk needs reconciling.
   */
  const setVariable = useCallback(
    (name: string, raw: string) => {
      const p = playerRef.current;
      if (!p) return;
      const before = p.peekVar(name);
      // A numeric-looking entry becomes a number: ink's `day` and
      // `bondLevel_*` are ints, and setting them to the string "4" would
      // compare false against every `day >= 4` guard.
      const next: string | number = raw.trim() !== "" && !Number.isNaN(Number(raw))
        ? Number(raw)
        : raw;
      void historyRef.current
        .run({
          label: `set ${name}`,
          do: async () => {
            p.setVar(name, next);
            refreshPlay();
          },
          undo: async () => {
            if (before !== null && (typeof before === "string" || typeof before === "number")) {
              p.setVar(name, before);
            }
            refreshPlay();
          },
        })
        .then(() => setHistVersion((v) => v + 1));
    },
    [refreshPlay]
  );

  /**
   * Re-roll one day for real (D2): the resolver's own resolveDay/applyOutcome
   * via the dev bridge, fed the seed control's actual slot/life/day plus the
   * running session's own world state — not a re-read of whatever day.json
   * already said (the old reroll ignored all three of its own arguments).
   *
   * `movedThreads` is `WorldState.movedThreads()` off the live player: the
   * host's day-end record of thread_move events, so `DayOutcome.moved_threads`
   * reaches `applyOutcome` (week.ts) the way the resolver has always expected
   * a caller to feed it. `pickedLocation` is the Home Hub calendar's pick,
   * read back off the story's own `pickedLocation` VAR — the resolver's
   * DayInput.picked_location contract (types.ts). Both are optional: a reroll
   * before any session has run yet still resolves a day, off the run folder's
   * remembered state (see vite.config.ts's resolveRerollDay).
   */
  const reroll = useCallback(
    async (slot: number, life: number, day: number) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      const p = playerRef.current;
      const movedThreads = p ? p.world.movedThreads() : [];
      const pickedLocationRaw = p ? p.peekVar("pickedLocation") : null;
      const pickedLocation =
        typeof pickedLocationRaw === "string" && pickedLocationRaw !== "none"
          ? pickedLocationRaw
          : undefined;
      try {
        const day_ = await postReroll(dir, { slot, life, day, movedThreads, pickedLocation });
        setRun((r) => (r ? { ...r, day: day_ } : r));
        playAct((p) => p.applyDay(day_));
        setRerollNote(
          `resolved day ${day_.day} (slot ${slot}, life ${life})` +
            (movedThreads.length ? ` · moved threads: ${movedThreads.join(", ")}` : "") +
            (pickedLocation ? ` · picked_location: ${pickedLocation}` : "")
        );
      } catch (e) {
        setRerollNote(String(e instanceof Error ? e.message : e));
      }
    },
    [playAct]
  );

  // Auto-follow: the graph tracks the running story's position.
  useEffect(() => {
    if (mode !== "play" || !playView || !index || !run) return;
    const pos = playView.pos;
    const scene =
      (pos.currentLine && index.sceneOfLine.get(pos.currentLine)) ||
      (pos.currentChoice && index.sceneOfChoice.get(pos.currentChoice)) ||
      null;
    if (scene) {
      setScreenId(scene.screen_id);
      setSceneId(scene.scene_id);
    } else if (pos.currentScreen) {
      setScreenId(pos.currentScreen);
    }
  }, [mode, playView, index, run]);

  /**
   * The two raw writes. Commands compose these; nothing else calls them, so
   * every mutation that reaches disk is undoable by construction.
   *
   * They throw rather than swallow, because a command must not be recorded
   * when its write failed — `history.run` relies on that.
   */
  const writeStatus = useCallback(
    async (id: string, status: ReviewStatus | "pending", note?: string) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      const approvals = await postApprove(dir, id, status, note);
      setRun((r) => (r ? { ...r, approvals } : r));
    },
    []
  );

  const writeEdit = useCallback(
    async (target: string, oldText: string, newText: string) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      const edits = await postEdit(dir, {
        target,
        old_text: oldText,
        new_text: newText,
      });
      setRun((r) => (r ? { ...r, edits } : r));
    },
    []
  );

  /**
   * The history's state, read once per change. Derived through `histVersion`
   * so the dependency is explicit — calling `historyRef.current.canUndo()`
   * straight from the render would read a mutable ref and only happen to be
   * correct because some other state change forced the re-render.
   */
  const histState = useMemo(
    () => ({
      canUndo: historyRef.current.canUndo(),
      canRedo: historyRef.current.canRedo(),
      ...historyRef.current.labels(),
    }),
    [histVersion]
  );

  const runCommand = useCallback(async (cmd: Command) => {
    try {
      await historyRef.current.run(cmd);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
    setHistVersion((v) => v + 1);
  }, []);

  /**
   * Commit region geometry (L9). NOT a network call — geometry accumulates in
   * `pendingRegions` and only reaches disk when Apply is clicked. Routed
   * through the same Command history every other mutation uses (`runCommand`)
   * so a placement gets a label, counts against the history limit, and undoes
   * like anything else.
   *
   * `before` is read OUTSIDE the do/undo closures, the same idiom as
   * `setVariable`: a pending entry wins over the graph's current shape (so a
   * second placement before Apply undoes back to the FIRST placement, not the
   * on-disk shape), and undoing past every pending edit falls through to
   * whatever the graph already had. `pendingRegionGet` (not `regionMapGet`)
   * because a pending tombstone (`null`, "delete on Apply") must win over
   * `old_shape` too — a `??` fallback would treat the tombstone as "nothing
   * pending" and read the wrong `before`.
   *
   * D1: when `before` is null, undo has two different jobs depending on
   * whether that null region is already sitting in `regions.json`:
   *   - If it IS on disk (the region was placed and Applied, and this undo is
   *     rewinding that placement), the pending map needs a TOMBSTONE, not a
   *     deleted key — deleting a key that isn't there is a silent no-op, so
   *     Apply would never remove the stale rect from disk (the bug this
   *     fixes).
   *   - If it is NOT on disk (nothing was ever Applied for this region),
   *     there is nothing to revert on disk, so undo just clears the pending
   *     key — the old, still-correct behaviour.
   * `runRef` (not the closed-over `run`) because this undo closure was built
   * back when the rect was first drawn, possibly before an Apply happened —
   * the on-disk check has to read whatever is true NOW.
   */
  const commitRegionShape = useCallback(
    (screen_id: string, region_id: string, old_shape: unknown, rect: Rect) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      const existing = pendingRegionGet(pendingRegions, screen_id, region_id);
      const before = existing !== undefined ? existing : parseRectShape(old_shape);
      void runCommand({
        label: `place ${region_id}`,
        do: async () => {
          setPendingRegions((p) => setPendingRegionEntry(p, screen_id, region_id, rect));
          setRun((r) => (r ? patchGraphRegion(r, screen_id, region_id, rect) : r));
        },
        undo: async () => {
          if (before === null) {
            const onDisk =
              regionMapGet(runRef.current?.regions ?? { screens: {} }, screen_id, region_id) !== null;
            setPendingRegions((p) =>
              onDisk
                ? setPendingRegionEntry(p, screen_id, region_id, null)
                : deletePendingRegionEntry(p, screen_id, region_id)
            );
          } else {
            setPendingRegions((p) => setPendingRegionEntry(p, screen_id, region_id, before));
          }
          setRun((r) => (r ? patchGraphRegion(r, screen_id, region_id, before) : r));
        },
      });
    },
    [pendingRegions, runCommand]
  );

  /**
   * Apply — the only path pending geometry takes to disk (postRegions). This
   * is deliberately NOT a Command: it persists what is already on screen
   * rather than mutating it, and making it undoable would recreate the
   * drain-on-success semantics (autoclear on every successful write) that L9
   * deliberately deleted. Failure keeps `pendingRegions` untouched — unapplied
   * work is never lost to a network error.
   */
  const applyRegions = useCallback(async () => {
    const dir = loadedDirRef.current;
    if (dir === null) return;
    const entries = entriesOf(pendingRegions);
    if (entries.length === 0) return;
    try {
      const regions = await postRegions(dir, entries);
      setRun((r) => (r ? { ...r, regions } : r));
      setPendingRegions({ screens: {} });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  }, [pendingRegions]);

  const pendingRegionCount = useMemo(
    () => entriesOf(pendingRegions).length,
    [pendingRegions]
  );

  /**
   * Adjust a pending placement's rect (D8 follow-up, ghost-move gesture).
   *
   * A ghost with no `source` cannot be rewritten — there is no note to find
   * it again — so this is a no-op rather than a throw.
   *
   * Routed through the SAME `runCommand`/history path everything else uses,
   * so a drag on a ghost is undoable like any other mutation. UNLIKE
   * `commitRegionShape`, this writes to disk on every step (do AND undo) —
   * that is deliberate, not an inconsistency to "fix":
   *
   *   - A placement's rect has no in-memory home the way region geometry has
   *     `pendingRegions`. The note body IS the only storage for it — there is
   *     no separate pending map to patch, and no Apply step to defer to.
   *   - The (target, timestamp) key is stable across `postNoteUpdate` calls
   *     (the server rewrites in place, never re-stamping), so the inverse
   *     write always finds the same note and round-trips cleanly no matter
   *     how many times the ghost gets dragged and undone.
   *
   * `commitRegionShape` staying in memory until Apply, and this hitting disk
   * every time, are both correct for what each one is.
   */
  const adjustPlacement = useCallback(
    (placement: Placement, rect: Rect) => {
      const dir = loadedDirRef.current;
      if (dir === null) return;
      const source = placement.source;
      if (!source) return; // a ghost with no source cannot be rewritten
      const before = source.body;
      const after = placeNoteWithRect(before, rect);
      const key = { target: source.target, timestamp: source.timestamp };
      void runCommand({
        label: `adjust ${placementLabel(placement)}`,
        do: async () => {
          const notes = await postNoteUpdate(dir, key, after);
          setRun((r) => (r ? { ...r, notes } : r));
        },
        undo: async () => {
          const notes = await postNoteUpdate(dir, key, before);
          setRun((r) => (r ? { ...r, notes } : r));
        },
      });
    },
    [runCommand]
  );

  const undo = useCallback(async () => {
    try {
      await historyRef.current.undo();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
    setHistVersion((v) => v + 1);
  }, []);

  const redo = useCallback(async () => {
    try {
      await historyRef.current.redo();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
    setHistVersion((v) => v + 1);
  }, []);

  /**
   * Live reload (L7). The dev bridge watches the run folder's INPUT files and
   * pushes an SSE event; the tool re-reads the same folder.
   *
   * THE CARRIED INVARIANT: a reload is not a user action. `load()` already
   * treats re-reading the same folder as a non-move (it only resets panes when
   * `movedFolder`), and `reconcileNav` keeps the selection pointing at whatever
   * still exists. Without both, every file save would throw you back to the
   * defaults — which is the difference between helpful and infuriating.
   *
   * A reload is HELD while a textarea is open, because applying one under
   * someone's cursor eats what they are typing. The banner offers it instead.
   */
  useEffect(() => {
    const dir = loadedDirRef.current;
    if (!dir) return;
    // jsdom has no EventSource, and neither does a production build served
    // without the dev bridge. Live reload is an enhancement, so its absence is
    // a quiet no-op rather than a crash.
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`/__bridge/watch?dir=${encodeURIComponent(dir)}`);
    source.addEventListener("changed", () => {
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el?.tagName === "TEXTAREA" || el?.tagName === "INPUT" || !!el?.isContentEditable;
      if (!shouldAutoReload({ editing })) {
        setStale(true);
        return;
      }
      void load(dir);
    });
    // EventSource reconnects on its own; a dev-server restart is expected and
    // is not worth surfacing as an error.
    return () => source.close();
  }, [load, runDir]);

  /**
   * Keep the selection pointing at something that still exists after a reload,
   * and say what was dropped rather than letting it vanish.
   */
  useEffect(() => {
    if (!run) return;
    const { next, lost, unchanged } = reconcileNav(run.graph, {
      screenId,
      sceneId,
      selectedNodeId: null,
    });
    if (unchanged) return;
    setScreenId(next.screenId);
    setSceneId(next.sceneId);
    if (lost.length) setRerollNote(lost.join(" · "));
  }, [run]);

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redoes — but never while a
  // text field is open, where the browser's own undo belongs to the textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || el?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        void redo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /** soul_id -> authored name, built once per graph */
  const names = useMemo(
    () => (run ? soulNames(run.graph) : new Map<string, string>()),
    [run]
  );

  const api: ReviewApi = useMemo(() => {
    const approvals = run?.approvals ?? {};
    const edits = run?.edits ?? [];

    const playing = mode === "play" && playView !== null && index !== null;
    // Play states come from the tag stream. A run with no story.json simply has
    // none — the milestone-1 placeholder states are gone.
    const real = playing ? playStates(index!, playView!.pos) : null;

    const varIds = new Set<string>();
    if (varSel && run) {
      const v = run.graph.variables.find((x) => x.name === varSel);
      if (v) [...v.readers, ...v.writers].forEach((id) => varIds.add(id));
    }

    return {
      statusOf: (id) => statusOf(approvals, id),
      noteOf: (id) => noteOf(approvals, id),
      soulName: (id) => soulName(names, id),
      textOf: (target, original) => textOf(edits, target, original),
      // current glows, visited traces warm, everything else dims in play mode
      playState: (id) => (real ? (real.get(id) ?? "dim") : null),
      sweepDim: (id) => {
        if (!sweep) return false;
        const st = statusOf(approvals, id);
        return st === "approved" || st === "edited";
      },
      varHit: (id) => varIds.has(id),

      // Every mutation goes through a Command, so it is undoable. The previous
      // state is snapshotted HERE, before the write — reading it inside the
      // command would capture the post-write value on a redo and make the
      // inverse a no-op.
      approve: (id) =>
        void runCommand(
          statusCommand(
            writeStatus,
            id,
            { status: "approved" },
            { status: statusOf(approvals, id), note: noteOf(approvals, id) },
            `approve ${id}`
          )
        ),
      flag: (id) => {
        // Cancel returns null and must call nothing at all. The old
        // `?? undefined` turned Cancel into "flag with no note" (bug 2).
        const note = window.prompt(`Flag ${id} — note (optional):`);
        if (note === null) return;
        void runCommand(
          statusCommand(
            writeStatus,
            id,
            { status: "flagged", note: note.trim() || undefined },
            { status: statusOf(approvals, id), note: noteOf(approvals, id) },
            `flag ${id}`
          )
        );
      },
      clearStatus: (id) =>
        void runCommand(
          statusCommand(
            writeStatus,
            id,
            { status: "pending" },
            { status: statusOf(approvals, id), note: noteOf(approvals, id) },
            `clear ${id}`
          )
        ),
      saveEdit: (target, oldText, newText) => {
        // The edit is the approval-as-changed: mark the target's artifact
        // edited. Split on the LAST dot, matching resolver/src/edits.ts — an
        // edit target is "<id>.<field>", and ids themselves may contain dots,
        // so splitting on the first one marked the wrong artifact (bug 8).
        const dot = target.lastIndexOf(".");
        const artifactId = dot === -1 ? target : target.slice(0, dot);
        void runCommand(
          editCommand(
            writeEdit,
            writeStatus,
            {
              target,
              artifactId,
              oldText,
              newText,
              before: {
                status: statusOf(approvals, artifactId),
                note: noteOf(approvals, artifactId),
              },
            },
            `edit ${artifactId}`
          )
        );
      },
      jump: playing
        ? (id) => playAct((p) => void p.jumpTo(id))
        : undefined,
    };
  }, [
    run,
    sweep,
    varSel,
    writeStatus,
    writeEdit,
    runCommand,
    mode,
    playView,
    index,
    playAct,
  ]);

  // Stage actions all ride the existing jump path (ChoosePathString via the
  // graph's addresses), then continue once so the arriving line's tags land
  // and the graph's current-screen highlight follows.
  const stageActions: StageActions = useMemo(
    () => ({
      onExit: (screenId) =>
        playAct((p) => {
          if (p.jumpTo(screenId)) p.continueOnce();
        }),
      onConverse: (sceneId) =>
        playAct((p) => {
          if (p.jumpTo(sceneId)) p.continueOnce();
        }),
      onExamine: (address) =>
        playAct((p) => {
          if (p.jumpToAddress(address)) p.continueOnce();
        }),
      onPickup: (slotId, item) => playAct((p) => p.pickup(slotId, item)),
      onAdvanceTime: () => playAct((p) => p.advanceTime()),
      onPackTriage: () => playAct((p) => p.packTriage()),
    }),
    [playAct]
  );

  const collapsedSet = useMemo(() => new Set(collapsed), [collapsed]);

  const toggleCollapsed = useCallback((screenId: string) => {
    setCollapsed((prev) => {
      const next = withCollapsed(prev, screenId);
      writeCollapsed(next);
      return next;
    });
  }, []);

  const openScreen = useCallback((id: string) => {
    setScreenId(id);
    setSceneId(null);
  }, []);

  /** Open a specific scene (rail row / artifact jump): both ids at once. */
  const openScene = useCallback((screenId: string, sceneId: string) => {
    setScreenId(screenId);
    setSceneId(sceneId);
  }, []);

  const jumpToArtifact = useCallback((a: Artifact) => {
    setScreenId(a.screen_id);
    setSceneId(a.scene_id ?? null);
  }, []);

  /** Focus mode: collapse the navigator and hide the right pane, so the centre
   *  fills the width. Splitter drags write --rail-w inline on the shell, and
   *  inline beats a class — so we read/restore the live value off the ref. */
  const focusOnCentre = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    stashRef.current = {
      rail:
        el.style.getPropertyValue("--rail-w") ||
        `${paneSize("rail-w", RAIL_W_DEFAULT)}px`,
    };
    el.style.setProperty("--rail-w", "0px");
    setRightVisible(false);
    setFocusDialogue(true);
  }, []);

  const restoreFlanks = useCallback(() => {
    const el = shellRef.current;
    el?.style.setProperty(
      "--rail-w",
      stashRef.current?.rail ?? `${RAIL_W_DEFAULT}px`
    );
    setRightVisible(true);
    setFocusDialogue(false);
  }, []);

  /** One view's body, for one host. Each view owns its own pane header, so a
   *  host can show any of them without knowing what is inside. `pane` carries
   *  that host's settings — the Level view reads its layout from it. */
  const renderView = (
    pane: PaneState,
    setPane: (next: PaneState) => void,
    hostId: string
  ): ReactNode => {
    const id = pane.view;
    const def = viewDef(id);
    const g = run!;
    switch (id) {
      case "dialogue":
        return (
          <section className="pane" aria-label="scene view">
            <h2 className="pane-title">
              Dialogue {screenId ? `· ${screenId}` : ""}
              <span className="hint">{def.hint}</span>
            </h2>
            <SceneView
              graph={g.graph}
              screenId={screenId}
              sceneId={sceneId}
              api={api}
              sceneListOpen={pane.sceneListOpen}
              onToggleSceneList={() => {
                const open = !pane.sceneListOpen;
                setPane(paneWith(pane, { sceneListOpen: open }));
                writeSceneListOpen(hostId, open);
              }}
              onOpenScene={setSceneId}
              styleEpoch={styleEpoch}
              dir={g.dir}
            />
          </section>
        );
      case "level":
        return (
          <LevelView
            graph={g.graph}
            day={g.day}
            api={api}
            hint={def.hint}
            sceneCountOf={countScenes}
            onOpenScreen={openScreen}
            mode={pane.levelMode}
            onModeChange={(m) => {
              setPane(paneWith(pane, { levelMode: m }));
              writeLevelMode(hostId, m);
            }}
            dir={g.dir}
          />
        );
      case "stage":
        return (
          <StagePane
            graph={g.graph}
            day={g.day}
            manifest={g.manifest}
            dir={g.dir}
            view={playView}
            act={stageActions}
            onRegionShape={commitRegionShape}
            pendingRegionCount={pendingRegionCount}
            onApplyRegions={() => void applyRegions()}
            contentIndex={g.contentIndex}
            /* D8 follow-up: the same notes NotesPanel reads. They are what the
               pending-placement markers are drawn from, so a confirmed
               placement is visible immediately (addNote replaces run.notes)
               and still there after a reload. */
            notes={g.notes}
            /* D8: a new placement is a structural NOTE to the pipeline, never
               a region edit (sign-off #5). It reuses the same addNote writer
               NotesPanel uses — a second bridge for the same file would be a
               second thing to keep honest. */
            onPlaceNote={(body) =>
              addNote({ target: playView?.pos.currentScreen ?? null, kind: "structure", body })
            }
            onAdjustPlacement={adjustPlacement}
          />
        );
      case "play":
        return (
          <PlayPane
            view={playView}
            nameOf={(id) => soulName(names, id)}
            hasStory={g.story !== null}
            hasDay={g.day !== null}
            rerollNote={rerollNote}
            onContinue={() => playAct((p) => p.continueOnce())}
            onChoose={(i) =>
              playAct((p) => {
                p.choose(i);
                p.continueOnce();
              })
            }
            onRestore={(i) => playAct((p) => p.restore(i))}
            onRestart={startPlay}
            onReroll={(slot, life, day) => void reroll(slot, life, day)}
          />
        );
      case "sweep":
        return (
          <SweepPanel
            graph={g.graph}
            approvals={g.approvals}
            enabled={sweep}
            onToggle={setSweep}
            onJump={jumpToArtifact}
          />
        );
      case "flags":
        return <FlagsPanel graph={g.graph} approvals={g.approvals} api={api} />;
      case "week":
        return (
          <WeekView
            graph={g.graph}
            selected={sceneId}
            onOpenScene={openScene}
            api={api}
          />
        );
      case "variables":
        return (
          <VariablesPanel
            variables={g.graph.variables}
            selected={varSel}
            onSelect={setVarSel}
            values={liveVars}
            onSet={playView ? setVariable : undefined}
            forced={playView ? forced : false}
          />
        );
      case "notes":
        return (
          <NotesPanel
            notes={g.notes}
            target={sceneId ?? screenId}
            onAdd={addNote}
            onResolve={resolveNote}
          />
        );
      case "assets":
        return (
          <AssetsPanel
            graph={g.graph}
            manifest={g.manifest}
            dir={g.dir}
            onManifest={(manifest) =>
              setRun((r) => (r ? { ...r, manifest } : r))
            }
          />
        );
      case "cast":
        return (
          <CastPanel
            graph={g.graph}
            personas={g.personas}
            playView={playView}
            collapsed={collapsedSet}
            onToggleCollapsed={toggleCollapsed}
          />
        );
      case "notebook":
        return <NotebookPanel playView={playView} />;
      case "festival":
        return <FestivalPanel graph={g.graph} playView={playView} />;
    }
  };

  /** D8 #5 — zone-B toggles: focus/right-pane/undo-redo. Built once so the
   *  same markup can render inline on a wide header or inside the narrow
   *  header's dropdown, without duplicating the JSX. */
  const zoneBToggles = (
    <>
      {run && (
        <button
          className="pill-quiet"
          onClick={focusDialogue ? restoreFlanks : focusOnCentre}
          aria-pressed={focusDialogue}
          aria-label="toggle focus on the centre pane"
          title="Collapse the navigator and hide the right pane"
        >
          {focusDialogue ? "⤡ Restore flanks" : "⤢ Focus centre"}
        </button>
      )}
      {run && !rightVisible && !focusDialogue && (
        <button className="pill-quiet" onClick={() => setRightVisible(true)}>
          ⊞ Show right pane
        </button>
      )}
      {run && (
        <span className="undo-group">
          <button
            className="pill-quiet"
            onClick={() => void undo()}
            disabled={!histState.canUndo}
            aria-label={histState.undo ? `undo ${histState.undo}` : "undo"}
            title={`Ctrl+Z${histState.undo ? ` — undo ${histState.undo}` : ""}`}
          >
            ↶ Undo
          </button>
          <button
            className="pill-quiet"
            onClick={() => void redo()}
            disabled={!histState.canRedo}
            aria-label={histState.redo ? `redo ${histState.redo}` : "redo"}
            title={`Ctrl+Shift+Z${histState.redo ? ` — redo ${histState.redo}` : ""}`}
          >
            ↷ Redo
          </button>
        </span>
      )}
    </>
  );

  /** D8 #5 — zone C: the utilities column (run folder, recent, settings…). */
  const zoneCContent = (
    <>
      {/* The folder that actually loaded, never the text box (bug 6). */}
      <span className="header-note" title={run ? `writes ${run.dir}/out/` : undefined}>
        writes {run ? `${run.dir}/out/` : "nothing — no run loaded"}
      </span>
      {/* Approve/Flag left the card, so the keyboard path has to be
          advertised somewhere — but not as four lines of masthead. The
          glyph carries it, the tooltip spells it out. */}
      <span
        className="kbd-hint"
        title={
          "On the focused node: a approves · f flags · c clears · e edits · Enter opens" +
          (mode === "play" ? " · j jumps" : "")
        }
        aria-label="keyboard shortcuts: a approves, f flags, c clears, e edits, Enter opens"
      >
        ⌨
      </span>
      <label>
        Run folder
        <input
          className="run-dir-input"
          value={dirInput}
          onChange={(e) => setDirInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(dirInput);
          }}
          aria-label="run folder"
        />
      </label>
      <button className="pill-quiet" onClick={() => void load(dirInput)}>
        Load
      </button>
      {recent.length > 0 && (
        <label>
          Recent
          <select
            className="run-dir-recent"
            aria-label="recent run folders"
            value={recent.includes(dirInput) ? dirInput : ""}
            onChange={(e) => openFolder(e.target.value)}
          >
            {!recent.includes(dirInput) && <option value="">choose…</option>}
            {recent.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      )}
      <SettingsDrawer onStyleChange={() => setStyleEpoch((n) => n + 1)} />
    </>
  );

  return (
    <div className="app">
      {/* THREE ZONES, borrowed from the reference masthead: identity + what you
          are looking at | the workspace controls | utilities. The run-folder
          path used to sit in prime real estate, which put dev plumbing where
          the eye lands first; it is now a utility on the right. */}
      <header className="app-header">
        <div className="masthead-mark">
          <h1 className="app-title">Lantern</h1>
        </div>

        <div className="masthead-centre">
          {/* GP-54: status + move budget sit in the centre, larger and more
              visible; the focus/undo workspace toggles moved to the right. */}
          {run && (
            <span className="masthead-count">
              {/* Mode is DERIVED from whether a play surface is visible, which is
                  deliberate but subtle — nothing said so out loud before, and a
                  reader had to infer it from the panes. Playing is also the one
                  state worth an explicit way out (D3): reviewing has nothing to
                  exit, so only the "playing" pip is a real button. */}
              {mode === "play" ? (
                <button
                  type="button"
                  className="mode-pip mode-play"
                  onClick={exitPlay}
                  title="Exit play mode — back to the review views"
                >
                  playing · exit ✕
                </button>
              ) : (
                <span className="mode-pip mode-review">reviewing</span>
              )}
              {" · "}
              {run.graph.scenes.length} scene{run.graph.scenes.length === 1 ? "" : "s"}
              {" · "}
              {run.graph.screens.length} screens
              {run.week ? ` · ${run.week.days}-day week` : ""}
              {/* Clock readout (D1): day, time block, moves left in the
                  CURRENT block (RULED 2026-08-01 — 3 moves per block, not
                  per day). Play-mode only: outside play nothing is ticking. */}
              {mode === "play" && playView && (
                <span className="clock-readout" title="day · time block · moves left this block">
                  {" · "}
                  day {playView.day} · {playView.timeBlock} · {playView.movesLeft} move
                  {playView.movesLeft === 1 ? "" : "s"} left
                </span>
              )}
            </span>
          )}
          {/* The stale-reload banner stays visible at every width — it is
              role="status" and the run folder changing on disk outranks a
              narrow window (D8 #5). */}
          {stale && (
            <span className="stale-banner" role="status">
              The run folder changed on disk.{" "}
              <button
                className="pill-ghost"
                onClick={() => {
                  const dir = loadedDirRef.current;
                  if (dir) void load(dir);
                }}
              >
                Reload
              </button>
            </span>
          )}
        </div>

        <div className="masthead-utils">
          {!headerNarrow && zoneBToggles}
          {!headerNarrow && zoneCContent}
          {/* D8 #5: below the breakpoint, zone C and the zone-B toggles
              collapse into one disclosure button instead of a CSS media
              query silently dropping three text items. */}
          {headerNarrow && (
            <button
              className="pill-quiet"
              aria-expanded={headerMenuOpen}
              aria-controls="masthead-menu"
              aria-label="more header controls"
              onClick={() => setHeaderMenuOpen((o) => !o)}
            >
              ☰ Menu
            </button>
          )}
        </div>
      </header>

      {headerNarrow && headerMenuOpen && (
        <div id="masthead-menu" className="masthead-menu" role="menu">
          {zoneBToggles}
          {zoneCContent}
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <strong>Bridge error:</strong> {error}
          <p className="header-note">
            The file bridge only runs under `npm run dev`. Check the run folder
            holds a graph.json.
          </p>
        </div>
      )}

      {run && (
        <div
          className={`shell${rightVisible ? "" : " shell-solo"}`}
          ref={shellRef}
        >
          {/* col-nav: the fixed navigator — scene rail over the health readout */}
          <nav className="col-nav" id="col-nav" aria-label="navigator">
            <SceneRail
              graph={run.graph}
              api={api}
              activeScreenId={screenId}
              activeSceneId={sceneId}
              collapsed={collapsedSet}
              onToggleCollapsed={toggleCollapsed}
              onOpenScreen={openScreen}
              onOpenScene={openScene}
            />
            {/* GP-53: threads live here now, not in a tab — collapsible via
                the same collapsed-set/twisty pattern as the scene groups
                above (THREADS_RAIL_KEY rides the same persisted list). */}
            <ThreadsPanel
              graph={run.graph}
              playView={playView}
              open={!collapsedSet.has(THREADS_RAIL_KEY)}
              onToggle={() => toggleCollapsed(THREADS_RAIL_KEY)}
            />
            {health && <HealthReadout health={health} />}
          </nav>

          <Splitter
            orientation="vertical"
            cssVar="--rail-w"
            storageKey="rail-w"
            min={180}
            defaultSize={RAIL_W_DEFAULT}
            label="Resize the navigator"
            controls="col-nav"
          />

          <ViewHost
            id={CENTRE_ID}
            label="centre pane"
            view={centre.view}
            onSelect={(v) => setCentre(paneWith(centre, { view: v }))}
          >
            {renderView(centre, setCentre, CENTRE_ID)}
          </ViewHost>

          {rightVisible && (
            <Splitter
              orientation="vertical"
              cssVar="--side-w"
              storageKey="side-w"
              min={260}
              defaultSize={SIDE_W_DEFAULT}
              invert
              label="Resize the right pane"
              controls="col-right"
            />
          )}

          {rightVisible && (
            <ViewHost
              id={RIGHT_ID}
              label="right pane"
              view={right.view}
              onSelect={(v) => setRight(paneWith(right, { view: v }))}
              onHide={() => setRightVisible(false)}
            >
              {renderView(right, setRight, RIGHT_ID)}
            </ViewHost>
          )}
        </div>
      )}
    </div>
  );
}
