"""1.8 the cone, on a COPY of the real data (or the made-up bundle) with the mock runtime. Never touches real data.
Covers the owner's decisions (PLAN-1.8 "Routing decided (31 Oct 2026)", the unification round, 1 Nov 2026; DESIGN-1.8-rev2 §12, §13, §16):
1 one sentence → 6–8 kinds of tool + "something not here", each card with a sketch, what you get, for whom, AI or not, cost, time, checks;
2 one biggest-cut question at a time, pre-filled from the sentence, who it is for first, reversibility badges, "me and others" / "not sure"
  private-first with portability on (hatched, never defaulted away); 3 the gallery shrinks ("n of 37 cut"), cut cards fold into
  "Removed (n)" (a fade with reduced motion), greyed and tappable (why + the way back); 4 PT's ★ only after the cards were looked at or on
  tap, hedged, first person; no decoy cards; 5 D pick then verify (only the cuts that could rule it out), E say the ending (nearest kind or
  a new one, unverified) with your earlier choices as ★, still asked; 6 the kind defines the check rows ("n to tap") and feeds the 1.8 start
  (mock first → picks); every answer a decision row with its id and event; 7 1.7 tools: the offer, re-run once (an earlier decision is never
  replaced without a tap), "no thanks" once, the entry points for Health; Undo; the start switch (fast and questions first still work);
  save + reload; three languages; three widths without sideways scroll; no page errors.
Run: python3 test/e2e180_cone.py [work/backup-141 | test/fixtures/synthetic.json]"""
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
def new_tool(pg, name, raw, start=None):
    ev(pg, "(a) => { newProject(a[0], {raw: a[1]}); UI.home = false; if (a[2]) pickOf(curP()).start = a[2]; render(); }", [name, raw, start]); pg.wait_for_timeout(250)
    return ev(pg, "curP().id")
def press_start(pg):
    pg.locator(".pk-start [data-a=pk-next]").first.click(); pg.wait_for_timeout(250); wait_ai(pg); pg.wait_for_timeout(150)
def answer(pg, d, v):
    pg.locator(f'.cone-q [data-a=cone-ans][data-d="{d}"][data-v="{v}"]').first.click(); pg.wait_for_timeout(150)
def finish_cone(pg, limit=6):   # answer the question on screen with its pre-filled option (or the first one) until none is left
    for _ in range(limit):
        d = ev(pg, "(() => { const q = document.querySelector('.cone-q[data-d]'); return q ? q.dataset.d : ''; })()")
        if not d: return True
        v = ev(pg, "(() => { const b = document.querySelector('.cone-q .cone-opt.pre') || document.querySelector('.cone-q .cone-opt'); return b.dataset.v; })()")
        answer(pg, d, v)
    return not ev(pg, "!!document.querySelector('.cone-q[data-d]')")
def keep_value(pg):   # an answer that keeps the picked kind alive (pick then verify)
    return ev(pg, "(() => { const c = coneRead(curP()), d = coneCurDim(curP()), fam = coneFam(c, c.picked.f); return CONE_OPTS[d].find(v => v !== 'unsure' && coneLive(c, fam, Object.assign({}, coneAns(c), {[d]: {v}}))) || 'unsure'; })()")
def finish_pick(pg, limit=6):
    for _ in range(limit):
        d = ev(pg, "(() => { const q = document.querySelector('.cone-q[data-d]'); return q ? q.dataset.d : ''; })()")
        if not d: return
        answer(pg, d, "me" if d == "aud" else keep_value(pg))
def events_of(pg, pid, src):
    return ev(pg, "(a) => { const L = ROWS.L[a[0]]; return L ? L.list.filter(e => e.src === a[1] || arr(e.ids).some(x => x[0] === a[1])).map(e => e.type) : null; }", [pid, src])
