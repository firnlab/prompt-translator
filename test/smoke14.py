"""1.4 smoke run on a copy of the real data (backup-140) with the mock runtime: every project, overview, every step and mode,
Finish plan, three widths; collects page errors and console errors. Never touches real data."""
import json, pathlib, sys, threading, functools, http.server
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
BK = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "work/backup-140")
SHOTS = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "work/shots14"); SHOTS.mkdir(parents=True, exist_ok=True)
seed = {}
for f in (BK / "data/users/me").rglob("*.json"):
    seed["data/users/user-1/" + str(f.relative_to(BK / "data/users/me").with_suffix(""))] = json.loads(f.read_text())
html = (ROOT / "dist/prompt-translator.html").read_text()
(ROOT / "test/index14.html").write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(ROOT / "test")))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:%d/index14.html" % srv.server_address[1]
MOCK = (ROOT / "test/mock.js").read_text()
errors = []
def new_ctx(b, w=1440, h=950, scheme="dark"):
    ctx = b.new_context(viewport={"width": w, "height": h}, color_scheme=scheme)
    ctx.add_init_script("if (window === window.top) window.__seed = " + json.dumps(seed) + ";")
    ctx.add_init_script(MOCK)
    return ctx
def open_page(ctx, pick="Owner"):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]) if "sandboxed" not in str(e) else None)
    pg.on("console", lambda m: errors.append("console: " + m.text[:300]) if m.type == "error" and "fonts.g" not in m.text and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.goto(U); pg.wait_for_timeout(900)
    if pg.locator(".app").count() == 0 and pick: pg.get_by_text(pick, exact=True).first.click()
    pg.wait_for_selector(".app", timeout=15000); pg.wait_for_timeout(500)
    while pg.locator(".modal [data-a=modal-close]").count(): pg.locator(".modal [data-a=modal-close]").first.click(); pg.wait_for_timeout(150)
    return pg
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1440, 1000, 420):
        ctx = new_ctx(b, w=w); pg = open_page(ctx)
        pids = pg.evaluate("WS.projects.map(p => p.id)")
        for pid in pids:
            pg.evaluate(f"openProject('{pid}')"); pg.wait_for_timeout(250)
            name = pg.evaluate("curP().name")
            if w == 1440: pg.screenshot(path=str(SHOTS / f"home-{pid}-{w}.png"), full_page=False)
            for ph in ["capture","understand","interview","assume","require","arch","build","review","test","launch","release","operate"]:
                pg.evaluate(f"UI.home=false; setPhase('{ph}')"); pg.wait_for_timeout(80)
            for m in ["blueprint","journey","swimlanes","express","steps"]:
                pg.evaluate(f"curP().mode='{m}'; render()"); pg.wait_for_timeout(80)
            pg.evaluate("ACTIONS['finish-open']()"); pg.wait_for_timeout(150)
            if w == 1440 and "Watch" in name: pg.screenshot(path=str(SHOTS / f"finish-plan-{w}.png"), full_page=False)
            pg.evaluate("ACTIONS['finish-decide']()"); pg.wait_for_timeout(150)
            if w == 1440 and "Watch" in name: pg.screenshot(path=str(SHOTS / f"finish-decide-{w}.png"), full_page=False)
            pg.evaluate("UI.finish=null; render()")
            a = pg.evaluate("auditMaps()")
            if a: errors.append(f"map audit {name} @{w}: " + json.dumps(a[:5]))
        ctx.close()
    # Second owner
    ctx = new_ctx(b); pg = open_page(ctx, pick="Second owner")
    for pid in pg.evaluate("WS.projects.map(p => p.id)"):
        pg.evaluate(f"openProject('{pid}')"); pg.wait_for_timeout(200)
        for ph in ["capture","interview","require","arch","build","launch","release"]:
            pg.evaluate(f"UI.home=false; setPhase('{ph}')"); pg.wait_for_timeout(60)
    pg.screenshot(path=str(SHOTS / "jiewen.png"))
    ctx.close()
    b.close()
print("errors:", len(errors))
for e in errors[:60]: print(" ", e)
