"""2.1.0 (J12, J13): PT against a mock that behaves like the platform — on the made-up 2.0 bundle (test/fixtures/synthetic20.json).
Run: python3 test/e2e210_platform.py [test/fixtures/synthetic20.json] [--only P,S,M,D,B]
 P  the mock's own switches work (so no check below goes quietly empty): every sample code, the prompt-size cap from limits(), a busy
    lease, the path grammar of db.d.ts, the access rules of CAPABILITIES-2.0.json for a viewer who is not the owner, one store for two
    pages with cross-page snapshots; and PT itself under the path grammar and (as the second owner) under the access rules.
 S  one test per sample code (rate_limited, prompt_too_large, refused, upstream_error, session_expired, not_granted, invalid_json,
    empty_completion, and prompt_too_large from the real size cap): the message names the problem, the event keeps the code, nothing is
    sent again by itself, and the chat's "Try again" makes exactly one call per click.
 M  one test per mcp refusal code of the runner (approval_required, consent_required, rate_limited, needs_reauth): the message names the
    problem, no automatic second start, exactly one start per click; an unclear start (upstream_error) is not shown as "not sent".
 D  the morning check after a denied permission: said once, never asked again by itself on the next day.
 B  two writers (two pages, one store): both change the same project's facts book; nothing either of them wrote is lost.
Checks listed in test/expected_red.json are red on purpose until the PLAN-2.1 item named there lands; they print "red (expected …)"
and do not fail the run. One of them turning green fails the run until it is taken off the list (so the lead flips it on purpose)."""
import json, sys, pathlib, re
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLY = set()
for i, a in enumerate(sys.argv):
    if a == "--only" and i + 1 < len(sys.argv): ONLY = set(sys.argv[i + 1].split(","))
    elif a.startswith("--only="): ONLY = set(a.split("=", 1)[1].split(","))
