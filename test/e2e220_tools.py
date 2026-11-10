"""2.2.0 research import: what PT's tools get (src/v220_tools.js), on the made-up data with the mock runtime. Never touches real data.
 1 the new failure-proof rules exist with strings in three languages and apply on their trigger words, not on an unrelated tool
 2 SHOULD 12: a tool used by named people gets the accessibility floor by default; a tool only for me does not
 3 kit lines: channel + Good / Not good for pages and scheduled tools, event bridge for scheduled tools, vendor set + Claude Code for web apps
 4 COULD 12: the map's Buy angle asks for a managed service and for hiring someone, with cost and date
 5 SHOULD 6: a missed run is computed from the schedule for any cadence (weekly missed Monday → shown Tuesday; daily ok; paused never)
 6 SHOULD 2: the drift number falls when quality falls over three weeks; reports wait as candidate tests until ticked or dismissed
 7 SHOULD 15: hard gates for tools others use block the release until met; a key in the package can only be removed, not answered
 8 SHOULD 4: every outside app of the chosen route is a pick before the build; the answers go into the brief
 9 SHOULD 5: one sentence on a live tool → small or big with the reason; small prepares only that change
10 SHOULD 13 + 14: the last-mile checklist, one press per screen, checks after each press, a wrong result stops it
11 C7 + SHOULD 3: Reinstall uses the released brief, is live only once verified, snapshots the data, restores it on request
12 COULD 14: five learning moments in Learning mode
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

    print("7 hard gates")
    hg = ev(pg, MK, {"name": "Shared shop 22", "raw": "A web app online shop where customers pay with a subscription, log in, and their orders are stored in a database", "aud": {"customers": True}, "home": "a web app on its own domain"})
    ev(pg, """(id) => { const p = WS.projects.find(x => x.id === id); p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', reqIds: [], content: 'Use the key ' + ['sk', 'live', 'AbCdEfGhIjKlMnOpQrStUvWx0123'].join('_') + ' for Stripe.'}]; touch(p); }""", hg)
    items = ev(pg, "(id) => queueOf(WS.projects.find(x => x.id === id)).filter(x => x.kind === 'hg22').map(x => ({id: x.ref.slice(5), cls: x.cls}))", hg)
    ids = [x["id"] for x in items]
    check("a shared web shop with payments and a database gets every hard gate, each blocking", set(ids) == {"secret", "backend", "access", "server", "stage", "rate", "launch3"} and all(x["cls"] == "block" for x in items), items)
    sec = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return qOptions(p, {kind: 'hg22', ref: 'hg22:secret'}).map(o => o.label); }", hg)
    check("the key gate can only be fixed by removing the key, not answered", len(sec) == 1 and "Remove" in sec[0], sec)
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); p.pkg.sections[0].content = 'Read the key from the secret store.'; p.hg22 = {launch3: {ev: 'short', at: now()}, backend: {ev: 'Supabase edge functions; the page holds no database key', at: now()}}; touch(p); }", hg)
    left = ev(pg, "(id) => hg22Open(WS.projects.find(x => x.id === id)).map(g => g.id)", hg)
    check("without the key the key gate is met; real evidence meets a gate, a too-short answer does not", "secret" not in left and "backend" not in left and "launch3" in left, left)
    check("a tool only for me has no hard gates", ev(pg, "(id) => hg22Gates(WS.projects.find(x => x.id === id)).length", notes) == 0, "")

    print("8 the connector check")
    ev(pg, """(id) => { const p = WS.projects.find(x => x.id === id); const M = m20Read(p); M.routes = [{id: 'R1', name: 'Gmail and Trello helper', line: 'Reads Gmail, files cards in Trello', day: [], where: 'claude', how: 'scheduled', lvl: 1}]; M.chosen = 'R1'; p.map20 = M; touch(p); }""", mail)
    cq = ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return {apps: conn22Apps(p), q: queueOf(p).filter(x => x.kind === 'conn22').map(x => [x.ref, x.cls, x.why])}; }", mail)
    check("the chosen route's apps (Gmail, Trello) each become a blocking pick before the build", "Gmail" in cq["apps"] and "Trello" in cq["apps"] and all(x[1] == "block" for x in cq["q"]) and len(cq["q"]) == len(cq["apps"]), cq)
    tr = [x for x in cq["q"] if x[0] == "conn22:Trello"][0][2]
    check("for an app PT has no official page on, it says so instead of guessing", "does not know" in tr, tr)
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); for (const n of conn22Apps(p)) qOptions(p, {kind: 'conn22', ref: 'conn22:' + n}).find(o => o.label.startsWith(n === 'Gmail' ? 'It is connected' : 'No connector')).run(); }", mail)
    kb = ev(pg, "(id) => kitBriefPart(WS.projects.find(x => x.id === id))", mail)
    check("the answers go into the brief: Gmail via the connector, Trello via a bridge", "PART N · OUTSIDE APPS" in kb and "Gmail: connected" in kb and "Trello: no connector" in kb, kb[-300:])
    check("…and the picks are no longer open", ev(pg, "(id) => conn22Open(WS.projects.find(x => x.id === id)).length", mail) == 0, "")

    print("9 the small-change path")
    sz = ev(pg, """() => { const p = WS.projects[0]; p.live = {v: '1.0', since: now()};
        const off = Object.assign({}, p); delete off.live;
        return {small: sc22Size(p, 'Make the weekly mail list the prices too'), money: sc22Size(p, 'Charge customers a subscription'), people: sc22Size(p, 'Also send it to every customer'), app: sc22Size(p, 'Put the results into Notion'), notlive: sc22Size(off, 'Make the heading bigger')}; }""")
    check("one plain sentence on a live tool is small", sz["small"]["size"] == "small", sz)
    check("money, other people, a new app or a tool not live yet make it big, each with its reason", sz["money"] == {"size": "big", "why": "money"} and sz["people"]["why"] == "people" and sz["app"]["why"] == "app" and sz["notlive"]["why"] == "notlive", sz)
    ev(pg, """() => { const p = WS.projects[0]; openProject(p.id); UI.home = false; p.inbox = arr(p.inbox).filter(i => !/^ib-s22/.test(i.id));
        p.inbox.push({id: 'ib-s22old', src: 'yours', title: 'old wish', body: 'old wish', on: true, at: now(), k: 'change'}); window.__prep = []; const o = aiPrepareUpdate; aiPrepareUpdate = async function(q){ window.__prep.push(arr(q.inbox).filter(i => i.on && !i.done).map(i => i.title)); }; window.__restorePrep = () => { aiPrepareUpdate = o; }; render(); }""")
    ev(pg, "() => { const f = document.createElement('form'); f.innerHTML = '<input id=\"cr-in\" value=\"Make the weekly mail list the prices too\">'; document.body.appendChild(f); FORMS['change-request'](); f.remove(); }"); pg.wait_for_timeout(500)
    it = ev(pg, "(() => { const i = curP().inbox.slice(-1)[0]; return {title: i.title, size: i.size22}; })()")
    check("the change box marks the sentence small with its reason", it["size"] and it["size"]["size"] == "small", it)
    ev(pg, "(async () => { const i = curP().inbox.slice(-1)[0]; await ACTIONS['sc22-go']({dataset: {id: i.id}}); })()"); pg.wait_for_timeout(400)
    prep = ev(pg, "window.__prep")
    check("“Prepare only this change” prepares that one change and nothing else", prep and prep[-1] == ["Make the weekly mail list the prices too"], prep)
    check("…and the other wish is switched back on afterwards", ev(pg, "curP().inbox.find(i => i.id === 'ib-s22old').on === true"), "")
    ev(pg, "window.__restorePrep()")

    print("10 the last mile")
    st = ev(pg, "(id) => lm22Steps(WS.projects.find(x => x.id === id)).map(s => [s.id, s.who])", hg)
    check("a web shop's last mile: repository by Claude Code, accounts by PT's hands, keys, merge and limits by you", [x[0] for x in st][:2] == ["w-repo", "w-vercel"] and ["w-secrets", "you"] in st and ["w-merge", "you"] in st and ["w-cap", "you"] in st and ["w-repo", "code"] in st, st)
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); openProject(p.id); UI.home = false; face20Set(p, 'chat'); p.lm22 = {}; pgOpen(p, 'build'); p.focus = {ph: 'launch', id: null}; UI.phase = 'launch'; pgShowPhase(p, 'launch'); render(); }", hg); pg.wait_for_timeout(300)
    card = ev(pg, "(() => { const c = document.querySelector('.lm22-press'); return c ? {id: c.dataset.lm22, presses: c.querySelectorAll('[data-a=lm22-did]').length, cost: c.textContent.includes('Costs'), undo: c.textContent.includes('Can be undone')} : null; })()")
    check("the Launch page shows one step at a time with one press, its cost and whether it can be undone", card and card["id"] == "w-repo" and card["presses"] == 1 and card["cost"] and card["undo"], card)
    pg.locator("[data-a=lm22-did]").click(); pg.wait_for_timeout(200)
    pg.locator("[data-a=lm22-yes]").click(); pg.wait_for_timeout(200)
    check("after the press PT asks what you see; Yes moves to the next step", ev(pg, "document.querySelector('.lm22-press').dataset.lm22") == "w-vercel", "")
    pg.locator("[data-a=lm22-did]").click(); pg.wait_for_timeout(200)
    pg.locator("[data-a=lm22-no]").click(); pg.wait_for_timeout(200)
    check("No stops the checklist on that step and says what to do", ev(pg, "document.querySelector('.lm22-press').dataset.lm22") == "w-vercel" and ev(pg, "!!document.querySelector('.lm22-press .crit-t')"), "")
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); p.lm22 = {'w-repo': {ok: true}, 'w-vercel': {ok: true}, 'w-supa': {ok: true}}; delete WS.settings.vlSet_supabase; render(); }", hg); pg.wait_for_timeout(200)
    pg.locator("[data-a=lm22-did]").click(); pg.wait_for_timeout(200)
    check("a step PT can check itself (the Supabase spend cap) stays open until the limit is ticked in Settings", ev(pg, "document.querySelector('.lm22-press').dataset.lm22") == "w-cap", "")
    ev(pg, "() => { WS.settings.vlSet_supabase = '2026-11-10'; render(); }"); pg.wait_for_timeout(200)
    check("…and is done once it is", ev(pg, "document.querySelector('.lm22-press').dataset.lm22") != "w-cap", "")
    check("the brief carries the whole last mile in order", "PART O · LAST MILE" in ev(pg, "(id) => kitBriefPart(WS.projects.find(x => x.id === id))", hg), "")

    print("11 Reinstall: the released brief, live only when verified, data")
    rr = ev(pg, """(async () => { const p = WS.projects[1]; openProject(p.id); p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: 'VERSION ONE TEXT'}]; saveVersion(p, 'v1'); const d1 = p.versionNo;
        p.releases = [{v: '1.0', draft: d1, at: now()}]; p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: 'WORKING COPY TEXT'}]; saveVersion(p, 'wc');
        p.tool = Object.assign(p.tool || {}, {artifacts: ['art-test-1'], triggers: []}); p.live = {v: '1.1', since: now()}; p.updates = [];
        window.__jobs = []; const o = startJob; startJob = function(k, opt){ let r; try{ r = o.apply(this, arguments); }catch(e){} window.__jobs.push({k, inputs: opt.inputs, ins: opt.instructions}); return r; };
        window.__docs = {}; const pt = putTextDoc; putTextDoc = async function(coll, id, meta, text){ window.__docs[id] = text; return pt.apply(this, arguments); };
        await doReinstall(p, '1.0', {withData: true});
        startJob = o; putTextDoc = pt;
        const j = window.__jobs.find(x => x.k === 'update'); const bid = Object.keys(window.__docs).find(k => /-rel-/.test(k));
        return {live: p.live.v, reinstalling: !!p.reinstalling, brief: j && j.inputs.brief, bidText: bid ? window.__docs[bid] : '', snap: j && j.inputs.snapshot, restore: j && j.inputs.restore, ins: j ? j.ins : ''}; })()""")
    check("the tool is not marked live on the old version before the run checked it", rr["live"] == "1.1" and rr["reinstalling"], rr)
    check("the update run gets the brief of the released version, not the working copy", rr["brief"] and "-rel-1.0" in rr["brief"] and "VERSION ONE TEXT" in rr["bidText"] and "WORKING COPY TEXT" not in rr["bidText"], {k: rr[k] for k in ("brief", "live")})
    check("the run first copies the tool's data, and with “code and data” puts version 1.0's copy back", "Before changing anything" in rr["ins"] and rr["snap"] and rr["restore"] and rr["restore"].endswith("-1.0") and "put the data back" in rr["ins"], {k: rr[k] for k in ("snap", "restore")})
    ver = ev(pg, """() => { const p = WS.projects[1]; const u = p.updates.slice(-1)[0]; u.job = 'job-rein'; JOB_APPLY.update({id: 'job-rein', status: 'done', result: {verified: true}}, p); return {live: p.live.v, reinstalling: !!p.reinstalling}; }""")
    check("once the run reports verified, the tool is live on 1.0", ver == {"live": "1.0", "reinstalling": False}, ver)
    co = ev(pg, """(async () => { const p = WS.projects[1]; p.live = {v: '1.1', since: now()}; window.__jobs = []; const o = startJob; startJob = function(k, opt){ let r; try{ r = o.apply(this, arguments); }catch(e){} window.__jobs.push({k, inputs: opt.inputs, ins: opt.instructions}); return r; };
        await doReinstall(p, '1.0', {withData: false}); startJob = o; const j = window.__jobs.find(x => x.k === 'update'); return {restore: j && j.inputs.restore, snap: j && j.inputs.snapshot}; })()""")
    check("“code only” copies the data but restores nothing", co["snap"] and not co["restore"], co)

    print("12 learning moments")
    lm = ev(pg, """() => { const p = WS.projects[0]; p.level = 'learn'; WS.settings.lm5Seen = []; const a = lm5HTML(p); WS.settings.lm5Seen = ['repo', 'pr', 'key', 'domain', 'line']; const b = lm5HTML(p); p.level = 'guided'; const c = (WS.settings.lm5Seen = [], lm5HTML(p)); return {a, b, c}; }""")
    check("Learning mode shows the first moment (a repository); all seen → none; another help level → none", "repository" in lm["a"].lower() and not lm["b"] and not lm["c"], {k: v[:60] for k, v in lm.items()})

    for lang, word in (("de", "Aus Meldungen"), ("zh", "来自报告")):
        check(f"the candidate strings in {lang}", word in ev(pg, f"STR['rc22.t'][{1 if lang == 'de' else 2}]"), "")
    check("no page errors in the whole run", not errors, errors[:4])
    b.close()
print(f"\n== e2e220_tools: ok: {len(oks)} failed: {len(fails)} page errors: {len(errors)}")
for f in fails: print("FAIL", f)
for e in errors[:10]: print("ERR ", e)
sys.exit(1 if fails or errors else 0)
