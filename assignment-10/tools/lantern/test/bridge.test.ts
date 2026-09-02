// @vitest-environment node
// (importing vite.config pulls in vite/esbuild, which refuses jsdom's globals;
// nothing here needs a DOM)
//
// POST /edit contract (the resolver round trip depends on it):
// every appended patch must carry old_text as a string, so the resolver can
// verify it against the current source text. See resolver/test/roundtrip.test.ts.

import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  IMAGE_TYPES,
  lanternBridge,
  validateApproveBody,
  validateEditBody,
  validateImageName,
  validateManifestBody,
  validateNoteBody,
  validateNoteResolveBody,
  validateNoteUpdateBody,
  validateRegionsBody,
} from "../vite.config";
import { loadRun } from "../src/lib/bridge";

const tmp = mkdtempSync(join(tmpdir(), "lantern-bridge-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** Capture the /__bridge middleware from the plugin without a real server. */
function bridgeHandler() {
  let handler: (req: unknown, res: unknown) => Promise<void> | void;
  const plugin = lanternBridge() as {
    configureServer?: (server: unknown) => void;
  };
  plugin.configureServer!({
    middlewares: {
      use: (_route: string, h: typeof handler) => {
        handler = h;
      },
    },
  });
  return handler!;
}

function fakeReq(method: string, url: string, body?: unknown) {
  const listeners: Record<string, (arg?: unknown) => void> = {};
  const req = {
    method,
    url,
    on(ev: string, cb: (arg?: unknown) => void) {
      listeners[ev] = cb;
      return req;
    },
  };
  // Delivered after the handler's sync part has subscribed.
  setTimeout(() => {
    if (body !== undefined) listeners.data?.(JSON.stringify(body));
    listeners.end?.();
  }, 0);
  return req;
}

function fakeRes() {
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const res = {
    statusCode: 0,
    body: "",
    done,
    setHeader() {},
    end(chunk?: unknown) {
      res.body = String(chunk ?? "");
      resolve();
    },
  };
  return res;
}

async function postEdit(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/edit", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

async function postApprove(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/approve", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

/**
 * The image route takes RAW BYTES, not JSON, so it needs its own fake request:
 * chunks are Buffers and the content type rides in a header.
 */
function fakeRawReq(url: string, bytes: Buffer, contentType: string) {
  const listeners: Record<string, (arg?: unknown) => void> = {};
  const req = {
    method: "POST",
    url,
    headers: { "content-type": contentType },
    destroy() {},
    on(ev: string, cb: (arg?: unknown) => void) {
      listeners[ev] = cb;
      return req;
    },
  };
  setTimeout(() => {
    if (bytes.length > 0) listeners.data?.(bytes);
    listeners.end?.();
  }, 0);
  return req;
}

async function postNote(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/note", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

async function postNoteResolve(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/note-resolve", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

async function postNoteUpdate(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/note-update", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

async function postManifest(dir: string, screenId: string, imagePath: string | null) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(
    fakeReq("POST", "/manifest", { dir, screen_id: screenId, path: imagePath }),
    res
  );
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

async function postImage(
  dir: string,
  screenId: string,
  name: string,
  bytes: Buffer,
  extraQuery = ""
) {
  const handler = bridgeHandler();
  const res = fakeRes();
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const contentType = IMAGE_TYPES[ext] ?? "application/octet-stream";
  const url =
    `/image?dir=${encodeURIComponent(dir)}` +
    `&screen_id=${encodeURIComponent(screenId)}` +
    `&name=${encodeURIComponent(name)}${extraQuery}`;
  await handler(fakeRawReq(url, bytes, contentType), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

describe("validateEditBody", () => {
  const good = { dir: tmp, target: "CL-1", old_text: "hello", new_text: "hi" };
  it("accepts a full patch", () => {
    expect(validateEditBody(good)).toBeNull();
  });
  it("accepts an empty-string old_text (field's current value really is empty)", () => {
    expect(validateEditBody({ ...good, old_text: "" })).toBeNull();
  });
  it("rejects a missing old_text with a message that names it", () => {
    const { old_text: _omit, ...rest } = good;
    expect(validateEditBody(rest)).toMatch(/old_text \(string\) required/);
  });
  it("rejects a non-string old_text", () => {
    expect(validateEditBody({ ...good, old_text: null })).toMatch(/old_text/);
  });
  it("rejects missing dir / target / new_text", () => {
    expect(validateEditBody({ ...good, dir: "" })).toMatch(/dir/);
    expect(validateEditBody({ ...good, target: undefined })).toMatch(/target/);
    expect(validateEditBody({ ...good, new_text: undefined })).toMatch(/new_text/);
  });
});

describe("validateApproveBody", () => {
  const good = { dir: tmp, artifact_id: "T2", status: "approved" };
  it("accepts each allowed status, including pending", () => {
    for (const status of ["approved", "flagged", "edited", "pending"]) {
      expect(validateApproveBody({ ...good, status })).toBeNull();
    }
  });
  it("rejects a status outside the allow-list — the old check took any truthy string", () => {
    expect(validateApproveBody({ ...good, status: "aproved" })).toMatch(/status must be one of/);
    expect(validateApproveBody({ ...good, status: "yes" })).toMatch(/status must be one of/);
  });
  it("rejects missing dir / artifact_id / status", () => {
    expect(validateApproveBody({ ...good, dir: "" })).toMatch(/dir/);
    expect(validateApproveBody({ ...good, artifact_id: undefined })).toMatch(/artifact_id/);
    expect(validateApproveBody({ ...good, status: undefined })).toMatch(/status/);
  });
  it("rejects a non-string note", () => {
    expect(validateApproveBody({ ...good, note: 7 })).toMatch(/note/);
  });
});

// Bug 3: there was no write path back to unreviewed, so a flagged card was
// flagged forever. Pending deletes the record rather than storing one, because
// store.ts already reads an absent key as pending.
describe("POST /approve — the pending path", () => {
  it("stores a flag with its note, then pending removes the record entirely", async () => {
    const dir = join(tmp, "unflag");

    const flagged = await postApprove({
      dir,
      artifact_id: "T2",
      status: "flagged",
      note: "this beat needs another option",
    });
    expect(flagged.status).toBe(200);
    expect(flagged.json.approvals.T2).toMatchObject({
      status: "flagged",
      note: "this beat needs another option",
    });

    const cleared = await postApprove({ dir, artifact_id: "T2", status: "pending" });
    expect(cleared.status).toBe(200);
    expect("T2" in cleared.json.approvals).toBe(false);

    const onDisk = JSON.parse(readFileSync(join(dir, "out", "approvals.json"), "utf-8"));
    expect("T2" in onDisk).toBe(false);
  });

  it("clearing one artifact leaves the others alone", async () => {
    const dir = join(tmp, "unflag-one");
    await postApprove({ dir, artifact_id: "T1", status: "approved" });
    await postApprove({ dir, artifact_id: "T2", status: "flagged" });
    const { json } = await postApprove({ dir, artifact_id: "T2", status: "pending" });
    expect(Object.keys(json.approvals)).toEqual(["T1"]);
  });

  it("400s a bad status and writes nothing", async () => {
    const dir = join(tmp, "approve-reject");
    const { status, json } = await postApprove({ dir, artifact_id: "T2", status: "nope" });
    expect(status).toBe(400);
    expect(json.error).toMatch(/status must be one of/);
    expect(() => readFileSync(join(dir, "out", "approvals.json"))).toThrow();
  });
});

describe("validateImageName", () => {
  it("accepts a plain name whose extension matches its content type", () => {
    expect(validateImageName("town-square.jpg", "image/jpeg")).toBeNull();
    expect(validateImageName("t2.png", "image/png")).toBeNull();
    // the format that used to be served as octet-stream and silently fail
    expect(validateImageName("town-2.avif", "image/avif")).toBeNull();
  });

  it("tolerates a charset parameter on the content type", () => {
    expect(validateImageName("t2.png", "image/png; charset=binary")).toBeNull();
  });

  it("rejects a traversal attempt outright rather than basenaming it away", () => {
    expect(validateImageName("../../etc/passwd.png", "image/png")).toMatch(
      /must not contain a path/
    );
    expect(validateImageName("images/t2.png", "image/png")).toMatch(
      /must not contain a path/
    );
  });

  it("rejects characters outside the whitelist, and dotfiles", () => {
    expect(validateImageName("a b.png", "image/png")).toMatch(/letters, digits/);
    expect(validateImageName("t2$.png", "image/png")).toMatch(/letters, digits/);
    expect(validateImageName(".hidden.png", "image/png")).toMatch(/start with a dot/);
  });

  it("rejects an unsupported extension", () => {
    expect(validateImageName("payload.svg", "image/svg+xml")).toMatch(/unsupported/);
    expect(validateImageName("script.js", "text/javascript")).toMatch(/unsupported/);
  });

  it("rejects a mismatch between extension and content type", () => {
    expect(validateImageName("t2.png", "text/html")).toMatch(/content-type must be/);
    expect(validateImageName("t2.png", "image/jpeg")).toMatch(/content-type must be/);
  });

  it("serves every uploadable format — the two maps cannot drift", () => {
    for (const [ext, type] of Object.entries(IMAGE_TYPES)) {
      expect(validateImageName(`x${ext}`, type)).toBeNull();
    }
  });
});

describe("POST /image", () => {
  // A 1x1 PNG. Real bytes matter: a string-accumulating body reader would
  // mangle these through UTF-8, which is why readRawBody exists.
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478da6360000002000155a2b5ee0000000049454e44ae426082",
    "hex"
  );

  it("writes the file byte-for-byte and points the manifest at it", async () => {
    const dir = join(tmp, "img-ok");
    const { status, json } = await postImage(dir, "T2", "town-market.png", png);
    expect(status).toBe(200);
    expect(json.manifest).toEqual({ T2: "images/town-market.png" });

    const onDisk = readFileSync(join(dir, "images", "town-market.png"));
    expect(onDisk.equals(png)).toBe(true);

    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf-8"));
    expect(manifest.T2).toBe("images/town-market.png");
  });

  it("keeps other screens' manifest entries when a new one lands", async () => {
    const dir = join(tmp, "img-merge");
    await postImage(dir, "T1", "a.png", png);
    const { json } = await postImage(dir, "T2", "b.png", png);
    expect(json.manifest).toEqual({ T1: "images/a.png", T2: "images/b.png" });
  });

  it("409s rather than clobbering, unless overwrite is asked for", async () => {
    const dir = join(tmp, "img-overwrite");
    await postImage(dir, "T1", "a.png", png);
    const clash = await postImage(dir, "T2", "a.png", png);
    expect(clash.status).toBe(409);
    expect(clash.json.error).toMatch(/already exists/);

    const forced = await postImage(dir, "T2", "a.png", png, "&overwrite=1");
    expect(forced.status).toBe(200);
  });

  it("400s a traversal attempt and writes nothing", async () => {
    const dir = join(tmp, "img-traversal");
    const { status, json } = await postImage(dir, "T2", "../escaped.png", png);
    expect(status).toBe(400);
    expect(json.error).toMatch(/must not contain a path/);
    expect(() => readFileSync(join(tmp, "escaped.png"))).toThrow();
  });

  it("400s a missing screen_id", async () => {
    const dir = join(tmp, "img-noscreen");
    const { status, json } = await postImage(dir, "", "a.png", png);
    expect(status).toBe(400);
    expect(json.error).toMatch(/screen_id required/);
  });

  it("400s an empty body", async () => {
    const dir = join(tmp, "img-empty");
    const { status, json } = await postImage(dir, "T2", "a.png", Buffer.alloc(0));
    expect(status).toBe(400);
    expect(json.error).toMatch(/empty body/);
  });
});

describe("validateManifestBody", () => {
  const good = { dir: "/run", screen_id: "T2", path: "images/t2.png" };
  it("accepts an images/ path, and null to unassign", () => {
    expect(validateManifestBody(good)).toBeNull();
    expect(validateManifestBody({ ...good, path: null })).toBeNull();
  });
  it("rejects a path outside images/ or one that traverses", () => {
    expect(validateManifestBody({ ...good, path: "t2.png" })).toMatch(/images\//);
    expect(validateManifestBody({ ...good, path: "images/../../x.png" })).toMatch(/traverse/);
  });
  it("rejects missing dir / screen_id / path", () => {
    expect(validateManifestBody({ ...good, dir: "" })).toMatch(/dir/);
    expect(validateManifestBody({ ...good, screen_id: undefined })).toMatch(/screen_id/);
    expect(validateManifestBody({ ...good, path: undefined })).toMatch(/path/);
  });
});

// Reuse is assignment, not upload. Routing it through the upload path is what
// made a second screen wanting the same picture ask about overwriting.
describe("GET /images and POST /manifest", () => {
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478da6360000002000155a2b5ee0000000049454e44ae426082",
    "hex"
  );

  it("lists every image in the folder, assigned or not", async () => {
    const dir = join(tmp, "lib");
    await postImage(dir, "T1", "a.png", png);
    await postImage(dir, "T2", "b.png", png);
    const handler = bridgeHandler();
    const res = fakeRes();
    await handler(fakeReq("GET", `/images?dir=${encodeURIComponent(dir)}`), res);
    await res.done;
    expect(JSON.parse(res.body).images).toEqual(["images/a.png", "images/b.png"]);
  });

  it("returns an empty list for a folder with no images dir", async () => {
    const handler = bridgeHandler();
    const res = fakeRes();
    await handler(fakeReq("GET", `/images?dir=${encodeURIComponent(join(tmp, "nope"))}`), res);
    await res.done;
    expect(JSON.parse(res.body).images).toEqual([]);
  });

  it("points a second screen at an existing image without touching the file", async () => {
    const dir = join(tmp, "reuse");
    await postImage(dir, "T1", "shared.png", png);
    const { status, json } = await postManifest(dir, "T2", "images/shared.png");
    expect(status).toBe(200);
    expect(json.manifest).toEqual({ T1: "images/shared.png", T2: "images/shared.png" });
    // one file, two screens
    expect(readFileSync(join(dir, "images", "shared.png")).equals(png)).toBe(true);
  });

  it("unassigns a screen with a null path", async () => {
    const dir = join(tmp, "unassign");
    await postImage(dir, "T1", "a.png", png);
    const { json } = await postManifest(dir, "T1", null);
    expect("T1" in json.manifest).toBe(false);
    // the file survives — unassigning is not deleting
    expect(readFileSync(join(dir, "images", "a.png")).length).toBeGreaterThan(0);
  });

  it("404s a path naming a file that is not there", async () => {
    const dir = join(tmp, "ghost");
    await postImage(dir, "T1", "a.png", png);
    const { status, json } = await postManifest(dir, "T2", "images/missing.png");
    expect(status).toBe(404);
    expect(json.error).toMatch(/no image at/);
  });

  it("400s a path outside images/", async () => {
    const dir = join(tmp, "escape");
    const { status } = await postManifest(dir, "T2", "secrets.png");
    expect(status).toBe(400);
  });
});

describe("POST /edit", () => {
  it("400s a patch without old_text and writes nothing", async () => {
    const { status, json } = await postEdit({
      dir: join(tmp, "reject"),
      target: "CL-1",
      new_text: "rewritten",
    });
    expect(status).toBe(400);
    expect(json.error).toMatch(/old_text/);
    expect(() => readFileSync(join(tmp, "reject", "out", "edits.json"))).toThrow();
  });

  it("appends a valid patch (old_text may be the empty string)", async () => {
    const dir = join(tmp, "accept");
    const { status, json } = await postEdit({
      dir,
      target: "CH-1-b.surface_action",
      old_text: "",
      new_text: "leave the bread",
    });
    expect(status).toBe(200);
    expect(json.edits).toHaveLength(1);
    const onDisk = JSON.parse(readFileSync(join(dir, "out", "edits.json"), "utf-8"));
    expect(onDisk[0]).toMatchObject({
      target: "CH-1-b.surface_action",
      old_text: "",
      new_text: "leave the bread",
    });
    expect(typeof onDisk[0].timestamp).toBe("string");
  });
});

// L7 — the note channel. A note is NOT a verdict, which is why it validates
// separately and lands in its own file.
describe("validateNoteBody", () => {
  const ok = { dir: "run", target: "CH-T2-04", kind: "structure", body: "more branches" };

  it("accepts a well-formed note", () => {
    expect(validateNoteBody(ok)).toBeNull();
  });

  it("requires a dir, a target and a body", () => {
    expect(validateNoteBody({ ...ok, dir: "" })).toMatch(/dir/);
    expect(validateNoteBody({ ...ok, target: "" })).toMatch(/target/);
    expect(validateNoteBody({ ...ok, body: "" })).toMatch(/body/);
  });

  it("rejects a whitespace-only body — an empty note is not a note", () => {
    expect(validateNoteBody({ ...ok, body: "   " })).toMatch(/body/);
  });

  it("allows only the three kinds", () => {
    for (const kind of ["structure", "question", "todo"]) {
      expect(validateNoteBody({ ...ok, kind })).toBeNull();
    }
    expect(validateNoteBody({ ...ok, kind: "approved" })).toMatch(/kind must be one of/);
  });

  it("rejects a non-object body", () => {
    expect(validateNoteBody(null)).toMatch(/JSON object/);
    expect(validateNoteBody("note")).toMatch(/JSON object/);
  });

  it("accepts resolved only as a boolean", () => {
    expect(validateNoteBody({ ...ok, resolved: true })).toBeNull();
    expect(validateNoteBody({ ...ok, resolved: "yes" })).toMatch(/resolved/);
  });

  // D4: a general note — not addressed to any node — must be storable.
  it("accepts an absent or null target as a general note", () => {
    const { target: _omit, ...withoutTarget } = ok;
    void _omit;
    expect(validateNoteBody(withoutTarget)).toBeNull();
    expect(validateNoteBody({ ...ok, target: null })).toBeNull();
  });

  it("still rejects a PRESENT but empty target — that stays a mistake, not 'no target'", () => {
    expect(validateNoteBody({ ...ok, target: "" })).toMatch(/target/);
  });
});

describe("validateNoteResolveBody", () => {
  const ok = { dir: "run", target: "CH-T2-04", timestamp: "2026-01-01T00:00:00.000Z", resolved: true };

  it("accepts a well-formed resolve, targeted or general", () => {
    expect(validateNoteResolveBody(ok)).toBeNull();
    expect(validateNoteResolveBody({ ...ok, target: null })).toBeNull();
  });

  it("requires dir, timestamp and a boolean resolved", () => {
    expect(validateNoteResolveBody({ ...ok, dir: "" })).toMatch(/dir/);
    expect(validateNoteResolveBody({ ...ok, timestamp: "" })).toMatch(/timestamp/);
    expect(validateNoteResolveBody({ ...ok, resolved: "yes" })).toMatch(/resolved/);
    expect(validateNoteResolveBody({ ...ok, resolved: undefined })).toMatch(/resolved/);
  });

  it("still rejects a present but empty target", () => {
    expect(validateNoteResolveBody({ ...ok, target: "" })).toMatch(/target/);
  });
});

describe("POST /note and /note-resolve", () => {
  it("stores a general note with a null target", async () => {
    const dir = join(tmp, "note-general");
    const { status, json } = await postNote({
      dir,
      kind: "todo",
      body: "check the whole week for pacing",
    });
    expect(status).toBe(200);
    expect(json.notes).toHaveLength(1);
    expect(json.notes[0].target).toBeNull();
    expect(json.notes[0].resolved).toBe(false);
    const onDisk = JSON.parse(readFileSync(join(dir, "out", "notes.json"), "utf-8"));
    expect(onDisk[0].target).toBeNull();
  });

  it("stores a note targeted at any id — a line, a choice, an option, a gather", async () => {
    const dir = join(tmp, "note-any-target");
    const { json } = await postNote({ dir, target: "L-CH-T2-01-a-r1", kind: "question", body: "who says this?" });
    expect(json.notes[0].target).toBe("L-CH-T2-01-a-r1");
  });

  it("flips resolved on the matching (target, timestamp) note and leaves others alone", async () => {
    const dir = join(tmp, "note-resolve");
    const first = await postNote({ dir, target: "T1", kind: "structure", body: "needs a branch" });
    const second = await postNote({ dir, kind: "todo", body: "general follow-up" });
    const firstTimestamp = first.json.notes[0].timestamp;
    const secondTimestamp = second.json.notes[1].timestamp;

    const resolved = await postNoteResolve({ dir, target: "T1", timestamp: firstTimestamp, resolved: true });
    expect(resolved.status).toBe(200);
    expect(resolved.json.notes.find((n: { target: string | null }) => n.target === "T1").resolved).toBe(true);
    // the general note is untouched
    expect(
      resolved.json.notes.find((n: { timestamp: string }) => n.timestamp === secondTimestamp).resolved
    ).toBe(false);

    const onDisk = JSON.parse(readFileSync(join(dir, "out", "notes.json"), "utf-8"));
    expect(onDisk.find((n: { target: string | null }) => n.target === "T1").resolved).toBe(true);
  });

  it("404s a resolve for a note that does not exist", async () => {
    const dir = join(tmp, "note-resolve-missing");
    const { status, json } = await postNoteResolve({
      dir,
      target: "GHOST",
      timestamp: "2026-01-01T00:00:00.000Z",
      resolved: true,
    });
    expect(status).toBe(404);
    expect(json.error).toMatch(/no note/);
  });
});

describe("validateNoteUpdateBody", () => {
  const ok = {
    dir: "run",
    target: "CH-T2-04",
    timestamp: "2026-01-01T00:00:00.000Z",
    body: "@place x=0.4 y=0.5 w=0.1 h=0.1",
  };

  it("accepts a well-formed update, targeted or general", () => {
    expect(validateNoteUpdateBody(ok)).toBeNull();
    expect(validateNoteUpdateBody({ ...ok, target: null })).toBeNull();
  });

  it("requires dir and timestamp", () => {
    expect(validateNoteUpdateBody({ ...ok, dir: "" })).toMatch(/dir/);
    expect(validateNoteUpdateBody({ ...ok, timestamp: "" })).toMatch(/timestamp/);
  });

  it("requires a non-empty body", () => {
    const { body: _omit, ...withoutBody } = ok;
    void _omit;
    expect(validateNoteUpdateBody(withoutBody)).toMatch(/body/);
    expect(validateNoteUpdateBody({ ...ok, body: "" })).toMatch(/body/);
    expect(validateNoteUpdateBody({ ...ok, body: "   " })).toMatch(/body/);
  });

  it("still rejects a present but empty target", () => {
    expect(validateNoteUpdateBody({ ...ok, target: "" })).toMatch(/target/);
  });
});

describe("POST /note-update", () => {
  it("rewrites the matching note's body and leaves every other note untouched", async () => {
    const dir = join(tmp, "note-update");
    const first = await postNote({ dir, target: "T1", kind: "structure", body: "@place x=0.4 y=0.5 w=0.1 h=0.1" });
    const second = await postNote({ dir, kind: "todo", body: "general follow-up" });
    const firstTimestamp = first.json.notes[0].timestamp;
    const secondTimestamp = second.json.notes[1].timestamp;

    const updated = await postNoteUpdate({
      dir,
      target: "T1",
      timestamp: firstTimestamp,
      body: "@place x=0.5 y=0.6 w=0.1 h=0.1",
    });
    expect(updated.status).toBe(200);
    const updatedNote = updated.json.notes.find((n: { target: string | null }) => n.target === "T1");
    expect(updatedNote.body).toBe("@place x=0.5 y=0.6 w=0.1 h=0.1");
    // the general note is untouched
    expect(
      updated.json.notes.find((n: { timestamp: string }) => n.timestamp === secondTimestamp).body
    ).toBe("general follow-up");

    const onDisk = JSON.parse(readFileSync(join(dir, "out", "notes.json"), "utf-8"));
    expect(onDisk.find((n: { target: string | null }) => n.target === "T1").body).toBe(
      "@place x=0.5 y=0.6 w=0.1 h=0.1"
    );
  });

  it("updates a note whose target is null", async () => {
    const dir = join(tmp, "note-update-general");
    const created = await postNote({ dir, kind: "todo", body: "@place x=0.1 y=0.1 w=0.1 h=0.1" });
    const timestamp = created.json.notes[0].timestamp;

    const updated = await postNoteUpdate({ dir, target: null, timestamp, body: "@place x=0.2 y=0.2 w=0.1 h=0.1" });
    expect(updated.status).toBe(200);
    expect(updated.json.notes[0].body).toBe("@place x=0.2 y=0.2 w=0.1 h=0.1");
  });

  it("preserves resolved and timestamp — only body changes", async () => {
    const dir = join(tmp, "note-update-preserves");
    const created = await postNote({ dir, target: "T2", kind: "structure", body: "@place x=0.1 y=0.1 w=0.1 h=0.1" });
    const timestamp = created.json.notes[0].timestamp;
    const resolvedBefore = created.json.notes[0].resolved;

    const updated = await postNoteUpdate({ dir, target: "T2", timestamp, body: "@place x=0.9 y=0.9 w=0.1 h=0.1" });
    const note = updated.json.notes.find((n: { target: string | null }) => n.target === "T2");
    expect(note.resolved).toBe(resolvedBefore);
    expect(note.timestamp).toBe(timestamp);
  });

  it("404s an update for a note that does not exist", async () => {
    const dir = join(tmp, "note-update-missing");
    const { status, json } = await postNoteUpdate({
      dir,
      target: "GHOST",
      timestamp: "2026-01-01T00:00:00.000Z",
      body: "@place x=0.5 y=0.5 w=0.1 h=0.1",
    });
    expect(status).toBe(404);
    expect(json.error).toMatch(/no note/);
  });
});

// L9 — the regions map replaces the append-only region-edit journal.
// `rect: null` is LEGAL — it means "delete this key", how undo restores a
// region that had no shape.
describe("validateRegionsBody", () => {
  const ok = {
    dir: "run",
    entries: [
      { screen_id: "T1", region_id: "r_board", rect: { x: 0.42, y: 0.31, w: 0.16, h: 0.22 } },
    ],
  };

  it("accepts a well-formed entries array", () => {
    expect(validateRegionsBody(ok)).toBeNull();
  });

  it("accepts rect: null (a delete)", () => {
    expect(
      validateRegionsBody({ dir: "run", entries: [{ screen_id: "T1", region_id: "r_board", rect: null }] })
    ).toBeNull();
  });

  it("accepts multiple entries in one request", () => {
    expect(
      validateRegionsBody({
        dir: "run",
        entries: [
          { screen_id: "T1", region_id: "r_board", rect: { x: 0, y: 0, w: 0.1, h: 0.1 } },
          { screen_id: "T1", region_id: "r_crates", rect: null },
        ],
      })
    ).toBeNull();
  });

  it("requires dir and an entries array", () => {
    expect(validateRegionsBody({ entries: [] })).toMatch(/dir/);
    expect(validateRegionsBody({ dir: "run" })).toMatch(/entries/);
    expect(validateRegionsBody({ dir: "run", entries: "nope" })).toMatch(/entries/);
  });

  it("requires screen_id and region_id on every entry", () => {
    expect(
      validateRegionsBody({ dir: "run", entries: [{ screen_id: "", region_id: "r_board", rect: null }] })
    ).toMatch(/screen_id/);
    expect(
      validateRegionsBody({ dir: "run", entries: [{ screen_id: "T1", region_id: "", rect: null }] })
    ).toMatch(/region_id/);
  });

  it("rejects a rect outside the normalized image", () => {
    expect(
      validateRegionsBody({
        dir: "run",
        entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: -0.1, y: 0, w: 0.2, h: 0.2 } }],
      })
    ).toMatch(/positive and inside/);
    expect(
      validateRegionsBody({
        dir: "run",
        entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0.9, y: 0, w: 0.2, h: 0.2 } }],
      })
    ).toMatch(/within the normalized/);
  });

  it("rejects a zero-area rect", () => {
    expect(
      validateRegionsBody({
        dir: "run",
        entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0, y: 0, w: 0, h: 0.2 } }],
      })
    ).toMatch(/positive/);
  });

  it("rejects a malformed (non-numeric) rect", () => {
    expect(
      validateRegionsBody({
        dir: "run",
        entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: "a", y: 0, w: 0.2, h: 0.2 } }],
      })
    ).toMatch(/numeric/);
  });
});

