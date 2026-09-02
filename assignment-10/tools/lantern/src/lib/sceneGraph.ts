import dagre from "@dagrejs/dagre";
import type { ChoiceNode, ChoiceOption, Line, Scene } from "../types";

/**
 * The dialogue-tree graph for one scene, in two pure pieces:
 *
 *   buildSceneModel(scene)      -> topology only: nodes (id, kind, data) + edges.
 *                                  No positions, no sizes.
 *   layoutSceneGraph(model, sizes, {direction})
 *                               -> positions, from dagre, using MEASURED node
 *                                  sizes passed in by the caller.
 *
 * Sizes are an input, not a guess. The old nodeHeight() estimated pixel height
 * from character counts to feed dagre; any restyle silently broke the spacing.
 * Now the view measures the rendered cards (React Flow's `measured`) and hands
 * the real sizes back for a second layout pass, so the graph can never overlap
 * because the type scale changed.
 *
 * Spine interpretation (README): lines not referenced by any option (as
 * player_line or response slot) form the scene spine in array order; each
 * choice node attaches after the spine; each option fans out to its response
 * lines, then rejoins at a gather node (or diverts).
 */

export type SceneNodeKind = "line" | "choice" | "option" | "gather";
export type Direction = "TB" | "LR";

export interface SceneNodeData {
  line?: Line;
  choice?: ChoiceNode;
  option?: ChoiceOption;
  /** text of the option's player_line slot, if spoken */
  playerLineText?: string;
  playerLineTarget?: string;
  chips?: string[];
}

/** Topology-only node: no position, no size. */
export interface SceneNodeModel {
  id: string;
  kind: SceneNodeKind;
  data: SceneNodeData;
}

export interface SceneEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** the fall-through around a gated beat: choice -> gather when the gate fails */
  bypass?: boolean;
  /**
   * Which named source handle the edge leaves from. A choice card renders one
   * bottom handle per option (Handle id === option_id), so each branch leaves
   * from its own pin instead of all N edges stacking on one point. Undefined
   * means "the card's default handle" — every non-choice edge, and the bypass.
   */
  sourceHandle?: string;
}

