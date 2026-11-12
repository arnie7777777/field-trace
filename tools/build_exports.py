#!/usr/bin/env python3
"""Build the deliverables in exports/:

  FT-01.pdf … FT-06.pdf        one 11x17 sheet per photo: clean photo + EDITABLE markups (real PDF annotations
                               on named layers / optional content groups) + vector as-built iso + title block
  Field-Trace-Sample-Set.pdf   cover + all sheets + takeoff page
  field-trace-takeoff.csv, field-trace-markup-summary.csv
  ../assets/previews/*.png     thumbnails rendered from the finished PDFs (used by the Export screen)

Requires: node, google-chrome (headless), python3 + pikepdf, poppler-utils (pdftoppm).
Run:  python3 tools/build_exports.py
"""
import json, math, os, subprocess, sys, tempfile, shutil
import pikepdf
from pikepdf import Array, Dictionary, Name, Pdf, String, Stream

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXP = os.path.join(ROOT, "exports")
PREV = os.path.join(ROOT, "assets", "previews")
CHROME = shutil.which("google-chrome") or shutil.which("chromium") or "google-chrome"

D = json.loads(subprocess.check_output(["node", os.path.join(ROOT, "tools", "dump.js")]))
FT = D["FT"]
PAGE_W, PAGE_H = FT["sheet"]["page"]
BX, BY, BW, BH = FT["sheet"]["photoBox"]
AUTHOR = "Field Trace AI"
THRESH = 0.7
LAYER_COLOR = {"fittings": "#2b3a46", "valves": "#e09400", "supports": "#3d9ad1", "dims": "#0f9fd6", "issues": "#e5281c", "labels": "#2b3a46", "runs": "#2b3a46"}


def hex2rgb(h):
    h = h.lstrip("#"); return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def f(v):
    return ("%.2f" % v).rstrip("0").rstrip(".")


def pdf_text(s):
    s = str(s).replace("\u2014", "-").replace("\u2013", "-")
    b = s.encode("cp1252", "replace")
    return b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def pdfdate(taken):
    d, t = taken.split(" ")
    return "D:" + d.replace("-", "") + t.replace(":", "") + "00-05'00'"


def chrome_pdf(url, out):
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", "--virtual-time-budget=8000",
                    f"--print-to-pdf={out}", url], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class Sheet:
    """Maps photo pixels to PDF points for one photo sheet."""

    def __init__(self, p):
        self.p = p
        s = min(BW / p["w"], BH / p["h"])
        self.s = s
        self.ox = BX + (BW - p["w"] * s) / 2
        self.oy = BY + (BH - p["h"] * s) / 2
        self.k = s * 72  # pt per image px
        self.rect = (self.ox * 72, (PAGE_H - self.oy - p["h"] * s) * 72, (self.ox + p["w"] * s) * 72, (PAGE_H - self.oy) * 72)

    def pt(self, xy):
        return ((self.ox + xy[0] * self.s) * 72, (PAGE_H - (self.oy + xy[1] * self.s)) * 72)


class Annotator:
    def __init__(self, pdf):
        self.pdf = pdf
        self.helv = pdf.make_indirect(Dictionary(Type=Name.Font, Subtype=Name.Type1, BaseFont=Name.Helvetica, Encoding=Name.WinAnsiEncoding))
        self.helvb = pdf.make_indirect(Dictionary(Type=Name.Font, Subtype=Name("/Type1"), BaseFont=Name("/Helvetica-Bold"), Encoding=Name.WinAnsiEncoding))
        self.ocgs = {}
        for l in FT["layers"]:
            self.ocgs[l["id"]] = pdf.make_indirect(Dictionary(Type=Name.OCG, Name=String(l["name"])))
        self.gs = pdf.make_indirect(Dictionary(Type=Name.ExtGState, ca=0.12, CA=1))

    def finish(self):
        order = Array([self.ocgs[l["id"]] for l in FT["layers"]])
        self.pdf.Root.OCProperties = Dictionary(OCGs=order, D=Dictionary(Name=String("Field Trace markup layers"), Order=order, ON=order, BaseState=Name.ON))

    # ---------- appearance + annotation plumbing ----------
    def ap(self, bbox, ops):
        st = Stream(self.pdf, ops.encode("latin-1"))
        st.Type = Name.XObject; st.Subtype = Name.Form; st.BBox = Array([float(v) for v in bbox])
        st.Resources = Dictionary(Font=Dictionary(Helv=self.helv, HeBo=self.helvb), ExtGState=Dictionary(GSf=self.gs))
        return self.pdf.make_indirect(st)

    def add(self, page, p, m, subtype, rect, ops, extra, color, layer):
        r = [rect[0] - 2, rect[1] - 2, rect[2] + 2, rect[3] + 2]
        a = Dictionary(Type=Name.Annot, Subtype=Name("/" + subtype), Rect=Array([float(v) for v in r]), F=4,
                       T=String(AUTHOR), Subj=String(m["subject"]), Contents=String(m.get("_contents") or m.get("note") or m["label"]),
                       NM=String(f"FT-{p['id']}-{m['id']}"), M=String(pdfdate(p["taken"])), CreationDate=String(pdfdate(p["taken"])),
                       C=Array([float(c) for c in hex2rgb(color)]), CA=1.0, OC=self.ocgs[layer])
        a.AP = Dictionary(N=self.ap(r, ops))
        for k, v in extra.items():
            a[k] = v
        a = self.pdf.make_indirect(a)
        if "/Annots" not in page.obj:
            page.obj.Annots = Array()
        page.obj.Annots.append(a)
        return a


