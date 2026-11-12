// Dump the demo dataset + computed markups/CSVs as JSON for tools/build_exports.py.
const path = require("path");
global.window = {};
const js = (f) => require(path.join(__dirname, "..", "assets", "js", f));
js("data.js"); js("core.js");
const C = window.FTCore, FT = window.FT;
const ids = FT.photos.map((p) => p.id);
const out = { FT, markups: {}, lengths: {}, takeoffCSV: C.takeoffCSV(ids), markupCSV: C.markupCSV(ids) };
FT.photos.forEach((p) => { out.markups[p.id] = C.buildMarkups(p).map(({ src, ...m }) => m); out.lengths[p.id] = C.runLengths(p); });
process.stdout.write(JSON.stringify(out));
