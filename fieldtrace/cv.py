"""Local first pass (no model download, no API key): OpenCV geometry + colour heuristics.

What it does, honestly:
  1. Edge map (CLAHE + Canny) and probabilistic Hough segments.
  2. Pairs of long, parallel edges at a plausible spacing become pipe candidates. A candidate must
     contrast with what is outside BOTH edges and have a fairly clean interior, which rejects most
     wall corners, highlights and strut channel.
  3. Collinear candidates are merged; ends that meet at an angle become possible elbows; an end
     landing on another run becomes a possible tee.
  4. Each run's interior pixels are summarised (hue, saturation, value, specular, texture) and
     passed to materials.classify(), which returns a SUGGESTED material with capped confidence.
It does not read stencil text, it does not measure size (no scale), and it will miss pipes that
don't show two clean edges (heavy clutter, insulation seams, low light). Everything it returns is
labelled as a first pass to verify.
"""
import math, time
import cv2
import numpy as np
from .materials import classify

WORK = 820  # long side of the working image


def _angle(seg):
    x1, y1, x2, y2 = seg
    return math.atan2(y2 - y1, x2 - x1) % math.pi


def _adiff(a, b):
    d = abs(a - b) % math.pi
    return min(d, math.pi - d)


def _band_poly(p0, p1, half_w):
    d = np.array(p1, float) - np.array(p0, float)
    L = np.linalg.norm(d) or 1.0
    n = np.array([-d[1], d[0]]) / L
    return np.array([p0 + n * half_w, p1 + n * half_w, p1 - n * half_w, p0 - n * half_w], np.int32)


class _Ctx:
    def __init__(self, rgb):
        self.rgb = rgb
        self.h, self.w = rgb.shape[:2]
        self.L = max(self.h, self.w)
        self.hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL)  # H 0-255
        self.lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        self.gray = gray
        self.lap = np.abs(cv2.Laplacian(cv2.GaussianBlur(gray, (3, 3), 0), cv2.CV_32F))

    def mask(self, polys):
        m = np.zeros((self.h, self.w), np.uint8)
        for p in polys:
            cv2.fillConvexPoly(m, p, 1)
        return m.astype(bool)

    def roi(self, poly):
        """(y-slice, x-slice, local bool mask) for one convex polygon — cheap per-candidate sampling."""
        x0, y0 = np.maximum(poly.min(0), 0); x1, y1 = np.minimum(poly.max(0) + 1, [self.w, self.h])
        if x1 <= x0 or y1 <= y0:
            return None
        m = np.zeros((y1 - y0, x1 - x0), np.uint8)
        cv2.fillConvexPoly(m, poly - [x0, y0], 1)
        return (slice(y0, y1), slice(x0, x1), m.astype(bool))

    def take(self, arr, r):
        return arr[r[0], r[1]][r[2]]


def _segments(ctx):
    g = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(ctx.gray)
    g = cv2.bilateralFilter(g, 7, 40, 7)
    med = float(np.median(g))
    lo, hi = max(12, int(0.55 * med)), min(250, int(1.25 * med) + 25)
    edges = cv2.Canny(g, lo, hi, L2gradient=True)
    ctx.gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    ctx.gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    L = ctx.L
    segs = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=max(30, int(L * 0.05)), minLineLength=int(L * 0.06), maxLineGap=int(L * 0.03))
    if segs is None:
        return edges, []
    segs = [tuple(map(float, s)) for s in np.asarray(segs).reshape(-1, 4)]
    segs.sort(key=lambda s: -math.hypot(s[2] - s[0], s[3] - s[1]))
    return edges, segs[:280]


