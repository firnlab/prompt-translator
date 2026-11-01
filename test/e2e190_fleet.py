"""1.9 fleet: when a kit changes, update all of your tools with one click ("GO kit x.y") — on a COPY of the real data (or the
made-up bundle) with the mock runtime. Run: python3 test/e2e190_fleet.py [work/backup-141 | test/fixtures/synthetic.json]
Covers:
 1 the line and the button: Health › My tools and Settings › General (the kit defaults) say "n of your tools are behind kit 1.8.0"
   with one button; a tool with nothing to republish and another person's tool are named; a tool already on the kit is not;
   the row's "when it turns red" names the kit run; nothing starts by itself (also not when the workspace opens again).
 2 the put-live card: what is republished in place one after another, acceptance lines per tool, every previous version stays
   restorable, stops at the first problem, the cost as an estimate, other people's tools "they publish it themselves", the undo
   clause (restores / keeps / cannot know); Start is not focused; Cancel of the card starts nothing.
 3 the run: one tool at a time, only your own tools; each the update job with the kit, its acceptance lines, its pages and the
   previous versions; a restore point and an act before each tool; four states with the time each took; the Inbox line; the run is
   stored in the workspace — leaving the page is fine (the running job is watched again on the next open, the run goes on).
 4 green = verified and the live check passed twice in a row: the new kit and page version are stamped; red stops the run: the tool
   keeps its previous version live, the rest wait (no job), the Inbox and the Sunday note say which tool and why; one green only is
   red; Continue (the same card) tries it again; Cancel keeps what is done; a stored run goes on after a reopen.
 5 other people's tools (the second owner's workspace kept in this login, a tool marked as someone else's): PT prepares the new
   version (the brief with the new kit) and lists it — never republished.
 6 a preview copy: no button, a clear line, no run, no job (also not from a stored run).
 three languages (no raw keys, German without ß), phone width without sideways scroll, no page errors."""
import json, sys, pathlib, re, time
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def until(pg, js, ms=25000):
    try: pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
RAW = r"\bfleet\.[a-z][a-z0-9.]*\b"
MU = "(() => { window.__mockUpdate = (j, res) => FL.ok(j, res); })()"   # a bare arrow function would be called by evaluate

HELP = """window.FL = {
  mk(name, o = {}){ const p = normalizeProject(blankProject(name)); p.live = {v: '1.0', since: '2026-10-01T10:00:00.000Z'};
    if (o.page){ p.tool.artifacts = [o.page]; p.tool.versions = [{url: o.page, version: 'v-' + p.id + '-1', v: '1.0', at: '2026-10-01T10:00:00.000Z'}]; }
    if (o.trig) p.tool.triggers = [{id: 'trig_fl_' + p.id, name: 'weekly'}];
    p.tests = Array.from({length: o.tests || 0}, (_, i) => ({id: 'T' + (i + 1), category: 'happy', title: 'Line ' + (i + 1), input: 'input ' + (i + 1), criteria: ['works ' + (i + 1)], reqIds: [], st: 'assumed'}));
    if (o.shared) p.sharedFrom = 'someone else';
    if (o.kit) p.tool.kitVersion = o.kit;
    WS.projects.push(p); touch(p); return p.id; },
  P(id){ return WS.projects.find(p => p.id === id); },
  health(){ UI.modal = null; UI.view = 'settings'; UI.setTab = 'health'; render(); },
  card(where){ const e = document.querySelector('.fl19[data-fl19="' + where + '"]'); return e ? {text: e.innerText, go: e.querySelector('[data-a=fl19-go]') ? e.querySelector('[data-a=fl19-go]').innerText : '', cont: !!e.querySelector('[data-a=fl19-continue]'), cancel: !!e.querySelector('[data-a=fl19-cancel]'), copy: e.querySelectorAll('[data-a=fl19-copy]').length,
    items: [...e.querySelectorAll('.fl19-it')].map(x => ({pid: x.dataset.pid, st: x.dataset.st, text: x.innerText}))} : null; },
  run(){ return JSON.parse(JSON.stringify(WS.settings.fleetRun || null)); },
  jobs(pids){ return WS.jobs.filter(j => j.kind === 'update' && (!pids || pids.includes(j.projectId))).map(j => ({id: j.id, pid: j.projectId, status: j.status, fleet: (j.inputs || {}).fleet || '', created: j.createdAt, fin: j.finishedAt || '', applied: !!j.applied})); },
  green(j, extra){ return Object.assign({verified: true, lost: [], gaps: [], fossils: [], removed: [], issues: [], tests: {passed: 2, total: 2}, parts: {present: 1, total: 1}, data: 'kept', path: 'in-place', triggers: [], summary: 'ok',
    smoke: {runs: [{ok: true, at: now(), note: 'opens'}, {ok: true, at: now(), note: 'opens'}]}, versions: arr((j.inputs || {}).pages).map(u => ({url: u, version: 'v-' + j.id}))}, extra || {}); },
  finish(jobId, extra){ const path = jobsColl() + '/' + jobId, d = window.__mockdb(), j = d[path]; if (!j) return false;
    Object.assign(j, {status: 'done', startedAt: now(), finishedAt: now(), steps: [{name: 'step 1', status: 'done'}], result: FL.green(j, extra)}); return true; },
  fresh(){ for (const [id, un] of JOB_WATCH){ try{ un(); }catch(e){} } JOB_WATCH.clear(); FL19.busy = false; FL19.starting = null; },   // what a new page has: no watchers, nothing in memory
  ok(j, res){ return Object.assign(res, {versions: arr((j.inputs || {}).pages).map(u => ({url: u, version: 'v-' + j.id}))}); }
};"""

