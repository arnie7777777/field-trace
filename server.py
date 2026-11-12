#!/usr/bin/env python3
"""Field Trace — authenticated demo server (Mimetic Technology prototype).

Every page, asset, PDF and API sits behind a server-side session. Only /healthz,
/robots.txt, /login and the login screen's own assets (/_login/*) are public.

Configuration (environment only — nothing secret lives in the repo):
  DEMO_USER, DEMO_PASSWORD   required; the password is hashed with scrypt at start-up and
                             removed from os.environ. Without both, the app fails closed (503).
  SESSION_SECRET             recommended; signs session cookies. If unset, a random key is
                             generated per process (everyone is signed out on restart/deploy).
  SESSION_HOURS              session lifetime, default 12
  COOKIE_SECURE              default 1. Browsers accept Secure cookies on http://localhost;
                             set 0 only for plain-http testing on another hostname.
  OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / GROQ_API_KEY
                             optional; if one is present, uploads are analysed by that vision
                             model, falling back to the local OpenCV first pass on any error.
  VISION_PROVIDER, VISION_MODEL   optional overrides for the above.
  PORT                       default 8000

Run locally:  DEMO_USER=evan DEMO_PASSWORD='choose-one' python3 server.py
"""
import asyncio, base64, hashlib, hmac, html, io, json, logging, os, secrets, time
from collections import defaultdict, deque
from urllib.parse import quote, urlparse

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from starlette.concurrency import run_in_threadpool
from starlette.staticfiles import StaticFiles

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
LOGIN_DIR = os.path.join(ROOT, "login")
LOGIN_ASSETS = os.path.join(LOGIN_DIR, "assets")
log = logging.getLogger("fieldtrace")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# ------------------------------------------------------------------ credentials
COOKIE = "ft_session"
SESSION_TTL = int(float(os.environ.get("SESSION_HOURS", "12")) * 3600)
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "1") != "0"
MAX_UPLOAD = 15 * 1024 * 1024
SCRYPT = dict(n=2 ** 14, r=8, p=1, dklen=32, maxmem=64 * 1024 * 1024)

_user = os.environ.get("DEMO_USER", "")
_pw = os.environ.pop("DEMO_PASSWORD", "")  # hash it, then drop the plaintext from the environment
CONFIGURED = bool(_user and _pw)
_salt = os.urandom(16)
_pw_hash = hashlib.scrypt(_pw.encode(), salt=_salt, **SCRYPT) if CONFIGURED else b""
_user_digest = hashlib.sha256(_user.encode()).digest()
if CONFIGURED and len(_pw) < 12:
    log.warning("DEMO_PASSWORD is shorter than 12 characters; use a longer one for a public URL.")
del _pw
_secret = os.environ.get("SESSION_SECRET", "").encode()
if not _secret:
    _secret = secrets.token_bytes(32)
    log.warning("SESSION_SECRET not set: using a random per-process key (sessions end on restart).")
SIGN_KEY = hashlib.sha256(b"field-trace-session\0" + _secret + _pw_hash).digest()
if not CONFIGURED:
    log.error("DEMO_USER / DEMO_PASSWORD not set: the app will refuse to serve (fail closed).")


