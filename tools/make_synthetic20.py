"""2.1 (J11): made-up test data in today's shape (2.0), for the checks on GitHub and the 2.1 suites. No real data, no names, no keys.
It starts from the made-up 1.x bundle (test/fixtures/synthetic.json, kept as it is for the migration tests), lets PT move every project
to 2.0 (the restore point "Before 2.0", the move record m200), and then uses PT itself with the mock runtime to give each project
what a project has today: a facts book (never / must / fact, one taken back), a chat (chat20), a goal card confirmed by you (goal20),
a map with routes (map20) and, in two projects, a chosen route with its decision, answered pick cards (pick log) and the ledger.
Every project ends with at least 3 rules and 3 answered questions (the checks that count them are never empty on this data).
Output: test/fixtures/synthetic20.json (one bundle, data/users/user-1/...). Run after a change to the 2.x data model:
python3 tools/make_synthetic20.py   (needs a built dist/prompt-translator.html)"""
import json, pathlib, sys, threading, functools, http.server, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "test/fixtures/synthetic.json"
OUT = ROOT / "test/fixtures/synthetic20.json"
html = (ROOT / "dist/prompt-translator.html").read_text()
PAGE = "index_syn20.html"
(ROOT / "test" / PAGE).write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(ROOT / "test")))
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:%d/" % srv.server_address[1] + PAGE
MOCK = (ROOT / "test/mock.js").read_text()
seed = json.loads(SRC.read_text())["docs"]
# made-up words per project kind (matched on the project's name; each project gets its own, so cross-project checks have something to find)
WORDS = {
  "scout": ["We never send an idea to anyone outside the family. The weekly list must arrive by Monday 8:00. The board uses a shared spreadsheet.",
            "We never pay more than CHF 20 a month for the scout. Every score must name its source. ASKME"],
  "reading": ["We never share the reading list publicly. Each article must keep its own note. The page uses a private link.",
              "We never track what I read on other sites. The weekly reminder must be one message only. ASKME"],
  "dictation": ["We never send my voice to a server I did not choose. Text must appear within two seconds. The laptop has a built-in microphone.",
                "We never store recordings after typing. It must work in any text field. ASKME"],
  "zh": ["We never show the list to other people. Each entry must keep the date it was added. The phone has a notes app.",
         "We never use a paid service for this. The page must work offline. ASKME"],
}
def kind(name):
    n = name.lower()
    return "scout" if "scout" in n else "reading" if "reading" in n else "dictation" if "dictation" in n else "zh"
GOAL = {"scout": ("A ranked weekly list of digital business ideas", "Me, on Monday mornings", "Three ideas a week score 4 or more"),
        "reading": ("One private page with my reading list and a note each", "Only me", "I read two saved articles a week"),
        "dictation": ("Type what I say into any text field", "Only me, on my laptop", "Dictating a message is faster than typing it"),
        "zh": ("一个记录我想读的文章的私人页面", "只有我", "每周读完两篇")}
CHOOSE = {"scout", "dictation"}   # two projects with a chosen route, two still deciding

def idle(pg, ms=120000):
    deadline = time.time() + ms / 1000
    while time.time() < deadline:
        if pg.evaluate("AI.running.size === 0 && !(typeof M20RUN !== 'undefined' && M20RUN.total)"):
            pg.wait_for_timeout(500)
            if pg.evaluate("AI.running.size === 0 && !(typeof M20RUN !== 'undefined' && M20RUN.total)"): break
        else: pg.wait_for_timeout(300)
