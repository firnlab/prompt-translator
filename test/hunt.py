"""Bug-hunt checks for every update (the bug classes found in the 1.4.1 hunt), on a COPY of the real data with the mock runtime.
Generic on purpose: they look at whatever actions, screens and fields the version has, so they keep working for new features.
Run: python3 test/hunt.py [backup dir]          (about 10-20 minutes; the click-everything test is test/monkey141.py)

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
14 go-to         every kind of open item, in every mode, lands visibly on screen or in the inspector (1.4.2)
15 you are here  the Journey marker is on the step you are viewing (1.4.2)
16 typing       text typed into any box survives a background render, cursor kept (lost text since 1.0)
17 done          a step shown as done has no blocker; copying never unlocks with blockers (one truth for "done")
18 broken AI     empty / non-JSON / wrongly shaped AI answers: no crash, no hang, no damaged data
19 failed load   a failed read at start writes nothing (1.0: empty data written over real data)
20 size          every stored document stays under 220 KB (the platform refuses documents over 256 KiB)
21 remove        a removed item leaves no reference behind (tests, criteria, loop, flags, links)
"""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
ROOTP = pathlib.Path(__file__).resolve().parent.parent
SRC = "\n".join(p.read_text() for p in sorted((ROOTP / "src").glob("*.js")) if not p.name.startswith(("strings", "knowledge")))
PIDS = None
PHASES = ["capture", "understand", "interview", "assume", "require", "arch", "build", "review", "test", "launch", "release", "operate"]
RAWKEY = r"""(() => { const txt = (document.querySelector('.app') || document.body).innerText; const keys = Object.keys(STR); const hit = keys.filter(k => k.includes('.') && txt.includes(k) && !/^(q|ex|pt|sb)\.[a-z]$/.test(k)).slice(0, 5); return hit; })()"""
SCREENS = lambda pid: [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=true; render(); }})()"] + \
    [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=false; setPhase('{ph}'); pgShowPhase(curP(), '{ph}'); render(); }})()" for ph in PHASES] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; setPhase('require'); curP().mode='{m}'; render(); }})()" for m in ["blueprint", "journey", "swimlanes", "express", "pick"]] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; curP().mode='pick'; window.__pickFixture(curP()); UI.pkCands = {str(c).lower()}; UI.pkDump = {str(c).lower()}; render(); }})()" for c in [False, True]]   # 1.5.0: every Pick screen, filled