async function postRegions(body: unknown) {
  const handler = bridgeHandler();
  const res = fakeRes();
  await handler(fakeReq("POST", "/regions", body), res);
  await res.done;
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

describe("POST /__bridge/regions", () => {
  it("writes a new regions.json with the merged entry", async () => {
    const dir = join(tmp, "regions-new");
    const { status, json } = await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }],
    });
    expect(status).toBe(200);
    expect(json.regions.screens.T1.r_board).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
    const onDisk = JSON.parse(readFileSync(join(dir, "regions.json"), "utf-8"));
    expect(onDisk.screens.T1.r_board).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
  });

  it("last write wins on the same (screen_id, region_id)", async () => {
    const dir = join(tmp, "regions-overwrite");
    await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    });
    const { json } = await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0.5, y: 0.5, w: 0.2, h: 0.2 } }],
    });
    expect(json.regions.screens.T1.r_board).toEqual({ x: 0.5, y: 0.5, w: 0.2, h: 0.2 });
  });

  it("rect: null deletes the key and prunes an emptied screen entry", async () => {
    const dir = join(tmp, "regions-delete");
    await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
    });
    const { json } = await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: null }],
    });
    expect(json.regions.screens.T1).toBeUndefined();
  });

  it("rejects a malformed body", async () => {
    const { status, json } = await postRegions({ dir: "run" });
    expect(status).toBe(400);
    expect(json.error).toMatch(/entries/);
  });

  // D3: a hand-edited or truncated regions.json can be `{}` — valid JSON, no
  // `screens` key. `readJson(...) ?? { screens: {} }` only guards a MISSING
  // file; `{}` is truthy, so `regions.screens[screen_id]` used to throw a
  // TypeError (500) for every entry.
  it("merges into a { } regions.json (no screens key) instead of throwing", async () => {
    const dir = join(tmp, "regions-empty-object");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "regions.json"), "{}");
    const { status, json } = await postRegions({
      dir,
      entries: [{ screen_id: "T1", region_id: "r_board", rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }],
    });
    expect(status).toBe(200);
    expect(json.regions.screens.T1.r_board).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
  });
});

