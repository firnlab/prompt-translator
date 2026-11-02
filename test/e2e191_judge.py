"""1.9.1 the independent judge and the second-lab review row — on a COPY of the real data (or the made-up bundle) with the mock runtime.
Run: python3 test/e2e191_judge.py [work/backup-141 | test/fixtures/synthetic.json]
Covers (PLAN-1.9 A and C; DESIGN-1.8-rev2 §8 "different instance, commit-first, hard floors"):
 1 the row: "Independent check" is a third gate next to the test runs and the attack drill, with why it helps, the cost per run as an
   estimate, when it is not needed and PT's ★ "apply"; a private tool taps it (never applied by PT, one Undo step); a tool other people
   use has it fixed on; the second-lab row without a key is one row that says why, with nothing to tap (not in the queue, cannot be applied).
 2 the judge job after a build job: only with the gate on, a runner and autoOK; its instructions (fresh session, commit first, the
   builder's report only at step 3 in its own document, every line with evidence, disagreements, hard floors); the result stored on the
   project with the draft it judged; green shown on the row and in the release area; a report read from storage starts it too.
 3 not green: a failed line, a disagreement, a failing floor, no plan written first, a run that could not finish — each blocks the release
   of that draft, with a block card ("needs you": make fixes / check again, hard, never taken by itself); running = the gate waits;
   no runner = a plain line that does not block.
 4 after a verified update job: the judge checks the live version; a fail turns into Inbox items for the next update.
 5 a kit run: green = verified + two live checks + the judge's pass when the gate is on; a fail stops the run (red) with why.
 6 the second-lab row: Settings › General records "added in GitHub as SECOND_LAB_API_KEY (provider: …)" (no key field anywhere);
   then the row is tapped like every row, ★ where a mistake hurts others or costs money, the cost in CHF as an estimate; applied, the
   brief (PART R) and the GitHub build issue tell the build to run it; the runner path says "only in GitHub builds"; the reviews of a
   build report are shown (findings judged must-fix / unsure / overthinking, fixed, residual risk).
 7 a preview copy: no judge job, a plain line, no button.
 + save and reload keep the judge's record, three languages (no raw keys, German without ß), phone width, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def until(pg, js, ms=20000):
    try: pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
RAW = r"\b(jdg|lab2|chk)\.[a-z][a-z0-9.]*\b"

HELP = """window.JD = {
  mk(name, o = {}){ newProject(name, {raw: o.raw || 'Tidies the notes I paste into a clean outline'}); const p = curP(); p.audience = {customers: !!o.shared, eu: false};
    p.northStar.goal = o.goal || 'Clean outlines from my own notes'; p.northStar.problem = 'Messy notes'; p.northStar.success = 'One outline per paste';
    p.arch.components = o.comps || [{id: 'c1', name: 'Outliner', kind: 'code', role: 'turns pasted notes into an outline', inputs: 'pasted notes', outputs: 'an outline', reason: '', reqIds: []}];
    p.arch.options = [{id: 'o1', name: 'One part', kind: 'workflow', summary: '', scores: {}, pros: [], cons: []}]; p.arch.chosen = 'o1'; p.arch.recommended = 'o1';
    p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: '<role>You outline notes.</role>', reqIds: [], why: '', mirror: ''}];
    p.tests = [{id: 'T1', title: 'A short note', category: 'normal', input: 'buy milk, call mum', simulated: '', reqIds: [], criteria: ['one outline'], heldOut: false},
      {id: 'T2', title: 'An empty paste', category: 'empty', input: '', simulated: '', reqIds: [], criteria: ['says nothing to outline'], heldOut: false}];
    if (o.page){ p.tool.artifacts = [o.page]; p.tool.versions = [{url: o.page, version: 'v-' + p.id + '-1', v: '1.0', at: '2026-10-01T10:00:00.000Z'}]; }
    saveVersion(p, 'first draft');
    if (o.live){ p.live = {v: '1.0', since: '2026-10-01T10:00:00.000Z'}; p.releases = [{v: '1.0', draft: p.versionNo, at: '2026-10-01T10:00:00.000Z', notes: []}]; }
    if (o.kit) p.tool.kitVersion = o.kit;
    if (o.judge) chkSet(p, 'judge', 'apply');
    touch(p); render(); return p.id; },
  P(id){ return WS.projects.find(p => p.id === id); },
  jobs(kind, pid){ return WS.jobs.filter(j => j.kind === kind && (!pid || j.projectId === pid)).map(j => ({id: j.id, status: j.status, applied: !!j.applied, inputs: j.inputs, instructions: j.instructions, fleet: (j.inputs || {}).fleet || ''})); },
  runs(pid){ return JSON.parse(JSON.stringify(arr(JD.P(pid).judges))); },
  async build(pid){ const p = JD.P(pid); flushSaves(); await storeBrief(p); const j = await buildJob(p); return j ? j.id : ''; },
  gate(pid){ return releaseGate(JD.P(pid)).filter(k => /^jdg\\./.test(k)); },
  card(pid){ const p = JD.P(pid), x = queueOf(p).find(y => y.kind === 'jdg'); return x ? {cls: x.cls, who: x.who, hard: !!x.hard, tier: x.tier, noAuto: !!x.noAuto, title: x.title, key: x.key, opts: qOptions(p, x).map(o => ({label: o.label, star: !!o.star, batch: !!o.batch}))} : null; },
  row(){ const r = document.querySelector('.pg-checks [data-anchor="chk:judge"]'); return r ? r.innerText : ''; },
  rel(pid){ const p = JD.P(pid); openProject(pid); p.focus = {ph: 'release', id: null}; pgOpen(p, 'run'); render(); const l = document.querySelector('#publish14 .jdg19-rel'), b = document.querySelector('#publish14 .jdg19-report');
    return {line: l ? l.innerText : '', st: l ? l.dataset.st : '', box: b ? b.innerText : '', btn: !!document.querySelector('#publish14 [data-a=jdg-run]')}; }
};"""

def judged(pg, pid, n=1, ms=20000):
    return until(pg, f"() => arr((WS.projects.find(p => p.id === '{pid}') || {{}}).judges).filter(J => J.state === 'done' || J.state === 'failed').length >= {n}", ms)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, scheme="light"); pg = open_page(ctx); pg.wait_for_timeout(300)
    ev(pg, HELP)

    print("1 the row")
    A = ev(pg, "JD.mk('Judge A notes')"); pg.wait_for_timeout(200)
    L = ev(pg, f"(() => {{ const p = JD.P('{A}'); const L = chkList(p); return {{rows: L.rows.map(x => x.id), judge: L.rows.find(x => x.id === 'judge'), off: arr(L.off).map(x => x.id), pruned: L.pruned.map(x => x.id), gates: CHK_GATES.slice()}}; }})()")
    check("the independent check is a third gate next to the test runs and the attack drill", L["gates"][:3] == ["tests", "drill", "judge"] and "judge" in L["rows"] and L["judge"]["gate"], L)
    check("…on a private tool its row is open: PT neither applies nor skips it", L["judge"]["state"] == "open" and not L["judge"]["fixed"] and ev(pg, f"chkState(JD.P('{A}'), 'judge')") == "open", L["judge"])
    check("…and it waits in the queue as your tap (blocking, yours, never taken by a ★ on its own)", ev(pg, f"(() => {{ const x = queueOf(JD.P('{A}')).find(y => y.ref === 'chk:judge'); return !!x && x.cls === 'block' && x.who === 'you' && x.noAuto === true; }})()"))
    ev(pg, f"pgOpen(JD.P('{A}'), 'review')"); pg.wait_for_timeout(300)
    row = ev(pg, "JD.row()")
    check("the row says why it helps, the cost per run as an estimate, when it is not needed and PT's ★ apply with a reason",
          all(s in row for s in ["Independent check", "Why it helps:", "did not build the tool", "Cost:", "units", "min", "Not needed when:", "★ Apply —", "builder's own report is not proof"]), row[:700])
    check("…what it checks here: the acceptance lines of this tool", "acceptance lines to check on the built tool: 2" in row, row[:500])
    st = ev(pg, f"(() => {{ const p = JD.P('{A}'); const x = chkList(p).rows.find(y => y.id === 'judge'); return chkStar(p, x); }})()")
    check("PT's ★ is apply for every tool (a quiet private one too)", st["v"] == "apply", st)
    a0 = ev(pg, f"arr(JD.P('{A}').acts).filter(a => !a.undone).length")
    pg.locator(".pg-checks [data-a=chk-set][data-id=judge][data-v=apply]").first.click(); pg.wait_for_timeout(250)
    check("a tap applies it, as one Undo step", ev(pg, f"chkState(JD.P('{A}'), 'judge')") == "apply" and ev(pg, f"arr(JD.P('{A}').acts).filter(a => !a.undone).length") == a0 + 1 and ev(pg, f"jdgOn(JD.P('{A}'))"))
    ev(pg, "undo()"); pg.wait_for_timeout(200)
    check("…and Undo opens it again (the gate is off again)", ev(pg, f"chkState(JD.P('{A}'), 'judge')") == "open" and not ev(pg, f"jdgOn(JD.P('{A}'))"))
    S = ev(pg, "JD.mk('Judge S shared', {shared: true})")
    sh = ev(pg, f"(() => {{ const p = JD.P('{S}'); const x = chkList(p).rows.find(y => y.id === 'judge'); return {{fixed: x && x.fixed, state: x && x.state, on: jdgOn(p), q: queueOf(p).some(y => y.ref === 'chk:judge')}}; }})()")
    check("a tool other people use keeps today's behaviour: the gate is fixed on, nothing to tap", sh == {"fixed": True, "state": "apply", "on": True, "q": False}, sh)
    lab = ev(pg, f"""(() => {{ const p = JD.P('{A}'); openProject(p.id); pgOpen(p, 'review'); render(); const r = document.querySelector('.pg-checks [data-anchor=\"chk:lab2\"]');
      return {{text: r ? r.innerText : '', btns: r ? r.querySelectorAll('[data-a]').length : -1, off: r ? r.classList.contains('chk-off') : false, inRows: chkList(p).rows.some(x => x.id === 'lab2'), q: queueOf(p).some(x => x.ref === 'chk:lab2'), set: chkSet(p, 'lab2', 'apply'), st: (chkRowOf(p, 'lab2') || {{}}).v || ''}}; }})()""")
    check("the second-lab row without a key: one row that says why (the key lives only in GitHub), with nothing to tap", lab["off"] and lab["btns"] == 0 and "Second opinion from another lab" in lab["text"] and "SECOND_LAB_API_KEY" in lab["text"] and "cannot be applied" in lab["text"], lab)
    check("…not a row of the tool's checks, not in the queue, and it cannot be applied", not lab["inRows"] and not lab["q"] and lab["set"] is False and lab["st"] == "", lab)
    check("…its cost is shown as an estimate in CHF, billed by the provider outside the Claude plan", re.search(r"about CHF \d+\.\d\d–\d+\.\d\d per review \(estimate", lab["text"]) is not None and "outside your Claude plan" in lab["text"], lab["text"][:600])

    print("2 the judge job after a build job")
    j0 = len(ev(pg, "JD.jobs('judge')"))
    ev(pg, f"JD.build('{A}')")
    until(pg, f"() => {{ const p = JD.P('{A}'); return !!p.report && p.report.via === 'runner'; }}")
    pg.wait_for_timeout(1500)
    check("gate open (private, not tapped): a build result starts no judge", len(ev(pg, "JD.jobs('judge')")) == j0 and not ev(pg, f"JD.runs('{A}')"), ev(pg, f"JD.runs('{A}')"))
    check("…and the release gate asks nothing of it", ev(pg, f"JD.gate('{A}')") == [])
    ev(pg, f"chkSet(JD.P('{A}'), 'judge', 'apply')")
    ev(pg, f"JD.P('{A}').report = null; saveVersion(JD.P('{A}'), 'second draft'); touch(JD.P('{A}'))")
    ev(pg, f"JD.build('{A}')")
    ok = judged(pg, A)
    J = ev(pg, f"JD.jobs('judge', '{A}')")
    R = ev(pg, f"JD.runs('{A}')")
    check("gate applied: the build job's result starts one judge job (kind judge) through the runner", ok and len(J) == 1 and J[0]["status"] in ("done", "sent") and len(R) == 1, [J and J[0]["status"], R])
    i = J[0]["inputs"] if J else {}
    check("…its inputs: the acceptance lines, what was built, the brief; the builder's report only as a separate document", [x["id"] for x in i.get("lines", [])] == ["T1", "T2"] and "pages" in i.get("targets", {}) and i.get("brief", "").endswith(ev(pg, f"briefId(JD.P('{A}'))")) and i.get("builderReport", "").startswith("jdg-")
          and "personSteps" not in json.dumps(i) and "couldNotDo" not in json.dumps(i), i)
    bd = ev(pg, f"(() => {{ const d = window.__mockdb(), k = Object.keys(d).find(k => k.endsWith('/jobs/{i.get('builderReport', 'x')}')); return k ? String(d[k].text || '') : ''; }})()")
    check("…the builder's report waits in that document (read only at step 3)", '"parts"' in bd and '"tests"' in bd, bd[:200])
    ins = J[0]["instructions"] if J else ""
    check("…its instructions: a fresh session, commit first (plan + expected outcome per line), every line with evidence, the report only at step 3, disagreements, hard floors",
          all(s in ins for s in ["INDEPENDENT JUDGE", "fresh session", "1. Commit first", "the outcome you expect", "2. Check.", "with evidence", "is NOT a pass", "3. Only now read the builder's report", "disagreement", "4. Hard floors", "security", "accessibility", '"unknown"', "You only read", '"verdict":"pass"|"fail"']), ins[-900:])
    check("…the run is stored on the project with the draft it judged, green: every line passed with evidence, plan first, both floors", R and R[0]["draft"] == ev(pg, f"JD.P('{A}').versionNo") and R[0]["of"] == "build" and R[0]["green"] is True and R[0]["committed"] is True
          and [l["pass"] for l in R[0]["lines"]] == [True, True] and all(l["evidence"] for l in R[0]["lines"]) and [f["state"] for f in R[0]["floors"]] == ["pass", "pass"], R)
    check("a pass: nothing blocks in the release gate, no block card", ev(pg, f"JD.gate('{A}')") == [] and ev(pg, f"JD.card('{A}')") is None)
    ev(pg, f"pgOpen(JD.P('{A}'), 'review')"); pg.wait_for_timeout(300)
    row = ev(pg, "JD.row()")
    check("the row shows the verdict and each line with its evidence", "passed on this draft" in row and "T1" in row and "opened the page and ran T1" in row and "Floors" in row, row[-700:])
    rl = ev(pg, f"JD.rel('{A}')")
    check("the release checks: a line 'Independent check: passed'; the report area shows the run", rl["st"] == "pass" and "Independent check: passed" in rl["line"] and "Independent check of draft" in rl["box"] and "every acceptance line passed" in rl["box"], rl)
    ev(pg, f"(() => {{ const p = JD.P('{A}'); saveVersion(p, 'third draft'); touch(p); }})()")
    check("a new draft is not judged yet: the gate asks for it (blocking) with a button to run it", ev(pg, f"JD.gate('{A}')") == ["jdg.g.none"] and ev(pg, f"JD.rel('{A}')")["btn"], ev(pg, f"JD.gate('{A}')"))
    # a report read from storage (the GitHub build) starts it too
    ev(pg, f"""(() => {{ const p = JD.P('{A}'); const d = window.__mockdb(), id = briefId(p); storeBrief(p);
      d[wsPath() + '/reports/' + id] = {{brief: id, parts: [{{id: 'c1', built: true}}], checks: [{{step: 1, ok: true}}], tests: [{{id: 'T1', pass: true}}, {{id: 'T2', pass: true}}], artifacts: [], triggers: [], personSteps: [], couldNotDo: []}}; }})()""")
    ev(pg, "ACTIONS['report-check']()")
    ok = judged(pg, A, 2)
    R = ev(pg, f"JD.runs('{A}')")
    check("a build report read from storage (the GitHub build) starts the judge for that draft too", ok and len(R) == 2 and R[1]["draft"] == ev(pg, f"JD.P('{A}').versionNo") and R[1]["src"].startswith("rep:"), R[-1:])
    n2 = len(ev(pg, "JD.jobs('judge')"))
    ev(pg, "ACTIONS['report-check']()"); pg.wait_for_timeout(1500)
    check("…once per draft (reading the report again starts nothing)", len(ev(pg, "JD.jobs('judge')")) == n2)

    print("3 not green blocks the release")
    def rerun(mode, label):
        ev(pg, f"(() => {{ window.__mockJudge = {json.dumps(mode)}; const p = JD.P('{A}'); saveVersion(p, '{label}'); touch(p); }})()")
        n = len(ev(pg, f"JD.runs('{A}')"))
        ev(pg, f"(() => {{ openProject('{A}'); ACTIONS['jdg-run'](); }})()")
        judged(pg, A, n + 1); pg.wait_for_timeout(200)
        return ev(pg, f"JD.runs('{A}')")[-1]
    T1N = ev(pg, f"jdgLineName(JD.P('{A}'), 'T1')")   # "T1 · A short note", or the name alone where ids are hidden (guided)
    check("a line is named by its id and name, or by its name alone where PT hides ids", T1N in ("T1 · A short note", "A short note"), T1N)
    for mode, why in (("fail", "not passed: " + T1N), ("disagree", "disagreements with the build report: 1"), ("floor", "the accessibility floor fails"), ("noplan", "no plan written before the report was read"),
                      ("missing", "not passed: " + T1N.replace("T1", "T2").replace("A short note", "An empty paste")), ("nofloor", "the security floor was not checked")):
        Rx = rerun(mode, "draft " + mode)
        g = ev(pg, f"JD.gate('{A}')"); c = ev(pg, f"JD.card('{A}')")
        check(f"{mode}: not green, the release of that draft is blocked, a block card names why", Rx["green"] is False and g == ["jdg.g.fail"] and c and why in c["title"], [Rx.get("green"), g, c and c["title"]])
    check("…the verdict word alone is never enough: a 'pass' with a disagreement, no plan first, a missing line or an unchecked floor is not green", ev(pg, f"JD.runs('{A}').filter(J => J.verdict === 'pass' && !J.green).length") >= 4)
    check("…a line the check never reported counts as not passed, and an unreported floor as not checked", ev(pg, f"JD.runs('{A}').some(J => J.lines.some(l => l.missing && l.pass === false)) && JD.runs('{A}').some(J => J.floors.every(f => f.state === 'unknown'))"))
    c = ev(pg, f"JD.card('{A}')")
    check("the block card: hard, tier block, yours, blocking, never taken by a ★ on its own; Make fixes (★) / Check again, no batch", c and c["hard"] and c["tier"] == "block" and c["who"] == "you" and c["cls"] == "block" and c["noAuto"]
          and [o["label"] for o in c["opts"]] == ["Make fixes from it", "Check again"] and c["opts"][0]["star"] and not any(o["batch"] for o in c["opts"]), c)
    check("…in the Pick deck it is a hard card, never among the ★ PT may take for you", ev(pg, f"(() => {{ const p = JD.P('{A}'); const x = queueOf(p).find(y => y.kind === 'jdg'); const c = pickQueueCards(p).find(c => c.qkey === x.key); return !!c && !!c.hard && !pickStarable(p).some(s => s.qkey === x.key || s.id === (c && c.id)); }})()"))
    ev(pg, "window.__mockJudge = 'fail'"); Rx = rerun("fail", "draft fix")
    f0 = ev(pg, f"arr(JD.P('{A}').findings).filter(f => f.lens === 'judge').length")
    ev(pg, f"(async () => {{ const p = JD.P('{A}'); const x = queueOf(p).find(y => y.kind === 'jdg'); if (!x) return 'none'; await qDo(p, x, 0); render(); }})()"); pg.wait_for_timeout(300)
    fx = ev(pg, f"(() => {{ const p = JD.P('{A}'); return {{f: arr(p.findings).filter(f => f.lens === 'judge' && f.status === 'open').map(f => f.issue), card: !!queueOf(p).find(y => y.kind === 'jdg'), h: jdgHandled(p, arr(p.judges).slice(-1)[0])}}; }})()")
    check("Make fixes: the failed line becomes a problem PT fixes in the next draft; the card is gone", len(fx["f"]) == f0 + 1 and "T1" in fx["f"][-1] and not fx["card"] and fx["h"]["k"] == "fixes", fx)
    ev(pg, "undo()"); pg.wait_for_timeout(200)
    check("…one Undo step takes it back", ev(pg, f"arr(JD.P('{A}').findings).filter(f => f.lens === 'judge' && f.status === 'open').length") == f0 and ev(pg, f"!!JD.card('{A}')"))
    ev(pg, "window.__mockJudge = 'pending'")
    ev(pg, f"(async () => {{ const p = JD.P('{A}'); const x = queueOf(p).find(y => y.kind === 'jdg'); if (!x) return 'none'; await qDo(p, x, 1); }})()")
    until(pg, f"() => {{ const L = arr(JD.P('{A}').judges); return L.length && L[L.length - 1].state === 'pending'; }}")
    rl = ev(pg, f"JD.rel('{A}')")
    check("Check again: a new run; while it runs the release gate waits ('the independent check is running')", ev(pg, f"JD.gate('{A}')") == ["jdg.g.wait"] and rl["st"] == "wait" and "running" in rl["line"] and not rl["btn"], [ev(pg, f"JD.gate('{A}')"), rl])
    jid = ev(pg, f"arr(JD.P('{A}').judges).slice(-1)[0].job")
    ev(pg, f"""(() => {{ const d = window.__mockdb(), k = jobsColl() + '/{jid}', j = d[k]; window.__mockJudge = undefined; Object.assign(j, window.__mockJudgeOf(j, {{verdict: 'pass', floors: [{{floor: 'security', state: 'pass'}}, {{floor: 'accessibility', state: 'none'}}]}})); }})()""")
    until(pg, f"() => {{ const L = arr(JD.P('{A}').judges); return L.length && L[L.length - 1].state === 'done'; }}")
    check("…its result arrives: green (accessibility 'none' when there is no page), the gate is clear", ev(pg, f"JD.gate('{A}')") == [] and ev(pg, f"arr(JD.P('{A}').judges).slice(-1)[0].green") is True)
    ev(pg, "window.__mockJudge = 'failed'"); Rx = rerun("failed", "draft failed")
    rl = ev(pg, f"JD.rel('{A}')")
    check("a run that could not finish blocks too ('run it again'), with the button", Rx["state"] == "failed" and ev(pg, f"JD.gate('{A}')") == ["jdg.g.failed"] and rl["btn"] and "could not finish" in rl["line"], [Rx.get("state"), rl])
    ev(pg, "window.__mockJudge = undefined; window.__rr = Runner.ready; Runner.ready = () => false")
    rl = ev(pg, f"JD.rel('{A}')")
    check("no runner: one plain line 'Not judged: no background runs here' that does not block, no button", ev(pg, f"JD.gate('{A}')") == [] and rl["st"] == "nobg" and "Not judged: no background runs here" in rl["line"] and not rl["btn"], rl)
    nj = len(ev(pg, "JD.jobs('judge')"))
    ev(pg, f"(() => {{ const p = JD.P('{A}'); saveVersion(p, 'no runner'); p.report = {{at: now(), raw: {{}}, check: checkReport(p, {{parts: [{{id: 'c1', built: true}}], checks: [], tests: [{{id: 'T1', pass: true}}, {{id: 'T2', pass: true}}]}}), via: 'runner', draft: p.versionNo}}; jdgAfterReport(p, 'rep:x'); }})()"); pg.wait_for_timeout(800)
    check("…and no judge job is made", len(ev(pg, "JD.jobs('judge')")) == nj and ev(pg, f"jdgFor(JD.P('{A}'), JD.P('{A}').versionNo)") is None)
    ev(pg, "Runner.ready = window.__rr; WS.settings.autoJobs = false")
    ev(pg, f"(() => {{ const p = JD.P('{A}'); jdgAfterReport(p, 'rep:y'); }})()"); pg.wait_for_timeout(800)
    check("automatic work off (autoOK false): no judge starts by itself; the gate asks for your click", len(ev(pg, "JD.jobs('judge')")) == nj and ev(pg, f"JD.gate('{A}')") == ["jdg.g.none"])
    ev(pg, "WS.settings.autoJobs = true")

    print("4 after an update job")
    UL = ev(pg, "JD.mk('Judge U live', {live: true, judge: true, page: 'https://claude.ai/artifact/JUDGEUUUUUUUUUUUUUUUUU'})")
    ev(pg, f"""(async () => {{ const p = JD.P('{UL}'); const u = {{id: uid('up'), from: '1.0', to: '1.1', changes: [{{k: 'fix', x: 'one fix'}}], state: 'planned', at: now(), inventory: inventoryOf(p)}};
      p.releases.unshift({{v: '1.1', draft: p.versionNo, at: now(), notes: []}}); p.updates.push(u); await updateJob(p, u); }})()""")
    ok = judged(pg, UL)
    R = ev(pg, f"JD.runs('{UL}')")
    check("a verified update job: the judge checks the live version (v1.1), with the page it republished", ok and len(R) == 1 and R[0]["of"] == "update" and R[0]["v"] == "1.1" and R[0]["green"], R)
    ji = [j for j in ev(pg, f"JD.jobs('judge', '{UL}')")][0]
    check("…its targets name the page; the update's own result waits in the builder document", ji["inputs"]["targets"]["pages"] == ["https://claude.ai/artifact/JUDGEUUUUUUUUUUUUUUUUU"] and "of the tool \"Judge U live\" (the live version v1.1)" in ji["instructions"], ji["inputs"]["targets"])
    ev(pg, f"(() => {{ const p = JD.P('{UL}'); saveVersion(p, 'next draft'); touch(p); }})()")
    ga = ev(pg, f"(() => {{ const G = jdgGate(JD.P('{UL}')); return {{st: G && G.st, block: G && G.block, gate: JD.gate('{UL}'), rel: JD.rel('{UL}')}}; }})()")
    check("a live tool with a page: its next draft is judged after the update job republishes it — the release does not wait for that", ga["st"] == "after" and not ga["block"] and ga["gate"] == [] and "follows the update" in ga["rel"]["line"] and not ga["rel"]["btn"], ga)
    ev(pg, "(() => { window.__mockUpdate = (j, res) => Object.assign(res, {verified: false, issues: ['planted']}); })()")
    ev(pg, f"""(async () => {{ const p = JD.P('{UL}'); const u = {{id: uid('up'), from: '1.1', to: '1.2', changes: [{{k: 'fix', x: 'two'}}], state: 'planned', at: now(), inventory: inventoryOf(p)}}; p.updates.push(u); await updateJob(p, u); }})()""")
    until(pg, f"() => arr(JD.P('{UL}').updates).slice(-1)[0].state === 'notverified'"); pg.wait_for_timeout(1200)
    check("an update that was not verified is not judged (it is red already)", len(ev(pg, f"JD.runs('{UL}')")) == 1)
    ev(pg, "window.__mockUpdate = null; window.__mockJudge = 'fail'")
    ev(pg, f"""(async () => {{ const p = JD.P('{UL}'); const u = {{id: uid('up'), from: '1.1', to: '1.3', changes: [{{k: 'fix', x: 'three'}}], state: 'planned', at: now(), inventory: inventoryOf(p)}}; p.releases.unshift({{v: '1.3', draft: p.versionNo, at: now(), notes: []}}); p.updates.push(u); await updateJob(p, u); }})()""")
    judged(pg, UL, 2); pg.wait_for_timeout(200)
    c = ev(pg, f"JD.card('{UL}')")
    check("…a failed check of the live version is a block card too", c and c["hard"] and T1N in c["title"], c)
    ib0 = ev(pg, f"arr(JD.P('{UL}').inbox).filter(i => i.src === 'judge').length")
    ev(pg, f"(async () => {{ const p = JD.P('{UL}'); const x = queueOf(p).find(y => y.kind === 'jdg'); if (!x) return 'none'; await qDo(p, x, 0); }})()"); pg.wait_for_timeout(200)
    ib = ev(pg, f"arr(JD.P('{UL}').inbox).filter(i => i.src === 'judge').map(i => ({{title: i.title, on: i.on, k: i.k}}))")
    check("…its fixes go to the Inbox for the next update (the tool is live)", len(ib) == ib0 + 1 and ib[-1]["on"] and ib[-1]["k"] == "fix" and T1N in ib[-1]["title"], ib)
    ev(pg, "window.__mockJudge = undefined")

    print("5 a kit run needs the judge's pass")
    K = ev(pg, """(() => { for (const p of hr18Live()){ p.tool.kitVersion = hr18KitNow(); touch(p); }
      const id = JD.mk('Judge K kit', {live: true, judge: true, kit: '1.7.0', page: 'https://claude.ai/artifact/JUDGEKKKKKKKKKKKKKKKKK'}); return id; })()""")
    ev(pg, "window.__mockJudge = 'pending'")
    ev(pg, "(async () => { await fl19Start('start'); })()")
    until(pg, f"() => {{ const R = WS.settings.fleetRun; return !!R && R.tools.some(x => x.pid === '{K}' && x.judge && x.judge !== 'start'); }}")
    R = ev(pg, "JSON.parse(JSON.stringify(WS.settings.fleetRun))")
    x = [t for t in R["tools"] if t["pid"] == K][0]
    check("the update is verified with two live checks, and the tool still runs: it waits for the judge", x["state"] == "running" and ev(pg, f"JD.runs('{K}').length") == 1 and ev(pg, f"JD.runs('{K}')[0].fleet") == R["id"], x)
    ev(pg, "UI.view = 'settings'; UI.setTab = 'health'; render()"); pg.wait_for_timeout(300)
    it = ev(pg, f"(() => {{ const e = document.querySelector('.fl19[data-fl19=health] .fl19-it[data-pid=\"{K}\"]'); return e ? e.innerText : ''; }})()")
    check("…its line in the run says the independent check runs on it now", "independent check runs on it now" in it, it)
    jid = ev(pg, f"JD.runs('{K}')[0].job")
    ev(pg, f"""(() => {{ const d = window.__mockdb(), k = jobsColl() + '/{jid}', j = d[k]; window.__mockJudge = undefined; Object.assign(j, window.__mockJudgeOf(j, JSON.parse(JSON.stringify({{verdict: 'pass', floors: [{{floor: 'security', state: 'pass'}}, {{floor: 'accessibility', state: 'pass'}}]}})))); }})()""")
    done = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.doneAt; }", 30000)
    R = ev(pg, "JSON.parse(JSON.stringify(WS.settings.fleetRun))")
    check("…the judge passes: the tool is green (done, on the new kit)", done and [t["state"] for t in R["tools"] if t["pid"] == K] == ["done"] and ev(pg, f"JD.P('{K}').tool.kitVersion") == R["kit"], R and [(t["name"], t["state"], t["note"]) for t in R["tools"]])
    ev(pg, f"(() => {{ JD.P('{K}').tool.kitVersion = '1.7.0'; window.__mockJudge = 'fail'; touch(JD.P('{K}')); }})()")
    ev(pg, "(async () => { await fl19Start('start'); })()")
    stopped = until(pg, "() => { const R = WS.settings.fleetRun; return !!R && !!R.stoppedAt; }", 30000)
    R = ev(pg, "JSON.parse(JSON.stringify(WS.settings.fleetRun))")
    x = [t for t in R["tools"] if t["pid"] == K][0]
    check("a failed judge stops the kit run: the tool needs you, with why", stopped and x["state"] == "needs" and "independent check did not pass" in x["note"] and T1N in x["note"] and ev(pg, f"JD.P('{K}').tool.kitVersion") == "1.7.0", x)
    ev(pg, "(() => { fl19Cancel(); window.__mockJudge = undefined; })()")
    cd = ev(pg, "(() => { UI.modal = {kind: 'fl19go', mode: 'start', wide: true}; render(); const t0 = (document.querySelector('.modal') || {}).innerText || ''; UI.modal = null; render(); return t0; })()")
    check("…and the kit run's put-live card says so before Start", "green only when it passes too" in cd, cd[:600])

    print("6 the second-lab row")
    ev(pg, "UI.modal = null; UI.view = 'settings'; UI.setTab = 'general'; render()"); pg.wait_for_timeout(300)
    s0 = ev(pg, "(() => { const e = document.querySelector('[data-lab2=settings]'); return e ? {text: e.innerText, inputs: [...e.querySelectorAll('input, textarea')].length, sel: !!e.querySelector('select[data-a-change=lab2-prov]')} : null; })()")
    check("Settings › General (kit defaults): 'Second-lab key: not added', how to add it in GitHub, and no field for a key", s0 and "Second-lab key: not added" in s0["text"] and "SECOND_LAB_API_KEY" in s0["text"] and "spending limit" in s0["text"] and s0["inputs"] == 0 and s0["sel"], s0)
    ev(pg, "(() => { const e = document.querySelector('[data-lab2=settings] select'); e.value = 'google'; e.dispatchEvent(new Event('change', {bubbles: true})); })()"); pg.wait_for_timeout(200)
    check("…choosing the provider alone records nothing", not ev(pg, "lab2Set()"))
    pg.locator("[data-lab2=settings] [data-a=lab2-set][data-v=github]").click(); pg.wait_for_timeout(300)
    s1 = ev(pg, "(() => { const e = document.querySelector('[data-lab2=settings]'); return {text: e ? e.innerText : '', set: WS.settings.lab2}; })()")
    check("'I added it in GitHub' records 'added in GitHub as SECOND_LAB_API_KEY (provider: …)' — never a key", "added in GitHub as SECOND_LAB_API_KEY (provider: Google)" in s1["text"] and s1["set"]["key"] == "github" and s1["set"]["provider"] == "google"
          and set(s1["set"].keys()) <= {"key", "provider", "at", "by"}, s1)
    check("…as the GitHub workflow alternates: even ISO weeks the provider's lab, odd weeks a fresh Claude reviewer; the two repository variables named",
          "Even ISO weeks Google reviews, odd weeks a fresh Claude reviewer" in s1["text"] and "SECOND_LAB_PROVIDER" in s1["text"] and "SECOND_LAB_MODEL" in s1["text"], s1["text"])
    opts = ev(pg, "[...document.querySelectorAll('[data-lab2=settings] select option')].map(o => o.value).filter(Boolean)")
    check("…only the providers the workflow's review script speaks (openai, google)", opts == ["openai", "google"], opts)
    lw = ev(pg, "[lab2Lab(lab2Set(), Date.UTC(2026, 10, 9)), lab2Lab(lab2Set(), Date.UTC(2026, 10, 2))]")
    check("…week 46 (even) is Google, week 45 (odd) a fresh Claude reviewer", lw == ["Google", "a fresh Claude reviewer"], lw)
    M = ev(pg, "JD.mk('Judge M mail', {raw: 'Reads my inbox and sends short replies to customers', goal: 'Answer routine e-mails', comps: [{id: 'c1', name: 'Reply writer', kind: 'ai', role: 'writes and sends the replies', inputs: 'a list of mails', outputs: 'sends email replies to customers', reason: '', reqIds: []}]})")
    lm = ev(pg, f"""(() => {{ const p = JD.P('{M}'), q = JD.P('{A}'); const x = chkList(p).rows.find(y => y.id === 'lab2'), y = chkList(q).rows.find(z => z.id === 'lab2');
      return {{x: x && x.state, sx: chkStar(p, x), sy: y && chkStar(q, y), q: queueOf(p).some(z => z.ref === 'chk:lab2')}}; }})()""")
    check("with the key the row is a check like every row: open, in the queue as your tap", lm["x"] == "open" and lm["q"], lm)
    check("…★ apply where a mistake reaches others or costs money (it sends), ★ skip on a quiet private tool", lm["sx"]["v"] == "apply" and "acts outward" in lm["sx"]["why"] and lm["sy"]["v"] == "skip", lm)
    ev(pg, f"pgOpen(JD.P('{M}'), 'review')"); pg.wait_for_timeout(300)
    r2 = ev(pg, "(() => { const r = document.querySelector('.pg-checks [data-anchor=\"chk:lab2\"]'); return r ? r.innerText : ''; })()")
    check("…the row: cost in CHF per review as an estimate, runs only in GitHub builds, this week's reviewer", re.search(r"about CHF \d+\.\d\d–\d+\.\d\d per review \(estimate", r2) is not None and "Google bills it to your key" in r2 and "Runs only in GitHub builds" in r2 and "This week (" in r2, r2[:900])
    br0 = ev(pg, f"buildBriefText(JD.P('{M}'))")
    check("not applied: the brief has no second-lab part", "PART R" not in br0)
    ev(pg, f"chkSet(JD.P('{M}'), 'lab2', 'apply')")
    br = ev(pg, f"buildBriefText(JD.P('{M}'))")
    wk = ev(pg, "lab2Week().label")
    pr = br[br.find("PART R"):]
    check("applied: the brief (PART R) says the GitHub workflow runs the review after the pull request, the key reaches only its script, the builder never calls another lab",
          all(s in pr for s in ["PART R · SECOND-LAB REVIEW (only in the GitHub build", "runs this review itself, after you open the pull request", "reaches only its review script, never you", "Never call another lab, never look for, print, log or write the key", '"reviewSkipped": "only in GitHub builds"', "background runner"]), pr[:700])
    check("…the builder marks the row in tool.json; must-fix / unsure / overthinking, only agreed must-fix fixed, one more opinion, no review loop, result in the pull request",
          all(s in pr for s in ['{"id": "lab2", "v": "apply"} to "decisions"', '"must-fix"', '"unsure"', '"overthinking"', "fixes only agreed must-fix findings", "no review loop", "one more opinion, once", ".checks/<tool folder>/review.json"]), pr[:1400])
    check("…this week's reviewer by ISO week", "ISO week " + wk + ": the reviewer is " in pr and "even weeks Google, odd weeks a fresh Claude reviewer" in pr, pr[:500])
    iss = ev(pg, f"(() => {{ const i = buildIssue(JD.P('{M}')), b = i.body; return {{head: b.slice(0, b.indexOf(String.fromCharCode(10, 10))), url: new URL(i.url).searchParams.get('body') || ''}}; }})()")
    check("…the GitHub build issue: tool.json gets the acceptance lines (for the judge) and the lab2 row (for the review), its link too",
          '"acceptance" as every acceptance line of PART C' in iss["head"] and '{"id": "lab2", "v": "apply"} to "decisions"' in iss["head"] and '{"id": "lab2", "v": "apply"}' in iss["url"] and "SECOND_LAB_API_KEY" not in iss["head"], iss["head"][-500:])
    ev(pg, f"pgOpen(JD.P('{M}'), 'build')"); pg.wait_for_timeout(300)
    bc = ev(pg, "(() => { const e = document.querySelector('.lab2-bld'); return e ? e.innerText : ''; })()")
    check("…the Build page: second opinion in the GitHub build after the pull request; the cloud build skips it (only in GitHub builds)", "second opinion from another lab in the GitHub build, after the pull request opens" in bc and "only in GitHub builds" in bc, bc)
    ev(pg, f"""(() => {{ const p = JD.P('{M}'); p.report = {{at: now(), via: 'runner', draft: p.versionNo, check: checkReport(p, {{parts: [], checks: [], tests: []}}), raw: {{reviews: [], reviewSkipped: 'only in GitHub builds'}}}}; touch(p); pgOpen(p, 'review'); render(); }})()""")
    r3 = ev(pg, "(() => { const r = document.querySelector('.pg-checks [data-anchor=\"chk:lab2\"]'); return r ? r.innerText : ''; })()")
    check("the runner path: the row says 'only in GitHub builds' (built through background runs, no review)", "Only in GitHub builds: this draft was built through background runs" in r3, r3[-400:])
    ev(pg, f"""(() => {{ const p = JD.P('{M}'); p.report = {{at: now(), via: 'paste', draft: p.versionNo, check: checkReport(p, {{parts: [], checks: [], tests: []}}), raw: {{reviews: [{{lab: 'OpenAI', week: '{wk}', findings: [
        {{text: 'The reply can go out without the approval step', judged: 'must-fix', fixed: true}}, {{text: 'Error text is vague', judged: 'unsure', fixed: false}}, {{text: 'Rename the variable', judged: 'overthinking', fixed: false}}, {{text: 'Rate limit missing', judged: 'must-fix', fixed: false}}],
        residual: ['Error text may confuse a customer (asked twice, still unsure)']}}]}}}}; touch(p); }})()""")
    rv = ev(pg, f"(() => {{ const p = JD.P('{M}'); openProject('{M}'); p.focus = {{ph: 'release', id: null}}; pgOpen(p, 'run'); render(); const e = document.querySelector('#publish14 .lab2-rev'); return e ? e.innerText : ''; }})()")
    check("PT shows the reviews of the build report: the lab, the week, how each finding was judged and fixed, the residual risk",
          f"OpenAI · week {wk} · findings: 4 — must-fix 2 (fixed 1), unsure 1, overthinking 1" in rv and "must-fix not fixed: 1" in rv and "Residual risk:" in rv and "asked twice, still unsure" in rv, rv[:700])
    ev(pg, "UI.view = 'settings'; UI.setTab = 'general'; render()"); pg.wait_for_timeout(200)
    pg.locator("[data-lab2=settings] [data-a=lab2-set][data-v=none]").click(); pg.wait_for_timeout(300)
    off = ev(pg, f"(() => {{ const p = JD.P('{M}'); return {{set: !!lab2Set(), on: lab2On(p), brief: buildBriefText(p).includes('PART R'), rows: chkList(p).rows.some(x => x.id === 'lab2'), kept: (chkRowOf(p, 'lab2') || {{}}).v}}; }})()")
    check("'Not added': the row is off again and the brief drops PART R (your tap stays recorded for later)", off == {"set": False, "on": False, "brief": False, "rows": False, "kept": "apply"}, off)

    print("a restore, save + reload, languages, phone")
    rs = ev(pg, f"""(async () => {{ const p = JD.P('{A}'); const rp = addRestore(p, {{kind: 'manual', label: 'before a judge run'}}); const n0 = arr(p.judges).length;
      p.judges = arr(p.judges).concat([{{id: 'jd-after-rp', job: '', src: 'x', of: 'build', draft: p.versionNo, v: '', state: 'done', at: now(), by: 'you', lineIds: [], green: true, lines: [], floors: [], disagreements: [], committed: true}}]); touch(p);
      await doRestore(p, rp.id); const q = JD.P('{A}'); let plain = 'ok'; try{{ const o = clone(q); delete o.judges; const into = keepRecords(o, {{}}); if ('judges' in into) plain = 'judges made up'; }}catch(e){{ plain = e.message; }}
      return {{n0, n: arr(q.judges).length, kept: arr(q.judges).some(J => J.id === 'jd-after-rp'), plain}}; }})()""")
    check("a restore keeps the judge's records (like the build report), also for a tool that never had one", rs["kept"] and rs["n"] == rs["n0"] + 1 and rs["plain"] == "ok", rs)
    ev(pg, f"(async () => {{ const p = JD.P('{A}'); touch(p); flushSaves(); try{{ await saveProject(p); }}catch(e){{ onAppError(e && e.message, 'test'); }} saveWs(); }})()"); pg.wait_for_timeout(1500)
    seed2 = ev(pg, "JSON.stringify(window.__mockdb())")
    ctx2 = b.new_context(viewport={"width": 1440, "height": 900}); ctx2.add_init_script("if (window === window.top) window.__seed = " + seed2 + ";"); ctx2.add_init_script(MOCK)
    pg2 = open_page(ctx2); pg2.wait_for_timeout(500)
    rr = ev(pg2, f"(() => {{ const p = WS.projects.find(x => x.id === '{A}'); return p ? {{n: arr(p.judges).length, lines: arr(p.judges).map(J => arr(J.lineIds).join(',')), green: arr(p.judges).filter(J => J.green === true).length}} : null; }})()")
    check("the judge's record survives save + reload with the tool", rr and rr["n"] == len(ev(pg, f"JD.runs('{A}')")) and "T1,T2" in rr["lines"] and rr["green"] >= 2, rr)
    ctx2.close()
    for lang, probe in (("de", "Unabhängige Prüfung"), ("zh", "独立检查")):
        ev(pg, f"(() => {{ WS.settings.lang = '{lang}'; applySettings(); openProject('{A}'); pgOpen(JD.P('{A}'), 'review'); render(); }})()"); pg.wait_for_timeout(300)
        txt = ev(pg, "(document.querySelector('.pg-checks') || {}).innerText || ''") + ev(pg, f"JD.rel('{A}').line + JD.rel('{A}').box")
        ev(pg, "UI.view = 'settings'; UI.setTab = 'general'; render()"); pg.wait_for_timeout(200)
        txt += ev(pg, "(document.querySelector('[data-lab2=settings]') || {}).innerText || ''")
        check(f"{lang}: the rows, the release line, the report area and the setting in {lang}, no raw keys" + (", no ß" if lang == "de" else ""), probe in txt and not re.findall(RAW, txt) and (lang != "de" or "ß" not in txt), [re.findall(RAW, txt)[:5], txt[:300]])
    ev(pg, "(() => { WS.settings.lang = 'en'; applySettings(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); ev(pg, f"(() => {{ openProject('{A}'); pgOpen(JD.P('{A}'), 'review'); render(); }})()"); pg.wait_for_timeout(400)
    sw = ev(pg, "[document.documentElement.scrollWidth, window.innerWidth, !!document.querySelector('.pg-checks [data-anchor=\"chk:judge\"]')]")
    check("phone width: the judge's row is there and nothing scrolls sideways", sw[2] and sw[0] <= sw[1] + 1, sw)
    pg.set_viewport_size({"width": 1440, "height": 950})
    ctx.close()

    print("7 a preview copy")
    prev = html.replace("const PT_PREVIEW = false;", "const PT_PREVIEW = true;")
    assert "const PT_PREVIEW = true;" in prev
    PV = PAGE.replace(".html", "-preview.html")
    (ROOT / "test" / PV).write_text("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + prev + "</body></html>")
    U0 = U; U = U.replace(PAGE, PV)
    ctx = new_ctx(b, scheme="light"); pg = open_page(ctx); pg.wait_for_timeout(300); U = U0
    ev(pg, HELP)
    P = ev(pg, "JD.mk('Judge P preview', {judge: true})")
    r = ev(pg, f"(async () => {{ const p = JD.P('{P}'); p.report = {{at: now(), raw: {{parts: []}}, check: checkReport(p, {{parts: [{{id: 'c1', built: true}}], checks: [], tests: [{{id: 'T1', pass: true}}, {{id: 'T2', pass: true}}]}}), via: 'runner', draft: p.versionNo}}; const a = await jdgAfterReport(p, 'rep:pv'); const b = await jdgStart(p, {{by: 'you'}}); JOB_APPLY.build({{id: 'job-pv', status: 'done', result: {{}}}}, p); await new Promise(r => setTimeout(r, 800)); return {{a: !!a, b: !!b, jobs: JD.jobs('judge').length, runs: JD.runs(p.id).length, blocked: PREVIEW_BLOCKED.includes('judge')}}; }})()")
    check("the preview: no judge job from a result or a click (startJob refuses the kind there too)", r == {"a": False, "b": False, "jobs": 0, "runs": 0, "blocked": True}, r)
    rl = ev(pg, f"JD.rel('{P}')")
    check("…a plain line 'Not judged: no background runs here', no button, nothing blocks", ev(pg, "PT_PREVIEW") is True and rl["st"] == "nobg" and not rl["btn"] and ev(pg, f"JD.gate('{P}')") == [], rl)
    check("no page errors in the whole run", not errors, errors[:4])
    ctx.close(); b.close()
for f in (PAGE, PAGE.replace(".html", "-preview.html")):
    try: (ROOT / "test" / f).unlink()
    except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
