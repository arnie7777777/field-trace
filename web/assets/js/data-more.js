/* Field Trace — prepared materials / OD / instrument / valve examples, and the property enrichment
 * applied to FT-01…FT-06. Same rules as data.js: every coordinate is in the photo's pixel space and
 * was placed by inspecting the photo; "conf" values are illustrative, not measured outputs.
 *
 * Rules these examples follow (and the live analysis follows too):
 *  - Material is SUGGESTED from visible cues; paint and insulation lower the confidence.
 *  - OD is what a photo can estimate (needs a scale). Wall thickness / schedule is never visible:
 *    a schedule is only ever "suggested" from stencils, flange class, service and convention.
 *  - Valves: the operator is outside (handwheel, lever, gear, actuator). The body is inside. With a
 *    rotating stem we name the quarter-turn family (ball or butterfly); with a rising stem the
 *    multi-turn family (gate, globe or plug). We don't pick one inside a family from the outside.
 *  - Instruments: name the device type that is visible; never a model or range that isn't legible.
 */
(function () {
  const FT = window.FT;
  const QT = "quarter-turn (ball or butterfly)", MT = "multi-turn / rising stem (gate, globe or plug)";
  const SCHED_NOTE = "Wall is not visible from the photo. Pressure / temperature rating and remaining corrosion allowance depend on it — verify.";

  /* ------------------------------------------------ enrichment of FT-01 … FT-06 */
  const R = {
    "FT-01": {
      "R1,R2,R3,R4": { material: "CS", matConf: 0.8, odClass: "NPS", od: "6.625\"", sched: "Sch 40", schedConf: 0.55,
        schedBasis: "6\" tower / condenser water with 150# flanges: Sch 40 (standard wall) is the usual spec.",
        matCues: ["Painted finish: base metal hidden by paint", "150# raised-face flanges, handwheel and gear valves", "Large-bore condenser water: carbon steel is the usual spec"], matAlt: ["GALV under paint"] }
    },
    "FT-02": {
      "R1,R2": { material: "CS", matConf: 0.8, odClass: "NPS", od: "2.875\"", sched: "Sch 10", schedConf: 0.4,
        schedBasis: "Roll-grooved light wall is common at 2-1/2\". Grooves don't prove the wall: Sch 40 is also grooved.",
        matCues: ["Black / dark-painted steel", "Roll-grooved ends with rigid couplings"], matAlt: ["GALV (painted)"] },
      "R3": { material: "GALV", matConf: 0.6, odClass: "NPS", od: "2.375\"", sched: "Sch 40", schedConf: 0.35, schedBasis: "Galvanized is most often Sch 40 threaded.",
        matCues: ["Lighter zinc-grey finish begins at the coupling", "A finish change at a joint usually means a material change"], matAlt: ["CS with lighter paint", "SS"] },
      "R4": { material: "UNK", matConf: 0.3, odClass: "unknown", od: "", matCues: ["Thin black element — could be threaded rod"] }
    },
    "FT-03": {
      "R1,R2": { material: "CS", matConf: 0.5, concealed: true, odClass: "NPS", od: "8.625\" (if 8\" NPS)", sched: "Std (Sch 40)", schedConf: 0.3,
        schedBasis: "Service convention only (chilled water main). Pipe is insulated, so neither OD nor wall is visible.",
        matCues: ["Insulation and PVC jacket hide the pipe", "Mains this size are usually steel: confirm from the spec"], matAlt: ["Copper (smaller mains)", "Pre-insulated plastic"] },
      "R3": { material: "CS", matConf: 0.5, concealed: true, odClass: "NPS", od: "4.5\" (if 4\" NPS)", sched: "Std (Sch 40)", schedConf: 0.3,
        schedBasis: "Service convention only (heating hot water).", matCues: ["Insulated: pipe not visible"], matAlt: ["Copper"] },
      "R4,R5": { material: "CS", matConf: 0.86, odClass: "NPS", od: "4.5\"", sched: "Sch 10", schedConf: 0.45,
        schedBasis: "Light-wall grooved steel is common for sprinkler mains. Verify against the FP submittal.",
        matCues: ["Red-painted sprinkler main", "Grooved couplings"], matAlt: ["GALV (dry systems)"] }
    },
    "FT-04": {
      "R3,R4,R5,R6": { material: "CU", matConf: 0.92, odClass: "CTS", sched: "Type L", schedConf: 0.45,
        schedBasis: "Type L is the usual domestic-water spec. K, L and M share the OD; only the print line colour (K green, L blue, M red) shows the wall.",
        matCues: ["Copper colour with metallic sheen", "Press fittings", "Domestic water service"], matAlt: [] },
      "R1,R2": { material: "CU", matConf: 0.78, concealed: true, odClass: "CTS", sched: "Type L", schedConf: 0.4,
        schedBasis: "Type L usual for domestic water; insulated, so the print line isn't visible.",
        matCues: ["Insulated: copper visible only at the capped stub ends", "Press couplings at stubs"], matAlt: [] }
    },
    "FT-05": {
      "R1": { material: "CS", matConf: 0.7, concealed: true, odClass: "NPS", od: "10.75\" (if 10\" NPS)", sched: "Sch 40", schedConf: 0.4,
        schedBasis: "Low-pressure steam: Sch 40 steel is common. Condensate is often heavier (Sch 80) for corrosion allowance.",
        matCues: ["Insulated steam header", "Steam service: carbon steel is the norm"], matAlt: [] },
      "R2": { material: "CS", matConf: 0.8, odClass: "NPS", od: "6.625\"", sched: "Sch 40", schedConf: 0.4, schedBasis: "Pump discharge, flanged: Sch 40 typical.", matCues: ["Painted steel visible at the pump flange"], matAlt: [] },
      "R3,R4": { material: "CS", matConf: 0.55, concealed: true, odClass: "NPS", sched: "Sch 40", schedConf: 0.3, schedBasis: "Service convention only.", matCues: ["Insulated: pipe not visible"], matAlt: ["Copper (small HW lines)"] }
    },
    "FT-06": {
      "R1": { material: "UNK", matConf: 0.35, concealed: true, odClass: "unknown", matCues: ["Metal insulation jacket hides the pipe"], matAlt: ["CS", "CU"] },
      "R2,R3,R4": { material: "CU", matConf: 0.72, odClass: "CTS", sched: "Type L", schedConf: 0.3, schedBasis: "Domestic water convention; print line not visible in low light.", matCues: ["Copper colour under lamp light", "Soldered fittings"], matAlt: ["Brass / bronze fittings"] },
      "R5": { material: "UNK", matConf: 0.3, concealed: true, odClass: "unknown", matCues: ["Black insulation, edges lost in shadow"], matAlt: ["CS", "CU"] }
    }
  };
  const ITEMS = {
    "FT-01": {
      "V1,V2": { type: "Handwheel valve", kind: "valve", operator: "Handwheel", stem: "Multi-turn (linear stem)", family: MT,
        bodyNote: "Flanged body; long bonnet is consistent with a gate valve, but the body style is inside the pipe. Not asserted." },
      "V3": { type: "Gear-operated valve", kind: "valve", operator: "Gear operator", stem: "Rotating (quarter-turn)", family: QT,
        bodyNote: "Thin lug body between flanges fits a butterfly valve. Verify, because the disc and seat are inside." },
      "B1,B2": { type: "Lever valve (drain / vent)", kind: "valve", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Small threaded body. Ball vs. butterfly not asserted." },
      "T1,T2,T3,T4": { type: "Thermometer in thermowell", kind: "instrument", inst: "temperature", bodyNote: "Dial stem thermometer. Range not legible." },
      "Q1": { kind: "equipment" }
    },
    "FT-05": {
      "V1,V2,V3": { type: "Handwheel valve", kind: "valve", operator: "Handwheel", stem: "Multi-turn (linear stem)", family: MT, bodyNote: "Body style not visible." },
      "G1": { type: "Pressure gauge (dial)", kind: "instrument", inst: "pressure", bodyNote: "Dial face visible. Range and units not legible." },
      "P1": { kind: "equipment" }
    }
  };
  const apply = (map, list) => Object.entries(map || {}).forEach(([ids, props]) => ids.split(",").forEach((id) => { const o = list.find((x) => x.id === id); if (o) Object.assign(o, props); }));
  FT.photos.forEach((p) => { apply(R[p.id], p.runs); apply(ITEMS[p.id], p.items); });

  /* ------------------------------------------------ new prepared examples */
  FT.photos.push(
  /* ---------------------------------------------------------------- FT-07 */
  {
    id: "FT-07", file: "ft07-mixed-materials.jpg", w: 1600, h: 1259,
    title: "Mixed materials — black steel, copper, galvanized", location: "Prefab shop · mock-up wall",
    taken: "2026-11-11 08:10", by: "Field crew (sample)", status: "ready", conf: 0.86,
    scale: "Scale assumed from copper OD (22 mm tube) ≈ 30 px. Lengths are rough estimates",
    ocrText: [],
    summary: "Three materials in one frame. Black steel with welded joints, bent copper with brass unions, galvanized with brazed branches. Each run is tagged with a suggested material, and the takeoff splits by material.",
    credit: { title: "Travail du cuivre, de l'acier galvanisé et de l'acier noir (cropped)", author: "Le plombier du désert", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Travail_du_cuivre,_de_l%27acier_galvanis%C3%A9_et_de_l%27acie_noir.JPG" },
    runs: [
      { id: "R1", sys: "UNK", size: "3/4\"?", material: "CS", matConf: 0.9, odClass: "NPS", od: "≈1.05\"", sched: "Sch 40", schedConf: 0.3, schedBasis: "Threaded/welded black steel at this size is usually Sch 40.", mat: "Black steel, bent, welded", conf: 0.9, pts: [[78,82],[350,82],[420,92],[480,118],[530,160],[565,210],[585,265],[592,320],[592,555]], lbl: [640, 250], matCues: ["Dark mill-scale finish, no paint", "Welded socket at the header", "Hot-bent sweep (no fitting)"], matAlt: [], note: "Large-radius bend is bent pipe, so it isn't counted as a fitting." },
      { id: "R2", sys: "UNK", size: "3/4\"?", material: "CU", matConf: 0.95, odClass: "CTS", od: "≈0.875\" (22 mm)", sched: "Type L", schedConf: 0.25, schedBasis: "No print line visible. Type is a guess from common practice.", mat: "Copper tube, bent", conf: 0.92, pts: [[80,185],[350,185],[405,196],[448,228],[475,275],[486,330],[488,430],[476,490],[469,545],[474,610],[483,700],[485,1000]], lbl: [530, 640], matCues: ["Copper colour with bright specular highlight", "Soft bends and an offset made without fittings", "Brass union at the bottom"], matAlt: [], note: "Offset jogs in front of the steel header." },
      { id: "R3", sys: "UNK", size: "3/4\"?", material: "CS", matConf: 0.88, odClass: "NPS", od: "≈1.05\"", sched: "Sch 40", schedConf: 0.3, schedBasis: "Convention for black steel at this size.", mat: "Black steel, welded elbow", conf: 0.9, pts: [[82,295],[335,295],[365,305],[380,325],[383,350],[383,555]], lbl: [110, 420], matCues: ["Dark finish", "Welded 90° elbow with visible bead"], matAlt: [], note: "" },
      { id: "R4", sys: "UNK", size: "1\"?", material: "CS", matConf: 0.9, odClass: "NPS", od: "≈1.32\"", sched: "Sch 40", schedConf: 0.3, schedBasis: "Convention only.", mat: "Black steel header, swaged ends", conf: 0.93, pts: [[80,577],[1515,578]], lbl: [650, 500], matCues: ["Dark finish, weld beads at every branch", "Swaged (reduced) ends"], matAlt: [], note: "Header with two swaged ends and five welded branches." },
      { id: "R5", sys: "UNK", size: "3/4\"?", material: "CS", matConf: 0.9, odClass: "NPS", od: "≈1.05\"", sched: "Sch 40", schedConf: 0.3, schedBasis: "Convention only.", mat: "Black steel, bent", conf: 0.9, pts: [[1510,75],[1250,75],[1170,82],[1100,108],[1045,150],[1015,205],[1003,260],[1002,555]], lbl: [830, 330], matCues: ["Dark finish", "Hot-bent sweep"], matAlt: [], note: "" },
      { id: "R6", sys: "UNK", size: "3/4\"?", material: "CU", matConf: 0.95, odClass: "CTS", od: "≈0.875\" (22 mm)", sched: "Type L", schedConf: 0.25, schedBasis: "No print line visible.", mat: "Copper tube, bent", conf: 0.91, pts: [[1512,173],[1260,173],[1180,180],[1130,210],[1105,255],[1095,300],[1092,410],[1105,470],[1110,520],[1105,600],[1100,700],[1100,1000]], lbl: [1150, 680], matCues: ["Copper colour with specular highlight", "Brass union at the bottom"], matAlt: [], note: "" },
      { id: "R7", sys: "UNK", size: "3/4\"?", material: "CS", matConf: 0.88, odClass: "NPS", od: "≈1.05\"", sched: "Sch 40", schedConf: 0.3, schedBasis: "Convention only.", mat: "Black steel, welded elbow", conf: 0.9, pts: [[1512,278],[1260,278],[1225,282],[1207,298],[1203,325],[1203,555]], lbl: [1290, 420], matCues: ["Dark finish", "Welded elbow"], matAlt: [], note: "" },
      { id: "R8", sys: "UNK", size: "1\"?", material: "CS", matConf: 0.88, odClass: "NPS", od: "≈1.32\" → reduced", sched: "Sch 40", schedConf: 0.3, schedBasis: "Convention only.", mat: "Black steel drop with concentric reducer", conf: 0.88, pts: [[787,600],[787,1180]], lbl: [830, 860], matCues: ["Dark finish", "Swaged reducer near the bottom"], matAlt: [], note: "" },
      { id: "R9", sys: "UNK", size: "1\"?", material: "GALV", matConf: 0.74, odClass: "NPS", od: "≈1.32\"", sched: "Sch 40", schedConf: 0.35, schedBasis: "Galvanized is most often Sch 40.", mat: "Galvanized steel, brazed branches", conf: 0.86, pts: [[80,1098],[640,1098],[720,1108],[787,1113],[860,1108],[940,1098],[1525,1098]], lbl: [560, 1170], matCues: ["Dull zinc-grey, matte, slightly mottled", "No paint, no rust", "Offset bent under the steel drop"], matAlt: ["SS (weathered)", "Grey-painted CS"], note: "Galvanized vs. weathered stainless: check for zinc spangle, or use a magnet (galvanized steel is magnetic)." },
      { id: "R10", sys: "UNK", size: "1\"?", material: "GALV", matConf: 0.72, odClass: "NPS", od: "≈1.32\"", sched: "Sch 40", schedConf: 0.35, schedBasis: "Convention only.", mat: "Galvanized stub", conf: 0.88, pts: [[230,802],[230,1080]], lbl: [260, 720], matCues: ["Zinc-grey finish, brass braze fillet at the base"], matAlt: ["SS"], note: "" },
      { id: "R11", sys: "UNK", size: "1\"?", material: "GALV", matConf: 0.72, odClass: "NPS", od: "≈1.32\"", sched: "Sch 40", schedConf: 0.35, schedBasis: "Convention only.", mat: "Galvanized stub", conf: 0.88, pts: [[1365,795],[1365,1080]], lbl: [1390, 720], matCues: ["Zinc-grey finish, brass braze fillet at the base"], matAlt: ["SS"], note: "" }
    ],
    items: [
      { id: "T1", layer: "fittings", type: "Welded branch (tee)", tag: "", size: "1\"?", sys: "", at: [787,590], lbl: [900, 640], conf: 0.88, desc: "Welded tee into the drop. Bead visible" },
      { id: "E1", layer: "fittings", type: "90° elbow (welded)", tag: "", size: "3/4\"?", sys: "", at: [370,305], lbl: [0,0], conf: 0.86, desc: "Short-radius welded elbow", noCallout: true },
      { id: "E2", layer: "fittings", type: "90° elbow (welded)", tag: "", size: "3/4\"?", sys: "", at: [1212,290], lbl: [0,0], conf: 0.86, desc: "Short-radius welded elbow", noCallout: true },
      { id: "RD1", layer: "fittings", type: "Concentric reducer (swaged)", tag: "", size: "", sys: "", at: [787,1000], lbl: [0,0], conf: 0.8, desc: "Swaged reduction on the drop", noCallout: true },
      { id: "U1", layer: "fittings", type: "Union (brass): copper → galvanized", tag: "", size: "3/4\"?", sys: "", at: [485,1025], lbl: [560, 950], conf: 0.85, desc: "Brass union between copper and galvanized" },
      { id: "U2", layer: "fittings", type: "Union (brass): copper → galvanized", tag: "", size: "3/4\"?", sys: "", at: [1100,1025], lbl: [0,0], conf: 0.85, desc: "Brass union between copper and galvanized", noCallout: true },
      { id: "J1", layer: "fittings", type: "Brazed branch joint", tag: "", size: "", sys: "", at: [230,1085], lbl: [0,0], conf: 0.78, desc: "Brass-coloured braze fillet", noCallout: true },
      { id: "J2", layer: "fittings", type: "Brazed branch joint", tag: "", size: "", sys: "", at: [1365,1085], lbl: [0,0], conf: 0.78, desc: "Brass-coloured braze fillet", noCallout: true },
      { id: "S1", layer: "supports", type: "Pipe clip (typ.)", tag: "", size: "", sys: "", at: [233,85], lbl: [260, 20], conf: 0.9, desc: "Single-bolt pipe clip to wall" },
      { id: "S2", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [233,185], lbl: [0,0], conf: 0.88, desc: "Pipe clip", noCallout: true },
      { id: "S3", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [305,570], lbl: [0,0], conf: 0.88, desc: "Pipe clip", noCallout: true },
      { id: "S4", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [1285,575], lbl: [0,0], conf: 0.88, desc: "Pipe clip", noCallout: true },
      { id: "S5", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [790,875], lbl: [0,0], conf: 0.88, desc: "Pipe clip", noCallout: true },
      { id: "S6", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [360,1100], lbl: [0,0], conf: 0.86, desc: "Pipe clip", noCallout: true },
      { id: "S7", layer: "supports", type: "Pipe clip", tag: "", size: "", sys: "", at: [1225,1100], lbl: [0,0], conf: 0.86, desc: "Pipe clip", noCallout: true }
    ],
    dims: [
      { id: "D1", a: [80,640], b: [1515,640], off: 0, text: "3'-5\"", conf: 0.66, basis: "Copper OD reference (22 mm assumed) at wall plane" }
    ],
    issues: [
      { id: "X1", title: "Copper ↔ galvanized connection", sev: "Medium", conf: 0.82, poly: [[440,975],[535,975],[535,1120],[440,1120]], lbl: [600, 1000], text: "Copper joins galvanized through a brass union. Brass is a common transition, but confirm the spec's dielectric requirement here." },
      { id: "X2", title: "Heat on galvanized joints", sev: "Low", conf: 0.7, poly: [[180,1045],[285,1045],[285,1135],[180,1135]], lbl: [40, 920], text: "Brazing burns the zinc off near the joint. Confirm the joint method is allowed and touch up the coating per spec." },
      { id: "X3", title: "Galvanized or stainless?", sev: "Low", conf: 0.66, poly: [[880,1062],[1060,1062],[1060,1140],[880,1140]], lbl: [1180, 1160], text: "Matte zinc-grey suggests galvanized. Weathered stainless can look similar. A magnet or spangle check settles it." }
    ],
    stamp: [40, 1140],
    iso: {
      view: { cx: 0, cy: 0, scale: 60 },
      segs: [
        { run: "R1", a: [0.19, 0, 2.83], b: [1.42, 0, 2.83] }, { run: "R1", a: [1.42, 0, 2.83], b: [1.42, 0, 1.64] },
        { run: "R2", a: [0.19, 0, 2.58], b: [1.17, 0, 2.58] }, { run: "R2", a: [1.17, 0, 2.58], b: [1.17, 0, 0.39] },
        { run: "R3", a: [0.2, 0, 2.32], b: [0.92, 0, 2.32] }, { run: "R3", a: [0.92, 0, 2.32], b: [0.92, 0, 1.64] },
        { run: "R4", a: [0.19, 0, 1.64], b: [3.64, 0, 1.64], dim: true },
        { run: "R5", a: [3.63, 0, 2.85], b: [2.41, 0, 2.85] }, { run: "R5", a: [2.41, 0, 2.85], b: [2.41, 0, 1.64] },
        { run: "R6", a: [3.64, 0, 2.61], b: [2.64, 0, 2.61] }, { run: "R6", a: [2.64, 0, 2.61], b: [2.64, 0, 0.39] },
        { run: "R7", a: [3.64, 0, 2.36], b: [2.89, 0, 2.36] }, { run: "R7", a: [2.89, 0, 2.36], b: [2.89, 0, 1.64] },
        { run: "R8", a: [1.89, 0, 1.64], b: [1.89, 0, 0.19], dim: true },
        { run: "R9", a: [0.19, 0, 0.39], b: [3.67, 0, 0.39], dim: true },
        { run: "R10", a: [0.55, 0, 1.1], b: [0.55, 0, 0.39] }, { run: "R11", a: [3.28, 0, 1.12], b: [3.28, 0, 0.39] }
      ],
      syms: [
        { t: "tee", at: [1.89, 0, 1.64], item: "T1" },
        { t: "coupling", at: [1.17, 0, 0.56], dir: "z", item: "U1" }, { t: "coupling", at: [2.64, 0, 0.56], dir: "z", item: "U2" },
        { t: "hanger", at: [0.56, 0, 2.83], item: "S1" }, { t: "hanger", at: [0.73, 0, 1.64] }, { t: "hanger", at: [3.09, 0, 1.64] },
        { t: "cloud", at: [1.17, 0, 0.75], item: "X1" }
      ],
      notes: ["SCALE FROM COPPER OD (22 MM ASSUMED): LENGTHS APPROXIMATE", "BENDS SHOWN AS CORNERS. BENT PIPE, NO FITTING", "MATERIALS SUGGESTED: CS BLACK · CU · GALV. VERIFY"]
    }
  },
  /* ---------------------------------------------------------------- FT-08 */
  {
    id: "FT-08", file: "ft08-stainless-process.jpg", w: 1600, h: 1200,
    title: "Process rack — stainless and jacketed lines", location: "Process area · utility rack",
    taken: "2026-11-11 10:05", by: "Field crew (sample)", status: "ready", conf: 0.72,
    scale: "No reliable scale reference in frame. Lengths held until one size is confirmed",
    ocrText: [],
    summary: "Bare stainless traced and tagged SS. Aluminium-jacketed lines are marked concealed, with a lower-confidence suggestion. Valves are identified by operator and stem family, and gauges by type.",
    credit: { title: "Potrubí", author: "Janchromý", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Potrub%C3%AD.jpg" },
    runs: [
      { id: "R1", sys: "UNK", size: "?", material: "SS", matConf: 0.4, concealed: true, odClass: "unknown", od: "Jacket OD only", sched: "", schedBasis: "", mat: "Insulated, metal jacket", conf: 0.84, wpx: 70, pts: [[0,282],[262,285],[302,296],[324,322],[331,362],[331,452],[346,494],[382,517],[450,521],[600,521]], lbl: [60, 380], matCues: ["Metal jacket over insulation: pipe not visible", "Neighbouring bare lines are stainless"], matAlt: ["CS", "Any pipe under an aluminium jacket"], note: "The jacket OD isn't the pipe OD. Size can't be measured here." },
      { id: "R2", sys: "UNK", size: "?", material: "SS", matConf: 0.4, concealed: true, odClass: "unknown", od: "Jacket OD only", sched: "", schedBasis: "", mat: "Insulated, metal jacket", conf: 0.82, wpx: 70, pts: [[1108,220],[1300,216],[1362,238],[1400,285],[1412,340],[1412,935]], lbl: [1440, 560], matCues: ["Metal jacket with banded seams"], matAlt: ["CS"], note: "" },
      { id: "R3", sys: "UNK", size: "?", material: "SS", matConf: 0.82, odClass: "NPS (S) or OD tube", od: "", sched: "Sch 10S", schedConf: 0.3, schedBasis: "Common for process stainless. Sanitary tube is sized by OD and wall instead. Verify from the spec or mill marking.", mat: "Stainless, bare", conf: 0.8, wpx: 50, pts: [[972,0],[972,820]], lbl: [1010, 60], matCues: ["Bright unpainted metal with a long specular streak", "No paint, no rust: process setting", "Thin-wall look"], matAlt: ["Aluminium jacket (check for seams)"], note: "" },
      { id: "R4", sys: "UNK", size: "?", material: "SS", matConf: 0.74, odClass: "NPS (S) or OD tube", sched: "Sch 10S", schedConf: 0.25, schedBasis: "Convention for process stainless. Verify.", mat: "Stainless, bare", conf: 0.7, wpx: 34, pts: [[800,507],[1372,507]], lbl: [1100, 430], matCues: ["Bright mill finish"], matAlt: [], note: "" },
      { id: "R5", sys: "UNK", size: "?", material: "SS", matConf: 0.76, odClass: "NPS (S) or OD tube", sched: "Sch 10S", schedConf: 0.25, schedBasis: "Convention for process stainless. Verify.", mat: "Stainless, bent", conf: 0.74, wpx: 26, pts: [[760,350],[760,590],[775,625],[810,640],[860,650],[880,680],[886,760]], lbl: [620, 420], matCues: ["Bright finish; tight bends without fittings (tube)"], matAlt: [], note: "Bent without fittings suggests OD tube rather than pipe." },
      { id: "R6", sys: "UNK", size: "?", material: "SS", matConf: 0.66, odClass: "NPS (S) or OD tube", sched: "", schedBasis: "", mat: "Stainless (partly hidden)", conf: 0.62, wpx: 30, pts: [[575,815],[650,850],[740,875],[820,890],[870,920]], lbl: [470, 760], matCues: ["Metallic, partly behind the cable tray"], matAlt: [], note: "Partly hidden behind the cable tray." }
    ],
    items: [
      { id: "V1", layer: "valves", kind: "valve", type: "Lever valve (blue handle)", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Lever handle points along the line. Ball vs. butterfly not asserted.", tag: "", size: "", sys: "", at: [668,860], lbl: [440, 930], conf: 0.74, desc: "Quarter-turn lever valve" },
      { id: "V2", layer: "valves", kind: "valve", type: "Lever valve (blue handle)", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Body style not asserted.", tag: "", size: "", sys: "", at: [887,938], lbl: [0,0], conf: 0.72, desc: "Quarter-turn lever valve", noCallout: true },
      { id: "V3", layer: "valves", kind: "valve", type: "Handwheel valve", operator: "Handwheel", stem: "Multi-turn (linear stem)", family: MT, bodyNote: "Body below the frame edge. Family from the operator only.", tag: "", size: "", sys: "", at: [690,1078], lbl: [760, 1130], conf: 0.7, desc: "Multi-turn handwheel" },
      { id: "V4", layer: "valves", kind: "valve", type: "Actuated valve (electric)", operator: "Electric actuator (red housing)", stem: "Not visible", family: "unknown", bodyNote: "The actuator is visible. Stem motion and body are not, so no family is asserted.", tag: "", size: "", sys: "", at: [285,1140], lbl: [40, 1010], conf: 0.66, desc: "Electric actuator on a valve below the frame" },
      { id: "I1", layer: "valves", kind: "instrument", inst: "pressure", type: "Pressure gauge (dial)", bodyNote: "Dial face, bottom connection. Range not legible.", tag: "", size: "", sys: "", at: [310,872], lbl: [60, 700], conf: 0.7, desc: "Dial gauge" },
      { id: "I2", layer: "valves", kind: "instrument", inst: "pressure", type: "Pressure gauge (dial)", bodyNote: "Second dial gauge. Could be compound. Range not legible.", tag: "", size: "", sys: "", at: [360,872], lbl: [0,0], conf: 0.66, desc: "Dial gauge", noCallout: true },
      { id: "E1", layer: "fittings", type: "Elbow (jacketed)", tag: "", size: "", sys: "", at: [318,312], lbl: [0,0], conf: 0.84, desc: "Jacketed elbow", noCallout: true },
      { id: "E2", layer: "fittings", type: "Elbow (jacketed)", tag: "", size: "", sys: "", at: [360,510], lbl: [0,0], conf: 0.82, desc: "Jacketed elbow", noCallout: true },
      { id: "E3", layer: "fittings", type: "Elbow (jacketed)", tag: "", size: "", sys: "", at: [1385,255], lbl: [0,0], conf: 0.82, desc: "Jacketed elbow", noCallout: true }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Material concealed by jacket", sev: "Medium", conf: 0.8, poly: [[255,250],[425,250],[425,565],[255,565]], lbl: [470, 160], text: "Aluminium jacket over insulation. Pipe material and OD can't be seen, so SS is a suggestion from the neighbouring lines. Verify from the spec." },
      { id: "X2", title: "Cable tray (not piping)", sev: "Low", conf: 0.75, poly: [[560,640],[900,640],[900,815],[560,815]], lbl: [960, 700], text: "Wire tray excluded from the trace. Check clearance where it crosses the stainless lines." },
      { id: "X3", title: "Background runs not traced", sev: "Low", conf: 0.7, poly: [[1030,600],[1330,600],[1330,900],[1030,900]], lbl: [1180, 960], text: "Dense rack. Lines behind the front layer need a second angle before an as-built." }
    ],
    stamp: null,
    iso: null, isoHeld: "Not drafted: dense rack, no scale reference. Confirm one bare-pipe size in the workspace and lengths follow."
  },
  /* ---------------------------------------------------------------- FT-09 */
  {
    id: "FT-09", file: "ft09-pex-copper-ceiling.jpg", w: 1008, h: 825,
    title: "PEX and copper — basement ceiling", location: "Residential · basement ceiling",
    taken: "2026-11-11 14:22", by: "Field crew (sample)", status: "ready", conf: 0.78,
    scale: "Scale assumed from 3/4\" PEX OD (0.875\") ≈ 27 px. Confirm in the workspace",
    ocrText: [],
    summary: "Blue and red PEX tagged as composite & plastic (subtype PEX), with a copper stub beyond. Brass lever valves are named by family. Armoured electrical cable is excluded, not traced as pipe.",
    credit: { title: "PEX piping in basement ceiling", author: "Tomwsulcer", license: "CC0 1.0", url: "https://commons.wikimedia.org/wiki/File:PEX_piping_in_basement_ceiling.jpg" },
    cal: { run: "R4", size: "3/4\"", od: 0.875, note: "Assumed 3/4\" PEX (CTS 0.875\" OD). Confirm" },
    runs: [
      { id: "R1", sys: "UNK", size: "3/4\"?", material: "COMP", matSub: "PEX", matConf: 0.78, odClass: "CTS", od: "0.875\"?", sched: "SDR 9", schedConf: 0.5, schedBasis: "PEX tubing is made to SDR 9. Confirm on the print line.", mat: "PEX (blue)", conf: 0.86, wpx: 27, pts: [[256,136],[612,148]], lbl: [330, 40], matCues: ["Blue, glossy, flexible jacket", "Brass crimp fittings and brass lever valves", "Blue = cold by convention, not a rule"], matAlt: ["Blue-painted copper"], note: "" },
      { id: "R2", sys: "UNK", size: "3/4\"?", material: "COMP", matSub: "PEX", matConf: 0.76, odClass: "CTS", od: "0.875\"?", sched: "SDR 9", schedConf: 0.5, schedBasis: "PEX tubing is SDR 9.", mat: "PEX (blue)", conf: 0.82, wpx: 27, pts: [[612,150],[830,168]], lbl: [700, 230], matCues: ["Blue PEX continues past the tee"], matAlt: [], note: "" },
      { id: "R3", sys: "UNK", size: "?", material: "CU", matConf: 0.55, odClass: "CTS", od: "", sched: "", schedBasis: "", mat: "Copper stub", conf: 0.6, wpx: 22, pts: [[838,137],[925,137]], lbl: [850, 40], matCues: ["Copper colour at stub, partly in shadow"], matAlt: ["Brass nipple"], note: "Connection to the PEX not visible." },
      { id: "R4", sys: "UNK", size: "3/4\"", material: "COMP", matSub: "PEX", matConf: 0.8, odClass: "CTS", od: "0.875\"", sched: "SDR 9", schedConf: 0.5, schedBasis: "PEX tubing is SDR 9.", mat: "PEX (blue), drop", conf: 0.85, wpx: 27, pts: [[620,170],[622,290],[630,356],[644,500],[669,650],[694,750],[712,785]], lbl: [760, 520], matCues: ["Blue flexible tube bending without fittings"], matAlt: [], note: "Used as the scale reference (assumed 3/4\")." },
      { id: "R5", sys: "UNK", size: "?", material: "COMP", matSub: "PEX", matConf: 0.64, odClass: "CTS", od: "", sched: "SDR 9", schedConf: 0.4, schedBasis: "If PEX, SDR 9.", mat: "PEX (red)", conf: 0.72, wpx: 24, pts: [[244,550],[600,512]], lbl: [300, 620], matCues: ["Red flexible jacket: hot by convention", "No solder joints visible"], matAlt: ["Red-painted copper"], note: "" }
    ],
    items: [
      { id: "V1", layer: "valves", kind: "valve", type: "Lever valve (brass)", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Rounded brass body. The family follows from the lever; the body style is not asserted.", tag: "", size: "", sys: "", at: [156,137], lbl: [40, 230], conf: 0.84, desc: "Quarter-turn lever valve" },
      { id: "V2", layer: "valves", kind: "valve", type: "Lever valve (yellow handle)", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Yellow handles are often used on gas valves. Confirm the service.", tag: "", size: "", sys: "", at: [650,300], lbl: [760, 300], conf: 0.8, desc: "Quarter-turn lever valve" },
      { id: "V3", layer: "valves", kind: "valve", type: "Lever valve (brass)", operator: "Lever", stem: "Rotating (quarter-turn)", family: QT, bodyNote: "Body style not asserted.", tag: "", size: "", sys: "", at: [188,556], lbl: [0,0], conf: 0.7, desc: "Quarter-turn valve at the red line", noCallout: true },
      { id: "T1", layer: "fittings", type: "Tee (brass, crimp)", tag: "", size: "3/4\"?", sys: "", at: [612,148], lbl: [0,0], conf: 0.84, desc: "Brass PEX tee", noCallout: true }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Armoured cable (not piping)", sev: "Low", conf: 0.8, poly: [[62,275],[412,275],[412,375],[62,375]], lbl: [60, 430], text: "Flexible armoured electrical cable excluded from the trace, so it stays out of the takeoff." },
      { id: "X2", title: "Yellow-handle valve on a water line?", sev: "Low", conf: 0.6, poly: [[585,255],[705,255],[705,340],[585,340]], lbl: [760, 400], text: "Yellow levers often mean gas. Confirm the service and the valve's rating." }
    ],
    stamp: null,
    iso: null, isoHeld: "Not drafted as an iso. Lengths come from the assumed 3/4\" PEX scale."
  },
  /* ---------------------------------------------------------------- FT-10 */
  {
    id: "FT-10", file: "ft10-cpvc-sprinkler-penetration.jpg", w: 1600, h: 1077,
    title: "CPVC sprinkler pipe at a firestop sleeve", location: "Wood-frame floor · penetration",
    taken: "2026-11-11 15:40", by: "Field crew (sample)", status: "ready", conf: 0.88,
    scale: "No scale reference. The pipe print line carries the size, but it isn't legible here",
    ocrText: ["CPVC SPRINKLER PIPE", "BlazeMaster", "UL System 187", "Item 3A: 30 gauge sleeve"],
    summary: "Printed text on the pipe confirms CPVC sprinkler pipe. Text beats colour, so confidence is high. The handwritten firestop note is read and bound to the penetration.",
    credit: { title: "Cpvc sprinkler rohr kanadische holzkabache", author: "Achim Hering", license: "CC BY 3.0", url: "https://commons.wikimedia.org/wiki/File:Cpvc_sprinkler_rohr_kanadische_holzkabache.jpg" },
    runs: [
      { id: "R1", sys: "FP", size: "?", material: "COMP", matSub: "CPVC", matConf: 0.96, odClass: "IPS", od: "", sched: "SDR 13.5", schedConf: 0.6, schedBasis: "CPVC sprinkler pipe is SDR 13.5. Size and listing are on the print line (not legible here).", mat: "CPVC sprinkler pipe", conf: 0.9, wpx: 120, pts: [[1080,0],[1080,560]], lbl: [1210, 200], matCues: ["Print line read: \"CPVC SPRINKLER PIPE\"", "Orange, matte. On colour alone this would only be \"CPVC suggested\"", "Solvent-weld system: no threads or solder"], matAlt: [], note: "Printed text raised the material confidence. Without it, orange plastic is only a suggestion." }
    ],
    items: [
      { id: "P1", layer: "supports", type: "Penetration: sheet-metal sleeve", tag: "PEN-1", size: "", sys: "FP", at: [1080,560], lbl: [1240, 720], conf: 0.88, desc: "Sleeve being installed through the subfloor", box: [955,450,1205,660] },
      { id: "L1", layer: "labels", type: "Firestop note (read)", tag: "UL System 187 · Item 3A", size: "", sys: "", at: [560,560], lbl: [300, 880], conf: 0.8, desc: "Handwritten note read and bound to PEN-1" }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Firestop listing for CPVC", sev: "Medium", conf: 0.8, poly: [[930,430],[1230,430],[1230,680],[930,680]], lbl: [1260, 860], text: "Note cites UL System 187, Item 3A. Confirm that listed system covers CPVC at this size. Plastic pipe usually needs a different firestop system than metal." }
    ],
    stamp: null,
    iso: null, isoHeld: "Single vertical run, no scale. Not drafted."
  },
  /* ---------------------------------------------------------------- FT-11 */
  {
    id: "FT-11", file: "ft11-dp-transmitter.jpg", w: 960, h: 1280,
    title: "Pressure transmitter on stainless impulse tubing", location: "Instrument stand",
    taken: "2026-11-11 16:02", by: "Field crew (sample)", status: "ready", conf: 0.8,
    scale: "No scale reference in frame",
    ocrText: ["PT ?1032", "AP GP HP DR DP/GP"],
    summary: "Identified as a pressure transmitter (DP-cell style) from its housing and process flange. The tag is read except one character. Model and range are not legible, so they are not asserted.",
    credit: { title: "Differential pressure cell transmitter", author: "Bitjungle", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Differential_pressure_cell_transmitter.jpg" },
    runs: [
      { id: "R1", sys: "UNK", size: "?", material: "SS", matConf: 0.74, odClass: "Tube OD", od: "", sched: "", schedConf: 0, schedBasis: "Instrument tubing is ordered by OD and wall (e.g. 0.035\" or 0.049\"). Wall not visible.", mat: "Stainless instrument tubing", conf: 0.82, wpx: 34, pts: [[618,905],[660,925],[705,970],[750,1030],[810,1078],[880,1112],[959,1150]], lbl: [700, 1200], matCues: ["Bright unpainted tube, field-bent", "Compression fitting at the process flange", "Stainless is the usual choice for impulse lines"], matAlt: ["Aluminium or copper tubing"], note: "Only one impulse line is in frame." }
    ],
    items: [
      { id: "I1", layer: "valves", kind: "instrument", inst: "pressure", type: "Pressure transmitter (DP-cell style)", tag: "PT-?1032", bodyNote: "Housing and coplanar process flange identify the type. Model, range and DP vs. gauge configuration are not legible, so not asserted.", size: "", sys: "", at: [500,520], lbl: [560, 120], conf: 0.84, desc: "Transmitter with tag label", box: [273,336,750,672] },
      { id: "F1", layer: "fittings", type: "Process flange (sensor module)", tag: "", size: "", sys: "", at: [505,850], lbl: [0,0], conf: 0.8, desc: "Sensor module with process flange and vent/drain plugs", noCallout: true },
      { id: "S1", layer: "supports", type: "Strut channel (stand)", tag: "", size: "", sys: "", at: [62,640], lbl: [0,0], conf: 0.8, desc: "Vertical strut", line: [[62,0],[62,1280]], noCallout: true }
    ],
    dims: [],
    issues: [
      { id: "X1", title: "Second impulse line not in frame", sev: "Medium", conf: 0.66, poly: [[560,820],[680,820],[680,1010],[560,1010]], lbl: [620, 1000], text: "DP-style transmitters usually have high- and low-side connections. Only one tube is visible. Confirm the other side, or that it is configured for gauge pressure." },
      { id: "X2", title: "Tag partly legible", sev: "Low", conf: 0.8, poly: [[320,360],[380,360],[380,610],[320,610]], lbl: [40, 700], text: "One character of the tag label isn't readable. Confirm against the instrument index." }
    ],
    stamp: null,
    iso: null, isoHeld: "Instrument hook-up. Not drafted as an iso."
  });
  FT.photos.forEach((p) => { p.runs.forEach((r) => { r.material = r.material || "UNK"; if (r.matConf == null) r.matConf = 0.3; r.matCues = r.matCues || []; r.matAlt = r.matAlt || []; }); });
  FT.SCHED_NOTE = SCHED_NOTE; FT.QT = QT; FT.MT = MT;
})();
