"""1.8 health, the second owner's first day, the move 1.7 -> 1.8, tool backups and the yearly restore check — on a COPY of the
real data (or the made-up bundle) with the mock runtime. Run: python3 test/e2e180_health.py [work/backup-141 | test/fixtures/synthetic.json]
Covers:
 3 the move: once per workspace, before anything else changes; one restore point per project ("Before 1.8", stored, kind migrate),
   the decision rows' "migrated" event takes that same point; tools that existed are kit 1.7.0; the first month (boot18); the move's
   Undo sets back the projects that changed since (unchanged ones stay) and the settings the move changed, deletes nothing, and is
   gone afterwards; the cone hook: connected in 1.8.0, no offer while it is switched off, one offer per tool once it is there; not run twice.
 1 Health: five rows (my tools, honesty, economy, security, your time), each a pill with glyph + word, value, trend, threshold and
   what happens when red; "not measured yet" where there is no data; a red needs two signals (one signal = watch); earlier reds are
   kept with how they ended; PT's AI calls and approval answers are counted per day as numbers only; the economy row says "estimate";
   the Sunday-note hook health18Lines lists the rows that are not fine.
 2 the second owner (a login that is not the owner's, workspace in Chinese): one screen in Chinese on the first open — what changed,
   her project moved, the Example tool (made on "Try it" only, no AI call), her Sunday note time, the cone once when it exists; not
   shown again; her note and her settings stay in her login (the owner's are untouched); the owner never gets the screen by login.
 5 tool backups: "Export tool data" on a live tool's Run page (how the tool's own export works, where the file goes, kit 1.7.0 note,
   timer snapshot), "I saved the file" noted and shown in the fleet row; timer tools' weekly snapshot listed in the fleet row.
 6 the yearly restore check: not due in the first year, one line once a year for the Sunday note, the steps, a backup file checked
   without writing anything, "done" noted.
 three languages (no raw keys, German without ß), no page errors."""
import json, sys, pathlib, re, base64
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
RAW = r"\b(hr|so|mig)\.[a-z][a-z0-9.]*\b"
def raw_keys(text): return sorted(set(re.findall(RAW + r"(?![^\s]*@)", text)) - {"hr", "so", "mig"})
def text_of(pg, sel=".main"): return ev(pg, f"(document.querySelector('{sel}') || document.body).innerText")

# the second owner's login: her own data (made from the made-up bundle, never real data): one workspace in Chinese with one 1.7 project
SYN = json.loads((ROOT / "test/fixtures/synthetic.json").read_text())["docs"]
def her_seed():
    meta = SYN["data/users/user-1/meta"]; ws = None
    for w in meta["workspaces"]:
        if any(k.startswith(f"data/users/user-1/ws-{w['id']}/projects/") for k in SYN): ws = w; break
    out = {}
    for k, v in SYN.items():
        if k == "data/users/user-1/meta" or k.startswith(f"data/users/user-1/ws-{ws['id']}"):
            out[k.replace("data/users/user-1/", "data/users/user-2/", 1)] = json.loads(json.dumps(v))
    m = out["data/users/user-2/meta"]; m["workspaces"] = [dict(ws, pinHash=None)]; m["last"] = ws["id"]
    w = out[f"data/users/user-2/ws-{ws['id']}"]; w["settings"] = dict(w.get("settings", {}), lang="zh")
    for k in [k for k in w["settings"] if k in ("mig18", "so18", "note18")]: del w["settings"][k]
    return out
HER = her_seed()
def her_ctx(b):
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, color_scheme="light")
    ctx.add_init_script("if (window === window.top) { window.__seed = " + json.dumps(HER) + "; localStorage.setItem('mocknotowner','1'); localStorage.setItem('mockuid','user-2'); }")
    ctx.add_init_script(MOCK)
    return ctx
def her_page(ctx):
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror(second): " + str(e)[:300]))
    pg.on("console", lambda m: errors.append("console(second): " + m.text[:300]) if m.type == "error" and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append("native dialog: " + d.message[:100]), d.dismiss()))
    pg.goto(U); pg.wait_for_selector(".app", timeout=20000); pg.wait_for_timeout(900)
    return pg

