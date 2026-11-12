// Dump the demo dataset + computed markups/CSVs as JSON for tools/build_exports.py.
const path = require("path");
global.window = {};
const js = (f) => require(path.join(__dirname, "..", "web", "assets", "js", f));
js("data.js"); js("data-more.js"); js("core.js");
const C = window.FTCore, FT = window.FT;
const ids = FT.photos.map((p) => p.id);
const out = { FT, markups: {}, lengths: {}, runInfo: {}, takeoffCSV: C.takeoffCSV(ids), markupCSV: C.markupCSV(ids) };
FT.photos.forEach((p) => { out.markups[p.id] = C.buildMarkups(p).map(({ src, ...m }) => m); out.lengths[p.id] = C.runLengths(p);
  out.runInfo[p.id] = {}; p.runs.forEach((r) => { out.runInfo[p.id][r.id] = { tag: C.tagText(r), lowMat: C.isLowMat(r), contents: `${C.tagText(r)} - ${C.sysName(r.sys)} - material (suggested, ${C.pct(r.matConf)}): ${C.matName(r)}${r.matCues.length ? " [" + r.matCues.join("; ") + "]" : ""} - OD: ${C.odText(r)} - schedule: ${C.schedText(r)}. Wall is not visible from the photo; rating and corrosion allowance need verification. ${r.note || ""}` }; }); });
process.stdout.write(JSON.stringify(out));
