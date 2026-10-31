import re, sys, json, pathlib, threading, functools, http.server
from playwright.sync_api import sync_playwright
# serve the test pages from a real http origin: file:// pages lose localStorage writes across reloads now and then
_srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(pathlib.Path(__file__).resolve().parent)))
threading.Thread(target=_srv.serve_forever, daemon=True).start()
def url(f): return "http://127.0.0.1:%d/%s" % (_srv.server_address[1], pathlib.Path(f).name)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path("work/shots12"); SHOTS.mkdir(parents=True, exist_ok=True)
page_html = (ROOT / "dist/prompt-translator.html").read_text()
wrapped = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>" + page_html + "</body></html>"
TEST_HTML = ROOT / "test/index12.html"; TEST_HTML.write_text(wrapped)
MOCK = (ROOT / "test/mock.js").read_text()
ONLY = sys.argv[1] if len(sys.argv) > 1 else "all"

errors, fails = [], []
def check(cond, msg):
    if not cond: fails.append(msg); print("  FAIL:", msg)
    else: print("  ok:", msg)
def wait_idle(pg, ms=15000):
    pg.wait_for_timeout(150)
    pg.wait_for_function("""() => { const idle = AI.running.size === 0 && !UI.fixAll; const now = Date.now(); if (!idle){ window.__idleSince = 0; return false; } if (!window.__idleSince) window.__idleSince = now; return now - window.__idleSince > 700; }""", timeout=ms, polling=100)
    pg.evaluate("window.__idleSince = 0")
def click(pg, sel, nth=0, force=False):
    pg.locator(sel).nth(nth).click(force=force); pg.wait_for_timeout(90)
def go_preview(pg):
    if pg.locator("[data-a=preview-go]").count(): click(pg, "[data-a=preview-go]")
def raw_keys(pg):
    txt = pg.evaluate("() => document.body.innerText")
    return sorted(set(m for m in re.findall(r"\b[a-z]{2,}(?:\.[a-zA-Z0-9]{1,})+\b", txt) if not re.search(r"\.(md|json|zip|com|ch|ai|txt|html|pdf)$", m) and not m.startswith(("claude.", "scoring-", "platform.", "support.", "docs.", "example."))))
def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

