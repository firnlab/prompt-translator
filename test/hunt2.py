"""Bug-hunt checks, part 2 (classes from the bug history since 1.0 that hunt.py does not cover). Same harness: a COPY of the real data, mock runtime.
Run: python3 test/hunt2.py [backup dir]          (about 5 minutes)

22 raw text      no screen shows undefined / NaN / [object Object] / null, or an internal id or reference (fd-…, ex-…, req:…)
23 still screen  a background render (save state, AI progress, going online) never moves the screen or changes the step
24 dead clicks   every visible button does something you can see (a screen change, a dialog, a toast, a change in the project)
25 tap targets   on a phone every button and control is at least 24 × 24 px (WCAG 2.2 target size)
26 one count     the Finish button, the per-step counts and the totals show the same open work (one fact, one formula)
27 language      with the screen in one language and the project in another, every AI prompt asks for the project's language (or says it is for the reader)
28 await race    an AI answer that arrives after you switched projects lands in its own project, never in the one on screen
29 integrity     ids are unique in every list; links, tests, criteria and problems point only to items that exist
30 speed         every screen renders in under 250 ms with the biggest project
31 save failure  when saving fails, the screen says so and offers a retry; nothing typed is lost
"""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
PHASES = ["capture", "understand", "interview", "assume", "require", "arch", "build", "review", "test", "launch", "release", "operate"]
SCREENS = lambda pid: [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=true; render(); }})()"] + \
    [f"(() => {{ UI.modal=null; UI.review=null; UI.finish=null; openProject('{pid}'); UI.home=false; setPhase('{ph}'); pgShowPhase(curP(), '{ph}'); render(); }})()" for ph in PHASES] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; setPhase('require'); curP().mode='{m}'; render(); }})()" for m in ["blueprint", "journey", "swimlanes", "express", "pick"]] + \
    [f"(() => {{ UI.modal=null; UI.review=null; openProject('{pid}'); UI.home=false; curP().mode='pick'; window.__pickFixture(curP()); UI.pkCands = {str(c).lower()}; UI.pkDump = {str(c).lower()}; render(); }})()" for c in [False, True]]   # 1.5.0: every Pick screen, filled
WHERE = "(() => (curP() ? curP().name.slice(0, 14) : '') + ' ' + (UI.home ? 'home' : curP().focus.ph + '/' + curP().mode))()"

RAW = r"""(() => { const app = document.querySelector('.app') || document.body; const txt = app.innerText; const out = [];
  { const tw = document.createTreeWalker(app, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())){ if (n.parentElement.closest('pre, code, textarea, .pkgtext, .secbody')) continue; const v = n.nodeValue.trim(); if (/^(undefined|NaN|null|\[object Object\])$|\[object Object\]|(:|=|·)\s*(undefined|NaN|null)\b|\b(undefined|NaN)\s*(%|×|\/|px)/.test(v) || (v.length < 160 && /\{(n|s|x|u|v|r|k|m|d|tier|name)\}/.test(v))) out.push(v.slice(0, 40)); } }
  const p = curP(); const ids = new Set();
  const walk = (o, d) => { if (!o || d > 6) return; if (Array.isArray(o)) return o.forEach(x => walk(x, d + 1)); if (typeof o === 'object') for (const [k, v] of Object.entries(o)){ if (k === 'id' && typeof v === 'string' && v.length >= 6 && /\d/.test(v) && /[a-z]/i.test(v)) ids.add(v); else walk(v, d + 1); } };
  if (p) walk(p, 0);
  for (const id of ids) if (txt.includes(id)) out.push('id ' + id);
  for (const m of txt.matchAll(/\b(req|test|risk|assumption|finding|crit|ex|fs|sec|part|comp):[A-Za-z0-9_-]{2,}/g)) out.push('ref ' + m[0]);
  return [...new Set(out)].slice(0, 5); })()"""

