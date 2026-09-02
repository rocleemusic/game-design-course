import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  MiniMap,
  Panel,
  Position,
  useNodesState,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { Day, Graph, Screen } from "../types";
import {
  LEVEL_LAYOUT_MODES,
  levelLayout,
  levelRows,
  lockGateIds,
  type CanvasLayoutMode,
  type LevelLayoutMode,
} from "../lib/levelLayout";
import { NodeCard } from "./NodeCard";
import type { ReviewApi } from "./reviewApi";
import {
  applyPositions,
  clearPositions,
  positionScope,
  readPositions,
  writePosition,
} from "../lib/positions";

interface ScreenNodeData {
  screen: Screen;
  [key: string]: unknown;
}

/** api and day ride in context, not node data, so dragging a screen survives a
 *  play step (which changes api/day) without the node array rebuilding. */
const LevelCtx = createContext<{
  api: ReviewApi;
  day: Day | null;
  sceneCountOf: (screenId: string) => number;
  onOpen: (screenId: string) => void;
} | null>(null);

function gateInfo(screen: Screen) {
  const locked = screen.status.startsWith("locked(");
  // A two-key lock names both gates; label every key the screen itself holds.
  const lockedGates = lockGateIds(screen.status).map(
    (id) => screen.gates.find((g) => g.gate_id === id) ?? { gate_id: id, archetype: "" },
  );
  return { locked, lockedGates };
}

/**
 * Custom nodes must render Handles or React Flow drops their edges (error
 * #008). The level view is spatial (clusters left to right), so edges enter
 * on the left and leave on the right; LevelView orients each edge so its
 * source is the leftmost screen. Handles are visually silent (.flow-handle).
 */
function ScreenFlowNode(props: NodeProps<Node<ScreenNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="flow-handle" isConnectable={false} />
      <ScreenCard {...props} />
      <Handle type="source" position={Position.Right} className="flow-handle" isConnectable={false} />
    </>
  );
}

function ScreenCard({ data }: NodeProps<Node<ScreenNodeData>>) {
  const { screen } = data;
  const { api, day, sceneCountOf, onOpen } = useContext(LevelCtx)!;
  const { locked, lockedGates } = gateInfo(screen);
  const sceneCount = sceneCountOf(screen.screen_id);

  const fills = day?.slot_fill.filter((f) => f.screen_id === screen.screen_id) ?? [];
  const slotIds = new Set((screen.item_slots ?? []).map((s) => s.slot_id));
  const rolls = day?.item_rolls.filter((r) => slotIds.has(r.slot_id)) ?? [];

  return (
    <NodeCard
      id={screen.screen_id}
      kind="screen"
      title={screen.name}
      text={screen.vibe}
      status={api.statusOf(screen.screen_id)}
      note={api.noteOf(screen.screen_id)}
      onClearStatus={api.clearStatus}
      playState={api.playState(screen.screen_id)}
      sweepDim={api.sweepDim(screen.screen_id)}
      varHit={api.varHit(screen.screen_id)}
      chips={[screen.location, screen.status]}
      badges={
        <>
          {sceneCount > 0 && (
            <span
              className="scene-count-chip"
              title={`${sceneCount} scene${sceneCount === 1 ? "" : "s"} on this screen`}
            >
              {sceneCount} scene{sceneCount === 1 ? "" : "s"}
            </span>
          )}
          {locked && lockedGates.length > 0 && (
            <span
              className="gate-badge"
              title={
                lockedGates.length > 1
                  ? "gate: both keys required"
                  : "gate: archetype and key"
              }
            >
              LOCK ·{" "}
              {lockedGates
                .map((g) => (g.archetype ? `${g.archetype} · ${g.gate_id}` : g.gate_id))
                .join(" + ")}
            </span>
          )}
        </>
      }
      tooltip={
        day ? (
          <div className="day-tip" role="tooltip">
            <strong>Today (day {day.day})</strong>
            {fills.length === 0 && <div>No one in the slots.</div>}
            {fills.map((f) => (
              <div key={f.time_block + f.soul}>
                {f.time_block}: {f.soul}
              </div>
            ))}
            {rolls.map((r) => (
              <div key={r.slot_id}>
                {r.slot_id}: {r.item}
              </div>
            ))}
          </div>
        ) : undefined
      }
      onApprove={api.approve}
      onFlag={api.flag}
      onOpen={() => onOpen(screen.screen_id)}
      onJump={api.jump ? () => api.jump!(screen.screen_id) : undefined}
    />
  );
}

