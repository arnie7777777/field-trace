# Deploying Field Trace

Field Trace is now a **Python web service** (FastAPI + uvicorn). The login, the upload analysis and the access
control all run on the server. **It cannot run as a Render Static Site.** A static site would serve every file in
`web/` to anyone, with no login.

## Local

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
DEMO_USER=yourname DEMO_PASSWORD='choose-a-password' COOKIE_SECURE=0 python3 server.py   # http://127.0.0.1:8000
```

`python3 server.py` binds to 127.0.0.1:8000 (or `$PORT`; `HOST` overrides). On Render (`RENDER` is set) it binds 0.0.0.0.

## Environment variables

| Name | Required | Notes |
|---|---|---|
| `DEMO_USER` | yes | Sign-in name. |
| `DEMO_PASSWORD` | yes | Sign-in password. Set it in the Render dashboard only, never in git. Hashed with scrypt at start-up; compared in constant time. |
| `SESSION_SECRET` | recommended | Long random string. Signs the session cookie so sessions survive restarts. `render.yaml` generates one. |
| `SESSION_HOURS` | no | Default 12. |
| `COOKIE_SECURE` | no | Default on (Secure cookie). Set `0` only for plain-http localhost. |
| `OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` | no | Any one turns on vision-model analysis for uploads. Costs per request on that provider's account. |
| `VISION_PROVIDER`, `VISION_MODEL` | no | Choose a provider / model explicitly. |

Without `DEMO_USER` and `DEMO_PASSWORD` the app returns 503 on every page (fails closed). `/healthz` stays up.

## Render (free plan), as a Web Service

**Order matters.** The current static site deploys `arnie7777777/field-trace` automatically. If this code is pushed
while that static site is still connected, the static site will publish `web/` (photos, PDFs, the app) publicly with
**no login**. So:

1. In Render, **suspend or delete the existing Static Site** for this repo first (or turn off its auto-deploy).
2. **New → Web Service** → connect `arnie7777777/field-trace`, branch `main`.
   - Runtime: **Python 3**
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'`
     (or `python server.py`)
   - Health check path: `/healthz`
   - Instance type: Free
   - Environment: `DEMO_USER`, `DEMO_PASSWORD`, `SESSION_SECRET` (and `PYTHON_VERSION=3.13.5`)
   - Or use **New → Blueprint** with the included `render.yaml`, which sets the same things and asks for the two secrets.
3. Push the code, wait for "Live", then check: `/healthz` returns `ok`; `/` redirects to `/login`;
   `/assets/js/app.js`, `/exports/FT-01.pdf` and `/api/session` return 401 when signed out.
4. If you want the old URL, point the custom domain (if any) at the new web service. Note that the `*.onrender.com`
   name of a new service is different from the static site's.

**Free-plan behaviour:** the service sleeps after about 15 minutes without traffic. The first request after that
takes up to a minute while it wakes. **Open the site a few minutes before a demo.** Free instances have 512 MB RAM
and a fraction of a CPU, so the local analysis takes a few seconds per photo. Without `SESSION_SECRET`, a wake-up
also signs everyone out.

## Things to know

- **The GitHub repo is public.** The code, the sample photos and the built PDFs in `web/` can be downloaded from
  GitHub even though the website is behind a login. Make the repo private if that matters.
- **Git history:** the first commit's message names the prospect. Removing it means rewriting history and
  force-pushing. That's a deliberate, destructive step and should only be done on purpose.
- Rate limiting: 6 failed sign-ins per IP per 10 minutes locks that IP for 15 minutes. 30 failures overall in
  10 minutes pauses sign-in for everyone for 15 minutes (a backstop, because client IPs behind a proxy can be forged).
  It's in memory, so a restart clears it.
- `robots.txt` disallows everything and every response carries `X-Robots-Tag: noindex`.
