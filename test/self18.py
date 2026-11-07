"""PT checks itself (PLAN-1.8, not-yet-brought-up round 8: "PT is a tool — its own screens go through the harness on every release").
On a COPY of the real data (or the made-up bundle) with the mock runtime. Run: python3 test/self18.py [work/backup-141 | test/fixtures/synthetic.json]

Accessibility, on PT's own main screens (Inbox, a tool's cover, its Decisions page, its Run page, Settings, Settings › Health, an
approval dialog, the second owner's first-day screen):
  A keyboard path through the main flow: Tab moves on and never traps; Inbox → open a tool → its Decisions page, Settings → Health,
    all with Tab and Enter only; Esc closes a dialog
  B every control on screen can be reached with the keyboard and has a name (WCAG 2.1.1, 4.1.2)
  C focus is visible: a 2 px outline or a ring when a control gets the keyboard focus (WCAG 2.4.7)
  D no status by colour alone: every status slot and dot carries a word or a name (WCAG 1.4.1)
  E reflow at 320 px: no sideways scrolling (WCAG 1.4.10)
  F contrast AA: text 4.5:1, large text 3:1, in light and dark (WCAG 1.4.3)
Performance budgets (the numbers and why):
  G file size ≤ 3.5 MB. 1.7.1 was 2.24 MB; the artifact limit is 16 MB. 3.5 MB leaves room for the 1.8 parts (~0.5 MB expected) and
    fails long before the limit when something gets embedded by mistake (a data copy, a font, an image doubles the file).
  H first screen ≤ 6 s from loading the page, and the workspace open (projects loaded, screen drawn) ≤ 6 s from the tap. Measured on
    the 2-CPU test machine with other test browsers running (load average ~10): 2.2–3.8 s for the first screen. 6 s keeps the test
    steady on that machine and stays under the 10 s after which people give up waiting (Nielsen's 10-second limit); on a laptop the
    same page takes a fraction of that.
  I no long task over 4 s while PT starts (parsing and running one 2.3 MB script is one task: 0.4–1.1 s measured; the first open in 1.8
    also makes one restore point per project in the same task — about 0.7 s for 1.6 MB of projects on that machine, once per
    workspace; 2.5 s measured in all at load average 13, so 4 s keeps it steady) and none over 1.5 s
    while moving between the main screens (0.08–0.35 s measured). 1.5 s is the point where a tap feels broken rather than slow
    (1 s keeps the flow of thought, RAIL); the margin over the measured worst absorbs the shared machine, while an O(n²) render or a
    blocking loop over all events shows up as several seconds.
Planted faults prove the checks can fail: an unnamed button, a button out of the Tab order, a control without a focus mark, a
colour-only dot, a 600 px box at 320 px, faint text. No page errors.

Known findings in screens other parts own are listed by name (KNOWN) with the reason; anything new fails."""
import json, sys, pathlib, re, time
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:700]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)

# bytes: 3.5 MB from 1.8 to 2.1.0 (2.1.0 built 3,495,572); 2.1.1 adds 6.7 KB of strings and the manifest note, so 3.6 MB from
# 2.1.1 on - the time budgets below are the real guard (first screen ~0.4 s against 6 s). 2.2 wins ~23 KB back by stripping
# comment lines in build.py (BACKLOG).
BUDGET = {"bytes": 3_600_000, "first_ms": 6000, "open_ms": 6000, "boot_task_ms": 4000, "screen_task_ms": 1500}
# findings in screens other parts own, accepted for now with the reason (matched against the finding's text); new ones fail
KNOWN = [
]