def _pairs(ctx, edges, segs, deadline):
    L = ctx.L
    info = []
    for s in segs:
        p0, p1 = np.array(s[:2]), np.array(s[2:])
        d = p1 - p0; ln = np.linalg.norm(d)
        u = d / ln; n = np.array([-u[1], u[0]])
        info.append((p0, p1, u, n, ln, _angle(s)))
    cands = []
    wmin, wmax = max(5.0, 0.006 * L), 0.16 * L
    for i in range(len(info)):
        if time.time() > deadline:
            break
        p0, p1, u, n, li, ai = info[i]
        for j in range(i + 1, len(info)):
            q0, q1, _, _, lj, aj = info[j]
            if _adiff(ai, aj) > math.radians(3.5):
                continue
            sep0, sep1 = float(np.dot(q0 - p0, n)), float(np.dot(q1 - p0, n))
            if sep0 * sep1 <= 0:
                continue
            sep = (sep0 + sep1) / 2
            if not (wmin <= abs(sep) <= wmax) or abs(sep0 - sep1) > 0.35 * abs(sep) + 3:
                continue
            t0, t1 = sorted((float(np.dot(q0 - p0, u)), float(np.dot(q1 - p0, u))))
            a, b = max(0.0, t0), min(li, t1)
            ov = b - a
            if ov < 0.06 * L or ov < 0.5 * min(li, lj) or ov < 2.2 * abs(sep):
                continue
            c0 = p0 + u * a + n * sep / 2
            c1 = p0 + u * b + n * sep / 2
            cands.append({"c0": c0, "c1": c1, "w": abs(sep), "u": u, "n": n, "ang": ai})
    return cands


def _score(ctx, edges, c):
    hw = c["w"] / 2
    inner = ctx.roi(_band_poly(c["c0"], c["c1"], hw * 0.7))
    if inner is None or inner[2].sum() < 30:
        return None
    off = c["n"] * (hw + max(3.0, c["w"] * 0.3))
    side_w = max(2.0, c["w"] * 0.22)
    left = ctx.roi(_band_poly(c["c0"] + off, c["c1"] + off, side_w))
    right = ctx.roi(_band_poly(c["c0"] - off, c["c1"] - off, side_w))
    if left is None or right is None or left[2].sum() < 10 or right[2].sum() < 10:
        return None
    lab_in = ctx.take(ctx.lab, inner).mean(0)
    dl = float(np.linalg.norm(ctx.take(ctx.lab, left).mean(0) - lab_in))
    dr = float(np.linalg.norm(ctx.take(ctx.lab, right).mean(0) - lab_in))
    contrast = min(dl, dr)
    e_in = ctx.take(edges, inner) > 0
    edge_total = float(e_in.mean())
    # edges running ALONG the candidate inside it mean two pipes / clutter; print text and
    # labels produce edges in all directions and are tolerated
    gx, gy = ctx.take(ctx.gx, inner)[e_in], ctx.take(ctx.gy, inner)[e_in]
    mag = np.hypot(gx, gy) + 1e-6
    along = (np.abs(gx * c["n"][0] + gy * c["n"][1]) / mag) > 0.9
    edge_density = float(along.sum()) / max(1, e_in.size)
    if contrast < 7 or edge_density > 0.09 or edge_total > 0.35:
        return None
    # across-width profile: cylinders shade or catch a highlight; flat faces don't
    prof = []
    for k in range(-3, 4):
        r = ctx.roi(_band_poly(c["c0"] + c["n"] * hw * k / 4.2, c["c1"] + c["n"] * hw * k / 4.2, max(1.0, hw / 9)))
        if r is not None and r[2].any():
            prof.append(float(ctx.take(ctx.gray, r).mean()))
    shade = float(np.std(prof)) / 255 if len(prof) > 3 else 0.0
    length = float(np.linalg.norm(c["c1"] - c["c0"]))
    wpref = 0.75 + 0.25 * min(1.0, c["w"] / (0.03 * ctx.L))
    s = (length / ctx.L) * (0.4 + min(contrast, 40) / 40) * (1 - 4 * edge_density - 0.5 * edge_total) * (1 + min(shade * 4, 0.4)) * wpref
    c.update(score=s, contrast=contrast, edge_density=edge_density, shade=shade, length=length, inner=inner)
    return c


def _material_stats(ctx, roi):
    rois = roi if isinstance(roi, list) else [roi]
    hsv = np.concatenate([ctx.take(ctx.hsv, r) for r in rois]).astype(np.float32)
    if len(hsv) < 20:
        return None
    h = hsv[:, 0] * 360 / 255; s = hsv[:, 1] / 255; v = hsv[:, 2] / 255
    sat = s > 0.25
    # circular median-ish hue over saturated pixels
    hh = h[sat] if sat.sum() > 0.2 * len(h) else h
    ang = np.radians(hh)
    hue = (math.degrees(math.atan2(np.sin(ang).mean(), np.cos(ang).mean())) + 360) % 360
    lap = np.concatenate([ctx.take(ctx.lap, r) for r in rois]); gr = np.concatenate([ctx.take(ctx.gray, r) for r in rois])
    tex = float(lap.mean()) / (float(gr.mean()) + 12) * 4
    return {"h": hue, "s": float(np.median(s)), "v": float(np.median(v)), "v_std": float(v.std()),
            "spec": float(((v > 0.92) & (s < 0.15)).mean()), "sat_frac": float(sat.mean()), "texture": tex}