STILL = r"""(() => new Promise(async res => {
  const scrollers = () => { const out = {}; const se = document.scrollingElement; if (se.scrollHeight > se.clientHeight + 200) out.page = se;
    for (const sel of ['.main', '.drawer', '.insp', '.side']){ const e = document.querySelector(sel); if (e && e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)) out[sel] = e; } return out; };
  const sc = scrollers(); for (const e of Object.values(sc)) e.scrollTop = Math.round((e.scrollHeight - e.clientHeight) / 2);
  await new Promise(r => setTimeout(r, 80));
  const before = {}; for (const [k, e] of Object.entries(sc)) before[k] = e.scrollTop;
  const p = curP(), ph = p && p.focus.ph, mode = p && p.mode, home = UI.home;
  render(); await new Promise(r => setTimeout(r, 30));
  try{ setSave('saving'); setSave('saved'); }catch(e){}
  window.dispatchEvent(new Event('online')); render(); await new Promise(r => setTimeout(r, 120)); render(); await new Promise(r => setTimeout(r, 60));
  const now = scrollers(), bad = [];
  for (const k of Object.keys(before)){ const e = now[k]; const v = e ? e.scrollTop : 0; if (Math.abs(v - before[k]) > 6) bad.push(k + ' moved ' + before[k] + '→' + v); }
  if (p && (curP().focus.ph !== ph || curP().mode !== mode || UI.home !== home)) bad.push('step changed');
  res(bad); }))()"""

TAP = r"""(() => { const out = [];
  for (const e of document.querySelectorAll('.app button, .app [data-a], .app summary, .app select, .app input[type=checkbox], .app input[type=radio], .app a[href]')){
    if (!e.offsetParent || (e.checkVisibility && !e.checkVisibility({visibilityProperty: true, opacityProperty: true})) || e.closest('.mdl, .prose, p') && e.tagName === 'A') continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    // WCAG 2.5.8: smaller is fine when a 24 px circle around its centre touches no other target
    if (r.width >= 24 && r.height >= 24) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let near = false;
    for (const o of document.querySelectorAll('.app button, .app [data-a], .app summary, .app select, .app input, .app a[href]')){ if (o === e || o.contains(e) || e.contains(o) || !o.offsetParent) continue;
      const q = o.getBoundingClientRect(); const dx = Math.max(q.left - cx, 0, cx - q.right), dy = Math.max(q.top - cy, 0, cy - q.bottom); if (Math.hypot(dx, dy) < 12){ near = true; break; } }
    if (near) out.push(((e.innerText || e.getAttribute('aria-label') || e.dataset.a || e.tagName).trim().slice(0, 18)) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  for (const e of document.querySelectorAll('.app button, .app [role=button]')){ if (!e.offsetParent || (e.checkVisibility && !e.checkVisibility({visibilityProperty: true, opacityProperty: true}))) continue; const name = (e.innerText || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title'); if (!name) out.push('no name: ' + (e.dataset.a || e.className).slice(0, 24)); }
  return [...new Set(out)].slice(0, 6); })()"""

STATE = r"""(() => { const app = document.querySelector('.app'); const p = curP();
  return [app ? app.innerHTML.length + ':' + app.innerText : '', document.body.innerHTML.length, JSON.stringify({pa: !!UI.palette, ca: !!UI.capture, m: UI.modal && UI.modal.kind, r: !!UI.review, f: !!UI.finish, d: UI.drawer, i: UI.inspRef, h: UI.home, o: [...(UI.open || [])].length, s: UI.sel, t: UI.buildTab, ph: p && p.focus.ph, mo: p && p.mode}),
    p ? JSON.stringify(p).length + ':' + (p.updatedAt || '') : '', [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join('|'), AI.running.size, window.__copied || ''].join('§'); })()"""   # focus on the clicked button is not an effect
DANGER = re.compile(r"delete|del-|remove|reset|publish|release|runner|pilot|live|launch|import|export|logout|lock|wipe|restore|rollback|install|engine|kp-|research|lang|theme|level|quit|close-ws|switch-ws|download")

