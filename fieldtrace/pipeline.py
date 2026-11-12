"""Upload → image → first pass (vision model if configured, else local OpenCV) → workspace shape."""
import asyncio, base64, io, logging, time
import numpy as np
from PIL import Image, ImageOps
from . import cv as ftcv, vision

log = logging.getLogger("fieldtrace")
Image.MAX_IMAGE_PIXELS = 60_000_000
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC = True
except Exception:  # optional dependency
    HEIC = False

OK_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "MPO"}
MAT_CODES = {"CS", "SS", "CU", "GALV", "COMP", "UNK"}


class BadImage(Exception):
    pass


def load_image(data: bytes) -> Image.Image:
    try:
        im = Image.open(io.BytesIO(data))
        fmt = (im.format or "").upper()
        if fmt not in OK_FORMATS:
            raise BadImage("Use a JPEG, PNG, WebP" + (" or HEIC" if HEIC else "") + " photo.")
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
    except BadImage:
        raise
    except Exception:
        raise BadImage("That file isn't a readable photo. Use a JPEG, PNG, WebP" + (" or HEIC" if HEIC else "") + ".")
    if min(im.size) < 200:
        raise BadImage("That photo is too small to trace (under 200 px).")
    return im


def _preview(im):
    p = im.copy()
    p.thumbnail((1600, 1600), Image.LANCZOS)
    buf = io.BytesIO(); p.save(buf, "JPEG", quality=84, optimize=True)
    return p, buf.getvalue()


def _clamp(v):
    try:
        return max(0.0, min(1000.0, float(v)))
    except Exception:
        return 0.0


def _conf(v, cap=0.9):
    try:
        return round(max(0.05, min(cap, float(v))), 2)
    except Exception:
        return 0.4