HELP = """window.T18H = {
  rp(p){ const M = WS.settings.mig18 || {}; return arr(p.restore).find(x => x.id === (M.rps || {})[p.id]) || null; },
  row(id){ const r = document.querySelector('.hr18-row[data-hr18="' + id + '"]'); return r ? {st: r.dataset.st, text: r.innerText, pill: (() => { const s = r.querySelector('.hr18-pill'); return s ? {svg: !!s.querySelector('svg'), word: (s.querySelector('.ssw') || {}).textContent || '', label: s.getAttribute('aria-label') || ''} : null; })(), spk: !!r.querySelector('.hr18-spk svg'), sig: [...r.querySelectorAll('.hr18-sig li')].map(x => x.textContent.trim().slice(0, 1))} : null; },
  health(){ UI.modal = null; UI.view = 'settings'; UI.setTab = 'health'; render(); }
};"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, scheme="light"); ctx.add_init_script("if (window === window.top) window.__hr18Seen = []; ")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]) if "sandboxed" not in str(e) else None)
    pg.on("console", lambda m: errors.append("console: " + m.text[:300]) if m.type == "error" and "fonts.g" not in m.text and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append("native dialog: " + d.message[:100]), d.dismiss()))
    pg.goto(U); pg.wait_for_timeout(900)
    if pg.locator(".app").count() == 0: pg.locator(f'.ws-opt[data-id="{_ws_order()[0]}"]').click()
    pg.wait_for_selector(".app", timeout=20000); pg.wait_for_timeout(700)
    seen_modal = ev(pg, "UI.modal && UI.modal.kind")
    toast_ = ev(pg, "[...document.querySelectorAll('.mig18-toast, .modal .mig18-wn')].map(x => ({text: x.innerText, undo: !!x.querySelector('[data-a=mig18-undo]'), where: x.closest('.modal') ? 'whatsnew' : 'toast'}))")
    close_modals(pg); ev(pg, HELP)

    print("3 the move 1.7 -> 1.8")
    m = ev(pg, """(() => { const M = WS.settings.mig18; if (!M) return null; const db = window.__mockdb();
      return {at: M.at, n: M.n, projects: WS.projects.length, rps: Object.keys(M.rps).length, kinds: WS.projects.map(p => { const r = T18H.rp(p); return r ? r.kind : null; }),
        labels: WS.projects.map(p => (T18H.rp(p) || {}).label || ''), stored: WS.projects.map(p => { const r = T18H.rp(p); const d = r && db[projPath(p.id) + '/restore/' + r.id]; return !!(d && d.project && d.project.id === p.id && d.project.name === p.name); }),
        rpName: t('mig.rp'), kit: M.kit, live: WS.projects.filter(p => p.live || arr(p.tool && p.tool.versions).length).map(p => p.id), changed: Object.keys(M.changed || {}), cone: M.cone, undone: M.undone}; })()""")
    check("the move ran once for this workspace when it opened", m and m["at"] and m["n"] == m["projects"], m)
    check("one restore point per project, kind 'migrate'", m and m["rps"] == m["projects"] and all(k == "migrate" for k in m["kinds"]), m)
    check("…named 'Before 1.8' (in the workspace's language)", m and all(m["rpName"] in l for l in m["labels"]), m and m["labels"])
    check("…and stored as a full copy of each project", m and all(m["stored"]), m and m["stored"])
    check("tools that existed are kit 1.7.0 in the fleet", m and all(m["kit"].get(i) == "1.7.0" for i in m["live"]) and set(m["kit"]) == set(m["live"]), m and m["kit"])
    check("the owner's login does not get the second owner's screen", seen_modal != "so18", seen_modal)
    check("the move says so once, with its Undo (an 8 s line, or in What's new when that opens)", len(toast_) == 1 and toast_[0]["undo"] and "1.8" in toast_[0]["text"], toast_)
    r = ev(pg, """async () => { const out = []; for (const p of WS.projects){ const L = await rowsEnsure(p); await L.chain; out.push({rp: (L.list[0] || {}).rp || '', mine: (T18H.rp(p) || {}).id || '', type: (L.list[0] || {}).type}); } return out; }""")
    check("the decision rows' 'migrated' event points at the move's own restore point", r and all(x["rp"] == x["mine"] for x in r if x["type"] == "migrated") and any(x["type"] == "migrated" for x in r), r)
    bt = ev(pg, "boot18()")
    check("the first month runs: day 1, recalibration from month 3, cost figures are estimates until 3 builds", bt["on"] and bt["day"] == 1 and bt["estimateOnly"] and bt["buildsNeeded"] == 3 and bt["recalFrom"] > bt["until"] > bt["since"], bt)
    # the panel in Health, the cone hook
    ev(pg, "T18H.health()"); pg.wait_for_timeout(1200)
    pn = ev(pg, "(() => { const e = document.querySelector('.mig18-panel'); return e ? {text: e.innerText, undo: !!e.querySelector('[data-a=mig18-undo]'), cone: e.querySelectorAll('[data-a=mig18-cone]').length} : null; })()")
    check("Health shows the move with its Undo", pn and pn["undo"] and "1.8" in pn["text"], pn)
    check("in 1.8.0 the cone is connected: the move offers it", ev(pg, "cone18Ready() === true") and pn and pn["cone"] >= 1, pn)
    ev(pg, "window.__realCone = [cone18Ready, cone18Rerun]; cone18Ready = () => false; render()"); pg.wait_for_timeout(300)
    n0 = ev(pg, "document.querySelectorAll('.mig18-panel [data-a=mig18-cone]').length")
    check("no cone offer while the cone is switched off (no button that does nothing)", n0 == 0, n0)
    ev(pg, "window.__cone = []; cone18Ready = () => true; cone18Rerun = (p, o) => { window.__cone.push([p.id, o.why]); return true; }; render()"); pg.wait_for_timeout(300)
    nc = ev(pg, "document.querySelectorAll('.mig18-panel [data-a=mig18-cone]').length")
    check("with the cone there: one offer per moved tool", nc == len([1 for x in ev(pg, "WS.projects.filter(p => p.status !== 'archived' && !p.example18).map(p => p.id)")]), nc)
    if nc:
        pid0 = pg.locator(".mig18-panel [data-a=mig18-cone]").first.get_attribute("data-pid")
        pg.locator(".mig18-panel [data-a=mig18-cone]").first.click(); pg.wait_for_timeout(300)
        check("Re-run opens the cone for that tool (why: migrate) and marks it done", ev(pg, "window.__cone") == [[pid0, "migrate"]] and ev(pg, f"WS.settings.mig18.cone['{pid0}'].st") == "done", ev(pg, "[window.__cone, WS.settings.mig18.cone]"))
        if pg.locator(".mig18-panel [data-a=mig18-cone-skip]").count():
            pid1 = pg.locator(".mig18-panel [data-a=mig18-cone-skip]").first.get_attribute("data-pid")
            pg.locator(".mig18-panel [data-a=mig18-cone-skip]").first.click(); pg.wait_for_timeout(300)
            check("Skip marks it skipped; each tool is offered once", ev(pg, f"WS.settings.mig18.cone['{pid1}'].st") == "skip" and ev(pg, f"!document.querySelector('.mig18-panel [data-a=mig18-cone][data-pid=\"{pid1}\"]')"))
    ev(pg, "[cone18Ready, cone18Rerun] = window.__realCone; render()")
    # the Undo of the move: the changed project goes back, an unchanged one stays, the move's settings go back, nothing is deleted
    u = ev(pg, """async () => { const M = WS.settings.mig18, ps = WS.projects.filter(p => M.rps[p.id]); const z = ps.find(p => !(M.touched || {})[p.id]) || ps[1] || null, a = ps.find(p => p !== z);
      // an old data copy may have every project changed during the open by an earlier one-time step (1.6 moved all to Pick): one is taken as untouched
      if (z && M.touched) delete M.touched[z.id];
      const before = Object.fromEntries(WS.projects.map(p => [p.id, arr(p.restore).map(x => x.id)])), nameA = a.name;
      a.name = nameA + ' (changed after the move)'; touch(a); await new Promise(r => setTimeout(r, 700));
      const zN = z ? arr(z.restore).length : 0, changed = JSON.parse(JSON.stringify(M.changed || {}));
      const extra = uid('p'); const q = blankProject('Made after the move'); q.id = extra; WS.projects.push(q); touch(q);
      ACTIONS['mig18-undo'](); render(); const modal = UI.modal && UI.modal.kind, mtext = (document.querySelector('.modal') || {}).innerText || '';
      const n = await mig18UndoGo(); await new Promise(r => setTimeout(r, 600));
      const a2 = WS.projects.find(p => p.id === a.id), z2 = z && WS.projects.find(p => p.id === z.id);
      const res = {modal, mtext, n, name: a2.name, nameA, aBack: arr(a2.restore).some(x => /restor|wiederher|恢复/i.test(x.label + ' ' + x.kind)), zSame: z ? arr(z2.restore).length === zN : true,
        kept: WS.projects.every(p => arr(before[p.id]).every(id => arr(p.restore).some(x => x.id === id))), extra: !!WS.projects.find(p => p.id === extra),
        settings: Object.entries(changed).map(([k, c]) => [k, JSON.stringify(WS.settings[k] === undefined ? null : WS.settings[k]) === JSON.stringify(c.from)]), undone: !!M.undone, can: mig18CanUndo()};
      WS.projects = WS.projects.filter(p => p.id !== extra); return res; }""")
    check("the move's Undo asks first and says what it cannot take back", u["modal"] == "mig18undo" and re.search(r"cannot take back|Before restoring", u["mtext"]), u["mtext"][:300])
    check("…the project changed since the move goes back to 'Before 1.8'", u["name"] == u["nameA"] and u["n"] >= 1, u)
    check("…an unchanged project stays as it is (no restore made)", u["zSame"], u)
    check("…a project made after the move stays", u["extra"], u)
    check("…the settings the move changed are set back", all(x[1] for x in u["settings"]), u["settings"])
    check("…no restore point is ever deleted", u["kept"], u)
    check("…and the Undo is gone afterwards (it is taken back once)", u["undone"] and not u["can"], u)
    ev(pg, "T18H.health()"); pg.wait_for_timeout(400)
    check("Health says the move was taken back", re.search(r"Taken back|rückgängig|撤销", text_of(pg, ".mig18-panel")) is not None, text_of(pg, ".mig18-panel"))
    ev(pg, "document.querySelectorAll('.mig18-toast').forEach(x => x.remove()); flushSaves()"); pg.wait_for_timeout(600)
    pg2_m = ev(pg, "async () => { await openWorkspace(WS.id); await new Promise(r => setTimeout(r, 500)); return {at: (WS.settings.mig18 || {}).at, undone: !!(WS.settings.mig18 || {}).undone, toast: document.querySelectorAll('.mig18-toast').length}; }")
    check("opened again, the move does not run again", pg2_m["at"] == m["at"] and pg2_m["undone"] and pg2_m["toast"] == 0, [pg2_m, m["at"]])
    close_modals(pg); ev(pg, HELP)

    print("1 Health: five rows")
    ev(pg, "T18H.health()"); pg.wait_for_timeout(1500)
    rows = ev(pg, "['fleet', 'honesty', 'economy', 'security', 'owner'].map(id => Object.assign({id}, T18H.row(id)))")
    check("five rows: my tools, honesty, economy, security, your time", all(x.get("st") for x in rows), rows)
    check("each row has a status pill with a glyph and a word", all(x["pill"] and x["pill"]["svg"] and x["pill"]["word"].strip() and x["pill"]["label"] for x in rows), [x.get("pill") for x in rows])
    check("each row says its threshold and what happens when it turns red", all("Threshold" in x["text"] and "When it turns red" in x["text"] for x in rows), [x["text"][:80] for x in rows])
    check("signals carry a glyph (✓ ✗ ○), never colour alone", all(all(s in "✓✗○" for s in x["sig"]) and x["sig"] for x in rows), [x["sig"] for x in rows])
    check("a row with no data says 'not measured yet'", any(x["st"] == "none" and "not measured yet" in x["text"] for x in rows), [(x["id"], x["st"]) for x in rows])
    check("your time has its trend (taps per day)", rows[4]["spk"], rows[4])
    st = ev(pg, "[hr18Status({measured: false, signals: [{bad: true}, {bad: true}]}), hr18Status({measured: true, signals: [{bad: false}]}), hr18Status({measured: true, signals: [{bad: true}, {bad: false}]}), hr18Status({measured: true, signals: [{bad: true}, {bad: true}]})]")
    check("states: not measured · fine · watch with one signal · act only with two", st == ["none", "ok", "watch", "act"], st)
    # counting: an AI call, the same call again (replayed = cached), a task; only numbers stored
    e0 = ev(pg, "JSON.parse(JSON.stringify(hr18Doc().ai))")
    ev(pg, """async () => { await runAI('hr18a', 'test', 'Say ok in one word.', {json: false, step: 'ask'}); await runAI('hr18b', 'test', 'Say ok in one word.', {json: false, step: 'ask'}); }""")
    e1 = ev(pg, "JSON.parse(JSON.stringify(hr18Doc().ai))")
    check("PT's AI calls are counted: calls, tasks, estimated tokens", e1["calls"] >= e0["calls"] + 2 and e1["tasks"] >= e0["tasks"] + 2 and e1["tok"] > e0["tok"], [e0, e1])
    check("…the same request again within 5 minutes counts as cached (an estimate)", e1["cached"] >= e0["cached"] + 1, [e0, e1])
    ev(pg, "HR18.dirty = true; hr18Flush()"); pg.wait_for_timeout(500)
    db = ev(pg, "window.__mockdb()")
    keys = [k for k in db if re.search(r"/ws-[^/]+/health18-\d{4}-\d\d-\d\d/tab-", k)]
    check("one counting document per day and page load", len(keys) >= 1, keys)
    def numbers_only(d):
        if set(d) - {"v", "day", "ws", "pt", "ai", "ar", "_rev", "id"}: return False
        return all(isinstance(v, (int, float)) for v in d.get("ai", {}).values()) and all(isinstance(v, int) for v in d.get("ar", {}).values())
    mine = [db[k] for k in keys if k.endswith(ev(pg, "TAB_ID"))]
    check("…holding numbers only (never prompt or answer text)", mine and numbers_only(mine[0]) and "Say ok" not in json.dumps(mine[0]), mine[:1])
    ev(pg, "render()"); pg.wait_for_timeout(300)
    er = ev(pg, "T18H.row('economy')")
    check("the economy row is measured now and says it is an estimate", er["st"] != "none" and "estimate" in er["text"], er["text"][:300])
    # approval answers: too fast = clicking through, after reading = considered, "no" = considered
    a0 = ev(pg, "JSON.parse(JSON.stringify(hr18Doc().ar))")
    ev(pg, "confirmBox('Test', 'Delete the planted thing?', 'Delete', () => {})"); pg.wait_for_timeout(120); pg.locator(".modal [data-a=confirm-yes]").click(); pg.wait_for_timeout(200)
    ev(pg, "confirmBox('Test', 'Delete the planted thing?', 'Delete', () => {})"); pg.wait_for_timeout(2700); pg.locator(".modal [data-a=confirm-yes]").click(); pg.wait_for_timeout(200)
    ev(pg, "confirmBox('Test', 'Delete the planted thing?', 'Delete', () => {})"); pg.wait_for_timeout(150); pg.locator(".modal [data-a=modal-close][data-discard]").click(); pg.wait_for_timeout(200)
    a1 = ev(pg, "JSON.parse(JSON.stringify(hr18Doc().ar))")
    check("approval answers: a click faster than reading counts as clicking through", a1["fast"] == a0["fast"] + 1, [a0, a1])
    check("…an answer after reading and a 'no' count as considered", a1["read"] == a0["read"] + 1 and a1["cancel"] == a0["cancel"] + 1, [a0, a1])
    # a red needs two signals; earlier reds are kept with how they ended
    q = ev(pg, """(() => { const q = WS.projects.find(p => !p.live && p.status !== 'archived') || WS.projects[0]; q.live = {v: '1.0', since: now()}; q.tool.versions = [{v: '1.0', url: 'https://claude.ai/artifact/TESTTOOL0000000000001', version: 'v-test-1', at: now()}]; q.tool.triggers = [{id: 'trig_test18', name: 'weekly'}]; touch(q);
      if (typeof KIT_VERSION === 'undefined') (0, eval)("var KIT_VERSION = '1.8.0'"); return q.id; })()""")
    ev(pg, "T18H.health()"); pg.wait_for_timeout(400)
    f1 = ev(pg, "T18H.row('fleet')")
    check("my tools: a live tool built with kit 1.7.0 is behind the 1.8 kit — one signal = watch", f1["st"] == "watch" and "1.7.0" in f1["text"], f1["text"][:400])
    check("…a timer tool's weekly snapshot is listed (none yet for kit 1.7.0)", re.search(r"no weekly snapshot yet", f1["text"]) is not None, f1["text"][:500])
    ev(pg, f"(() => {{ const q = WS.projects.find(p => p.id === '{q}'); q.updates.push({{id: 'up-hr18', state: 'failed', at: now()}}); render(); }})()"); pg.wait_for_timeout(300)
    f2 = ev(pg, "T18H.row('fleet')"); red = ev(pg, "HR18.log && HR18.log.reds.filter(x => x.row === 'fleet' && !x.to).length")
    check("…and failing too — two signals = act (red), written into the row's history", f2["st"] == "act" and red == 1, [f2["st"], red])
    ev(pg, f"(() => {{ const q = WS.projects.find(p => p.id === '{q}'); q.updates = q.updates.filter(u => u.id !== 'up-hr18'); render(); }})()"); pg.wait_for_timeout(300)
    f3 = ev(pg, "[T18H.row('fleet').st, HR18.log.reds.filter(x => x.row === 'fleet').map(x => ({to: !!x.to, after: x.after}))]")
    check("…back to one signal: the red ends, and the history says what came after", f3[0] == "watch" and f3[1] and f3[1][-1]["to"] and f3[1][-1]["after"] == "watch", f3)
    check("…shown on the row as earlier reds", re.search(r"Earlier reds: 1", ev(pg, "T18H.row('fleet').text")) is not None, ev(pg, "T18H.row('fleet').text")[-300:])
    hn = ev(pg, f"""(() => {{ const q = WS.projects.find(p => p.id === '{q}'); q.pick = q.pick || {{}}; q.pick.platformParts = arr(q.pick.platformParts).concat([{{part: 'planted part', status: 'documented', date: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)}}]); render(); return T18H.row('honesty'); }})()""")
    check("honesty: a platform fact 60 days old is past its 45-day budget; with facts by type PT no longer shows it as certain — one signal = watch", hn["st"] == "watch" and "planted part" in hn["text"], [hn["st"], hn["text"][:400]])
    # 1.8: for a private tool with a design the drill is a check row: listed only when the tool takes in outside text (reads, web,
    # acts outward) and due only once applied (a shared tool keeps today's behaviour). The made-up bundle's tool is private and reads
    # nothing; the real data's was shared. So the test's tool reads news from websites and the row is applied, as a person would.
    ev(pg, f"""(() => {{ const q = WS.projects.find(p => p.id === '{q}'); q.tool.home = Object.assign({{}}, q.tool.home, {{parts: str((q.tool.home || {{}}).parts) + ' reads news from websites'}});
      if (chkActive(q) && !chkShared(q)) chkSet(q, 'drill', 'apply'); render(); }})()""")
    check("the drill is on for the live tool (applied, or a shared tool)", ev(pg, f"chkGateOn(WS.projects.find(p => p.id === '{q}'), 'drill')"))
    sc = ev(pg, f"""(() => {{ const q = WS.projects.find(p => p.id === '{q}'); q.findings.push({{id: 'F-hr18', lens: 'security', severity: 'high', status: 'open', issue: 'planted', fix: '', version: q.versionNo || 0, at: now(), audit: [], reopened: 0}}); render(); return T18H.row('security'); }})()""")
    check("security: an open finding and a drill due on a live tool — act", sc["st"] == "act", sc["text"][:300])
    lines = ev(pg, "health18Lines()")
    check("the Sunday-note hook lists the rows that are not fine, one line each", {x["id"] for x in lines} >= {"fleet", "honesty", "security"} and all(x["text"].startswith("Health") for x in lines), lines)

    print("5 tool backups")
    ev(pg, f"(() => {{ openProject('{q}'); const p = curP(); UI.pgDetails = UI.pgDetails || {{}}; UI.pgDetails['pg:' + p.id + ':run'] = true; pgOpen(p, 'run'); }})()"); pg.wait_for_timeout(600)
    card = pg.locator(".pg-exp18 [data-a=exp18-open]")
    check("a live tool's Run page has 'Export tool data'", card.count() == 1)
    if card.count():
        card.click(); pg.wait_for_timeout(300)
        md = text_of(pg, ".modal")
        check("…it says how the tool's own export works and where the file goes", "Export data" in md and "Downloads" in md and "never sees" in md, md[:400])
        check("…that this tool (kit 1.7.0) gets the button with its next update, and what to do until then", "1.7.0" in md and "Claude chat" in md, md[:600])
        check("…that a timer tool also keeps a weekly snapshot", "weekly snapshot" in md, md[:600])
        check("…with a link that opens the tool", ev(pg, "(document.querySelector('.modal a[target=_blank]') || {}).href || ''").startswith("https://claude.ai/artifact/TESTTOOL"))
        pg.locator(".modal [data-a=exp18-done]").click(); pg.wait_for_timeout(300)
        check("'I saved the file' is noted and shown on the page", ev(pg, f"!!(WS.settings.exp18 || {{}})['{q}']") and "Last export" in text_of(pg, ".pg-exp18"))
    other = ev(pg, "(() => { const p = WS.projects.find(x => !x.live); if (!p) return null; openProject(p.id); UI.pgDetails = UI.pgDetails || {}; UI.pgDetails['pg:' + p.id + ':run'] = true; pgOpen(p, 'run'); return p.id; })()"); pg.wait_for_timeout(400)
    if other: check("a tool that is not live has no export card", pg.locator(".pg-exp18").count() == 0)
    ev(pg, "T18H.health()"); pg.wait_for_timeout(300)
    check("the fleet row shows when the data was last exported", "data last exported" in ev(pg, "T18H.row('fleet').text"))

    print("6 the yearly restore check")
    rc = ev(pg, "[restoreCheck18Line(), rc18State().next]")
    check("not due in the first year after the move", rc[0] is None and rc[1] > ev(pg, "WS.settings.mig18.at"), rc)
    rc2 = ev(pg, """(() => { const M = WS.settings.mig18, at = M.at; M.at = new Date(Date.now() - 400 * 86400000).toISOString(); const a = restoreCheck18Line({seen: true}), b = restoreCheck18Line(); M.at = at; return {a, b}; })()""")
    check("a year on: one line for the Sunday note, then not again until next year", rc2["a"] and rc2["a"]["action"] == "rc18-open" and "Once a year" in rc2["a"]["text"] and rc2["b"] is None, rc2)
    ev(pg, "ACTIONS['rc18-open']()"); pg.wait_for_timeout(300)
    md = text_of(pg, ".modal")
    check("the check's steps: export, import into a fresh workspace, open one tool", "Export" in md and "fresh workspace" in md and "Open one tool" in md, md[:500])
    dump = ev(pg, "JSON.stringify({app: 'prompt-translator', version: 1, exportedAt: now(), workspace: {name: WS.name, settings: WS.settings}, projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})")
    pg.wait_for_timeout(1500); n_writes = ev(pg, "window.__mockWrites || 0")
    pg.locator("#rc18-in").set_input_files({"name": "backup.json", "mimeType": "application/json", "buffer": dump.encode()}); pg.wait_for_timeout(500)
    check("a backup file is checked here: the same as this workspace", "the same as this workspace" in text_of(pg, ".modal"), text_of(pg, ".modal")[-300:])
    pg.locator("#rc18-in").set_input_files({"name": "x.json", "mimeType": "application/json", "buffer": b'{"hello": 1}'}); pg.wait_for_timeout(400)
    check("…a file that is not a PT backup is named as such", "not a PT backup" in text_of(pg, ".modal"))
    check("…and checking a file writes nothing", (ev(pg, "window.__mockWrites || 0") - n_writes) <= 1, ev(pg, "window.__mockWrites || 0") - n_writes)   # at most the 1.7.1 counter's own flush
    pg.locator(".modal [data-a=rc18-done]").click(); pg.wait_for_timeout(300)
    check("'done' is noted; the next check is a year later", ev(pg, "!!WS.settings.rc18.last && rc18State().next > new Date(Date.now() + 360 * 86400000).toISOString()"))

    print("three languages")
    for lang in ("en", "de", "zh"):
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); T18H.health()"); pg.wait_for_timeout(500)
        body = text_of(pg)
        words = {"en": ["My tools", "Honesty", "Economy", "Security", "Your time"], "de": ["Meine Tools", "Ehrlichkeit", "Verbrauch", "Sicherheit", "Deine Zeit"], "zh": ["我的工具", "诚实", "用量与成本", "安全", "你的时间"]}[lang]
        check(f"Health in {lang}: the five rows by name, no raw keys", all(w in body for w in words) and not raw_keys(body), [w for w in words if w not in body] + raw_keys(body)[:5])
        if lang == "de": check("German: no ß", "ß" not in body)
        for kind, extra in (("mig18undo", ""), ("exp18", f", pid: '{q}'"), ("rc18", ""), ("so18", "")):
            ev(pg, f"UI.modal = {{kind: '{kind}'{extra}}}; render()"); pg.wait_for_timeout(150)
            mt = text_of(pg, ".modal")
            check(f"{lang}: the {kind} screen has no raw keys" + (" and no ß" if lang == "de" else ""), mt.strip() and not raw_keys(mt) and not (lang == "de" and "ß" in mt), raw_keys(mt)[:5] or mt[:120])
        ev(pg, "UI.modal = null; render()")
    ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")
    ctx.close()

    print("2 the second owner's first day")
    hc = her_ctx(b); hp = her_page(hc)
    d1 = ev(hp, "({owner: Store.isOwner, lang: WS.settings.lang, modal: UI.modal && UI.modal.kind, text: (document.querySelector('.modal') || {}).innerText || '', items: document.querySelectorAll('.modal .so18-list li').length, sel: (document.getElementById('so18-time') || {}).value, cone: !!document.querySelector('.modal [data-a=so18-cone]'), ex: !!document.querySelector('.modal [data-a=so18-example]'), moved: Object.keys((WS.settings.mig18 || {}).rps || {}).length, prompts: (window.__allPrompts || []).length})")
    check("her own login (not the owner's), workspace in Chinese", d1["owner"] is False and d1["lang"] == "zh", d1)
    check("the first open shows one screen in Chinese: what changed in 1.8", d1["modal"] == "so18" and "欢迎使用 PT 1.8" in d1["text"] and d1["items"] == 5, d1["text"][:200])
    check("…her project moved to 1.8 with a restore point", d1["moved"] >= 1 and "迁移" in d1["text"], d1)
    check("…her Example tool, offered as 'Try it'", d1["ex"] and "示例" in d1["text"] and "试一试" in d1["text"], d1["text"][:600])
    check("…her Sunday note time (default Sunday 14:00)", d1["sel"] == "14:00" and "周报" in d1["text"], d1)
    check("…and the cone offered once for her tool (it is there in 1.8.0)", d1["cone"], d1["text"][:300])
    check("nothing on that screen called the AI", d1["prompts"] == 0, d1["prompts"])
    check("the screen has no raw keys", not raw_keys(d1["text"]), raw_keys(d1["text"]))
    hp.select_option("#so18-time", "18:00"); hp.locator(".modal [data-a=so18-done]").click(); hp.wait_for_timeout(500)
    n1 = ev(hp, "({note: note18Get(), so: WS.settings.so18, modal: UI.modal && UI.modal.kind})")
    check("Start keeps her Sunday note time (her own, set on day one)", n1["note"]["time"] == "18:00" and n1["note"]["by"] == "dayone" and n1["note"]["set"] and n1["modal"] is None, n1)
    ev(hp, "flushSaves()"); hp.wait_for_timeout(800)
    hp2 = her_page(hc)
    check("the screen is not shown again", ev(hp2, "UI.modal && UI.modal.kind") != "so18" and ev(hp2, "note18Get().time") == "18:00")
    # the Example tool: made on "Try it", from fixed text, no AI call; the cone once
    ex = ev(hp2, """async () => { const n0 = (window.__allPrompts || []).length; WS.settings.so18 = {}; so18Show(); await new Promise(r => setTimeout(r, 200));
      document.querySelector('.modal [data-a=so18-example]').click(); await new Promise(r => setTimeout(r, 600));
      const p = curP(); return {n: (window.__allPrompts || []).length - n0, ex: !!(p && p.example18), name: p && p.name, reqs: arr(p && p.requirements).length, decs: arr(p && p.decisions).length, rows: p ? rowsOf(p).length : 0, view: UI.view, again: !!WS.projects.filter(x => x.example18).length}; }""")
    check("Try it makes the Example tool and opens it: a sentence, a goal, three requirements, two decisions", ex["ex"] and ex["name"] == "示例：每周晚餐计划" and ex["reqs"] == 3 and ex["decs"] == 2 and ex["view"] == "project", ex)
    check("…without any AI call", ex["n"] == 0, ex)
    ev(hp2, "WS.settings.so18 = {}; so18Show()"); hp2.wait_for_timeout(200)
    check("a second Try it opens the same example (never two)", "打开示例" in text_of(hp2, ".modal"))
    hp2.locator(".modal [data-a=so18-example]").click(); hp2.wait_for_timeout(400)
    check("…one example only", ev(hp2, "WS.projects.filter(x => x.example18).length") == 1)
    cn = ev(hp2, """async () => { window.__cone = []; cone18Ready = () => true; cone18Rerun = (p, o) => { window.__cone.push([p.id, o.why]); return true; };
      WS.settings.so18 = {}; so18Show(); await new Promise(r => setTimeout(r, 200)); const offered = !!document.querySelector('.modal [data-a=so18-cone]'), at = WS.settings.so18.coneOffered;
      document.querySelector('.modal [data-a=so18-cone]').click(); await new Promise(r => setTimeout(r, 300));
      return {offered, at: !!at, calls: window.__cone, so: WS.settings.so18, target: (so18ConeTarget() || {}).example18}; }""")
    check("the cone is offered once on that screen when it exists, and opens for her tool (why: dayone)", cn["offered"] and cn["at"] and len(cn["calls"]) == 1 and cn["calls"][0][1] == "dayone" and cn["so"]["cone"]["opened"] and not cn["target"], cn)
    ev(hp2, "cone18Ready = () => false; flushSaves()"); hp2.wait_for_timeout(800)
    hdb = ev(hp2, "window.__mockdb()")
    hc.close()
    her_ws = [v for k, v in hdb.items() if re.fullmatch(r"data/users/user-2/ws-[^/]+", k)]
    check("her note lives in her own workspace, in her own login", her_ws and her_ws[0]["settings"].get("note18", {}).get("time") == "18:00", [w.get("settings", {}).get("note18") for w in her_ws])
    check("nothing of hers is written into another login", not [k for k in hdb if not k.startswith("data/users/user-2/") and re.search(r"note18|so18", json.dumps(hdb[k]))])
    # the owner's own login keeps its own: open as owner on the same stored data → no screen, no note of hers
    oc = b.new_context(viewport={"width": 1280, "height": 900}, color_scheme="light")
    both = dict(seed); both.update({k: v for k, v in hdb.items() if k.startswith("data/users/user-2/")})
    oc.add_init_script("if (window === window.top) window.__seed = " + json.dumps(both) + ";"); oc.add_init_script(MOCK)
    op = open_page(oc)
    on = ev(op, "({owner: Store.isOwner, note: note18Get(), so: WS.settings.so18 || null, modal: UI.modal && UI.modal.kind})")
    check("the owner's login: his own note time stays his default, her choice did not become his", on["owner"] and on["note"]["time"] == "14:00" and not on["note"]["set"] and on["so"] is None and on["modal"] != "so18", on)
    zl = ev(op, "(() => { const was = WS.settings.lang; WS.settings.lang = 'zh'; const a = so18Due(); WS.settings.lang = was; return {zh: a, en: so18Due()}; })()")
    check("decided by login and workspace language, never by a name: a Chinese workspace gets it, an English one in the owner's login not", zl["zh"] and not zl["en"], zl)
    oc.close()

    check("no page errors", not errors, errors[:5])
    b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
