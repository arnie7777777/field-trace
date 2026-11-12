# Field Trace: AI piping markup prototype for Schilke Construction

A **Mimetic Technology** prototype, built for one meeting with Schilke Construction.
Field Trace is **not** Bluebeam software and **not** Schilke software. It is a
concept for an AI first pass that sits in front of Bluebeam Revu 21.11. Rose keeps
reviewing in Revu, the same way she does now.

## Opening it

Double-click `index.html`. It runs from disk with no install, server, or internet connection
(fonts and photos are bundled). It's tested in Chrome at 1280×800 and 1920×1080. Edge and Firefox should also work.

| Folder | What's in it |
|---|---|
| `exports/FT-01.pdf` … `FT-06.pdf` | One 11×17 sheet per photo. The photo carries **editable PDF markups**, next to a vector as-built iso and a title block |
| `exports/Field-Trace-Sample-Set.pdf` | 8 pages: cover, the six sheets, and the takeoff |
| `exports/field-trace-takeoff.csv`, `field-trace-markup-summary.csv` | The same data the app shows (UTF-8 with BOM, so it opens cleanly in Excel) |
| `assets/photos/` | The six licensed photos (credits below) |
| `assets/js/data.js` | **All demo content.** Runs, fittings, dims, issues, iso geometry, OCR text |
| `assets/js/core.js` | Markup model, statuses, takeoff math, CSV writers |
| `assets/js/overlay.js` | SVG markup renderer for photos |
| `assets/js/iso.js` | Isometric as-built renderer |
| `assets/js/app.js` | Screens and routing (hash routes, no framework) |
| `sheet.html` + `assets/js/sheet.js` | The printable 11×17 sheet layout used for the PDFs |
| `tools/build_exports.py` | Rebuilds every PDF, CSV and preview from `data.js` |

To rebuild the exports after editing `data.js`, run `python3 tools/build_exports.py`. It needs node,
Google Chrome, python3 with `pikepdf`, and poppler's `pdftoppm`.

## Before the meeting (10 minutes, on Evan's machine)

1. Open `exports/FT-01.pdf` in **Bluebeam Revu 21.11**:
   - Open the Markups List. You should see Polyline, Pipe Tag, Callout, Dimension, Cloud+ and Stamp rows, all with author "Field Trace AI".
   - Open the Layers panel. Seven layers should appear (Pipe Runs, Fittings, Valves & Devices, Hangers & Supports, Dimensions, Issues, Labels).
   - Move a callout, change a status, then save and reopen.
2. Open the same file in **Adobe Acrobat** and check that the comments list and layers show up.
3. If anything behaves differently in Revu 21.11 than described here, fix it or drop that line from the talk track.
   The PDFs use standard PDF annotation types. Their behavior was verified with PDF tooling only. **They have not been opened in Revu or Acrobat yet.**

## 3–5 minute talk track

1. **Overview (≈40 s).** "Rose gets batches of field photos and marks them up by hand in Revu. Field Trace does the first pass: it traces the pipe,
   tags it, dimensions it, and clouds what looks wrong. Rose then reviews instead of drawing." Point at the "Where it fits Rose's day" strip
   and the **OCR vs Field Trace** box: *Bluebeam OCR 21 reads text. Field Trace traces pipe and drafts the drawing. They work together.*
2. **Inbox (≈30 s).** Six photos in today's batch. FT-06 is flagged **Needs attention** (low light, low confidence). The point is that the tool
   says when it isn't sure, rather than guessing quietly.
3. **Workspace on FT-01 (≈90 s).** Drag the before/after splitter. Toggle layers. Click a run to show its properties (system, size, material,
   confidence). Press **A** to accept and **R** to reject. Point at the Markups List, with the same columns Rose sees in Revu. Use "Needs verification"
   to show the dashed lines below 70% confidence. Then jump to FT-06 with **J/K** and show the low-confidence draft.
4. **As-Built (≈40 s).** The photo and the isometric side by side. Hovering a run highlights it in both. "This is the drawing she'd otherwise sketch."
5. **Takeoff (≈20 s).** Linear feet by system and size, plus fitting counts. Download the CSV.
6. **Export (≈40 s).** Open `FT-01.pdf` **in Revu 21.11** and show that the markups are real, movable Revu markups on layers. "Rose finishes in the tool she already uses."
7. **Close.** "Send us 10–20 of your real photos along with your marked-up versions. We'll tune it to your tool chest, layer names and standards, then time it against your current process."