/**
 * D8 — the generated content index rides on /run. Lantern reads ONLY this
 * file (never the content directory), and an older run folder without one
 * must still load: `null` is the "no index here" answer, not an error.
 */
describe("GET /run — contentIndex", () => {
  async function getRun(dir: string) {
    const handler = bridgeHandler();
    const res = fakeRes();
    await handler(fakeReq("GET", `/run?dir=${encodeURIComponent(dir)}`), res);
    await res.done;
    return { status: res.statusCode, json: JSON.parse(res.body) };
  }

  const runDir = mkdtempSync(join(tmpdir(), "lantern-run-"));
  afterAll(() => rmSync(runDir, { recursive: true, force: true }));
  writeFileSync(
    join(runDir, "graph.json"),
    JSON.stringify({ scenes: [], screens: [], variables: [] })
  );

  it("returns null when the run folder has no content-index.json", async () => {
    const { status, json } = await getRun(runDir);
    expect(status).toBe(200);
    expect(json.contentIndex).toBeNull();
  });

  it("returns the index when the file exists", async () => {
    writeFileSync(
      join(runDir, "content-index.json"),
      JSON.stringify({
        generated: "2026-08-05",
        entries: [
          {
            id: "item_ash",
            kind: "item",
            label: "ash",
            category: "component",
            source_locations: ["Square"],
          },
        ],
      })
    );
    const { status, json } = await getRun(runDir);
    expect(status).toBe(200);
    expect(json.contentIndex.entries).toHaveLength(1);
    expect(json.contentIndex.entries[0].id).toBe("item_ash");
  });
});

