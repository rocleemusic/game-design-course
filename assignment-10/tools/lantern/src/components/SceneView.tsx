import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  Panel,
  Handle,
  Position,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import type { Graph, Scene } from "../types";
import {
  buildSceneModel,
  layoutSceneGraph,
  defaultSize,
  type Direction,
  type PositionedNode,
} from "../lib/sceneGraph";
import { NodeCard } from "./NodeCard";
import { BlueprintNode, pinOffset, type OptionPin } from "./nodes/BlueprintNode";
import {
  applyPositions,
  clearPositions,
  positionScope,
  readPositions,
  writePosition,
} from "../lib/positions";
import type { ReviewApi } from "./reviewApi";

interface TreeNodeData {
  sceneNode: PositionedNode;
  [key: string]: unknown;
}

/**
 * api and flow direction ride in context, not in each node's data. If api sat
 * on node.data, every api identity change (each play step) would rebuild the
 * whole node array and throw away dragged positions and the measured layout.
 * With context, the node array depends only on the scene model and direction.
 */
const SceneApiContext = createContext<ReviewApi | null>(null);
const SceneDirContext = createContext<Direction>("TB");

/** the options a choice card fans out to, as pins/handles */
function pinsOf(n: PositionedNode, api: ReviewApi): OptionPin[] {
  if (n.kind !== "choice" || !n.data.choice) return [];
  return n.data.choice.options.map((o) => ({
    id: o.option_id,
    label: o.player_verb,
    status: api.statusOf(o.option_id),
  }));
}

/**
 * Every custom node must render source/target Handles or React Flow drops its
 * edges (error #008). The handle sides follow the flow axis: TB puts target on
 * top and source on bottom; LR puts target left and source right. The plain
 * handles are visually silent (.flow-handle) — the edges are the point.
 *
 * A CHOICE card additionally renders one handle per option, `id={option_id}`,
 * spaced along the flow edge so each branch leaves from its own pin (matching
 * `SceneEdge.sourceHandle`). Those are decoration — `isConnectable={false}` —
 * so the 44px interaction floor does not apply to them; nothing is aimed at.
 * The unnamed source handle stays for edges with no sourceHandle (the gate's
 * bypass edge).
 *
 * The review toolbar renders HERE, as a sibling of the card, never inside it:
 * Approve/Flag inside the click target were getting hit by accident. The card
 * keeps `a`/`f`/`c` on the keyboard, so hiding this toolbar can never make
 * approving unreachable.
 */
function TreeFlowNode(props: NodeProps<Node<TreeNodeData>>) {
  const dir = useContext(SceneDirContext);
  const api = useContext(SceneApiContext)!;
  const [active, setActive] = useState(false);
  const n = props.data.sceneNode;
  const [targetPos, sourcePos] =
    dir === "TB" ? [Position.Top, Position.Bottom] : [Position.Left, Position.Right];
  const pins = pinsOf(n, api);
  // What the toolbar reviews. For every kind but gather that is the node's own
  // id. A gather has no review identity of its own — but one carrying a
  // `gather_line` shows authored prose, and prose the toolbar cannot approve is
  // the same omission GP-18 is about. Review that line, by its content_id.
  const reviewId = n.kind === "gather" ? n.data.line?.content_id : n.id;
  const status = api.statusOf(reviewId ?? n.id);
  const reviewable = reviewId !== undefined;

  return (
    <div
      className="bp-wrap"
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(e) => {
        // focus moving between the card and its own toolbar is not a blur
        if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) {
          setActive(false);
        }
      }}
    >
      {/* The Blueprint read is symmetric: a visible input pin, visible output
          pins. Keeps the .flow-handle class so the shared handle rules (and the
          test that counts them) still apply; bp-target makes this one show. */}
      <Handle
        type="target"
        position={targetPos}
        className="flow-handle bp-target"
        isConnectable={false}
        isConnectableStart={false}
        isConnectableEnd={false}
      />

      <TreeCard {...props} pins={pins} />

      {/* AFTER the card in the DOM, drawn above it. Tab therefore reaches the
          card first and its toolbar second, in the order they read. */}
      {reviewable && active && (
        <div className="bp-toolbar nodrag" role="toolbar" aria-label={`review ${reviewId}`}>
          <button
            className="pill-primary"
            onClick={() => api.approve(reviewId!)}
            aria-label={`approve ${reviewId}`}
          >
            Approve
          </button>
          <button
            className="pill-flag"
            onClick={() => api.flag(reviewId!)}
            aria-label={`flag ${reviewId}`}
          >
            Flag
          </button>
          {status !== "pending" && (
            <button
              className="pill-quiet"
              onClick={() => api.clearStatus(reviewId!)}
              aria-label={`clear review status of ${reviewId}`}
            >
              Clear
            </button>
          )}
          {api.jump && (
            <button
              className="pill-ghost"
              onClick={() => api.jump!(n.id)}
              aria-label={`jump to ${n.id}`}
            >
              Jump
            </button>
          )}
        </div>
      )}

      <Handle type="source" position={sourcePos} className="flow-handle" isConnectable={false} />
      {pins.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="source"
          position={sourcePos}
          className={`bp-handle status-${p.status}`}
          // Pure decoration. isConnectable alone still leaves React Flow
          // advertising the handle as a connection start/end, so say no to all
          // three — nothing is ever aimed at these, which is also why the 44px
          // interaction floor does not apply to a 9px pin.
          isConnectable={false}
          isConnectableStart={false}
          isConnectableEnd={false}
          style={dir === "TB" ? { left: pinOffset(i, pins.length) } : { top: pinOffset(i, pins.length) }}
        />
      ))}
    </div>
  );
}

