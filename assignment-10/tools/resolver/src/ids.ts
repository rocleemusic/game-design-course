// ID minting and the ink-address rule (build-loop.md, file split S4).
//
// The address rule: lowercase the minted ID, replace every character that is
// not a letter or digit with "_". Gather labels take a "g_" prefix. A scene is
// a stitch in its soul's knot, so its full address is "<soul>.<scene>".
// graph.json carries both forms so nothing downstream re-derives an address.

import type { SceneGraph, Scene, ChoiceNode, ChoiceOption } from "./types.ts";

/** The ink-address rule, exactly: lowercase; non-alphanumeric -> "_". */
export function inkAddress(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/** A scene's full ink address: <soul>.<scene>, each part through the address rule. */
export function sceneInkAddress(soulId: string, sceneId: string): string {
  return `${inkAddress(soulId)}.${inkAddress(sceneId)}`;
}

/** A choice node's gather label: g_ prefix on the address form of the choice_id. */
export function gatherAddress(choiceId: string): string {
  return `g_${inkAddress(choiceId)}`;
}

const OPTION_LETTERS = "abcdefghijklmnopqrstuvwxyz";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Mint any missing IDs in a scene graph, deterministically (by array order).
 * Existing IDs are kept untouched — minted IDs are stable once assigned.
 *
 * Formats:
 *   scene_id   SC-<screen>-<seq>        (SC-T2-01)
 *   choice_id  CH-<screen>-<seq>        (CH-T2-04), seq counted per screen
 *   option_id  <choice_id>-<letter>     (CH-T2-04-a)
 *   content_id L-<scene>-<seq>          (L-SC-T2-01-03), seq counted per scene
 *
 * Returns a deep copy; the input is not mutated.
 */
export function mintIds(sceneGraph: SceneGraph): SceneGraph {
  const out: SceneGraph = structuredClone(sceneGraph);
  const sceneSeq = new Map<string, number>(); // per screen
  const choiceSeq = new Map<string, number>(); // per screen

  for (const scene of out.scenes) {
    if (!scene.scene_id) {
      const n = (sceneSeq.get(scene.screen_id) ?? 0) + 1;
      sceneSeq.set(scene.screen_id, n);
      scene.scene_id = `SC-${scene.screen_id}-${pad2(n)}`;
    }
    let lineSeq = 0;
    for (const line of scene.lines) {
      lineSeq += 1;
      if (!line.content_id) {
        line.content_id = `L-${scene.scene_id}-${pad2(lineSeq)}`;
      }
    }
    for (const node of scene.choice_nodes) {
      mintChoiceIds(node, scene, choiceSeq);
    }
  }
  return out;
}

function mintChoiceIds(node: ChoiceNode, scene: Scene, choiceSeq: Map<string, number>): void {
  if (!node.choice_id) {
    const n = (choiceSeq.get(scene.screen_id) ?? 0) + 1;
    choiceSeq.set(scene.screen_id, n);
    node.choice_id = `CH-${scene.screen_id}-${pad2(n)}`;
  }
  if (!node.scene_id) {
    node.scene_id = scene.scene_id;
  }
  node.options.forEach((opt: ChoiceOption, i: number) => {
    if (!opt.option_id) {
      if (i >= OPTION_LETTERS.length) {
        throw new Error(`mintIds: too many options on ${node.choice_id}`);
      }
      opt.option_id = `${node.choice_id}-${OPTION_LETTERS[i]}`;
    }
  });
}
