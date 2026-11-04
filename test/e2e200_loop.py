"""2.0.0 Parts D and E — the morning check, prompt tests, the Improve-PT loop, metrics, the helper programs and the setup guides — on a COPY
of the real data (or the made-up bundle) with the mock runtime (made-up desktop app browser and helpers; never a real site).
Run: python3 test/e2e200_loop.py [work/backup-141 | test/fixtures/synthetic.json]
 L1 the morning check: runs once on the owner's first open of a day (not for another login, not twice), the GitHub checks (pull requests
    with what is new since yesterday, key dates, the release), the tripwires of a chosen route against what came in since the last check,
    the "Not possible yet" watch lines (PT's platform knowledge changed; a watched page changed — read through the Fetch helper), one card
    on the cockpit (Seen, Check again, the cloud guide), a Route alert through m20WatchSoon for what changed; outside the desktop app one
    line; PT creates no scheduled task.
 L2 prompt tests: up to five inputs (yours, then tests, then examples) in ONE quick-tier call, the cost on the button first; pass/fail
    against every never / must; PT's own word check fails an answer that breaks a never even when the call says it holds; no project
    rules steer the tool's answers; what is missing is said (no prompt, no rule, no input).
 L3 Improve PT: a report is kept in the workspace with status open; on a version change the ids listed fixed for it are marked
    "fixed in <version>" and the owner is told once.
 L4 metrics: questions asked, asked-twice held back, rule breaks repaired, routes, goal → decision; Settings › Metrics; never in a prompt.
 L5 helpers: Ready / Not checked yet / tools missing / Not installed / only in the desktop app (listTools only, no call); Check it's there
    (one read-only call; a code-running helper shows its script first); the route card says "Needs <program> — install guide", "ready",
    or "Excluded by your PT rule"; the Filesystem helper saves the prompt as a NEW file after a contract; CAPABILITIES-2.0.json lists
    every host server and tool PT calls.
 L6 the guides: GitHub App, connector, Dependabot-only auto-merge, cloud scheduled task, computer use, one per helper; click by click.
 three languages (no raw keys, no ß), 390 px without sideways scroll, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_idle(pg, ms=30000):
    for _ in range(ms // 100):
        if ev(pg, "!MC20.busy && !HELP20.busy && AI.running.size === 0"):
            pg.wait_for_timeout(300)
            if ev(pg, "!MC20.busy && !HELP20.busy && AI.running.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(200)
def main(pg): return ev(pg, "(document.querySelector('.main') || {}).innerText || ''")
def host(pg): return [c for c in ev(pg, "window.__mcp || []") if str(c.get("server", "")).startswith("host:")]
def raw_keys(text): return sorted(set(re.findall(r"\b(?:h20|mc20|pt20|su20|ipt20|met20)\.[a-z][a-z0-9.-]*\b", text)))
def settings(pg, tab): ev(pg, f"(() => {{ UI.modal = null; UI.view = 'settings'; UI.setTab = '{tab}'; render(); }})()"); pg.wait_for_timeout(250)
def cockpit(pg): ev(pg, "(() => { UI.modal = null; UI.view = 'cockpit'; UI.pid = null; render(); })()"); pg.wait_for_timeout(200)
def card(pg): return ev(pg, "(document.querySelector('.mc20[data-mc20=card]') || {}).innerText || ''")
NOW = "2026-11-04T07:30:00Z"
ROOTP = pathlib.Path(__file__).resolve().parent.parent

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); ctx.clock.set_system_time(NOW)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")
    check("L1 tests that do not ask for it never see the morning check (the mock keeps it off)", ev(pg, "!!window.__ptNoMorning && !(WS.settings.morning20 && WS.settings.morning20.day)"))
    pid = ev(pg, "WS.projects.filter(p => p.status !== 'archived')[0].id")
    # a project with a chosen route, a tripwire and a "Not possible yet" entry whose watch line names a page
    ev(pg, f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); const M = m20Of(p);
        const r = m20Norm({{name: 'Shared list', line: 'One list for the family', status: 'today', assume: ['Everyone has the same phone maker']}}); r.id = 'R801'; M.routes.push(r); M.chosen = 'R801';
        M.decs.push({{id: 'D801', at: '2026-11-01T10:00:00Z', route: 'R801', status: 'active', why: 'simple', trip: [{{id: 't1', text: 'we switch if ALERTME happens'}}]}});
        M.notyet.push(Object.assign(m20NormNy({{name: 'ALERTME voice add', why: 'no voice API', blocker: 'platform', watch: 'The vendor changelog https://example.org/changelog', change: 'a voice API'}}), {{id: 'N801'}}));
        touch(p); }})()""")

    # ---------- L1 the morning check ----------
    ev(pg, "window.__mcp.length = 0; window.__ptNoMorning = false; delete WS.settings.morning20")
    check("L1 due on the owner's first open of the day", ev(pg, "mc20Due()"))
    ev(pg, "openWorkspace(WS.id)"); pg.wait_for_timeout(2600); wait_idle(pg)
    ev(pg, "(() => { Store.isOwner = true; })()")
    M1 = ev(pg, "WS.settings.morning20 || {}")
    check("L1 it ran by itself once the workspace opened, for today", M1.get("day") == ev(pg, "mc20Day()") and ev(pg, "!mc20Due()"), M1)
    ks = [l["k"] for l in M1.get("lines", [])]
    check("L1 the GitHub checks: pull requests, key dates, the release", ks[:3] == ["prs", "keys", "rel"], ks)
    tx = " | ".join(l["text"] for l in M1.get("lines", []))
    check("L1 …pull requests counted, a key that runs out within 30 days named, the release found", "Open pull requests: 2" in tx and "Renew soon: tools-runner" in tx and "GitHub has the release" in tx, tx[:500])
    check("L1 …one line per project with a map", any(l["k"] == "proj" and l.get("pid") == pid for l in M1.get("lines", [])), M1.get("lines"))
    check("L1 PT creates no scheduled task", not [c for c in ev(pg, "window.__mcp") if c.get("tool") in ("create_trigger", "update_trigger")])
    cockpit(pg); c1 = card(pg)
    check("L1 one summary card on the cockpit: lines, Seen, Check again, the cloud guide", "Morning check" in c1 and "Open pull requests: 2" in c1 and ev(pg, "!!document.querySelector('.mc20 [data-a=mc20-seen]') && !!document.querySelector('.mc20 [data-a=mc20-run]') && !!document.querySelector('.mc20 [data-a=setup20-guide][data-g=cloud]')"), c1[:400])
    ev(pg, "window.__mcp.length = 0"); ev(pg, "openWorkspace(WS.id)"); pg.wait_for_timeout(2400); wait_idle(pg)
    check("L1 a second open the same day checks nothing again", not [c for c in ev(pg, "window.__mcp") if c.get("server") == "host:claude_browser"], len(ev(pg, "window.__mcp")))
    ev(pg, "(() => { Store.isOwner = true; })()")
    cockpit(pg); pg.locator(".mc20 [data-a=mc20-seen]").click(); pg.wait_for_timeout(200)
    check("L1 Seen hides the card for today", not card(pg) and ev(pg, "WS.settings.morning20.seen === true"))

    # the next check: a new pull request, a new fact, platform knowledge changed, a watched page changed (Fetch helper)
    ev(pg, """(() => { window.__hostServers = {'host:fetch': {tools: ['fetch']}}; window.__pageV = 1;
        window.__helperAnswer = (server, tool, input) => server === 'host:fetch' ? 'Contents of ' + input.url + ':\\nChangelog version ' + window.__pageV : null; })()""")
    ev(pg, "helper20Detect()"); wait_idle(pg)
    check("L5 the Fetch helper lists (listTools) as Ready", ev(pg, "HELP20.st.fetch") == "ready", ev(pg, "HELP20.st"))
    ev(pg, "(() => { const M = WS.settings.morning20; M.kp = 'kp-old'; })()")
    ev(pg, "mc20Run()"); wait_idle(pg)
    hc = [c for c in host(pg) if c["server"] == "host:fetch"]
    check("L1 a watch line with a page: read through the Fetch helper (its first reading is kept)", len(hc) == 1 and hc[0]["tool"] == "fetch" and hc[0]["input"]["url"] == "https://example.org/changelog" and ev(pg, f"!!WS.settings.morning20.watch['{pid}:N801']"), hc)
    al0 = ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).alerts.length")
    check("L1 platform knowledge changed: the not-yet line goes to the Route alert (m20WatchSoon → one quick call → an alert)", al0 >= 1 and "PT's platform knowledge changed" in " ".join(l["text"] for l in ev(pg, "WS.settings.morning20.lines")), [al0, ev(pg, "WS.settings.morning20.lines")])
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pulls'] += '\\nFix the guard\\n#31·by firnsmith was opened 1 hour ago'; window.__pageV = 2")
    ev(pg, "(() => { WS.settings.morning20.at = new Date(Date.now() - 1000).toISOString(); })()")
    ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); factsAdd(p, {{kind: 'fact', words: 'Grandma got a different phone ALERTME', src: {{k: 'you'}}}}); }})()"); wait_idle(pg)
    al1 = ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).alerts.length")
    ev(pg, "window.__calls = []; mc20Run()"); wait_idle(pg)
    L2 = ev(pg, "WS.settings.morning20.lines"); tx2 = " | ".join(l["text"] for l in L2)
    check("L1 a pull request that is new since the last check is named", "new: #31 Fix the guard" in tx2 and any(l["k"] == "prs" and l["st"] == "new" for l in L2), tx2[:400])
    check("L1 a watched page that changed: named on the card and as a map event", "changed: ALERTME voice add" in tx2 and ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).events.some(e => e.kind === 'watch')"), tx2[:600])
    check("L1 the tripwires are checked against what came in since the last check (the new fact) through m20WatchSoon", "tripwires checked · new items: 2" in tx2 and ev(pg, "window.__calls.filter(x => x === 'map-alert').length") >= 1, [tx2[:600], ev(pg, "window.__calls")])
    check("L1 …a Route alert is never raised twice for the same item", ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).alerts.length") >= al1 and len({(a["ref"], a["on"]) for a in ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).alerts")}) == ev(pg, f"m20Read(WS.projects.find(x => x.id === '{pid}')).alerts.length"))
    ev(pg, "window.__mcp.length = 0; window.__browser.fail = 'server_not_connected'; mc20Run()"); wait_idle(pg)
    L3 = ev(pg, "WS.settings.morning20.lines"); bc = [c for c in ev(pg, "window.__mcp") if c.get("server") == "host:claude_browser"]
    check("L1 outside the desktop app: one line, one try, the project lines still come", L3[0]["k"] == "app" and "Claude desktop app" in L3[0]["text"] and len(bc) == 1 and any(l["k"] == "proj" for l in L3), [L3[:2], len(bc)])
    ev(pg, "window.__browser.fail = ''")
    ev(pg, "(() => { Store.isOwner = false; delete WS.settings.morning20; render(); })()")
    check("L1 another login: not due, no card", not ev(pg, "mc20Due()") and not ev(pg, "mc20CardHTML()"))
    ev(pg, "(() => { Store.isOwner = true; render(); })()")

    # ---------- L2 prompt tests ----------
    ev(pg, f"""(() => {{ openProject('{pid}'); UI.home = false; const p = curP();
        p.pkg = Object.assign({{}}, p.pkg, {{sections: [{{id: 'S1', title: 'Instructions', dest: 'project', content: 'You help the family keep one shopping list.'}}]}});
        factsAdd(p, {{kind: 'never', words: 'We never talk about prices', src: {{k: 'you'}}}}); factsAdd(p, {{kind: 'must', words: 'Answers must be in plain words', src: {{k: 'you'}}}});
        for (const e of factsActive(p, FACT_RULES)) if (!/prices|plain words/.test(e.words)) e.status = 'withdrawn';   /* this copy: only the two rules of the test */
        p.tests = []; if (p.goal) p.goal.examples = [];
        const X = pt20Of(p); X.inputs = []; touch(p); factsOpen(p); }})()"""); wait_idle(pg)
    ev(pg, "(() => { document.getElementById('pt20-in').value = 'Add milk to the list'; })()"); pg.locator("form[data-form=pt20-add] button[type=submit]").click(); pg.wait_for_timeout(200)
    for extra in ("Remove the eggs", "What is on the list?"):
        ev(pg, f"(() => {{ document.getElementById('pt20-in').value = {json.dumps(extra)}; }})()"); pg.locator("form[data-form=pt20-add] button[type=submit]").click(); pg.wait_for_timeout(150)
    panel = ev(pg, "(document.querySelector('.pt20') || {}).innerText || ''")
    n_in = ev(pg, "pt20Inputs(curP()).length")
    check("L2 the facts book has Prompt tests: your input first, then tests and examples (at most five)", "Prompt tests" in panel and ev(pg, "pt20Inputs(curP())[0].text") == "Add milk to the list" and 1 <= n_in <= 5, [panel[:300], n_in])
    check("L2 …the cost is on the button before the tap", f"Run {n_in} prompt tests" in panel and "Costs one quick message" in panel, panel[:400])
    ev(pg, "window.__allPrompts = []; window.__calls = []")
    pg.locator(".pt20 [data-a=pt20-run]").click(); wait_idle(pg)
    pr = ev(pg, "(window.__allPrompts || []).filter(x => x.includes('[[task:ptest-run]]'))")
    check("L2 one call for all inputs", len(pr) == 1 and ev(pg, "window.__calls.filter(x => x === 'ptest-run').length") == 1, len(pr))
    check("L2 …it carries the prompt, the inputs and every never / must as the rules to check", pr and "You help the family keep one shopping list." in pr[0] and "Add milk to the list" in pr[0] and "We never talk about prices" in pr[0] and "Answers must be in plain words" in pr[0], pr[0][-800:] if pr else "")
    check("L2 …no rules channel steers the tool's answers (no <your_rules> block)", pr and "<your_rules>" not in pr[0])
    R = ev(pg, "pt20Read(curP()).runs[0]")
    check("L2 all kept: pass for each input, shown with the version", R and R["pass"] == R["n"] == n_in and f"{n_in} of {n_in} passed" in ev(pg, "document.querySelector('.pt20').innerText"), R)
    ev(pg, """window.__mockOverride = (task, prompt) => { if (task !== 'ptest-run') return null; const ins = JSON.parse(/<inputs>([\\s\\S]*?)<\\/inputs>/.exec(prompt)[1]), rules = JSON.parse(/<rules>([\\s\\S]*?)<\\/rules>/.exec(prompt)[1]);
        return {results: ins.map(x => ({i: x.i, answer: x.i === 0 ? 'Let us talk about the prices of milk: CHF 2 this week.' : 'Done.', rules: rules.map(r => ({id: r.id, holds: !(x.i === 1 && r.kind === 'MUST'), why: x.i === 1 && r.kind === 'MUST' ? 'too technical' : 'kept'}))}))}; }""")
    pg.locator(".pt20 [data-a=pt20-run]").click(); wait_idle(pg)
    R = ev(pg, "pt20Read(curP()).runs[0]"); txt = ev(pg, "document.querySelector('.pt20').innerText")
    check("L2 PT's word check fails an answer that breaks a never even when the call says it holds", R["items"][0]["pass"] is False and any(r["code"] for r in R["items"][0]["rules"]) and "Breaks your never: We never talk about prices · PT's word check found it" in txt, [R["items"][0], txt[:600]])
    if n_in > 1:
        check("L2 a must the call says is missed fails", R["items"][1]["pass"] is False and "Misses your must: Answers must be in plain words" in txt, R["items"][1])
    check("L2 the runs are a record (at most five, never part of an Undo)", len(ev(pg, "pt20Read(curP()).runs")) == 2 and ev(pg, "DIFF_SKIP.has('ptest20')"))
    ev(pg, "window.__mockOverride = null")
    ev(pg, "(() => { const p = curP(); p._pk = p.pkg.sections; p.pkg.sections = []; render(); })()")
    check("L2 no prompt yet: says to build it first, no button", "Build the prompt first" in ev(pg, "document.querySelector('.pt20').innerText") and not ev(pg, "!!document.querySelector('.pt20 [data-a=pt20-run]')"))
    ev(pg, "(() => { const p = curP(); p.pkg.sections = p._pk; delete p._pk; render(); })()")

    # ---------- L3 Improve PT ----------
    ev(pg, "(() => { ACTIONS['tool-report']({dataset: {k: 'header'}}); })()"); pg.wait_for_timeout(200)
    ev(pg, "(() => { document.getElementById('tr-in').value = 'The Next button jumps to an answered question'; })()")
    pg.locator("form[data-form=tool-report] button[type=submit]").first.click(); pg.wait_for_timeout(300)
    L = ev(pg, "ipt20List()"); rid = ev(pg, "WS.toolfb[0].id")
    check("L3 a report is kept in the workspace settings with status open", L and L[0]["id"] == rid and L[0]["status"] == "open" and "Next button" in L[0]["text"] and L[0]["v"] == ev(pg, "PT_VERSION"), L[:1])
    settings(pg, "health"); h = ev(pg, "(document.querySelector('.ipt20') || {}).innerText || ''")
    check("L3 Settings › PT health lists it as open", "Your Improve PT reports" in h and "open" in h and "Next button" in h, h[:300])
    ev(pg, f"(() => {{ IMPROVE_FIXED[PT_VERSION] = ['{rid}']; WS.settings.ipt20v = '1.9.9'; }})()")
    n = ev(pg, "ipt20Version()")
    check("L3 on a version change the listed report is marked fixed in this version", n == 1 and ev(pg, f"ipt20List().find(x => x.id === '{rid}').status") == "fixed" and ev(pg, f"ipt20List().find(x => x.id === '{rid}').fixed") == ev(pg, "PT_VERSION"))
    cockpit(pg)
    check("L3 …and the owner is told once (a card)", "fixes 1 of your Improve PT reports" in main(pg))
    check("L3 …a second open says nothing again", ev(pg, "ipt20Version()") == 0)
    pg.locator("[data-a=ipt20-ok]").first.click(); pg.wait_for_timeout(200)
    check("L3 …Got it removes the card", "fixes 1 of your" not in main(pg))
    settings(pg, "health")
    check("L3 the list shows fixed in <version>", "fixed in " + ev(pg, "PT_VERSION") in ev(pg, "document.querySelector('.ipt20').innerText"))
    ev(pg, f"delete IMPROVE_FIXED[PT_VERSION]")

    # ---------- L4 metrics ----------
    ev(pg, f"(() => {{ delete WS.settings.met20; openProject('{pid}'); UI.home = false; render(); }})()")
    m = ev(pg, """(async () => { const p = curP();
        const e = factsAdd(p, {kind: 'fact', words: 'The list lives on the fridge tablet', src: {k: 'you'}});
        const items = [{id: 'q1', q: 'The list lives on the fridge tablet'}, {id: 'q2', q: 'Which colour should the buttons have'}, {id: 'q3', q: 'How many people shop each week'}];
        await askOnceRun(p, items, {where: 'pick', drop: () => {}});
        await factsGuardHits(p, factsActive(p, ['never']), {line: 'Let us talk about the prices of milk in two shops'});
        return WS.settings.met20[p.id]; })()"""); wait_idle(pg)
    m = ev(pg, "WS.settings.met20[curP().id]")
    check("L4 questions asked and asked-twice held back are counted (one was known)", m.get("twice") == 1 and m.get("asked") == 2, m)
    check("L4 a rule break caught and repaired is counted", m.get("repaired", 0) >= 1, m)
    ev(pg, "(() => { const p = curP(); m20MetOf(p.id).goalAt = '2026-11-01T09:30:00Z'; m20Of(p).decs.find(d => d.id === 'D801').at = '2026-11-01T10:00:00Z'; saveWs(); })()")
    settings(pg, "metrics"); mt = ev(pg, f"(document.querySelector('.met20 tr[data-pid=\"{pid}\"]') || {{}}).innerText || ''")
    check("L4 Settings › Metrics: the row shows asked, held back, repaired, routes, goal → decision", re.search(r"\b2\b.*\b1\b", mt) and "30 min" in mt and str(ev(pg, "m20Read(curP()).routes.length")) in mt, mt)
    check("L4 …and says the numbers are never sent anywhere", "never sent anywhere" in main(pg))
    allp = " ".join(ev(pg, "window.__allPrompts || []"))
    check("L4 no prompt ever carries the metrics", "met20" not in allp and '"twice"' not in allp and "goalAt" not in allp)

    # ---------- L5 helpers ----------
    ev(pg, """(() => { window.__mcp.length = 0; HELP20.st = {}; HELP20.note = {};
        window.__hostServers = {'host:filesystem': {tools: ['list_allowed_directories', 'list_directory', 'write_file', 'read_text_file']}, 'host:git': {tools: ['git_log']}, 'host:fetch': {tools: ['fetch'], live: false}};
        window.__helperAnswer = (server, tool, input) => server === 'host:filesystem' ? (tool === 'list_allowed_directories' ? 'Allowed directories:\\n/Users/me/Documents/PT' : tool === 'list_directory' ? '[FILE] notes.md\\n[FILE] ' + window.__pfile : 'Successfully wrote to ' + input.path) : null; })()""")
    ev(pg, f"window.__pfile = (curP().name.replace(/[^\\p{{L}}\\p{{N}} _-]+/gu, '').trim().replace(/\\s+/g, '-') || 'prompt').slice(0, 60) + '-v' + (curP().versionNo || 0) + '.md'")
    ev(pg, "helper20Detect()"); wait_idle(pg); settings(pg, "setup20"); wait_idle(pg)
    st = ev(pg, "Object.fromEntries([...document.querySelectorAll('.su20-t tr[data-helper]')].map(r => [r.dataset.helper, r.dataset.st]))")
    check("L5 Setup lists one program per kind of job with its state from listTools: ready / not checked yet / tools missing / not installed", st == {"files": "ready", "git": "old", "fetch": "unchecked", "blender": "missing"}, st)
    check("L5 …listing called no helper tool", not host(pg), host(pg))
    tx5 = main(pg)
    check("L5 …names what PT never makes helpers for, and what 2.0 leaves out", "Never helpers for: Calendar, Contacts, Music, Photos, sorting or drafting e-mail or Slack." in tx5 and "terminal, databases" in tx5, tx5[:800])
    pg.locator(".su20-t tr[data-helper=files] [data-a=su20-check]").click(); wait_idle(pg)
    hc = host(pg)
    check("L5 Check it's there: one read-only call (list_allowed_directories), the folder shown", [(c["server"], c["tool"]) for c in hc] == [("host:filesystem", "list_allowed_directories")] and "/Users/me/Documents/PT" in main(pg), hc)
    ev(pg, "window.__hostServers['host:blender'] = {tools: ['execute_blender_code']}; window.__mcp.length = 0"); ev(pg, "helper20Detect()"); wait_idle(pg)
    pg.locator(".su20-t tr[data-helper=blender] [data-a=su20-check]").click(); pg.wait_for_timeout(400)
    mod = ev(pg, "(document.querySelector('.modal') || {}).innerText || ''")
    check("L5 a helper whose only tool runs code: its read-only script is shown first, nothing runs before yes", "print(len(bpy.data.objects))" in mod and not host(pg), [mod[:300], host(pg)])
    ev(pg, "(() => { const m = UI.modal; if (m && m.cb) { UI.modal = null; m.cb(); } })()"); wait_idle(pg)
    hc = host(pg)
    check("L5 …after yes: one call with exactly that script", len(hc) == 1 and hc[0]["tool"] == "execute_blender_code" and hc[0]["input"].get("code", "").startswith("import bpy"), hc)
    check("L5 the guard: a tool not declared for a helper is refused before any call", ev(pg, "(async () => { try{ await helper20Call('files', 'read_text_file', {path: '/etc/hosts'}); return 'ran'; }catch(e){ return e.code; } })()") == "hands_guard")
    ev(pg, "(() => { HANDS.mcp = null; window.claude.__use = window.claude.use; })()")
    ev(pg, "(() => { const u = handsApi; handsApi = async () => null; helper20Detect().then(() => { handsApi = u; }); })()"); wait_idle(pg)
    check("L5 outside the desktop app: only in the desktop app", all(v == "app" for v in ev(pg, "HELP20.st").values()), ev(pg, "HELP20.st"))
    ev(pg, "HANDS.mcp = undefined"); ev(pg, "helper20Detect()"); wait_idle(pg)
    # the route card
    cards = ev(pg, f"""(() => {{ openProject('{pid}'); const p = curP(), M = m20Of(p), out = {{}};
        for (const [k, h] of Object.entries({{fetch: {{name: 'Fetch helper', does: 'reads the vendor web pages'}}, files: {{name: 'Files', does: 'saves files in a folder'}}, cal: {{name: 'Calendar sync', does: 'adds to the calendar'}}, other: {{name: 'Robot arm', does: 'moves things'}}}})){{
          const r = m20Norm({{name: 'Route ' + k, line: 'x', helper: h, status: 'helper'}}); r.id = 'R7' + k; M.routes.push(r); out[k] = m20CardHTML(p, r.id); M.routes = M.routes.filter(x => x.id !== r.id); }}
        return out; }})()""")
    check("L5 the route card: a helper not ready says Needs <program> with the install guide", 'data-su20="needs"' in cards["fetch"] and "Needs Fetch on your Mac" in cards["fetch"] and 'data-g="h-fetch"' in cards["fetch"], cards["fetch"][-400:])
    check("L5 …a ready helper says so", 'data-su20="ready"' in cards["files"] and "Filesystem is ready" in cards["files"], cards["files"][-300:])
    check("L5 …an excluded category is named, not offered", 'data-su20="out"' in cards["cal"] and "Excluded by your PT rule" in cards["cal"], cards["cal"][-300:])
    check("L5 …a helper PT has not declared says a small update adds it", 'data-su20="none"' in cards["other"], cards["other"][-300:])
    # save the prompt as a new file (Filesystem)
    ev(pg, "window.__mcp.length = 0; factsOpen(curP())"); pg.wait_for_timeout(300)
    pg.locator(".pt20 [data-a=su20-save]").click(); wait_idle(pg)
    mod = ev(pg, "(document.querySelector('.modal') || {}).innerText || ''"); want = ev(pg, "'/Users/me/Documents/PT/' + window.__pfile.replace(/\\.md$/, '-2.md')")
    check("L5 Save the prompt: the contract first (what, where, undo), a new name because the file exists, nothing written yet", want in mod and "never overwrites" in mod and [c["tool"] for c in host(pg)] == ["list_allowed_directories", "list_directory"], [mod[:400], [c["tool"] for c in host(pg)]])
    ev(pg, "(() => { const m = UI.modal; if (m && m.cb) { UI.modal = null; m.cb(); } })()"); wait_idle(pg)
    w = [c for c in host(pg) if c["tool"] == "write_file"]
    check("L5 …after yes: one write of the package to the new path", len(w) == 1 and w[0]["input"]["path"] == want and "You help the family" in w[0]["input"]["content"], w)
    # git line in the morning check
    ev(pg, """(() => { window.__hostServers['host:git'] = {tools: ['git_status']}; WS.settings.helpers20 = {repo: '/Users/me/code/pt'};
        const a0 = window.__helperAnswer; window.__helperAnswer = (s, tool, input) => s === 'host:git' ? 'Repository status:\\nOn branch main\\n\\tmodified:   src/app.js\\n\\tmodified:   README.md' : a0(s, tool, input); })()""")
    ev(pg, "helper20Detect()"); wait_idle(pg); ev(pg, "mc20Run()"); wait_idle(pg)
    gl = [l for l in ev(pg, "WS.settings.morning20.lines") if l["k"] == "git"]
    check("L5 the Git helper: the morning check names changes not committed yet in your folder", gl and "changes not committed yet: 2" in gl[0]["text"], gl)
    # the capability list for the publish manifest
    CAP = json.loads((ROOTP / "CAPABILITIES-2.0.json").read_text())
    S = {s["server"]: s["tools"] for s in CAP["mcp"]["servers"]}
    H = ev(pg, "HELPERS20.map(h => [h.server, h.tools])")
    check("L5 CAPABILITIES-2.0.json lists every helper with exactly the tools PT calls", all(S.get(sv) == tl for sv, tl in H), [S, H])
    check("L5 …and the app's browser with the hands' tools (form_input added)", S.get("host:claude_browser") == ev(pg, "H20_TOOLS.slice()") and set(ev(pg, "HANDS_TOOLS.slice()")) <= set(S.get("host:claude_browser", [])), S.get("host:claude_browser"))
    check("L5 …and keeps the existing entries", S.get("Claude Code Remote") == ["fire_trigger", "list_triggers", "update_trigger", "create_trigger"] and CAP.get("sample") == {"images": True} and len(CAP["db"]["rules"]) == 3)

    # ---------- L6 guides ----------
    settings(pg, "setup20")
    G = ev(pg, "[...document.querySelectorAll('.su20-g')].map(d => [d.dataset.g, d.querySelectorAll('.su20-steps li').length])")
    check("L6 guides: GitHub App, connector, auto-merge, cloud task, computer use, one per helper — click by click", [g for g, _ in G] == ["app", "connector", "automerge", "cloud", "computer", "h-files", "h-git", "h-fetch", "h-blender"] and all(n >= 5 for _, n in G), G)
    gt = ev(pg, "[...document.querySelectorAll('.su20-g')].map(d => d.textContent).join(' ')")
    check("L6 …auto-merge for Dependabot only, every other PR waits for the owner", "dependabot[bot]" in gt and "every other pull request still waits" in gt)
    check("L6 …the cloud task changes nothing and PT creates none", "Change nothing, open nothing, merge nothing." in gt and "PT creates no task itself" in gt)
    check("L6 …each helper guide shows its config entry and how to remove it", gt.count('"mcpServers"') >= 4 and gt.count("To remove it") == 4 and '"command": "npx"' in gt)
    cockpit(pg); ev(pg, "(() => { WS.settings.morning20 = Object.assign({}, WS.settings.morning20, {seen: false, day: mc20Day()}); render(); })()")
    pg.locator(".mc20 [data-a=setup20-guide][data-g=cloud]").click(); pg.wait_for_timeout(300)
    check("L6 the morning card's cloud link opens that guide in Settings › Setup", ev(pg, "UI.setTab") == "setup20" and ev(pg, "document.getElementById('su20-g-cloud').open"))

    # ---------- L7 (hunt 5, cause 93) an automatic step closes its own action ----------
    r7 = ev(pg, f"""(async () => {{ openProject('{pid}'); const p = curP(); const e = eng(p); e.trial.runs = []; e.trial.cases = [{{id: 'C1', input: 'Add milk', expect: 'milk is on the list'}}];
        actClose(p.id); const n0 = arr(p.acts).length; await aiTrialRun(liveP(p)); const q = liveP(p);
        return {{open: ACT.open.has(q.id), last: (arr(q.acts).slice(-1)[0] || {{}}).label, grew: arr(q.acts).length > n0 || arr(q.acts).length === 25}}; }})()"""); wait_idle(pg)
    check("L7 the trial (an automatic step) closes its own action when it ends, so the next click's Undo never takes it back", r7["open"] is False and r7["last"] == ev(pg, "t('eng.trial.run')") and r7["grew"], r7)
    src7 = (ROOTP / "src" / "app.js").read_text()
    check("L7 …and every automatic step autoEngine starts is closed when it ends (frontier scan, engine suggestion, trial)", src7.count("own(() => frontierJob(p))") == 1 and src7.count("own(() => aiEngineSuggest(p))") == 1 and src7.count("own(() => aiTrialRun(p))") == 1 and ".finally(() => actClose(p.id))" in src7)

    # ---------- languages, phone width ----------
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); render(); }})()")
        for tab in ("setup20", "metrics", "health"):
            settings(pg, tab); tl = main(pg)
            check(f"{lang}: Settings › {tab} in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl, raw_keys(tl))
        cockpit(pg); ev(pg, "(() => { WS.settings.morning20.seen = false; render(); })()"); tl = card(pg)
        check(f"{lang}: the morning card in the language", tl and not raw_keys(tl) and "ß" not in tl and "Morning check" not in tl, tl[:200])
        ev(pg, f"(() => {{ openProject('{pid}'); factsOpen(curP()); }})()"); pg.wait_for_timeout(250); tl = ev(pg, "document.querySelector('.pt20').innerText")
        check(f"{lang}: prompt tests in the language", not raw_keys(tl) and "ß" not in tl and "Prompt tests" not in tl, tl[:200])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844})
    for tab in ("setup20", "metrics", "health"):
        settings(pg, tab)
        sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
        check(f"390 px: Settings › {tab} has no sideways scroll", sx <= 2, sx)
    cockpit(pg)
    sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
    check("390 px: the cockpit with the morning card has no sideways scroll", sx <= 2 and card(pg), sx)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
