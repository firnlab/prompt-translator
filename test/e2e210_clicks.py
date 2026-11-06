"""2.1.0 (J13): the cancel, retry and delete actions of 2.0, each clicked on screen on the made-up 2.0 bundle (test/fixtures/synthetic20.json),
each with a visible effect: h20-cancel (PT's hands plan), m20-cancel (the map's cost confirm), facts-drop (the proposals of "Find rules"),
facts-back (a rule taken back is used again), pt20-del (a prompt-test input), c20-retry (the chat's Try again), g20-skip (go to the
map with the goal card open), g20-drop (a proposed goal change is dropped).
Run: python3 test/e2e210_clicks.py [test/fixtures/synthetic20.json]
Checks listed in test/expected_red.json are red on purpose until the PLAN-2.1 item named there lands (see e2e210_platform.py)."""
import json, sys, pathlib, re
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
BK = ARGS[0] if ARGS else "test/fixtures/synthetic20.json"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
RED = json.loads((ROOT / "test/expected_red.json").read_text())["red"]
SUITE = "test/e2e210_clicks.py"
reds = []
def check(cid, name, cond, info=""):
    r = RED.get(cid) if RED.get(cid, {}).get("suite") == SUITE else None
    if r:
        if cond:
            fails.append(f"{cid} {name}  → now green: take it off test/expected_red.json (PLAN-2.1 {r['item']})")
            print(f"FLIP  {cid} {name}  → now green: take it off test/expected_red.json (PLAN-2.1 {r['item']})", flush=True)
        else:
            reds.append(cid); print(f"red   {cid} {name}  (expected, until PLAN-2.1 {r['item']}) → {str(info)[:300]}", flush=True)
        return
    (oks if cond else fails).append(cid + " " + name + ("" if cond else "  → " + str(info)[:400]))
    print(("ok    " if cond else "FAIL  ") + cid + " " + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=40000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0 && !(typeof M20RUN !== 'undefined' && M20RUN.total)"):
            pg.wait_for_timeout(350)
            if ev(pg, "AI.running.size === 0 && !(typeof M20RUN !== 'undefined' && M20RUN.total)"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def click(pg, sel): pg.locator(sel).first.click(); pg.wait_for_timeout(250)
def has(pg, sel): return ev(pg, "(s) => !!document.querySelector(s)", sel)
def calls(pg): return ev(pg, "(window.__sampleLog || []).length")
def open_p(pg, pid): ev(pg, "(id) => { openProject(id); UI.home = false; UI.factsView = null; face20Set(curP(), 'pick'); render(); }", pid); pg.wait_for_timeout(300)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx)
    ev(pg, "(() => { Store.isOwner = true; })()")
    P = ev(pg, "WS.projects.filter(p => p.status !== 'archived' && p.m200).map(p => ({id: p.id, map: m20Read(p).routes.length, chosen: !!m20Chosen(p)}))")
    check("K0", "the made-up 2.0 bundle has moved projects with a map (one with a chosen route)", len(P) >= 2 and all(x["map"] for x in P) and any(x["chosen"] for x in P), P)
    pid = next((x["id"] for x in P if not x["chosen"]), P[0]["id"])

    # h20-cancel: a plan for PT's hands is shown; Cancel closes it, nothing runs
    open_p(pg, pid)
    ev(pg, "(() => { window.__mcp.length = 0; H20.plan = Object.assign(h20Vet(curP(), {what: 'Fill the download form', url: 'https://example.org/download', steps: [{do: 'click', target: 'Next'}], final: 'Send'}, 'w'), {pid: curP().id}); UI.pg = null; ACTIONS['h20-open'](); })()"); pg.wait_for_timeout(300)
    before = has(pg, "[data-a=h20-run]") and has(pg, "[data-a=h20-cancel]")
    click(pg, "[data-a=h20-cancel]")
    check("K.h20-cancel", "PT's hands: Cancel closes the plan (no Run button left), nothing is sent to the browser", before and not has(pg, "[data-a=h20-run]") and ev(pg, "H20.plan === null") and not ev(pg, "window.__mcp.length"), [before, ev(pg, "H20.plan === null"), ev(pg, "window.__mcp.length")])

    # m20-cancel: the map's cost confirm; Cancel takes it away, no call
    open_p(pg, pid); ev(pg, "m20Open(curP(), 'map')"); pg.wait_for_timeout(300)
    n0 = calls(pg)
    click(pg, "[data-a=m20-ask]")
    shown = has(pg, ".m20-confirm") and has(pg, "[data-a=m20-cancel]")
    click(pg, "[data-a=m20-cancel]"); pg.wait_for_timeout(400)
    check("K.m20-cancel", "the map: Cancel on the cost line takes it away and nothing runs", shown and not has(pg, ".m20-confirm") and calls(pg) == n0, [shown, has(pg, ".m20-confirm"), calls(pg) - n0])

    # facts-drop: the proposals of "Find rules"; Drop them takes them all away, nothing is added
    open_p(pg, pid); ev(pg, "(() => { const p = curP(); p.northStar.constraints = 'Must work without a login. The price must stay under CHF 5 a month.'; touch(p); factsOpen(p); })()"); pg.wait_for_timeout(300)
    click(pg, "[data-a=facts-find]"); wait_ai(pg)
    n_props, n_entries = ev(pg, "factsRead(curP()).props.length"), ev(pg, "factsRead(curP()).entries.length")
    shown = has(pg, ".facts-props [data-a=facts-drop]")
    click(pg, "[data-a=facts-drop]")
    check("K.facts-drop", "the facts book: Drop the proposals removes them from the screen; no entry is added", n_props >= 1 and shown and not ev(pg, "factsRead(curP()).props.length") and not has(pg, ".facts-props") and ev(pg, "factsRead(curP()).entries.length") == n_entries, [n_props, shown, ev(pg, "factsRead(curP()).props.length"), n_entries])

    # facts-back: a rule taken back (in the made-up data) is used again
    off = ev(pg, "(factsRead(curP()).entries.find(e => e.status === 'withdrawn') || {}).id || ''")
    sel = f"[data-a=facts-back][data-id='{off}']"
    if has(pg, ".facts-old:not([open]) > summary"): click(pg, ".facts-old > summary")   # the taken-back rules sit in their own fold, opened as a person would
    shown = bool(off) and has(pg, sel)
    if shown: click(pg, sel)
    check("K.facts-back", "the facts book: Use again makes the taken-back rule active, its button goes away and it counts as a rule again",
          shown and ev(pg, "(id) => factById(curP(), id).status", off) == "active" and not has(pg, sel) and ev(pg, "(id) => factsActive(curP(), FACT_RULES).some(e => e.id === id)", off), [off, shown])

    # pt20-del: an input of the prompt tests is removed
    ev(pg, "(() => { const X = pt20Of(curP()); X.inputs = []; touch(curP()); factsOpen(curP()); })()"); pg.wait_for_timeout(250)
    if has(pg, "#pt20-in"):
        ev(pg, "(() => { document.getElementById('pt20-in').value = 'Add milk to the list'; })()"); click(pg, "form[data-form=pt20-add] button[type=submit]")
    sel = "[data-a=pt20-del][data-v='Add milk to the list']"
    shown = has(pg, sel)
    if shown: click(pg, sel)
    check("K.pt20-del", "prompt tests: × removes your input from the list and from the screen", shown and "Add milk to the list" not in ev(pg, "pt20Read(curP()).inputs || []") and not has(pg, sel), [shown, ev(pg, "pt20Read(curP()).inputs")])

    # c20-retry: the chat's Try again after a failed answer
    open_p(pg, pid); ev(pg, "(() => { face20Set(curP(), 'chat'); render(); window.__mockSampleFailOn = 'chat20'; window.__mockSampleFail = {code: 'upstream_error', n: 1}; window.__sampleLog = []; })()"); pg.wait_for_timeout(250)
    MSG = "Grandpa reads the list on paper."
    pg.fill("#c20-in", MSG); click(pg, "form[data-form=c20-say] button[type=submit]"); wait_ai(pg)
    failed = ev(pg, "!!(c20Read(curP()).msgs.slice(-1)[0] || {}).fail") and has(pg, ".c20-log [data-a=c20-retry]")
    pg.locator(".c20-log [data-a=c20-retry]").last.click(); wait_ai(pg)
    last = ev(pg, "c20Read(curP()).msgs.slice(-1)[0] || {}")
    ans = ev(pg, "[...document.querySelectorAll('.c20-log .c20-m.pt')].slice(-1).map(m => m.innerText)[0] || ''")
    check("K.c20-retry", "the chat: Try again after a failed answer gets the answer on screen", failed and last.get("by") == "pt" and not last.get("fail") and "Noted." in ans, [failed, last.get("text", "")[:80]])
    you = ev(pg, "(m) => c20Read(curP()).msgs.filter(x => x.by === 'you' && x.text === m).length", MSG)
    check("K.c20-retry.once", "…and your message is shown once, not twice", you == 1, you)
    ev(pg, "(() => { window.__mockSampleFail = null; window.__mockSampleFailOn = null; face20Set(curP(), 'pick'); })()")

    # g20-skip: a new project with an open goal card; "go to the map anyway" opens the map and the button is gone
    ev(pg, "(() => { const p = blankProject('Skip probe'); p.autoInterview = false; WS.projects.push(p); touch(p); openProject(p.id); m20Open(p, 'goal'); })()"); pg.wait_for_timeout(300)
    shown = has(pg, "[data-a=g20-skip]")
    if shown: click(pg, "[data-a=g20-skip]")
    check("K.g20-skip", "the goal card: Skip for now goes to the map (the skip is kept, its button gone)", shown and ev(pg, "goal20Read(curP()).skip === true") and ev(pg, "(m20UI(curP()) || {}).v") == "map" and not has(pg, "[data-a=g20-skip]"), [shown, ev(pg, "goal20Read(curP()).skip"), ev(pg, "(m20UI(curP()) || {}).v")])

    # g20-drop: a goal change on a project with a map is first shown with its effect; Keep the goal drops it
    open_p(pg, pid); ev(pg, "m20Open(curP(), 'goal')"); pg.wait_for_timeout(250)
    g0 = ev(pg, "JSON.stringify(goal20Read(curP()).f)")
    ev(pg, "goal20Propose(curP(), {success: 'Everyone sees a new item within a minute'})"); wait_ai(pg)
    shown = has(pg, ".m20-gdiff [data-a=g20-drop]")
    if shown: click(pg, ".m20-gdiff [data-a=g20-drop]")
    check("K.g20-drop", "the goal card: dropping a proposed change takes the comparison away and leaves the goal as it was", shown and ev(pg, "!goal20Read(curP()).pend") and not has(pg, ".m20-gdiff") and ev(pg, "JSON.stringify(goal20Read(curP()).f)") == g0, [shown, ev(pg, "goal20Read(curP()).pend")])

    check("errors", "no page errors", not errors, errors[:5])
    b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "expected red:", len(reds), "page errors:", len(errors))
if reds: print("expected red (test/expected_red.json):", ", ".join(f"{c} ({RED[c]['item']})" for c in reds))
sys.exit(1 if fails or errors else 0)
