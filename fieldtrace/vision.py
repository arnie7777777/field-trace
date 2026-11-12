"""Optional vision-model pass. Used only when an API key is present in the environment.

Providers (first key found wins, or VISION_PROVIDER forces one): OPENAI_API_KEY, XAI_API_KEY,
ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY. VISION_MODEL overrides the default model id
(defaults below may need updating as providers rename models). Any error → caller falls back to
the local OpenCV pass. No key is ever logged or returned to the browser.
"""
import base64, json, os, re, urllib.request

DEFAULTS = {
    "openai": ("OPENAI_API_KEY", "gpt-4o"),
    "xai": ("XAI_API_KEY", "grok-4"),
    "anthropic": ("ANTHROPIC_API_KEY", "claude-sonnet-4-5"),
    "gemini": ("GEMINI_API_KEY", "gemini-2.5-flash"),
    "groq": ("GROQ_API_KEY", "meta-llama/llama-4-scout-17b-16e-instruct"),
}

PROMPT = """You are the first-pass markup assistant for a piping reviewer who works in Bluebeam Revu.
Look at this field photo of building/industrial piping and return ONLY a JSON object (no prose) with:
{
 "runs": [ {"pts": [[x,y],...], "material": "CS|SS|CU|GALV|COMP|UNK", "material_subtype": "e.g. black steel, Type L copper, PEX, CPVC, GRE",
            "material_confidence": 0-1, "material_cues": ["visual cues you actually see"], "concealed": true|false,
            "system": "stencil/marker text if read, else empty", "od_class": "NPS steel|CTS copper/PEX|IPS plastic|unknown",
            "nominal_size": "only if a stencil/print/known reference supports it, else ?", "size_basis": "what supports the size, or none",
            "schedule_suggested": "e.g. Sch 40 / Type L / SDR 11, or empty", "schedule_basis": "stencil, flange class, service, convention — or empty",
            "confidence": 0-1, "note": "short"} ],
 "valves": [ {"at": [x,y], "operator": "handwheel|lever|gear|pneumatic|electric|unknown", "stem_motion": "rotating|rising|unknown",
              "family": "quarter-turn (ball or butterfly)|multi-turn rising stem (gate, globe or plug)|unknown", "confidence": 0-1, "note": ""} ],
 "instruments": [ {"at": [x,y], "kind": "pressure gauge|pressure transmitter|temperature gauge/thermowell|temperature transmitter|flow meter|analytical/sample|level|other",
                   "tag": "only if legible", "confidence": 0-1, "note": ""} ],
 "fittings": [ {"at": [x,y], "type": "elbow|tee|reducer|coupling|union|flange pair|cap", "confidence": 0-1} ],
 "text_read": ["exact text you can read: stencils, print lines, tags"],
 "issues": [ {"title": "", "severity": "High|Medium|Low", "box": [x0,y0,x1,y1], "text": ""} ],
 "summary": "one sentence"
}
Rules: coordinates are 0-1000 normalised (x right, y down), pipe centrelines follow the pipe; at most 10 runs.
Wall thickness / schedule is NOT visible from outside: only SUGGEST a schedule with its basis and keep confidence low.
Never state a pipe size without a basis (stencil, print line, or a known reference in frame); otherwise "?".
For valves the body is inside the pipe: name the operator and, if the stem motion is clear, the FAMILY only (quarter-turn = ball or butterfly; multi-turn / rising stem = gate, globe or plug). Never pick ball vs butterfly or globe vs plug.
For instruments name the device type you see; never invent a model, range or tag you cannot read.
Insulated or jacketed pipe hides the material: set concealed=true and material_confidence low. Painted pipe hides the base metal: say so in cues."""


def provider():
    forced = os.environ.get("VISION_PROVIDER", "").lower()
    order = [forced] if forced in DEFAULTS else list(DEFAULTS)
    for name in order:
        env, model = DEFAULTS[name]
        if os.environ.get(env):
            return name, env, os.environ.get("VISION_MODEL") or model
    return None


def _post(url, headers, body, timeout):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=dict(headers, **{"Content-Type": "application/json"}), method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def _extract_json(text):
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


def call(jpeg_bytes, timeout=55):
    prov = provider()
    if not prov:
        raise RuntimeError("no vision provider configured")
    name, env, model = prov
    key = os.environ[env]
    b64 = base64.b64encode(jpeg_bytes).decode()
    if name in ("openai", "xai", "groq"):
        url = {"openai": "https://api.openai.com/v1/chat/completions", "xai": "https://api.x.ai/v1/chat/completions",
               "groq": "https://api.groq.com/openai/v1/chat/completions"}[name]
        body = {"model": model, "temperature": 0.1, "messages": [{"role": "user", "content": [
            {"type": "text", "text": PROMPT}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]}]}
        if name == "openai":
            body["response_format"] = {"type": "json_object"}
        out = _post(url, {"Authorization": f"Bearer {key}"}, body, timeout)
        text = out["choices"][0]["message"]["content"]
    elif name == "anthropic":
        body = {"model": model, "max_tokens": 4000, "temperature": 0.1, "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}}, {"type": "text", "text": PROMPT}]}]}
        out = _post("https://api.anthropic.com/v1/messages", {"x-api-key": key, "anthropic-version": "2023-06-01"}, body, timeout)
        text = "".join(c.get("text", "") for c in out["content"])
    else:  # gemini
        body = {"contents": [{"parts": [{"text": PROMPT}, {"inline_data": {"mime_type": "image/jpeg", "data": b64}}]}],
                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        out = _post(url, {"x-goog-api-key": key}, body, timeout)
        text = out["candidates"][0]["content"]["parts"][0]["text"]
    return name, model, _extract_json(text)
