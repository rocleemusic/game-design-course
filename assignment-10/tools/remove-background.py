# Background removal for portrait/item art on a plain backdrop (Blender Python)
#
# Cuts a plain backdrop out of art with one subject roughly centered on a
# plain-ish background (flat color, soft vignette, or lightly textured
# parchment/paper — the cast portraits and the item/key-item icons all use
# this style) and writes transparent PNGs to a no-bg/ subfolder next to the
# source images.
#
# METHOD: edge-stopped flood fill from the image border, not color matching.
# Walk inward from the border; a step crosses into a neighboring pixel only
# if that pixel is close in color to the one before it (`thresh`). Real
# artwork has a harder edge than that, so the flood stops there. This is
# why it works on gradient/vignette/textured backgrounds that broke an
# earlier corner-color-match version of this script — that version sampled
# one background color from the corners and measured distance to it, which
# falls apart the moment the backdrop isn't flat (a soft vignette reads as
# "far from the corner color" near the object and gets kept as opaque).
#
# `thresh` has to be tuned per image — how hard the object's edge reads
# against its background isn't something one number covers for every style
# in this folder. Iterate with PREVIEW below; don't guess-and-ship.
#
# THRESH TUNING — what each failure mode looks like:
#   - Leftover opaque patches/blotches in the background (paper grain,
#     drop shadow) -> thresh too LOW. Raise it a bit.
#   - Bites taken out of the object, especially thin/faint/pale detail
#     (wisps, hairline sprigs, soft brushwork) -> thresh too HIGH, the
#     flood is walking through real paint. Lower it.
#   - Whole object (or most of it) vanishes -> thresh way too HIGH.
#   Different files in the same folder can need different values — a bold
#   ink-outlined object tolerates a higher thresh than a soft watercolor
#   one. Typical range seen so far: 0.02-0.04.
#
# CLEANUP PASS: after the flood, small disconnected leftover blobs are
# dropped automatically (MIN_AREA_FRAC of the kept foreground) — this
# mops up paper-grain islands the flood couldn't bridge without also
# needing a thresh so high it eats the object. It will NOT fix bites
# taken out of the main shape — that's a thresh-too-high problem, not a
# cleanup problem.
#
# VERIFICATION — do this every time, not just once:
#   PNG preview tools (including Claude's Read tool) commonly render the
#   raw RGB channel and ignore alpha, so a fully-broken cutout can look
#   perfect in a plain preview. This script writes a second PNG per file
#   into <out_dir>/_preview/ that composites the cutout over a checkerboard
#   — that's the only way to actually see what's transparent. Look at the
#   preview, not the cutout, before calling a file done. Delete the
#   _preview/ folder when you're satisfied; it's scratch, not a deliverable.
#
# GOTCHA (already handled below, noted so it doesn't regress): if you reuse
# the image datablock loaded from the source file and call img.save(), the
# alpha channel silently does NOT persist to disk — img.save() drops it even
# though the in-memory pixel edit is correct and img.is_dirty is True. Fix:
# write the edited RGBA buffer into a *new* image created with
# bpy.data.images.new(..., alpha=True) and save that instead of the reused
# source image. Verify by reloading the output and checking alpha actually
# varies (min==0, max==1), not just that the file looks right when previewed
# (see the raw-RGB gotcha above — a plain reload-and-look isn't enough
# either; use the checker preview).
#
# HOW TO RUN
#   Option A — blender-mcp: open Blender with the addon connected, then have
#   Claude call mcp__blender__execute_blender_code with this file's contents
#   (edit SRC_DIR / FILES / THRESH below first).
#   Option B — inside Blender: Scripting tab, open this file, edit SRC_DIR /
#   FILES / THRESH, click Run.
#
# Outputs to <SRC_DIR>/no-bg/<name>.png, previews to <SRC_DIR>/no-bg/_preview/

import bpy
import numpy as np
import os

SRC_DIR = r"C:\Users\rocle\Desktop\8-20-26"   # <-- edit per use
OUT_DIR = os.path.join(SRC_DIR, "no-bg")
PREVIEW_DIR = os.path.join(OUT_DIR, "_preview")

# filename -> flood threshold. Start around 0.03 and adjust per the
# tuning notes above; different sources in the same batch often need
# different values.
FILES = {
    # "bex-bust.jpg": 0.03, ...   # <-- edit per use
}

MIN_AREA_FRAC = 0.005   # cleanup pass: drop foreground fragments smaller
                        # than this fraction of the kept foreground


