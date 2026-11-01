"""1.9 care — the owner's reminders R1a, R2, R3, R5, R7 (PLAN-1.9 "E") on a COPY of the real data (or the made-up bundle) with the mock
runtime and a fake clock. R1b (the plain-browser viewer) has its own suite: test/plain_browser.py.
Run: python3 test/e2e190_care.py [work/backup-141 | test/fixtures/synthetic.json]
Covers:
 1 R1a: never exported → "Save a full export" in the newest Sunday note and as one Inbox line, with the button that starts it; a failed
   download records nothing; a successful full export is recorded (per workspace, every time) and both lines go; they stay away for
   90 days and come back after; three languages.
 2 R5: Settings › General "Push to my phone when something needs me", off by default, the owner's login only, not in a preview copy;
   with the Sunday run off the switch is only stored and turning the run on creates the task with push (new session per run, same
   cron, the noteworthy-only rule in its prompt); with the run on, on = a new push task + the old one paused, off = the reverse, back
   on = the kept task again (no new task); ids kept, never a delete; the service refusing push leaves the run as it was (the new task
   paused, the switch off); Health lists the paused tasks the owner may delete in claude.ai; the spec names failing live tools.
 3 R2: a customer tool with AI at run time asks "How customers get AI" (a direction-E row that waits for you): code only (★ where fixed
   rules can do it) · each customer's own Claude login (★ where the part writes language) · a server-backed key with its monthly cost;
   the server option needs a hard monthly limit (none → nothing recorded); with it the decision and the limit are one Undo step, the
   brief gets the server rules, the limit, the secret name and the owner's steps; nothing is created or called; private tools unchanged.
 4 R3 (fake clock, February 2027): no proposal before 1 Feb 2027 or with fewer than 60 days of counts; then the note proposes
   average × 1.25 rounded up with the figures (checked against the stored counts); Not now (asks again next week), Change, Use this;
   above the ceiling autoOK() is false, automatic AI calls and the drill on opening do not run, Health › Economy and the note say so,
   an AI step you start asks once a day in the page (Not now runs nothing; yes runs it and is not asked again that day); the second
   login gets no proposal.
 5 R7: from 4 Oct 2027 "Renew 2 keys" with the steps and links, weekly until ticked done, then 11 months later; no field for a key, only
   a date is stored; the owner's login only.
 three languages (no raw keys, no ß), 390 px without sideways scroll, no page errors."""
import json, sys, pathlib, re, math, datetime
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def settle(pg, ms=500):
    pg.wait_for_timeout(ms); idle(pg); ev(pg, "(async () => { await storeIdle(4000); })()"); pg.wait_for_timeout(100)
def opened(pg):
    pg.wait_for_timeout(1500)
    for _ in range(80):
        if ev(pg, "!RUN18.building && !RUN18.drilling && !RUN18.lfuBusy && !!RUN18.notes && AI.running.size === 0"): break
        pg.wait_for_timeout(250)
    settle(pg, 300)
def raw_keys(text): return sorted(set(re.findall(r"\b(?:care|wk|kit18|hr)\.[a-z][a-z0-9.]*\b", text)))
def note_text(pg): return ev(pg, "(document.querySelector('.main') || document.body).innerText")
def go_note(pg): ev(pg, "ACTIONS['wk18-open']()"); pg.wait_for_timeout(350)
def go_home(pg): ev(pg, "(() => { UI.view = 'cockpit'; UI.modal = null; render(); })()"); pg.wait_for_timeout(300)
def new_note(pg):   # build the note of the latest Sunday again (as PT does the first time it is open after Sunday 14:00)
    ev(pg, "(async () => { const k = wk18Last().key; if (RUN18.notes) RUN18.notes.delete(k); await wk18Ensure(); await storeIdle(3000); })()"); pg.wait_for_timeout(200)
def round_up(x):   # two significant digits, at least to the next ten (written apart from PT's own function)
    if x <= 0: return 10
    m = 10 ** max(1, math.floor(math.log10(x)) - 1)
    return math.ceil(x / m - 1e-9) * m
WSID = _ws_order()[0] if _ws_order() else None
def health_doc(day, calls):
    return {"v": 1, "day": day, "ws": WSID, "pt": "test", "ai": {"tasks": 0, "calls": calls, "fail": 0, "out": 0, "tok": 0, "cached": 0, "units": 0, "quick": 0, "def": 0, "complex": 0}, "ar": {"fast": 0, "read": 0, "cancel": 0}}
def days(a, b):
    d0, d1 = datetime.date.fromisoformat(a), datetime.date.fromisoformat(b)
    return [(d0 + datetime.timedelta(n)).isoformat() for n in range((d1 - d0).days + 1)]