## What's real and what's illustrative

**Real:**
- The photos (licensed, credited below).
- The editable PDF annotations with layers.
- The vector iso drawings, the CSVs, and the takeoff math (computed from the iso geometry).
- The review workflow in the browser.

**Illustrative / hand-authored:**
- **No AI model runs in this demo.** Every trace, tag, dimension, confidence score and "OCR text" was authored by hand to show the intended output. Each overlay was placed on the actual pipe geometry in the photo.
- System assignments (CTS/CWS/HWS…) are plausible readings of public photos, not facts. Some are marked "suggested".
- Dimensions are estimates from CMU coursing or nominal pipe OD and are labeled that way.
- The project name, room numbers, dates and reviewer are sample data. **None of these are Schilke job photos.**
- The time-savings calculator on the Overview screen is **illustrative**. Its inputs are editable defaults, not measurements.
- Nothing here claims a Bluebeam API or integration. The hand-off is a standard PDF that Revu opens. Any deeper integration would need research into what Bluebeam actually supports (for example Studio or tool sets) before it is promised.

## Known weaknesses (say them before they're found)

- **FT-01:** the CTS/CWS bends at the bottom are partly hidden and are marked at 70–71%.
- **FT-02:** some thin verticals could be pipe or threaded rod. They are flagged as unsure.
- **FT-03:** runs are in strong perspective, so the dimensions carry low confidence.
- **FT-04:** the source of the DHW branch is assumed.
- **FT-05:** riser connections are not verified.
- **FT-06:** deliberately weak (low light).
- The PDF annotation count is higher than the app's markup count. In the PDF, each pipe tag, item and cloud label is its own callout annotation.
- The Overview page scrolls slightly at 800 px tall.

## Photo credits (all Wikimedia Commons)

| Sheet | Photo | Author | License |
|---|---|---|---|
| FT-01 | [Shell and Tube Heat Exchanger Piping 1](https://commons.wikimedia.org/wiki/File:Shell_and_Tube_Heat_Exchanger_Piping_1.jpg) | Ivangiesen | CC0 1.0 |
| FT-02 | [Ventilation piping installed in the back of house area… (CM014B, 03-19-2019)](https://commons.wikimedia.org/wiki/File:Ventilation_piping_installed_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-19-2019)_(33565522008).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-03 | [Insulating piping in the back of house area… (CM014B, 03-27-2019)](https://commons.wikimedia.org/wiki/File:Insulating_piping_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-27-2019)_(46577660185).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-04 | [Installing copper piping that will connect to a heating and cooling unit… (CM014B, 1-24-2019)](https://commons.wikimedia.org/wiki/File:Installing_copper_piping_that_will_connect_to_a_heating_and_cooling_unit_in_the_LIRR_passenger_concourse._(CM014B,_1-24-2019)_(31965163677).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-05 | [Mechanical room](https://commons.wikimedia.org/wiki/File:Mechanical_room.jpg) | P199 at English Wikipedia | CC BY 2.5 |
| FT-06 | [Installing hangers for piping along the east service corridor… (CM014B, 08-30-2018)](https://commons.wikimedia.org/wiki/File:Installing_hangers_for_piping_along_the_east_service_corridor_of_the_future_LIRR_concourse._(CM014B,_08-30-2018)_(44340219192).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |

The photos were cropped and resized. The markups are additions by Mimetic Technology. Fonts are Barlow and IBM Plex Mono (SIL Open Font License).

## Next steps once Rose's samples arrive

1. Collect 10–20 real photos with Rose's finished Revu markups. Export her tool chest / tool set and layer names.
2. Match her symbols, colors, layer names and stamp exactly, and confirm the PDFs round-trip in her Revu 21.11.
3. Run a real model pass on her photos: segmentation and tracing for pipe, detection for valves and fittings, and OCR for stencils. Measure accuracy against her markups.
4. Do a timing study of her process today against review-only with Field Trace, which replaces the illustrative calculator.
5. Decide on delivery: a drop folder or email intake into reviewable PDFs, and whether Bluebeam Studio or other integration points are worth investigating.
