"""2.1.0 (A1, A14, B17): the safety layer, on the made-up 2.0 bundle (test/fixtures/synthetic20.json) and a made-up booby-trapped backup
(test/fixtures/booby21.json; every value invented, no project data).
Run: python3 test/e2e210_safe.py [test/fixtures/synthetic20.json]
 H  safeHTML: every planted payload loses its handler, script tag or script:/data: link; PT's own markup never takes the slow path
    (so nothing of PT's is changed) on every main view.
 I  import of the booby-trapped backup: no code runs, nothing reaches Object.prototype, every id is safe (no "/" "." "#" quote), the
    project id cannot point at a restore point, outside image links are cleared and an inline data: image is kept; every view of the
    imported project renders without an on…= attribute or a script: link.
 R  round trip: export → import gives back the same projects, notes, patterns and research (ids and contents), nothing renamed.
 P  data-bind paths: resolvePath refuses __proto__ / constructor / prototype."""
import json, sys, pathlib, re
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
BK = ARGS[0] if ARGS else "test/fixtures/synthetic20.json"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
TRAP = (ROOT / "test/fixtures/booby21.json").read_text()
def ck(cid, name, cond, info=""):
    (oks if cond else fails).append(cid + " " + name + ("" if cond else "  → " + str(info)[:400]))
    print(("ok    " if cond else "FAIL  ") + cid + " " + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
DOM_BAD = """(() => { const bad = [];
  for (const e of document.querySelectorAll('*')) for (const a of e.attributes){
    const v = a.value.replace(/[\\x00-\\x20]/g, '').toLowerCase();
    if (/^on/i.test(a.name)) bad.push(e.tagName + ' ' + a.name);
    else if (/^(href|src|action|formaction)$/i.test(a.name) && (/script:/.test(v) || /tracker\\.invalid/.test(v))) bad.push(e.tagName + ' ' + a.name + '=' + v.slice(0, 40)); }
  for (const e of document.querySelectorAll('#app script, #app iframe, #app object, #app embed')) bad.push(e.tagName);
  return bad; })()"""
VIEWS = """async () => { const out = {}; for (const v of ['cockpit', 'notes', 'library', 'insights', 'settings']){ UI.view = v; if (v === 'settings') UI.setTab = 'data'; render(); await new Promise(r => setTimeout(r, 60));
  const h = document.getElementById('app').innerHTML; out[v] = {slow: SAFE_HTML_TRIGGER.test(h), len: h.length}; } UI.view = 'cockpit'; render(); return out; }"""
PHASES = """async (pid) => { openProject(pid); const p = curP(); const out = [];
  for (const ph of PHASE_IDS){ p.phase = ph; p.focus = {ph, id: null}; render(); await new Promise(r => setTimeout(r, 60)); out.push(ph); }
  return out; }"""
IMPORT = """async (txt) => { const el = {files: [new File([txt], 'b.json', {type: 'application/json'})], value: 'x'}; await CHANGES['import-ws'](el); await new Promise(r => setTimeout(r, 300)); return el.value; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx)

    # ---------- H: safeHTML ----------
    payloads = {
        "img onerror": '<img src=x onerror="window.__pwn=1">',
        "slash separator": '<img src=x/onerror=window.__pwn=1>',
        "quote breaks the tag": '<img alt=">" onerror="window.__pwn=1">',
        "svg onload": '<svg><animate onbegin="window.__pwn=1"/></svg><svg onload=window.__pwn=1>',
        "script tag": '<script>window.__pwn=1</script>',
        "javascript link": '<a href="javascript:window.__pwn=1">x</a>',
        "tab in the scheme": '<a href="java\tscript:window.__pwn=1">x</a>',
        "entity in the scheme": '<a href="javascript&#58;window.__pwn=1">x</a>',
        "data html link": '<a href="data:text/html,<script>1</script>">x</a>',
        "form action": '<form action="javascript:1"><button formaction="javascript:2">x</button></form>',
        "iframe srcdoc": '<iframe srcdoc="<script>1</script>"></iframe>',
        "meta refresh": '<meta http-equiv="refresh" content="0;url=https://x.invalid">',
        "style import": '<style>@import url(https://tracker.invalid/a.css)</style>',
        "base": '<base href="https://x.invalid/">',
    }
    for k, v in payloads.items():
        r = pg.evaluate("""(h) => { const d = document.createElement('div'); d.innerHTML = safeHTML(h); const bad = [];
          for (const e of d.querySelectorAll('*')) for (const a of e.attributes){ const v = a.value.replace(/[\\x00-\\x20]/g, '').toLowerCase();
            if (/^on/i.test(a.name) || /^(srcdoc)$/i.test(a.name) || (/^(href|src|action|formaction)$/i.test(a.name) && (/script:/.test(v) || /^data:(?!image)/.test(v)))) bad.push(a.name + '=' + v); }
          for (const e of d.querySelectorAll('script,iframe,meta,style,base,object,embed')) bad.push(e.tagName);
          return bad; }""", v)
        ck("H." + k, "safeHTML removes it: " + k, not r, r)
    keep = pg.evaluate("""() => { const h = '<a class="chip" href="https://example.com/a?b=1&amp;c=2" target="_blank">x</a><img src="data:image/png;base64,iVBOR"><img src="/_blob/abc"><button data-a="x" data-id="p-1">y</button><p>a &lt;script&gt; text, javascript: as a word, on=off</p>';
      const d1 = document.createElement('div'); d1.innerHTML = h; const d2 = document.createElement('div'); d2.innerHTML = safeHTML(h); return d1.innerHTML === d2.innerHTML; }""")
    ck("H.keep", "safeHTML keeps https links, data:image and /_blob/ images, buttons and text (even 'javascript:' as a word)", keep)
    views = pg.evaluate(VIEWS)
    ck("H.fast", "PT's own markup never takes the slow path on the main views (nothing of PT's is changed)", not any(v["slow"] for v in views.values()), views)
    pid0 = pg.evaluate("WS.projects.filter(p => !p.deletedAt)[0].id")
    pg.evaluate(PHASES, pid0); slow = pg.evaluate("SAFE_HTML_TRIGGER.test(document.getElementById('app').innerHTML)")
    ck("H.fast.project", "PT's own project views take the fast path too", not slow)
    ck("H.dom.clean", "no on…= attribute and no script: link anywhere in PT's own page", not pg.evaluate(DOM_BAD), pg.evaluate(DOM_BAD))

    # ---------- R: round trip (before the traps, on the clean bundle) ----------
    snap = pg.evaluate("""() => JSON.stringify({projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    exp = pg.evaluate("""() => JSON.stringify({app: 'prompt-translator', version: 1, exportedAt: now(), workspace: {name: WS.name, settings: WS.settings, profile: WS.profile}, projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    pg.evaluate("() => { WS.projects = []; WS.notes = []; WS.patterns = []; WS.research = []; }")
    pg.evaluate(IMPORT, exp)
    after = pg.evaluate("""() => JSON.stringify({projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    A, S = json.loads(after), json.loads(snap)
    def core(p): q = dict(p); [q.pop(k, None) for k in ("versions", "versionNo", "updatedAt", "updated", "_v", "_rev", "savedAt", "touchedAt")]; return q
    ck("R.projects", "round trip: the same projects (ids, names, contents) come back", [core(p) for p in A["projects"]] == [core(p) for p in S["projects"]],
       [(p["id"], p.get("name")) for p in A["projects"]][:5])
    ck("R.ids", "round trip: no project renamed or given a new id", [p["id"] for p in A["projects"]] == [p["id"] for p in S["projects"]] and not any("(" in str(p.get("name")) and p.get("name") not in [q.get("name") for q in S["projects"]] for p in A["projects"]))
    for k in ("notes", "patterns", "research"):
        ck("R." + k, f"round trip: the same {k} come back", A[k] == S[k], (len(A[k]), len(S[k])))

    # ---------- I: the booby-trapped backup ----------
    n0 = pg.evaluate("WS.projects.length")
    v = pg.evaluate(IMPORT, TRAP)
    ck("I.reset", "the file input is reset after the import", v == "")
    st = pg.evaluate("""() => { const p = WS.projects[WS.projects.length - 1]; const ids = []; const walk = o => { if (Array.isArray(o)) o.forEach(x => { if (x && typeof x === 'object' && 'id' in x) ids.push(x.id); walk(x); }); else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k])); };
      walk(p); walk(WS.notes); walk(WS.patterns); walk(WS.research);
      return {n: WS.projects.length, pid: p.id, name: p.name, ids, bad: ids.filter(i => typeof i === 'string' && !/^[A-Za-z0-9_-]{1,64}$/.test(i)),
        protoKeys: JSON.stringify(p).match(/__proto__|"constructor"|"prototype"/g),
        pwn: window.__pwn, polluted: ({}).pollutedTop || ({}).pollutedDeep || ({}).title || ({}).heldOut || null,
        noteImgs: WS.notes.map(n => n.image || ''), exFiles: JSON.stringify(arr(p.examples)), srcs: JSON.stringify(arr(p.sources)),
        lik: arr(p.risks).map(r => r.likelihood) }; }""")
    ck("I.added", "the trapped project is imported (one more project)", st["n"] == n0 + 1, st)
    ck("I.pid", "its id cannot point at a restore point or part (no '/')", re.fullmatch(r"[A-Za-z0-9_-]{1,64}", st["pid"]) is not None, st["pid"])
    ck("I.ids", "every id in the imported data is safe (letters, digits, _ and - only)", not st["bad"], st["bad"])
    ck("I.proto", "no __proto__ / constructor / prototype key survives the import", not st["protoKeys"], st["protoKeys"])
    ck("I.nopollute", "nothing reached Object.prototype", st["polluted"] is None, st["polluted"])
    ck("I.imgs", "outside image links in notes and example files are cleared (B17)", "tracker.invalid" not in json.dumps(st["noteImgs"]) + st["exFiles"], st["noteImgs"])
    ck("I.imgkeep", "an inline data: image in a note is kept", any(x.startswith("data:image/png") for x in st["noteImgs"]), st["noteImgs"])
    pid = st["pid"]
    pg.evaluate(PHASES, pid)
    bad = pg.evaluate(DOM_BAD)
    for vname in ("cockpit", "notes", "library"):
        pg.evaluate(f"(() => {{ UI.view = '{vname}'; render(); }})()"); pg.wait_for_timeout(80); bad += pg.evaluate(DOM_BAD)
    pg.evaluate(f"(() => {{ openProject('{pid}'); const p = curP(); p.phase = 'understand'; p.focus = {{ph: 'understand', id: null}}; render(); }})()"); pg.wait_for_timeout(100)
    for el in pg.locator("[data-a=item-open]").all()[:12]:
        try: el.click(timeout=1500); pg.wait_for_timeout(60); bad += pg.evaluate(DOM_BAD)
        except Exception: pass
    for el in pg.locator("[data-id]").all()[:20]:
        try: el.hover(timeout=800)
        except Exception: pass
    pg.wait_for_timeout(300)
    ck("I.render", "every view of the trapped project renders without an on…= attribute or a script:/tracker link", not bad, sorted(set(bad))[:8])
    ck("I.norun", "no planted code ran (hover, click and render included)", pg.evaluate("window.__pwn === undefined"), pg.evaluate("String(window.__pwn)"))

    # ---------- P: data-bind paths ----------
    r = pg.evaluate("""() => { const root = {requirements: [{id: 'a', title: 'x'}]};
      const a = resolvePath(root, 'requirements.#a.__proto__.title'), b = resolvePath(root, 'tests.#t.constructor.prototype.heldOut'), c = resolvePath(root, 'x.__proto__'), d = resolvePath(root, 'requirements.#a.title');
      return [a, b, c, d && d.key]; }""")
    ck("P.refuse", "resolvePath refuses __proto__ / constructor / prototype and still resolves a normal path", r[:3] == [None, None, None] and r[3] == "title", r)
    ck("P.nopollute", "Object.prototype is untouched", pg.evaluate("({}).title === undefined && ({}).heldOut === undefined"))

    errs = [e for e in errors if "__pwn" not in e]
    ck("Z.errors", "no page errors", not errs, errs[:5])
    b.close()
print(f"ok: {len(oks)} failed: {len(fails)} page errors: {len(errors)}")
sys.exit(1 if fails else 0)
