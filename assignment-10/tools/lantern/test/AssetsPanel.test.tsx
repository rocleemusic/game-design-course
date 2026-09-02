import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AssetsPanel } from "../src/components/AssetsPanel";
import { normalizeGraph } from "../src/lib/normalizeGraph";
import type { Graph } from "../src/types";
import graphFixture from "../fixtures/graph.json";

const graph: Graph = normalizeGraph(graphFixture);

/** Stub the bridge: an image list, an upload, and a manifest write. */
function stubFetch(over: {
  images?: string[];
  upload?: () => Response;
  manifest?: () => Response;
} = {}) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith("/__bridge/images"))
      return new Response(JSON.stringify({ images: over.images ?? [] }), { status: 200 });
    if (u.startsWith("/__bridge/image"))
      return (
        over.upload?.() ??
        new Response(JSON.stringify({ manifest: { T2: "images/town-market.png" } }), {
          status: 200,
        })
      );
    if (u.startsWith("/__bridge/manifest")) {
      if (over.manifest) return over.manifest();
      const b = JSON.parse(String(init!.body));
      return new Response(
        JSON.stringify({ manifest: b.path === null ? {} : { [b.screen_id]: b.path } }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ error: "nope" }), { status: 404 });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function renderPanel(manifest: Record<string, string> | null = null) {
  const onManifest = vi.fn();
  const utils = render(
    <AssetsPanel graph={graph} manifest={manifest} dir="fixtures" onManifest={onManifest} />
  );
  return { onManifest, ...utils };
}

function pngFile(name = "town-market.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

describe("AssetsPanel", () => {
  beforeEach(() => stubFetch());

  it("lists every screen, not only the ones with art", () => {
    renderPanel();
    for (const s of graph.screens) expect(screen.getByText(s.screen_id)).toBeTruthy();
  });

  it("says which screens have no image, and counts the ones that do", () => {
    renderPanel({ T2: "images/t2.png" });
    expect(screen.getByText(/1 of \d+ screens have art/)).toBeTruthy();
    expect(screen.getAllByText("no image").length).toBe(graph.screens.length - 1);
  });

  it("uploads a picked file and hands back the new manifest", async () => {
    const { onManifest } = renderPanel();
    fireEvent.change(screen.getByLabelText("upload an image for T2"), {
      target: { files: [pngFile()] },
    });
    await waitFor(() =>
      expect(onManifest).toHaveBeenCalledWith({ T2: "images/town-market.png" })
    );
    const call = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls
      .find(([u]) => String(u).startsWith("/__bridge/image?"));
    expect(call![0]).toContain("screen_id=T2");
    expect(call![1].body).toBeInstanceOf(File); // raw File, no multipart wrapper
  });

  it("surfaces an upload error on the row instead of blanking the panel", async () => {
    stubFetch({
      upload: () =>
        new Response(JSON.stringify({ error: 'unsupported image type ".svg"' }), {
          status: 400,
        }),
    });
    renderPanel();
    fireEvent.change(screen.getByLabelText("upload an image for T2"), {
      target: { files: [pngFile("bad.png")] },
    });
    await waitFor(() => expect(screen.getByText(/unsupported image type/)).toBeTruthy());
    expect(screen.getByLabelText("upload an image for T1")).toBeTruthy();
  });

  it("accepts a dropped file", async () => {
    const { onManifest } = renderPanel();
    const row = screen.getByText("T2").closest(".asset-row")!;
    fireEvent.drop(row, { dataTransfer: { files: [pngFile()] } });
    await waitFor(() => expect(onManifest).toHaveBeenCalled());
  });

  // ---- the two things using it exposed ----

  it("shows images that are uploaded but on no screen", async () => {
    stubFetch({ images: ["images/spare.png", "images/t2.png"] });
    renderPanel({ T2: "images/t2.png" });
    await waitFor(() => expect(screen.getByLabelText("unassigned images")).toBeTruthy());
    const unused = screen.getByLabelText("unassigned images");
    expect(unused.textContent).toContain("spare.png");
    // the one in use is not listed as unused
    expect(unused.textContent).not.toContain("t2.png");
    expect(screen.getByText(/1 unused/)).toBeTruthy();
  });

  it("reuses an existing image WITHOUT uploading, so nothing asks about overwriting", async () => {
    const fn = stubFetch({ images: ["images/shared.png"] });
    const { onManifest } = renderPanel();

    await waitFor(() =>
      expect(screen.getByLabelText("choose an existing image for T2")).toBeTruthy()
    );
    fireEvent.click(screen.getByLabelText("choose an existing image for T2"));
    fireEvent.click(screen.getByLabelText("use shared.png for T2"));

    await waitFor(() =>
      expect(onManifest).toHaveBeenCalledWith({ T2: "images/shared.png" })
    );
    // assignment went to /manifest, and NOT to the upload route
    const urls = fn.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.startsWith("/__bridge/manifest"))).toBe(true);
    expect(urls.some((u) => u.startsWith("/__bridge/image?"))).toBe(false);
  });

  it("names the other screens sharing one picture", async () => {
    stubFetch({ images: ["images/shared.png"] });
    renderPanel({ T1: "images/shared.png", T2: "images/shared.png" });
    await waitFor(() => expect(screen.getAllByText(/also on/).length).toBe(2));
    const row = screen.getByText("T2").closest(".asset-row")!;
    expect(row.textContent).toContain("also on T1");
  });

  it("clears a screen's image", async () => {
    const fn = stubFetch({ images: ["images/t2.png"] });
    const { onManifest } = renderPanel({ T2: "images/t2.png" });
    fireEvent.click(screen.getByLabelText("clear the image for T2"));
    await waitFor(() => expect(onManifest).toHaveBeenCalledWith({}));
    const body = JSON.parse(
      String(fn.mock.calls.find(([u]) => String(u).startsWith("/__bridge/manifest"))![1]!.body)
    );
    expect(body.path).toBeNull();
  });
});
