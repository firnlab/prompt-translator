"""2.1.0 (A1, A14, B17): the safety layer, on the made-up 2.0 bundle (test/fixtures/synthetic20.json) and a made-up booby-trapped backup
(test/fixtures/booby21.json; every value invented, no project data).
Run: python3 test/e2e210_safe.py [test/fixtures/synthetic20.json]
 H  safeHTML: every planted payload loses its handler, script tag or script:/data: link; PT's own markup never takes the slow path
    (so nothing of PT's is changed) on every main view.
 I  import of the booby-trapped backup: no code runs, nothing reaches Object.prototype, every id is safe (no "/" "." "#" quote), the
    project id cannot point at a restore point, outside image links are cleared and an inline data: image is kept; every view of the
    imported project renders without an on…= attribute or a script: link.
 R  round trip: export → import gives back the same projects, notes, patterns and research (ids and contents), nothing renamed.
 P  data-bind paths: resolvePath refuses __proto__ / constructor / prototype.
 J  the import itself (2.1, owner 7 Nov): whole file checked first (a bad record → nothing written), counts told (imported, skipped, made
    safe, settings), only the allowed settings cross, imported projects are marked and locked (pause/jobs refuse, re-link opens them),
    the morning check reads nothing before the "Watch these" click, Undo removes exactly what the import added.
 F  PT's own frames: the Design-page result mock (sandbox="") and the mock phone (sandbox="allow-scripts") survive safeHTML, take the fast
    path, and get their srcdoc; an injected frame with src or another sandbox goes."""
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
    else if (/^(href|src|action|formaction|srcdoc|data-srcdoc|values|to|from)$/i.test(a.name) && (/script:/.test(v) || /tracker\\.invalid|evil\\.invalid/.test(v))) bad.push(e.tagName + ' ' + a.name + '=' + v.slice(0, 40));
    else if (a.name === 'style' && /position:(fixed|absolute)/.test(v) && e.closest('#app') && !e.closest('.mock-phone')) bad.push(e.tagName + ' style=' + v.slice(0, 40));
    else if (a.name === 'target' && v === '_top') bad.push(e.tagName + ' target=_top'); }
  for (const e of document.querySelectorAll('#app script, #app object, #app embed')) bad.push(e.tagName);
  for (const e of document.querySelectorAll('#app iframe')){ const sb = e.getAttribute('sandbox'); const own = (e.classList.contains('mock') && sb === '') || (e.classList.contains('mock-frame') && sb === 'allow-scripts'); if (!own || e.hasAttribute('src')) bad.push('IFRAME ' + (sb === null ? 'nosandbox' : sb) + (e.hasAttribute('src') ? ' src' : '')); }
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
    pg.evaluate("""() => { window.__slow = []; const orig = safeHTML; safeHTML = function(h){ const s = String(h ?? ''); if (SAFE_HTML_TRIGGER.test(s)) window.__slow.push((s.match(SAFE_HTML_TRIGGER) || [''])[0].slice(0, 60)); return orig(h); }; }""")

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
    pg.evaluate("window.__slow = []"); views = pg.evaluate(VIEWS)
    ck("H.fast", "PT's own markup never takes the slow path on the main views (measured on the input, not the output)", not pg.evaluate("window.__slow.length"), pg.evaluate("window.__slow.slice(0, 5)"))
    pid0 = pg.evaluate("WS.projects.filter(p => !p.deletedAt)[0].id")
    # a project with a result mock and a mock phone: PT's own frames must not trip the filter
    pg.evaluate(f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid0}'); p.arch.mockupHtml = '<main><h1>Mock</h1><button>Go</button></main>'; p.mock = {{html: '<body><button onclick="alert(1)">tap</button><script>1</script></body>', screens: [], note: '', at: now(), v: 1, status: 'open', notes: []}}; }})()""")
    pg.evaluate("window.__slow = []"); phs = pg.evaluate(PHASES, pid0)
    perph = pg.evaluate("""async (pid) => { const p = curP(); UI.home = false; const out = {}; for (const ph of PHASE_IDS){ p.phase = ph; p.focus = {ph, id: null}; pgShowPhase(p, ph); window.__slow = []; render(); await new Promise(r => setTimeout(r, 60)); out[ph] = {slow: window.__slow.slice(0, 3), bad: """ + DOM_BAD + """}; } return out; }""", pid0)
    ck("H.fast.project", "PT's own project pages take the fast path on every phase, a result mock and a mock phone included", not any(v["slow"] for v in perph.values()), {k: v["slow"] for k, v in perph.items() if v["slow"]})
    ck("H.dom.clean", "no on…= attribute, script: link, outside frame or overlay on any of PT's own pages", not any(v["bad"] for v in perph.values()), {k: v["bad"][:3] for k, v in perph.items() if v["bad"]})
    # ---------- F: PT's own frames survive and get their content; foreign frames go ----------
    fr = pg.evaluate("""() => { const p = curP(); UI.home = false; p.phase = 'arch'; p.focus = {ph: 'arch', id: null}; pgShowPhase(p, 'arch'); window.__slow = []; render(); afterRender && afterRender(); const f = document.querySelector('#app iframe.mock'); return f ? {sb: f.getAttribute('sandbox'), src: f.hasAttribute('src'), doc: (f.srcdoc || '').slice(0, 30), rp: f.getAttribute('referrerpolicy')} : null; }""")
    ck("F.mockup", "the Design-page result mock is on the page (sandbox=\"\", no src, srcdoc filled, no referrer) and the page took the fast path", fr and fr["sb"] == "" and not fr["src"] and "Mock" in fr["doc"] and fr["rp"] == "no-referrer" and not pg.evaluate("window.__slow.length"), (fr, pg.evaluate("window.__slow.slice(0, 3)")))
    fr2 = pg.evaluate("""() => { const d = document.createElement('div'); d.innerHTML = safeHTML('<iframe class="mock" sandbox="" data-srcdoc="x"></iframe><iframe class="mock-frame" sandbox="allow-scripts" srcdoc="y"></iframe><iframe sandbox="" src="https://evil.invalid/login"></iframe><iframe class="mock" sandbox="allow-same-origin" srcdoc="z"></iframe><iframe srcdoc="w"></iframe>');
      return Array.from(d.querySelectorAll('iframe')).map(f => (f.className || '-') + ':' + f.getAttribute('sandbox')); }""")
    ck("F.foreign", "safeHTML keeps exactly PT's two frame kinds and removes frames with src, other sandboxes or none", fr2 == ["mock:", "mock-frame:allow-scripts"], fr2)
    ck("F.trigger", "an injected frame with src still trips the filter; PT's result mock does not", pg.evaluate("""SAFE_HTML_TRIGGER.test('<iframe sandbox="" src="https://evil.invalid/x">') && !SAFE_HTML_TRIGGER.test('<iframe class="mock" sandbox="" title="t" data-srcdoc="&lt;p&gt;x">')"""))
    pg.evaluate(f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid0}'); p.arch.mockupHtml = ''; p.mock = null; }})()""")

    # ---------- R: round trip (before the traps, on the clean bundle) ----------
    snap = pg.evaluate("""() => JSON.stringify({projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    exp = pg.evaluate("""async () => { let got = null; const orig = saveFile; saveFile = async (n, d) => { got = d; }; try{ await ACTIONS['export-ws'](); }finally{ saveFile = orig; } return got; }""")
    ck("R.export", "the export action writes a backup file with the four record kinds and the workspace settings", exp and all(k in json.loads(exp) for k in ("projects", "notes", "patterns", "research", "workspace")), (exp or "")[:80])
    _unused = pg.evaluate("""() => JSON.stringify({app: 'prompt-translator', version: 1, exportedAt: now(), workspace: {name: WS.name, settings: WS.settings, profile: WS.profile}, projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    pg.evaluate("() => { WS.projects = []; WS.notes = []; WS.patterns = []; WS.research = []; }")
    pg.evaluate(IMPORT, exp)
    toast1 = pg.evaluate("Array.from(document.querySelectorAll('#toasts .toast')).map(e => e.textContent).join(' | ')")
    ck("R.toast", "the import names what it did (projects and records counted)", "projects " in toast1 or "Projekte " in toast1, toast1[:200])
    pg.evaluate("() => { for (const p of WS.projects){ delete p.imported; p.watch20Ok = true; } }")   # a restore of one's own backup: the mark is checked in J; here the contents
    after = pg.evaluate("""() => JSON.stringify({projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research})""")
    A, S = json.loads(after), json.loads(snap)
    def core(p): q = dict(p); [q.pop(k, None) for k in ("versions", "versionNo", "updatedAt", "updated", "_v", "_rev", "savedAt", "touchedAt", "imported", "watch20Ok")]; return q
    ck("R.projects", "round trip: the same projects (ids, names, contents) come back", [core(p) for p in A["projects"]] == [core(p) for p in S["projects"]],
       [(p["id"], p.get("name")) for p in A["projects"]][:5])
    ck("R.ids", "round trip: no project renamed or given a new id", [p["id"] for p in A["projects"]] == [p["id"] for p in S["projects"]] and not any("(" in str(p.get("name")) and p.get("name") not in [q.get("name") for q in S["projects"]] for p in A["projects"]))
    for k in ("notes", "patterns", "research"):
        ck("R." + k, f"round trip: the same {k} come back", A[k] == S[k], (len(A[k]), len(S[k])))

    n1 = pg.evaluate("[WS.projects.length, WS.notes.length, WS.patterns.length, WS.research.length]")
    pg.evaluate(IMPORT, exp)
    n2 = pg.evaluate("[WS.projects.length, WS.notes.length, WS.patterns.length, WS.research.length]")
    toast2 = pg.evaluate("Array.from(document.querySelectorAll('#toasts .toast')).map(e => e.textContent).join(' | ')")
    ck("R.again", "importing the same backup again adds the projects as copies (suffix) and skips every note, pattern and research entry, and says so", n2[0] == 2 * n1[0] and n2[1:] == n1[1:] and (sum(n1[1:]) == 0 or "skipped" in toast2 or "übersprungen" in toast2), (n1, n2, toast2[-200:]))
    pg.evaluate("ACTIONS['import-undo']()"); pg.wait_for_timeout(100); pg.locator(".modal [data-a=confirm-yes], .modal .btn.primary, .modal .btn.danger").first.click(timeout=2000); pg.wait_for_timeout(200)
    n3 = pg.evaluate("[WS.projects.length, WS.notes.length, WS.patterns.length, WS.research.length]")
    ck("R.undo", "Undo import (after the confirm) removes exactly what the second import added", n3 == n1, (n1, n3))

    # ---------- I: the booby-trapped backup ----------
    n0 = pg.evaluate("WS.projects.length")
    v = pg.evaluate(IMPORT, TRAP)
    ck("I.reset", "the file input is reset after the import", v == "")
    st = pg.evaluate("""() => { const p = WS.projects[WS.projects.length - 1]; const ids = []; const walk = o => { if (Array.isArray(o)) o.forEach(x => { if (x && typeof x === 'object' && 'id' in x) ids.push(x.id); walk(x); }); else if (o && typeof o === 'object'){ if ('id' in o && o !== p) ids.push(o.id); walk0(o); } }; const walk0 = o => { if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k])); };
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
    perph2 = pg.evaluate("""async (pid) => { openProject(pid); const p = curP(); UI.home = false; const out = {}; for (const ph of PHASE_IDS){ p.phase = ph; p.focus = {ph, id: null}; pgShowPhase(p, ph); render(); await new Promise(r => setTimeout(r, 60)); try{ afterRender && afterRender(); }catch(e){} out[ph] = """ + DOM_BAD + """; } return out; }""", pid)
    bad = [k + ": " + x for k, v in perph2.items() for x in v]
    ck("I.phases", "every phase page of the trapped project is clean (checked per phase, Assume/Design/Test/Engine included)", not bad, bad[:8])
    deep = pg.evaluate(f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); let o = p.deep, d = 0; while (o && o.inner){{ o = o.inner; d++; }} return {{d, id: o && o.id}}; }})()""")
    ck("I.deep", "an unsafe id 27 levels down is made safe too", deep["id"] and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", str(deep["id"])) is not None, deep)
    nums = pg.evaluate(f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); return {{as: arr(p.assumptions).map(a => [a.impact, a.risk]), rk: arr(p.risks).map(r => [r.likelihood, r.impact]), fit: arr((p.engine.scan || {{}}).existing).map(x => x.fit), ids: arr(p.assumptions).map(a => typeof a.id)}}; }})()""")
    ck("I.nums", "likelihood, impact, risk and fit from the file are numbers (1–5 / 0–100), numeric ids are strings", all(isinstance(x, int) and 1 <= x <= 5 for pair in nums["as"] + nums["rk"] for x in pair) and all(isinstance(x, int) for x in nums["fit"]) and set(nums["ids"]) == {"string"}, nums)
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

    # ---------- J: the import itself ----------
    J = pg.evaluate(f"""(() => {{ const p = WS.projects.find(x => x.id === '{pid}'); return {{imported: p.imported, watch: p.watch20Ok, locked: importedLocked(p), trig: arr(p.tool.triggers).map(x => x.id), lang: WS.settings.lang, theme: WS.settings.theme, budget: WS.settings.weeklyBudget, helpers: JSON.stringify(WS.settings.helpers20 || null), ipt: JSON.stringify(WS.settings.ipt20 || null), usage: JSON.stringify(WS.settings.usage || null), notesDup: WS.notes.filter(n => n.id === 'nDUP').length}}; }})()""")
    ck("J.mark", "the imported project is marked 'from a backup' and locked; its watch flag is off", J["imported"] and J["imported"]["relinked"] is False and J["locked"] and J["watch"] is False, J)
    ck("J.settings", "only the allowed settings cross (language, theme, budget); helpers, reports and usage from the file do not", J["lang"] == "de" and J["theme"] == "dark" and J["budget"] == 123 and '"evil"' not in J["helpers"] and J["ipt"] in ("null", "[]") and J["usage"] != '{"units":9999}', J)
    pg.evaluate("() => { WS.settings.lang = 'en'; LANG = 'en'; WS.settings.theme = 'system'; WS.settings.weeklyBudget = 400; }")
    calls = pg.evaluate(f"""async () => {{ const p = WS.projects.find(x => x.id === '{pid}'); window.__runner = []; const orig = Runner.setEnabled; Runner.setEnabled = async (id, on) => {{ window.__runner.push(id); }};
      try{{ await setToolPaused(p, true); const j = await startJob('collect', {{title: 'x', instructions: 'x', projectId: p.id}}); return {{runner: window.__runner, job: j, paused: p.tool.paused, toast: Array.from(document.querySelectorAll('#toasts .toast')).map(e => e.textContent).join(' | ')}}; }}
      finally{{ Runner.setEnabled = orig; }} }}""")
    ck("J.locked", "pause and a job refuse the backup's trigger/artifact ids before re-link (the trigger from elsewhere is never touched), and say why", calls["runner"] == [] and calls["job"] is None and not calls["paused"] and ("re-link" in calls["toast"] or "neu verknüpfen" in calls["toast"]), calls)
    pg.evaluate(f"""(() => {{ openProject('{pid}'); UI.view = 'project'; const p = curP(); p.live = p.live || {{v: 1, since: now()}}; p.phase = 'launch'; render(); }})()""")
    pg.evaluate("UI.modal = null; render()")
    pg.evaluate("ACTIONS['relink-imported']()"); pg.wait_for_timeout(100)
    mod = pg.evaluate("document.querySelector('.modal') ? document.querySelector('.modal').textContent : ''")
    ck("J.relink.ids", "re-link asks once and shows the ids it would touch", "trig_01QoaJrEReBgg2BnQZ8pZpm3" in mod and "ARTIFACT-FROM-ELSEWHERE" in mod, mod[:300])
    pg.locator(".modal .btn.primary, .modal .btn.danger").first.click(timeout=2000); pg.wait_for_timeout(150)
    ck("J.relink", "after the click the project is unlocked", pg.evaluate(f"!importedLocked(WS.projects.find(x => x.id === '{pid}'))"))
    badfile = json.dumps({"app": "prompt-translator", "version": 1, "projects": [{"id": "pGOOD", "name": "fine"}], "notes": [5]})
    before = pg.evaluate("[WS.projects.length, WS.notes.length]")
    pg.evaluate(IMPORT, badfile)
    after2 = pg.evaluate("[WS.projects.length, WS.notes.length]")
    ck("J.allornothing", "a file with one bad record writes nothing (the good project in it is not half-imported)", before == after2 and pg.evaluate("!WS.projects.some(p => p.id === 'pGOOD')"), (before, after2))
    gate = pg.evaluate(r"""() => { const src = String(mc20Run); return {ask: /watchask/.test(src), gate: /p\.watch20Ok && !importedLocked\(p\)\) for/.test(src), timeout: /Promise\.race/.test(src)}; }""")
    ck("J.watchgate", "the morning check lists a project's pages and reads them only after the owner's click, with a timeout per page", all(gate.values()), gate)

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
