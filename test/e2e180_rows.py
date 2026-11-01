"""1.8 decision rows, events, tiers and undo, on a COPY of the real data (or the made-up bundle) with the mock runtime.
Run: python3 test/e2e180_rows.py [work/backup-141 | test/fixtures/synthetic.json]
Covers: every project yields rows from the projection (Pick cards and log, kit decisions, p.decisions, the design choice, page versions)
without any change to its data; ids <Branch>.<Stage>.<Step> are stable across reloads and never handed out again after a delete;
the first event of a 1.7 project says "migrated" and points at a restore point; taking, changing and taking back a decision writes
chained events (hash + parent hash, schemaVersion, sortable ids) with who decided; the chain verifies and a changed, a re-hashed or a
missing event is found; block rows, check rows (O4a) and rows a changed fact touched are never taken by PT and nothing is taken by
default; an explicit "I do it" row is taken with a restore point and its Undo restores and lists what it cannot undo (and PT does not
take it again); restore points are never deleted; no document over 256 KiB; the Decisions page sits next to the cover and the seven
pages (which keep working) in three languages and at phone width; no page errors."""
import json, sys, pathlib, re
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:600]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)
def J(s, **kw):   # JS with the test's values put in (__PID__, __SRC__, and any __NAME__=value given)
    s = s.replace("__PID__", str(globals().get("pid", ""))).replace("__SRC__", str((globals().get("tr") or {}).get("easySrc", "")))
    for k, v in kw.items(): s = s.replace("__" + k.upper() + "__", str(v))
    return s
def settle(pg, ms=700):
    pg.wait_for_timeout(ms); ev(pg, "(async () => { for (const L of Object.values(ROWS.L)) await L.chain; await storeIdle(4000); })()"); pg.wait_for_timeout(100)
