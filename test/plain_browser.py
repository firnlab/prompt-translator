"""R1b (PLAN-1.9, the owner's reminder decision of 1 Nov 2026): PT outside claude.ai. A gate suite.
First PT makes a full export with its own Export button in a page with the mock runtime (from the real-data copy or the made-up bundle),
then the BUILT file dist/prompt-translator.html is opened in plain Chromium WITHOUT any runtime (no window.claude, no mock, no seed): it
must show the read-only viewer, open that export, list every project and show each project's main content — without AI, runs or
publishing, and without writing anything anywhere (browser storage, cookies, IndexedDB, caches, network).
Run: python3 test/plain_browser.py [work/backup-141 | test/fixtures/synthetic.json]
Covers: inside a runtime PT boots as before (not the viewer); the viewer's first screen ("Open an export", why it is read-only); the
export opens and lists every project (count, names); each project shows its goal, decisions, requirements, design parts and what PT
built; Back; a file that is not a PT export (and a broken one) is refused with a line and changes nothing; no [data-a] control, no
AI / run / publish control; no storage, cookie, IndexedDB, cache or network write (instrumented, plus the browser's own counts); three
languages (no raw keys, German without ß); 390 px without sideways scroll; no page errors. Project contents are never printed."""
import json, sys, pathlib, re, os
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:400]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
DIST = (ROOT / "dist/prompt-translator.html").resolve()
OUT = pathlib.Path("work").resolve() / f"plain-browser-{os.getpid()}.json"   # git-ignored; removed at the end
BAD = pathlib.Path("work").resolve() / f"plain-browser-{os.getpid()}-bad.json"
# counts every way a page could write or send something (it passes everything through; it only counts)
SPY = """(() => { const W = window.__writes = [];
  const wrap = (o, k, tag) => { const f = o[k]; if (typeof f !== 'function') return; o[k] = function(){ W.push(tag); return f.apply(this, arguments); }; };
  wrap(Storage.prototype, 'setItem', 'storage.setItem'); wrap(Storage.prototype, 'removeItem', 'storage.removeItem'); wrap(Storage.prototype, 'clear', 'storage.clear');
  if (window.indexedDB) wrap(IDBFactory.prototype, 'open', 'indexedDB.open');
  if (window.caches) wrap(CacheStorage.prototype, 'open', 'caches.open');
  wrap(window, 'fetch', 'fetch'); wrap(XMLHttpRequest.prototype, 'open', 'xhr'); if (navigator.sendBeacon) wrap(Navigator.prototype, 'sendBeacon', 'beacon');
  const WS0 = window.WebSocket; window.WebSocket = function(){ W.push('websocket'); return new WS0(...arguments); };
  const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie'); if (d && d.set) Object.defineProperty(Document.prototype, 'cookie', {get: d.get, set(v){ W.push('cookie'); return d.set.call(this, v); }, configurable: true});
})();"""
RAW = r"\b(care|wk|kit18|hr|nav|btn)\.[a-z][a-z0-9.]*\b"

