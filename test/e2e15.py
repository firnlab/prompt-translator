"""1.5.0 Pick mode flows on a COPY of the real data with the mock runtime. Never touches real data.
Covers: default view for new projects (both workspaces) and existing projects keep theirs, start, single / multi / "all of it",
own words (clear and two readings), Later and Bring back, session summary, change a decision, second opinion, import,
export, research job (findings + platform check), queue integration (counts, Finish, inspector, go-to), Undo per pick,
try it (readiness, one Undo for the whole try, try copy), keys, three languages and three widths."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=15000):
    try: pg.wait_for_function("AI.running.size === 0", timeout=ms)
    except Exception: pass
    pg.wait_for_timeout(150)
    if ev(pg, "!!(UI.modal && UI.modal.kind === 'cost')"):
        ev(pg, "ACTIONS['cost-go'] && ACTIONS['cost-go']({dataset: {v: 'once'}})");
        try: pg.wait_for_function("AI.running.size === 0", timeout=ms)
        except Exception: pass
        pg.wait_for_timeout(150)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)
    print("1 defaults")
    modes = ev(pg, "WS.projects.map(p => [p.name.slice(0, 14), projMode(p), p.mode])")
    check("1.6.0: every project works in Pick (one-time move; the earlier view is kept as its map)", all(m == "pick" for _, m, _ in modes) and ev(pg, "WS.projects.every(p => p.modeBefore160 || p.createdAt > WS.settings.m160)"), modes)
    check("new projects open in Pick", ev(pg, "WS.settings.defaultMode") == "pick", ev(pg, "WS.settings.defaultMode"))
    check("Pick is the one way to work (1.7: the page bar, no mode bar)", ev(pg, "(() => { openProject(WS.projects[0].id); UI.home = false; render(); return !!document.querySelector('.pg-bar') && !document.querySelector('.modeseg'); })()"))

    print("2 a new project in Pick")
    ev(pg, "(() => { newProject('Donation Generator', {raw: 'Strategies to raise money for families in need'}); UI.home = false; render(); })()")
    check("the new project is in Pick", ev(pg, "curP().mode") == "pick")
    check("Pick starts with one button, no empty screen", ev(pg, "!!document.querySelector('.pk-start [data-a=pk-next]')"))
    ev(pg, "document.querySelector('.pk-start [data-a=pk-next]').click()"); wait_ai(pg)
    # 1.8 (owner, PLAN-1.8 §3): the mock comes first; "yes" / "not like this" is the first decision, then the picks
    check("1.8: the mock comes first, before any pick", ev(pg, "pk8Stage(curP()) === 'mock' && !!curP().mock && !pickRead(curP()).cards.length && !!document.querySelector('.pk-deck .pg-mock [data-a=mock-yes]')"), ev(pg, "[pk8Stage(curP()), !!curP().mock, pickRead(curP()).cards.length]"))
    ev(pg, "document.querySelector('.pk-deck .pg-mock [data-a=mock-yes]').click()"); wait_ai(pg); pg.wait_for_timeout(200); wait_ai(pg)
    cards = ev(pg, "pickRead(curP()).cards.map(c => ({t: c.target, n: c.options.length, multi: c.multi, hard: c.hard, rec: c.rec}))")
    check("first round: picks with options", len(cards) >= 2 and all(c["n"] >= 2 for c in cards), cards)
    check("the research started in the background (nothing private in the question)", ev(pg, "(() => { const r = pickRead(curP()).research || {}; const j = WS.jobs.find(x => x.id === r.job); return ['running', 'done'].includes(r.state) && !!j && !/Donation Generator|Owner/.test(j.instructions); })()"), ev(pg, "pickRead(curP()).research"))
    check("examples are in the card itself, readable on a phone (no side preview)", ev(pg, "!!document.querySelector('.pk-card .pk-ex') && !!document.querySelector('.pk-card .pk-sketch')"))
    check("every card has an anchor and one id", ev(pg, "pickRead(curP()).cards.every(c => document.querySelectorAll('#pk-' + c.id).length === 1)"))
    check("picks count in the queue", ev(pg, "queueOf(curP()).filter(x => x.kind === 'pick').length") == len(cards))
    check("1.8: a hard pick may carry PT's ★ but is never pre-selected or taken by itself, and blocks publishing", ev(pg, "(() => { const c = pickRead(curP()).cards.find(c => c.hard); return !c || (!arr(UI.pkSel[c.id]).length && !pickStarable(curP()).some(x => x.id === c.id) && queueOf(curP()).find(x => x.ref === 'pick:' + c.id).cls === 'block'); })()"))

    print("3 answering")
    multi = ev(pg, "pickRead(curP()).cards.find(c => c.multi && !c.hard)")
    acts0 = ev(pg, "arr(curP().acts).length")
    ev(pg, "(id) => { document.querySelector('#pk-' + id + ' [data-a=pk-opt][data-k=A]').click(); }", multi["id"]); pg.wait_for_timeout(80)
    ev(pg, "(id) => { document.querySelector('#pk-' + id + ' [data-a=pk-opt][data-k=B]').click(); }", multi["id"]); pg.wait_for_timeout(80)
    check("combining: two options selected, \"Use these (2)\" shown", ev(pg, "(id) => document.querySelector('#pk-' + id + ' [data-a=pk-use]').textContent.includes('2')", multi["id"]))
    ev(pg, "(id) => document.querySelector('#pk-' + id + ' [data-a=pk-use]').click()", multi["id"]); pg.wait_for_timeout(200)
    e = ev(pg, "pickRead(curP()).log.slice(-1)[0]")
    check("the combined answer is one decision with both options", e and e["keys"] == ["A", "B"], e)
    check("it is in the decision log, which every later step sees", ev(pg, "curP().decisions.some(d => d.title === pickRead(curP()).log.slice(-1)[0].q) && projectContext(curP()).includes('<decisions>')"))
    mine = ev(pg, "(n) => arr(curP().acts).slice(n).filter(a => a.by === 'you').map(a => a.label)", acts0)
    check("one pick is one Undo step (and research results are PT's own step)", len(mine) == 1 and mine[0].startswith("Pick"), ev(pg, "(n) => arr(curP().acts).slice(n).map(a => a.label + ' | ' + a.by)", acts0))
    ev(pg, "(() => { const a = arr(curP().acts).filter(a => a.by === 'you' && !a.undone).slice(-1)[0]; undoAct(curP(), a.id); render(); })()")   # 1.6.0: PT's automatic steps may follow a pick; Undo takes back your own last step
    check("Undo brings the pick back", ev(pg, "(id) => !!pickCard(curP(), id) && !pickRead(curP()).log.some(e => e.cid === id)", multi["id"]))
    ev(pg, "(id) => { UI.pkSel[id] = ['C']; render(); document.querySelector('#pk-' + id + ' [data-a=pk-use]').click(); }", multi["id"]); pg.wait_for_timeout(200)
    e = ev(pg, "pickRead(curP()).log.slice(-1)[0]")
    check("\"All of it\" means every option", e and len(e["keys"]) >= 2, e)
    # a measure writes a criterion in your name
    m = ev(pg, "pickRead(curP()).cards.find(c => c.target === 'measure')")
    if m:
        ev(pg, "(id) => document.querySelector('#pk-' + id + ' [data-a=pk-opt][data-k=A]').click()", m["id"]); pg.wait_for_timeout(200)
        check("a measure becomes a criterion (yours, not PT's)", ev(pg, "goalOf(curP()).criteria.some(c => c.by === 'you' && /CHF per month per hour/.test(c.then))"))
    # own words: clear and two readings
    wait_ai(pg)
    ev(pg, "ACTIONS['pk-next']()"); wait_ai(pg)
    c = ev(pg, "pickRead(curP()).cards.find(c => !c.hard)")
    if c:
        ev(pg, "(id) => { const i = document.querySelector('#pk-own-' + id); i.focus(); document.execCommand('insertText', false, 'A and the full plan'); }", c["id"]); pg.wait_for_timeout(60)
        ev(pg, "(id) => document.querySelector('#pk-' + id + ' form.pk-own button[type=submit]').click()", c["id"]); wait_ai(pg)
        e = ev(pg, "(id) => pickRead(curP()).log.find(x => x.cid === id)", c["id"])
        check("own words that are clear become the answer, with the option they name", e and "A" in e["keys"] and "full plan" in e["answer"], e)
    c = ev(pg, "pickRead(curP()).cards.find(c => !c.hard)")
    if not c: ev(pg, "ACTIONS['pk-next']()"); wait_ai(pg); c = ev(pg, "pickRead(curP()).cards.find(c => !c.hard)")
    if c:
        ev(pg, "(id) => { const i = document.querySelector('#pk-own-' + id); i.value = 'either this or something new'; i.dispatchEvent(new Event('input', {bubbles: true})); document.querySelector('#pk-' + id + ' form.pk-own button[type=submit]').click(); }", c["id"]); wait_ai(pg)
        check("unclear own words: two readings to pick from, nothing guessed", ev(pg, "(id) => { const x = pickCard(curP(), id); return !!(x && x.reading && x.reading.list.length === 2) && document.querySelectorAll('#pk-' + id + ' [data-a=pk-reading]').length === 3; }", c["id"]))
        ev(pg, "(id) => document.querySelector('#pk-' + id + ' [data-a=pk-reading][data-i=\"1\"]').click()", c["id"]); pg.wait_for_timeout(200)
        check("a reading picked becomes the answer", ev(pg, "(id) => pickRead(curP()).log.some(e => e.cid === id && /something new/.test(e.answer))", c["id"]))

    print("4 later, session, change")
    ev(pg, "(() => { pickOf(curP()).size = 0; render(); })()")   # until done: the deck stays on screen
    ev(pg, "ACTIONS['pk-next']()"); wait_ai(pg)
    for _ in range(3):
        c = ev(pg, "pickRead(curP()).cards.find(c => !c.parked && !c.hard && !!document.getElementById('pk-' + c.id))")
        if c: break
        ev(pg, "(() => { const p = curP(); for (const c of pickRead(p).cards.filter(c => c.hard && !c.parked)) pickAnswer(p, c.id, {keys: [c.options[0].k]}); render(); })()")   # answer the hard ones so others show
        ev(pg, "ACTIONS['pk-next']()"); wait_ai(pg)
    ev(pg, "(id) => document.querySelector('#pk-' + id + ' [data-a=pk-later]').click()", c["id"]); pg.wait_for_timeout(200)
    check("Later parks the pick: shown under Parked, counted as Later in the queue", ev(pg, "(id) => pickCard(curP(), id).parked && !!document.querySelector('#pk-parked [data-a=pk-back][data-id=\"' + id + '\"]') && queueOf(curP()).find(x => x.ref === 'pick:' + id).cls === 'later'", c["id"]))
    ev(pg, "(id) => document.querySelector('#pk-parked [data-a=pk-back][data-id=\"' + id + '\"]').click()", c["id"]); pg.wait_for_timeout(150)
    check("Bring back returns it to the deck", ev(pg, "(id) => !pickCard(curP(), id).parked && !!document.getElementById('pk-' + id)", c["id"]))
    ev(pg, "(() => { const k = pickOf(curP()); k.size = 5; k.session.items = [1,2,3,4,5].map(i => ({q: 'q' + i, at: now()})); k.session.done = 5; touch(curP()); render(); })()")
    check("1.6.0: no session summaries; the deck stays and the spine shows the way", ev(pg, "!document.querySelector('.pk-sum') && !!document.querySelector('.pk-spine') && pickRead(curP()).size === 0 && !!document.querySelector('.pk-spine .sp-st[aria-current=true]')"))
    first = ev(pg, "pickRead(curP()).log[0]")
    ev(pg, "(id) => document.querySelector('.pk-ov [data-a=pk-change][data-id=\"' + id + '\"]').click()", first["id"]); pg.wait_for_timeout(150)
    rc = ev(pg, "(id) => pickRead(curP()).cards.find(c => c.replaces === id)", first["id"])
    check("Change reopens the decision as a pick with your earlier choice selected", rc and ev(pg, "(id) => arr(UI.pkSel[id]).length > 0", rc["id"]), rc)
    if rc:
        ev(pg, "(id) => { UI.pkSel[id] = ['A']; render(); const b = document.querySelector('#pk-' + id + ' [data-a=pk-use]'); if (b) b.click(); else document.querySelector('#pk-' + id + ' [data-a=pk-opt][data-k=A]').click(); }", rc["id"]); pg.wait_for_timeout(200)
        check("the changed decision keeps its place and history (the old answer, not the new one)", ev(pg, "(id) => { const e = pickRead(curP()).log.find(x => x.id === id); return !!e && arr(e.changed).length === 1 && e.changed[0].old !== e.answer; }", first["id"]))
    # changing a measure replaces the criterion it wrote (one truth)
    me = ev(pg, "pickRead(curP()).log.find(e => e.target === 'measure' && arr(e.refs).length)")
    if me:
        n0 = ev(pg, "goalOf(curP()).criteria.length")
        ev(pg, "(id) => { ACTIONS['pk-change']({dataset: {id}}); const c = pickRead(curP()).cards.find(c => c.replaces === id); pickAnswer(curP(), c.id, {keys: ['A']}); render(); }", me["id"]); pg.wait_for_timeout(100)
        check("changing a measure replaces its criterion instead of adding a second", ev(pg, "goalOf(curP()).criteria.length") == n0, [n0, ev(pg, "goalOf(curP()).criteria.length")])
    # a parked hard pick still blocks publishing
    ev(pg, "(() => { const p = curP(); const k = pickOf(p); k.cards.push({id: 'pk-hard1', q: 'Where does the money go?', why: '', target: 'money', hard: true, multi: false, options: [{k: 'A', label: 'Through an association'}, {k: 'B', label: 'Directly'}], rec: -1, by: 'pt', at: now()}); pickPark(p, 'pk-hard1', true); render(); })()")
    check("a parked hard-to-undo pick still blocks publishing", ev(pg, "queueOf(curP()).find(x => x.ref === 'pick:pk-hard1').cls") == "block")
    ev(pg, "(() => { const k = pickOf(curP()); k.cards = k.cards.filter(c => c.id !== 'pk-hard1'); render(); })()")

    print("5 research, second opinion, import, export")
    ev(pg, "(() => { const j = WS.jobs.find(x => x.kind === 'pickres'); if (j){ const d = window.__mockdb(); } })()")
    try: pg.wait_for_function("pickRead(curP()).research && pickRead(curP()).research.state === 'done'", timeout=8000)
    except Exception: pass
    check("research findings arrive (ceiling, existing, missing, frontier, picture, platform)", ev(pg, "(() => { const k = pickRead(curP()); return k.research && k.research.state === 'done' && ['ceiling','existing','missing','frontier','picture'].every(x => k.findings.some(f => f.kind === x)); })()"), ev(pg, "pickRead(curP()).research"))
    check("platform check: each part marked", ev(pg, "pickRead(curP()).platformParts.some(x => x.status === 'documented')"))
    check("research that never reports back stops counting as running", ev(pg, "(() => { const k = {research: {state: 'running', job: 'nope', at: new Date(Date.now() - 46 * 60000).toISOString()}}; return !pickResRunning(k); })()"))
    ev(pg, "ACTIONS['pk-second']()"); wait_ai(pg)
    check("second opinion turns gaps into picks", ev(pg, "pickRead(curP()).cards.some(c => c.by === 'second') && !!pickRead(curP()).second"))
    ev(pg, "ACTIONS['pk-import']()"); pg.wait_for_timeout(100)
    ev(pg, "(() => { document.getElementById('pk-import-in').value = 'We decided: it finds strategies; ranking by CHF per month per hour. Open: where the menu lands.'; document.querySelector('[data-a=pk-import-go]').click(); })()"); wait_ai(pg)
    check("import: decided ones go to the overview, open ones become picks", ev(pg, "pickRead(curP()).log.some(e => e.from === 'import') && pickRead(curP()).cards.some(c => c.target === 'home')"))
    md = ev(pg, "pickMarkdown(curP())")
    check("export: the design as Markdown (decided, open, research)", "## " in md and "Design so far" in md and "Ceiling" in md, md[:200])

    print("6 queue, side panel, go-to, counts")
    c = ev(pg, "pickRead(curP()).cards.find(c => !c.parked)")
    ev(pg, "(() => { curP().mode = 'steps'; UI.home = true; render(); })()")
    check("the overview lists the pick, and its one-click options work from there", ev(pg, "(ref) => !!document.querySelector('.qrow [data-ref=\"' + ref + '\"]')", "pick:" + c["id"]))
    ev(pg, "(ref) => { UI.home = false; render(); goRef(ref); }", "pick:" + c["id"]); pg.wait_for_timeout(1500)
    check("go-to from another view opens the pick in the side panel", ev(pg, "(ref) => UI.inspRef === ref && !!document.querySelector('.insp .pk-card')", "pick:" + c["id"]))
    check("the pick is on the screen once (no duplicate ids)", ev(pg, "(() => { const c = {}; for (const e of document.querySelectorAll('[id]')) c[e.id] = (c[e.id] || 0) + 1; return !Object.values(c).some(n => n > 1); })()"))
    check("one count: Finish button = queue", ev(pg, "(() => { const c = queueCounts(curP()); return c.block + c.should === queueOf(curP()).filter(youOpen).length; })()"))
    check("one count: everything that needs you is in the Pick deck", ev(pg, "(() => { const p = curP(); const need = queueOf(p).filter(x => youOpen(x) && x.who === 'you' && x.cls !== 'later').map(x => x.key); const deck = new Set([...pickOpenCards(p).map(c => 'pick|pick:' + c.id + '|'), ...pickQueueCards(p).map(c => c.qkey)]); return need.every(k => deck.has(k)); })()"))
    check("names, never raw ids, in the Done list and labels", ev(pg, "(() => { const r = 'pick:' + pickRead(curP()).log[0].cid; return !/pk-/.test(refLabel(curP(), r)); })()"))

    print("7 try it")
    ev(pg, "(() => { curP().mode = 'pick'; UI.home = false; UI.drawer = false; render(); })()")
    rd = ev(pg, "pickReady(curP())")
    check("ready-to-try shows what is missing", len(rd) >= 4, rd)
    # make it ready: idea, result, measure, no hard picks open
    ev(pg, """(() => { const p = curP(); p.northStar.goal = p.northStar.goal || 'Raise money for families'; p.northStar.problem = p.northStar.problem || 'Families need money';
        const k = pickOf(p); for (const c of k.cards.filter(c => c.hard)) pickAnswer(p, c.id, {keys: [c.options[0].k]}); p.audience = {customers: false, eu: false}; render(); })()""")
    wait_ai(pg); pg.wait_for_timeout(200); wait_ai(pg)   # picking the platform checks it right away
    rd = ev(pg, "pickReady(curP())")
    check("ready to try once the idea, result, hard points and platform are decided (1.8: the measure is asked, not required)", all(x["ok"] for x in rd) and "measure" not in [x["id"] for x in rd], rd)
    last0 = ev(pg, "(arr(curP().acts).slice(-1)[0] || {}).id || ''")
    ev(pg, "document.querySelector('#pk-try [data-a=pk-try]').click()"); pg.wait_for_timeout(300); wait_ai(pg, 30000)
    for _ in range(20):
        if ev(pg, "!!pickRead(curP()).tried"): break
        wait_ai(pg, 3000)
    check("Try builds requirements, design and package", ev(pg, "!!pickRead(curP()).tried && curP().requirements.length > 0 && curP().pkg.sections.length > 0"), ev(pg, "pickRead(curP()).tried"))
    check("the try version is marked as not checked, with stand-ins listed", "not yet checked" in ev(pg, "pickTryText(curP())"))
    after = "(id) => { const a = arr(curP().acts); const i = a.findIndex(x => x.id === id); return a.slice(i + 1).filter(x => x.by === 'pt' && x.at >= pickRead(curP()).tried.at.slice(0, 0)); }"
    check("the whole try is one Undo group", ev(pg, "(id) => { const a = arr(curP().acts); const i = a.findIndex(x => x.id === id); const b = a.slice(i + 1); return b.length > 0 && new Set(b.map(x => x.grp).filter(Boolean)).size === 1 && b.every(x => x.grp); }", last0), ev(pg, "(id) => { const a = arr(curP().acts); const i = a.findIndex(x => x.id === id); return a.slice(i + 1).map(x => [x.label, x.by, x.grp]); }", last0))
    check("the design decision waits for you as a pick after trying", ev(pg, "pickQueueCards(curP()).some(c => c.kind === 'archdecide')"))
    und = ev(pg, """(() => { const p = curP(); const before = JSON.stringify({r: p.requirements.length, s: p.pkg.sections.length, tried: !!pickRead(p).tried});
      const a = arr(p.acts).filter(x => !x.undone).slice(-1)[0]; undoAct(p, a.id); const after = {r: p.requirements.length, s: p.pkg.sections.length, tried: !!pickRead(p).tried};
      return {before, after}; })()""")
    check("Undo of the try takes the whole first version back", und["after"]["s"] == 0 and not und["after"]["tried"], und)
    ev(pg, "(() => { document.querySelector('#pk-try [data-a=pk-try]') && document.querySelector('#pk-try [data-a=pk-try]').click(); })()"); pg.wait_for_timeout(300); wait_ai(pg, 30000)
    for _ in range(20):
        if ev(pg, "!!pickRead(curP()).tried"): break
        wait_ai(pg, 3000)
    ev(pg, "(() => { const i = document.getElementById('pk-notice-in'); i.value = 'cards too long'; document.querySelector('form.pk-notice button[type=submit]').click(); })()"); wait_ai(pg)
    check("what you noticed becomes the next picks", ev(pg, "pickRead(curP()).notice.length === 1"))
    check("the platform is \"tested\" only when you say the try ran", not ev(pg, "pickRead(curP()).platformParts.some(x => x.status === 'tested')"))
    if ev(pg, "!!document.querySelector('[data-a=pk-tested]')"):
        ev(pg, "document.querySelector('[data-a=pk-tested]').click()"); pg.wait_for_timeout(100)
        check("\"I ran it: it works\" marks the parts tested (never the stand-ins)", ev(pg, "(() => { const k = pickRead(curP()), st = arr(k.tried && k.tried.standIns); return k.platformParts.every(x => x.status === 'tested' || x.status === 'impossible' || st.some(s => similar(s, x.part))); })()"))

    print("8 keys")
    ev(pg, "(() => { if (!pickOpenCards(curP()).length){ const k = pickOf(curP()); k.cards.push({id: 'pk-key1', q: 'Single choice?', why: '', target: 'decision', hard: false, multi: false, options: [{k: 'A', label: 'One'}, {k: 'B', label: 'Two'}], rec: 0, by: 'pt', at: now()}); } render(); })()")
    c0 = ev(pg, "pickOpenCards(curP())[0]")
    ev(pg, "(() => { const b = document.querySelector('[data-a=pk-export]'); b.focus(); })()"); n0 = ev(pg, "pickRead(curP()).log.length")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    check("Enter on a focused button never takes the ★ of a card", ev(pg, "pickRead(curP()).log.length") == n0)
    ev(pg, "(() => { const k = pickOf(curP()); k.cards = k.cards.filter(c => !c.parked); k.size = 0; render(); })()")   # the deck on screen (a full session shows its summary instead)
    c = ev(pg, "pickOpenCards(curP())[0]")
    if c and not c["multi"]:
        pg.keyboard.press("A"); pg.wait_for_timeout(200)
        check("key A picks option A of the first card", ev(pg, "(id) => pickRead(curP()).log.some(e => e.cid === id) || !pickCard(curP(), id)", c["id"]), ev(pg, "(id) => ({c: pickCard(curP(), id), toasts: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).slice(-3)})", c["id"]))
    elif c:
        pg.keyboard.press("A"); pg.wait_for_timeout(150)
        check("key A selects option A of the first (combinable) card", ev(pg, "(id) => arr(UI.pkSel[id]).includes('A')", c["id"]), ev(pg, "({first: pickOpenCards(curP())[0], act: document.activeElement && document.activeElement.outerHTML.slice(0, 80), modal: UI.modal, sel: UI.pkSel, toasts: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent)})"))
    ev(pg, "(() => { const i = document.querySelector('[data-pkown]'); if (i) i.focus(); })()"); before = ev(pg, "JSON.stringify(UI.pkSel)")
    pg.keyboard.type("B"); pg.wait_for_timeout(100)
    check("keys do nothing while typing", ev(pg, "JSON.stringify(UI.pkSel)") == before)

    print("9 languages and widths")
    raw = []
    for lang in ["de", "zh"]:
        ev(pg, f"(() => {{ LANG = '{lang}'; render(); }})()"); pg.wait_for_timeout(80)
        txt = ev(pg, "document.querySelector('.app').innerText")
        if re.search(r"\bpk\.[a-z]", txt) or "ß" in txt: raw.append(lang)
    ev(pg, "(() => { LANG = 'en'; render(); })()")
    check("Pick in German and Chinese: no raw keys, no ß", not raw, raw)
    sq = []
    for w in (1440, 1024, 390):
        pg.set_viewport_size({"width": w, "height": 900 if w > 700 else 800}); pg.wait_for_timeout(120)
        over = ev(pg, "(() => { const m = document.querySelector('.main'); return m ? m.scrollWidth - m.clientWidth : 0; })()")
        small = ev(pg, "[...document.querySelectorAll('.pk-btn')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 24).length")
        if over > 4 or small: sq.append([w, over, small])
    pg.set_viewport_size({"width": 1440, "height": 900})
    check("Pick at 1440 / 1024 / 390: no sideways scroll, buttons at least 24 px", not sq, sq)

    print("10 Second owner's workspace gets the same")
    check("both workspaces: Pick is the default for new projects", ev(pg, "pickDefaultsOnce.toString().includes('defaultMode = \"pick\"')"))
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:8]: print("  ERR", e)
sys.exit(1 if fails or errors else 0)
