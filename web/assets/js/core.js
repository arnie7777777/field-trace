/* Field Trace — shared model + geometry + SVG helpers (used by the app and the print sheets). */
(function () {
  const FT = window.FT;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- small utils ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (c) => Math.round(c * 100) + "%";
  const sysColor = (k) => (FT.systems[k] || FT.systems.UNK).color;
  const sysName = (k) => (FT.systems[k] || FT.systems.UNK).name;
  const photoById = (id) => FT.photos.find((p) => p.id === id) || (FT.uploads || []).find((p) => p.id === id);
  const THRESH = 0.7;

  /* ---------- materials, OD, schedule (suggested), tags ---------- */
  const MAT_ORDER = ["CS", "SS", "CU", "GALV", "COMP", "UNK"];
  const matInfo = (k) => FT.materials[k] || FT.materials.UNK;
  const matShort = (r) => (r.material === "COMP" ? (r.matSub || "COMP") : matInfo(r.material).short);
  const matName = (r) => (r.material === "COMP" ? `Composite / plastic: ${r.matSub || "type not determined"}` : matInfo(r.material).name);
  const matColor = (k) => matInfo(k).color;
  const isLowMat = (r) => (r.matConf == null ? true : r.matConf < THRESH);
  const tagText = (r) => [r.sys && r.sys !== "UNK" ? r.sys : null, r.size && r.size !== "?" ? r.size : null, matShort(r) + (isLowMat(r) ? "?" : "")].filter(Boolean).join(" ");
  const runColor = (r) => (state.colorBy === "material" ? matColor(r.material) : sysColor(r.sys));
  const isoColor = (r) => (r.sys && r.sys !== "UNK" ? sysColor(r.sys) : matColor(r.material));
  const SCHED_FLAG = "suggested schedule — verify; wall is not visible from the photo";
  const schedText = (r) => (r.sched ? `${r.sched} (suggested — verify)` : "Not suggested (no basis)");
  const odText = (r) => r.od || (r.concealed ? "Hidden by insulation / jacket" : r.odClass && r.odClass !== "unknown" ? `${r.odClass} convention · needs a scale` : "Not measurable");
  const OD_STEEL = { "1/2": 0.84, "3/4": 1.05, "1": 1.315, "1-1/4": 1.66, "1-1/2": 1.9, "2": 2.375, "2-1/2": 2.875, "3": 3.5, "4": 4.5, "6": 6.625, "8": 8.625, "10": 10.75, "12": 12.75 };
  const nomVal = (n) => n.split("-").reduce((s, x) => s + (x.includes("/") ? +x.split("/")[0] / +x.split("/")[1] : +x), 0);
  function odFor(size, odClass) {
    const m = String(size || "").match(/^([\d\-\/]+)"/); if (!m) return null;
    if (/NPS/.test(odClass || "")) return OD_STEEL[m[1]] || null;
    if (/CTS/.test(odClass || "")) return Math.round((nomVal(m[1]) + 0.125) * 1000) / 1000;
    return null;
  }
  const SIZES = ["1/2\"", "3/4\"", "1\"", "1-1/4\"", "1-1/2\"", "2\"", "2-1/2\"", "3\"", "4\"", "6\"", "8\"", "10\"", "12\""];

  function ftin(feet) {
    let inches = Math.round(feet * 12);
    const f = Math.floor(inches / 12), i = inches - f * 12;
    return f > 0 ? `${f}'-${i}"` : `${i}"`;
  }
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dist3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  /* ---------- markup model (Revu-style subjects / status) ---------- */
  const STATUSES = ["None", "Accepted", "Rejected", "Cancelled", "Completed"];
  const state = { status: {}, comment: {}, hidden: {}, colorBy: "system", orig: {} };

  /* reviewer overrides (material / size / system). The original AI values are kept for Reset. */
  function override(p, r, patch) {
    const k = p.id + ":" + r.id;
    if (!state.orig[k]) state.orig[k] = { p, r, v: JSON.parse(JSON.stringify(r)) };
    Object.assign(r, patch, { edited: true });
  }
  function resetOverrides() { Object.values(state.orig).forEach((o) => { Object.keys(o.r).forEach((key) => delete o.r[key]); Object.assign(o.r, o.v); }); state.orig = {}; }
  const photoSrc = (p, thumb) => p.preview || ("assets/photos/" + (thumb ? p.file.replace(/\.jpg$/, "-thumb.jpg") : p.file));

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
      out.push(base({ id: r.id, kind: "run", subject: "Polyline", label: tagText(r), layer: "runs", conf: r.conf, sys: r.sys, src: r, material: r.material,
        detail: `${sysName(r.sys)} · ${r.size} · ${matName(r)} (suggested, ${pct(r.matConf || 0)}) · OD ${odText(r)} · ${schedText(r)}`, note: r.note }));
      out.push(base({ id: r.id + "-tag", kind: "tag", subject: "Pipe Tag", label: tagText(r), layer: "labels", conf: Math.min(r.conf, Math.max(r.matConf || 0, 0.5)), sys: r.sys, src: r, material: r.material,
        detail: `Tag for ${r.id}`, note: "Label per tool-chest standard: system + size + suggested material. '?' means the material is under 70% and needs a check." }));
    });
    p.items.forEach((it) => {
      out.push(base({ id: it.id, kind: it.kind === "instrument" ? "instrument" : "item", subject: it.type, label: it.tag || (it.size ? it.size + " " + it.type : it.type), layer: it.layer, conf: it.conf, sys: it.sys, src: it,
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
  /* Scale: the iso model if one was drafted; otherwise a reviewer-confirmed pipe size (p.cal) gives
   * inches-per-pixel from that run's apparent width (OD / width in px). Same-plane assumption, so ± noted. */
  function scaleOf(p) {
    if (p.iso) return { kind: "iso", text: p.scale };
    const c = p.cal; if (!c) return null;
    const r = p.runs.find((x) => x.id === c.run); if (!r || !r.wpx || !c.od) return null;
    return { kind: "cal", inPerPx: c.od / r.wpx, text: `${c.run} = ${c.size} (OD ${c.od}") · ${(r.wpx).toFixed(0)} px wide · rough same-plane estimate` };
  }
  function runLengths(p) {
    const L = {};
    if (p.iso) { p.iso.segs.forEach((s) => { L[s.run] = (L[s.run] || 0) + dist3(s.a, s.b); }); return L; }
    const sc = scaleOf(p); if (!sc) return L;
    p.runs.forEach((r) => { let px = 0; for (let i = 1; i < r.pts.length; i++) px += dist(r.pts[i - 1], r.pts[i]); L[r.id] = (px * sc.inPerPx) / 12; });
    return L;
  }
  function itemCat(it) {
    if (it.layer === "supports") return "Hangers, supports & penetrations";
    if (it.layer === "fittings") return "Fittings";
    if (it.kind === "instrument") return "Instruments";
    if (it.kind === "equipment" || /pump|exchanger|equipment/i.test(it.type)) return "Equipment";
    return "Valves";
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
        const k = [r.material, r.matSub || "", r.sys, r.size].join("|");
        pipe[k] = pipe[k] || { material: r.material, matSub: r.matSub || "", matLabel: matName(r), short: matShort(r), sys: r.sys, size: r.size, od: r.od || "", odClass: r.odClass || "", sched: r.sched || "", mat: r.mat, lf: 0, unmeasured: 0, photos: new Set(), low: false, lowMat: false };
        if (lens[r.id] != null) pipe[k].lf += lens[r.id]; else pipe[k].unmeasured += 1;
        pipe[k].photos.add(p.id); if (r.conf < THRESH) pipe[k].low = true; if (isLowMat(r)) pipe[k].lowMat = true;
      });
      p.items.forEach((it) => {
        if (st[it.id] === "Rejected" || it.layer === "labels") return;
        if (opts.acceptedOnly && st[it.id] !== "Accepted") return;
        const cat = itemCat(it);
        const detail = cat === "Valves" ? [it.operator, it.family && it.family !== "unknown" ? it.family : it.operator ? "family not asserted" : ""].filter(Boolean).join(" · ") : cat === "Instruments" ? ((FT.instruments[it.inst] || {}).name || "Type") + " · model / range not read" : "";
        const k = [cat, it.type, it.size, detail].join("|");
        parts[k] = parts[k] || { cat, type: it.type, size: it.size || "—", detail, qty: 0, photos: new Set(), low: false };
        parts[k].qty += 1; parts[k].photos.add(p.id); if (it.conf < THRESH) parts[k].low = true;
      });
      p.issues.forEach((x) => { if (st[x.id] !== "Rejected") issues.push({ pid: p.id, ...x }); });
    });
    const CAT = ["Valves", "Instruments", "Equipment", "Fittings", "Hangers, supports & penetrations"];
    const pipeRows = Object.values(pipe).sort((a, b) => MAT_ORDER.indexOf(a.material) - MAT_ORDER.indexOf(b.material) || a.sys.localeCompare(b.sys) || b.lf - a.lf);
    const byMat = {}; pipeRows.forEach((r) => { const m = byMat[r.material] = byMat[r.material] || { material: r.material, lf: 0, runs: 0, unmeasured: 0 }; m.lf += r.lf; m.unmeasured += r.unmeasured; });
    return { pipe: pipeRows, byMat: MAT_ORDER.filter((k) => byMat[k]).map((k) => byMat[k]), parts: Object.values(parts).sort((a, b) => CAT.indexOf(a.cat) - CAT.indexOf(b.cat) || a.type.localeCompare(b.type)), issues };
  }

  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(rows) { return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
  function takeoffCSV(ids) {
    const t = takeoff(ids);
    const rows = [["Section", "Material (suggested)", "System", "Description", "Nominal size", "OD", "Suggested schedule / wall (verify)", "Quantity", "Unit", "Photos", "Flag"]];
    t.pipe.forEach((r) => rows.push(["Pipe", r.matLabel, r.sys + " — " + sysName(r.sys), r.mat, r.size, r.od || r.odClass, r.sched ? r.sched + " (suggested)" : "", r.lf.toFixed(1), "LF", [...r.photos].join(" "),
      [r.low ? "Verify trace (<70%)" : "", r.lowMat ? "Verify material" : "", r.unmeasured ? `${r.unmeasured} run(s) not measured: set scale` : ""].filter(Boolean).join("; ")]));
    t.parts.forEach((r) => rows.push([r.cat, "", "", r.type + (r.detail ? " — " + r.detail : ""), r.size, "", "", r.qty, "EA", [...r.photos].join(" "), r.low ? "Verify (<70%)" : ""]));
    rows.push([]);
    rows.push(["Note", "Materials are suggested from visible cues and printed text. Wall thickness is not visible in a photo: schedules are suggestions to verify. Pressure / temperature rating and remaining corrosion allowance depend on the wall and must be verified."]);
    return toCSV(rows);
  }
  function markupCSV(ids) {
    const rows = [["Photo", "Subject", "Label", "Layer", "Author", "Date", "Status", "Confidence", "System", "Material (suggested)", "Comments"]];
    ids.map(photoById).forEach((p) => buildMarkups(p).forEach((m) => rows.push([p.id, m.subject, m.label, (FT.layers.find((l) => l.id === m.layer) || {}).name, m.author, m.date, m.status, pct(m.conf), m.sys || "", m.kind === "run" ? matName(m.src) : "", m.comment || m.note || ""])));
    return toCSV(rows);
  }

  /* normalise prepared data: OD from nominal size + convention; the schedule lives in r.sched (suggested), not in the description */
  function normaliseRun(r) {
    r.material = r.material || "UNK"; if (r.matConf == null) r.matConf = 0.3; r.matCues = r.matCues || []; r.matAlt = r.matAlt || [];
    if (!r.od && !r.concealed) { const v = odFor(r.size, r.odClass); if (v) r.od = v + '"' + (String(r.size).includes("?") ? "?" : ""); }
    if (r.mat) r.mat = r.mat.replace(/^(Sch \d+S?|Type [KLM]) /, "");
  }
  FT.photos.forEach((p) => p.runs.forEach(normaliseRun));

  window.FTCore = { FT, NS, esc, pct, sysColor, sysName, photoById, THRESH, ftin, dist, dist3, STATUSES, state, buildMarkups, el, ptsAttr,
    cloudPath, polyMid, polyBox, nearestOnPoly, runLengths, scaleOf, takeoff, takeoffCSV, markupCSV, toCSV, processedDate,
    MAT_ORDER, matInfo, matShort, matName, matColor, isLowMat, tagText, runColor, isoColor, SCHED_FLAG, schedText, odText, OD_STEEL, odFor, SIZES, itemCat, override, resetOverrides, photoSrc, normaliseRun };
})();