def _nms(ctx, cands, limit=14):
    """Greedy suppression. If a wider, clean candidate contains an already-kept narrow one
    (edge-to-highlight pairs inside one pipe), the wider one replaces it."""
    cands.sort(key=lambda c: -c["score"])
    keep, bands = [], []
    def band_of(c):
        pts = c.get("pts")
        if pts is None:
            return ctx.mask([_band_poly(c["c0"], c["c1"], c["w"] / 2 + 2)])
        return ctx.mask([_band_poly(a, b, c["w"] / 2 + 2) for a, b in zip(pts[:-1], pts[1:]) if np.linalg.norm(b - a) > 1])
    for c in cands:
        band = band_of(c); area = band.sum()
        if area == 0:
            continue
        hits = [i for i, b in enumerate(bands) if (b & band).sum() / min(area, b.sum()) > 0.35]
        if not hits:
            keep.append(c); bands.append(band)
        else:
            for i in hits:
                k = keep[i]
                off = abs(float(np.dot((k["c0"] + k["c1"]) / 2 - c["c0"], c["n"])))
                if (c.get("pts") is None and k.get("pts") is None and _adiff(c["ang"], k["ang"]) < math.radians(4) and off < c["w"] / 2 and c["w"] > 1.3 * k["w"]
                        and c["edge_density"] < 0.06 and c["contrast"] >= 0.6 * k["contrast"] and c["length"] > 0.6 * k["length"]):
                    keep[i] = c; bands[i] = band
                    break
        if len(keep) >= limit * 2:
            break
    # drop duplicates created by replacement
    out = []
    for i, c in enumerate(keep):
        if any(c is o for o in out):
            continue
        out.append(c)
    return out


# ---------------------------------------------------------------- region detector
REGION_PX = 360


def _component_polyline(ys, xs):
    """Straight centreline of one elongated pixel blob (principal axis), or nothing if the blob
    wanders (bends, clutter, background shapes). Bends are recovered later as elbows between
    straight pieces."""
    pts = np.stack([xs, ys], 1).astype(np.float32)
    mu = pts.mean(0); C = np.cov((pts - mu).T)
    ev, evec = np.linalg.eigh(C)
    if ev[0] <= 0 or ev[1] / ev[0] < 30:  # elongation (std ratio) below ~5.5
        return []
    u = evec[:, 1]; n = np.array([-u[1], u[0]])
    t = (pts - mu) @ u; q = (pts - mu) @ n
    nb = 8
    edges = np.linspace(t.min(), t.max(), nb + 1)
    mids, thick = [], []
    for k in range(nb):
        sel = (t >= edges[k]) & (t <= edges[k + 1])
        if sel.sum() < 4:
            return []  # gaps along the axis: not one continuous pipe
        qq = q[sel]; mids.append(float(np.median(qq))); thick.append(float(np.percentile(qq, 95) - np.percentile(qq, 5)))
    th = float(np.median(thick))
    if th < 2 or float(np.max(np.abs(mids))) > 0.45 * th or float(np.max(thick)) > 1.8 * th or float(np.min(thick)) < 0.45 * th:
        return []  # wobbly centreline or uneven width
    return [(np.array([mu + u * t.min(), mu + u * t.max()]), th, u, n)]