HELP = """
window.C19 = {
  mcp(tool){ return (window.__mcp || []).filter(c => !tool || c.tool === tool); },
  seed(from, to, calls, tab){ const d = window.__mockdb(); let n = 0; for (let x = from; x <= to; x = care19DayAdd(x, 1)){ d[wsPath() + '/health18-' + x + '/' + (tab || 'tab-seed')] = {v: 1, day: x, ws: WS.id, pt: 'test', ai: {tasks: 0, calls, fail: 0, out: 0, tok: 0, cached: 0, units: 0, quick: 0, def: 0, complex: 0}, ar: {fast: 0, read: 0, cancel: 0}}; n++; } return n; },
  counts(from, to){ const d = window.__mockdb(), out = {}, rx = /\\/health18-(\\d{4}-\\d\\d-\\d\\d)\\/([^/]+)$/; for (const k of Object.keys(d)){ const m = rx.exec(k); if (m && k.startsWith(wsPath() + '/') && m[1] >= from && m[1] <= to && d[k] && d[k].ai) out[m[1]] = (out[m[1]] || 0) + (+d[k].ai.calls || 0); } return out; },
  uncache(){ delete window.__mockdb()[wsPath() + '/care19/aidays']; }
};
"""
ARCH = """([home, comps, extra]) => { const p = curP();
  p.arch.components = comps.map((c, i) => Object.assign({id: 'c' + (i + 1), inputs: 'the input', outputs: 'the result', reason: '', reqIds: []}, c));
  p.arch.options = [{id: 'o1', name: 'Design', kind: 'workflow', summary: '', scores: {}, pros: [], cons: []}]; p.arch.chosen = 'o1'; p.arch.recommended = 'o1';
  p.tool.home = {where: home, parts: 'the result on a page', why: ''};
  Object.assign(p, extra || {}); touch(p); render(); }"""