def _from_vision(js):
    runs, items, issues = [], [], []
    for i, r in enumerate((js.get("runs") or [])[:10]):
        pts = [[_clamp(p[0]), _clamp(p[1])] for p in (r.get("pts") or []) if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(pts) < 2:
            continue
        code = str(r.get("material", "UNK")).upper()
        code = code if code in MAT_CODES else "UNK"
        concealed = bool(r.get("concealed"))
        mconf = _conf(r.get("material_confidence", 0.4), 0.6 if concealed else 0.85)
        size = str(r.get("nominal_size") or "?").strip() or "?"
        basis = str(r.get("size_basis") or "").strip()
        if not basis or basis.lower() in ("none", "n/a"):
            size = "?"
        mid = pts[len(pts) // 2]
        runs.append({"id": f"R{len(runs) + 1}", "sys": "UNK", "sysText": str(r.get("system") or "")[:24], "size": size, "sizeBasis": basis,
                     "odClass": str(r.get("od_class") or "unknown"), "material": code, "matSub": str(r.get("material_subtype") or "")[:60],
                     "matConf": mconf, "matCues": [str(c)[:120] for c in (r.get("material_cues") or [])][:5], "concealed": concealed,
                     "sched": str(r.get("schedule_suggested") or "")[:30], "schedBasis": str(r.get("schedule_basis") or "")[:120],
                     "mat": str(r.get("material_subtype") or code), "conf": _conf(r.get("confidence", 0.5), 0.88), "pts": pts,
                     "lbl": [min(940, mid[0] + 40), max(20, mid[1] - 50)], "note": str(r.get("note") or "")[:240]})
    for k, v in enumerate((js.get("valves") or [])[:12]):
        at = v.get("at") or [500, 500]
        fam = str(v.get("family") or "unknown")
        items.append({"id": f"V{k + 1}", "layer": "valves", "kind": "valve", "type": "Valve — " + (fam if fam != "unknown" else "family not determinable"),
                      "operator": str(v.get("operator") or "unknown"), "stem": str(v.get("stem_motion") or "unknown"), "family": fam,
                      "tag": "", "size": "", "sys": "", "at": [_clamp(at[0]), _clamp(at[1])], "lbl": [_clamp(at[0]) + 50, _clamp(at[1]) - 60],
                      "conf": _conf(v.get("confidence", 0.5), 0.85), "desc": str(v.get("note") or "Body style is inside the pipe — not determined from the photo.")[:200]})
    for k, v in enumerate((js.get("instruments") or [])[:12]):
        at = v.get("at") or [500, 500]
        items.append({"id": f"I{k + 1}", "layer": "valves", "kind": "instrument", "inst": str(v.get("kind") or "other"), "type": str(v.get("kind") or "Instrument").capitalize(),
                      "tag": str(v.get("tag") or "")[:16], "size": "", "sys": "", "at": [_clamp(at[0]), _clamp(at[1])], "lbl": [_clamp(at[0]) + 50, _clamp(at[1]) + 40],
                      "conf": _conf(v.get("confidence", 0.5), 0.85), "desc": str(v.get("note") or "Device type from appearance; model and range not read.")[:200]})
    for k, f in enumerate((js.get("fittings") or [])[:20]):
        at = f.get("at") or [500, 500]
        items.append({"id": f"F{k + 1}", "layer": "fittings", "type": str(f.get("type") or "fitting").capitalize(), "tag": "", "size": "", "sys": "",
                      "at": [_clamp(at[0]), _clamp(at[1])], "lbl": [0, 0], "conf": _conf(f.get("confidence", 0.5), 0.85), "desc": "Fitting from photo", "noCallout": True})
    for k, x in enumerate((js.get("issues") or [])[:6]):
        b = x.get("box") or [400, 400, 600, 600]
        b = [_clamp(v) for v in b[:4]]
        issues.append({"id": f"X{k + 1}", "title": str(x.get("title") or "Check")[:60], "sev": x.get("severity") if x.get("severity") in ("High", "Medium", "Low") else "Medium",
                       "conf": 0.6, "poly": [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]], "lbl": [min(900, b[2] + 20), b[1]], "text": str(x.get("text") or "")[:240]})
    return runs, items, issues, [str(t)[:60] for t in (js.get("text_read") or [])][:12], str(js.get("summary") or "")[:240]


async def analyze(im: Image.Image, filename="upload"):
    t0 = time.time()
    prev, jpeg = await asyncio.to_thread(_preview, im)
    w, h = prev.size
    engine = {"kind": "local-cv", "label": "Local first pass (OpenCV geometry + colour)"}
    result = None
    prov = vision.provider()
    if prov:
        try:
            name, model, js = await asyncio.to_thread(vision.call, jpeg)
            runs, items, issues, text, summary = _from_vision(js)
            if runs:
                result = {"runs": runs, "items": items, "issues": issues, "ocrText": text, "summary": summary,
                          "advisories": ["Sizes need a basis (stencil, print line or a known reference). Schedule / wall thickness is never visible — any schedule shown is a suggestion to verify."]}
                engine = {"kind": "vision", "label": f"Vision model ({name}: {model})"}
            else:
                log.warning("vision pass (%s) returned no runs; using local CV", model)
                engine["fallback"] = f"Vision model ({model}) found no pipe runs — local first pass used."
        except Exception as e:  # fall back quietly; never surface keys or provider errors verbatim
            log.warning("vision pass failed (%s: %s); using local CV", type(e).__name__, vision._redact(str(e))[:300])
            engine["fallback"] = "Vision model unavailable — local first pass used."
    if result is None:
        arr = np.asarray(prev)
        cvr = await asyncio.to_thread(ftcv.analyze, arr)
        result = {"runs": cvr["runs"], "items": cvr["items"], "issues": cvr["issues"], "ocrText": [], "advisories": cvr["advisories"] + ["Valves and instruments are not detected in the local pass. Wall thickness / schedule is never visible in a photo."],
                  "summary": f"Local first pass traced {len(cvr['runs'])} candidate run{'s' if len(cvr['runs']) != 1 else ''}. Material is suggested from colour and texture only — verify material and size."}
        result["cvStats"] = cvr["stats"]
    confs = [r["conf"] for r in result["runs"]]
    pconf = round(float(np.mean(confs)), 2) if confs else 0.3
    return {"coords": "norm1000", "w": w, "h": h, "preview": "data:image/jpeg;base64," + base64.b64encode(jpeg).decode(),
            "filename": filename[:80], "engine": engine, "conf": pconf, "ms": int((time.time() - t0) * 1000), **result}
