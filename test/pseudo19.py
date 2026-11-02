"""Pseudo-localisation (PLAN-1.9 C: "PT's own gate gets … pseudo-localisation as a gate suite").
On a COPY of the real data (or the made-up bundle) with the mock runtime. Never touches real data.
Run: python3 test/pseudo19.py [work/backup-141 | test/fixtures/synthetic.json]

Every English text PT shows from its strings table (STR, through t()) and from its three-language objects (through L()) is swapped
for a pseudo text: the same words with accented letters, wrapped in ⟦ ⟧ and made about 40 % longer (German runs about 30 % longer
than English, so a label that survives this survives German). HTML tags, {placeholders}, &entities; and links stay as they are.
Then PT's screens are walked (Inbox, the nav pages, every Settings tab, Library tabs, a tool's cover and every station, its
Decisions page, dialogs, the second owner's first day, What's new, the command palette), at a desktop width and at a phone width (390 px), and:
  A no text that bypasses translation: a visible text, button name, title or placeholder with a plain English word that came from
    neither the strings table, nor a three-language object, nor the data (project names, notes and anything else stored, which is
    the owner's own words), nor the short list of names that stay the same in every language (KEEP, with the reason)
  B no raw string key on screen (a key that has no row shows as "abc.def.ghi"); the vault's "what it is for" lines are in the three
    languages and their English is vault/vault.json's word for word (a new or changed vault line asks for its translations)
  C no cut-off label: a button, tab or pill with pseudo text is not clipped or cut with "…"
  D no sideways scrolling with the longer text, at 1440 px and at 390 px
Planted faults prove the checks can fail: a hard-coded English button, a hard-coded aria-label, a raw key, a clipped label, a
600 px box at 390 px; and a project name is never reported (the owner's words are not PT's to translate). No page errors.

Known findings (texts other parts own, accepted for now with the reason) are listed by name in KNOWN; anything new fails."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:1500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)

# words that are the same in every language (names of products, labs, languages, months and days come from the browser's Intl in the
# reader's language and are checked by the date tests). Each with its reason.
KEEP = {
    "names": ("Claude Opus Sonnet Haiku Fable Mythos Anthropic GitHub Github Google Gemini OpenAI ChatGPT Chrome Chromium Safari Firefox "
              "Notion Slack Gmail Telegram Stripe Vercel Netlify Playwright Semgrep Dependabot Firnlab firnlab Zapier Make Excel Word "
              "PowerPoint Markdown JavaScript TypeScript Python Node HTML CSS JSON YAML Linux macOS Windows iPhone Android Mistral "
              "Prompt Translator"),   # product and company names, never translated
    "languages": "English Deutsch",   # the language picker shows each language in its own words
    "keys": "Ctrl Shift Esc Enter Tab Alt Cmd",   # keyboard keys as printed on most keyboards (the ⌘ sign beside them)
    "dates": ("Jan Feb Mar Apr May Jun Jul Aug Sep Sept Oct Nov Dec January February March April June July August September October "
              "November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday Mon Tue Wed Thu Fri Sat Sun"),   # Intl, en-GB
}
KEEP_WORDS = sorted({w for v in KEEP.values() for w in v.split()})
# findings in texts other parts own, accepted for now with the reason (matched against the finding's text); new ones fail
KNOWN = [
]

PSEUDO = r"""window.__ps = (() => {
  const MAP = {a:'á', e:'é', i:'í', o:'ó', u:'ú', y:'ý', c:'ç', n:'ñ', A:'Á', E:'É', I:'Í', O:'Ó', U:'Ú', Y:'Ý', C:'Ç', N:'Ñ'};
  const KEEPSEG = /(<[^>]*>|\{[A-Za-z0-9_.]+\}|&[#A-Za-z0-9]+;|https?:\/\/[^\s<"')]+|`[^`]*`|\b[A-Za-z0-9_-]+\.(?:json|js|py|md|yml|html|txt|csv)\b|\b[A-Z][A-Z0-9_]{2,}\b)/;
  const conv = s => s.replace(/[aeiouycnAEIOUYCN]/g, ch => MAP[ch]);
  function pseudo(s){
    if (typeof s !== 'string' || !/[A-Za-z]/.test(s) || s.includes('⟦')) return s;
    const parts = s.split(KEEPSEG); let letters = 0;
    const out = parts.map((x, i) => { if (i % 2) return x; letters += (x.match(/[A-Za-z]/g) || []).length; return conv(x); }).join('');
    if (!letters) return s;
    // about 40 % longer, in short runs that can wrap (a long German word is about 20 letters, never 40)
    let pad = Math.max(2, Math.ceil(letters * 0.4)), tail = '';
    while (pad > 0){ const k = Math.min(pad, 6); tail += ' ' + '~'.repeat(k); pad -= k; }
    return '⟦' + out + tail + '⟧';
  }
  // the strings table: English is column 0 (t() falls back to it in every language)
  let n = 0; for (const k of Object.keys(STR)){ const r = STR[k]; if (Array.isArray(r) && typeof r[0] === 'string'){ r[0] = pseudo(r[0]); n++; } }
  // the three-language objects (kits, lenses, destinations, …) go through L()
  const L0 = window.L; window.L = function(o){ const s = L0(o); return o && s === o.en ? pseudo(s) : s; };
  WS.settings.lang = 'en'; LANG = 'en'; applySettings();
  document.querySelectorAll('.toast').forEach(x => x.remove());   // shown before the swap
  return {pseudo, n};
})(); window.__ps.n"""

SCAN = r"""window.__scan = (() => {
  const KEEP = new Set(%KEEP%);
  const vis = el => { if (!el || !el.getClientRects().length) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; if (el.closest('details:not([open]) > :not(summary)')) return false; return true; };
  // the data: every string the owner (or the mock AI) put into the store or the open workspace
  let corpus = '', dataStrings = [], dataWords = new Set();
  function loadData(){
    const seen = new Set();
    const walk = v => { if (typeof v === 'string'){ const s = v.replace(/\s+/g, ' ').trim(); if (s.length >= 2) seen.add(s); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    try { walk(window.__mockdb()); } catch(e){}
    try { walk(JSON.parse(JSON.stringify(WS.projects))); walk(JSON.parse(JSON.stringify(WS.settings || {}))); walk(WS.name || ''); } catch(e){}
    dataStrings = [...seen].filter(s => /[A-Za-z]/.test(s)).sort((a, b) => b.length - a.length);
    corpus = '\u0000' + dataStrings.join('\u0000') + '\u0000';
    return dataStrings.length;
  }
  const KEYPRE = new Set(Object.keys(STR).map(k => k.split('.')[0]));
  // a plain English word: ASCII letters only, three or more, with a vowel (a pseudo word always has an accented letter); tokens with
  // code signs in them (<tag>, {x}, a_b, a/b, a.b@c) are names, not words
  const wordOf = tok => /[<>{}_\/@=\\]|\w\.\w/.test(tok) ? '' : tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').replace(/['’]s$/, '');
  const isRaw = w => /^[A-Za-z][a-z]{2,}$/.test(w) && /[aeiouy]/i.test(w) && !KEEP.has(w);
  const rawWords = s => s.split(/\s+/).map(wordOf).filter(isRaw);
  const rawKey = s => (s.match(/\b[a-z][a-z0-9]*(?:\.[a-z0-9]+){2,}\b/g) || []).filter(k => KEEP_KEY(k));
  const KEEP_KEY = k => KEYPRE.has(k.split('.')[0]) && !/\.(?:com|ai|ch|org|io|dev|net)$/.test(k);
  /** words of s that are not pseudo and not the owner's: s is cut into runs of plain tokens (a pseudo word or a lone sign · › | —
      ends a run; the ⟦ ⟧ of a pseudo text can sit on a word the owner wrote, put in by a {placeholder}); in each run, from the left,
      the longest stretch found word for word in the stored texts is the owner's (PT cuts long texts short, often with …); a plain
      English word that is in no such stretch is PT's own text that bypassed translation */
  const PSEUDO_TOK = /[áéíóúýçñÁÉÍÓÚÝÇÑ]|^~+$/;
  // a stretch is the owner's when it is a whole stored text, the start of one (cut short on screen: two words or more), or a line
  // out of a longer one (four words and 24 letters or more: short everyday phrases like "Open the" are in many notes and prove nothing)
  const inData = x => { const y = x.replace(/^[\s.,;:'"(…“”‘’«»„]+|[\s.,;:'"(…)“”‘’«»]+$/g, ''); if (!y) return false; const nw = y.split(' ').length;
    return corpus.includes('\u0000' + y + '\u0000') || (nw >= 2 && y.length >= 8 && corpus.includes('\u0000' + y)) || (nw >= 4 && y.length >= 24 && corpus.includes(y)); };
  function bare(s){
    s = s.replace(/\s+/g, ' ').trim(); if (!s || !rawWords(s).length) return [];
    if (inData(s.replace(/[⟦⟧]/g, ''))) return [];
    for (const d of dataStrings){ if (d.length > s.length) continue; if (d.length < 8 || !d.includes(' ') || !s.includes(d)) continue; s = s.split(d).join(' ⟪⟫ '); if (!rawWords(s).length) return []; }
    const runs = []; let cur = [];
    for (const raw of s.split(' ')){
      const tok = raw.replace(/[⟦⟧]/g, '');
      const plain = !!tok && !PSEUDO_TOK.test(tok) && !/^[·›|—–\-…]+$/.test(tok) && tok !== '⟪⟫';
      if (plain) cur.push(tok); else { if (cur.length) runs.push(cur); cur = []; }
    }
    if (cur.length) runs.push(cur);
    const out = [];
    for (const run of runs){
      if (!rawWords(run.join(' ')).length) continue;
      for (let i = 0; i < run.length;){
        let j = run.length; for (; j > i; j--) if (inData(run.slice(i, j).join(' '))) break;
        if (j > i){ i = j; continue; }
        const w = wordOf(run[i]); if (isRaw(w)) out.push(w); i++;
      }
    }
    return out;
  }
  const where = el => { const p = []; for (let e = el, i = 0; e && i < 3; e = e.parentElement, i++) p.unshift(e.tagName.toLowerCase() + (e.dataset && e.dataset.a ? '[' + e.dataset.a + ']' : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')); return p.join('>'); };
  /** A + B: texts and names that bypass translation, raw keys */
  function texts(root){
    const out = [], keys = [];
    const roots = root ? [root] : [...document.querySelectorAll('.app, .overlay, .toasts, .drawer, .rpage, .lock-card')];
    for (const r of roots){
      const tw = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()){
        const el = n.parentElement; if (!el || !vis(el)) continue;
        if (el.closest('code, pre, kbd, samp, textarea, script, style, svg, [contenteditable=true], .mock, iframe, .ps-skip')) continue;
        if (el.closest('a[href^="http"], [translate=no]')) continue;   // a link to an outside page shows that page's own title; translate="no" marks a name   // a link to an outside page shows that page's own title (an official source, as published)
        const s = n.textContent; if (!/[A-Za-z]/.test(s)) continue;
        const w = bare(s); if (w.length) out.push(where(el) + ' "' + s.replace(/\s+/g, ' ').trim().slice(0, 90) + '" [' + w.slice(0, 4).join(' ') + ']');
        for (const k of rawKey(s)) keys.push(where(el) + ' ' + k);
      }
      for (const el of r.querySelectorAll('[aria-label], [title], [placeholder], input[type=button], input[type=submit]')){
        if (!vis(el) || el.closest('.mock, iframe, svg, .ps-skip, [translate=no]')) continue;
        for (const a of ['aria-label', 'title', 'placeholder', 'value']){
          if (a === 'value' && !el.matches('input[type=button], input[type=submit]')) continue;
          const s = el.getAttribute(a); if (!s || !/[A-Za-z]/.test(s)) continue;
          const w = bare(s); if (w.length) out.push(where(el) + ' @' + a + ' "' + s.replace(/\s+/g, ' ').trim().slice(0, 90) + '" [' + w.slice(0, 4).join(' ') + ']');
          for (const k of rawKey(s)) keys.push(where(el) + ' @' + a + ' ' + k);
        }
      }
    }
    return {texts: [...new Set(out)], keys: [...new Set(keys)]};
  }
  /** C: a button, tab or pill whose pseudo text is clipped or cut with … */
  function clipped(root){
    const out = [];
    for (const el of (root || document).querySelectorAll('button, .btn, .tab, .pill, .chip, .badge, .nav-btn, label, th, [data-a], .seg > *, .hr18-pill')){
      if (!vis(el) || !el.closest('.app, .overlay, .drawer, .rpage')) continue;
      const own = el.innerText || ''; if (!own.includes('⟦') && !own.includes('⟧')) continue;
      if (el.querySelector('input, textarea, select')) continue;
      const cs = getComputedStyle(el); const ox = cs.overflowX, ell = cs.textOverflow === 'ellipsis';
      const over = el.scrollWidth - el.clientWidth;
      if (over > 2 && (ox === 'hidden' || ox === 'clip' || ell)) { out.push(where(el) + ' "' + own.replace(/\s+/g, ' ').trim().slice(0, 60) + '" cut by ' + over + ' px'); continue; }
      // a child span cut with an ellipsis inside the control
      for (const c of el.querySelectorAll('span, b, strong, em')){
        const cc = getComputedStyle(c); if (!vis(c)) continue;
        const ci = c.innerText || ''; if (!ci.includes('⟦') && !ci.includes('⟧')) continue;
        if ((cc.textOverflow === 'ellipsis' || cc.overflowX === 'hidden') && c.scrollWidth - c.clientWidth > 2){ out.push(where(c) + ' "' + ci.replace(/\s+/g, ' ').trim().slice(0, 60) + '" cut by ' + (c.scrollWidth - c.clientWidth) + ' px'); break; }
      }
    }
    return [...new Set(out)];
  }
  const scrollX = () => { const m = document.querySelector('.main'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0, ...[...document.querySelectorAll('.overlay .modal, .rpage')].map(x => x.scrollWidth - x.clientWidth)); };
  /** what sticks out on the right (for the report): the first boxes past the edge whose parent still fits */
  const wideOnes = () => { const W = innerWidth, out = [];
    for (const el of document.querySelectorAll('.app *, .overlay *')){
      if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.right <= W + 2 || !r.width) continue;
      let e = el.parentElement, hidden = false; for (; e && e !== document.body && !e.matches('.main, .overlay, .modal, .rpage'); e = e.parentElement){ const cs = getComputedStyle(e); if (/auto|scroll|hidden|clip/.test(cs.overflowX) && e.getBoundingClientRect().right <= W + 2){ hidden = true; break; } }
      if (hidden) continue;
      const pr = el.parentElement.getBoundingClientRect(); if (pr.right > W + 2 && el.parentElement.matches('.app *, .overlay *')) continue;
      out.push(where(el) + ' ' + Math.round(r.right - W) + ' px "' + (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50) + '"'); }
    return out.slice(0, 6); };
  return {loadData, texts, clipped, scrollX, bare, rawKey, wideOnes};
})(); true"""

SCREENS = [
    ("inbox", "go('cockpit')"),
    ("weekly", "go('weekly')"),
    ("library", "UI.libTab = 'patterns'; go('library')"),
    ("library practices", "UI.libTab = 'practices'; go('library')"),
    ("library research", "UI.libTab = 'research'; go('library')"),
    ("insights", "go('insights')"),
    ("notes", "go('notes')"),
] + [(f"settings {x}", f"UI.modal = null; UI.view = 'settings'; UI.setTab = '{x}'; render()") for x in ("general", "models", "knowledge", "workspaces", "data", "about", "health")] + [
    ("cover", "(() => { const p = WS.projects.find(x => x.status !== 'archived') || WS.projects[0]; UI.rowsView = null; openProject(p.id); })()"),
    ("decisions", "(() => { if (UI.view !== 'project') openProject((WS.projects.find(x => x.status !== 'archived') || WS.projects[0]).id); ACTIONS['rows-open'](); })()"),
] + [(f"station {s}", "(() => { const p = WS.projects.find(x => x.live) || WS.projects.find(x => x.status !== 'archived') || WS.projects[0]; UI.rowsView = null; openProject(p.id); UI.pgDetails = UI.pgDetails || {}; UI.pgDetails['pg:' + p.id + ':%s'] = true; pgOpen(p, '%s'); })()" % (s, s))
     for s in ("idea", "picks", "try", "design", "review", "build", "run")] + [
    ("new tool", "go('cockpit'); newProject()"),
    ("dialog", "go('cockpit'); confirmBox(t('set.tab.general'), t('set.tab.data'), t('set.tab.about'), () => {})"),
    ("day-one", "go('cockpit'); UI.modal = {kind: 'so18', wide: true}; render()"),
    ("what's new", "go('cockpit'); UI.modal = {kind: 'whatsnew', wide: true, from: '1.8.2'}; render()"),
    ("palette", "UI.modal = null; go('cockpit'); ACTIONS['palette'](); render()"),
]
def known(f): return any(k in f for k, why in KNOWN)
def fresh(lst): return [x for x in lst if not known(x)]

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, scheme="light"); pg = open_page(ctx); pg.wait_for_timeout(500)
    vt = ev(pg, """VAULT.tools.map(x => { const r = STR['vault.use.' + x.id]; return {id: x.id, ok: !!r && r.length === 3 && r.every(c => typeof c === 'string' && c.trim()), same: !!r && r[0] === x.use}; })""")
    check(f"every vault tool's line ({len(vt)}) is in the three languages", vt and all(x["ok"] for x in vt), [x["id"] for x in vt if not x["ok"]])
    check("…and its English is vault.json's line word for word (a changed line asks for new translations)", all(x["same"] for x in vt), [x["id"] for x in vt if not x["same"]])
    n = ev(pg, PSEUDO)
    check(f"the strings table goes pseudo ({n} strings)", n > 1000, n)
    ev(pg, SCAN.replace("%KEEP%", json.dumps(KEEP_WORDS)))
    ev(pg, "UI.modal = null; render()"); pg.wait_for_timeout(300)
    probe = ev(pg, "document.querySelector('.app').innerText.slice(0, 400)")
    check("the screen shows the pseudo text", "⟦" in probe, probe[:200])

    seen = {"texts": set(), "keys": set(), "clip": set()}
    for width in (1440, 390):
        pg.set_viewport_size({"width": width, "height": 900 if width > 500 else 780}); pg.wait_for_timeout(250)
        print(f"A–D at {width} px")
        for nm, js in SCREENS:
            try:
                ev(pg, "UI.palette = false"); ev(pg, js); pg.wait_for_timeout(450)
            except Exception as e:
                check(f"{width} px · {nm}: the screen opens", False, str(e)[:300]); continue
            nd = ev(pg, "window.__scan.loadData()")
            r = ev(pg, "window.__scan.texts()")
            if width == 1440:
                tx, ky = fresh(r["texts"]), fresh(r["keys"])
                check(f"{nm}: every text comes from the strings or the data", not tx, tx[:10])
                check(f"{nm}: no raw string key", not ky, ky[:6])
            cl = fresh(ev(pg, "window.__scan.clipped()"))
            check(f"{width} px · {nm}: no label cut off", not cl, cl[:8])
            sx = ev(pg, "window.__scan.scrollX()")
            check(f"{width} px · {nm}: no sideways scrolling", sx <= 2, [sx] + (ev(pg, "window.__scan.wideOnes()") if sx > 2 else []))
        ev(pg, "UI.modal = null; render()")
    pg.set_viewport_size({"width": 1440, "height": 900}); pg.wait_for_timeout(200)

    print("planted faults are found")
    ev(pg, "go('cockpit')"); pg.wait_for_timeout(300); ev(pg, "window.__scan.loadData()")
    pl = ev(pg, """(() => { const mi = document.querySelector('.main-inner') || document.querySelector('.main'), d = document.createElement('div'); d.className = 'ps19-plant';
      const pname = (WS.projects.find(x => /^[A-Za-z]/.test(x.name || '') && (x.name || '').length >= 8) || {}).name || '';
      d.innerHTML = '<button class="btn" data-a="x19">Open the settings</button><button class="btn" data-a="y19" aria-label="Close this panel">⟦×⟧</button><span class="small">set.tab.general.oops</span>'
        + '<button class="btn" data-a="z19" style="width:40px;overflow:hidden;white-space:nowrap">' + t('set.tab.general') + '</button><span class="small own19"></span>';
      d.querySelector('.own19').textContent = pname; mi.prepend(d);
      const r = window.__scan.texts(d), c = window.__scan.clipped(d);
      const res = {hard: r.texts.some(x => /Open the settings/.test(x)), aria: r.texts.some(x => /@aria-label "Close this panel"/.test(x)), key: r.keys.some(x => /set\\.tab\\.general\\.oops/.test(x)),
        clip: c.some(x => /z19/.test(x)), own: !pname || !r.texts.some(x => x.includes(pname.slice(0, 20))), pname};
      d.remove(); return res; })()""")
    check("(a hard-coded English button is found)", pl["hard"], pl)
    check("(a hard-coded aria-label is found)", pl["aria"], pl)
    check("(a raw string key is found)", pl["key"], pl)
    check("(a clipped label is found)", pl["clip"], pl)
    check("(a project name is never reported)", pl["own"], pl)
    pg.set_viewport_size({"width": 390, "height": 780}); pg.wait_for_timeout(200)
    wide = ev(pg, "(() => { const w = document.createElement('div'); w.style.cssText = 'width:600px;height:4px'; (document.querySelector('.main-inner') || document.querySelector('.main')).appendChild(w); const r = window.__scan.scrollX(); w.remove(); return r; })()")
    check("(a 600 px box at 390 px is found)", wide > 2, wide)
    pg.set_viewport_size({"width": 1440, "height": 900})

    check("no page errors", not errors, errors[:5])
    if KNOWN: print("known findings (owned elsewhere, listed with the reason):"); [print("  -", k, "—", why) for k, why in KNOWN]
    ctx.close(); b.close()
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