def bbox_of(pts, pad=0):
    xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    return (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)


def stroke_ops(color, w, dash=None):
    r, g, b = hex2rgb(color)
    return f"{f(r)} {f(g)} {f(b)} RG {f(w)} w 1 J 1 j " + (f"[{' '.join(f(d) for d in dash)}] 0 d " if dash else "[] 0 d ")


def path_ops(pts, close=False):
    s = f"{f(pts[0][0])} {f(pts[0][1])} m " + " ".join(f"{f(q[0])} {f(q[1])} l" for q in pts[1:])
    return s + (" h" if close else "")


def arrow_ops(frm, to, size, color):
    a = math.atan2(to[1] - frm[1], to[0] - frm[0])
    p1 = (to[0] - size * math.cos(a - 0.4), to[1] - size * math.sin(a - 0.4))
    p2 = (to[0] - size * math.cos(a + 0.4), to[1] - size * math.sin(a + 0.4))
    r, g, b = hex2rgb(color)
    return f" {f(r)} {f(g)} {f(b)} rg {path_ops([to, p1, p2], True)} f "


def text_w(s, size, bold=False):
    return len(str(s)) * size * (0.56 if bold else 0.5)


def cloud_ops(poly, r):
    # ensure counter-clockwise in PDF space (y up) so bumps go outward
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    P = poly if area > 0 else poly[::-1]
    out = f"{f(P[0][0])} {f(P[0][1])} m "
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        L = math.dist(a, b); n = max(1, round(L / (r * 1.6)))
        for k in range(n):
            s0 = (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
            s1 = (a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n)
            dx, dy = s1[0] - s0[0], s1[1] - s0[1]; nx, ny = dy, -dx  # outward for CCW
            kk = 0.62
            c1 = (s0[0] + nx * kk, s0[1] + ny * kk); c2 = (s1[0] + nx * kk, s1[1] + ny * kk)
            out += f"{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(s1[0])} {f(s1[1])} c "
    return out + "h"


class Placer:
    def __init__(self, rect):
        self.rect = rect; self.boxes = []

    def place(self, x, y, w, h):
        L, B, R, T = self.rect
        x = max(L + 3, min(x, R - w - 3)); y = max(B + 3, min(y, T - h - 3))
        hit = lambda X, Y: any(X < b[0] + b[2] + 3 and X + w + 3 > b[0] and Y < b[1] + b[3] + 3 and Y + h + 3 > b[1] for b in self.boxes)
        bx, by = x, y
        if hit(x, y):
            done = False
            for i in range(1, 40):
                for sg in (-1, 1):
                    Y = max(B + 3, min(y + sg * i * h * 0.55, T - h - 3))
                    if not hit(x, Y): bx, by, done = x, Y, True; break
                    X = max(L + 3, min(x - sg * i * h * 0.8, R - w - 3))
                    if not hit(X, y): bx, by, done = X, y, True; break
                if done: break
        self.boxes.append((bx, by, w, h))
        return bx, by


def callout(A, page, p, m, sh, placer, target_px, lbl_px, lines, color, layer, fill=(1, 1, 1), group_to=None, subj=None):
    """FreeText callout (box + leader + arrow) as a real, editable PDF annotation."""
    fs = 6.2; lh = fs * 1.25; pad = 2.6
    w = max(text_w(t, fs * (0.85 if sm else 1), b) for t, b, sm, _ in lines) + pad * 2
    h = sum(lh * (0.85 if sm else 1) for t, b, sm, _ in lines) + pad * 1.2
    lx, ly = sh.pt(lbl_px)
    bx, by = placer.place(lx, ly - h, w, h)
    tgt = sh.pt(target_px)
    ex = max(bx, min(tgt[0], bx + w)); ey = max(by, min(tgt[1], by + h))
    if bx < tgt[0] < bx + w and by < tgt[1] < by + h: ex, ey = bx, by + h / 2
    r, g, b_ = hex2rgb(color)
    ops = stroke_ops(color, 0.6) + f"{f(ex)} {f(ey)} m {f(tgt[0])} {f(tgt[1])} l S" + arrow_ops((ex, ey), tgt, 4, color)
    ops += f" {f(fill[0])} {f(fill[1])} {f(fill[2])} rg {f(r)} {f(g)} {f(b_)} RG 0.7 w {f(bx)} {f(by)} {f(w)} {f(h)} re B "
    ty = by + h - pad * 0.6
    for t, bold, small, col in lines:
        s = fs * (0.85 if small else 1); ty -= lh * (0.85 if small else 1)
        cr = hex2rgb(col or "#111a22")
        ops += f" BT /{'HeBo' if bold else 'Helv'} {f(s)} Tf {f(cr[0])} {f(cr[1])} {f(cr[2])} rg {f(bx + pad)} {f(ty + lh * 0.18)} Td ({pdf_text(t).decode('latin-1')}) Tj ET"
    rect = bbox_of([(bx, by), (bx + w, by + h), tgt], 4)
    plain = "\n".join(t for t, *_ in lines)
    rc = ('<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/" xfa:APIVersion="Acrobat:11.0.0" xfa:spec="2.0.2" style="font-size:6.2pt;text-align:left;color:#111A22;font-weight:normal;font-style:normal;font-family:Helvetica;font-stretch:normal">'
          + "".join(f"<p>{x.replace('&', '&amp;').replace('<', '&lt;')}</p>" for x in plain.split("\n")) + "</body>")
    extra = {"/IT": Name.FreeTextCallout, "/CL": Array([float(tgt[0]), float(tgt[1]), float(ex), float(ey)]), "/LE": Name.OpenArrow,
             "/DA": String(f"{f(r)} {f(g)} {f(b_)} RG 0 0 0 rg /Helv 6.2 Tf"), "/DS": String("font: Helvetica 6.2pt; text-align:left; color:#111A22"),
             "/RC": String(rc), "/BS": Dictionary(W=0.7, S=Name.S),
             "/RD": Array([float(bx - rect[0] + 2), float(by - rect[1] + 2), float(rect[2] - (bx + w) + 2), float(rect[3] - (by + h) + 2)])}
    mm = dict(m); mm["_contents"] = plain if not m.get("note") else m["note"]
    if subj: mm["subject"] = subj
    if group_to is not None:
        extra["/IRT"] = group_to; extra["/RT"] = Name.Group
    return A.add(page, p, mm, "FreeText", rect, ops, extra, color, layer)


def annotate(A, page, p):
    sh = Sheet(p)
    ms = {m["id"]: m for m in D["markups"][p["id"]]}
    placer = Placer(sh.rect)
    n = 0
    sysc = lambda k: FT["systems"].get(k, FT["systems"]["UNK"])["color"]

    # stamp
    if p.get("stamp") and "STAMP" in ms:
        m = ms["STAMP"]; rev = p["status"] == "reviewed"; col = "#1f9d55" if rev else "#d7263d"
        x0, y0 = sh.pt(p["stamp"]); w, h = 118, 40; y0 -= h
        cr = hex2rgb(col); placer.boxes.append((x0, y0, w, h))
        ops = f"1 1 1 rg {f(cr[0])} {f(cr[1])} {f(cr[2])} RG 1.6 w {f(x0)} {f(y0)} {w} {h} re B 0.6 w {f(x0 + 2.5)} {f(y0 + 2.5)} {w - 5} {h - 5} re S"
        ops += f" BT /HeBo 15 Tf {f(cr[0])} {f(cr[1])} {f(cr[2])} rg {f(x0 + w / 2 - text_w('AS-BUILT', 15, True) / 2 + 4)} {f(y0 + 21)} Td (AS-BUILT) Tj ET"
        sub = "REVIEWED - ACCEPTED" if rev else "FIELD TRACE - AI FIRST PASS"
        ops += f" BT /HeBo 5.6 Tf {f(x0 + w / 2 - text_w(sub, 5.6, True) / 2 + 3)} {f(y0 + 12.5)} Td ({sub}) Tj ET"
        ops += f" BT /Helv 5.2 Tf {f(x0 + w / 2 - text_w(p['id'] + ' - ' + p['taken'][:10], 5.2) / 2 + 2)} {f(y0 + 5.5)} Td ({p['id']} - {p['taken'][:10]}) Tj ET"
        A.add(page, p, dict(m, _contents=f"AS-BUILT - {sub} - {p['id']}"), "Stamp", (x0, y0, x0 + w, y0 + h), ops, {"/Name": Name("/ASBuilt")}, col, "labels")
        n += 1
    # dimensions: Line annotations (LineDimension intent, caption inline)
    for dm in p["dims"]:
        m = ms[dm["id"]]
        ang = math.atan2(dm["b"][1] - dm["a"][1], dm["b"][0] - dm["a"][0]); nx, ny = -math.sin(ang), math.cos(ang)
        A_ = (dm["a"][0] + nx * dm["off"], dm["a"][1] + ny * dm["off"]); B_ = (dm["b"][0] + nx * dm["off"], dm["b"][1] + ny * dm["off"])
        pa, pb = sh.pt(A_), sh.pt(B_)
        ext = dm.get("ext") or [dm["a"], dm["b"]]
        e1, e2 = sh.pt(ext[0]), sh.pt(ext[1])
        col = "#0f9fd6"; low = dm["conf"] < THRESH
        ops = stroke_ops(col, 0.45) + f"{f(e1[0])} {f(e1[1])} m {f(pa[0])} {f(pa[1])} l {f(e2[0])} {f(e2[1])} m {f(pb[0])} {f(pb[1])} l S "
        ops += stroke_ops(col, 0.8, [3, 2] if low else None) + f"{f(pa[0])} {f(pa[1])} m {f(pb[0])} {f(pb[1])} l S" + arrow_ops(pb, pa, 4.5, col) + arrow_ops(pa, pb, 4.5, col)
        mx, my = (pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2; tw = text_w(dm["text"], 6.4, True) + 4
        deg = math.atan2(pb[1] - pa[1], pb[0] - pa[0])
        if deg > math.pi / 2: deg -= math.pi
        if deg < -math.pi / 2: deg += math.pi
        cs, sn = math.cos(deg), math.sin(deg)
        ops += f" q {f(cs)} {f(sn)} {f(-sn)} {f(cs)} {f(mx)} {f(my)} cm 1 1 1 rg {f(-tw / 2)} -3.6 {f(tw)} 8.4 re f BT /HeBo 6.4 Tf 0.06 0.62 0.84 rg {f(-tw / 2 + 2)} -1.6 Td ({pdf_text(dm['text']).decode('latin-1')}) Tj ET Q"
        hw = abs(cs) * tw / 2 + abs(sn) * 4.2; hh = abs(sn) * tw / 2 + abs(cs) * 4.2
        placer.boxes.append((mx - hw, my - hh, hw * 2, hh * 2))
        A.add(page, p, dict(m, _contents=f"{dm['text']} - basis: {dm['basis']}"), "Line", bbox_of([pa, pb, e1, e2], 8), ops,
              {"/L": Array([float(pa[0]), float(pa[1]), float(pb[0]), float(pb[1])]), "/LE": Array([Name.ClosedArrow, Name.ClosedArrow]), "/IC": Array([float(c) for c in hex2rgb(col)]),
               "/IT": Name.LineDimension, "/Cap": True, "/CP": Name.Inline, "/BS": Dictionary(W=0.8, S=Name.S)}, col, "dims")
        n += 1

    # issues: revision cloud (Polygon /BE cloudy) + grouped callout
    for x in p["issues"]:
        m = ms[x["id"]]; poly = [sh.pt(q) for q in x["poly"]]
        ops = stroke_ops("#e5281c", 1.1) + cloud_ops(poly, 4.2) + " S"
        a = A.add(page, p, dict(m, _contents=f"{x['title']} ({x['sev']}): {x['text']}"), "Polygon", bbox_of(poly, 7), ops,
                  {"/Vertices": Array([float(v) for q in poly for v in q]), "/BE": Dictionary(S=Name.C, I=1), "/BS": Dictionary(W=1.1, S=Name.S)}, "#e5281c", "issues")
        xs = [q[0] for q in x["poly"]]; ys = [q[1] for q in x["poly"]]
        tgt = (max(min(xs), min(x["lbl"][0], max(xs))), max(min(ys), min(x["lbl"][1], max(ys))))
        callout(A, page, p, m, sh, placer, tgt, x["lbl"], [(x["title"], True, False, "#9c1710"), (f"{x['sev']} priority - see comment", False, True, "#444444")],
                "#e5281c", "issues", fill=(1, 0.97, 0.965), group_to=a, subj="Cloud+")
        n += 2

    # pipe runs: PolyLine in system color (+ mid flow arrow in the appearance)
    for r in p["runs"]:
        m = ms[r["id"]]; pts = [sh.pt(q) for q in r["pts"]]; col = sysc(r["sys"]); low = r["conf"] < THRESH
        ops = stroke_ops("#0b1014", 3.4) + path_ops(pts) + " S " + stroke_ops(col, 2.0, [4, 2.5] if low else None) + path_ops(pts) + " S"
        if r.get("flow"):
            # arrow at polyline midpoint
            segs = [math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts))]; half = sum(segs) / 2
            for i in range(1, len(pts)):
                if half <= segs[i - 1]:
                    t = half / segs[i - 1]; a0, b0 = pts[i - 1], pts[i]; break
                half -= segs[i - 1]
            mid = (a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t)
            d = (b0[0] - a0[0], b0[1] - a0[1]); L = math.hypot(*d) or 1; d = (d[0] / L * r["flow"], d[1] / L * r["flow"])
            ops += arrow_ops((mid[0] - d[0] * 6, mid[1] - d[1] * 6), (mid[0] + d[0] * 4, mid[1] + d[1] * 4), 6, col)
        A.add(page, p, dict(m, _contents=f"{r['size']} {r['sys']} - {FT['systems'][r['sys']]['name']} - {r['mat']}. {r['note']}"), "PolyLine", bbox_of(pts, 6), ops,
              {"/Vertices": Array([float(v) for q in pts for v in q]), "/BS": Dictionary(W=2.0, S=Name.D if low else Name.S, **({"D": Array([4, 2.5])} if low else {}))}, col, "runs")
        # tag (FreeText callout, system color)
        tm = ms[r["id"] + "-tag"]
        best = min(((q, math.dist(q, r["lbl"])) for q in densify(r["pts"])), key=lambda z: z[1])[0]
        callout(A, page, p, tm, sh, placer, best, r["lbl"], [(f"{r['sys']} {r['size']}" + (" ?" if low else ""), True, False, "#0b1014")], col, "labels",
                fill=tuple(hex2rgb(col)))
        n += 2

    # supports / equipment shapes + item markers / callouts
    for it in p["items"]:
        m = ms[it["id"]]; layer = it["layer"]; col = LAYER_COLOR.get(layer, "#2b3a46")
        primary = None
        if it.get("line"):
            pts = [sh.pt(q) for q in it["line"]]
            primary = A.add(page, p, m, "PolyLine", bbox_of(pts, 4), stroke_ops("#3d9ad1", 1.0, [4, 2.5]) + path_ops(pts) + " S",
                            {"/Vertices": Array([float(v) for q in pts for v in q]), "/BS": Dictionary(W=1.0, S=Name.D, D=Array([4, 2.5]))}, "#3d9ad1", layer)
        if it.get("box"):
            b = it["box"]; p0 = sh.pt((b[0], b[3])); p1 = sh.pt((b[2], b[1]))
            primary = A.add(page, p, m, "Square", (p0[0], p0[1], p1[0], p1[1]), stroke_ops("#e09400", 1.0, [4, 2.5]) + f"{f(p0[0])} {f(p0[1])} {f(p1[0] - p0[0])} {f(p1[1] - p0[1])} re S",
                            {"/BS": Dictionary(W=1.0, S=Name.D, D=Array([4, 2.5]))}, "#e09400", layer)
        if it.get("noCallout") or primary is None and not it.get("noCallout") and False:
            pass
        if it.get("noCallout"):
            if primary is None:
                c = sh.pt(it["at"]); s = 3.4
                if layer == "valves":
                    poly = [(c[0] - s, c[1] + s * .75), (c[0] + s, c[1] - s * .75), (c[0] + s, c[1] + s * .75), (c[0] - s, c[1] - s * .75)]; fillc = "#ffb020"
                elif layer == "fittings":
                    poly = [(c[0], c[1] + s), (c[0] + s, c[1]), (c[0], c[1] - s), (c[0] - s, c[1])]; fillc = "#ffffff"
                else:
                    poly = [(c[0] + s * math.cos(a), c[1] + s * math.sin(a)) for a in [i * math.pi / 4 for i in range(8)]]; fillc = "#8fd3ff"
                fr = hex2rgb(fillc)
                ops = f"{f(fr[0])} {f(fr[1])} {f(fr[2])} rg 0.04 0.06 0.08 RG 0.6 w {path_ops(poly, True)} B"
                A.add(page, p, dict(m, _contents=it["desc"]), "Polygon", bbox_of(poly, 2), ops,
                      {"/Vertices": Array([float(v) for q in poly for v in q]), "/IC": Array([float(v) for v in fr]), "/BS": Dictionary(W=0.6, S=Name.S)}, "#0b1014", layer)
            n += 1
            continue
        low = it["conf"] < THRESH
        lines = [(it["tag"] or it["type"], True, False, None), ((f"{it['size']} " if it["size"] else "") + it["type"] if it["tag"] else (it["size"] or it["desc"][:38]), False, True, "#3a4752")]
        if low:
            lines.append((f"AI unsure ({round(it['conf'] * 100)}%) - verify", True, True, "#b4231a"))
        callout(A, page, p, dict(m, _contents=it["desc"]), sh, placer, it["at"], it["lbl"], lines, "#2b3a46" if layer in ("fittings", "supports") and not primary else col, layer,
                group_to=primary, subj=None if primary is None else m["subject"])
        n += 1

    return n