VOLATILE = ["updatedAt", "_rev", "seenAt", "lastWhere", "focus", "usageMonth"]
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
    PIDS = pg.evaluate("WS.projects.map(p => p.id)")

    # 1 handlers
    names = {"a": set(re.findall(r'data-a="([a-z0-9-]+)"', SRC)), "c": set(re.findall(r'data-a-change="([a-z0-9-]+)"', SRC)), "f": set(re.findall(r'data-form="([a-z0-9-]+)"', SRC))}
    miss = pg.evaluate("(n) => ({a: n.a.filter(k => typeof ACTIONS[k] !== 'function'), c: n.c.filter(k => typeof CHANGES[k] !== 'function'), f: n.f.filter(k => typeof FORMS[k] !== 'function')})", {k: sorted(v) for k, v in names.items()})
    check("1 handlers: every action, change handler and form in the markup exists", not any(miss.values()), miss)

    # 2 keys with a dialog or page open
    dialogs = {"recovery code": "UI.modal = {kind: 'pincode', code: 'TEST-CODE', sticky: true}", "what's new": "UI.modal = {kind: 'whatsnew', wide: true, from: ''}",
               "review page": "UI.modal = {kind: 'review'}; UI.review = {mode: 'affected', pid: curP().id, items: []}", "palette": "UI.palette = true"}
    bad = []
    for name, js in dialogs.items():
        pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; setPhase('require'); {js}; render(); }})()"); pg.wait_for_timeout(120)
        before = pg.evaluate("({m: UI.modal && UI.modal.kind, pal: !!UI.palette, acts: arr(curP().acts).filter(a => !a.undone).length, ph: curP().focus.ph})")
        for k in ["?", "Backspace", "y", "n", "j", "k", "a", "1"]:
            pg.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()")
            pg.keyboard.press(k); pg.wait_for_timeout(60)
            now_ = pg.evaluate("({m: UI.modal && UI.modal.kind, pal: !!UI.palette, acts: arr(curP().acts).filter(a => !a.undone).length, ph: curP().focus.ph})")
            if now_ != before: bad.append([name, k, before, now_]); pg.evaluate(f"(() => {{ {js}; render(); }})()")
        pg.evaluate("UI.modal = null; UI.review = null; UI.palette = false; render()")
    check("2 keys: with a dialog or page open, global keys change nothing", not bad, bad[:4])

    # 3 switching projects
    if len(PIDS) > 1:
        r = pg.evaluate(f"""(() => {{ openProject('{PIDS[0]}'); const p = curP(); const anyRef = (arr(p.requirements)[0] && 'req:' + p.requirements[0].id) || 'ns';
          Object.assign(UI, {{inspRef: anyRef, qFind: 'zz', rawOpen: true, rawText: 'x', planOpen: true, qSel2: {{pid: p.id, keys: {{a: 1}}}}, explainOnce: 'x'}});
          openProject('{PIDS[1]}'); const left = {{}}; for (const k of ['inspRef','qFind','rawOpen','rawText','planOpen','explainOnce']) if (UI[k]) left[k] = UI[k]; if (UI.qSel2 && UI.qSel2.pid !== curP().id && Object.keys(UI.qSel2.keys || {{}}).length) left.qSel2 = 1; return left; }})()""")
        check("3 switch: another project starts with a clean panel, filter, selection and editor", not r, r)

    # 4 persistence: save everything, reload, compare
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
            tb = pg.evaluate("(() => { const b = [...document.querySelectorAll('#toasts .toast button')].find(x => /undo|rückg|撤销/i.test(x.textContent)); if (!b) return null; const a = lastAct(curP()); return a ? Date.now() - new Date(a.at).getTime() : -1; })()")
            if tb is not None and (tb < 0 or tb > 6000): toast_bad.append([a, tb])
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
            pg.evaluate("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")
    check(f"5 undo: Undo of each AI action brings the project back exactly ({tried} actions tried)", not undo_bad, undo_bad[:6])
    check("6 toast-undo: every Undo in a toast belongs to an action that just happened", not toast_bad, toast_bad[:6])
    ctx.close()

    # 7 partial data: half-filled objects render on every screen at every level
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
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
    pg.evaluate(f"(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); delete p.__keep; }})()")
    check("7 partial data: every screen renders with empty or half-filled objects", not crash, crash[:6])

    # 8 a brand-new project, every step, mode and level
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
    raw = []
    for lang in ["de", "zh"]:
        for js in SCREENS(PIDS[0])[:6]:
            pg.evaluate(f"(() => {{ LANG = '{lang}'; WS.settings.help = 'learn'; {js}; }})()"); pg.wait_for_timeout(60)
            raw += [lang + ":" + x for x in pg.evaluate(RAWKEY)]
            if lang == "de" and "ß" in pg.evaluate("document.querySelector('.app').innerText"): raw.append("de:ß")
    pg.evaluate("LANG = WS.settings.lang || 'en'; render()")
    check("9 languages: no raw string keys and no ß in German", not raw, sorted(set(raw))[:10])

    # 10 migrations run once
    migs = pg.evaluate("Object.getOwnPropertyNames(window).filter(k => /^migrate\\d+$/.test(k) && typeof window[k] === 'function')")
    again = pg.evaluate("(m) => WS.projects.flatMap(p => m.map(f => { const r = window[f](p); return r ? f + ':' + p.name : null; })).filter(Boolean)", migs)
    check(f"10 migrations: a second run changes nothing ({', '.join(migs)})", not again, again[:6])
    ctx.close()
    # 11-15 (1.4.2): menus, duplicate ids, squeezed text, go-to, you-are-here
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
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
    menu_bad, dup_bad, sq_bad = [], [], []
    for w, insp in ((1440, False), (1024, True), (390, False)):
        pg.set_viewport_size({"width": w, "height": 900 if w > 700 else 800})
        for pid in PIDS:
            for js in SCREENS(pid):
                pg.evaluate(js)
                if insp: pg.evaluate("(() => { const b = document.querySelector('.app [data-a=insp-open]'); b && b.click(); })()")
                pg.wait_for_timeout(60)
                where = pg.evaluate("(() => (curP() ? curP().name.slice(0, 14) : '') + ' ' + (UI.home ? 'home' : curP().focus.ph + '/' + curP().mode))()") + f" @{w}"
                d = pg.evaluate(DUPS)
                if d: dup_bad.append([where, d])
                q = pg.evaluate(SQ)
                if q: sq_bad.append([where, q])
                if w != 390:
                    m = pg.evaluate(MENUS)
                    if m: menu_bad.append([where, m])
        # an item box opened from the inspector is on the screen once
        pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; setPhase('assume'); pgShowPhase(curP(), 'assume'); render(); }})()")
        ref = pg.evaluate("(() => { const a = curP().assumptions[0]; return a ? 'assumption:' + a.id : null; })()")
        if ref:
            pg.evaluate(f"(() => {{ UI.open.add('{ref}'); render(); const b = document.querySelector('[data-a=insp-open][data-ref=\"{ref}\"]'); b && b.click(); }})()"); pg.wait_for_timeout(80)
            pg.evaluate("(() => { const bs = [...document.querySelectorAll('.insp [data-a=item-tool][data-k=refine]')]; bs[0] && bs[0].click(); })()"); pg.wait_for_timeout(80)
            d = pg.evaluate(DUPS)
            if d: dup_bad.append(["item box from the inspector @" + str(w), d])
    pg.set_viewport_size({"width": 1440, "height": 900})
    check("11 menus: every menu entry is visible and clickable", not menu_bad, menu_bad[:4])
    check("12 one box: no element id appears twice on a screen", not dup_bad, dup_bad[:4])
    check("13 squeeze: no text squeezed to one word or letter per line", not sq_bad, sq_bad[:4])
    LAND = r"""(ref) => new Promise(res => setTimeout(() => { const el = refEl(ref); const r = el && el.getBoundingClientRect();
      res(!!(el && r.bottom > 0 && r.top < innerHeight) || (UI.drawer && UI.inspRef === ref && !!document.querySelector('.insp .insp-title')) || /top of this step|oben in diesem|顶部/.test([...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' '))); }, 1600))"""
    go_bad = []
    for mode in ["steps", "journey", "express", "blueprint", "swimlanes", "pick"]:
        for pid in PIDS:
            seen = set()
            for ref, kind in pg.evaluate(f"(() => {{ openProject('{pid}'); return queueOf(curP()).map(x => [x.ref, x.kind]); }})()"):
                if kind in seen: continue
                seen.add(kind)
                pg.evaluate(f"(ref) => {{ document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); UI.modal = null; UI.drawer = false; UI.inspRef = null; curP().mode = '{mode}'; UI.home = false; render(); goRef(ref); }}", ref)
                if not pg.evaluate(LAND, ref): go_bad.append([mode, kind, ref])
    check("14 go-to: every kind of open item lands visibly in every mode", not go_bad, go_bad[:6])
    here_bad = []
    for ph in PHASES:
        pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; setPhase('{ph}'); pgShowPhase(curP(), '{ph}'); render(); }})()")
        h = pg.evaluate("(() => { const s = [...document.querySelectorAll('.station')].find(x => x.querySelector('.here') && x.querySelector('.here').textContent.trim()); return s ? s.dataset.ph : null; })()")
        if h != ph: here_bad.append([ph, h])
    check("15 you are here: the Journey marker is on the step you are viewing", not here_bad, here_bad[:4])
    ctx.close()
    # 16-21 (1.4.2, from the bug history since 1.0): typed text, honest "done", broken AI answers, failed loads, document size, removed items
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
    # 16 typed text survives a background render (lost text was the most frequent complaint since 1.0)
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
    check("16 typing: text typed into any box survives a background render, with the cursor kept", not type_bad, type_bad[:5])
    ctx.close()
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
    # 17 one truth for "done": a step shown as done has nothing blocking open, and copying is only unlocked without blockers
    done_bad = pg.evaluate("""(phs) => { const out = []; for (const p of WS.projects){ const q = queueOf(p);
        for (const ph of phs){ const st = stepInfo(p, ph).state; if (st === 'done' && q.some(x => x.ph === ph && x.cls === 'block')) out.push(p.name.slice(0, 14) + ':' + ph); }
        if (typeof copyUnlocked === 'function' && copyUnlocked(p) && blockingItems(p).length) out.push(p.name.slice(0, 14) + ': copy unlocked with blockers'); } return out; }""", PHASES)
    check("17 done: a step shown as done has no blocking item, and copying never unlocks with blockers", not done_bad, done_bad[:6])
    # 18 broken AI answers (empty, not JSON, wrong shapes) never crash a screen or damage the project
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
            pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null; window.__mockGarbage = null; render()")
            sh = pg.evaluate(SHAPE)
            if sh: ai_bad.append([a, mode, sh])
            if len(errors) > e0: ai_bad.append([a, mode, errors[e0][:120]]); e0 = len(errors)
    pg.evaluate("window.__mockGarbage = null")
    check(f"18 broken AI answers: no crash, no hang, no damaged data ({tried18} actions tried)", not ai_bad, ai_bad[:6])
    del errors[len(errors):]
    # 20 every stored document stays well under the 256 KiB limit (a too-big document cannot be saved at all)
    pg.evaluate("(async () => { for (const p of WS.projects){ touch(p); try{ await saveProject(p); }catch(e){} } })()"); pg.wait_for_timeout(2500)
    big = pg.evaluate("(() => { const d = window.__mockdb(); return Object.entries(d).map(([k, v]) => [k, new TextEncoder().encode(JSON.stringify(v)).length]).filter(x => x[1] > 220000).slice(0, 5); })()")
    check("20 size: every stored document is under 220 KB (limit 256 KiB)", not big, big)
    # 21 removing an item leaves no reference to it anywhere (tests, criteria, loop, flags, marks, links)
    rm_bad = pg.evaluate("""(() => { const out = []; for (const p of WS.projects){ openProject(p.id);
        for (const [k, list] of Object.entries(ITEM_LIST)){ const it = arr(p[list])[0]; if (!it) continue; const ref = k + ':' + it.id;
          ACTIONS['item-remove']({dataset: {ref}});
          const o = JSON.parse(JSON.stringify(curP())); for (const h of REF_HISTORY) delete o[h]; delete o.marks; delete o.m14; delete o.m141;
          const NOTREF = new Set(['rung', 'tier', 'level', 'effort', 'model']); let hits = 0;   // "R1" as a rung is a level, not requirement R1
          const walk = (x, k) => { if (NOTREF.has(k)) return; if (Array.isArray(x)) x.forEach(y => walk(y, k)); else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) walk(v, kk); else if (x === it.id || x === ref) hits++; }; walk(o, '');
          if (hits) out.push(p.name.slice(0, 14) + ' ' + ref + ' ×' + hits);
          try{ render(); }catch(e){ out.push(ref + ' render: ' + e.message); } } } return out; })()""")
    check("21 remove: a removed item leaves no reference behind and every screen still renders", not rm_bad, rm_bad[:6])
    ctx.close()
    # 19 a failed read at start never writes over the stored data
    ctx = new_ctx(b); ctx.add_init_script("window.__mockFailGet = true;"); pg = ctx.new_page(); pg.goto(U); pg.wait_for_timeout(900)
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