# check the checks: HUNT_MUTATE=<name> puts one known bug back after the page opens (test/check_the_hunts.py); every hunt2 check must then fail
import os
MUTATIONS = {
    "22": "window.humanIds = function(){};",
    "23": "{ const o = render; window.render = function(...a){ const r = o(...a); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; return r; }; }",
    "24": "ACTIONS['zz-dead'] = () => {}; const o = render; window.render = function(...a){ const r = o(...a); const m = document.querySelector('.main-inner, .main'); if (m && !m.querySelector('[data-a=zz-dead]')) m.insertAdjacentHTML('afterbegin', '<button class=\"btn\" data-a=\"zz-dead\">Looks useful</button>'); return r; };",
    "25": "{ const st = document.createElement('style'); st.textContent = '@media (max-width:700px){ .app button{min-height:0!important;height:16px!important;padding:0 2px!important} }'; document.head.appendChild(st); }",
    "26": "{ const o = queueCounts; window.queueCounts = function(p, s){ const c = o(p, s); c.should += 1; return c; }; }",
    "27": "window.contentLang = function(){ return LANG; };",
    "28": "{ const o = runAI; window.runAI = async function(...a){ const r = await o(...a); const q = curP(); if (q){ q.zzRace = (q.zzRace || 0) + 1; } return r; }; }",
    "29": "{ const p = WS.projects[0]; if (p && p.requirements && p.requirements[1]) p.requirements[1].id = p.requirements[0].id; }",
    "30": "{ const o = render; window.render = function(...a){ const t0 = performance.now(); while (performance.now() - t0 < 300){} return o(...a); }; }",
    "31": "window.setSave = function(){};",
}
def mutate(pg):
    m = os.environ.get("HUNT_MUTATE")
    if m: pg.evaluate("() => { " + MUTATIONS[m] + " }")   # as a function body: a bare expression that ends in a function would be called by evaluate

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); mutate(pg); pg.wait_for_timeout(300)
    PIDS = pg.evaluate("WS.projects.map(p => p.id)")
    # 22 raw text
    raw_bad = []
    for lang in ["en", "zh"]:
        pg.evaluate(f"(() => {{ LANG = '{lang}'; if (WS.settings) WS.settings.lang = '{lang}'; }})()")
        for pid in PIDS:
            for js in SCREENS(pid):
                pg.evaluate(js); pg.wait_for_timeout(40)
                r = pg.evaluate(RAW)
                if r: raw_bad.append([pg.evaluate(WHERE) + " " + lang, r])
    pg.evaluate("(() => { LANG = 'en'; if (WS.settings) WS.settings.lang = 'en'; })()")
    check("22 raw text: no undefined / NaN / [object Object] / internal ids on any screen", not raw_bad, raw_bad[:6])
    # 23 still screen
    still_bad = []
    for w in (1440, 390):
        pg.set_viewport_size({"width": w, "height": 900 if w > 700 else 800})
        for js in SCREENS(PIDS[0]):
            pg.evaluate(js); pg.wait_for_timeout(40)
            r = pg.evaluate(STILL)
            if r: still_bad.append([pg.evaluate(WHERE) + f" @{w}", r])
    check("23 still screen: background renders never move the screen or change the step", not still_bad, still_bad[:6])
    # 25 tap targets on a phone
    tap_bad = []
    pg.set_viewport_size({"width": 390, "height": 800})
    for js in SCREENS(PIDS[0]):
        pg.evaluate(js); pg.wait_for_timeout(40)
        r = pg.evaluate(TAP)
        if r: tap_bad.append([pg.evaluate(WHERE), r])
    pg.set_viewport_size({"width": 1440, "height": 900})
    check("25 tap targets: on a phone every control is 24 × 24 px or has room around it, and every button has a name", not tap_bad, tap_bad[:6])
    # 26 one count for open work: the Finish button, the steps and the counts all say the same number
    cnt = pg.evaluate("""(phs) => { const out = []; for (const p of WS.projects){ openProject(p.id); UI.home = true; UI.modal = null; render();
        const c = queueCounts(p), total = c.block + c.should, perStep = phs.reduce((s, ph) => s + queueOf(p).filter(x => x.ph === ph && youOpen(x)).length, 0);
        const all = queueOf(p).filter(youOpen).length;
        const b = [...document.querySelectorAll('.app [data-a=finish-open]')].map(e => +((e.textContent.match(/\\d+/) || [NaN])[0])).filter(n => !isNaN(n));
        if (total !== all) out.push(p.name.slice(0, 14) + ': counts ' + total + ' vs queue ' + all);
        if (perStep !== all) out.push(p.name.slice(0, 14) + ': steps add up to ' + perStep + ', queue has ' + all);
        if (b.some(n => n !== total)) out.push(p.name.slice(0, 14) + ': Finish button says ' + b.join('/') + ', queue has ' + total); } return out; }""", PHASES)
    check("26 one count: the Finish button, the steps and the counts all show the same open work", not cnt, cnt[:6])
    # 27 language: screen German, project English (and the other way round)
    lang_bad = []
    for scr, plang in (("de", "en"), ("en", "zh")):
        pg.evaluate(f"(() => {{ LANG = '{scr}'; if (WS.settings) WS.settings.lang = '{scr}'; const p = WS.projects.find(x => x.id === '{PIDS[0]}'); p.lang = '{plang}'; window.__allPrompts = []; }})()")
        for js in SCREENS(PIDS[0])[1:9]:
            pg.evaluate(js); pg.wait_for_timeout(30)
            pg.evaluate("""() => { const ai = Object.keys(ACTIONS).filter(k => /runAI|await ai[A-Z]/.test(String(ACTIONS[k])) && !/publish|release|runner|pilot|live|launch|delete|reset|import|export|engine|kp-|research|translate/.test(k));
                const e = [...document.querySelectorAll('.app [data-a]')].find(e => e.offsetParent && !e.disabled && ai.includes(e.dataset.a)); if (e) e.click(); }""")
            pg.wait_for_timeout(200)
            if pg.evaluate("!!(UI.modal && UI.modal.kind === 'cost')"): pg.evaluate("ACTIONS['cost-go'] && ACTIONS['cost-go']({dataset: {v: 'once'}})")
            try: pg.wait_for_function("AI.running.size === 0", timeout=10000)
            except Exception: pass
            pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null")
        res = pg.evaluate(f"""(() => {{ const want = langName('{plang}').split(' (')[0], screen = langName('{scr}').split(' (')[0]; const out = [];
            for (const pr of window.__allPrompts || []){{ const task = (/\\[\\[task:([a-z0-9-]+)\\]\\]/.exec(pr) || [0, '?'])[1];
              const content = new RegExp('text value in ' + want.replace(/[()]/g, '.') + '|written in ' + want.replace(/[()]/g, '.') + '|in ' + want.replace(/[()]/g, '.')).test(pr);
              const viewer = /reader's language|the reader/.test(pr);
              if (!content && !viewer && /Write every human-readable|written in/.test(pr)) out.push(task + ': asks for ' + (pr.includes(screen) ? screen : 'another language')); }}
            return [(window.__allPrompts || []).length, out]; }})()""")
        if res[1]: lang_bad.append([f"screen {scr} / project {plang}", res[1][:4]])
        if not res[0]: lang_bad.append([f"screen {scr} / project {plang}", "no AI prompt was sent — the check did not run"])
    pg.evaluate("(() => { LANG = 'en'; if (WS.settings) WS.settings.lang = 'en'; })()")
    check("27 language: every AI prompt asks for the project's language, or says it writes for the reader", not lang_bad, lang_bad[:4])
    # 29 integrity
    integ = pg.evaluate("""(() => { const out = []; for (const p of WS.projects){ const n = p.name.slice(0, 14);
        for (const k of ['requirements','tests','risks','assumptions','findings','qa']){ const ids = arr(p[k]).map(x => x && x.id).filter(Boolean); const d = ids.filter((x, i) => ids.indexOf(x) !== i); if (d.length) out.push(n + ' ' + k + ' duplicate ids ' + [...new Set(d)].slice(0, 3).join(',')); }
        const req = new Set(arr(p.requirements).map(r => r.id));
        for (const x of arr(p.tests)) for (const r of arr(x.reqIds)) if (!req.has(r)) out.push(n + ' test ' + x.id + ' → missing requirement ' + r);
        for (const f of arr(p.findings).filter(f => f.status === 'open')) for (const tg of arr(f.targets)){ const ref = typeof tg === 'string' ? tg : tg && tg.ref; if (ref && /^(req|test|risk|assumption):/.test(ref) && typeof itemExists === 'function' && !itemExists(p, ref)) out.push(n + ' problem ' + f.id + ' → missing ' + ref); } }
        return out; })()""")
    check("29 integrity: unique ids, and every link points to an item that exists", not integ, integ[:6])
    # 30 speed
    slow = []
    big = pg.evaluate("WS.projects.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0].id")
    for js in SCREENS(big):
        pg.evaluate(js)
        ms = pg.evaluate("(() => { render(); const ts = []; for (let i = 0; i < 5; i++){ const t0 = performance.now(); render(); ts.push(performance.now() - t0); } return Math.min(...ts); })()")   # the fastest of 5: the code's own cost, not a busy machine
        if ms > 250: slow.append([pg.evaluate(WHERE), round(ms)])
    check("30 speed: every screen renders in under 250 ms with the biggest project", not slow, slow[:6])
    ctx.close()
    # 28 await race: an answer that comes back after a project switch lands in its own project
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); mutate(pg); pg.wait_for_timeout(300)
    race = []
    # #83 (1.7): opening the other project wakes its own automatic steps (screening, missing picks) — those are its own changes, not a race; off for this check
    pg.evaluate("WS.settings.autoJobs = false; window.__mockDelayMs = 600")   # the answer must arrive after the switch, on a loaded machine too
    if len(PIDS) >= 2:
        A, B = PIDS[0], PIDS[1]
        for ph in ["require", "assume", "test", "review"]:
            pg.evaluate(f"(() => {{ UI.modal=null; openProject('{A}'); UI.home=false; setPhase('{ph}'); pgShowPhase(curP(), '{ph}'); render(); }})()"); pg.wait_for_timeout(40)
            snapB = pg.evaluate(f"JSON.stringify(Object.assign({{}}, WS.projects.find(x => x.id === '{B}'), {{updatedAt: 0, _rev: 0, focus: 0, seenAt: 0, lastWhere: 0}}))")
            started = pg.evaluate("""() => { const ai = Object.keys(ACTIONS).filter(k => /runAI|await ai[A-Z]/.test(String(ACTIONS[k])) && !/publish|release|runner|pilot|live|launch|delete|reset|import|export|engine|kp-|research/.test(k));
                const e = [...document.querySelectorAll('.app [data-a]')].find(e => e.offsetParent && !e.disabled && ai.includes(e.dataset.a)); if (!e) return null; e.click(); return e.dataset.a; }""")
            if not started: continue
            pg.wait_for_timeout(10)
            pg.evaluate(f"(() => {{ openProject('{B}'); UI.home = true; render(); }})()")
            if pg.evaluate("!!(UI.modal && UI.modal.kind === 'cost')"): pg.evaluate("ACTIONS['cost-go'] && ACTIONS['cost-go']({dataset: {v: 'once'}})")
            try: pg.wait_for_function("AI.running.size === 0", timeout=15000)
            except Exception: race.append([ph, started, "still running"])
            pg.wait_for_timeout(200)
            nowB = pg.evaluate(f"JSON.stringify(Object.assign({{}}, WS.projects.find(x => x.id === '{B}'), {{updatedAt: 0, _rev: 0, focus: 0, seenAt: 0, lastWhere: 0}}))")
            if nowB != snapB: race.append([ph, started, "the other project changed"])
            pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null")
    pg.evaluate("window.__mockDelayMs = 0")
    check("28 await race: an AI answer after a project switch lands in its own project", not race, race[:6])
    # 31 save failure is visible and retried; typed text stays
    pg.evaluate(f"(() => {{ openProject('{PIDS[0]}'); UI.home = false; setPhase('capture'); pgShowPhase(curP(), 'capture'); render(); window.__mockFailSet = true; const p = curP(); p.zzSaveProbe = 'x'; touch(p); saveProject(p); }})()")
    pg.wait_for_timeout(4000)
    shown = pg.evaluate("(() => { const s = document.getElementById('savestate'); return {text: s ? s.innerText : '', retry: !!document.querySelector('[data-a=save-retry]'), toast: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join('|')}; })()")
    pg.evaluate("(() => { window.__mockFailSet = false; ACTIONS['save-retry'] && ACTIONS['save-retry'](); })()"); pg.wait_for_timeout(2500)
    after = pg.evaluate("(() => { const d = window.__mockdb(); const k = Object.keys(d).find(k => k.includes(curP().id)); return {saved: !!(k && JSON.stringify(d[k]).includes('zzSaveProbe')), text: (document.getElementById('savestate') || {}).innerText || ''}; })()")
    ok31 = bool(shown["text"].strip()) and (shown["retry"] or "retry" in shown["text"].lower()) and after["saved"]
    check("31 save failure: the screen says it is not saved, offers a retry, and the retry saves", ok31, [shown, after])
    ctx.close()
    # 24 dead clicks (fresh copy: clicks change the data)
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); mutate(pg); pg.wait_for_timeout(300)
    pg.evaluate("(() => { const w = navigator.clipboard && navigator.clipboard.writeText; if (navigator.clipboard) navigator.clipboard.writeText = (s) => { window.__copied = (window.__copied || 0) + 1; return Promise.resolve(); }; })()")
    dead, tried24 = [], 0
    pid = pg.evaluate("WS.projects.slice().sort((a, b) => arr(b.requirements).length - arr(a.requirements).length)[0].id")
    for js in SCREENS(pid):
        pg.evaluate(js); pg.wait_for_timeout(40)
        btns = pg.evaluate("""(() => { const seen = new Set(); return [...document.querySelectorAll('.app [data-a]')].filter(e => e.offsetParent && !e.disabled && e.getAttribute('aria-disabled') !== 'true').map((e, i) => { if (e.getAttribute('aria-current')) return null;   // the page you are on
            const k = e.dataset.a + '|' + JSON.stringify(e.dataset); if (seen.has(k)) return null; seen.add(k); return [i, e.dataset.a, (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 24)]; }).filter(Boolean).slice(0, 30); })()""")
        for i, a, label in btns:
            if DANGER.search(a): continue
            pg.evaluate(js); pg.wait_for_timeout(30)
            before = pg.evaluate(STATE)
            ok = pg.evaluate("([i, a]) => { const e = [...document.querySelectorAll('.app [data-a]')].filter(e => e.offsetParent && !e.disabled && e.getAttribute('aria-disabled') !== 'true')[i]; if (!e || e.dataset.a !== a) return false; e.click(); return true; }", [i, a])
            if not ok: continue
            tried24 += 1
            pg.wait_for_timeout(140)
            after = pg.evaluate(STATE)
            if after == before:
                pg.wait_for_timeout(500); after = pg.evaluate(STATE)
            if after == before: dead.append([pg.evaluate(WHERE), a, label])
            try: pg.wait_for_function("AI.running.size === 0", timeout=8000)
            except Exception: pass
            pg.evaluate("UI.modal = null; UI.review = null; UI.finish = null; UI.palette = false; UI.capture = false; UI.drawer = false; document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); render()")
    check(f"24 dead clicks: every visible button does something you can see ({tried24} clicked)", not dead, dead[:8])
    ctx.close()
    b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:8]: print("  ERR", e)
sys.exit(1 if fails or errors else 0)
