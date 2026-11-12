/* Field Trace — photo markup overlay (Revu-style markups drawn on the real photo geometry). */
(function () {
  const C = window.FTCore;
  const LAYER_COLOR = { fittings: "#ffffff", valves: "#ffb020", supports: "#8fd3ff", dims: "#3fd0ff", issues: "#ff3b30" };

  function textW(s, fs, bold) { return String(s).length * fs * (bold ? 0.56 : 0.52); }
  function wrap(s, n) { const w = String(s).split(" "); const lines = []; let cur = ""; w.forEach((x) => { if ((cur + " " + x).trim().length > n) { lines.push(cur.trim()); cur = x; } else cur += " " + x; }); if (cur.trim()) lines.push(cur.trim()); return lines; }

  function arrowHead(g, from, to, size, color) {
    const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
    const p1 = [to[0] - size * Math.cos(a - 0.38), to[1] - size * Math.sin(a - 0.38)];
    const p2 = [to[0] - size * Math.cos(a + 0.38), to[1] - size * Math.sin(a + 0.38)];
    C.el("polygon", { points: C.ptsAttr([to, p1, p2]), fill: color }, g);
  }
  function boxEdgePoint(bx, target) { // nearest point on box edge toward target
    const [x, y, w, h] = bx; const cx = Math.max(x, Math.min(target[0], x + w)), cy = Math.max(y, Math.min(target[1], y + h));
    if (cx > x && cx < x + w && cy > y && cy < y + h) return [x + w / 2, y + h / 2];
    return [cx, cy];
  }

  /* Draw a text box callout with leader + arrow. lines: [{t, bold, color}] */
  function callout(g, at, lbl, lines, opt) {
    const fs = opt.fs, pad = fs * 0.5, lh = fs * 1.22;
    const w = Math.max(...lines.map((l) => textW(l.t, l.small ? fs * 0.8 : fs, l.bold))) + pad * 2;
    const h = lines.reduce((s, l) => s + (l.small ? lh * 0.82 : lh), 0) + pad * 1.1;
    let x = lbl[0], y = lbl[1];
    x = Math.max(4, Math.min(x, opt.W - w - 4)); y = Math.max(4, Math.min(y, opt.H - h - 4));
    [x, y] = place(opt.placed, x, y, w, h, opt.W, opt.H);
    const bx = [x, y, w, h];
    const e = boxEdgePoint(bx, at);
    C.el("line", { x1: e[0], y1: e[1], x2: at[0], y2: at[1], stroke: "rgba(0,0,0,.55)", "stroke-width": opt.lw * 2.6, "stroke-linecap": "round" }, g);
    C.el("line", { x1: e[0], y1: e[1], x2: at[0], y2: at[1], stroke: opt.color, "stroke-width": opt.lw, class: "ft-leader" }, g);
    arrowHead(g, e, at, fs * 0.75, opt.color);
    C.el("rect", { x, y, width: w, height: h, rx: fs * 0.14, fill: opt.fill || "rgba(255,255,255,.95)", stroke: opt.color, "stroke-width": opt.lw * 1.1, class: "ft-box" }, g);
    let ty = y + pad * 0.55;
    lines.forEach((l) => {
      const f = l.small ? fs * 0.8 : fs; ty += (l.small ? lh * 0.82 : lh);
      const t = C.el("text", { x: x + pad, y: ty - lh * 0.28, "font-size": f, "font-weight": l.bold ? 700 : 500, fill: l.color || "#111a22", class: l.mono ? "mono" : "" }, g);
      t.textContent = l.t;
    });
    return bx;
  }

  /* greedy collision avoidance so callouts never stack on each other */
  function place(placed, x, y, w, h, W, H) {
    if (!placed) return [x, y];
    const hit = (X, Y) => placed.some((b) => X < b[0] + b[2] + 6 && X + w + 6 > b[0] && Y < b[1] + b[3] + 6 && Y + h + 6 > b[1]);
    let bx = x, by = y;
    if (hit(x, y)) {
      const step = h * 0.55; let found = false;
      for (let i = 1; i < 40 && !found; i++) {
        for (const sg of [1, -1]) {
          const Y = Math.max(4, Math.min(y + sg * Math.ceil(i / 1) * step, H - h - 4));
          if (!hit(x, Y)) { by = Y; found = true; break; }
          const X = Math.max(4, Math.min(x - sg * i * step * 1.4, W - w - 4));
          if (!hit(X, y)) { bx = X; found = true; break; }
        }
      }
    }
    placed.push([bx, by, w, h]);
    return [bx, by];
  }

  function render(svg, p, opts) {
    opts = opts || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${p.w} ${p.h}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const base = Math.max(p.w, p.h) / 1600;
    const u = opts.screenScale ? Math.max(base, (opts.minFont || 10.5) / (21 * opts.screenScale)) : base;
    const fs = 21 * u, lw = 2.4 * u; const placed = []; const compact = u > base * 1.15;
    const ms = opts.markups || C.buildMarkups(p);
    const byId = {}; ms.forEach((m) => (byId[m.id] = m));
    const vis = opts.layers || {};
    const show = (m) => m && !m.hidden && vis[m.layer] !== false && !(opts.only && !opts.only.includes(m.layer));
    const root = C.el("g", { class: "ft-overlay" + (opts.animate ? " ft-animate" : "") }, svg);
    const layerG = {};
    ["issues", "supports", "runs", "dims", "fittings", "valves", "labels"].forEach((l) => (layerG[l] = C.el("g", { class: "ft-layer", "data-layer": l }, root)));

    function group(m) {
      const g = C.el("g", { class: "ft-mk" + (m.key === opts.selected ? " is-sel" : "") + (m.status === "Rejected" ? " is-rej" : "") + (m.conf < C.THRESH ? " is-low" : "") + (opts.hot && opts.hot === m.id ? " is-hot" : ""), "data-key": m.key, "data-id": m.id }, layerG[m.layer] || root);
      if (opts.onSelect) g.addEventListener("click", (e) => { e.stopPropagation(); opts.onSelect(m.key); });
      if (opts.onHover) { g.addEventListener("mouseenter", () => opts.onHover(m.id)); g.addEventListener("mouseleave", () => opts.onHover(null)); }
      return g;
    }

    /* pipe runs */
    p.runs.forEach((r, i) => {
      const m = byId[r.id]; if (!show(m)) return;
      const g = group(m); const col = (opts.colorBy || C.state.colorBy) === "material" ? C.matColor(r.material) : C.sysColor(r.sys); const low = r.conf < C.THRESH;
      C.el("polyline", { points: C.ptsAttr(r.pts), fill: "none", stroke: "transparent", "stroke-width": 40 * u, class: "ft-hit" }, g);
      C.el("polyline", { points: C.ptsAttr(r.pts), fill: "none", stroke: "rgba(5,10,14,.55)", "stroke-width": 11 * u, "stroke-linejoin": "round", "stroke-linecap": "round", class: "ft-case" }, g);
      const line = C.el("polyline", { points: C.ptsAttr(r.pts), fill: "none", stroke: col, "stroke-width": 6.5 * u, "stroke-linejoin": "round", "stroke-linecap": "round", class: "ft-run" + (low ? " low" : ""), pathLength: low ? null : 1, style: `--d:${i * 0.18}s`, "stroke-dasharray": low ? `${18 * u} ${12 * u}` : null }, g);
      // flow arrows
      if (r.flow) {
        const mid = C.polyMid(r.pts); const a = r.flow > 0 ? mid[2] : mid[2] + Math.PI; const s = 16 * u;
        const tip = [mid[0] + Math.cos(a) * s, mid[1] + Math.sin(a) * s];
        const b1 = [mid[0] - Math.cos(a) * s + Math.cos(a + Math.PI / 2) * s * 0.8, mid[1] - Math.sin(a) * s + Math.sin(a + Math.PI / 2) * s * 0.8];
        const b2 = [mid[0] - Math.cos(a) * s - Math.cos(a + Math.PI / 2) * s * 0.8, mid[1] - Math.sin(a) * s - Math.sin(a + Math.PI / 2) * s * 0.8];
        C.el("polygon", { points: C.ptsAttr([tip, b1, b2]), fill: col, stroke: "rgba(5,10,14,.7)", "stroke-width": 2 * u, class: "ft-flow" }, g);
      }
      if (m.key === opts.selected) r.pts.forEach((pt) => C.el("rect", { x: pt[0] - 7 * u, y: pt[1] - 7 * u, width: 14 * u, height: 14 * u, fill: "#fff", stroke: "#0a84ff", "stroke-width": 2.5 * u, class: "ft-handle" }, g));
      if (low) { const mid = C.polyMid(r.pts); qBadge(g, [mid[0] + 22 * u, mid[1] - 22 * u], u); }
      // tag
      const tm = byId[r.id + "-tag"];
      if (show(tm)) {
        const tg = group(tm); const at = C.nearestOnPoly(r.pts, r.lbl);
        const lowT = low || C.isLowMat(r); const txt = C.tagText(r).replace(/\?$/, ""); const w = textW(txt + (lowT ? " ?" : ""), fs, true) + fs * 0.9, h = fs * 1.45;
        let x = Math.max(4, Math.min(r.lbl[0], p.w - w - 4)), y = Math.max(4, Math.min(r.lbl[1], p.h - h - 4));
        [x, y] = place(placed, x, y, w, h, p.w, p.h);
        const e = boxEdgePoint([x, y, w, h], at);
        C.el("line", { x1: e[0], y1: e[1], x2: at[0], y2: at[1], stroke: "rgba(0,0,0,.5)", "stroke-width": lw * 2.4 }, tg);
        C.el("line", { x1: e[0], y1: e[1], x2: at[0], y2: at[1], stroke: col, "stroke-width": lw }, tg);
        C.el("circle", { cx: at[0], cy: at[1], r: 5 * u, fill: col, stroke: "#0b1014", "stroke-width": 1.5 * u }, tg);
        C.el("rect", { x, y, width: w, height: h, rx: h / 2, fill: col, stroke: "rgba(5,10,14,.75)", "stroke-width": 1.5 * u, "stroke-dasharray": lowT ? `${6 * u} ${4 * u}` : null }, tg);
        const t = C.el("text", { x: x + w / 2, y: y + h * 0.7, "font-size": fs, "font-weight": 700, fill: "#0b1014", "text-anchor": "middle", class: "cond" }, tg); t.textContent = txt + (lowT ? " ?" : "");
      }
    });

    /* supports with line geometry (strut, posts) */
    p.items.filter((it) => it.line).forEach((it) => {
      const m = byId[it.id]; if (!show(m)) return; const g = group(m);
      C.el("polyline", { points: C.ptsAttr(it.line), fill: "none", stroke: "transparent", "stroke-width": 30 * u }, g);
      C.el("polyline", { points: C.ptsAttr(it.line), fill: "none", stroke: LAYER_COLOR.supports, "stroke-width": 3 * u, "stroke-dasharray": `${14 * u} ${8 * u}`, opacity: 0.9 }, g);
    });

    /* items: marker + optional callout */
    p.items.forEach((it) => {
      const m = byId[it.id]; if (!show(m)) return; const g = group(m);
      const col = LAYER_COLOR[it.layer] || "#fff"; const low = it.conf < C.THRESH;
      if (it.box) C.el("rect", { x: it.box[0], y: it.box[1], width: it.box[2] - it.box[0], height: it.box[3] - it.box[1], fill: "rgba(255,176,32,.06)", stroke: col, "stroke-width": 3 * u, "stroke-dasharray": `${10 * u} ${6 * u}` }, g);
      const [x, y] = it.at; const s = 11 * u;
      C.el("circle", { cx: x, cy: y, r: 22 * u, fill: "transparent", class: "ft-hit" }, g);
      if (it.kind === "instrument") {
        C.el("circle", { cx: x, cy: y, r: s * 1.15, fill: "#fff", stroke: "#0b1014", "stroke-width": 2.2 * u }, g);
        C.el("line", { x1: x - s * 1.15, y1: y, x2: x + s * 1.15, y2: y, stroke: "#0b1014", "stroke-width": 1.2 * u }, g);
        const lt = C.el("text", { x, y: y - s * 0.12, "font-size": s * 0.95, "font-weight": 800, fill: "#0b1014", "text-anchor": "middle" }, g); lt.textContent = ((C.FT.instruments[it.inst] || {}).letter || "?") + "I";
      } else if (it.layer === "valves") C.el("path", { d: `M${x - s},${y - s * 0.75} L${x + s},${y + s * 0.75} L${x + s},${y - s * 0.75} L${x - s},${y + s * 0.75} Z`, fill: col, stroke: "#0b1014", "stroke-width": 2 * u }, g);
      else if (it.layer === "fittings") C.el("rect", { x: x - s * 0.8, y: y - s * 0.8, width: s * 1.6, height: s * 1.6, transform: `rotate(45 ${x} ${y})`, fill: "#fff", stroke: "#0b1014", "stroke-width": 2.2 * u }, g);
      else C.el("circle", { cx: x, cy: y, r: s * 0.85, fill: col, stroke: "#0b1014", "stroke-width": 2 * u }, g);
      if (low) qBadge(g, [x + 16 * u, y - 16 * u], u);
      if (!it.noCallout) {
        const sub = it.kind === "instrument" ? (it.tag ? it.type : "Model / range not read") : it.family ? (it.family === "unknown" ? "Family not asserted" : it.family.replace(/ \(.*/, "") + " family") : it.tag ? `${it.size ? it.size + " " : ""}${it.type}` : it.size || C.sysName(it.sys);
        const lines = [{ t: it.tag || it.type, bold: true }, { t: sub, small: true, color: "#3a4752" }];
        if (low) lines.push({ t: `AI unsure (${C.pct(it.conf)}) — verify`, small: true, color: "#b4231a", bold: true });
        callout(g, [x, y], it.lbl, lines, { fs, lw, color: it.layer === "fittings" ? "#2b3a46" : col === "#ffffff" ? "#2b3a46" : col, W: p.w, H: p.h, placed });
      }
      if (m.key === opts.selected) C.el("circle", { cx: x, cy: y, r: 20 * u, fill: "none", stroke: "#0a84ff", "stroke-width": 3 * u }, g);
    });

    /* dimensions */
    p.dims.forEach((d) => {
      const m = byId[d.id]; if (!show(m)) return; const g = group(m); const col = LAYER_COLOR.dims;
      const ang = Math.atan2(d.b[1] - d.a[1], d.b[0] - d.a[0]); const nx = -Math.sin(ang), ny = Math.cos(ang);
      const A = [d.a[0] + nx * d.off, d.a[1] + ny * d.off], B = [d.b[0] + nx * d.off, d.b[1] + ny * d.off];
      const ext = d.ext || [d.a, d.b];
      [[ext[0], A], [ext[1], B]].forEach(([from, to]) => {
        const ex = [to[0] + (to[0] - from[0]) / (C.dist(from, to) || 1) * 10 * u, to[1] + (to[1] - from[1]) / (C.dist(from, to) || 1) * 10 * u];
        if (C.dist(from, to) > 2) C.el("line", { x1: from[0], y1: from[1], x2: ex[0], y2: ex[1], stroke: col, "stroke-width": 1.6 * u, opacity: 0.85 }, g);
      });
      C.el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: "transparent", "stroke-width": 30 * u }, g);
      C.el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: "rgba(0,0,0,.55)", "stroke-width": 5 * u }, g);
      C.el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: col, "stroke-width": 2.2 * u, "stroke-dasharray": d.conf < C.THRESH ? `${10 * u} ${6 * u}` : null }, g);
      arrowHead(g, B, A, 16 * u, col); arrowHead(g, A, B, 16 * u, col);
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; let deg = ang * 180 / Math.PI; if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
      const tw = textW(d.text, fs, true) + fs * 0.8;
      const tg = C.el("g", { transform: `translate(${mx},${my}) rotate(${deg})` }, g);
      C.el("rect", { x: -tw / 2, y: -fs * 0.78, width: tw, height: fs * 1.4, rx: 3 * u, fill: "#081118", stroke: col, "stroke-width": 1.4 * u }, tg);
      const t = C.el("text", { x: 0, y: fs * 0.36, "font-size": fs, "font-weight": 600, fill: col, "text-anchor": "middle", class: "mono" }, tg); t.textContent = d.text;
    });

    /* issues: Cloud+ */
    p.issues.forEach((x) => {
      const m = byId[x.id]; if (!show(m)) return; const g = group(m); const col = LAYER_COLOR.issues;
      const d = C.cloudPath(x.poly, 16 * u);
      C.el("path", { d, fill: "rgba(255,59,48,.07)", stroke: "rgba(0,0,0,.45)", "stroke-width": 7 * u }, g);
      C.el("path", { d, fill: "rgba(255,59,48,.07)", stroke: col, "stroke-width": 3.6 * u, class: "ft-cloud" }, g);
      const bb = C.polyBox(x.poly); const lines = [{ t: `${x.title}`, bold: true, color: "#9c1710" }].concat(compact ? [{ t: `${x.sev} priority · ${C.pct(x.conf)}`, small: true, color: "#555" }] : wrap(x.text, 34).slice(0, 3).map((t) => ({ t, small: true, color: "#222" })));
      const target = [Math.max(bb[0], Math.min(x.lbl[0], bb[2])), Math.max(bb[1], Math.min(x.lbl[1], bb[3]))];
      callout(g, target, x.lbl, lines, { fs: fs * 0.92, lw, color: col, W: p.w, H: p.h, fill: "rgba(255,247,246,.96)", placed });
      if (m.key === opts.selected) { C.el("rect", { x: bb[0] - 12 * u, y: bb[1] - 12 * u, width: bb[2] - bb[0] + 24 * u, height: bb[3] - bb[1] + 24 * u, fill: "none", stroke: "#0a84ff", "stroke-width": 2.5 * u, "stroke-dasharray": `${8 * u} ${5 * u}` }, g); }
    });

    /* stamp */
    const sm = byId.STAMP;
    if (p.stamp && show(sm)) {
      const g = group(sm); const [x, y] = p.stamp; const w = 330 * u, h = 112 * u; const rev = p.status === "reviewed";
      const col = rev ? "#1f9d55" : "#d7263d";
      C.el("rect", { x, y, width: w, height: h, rx: 8 * u, fill: "rgba(255,255,255,.88)", stroke: col, "stroke-width": 4 * u }, g);
      C.el("rect", { x: x + 7 * u, y: y + 7 * u, width: w - 14 * u, height: h - 14 * u, rx: 5 * u, fill: "none", stroke: col, "stroke-width": 1.6 * u }, g);
      const t1 = C.el("text", { x: x + w / 2, y: y + 50 * u, "font-size": 42 * u, "font-weight": 800, fill: col, "text-anchor": "middle", "letter-spacing": 4 * u, class: "cond" }, g); t1.textContent = "AS-BUILT";
      const t2 = C.el("text", { x: x + w / 2, y: y + 76 * u, "font-size": 15 * u, "font-weight": 700, fill: col, "text-anchor": "middle", "letter-spacing": 1.5 * u, class: "cond" }, g); t2.textContent = rev ? "REVIEWED · ACCEPTED" : "FIELD TRACE · AI FIRST PASS";
      const t3 = C.el("text", { x: x + w / 2, y: y + 97 * u, "font-size": 14 * u, fill: col, "text-anchor": "middle", class: "mono" }, g); t3.textContent = `${p.id} · ${p.taken.slice(0, 10)}`;
    }
    return { u };
  }

  function qBadge(g, at, u) {
    C.el("circle", { cx: at[0], cy: at[1], r: 13 * u, fill: "#ffb020", stroke: "#0b1014", "stroke-width": 2 * u }, g);
    const t = C.el("text", { x: at[0], y: at[1] + 6 * u, "font-size": 17 * u, "font-weight": 800, fill: "#0b1014", "text-anchor": "middle" }, g); t.textContent = "?";
  }

  window.FTOverlay = { render };
})();