ID = re.compile(r"^[A-Z]\.([1-9]|1[01])\.[1-9]\d*$")
ULID = re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")
# helpers inside the page: a test card in Pick, the events of a project, a pass now
HELP = """
window.T18 = {
  card(p, o){ const k = pickOf(p), c = Object.assign({id: uid('pk'), q: 'Test question ' + Math.random().toString(36).slice(2, 6), why: 'test', target: 'design', multi: false, hard: false, rec: 0, recWhy: 'the simple one',
      options: [{k: 'A', label: 'Option A', text: 'a'}, {k: 'B', label: 'Option B', text: 'b'}], at: now(), round: 1, by: 'pt'}, o || {}); k.cards.push(c); touch(p); return c; },
  evs(p){ return (ROWS.L[p.id] ? ROWS.L[p.id].list : []).map(e => ({id: e.id, type: e.type, src: e.src || '', row: e.row || '', by: e.by || '', cause: e.cause || '', rp: e.rp || '', data: e.data || {}, ids: e.ids || []})); },
  async pass(p){ clearTimeout(ROWS.timers.get(p.id)); await rowsPass(p); await ROWS.L[p.id].chain; await storeIdle(3000); },
  row(p, src){ return rowsOf(p).find(r => r.src === src) || null; },
  strip(p){ const o = JSON.parse(JSON.stringify(p)); for (const k of ['restore', 'seenAt', 'updatedAt', 'focus', '_rev', 'acts', 'activity']) delete o[k]; return JSON.stringify(o); }
};
"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300); ev(pg, HELP)

    print("1 every project yields rows; the projection changes no data; the first event of a 1.7 project")
    r = ev(pg, """async () => { const out = [];
      for (const p of WS.projects){ const before = T18.strip(p), rp0 = arr(p.restore).map(x => x.id);
        const L = await rowsEnsure(p); await L.chain; rowsOf(p); await T18.pass(p);
        const rows = rowsOf(p), first = L.list[0] || {};
        out.push({name: p.name.slice(0, 18), n: rows.length, ids: rows.map(r => r.id), prov: rows.filter(r => r.prov).length, same: T18.strip(p) === before,
          diff: (() => { const A = JSON.parse(before), B = JSON.parse(T18.strip(p)); return Object.keys(Object.assign({}, A, B)).filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k])); })(),
          rpKept: rp0.every(id => arr(p.restore).some(x => x.id === id)), first: first.type, from: first.data && first.data.from, rp: first.rp || '', rpThere: !!first.rp && arr(p.restore).some(x => x.id === first.rp),
          srcs: !!(arr(p.decisions).length || (p.arch && p.arch.chosen) || pickRead(p).log.length || pickRead(p).cards.length || Object.keys(kitRead(p)).length || arr(p.tool && p.tool.versions).length),
          fields: rows.every(r => r.question && ['auto', 'notify', 'block'].includes(r.tier) && ['open', 'decided', 'superseded'].includes(r.status) && (r.status === 'open' ? !r.decision : r.decision && r.decision.chosen && ['owner', 'star-taken', 'star-batched'].includes(r.decision.by)))}); }
      return out; }""")
    check("there are projects to check", len(r) >= 1, r)
    check("every project with decisions yields rows", all(x["n"] >= 1 for x in r if x["srcs"]), [x for x in r if x["srcs"] and not x["n"]])
    check("every row has an id <Branch>.<Stage>.<Step> (registered, not provisional)", all(ID.match(i) for x in r for i in x["ids"]) and not any(x["prov"] for x in r), [x["ids"] for x in r][:3])
    check("ids are unique inside a project", all(len(set(x["ids"])) == len(x["ids"]) for x in r))
    check("every row has a question, a tier, a status and a decision with who decided", all(x["fields"] for x in r), [x["name"] for x in r if not x["fields"]])
    check("the projection and the comparison change nothing in the project's data", all(x["same"] for x in r), [(x["name"], x["diff"]) for x in r if not x["same"]])
    check("no restore point was removed", all(x["rpKept"] for x in r))
    check("the first event of each project says migrated from 1.7", all(x["first"] == "migrated" and x["from"] == "1.7" for x in r), [(x["name"], x["first"], x["from"]) for x in r])
    check("…and points at a restore point in the project's list", all(x["rpThere"] for x in r), [(x["name"], x["rp"]) for x in r if not x["rpThere"]])
    # a 1.7 project seen for the first time: a copy with a new id, never opened by 1.8
    m = ev(pg, """async () => { const src = WS.projects.find(p => rowsOf(p).length) || WS.projects[0]; const q = JSON.parse(JSON.stringify(src)); q.id = uid('p'); q.createdAt = '2026-10-20T10:00:00.000Z'; q.restore = []; delete ROWS.L[q.id];
      WS.projects.push(q); const before = T18.strip(q); const L = await rowsEnsure(q); await L.chain; await storeIdle(3000);
      const db = window.__mockdb(), rp = L.list[0] && L.list[0].rp, rows = rowsOf(q);
      const res = {same: T18.strip(q) === before, n: L.list.length, first: L.list[0] && L.list[0].type, rows: rows.length, inEvent: arr(L.list[0] && L.list[0].data.rows).length,
        rp, rpDoc: !!db[projPath(q.id) + '/restore/' + rp], rpKind: (arr(q.restore).find(x => x.id === rp) || {}).kind, stored: Object.keys(db).filter(k => k.startsWith(projPath(q.id) + '/events-')).length};
      WS.projects = WS.projects.filter(x => x !== q); await storeIdle(3000); await Store.del(projPath(q.id)); return res; }""")   # the test copy is not left behind as a project
    check("a 1.7 project seen for the first time: data unchanged, one 'migrated' event naming every row", m["same"] and m["first"] == "migrated" and m["inEvent"] == m["rows"], m)
    check("…with its own restore point stored (kind 'before upgrade')", bool(m["rp"]) and m["rpDoc"] and m["rpKind"] == "migrate", m)
    check("…and the event is stored as its own document under the project", m["stored"] == m["n"] >= 1, m)

    print("2 events: taken, changed, taken back — chained, with who and why")
    pid = ev(pg, "(() => { const p = WS.projects.find(x => rowsOf(x).some(r => r.src === 'kit:engine' && r.status === 'open')) || WS.projects.find(x => pickRead(x).cards.length) || WS.projects[0]; openProject(p.id); return p.id; })()")
    settle(pg)
    k = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); await T18.pass(p); const n0 = ROWS.L[p.id].list.length;
      const kinds = KIT_ENGINE.slice(0, 2); const had = !!kitRead(p).engine;
      kitSetEngine(p, kinds[0]); await new Promise(r => setTimeout(r, 50)); await T18.pass(p);
      kitSetEngine(p, kinds[1]); await new Promise(r => setTimeout(r, 50)); await T18.pass(p);
      undo(); await T18.pass(p);
      const a1 = arr(p.acts).find(a => a.label === t('kit.act.engine') && !a.undone && !a.undoOf); if (a1) undoAct(p, a1.id); await T18.pass(p);
      return {had, kinds, evs: T18.evs(p).slice(n0).filter(e => e.src === 'kit:engine'), row: (T18.row(p, 'kit:engine') || {}).status}; }"""))
    seq = [(e["type"], e["cause"]) for e in k["evs"]]
    check("a decision taken writes 'taken' by you", not k["had"] and len(k["evs"]) >= 1 and k["evs"][0]["type"] == "taken" and k["evs"][0]["by"] == "owner" and k["evs"][0]["data"].get("val") == k["kinds"][0], k)
    check("a decision changed writes 'changed' with from → to", len(k["evs"]) >= 2 and k["evs"][1]["type"] == "changed" and k["evs"][1]["data"].get("val") == k["kinds"][1] and k["evs"][1]["data"].get("from"), seq)
    check("Undo writes 'changed' back, marked as Undo", len(k["evs"]) >= 3 and k["evs"][2]["type"] == "changed" and k["evs"][2]["cause"] == "undo" and k["evs"][2]["data"].get("val") == k["kinds"][0], seq)
    check("Undo of the first answer writes 'undone' and the row is open again", len(k["evs"]) >= 4 and k["evs"][3]["type"] == "undone" and k["evs"][3]["cause"] == "undo" and k["row"] == "open", [seq, k["row"]])
    check("the row keeps its id through all of it", len({e["row"] for e in k["evs"]}) == 1 and ID.match(k["evs"][0]["row"] or ""), [e["row"] for e in k["evs"]])
    pk = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); const n0 = ROWS.L[p.id].list.length;
      const a = T18.card(p), b2 = T18.card(p), c = T18.card(p); await T18.pass(p);
      pickAnswer(p, a.id, {keys: ['B']}); await new Promise(r => setTimeout(r, 30)); await T18.pass(p);
      const x = queueOf(p).find(y => y.ref === 'pick:' + b2.id), i = qOptions(p, x).findIndex(o => o.star); await ACTIONS['q-do']({dataset: {key: x.key, i: String(i)}}); await T18.pass(p);
      const keep = pickOf(p).cards.filter(y => y.id !== c.id); pickOf(p).cards = [c, ...keep.filter(y => y.id !== c.id)];
      await pickTakeStars(p); await T18.pass(p);
      const by = s => ((T18.evs(p).slice(n0).find(e => e.src === 'pick:' + s && e.type === 'taken') || {}).by);
      return {you: by(a.id), star: by(b2.id), batch: by(c.id), rowBy: (T18.row(p, 'pick:' + b2.id) || {decision: {}}).decision.by, ids: [a, b2, c].map(z => (T18.row(p, 'pick:' + z.id) || {}).id)}; }"""))
    check("who decided: a pick you chose is 'you'", pk["you"] == "owner", pk)
    check("…'Use ★' in the queue is '★ taken'", pk["star"] == "star-taken" and pk["rowBy"] == "star-taken", pk)
    check("…'take every ★' is '★ all at once'", pk["batch"] == "star-batched", pk)
    ch = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); const L = ROWS.L[p.id]; await L.chain; await storeIdle(3000);
      const res = await rowsVerify(p); const list = L.list;
      let chained = true; for (let i = 1; i < list.length; i++) if (list[i].parent !== list[i - 1].hash || !(list[i - 1].id < list[i].id)) chained = false;
      return {ok: res.ok, n: res.n, mem: list.length, bad: res.bad, chained, first: list[0].parent, schema: list.every(e => e.schemaVersion === 1), ids: list.map(e => e.id).slice(-3), hashes: list.every(e => /^[0-9a-f]{64}$/.test(e.hash))}; }"""))
    check("every event has schemaVersion 1, a sortable unique id and a SHA-256 hash", ch["schema"] and ch["hashes"] and all(ULID.match(i) for i in ch["ids"]), ch)
    check("each event names the hash of the one before (the first names none)", ch["chained"] and ch["first"] == "", ch)
    check("the stored chain verifies", ch["ok"] and ch["n"] == ch["mem"], ch)

    print("3 a changed, re-hashed or missing event is found")
    t = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); const db = window.__mockdb(), L = ROWS.L[p.id];
      const keys = Object.keys(db).filter(k => k.startsWith(projPath(p.id) + '/events-')).sort((a, b) => a.split('/').pop() < b.split('/').pop() ? -1 : 1);
      const mid = keys[Math.floor(keys.length / 2)], saved = JSON.parse(JSON.stringify(db[mid])), out = {};
      db[mid].data = Object.assign({}, db[mid].data, {chosen: 'something else', val: 'x'}); out.changed = await rowsVerify(p);
      db[mid].hash = await rowHash(db[mid]); out.rehashed = await rowsVerify(p);
      db[mid] = saved; delete db[mid]; out.missing = await rowsVerify(p);
      db[mid] = saved; out.back = await rowsVerify(p); out.mid = mid.split('/').pop(); return out; }"""))
    check("a changed event is found (its hash no longer fits)", not t["changed"]["ok"] and any(x["id"] == t["mid"] and x["why"] == "hash" for x in t["changed"]["bad"]), t["changed"])
    check("a changed and re-hashed event is found (the next event's parent no longer fits)", not t["rehashed"]["ok"] and any(x["why"] == "parent" for x in t["rehashed"]["bad"]), t["rehashed"])
    check("a missing event is found", not t["missing"]["ok"] and any(x["why"] == "parent" for x in t["missing"]["bad"]), t["missing"])
    check("put back, the chain verifies again", t["back"]["ok"], t["back"])

    print("4 ids: stable across reloads, never handed out again")
    s = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); await T18.pass(p);
      logDecision(p, 'Test decision one', 'yes', 'test'); touch(p); await T18.pass(p);
      const d1 = p.decisions[p.decisions.length - 1], id1 = T18.row(p, 'dec:' + d1.id).id;
      p.decisions = p.decisions.filter(x => x !== d1); touch(p); await T18.pass(p);
      const gone = !T18.row(p, 'dec:' + d1.id), undone = T18.evs(p).some(e => e.src === 'dec:' + d1.id && e.type === 'undone');
      logDecision(p, 'Test decision two', 'no', 'test'); touch(p); await T18.pass(p);
      const d2 = p.decisions[p.decisions.length - 1], id2 = T18.row(p, 'dec:' + d2.id).id;
      const map = {}; for (const q of WS.projects) for (const r of rowsOf(q)) map[q.id + '|' + r.src] = r.id;
      ROWS.L = {}; for (const q of WS.projects){ const L = await rowsEnsure(q); await L.chain; }
      const again = {}; for (const q of WS.projects) for (const r of rowsOf(q)) again[q.id + '|' + r.src] = r.id;
      const L = ROWS.L[p.id];
      return {id1, id2, gone, undone, same: Object.keys(map).filter(k => map[k] !== again[k]), n: Object.keys(map).length, stillReg: L.reg.get('dec:' + d1.id), prov: rowsOf(p).filter(r => r.prov).length}; }"""))
    check("a deleted decision's row goes and 'undone' is written", s["gone"] and s["undone"], s)
    check("the next decision gets a new number, never the deleted one's", s["id1"] != s["id2"] and s["id1"].rsplit(".", 1)[0] == s["id2"].rsplit(".", 1)[0] and int(s["id2"].rsplit(".", 1)[1]) > int(s["id1"].rsplit(".", 1)[1]), s)
    check("read again from storage, every row keeps its id", not s["same"] and s["n"] > 0 and s["prov"] == 0, s)
    check("…and the deleted row's number stays taken in the log", s["stillReg"] == s["id1"], s)
    persisted = ev(pg, "window.__mockPersisted === true")
    if persisted:
        ev(pg, "(async () => { flushSaves(); await storeIdle(4000); for (const L of Object.values(ROWS.L)) await L.chain; await storeIdle(4000); })()"); pg.wait_for_timeout(500)   # what a reload does: waiting saves are written first
        ids0 = ev(pg, "(() => { const m = {}; for (const q of WS.projects) for (const r of rowsOf(q)) m[q.id + '|' + r.src] = r.id; return m; })()")
        pg2 = open_page(ctx); pg2.wait_for_timeout(300)
        ids1 = ev(pg2, "(async () => { const m = {}; for (const q of WS.projects){ const L = await rowsEnsure(q); await L.chain; for (const r of rowsOf(q)) m[q.id + '|' + r.src] = r.id; } return m; })()")
        check("after a real reload every row keeps its id", all(ids1.get(k) == v for k, v in ids0.items()), [(k, ids0[k], ids1.get(k)) for k in ids0 if ids0[k] != ids1.get(k)][:5])
        extra = {k: v for k, v in ids1.items() if k not in ids0}
        check("…and a row that is new after the reload gets a number nobody had", not set(extra.values()) & {v for k, v in ids0.items() if k.split("|")[0] in {x.split("|")[0] for x in extra}}, extra)
        pg2.close()
    else: print("      (the data copy is too big for the mock's reload store: ids were read back from storage in the same page instead)")

    print("5 tiers: nothing taken by default; never block, checks or rows a fact touched; 'I do it' is taken with a restore point")
    tr = ev(pg, J("""async () => { const p = WS.projects.find(x => x.id === '__PID__'); const rp0 = arr(p.restore).length;
      const easy = T18.card(p), hard = T18.card(p, {hard: true, target: 'design'}), money = T18.card(p, {target: 'money'}), fact = T18.card(p), gateCard = T18.card(p);
      p.flags = arr(p.flags); p.flags.push({ref: 'pick:' + fact.id, src: 'test', why: 'a fact behind it changed', at: now()});
      ROW_SOURCES.push((q, add) => { if (q.id === p.id) add({src: 'check:test-a11y', ref: 'pick:' + gateCard.id, question: 'Accessibility check', star: {label: 'Apply'}, gate: true, tier: 'auto', tierExplicit: true, autoOK: true, decided: false}); });
      touch(p); await T18.pass(p); await T18.pass(p);
      const st = c => (T18.row(p, 'pick:' + c.id) || {}).status, row = c => T18.row(p, 'pick:' + c.id);
      const res = {byDefault: [easy, hard, money, fact, gateCard].map(st), tiers: {easy: row(easy).tier, hard: row(hard).tier, money: row(money).tier, gate: T18.row(p, 'check:test-a11y').tier}};
      res.setHard = await rowsSetTier(p, 'pick:' + hard.id, 'auto'); res.setMoney = await rowsSetTier(p, 'pick:' + money.id, 'auto'); res.setGate = await rowsSetTier(p, 'check:test-a11y', 'auto');
      res.setFact = await rowsSetTier(p, 'pick:' + fact.id, 'auto');
      await T18.pass(p); await new Promise(r => setTimeout(r, 300)); await T18.pass(p);
      res.after = [hard, money, fact, gateCard].map(st); res.gateAuto = rowAutoOK(p, T18.row(p, 'check:test-a11y')); res.hardAuto = rowAutoOK(p, row(hard));
      const n0 = ROWS.L[p.id].list.length;
      res.setEasy = await rowsSetTier(p, 'pick:' + easy.id, 'auto');
      for (let i = 0; i < 30 && st(easy) === 'open'; i++) await new Promise(r => setTimeout(r, 100));
      await T18.pass(p);
      const took = T18.evs(p).slice(n0).find(e => e.src === 'pick:' + easy.id && e.type === 'taken');
      res.easy = st(easy); res.took = took || null; res.tierEv = T18.evs(p).slice(n0).some(e => e.type === 'tier' && e.src === 'pick:' + easy.id && e.data.tier === 'auto');
      res.rpThere = !!(took && took.rp && arr(p.restore).some(x => x.id === took.rp)); res.rpKind = took && (arr(p.restore).find(x => x.id === took.rp) || {}).kind;
      res.rpMore = arr(p.restore).length >= rp0; res.easySrc = 'pick:' + easy.id; res.ids = {easy: easy.id};
      return res; }"""))
    check("by default PT takes nothing (auto-take is off unless a row is set to 'I do it')", tr["byDefault"] == ["open"] * 5, tr["byDefault"])
    check("hard, money and check rows are 'I wait for you'; an easy pick is 'I do it and tell you'", tr["tiers"] == {"easy": "notify", "hard": "block", "money": "block", "gate": "block"}, tr["tiers"])
    check("a block row or a check row cannot be set to 'I do it'", tr["setHard"] is False and tr["setMoney"] is False and tr["setGate"] is False, tr)
    check("block, check and fact-touched rows stay open even when asked", tr["after"] == ["open"] * 4 and tr["gateAuto"] is False and tr["hardAuto"] is False, tr)
    check("an easy row set to 'I do it' (a tier event) is taken by PT", tr["setEasy"] is True and tr["tierEv"] and tr["easy"] == "decided", tr)
    check("…written as '★ taken' by PT, with a restore point made before it", tr["took"] and tr["took"]["by"] == "star-taken" and tr["took"]["data"].get("auto") and tr["rpThere"] and tr["rpKind"] == "auto", tr["took"])

    print("6 Undo of PT's step: restore + what it cannot undo; PT does not take it again")
    u = ev(pg, J("""async () => { const p0 = WS.projects.find(x => x.id === '__PID__'); const rps = arr(p0.restore).map(x => x.id), n0 = ROWS.L[p0.id].list.length;
      const cannot = await rowsUndo(p0, '__SRC__'); await new Promise(r => setTimeout(r, 600));
      const p = WS.projects.find(x => x.id === '__PID__'); await T18.pass(p); await new Promise(r => setTimeout(r, 500)); await T18.pass(p);
      const evs = T18.evs(p).slice(n0);
      return {keys: arr(cannot).map(c => c.text).length, kinds: ROWS.L[p.id].list.filter(e => e.type === 'undo').map(e => e.data.cannot).pop(), modal: UI.modal && UI.modal.kind, items: UI.modal && arr(UI.modal.items).length,
        status: (T18.row(p, '__SRC__') || {}).status, undoEv: evs.some(e => e.type === 'undo'), undoneEv: evs.find(e => e.type === 'undone' && e.src === '__SRC__'),
        retaken: evs.filter(e => e.type === 'taken' && e.src === '__SRC__').length, kept: rps.every(id => arr(p.restore).some(x => x.id === id)), more: arr(p.restore).length > rps.length}; }"""))
    pg.wait_for_timeout(200)
    check("Undo goes back to the restore point: the row is open again", u["status"] == "open", u)
    check("…and lists what it cannot undo (history entries, later changes)", u["keys"] >= 2 and "events" in (u["kinds"] or []) and "later" in (u["kinds"] or []) and u["modal"] == "rowsundo" and u["items"] == u["keys"], u)
    check("…written as 'undo' and 'taken back by a restore'", u["undoEv"] and u["undoneEv"] and u["undoneEv"]["cause"] == "restore", u)
    check("…and PT does not take that ★ again by itself", u["retaken"] == 0, u)
    check("restore points are never deleted (one more: 'before restoring')", u["kept"] and u["more"], u)
    close_modals(pg)

    print("7 the Decisions page")
    ev(pg, J("(() => { const p = WS.projects.find(x => x.id === '__PID__'); openProject(p.id); UI.home = true; render(); })()")); settle(pg, 500)
    btn = pg.locator(".pg-bar [data-a=rows-open]")
    check("the page bar has 'Decisions' next to the cover and the seven pages (still 8 of them)", btn.count() >= 1 and ev(pg, "document.querySelectorAll('.pg-bar .sp-st').length") == 8, ev(pg, "document.querySelectorAll('.pg-bar .sp-st').length"))
    if btn.count():
        btn.first.click(); settle(pg, 900); pg.wait_for_timeout(600)
        v = ev(pg, "(() => { const m = document.querySelector('.rows-view'); return m ? {rows: m.querySelectorAll('[data-row]').length, ids: [...m.querySelectorAll('[data-row]')].map(x => x.dataset.row), text: m.innerText.slice(0, 4000), here: !!document.querySelector('.pg-bar [data-a=rows-open][aria-current=true]'), stationHere: !!document.querySelector('.pg-bar .sp-st.here')} : null; })()")
        check("it lists the rows with their ids", v and v["rows"] == ev(pg, J("rowsOf(WS.projects.find(x => x.id === '__PID__')).length")) and all(ID.match(i) for i in v["ids"]), v and v["ids"][:6])
        check("it marks itself as the open page (no station marked)", v and v["here"] and not v["stationHere"], v)
        pg.wait_for_timeout(800)
        check("it says the history was checked", "History checked" in ev(pg, "document.querySelector('.rows-view').innerText"), ev(pg, "document.querySelector('.rows-view .rows-chain') && document.querySelector('.rows-view .rows-chain').innerText"))
        h = pg.locator(".rows-view [data-a=rows-hist]").first; h.click(); pg.wait_for_timeout(250)
        check("History opens the events of that row", pg.locator(".rows-view .row-hist li").count() >= 1, ev(pg, "(document.querySelector('.rows-view .row-hist') || {}).innerText"))
        sel = pg.locator(".rows-view select[data-a-change=rows-tier]")
        if sel.count():
            src = sel.first.get_attribute("data-src"); n1 = ev(pg, J("ROWS.L['__PID__'].list.length"))
            sel.first.select_option("block"); pg.wait_for_timeout(400)
            check("changing who acts on a row writes a tier event", ev(pg, J("ROWS.L['__PID__'].list.slice(__N1__).some(e => e.type === 'tier' && e.src === __JSRC__ && e.data.tier === 'block')", n1=n1, jsrc=json.dumps(src))))
        for lang, word in (("en", "Decisions"), ("de", "Entscheide"), ("zh", "决定")):
            ev(pg, "LANG = '" + lang + "'; applyLangAttr(); render()"); pg.wait_for_timeout(250)
            check(f"the page reads in {lang}", word in ev(pg, "(document.querySelector('.rows-view h2') || {innerText: ''}).innerText") and word in ev(pg, "document.querySelector('.pg-bar [data-a=rows-open]').innerText"))
        ev(pg, "LANG = WS.settings.lang || 'en'; applyLangAttr(); render()")
        pg.set_viewport_size({"width": 390, "height": 860}); pg.wait_for_timeout(300)
        check("at phone width nothing runs off the side", ev(pg, "(() => { const m = document.querySelector('.main'); return m.scrollWidth <= m.clientWidth + 2 && document.documentElement.scrollWidth <= window.innerWidth + 2; })()"), ev(pg, "[document.querySelector('.main').scrollWidth, document.querySelector('.main').clientWidth]"))
        pg.set_viewport_size({"width": 1440, "height": 950}); pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / "rows-view.png"))
        pg.locator(".pg-bar .sp-st[data-v=design]").first.click(); pg.wait_for_timeout(400)
        check("a station of the page bar leaves Decisions and opens its page", ev(pg, "!document.querySelector('.rows-view') && !!document.querySelector('.pg[data-page=design]')"))
        pg.locator(".pg-bar [data-a=rows-open]").first.click(); pg.wait_for_timeout(300)
        pg.locator(".pg-bar .sp-st.cover").first.click(); pg.wait_for_timeout(300)
        check("the cover leaves Decisions too", ev(pg, "!document.querySelector('.rows-view') && UI.home === true"))

    print("8 sizes and errors")
    sz = ev(pg, """(() => { const db = window.__mockdb(); let max = 0, at = ''; for (const [k, v] of Object.entries(db)){ const n = new TextEncoder().encode(JSON.stringify(v)).length; if (n > max){ max = n; at = k; } }
      const evs = Object.entries(db).filter(([k]) => /\\/events-\\d{4}-\\d\\d(-\\d+)?\\/[0-9A-Z]{26}$/.test(k)); let emax = 0; for (const [, v] of evs) emax = Math.max(emax, new TextEncoder().encode(JSON.stringify(v)).length);
      return {max, at: at.split('/').slice(-3).join('/'), events: evs.length, emax, fails: ROWS.fails}; })()""")
    check("no stored document over 256 KiB", sz["max"] <= 262144, sz)
    check("event documents stay small and none failed to save", sz["events"] >= 1 and sz["emax"] < 200000 and sz["fails"] == 0, sz)
    # the other workspace: its projects yield rows too
    o = ev(pg, """async () => { const other = META.workspaces.find(w => w.id !== WS.id); if (!other || other.pinHash) return {skip: true}; await openWorkspace(other.id); await new Promise(r => setTimeout(r, 600));
      const out = []; for (const p of WS.projects){ const L = await rowsEnsure(p); await L.chain; out.push({n: rowsOf(p).length, first: (L.list[0] || {}).type, ids: rowsOf(p).map(r => r.id)}); } return {out}; }""")
    if not o.get("skip"):
        check("the other workspace: every project gets its log and numbered rows", all(x["first"] in ("migrated", "started") and all(ID.match(i) for i in x["ids"]) for x in o["out"]), o)
    check("no page errors", not errors, errors[:5])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
sys.exit(1 if fails or errors else 0)
