"""1.8 deciding, on a COPY of the real data (or the made-up bundle) with the mock runtime. Never touches real data.
Covers the owner's decisions for the first screens (PLAN-1.8 §1–4): 1 the ★ shows on hard decisions too, never pre-selected, never
taken by itself (take all ★, Enter, the design pass); 2 your call first on money / who sees it / where data lives: no ★ before your
answer, then the ★ with a first-person reason, both recorded, agreement counted, Undo per step, also on a queue decision; 3 five cards
per round, gap rounds unchanged; 4 a first version needs idea · result · no hard pick · platform (the measure is asked, optional);
5 the mock first: drawn right after the idea from idea + research, yes / not like this is the first decision and feeds the picks,
a technical risk runs a quick try (≤ 2 h job) before the mock, skip and Undo; 6 the start switch per idea (fast / three questions
before any research); 7 an existing product: its price read on the maker's page before the four routes, dated, honest without a
runner; 8 the Bauplan folded on the Design page, one click opens it; old projects keep working; three languages; no page errors.
Run: python3 test/e2e180_decide.py [work/backup-141 | test/fixtures/synthetic.json]"""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=15000):
    try: pg.wait_for_function("AI.running.size === 0", timeout=ms)
    except Exception: pass
    pg.wait_for_timeout(150)
def wait_for(pg, js, ms=10000):
    try: pg.wait_for_function(js, timeout=ms); return True
    except Exception: return False
def undo_last(pg, label_js="null"):   # Undo of your own last step (or the last step with this label)
    return ev(pg, f"""(() => {{ const p = curP(); actClose(p.id); const lab = {label_js}; const a = arr(p.acts).filter(a => !a.undone && (lab ? a.label === lab : a.by === 'you')).slice(-1)[0]; if (!a) return false; undoAct(p, a.id); render(); return true; }})()""")
def last_prompt(pg, task):
    return ev(pg, f"(window.__allPrompts || []).filter(x => x.includes('[[task:{task}]]')).slice(-1)[0] || ''")
