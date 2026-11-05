"""2.0.0 Part D — PT's hands per project: the site list, the action contract, forms and non-final clicks, the final-button stop — on a COPY
of the real data (or the made-up bundle) with the mock runtime (its made-up desktop-app browser; never a real site).
Run: python3 test/e2e200_hands.py [work/backup-141 | test/fixtures/synthetic.json]
 D1 the project's hands page (More ⋯): what the hands do and never do; the sites of this project (add, refuse a non-site, no duplicate,
    remove, a receipt); github.com read only.
 D2 a plan first: the owner's words → one call writes the steps before any page opens (the prompt names the sites and the rules); the
    contract shows what / where / why / can it be undone / every step and whose it is; a site not on the list blocks Run (one tap adds
    it); nothing reaches the browser before Run.
 D3 Run: opens the page, types into the fields, chooses the option, clicks the ordinary button; stops one step before the final button
    ("Your click: Send"), points at it, never clicks it; Take me there opens the page at the button; the log keeps a line (no page text).
 D4 the final-button stop at plan time (a final word in a click ends the steps) and on the page (a button whose label is final where the
    plan had an ordinary one) in en/de/zh words; a click that leads off the list stops.
 D5 keys and passwords: a password / code field and a key-shaped value become the owner's typing at plan time; a field the page shows as
    a code field stops the run; the guard refuses a secret value.
 D6 the guard: an element not cleared the moment before, a click by coordinates, typing by key presses, another site, clicks on a site
    off the list (github.com included), another login — refused, and none of them reaches the browser.
 D7 the route card names the project's sites for a route that uses PT's hands.
 three languages (no raw keys, no ß), 390 px without sideways scroll, no page errors."""
import json, sys, pathlib, re
# 2.1 (J5): --only A3[,A5] runs the suite from its start through the last part named and stops there (each part builds on the
# parts before it, so the earlier ones run as its setup); the planted-bug run (check_the_pick.py) uses it to run less per bug
ONLY = set()
for _i, _a in enumerate(sys.argv):
    if _a == "--only" and _i + 1 < len(sys.argv): ONLY = set(sys.argv[_i + 1].split(","))
    elif _a.startswith("--only="): ONLY = set(_a.split("=", 1)[1].split(","))
