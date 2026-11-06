"""Bug-hunt checks for every update (the bug classes found in the 1.4.1 hunt), on a COPY of the real data with the mock runtime.
Generic on purpose: they look at whatever actions, screens and fields the version has, so they keep working for new features.
Run: python3 test/hunt.py [backup dir | bundle.json]          (about 10-20 minutes; the click-everything test is test/monkey141.py)
     HUNT_MUTATE=<n> python3 test/hunt.py …   puts known bug n back (test/check_the_hunts.py) and runs only check n (2.1, J4)

 1 handlers      every data-a / data-a-change / data-form in the sources exists at runtime
 2 keys          with a dialog or page open, the global keys (?, Backspace, Y, N, J, K, A, 1) change nothing
 3 switch        opening another project starts with a clean panel, filter, selection and editor
 4 persist       every field of every project survives save + reload unchanged
 5 undo          each AI action on screen is one PT action; its Undo brings the project back exactly
 6 toast-undo    an Undo button in a toast always belongs to an action that just happened
 7 partial data  every screen renders when a project's objects are empty or half filled (new projects, old data)
 8 empty project every step, mode and level renders for a brand-new project
 9 languages     main screens in de and zh show no raw string keys and no ß
10 migrations    each one-time migration runs once: a second run changes nothing
11 menus         every menu opens in full: each entry visible and clickable, wherever the menu sits (1.4.2)
12 one box       no element id appears twice on a screen (a box shown twice is read from the wrong copy) (1.4.2)
13 squeeze       no text squeezed to one word or letter per line, at 1440 / 1024 with the inspector / 390 (1.4.2)
14 go-to         every kind of open item, in both faces, lands visibly on screen or in the inspector (1.4.2; 2.1: the
                 "top of this step" toast is no landing — a jump needs a target you can see)
15 you are here  the stage strip marks the one stage the project is at (1.4.2; 2.0: the Journey view is gone)
16 typing       text typed into any box survives a background render, cursor kept (lost text since 1.0)
17 done          a step shown as done has no blocker; copying never unlocks with blockers (one truth for "done")
18 broken AI     empty / non-JSON / wrongly shaped AI answers: no crash, no hang, no damaged data
19 failed load   a failed read at start writes nothing (1.0: empty data written over real data)
20 size          every stored document stays under 220 KB (the platform refuses documents over 256 KiB)
21 remove        a removed item leaves no reference behind (tests, criteria, loop, flags, links)
"""
import json, sys, pathlib, re, os
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])

