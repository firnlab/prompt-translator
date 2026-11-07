"""1.8 checks, fixing and facts, on a COPY of the real data (or the made-up bundle) with the mock runtime. Never touches real data.
Covers (PLAN-1.8 §5, owner rounds O1, O3, O4 reading (a), "tap every check"):
 1 quality areas ticked per tool: all preselected, stored per project, changeable per tool; floors for tools others use
 2 check rows for private tools: every lens and gate that applies is a row you tap (apply / skip), never applied or skipped by PT,
   no tap for all; each row with why it helps, cost (units, CHF, minutes, taps), when not needed and PT's ★ (2.0: your choice on another
   tool is never this tool's ★, the owner's rule against carry-over between projects); early pruning removes rows; a check runs only once applied
 3 fix until green: the same fix proposed twice stops with before → after; 5 rounds is the breaker and the fifth writes the
   residual risk; "Fix automatically" goes round in whole passes with the same stops, one restore point
 4 tests 3 times, 5 for tools that act outward; a tool passes only when every run passes
 5 facts by type with an error budget (prices 20, platform 45, law 180, others 90): past it a fact is not used, PT says so
 + Undo for every tap and fix, old projects keep working (findings, restore points), save + reload, three languages, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
LENS_IDS = ["intent", "prompt", "agent", "security", "cost", "legal", "maintain", "ux", "product", "data", "proof"]
# a private tool that reads mail and sends replies (everything applies, it acts outward), and a private tool that only tidies my own text
MAIL = """() => { newProject('Mail helper 18', {raw: 'Reads my inbox and sends short replies to customers'}); const p = curP(); p.audience = {customers: false, eu: false};
  p.northStar.goal = 'Answer routine e-mails'; p.northStar.problem = 'Too many routine mails'; p.northStar.success = 'Replies go out within a day';
  p.arch.components = [{id: 'c1', name: 'Mail reader', kind: 'ai', role: 'reads the inbox', inputs: 'email inbox', outputs: 'a list of mails', reason: '', reqIds: []},
    {id: 'c2', name: 'Reply writer', kind: 'ai', role: 'writes and sends the replies', inputs: 'a list of mails', outputs: 'sends email replies to customers', reason: '', reqIds: []}];
  p.arch.options = [{id: 'o1', name: 'Two parts', kind: 'workflow', summary: '', scores: {}, pros: [], cons: []}]; p.arch.chosen = 'o1'; p.arch.recommended = 'o1';
  p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: '<role>You answer routine mails.</role>\\n<done>Every mail answered.</done>'}];
  p.tests = [{id: 'T1', title: 'A routine mail', category: 'normal', input: 'Where is my order?', simulated: '', reqIds: [], criteria: ['answers politely', 'names the order'], heldOut: false},
    {id: 'T2', title: 'An angry mail', category: 'edge', input: 'This is the third time!', simulated: '', reqIds: [], criteria: ['stays calm', 'offers help'], heldOut: false}];
  saveVersion(p, 'first draft'); touch(p); render(); return p.id; }"""
NOTES = """() => { newProject('Notes tidier 18', {raw: 'Tidies the notes I paste into a clean outline'}); const p = curP(); p.audience = {customers: false, eu: false};
  p.northStar.goal = 'Clean outlines from my own notes'; p.northStar.problem = 'Messy notes'; p.northStar.success = 'One outline per paste';
  p.arch.components = [{id: 'c1', name: 'Outliner', kind: 'code', role: 'turns pasted notes into an outline', inputs: 'pasted notes', outputs: 'an outline', reason: '', reqIds: []}];
  p.arch.options = [{id: 'o1', name: 'One part', kind: 'workflow', summary: '', scores: {}, pros: [], cons: []}]; p.arch.chosen = 'o1'; p.arch.recommended = 'o1';
  p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: '<role>You outline notes.</role>'}];
  saveVersion(p, 'first draft'); touch(p); render(); return p.id; }"""
REVLOG = "(() => { if (window.__rvWrapped) return; window.__rvWrapped = true; window.__rv = []; const o = runAI; runAI = async function(task, label, prompt, opts){ if (task === 'review'){ const m = /Lens: ([^.\\n]+)\\./.exec(String(prompt)); window.__rv.push(m ? m[1] : '?'); } return o.apply(this, arguments); }; })()"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)
    ev(pg, REVLOG)

    print("1 the rows of a private tool")
    old = ev(pg, "(() => WS.projects.map(p => ({id: p.id, f: arr(p.findings).length, rp: arr(p.restore).length, seal: p.seal.review})))()")
    mid = ev(pg, MAIL); pg.wait_for_timeout(200)
    L = ev(pg, "(() => { const L = chkList(curP()); return {rows: L.rows.map(x => x.id), states: [...new Set(L.rows.map(x => x.state))], pruned: L.pruned.map(x => x.id)}; })()")
    check("a private tool that reads mail and sends replies has a row for every lens and the three gates (1.9.1: the independent check)", L["rows"] == LENS_IDS + ["tests", "drill", "judge"] and not L["pruned"], L)
    check("…and every row is open: PT neither applies nor skips one by itself", L["states"] == ["open"], L)
    q = ev(pg, "queueOf(curP()).filter(x => x.kind === 'chk').map(x => ({ref: x.ref, cls: x.cls, who: x.who, hard: !!x.hard}))")
    check("each open row waits in the one queue as your decision (blocking, yours, one per check)", len(q) == 14 and all(x["cls"] == "block" and x["who"] == "you" for x in q) and len({x["ref"] for x in q}) == 14, q[:3])
    o = ev(pg, "(() => { const x = queueOf(curP()).find(x => x.ref === 'chk:security'); return qOptions(curP(), x).map(o => ({label: o.label, star: !!o.star, batch: !!o.batch, why: o.why})); })()")
    check("its options are Apply and Skip, ★ on one, never a batch (no tap for all)", [x["label"] for x in o] == ["Apply", "Skip"] and sum(x["star"] for x in o) == 1 and not any(x["batch"] for x in o) and all(x["why"] for x in o), o)
    check("the deck in Pick shows the rows too (everything that needs you is there)", ev(pg, "(() => { const keys = new Set(pickQueueCards(curP()).map(c => c.qkey)); return queueOf(curP()).filter(x => x.kind === 'chk').every(x => keys.has(x.key)); })()"))
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(300)
    check("the Check page shows one row per check in its panel (1.9.1: plus the second-lab row, off without its key)", ev(pg, "document.querySelectorAll('.pg-checks .chk-row').length") == 15)
    row = ev(pg, "(() => { const r = document.querySelector('.pg-checks [data-anchor=\"chk:security\"]'); return r ? r.innerText : ''; })()")
    check("a row says why it helps here, what it costs (units, CHF, minutes, taps), when it is not needed and PT's ★ with a reason",
          all(s in row for s in ["Why it helps:", "Here:", "Mail reader", "Cost:", "units", "CHF 0", "min", "1 tap", "Not needed when:", "★ Apply —"]), row[:600])
    tr = ev(pg, "(() => { const r = document.querySelector('.pg-checks [data-anchor=\"chk:tests\"]'); return r ? r.innerText : ''; })()")
    check("the tests row names 5 runs for a tool that acts outward and that all must pass", "5 times" in tr and "all 5 runs must pass" in tr, tr[:400])
    check("there is no button that applies or skips all rows at once", ev(pg, "![...document.querySelectorAll('.pg-checks [data-a]')].some(b => !['chk-set', 'goto-ref'].includes(b.dataset.a))") and ev(pg, "document.querySelectorAll('.pg-checks [data-a=chk-set]').length") == 28)
    check("the page's own 'what you decide' block leaves the rows to the panel", ev(pg, "!pgYou(curP(), 'review').some(x => x.kind === 'chk')"))
    ev(pg, "(() => { UI.home = true; render(); goRef('chk:proof'); })()"); pg.wait_for_timeout(1600)
    check("going to a check row from the cover opens the Check page with that row in view", ev(pg, "(() => { const el = refEl('chk:proof'); const r = el && el.getBoundingClientRect(); return !!el && r.bottom > 0 && r.top < innerHeight && !UI.home && pgCur(curP()) === 'review'; })()"))
    nid = ev(pg, NOTES); pg.wait_for_timeout(200)
    L2 = ev(pg, "(() => { const L = chkList(curP()); return {rows: L.rows.map(x => x.id), pruned: L.pruned.map(x => [x.id, x.why])}; })()")
    check("early pruning: a private tool that only tidies my own text has no agent, security, legal, data or drill rows", sorted(x[0] for x in L2["pruned"]) == sorted(["agent", "security", "legal", "data", "drill"]) and "tests" in L2["rows"], L2)
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    check("…and the panel names what is not a check here, with the reason, folded", ev(pg, "(() => { const d = document.querySelector('.pg-checks .chk-pruned'); return !!d && !d.open && d.textContent.includes(t('chk.pr.legal')); })()"))
    check("the notes tool runs its tests 3 times, the mail tool 5", ev(pg, "chkTrials(curP())") == 3 and ev(pg, f"chkTrials(WS.projects.find(p => p.id === '{mid}'))") == 5)

    print("2 tapping a row: one Undo step; your choice stays with this tool (2.0: never the next tool's ★)")
    ev(pg, f"openProject('{mid}'); pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    a0 = ev(pg, "arr(curP().acts).filter(a => !a.undone).length")
    pg.locator(".pg-checks [data-a=chk-set][data-id=intent][data-v=apply]").first.click(); pg.wait_for_timeout(250)
    check("a tap on Apply applies that one row", ev(pg, "chkState(curP(), 'intent')") == "apply" and ev(pg, "chkState(curP(), 'prompt')") == "open")
    check("…as one Undo step, with a decision line", ev(pg, "arr(curP().acts).filter(a => !a.undone).length") == a0 + 1 and ev(pg, "curP().decisions.slice(-1)[0].title === t('chk.dec', {x: chkName('intent')})"))
    ev(pg, "undo()"); pg.wait_for_timeout(200)
    check("Undo opens the row again", ev(pg, "chkState(curP(), 'intent')") == "open" and ev(pg, "queueOf(curP()).some(x => x.ref === 'chk:intent')"))
    for lid in ["intent", "security", "proof"]: ev(pg, f"chkSet(curP(), '{lid}', 'apply')")
    ev(pg, "chkSet(curP(), 'product', 'skip')"); ev(pg, "render()"); pg.wait_for_timeout(150)
    check("a decided row leaves the queue; the rest stay open", ev(pg, "queueOf(curP()).filter(x => x.kind === 'chk').length") == 10)
    check("the restore points are untouched by taps (PT never makes or deletes them for this)", ev(pg, "arr(curP().restore).length") == ev(pg, f"arr(WS.projects.find(p => p.id === '{mid}').restore).length"))
    ev(pg, f"openProject('{nid}'); pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    s = ev(pg, "(() => { const r = chkList(curP()).rows.find(x => x.id === 'product'); return {st: chkState(curP(), 'product'), star: chkStar(curP(), r)}; })()")
    # 2.0 (owner, "projects dont get other projects rules, never"): the opposite of 1.8 — another tool's choice is no ★ and no line here
    check("on the next tool the row is still asked and the ★ is PT's own, not your choice on the other tool", s["st"] == "open" and not s["star"]["last"] and s["star"]["v"] == "apply" and "Mail helper 18" not in s["star"]["why"], s)
    check("…no 'you chose this last time' chip on the row", ev(pg, "(() => { const r = document.querySelector('.pg-checks [data-anchor=\"chk:product\"]'); return !!r && !r.textContent.includes(t('chk.lastchip')); })()"))
    check("…and the ★ button of the open row is PT's (Apply)", ev(pg, "(() => { const b = document.querySelector('.pg-checks [data-a=chk-set][data-id=product].primary'); return !!b && b.dataset.v === 'apply'; })()"))

    print("3 a check runs only once applied; the review seal counts the applied lenses")
    ev(pg, "window.__rv = []")
    r = ev(pg, "(async () => { const ok = await aiReview(curP(), LENSES.map(l => l.id)); return {ok, sealed: curP().seal.review === curP().versionNo}; })()"); pg.wait_for_timeout(200)
    check("with every lens row open the review runs nothing and says so", r["ok"] is False and ev(pg, "window.__rv.length") == 0 and not r["sealed"], r)
    check("…and the queue asks for the rows, not for a review PT cannot run", not ev(pg, "queueOf(curP()).some(x => x.kind === 'review')"))
    ev(pg, f"openProject('{mid}')"); ev(pg, "window.__rv = []")
    r = ev(pg, "(async () => { const ok = await aiReview(curP(), LENSES.map(l => l.id)); return {ok, sealed: curP().seal.review === curP().versionNo, ran: curP().checks.ran}; })()"); idle(pg); pg.wait_for_timeout(200)
    check("the review runs exactly the applied lenses (intent, security, failure-proof)", sorted(ev(pg, "window.__rv")) == sorted(["Your intent", "Security", "Failure-proof"]), ev(pg, "window.__rv"))
    check("…and seals the version with them while the open rows stay open", r["sealed"] and sorted(r["ran"]["ids"]) == ["intent", "proof", "security"] and ev(pg, "chkState(curP(), 'prompt')") == "open", r)
    ev(pg, "chkSet(curP(), 'cost', 'apply')")
    check("a lens applied after the review makes the review due again", ev(pg, "curP().seal.review !== curP().versionNo && queueOf(curP()).some(x => x.kind === 'review' && x.fix === 'review-run')"))
    ev(pg, "window.__rv = []")
    ev(pg, "(async () => { await aiReview(curP(), LENSES.map(l => l.id)); })()"); idle(pg); pg.wait_for_timeout(200)
    check("…and only that lens runs, then the seal is back", ev(pg, "window.__rv") == ["Cost & speed"] and ev(pg, "curP().seal.review === curP().versionNo"), ev(pg, "window.__rv"))
    ev(pg, "undo()"); pg.wait_for_timeout(100)
    sk = ev(pg, f"""(() => {{ const p = WS.projects.find(x => x.id === '{nid}'); openProject(p.id); for (const l of chkList(p).rows.filter(x => !x.gate)) chkSet(p, l.id, 'skip'); return {{sealed: p.seal.review === p.versionNo, review: queueOf(p).some(x => x.kind === 'review')}}; }})()""")
    check("skipping every quality area of a tool is your choice: no review is asked and the version counts as reviewed", sk["sealed"] and not sk["review"], sk)
    ev(pg, "chkSet(curP(), 'intent', 'apply')")
    check("…and a lens applied later runs on it", ev(pg, "curP().seal.review !== curP().versionNo && queueOf(curP()).some(x => x.kind === 'review')"))
    check("an open drill row is not due by itself; applied, it is", ev(pg, f"""(() => {{ const p = WS.projects.find(x => x.id === '{mid}'); p.live = {{v: '1', at: '2026-01-01T00:00:00Z'}}; const a = rtDue(p); chkSet(p, 'drill', 'apply'); const b = rtDue(p); return !a && b; }})()"""))

    print("4 quality areas of a tool other people use: all ticked, per tool, floors fixed")
    sh = ev(pg, """(() => { newProject('Shop page 18', {raw: 'A price list page for my customers'}); const p = curP(); p.audience = {customers: true, eu: true}; p.arch.components = [{id: 'c1', name: 'Page', kind: 'code', role: 'shows prices', inputs: 'price list', outputs: 'a page', reason: '', reqIds: []}]; touch(p);
      return {id: p.id, q: queueOf(p).filter(x => x.kind === 'chk').length, on: LENSES.filter(l => chkLensOn(p, l.id)).length, n: LENSES.length, floors: [chkSet(p, 'legal', 'skip'), chkSet(p, 'ux', 'skip')], legal: chkLensOn(p, 'legal'), gates: chkList(p).rows.filter(x => x.gate).map(x => x.fixed)}; })()""")
    check("every quality area starts ticked and nothing waits for a tap (today's behaviour)", sh["q"] == 0 and sh["on"] == sh["n"], sh)
    check("Legal and Output & usability cannot be unticked for a tool others use", sh["floors"] == [False, False] and sh["legal"], sh)
    check("…and the gates stay as before (fixed rows)", sh["gates"] == [True, True, True], sh)
    ev(pg, "chkSet(curP(), 'cost', 'skip')")
    check("unticking one area is stored with this tool only", ev(pg, "!chkLensOn(curP(), 'cost') && curP().checks.rows.some(r => r.id === 'cost' && r.v === 'skip')") and ev(pg, f"chkLensOn(WS.projects.find(p => p.id === '{mid}'), 'cost')"))
    ev(pg, "(() => { const p = curP(); UI.home = false; pgShowPhase(p, 'review'); setPhase('review'); render(); })()"); pg.wait_for_timeout(250)
    check("the lens chips of the review step show this tool's ticks", ev(pg, "(() => { const c = document.querySelector('input[data-a-change=lens][data-id=cost]'); const d = document.querySelector('input[data-a-change=lens][data-id=intent]'); return !!c && !c.checked && d.checked; })()"))
    pg.locator("label:has(input[data-a-change=lens][data-id=cost])").first.click(); pg.wait_for_timeout(250)
    check("ticking a chip there changes this tool's row (one Undo step)", ev(pg, "chkLensOn(curP(), 'cost') && curP().checks.rows.find(r => r.id === 'cost').v === 'apply'"))
    ev(pg, "(() => { const lb = t('chk.act', {x: chkName('cost'), v: t('chk.o.apply')}); const a = arr(curP().acts).filter(a => !a.undone && !a.undoOf && a.label === lb).slice(-1)[0]; undoAct(curP(), a.id); })()"); pg.wait_for_timeout(150)   # by its label: a background step (frontier scan) may finish after the tap
    check("…and Undo takes it back", ev(pg, "!chkLensOn(curP(), 'cost')"))
    ev(pg, "(() => { curP().mode = 'pick'; render(); })()")

    print("5 tests: 3 runs, 5 for a tool that acts outward; it passes only when every run passes")
    ev(pg, f"openProject('{mid}')")
    check("the mail tool acts outward and says why", ev(pg, "chkOutward(curP())") in ("sends", "send", "sending"), ev(pg, "chkOutward(curP())"))
    check("a tool that only reads blog posts or sorts in order does not act outward", ev(pg, "(() => { const p = {northStar: {goal: 'Summarise the blog posts I follow in order of date'}, intake: {raw: 'people buy things'}, arch: {components: []}, requirements: []}; return chkOutward(p) === '' && chkTrials(p) === 3; })()"))
    ev(pg, "chkSet(curP(), 'tests', 'skip')")
    check("tests skipped by you: no run is asked for and Fix automatically plans none", not ev(pg, "queueOf(curP()).some(x => ['test-run', 'test-none'].includes(x.kind))") and not ev(pg, "finishPlan(curP()).groups.some(g => g.fix === 'tests-run')"))
    ev(pg, "undo()"); pg.wait_for_timeout(100)
    check("tests row open: nothing runs them by itself either", ev(pg, "chkState(curP(), 'tests')") == "open" and not ev(pg, "queueOf(curP()).some(x => x.kind === 'test-run')") and not ev(pg, "finishPlan(curP()).groups.some(g => g.fix === 'tests-run')"))
    ev(pg, "chkSet(curP(), 'tests', 'apply')")
    check("tests applied: the run is asked for, 5 times", ev(pg, "(() => { const x = queueOf(curP()).find(x => x.kind === 'test-run'); return !!x && x.why.includes('5'); })()"))
    ev(pg, "window.__judgeN = 0")
    run = ev(pg, "(async () => { const r = await aiRunTests(curP(), {trials: TRIALS}); return {trials: r.trials, n: r.results.length, fails: r.results.filter(x => !x.pass).length}; })()"); idle(pg); pg.wait_for_timeout(200)
    check("a test run asked with the usual 3 runs runs 5 times for this tool", run["trials"] == 5 and run["n"] == 10, run)
    pk = ev(pg, "chkPassK(curP())")
    check("one failed run means the tool does not pass (pass^k)", run["fails"] >= 1 and pk["pass"] is False and pk["fails"] == run["fails"] and ev(pg, "queueOf(curP()).some(x => ['test-fail', 'judge'].includes(x.kind) && x.cls === 'block')"), [run, pk])
    ev(pg, "(() => { const p = curP(); for (const x of lastRun(p).results) x.userVerdict = 'pass'; touch(p); })()")
    check("…and when every run passes it does", ev(pg, "chkPassK(curP()).pass === true"))
    ev(pg, "(() => { const p = curP(); p.runs.unshift({id: 'run-3x', versionNo: p.versionNo, at: now(), trials: 3, results: [{testId: 'T1', trial: 0, pass: true, verdicts: []}, {testId: 'T1', trial: 1, pass: true, verdicts: []}, {testId: 'T1', trial: 2, pass: true, verdicts: []}, {testId: 'T2', trial: 0, pass: true, verdicts: []}, {testId: 'T2', trial: 1, pass: true, verdicts: []}, {testId: 'T2', trial: 2, pass: true, verdicts: []}], label: '', expected: 6}); touch(p); })()")
    rq = ev(pg, "(() => { const x = queueOf(curP()).find(x => x.kind === 'test-run'); return x ? {title: x.title, cls: x.cls, fix: x.fix} : null; })()")
    check("three runs are not enough for an outward tool: a blocking item asks for 5", rq and rq["cls"] == "block" and rq["fix"] == "tests-run" and "5" in rq["title"], rq)
    check("…and the Prove stage is not complete with 3 runs", ev(pg, "stageChecks(curP(), 'prove').find(c => c.id === 'prv.tests').ok === false"))
    check("…while the same 3 runs are enough for a tool that does not act outward", ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{nid}'); return chkTrials(p) === 3; }})()"))
    check("the cost of a test run counts 5 runs for this tool", ev(pg, "testRunCost(curP()) === testRunCost(curP(), 5) && testRunCost(curP(), 5) > testRunCost(curP(), 3)"))
    ev(pg, "(() => { const p = curP(); p.runs = p.runs.filter(r => r.id !== 'run-3x'); touch(p); })()")

    print("6 fix until green: a repeated fix stops with before → after; 5 rounds is the breaker with the residual risk")
    FIXSTUB = """(mode) => { window.__fixCalls = 0; window.__fixOrig = window.__fixOrig || {f: aiFixBatch, c: aiCheckBatch};
      aiFixBatch = async (p, fs, notes) => { window.__fixCalls++; const ref = fs[0].targets[0]; const txt = mode === 'repeat' ? 'Same new text' : 'New text ' + window.__fixCalls; return {items: [{ref, fields: {then: txt}}], newItems: [], applied: fs.map(f => ({id: f.id, how: 'x'})), summary: 'x'}; };
      aiCheckBatch = async (p, fs) => fs.map(f => ({id: f.id, parts: [{part: 'it', resolved: false}], resolved: false, stillOff: 'still vague', sideEffects: []})); }"""
    UNSTUB = "(() => { if (window.__fixOrig){ aiFixBatch = window.__fixOrig.f; aiCheckBatch = window.__fixOrig.c; } })()"
    MKF = """(txt) => { const p = curP(); if (!p.requirements.some(r => r.id === 'R1')) p.requirements.push({id: 'R1', title: 'Replies', given: 'a mail', when: 'it is routine', then: 'a reply goes out', priority: 'must', st: 'ok'}); const f = {id: uid('fd'), lens: 'intent', severity: 'high', cls: 'block', section: '', item: 'req:R1', where: '', issue: txt, fix: 'say when', status: 'open', version: p.versionNo, at: now(), stage: 'review', targets: ['req:R1'], audit: [], reopened: 0}; p.findings.push(f); touch(p); return f.id; }"""
    ev(pg, FIXSTUB, "repeat")
    fid = ev(pg, MKF, "R1 is vague (repeat case)")
    t0 = ev(pg, "curP().requirements.find(r => r.id === 'R1').then")
    r = ev(pg, f"""(async () => {{ const s = await fixFindings(curP(), ['{fid}'], {{quiet: true}}); const f = curP().findings.find(x => x.id === '{fid}'); return {{calls: window.__fixCalls, st: f.status, prop: f.proposal, needs: f.needsYou, before: f.before, after: f.after, txt: curP().requirements.find(r => r.id === 'R1').then, res: f.residual || null}}; }})()""")
    check("the same fix proposed twice stops after the second round", r["calls"] == 2, r)
    check("…goes back to you with before → after kept and the reason", r["st"] == "open" and r["prop"] and r["prop"].get("repeat") and "Same new text" in json.dumps(r["prop"]["fields"]) and "Same new text" in (r["after"] or "") and t0 in (r["before"] or "") and r["needs"] and "same fix" in r["needs"]["why"], r)
    check("…and the unconfirmed change is taken back, no residual risk (it stopped, it did not hit the breaker)", r["txt"] == t0 and r["res"] is None, r)
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    check("…and the Check page shows it with before → after", ev(pg, "(() => { const r = document.querySelector('.pg-checks .chk-repeat'); return !!r && r.textContent.includes('R1 is vague (repeat case)') && !!r.querySelector('.diff .add, .diff ins, .diff [class]'); })()"), ev(pg, "(() => { const r = document.querySelector('.pg-checks .chk-repeat'); return r ? r.innerHTML.slice(0, 400) : 'none'; })()"))
    ev(pg, FIXSTUB, "new")
    fid2 = ev(pg, MKF, "R1 is vague (cap case)")
    na = ev(pg, "arr(curP().acts).filter(a => !a.undone).length")
    r = ev(pg, f"""(async () => {{ const s = await fixFindings(curP(), ['{fid2}'], {{quiet: true}}); const f = curP().findings.find(x => x.id === '{fid2}'); return {{calls: window.__fixCalls, st: f.status, res: f.residual || null, needs: f.needsYou, txt: curP().requirements.find(r => r.id === 'R1').then}}; }})()""")
    check("a fix the checker keeps rejecting goes round 5 times, no more", r["calls"] == 5, r)
    check("…and the fifth round writes the residual risk for you", r["res"] and r["res"]["rounds"] == 5 and "R1 is vague (cap case)" in r["res"]["text"] and r["needs"]["why"] == r["res"]["text"] and r["st"] == "open", r)
    check("…taking the unconfirmed change back", r["txt"] == t0, r)
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    check("the Check page shows the residual risk", ev(pg, "(() => { const r = document.querySelector('.pg-checks .chk-residual'); return !!r && r.textContent.includes('R1 is vague (cap case)'); })()"))
    acts = ev(pg, "arr(curP().acts).filter(a => !a.undone).length")
    check("the fix and its check are Undo steps of their own", acts > na)
    fid3 = ev(pg, MKF, "R1 is vague (two rounds asked)"); ev(pg, "window.__fixCalls = 0")
    r = ev(pg, f"""(async () => {{ await fixFindings(curP(), ['{fid3}'], {{rounds: 2, quiet: true}}); const f = curP().findings.find(x => x.id === '{fid3}'); return {{calls: window.__fixCalls, res: f.residual || null, prop: !!f.proposal}}; }})()""")
    check("a caller that asks for 2 rounds gets 2 (no residual: not the breaker)", r["calls"] == 2 and r["res"] is None and r["prop"], r)
    ev(pg, UNSTUB)
    ev(pg, "(() => { const p = curP(); p.findings = p.findings.filter(f => !/R1 is vague/.test(f.issue)); touch(p); })()")

    print("6b fix until green in whole passes (Fix automatically)")
    lp = ev(pg, """(() => { const p = curP(); const id = uid('fd'); p.findings.push({id, lens: 'intent', severity: 'critical', cls: 'block', section: 'instructions', item: 'section:instructions', where: '', issue: 'Loop case', fix: 'x', status: 'open', version: p.versionNo, at: now(), stage: 'review', targets: ['section:instructions'], audit: [], reopened: 0}); touch(p);
      const allowed = ['finding-fix']; const F = {pid: p.id, step: 'run', plan: {groups: [{fix: 'finding-fix', on: true, state: 'done'}]}, loop: {allowed, sigs: [fixSig(p, allowed).h], rounds: [], end: ''}};
      UI.finish = F; const again = fixNextRound(p, F, 1); const end1 = F.loop.end;
      const F2 = {pid: p.id, step: 'run', plan: {groups: [{fix: 'finding-fix', on: true, state: 'done'}]}, loop: {allowed, sigs: [], rounds: [], end: ''}}; UI.finish = F2; let n = 0, go = true;
      for (let round = 1; round <= FIX_CAP && go; round++){ p.pkg.sections[0].content += ' .'; go = fixNextRound(p, F2, round); n = round; }
      const res = p.checks && p.checks.residual;
      p.findings.find(f => f.id === id).status = 'done'; touch(p);
      const F3 = {pid: p.id, step: 'run', plan: {groups: [{fix: 'finding-fix', on: true, state: 'done'}]}, loop: {allowed, sigs: [], rounds: [], end: ''}}; UI.finish = F3; fixNextRound(p, F3, 1);
      UI.finish = null; return {again, end1, end2: F2.loop.end, n, res: res ? {rounds: res.rounds, items: res.items.map(x => x.title)} : null, end3: F3.loop.end}; })()""")
    check("a pass that changed nothing is not repeated (the next would propose the same)", lp["again"] is False and lp["end1"] == "repeat", lp)
    check("passes that keep changing stop at the breaker: 5", lp["end2"] == "cap" and lp["n"] == 5, lp)
    check("…and the fifth pass writes the residual risk with the tool", lp["res"] and lp["res"]["rounds"] == 5 and "Loop case" in lp["res"]["items"], lp)
    check("nothing left that PT can fix: green", lp["end3"] == "green", lp)
    ev(pg, "(() => { const p = curP(); p.checks.residual = null; touch(p); })()")
    rp0 = ev(pg, "arr(curP().restore).length")
    ev(pg, "ACTIONS['finish-open']()"); pg.wait_for_timeout(200)
    ev(pg, "UI.finish.plan.groups.forEach(g => g.on = g.fix !== 'tests-run'); render()")
    ev(pg, "finishAutopilot(curP())")
    try:
        pg.wait_for_function("UI.finish && ['decide','done'].includes(UI.finish.step) && AI.running.size === 0", timeout=120000)
    except Exception:
        pass
    fl = ev(pg, "UI.finish && UI.finish.loop ? {end: UI.finish.loop.end, rounds: UI.finish.loop.rounds.length, step: UI.finish.step, rp: !!UI.finish.rp} : null")
    check("Fix automatically ends green, on a repeat, at the breaker or the budget — never more than 5 passes", fl and fl["end"] in ("green", "repeat", "cap", "budget") and 1 <= fl["rounds"] <= 5, fl)
    check("…shows how it ended", ev(pg, "!!document.querySelector('.fix-loop')") or ev(pg, "UI.finish && UI.finish.step === 'done'"))
    check("…with one restore point for the whole run (Undo all)", ev(pg, "arr(curP().restore).length") == rp0 + 1 and fl and fl["rp"], [rp0, ev(pg, "arr(curP().restore).length")])
    ev(pg, "UI.finish = null; UI.modal = null; render()")

    print("7 facts by type with an error budget")
    fb = ev(pg, """(() => { const d = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
      return {price: [factStale(d(19), 'price'), factStale(d(21), 'price')], platform: [factStale(d(44), 'platform'), factStale(d(46), 'platform')], policy: [factStale(d(179), 'policy'), factStale(d(181), 'policy')], other: [factStale(d(89)), factStale(d(91))], kp: factTypeOf(KP_VERSION), usable: [factUsable(d(21), 'price'), factUsable(d(21), 'policy')]}; })()""")
    check("prices 20 days, platform 45, law and policy 180, everything else 90", fb["price"] == [False, True] and fb["platform"] == [False, True] and fb["policy"] == [False, True] and fb["other"] == [False, True], fb)
    check("the platform knowledge is a platform fact; a 21-day-old price is not used, a 21-day-old law is", fb["kp"] == "platform" and fb["usable"] == [False, True], fb)
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(250)
    check("the Check page lists the facts by type with their budgets", ev(pg, "(() => { const f = document.querySelector('.pg-facts'); return !!f && f.querySelectorAll('.chip.fact').length >= 4 && ['price', 'platform', 'policy'].every(ty => !!f.querySelector('.chip.fact[data-type=' + ty + ']')) && f.textContent.includes('20') && f.textContent.includes('180'); })()"))
    pr = ev(pg, """(() => { const keep = factList; const d = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
      factList = p => [{id: 'kits', label: 'Kit facts', d: d(30)}, {id: 'kp', label: 'Platform knowledge', d: d(10)}];
      try{ const b = factPromptBlock(curP()), F = factTyped(curP()); render(); const html = document.querySelector('.pg-facts') ? document.querySelector('.pg-facts').textContent : '';
        return {past: F.filter(x => x.past).map(x => x.type), prompt: b, html}; } finally { factList = keep; } })()""")
    check("a 30-day-old kit check: its prices are past their budget, its platform facts and law are not", pr["past"] == ["price"], pr["past"])
    check("…every prompt says the prices may not be used as facts", "PAST THEIR BUDGET" in pr["prompt"] and "prices from the Firnlab kit facts" in pr["prompt"] and "law and policy from" not in pr["prompt"] and '<honesty facts_checked="' in pr["prompt"] and "re-check before you rely on it" in pr["prompt"], pr["prompt"][:600])
    check("…and the Check page says which facts are not used", ev(pg, "t('fact.pastlist', {x: t('fact.kitprice')})") in pr["html"], pr["html"][:300])
    check("the design and compile prompts carry the budgets", ev(pg, "(() => { const pr = buildPrompt('architecture', {proj: curP(), rules: ['simple'], body: 'design', schema: '{}'}); return pr.includes('budget_days=\"price 20, platform 45, law and policy 180, other 90\"') && pr.includes('re-check before you rely on it'); })()"))
    ko = ev(pg, """(() => { const keep = factStale; factStale = (d, ty) => ty === 'price' ? true : keep(d, ty);   // 2.1.1: the kit options follow the price clock (20 days), the same as the Design page
      try{ newProject('Kit facts 18', {raw: 'A board where I keep ideas'}); const p = curP(); p.arch.components = [{id: 'c1', name: 'Main page', kind: 'code', role: 'Shows the board', inputs: 'records', outputs: 'a page', reason: '', reqIds: []}]; p.tool.home = {where: 'artifact page', parts: 'a page', why: ''}; touch(p);
        const x = queueOf(p).find(x => x.kind === 'kit-storage'); if (!x) return null; const o = qOptions(p, x); return {star: o.some(y => y.star), why: o.map(y => y.why).join(' | ')}; } finally { factStale = keep; } })()""")
    check("a kit option on kit prices past their 20-day budget gets no ★ and says why (2.1.1: price clock)", ko and not ko["star"] and "past their 20-day budget" in ko["why"], ko)
    rs = ev(pg, f"""(() => {{ const p = WS.projects.find(x => x.id === '{mid}'); openProject(p.id); const k = pickOf(p); const d = n => new Date(Date.now() - n * 86400000).toISOString();
      k.research = {{state: 'done', at: d(60)}}; k.findings = [{{id: 'f1', kind: 'platform', text: 'Old platform limit ZZOLD', screened: true}}, {{id: 'f2', kind: 'ceiling', text: 'A ceiling idea ZZFRESH', screened: true}}]; touch(p);
      const ctx = projectContext(p); render(); return {{old: ctx.includes('ZZOLD'), fresh: ctx.includes('ZZFRESH'), note: ctx.includes('<facts_past_budget>1 research'), kept: p.pick.findings.length}}; }})()""")
    check("a 60-day-old platform finding is left out of what PT passes on; a 60-day-old other finding stays", not rs["old"] and rs["fresh"], rs)
    check("…the prompt says one finding was left out for its age, and nothing is deleted", rs["note"] and rs["kept"] == 2, rs)
    ev(pg, "pgOpen(curP(), 'review')"); pg.wait_for_timeout(200)
    check("…and the Check page says so", ev(pg, "document.querySelector('.pg-facts').textContent.includes(t('fact.research.past', {n: 1}))"))

    print("8 old projects, save + reload")
    oldnow = ev(pg, "(() => WS.projects.map(p => ({id: p.id, f: arr(p.findings).length, rp: arr(p.restore).length, seal: p.seal.review})))()")
    same = [x for x in old if any(y["id"] == x["id"] and y == x for y in oldnow)]
    check("old projects keep their findings, restore points and seals", len(same) == len(old), [x for x in old if x not in oldnow][:3])
    bad = ev(pg, """(() => { const out = []; for (const p of WS.projects){ try{ openProject(p.id); if (pgOn(p)) pgOpen(p, 'review'); render(); chkPanel(p); queueOf(p); } catch(e){ out.push(p.name + ': ' + e.message); } } return out; })()""")
    check("every project's Check page renders with its rows", not bad, bad)
    ev(pg, "(async () => { for (const p of WS.projects){ touch(p); try{ await saveProject(p); }catch(e){ onAppError(e && e.message, 'test'); } } saveWs(); })()"); pg.wait_for_timeout(2500)
    seed2 = ev(pg, "JSON.stringify(window.__mockdb())")
    ctx2 = b.new_context(viewport={"width": 1440, "height": 900}); ctx2.add_init_script("if (window === window.top) window.__seed = " + seed2 + ";"); ctx2.add_init_script(MOCK)
    pg2 = open_page(ctx2); pg2.wait_for_timeout(600)
    rl = ev(pg2, f"(() => {{ const p = WS.projects.find(x => x.id === '{mid}'); return p ? {{rows: p.checks.rows.map(r => r.id + ':' + r.v).sort(), st: chkState(p, 'intent'), ran: p.checks.ran}} : null; }})()")
    check("the rows survive save + reload with the tool", rl and "intent:apply" in rl["rows"] and "product:skip" in rl["rows"] and rl["st"] == "apply", rl)
    ctx2.close()

    print("9 three languages and errors")
    ev(pg, f"openProject('{mid}'); pgOpen(curP(), 'review')"); pg.wait_for_timeout(200)
    for lang in ["de", "zh"]:
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); render()"); pg.wait_for_timeout(250)
        txt = ev(pg, "document.querySelector('.pg-checks') ? document.querySelector('.pg-checks').textContent : ''")
        check(f"{lang}: the check rows render without raw keys", txt and not re.search(r"\b(chk|fix|fact)\.[a-z]+", txt) and ev(pg, "t('chk.panel.title')") in txt, txt[:200])
    ev(pg, "LANG = 'en'; applyLangAttr(); render()")
    check("every check has its name, help and not-needed line in the strings (the keys are built at run time)", ev(pg, "[...LENSES.map(l => l.id), ...CHK_GATES].every(id => t('chk.h.' + id) !== 'chk.h.' + id && t('chk.n.' + id) !== 'chk.n.' + id) && CHK_GATES.every(id => t('chk.g.' + id) !== 'chk.g.' + id) && ['price', 'platform', 'policy', 'other'].every(ty => t('fact.ty.' + ty) !== 'fact.ty.' + ty) && ['green', 'repeat', 'cap', 'budget', 'stopped', 'running'].every(e => t('fix.loop.' + e) !== 'fix.loop.' + e)"))
    sp = ev(pg, f"""(() => {{ openProject('{mid}'); pgOpen(curP(), 'review'); let n = 0; const ex = CHK_OUT.exec;
      CHK_OUT.exec = function(){{ n++; return ex.apply(this, arguments); }};
      const tools = WS.projects.filter(x => chkActive(x)).length;
      try{{ render(); const one = n; n = 0; render(); return {{tools, one, two: n, outside: (() => {{ n = 0; chkOutward(curP()); chkOutward(curP()); return n; }})()}}; }} finally {{ CHK_OUT.exec = ex; }} }})()""")
    check("speed (cause 67): one screen reads each tool's words at most once, the next screen reads them again, outside a screen nothing is kept", 1 <= sp["one"] <= sp["tools"] and sp["two"] == sp["one"] and sp["outside"] == 2, sp)
    check("no page errors in the whole run", not errors, errors[:4])
    b.close()
print(f"\n== e2e180_checks: ok: {len(oks)} failed: {len(fails)} page errors: {len(errors)}")   # "failed: N" — the form check_the_pick.py and the gate read
for f in fails: print("FAIL", f)
for e in errors[:10]: print("ERR ", e)
sys.exit(1 if fails or errors else 0)
