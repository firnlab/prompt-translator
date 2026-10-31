"""Run the real v1 data (backup) through 1.0: migration, every step and mode, save, reload, compare."""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
BK = pathlib.Path(sys.argv[1])  # backup-v1-data dir
SHOTS = pathlib.Path(sys.argv[2]); SHOTS.mkdir(parents=True, exist_ok=True)
seed = {}
base = BK / "data/users/me"
for f in base.rglob("*.json"):
    rel = f.relative_to(base).with_suffix("")
    seed["data/users/user-1/" + str(rel)] = json.loads(f.read_text())
orig = {k: v for k, v in seed.items() if "/projects/" in k}
page_html = (ROOT / "dist/prompt-translator.html").read_text()
wrapped = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + page_html + "</body></html>"
T = ROOT / "test/index_real.html"; T.write_text(wrapped)
MOCK = (ROOT / "test/mock.js").read_text()
errors, fails = [], []
def check(c, m):
    (fails.append(m), print("  FAIL:", m)) if not c else print("  ok:", m)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 960})
    ctx.add_init_script(MOCK)
    ctx.add_init_script("if (window === window.top && !localStorage.getItem('mockdb')) localStorage.setItem('mockdb', " + json.dumps(json.dumps(seed)) + ");")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" and "fonts.g" not in m.text and "net::" not in m.text else None)
    pg.goto(T.as_uri())
    pg.wait_for_selector(".rail", timeout=10000); pg.wait_for_timeout(500)
    check(pg.evaluate("META.workspaces.map(w => w.name)") == ["Owner"], "workspace renamed to Owner, no extra workspace")
    if pg.locator("[data-a=modal-close]").count(): pg.locator("[data-a=modal-close]").first.click()
    names = pg.evaluate("WS.projects.map(p => p.name)")
    check(len(names) == 2, "both v1 projects listed: " + str(names))
    nnotes = pg.evaluate("WS.notes.length"); check(nnotes == 6, f"6 notes kept ({nnotes})")
    pid = "p-mvdsdqnoyglbu"
    pg.evaluate(f"openProject('{pid}')"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(SHOTS / "real-open.png"), full_page=False)
    for ph in ["capture","understand","interview","assume","require","arch","build","review","test","launch","release","operate"]:
        pg.evaluate(f"setPhase('{ph}')"); pg.wait_for_timeout(250)
        if ph in ("interview", "review", "launch"): pg.screenshot(path=str(SHOTS / f"real-{ph}.png"), full_page=True)
    for m in ["blueprint","journey","swimlanes","express","steps"]:
        pg.locator(f"[data-a=mode][data-v={m}]").first.click(); pg.wait_for_timeout(300)
        pg.screenshot(path=str(SHOTS / f"real-mode-{m}.png"), full_page=False)
    print("readiness", pg.evaluate(f"readinessScore(WS.projects.find(p=>p.id==='{pid}'))"))
    check(pg.evaluate(f"!!WS.projects.find(p=>p.id==='{pid}').engine"), "engine fields added to the v1 project")
    rp = pg.evaluate(f"WS.projects.find(p=>p.id==='{pid}').restore.map(r => r.kind)")
    check(rp.count("migrate") == 1, "exactly one 'before the upgrade' restore point: " + str(rp))
    # force a save and wait
    pg.evaluate(f"saveProject(WS.projects.find(p=>p.id==='{pid}'))")
    pg.wait_for_function("Store.pending() === 0", timeout=15000); pg.wait_for_timeout(1500)
    pg.wait_for_function("Store.pending() === 0", timeout=15000)
    db = pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))")
    big = [(k, len(json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode())) for k, v in db.items()]
    over = [x for x in big if x[1] > 262144]
    check(not over, "no stored document over 256 KiB: " + str(over))
    print("  largest docs:", sorted(big, key=lambda x: -x[1])[:5])
    parts = [k for k in db if "/parts/" in k]; print("  parts:", len(parts))
    check(pg.evaluate("saveState") != "error", "save state is not error: " + pg.evaluate("saveState"))
    # reload and compare with the original v1 data
    pg.reload(); pg.wait_for_selector(".rail", timeout=10000); pg.wait_for_timeout(800)
    now = pg.evaluate(f"JSON.parse(JSON.stringify(WS.projects.find(p=>p.id==='{pid}')))")
    o = orig[f"data/users/user-1/ws-w-mvdd7qxxwx36b/projects/{pid}"]
    lost = [k for k in o if k not in now]
    check(not lost, "no v1 field lost: " + str(lost))
    for k, v in o.items():
        if isinstance(v, list):
            check(len(now.get(k) or []) >= len(v), f"{k}: {len(v)} -> {len(now.get(k) or [])}")
    def texts(x):
        out = []
        if isinstance(x, dict): [out.extend(texts(v)) for v in x.values()]
        elif isinstance(x, list): [out.extend(texts(v)) for v in x]
        elif isinstance(x, str) and len(x) > 25: out.append(x)
        return out
    nowtxt = json.dumps(now, ensure_ascii=False)
    missing = [s for s in texts(o) if json.dumps(s, ensure_ascii=False)[1:-1] not in nowtxt]
    check(len(missing) == 0, f"every v1 text kept ({len(missing)} missing) " + str([m[:60] for m in missing[:5]]))
    for k in ["pkg", "understand", "arch", "intake", "northStar"]:
        check(json.dumps(o[k], sort_keys=True) == json.dumps({kk: now[k].get(kk) for kk in o[k]} if isinstance(o[k], dict) else now[k], sort_keys=True), f"{k} unchanged")
    pg.screenshot(path=str(SHOTS / "real-reload.png"), full_page=False)
    b.close()
print("ERRORS:", len(errors)); [print("  ", e[:300]) for e in errors[:10]]
print("FAILS:", len(fails))