# check the checks (2.1, J2 + J4): HUNT_MUTATE=<n> puts one known bug back in the page (test/check_the_hunts.py), runs only check n
# (plus the setup it needs) and stops at its FAIL. Each bug is the bug class the check is named for, applied from outside the sources.
MUT = os.environ.get("HUNT_MUTATE") or ""
SEL = MUT or os.environ.get("HUNT_ONLY") or ""   # HUNT_ONLY=<n>: only check n, no planted bug (its clean run, for check_the_hunts --clean)
def on(*ns): return not SEL or SEL in ns
MUTATIONS = {
    # 1 an action named in the markup that does not exist at runtime
    "1": "delete ACTIONS['pg-open'];",
    # 2 a global key that acts while a dialog or the palette is open
    "2": "document.addEventListener('keydown', e => { if (e.key === 'j' && (UI.modal || UI.palette)){ UI.modal = null; UI.palette = false; render(); } });",
    # 3 the search filter of one project stays when another project opens
    "3": "{ const o = openProject; window.openProject = function(...a){ const keep = UI.qFind; const r = o.apply(this, a); if (keep) UI.qFind = keep; return r; }; }",
    # 4 a field is not written by the save, so it is gone after a reload
    "4": "{ const o = saveProject; window.saveProject = function(p, ...a){ const keep = p.requirements; p.requirements = []; try{ return o.call(this, p, ...a); } finally { p.requirements = keep; } }; }",
    # 5 an automatic step writes into the project later, after the click's action is closed (cause 50): Undo cannot take it back
    "5": "{ const o = runAI; window.runAI = async function(...a){ const r = await o.apply(this, a); const q = curP(); if (q) setTimeout(() => { actClose(q.id); q.zzStray = (q.zzStray || 0) + 1; touch(q); }, 300); return r; }; }",
    # 6 every AI answer ends with a "done" toast that offers Undo, also when the answer changed nothing (toastUndo's freshness rule dropped)
    "6": "{ const o = runAI; window.runAI = async function(...a){ const r = await o.apply(this, a); setTimeout(() => { toast(t('btn.undo1'), 'ok'); const h = document.getElementById('toasts'), el = h && h.lastElementChild; if (el){ const b = document.createElement('button'); b.className = 'btn xs'; b.textContent = t('btn.undo1'); el.appendChild(b); } }, 50); return r; }; }",
    # 7 a screen reads a nested part of an object without a guard (crashes on {} or half-filled data)
    "7": "{ const o = render; window.render = function(...a){ const p = UI.view === 'project' && curP(); if (p && p.plan) void p.plan.steps.length; return o.apply(this, a); }; }",
    # 8 a screen expects at least one requirement (crashes on a brand-new project)
    "8": "{ const o = render; window.render = function(...a){ const p = UI.view === 'project' && curP(); if (p && !UI.home) void p.requirements[0].id; return o.apply(this, a); }; }",
    # 9 German text with ß (Swiss German writes ss)
    "9": "{ const o = t; window.t = function(...a){ const s = o.apply(this, a); return LANG === 'de' && typeof s === 'string' ? s.replace(/ss/g, 'ß') : s; }; }",
    # 10 a one-time tidy-up that changes the project again on every run
    "10": "window.migrate141 = function(p){ p.zzTidy = (p.zzTidy || 0) + 1; return true; };",
    # 11 menu entries that are not visible / clickable where the menu opens
    "11": "{ const st = document.createElement('style'); st.textContent = '.app details > .menu > .mi, .app details > .menu > button { visibility: hidden !important; }'; document.head.appendChild(st); }",
    # 12 the same box rendered twice on one screen
    "12": "{ const o = render; window.render = function(...a){ const r = o.apply(this, a); const e = document.querySelector('.app [id]'); if (e && e.parentElement) e.insertAdjacentHTML('afterend', '<span hidden id=\"' + e.id + '\"></span>'); return r; }; }",
    # 13 buttons squeezed to a word per line
    "13": "{ const st = document.createElement('style'); st.textContent = '.app button { max-width: 34px !important; min-width: 0 !important; white-space: normal !important; overflow-wrap: anywhere !important; }'; document.head.appendChild(st); }",
    # 14 a dead jump: go-to finds no place and only says "the top of this step" (known 1, PLAN-2.1 C1)
    "14": "window.goRef = function(ref){ UI.drawer = false; UI.inspRef = null; const m = document.querySelector('.main'); if (m) m.scrollTo({top: 0}); toast(t('nav.attop'), ''); };",
    # 15 the stage strip marks two stages as "now"
    "15": "{ const o = render; window.render = function(...a){ const r = o.apply(this, a); const s = document.querySelectorAll('.c20 .st20-s'); if (s.length > 1){ s[0].classList.add('now'); s[s.length - 1].classList.add('now'); } return r; }; }",
    # 16 a render rebuilds the boxes from the stored value and drops what was typed
    "16": "{ const o = render; window.render = function(...a){ const r = o.apply(this, a); for (const e of document.querySelectorAll('.app textarea, .app input[type=text], .app input:not([type])')) if (/zq/.test(e.value)) e.value = e.value.replace(/ ?zq/g, ''); return r; }; }",
    # 17 "done" decided by its own formula, without asking the queue for blockers
    "17": "{ const o = stepInfo; window.stepInfo = function(...a){ const r = o.apply(this, a); return Object.assign({}, r, {state: 'done'}); }; window.copyUnlocked = function(p){ return true; }; }",
    # 18 a garbage AI answer written into a list without checking its shape
    "18": "{ const o = runAI; window.runAI = async function(...a){ const r = await o.apply(this, a); const q = curP(); if (window.__mockGarbage && q) q.tests = {answer: r === undefined ? 'undefined' : r}; return r; }; }",
    # 19 a write after a failed start (1.0: empty data written over real data) — an init script, the start is the point
    "19": "window.addEventListener('load', () => setTimeout(() => { try{ Store.isSafe = () => false; saveMeta(); }catch(e){} }, 4500));",   # the checked save (read before write) would refuse it, so that rule is dropped too
    # 20 big documents are no longer split, and one project is big
    "20": "{ Store.BIG_AT = 1e9; const p = WS.projects.slice().sort((a, b) => JSON.stringify(a).length - JSON.stringify(b).length)[0]; if (p) p.zzLog = 'x'.repeat(Math.max(0, 235000 - JSON.stringify(p).length)); }",
    # 21 removing an item leaves a link to it behind
    "21": "{ const o = ACTIONS['item-remove']; ACTIONS['item-remove'] = function(el, ...a){ const r = o.call(this, el, ...a); const p = curP(); if (p && el && el.dataset) p.zzLinks = [...(p.zzLinks || []), el.dataset.ref]; return r; }; }",
}
if MUT and MUT not in MUTATIONS: sys.exit("HUNT_MUTATE=" + MUT + ": no such planted bug in hunt.py")
def mutate(pg):
    if MUT and MUT != "19": pg.evaluate("() => { " + MUTATIONS[MUT] + " }")   # as a function body: a bare expression that ends in a function would be called by evaluate

_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:int(os.environ.get("HUNT_INFO", 600))]), flush=True)
    if MUT and not cond and name.split(" ", 1)[0] == MUT:   # J4: the planted bug was caught, nothing else to run
        print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors), flush=True); sys.exit(1)
ROOTP = pathlib.Path(__file__).resolve().parent.parent
SRC = "\n".join(p.read_text() for p in sorted((ROOTP / "src").glob("*.js")) if not p.name.startswith(("strings", "knowledge")))
PIDS = None
PHASES = ["capture", "understand", "interview", "assume", "require", "arch", "build", "review", "test", "launch", "release", "operate"]
RAWKEY = r"""(() => { const txt = (document.querySelector('.app') || document.body).innerText; const keys = Object.keys(STR); const hit = keys.filter(k => k.includes('.') && txt.includes(k) && !/^(q|ex|pt|sb)\.[a-z]$/.test(k)).slice(0, 5); return hit; })()"""
SCREENS = lambda pid: [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=true; render(); }})()"] + \
    [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=false; pgShowPhase(curP(), '{ph}'); setPhase('{ph}'); render(); }})()" for ph in PHASES] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; setPhase('require'); face20Set(curP(), '{m}'); UI.home=false; render(); }})()" for m in ["pick", "chat"]] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; curP().mode='pick'; window.__pickFixture(curP()); UI.pkCands = {str(c).lower()}; UI.pkDump = {str(c).lower()}; render(); }})()" for c in [False, True]]   # 1.5.0: every Pick screen, filled
