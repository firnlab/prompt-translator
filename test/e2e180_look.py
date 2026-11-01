"""1.8 look (decided by the owner on 1 Nov 2026), on a COPY of the real data (or the made-up bundle) with the mock runtime.
Covers: light by default (a new workspace, the screen before a workspace opens, the one-time step from "system" to "light",
an explicit "dark" kept, "system" still choosable); contrast of text, accent and status pills in light and dark (WCAG AA:
text 4.5:1, controls 3:1); pills and the one big main button; no web font left; status = glyph + word; two-tone navigation
icons with a word; the quiet "Live" line and PT's real rollback behind it (never a fake Undo); "Claude drafted this · you
decide" and "We assume … — change" in three languages; motion: no hover lifts or glows, reduced motion = fades only;
Health sparklines; no sideways scroll at 1440 / 1024 / 390 px in three languages; 44 px targets on a phone; no page errors.
Run: python3 test/e2e180_look.py [work/backup-141 | test/fixtures/synthetic.json]"""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)

# contrast helpers in the page: effective background (alpha blended up the tree), WCAG ratio
C18 = r"""window.__c18 = (() => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return {r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1}; };
  const lum = ({r, g, b}) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (t, u) => ({r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1});
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement){ const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0){ st.push(c); if (c.a >= 1) break; } }
    let base = parse(getComputedStyle(document.body).backgroundColor) || {r: 255, g: 255, b: 255, a: 1}; if (base.a < 1) base = {r: 255, g: 255, b: 255, a: 1};
    for (let i = st.length - 1; i >= 0; i--) base = blend(st[i], base); return base; };
  const cr = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  const text = el => { const bg = bgOf(el), fg = parse(getComputedStyle(el).color); return cr(blend(fg, bg), bg); };
  const name = el => (el.className && typeof el.className === 'string' ? el.tagName.toLowerCase() + '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : el.tagName) + ' "' + (el.textContent || '').trim().slice(0, 24) + '"';
  /** every visible element with its own text: ratio below 4.5 (large text 3) is listed; disabled controls are exempt (WCAG 1.4.3) */
  const scan = (root) => { const out = []; for (const el of (root || document).querySelectorAll('.app *, .toasts *, .overlay *')){
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      if (el.closest('[disabled], .disabled, svg, option, .mock, iframe, .ws-dot, .bp-edges')) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || !el.getClientRects().length) continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < 1) continue;   // dimmed on purpose (done / not now)
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      const r = text(el); if (r < (big ? 3 : 4.5)) out.push(name(el) + ' ' + r.toFixed(2)); }
    return [...new Set(out)]; };
  return {parse, bgOf, cr, text, scan, name, blend};
})(); true"""
SWATCH = r"""(() => {
  document.querySelectorAll('.t18').forEach(e => e.remove());
  const chips = ['ok', 'warn', 'crit', 'acc', 'st-ok', 'st-warn', 'st-bad', 'st-as', '', 'tap'].map(c => chip('Word 12', c)).join('');
  const slots = ['ok', 'done', 'as', 'warn', 'bad', 'todo', 'cur', 'attn'].map(s => stSlot(s)).join('');
  const btns = btn('t18-x', 'Main action', {cls: 'primary'}) + btn('t18-x', 'Second', {}) + btn('t18-x', 'Third', {cls: 'ghost'}) + btn('t18-x', 'Danger', {cls: 'danger'}) + btn('t18-x', 'Small', {cls: 'sm'}) + btn('t18-x', 'Tiny', {cls: 'xs primary'});
  const words = `<span class="muted">muted words</span> <span class="sub">sub words</span> <a href="#t18">a link</a> <span class="small">small words</span> ${cl18HTML()} ${as18HTML('this North Star', 't18-x')} <span class="ver-chip ok">1.8.0 ✓ newest</span> <span class="ver-chip">1.8.0</span> <span class="ver-chip warn">1.8.1 is ready</span> <input type="text" class="t18in" value="typed"> <span class="tab on">Tab on</span><span class="tab">Tab</span>`;
  const mk = (cls) => { const d = document.createElement('div'); d.className = 't18 ' + cls; d.innerHTML = `<div class="row">${chips}</div><div class="row">${slots}</div><div class="row">${btns}</div><div class="row">${words}</div>`; return d; };
  const mi = document.querySelector('.main-inner'); mi.prepend(mk('panel'), mk('plain'), mk('pg-block'));
  return document.querySelectorAll('.t18').length; })()"""
SCROLLX = "(() => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0); })()"

def seed_theme(wsid):
    d = next((v for k, v in seed.items() if k.endswith("/ws-" + wsid)), None)
    return (d or {}).get("settings", {}).get("theme")

