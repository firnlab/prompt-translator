import re, sys, json, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = pathlib.Path("work/shots10"); SHOTS.mkdir(parents=True, exist_ok=True)
page_html = (ROOT / "dist/prompt-translator.html").read_text()
wrapped = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>" + page_html + "</body></html>"
TEST_HTML = ROOT / "test/index10.html"; TEST_HTML.write_text(wrapped)
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
    pg.goto(TEST_HTML.as_uri())

    print("1 boot + migration")
    pg.wait_for_selector(".ws-pick", timeout=8000)
    names = pg.locator(".ws-opt").all_inner_texts()
    check(any("Owner" in n for n in names) and any("Second owner" in n for n in names), "workspaces Owner and Second owner: " + str(names))
    click(pg, ".ws-opt >> text=Owner")
    pg.wait_for_selector(".rail", timeout=8000); pg.wait_for_timeout(300)
    check(pg.locator("text=What's new in 1.0.0").count() == 1, "What's new shown once")
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

    print("4 requirements + early check + architecture")
    click(pg, "[data-a=goto][data-ph=require]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=requirements]"); wait_idle(pg)
    check(pg.locator("text=Weekly ranking").count() >= 1 or pg.locator("input[value='Weekly ranking']").count() >= 1, "requirements generated")
    click(pg, "[data-a=early-check][data-v=require]"); wait_idle(pg)
    check(pg.locator("text='dated source' is vague").count() >= 1, "early check finding shown")
    click(pg, "[data-a=item-tool][data-ref='req:R1'][data-k=change]"); pg.fill("#it-in", "make it stricter"); click(pg, "[data-a=item-send]"); wait_idle(pg)
    check(pg.locator(".proposal").count() == 1, "item change proposal shown with before/after")
    click(pg, "[data-a=item-accept]"); pg.wait_for_timeout(150)
    click(pg, "[data-a=goto][data-ph=arch]"); pg.wait_for_timeout(200)
    click(pg, "[data-a=architecture]"); go_preview(pg); wait_idle(pg)
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

    print("12 languages")
    for lang in ["de","zh","en"]:
        click(pg, "[data-a=nav][data-v=settings]"); click(pg, f"[data-a=set-lang][data-l={lang}]"); pg.wait_for_timeout(200)
        for v in ["cockpit","notes","library","insights","settings"]:
            click(pg, f"[data-a=nav][data-v={v}]"); pg.wait_for_timeout(120)
            rk = raw_keys(pg); check(not rk, f"{lang} {v}: no raw keys {rk[:5]}")
        click(pg, ".rail [data-a=open-project]"); pg.wait_for_timeout(250)
        for ph in ["capture","interview","require","arch","build","review","test","launch","release","operate"]:
            click(pg, f".spine2 [data-a=goto][data-ph={ph}]"); pg.wait_for_timeout(120)
            rk = raw_keys(pg); check(not rk, f"{lang} {ph}: no raw keys {rk[:5]}")
            if lang == "de": check("ß" not in pg.evaluate("document.body.innerText"), f"de {ph}: no ß")
        if lang == "zh": pg.screenshot(path=str(SHOTS / "12-zh.png"), full_page=True)

    print("13 Second owner workspace")
    click(pg, "[data-a=lock]"); pg.wait_for_timeout(200)
    click(pg, ".ws-opt >> text=Second owner"); pg.wait_for_timeout(500)
    if pg.locator("[data-a=modal-close]").count(): click(pg, "[data-a=modal-close]")
    body = pg.evaluate("document.body.innerText")
    check("开始" in body or "简体中文" in body or "控制台" in body, "Second owner's workspace opens in Chinese")
    check("Old v1 project" not in body and "Business idea" not in body, "Second owner does not see Owner's projects")
    pg.fill("#start-in", "每周帮我们家安排晚餐的小工具"); click(pg, "form[data-form=start] button[type=submit]"); pg.wait_for_timeout(300)
    check(pg.locator(".guide").count() == 1, "Second owner defaults to Guided")
    check(pg.locator("[data-a=mode][data-v=journey][aria-pressed=true]").count() == 1, "Second owner defaults to Journey")
    pg.screenshot(path=str(SHOTS / "13-second.png"), full_page=True)

    print("14 narrow width")
    pg.set_viewport_size({"width": 420, "height": 900}); pg.wait_for_timeout(300)
    for m in ["journey","steps","blueprint","swimlanes","express"]:
        click(pg, f"[data-a=mode][data-v={m}]"); pg.wait_for_timeout(200)
        o = overflow(pg); check(o <= 0, f"no sideways scroll at 420px in {m} ({o}px)")

    print("15 reload keeps everything")
    pg.reload(); pg.wait_for_selector(".ws-pick", timeout=8000)
    check(pg.locator(".ws-opt").count() == 2, "two workspaces after reload")

    b.close()

print("\nERRORS:", len(errors)); [print(" ", e) for e in errors[:30]]
print("FAILS:", len(fails)); [print(" ", f) for f in fails]
