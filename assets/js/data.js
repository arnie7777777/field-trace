/* Field Trace — demo dataset.
 * Every photo coordinate below is in the pixel space of the image file in assets/photos
 * (x right, y down). Overlays were placed by visually inspecting each photo.
 * Iso coordinates are in feet: x = along wall (east), y = out from wall (north), z = up.
 * "conf" values are illustrative model confidences for the demo, not measured outputs.
 */
window.FT = {
  product: { name: "Field Trace", tagline: "AI markup assist for Bluebeam Revu", by: "Mimetic Technology", byUrl: "mimetictech.ai", byTag: "80/20 Software", client: "Schilke Construction", revu: "Bluebeam Revu 21.11" },
  project: { name: "Sample Project — Mechanical Rough-In", number: "DEMO-0142", note: "Sample data. Photos are public, licensed construction images, not Schilke job photos.", reviewer: "R. (reviewer)" },
  systems: {
    CTS: { name: "Cooling Tower Supply", color: "#16b8a6" },
    CTR: { name: "Cooling Tower Return", color: "#0e8f86" },
    CWS: { name: "Condenser Water Supply", color: "#6cc04a" },
    CWR: { name: "Condenser Water Return", color: "#4c9a2a" },
    CHWS: { name: "Chilled Water Supply", color: "#2f8fe8" },
    CHWR: { name: "Chilled Water Return", color: "#5aa9ff" },
    HWS: { name: "Heating Hot Water Supply", color: "#f2643a" },
    HWR: { name: "Heating Hot Water Return", color: "#d9862e" },
    DCW: { name: "Domestic Cold Water", color: "#2cc8e0" },
    DHW: { name: "Domestic Hot Water", color: "#ef4f8b" },
    LPS: { name: "Low Pressure Steam", color: "#f2c230" },
    FP: { name: "Fire Protection", color: "#e5383b" },
    UNK: { name: "Unidentified — verify", color: "#b8c2cc" }
  },
  /* printed sheet layout (inches, from top-left of an 11×17 landscape page). Shared with tools/build_exports.py */
  sheet: { page: [17, 11], photoBox: [0.55, 0.95, 8.7, 6.75] },
  layers: [
    { id: "runs", name: "Pipe Runs" },
    { id: "fittings", name: "Fittings" },
    { id: "valves", name: "Valves & Devices" },
    { id: "supports", name: "Hangers & Supports" },
    { id: "dims", name: "Dimensions" },
    { id: "issues", name: "Issues" },
    { id: "labels", name: "Labels" }
  ],
  photos: [
  /* ------------------------------------------------------------------ FT-01 */
  {
    id: "FT-01", file: "ft01-plate-hx.jpg", w: 1200, h: 1600,
    title: "Plate HX-1 — tower / condenser water", location: "Mech. Rm B-104 · North wall",
    taken: "2026-11-09 07:42", by: "Field crew (sample)", status: "ready", conf: 0.94,
    scale: "Scale ref: 6\" Sch 40 pipe OD (6.625\") ≈ 90 px at wall plane",
    ocrText: ["CTS", "CTR", "CWS", "CWR", "S1", "S2", "S3", "S4"],
    summary: "Four 6\" flanged runs into a plate-and-frame heat exchanger. Stencils read and bound to runs; flow direction from painted arrows.",
    credit: { title: "Shell and Tube Heat Exchanger Piping 1", author: "Ivangiesen", license: "CC0 1.0", url: "https://commons.wikimedia.org/wiki/File:Shell_and_Tube_Heat_Exchanger_Piping_1.jpg" },
    runs: [
      { id: "R1", sys: "CTR", size: "6\"", mat: "Sch 40 CS, flanged", conf: 0.95, pts: [[243,262],[243,700],[256,772],[300,850],[360,915],[430,958],[512,982]], flow: -1, lbl: [150, 560], note: "Stencil \"CTR\" read at elbow; arrow points away from HX." },
      { id: "R2", sys: "CTS", size: "6\"", mat: "Sch 40 CS, flanged", conf: 0.93, pts: [[448,0],[448,600],[450,1300],[452,1432]], flow: 1, lbl: [470, 1120], note: "Stencil \"CTS\" read; arrow points down toward HX inlet. Bottom bend partially hidden by base." },
      { id: "R3", sys: "CWS", size: "6\"", mat: "Sch 40 CS, flanged", conf: 0.96, pts: [[604,396],[606,900],[608,1440]], flow: 1, lbl: [640, 1150], note: "Stencil \"CWS\" read below valve." },
      { id: "R4", sys: "CWR", size: "6\"", mat: "Sch 40 CS, flanged", conf: 0.94, pts: [[901,440],[903,740],[892,808],[850,852],[770,906],[688,966]], flow: -1, lbl: [960, 700], note: "Stencil \"CWR\" read on 45° offset; arrow points away from HX." }
    ],
    items: [
      { id: "V1", layer: "valves", type: "Gate valve", tag: "V-CWS-1", size: "6\"", sys: "CWS", at: [606,262], lbl: [700, 56], conf: 0.92, desc: "6\" flanged gate valve, handwheel operator" },
      { id: "V2", layer: "valves", type: "Gate valve", tag: "V-CWR-1", size: "6\"", sys: "CWR", at: [902,300], lbl: [985, 360], conf: 0.91, desc: "6\" flanged gate valve, handwheel operator" },
      { id: "V3", layer: "valves", type: "Butterfly valve", tag: "V-CTR-1", size: "6\"", sys: "CTR", at: [222,212], lbl: [20, 110], conf: 0.88, desc: "6\" lug butterfly valve, gear operator (blue)" },
      { id: "T1", layer: "valves", type: "Thermometer", tag: "TI-1", size: "", sys: "CTR", at: [118,320], lbl: [16, 470], conf: 0.86, desc: "Adjustable-angle stem thermometer in well" },
      { id: "T2", layer: "valves", type: "Thermometer", tag: "TI-2", size: "", sys: "CTS", at: [356,300], lbl: [300, 460], conf: 0.87, desc: "Adjustable-angle stem thermometer in well" },
      { id: "T3", layer: "valves", type: "Thermometer", tag: "TI-3", size: "", sys: "CWS", at: [720,500], lbl: [760, 610], conf: 0.89, desc: "Adjustable-angle stem thermometer in well" },
      { id: "T4", layer: "valves", type: "Thermometer", tag: "TI-4", size: "", sys: "CWR", at: [918,440], lbl: [1010, 520], conf: 0.84, desc: "Adjustable-angle stem thermometer in well" },
      { id: "B1", layer: "valves", type: "Ball valve (drain/vent)", tag: "", size: "3/4\"", sys: "CWS", at: [594,500], lbl: [0, 0], conf: 0.79, desc: "3/4\" ball valve, red lever — test/drain port", noCallout: true },
      { id: "B2", layer: "valves", type: "Ball valve (drain/vent)", tag: "", size: "3/4\"", sys: "CTR", at: [186,378], lbl: [0, 0], conf: 0.77, desc: "3/4\" ball valve, red lever — test/drain port", noCallout: true },
      { id: "F1", layer: "fittings", type: "Flange pair", tag: "", size: "6\"", sys: "CWS", at: [604,372], lbl: [0, 0], conf: 0.93, desc: "6\" 150# raised-face flange pair", noCallout: true },
      { id: "F2", layer: "fittings", type: "Flange pair", tag: "", size: "6\"", sys: "CWR", at: [901,416], lbl: [0, 0], conf: 0.93, desc: "6\" 150# raised-face flange pair", noCallout: true },
      { id: "E1", layer: "fittings", type: "45° elbow", tag: "", size: "6\"", sys: "CWR", at: [895,800], lbl: [0, 0], conf: 0.9, desc: "6\" 45° elbow (offset to HX)", noCallout: true },
      { id: "E2", layer: "fittings", type: "45° elbow", tag: "", size: "6\"", sys: "CTR", at: [262,790], lbl: [0, 0], conf: 0.88, desc: "6\" 45° elbow (offset to HX)", noCallout: true },
      { id: "E3", layer: "fittings", type: "90° LR elbow", tag: "", size: "6\"", sys: "CTS", at: [455,1445], lbl: [0, 0], conf: 0.71, desc: "6\" 90° LR elbow — partially hidden by base", noCallout: true },
      { id: "E4", layer: "fittings", type: "90° LR elbow", tag: "", size: "6\"", sys: "CWS", at: [610,1452], lbl: [0, 0], conf: 0.7, desc: "6\" 90° LR elbow — partially hidden by base", noCallout: true },
      { id: "Q1", layer: "valves", type: "Plate & frame heat exchanger", tag: "PHE-1", size: "", sys: "", at: [640,1120], lbl: [820, 1110], conf: 0.9, desc: "Plate-and-frame HX, ports S1–S4 visible. Nameplate not legible.", box: [508,900,762,1325] }
    ],
    dims: [
      { id: "D1", a: [606,640], b: [902,640], off: 0, text: "1'-10\" C-C", conf: 0.82, basis: "Pipe OD reference; wall-plane estimate" },
      { id: "D2", a: [448,560], b: [606,560], off: 0, text: "11 3/4\" C-C", conf: 0.8, basis: "Pipe OD reference; wall-plane estimate" },
      { id: "D3", a: [1010,396], b: [1010,905], off: 0, text: "3'-2\"", conf: 0.74, basis: "Flange face to HX top port; perspective-corrected", ext: [[901,396],[760,905]] }
    ],
    issues: [
      { id: "X1", title: "No support visible at CWR offset", sev: "Medium", conf: 0.72, poly: [[830,740],[975,740],[975,880],[830,880]], lbl: [1000, 860], text: "6\" CWR 45° offset between valve and HX shows no hanger or floor stand in frame. Verify support per spec before insulation/close-out." },
      { id: "X2", title: "Nameplate not legible", sev: "Low", conf: 0.9, poly: [[520,1040],[700,1040],[700,1280],[520,1280]], lbl: [800, 1300], text: "PHE-1 tag assumed from drawing schedule. Capture nameplate close-up (model / serial) for O&M." }
    ],
    stamp: [40, 1400],
    iso: {
      view: { cx: 0, cy: 0, scale: 34 },
      segs: [
        { run: "R1", a: [2.3,0.8,3.6], b: [1.0,0.8,4.9] },
        { run: "R1", a: [1.0,0.8,4.9], b: [1.0,0.8,9.0], dim: true, flow: -1, brk: "b" },
        { run: "R2", a: [1.7,2.0,9.0], b: [1.7,2.0,0.9], dim: true, flow: 1, brk: "a" },
        { run: "R2", a: [1.7,2.0,0.9], b: [1.7,0.8,0.9] },
        { run: "R2", a: [1.7,0.8,0.9], b: [2.3,0.8,0.9] },
        { run: "R3", a: [2.9,2.0,9.0], b: [2.9,2.0,0.6], dim: true, flow: 1, brk: "a" },
        { run: "R3", a: [2.9,2.0,0.6], b: [2.9,0.8,0.6] },
        { run: "R4", a: [3.0,0.8,3.6], b: [4.3,0.8,4.9] },
        { run: "R4", a: [4.3,0.8,4.9], b: [4.3,0.8,9.0], dim: true, flow: -1, brk: "b" }
      ],
      syms: [
        { t: "butterfly", at: [1.0,0.8,8.3], dir: "z", item: "V3" },
        { t: "gate", at: [2.9,2.0,8.1], dir: "z", item: "V1" },
        { t: "gate", at: [4.3,0.8,8.1], dir: "z", item: "V2" },
        { t: "flange", at: [2.9,2.0,7.5], dir: "z" }, { t: "flange", at: [4.3,0.8,7.5], dir: "z" },
        { t: "ti", at: [1.0,0.8,7.4], item: "T1" }, { t: "ti", at: [1.7,2.0,7.6], item: "T2" },
        { t: "ti", at: [2.9,2.0,6.6], item: "T3" }, { t: "ti", at: [4.3,0.8,6.9], item: "T4" },
        { t: "hx", at: [2.0,0.0,0.0], size: [1.4,0.8,4.2], item: "Q1", label: "PHE-1" },
        { t: "cloud", at: [4.0,0.8,5.6], item: "X1" }
      ],
      notes: ["ALL PIPING 6\" SCH 40 CS, 150# RF FLANGED U.N.O.", "ELEVATIONS ESTIMATED FROM PHOTO — VERIFY IN FIELD", "STENCILS READ: CTS · CTR · CWS · CWR"]
    }
  },
  /* ------------------------------------------------------------------ FT-02 */
  {
    id: "FT-02", file: "ft02-riser-offset.jpg", w: 1600, h: 1200,
    title: "HWS offset at CMU wall — rough-in", location: "Level B1 · Corridor C, column line 4",
    taken: "2026-11-09 09:15", by: "Field crew (sample)", status: "ready", conf: 0.88,
    scale: "Scale ref: CMU coursing — 8\" course, 16\" block (≈100 px / course)",
    ocrText: [],
    summary: "2-1/2\" grooved steel offset with drop, open tee outlet, wall strut. Two thin verticals flagged as uncertain (pipe vs. threaded rod).",
    credit: { title: "Ventilation piping installed in the back of house area of the future LIRR passenger concourse (CM014B, 03-19-2019)", author: "MTA Capital Construction Mega Projects", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Ventilation_piping_installed_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-19-2019)_(33565522008).jpg" },
    runs: [
      { id: "R1", sys: "HWS", size: "2-1/2\"", mat: "Sch 10 CS, grooved", conf: 0.91, pts: [[700,366],[1256,366],[1288,378],[1304,410],[1305,690]], flow: 1, lbl: [880, 300], note: "System suggested from M-drawing routing at this location — confirm. Grooved couplings at 1215 and 1306 px." },
      { id: "R2", sys: "HWS", size: "2-1/2\"", mat: "Sch 10 CS, grooved", conf: 0.86, pts: [[1305,690],[1305,812],[1288,850],[1250,876],[1185,874]], flow: 1, lbl: [1380, 820], note: "Continues as R3 after coupling." },
      { id: "R3", sys: "HWS", size: "2\"", mat: "Galv.? — verify", conf: 0.68, pts: [[1185,874],[930,820],[700,772]], flow: 1, lbl: [780, 700], note: "Color/finish change at coupling suggests material transition. AI unsure — verify." },
      { id: "R4", sys: "UNK", size: "3/4\"?", mat: "Unknown", conf: 0.58, pts: [[1108,565],[1108,1000]], lbl: [1000, 1060], note: "Thin black vertical: could be 3/4\" pipe or 3/8\" threaded rod. Below confidence threshold." }
    ],
    items: [
      { id: "C1", layer: "fittings", type: "Rigid coupling", tag: "", size: "2-1/2\"", sys: "HWS", at: [1217,366], lbl: [0,0], conf: 0.93, desc: "Grooved rigid coupling", noCallout: true },
      { id: "E1", layer: "fittings", type: "90° elbow (grooved)", tag: "", size: "2-1/2\"", sys: "HWS", at: [1292,382], lbl: [1360, 250], conf: 0.94, desc: "2-1/2\" grooved 90° elbow" },
      { id: "C2", layer: "fittings", type: "Rigid coupling", tag: "", size: "2-1/2\"", sys: "HWS", at: [1306,432], lbl: [0,0], conf: 0.9, desc: "Grooved rigid coupling", noCallout: true },
      { id: "TE1", layer: "fittings", type: "Tee (grooved)", tag: "", size: "2-1/2\"", sys: "HWS", at: [1303,690], lbl: [1420, 690], conf: 0.87, desc: "2-1/2\" grooved tee, branch outlet toward viewer — open" },
      { id: "C3", layer: "fittings", type: "Rigid coupling", tag: "", size: "2-1/2\"", sys: "HWS", at: [1306,775], lbl: [0,0], conf: 0.88, desc: "Grooved rigid coupling", noCallout: true },
      { id: "E2", layer: "fittings", type: "90° elbow (grooved)", tag: "", size: "2-1/2\"", sys: "HWS", at: [1290,848], lbl: [0,0], conf: 0.83, desc: "2-1/2\" grooved 90° elbow", noCallout: true },
      { id: "C4", layer: "fittings", type: "Coupling / transition", tag: "", size: "2-1/2\" × 2\"", sys: "HWS", at: [1185,874], lbl: [1090, 980], conf: 0.7, desc: "Coupling at apparent material change — transition fitting?" },
      { id: "S1", layer: "supports", type: "Wall strut channel", tag: "", size: "1-5/8\"", sys: "", at: [870,476], lbl: [620, 560], conf: 0.92, desc: "1-5/8\" strut channel, wall-mounted", line: [[612,463],[1440,500]] },
      { id: "S2", layer: "supports", type: "Pipe clamp at strut", tag: "", size: "2-1/2\"", sys: "HWS", at: [1305,500], lbl: [0,0], conf: 0.8, desc: "Strut pipe clamp at riser", noCallout: true },
      { id: "S3", layer: "supports", type: "Vertical member (verify)", tag: "", size: "", sys: "", at: [1460,600], lbl: [1470, 160], conf: 0.55, desc: "Vertical rod/pipe at right — unidentified, verify", line: [[1462,470],[1460,1000]] }
    ],
    dims: [
      { id: "D1", a: [700,366], b: [1305,366], off: -70, text: "4'-0\"", conf: 0.81, basis: "CMU coursing (16\" block) at wall plane" },
      { id: "D2", a: [1305,378], b: [1305,850], off: -95, text: "3'-2\"", conf: 0.78, basis: "CMU coursing (8\" course) at wall plane" }
    ],
    issues: [
      { id: "X1", title: "Open tee outlet", sev: "High", conf: 0.85, poly: [[1262,648],[1348,648],[1348,738],[1262,738]], lbl: [1420, 760], text: "Branch outlet on 2-1/2\" tee is open. Cap or connect before hydrostatic test." },
      { id: "X2", title: "Material transition at coupling", sev: "Medium", conf: 0.68, poly: [[1140,840],[1232,840],[1232,910],[1140,910]], lbl: [960, 960], text: "Finish changes at coupling (black → galvanized?). If dissimilar metals, verify dielectric/transition fitting per spec." }
    ],
    stamp: [40, 60],
    iso: {
      view: { cx: 0, cy: 0, scale: 46 },
      segs: [
        { run: "R1", a: [0,0,7.0], b: [4.0,0,7.0], dim: true, flow: 1, brk: "a" },
        { run: "R1", a: [4.0,0,7.0], b: [4.0,0,4.6], dim: true },
        { run: "R2", a: [4.0,0,4.6], b: [4.0,0,3.8] },
        { run: "R2", a: [4.0,0,3.8], b: [3.4,0,3.6] },
        { run: "R3", a: [3.4,0,3.6], b: [0,0,2.9], dim: true, flow: 1, brk: "b" },
        { run: "R4", a: [2.6,0,6.1], b: [2.6,0,2.4], brk: "b" }
      ],
      syms: [
        { t: "coupling", at: [3.4,0,7.0], dir: "x" }, { t: "coupling", at: [4.0,0,6.6], dir: "z" },
        { t: "coupling", at: [4.0,0,4.1], dir: "z" }, { t: "coupling", at: [3.4,0,3.6], dir: "x", item: "C4" },
        { t: "tee-open", at: [4.0,0,4.6], dir: "y", item: "TE1" },
        { t: "hanger", at: [4.0,0,6.2], item: "S2" },
        { t: "strut", a: [-0.5,0,6.25], b: [5.4,0,6.1], item: "S1" },
        { t: "cloud", at: [4.0,1.15,4.6], item: "X1" }, { t: "cloud", at: [2.7,0,3.2], item: "X2" }
      ],
      notes: ["2-1/2\" GROOVED STEEL, RIGID COUPLINGS U.N.O.", "DIMENSIONS FROM CMU COURSING — ±2\"", "DASHED = BELOW CONFIDENCE THRESHOLD, VERIFY"]
    }
  },
  /* ------------------------------------------------------------------ FT-03 */
  {
    id: "FT-03", file: "ft03-corridor-mains.jpg", w: 1600, h: 1200,
    title: "Overhead mains — east service corridor", location: "Level B1 · East service corridor",
    taken: "2026-11-10 13:05", by: "Field crew (sample)", status: "ready", conf: 0.84,
    scale: "Perspective view — lengths estimated from support spacing (assumed 10'-0\" O.C.)",
    ocrText: [],
    summary: "Insulated chilled and heating water mains on trapeze racks with sprinkler main above-right. Perspective handled by vanishing-point fit.",
    credit: { title: "Insulating piping in the back of house area of the future LIRR passenger concourse (CM014B, 03-27-2019)", author: "MTA Capital Construction Mega Projects", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Insulating_piping_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-27-2019)_(46577660185).jpg" },
    runs: [
      { id: "R1", sys: "CHWS", size: "8\"", mat: "CS, 2\" insulation w/ PVC jacket", conf: 0.88, pts: [[938,0],[908,190],[872,330],[826,470],[792,580]], lbl: [1020, 560], note: "Largest insulated main, right position on rack." },
      { id: "R2", sys: "CHWR", size: "8\"", mat: "CS, 2\" insulation w/ PVC jacket", conf: 0.86, pts: [[690,0],[700,190],[716,350],[730,480],[738,590]], lbl: [560, 700], note: "Pairs with R1; same insulated OD." },
      { id: "R3", sys: "HWS", size: "4\"", mat: "CS, 1-1/2\" insulation", conf: 0.79, pts: [[232,62],[334,180],[432,298],[532,418],[612,502]], lbl: [140, 420], note: "Diagonal main converging to vanishing point." },
      { id: "R4", sys: "FP", size: "4\"", mat: "Sch 10 CS, red", conf: 0.9, pts: [[1600,248],[1470,312],[1330,376],[1200,450],[1098,524]], lbl: [1380, 470], note: "Sprinkler main — red finish. Branch drop at 1409 px." },
      { id: "R5", sys: "FP", size: "4\"", mat: "Sch 10 CS, red", conf: 0.84, pts: [[1272,0],[1160,98],[1052,196]], lbl: [1200, 150], note: "Upper FP main, continues behind CHWS." }
    ],
    items: [
      { id: "S1", layer: "supports", type: "Insulation shield at support", tag: "", size: "8\"", sys: "CHWS", at: [880,330], lbl: [1060, 330], conf: 0.83, desc: "Insulation protection shield at trapeze support" },
      { id: "S2", layer: "supports", type: "Insulation shield at support", tag: "", size: "8\"", sys: "CHWR", at: [716,352], lbl: [0,0], conf: 0.8, desc: "Insulation protection shield", noCallout: true },
      { id: "S3", layer: "supports", type: "Trapeze strut post", tag: "", size: "1-5/8\"", sys: "", at: [1000,820], lbl: [1110, 900], conf: 0.86, desc: "Strut trapeze post (rack)", line: [[1000,190],[1010,1200]] },
      { id: "S4", layer: "supports", type: "Trapeze strut post", tag: "", size: "1-5/8\"", sys: "", at: [130,700], lbl: [0,0], conf: 0.84, desc: "Strut trapeze post (rack)", line: [[120,170],[140,1200]], noCallout: true },
      { id: "FP1", layer: "valves", type: "Sprinkler branch outlet", tag: "", size: "1\"", sys: "FP", at: [1409,280], lbl: [1440, 120], conf: 0.74, desc: "Branch/drop off FP main" },
      { id: "F1", layer: "fittings", type: "Tee (insulated)", tag: "", size: "4\"", sys: "HWS", at: [360,262], lbl: [300, 120], conf: 0.7, desc: "Insulated tee cluster at branch — fitting covers irregular" }
    ],
    dims: [
      { id: "D1", a: [738,560], b: [800,560], off: 60, text: "~1'-6\" C-C", conf: 0.62, basis: "Perspective — low confidence, verify" }
    ],
    issues: [
      { id: "X1", title: "Fitting insulation incomplete", sev: "Medium", conf: 0.71, poly: [[270,230],[440,230],[440,350],[270,350]], lbl: [120, 520], text: "Insulation at tee cluster is irregular / covers appear missing. Complete fitting covers before ceiling close-in." },
      { id: "X2", title: "Clearance at FP crossing", sev: "Low", conf: 0.66, poly: [[950,150],[1110,150],[1110,260],[950,260]], lbl: [1160, 300], text: "Upper FP main crosses tight above CHWS. Verify clearance and access to FP fittings." }
    ],
    stamp: [40, 1000],
    iso: {
      view: { cx: 0, cy: 0, scale: 15 },
      segs: [
        { run: "R1", a: [3.0,0,10.6], b: [3.0,30,10.6], brk: "both" },
        { run: "R2", a: [1.6,0,10.6], b: [1.6,30,10.6], brk: "both" },
        { run: "R3", a: [0,0,10.9], b: [0,30,10.9], dim: true, brk: "both" },
        { run: "R3", a: [0,12,10.9], b: [-1.6,12,10.9] },
        { run: "R4", a: [4.8,0,11.6], b: [4.8,30,11.6], brk: "both" },
        { run: "R5", a: [4.4,0,12.2], b: [2.4,18,12.2], brk: "both" }
      ],
      syms: [
        { t: "trapeze", at: [1.5,5,10.0], span: 4.4 }, { t: "trapeze", at: [1.5,15,10.0], span: 4.4 }, { t: "trapeze", at: [1.5,25,10.0], span: 4.4 },
        { t: "tee", at: [0,12,10.9], item: "F1" },
        { t: "drop", at: [4.8,20,11.6], item: "FP1" },
        { t: "cloud", at: [0,12,11.6], item: "X1" }, { t: "cloud", at: [3.4,10,12.4], item: "X2" }
      ],
      notes: ["RUN LENGTHS FROM ASSUMED 10'-0\" SUPPORT SPACING", "INSULATION: CHW 2\", HW 1-1/2\" (PER SPEC — VERIFY)", "FP SHOWN FOR COORDINATION ONLY"]
    }
  },
  /* ------------------------------------------------------------------ FT-04 */
  {
    id: "FT-04", file: "ft04-copper-penetrations.jpg", w: 1600, h: 1200,
    title: "Domestic water drops at wall penetrations", location: "Level 1 · Back-of-house wall W-12",
    taken: "2026-11-10 15:31", by: "Field crew (sample)", status: "ready", conf: 0.86,
    scale: "Scale ref: 1\" type L copper OD (1.125\") ≈ 24 px",
    ocrText: [],
    summary: "Insulated DCW/DHW mains with copper drops into fire-stopped sleeves. Loose stub and short insulation flagged.",
    credit: { title: "Installing copper piping that will connect to a heating and cooling unit in the LIRR passenger concourse (CM014B, 1-24-2019)", author: "MTA Capital Construction Mega Projects", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Installing_copper_piping_that_will_connect_to_a_heating_and_cooling_unit_in_the_LIRR_passenger_concourse._(CM014B,_1-24-2019)_(31965163677).jpg" },
    runs: [
      { id: "R1", sys: "DCW", size: "1-1/4\"", mat: "Type L copper, insulated", conf: 0.85, pts: [[1018,322],[1212,262],[1402,202]], lbl: [960, 400], note: "Insulated main; press coupling at stub end." },
      { id: "R2", sys: "DHW", size: "1\"", mat: "Type L copper, insulated", conf: 0.83, pts: [[1088,216],[1316,148],[1402,122]], lbl: [1060, 110], note: "Upper insulated main." },
      { id: "R3", sys: "DCW", size: "3/4\"", mat: "Type L copper", conf: 0.88, pts: [[1212,264],[1218,340],[1226,420],[1238,520],[1250,600],[1258,630]], flow: 1, lbl: [1120, 470], note: "Drop from DCW main to sleeve." },
      { id: "R4", sys: "DHW", size: "3/4\"", mat: "Type L copper", conf: 0.76, pts: [[1316,150],[1318,220],[1324,300],[1342,420],[1366,505],[1386,570],[1393,604]], flow: 1, lbl: [1430, 430], note: "Branch source hidden by insulation — tee assumed on DHW main. Verify." },
      { id: "R5", sys: "DCW", size: "2\"", mat: "Type L copper", conf: 0.72, pts: [[455,290],[860,150],[1250,16]], lbl: [520, 160], note: "Overhead main, partially occluded by lift and worker." },
      { id: "R6", sys: "UNK", size: "3/4\"", mat: "Copper", conf: 0.6, pts: [[1050,522],[1150,650]], lbl: [880, 600], note: "Short stub at sleeve — not connected." }
    ],
    items: [
      { id: "TE1", layer: "fittings", type: "Tee", tag: "", size: "1-1/4\" × 3/4\"", sys: "DCW", at: [1212,262], lbl: [0,0], conf: 0.84, desc: "Reducing tee (press)", noCallout: true },
      { id: "TE2", layer: "fittings", type: "Tee (assumed)", tag: "", size: "1\" × 3/4\"", sys: "DHW", at: [1316,150], lbl: [0,0], conf: 0.66, desc: "Branch tee hidden by insulation", noCallout: true },
      { id: "C1", layer: "fittings", type: "Press coupling", tag: "", size: "1\"", sys: "DHW", at: [1114,208], lbl: [0,0], conf: 0.82, desc: "Press coupling at stub", noCallout: true },
      { id: "C2", layer: "fittings", type: "Press coupling", tag: "", size: "1-1/4\"", sys: "DCW", at: [1068,306], lbl: [0,0], conf: 0.82, desc: "Press coupling at stub", noCallout: true },
      { id: "CP1", layer: "fittings", type: "Cap (stub-out)", tag: "", size: "1\"", sys: "DHW", at: [1086,216], lbl: [0,0], conf: 0.75, desc: "Capped stub-out", noCallout: true },
      { id: "CP2", layer: "fittings", type: "Cap (stub-out)", tag: "", size: "1-1/4\"", sys: "DCW", at: [1018,322], lbl: [0,0], conf: 0.75, desc: "Capped stub-out", noCallout: true },
      { id: "P1", layer: "supports", type: "Penetration — firestop sleeve", tag: "PEN-1", size: "3/4\"", sys: "DCW", at: [1262,640], lbl: [1180, 800], conf: 0.9, desc: "Sleeved penetration with firestop sealant" },
      { id: "P2", layer: "supports", type: "Penetration — firestop sleeve", tag: "PEN-2", size: "3/4\"", sys: "DHW", at: [1398,612], lbl: [1440, 760], conf: 0.9, desc: "Sleeved penetration with firestop sealant" },
      { id: "P3", layer: "supports", type: "Penetration — firestop sleeve", tag: "PEN-3", size: "3/4\"", sys: "", at: [1166,664], lbl: [0,0], conf: 0.86, desc: "Sleeved penetration with firestop sealant", noCallout: true },
      { id: "S1", layer: "supports", type: "Wall strut channel", tag: "", size: "1-5/8\"", sys: "", at: [950,470], lbl: [0,0], conf: 0.85, desc: "Wall-mounted strut", line: [[800,500],[1102,440]], noCallout: true }
    ],
    dims: [
      { id: "D1", a: [1246,560], b: [1380,560], off: 70, text: "5\" C-C", conf: 0.72, basis: "Copper OD reference" },
      { id: "D2", a: [1170,264], b: [1170,632], off: 0, text: "1'-5\"", conf: 0.7, basis: "Copper OD reference; drop length", ext: [[1212,264],[1258,632]] }
    ],
    issues: [
      { id: "X1", title: "Verify firestop system", sev: "Medium", conf: 0.8, poly: [[1214,580],[1446,570],[1446,690],[1214,700]], lbl: [1260, 860], text: "Sealant present at 3 sleeves. Confirm listed firestop system number and label each penetration per spec." },
      { id: "X2", title: "Loose copper stub", sev: "High", conf: 0.74, poly: [[1030,500],[1180,500],[1180,700],[1030,700]], lbl: [820, 760], text: "3/4\" copper stub at PEN-3 is not connected or capped. Confirm intent; cap and test or remove." },
      { id: "X3", title: "Insulation short of tee", sev: "Low", conf: 0.69, poly: [[1176,236],[1250,236],[1250,300],[1176,300]], lbl: [1260, 320], text: "Insulation stops short at DCW tee. Complete before inspection." }
    ],
    stamp: [40, 1000],
    iso: {
      view: { cx: 0, cy: 0, scale: 40 },
      segs: [
        { run: "R1", a: [0,0.6,9.4], b: [5.0,0.6,9.4], dim: true, brk: "b" },
        { run: "R2", a: [0.6,0.6,10.0], b: [5.0,0.6,10.0], brk: "b" },
        { run: "R3", a: [2.6,0.6,9.4], b: [2.6,0.6,8.0], dim: true, flow: 1 },
        { run: "R3", a: [2.6,0.6,8.0], b: [2.6,-0.4,8.0] },
        { run: "R4", a: [3.4,0.6,10.0], b: [3.4,0.6,8.1], flow: 1 },
        { run: "R4", a: [3.4,0.6,8.1], b: [3.4,-0.4,8.1] },
        { run: "R6", a: [1.9,0.6,8.0], b: [1.9,-0.4,7.9] }
      ],
      syms: [
        { t: "tee", at: [2.6,0.6,9.4], item: "TE1" }, { t: "tee", at: [3.4,0.6,10.0], item: "TE2" },
        { t: "cap", at: [0,0.6,9.4], dir: "x" }, { t: "cap", at: [0.6,0.6,10.0], dir: "x" },
        { t: "sleeve", at: [2.6,0,8.0], dir: "y", item: "P1" }, { t: "sleeve", at: [3.4,0,8.1], dir: "y", item: "P2" }, { t: "sleeve", at: [1.9,0,7.95], dir: "y", item: "P3" },
        { t: "cloud", at: [1.9,0.6,8.3], item: "X2" }, { t: "cloud", at: [3.0,0,7.6], item: "X1" }
      ],
      notes: ["TYPE L COPPER, PRESS FITTINGS U.N.O.", "PENETRATIONS: SLEEVED, FIRESTOPPED — SYSTEM NO. TBD", "R5 OVERHEAD 2\" DCW NOT SHOWN (OCCLUDED)"]
    }
  },
  /* ------------------------------------------------------------------ FT-05 */
  {
    id: "FT-05", file: "ft05-lp-steam-room.jpg", w: 1075, h: 1434,
    title: "LP steam header & pump set", location: "Central plant · Pump room",
    taken: "2026-11-06 10:20", by: "Field crew (sample)", status: "reviewed", conf: 0.9,
    scale: "Scale ref: pipe label band height (assumed 2-1/4\")",
    ocrText: ["LOW PRESS. STEAM", "HEAT'G RETURN"],
    summary: "Reviewed set. LP steam header label read; pump discharge with flexible connector traced; riser beyond marked as continuing.",
    credit: { title: "Mechanical room.jpg", author: "P199 at English Wikipedia", license: "CC BY 2.5", url: "https://commons.wikimedia.org/wiki/File:Mechanical_room.jpg" },
    runs: [
      { id: "R1", sys: "LPS", size: "10\"", mat: "CS, insulated", conf: 0.93, pts: [[0,166],[540,218],[1075,272]], flow: 1, lbl: [560, 120], note: "Pipe marker \"LOW PRESS. STEAM\" read; marker arrow is double-headed — flow direction not asserted." },
      { id: "R2", sys: "HWS", size: "6\"", mat: "CS", conf: 0.87, pts: [[262,1330],[452,1330],[548,1318]], lbl: [330, 1240], note: "Pump discharge through flexible connector into insulated elbow. System suggested — confirm." },
      { id: "R3", sys: "HWS", size: "6\"", mat: "CS, insulated", conf: 0.74, pts: [[540,1290],[470,1225],[410,1175],[372,1110],[362,980]], lbl: [520, 1060], note: "Insulated riser beyond elbow; continuation hidden." },
      { id: "R4", sys: "HWR", size: "1-1/2\"", mat: "CS, insulated", conf: 0.7, pts: [[307,935],[307,1060]], lbl: [180, 980], note: "Small vertical with partial marker \"HEAT'G RETURN\"." }
    ],
    items: [
      { id: "P1", layer: "valves", type: "Pump (split-case / end-suction)", tag: "P-2", size: "", sys: "HWS", at: [150,1280], lbl: [40, 1120], conf: 0.88, desc: "Red pump casing — type to be confirmed from nameplate", box: [30,1140,256,1426] },
      { id: "FC1", layer: "fittings", type: "Flexible connector", tag: "", size: "6\"", sys: "HWS", at: [365,1330], lbl: [330, 1410], conf: 0.92, desc: "Braided flexible pump connector, flanged" },
      { id: "F1", layer: "fittings", type: "Flange pair", tag: "", size: "6\"", sys: "HWS", at: [274,1330], lbl: [0,0], conf: 0.9, desc: "6\" flange at pump discharge", noCallout: true },
      { id: "F2", layer: "fittings", type: "Flange pair", tag: "", size: "6\"", sys: "HWS", at: [448,1330], lbl: [0,0], conf: 0.9, desc: "6\" flange", noCallout: true },
      { id: "E1", layer: "fittings", type: "90° elbow (insulated)", tag: "", size: "6\"", sys: "HWS", at: [560,1310], lbl: [0,0], conf: 0.82, desc: "Insulated 90° elbow", noCallout: true },
      { id: "V1", layer: "valves", type: "Gate valve", tag: "", size: "2\"", sys: "", at: [296,1023], lbl: [0,0], conf: 0.78, desc: "Red handwheel isolation valve", noCallout: true },
      { id: "V2", layer: "valves", type: "Gate valve", tag: "", size: "2\"", sys: "", at: [440,1018], lbl: [600, 900], conf: 0.78, desc: "Red handwheel isolation valves (pair)" },
      { id: "V3", layer: "valves", type: "Gate valve", tag: "", size: "2\"", sys: "", at: [517,1023], lbl: [0,0], conf: 0.76, desc: "Red handwheel isolation valve", noCallout: true },
      { id: "G1", layer: "valves", type: "Pressure gauge", tag: "PI", size: "", sys: "", at: [333,527], lbl: [120, 600], conf: 0.83, desc: "Dial pressure gauge" },
      { id: "L1", layer: "labels", type: "Pipe marker (read)", tag: "LOW PRESS. STEAM", size: "", sys: "LPS", at: [446,210], lbl: [0,0], conf: 0.95, desc: "Pipe marker text read and bound to R1", noCallout: true }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Steam flow direction not asserted", sev: "Low", conf: 0.9, poly: [[320,180],[520,180],[520,240],[320,240]], lbl: [620, 360], text: "Marker arrow is double-headed. Flow direction left unassigned; add from P&ID." }
    ],
    stamp: [700, 1300],
    iso: {
      view: { cx: 0, cy: 0, scale: 22 },
      segs: [
        { run: "R1", a: [0,4,14.0], b: [20,4,14.0], dim: true, brk: "both" },
        { run: "R2", a: [1.8,0,1.4], b: [5.0,0,1.4], dim: true },
        { run: "R2", a: [5.0,0,1.4], b: [5.0,1.4,1.4] },
        { run: "R3", a: [5.0,1.4,1.4], b: [5.0,1.4,6.5], brk: "b" },
        { run: "R4", a: [3.6,2.6,5.0], b: [3.6,2.6,7.5], brk: "both" }
      ],
      syms: [
        { t: "pump", at: [1.2,0,1.4], item: "P1", label: "P-2" },
        { t: "flex", at: [3.0,0,1.4], dir: "x", item: "FC1" },
        { t: "flange", at: [2.2,0,1.4], dir: "x" }, { t: "flange", at: [3.8,0,1.4], dir: "x" },
        { t: "label", at: [8,4,14.0], text: "LOW PRESS. STEAM" }
      ],
      notes: ["REVIEWED SET — ALL MARKUPS ACCEPTED", "CONTINUATIONS SHOWN WITH BREAK SYMBOL", "HEADER LENGTH IN FRAME ≈ 20'-0\" (ESTIMATED)"]
    }
  },
  /* ------------------------------------------------------------------ FT-06 */
  {
    id: "FT-06", file: "ft06-ceiling-low-light.jpg", w: 1600, h: 1200,
    title: "Ceiling space above corridor — low light", location: "Level B1 · Corridor D ceiling",
    taken: "2026-11-11 16:48", by: "Field crew (sample)", status: "attention", conf: 0.61,
    scale: "No reliable scale reference in frame",
    ocrText: [],
    summary: "Low light, lamp glare and the lift occlude most of the ceiling. 3 of 5 runs fall below the 70% threshold — routed to human review instead of auto-drafting.",
    credit: { title: "Installing hangers for piping along the east service corridor of the future LIRR concourse (CM014B, 08-30-2018)", author: "MTA Capital Construction Mega Projects", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Installing_hangers_for_piping_along_the_east_service_corridor_of_the_future_LIRR_concourse._(CM014B,_08-30-2018)_(44340219192).jpg" },
    runs: [
      { id: "R1", sys: "UNK", size: "6\"?", mat: "Insulated, metal jacket", conf: 0.66, pts: [[1047,0],[1047,250],[1047,505]], lbl: [860, 120], note: "Jacketed insulation — system not identifiable (no marker in frame)." },
      { id: "R2", sys: "DCW", size: "3\"?", mat: "Copper", conf: 0.71, pts: [[1246,0],[1246,300],[1240,440]], lbl: [1300, 120], note: "Copper color; size estimated without scale." },
      { id: "R3", sys: "UNK", size: "2\"?", mat: "Copper", conf: 0.58, pts: [[1262,452],[1430,452],[1600,452]], lbl: [1420, 640], note: "Partially hidden behind fittings and insulation." },
      { id: "R4", sys: "UNK", size: "1-1/2\"?", mat: "Copper", conf: 0.61, pts: [[1531,0],[1470,180],[1408,360]], lbl: [1440, 40], note: "Diagonal — may be a sloped drain or perspective." },
      { id: "R5", sys: "UNK", size: "?", mat: "Insulated (black)", conf: 0.52, pts: [[1000,540],[1300,540],[1600,540]], lbl: [1180, 620], note: "Dark insulated run; edges lost in shadow." }
    ],
    items: [
      { id: "S1", layer: "supports", type: "Clevis / band (verify)", tag: "", size: "", sys: "", at: [1047,236], lbl: [820, 300], conf: 0.63, desc: "Band at insulated run — clevis hanger?" },
      { id: "E1", layer: "fittings", type: "Elbow (copper)", tag: "", size: "3\"?", sys: "DCW", at: [1244,452], lbl: [0,0], conf: 0.6, desc: "Copper elbow to horizontal — occluded", noCallout: true }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Low confidence — re-shoot or verify", sev: "High", conf: 0.95, poly: [[960,0],[1600,0],[1600,600],[960,600]], lbl: [520, 140], text: "Lamp glare and shadow: 3 of 5 runs below 70% confidence. Not auto-drafted. Re-shoot with flash from aisle, or verify in field." },
      { id: "X2", title: "Occluded by lift & worker", sev: "Medium", conf: 0.9, poly: [[980,600],[1600,600],[1600,1200],[980,1200]], lbl: [520, 940], text: "Lower ceiling and branch continuations hidden. Second angle needed before as-built." }
    ],
    stamp: null,
    iso: {
      view: { cx: 0, cy: 0, scale: 30 },
      segs: [
        { run: "R1", a: [0,0,12.0], b: [0,0,9.5], brk: "a" },
        { run: "R2", a: [2.0,0,12.0], b: [2.0,0,9.6], brk: "a" },
        { run: "R2", a: [2.0,0,9.6], b: [2.0,3.0,9.6] },
        { run: "R3", a: [2.0,3.0,9.6], b: [2.0,8,9.6], brk: "b" },
        { run: "R5", a: [-0.5,0,9.0], b: [-0.5,8,9.0], brk: "both" }
      ],
      syms: [ { t: "cloud", at: [1.0,3,10.6], item: "X1" } ],
      notes: ["NOT ISSUED — HELD FOR REVIEW", "DASHED RUNS BELOW 70% CONFIDENCE", "SIZES UNVERIFIED (NO SCALE REFERENCE)"]
    }
  }
  ]
};