const nodeTypes = { screen: ScreenFlowNode };

const MODE_LABEL: Record<LevelLayoutMode, string> = {
  constellation: "Constellation",
  tree: "Tree",
  list: "List",
};

const MODE_HINT: Record<LevelLayoutMode, string> = {
  constellation: "each area spreads around its busiest screen",
  tree: "ranked by hops from the start screen",
  list: "every screen, found by name",
};

/** Which layout this pane draws. Per-pane, so two panes can disagree. */
function LayoutSwitch(props: {
  mode: LevelLayoutMode;
  onChange: (mode: LevelLayoutMode) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label="level layout">
      {LEVEL_LAYOUT_MODES.map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={props.mode === m}
          title={MODE_HINT[m]}
          className={`seg-btn${props.mode === m ? " seg-btn-active" : ""}`}
          onClick={() => props.onChange(m)}
        >
          {MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

/**
 * List mode: every screen as a row, including the ones holding no dialogue —
 * those appear nowhere in the scene rail, so this is the only place to find
 * them by name rather than by hunting the canvas.
 */
function LevelList(props: {
  graph: Graph;
  api: ReviewApi;
  sceneCountOf: (screenId: string) => number;
  onOpenScreen: (screenId: string) => void;
}) {
  const rows = useMemo(() => levelRows(props.graph), [props.graph]);
  return (
    <div className="level-list">
      <table className="level-table">
        <thead>
          <tr>
            <th scope="col">Screen</th>
            <th scope="col">Name</th>
            <th scope="col">Where</th>
            <th scope="col">Gate</th>
            <th scope="col">Connects to</th>
            <th scope="col">Scenes</th>
            <th scope="col">Review</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const scenes = props.sceneCountOf(r.id);
            return (
              <tr key={r.id} className={r.locked ? "level-row-locked" : undefined}>
                <td>
                  <button
                    className="level-row-open"
                    onClick={() => props.onOpenScreen(r.id)}
                    aria-label={`open ${r.name}`}
                  >
                    {r.id}
                  </button>
                </td>
                <td>{r.name}</td>
                <td>{r.location}</td>
                <td>
                  {r.locked ? (
                    <span className="gate-badge">LOCK · {r.gate}</span>
                  ) : (
                    <span className="level-cell-quiet">{r.status}</span>
                  )}
                </td>
                <td className="level-cell-quiet">
                  {r.neighbours.join(", ") || "—"}
                </td>
                <td>{scenes || <span className="level-cell-quiet">—</span>}</td>
                <td className="level-cell-quiet">{props.api.statusOf(r.id)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LevelView(props: {
  graph: Graph;
  day: Day | null;
  api: ReviewApi;
  /** one-line pane hint from the view registry */
  hint: string;
  sceneCountOf: (screenId: string) => number;
  onOpenScreen: (screenId: string) => void;
  /** this host's layout — panes are independent, so two can differ */
  mode: LevelLayoutMode;
  onModeChange: (mode: LevelLayoutMode) => void;
  /** the open run folder, so saved node positions never cross runs */
  dir?: string;
}) {
  // Layout depends only on the graph and the mode; api/day changes never
  // re-seed positions. List mode draws no canvas, so it borrows the default.
  const canvasMode: CanvasLayoutMode =
    props.mode === "tree" ? "tree" : "constellation";
  const layout = useMemo(
    () => levelLayout(props.graph, canvasMode),
    [props.graph, canvasMode]
  );
  // One saved arrangement per (run, level layout): a constellation position
  // means nothing in a tree. Declared before `seed`, which reads it.
  const scope = positionScope(props.dir ?? "fixtures", "level", canvasMode);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  // Computed layout with any hand-dragged positions laid over it (sign-off 4).
  // `scope` is in the deps so switching layout re-seeds from that layout's own
  // saved arrangement, not the previous one's.
  const seed = useMemo<Node<ScreenNodeData>[]>(() => {
    const saved = readPositions(scope);
    return applyPositions(
      layout.nodes.map((n) => ({
        id: n.id,
        type: "screen",
        position: n.position,
        draggable: true,
        focusable: false,
        data: { screen: n.screen },
      })),
      saved
    );
  }, [layout, scope]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ScreenNodeData>>(seed);
  const flowRef = useRef<ReactFlowInstance<Node<ScreenNodeData>, Edge> | null>(null);
  /** set when a re-seed is in flight, so the fit lands on the new positions */
  const refitRef = useRef(false);
  /** the layout the current viewport was framed for */
  const framedForRef = useRef(canvasMode);

  // Re-seed only when the graph or the layout changes; a drag in between is
  // kept because api/day updates do not touch `seed`.
  useEffect(() => {
    setNodes(seed);
    // Re-frame only when YOU changed the layout: every node has moved, so the
    // old viewport would be staring at empty canvas. A new graph — a reload, a
    // re-run, and live-reload later — must leave the viewport alone, for the
    // same reason a pane resize must: it yanks the pan out from under you.
    if (framedForRef.current !== canvasMode) {
      framedForRef.current = canvasMode;
      refitRef.current = true;
    }
  }, [seed, canvasMode, setNodes]);

  useEffect(() => {
    if (!refitRef.current) return;
    refitRef.current = false;
    flowRef.current?.fitView();
  }, [nodes]);

  const edges = useMemo<Edge[]>(() => {
    // Connections are undirected; orient each so the source is the leftmost
    // screen — edges then run left handle to right handle without doubling back.
    const xById = new Map(layout.nodes.map((n) => [n.id, n.position.x]));
    return layout.edges.map((e) => {
      const flip = (xById.get(e.source) ?? 0) > (xById.get(e.target) ?? 0);
      return {
        id: e.id,
        source: flip ? e.target : e.source,
        target: flip ? e.source : e.target,
        label: e.seamName ? `seam: ${e.seamName}` : undefined,
        style: e.seamName
          ? { stroke: "var(--edge-seam)", strokeDasharray: "6 4" }
          : { stroke: "var(--edge)" },
      };
    });
  }, [layout]);

  return (
    <LevelCtx.Provider
      value={{
        api: props.api,
        day: props.day,
        sceneCountOf: props.sceneCountOf,
        onOpen: props.onOpenScreen,
      }}
    >
      <section className="pane" aria-label="level view">
        <h2 className="pane-title">
          Level
          <span className="hint">{props.hint}</span>
          <LayoutSwitch mode={props.mode} onChange={props.onModeChange} />
        </h2>
        {props.mode === "list" ? (
          <LevelList
            graph={props.graph}
            api={props.api}
            sceneCountOf={props.sceneCountOf}
            onOpenScreen={props.onOpenScreen}
          />
        ) : (
          <div className="flow-wrap on-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onInit={(instance) => (flowRef.current = instance)}
              onNodesChange={onNodesChange}
              onNodeDragStop={(_, node) =>
                writePosition(scopeRef.current, node.id, node.position)
              }
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.3}
              nodesFocusable={false}
              edgesFocusable={false}
              nodesConnectable={false}
              zoomOnDoubleClick={false}
              onNodeDoubleClick={(_, node) => props.onOpenScreen(node.id)}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--edge)" gap={24} />
              {/* The 16-screen map is the easiest canvas to get lost on, so it
                  needs the minimap at least as much as the scene tree. */}
              <MiniMap pannable zoomable nodeStrokeWidth={2} />
              <Panel position="top-right" className="graph-toolbar">
                <button
                  className="pill-quiet"
                  onClick={() => {
                    // Drop hand-dragged positions and re-run the layout.
                    clearPositions(scopeRef.current);
                    setNodes(
                      layout.nodes.map((n) => ({
                        id: n.id,
                        type: "screen" as const,
                        position: n.position,
                        draggable: true,
                        focusable: false,
                        data: { screen: n.screen },
                      }))
                    );
                    refitRef.current = true;
                  }}
                  aria-label="reset the level layout"
                  title="Discard dragged positions and re-frame"
                >
                  Reset layout
                </button>
              </Panel>
            </ReactFlow>
          </div>
        )}
      </section>
    </LevelCtx.Provider>
  );
}
