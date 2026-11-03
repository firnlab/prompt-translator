"""1.10 PT's hands — the Claude desktop app's built-in browser (host:claude_browser), on a COPY of the real data (or the made-up bundle)
with the mock runtime, whose made-up browser answers in the shapes seen in the owner's app on 3 Nov 2026 (the "PT Hands Probe").
Run: python3 test/e2e1100_hands.py [work/backup-141 | test/fixtures/synthetic.json]
Covers:
 1 Settings › PT health › "PT's hands": the owner's login only, three checks, what it says it never does.
 2 Check pull requests: opens the list in the app's browser (one tab, then the same tab), reads it again while GitHub fills the list,
   lists each open pull request with "Take me to the merge button".
 3 Take me there: opens the pull request and moves the pointer onto "Merge pull request" (scroll, hover); never a click.
 4 Check this version's release: found / not there yet (after reading again, never forever).
 5 Check key dates: names with end dates, days left, ran out, no end date; within 30 days → "renew it now".
 6 The guard: no click, no typing, no key press, no form, no other site, no other tool; nothing reaches the browser then.
 7 A key on the page: dropped at once, the step stops, nothing of it is kept, shown or stored.
 8 Every failure has its own line: not the desktop app, not allowed yet, sign-in page, a closed tab (a new tab, then it works).
 9 The key renewal card: "Take me there" next to each link, pointing at the line the step names.
 three languages (no raw keys, no ß), 390 px without sideways scroll, nothing stored, no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def calls(pg): return [c for c in ev(pg, "window.__mcp || []") if c.get("server") == "host:claude_browser"]
def reset(pg): ev(pg, "(() => { window.__mcp.length = 0; HANDS.res = {}; HANDS.busy = ''; Object.assign(window.__browser, {fail: '', loadReads: 0, closed: false}); })()")
def health(pg): ev(pg, "(() => { UI.view = 'settings'; UI.setTab = 'health'; UI.modal = null; render(); })()"); pg.wait_for_timeout(300)
def wait_idle(pg):
    for _ in range(80):
        if ev(pg, "!HANDS.busy"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def click(pg, sel): pg.locator(sel).first.click(); wait_idle(pg)
def box(pg): return ev(pg, "(document.querySelector('.hands') || {}).innerText || ''")
def toasts(pg): return ev(pg, "[...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ')")
def raw_keys(text): return sorted(set(re.findall(r"\bhands\.[a-z][a-z0-9.]*\b", text)))
NOW = "2026-11-03T10:00:00Z"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); ctx.clock.set_system_time(NOW)
    pg = open_page(ctx); pg.wait_for_timeout(800)
    ev(pg, "(() => { Store.isOwner = true; })()")

    # ---------- 1. the section ----------
    health(pg); reset(pg); health(pg)
    t1 = box(pg)
    check("Settings › PT health shows PT's hands with three checks", "PT's hands" in t1 and ev(pg, "document.querySelectorAll('.hands [data-a=hands-check]').length") == 3, t1[:300])
    check("…and says what it never does and where it works", "never presses a final button" in t1 and "never looks at a key" in t1 and "Claude desktop app" in t1, t1[:400])
    check("nothing touches the browser before a click", calls(pg) == [], calls(pg))

    # ---------- 2. pull requests ----------
    ev(pg, "window.__browser.loadReads = 2")
    click(pg, ".hands [data-a=hands-check][data-k=prs]")
    c = calls(pg); t2 = box(pg)
    check("Check pull requests opens the list in the app's browser", c and c[0]["tool"] == "preview_start" and c[0]["input"]["url"] == "https://github.com/firnlab/prompt-translator/pulls", c[:2])
    waits = [x for x in c if x["tool"] == "computer" and x["input"].get("action") == "wait"]
    check("…reads again while GitHub fills the list (two waits of 2 s, then found)", len(waits) == 2 and all(x["input"].get("duration") == 2 for x in waits) and all(x["input"].get("tabId") == "seed" for x in c[1:]), [x["input"] for x in c])
    check("…lists both open pull requests with their titles", "#26 Release 1.10.0: PT's hands" in t2 and "#27 Bump actions/checkout" in t2 and "Open pull requests in prompt-translator: 2" in t2, t2[:400])
    gos = ev(pg, "[...document.querySelectorAll('.hands-res[data-k=prs] [data-a=hands-go]')].map(b => [b.dataset.url, b.dataset.q, b.textContent])")
    check("…each with Take me to the merge button", gos == [["https://github.com/firnlab/prompt-translator/pull/26", "Merge pull request", "Take me to the merge button"], ["https://github.com/firnlab/prompt-translator/pull/27", "Merge pull request", "Take me to the merge button"]], gos)
    check("…with the time it looked", "checked" in t2)
    reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=prs]")
    c = calls(pg)
    check("a second check uses the same tab (navigate, no new tab)", c and c[0]["tool"] == "navigate" and c[0]["input"] == {"url": "https://github.com/firnlab/prompt-translator/pulls", "tabId": "seed"} and ev(pg, "window.__browser.tabs") == 1, c[:2])

    # ---------- 3. take me there ----------
    ev(pg, "window.__mcp.length = 0")
    click(pg, ".hands-res[data-k=prs] [data-a=hands-go][data-url$='/pull/26']")
    c = calls(pg); tt = toasts(pg)
    check("Take me there opens the pull request", c and c[0]["tool"] == "navigate" and c[0]["input"]["url"] == "https://github.com/firnlab/prompt-translator/pull/26", c[:1])
    moves = [x["input"] for x in c if x["tool"] == "computer"]
    check("…scrolls to the merge button and puts the pointer on it", [m.get("action") for m in moves] == ["scroll_to", "hover"] and moves[0].get("ref") == "ref_100", moves)
    check("…and says the click is yours", "The pointer is on “Merge pull request”; the click is yours." in tt, tt)
    ev(pg, "window.__mcp.length = 0")
    ev(pg, "handsGo('https://github.com/firnlab/prompt-translator/pull/26', 'Squash and merge')"); wait_idle(pg)
    check("a spot that is not on the page: opened, and PT says it could not find it", "could not find “Squash and merge”" in toasts(pg) and not [x for x in calls(pg) if x["tool"] == "computer" and x["input"].get("action") != "wait"], toasts(pg))

    # ---------- 4. the release ----------
    reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=rel]")
    c = calls(pg); t4 = box(pg)
    check("Check this version's release opens the tag of this version", c and c[0]["input"]["url"] == "https://github.com/firnlab/prompt-translator/releases/tag/v" + ev(pg, "PT_VERSION"), c[:1])
    check("…found: GitHub has the release", "GitHub has the release v" + ev(pg, "PT_VERSION") + "." in t4, t4[:300])
    reset(pg); ev(pg, "(() => { delete window.__browser.pages['https://github.com/firnlab/prompt-translator/releases/tag/v' + PT_VERSION]; })()"); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=rel]")
    t4b = box(pg); reads = [x for x in calls(pg) if x["tool"] == "get_page_text"]
    check("…not there yet: says so and where it comes from", "has no release v" in t4b and "after you merge the release pull request" in t4b, t4b[:300])
    check("…after one read (GitHub's not-found page counts as an answer)", len(reads) == 1, len(reads))
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/releases/tag/v' + PT_VERSION] = 'Loading…'"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=rel]")
    reads = [x for x in calls(pg) if x["tool"] == "get_page_text"]
    check("…a page that never fills: four reads at most, then an answer", len(reads) == 4 and "has no release" in box(pg), [len(reads), box(pg)[-300:]])

    # ---------- 5. key dates ----------
    reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=keys]")
    t5 = box(pg); lis = ev(pg, "[...document.querySelectorAll('.hands-res[data-k=keys] li')].map(l => [l.textContent, l.classList.contains('warn-t')])")
    check("Check key dates opens the fine-grained keys page", calls(pg)[0]["input"]["url"] == "https://github.com/settings/personal-access-tokens")
    check("…lists four keys", len(lis) == 4, lis)
    check("…a date a year away: the date and the days left, calm", lis and "pt-private-writer: runs out on 04 Nov 2027 · days left: 366" in lis[0][0] and not lis[0][1], lis[:1])
    check("…within 30 days: renew it now, marked", len(lis) > 1 and "tools-runner: runs out on 21 Nov 2026 · days left: 18" in lis[1][0] and "renew it now" in lis[1][0] and lis[1][1], lis[1:2])
    check("…ran out: says so, marked", len(lis) > 2 and "old-test: ran out on 05 Jan 2026" in lis[2][0] and lis[2][1], lis[2:3])
    check("…no end date", len(lis) > 3 and "lab: no end date" in lis[3][0], lis[3:])
    # GitHub's real pull request list (3 Nov 2026): the labels sit as single words between the title and "#N"
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pulls'] = 'Pull requests\\nBump actions/upload-artifact from 4.6.2 to 7.0.2\\ndependencies\\npt\\n#21·dependabot[bot] opened yesterday\\nFix the guard\\n#30·by firnsmith was opened 1 hour ago'"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=prs]")
    t6 = box(pg)
    check("…real list shape: the title, not a label, next to #21", "#21 Bump actions/upload-artifact from 4.6.2 to 7.0.2" in t6 and "#21 pt" not in t6 and "#30 Fix the guard" in t6, t6[:400])
    # GitHub's real shape (3 Nov 2026): "Never used •Expires on Wed, Nov 3 2027" on one line, the name on the line above
    ev(pg, "window.__browser.pages['https://github.com/settings/personal-access-tokens'] = 'Fine-grained personal access tokens\\nGenerate new token\\nkey-one\\nNever used •Expires on Wed, Nov 3 2027\\nkey-two\\nLast used within the last week • Expires on Tue, Dec 1 2026\\nkey-three\\nNever used •No expiration'"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=keys]")
    lis = ev(pg, "[...document.querySelectorAll('.hands-res[data-k=keys] li')].map(l => [l.textContent, l.classList.contains('warn-t')])")
    check("…real page shape: a date after 'Never used •' is read", len(lis) == 3 and "key-one: runs out on 03 Nov 2027 · days left: 365" in lis[0][0] and not lis[0][1], lis)
    check("…real page shape: within 30 days after 'Last used … •', marked", len(lis) > 1 and "key-two: runs out on 01 Dec 2026 · days left: 28" in lis[1][0] and lis[1][1], lis[1:2])
    check("…real page shape: no end date after a •", len(lis) > 2 and "key-three: no end date" in lis[2][0], lis[2:])
    ev(pg, "window.__browser.pages['https://github.com/settings/personal-access-tokens'] = 'Fine-grained personal access tokens\\nGenerate new token\\nNo tokens yet'"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=keys]")
    check("…no dates on the page: says so and that the page is open", "found no key dates on the page" in box(pg), box(pg)[:200])

    # ---------- 6. the guard ----------
    ev(pg, "window.__mcp.length = 0")
    G = ev(pg, """(async () => { const out = {}; const tries = {
        click: ['computer', {action: 'left_click', coordinate: [10, 10]}], type: ['computer', {action: 'type', text: 'x'}], key: ['computer', {action: 'key', text: 'Return'}],
        drag: ['computer', {action: 'left_click_drag', coordinate: [1, 1]}], form: ['form_input', {ref: 'ref_1', value: 'x'}], read_page: ['read_page', {}],
        other: ['navigate', {url: 'https://example.com/'}], http: ['preview_start', {url: 'http://github.com/'}], lookalike: ['navigate', {url: 'https://github.com.evil.example/'}] };
      for (const [k, [tool, input]] of Object.entries(tries)){ try{ await handsCall(tool, input); out[k] = 'ran'; }catch(e){ out[k] = e.code; } } return out; })()""")
    check("the guard refuses a click, typing, a key, a drag, a form, other tools and other sites", all(v == "hands_guard" for v in G.values()), G)
    check("…and none of them reached the browser", calls(pg) == [], calls(pg))
    acts = ev(pg, "HANDS_MOVES.slice()")
    check("the only pointer moves are scroll, hover and wait", acts == ["scroll_to", "hover", "wait"], acts)
    check("the page asks the platform for five browser tools, no form tool", ev(pg, "HANDS_TOOLS.slice()") == ["preview_start", "navigate", "get_page_text", "find", "computer"])

    # ---------- 7. a key on the page ----------
    KEY = "github_pat_11ABCDEFG0" + "x" * 60
    ev(pg, f"window.__browser.pages['https://github.com/settings/personal-access-tokens'] = 'Make sure to copy your token now\\n{KEY}\\npt-private-writer\\nExpires on Thu, Nov 4 2027.'"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=keys]")
    t7 = box(pg)
    check("a key on the page: the step stops with its own line", "saw something shaped like a key on that page and stopped" in t7, t7[:300])
    check("…nothing of it is shown, kept or stored", KEY not in ev(pg, "document.body.innerHTML") and KEY not in ev(pg, "JSON.stringify(HANDS)") and KEY not in ev(pg, "JSON.stringify(window.__mockdb())") and "pt-private-writer" not in ev(pg, "JSON.stringify(HANDS.res)"))
    ev(pg, "window.__browser.pages['https://github.com/settings/personal-access-tokens'] = 'x\\nsk-ant-oat01-' + 'y'.repeat(40)"); reset(pg); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=keys]")
    check("…a Claude key too", "shaped like a key" in box(pg))
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pull/26'] = 'Merge pull request\\nghp_' + 'Z'.repeat(36)"); ev(pg, "window.__mcp.length = 0")
    ev(pg, "handsGo('https://github.com/firnlab/prompt-translator/pull/26', 'Merge pull request')"); wait_idle(pg)
    check("…and Take me there stops before pointing at anything", "shaped like a key" in toasts(pg) and not [x for x in calls(pg) if x["tool"] == "computer" and x["input"].get("action") in ("scroll_to", "hover")], toasts(pg))
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pull/26'] = 'Release 1.10.0: PT\\'s hands #26\\nMerge pull request'")

    # ---------- 8. every failure has its own line ----------
    for code, want in (("server_not_connected", "only when PT is open in the Claude desktop app"), ("capability_disabled", "only when PT is open in the Claude desktop app"),
                       ("cancelled", "choose Allow when the app asks"), ("not_in_manifest", "choose Allow when the app asks"), ("server_unavailable", "did not answer (server_unavailable)")):
        reset(pg); ev(pg, f"window.__browser.fail = '{code}'"); health(pg)
        click(pg, ".hands [data-a=hands-check][data-k=prs]")
        res = ev(pg, "(document.querySelector('.hands-res[data-k=prs]') || {}).innerText || ''")
        check(f"{code}: its own line (in the result, not only the section's note)", want in res, res[:200])
    reset(pg); ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pulls'] = 'Sign in to GitHub\\nUsername or email address\\nPassword'"); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=prs]")
    check("a sign-in page: sign in in the app's browser, then again", "GitHub asks you to sign in" in box(pg), box(pg)[:200])
    ev(pg, "window.__browser.pages['https://github.com/firnlab/prompt-translator/pulls'] = 'Pull requests\\nThere aren’t any open pull requests.'")
    reset(pg); ev(pg, "window.__browser.closed = true"); health(pg)
    click(pg, ".hands [data-a=hands-check][data-k=prs]")
    c = calls(pg)
    check("a closed tab: PT opens a new one and the check works", [x["tool"] for x in c[:3]] == ["navigate", "preview_start", "get_page_text"] and "No open pull requests" in box(pg), [x["tool"] for x in c])
    ev(pg, "(() => { Store.isOwner = false; HANDS.res = {}; render(); })()"); health(pg)
    no = ev(pg, "(async () => { try{ await handsCall('get_page_text', {}); return 'ran'; }catch(e){ return e.code; } })()")
    check("another login: no section, and the browser is refused", not ev(pg, "!!document.querySelector('.hands')") and no == "hands_owner", no)
    ev(pg, "(() => { Store.isOwner = true; render(); })()")

    # ---------- 9. the key renewal card ----------
    ev(pg, "window.__mcp.length = 0")
    K = ev(pg, """(() => { const d = document.createElement('div'); d.id = 'kc'; d.innerHTML = care19KeysHTML(); document.querySelector('.main').appendChild(d);
        return [...d.querySelectorAll('.row')].map(r => [...r.children].map(x => x.tagName === 'A' ? ['a', x.getAttribute('href')] : ['b', x.dataset.url, x.dataset.q])); })()""")
    want = [[["a", "https://github.com/firnlab/prompt-translator/settings/environments"], ["b", "https://github.com/firnlab/prompt-translator/settings/environments", "build"],
             ["a", "https://github.com/firnlab/tools/settings/secrets/actions"], ["b", "https://github.com/firnlab/tools/settings/secrets/actions", "CLAUDE_CODE_OAUTH_TOKEN"]],
            [["a", "https://github.com/settings/personal-access-tokens"], ["b", "https://github.com/settings/personal-access-tokens", "pt-private"],
             ["a", "https://github.com/firnlab/prompt-translator/settings/secrets/actions"], ["b", "https://github.com/firnlab/prompt-translator/settings/secrets/actions", "PT_PRIVATE_TOKEN"],
             ["a", "https://github.com/firnlab/tools/settings/secrets/actions"], ["b", "https://github.com/firnlab/tools/settings/secrets/actions", "PT_PRIVATE_TOKEN"]]]
    check("the key renewal card: Take me there after each link, pointing at the line the step names", K == want, K)
    check("…the links and steps are as before (5 links)", ev(pg, "document.querySelectorAll('#kc a').length") == 5)
    pg.locator("#kc [data-a=hands-go]").nth(1).click(); wait_idle(pg)
    c = calls(pg)
    check("…a click opens the build repository's secrets and points at the Claude key's line", c and c[0]["input"]["url"] == "https://github.com/firnlab/tools/settings/secrets/actions" and any(x["tool"] == "find" and x["input"]["query"] == "CLAUDE_CODE_OAUTH_TOKEN" for x in c) and "the click is yours" in toasts(pg), [x["input"] for x in c])
    ev(pg, "(() => { const k = document.getElementById('kc'); if (k) k.remove(); })()")

    # ---------- languages, phone width, nothing stored ----------
    reset(pg); health(pg); click(pg, ".hands [data-a=hands-check][data-k=keys]")
    for lang in ("de", "zh"):
        ev(pg, f"(() => {{ LANG = '{lang}'; applyLangAttr(); render(); }})()"); pg.wait_for_timeout(300)
        tl = box(pg)
        check(f"{lang}: PT's hands in the language, no raw keys" + (", no ß" if lang == "de" else ""), tl and not raw_keys(tl) and "ß" not in tl and "PT's hands" not in tl, tl[:200])
    ev(pg, "(() => { LANG = 'en'; applyLangAttr(); render(); })()")
    pg.set_viewport_size({"width": 390, "height": 844}); health(pg)
    sx = ev(pg, "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()")
    check("390 px: PT's hands has no sideways scroll", sx <= 2, sx)
    db = ev(pg, "JSON.stringify(window.__mockdb())")
    check("nothing of the findings is stored", "pt-private-writer" not in db and "tools-runner" not in db and '"hands' not in db)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
