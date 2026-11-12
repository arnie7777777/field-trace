/* Field Trace — as-built isometric generated from the traced photo model.
 * render(svg, p)            → full drawing sheet (border, drawing, notes, legend, title block)
 * render(svg, p, {bare})    → drawing field only (the printed PDF sheet carries its own title block) */
(function () {
  const C = window.FTCore;
  const el = C.el;
  const INK = "#14202b", PAPER = "#f6f3ec";
  const W = 1100, H = 712;
  const c30 = Math.cos(Math.PI / 6), s30 = Math.sin(Math.PI / 6);
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

  /* ---------- text + symbol helpers ---------- */
  function txt(parent, x, y, s, size, o) {
    o = o || {};
    if (o.bg) { const w = String(s).length * size * 0.52 + 8; el("rect", { x: o.anchor === "middle" ? x - w / 2 : x - 4, y: y - size * 0.95, width: w, height: size * 1.35, fill: o.bgFill || PAPER, stroke: INK, "stroke-width": 0.8 }, parent); }
    const t = el("text", { x, y, "font-size": size, fill: o.fill || INK, "font-weight": o.weight || 500, "text-anchor": o.anchor || "start", class: o.cls || "", "letter-spacing": o.ls || null, transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null }, parent);
    t.textContent = s; return t;
  }
  function bowtie(g, Q, d, n, a, b, fill) {
    [1, -1].forEach((sg) => el("polygon", { points: C.ptsAttr([Q, [Q[0] + sg * d[0] * a + n[0] * b, Q[1] + sg * d[1] * a + n[1] * b], [Q[0] + sg * d[0] * a - n[0] * b, Q[1] + sg * d[1] * a - n[1] * b]]), fill: fill || PAPER, stroke: INK, "stroke-width": 1.3, "stroke-linejoin": "round" }, g));
  }
  function tag(g, at, s, conf, fill) {
    if (!s) return; const w = s.length * 5.4 + 10;
    el("rect", { x: at[0], y: at[1] - 8, width: w, height: 13, rx: 6.5, fill: fill || PAPER, stroke: INK, "stroke-width": 0.9, "stroke-dasharray": conf < C.THRESH ? "3 2" : null }, g);
    txt(g, at[0] + w / 2, at[1] + 1.8, s, 7.6, { anchor: "middle", weight: 700, fill: INK, cls: "mono" });
  }
  function wrapLines(s, nmax) { const w = String(s).split(" "); const out = []; let cur = ""; w.forEach((x) => { if ((cur + " " + x).trim().length > nmax) { out.push(cur.trim()); cur = x; } else cur += " " + x; }); if (cur.trim()) out.push(cur.trim()); return out; }

  /* ---------- the drawing itself (shared by both modes) ---------- */
  function drawField(root, p, opts, area, paper) {
    const proj0 = (q) => [(q[0] - q[1]) * c30, (q[0] + q[1]) * s30 - q[2]];
    const pts = [];
    p.iso.segs.forEach((s) => pts.push(proj0(s.a), proj0(s.b)));
    p.iso.syms.forEach((s) => { if (s.at) pts.push(proj0(s.at)); if (s.a) pts.push(proj0(s.a), proj0(s.b)); if (s.t === "hx") pts.push(proj0([s.at[0] + s.size[0], s.at[1] + s.size[1], s.at[2] + s.size[2]])); });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const bx = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const k = Math.min((area[2] - area[0]) / (bx[2] - bx[0] || 1), (area[3] - area[1]) / (bx[3] - bx[1] || 1), 120);
    const ox = (area[0] + area[2]) / 2 - ((bx[0] + bx[2]) / 2) * k, oy = (area[1] + area[3]) / 2 - ((bx[1] + bx[3]) / 2) * k;
    const P = (q) => { const r = proj0(q); return [ox + r[0] * k, oy + r[1] * k]; };
    const dirOf = (axis) => { const a = P([0, 0, 0]), b = P(AX[axis]); const L = C.dist(a, b); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
    const norm = (d) => [-d[1], d[0]];
    const runsById = {}; p.runs.forEach((r) => (runsById[r.id] = r));
    const itemsById = {}; p.items.forEach((it) => (itemsById[it.id] = it));

    const eqG = el("g", { class: "iso-eqs" }, root);
    const draw = el("g", { class: "iso-draw" }, root);
    const symG = el("g", { class: "iso-syms" }, root);

    /* pipe segments */
    const longest = {}, joints = {};
    p.iso.segs.forEach((s, i) => { const L = C.dist3(s.a, s.b); if (!longest[s.run] || L > longest[s.run].L) longest[s.run] = { i, L }; });
    p.iso.segs.forEach((s, i) => {
      const r = runsById[s.run]; const col = C.isoColor(r); const low = r.conf < C.THRESH;
      const A = P(s.a), B = P(s.b);
      const g = el("g", { class: "iso-run" + (opts.hot === s.run ? " is-hot" : ""), "data-run": s.run }, draw);
      if (opts.onHover) { g.addEventListener("mouseenter", () => opts.onHover(s.run)); g.addEventListener("mouseleave", () => opts.onHover(null)); }
      el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: "transparent", "stroke-width": 16 }, g);
      el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: col, "stroke-width": 7, "stroke-linecap": "round", opacity: 0.32, class: "iso-halo" }, g);
      el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: INK, "stroke-width": 2.4, "stroke-linecap": "round", "stroke-dasharray": low ? "9 5" : null }, g);
      [s.a, s.b].forEach((q) => { const kk = s.run + q.join(","); joints[kk] = (joints[kk] || 0) + 1; });
      const d = [(B[0] - A[0]) / (C.dist(A, B) || 1), (B[1] - A[1]) / (C.dist(A, B) || 1)];
      let n = norm(d); if (n[1] > 0.01 || (Math.abs(n[1]) < 0.01 && n[0] > 0)) n = [-n[0], -n[1]];
      const brk = s.brk === "both" ? ["a", "b"] : s.brk ? [s.brk] : [];
      brk.forEach((w) => breakSym(g, w === "a" ? A : B, d, n, w === "a" ? -1 : 1));
      if (s.flow) {
        const t = 0.62; const M = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; const dd = s.flow > 0 ? d : [-d[0], -d[1]]; const nn = norm(dd);
        el("polygon", { points: C.ptsAttr([[M[0] + dd[0] * 9, M[1] + dd[1] * 9], [M[0] - dd[0] * 6 + nn[0] * 5, M[1] - dd[1] * 6 + nn[1] * 5], [M[0] - dd[0] * 6 - nn[0] * 5, M[1] - dd[1] * 6 - nn[1] * 5]]), fill: INK }, g);
      }
      if (s.dim) dimension(g, A, B, d, n, C.ftin(C.dist3(s.a, s.b)));
      if (longest[s.run].i === i) {
        const lab = `${C.tagText(r)}${low ? " (VERIFY)" : ""}`;
        // label sits on the side opposite the dimension string
        const L2 = [(A[0] + B[0]) / 2 - n[0] * 12, (A[1] + B[1]) / 2 - n[1] * 12];
        let deg = Math.atan2(d[1], d[0]) * 180 / Math.PI; if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
        txt(g, L2[0], L2[1], lab, 10.5, { anchor: "middle", weight: 700, rot: deg, fill: INK, cls: "cond" });
      }
    });
    p.iso.segs.forEach((s) => [s.a, s.b].forEach((q) => { if (joints[s.run + q.join(",")] > 1) { const Q = P(q); el("circle", { cx: Q[0], cy: Q[1], r: 2.8, fill: INK }, draw); } }));

    /* symbols */
    p.iso.syms.forEach((s) => {
      const it = s.item ? itemsById[s.item] : null;
      if (s.t === "strut") { const A = P(s.a), B = P(s.b); el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: INK, "stroke-width": 1.1, "stroke-dasharray": "10 3 2 3" }, eqG); txt(eqG, B[0] + 6, B[1] + 3, "STRUT (WALL)", 8, { fill: INK, cls: "cond" }); return; }
      const Q = P(s.at); const d = s.dir ? dirOf(s.dir) : [1, 0]; const n = norm(d);
      if (s.t === "gate" || s.t === "butterfly") {
        bowtie(symG, Q, d, n, 7.5, 5.5, paper);
        if (s.t === "butterfly") el("line", { x1: Q[0] + n[0] * 6, y1: Q[1] + n[1] * 6, x2: Q[0] - n[0] * 6, y2: Q[1] - n[1] * 6, stroke: INK, "stroke-width": 1.6 }, symG);
        const sd = n[0] >= 0 ? n : [-n[0], -n[1]];
        const S = [Q[0] + sd[0] * 13, Q[1] + sd[1] * 13];
        el("line", { x1: Q[0], y1: Q[1], x2: S[0], y2: S[1], stroke: INK, "stroke-width": 1.3 }, symG);
        el("line", { x1: S[0] - d[0] * 6, y1: S[1] - d[1] * 6, x2: S[0] + d[0] * 6, y2: S[1] + d[1] * 6, stroke: INK, "stroke-width": 2 }, symG);
        if (it) tag(symG, [S[0] + 8, S[1] + 4], it.tag, it.conf, paper);
      } else if (s.t === "flange" || s.t === "coupling") {
        const L = s.t === "flange" ? 7 : 5;
        [-2.2, 2.2].forEach((o) => el("line", { x1: Q[0] + d[0] * o + n[0] * L, y1: Q[1] + d[1] * o + n[1] * L, x2: Q[0] + d[0] * o - n[0] * L, y2: Q[1] + d[1] * o - n[1] * L, stroke: INK, "stroke-width": s.t === "flange" ? 1.8 : 1.2 }, symG));
      } else if (s.t === "ti") {
        const O = [Q[0] - 22, Q[1] - 8];
        el("line", { x1: Q[0], y1: Q[1], x2: O[0] + 7, y2: O[1] + 2, stroke: INK, "stroke-width": 0.9 }, symG);
        el("circle", { cx: O[0], cy: O[1], r: 8, fill: paper, stroke: INK, "stroke-width": 1.1 }, symG);
        txt(symG, O[0], O[1] + 2.8, "TI", 7.5, { anchor: "middle", weight: 700, fill: INK });
        el("circle", { cx: Q[0], cy: Q[1], r: 2, fill: INK }, symG);
      } else if (s.t === "hx") {
        const [x0, y0, z0] = s.at, [dx, dy, dz] = s.size;
        const v = (a, b, c) => P([x0 + a * dx, y0 + b * dy, z0 + c * dz]);
        const front = [v(0, 1, 0), v(1, 1, 0), v(1, 1, 1), v(0, 1, 1)], top = [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)], side = [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)];
        [[front, "#e9eef2"], [top, "#f7f9fa"], [side, "#dde4ea"]].forEach(([f, fill]) => el("polygon", { points: C.ptsAttr(f), fill, stroke: INK, "stroke-width": 1.4 }, eqG));
        for (let i = 1; i < 9; i++) { const a = i / 9; const p1 = v(a, 1, 0.06), p2 = v(a, 1, 0.94); el("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: INK, "stroke-width": 0.5, opacity: 0.6 }, eqG); }
        const L = v(0.5, 1, 0.3); txt(symG, L[0], L[1] + 4, s.label || "EQ", 12, { anchor: "middle", weight: 700, fill: INK, cls: "cond", bg: true, bgFill: paper });
      } else if (s.t === "pump") {
        el("circle", { cx: Q[0], cy: Q[1], r: 16, fill: "#e9eef2", stroke: INK, "stroke-width": 1.6 }, eqG);
        el("line", { x1: Q[0], y1: Q[1] - 16, x2: Q[0] + 16, y2: Q[1] - 16, stroke: INK, "stroke-width": 1.6 }, eqG);
        el("polygon", { points: C.ptsAttr([[Q[0] - 10, Q[1] + 16], [Q[0] + 10, Q[1] + 16], [Q[0] + 13, Q[1] + 22], [Q[0] - 13, Q[1] + 22]]), fill: "none", stroke: INK, "stroke-width": 1.2 }, eqG);
        txt(symG, Q[0], Q[1] + 4, s.label || "P", 10, { anchor: "middle", weight: 700, fill: INK, cls: "cond" });
      } else if (s.t === "flex") {
        const L = 12, w = 6; const c = [[-L, -w], [L, -w], [L, w], [-L, w]].map(([a, b]) => [Q[0] + d[0] * a + n[0] * b, Q[1] + d[1] * a + n[1] * b]);
        el("polygon", { points: C.ptsAttr(c), fill: paper, stroke: INK, "stroke-width": 1.3 }, symG);
        const z = []; for (let i = 0; i <= 8; i++) { const a = -L + (2 * L) * i / 8, b = i % 2 ? w * 0.8 : -w * 0.8; z.push([Q[0] + d[0] * a + n[0] * b, Q[1] + d[1] * a + n[1] * b]); }
        el("polyline", { points: C.ptsAttr(z), fill: "none", stroke: INK, "stroke-width": 0.9 }, symG);
        txt(symG, Q[0] - n[0] * 18, Q[1] - n[1] * 18 + 3, "FLEX CONN.", 7.5, { anchor: "middle", fill: INK, cls: "cond" });
      } else if (s.t === "tee") {
        el("circle", { cx: Q[0], cy: Q[1], r: 3.6, fill: INK }, symG);
      } else if (s.t === "tee-open") {
        const dd = dirOf("y"); const E = [Q[0] + dd[0] * 22, Q[1] + dd[1] * 22];
        el("line", { x1: Q[0], y1: Q[1], x2: E[0], y2: E[1], stroke: INK, "stroke-width": 2.4 }, symG);
        el("circle", { cx: Q[0], cy: Q[1], r: 3.4, fill: INK }, symG);
        el("circle", { cx: E[0], cy: E[1], r: 4, fill: paper, stroke: "#c0261b", "stroke-width": 1.8 }, symG);
        txt(symG, E[0] - 50, E[1] + 4, "OPEN — CAP", 8, { fill: "#c0261b", weight: 700, cls: "cond" });
      } else if (s.t === "cap") {
        el("line", { x1: Q[0] + n[0] * 6, y1: Q[1] + n[1] * 6, x2: Q[0] - n[0] * 6, y2: Q[1] - n[1] * 6, stroke: INK, "stroke-width": 3 }, symG);
      } else if (s.t === "sleeve") {
        const dd = dirOf("x"), up = dirOf("z");
        const c = [[-7, -7], [7, -7], [7, 7], [-7, 7]].map(([a, b]) => [Q[0] + dd[0] * a + up[0] * b, Q[1] + dd[1] * a + up[1] * b]);
        el("polygon", { points: C.ptsAttr(c), fill: "url(#hatch)", stroke: INK, "stroke-width": 1.1 }, symG);
        if (it) txt(symG, Q[0] - 8, Q[1] + 20, it.tag, 7.5, { fill: INK, weight: 600, cls: "cond" });
      } else if (s.t === "hanger") {
        const T = [Q[0] - 12, Q[1]];
        el("line", { x1: Q[0], y1: Q[1], x2: T[0], y2: T[1], stroke: INK, "stroke-width": 1.2 }, symG);
        el("polygon", { points: C.ptsAttr([[T[0], T[1] - 5], [T[0], T[1] + 5], [T[0] - 6, T[1]]]), fill: INK }, symG);
        txt(symG, T[0] - 32, T[1] + 3, "CLAMP", 7, { fill: INK, cls: "cond" });
      } else if (s.t === "trapeze") {
        const [x0, y0, z0] = s.at; const A = P([x0 - s.span / 2, y0, z0]), B = P([x0 + s.span / 2, y0, z0]);
        const A2 = P([x0 - s.span / 2, y0, z0 + 2.8]), B2 = P([x0 + s.span / 2, y0, z0 + 2.8]);
        el("line", { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: INK, "stroke-width": 2.2 }, eqG);
        [[A, A2], [B, B2]].forEach(([a, b]) => el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: INK, "stroke-width": 0.9, "stroke-dasharray": "3 2" }, eqG));
        txt(eqG, B[0] + 4, B[1] + 9, "TRAPEZE", 7, { fill: INK, cls: "cond" });
      } else if (s.t === "drop") {
        const D = P([s.at[0], s.at[1], s.at[2] - 1.4]);
        el("line", { x1: Q[0], y1: Q[1], x2: D[0], y2: D[1], stroke: INK, "stroke-width": 1.6 }, symG);
        el("circle", { cx: D[0], cy: D[1], r: 4.5, fill: paper, stroke: INK, "stroke-width": 1.2 }, symG);
        el("line", { x1: D[0] - 3, y1: D[1] - 3, x2: D[0] + 3, y2: D[1] + 3, stroke: INK, "stroke-width": 1 }, symG);
        el("line", { x1: D[0] + 3, y1: D[1] - 3, x2: D[0] - 3, y2: D[1] + 3, stroke: INK, "stroke-width": 1 }, symG);
      } else if (s.t === "cloud") {
        const x = p.issues.find((i) => i.id === s.item); const idx = p.issues.indexOf(x) + 1;
        const poly = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; poly.push([Q[0] + Math.cos(a) * 24, Q[1] + Math.sin(a) * 15]); }
        el("path", { d: C.cloudPath(poly, 6), fill: "rgba(200,40,30,.04)", stroke: "#c0261b", "stroke-width": 1.4 }, symG);
        const T = [Q[0] + 28, Q[1] - 18];
        el("polygon", { points: C.ptsAttr([[T[0], T[1] - 9], [T[0] + 9, T[1] + 6], [T[0] - 9, T[1] + 6]]), fill: paper, stroke: "#c0261b", "stroke-width": 1.3 }, symG);
        txt(symG, T[0], T[1] + 4, String(idx), 8, { anchor: "middle", weight: 700, fill: "#c0261b" });
      } else if (s.t === "label") {
        txt(symG, Q[0], Q[1] - 14, s.text, 9, { anchor: "middle", weight: 700, fill: INK, cls: "cond", bg: true, bgFill: paper });
      }
    });
    return { P, dirOf };

    function breakSym(g, Q, d, n, sgn) {
      const E = [Q[0] + d[0] * 8 * sgn, Q[1] + d[1] * 8 * sgn];
      el("line", { x1: Q[0], y1: Q[1], x2: E[0], y2: E[1], stroke: INK, "stroke-width": 2.4 }, g);
      const a = [E[0] + n[0] * 7, E[1] + n[1] * 7], b = [E[0] - n[0] * 7, E[1] - n[1] * 7];
      el("path", { d: `M${a[0]},${a[1]} Q${E[0] + d[0] * 6 * sgn + n[0] * 3},${E[1] + d[1] * 6 * sgn + n[1] * 3} ${E[0]},${E[1]} T${b[0]},${b[1]}`, fill: "none", stroke: INK, "stroke-width": 1.4 }, g);
      const T = [E[0] + d[0] * 14 * sgn, E[1] + d[1] * 14 * sgn + 3];
      txt(g, T[0], T[1], "CONT.", 7, { fill: "#4b5d6c", cls: "cond", anchor: Math.abs(d[0]) > 0.5 ? (d[0] * sgn > 0 ? "start" : "end") : "middle" });
    }
    function dimension(g, A, B, d, n, label) {
      const off = 24; const A1 = [A[0] + n[0] * off, A[1] + n[1] * off], B1 = [B[0] + n[0] * off, B[1] + n[1] * off];
      const dg = el("g", { class: "iso-dim" }, g);
      [[A, A1], [B, B1]].forEach(([p0, p1]) => el("line", { x1: p0[0] + n[0] * 5, y1: p0[1] + n[1] * 5, x2: p1[0] + n[0] * 5, y2: p1[1] + n[1] * 5, stroke: "#3b5266", "stroke-width": 0.6 }, dg));
      el("line", { x1: A1[0], y1: A1[1], x2: B1[0], y2: B1[1], stroke: "#3b5266", "stroke-width": 0.8 }, dg);
      [A1, B1].forEach((q) => el("line", { x1: q[0] - (d[0] + n[0]) * 4, y1: q[1] - (d[1] + n[1]) * 4, x2: q[0] + (d[0] + n[0]) * 4, y2: q[1] + (d[1] + n[1]) * 4, stroke: "#3b5266", "stroke-width": 1.3 }, dg));
      const M = [(A1[0] + B1[0]) / 2 + n[0] * 6, (A1[1] + B1[1]) / 2 + n[1] * 6];
      let deg = Math.atan2(d[1], d[0]) * 180 / Math.PI; if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
      txt(dg, M[0], M[1] + 3, label, 9.5, { anchor: "middle", weight: 600, fill: "#1f3a52", rot: deg, cls: "mono" });
    }
  }

  function triad(root, x0, y0, dirOf) {
    const g = el("g", { transform: `translate(${x0},${y0})` }, root);
    [["x", "ALONG WALL"], ["y", "OUT"], ["z", "UP"]].forEach(([a, l]) => {
      const d = dirOf(a);
      el("line", { x1: 0, y1: 0, x2: d[0] * 26, y2: d[1] * 26, stroke: INK, "stroke-width": 1.1 }, g);
      el("polygon", { points: C.ptsAttr([[d[0] * 31, d[1] * 31], [d[0] * 24 - d[1] * 3, d[1] * 24 + d[0] * 3], [d[0] * 24 + d[1] * 3, d[1] * 24 - d[0] * 3]]), fill: INK }, g);
      txt(g, d[0] * 42, d[1] * 42 + 3, l, 6.5, { anchor: "middle", fill: "#4b5d6c", cls: "cond" });
    });
  }
  function hatchDefs(svg) {
    const defs = el("defs", null, svg);
    const pat = el("pattern", { id: "hatch", width: 4, height: 4, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 4, stroke: INK, "stroke-width": 0.8 }, pat);
  }

  /* drawing field only — for the printed sheet */
  function renderBare(svg, p, opts) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const BW = 760, BH = 640; svg.setAttribute("viewBox", `0 0 ${BW} ${BH}`);
    hatchDefs(svg);
    const root = el("g", null, svg);
    el("rect", { x: 0, y: 0, width: BW, height: BH, fill: "#fff" }, root);
    const grid = el("g", null, root);
    for (let x = 0; x <= BW; x += 20) el("line", { x1: x, y1: 0, x2: x, y2: BH, stroke: "#edf1f4", "stroke-width": 0.5 }, grid);
    for (let y = 0; y <= BH; y += 20) el("line", { x1: 0, y1: y, x2: BW, y2: y, stroke: "#edf1f4", "stroke-width": 0.5 }, grid);
    const F = drawField(root, p, opts, [70, 40, 720, 590], "#fff");
    triad(root, 44, 594, F.dirOf);
  }

  function render(svg, p, opts) {
    opts = opts || {};
    if (opts.bare) return renderBare(svg, p, opts);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    hatchDefs(svg);
    const root = el("g", { class: "iso-sheet" }, svg);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: PAPER }, root);
    const grid = el("g", { opacity: 0.35 }, root);
    for (let x = 30; x < 790; x += 20) el("line", { x1: x, y1: 26, x2: x, y2: 686, stroke: "#d7dfe6", "stroke-width": 0.5 }, grid);
    for (let y = 30; y < 686; y += 20) el("line", { x1: 26, y1: y, x2: 790, y2: y, stroke: "#d7dfe6", "stroke-width": 0.5 }, grid);
    el("rect", { x: 12, y: 12, width: W - 24, height: H - 24, fill: "none", stroke: INK, "stroke-width": 2 }, root);
    el("rect", { x: 18, y: 18, width: W - 36, height: H - 36, fill: "none", stroke: INK, "stroke-width": 0.6 }, root);
    el("line", { x1: 800, y1: 18, x2: 800, y2: H - 18, stroke: INK, "stroke-width": 1.2 }, root);
    for (let i = 1; i < 8; i++) { const x = 18 + i * (782 / 8); el("line", { x1: x, y1: 12, x2: x, y2: 18, stroke: INK, "stroke-width": 0.6 }, root); }

    const F = drawField(root, p, opts, [80, 50, 760, 630], PAPER);
    triad(root, 58, 612, F.dirOf);
    txt(root, 120, 668, `ISOMETRIC — ${p.title.toUpperCase()}`, 12, { weight: 700, fill: INK, cls: "cond" });
    el("line", { x1: 120, y1: 673, x2: 520, y2: 673, stroke: INK, "stroke-width": 1.2 }, root);
    txt(root, 120, 684, "N.T.S. · DERIVED FROM FIELD PHOTO " + p.id + " · DIMENSIONS ESTIMATED", 8, { fill: INK, cls: "cond" });

    /* right column */
    const rc = el("g", { transform: "translate(800,18)" }, root);
    let y = 22;
    txt(rc, 14, y, "GENERAL NOTES", 10, { weight: 700, fill: INK, cls: "cond", ls: 1 }); y += 8;
    el("line", { x1: 14, y1: y, x2: 268, y2: y, stroke: INK, "stroke-width": 0.6 }, rc); y += 14;
    p.iso.notes.forEach((nt, i) => { wrapLines(nt, 44).forEach((ln, j) => { txt(rc, 14, y, (j ? "    " : `${i + 1}. `) + ln, 8.4, { fill: INK, cls: "cond" }); y += 11; }); y += 2; });
    if (p.issues.length) {
      y += 6; txt(rc, 14, y, "REVISION CLOUDS", 10, { weight: 700, fill: INK, cls: "cond", ls: 1 }); y += 8;
      el("line", { x1: 14, y1: y, x2: 268, y2: y, stroke: INK, "stroke-width": 0.6 }, rc); y += 14;
      p.issues.forEach((x, i) => { txt(rc, 14, y, `△${i + 1}  ${x.title.toUpperCase()} (${x.sev.toUpperCase()})`, 8.4, { fill: "#c0261b", cls: "cond", weight: 600 }); y += 12; });
    }
    y += 6;
    txt(rc, 14, y, "LEGEND", 10, { weight: 700, fill: INK, cls: "cond", ls: 1 }); y += 8;
    el("line", { x1: 14, y1: y, x2: 268, y2: y, stroke: INK, "stroke-width": 0.6 }, rc); y += 14;
    [...new Set(p.runs.map((r) => r.sys))].forEach((sk) => { el("line", { x1: 14, y1: y - 3, x2: 44, y2: y - 3, stroke: C.sysColor(sk), "stroke-width": 6, opacity: 0.45 }, rc); el("line", { x1: 14, y1: y - 3, x2: 44, y2: y - 3, stroke: INK, "stroke-width": 2 }, rc); txt(rc, 52, y, `${sk} — ${C.sysName(sk).toUpperCase()}`, 8.4, { fill: INK, cls: "cond" }); y += 13; });
    el("line", { x1: 14, y1: y - 3, x2: 44, y2: y - 3, stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 4" }, rc); txt(rc, 52, y, "BELOW 70% CONFIDENCE — VERIFY", 8.4, { fill: INK, cls: "cond" }); y += 15;
    const sk = el("g", { transform: `translate(14,${y})` }, rc);
    bowtie(sk, [10, 0], [1, 0], [0, 1], 7, 5); txt(sk, 24, 3, "GATE", 7.6, { fill: INK, cls: "cond" });
    bowtie(sk, [78, 0], [1, 0], [0, 1], 7, 5); el("line", { x1: 78, y1: -6, x2: 78, y2: 6, stroke: INK, "stroke-width": 1.4 }, sk); txt(sk, 92, 3, "BUTTERFLY", 7.6, { fill: INK, cls: "cond" });
    [-2, 2].forEach((o) => el("line", { x1: 168 + o, y1: -6, x2: 168 + o, y2: 6, stroke: INK, "stroke-width": 1.6 }, sk)); txt(sk, 178, 3, "FLANGE", 7.6, { fill: INK, cls: "cond" });
    el("circle", { cx: 230, cy: 0, r: 2.8, fill: INK }, sk); txt(sk, 237, 3, "JOINT", 7.6, { fill: INK, cls: "cond" });

    titleBlock(el("g", { transform: `translate(0,${H - 36 - 238})` }, rc), p, 282, 238, PAPER);
  }

  /* title block, shared shape for app sheet; the PDF sheet draws an HTML version with the same fields */
  function titleBlock(tb, p, Wt, Ht, paper) {
    el("rect", { x: 0, y: 0, width: Wt, height: Ht, fill: "none", stroke: INK, "stroke-width": 1.2 }, tb);
    el("rect", { x: 0, y: 0, width: Wt, height: 34, fill: INK }, tb);
    txt(tb, 12, 22, "FIELD TRACE", 15, { weight: 800, fill: paper, cls: "cond", ls: 2 });
    txt(tb, Wt - 12, 15, "MIMETIC TECHNOLOGY", 7.5, { anchor: "end", fill: "#b9c7d3", cls: "cond", ls: 1 });
    txt(tb, Wt - 12, 26, "110/20 SOFTWARE · PROTOTYPE", 7, { anchor: "end", fill: "#8aa0b2", cls: "cond", ls: 0.6 });
    let ty = 34;
    const cell = (x, y0, w, h, label, value, o) => { o = o || {}; el("rect", { x, y: y0, width: w, height: h, fill: "none", stroke: INK, "stroke-width": 0.6 }, tb); txt(tb, x + 5, y0 + 9, label, 6, { fill: "#4b5d6c", cls: "cond", ls: 0.6 }); wrapLines(value, o.wrap || 60).slice(0, 2).forEach((ln, i) => txt(tb, x + 5, y0 + 20 + i * 10, ln, o.fs || 9, { fill: INK, weight: o.weight || 600, cls: "cond" })); };
    cell(0, ty, Wt, 32, "PROJECT", C.FT.project.name + "  (" + C.FT.project.number + ")", { wrap: 52 }); ty += 32;
    cell(0, ty, Wt, 26, "PREPARED FOR", C.FT.product.client); ty += 26;
    cell(0, ty, Wt, 40, "DRAWING TITLE", "AS-BUILT ISOMETRIC — " + p.title.toUpperCase(), { wrap: 46, fs: 9.5, weight: 700 }); ty += 40;
    cell(0, ty, Wt / 2, 26, "SOURCE PHOTO", `${p.id} · ${p.taken}`, { fs: 8 }); cell(Wt / 2, ty, Wt / 2, 26, "LOCATION", p.location, { fs: 8, wrap: 30 }); ty += 26;
    cell(0, ty, Wt / 3, 26, "DRAWN", "FIELD TRACE AI", { fs: 8 }); cell(Wt / 3, ty, Wt / 3, 26, "CHECKED", p.status === "reviewed" ? C.FT.project.reviewer.toUpperCase() : "—", { fs: 8 }); cell(2 * Wt / 3, ty, Wt / 3, 26, "SCALE", "N.T.S.", { fs: 8 }); ty += 26;
    cell(0, ty, 2 * Wt / 3, 28, "STATUS", p.status === "reviewed" ? "REVIEWED — ISSUED AS-BUILT" : p.status === "attention" ? "HELD — NEEDS FIELD VERIFICATION" : "DRAFT — FOR REVIEW IN REVU", { fs: 8.5, weight: 700 });
    el("rect", { x: 2 * Wt / 3, y: ty, width: Wt / 3, height: 28, fill: "none", stroke: INK, "stroke-width": 0.6 }, tb);
    txt(tb, 2 * Wt / 3 + 5, ty + 9, "SHEET", 6, { fill: "#4b5d6c", cls: "cond" }); txt(tb, 5 * Wt / 6, ty + 23, p.id + "-ISO", 12, { anchor: "middle", weight: 800, fill: INK, cls: "cond" });
    txt(tb, Wt / 2, Ht - 6, "SAMPLE DATA — NOT FOR CONSTRUCTION", 7, { anchor: "middle", fill: "#c0261b", weight: 700, cls: "cond", ls: 1 });
  }

  window.FTIso = { render, W, H };
})();