/**
 * L9 — regions.json rides on /run the same way manifest.json does: a
 * top-level run-dir input, `{ screens: {} }` when the file is absent so an
 * older run folder (or one that has never had geometry drawn) still loads.
 */
describe("GET /run — regions", () => {
  async function getRun(dir: string) {
    const handler = bridgeHandler();
    const res = fakeRes();
    await handler(fakeReq("GET", `/run?dir=${encodeURIComponent(dir)}`), res);
    await res.done;
    return { status: res.statusCode, json: JSON.parse(res.body) };
  }

  it("defaults to { screens: {} } when regions.json is absent", async () => {
    const dir = join(tmp, "run-regions-absent");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "graph.json"), JSON.stringify({ scenes: [], screens: [], variables: [] }));
    const { status, json } = await getRun(dir);
    expect(status).toBe(200);
    expect(json.regions).toEqual({ screens: {} });
  });

  it("returns regions.json when present", async () => {
    const dir = join(tmp, "run-regions-present");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "graph.json"), JSON.stringify({ scenes: [], screens: [], variables: [] }));
    writeFileSync(
      join(dir, "regions.json"),
      JSON.stringify({ screens: { T1: { r_board: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } } } })
    );
    const { json } = await getRun(dir);
    expect(json.regions.screens.T1.r_board).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
  });

  // D3: same `{}` shape as the POST /regions test above — GET /run must not
  // hand out a `regions` object with no `screens` key either.
  it("normalizes a { } regions.json (no screens key) to { screens: {} }", async () => {
    const dir = join(tmp, "run-regions-empty-object");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "graph.json"), JSON.stringify({ scenes: [], screens: [], variables: [] }));
    writeFileSync(join(dir, "regions.json"), "{}");
    const { status, json } = await getRun(dir);
    expect(status).toBe(200);
    expect(json.regions).toEqual({ screens: {} });
  });
});

