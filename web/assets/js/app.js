/* Field Trace — interactive prototype (hash-routed, no build step, runs from file://). */
(function () {
  const C = window.FTCore, FT = C.FT, esc = C.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const view = $("#view");
  const ui = {
    mode: "split", split: 0.5, layers: {}, selected: null, listFilter: "all", sort: null, zoom: 1, pan: [0, 0],
    photoStatus: {}, seen: {}, asbuiltMarkups: true, takeoffPhotos: FT.photos.map((p) => p.id), inboxFilter: "all"
  };
  FT.layers.forEach((l) => (ui.layers[l.id] = true));
  const statusOf = (p) => ui.photoStatus[p.id] || p.status;
  const STATUS_LABEL = { ready: "Ready for review", attention: "Needs attention", reviewed: "Reviewed" };

  /* ---------------- routing ----------------
   The product is the default: #/ or #/inbox. The presenter story lives on ONE page, #/demo/<tab>. */
  function route() {
    if (ui.ro) { ui.ro.disconnect(); ui.ro = null; }
    const h = location.hash.replace(/^#\/?/, "").split("/");
    let v = h[0] || "inbox"; const id = h[1];
    if (v === "overview") { location.replace("#/demo/open"); return; }
    if (!["inbox", "ws", "asbuilt", "takeoff", "export", "demo"].includes(v)) v = "inbox";
    $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === v));
    document.body.dataset.view = v;
    if (v !== "demo" && window.FTDemo) FTDemo.leave();
    if (!["ws", "asbuilt", "takeoff", "demo"].includes(v)) ui.demoReturn = null;
    const wsLink = $('.nav a[data-v="ws"]'); if (wsLink) wsLink.href = "#/ws/" + (ui.lastPhoto || "FT-01");
    const abLink = $('.nav a[data-v="asbuilt"]'); if (abLink) abLink.href = "#/asbuilt/" + (ui.lastPhoto || "FT-01");
    if (v === "demo") return FTDemo.render(view, id);
    if (v === "ws") return Workspace(C.photoById(id) ? id : (ui.lastPhoto || "FT-01"));
    if (v === "asbuilt") return AsBuilt(C.photoById(id) ? id : (ui.lastPhoto || "FT-01"));
    if (v === "takeoff") return Takeoff();
    if (v === "export") return Export();
    return Inbox();
  }
  window.addEventListener("hashchange", route);
  const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function download(name, text, type) {
    const blob = new Blob(["\ufeff" + text], { type: type || "text/csv" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const counts = () => { const c = { ready: 0, attention: 0, reviewed: 0 }; FT.photos.forEach((p) => c[statusOf(p)]++); return c; };
  const totalMarkups = () => FT.photos.reduce((s, p) => s + C.buildMarkups(p).length, 0);

  /* ---------------- INBOX (home of the product) ---------------- */
  function card(p) {
    const ms = C.buildMarkups(p); const st = statusOf(p); const low = ms.filter((m) => m.conf < C.THRESH).length;
    return `
          <a class="card st-${st}" href="#/ws/${p.id}">
            <div class="thumb"><img src="${C.photoSrc(p)}" alt="" loading="lazy"><svg class="ovl" data-id="${p.id}"></svg><span class="hover-hint">${p.upload ? "AI first pass" : "Prepared markup"}</span></div>
            <div class="card-b">
              <div class="row1"><span class="pid">${p.id}</span>${p.upload ? `<span class="status s-live">${st === "reviewed" ? "Reviewed" : "AI first pass"}</span>` : `<span class="status s-${st}">${STATUS_LABEL[st]}</span>`}</div>
              <div class="ttl">${esc(p.title)}</div>
              <div class="matchips">${matChips(p)}</div>
              <div class="meta">${esc(p.upload ? (p.engine && p.engine.label) || "Uploaded" : p.location)}</div>
              <div class="meta mono">${esc(p.taken)} · ${esc(p.by)}</div>
              <div class="stats"><span><b>${p.runs.length}</b> runs</span><span><b>${p.items.length}</b> symbols</span><span><b>${p.dims.length}</b> dims</span><span class="${p.issues.length ? "iss" : ""}"><b>${p.issues.length}</b> issues</span>${low ? `<span class="lowc"><b>${low}</b> to verify</span>` : ""}</div>
              <div class="conf"><div class="bar"><i style="width:${p.conf * 100}%" class="${p.conf < C.THRESH ? "low" : ""}"></i></div><span class="mono">${C.pct(p.conf)}</span></div>
            </div>
          </a>`;
  }
  function engineLine() {
    const e = ui.engine;
    if (!e) return `<span class="dot"></span>Checking analysis engine…`;
    return e.kind === "vision"
      ? `<span class="dot ok"></span>Engine: vision model (${esc(e.provider)}${e.model ? ": " + esc(e.model) : ""}), with local OpenCV as fallback`
      : `<span class="dot cv"></span>Engine: local first pass (OpenCV geometry + colour). No vision model configured.`;
  }
  function Inbox() {
    const c = counts(); const f = ui.inboxFilter;
    const match = (p) => f === "all" || statusOf(p) === f;
    const ups = FT.photos.filter((p) => p.upload && match(p)).reverse(), samples = FT.photos.filter((p) => !p.upload && match(p));
    const nUp = FT.photos.filter((p) => p.upload).length;
    view.innerHTML = `
    <section class="inbox">
      <div class="page-head">
        <div><h2>Inbox</h2><div class="muted">Field photos in, AI first pass out. Open one to review it in the workspace.</div></div>
        <div class="chips">
          ${[["all", "All", FT.photos.length], ["ready", "Ready for review", c.ready], ["attention", "Needs attention", c.attention], ["reviewed", "Reviewed", c.reviewed]].map(([k, l, n]) => `<button class="chip ${f === k ? "on" : ""} s-${k}" data-f="${k}">${l}<b>${n}</b></button>`).join("")}
        </div>
      </div>
      <div class="inbox-body">
        <div class="inbox-main">
          <div class="intake">
            <label class="dropzone" id="upCard" tabindex="0">
              <input type="file" id="upInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden>
              <div class="up-ic">＋</div>
              <div class="dz-t"><b>New photo</b><span>Drop a piping photo here, or click to choose one. JPEG, PNG, WebP or HEIC, up to 15 MB.</span></div>
              <em>AI first pass: verify material and size</em>
            </label>
            <div class="intake-r">
              <div class="engine" id="engLine">${engineLine()}</div>
              <div class="samples">Run the live engine on a sample: ${["FT-07", "FT-05", "FT-08"].map((id) => `<button class="btn sm" data-sample="${id}">${id}</button>`).join("")}</div>
              <div id="upRes" class="up-status"></div>
            </div>
          </div>
          ${ups.length ? `<div class="sec-h"><h3>Your uploads</h3><span class="muted">${nUp} photo${nUp === 1 ? "" : "s"} · kept in this browser</span>${nUp ? `<button class="link" id="clearUps">Remove uploads</button>` : ""}</div>
          <div class="grid">${ups.map(card).join("")}</div>` : ""}
          <div class="sec-h"><h3>${esc(FT.project.name)}</h3><span class="muted mono">${esc(FT.project.number)}</span><span class="muted">Sample project. Prepared examples: the markups were authored to show the output, not produced live.</span></div>
          <div class="grid">${samples.map(card).join("") || `<p class="muted">No sample photos match this filter.</p>`}</div>
        </div>
        <aside class="standards">
          <h3>Standards applied to every photo</h3>
          <p class="muted">The same layer names, colors, subjects and labels on every sheet. In production these come from your Revu tool chest and office standards. Here they are a sample set.</p>
          <div class="std-h">Systems</div>
          <ul class="legend">${Object.entries(FT.systems).filter(([k]) => FT.photos.some((p) => p.runs.some((r) => r.sys === k))).map(([k, s]) => `<li><i style="background:${s.color}"></i><b>${k}</b><span>${esc(s.name)}</span></li>`).join("")}</ul>
          <div class="std-h">Materials (suggested, never assumed)</div>
          <ul class="legend">${C.MAT_ORDER.map((k) => `<li><i style="background:${C.matColor(k)}"></i><b>${C.matInfo(k).short}</b><span>${esc(C.matInfo(k).name)}</span></li>`).join("")}</ul>
          <div class="std-h">Layers</div>
          <ul class="layers-mini">${FT.layers.map((l) => `<li>${esc(l.name)}</li>`).join("")}</ul>
          <div class="std-h">Review rule</div>
          <p class="muted">Anything under 70% confidence is dashed, marked <b class="q">?</b>, and left for a person to decide. Photos with too much uncertainty are routed to <em>Needs attention</em> and not auto-drafted. Schedules are always suggestions: the wall isn't visible.</p>
        </aside>
      </div>
    </section>`;
    $$(".chip").forEach((b) => b.addEventListener("click", () => { ui.inboxFilter = b.dataset.f; Inbox(); }));
    FTDemo.bindDrop($("#upCard"), $("#upInput"), { from: "inbox" });
    $$("[data-sample]", view).forEach((b) => b.addEventListener("click", () => FTDemo.uploadSample(b.dataset.sample, { from: "inbox" })));
    const cu = $("#clearUps"); if (cu) cu.addEventListener("click", () => { if (!confirm("Remove all uploaded photos from this browser?")) return; FTApp.clearUploads(); Inbox(); toast("Uploads removed"); });
    $$(".card svg.ovl").forEach((s) => FTOverlay.render(s, C.photoById(s.dataset.id), { layers: ui.layers, only: ["runs", "issues", "valves", "fittings"] }));
  }

  /* ---------------- WORKSPACE ---------------- */
  function Workspace(id) {
    const p = C.photoById(id); ui.lastPhoto = id;
    if (ui.wsPhoto !== id) { ui.selected = null; ui.zoom = 1; ui.pan = [0, 0]; ui.wsPhoto = id; }
    const first = !ui.seen[id]; ui.seen[id] = true;
    view.innerHTML = `
    <section class="ws ${ui.listCollapsed ? "list-collapsed" : ""}">
      <aside class="strip">
        ${FT.photos.map((q) => `<a href="#/ws/${q.id}" class="sthumb ${q.id === id ? "on" : ""} st-${statusOf(q)}" title="${esc(q.title)}"><img src="${C.photoSrc(q, true)}" alt=""><span>${q.id}</span><i></i></a>`).join("")}
        <div class="strip-hint"><kbd>J</kbd><kbd>K</kbd> photos</div>
      </aside>
      <div class="ws-main">
        <div class="toolbar">
          <div class="seg" id="modeSeg">
            <button data-m="orig">Original</button><button data-m="split">Before / After</button><button data-m="mark">AI Markup</button>
          </div>
          <div class="seg" id="colorSeg" title="Colour pipe runs by system or by suggested material"><button data-c="system">System</button><button data-c="material">Material</button></div>
          <div class="zoom"><button id="zOut" title="Zoom out">−</button><span id="zLbl">Fit</span><button id="zIn" title="Zoom in">+</button><button id="zFit">Fit</button></div>
          <div class="tb-title"><b>${p.id}</b> ${esc(p.title)} <span class="status s-${statusOf(p)}">${STATUS_LABEL[statusOf(p)]}</span></div>
          <div class="tb-actions">
            <button class="btn sm" id="acceptHi" title="Accept every undecided markup at or above 85% confidence">Accept all ≥ 85%</button>
            <button class="btn sm" id="markRev">Mark photo reviewed</button>
            <a class="btn sm primary" href="#/asbuilt/${p.id}">As-built drawing →</a>
          </div>
        </div>
        <div class="canvas" id="canvas">
          <div class="stage" id="stage">
            <img src="${C.photoSrc(p)}" alt="Field photo ${p.id}" draggable="false">
            <div class="ovl-wrap" id="ovlWrap"><svg class="ovl" id="ovl"></svg></div>
            <div class="splitter" id="splitter"><span class="grip"></span><em class="l">Original</em><em class="r">AI markup</em></div>
          </div>
          ${statusOf(p) === "attention" ? `<div class="banner warn"><b>Needs attention.</b> ${esc(p.summary)}</div>` : ""}
          ${p.upload ? `<div class="banner live"><b>AI first pass: verify material and size.</b> ${esc(p.engine.label)}${p.engine.fallback ? ` <span class="muted">(${esc(p.engine.fallback)})</span>` : ""} · ${p.ms ? (p.ms / 1000).toFixed(1) + " s" : ""}${p.advisories && p.advisories.length ? `<ul>${p.advisories.slice(0, 4).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</div>` : ""}
          ${ui.demoReturn ? `<a class="back-demo" href="#/demo/${ui.demoReturn}">← Back to Demo · ${esc(FTDemo.title(ui.demoReturn))}</a>` : ""}
        </div>
        <div class="mlist" id="mlist"></div>
      </div>
      <aside class="side" id="side"></aside>
    </section>`;

    const stage = $("#stage"), canvas = $("#canvas");
    function layout() {
      const r = canvas.getBoundingClientRect(); const pad = 18;
      const s = Math.min((r.width - pad * 2) / p.w, (r.height - pad * 2) / p.h);
      stage.style.width = p.w * s + "px"; stage.style.height = p.h * s + "px";
      const changed = Math.abs((ui.s || 0) - s) > 0.002; ui.s = s;
      applyZoom(); if (changed && drawn) draw();
    }
    function applyZoom() {
      stage.style.transform = `translate(${ui.pan[0]}px, ${ui.pan[1]}px) scale(${ui.zoom})`;
      const zl = $("#zLbl"); if (zl) zl.textContent = ui.zoom === 1 ? "Fit" : Math.round(ui.zoom * 100) + "%";
    }
    function setMode(m) {
      ui.mode = m; $$("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
      stage.dataset.mode = m; applySplit();
    }
    function applySplit() {
      const w = $("#ovlWrap");
      if (ui.mode === "split") { w.style.clipPath = `inset(0 0 0 ${ui.split * 100}%)`; $("#splitter").style.left = ui.split * 100 + "%"; }
      else w.style.clipPath = "none";
    }
    let drawn = false;
    function draw(animate) {
      drawn = true;
      FTOverlay.render($("#ovl"), p, { layers: ui.layers, selected: ui.selected, onSelect: select, markups: C.buildMarkups(p), animate, screenScale: ui.s });
      $$("#colorSeg button").forEach((b) => b.classList.toggle("on", b.dataset.c === C.state.colorBy));
    }
    function select(key) { ui.selected = key; draw(); Side(); List(); const row = $(`#mlist tr[data-key="${CSS.escape(key)}"]`); if (row) row.scrollIntoView({ block: "nearest" }); }
    function setStatus(key, st) { C.state.status[key] = st; draw(); Side(); List(); }

    /* side panel */
    function Side() {
      const ms = C.buildMarkups(p); const m = ms.find((x) => x.key === ui.selected);
      const decided = ms.filter((x) => x.status !== "None").length;
      const lc = {}; ms.forEach((x) => (lc[x.layer] = (lc[x.layer] || 0) + 1));
      $("#side").innerHTML = `
        <div class="panel">
          <div class="ph">Photo</div>
          <div class="kv"><span>Location</span><b>${esc(p.location)}</b></div>
          <div class="kv"><span>Taken</span><b class="mono">${esc(p.taken)}</b></div>
          <div class="kv"><span>Confidence</span><b><span class="mini-bar"><i style="width:${p.conf * 100}%" class="${p.conf < C.THRESH ? "low" : ""}"></i></span> ${C.pct(p.conf)}</b></div>
          <div class="kv col"><span>Scale reference</span><b>${esc(C.scaleOf(p) && C.scaleOf(p).kind === "cal" ? C.scaleOf(p).text : p.scale)}</b></div>
          ${p.ocrText.length ? `<div class="kv col"><span>Text read in photo</span><b class="ocrchips">${p.ocrText.map((t) => `<code>${esc(t)}</code>`).join("")}</b></div>` : ""}
          <div class="progress"><div class="bar"><i style="width:${(decided / ms.length) * 100}%"></i></div><span>${decided} of ${ms.length} markups decided</span></div>
        </div>
        <div class="panel">
          <div class="ph">Layers <button class="link" id="allLayers">all</button></div>
          <ul class="layers">${FT.layers.map((l) => `<li class="${ui.layers[l.id] ? "" : "off"}" data-l="${l.id}"><span class="eye"></span><span class="lname">${esc(l.name)}</span><span class="cnt">${lc[l.id] || 0}</span></li>`).join("")}</ul>
        </div>
        <div class="panel props">
          <div class="ph">Properties</div>
          ${m ? `
            <div class="psubj"><span class="sw" style="background:${m.sys ? C.sysColor(m.sys) : layerColor(m.layer)}"></span><div><b>${esc(m.subject)}</b><div class="muted">${esc(m.label)}</div></div></div>
            <div class="kv"><span>Layer</span><b>${esc((FT.layers.find((l) => l.id === m.layer) || {}).name)}</b></div>
            <div class="kv"><span>Author</span><b>${esc(m.author)}</b></div>
            <div class="kv"><span>Date</span><b class="mono">${esc(m.date)}</b></div>
            <div class="kv"><span>Confidence</span><b class="${m.conf < C.THRESH ? "lowtxt" : ""}"><span class="mini-bar"><i style="width:${m.conf * 100}%" class="${m.conf < C.THRESH ? "low" : ""}"></i></span> ${C.pct(m.conf)}${m.conf < C.THRESH ? " · verify" : ""}</b></div>
            ${m.detail ? `<div class="kv col"><span>Detail</span><b>${esc(m.detail)}</b></div>` : ""}
            ${m.note && m.note !== m.detail ? `<div class="kv col ai-note"><span>Why the AI thinks so</span><b>${esc(m.note)}</b></div>` : ""}
            ${m.kind === "run" || m.kind === "tag" ? runProps(p, m.src) : ""}
            ${m.kind === "item" || m.kind === "instrument" ? itemProps(m.src) : ""}
            <div class="kv"><span>Status</span><select id="stSel">${C.STATUSES.map((s) => `<option ${s === m.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
            <label class="cmt"><span>Comment</span><textarea id="cmt" rows="2" placeholder="Add a note for the field or the drawing">${esc(m.comment)}</textarea></label>
            <div class="pbtns"><button class="btn sm ok" id="bAcc"><kbd>A</kbd> Accept</button><button class="btn sm bad" id="bRej"><kbd>R</kbd> Reject</button><button class="btn sm" id="bHide"><kbd>H</kbd> ${m.hidden ? "Show" : "Hide"}</button></div>
          ` : `<div class="empty">Click a markup on the photo or a row in the Markups list.<br><span class="muted">A accept · R reject · H hide · Esc clear</span></div>`}
        </div>`;
      $$("#side .layers li").forEach((li) => li.addEventListener("click", () => { ui.layers[li.dataset.l] = !ui.layers[li.dataset.l]; draw(); Side(); }));
      $("#allLayers").addEventListener("click", () => { const on = !FT.layers.every((l) => ui.layers[l.id]); FT.layers.forEach((l) => (ui.layers[l.id] = on)); draw(); Side(); });
      if (m) {
        const r = m.src;
        const ov = (patch, msg) => { C.override(p, r, patch); draw(); Side(); List(); toast(msg); };
        if ($("#matSel")) $("#matSel").addEventListener("change", (e) => { const [mat, sub] = e.target.value.split(":"); ov({ material: mat, matSub: sub || "", matConf: 1, matCues: ["Set by reviewer"].concat(r.matCues || []) }, `Material set to ${e.target.selectedOptions[0].textContent}`); });
        if ($("#sizeSel")) $("#sizeSel").addEventListener("change", (e) => { const v = e.target.value; const od = C.odFor(v, r.odClass || (r.material === "CU" || r.matSub === "PEX" ? "CTS" : "NPS")); ov({ size: v, od: od ? od + '"' : r.od }, `Size set to ${v}`); });
        if ($("#calBtn")) $("#calBtn").addEventListener("click", () => { const od = parseFloat(r.od) || C.odFor(r.size, r.odClass); if (!od || !r.wpx) return toast("Set a nominal size on this run first"); p.cal = { run: r.id, size: r.size, od, note: "Set by reviewer" }; toast(`Scale set from ${r.id}: ${r.size}, OD ${od}"`); Side(); });
        if ($("#matReset")) $("#matReset").addEventListener("click", () => { const o = C.state.orig[p.id + ":" + r.id]; if (o) { Object.keys(r).forEach((k) => delete r[k]); Object.assign(r, o.v); delete C.state.orig[p.id + ":" + r.id]; } draw(); Side(); List(); });
        $("#stSel").addEventListener("change", (e) => setStatus(m.key, e.target.value));
        $("#cmt").addEventListener("input", (e) => { C.state.comment[m.key] = e.target.value; List(); });
        $("#bAcc").addEventListener("click", () => { setStatus(m.key, "Accepted"); toast(`Accepted: ${m.subject}`); });
        $("#bRej").addEventListener("click", () => { setStatus(m.key, "Rejected"); toast(`Rejected: ${m.subject} (removed from takeoff)`); });
        $("#bHide").addEventListener("click", () => { C.state.hidden[m.key] = !m.hidden; draw(); Side(); List(); });
      }
    }

    /* Markups list (bottom panel, Revu-style) */
    function List() {
      let ms = C.buildMarkups(p);
      const f = ui.listFilter;
      const fl = { all: () => true, low: (m) => m.conf < C.THRESH, issues: (m) => m.layer === "issues", open: (m) => m.status === "None" };
      const nAll = ms.length, nLow = ms.filter(fl.low).length, nIss = ms.filter(fl.issues).length, nOpen = ms.filter(fl.open).length;
      ms = ms.filter(fl[f]);
      if (ui.sort) { const [k, dir] = ui.sort; ms.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir); }
      const th = (k, l) => `<th data-k="${k}" class="${ui.sort && ui.sort[0] === k ? (ui.sort[1] > 0 ? "asc" : "desc") : ""}">${l}</th>`;
      $("#mlist").innerHTML = `
        <div class="ml-head"><button class="ml-tog" id="mlTog" title="Collapse / expand (M)">${ui.listCollapsed ? "▴" : "▾"}</button><b>Markups List</b>
          <div class="ml-tabs">${[["all", "All", nAll], ["open", "Undecided", nOpen], ["low", "Needs verification", nLow], ["issues", "Issues", nIss]].map(([k, l, n]) => `<button data-f="${k}" class="${f === k ? "on" : ""}">${l} <span>${n}</span></button>`).join("")}</div>
          <span class="muted ml-note">Same columns you'd see in Revu: subject, label, layer, author, date, status, comments</span>
        </div>
        <div class="ml-body"><table>
          <thead><tr><th class="c"></th>${th("subject", "Subject")}${th("label", "Label")}${th("layer", "Layer")}${th("author", "Author")}${th("date", "Date")}${th("status", "Status")}${th("conf", "Confidence")}<th>Comments</th></tr></thead>
          <tbody>${ms.map((m) => `<tr data-key="${esc(m.key)}" class="${m.key === ui.selected ? "sel" : ""} ${m.hidden ? "hid" : ""} st-${m.status.toLowerCase()}">
            <td class="c"><span class="sw" style="background:${m.sys ? C.sysColor(m.sys) : layerColor(m.layer)}"></span></td>
            <td>${esc(m.subject)}</td><td>${esc(m.label)}</td><td>${esc((FT.layers.find((l) => l.id === m.layer) || {}).name)}</td><td>${esc(m.author)}</td><td class="mono">${esc(m.date)}</td>
            <td><span class="stt s-${m.status.toLowerCase()}">${m.status}</span></td>
            <td class="mono ${m.conf < C.THRESH ? "lowtxt" : ""}">${C.pct(m.conf)}${m.conf < C.THRESH ? " ?" : ""}</td>
            <td class="cm">${esc(m.comment || "")}</td></tr>`).join("")}</tbody></table></div>`;
      $("#mlTog").addEventListener("click", toggleList);
      $$("#mlist .ml-tabs button").forEach((b) => b.addEventListener("click", () => { ui.listFilter = b.dataset.f; List(); }));
      $$("#mlist th[data-k]").forEach((t) => t.addEventListener("click", () => { const k = t.dataset.k; ui.sort = ui.sort && ui.sort[0] === k ? (ui.sort[1] > 0 ? [k, -1] : null) : [k, 1]; List(); }));
      $$("#mlist tbody tr").forEach((tr) => tr.addEventListener("click", () => select(tr.dataset.key)));
    }

    function toggleList() { ui.listCollapsed = !ui.listCollapsed; $(".ws").classList.toggle("list-collapsed", ui.listCollapsed); List(); }
    /* interactions */
    $$("#modeSeg button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    $$("#colorSeg button").forEach((b) => b.addEventListener("click", () => { C.state.colorBy = b.dataset.c; draw(); Side(); List(); }));
    const sp = $("#splitter"); let dragging = false, panning = null;
    sp.addEventListener("pointerdown", (e) => { dragging = true; sp.setPointerCapture(e.pointerId); e.stopPropagation(); });
    sp.addEventListener("pointermove", (e) => { if (!dragging) return; const r = stage.getBoundingClientRect(); ui.split = Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width)); applySplit(); });
    sp.addEventListener("pointerup", () => (dragging = false));
    canvas.addEventListener("pointerdown", (e) => { if (ui.zoom > 1 && !e.target.closest(".ft-mk")) { panning = [e.clientX - ui.pan[0], e.clientY - ui.pan[1]]; canvas.setPointerCapture(e.pointerId); canvas.classList.add("panning"); } });
    canvas.addEventListener("pointermove", (e) => { if (panning) { ui.pan = [e.clientX - panning[0], e.clientY - panning[1]]; applyZoom(); } });
    canvas.addEventListener("pointerup", () => { panning = null; canvas.classList.remove("panning"); });
    canvas.addEventListener("click", (e) => { if (!e.target.closest(".ft-mk") && !e.target.closest(".splitter") && ui.selected) { ui.selected = null; draw(); Side(); List(); } });
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    const zoomBy = (f) => { ui.zoom = Math.max(1, Math.min(4, ui.zoom * f)); if (ui.zoom === 1) ui.pan = [0, 0]; applyZoom(); };
    $("#zIn").addEventListener("click", () => zoomBy(1.25)); $("#zOut").addEventListener("click", () => zoomBy(0.8)); $("#zFit").addEventListener("click", () => { ui.zoom = 1; ui.pan = [0, 0]; applyZoom(); });
    $("#acceptHi").addEventListener("click", () => { let n = 0; C.buildMarkups(p).forEach((m) => { if (m.status === "None" && m.conf >= 0.85) { C.state.status[m.key] = "Accepted"; n++; } }); draw(); Side(); List(); toast(n ? `Accepted ${n} high-confidence markups. Low-confidence items are still waiting for you.` : "Nothing left at or above 85%"); });
    $("#markRev").addEventListener("click", () => { ui.photoStatus[p.id] = "reviewed"; toast(`${p.id} marked reviewed`); Workspace(p.id); });

    if (ui.ro) ui.ro.disconnect(); ui.ro = new ResizeObserver(() => layout()); ui.ro.observe(canvas);
    ws.keys = (e) => {
      if (e.target.matches("input,textarea,select")) return;
      const idx = FT.photos.findIndex((q) => q.id === p.id);
      if (e.key === "j" || e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go("#/ws/" + FT.photos[(idx + 1) % FT.photos.length].id); }
      else if (e.key === "k" || e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go("#/ws/" + FT.photos[(idx - 1 + FT.photos.length) % FT.photos.length].id); }
      else if (e.key === "1") setMode("orig"); else if (e.key === "2") setMode("split"); else if (e.key === "3") setMode("mark");
      else if (e.key === "m" || e.key === "M") toggleList();
      else if (e.key === "Escape") { ui.selected = null; draw(); Side(); List(); }
      else if (ui.selected && (e.key === "a" || e.key === "A")) setStatus(ui.selected, "Accepted");
      else if (ui.selected && (e.key === "r" || e.key === "R")) setStatus(ui.selected, "Rejected");
      else if (ui.selected && (e.key === "h" || e.key === "H")) { C.state.hidden[ui.selected] = !C.state.hidden[ui.selected]; draw(); Side(); List(); }
    };
    setMode(ui.mode); layout(); draw(first); Side(); List();
    requestAnimationFrame(layout);
  }
  function ws() {}
  document.addEventListener("keydown", (e) => { if (document.body.dataset.view === "ws" && ws.keys) ws.keys(e); });
  const layerColor = (l) => ({ fittings: "#e8edf1", valves: "#ffb020", supports: "#8fd3ff", dims: "#3fd0ff", issues: "#ff3b30", labels: "#cbd5df", runs: "#cbd5df" }[l] || "#999");

  /* ---------------- material / OD / valve / instrument property blocks ---------------- */
  function matChips(p) {
    const n = {}; p.runs.forEach((r) => (n[r.material] = (n[r.material] || 0) + 1));
    return C.MAT_ORDER.filter((k) => n[k]).map((k) => `<span class="mchip" style="--c:${C.matColor(k)}">${k === "COMP" ? [...new Set(p.runs.filter((r) => r.material === "COMP").map((r) => r.matSub || "COMP"))].join("/") : C.matInfo(k).short}<b>${n[k]}</b></span>`).join("");
  }
  const MAT_OPTS = [["CS", "", "Carbon steel"], ["SS", "", "Stainless steel"], ["CU", "", "Copper"], ["GALV", "", "Galvanized steel"], ["COMP", "PEX", "PEX"], ["COMP", "CPVC", "CPVC"], ["COMP", "PVC", "PVC"], ["COMP", "GRE/GRP", "GRE / GRP (fibreglass)"], ["COMP", "Lined", "Lined steel (PTFE/PP)"], ["UNK", "", "Unknown"]];
  function runProps(p, r) {
    const mi = C.matInfo(r.material); const low = C.isLowMat(r); const edited = !!C.state.orig[p.id + ":" + r.id];
    const sc = C.scaleOf(p);
    return `
      <div class="pblock mat">
        <div class="pb-h"><span class="sw" style="background:${mi.color}"></span>Material <em class="sug">${r.matConf >= 1 && edited ? "set by reviewer" : "suggested"}</em></div>
        <div class="pb-big">${esc(C.matName(r))} <span class="${low ? "lowtxt" : ""}">${C.pct(r.matConf || 0)}${low ? " · verify" : ""}</span></div>
        ${r.matCues && r.matCues.length ? `<ul class="cues">${r.matCues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
        ${r.matAlt && r.matAlt.length ? `<div class="alt">Could also be: ${r.matAlt.map(esc).join(", ")}</div>` : ""}
        ${r.concealed ? `<div class="alt warn">Insulation or jacket hides the pipe, so the material is inferred from the service and neighbouring runs.</div>` : ""}
        <div class="kv"><span>Override</span><select id="matSel"><option value="">Choose…</option>${MAT_OPTS.map(([k, sub, l]) => `<option value="${k}:${sub}">${l}</option>`).join("")}</select></div>
        ${edited ? `<button class="link" id="matReset">Reset to AI suggestion</button>` : ""}
      </div>
      <div class="pblock od">
        <div class="pb-h">Size · OD · wall</div>
        <div class="kv"><span>Nominal size</span><b>${esc(r.size)} <select id="sizeSel" class="inl"><option value="">set…</option>${C.SIZES.map((z) => `<option>${esc(z)}</option>`).join("")}</select></b></div>
        <div class="kv"><span>OD</span><b>${esc(C.odText(r))}</b></div>
        <div class="kv"><span>OD convention</span><b>${esc(r.odClass || "unknown")}</b></div>
        <div class="kv"><span>Schedule / wall</span><b class="lowtxt">${esc(C.schedText(r))}</b></div>
        ${r.schedBasis ? `<div class="alt">Basis: ${esc(r.schedBasis)}</div>` : ""}
        <div class="alt flag">⚠ Wall is not visible from the photo. Pressure / temperature rating and remaining corrosion allowance depend on it. Verify.</div>
        ${!p.iso ? `<div class="kv col"><span>Scale for lengths</span><b>${sc ? esc(sc.text) : "Not set: lengths are left out of the takeoff"}</b></div>
        ${r.wpx && !r.concealed ? `<button class="btn sm" id="calBtn">Use ${r.id} as the scale (${esc(r.size)})</button>` : r.concealed ? `<div class="alt">Insulated or jacketed: can't be used as a scale reference.</div>` : ""}` : ""}
      </div>`;
  }
  function itemProps(it) {
    if (it.kind === "instrument") {
      const ins = FT.instruments[it.inst] || {};
      return `<div class="pblock inst"><div class="pb-h">Instrument</div>
        <div class="kv"><span>Type</span><b>${esc(ins.name || "Unclassified")} · ${esc(it.type)}</b></div>
        <div class="kv"><span>Tag</span><b class="mono">${it.tag ? esc(it.tag) : "Not legible"}</b></div>
        <div class="kv"><span>Model / range</span><b class="lowtxt">Not read: never assumed</b></div>
        ${it.bodyNote ? `<div class="alt">${esc(it.bodyNote)}</div>` : ""}</div>`;
    }
    if (it.operator || it.family) {
      return `<div class="pblock valve"><div class="pb-h">Valve: what the photo shows</div>
        <div class="kv"><span>Operator (visible)</span><b>${esc(it.operator || "—")}</b></div>
        <div class="kv"><span>Stem motion</span><b>${esc(it.stem || "Not visible")}</b></div>
        <div class="kv"><span>Family</span><b>${esc(it.family === "unknown" || !it.family ? "Not asserted" : it.family)}</b></div>
        <div class="kv"><span>Body style</span><b class="lowtxt">Not determinable from outside</b></div>
        ${it.bodyNote ? `<div class="alt">${esc(it.bodyNote)}</div>` : ""}
        <div class="alt flag">A rotating stem points to the quarter-turn family; a rising stem to the multi-turn family. Field Trace doesn't pick ball vs. butterfly or globe vs. plug.</div></div>`;
    }
    return "";
  }
  function AsBuiltHeld(p, lens) {
    const sc = C.scaleOf(p);
    view.innerHTML = `
    <section class="ab">
      <div class="toolbar">
        <div class="seg">${FT.photos.map((q) => `<a href="#/asbuilt/${q.id}" class="${q.id === p.id ? "on" : ""}${q.iso ? "" : " noiso"}">${q.id}</a>`).join("")}</div>
        <div class="tb-title"><b>As-built held</b> for ${p.id}</div>
        <div class="tb-actions"><a class="btn sm" href="#/ws/${p.id}">← Back to review</a></div>
      </div>
      <div class="ab-body">
        <div class="ab-photo">
          <div class="ab-stage" id="abStage"><img src="${C.photoSrc(p)}" alt=""><svg class="ovl" id="abOvl"></svg></div>
        </div>
        <div class="ab-held">
          <h3>No isometric drafted for this photo</h3>
          <p>${esc(p.isoHeld || "Field Trace drafts an iso only when it has a scale and enough of the routing in frame. This photo is held for a person or a second angle.")}</p>
          <p class="muted">Scale: ${sc ? esc(sc.text) : "not set. In the workspace, select a bare run, confirm its size and click <b>Use as the scale</b>."}</p>
          <table class="runs-t"><thead><tr><th></th><th>Run</th><th>Material</th><th>Size</th><th>OD</th><th>Suggested schedule</th><th>Est. length</th></tr></thead>
          <tbody>${p.runs.map((r) => `<tr><td><span class="sw" style="background:${C.matColor(r.material)}"></span></td><td class="mono">${r.id}</td><td>${esc(C.matShort(r))}${C.isLowMat(r) ? " ?" : ""}</td><td>${esc(r.size)}</td><td class="mono">${esc(C.odText(r))}</td><td>${r.sched ? esc(r.sched) + " <span class='muted'>(verify)</span>" : "—"}</td><td class="mono">${lens[r.id] != null ? C.ftin(lens[r.id]) + " (est.)" : "<span class='muted'>set scale</span>"}</td></tr>`).join("")}</tbody></table>
          <p class="small muted">Wall thickness is not visible in a photo. Schedules are suggestions from stencils, flange class, service and convention.</p>
        </div>
      </div>
    </section>`;
    $("#abStage").style.aspectRatio = `${p.w} / ${p.h}`;
    FTOverlay.render($("#abOvl"), p, { layers: ui.layers, colorBy: "material", only: ["runs", "labels", "valves", "issues"] });
  }

  /* ---------------- AS-BUILT ---------------- */
  function AsBuilt(id) {
    const p = C.photoById(id); ui.lastPhoto = id;
    const lens = C.runLengths(p);
    if (!p.iso) return AsBuiltHeld(p, lens);
    view.innerHTML = `
    <section class="ab">
      <div class="toolbar">
        <div class="seg">${FT.photos.map((q) => `<a href="#/asbuilt/${q.id}" class="${q.id === id ? "on" : ""}${q.iso ? "" : " noiso"}">${q.id}</a>`).join("")}</div>
        <div class="tb-title"><b>As-built isometric</b> drafted from ${p.id}. Hover a run to see it in both views.</div>
        <div class="tb-actions">
          <label class="tog"><input type="checkbox" id="abMk" ${ui.asbuiltMarkups ? "checked" : ""}> Markups on photo</label>
          <a class="btn sm" href="#/ws/${p.id}">← Back to review</a>
          <a class="btn sm primary" href="exports/${p.id}.pdf" target="_blank">Open finished sheet (PDF)</a>
        </div>
      </div>
      <div class="ab-body">
        <div class="ab-photo">
          <div class="ab-stage" id="abStage"><img src="${C.photoSrc(p)}" alt=""><svg class="ovl" id="abOvl"></svg></div>
          <table class="runs-t">
            <thead><tr><th></th><th>Run</th><th>System</th><th>Size</th><th>Material</th><th>Length in drawing</th><th>Conf.</th></tr></thead>
            <tbody>${p.runs.map((r) => `<tr data-run="${r.id}"><td><span class="sw" style="background:${C.sysColor(r.sys)}"></span></td><td class="mono">${r.id}</td><td>${r.sys}</td><td>${esc(r.size)}</td><td>${esc(C.matShort(r))}${C.isLowMat(r) ? " ?" : ""}</td><td class="mono">${lens[r.id] ? C.ftin(lens[r.id]) : "<span class='muted'>not drawn</span>"}</td><td class="mono ${r.conf < C.THRESH ? "lowtxt" : ""}">${C.pct(r.conf)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
        <div class="ab-sheet"><div class="paper"><svg id="isoSvg"></svg></div></div>
      </div>
    </section>`;
    let hot = null;
    const drawAll = () => {
      FTOverlay.render($("#abOvl"), p, { layers: ui.layers, only: ui.asbuiltMarkups ? ["runs", "labels", "valves", "issues"] : ["__none"], hot, onHover: (rid) => setHot(rid && rid.replace("-tag", "")) });
      FTIso.render($("#isoSvg"), p, { hot, onHover: setHot });
      $$(".runs-t tr[data-run]").forEach((tr) => tr.classList.toggle("hot", tr.dataset.run === hot));
      $("#abStage").classList.toggle("has-hot", !!hot); $("#isoSvg").classList.toggle("has-hot", !!hot);
    };
    function setHot(rid) {
      if (rid === hot) return; hot = rid;
      $$("#isoSvg .iso-run").forEach((g) => g.classList.toggle("is-hot", g.dataset.run === hot));
      $$("#abOvl .ft-mk").forEach((g) => g.classList.toggle("is-hot", g.dataset.id === hot || g.dataset.id === hot + "-tag"));
      $$(".runs-t tr[data-run]").forEach((tr) => tr.classList.toggle("hot", tr.dataset.run === hot));
      $("#abStage").classList.toggle("has-hot", !!hot); $("#isoSvg").classList.toggle("has-hot", !!hot);
    }
    $$(".runs-t tr[data-run]").forEach((tr) => { tr.addEventListener("mouseenter", () => setHot(tr.dataset.run)); tr.addEventListener("mouseleave", () => setHot(null)); });
    $("#abMk").addEventListener("change", (e) => { ui.asbuiltMarkups = e.target.checked; drawAll(); });
    const st = $("#abStage"); st.style.aspectRatio = `${p.w} / ${p.h}`;
    drawAll();
  }

  /* ---------------- TAKEOFF ---------------- */
  function Takeoff() {
    const ids = ui.takeoffPhotos.filter((id) => C.photoById(id)); const t = C.takeoff(ids);
    const lf = t.pipe.reduce((s, r) => s + r.lf, 0); const unm = t.pipe.reduce((s, r) => s + r.unmeasured, 0);
    const sum = (cat) => t.parts.filter((r) => r.cat === cat).reduce((s, r) => s + r.qty, 0);
    view.innerHTML = `
    <section class="to">
      <div class="page-head">
        <div><h2>Quantity takeoff</h2><div class="muted">Linear feet by material, size and system, rolled up from the same markups. Reject or correct a markup and the numbers change with it.</div></div>
        <div class="tb-actions"><button class="btn sm" id="dlMk">Markup summary CSV</button><button class="btn sm primary" id="dlTo">Download takeoff CSV</button></div>
      </div>
      <div class="to-body">
        <aside class="to-filter">
          <div class="ph">Photos included</div>
          ${FT.photos.map((p) => `<label class="pchk"><input type="checkbox" value="${p.id}" ${ids.includes(p.id) ? "checked" : ""}><img src="${C.photoSrc(p, true)}" alt=""><span><b>${p.id}</b>${esc(p.title)}</span></label>`).join("")}
          <p class="muted small">Rejected markups are left out. Anything under 70% is still counted but marked <b class="q">verify</b>. Runs on photos with no scale are listed but not measured.</p>
        </aside>
        <div class="to-main">
          <div class="tiles mat-tiles">
            ${t.byMat.map((m) => `<div style="--c:${C.matColor(m.material)}"><b>${m.lf.toFixed(0)}<small> LF</small></b><span>${esc(C.matInfo(m.material).name)}${m.unmeasured ? ` · +${m.unmeasured} run${m.unmeasured > 1 ? "s" : ""} unmeasured` : ""}</span></div>`).join("")}
          </div>
          <div class="tiles">
            <div><b>${lf.toFixed(0)}</b><span>LF of pipe measured${unm ? ` (${unm} runs need a scale)` : ""}</span></div>
            <div><b>${sum("Valves")}</b><span>valves</span></div>
            <div><b>${sum("Instruments")}</b><span>instruments</span></div>
            <div><b>${sum("Fittings")}</b><span>fittings</span></div>
            <div><b>${sum("Hangers, supports & penetrations")}</b><span>supports & penetrations</span></div>
            <div class="${t.issues.length ? "warn" : ""}"><b>${t.issues.length}</b><span>open issues</span></div>
          </div>
          <h3>Pipe <span class="muted">by material → system → size</span></h3>
          <table class="tt"><thead><tr><th></th><th>Material <span class="muted">(suggested)</span></th><th>System</th><th>Size</th><th>OD</th><th>Schedule / wall <span class="muted">(suggested)</span></th><th class="r">LF</th><th>Photos</th><th></th></tr></thead>
          <tbody>${t.pipe.map((r) => `<tr><td><span class="sw" style="background:${C.matColor(r.material)}"></span></td><td><b>${esc(r.short)}</b> <span class="muted">${esc(r.material === "COMP" ? "composite / plastic" : C.matInfo(r.material).name)}</span></td><td>${r.sys}${r.sys !== "UNK" ? ` <span class="muted">${esc(C.sysName(r.sys))}</span>` : ""}</td><td>${esc(r.size)}</td><td class="mono">${esc(r.od || r.odClass || "—")}</td><td>${r.sched ? esc(r.sched) + ' <span class="q">verify</span>' : '<span class="muted">—</span>'}</td><td class="r mono">${r.lf ? r.lf.toFixed(1) : ""}${r.unmeasured ? `<span class="muted small"> ${r.lf ? "+" : ""}${r.unmeasured} unmeasured</span>` : ""}</td><td class="mono small">${[...r.photos].join(" ")}</td><td>${r.low || r.lowMat ? `<span class="q">${r.lowMat ? "verify material" : "verify"}</span>` : ""}</td></tr>`).join("")}</tbody></table>
          <p class="foot-note">Wall thickness is not visible in a photo. Schedules are suggested from stencils, flange class, service and material/OD convention. Pressure and temperature rating, and remaining corrosion allowance, depend on the wall and must be verified.</p>
          <h3>Valves, instruments, fittings & supports</h3>
          <table class="tt"><thead><tr><th>Category</th><th>Item</th><th>What the photo supports</th><th>Size</th><th class="r">Qty</th><th>Photos</th><th></th></tr></thead>
          <tbody>${t.parts.map((r) => `<tr><td class="muted">${esc(r.cat)}</td><td>${esc(r.type)}</td><td class="small">${esc(r.detail || "")}</td><td>${esc(r.size)}</td><td class="r mono">${r.qty}</td><td class="mono small">${[...r.photos].join(" ")}</td><td>${r.low ? '<span class="q">verify</span>' : ""}</td></tr>`).join("")}</tbody></table>
          <h3>Open issues</h3>
          <table class="tt"><thead><tr><th>Photo</th><th>Severity</th><th>Issue</th><th>Comment</th></tr></thead>
          <tbody>${t.issues.map((x) => `<tr><td class="mono"><a href="#/ws/${x.pid}">${x.pid}</a></td><td><span class="sev s-${x.sev.toLowerCase()}">${x.sev}</span></td><td><b>${esc(x.title)}</b></td><td class="muted">${esc(x.text)}</td></tr>`).join("")}</tbody></table>
        </div>
      </div>
    </section>`;
    $$(".pchk input").forEach((i) => i.addEventListener("change", () => { ui.takeoffPhotos = $$(".pchk input:checked").map((x) => x.value); Takeoff(); }));
    $("#dlTo").addEventListener("click", () => { download("field-trace-takeoff.csv", C.takeoffCSV(ids)); toast("Takeoff CSV downloaded"); });
    $("#dlMk").addEventListener("click", () => { download("field-trace-markup-summary.csv", C.markupCSV(ids)); toast("Markup summary CSV downloaded"); });
  }

  /* ---------------- EXPORT ---------------- */
  function Export() {
    const prepared = FT.photos.filter((p) => !p.upload), ups = FT.photos.filter((p) => p.upload);
    view.innerHTML = `
    <section class="ex">
      <div class="page-head">
        <div><h2>Export</h2><div class="muted">One finished 11×17 sheet per photo: the photo with editable markups, the as-built iso where one was drafted, and a title block. Built for ${esc(FT.product.revu)}. Opens in Acrobat too.</div></div>
        <div class="tb-actions"><a class="btn sm" href="exports/field-trace-markup-summary.csv" download>Markup summary CSV</a><a class="btn sm" href="exports/field-trace-takeoff.csv" download>Takeoff CSV</a><a class="btn sm primary" href="exports/Field-Trace-Sample-Set.pdf" target="_blank">Full set PDF (${prepared.length + 2} pages)</a></div>
      </div>
      <div class="ex-body">
        <div class="sheets">
          ${ups.map((p) => `<div class="sheet-card st-live">
            <a class="prev" href="#/ws/${p.id}"><img src="${C.photoSrc(p)}" alt=""></a>
            <div class="sc-b"><div class="row1"><span class="pid">${p.id}</span><span class="status s-live">Live upload</span></div>
            <div class="ttl">${esc(p.title)}</div>
            <div class="meta">${C.buildMarkups(p).length} markups · this session only</div>
            <div class="sc-a"><button class="btn sm" data-csv="${p.id}">Markups CSV</button><a class="btn sm ghost" href="#/ws/${p.id}">Review</a></div></div>
          </div>`).join("")}
          ${prepared.map((p) => `<div class="sheet-card st-${statusOf(p)}">
            <a class="prev" href="exports/${p.id}.pdf" target="_blank"><img src="assets/previews/${p.id}.png" alt="Preview of ${p.id} sheet" loading="lazy"></a>
            <div class="sc-b"><div class="row1"><span class="pid">${p.id}</span><span class="status s-${statusOf(p)}">${STATUS_LABEL[statusOf(p)]}</span></div>
            <div class="ttl">${esc(p.title)}</div>
            <div class="meta">${C.buildMarkups(p).length} markups · ${p.issues.length} issues${p.iso ? "" : " · no iso (held)"}</div>
            <div class="sc-a"><a class="btn sm" href="exports/${p.id}.pdf" target="_blank">Open PDF</a><a class="btn sm ghost" href="#/ws/${p.id}">Review</a></div></div>
          </div>`).join("")}
        </div>
        <aside class="ex-side">
          <div class="panel"><div class="ph">What's in each PDF</div>
            <ul class="checks">
              <li>Original photo at full resolution, not altered</li>
              <li>Markups saved as standard PDF annotations, so they stay editable. Polylines, callouts, dimensions, clouds and a stamp, each with subject, author, date and comment.</li>
              <li>Pipe tags carry system, size and <b>suggested material</b>. Comments carry OD and the suggested schedule, flagged to verify.</li>
              <li>Markups sorted onto PDF layers: Pipe Runs, Fittings, Valves & Instruments, Hangers & Supports, Dimensions, Issues, Labels</li>
              <li>As-built iso and title block as vector linework, where an iso was drafted</li>
            </ul></div>
          <div class="panel"><div class="ph">Live uploads</div>
            <p class="small">Uploaded photos are analysed on the server and the result is kept in this browser only (not stored on the server). They aren't in the prepared PDF set. Download their markups or takeoff as CSV.</p></div>
          <div class="panel"><div class="ph">Check in Revu 21.11 before the meeting</div>
            <ol class="small steps-num"><li>Open <code>exports/FT-07.pdf</code> (mixed materials)</li><li>Open the Markups list and check subject, author and comments</li><li>Check the layers panel for the seven markup layers</li><li>Change a status, edit a callout, then save</li></ol></div>
        </aside>
      </div>
    </section>`;
    $$("[data-csv]").forEach((b) => b.addEventListener("click", () => { download(`field-trace-${b.dataset.csv}-markups.csv`, C.markupCSV([b.dataset.csv])); toast("Markups CSV downloaded"); }));
  }

  /* ---------------- chrome ---------------- */
  $("#credits").addEventListener("click", () => {
    const m = $("#modal");
    m.innerHTML = `<div class="modal-card"><button class="x" id="mx">×</button><h3>Photo credits & sample data</h3>
      <p class="muted">These are public, licensed photos from Wikimedia Commons, used to show the shape of the tool. <b>They are not the prospect's job photos.</b> The markups on them were prepared to show the output; they were not produced live by a model. Project names, dates, tags and confidence values are sample data. FT-07 was cropped and resized.</p>
      <table class="tt"><thead><tr><th>ID</th><th>Photo</th><th>Author</th><th>License</th></tr></thead><tbody>
      ${FT.photos.filter((p) => !p.upload).map((p) => `<tr><td class="mono">${p.id}</td><td><a href="${p.credit.url}" target="_blank" rel="noopener">${esc(p.credit.title)}</a></td><td>${esc(p.credit.author)}</td><td>${esc(p.credit.license)}</td></tr>`).join("")}
      </tbody></table></div>`;
    m.classList.add("show");
    m.onclick = (e) => { if (e.target === m || e.target.id === "mx") m.classList.remove("show"); };
  });
  /* ---------------- persistence: uploads + review decisions survive a reload (this browser only) ---------------- */
  const LS_UP = "ft.uploads.v1", LS_REV = "ft.review.v1";
  function saveUploads() {
    let ups = FT.photos.filter((p) => p.upload);
    for (; ups.length; ups = ups.slice(1)) { try { localStorage.setItem(LS_UP, JSON.stringify(ups)); return; } catch (e) { /* quota: drop the oldest */ } }
    try { localStorage.removeItem(LS_UP); } catch (e) {}
  }
  function saveReview() {
    try { localStorage.setItem(LS_REV, JSON.stringify({ status: C.state.status, comment: C.state.comment, hidden: C.state.hidden, photoStatus: ui.photoStatus })); } catch (e) {}
  }
  function loadSaved() {
    try { (JSON.parse(localStorage.getItem(LS_UP) || "[]") || []).forEach((p) => { if (p && p.id && !C.photoById(p.id)) { FT.photos.push(p); ui.takeoffPhotos.push(p.id); } }); } catch (e) {}
    try { const r = JSON.parse(localStorage.getItem(LS_REV) || "null"); if (r) { Object.assign(C.state.status, r.status || {}); Object.assign(C.state.comment, r.comment || {}); Object.assign(C.state.hidden, r.hidden || {}); Object.assign(ui.photoStatus, r.photoStatus || {}); } } catch (e) {}
  }
  loadSaved();
  window.addEventListener("hashchange", saveReview); window.addEventListener("pagehide", saveReview);
  document.addEventListener("click", () => setTimeout(saveReview, 0), true);

  $("#reset").addEventListener("click", () => { if (!confirm("Reset all review decisions (accept / reject / status) back to the first pass? Uploads are kept.")) return; C.resetOverrides(); C.state.status = {}; C.state.comment = {}; C.state.hidden = {}; C.state.colorBy = "system"; ui.photoStatus = {}; ui.seen = {}; ui.demoReturn = null; ui.takeoffPhotos = FT.photos.map((p) => p.id); saveReview(); toast("Review reset (uploads kept)"); route(); });

  /* signed-in user + engine, shown in the header and on the inbox */
  (async () => {
    try {
      const r = await fetch("/api/session", { credentials: "same-origin" });
      if (r.status === 401) { location.href = "/login"; return; }
      if (r.ok) { const js = await r.json(); ui.engine = js.engine || { kind: "local-cv" }; const u = $("#whoUser"); if (u && js.user) u.textContent = js.user; }
    } catch (e) { ui.engine = { kind: "local-cv" }; }
    const el = $("#engLine"); if (el) el.innerHTML = engineLine();
    if (window.FTDemo) FTDemo.setEngine(ui.engine);
  })();

  /* public hooks for the demo page */
  window.FTApp = { ui, go, toast, route, statusOf,
    addUpload(p) { FT.photos.push(p); ui.takeoffPhotos.push(p.id); saveUploads(); },
    clearUploads() { for (let i = FT.photos.length - 1; i >= 0; i--) if (FT.photos[i].upload) FT.photos.splice(i, 1); ui.takeoffPhotos = ui.takeoffPhotos.filter((id) => C.photoById(id)); if (ui.lastPhoto && !C.photoById(ui.lastPhoto)) ui.lastPhoto = null; try { localStorage.removeItem(LS_UP); } catch (e) {} } };
  route();
})();
