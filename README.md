# Field Trace — AI markup assist for Bluebeam Revu

A **Mimetic Technology** prototype (110/20 Software · mimetictech.ai). Field piping photos come in, Field Trace
does the first pass: it traces each run, tags system, size and a **suggested material**, marks valves and
instruments, clouds what looks wrong, and rolls the result into an as-built and a takeoff. The reviewer
finishes in **Bluebeam Revu 21.11**. Field Trace is not a Bluebeam product and claims no Bluebeam API or plug-in.
The hand-off is a standard PDF with editable annotations on layers.

The whole site sits **behind a login**. Nothing is public except `/login`, `/healthz` and `robots.txt`.

## Run it locally

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
DEMO_USER=yourname DEMO_PASSWORD='choose-a-password' COOKIE_SECURE=0 python3 server.py
# open http://127.0.0.1:8000  → sign in → lands on the Demo page
```

The login comes **only** from the `DEMO_USER` and `DEMO_PASSWORD` environment variables. No credentials are
stored in this repository. Without both, every page returns 503 (fails closed). `COOKIE_SECURE=0` is for plain-http
localhost only; leave it unset in production. Deployment: see [DEPLOY.md](DEPLOY.md).

| Env var | Purpose |
|---|---|
| `DEMO_USER`, `DEMO_PASSWORD` | Required. The single demo login. The password is hashed with scrypt at start-up and removed from the process environment. |
| `SESSION_SECRET` | Recommended. Keeps people signed in across restarts. If unset, a random key is used and everyone signs in again after a restart. |
| `SESSION_HOURS` | Session length, default 12. |
| `OPENAI_API_KEY` / `XAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` | Optional. If one is set, uploads are analysed by that vision model; otherwise the local OpenCV pass runs. `VISION_PROVIDER` / `VISION_MODEL` pick one explicitly. |

## Presenting (Demo page, `#/demo`)

Sign in and you land on the guided demo. **→ / N** next, **← / P** back, **F** or **▶ Present** for full screen,
**Esc** to leave full screen or close a dialog. The step rail on the left jumps to any step. It's laid out for
1280×800 and 1920×1080.

1. **Open.** What it is, on FT-07 coloured by material.
2. **The job today.** Rose's steps by hand vs. with a first pass. No time-savings number is claimed.
3. **OCR vs. Field Trace.** OCR reads the text; Field Trace reads the pipe.
4. **Materials.** The direct answer to "carbon steel? stainless? composite? copper? galvanized?", shown on photos.
5. **OD, instruments, valves.** What a photo can and can't show.
6. **Prepared examples.** 11 photos. Clicking one opens the workspace; a "Back to demo" pill returns you.
7. **Live upload.** Drop a photo, or send FT-07 / FT-08 / FT-10 through the live analysis.
8. **Review.** Accept / reject / override material and size, set a scale.
9. **As-built + takeoff.** LF by material, size and system.
10. **Export to Revu 21.11.** Editable PDF markups on layers, plus CSVs.
11. **Next step.** Real before/afters, your tool chest and layer names, your material rules, a timing study.

The rest of the app (Overview, Inbox, Workspace, As-Built, Takeoff, Export) is in the top bar. The Inbox has a
**New photo** card for uploads.

## Materials, size and wall: how they're shown

- **Every run carries a suggested material**: carbon steel (CS), stainless (SS), copper (CU, Type K/L/M),
  galvanized (GALV), or composite & plastic (PEX, CPVC, PVC, GRE/GRP fibreglass, plastic-lined steel). There is no
  made-up "composite steel".
- The material appears in the **pipe tag** (`HWS 2" GALV?`), the **properties panel** (confidence, cues, alternatives,
  reviewer override), the **PDF annotation comments**, and the **takeoff** (LF grouped by material → system → size).
- **How it tells:** visible cues (colour, sheen, patina, joint type: welded / grooved / threaded / soldered / press /
  crimp / solvent-weld) and **printed text** (stencils, print lines). Text beats colour: FT-10's "CPVC SPRINKLER PIPE"
  print line gives 96%, while orange plastic alone would only be a suggestion.
- **Lower confidence when unsure:** painted pipe hides the base metal, insulation and jackets hide everything
  (marked *concealed*), low light flattens colour. Under 70% the tag gets a "?" and the line is dashed.
- **OD** can be estimated from a photo when there is a scale reference, following the material's convention
  (steel NPS, copper/PEX CTS, PVC/CPVC IPS). **Wall thickness / schedule is not visible** in a photo. Any schedule is
  a suggestion from stencils, flange class, insulation, service and convention, always flagged
  *"suggested schedule — verify; wall is not visible from the photo"*. Pressure/temperature rating and remaining
  corrosion allowance depend on the wall, so they are marked to verify.
- **Valves:** the operator is visible (handwheel, lever, gear, pneumatic or electric actuator). The body usually is
  not. A rotating stem points to the quarter-turn family (ball or butterfly); a rising stem to the multi-turn family
  (gate, globe or plug). Field Trace names the family when the cue supports it and never picks ball vs. butterfly or
  globe vs. plug.
- **Instruments:** classified by visible type (pressure, temperature, flow, level, analytical) with the tag if it's
  legible. Model and range are never assumed. The sample photos include thermometers in wells (FT-01), dial pressure
  gauges (FT-05, FT-08) and a pressure transmitter (FT-11). Flow and analytical are in the vocabulary but not in these photos.

## Live upload analysis

`POST /api/analyze` (sign-in required): JPEG / PNG / WebP / HEIC, up to 15 MB, two at a time, 75 s server time limit.
It returns the workspace data shape in 0–1000 normalised coordinates, plus a preview, the engine used and advisories.
Nothing is stored on the server; uploads live in the browser tab.