ARGS = [a for a in sys.argv[1:] if not a.startswith("--") and not re.fullmatch(r"[A-Z0-9,]+", a)]
BK = ARGS[0] if ARGS else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
SEEN = []
def sec(title):   # 2.1 (J5): a part's heading; with --only, the run ends at the first part after the parts named
    part = title.split()[0]
    if ONLY and ONLY <= set(SEEN) and part not in ONLY:
        print(f"--only {','.join(sorted(ONLY))}: stopped before “{title}”", flush=True)
        try: (ROOT / "test" / PAGE).unlink()
        except Exception: pass
        print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors), flush=True)
        sys.exit(1 if fails or errors else 0)
    SEEN.append(part); print(title, flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def calls(pg): return [c for c in ev(pg, "window.__mcp || []") if c.get("server") == "host:claude_browser"]
def wait_idle(pg):
    for _ in range(120):
        if ev(pg, "!H20.busy && AI.running.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(200)
def view(pg): return ev(pg, "(document.querySelector('.h20-view') || {}).innerText || ''")
def contract(pg): return ev(pg, "(document.querySelector('.h20-contract') || {}).innerText || ''")
def raw_keys(text): return sorted(set(re.findall(r"\b(?:h20|mc20|pt20|su20|ipt20|met20)\.[a-z][a-z0-9.-]*\b", text)))
def reset(pg): ev(pg, "(() => { window.__mcp.length = 0; Object.assign(window.__browser, {fail: '', loadReads: 0, closed: false, filled: [], clickTo: {}}); H20.plan = null; H20.live = null; H20.busy = false; render(); })()")
def plan(pg, words="On example.org fill the download form"):
    ev(pg, f"(() => {{ const el = document.getElementById('h20-in'); el.value = {json.dumps(words)}; }})()")
    pg.locator("form[data-form=h20-plan] button[type=submit]").first.click(); wait_idle(pg)
def override(pg, js_obj): ev(pg, "(o) => { window.__mockOverride = (task) => task === 'hands-plan' ? JSON.parse(JSON.stringify(o)) : null; }", js_obj)
DL = "Download\n[textbox] First name\n[combobox] System\n[button] Next\n[button] Send"
NOW = "2026-11-04T09:00:00Z"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); ctx.clock.set_system_time(NOW)
    pg = open_page(ctx); pg.wait_for_timeout(600)
    ev(pg, "(() => { Store.isOwner = true; })()")
    pid = ev(pg, "WS.projects.filter(p => p.status !== 'archived')[0].id")
    ev(pg, f"(() => {{ openProject('{pid}'); UI.home = false; render(); }})()"); pg.wait_for_timeout(300)
    ev(pg, f"window.__browser.pages['https://example.org/download'] = {json.dumps(DL)}")
    db0 = ev(pg, "JSON.stringify(curP().hands20 || null)")

    # ---------- D0 typing is off in 2.0.0 (form_input is not granted from a cloud publish): the fields are the owner's ----------
    sec("D0 typing is off in 2.0.0 (form_input is not granted from a cloud publish): the fields are the owner's")
    P0 = ev(pg, """(() => h20Vet(curP(), {what: 'x', url: 'https://example.org/download', steps: [{do: 'click', target: 'Start'}, {do: 'type', target: 'First name', value: 'Alex'}, {do: 'click', target: 'Next'}, {do: 'choose', target: 'System', value: 'macOS'}], final: 'Send'}, 'w'))()""")
    check("D0 typing off: PT clicks up to the first field; that field and every later one are yours, no click after a field nobody filled", [s["target"] for s in P0["steps"]] == ["Start"] and P0["yours"] == ["First name", "System"] and P0.get("held") is True and P0["final"] == "Send", P0)
    g0 = ev(pg, "(async () => { try{ await h20Call(curP(), 'form_input', {ref: 'r', value: 'x'}); return 'ran'; }catch(e){ return e.code + ':' + (e.message || ''); } })()")
    check("D0 …and the guard refuses form_input while typing is off", g0 == "hands_guard:typing is off", g0)
    ev(pg, "(() => { H20.plan = Object.assign(h20Vet(curP(), {what: 'x', url: 'https://example.org/download', steps: [{do: 'type', target: 'First name', value: 'Alex'}], final: 'Send'}, 'w'), {pid: curP().id}); UI.pg = null; ACTIONS['h20-open'](); })()"); pg.wait_for_timeout(200)
    check("D0 …and the card says so", "Typing into forms is off in this version" in view(pg), view(pg)[-500:])
    ev(pg, "(() => { H20.plan = null; H20_TYPE = true; render(); })()")   # the typing code stays: everything below tests it switched on

    # ---------- D1 the page and the sites ----------
    sec("D1 the page and the sites")
    more = ev(pg, "MORE_ITEMS.some(x => x.a === 'h20-open')")
    ev(pg, "ACTIONS['h20-open']()"); pg.wait_for_timeout(200)
    v1 = view(pg)
    check("D1 More ⋯ has PT's hands; the page opens with what the hands do and never do", more and "PT's hands" in v1 and "Final buttons" in v1 and "keys and passwords always stay yours" in v1, v1[:400])
    check("D1 …the project's sites start empty, github.com read only", "No sites yet." in v1 and "github.com · read only" in v1, v1[:600])
    reset(pg)
    for bad in ("not a site", "http://", "a..b"):
        ev(pg, f"(() => {{ document.getElementById('h20-site-in').value = {json.dumps(bad)}; }})()"); pg.locator("form[data-form=h20-site-add] button[type=submit]").click(); pg.wait_for_timeout(120)
    check("D1 a text that is not a site name is refused", ev(pg, "h20Read(curP()).sites.length") == 0)
    ev(pg, "(() => { document.getElementById('h20-site-in').value = 'https://www.Example.org/download?x=1'; })()"); pg.locator("form[data-form=h20-site-add] button[type=submit]").click(); pg.wait_for_timeout(150)
    check("D1 a site is added in its plain form (scheme, www and path dropped) with a receipt", ev(pg, "h20Read(curP()).sites") == ["example.org"] and "Site added: example.org" in ev(pg, "document.body.innerText"), ev(pg, "h20Read(curP()).sites"))
    ev(pg, "(() => { document.getElementById('h20-site-in').value = 'example.org'; })()"); pg.locator("form[data-form=h20-site-add] button[type=submit]").click(); pg.wait_for_timeout(120)
    check("D1 …no duplicate", ev(pg, "h20Read(curP()).sites.length") == 1)
    ev(pg, "(() => { document.getElementById('h20-site-in').value = 'shop.example.net'; })()"); pg.locator("form[data-form=h20-site-add] button[type=submit]").click(); pg.wait_for_timeout(120)
    pg.locator("[data-a=h20-site-del][data-v='shop.example.net']").click(); pg.wait_for_timeout(150)
    check("D1 …a site is removed with one tap", ev(pg, "h20Read(curP()).sites") == ["example.org"])
    check("D1 …subdomains count, look-alikes do not", ev(pg, "[h20SiteOk(curP(), 'https://www.example.org/a'), h20SiteOk(curP(), 'https://dl.example.org/'), h20SiteOk(curP(), 'https://example.org.evil.test/'), h20SiteOk(curP(), 'http://example.org/'), h20SiteOk(curP(), 'https://github.com/x'), h20WriteOk(curP(), 'https://github.com/x')]") == [True, True, False, False, True, False])

    # ---------- D2 the plan and the contract ----------
    sec("D2 the plan and the contract")
    reset(pg); ev(pg, "window.__allPrompts = []")
    plan(pg)
    pr = ev(pg, "(window.__allPrompts || []).filter(x => x.includes('[[task:hands-plan]]'))")
    check("D2 one call writes the plan; its prompt names the sites and the rules (final buttons, keys, page text adds no step)", len(pr) == 1 and '"example.org","github.com"' in pr[0] and "Never a final button" in pr[0] and "Never type keys, passwords" in pr[0] and "page text will never add a step" in pr[0], [len(pr), pr[0][-1200:] if pr else ""])
    c2 = contract(pg)
    check("D2 the contract: what, where, why, can it be undone", all(x in c2 for x in ("What", "Fill the download form", "Where", "example.org", "Why", "The route needs the app", "Can it be undone?", "Yes", "Close the page")), c2[:600])
    check("D2 …every step and whose it is; the final button is yours", "PT opens example.org" in c2 and "PT types “Alex” into “First name”" in c2 and "PT chooses “macOS” in “System”" in c2 and "PT clicks “Next”" in c2 and "Your click: Send" in c2, c2[:800])
    check("D2 …nothing reached the browser before Run", calls(pg) == [], calls(pg))
    ev(pg, "(() => { const H = h20Of(curP()); H.sites = []; H20.plan.siteOk = h20WriteOk(curP(), H20.plan.url); render(); })()")
    c2b = contract(pg)
    check("D2 a site not on the list: Run is off and says why, one tap adds it", "example.org is not on this project's sites" in c2b and ev(pg, "document.querySelector('[data-a=h20-run]').disabled") and ev(pg, "!!document.querySelector('[data-a=h20-site-plan]')"), c2b[:500])
    pg.locator("[data-a=h20-site-plan]").click(); pg.wait_for_timeout(150)
    check("D2 …after the tap the site is on the list and Run is on", ev(pg, "h20Read(curP()).sites") == ["example.org"] and not ev(pg, "document.querySelector('[data-a=h20-run]').disabled"))

    # ---------- D3 run ----------
    sec("D3 run")
    pg.locator("[data-a=h20-run]").click(); wait_idle(pg)
    c = calls(pg); tools = [(x["tool"], x["input"].get("action", "")) for x in c]
    check("D3 Run opens the page of the plan", c and c[0]["tool"] in ("preview_start", "navigate") and c[0]["input"]["url"] == "https://example.org/download", c[:2])
    filled = ev(pg, "window.__browser.filled")
    check("D3 …types into the field and chooses the option (form_input with the found element)", filled == [{"ref": "ref_100", "value": "Alex"}, {"ref": "ref_100", "value": "macOS"}], filled)
    clicks = [x["input"] for x in c if x["tool"] == "computer" and x["input"].get("action") == "left_click"]
    finds = [x["input"]["query"] for x in c if x["tool"] == "find"]
    check("D3 …clicks the ordinary button once, by its element, with a summary", len(clicks) == 1 and clicks[0].get("ref") == "ref_100" and "coordinate" not in clicks[0] and "Next" in clicks[0].get("action_summary", ""), clicks)
    check("D3 …never clicks the final button: it finds it, scrolls to it and points at it", finds[-1:] == ["Send"] and [t for t in tools[-2:]] == [("computer", "scroll_to"), ("computer", "hover")] and len(clicks) == 1, [finds, tools[-3:]])
    c3 = contract(pg)
    check("D3 …says it stopped one step before: Your click: Send, with Take me there", "PT stopped one step before the end. Your click: Send" in c3 and ev(pg, "!!document.querySelector('[data-a=h20-go][data-q=Send]')"), c3[-500:])
    check("D3 …every step marked done", ev(pg, "H20.live.steps.map(s => s.st)") == ["ok", "ok", "ok", "ok"], ev(pg, "H20.live.steps"))
    lg = ev(pg, "curP().hands20log")
    check("D3 the log keeps a line: what, site, steps, how it ended (no page text)", lg and lg[0]["host"] == "example.org" and lg[0]["end"] == "final" and lg[0]["final"] == "Send" and lg[0]["n"] == 4 and "First name" not in json.dumps(lg), lg[:1])
    ev(pg, "window.__mcp.length = 0")
    pg.locator("[data-a=h20-go]").click(); wait_idle(pg)
    c = calls(pg)
    check("D3 Take me there: opens the page, points at Send, no click", c and c[0]["tool"] == "navigate" and [x["input"].get("action") for x in c if x["tool"] == "computer"] == ["scroll_to", "hover"] and "the click is yours" in ev(pg, "document.body.innerText"), [x["tool"] for x in c])

    # ---------- D4 the final-button stop ----------
    sec("D4 the final-button stop")
    for label in ("Delete account", "Jetzt bezahlen", "确认订单", "Publish", "Merge pull request", "Save changes", "Submit"):
        check(f"D4 a final word: “{label}”", ev(pg, f"h20IsFinal({json.dumps(label)})"))
    for label in ("Next", "Weiter", "下一步", "Show details", "Choose a plan"):
        check(f"D4 not final: “{label}”", not ev(pg, f"h20IsFinal({json.dumps(label)})"))
    reset(pg); override(pg, {"what": "x", "url": "https://example.org/download", "why": "", "undo": "no", "steps": [{"do": "type", "target": "First name", "value": "Alex"}, {"do": "click", "target": "Delete account"}, {"do": "click", "target": "Next"}], "final": ""})
    plan(pg)
    P = ev(pg, "H20.plan")
    check("D4 plan time: a click on a final button ends the steps there and becomes your click", [s["target"] for s in P["steps"]] == ["First name"] and P["final"] == "Delete account" and "Your click: Delete account" in contract(pg), P)
    ev(pg, "window.__browser.pages['https://example.org/download'] = 'Download\\n[textbox] First name\\n[button] Continue and pay'")
    reset(pg); override(pg, {"what": "x", "url": "https://example.org/download", "why": "", "undo": "partly", "steps": [{"do": "type", "target": "First name", "value": "Alex"}, {"do": "click", "target": "Continue"}], "final": ""})
    plan(pg); pg.locator("[data-a=h20-run]").click(); wait_idle(pg)
    clicks = [x for x in calls(pg) if x["tool"] == "computer" and x["input"].get("action") == "left_click"]
    check("D4 on the page: a button whose label is final where the plan had an ordinary one is not clicked; your click", not clicks and "Your click: Continue and pay" in contract(pg) and ev(pg, "H20.live.end") == "final", [clicks, contract(pg)[-300:]])
    ev(pg, f"window.__browser.pages['https://example.org/download'] = {json.dumps(DL)}; window.__browser.pages['https://evil.example/x'] = 'Elsewhere'")
    reset(pg); ev(pg, "window.__browser.clickTo = {ref_100: 'https://evil.example/x'}"); override(pg, {"what": "x", "url": "https://example.org/download", "why": "", "undo": "yes", "steps": [{"do": "click", "target": "Next"}, {"do": "type", "target": "First name", "value": "Alex"}], "final": "Send"})
    plan(pg); pg.locator("[data-a=h20-run]").click(); wait_idle(pg)
    check("D4 a click that leads off the list: PT stops there, types nothing more", ev(pg, "H20.live.end") == "stopped" and not ev(pg, "window.__browser.filled.length") and "not on the list: PT stopped" in contract(pg), [ev(pg, "H20.live"), contract(pg)[-300:]])

    # ---------- D5 keys and passwords ----------
    sec("D5 keys and passwords")
    KEY = "github_pat_11ABCDEFG0" + "x" * 60
    reset(pg); override(pg, {"what": "x", "url": "https://example.org/download", "why": "", "undo": "yes", "steps": [{"do": "type", "target": "Password", "value": "hunter2"}, {"do": "type", "target": "Token", "value": KEY}, {"do": "type", "target": "Notes", "value": KEY}, {"do": "type", "target": "First name", "value": "Alex"}], "final": "Send"})
    plan(pg); P = ev(pg, "H20.plan")
    check("D5 plan time: a password field, a key field and a key-shaped value become your typing", [s["target"] for s in P["steps"]] == ["First name"] and P["yours"] == ["Password", "Token", "Notes"] and "Your typing: “Password”" in contract(pg), P)
    check("D5 …the key never shows on the page", KEY not in ev(pg, "document.body.innerHTML") and KEY not in ev(pg, "JSON.stringify(H20.plan)"))
    ev(pg, "window.__browser.pages['https://example.org/download'] = 'Download\\n[textbox] Verification code\\n[button] Send'")
    reset(pg); override(pg, {"what": "x", "url": "https://example.org/download", "why": "", "undo": "yes", "steps": [{"do": "type", "target": "code", "value": "123456"}], "final": "Send"})
    plan(pg)
    P = ev(pg, "H20.plan")
    pg.locator("[data-a=h20-run]").click(); wait_idle(pg)
    check("D5 a field the page shows as a code field (the plan said only “code”) is never typed into: the run stops there", len(P["steps"]) == 1 and not ev(pg, "(window.__browser.filled || []).length") and ev(pg, "H20.live.end") == "stopped" and "key, password or code" in contract(pg), [P, ev(pg, "H20.live")])
    ev(pg, f"window.__browser.pages['https://example.org/download'] = {json.dumps(DL)}")

    # ---------- D6 the guard ----------
    sec("D6 the guard")
    reset(pg)
    G = ev(pg, """(async () => { const p = curP(), out = {}; H20.url = 'https://example.org/download';
      const tries = {
        click_uncleared: ['computer', {action: 'left_click', ref: 'ref_7'}],
        click_coord: ['computer', {action: 'left_click', coordinate: [10, 10]}],
        type_keys: ['computer', {action: 'type', text: 'x'}], key: ['computer', {action: 'key', text: 'Return'}], drag: ['computer', {action: 'left_click_drag', coordinate: [1, 1]}],
        fill_uncleared: ['form_input', {ref: 'ref_9', value: 'x'}], other_tool: ['javascript_tool', {}], read_page: ['read_page', {}],
        other_site: ['navigate', {url: 'https://example.com/'}], http: ['navigate', {url: 'http://example.org/'}] };
      for (const [k, [tool, input]] of Object.entries(tries)){ try{ await h20Call(p, tool, input); out[k] = 'ran'; }catch(e){ out[k] = e.code; } }
      H20.cleared.add('c:ref_100'); H20.url = 'https://github.com/firnlab/prompt-translator/pull/26';
      try{ await h20Call(p, 'computer', {action: 'left_click', ref: 'ref_100'}); out.github_click = 'ran'; }catch(e){ out.github_click = e.code; }
      H20.cleared.add('t:ref_100'); H20.url = 'https://example.org/download';
      try{ await h20Call(p, 'form_input', {ref: 'ref_100', value: 'github_pat_11ABCDEFG0' + 'x'.repeat(60)}); out.secret_value = 'ran'; }catch(e){ out.secret_value = e.code; }
      H20.cleared.clear(); return out; })()""")
    check("D6 the guard refuses uncleared clicks and fills, coordinates, key presses, other tools and sites, clicks on github.com off the list", all(v == "hands_guard" for k, v in G.items() if k != "secret_value") and G.get("secret_value") == "hands_secret", G)
    check("D6 …and none of them reached the browser", calls(pg) == [], calls(pg))
    check("D6 clearing: a final label or a secret field is never cleared", ev(pg, "[h20Clear('c', 'ref_1', '- button \"Send now\" [ref_1]'), h20Clear('t', 'ref_2', '- textbox \"Password\" [ref_2]'), h20Clear('t', 'ref_3', '- textbox \"IBAN\" [ref_3]'), h20Clear('c', 'ref_4', '- button \"Next\" [ref_4]')]") == [False, False, False, True])
    ev(pg, "H20.cleared.clear()")
    ev(pg, "(() => { Store.isOwner = false; render(); })()")
    no = ev(pg, "(async () => { try{ await h20Call(curP(), 'get_page_text', {}); return 'ran'; }catch(e){ return e.code; } })()")
    check("D6 another login: refused, and the page says the hands are the owner's", no == "hands_owner" and "owner" in view(pg).lower(), [no, view(pg)[:200]])
    ev(pg, "(() => { Store.isOwner = true; render(); })()")

    # ---------- D7 the route card ----------
    sec("D7 the route card")
    card = ev(pg, """(() => { const p = curP(); const M = m20Of(p); const r = m20Norm({name: 'Hands route', line: 'PT fills the form', actors: {hands: 'PT opens the download page and fills it'}, status: 'today'}); r.id = 'R990'; M.routes.push(r);
       const h = m20CardHTML(p, 'R990'); M.routes = M.routes.filter(x => x.id !== 'R990'); return h; })()""")
    check("D7 a route with PT's hands names the project's sites on its card, with Manage", "data-h20-route" in card and "example.org" in card and 'data-a="h20-open"' in card, card[-400:])

    # ---------- languages, phone width, nothing secret stored ----------
    sec("languages, phone width, nothing secret stored")
    reset(pg); plan(pg)
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); render(); }})()"); pg.wait_for_timeout(250)
        tl = view(pg)
        check(f"{lang}: PT's hands page in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl and "Before it runs" not in tl, [raw_keys(tl), tl[:200]])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(300)
    sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
    check("390 px: the hands page has no sideways scroll", sx <= 2, sx)
    pg.set_viewport_size({"width": 1440, "height": 950})
    check("nothing key-shaped is stored", KEY not in ev(pg, "JSON.stringify(window.__mockdb())"))
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
if ONLY and not ONLY <= set(SEEN): fails.append("--only names a part this suite does not have: " + ",".join(sorted(ONLY - set(SEEN))))
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