VOLATILE = ["updatedAt", "_rev", "seenAt", "lastWhere", "focus", "usageMonth"]
def fresh(b):
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); mutate(pg); pg.wait_for_timeout(300)
    return ctx, pg
with sync_playwright() as pw:
    b = pw.chromium.launch()
    if on(*[str(n) for n in range(1, 7)]):
        ctx, pg = fresh(b)
        PIDS = pg.evaluate("WS.projects.map(p => p.id)")

    # 1 handlers
    if on("1"):
        names = {"a": set(re.findall(r'data-a="([a-z0-9-]+)"', SRC)), "c": set(re.findall(r'data-a-change="([a-z0-9-]+)"', SRC)), "f": set(re.findall(r'data-form="([a-z0-9-]+)"', SRC))}
        miss = pg.evaluate("(n) => ({a: n.a.filter(k => typeof ACTIONS[k] !== 'function'), c: n.c.filter(k => typeof CHANGES[k] !== 'function'), f: n.f.filter(k => typeof FORMS[k] !== 'function')})", {k: sorted(v) for k, v in names.items()})
        check("1 handlers: every action, change handler and form in the markup exists", not any(miss.values()), miss)

    # 2 keys with a dialog or page open
    if on("2"):
        dialogs = {"recovery code": "UI.modal = {kind: 'pincode', code: 'TEST-CODE', sticky: true}", "what's new": "UI.modal = {kind: 'whatsnew', wide: true, from: ''}",
                   "review page": "UI.modal = {kind: 'review'}; UI.review = {mode: 'affected', pid: curP().id, items: []}", "palette": "UI.palette = true"}
        bad = []
        # 2.1: PT's own automatic steps (started by opening the project) write actions of their own; they are off here, so a new action is a key's
        pg.evaluate("WS.settings.autoJobs = false"); pg.wait_for_timeout(1500)
        for name, js in dialogs.items():
            pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; setPhase('require'); {js}; render(); }})()"); pg.wait_for_timeout(120)
            try: pg.wait_for_function("AI.running.size === 0", timeout=20000)
            except Exception: pass
            pg.wait_for_timeout(1200)   # a step started just before the switch-off ends first
            before = pg.evaluate("({m: UI.modal && UI.modal.kind, pal: !!UI.palette, acts: arr(curP().acts).filter(a => !a.undone).length, ph: curP().focus.ph})")
            for k in ["?", "Backspace", "y", "n", "j", "k", "a", "1"]:
                pg.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
                pg.keyboard.press(k); pg.wait_for_timeout(60)
                now_ = pg.evaluate("({m: UI.modal && UI.modal.kind, pal: !!UI.palette, acts: arr(curP().acts).filter(a => !a.undone).length, ph: curP().focus.ph})")
                if now_ != before: bad.append([name, k, before, now_]); pg.evaluate(f"(() => {{ {js}; render(); }})()")
            pg.evaluate("UI.modal = null; UI.review = null; UI.palette = false; render()")
        pg.evaluate("delete WS.settings.autoJobs")
        check("2 keys: with a dialog or page open, global keys change nothing", not bad, bad[:4])

    # 3 switching projects
    if on("3") and len(PIDS) > 1:
        r = pg.evaluate(f"""(() => {{ openProject('{PIDS[0]}'); const p = curP(); const anyRef = (arr(p.requirements)[0] && 'req:' + p.requirements[0].id) || 'ns';
          Object.assign(UI, {{inspRef: anyRef, qFind: 'zz', rawOpen: true, rawText: 'x', planOpen: true, qSel2: {{pid: p.id, keys: {{a: 1}}}}, explainOnce: 'x'}});
          openProject('{PIDS[1]}'); const left = {{}}; for (const k of ['inspRef','qFind','rawOpen','rawText','planOpen','explainOnce']) if (UI[k]) left[k] = UI[k]; if (UI.qSel2 && UI.qSel2.pid !== curP().id && Object.keys(UI.qSel2.keys || {{}}).length) left.qSel2 = 1; return left; }})()""")
        check("3 switch: another project starts with a clean panel, filter, selection and editor", not r, r)

    # 4 persistence: save everything, reload, compare
    if on("4"):
        pg.evaluate("(async () => { for (const p of WS.projects){ touch(p); try{ await saveProject(p); }catch(e){} } saveWs(); })()"); pg.wait_for_timeout(2500)
        dump = lambda page: page.evaluate("(vol) => JSON.stringify(WS.projects.map(p => { const o = JSON.parse(JSON.stringify(p)); for (const k of vol) delete o[k]; delete o.acts; return o; }).sort((a, b) => a.id < b.id ? -1 : 1))", VOLATILE)
        d1 = dump(pg)
        seed2 = pg.evaluate("JSON.stringify(window.__mockdb())")   # the mock's whole database after the saves (a reload of a real page reads the same)
        ctx2 = b.new_context(viewport={"width": 1440, "height": 900}); ctx2.add_init_script("if (window === window.top) window.__seed = " + seed2 + ";"); ctx2.add_init_script(MOCK)
        pg2 = open_page(ctx2); pg2.wait_for_timeout(800)
        d2 = dump(pg2)
        a, c = json.loads(d1), json.loads(d2)
        if json.dumps(a, sort_keys=True) != json.dumps(c, sort_keys=True):   # key order does not matter, values do
            diffs = [] if len(a) == len(c) else ["projects: %d before, %d after reload" % (len(a), len(c))]
            for x, y in zip(a, c):
                for k in sorted(set(x) | set(y)):
                    if json.dumps(x.get(k), sort_keys=True) != json.dumps(y.get(k), sort_keys=True): diffs.append(str(x.get("name", "?")) + "." + k)
            check("4 persist: every project field survives save + reload", False, diffs[:12])
        else: check("4 persist: every project field survives save + reload", True)
        ctx2.close()

    # 5 + 6 undo of AI actions on every screen of one project with data, and honest Undo toasts
    if on("5", "6"):
        pid = pg.evaluate("WS.projects.slice().sort((a, b) => goalOf(b).criteria.length - goalOf(a).criteria.length)[0].id")
        aiacts = pg.evaluate("Object.keys(ACTIONS).filter(k => /costGuard|runAI|await ai[A-Z]|loopStart|loopRule|variantsFrom/.test(String(ACTIONS[k])))")
        SKIP = re.compile(r"publish|release|runner|pilot|live|launch|delete|reset|import|export|engine|kp-|research|scan|recap|tool-report")
        undo_bad, toast_bad, tried = [], [], 0
        snap = "(vol) => { const o = JSON.parse(JSON.stringify(curP())); for (const k of [...DIFF_SKIP, ...vol]) delete o[k]; const prune = x => { if (x && typeof x === 'object' && !Array.isArray(x)){ for (const k of Object.keys(x)){ prune(x[k]); const v = x[k]; if (v == null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length) || v === '') delete x[k]; } } else if (Array.isArray(x)) x.forEach(prune); }; prune(o); return JSON.stringify(o); }"   # empty objects/lists made outside an action are not a difference
        # 1.8.0: "idle" = no AI call and no job PT started since `j0` still on its way, for 1.2 s (PT's automatic steps start 300 / 600 / 900 ms
        # after the step before, a research job takes a few seconds); with half a second the check sometimes read a half-finished chain
        def settle(j0):
            for n_ in range(60):
                try: pg.wait_for_function("AI.running.size === 0", timeout=20000)
                except Exception: pass
                pg.wait_for_timeout(1200)
                if pg.evaluate("(j0) => AI.running.size === 0 && (!arr(WS.jobs).some(j => j && !j0.includes(j.id) && !j.applied && j.status !== 'notsent') || %d > 8)" % n_, j0): break
        for js in SCREENS(pid):
            pg.evaluate(js); pg.wait_for_timeout(100)
            vis = pg.evaluate("(ai) => [...new Set([...document.querySelectorAll('.app [data-a]')].filter(e => e.offsetParent && !e.disabled).map(e => e.dataset.a))].filter(a => ai.includes(a))", aiacts)
            for a in vis:
                if SKIP.search(a): continue
                jn = pg.evaluate("arr(WS.jobs).map(j => j && j.id)"); pg.evaluate(js); pg.wait_for_timeout(60)
                settle(jn)   # 1.8.0: opening a step starts PT's own automatic steps (300-900 ms later); they belong to the visit, not to the click
                pg.evaluate("(() => { const p = curP(); for (const f of ['loopOf', 'goalOf', 'problemOf', 'engineOf']) try{ if (typeof window[f] === 'function') window[f](p); }catch(e){} })()")   # default states (loop idle) exist before, as they would after any visit
                before = pg.evaluate(snap, VOLATILE); n0 = pg.evaluate("arr(curP().acts).map(a => a.id)"); j0 = pg.evaluate("arr(WS.jobs).map(j => j && j.id)")
                pg.evaluate("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")   # a toast from the visit is not the click's
                pg.evaluate("(a) => { const e = [...document.querySelectorAll('.app [data-a=\"' + a + '\"]')].find(e => e.offsetParent && !e.disabled); if (e) e.click(); }", a)
                pg.wait_for_timeout(150)
                if pg.evaluate("!!(UI.modal && UI.modal.kind === 'cost')"): pg.evaluate("ACTIONS['cost-go'] && ACTIONS['cost-go']({dataset: {v: 'once'}})")
                # 1.6.0: automatic steps chain with short gaps between AI calls; wait until PT has been idle for a while
                settle(j0)
                pg.wait_for_timeout(150)
                # 6: a toast Undo must belong to a fresh action
                tb = pg.evaluate("(() => { const b = [...document.querySelectorAll('#toasts .toast button')].find(x => /undo|rückg|撤销/i.test(x.textContent)); if (!b) return null; const u = b.dataset.undo; if (!u) return -2; /* 2.1: an Undo names what it undoes (an action id or a rows event) */ const p = curP(); if (u.startsWith('rows:')) return 0; /* a rows step's Undo: the rows log is looked up by rowsUndo itself */ const a = arr(p.acts).find(x => x.id === u); return a ? Date.now() - new Date(a.at).getTime() : -1; })()")
                if tb is not None and (tb < 0 or tb > 6000): toast_bad.append([a, tb])
                if MUT == "6" and toast_bad: break   # J4: caught
                pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null; render()")
                after = pg.evaluate(snap, VOLATILE)
                if after == before: continue
                tried += 1
                # 1.6.0: a click may be followed by PT's automatic steps (its own actions); Undo takes back everything the click set off, newest first
                res = pg.evaluate("""(ids) => { const p = curP(); actClose(p.id); const live = arr(p.acts).filter(a => !a.undone && !ids.includes(a.id) && a.label !== t('u14.loose')).reverse(); /* the hunt's own default-state call is a loose change, not the click's */ if (!live.length) return 'no action'; const out = []; for (const a of live){ const ok = undoAct(p, a.id); out.push((ok ? '' : 'undo refused: ') + a.label); } return out.join(' / '); }""", n0)
                pg.wait_for_timeout(300)
                back = pg.evaluate(snap, VOLATILE)
                if back != before:
                    x, y = json.loads(before), json.loads(back)
                    ks = [k for k in sorted(set(x) | set(y)) if json.dumps(x.get(k), sort_keys=True) != json.dumps(y.get(k), sort_keys=True)][:6]; undo_bad.append([a, res, ks, {k: [json.dumps(x.get(k))[:160], json.dumps(y.get(k))[:160]] for k in ks[:2]}])
                    if MUT == "5": break   # J4: caught
                pg.evaluate("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")
            if (MUT == "5" and undo_bad) or (MUT == "6" and toast_bad): break
        if on("5"): check(f"5 undo: Undo of each AI action brings the project back exactly ({tried} actions tried)", not undo_bad, undo_bad[:6])
        if on("6"): check("6 toast-undo: every Undo in a toast belongs to an action that just happened", not toast_bad, toast_bad[:6])
    if on(*[str(n) for n in range(1, 7)]): ctx.close()

    # 7 partial data: half-filled objects render on every screen at every level
    if on("7", "8", "9", "10"):
        ctx, pg = fresh(b)
        PIDS = pg.evaluate("WS.projects.map(p => p.id)")
    if on("7"):
        pid = PIDS[0]
        keys = pg.evaluate(f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); return Object.keys(p).filter(k => p[k] && typeof p[k] === 'object' && !Array.isArray(p[k]) && !['acts','restore','versions','releases','marks','step','focus','seal','intake','northStar','pkg','arch','goal'].includes(k)); }})()")
        crash = []
        for k in keys + ["problem", "loop", "judgeCal", "candidate", "trace", "live", "plan"]:
            for shape in ["{}", "{x: 1}"]:
                n0 = len(errors)
                pg.evaluate(f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); p.__keep = p.__keep || {{}}; if (!('{k}' in p.__keep)) p.__keep['{k}'] = p['{k}']; p['{k}'] = {shape}; normalizeProject(p); }})()")
                for lv in ["learn", "pro"]:
                    for js in SCREENS(pid)[::2]:
                        try: pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; {js}; }})()")
                        except Exception as e: errors.append(str(e)[:200])
                if len(errors) > n0: crash.append([k, shape, errors[n0][:160]])
                pg.evaluate(f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); p['{k}'] = p.__keep['{k}']; }})()")
                if MUT == "7" and crash: break
            if MUT == "7" and crash: break
        pg.evaluate(f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); delete p.__keep; }})()")
        check("7 partial data: every screen renders with empty or half-filled objects", not crash, crash[:6])

    # 8 a brand-new project, every step, mode and level
    if on("8"):
        n0 = len(errors)
        pg.evaluate("(() => { const p = blankProject ? blankProject('Hunt test') : null; if (p){ WS.projects.push(p); } })()")
        npid = pg.evaluate("(WS.projects.find(x => x.name === 'Hunt test') || {}).id")
        if npid:
            for lv in ["learn", "guided", "pro"]:
                for js in SCREENS(npid):
                    try: pg.evaluate(f"(() => {{ WS.settings.help = '{lv}'; {js}; }})()")
                    except Exception as e: errors.append(str(e)[:200])
            check("8 empty project: every step, mode and level renders", len(errors) == n0, errors[n0:n0 + 3])
            pg.evaluate(f"(() => {{ WS.projects = WS.projects.filter(x => x.id !== '{npid}'); }})()")
        else: check("8 empty project: blankProject exists", False)

    # 9 languages
    if on("9"):
        raw = []
        for lang in ["de", "zh"]:
            for js in SCREENS(PIDS[0])[:6]:
                pg.evaluate(f"(() => {{ LANG = '{lang}'; WS.settings.help = 'learn'; {js}; }})()"); pg.wait_for_timeout(60)
                raw += [lang + ":" + x for x in pg.evaluate(RAWKEY)]
                if lang == "de" and "ß" in pg.evaluate("document.querySelector('.app').innerText"): raw.append("de:ß")
        pg.evaluate("LANG = WS.settings.lang || 'en'; render()")
        check("9 languages: no raw string keys and no ß in German", not raw, sorted(set(raw))[:10])

    # 10 migrations run once
    if on("10"):
        migs = pg.evaluate("Object.getOwnPropertyNames(window).filter(k => /^migrate\\d+$/.test(k) && typeof window[k] === 'function')")
        again = pg.evaluate("(m) => WS.projects.flatMap(p => m.map(f => { const r = window[f](p); return r ? f + ':' + p.name : null; })).filter(Boolean)", migs)
        check(f"10 migrations: a second run changes nothing ({', '.join(migs)})", not again, again[:6])
    if on("7", "8", "9", "10"): ctx.close()

    # 11-15 (1.4.2): menus, duplicate ids, squeezed text, go-to, you-are-here
    if on("11", "12", "13", "14", "15"):
        ctx, pg = fresh(b)
        PIDS = pg.evaluate("WS.projects.map(p => p.id)")
    MENUS = r"""(() => new Promise(async res => { const bad = []; const ds = [...document.querySelectorAll('.app details')].filter(d => d.querySelector(':scope > .menu') && d.offsetParent).slice(0, 6);
      for (const d of ds){ d.scrollIntoView({block: 'end'}); d.querySelector('summary').click(); await new Promise(r => setTimeout(r, 60));
        for (const it of d.querySelectorAll(':scope > .menu > .mi, :scope > .menu > button')){ const r = it.getBoundingClientRect(); if (!r.width) continue; const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (r.bottom > innerHeight || r.top < 0 || !(h === it || it.contains(h))) bad.push((it.textContent || '').trim().slice(0, 30)); }
        d.open = false; await new Promise(r => setTimeout(r, 20)); } res(bad); }))()"""
    DUPS = r"""(() => { const c = {}; for (const e of document.querySelectorAll('[id]')) c[e.id] = (c[e.id] || 0) + 1; return Object.keys(c).filter(k => c[k] > 1).slice(0, 5); })()"""
    SQ = r"""(() => { const out = [];
      for (const e of [...document.querySelectorAll('.app button, .app .chip, .app h2, .app h3, .app h4, .app label, .app .sub, .app .title, .app .ititle, .app .sn, .app span.small, .app p, .app .hint')].filter(e => e.offsetParent)){
        const txt = (e.innerText || '').trim(); if (!txt || txt.length > 200 || /\n/.test(txt)) continue; const words = txt.split(/\s+/).filter(Boolean); const r = e.getBoundingClientRect(); if (r.width < 2) continue;
        const tops = new Set(); const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())){ if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const x of rg.getClientRects()) if (x.width > 1) tops.add(Math.round(x.top / 4)); }
        const fs = parseFloat(getComputedStyle(e).fontSize) || 13;
        if ((words.length >= 2 && tops.size >= words.length && r.width < 200) || (txt.length >= 12 && r.width < fs * 6 && tops.size >= 3)) out.push(txt.slice(0, 30) + ' @' + Math.round(r.width) + 'px');
      } return out.slice(0, 4); })()"""
    if on("11", "12", "13"):
        menu_bad, dup_bad, sq_bad = [], [], []
        for w, insp in ((1440, False), (1024, True), (390, False)):
            pg.set_viewport_size({"width": w, "height": 900 if w > 700 else 800})
            for pid in PIDS:
                for js in SCREENS(pid):
                    pg.evaluate(js)
                    if insp: pg.evaluate("(() => { const b = document.querySelector('.app [data-a=insp-open]'); b && b.click(); })()")
                    pg.wait_for_timeout(60)
                    where = pg.evaluate("(() => (curP() ? curP().name.slice(0, 14) : '') + ' ' + (UI.home ? 'home' : curP().focus.ph + '/' + curP().mode))()") + f" @{w}"
                    if on("12"):
                        d = pg.evaluate(DUPS)
                        if d: dup_bad.append([where, d])
                    if on("13"):
                        q = pg.evaluate(SQ)
                        if q: sq_bad.append([where, q])
                    if w != 390 and on("11"):
                        m = pg.evaluate(MENUS)
                        if m: menu_bad.append([where, m])
                    if MUT and (menu_bad or dup_bad or sq_bad): break
                if MUT and (menu_bad or dup_bad or sq_bad): break
            # an item box opened from the inspector is on the screen once
            pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; pgShowPhase(curP(), 'assume'); setPhase('assume'); render(); }})()")
            ref = pg.evaluate("(() => { const a = curP().assumptions[0]; return a ? 'assumption:' + a.id : null; })()")
            if ref and on("12"):
                pg.evaluate(f"(() => {{ UI.open.add('{ref}'); render(); const b = document.querySelector('[data-a=insp-open][data-ref=\"{ref}\"]'); b && b.click(); }})()"); pg.wait_for_timeout(80)
                pg.evaluate("(() => { const bs = [...document.querySelectorAll('.insp [data-a=item-tool][data-k=refine]')]; bs[0] && bs[0].click(); })()"); pg.wait_for_timeout(80)
                d = pg.evaluate(DUPS)
                if d: dup_bad.append(["item box from the inspector @" + str(w), d])
            if MUT and (menu_bad or dup_bad or sq_bad): break
        pg.set_viewport_size({"width": 1440, "height": 900})
        if on("11"): check("11 menus: every menu entry is visible and clickable", not menu_bad, menu_bad[:4])
        if on("12"): check("12 one box: no element id appears twice on a screen", not dup_bad, dup_bad[:4])
        if on("13"): check("13 squeeze: no text squeezed to one word or letter per line", not sq_bad, sq_bad[:4])
    # 14: a landing is a target you can see — the item on screen, or the side panel showing it. 2.1 (J2): the "top of this step" toast
    # is no longer accepted: it is what a dead jump says (known 1), so counting it hid every dead jump target.
    LAND = r"""(ref) => new Promise(res => setTimeout(() => { const el = refEl(ref); const r = el && el.getBoundingClientRect();
      res(!!(el && r.bottom > 0 && r.top < innerHeight) || (UI.drawer && UI.inspRef === ref && !!document.querySelector('.insp .insp-title'))); }, 1600))"""
    if on("14"):
        go_bad = []
        for mode in ["pick", "chat"]:   # 2.0: the two faces (the 1.x views are gone), switched as a person does (face20Set)
            for pid in PIDS:
                seen = set()
                for ref, kind in pg.evaluate(f"(() => {{ openProject('{pid}'); return queueOf(curP()).map(x => [x.ref, x.kind]); }})()"):
                    if kind in seen: continue
                    seen.add(kind)
                    pg.evaluate(f"(ref) => {{ UI.modal = null; UI.drawer = false; UI.inspRef = null; face20Set(curP(), '{mode}'); UI.home = false; render(); document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); goRef(ref); }}", ref)
                    if not pg.evaluate(LAND, ref):
                        attop = pg.evaluate("[...document.querySelectorAll('#toasts .toast')].some(x => x.textContent.includes(t('nav.attop')))")
                        go_bad.append([mode, kind, ref] + (["dead jump: only the 'top of this step' toast"] if attop else []))
                        if MUT: break
                if MUT and go_bad: break
            if MUT and go_bad: break
        # 2.1 C1 (known 1) built: a queue item or a known section the faces have no element for lands in the side panel. Never weaken.
        check("14 go-to: every kind of open item lands visibly in both faces", not go_bad, go_bad[:40])
    if on("15"):
        here_bad = []
        for ph in PHASES:   # 2.0: the stage strip (both faces) marks exactly the stage the project is at
            pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); face20Set(curP(), 'chat'); pgShowPhase(curP(), '{ph}'); setPhase('{ph}'); ACTIONS['home'](); render(); }})()")
            h = pg.evaluate("(() => { const s = [...document.querySelectorAll('.c20 .st20-s.now')]; return s.length === 1 && s[0].textContent.includes(t('st20.s.' + stage20Of(curP()))) ? 'ok' : s.length; })()")
            if h != "ok": here_bad.append([ph, h])
        pg.evaluate("face20Set(curP(), 'pick')")
        check("15 you are here: the stage strip marks the one stage the project is at", not here_bad, here_bad[:4])
    if on("11", "12", "13", "14", "15"): ctx.close()

    # 16-21 (1.4.2, from the bug history since 1.0): typed text, honest "done", broken AI answers, failed loads, document size, removed items
    # 16 typed text survives a background render (lost text was the most frequent complaint since 1.0)
    if on("16"):
        ctx, pg = fresh(b)
        PIDS = pg.evaluate("WS.projects.map(p => p.id)")
        TYPE = r"""(() => { const seen = e => e.offsetParent && (!e.checkVisibility || e.checkVisibility({visibilityProperty: true}));
          for (const d of document.querySelectorAll('.app details:not([open])')) if (!d.querySelector(':scope > .menu')) d.open = true;   // open the panels, as a person would, to reach every box
          const vis = [...document.querySelectorAll('.app input[type=text], .app input:not([type]), .app textarea')].filter(e => seen(e) && !e.readOnly && !e.disabled).slice(0, 6);
          const keys = vis.map((e, i) => ({i, id: e.id, bind: e.getAttribute('data-bind'), before: e.value}));
          for (const e of vis){ e.focus(); document.execCommand('insertText', false, ' zq'); }
          const last = vis[vis.length - 1]; if (last) last.focus();
          render();
          const now = [...document.querySelectorAll('.app input[type=text], .app input:not([type]), .app textarea')].filter(e => e.offsetParent && !e.readOnly && !e.disabled);
          const bad = [];
          for (const k of keys){ const e = k.id ? document.getElementById(k.id) : k.bind ? document.querySelector('[data-bind="' + CSS.escape(k.bind) + '"]') : now[k.i];
            if (!e || !String(e.value).includes('zq')) bad.push((k.id || k.bind || ('#' + k.i)).slice(0, 40)); }
          const a = document.activeElement; if (last && !(a && (a === last || (last.id && a.id === last.id) || (last.getAttribute('data-bind') && a.getAttribute('data-bind') === last.getAttribute('data-bind'))))) bad.push('focus lost');
          return bad; })()"""
        type_bad = []
        for pid in PIDS[:2]:
            for js in SCREENS(pid):
                pg.evaluate(js); pg.wait_for_timeout(50)
                r = pg.evaluate(TYPE)
                if r: type_bad.append([pg.evaluate("curP() ? curP().focus.ph + '/' + curP().mode : ''"), r[:3]])
                if MUT and type_bad: break
            if MUT and type_bad: break
        check("16 typing: text typed into any box survives a background render, with the cursor kept", not type_bad, type_bad[:5])
        ctx.close()
    if on("17", "18", "20", "21"):
        ctx, pg = fresh(b)
    # 17 one truth for "done": a step shown as done has nothing blocking open, and copying is only unlocked without blockers
    if on("17"):
        done_bad = pg.evaluate("""(phs) => { const out = []; for (const p of WS.projects){ const q = queueOf(p);
            for (const ph of phs){ const st = stepInfo(p, ph).state; if (st === 'done' && q.some(x => x.ph === ph && x.cls === 'block')) out.push(p.name.slice(0, 14) + ':' + ph); }
            if (typeof copyUnlocked === 'function' && copyUnlocked(p) && blockingItems(p).length) out.push(p.name.slice(0, 14) + ': copy unlocked with blockers'); } return out; }""", PHASES)
        nblock = pg.evaluate("WS.projects.reduce((s, p) => s + blockingItems(p).length, 0)")
        check("17 done: a step shown as done has no blocking item, and copying never unlocks with blockers", not done_bad, done_bad[:6])
        if not nblock: print("note  17 ran on data without a single blocking item: it proves nothing here (the planted bug cannot turn it red)", flush=True)
    # 18 broken AI answers (empty, not JSON, wrong shapes) never crash a screen or damage the project
    if on("18"):
        SHAPE = r"""(() => { const p = curP(); const lists = ['requirements','tests','risks','assumptions','findings','qa','runs']; const bad = lists.filter(k => p[k] != null && !Array.isArray(p[k]));
          const g = p.goal || {}; if (g.criteria != null && !Array.isArray(g.criteria)) bad.push('goal.criteria'); if (g.examples != null && !Array.isArray(g.examples)) bad.push('goal.examples');
          const s = JSON.stringify(p); if (/\bNaN\b|"undefined"|\[object Object\]/.test(s)) bad.push('NaN/undefined/[object Object] in data'); return bad; })()"""
        ai_bad, e0, tried18 = [], len(errors), 0
        pid = pg.evaluate("WS.projects.slice().sort((a, b) => arr(b.requirements).length - arr(a.requirements).length)[0].id")
        aiacts18 = pg.evaluate("Object.keys(ACTIONS).filter(k => /costGuard|runAI|await ai[A-Z]|loopStart|loopRule|variantsFrom/.test(String(ACTIONS[k])))")
        SKIP18 = re.compile(r"publish|release|runner|pilot|live|launch|delete|reset|import|export|engine|kp-|research|scan|recap|tool-report")
        for i, js in enumerate(SCREENS(pid)):
            pg.evaluate(js); pg.wait_for_timeout(60)
            vis = pg.evaluate("(ai) => [...new Set([...document.querySelectorAll('.app [data-a]')].filter(e => e.offsetParent && !e.disabled).map(e => e.dataset.a))].filter(a => ai.includes(a))", aiacts18)
            for a in [x for x in vis if not SKIP18.search(x)][:3]:
                mode = ["empty", "junk", "wrong"][tried18 % 3]; tried18 += 1
                pg.evaluate(f"window.__mockGarbage = '{mode}'"); pg.evaluate(js); pg.wait_for_timeout(40)
                pg.evaluate("(a) => { const e = [...document.querySelectorAll('.app [data-a=\"' + a + '\"]')].find(e => e.offsetParent && !e.disabled); if (e) e.click(); }", a)
                pg.wait_for_timeout(150)
                if pg.evaluate("!!(UI.modal && UI.modal.kind === 'cost')"): pg.evaluate("ACTIONS['cost-go'] && ACTIONS['cost-go']({dataset: {v: 'once'}})")
                try: pg.wait_for_function("AI.running.size === 0", timeout=15000)
                except Exception: ai_bad.append([a, mode, "still running after 15 s"])
                try:
                    pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null; window.__mockGarbage = null; render()")
                    sh = pg.evaluate(SHAPE)
                except Exception as e: sh = ["the screen crashed: " + str(e).splitlines()[0][:120]]   # 2.1: a crash is this check's finding, not the end of the hunt
                if sh: ai_bad.append([a, mode, sh])
                if len(errors) > e0: ai_bad.append([a, mode, errors[e0][:120]]); e0 = len(errors)
                if MUT and ai_bad: break
            if MUT and ai_bad: break
        pg.evaluate("window.__mockGarbage = null")
        check(f"18 broken AI answers: no crash, no hang, no damaged data ({tried18} actions tried)", not ai_bad, ai_bad[:6])
        del errors[len(errors):]
    # 20 every stored document stays well under the 256 KiB limit (a too-big document cannot be saved at all)
    if on("20"):
        pg.evaluate("(async () => { for (const p of WS.projects){ touch(p); try{ await saveProject(p); }catch(e){} } })()"); pg.wait_for_timeout(2500)
        big = pg.evaluate("(() => { const d = window.__mockdb(); return Object.entries(d).map(([k, v]) => [k, new TextEncoder().encode(JSON.stringify(v)).length]).filter(x => x[1] > 220000).slice(0, 5); })()")
        check("20 size: every stored document is under 220 KB (limit 256 KiB)", not big, big)
    # 21 removing an item leaves no reference to it anywhere (tests, criteria, loop, flags, marks, links)
    if on("21"):
        rm_bad = pg.evaluate("""(() => { const out = []; for (const p of WS.projects){ openProject(p.id);
            for (const [k, list] of Object.entries(ITEM_LIST)){ const it = arr(p[list])[0]; if (!it) continue; const ref = k + ':' + it.id;
              ACTIONS['item-remove']({dataset: {ref}});
              const o = JSON.parse(JSON.stringify(curP())); for (const h of REF_HISTORY) delete o[h]; delete o.marks; delete o.m14; delete o.m141; const M2 = o.map20; delete o.map20; delete o.m200; if (M2) o.map20refs = [arr(M2.neutral), Object.keys(M2.tags || {})];   /* 2.0: a route's id R1 is not requirement R1; the map names items only in neutral and tags (the move's record holds field hashes) */
              const NOTREF = new Set(['rung', 'tier', 'level', 'effort', 'model']); let hits = 0;   // "R1" as a rung is a level, not requirement R1
              const walk = (x, k) => { if (NOTREF.has(k)) return; if (Array.isArray(x)) x.forEach(y => walk(y, k)); else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, kk); else if (x === it.id || x === ref) hits++; }; walk(o, '');
              if (hits) out.push(p.name.slice(0, 14) + ' ' + ref + ' ×' + hits);
              try{ render(); }catch(e){ out.push(ref + ' render: ' + e.message); } } } return out; })()""")
        check("21 remove: a removed item leaves no reference behind and every screen still renders", not rm_bad, rm_bad[:6])
    if on("17", "18", "20", "21"): ctx.close()
    # 19 a failed read at start never writes over the stored data
    if on("19"):
        ctx = new_ctx(b); ctx.add_init_script("window.__mockFailGet = true;")
        if MUT == "19": ctx.add_init_script(MUTATIONS["19"])
        pg = ctx.new_page(); pg.goto(U); pg.wait_for_timeout(900)
        try: pg.locator(f'.ws-opt[data-id="{_ws_order()[0]}"]').click(timeout=3000)   # 1.7.1: by the data's last-used workspace, never a name
        except Exception: pass
        pg.wait_for_timeout(2500)
        w19 = pg.evaluate("({writes: window.__mockWrites || 0, fatal: !!(window.UI && UI.fatal), locked: !!document.querySelector('.lock')})")
        check("19 failed load: a failed read at start shows a retry and writes nothing", w19["writes"] == 0, w19)
        ctx.close()
    b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:8]: print("  ERR", e)
sys.exit(1 if fails or errors else 0)