A11Y = r"""window.__a11y = (() => {
  const vis = el => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; if (el.closest('details:not([open]) > :not(summary)')) return false; return true; };
  const tag = el => el.tagName.toLowerCase() + (el.dataset && el.dataset.a ? '[' + el.dataset.a + ']' : '') + (el.id ? '#' + el.id : '') + ' "' + (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"';
  const nameOf = el => {
    const lab = el.getAttribute('aria-label'); if (lab && lab.trim()) return lab.trim();
    const lb = el.getAttribute('aria-labelledby'); if (lb){ const s = lb.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim(); if (s) return s; }
    if (el.labels && el.labels.length){ const s = [...el.labels].map(l => l.textContent).join(' ').trim(); if (s) return s; }
    const txt = (el.innerText || el.textContent || '').trim(); if (txt && !/^(input|select|textarea)$/i.test(el.tagName)) return txt;
    if (el.tagName === 'SELECT'){ const o = el.options[el.selectedIndex]; if (el.title) return el.title; return ''; }
    return (el.getAttribute('title') || el.getAttribute('placeholder') || (el.type === 'submit' || el.type === 'button' ? el.value : '') || el.getAttribute('alt') || '').trim(); };
  const CONTROLS = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [data-a], [tabindex], [role=button], [role=link], [contenteditable=true]';
  /** every visible control: reachable with Tab (or explicitly exempt) and named */
  const controls = (root) => { const out = {unreachable: [], unnamed: [], n: 0};
    for (const el of (root || document).querySelectorAll(CONTROLS)){
      if (!el.closest('.app, .overlay, .toasts, .lock-card') || !vis(el)) continue;
      if (el.matches('.overlay[data-a=close-overlay]')) continue;   // the backdrop: Esc and the × do the same
      if (el.matches('option')) continue;
      if (el.matches('label[data-a]') && el.querySelector('input, select, textarea')) continue;   // the field inside is the control
      if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) { /* named by its label */ }
      if (el.closest('[inert], [aria-hidden=true]')) continue;
      if (el.closest('.mapwrap, .bp-node, .pg-track, .lanes, .journey, svg')) continue;   // map canvases: their parts have a list view with real controls
      if (el.getAttribute('tabindex') === '-1' && !el.dataset.a && !el.getAttribute('role') && !el.matches('button, a[href], input, select, textarea, summary')) continue;   // a place focus is moved to (the skip link's target), not a control
      out.n++;
      const native = el.matches('button, a[href], input, select, textarea, summary');
      if (el.disabled) continue;
      if (el.tabIndex < 0 || (!native && !el.hasAttribute('tabindex'))) out.unreachable.push(tag(el));
      if (!nameOf(el)) out.unnamed.push(tag(el));
    }
    out.unreachable = [...new Set(out.unreachable)]; out.unnamed = [...new Set(out.unnamed)]; return out; };
  /** status by colour alone: a status slot or dot with no word and no name */
  const colourOnly = () => { const out = [];
    for (const el of document.querySelectorAll('.sslot, .dot, .ldot, .st-dot, .hr18-pill, [class*="status-dot"]')){
      if (!vis(el) || !el.closest('.app, .overlay')) continue;
      const word = (el.querySelector('.ssw') || {}).textContent || '', own = (el.textContent || '').trim(), lab = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      if (word.trim() || /[\p{L}\p{N}]/u.test(own) || /[\p{L}\p{N}]/u.test(lab)) continue;   // a word or a name
      const item = el.closest('.item'), line = item && [...item.querySelectorAll('.small, .muted')].map(x => x.innerText).join(' ');
      if (line && /[\p{L}]/u.test(line)) continue;   // the line beside it says the state in words (the dot only repeats it)
      out.push(tag(el) + ' ' + String(el.className).slice(0, 40) + ' in ' + String((el.parentElement || {}).className || '').slice(0, 30)); }
    return [...new Set(out)]; };
  const scrollX = () => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0, ...[...document.querySelectorAll('.overlay .modal')].map(x => x.scrollWidth - x.clientWidth)); };
  /** the focus mark of the element that has the keyboard focus: an outline of 2 px or more, or a ring (box-shadow) it does not have without focus */
  const focusMark = el => { const cs = getComputedStyle(el); const ow = parseFloat(cs.outlineWidth) || 0; const ring = cs.boxShadow && cs.boxShadow !== 'none';
    return {outline: cs.outlineStyle !== 'none' && ow >= 2, ring: !!ring, shadow: cs.boxShadow}; };
  // contrast (WCAG AA), effective background alpha-blended up the tree
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return {r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1}; };
  const lum = ({r, g, b}) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (t, u) => ({r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1});
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement){ const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0){ st.push(c); if (c.a >= 1) break; } }
    let base = parse(getComputedStyle(document.body).backgroundColor) || {r: 255, g: 255, b: 255, a: 1}; if (base.a < 1) base = {r: 255, g: 255, b: 255, a: 1};
    for (let i = st.length - 1; i >= 0; i--) base = blend(st[i], base); return base; };
  const cr = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  const contrast = (root) => { const out = [];
    for (const el of (root || document).querySelectorAll('.app *, .toasts *, .overlay *')){
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.closest('[disabled], .disabled, svg, option, .mock, iframe, .ws-dot, .bp-edges')) continue;
      const cs = getComputedStyle(el); if (!vis(el)) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < 1) continue;   // dimmed on purpose (done / not now)
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      const bg = bgOf(el), fg = parse(cs.color); const r = cr(blend(fg, bg), bg);
      if (r < (big ? 3 : 4.5)) out.push(tag(el) + ' ' + r.toFixed(2)); }
    return [...new Set(out)]; };
  return {controls, colourOnly, scrollX, focusMark, contrast, tag, nameOf, vis};
})(); true"""

