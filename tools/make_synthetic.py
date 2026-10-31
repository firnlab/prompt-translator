"""Made-up test data for the checks on GitHub (task #84, decided 25 Oct 2026): a workspace with three invented projects at three stages,
built by PT itself with the mock runtime (no real data, no names, no keys). Output: test/fixtures/synthetic.json, one bundle the
flow tests read (data/users/me/...). Run after a change to the data model: python3 tools/make_synthetic.py"""
import json, pathlib, sys, threading, functools, http.server
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "test/fixtures/synthetic.json"   # one bundle, not the data layout (the data guard keeps that layout out of the repository on purpose)
html = (ROOT / "dist/prompt-translator.html").read_text()
(ROOT / "test/index_syn.html").write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(ROOT / "test")))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:%d/index_syn.html" % srv.server_address[1]
MOCK = (ROOT / "test/mock.js").read_text()
IDEAS = [
  ("Watch · weekly idea scout", "A board that collects and scores my weekly business ideas, ranks them by CHF per month per hour and shows me the top three every Monday", "full"),
  ("Reading list page", "A private page where I keep the articles I want to read, with a note each and a weekly reminder", "designed"),
  ("Dictation helper", "A dictation tool like Wispr Flow, just for me, that types what I say into any text field", "idea")]
def idle(pg, ms=90000):
    import time as _t
    deadline = _t.time() + ms / 1000
    while _t.time() < deadline:
        if pg.evaluate("AI.running.size === 0"):
            pg.wait_for_timeout(500)
            if pg.evaluate("AI.running.size === 0"): break
        else: pg.wait_for_timeout(300)
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={"width": 1440, "height": 950})
    ctx.add_init_script("if (window === window.top) window.__seed = {};"); ctx.add_init_script(MOCK)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(U); pg.wait_for_timeout(1200)
    # two workspaces with the first names the flow tests expect (the owner's and the second user's; names only, nothing else of theirs)
    pg.evaluate("(async () => { const w2 = await createWorkspace('Second owner', 'zh', Object.assign(wsDefaults('zh'), {seenVersion: PT_VERSION, firstUseDone: true})); const w = await createWorkspace('Owner', 'en', Object.assign(wsDefaults('en'), {seenVersion: PT_VERSION, firstUseDone: true})); META.last = w.id; META.v10 = true; saveMeta(); UI.firstRun = null; await openWorkspace(w2.id); newProject('读书清单', {raw: '一个记录我想读的文章的私人页面'}); await openWorkspace(w.id); })()")
    pg.wait_for_timeout(800)
    for name, raw, stage in IDEAS:
        pg.evaluate("([n, r]) => { newProject(n, {raw: r}); const p = curP(); p.audience = {customers: false, eu: false}; touch(p); UI.home = false; render(); }", [name, raw])
        pg.wait_for_timeout(200)
        if stage in ("full", "designed"):
            pg.evaluate("aiPickNext(curP(), {n: 3})"); idle(pg)
            pg.evaluate("(() => { const p = curP(); for (const c of pickOpenCards(p)){ if (c.rec != null && c.rec >= 0 && c.options[c.rec]) pickAnswer(p, c.id, {keys: [c.options[c.rec].k], assumed: c.hard ? false : true}); } p.northStar.goal = p.northStar.goal || p.intake.raw; p.northStar.problem = p.northStar.problem || 'Ideas and notes get lost'; p.northStar.success = p.northStar.success || 'I see the result every week without doing anything'; touch(p); })()")
            for fn in ["aiRequirements", "aiArchitecture", "aiCompile", "aiTests"]:
                pg.evaluate(f"typeof {fn} === 'function' && {fn}(curP())"); idle(pg, 120000)
        if stage == "full":
            pg.evaluate("aiReview(curP(), LENSES.map(l => l.id))"); idle(pg, 120000)
            pg.evaluate("(() => { const p = curP(); p.releases.unshift({v: '1.0', at: now(), note: 'first'}); p.live = {v: '1.0', since: now()}; p.tool.versions = [{v: '1.0', url: 'https://claude.ai/artifact/SYNTHETIC000000000000', version: 'v-synthetic-1', at: now()}]; touch(p); })()")
        pg.wait_for_timeout(300)
    pg.wait_for_timeout(1200)
    db = pg.evaluate("window.__mockdb()")
    b.close()
# the empty workspace PT makes on a blank first start is dropped: the flow tests pick a workspace by its name
empty = [k.split("/")[-1][3:] for k in db if k.startswith("data/users/user-1/ws-") and k.count("/") == 3 and not any(x.startswith(k + "/projects/") for x in db)]
for k in list(db):
    if any(("/ws-" + e) in k for e in empty): del db[k]
meta = db.get("data/users/user-1/meta")
if meta: meta["workspaces"] = [w for w in meta["workspaces"] if w["id"] not in empty]
docs = {p: d for p, d in db.items() if p.startswith("data/users/user-1/")}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"_about": "Made-up test data built by PT itself with the mock runtime (tools/make_synthetic.py). No real data. Workspace Owner: a live weekly scout, a designed reading page, a bare dictation idea; workspace Second owner (zh): one reading-list idea.", "docs": docs}, ensure_ascii=False, indent=0) + "\n")
print("synthetic docs written:", len(docs), "errors:", errs[:3])
sys.exit(1 if errs else 0)
