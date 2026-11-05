"""1.7.1 owner-time baseline and name independence, on a COPY of the real data (or the made-up bundle) with the mock runtime.
Covers: a real tap counts once (a button, a select, a sent form), PT's own programmatic clicks and typing do not count as taps,
typing counts as an active minute, per-project counts, the day document is written to <workspace>/metrics-<day>/<tab id> and
holds only numbers and action names (never typed text), the Health tab shows the row in three languages, nothing in PT's behaviour
changes; the empty-second-workspace card is found by position and names the workspace, an earlier keep decision (any keep* flag)
still counts, Keep hides it for good; kit sharing sees the names of the other workspaces; no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
from harness import *   # 2.1 (J21): the shared setup as a module (was: exec of the first half of e2e14.py)
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
SECRET = "Zebra-Quartz-4711 private words"   # typed into PT; must never reach the metrics document

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)

    print("1 taps and active minutes")
    check("the version is 1.7.1 or later", [int(x) for x in ev(pg, "PT_VERSION").split(".")] >= [1, 7, 1], ev(pg, "PT_VERSION"))
    t0 = ev(pg, "(metDoc() || {}).taps || 0")
    pg.locator("[data-a=nav][data-v=settings]").first.click(); pg.wait_for_timeout(250)
    t1 = ev(pg, "metDoc().taps")
    check("one real tap on a button counts once", t1 == t0 + 1, [t0, t1])
    check("…under PT's own action name", ev(pg, "metDoc().acts.nav >= 1"), ev(pg, "metDoc().acts"))
    ev(pg, "document.querySelector('[data-a=tab][data-v=general]') && document.querySelector('[data-a=tab][data-v=general]').click()"); pg.wait_for_timeout(200)
    check("a click PT makes by itself (not trusted) does not count", ev(pg, "metDoc().taps") == t1, ev(pg, "metDoc().taps"))
    close_modals(pg); t1 = ev(pg, "metDoc().taps")
    sel = pg.locator(".main select[data-bind]:visible").first   # keyboard on a closed select = a real (trusted) change, like a person's
    check("there is a choice in Settings to change", sel.count() == 1)
    if sel.count():
        cur = sel.input_value(); sel.focus(); pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(250)
        if pg.locator(".main select[data-bind]:visible").first.input_value() == cur: pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(250)
        check("changing a choice counts as one tap", ev(pg, "metDoc().taps") == t1 + 1, ev(pg, "metDoc().acts"))
        s2 = pg.locator(".main select[data-bind]:visible").first; s2.select_option(cur); pg.wait_for_timeout(200)
    t2 = ev(pg, "metDoc().taps")
    ev(pg, "MET.lastMin = 0; metDoc().min = 0")
    pid = ev(pg, "(() => { const p = WS.projects.find(x => x.status !== 'archived') || WS.projects[0]; openProject(p.id); return p.id; })()"); pg.wait_for_timeout(400)
    box = pg.locator(".main textarea:visible, .main input[type=text]:visible").first
    if box.count():
        box.click(); pg.wait_for_timeout(100); t3 = ev(pg, "metDoc().taps")
        box.type(SECRET[:12], delay=5); pg.wait_for_timeout(100)
        check("typing is not a tap", ev(pg, "metDoc().taps") == t3, [t3, ev(pg, "metDoc().taps")])
        check("typing makes the minute active", ev(pg, "metDoc().min") >= 1, ev(pg, "metDoc().min"))
        box.fill(SECRET); pg.wait_for_timeout(100); box.fill(""); pg.wait_for_timeout(100)
    else:
        pg.keyboard.press("Shift"); pg.wait_for_timeout(100)
        check("a key press makes the minute active", ev(pg, "metDoc().min") >= 1, ev(pg, "metDoc().min"))
    check("the same minute is counted once", ev(pg, "(() => { const a = metDoc().min; metActive(); metActive(); return metDoc().min === a; })()"))
    btn_ = pg.locator(".main [data-a]:visible:not(label):not([data-a=nav])").first
    a_name = btn_.get_attribute("data-a") if btn_.count() else None
    check("there is a button to tap inside the project", bool(a_name))
    before = ev(pg, f"((metDoc().proj['{pid}'] || {{}}).t || 0)")
    if a_name and ev(pg, f"!!ACTIONS['{a_name}']"):
        btn_.click(); pg.wait_for_timeout(300)
        check("a tap inside a project is also counted for that project", ev(pg, f"(metDoc().proj['{pid}'] || {{}}).t || 0") == before + 1, [a_name, ev(pg, "metDoc().proj")])
    close_modals(pg)

    print("2 the day document")
    ev(pg, "metFlush()"); pg.wait_for_timeout(600)
    db = ev(pg, "window.__mockdb()")
    keys = [k for k in db if re.search(r"/ws-[^/]+/metrics-\d{4}-\d\d-\d\d/tab-", k)]
    check("one document per day and page load under the workspace", len(keys) == 1, keys)
    doc = db[keys[0]] if keys else {}
    check("…with the counts", doc.get("taps", 0) >= t2 and doc.get("min", 0) >= 1 and doc.get("v") == 1, {k: doc.get(k) for k in ("taps", "min", "v")})
    raw = json.dumps(doc, ensure_ascii=False)
    check("…and never the text you typed", "Zebra" not in raw and "Quartz" not in raw, raw[:300])
    def only_numbers_and_names(d):
        allowed = {"v", "day", "ws", "pt", "taps", "min", "acts", "proj", "first", "last", "_rev", "id", "seq"}   # 1.9: seq = the action names in order (self-scan)
        if set(d) - allowed: return False
        if not all(isinstance(v, int) for v in d.get("acts", {}).values()): return False
        if not all(re.fullmatch(r"[\w:.\-?]{1,40}", k) for k in d.get("acts", {})): return False
        if not isinstance(d.get("seq", []), list) or not all(isinstance(k, str) and re.fullmatch(r"[\w:.\-?]{1,40}", k) for k in d.get("seq", [])): return False
        return all(set(r) <= {"t", "m"} and all(isinstance(x, int) for x in r.values()) for r in d.get("proj", {}).values())
    check("…holding only numbers, dates and PT's own action names", only_numbers_and_names(doc), raw[:400])
    check("a page load never writes another page load's document", ev(pg, "MET.path.endsWith('/' + TAB_ID)"))

    print("3 the Health tab")
    for lang, word in (("en", "Your time in PT"), ("de", "Deine Zeit in PT"), ("zh", "你在 PT 中花的时间")):
        ev(pg, f"LANG = '{lang}'; applyLangAttr()")
        ev(pg, "UI.view = 'settings'; UI.setTab = 'health'; render()"); pg.wait_for_timeout(700)
        body = ev(pg, "document.querySelector('.main').innerText")
        check(f"Health shows the time row ({lang})", word in body and re.search(r"\d", body.split(word)[-1][:200]) is not None, body.split(word)[-1][:200] if word in body else body[:200])
    ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")
    check("the row counts this window and earlier ones", ev(pg, "metSummary().taps >= metDoc().taps"))

    print("4 name independence")
    r = ev(pg, """async () => {
      const keep = Object.keys(META).filter(k => /^keep[A-Z]/.test(k)); const saved = {}; for (const k of keep){ saved[k] = META[k]; delete META[k]; }
      const back = WS.id, first = META.workspaces[0].id;
      const w = await createWorkspace('Alex', 'en', wsDefaults('en'));
      while (META.workspaces[1] && META.workspaces[1].id !== w.id && META.workspaces.length > 2){ const i = META.workspaces.findIndex(x => x.id === w.id); META.workspaces.splice(1, 0, META.workspaces.splice(i, 1)[0]); }
      if (WS.id !== back) await openWorkspace(back);
      const found = await emptySecondWs();
      const res = {found: found && found.name, kept0: keptSecondWs()};
      META.keepOldName = true; res.legacy = keptSecondWs(); delete META.keepOldName;
      UI.secondWsEmpty = found; UI.view = 'engine'; render(); await new Promise(r => setTimeout(r, 200));
      res.card = (document.querySelector('.main') || document.body).innerText.includes('“Alex”');
      for (const k of keep) META[k] = saved[k];
      return res; }""")
    check("the empty second workspace is found by its place, not by a name", r["found"] == "Alex" or r["found"] is not None, r)
    check("with no keep decision the card can show", r["kept0"] is False, r)
    check("an earlier keep decision under any keep… flag still counts", r["legacy"] is True, r)
    check("the card names the workspace", r["card"], r)
    k = pg.locator("[data-a=jw-keep]")
    if k.count():
        k.first.click(); pg.wait_for_timeout(300)
        check("Keep hides the card for good", ev(pg, "META.keepSecondWs === true && !UI.secondWsEmpty && !document.querySelector('[data-a=jw-keep]')"))
    else: check("Keep button is on the card", False, ev(pg, "UI.view"))
    ks = ev(pg, """(() => { const p = {northStar: {goal: 'a small planner for my week'}, audience: {}, arch: {components: []}, tool: {}, intake: {raw: ''}};
      const before = kitStorageRec(p).why; p.northStar.goal += ', alex uses it too'; const after = kitStorageRec(p); return {before, after: after.kind, why: after.why, shared: t('kit.rec.db.shared')}; })()""")
    check("kit sharing sees the name of another workspace in the text", ks["after"] == "db" and ks["why"] == ks["shared"] and ks["before"] != ks["shared"], ks)
    html = (ROOT / "dist/prompt-translator.html").read_text()
    check("no workspace is named in PT's code (no fixed name in the workspace setup)", not re.search(r'createWorkspace\("[A-Z][a-z]+"|w\.name = "[A-Z][a-z]+"', html))
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