def saved(pg):
    pg.evaluate("flushSaves()")
    for _ in range(200):
        if pg.evaluate("Store.queue.size === 0 && Store.busy.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(400)
def say(pg, text):
    pg.evaluate("(t) => c20Send(curP(), t)", text); idle(pg)

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={"width": 1440, "height": 950})
    ctx.add_init_script("if (window === window.top) window.__seed = " + json.dumps(seed) + ";"); ctx.add_init_script(MOCK)
    ctx.clock.set_system_time("2026-11-02T09:00:00Z")   # a made-up date (ids stay random, so each build differs a little)
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(U); pg.wait_for_selector(".app, .ws-opt", timeout=60000); pg.wait_for_timeout(800)
    wss = pg.evaluate("META.workspaces.map(w => w.id)")
    report = []
    for wid in wss:
        pg.evaluate("(id) => openWorkspace(id)", wid); pg.wait_for_selector(".app", timeout=30000); pg.wait_for_timeout(1200); idle(pg)
        pg.evaluate("(() => { Store.isOwner = true; window.__ptNoMorning = true; })()")
        pids = pg.evaluate("WS.projects.filter(p => p.status !== 'archived').map(p => p.id)")
        for pid in pids:
            pg.evaluate("(id) => { openProject(id); UI.home = false; render(); }", pid); pg.wait_for_timeout(300)
            name = pg.evaluate("curP().name"); k = kind(name)
            moved = pg.evaluate("!!curP().m200")
            # the chat: rules and a fact in your own words, then PT's question as a pick card (answered below)
            pg.evaluate("face20Set(curP(), 'chat')"); pg.wait_for_timeout(200)
            for w in WORDS[k]: say(pg, w)
            # one rule taken back (the facts book keeps it, marked; "Use again" brings it back)
            pg.evaluate("""(() => { const p = curP(); const e = factsAdd(p, {kind: 'must', words: 'The list must be printed every week', by: 'you'}); if (e){ e.status = 'withdrawn'; } touch(p); })()""")
            # the goal card, confirmed by you
            o, w_, s = GOAL[k]
            pg.evaluate("([o, w, s]) => { const p = curP(); snapshot(p, 'goal'); goal20Apply(p, {outcome: o, whom: w, success: s}); touch(p); render(); }", [o, w_, s])
            # answered questions: the chat's card and PT's next picks (at least 3 answered per project)
            for _ in range(4):
                n_log = pg.evaluate("pickRead(curP()).log.filter(e => String(e.answer || '').trim()).length")
                if n_log >= 3: break
                if not pg.evaluate("pickOpenCards(curP()).length"):
                    pg.evaluate("aiPickNext(curP(), {n: 3})"); idle(pg)
                pg.evaluate("""(() => { const p = curP(); for (const c of pickOpenCards(p).slice(0, 3)){ const i = c.rec != null && c.rec >= 0 && c.options[c.rec] ? c.rec : 0; if (c.options[i]) pickAnswer(p, c.id, {keys: [c.options[i].k]}); } touch(p); })()""")
                idle(pg)
            # the map: one full round (six angles and the red team), then a shortlist
            pg.evaluate("m20Open(curP(), 'map')"); pg.wait_for_timeout(300)
            pg.evaluate("m20Round(curP(), {kind: 'full'})"); idle(pg)
            if k in CHOOSE:
                pg.evaluate("""(() => { const p = curP(), M = m20Of(p); const ok = M.routes.filter(r => m20Status(p, r) !== 'blocked'); M.short = ok.slice(0, 3).map(r => r.id); touch(p);
                    const r = ok[0]; if (r) m20Take(p, r.id, {why: 'It is free and quick to set up', trip: ['the free plan stays free']}); touch(p); render(); })()""")
            idle(pg)
            pg.evaluate("face20Set(curP(), 'pick')")
            saved(pg)
            r = pg.evaluate("""(() => { const p = curP(); return {name: p.name, moved: !!p.m200, rules: factsActive(p, FACT_RULES).length, facts: factsActive(p, ['fact']).length,
                answered: pickRead(p).log.filter(e => String(e.answer || '').trim()).length, routes: m20Read(p).routes.length, chosen: !!m20Chosen(p), chat: c20Read(p).msgs.length, goal: goal20Read(p).by.outcome}; })()""")
            r["was_moved"] = moved; report.append(r)
    saved(pg)
    db = pg.evaluate("window.__mockdb()")
    b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
docs = {p: d for p, d in sorted(db.items()) if p.startswith("data/users/user-1/")}
bad = [r for r in report if not (r["moved"] and r["rules"] >= 3 and r["answered"] >= 3 and r["routes"] and r["chat"] and r["facts"] >= 1)]
OUT.write_text(json.dumps({"_about": "Made-up test data in the 2.0 shape (tools/make_synthetic20.py): the projects of test/fixtures/synthetic.json moved to 2.0 by PT, each with a facts book (never, must, fact, one taken back), a chat, a confirmed goal card, a map (two with a chosen route and its decision), answered pick cards and at least 3 rules and 3 answered questions. Built by PT itself with the mock runtime. No real data.", "docs": docs}, ensure_ascii=False, indent=0) + "\n")
for r in report: print(r)
print("synthetic20 docs written:", len(docs), "projects:", len(report), "short of the minimum:", [r["name"] for r in bad], "errors:", errs[:3])
sys.exit(1 if errs or bad or not report else 0)