def _regions(ctx, deadline):
    k = REGION_PX / ctx.L
    sm = cv2.resize(ctx.rgb, (max(8, round(ctx.w * k)), max(8, round(ctx.h * k))), interpolation=cv2.INTER_AREA)
    sm = cv2.bilateralFilter(sm, 7, 30, 7)
    lab = cv2.cvtColor(sm, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    K = 9
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, 1.0)
    _, labels, _ = cv2.kmeans(lab, K, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    labels = labels.reshape(sm.shape[:2])
    hh, ww = labels.shape; N = hh * ww
    out = []
    kern = np.ones((3, 3), np.uint8)
    for c in range(K):
        if time.time() > deadline:
            break
        m = (labels == c).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, kern)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kern, iterations=2)
        nlab, cc, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
        for i in range(1, nlab):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < 0.0015 * N or area > 0.2 * N:
                continue
            x, y, bw, bh = stats[i, :4]
            borders = (x == 0) + (y == 0) + (x + bw >= ww) + (y + bh >= hh)
            if borders >= 3:
                continue
            ys, xs = np.nonzero(cc[y:y + bh, x:x + bw] == i)
            ys = ys + y; xs = xs + x
            comp = (cc == i).astype(np.uint8)
            dist = cv2.distanceTransform(comp, cv2.DIST_L2, 3)
            thick = 2.0 * float(np.percentile(dist[comp > 0], 85))
            if thick < 2.5:
                continue
            length = area / thick
            if length / thick < 5.0:
                continue
            col = lab.reshape(hh, ww, 3)[ys, xs]
            if float(col[:, 0].std()) > 28:
                continue
            for line, med, u, n in _component_polyline(ys, xs):
                seg_len = float(np.sum(np.linalg.norm(np.diff(line, axis=0), axis=1)))
                if seg_len < 0.08 * REGION_PX or seg_len / max(med, thick * 0.6, 1.0) < 4.0:
                    continue
                w = max(med, 2.0) / k
                pts = line / k
                uu = (pts[-1] - pts[0]) / (np.linalg.norm(pts[-1] - pts[0]) or 1)
                out.append({"c0": pts[0], "c1": pts[-1], "w": w, "u": uu, "n": np.array([-uu[1], uu[0]]),
                            "ang": math.atan2(uu[1], uu[0]) % math.pi, "src": "region"})
    return out


