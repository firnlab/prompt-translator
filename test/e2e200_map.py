"""2.0.0 Part B ("Solution map and the new order"): smoke"""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=30000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0 && !M20RUN.total"):
            pg.wait_for_timeout(250)
            if ev(pg, "AI.running.size === 0 && !M20RUN.total"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")
    pid = ev(pg, "(() => { const p = blankProject('Family list'); p.northStar.goal = 'One shopping list the four of us share on our phones'; WS.projects.push(p); touch(p); openProject(p.id); return p.id; })()")
    pg.wait_for_timeout(500)
    print(ev(pg, "document.querySelector('.nx20') ? document.querySelector('.nx20').innerText : 'no nx'"))
    pg.locator(".pg-bar .sp-map20").first.click(); pg.wait_for_timeout(300)
    print(ev(pg, "document.querySelector('.main').innerText.slice(0, 1500)"))
    ev(pg, "factsAdd(curP(), {kind: 'never', words: 'We never log in to Google or Samsung accounts'})")
    pg.locator("[data-a=m20-ask][data-v=full]").first.click(); pg.wait_for_timeout(200)
    print(ev(pg, "(document.querySelector('.m20-confirm')||{}).innerText"))
    pg.locator("#m20-cf-go").click(); wait_ai(pg)
    print(ev(pg, "document.querySelector('.main').innerText.slice(0, 3000)"))
    print(ev(pg, "JSON.stringify(m20Coverage(curP()))"), ev(pg, "window.__mapCalls"))
    pg.screenshot(path="/tmp/claude-0/-home-claude/7c3b61ed-ba30-5911-b48f-fdb261d43dba/scratchpad/b/m1.png", full_page=True)
    print(ev(pg, "JSON.stringify(m20Read(curP()).routes.filter(r => /Google/.test(r.name)).map(r => ({b: r.breaks, ai: r.aiBreaks, st: m20Status(curP(), r)})))"), ev(pg, "JSON.stringify(factsActive(curP()).map(e => [e.id, factKw(e)]))"))
    print(ev(pg, "(() => { const p = curP(), r = m20Read(p).routes.find(r => /Google/.test(r.name)); return JSON.stringify({t: m20Text(r), h: factCodeHits(factsActive(p, FACT_RULES), m20Text(r)).map(h => h.s)}); })()"))
    print("errors", errors[:5])
