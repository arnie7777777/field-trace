/* Field Trace — printable sheets. sheet.html#FT-01 (photo sheet), #cover, #takeoff.
 * The photo is printed clean; markups are added afterwards as real, editable PDF annotations by tools/build_exports.py. */
(function () {
  const C = window.FTCore, FT = C.FT, esc = C.esc;
  const page = document.getElementById("page");
  const which = decodeURIComponent(location.hash.slice(1)) || "FT-01";
  const IN = (v) => v + "in";
  const box = (cls, x, y, w, h, html) => `<div class="abs ${cls}" style="left:${IN(x)};top:${IN(y)};width:${IN(w)};height:${IN(h)}">${html || ""}</div>`;
  const frame = (right) => `<div class="frame"></div>` + box("hdr", 0.55, 0.45, 15.9, 0.4, `<div class="l">Field Trace<span>${right}</span></div><div class="r">Mimetic Technology prototype · <b>sample data — not for construction</b></div>`);

  function photoSheet(p) {
    const [bx, by, bw, bh] = FT.sheet.photoBox;
    const s = Math.min(bw / p.w, bh / p.h), dw = p.w * s, dh = p.h * s, dx = (bw - dw) / 2, dy = (bh - dh) / 2;
    const ms = C.buildMarkups(p);
    const half = Math.ceil(ms.length / 2);
    const row = (m) => `<tr class="${m.layer === "issues" ? "iss" : ""} ${m.conf < C.THRESH ? "low" : ""}"><td><span class="sw" style="background:${m.sys ? C.sysColor(m.sys) : m.layer === "issues" ? "#ff3b30" : m.layer === "valves" ? "#ffb020" : m.layer === "dims" ? "#3fd0ff" : "#9aa8b4"}"></span>${esc(m.subject)}</td><td>${esc(m.label)}</td><td>${esc((FT.layers.find((l) => l.id === m.layer) || {}).name)}</td><td>${esc(m.status)}</td><td class="c">${C.pct(m.conf)}</td></tr>`;
    const tbl = (rows) => `<table><thead><tr><th>Subject</th><th>Label</th><th>Layer</th><th>Status</th><th>Conf.</th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table>`;
    const used = [...new Set(p.runs.map((r) => r.sys))].filter((k) => k !== "UNK" || p.runs.every((r) => r.sys === "UNK") === false);
    const mats = C.MAT_ORDER.filter((k) => p.runs.some((r) => r.material === k));
    const notes = p.iso ? p.iso.notes : [p.isoHeld || "No isometric drafted for this photo.", "SCHEDULES ARE SUGGESTED. WALL IS NOT VISIBLE IN A PHOTO. VERIFY"];
    const held = `<div class="held"><h4>As-built isometric: held</h4><p>${esc(p.isoHeld || "")}</p><table><thead><tr><th>Run</th><th>Material (sugg.)</th><th>Size</th><th>OD</th><th>Schedule (sugg.)</th></tr></thead><tbody>${p.runs.map((r) => `<tr><td>${r.id}</td><td>${esc(C.matShort(r))}${C.isLowMat(r) ? " ?" : ""}</td><td>${esc(r.size)}</td><td>${esc(C.odText(r))}</td><td>${esc(r.sched || "—")}</td></tr>`).join("")}</tbody></table><p class="sm">Wall thickness is not visible from a photo. Rating and corrosion allowance need verification.</p></div>`;
    const html = frame(`Annotated field photo + as-built isometric · ${p.id}`) +
      box("photo", bx, by, bw, bh, `<img src="assets/photos/${p.file}" style="left:${IN(dx)};top:${IN(dy)};width:${IN(dw)};height:${IN(dh)}">`) +
      box("cap", bx, by + bh + 0.06, bw, 0.2, `<div>Field photo ${p.id} · ${esc(p.location)} · ${esc(p.taken)}</div><div><span>Markups = editable PDF annotations · author: Field Trace AI</span></div>`) +
      box(ms.length > 32 ? "mk dense" : "mk", bx, 8.0, bw, 2.55, `<h4>Markup summary — ${ms.length} markups · ${p.issues.length} issues · ${ms.filter((m) => m.conf < C.THRESH).length} below 70%</h4><div class="cols">${tbl(ms.slice(0, half))}${tbl(ms.slice(half))}</div>`) +
      box(p.iso ? "iso" : "iso heldbox", 9.5, 0.95, 7.0, 5.894, p.iso ? `<svg id="iso"></svg>` : held) +
      box("cap", 9.5, 6.9, 7.0, 0.2, p.iso ? `<div>As-built isometric — ${esc(p.title)}</div><div><span>N.T.S. · derived from photo ${p.id} · dimensions estimated</span></div>` : `<div>Run schedule — ${esc(p.title)}</div><div><span>No iso drafted · materials and schedules suggested</span></div>`) +
      box("blk", 9.5, 7.2, 2.6, 1.2, `<h4>General notes</h4><ol>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol>`) +
      box("blk", 12.25, 7.2, 2.05, 1.2, `<h4>Legend</h4><div class="lg">${used.filter((k) => k !== "UNK").map((k) => `<i style="--c:${C.sysColor(k)}"></i><span>${k} — ${esc(C.sysName(k))}</span>`).join("")}${mats.map((k) => `<i style="--c:${C.matColor(k)}"></i><span>${C.matInfo(k).short} — ${esc(C.matInfo(k).name)} (sugg.)</span>`).join("")}<i class="d"></i><span>Below 70% — verify</span></div>`) +
      box("blk", 14.45, 7.2, 2.05, 1.2, `<h4>Revision clouds</h4>${p.issues.length ? p.issues.map((x, i) => `<div class="iss">△${i + 1} ${esc(x.title)} <span style="font-weight:400">(${x.sev})</span></div>`).join("") : "<div>None</div>"}`) +
      box("", 9.5, 8.5, 7.0, 2.05, titleBlock(p));
    page.innerHTML = `<div class="pg">${html}</div>`;
    if (p.iso) FTIso.render(document.getElementById("iso"), p, { bare: true });
  }

  function titleBlock(p) {
    return `<div class="tb">
      <div class="brand"><span class="n">FIELD TRACE</span><span class="m">MIMETIC TECHNOLOGY · MIMETICTECH.AI<br>80/20 SOFTWARE · PROTOTYPE</span></div>
      <div class="s4"><label>Project</label><b>${esc(FT.project.name)} (${esc(FT.project.number)})</b></div>
      <div class="s2"><label>Prepared by</label><b>MIMETIC TECHNOLOGY</b></div>
      <div class="s4"><label>Drawing title</label><b>AS-BUILT — ${esc(p.title.toUpperCase())}</b></div>
      <div class="s2"><label>Location</label><b>${esc(p.location)}</b></div>
      <div class="s2"><label>Source photo</label><b>${p.id} · ${esc(p.taken)}</b></div>
      <div><label>Drawn</label><b>FIELD TRACE AI</b></div>
      <div><label>Checked</label><b>${p.status === "reviewed" ? esc(FT.project.reviewer.toUpperCase()) : "—"}</b></div>
      <div><label>Scale</label><b>N.T.S.</b></div>
      <div><label>Rev</label><b>${p.status === "reviewed" ? "0" : "A"}</b></div>
      <div class="s4 st"><label>Status</label><b>${p.status === "reviewed" ? "REVIEWED — ISSUED AS-BUILT" : p.status === "attention" ? "HELD — NEEDS FIELD VERIFICATION" : "DRAFT — FOR REVIEW IN BLUEBEAM REVU 21.11"}</b></div>
      <div class="s2 sheet"><label>Sheet</label><b>${p.id}</b></div>
      <div class="warn">SAMPLE DATA · PUBLIC LICENSED PHOTO · NOT A CLIENT JOB PHOTO · NOT FOR CONSTRUCTION</div>
    </div>`;
  }

  function cover() {
    const rows = FT.photos.map((p, i) => `<tr><td class="mono">${i + 2}</td><td class="mono">${p.id}</td><td>${esc(p.title)}</td><td>${esc(p.location)}</td><td>${C.buildMarkups(p).length}</td><td>${p.issues.length}</td><td>${p.status === "reviewed" ? "Reviewed" : p.status === "attention" ? "Needs attention" : "Draft — for review"}</td></tr>`).join("");
    const html = frame("Sample set · cover") + `
      <div class="abs cv" style="left:.8in;top:1.2in;width:7.2in">
        <h1>Field Trace</h1><div class="sub">AI markup assist for Bluebeam Revu 21 — sample output set</div>
        <div style="height:.3in"></div>
        <p>This set shows what Field Trace would produce from a batch of piping photos. Each sheet pairs the original field photo, carrying <b>editable markups</b> (standard PDF annotations: polylines, callouts, dimensions, revision clouds and a stamp, on named layers), with an <b>as-built isometric</b> drafted from the same traced geometry. The last page rolls the accepted markups up into a quantity takeoff.</p>
        <p>The markups are a first pass. They are meant to be reviewed, corrected and signed off in Bluebeam Revu 21.11 by the person who does this work today. Anything under 70% confidence is dashed and flagged for verification. A photo that is too uncertain is held instead of auto-drafted (see FT-06).</p>
        <p>Materials (carbon steel, stainless, copper, galvanized, composite / plastic such as PEX, CPVC, GRE/GRP and lined pipe) are <b>suggested</b> from visible cues and printed text, with lower confidence on painted or insulated pipe. OD can be estimated from a photo with a scale reference. Wall thickness cannot: any schedule shown is a suggestion to verify. Valves are identified by operator and stem-motion family only, and instruments by type only.</p>
        <p class="small">Bluebeam OCR can make text in a photo searchable, such as stencils, tags and stamps. Field Trace works from the pipe geometry itself: it traces runs, places symbols and dimensions, and drafts the drawing. Field Trace is a Mimetic Technology prototype. It is not a Bluebeam product.</p>
        <div style="height:.15in"></div>
        <h3>Photo credits</h3>
        <table><tbody>${FT.photos.map((p) => `<tr><td class="mono">${p.id}</td><td>${esc(p.credit.title)}</td><td>${esc(p.credit.author)}</td><td>${esc(p.credit.license)}</td></tr>`).join("")}</tbody></table>
        <p class="small" style="margin-top:.08in">All photos are from Wikimedia Commons (FT-07 cropped and resized). They are not client job photos. The markups were prepared to show the output; they are not live model results. Project names, dates, tags and confidence values are sample data.</p>
      </div>
      <div class="abs cv" style="left:8.6in;top:1.2in;width:7.6in">
        <h3>Sheet index</h3>
        <table><thead><tr><th>Pg</th><th>Sheet</th><th>Title</th><th>Location</th><th>Markups</th><th>Issues</th><th>Status</th></tr></thead><tbody>
        <tr><td class="mono">1</td><td class="mono">COVER</td><td>Cover, index, credits</td><td></td><td></td><td></td><td></td></tr>${rows}
        <tr><td class="mono">${FT.photos.length + 2}</td><td class="mono">TAKEOFF</td><td>Quantity takeoff — all photos</td><td></td><td></td><td></td><td></td></tr></tbody></table>
        <div style="height:.25in"></div>
        <h3>Markup layers</h3>
        <table><tbody>${FT.layers.map((l) => `<tr><td>${esc(l.name)}</td><td class="small">${{ runs: "Polyline along each pipe centerline, colored by system", fittings: "Elbows, tees, couplings, flanges, caps", valves: "Valves (operator + family, never body style), instruments (type; model / range not assumed), equipment", supports: "Hangers, strut, penetrations / firestop", dims: "Dimensions with basis noted (CMU coursing, pipe OD)", issues: "Revision clouds with comments (punch / QA)", labels: "System + size + suggested material tags, pipe markers read, stamp" }[l.id]}</td></tr>`).join("")}</tbody></table>
        <div style="height:.25in"></div>
        <h3>System legend</h3>
        <table><tbody>${Object.entries(FT.systems).filter(([k]) => FT.photos.some((p) => p.runs.some((r) => r.sys === k))).map(([k, s]) => `<tr><td style="width:.5in"><span style="display:inline-block;width:.35in;height:5px;background:${s.color}"></span></td><td class="mono">${k}</td><td>${esc(s.name)}</td></tr>`).join("")}</tbody></table>
      </div>`;
    page.innerHTML = `<div class="pg">${html}</div>`;
  }

  function takeoffPage() {
    const t = C.takeoff(FT.photos.map((p) => p.id));
    const html = frame("Quantity takeoff · all photos") + `
      <div class="abs cv tk" style="left:.8in;top:1.05in;width:7.6in">
        <h3>Pipe — by material / system / size</h3>
        <table><thead><tr><th>Material (sugg.)</th><th>System</th><th>Size</th><th>OD</th><th>Sched. (sugg.)</th><th class="r">LF</th><th>Photos</th><th></th></tr></thead><tbody>
        ${t.pipe.map((r) => `<tr><td><span style="display:inline-block;width:8px;height:8px;background:${C.matColor(r.material)};margin-right:4px;outline:.5px solid #333"></span><b>${esc(r.short)}</b></td><td>${r.sys}</td><td>${esc(r.size)}</td><td class="mono">${esc(r.od || "—")}</td><td>${esc(r.sched || "—")}</td><td class="r mono">${r.lf ? r.lf.toFixed(1) : "—"}${r.unmeasured ? "*" : ""}</td><td class="mono">${[...r.photos].join(" ")}</td><td>${r.low || r.lowMat ? '<span class="q">verify</span>' : ""}</td></tr>`).join("")}
        <tr><td colspan="5"><b>Total measured</b></td><td class="r mono"><b>${t.pipe.reduce((s, r) => s + r.lf, 0).toFixed(1)}</b></td><td></td><td></td></tr>
        ${t.byMat.map((m) => `<tr><td colspan="5" class="small">${esc(C.matInfo(m.material).name)}</td><td class="r mono small">${m.lf.toFixed(1)}</td><td colspan="2" class="small">${m.unmeasured ? m.unmeasured + " run(s) not measured" : ""}</td></tr>`).join("")}</tbody></table>
        <p class="small">* includes runs on photos with no scale (not measured, not guessed). Schedules are suggestions: the wall is not visible in a photo, so pressure / temperature rating and remaining corrosion allowance must be verified.</p>
        <div style="height:.25in"></div>
        <h3>Open issues</h3>
        <table><thead><tr><th>Photo</th><th>Severity</th><th>Issue</th><th>Comment</th></tr></thead><tbody>
        ${t.issues.map((x) => `<tr><td class="mono" style="white-space:nowrap">${x.pid}</td><td>${x.sev}</td><td style="white-space:nowrap"><b>${esc(x.title)}</b></td><td class="small">${esc(x.text.length > 95 ? x.text.slice(0, 92) + "…" : x.text)}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="abs cv tk" style="left:8.7in;top:1.05in;width:7.6in">
        <h3>Valves, instruments, fittings &amp; supports</h3>
        <table><thead><tr><th>Category</th><th>Item</th><th>Size</th><th class="r">Qty</th><th>Photos</th><th></th></tr></thead><tbody>
        ${t.parts.map((r) => `<tr><td class="small">${esc(r.cat)}</td><td>${esc(r.type)}${r.detail ? ` <span class="dt">· ${esc(r.detail)}</span>` : ""}</td><td>${esc(r.size)}</td><td class="r mono">${r.qty}</td><td class="mono">${[...r.photos].join(" ")}</td><td>${r.low ? '<span class="q">verify</span>' : ""}</td></tr>`).join("")}</tbody></table>
        <p class="small" style="margin-top:.12in">Lengths are taken from the as-built model drafted from each photo, or from a confirmed pipe size used as a scale, with estimated dimensions. Rejected markups are left out. Items under 70% confidence are counted and flagged. Not for bidding. This shows how the takeoff would roll up.</p>
      </div>`;
    page.innerHTML = `<div class="pg">${html}</div>`;
  }

  if (which === "cover") cover();
  else if (which === "takeoff") takeoffPage();
  else photoSheet(C.photoById(which) || FT.photos[0]);
  document.fonts.ready.then(() => document.body.setAttribute("data-ready", "1"));
})();