with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("0 a full export, made with PT's own Export button (mock runtime)")
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(500)
    check("inside a runtime PT boots as before (the app, not the viewer)", ev(pg, "!!document.querySelector('.app') && VIEW19.on === false && !document.querySelector('.v19')"))
    ev(pg, "window.__downloadData = {}"); ev(pg, "ACTIONS['export-ws']()"); pg.wait_for_timeout(800)
    txt = ev(pg, "(() => { const k = Object.keys(window.__downloadData || {}).find(f => /-backup-/.test(f)); return k ? window.__downloadData[k] : null; })()")
    check("PT's Export handed over one file", bool(txt))
    data = json.loads(txt or "{}")
    projects = [p for p in data.get("projects", []) if isinstance(p, dict) and not p.get("deletedAt")]
    check("…it is a full export of the workspace (app, every project)", data.get("app") == "prompt-translator" and len(projects) == ev(pg, "WS.projects.length") and len(projects) >= 1, [data.get("app"), len(projects)])
    OUT.write_text(txt or ""); BAD.write_text(json.dumps({"app": "something-else", "projects": [{"name": "x"}]}))
    check("no page errors while exporting", not errors, errors[:3])
    ctx.close()

    def plain(locale="en-GB", w=1280, h=900):
        c = b.new_context(viewport={"width": w, "height": h}, locale=locale, color_scheme="light")
        c.add_init_script(SPY)
        p = c.new_page(); reqs = []
        p.on("pageerror", lambda e: errors.append("pageerror(plain): " + str(e)[:300]))
        p.on("console", lambda m: errors.append("console(plain): " + m.text[:300]) if m.type == "error" else None)
        p.on("dialog", lambda d: (errors.append("native dialog: " + d.message[:100]), d.dismiss()))
        p.on("request", lambda r: reqs.append(r.url))
        p.goto(DIST.as_uri()); p.wait_for_selector(".v19", timeout=20000); p.wait_for_timeout(200)
        return c, p, reqs

    print("1 the built file in plain Chromium, no runtime")
    ctx, pg, reqs = plain()
    check("there is no runtime in this page (no window.claude)", ev(pg, "typeof window.claude === 'undefined'"))
    t0 = ev(pg, "document.querySelector('.v19').innerText")
    check("the viewer's first screen: 'Open an export' and why it is read-only", "Open an export" in t0 and "Read-only" in t0 and "no AI" in t0 and "nothing is saved" in t0, t0[:300])
    check("…the file box is there (a plain file input with a label)", ev(pg, "!!document.querySelector('.v19 label input[type=file][data-v19=file]')"))
    pg.set_input_files("input[data-v19=file]", str(BAD)); pg.wait_for_selector(".v19 [role=alert]", timeout=10000)
    check("a file that is not a PT export is refused with a line; nothing is listed", "not a PT export" in ev(pg, "document.querySelector('.v19 [role=alert]').innerText") and not ev(pg, "!!document.querySelector('.v19-projs')"))
    pg.set_input_files("input[data-v19=file]", str(OUT)); pg.wait_for_selector(".v19-projs, .v19 [role=alert]", timeout=60000); pg.wait_for_timeout(300)
    names = ev(pg, "[...document.querySelectorAll('.v19-row b')].map(b => b.textContent)")
    want = [str(p.get("name") or "—") for p in projects]
    check("the export opens: every project is listed, in the file's order", names == want, [len(names), len(want)])
    check("…with the workspace and the export date in the heading", (data.get("workspace") or {}).get("name", "—") in ev(pg, "document.querySelector('.v19 section h2').innerText"))
    bad_proj = []
    for i, p in enumerate(projects[:40]):
        pg.locator(f".v19-row[data-i='{i}']").click(); pg.wait_for_selector(".v19-proj", timeout=10000)
        ns = p.get("northStar") or {}
        exp = {"name": str(p.get("name") or "—"), "goal": str(ns.get("goal") or "").strip()[:60], "secs": len([s for s in (p.get("pkg") or {}).get("sections") or [] if s]),
               "reqs": len([r for r in p.get("requirements") or [] if r]), "comps": len([c for c in (p.get("arch") or {}).get("components") or [] if c]),
               "first_sec": str((((p.get("pkg") or {}).get("sections") or [{}])[0] or {}).get("content") or "").strip()[:60]}
        got = ev(pg, """(e) => { const pr = document.querySelector('.v19-proj'), all = document.querySelector('.v19').innerText;
          const n = (i) => { const s = document.querySelectorAll('.v19-sec')[i]; return s ? s.querySelectorAll('li, .v19-f').length : -1; };
          return {name: pr.querySelector('h2').textContent === e.name, goal: !e.goal || pr.innerText.includes(e.goal.split('\\n')[0].trim()),
            secs: document.querySelectorAll('.v19-sec')[3].querySelectorAll('.v19-f').length === e.secs, reqs: n(1) === e.reqs || (e.reqs === 0 && n(1) === 0),
            comps: n(2) === e.comps || (e.comps === 0 && n(2) === 0), sec: !e.first_sec || all.includes(e.first_sec.split('\\n')[0].trim()),
            ctl: document.querySelectorAll('.v19 [data-a], .v19 textarea, .v19 input:not([type=file]), .v19 [contenteditable]').length}; }""", exp)
        if not all(got[k] for k in ("name", "goal", "secs", "reqs", "comps", "sec")) or got["ctl"]: bad_proj.append((i, {k: v for k, v in got.items() if not v or k == "ctl"}))
        pg.locator("[data-v19=back]").click(); pg.wait_for_selector(".v19-projs", timeout=10000)
    check(f"each project shows its main content read-only: name, goal, decisions, requirements, design parts, what PT built ({min(len(projects), 40)} opened)", not bad_proj, bad_proj[:5])
    check("no control in the viewer acts on anything: no PT action, no AI / run / publish button", ev(pg, "document.querySelectorAll('[data-a]').length === 0 && ![...document.querySelectorAll('button')].some(b => /\\b(AI|Run|Publish|Build|Put live|Ask)\\b/.test(b.textContent))"))
    pg.set_input_files("input[data-v19=file]", str(BAD)); pg.wait_for_selector(".v19 [role=alert]", timeout=10000)
    check("a wrong file later keeps the projects shown before", len(ev(pg, "[...document.querySelectorAll('.v19-row')]")) == len(projects))
    st = ev(pg, "(async () => ({ls: localStorage.length, ss: sessionStorage.length, idb: indexedDB.databases ? (await indexedDB.databases()).length : 0, cookie: document.cookie, writes: window.__writes.slice(0, 20)}))()")
    check("nothing was written: no browser storage, cookie, IndexedDB, cache, fetch, XHR, beacon or socket", st["ls"] == 0 and st["ss"] == 0 and st["idb"] == 0 and st["cookie"] == "" and st["writes"] == [], st)
    check("…and nothing was requested but the file itself", [u for u in reqs if not u.startswith(DIST.as_uri())] == [], [u[:80] for u in reqs][:5])
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(200)
    sx1 = ev(pg, "document.documentElement.scrollWidth - innerWidth")
    pg.locator(".v19-row[data-i='0']").click(); pg.wait_for_selector(".v19-proj"); pg.wait_for_timeout(200)
    sx2 = ev(pg, "document.documentElement.scrollWidth - innerWidth")
    check("390 px: no sideways scroll (list and a project)", sx1 <= 2 and sx2 <= 2, [sx1, sx2])
    ctx.close()

    print("2 three languages")
    for loc, lang, word in (("de-CH", "de", "Export öffnen"), ("zh-CN", "zh", "打开导出文件")):
        ctx, pg, reqs = plain(loc)
        tx = ev(pg, "document.querySelector('.v19').innerText")
        pg.set_input_files("input[data-v19=file]", str(OUT)); pg.wait_for_selector(".v19-projs", timeout=60000)
        pg.locator(".v19-row[data-i='0']").click(); pg.wait_for_selector(".v19-proj")
        tx2 = ev(pg, "[...document.querySelectorAll('.v19-head, .v19-sec summary, .v19 .row')].map(e => e.innerText).join(' ')")
        check(f"{lang}: the viewer in the language, no raw keys" + (", no ß" if lang == "de" else ""), word in tx and ev(pg, "document.documentElement.lang").startswith(lang) and not re.findall(RAW, tx + tx2) and ("ß" not in tx + tx2 if lang == "de" else True), (tx + tx2)[:200])
        check(f"{lang}: still nothing written", ev(pg, "localStorage.length === 0 && window.__writes.length === 0"))
        ctx.close()
    check("no page errors", not errors, errors[:5])
    b.close()
for f in (OUT, BAD):
    try: f.unlink()
    except Exception: pass
try: (ROOT / "test" / PAGE).unlink()
except Exception: pass
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
