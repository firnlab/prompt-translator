"""2.0.0 Part A ("Foundation"): the facts book, the rules channel, ask once, contradictions, cross-project leaks, one Next + receipts,
error cards, examples never ask, layout width, plain words and "Add requirement" — on a COPY of the real data (or the made-up bundle)
with the mock runtime. Run: python3 test/e2e200_foundation.py [work/backup-141 | test/fixtures/synthetic.json]
 A1 facts book per project: More ⋯ and the page bar open it; add / edit / withdraw (one Undo each) with the owner's words, PT's short
    form, source, date, status; "Find rules in this project" proposes entries from the project's own data (quotes checked), confirmed in
    one batch (one Undo); another project never sees them.
 A2 rules channel: <your_rules> right after the task line of every project prompt, whole under a tiny budget and with `only`; the output
    check: a planted never ("never log in to Google or Samsung") and a tempting answer are caught (code hit → quick confirm → one repair
    → the option greyed "blocked by your rule", cannot be taken, no ★); a negated sentence is no hit; a confirm that says no blocks nothing.
 A3 ask once: a pick that repeats an interview answer and an interview question that repeats a pick are not asked; an unclear one goes
    through one quick check and a fact answers it; "Already known: … (change)"; a new question stays.
 A4 contradiction: a new entry against an active one shows both, quoted, with keep A / keep B / keep both (one Undo).
 A5 cross-project: the workspace profile is in no project prompt; "Copy into this project" makes it this project's fact only; the cone
    shows no ★ / "last time" from another tool.
 A6 one Next + receipts: "✓ Saved: … → where" after an interview answer, a pick, a note, a form; exactly one Next on every page; the
    examples loop goes to the example still waiting, never to a judged one, and says when all are judged.
 A7 errors: kept in the workspace's storage (technical text only), error cards in Events with cause and next action until dismissed,
    after a reload too; an AI failure is kept; "Report to Improve PT" is pre-filled; an error message links to the list.
 A8 examples never ask: the rule in the example prompts; a result with a question is asked again once, then the question moves out as
    "The tool would ask: …" (loop examples and pick options).
 A9 layout: text first, no fixed share for the action columns, the main column uses the width.
 A10 plain words: Not in this version · How much should run by itself? · PT drafts a fix, you pick · yes / no / not sure (3 languages).
 A11 "Add requirement" (1.2.1 report): it adds a requirement and puts the cursor in it.
 three languages (no raw keys, no ß), 390 px without sideways scroll, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=20000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0"):
            pg.wait_for_timeout(250)
            if ev(pg, "AI.running.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def undo(pg): ev(pg, "(() => { const p = curP(); const a = lastAct(p); if (a) undoAct(p, a.id); render(); })()"); pg.wait_for_timeout(150)
def prompts(pg, task): return ev(pg, f"(window.__allPrompts || []).filter(x => x.includes('[[task:{task}]]'))")
def facts(pg): return ev(pg, "factsRead(curP())")
def raw_keys(text): return sorted(set(re.findall(r"\b(?:facts|ev20|rc|ask|ex)\.[a-z][a-z0-9.]*\b", text)))
def open_facts(pg): ev(pg, "factsOpen(curP())"); pg.wait_for_timeout(200)
NEVER = "We never log in to Google or Samsung accounts"
CARD = {"q": "Where does the tool get the contacts?", "why": "It decides the first step", "target": "decision", "multi": False, "rec": 0,
        "options": [{"label": "Google sign-in", "text": "Log in to your Google account to read the contacts.", "ex": "For example: the list fills itself.", "pro": "fast", "con": "a login"},
                    {"label": "A file you export", "text": "You export the contacts as a file once a week.", "ex": "For example: a CSV on Monday.", "pro": "private", "con": "a step for you"}]}

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")
    pid = ev(pg, "(() => { const p = WS.projects.find(x => /watch/i.test(x.name)) || WS.projects[0]; openProject(p.id); p.autoInterview = false; return p.id; })()")
    other = ev(pg, f"(WS.projects.find(x => x.id !== '{pid}') || {{}}).id || ''")
    # 2.0 Part C: the move to 2.0 fills each book with the project's own 1.x rules; Part A's checks start from an empty book
    ev(pg, "WS.projects.forEach(p => { p.ledger = {v: 1, entries: [], props: [], conflicts: [], known: [], blocked: []}; if (p.seq) delete p.seq.F; }); render()")
    pg.wait_for_timeout(500)

    # ---------- A1 the facts book ----------
    print("A1 the facts book")
    check("More ⋯ has the facts book", ev(pg, "!!document.querySelector('.hdrmore [data-a=facts-open]')"))
    check("…and the page bar has it next to Decisions", ev(pg, "!!document.querySelector('.pg-bar .sp-facts[data-a=facts-open]') && !!document.querySelector('.pg-bar [data-a=rows-open]')"))
    pg.locator(".pg-bar .sp-facts").first.click(); pg.wait_for_timeout(250)
    check("…it opens the facts page (a panel the chat workspace can reuse: factsBodyHTML)", ev(pg, "!!document.querySelector('.facts-view .facts20') && typeof factsBodyHTML === 'function'"))
    pg.select_option("#fa-kind", "never"); pg.fill("#fa-words", NEVER)
    pg.locator(".facts-add button[type=submit]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    F = facts(pg); e1 = F["entries"][0] if F["entries"] else {}
    check("add: one never with your words, PT's short form, source, date, status", e1.get("id") == "F1" and e1.get("kind") == "never" and e1.get("words") == NEVER and e1.get("short") == NEVER and e1.get("src", {}).get("k") == "you" and e1.get("at") and e1.get("status") == "active", e1)
    row = ev(pg, "(document.querySelector('[data-fact=F1]') || {}).innerText || ''")
    check("…the row shows the words first, then where it came from and when", row.find(NEVER) >= 0 and "typed here" in row and row.find(NEVER) < row.find("typed here"), row)
    rc = ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''")
    check("…receipt: ✓ Saved: … → Facts book · Never", "Saved:" in rc and NEVER in rc and "Facts book · Never" in rc, rc)
    pg.locator("[data-a=facts-edit][data-id=F1]").first.click(); pg.wait_for_timeout(150)
    pg.fill("#fe-F1", NEVER + ", not even to test"); pg.locator("[data-form=facts-edit] button[type=submit]").first.click(); pg.wait_for_timeout(250); wait_ai(pg)
    e1 = facts(pg)["entries"][0]
    check("edit: the new words, the old ones kept in its history", e1["words"] == NEVER + ", not even to test" and len(e1["hist"]) == 1 and e1["hist"][0]["words"] == NEVER, e1)
    undo(pg)
    check("…one Undo takes the edit back", facts(pg)["entries"][0]["words"] == NEVER)
    pg.locator("[data-a=facts-withdraw][data-id=F1]").first.click(); pg.wait_for_timeout(200)
    check("withdraw: status withdrawn, listed under Withdrawn or replaced", facts(pg)["entries"][0]["status"] == "withdrawn" and ev(pg, "!!document.querySelector('.facts-old [data-fact=F1]')"))
    undo(pg)
    check("…one Undo makes it active again", facts(pg)["entries"][0]["status"] == "active")
    # find rules in this project
    ev(pg, f"""(() => {{ const p = curP(); p.northStar.constraints = 'Must work without a login. The price is CHF 20 a month.'; p.outOfScope = ['Paid ads', 'Never send e-mails by itself.'];
        p.constitution = ['Must answer in German.']; addNote({{text: 'We never share the photos with other apps.', projectId: p.id}}); touch(p); render(); }})()""")
    open_facts(pg)
    pg.locator("[data-a=facts-find]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    props = facts(pg)["props"]
    src = sorted(x["src"]["k"] for x in props)
    check("Find rules: proposals from the project's own data (constraints, not in this version, constitution, notes)", len(props) >= 4 and {"ns", "oos", "const", "note"} <= set(src), [(x["kind"], x["words"], x["src"]) for x in props])
    fp = prompts(pg, "facts-find")
    check("…one AI pass, the material quoted as data (untrusted), the other project's notes not in it", len(fp) == 1 and "untrusted_" in fp[0] and "We never share the photos" in fp[0], len(fp))
    check("…each proposal quotes your words and is shown with a tick", ev(pg, "document.querySelectorAll('.facts-props .fprop20 input[type=checkbox]:checked').length") == len(props))
    n0 = len(facts(pg)["entries"])
    ger = next((x for x in props if "German" in x["words"]), None)
    pg.locator(f".facts-props input[data-id='{ger['id']}']").first.click(); pg.wait_for_timeout(200)
    pg.locator("[data-a=facts-take]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    F = facts(pg)
    check("…the ticked ones become entries in one batch (the unticked one is left)", len(F["entries"]) == n0 + len(props) - 1 and not F["props"] and not any(e["words"] == ger["words"] for e in F["entries"]), [n0, len(props), len(F["entries"]), [e["words"][:40] for e in F["entries"]]])
    check("…found by PT, added by you, with the source of each", all(e["by"] == "pt" and e["src"]["k"] in ("ns", "oos", "const", "note", "qa", "pick", "dec") for e in F["entries"][1:]))
    undo(pg)
    F = facts(pg)
    check("…the whole batch is one Undo step", len(F["entries"]) == n0 and len(F["props"]) == len(props), [len(F["entries"]), len(F["props"])])
    pg.locator("[data-a=facts-take]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    nA = len(facts(pg)["entries"])
    if other:
        check("entries belong to one project: the other project's book is empty and its prompts carry no rules",
              ev(pg, f"(() => {{ const q = WS.projects.find(x => x.id === '{other}'); return !factsRead(q).entries.length && !buildPrompt('x-test', {{proj: q, body: 'b', schema: '{{}}'}}).includes('<your_rules') && !buildPrompt('x-test', {{proj: q, body: 'b', schema: '{{}}'}}).includes('Google or Samsung'); }})()"))

    # ---------- A2 the rules channel ----------
    print("A2 the rules channel")
    P = ev(pg, "buildPrompt('x-test', {proj: curP(), context: projectContext(curP(), {only: ['north_star']}), body: 'b', schema: '{}'})")
    check("<your_rules> right after the task line, before everything else", P.startswith("[[task:x-test]]\n<your_rules project=") and P.find("<your_rules") < P.find("<best_practices") < P.find("<project>"), P[:200])
    check("…with `only`, the rules are there and whole", NEVER in P and "Must work without a login" in P and "[F1] NEVER" in P)
    T = ev(pg, "(() => { const p = curP(); const big = 'x'.repeat(5000); for (let i = 0; i < 6; i++) addNote({text: big + i, projectId: p.id}); const c = projectContext(p, {max: 2000}); const s = buildPrompt('x-test', {proj: p, context: c, body: 'b', schema: '{}'}); return {cut: c.includes('not included to fit') || c.includes('left out'), rules: s.includes(JSON.stringify(" + json.dumps(NEVER) + "))}; })()")
    check("…never shortened: the budget logic cuts the project but not the rules", T["cut"] and T["rules"], T)
    ev(pg, "(() => { WS.notes = WS.notes.filter(n => !/^x{5000}/.test(n.text)); })()")
    ev(pg, "window.__allPrompts = []; window.__calls = []; window.__guardN = 0")
    ev(pg, "(() => { const p = curP(); p.pick = p.pick || pickOf(p); pickOf(p).cards = []; touch(p); })()")
    ev(pg, f"window.__mockOverride = (task, prompt) => task === 'pick-next' ? {{cards: [{json.dumps(CARD)}], candidates: [{{name: 'Google route', summary: 'Log in to the Google account and read the contacts there.'}}, {{name: 'File route', summary: 'A weekly file export.'}}], enough: false, likelyWrong: 'You may want to log in to Google after all to read the contacts.'}} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    pn = prompts(pg, "pick-next")
    check("a real project prompt (pick-next) starts with your rules", pn and pn[0].find("<your_rules") < pn[0].find("<best_practices") and NEVER in pn[0], len(pn))
    check("planted never + tempting answer: code hit, one quick confirm, then asked again once with the rule", len(pn) == 2 and "breaks the person's rule [F1]" in pn[1] and "Your previous answer had these problems" in pn[1] and ev(pg, "window.__guardN") >= 1, [len(pn), ev(pg, "window.__guardN")])
    c = ev(pg, "(() => { const c = pickRead(curP()).cards.find(x => x.q === 'Where does the tool get the contacts?'); return c ? {rec: c.rec, opts: c.options.map(o => [o.label, o.blocked ? o.blocked.id : ''])} : null; })()")
    check("…still breaking after the repair: the option stays, greyed, marked with the rule; the ★ is not on it", c and c["opts"][0] == ["Google sign-in", "F1"] and c["opts"][1][1] == "" and c["rec"] != 0, c)
    ev(pg, "pgOpen(curP(), 'picks')"); pg.wait_for_timeout(300)
    bl = ev(pg, "(document.querySelector('.pk-opt.blocked20') || {}).innerText || ''")
    check("…on screen: “Blocked by your rule: …”, not a button", "Blocked by your rule" in bl and NEVER in bl and not ev(pg, "!!document.querySelector('.pk-opt.blocked20 [data-a=pk-opt]')"), bl)
    k0 = ev(pg, "(() => { const c = pickRead(curP()).cards.find(x => x.q === 'Where does the tool get the contacts?'); return c ? pickAnswer(curP(), c.id, {keys: ['A']}) : 'none'; })()")
    check("…and it cannot be taken", k0 is None and ev(pg, "pickRead(curP()).cards.some(x => x.q === 'Where does the tool get the contacts?')"), k0)
    nb = ev(pg, "(document.querySelector('.nx20') || {}).innerText || ''")
    check("…a single sentence that cannot be left out is kept, flagged in the Next bar and in the book (“still in the answer”)", "Still in PT's answer although it breaks your rule: 1" in nb and any(x.get("kept") for x in ev(pg, "factsRead(curP()).blocked")), nb[:300])
    check("…a part that breaks the rule outside an option (a candidate design) is left out, recorded and said in the Next bar", "Left out because of your rule: 1" in nb and not any(c["name"] == "Google route" for c in ev(pg, "(pickRead(curP()).cands || {}).list || []")) and any("Google account" in x["text"] for x in ev(pg, "factsRead(curP()).blocked")), [nb[:200], ev(pg, "factsRead(curP()).blocked")])
    # repaired: the second answer keeps the rule → nothing blocked
    ev(pg, "(() => { pickOf(curP()).cards = []; window.__allPrompts = []; })()")
    ev(pg, f"window.__mockOverride = (task, prompt) => task === 'pick-next' ? (prompt.includes('Your previous answer had these problems') ? {{cards: [Object.assign({json.dumps(CARD)}, {{q: 'Where do the contacts come from?', options: [{json.dumps(CARD['options'][1])}, {{label: 'Typed in by you', text: 'You type the five contacts once.', ex: 'For example: five names.'}}]}})], enough: false}} : {{cards: [Object.assign({json.dumps(CARD)}, {{q: 'Where do the contacts come from?'}})], enough: false}}) : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    c = ev(pg, "(() => { const c = pickRead(curP()).cards.find(x => x.q === 'Where do the contacts come from?'); return c ? c.options.map(o => [o.label, !!o.blocked]) : null; })()")
    check("a repair that keeps the rule: its answer is used, nothing greyed", c == [["A file you export", False], ["Typed in by you", False]], c)
    # a negated sentence is no hit
    ev(pg, "(() => { pickOf(curP()).cards = []; window.__allPrompts = []; window.__guardN = 0; })()")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'pick-next' ? {cards: [{q: 'Where does the list live?', why: 'x', target: 'decision', multi: false, rec: 0, options: [{label: 'On the phone', text: 'We never log in to Google or Samsung; everything stays on the phone.'}, {label: 'A file', text: 'A file on the laptop.'}]}], enough: false} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    check("a sentence that keeps the rule (a negation) is no hit: no confirm call, nothing asked again", ev(pg, "window.__guardN") == 0 and len(prompts(pg, "pick-next")) == 1 and ev(pg, "pickRead(curP()).cards.some(c => c.q === 'Where does the list live?' && !c.options.some(o => o.blocked))"))
    check("…the code check itself: hit for the tempting sentence, none for the negated one", ev(pg, "(() => { const R = factsActive(curP(), ['never','must']); return factCodeHits(R, 'Log in to your Google account to read the contacts.').length > 0 && !factCodeHits(R, 'We do not log in to Google or Samsung.').length; })()"))
    # the quick confirm says it does not break the rule
    ev(pg, "(() => { pickOf(curP()).cards = []; window.__allPrompts = []; window.__guardSays = false; FACT_GUARD.cache.clear(); })()")
    ev(pg, f"window.__mockOverride = (task, prompt) => task === 'pick-next' ? {{cards: [Object.assign({json.dumps(CARD)}, {{q: 'How are the contacts read?'}})], enough: false}} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    check("a code hit the quick confirm calls fine blocks nothing and asks nothing again", len(prompts(pg, "pick-next")) == 1 and ev(pg, "pickRead(curP()).cards.some(c => c.q === 'How are the contacts read?' && !c.options.some(o => o.blocked))"))
    ev(pg, "(() => { delete window.__guardSays; FACT_GUARD.cache.clear(); pickOf(curP()).cards = []; window.__mockOverride = null; })()")

    # ---------- A3 ask once ----------
    print("A3 ask once")
    ev(pg, "(() => { const p = curP(); p.qa.push({id: 'qa-t200', dim: 'look', q: 'How should the weekly list look on screen?', answer: 'A ranked board with three columns', options: [], at: now(), st: 'ok'}); const k = pickOf(p); k.log.push({id: 'pe-t200', at: now(), by: 'you', q: 'Who reads the weekly list besides you?', answer: 'Only me', keys: ['A']}); touch(p); })()")
    ev(pg, "window.__allPrompts = []; window.__calls = []")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'pick-next' ? {cards: [{q: 'How should the weekly list look on screen?', why: 'x', target: 'decision', rec: 0, options: [{label: 'A board', text: 'x'}, {label: 'A list', text: 'y'}]}, {q: 'How often should it run on its own?', why: 'x', target: 'decision', rec: 0, options: [{label: 'Weekly', text: 'x'}, {label: 'Daily', text: 'y'}]}], enough: false} : null")
    ev(pg, "aiPickNext(curP(), {n: 2})"); pg.wait_for_timeout(300); wait_ai(pg)
    qs = ev(pg, "pickRead(curP()).cards.map(c => c.q)")
    check("a pick that repeats an interview answer is not asked; a new one is", "How should the weekly list look on screen?" not in qs and "How often should it run on its own?" in qs, qs)
    kn = ev(pg, "(document.querySelector('.nx20 .known20') || {}).innerText || ''")
    check("…“Already known: … → your answer (change)” on screen", "Already known" in kn and "How should the weekly list look on screen?" in kn and "A ranked board with three columns" in kn and ev(pg, "!!document.querySelector('.known20 [data-a=ask-change][data-ref=\"qa:qa-t200\"]')"), kn)
    ev(pg, "(() => { const p = curP(); p.dims = p.dims || {}; p.dims.scope = {status: 'unknown', summary: ''}; p.dims.look = {status: 'unknown', summary: ''}; p.pendingQs = []; touch(p); })()")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'interview' ? {dims: [], questions: [{dim: 'scope', text: 'Who reads the weekly list besides you?', options: ['Only me', 'My team'], recommended: 0, impact: 4, uncertainty: 3}, {dim: 'look', text: 'How many zebra stickers does the parcel need?', options: ['One', 'Two'], recommended: 0, impact: 2, uncertainty: 2}], assumptions: [], foresight: [], ready: false} : null")
    ev(pg, "aiInterview(curP())"); pg.wait_for_timeout(300); wait_ai(pg)
    pq = ev(pg, "curP().pendingQs.map(q => q.text)")
    check("an interview question that repeats a pick is not asked; a new one is", "Who reads the weekly list besides you?" not in pq and "How many zebra stickers does the parcel need?" in pq, pq)
    # unclear: one quick check; a fact answers it
    ev(pg, "(() => { const p = curP(); factsAdd(p, {kind: 'fact', words: 'The contacts come from one exported file every Monday'}); touch(p); window.__calls = []; })()")
    fid = ev(pg, "factsActive(curP()).find(e => /exported file/.test(e.words)).id")
    ev(pg, f"window.__askOnce = {{known: [{{i: 0, ref: 'fact:{fid}'}}]}}")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'pick-next' ? {cards: [{q: 'Which exported contacts file is used, and when?', why: 'x', target: 'decision', rec: 0, options: [{label: 'Monday', text: 'x'}, {label: 'Friday', text: 'y'}]}], enough: false} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    check("an unclear question gets one quick check; a fact answers it, so it is not asked", ev(pg, "window.__calls.filter(x => x === 'ask-once').length") == 1 and "Which exported contacts file is used, and when?" not in ev(pg, "pickRead(curP()).cards.map(c => c.q)"), ev(pg, "window.__calls"))
    check("…the facts book lists what was not asked again", ev(pg, "factsRead(curP()).known.length") >= 3)
    ev(pg, "(() => { delete window.__askOnce; window.__mockOverride = null; })()")

    # ---------- A4 contradictions ----------
    print("A4 contradictions")
    ev(pg, "window.__mockOverride = (task, prompt) => { if (task !== 'facts-conflict') return null; const nw = JSON.parse(/<new>(.*?)<\\/new>/s.exec(prompt)[1]); return nw.some(x => /Google/.test(x.text)) ? {conflicts: [{a: 'F1', b: nw[0].id, why: 'One forbids a Google login, the other needs one.'}]} : {conflicts: []}; }")
    open_facts(pg)
    pg.select_option("#fa-kind", "must"); pg.fill("#fa-words", "Must sign in with the Google account to sync")
    pg.locator(".facts-add button[type=submit]").first.click(); pg.wait_for_timeout(400); wait_ai(pg)
    cf = ev(pg, "(document.querySelector('.facts-conf') || {}).innerText || ''")
    newid = ev(pg, "factsActive(curP()).find(e => /sign in with the Google/.test(e.words)).id")
    check("a contradicting entry: one quick check, both shown quoted", NEVER in cf and "Must sign in with the Google account to sync" in cf and "One forbids a Google login" in cf, cf)
    check("…with keep A / keep B / keep both", ev(pg, "[...document.querySelectorAll('.facts-conf [data-a=facts-resolve]')].map(b => b.dataset.v).join()") == "a,b,both")
    pg.locator(".facts-conf [data-a=facts-resolve][data-v=b]").first.click(); pg.wait_for_timeout(200)
    F = ev(pg, f"[factById(curP(), 'F1'), factById(curP(), '{newid}')].map(e => [e.status, e.replacedBy || ''])")
    check("keep B: A is replaced by B", F == [["replaced", newid], ["active", ""]], F)
    undo(pg)
    F = ev(pg, f"[factById(curP(), 'F1').status, factById(curP(), '{newid}').status, !!document.querySelector('.facts-conf')]")
    check("…one Undo: both active again and the question is back", F == ["active", "active", True], F)
    pg.locator(".facts-conf [data-a=facts-resolve][data-v=both]").first.click(); pg.wait_for_timeout(200)
    check("keep both: both stay active, the card goes", ev(pg, f"factById(curP(), 'F1').status === 'active' && factById(curP(), '{newid}').status === 'active' && !document.querySelector('.facts-conf')"))
    ev(pg, f"(() => {{ const e = factById(curP(), '{newid}'); e.status = 'withdrawn'; touch(curP()); window.__mockOverride = null; render(); }})()")

    # ---------- A5 cross-project ----------
    print("A5 cross-project")
    ev(pg, "(() => { WS.profile = WS.profile || {entries: []}; WS.profile.entries.push({id: 'pf-t200', text: 'Prefers short answers in bullet points'}); window.__allPrompts = []; })()")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'pick-next' ? {cards: [], enough: true, enoughWhy: 'x'} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    allp = ev(pg, "(window.__allPrompts || []).join('\\n')")
    check("the workspace profile is in no project prompt", allp and "Prefers short answers in bullet points" not in allp and "user_profile" not in allp and "user_profile" not in ev(pg, "projectContext(curP())"))
    open_facts(pg)
    check("…the facts book offers it with “Copy into this project”", "Prefers short answers in bullet points" in ev(pg, "(document.querySelector('.facts-prof') || {}).textContent || ''") and ev(pg, "!!document.querySelector('.facts-prof [data-a=facts-copyprof][data-id=pf-t200]')"))
    ev(pg, "document.querySelector('.facts-prof').open = true"); pg.locator(".facts-prof [data-a=facts-copyprof]").first.click(); pg.wait_for_timeout(300); wait_ai(pg)
    cp = ev(pg, "factsActive(curP()).find(e => e.src.k === 'profile')")
    check("…copied: a fact of this project (source: your profile), in its prompts", cp and cp["words"] == "Prefers short answers in bullet points" and "Prefers short answers in bullet points" in ev(pg, "buildPrompt('x-test', {proj: curP(), body: 'b', schema: '{}'})"), cp)
    if other:
        check("…and in no other project's prompt", "Prefers short answers" not in ev(pg, f"buildPrompt('x-test', {{proj: WS.projects.find(x => x.id === '{other}'), body: 'b', schema: '{{}}'}})"))
    C = ev(pg, """(() => { const p = curP(), q = WS.projects.find(x => x.id !== p.id); const keep = q && q.cone; if (q) q.cone = {v: 1, ans: {aud: {v: 'me', at: now()}}, fams: [], pre: {}};
        let h = ''; try{ h = coneQHTML(p, {v: 1, ans: {}, fams: [], pre: {}, known: {}}, 'aud'); }catch(e){ h = 'ERR ' + e.message; } if (q) q.cone = keep; return {h, name: q ? q.name : '', fn: typeof conePolicy}; })()""")
    check("the cone: no ★ and no “last time” from another tool", "★" not in C["h"] and (not C["name"] or C["name"] not in C["h"]) and "last time" not in C["h"] and C["fn"] == "undefined" and not C["h"].startswith("ERR"), C)
    ev(pg, "window.__mockOverride = null")

    # ---------- A6 one Next and receipts ----------
    print("A6 one Next and receipts")
    ev(pg, "(() => { const p = curP(); p.pendingQs.push({id: 'q-t200', dim: 'look', text: 'Should the board show the price per idea?', options: ['Yes, next to the name', 'No'], recommended: 0, at: now()}); touch(p); ev20Keep = 0; })()".replace(" ev20Keep = 0;", ""))
    ev(pg, "ACTIONS['q-pick']({dataset: {q: 'q-t200', i: '0'}})"); pg.wait_for_timeout(200)
    ev(pg, "UI.home = true; render()"); pg.wait_for_timeout(200)
    rc = ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''")
    check("an interview answer: ✓ Saved: the question → your answer → Interview answers", "Saved:" in rc and "Should the board show the price per idea?" in rc and "Yes, next to the name" in rc and "Interview answers" in rc, rc)
    check("…the answered question never comes back as an open item", not ev(pg, "curP().pendingQs.some(q => q.id === 'q-t200') || queueOf(curP()).some(x => /price per idea/.test(str(x.title)))"))
    ev(pg, f"addNote({{text: 'Remember the Friday export', projectId: '{pid}'}}); render()"); pg.wait_for_timeout(150)
    check("a note: ✓ Saved → Notes of this project", "Remember the Friday export" in ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''") and "Notes of this project" in ev(pg, "document.querySelector('.nx20 .rc20').innerText"))
    ev(pg, "(() => { const k = pickOf(curP()); k.cards.push({id: 'pk-t200', q: 'Which day should the list arrive?', why: 'x', target: 'decision', multi: false, options: [{k: 'A', label: 'Monday', text: ''}, {k: 'B', label: 'Friday', text: ''}], rec: 0, by: 'pt', at: now(), round: 1}); touch(curP()); })()")
    ev(pg, "pickAnswer(curP(), 'pk-t200', {keys: ['B']}); render()"); pg.wait_for_timeout(150)
    rc = ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''")
    check("a pick: ✓ Saved: the question → your choice → Decisions", "Which day should the list arrive?" in rc and "Friday" in rc and "Decisions" in rc, rc)
    pages = ev(pg, """(async () => { const p = curP(), w = ms => new Promise(r => setTimeout(r, ms)), out = {}; UI.home = true; render(); await w(150);
        const one = () => { const n = document.querySelectorAll('.nx20'); return n.length === 1 ? n[0].querySelectorAll('.nx20-next .btn.primary').length : -n.length; };
        out.cover = one(); for (const id of PG_PAGES){ pgOpen(p, id); await w(150); out[id] = one(); } ACTIONS['rows-open'](); await w(150); out.rows = one(); factsOpen(p); await w(150); out.facts = one(); return out; })()""")
    check("exactly one Next (one primary button) on the cover, the seven pages, Decisions and the facts book", all(v == 1 for v in pages.values()), pages)
    # the examples loop
    L = ev(pg, """(() => { const p = curP(); const g = goalOf(p); const ids = ['E-a', 'E-b', 'E-c'].map((x, i) => { const e = newExample(p, {input: 'Loop input ' + i, output: 'Loop result ' + i, by: 'pt', src: 'pt', use: 'teach'}); return e.id; });
        const L = loopOf(p); L.phase = 'react'; L.ids = ids; L.i = 2; L.round = 1; exById(p, ids[1]).verdict = 'good'; touch(p); render(); return ids; })()""")
    ev(pg, f"ACTIONS['ex-grade']({{dataset: {{id: '{L[2]}', v: 'good'}}}})"); pg.wait_for_timeout(150)
    check("the examples loop: after the last one, it goes to the one still waiting, not to a judged one", ev(pg, f"(() => {{ const {{list, i}} = loopCur(curP()); return list[i].id; }})()") == L[0] and "still to judge: 1" in ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''"))
    ev(pg, f"ACTIONS['ex-grade']({{dataset: {{id: '{L[0]}', v: 'good'}}}})"); pg.wait_for_timeout(150)
    check("…all judged: it says so and names the next step", "all judged; next: make the rules from them" in ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''"))
    ev(pg, "(() => { const L = loopOf(curP()); L.phase = 'idle'; L.ids = []; touch(curP()); render(); })()")
    # a text form
    ev(pg, "(() => { UI.modal = {kind: 'ns', wide: true}; render(); })()"); pg.wait_for_timeout(200)
    if ev(pg, "!!document.querySelector('[data-form=ns]')"):
        pg.locator("[data-form=ns] textarea, [data-form=ns] input[type=text]").first.fill("Ideas get lost between weeks")
        ev(pg, "document.querySelector('[data-form=ns]').requestSubmit()"); pg.wait_for_timeout(300); wait_ai(pg)
        ev(pg, "(() => { UI.modal = null; UI.home = true; render(); })()"); pg.wait_for_timeout(200)
        rc = ev(pg, "(document.querySelector('.nx20 .rc20') || {}).innerText || ''") + " | " + json.dumps(ev(pg, "UI.rcpt20"))
        check("a text form (North Star): ✓ Saved: what you wrote → North Star", "Ideas get lost between weeks" in rc and "North Star" in rc, rc)
    ev(pg, "(() => { UI.modal = null; render(); })()")

    # ---------- A7 errors ----------
    print("A7 errors")
    ev(pg, "(() => { WS.settings.events = []; saveWs(); })()")
    ev(pg, "onAppError('Cannot read properties of undefined (reading \"We never log in to Google or Samsung accounts\")', 'v200_facts.js:12')"); pg.wait_for_timeout(700)
    E = ev(pg, "WS.settings.events")
    check("an error is kept in the workspace's storage, technical text only (the quoted project text is gone)", len(E) == 1 and E[0]["kind"] == "error" and "Cannot read properties of undefined" in E[0]["msg"] and "Google or Samsung" not in json.dumps(E) and E[0]["src"] == "v200_facts.js:12", E)
    check("…the message that popped up links to the list", ev(pg, "[...document.querySelectorAll('#toasts .toast.err')].some(t => t.dataset.a === 'events-open')"))
    check("…the status bar shows it until it is dismissed", "Errors: 1" in ev(pg, "(document.querySelector('.sbar .ev20-chip') || {}).innerText || ''"))
    ev(pg, "window.__mockGarbage = 'junk'"); ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(500); wait_ai(pg); ev(pg, "delete window.__mockGarbage"); pg.wait_for_timeout(700)
    E = ev(pg, "WS.settings.events")
    check("an AI step that fails is kept too (its code, which step)", any(x["kind"] == "ai" and x["code"] == "invalid_json" and x["step"] == "interview" for x in E), E)
    pg.wait_for_timeout(800)
    db = ev(pg, "JSON.stringify(Object.entries(window.__mockdb()).filter(([k]) => /\\/ws-[^/]+$/.test(k) || /workspace/.test(k)).map(([k, v]) => v && v.settings && v.settings.events))")
    check("…written to the workspace document (so Claude can read it), without the project text", "Cannot read properties of undefined" in db and "invalid_json" in db and "Google or Samsung" not in db, db[:300])
    ev(pg, "(async () => { flushSaves(); await storeIdle(3000); WS.settings.events = []; await openWorkspace(WS.id); })()"); pg.wait_for_timeout(1500)
    ev(pg, f"openProject('{pid}')"); pg.wait_for_timeout(400)
    check("…still there after the workspace is read again from storage", len(ev(pg, "ev20List()")) == 2 and ev(pg, "!!document.querySelector('.sbar .ev20-chip')"), ev(pg, "ev20List()"))
    ev(pg, "(() => { UI.modal = {kind: 'events'}; render(); })()"); pg.wait_for_timeout(200)
    cards = ev(pg, "[...document.querySelectorAll('.modal .ev20, .rpage .ev20, .ev20')].map(c => c.innerText)")
    check("the Events list: an error card each, with what happened, what PT did and what you can do", len(cards) >= 2 and any("PT hit a fault in its own code" in c and "What PT did:" in c and "What you can do:" in c and "Report it to Improve PT" in c for c in cards) and any("Claude's answer could not be read" in c for c in cards), cards)
    pg.locator(".ev20 [data-a=ev20-report]").first.click(); pg.wait_for_timeout(250)
    tr = ev(pg, "(document.getElementById('tr-in') || {}).value || ''")
    check("Report to Improve PT: the message starts with the technical detail, no project text", tr.startswith("PT error (technical detail only, no project text):") and "Prompt Translator " in tr and "Google or Samsung" not in tr, tr)
    ev(pg, "(() => { UI.modal = {kind: 'events'}; render(); })()"); pg.wait_for_timeout(200)
    n1 = len(ev(pg, "ev20List()")); pg.locator(".ev20 [data-a=ev20-dismiss]").first.click(); pg.wait_for_timeout(300)
    check("dismiss: the card goes (and only then)", len(ev(pg, "ev20List()")) == n1 - 1)
    ev(pg, "(() => { UI.modal = null; WS.settings.events = []; saveWs(); render(); })()")

    # ---------- A8 examples never ask ----------
    print("A8 examples never ask")
    ev(pg, "window.__allPrompts = []")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'loop-show' ? {examples: [{input: 'Order 12 from Anna', output: 'Your order 12 is ready.\\nReply with (a) pickup or (b) delivery?', aim: 'x'}]} : null")
    ev(pg, "(() => { const p = curP(); p.loopSize = {teach: 1, check: 1}; goalOf(p).examples.forEach(e => { if (!e.verdict) e.verdict = 'good'; }); loopStart(p); })()"); pg.wait_for_timeout(400); wait_ai(pg)
    lp = prompts(pg, "loop-show")
    check("the examples rule is in the example prompt", lp and "<examples_rule>" in lp[0] and "Examples never ask" in lp[0], len(lp))
    check("…a result that asks is asked again once", len(lp) == 2 and "Examples never ask: write the finished result" in lp[1], len(lp))
    ex = ev(pg, "(() => { const e = goalOf(curP()).examples.slice(-1)[0]; return {out: e.output, ask: e.toolAsks || ''}; })()")
    check("…still asking: the question moves out of the result (“The tool would ask: …”)", "?" not in ex["out"] and "Reply with" not in ex["out"] and "Your order 12 is ready." in ex["out"] and "Reply with (a) pickup or (b) delivery?" in ex["ask"], ex)
    h = ev(pg, "exCard(curP(), goalOf(curP()).examples.slice(-1)[0])")
    check("…the example shows it labelled as the tool's own turn", "The tool would ask:" in h and "Reply with (a) pickup" in h)
    ev(pg, "(() => { pickOf(curP()).cards = []; })()")
    ev(pg, "window.__mockOverride = (task, prompt) => task === 'pick-next' ? {cards: [{q: 'What does the reminder say?', why: 'x', target: 'decision', rec: 0, options: [{label: 'Short', text: 'One line', ex: 'For example: Your list is ready. Which day suits you?'}, {label: 'Long', text: 'A paragraph', ex: 'For example: the five best ideas with their scores.'}]}], enough: false} : null")
    ev(pg, "aiPickNext(curP(), {n: 1})"); pg.wait_for_timeout(300); wait_ai(pg)
    o = ev(pg, "(() => { const c = pickRead(curP()).cards.find(x => x.q === 'What does the reminder say?'); return c ? {ex: c.options[0].ex, ask: c.options[0].toolAsks || ''} : null; })()")
    check("a pick option's example: the question is taken out and shown as the tool's", o and "?" not in o["ex"] and "Which day suits you?" in o["ask"], o)
    check("…the code check knows the three languages", ev(pg, "exAsks('Antworte mit A oder B') && exAsks('请回复 A 或 B') && exAsks('Welche Farbe möchtest du') && !exAsks('The list has five ideas, each with a score.')"))
    ev(pg, "(() => { pickOf(curP()).cards = []; window.__mockOverride = null; render(); })()")

    # ---------- A9 layout ----------
    print("A9 layout")
    ev(pg, "(() => { UI.home = true; render(); })()"); pg.wait_for_timeout(250)
    S = ev(pg, """(() => { const rule = sel => { let v = ''; for (const sh of document.styleSheets){ let rs = []; try{ rs = [...sh.cssRules]; }catch(e){ continue; } for (const r of rs) if (r.selectorText === sel && r.style.maxWidth) v = r.style.maxWidth; } return v || 'none'; };
        return {q: rule('.qacts'), c: rule('.chips'), m: getComputedStyle(document.querySelector('.main-inner')).maxWidth}; })()""")
    check("no fixed share for the action columns; the main column may use the full width", not S["q"].endswith("%") or S["q"] == "100%", S)
    check("…chips follow the text, the main column has no 1180 px cap", (not S["c"].endswith("%") or S["c"] == "100%") and (S["m"] == "none" or int(S["m"].replace("px", "") or 0) >= 1760), S)
    W = ev(pg, "[...document.querySelectorAll('.qrow')].slice(0, 8).map(r => { const b = r.querySelector('.qbody'), a = r.querySelector('.qacts'); if (!b) return 1; const same = a && Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 4; return same ? b.getBoundingClientRect().width / r.getBoundingClientRect().width : 1; })")
    check("…text first: in a row the text gets at least 60 % (or the buttons wrap under it)", W and all(x >= 0.6 for x in W), W)

    # ---------- A10 plain words ----------
    print("A10 plain words")
    old = ev(pg, """(() => { const bad = [/Out of scope/i, /Right-sizing/i, /Fix it together with me/i, /\\bvalidated\\b/i, /Nicht im Umfang/, /Dimensionierung/, /Gemeinsam mit mir beheben/, /不在范围内/, /规模适配/, /和我一起修复/, /已证实/, /已证伪/];
        return Object.entries(STR).filter(([k, r]) => !/^cl\\./.test(k) && r.some(x => bad.some(b => b.test(x)))).map(([k]) => k); })()""")
    check("the old process words are gone from every string (three languages)", not old, old)
    W10 = ev(pg, "[t('req.oos'), t('eng.score'), t('rev.fixtogether'), t('ast.validated'), t('ast.invalid'), t('ast.accepted')]")
    check("…Not in this version · How much should run by itself? · PT drafts a fix, you pick · yes / no / not sure", W10 == ["Not in this version", "How much should run by itself?", "PT drafts a fix, you pick what to keep", "yes, it holds", "no, it does not hold", "not sure, going ahead anyway"], W10)

    # ---------- A11 Add requirement ----------
    print("A11 Add requirement")
    R = ev(pg, """(async () => { const p = curP(), w = ms => new Promise(r => setTimeout(r, ms)); pgOpen(p, 'design'); await w(250);
        const d = document.querySelector('.pg-details [data-a=pg-details]'); if (d && d.getAttribute('aria-expanded') !== 'true') d.click(); await w(250);
        const tab = [...document.querySelectorAll('.pg-details [data-a=goto]')].find(b => b.dataset.ph === 'require'); if (tab) tab.click(); await w(350);
        const oos = [...document.querySelectorAll('.main h3, .main h2, .main .panel-h, .main b')].some(h => h.textContent.trim() === t('req.oos'));
        const n0 = p.requirements.length, b = [...document.querySelectorAll('.main button[data-a=add-req]')][0]; if (!b) return {found: false, oos};
        b.click(); await w(600); const q = curP(), last = q.requirements[q.requirements.length - 1], el = document.activeElement;
        return {found: true, oos, n0, n1: q.requirements.length, focus: !!el && (el.dataset.bind || '').includes('requirements.#' + last.id), seen: !!document.getElementById('ir-req:' + last.id)}; })()""")
    check("“Add requirement” is on the Design page's requirements and works: one more requirement", R.get("found") and R.get("n1") == R.get("n0", 0) + 1, R)
    check("…the new requirement is on screen with the cursor in it", R.get("focus") and R.get("seen"), R)
    check("…and the heading next to it says “Not in this version”", R.get("oos"), R)
    undo(pg)

    # ---------- languages, phone width ----------
    print("languages, phone width")
    open_facts(pg)
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); render(); }})()"); pg.wait_for_timeout(250)
        tl = ev(pg, "document.querySelector('.main').innerText")
        check(f"{lang}: the facts book in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl and "Facts book" not in tl and "Find rules in this project" not in tl, raw_keys(tl))
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); open_facts(pg); pg.wait_for_timeout(250)
    sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
    check("390 px: the facts book has no sideways scroll", sx <= 2, sx)
    ev(pg, "(() => { onAppError('a test fault', 'test'); UI.modal = {kind: 'events'}; render(); })()"); pg.wait_for_timeout(250)
    sx = ev(pg, "Math.max(document.documentElement.scrollWidth - innerWidth, 0)")
    check("390 px: the Events list has no sideways scroll", sx <= 2, sx)
    ev(pg, "(() => { UI.modal = null; WS.settings.events = []; saveWs(); render(); })()")
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