def _load_rgb(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    flat = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(flat)
    rgb = flat.reshape(h, w, 4)[:, :, :3].copy()
    bpy.data.images.remove(img)
    return rgb, w, h


def _flood_bg_mask(rgb, thresh, border=2, max_iter=3000):
    """4-connected flood fill from the border. True = background."""
    h, w, _ = rgb.shape
    dh = np.sqrt(((rgb[:, :-1] - rgb[:, 1:]) ** 2).sum(-1))
    dv = np.sqrt(((rgb[:-1, :] - rgb[1:, :]) ** 2).sum(-1))
    horiz_c, vert_c = dh < thresh, dv < thresh

    mask = np.zeros((h, w), dtype=bool)
    mask[:border, :] = True
    mask[-border:, :] = True
    mask[:, :border] = True
    mask[:, -border:] = True

    for _ in range(max_iter):
        nm = mask.copy()
        nm[:, 1:] |= mask[:, :-1] & horiz_c
        nm[:, :-1] |= mask[:, 1:] & horiz_c
        nm[1:, :] |= mask[:-1, :] & vert_c
        nm[:-1, :] |= mask[1:, :] & vert_c
        if np.array_equal(nm, mask):
            return nm
        mask = nm
    return mask


def _grow_component(seed, region, max_iter=4000):
    """8-connected grow of `seed` within `region`, used by the cleanup pass."""
    comp = seed
    for _ in range(max_iter):
        nc = comp.copy()
        nc[:, 1:] |= comp[:, :-1] & region[:, 1:]
        nc[:, :-1] |= comp[:, 1:] & region[:, :-1]
        nc[1:, :] |= comp[:-1, :] & region[1:, :]
        nc[:-1, :] |= comp[1:, :] & region[:-1, :]
        nc[1:, 1:] |= comp[:-1, :-1] & region[1:, 1:]
        nc[:-1, :-1] |= comp[1:, 1:] & region[:-1, :-1]
        nc[1:, :-1] |= comp[:-1, 1:] & region[1:, :-1]
        nc[:-1, 1:] |= comp[1:, :-1] & region[:-1, 1:]
        if np.array_equal(nc, comp):
            return nc
        comp = nc
    return comp


def _drop_small_fragments(fg_mask, min_area_frac, min_area_abs=80, guard_max=50000):
    """Keep only fg components at or above min_area_frac of the total kept
    foreground; drops paper-grain islands the flood left behind. guard_max
    has to be generous — busy paper texture can produce thousands of
    single-pixel components before the real object is even reached."""
    total = fg_mask.sum()
    if total == 0:
        return fg_mask
    min_area = max(min_area_abs, total * min_area_frac)
    remaining = fg_mask.copy()
    keep = np.zeros_like(fg_mask)
    guard = 0
    while remaining.any() and guard < guard_max:
        guard += 1
        ys, xs = np.where(remaining)
        seed = np.zeros_like(fg_mask)
        seed[ys[0], xs[0]] = True
        comp = _grow_component(seed, fg_mask)
        if comp.sum() >= min_area:
            keep |= comp
        remaining &= ~comp
    return keep


def _soft_alpha(bg_mask):
    """3x3 box blur of the binary foreground mask — cheap anti-aliasing."""
    fg = (~bg_mask).astype(np.float32)
    pad = np.pad(fg, 1, mode='edge')
    sm = (pad[:-2, :-2] + pad[:-2, 1:-1] + pad[:-2, 2:] +
          pad[1:-1, :-2] + pad[1:-1, 1:-1] + pad[1:-1, 2:] +
          pad[2:, :-2] + pad[2:, 1:-1] + pad[2:, 2:]) / 9.0
    return np.clip(sm, 0.0, 1.0)


def _save_rgba(rgb, alpha, out_path, name):
    h, w, _ = rgb.shape
    out_px = np.empty((h, w, 4), dtype=np.float32)
    out_px[:, :, :3] = rgb
    out_px[:, :, 3] = alpha
    # must be a NEW alpha=True image, not a reused source datablock — see
    # the alpha-save GOTCHA at the top of this file
    img = bpy.data.images.new(name, width=w, height=h, alpha=True)
    img.pixels.foreach_set(out_px.ravel())
    img.file_format = 'PNG'
    img.filepath_raw = out_path
    img.save()
    bpy.data.images.remove(img)


def _save_checker_preview(rgb, alpha, out_path):
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    sq = ((xx // 15) + (yy // 15)) % 2
    checker = np.where(sq[:, :, None] == 0, 1.0, 0.0) * np.ones((h, w, 3))
    comp = rgb * alpha[:, :, None] + checker * (1 - alpha[:, :, None])
    img = bpy.data.images.new("preview", width=w, height=h, alpha=False)
    out_px = np.empty((h, w, 4), dtype=np.float32)
    out_px[:, :, :3] = comp
    out_px[:, :, 3] = 1.0
    img.pixels.foreach_set(out_px.ravel())
    img.file_format = 'PNG'
    img.filepath_raw = out_path
    img.save()
    bpy.data.images.remove(img)


def remove_background(fname, thresh, src_dir=SRC_DIR, out_dir=OUT_DIR, preview_dir=PREVIEW_DIR):
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(preview_dir, exist_ok=True)

    rgb, w, h = _load_rgb(os.path.join(src_dir, fname))
    bg_mask = _flood_bg_mask(rgb, thresh)
    fg_clean = _drop_small_fragments(~bg_mask, MIN_AREA_FRAC)
    alpha = _soft_alpha(~fg_clean)

    out_name = os.path.splitext(fname)[0] + ".png"
    out_path = os.path.join(out_dir, out_name)
    _save_rgba(rgb, alpha, out_path, f"cutout_{fname}")
    _save_checker_preview(rgb, alpha, os.path.join(preview_dir, out_name))
    return out_path


if __name__ == "__main__":
    for fname, thresh in FILES.items():
        result = remove_background(fname, thresh)
        print("OK:", result, "-- check the matching file in no-bg/_preview/ before trusting it")