/** A model node with a computed position and the size used to place it. */
export interface PositionedNode extends SceneNodeModel {
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface SceneModel {
  nodes: SceneNodeModel[];
  edges: SceneEdge[];
}

/** First-render fallback size per kind, before the cards are measured. Coarse
 *  on purpose: it only has to keep nodes off (0,0) so React Flow can measure. */
export function defaultSize(kind: SceneNodeKind): { width: number; height: number } {
  return kind === "gather" ? { width: 140, height: 64 } : { width: 260, height: 120 };
}

/** Build the scene's node/edge topology. Pure; no layout. */
export function buildSceneModel(scene: Scene): SceneModel {
  const referenced = new Set<string>();
  for (const ch of scene.choice_nodes) {
    // A gather_line stands AT its node's gather, not free in the scene's
    // narration chain. Without this it lands in the spine and the beat reads
    // twice — once before every choice card, once where it actually plays.
    if (ch.gather_line) referenced.add(ch.gather_line);
    for (const opt of ch.options) {
      if (opt.player_line) referenced.add(opt.player_line);
      for (const r of opt.response_slots) referenced.add(r);
    }
  }
  const lineById = new Map(scene.lines.map((l) => [l.content_id, l]));
  const spine = scene.lines.filter((l) => !referenced.has(l.content_id));

  const nodes: SceneNodeModel[] = [];
  const edges: SceneEdge[] = [];
  let prev: string | null = null;

  const link = (source: string, target: string, label?: string) => {
    edges.push({ id: `e-${source}-${target}`, source, target, label });
  };
  const add = (node: SceneNodeModel) => nodes.push(node);

  for (const line of spine) {
    add({ id: line.content_id, kind: "line", data: { line } });
    if (prev) link(prev, line.content_id);
    prev = line.content_id;
  }

  /** The sub-conversations carried by one option, in authored order. */
  const subsOf = (optionId: string) =>
    scene.choice_nodes.filter((n) => n.parent_option === optionId);

  /**
   * Emit one choice node and everything hanging off it. Returns the id flow
   * continues from — its gather — or null when no option rejoins.
   *
   * Recursive, because a sub-conversation is an ordinary node that happens to
   * be emitted from inside an option rather than after the previous gather.
   * The node id stays `g_<choice_id>` even for the convergence gather: saved
   * canvas positions key off it, and `playMap` already resolves the real ink
   * label from `gather_address`, so the two never have to agree here.
   */
  const emitNode = (ch: (typeof scene.choice_nodes)[number], incoming: string | null) => {
    add({
      id: ch.choice_id,
      kind: "choice",
      // availability_conditions render as gates on the choice card
      data: { choice: ch, chips: ch.availability_conditions.map((c) => `gate: ${c}`) },
    });
    if (incoming) link(incoming, ch.choice_id);

    const gatherId = `g_${ch.choice_id}`;
    let needGather = false;

    for (const opt of ch.options) {
      const playerLine = opt.player_line ? lineById.get(opt.player_line) : undefined;
      add({
        id: opt.option_id,
        kind: "option",
        data: {
          option: opt,
          playerLineText: playerLine?.text,
          playerLineTarget: playerLine?.content_id,
          chips: opt.state_actions,
        },
      });
      // The edge leaves the choice card from THIS option's own pin.
      edges.push({
        id: `e-${ch.choice_id}-${opt.option_id}`,
        source: ch.choice_id,
        target: opt.option_id,
        sourceHandle: opt.option_id,
      });

      let optPrev = opt.option_id;
      for (const respId of opt.response_slots) {
        const line = lineById.get(respId);
        if (!line) continue;
        add({ id: line.content_id, kind: "line", data: { line } });
        link(optPrev, line.content_id);
        optPrev = line.content_id;
      }

      // A sub-conversation plays INSIDE this option: its beats chain off the
      // option's own last response, and only after they converge does flow
      // reach this node's gather. Attaching them to the gather instead would
      // draw the gated-siblings picture nesting exists to replace.
      const subs = subsOf(opt.option_id);
      if (subs.length > 0) {
        let subPrev: string | null = optPrev;
        for (const sub of subs) subPrev = emitNode(sub, subPrev);
        needGather = true;
        if (subPrev) {
          edges.push({ id: `e-${subPrev}-${gatherId}`, source: subPrev, target: gatherId });
        }
        continue;
      }

      if (opt.rejoin === "divert" && opt.divert_to) {
        link(optPrev, opt.divert_to, "divert");
      } else {
        needGather = true;
        edges.push({ id: `e-${optPrev}-${gatherId}`, source: optPrev, target: gatherId });
      }
    }

    if (needGather) {
      // A `gather_line` is the beat that STANDS at this gather — it was pulled
      // out of the spine above so it would not read twice, which left the card
      // with nothing but an id to show. Hand it to the node so the card can
      // render it the way a line card does (GP-18).
      const gatherLine = ch.gather_line ? lineById.get(ch.gather_line) : undefined;
      add({ id: gatherId, kind: "gather", data: gatherLine ? { line: gatherLine } : {} });
      // A gated beat can be skipped when the gate fails; show that fall-through
      // as a bypass edge straight from the choice to its gather, so the scene's
      // path to its end reads clearly even when the beat does not play.
      if (ch.availability_conditions.length > 0) {
        edges.push({
          id: `e-bypass-${ch.choice_id}`,
          source: ch.choice_id,
          target: gatherId,
          label: "gate fails",
          bypass: true,
        });
      }
      return gatherId;
    }
    return null;
  };

  // Top-level nodes only — a nested node is emitted by the option that carries
  // it, and emitting it here as well would put the same beat on the canvas twice.
  for (const ch of scene.choice_nodes) {
    if (ch.parent_option) continue;
    const out = emitNode(ch, prev);
    if (out) prev = out;
  }

  return { nodes, edges };
}

/**
 * Lay the model out with dagre. `direction` sets the flow axis:
 *   "TB" — top to bottom (default): beats descend, options fan across a row,
 *          matching the in-game dialogue box flow.
 *   "LR" — left to right: the earlier ruling; options stack in a column.
 * `sizes` are the measured card sizes; a node missing from the map falls back
 * to the coarse default for its kind (used on the very first render).
 */
export function layoutSceneGraph(
  nodes: SceneNodeModel[],
  edges: SceneEdge[],
  sizes: Map<string, { width: number; height: number }>,
  opts: { direction: Direction }
): { nodes: PositionedNode[]; edges: SceneEdge[] } {
  const g = new dagre.graphlib.Graph();
  // Spacing swaps meaning with the axis: nodesep separates siblings across the
  // rank, ranksep separates ranks along the flow. Keep siblings roomy either way.
  g.setGraph({ rankdir: opts.direction, nodesep: 48, ranksep: 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizeOf = (n: SceneNodeModel) => sizes.get(n.id) ?? defaultSize(n.kind);
  for (const n of nodes) g.setNode(n.id, sizeOf(n));
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const placed: PositionedNode[] = nodes.map((n) => {
    const size = sizeOf(n);
    const pos = g.node(n.id);
    // dagre centers nodes; React Flow positions from the top-left corner.
    return {
      ...n,
      width: size.width,
      height: size.height,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
    };
  });
  return { nodes: placed, edges: edges.filter((e) => g.hasNode(e.source) && g.hasNode(e.target)) };
}
