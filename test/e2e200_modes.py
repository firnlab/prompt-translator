"""2.0.0 Part C ("Two modes"): Pick and Chat with structure are two faces of one ledger; the five 1.x modes are gone; every project
moves to 2.0 additively behind a "Before 2.0" restore point; the acceptance test "RC replay" — on a COPY of the real data
(work/backup-140, work/backup-141) or the made-up bundle (test/fixtures/synthetic.json), with the mock runtime.
Run: python3 test/e2e200_modes.py [work/backup-141 | work/backup-140 | test/fixtures/synthetic.json] [--only C1,C2,…,R]
 C1 two faces only: Pick and Chat with structure (the switch in every project, also on the cover), the 1.x views and their switchers,
    actions and strings are gone; a stored 1.x view ("steps", "blueprint" …) opens as Pick; Settings and the start screen offer the two.
 C2 Chat with structure: a message is answered and filed into the facts book ("✓ Noted as never" with ✎ and take back), its prompt
    carries <your_rules> first and the route-splitting rule before the decision (<chosen_route> after it); a never is filed by code
    when the call fails; an answer that still breaks a rule is left out; feedback about PT is never filed (Improve PT is offered);
    a question PT asks is a pick card (answered in the chat = answered in Pick); a question already answered is not asked again;
    goal guesses go to the goal card as PT's guess; the map and the goal card open beside the chat; the one Next; chips.
 C3 Pick improved: before the decision the Picks page leads to the route (goal → map → shortlist → compare), the details wait;
    the Decided list (Pick's Decisions page and the chat's Decided tab) is built from the facts book's decisions and the picks; an
    answer after the decision goes through the Route alert's watch.
 C4 the move to 2.0: a restore point "Before 2.0" per project (never deleting one), additive (every earlier field unchanged), the
    project's own rules into its book, its 1.x design options onto its map (a confirmed choice = the chosen route), the new order
    only where safe; run twice = the same; nothing from another project.
 R  RC replay on every project of both workspaces: migrate, then replay its history through Chat and Pick — nothing lost, no
    cross-project content, rules never cut, no repeated questions, the order goal → map → decide → details, both faces show the
    same ledger.
 three languages (no raw keys, no ß), 390 px without sideways scroll, targets ≥ 24 px, no page errors."""
import json, sys, pathlib, re
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLY = set()
for i, a in enumerate(sys.argv):
    if a == "--only" and i + 1 < len(sys.argv): ONLY = set(sys.argv[i + 1].split(","))
    elif a.startswith("--only="): ONLY = set(a.split("=", 1)[1].split(","))