function TreeCard({ data, pins }: NodeProps<Node<TreeNodeData>> & { pins: OptionPin[] }) {
  const n = data.sceneNode;
  const api = useContext(SceneApiContext)!;
  const jumpFor = (id: string) => (api.jump ? () => api.jump!(id) : undefined);

  if (n.kind === "line" && n.data.line) {
    const line = n.data.line;
    return (
      <BlueprintNode
        id={line.content_id}
        kind="line"
        title={api.soulName(line.speaker_id)}
        text={api.textOf(line.content_id, line.text)}
        editTarget={line.content_id}
        status={api.statusOf(line.content_id)}
        note={api.noteOf(line.content_id)}
        onApprove={api.approve}
        onFlag={api.flag}
        onClearStatus={api.clearStatus}
        playState={api.playState(line.content_id)}
        sweepDim={api.sweepDim(line.content_id)}
        varHit={api.varHit(line.content_id)}
        chips={line.slot_type !== "dialogue" ? [line.slot_type] : undefined}
        onSaveEdit={api.saveEdit}
        onJump={jumpFor(line.content_id)}
      />
    );
  }

  if (n.kind === "choice" && n.data.choice) {
    const ch = n.data.choice;
    return (
      <BlueprintNode
        id={ch.choice_id}
        kind="choice"
        title="choice"
        text={ch.equal_weight_note}
        status={api.statusOf(ch.choice_id)}
        note={api.noteOf(ch.choice_id)}
        onApprove={api.approve}
        onFlag={api.flag}
        onClearStatus={api.clearStatus}
        playState={api.playState(ch.choice_id)}
        sweepDim={api.sweepDim(ch.choice_id)}
        varHit={api.varHit(ch.choice_id)}
        gated={ch.availability_conditions.length > 0}
        chips={n.data.chips}
        pins={pins}
        onJump={jumpFor(ch.choice_id)}
      />
    );
  }

  if (n.kind === "option" && n.data.option) {
    const opt = n.data.option;
    const spoken = n.data.playerLineTarget !== undefined;
    const noField = !spoken && opt.surface_action === undefined;
    const target = spoken ? n.data.playerLineTarget! : `${opt.option_id}.surface_action`;
    const original = spoken ? n.data.playerLineText! : (opt.surface_action ?? "");
    const ownStatus = api.statusOf(opt.option_id);
    // The line's edit and the option's own review are two facts. When the
    // option is untouched the badge can carry the edit (nothing else to say);
    // once the option has a status of its own, the edit needs its own mark or
    // it disappears behind "approved".
    const lineEdited = spoken && api.statusOf(target) === "edited";
    const status = lineEdited && ownStatus === "pending" ? "edited" : ownStatus;
    return (
      <BlueprintNode
        id={opt.option_id}
        kind="option"
        title={spoken ? "spoken" : "deed"}
        text={noField ? undefined : api.textOf(target, original)}
        bracketed={!spoken}
        editTarget={noField ? undefined : target}
        status={status}
        lineEdited={lineEdited && ownStatus !== "pending"}
        note={api.noteOf(opt.option_id)}
        onApprove={api.approve}
        onFlag={api.flag}
        onClearStatus={api.clearStatus}
        playState={api.playState(opt.option_id)}
        sweepDim={api.sweepDim(opt.option_id)}
        varHit={api.varHit(opt.option_id)}
        chips={[...opt.state_actions, `${opt.player_verb} · ${opt.verb_family}`]}
        onSaveEdit={noField ? undefined : api.saveEdit}
        onJump={jumpFor(opt.option_id)}
        tooltip={
          noField ? (
            <div className="hint">no text to edit; field is empty in the spec</div>
          ) : undefined
        }
      />
    );
  }

  // gather
  const gatherPlay = api.playState(n.id);
  const gatherJump = jumpFor(n.id);

  // A gather carrying a `gather_line` holds authored prose, so it is a beat you
  // can read, edit and review — exactly what a line card already is. Same card,
  // same props, only the kind differs; inventing a gather-specific treatment
  // would break "correct edges only, no new visual language". Play state and
  // jump stay keyed on the GATHER id (that is what playMap resolves to an ink
  // label); review and edits key on the line's content_id, like any other line.
  const gatherLine = n.data.line;
  if (gatherLine) {
    return (
      <BlueprintNode
        id={gatherLine.content_id}
        kind="gather"
        title={api.soulName(gatherLine.speaker_id)}
        text={api.textOf(gatherLine.content_id, gatherLine.text)}
        editTarget={gatherLine.content_id}
        status={api.statusOf(gatherLine.content_id)}
        note={api.noteOf(gatherLine.content_id)}
        onApprove={api.approve}
        onFlag={api.flag}
        onClearStatus={api.clearStatus}
        playState={gatherPlay}
        sweepDim={api.sweepDim(gatherLine.content_id)}
        varHit={api.varHit(gatherLine.content_id)}
        chips={gatherLine.slot_type !== "dialogue" ? [gatherLine.slot_type] : undefined}
        onSaveEdit={api.saveEdit}
        onJump={gatherJump}
      />
    );
  }

  // No gather_line: the gather is pure topology, a convergence marker. Nothing
  // to read, so it stays the compact pill it has always been.
  return (
    <div
      className={`bp-node kind-gather gather-marker${gatherPlay ? ` play-${gatherPlay}` : ""}`}
      tabIndex={gatherJump ? 0 : -1}
      aria-label={`gather ${n.id}`}
      onClick={gatherJump}
      onKeyDown={gatherJump ? (e) => e.key === "j" && gatherJump() : undefined}
      title={gatherJump ? "Jump here (j)" : undefined}
    >
      <span className="bp-id">{n.id}</span>
      <div className="bp-kind">gather</div>
    </div>
  );
}

