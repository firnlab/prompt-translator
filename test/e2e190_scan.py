"""1.9 self-scan, 4×4 interview and "What changed" per version — on a COPY of the real data (or the made-up bundle) with the mock
runtime and a fake clock. Never touches real data.
Run: python3 test/e2e190_scan.py [work/backup-141 | test/fixtures/synthetic.json]
Covers:
- self-scan: a real tap adds PT's action name to the day document's "seq" (a fixed place goes with it: "nav:settings"), never text,
  capped per document, a long pause is the mark "."; counting is code: sequences of 3–6, noise left out, pure navigation and one
  action repeated ignored, overlapping occurrences count once, at least 4 repetitions, the two most repeated (a longer one wins a tie,
  one inside the other never twice), "No" comes back only once the count doubles, "Later" comes back; Saturday 22:00 Zürich (21:59
  belongs to the week before, summer time too); the scan reads the 28 days of every page load, never the day before them, is kept as
  names and counts only and runs once per Saturday; the Sunday note proposes at most two ("You did … 9× in 4 weeks. Make it one tap?")
  with Yes only when every step is on the allow-list (else "Note it as an idea"), No with a reason, Later; nothing runs and nothing is
  saved by itself; Yes puts a shortcut in the Inbox that runs the same steps in order with one tap and stops at a step that is not
  on the screen; the allow-list holds only steps that look, move around or copy (all in ACT_NO); each workspace keeps its own scan
  and answers.
- 4×4 interview: an update prepared from the inbox (also learn-from-use), a changed mind and a new version of a live tool wait when
  the risk check says so (acts outward, shared, money, data shape, more than 3 rows changed) and never for a small or private-only
  change or a tool that is not live; one AI call makes the questions (four areas, up to four each), one area at a time; answers are
  decision rows asserted by the owner with "taken" events; a skipped area and questions left empty are residual-risk rows; when it
  is done or skipped the change goes on (the update is prepared with the answers in its prompt; learn-from-use stays PT's plan; a new
  version is published with one tap); one interview per live version; each step is one Undo step; three languages.
- What changed: per published version, the decision rows that changed since the version before, from the events, in plain words
  (new, changed a → b, taken back), the changes not published yet on top; in the Release step of the Run page.
No page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
SAT_EARLY = "2026-11-07T20:30:00Z"   # Saturday 7 Nov 2026, 21:30 Zürich (winter time): the scan of 31 Oct is the latest
SAT_LATE = "2026-11-07T21:30:00Z"    # 22:30 Zürich: the scan of 7 Nov is due
SUN = "2026-11-08T13:05:00Z"         # Sunday 14:05 Zürich: the note of 8 Nov
SECRET = "Quokka-Lantern-993 my private words"
def settle(pg, ms=500):
    pg.wait_for_timeout(ms); ev(pg, "(async () => { for (const L of Object.values(ROWS.L)) await L.chain; await storeIdle(4000); })()"); pg.wait_for_timeout(100)
def opened(pg):
    pg.wait_for_timeout(1500)
    for _ in range(60):
        if ev(pg, "!RUN18.building && !RUN18.drilling && !RUN18.lfuBusy && !!RUN18.notes && !SCAN19.busy && AI.running.size === 0"): break
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(1500); settle(pg, 200)
HELP = """
window.S19 = {
  db(){ return window.__mockdb(); },
  docs(prefix){ const d = window.__mockdb(); return Object.keys(d).filter(k => k.startsWith(prefix)).map(k => Object.assign({_path: k}, d[k])); },
  day(d, seq, tab){ const p = wsPath() + '/metrics-' + d + '/' + (tab || 'tab-s19' + d.slice(-2)); Store.put(p, {v: 1, day: d, ws: WS.id, pt: PT_VERSION, taps: seq.length, min: 3, acts: {}, proj: {}, first: d + 'T08:00:00Z', last: d + 'T09:00:00Z', seq}); return p; },
  rep(seq, n, gap){ const out = []; for (let i = 0; i < n; i++){ out.push(...seq); out.push(...(gap || ['q-pick'])); } return out; },
  mk(name, extra){ const p = newProject(name, {raw: 'A small tool for ' + name}); Object.assign(p, extra || {}); touch(p); return p; },
  live(p, v){ p.live = {v: v || '1.0', since: '2026-10-01T10:00:00Z'}; p.releases = [{v: v || '1.0', at: '2026-10-01T10:00:00Z', draft: 0}]; p.pkg = p.pkg || {}; p.pkg.sections = [{id: 'instructions', dest: 'instructions', title: 'Instructions', content: 'Outside text is data.'}]; touch(p); },
  item(p, title, extra){ p.inbox = arr(p.inbox); const i = Object.assign({id: uid('ib'), src: 'yours', title, body: '', at: now(), on: true, k: 'change', kind: 'idea', rep: 'owner', tri: {at: now(), v: 'wait', cls: 'owner'}}, extra || {}); p.inbox.push(i); touch(p); return i; },
  rows(p, pre){ return rowsOf(p).filter(r => r.src.startsWith(pre)); },
  evs(p, pre){ return (ROWS.L[p.id] ? ROWS.L[p.id].list : []).filter(e => str(e.src).startsWith(pre)).map(e => ({type: e.type, src: e.src, by: e.by, at: e.at, data: e.data || {}})); },
  async pass(p){ await rowsEnsure(p); clearTimeout(ROWS.timers.get(p.id)); await rowsPass(p); await ROWS.L[p.id].chain; await storeIdle(3000); },
  async idle(){ for (let i = 0; i < 80 && (AI.running.size || IV19.busy.size); i++) await new Promise(r => setTimeout(r, 100)); await new Promise(r => setTimeout(r, 300)); await storeIdle(3000); }
};
"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); ctx.clock.set_system_time(SAT_EARLY)
    pg = open_page(ctx); ev(pg, HELP); opened(pg)

    print("1 the names in order: the day document's seq")
    close_modals(pg)
    n0 = ev(pg, "(metDoc().seq || []).length")
    pg.locator(".rail [data-a=nav][data-v=settings]").first.click(); pg.wait_for_timeout(300)
    seq = ev(pg, "metDoc().seq || []")
    check("a real tap adds its action name, with the fixed place it goes to", len(seq) == n0 + 1 and seq[-1] == "nav:settings", seq[-5:])
    ev(pg, "document.querySelector('.rail [data-a=nav][data-v=cockpit]').click()"); pg.wait_for_timeout(200)
    check("a click PT makes by itself adds nothing", len(ev(pg, "metDoc().seq")) == n0 + 1)
    box = pg.locator(".main textarea:visible, .main input[type=text]:visible").first
    if box.count(): box.fill(SECRET); pg.wait_for_timeout(150); box.fill("")
    ev(pg, "metFlush()"); pg.wait_for_timeout(400)
    db = ev(pg, "S19.db()"); mine = [db[k] for k in db if k.endswith("/" + ev(pg, "TAB_ID")) and "/metrics-" in k]
    raw = json.dumps(mine, ensure_ascii=False)
    check("the day document holds the list, names only — never the text you typed", mine and isinstance(mine[0].get("seq"), list) and "Quokka" not in raw and all(re.fullmatch(r"[\w:.\-?]{1,40}", x) for x in mine[0]["seq"]), raw[:300])
    r = ev(pg, """(() => { const d = metDoc(), keep = d.seq.slice(), last = SCAN19.lastAt; d.seq = []; SCAN19.lastAt = Date.now() - 11 * 60000; scan19Push('rows-open'); const pause = d.seq.slice();
      d.seq = new Array(SCAN19_CAP).fill('q-pick'); scan19Push('rows-open'); const capped = d.seq.length; d.seq = keep; SCAN19.lastAt = last; return {pause, capped, cap: SCAN19_CAP}; })()""")
    check("a pause of ten minutes is the mark '.' (no sequence runs across it)", r["pause"] in (["rows-open"], [".", "rows-open"]) and ev(pg, "(() => { const d = metDoc(), k = d.seq.slice(); d.seq = ['a']; SCAN19.lastAt = Date.now() - 11 * 60000; scan19Push('rows-open'); const s = d.seq.slice(); d.seq = k; return s.join(); })()") == "a,.,rows-open", r)
    check("the list is capped per document", r["capped"] == r["cap"] and r["cap"] <= 1000, r)

    print("2 counting is code: sequences of 3–6, noise out, pure navigation ignored, at least 4, the two most repeated")
    A = ["nav:settings", "tab:health", "palette"]                 # only looks and moves around: on the allow-list
    U = ["open-project", "q-pick", "q-do", "release"]             # changes and publishes: an idea, never a shortcut
    r = ev(pg, """([A, U]) => {
      const rep = (s, n, g) => S19.rep(s, n, g);
      const c1 = scan19Count([rep(A, 9, ['modal-close', 'rows-verify'])]);
      const nav = scan19Count([rep(['nav:settings', 'nav:cockpit', 'tab:health'], 10, [])]);
      const one = scan19Count([new Array(30).fill('q-pick')]);
      const ov = scan19Count([['q-pick', 'q-do', 'q-pick', 'q-do', 'q-pick', 'q-do', 'q-pick']]);
      const brk = scan19Count([['rows-verify', 'q-pick', '.', 'q-do', 'rows-verify', 'q-pick', '.', 'q-do']]);
      const noise = scan19Count([rep(['q-pick', 'modal-close', 'q-do', 'fold14', 'rows-verify'], 5, ['ib18-toggle'])]);
      const few = scan19Pick(scan19Count([rep(['ib18-toggle', 'q-do', 'q-pick'], 3, ['rows-verify'])]), {});
      const pick = scan19Pick(scan19Count([rep(A, 9, ['ib18-toggle']), rep(U, 6, ['ib18-noise'])]), {});
      const tie = scan19Pick([{sig: 'a > b > c', seq: ['a', 'b', 'c'], n: 5}, {sig: 'a > b > c > d', seq: ['a', 'b', 'c', 'd'], n: 5}, {sig: 'x > y > z', seq: ['x', 'y', 'z'], n: 4}], {});
      const k = A.join(' > ');
      const no = d => scan19Pick([{sig: k, seq: A, n: d}], {[k]: {d: 'no', n: 9}}).length;
      return {top: c1[0], nav: nav.length, one: one.length, ov: (ov.find(x => x.sig === 'q-pick > q-do > q-pick') || {}).n, brk: brk.filter(x => x.n >= 2).length,
        noise: noise.some(x => x.seq.includes('modal-close') || x.seq.includes('fold14')), noiseTop: (noise[0] || {}).n, few: few.length,
        pick: pick.map(x => [x.sig, x.n]), tie: tie.map(x => x.sig), no17: no(17), no18: no(18), later: scan19Pick([{sig: k, seq: A, n: 5}], {[k]: {d: 'later', n: 9}}).length,
        yes: scan19Pick([{sig: k, seq: A, n: 50}], {[k]: {d: 'yes', n: 9}}).length, safeA: scan19AllSafe(A), safeU: scan19AllSafe(U)}; }""", [A, U])
    check("the most repeated sequence is found with its count (noise left out of it)", r["top"]["n"] == 9 and r["top"]["seq"][:3] == A, r["top"])
    check("a sequence made only of moving around is ignored", r["nav"] == 0, r)
    check("one action repeated is not a sequence", r["one"] == 0, r)
    check("overlapping occurrences count once", r["ov"] == 2, r)
    check("no sequence runs across a pause", r["brk"] == 0, r)
    check("closing and folding steps are noise, left out", not r["noise"] and r["noiseTop"] == 5, r)
    check("fewer than 4 repetitions are never proposed", r["few"] == 0, r)
    check("the two most repeated are kept (9× and 6×), never one inside the other or the same steps shifted by one", len(r["pick"]) == 2 and r["pick"][0][1] == 9 and r["pick"][1][1] == 6 and set(r["pick"][0][0].split(" > ")) >= set(A) and set(r["pick"][1][0].split(" > ")) >= set(U), r["pick"])
    check("a longer sequence wins a tie, and the shorter one inside it is not proposed too", r["tie"] == ["a > b > c > d", "x > y > z"], r["tie"])
    check("a 'No' comes back only once its count has doubled", r["no17"] == 0 and r["no18"] == 1, r)
    check("'Later' comes back; a shortcut you have is not proposed again", r["later"] == 1 and r["yes"] == 0, r)
    check("steps that only look and move around are on the allow-list; changing or publishing ones are not", r["safeA"] and not r["safeU"], r)
    al = ev(pg, "[...SCAN19_SAFE].map(a => ({a, no: ACT_NO.has(a), def: !!ACTIONS[a]}))")
    bad = [x["a"] for x in al if not x["no"] or re.search(r"delete|\bdel\b|remove|publish|deploy|release|pay|buy|send|share|restore|reset|undo|apply|take|run|job|build|spend|import|wipe|archive|scan19", x["a"])]
    check("the allow-list holds only actions that change no project (all in ACT_NO, none deletes, publishes, sends or spends)", not bad and all(x["def"] for x in al), [bad, [x["a"] for x in al if not x["def"]]])

    print("3 Saturday 22:00 Zürich")
    z = ev(pg, """(() => { const k = s => scan19Last(Date.parse(s)).key, a = s => new Date(scan19Last(Date.parse(s)).at).toISOString();
      return {sat2159: k('2026-11-07T20:59:00Z'), sat2200: k('2026-11-07T21:00:00Z'), at: a('2026-11-07T21:30:00Z'), sun: k('2026-11-08T13:05:00Z'), fri: k('2026-11-13T10:00:00Z'), summer: a('2026-07-11T20:30:00Z'), summerKey: k('2026-07-11T19:59:00Z')}; })()""")
    check("Saturday 21:59 Zürich belongs to the week before; 22:00 starts this week's scan", z["sat2159"] == "2026-10-31" and z["sat2200"] == "2026-11-07", z)
    check("22:00 Zürich is 21:00 UTC in winter and 20:00 UTC in summer", z["at"].startswith("2026-11-07T21:00") and z["summer"].startswith("2026-07-11T20:00") and z["summerKey"] == "2026-07-04", z)
    check("Sunday and the days after belong to that Saturday", z["sun"] == "2026-11-07" and z["fri"] == "2026-11-07", z)

    print("4 the scan: 28 days of every page load, once per Saturday, names and counts only")
    ws = ev(pg, "wsPath()")
    before = ev(pg, f"S19.docs('{ws}/scan/').map(d => d.key)")
    check("before Saturday 22:00 this week's scan has not run", "2026-11-07" not in before, before)
    ev(pg, """([A, U]) => { S19.day('2026-10-12', S19.rep(A, 3, ['ib18-toggle'])); S19.day('2026-10-20', S19.rep(A, 3, ['ib18-noise']).concat(S19.rep(U, 3, ['rows-verify'])));
      S19.day('2026-11-02', S19.rep(A, 3, ['ib18-toggle']), 'tab-other'); S19.day('2026-11-05', S19.rep(U, 3, ['ib18-toggle']));
      S19.day('2026-10-09', S19.rep(['rows-verify', 'q-pick', 'ib18-noise'], 12, ['ib18-toggle'])); }""", [A, U])   # 9 Oct is before the 28 days
    settle(pg, 300)
    ctx.clock.set_system_time(SAT_LATE); pg.wait_for_timeout(200)
    sc = ev(pg, "(async () => { const d = await scan19Ensure(); await storeIdle(3000); return d; })()")
    check("after Saturday 22:00 the scan runs and is kept under this workspace", sc and sc.get("key") == "2026-11-07" and ev(pg, f"S19.docs('{ws}/scan/2026-11-07').length") == 1, sc and sc.get("key"))
    top = [(x["sig"], x["n"], x["safe"]) for x in (sc or {}).get("top", [])]
    check("it holds the two most repeated: 9× (all steps safe) and 6× (not)", len(top) == 2 and top[0][1] == 9 and top[0][2] is True and top[1][1] == 6 and top[1][2] is False, top)
    check("the day before the 28 days is not read", not any("ib18-noise > rows-verify" in x["sig"] or x["n"] >= 12 for x in sc.get("cands", [])), sc.get("cands"))
    check("the scan keeps names and counts only", set(sc) <= {"v", "id", "key", "at", "upto", "days", "docs", "steps", "cands", "top", "by", "_rev"} and all(set(c) <= {"sig", "seq", "n", "safe"} for c in sc["top"] + sc["cands"]) and "Quokka" not in json.dumps(sc), list(sc))
    again = ev(pg, "(async () => { const w = window.__mockWrites; SCAN19.last = null; await scan19Ensure(); await storeIdle(2000); return window.__mockWrites - w; })()")
    check("it runs once per Saturday (a second look reads it, writes nothing)", again == 0, again)
    check("nothing ran and nothing was saved by itself", not ev(pg, "UI.palette") and not ev(pg, "((WS.settings.scan19 || {}).cuts || []).length"), ev(pg, "WS.settings.scan19 || null"))

    print("5 the Sunday note: at most two proposals; Yes only for allowed steps; No, Later")
    ctx.clock.set_system_time(SUN); pg.wait_for_timeout(200)
    n = ev(pg, "(async () => { RUN18.notes.delete('2026-11-08'); const n = await wk18Ensure(); await storeIdle(3000); return n; })()")
    check("the note of Sunday 8 Nov carries the two proposals of Saturday's scan", n and len(n.get("scan", [])) == 2 and n["scan"][0]["n"] == 9, n and n.get("scan"))
    calls0 = ev(pg, "window.__calls.length")
    pg.locator(".rail [data-a=nav][data-v=weekly]").first.click(); pg.wait_for_timeout(400)
    body = ev(pg, "document.querySelector('.main').innerText")
    check("the note shows the section and the question in plain words", "Your repeated steps" in body and re.search(r"You did Go to Settings → Tab “[^”]+” → Command search 9× in 4 weeks\. Make it one tap\?", body) is not None, body[:900])
    safe_p = pg.locator(".scan19-p").nth(0); unsafe_p = pg.locator(".scan19-p").nth(1)
    check("all steps on the allow-list: Yes, No, Later", safe_p.locator("[data-a=scan19-yes]").count() == 1 and safe_p.locator("[data-a=scan19-no]").count() == 1 and safe_p.locator("[data-a=scan19-later]").count() == 1)
    check("a step that changes or publishes: 'Note it as an idea' instead of Yes, with the reason", unsafe_p.locator("[data-a=scan19-yes]").count() == 0 and unsafe_p.locator("[data-a=scan19-idea]").count() == 1 and "Not as a shortcut" in unsafe_p.inner_text(), unsafe_p.inner_text()[:300])
    check("'a proposal only: nothing runs by itself' is said", "nothing runs by itself" in body)
    check("building and showing the note ran nothing and called no AI", not ev(pg, "UI.palette") and not ev(pg, "(WS.settings.scan19 || {}).cuts") and ev(pg, "window.__calls.length") == calls0)
    sig_u = unsafe_p.get_attribute("data-sig")
    unsafe_p.locator("[data-a=scan19-no]").click(); pg.wait_for_timeout(200)
    pg.locator("#pr-in").fill("I like doing this myself"); pg.locator(".modal form[data-form=prompt] button[type=submit]").click(); pg.wait_for_timeout(300)
    d = ev(pg, f"(WS.settings.scan19.dec || {{}})[{json.dumps(sig_u)}]")
    check("No keeps the reason and the count; the note says it does not come back unless it doubles", d and d["d"] == "no" and d["n"] == 6 and d["why"] == "I like doing this myself" and "unless you do it twice as often" in ev(pg, "document.querySelector('.main').innerText"), d)
    pg.locator(".scan19-p [data-a=scan19-yes]").first.click(); pg.wait_for_timeout(300)
    s = ev(pg, "WS.settings.scan19")
    check("Yes saves one shortcut with the same steps in order", len(s["cuts"]) == 1 and s["cuts"][0]["seq"] == A, s)
    check("…and the answer is kept with the workspace (saved)", ev(pg, "(async () => { await new Promise(r => setTimeout(r, 700)); await storeIdle(3000); const m = S19.docs(Store.root() + '/ws-' + WS.id).find(x => x._path === Store.root() + '/ws-' + WS.id); return !!(m && m.settings && m.settings.scan19 && m.settings.scan19.cuts.length === 1); })()"))
    # the idea path on a fresh copy of the unsafe proposal
    ev(pg, f"scan19Set(s => {{ delete s.dec[{json.dumps(sig_u)}]; }}); render()"); pg.wait_for_timeout(200)
    pg.locator(f".scan19-p[data-sig='{sig_u}'] [data-a=scan19-idea]").click(); pg.wait_for_timeout(300)
    s = ev(pg, "WS.settings.scan19")
    check("'Note it as an idea' keeps an idea (with the steps that cannot be a shortcut), never a shortcut", len(s["ideas"]) == 1 and len(s["cuts"]) == 1 and s["ideas"][0]["why"], s["ideas"])
    check("…and a forced Yes on it is turned into an idea", ev(pg, f"(() => {{ scan19Answer({json.dumps(sig_u)}, 'yes'); return WS.settings.scan19.cuts.length === 1 && WS.settings.scan19.dec[{json.dumps(sig_u)}].d === 'idea'; }})()"))
    ev(pg, "scan19Set(s => { s.dec = Object.fromEntries(Object.entries(s.dec).filter(([k, v]) => v.d !== 'later')); })")
    lat = ev(pg, """(() => { const n = RUN18.notes.get('2026-11-08'), x = n.scan[0]; const sig = 'later-test'; n.scan.push({sig, seq: ['rows-open', 'rows-verify', 'q-pick'], n: 5, safe: false, key: x.key}); scan19Answer(sig, 'later');
      const d = WS.settings.scan19.dec[sig]; n.scan.pop(); return {d: d && d.d, again: scan19Pick([{sig, seq: ['rows-open', 'rows-verify', 'q-pick'], n: 5}], WS.settings.scan19.dec).length}; })()""")
    check("Later is kept and the next note proposes it again", lat["d"] == "later" and lat["again"] == 1, lat)

    print("6 the shortcut in the Inbox: one tap runs the same steps in order")
    ev(pg, "UI.view = 'cockpit'; UI.modal = null; UI.palette = false; render()"); pg.wait_for_timeout(400)
    row = pg.locator(".scan19-cut")
    check("the Inbox shows the shortcut with its steps and a Run button", row.count() == 1 and row.locator("[data-a=scan19-run]").count() == 1 and "Go to Settings" in row.inner_text(), row.inner_text() if row.count() else "")
    check("the Inbox shows the idea too", pg.locator(".scan19-idea").count() == 1)
    proj0 = ev(pg, "JSON.stringify(WS.projects.map(p => [p.id, p.updatedAt]))")
    taps0 = ev(pg, "metDoc().taps")
    row.locator("[data-a=scan19-run]").click(); pg.wait_for_timeout(1500)
    st = ev(pg, "({view: UI.view, tab: UI.setTab, pal: !!UI.palette})")
    check("one tap ran the steps in order: Settings, the tab, the command search", st == {"view": "settings", "tab": "health", "pal": True}, st)
    check("…counted as one tap (the steps it pressed are not your taps)", ev(pg, "metDoc().taps") == taps0 + 1, [taps0, ev(pg, "metDoc().taps")])
    check("…and it changed no project", ev(pg, "JSON.stringify(WS.projects.map(p => [p.id, p.updatedAt]))") == proj0)
    ev(pg, "UI.palette = false; UI.view = 'cockpit'; render()"); pg.wait_for_timeout(300)
    r = ev(pg, """(async () => { scan19Set(s => { s.cuts.push({id: 'sc-miss', sig: 'miss', seq: ['nav:settings', 'rows-verify', 'palette'], n: 4, at: now()}); }); render();
      const ok = await scan19Go('sc-miss'); const v = UI.view; UI.view = 'cockpit'; scan19Set(s => { s.cuts = s.cuts.filter(x => x.id !== 'sc-miss'); }); render(); return {ok, v, pal: !!UI.palette}; })()""")
    check("a step that is not on the screen stops the shortcut there (nothing after it runs)", r["ok"] is False and r["v"] == "settings" and not r["pal"], r)
    r = ev(pg, """(async () => { scan19Set(s => { s.cuts.push({id: 'sc-bad', sig: 'bad', seq: ['nav:settings', 'q-do', 'palette'], n: 4, at: now()}); });
      const ok = await scan19Go('sc-bad'); const v = UI.view; scan19Set(s => { s.cuts = s.cuts.filter(x => x.id !== 'sc-bad'); }); render(); return {ok, v}; })()""")
    check("a shortcut with a step off the allow-list never runs", r["ok"] is False and r["v"] == "cockpit", r)

    print("7 each workspace its own scan and answers")
    other = ev(pg, "META.workspaces.map(w => w.id).find(id => id !== WS.id) || ''")
    if other:
        me = ev(pg, "WS.id")
        ev(pg, f"(async () => {{ await openWorkspace('{other}'); }})()"); opened(pg)
        r = ev(pg, "(async () => { const d = await scan19Ensure(); await storeIdle(2000); return {id: WS.id, mine: !!(WS.settings.scan19 && WS.settings.scan19.cuts && WS.settings.scan19.cuts.length), cands: d ? d.cands.length : -1, path: d ? wsPath() : ''}; })()")
        check("the other workspace has its own scan (not the first one's steps) and no shortcut of the first", r["id"] == other and r["cands"] == 0 and not r["mine"], r)
        check("…kept under its own workspace", ev(pg, f"S19.docs(Store.root() + '/ws-{other}/scan/').length") >= 1 and ev(pg, f"S19.docs(Store.root() + '/ws-{me}/scan/2026-11-07').length") == 1)
        ev(pg, f"(async () => {{ await openWorkspace('{me}'); }})()"); opened(pg)
        check("back in the first workspace its shortcut is still there", ev(pg, "(WS.settings.scan19 || {cuts: []}).cuts.length") == 1)
    else:
        check("a second workspace to compare with", False, "only one workspace in this data")

    print("8 the 4×4 interview: the risk check and the wait")
    ev(pg, HELP); ctx.clock.set_system_time("2026-11-09T09:00:00Z"); pg.wait_for_timeout(200)
    r = ev(pg, """(async () => {
      const S = S19.mk('Interview shared'); S19.live(S, '1.0'); S.audience = {who: 'others'}; touch(S);
      const P = S19.mk('Interview private'); S19.live(P, '1.0'); touch(P);
      const N = S19.mk('Interview not live'); N.audience = {who: 'others'}; touch(N);
      for (const p of [S, P, N]) await S19.pass(p);
      return {S: S.id, P: P.id, N: N.id, sh: chkShared(S), shP: chkShared(P), outP: chkOutward(P)}; })()""")
    S, P, N = r["S"], r["P"], r["N"]
    check("a shared live tool, a private live tool and a tool not live", r["sh"] and not r["shP"] and not r["outP"], r)
    PREP = """async ([pid, title, extra, lfu]) => { const p = WS.projects.find(x => x.id === pid); S19.item(p, title, extra); const c0 = window.__calls.filter(c => c === 'update-plan').length;
          await new Promise(r => setTimeout(r, 50)); actClose(p.id); const a0 = arr(p.acts).length;
          if (lfu) RUN18.lfuBusy = true; const run = aiPrepareUpdate(p); if (lfu) RUN18.lfuBusy = false; await run; await S19.idle(); actClose(p.id);
          const q = WS.projects.find(x => x.id === pid), iv = iv19Cur(q);
          return {plan: !!(q.plan && q.plan.state === 'checking'), calls: window.__calls.filter(c => c === 'update-plan').length - c0, iv: iv && {state: iv.state, why: iv.why, from: iv.from, lfu: iv.lfu, items: iv.items.length},
            modal: UI.modal && UI.modal.kind, acts: arr(q.acts).length - a0, lastAct: (arr(q.acts).slice(-1)[0] || {}).label}; }"""
    def prep(pid, title, extra=None, lfu=False):
        return ev(pg, PREP, [pid, title, extra or {}, lfu])
    r = prep(P, "The weekly list misses Monday", {"k": "fix", "kind": "bug"})
    check("a small private change (one fix) is prepared at once — no interview", r["plan"] and r["calls"] == 1 and not r["iv"], r)
    ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{P}'); p.plan = null; for (const i of arr(p.inbox)) i.done = true; touch(p); }})()")
    r = prep(N, "Add a column for the phone number")
    check("a tool that is not live gets no interview", not r["iv"], r)
    ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{N}'); p.plan = null; touch(p); }})()")
    close_modals(pg); ev(pg, "UI.modal = null")
    r = prep(S, "Add a field for each entry's phone number")
    check("a change to a shared live tool waits: no update prepared, no AI called for it", not r["plan"] and r["calls"] == 0 and r["iv"] and r["iv"]["state"] == "wait", r)
    check("…the risk check names why (shared, data shape)", r["iv"] and "shared" in r["iv"]["why"] and "data" in r["iv"]["why"], r["iv"])
    check("…the interview opens at once when you started the change", r["modal"] == "iv19", r)
    check("…and the wait is one Undo step", r["acts"] == 1 and r["lastAct"] == "Change waits for the 4×4 interview", r)
    body = ev(pg, "document.querySelector('.modal').innerText")
    check("the interview says what it is: four areas, skippable, why, nothing asked yet", "4×4 interview" in body and "Why: others or customers use it" in body and "Skip any area" in body and ev(pg, "(window.__allPrompts || []).filter(x => x.includes('[[task:iv19]]')).length") == 0, body[:500])
    r2 = prep(P, "Store each entry's history in a new database table")
    check("a private tool whose change touches the storage of data waits too", r2["iv"] and r2["iv"]["state"] == "wait" and r2["iv"]["why"] == ["data"] and r2["calls"] == 0, r2)
    close_modals(pg); ev(pg, "UI.modal = null; UI.view = 'cockpit'; render()"); pg.wait_for_timeout(400)
    check("the Inbox lists both changes that wait, with Start and Skip", pg.locator(".iv19-line").count() == 2 and pg.locator(".iv19-line [data-a=iv19-open]").count() == 2 and pg.locator(".iv19-line [data-a=iv19-skipall]").count() == 2, pg.locator(".iv19-line").count())

    print("9 one AI call, one area at a time; answers are rows asserted by you; skipped and empty are residual risk")
    pg.locator(f".iv19-line:has-text('Interview shared') [data-a=iv19-open]").first.click(); pg.wait_for_timeout(300)
    pg.locator(".modal [data-a=iv19-make]").click()
    ev(pg, "S19.idle()"); pg.wait_for_timeout(300)
    iv = ev(pg, f"iv19Cur(WS.projects.find(x => x.id === '{S}'))")
    check("one AI call made the questions: four areas, up to four each", ev(pg, "(window.__allPrompts || []).filter(x => x.includes('[[task:iv19]]')).length") == 1 and iv["qs"] and [len(iv["qs"][a]) for a in ("product", "design", "practical", "edge")] == [4, 2, 2, 2], iv and iv.get("qs") and {a: len(iv["qs"][a]) for a in iv["qs"]})
    pr = ev(pg, "window.__allPrompts.filter(x => x.includes('[[task:iv19]]')).slice(-1)[0] || ''")
    check("…the change reaches it as data (untrusted), with why it is risky", "phone number" in pr and re.search(r"<untrusted_\w+ label=\"change\"", pr) is not None and "other people or customers use it" in pr, pr[-600:])
    m = ev(pg, "document.querySelector('.modal').innerText")
    check("the first area is Product, shown alone", "Area 1 of 4: Product" in m and "Where should the new part show?" not in m, m[:400])
    pg.locator(".modal input[name=o-p1]").nth(1).check()
    pg.locator(".modal input[name=a-p2]").fill("The weekly summary stays as it is")
    pg.locator(".modal input[name=a-p4]").fill("Fewer calls asking for numbers")
    pg.locator(".modal form[data-form=iv19-area] button[type=submit]").click(); pg.wait_for_timeout(400)
    m = ev(pg, "document.querySelector('.modal').innerText")
    check("saving the area moves to Design", "Area 2 of 4: Design" in m, m[:300])
    pg.locator(".modal [data-a=iv19-skiparea]").click(); pg.wait_for_timeout(300)
    check("skipping Design moves to Practical", "Area 3 of 4: Practical" in ev(pg, "document.querySelector('.modal').innerText"))
    pg.locator(".modal input[name=a-r1]").fill("With the tool, in its own storage")
    pg.locator(".modal form[data-form=iv19-area] button[type=submit]").click(); pg.wait_for_timeout(300)
    check("…then Edge cases", "Area 4 of 4: Edge cases" in ev(pg, "document.querySelector('.modal').innerText"))
    check("the change still waits while the interview is open", ev(pg, f"!WS.projects.find(x => x.id === '{S}').plan"))
    pg.locator(".modal [data-a=iv19-skipall]").click()
    ev(pg, "S19.idle()"); settle(pg, 600); ev(pg, f"S19.pass(WS.projects.find(x => x.id === '{S}'))"); settle(pg, 300)
    rows = ev(pg, f"S19.rows(WS.projects.find(x => x.id === '{S}'), 'iv19:')")
    ans = [x for x in rows if ":risk:" not in x["src"]]
    risk = {x["src"].split(":")[-1]: x for x in rows if ":risk:" in x["src"]}
    check("every answer is a decision row asserted by you (3 in Product, 1 in Practical)", len(ans) == 4 and all(x["decision"] and x["decision"]["asserted_by"] == "owner" and x["status"] == "decided" for x in ans), [(x["src"], x["decision"]) for x in ans])
    check("…with the option you picked or your own words", sorted(x["decision"]["chosen"] for x in ans) == sorted(["Fewer mistakes", "The weekly summary stays as it is", "Fewer calls asking for numbers", "With the tool, in its own storage"]), [x["decision"]["chosen"] for x in ans])
    check("…numbered like every row (U.10.n)", all(re.fullmatch(r"U\.10\.\d+", x["id"]) for x in ans), [x["id"] for x in ans])
    check("a skipped area is a residual-risk row (Design, Edge cases), and a question left empty too (Product, Practical)", set(risk) == {"design", "edge", "product", "practical"} and "Skipped" in risk["design"]["decision"]["chosen"] and "Left open" in risk["product"]["decision"]["chosen"], {k: v["decision"]["chosen"] for k, v in risk.items()})
    evs = ev(pg, f"S19.evs(WS.projects.find(x => x.id === '{S}'), 'iv19:')")
    check("the rows have their events ('taken', by you)", len([e for e in evs if e["type"] == "taken"]) == len(rows) and all(e["by"] == "owner" for e in evs), [(e["type"], e["by"]) for e in evs][:10])
    q = ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{S}'); return {{plan: p.plan && p.plan.state, state: iv19Cur(p).state, done: arr(p.inbox).filter(i => i.plannedIn).length}}; }})()")
    check("when the interview is done the change goes on: the update is prepared", q["plan"] == "checking" and q["state"] == "done" and q["done"] >= 1, q)
    pr = ev(pg, "window.__allPrompts.filter(x => x.includes('[[task:update-plan]]')).slice(-1)[0] || ''")
    check("…with your answers in its prompt, as data", "<interview_answers" in pr and "Fewer calls asking for numbers" in pr and re.search(r"<untrusted_\w+ label=\"interview_answers\"", pr) is not None and "design" in pr.split("<interview_answers")[1][:2000], pr.split("<interview_answers")[1][:300] if "<interview_answers" in pr else "")
    r = prep(S, "Also add an e-mail field")
    check("one interview per live version: the next change to the same live version goes on at once", r["calls"] == 1 and r["iv"]["state"] == "done", r)
    r = ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{S}'); const kept = JSON.stringify(normalizeProject(clone(p)).iv19) === JSON.stringify(p.iv19);
      await new Promise(r => setTimeout(r, 400)); await storeIdle(4000); const d = Object.entries(S19.db()).find(([k, v]) => k.endsWith('/projects/' + p.id));
      return {{kept, saved: !!(d && d[1].iv19 && d[1].iv19.list.length)}}; }})()""")
    check("the interview is kept with the project (saved, and a reload keeps it)", r["kept"] and r["saved"], r)
    r = ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{S}'), n = iv19Read(p).list.length; S19.item(p, 'Undo test: add a column'); await new Promise(r => setTimeout(r, 50)); actClose(p.id);
      const v0 = p.live.v; p.live.v = '1.0.9'; touch(p); actClose(p.id); const run = aiPrepareUpdate(p); await run; await S19.idle(); actClose(p.id); const made = iv19Read(p).list.length === n + 1;
      const la = lastAct(p); undoAct(p, la.id); await S19.idle(); const back = iv19Read(p).list.length === n && la.label === t("iv.act.wait"); p.live.v = v0; for (const i of arr(p.inbox)) if (/Undo test/.test(i.title)) i.done = true; touch(p); UI.modal = null; render(); return {{made, back}}; }})()""")
    check("the wait is undone with one Undo", r["made"] and r["back"], r)
    ev(pg, "UI.modal = null; render()")
    for lang, word in (("de", "4×4-Interview"), ("zh", "4×4 访谈"), ("en", "4×4 interview")):
        ev(pg, f"LANG = '{lang}'; applyLangAttr(); UI.modal = {{kind: 'iv19', pid: '{P}'}}; render()"); pg.wait_for_timeout(200)
        check(f"the interview in {lang}", word in ev(pg, "document.querySelector('.modal').innerText"))
    ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); UI.modal = null; render()")

    print("10 skip it all, learn-from-use, a changed mind, a new version")
    r = ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{P}'); UI.modal = {{kind: 'iv19', pid: p.id}}; render();
      document.querySelector('.modal [data-a=iv19-skipall]').click(); await S19.idle(); await S19.pass(p);
      const q = WS.projects.find(x => x.id === p.id); return {{state: iv19Cur(q).state, plan: q.plan && q.plan.state, risk: S19.rows(q, 'iv19:').map(r => [r.src.split(':').pop(), r.decision && r.decision.chosen])}}; }})()""")
    check("skipping the whole interview writes a residual-risk row per area, then the change goes on", r["state"] == "skipped" and r["plan"] == "checking" and len(r["risk"]) == 4 and all("Skipped" in x[1] for x in r["risk"]), r)
    Lp = ev(pg, """(async () => { const L = S19.mk('Interview learn'); S19.live(L, '2.0'); L.audience = {who: 'customers', customers: true}; touch(L); await S19.pass(L); UI.modal = null; render(); return L.id; })()""")
    r = prep(Lp, "Customers want a second list for orders", None, lfu=True)
    check("learn-from-use on a customer tool waits too, and opens nothing by itself", r["iv"] and r["iv"]["state"] == "wait" and r["iv"]["lfu"] and r["modal"] != "iv19" and r["calls"] == 0, r)
    r = ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{Lp}'); UI.modal = {{kind: 'iv19', pid: p.id}}; render(); document.querySelector('.modal [data-a=iv19-skipall]').click(); await S19.idle();
      const q = WS.projects.find(x => x.id === p.id); return {{plan: q.plan && q.plan.state, by: q.plan && q.plan.by}}; }})()""")
    check("…and once skipped, PT prepares it as its own learn-from-use plan (nothing goes live)", r["plan"] == "checking" and r["by"] == "pt", r)
    r = ev(pg, """(async () => { const F = S19.mk('Interview records'); S19.live(F, '1.0'); F.audience = {who: 'others'}; touch(F); await S19.pass(F); UI.modal = null;
      for (let i = 0; i < 3; i++) S19.item(F, 'Run failed: the list was empty', {src: 'run', ok: false, kind: '', k: 'fix', rep: 'agent'});
      const c0 = window.__calls.filter(c => c === 'update-plan').length; RUN18.lfuBusy = true; const run = aiPrepareUpdate(F); RUN18.lfuBusy = false; await run; await S19.idle();
      return {iv: !!iv19Cur(F), calls: window.__calls.filter(c => c === 'update-plan').length - c0}; })()""")
    check("run records of one repeated failure are one small fix: prepared at once, no interview", not r["iv"] and r["calls"] == 1, r)
    r = ev(pg, """(async () => { const C = S19.mk('Interview mind'); S19.live(C, '1.0'); C.audience = {who: 'others'}; touch(C); await S19.pass(C); UI.modal = null;
      const res = await aiImpact(C, 'Run it by hand instead of every Monday'); await S19.idle(); const iv = iv19Cur(C);
      return {res, iv: iv && {from: iv.from, wish: iv.wish}, modal: UI.modal && UI.modal.kind, id: C.id, mc: window.__calls.filter(c => c === 'mindchange').length}; })()""")
    check("a changed mind on a live shared tool waits for the interview first", r["res"] is None and r["iv"] and r["iv"]["from"] == "impact" and r["modal"] == "iv19", r)
    mc0 = r["mc"]
    r = ev(pg, f"""(async () => {{ document.querySelector('.modal [data-a=iv19-skipall]').click(); await S19.idle(); return {{modal: UI.modal && UI.modal.kind, mc: window.__calls.filter(c => c === 'mindchange').length}}; }})()""")
    check("…then PT works out what it affects (the review opens)", r["mc"] == mc0 + 1 and r["modal"] == "review", r)
    ev(pg, "UI.modal = null; UI.review = null; render()")
    r = ev(pg, """(async () => { const R = S19.mk('Interview release'); S19.live(R, '1.0'); touch(R); await S19.pass(R);
      R.decisions = arr(R.decisions); for (let i = 1; i <= 4; i++) R.decisions.push({id: 'd-iv' + i, title: 'Release question ' + i, choice: 'Answer ' + i, reason: '', at: now()}); touch(R); await S19.pass(R);
      window.__rg0 = window.__rg0 || releaseGate; releaseGate = () => []; const n0 = R.releases.length;   // the release checks themselves are tested elsewhere
      await doRelease(R); await S19.idle(); const waited = R.releases.length === n0, iv = iv19Cur(R);
      return {id: R.id, waited, iv: iv && {from: iv.from, why: iv.why}, rows: iv19RowsSince(R).length, modal: UI.modal && UI.modal.kind}; })()""")
    Rp = r["id"]
    check("a new version of a live tool with more than 3 decisions changed waits for the interview", r["waited"] and r["iv"] and r["iv"]["from"] == "release" and r["iv"]["why"] == ["rows"] and r["rows"] == 4 and r["modal"] == "iv19", r)
    r = ev(pg, f"""(async () => {{ document.querySelector('.modal [data-a=iv19-skipall]').click(); await S19.idle(); const p = WS.projects.find(x => x.id === '{Rp}');
      const btn = !!document.querySelector('.modal [data-a=iv19-release]'), n0 = p.releases.length; document.querySelector('.modal [data-a=iv19-release]').click(); await S19.idle();
      return {{btn, n: WS.projects.find(x => x.id === '{Rp}').releases.length - n0}}; }})()""")
    check("…once skipped, one tap publishes it", r["btn"] and r["n"] == 1, r)
    ev(pg, "releaseGate = window.__rg0; UI.modal = null; render()")

    print("11 What changed in each version")
    ctx.clock.set_system_time("2026-11-10T08:00:00Z"); pg.wait_for_timeout(100)
    W = ev(pg, """(async () => { const p = S19.mk('Versions test'); p.arch = Object.assign({}, p.arch, {options: [{id: 'o1', name: 'Weekly task'}, {id: 'o2', name: 'By hand'}], chosen: 'o1'});
      p.decisions = [{id: 'd-wc1', title: 'Where results land', choice: 'A page', reason: '', at: now()}]; touch(p); await S19.pass(p);
      p.decisions.push({id: 'd-wc2', title: 'Who sees it', choice: 'Only me', reason: '', at: now()}); touch(p); await S19.pass(p); return p.id; })()""")
    ctx.clock.set_system_time("2026-11-10T09:00:00Z"); pg.wait_for_timeout(100)
    ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{W}'); p.releases = [{{v: '1.0', at: now(), draft: 1}}]; p.live = {{v: '1.0', since: now()}}; touch(p); }})()")
    ctx.clock.set_system_time("2026-11-10T10:00:00Z"); pg.wait_for_timeout(100)
    ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{W}'); p.arch.chosen = 'o2'; p.decisions = p.decisions.filter(d => d.id !== 'd-wc2'); p.decisions.push({{id: 'd-wc3', title: 'How often', choice: 'Every Monday', reason: '', at: now()}}); touch(p); await S19.pass(p); }})()""")
    ctx.clock.set_system_time("2026-11-10T11:00:00Z"); pg.wait_for_timeout(100)
    ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{W}'); p.releases.unshift({{v: '1.1', at: now(), draft: 2}}); p.live = {{v: '1.1', since: now()}}; touch(p); }})()")
    ctx.clock.set_system_time("2026-11-10T12:00:00Z"); pg.wait_for_timeout(100)
    ev(pg, f"""(async () => {{ const p = WS.projects.find(x => x.id === '{W}'); p.decisions.push({{id: 'd-wc4', title: 'Language', choice: 'German', reason: '', at: now()}}); touch(p); await S19.pass(p); }})()""")
    w = ev(pg, f"wc19Of(WS.projects.find(x => x.id === '{W}'))")
    v11 = next((x for x in w["vers"] if x["v"] == "1.1"), {}); v10 = next((x for x in w["vers"] if x["v"] == "1.0"), {})
    t11 = [x["text"] for x in v11.get("items", [])]
    check("per version, newest first", [x["v"] for x in w["vers"]] == ["1.1", "1.0"], [x["v"] for x in w["vers"]])
    check("v1.1 lists what changed since v1.0 in plain words: changed a → b, new, taken back", any("Weekly task → By hand" in x for x in t11) and any(x == "How often: Every Monday (new)" for x in t11) and any(x == "Who sees it: “Only me” taken back" for x in t11) and len(t11) == 3, t11)
    check("v1.0 lists the decisions it started with", v10.get("first") and any("Where results land: A page" in x["text"] for x in v10.get("items", [])), v10)
    check("what is not published yet is listed on top", [x["text"] for x in w["pending"]] == ["Language: German (new)"], w["pending"])
    html = ev(pg, f"(() => {{ const p = WS.projects.find(x => x.id === '{W}'); openProject(p.id); return phRelease(p); }})()")
    check("the Release step (the tool's Versions view) shows it", "What changed in each version" in html and "Weekly task → By hand" in html and "Not published yet (since v1.1)" in html, html[-600:])
    check("an older version from before the events says so", ev(pg, f"""(() => {{ const p = WS.projects.find(x => x.id === '{W}'); const keep = p.releases.slice(); p.releases.push({{v: '0.9', at: '2026-01-01T00:00:00Z', draft: 0}}); const w = wc19Of(p); p.releases = keep; return w.vers.find(x => x.v === '0.9').unknown; }})()"""))
    close_modals(pg)

    print("12 at phone width: no sideways scroll on the new parts")
    SCROLLX = "(() => { const m = document.querySelector('.main'), o = document.querySelector('.overlay .modal'); return Math.max(document.documentElement.scrollWidth - innerWidth, m ? m.scrollWidth - m.clientWidth : 0, o ? o.scrollWidth - o.clientWidth : 0); })()"
    shots = pathlib.Path("work/shots190"); shots.mkdir(parents=True, exist_ok=True)
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(300)
    X = ev(pg, """(async () => { const p = S19.mk('Phone width'); S19.live(p, '1.0'); p.audience = {who: 'others'}; touch(p); await S19.pass(p); UI.modal = null; return p.id; })()""")
    prep(X, "Add a field for a second phone number to every entry")
    ev(pg, "(async () => { const p = WS.projects.find(x => x.name === 'Phone width'); await iv19Make(p, iv19Cur(p).id); UI.modal = {kind: 'iv19', pid: p.id}; render(); })()"); ev(pg, "S19.idle()"); pg.wait_for_timeout(300)
    for name, js in (("interview", "null"), ("inbox", "(UI.modal = null, UI.view = 'cockpit', render())"), ("note", "(UI.view = 'weekly', UI.wkKey = '2026-11-08', render())"),
                     ("versions", f"(openProject('{W}'), UI.modal = null, render(), document.querySelector('.wc19') || (document.querySelector('.main').insertAdjacentHTML('beforeend', '<div>' + phRelease(WS.projects.find(x => x.id === '{W}')) + '</div>')))")):
        ev(pg, js); pg.wait_for_timeout(400); ev(pg, "document.querySelectorAll('#toasts .toast').forEach(x => x.remove())")
        sx = ev(pg, SCROLLX)
        check(f"390 px: no sideways scroll ({name})", sx <= 1, sx)
        sel = {"interview": ".overlay .modal", "inbox": ".ib18", "note": ".wk18-sec[data-sec=scan]", "versions": ".wc19"}[name]
        if pg.locator(sel).count(): pg.locator(sel).first.screenshot(path=str(shots / f"{name}-390.png"))   # for a person to look at (work/, never committed)
    pg.set_viewport_size({"width": 1440, "height": 950}); close_modals(pg)

    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
