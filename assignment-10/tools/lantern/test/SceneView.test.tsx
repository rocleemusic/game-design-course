import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SceneTree } from "../src/components/SceneView";
import type { ReviewApi } from "../src/components/reviewApi";
import type { Scene } from "../src/types";

/**
 * The blueprint card shows its review state as a dot, not a word — the dot's
 * accessible name is the state. Read it through here so a later restyle of the
 * dot does not rewrite five tests.
 */
function statusOfCard(card: Element): string {
  return card
    .querySelector(".bp-dot")!
    .getAttribute("aria-label")!
    .replace(/^status /, "");
}

function makeApi(): ReviewApi {
  return {
    statusOf: () => "pending",
    noteOf: () => undefined,
    soulName: (id) => (id === "toby" ? "Toby" : (id ?? "")),
    textOf: (_target, original) => original,
    playState: () => null,
    sweepDim: () => false,
    varHit: () => false,
    approve: vi.fn(),
    flag: vi.fn(),
    clearStatus: vi.fn(),
    saveEdit: vi.fn(),
  };
}

// One choice, three deed options: a real surface_action, an empty-string one,
// and one whose spec has no surface_action at all.
const scene: Scene = {
  scene_id: "SC-X-01",
  soul: "toby",
  screen_id: "T2",
  ink_address: "toby.sc_x_01",
  lines: [],
  choice_nodes: [
    {
      choice_id: "CH-X",
      scene_id: "SC-X-01",
      availability_conditions: [],
      equal_weight_note: "note",
      no_accrual_note: "",
      options: [
        {
          option_id: "CH-X-a",
          verb_family: "act",
          player_verb: "leave",
          surface_action: "leave the bread",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
        {
          option_id: "CH-X-b",
          verb_family: "act",
          player_verb: "wait",
          surface_action: "",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
        {
          option_id: "CH-X-c",
          verb_family: "act",
          player_verb: "shrug",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
      ],
    },
  ],
};

// One choice, one spoken option riding a player_line.
const spokenScene: Scene = {
  scene_id: "SC-Y-01",
  soul: "mera",
  screen_id: "T1",
  ink_address: "mera.sc_y_01",
  lines: [
    {
      content_id: "CL-Y-01",
      slot_type: "player_line",
      speaker_id: "player",
      text: "Let me help you.",
    },
  ],
  choice_nodes: [
    {
      choice_id: "CH-Y",
      scene_id: "SC-Y-01",
      availability_conditions: [],
      equal_weight_note: "",
      no_accrual_note: "",
      options: [
        {
          option_id: "CH-Y-a",
          verb_family: "social",
          player_verb: "offer",
          player_line: "CL-Y-01",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
      ],
    },
  ],
};

describe("SceneTree edge handles (React Flow drops edges without them)", () => {
  it("every flow node renders one target and one source handle", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    // choice + 3 options + gather = 5 nodes
    expect(document.querySelectorAll(".flow-handle.target")).toHaveLength(5);
    expect(document.querySelectorAll(".flow-handle.source")).toHaveLength(5);
  });
});

describe("SceneTree spoken option status", () => {
  it("surfaces `edited` from the player_line's content_id (which has no card)", () => {
    const api = makeApi();
    api.statusOf = (id) => (id === "CL-Y-01" ? "edited" : "pending");
    render(<SceneTree scene={spokenScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(card.className).toContain("status-edited");
    expect(statusOfCard(card)).toBe("edited");
  });

  // The defect underneath the struck "bug 5": one badge carried two facts, so
  // approving an option and then editing its line showed "approved" and hid
  // the edit. They are separate marks now.
  it("shows BOTH the option's own status and a line-edited mark", () => {
    const api = makeApi();
    api.statusOf = (id) =>
      id === "CL-Y-01" ? "edited" : id === "CH-Y-a" ? "approved" : "pending";
    render(<SceneTree scene={spokenScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(statusOfCard(card)).toBe("approved");
    expect(card.querySelector(".line-edited-badge")).toBeTruthy();
  });

  it("shows no line-edited mark when the line was not edited", () => {
    const api = makeApi();
    api.statusOf = (id) => (id === "CH-Y-a" ? "approved" : "pending");
    render(<SceneTree scene={spokenScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(card.querySelector(".line-edited-badge")).toBeNull();
  });

  it("does not double up: a pending option carries the edit in the badge alone", () => {
    const api = makeApi();
    api.statusOf = (id) => (id === "CL-Y-01" ? "edited" : "pending");
    render(<SceneTree scene={spokenScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(statusOfCard(card)).toBe("edited");
    expect(card.querySelector(".line-edited-badge")).toBeNull();
  });

  it("the option's own status still wins over the line's edited mark", () => {
    const api = makeApi();
    api.statusOf = (id) =>
      id === "CH-Y-a" ? "flagged" : id === "CL-Y-01" ? "edited" : "pending";
    render(<SceneTree scene={spokenScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(card.className).toContain("status-flagged");
  });
});

describe("SceneTree deed options and the empty-field edit path", () => {
  it("a deed with a surface_action edits in place against that field", () => {
    const api = makeApi();
    render(<SceneTree scene={scene} api={api} />);
    fireEvent.click(screen.getByText("[leave the bread]"));
    const area = screen.getByLabelText(
      "edit CH-X-a.surface_action"
    ) as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: "leave the whole basket" } });
    fireEvent.click(screen.getByText("Save"));
    expect(api.saveEdit).toHaveBeenCalledWith(
      "CH-X-a.surface_action",
      "leave the bread",
      "leave the whole basket"
    );
  });

  it("an empty-string surface_action is still editable (old_text is legitimately empty)", () => {
    const api = makeApi();
    render(<SceneTree scene={scene} api={api} />);
    // No Edit button on the card any more, so `e` on the focused card is the
    // path. An empty field has no text to click, which is exactly why the
    // keyboard route has to exist.
    const card = document.querySelector('[data-artifact-id="CH-X-b"]')!;
    fireEvent.keyDown(card, { key: "e" });
    const area = screen.getByLabelText(
      "edit CH-X-b.surface_action"
    ) as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: "wait it out" } });
    fireEvent.click(screen.getByText("Save"));
    expect(api.saveEdit).toHaveBeenCalledWith("CH-X-b.surface_action", "", "wait it out");
  });

  it("a deed with NO surface_action field is not editable and says why", () => {
    const api = makeApi();
    render(<SceneTree scene={scene} api={api} />);
    // the hint replaces the edit affordance
    expect(
      screen.getByText("no text to edit; field is empty in the spec")
    ).toBeTruthy();
    const card = document.querySelector('[data-artifact-id="CH-X-c"]')!;
    expect(card.querySelector(".card-text")).toBeNull();
    // neither Enter nor `e` may open an edit on a field that does not exist
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: "e" });
    expect(screen.queryByLabelText(/edit CH-X-c/)).toBeNull();
    expect(api.saveEdit).not.toHaveBeenCalled();
    // review still works — the card is reviewable, just not editable
    fireEvent.keyDown(card, { key: "a" });
    expect(api.approve).toHaveBeenCalledWith("CH-X-c");
  });
});

// One choice whose gather carries a `gather_line` — authored prose standing at
// the convergence point — plus one plain gather that carries nothing.
const gatherScene: Scene = {
  scene_id: "SC-Z-01",
  soul: "ilsa",
  screen_id: "T4",
  ink_address: "ilsa.sc_z_01",
  lines: [
    {
      content_id: "L-Z-GB",
      slot_type: "dialogue",
      speaker_id: "ilsa",
      text: "She banks the forge and the room goes orange.",
    },
  ],
  choice_nodes: [
    {
      choice_id: "CH-Z",
      scene_id: "SC-Z-01",
      availability_conditions: [],
      equal_weight_note: "",
      no_accrual_note: "",
      gather_line: "L-Z-GB",
      options: [
        {
          option_id: "CH-Z-a",
          verb_family: "act",
          player_verb: "stay",
          surface_action: "stay",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
      ],
    },
    {
      choice_id: "CH-W",
      scene_id: "SC-Z-01",
      availability_conditions: [],
      equal_weight_note: "",
      no_accrual_note: "",
      options: [
        {
          option_id: "CH-W-a",
          verb_family: "act",
          player_verb: "go",
          surface_action: "go",
          response_slots: [],
          state_actions: [],
          rejoin: "gather",
        },
      ],
    },
  ],
};

/**
 * GP-18. The gather card rendered an id and the word "gather" while the ink
 * under it already carried the beat's text, so prose would have gone into a
 * scene Roc approved without the review tool ever showing it to him. A gather
 * holding a `gather_line` is a beat, and reads like any other line card.
 */
describe("SceneTree gather line (GP-18)", () => {
  it("renders the gather_line's text on the gather card", () => {
    render(<SceneTree scene={gatherScene} api={makeApi()} />);
    expect(screen.getByText("She banks the forge and the room goes orange.")).toBeTruthy();
  });

  it("presents it as a line card does — speaker, editable text, status dot", () => {
    render(<SceneTree scene={gatherScene} api={makeApi()} />);
    const card = document.querySelector('[data-artifact-id="L-Z-GB"]')! as HTMLElement;
    expect(card.className).toContain("kind-gather");
    // the compact marker styling must not reach a card that has prose in it
    expect(card.className).not.toContain("gather-marker");
    expect(card.querySelector(".bp-title")!.textContent).toBe("ilsa");
    expect(card.querySelector(".card-text")!.className).toContain("editable");
    expect(statusOfCard(card)).toBe("pending");
  });

  it("edits and reviews against the LINE's content_id, not the gather node id", () => {
    const api = makeApi();
    render(<SceneTree scene={gatherScene} api={api} />);
    const card = document.querySelector('[data-artifact-id="L-Z-GB"]')!;
    fireEvent.keyDown(card, { key: "a" });
    expect(api.approve).toHaveBeenCalledWith("L-Z-GB");

    fireEvent.click(screen.getByText("She banks the forge and the room goes orange."));
    const area = screen.getByLabelText("edit L-Z-GB") as HTMLTextAreaElement;
    fireEvent.change(area, { target: { value: "She banks the forge." } });
    fireEvent.click(screen.getByText("Save"));
    expect(api.saveEdit).toHaveBeenCalledWith(
      "L-Z-GB",
      "She banks the forge and the room goes orange.",
      "She banks the forge."
    );
  });

  it("leaves a gather with no gather_line as the compact marker it was", () => {
    render(<SceneTree scene={gatherScene} api={makeApi()} />);
    const marker = document.querySelector(".bp-node.gather-marker")!;
    expect(marker.querySelector(".bp-id")!.textContent).toBe("g_CH-W");
    expect(marker.querySelector(".card-text")).toBeNull();
  });

  // The gather_line is pulled out of the spine so the beat does not read twice.
  // Before this fix that made it invisible; it must now appear exactly once.
  it("shows the gather beat once, at the gather, not also in the spine", () => {
    render(<SceneTree scene={gatherScene} api={makeApi()} />);
    expect(
      document.querySelectorAll('[data-artifact-id="L-Z-GB"]')
    ).toHaveLength(1);
  });
});

/**
 * The rulings this build phase turns on. Each of these is a thing that was
 * true, got ruled against, and must not drift back.
 */
describe("SceneTree blueprint cards", () => {
  const cardOf = (id: string) =>
    document.querySelector(`[data-artifact-id="${id}"]`)! as HTMLElement;

  // RULING 1: Approve and Flag were inside the card's click target and got hit
  // by accident. They are off the card now, on the hover/focus toolbar.
  it("no card carries an approve or flag control", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    for (const id of ["CH-X", "CH-X-a", "CH-X-b", "CH-X-c"]) {
      const card = cardOf(id);
      expect(card.querySelector(`[aria-label="approve ${id}"]`)).toBeNull();
      expect(card.querySelector(`[aria-label="flag ${id}"]`)).toBeNull();
      expect(
        card.querySelector(`[aria-label="clear review status of ${id}"]`)
      ).toBeNull();
      // and nothing that merely LOOKS like one either
      expect(card.querySelector("button.pill-primary")).toBeNull();
      expect(card.querySelector("button.pill-flag")).toBeNull();
    }
  });

  // ...but removing them may not remove the ability. A hidden toolbar must
  // never make approving unreachable.
  it("keeps a keyboard path to approve, flag and clear", () => {
    const api = makeApi();
    api.statusOf = () => "flagged";
    render(<SceneTree scene={scene} api={api} />);
    const card = cardOf("CH-X-a");
    fireEvent.keyDown(card, { key: "a" });
    expect(api.approve).toHaveBeenCalledWith("CH-X-a");
    fireEvent.keyDown(card, { key: "f" });
    expect(api.flag).toHaveBeenCalledWith("CH-X-a");
    fireEvent.keyDown(card, { key: "c" });
    expect(api.clearStatus).toHaveBeenCalledWith("CH-X-a");
  });

  it("offers the same verbs on a toolbar OUTSIDE the card, on hover", () => {
    const api = makeApi();
    render(<SceneTree scene={scene} api={api} />);
    const card = cardOf("CH-X-a");
    // nothing showing until the node is pointed at
    expect(screen.queryByLabelText("approve CH-X-a")).toBeNull();
    fireEvent.pointerEnter(card.parentElement!);
    const approve = screen.getByLabelText("approve CH-X-a");
    expect(card.contains(approve)).toBe(false); // OUTSIDE the card
    fireEvent.click(approve);
    expect(api.approve).toHaveBeenCalledWith("CH-X-a");
  });

  it("hides Clear on a pending node — there is nothing to clear", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    fireEvent.pointerEnter(cardOf("CH-X-a").parentElement!);
    expect(screen.getByLabelText("approve CH-X-a")).toBeTruthy();
    expect(screen.queryByLabelText("clear review status of CH-X-a")).toBeNull();
  });

  // RULING 2: the card is opaque. Depth is border + shadow + the head/body
  // step, so no inline style may set an alpha or an opacity on it.
  it("sets no translucency on any card", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    for (const card of document.querySelectorAll<HTMLElement>(".bp-node")) {
      expect(card.style.opacity).toBe("");
      expect(card.getAttribute("style") ?? "").not.toMatch(
        /rgba|hsla|opacity|transparent/
      );
    }
  });

  // The Blueprint anatomy: a header bar with kind + mono id + status dot, and
  // a body that is a separate element so it can be styled darker.
  it("gives every card a head (kind · id · status dot) and a body", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    const card = cardOf("CH-X-a");
    expect(card.querySelector(".bp-head .bp-kind")!.textContent).toBe("option");
    expect(card.querySelector(".bp-head .bp-id")!.textContent).toBe("CH-X-a");
    expect(card.querySelector(".bp-head .bp-dot")).toBeTruthy();
    expect(card.querySelector(".bp-body")).toBeTruthy();
    expect(card.className).toContain("kind-option");
  });
});

// RULING 3: one bottom handle per option, id === option_id, so each branch
// leaves the choice card from its own pin instead of all N stacking on one.
describe("SceneTree per-option handles", () => {
  it("renders one handle per option, id'd by option, evenly spaced", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    const pins = [...document.querySelectorAll<HTMLElement>(".bp-handle")];
    expect(pins).toHaveLength(3); // one per option on CH-X
    expect(pins.map((p) => p.getAttribute("data-handleid"))).toEqual([
      "CH-X-a",
      "CH-X-b",
      "CH-X-c",
    ]);
    // ((i + 0.5) / N) * 100
    expect(pins.map((p) => p.style.left)).toEqual([
      "16.666666666666664%",
      "50%",
      "83.33333333333334%",
    ]);
  });

  it("they are decoration, never a connection target", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    for (const pin of document.querySelectorAll(".bp-handle")) {
      // React Flow only tags a handle connectable when it actually is; these
      // carry neither tag. The 44px target floor is about things you aim at,
      // and nothing is ever aimed at these, so a 9px pin is correct.
      expect(pin.className).not.toMatch(/\bconnectable(start|end)?\b/);
    }
  });

  it("a node with no options renders no option handles", () => {
    render(<SceneTree scene={spokenScene} api={makeApi()} />);
    const optionCard = document.querySelector('[data-artifact-id="CH-Y-a"]')!;
    expect(optionCard.parentElement!.querySelectorAll(".bp-handle")).toHaveLength(0);
  });

  it("labels each pin with its option's verb, over its own handle", () => {
    render(<SceneTree scene={scene} api={makeApi()} />);
    const labels = [...document.querySelectorAll<HTMLElement>(".bp-pin")];
    expect(labels.map((l) => l.textContent)).toEqual(["leave", "wait", "shrug"]);
    expect(labels.map((l) => l.style.left)).toEqual([
      "16.666666666666664%",
      "50%",
      "83.33333333333334%",
    ]);
  });
});