- **With a vision-model key:** the model is asked for runs, material + cues + confidence, OD class, size only with a
  stated basis, schedule only as a suggestion with a basis, valves by operator / stem / family (no body style),
  instruments by type (tag only if legible), and text it can read. Sizes without a basis are dropped.
- **Without a key (default):** a local OpenCV pass finds straight, pipe-like edge pairs and colour regions, links
  elbows/tees, and suggests material from colour / sheen / texture with **confidence capped at 70%**. It does not read
  text, does not trace curved pipe well, and leaves size as "?" until the reviewer confirms one pipe size and uses it as the scale.
- Every result is labelled **"AI first pass — verify material and size."**

## What's real and what's illustrative

**Real:** the login and server; the live upload analysis (local CV, or a vision model when configured); the licensed
photos; the editable PDF annotations on layers; the vector iso drawings; the CSVs and takeoff math; the review workflow.

**Illustrative:** the markups on the **11 prepared photos were authored by hand** to show the intended output. No
model produced them, and the demo says so. Confidence values, system assignments, project names, dates and the
reviewer are sample data. Dimensions and lengths are estimates and labelled as such. **No accuracy figures are claimed.**
The photos are public, licensed images, not the prospect's job photos.

## Before a meeting

Open `web/exports/FT-07.pdf` (and FT-01) in **Bluebeam Revu 21.11**. Check the Markups list (subject, author
"Field Trace AI", comments), the seven layers, and that a callout can be moved and saved. The PDFs use standard
annotation types and were checked with PDF tooling. **They have not been opened in Revu here.**

## Layout

| Path | What |
|---|---|
| `server.py` | FastAPI app: login gate, sessions, security headers, `/api/analyze`, static files from `web/` |
| `login/` | Sign-in page and its assets (the only public page) |
| `fieldtrace/` | Analysis: `pipeline.py` (load / route / normalise), `cv.py` (local OpenCV pass), `materials.py` (material rules, OD tables), `vision.py` (optional vision model) |
| `web/index.html`, `web/assets/js/` | The app: `data.js` + `data-more.js` (prepared content), `core.js` (model, takeoff, CSV), `overlay.js`, `iso.js`, `demo.js` (Demo page + upload), `app.js` (screens) |
| `web/sheet.html`, `web/assets/js/sheet.js` | Printable 11×17 sheet layout |
| `web/exports/`, `web/assets/previews/` | Built PDFs, CSVs and previews |
| `tools/build_exports.py` | Rebuilds the exports: `python3 tools/build_exports.py` (needs node, Google Chrome, python3 + pikepdf, poppler `pdftoppm`) |

## Photo credits (Wikimedia Commons)

| Sheet | Photo | Author | License |
|---|---|---|---|
| FT-01 | [Shell and Tube Heat Exchanger Piping 1](https://commons.wikimedia.org/wiki/File:Shell_and_Tube_Heat_Exchanger_Piping_1.jpg) | Ivangiesen | CC0 1.0 |
| FT-02 | [Ventilation piping installed in the back of house area… (CM014B, 03-19-2019)](https://commons.wikimedia.org/wiki/File:Ventilation_piping_installed_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-19-2019)_(33565522008).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-03 | [Insulating piping in the back of house area… (CM014B, 03-27-2019)](https://commons.wikimedia.org/wiki/File:Insulating_piping_in_the_back_of_house_area_of_the_future_LIRR_passenger_concourse._(CM014B,_03-27-2019)_(46577660185).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-04 | [Installing copper piping that will connect to a heating and cooling unit… (CM014B, 1-24-2019)](https://commons.wikimedia.org/wiki/File:Installing_copper_piping_that_will_connect_to_a_heating_and_cooling_unit_in_the_LIRR_passenger_concourse._(CM014B,_1-24-2019)_(31965163677).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-05 | [Mechanical room](https://commons.wikimedia.org/wiki/File:Mechanical_room.jpg) | P199 at English Wikipedia | CC BY 2.5 |
| FT-06 | [Installing hangers for piping along the east service corridor… (CM014B, 08-30-2018)](https://commons.wikimedia.org/wiki/File:Installing_hangers_for_piping_along_the_east_service_corridor_of_the_future_LIRR_concourse._(CM014B,_08-30-2018)_(44340219192).jpg) | MTA Capital Construction Mega Projects | CC BY 2.0 |
| FT-07 | [Travail du cuivre, de l'acier galvanisé et de l'acier noir](https://commons.wikimedia.org/wiki/File:Travail_du_cuivre,_de_l%27acier_galvanis%C3%A9_et_de_l%27acie_noir.JPG) | Le plombier du désert | CC BY-SA 4.0 |
| FT-08 | [Potrubí](https://commons.wikimedia.org/wiki/File:Potrub%C3%AD.jpg) | Janchromý | CC BY-SA 4.0 |
| FT-09 | [PEX piping in basement ceiling](https://commons.wikimedia.org/wiki/File:PEX_piping_in_basement_ceiling.jpg) | Tomwsulcer | CC0 1.0 |
| FT-10 | [Cpvc sprinkler rohr kanadische holzkabache](https://commons.wikimedia.org/wiki/File:Cpvc_sprinkler_rohr_kanadische_holzkabache.jpg) | Achim Hering | CC BY 3.0 |
| FT-11 | [Differential pressure cell transmitter](https://commons.wikimedia.org/wiki/File:Differential_pressure_cell_transmitter.jpg) | Bitjungle | CC BY-SA 4.0 |

Photos were resized (FT-07 also cropped by 22 px per side). The markups are additions by Mimetic Technology; where the
source is CC BY-SA, the annotated images are shared under the same license. Fonts: Barlow and IBM Plex Mono (SIL Open Font License).