const nodeTypes = { tree: TreeFlowNode };

const minimapColor = (n: Node): string => {
  const kind = (n.data as TreeNodeData | undefined)?.sceneNode?.kind;
  if (kind === "choice") return "var(--amber)";
  if (kind === "option") return "var(--teal)";
  if (kind === "gather") return "var(--muted)";
  return "var(--dusk)";
};

function toFlowNodes(placed: PositionedNode[]): Node<TreeNodeData>[] {
  return placed.map((n) => ({
    id: n.id,
    type: "tree",
    position: n.position,
    draggable: true,
    data: { sceneNode: n },
  }));
}

/**
 * The measured-relayout canvas. First render lays out with coarse default
 * sizes so React Flow can measure the real cards; useNodesInitialized then
 * fires, we read every node's measured size, lay out again with the truth,
 * and fitView. Guarded to run once per (scene, direction) so dragging a node
 * afterward is not undone.
 */
function SceneTreeInner(props: {
  scene: Scene;
  direction: Direction;
  /** bumps when a design token changes card geometry — forces a re-measure */
  styleEpoch: number;
  /** the open run folder, so saved positions never cross runs */
  dir: string;
}) {
  const { scene, direction } = props;
  const model = useMemo(() => buildSceneModel(scene), [scene]);
  const initial = useMemo(
    () => toFlowNodes(layoutSceneGraph(model.nodes, model.edges, new Map(), { direction }).nodes),
    [model, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TreeNodeData>>(initial);
  // The edge that leads INTO a gated beat is a conditional path — draw it amber
  // and dashed so a gated branch reads as gated on the graph, not only in a chip.
  const gatedIds = useMemo(
    () =>
      new Set(
        model.nodes
          .filter((n) => n.kind === "choice" && (n.data.choice?.availability_conditions.length ?? 0) > 0)
          .map((n) => n.id)
      ),
    [model]
  );
  const edges = useMemo<Edge[]>(
    () =>
      model.edges.map((e) => {
        // amber+dashed for a conditional path: either an edge INTO a gated beat
        // or the bypass that skips one when the gate fails.
        const conditional = e.bypass || gatedIds.has(e.target);
        return {
          id: e.id,
          source: e.source,
          // each option's edge leaves from that option's own pin on the choice
          // card; everything else uses the card's default handle
          sourceHandle: e.sourceHandle,
          target: e.target,
          label: e.label,
          animated: e.bypass,
          style: conditional
            ? { stroke: "var(--amber)", strokeDasharray: "6 4", strokeWidth: 2 }
            : { stroke: "var(--edge)" },
        };
      }),
    [model, gatedIds]
  );

  const rf = useReactFlow();
  const initialized = useNodesInitialized();
  const laidKey = useRef("");

  // One saved arrangement per (run, scene, direction) — a position computed
  // for a top-to-bottom tree means nothing in a left-to-right one.
  const scope = positionScope(props.dir, "scene", `${scene.scene_id}|${direction}`);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  // New scene or new direction: back to the coarse layout, awaiting measure.
  useEffect(() => {
    setNodes(initial);
    laidKey.current = "";
  }, [initial, setNodes]);

  // Measured pass: real sizes -> real positions, once per
  // (scene, direction, styleEpoch). The epoch term is what makes a text-size
  // change relayout instead of leaving the old measurements in place.
  useEffect(() => {
    const key = `${scene.scene_id}|${direction}|${props.styleEpoch}`;
    if (!initialized || laidKey.current === key) return;
    const sizes = new Map(
      rf.getNodes().map((n) => {
        const fallback = defaultSize(
          (n.data as TreeNodeData).sceneNode.kind
        );
        return [
          n.id,
          {
            width: n.measured?.width ?? fallback.width,
            height: n.measured?.height ?? fallback.height,
          },
        ] as const;
      })
    );
    const laid = layoutSceneGraph(model.nodes, model.edges, sizes, { direction }).nodes;
    // Hand-dragged positions win over the computed ones (sign-off 4). A node
    // never dragged keeps its computed spot, so a beat added later lands
    // sensibly instead of at the origin.
    const placed = applyPositions(laid, readPositions(scopeRef.current));
    const posById = new Map(placed.map((n) => [n.id, n.position]));
    setNodes((prev) =>
      prev.map((pn) => (posById.has(pn.id) ? { ...pn, position: posById.get(pn.id)! } : pn))
    );
    laidKey.current = key;
    requestAnimationFrame(() => rf.fitView({ duration: 200 }));
  }, [initialized, scene.scene_id, direction, props.styleEpoch, model, rf, setNodes]);

  return (
    <SceneDirContext.Provider value={direction}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) =>
          writePosition(scopeRef.current, node.id, node.position)
        }
        nodeTypes={nodeTypes}
        minZoom={0.2}
        nodesFocusable={false}
        edgesFocusable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--edge)" gap={24} />
        <MiniMap pannable zoomable nodeColor={minimapColor} nodeStrokeWidth={2} />
        <Panel position="top-right" className="graph-toolbar">
          <button
            className="pill-quiet"
            onClick={() => {
              // Drop hand-dragged positions and re-measure from scratch.
              clearPositions(scopeRef.current);
              setNodes(initial);
              laidKey.current = "";
            }}
            aria-label="reset the dialogue layout"
            title="Discard dragged positions and re-run the layout"
          >
            Reset layout
          </button>
          {/* D8 #7: a token colour legend. Nothing named the kind colours
              anywhere in the tool before this — the 3px bar and the head wash
              carry the hue, but only the head's mono label ever spelled out
              which kind it was. Scoped to the four kinds this canvas actually
              draws (SceneNodeKind) — screen/scene belong to LevelView's
              canvas, not this one. */}
          <ul className="kind-legend" aria-label="node kind colour legend">
            {(["line", "choice", "option", "gather"] as const).map((k) => (
              <li key={k} className="kind-legend-item">
                <span className={`kind-legend-swatch kind-${k}`} aria-hidden="true" />
                {k}
              </li>
            ))}
          </ul>
        </Panel>
      </ReactFlow>
    </SceneDirContext.Provider>
  );
}

