/* Field Trace — the Demo page: ONE page, tabs across the top (#/demo/<tab>), plus the shared live
 * photo upload (POST /api/analyze) used by the Inbox too.
 * Keys (Demo page only): → / N next tab · ← / P previous · F present full screen · Esc leave present. */
(function () {
  const C = window.FTCore, FT = C.FT, esc = C.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const P = (id) => C.photoById(id);
  const st = { step: 1, last: null, busy: false, engine: null, view: null };
  const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const MAX = 15 * 1024 * 1024;

  /* crop a region of a prepared photo into a swatch (CSS background, no extra files) */
  function crop(pid, box, W, H) {
    const p = P(pid); const [x0, y0, x1, y1] = box; const s = Math.max(W / (x1 - x0), H / (y1 - y0));
    const ox = -(x0 + x1) / 2 * s + W / 2, oy = -(y0 + y1) / 2 * s + H / 2;
    return `<span class="crop" style="width:${W}px;height:${H}px;background-image:url('${C.photoSrc(p)}');background-size:${(p.w * s).toFixed(0)}px ${(p.h * s).toFixed(0)}px;background-position:${ox.toFixed(0)}px ${oy.toFixed(0)}px"></span>`;
  }
  const open = (pid, opts) => `<a class="jump" href="#/ws/${pid}" data-jump="${pid}"${opts && opts.color ? ` data-color="${opts.color}"` : ""}>${opts && opts.label ? esc(opts.label) : "Open " + pid + " in the workspace"} →</a>`;

  const MATS = [
    { k: "CS", title: "Carbon steel", crop: ["FT-07", [560, 545, 760, 610]], also: ["FT-01", "FT-02", "FT-03", "FT-05"], how: "Black mill scale or paint, welded / threaded / grooved / flanged joints, rust at cut ends. Stencils like \"A53\" or \"A106\" make it certain.", watch: "Painted pipe hides the base metal, so the confidence drops and galvanized stays listed as an alternative." },
    { k: "SS", title: "Stainless steel", crop: ["FT-08", [925, 280, 1020, 420]], also: ["FT-11"], how: "Bright unpainted metal with long highlights, thin wall, orbital welds or ferrules, process setting. Mill marks like \"304L\" / \"316L\" confirm.", watch: "Aluminium insulation jacket can look the same. A magnet test separates it from galvanized (austenitic stainless is mostly non-magnetic)." },
    { k: "CU", title: "Copper (Type K / L / M)", crop: ["FT-07", [440, 360, 530, 470]], also: ["FT-04", "FT-06", "FT-09"], how: "Copper colour and sheen or patina, soldered / brazed / press fittings, soft bends. Print line colour gives the type: K green, L blue, M red.", watch: "K, L and M share one OD, so without the print line the type is a suggestion." },
    { k: "GALV", title: "Galvanized steel", crop: ["FT-07", [1150, 1065, 1330, 1130]], also: ["FT-02"], how: "Matte zinc-grey, sometimes spangled, threaded joints, no rust on the run. A finish change at a coupling flags a material change.", watch: "Weathered stainless and grey paint look similar, so the confidence stays moderate until someone checks." },
    { k: "COMP", title: "Composite & plastic", crop: ["FT-10", [990, 120, 1170, 330]], crop2: ["FT-09", [300, 105, 460, 180]], also: ["FT-09", "FT-10"], how: "PEX (blue / red / white, crimp or expansion fittings), CPVC (orange, solvent weld, print line), GRE / GRP fibreglass (filament-wound texture, bonded joints), lined steel (flanged, lined spool marks).", watch: "Colour alone only suggests the plastic. The print line (\"CPVC SPRINKLER PIPE\", \"PEX-A\") makes it certain, as on FT-10." }
  ];

  const BEATS = [
    { id: "open", t: "Field Trace" }, { id: "today", t: "Today's workflow" }, { id: "ocr", t: "Text vs. tracing" },
    { id: "materials", t: "Materials" }, { id: "limits", t: "Limits" }, { id: "examples", t: "Workspace" },
    { id: "upload", t: "Live upload" }, { id: "review", t: "Review" }, { id: "outputs", t: "Outputs" },
    { id: "export", t: "Export" }, { id: "close", t: "Next step" }
  ];
  const idx = (n) => { const i = BEATS.findIndex((b) => b.id === n); if (i >= 0) return i + 1; const k = parseInt(n, 10); return k >= 1 && k <= BEATS.length ? k : 0; };
  const hashOf = (k) => "#/demo/" + BEATS[k - 1].id;
  const title = (n) => { const k = idx(n); return k ? BEATS[k - 1].t : "Demo"; };

  /* ------------------------------------------------------------------ beats */
  const R = {
    open() {
      return `<div class="b-open">
        <div class="b-copy">
          <div class="eyebrow">Mimetic Technology · 110/20 Software</div>
          <h1>Field Trace</h1>
          <div class="sub">AI markup assist for Bluebeam Revu 21.11</div>
          <p class="lede">Field photos of piping come in. Field Trace does the first pass: it traces each run, tags system, size and <b>material</b>, marks valves and instruments, and clouds what looks wrong. Rose reviews it in Revu. The as-built and the takeoff come from the same markups.</p>
          <ul class="facts">
            <li><b>Carbon steel, stainless, copper, galvanized, composite</b><span>Each one tagged as a suggestion, with the cue it used</span></li>
            <li><b>Honest about what a photo shows</b><span>OD can be estimated; wall thickness can't. Valve bodies are inside the pipe.</span></li>
            <li><b>Editable markups, not a picture</b><span>Standard PDF annotations on named layers, built for Revu 21.11</span></li>
          </ul>
        </div>
        <figure class="b-fig"><div class="stage-fit" data-photo="FT-07" data-color="material" data-anim="1"></div><figcaption>FT-07 · runs coloured by suggested material: <i class="sw" style="background:${C.matColor("CS")}"></i>CS <i class="sw" style="background:${C.matColor("CU")}"></i>CU <i class="sw" style="background:${C.matColor("GALV")}"></i>GALV</figcaption></figure>
      </div>`;
    },
    today() {
      return `<div class="b-today">
        <h2>Rose's day, today</h2>
        <div class="lanes">
          <div class="lane"><div class="lane-name">Today</div><ol class="steps">
            <li><b>Photo arrives</b><span>from the field crew</span></li>
            <li><b>Into a PDF in Revu</b><span>OCR makes stencil and stamp text searchable</span></li>
            <li class="hand"><b>Every markup drawn by hand</b><span>polylines, tags, callouts, dimensions, clouds</span></li>
            <li class="hand"><b>Material and size typed in</b><span>from memory, the spec or the stencil</span></li>
            <li class="hand"><b>As-built and counts done separately</b><span>redrawn and re-counted</span></li></ol></div>
          <div class="lane next"><div class="lane-name">With Field Trace</div><ol class="steps">
            <li><b>Photo arrives</b><span>dropped in a folder or uploaded</span></li>
            <li class="ai"><b>AI first pass</b><span>runs, material, size, valves, instruments, issues, on your layers</span></li>
            <li class="rose"><b>Rose reviews in Revu 21.11</b><span>accept, fix or reject. Anything unsure is flagged "?".</span></li>
            <li><b>Stamp and issue</b><span>the same PDF she produces today</span></li>
            <li class="ai"><b>As-built + takeoff</b><span>LF by material, size and system, from the accepted markups</span></li></ol></div>
        </div>
        <p class="muted">We haven't timed this yet. The plan is to time Rose's real workflow with and without the first pass, on your photos, before quoting any number.</p>
      </div>`;
    },
    ocr() {
      const p = P("FT-05");
      return `<div class="b-ocr">
        <h2>OCR reads the text. Field Trace reads the pipe.</h2>
        <div class="two">
          <div class="pane"><div class="tag">Bluebeam OCR</div><div class="stage-fit" data-photo="FT-05" data-only="none"></div>
            <p>Finds text in the image and makes it searchable:</p><div class="ocrchips">${p.ocrText.map((t) => `<code>${esc(t)}</code>`).join("")}</div></div>
          <div class="pane ai"><div class="tag ai">Field Trace</div><div class="stage-fit" data-photo="FT-05" data-only="runs,labels,valves,issues"></div>
            <p>Uses that same text, then traces the 10" steam header, the pump discharge and the returns. It tags each run, marks the pressure gauge and the handwheel valves, and flags that the arrow is double-headed, so flow direction is not asserted.</p></div>
        </div>
      </div>`;
    },
    materials() {
      return `<div class="b-mat">
        <div class="mat-head">
          <h2>Carbon steel? Stainless? Copper? Galvanized? Composite? <em>Yes, and it shows its reasoning.</em></h2>
          <p>Every run gets a <b>suggested</b> material with a confidence and the cues behind it. Printed text beats colour. Paint, insulation and low light lower the confidence and keep alternatives listed. The tag, the PDF layer properties and the takeoff all carry the material.</p>
        </div>
        <div class="mat-body">
          <figure class="mat-fig"><div class="stage-fit" data-photo="FT-07" data-color="material"></div>
            <figcaption>FT-07: black steel (welded, bent), copper (bent, brass unions) and galvanized (brazed branches) in one frame. ${open("FT-07", { color: "material", label: "Open FT-07" })}</figcaption></figure>
          <div class="mat-cards">${MATS.map((m) => `<div class="mcard" style="--c:${C.matColor(m.k)}">
            <div class="mc-h">${crop(m.crop[0], m.crop[1], 66, 46)}${m.crop2 ? crop(m.crop2[0], m.crop2[1], 66, 46) : ""}<div><b>${esc(m.title)}</b><span class="code">${C.matInfo(m.k).short}${m.k === "COMP" ? " · PEX / CPVC / GRE-GRP / lined" : ""}</span></div></div>
            <p class="how">${esc(m.how)}</p><p class="watch">${esc(m.watch)}</p>
            <div class="seen">On: ${[m.crop[0]].concat(m.also).filter((v, i, a) => a.indexOf(v) === i).map((pid) => `<a href="#/ws/${pid}" data-jump="${pid}" data-color="material">${pid}</a>`).join(" ")}</div></div>`).join("")}
          </div>
        </div>
        <p class="mat-foot">"Composite" here means real product families: GRE / GRP fibreglass, PEX, CPVC and plastic-lined steel. Nothing is guessed when there's no cue: the material is left as "Unknown, verify".</p>
      </div>`;
    },
    limits() {
      const QT = FT.QT, MT = FT.MT;
      return `<div class="b-lim">
        <h2>What a photo can show, and what it can't</h2>
        <div class="three">
          <div class="col">
            <div class="col-h">Pipe OD and wall</div>
            <div class="vis yes"><b>Visible: outside diameter</b><span>Estimated against a known reference (a confirmed pipe, CMU coursing, a fitting). The OD convention depends on the material:</span>
              <table class="mini"><thead><tr><th>2" nominal</th><th>OD</th></tr></thead><tbody><tr><td>Steel / SS (NPS)</td><td class="mono">2.375"</td></tr><tr><td>Copper / PEX (CTS)</td><td class="mono">2.125"</td></tr><tr><td>PVC / CPVC (IPS)</td><td class="mono">2.375"</td></tr></tbody></table></div>
            <div class="vis no"><b>Not visible: wall thickness / schedule</b><span>Only suggested from stencils, flange class, insulation, service and material + OD convention. Always flagged: <em>"${esc(C.SCHED_FLAG)}"</em>.</span></div>
            <div class="vis no"><b>So also: rating and corrosion allowance</b><span>Pressure / temperature rating and remaining corrosion allowance follow from the wall, so they're marked to verify.</span></div>
          </div>
          <div class="col">
            <div class="col-h">Instruments</div>
            <div class="inst-row">${crop("FT-11", [250, 300, 780, 1040], 120, 150)}<div><b>FT-11: pressure transmitter</b><span>Type from housing and process flange. Tag <code>PT-?1032</code> read with one character unclear. Model and range: not read, not assumed.</span>${open("FT-11", { label: "Open FT-11" })}</div></div>
            <ul class="inst-types">${Object.entries(FT.instruments).map(([k, v]) => `<li><i>${v.letter}I</i><b>${esc(v.name)}</b><span>${esc(v.examples)}</span></li>`).join("")}</ul>
            <p class="small muted">In the sample photos: thermometers in wells (FT-01), dial pressure gauges (FT-05, FT-08), a pressure transmitter (FT-11). Flow and analytical devices are classified the same way but aren't in these photos.</p>
          </div>
          <div class="col">
            <div class="col-h">Valves</div>
            <div class="vis yes"><b>Visible: the operator</b><span>Handwheel, lever, gear operator, pneumatic or electric actuator.</span></div>
            <div class="valve-row">${[["FT-01", [496, 152, 716, 372], "Handwheel"], ["FT-01", [112, 102, 332, 322], "Gear"], ["FT-09", [590, 250, 710, 350], "Lever"], ["FT-08", [170, 1030, 410, 1200], "Electric"]].map(([pid, b, l]) => `<figure>${crop(pid, b, 76, 76)}<figcaption>${l}</figcaption></figure>`).join("")}</div>
            <div class="vis mid"><b>Stem motion → family</b><span>Rotating shaft: <b>${esc(QT)}</b>. Rising shaft: <b>${esc(MT)}</b>.</span></div>
            <div class="vis no"><b>Not visible: the body</b><span>Field Trace names the family when the cue supports it. It does <b>not</b> guess ball vs. butterfly, or globe vs. plug. The electric actuator on FT-08 gets no family, because its stem isn't visible.</span></div>
          </div>
        </div>
      </div>`;
    },
    examples() {
      const list = FT.photos.filter((p) => !p.upload);
      return `<div class="b-ex">
        <h2>Into the workspace <span class="muted">· ${list.length} photos, from simple to hard</span></h2>
        <p class="muted">These markups were prepared by hand to show the output. They are not live model results. The photos are public, licensed images, not the prospect's job photos. Click one to open it in the real workspace; the pill at the top right brings you back to this tab.</p>
        <div class="ex-grid">${list.map((p) => `<a class="ex-card" href="#/ws/${p.id}" data-jump="${p.id}">
          <span class="th"><img src="${C.photoSrc(p, true)}" alt="" loading="lazy"></span>
          <span class="b"><span class="pid">${p.id}</span><b>${esc(p.title)}</b><span class="mchips">${p.runs.map((r) => r.material).filter((v, i, a) => a.indexOf(v) === i).map((k) => `<i style="--c:${C.matColor(k)}">${k === "COMP" ? [...new Set(p.runs.filter((r) => r.material === "COMP").map((r) => r.matSub))].join("/") : C.matInfo(k).short}</i>`).join("")}${p.items.some((i) => i.kind === "instrument") ? `<i class="inst">Instr.</i>` : ""}${p.status === "attention" ? `<i class="att">Held</i>` : ""}</span></span></a>`).join("")}</div>
      </div>`;
    },
    upload() {
      const e = st.engine;
      return `<div class="b-up">
        <div class="up-l">
          <h2>Try one of yours</h2>
          <p>Drop a piping photo. The server runs a first pass and opens it in the same workspace as the prepared examples: runs, suggested material, valves and instruments where it can tell, and advisories where it can't.</p>
          <label class="drop" id="dz" tabindex="0">
            <input type="file" id="dzIn" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden>
            <div class="dz-ic">⇪</div><b>Drop a photo here, or click to choose</b><span>JPEG, PNG, WebP or HEIC · up to 15 MB</span>
          </label>
          <div class="samples">Or run a prepared photo through the live engine: ${["FT-07", "FT-08", "FT-10"].map((pid) => `<button class="btn sm" data-sample="${pid}">${pid}</button>`).join(" ")}</div>
          <div class="engine"><span class="dot ${e ? (e.kind === "vision" ? "ok" : "cv") : ""}"></span>${e ? esc(engineText(e)) : "Checking analysis engine…"}</div>
          <p class="lbl-ai">AI first pass: verify material and size.</p>
        </div>
        <div class="up-r" id="upRes">${st.last ? resultCard(st.last) : `<div class="up-empty"><b>What to expect</b><ul>
          <li>With a vision model configured: runs, material with cues, OD class, valves by operator / family, instruments by type, text it can read.</li>
          <li>Without one: a local geometry pass finds straight pipe-like runs and suggests material from colour and texture, with confidence capped at 70%. Size stays "?" until you set a scale.</li>
          <li>Either way: schedule is never read from a photo, and nothing is saved on the server.</li></ul></div>`}</div>
      </div>`;
    },
    review() {
      return `<div class="b-rev">
        <h2>Review the first pass, in the tools Rose already uses</h2>
        <div class="two">
          <div class="stage-fit" data-photo="FT-02" data-only="runs,labels,fittings,issues"></div>
          <div class="rev-copy">
            <ol class="big">
              <li><b>Dashed and "?" means the AI is unsure.</b> On FT-02 the finish changes at a coupling: R3 is tagged <code>HWS 2" GALV?</code> with carbon steel listed as the alternative.</li>
              <li><b>Accept, reject, or fix.</b> Keyboard: A / R / H. "Accept all ≥ 85%" leaves the unsure ones for a person.</li>
              <li><b>Override material or size</b> from the properties panel. The takeoff updates at once, and Reset restores the AI's suggestion.</li>
              <li><b>Set the scale</b> from one confirmed pipe when there's no other reference. Lengths follow, marked as estimates.</li>
            </ol>
            <div class="rev-actions">${open("FT-02", { label: "Open FT-02" })} ${st.last ? open(st.last.id, { label: "Open your upload" }) : ""}</div>
          </div>
        </div>
      </div>`;
    },
    outputs() {
      const t = C.takeoff(FT.photos.filter((p) => !p.upload).map((p) => p.id));
      return `<div class="b-out">
        <h2>As-built and takeoff, from the same markups</h2>
        <div class="two">
          <div class="paper"><svg id="demoIso"></svg></div>
          <div class="out-r">
            <div class="mat-tiles">${t.byMat.map((m) => `<div style="--c:${C.matColor(m.material)}"><b>${m.lf.toFixed(0)}<small> LF</small></b><span>${esc(C.matInfo(m.material).name)}${m.unmeasured ? ` · +${m.unmeasured} unmeasured` : ""}</span></div>`).join("")}</div>
            <table class="tt sm"><thead><tr><th>Material</th><th>System</th><th>Size</th><th>OD</th><th>Sched. (sugg.)</th><th class="r">LF</th></tr></thead>
            <tbody>${C.MAT_ORDER.flatMap((k) => t.pipe.filter((r) => r.material === k && r.lf).sort((a, b) => b.lf - a.lf).slice(0, 2)).map((r) => `<tr><td><i class="sw" style="background:${C.matColor(r.material)}"></i>${esc(r.short)}</td><td>${r.sys}</td><td>${esc(r.size)}</td><td class="mono">${esc(r.od || "—")}</td><td>${esc(r.sched || "—")}</td><td class="r mono">${r.lf.toFixed(1)}</td></tr>`).join("")}</tbody></table>
            <p class="small muted">Schedules are suggestions, because the wall isn't visible. Rating and corrosion allowance need verification. Runs on photos with no scale are counted as "unmeasured", not guessed.</p>
            <div class="rev-actions"><a class="jump" href="#/asbuilt/FT-07" data-jump="FT-07" data-route="asbuilt">FT-07 as-built →</a> <a class="jump" href="#/takeoff" data-route="takeoff">Full takeoff →</a></div>
          </div>
        </div>
      </div>`;
    },
    export() {
      return `<div class="b-exp">
        <h2>Out to Bluebeam Revu 21.11</h2>
        <div class="two">
          <a class="sheet-prev" href="exports/FT-07.pdf" target="_blank"><img src="assets/previews/FT-07.png" alt="FT-07 sheet preview"></a>
          <div>
            <ul class="checks">
              <li>One 11×17 sheet per photo: the original photo, the markups and a title block, plus the as-built iso when one was drafted.</li>
              <li>Markups are <b>standard PDF annotations</b> (polylines, callouts, dimensions, clouds, stamp) with subject, author, date and comment. Revu lists them in the Markups list and they stay editable.</li>
              <li>Sorted onto PDF layers: Pipe Runs, Fittings, Valves &amp; Instruments, Hangers &amp; Supports, Dimensions, Issues, Labels.</li>
              <li>Pipe tags read system + size + suggested material. Comments carry the OD and the suggested schedule, marked to verify.</li>
              <li>Takeoff and markup summary as CSV.</li>
            </ul>
            <p class="small muted">Field Trace is a Mimetic Technology prototype, not a Bluebeam product or plug-in. Before the meeting, open these files in Revu 21.11 and check them. In production the layer names, colours and tags would come from your tool chest.</p>
            <div class="rev-actions"><a class="btn sm primary" href="exports/Field-Trace-Sample-Set.pdf" target="_blank">Full sample set (PDF)</a> <a class="btn sm" href="exports/field-trace-takeoff.csv" download>Takeoff CSV</a> <a class="btn sm" href="#/export">All sheets →</a></div>
          </div>
        </div>
      </div>`;
    },
    close() {
      return `<div class="b-close">
        <h2>Next step: prove it on your photos</h2>
        <div class="next-grid">
          <div><b>1 · Real before / afters</b><span>20–30 of your recent job photos with Rose's finished markups. We run the first pass and compare, item by item.</span></div>
          <div><b>2 · Your tool chest</b><span>Your layer names, colours, tags and stamps, so the output looks like Rose drew it.</span></div>
          <div><b>3 · Your material and size rules</b><span>Spec sections by system: which materials and schedules are allowed where, so a suggestion can be checked against the spec.</span></div>
          <div><b>4 · A timing study</b><span>Rose's time per photo, by hand vs. reviewing the first pass. We'd quote numbers only after that.</span></div>
        </div>
        <p class="muted">No accuracy figures are claimed in this demo. They'll come from the comparison in step 1.</p>
        <div class="close-brand"><b>Field Trace</b> · Mimetic Technology · mimetictech.ai · 110/20 Software: 110% of what you ask for, 20% of the cost</div>
      </div>`;
    }
  };

  /* ------------------------------------------------------------------ upload result */
  function resultCard(p) {
    const mats = {}; p.runs.forEach((r) => (mats[r.material] = (mats[r.material] || 0) + 1));
    return `<div class="res">
      <div class="res-img"><div class="sf-in" style="aspect-ratio:${p.w}/${p.h}"><img src="${p.preview}" alt=""><svg class="ovl" id="resOvl"></svg></div></div>
      <div class="res-b">
        <div class="res-h"><b>${esc(p.title)}</b><span class="eng">${esc(p.engine.label)}${p.engine.fallback ? " · " + esc(p.engine.fallback) : ""} · ${(p.ms / 1000).toFixed(1)} s</span></div>
        <div class="res-stats"><span><b>${p.runs.length}</b> runs</span><span><b>${p.items.filter((i) => i.kind === "valve").length}</b> valves</span><span><b>${p.items.filter((i) => i.kind === "instrument").length}</b> instruments</span><span><b>${p.issues.length}</b> flags</span></div>
        <div class="mchips">${Object.entries(mats).map(([k, n]) => `<i style="--c:${C.matColor(k)}">${C.matInfo(k).short} ×${n}</i>`).join("")}</div>
        ${p.advisories.length ? `<ul class="adv">${p.advisories.slice(0, 5).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
        <p class="lbl-ai">AI first pass: verify material and size.</p>
        <div class="rev-actions"><a class="btn sm primary" href="#/ws/${p.id}" data-jump="${p.id}">Open in the workspace →</a></div>
      </div></div>`;
  }

  function toPhoto(js, file) {
    const n = FT.photos.filter((p) => p.upload).reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ""), 10) || 0), 0) + 1;
    const id = "UP-" + String(n).padStart(2, "0");
    const sx = js.w / 1000, sy = js.h / 1000; const X = (q) => [q[0] * sx, q[1] * sy];
    const fam = (f) => (/quarter|rotat|ball|butterfly/i.test(f || "") ? FT.QT : /multi|rising|linear|gate|globe|plug/i.test(f || "") ? FT.MT : "unknown");
    const runs = (js.runs || []).map((r) => {
      const run = Object.assign({}, r, { pts: (r.pts || []).map(X), lbl: X(r.lbl || r.pts[0]) });
      if (r.wpx != null) run.wpx = r.wpx * sx; // CV reports width normalised to image width x1000
      if (!run.odClass || run.odClass === "unknown") run.odClass = run.material === "CU" || run.matSub === "PEX" ? "CTS" : ["CS", "SS", "GALV"].includes(run.material) ? "NPS" : "unknown";
      run.sched = run.sched || ""; run.schedBasis = run.schedBasis || (run.sched ? "" : "Not suggested: no stencil, print line or flange class read.");
      run.size = run.size || "?"; run.sys = run.sys || "UNK"; run.mat = run.mat || C.matInfo(run.material).name;
      C.normaliseRun(run); return run;
    });
    const items = (js.items || []).map((it) => {
      const o = Object.assign({}, it, { at: X(it.at), lbl: X(it.lbl || it.at) });
      if (o.kind === "valve") { o.family = fam(o.family); o.type = o.operator && o.operator !== "unknown" ? `${o.operator[0].toUpperCase() + o.operator.slice(1)} valve` : "Valve"; o.bodyNote = o.desc; }
      if (o.kind === "instrument" && !FT.instruments[o.inst]) o.inst = Object.keys(FT.instruments).find((k) => (o.inst || "").toLowerCase().includes(k)) || o.inst;
      return o;
    });
    const issues = (js.issues || []).map((x) => Object.assign({}, x, { poly: x.poly.map(X), lbl: X(x.lbl) }));
    const now = new Date(); const pad = (v) => String(v).padStart(2, "0");
    return { id, upload: true, file: "", preview: js.preview, w: js.w, h: js.h, title: (file && file.name ? file.name.replace(/\.[^.]+$/, "") : "Uploaded photo").slice(0, 60),
      location: "Uploaded this session", taken: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`, by: "You", status: "ready",
      conf: js.conf || 0.4, scale: "No scale. Select a bare run, confirm its size and use it as the scale", ocrText: js.ocrText || [], summary: js.summary || "", engine: js.engine || { label: "Unknown engine" },
      advisories: js.advisories || [], ms: js.ms || 0, credit: { title: "Uploaded photo (this session)", author: "—", license: "—", url: "#" },
      runs, items, dims: [], issues, stamp: null, iso: null, isoHeld: "Uploads aren't drafted as an iso. Set a scale in the workspace to get lengths in the takeoff." };
  }

  async function upload(file, opts) {
    opts = opts || {};
    const say = (html, cls) => { const el = $("#upRes"); if (el) el.innerHTML = `<div class="up-msg ${cls || ""}">${html}</div>`; else if (window.FTApp) FTApp.toast(html.replace(/<[^>]+>/g, "")); };
    if (!file) return;
    const okType = ACCEPT.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
    if (!okType) return say("That file type isn't supported. Use JPEG, PNG, WebP or HEIC.", "err");
    if (file.size > MAX) return say(`That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 15 MB.`, "err");
    if (st.busy) return say("Still working on the previous photo…");
    st.busy = true;
    say(`<div class="spin"></div><b>Analysing ${esc(file.name || "photo")}…</b><span>Tracing runs, suggesting materials, looking for valves and instruments. Usually a few seconds. The first request after the server has been idle can take longer.</span>`, "busy");
    if (opts.from === "inbox" && window.FTApp) FTApp.toast("Analysing photo…");
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 95000);
    try {
      const fd = new FormData(); fd.append("file", file, file.name || "photo.jpg");
      const res = await fetch("/api/analyze", { method: "POST", body: fd, credentials: "same-origin", signal: ctl.signal, headers: { "X-Requested-With": "fetch" } });
      if (res.status === 401) { location.href = "/login?next=" + encodeURIComponent("/" + location.hash); return; }
      let js = null; try { js = await res.json(); } catch (e) { /* non-JSON */ }
      if (!res.ok) throw new Error((js && (js.detail || js.error)) || ({ 413: "Photo is larger than 15 MB.", 415: "Couldn't read that image.", 429: "Too many requests. Wait a moment.", 504: "Analysis took too long. Try a smaller photo." }[res.status]) || `Server error (${res.status}).`);
      const p = toPhoto(js, file);
      window.FTApp.addUpload(p); st.last = p;
      if (opts.from === "inbox") { FTApp.toast(`${p.id} ready: ${p.runs.length} runs`); location.hash = "#/ws/" + p.id; return; }
      const el = $("#upRes"); if (el) { el.innerHTML = resultCard(p); FTOverlay.render($("#resOvl"), p, { colorBy: "material", only: ["runs", "labels", "valves", "issues"] }); bindJumps(el); }
    } catch (e) {
      say(`<b>Couldn't analyse that photo.</b><span>${esc(e.name === "AbortError" ? "It timed out after 95 seconds. Try again or use a smaller photo." : e.message || String(e))}</span><span class="muted">The prepared examples still work.</span>`, "err");
    } finally { clearTimeout(timer); st.busy = false; }
  }

  function bindDrop(zone, input, opts) {
    if (!zone) return;
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); const f = e.dataTransfer.files && e.dataTransfer.files[0]; upload(f, opts); });
    zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", () => { const f = input.files[0]; input.value = ""; upload(f, opts); });
  }

  /* ------------------------------------------------------------------ render */
  function bindJumps(root) {
    $$("[data-jump],[data-route]", root).forEach((a) => a.addEventListener("click", () => {
      window.FTApp.ui.demoReturn = BEATS[st.step - 1].id;
      if (a.dataset.color) C.state.colorBy = a.dataset.color;
    }));
  }
  function fitStages(root) {
    $$(".stage-fit", root).forEach((box) => {
      const p = P(box.dataset.photo); if (!p) return;
      box.innerHTML = `<div class="sf-in" style="aspect-ratio:${p.w}/${p.h}"><img src="${C.photoSrc(p)}" alt=""><svg class="ovl"></svg></div>`;
      const only = box.dataset.only === "none" ? ["__none"] : box.dataset.only ? box.dataset.only.split(",") : ["runs", "labels", "valves", "issues", "fittings"];
      FTOverlay.render($("svg", box), p, { colorBy: box.dataset.color || "system", only, animate: !!box.dataset.anim });
    });
  }
  function render(view, n) {
    st.view = view;
    if (n != null && !idx(n)) { location.replace(hashOf(st.step || 1)); return; }
    const k = idx(n) || st.step || 1; st.step = k;
    const b = BEATS[k - 1];
    view.innerHTML = `<section class="demo beat-${b.id}">
      <div class="dtabs">
        <div class="dt-l"><span class="dt-name">Demo</span><span class="dt-sub">presenter walkthrough</span></div>
        <nav class="tabs" role="tablist" aria-label="Demo sections">${BEATS.map((x, i) => `<a role="tab" aria-selected="${i + 1 === k}" href="${hashOf(i + 1)}" class="${i + 1 === k ? "on" : ""}"><span class="n">${i + 1}</span><span class="t">${esc(x.t)}</span></a>`).join("")}</nav>
        <div class="dt-r"><span class="dt-keys"><kbd>←</kbd><kbd>→</kbd> tabs · <kbd>F</kbd> present</span><button class="btn sm present" id="presentBtn" title="Present full screen (F). Esc to exit.">▶ Present</button><button class="btn sm ghost exit-present" id="exitPresent" title="Leave present mode (Esc)">Exit ✕</button></div>
      </div>
      <div class="beat"><div class="beat-in">${R[b.id]()}</div>
        <div class="beat-nav"><a class="btn sm ${k === 1 ? "dis" : ""}" href="${hashOf(Math.max(1, k - 1))}">← ${k > 1 ? esc(BEATS[k - 2].t) : "Back"}</a>
          <div class="prog"><i style="width:${(k / BEATS.length) * 100}%"></i></div><span class="mono">${k} / ${BEATS.length}</span>
          <a class="btn sm primary ${k === BEATS.length ? "dis" : ""}" href="${hashOf(Math.min(BEATS.length, k + 1))}">${k < BEATS.length ? "Next: " + esc(BEATS[k].t) + " →" : "End"}</a></div></div>
    </section>`;
    fitStages(view); bindJumps(view);
    if (b.id === "upload") { bindDrop($("#dz"), $("#dzIn"), { from: "demo" });
      $$("[data-sample]", view).forEach((btn) => btn.addEventListener("click", () => uploadSample(btn.dataset.sample, { from: "demo" }))); if (st.last) { FTOverlay.render($("#resOvl"), st.last, { colorBy: "material", only: ["runs", "labels", "valves", "issues"] }); } }
    if (b.id === "outputs") FTIso.render($("#demoIso"), P("FT-07"), { bare: true });
    if (window.FTApp) FTApp.ui.demoReturn = null;
  }
  async function uploadSample(pid, opts) {
    const p = P(pid); if (!p) return;
    try { const r = await fetch(C.photoSrc(p), { credentials: "same-origin" }); if (r.status === 401) { location.href = "/login"; return; } const bl = await r.blob(); upload(new File([bl], p.file, { type: "image/jpeg" }), opts); }
    catch (e) { if (window.FTApp) FTApp.toast("Couldn't load the sample photo."); }
  }
  function engineText(e) { return e.kind === "vision" ? `Vision model available (${e.provider}${e.model ? ": " + e.model : ""}), local OpenCV as fallback` : "Local first pass: OpenCV geometry + colour, no vision model configured"; }
  function setEngine(e) {
    st.engine = e || { kind: "local-cv" };
    const el = document.querySelector(".b-up .engine"); if (el) el.innerHTML = `<span class="dot ${st.engine.kind === "vision" ? "ok" : "cv"}"></span>${esc(engineText(st.engine))}`;
  }

  /* ------------------------------------------------------------------ keys + present */
  function present(on) {
    const want = on == null ? !document.body.classList.contains("presenting") : on;
    document.body.classList.toggle("presenting", want);
    if (want && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!want && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (want && document.body.dataset.view !== "demo") location.hash = hashOf(st.step || 1);
  }
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) document.body.classList.remove("presenting"); });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches && e.target.matches("input,textarea,select")) return;
    if (e.key === "Escape") { const m = document.getElementById("modal"); if (m && m.classList.contains("show")) { m.classList.remove("show"); return; } if (document.body.classList.contains("presenting")) { present(false); return; } }
    if (document.body.dataset.view !== "demo" || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "n" || k === "N" || k === "PageDown" || (k === " " && !e.target.closest("button,a,label"))) { e.preventDefault(); if (st.step < BEATS.length) location.hash = hashOf(st.step + 1); }
    else if (k === "ArrowLeft" || k === "p" || k === "P" || k === "PageUp") { e.preventDefault(); if (st.step > 1) location.hash = hashOf(st.step - 1); }
    else if (k === "f" || k === "F") { e.preventDefault(); present(); }
    else if (k === "Home") location.hash = hashOf(1); else if (k === "End") location.hash = hashOf(BEATS.length);
  });
  document.addEventListener("click", (e) => { if (e.target.closest("#presentBtn")) present(); else if (e.target.closest("#exitPresent")) present(false); });
  window.addEventListener("resize", () => { /* overlays are viewBox-scaled; nothing to do */ });

  window.FTDemo = { render, leave() {}, upload, uploadSample, bindDrop, setEngine, title, BEATS, present, state: st };
})();