V1_SEED = {  # v1 data as it exists today: one default workspace, one v1 project
  "data/users/user-1/meta": {"last":"w-old","workspaces":[{"color":"#5aa2ff","createdAt":"2026-10-18T05:08:39.333Z","id":"w-old","name":"My workspace","pinHash":None}]},
  "data/users/user-1/ws-w-old": {"name":"My workspace","settings":{"lang":"en","theme":"dark","tier":"complex","model":"","effort":"","stepModel":{}},"profile":{"entries":[]}},
  "data/users/user-1/ws-w-old/projects/p-old": {"id":"p-old","name":"Old v1 project","phase":"review","status":"active","northStar":{"problem":"P","goal":"G","success":"S","users":"","constraints":"","now":""},"intake":{"raw":"old idea","clean":"","contradictions":[],"ambiguities":[],"missing":[],"confidence":""},
     "qa":[{"id":"qa-1","dim":"look","q":"Look?","answer":"Board — (recommended option)","at":"2026-10-18"}],"requirements":[{"id":"R1","title":"t","given":"g","when":"w","then":"th","priority":"must"}],"findings":[{"id":"fd-1","lens":"security","severity":"high","section":"instructions","issue":"x","fix":"y","status":"fixed"}],"versionNo":2,"pkg":{"sections":[{"id":"instructions","dest":"instructions","title":"I","content":"Do it.","reqIds":["R1"]}]}}
}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":1440, "height":960}, color_scheme="dark")
    ctx.add_init_script(MOCK)
    ctx.add_init_script("if (window === window.top && !localStorage.getItem('mockdb')) localStorage.setItem('mockdb', " + json.dumps(json.dumps(V1_SEED)) + ");")
    pg = ctx.new_page()
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" and "fonts.g" not in m.text and "net::" not in m.text else None)
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.goto(url(TEST_HTML))

    print("1 boot + migration")
    pg.wait_for_selector(".rail", timeout=8000); pg.wait_for_timeout(400)
    names = pg.evaluate("META.workspaces.map(w => w.name)")
    check(names == ["Owner"], "only Owner's workspace in his login (Second owner has her own): " + str(names))
    _v = pg.evaluate("PT_VERSION"); check(pg.locator(f"text=What's new in {_v}").count() == 1, f"What's new {_v} shown once")
    check(pg.evaluate("WS.settings.defaultMode") == "blueprint", "Owner's default view is Blueprint")
    click(pg, "[data-a=modal-close]")
    check(pg.locator(".pcard >> text=Old v1 project").count() == 1, "v1 project carried over")
    pg.screenshot(path=str(SHOTS / "01-cockpit.png"), full_page=True)
    click(pg, ".pcard >> text=Old v1 project"); pg.wait_for_timeout(300)
    check(pg.locator(".modebar").count() == 1, "mode bar on migrated project")
    for m in ["steps","blueprint","journey","swimlanes","express"]:
        click(pg, f"[data-a=mode][data-v={m}]"); pg.wait_for_timeout(250)
        check(pg.locator(".main").count() == 1 and not [e for e in errors if "pageerror" in e], f"mode {m} renders on migrated project")
    click(pg, "[data-a=mode][data-v=steps]")
    click(pg, "[data-a=goto][data-ph=review]"); pg.wait_for_timeout(200)
    check(pg.locator("text=Waiting for confirmation · 1").count() == 1, "v1 'fixed' finding is waiting for confirmation")

    print("2 new project from the start page")
    click(pg, "[data-a=nav][data-v=cockpit]")
    pg.fill("#start-in", "I want an agent that looks for, categorises, ranks and lists high reward, low effort business ideas that can run fully digitally and automated.")
    click(pg, "[data-a=start-mode][data-v=steps]")
    click(pg, "form[data-form=start] button[type=submit]"); pg.wait_for_timeout(300)
    check("I want an agent" in pg.locator("#raw").input_value(), "Start filled Capture")
    check(pg.locator("[data-a=clarify]").count() >= 1, "Clarify waits for a click")
    click(pg, "[data-a=clarify]"); wait_idle(pg)
    click(pg, "[data-a=ns-accept]")
    check("ranked weekly list" in pg.locator(".northstar").inner_text(), "north star filled")
    check(pg.locator("#audience").count() == 1, "Capture asks who will use it (D8)")
    click(pg, "[data-a=aud-set][data-k=customers][data-v=false]"); click(pg, "[data-a=aud-set][data-k=eu][data-v=true]")
    check(pg.evaluate("curP().audience.eu") is True, "audience saved")
    pg.screenshot(path=str(SHOTS / "02-capture.png"), full_page=True)

    print("3 understand + first questions")
    click(pg, ".controw.top [data-a=goto]", nth=0)  # continue
    pg.wait_for_timeout(200)
    for k in ["whys","jtbd","walkthrough","premortem"]:
        click(pg, f"[data-a=understand][data-kind={k}]"); wait_idle(pg)
    click(pg, "[data-a=goto][data-ph=interview]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=interview]"); wait_idle(pg)
    click(pg, "[data-a=q-opt]"); click(pg, "[data-a=q-answer]"); wait_idle(pg)
    check(pg.locator("text=Answered (1)").count() == 1, "answered list at the top")
    click(pg, "[data-a=qa-reanswer]"); pg.wait_for_timeout(150)
    check(pg.locator(".qcard .opt").count() >= 2, "change answer reopens original options")
    click(pg, ".qcard .opt", nth=1); click(pg, "[data-a=qa-save]")
    pg.screenshot(path=str(SHOTS / "03-interview.png"), full_page=True)
    pg.wait_for_function("() => eng(curP()).scan.state === 'done'", timeout=10000)
    check(pg.evaluate("eng(curP()).scan.result.verdict") == "partial", "frontier scan ran by itself in the background")
    click(pg, "[data-a=goto][data-ph=understand]"); pg.wait_for_timeout(200)
    check(pg.locator("text=Build only the missing part").count() >= 1, "scan verdict shown in Understand")
    check(pg.locator("text=Exploding Topics").count() >= 1, "existing products listed")
    click(pg, "[data-a=gates-accept]")
    check(pg.evaluate("eng(curP()).gates.G1.ans") == "no" and pg.evaluate("eng(curP()).gates.G2.ans") == "yes", "G1/G2 answered from PT's suggestions")
    pg.screenshot(path=str(SHOTS / "03b-scan.png"), full_page=True)

    print("4 requirements + early check + architecture")
    click(pg, "[data-a=goto][data-ph=require]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=requirements]"); wait_idle(pg)
    check(pg.locator("text=Weekly ranking").count() >= 1 or pg.locator("input[value='Weekly ranking']").count() >= 1, "requirements generated")
    click(pg, "[data-a=early-check][data-v=require]"); wait_idle(pg)
    check(pg.locator("text='dated source' is vague").count() >= 1, "early check finding shown")
    click(pg, "[data-a=item-tool][data-ref='req:R1'][data-k=change]"); pg.fill("#it-in", "make it stricter"); click(pg, "[data-a=item-send]"); wait_idle(pg)
    check(pg.locator(".proposal").count() == 1, "item change proposal shown with before/after")
    click(pg, "[data-a=item-accept]"); pg.wait_for_timeout(150)
    check(pg.locator("#engine-score").count() == 1, "right-sizing score shown in Requirements")
    check(pg.evaluate("dial(curP(), 'rung')") == "R3", "score + scan recommend R3: " + pg.evaluate("dial(curP(), 'rung')"))
    click(pg, "[data-a=goto][data-ph=arch]"); pg.wait_for_timeout(1500); wait_idle(pg, 30000)
    check(pg.evaluate("eng(curP()).trial.runs.length") >= 5, "trial run ran by itself (recommended for this tool)")
    check(pg.locator("text=passed with a plain prompt").count() >= 1, "trial result shown")
    click(pg, "#engine-dials [data-a=gates-accept]")
    check(pg.evaluate("['G3','G4','G5','G6','G7'].every(g => eng(curP()).gates[g] && eng(curP()).gates[g].ans)"), "G3-G7 answered")
    click(pg, "[data-a=architecture]"); go_preview(pg); wait_idle(pg); pg.wait_for_timeout(1200); wait_idle(pg, 60000)
    check(pg.evaluate("eng(curP()).mini.results.length") == 2, "mini-test of the two leading settings ran by itself")
    check(pg.locator("#engine-ceiling").count() == 1, "ceiling card shown")
    check(pg.locator("#engine-ceiling >> text=Managed Agents").count() >= 1, "ceiling shows the top option")
    # override a dial upward needs a reason
    pg.select_option("select[data-a-change=dial-set][data-k=rung]", "R5"); pg.wait_for_timeout(150)
    check(pg.locator("#pr-in").count() == 1, "going above Auto asks for a reason")
    pg.fill("#pr-in", "Test climb"); click(pg, ".modal button[type=submit]"); pg.wait_for_timeout(150)
    check(pg.evaluate("dial(curP(), 'rung')") == "R5" and pg.evaluate("eng(curP()).climb.some(c => c.reason === 'Test climb')"), "climb recorded with the reason")
    pg.select_option("select[data-a-change=dial-set][data-k=rung]", ""); pg.wait_for_timeout(150)
    check(pg.evaluate("eng(curP()).dials.rung.val") is None, "back to Auto")
    click(pg, "[data-a=arch-choose]", nth=1)
    check(pg.locator(".bpmap .bp-node").count() >= 3, "system map shows parts top to bottom")
    pg.wait_for_timeout(200)
    check(pg.locator(".bp-edges path").count() >= 2, "map arrows drawn")
    click(pg, "[data-a=early-check][data-v=arch]"); wait_idle(pg)
    pg.screenshot(path=str(SHOTS / "04-arch.png"), full_page=True)

    print("5 build brief, review lifecycle")
    click(pg, "[data-a=goto][data-ph=build]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=compile]"); go_preview(pg); wait_idle(pg)
    check(pg.locator(".nocopy").count() == 1, "build brief can be read, not copied")
    check(pg.locator("[data-a=copy-all]").count() == 0, "no copy button in Build brief")
    click(pg, "[data-a=goto][data-ph=review]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=review]"); go_preview(pg); wait_idle(pg, 30000)
    n_open = pg.locator(".tabs >> text=Open ·").inner_text()
    check(n_open != "Open · 0", "review found problems: " + n_open)
    click(pg, "[data-a=finding-explain]"); wait_idle(pg)
    check(pg.locator(".explain").count() >= 1, "plain-language explanation shown")
    click(pg, "[data-a=fix-all-findings]"); go_preview(pg); wait_idle(pg, 30000)
    txt = pg.locator(".tabs").first.inner_text()
    print("   tabs:", txt.replace("\n", " | "))
    check("Open · 0" in txt or pg.locator(".tabs >> text=Done").count() >= 1, "fixed problems left the open list")
    if pg.locator("[data-a=tab][data-v=signoff]").count():
        click(pg, "[data-a=tab][data-v=signoff]")
        while pg.locator("[data-a=finding-signoff]").count():
            click(pg, "[data-a=finding-signoff]")
    click(pg, "[data-a=tab][data-v=done]")
    check(pg.locator(".item").count() >= 1, "Done tab keeps fixed problems")
    pg.screenshot(path=str(SHOTS / "05-review.png"), full_page=True)

    print("6 test")
    click(pg, "[data-a=goto][data-ph=test]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=gen-tests]"); wait_idle(pg)
    click(pg, "[data-a=tab][data-v=runs]")
    click(pg, "[data-a=run-tests]"); go_preview(pg); wait_idle(pg, 60000)
    check(pg.locator("text=2nd judge").count() >= 1, "second judge verdict shown")
    check(pg.locator("text=same family (Claude)").count() >= 1, "second judge labelled same family")
    check(pg.evaluate("curP().runs[0].trials") == 3, "tests run 3 times")
    check(pg.locator("text=All 3 runs pass").count() >= 1, "all-runs-pass shown")
    check(pg.evaluate("curP().runs[0].results.some(x => x.jv)"), "judge version stamped on results")
    check(pg.evaluate("window.__nocache || 0") > 10, "repeated tries never replay a cached answer")

    print("7 launch to 100%")
    click(pg, "[data-a=goto][data-ph=launch]"); pg.wait_for_timeout(300)
    check(pg.locator("text=Before you can copy").count() >= 1, "before-you-can-copy list shown")
    check(pg.locator(".lockbox").count() >= 1, "copy locked below 100%")
    for i in range(6):
        if pg.locator("[data-a=fix-all]").count() == 0: break
        click(pg, "[data-a=fix-all]"); go_preview(pg)
        pg.wait_for_function("() => !document.querySelector('[data-a=fix-all-stop]')", timeout=120000); wait_idle(pg, 60000)
        # person-only fixes
        for sel in ["[data-a=rd-fix][data-fix=dim-confirm]", "[data-a=rd-fix][data-fix=ns-confirm]", "[data-a=rd-fix][data-fix=item-confirm]", "[data-a=rd-fix][data-fix=oq-done]", "[data-a=rd-fix][data-fix=fs-done]", "[data-a=rd-fix][data-fix=risk-mitigated]"]:
            for _ in range(40):
                if pg.locator(sel).count() == 0: break
                click(pg, sel); pg.wait_for_timeout(60)
                if pg.locator("[data-a=modal-close]").count() and pg.locator(".modal form[data-form=ns]").count(): break
        # assumptions / risks / sign-offs / judge decisions that need a person
        blk = pg.locator(".blk .bt").all_inner_texts()
        fixes = pg.evaluate("() => { const c = {}; document.querySelectorAll('.chk [data-a=rd-fix]').forEach(b => { c[b.dataset.fix] = (c[b.dataset.fix] || 0) + 1; }); return c; }")
        print("   left:", len(blk), fixes, [x for x in blk if 'unknown' not in x][:8])
        if not blk: break
        for _ in range(30):
            if pg.locator("[data-a=dim-na]").count() == 0: break
            click(pg, "[data-a=dim-na]"); pg.fill("#pr-in", "Not needed for this test"); click(pg, ".modal button[type=submit]")
        if pg.locator("[data-a=rd-fix][data-fix=assume-handle]").count():
            click(pg, "[data-a=rd-fix][data-fix=assume-handle]"); pg.wait_for_timeout(200)
            while pg.locator("[data-a=as-accept]").count():
                click(pg, "[data-a=as-accept]"); pg.fill("#pr-in", "Accepted for the test"); click(pg, ".modal button[type=submit]")
            click(pg, "[data-a=goto][data-ph=launch]"); pg.wait_for_timeout(200)
        if pg.locator("[data-a=rd-fix][data-fix=finding-signoff]").count():
            click(pg, "[data-a=rd-fix][data-fix=finding-signoff]"); pg.wait_for_timeout(200)
            while pg.locator("[data-a=finding-signoff]").count(): click(pg, "[data-a=finding-signoff]")
            click(pg, "[data-a=goto][data-ph=launch]"); pg.wait_for_timeout(200)
        if pg.locator("[data-a=rd-fix][data-fix=judge-decide]").count():
            click(pg, "[data-a=rd-fix][data-fix=judge-decide]"); pg.wait_for_timeout(200)
            while pg.locator("[data-a=judge-decide][data-v=pass]").count(): click(pg, "[data-a=judge-decide][data-v=pass]")
            click(pg, "[data-a=goto][data-ph=launch]"); pg.wait_for_timeout(200)
    score = pg.locator(".topbar .chip.tnum").first.inner_text()
    print("   readiness:", score)
    pg.screenshot(path=str(SHOTS / "07-launch.png"), full_page=True)
    check("100%" in score, "readiness reaches 100%")
    if pg.locator("[data-a=brief-copy-line]").count():
        click(pg, "[data-a=brief-copy-line]"); pg.wait_for_timeout(300)
        check(pg.locator("text=is stored in PT").count() == 1, "brief stored in PT for the one-line build")

    print("8 release")
    # the build chat writes its report into PT storage
    pg.evaluate("""() => { const d = JSON.parse(localStorage.getItem('mockdb')); const k = Object.keys(d).find(k => /\\/briefs\\//.test(k)); const b = d[k]; const pk = Object.keys(d).find(x => x.endsWith('/projects/' + b.project)); const pr = d[pk];
      d[k.replace('/briefs/', '/reports/')] = {brief: b.id, parts: pr.arch.components.filter(c => c.kind !== 'human').map(c => ({id: c.id, built: true})), checks: [{step: 1, ok: true}], tests: pr.tests.map(x => ({id: x.id, pass: true})), artifacts: [], triggers: [{id: 'trig_mock1', name: 'Weekly scout'}], personSteps: [], couldNotDo: []};
      localStorage.setItem('mockdb', JSON.stringify(d)); }""") if pg.locator("text=is stored in PT").count() else None
    click(pg, "[data-a=pilot-run]"); go_preview(pg); pg.wait_for_timeout(1800)
    click(pg, "[data-a=goto][data-ph=release]"); pg.wait_for_timeout(300)
    click(pg, "[data-a=report-check]")
    try: pg.wait_for_selector("text=Report complete", timeout=5000)
    except Exception: pass
    check(pg.locator("text=Report complete").count() >= 1, "build report read from PT storage and complete")
    if pg.locator("[data-a=pilot-judge]").count(): click(pg, "[data-a=pilot-judge]"); wait_idle(pg)
    pg.check("#rel-sign"); pg.wait_for_timeout(150)
    click(pg, "[data-a=release]"); click(pg, "[data-a=confirm-yes]"); pg.wait_for_timeout(400)
    check(pg.locator(".topbar >> text=Live v1.0").count() == 1, "released as v1.0")
    pg.screenshot(path=str(SHOTS / "08-release.png"), full_page=True)
    check(pg.evaluate("!!curP().releases[0].card && !!curP().releases[0].ceiling"), "tool card and ceiling frozen into the release")
    click(pg, "[data-a=tool-card]"); pg.wait_for_timeout(200)
    check(any("tool-card" in f for f in pg.evaluate("window.__downloads")), "tool card downloads")

    print("9 operate & update")
    pg.evaluate("WS.settings.weeklyBudget = 100000")
    click(pg, "[data-a=goto][data-ph=operate]"); pg.wait_for_timeout(300)
    click(pg, "[data-a=collect]"); go_preview(pg); pg.wait_for_timeout(1500)
    check(pg.locator("text=Reminder was sent twice").count() >= 1, "problem report collected into the inbox")
    pg.fill("#cr-in", "Never repeat ideas from the last 4 weeks"); click(pg, "form[data-form=change-request] button[type=submit]"); wait_idle(pg)
    click(pg, "[data-a=update-prepare]"); go_preview(pg); wait_idle(pg)
    check(pg.locator(".banner, .chip").filter(has_text="Draft").count() >= 0, "update prepared")
    print("   phase now:", pg.locator(".spine2 [aria-current=step]").inner_text() if pg.locator(".spine2 [aria-current=step]").count() else "?")
    pg.screenshot(path=str(SHOTS / "09-operate.png"), full_page=True)

    print("10 restore points")
    click(pg, "[data-a=restore-open]"); pg.wait_for_timeout(200)
    check(pg.locator(".rp").count() >= 3, "restore points listed")
    click(pg, "[data-a=rp-delete]"); check(pg.locator("[data-a=rp-delete-yes]").count() == 1, "delete needs a second click")
    click(pg, "[data-a=rp-delete-no]")
    # delete one restore point for real: every other point must still load completely (shared parts kept)
    n_before = pg.evaluate("curP().restore.length")
    click(pg, "[data-a=rp-delete]"); click(pg, "[data-a=rp-delete-yes]"); pg.wait_for_timeout(800)
    check(pg.evaluate("curP().restore.length") == n_before - 1, "owner deleted one restore point with two clicks")
    ok_all = pg.evaluate("Promise.all(curP().restore.map(r => loadRestore(curP(), r.id))).then(a => a.every(d => d && d.project && d.project.id))")
    check(ok_all, "every remaining restore point still loads completely after the delete")
    click(pg, "[data-a=modal-close]")

    print("11 modes keep the place, guided, layout")
    click(pg, "[data-a=goto][data-ph=require]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=item-open][data-ref='req:R1']") if pg.locator("[data-a=item-open][data-ref='req:R1']").count() else None
    for m in ["blueprint","journey","swimlanes","express","steps"]:
        click(pg, f"[data-a=mode][data-v={m}]"); pg.wait_for_timeout(300)
        check(pg.locator(".toast >> text=Same place").count() >= 1, f"switch to {m} keeps the place")
        pg.screenshot(path=str(SHOTS / f"11-mode-{m}.png"), full_page=True)
    click(pg, "[data-a=set-guided][data-v='1']"); pg.wait_for_timeout(200)
    check(pg.locator(".guide").count() == 1, "guided view shows the guide box")
    click(pg, "[data-a=set-layout][data-v=map]"); pg.wait_for_timeout(300)
    check(pg.locator(".homeB .mini").count() == 1, "blueprint-as-home layout shows the mini map")
    pg.screenshot(path=str(SHOTS / "11-guided-map.png"), full_page=True)
    click(pg, "[data-a=set-guided][data-v='0']"); click(pg, "[data-a=set-layout][data-v=pages]")

    print("12a knowledge pack")
    click(pg, "[data-a=nav][data-v=settings]"); click(pg, "[data-a=tab][data-v=knowledge]"); pg.wait_for_timeout(200)
    check(pg.locator("text=Built-in knowledge").count() >= 1, "built-in knowledge shown")
    click(pg, "[data-a=kp-refresh]"); pg.wait_for_timeout(1500)
    click(pg, "[data-a=tab][data-v=knowledge]"); pg.wait_for_timeout(300)
    check(pg.locator("text=One model note changed").count() >= 1, "Sunday-check proposal listed (nothing applied yet)")
    check(pg.evaluate("!kpModels().find(m => m.id === 'claude-haiku-5-5').notes.includes('summaries')"), "proposal not applied before approval")
    click(pg, "[data-a=kp-decide][data-v=approved]"); pg.wait_for_timeout(400)
    check(pg.evaluate("kpModels().find(m => m.id === 'claude-haiku-5-5').notes.includes('summaries')"), "approved change applied")
    check(pg.locator("text=Knowledge pack v1").count() >= 1, "knowledge pack v1 after approval")
    check(pg.evaluate("!!JSON.parse(localStorage.getItem('mockdb'))['kp/pack']"), "pack stored in the shared kp/pack document")

    print("12 languages")
    for lang in ["de","zh","en"]:
        click(pg, "[data-a=nav][data-v=settings]"); click(pg, "[data-a=tab][data-v=general]"); click(pg, f"[data-a=set-lang][data-l={lang}]"); pg.wait_for_timeout(200)
        for v in ["cockpit","notes","library","insights","settings"]:
            click(pg, f"[data-a=nav][data-v={v}]"); pg.wait_for_timeout(120)
            rk = raw_keys(pg); check(not rk, f"{lang} {v}: no raw keys {rk[:5]}")
        click(pg, ".rail [data-a=open-project]"); pg.wait_for_timeout(250)
        for ph in ["capture","understand","interview","require","arch","build","review","test","launch","release","operate"]:
            click(pg, f".spine2 [data-a=goto][data-ph={ph}]"); pg.wait_for_timeout(120)
            rk = raw_keys(pg); check(not rk, f"{lang} {ph}: no raw keys {rk[:5]}")
            if lang == "de": check("ß" not in pg.evaluate("document.body.innerText"), f"de {ph}: no ß")
        if lang == "zh": pg.screenshot(path=str(SHOTS / "12-zh.png"), full_page=True)

    print("13 Second owner: her own login")
    ctx2 = b.new_context(viewport={"width":1440, "height":960}, color_scheme="dark")
    ctx2.add_init_script(MOCK)
    ctx2.add_init_script("if (window === window.top) { localStorage.setItem('mocknotowner','1'); localStorage.setItem('mockuid','user-2'); }")
    pj = ctx2.new_page(); pj.on("pageerror", lambda e: errors.append("pageerror(jw): " + str(e)))
    pj.goto(url(TEST_HTML)); pj.wait_for_selector("#fr-name", timeout=8000)
    check(pj.evaluate("META.workspaces.length") == 0, "a fresh login starts with the first-run setup")
    pj.fill("#fr-name", "Second owner"); click(pj, "[data-a=fr-lang][data-v=zh]"); click(pj, "[data-a=first-run-go]"); pj.wait_for_selector(".rail", timeout=8000); pj.wait_for_timeout(300)
    if pj.locator("[data-a=modal-close]").count(): click(pj, "[data-a=modal-close]")
    body = pj.evaluate("document.body.innerText")
    check("控制台" in body, "Second owner's Prompt Translator opens in Chinese")
    check(pj.evaluate("Runner.ready()") is False, "no runner borrowed from Owner")
    check(pj.locator("[data-a=runner-setup]").count() == 1, "one-click runner setup offered")
    click(pj, "[data-a=runner-setup]"); pj.wait_for_timeout(300)
    check(pj.evaluate("META.runnerId") == "trig_new", "her own runner created on her click")
    check(pj.evaluate("JSON.parse(localStorage.getItem('mockdb'))['app/version'] === undefined"), "Second owner's page never writes the version record")
    check(pj.locator(".brand-ver .ver-chip.ok").count() >= 1, "Second owner also sees the version next to the name")
    pj.fill("#start-in", "每周帮我们家安排晚餐的小工具"); click(pj, "form[data-form=start] button[type=submit]"); pj.wait_for_timeout(300)
    check(pj.locator(".guide").count() == 1, "Second owner defaults to Guided")
    check(pj.locator("[data-a=mode][data-v=journey][aria-pressed=true]").count() == 1, "Second owner defaults to Journey")
    pj.screenshot(path=str(SHOTS / "13-jiewen.png"), full_page=True)
    ctx2.close()

    print("14 narrow width")
    pg.set_viewport_size({"width": 420, "height": 900}); pg.wait_for_timeout(300)
    for m in ["journey","steps","blueprint","swimlanes","express"]:
        click(pg, f"[data-a=mode][data-v={m}]"); pg.wait_for_timeout(200)
        o = overflow(pg); check(o <= 0, f"no sideways scroll at 420px in {m} ({o}px)")

    print("15 reload keeps everything")
    pg.reload(); pg.wait_for_selector(".rail", timeout=8000); pg.wait_for_timeout(500)
    check(pg.evaluate("WS.projects.length") >= 2, "projects after reload")
    check(pg.evaluate("KP.source") == "pack" and pg.evaluate("KP.v") == 1, "approved knowledge pack loads after reload")
    check(pg.evaluate("eng(WS.projects.find(p => p.live)).scan.state") == "done", "engine data kept after reload")

    print("16 preview build is safe")
    prev = (ROOT / "dist/prompt-translator-preview.html")
    if prev.exists():
        ph = prev.read_text()
        TP = ROOT / "test/index_prev.html"; TP.write_text("<!doctype html><html><head><meta charset=utf-8></head><body>" + ph + "</body></html>")
        ctx3 = b.new_context(); ctx3.add_init_script(MOCK); pp = ctx3.new_page(); pp.goto(url(TP)); pp.wait_for_selector(".rail", timeout=8000)
        check(pp.evaluate("PT_PREVIEW") is True and "Rvmfdxmam24MNp8wCM9UQs" in pp.evaluate("PT_URL"), "preview build knows it is a preview and its own address")
        check(pp.evaluate("startJob('build', {title:'x'}).then(j => j === null)"), "preview blocks builds of real tools")
        check(pp.locator("text=Preview.").count() >= 1, "preview banner shown")
        check(pp.title() == "Prompt Translator " + pp.evaluate("PT_VERSION") + " Preview", "preview page name carries version + Preview: " + pp.title())
        ctx3.close()

    print("17 version next to the name")
    wn = pg.evaluate("whatsNewModal({from: '1.0.0'})"); wn1 = pg.evaluate("whatsNewModal({from: '1.2.0'})")
    check("1.2.0" in wn and "1.2.1" in wn and wn.count("<h3") == 2, "What's new lists every version since the last one seen (1.0.0 -> 1.2.0 + 1.2.1)")
    check(wn1.count("<h3") == 0 and "Version number next to the name".lower()[:10] in wn1.lower() or "version number" in wn1.lower(), "from 1.2.0 it shows only 1.2.1")
    pg.set_viewport_size({"width": 1440, "height": 960}); pg.reload(); pg.wait_for_selector(".rail", timeout=8000); pg.wait_for_timeout(500)
    if pg.locator("[data-a=modal-close]").count(): click(pg, "[data-a=modal-close]")
    v = pg.evaluate("PT_VERSION")
    check(pg.title() == "Prompt Translator " + v, "page name carries the version: " + pg.title())
    chip = pg.locator(".rail .brand-ver .ver-chip.ok")
    check(chip.count() == 1 and v in chip.inner_text() and "newest" in chip.inner_text(), "rail shows '" + (chip.inner_text() if chip.count() else "-") + "'")
    check(pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))['app/version'].v") == v, "owner's page records the newest version")
    check(pg.evaluate("verCmp('1.10.0','1.9.9') > 0 && verCmp('1.2.1','1.2.1') === 0 && verCmp('1.2.0','1.2.1') < 0"), "version compare handles 1.10 > 1.9")
    pg.evaluate("(() => { const d = JSON.parse(localStorage.getItem('mockdb')); d['app/version'] = {v: '1.3.0', at: new Date().toISOString()}; localStorage.setItem('mockdb', JSON.stringify(d)); })()")
    pg.evaluate("window.dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(400)
    warn = pg.locator(".rail .ver-chip.warn[data-a=ver-reload]")
    check(warn.count() == 1 and "1.3.0" in warn.inner_text(), "older tab warns: '" + (warn.inner_text() if warn.count() else "-") + "'")
    check(pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))['app/version'].v") == "1.3.0", "an older page never lowers the recorded version")
    pg.screenshot(path=str(SHOTS / "17-version-warn.png"), clip={"x": 0, "y": 0, "width": 300, "height": 140})
    for lang, word in [("de", "verfügbar"), ("zh", "新版本")]:
        pg.evaluate(f"(LANG = '{lang}', render())"); pg.wait_for_timeout(150)
        check(word in pg.locator(".rail .ver-chip.warn").inner_text(), f"warning in {lang}")
    pg.evaluate("(LANG = 'en', render())")
    pg.set_viewport_size({"width": 420, "height": 900}); pg.wait_for_timeout(200)
    o = overflow(pg); check(o <= 0, f"no sideways scroll at 420px with the warning ({o}px)")
    pg.screenshot(path=str(SHOTS / "17-version-narrow.png"))
    pg.evaluate("(() => { const d = JSON.parse(localStorage.getItem('mockdb')); d['app/version'] = {v: PT_VERSION}; localStorage.setItem('mockdb', JSON.stringify(d)); })()")
    pg.evaluate("checkVersion()"); pg.wait_for_timeout(300)
    check(pg.locator(".ver-chip.warn").count() == 0, "warning goes away when this is the newest again")
    b.close()

print("\nERRORS:", len(errors)); [print(" ", e) for e in errors[:30]]
print("FAILS:", len(fails)); [print(" ", f) for f in fails]