export function SceneTree(props: {
  scene: Scene;
  api: ReviewApi;
  direction?: Direction;
  styleEpoch?: number;
  dir?: string;
}) {
  return (
    <SceneApiContext.Provider value={props.api}>
      <div className="flow-wrap on-canvas">
        <ReactFlowProvider>
          <SceneTreeInner
            scene={props.scene}
            direction={props.direction ?? "TB"}
            styleEpoch={props.styleEpoch ?? 0}
            dir={props.dir ?? "fixtures"}
          />
        </ReactFlowProvider>
      </div>
    </SceneApiContext.Provider>
  );
}

export function SceneView(props: {
  graph: Graph;
  screenId: string | null;
  sceneId: string | null;
  api: ReviewApi;
  /** the scene picker strip: open shows the cards, folded shows one line */
  sceneListOpen: boolean;
  onToggleSceneList: () => void;
  onOpenScene: (sceneId: string) => void;
  /** bumps when a design token changes card geometry — forces a re-measure */
  styleEpoch?: number;
  /** the open run folder, so saved node positions never cross runs */
  dir?: string;
}) {
  const [direction, setDirection] = useState<Direction>("TB");
  const scenes = props.graph.scenes.filter((s) => s.screen_id === props.screenId);
  const scene = scenes.find((s) => s.scene_id === props.sceneId) ?? null;

  if (!props.screenId) {
    return (
      <div className="flow-wrap on-canvas">
        <p className="empty-hint">Select a screen in the level view (Enter opens).</p>
      </div>
    );
  }

  const open = props.sceneListOpen;
  const dirToggle = scene && (
    <button
      className="pill-quiet dir-toggle"
      onClick={() => setDirection((d) => (d === "TB" ? "LR" : "TB"))}
      aria-label="toggle graph direction"
      title="Toggle flow direction"
    >
      {direction === "TB" ? "↓ Top-down" : "→ Left-right"}
    </button>
  );

  // Folded, the picker is one line: which scene is open, and the way back to
  // the cards. The tree gets the ~230px the card strip was holding.
  if (!open) {
    return (
      <>
        <div className="scene-list scene-list-folded">
          <button
            className="rail-twisty"
            onClick={props.onToggleSceneList}
            aria-expanded={false}
            aria-controls="scene-picker"
            aria-label="Expand the scene picker"
          >
            ▸
          </button>
          <span className="hint" id="scene-picker">
            {scenes.length === 0
              ? `No scenes on ${props.screenId}.`
              : scene
                ? `${scene.scene_id} · ${scene.soul} · ${scene.lines.length} lines · ${scene.choice_nodes.length} choice`
                : `${scenes.length} scene${scenes.length === 1 ? "" : "s"} on ${props.screenId} — none open`}
          </span>
          {dirToggle}
        </div>
        {scene ? (
          <SceneTree
          scene={scene}
          api={props.api}
          direction={direction}
          styleEpoch={props.styleEpoch}
          dir={props.dir}
        />
        ) : (
          <div className="flow-wrap on-canvas">
            <p className="empty-hint">
              Open a scene to see its dialogue tree (expand the picker above).
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="scene-list"
        role="list"
        aria-label="scenes on this screen"
        id="scene-picker"
      >
        <button
          className="rail-twisty"
          onClick={props.onToggleSceneList}
          aria-expanded={true}
          aria-controls="scene-picker"
          aria-label="Collapse the scene picker"
        >
          ▾
        </button>
        {scenes.length === 0 && <span className="hint">No scenes on {props.screenId}.</span>}
        {scenes.map((s) => (
          <NodeCard
            key={s.scene_id}
            id={s.scene_id}
            kind="scene"
            title={s.soul}
            text={`${s.lines.length} lines · ${s.choice_nodes.length} choice`}
            status={props.api.statusOf(s.scene_id)}
            note={props.api.noteOf(s.scene_id)}
            onClearStatus={props.api.clearStatus}
            playState={props.api.playState(s.scene_id)}
            sweepDim={props.api.sweepDim(s.scene_id)}
            varHit={props.api.varHit(s.scene_id)}
            chips={[s.ink_address]}
            onApprove={props.api.approve}
            onFlag={props.api.flag}
            // Buttons off, keyboard on — the strip must not contradict the
            // blueprint cards below it (L5's off-the-card ruling).
            hideActions
            onOpen={() => props.onOpenScene(s.scene_id)}
            onJump={props.api.jump ? () => props.api.jump!(s.scene_id) : undefined}
          />
        ))}
        {dirToggle}
      </div>
      {scene ? (
        <SceneTree
          scene={scene}
          api={props.api}
          direction={direction}
          styleEpoch={props.styleEpoch}
          dir={props.dir}
        />
      ) : (
        <div className="flow-wrap on-canvas">
          <p className="empty-hint">Open a scene to see its dialogue tree (Enter opens).</p>
        </div>
      )}
    </>
  );
}