def _score_poly(ctx, edges, c):
    """Score a region polyline with the same tests as an edge pair, segment by segment."""
    pts = c["pts"]; hw = c["w"] / 2
    labs_in, labs_l, labs_r, e_tot, e_al, inner_rois = [], [], [], 0, 0, []
    for a, b in zip(pts[:-1], pts[1:]):
        d = b - a; L = float(np.linalg.norm(d))
        if L < 2:
            continue
        uu = d / L; nn = np.array([-uu[1], uu[0]])
        r_in = ctx.roi(_band_poly(a, b, hw * 0.7))
        off = nn * (hw + max(3.0, c["w"] * 0.3)); sw = max(2.0, c["w"] * 0.22)
        r_l = ctx.roi(_band_poly(a + off, b + off, sw)); r_r = ctx.roi(_band_poly(a - off, b - off, sw))
        if r_in is None or r_l is None or r_r is None or not r_in[2].any() or not r_l[2].any() or not r_r[2].any():
            continue
        inner_rois.append(r_in)
        labs_in.append(ctx.take(ctx.lab, r_in)); labs_l.append(ctx.take(ctx.lab, r_l)); labs_r.append(ctx.take(ctx.lab, r_r))
        e_in = ctx.take(edges, r_in) > 0
        gx, gy = ctx.take(ctx.gx, r_in)[e_in], ctx.take(ctx.gy, r_in)[e_in]
        mag = np.hypot(gx, gy) + 1e-6
        e_al += int(((np.abs(gx * nn[0] + gy * nn[1]) / mag) > 0.9).sum()); e_tot += e_in.size
    if not labs_in:
        return None
    lin = np.concatenate(labs_in).mean(0)
    contrast = min(float(np.linalg.norm(np.concatenate(labs_l).mean(0) - lin)), float(np.linalg.norm(np.concatenate(labs_r).mean(0) - lin)))
    edge_density = e_al / max(1, e_tot)
    length = float(np.sum(np.linalg.norm(np.diff(pts, axis=0), axis=1)))
    if contrast < 9 or edge_density > 0.09:
        return None
    wpref = 0.75 + 0.25 * min(1.0, c["w"] / (0.03 * ctx.L))
    c.update(score=(length / ctx.L) * (0.4 + min(contrast, 40) / 40) * (1 - 4 * edge_density) * 1.1 * wpref,
             contrast=contrast, edge_density=edge_density, shade=0.05, length=length, inner=inner_rois[len(inner_rois) // 2], inner_all=inner_rois)
    return c


def _merge_collinear(cands):
    changed = True
    while changed:
        changed = False
        for i in range(len(cands)):
            for j in range(i + 1, len(cands)):
                a, b = cands[i], cands[j]
                if a.get("pts") is not None or b.get("pts") is not None:
                    continue
                if _adiff(a["ang"], b["ang"]) > math.radians(5) or max(a["w"], b["w"]) / min(a["w"], b["w"]) > 1.6:
                    continue
                if a.get("mat") and b.get("mat") and a["mat"][0] != b["mat"][0] and min(a["mat"][2], b["mat"][2]) >= 0.35:
                    continue  # different suggested materials: keep apart (transition check later)
                u = a["u"]; n = a["n"]
                off = abs(float(np.dot((b["c0"] + b["c1"]) / 2 - a["c0"], n)))
                if off > 0.6 * max(a["w"], b["w"]):
                    continue
                ta = sorted([0.0, float(np.dot(a["c1"] - a["c0"], u))])
                tb = sorted([float(np.dot(b["c0"] - a["c0"], u)), float(np.dot(b["c1"] - a["c0"], u))])
                gap = max(tb[0] - ta[1], ta[0] - tb[1])
                if gap > max(2.5 * max(a["w"], b["w"]), 25):
                    continue
                lo, hi = min(ta[0], tb[0]), max(ta[1], tb[1])
                base = a["c0"]
                a["c0"], a["c1"] = base + u * lo, base + u * hi
                a["w"] = (a["w"] * a["length"] + b["w"] * b["length"]) / (a["length"] + b["length"])
                a["score"] += b["score"]; a["length"] = hi - lo
                a["contrast"] = max(a["contrast"], b["contrast"])
                cands.pop(j); changed = True
                break
            if changed:
                break
    return cands


def _line_intersect(a0, a1, b0, b1):
    d1, d2 = a1 - a0, b1 - b0
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-6:
        return None
    t = ((b0[0] - a0[0]) * d2[1] - (b0[1] - a0[1]) * d2[0]) / den
    return a0 + d1 * t


def _connect(ctx, runs):
    """Find elbows (end meets end at an angle) and tees (end lands on another run's side)."""
    L = ctx.L
    joints, links = [], {}
    for i, a in enumerate(runs):
        for ea, pa in (("0", a["c0"]), ("1", a["c1"])):
            for j, b in enumerate(runs):
                if i == j:
                    continue
                ang = _adiff(a["ang"], b["ang"])
                if ang < math.radians(25) or max(a["w"], b["w"]) / min(a["w"], b["w"]) > 1.5:
                    continue
                if np.linalg.norm(a["lab"] - b["lab"]) > 22:
                    continue
                reach = 1.2 * max(a["w"], b["w"]) + 0.01 * L
                for eb, pb in (("0", b["c0"]), ("1", b["c1"])):
                    if np.linalg.norm(pa - pb) < reach and (i, ea) not in links and (j, eb) not in links and i < j:
                        x = _line_intersect(a["c0"], a["c1"], b["c0"], b["c1"])
                        if x is None or np.linalg.norm(x - pa) > 2.5 * reach:
                            x = (pa + pb) / 2
                        links[(i, ea)] = (j, eb, x); links[(j, eb)] = (i, ea, x)
                        joints.append({"kind": "elbow", "at": x, "runs": (i, j), "w": max(a["w"], b["w"])})
                # tee: end of a lands on b's side, away from b's ends
                if (i, ea) in links or ang < math.radians(50):
                    continue
                u = b["u"]; t = float(np.dot(pa - b["c0"], u)); Lb = float(np.linalg.norm(b["c1"] - b["c0"]))
                if 1.5 * b["w"] < t < Lb - 1.5 * b["w"]:
                    perp = abs(float(np.dot(pa - b["c0"], b["n"])))
                    if perp < b["w"] * 0.5 + a["w"] * 1.2 + 0.01 * L:
                        x = b["c0"] + u * t
                        links[(i, ea)] = ("tee", j, x)
                        joints.append({"kind": "tee", "at": x, "runs": (i, j), "w": b["w"]})
    return joints, links


def _chains(runs, links):
    used, chains = set(), []
    for i in range(len(runs)):
        if i in used:
            continue
        # walk to one free end
        cur, end, seen = i, "0", {i}
        while (cur, end) in links and links[(cur, end)][0] != "tee":
            j, eb, _ = links[(cur, end)]
            if j in seen:
                break
            seen.add(j); cur, end = j, ("1" if eb == "0" else "0")
        # now walk forward from (cur, end) collecting points
        start_run, start_end = cur, end
        pts, members, cur, end = [], [], start_run, start_end
        visited = set()
        while True:
            visited.add(cur); members.append(cur)
            if len(members) >= 4:
                links.pop((cur, "1" if end == "0" else "0"), None)
            r = runs[cur]
            a, b = (r["c0"], r["c1"]) if end == "0" else (r["c1"], r["c0"])
            other = "1" if end == "0" else "0"
            inner_pts = list(r["pts"][1:-1]) if r.get("pts") is not None else []
            if end == "1":
                inner_pts = inner_pts[::-1]
            if not pts:
                pts.append(a)
            pts.extend(inner_pts)
            nxt = links.get((cur, other))
            if nxt and nxt[0] != "tee" and nxt[0] not in visited:
                j, eb, x = nxt
                pts.append(x); cur, end = j, eb
                continue
            if nxt and nxt[0] == "tee":
                pts.append(nxt[2])
            else:
                pts.append(b)
            break
        start_tee = links.get((start_run, start_end))
        if start_tee and start_tee[0] == "tee":
            pts[0] = start_tee[2]
        used |= visited
        chains.append({"members": members, "pts": pts})
    return chains


def analyze(rgb, deadline_s=25.0):
    """rgb: HxWx3 uint8. Returns dict in normalised 0-1000 coordinates."""
    t_start = time.time(); deadline = t_start + deadline_s
    H0, W0 = rgb.shape[:2]
    k = WORK / max(H0, W0)
    small = cv2.resize(rgb, (max(1, round(W0 * k)), max(1, round(H0 * k))), interpolation=cv2.INTER_AREA) if k < 1 else rgb.copy()
    ctx = _Ctx(small)
    edges, segs = _segments(ctx)
    raw = _pairs(ctx, edges, segs, deadline - 6)
    raw.sort(key=lambda c: -np.linalg.norm(c["c1"] - c["c0"]))
    scored = [c for c in (_score(ctx, edges, c) for c in raw[:700]) if c]
    pairs_kept = _nms(ctx, scored)
    regs = [c for c in (_score(ctx, edges, c) for c in _regions(ctx, deadline - 3)) if c]
    for c in regs:
        c["score"] *= 1.15  # a uniform-colour blob with two clean sides is stronger evidence than an edge pair
    kept = _nms(ctx, pairs_kept + regs)
    for c in kept:
        c["lab"] = ctx.take(ctx.lab, c["inner"]).mean(0)
        st = _material_stats(ctx, c.get("inner_all") or c["inner"])
        c["stats"] = st
        c["mat"] = classify(dict(st, width_px=c["w"])) if st else ("UNK", "", 0.2, [], [])
    kept = _merge_collinear(kept)
    for c in kept:
        c["lab"] = ctx.take(ctx.lab, c["inner"]).mean(0)
    kept.sort(key=lambda c: -c["score"])
    kept = [c for c in kept if c["length"] > 0.08 * ctx.L][:12]
    joints, links = _connect(ctx, kept)
    chains = _chains(kept, links)

    sx, sy = 1000.0 / ctx.w, 1000.0 / ctx.h
    N = lambda p: [round(float(p[0]) * sx, 1), round(float(p[1]) * sy, 1)]
    runs, items, issues = [], [], []
    chains.sort(key=lambda ch: -sum(kept[m]["score"] for m in ch["members"]))
    for idx, ch in enumerate(chains[:10]):
        mem = [kept[m] for m in ch["members"]]
        lead = max(mem, key=lambda c: c["length"])
        length = sum(c["length"] for c in mem)
        code, sub, mconf, cues, alts = lead["mat"]
        conf = 0.34 + 0.22 * min(1.0, length / (0.45 * ctx.L)) + 0.14 * min(1.0, lead["contrast"] / 35) + 0.08 * min(1.0, lead["shade"] * 8) - 1.5 * lead["edge_density"]
        conf = round(max(0.3, min(0.78, conf)), 2)
        mid = (ch["pts"][len(ch["pts"]) // 2 - 1] + ch["pts"][len(ch["pts"]) // 2]) / 2 if len(ch["pts"]) > 1 else ch["pts"][0]
        lbl = mid + lead["n"] * (lead["w"] * 0.9 + 0.05 * ctx.L)
        rid = f"R{idx + 1}"
        for m in ch["members"]:
            kept[m]["rid"] = rid
        st = lead.get("stats") or {}
        runs.append({
            "id": rid, "sys": "UNK", "size": "?", "material": code, "matSub": sub, "matConf": mconf, "matCues": cues, "matAlt": alts,
            "mat": sub or code, "conf": conf, "pts": [N(p) for p in ch["pts"]], "lbl": N(lbl),
            "wpx": round(float(lead["w"]) / ctx.w * 1000.0, 2),  # apparent width, normalised to image width (x 1000)
            "note": f"Two parallel edges traced over {length / ctx.L * 100:.0f}% of the frame; apparent width {lead['w'] / ctx.L * 100:.1f}% of frame. "
                    f"Size not measured (no scale). Material from colour/texture only: hue {st.get('h', 0):.0f}°, sat {st.get('s', 0):.2f}, value {st.get('v', 0):.2f}.",
        })
    for j, jt in enumerate(joints):
        a, b = kept[jt["runs"][0]], kept[jt["runs"][1]]
        if "rid" not in a or "rid" not in b:
            continue
        kind = jt["kind"]
        items.append({"id": f"{'E' if kind == 'elbow' else 'T'}{j + 1}", "layer": "fittings", "type": "Elbow (possible)" if kind == "elbow" else "Tee (possible)",
                      "tag": "", "size": "", "sys": "", "at": N(jt["at"]), "lbl": N(jt["at"] + np.array([0.06 * ctx.L, -0.05 * ctx.L])), "conf": 0.45 if kind == "elbow" else 0.4,
                      "desc": f"{'Two runs meet at an angle' if kind == 'elbow' else 'A run ends on the side of another'} — fitting type and size not verified.", "noCallout": kind == "elbow"})
        ma, mb = a["mat"], b["mat"]
        if ma[0] != mb[0] and ma[0] != "UNK" and mb[0] != "UNK" and min(ma[2], mb[2]) >= 0.35:
            p = jt["at"]; r = max(jt["w"], 0.03 * ctx.L) * 1.4
            issues.append({"id": f"X{len(issues) + 1}", "title": f"Possible material change ({ma[0]} → {mb[0]})", "sev": "Medium", "conf": round(min(ma[2], mb[2]), 2),
                           "poly": [N(p + np.array(d) * r) for d in ((-1, -1), (1, -1), (1, 1), (-1, 1))], "lbl": N(p + np.array([0.08 * ctx.L, 0.08 * ctx.L])),
                           "text": "Finish changes where these runs meet. If dissimilar metals, verify a dielectric/transition fitting per spec."})
    # photo-level advisories
    v = float(ctx.gray.mean()) / 255
    sharp = float(cv2.Laplacian(ctx.gray, cv2.CV_64F).var())
    adv = ["No scale reference detected — sizes and lengths are not measured. Confirm one size to scale the rest.",
           "Stencil / print text is not read in the local pass (vision model or Bluebeam OCR can add it)."]
    if v < 0.22:
        adv.insert(0, "Low light — edges are weak; expect missed runs. Re-shoot with flash if possible.")
    if sharp < 60:
        adv.insert(0, "Photo looks soft (motion blur or focus) — edges are weak.")
    if not runs:
        adv.insert(0, "No confident pipe runs found. Try a straighter-on angle with the pipe filling more of the frame.")
    pconf = round(float(np.mean([r["conf"] for r in runs])) if runs else 0.3, 2)
    return {"runs": runs, "items": items, "issues": issues, "advisories": adv, "conf": pconf,
            "stats": {"segments": len(segs), "pairs": len(raw), "regions": len(regs), "kept": len(kept), "ms": int((time.time() - t_start) * 1000), "work_px": [ctx.w, ctx.h]}}
