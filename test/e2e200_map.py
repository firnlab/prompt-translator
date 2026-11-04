"""2.0.0 Part B ("Solution map and the new order"): the stage model (Goal → Map → Decide → Details → Build → Check → Launch → Operate),
the goal card, the live solution map, the coverage engine, deciding, tripwires and the Route alert, map chat, proven routes from other
projects — on a COPY of the real data (or the made-up bundle) with the mock runtime.
Run: python3 test/e2e200_map.py [work/backup-141 | test/fixtures/synthetic.json]
 B1 the new order: a 2.0 project has the 8 stages over today's phases; before the decision the pick and interview prompts ask only
    route-splitting questions and the detail items (assumptions, risks, requirements) wait; one Next names the stage's step; an older
    project keeps its order (Part C moves it).
 B2 the goal card: PT's guess vs said by you (✓ That's it), versions with history, the north star follows, your rules from the facts book.
 B3 the map: one tap names the cost first, then six lens calls (one angle each, unusual answers asked for) + a red team, at most two at a
    time; ladder Simple → Frontier and the Not-possible-yet lane (why, how, who, watch, closest); merge counts a route found twice; a
    red-team correction is a visible map event; the saturation record on screen; the stopping rule (2 rounds with 0 new + all cells →
    "searched to saturation on …", the button stays); no call without a tap (render, reload).
 B4 your rules: a route that breaks a never is greyed with the rule, hidden by the default filter with its count, cannot be shortlisted;
    a never added later greys a route at once (a map event); statuses by word and sign.
 B5 deciding: ☆ (max 3), ✕ with a reason (it reaches the next round's prompt), Compare (same rows folded, the best marked in words),
    ★ only after looking and naming what it loses, the full card in 8 groups, Prove it (cost first, one call, the result on the card),
    Take this (restore point, decision record with why / compared / rejected / tripwires / switching cost / why not higher, the decision
    in the facts book); after it the details are asked for the chosen route only.
 B6 a goal change shows its effect on the map (rise / fall / out, your route) before it applies; Apply makes a restore point and a new version.
 B7 tripwires and the Route alert: a new fact that breaks a load-bearing assumption (and a failed test) raises the card: what broke, how
    bad, what still stands, what carries over (route-neutral vs route-bound), repair / map again / keep and accept / later (the Next bar).
 B8 map chat: Missing any? · Higher ceiling? · Easier? · What breaks …? · Tell me everything you haven't shown · a question: each runs its
    lens or red-team call and shows a map diff card.
 B9 proven routes: only after Launch, allow-listed template fields only; a never planted in the source project reaches neither the
    library nor another project's prompts; the route stands on the other map with "Worked before", re-checked there.
 three languages (no raw keys, no ß), 390 px without sideways scroll, targets ≥ 24 px, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=40000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0 && !M20RUN.total"):
            pg.wait_for_timeout(300)
            if ev(pg, "AI.running.size === 0 && !M20RUN.total"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def undo(pg): ev(pg, "(() => { const p = curP(); const a = lastAct(p); if (a) undoAct(p, a.id); render(); })()"); pg.wait_for_timeout(150)
def M(pg): return ev(pg, "m20Read(curP())")
def main(pg): return ev(pg, "(document.querySelector('.main') || {}).innerText || ''")
def calls(pg): return ev(pg, "(window.__mapCalls || []).slice()")
def prompts(pg, task): return ev(pg, f"(window.__allPrompts || []).filter(x => x.includes('[[task:{task}]]'))")
def raw_keys(text): return sorted(set(re.findall(r"\b(?:m20|g20|st20)\.[a-z][a-z0-9.]*\b", text)))
def click(pg, sel): pg.locator(sel).first.click(); pg.wait_for_timeout(200)
def rid(pg, name): return ev(pg, f"(m20Read(curP()).routes.find(r => r.name === {json.dumps(name)}) || {{}}).id || ''")
NEVER = "We never log in to Google or Samsung accounts"
OTHER_NEVER = "We never upload the photos to Dropbox"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")
    old = ev(pg, "(() => { const p = WS.projects.find(x => x.id) ; return p.id; })()")
    pid = ev(pg, "(() => { const p = blankProject('Family list'); p.northStar.goal = 'One shopping list the four of us share on our phones'; p.northStar.problem = 'Items get forgotten'; p.northStar.success = 'Nobody forgets milk'; p.autoInterview = false; WS.projects.push(p); touch(p); openProject(p.id); return p.id; })()")
    pg.wait_for_timeout(500)

    # ---------- B1 the new order ----------
    print("B1 the new order")
    S = ev(pg, "({st: STAGE20, on: stage20On(curP()), at: stage20Of(curP()), ph: ['capture','understand','interview','arch','assume','require','build','review','test','launch','release','operate'].map(stage20OfPhase)})")
    check("a 2.0 project has the eight stages Goal → Map → Decide → Details → Build → Check → Launch → Operate", S["st"] == ["goal", "map", "decide", "details", "build", "check", "launch", "operate"] and S["on"] and S["at"] == "goal", S)
    check("…mapped onto today's phases (capture+understand+interview → Goal, arch → Map, assume+require → Details, review+test → Check, launch+release → Launch)",
          S["ph"] == ["goal", "goal", "goal", "map", "details", "details", "build", "check", "check", "launch", "launch", "operate"], S["ph"])
    check("…the stage model is reusable: rows, done, Next, the strip", ev(pg, "typeof stage20Rows === 'function' && stage20Rows(curP(), 'map').length >= 5 && typeof stage20Next === 'function' && typeof stage20StripHTML === 'function'"))
    P = ev(pg, "buildPrompt('pick-next', {proj: curP(), body: 'b', schema: '{}'})")
    check("before the decision the pick prompt asks only route-splitting questions", "route-splitting value" in P and "wait until the person has chosen a route" in P, P[-600:])
    check("…the interview prompt too", "route-splitting value" in ev(pg, "buildPrompt('interview', {proj: curP(), body: 'b', schema: '{}'})"))
    ev(pg, """(() => { const p = curP(); p.assumptions.push({id: 'A1', text: 'Everyone has a smartphone', category: 'feasibility', impact: 5, risk: 5}); p.requirements.push({id: 'R1', title: 'Shared', given: 'x', when: 'y', then: 'z', priority: 'must', st: 'assumed'}); touch(p); render(); })()""")
    Q = ev(pg, "queueOf(curP()).map(x => x.ph)")
    check("…the detail items (assumptions, requirements) wait for the route; they are kept, only not asked", "assume" not in Q and "require" not in Q and ev(pg, "curP().assumptions.length === 1 && stage20Waiting(curP()) >= 2"), Q)
    Qo = ev(pg, f"(() => {{ const q = WS.projects.find(x => x.id === '{old}'); return {{on: stage20On(q), next: stage20Next(q)}}; }})()")
    check("an older project keeps its order (Part C moves it over)", not Qo["on"] and Qo["next"] is None, Qo)
    nx = ev(pg, "[...document.querySelectorAll('.nx20-next [data-a]')].map(b => b.dataset.a + ':' + (b.dataset.v || '') + ':' + b.textContent.trim())")
    check("…the picks in the deck come first (here none); then one Next: check the goal card", not ev(pg, "pickDeck(curP()).length") and len(nx) == 1 and nx[0].startswith("m20-open:goal:") and "goal card" in nx[0], nx)

    # ---------- B2 the goal card ----------
    print("B2 the goal card")
    click(pg, ".nx20-next [data-a=m20-open]")
    check("Next opens the goal card on the map page", ev(pg, "!!document.querySelector('.m20-view .g20')"))
    row = ev(pg, "document.querySelector('.g20-row[data-f=outcome]').innerText")
    check("the goal from the north star is PT's guess until you confirm it", "One shopping list" in row and "PT's guess" in row, row)
    click(pg, ".g20-row[data-f=outcome] [data-a=g20-ok]")
    check("✓ That's it: said by you, with a receipt", ev(pg, "goal20Read(curP()).by.outcome") == "you" and "Saved:" in ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''"))
    click(pg, "[data-a=g20-edit]")
    pg.fill("#g20-whom", "Mum, Dad, Grandma and Lea"); pg.fill("#g20-success", "Everyone sees a new item within a minute"); pg.fill("#g20-budget", "CHF 0-5 a month")
    click(pg, "[data-form=g20-edit] button[type=submit]"); pg.wait_for_timeout(300)
    G = ev(pg, "goal20Read(curP())")
    check("a change without a map applies at once as a new version; the old one is kept in the history", G["v"] == 2 and len(G["hist"]) == 1 and G["by"]["whom"] == "you" and G["f"]["budget"] == "CHF 0-5 a month", G)
    check("…the north star follows the card", ev(pg, "curP().northStar.users") == "Mum, Dad, Grandma and Lea")
    check("…still open: your rules (or no hard limits)", ev(pg, "goal20Open(curP())") == ["nevers"])
    ev(pg, f"(() => {{ const p = curP(); factsAdd(p, {{kind: 'never', words: {json.dumps(NEVER)}}}); touch(p); render(); }})()"); pg.wait_for_timeout(200)
    check("a never in the facts book is the goal card's rule; the goal is clear enough to map", ev(pg, "goal20Clear(curP())") and NEVER in ev(pg, "document.querySelector('.g20-row[data-f=nevers]').innerText"))
    nx = ev(pg, "[...document.querySelectorAll('.nx20-next [data-a]')].map(b => b.dataset.a + ':' + (b.dataset.v || ''))")
    check("…Next: show all routes", nx == ["m20-open:map"], nx)
    rows = ev(pg, "stage20Rows(curP(), 'goal').map(r => r.ok)")
    check("the Goal stage's rows are green", all(rows), rows)

    # ---------- B3 the map and the coverage engine ----------
    print("B3 the map and the coverage engine")
    click(pg, ".nx20-next [data-a=m20-open]")
    ev(pg, "window.__mapCalls = []; window.__inflightMax = 0; window.__allPrompts = []")
    click(pg, "[data-a=m20-ask][data-v=full]")
    cf = ev(pg, "(document.querySelector('.m20-confirm') || {}).innerText || ''")
    check("one tap names the cost first (Claude messages, minutes) and nothing runs yet", "about 7 Claude messages" in cf and "min" in cf and not calls(pg), cf)
    click(pg, "#m20-cf-go"); wait_ai(pg)
    C = calls(pg)
    check("then six lens calls and one red-team call", C.count("map-lens") == 6 and C.count("map-redteam") == 1, C)
    lp = prompts(pg, "map-lens")
    frames = ["BUY IT:", "BUILD IT WITH CLAUDE:", "CHANGE THE PROCESS", "CHEAPEST HACK", "FRONTIER:", "INVERSION:"]
    check("…each lens call looks from one angle only", len(lp) == 6 and all(sum(f in x for f in frames) == 1 for x in lp) and all(any(f in x for x in lp) for f in frames))
    check("…and asks for unusual answers (how typical each is, some below 0.2)", all("typical below 0.2" in x for x in lp))
    check("…your rules first in every map call", all("[[task:map-lens]]\n<your_rules project=" in x for x in lp))
    check("…at most two calls at a time", 1 <= ev(pg, "window.__inflightMax") <= 2, ev(pg, "window.__inflightMax"))
    m = M(pg)
    check("routes on the map with the fields of the route card", len(m["routes"]) >= 12 and all(k in m["routes"][0] for k in ["name", "fam", "line", "day", "lvl", "fit", "notv", "actors", "setupMin", "first", "money", "usage", "risks", "assume", "lock", "rev", "maint", "data", "logins", "status", "conf", "evidence", "up", "down", "found", "corr", "lenses"]), len(m["routes"]))
    T = main(pg)
    check("the ladder: Simple → Medium → Complex → Frontier", all(x in T.upper() for x in ["SIMPLE", "MEDIUM", "COMPLEX", "FRONTIER"]) and T.upper().find("SIMPLE") < T.upper().find("FRONTIER"))
    ny = ev(pg, "(document.querySelector('.m20-ny') || {}).innerText || ''")
    check("the Not-possible-yet lane: why, how it could become possible, who could, what PT watches, closest today", all(x in ny for x in ["Fridge that knows", "Why not", "How it could become possible", "Who could make it possible", "What PT watches", "Closest today"]), ny[:400])
    rec = ev(pg, "(document.querySelector('.m20-sat') || {}).innerText || ''")
    check("the saturation record on screen: rounds · last round · cells · likely still undiscovered", "Searched rounds: 1" in rec and "last round: new:" in rec and "grid cells covered" in rec and "likely still undiscovered" in rec, rec)
    check("…it never says that's all", "PT never says “that's all”" in T and not re.search(r"(?i)\bthat's all\b(?!”)", T.replace("“that's all”", "")))
    corr = [r for r in m["routes"] if r["corr"]]
    check("a red-team break is a correction on the route, visible as a map event", len(corr) == 1 and "free plan limit" in corr[0]["corr"][0]["text"] and ev(pg, "!!document.querySelector('.m20-diff .fix')") and "corrected" in T, [r["corr"] for r in corr])
    check("…the red team found a missing route too", any(r["found"]["lens"] == "red" for r in m["routes"]))
    n0 = len(m["routes"])
    # round 2 (dig deeper): the mock finds the same routes again
    click(pg, "[data-a=m20-ask][data-v=dig]"); click(pg, "#m20-cf-go"); wait_ai(pg)
    m = M(pg); r2 = m["rounds"][-1]
    check("Dig deeper: a new pair of angles; a route found again is merged (counted for both angles), not added", r2["newN"] == 0 and r2["merged"] >= 2 and len(m["routes"]) == n0 and any(len(r["lenses"]) >= 2 for r in m["routes"]), r2)
    check("…not saturated after one quiet round", not m["satAt"])
    est = ev(pg, "m20Coverage(curP()).est")
    check("…a rough estimate of what is still undiscovered (Chao1) once there are two rounds", isinstance(est, int) and est >= 0 and "likely still undiscovered: about" in ev(pg, "document.querySelector('.m20-sat').innerText"), est)
    click(pg, "[data-a=m20-ask][data-v=dig]"); click(pg, "#m20-cf-go"); wait_ai(pg)
    m = M(pg)
    check("stopping rule: two rounds in a row with 0 new and every cell covered or explained → searched to saturation on <date>", m["satAt"] and "Searched to saturation on" in main(pg), m["rounds"][-2:])
    check("…the Dig deeper button stays", ev(pg, "!!document.querySelector('[data-a=m20-ask][data-v=dig]')"))
    k0 = len(calls(pg))
    ev(pg, "(() => { render(); m20Open(curP(), 'map'); render(); })()"); pg.wait_for_timeout(600)
    check("no call without a tap: opening and rendering the map runs nothing", len(calls(pg)) == k0)
    check("the Map stage's rows: six angles, not-yet lane, quiet round, cells, your rules, frontier", all(r["ok"] for r in ev(pg, "stage20Rows(curP(), 'map')")), ev(pg, "stage20Rows(curP(), 'map')"))

    # ---------- B4 your rules on the map ----------
    print("B4 your rules on the map")
    g = rid(pg, "Google sign-in list app")
    st = ev(pg, f"m20Status(curP(), m20Route(curP(), '{g}'))")
    check("a route that breaks your never is Blocked by your rule", st == "blocked", st)
    fl = ev(pg, "document.querySelector('[data-a=m20-f][data-v=rules]').innerText")
    check("…hidden by the default filter “only routes that keep my rules”, with the hidden count", ev(pg, f"!document.getElementById('m20r-{g}')") and "hidden: 1" in fl and ev(pg, "document.querySelector('[data-a=m20-f][data-v=rules]').getAttribute('aria-pressed')") == "true", fl)
    click(pg, "[data-a=m20-f][data-v=rules]")
    row = ev(pg, f"(document.getElementById('m20r-{g}') || {{}}).innerText || ''")
    check("…filter off: it stays visible, greyed, with the rule and the reason", "Blocked by your rule" in row and NEVER in row and ev(pg, f"document.getElementById('m20r-{g}').classList.contains('st-blocked')"), row)
    check("…it cannot be shortlisted", ev(pg, f"!document.querySelector('#m20r-{g} [data-a=m20-short]')") and not ev(pg, f"m20Short(curP(), '{g}')"))
    click(pg, "[data-a=m20-f][data-v=rules]")
    sp = rid(pg, "Kitchen speaker")
    pg.locator(".pg-bar .sp-facts").first.click(); pg.wait_for_timeout(250)
    pg.select_option("#fa-kind", "never"); pg.fill("#fa-words", "We never put a kitchen speaker in the house")
    click(pg, ".facts-add button[type=submit]"); wait_ai(pg)
    check("a never added later greys the matching route at once, as a map event", ev(pg, f"m20Status(curP(), m20Route(curP(), '{sp}'))") == "blocked" and ev(pg, "m20Read(curP()).events[0].kind") == "block", ev(pg, "m20Read(curP()).events[0]"))
    click(pg, ".pg-bar .sp-map20")
    B = ev(pg, "[...document.querySelectorAll('.m20-r .m20-badge')].slice(0, 6).map(b => b.innerText)")
    check("statuses by word and sign, never by colour alone", B and all(re.match(r"^[✓✎⚙◷⛔] ", x) or x.startswith("Worked") or x == "corrected" for x in B), B)

    # ---------- B5 deciding ----------
    print("B5 deciding")
    r1, r2_, r3, r4 = rid(pg, "Shared reminders list"), rid(pg, "Family list app"), rid(pg, "PT-built family list page"), rid(pg, "Shared note in the notes app")
    check("★ waits until you looked at a route", ev(pg, "m20Star(curP())") is None and "★" not in ev(pg, "[...document.querySelectorAll('.m20-r .m20-nm')].map(x => x.innerText).join('')"))
    for r in (r1, r2_, r3): click(pg, f"#m20r-{r} [data-a=m20-short]")
    check("☆ shortlist with a receipt", M(pg)["short"] == [r1, r2_, r3] and "Shortlisted:" in ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''"))
    click(pg, f"#m20r-{r4} [data-a=m20-short]")
    check("…at most 3", M(pg)["short"] == [r1, r2_, r3])
    click(pg, f"#m20r-{r4} [data-a=m20-rej]")
    check("✕ Not for me asks why, in one tap", ev(pg, f"document.querySelectorAll('#m20r-{r4} [data-a=m20-rejwhy]').length") == 5)
    click(pg, f"#m20r-{r4} [data-a=m20-rejwhy][data-v=work]")
    check("…the route leaves the ladder and is listed as not for you, with the reason", M(pg)["rej"][r4]["why"] == "work" and ev(pg, f"!document.getElementById('m20r-{r4}')") and "too much work for me" in ev(pg, "document.querySelector('.m20-rejl').innerText"))
    ev(pg, "window.__allPrompts = []")
    click(pg, "[data-a=m20-go][data-v='chip:higher']"); wait_ai(pg)
    hp = prompts(pg, "map-lens")
    check("…the reason reaches the next round (look for variants without that weak point)", hp and "<not_for_me>" in hp[0] and "too much work for me" in hp[0], hp[0][-500:] if hp else "")
    click(pg, ".m20-shortbar [data-a=m20-open][data-v=compare]")
    tb = ev(pg, "document.querySelector('.m20-tbl').innerText")
    check("Compare: the shortlist side by side", all(ev(pg, f"m20Route(curP(), '{r}').name") in tb for r in (r1, r2_, r3)), tb[:300])
    fold = ev(pg, "(() => { const m = /folded away: (\\d+)/.exec(document.querySelector('.main').innerText); return {same: m ? +m[1] : -1, rows: document.querySelectorAll('.m20-tbl tbody tr').length - 1}; })()")
    check("…rows that are the same for all are folded, with how many", fold["same"] > 0 and fold["rows"] + fold["same"] == 12, fold)
    check("…the best value is marked in words, not only by colour", "(best)" in tb or "(lowest)" in tb, tb[:600])
    check("★ after looking: PT's pick, never a blocked route, naming what it loses", ev(pg, "m20Star(curP()) && m20Status(curP(), m20Star(curP())) !== 'blocked'") and "What it loses" in main(pg))
    click(pg, f".m20-tbl [data-a=m20-open][data-v=take][data-id={r1}]")
    ev(pg, f"m20Open(curP(), 'card', '{r1}')"); pg.wait_for_timeout(250)
    H = ev(pg, "[...document.querySelectorAll('.m20-card .m20-grp h4')].map(h => h.innerText)")
    check("the full card in 8 groups: what it is · fit · who does what · cost and time · risk and undo · data and people · how sure · growth", len(H) == 8, H)
    T = main(pg)
    check("…with a day with it, your rules kept or broken, your work in minutes, money, must be true, leaving later, confidence and sources", all(x in T for x in ["A day with it", "Your rules", "setup 15 min", "per month", "Must be true", "Leaving it later", "PT's reasoning, not checked"]), T[:800])
    ev(pg, "window.__mapCalls = []")
    click(pg, f"[data-a=m20-ask][data-v='prove:{r1}']")
    cf = ev(pg, "(document.querySelector('.m20-confirm') || {}).innerText || ''")
    check("Prove it names cost and time first", "Prove it" in cf and "1 Claude message" in cf and not calls(pg), cf)
    click(pg, "#m20-cf-go"); wait_ai(pg)
    pr = ev(pg, f"m20Route(curP(), '{r1}').proof")
    check("…one short check of the riskiest load-bearing assumption, shown on the card", calls(pg) == ["map-prove"] and pr and pr["verdict"] == "unclear" and "Prove it:" in main(pg) and "To check it for real" in main(pg), pr)
    check("…the assumption says it was checked", ev(pg, f"m20Route(curP(), '{r1}').assume[0].checked") == "unclear")
    rp0 = ev(pg, "arr(curP().restore).length")
    click(pg, f".m20-cardbar [data-a=m20-open][data-v=take]")
    F = ev(pg, "(document.querySelector('.m20-take') || {}).innerText || ''")
    check("Take this: a decision form with why, compared with, why not the others, tripwires, why not a higher ceiling, switching cost", all(x in F for x in ["Why", "Compared with", "Why not", "We switch if", "Cost of switching later"]), F[:600])
    check("…the fields start with a suggestion, never blank", ev(pg, "document.getElementById('m20-why').value.length > 10 && document.getElementById('m20-trip').value.includes('We switch if')"))
    pg.fill("#m20-why", "Free, 15 minutes, and all our phones are from the same maker")
    click(pg, "[data-form=m20-take] button[type=submit]"); pg.wait_for_timeout(300)
    m = M(pg); D = ev(pg, "m20Decision(curP())")
    check("…a restore point before the decision", ev(pg, "arr(curP().restore).length") == rp0 + 1 and "Before the decision" in ev(pg, "curP().restore[0].label || curP().restore[curP().restore.length - 1].label"), ev(pg, "arr(curP().restore).map(r => r.label)"))
    check("…the decision record: why, compared with, rejected and why, tripwires, switching cost, why not higher", m["chosen"] == r1 and D["why"].startswith("Free, 15") and D["compared"] == [r2_, r3] and len(D["rejected"]) == 2 and len(D["trip"]) >= 1 and D["switchCost"] and D["higher"], D)
    dec = ev(pg, "factsActive(curP(), ['decision']).map(e => e.words)")
    check("…saved in the facts book as a decision", any("Shared reminders list" in x for x in dec), dec)
    check("…shown on the map with “We switch if …”", "Decision recorded" in main(pg) and "We switch if" in main(pg))
    check("the stage moves on to Details; the Decide rows are green", ev(pg, "stage20Of(curP())") == "details" and all(r["ok"] for r in ev(pg, "stage20Rows(curP(), 'decide')")), ev(pg, "stage20Rows(curP(), 'decide')"))
    P = ev(pg, "buildPrompt('pick-next', {proj: curP(), body: 'b', schema: '{}'})")
    check("after the decision the details are asked for the chosen route only", "<chosen_route>" in P and "Shared reminders list" in P and "route-splitting value" not in P)
    Q = ev(pg, "queueOf(curP()).map(x => x.ph)")
    check("…and the waiting details come back", "assume" in Q, Q)
    check("…the Next is the old spine's step again (no map Next)", ev(pg, "stage20Next(curP())") is None)

    # ---------- B6 a goal change shows its effect first ----------
    print("B6 a goal change shows its effect first")
    ev(pg, "m20Open(curP(), 'goal')"); pg.wait_for_timeout(200)
    click(pg, "[data-a=g20-edit]")
    pg.fill("#g20-whom", "Mum, Dad, Grandma, Lea and our neighbour")
    v0 = ev(pg, "goal20Read(curP()).v"); fits0 = {r["id"]: r["fitN"] for r in M(pg)["routes"]}
    click(pg, "[data-form=g20-edit] button[type=submit]"); wait_ai(pg)
    df = ev(pg, "(document.querySelector('.m20-gdiff') || {}).innerText || ''")
    check("the diff comes first: routes that fit better / worse / no longer reach the goal, and your route", "What this change does to your map" in df and "fit better: 1" in df and "no longer reach the goal: 1" in df and "Your chosen route" in df, df)
    check("…nothing applied yet", ev(pg, "goal20Read(curP()).v") == v0 and ev(pg, "goal20Read(curP()).f.whom") == "Mum, Dad, Grandma and Lea")
    rp0 = ev(pg, "arr(curP().restore).length")
    click(pg, "[data-a=g20-take]")
    G = ev(pg, "goal20Read(curP())"); m = M(pg)
    check("Apply: a restore point, a new version, the routes re-scored, one out of the goal", ev(pg, "arr(curP().restore).length") == rp0 + 1 and G["v"] == v0 + 1 and any(r.get("goalOut") for r in m["routes"]) and any(r["fitN"] != fits0.get(r["id"]) for r in m["routes"]), G["v"])
    check("…the decision that depended on it is marked to re-check", ev(pg, "!!m20Decision(curP()).recheck"))

    # ---------- B7 tripwires and the Route alert ----------
    print("B7 tripwires and the Route alert")
    ev(pg, "m20Open(curP(), 'map')")
    ev(pg, "(() => { const p = curP(); p.requirements.push({id: 'R2', title: 'Ticks by name', given: 'a', when: 'b', then: 'c', priority: 'must'}); touch(p); })()")
    c0 = ev(pg, "m20Carry(curP())")
    ev(pg, "window.__mapCalls = []")
    pg.locator(".pg-bar .sp-facts").first.click(); pg.wait_for_timeout(200)
    pg.select_option("#fa-kind", "fact"); pg.fill("#fa-words", "Lea gets a new phone from another maker next month")
    click(pg, ".facts-add button[type=submit]"); wait_ai(pg)
    al = M(pg)["alerts"]
    check("a new fact that breaks a load-bearing assumption raises a Route alert (one quick call)", calls(pg).count("map-alert") == 1 and len(al) == 1 and al[0]["status"] == "open" and al[0]["how"] == "blocks", [calls(pg), al])
    nx = ev(pg, "[...document.querySelectorAll('.nx20-next [data-a]')].map(b => b.dataset.a + ':' + (b.dataset.v || '') + ':' + b.textContent.trim())")
    check("…the one Next says the route is at risk", len(nx) == 1 and nx[0].startswith("m20-open:alert:") and "at risk" in nx[0], nx)
    click(pg, ".nx20-next [data-a=m20-open]")
    A = ev(pg, "(document.querySelector('.m20-alert') || {}).innerText || ''")
    check("the card: what broke, how bad, what still stands, what carries over, and the options", all(x in A for x in ["What broke", "another maker", "How bad", "blocks the route", "What still stands", "What carries over", "Repair this route", "Look at the map again", "Keep it, accept the risk", "Later"]), A[:900])
    check("…what carries over counts the route-neutral work (goal, facts, details made before the decision) apart from the route-bound", "% of your work" in A and c0["bound"] == ["req:R2"], c0)
    ev(pg, "document.querySelector('.m20-alert details').open = true")
    click(pg, ".m20-alert [data-a=m20-tag]")
    check("…a detail marked “fits any route” carries over", ev(pg, "m20Carry(curP()).bound.length") == 0)
    click(pg, ".m20-alert [data-a=m20-al][data-v=later]")
    check("Later: the alert stays in the Next bar and blocks the Check stage", ev(pg, "!!document.querySelector('.nx20 .m20-later')") and not [r for r in ev(pg, "stage20Rows(curP(), 'check')") if r["k"] == "alerts"][0]["ok"])
    click(pg, ".m20-alert [data-a=m20-repair]"); wait_ai(pg)
    check("Repair this route: PT shows how (one call)", "It can be repaired" in ev(pg, "document.querySelector('.m20-alert').innerText"))
    click(pg, ".m20-alert [data-a=m20-al][data-v=repaired]")
    ch = ev(pg, "m20Chosen(curP())")
    check("…using it records the repair on the route; the alert is closed", ch["corr"] and "Repaired after a route alert" in ch["corr"][-1]["text"] and M(pg)["alerts"][0]["status"] == "repaired")
    # a failed test raises one too; keep it and accept the risk
    ev(pg, """(() => { const p = curP(); p.tests.push({id: 'T9', title: 'ALERTME another maker phone', input: 'x', criteria: ['y']}); finishRun(p, {id: 'run9', at: now(), results: [{testId: 'T9', pass: false}], versionNo: p.versionNo}); })()"""); wait_ai(pg)
    al = M(pg)["alerts"]
    check("a failed test that contradicts the route raises an alert too", al[0]["kind"] == "test" and al[0]["status"] == "open", al[:1])
    ev(pg, "m20Open(curP(), 'map')"); pg.wait_for_timeout(150)
    click(pg, ".m20-alert [data-a=m20-keepq]")
    pg.fill(f"#m20-keep-{al[0]['id']}", "Lea can use the web version; we watch it")
    click(pg, "[data-form=m20-keep] button[type=submit]")
    D = ev(pg, "m20Decision(curP())")
    check("Keep it, accept the risk: the reason becomes a tripwire and a decision in the facts book", M(pg)["alerts"][0]["status"] == "kept" and any("Accepted risk" in x["text"] for x in D["trip"]) and any("Lea can use the web version" in e for e in ev(pg, "factsActive(curP(), ['decision']).map(e => e.words)")))
    ev(pg, """(() => { const p = curP(); factsAdd(p, {kind: 'fact', words: 'ALERTME one more phone from another maker'}); })()"""); wait_ai(pg)
    a3 = M(pg)["alerts"][0]
    ev(pg, "m20Open(curP(), 'map')"); pg.wait_for_timeout(150)
    click(pg, f"#m20a-{a3['id']} [data-a=m20-al][data-v=map]")
    m = M(pg)
    check("Look at the map again: the best route that still stands is shortlisted; your route stays until you take another", len(m["short"]) == 1 and m["short"][0] != m["chosen"] and m["chosen"] == r1 and ev(pg, "!!document.querySelector('.m20-ladder')"), m["short"])

    # ---------- B8 map chat ----------
    print("B8 map chat")
    chips = ev(pg, "[...document.querySelectorAll('.m20-chips button')].map(b => b.innerText)")
    check("the chips: Missing any? · Higher ceiling? · Easier? · What breaks …? · Tell me everything you haven't shown", chips[:3] == ["Missing any?", "Higher ceiling?", "Easier?"] and chips[3].startswith("What breaks R") and chips[4] == "Tell me everything you haven't shown", chips)
    ev(pg, "window.__mapCalls = []; window.__allPrompts = []")
    click(pg, "[data-a=m20-ask][data-v='chip:missing']")
    check("Missing any? (several calls) names its cost first", "about 3 Claude messages" in ev(pg, "(document.querySelector('.m20-confirm') || {}).innerText || ''") and not calls(pg))
    click(pg, "#m20-cf-go"); wait_ai(pg)
    check("…two lens calls and a red team, then a map diff card", calls(pg).count("map-lens") == 2 and calls(pg).count("map-redteam") == 1 and ev(pg, "!!document.querySelector('.m20-diff')"), calls(pg))
    ev(pg, "window.__mapCalls = []")
    click(pg, "[data-a=m20-go][data-v='chip:breaks']"); wait_ai(pg)
    rp = prompts(pg, "map-redteam")
    check("What breaks R…? runs the red team on that route", calls(pg) == ["map-redteam"] and f"Look hardest at route {r1}" in rp[-1] and ev(pg, "!!document.querySelector('.m20-diff')"))
    ev(pg, "window.__mapCalls = []")
    click(pg, "[data-a=m20-go][data-v='chip:all']"); wait_ai(pg)
    rp = prompts(pg, "map-redteam")
    df = ev(pg, "document.querySelector('.m20-diff').innerText")
    check("Tell me everything you haven't shown: the red team plus every open cell, reported with the angles tried", calls(pg) == ["map-redteam"] and "Tell everything not shown yet" in rp[-1] and "Angles tried" in df, df)
    ev(pg, "window.__mapCalls = []")
    click(pg, "[data-a=m20-ask][data-v='chip:easier']"); click(pg, "#m20-cf-go"); wait_ai(pg)
    check("Easier? runs the hack and no-tool angles", calls(pg).count("map-lens") == 2 and any("CHEAPEST HACK" in x for x in prompts(pg, "map-lens")[-2:]))
    ev(pg, "window.__mapCalls = []")
    pg.fill("#m20-q", "Can it work offline?"); click(pg, "[data-form=m20-ask] button[type=submit]"); wait_ai(pg)
    df = ev(pg, "document.querySelector('.m20-diff').innerText")
    check("a question in your words: an answer plus a map diff card, never prose alone", [c for c in calls(pg) if c != "map-merge"] == ["map-ask"] and "Offline:" in df and "Offline list app" in df, df)

    # ---------- B9 proven routes from other projects ----------
    print("B9 proven routes from other projects")
    src = ev(pg, f"""(() => {{ const q = blankProject('Holiday packing for Anna'); q.northStar.goal = 'Anna packs for the holiday without forgetting things'; WS.projects.push(q);
        factsAdd(q, {{kind: 'never', words: {json.dumps(OTHER_NEVER)}}}); factsAdd(q, {{kind: 'fact', words: 'Anna has a Fairphone'}});
        const M = m20Of(q); const r = m20Norm({{name: 'Packing list with Dropbox photos', fam: 'Existing apps', line: 'A shared list for Anna', lvl: 2, where: 'phone', how: 'combine', status: 'today', pattern: 'Shared checklist on phones', recipe: ['Create one shared checklist', 'Upload the photos to Dropbox', 'Remind Anna on Friday', 'Invite the others']}}, {{lens: 'buy', round: 1}});
        r.id = 'R1'; M.routes.push(r); M.chosen = 'R1'; M.decs.push({{id: 'd1', route: 'R1', status: 'active', trip: [], compared: [], rejected: []}}); touch(q); return q.id; }})()""")
    check("a route enters the library only after its project reached Launch", ev(pg, f"m20LibAdd(WS.projects.find(x => x.id === '{src}'))") is None and not ev(pg, "m20LibList().length"))
    E = ev(pg, f"(() => {{ const q = WS.projects.find(x => x.id === '{src}'); q.live = {{v: 1, since: '2026-10-01T10:00:00Z'}}; return m20LibAdd(q); }})()")
    check("…then as a template with allow-listed fields only", E and set(E.keys()) == {"id", "src", "from", "fam", "lvl", "pattern", "where", "how", "actors", "recipe", "outcome", "at"} and set(E["outcome"].keys()) == {"since", "checks", "incidents"}, E)
    blob = json.dumps(ev(pg, "m20LibList()"))
    check("…none of the source project's goal, rules, facts or names: the planted never cannot reach the library", "Dropbox" not in blob and "Anna" not in blob and "Holiday" not in blob and "Fairphone" not in blob and "packs for the holiday" not in blob and "Create one shared checklist" in blob, blob)
    ev(pg, "window.__allPrompts = []; window.__mapCalls = []")
    click(pg, "[data-a=m20-ask][data-v=dig]"); click(pg, "#m20-cf-go"); wait_ai(pg)
    lib = [r for r in M(pg)["routes"] if r.get("lib")]
    check("on this project's map it stands next to the others, in its rung, with “Worked before”", len(lib) == 1 and lib[0]["lvl"] == 2 and "Worked before · live since 2026-10-01" in main(pg), lib)
    check("…re-checked against this project's own rules (the status is computed here)", ev(pg, f"['today','work','helper','notyet','blocked'].includes(m20Status(curP(), m20Route(curP(), '{lib[0]['id'] if lib else ''}')))"))
    AP = "\n".join(ev(pg, "(window.__allPrompts || []).slice()"))
    check("…and the source project's never reaches no prompt of this project", "Dropbox" not in AP and "Anna" not in AP and OTHER_NEVER not in AP and "<proven_templates>" in AP)
    check("the source project's rules stay out of this project's rules channel", OTHER_NEVER not in ev(pg, "buildPrompt('x-test', {proj: curP(), body: 'b', schema: '{}'})"))
    check("the Map row “proven routes checked” is green", [r for r in ev(pg, "stage20Rows(curP(), 'map')") if r["k"] == "proven"][0]["ok"])

    # ---------- Stop ----------
    print("Stop")
    ev(pg, "m20Open(curP(), 'map'); window.__mapCalls = []; window.__mockDelayMs = 800"); r0 = len(M(pg)["rounds"])
    click(pg, "[data-a=m20-ask][data-v=dig]"); click(pg, "#m20-cf-go"); pg.wait_for_timeout(250)
    check("a running round shows its progress and a Stop button", ev(pg, "!!document.querySelector('.m20-busy [data-a=m20-stop]')") and "Calls done:" in main(pg))
    click(pg, ".m20-busy [data-a=m20-stop]"); wait_ai(pg); ev(pg, "window.__mockDelayMs = undefined")
    check("…Stop ends it: the calls not started yet never start, nothing half is written", "map-redteam" not in calls(pg) and len(M(pg)["rounds"]) == r0 and ev(pg, "!M20RUN.total && AI.running.size === 0"), [calls(pg), len(M(pg)["rounds"]), r0])

    # ---------- reload: everything kept, nothing called ----------
    print("reload")
    m_before = M(pg)
    ev(pg, "(async () => { flushSaves(); await storeIdle(5000); window.__mapCalls = []; await openWorkspace(WS.id); })()"); pg.wait_for_timeout(2500)
    ev(pg, f"(() => {{ openProject('{pid}'); m20Open(curP(), 'map'); }})()"); pg.wait_for_timeout(700)
    m_after = M(pg)
    check("after a reload the map, the decision and the alerts are all there", len(m_after["routes"]) == len(m_before["routes"]) and m_after["chosen"] == m_before["chosen"] and len(m_after["alerts"]) == len(m_before["alerts"]) and len(m_after["rounds"]) == len(m_before["rounds"]))
    check("…and opening it called nothing", not ev(pg, "(window.__mapCalls || []).length"))

    # ---------- languages, phone width, targets ----------
    print("languages, phone width, targets")
    for v in ("map", "card", "compare", "goal"):
        ev(pg, f"m20Open(curP(), '{v}', m20Read(curP()).chosen)"); pg.wait_for_timeout(200)
        small = ev(pg, "[...document.querySelectorAll('.m20-view button, .m20-view select, .m20-view input:not([type=hidden])')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 24).map(e => e.outerHTML.slice(0, 80))")
        check(f"{v}: every target at least 24 px high", not small, small[:3])
    ev(pg, "m20Open(curP(), 'map')")
    nb = ev(pg, "[...document.querySelectorAll('.m20-r .iconbtn')].filter(b => !b.getAttribute('aria-label')).length")
    check("icon buttons have a spoken name (☆ ✕), the shortlist state in aria-pressed", nb == 0 and ev(pg, "!!document.querySelector('.m20-r .m20-sl[aria-pressed]')"))
    for lang in ("de", "zh"):
        for v in ("map", "card", "goal", "compare"):
            ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); m20Open(curP(), '{v}', m20Read(curP()).chosen); }})()"); pg.wait_for_timeout(200)
            tl = main(pg)
            check(f"{lang} {v}: in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl and "Map of routes" not in tl and "Goal card" not in tl, raw_keys(tl))
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844})
    for v in ("map", "card", "compare", "goal", "take"):
        ev(pg, f"m20Open(curP(), '{v}', m20Read(curP()).short[0] || m20Read(curP()).chosen)"); pg.wait_for_timeout(250)
        sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
        check(f"390 px: the {v} view has no sideways scroll", sx <= 2, sx)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
