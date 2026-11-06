"""The shared browser-test setup (2.1, J21 / C7-12), as a module instead of executing the first half of e2e14.py.
Until 2.1, 34 suites ran  exec(open("e2e14.py").read().split("with sync_playwright() as pw:")[0]) : editing e2e14's header, or the
sentence the split depends on, silently changed or broke all of them. This module holds the same setup; a suite uses it with

    import json, sys, pathlib, re
    BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
    sys.argv = [sys.argv[0], BK]
    from harness import *          # was: __file__ = …/e2e14.py; exec(open(__file__).read().split(…)[0])

Importing it does what the exec did, once: reads the data (sys.argv[1]: a bundle such as test/fixtures/synthetic.json or a backup
folder), writes this run's page (one per suite and process, so suites run side by side), starts a local server and loads the mock.
It names: ROOT SP BK SHOTS seed html PAGE srv U MOCK errors fails oks check new_ctx open_page close_modals idle watch, plus the modules the
old prefix imported (json pathlib sys threading functools http re sync_playwright).
Differences to the exec: (1) the data must not be empty: a missing or empty data set stops the run (R7-10: a suite on no data passed
without testing anything); set PT_EMPTY_DATA_OK=1 for a suite that means to start empty. (2) The functions read this module's
globals, so rebinding  U = …  or  seed = …  in a suite no longer changes what open_page / new_ctx use (mutate seed in place instead).
Suites still on the exec: see the list in the 2.1 build log; e2e14.py keeps its own copy until it imports this module too."""
import json, pathlib, sys, threading, functools, http.server, re, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SP = pathlib.Path("work")
BK = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else SP / "backup-140")
SHOTS = SP / "shots14e"; SHOTS.mkdir(parents=True, exist_ok=True)
seed = {}
if BK.is_file():   # 1.7: the made-up data set is one bundle (test/fixtures/synthetic.json, built by tools/make_synthetic.py)
    seed = json.loads(BK.read_text())["docs"]
else:
    for f in (BK / "data/users/me").rglob("*.json"):
        seed["data/users/user-1/" + str(f.relative_to(BK / "data/users/me").with_suffix(""))] = json.loads(f.read_text())
if not any("/projects/" in k or k.endswith("/meta") for k in seed) and os.environ.get("PT_EMPTY_DATA_OK") != "1":
    sys.exit(f"harness: no test data at {BK} (no projects, no workspace list): the suite would pass without testing anything")
html = (ROOT / "dist/prompt-translator.html").read_text()
PAGE = f"index14-{pathlib.Path(sys.argv[0]).stem}-{os.getpid()}.html"   # 1.8: one page per run, so suites can run side by side
(ROOT / "test" / PAGE).write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(ROOT / "test")))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:%d/" % srv.server_address[1] + PAGE
MOCK = (ROOT / "test/mock.js").read_text()
errors, fails, oks = [], [], []
def check(name, cond, info=""):
    (oks if cond else fails).append(name + ("" if cond else "  → " + str(info)[:400]))
def new_ctx(b, w=1440, h=950, scheme="dark"):
    ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=scheme)
    ctx.add_init_script("if (window === window.top) window.__seed = " + json.dumps(seed) + ";")
    ctx.add_init_script(MOCK)
    return ctx
def _ws_order():   # 1.7.1: workspaces in the order "last used first, then the others" — from the data, never by a person's name
    m = next((v for k, v in seed.items() if k.endswith("/meta")), {})
    ws = [w["id"] for w in m.get("workspaces", [])]; last = m.get("last")
    return ([last] + [w for w in ws if w != last]) if last in ws else ws
def open_page(ctx, pick=0):   # pick: 0 = the last-used workspace, 1 = the other one (or a visible name)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]) if "sandboxed" not in str(e) else None)
    pg.on("console", lambda m: errors.append("console: " + m.text[:300]) if m.type == "error" and "fonts.g" not in m.text and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append("native dialog: " + d.message[:100]), d.dismiss()))
    pg.goto(U); pg.wait_for_timeout(900)
    pg.wait_for_selector(".app, .ws-opt, #fr-name, .lock", timeout=60000)   # 1.8: wait for the first screen instead of a fixed pause
    if pg.locator(".app").count() == 0 and pick is not None: (pg.locator(f'.ws-opt[data-id="{_ws_order()[pick]}"]') if isinstance(pick, int) else pg.get_by_text(pick, exact=True).first).click()
    pg.wait_for_selector(".app", timeout=15000); pg.wait_for_timeout(500)
    close_modals(pg)
    if pathlib.Path(sys.argv[0]).name in ("e2e14.py", "migrate14.py", "smoke14.py"):   # 1.6.0: these flows test the older step views; the projects get their earlier view back for the test only
        pg.evaluate("(WS.projects || []).forEach(p => { if (p.modeBefore160) p.mode = p.modeBefore160; })")
    return pg
def close_modals(pg):
    for _ in range(5):
        if not pg.locator(".modal [data-a=modal-close], .rpage [data-a=modal-close]").count(): break
        pg.locator(".modal [data-a=modal-close], .rpage [data-a=modal-close]").first.click(); pg.wait_for_timeout(150)
def idle(pg, ms=15000):
    # 1.6.0: automatic steps chain with short gaps (engine suggestion → trial → mini-test); wait until PT has been idle for half a second, up to 3 minutes
    import time as _t
    deadline = _t.time() + max(ms, 180000) / 1000
    while _t.time() < deadline:
        if pg.evaluate("AI.running.size === 0"):
            pg.wait_for_timeout(500)
            if pg.evaluate("AI.running.size === 0"): break
        else: pg.wait_for_timeout(300)
    pg.wait_for_timeout(150)
def watch(pg):
    return pg.evaluate("(() => { const p = WS.projects.find(x => /watch/i.test(x.name)) || WS.projects[0]; openProject(p.id); return p.id; })()")