def n_calls(pg, task): return ev(pg, f"window.__calls.filter(x => x === '{task}').length")

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)

    print("0 old projects keep working")
    old = ev(pg, "(() => { const p = WS.projects.find(x => pickRead(x).log.length) || WS.projects[0]; return {id: p.id, log: pickRead(p).log.length, dec: arr(p.decisions).length, cards: pickRead(p).cards.length, mock: !!p.mock}; })()")
    ev(pg, "(id) => { openProject(id); UI.home = false; render(); }", old["id"]); pg.wait_for_timeout(700); wait_ai(pg)
    check("an older project opens in its pages without the new start (its picks, decisions and mock stay)", ev(pg, "(o) => { const p = curP(); return pk8Stage(p) === '' && !pickRead(p).mf && pickRead(p).log.length === o.log && arr(p.decisions).length >= o.dec && !!document.querySelector('.pg') && !document.querySelector('.pk8-mf, .pk8-qs, .pk8-spike'); }", old), ev(pg, "[pk8Stage(curP()), pickRead(curP()).log.length, UI.pg]"))

    print("6 the start switch, per idea, next to the idea box")
    ev(pg, "(() => { newProject('Decide 18', {raw: 'A weekly page that ranks my fundraising ideas'}); UI.home = false; render(); })()"); pg.wait_for_timeout(500)
    check("the switch sits with the idea box: fast (chosen) and questions first", ev(pg, "!!document.querySelector('.pk-start .pk8-start [data-a=pk8-start][data-v=fast].on') && !!document.querySelector('.pk-start .pk8-start [data-a=pk8-start][data-v=questions]') && !!document.querySelector('.pk-start textarea#raw, .pk-start [data-a=pk-next]')"))
    pg.locator(".pk-start [data-a=pk8-start][data-v=questions]").first.click(); pg.wait_for_timeout(200)
    check("questions first is kept for this idea; the start button says so", ev(pg, "pickRead(curP()).start === 'questions' && document.querySelector('.pk-start [data-a=pk-next]').textContent.includes(t('pk8.start.goqs'))"))
    undo_last(pg)
    check("Undo takes the switch back to fast", ev(pg, "pickRead(curP()).start !== 'questions' && !!document.querySelector('.pk8-start [data-v=fast].on')"))
    pg.locator(".pk-start [data-a=pk8-start][data-v=questions]").first.click(); pg.wait_for_timeout(200)
    c0, j0, nx0 = ev(pg, "window.__calls.length"), ev(pg, "WS.jobs.length"), n_calls(pg, "pick-next")
    pg.locator(".pk-start [data-a=pk-next]").first.click(); pg.wait_for_timeout(400)
    check("questions first: for whom, what result, how measured, before any research (no AI call, no job)", ev(pg, "pk8Stage(curP()) === 'questions' && !!document.querySelector('.pk-deck .pk8-qs #pk8-q-users') && !!document.querySelector('#pk8-q-result') && !!document.querySelector('#pk8-q-measure') && !pickRead(curP()).research") and ev(pg, "window.__calls.length") == c0 and ev(pg, "WS.jobs.length") == j0, [ev(pg, "pk8Stage(curP())"), ev(pg, "window.__calls.slice(-4)")])
    check("…the next step on the page bar is the questions", ev(pg, "spineState(curP()).next.label === t('pk8.next.questions') && pgStates(curP()).cur === 'picks'"))
    pg.fill("#pk8-q-users", "me and two colleagues"); pg.fill("#pk8-q-result", "a ranked list every Monday"); pg.fill("#pk8-q-measure", "I save an hour a week")
    pg.locator(".pk8-qs button[type=submit]").first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(500); wait_ai(pg)
    check("the three answers are decisions in your name (who → users, result, measure → success)", ev(pg, "(() => { const p = curP(), L = pickRead(p).log.filter(e => e.from === 'start'); return L.length === 3 && p.northStar.users === 'me and two colleagues' && p.northStar.success === 'I save an hour a week' && L.some(e => e.target === 'result' && /ranked list/.test(e.answer)) && L.every(e => p.decisions.some(d => d.pick === e.id)); })()"), ev(pg, "pickRead(curP()).log"))
    check("…and only then the research starts (nothing private in it)", ev(pg, "(() => { const r = pickRead(curP()).research || {}; const j = WS.jobs.find(x => x.id === r.job); return ['running', 'done'].includes(r.state) && !!j && !/Decide 18/.test(j.instructions); })()"), ev(pg, "pickRead(curP()).research"))

    print("5 the mock first")
    check("PT checked which risk comes first (desire here: no quick try)", ev(pg, "(() => { const k = pickRead(curP()); return !!k.mfRisk && k.mfRisk.risk === 'desire' && !k.mfSpike; })()"), ev(pg, "pickRead(curP()).mfRisk"))
    check("the mock is drawn right after the idea: the first decision in the deck, before any pick", ev(pg, "pk8Stage(curP()) === 'mock' && !!curP().mock && !!document.querySelector('.pk-deck .pk8-mf') && !!document.querySelector('.pk-deck .pg-mock iframe.mock-frame[sandbox=\"allow-scripts\"]') && pickRead(curP()).cards.length === 0") and n_calls(pg, "pick-next") == nx0, [ev(pg, "pk8Stage(curP())"), ev(pg, "!!curP().mock"), n_calls(pg, "pick-next") - nx0])
    mp = last_prompt(pg, "mock")
    check("the mock is drawn from the idea, your answers and the research so far (1.7 gave it no project at all)", "fundraising" in mp and "two colleagues" in mp and "This mock comes before any picks" in mp and "<raw_idea>" in mp and "<decisions>" in mp, mp[-1500:])
    check("while the mock waits nothing fills the deck by itself; the next step is the mock", ev(pg, "pickGapCards(curP()) === false && spineState(curP()).next.label === t('pk8.next.mock')"))
    check("the design pass waits for the mock too", ev(pg, "(async () => { const P = await designPass(curP()); return !!P && P.stop === t('pk8.pass.mockfirst') && pickRead(curP()).cards.length === 0; })()"))
    pg.locator(".pk-deck .pg-mock [data-a=mock-yes]").first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(300); wait_ai(pg)
    pn = last_prompt(pg, "pick-next")
    check("“yes, that's it” is the first decision; then the first round of picks, which sees the mock", ev(pg, "(() => { const p = curP(), k = pickRead(p); return pk8Stage(p) === '' && !!k.mfMock && k.mfMock.yes === true && p.mock.status === 'ok' && k.cards.length >= 1 && p.decisions.some(d => d.title.includes(t('mock.title'))); })()") and "<first_mock" in pn, [ev(pg, "pickRead(curP()).mfMock"), ev(pg, "pickRead(curP()).cards.length"), pn[-600:]])
    check("3 a round asks for five cards", "Make the next 5 picks" in pn, re.findall(r"Make the next \d+ picks", pn))
    nc = ev(pg, "pickRead(curP()).cards.length"); nx1 = n_calls(pg, "pick-next")
    undo_last(pg, "t('mock.act.yes')")
    check("Undo of the mock decision: the mock is the open first decision again (the picks wait behind it)", ev(pg, "(n) => { const p = curP(); return pk8Stage(p) === 'mock' && p.mock.status === 'open' && !pickRead(p).mfMock && pickRead(p).cards.length === n && !!document.querySelector('.pk-deck .pk8-mf'); }", nc), ev(pg, "[pk8Stage(curP()), curP().mock.status, pickRead(curP()).mfMock]"))
    pg.locator(".pk-deck .pg-mock [data-a=mock-yes]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    check("deciding again adds no second round while picks are open", n_calls(pg, "pick-next") == nx1 and ev(pg, "pk8Stage(curP()) === ''"))
    pidA = ev(pg, "curP().id")

    print("1 the ★ on hard decisions")
    ev(pg, """(() => { const p = curP(), k = pickOf(p);
      const c = pickCleanCard({q: 'Do you need a permit for street collections?', target: 'legal', hard: true, options: [{label: 'Ask the commune first'}, {label: 'Go ahead'}], rec: 0, recWhy: 'Rules differ by canton', mind: 'If the commune says no permit is needed'}, 1, k);
      c.id = 'pk-h18'; k.cards.unshift(c); touch(p); render(); })()""")
    hc = ev(pg, "pickCard(curP(), 'pk-h18')")
    check("a hard pick keeps PT's ★ with its reason", hc and hc["hard"] and hc["rec"] == 0 and hc["recWhy"] == "Rules differ by canton", hc)
    check("…shown in the first person, saying only you decide", ev(pg, "(() => { const e = document.getElementById('pk-pk-h18'); return !!e && !!e.querySelector('.pk-opt.rec .star') && e.innerText.includes(t('pk8.idpick', {x: 'Ask the commune first'})) && e.innerText.includes(t('pk8.hardwhy')); })()"))
    check("…never pre-selected", ev(pg, "!arr(UI.pkSel['pk-h18']).length && !document.querySelector('#pk-pk-h18 .pk-opt.on')"))
    check("…never taken by 'take all ★', by itself or by the design pass", ev(pg, "(async () => { const p = curP(); const inList = pickStarable(p).some(c => c.id === 'pk-h18'); await pickTakeStars(p); const e = pickAnswer(p, 'pk-h18', {keys: ['A'], assumed: true}); return !inList && !e && !!pickCard(p, 'pk-h18'); })()"))
    ev(pg, "(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); })()"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    check("…and Enter never takes it", ev(pg, "!!pickCard(curP(), 'pk-h18') && !pickRead(curP()).log.some(e => e.cid === 'pk-h18')"))
    pr = last_prompt(pg, "pick-next")
    check("the AI is asked for a ★ on hard decisions too, as a suggestion in the first person", "the ★ is only your suggestion" in pr and "and no recommendation" not in pr, pr[pr.find("Recommend one"):pr.find("Recommend one") + 300] if "Recommend one" in pr else pr[-300:])
    ev(pg, "pickAnswer(curP(), 'pk-h18', {keys: ['A']}); render()")
    check("a hard decision waiting elsewhere in PT shows its ★ on its card in the deck too", ev(pg, "(() => { const p = curP(); p.nsDraft = {goal: 'Rank fundraising ideas weekly'}; const c = pickQueueCards(p).find(c => c.kind === 'nsdecide'); const ok = !!c && c.hard && c.rec >= 0; p.nsDraft = null; render(); return ok; })()"))

    print("2 your call first (money, who sees it, where data lives)")
    ev(pg, """(() => { const p = curP(), k = pickOf(p);
      const c = pickCleanCard({q: 'Who can see the ranked list?', target: 'audience', options: [{label: 'Only me', aud: {customers: false, eu: false}}, {label: 'My team', aud: {customers: true, eu: false}}], rec: 0, recWhy: 'Private first; sharing is one step later', recBasis: 'estimate'}, 1, k);
      c.id = 'pk-a18'; k.cards.unshift(c); touch(p); render(); })()""")
    check("a who-sees-it pick is hard and has a ★ to reveal", ev(pg, "(() => { const c = pickCard(curP(), 'pk-a18'); return c.hard && c.rec === 0 && pk8CardCallFirst(curP(), c); })()"))
    check("before your call: no ★ on the card, no ★ in the lists, the card asks for your answer first", ev(pg, "(() => { const e = document.getElementById('pk-pk-a18'); const x = queueOf(curP()).find(x => x.ref === 'pick:pk-a18'); return !!e && !e.querySelector('.star') && !!e.querySelector('.pk8-callnote') && !e.innerText.includes('Private first') && !qOptions(curP(), x).some(o => o.star); })()"))
    ev(pg, "(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); })()"); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    check("Enter does nothing before your call (no hidden ★ taken)", ev(pg, "!!pickCard(curP(), 'pk-a18') && !(pickRead(curP()).call || {})['pk-a18'] && !pickRead(curP()).log.some(e => e.cid === 'pk-a18')"))
    pg.keyboard.press("B"); pg.wait_for_timeout(200)
    check("your answer is recorded as your call, not yet as the decision", ev(pg, "(() => { const k = pickRead(curP()); return !!k.call && !!k.call['pk-a18'] && k.call['pk-a18'].keys[0] === 'B' && !k.log.some(e => e.cid === 'pk-a18') && !!pickCard(curP(), 'pk-a18'); })()"), ev(pg, "pickRead(curP()).call"))
    check("…then the ★ shows with a first-person reason next to your call", ev(pg, "(() => { const e = document.getElementById('pk-pk-a18'), s = e.innerText; return !!e.querySelector('.pk-opt.rec .star') && s.includes(t('pk8.call.star', {x: 'Only me', why: 'Private first; sharing is one step later'})) && s.includes(t('pk8.call.mine', {x: 'My team'})) && !!e.querySelector('[data-a=pk8-keep]') && !!e.querySelector('[data-a=pk8-star]'); })()"))
    undo_last(pg, "t('pk8.call.act')")
    check("Undo takes your call back (the ★ hides again)", ev(pg, "(() => { const k = pickRead(curP()); return !(k.call && k.call['pk-a18']) && !document.querySelector('#pk-pk-a18 .star'); })()"))
    pg.locator("#pk-pk-a18 [data-a=pk-opt][data-k=B]").first.click(); pg.wait_for_timeout(150)
    pg.locator("#pk-pk-a18 [data-a=pk8-keep]").first.click(); pg.wait_for_timeout(250)
    r = ev(pg, "(() => { const p = curP(), k = pickRead(p), e = k.log.find(e => e.cid === 'pk-a18'), c = arr(k.calls).find(x => x.key === 'pk-a18'); return {e: e && {keys: e.keys, call: e.call}, c, aud: p.audience, pending: !!(k.call && k.call['pk-a18'])}; })()")
    check("“keep my call” decides with your answer; both answers are recorded and that they differed", r["e"] and r["e"]["keys"] == ["B"] and r["c"] and r["c"]["yours"] == ["My team"] and r["c"]["star"] == "Only me" and r["c"]["agreed"] is False and r["c"]["via"] == "deck" and r["aud"]["customers"] is True and not r["pending"], r)
    ev(pg, """(() => { const p = curP(), k = pickOf(p);
      const c = pickCleanCard({q: 'What does the list cost the families?', target: 'money', options: [{label: 'Free'}, {label: 'CHF 5 a month'}], rec: 0, recWhy: 'Families in need should not pay'}, 1, k);
      c.id = 'pk-m18'; k.cards.unshift(c); touch(p); render(); })()""")
    pg.locator("#pk-pk-m18 [data-a=pk-opt][data-k=A]").first.click(); pg.wait_for_timeout(150)
    check("a combinable pick: you select, then the button states your call (still no ★)", ev(pg, "(() => { const e = document.getElementById('pk-pk-m18'); return !!e && !e.querySelector('.star') && e.querySelector('[data-a=pk-use]').textContent.includes(t('pk8.call.use', {n: 1})) && !(pickRead(curP()).call || {})['pk-m18']; })()"))
    pg.locator("#pk-pk-m18 [data-a=pk-use]").first.click(); pg.wait_for_timeout(150)
    check("when your call and the ★ agree, the card says so and asks you to confirm", ev(pg, "(() => { const e = document.getElementById('pk-pk-m18'); return !!e && e.innerText.includes(t('pk8.call.same')) && !!e.querySelector('[data-a=pk8-keep]') && !e.querySelector('[data-a=pk8-star]'); })()"))
    pg.locator("#pk-pk-m18 [data-a=pk8-keep]").first.click(); pg.wait_for_timeout(250)
    check("how often you and PT agreed is counted and shown", ev(pg, "(() => { const L = arr(pickRead(curP()).calls); const s = document.querySelector('.pk-ov') ? document.querySelector('.pk-ov').innerText : ''; return L.length === 2 && L.filter(x => x.agreed).length === 1 && s.includes(t('pk8.call.stats', {a: 1, b: 2})); })()"), ev(pg, "arr(pickRead(curP()).calls)"))
    undo_last(pg)
    check("Undo of the decision: the pick is open again, at your call, and its record goes", ev(pg, "(() => { const k = pickRead(curP()); return !!pickCard(curP(), 'pk-m18') && !k.log.some(e => e.cid === 'pk-m18') && arr(k.calls).length === 1 && !!(k.call && k.call['pk-m18']); })()"), ev(pg, "[pickRead(curP()).call, arr(pickRead(curP()).calls).length]"))
    pg.locator("#pk-pk-m18 [data-a=pk8-keep]").first.click(); pg.wait_for_timeout(200)

    print("3 five cards per round; gap rounds unchanged")
    r = ev(pg, """async () => { const o = window.__mockOverride; let pr = '';
      window.__mockOverride = (task, prompt) => { if (task === 'pick-next'){ pr = prompt; return {candidates: [], cards: Array.from({length: 6}, (_, i) => ({q: 'Round card ' + i + ' ' + ['amber','birch','cedar','delta','ember','fjord'][i] + '?', why: 'w', target: 'decision', options: [{label: 'Yes ' + i}, {label: 'No ' + i}], rec: 0, recWhy: 'x'})), enough: false, likelyWrong: ''}; } return o ? o(task, prompt) : null; };
      const k = pickOf(curP()); k.cards = []; const n0 = 0; await aiPickNext(curP()); window.__mockOverride = o; render();
      return {asked: (/Make the next (\\d+) picks/.exec(pr) || [])[1], kept: pickRead(curP()).cards.filter(c => /^Round card/.test(c.q)).length, shown: document.querySelectorAll('.pk-deck > .pk-card').length}; }""")
    check("a round asks for 5 and keeps 5 (the sixth is dropped)", r["asked"] == "5" and r["kept"] == 5, r)
    check("…all five are on the screen (a phone still shows one at a time)", r["shown"] >= 5, r)
    r = ev(pg, """async () => { const o = window.__mockOverride; let pr = ''; const p = curP(); p.northStar.goal = ''; pickOf(p).cards = []; pickOf(p).gapAt = '';
      window.__mockOverride = (task, prompt) => { if (task === 'pick-next'){ pr = prompt; return {cards: [{q: 'What is the idea, in one line?', target: 'ns.goal', options: [{label: 'Rank ideas'}, {label: 'Find ideas'}], rec: 0, recWhy: 'x'}], candidates: [], enough: false, likelyWrong: ''}; } return o ? o(task, prompt) : null; };
      const gaps = pickGaps(p); const started = pickGapCards(p); await new Promise(r => setTimeout(r, 100)); await new Promise(r => { const f = () => AI.running.size ? setTimeout(f, 80) : r(); f(); }); window.__mockOverride = o;
      return {gaps, started, asked: (/Make the next (\\d+) picks/.exec(pr) || [])[1]}; }""")
    check("a gap round still asks for exactly the missing picks", r["started"] and r["asked"] == str(min(3, len(r["gaps"]))) and "measure" not in r["gaps"], r)
    ev(pg, "(() => { const p = curP(); p.northStar.goal = 'Rank my fundraising ideas every week'; p.northStar.problem = 'Ideas get lost'; render(); })()")

    print("4 ready for a first version without the measure")
    check("readiness: idea · result · no hard pick open · platform checked (no measure)", ev(pg, "pickReady(curP()).map(x => x.id).join(',')") == "idea,result,hard,platform", ev(pg, "pickReady(curP()).map(x => x.id)"))
    r = ev(pg, """(() => { const p = curP(), k = pickOf(p); goalOf(p).criteria = []; p.northStar.success = ''; k.log = k.log.filter(e => !['measure', 'crit', 'ns.success'].includes(e.target)); p.audience = {customers: false, eu: false};
      k.platform = 'Claude'; k.platformParts = [{part: 'weekly scheduled research', status: 'documented', by: 'pt', at: now()}]; for (const c of k.cards.filter(c => c.hard)) c.parked = false; k.cards = k.cards.filter(c => !c.hard); render();
      return {ready: pickReady(p), btn: !!document.querySelector('#pk-try [data-a=pk-try]'), chip: !!document.querySelector('#pk-try') && document.querySelector('#pk-try').innerText.includes(t('pk8.measure.opt')), ctx: pickContext(p).includes('<measure_not_decided>')}; })()""")
    check("with no measure at all a first version can be tried", all(x["ok"] for x in r["ready"]) and r["btn"], r)
    check("the measure stays a pick: shown as optional and still asked by the AI", r["chip"] and r["ctx"], r)

    print("5b not like this, and the quick technical try")
    ev(pg, "window.__pickRisk = {risk: 'technical', why: 'The bank export may not exist', spike: {question: 'Does the bank offer a CSV export of statements?', try: 'Read the bank documentation and try a sample file', pass: 'A sample export opens with dates and amounts'}}")
    ev(pg, "(() => { newProject('Decide 18 B', {raw: 'A page that reads my bank statements and sorts my spending'}); UI.home = false; render(); })()"); pg.wait_for_timeout(400)
    pg.locator(".pk-start [data-a=pk-next]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    ok = wait_for(pg, "(() => { const k = pickRead(curP()); return !!k.mfSpike && k.mfSpike.state === 'done' && !!curP().mock && AI.running.size === 0; })()", 15000); wait_ai(pg)
    r = ev(pg, "(() => { const p = curP(), k = pickRead(p), j = WS.jobs.find(x => x.kind === 'spike' && x.projectId === p.id); return {sp: k.mfSpike, risk: k.mfRisk && k.mfRisk.risk, job: !!j, ins: j ? j.instructions : '', mock: !!p.mock, stage: pk8Stage(p)}; })()")
    check("a technical risk runs a quick try before the mock: a background job, at most 2 hours, that only tries", ok and r["risk"] == "technical" and r["job"] and "at most 2 hours" in r["ins"] and "Never sign up" in r["ins"] and r["sp"]["verdict"] == "works", r)
    check("…the mock follows the try and is drawn with what it found", r["mock"] and r["stage"] == "mock" and "quick_technical_try" in last_prompt(pg, "mock"), r)
    check("…and the deck says what the try found", ev(pg, "document.querySelector('.pk-deck .pk8-mf').innerText.includes(t('pk8.sp.res.works', {x: pickRead(curP()).mfSpike.found}))"))
    pidB = ev(pg, "curP().id")
    ev(pg, "(() => { window.__keepReady = Runner.ready; Runner.ready = () => false; newProject('Decide 18 E', {raw: 'A page that reads my bank statements'}); UI.home = false; render(); })()"); pg.wait_for_timeout(200)
    pg.locator(".pk-start [data-a=pk-next]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    check("without background runs the quick try cannot run: PT says so and offers to draw the mock now (nothing pretends)", ev(pg, "(() => { const k = pickRead(curP()); return pk8Stage(curP()) === 'spike' && k.mfSpike.state === 'norun' && !curP().mock && document.querySelector('.pk8-spike').innerText.includes(t('pk8.sp.norun')); })()"), ev(pg, "pickRead(curP()).mfSpike"))
    ev(pg, "(() => { Runner.ready = window.__keepReady; })()")
    pg.locator(".pk8-spike [data-a=pk8-skipspike]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    check("…and draws it on your click", ev(pg, "!!curP().mock && pk8Stage(curP()) === 'mock'"))
    ev(pg, "(id) => { openProject(id); UI.home = false; render(); }", pidB); pg.wait_for_timeout(300)
    ev(pg, "window.__pickRisk = null")
    ev(pg, "(() => { const p = curP(); pickOf(p).mfSpike = {state: 'running', job: 'job-none', at: now(), question: 'Does the bank offer a CSV export of statements?'}; p.mock = null; render(); })()")
    check("while the quick try runs, the deck shows it (the question, ≤ 2 h) with a way to draw the mock now", ev(pg, "pk8Stage(curP()) === 'spike' && !!document.querySelector('.pk-deck .pk8-spike [data-a=pk8-skipspike]') && document.querySelector('.pk8-spike').innerText.includes('CSV export') && spineState(curP()).next.label === t('pk8.next.spike')"))
    pg.locator(".pk8-spike [data-a=pk8-skipspike]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    check("“draw the mock now” skips the rest of the try and draws it", ev(pg, "!!pickRead(curP()).mfSpike.skipped && !!curP().mock && pk8Stage(curP()) === 'mock'"))
    check("4 the measure shows as optional in a project that never had one", ev(pg, "(() => { const p = curP(); return !pk8MeasureOK(p) && pickContext(p).includes('<measure_not_decided>'); })()"))
    nx2 = n_calls(pg, "pick-next")
    pg.locator(".pk-deck .pg-mock [data-a=mock-note-open]").first.click(); pg.wait_for_timeout(150)
    pg.fill("#mock-note-in", "the list of the biggest costs first"); pg.locator(".pk-deck .pg-mock form.mock-note button[type=submit]").first.click(); pg.wait_for_timeout(400); wait_ai(pg); pg.wait_for_timeout(300); wait_ai(pg)
    pn = last_prompt(pg, "pick-next")
    check("“not like this” is the first decision too: the picks start and carry what you said", ev(pg, "(() => { const k = pickRead(curP()); return !!k.mfMock && k.mfMock.yes === false && pk8Stage(curP()) === '' && k.cards.length >= 1; })()") and n_calls(pg, "pick-next") > nx2 and "what_the_person_said_about_the_mock" in pn and "biggest costs first" in pn, [ev(pg, "pickRead(curP()).mfMock"), pn[-500:]])
    check("…and PT draws the mock again with your note (v2, to decide later)", ev(pg, "curP().mock.v === 2 && curP().mock.status === 'open' && curP().mock.notes.includes('the list of the biggest costs first')"))
    ev(pg, "(() => { newProject('Decide 18 C', {raw: 'A small checklist page'}); UI.home = false; render(); })()"); pg.wait_for_timeout(300)
    pg.locator(".pk-start [data-a=pk-next]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    ev(pg, "(() => { const b = document.querySelector('.pk-deck .pk8-mf [data-a=pk8-skipmock]'); if (b) b.click(); })()"); pg.wait_for_timeout(300); wait_ai(pg)
    check("the mock can be skipped: recorded as a decision, then the picks", ev(pg, "(() => { const p = curP(), k = pickRead(p); return !!k.mfMock && k.mfMock.skipped && pk8Stage(p) === '' && p.decisions.some(d => d.choice === t('pk8.mf.skipped')) && k.cards.length >= 1; })()"))
    ev(pg, "(() => { newProject('Decide 18 D', {raw: ''}); UI.home = false; render(); })()"); pg.wait_for_timeout(200)
    ev(pg, "ACTIONS['pk-next']()"); pg.wait_for_timeout(200)
    check("without an idea, Start asks for it first (nothing runs)", ev(pg, "!pickRead(curP()).mf && pk8Stage(curP()) === '' && !!document.querySelector('.pk-start')"))

    print("7 an existing product: the price first, dated")
    ev(pg, "(() => { newProject('Dictation 18', {raw: 'A dictation tool like Wispr Flow, just for me'}); UI.home = false; render(); })()"); pg.wait_for_timeout(200)
    check("the four routes wait for the price (none shown yet); the deck says the price comes first", ev(pg, "kit7Applies(curP()) && !queueOf(curP()).some(x => x.kind === 'kit-rebuild') && !!document.querySelector('.pk-deck .pk8-price [data-a=pk8-price]') && document.querySelector('.pk8-price').innerText.includes('wispr flow')"))
    pg.locator(".pk-deck .pk8-price [data-a=pk8-price]").first.click(); pg.wait_for_timeout(150)
    check("…PT reads the price on the maker's page (the research job, no new network code)", ev(pg, "(() => { const pr = pk8Price(curP()), j = pr && WS.jobs.find(x => x.id === pr.job); return !!pr && pr.product === 'wispr flow' && !!j && j.kind === 'pickres' && j.inputs.mode === 'price' && /maker's own website/.test(j.instructions) && /never sign up/.test(j.instructions); })()"), ev(pg, "pk8Price(curP())"))
    check("…and the routes still wait while it reads", ev(pg, "pk8Price(curP()).state !== 'running' || !queueOf(curP()).some(x => x.kind === 'kit-rebuild')"))
    wait_for(pg, "pk8Price(curP()) && pk8Price(curP()).state === 'done'", 8000); pg.wait_for_timeout(200); ev(pg, "render()")
    x = ev(pg, "(() => { const x = queueOf(curP()).find(x => x.kind === 'kit-rebuild'); return x ? {why: x.why, opts: qOptions(curP(), x).map(o => [o.label, o.why, !!o.star])} : null; })()")
    check("then the four routes show, with the price and the day it was read", bool(x) and "USD 15" in x["why"] and "2026-10-30" in x["why"], x)
    check("…'pay for it' carries the price; the design prompt gets it as material", x and any("USD 15" in o[1] for o in x["opts"]) and ev(pg, "buildPrompt('architecture', {proj: curP(), rules: ['simple'], body: 'd', schema: '{}'}).includes('maker_price')"), x)
    key = ev(pg, "queueOf(curP()).find(x => x.kind === 'kit-rebuild').key")
    check("2 on the cover the route row asks for your call (its options, no one-click ★)", ev(pg, "(k) => { UI.home = true; render(); const row = [...document.querySelectorAll('.pg-cover .pg-row')].find(r => r.querySelector('[data-a=pk-q][data-key=\"' + k + '\"]')); const ok = !!row && !row.querySelector('[data-a=q-do]') && row.querySelectorAll('[data-a=pk-q]').length >= 3; UI.home = false; render(); return ok; }", key))
    ev(pg, "(() => { const p = curP(); p.audience = {customers: false, eu: false}; p.northStar.goal = 'Dictate into any app'; p.northStar.problem = 'Typing is slow'; touch(p); render(); })()")   # the route card comes first in the deck
    check("the route card is in the deck", ev(pg, "(k) => !!document.querySelector('.pk-deck [data-a=pk-q][data-key=\"' + k + '\"]')", key), ev(pg, "pickQueueCards(curP()).map(c => c.kind)"))
    check("2 the route is a money decision: your call first (no ★ on the card or in the lists yet)", ev(pg, "(k) => { const b = document.querySelector('[data-a=pk-q][data-key=\"' + k + '\"]'), card = b && b.closest('.pk-card'); const x = queueOf(curP()).find(y => y.key === k); return !!card && !card.querySelector('.star') && !!card.querySelector('.pk8-callnote') && !qOptions(curP(), x).some(o => o.star); }", key))
    pay = ev(pg, "(k) => { const x = queueOf(curP()).find(y => y.key === k); return PK8_QO(curP(), x).findIndex(o => o.label === t('kit.rb.pay')); }", key)
    pg.locator(f'[data-a=pk-q][data-key="{key}"][data-i="{pay}"]').first.click(); pg.wait_for_timeout(250)
    check("…your call (pay for it) is kept; the ★ (clean-room) shows with its reason", ev(pg, "(k) => { const b = document.querySelector('[data-a=pk8-star][data-key=\"' + k + '\"]'), card = b && b.closest('.pk-card'); return !kitDecided(curP(), 'rebuild', KIT_REBUILD) && !!pk8CallOf(curP(), k) && !!card && !!card.querySelector('.star') && card.innerText.includes(t('pk8.call.mine', {x: t('kit.rb.pay')})); }", key))
    pg.locator(f'[data-a=pk8-star][data-key="{key}"]').first.click(); pg.wait_for_timeout(300)
    r = ev(pg, "(k) => ({kind: (kitDecided(curP(), 'rebuild', KIT_REBUILD) || {}).kind, rec: arr(pickRead(curP()).calls).find(x => x.key === k)})", key)
    check("…'take ★ instead' decides clean-room; your call and the ★ are both recorded", r["kind"] == "clean" and r["rec"] and r["rec"]["yours"] == [ev(pg, "t('kit.rb.pay')")] and r["rec"]["final"] == [ev(pg, "t('kit.rb.clean')")] and r["rec"]["agreed"] is False, r)
    undo_last(pg)
    check("…Undo takes the route back to your call", ev(pg, "(k) => !kitDecided(curP(), 'rebuild', KIT_REBUILD) && !!pk8CallOf(curP(), k) && !arr(pickRead(curP()).calls).some(x => x.key === k)", key), ev(pg, "(k) => [kitRead(curP()).rebuild, pk8CallOf(curP(), k)]", key))
    ev(pg, "(() => { const p = newProject('Loom 18', {raw: 'A screen recorder like Loom, only for me'}); openProject(p.id); UI.home = false; render(); })()"); pg.wait_for_timeout(800)
    check("opening a project whose idea names a product reads its price by itself", ev(pg, "(() => { const pr = pk8Price(curP()); return !!pr && pr.product === 'loom' && ['running', 'done'].includes(pr.state); })()"), ev(pg, "pk8Price(curP())"))
    r = ev(pg, """(() => { const keep = Runner.ready; Runner.ready = () => false; newProject('Notes 18', {raw: 'Like Notion but simpler, only for me'}); UI.home = false; render();
      const x = queueOf(curP()).find(x => x.kind === 'kit-rebuild'); Runner.ready = keep; return x ? x.why : null; })()""")
    check("without background runs the routes show at once, saying honestly the price was not read", r and ev(pg, "t('pk8.price.none', {x: 'notion', why: t('pk8.price.norun')})") in r, r)

    print("8 the Bauplan folded on the Design page")
    pidm = ev(pg, "(() => { let p = WS.projects.find(x => arr(x.arch.components).length >= 2 && x.status !== 'archived'); if (!p){ p = curP(); p.arch.components = [{id: 'c1', name: 'Intake', kind: 'code', role: 'reads', inputs: '', outputs: '', reqIds: []}, {id: 'c2', name: 'Ranker', kind: 'ai', role: 'ranks', inputs: '', outputs: '', reqIds: []}]; touch(p); } openProject(p.id); return p.id; })()")
    pg.wait_for_timeout(500); ev(pg, "pgOpen(curP(), 'design')"); pg.wait_for_timeout(400)
    n = ev(pg, "arr(curP().arch.components).length")
    check("the Design page shows the Bauplan folded: a header and one button, no parts drawn", ev(pg, "(() => { const m = document.querySelector('.pg[data-page=design] .pg-map'); return !!m && m.classList.contains('folded') && !m.querySelector('.part, .mpart, [data-a=selpart]') && !!m.querySelector('[data-a=pk8-map][aria-expanded=false]'); })()"), ev(pg, "(() => { const m = document.querySelector('.pg-map'); return m ? m.outerHTML.slice(0, 300) : 'no map'; })()"))
    pg.locator(".pg[data-page=design] [data-a=pk8-map]").first.click(); pg.wait_for_timeout(300)
    check("one click opens it with every part", ev(pg, f"(() => {{ const m = document.querySelector('.pg[data-page=design] .pg-map'); return !!m && !m.classList.contains('folded') && m.querySelectorAll('.part, .mpart, [data-a=selpart]').length >= {n} && !!m.querySelector('[data-a=pk8-map][aria-expanded=true]'); }})()"))
    pg.locator(".pg[data-page=design] [data-a=pk8-map]").first.click(); pg.wait_for_timeout(200)
    check("…and one click folds it again (screen state, not an Undo step)", ev(pg, "!!document.querySelector('.pg[data-page=design] .pg-map.folded') && !arr(curP().acts).some(a => /pk8-map|blueprint/i.test(a.label))"))

    print("9 three languages")
    raw = []
    ev(pg, "(id) => { openProject(id); UI.home = false; render(); }", pidA); pg.wait_for_timeout(300)
    ev(pg, "(() => { const p = curP(), k = pickOf(p); k.cards.unshift(Object.assign(pickCleanCard({q: 'Who sees it?', target: 'audience', options: [{label: 'Me', aud: {customers: false, eu: false}}, {label: 'Everyone', aud: {customers: true, eu: false}}], rec: 0, recWhy: 'x'}, 1, k), {id: 'pk-l18'})); render(); })()")
    for lang in ["de", "zh"]:
        ev(pg, f"(() => {{ LANG = '{lang}'; render(); }})()"); pg.wait_for_timeout(100)
        txt = ev(pg, "document.querySelector('.app').innerText")
        ev(pg, "(() => { const p = WS.projects.find(x => x.name === 'Decide 18 D'); if (p){ openProject(p.id); UI.home = false; render(); } })()"); pg.wait_for_timeout(150)
        txt += ev(pg, "document.querySelector('.app').innerText")
        ev(pg, "(id) => { openProject(id); UI.home = false; render(); }", pidA); pg.wait_for_timeout(150)
        if re.search(r"\bpk8\.[a-z]", txt) or "ß" in txt: raw.append([lang, re.findall(r"pk8\.[a-z.]+", txt)[:5]])
    ev(pg, "(() => { LANG = 'en'; render(); })()")
    check("the new screens in German and Chinese: no raw keys, no ß", not raw, raw)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:8]: print("  ERR", e)
sys.exit(1 if fails or errors else 0)