with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("1 light by default")
    ctx = new_ctx(b, scheme="dark"); pg0 = ctx.new_page()
    pg0.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:300]))
    pg0.goto(U); pg0.wait_for_timeout(900)
    bg0 = pg0.evaluate("getComputedStyle(document.body).backgroundColor")
    check("before a workspace opens PT is light, even on a dark device", pg0.evaluate("!document.documentElement.dataset.theme || document.documentElement.dataset.theme === 'light'") and bg0 == "rgb(244, 246, 250)", bg0)
    pg0.close()
    pg = open_page(ctx)
    wsid = ev(pg, "WS.id"); st0 = seed_theme(wsid)
    exp = "light" if st0 in (None, "", "system") else st0
    check("an existing workspace was moved once: 'system' (or nothing) became light, an explicit choice stayed", ev(pg, "WS.settings.theme") == exp and ev(pg, "WS.settings.look18 === true"), [st0, ev(pg, "WS.settings.theme")])
    check("…and the page shows that theme", ev(pg, "document.documentElement.dataset.theme") == exp)
    r = ev(pg, """async () => {
      const keep = WS.settings.theme; const out = {};
      WS.settings.theme = 'system'; delete WS.settings.look18; applySettings(); out.sys = [WS.settings.theme, WS.settings.look18, document.documentElement.dataset.theme];
      WS.settings.theme = 'dark'; delete WS.settings.look18; applySettings(); out.dark = [WS.settings.theme, document.documentElement.dataset.theme];
      WS.settings.theme = 'system'; applySettings(); out.again = [WS.settings.theme, document.documentElement.dataset.theme];
      out.sysdark = getComputedStyle(document.body).backgroundColor;   // the device is dark in this context
      WS.settings.theme = keep; applySettings();
      const w = await createWorkspace('Look test', 'en', wsDefaults('en'));
      const d = await Store.get(Store.root() + '/ws-' + w.id); out.fresh = d && d.settings && d.settings.theme;
      await removeWorkspace(w); return out; }""")
    check("the one-time step turns 'system' into 'light'", r["sys"][0] == "light" and r["sys"][1] is True and r["sys"][2] == "light", r)
    check("an explicit 'dark' is kept", r["dark"] == ["dark", "dark"], r)
    check("'system' can still be chosen afterwards and stays (no second move)", r["again"] == ["system", "system"], r)
    check("'system' follows the device (dark here)", r["sysdark"] == "rgb(17, 21, 27)", r["sysdark"])
    check("a new workspace starts light", r["fresh"] == "light", r)
    ev(pg, "UI.view = 'settings'; UI.setTab = 'general'; render()"); pg.wait_for_timeout(300)
    check("Settings still offers system / light / dark", ev(pg, "[...document.querySelectorAll('[data-a=set-theme]')].map(x => x.dataset.v).sort().join()") == "dark,light,system")

    print("2 fonts, shapes, the main button")
    html = (ROOT / "dist/prompt-translator.html").read_text()
    check("no web font is loaded (no Google Fonts link, no preconnect)", "fonts.googleapis.com" not in html and "fonts.gstatic.com" not in html)
    old = ev(pg, "(() => { const s = new Set(); for (const el of document.querySelectorAll('body, body *')){ const f = getComputedStyle(el).fontFamily; if (/Chakra Petch|IBM Plex|JetBrains Mono/.test(f)) s.add(el.tagName + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ')[0] + ': ' + f.slice(0, 40)); } return [...s].slice(0, 8); })()")
    check("no element on screen asks for the old display, body or mono fonts", not old, old)
    ff = ev(pg, "getComputedStyle(document.body).fontFamily")
    check("text uses the system font stack", ff.startswith("-apple-system") and "PingFang SC" in ff and "Microsoft YaHei" in ff, ff)
    check("ids and numbers keep a monospace", "monospace" in ev(pg, "getComputedStyle(document.documentElement).getPropertyValue('--f-mono')"))
    check("no font file was requested", not ev(pg, "performance.getEntriesByType('resource').some(e => /fonts\\.g|\\.woff2?$/.test(e.name))"))
    ev(pg, "WS.settings.theme = 'light'; applySettings(); go('cockpit')"); pg.wait_for_timeout(400)
    cta = ev(pg, "(() => { const c = [...document.querySelectorAll('.main-inner .btn.cta18')]; const o = [...document.querySelectorAll('.main-inner .btn.primary:not(.cta18)')].filter(b => b.getClientRects().length); return {n: c.length, h: c[0] ? c[0].getBoundingClientRect().height : 0, others: Math.max(0, ...o.map(b => b.getBoundingClientRect().height)), r: c[0] ? getComputedStyle(c[0]).borderTopLeftRadius : ''}; })()")
    check("one big main button on the screen", cta["n"] == 1 and cta["h"] >= 44, cta)
    check("…clearly bigger than the other filled buttons", cta["h"] > cta["others"], cta)
    ev(pg, SWATCH); ev(pg, C18)
    sh = ev(pg, """(() => { const q = s => document.querySelector('.t18.panel ' + s), rr = el => { const b = el.getBoundingClientRect(); return {r: parseFloat(getComputedStyle(el).borderTopLeftRadius), h: b.height}; };
      return {btn: rr(q('.btn:not(.primary)')), pri: rr(q('.btn.primary')), chip: rr(q('.chip.ok')), pill: rr(q('.sslot')), card: parseFloat(getComputedStyle(document.querySelector('.t18.panel')).borderTopLeftRadius),
        sec: getComputedStyle(q('.btn:not(.primary):not(.ghost)')).borderTopStyle, secBg: getComputedStyle(q('.btn:not(.primary):not(.ghost)')).backgroundColor, ter: getComputedStyle(q('.btn.ghost')).borderTopColor, terBg: getComputedStyle(q('.btn.ghost')).backgroundColor}; })()""")
    check("buttons, chips and status pills are pills (radius ≥ half the height)", all(sh[k]["r"] >= sh[k]["h"] / 2 - 0.5 for k in ("btn", "pri", "chip", "pill")), sh)
    check("cards are rounded 18–22 px", 18 <= sh["card"] <= 22, sh["card"])
    lc = ev(pg, "(() => { const l = document.createElement('label'); l.className = 'chk small'; l.innerHTML = '<input type=checkbox> a choice'; document.querySelector('.t18.panel').appendChild(l); const cs = getComputedStyle(l); const r = {border: cs.borderTopStyle, dir: cs.flexDirection}; l.remove(); return r; })()")
    check("a checkbox with its words is a plain row, not a card (two .chk rules collided since 1.0)", lc["border"] == "none" and lc["dir"] == "row", lc)
    check("secondary buttons are outlined, tertiary ones are text", sh["sec"] == "solid" and sh["terBg"] in ("rgba(0, 0, 0, 0)", "transparent") and sh["ter"] in ("rgba(0, 0, 0, 0)", "transparent"), sh)
    acc = ev(pg, "getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")
    check("the accent is ink blue #24477a", acc.lower() == "#24477a", acc)
    glow = ev(pg, "getComputedStyle(document.documentElement).getPropertyValue('--glow').trim()")
    check("no glow: the selection ring has no blur", re.match(r"^0(px)? 0(px)? 0(px)? 1px", glow) is not None, glow)

    print("3 contrast (WCAG AA) in light and dark")
    for theme in ("light", "dark"):
        ev(pg, f"WS.settings.theme = '{theme}'; applySettings(); go('cockpit')"); pg.wait_for_timeout(300)
        ev(pg, SWATCH); ev(pg, C18)
        check(f"{theme}: every text, link, chip, status pill and label in the sample reads at 4.5:1 or more", not ev(pg, "__c18.scan(document.querySelector('.t18.panel')).concat(__c18.scan(document.querySelector('.t18.plain')), __c18.scan(document.querySelector('.t18.pg-block')))"), ev(pg, "__c18.scan(document.querySelector('.t18.panel')).concat(__c18.scan(document.querySelector('.t18.plain')), __c18.scan(document.querySelector('.t18.pg-block')))"))
        ui = ev(pg, """(() => { const c = __c18, root = document.querySelector('.t18.panel'), pri = root.querySelector('.btn.primary'), inp = root.querySelector('.t18in'), sec = root.querySelector('.btn:not(.primary):not(.ghost)');
          const pBg = c.parse(getComputedStyle(pri).backgroundColor), cardBg = c.bgOf(root), pageBg = c.bgOf(document.querySelector('.main'));
          const acc = c.parse(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`));
          return {primaryOnCard: c.cr(pBg, cardBg), primaryOnPage: c.cr(pBg, pageBg), inputBorder: c.cr(c.parse(getComputedStyle(inp).borderTopColor), c.bgOf(inp)), secBorder: c.cr(c.parse(getComputedStyle(sec).borderTopColor), cardBg), focusRing: c.cr(acc, cardBg), focusRingPage: c.cr(acc, pageBg)}; })()""")
        check(f"{theme}: controls stand out at 3:1 (main button, field border, outline, focus ring)", all(v >= 3 for v in ui.values()), ui)
        planted = ev(pg, "(() => { const d = document.createElement('p'); d.className = 't18 t18bad'; d.style.color = getComputedStyle(document.querySelector('.t18.panel')).backgroundColor; d.style.opacity = '1'; d.textContent = 'planted faint text'; document.querySelector('.t18.panel').appendChild(d); const s = __c18.scan(document.querySelector('.t18.panel')); d.remove(); return s.some(x => /t18bad/.test(x)); })()")
        check(f"{theme}: (the contrast scan finds a planted faint text)", planted)
        page_low = ev(pg, "document.querySelectorAll('.t18').forEach(e => e.remove()), __c18.scan()")
        check(f"{theme}: the Cockpit has no text below 4.5:1", not page_low, page_low[:8])
        pid = ev(pg, "(() => { const p = WS.projects.find(x => (x.findings || []).length) || WS.projects[0]; openProject(p.id); return p.id; })()"); pg.wait_for_timeout(500)
        page_low = ev(pg, "__c18.scan()")
        check(f"{theme}: a project's cover has no text below 4.5:1", not page_low, page_low[:8])
        for page in ("picks", "review", "run"):
            ev(pg, f"(() => {{ const p = curP(); UI.pgDetails = UI.pgDetails || {{}}; UI.pgDetails['pg:' + p.id + ':{page}'] = true; if (typeof pgOpen === 'function') pgOpen(p, '{page}'); }})()"); pg.wait_for_timeout(500)
            page_low = ev(pg, "__c18.scan()")
            check(f"{theme}: the {page} page has no text below 4.5:1", not page_low, page_low[:8])
        ev(pg, "UI.view = 'settings'; UI.setTab = 'health'; render()"); pg.wait_for_timeout(700)
        page_low = ev(pg, "__c18.scan()")
        check(f"{theme}: Settings › Health has no text below 4.5:1", not page_low, page_low[:8])
    ev(pg, "WS.settings.theme = 'light'; applySettings(); go('cockpit')"); pg.wait_for_timeout(300)

    print("4 status: glyph + word; navigation icons: two-tone with a word")
    pid = ev(pg, "(() => { const p = WS.projects.find(x => (x.findings || []).length) || WS.projects[0]; openProject(p.id); return p.id; })()"); pg.wait_for_timeout(500)
    sl = ev(pg, "[...document.querySelectorAll('.app .sslot')].filter(e => e.getClientRects().length).map(e => ({pill: e.classList.contains('pill18'), svg: !!e.querySelector('svg'), word: (e.querySelector('.ssw') || {}).textContent || '', label: e.getAttribute('aria-label') || ''}))")
    check("every status slot on screen is a pill with a glyph and a word", sl and all(x["pill"] and x["svg"] and x["word"].strip() and x["label"] for x in sl), [x for x in sl if not (x["pill"] and x["svg"] and x["word"].strip())][:4] or len(sl))
    ch = ev(pg, """[...document.querySelectorAll('.app .chip.ok,.app .chip.warn,.app .chip.crit,.app .chip.st-ok,.app .chip.st-warn,.app .chip.st-bad,.app .chip.st-as')].filter(e => e.getClientRects().length).map(e => {
      const before = getComputedStyle(e, '::before').content; const own = !!e.querySelector('svg') || /^[^\\p{L}\\p{N}]/u.test((e.textContent || '').trim());
      return {glyph: (before && before !== 'none' && before !== 'normal') || own, word: /[\\p{L}\\p{N}]/u.test(e.textContent || ''), t: (e.textContent || '').trim().slice(0, 30)}; })""")
    check("every state chip on screen carries a glyph and a word", all(x["glyph"] and x["word"] for x in ch), [x for x in ch if not (x["glyph"] and x["word"])][:5])
    vc = ev(pg, "(() => { const v = document.querySelector('.ver-chip'); return v ? {cls: v.className, t: v.textContent.trim(), before: getComputedStyle(v, '::before').content} : null; })()")
    check("the version chip says its state in words", vc and (("ok" not in vc["cls"] and "warn" not in vc["cls"]) or ("✓" in vc["t"] and re.search(r"[A-Za-zÄÖÜäöü一-鿿]", vc["t"])) or ("warn" in vc["cls"] and vc["before"] not in ("none", "normal"))), vc)
    for w in (1440, 1024):
        pg.set_viewport_size({"width": w, "height": 950}); pg.wait_for_timeout(300)
        nav = ev(pg, "[...document.querySelectorAll('.rail .nav:not(.nav-proj) .nav-btn')].map(b => { const ic = b.querySelector('.ic'), sp = b.querySelector('span'); return {bg: getComputedStyle(ic).backgroundColor, r: parseFloat(getComputedStyle(ic).borderTopLeftRadius), word: sp ? sp.textContent.trim() : '', fs: sp ? parseFloat(getComputedStyle(sp).fontSize) : 0, vis: sp ? sp.getBoundingClientRect().width : 0}; })")
        check(f"{w} px: navigation icons sit on a tinted rounded container", nav and all(x["bg"] not in ("rgba(0, 0, 0, 0)", "transparent") and x["r"] >= 6 for x in nav), nav[:2])
        check(f"{w} px: …and always show their word", nav and all(x["word"] and x["fs"] >= 10.5 and x["vis"] > 10 for x in nav), nav)
    pg.set_viewport_size({"width": 1440, "height": 950}); pg.wait_for_timeout(200)

    print("5 Claude's text labelled; PT's guesses said as 'We assume … — change'")
    r = ev(pg, """(() => { const p = curP(); p.findings = p.findings || [];
      if (!p.findings.some(f => f.status === 'open')) p.findings.push({id: 'fd-t18', lens: 'security', severity: 'high', section: '', where: '', issue: 'A made-up finding for the look test', fix: 'A made-up fix', status: 'open', version: p.versionNo || 0, at: now(), audit: []});
      UI.pgDetails = UI.pgDetails || {}; UI.pgDetails['pg:' + p.id + ':review'] = true; UI.revTab = 'open';
      if (typeof pgOpen === 'function' && pgOn(p)) pgOpen(p, 'review'); else { setPhase('review'); render(); }
      const cards = [...document.querySelectorAll('[id^="ir-finding:"]')];
      return {n: cards.length, labelled: cards.filter(c => c.querySelector('.cl18')).length, text: (document.querySelector('[id^="ir-finding:"] .cl18') || {}).textContent || ''}; })()""")
    check("every review finding on screen says 'Claude drafted this · you decide'", r["n"] >= 1 and r["labelled"] == r["n"], r)
    check("…with a pen icon", ev(pg, "!!document.querySelector('[id^=\"ir-finding:\"] .cl18 svg')"))
    for lang, word in (("de", "Von Claude entworfen · du entscheidest"), ("zh", "Claude 起草 · 由你决定"), ("en", "Claude drafted this · you decide")):
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); render()"); pg.wait_for_timeout(300)
        check(f"the label in {lang}", ev(pg, "(document.querySelector('[id^=\"ir-finding:\"] .cl18') || {}).textContent || ''") == word)
    ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")
    pc = ev(pg, """(() => { const p = curP(); if (typeof pgOpen === 'function' && pgOn(p)) pgOpen(p, 'picks');
      const cards = [...document.querySelectorAll('.pk-card, .qcard')].filter(c => c.querySelector('.pk-opt.rec, .pk-why, .opt.rec, .dopt.star'));
      return {n: cards.length, labelled: cards.filter(c => c.querySelector('.cl18')).length}; })()""")
    check("every card with PT's ★ pick is labelled", pc["labelled"] == pc["n"], pc)
    pr = ev(pg, "(() => { const p = curP(); return proposalCard(p, 'ns', {prop: {fields: {}, summary: 'A made-up proposal'}, text: 'make it shorter', round: 1}).includes('cl18'); })()")
    check("PT's proposal for an item ('Fix for me', refine) is labelled", pr)
    ns = ev(pg, """(() => { const p = curP(); const was = p.nsAssumed; p.nsAssumed = true; UI.pg = null; UI.home = true; render();
      const a = document.querySelector('.northstar .as18'); const out = {text: a ? a.textContent.replace(/\\s+/g, ' ').trim() : '', act: a && a.querySelector('button') ? a.querySelector('button').dataset.a : ''};
      if (a) a.querySelector('button').click(); out.opened = UI.modal && UI.modal.kind; UI.modal = null; p.nsAssumed = was; render(); return out; })()""")
    check("a North Star PT filled in reads 'We assume this North Star — change'", ns["text"] == "We assume this North Star — change", ns)
    check("…and 'change' opens the North Star to edit", ns["act"] == "edit-ns" and ns["opened"] == "ns", ns)
    wa = ev(pg, """(() => { const p = curP(), k = pickOf(p), host = document.querySelector('.main-inner');
      k.log.push({id: 'pe-t18', q: 'A made-up question', answer: 'A made-up ★ answer', assumed: true, at: now(), keys: []});
      p.qa = p.qa || []; p.qa.push({id: 'q-t18', q: 'A made-up interview question', answer: 'A guessed answer', st: 'assumed', dim: ''});
      const box = document.createElement('div'); box.className = 't18'; box.innerHTML = pickOverview(p) + phInterview(p); host.prepend(box); look18After();
      const row = [...box.querySelectorAll('.pk-dec')].find(r => r.textContent.includes('A made-up question')), a = row && row.querySelector('.as18');
      const q = [...box.querySelectorAll('.qa14.as')].find(r => r.textContent.includes('A guessed answer')), w = q && q.querySelector('.as18-w'), qb = q && [...q.querySelectorAll('.linkish')].find(b => b.dataset.a === 'qa-reanswer');
      const out = {pick: a ? a.textContent.replace(/\\s+/g, ' ').trim() : '', pickAct: a && a.querySelector('button') ? a.querySelector('button').dataset.a + ':' + a.querySelector('button').dataset.id : '', qa: w ? w.textContent.trim() : '', qaAct: qb ? qb.dataset.id : ''};
      k.log = k.log.filter(e => e.id !== 'pe-t18'); p.qa = p.qa.filter(x => x.id !== 'q-t18'); box.remove(); return out; })()""")
    check("a ★ answer PT took without asking reads 'We assume this ★ answer — change' (change = Change)", wa["pick"] == "We assume this ★ answer — change" and wa["pickAct"] == "pk-change:pe-t18", wa)
    check("an interview answer PT guessed starts with 'We assume' and offers 'change'", wa["qa"] == "We assume" and wa["qaAct"] == "q-t18", wa)

    print("6 the quiet Live line and PT's rollback behind it")
    lv = ev(pg, """async () => {
      const p = curP(); const gate = releaseGate; releaseGate = () => [];
      p.releases = []; p.live = null; p.plan = null; p.tool = Object.assign({}, p.tool, {artifacts: [], triggers: []}); touch(p);
      saveVersion(p, 'look test'); const out = {};
      await doRelease(p); await new Promise(r => setTimeout(r, 300));
      const l1 = document.querySelector('.live18'); out.first = l1 ? {text: l1.textContent.replace(/\\s+/g, ' ').trim(), back: !!l1.querySelector('[data-a=live18-back]'), role: l1.getAttribute('role'), undo: [...l1.querySelectorAll('button')].some(b => b.textContent.trim() === t('btn.undo'))} : null;
      out.v1 = p.live && p.live.v; out.toastDup = [...document.querySelectorAll('#toasts .toast')].some(x => x.textContent === t('rel.done', {v: out.v1}));
      p.plan = {from: out.v1, to: '', kind: 'minor', changes: [], at: now(), state: 'checking'};
      await doRelease(p); out.afterSecondRelease = p.live && p.live.v; out.v2 = p.releases[0].v;
      await deployUpdate(p); await new Promise(r => setTimeout(r, 300));
      const l2 = document.querySelector('.live18'); out.second = l2 ? {text: l2.textContent.replace(/\\s+/g, ' ').trim(), back: l2.querySelector('[data-a=live18-back]') ? l2.querySelector('[data-a=live18-back]').dataset.v : '', undo: [...l2.querySelectorAll('button')].some(b => b.textContent.trim() === t('btn.undo'))} : null;
      out.live2 = p.live && p.live.v;
      undo(); out.afterUndo = p.live && p.live.v;   // Undo never takes a release back (releases and the live version survive Undo on purpose)
      releaseGate = gate; return out; }""")
    name = ev(pg, "curP().name")
    check("putting a first version live shows the quiet line 'Live · <tool> v1'", lv["first"] and lv["first"]["text"].startswith("Live · " + name + " v" + str(lv["v1"])) and lv["first"]["role"] == "status", lv)
    check("…it says there is nothing earlier to go back to (no Undo, no rollback button)", lv["first"] and not lv["first"]["back"] and not lv["first"]["undo"] and "no earlier one" in lv["first"]["text"], lv["first"])
    check("…instead of a second 'released' toast", not lv["toastDup"], lv)
    check("a new release only goes live when it is deployed", lv["afterSecondRelease"] == lv["v1"] and lv["live2"] == lv["v2"], lv)
    check("the line for the new version offers PT's rollback to the version before and says what it does", lv["second"] and lv["second"]["back"] == lv["v1"] and ("Live · " + name + " v" + str(lv["v2"])) in lv["second"]["text"] and "working copy stays" in lv["second"]["text"], lv["second"])
    check("…never a fake Undo", lv["second"] and not lv["second"]["undo"] and lv["afterUndo"] == lv["v2"], lv)
    pg.locator(".live18 [data-a=live18-back]").first.click(); pg.wait_for_timeout(400)
    md = ev(pg, "({kind: UI.modal && UI.modal.kind, v: UI.modal && UI.modal.v, live: curP().live.v, text: (document.querySelector('.modal') || {}).innerText || ''})")
    check("the rollback opens PT's Reinstall dialog and changes nothing before you confirm", md["kind"] == "reinstall" and md["v"] == lv["v1"] and md["live"] == lv["v2"], md)
    pg.locator(".modal [data-a=reinstall-go]").first.click(); pg.wait_for_timeout(900)
    back = ev(pg, "(() => { const p = curP(), l = document.querySelector('.live18'); return {live: p.live.v, re: !!p.live.reinstalled, line: l ? l.textContent.replace(/\\s+/g, ' ').trim() : '', backTo: l && l.querySelector('[data-a=live18-back]') ? l.querySelector('[data-a=live18-back]').dataset.v : ''}; })()")
    check("confirming really puts the earlier version live again", back["live"] == lv["v1"] and back["re"], back)
    check("…and the line now offers the way back to the newer one", back["backTo"] == lv["v2"] and ("v" + str(lv["v1"])) in back["line"], back)
    pg.locator(".live18 [data-a=live18-close]").first.click(); pg.wait_for_timeout(200)
    check("the line can be closed", ev(pg, "!document.querySelector('.live18')"))
    for lang, word in (("de", "Live · "), ("zh", "已上线 · ")):
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); live18Show(curP(), '{lv['v2']}', '{lv['v1']}')"); pg.wait_for_timeout(200)
        check(f"the Live line in {lang}", ev(pg, "(document.querySelector('.live18') || {}).textContent || ''").startswith(word), ev(pg, "(document.querySelector('.live18') || {}).textContent || ''"))
    ev(pg, "live18Close(); LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")

    print("7 motion: no hover lifts or glows")
    ev(pg, "go('cockpit')"); pg.wait_for_timeout(300)
    hv = ev(pg, """(() => { const out = []; for (const ss of document.styleSheets){ let rules; try{ rules = ss.cssRules; }catch(e){ continue; }
        const walk = rs => { for (const r of rs){ if (r.cssRules) walk(r.cssRules); if (!r.selectorText || !/:hover/.test(r.selectorText)) continue; const s = r.style;
          if ((s.transform && s.transform !== 'none') || (s.translate && s.translate !== 'none') || (s.scale && s.scale !== 'none') || /blur|brightness/.test(s.filter || '')) out.push(r.selectorText + ' {'); } }; walk(rules); }
      return out; })()""")
    moved = []
    for sel in sorted(set(x.split("{")[0].strip() for x in hv)):
        for one in sel.split(","):
            if ":hover" not in one: continue
            base = one.replace(":hover", "").strip()
            try:
                el = pg.locator(base).first
                if not el.count() or not el.is_visible(): continue
                el.hover(timeout=1500); pg.wait_for_timeout(120)
                cs = el.evaluate("e => { const c = getComputedStyle(e); return [c.transform, c.filter, c.translate, c.scale]; }")
                if any(v not in ("none", "") for v in cs): moved.append(base + " " + str(cs))
            except Exception: pass
    check("no hover moves, grows or glows anything (as shown on screen)", not moved, moved[:5])
    ev(pg, "(() => { const p = curP() || WS.projects[0]; openProject(p.id); })()"); pg.wait_for_timeout(300)

    print("8 Health: your time in PT with sparklines")
    ev(pg, "UI.view = 'settings'; UI.setTab = 'health'; render()"); pg.wait_for_timeout(800)
    sp = ev(pg, """(() => { const s = [...document.querySelectorAll('.spk18 svg')]; return s.map(v => ({role: v.getAttribute('role'), label: v.getAttribute('aria-label') || '', pts: (v.querySelector('polyline').getAttribute('points') || '').trim().split(/\\s+/).length, stroke: getComputedStyle(v.querySelector('polyline')).stroke, num: getComputedStyle(v.closest('.spk18')).fontVariantNumeric})); })()""")
    accent_rgb = ev(pg, "(() => { const d = document.createElement('i'); d.style.color = 'var(--accent)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()")
    check("two sparklines: taps and active minutes per day", len(sp) == 2 and all(x["pts"] == 14 for x in sp), sp)
    check("…in the accent colour, with tabular figures", all(x["stroke"] == accent_rgb and "tabular-nums" in x["num"] for x in sp), [sp, accent_rgb])
    check("…and readable as numbers for a screen reader", all(x["role"] == "img" and len(re.findall(r"\d+", x["label"])) >= 14 for x in sp), sp)
    check("the usage tile shows a whole number", not re.search(r"\d\.\d{4,}", ev(pg, "document.querySelector('.main').innerText")))
    tl = ev(pg, "[...document.querySelectorAll('.pt-tile')].map(x => ({r: parseFloat(getComputedStyle(x).borderTopLeftRadius), n: parseFloat(getComputedStyle(x.querySelector('b')).fontSize), dir: getComputedStyle(x).flexDirection}))")
    check("PT's own health tiles are tiles: a big number over its word (the classes had no style in 1.7)", tl and all(x["r"] >= 12 and x["n"] >= 20 and x["dir"] == "column" for x in tl), tl)
    for lang, word in (("de", "Klicks pro Tag"), ("zh", "每天点按次数")):
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); render()"); pg.wait_for_timeout(300)
        check(f"the sparkline captions in {lang}", word in ev(pg, "document.querySelector('.main').innerText"))
    ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")
    zh = ev(pg, "(() => { LANG = 'zh'; applyLangAttr(); render(); const cs = getComputedStyle(document.body); const r = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize); LANG = WS.settings.lang || 'en'; applyLangAttr(); render(); return r; })()")
    check("Chinese gets more line height (about 1.7)", zh >= 1.65, zh)
    ctx.close()

    print("9 reduced motion: fades only")
    ctxr = b.new_context(viewport={"width": 1440, "height": 950}, color_scheme="light", reduced_motion="reduce")
    ctxr.add_init_script("if (window === window.top) window.__seed = " + json.dumps(seed) + ";"); ctxr.add_init_script(MOCK)
    pr_ = open_page(ctxr)
    rm = ev(pr_, """async () => { const p = WS.projects[0]; openProject(p.id); await new Promise(r => setTimeout(r, 300));
      live18Show(p, '9', '8'); const el = document.querySelector('.main-inner .panel, .main-inner section'); if (el){ el.classList.add('flash'); }
      await new Promise(r => setTimeout(r, 60));
      const anims = document.getAnimations().map(a => ({name: a.animationName || a.transitionProperty || '', props: (a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []).flatMap(k => Object.keys(k)).filter(k => !['offset', 'easing', 'composite', 'computedOffset'].includes(k))}));
      const tr = getComputedStyle(document.querySelector('.btn')).transitionProperty;
      live18Close(); return {anims, tr}; }""")
    moving = [a for a in rm["anims"] if any(k in ("transform", "translate", "scale", "rotate", "top", "left", "margin", "maxHeight", "height", "width") for k in a["props"])]
    check("with reduced motion every animation only fades (opacity or colour)", rm["anims"] and not moving, rm["anims"][:6])
    check("…and buttons change colour without movement", "transform" not in rm["tr"] and rm["tr"] != "all", rm["tr"])
    ctxr.close()

    print("10 widths and languages: no sideways scroll; phone targets")
    SCREENS = [("cockpit", "go('cockpit')"), ("cover", "(() => { const p = WS.projects[0]; openProject(p.id); })()")] + [(x, f"(() => {{ const p = curP() || WS.projects[0]; if (UI.view !== 'project') openProject(p.id); UI.pgDetails = UI.pgDetails || {{}}; UI.pgDetails['pg:' + p.id + ':{x}'] = true; if (typeof pgOpen === 'function') pgOpen(p, '{x}'); }})()") for x in ("picks", "review", "run")] + [("health", "UI.view = 'settings'; UI.setTab = 'health'; render()")]
    for w in (1440, 1024, 390):
        ctx = new_ctx(b, w=w, h=900 if w > 400 else 844, scheme="light"); pg = open_page(ctx)
        for lang in ("en", "de", "zh"):
            ev(pg, f"WS.settings.lang = '{lang}'; WS.settings.theme = 'light'; applySettings(); render()"); pg.wait_for_timeout(150)
            bad = []
            for nm, js in SCREENS:
                ev(pg, js); pg.wait_for_timeout(350)
                sx = ev(pg, SCROLLX)
                if sx > 2: bad.append(f"{nm}:{sx}px")
            check(f"{w} px · {lang}: no sideways scroll on the main screens", not bad, bad)
            if lang == "en":
                planted = ev(pg, "(() => { const d = document.createElement('div'); d.style.width = '3000px'; d.style.height = '4px'; document.querySelector('.main-inner').appendChild(d); const r = " + SCROLLX + "; d.remove(); return r; })()")
                check(f"{w} px: (the sideways-scroll check finds a planted wide box)", planted > 2, planted)
        if w == 390:
            ev(pg, "WS.settings.lang = 'de'; applySettings(); render()")
            small = []
            for nm, js in SCREENS:
                ev(pg, js); pg.wait_for_timeout(350)
                small += ev(pg, """[...document.querySelectorAll('.main button, .main select, .main summary, .main a[href], .main input:not([type=checkbox]):not([type=radio]):not([type=file]), .pnavbar button')].filter(el => {
                    const cs = getComputedStyle(el); if (!el.getClientRects().length || cs.visibility === 'hidden' || el.closest('details:not([open]) > :not(summary)')) return false;
                    if (cs.display === 'inline' || (el.matches('.linkish') && el.closest('p, .as18, .small'))) return false;   // a link inside a sentence (WCAG 2.5.8 inline exception)
                    if (el.closest('.bp-node, .mapwrap, .pg-track, .lanes, .journey, svg')) return false;   // map canvases are zoomable, their parts have a list view
                    return el.getBoundingClientRect().height < 43.5; }).map(el => (el.className || el.tagName) + ' "' + (el.textContent || '').trim().slice(0, 20) + '" ' + Math.round(el.getBoundingClientRect().height))""")
            small = sorted(set(small))
            check("390 px: every control is at least 44 px tall", not small, small[:12])
            planted = ev(pg, "(() => { const b = document.createElement('button'); b.className = 't18small'; b.style.cssText = 'min-height:0!important;height:20px;padding:0'; b.textContent = 'tiny'; document.querySelector('.main-inner').appendChild(b); const h = b.getBoundingClientRect().height; b.remove(); return h; })()")
            check("390 px: (a planted 20 px button would be found)", planted < 43.5, planted)
            ev(pg, "WS.settings.lang = 'en'; applySettings(); go('cockpit')"); pg.wait_for_timeout(300)
            long = ev(pg, "(() => { LANG = 'de'; render(); const bs = [...document.querySelectorAll('.main .btn')].filter(b => b.getClientRects().length); return bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim().slice(0, 30)); })()")
            check("390 px · German: no button label is cut or pushed out", not long, long)
        ctx.close()

    check("no page errors", not errors, errors[:5])
    b.close()
try: (ROOT / "test" / PAGE).unlink()   # this run's own page only (other runs may be going on side by side)
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