def rows_settle(pg, pid):
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return rowsPass(p); }", pid); pg.wait_for_timeout(300)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)

    print("0 the entry points and the start switch")
    check("the entry points for other screens exist (Health's day-one screen, the inbox)", ev(pg, "['coneOffer', 'coneOfferable', 'coneRerun', 'coneDismiss', 'coneStart'].every(f => typeof window[f] === 'function')"))
    pidA = new_tool(pg, "Cone 18 A", "A page just for me that tracks my plant watering")
    check("the start switch: kinds of tool first (chosen by default for a new tool), questions first, fast", ev(pg, "!!document.querySelector('.pk-start .pk8-start [data-a=pk8-start][data-v=cone].on') && !!document.querySelector('.pk8-start [data-v=questions]') && !!document.querySelector('.pk8-start [data-v=fast]') && document.querySelector('.pk-start [data-a=pk-next]').textContent.includes(t('cone.start.go'))"))
    c0, m0, j0 = n_calls(pg, "cone"), n_calls(pg, "mock"), ev(pg, "WS.jobs.length")
    press_start(pg)

    print("1 one sentence → kinds of tool")
    fams = ev(pg, "arr(coneRead(curP()).fams).map(f => f.f)")
    check("Start asks the AI once for kinds of tool from the sentence (no mock, no research yet)", n_calls(pg, "cone") == c0 + 1 and n_calls(pg, "mock") == m0 and ev(pg, "WS.jobs.length") == j0 and ev(pg, "pk8Stage(curP())") == "cone", [n_calls(pg, "cone") - c0, n_calls(pg, "mock") - m0, ev(pg, "pk8Stage(curP())")])
    cp = last_prompt(pg, "cone")
    check("…the sentence goes in as material (untrusted), with the tagged catalogue", 'label="sentence"' in cp and "plant watering" in cp and "<catalogue>" in cp and '"id":"B1"' in cp, cp[-500:])
    cards = ev(pg, "[...document.querySelectorAll('.cone .cone-gal.live > .cone-card[data-f]')].map(e => ({f: e.dataset.f, sk: !!e.querySelector('.cone-sk'), h: !!e.querySelector('h4'), get: !!e.querySelector('h4 + p.small'), dt: e.querySelectorAll('.cone-attrs dt').length, aud: e.querySelectorAll('.cone-aud .chip').length, chk: +(e.querySelector('.cone-chk') || {dataset: {}}).dataset.n, btn: !!e.querySelector('[data-a=cone-pick]')}))")
    check("6–8 kinds as cards, the likeliest first, plus “something not here” with its box", 6 <= len(cards) <= 8 and ev(pg, "!!document.querySelector('.cone-gal.live #cone-nothere form[data-form=cone-say] #cone-say-in')"), cards)
    check("every card: a sketch, what you get, for whom (me · others · customers), AI or not, cost, time, acts outward, checks", all(c["sk"] and c["h"] and c["get"] and c["dt"] == 6 and c["aud"] == 3 and c["chk"] >= 1 and c["btn"] for c in cards), cards)
    check("no decoy cards: exactly the kinds the inference named, in its order", [c["f"] for c in cards] == fams == ["B", "K", "C", "A", "J", "G", "D"], [[c["f"] for c in cards], fams])
    check("the sentence is shown with the words that answer a question underlined", ev(pg, "(() => { const u = [...document.querySelectorAll('.cone-sent u')].map(x => x.textContent); return u.includes('just for me') && u.includes('page'); })()"), ev(pg, "(document.querySelector('.cone-sent') || {}).innerHTML"))
    cnt = ev(pg, "coneCount(coneRead(curP()))")
    check("the count: kinds left and shapes cut of the whole catalogue", cnt["total"] == 37 and ev(pg, "(c) => document.querySelector('.cone-count').textContent.includes(t('cone.cut', {a: c.cut, b: c.total})) && document.querySelector('.cone-count').textContent.includes(t('cone.left', {n: 7}))", cnt), cnt)
    check("the next step on the page bar is the kind of tool; the design pass waits for it", ev(pg, "spineState(curP()).next.label === t('cone.next')") and ev(pg, "(async () => { const P = await designPass(curP()); return !!P && P.stop === t('cone.pass.first'); })()"))

    print("2 one biggest-cut question at a time, pre-filled")
    q = ev(pg, "(() => { const e = document.querySelector('.cone-q[data-d]'); return e ? {d: e.dataset.d, pre: (e.querySelector('.cone-opt.pre') || {dataset: {}}).dataset.v, line: (e.querySelector('.cone-pre') || {}).textContent || '', opts: [...e.querySelectorAll('.cone-opt')].map(b => b.dataset.v), revs: e.querySelectorAll('.cone-opt .cone-rev').length, revt: e.querySelectorAll('.cone-opt .cone-revt').length} : null; })()")
    check("who it is for comes first: me / others / customers / me and others / not sure", q and q["d"] == "aud" and q["opts"] == ["me", "others", "customers", "both", "unsure"], q)
    check("…pre-filled from the sentence (the words quoted), still one tap away (nothing decided by itself)", q and q["pre"] == "me" and "just for me" in q["line"] and ev(pg, "!coneAns(coneRead(curP())).aud"), q)
    check("every answer carries a reversibility badge with a number", q and q["revs"] == 5 and q["revt"] == 5 and ev(pg, "document.querySelector('.cone-q [data-v=customers] .cone-rev').classList.contains('costly') && document.querySelector('.cone-q [data-v=me] .cone-rev').classList.contains('cheap')"), q)
    check("nothing is pre-ticked: no answer and no kind decided yet; no decision row decided", ev(pg, "!coneRead(curP()).ending && !rowsOf(curP()).some(r => /^cone:/.test(r.src) && r.decision)"))

    print("3 the gallery shrinks")
    r = ev(pg, "(() => { ACTIONS['cone-ans']({dataset: {d: 'aud', v: 'customers'}}); const f = [...document.querySelectorAll('.cone-gal.live .cone-card.fold18')]; return {fold: f.map(e => e.dataset.f).sort(), cut: f.every(e => e.classList.contains('cut')), anim: f.length ? getComputedStyle(f[0]).animationName : ''}; })()")
    check("an answer cuts what does not fit: the cut cards fold away (¼ s)", r["fold"] == ["A", "C", "D", "J"] and r["cut"] and r["anim"] == "fold18", r)
    pg.wait_for_timeout(450)
    r2 = ev(pg, "(() => ({live: [...document.querySelectorAll('.cone-gal.live > .cone-card[data-f]')].map(e => e.dataset.f), rem: [...document.querySelectorAll('.cone-removed .cone-card.cut')].map(e => e.dataset.f).sort(), sum: (document.querySelector('.cone-removed > summary') || {}).textContent || '', cnt: document.querySelector('.cone-count').textContent}))()")
    cnt2 = ev(pg, "coneCount(coneRead(curP()))")
    check("…into “Removed (4)”; the gallery and the count shrink visibly", r2["live"] == ["B", "K", "G"] and r2["rem"] == ["A", "C", "D", "J"] and r2["sum"] == ev(pg, "t('cone.removed', {n: 4})") and cnt2["cut"] > cnt["cut"] and ev(pg, "(c) => document.querySelector('.cone-count').textContent.includes(t('cone.cut', {a: c.cut, b: c.total}))", cnt2), [r2, cnt2])
    check("…the answer shows as a chip with its badge and a way to take it back", ev(pg, "(() => { const a = document.querySelector('.cone-done .cone-a[data-d=aud]'); return !!a && a.textContent.includes(t('cone.o.aud.customers')) && !!a.querySelector('.cone-rev.costly') && !!a.querySelector('[data-a=cone-x]'); })()"))
    check("…and p.audience says customers (a tool other people use keeps the fixed check floors)", ev(pg, "curP().audience.who === 'customers' && curP().audience.customers === true && chkShared(curP())"))
    pg.locator(".cone-removed > summary").first.click(); pg.wait_for_timeout(200)
    st = ev(pg, "(() => { const e = document.querySelector('.cone-removed[open] .cone-card.cut[data-f=J]'); if (!e) return null; const s = getComputedStyle(e); return {op: +s.opacity, gray: s.filter.includes('grayscale'), btn: !!e.querySelector('[data-a=cone-why]')}; })()")
    check("cut cards are greyed and still tappable", st and st["op"] < 1 and st["gray"] and st["btn"], st)
    pg.locator('.cone-removed [data-a=cone-why][data-f="J"]').first.click(); pg.wait_for_timeout(200)
    check("…a tap says why it was cut and offers the way back", ev(pg, "(() => { const w = document.querySelector('.cone-card[data-f=J] .cone-why'); return !!w && w.textContent.includes(t('cone.cutby', {q: t('cone.qs.aud'), a: t('cone.o.aud.customers')})) && !!w.querySelector('[data-a=cone-x][data-d=aud]'); })()"))
    pg.locator('.cone-card[data-f="J"] .cone-why [data-a=cone-x]').first.click(); pg.wait_for_timeout(250)
    check("“change that answer” takes it back: the question is open again and every card is back", ev(pg, "!coneAns(coneRead(curP())).aud && coneLiveFams(coneRead(curP())).length === 7 && document.querySelector('.cone-q[data-d]').dataset.d === 'aud' && curP().audience.who !== 'customers'"))
    undo_last(pg, "t('cone.act.back', {x: t('cone.qs.aud')})"); pg.wait_for_timeout(150)
    check("Undo brings the answer back (one step)", ev(pg, "coneAns(coneRead(curP())).aud && coneAns(coneRead(curP())).aud.v === 'customers' && coneLiveFams(coneRead(curP())).length === 3"))
    undo_last(pg, "t('cone.act.ans', {x: t('cone.qs.aud')})"); pg.wait_for_timeout(150)
    check("Undo of the answer: no answer, all seven kinds, the audience as before", ev(pg, "!coneAns(coneRead(curP())).aud && coneLiveFams(coneRead(curP())).length === 7 && !curP().audience.who"), ev(pg, "[coneAns(coneRead(curP())), curP().audience]"))
    pg.emulate_media(reduced_motion="reduce")
    anim = ev(pg, "(() => { ACTIONS['cone-ans']({dataset: {d: 'aud', v: 'customers'}}); const f = document.querySelector('.cone-gal.live .cone-card.fold18'); return f ? getComputedStyle(f).animationName : ''; })()")
    check("with reduced motion the cut cards fade instead of folding", anim == "fade18out", anim)
    pg.emulate_media(reduced_motion="no-preference"); pg.wait_for_timeout(400)
    undo_last(pg, "t('cone.act.ans', {x: t('cone.qs.aud')})"); pg.wait_for_timeout(150)

    print("4 the ★: only after the cards were looked at, or on tap")
    check("at 1440 px every card was in view for a while: the ★ showed by itself", ev(pg, "!!document.querySelector('.cone-card.star') && !document.querySelector('.cone-star.hid')"))
    pg.set_viewport_size({"width": 1440, "height": 460})   # a short window: the cards below the question are not in view
    pidT = new_tool(pg, "Cone 18 T", "A page just for me that tracks my plant watering")
    press_start(pg); ev(pg, "(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); })()"); pg.wait_for_timeout(1600)
    check("PT's ★ stays hidden while you have not looked at every card (no ★ card, the line says why, a tap shows it)", ev(pg, "!document.querySelector('.cone-card.star') && !!document.querySelector('.cone-star.hid [data-a=cone-star]') && !document.querySelector('.cone .cone-star:not(.hid)')"), ev(pg, "[...CONE_SEEN.seen]"))
    pg.locator(".cone-star [data-a=cone-star]").first.click(); pg.wait_for_timeout(200)
    star = ev(pg, "(() => { const s = coneRead(curP()).star, f = coneFam(coneRead(curP()), s.f); const l = document.querySelector('.cone-star:not(.hid)'); return {f: s.f, card: !!document.querySelector('.cone-card.star[data-f=' + s.f + ']'), line: l ? l.textContent : '', want: t('cone.star.mine', {x: f.title}), doubt: t('cone.star.doubt', {x: s.doubt})}; })()")
    check("on tap: ★ on its card with a hedged first-person reason and what would change PT's mind", star["card"] and star["want"] in star["line"] and "I'd lean" in star["line"] and star["doubt"] in star["line"], star)
    new_tool(pg, "Cone 18 H", "Every Monday collect the three best offers for my team")
    press_start(pg); ev(pg, "(() => { const m = document.querySelector('.main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0); })()"); pg.wait_for_timeout(1600)
    check("another tool: still hidden after a while without scrolling", ev(pg, "!document.querySelector('.cone-card.star') && !!document.querySelector('.cone-star.hid')"))
    for f in ev(pg, "[...document.querySelectorAll('.cone-gal.live > .cone-card[data-f]')].map(e => e.dataset.f)"):
        ev(pg, "(f) => document.querySelector('.cone-card[data-f=' + f + ']').scrollIntoView({block: 'center'})", f); pg.wait_for_timeout(150)
    ok = wait_for(pg, "!!document.querySelector('.cone-card.star') && !document.querySelector('.cone-star.hid')", 4000)
    check("…scrolled through every card: the ★ shows by itself, with its hedged reason", ok and ev(pg, "document.querySelector('.cone-star').textContent.includes('I\\'d lean')"), ev(pg, "[[...CONE_SEEN.seen], (document.querySelector('.cone-star') || {}).className]"))
    pg.set_viewport_size({"width": 1440, "height": 950})
    ev(pg, "(id) => { openProject(id); UI.home = false; render(); }", pidA); pg.wait_for_timeout(300)

    print("2b the biggest cut next, until one or two kinds are left")
    answer(pg, "aud", "me")
    nd = ev(pg, "(() => { const c = coneRead(curP()), L = ['out', 'where', 'when'].filter(d => !coneAns(c)[d]), s = L.map(d => coneCutScore(c, d)); return {d: coneCurDim(curP()), best: L[s.indexOf(Math.max(...s))], scores: s, shown: (document.querySelector('.cone-q[data-d]') || {dataset: {}}).dataset.d}; })()")
    check("after who it is for, the question that cuts the most comes next", nd["d"] and nd["d"] == nd["best"] and nd["shown"] == nd["d"], nd)
    check("…its line says how much it cuts; every option says what it would cut", ev(pg, "(() => { const e = document.querySelector('.cone-q[data-d]'); return !!e && e.textContent.includes(t('cone.why.cut', {n: Math.max(...CONE_OPTS[e.dataset.d].map(v => coneCutsIf(coneRead(curP()), e.dataset.d, v)))})); })()"))
    rows_settle(pg, pidA)
    ra = ev(pg, "(() => { const r = rowsOf(curP()).find(r => r.src === 'cone:aud'); return r ? {id: r.id, ch: r.decision && r.decision.chosen, tier: r.tier, hard: r.hard} : null; })()")
    check("every answer is a decision row with its own id (U.<stage>.<n>), hard (who sees it), waiting for you", ra and re.match(r"^U\.2\.\d+$", ra["id"]) and ra["ch"] == ev(pg, "t('cone.o.aud.me')") and ra["tier"] == "block" and ra["hard"], ra)
    ok = wait_for(pg, f"(() => {{ const L = ROWS.L['{pidA}']; return !!L && L.list.some(e => e.type === 'taken' && e.src === 'cone:aud'); }})()", 6000)
    check("…and its event (taken) is in the decision history", ok, events_of(pg, pidA, "cone:aud"))
    check("the open question is a row too, “Decide” takes you to it", ev(pg, "(() => { const d = coneCurDim(curP()), r = rowsOf(curP()).find(r => r.src === 'cone:' + d); return !!r && r.status === 'open' && r.ref === 'cone:' + d; })()"))
    done = finish_cone(pg)
    tk = ev(pg, "(() => { const e = document.querySelector('.cone-take'); return e ? {n: e.querySelectorAll('[data-a=cone-take]').length, live: coneLiveFams(coneRead(curP())).map(f => f.f)} : null; })()")
    check("the questions stop when they no longer cut (one or two kinds left, or none tells them apart): pick one to start", done and tk and tk["n"] >= 1 and tk["n"] == len(tk["live"]), tk)
    f1 = tk["live"][0] if tk else "B"
    nchk = ev(pg, f"+document.querySelector('.cone-card[data-f={f1}] .cone-chk').dataset.n")
    pn0 = n_calls(pg, "pick-next")
    pg.locator(f'.cone-take [data-a=cone-take][data-f="{f1}"]').first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(300); wait_ai(pg)

    print("6 the kind defines the checks and feeds the 1.8 start")
    e = ev(pg, "(() => { const c = coneRead(curP()); return {e: c.ending, stage: pk8Stage(curP()), mock: !!curP().mock}; })()")
    check("“Start with this” takes the kind (your tap), records the checks it brings", e["e"] and e["e"]["f"] == f1 and len(e["e"]["checks"]) == nchk, e)
    check("…and the 1.8 start goes on: the mock comes first (drawn from the idea and the kind)", e["stage"] == "mock" and e["mock"] and "<kind_of_tool" in last_prompt(pg, "mock") and n_calls(pg, "pick-next") == pn0, [e, last_prompt(pg, "mock")[-400:]])
    check("the Pick page keeps one line with the kind, the answers and the checks, and a way to change it", ev(pg, "(() => { const s = document.querySelector('.pk-deck .cone-sum'); return !!s && s.textContent.includes(coneRead(curP()).ending.title) && !!s.querySelector('[data-a=cone-change]'); })()"))
    pg.locator(".pk-deck .pg-mock [data-a=mock-yes]").first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(300); wait_ai(pg)
    pn = last_prompt(pg, "pick-next")
    check("…then the picks, which see the kind as decided (never asked again)", ev(pg, "pk8Stage(curP()) === '' && pickRead(curP()).cards.length >= 1") and "<kind_of_tool" in pn and "never ask them again" in pn, pn[-300:])
    ch = ev(pg, """(() => { const p = curP(); p.arch.components = [{id: 'c1', name: 'Plant page', kind: 'code', role: 'Shows when to water', inputs: 'entries', outputs: 'a page', reqIds: []}]; touch(p); render();
      return {rows: chkList(p).rows.map(x => x.id), want: coneRead(p).ending.checks, priv: chkPrivate(p), open: chkOpenRows(p).length}; })()""")
    check("the check rows of the tool include every check the kind brought; a private tool taps each one", set(ch["want"]) <= set(ch["rows"]) and ch["priv"] and ch["open"] == len(ch["rows"]), ch)
    rows_settle(pg, pidA)
    check("the kind is a decision row too (U.1.n) with its event", ev(pg, "(() => { const r = rowsOf(curP()).find(r => r.src === 'cone:ending'); return !!r && /^U\\.1\\.\\d+$/.test(r.id) && r.decision.chosen === coneRead(curP()).ending.title; })()") and wait_for(pg, f"ROWS.L['{pidA}'].list.some(e => e.type === 'taken' && e.src === 'cone:ending')", 6000), events_of(pg, pidA, "cone:ending"))
    o = ev(pg, """(() => { const p = newProject('Mail 18 out', {raw: 'Reads my inbox and answers people'}); const c = coneOf(p); Object.assign(c, {v: 1, sentence: 'Reads my inbox and answers people', state: 'ask', fams: [coneFamDefault('D')], ans: {aud: {v: 'me', at: now()}, out: {v: 'yes', at: now()}}}); c.ending = {f: 'D', shape: 'D1', title: 'x', at: now(), checks: []};
      const r = {word: chkOutward(p), trials: chkTrials(p)}; return r; })()""")
    check("a kind that acts outward makes the tests run 5 times even before its text says so", o["word"] == ev(pg, "t('cone.sig.outword')") and o["trials"] == 5, o)

    print("5 D: pick then verify")
    pidC = new_tool(pg, "Cone 18 C", "Something that helps me keep my invoices in order")
    press_start(pg)
    pg.locator('.cone-card[data-f="C"] [data-a=cone-pick]').first.click(); pg.wait_for_timeout(200)
    vd = ev(pg, "(() => { const c = coneRead(curP()); return {picked: c.picked && c.picked.f, dims: coneVerifyDims(c), shown: (document.querySelector('.cone-q[data-d]') || {dataset: {}}).dataset.d, chip: !!document.querySelector('.cone-card.picked[data-f=C]'), why: (document.querySelector('.cone-q .muted') || {}).textContent || ''}; })()")
    check("tap a card right away: it is your pick, PT checks it (who it is for first)", vd["picked"] == "C" and vd["chip"] and vd["shown"] == "aud" and vd["dims"][0] == "aud" and vd["why"] == ev(pg, "t('cone.why.vaud', {x: coneFam(coneRead(curP()), 'C').title})"), vd)
    allopen = ev(pg, "(() => { const c = coneRead(curP()); return ['out', 'where', 'when'].filter(d => !coneAns(c)[d]); })()")
    asked = []
    for _ in range(5):
        d = ev(pg, "(() => { const q = document.querySelector('.cone-q[data-d]'); return q ? q.dataset.d : ''; })()")
        if not d: break
        asked.append(d)
        answer(pg, d, "me" if d == "aud" else keep_value(pg))
    pg.wait_for_timeout(200); wait_ai(pg)
    check("…then only the questions that could rule it out (fewer than all of them)", asked == vd["dims"] and len(asked) < 1 + len(allopen), [asked, vd["dims"], allopen])
    check("…and when none rules it out it is taken: the kind is C, the mock comes next", ev(pg, "(() => { const c = coneRead(curP()); return !!c.ending && c.ending.f === 'C' && c.ending.via === 'pick' && pk8Stage(curP()) !== 'cone'; })()"), ev(pg, "coneRead(curP()).ending"))
    new_tool(pg, "Cone 18 D", "Something that helps me keep my invoices in order")
    press_start(pg)
    pg.locator('.cone-card[data-f="J"] [data-a=cone-pick]').first.click(); pg.wait_for_timeout(150)
    answer(pg, "aud", "customers")
    check("an answer that rules the pick out says so, drops the pick and the cone goes on", ev(pg, "(() => { const c = coneRead(curP()); return !c.picked && !c.ending && !!document.querySelector('.cone-note') && document.querySelector('.cone-note').textContent.includes(t('cone.note.out', {x: coneFam(c, 'J').title, q: t('cone.qs.aud'), a: t('cone.o.aud.customers')})); })()"))
    undo_last(pg)
    check("…Undo: the pick is back, the answer gone", ev(pg, "(() => { const c = coneRead(curP()); return !!c.picked && c.picked.f === 'J' && !coneAns(c).aud; })()"))

    print("5 E: say the ending; 2.0: your choice on another tool is neither ★ nor pre-filled here (owner: projects never get other projects' rules)")
    pidE = new_tool(pg, "Cone 18 E", "I need something for prices")
    press_start(pg)
    pg.locator(".cone [data-a=cone-sayfocus]").first.click(); pg.wait_for_timeout(100)
    check("“or say the ending” takes you to the box", ev(pg, "document.activeElement && document.activeElement.id === 'cone-say-in'"))
    pg.fill("#cone-say-in", "a weekly e-mail digest of the best prices"); pg.locator(".cone-nothere button[type=submit]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    se = ev(pg, "(() => { const c = coneRead(curP()), q = document.querySelector('.cone-q[data-d]'); return {picked: c.picked && c.picked.f, via: c.picked && c.picked.via, d: q ? q.dataset.d : '', pol: (document.querySelector('.cone-pol') || {}).textContent || '', star: q ? [...q.querySelectorAll('.cone-opt')].filter(b => b.textContent.trim().startsWith('★')).map(b => b.dataset.v) : [], aud: coneAns(c).aud || null}; })()")
    check("your words map to the nearest kind (the AI, checked against the catalogue)", se["picked"] == "C" and se["via"] == "said" and "a weekly e-mail digest" in last_prompt(pg, "cone-say"), se)
    pre = ev(pg, "[...document.querySelectorAll('.cone-q[data-d] .cone-opt.pre')].map(b => b.dataset.v)")
    check("…2.0: the choice on your last tool is no ★, no pre-selection and no “last time” line; the question is asked (nothing decided)", se["d"] == "aud" and se["pol"] == "" and se["star"] == [] and se["aud"] is None and "Cone 18 C" not in ev(pg, "(document.querySelector('.cone-q[data-d]') || {}).innerText || ''"), [se, pre])
    rows_settle(pg, pidE)
    check("…2.0: the open row carries no ★ from another tool", ev(pg, "(() => { const r = rowsOf(curP()).find(r => r.src === 'cone:aud'); return !!r && r.status === 'open' && !r.star; })()"))
    finish_pick(pg); pg.wait_for_timeout(200); wait_ai(pg)
    check("…once answered, the said kind is taken", ev(pg, "(() => { const c = coneRead(curP()); return !!c.ending && c.ending.f === 'C' && c.ending.via === 'said'; })()"), ev(pg, "coneRead(curP())"))
    new_tool(pg, "Cone 18 F", "I need something for prices")
    press_start(pg)
    pg.fill("#cone-say-in", "zzz nothing like any of these"); pg.locator(".cone-nothere button[type=submit]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    check("something not here: a new kind in your words, marked unverified, never a guess", ev(pg, "(() => { const c = coneRead(curP()), x = coneFam(c, 'X'); return !!x && x.custom && c.picked && c.picked.f === 'X' && !!document.querySelector('.cone-card.custom[data-f=X] .chip.warn'); })()"))
    finish_cone(pg); pg.wait_for_timeout(200); wait_ai(pg)
    check("…it asks who it is for and whether it acts outward, then takes it", ev(pg, "(() => { const c = coneRead(curP()); return !!c.ending && c.ending.custom && !!coneAns(c).aud && !!coneAns(c).out; })()"), ev(pg, "coneRead(curP())"))

    print("2c “me and others” / “not sure”: private first, portability on, nothing defaulted away")
    new_tool(pg, "Cone 18 G", "A board for me and my team to plan the garden")
    press_start(pg)
    q = ev(pg, "(() => { const e = document.querySelector('.cone-q[data-d=aud]'); return e ? (e.querySelector('.cone-opt.pre') || {dataset: {}}).dataset.v : ''; })()")
    check("“for me and my team” is read as me and others", q == "both", q)
    answer(pg, "aud", "unsure")
    r = ev(pg, "(() => { const p = curP(), c = coneRead(p); return {live: coneLiveFams(c).length, all: c.fams.length, port: p.audience.portable, priv: chkPrivate(p), hatch: document.querySelectorAll('.cone-card.hatched').length, shouldHatch: c.fams.filter(f => coneHatched(c, f)).length}; })()")
    check("“not sure” cuts nothing, builds private-first with portability on; kinds that fit one side only stay, hatched", r["live"] == r["all"] and r["port"] and r["priv"] and r["hatch"] == r["shouldHatch"], r)
    ev(pg, "ACTIONS['cone-x']({dataset: {d: 'aud'}})"); pg.wait_for_timeout(100)
    answer(pg, "aud", "both")
    check("“me and others”: private first with portability on, the line says so", ev(pg, "curP().audience.portable === true && chkPrivate(curP()) && coneContextBlock(curP()).includes('\"private_first_portable\":true')"))

    print("7 tools from 1.7: re-run the cone once")
    old = ev(pg, "(() => { const p = WS.projects.find(x => coneOfferable(x) && arr(x.decisions).length) || WS.projects.find(x => coneOfferable(x)); return p ? {id: p.id, dec: arr(p.decisions).length, log: pickRead(p).log.length, name: p.name} : null; })()")
    check("a tool from before 1.8 gets the offer (once); a new or already-started tool does not", old and not ev(pg, "(id) => coneOfferable(WS.projects.find(x => x.id === id))", pidA), old)
    ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); p.audience = {customers: true, eu: false}; openProject(id); }", old["id"]); pg.wait_for_timeout(400)
    check("…on the tool's cover, under what the tool is", ev(pg, "UI.home && !!document.querySelector('.pg-cover ~ .cone-offer [data-a=cone-rerun], .cone-offer [data-a=cone-rerun]') && !!document.querySelector('.cone-offer [data-a=cone-norerun]')"))
    check("…and as a card for other screens (Health's day-one screen): coneOffer(p)", ev(pg, "(id) => { const h = coneOffer(WS.projects.find(x => x.id === id)); return h.includes('data-a=\"cone-rerun\"') && h.includes('data-id=\"' + id + '\"'); }", old["id"]))
    cr0, mk0 = n_calls(pg, "cone"), n_calls(pg, "mock")
    pg.locator(".cone-offer [data-a=cone-rerun]").first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(200)
    rr = ev(pg, "(() => { const p = curP(), c = coneRead(p); return {rerun: c.rerun, stage: pk8Stage(p), on: !!document.querySelector('.pk-deck .cone'), title: (document.querySelector('.cone h2') || {}).textContent || '', pre: (document.querySelector('.cone-q[data-d=aud] .cone-opt.pre') || {dataset: {}}).dataset.v, line: (document.querySelector('.cone-q .cone-pre') || {}).textContent || ''}; })()")
    check("“go through it once” opens the cone on the Pick page, pre-filled from what was decided", n_calls(pg, "cone") == cr0 + 1 and rr["rerun"] and rr["stage"] == "cone" and rr["on"] and rr["title"] == ev(pg, "t('cone.title.rerun')") and rr["pre"] == "customers" and ev(pg, "t('cone.pre.earlier', {x: t('cone.known.cust')})") in rr["line"], rr)
    answer(pg, "aud", "me")
    cf = ev(pg, "(() => { const p = curP(); return {card: !!document.querySelector('.cone-conflict [data-a=cone-keep]') && !!document.querySelector('.cone-conflict [data-a=cone-replace]'), aud: p.audience.customers, ans: coneAns(coneRead(p)).aud || null}; })()")
    check("an answer that differs from an earlier decision changes nothing by itself: keep or replace?", cf["card"] and cf["aud"] is True and cf["ans"] is None, cf)
    pg.locator(".cone-conflict [data-a=cone-keep]").first.click(); pg.wait_for_timeout(200)
    check("…“keep” keeps the earlier decision (customers)", ev(pg, "curP().audience.customers === true && coneAns(coneRead(curP())).aud.v === 'customers'"))
    undo_last(pg); pg.wait_for_timeout(100)
    answer(pg, "aud", "me"); pg.locator(".cone-conflict [data-a=cone-replace]").first.click(); pg.wait_for_timeout(200)
    check("…“replace” is your tap: only then the decision changes", ev(pg, "curP().audience.customers === false && curP().audience.who === 'me' && coneAns(coneRead(curP())).aud.v === 'me'"))
    finish_cone(pg)
    tk = ev(pg, "(() => { const b = document.querySelector('.cone-take [data-a=cone-take]'); return b ? b.dataset.f : ''; })()")
    if tk: pg.locator(f'.cone-take [data-a=cone-take][data-f="{tk}"]').first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    fin = ev(pg, "(o) => { const p = curP(); return {end: !!coneRead(p).ending, stage: pk8Stage(p), dec: arr(p.decisions).length, log: pickRead(p).log.length, offer: coneOfferable(p)}; }", old)
    check("…a few taps: the kind is recorded, nothing else changed (no mock, picks and decisions as they were), never offered again", fin["end"] and fin["stage"] != "cone" and n_calls(pg, "mock") == mk0 and fin["dec"] == old["dec"] and fin["log"] == old["log"] and not fin["offer"], [fin, old, n_calls(pg, "mock") - mk0])
    old2 = ev(pg, "(id) => { const p = WS.projects.find(x => x.id !== id && coneOfferable(x)); return p ? p.id : ''; }", old["id"])
    if old2:
        ev(pg, "(id) => openProject(id)", old2); pg.wait_for_timeout(300)
        pg.locator(".cone-offer [data-a=cone-norerun]").first.click(); pg.wait_for_timeout(200)
        check("“no thanks”: the offer does not come back (stored with the tool)", ev(pg, "(id) => { const p = WS.projects.find(x => x.id === id); return !coneOfferable(p) && !!p.cone.dismissed && !document.querySelector('.cone-offer'); }", old2))
        undo_last(pg)
        check("…Undo brings the offer back", ev(pg, "(id) => coneOfferable(WS.projects.find(x => x.id === id)) && !!document.querySelector('.cone-offer')", old2))
    else: print("      (only one tool from before 1.8 in this data: “no thanks” was checked on the made-up bundle)")

    print("start switch: fast and questions first still work")
    new_tool(pg, "Cone 18 fast", "A page that ranks my weekly fundraising ideas")
    pg.locator(".pk-start [data-a=pk8-start][data-v=fast]").first.click(); pg.wait_for_timeout(150)
    check("fast is kept for this idea; Undo takes it back to kinds of tool", ev(pg, "pickRead(curP()).start === 'fast' && !!document.querySelector('.pk8-start [data-v=fast].on')") and undo_last(pg) and ev(pg, "!pickRead(curP()).start && !!document.querySelector('.pk8-start [data-v=cone].on')"))
    pg.locator(".pk-start [data-a=pk8-start][data-v=fast]").first.click(); pg.wait_for_timeout(150)
    cf0 = n_calls(pg, "cone"); press_start(pg); wait_ai(pg)
    check("fast skips straight to the mock as before (no cone)", n_calls(pg, "cone") == cf0 and ev(pg, "pk8Stage(curP()) === 'mock' && !!curP().mock && !coneRead(curP())"), [ev(pg, "pk8Stage(curP())"), n_calls(pg, "cone") - cf0])
    new_tool(pg, "Cone 18 qs", "A page that ranks my weekly fundraising ideas", "questions")
    press_start(pg)
    check("questions first: the three questions as before (no cone)", ev(pg, "pk8Stage(curP()) === 'questions' && !!document.querySelector('.pk8-qs #pk8-q-users') && !coneRead(curP())"))
    new_tool(pg, "Cone 18 skip", "A page that ranks my weekly fundraising ideas")
    press_start(pg)
    pg.locator(".cone [data-a=cone-skip]").first.click(); pg.wait_for_timeout(300); wait_ai(pg); pg.wait_for_timeout(200); wait_ai(pg)
    check("“skip” in the cone goes straight to the mock", ev(pg, "coneRead(curP()).state === 'skipped' && pk8Stage(curP()) === 'mock' && !!curP().mock"))

    print("save + reload")
    ev(pg, "(async () => { for (const p of WS.projects){ touch(p); try{ await saveProject(p); }catch(e){ onAppError(e && e.message, 'test'); } } saveWs(); })()"); pg.wait_for_timeout(2500)
    seed2 = ev(pg, "JSON.stringify(window.__mockdb())")
    ctx2 = b.new_context(viewport={"width": 1440, "height": 900}); ctx2.add_init_script("if (window === window.top) window.__seed = " + seed2 + ";"); ctx2.add_init_script(MOCK)
    pg2 = open_page(ctx2); pg2.wait_for_timeout(600)
    rl = ev(pg2, f"(() => {{ const p = WS.projects.find(x => x.id === '{pidA}'); const c = p && coneRead(p); return c ? {{f: c.ending && c.ending.f, aud: coneAns(c).aud && coneAns(c).aud.v, n: c.fams.length}} : null; }})()")
    check("the cone (answers, kinds, the kind taken) survives save + reload with the tool", rl and rl["f"] == f1 and rl["aud"] == "me" and rl["n"] == 7, rl)
    ctx2.close()

    print("three languages")
    raw = []
    new_tool(pg, "Cone 18 L", "A page just for me that tracks my plant watering")
    press_start(pg)
    ev(pg, "(() => { UI.coneStar = Object.assign({}, UI.coneStar, {[curP().id]: 'tap'}); ACTIONS['cone-ans']({dataset: {d: 'aud', v: 'customers'}}); UI.coneRem = {[curP().id]: true}; render(); })()"); pg.wait_for_timeout(400)
    for lang in ["de", "zh", "en"]:
        ev(pg, f"(() => {{ LANG = '{lang}'; render(); }})()"); pg.wait_for_timeout(150)
        txt = ev(pg, "document.querySelector('.cone').innerText")
        if re.search(r"\bcone\.[a-z]", txt) or "ß" in txt: raw.append([lang, re.findall(r"cone\.[a-z.]+", txt)[:5]])
        if lang == "zh" and not re.search(r"[一-鿿]{4}", txt): raw.append([lang, "no Chinese"])
    check("the cone in German and Chinese: no raw keys, no ß, Chinese text", not raw, raw)
    miss = ev(pg, """(() => { const out = [], k = x => { const r = STR[x]; if (!Array.isArray(r) || r.length !== 3 || r.some(s => !s)) out.push(x); };
      for (const d of CONE_DIMS){ k('cone.q.' + d); k('cone.qs.' + d); for (const v of CONE_OPTS[d]){ k('cone.o.' + d + '.' + v); k('cone.rev.' + d + '.' + v); } }
      for (const f of CONE_FAMS){ k('cone.f.' + f); k('cone.f.' + f + '.get'); } for (const s of CONE_CAT) k('cone.s.' + s.id); for (const w of ['m', 'o', 'c']) k('cone.who.' + w); for (const r of ['cheap', 'mid', 'costly']) k('cone.rev.' + r); return out; })()""")
    check("every key the cone builds from parts exists in all three languages", not miss, miss)

    print("three widths, no sideways scroll")
    for w in [1440, 1024, 390]:
        cx = new_ctx(b, w=w, h=900); p3 = open_page(cx); p3.wait_for_timeout(300)
        new_tool(p3, "Cone 18 W", "A page just for me that tracks my plant watering"); press_start(p3)
        ev(p3, "(() => { ACTIONS['cone-ans']({dataset: {d: 'aud', v: 'customers'}}); UI.coneRem = {[curP().id]: true}; UI.coneStar = {[curP().id]: 'tap'}; render(); })()"); p3.wait_for_timeout(450)
        for lang in ["en", "de", "zh"]:
            ev(p3, f"(() => {{ LANG = '{lang}'; render(); }})()"); p3.wait_for_timeout(120)
            r = ev(p3, """(() => { const vw = innerWidth, m = document.querySelector('.main'); const wide = [...document.querySelectorAll('.cone *, .pk8-start *')].filter(e => e.getClientRects().length && e.getBoundingClientRect().right > vw + 1).slice(0, 3).map(e => e.className || e.tagName);
              return {page: document.documentElement.scrollWidth <= vw + 1, main: !m || m.scrollWidth <= m.clientWidth + 1, wide, cone: !!document.querySelector('.cone .cone-card')}; })()""")
            check(f"{w}px {lang}: the cone fits, no sideways scroll", r["page"] and r["main"] and not r["wide"] and r["cone"], r)
        ev(p3, "(() => { LANG = 'en'; render(); })()")
        cx.close()

    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:8]: print("  ERR", e)
sys.exit(1 if fails or errors else 0)
