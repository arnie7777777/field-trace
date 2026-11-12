/* Field Trace — shared model + geometry + SVG helpers (used by the app and the print sheets). */
(function () {
  const FT = window.FT;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- small utils ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (c) => Math.round(c * 100) + "%";
  const sysColor = (k) => (FT.systems[k] || FT.systems.UNK).color;
  const sysName = (k) => (FT.systems[k] || FT.systems.UNK).name;
  const photoById = (id) => FT.photos.find((p) => p.id === id);
  const THRESH = 0.7;

  function ftin(feet) {
    let inches = Math.round(feet * 12);
    const f = Math.floor(inches / 12), i = inches - f * 12;
    return f > 0 ? `${f}'-${i}"` : `${i}"`;
  }
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  /* ---------- markup model (Revu-style subjects / status) ---------- */
  const STATUSES = ["None", "Accepted", "Rejected", "Cancelled", "Completed"];
  const state = { status: {}, comment: {}, hidden: {} };

  function processedDate(p) { return p.taken.slice(0, 10) + " " + (p.status === "reviewed" ? "10:31" : "—"); }

  function buildMarkups(p) {
    const out = [];
    const base = (o) => {
      const key = p.id + ":" + o.id;
      const defStatus = p.status === "reviewed" ? "Accepted" : "None";
      return Object.assign({ key, pid: p.id, author: "Field Trace AI", date: p.taken.slice(0, 10),
        status: state.status[key] || defStatus, comment: state.comment[key] != null ? state.comment[key] : "",
        hidden: !!state.hidden[key] }, o);
    };
    p.runs.forEach((r) => {
      out.push(base({ id: r.id, kind: "run", subject: "Polyline", label: `${r.size} ${r.sys}`, layer: "runs", conf: r.conf, sys: r.sys, src: r,
        detail: `${sysName(r.sys)} · ${r.size} · ${r.mat}`, note: r.note }));
      out.push(base({ id: r.id + "-tag", kind: "tag", subject: "Pipe Tag", label: `${r.sys} ${r.size}`, layer: "labels", conf: r.conf, sys: r.sys, src: r,
        detail: `Tag for ${r.id}`, note: "Label placed per tool-chest standard (system + size)." }));
    });
    p.items.forEach((it) => {
      out.push(base({ id: it.id, kind: "item", subject: it.type, label: it.tag || (it.size ? it.size + " " + it.type : it.type), layer: it.layer, conf: it.conf, sys: it.sys, src: it,
        detail: it.desc, note: it.desc }));
    });
    p.dims.forEach((d) => out.push(base({ id: d.id, kind: "dim", subject: "Dimension", label: d.text, layer: "dims", conf: d.conf, src: d, detail: d.basis, note: "Basis: " + d.basis })));
    if (p.stamp) out.push(base({ id: "STAMP", kind: "stamp", subject: "Stamp", label: p.status === "reviewed" ? "AS-BUILT — Reviewed" : "AS-BUILT — Draft", layer: "labels", conf: 1, src: { at: p.stamp }, detail: "Custom stamp from tool chest", note: "Stamp applied per office standard." }));
    p.issues.forEach((x) => out.push(base({ id: x.id, kind: "issue", subject: "Cloud+", label: x.title, layer: "issues", conf: x.conf, src: x, detail: x.sev + " · " + x.text, note: x.text, sev: x.sev })));
    return out;
  }

  /* ---------- SVG helpers ---------- */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const ptsAttr = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

  /* Revision cloud: scallops along each polygon edge, bulging outward. */
  function cloudPath(poly, r) {
    // ensure clockwise in screen coords (y down) so sweep=1 bulges outward
    let area = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const P = area < 0 ? poly.slice().reverse() : poly;
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const L = dist(a, b), n = Math.max(1, Math.round(L / (r * 1.6)));
      for (let k = 1; k <= n; k++) {
        const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n;
        const rr = (L / n) * 0.62;
        d += ` A${rr.toFixed(1)},${rr.toFixed(1)} 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}`;
      }
    }
    return d + "Z";
  }

  function polyMid(pts) {
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const L = dist(pts[i - 1], pts[i]); segs.push(L); total += L; }
    let half = total / 2;
    for (let i = 1; i < pts.length; i++) {
      if (half <= segs[i - 1]) { const t = half / segs[i - 1]; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; }
      half -= segs[i - 1];
    }
    return [pts[0][0], pts[0][1], 0];
  }
  function polyBox(pts) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  function nearestOnPoly(pts, q) {
    let best = null, bd = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; const vx = b[0] - a[0], vy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
      const p = [a[0] + vx * t, a[1] + vy * t]; const dd = dist(p, q);
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  }

  /* ---------- takeoff (rolled up from the as-built iso model) ---------- */
  function runLengths(p) {
    const L = {};
    p.iso.segs.forEach((s) => { L[s.run] = (L[s.run] || 0) + dist3(s.a, s.b); });
    return L;
  }
  function takeoff(photoIds, opts) {
    opts = opts || {};
    const pipe = {}, parts = {}, issues = [];
    photoIds.map(photoById).forEach((p) => {
      const ms = buildMarkups(p); const st = {}; ms.forEach((m) => (st[m.id] = m.status));
      const lens = runLengths(p);
      p.runs.forEach((r) => {
        if (st[r.id] === "Rejected") return;
        if (opts.acceptedOnly && st[r.id] !== "Accepted") return;
        const k = [r.sys, r.size, r.mat].join("|");
        pipe[k] = pipe[k] || { sys: r.sys, size: r.size, mat: r.mat, lf: 0, photos: new Set(), low: false };
        pipe[k].lf += lens[r.id] || 0; pipe[k].photos.add(p.id); if (r.conf < THRESH) pipe[k].low = true;
      });
      p.items.forEach((it) => {
        if (st[it.id] === "Rejected" || it.layer === "labels") return;
        if (opts.acceptedOnly && st[it.id] !== "Accepted") return;
        const cat = it.layer === "valves" ? "Valves & devices" : it.layer === "supports" ? "Hangers, supports & penetrations" : "Fittings";
        const k = [cat, it.type, it.size].join("|");
        parts[k] = parts[k] || { cat, type: it.type, size: it.size || "—", qty: 0, photos: new Set(), low: false };
        parts[k].qty += 1; parts[k].photos.add(p.id); if (it.conf < THRESH) parts[k].low = true;
      });
      p.issues.forEach((x) => { if (st[x.id] !== "Rejected") issues.push({ pid: p.id, ...x }); });
    });
    return { pipe: Object.values(pipe).sort((a, b) => a.sys.localeCompare(b.sys) || b.lf - a.lf), parts: Object.values(parts).sort((a, b) => a.cat.localeCompare(b.cat) || a.type.localeCompare(b.type)), issues };
  }

  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(rows) { return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
  function takeoffCSV(ids) {
    const t = takeoff(ids);
    const rows = [["Section", "System", "Description", "Size", "Material", "Quantity", "Unit", "Photos", "Flag"]];
    t.pipe.forEach((r) => rows.push(["Pipe", r.sys + " — " + sysName(r.sys), "Pipe", r.size, r.mat, r.lf.toFixed(1), "LF", [...r.photos].join(" "), r.low ? "Verify (<70%)" : ""]));
    t.parts.forEach((r) => rows.push([r.cat, "", r.type, r.size, "", r.qty, "EA", [...r.photos].join(" "), r.low ? "Verify (<70%)" : ""]));
    return toCSV(rows);
  }
  function markupCSV(ids) {
    const rows = [["Photo", "Subject", "Label", "Layer", "Author", "Date", "Status", "Confidence", "System", "Comments"]];
    ids.map(photoById).forEach((p) => buildMarkups(p).forEach((m) => rows.push([p.id, m.subject, m.label, (FT.layers.find((l) => l.id === m.layer) || {}).name, m.author, m.date, m.status, pct(m.conf), m.sys || "", m.comment || m.note || ""])));
    return toCSV(rows);
  }

  window.FTCore = { FT, NS, esc, pct, sysColor, sysName, photoById, THRESH, ftin, dist, dist3, STATUSES, state, buildMarkups, el, ptsAttr,
    cloudPath, polyMid, polyBox, nearestOnPoly, runLengths, takeoff, takeoffCSV, markupCSV, toCSV, processedDate };
})();
