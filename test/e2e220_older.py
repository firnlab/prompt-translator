"""2.2.0: the owner's 18 older tool requests (19 Oct – 5 Nov 2026), each re-tested on today's code (ids only; the texts stay in PT).
Fixed in 2.2.0 and pinned here:
 R18 tf-mw2xknn881s6n  "Check them now" / "Judge my own examples" opened nothing in Pick Mode → both open the Idea page with the round and the board
 R2  tf-mvn24tz6f2rgx  out-of-scope: what it does, where to confirm, where suggestions come from → said in the help line
 R8  tf-mvzmjgrk0d8qk  "fix it together" named no real button → the explanation names the button that exists
 R7  tf-mvzm19q97z5ku  right-sizing: say it is about automation → the reason line says so
 R12 tf-mvzterwr74ew0  after the last example: no jump back, and a line says all are judged and names the next step
 R17 tf-mw17mj7g4ayu3  "what was that error?" → a report sent within 10 minutes of an error carries it
 + found on the way: a code note ("// ok:trunc …") showed as text on the goal card → no screen shows code notes
Already fixed before 2.2.0, pinned here so they stay fixed:
 R1  tf-mvfhm9abzrcw5  Add requirement: a row appears and the cursor is in it
 R11/R13 tf-mvzt8ndrhzcr6, tf-mvztl47rno9ow  examples never ask (the rule is in every example prompt, 2.0.0)
 R15 tf-mvzubbagaix5z, R5 tf-mvzldrf07uzax  the facts book's NEVER rules and earlier answers go into every prompt (2.0.0)
 R9/R10/R14 tf-mvzsothd6e08g, tf-mvzsyoyjfgoyw, tf-mvztzjsm1ytz8  routes first, detail questions wait until a route is taken (2.0.0)
 R4 tf-mvzl09mpa5efi  assumptions are answered as picks (accept for now ★ / it is true / it is wrong)
 R3 tf-mvzkxmj2vmwlt  the assumptions page uses two equal columns at 1440 px (no squeezed text)
Covered by a design, not a single check: R16 tf-mvzumci7rbobv (Chat Mode, 2.0.0), R6 tf-mvzlgbnnmen0a (status slot + Next bar)."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "test/fixtures/synthetic.json"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
NOTE = re.compile(r"//\s*ok:|\bok:(raw|trunc|catch|css)\b")

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(400)
    seen = lambda: ev(pg, "({loop: !!document.querySelector('.loophead'), board: !!document.getElementById('exboard'), pg: (UI.pg || {}).id || ''})")

    print("R18 the two buttons of 'Not checked on your examples yet' in Pick Mode")
    ev(pg, """() => { const p = WS.projects[0]; openProject(p.id); UI.home = false; face20Set(p, 'pick'); const g = goalOf(p);
      p.northStar.goal = p.northStar.goal || 'Turn speech into clean text';
      g.criteria = [{id: 'C1', text: 'Keeps every word', st: 'decided', checked: []}, {id: 'C2', text: 'Fixes punctuation', st: 'decided', checked: []}];
      p.phase = 'review'; touch(p); render(); }"""); pg.wait_for_timeout(300)
    labels = ev(pg, "(() => { const it = queueOf(curP()).find(x => x.kind === 'crit-unchecked'); window.__O = it ? qOptions(curP(), it) : []; return window.__O.map(o => o.label); })()")
    check("the question is asked with its two answers", len(labels) == 2, labels)
    before = seen()
    ev(pg, "(async () => { await window.__O[1].run(); render(); })()"); pg.wait_for_timeout(500)
    s1 = seen()
    check("“Judge my own examples” opens the Idea page with the examples board on screen", s1["pg"] == "idea" and s1["board"] and not before["board"], [before, s1])
    n0 = ev(pg, "(window.__sampleLog || []).length")
    ev(pg, "(async () => { await window.__O[0].run(); render(); })()"); pg.wait_for_timeout(2500)
    s2 = seen()
    check("“Check them now” opens the round on the Idea page, so the AI call it spends is on screen", s2["pg"] == "idea" and s2["loop"] and ev(pg, "loopRead(curP()).phase") == "react" and ev(pg, "(window.__sampleLog || []).length") - n0 == 1, [s2, ev(pg, "loopRead(curP()).phase")])

    print("R12 the last example of a round")
    n = ev(pg, "loopCur(curP()).list.length")
    ev(pg, """(n) => { const p = curP(); const {list} = loopCur(p); for (let j = 0; j < n - 1; j++){ list[j].verdict = 'good'; } loopOf(p).i = n - 1; render(); }""", n)
    last_id = ev(pg, "loopCur(curP()).list.slice(-1)[0].id")
    pg.locator(f"[data-a=ex-grade][data-id={last_id}][data-v=good]").first.click(); pg.wait_for_timeout(300)
    st = ev(pg, "({i: loopRead(curP()).i, n: loopCur(curP()).list.length, line: (document.querySelector('.loop-alldone') || {}).textContent || ''})")
    check("judging the last example stays on it (no jump back to one already judged)", st["i"] == st["n"] - 1, st)
    check("…and a line says all are judged and names the next button", f"All examples judged ({st['n']} of {st['n']})" in st["line"] and "Show the rules behind my reactions" in st["line"], st["line"])

    print("R1 Add requirement")
    ev(pg, "() => { const p = WS.projects[1]; openProject(p.id); UI.home = false; face20Set(p, 'pick'); pgOpen(p, 'design'); pgShowPhase(p, 'require'); render(); }"); pg.wait_for_timeout(300)
    c0 = ev(pg, "curP().requirements.length")
    pg.locator("[data-a=add-req]").first.click(); pg.wait_for_timeout(900)
    r1 = ev(pg, "(() => { const id = curP().requirements.slice(-1)[0].id; const el = document.getElementById('ir-req:' + id) || [...document.querySelectorAll('.irow')].find(e => e.textContent.includes(id)); return {n: curP().requirements.length, shown: !!el, cursor: !!el && el.contains(document.activeElement)}; })()")
    check("a new requirement row appears and the cursor is in it", r1["n"] == c0 + 1 and r1["shown"] and r1["cursor"], r1)

    print("R2, R7, R8 words")
    check("out of scope: says what it is for, that each line is the decision, and where suggestions come from (three languages)",
          all(w in ev(pg, f"STR['req.oos.sub'][{i}]") for i, w in ((0, "nothing else to confirm"), (0, "PT suggests lines"), (1, "nichts zu bestätigen"), (2, "无需另外确认"))), "")
    check("the right-size reason says it is about automation", "automation" in ev(pg, "STR['q.why.gate'][0]") and "Automatisierung" in ev(pg, "STR['q.why.gate'][1]"), ev(pg, "STR['q.why.gate'][0]"))
    check("a finding's explanation recommends only buttons that exist (“together” = the draft-and-pick button)", ev(pg, "[0,1,2].every(i => STR['rev.choice.together'][i] === STR['rev.fixtogether'][i])"), ev(pg, "STR['rev.choice.together']"))

    print("R17 a report right after an error")
    ev(pg, "() => { onAppError('Probe error for the report', 'test'); UI.modal = {kind: 'toolreport', where: 'Test'}; render(); }"); pg.wait_for_timeout(200)
    ev(pg, "() => { document.getElementById('tr-in').value = 'What was that error?'; FORMS['tool-report'](); }"); pg.wait_for_timeout(200)
    rep = ev(pg, "arr(WS.toolfb)[0] || {}")
    check("the report carries the error it was sent after", rep.get("lastError") == "Probe error for the report" and rep.get("text") == "What was that error?", {k: rep.get(k) for k in ("text", "lastError")})

    print("R11/R13, R15/R5 prompts")
    pr = ev(pg, "(() => { const p = curP(); return buildPrompt('loop-show', {proj: p, rules: [], context: '', body: 'x', schema: '{}'}); })()")
    check("every example prompt carries “Examples never ask”", "Examples never ask" in pr, pr[:200])
    nv = ev(pg, """(() => { const p = curP(); factsAdd(p, {kind: 'never', words: 'never log in to Google or Samsung'}); return buildPrompt('pick-next', {proj: p, rules: [], context: '', body: 'x', schema: '{}'}); })()""")
    check("a NEVER rule from the facts book is in the next prompt", "never log in to Google or Samsung" in nv and "<your_rules" in nv, nv[:300])

    print("R4, R3 assumptions")
    ev(pg, """() => { const p = curP(); p.assumptions = [{id: 'A1', text: 'People will dictate mostly in German, with some English words mixed in', category: 'feasibility', impact: 4, risk: 4, status: 'untested', test: ''}]; touch(p); }""")
    opts = ev(pg, "(() => { const p = curP(); const O = qOptions(p, {kind: 'assumption', ref: 'assumption:A1'}); return O.map(o => o.label); })()")
    check("an assumption is answered as a pick with three answers, the first one click", len(opts) == 3 and "Accept for now" in opts[0], opts)
    lay = ev(pg, """(() => { const main = document.querySelector('.main-inner'); const d = document.createElement('div'); d.id = 'probe-as'; d.innerHTML = phAssume(curP()); main.appendChild(d);
        const w = [...d.querySelectorAll('.irow .ititle')].map(e => e.getBoundingClientRect().width); const out = {min: Math.min(...w), main: main.getBoundingClientRect().width}; d.remove(); return out; })()""")
    check("the assumptions list is not squeezed at 1440 px (each line at least 40 % of the column)", lay["min"] >= 0.4 * lay["main"], lay)

    print("no screen shows code notes")
    bad = []
    for js in ["() => { go('cockpit'); }", "() => { go('library'); }", "() => { go('settings'); UI.setTab = 'knowledge'; render(); }", "() => { go('settings'); UI.setTab = 'general'; render(); }",
               "() => { const p = WS.projects[0]; openProject(p.id); UI.home = false; face20Set(p, 'chat'); render(); }",
               "() => { const p = WS.projects[0]; openProject(p.id); UI.home = false; face20Set(p, 'pick'); render(); }",
               "() => { const p = WS.projects[2]; openProject(p.id); UI.home = false; face20Set(p, 'chat'); render(); }"]:
        ev(pg, js); pg.wait_for_timeout(300)
        txt = ev(pg, "document.body.innerText")
        m = NOTE.search(txt)
        if m: bad.append((js[:50], txt[max(0, m.start() - 40): m.end() + 40]))
    for pid in (0, 1, 2):   # the goal card (where the note leaked) rendered on its own for every project, with and without history
        txt = ev(pg, """(i) => { const p = WS.projects[i]; const d = document.createElement('div'); d.innerHTML = goal20HTML(p); const a = d.textContent;
            const g = goal20Read(p); const h0 = g.hist; g.hist = [{v: 1, at: now(), f: {outcome: 'old goal'}}]; d.innerHTML = goal20HTML(p); g.hist = h0; return a + ' ' + d.textContent; }""", pid)
        m = NOTE.search(txt)
        if m: bad.append(("goal card " + str(pid), txt[max(0, m.start() - 40): m.end() + 40]))
    check("no code note (“// ok:…”) is visible on the main screens in either mode, nor on the goal card", not bad, bad[:3])
    check("no page errors in the whole run", not [e for e in errors if "Probe error" not in e], errors[:4])
    b.close()
print(f"\n== e2e220_older: ok: {len(oks)} failed: {len(fails)} page errors: {len([e for e in errors if 'Probe error' not in e])}")
for f in fails: print("FAIL", f)
sys.exit(1 if fails or [e for e in errors if "Probe error" not in e] else 0)