ARGS = [a for a in ARGS if not (ONLY and a == ",".join(sorted(ONLY))) and not re.fullmatch(r"[A-Z0-9,]+", a)]
BK = ARGS[0] if ARGS else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def on(part): return not ONLY or part in ONLY
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=40000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0 && !M20RUN.total"):
            pg.wait_for_timeout(350)
            if ev(pg, "AI.running.size === 0 && !M20RUN.total"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def main(pg): return ev(pg, "(document.querySelector('.main') || {}).innerText || ''")
def raw_keys(text): return sorted(set(re.findall(r"\b(?:c20|face|m20|g20|st20)\.[a-z][a-z0-9.]*\b", text)))
def say(pg, text):
    pg.fill("#c20-in", text); pg.locator("form[data-form=c20-say] button[type=submit]").click(); wait_ai(pg)
def prompts(pg, task): return ev(pg, f"(window.__allPrompts || []).filter(x => x.includes('[[task:{task}]]'))")
def sx(pg): return ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
NEVER = "We never log in to Google or Samsung accounts."
OTHER = "We never upload the photos to Dropbox."
# 2.0 gate (cause 99): aiImpactParts and its busy line cm.thinking stay — the Run page's change request (Operate) asks which parts a
# change touches; only the change map that also used them is gone (its actions cmap / cmap-ask are in OLD_ACTS)
OLD_FNS = ["modeSteps", "modeJourney", "modeSwimlanes", "modeExpress", "modeBlueprint", "spineHTML", "aiExpressDraft", "aiExpressNext"]
OLD_ACTS = ["goto-steps", "express-draft", "express-next", "express-change", "cmap", "cmap-ask", "pk-map", "mode-back", "xp-more", "xp-fold", "confirm-all-as"]
OLD_KEYS = re.compile(r"^(j\.(after|here|next)$|lane\.|sl\.step$|sp\.map\.|md\.|mode\.(label|suggested|switched)$|m\.(steps|journey|swimlanes|express)$|mg\.(steps|blueprint|journey|swimlanes|express)$|nav\.backto$|act\.express$|as\.confirmstep$|xp\.(title|lead|draft|drafting|draftnext|needs|next|ai|you|change|changeph|keys|acceptall|accepted|allset|okn|openfull|tocheck|hint)$|cm\.(ask|flagged|items|none|parts|untouched)$)")
NEW_PROJ = """(name, mode) => { const p = blankProject(name); p.mode = mode; p.autoInterview = false; WS.projects.push(p); touch(p); openProject(p.id); return p.id; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")

    # ---------- C1 two faces only ----------
    if on("C1"):
        print("C1 two faces only")
        check("only two faces exist: Pick and Chat with structure", ev(pg, "JSON.stringify(MODES)") == '["pick","chat"]', ev(pg, "MODES"))
        gone = ev(pg, f"{json.dumps(OLD_FNS)}.filter(f => typeof window[f] === 'function' || (() => {{ try{{ return typeof eval(f) === 'function'; }}catch(e){{ return false; }} }})())")
        check("the 1.x views are gone from the code (Steps, Journey, Swimlanes, Express, Blueprint, the Express and change-map calls)", not gone, gone)
        acts = ev(pg, f"{json.dumps(OLD_ACTS)}.filter(a => ACTIONS[a])")
        check("…and their actions and switchers", not acts, acts)
        keys = ev(pg, "Object.keys(STR)")
        left = [k for k in keys if OLD_KEYS.match(k)]
        check("…and their strings (all three languages, from the string tables)", not left, left[:12])
        pid = ev(pg, "(" + NEW_PROJ + ")('Two faces', 'steps')"); pg.wait_for_timeout(300)
        check("a stored 1.x view ('steps') opens as Pick", ev(pg, "projMode(curP())") == "pick" and not ev(pg, "!!document.querySelector('.steps2, .journey, .lgrid, .xp')"))
        for m in ("blueprint", "journey", "swimlanes", "express", ""):
            ev(pg, f"(() => {{ curP().mode = '{m}'; render(); }})()")
            check(f"…and '{m or 'none'}' too, without the old screens", ev(pg, "projMode(curP())") == "pick" and not ev(pg, "!!document.querySelector('.steps2, .journey, .lgrid, .xp, [data-a=mode-back]')"))
        ev(pg, "ACTIONS['home'](); render()"); pg.wait_for_timeout(200)
        sw = ev(pg, "[...document.querySelectorAll('.face20 button')].map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed'))")
        check("the switch is in the project, also on the cover: Chat with structure · Pick (Pick pressed)", sw == ["chat:false", "pick:true"], sw)
        check("…no other way-of-working buttons are left", not ev(pg, "!!document.querySelector('[data-a=mode]:not(.face20 *), [data-a=pk-map], .modeseg:not(.face20)')"))
        pg.locator(".face20 [data-v=chat]").click(); pg.wait_for_timeout(300)
        check("one tap on Chat with structure shows the conversation (and saves the face)", ev(pg, "projMode(curP())") == "chat" and ev(pg, "!!document.querySelector('.c20 .c20-log[role=log]')") and ev(pg, "curP().mode") == "chat")
        pg.locator(".face20 [data-v=pick]").click(); pg.wait_for_timeout(300)
        check("…and back to Pick (the cover and its pages)", ev(pg, "projMode(curP())") == "pick" and not ev(pg, "!!document.querySelector('.c20')") and ev(pg, "!!document.querySelector('.pg-cover, .pg')"))
        ev(pg, "(() => { UI.view = 'settings'; UI.setTab = 'general'; render(); })()"); pg.wait_for_timeout(200)
        opts = ev(pg, "[...document.querySelectorAll('select')].map(s => [...s.options].map(o => o.value)).find(v => v.includes('pick')) || []")
        check("Settings: the default for new projects is one of the two faces", sorted(opts) == ["chat", "pick"], opts)
        ev(pg, "(() => { UI.view = 'start'; UI.home = false; render(); })()"); pg.wait_for_timeout(200)
        cards = ev(pg, "[...document.querySelectorAll('[data-a=start-mode]')].map(b => b.dataset.v)")
        check("the start screen offers the two faces", sorted(cards) in (["chat", "pick"], []), cards)
        ev(pg, f"openProject('{pid}')"); pg.wait_for_timeout(200)

    # ---------- C2 Chat with structure ----------
    if on("C2") or on("C3"):
        print("C2 Chat with structure")
        pid = ev(pg, "(" + NEW_PROJ + ")('Family list', 'chat')"); pg.wait_for_timeout(400)
        check("a new chat project shows the conversation, the stage strip, the one Next and the workspace", ev(pg, "!!document.querySelector('.c20 .c20-log') && !!document.querySelector('.c20 .st20') && document.querySelectorAll('.c20 .nx20-next').length === 1 && !!document.querySelector('.c20-ws .c20-tabs')"))
        check("…the composer is labelled and the conversation is a log region", ev(pg, "!!document.querySelector('label[for=c20-in]') && document.querySelector('.c20-log').getAttribute('aria-live') === 'polite'"))
        say(pg, "One shopping list the four of us share on our phones. " + NEVER + " ASKME")
        L = ev(pg, "curP().ledger.entries.map(e => ({id: e.id, kind: e.kind, words: e.words, src: e.src.k, ref: e.src.ref}))")
        check("the message is filed: the never in the person's own words, source: the chat", any(e["kind"] == "never" and e["words"] == NEVER and e["src"] == "chat" and e["ref"].startswith("chat:") for e in L), L)
        last = ev(pg, "curP().chat20.msgs.slice(-1)[0]")
        check("PT answers in the chat and names what it filed", last["by"] == "pt" and last["text"] and last["filed"], last)
        note = ev(pg, "[...document.querySelectorAll('.c20-note')].map(n => n.innerText).join(' | ')")
        check("…the receipt under the answer: ✓ Noted as never “…” with edit and take back", "Noted as never" in note and NEVER in note and ev(pg, "!!document.querySelector('.c20-note [data-a=c20-fedit]') && !!document.querySelector('.c20-note [data-a=facts-withdraw]')"), note)
        say(pg, "Fine.")
        P = prompts(pg, "chat20")[-1]; P = P[P.index("[[task:chat20]]"):]
        check("the chat's prompt has your rules first (<your_rules> right after the task line, the never whole)", re.match(r"\[\[task:chat20\]\]\n<your_rules", P) is not None and NEVER in P[:P.index("</your_rules>")], P[:300])
        check("…before the decision the route-splitting rule (no detail questions yet)", "route-splitting value" in P and "<chosen_route>" not in P)
        G = ev(pg, "goal20Read(curP())")
        check("a goal guess goes to the goal card as PT's guess (you confirm it)", G["f"]["outcome"] and G["by"].get("outcome") == "pt", G)
        cid = ev(pg, "(pickRead(curP()).cards.find(c => /phone calls/.test(c.q)) || {}).id || ''")
        check("PT's question in the chat is a pick card (the same card in Pick's deck)", cid and ev(pg, f"pickDeck(curP()).some(c => c.id === '{cid}')") and ev(pg, f"!!document.querySelector('.c20-ask [data-anchor~=\"pick:{cid}\"]')"), cid)
        pg.locator(f".c20-ask [data-a=pk-opt][data-id='{cid}']").first.click(); wait_ai(pg)
        ans = ev(pg, f"pickRead(curP()).log.find(e => e.cid === '{cid}')")
        check("answered in the chat = answered in Pick (the log has it, the deck has not)", ans and ans["answer"] and not ev(pg, f"pickDeck(curP()).some(c => c.id === '{cid}')"), ans)
        check("…the chat shows it as answered", "Answered:" in main(pg))
        ev(pg, "window.__chatCalls = 0")
        say(pg, "Anything to ask me? ASKAGAIN")
        n_ask = ev(pg, "pickRead(curP()).cards.filter(c => /^Who uses the list/.test(c.q)).length")
        ev(pg, "(() => { const p = curP(); const k = pickOf(p); const c = k.cards.find(x => /^Who uses the list/.test(x.q)); if (c) pickAnswer(p, c.id, {keys: ['A']}); render(); })()"); wait_ai(pg)
        say(pg, "Anything else? ASKAGAIN")
        again = ev(pg, "pickRead(curP()).cards.filter(c => /^Who uses the list/.test(c.q)).length")
        dropped = ev(pg, "curP().chat20.msgs.slice(-1)[0].dropped || false")
        check("a question already answered is not asked again (ask once: dropped, named in the chat)", n_ask == 1 and again == 0 and (dropped or ev(pg, "factsRead(curP()).known.length > 0")), [n_ask, again, dropped])
        nf = ev(pg, "factsActive(curP(), ['never']).length")
        say(pg, NEVER)
        check("saying a rule again files nothing twice (“Already in your facts book”)", ev(pg, "factsActive(curP(), ['never']).length") == nf and "Already in your facts book" in main(pg))
        say(pg, "TEMPT what is the easiest way?")
        lt = ev(pg, "curP().chat20.msgs.slice(-1)[0]")
        check("an answer that still breaks your rule is left out and named (never shown as advice)", lt.get("cut") and "Google" not in lt["text"] and "Left out" in main(pg), lt)
        nb = ev(pg, "factsRead(curP()).entries.length")
        say(pg, "PT, you must make the button text bigger, it is too small on this screen.")
        lp = ev(pg, "curP().chat20.msgs.slice(-1)[0]")
        check("feedback about PT is never filed into the project; Improve PT is offered", lp["about"] == "pt" and ev(pg, "factsRead(curP()).entries.length") == nb and ev(pg, "!!document.querySelector('[data-a=c20-ipt]')"), lp)
        pg.locator("[data-a=c20-ipt]").last.click(); pg.wait_for_timeout(200)
        check("…Send to Improve PT opens the report with the words filled in", ev(pg, "UI.modal && UI.modal.kind === 'toolreport' && /too small/.test(UI.modal.pre || '')"))
        close_modals(pg); ev(pg, "UI.modal = null; render()")
        ev(pg, "(() => { window.__mockOverride = (task) => task === 'chat20' ? 'Sorry, no.' : null; })()")
        say(pg, "We never send anything by e-mail.")
        ev(pg, "window.__mockOverride = null")
        lf = ev(pg, "curP().chat20.msgs.slice(-1)[0]")
        check("when the call fails, a never is still filed by code and the chat says so (Try again offered)", lf["fail"] and ev(pg, "factsActive(curP(), ['never']).some(e => /e-mail/.test(e.words))") and ev(pg, "!!document.querySelector('[data-a=c20-retry]')"), lf)
        say(pg, "QUOTEBAD my father has a Samsung phone.")
        check("a filed entry must quote the person (a made-up quote is sent back once and never filed)", not ev(pg, "factsRead(curP()).entries.some(e => /never said/.test(e.words))"))
        # the map and the goal card beside the conversation
        pg.locator(".c20-tabs [data-v=goal]").click(); pg.wait_for_timeout(250)
        check("the goal card opens beside the chat (the conversation stays)", ev(pg, "!!document.querySelector('.c20 .c20-ws [data-anchor=g20]') && !!document.querySelector('.c20 .c20-log')"))
        pg.locator(".c20-tabs [data-v=map]").click(); pg.wait_for_timeout(250)
        check("…and the map", ev(pg, "!!document.querySelector('.c20 .c20-ws .m20-goal') && !!document.querySelector('.c20 .c20-log')"))
        ev(pg, "m20Open(curP(), 'map')"); pg.wait_for_timeout(200)
        check("a Next or a chip that opens the map keeps the chat on screen", ev(pg, "c20Show(curP()) && c20St(curP()).tab === 'map'"))
        chips = ev(pg, "[...document.querySelectorAll('.c20-chips [data-a]')].map(b => b.textContent.trim())")
        check("chips offer the next choices so you rarely type", len(chips) >= 2, chips)
        nx = ev(pg, "[...document.querySelectorAll('.c20 .nx20-next [data-a]')].map(b => b.dataset.a + ':' + (b.dataset.v || ''))")
        check("one Next in the chat", len(nx) == 1, nx)
        # the decision: after it, the chat's prompt carries the chosen route
        ev(pg, "window.__mapCalls = []"); ev(pg, "m20Round(curP(), {kind: 'full'})"); wait_ai(pg, 90000)
        R = ev(pg, "m20Read(curP()).routes.filter(r => m20Status(curP(), r) !== 'blocked').map(r => r.id)")
        ev(pg, f"(() => {{ const p = curP(); actOpen(p, 't'); m20Short(p, '{R[0]}'); m20Short(p, '{R[1]}'); m20Of(p).looked = true; m20Take(p, '{R[0]}', {{why: 'free', trip: ['A phone of another maker']}}); actClose(p.id); touch(p); render(); }})()"); wait_ai(pg)
        say(pg, "Fine. What now?")
        P2 = prompts(pg, "chat20")[-1]
        check("after the decision the chat asks only what the chosen route needs (<chosen_route>, no route-splitting rule)", "<chosen_route>" in P2 and "route-splitting value" not in P2)
        # both faces, one ledger
        ev(pg, "(() => { const S = c20St(curP()); S.tab = 'decided'; render(); })()"); pg.wait_for_timeout(200)
        chat_ids = ev(pg, "[...document.querySelectorAll('.c20-ws [data-anchor=decided20] .item .small.muted')].map(x => (x.textContent.match(/^F\\d+/) || [''])[0]).filter(Boolean)")
        chat_facts = ev(pg, "[...document.querySelectorAll('.c20-ws .facts20, .c20-ws [data-anchor]')].length")
        ev(pg, "face20Set(curP(), 'pick')"); pg.wait_for_timeout(200)
        ev(pg, "ACTIONS['rows-open']()"); pg.wait_for_timeout(400)
        pick_ids = ev(pg, "[...document.querySelectorAll('[data-anchor=decided20] .item .small.muted')].map(x => (x.textContent.match(/^F\\d+/) || [''])[0]).filter(Boolean)")
        dec_fact = ev(pg, "factsActive(curP(), ['decision']).find(e => /^route:/.test(e.src.ref))")
        check("the Decided list is the facts book's decisions (the route decision: source dec, ref route:R…)", dec_fact and dec_fact["src"]["k"] == "dec" and dec_fact["id"] in chat_ids, [dec_fact, chat_ids])
        check("…the same list in Pick's Decisions page and in the chat's Decided tab", chat_ids == pick_ids and chat_ids, [chat_ids, pick_ids])
        ev(pg, "factsOpen(curP())"); pg.wait_for_timeout(200)
        book = ev(pg, "factsActive(curP()).map(e => e.id)")
        shown = ev(pg, "[...document.querySelectorAll('.main [data-fact]')].map(x => x.dataset.fact)")
        check("Pick's facts book shows every entry the chat filed", all(i in shown for i in book), [book, shown])
        ev(pg, "face20Set(curP(), 'chat')"); pg.wait_for_timeout(200)

    # ---------- C3 Pick improved ----------
    if on("C3"):
        print("C3 Pick improved")
        ev(pg, "window.__m20WatchN = 0; { const o = m20WatchSoon; window.m20WatchSoon = m20WatchSoon = function(p, it){ window.__m20WatchN++; window.__m20WatchLast = it; return o.apply(this, arguments); }; }")
        ev(pg, "(() => { const p = curP(); const k = pickOf(p); k.cards.push(Object.assign(pickCleanCard({q: 'Must the list work offline?', target: 'decision', multi: false, options: [{label: 'Yes', text: 'offline'}, {label: 'No', text: 'online'}], rec: 0, recWhy: 'x'}, 1, k), {})); touch(p); render(); })()")
        ev(pg, "(() => { const p = curP(); const c = pickRead(p).cards.find(x => /offline/.test(x.q)); pickAnswer(p, c.id, {keys: ['A']}); })()"); pg.wait_for_timeout(300)
        check("an answer after the decision goes through the Route alert's watch (a new fact source)", ev(pg, "window.__m20WatchN") >= 1 and (ev(pg, "(window.__m20WatchLast || {}).ref") or "").startswith("pick:"), ev(pg, "window.__m20WatchLast"))
        pid2 = ev(pg, "(" + NEW_PROJ + ")('Early pick', 'pick')"); pg.wait_for_timeout(300)
        ev(pg, "(() => { const p = curP(); p.northStar.goal = 'A shared family list'; const G = goal20Of(p); G.f.outcome = 'A shared family list'; G.by.outcome = 'you'; G.f.whom = 'us four'; G.by.whom = 'you'; G.f.success = 'nobody forgets milk'; G.by.success = 'you'; G.noNevers = true; p.assumptions.push({id: 'A1', text: 'Everyone has a phone', category: 'feasibility', impact: 3, risk: 3}); touch(p); pgOpen(p, 'picks'); })()"); pg.wait_for_timeout(300)
        check("before the decision the Picks page leads to the route first (goal → map → decide), the details wait", ev(pg, "!!document.querySelector('[data-anchor=pick-decide]')") and "Detail questions wait" in main(pg) and ev(pg, "stage20Early(curP()) && !queueOf(curP()).some(x => x.ph === 'assume')"), main(pg)[:400])
        ev(pg, "m20Round(curP(), {kind: 'full'})"); wait_ai(pg, 90000); ev(pg, "pgOpen(curP(), 'picks')"); pg.wait_for_timeout(200)
        rows = ev(pg, "document.querySelectorAll('[data-anchor=pick-decide] [data-a=m20-short]').length")
        check("…with the top routes to shortlist right there", rows >= 1, rows)
        pg.locator("[data-anchor=pick-decide] [data-a=m20-short]").first.click(); pg.wait_for_timeout(200)
        check("…a tap shortlists (the same map as everywhere)", ev(pg, "m20Read(curP()).short.length") == 1)
        check("the picks prompt before the decision is route-splitting only", "route-splitting value" in ev(pg, "buildPrompt('pick-next', {proj: curP(), body: 'b', schema: '{}'})"))

    # ---------- C4 the move to 2.0 ----------
    if on("C4"):
        print("C4 the move to 2.0")
        S = ev(pg, """WS.projects.filter(p => p.m200 && !p.m200.fresh).map(p => ({id: p.id, rp: p.m200.rp, has: arr(p.restore).some(r => r.id === p.m200.rp && /Before 2\\.0/.test(r.label)), order: p.m200.order, o20: p.order20, rules: p.m200.rules, routes: p.m200.routes, chosen: m20Read(p).chosen, arch: !!(p.arch && p.arch.chosen && !p.arch.chosenAssumed), errs: p.m200.errs}))""")
        check("every project that existed before 2.0 was moved once, with its restore point “Before 2.0”", S and all(x["has"] for x in S), S)
        check("…no step of the move failed", all(not x["errs"] for x in S), [x["errs"] for x in S])
        check("…a confirmed 1.x design choice is the chosen route (that project counts as decided)", all((not x["arch"]) or (x["chosen"] and x["o20"]) for x in S), S)
        check("…the new order only where it is safe (decided, or no details yet); a project mid-way keeps its order", all(x["order"] in ("decided", "early", "kept", "on") and (x["o20"] == (x["order"] != "kept")) for x in S), S)
        # a planted 1.x project: the move on its own, twice, and never across projects
        r = ev(pg, """(() => {
          const mk = (name, ns) => { const p = blankProject(name); delete p.m200; p.order20 = false; p.mode = 'swimlanes'; p.northStar.goal = 'g ' + name; p.northStar.constraints = ns; p.outOfScope = ['Payments']; p.arch.options = [{id: 'o1', name: 'Manual prompt ' + name, kind: 'prompt', summary: 's1'}, {id: 'o2', name: 'Scheduled agent ' + name, kind: 'agent', summary: 's2'}]; p.arch.chosen = 'o2'; p.requirements.push({id: 'R1', title: 'r', given: 'g', when: 'w', then: 't', priority: 'must'}); WS.projects.push(p); return p; };
          const A = mk('Photo tool', 'We never upload the photos to Dropbox. Photos stay on the Mac.'), B = mk('List tool', 'Only on our phones.');
          const before = JSON.parse(JSON.stringify(A)), rp0 = arr(A.restore).length;
          const ra = m200Run(A), rb = m200Run(B);
          const after1 = {L: JSON.stringify(A.ledger.entries.map(e => [e.kind, e.words, e.src.ref])), M: JSON.stringify(A.map20.routes.map(r => [r.id, r.name, r.from])), rp: arr(A.restore).length, chosen: A.map20.chosen, o20: A.order20, mode: A.mode, mb: A.modeBefore200};
          delete A.m200; m200Run(A);
          const after2 = {L: JSON.stringify(A.ledger.entries.map(e => [e.kind, e.words, e.src.ref])), M: JSON.stringify(A.map20.routes.map(r => [r.id, r.name, r.from])), rp: arr(A.restore).length};
          const kept = Object.keys(before).filter(k => !['restore', 'ledger', 'map20', 'goal20', 'chat20', 'm200', 'order20', 'mode', 'updatedAt', 'marks', 'acts', 'activity', 'rev', 'saved'].includes(k)).filter(k => JSON.stringify(before[k]) !== JSON.stringify(A[k]));
          const bWords = JSON.stringify([B.ledger, B.map20, B.chat20, B.goal20]);
          return {ra, rb, rp0, after1, after2, kept, crossB: /Dropbox|Photo tool|Manual prompt Photo/.test(bWords), aNever: A.ledger.entries.filter(e => e.kind === 'never').map(e => e.words), aOos: A.ledger.entries.some(e => /Payments/.test(e.short)), bid: B.id, aid: A.id};
        })()""")
        check("the move makes a restore point first", r["after1"]["rp"] == r["rp0"] + 1 and r["ra"]["rp"], r)
        check("…your 1.x rules go into the project's own facts book (a never stays a never; not-in-this-version is a never)", "We never upload the photos to Dropbox." in r["aNever"] and r["aOos"], r["aNever"])
        check("…the 1.x design options are routes on its map; the confirmed choice is the chosen route; the face is Pick, the old view kept", json.loads(r["after1"]["M"]) and r["after1"]["chosen"] and r["after1"]["o20"] and r["after1"]["mode"] == "pick" and r["after1"]["mb"] == "swimlanes", r["after1"])
        check("…additive: every field the project had is unchanged", not r["kept"], r["kept"])
        check("run twice = the same result (no second entry, route or restore point)", r["after1"]["L"] == r["after2"]["L"] and r["after1"]["M"] == r["after2"]["M"] and r["after1"]["rp"] == r["after2"]["rp"], [r["after1"], r["after2"]])
        check("nothing crosses projects: the other project's book, map, chat and goal hold none of this one's words", not r["crossB"])
        ev(pg, f"openProject('{r['bid']}')"); pg.wait_for_timeout(200)
        Pb = ev(pg, "buildPrompt('chat20', {proj: curP(), body: 'b', schema: '{}'})")
        check("…and none of its rules reach the other project's prompts", "Dropbox" not in Pb and f'project="{r["bid"]}"' in Pb, Pb[:200])
        rpn = ev(pg, "WS.projects.reduce((n, p) => n + arr(p.restore).length, 0)")
        ev(pg, "WS.projects.forEach(p => { if (p.m200 && !p.m200.fresh) { const x = p.m200; delete p.m200; m200Run(p); } })")
        check("a second run over the whole workspace deletes no restore point and adds none for unchanged projects", ev(pg, "WS.projects.reduce((n, p) => n + arr(p.restore).length, 0)") >= rpn)
        ev(pg, "WS.projects = WS.projects.filter(p => !['Photo tool', 'List tool'].includes(p.name)); render()")

    # ---------- languages, phone width, targets ----------
    if on("C2"):
        print("languages, phone width, targets")
        ev(pg, f"openProject('{pid}')"); ev(pg, "face20Set(curP(), 'chat')"); pg.wait_for_timeout(300)
        for tab in ("goal", "map", "decided", "plan", "events"):
            ev(pg, f"(() => {{ const S = c20St(curP()); S.tab = '{tab}'; S.side = 'ws'; render(); }})()"); pg.wait_for_timeout(150)
            small = ev(pg, "[...document.querySelectorAll('.c20 button, .c20 select, .c20 textarea')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 24).map(e => e.outerHTML.slice(0, 90))")
            check(f"chat · {tab}: every target at least 24 px high", not small, small[:3])
        for lang in ("de", "zh"):
            for tab in ("goal", "decided", "plan", "events"):
                ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); const S = c20St(curP()); S.tab = '{tab}'; render(); }})()"); pg.wait_for_timeout(150)
                tl = main(pg)
                check(f"{lang} chat · {tab}: in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl and "Conversation" not in tl and "Workspace" not in tl, raw_keys(tl))
        ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
        pg.set_viewport_size({"width": 390, "height": 844})
        for side in ("chat", "ws"):
            for tab in ("goal", "map", "decided", "plan"):
                ev(pg, f"(() => {{ const S = c20St(curP()); S.tab = '{tab}'; S.side = '{side}'; render(); }})()"); pg.wait_for_timeout(200)
                check(f"390 px: chat ({side} · {tab}) has no sideways scroll", sx(pg) <= 2, sx(pg))
        check("390 px: the switch between conversation and workspace is shown", ev(pg, "getComputedStyle(document.querySelector('.c20-sw')).display !== 'none'"))
        ev(pg, "face20Set(curP(), 'pick')"); pg.wait_for_timeout(200)
        check("390 px: Pick's cover has no sideways scroll", sx(pg) <= 2, sx(pg))
        pg.set_viewport_size({"width": 1440, "height": 950})
    ctx.close()

    # ---------- R the RC replay, on every project of both workspaces ----------
    if on("R"):
        print("R RC replay")
        for wsi in (0, 1):
            ctx = new_ctx(b); pg = open_page(ctx, pick=wsi); pg.wait_for_timeout(800)
            ws_name = ev(pg, "WS.id")
            pids = ev(pg, "WS.projects.map(p => p.id)")
            print(f"  workspace {wsi}: {len(pids)} projects")
            # the ledger of each project after the move, for the cross-project check
            rules_of = ev(pg, "Object.fromEntries(WS.projects.map(p => [p.id, factsActive(p, FACT_RULES).map(e => factText(e))]))")
            for pid in pids:
                ev(pg, f"openProject('{pid}')"); pg.wait_for_timeout(300)
                nm = ev(pg, "curP().name")
                tag = f"[{wsi}:{pid[-5:]}]"
                # nothing lost: the restore point "Before 2.0" holds the project as it was; every field it had is unchanged after the move
                lost = ev(pg, """(async () => { const p = curP(); const rid = p.m200 && p.m200.rp; if (!rid) return {none: true};
                    const r = await loadRestore(p, rid); const old = r && r.project; if (!old) return {noload: true};
                    const SKIP = new Set(['restore', 'ledger', 'map20', 'goal20', 'chat20', 'm200', 'order20', 'mode', 'updatedAt', 'marks', 'acts', 'activity', 'rev', 'saved', 'lang', 'pick', 'focus', 'phase']);
                    const diff = Object.keys(old).filter(k => !SKIP.has(k) && JSON.stringify(old[k]) !== JSON.stringify(p[k]));
                    const cnt = q => ({req: arr(q.requirements).length, tests: arr(q.tests).length, as: arr(q.assumptions).length, risks: arr(q.risks).length, dec: arr(q.decisions).length, qa: arr(q.qa).length, runs: arr(q.runs).length, rel: arr(q.releases).length, fnd: arr(q.findings).length, picks: arr(q.pick && q.pick.log).length, ex: arr(q.goal && q.goal.examples).length});
                    const a = cnt(old), b = cnt(p), less = Object.keys(a).filter(k => b[k] < a[k]);
                    const pkOld = JSON.stringify(arr(old.pick && old.pick.log)), pkNew = JSON.stringify(arr(p.pick && p.pick.log));
                    const changed = m200Changed(p, p.m200.prints || {}), recorded = arr(p.m200.changed);
                    return {om: old.mode, b160: p.modeBefore160, b200: p.modeBefore200, pm: p.mode, diff: changed, recorded, less, a, b, n: Object.keys(p.m200.prints || {}).length, pickSame: pkOld === pkNew, modeOk: MODES.includes(p.mode), modeKept: !MODES.includes(old.mode) ? [p.modeBefore200, p.modeBefore160].includes(old.mode) || !old.mode : true}; })()""")
                if lost.get("none"):
                    check(f"{tag} the project was moved (restore point Before 2.0)", False, lost); continue
                check(f"{tag} nothing lost: every field it had is unchanged by the move (a hash per field, {lost.get('n')}) and nothing counts less than in “Before 2.0”", not lost.get("noload") and lost.get("n") and not lost["diff"] and not lost["recorded"] and not lost["less"] and lost["pickSame"], lost)
                check(f"{tag} …its face is Pick or Chat; an old 1.x view is kept as modeBefore200", lost["modeOk"] and lost["modeKept"], lost)
                # rules never cut: every never / must, whole, in the rules block of every project prompt (also under a small budget)
                R0 = ev(pg, "factsActive(curP(), FACT_RULES).map(e => factText(e))")
                Pp = ev(pg, "buildPrompt('pick-next', {proj: curP(), body: 'b', schema: '{}', context: projectContext(curP(), {max: 2000, only: ['ns']})})")
                check(f"{tag} rules never cut: all {len(R0)} rules, whole, in the prompt (with a tiny context budget)", all(x in Pp for x in R0), [x for x in R0 if x not in Pp][:3])
                # cross-project: no other project's rule text in this project's book or prompts
                others = [w for q, ws in rules_of.items() if q != pid for w in ws if w not in R0 and len(w) > 12]
                mine = json.dumps(ev(pg, "[curP().ledger, curP().map20 && curP().map20.routes.map(r => r.name), curP().chat20]"))
                check(f"{tag} no cross-project content (no other project's rule in its book, map or chat, none in its prompt)", not [w for w in others if w in mine or w in Pp], [w for w in others if w in mine or w in Pp][:3])
                # replay through Chat: the person restates their rules → nothing filed twice
                ev(pg, "face20Set(curP(), 'chat')"); pg.wait_for_timeout(250)
                n0 = ev(pg, "factsActive(curP()).length")
                say(pg, "Hello, where are we?")
                for rule in R0[:3]:
                    say(pg, rule)
                n1 = ev(pg, "factsActive(curP()).length")
                check(f"{tag} replay in Chat: restating its rules files nothing twice", n1 == n0, [n0, n1])
                Pc = prompts(pg, "chat20")
                if Pc:
                    check(f"{tag} …every chat prompt holds all its rules, whole", all(x in Pc[-1] for x in ev(pg, "factsActive(curP(), FACT_RULES).map(e => factText(e))")))
                    early, dec = ev(pg, "stage20Early(curP())"), ev(pg, "!!m20Chosen(curP())")
                    check(f"{tag} …order goal → map → decide → details: " + ("before the decision only route-splitting questions" if early else "after the decision the chosen route" if dec else "the project keeps its order"),
                          ("route-splitting value" in Pc[-1]) if early else ("<chosen_route>" in Pc[-1]) if dec else ("route-splitting value" not in Pc[-1]), [early, dec])
                    if early: check(f"{tag} …and the detail items wait", not ev(pg, "queueOf(curP()).some(x => ['assume','require'].includes(x.ph) && x.kind !== 'pick')"))
                # no repeated questions: each question it answered before, asked again by the chat, is dropped
                hist = ev(pg, "[...arr(curP().qa).filter(q => str(q.answer).trim()).map(q => q.q), ...pickRead(curP()).log.filter(e => str(e.answer).trim()).map(e => e.q)].filter(Boolean).slice(0, 4)")
                rep = []
                for q in hist:
                    ev(pg, "(() => { window.__chatHook = (out) => { out.cards = [{q: " + json.dumps(q) + ", why: 'replay', target: 'decision', multi: false, options: [{k: 'A', label: 'One', text: 'one'}, {k: 'B', label: 'Two', text: 'two'}], rec: 0, recWhy: 'r', recBasis: 'estimate', mind: ''}]; return out; }; })()")
                    say(pg, "And now?")
                    if ev(pg, f"pickRead(curP()).cards.some(c => c.q === {json.dumps(q)})"): rep.append(q)
                ev(pg, "(() => { window.__chatHook = null; })()")
                check(f"{tag} no repeated questions: {len(hist)} questions it answered before, asked again in the chat, are all dropped", not rep, rep)
                # both faces show the same ledger: the chat's Decided tab, Pick's facts book and Decisions page
                ev(pg, "(() => { const S = c20St(curP()); S.tab = 'decided'; S.side = 'ws'; render(); })()"); pg.wait_for_timeout(200)
                ids_chat = sorted(set(ev(pg, "[...document.querySelectorAll('.c20-ws [data-fact]')].map(x => x.dataset.fact)")))
                ev(pg, "face20Set(curP(), 'pick'); factsOpen(curP())"); pg.wait_for_timeout(250)
                ids_pick = sorted(set(ev(pg, "[...document.querySelectorAll('.main [data-fact]')].map(x => x.dataset.fact)")))
                book = sorted(ev(pg, "factsActive(curP()).map(e => e.id)"))
                check(f"{tag} both faces show the same ledger ({len(book)} entries)", set(book) <= set(ids_chat) and set(book) <= set(ids_pick), [book, ids_chat, ids_pick])
                ev(pg, "ACTIONS['rows-open']()"); pg.wait_for_timeout(300)
                dp = ev(pg, "[...document.querySelectorAll('[data-anchor=decided20] .item')].length")
                ev(pg, "face20Set(curP(), 'chat'); (() => { const S = c20St(curP()); S.tab = 'decided'; render(); })()"); pg.wait_for_timeout(200)
                dc = ev(pg, "[...document.querySelectorAll('.c20-ws [data-anchor=decided20] .item')].length")
                check(f"{tag} …the Decided list is the same in both ({dp})", dp == dc, [dp, dc])
                ev(pg, "face20Set(curP(), 'pick')")
            # the planted rule of one project reaches no other project
            if len(pids) >= 2:
                ev(pg, f"openProject('{pids[0]}'); face20Set(curP(), 'chat')"); pg.wait_for_timeout(200)
                say(pg, OTHER)
                ev(pg, f"openProject('{pids[1]}'); face20Set(curP(), 'chat')"); pg.wait_for_timeout(200)
                say(pg, "What do you know about my photos?")
                Pn = prompts(pg, "chat20")[-1]
                check(f"[{wsi}] a never said in one project's chat reaches no other project (book, prompt)", "Dropbox" not in Pn and not ev(pg, "factsRead(curP()).entries.some(e => /Dropbox/.test(e.words))"))
            # after a reload: the move does not run again, nothing doubles
            snap = ev(pg, "JSON.stringify(WS.projects.map(p => [p.id, arr(p.restore).length, factsRead(p).entries.length, m20Read(p).routes.length]).sort((a, b) => a[0] < b[0] ? -1 : 1))")
            ev(pg, "flushSaves()")
            for _ in range(100):
                if ev(pg, "Store.queue.size === 0 && Store.busy.size === 0"): break
                pg.wait_for_timeout(100)
            pg.wait_for_timeout(500)
            if ev(pg, "window.__mockPersisted !== false"):
                pg2 = open_page(ctx, pick=wsi); pg2.wait_for_timeout(800)
                snap2 = ev(pg2, "JSON.stringify(WS.projects.map(p => [p.id, arr(p.restore).length, factsRead(p).entries.length, m20Read(p).routes.length]).sort((a, b) => a[0] < b[0] ? -1 : 1))")
                check(f"[{wsi}] after a reload the move does not run again (restore points, entries, routes the same)", snap == snap2, [snap, snap2])
            else:   # a big real-data copy does not fit the mock's localStorage: the same check without the reload
                again = ev(pg, "(() => { const n = m200All(); return [n, WS.projects.map(p => m200Run(p)).filter(Boolean).length]; })()")
                snap2 = ev(pg, "JSON.stringify(WS.projects.map(p => [p.id, arr(p.restore).length, factsRead(p).entries.length, m20Read(p).routes.length]).sort((a, b) => a[0] < b[0] ? -1 : 1))")
                check(f"[{wsi}] opening again does not move a project twice (restore points, entries, routes the same)", again == [0, 0] and snap == snap2, [again, snap, snap2])
            ctx.close()
    check("no page errors", not errors, errors[:5])
    b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