ARGS = [a for a in ARGS if not re.fullmatch(r"[A-Z0-9,]+", a)]
BK = ARGS[0] if ARGS else "test/fixtures/synthetic20.json"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
RED = json.loads((ROOT / "test/expected_red.json").read_text())["red"]
SUITE = "test/e2e210_platform.py"
reds, flips = [], []
def check(cid, name, cond, info=""):
    r = RED.get(cid) if RED.get(cid, {}).get("suite") == SUITE else None
    if r:
        if cond:
            flips.append(cid); fails.append(f"{cid} {name}  → now green: take it off test/expected_red.json (PLAN-2.1 {r['item']})")
            print(f"FLIP  {cid} {name}  → now green: take it off test/expected_red.json (PLAN-2.1 {r['item']})", flush=True)
        else:
            reds.append(cid); print(f"red   {cid} {name}  (expected, until PLAN-2.1 {r['item']}) → {str(info)[:300]}", flush=True)
        return
    (oks if cond else fails).append(cid + " " + name + ("" if cond else "  → " + str(info)[:400]))
    print(("ok    " if cond else "FAIL  ") + cid + " " + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def on(part): return not ONLY or part in ONLY
def ev(pg, js, *a): return pg.evaluate(js, *a)
def wait_ai(pg, ms=40000):
    for _ in range(ms // 100):
        if ev(pg, "AI.running.size === 0"):
            pg.wait_for_timeout(350)
            if ev(pg, "AI.running.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(150)
def store_idle(pg, ms=30000):
    ev(pg, "flushSaves()")
    for _ in range(ms // 100):
        if ev(pg, "Store.queue.size === 0 && Store.busy.size === 0"): break
        pg.wait_for_timeout(100)
    pg.wait_for_timeout(200)
def n_task(pg, task): return ev(pg, "(t) => (window.__sampleLog || []).filter(x => x.task === t).length", task)
def n_tool(pg, tool): return ev(pg, "(t) => window.__mcp.filter(x => x.tool === t).length", tool)
RULES = json.loads((ROOT / "CAPABILITIES-2.0.json").read_text())["db"]["rules"]
WAIT_RESEND = 2500   # how long nothing may be sent again by itself (PT's own retries come within a second on the mock)
SAMPLE_CODES = ["rate_limited", "prompt_too_large", "refused", "upstream_error", "session_expired", "not_granted", "invalid_json", "empty_completion"]
MCP_CODES = {"approval_required": r"permission|allow", "consent_required": r"permission|allow", "rate_limited": r"rate_limited|too many|later|limit", "needs_reauth": r"needs_reauth|sign in|reconnect|log in"}
def chat_project(pg):
    pid = ev(pg, "WS.projects.filter(p => p.status !== 'archived' && p.m200)[0].id")
    ev(pg, "(id) => { Store.isOwner = true; openProject(id); UI.home = false; face20Set(curP(), 'chat'); render(); }", pid); pg.wait_for_timeout(300)
    return pid
def send(pg, text):
    pg.fill("#c20-in", text); pg.locator("form[data-form=c20-say] button[type=submit]").click(); wait_ai(pg)

with sync_playwright() as pw:
    b = pw.chromium.launch()

    # ---------- P the mock's switches, and PT under the platform's rules ----------
    if on("P"):
        print("P the mock behaves like the platform")
        ctx = new_ctx(b); pg = open_page(ctx)
        S = ev(pg, """(async () => { const s = await window.claude.use('sample'), out = {};
            for (const c of %s){ window.__mockSampleFail = c; try{ await s.json('[[task:probe]] hello'); out[c] = 'answered'; }catch(e){ out[c] = e && e.code; } }
            window.__mockSampleFail = {code: 'refused', n: 1}; let a = '', b2 = ''; try{ await s('[[task:probe]] x'); }catch(e){ a = e.code; } try{ await s('[[task:probe]] x'); b2 = 'answered'; }catch(e){ b2 = e.code; }
            window.__mockSampleFail = 'rate_limited'; window.__mockSampleFailOn = 'other'; let c2 = ''; try{ await s('[[task:probe]] x'); c2 = 'answered'; }catch(e){ c2 = e.code; }
            window.__mockSampleFail = null; window.__mockSampleFailOn = null;
            window.__mockEnforceLimits = true; window.__mockMaxPromptBytes = 50; const lim = await s.limits(); let big = ''; try{ await s('[[task:probe]] ' + 'x'.repeat(80)); big = 'answered'; }catch(e){ big = e.code; }
            window.__mockEnforceLimits = false; window.__mockMaxPromptBytes = 0;
            return {codes: out, once: [a, b2], on: c2, lim: lim.maxPromptBytes, big}; })()""" % json.dumps(SAMPLE_CODES))
        check("P1", "the mock's sample rejects every platform code on request (invalid_json from sample.json)", S["codes"] == {c: c for c in SAMPLE_CODES}, S["codes"])
        check("P2", "…{code, n} fails only the next n calls, and __mockSampleFailOn only the named task", S["once"] == ["refused", "answered"] and S["on"] == "answered", S)
        check("P3", "…the prompt-size cap comes from limits() and rejects prompt_too_large", S["lim"] == 50 and S["big"] == "prompt_too_large", S)
        D = ev(pg, """(async () => { const db = await window.claude.use('db'), u = await (await window.claude.use('user')).id(), out = {};
            window.__mockLeaseBusy = true; out.busy = await db.doc('probe/l1').acquire({holder: 'h', ttlMs: 5000}); window.__mockLeaseBusy = false;
            out.free = await db.doc('probe/l1').acquire({holder: 'h', ttlMs: 5000});
            window.__mockStrictPaths = true; const bad = []; for (const p of ['probe/a b', 'probe/.', 'probe/..', 'probe//x', 'probe/' + 'y'.repeat(201), Array(18).fill('a').join('/'), 'probe/ü', 'probe/a?b']){ try{ db.doc(p); bad.push('accepted ' + p.slice(0, 30)); }catch(e){ if (!(e instanceof TypeError)) bad.push('not a TypeError ' + p.slice(0, 30)); } }
            const good = []; for (const p of ['probe/a-b_c.d~e:f@g+h', 'data/users/' + u + '/x']){ try{ db.doc(p); }catch(e){ good.push(p); } }
            let parity = ''; try{ db.collection('probe/x'); parity = 'accepted'; }catch(e){ parity = e instanceof TypeError ? 'TypeError' : 'other'; }
            window.__mockStrictPaths = false; out.bad = bad; out.good = good; out.parity = parity;
            window.__mockDbRules = %s; localStorage.setItem('mocknotowner', '1');
            const tryset = async p => { try{ await db.doc(p).set({x: 1}); return 'ok'; }catch(e){ return e.code; } };
            out.kp = await tryset('kp/probe'); out.app = await tryset('app/probe'); out.kpprop = await tryset('kpprop/probe'); out.mine = await tryset('data/users/' + u + '/probe');
            out.other = await tryset('data/users/someone-else/probe');
            localStorage.removeItem('mocknotowner'); out.ownerKp = await tryset('kpprop/probe2');
            localStorage.setItem('mocknotowner', '1'); out.readProp = (await db.doc('kpprop/probe2').get()).exists; out.readKp = (await db.doc('kp/probe').get()).exists;
            localStorage.removeItem('mocknotowner'); out.readPropOwner = (await db.doc('kpprop/probe2').get()).exists;
            window.__mockDbRules = null; return out; })()""" % json.dumps(RULES))
        check("P4", "a busy lease answers {acquired: false} with an expiry; free again it is granted", D["busy"]["acquired"] is False and D["busy"].get("expiresAt") and D["free"]["acquired"] is True, [D["busy"], D["free"]])
        check("P5", "the path grammar: a space, . or .., an empty or over-long segment, 17+ segments, other characters throw a TypeError; the allowed characters pass", not D["bad"] and not D["good"] and D["parity"] == "TypeError", [D["bad"], D["good"], D["parity"]])
        check("P6", "the access rules for a viewer who is not the owner: kp, app and kpprop refuse a write (invalid_argument), their own subtree takes it", D["kp"] == D["app"] == D["kpprop"] == "invalid_argument" and D["mine"] == "ok", D)
        check("P7", "…another viewer's subtree refuses a write; the owner may write kpprop; kpprop reads as non-existent to others, kp reads", D["other"] == "invalid_argument" and D["ownerKp"] == "ok" and D["readProp"] is False and D["readPropOwner"] is True, D)
        ctx.close()
        # one store for two pages
        ctx = new_ctx(b); ctx.add_init_script("window.__mockShared = 1;")
        p1 = open_page(ctx); p2 = open_page(ctx)
        ev(p2, "(async () => { const db = await window.claude.use('db'); window.__seen2 = []; db.doc('probe/shared').onSnapshot(s => { if (s.exists) window.__seen2.push(s.data().n); }); })()")
        ev(p1, "(async () => { const db = await window.claude.use('db'); await db.doc('probe/shared').set({n: 7}); })()"); p2.wait_for_timeout(300)
        g = ev(p2, "(async () => { const db = await window.claude.use('db'); const s = await db.doc('probe/shared').get(); return s.exists ? s.data().n : null; })()")
        check("P8", "two pages, one store: a write on one page is read on the other, and its onSnapshot sees it", g == 7 and 7 in ev(p2, "window.__seen2"), [g, ev(p2, "window.__seen2")])
        L = ev(p1, "(async () => { const db = await window.claude.use('db'); return await db.doc('probe/lease').acquire({holder: 'page1', ttlMs: 4000}); })()"); p2.wait_for_timeout(200)
        L2 = ev(p2, "(async () => { const db = await window.claude.use('db'); return await db.doc('probe/lease').acquire({holder: 'page2', ttlMs: 4000}); })()")
        check("P9", "…a lease held on one page is busy on the other", L["acquired"] is True and L2["acquired"] is False, [L, L2])
        ctx.close()
        # PT under the path grammar
        ctx = new_ctx(b); ctx.add_init_script("window.__mockStrictPaths = 1;")
        pg = open_page(ctx)
        ev(pg, "(() => { Store.isOwner = true; })()")
        for pid in ev(pg, "WS.projects.map(p => p.id)"):
            ev(pg, "(id) => { openProject(id); UI.home = false; render(); factsOpen(curP()); render(); m20Open(curP(), 'map'); render(); face20Set(curP(), 'chat'); render(); }", pid); pg.wait_for_timeout(250)
        send(pg, "We never print the list. The list must fit on one screen.")
        ev(pg, "(() => { const p = curP(); factsAdd(p, {kind: 'fact', words: 'The family has four phones', by: 'you'}); addRestore(p, {kind: 'auto', label: 'probe'}); touch(p); })()"); store_idle(pg)
        check("P10", "PT keeps the platform's path grammar (projects, facts, map, chat, restore points, events): no path refused", not ev(pg, "window.__mockPathErrors || []"), ev(pg, "window.__mockPathErrors"))
        ctx.close()
        # PT as a viewer who is not the owner (the second owner), under the access rules
        ctx = new_ctx(b); ctx.add_init_script("localStorage.setItem('mocknotowner', '1'); window.__mockDbRules = " + json.dumps(RULES) + ";")
        pg = open_page(ctx)
        ev(pg, "(() => { const p = WS.projects[0]; openProject(p.id); factsAdd(p, {kind: 'fact', words: 'The tablet is shared', by: 'you'}); touch(p); render(); })()"); store_idle(pg)
        check("P11", "as the second owner PT never tries a write the platform refuses (kp, kpprop, app)", not ev(pg, "Store.isOwner") and not ev(pg, "window.__mockDenied || []"), [ev(pg, "Store.isOwner"), ev(pg, "window.__mockDenied")])
        ctx.close()

    # ---------- S the sample codes ----------
    if on("S"):
        print("S one test per sample code")
        ctx = new_ctx(b); pg = open_page(ctx); chat_project(pg)
        AIERR = ev(pg, "Object.fromEntries(Object.entries(AI_ERR).map(([k, v]) => [k, t(v)]))")
        cases = [(c, c, False) for c in SAMPLE_CODES] + [("prompt_too_large", "size_cap", True)]
        for code, cid, cap in cases:
            ev(pg, "() => { window.__sampleLog = []; EV20.session = []; window.__mockSampleFailOn = 'chat20'; }")
            if cap: ev(pg, "() => { window.__mockSampleFail = null; window.__mockEnforceLimits = true; window.__mockMaxPromptBytes = 3000; }")
            else: ev(pg, "(c) => { window.__mockSampleFail = c; }", code)
            msgs0 = ev(pg, "c20Read(curP()).msgs.length")
            send(pg, f"Probe for {cid}: the list is for the kitchen.")
            n1 = n_task(pg, "chat20"); pg.wait_for_timeout(WAIT_RESEND); wait_ai(pg); n1b = n_task(pg, "chat20")
            shown = ev(pg, "EV20.session.map(x => x.msg)")
            evs = ev(pg, "ev20List().filter(e => e.kind === 'ai').map(e => e.code)")
            last = ev(pg, "c20Read(curP()).msgs.slice(-1)[0] || {}")
            check(f"S.{cid}.card", f"{code}{' (from the real size cap)' if cap else ''}: the message names the problem, the event keeps the code, the chat says it could not answer and offers Try again",
                  AIERR.get(code) in shown and code in evs and last.get("fail") and ev(pg, "!!document.querySelector('.c20-log [data-a=c20-retry]')") and ev(pg, "c20Read(curP()).msgs.length") == msgs0 + 2,
                  [shown, evs[:4], last.get("text", "")[:80]])
            check(f"S.{cid}.once", f"{code}: one call for one message, nothing sent again by itself (calls: {n1b})", n1 == 1 and n1b == 1, [n1, n1b])
            pg.locator(".c20-log [data-a=c20-retry]").last.click(); wait_ai(pg); pg.wait_for_timeout(600); wait_ai(pg)
            n2 = n_task(pg, "chat20")
            check(f"S.{cid}.click", f"{code}: “Try again” is exactly one more call (calls after the click: {n2})", n2 == n1b + 1, [n1b, n2])
        ev(pg, "() => { window.__mockSampleFail = null; window.__mockSampleFailOn = null; window.__mockEnforceLimits = false; window.__mockMaxPromptBytes = 0; }")
        ctx.close()

    # ---------- M the mcp refusal codes (the runner) ----------
    if on("M"):
        print("M one test per mcp refusal code")
        ctx = new_ctx(b); pg = open_page(ctx)
        pid = ev(pg, "WS.projects.filter(p => p.status !== 'archived')[0].id")
        ev(pg, "(id) => { Store.isOwner = true; openProject(id); UI.home = false; render(); }", pid); pg.wait_for_timeout(300)
        def start_button(pg):   # a real button outside PT's re-rendered area, clicked through PT's own click handling (the Run page's "Check now" research button)
            ev(pg, "(() => { document.getElementById('t210-rs') && document.getElementById('t210-rs').remove(); document.body.insertAdjacentHTML('beforeend', '<button id=\"t210-rs\" style=\"position:fixed;left:4px;bottom:4px;z-index:99999\" class=\"btn\" data-a=\"research-run\" data-topic=\"Probe topic\">Check now</button>'); })()")
            pg.locator("#t210-rs").click()
        for code, rx in MCP_CODES.items():
            ev(pg, "(c) => { window.__mcp.length = 0; EV20.session = []; window.__mcpFail = c; }", code)
            j0 = ev(pg, "WS.jobs.length")
            start_button(pg); pg.wait_for_timeout(500)
            n1 = n_tool(pg, "fire_trigger"); pg.wait_for_timeout(WAIT_RESEND); n1b = n_tool(pg, "fire_trigger")
            job = ev(pg, "WS.jobs[0] || {}")
            shown = " | ".join(ev(pg, "EV20.session.map(x => x.msg)"))
            check(f"M.{code}.card", f"{code}: the run is marked as not started and the message names the problem", ev(pg, "WS.jobs.length") == j0 + 1 and job.get("status") == "notsent" and re.search(rx, shown, re.I) is not None, [job.get("status"), shown[:200]])
            check(f"M.{code}.once", f"{code}: one start for one click, no second start by itself (starts: {n1b})", n1 == 1 and n1b == 1, [n1, n1b])
            start_button(pg); pg.wait_for_timeout(800)
            check(f"M.{code}.click", f"{code}: the next click is exactly one more start", n_tool(pg, "fire_trigger") == 2, n_tool(pg, "fire_trigger"))
        # an unclear start (the service did not say yes or no): never shown as "not sent", never sent again by itself
        ev(pg, "() => { window.__mcp.length = 0; EV20.session = []; window.__mcpFail = 'upstream_error'; }")
        start_button(pg); pg.wait_for_timeout(WAIT_RESEND)
        job = ev(pg, "WS.jobs[0] || {}"); shown = " | ".join(ev(pg, "EV20.session.map(x => x.msg)"))
        check("M.upstream_error.once", "an unclear start: one start, nothing sent again by itself", n_tool(pg, "fire_trigger") == 1, n_tool(pg, "fire_trigger"))
        check("M.upstream_error.unclear", "an unclear start is shown as “may have started, checking”, not as “could not start”", job.get("status") != "notsent" and not re.search(r"could not be started", shown, re.I), [job.get("status"), shown[:200]])
        ev(pg, "() => { window.__mcpFail = null; }")
        ctx.close()

    # ---------- D the morning check after a denied permission ----------
    if on("D"):
        print("D a denied permission is not asked again")
        ctx = new_ctx(b); pg = open_page(ctx)
        ev(pg, "(() => { Store.isOwner = true; window.__ptNoMorning = false; WS.settings.morning20 = null; window.__mcp.length = 0; window.__browser.fail = 'approval_required'; mc20Run(); })()")
        for _ in range(100):
            if not ev(pg, "MC20.busy"): break
            pg.wait_for_timeout(100)
        lines = ev(pg, "(mc20Read() || {}).lines || []")
        n1 = ev(pg, "window.__mcp.filter(x => x.server === 'host:claude_browser').length")
        check("D.deny.named", "the morning check says once that the app's browser is not allowed, and skips its GitHub lines", any(l["k"] == "app" and l["st"] == "skip" for l in lines) and n1 >= 1, [lines[:3], n1])
        ev(pg, "(() => { WS.settings.morning20.day = '2026-01-01'; if (mc20Due()) mc20Run(); })()")   # the next day: the check runs by itself on open
        pg.wait_for_timeout(300)
        for _ in range(100):
            if not ev(pg, "MC20.busy"): break
            pg.wait_for_timeout(100)
        n2 = ev(pg, "window.__mcp.filter(x => x.server === 'host:claude_browser').length")
        check("D.deny.remembered", "the next day's check by itself does not ask the denied permission again (no browser call)", n2 == n1, [n1, n2])
        ev(pg, "(() => { window.__browser.fail = ''; window.__ptNoMorning = true; })()")
        ctx.close()

    # ---------- B two writers ----------
    if on("B"):
        print("B two writers on one project")
        ctx = new_ctx(b); ctx.add_init_script("window.__mockShared = 1;")
        A = open_page(ctx); Bp = open_page(ctx)
        pid = ev(A, "WS.projects.filter(p => p.status !== 'archived' && p.m200)[0].id")
        for pg in (A, Bp): ev(pg, "(id) => { Store.isOwner = true; openProject(id); UI.home = false; render(); }", pid)
        A.wait_for_timeout(400)
        Y, X1, X2 = "Grandma has a tablet too", "The kitchen has a speaker", "Lea has her own phone"
        ev(Bp, "(w) => { const p = curP(); factsAdd(p, {kind: 'fact', words: w, by: 'you'}); saveProject(p); }", Y); store_idle(Bp)
        A.wait_for_timeout(400)
        # page A did not see B's change: two edits in a row (the second waits in the queue while the first meets the conflict)
        ev(A, "([a, b]) => { const p = curP(); factsAdd(p, {kind: 'fact', words: a, by: 'you'}); saveProject(p); factsAdd(p, {kind: 'fact', words: b, by: 'you'}); saveProject(p); }", [X1, X2])
        store_idle(A, 60000); A.wait_for_timeout(500); store_idle(A, 30000)
        R = ev(A, """(async (id) => { const p = curP(); const d = await Store.readDoc(projPath(id)); const words = arr(d && d.ledger && d.ledger.entries).map(e => e.words);
            const rps = arr(p.restore).filter(r => r.kind === 'conflict'); const inRp = [];
            for (const r of rps){ const x = await loadRestore(p, r.id); if (x && x.project) inRp.push(...arr(x.project.ledger && x.project.ledger.entries).map(e => e.words)); }
            return {words, rp: rps.length, inRp, acq: window.__mockAcquires || 0, busy: window.__mockBusyAnswers || 0}; })""", pid)
        check("B.two_writers.conflict", "the second writer meets the conflict: PT keeps its own version as a restore point (the test reaches the conflict path)", R["rp"] >= 1, R)
        check("B.two_writers.lease", "…PT asks for the lease and waits while the other page holds it", R["acq"] >= 2 and R["busy"] >= 1, [R["acq"], R["busy"]])
        check("B.two_writers.mine", "…what this page wrote is kept (in the stored project or in its conflict restore point)", all(x in R["words"] or x in R["inRp"] for x in (X1, X2)), R)
        check("B.two_writers.kept", "…what the other page wrote is still in the stored project (a queued save does not overwrite it)", Y in R["words"], R["words"][-6:])
        ctx.close()

    check("errors", "no page errors", not errors, errors[:5])
    b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "expected red:", len(reds), "page errors:", len(errors))
if reds: print("expected red (test/expected_red.json):", ", ".join(f"{c} ({RED[c]['item']})" for c in reds))
sys.exit(1 if fails or errors else 0)