def densify(pts, step=8):
    out = []
    for i in range(1, len(pts)):
        a, b = pts[i - 1], pts[i]; L = math.dist(a, b); k = max(1, int(L / step))
        out += [(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k) for j in range(k + 1)]
    return out


def main():
    os.makedirs(EXP, exist_ok=True); os.makedirs(PREV, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="ft-")
    base = "file://" + os.path.join(ROOT, "sheet.html")
    pages = ["cover"] + [p["id"] for p in FT["photos"]] + ["takeoff"]
    raw = {}
    for pg in pages:
        out = os.path.join(tmp, f"{pg}.pdf"); chrome_pdf(f"{base}#{pg}", out); raw[pg] = out
        print("printed", pg)

    total = 0
    # individual sheets
    for p in FT["photos"]:
        pdf = Pdf.open(raw[p["id"]])
        del pdf.pages[1:]
        A = Annotator(pdf); total += annotate(A, pdf.pages[0], p); A.finish()
        pdf.docinfo["/Title"] = f"Field Trace - {p['id']} - {p['title']} (sample)"
        pdf.docinfo["/Author"] = "Field Trace AI (Mimetic Technology prototype)"
        pdf.docinfo["/Subject"] = "Annotated field photo + as-built isometric, prepared for Schilke Construction. Sample data."
        pdf.save(os.path.join(EXP, f"{p['id']}.pdf"))
        print("annotated", p["id"], len(pdf.pages[0].obj.Annots), "annotations")

    # full set
    s = Pdf.new()
    for pg in pages:
        src = Pdf.open(raw[pg]); s.pages.append(src.pages[0])
    A = Annotator(s)
    for i, p in enumerate(FT["photos"]):
        annotate(A, s.pages[i + 1], p)
    A.finish()
    s.docinfo["/Title"] = "Field Trace - Sample Set (Mimetic Technology prototype for Schilke Construction)"
    s.docinfo["/Author"] = "Field Trace AI (Mimetic Technology prototype)"
    s.save(os.path.join(EXP, "Field-Trace-Sample-Set.pdf"))

    with open(os.path.join(EXP, "field-trace-takeoff.csv"), "w", encoding="utf-8-sig", newline="") as fh: fh.write(D["takeoffCSV"])
    with open(os.path.join(EXP, "field-trace-markup-summary.csv"), "w", encoding="utf-8-sig", newline="") as fh: fh.write(D["markupCSV"])

    for p in FT["photos"]:
        subprocess.run(["pdftoppm", "-png", "-r", "60", "-singlefile", os.path.join(EXP, f"{p['id']}.pdf"), os.path.join(PREV, p["id"])], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print("done:", total, "annotations across", len(FT["photos"]), "sheets")


if __name__ == "__main__":
    main()