def check_credentials(user: str, password: str) -> bool:
    if not CONFIGURED:
        return False
    u_ok = hmac.compare_digest(hashlib.sha256(user.encode()).digest(), _user_digest)
    p_ok = hmac.compare_digest(hashlib.scrypt(password.encode(), salt=_salt, **SCRYPT), _pw_hash)
    return u_ok and p_ok


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_session(user: str) -> str:
    now = int(time.time())
    body = _b64(json.dumps({"u": user, "iat": now, "exp": now + SESSION_TTL, "n": secrets.token_hex(8)}, separators=(",", ":")).encode())
    sig = _b64(hmac.new(SIGN_KEY, body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"


def read_session(token: str):
    try:
        body, sig = token.split(".", 1)
        good = _b64(hmac.new(SIGN_KEY, body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(_unb64(body))
        if int(data.get("exp", 0)) < time.time():
            return None
        return data
    except Exception:
        return None


# ------------------------------------------------------------------ failed-login rate limiting
FAIL_WINDOW, FAIL_MAX, LOCK_SECS = 600, 6, 900
_fails = defaultdict(deque)
_locked = {}


def client_ip(req: Request) -> str:
    fwd = req.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return req.client.host if req.client else "?"


# X-Forwarded-For can be spoofed by the client, so per-IP limits alone could be bypassed by rotating it.
# A global cap on failed sign-ins (all clients together) bounds password guessing regardless of IP.
GLOBAL_MAX, GLOBAL_KEY = 30, "*global*"


def lock_remaining(ip: str) -> int:
    until = max(_locked.get(ip, 0), _locked.get(GLOBAL_KEY, 0))
    return max(0, int(until - time.time()))


def note_failure(ip: str):
    now = time.time()
    if len(_fails) > 5000:  # bound memory if someone sprays forged addresses
        _fails.clear()
    g = _fails[GLOBAL_KEY]; g.append(now)
    while g and g[0] < now - FAIL_WINDOW:
        g.popleft()
    if len(g) >= GLOBAL_MAX:
        _locked[GLOBAL_KEY] = now + LOCK_SECS; g.clear()
        log.warning("sign-in paused for everyone after %d failures in %d s", GLOBAL_MAX, FAIL_WINDOW)
    q = _fails[ip]; q.append(now)
    while q and q[0] < now - FAIL_WINDOW:
        q.popleft()
    if len(q) >= FAIL_MAX:
        _locked[ip] = now + LOCK_SECS; q.clear()
        log.warning("login locked for %s after repeated failures", ip)


def same_origin(req: Request) -> bool:
    origin = req.headers.get("origin") or req.headers.get("referer")
    if not origin:
        return True  # non-browser clients; the SameSite=Lax cookie is the main CSRF guard
    host = req.headers.get("x-forwarded-host") or req.headers.get("host", "")
    return urlparse(origin).netloc == host


def safe_next(nxt: str) -> str:
    if not nxt or not nxt.startswith("/") or nxt.startswith("//") or "\\" in nxt or nxt.startswith("/login"):
        return "/#/inbox"
    return "/#/inbox" if nxt == "/" else nxt


# ------------------------------------------------------------------ app
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
PUBLIC_EXACT = {"/healthz", "/robots.txt", "/login", "/favicon.svg"}
PUBLIC_PREFIX = ("/_login/",)


@app.middleware("http")
async def gate(request: Request, call_next):
    path = request.url.path
    public = path in PUBLIC_EXACT or path.startswith(PUBLIC_PREFIX)
    if not public:
        if not CONFIGURED:
            resp = PlainTextResponse("Field Trace is not configured: set DEMO_USER and DEMO_PASSWORD.", status_code=503)
        elif not read_session(request.cookies.get(COOKIE, "")):
            wants_html = request.method == "GET" and not path.startswith("/api/") and ("text/html" in request.headers.get("accept", "") or path == "/")
            if wants_html:
                resp = RedirectResponse("/login" + (f"?next={quote(path)}" if path not in ("/", "/index.html") else ""), status_code=303)
            else:
                resp = JSONResponse({"error": "authentication required"}, status_code=401)
        else:
            resp = await call_next(request)
    else:
        resp = await call_next(request)
    h = resp.headers
    h["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    h["X-Content-Type-Options"] = "nosniff"
    h["Referrer-Policy"] = "same-origin"
    h["X-Frame-Options"] = "DENY"
    ctype = h.get("content-type", "")
    if path.startswith("/api/") or "text/html" in ctype or path in ("/login", "/") or resp.status_code in (301, 302, 303, 401, 503):
        h["Cache-Control"] = "no-store"
    elif "Cache-Control" not in h:
        h["Cache-Control"] = "private, max-age=300"
    if "text/html" in ctype:
        h["Content-Security-Policy"] = ("default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; "
                                        "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
        h["Strict-Transport-Security"] = "max-age=31536000"
    return resp


@app.get("/healthz")
async def healthz():
    return PlainTextResponse("ok")


@app.get("/robots.txt")
async def robots():
    return PlainTextResponse("User-agent: *\nDisallow: /\n")


@app.get("/favicon.svg")
async def favicon():
    return FileResponse(os.path.join(LOGIN_ASSETS, "favicon.svg"), media_type="image/svg+xml")


def login_page(error: str = "", nxt: str = "", status: int = 200) -> HTMLResponse:
    with open(os.path.join(LOGIN_DIR, "login.html"), encoding="utf-8") as fh:
        page = fh.read()
    err = f'<div class="err" role="alert">{html.escape(error)}</div>' if error else ""
    page = page.replace("{{ERROR}}", err).replace("{{NEXT}}", html.escape(nxt or "", quote=True))
    return HTMLResponse(page, status_code=status)


@app.get("/login")
async def login_get(request: Request, next: str = ""):
    if CONFIGURED and read_session(request.cookies.get(COOKIE, "")):
        return RedirectResponse(safe_next(next), status_code=303)
    return login_page("" if CONFIGURED else "Server not configured. Set DEMO_USER and DEMO_PASSWORD.", next)


@app.post("/login")
async def login_post(request: Request):
    ip = client_ip(request)
    wait = lock_remaining(ip)
    if wait:
        return login_page(f"Too many attempts. Try again in {max(1, wait // 60)} min.", "", 429)
    if not same_origin(request):
        return login_page("Sign-in request rejected.", "", 400)
    form = await request.form()
    user = str(form.get("username", ""))[:200]
    pw = str(form.get("password", ""))[:500]
    nxt = str(form.get("next", ""))[:500]
    ok = await run_in_threadpool(check_credentials, user, pw)
    del pw
    if not ok:
        note_failure(ip)
        await asyncio.sleep(0.6)
        return login_page("That username and password didn't match.", nxt, 401)
    _fails.pop(ip, None)
    resp = RedirectResponse(safe_next(nxt), status_code=303)
    resp.set_cookie(COOKIE, make_session(user), max_age=SESSION_TTL, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/")
    log.info("login ok from %s", ip)
    return resp


@app.api_route("/logout", methods=["GET", "POST"])
async def logout(request: Request):
    resp = RedirectResponse("/login", status_code=303)
    resp.delete_cookie(COOKIE, path="/", secure=COOKIE_SECURE, httponly=True, samesite="lax")
    return resp


@app.get("/api/session")
async def session_info(request: Request):
    from fieldtrace import vision
    s = read_session(request.cookies.get(COOKIE, "")) or {}
    prov = vision.provider()
    return {"user": s.get("u"), "expires": s.get("exp"), "engine": {"kind": "vision" if prov else "local-cv", "provider": prov[0] if prov else None, "model": prov[2] if prov else None}}


_analyze_slots = asyncio.Semaphore(2)


@app.post("/api/analyze")
async def analyze(request: Request, file: UploadFile = File(...)):
    if not same_origin(request):
        return JSONResponse({"error": "cross-origin request rejected"}, status_code=403)
    data = bytearray()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > MAX_UPLOAD:
            return JSONResponse({"error": "That photo is over 15 MB. Export a smaller JPEG and try again."}, status_code=413)
    if not data:
        return JSONResponse({"error": "Empty file."}, status_code=400)
    from fieldtrace import pipeline
    try:
        img = await run_in_threadpool(pipeline.load_image, bytes(data))
    except pipeline.BadImage as e:
        return JSONResponse({"error": str(e)}, status_code=415)
    async with _analyze_slots:
        try:
            result = await asyncio.wait_for(pipeline.analyze(img, filename=file.filename or "upload"), timeout=75)
        except asyncio.TimeoutError:
            return JSONResponse({"error": "Analysis took too long. Try a smaller photo or try again."}, status_code=504)
        except Exception:
            log.exception("analysis failed")
            return JSONResponse({"error": "Analysis failed on this photo. Try another angle or a JPEG export."}, status_code=500)
    return JSONResponse(result)


# Login screen assets (public: one stylesheet, the brand mark, OFL fonts) and the gated app.
app.mount("/_login", StaticFiles(directory=LOGIN_ASSETS), name="login-assets")
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1" if not os.environ.get("RENDER") else "0.0.0.0"),
                port=int(os.environ.get("PORT", "8000")), proxy_headers=True, forwarded_allow_ips="*", log_level="info")