def setup(pg):
    """six tools: A, B (pages, acceptance lines), C (a scheduled task, no lines), D (nothing to republish), E (someone else's), F (already on the kit);
    every live tool of the data copy is put on the current kit, so only the test's tools are behind"""
    ev(pg, HELP)
    ids = ev(pg, """(() => { for (const p of hr18Live()){ p.tool.kitVersion = hr18KitNow(); touch(p); }
      const o = {A: FL.mk('Fleet A page', {page: 'https://claude.ai/artifact/FLEETAAAAAAAAAAAAAAAAA', tests: 2}), B: FL.mk('Fleet B page', {page: 'https://claude.ai/artifact/FLEETBBBBBBBBBBBBBBBBB', tests: 1}),
        C: FL.mk('Fleet C timer', {trig: true}), D: FL.mk('Fleet D project'), E: FL.mk('Fleet E shared', {page: 'https://claude.ai/artifact/FLEETEEEEEEEEEEEEEEEEE', tests: 1, shared: true}),
        F: FL.mk('Fleet F current', {page: 'https://claude.ai/artifact/FLEETFFFFFFFFFFFFFFFFF', kit: '1.8.0'})};
      window.__mockUpdate = (j, res) => FL.ok(j, res); render(); return o; })()""")
    return ids

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, scheme="light"); pg = open_page(ctx); pg.wait_for_timeout(400)
    I = setup(pg); A, B, C, D, E, F = (I[k] for k in "ABCDEF")
    ev(pg, "FL.health()"); pg.wait_for_timeout(500)
    kit = ev(pg, "hr18KitNow()")

    print("1 the line and the button")
    check("the kit PT builds with is 1.8.0 (the 1.8 kit rules; no part defines KIT_VERSION)", kit == "1.8.0", kit)
    h = ev(pg, "FL.card('health')")
    check("Health › My tools: 'n of your tools are behind kit 1.8.0' (A, B, C and D are yours and behind)", h and "4 of your tools are behind kit 1.8.0" in h["text"], h)
    check("…with one button 'Update my tools to kit 1.8.0'", h and h["go"].strip() == "Update my tools to kit 1.8.0", h and h["go"])
    check("…the tool with nothing to republish is named (it gets the kit with its next release)", h and re.search(r"Nothing to republish[^\n]*Fleet D project", h["text"]) is not None, h and h["text"])
    check("…another person's tool is named: they publish it themselves", h and re.search(r"Someone else's: Fleet E shared[^\n]*they publish it themselves", h["text"]) is not None, h and h["text"])
    check("…a tool already on the kit is not behind", h and "Fleet F current" not in h["text"], h and h["text"])
    row = ev(pg, "(() => { const r = document.querySelector('.hr18-row[data-hr18=fleet]'); return r ? r.innerText : ''; })()")
    check("the row's 'when it turns red' names the kit run (no more 'comes with 1.9')", "Update my tools to kit 1.8.0" in row and "comes with 1.9" not in row, row[-500:])
    ev(pg, "UI.view = 'settings'; UI.setTab = 'general'; render()"); pg.wait_for_timeout(300)
    s = ev(pg, "FL.card('settings')")
    check("Settings › General, under the kit defaults: the same line and the same button", s and "4 of your tools are behind kit 1.8.0" in s["text"] and s["go"].strip() == "Update my tools to kit 1.8.0"
          and ev(pg, "(() => { const k = [...document.querySelectorAll('h3')].find(x => x.textContent === t('set.kit')); const c = document.querySelector('.fl19[data-fl19=settings]'); return !!k && !!c && !!(k.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); })()"), s)
    check("nothing started by itself: no update job, no run", ev(pg, "FL.jobs().length") == 0 and ev(pg, "FL.run()") is None, ev(pg, "[FL.jobs(), FL.run()]"))
    sp = ev(pg, """(() => { const mk = (rels, o) => { const p = normalizeProject(blankProject('Stamp test')); p.live = {v: '1.0', since: now()}; p.releases = rels; Object.assign(p.tool, o || {}); return p; };
      const page = 'https://claude.ai/artifact/STAMPAAAAAAAAAAAAAAAAA', rep = {check: {versions: [{url: page, version: 'v-s-1'}]}};
      const a = mk([{v: '1.0', at: now()}], {artifacts: [page]}); a.report = rep; kitRecordVersions(a, '1.0');
      const b = mk([{v: '1.1', at: now()}, {v: '1.0', at: '2026-09-01T10:00:00.000Z'}], {artifacts: [page], versions: [{url: page, version: 'v-s-0', at: '2026-09-01T10:00:00.000Z'}]}); b.report = rep; kitRecordVersions(b, '1.1');
      const c = mk([{v: '1.2', at: now()}, {v: '1.0', at: '2026-09-01T10:00:00.000Z'}], {kitVersion: '1.7.0'}); kitRecordVersions(c, '1.2');
      const d = mk([{v: '1.0', at: new Date(Date.now() + 1000).toISOString()}], {artifacts: [page], versions: [{url: page, version: 'v-s-2', at: now()}]});
      const e = mk([{v: '1.0', at: '2026-09-01T10:00:00.000Z'}], {artifacts: [page], versions: [{url: page, version: 'v-s-3', at: now()}]});
      return {a: [a.tool.kitVersion, a.tool.versions.map(x => x.kitVersion)], b: [b.tool.kitVersion || '', hr18KitOf(b)], c: c.tool.kitVersion, d: hr18KitOf(d), e: hr18KitOf(e), brief: buildBriefText(a).includes('Firnlab kit 1.8.0: write "kitVersion": "1.8.0"')}; })()""")
    check("a first release stamps the kit it was built with (the tool and its page version)", sp["a"] == ["1.8.0", ["1.8.0"]], sp)
    check("…a later release of a page tool keeps its kit (it updates only what changed)", sp["b"] == ["", "1.7.0"], sp)
    check("…a tool with nothing to republish gets the current kit with each release", sp["c"] == "1.8.0", sp)
    check("…a tool first released after the move to 1.8 counts as kit 1.8.0; one released before it as 1.7.0", sp["d"] == "1.8.0" and sp["e"] == "1.7.0", sp)
    check("…and the build brief names the kit for tool.json and the build report", sp["brief"], sp)
    ev(pg, "flushSaves()"); pg.wait_for_timeout(300)
    ev(pg, "(async () => { FL.fresh(); await openWorkspace(WS.id); })()"); pg.wait_for_selector(".app", timeout=20000); pg.wait_for_timeout(2500); ev(pg, HELP); ev(pg, MU)
    check("…also not when the workspace opens again (never automatic)", ev(pg, "FL.jobs().length") == 0 and ev(pg, "FL.run()") is None, ev(pg, "[FL.jobs(), FL.run()]"))

    print("2 the put-live card")
    close_modals(pg); ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-go]").click(); pg.wait_for_timeout(400)
    md = ev(pg, "({kind: UI.modal && UI.modal.kind, text: (document.querySelector('.modal') || {}).innerText || '', focus: document.activeElement ? (document.activeElement.dataset || {}).a || document.activeElement.tagName : ''})")
    check("the button opens one put-live card (nothing started yet)", md["kind"] == "fl19go" and ev(pg, "FL.jobs().length") == 0 and ev(pg, "FL.run()") is None, md["kind"])
    check("…republishes in place, one after another: A, B, C (same link, kit 1.8.0)", re.search(r"Republishes in place, one after another \(same link, kit 1\.8\.0\): Fleet A page, Fleet B page, Fleet C timer", md["text"]) is not None, md["text"][:900])
    check("…each with its acceptance lines and the live check twice in a row (a tool without lines says so)", "Fleet A page: 2 acceptance lines" in md["text"] and "Fleet C timer: no acceptance lines, only the live check" in md["text"] and "twice in a row" in md["text"], md["text"][:900])
    check("…each previous version stays restorable", "Each previous version stays restorable" in md["text"])
    check("…stops at the first problem (previous version stays live, the rest wait)", "Stops at the first problem" in md["text"] and "keeps its previous version live" in md["text"])
    check("…the cost as an estimate", re.search(r"Cost \(estimate\): about \d+ units", md["text"]) is not None and "CHF 0 extra" in md["text"], md["text"][-700:])
    check("…other people's tools: not republished, they publish it themselves; nothing-to-republish left out", "Not republished: Fleet E shared" in md["text"] and "they publish it themselves" in md["text"] and "Left out: Fleet D project" in md["text"])
    check("…the undo clause in three columns: restores / keeps / cannot know", all(x in md["text"] for x in ("Restores", "Keeps", "Cannot know")))
    check("…no auto-focus on the risky button", md["focus"] != "fl19-start", md["focus"])
    pg.locator(".modal [data-a=modal-close][data-discard]").click(); pg.wait_for_timeout(300)
    check("Cancel of the card starts nothing", ev(pg, "FL.jobs().length") == 0 and ev(pg, "FL.run()") is None and not ev(pg, "UI.modal"))

    print("3 the run: one tool at a time, leave the page, it goes on")
    fires0 = ev(pg, "window.__mcp.filter(x => x.tool === 'fire_trigger').length")
    ev(pg, "window.__mockHold = true")
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-go]").click(); pg.wait_for_timeout(300)
    pg.locator(".modal [data-a=fl19-start]").click()
    until(pg, "() => (WS.settings.fleetRun || {tools: []}).tools.some(x => x.state === 'running' && x.jobId)")
    pg.wait_for_timeout(800)
    R = ev(pg, "FL.run()")
    check("Start = the GO: the run is stored in the workspace with the kit", R and R["kit"] == "1.8.0" and R["startedAt"] and ev(pg, "!!WS.settings.fleetRun"), R)
    check("…only your own tools with something to republish, private first then by name: A, B, C", R and [x["pid"] for x in R["tools"]] == [A, B, C], R and [x["name"] for x in R["tools"]])
    check("…one at a time: A runs, B and C wait", R and [x["state"] for x in R["tools"]] == ["running", "waiting", "waiting"], R and [x["state"] for x in R["tools"]])
    J = ev(pg, "FL.jobs()")
    check("…exactly one update job, A's, sent to the runner", len(J) == 1 and J[0]["pid"] == A and J[0]["status"] == "sent" and ev(pg, "window.__mcp.filter(x => x.tool === 'fire_trigger').length") == fires0 + 1, J)
    jin = ev(pg, f"(() => {{ const j = WS.jobs.find(x => x.id === '{J[0]['id'] if J else ''}'); return j ? {{title: j.title, i: j.inputs, s: j.instructions}} : null; }})()")
    check("…the job: the kit (from 1.7.0 to 1.8.0), the run, the acceptance lines, the pages and the previous versions", jin and jin["i"]["fleet"] == R["id"] and jin["i"]["kit"] == {"from": "1.7.0", "to": "1.8.0"} and len(jin["i"]["acceptance"]) == 2
          and jin["i"]["pages"] == ["https://claude.ai/artifact/FLEETAAAAAAAAAAAAAAAAA"] and jin["i"]["previous"] and "kit 1.7.0 → 1.8.0" in jin["title"], jin and {k: jin["i"].get(k) for k in ("fleet", "kit", "pages", "previous")})
    check("…its instructions: rebuild with the brief, acceptance lines, republish in place, live check twice in a row, previous version back on a red", jin and all(x in jin["s"] for x in ("Firnlab kit 1.8.0", "inputs.acceptance", "Republish in place", "twice in a row", "republish the previous version", '"rolledBack": true')), jin and jin["s"][-1500:])
    a = ev(pg, f"(() => {{ const p = FL.P('{A}'); const rp = arr(p.restore).slice(-1)[0] || {{}}; const u = arr(p.updates).slice(-1)[0] || {{}}; return {{rp: [rp.kind, rp.label, rp.id === FL.run().tools[0].rp], u: [u.fleet, u.kit, u.state, u.job, u.from, u.to], log: arr(p.activity).some(x => /Update to kit 1\\.8\\.0 started/.test(x.text)), brief: p.brief && p.brief.kit}}; }})()")
    check("…a restore point 'Before kit 1.8.0' before the tool starts (the run keeps its id)", a["rp"] == ["fleet", "Before kit 1.8.0", True], a)
    check("…the update is in the tool's record (the run, the kit, the job), the version number stays", a["u"][:4] == [R["id"], "1.8.0", "running", J[0]["id"] if J else ""] and a["u"][4] == a["u"][5] == "1.0", a)
    check("…a line in the tool's log; the stored brief carries the kit", a["log"] and a["brief"] == "1.8.0", a)
    ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    h = ev(pg, "FL.card('health')")
    check("the list: four states with words — running, waiting, waiting — and the time it runs", h and [x["st"] for x in h["items"]][:3] == ["running", "waiting", "waiting"] and "running" in h["items"][0]["text"] and re.search(r"running for (under 1 min|\d+ min)", h["items"][0]["text"]) and "waiting" in h["items"][1]["text"], h and h["items"])
    check("…with Cancel while it runs, and the run's start time", h and h["cancel"] and "started" in h["text"] and "so far" in h["text"], h and h["text"][:400])
    ev(pg, "go('cockpit')"); pg.wait_for_timeout(400)
    ib = ev(pg, "(() => { const e = document.querySelector('.fl19-line'); return e ? {st: e.dataset.st, text: e.innerText} : null; })()")
    check("the Inbox has one line: which tool runs, 1 of 3", ib and ib["st"] == "running" and "Fleet A page" in ib["text"] and "1 of 3" in ib["text"], ib)
    # leave the page: everything in memory is gone (no watchers); the job finishes meanwhile; the next open picks it up
    ev(pg, "flushSaves()"); pg.wait_for_timeout(600)
    ev(pg, "(async () => { FL.fresh(); await openWorkspace(WS.id); })()"); pg.wait_for_selector(".app", timeout=20000); pg.wait_for_timeout(1500); ev(pg, HELP); ev(pg, MU)
    check("opened again: the run is still there, A still runs and nothing new started", ev(pg, "FL.run().tools.map(x => x.state)") == ["running", "waiting", "waiting"] and len(ev(pg, "FL.jobs()")) == 1, ev(pg, "[FL.run().tools.map(x => x.state), FL.jobs()]"))
    ev(pg, f"window.__mockHold = false; FL.finish('{J[0]['id']}')")
    done = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.doneAt; }", 40000)
    R = ev(pg, "FL.run()"); J = ev(pg, "FL.jobs()")
    check("…A's result was picked up by the next open and the run went on: A, B, C done", done and [x["state"] for x in R["tools"]] == ["done", "done", "done"], R and [(x["name"], x["state"], x["note"]) for x in R["tools"]])
    ordered = len(J) == 3 and all(J[i]["fin"] and J[i]["fin"] <= J[i - 1]["created"] for i in range(1, 3))   # WS.jobs: newest first
    check("…one at a time: each job started only after the one before had finished", ordered, J)
    st = ev(pg, f"[{json.dumps([A, B, C])}].flat().map(id => {{ const p = FL.P(id); return {{kit: p.tool.kitVersion, kh: hr18KitOf(p), v: p.live.v, since: p.live.since, vers: arr(p.tool.versions).filter(x => x.kitVersion === '1.8.0').map(x => x.version), u: arr(p.updates).slice(-1)[0].state}}; }})")
    check("green = verified and two live checks in a row: each tool is now on kit 1.8.0", all(x["kit"] == "1.8.0" and x["kh"] == "1.8.0" and x["u"] == "verified" for x in st), st)
    check("…the new page version is recorded with its kit (the page's restore point)", st[0]["vers"] == ["v-" + J[2]["id"]] and st[1]["vers"] == ["v-" + J[1]["id"]], [st[0]["vers"], st[1]["vers"], [j["id"] for j in J]])
    check("…the tool's version number stays; it went live again now", all(x["v"] == "1.0" and x["since"] > "2026-10-02" for x in st), st)
    check("…each tool's log says it is on kit 1.8.0 now", ev(pg, f"[{json.dumps([A, B, C])}].flat().every(id => arr(FL.P(id).activity).some(x => /Now on kit 1\\.8\\.0/.test(x.text)))"))
    evs = ev(pg, f"""(async () => {{ const p = FL.P('{A}'); await new Promise(r => setTimeout(r, 900)); const L = await rowsEnsure(p); await L.chain; const rp = FL.run().tools[0].rp;
      return L.list.filter(e => e.type === 'taken' && String(e.src).startsWith('ver:https://claude.ai/artifact/FLEETAAAAAAAAAAAAAAAAA@v-job')).map(e => ({{cause: e.cause, rp: e.rp === rp, by: e.by, hash: !!e.hash}})); }})()""")
    check("…the new page version is an event in the tool's decision record: the kit run, the restore point before it", evs and evs[-1]["cause"] == "fleet" and evs[-1]["rp"] and evs[-1]["hash"], evs)
    check("…other people's and nothing-to-republish tools never got a job", ev(pg, f"FL.jobs(['{D}', '{E}', '{F}']).length") == 0)
    pe = ev(pg, f"(() => {{ const R = FL.run(), o = R.others.find(x => x.pid === '{E}'), p = FL.P('{E}'), d = window.__mockdb(), k = Object.keys(d).find(k => k.endsWith('/briefs/' + (p.brief || {{}}).id)); return {{o, kit: p.tool.kitVersion || '', brief: k ? String(d[k].text || '').includes('Firnlab kit 1.8.0') : false, log: arr(p.activity).some(x => /they publish it themselves/.test(x.text))}}; }})()")
    check("another person's tool: the new version is prepared (the brief with kit 1.8.0 stored), listed, never republished", pe["o"] and pe["o"]["at"] and pe["brief"] and pe["log"] and pe["kit"] == "", pe)
    ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    h = ev(pg, "FL.card('health')")
    check("Health after the run: 'Kit 1.8.0: 3 of 3 done', the prepared tool with 'they publish it themselves' and a Copy button", h and "Kit 1.8.0: 3 of 3 done" in h["text"] and re.search(r"Fleet E shared[^\n]*they publish it themselves", h["text"]) and h["copy"] == 1, h and h["text"])
    check("…only D is still yours and behind; no button for it (nothing to republish)", h and "1 of your tools is behind kit 1.8.0" in h["text"] and "Update my tools" not in h["go"], h and [h["text"][:300], h["go"]])
    nt = ev(pg, "(async () => { const d = await wk18Build('2099-01-04', Date.now() + 60000); return d ? d.fleet : null; })()")
    check("the Sunday note: one line for the tools now on kit 1.8.0", nt and any(x["k"] == "done" and "Fleet A page" in x["text"] and "Fleet C timer" in x["text"] for x in nt), nt)

    print("4 a red stops the run; one green is not enough; Continue; Cancel keeps what is done")
    ev(pg, f"""(() => {{ for (const id of {json.dumps([A, B, C])}) FL.P(id).tool.kitVersion = '1.7.0';
      window.__mockUpdate = (j, res) => j.projectId === '{B}' ? Object.assign(res, {{verified: false, issues: ['planted: the main path does not open'], rolledBack: true, smoke: {{runs: [{{ok: false, note: 'a blank page'}}]}}}}) : FL.ok(j, res); render(); }})()""")
    liveB = ev(pg, f"FL.P('{B}').live")
    ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-go]").click(); pg.wait_for_timeout(300); pg.locator(".modal [data-a=fl19-start]").click()
    stopped = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.stoppedAt; }", 40000); pg.wait_for_timeout(1200)
    R = ev(pg, "FL.run()")
    check("B's red stops the run: A done, B needs you, C waits", stopped and [x["state"] for x in R["tools"]] == ["done", "needs", "waiting"], R and [(x["name"], x["state"]) for x in R["tools"]])
    check("…why, in the run and on B: the check's own words, and that the previous version was put back", "planted: the main path does not open" in R["reason"] and "previous version was put back" in R["tools"][1]["note"], R and R["reason"])
    check("…C waits: no job was made for it", not [j for j in ev(pg, f"FL.jobs(['{C}'])") if j["fleet"] == R["id"]])
    pb = ev(pg, f"(() => {{ const p = FL.P('{B}'); return {{live: p.live, kit: p.tool.kitVersion, u: arr(p.updates).slice(-1)[0].state, log: arr(p.activity).some(x => /stopped/.test(x.text) && /previous version stays live/.test(x.text))}}; }})()")
    check("…B keeps its previous version live and its kit; its update is 'not verified'; its log says so", pb["live"] == liveB and pb["kit"] == "1.7.0" and pb["u"] == "notverified" and pb["log"], [pb, liveB])
    h = ev(pg, "FL.card('health')")
    check("Health: 'Stopped at Fleet B page: …' with Continue and Cancel; B's line says why", h and "Stopped at Fleet B page" in h["text"] and h["cont"] and h["cancel"] and any(x["st"] == "needs" and "planted" in x["text"] for x in h["items"]), h and h["text"][:600])
    ev(pg, "go('cockpit')"); pg.wait_for_timeout(400)
    ib = ev(pg, "(() => { const e = document.querySelector('.fl19-line'); return e ? {st: e.dataset.st, text: e.innerText} : null; })()")
    check("the Inbox line says which tool and why, and what waits", ib and ib["st"] == "needs" and "Fleet B page" in ib["text"] and "planted" in ib["text"] and "Waiting: Fleet C timer" in ib["text"], ib)
    nt = ev(pg, "(async () => { const d = await wk18Build('2099-01-11', Date.now() + 60000); return d ? {fleet: d.fleet, html: wk18NoteHTML(d)} : null; })()")
    check("the Sunday note says which tool and why, and that it still waits for you (in the part that waits for you)", nt and any(x["k"] == "stop" and "Fleet B page" in x["text"] and "planted" in x["text"] and "still waits for you" in x["text"] for x in nt["fleet"])
          and re.search(r'data-sec="wait"[\s\S]*?Fleet B page', nt["html"]) is not None, nt and nt["fleet"])
    fv = ev(pg, """(() => { const j = (runs, o) => ({status: 'done', result: Object.assign({verified: true, smoke: {runs: runs.map(ok => ({ok, note: ok ? 'fine' : 'broken'}))}}, o || {})});
      return [fl19Verdict(j([true, true])).green, fl19Verdict(j([true])).green, fl19Verdict(j([true, false])).green, fl19Verdict(j([false, true, true])).green, fl19Verdict(j([true, true], {verified: false})).green,
        fl19Verdict({status: 'failed', error: 'x'}).green, fl19Verdict({status: 'notsent', error: 'x'}).green, fl19Verdict(j([true, true], {verified: false, tests: {passed: 1, total: 2}})).why, fl19Verdict(j([true])).why]; })()""")
    check("two greens in a row: [ok, ok] green · [ok] red · [ok, fail] red · [fail, ok, ok] green · not verified, failed, not sent red", fv[:7] == [True, False, False, True, False, False, False], fv)
    check("…a red names the acceptance lines that failed, or that the live check passed only once", "acceptance lines: 1 of 2 passed" in fv[7] and "did not pass twice in a row" in fv[8], fv[7:])
    # Continue with B green only once: still red; then fixed: the run goes on
    ev(pg, f"(() => {{ window.__mockUpdate = (j, res) => j.projectId === '{B}' ? Object.assign(FL.ok(j, res), {{smoke: {{runs: [{{ok: true, note: 'opens'}}]}}}}) : FL.ok(j, res); }})()")
    ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-continue]").click(); pg.wait_for_timeout(300)
    mt = ev(pg, "({kind: UI.modal && UI.modal.kind, text: (document.querySelector('.modal') || {}).innerText || ''})")
    check("Continue opens the same card for what is left: B again, then C", mt["kind"] == "fl19go" and "starts again with Fleet B page" in mt["text"] and "Fleet C timer" in mt["text"] and "Fleet A page" not in mt["text"].split("Restores")[0], mt["text"][:500])
    n0 = len(ev(pg, f"FL.jobs(['{B}'])"))
    pg.locator(".modal [data-a=fl19-continue-go]").click()
    until(pg, f"() => {{ const R = WS.settings.fleetRun; return !!R && !!R.stoppedAt && WS.jobs.filter(j => j.kind === 'update' && j.projectId === '{B}').length > {n0}; }}", 40000); pg.wait_for_timeout(1200)
    R = ev(pg, "FL.run()")
    check("…B passed its live check only once: red again, C still waits", [x["state"] for x in R["tools"]] == ["done", "needs", "waiting"] and "did not pass twice in a row" in R["reason"] and not [j for j in ev(pg, f"FL.jobs(['{C}'])") if j["fleet"] == R["id"]], [R["reason"], [x["state"] for x in R["tools"]]])
    ev(pg, MU)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-continue]").click(); pg.wait_for_timeout(300); pg.locator(".modal [data-a=fl19-continue-go]").click()
    done = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.doneAt; }", 40000)
    R = ev(pg, "FL.run()")
    check("…fixed: Continue goes on, B and C done; both stops stay in the run's history", done and [x["state"] for x in R["tools"]] == ["done", "done", "done"] and len(R["stops"]) == 2 and not R["stoppedAt"], R and [R["stops"], [x["state"] for x in R["tools"]]])
    # Cancel keeps what is done
    ev(pg, f"(() => {{ for (const id of {json.dumps([A, B, C])}) FL.P(id).tool.kitVersion = '1.7.0'; window.__mockHold = true; render(); }})()")
    ev(pg, "FL.health()"); pg.wait_for_timeout(300)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-go]").click(); pg.wait_for_timeout(300); pg.locator(".modal [data-a=fl19-start]").click()
    until(pg, "() => (WS.settings.fleetRun || {tools: []}).tools.some(x => x.state === 'running' && x.jobId)"); pg.wait_for_timeout(500)
    ev(pg, "FL.health()"); pg.wait_for_timeout(200)
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-cancel]").click(); pg.wait_for_timeout(400)
    R = ev(pg, "FL.run()"); h = ev(pg, "FL.card('health')")
    check("Cancel while A runs: A finishes, nothing else starts (said on the card)", R["cancelledAt"] and not R["doneAt"] and "the tool that is running finishes" in h["text"], [R["cancelledAt"], R["doneAt"], h["text"][:300]])
    jA = [x for x in R["tools"] if x["pid"] == A][0]["jobId"]
    ev(pg, f"window.__mockHold = false; FL.finish('{jA}')")
    until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.doneAt; }", 30000); pg.wait_for_timeout(1500)
    R = ev(pg, "FL.run()")
    check("…what is done stays done: A on kit 1.8.0; B and C never started (no job)", [x["state"] for x in R["tools"]] == ["done", "waiting", "waiting"] and ev(pg, f"FL.P('{A}').tool.kitVersion") == "1.8.0"
          and ev(pg, f"[FL.P('{B}').tool.kitVersion, FL.P('{C}').tool.kitVersion]") == ["1.7.0", "1.7.0"] and not [j for j in ev(pg, f"FL.jobs(['{B}', '{C}'])") if j["fleet"] == R["id"]], R and [(x["name"], x["state"]) for x in R["tools"]])
    ev(pg, "FL.health()"); pg.wait_for_timeout(300); h = ev(pg, "FL.card('health')")
    check("…the card says so and offers a new run for what is still behind", h and "what was done stays done" in h["text"] and h["go"].strip() == "Update my tools to kit 1.8.0", h and [h["text"][:300], h["go"]])
    # a stored run goes on after a reopen: B was green, C had not started yet when the page closed
    ev(pg, f"""(() => {{ const R = {{v: 1, id: 'fl-resume', kit: '1.8.0', startedAt: now(), by: 'owner', tools: [{{pid: '{B}', name: 'Fleet B page', from: '1.7.0', state: 'done', jobId: '', up: '', at: now(), end: now(), note: '', tries: 1}},
      {{pid: '{C}', name: 'Fleet C timer', from: '1.7.0', state: 'running', jobId: '', up: '', at: now(), end: '', note: '', tries: 1}}], others: [], nothing: [], est: 160, stoppedAt: '', reason: '', stops: [], cancelledAt: '', doneAt: ''}};
      WS.settings.fleetPast = arr(WS.settings.fleetPast).concat([WS.settings.fleetRun]); WS.settings.fleetRun = R; saveWs(); flushSaves(); }})()""")
    pg.wait_for_timeout(600)
    ev(pg, "(async () => { FL.fresh(); await openWorkspace(WS.id); })()"); pg.wait_for_selector(".app", timeout=20000); ev(pg, HELP); ev(pg, MU)
    done = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && R.id === 'fl-resume' && !!R.doneAt; }", 30000)
    R = ev(pg, "FL.run()")
    check("a stored run goes on after the next open: C (cut off before its job was made) starts once and gets done", done and [x["state"] for x in R["tools"]] == ["done", "done"] and len([j for j in ev(pg, f"FL.jobs(['{C}'])") if j["fleet"] == "fl-resume"]) == 1, R and [(x["name"], x["state"], x["note"]) for x in R["tools"]])
    nb = len(ev(pg, "FL.jobs()"))
    ev(pg, "(async () => { FL.fresh(); await openWorkspace(WS.id); })()"); pg.wait_for_selector(".app", timeout=20000); pg.wait_for_timeout(2500); ev(pg, HELP)
    check("a finished run never starts again by itself", len(ev(pg, "FL.jobs()")) == nb and ev(pg, "FL.run().id") == "fl-resume", [nb, len(ev(pg, "FL.jobs()"))])

    print("5 other people's tools: the second owner's workspace kept in this login")
    ev(pg, f"(() => {{ for (const id of {json.dumps([A, B])}) FL.P(id).tool.kitVersion = '1.7.0'; WS.settings.kit = Object.assign({{}}, WS.settings.kit, {{second: true}}); FL.health(); }})()"); pg.wait_for_timeout(300)
    h = ev(pg, "FL.card('health')")
    check("in her workspace every tool is someone else's: no 'Update my tools', only 'Prepare the new versions'", h and "Update my tools" not in h["go"] and h["go"].strip() == "Prepare the new versions for kit 1.8.0" and "Someone else's" in h["text"], h and [h["go"], h["text"][:400]])
    nj = len(ev(pg, "FL.jobs()"))
    pg.locator(".fl19[data-fl19=health] [data-a=fl19-go]").click(); pg.wait_for_timeout(300)
    mt = ev(pg, "(document.querySelector('.modal') || {}).innerText || ''")
    check("…the card republishes nothing; they publish it themselves", "Republishes" not in mt and "they publish it themselves" in mt and "Fleet A page" in mt, mt[:500])
    pg.locator(".modal [data-a=fl19-start]").click()
    until(pg, "() => { const R = WS.settings.fleetRun; return !!R && R.id !== 'fl-resume' && !!R.doneAt; }", 20000); pg.wait_for_timeout(500)
    R = ev(pg, "FL.run()")
    check("…prepared for their owners (A, B and the others), no update job, nothing republished", R and not R["tools"] and {A, B} <= {o["pid"] for o in R["others"]} and all(o["at"] for o in R["others"]) and len(ev(pg, "FL.jobs()")) == nj
          and ev(pg, f"[FL.P('{A}').tool.kitVersion, FL.P('{B}').tool.kitVersion]") == ["1.7.0", "1.7.0"], R and [R["tools"], [o["name"] for o in R["others"]]])
    ev(pg, "(() => { delete WS.settings.kit.second; render(); })()")
    check("the tool marked as someone else's never got an update job in any run", ev(pg, f"FL.jobs(['{E}']).length") == 0)

    print("languages, phone width")
    for lang, probe in (("de", "Bausatz"), ("zh", "模板")):
        ev(pg, f"(() => {{ WS.settings.lang = '{lang}'; applySettings(); FL.health(); }})()"); pg.wait_for_timeout(300)
        c = ev(pg, "FL.card('health')")
        ev(pg, "ACTIONS['fl19-go']()"); pg.wait_for_timeout(200)
        mt = ev(pg, "(document.querySelector('.modal') || {}).innerText || ''"); close_modals(pg)
        txt = (c or {}).get("text", "") + mt
        check(f"{lang}: the card and the put-live card in {lang}, no raw keys" + (", no ß" if lang == "de" else ""), c and probe in txt and not re.findall(RAW, txt) and (lang != "de" or "ß" not in txt), [re.findall(RAW, txt), txt[:300]])
    ev(pg, "(() => { WS.settings.lang = 'en'; applySettings(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); ev(pg, "FL.health()"); pg.wait_for_timeout(500)
    sw = ev(pg, "[document.documentElement.scrollWidth, window.innerWidth, !!document.querySelector('.fl19[data-fl19=health]')]")
    check("phone width: the card is there and nothing scrolls sideways", sw[2] and sw[0] <= sw[1] + 1, sw)
    pg.set_viewport_size({"width": 1440, "height": 950})
    ctx.close()

    print("6 a preview copy")
    prev = html.replace("const PT_PREVIEW = false;", "const PT_PREVIEW = true;")
    assert "const PT_PREVIEW = true;" in prev
    PV = PAGE.replace(".html", "-preview.html")
    (ROOT / "test" / PV).write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + prev + "</body></html>")
    U0 = U; U = U.replace(PAGE, PV)
    ctx = new_ctx(b, scheme="light"); pg = open_page(ctx); pg.wait_for_timeout(400); U = U0
    I = setup(pg); ev(pg, "FL.health()"); pg.wait_for_timeout(400)
    h = ev(pg, "FL.card('health')")
    check("the preview: the line says a preview never updates real tools, and there is no button", ev(pg, "PT_PREVIEW") is True and h and "A preview copy never updates your real tools" in h["text"] and not h["go"], h)
    r = ev(pg, "(async () => { ACTIONS['fl19-go'](); const m = UI.modal && UI.modal.kind; const x = await fl19Start('start'); return {m, x: !!x, run: FL.run(), jobs: FL.jobs().length}; })()")
    check("…neither the action nor a direct start makes a run or a job", not r["m"] and not r["x"] and r["run"] is None and r["jobs"] == 0, r)
    r = ev(pg, f"""(async () => {{ WS.settings.fleetRun = {{v: 1, id: 'fl-pv', kit: '1.8.0', startedAt: now(), tools: [{{pid: '{I["A"]}', name: 'Fleet A page', from: '1.7.0', state: 'waiting', jobId: '', at: '', end: '', note: '', tries: 0}}], others: [], nothing: [], stops: [], stoppedAt: '', cancelledAt: '', doneAt: ''}};
      fl19Resume(); await fl19Next(); await new Promise(r => setTimeout(r, 1500)); return {{st: FL.run().tools[0].state, jobs: FL.jobs().length}}; }})()""")
    check("…a stored run does not go on in a preview copy", r == {"st": "waiting", "jobs": 0}, r)
    check("no page errors in the whole run", not errors, errors[:4])
    ctx.close(); b.close()
for f in (PAGE, PAGE.replace(".html", "-preview.html")):
    try: (ROOT / "test" / f).unlink()
    except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