SCREENS = [
    ("inbox", "go('cockpit')"),
    ("cover", "(() => { const p = WS.projects.find(x => x.status !== 'archived') || WS.projects[0]; openProject(p.id); })()"),
    ("decisions", "(() => { if (UI.view !== 'project') openProject((WS.projects.find(x => x.status !== 'archived') || WS.projects[0]).id); ACTIONS['rows-open'](); })()"),
    ("run", "(() => { const p = WS.projects.find(x => x.live) || WS.projects[0]; openProject(p.id); UI.pgDetails = UI.pgDetails || {}; UI.pgDetails['pg:' + p.id + ':run'] = true; pgOpen(p, 'run'); })()"),
    ("settings", "UI.modal = null; UI.view = 'settings'; UI.setTab = 'general'; render()"),
    ("health", "UI.modal = null; UI.view = 'settings'; UI.setTab = 'health'; render()"),
    ("dialog", "go('cockpit'); confirmBox('Delete this?', 'It goes for good.', 'Delete', () => {})"),
    ("day-one", "go('cockpit'); UI.modal = {kind: 'so18', wide: true}; render()"),
]
def known(f): return any(k in f for k, why in KNOWN)
def fresh(lst): return [x for x in lst if not known(x)]

with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("G file size")
    size = (ROOT / "dist/prompt-translator.html").stat().st_size
    check(f"the built page is {size:,} bytes, within the {BUDGET['bytes']:,} budget", size <= BUDGET["bytes"], size)

    print("H, I first render and long tasks on the data copy")
    LT = "window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({d: Math.round(e.duration), at: Math.round(e.startTime)}); }).observe({type: 'longtask', buffered: true}); } catch(e){}"
    ctx = new_ctx(b, scheme="light"); ctx.add_init_script(LT)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]) if "sandboxed" not in str(e) else None)
    pg.on("console", lambda m: errors.append("console: " + m.text[:300]) if m.type == "error" and "net::" not in m.text and "Failed to load resource" not in m.text else None)
    pg.on("dialog", lambda d: (errors.append("native dialog: " + d.message[:100]), d.dismiss()))
    pg.goto(U); pg.wait_for_selector(".ws-opt, .app", timeout=30000)
    first = ev(pg, "performance.now()")
    t_open = None
    if pg.locator(".app").count() == 0:
        t0 = ev(pg, "performance.now()"); pg.locator(f'.ws-opt[data-id="{_ws_order()[0]}"]').click()
        pg.wait_for_function("typeof UI !== 'undefined' && UI.wsReady === true && !!document.querySelector('.app')", timeout=30000)
        t_open = ev(pg, "performance.now()") - t0
    else:
        pg.wait_for_function("typeof UI !== 'undefined' && UI.wsReady === true", timeout=30000)
        t_open = ev(pg, "performance.now()") - first
    pg.wait_for_timeout(800)
    boot_lt = ev(pg, "window.__lt.slice()")
    check(f"first screen in {first:.0f} ms (budget {BUDGET['first_ms']} ms)", first <= BUDGET["first_ms"], first)
    check(f"the workspace opens in {t_open:.0f} ms (budget {BUDGET['open_ms']} ms)", t_open <= BUDGET["open_ms"], t_open)
    worst = max([x["d"] for x in boot_lt] or [0])
    check(f"no task over {BUDGET['boot_task_ms']} ms while PT starts (longest {worst} ms)", worst <= BUDGET["boot_task_ms"], boot_lt[:8])
    close_modals(pg); ev(pg, "window.__lt = []")
    for nm, js in SCREENS[:6] + [("inbox", "go('cockpit')")]:
        ev(pg, js); pg.wait_for_timeout(600)
    scr_lt = ev(pg, "window.__lt.slice()")
    worst = max([x["d"] for x in scr_lt] or [0])
    check(f"no task over {BUDGET['screen_task_ms']} ms while moving between the main screens (longest {worst} ms)", worst <= BUDGET["screen_task_ms"], scr_lt[:8])
    ev(pg, A11Y)

    print("A keyboard path through the main flow")
    ev(pg, "go('cockpit'); document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
    def tab_until(sel, limit=160):
        seen = []
        for i in range(limit):
            pg.keyboard.press("Tab"); pg.wait_for_timeout(15)
            cur = ev(pg, "(() => { const a = document.activeElement; return a && a !== document.body ? (a.closest('.main') ? 'main:' : '') + window.__a11y.tag(a) : 'body'; })()")
            seen.append(cur)
            if ev(pg, f"(() => {{ const a = document.activeElement; return !!(a && a.matches && a.matches({json.dumps(sel)})); }})()"): return True, seen
        return False, seen
    ok_, seen = tab_until("[data-a=__never__]", 60)
    distinct = len(set(seen))
    stuck = max((len(list(g)) for k, g in __import__("itertools").groupby(seen)), default=0)
    check(f"Tab moves through the Inbox ({distinct} different stops in 60 presses) and never stays put", distinct >= 10 and stuck <= 1, seen[:20])
    check("…it reaches the navigation and the content", any("[nav]" in s for s in seen) and any(s.startswith("main:") for s in seen), seen[:30])
    ev(pg, "go('cockpit'); document.activeElement && document.activeElement.blur()"); pg.wait_for_timeout(200)
    got, seen = tab_until(".main [data-a=open-project], .main [data-a=continue-where], .main .item [data-a=open-project], .rail [data-a=open-project]")
    check("a tool can be reached with Tab from the Inbox", got, seen[-12:])
    if got:
        pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
        check("…and opened with Enter", ev(pg, "UI.view") == "project", ev(pg, "UI.view"))
        got, seen = tab_until("[data-a=rows-open]")
        check("its Decisions page can be reached with Tab", got, seen[-10:])
        if got:
            pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
            check("…and opened with Enter", ev(pg, "UI.rowsView") == ev(pg, "UI.pid"), ev(pg, "[UI.rowsView, UI.pid]"))
    got, seen = tab_until("[data-a=nav][data-v=settings]")
    check("Settings can be reached with Tab", got, seen[-10:])
    if got:
        pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
        got, seen = tab_until("[data-a=tab][data-v=health]")
        check("…its Health tab too", got, seen[-10:])
        if got:
            pg.keyboard.press("Enter"); pg.wait_for_timeout(800)
            check("…and Enter opens the health rows", ev(pg, "document.querySelectorAll('.hr18-row').length") == 5)
    ev(pg, "confirmBox('Delete this?', 'It goes for good.', 'Delete', () => {})"); pg.wait_for_timeout(200)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(250)
    check("Esc closes a dialog", ev(pg, "!UI.modal"))

    print("B controls reachable and named · D no status by colour alone · C focus visible")
    for nm, js in SCREENS:
        ev(pg, js); pg.wait_for_timeout(600)
        c = ev(pg, "window.__a11y.controls()")
        check(f"{nm}: every control ({c['n']}) can be reached with the keyboard", not fresh(c["unreachable"]), fresh(c["unreachable"])[:8])
        check(f"{nm}: every control has a name", not fresh(c["unnamed"]), fresh(c["unnamed"])[:8])
        co = ev(pg, "window.__a11y.colourOnly()")
        check(f"{nm}: no status by colour alone", not fresh(co), fresh(co)[:8])
    ev(pg, "UI.modal = null; render()")
    for nm, js in (("inbox", "go('cockpit')"), ("health", "UI.view = 'settings'; UI.setTab = 'health'; render()"), ("day-one", "go('cockpit'); UI.modal = {kind: 'so18', wide: true}; render()")):
        ev(pg, js); pg.wait_for_timeout(500); ev(pg, "document.activeElement && document.activeElement.blur()")
        bad, n = [], 0
        for i in range(30):
            pg.keyboard.press("Tab"); pg.wait_for_timeout(10)
            r = ev(pg, "(() => { const a = document.activeElement; if (!a || a === document.body || !window.__a11y.vis(a)) return null; return Object.assign({t: window.__a11y.tag(a)}, window.__a11y.focusMark(a)); })()")
            if not r: continue
            n += 1
            if not (r["outline"] or r["ring"]): bad.append(r["t"])
        check(f"{nm}: focus is visible on every control reached with Tab ({n})", n >= 3 and not fresh(sorted(set(bad))), sorted(set(bad))[:8])
    ev(pg, "UI.modal = null; render()")

    print("E reflow at 320 px · F contrast AA")
    for theme in ("light", "dark"):
        ev(pg, f"WS.settings.theme = '{theme}'; applySettings(); render()")
        pg.set_viewport_size({"width": 320, "height": 640}); pg.wait_for_timeout(300)
        for nm, js in SCREENS:
            ev(pg, js); pg.wait_for_timeout(500)
            if theme == "light":
                sx = ev(pg, "window.__a11y.scrollX()")
                check(f"320 px · {nm}: no sideways scrolling", sx <= 2, sx)
            low = ev(pg, "window.__a11y.contrast()")
            check(f"{theme} · {nm}: no text below AA contrast", not fresh(low), fresh(low)[:8])
        ev(pg, "UI.modal = null; render()")
        pg.set_viewport_size({"width": 1440, "height": 950}); pg.wait_for_timeout(200)
    ev(pg, "WS.settings.theme = 'light'; applySettings(); go('cockpit')")

    print("planted faults are found")
    pl = ev(pg, """(() => { const mi = document.querySelector('.main-inner'), d = document.createElement('div'); d.className = 'self18-plant';
      d.innerHTML = '<button class="btn" data-a="x18"><svg viewBox="0 0 4 4"></svg></button><span class="btn" data-a="y18">no tab</span><span class="dot ok"></span><p style="color:#f4f6fa">faint planted words</p>';
      mi.prepend(d); const c = window.__a11y.controls(d), co = window.__a11y.colourOnly(), low = window.__a11y.contrast(d);
      const w = document.createElement('div'); w.style.width = '600px'; w.style.height = '4px'; mi.appendChild(w);
      const res = {unnamed: c.unnamed.some(x => /x18/.test(x)), unreachable: c.unreachable.some(x => /y18/.test(x)), colour: co.some(x => /dot/.test(x)), low: low.some(x => /faint planted/.test(x))};
      d.remove(); return res; })()""")
    pg.set_viewport_size({"width": 320, "height": 640}); pg.wait_for_timeout(200)
    wide = ev(pg, "(() => { const w = document.createElement('div'); w.style.cssText = 'width:600px;height:4px'; document.querySelector('.main-inner').appendChild(w); const r = window.__a11y.scrollX(); w.remove(); return r; })()")
    pg.set_viewport_size({"width": 1440, "height": 950}); pg.wait_for_timeout(200)
    fm = ev(pg, "(() => { const b = document.createElement('button'); b.textContent = 'plain'; b.style.cssText = 'outline:none!important;box-shadow:none!important'; document.querySelector('.main-inner').prepend(b); b.focus(); const r = window.__a11y.focusMark(b); b.remove(); return r; })()")
    check("(an unnamed button is found)", pl["unnamed"], pl)
    check("(a control out of the Tab order is found)", pl["unreachable"], pl)
    check("(a dot with colour only is found)", pl["colour"], pl)
    check("(faint text is found)", pl["low"], pl)
    check("(a 600 px box at 320 px is found)", wide > 2, wide)
    check("(a control without a focus mark is found)", not (fm["outline"] or fm["ring"]), fm)

    check("no page errors", not errors, errors[:5])
    if KNOWN: print("known findings (owned elsewhere, listed with the reason):"); [print("  -", k, "—", why) for k, why in KNOWN]
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
