"""2.2.0 research import: what PT's tools get (src/v220_tools.js), on the made-up data with the mock runtime. Never touches real data.
 1 the new failure-proof rules exist with strings in three languages and apply on their trigger words, not on an unrelated tool
 2 SHOULD 12: a tool used by named people gets the accessibility floor by default; a tool only for me does not
 3 kit lines: channel + Good / Not good for pages and scheduled tools, event bridge for scheduled tools, vendor set + Claude Code for web apps
 4 COULD 12: the map's Buy angle asks for a managed service and for hiring someone, with cost and date
 5 SHOULD 6: a missed run is computed from the schedule for any cadence (weekly missed Monday → shown Tuesday; daily ok; paused never)
 6 SHOULD 2: the drift number falls when quality falls over three weeks; reports wait as candidate tests until ticked or dismissed
 + three languages, no page errors."""
import json, sys, pathlib
BK = sys.argv[1] if len(sys.argv) > 1 else "test/fixtures/synthetic.json"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
NEW = ["guard", "backoff", "fallback", "resume", "contract", "reason", "models", "pdata", "memory", "retrieve", "sandbox", "providers", "handoff"]
MK = """(o) => { newProject(o.name, {raw: o.raw}); const p = curP(); p.northStar.goal = o.raw; p.audience = Object.assign({customers: false, eu: false}, o.aud || {});
  p.arch.components = [{id: 'c1', name: 'Main part', kind: 'ai', role: o.raw, inputs: o.raw, outputs: o.raw, reason: '', reqIds: []}];
  if (o.home) p.tool = Object.assign(p.tool || {}, {home: {where: o.home, parts: ''}}); touch(p); render(); return p.id; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(400)

    print("1 the new rules")
    check("the 13 new rules are in the rule list", ev(pg, "(ids) => ids.every(id => PROOF_IDS.includes(id) && PROOF_MODES.some(m => m.id === id && m.ai.length > 80))", NEW), "")
    check("each has a name and a line in three languages", ev(pg, "(ids) => ids.every(id => ['pf.n.', 'pf.d.'].every(k => Array.isArray(STR[k + id]) && STR[k + id].every(Boolean)))", NEW), "")
    mail = ev(pg, MK, {"name": "Mail answerer 22", "raw": "Reads my email inbox every morning, sends replies to customers through the Gmail api and exports a csv for the next step"})
    mail_r = ev(pg, "(id) => proofModes(WS.projects.find(p => p.id === id)).map(m => m.id)", mail)
    check("a mail tool that runs every morning, sends and exports gets guard, backoff, fallback, resume and contract", all(x in mail_r for x in ["guard", "backoff", "fallback", "resume", "contract"]), mail_r)
    notes = ev(pg, MK, {"name": "Notes tidier 22", "raw": "Tidies the notes I paste into a clean outline"})
    notes_r = ev(pg, "(id) => proofModes(WS.projects.find(p => p.id === id)).map(m => m.id)", notes)
    check("a tool that only tidies my pasted notes gets none of guard, backoff, fallback, resume, contract, handoff", not any(x in notes_r for x in ["guard", "backoff", "fallback", "resume", "contract", "handoff"]), notes_r)
    docs = ev(pg, MK, {"name": "Handbook answers 22", "raw": "Answers questions from our handbook and documents archive, users upload their own files"})
    docs_r = ev(pg, "(id) => proofModes(WS.projects.find(p => p.id === id)).map(m => m.id)", docs)
    check("a document search tool gets retrieve; user uploads get sandbox", "retrieve" in docs_r and "sandbox" in docs_r, docs_r)
    check("the rules reach the design prompt as text", ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return proofModes(p).filter(m => m.id === 'guard').every(m => m.ai.includes('input check')); }", mail), "")

    print("2 the accessibility floor for tools named people use")
    sh = ev(pg, MK, {"name": "For the two of us 22", "raw": "A shared shopping list page for me and my wife", "home": "artifact page"})
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); p.goal20 = {v: 1, f: {whom: 'me and my wife'}, by: {whom: 'you'}}; touch(p); }", sh)
    fl = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return {floor: chkFloor(p, 'ux'), others: toolUsedByOthers(p), shared: chkShared(p), legal: chkFloor(p, 'legal')}; }", sh)
    check("a tool for me and my wife gets the accessibility floor without anyone applying it", fl["floor"] and fl["others"] and not fl["shared"], fl)
    check("…but not the other shared-tool gates (it is not a customer tool)", not fl["legal"], fl)
    me = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); p.goal20 = {v: 1, f: {whom: 'me'}, by: {whom: 'you'}}; return chkFloor(p, 'ux'); }", notes)
    check("a tool only for me does not", not me, me)

    print("3 kit lines in the brief")
    page = ev(pg, MK, {"name": "Board page 22", "raw": "A page that shows my reading list board", "home": "artifact page"})
    kp = ev(pg, "(id) => kitBriefPart(WS.projects.find(x => x.id === id))", page)
    check("a page tool's brief has the channel pick and the Good / Not good control", "How people reach the tool" in kp and "Good / Not good inside the tool" in kp, kp[-400:])
    k2 = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return {applies: kit2Applies(p), text: kitBriefPart(p)}; }", mail)
    check("a scheduled tool's brief has the event bridge with its two options", not k2["applies"] or ("Waking on an event" in k2["text"] and "Zapier or n8n" in k2["text"]), k2["text"][-300:])
    web = ev(pg, MK, {"name": "Shop 22", "raw": "A web app online shop where customers pay with a subscription and log in", "aud": {"customers": True}, "home": "a web app on its own domain"})
    kw = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return {applies: kit3Applies(p), text: kitBriefPart(p)}; }", web)
    check("a web app's brief has the standard vendor set and Claude Code with deploy on merge", kw["applies"] and "Standard vendor set" in kw["text"] and "deploys from GitHub automatically on merge" in kw["text"], [kw["applies"], kw["text"][-300:]])

    print("4 the map's Buy angle")
    check("the Buy angle asks for a managed service and for hiring someone, with cost and date", ev(pg, "M20_LENS_FRAME.buy.includes('managed service') && M20_LENS_FRAME.buy.includes('hiring a developer') && M20_LENS_FRAME.buy.includes('date')"), "")

    print("5 missed runs from the schedule")
    # Tuesday 11 Nov 2026 10:00 Zurich; a weekly task Mondays 08:00 Zurich that last fired the Monday before
    T = "Date.parse('2026-11-11T09:00:00Z')"
    wk = ev(pg, f"() => triggerMissed({{enabled: true, cron_expression: 'CRON_TZ=Europe/Zurich 0 8 * * 1', created_at: '2026-10-01T00:00:00Z', last_run: {{status: 'SUCCEEDED', fired_at: '2026-11-03T07:00:05Z'}}}}, {T})")
    check("a weekly tool that missed Monday shows on Tuesday", wk["missed"] is True, wk)
    ok = ev(pg, f"() => triggerMissed({{enabled: true, cron_expression: 'CRON_TZ=Europe/Zurich 0 8 * * 1', created_at: '2026-10-01T00:00:00Z', last_run: {{status: 'SUCCEEDED', fired_at: '2026-11-10T07:00:04Z'}}}}, {T})")
    check("…and does not when Monday's run fired", ok["missed"] is False, ok)
    dl = ev(pg, f"() => triggerMissed({{enabled: true, cron_expression: '30 6 * * *', created_at: '2026-10-01T00:00:00Z', last_run: {{status: 'SUCCEEDED', fired_at: '2026-11-11T06:30:02Z'}}}}, {T})")
    check("a daily tool that ran this morning is fine", dl["missed"] is False, dl)
    dl2 = ev(pg, f"() => triggerMissed({{enabled: true, cron_expression: '30 6 * * *', created_at: '2026-10-01T00:00:00Z', last_run: {{status: 'SUCCEEDED', fired_at: '2026-11-09T06:30:02Z'}}}}, {T})")
    check("a daily tool that skipped yesterday and today is missed", dl2["missed"] is True, dl2)
    pz = ev(pg, f"() => triggerMissed({{enabled: false, cron_expression: '30 6 * * *', last_run: {{fired_at: '2026-10-01T06:30:00Z'}}}}, {T})")
    nw = ev(pg, f"() => triggerMissed({{enabled: true, cron_expression: 'CRON_TZ=Europe/Zurich 0 8 * * 1', created_at: '2026-11-10T12:00:00Z'}}, {T})")
    check("a paused task is never missed; a task created after its last due time is not missed", pz["missed"] is False and nw["missed"] is False, [pz, nw])
    lst = ev(pg, f"""() => {{ const p = WS.projects[0]; p.tool = Object.assign(p.tool || {{}}, {{triggers: [{{id: 'trig_x', name: 'Weekly scout'}}]}}); const real = Date.now; Date.now = () => {T};
        try{{ return missedRunsOf([{{id: 'trig_x', name: 'Weekly scout', enabled: true, cron_expression: 'CRON_TZ=Europe/Zurich 0 8 * * 1', created_at: '2026-10-01T00:00:00Z', last_run: {{fired_at: '2026-11-03T07:00:05Z'}}}}]).map(m => missedLine(m)); }} finally {{ Date.now = real; }} }}""")
    check("the morning line names the tool, the task, when it was due and the last run", len(lst) == 1 and "Weekly scout" in lst[0] and "Missed run" in lst[0], lst)

    print("6 drift and report candidates")
    dr = ev(pg, """() => { const p = WS.projects[0]; p.live = {v: '1.0', since: '2026-09-01'}; const d = n => new Date(Date.now() - n * 86400000).toISOString();
        p.health = [{at: d(20), passRate: 92}, {at: d(13), passRate: 85}, {at: d(6), passRate: 74}]; const fall = toolDrift(p);
        p.health = [{at: d(20), passRate: 90}, {at: d(6), passRate: 88}]; const flat = toolDrift(p); return {fall, flat}; }""")
    check("quality 92 → 74 over three weeks is marked falling", dr["fall"] and dr["fall"]["falling"] and dr["fall"]["a"] == 92 and dr["fall"]["b"] == 74, dr)
    check("90 → 88 is shown but not falling", dr["flat"] and not dr["flat"]["falling"], dr)
    check("the Sunday note has a line for it in three languages", ev(pg, "['wk.t.drift', 'wk.t.driftdown'].every(k => STR[k] && STR[k].every(x => x.includes('{a}') && x.includes('{b}')))"), "")
    ev(pg, """() => { const p = WS.projects[0]; openProject(p.id); UI.home = false; face20Set(p, 'pick');
        p.inbox = arr(p.inbox).filter(i => !/^ib-t22/.test(i.id)); p.inbox.push({id: 'ib-t22a', src: 'tool', title: 'The summary skipped the second page', body: 'It only read page 1', at: now(), kind: 'bug'}, {id: 'ib-t22b', src: 'run', title: 'Run ok', at: now(), ok: true});
        pgOpen(p, 'idea'); pgShowPhase(p, 'capture'); UI.boardF = 'todo'; render(); }"""); pg.wait_for_timeout(400)
    c = ev(pg, "({cands: [...document.querySelectorAll('[data-cand]')].map(e => e.dataset.cand), tests: curP().tests.length})")
    check("a report about the tool waits in its examples board as a candidate test (a run record does not)", c["cands"] == ["ib-t22a"], c)
    pg.locator("[data-cand=ib-t22a] [data-a=rc22-no]").click(); pg.wait_for_timeout(250)
    check("“Not a test” takes it off the board; no test was made", ev(pg, "!document.querySelector('[data-cand]') && curP().tests.length") == c["tests"], "")
    ev(pg, "() => { const i = curP().inbox.find(x => x.id === 'ib-t22a'); delete i.notTest; render(); }"); pg.wait_for_timeout(250)
    n0 = ev(pg, "curP().tests.length")
    pg.locator("[data-cand=ib-t22a] [data-a=rc22-test]").click(); pg.wait_for_timeout(3000)
    check("“Make it a test” turns it into a test after your tick, and it leaves the board", ev(pg, "curP().tests.length") == n0 + 1 and ev(pg, "!!curP().inbox.find(x => x.id === 'ib-t22a').testId") and not ev(pg, "!!document.querySelector('[data-cand=ib-t22a]')"), [ev(pg, "curP().tests.length"), n0])

    for lang, word in (("de", "Aus Meldungen"), ("zh", "来自报告")):
        check(f"the candidate strings in {lang}", word in ev(pg, f"STR['rc22.t'][{1 if lang == 'de' else 2}]"), "")
    check("no page errors in the whole run", not errors, errors[:4])
    b.close()
print(f"\n== e2e220_tools: ok: {len(oks)} failed: {len(fails)} page errors: {len(errors)}")
for f in fails: print("FAIL", f)
for e in errors[:10]: print("ERR ", e)
sys.exit(1 if fails or errors else 0)