PKG = "(() => { const p = curP(); p.pkg = {sections: [{id: 's1', dest: 'artifact', title: 'Page', content: 'build the page', reqIds: [], why: ''}, {id: 's2', dest: 'instructions', title: 'Rules', content: 'x', reqIds: [], why: ''}], targetModel: 'claude-opus-5-5', rationale: [], compiledAt: now()}; touch(p); })()"
WRITES = [{"name": "Recipe page", "kind": "code", "role": "Shows recipes"}, {"name": "Recipe ideas", "kind": "ai", "role": "Suggests recipes from what is in the fridge and writes them", "inputs": "the fridge list"}]
SCORES = [{"name": "Shop page", "kind": "code", "role": "Shows the offers"}, {"name": "Offer ranking", "kind": "ai", "role": "Scores each offer and picks the best three", "inputs": "the offers"}]
PRIVATE = [{"name": "Main page", "kind": "code", "role": "Shows the ideas"}, {"name": "Scoring", "kind": "ai", "role": "Scores each idea and writes a short reason", "inputs": "idea text"}]
SUN = "2026-11-08T13:05:00Z"   # Sunday 8 Nov 2026, 14:05 Zürich

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); ctx.clock.set_system_time(SUN)
    pg = open_page(ctx); ev(pg, HELP); opened(pg)

    print("1 R1a: a full export every three months")
    ev(pg, "(() => { delete WS.settings.exp19; saveWs(); })()"); new_note(pg); go_home(pg)
    check("never exported: one Inbox line 'Save a full export' with the button that starts it", ev(pg, "document.querySelectorAll('.ib18 .care19-exp.care19-ib').length === 1 && !!document.querySelector('.ib18 .care19-exp [data-a=export-ws]')") and "Save a full export" in note_text(pg))
    go_note(pg)
    check("…and the same line in the newest Sunday note (its own section 'Looking after PT')", ev(pg, "!!document.querySelector('.wk18-sec[data-sec=care] .care19-exp [data-a=export-ws]')") and "Looking after PT" in note_text(pg))
    go_home(pg)
    ev(pg, "window.__mockDownloadFail = true")
    pg.locator(".ib18 .care19-exp [data-a=export-ws]").first.click(); pg.wait_for_timeout(500)
    check("a download that fails records nothing; the line stays", ev(pg, "!WS.settings.exp19") and ev(pg, "!!document.querySelector('.ib18 .care19-exp')"))
    ev(pg, "window.__mockDownloadFail = false; window.__downloadData = {}")
    pg.locator(".ib18 .care19-exp [data-a=export-ws]").first.click(); pg.wait_for_timeout(600)
    e1 = ev(pg, "WS.settings.exp19")
    got = ev(pg, "(() => { const k = Object.keys(window.__downloadData || {}).find(f => /-backup-/.test(f)); if (!k) return null; const d = JSON.parse(window.__downloadData[k]); return {app: d.app, n: (d.projects || []).length, ws: WS.projects.length}; })()")
    check("a full export that was handed over is recorded with its time (workspace level)", e1 and e1.get("last", "").startswith("2026-11-08") and e1.get("n") == 1, e1)
    check("…it is the whole workspace (every project in one file)", got and got["app"] == "prompt-translator" and got["n"] == got["ws"], got)
    check("…and the Inbox line is gone", ev(pg, "!document.querySelector('.ib18 .care19-exp')"))
    go_note(pg)
    check("…the note's line too", ev(pg, "!document.querySelector('.care19-exp')"))
    ev(pg, "ACTIONS['export-ws']()"); pg.wait_for_timeout(400)
    check("every full export is recorded (Settings › Data & backup uses the same button)", ev(pg, "WS.settings.exp19.n") == 2)
    due = ev(pg, "(() => { const t0 = Date.parse(WS.settings.exp19.last), D = 86400000; return [care19ExpDue(t0 + 89 * D), care19ExpDue(t0 + 90 * D - 60000), care19ExpDue(t0 + 91 * D)]; })()")
    check("it stays away for 90 days and comes back after", due == [False, False, True], due)
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ delete WS.settings.exp19; LANG = '{lang}'; applyLangAttr(); UI.view = 'cockpit'; render(); }})()"); pg.wait_for_timeout(300)
        tx = ev(pg, "(document.querySelector('.ib18 .care19-exp') || {}).innerText || ''")
        check(f"{lang}: the export line in the language, no raw keys" + (", no ß" if lang == "de" else ""), tx and not raw_keys(tx) and "ß" not in tx and ev(pg, "t('care.exp.t')") in tx, tx[:200])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); WS.settings.exp19 = {last: now(), n: 3}; saveWs(); render(); })()")

    print("2 R5: push to the phone")
    ev(pg, "(() => { WS.settings.wkRun = {}; delete WS.settings.push19; saveWs(); window.__mcp = []; window.__mockTrigSeq = true; UI.view = 'settings'; UI.setTab = 'general'; render(); })()"); pg.wait_for_timeout(300)
    check("Settings › General has the switch, off by default", ev(pg, "(() => { const b = document.querySelector('.care19-push'); return !!b && b.dataset.push === 'off' && !!b.querySelector('[data-a=care19-push-on]'); })()") and "Push to my phone when something needs me" in note_text(pg))
    check("…it says when it pushes (a live tool failing, an undefended attack) and that routine runs stay silent", all(x in note_text(pg) for x in ("live tool fails", "not defended", "routine Sunday runs stay silent")))
    pg.locator(".care19-push [data-a=care19-push-on]").click(); pg.wait_for_timeout(500)
    check("with the Sunday run off the switch is only stored: nothing is called", ev(pg, "WS.settings.push19.on === true") and not ev(pg, "C19.mcp().length"))
    check("…and the switch says it waits for the Sunday run", "used when you turn the run on" in note_text(pg))
    ev(pg, "(async () => { await ACTIONS['wk18-runner-on'](); })()"); pg.wait_for_timeout(600)
    cr = ev(pg, "C19.mcp('create_trigger').filter(c => c.ok).map(c => c.input)")
    r = ev(pg, "WS.settings.wkRun")
    check("turning the Sunday run on creates ONE task, with push and a new session per run, on the Sunday cron", len(cr) == 1 and cr[0].get("notifications") == {"push": True} and cr[0].get("create_new_session_on_fire") is True and cr[0].get("cron_expression") == ev(pg, "WK18_CRON") and cr[0].get("initiation") == "human_request", cr)
    check("…its prompt has the noteworthy-only rule (failing live tool / open attack; routine runs say nothing urgent)", cr and "NEEDS YOU:" in cr[0]["prompt"] and "Nothing noteworthy: a routine run." in cr[0]["prompt"] and "inputs.failing" in cr[0]["prompt"] and "never delete anything" in cr[0]["prompt"])
    check("…and it is remembered as the push task (on)", r.get("on") and r.get("push") is True and r.get("id") == r.get("pushId") and r.get("id", "").startswith("trig_new_"), r)
    check("the spec the Sunday run reads names the failing live tools while push is on", ev(pg, "Array.isArray(wk18Spec().inputs.failing)"))
    push1 = r["id"]
    ev(pg, "window.__mcp = []; render()"); pg.wait_for_timeout(200)
    pg.locator(".care19-push [data-a=care19-push-off]").click(); pg.wait_for_timeout(700)
    r = ev(pg, "WS.settings.wkRun"); cr = ev(pg, "C19.mcp('create_trigger').filter(c => c.ok).map(c => c.input)"); up = ev(pg, "C19.mcp('update_trigger').map(c => c.input)")
    check("off while the run is on: a new task without push (same cron, the 1.8 prompt) takes over", len(cr) == 1 and cr[0].get("notifications", {}) == {} and cr[0].get("cron_expression") == ev(pg, "WK18_CRON") and "NEEDS YOU" not in cr[0].get("prompt", ""), cr)
    check("…the push task is paused, never deleted", {"trigger_id": push1, "enabled": False} in up and not ev(pg, "C19.mcp('delete_trigger').length"), up)
    check("…and the plain task is now the active one; the push id is kept", r.get("push") is False and r.get("id") == r.get("plainId") and r.get("pushId") == push1 and r.get("id") != push1, r)
    plain1 = r["id"]
    ev(pg, "window.__mcp = []")
    pg.locator(".care19-push [data-a=care19-push-on]").click(); pg.wait_for_timeout(700)
    r = ev(pg, "WS.settings.wkRun"); up = ev(pg, "C19.mcp('update_trigger').map(c => c.input)")
    check("back on: the kept push task runs again (no new task), the plain one is paused", not ev(pg, "C19.mcp('create_trigger').length") and {"trigger_id": push1, "enabled": True} in up and {"trigger_id": plain1, "enabled": False} in up and r.get("id") == push1 and r.get("push") is True, [up, r])
    ev(pg, "(() => { UI.setTab = 'health'; render(); })()"); pg.wait_for_timeout(500)
    check("Health lists the paused PT task the owner may delete in claude.ai (PT never deletes one)", ev(pg, "(() => { const b = document.querySelector('.care19-tasks'); return !!b && b.innerText.includes('" + plain1 + "') && b.innerText.includes('never deletes'); })()"))
    ev(pg, "(async () => { window.__mcp = []; await ACTIONS['wk18-runner-off'](); })()"); pg.wait_for_timeout(400)
    check("the Sunday run off pauses the active (push) task", {"trigger_id": push1, "enabled": False} in ev(pg, "C19.mcp('update_trigger').map(c => c.input)"))
    ev(pg, "(() => { UI.setTab = 'general'; render(); window.__mcp = []; })()"); pg.wait_for_timeout(200)
    pg.locator(".care19-push [data-a=care19-push-off]").click(); pg.wait_for_timeout(400)
    check("push off while the run is off: only stored, nothing called", ev(pg, "WS.settings.push19.on") is False and not ev(pg, "C19.mcp().length"))
    ev(pg, "(async () => { await ACTIONS['wk18-runner-on'](); })()"); pg.wait_for_timeout(600)
    r = ev(pg, "WS.settings.wkRun"); up = ev(pg, "C19.mcp('update_trigger').map(c => c.input)")
    check("turning the run on applies it: the kept plain task again, the push task stays paused, nothing new", not ev(pg, "C19.mcp('create_trigger').length") and {"trigger_id": plain1, "enabled": True} in up and r.get("id") == plain1 and r.get("push") is False and r.get("on"), [up, r])
    # the service refuses push (it does not know the new-session flag: Runner.create then tries without push)
    ev(pg, "(() => { WS.settings.wkRun = {id: 'trig_plain_x', on: true, push: false}; window.__mcpNoNewSession = true; window.__mcp = []; render(); })()"); pg.wait_for_timeout(200)
    pg.locator(".care19-push [data-a=care19-push-on]").click(); pg.wait_for_timeout(800)
    r = ev(pg, "WS.settings.wkRun"); up = ev(pg, "C19.mcp('update_trigger').map(c => c.input)"); made = ev(pg, "C19.mcp('create_trigger').filter(c => c.ok).map(c => c.input)")
    check("the service refused push: the new task is paused, the Sunday run stays as it was, the switch is off", made and "notifications" not in made[-1] and r.get("id") == "trig_plain_x" and {"trigger_id": r.get("refused", [""])[-1], "enabled": False} in up and {"trigger_id": "trig_plain_x", "enabled": False} not in up and ev(pg, "WS.settings.push19.on") is False, [made, r, up])
    ev(pg, "(() => { UI.setTab = 'health'; render(); })()"); pg.wait_for_timeout(400)
    check("…and Health lists that task as refused, to delete in claude.ai", "push refused by the service" in ev(pg, "(document.querySelector('.care19-tasks') || {}).innerText || ''"))
    ev(pg, "(() => { window.__mcpNoNewSession = false; Store.isOwner = false; UI.setTab = 'general'; render(); })()"); pg.wait_for_timeout(300)
    check("another login has no switch", not ev(pg, "!!document.querySelector('.care19-push')"))
    ev(pg, "(() => { Store.isOwner = true; render(); })()")
    check("no scheduled task was ever deleted", not ev(pg, "C19.mcp('delete_trigger').length"))

    print("3 R2: how customers get AI")
    ev(pg, "(() => { window.__mcp = []; newProject('Recipe helper', {raw: 'A page where my customers get recipe ideas from their fridge'}); UI.home = false; render(); })()")
    ev(pg, ARCH, ["artifact page", WRITES, {"audience": {"customers": True, "eu": True}}])
    q = ev(pg, "(() => { const p = curP(), x = queueOf(p).find(x => x.kind === 'kit-ai'); return x && {title: x.title, hard: !!x.hard, opts: qOptions(p, x).map(o => [o.label, !!o.star, o.why, !!o.opens])}; })()")
    labels = ev(pg, "['care.ai.none', 'care.ai.viewer', 'care.ai.server'].map(k => t(k))")
    check("a customer tool with AI at run time asks 'How customers get AI' and it waits for you", q and q["title"] == "How customers get AI" and q["hard"], q)
    check("…three options: code only · each customer's own Claude login · a server-backed key", q and [o[0] for o in q["opts"]] == labels, q)
    check("…★ on the customer's own login when the AI part writes language (fixed rules cannot)", q and not q["opts"][0][1] and q["opts"][1][1] and not q["opts"][2][1], q)
    check("…the server option shows its cost as a monthly range and says a hard limit is required", q and "CHF 1–25 a month" in q["opts"][2][2] and "hard monthly limit is required" in q["opts"][2][2] and q["opts"][2][3], q)
    rw = ev(pg, "(async () => { const p = curP(), L = await rowsEnsure(p); await L.chain; const r = rowsOf(p).find(r => r.src === 'kit:ai'); return r && {id: r.id, tier: r.tier, n: r.options.length, status: r.status}; })()")
    check("…it is a direction-E row that waits for you (block), with all three options", rw and (rw["id"] or "").startswith("E.") and rw["tier"] == "block" and rw["n"] == 3 and rw["status"] == "open", rw)
    ev(pg, "(() => { newProject('Offer ranker', {raw: 'A page for my customers with the best offers'}); UI.home = false; render(); })()")
    ev(pg, ARCH, ["artifact page", SCORES, {"audience": {"customers": True, "eu": False}}])
    q2 = ev(pg, "(() => { const p = curP(), x = queueOf(p).find(x => x.kind === 'kit-ai'); return x && qOptions(p, x).map(o => [o.label, !!o.star]); })()")
    check("★ on code only where the AI part only scores or picks (fixed rules can do it)", q2 and q2[0][1] and not q2[1][1] and not q2[2][1], q2)
    ev(pg, "(() => { newProject('Idea scorer', {raw: 'A page where I score my ideas'}); UI.home = false; render(); })()")
    ev(pg, ARCH, ["artifact page", PRIVATE, {"audience": {"customers": False, "eu": False}}])
    q3 = ev(pg, "(() => { const p = curP(), x = queueOf(p).find(x => x.kind === 'kit-ai'); return x && {title: x.title, opts: qOptions(p, x).map(o => o.label)}; })()")
    check("a private tool keeps its 1.8 question and two options (no server key)", q3 and q3["title"] == ev(pg, "t('kit18.q.ai')") and len(q3["opts"]) == 2 and labels[2] not in q3["opts"], q3)
    ev(pg, "(() => { const p = WS.projects.find(x => x.name === 'Recipe helper'); openProject(p.id); UI.home = false; render(); })()"); ev(pg, PKG)
    bu = ev(pg, "buildBriefText(curP())")
    check("undecided customer tool: the brief says the server key was not chosen (do not build it)", "was not chosen for this tool — do not build it, do not offer it" in bu and "LATER row (1.9)" not in bu and "SERVER-BACKED" not in bu)
    a0 = ev(pg, "arr(curP().acts).filter(a => !a.undone).length")
    r0 = ev(pg, "(async () => { const p = curP(), x = queueOf(p).find(x => x.kind === 'kit-ai'); return await qDo(p, x, qOptions(p, x).findIndex(o => o.k19 === 'server')); })()"); ev(pg, "render()"); pg.wait_for_timeout(300)
    check("choosing the server key opens the limit dialog first (nothing decided yet)", r0 == "opened" and ev(pg, "UI.modal && UI.modal.kind === 'care19srv'") and not ev(pg, "!!kitRead(curP()).ai"))
    mt = ev(pg, "document.querySelector('.overlay .modal').innerText")
    check("…the dialog shows the monthly cost range, the owner's three steps and that nothing is paid now", all(x in mt for x in ("CHF 1–25 a month", "spending limit", "GitHub's secret store", "Hosting", "Nothing is created or paid now")), mt[:400])
    pg.locator(".overlay [data-form=care19-srv] button[type=submit]").click(); pg.wait_for_timeout(300)
    check("…without a limit nothing is recorded and it says why", not ev(pg, "!!kitRead(curP()).ai") and "Enter a monthly limit" in ev(pg, "document.querySelector('.overlay .modal').innerText"))
    pg.fill("#care19-limit", "30"); pg.locator(".overlay [data-form=care19-srv] button[type=submit]").click(); pg.wait_for_timeout(400)
    d = ev(pg, "(() => { const k = kitRead(curP()); return {ai: k.ai && k.ai.kind, q: k.ai && k.ai.qKey, srv: k.aiServer}; })()")
    check("with a limit: the decision (server) and the hard limit are recorded", d["ai"] == "server" and d["q"] == "care.ai.q" and d["srv"] and d["srv"]["limit"] == 30 and d["srv"]["cur"] == "CHF", d)
    check("…as one Undo step", ev(pg, "arr(curP().acts).filter(a => !a.undone).length") == a0 + 1)
    check("…nothing was created or called (no connector call)", not ev(pg, "C19.mcp().length"))
    bs = ev(pg, "buildBriefText(curP())")
    key = ev(pg, "care19SecretName(curP())")
    check("the brief: the server only for this tool, its hard monthly limit, the secret name, the key never in the page", "A CUSTOMER TOOL WITH SERVER-BACKED AI" in bs and "HARD MONTHLY LIMIT: CHF 30" in bs and key in bs and key.endswith("_AI_KEY") and "never in the page" in bs and "DECIDED by the person — undefined" not in bs and "do not build it, do not offer it" not in bs)
    check("…the owner's steps (provider key with a spending limit, GitHub's secret store only, hosting) are in the build steps", "Server-backed AI · the owner's steps first" in bs and "spending limit of at most CHF 30" in bs and "only in GitHub's secret store" in bs and "hosting:" in bs and "nothing paid by Prompt Translator" in bs)
    check("…the customer step names the server, not 'no server-side model call'", "call this tool's own small server" in bs and "ANTHROPIC_API_KEY" not in bs)
    pr = ev(pg, "buildPrompt('architecture', {proj: curP(), rules: ['simple'], body: 'design', schema: '{}'})")
    check("the design prompt says server-backed AI for this tool with its limit", "server-backed AI (the owner chose it for this tool only)" in pr and "CHF 30" in pr)
    rw = ev(pg, "(async () => { const p = curP(), L = await rowsEnsure(p); await L.chain; const r = rowsOf(p).find(r => r.src === 'kit:ai'); return r && {id: r.id, tier: r.tier, chosen: r.decision && r.decision.chosen, q: r.question}; })()")
    check("the decided row: direction E, block, 'How customers get AI' → the server key", rw and (rw["id"] or "").startswith("E.") and rw["tier"] == "block" and rw["chosen"] == labels[2] and rw["q"] == "How customers get AI", rw)
    ev(pg, "pgOpen(curP(), 'design')"); pg.wait_for_timeout(350)
    check("the Design page shows the server line with the limit and the cost range", "hard limit CHF 30 a month" in ev(pg, "(document.querySelector('.pg-kit18 [data-k18=server]') || {}).innerText || ''"))
    ev(pg, "(() => { const a = arr(curP().acts).filter(a => !a.undone).slice(-1)[0]; undoAct(curP(), a.id); render(); })()")
    check("Undo takes the decision and the limit back together", ev(pg, "(() => { const k = kitRead(curP()); return !k.ai && !k.aiServer; })()"))
    bp = ev(pg, "buildBriefText(WS.projects.find(x => x.name === 'Idea scorer'))")
    check("a private tool's brief has no server key", "server-backed" not in bp and "SERVER-BACKED" not in bp)
    check("no page errors so far", not errors, errors[:5])

    print("4 three languages and phone width")
    go_note(pg)
    for lang in ("de", "zh", "en"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); delete WS.settings.exp19; UI.view = 'settings'; UI.setTab = 'general'; render(); }})()"); pg.wait_for_timeout(300)
        tx = ev(pg, "(document.querySelector('.care19-push') || {}).innerText || ''")
        ev(pg, "ACTIONS['wk18-open']()"); pg.wait_for_timeout(300)
        tn = ev(pg, "(document.querySelector('.wk18-sec[data-sec=care]') || {}).innerText || ''")
        check(f"{lang}: the push switch and the note's care section in the language, no raw keys" + (", no ß" if lang == "de" else ""), tx and tn and not raw_keys(tx + tn) and "ß" not in tx + tn and ev(pg, "t('care.push.t')") in tx and ev(pg, "t('wk.s.care')") in tn, (tx + " | " + tn)[:300])
    pg.set_viewport_size({"width": 390, "height": 844})
    for nm, js in (("home", "UI.view = 'cockpit'; render()"), ("note", "ACTIONS['wk18-open']()"), ("settings", "UI.view = 'settings'; UI.setTab = 'general'; render()")):
        ev(pg, js); pg.wait_for_timeout(350)
        sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
        check(f"390 px: no sideways scroll ({nm})", sx <= 2, sx)
    pg.set_viewport_size({"width": 1440, "height": 950})
    check("no page errors (part one)", not errors, errors[:5])
    ctx.close()

    print("5 a preview copy never offers the switch")
    PAGEP = PAGE.replace(".html", "-preview.html")
    (ROOT / "test" / PAGEP).write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + (ROOT / "dist/prompt-translator-preview.html").read_text() + "</body></html>")
    ctxp = new_ctx(b); ctxp.clock.set_system_time(SUN); pgp = ctxp.new_page()
    pgp.on("pageerror", lambda e: errors.append("pageerror(preview): " + str(e)[:300]))
    pgp.goto(U.replace(PAGE, PAGEP)); pgp.wait_for_selector(".app, .ws-opt", timeout=60000)
    if pgp.locator(".app").count() == 0: pgp.locator(f'.ws-opt[data-id="{WSID}"]').click()
    pgp.wait_for_selector(".app", timeout=20000); pgp.wait_for_timeout(800); close_modals(pgp)
    ev(pgp, "(() => { UI.view = 'settings'; UI.setTab = 'general'; render(); })()"); pgp.wait_for_timeout(300)
    check("preview copy: the switch has no button and says why", ev(pgp, "PT_PREVIEW === true && !!document.querySelector('.care19-push') && !document.querySelector('.care19-push [data-a^=care19-push]')") and "Not in a preview copy" in ev(pgp, "document.querySelector('.care19-push').innerText"))
    ctxp.close()
    try: (ROOT / "test" / PAGEP).unlink()
    except Exception: pass

    print("6 R3: the monthly ceiling (February 2027)")
    FEB = "2027-02-07T13:05:00Z"   # Sunday 7 Feb 2027, 14:05 Zürich: the first Sunday note on or after 1 Feb 2027
    late = days("2026-12-20", "2027-02-06")   # 49 days of counts: not enough yet
    seedB = dict(seed); base = f"data/users/user-1/ws-{WSID}"
    for i, dd in enumerate(late): seedB[f"{base}/health18-{dd}/tab-seed"] = health_doc(dd, 15 + i % 7)
    ctx = b.new_context(viewport={"width": 1440, "height": 950}, color_scheme="light")
    ctx.add_init_script("if (window === window.top) window.__seed = " + json.dumps(seedB) + ";"); ctx.add_init_script(MOCK)
    ctx.clock.set_system_time(FEB)
    pg = open_page(ctx); ev(pg, HELP); opened(pg)
    n = ev(pg, "RUN18.notes.get('2027-02-07')")
    check("the note of 7 Feb 2027 is built", bool(n), ev(pg, "[...RUN18.notes.keys()]"))
    check("…with fewer than 60 days of counts it proposes no ceiling yet", n and not (n.get("care19") or {}).get("ceil"), (n or {}).get("care19"))
    ev(pg, "C19.seed('2026-11-01', '2026-12-19', 12)"); ev(pg, "C19.uncache()"); new_note(pg)
    n = ev(pg, "RUN18.notes.get('2027-02-07')"); P = (n.get("care19") or {}).get("ceil") or {}
    cnt = ev(pg, "C19.counts('2026-10-10', '2027-02-06')")
    first = min(cnt); span = len(days(first, "2027-02-06")); total = sum(cnt.values()); avg = total / span * 30.44; want = round_up(avg * 1.25)
    check("with 60+ days the first February note proposes average × 1.25 rounded up (checked against the stored counts)", P.get("calls") == want and P.get("total") == total and P.get("days") == span and P.get("first") == first, [P.get("calls"), want, P.get("total"), total, P.get("days"), span])
    check("no proposal before 1 Feb 2027 (the note of 31 Jan has 90 days of counts too)", ev(pg, "(async () => await care19Proposal('2027-01-31'))()") is None)
    check("…the figures behind it: every month counted, summing to the total", sum(m["calls"] for m in P.get("months", [])) == total and [m["ym"] for m in P.get("months", [])][:1] == [first[:7]] and P.get("months", [{}])[-1].get("ym") == "2027-02", P.get("months"))
    go_note(pg)
    tx = ev(pg, "(document.querySelector('.care19-ceil') || {}).innerText || ''")
    check("the note shows the proposal with its figures and Use this · Change · Not now", f"PT suggests {want} AI calls a month" in tx and "25 % margin" in tx and str(total) in tx and ev(pg, "['care19-ceil-use', 'care19-ceil-set', 'care19-ceil-later'].every(a => !!document.querySelector('.care19-ceil [data-a=' + a + ']'))"), tx[:400])
    check("…and says what happens above it (no automatic AI; your own step asks once a day)", "no automatic AI work" in tx and "asks you once a day" in tx)
    pg.locator(".care19-ceil [data-a=care19-ceil-later]").click(); pg.wait_for_timeout(300)
    check("Not now: nothing set, the line goes for this week", not ev(pg, "!!WS.settings.aiCeiling") and not ev(pg, "!!document.querySelector('.care19-ceil')"))
    ctx.clock.set_system_time("2027-02-14T13:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    check("…and asks again in next week's note", ev(pg, "!!document.querySelector('.care19-ceil')") and ev(pg, "!!(RUN18.notes.get('2027-02-14').care19 || {}).ceil"))
    pg.locator(".care19-ceil input[type=number]").fill("0"); pg.locator(".care19-ceil [data-a=care19-ceil-set]").click(); pg.wait_for_timeout(300)
    check("Change refuses a number below 1", not ev(pg, "!!WS.settings.aiCeiling"))
    P2 = ev(pg, "RUN18.notes.get('2027-02-14').care19.ceil")
    pg.locator(".care19-ceil [data-a=care19-ceil-use]").click(); pg.wait_for_timeout(500)
    C = ev(pg, "WS.settings.aiCeiling")
    check("Use this: stored per workspace with the date it was set", C and C["calls"] == P2["calls"] and C["setAt"].startswith("2027-02-14") and C["by"] == "proposal" and not ev(pg, "!!document.querySelector('.care19-ceil')"), C)
    check("no proposal once a ceiling exists", ev(pg, "(async () => await care19Proposal('2027-02-21'))()") is None)
    ev(pg, "(async () => { Store.isOwner = false; delete WS.settings.aiCeiling; window.__p19 = await care19Proposal('2027-02-21'); Store.isOwner = true; WS.settings.aiCeiling = " + json.dumps(C) + "; })()"); pg.wait_for_timeout(300)
    check("another login gets no proposal", ev(pg, "window.__p19") is None)
    # above the ceiling: this month's counts (February) reach it
    ev(pg, "(async () => { C19.seed(metDay(), metDay(), " + str(int(C["calls"]) + 50) + ", 'tab-big'); CARE19.mTried = 0; await care19MonthLoad(); })()"); pg.wait_for_timeout(300)
    check("this month's counted AI calls reach the ceiling: autoOK() is false", ev(pg, "care19Over() && autoOK() === false"), ev(pg, "[care19MonthCalls(), WS.settings.aiCeiling.calls]"))
    s0 = ev(pg, "CARE19.stopped"); c0 = ev(pg, "(window.__calls || []).length")
    res = ev(pg, "(async () => { CARE19.gesture = 0; CARE19.chainEnd = 0; const r = await runAI('t19auto', 'auto', '[[task:ask]] auto', {json: true, validate: () => true}); return {r, ask: !!document.querySelector('.care19-ask')}; })()")
    check("an automatic AI call does not run (no question, nothing sent, counted as stopped)", res["r"] is None and not res["ask"] and ev(pg, "CARE19.stopped") == s0 + 1 and ev(pg, "(window.__calls || []).length") == c0, res)
    check("the drill on opening does not run either", ev(pg, "(async () => await drill18OnOpen())()") == 0)
    ev(pg, "(() => { UI.view = 'settings'; UI.setTab = 'health'; render(); })()"); pg.wait_for_timeout(600); ev(pg, "render()"); pg.wait_for_timeout(300)
    ec = ev(pg, "(document.querySelector('[data-hr18=economy]') || {}).innerText || ''")
    check("Health › Economy says so: the ceiling, this month's count, automatic AI off until next month", ("Monthly ceiling: " + str(C["calls"]) + " AI calls") in ec and "reached your ceiling" in ec and "automatic AI work is off until" in ec, ec[:500])
    check("…and the ceiling is a signal of the Economy row", ev(pg, "hr18Rows().find(r => r.id === 'economy').signals.some(s => s.id === 'ceiling' && s.bad)"))
    go_note(pg)
    check("the note says so too", "reached your ceiling" in ev(pg, "(document.querySelector('.care19-over') || {}).innerText || ''"))
    # an AI step you start: asked once a day, in the page
    pg.keyboard.press("Shift")
    ev(pg, "(() => { window.__r19 = undefined; runAI('t19m1', 'manual', '[[task:ask]] one', {json: true, validate: () => true}).then(r => { window.__r19 = r == null ? 'null' : 'ok'; }); })()")
    pg.wait_for_selector(".care19-ask", timeout=5000); pg.wait_for_timeout(250)
    check("an AI step you start above the ceiling asks first, in the page (no browser dialog)", ev(pg, "!!document.querySelector('.care19-ask [role=alertdialog]') && document.activeElement && document.activeElement.dataset.c19 === 'no'"))
    pg.locator(".care19-ask [data-c19=no]").click(); pg.wait_for_function("window.__r19 !== undefined", timeout=5000)
    check("…Not now: it does not run, and nothing is remembered", ev(pg, "window.__r19") == "null" and not ev(pg, "!!WS.settings.aiCeiling.okDay") and not ev(pg, "!!document.querySelector('.care19-ask')"))
    pg.keyboard.press("Shift"); c1 = ev(pg, "(window.__calls || []).length")
    ev(pg, "(() => { window.__r19 = undefined; runAI('t19m2', 'manual', '[[task:ask]] two', {json: true, validate: () => true}).then(r => { window.__r19 = r == null ? 'null' : 'ok'; }); })()")
    pg.wait_for_selector(".care19-ask", timeout=5000); pg.locator(".care19-ask [data-c19=yes]").click(); pg.wait_for_function("window.__r19 !== undefined", timeout=8000)
    check("…yes: it runs, and today is remembered", ev(pg, "window.__r19") == "ok" and ev(pg, "WS.settings.aiCeiling.okDay") == ev(pg, "metDay()") and ev(pg, "(window.__calls || []).length") == c1 + 1)
    pg.keyboard.press("Shift")
    r3 = ev(pg, "(async () => { const r = await runAI('t19m3', 'manual', '[[task:ask]] three', {json: true, validate: () => true}); return {ok: r != null, ask: !!document.querySelector('.care19-ask')}; })()")
    check("…not asked again the same day", r3["ok"] and not r3["ask"], r3)
    check("…while automatic AI work stays off", ev(pg, "(async () => { CARE19.gesture = 0; CARE19.chainEnd = 0; return await runAI('t19auto2', 'auto', '[[task:ask]] auto', {json: true, validate: () => true}); })()") is None)
    ev(pg, "(() => { UI.view = 'settings'; UI.setTab = 'health'; render(); })()"); pg.wait_for_timeout(300)
    pg.locator("[data-a=care19-ceil-edit]").first.click(); pg.wait_for_timeout(200); pg.fill("#pr-in", "100000"); pg.locator(".overlay .modal button.primary").first.click(); pg.wait_for_timeout(400)
    check("Change in Health: a higher ceiling and automatic AI work is back", ev(pg, "WS.settings.aiCeiling.calls") == 100000 and ev(pg, "!care19Over() && autoOK()"))
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); WS.settings.aiCeiling.calls = 10; render(); }})()"); pg.wait_for_timeout(300)
        ec = ev(pg, "(document.querySelector('[data-hr18=economy]') || {}).innerText || ''")
        check(f"{lang}: the Economy lines in the language, no raw keys" + (", no ß" if lang == "de" else ""), ec and not raw_keys(ec) and "ß" not in ec and ev(pg, "t('hr.e.title')") in ec, ec[:200])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); WS.settings.aiCeiling.calls = 100000; saveWs(); render(); })()")

    print("7 R7: renew the two keys (from 4 Oct 2027)")
    ev(pg, "(() => { delete META.keys19; })()")
    ctx.clock.set_system_time("2027-10-03T12:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    check("the Sunday before 4 Oct 2027: no key line", not ev(pg, "!!document.querySelector('.care19-keys')"))
    ctx.clock.set_system_time("2027-10-10T12:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    kt = ev(pg, "(document.querySelector('.care19-keys') || {}).innerText || ''")
    check("from 4 Oct 2027 the note shows 'Renew 2 keys'", "Renew 2 keys" in kt, kt[:200])
    check("…with the Claude build key steps (claude setup-token → Settings › Environments › build › CLAUDE_CODE_OAUTH_TOKEN)", all(x in kt for x in ("claude setup-token", "Environments", "build", "CLAUDE_CODE_OAUTH_TOKEN", "Update secret")), kt[:600])
    check("…and the pt-private key steps (personal access tokens → Regenerate, 1 year → Actions › PT_PRIVATE_TOKEN)", all(x in kt for x in ("Fine-grained tokens", "pt-private", "Regenerate token", "1 year", "Secrets and variables", "PT_PRIVATE_TOKEN")), kt[:900])
    links = ev(pg, "[...document.querySelectorAll('.care19-keys a')].map(a => a.getAttribute('href'))")
    check("…with links to the three settings pages, and no field to type a key into", sorted(links) == sorted(["https://github.com/firnlab/prompt-translator/settings/environments", "https://github.com/settings/personal-access-tokens", "https://github.com/firnlab/prompt-translator/settings/secrets/actions"]) and not ev(pg, "document.querySelectorAll('.care19-keys input, .care19-keys textarea').length"), links)
    ev(pg, "(() => { Store.isOwner = false; render(); })()"); pg.wait_for_timeout(200)
    check("another login does not see it", not ev(pg, "!!document.querySelector('.care19-keys')"))
    ev(pg, "(() => { Store.isOwner = true; render(); })()"); pg.wait_for_timeout(200)
    ctx.clock.set_system_time("2027-10-17T12:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    check("weekly until ticked done (next Sunday again)", ev(pg, "!!document.querySelector('.care19-keys')"))
    pg.locator(".care19-keys [data-a=care19-keys-done]").click(); pg.wait_for_timeout(300)
    check("ticked done: gone, and only the date is stored (never a key)", not ev(pg, "!!document.querySelector('.care19-keys')") and ev(pg, "Object.keys(META.keys19).join()") == "done" and ev(pg, "META.keys19.done").startswith("2027-10-17"))
    ctx.clock.set_system_time("2027-10-24T12:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    check("…not in the next note", not ev(pg, "!!document.querySelector('.care19-keys')"))
    due = ev(pg, "[care19KeysDue(Date.parse('2028-09-10T12:00:00Z')), care19KeysDue(Date.parse('2028-09-17T12:00:00Z'))]")
    check("…and back 11 months after it was ticked", due == [False, True], due)
    ctx.clock.set_system_time("2028-09-17T12:05:00Z"); pg.wait_for_timeout(200); new_note(pg); go_note(pg)
    check("…in the note of that Sunday", ev(pg, "!!document.querySelector('.care19-keys')"))
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); render(); }})()"); pg.wait_for_timeout(300)
        kt = ev(pg, "(document.querySelector('.care19-keys') || {}).innerText || ''")
        check(f"{lang}: the key steps in the language, no raw keys" + (", no ß" if lang == "de" else ""), kt and not raw_keys(kt) and "ß" not in kt and "CLAUDE_CODE_OAUTH_TOKEN" in kt, kt[:200])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); go_note(pg)
    sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
    check("390 px: the note with the key steps has no sideways scroll", sx <= 2, sx)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