/**
 * L9 — loadRun's whole reason for overlaying: a graph.json that predates the
 * last Apply must still show the last-drawn geometry once regions.json has it.
 */
describe("loadRun — regions overlay reaches the graph", () => {
  it("patches graph.screens[].regions[].shape from the /run regions payload", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          dir: "run",
          graph: {
            scenes: [],
            variables: [],
            screens: [
              {
                screen_id: "T1",
                location: "town",
                name: "T1",
                status: "start",
                gates: [],
                connects_to: [],
                ink_address: "T1",
                regions: [{ region_id: "r_board", shape: null }],
              },
            ],
          },
          day: null,
          days: [],
          week: null,
          story: null,
          manifest: null,
          approvals: {},
          edits: [],
          notes: [],
          personas: {},
          contentIndex: null,
          regions: { screens: { T1: { r_board: { x: 0.3, y: 0.3, w: 0.1, h: 0.1 } } } },
        }),
        { status: 200 }
      )) as unknown as typeof fetch;
    try {
      const payload = await loadRun("run");
      const region = payload.graph.screens[0].regions!.find((r) => r.region_id === "r_board");
      expect(region!.shape).toEqual({ rect: { x: 0.3, y: 0.3, w: 0.1, h: 0.1 } });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // D3: a hand-edited or truncated regions.json can flow all the way through
  // as `regions: {}` (present, truthy, no `screens` key) in the /run payload.
  // `payload.regions ?? { screens: {} }` only guards a MISSING `regions`
  // field, so without loadRun's own `?? {}` on `.screens`, overlayRegions's
  // `map.screens[screen_id]` throws and the whole run fails to load.
  it("does not throw when the /run payload's regions has no screens key", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          dir: "run",
          graph: {
            scenes: [],
            variables: [],
            screens: [
              {
                screen_id: "T1",
                location: "town",
                name: "T1",
                status: "start",
                gates: [],
                connects_to: [],
                ink_address: "T1",
                regions: [{ region_id: "r_board", shape: null }],
              },
            ],
          },
          day: null,
          days: [],
          week: null,
          story: null,
          manifest: null,
          approvals: {},
          edits: [],
          notes: [],
          personas: {},
          contentIndex: null,
          regions: {},
        }),
        { status: 200 }
      )) as unknown as typeof fetch;
    try {
      const payload = await loadRun("run");
      expect(payload.regions).toEqual({ screens: {} });
      const region = payload.graph.screens[0].regions!.find((r) => r.region_id === "r_board");
      expect(region!.shape).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
