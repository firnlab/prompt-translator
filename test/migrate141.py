"""1.4.1 one-time tidy-up on a COPY of the real data (backup-141): what changes, one Undo, nothing lost, runs once.
Run: python3 test/migrate141.py [backup dir]"""
import json, sys, pathlib
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
    r = pg.evaluate("""WS.projects.map(p => ({name: p.name, m141: p.m141, log: (arr(p.activity).find(a => /PT 1\\.4\\.1/.test(str(a.text))) || {}).text || ''}))""")
    for x in r: print(" ", x["name"], x["m141"] and x["m141"]["n"], "|", x["log"][:300])
    check("every project tidied once", all(x["m141"] for x in r), r)
    c = pg.evaluate("""WS.projects.flatMap(p => goalOf(p).criteria.map(c => ({p: p.name, id: c.id, when: c.when, then: c.then, v: c.v, hist: Array.isArray(c.hist)})))""")
    bad = [x for x in c if re.match(r"^(when|wenn|当)\b", x["when"], re.I) or re.match(r"^(the result|das ergebnis)\b", x["then"], re.I)]
    check("criteria: no frame words left in the stored text", not bad, bad[:3])
    check("criteria: none cut with …", not [x for x in c if x["when"].endswith("…") or x["then"].endswith("…")])
    check("criteria: every one has a version and a history", all(x["v"] >= 1 and x["hist"] for x in c), [x for x in c if not (x["v"] and x["hist"])][:3])
    w = pg.evaluate("""(() => { const p = WS.projects.find(x => /^Watch/.test(x.name)); const m14 = arr(p.activity).find(a => /PT 1\\.4 one-time/.test(str(a.text))); return {chosen: p.arch.chosen, assumed: p.arch.chosenAssumed, mark: p.marks['arch:choice'], m14: m14 && m14.text, cards: arr(p.problem && p.problem.cards).map(x => x.verdict)}; })()""")
    check("Watch: o3 stays the choice and is marked as yours", w["chosen"] == "o3" and not w["assumed"] and w["mark"] and not w["mark"].get("by") and not w["mark"].get("why") and not w["mark"].get("prev"), w)
    check("Watch: the wrong 'placeholder' reason is gone from the log", w["m14"] and "Design choice" not in w["m14"] and "placeholder" not in w["m14"] and "(20 changes" in w["m14"], (w["m14"] or "")[:120])
    check("Watch: chosen reframes became problem cards that fit", w["cards"] == ["good"] * 4, w["cards"])
    rc = pg.evaluate("""(() => { const p = WS.projects.find(x => /^Ricardo/.test(x.name)); return {cards: arr(p.problem && p.problem.cards).length, reframes: arr(p.understand.reframes).length}; })()""")
    check("Ricardo: reframes kept and shown as problem cards", rc["cards"] == 4 and rc["reframes"] == 4, rc)
    e = pg.evaluate("""WS.projects.flatMap(p => goalOf(p).examples.map(e => e.src))""")
    check("examples: every one says where it came from", all(s in ("pt","you","run","real","test","variant","copy") for s in e), e)
    lv = pg.evaluate("({asked: WS.settings.levelAsked, help: WS.settings.help, m141: !!WS.settings.m141})")
    check("workspace: you are not asked for your level again; it stays Learning", lv["asked"] and lv["help"] == "learn" and lv["m141"], lv)
    check("workspace: no first-level card", pg.evaluate("go('cockpit'), document.querySelectorAll('[data-a=fl-pick]').length") == 0)
    # one Undo takes it back; it does not run again
    u = pg.evaluate("""async () => { const p = WS.projects.find(x => /^Watch/.test(x.name)); openProject(p.id); const a = arr(p.acts).find(x => x.label === t('m141.act')); const ok = undoAct(p, a.id); await new Promise(r => setTimeout(r, 1500)); const m14 = arr(p.activity).find(x => /PT 1\\.4 one-time/.test(str(x.text))); return {ok, rp: !!a.rp, mark: p.marks['arch:choice'], cards: arr(p.problem && p.problem.cards).length, m141: !!p.m141, again: migrate141(p), m14arch: /Design choice/.test(str(m14 && m14.text))}; }""")
    check("one Undo takes the tidy-up back (with a restore point), and it does not run again", u["rp"] and u["cards"] == 0 and u["mark"].get("by") == "pt" and u["m141"] and u["again"] is None, u)
    # after reload: still tidied, not run twice, restore points untouched
    pg2 = open_page(ctx); pg2.wait_for_timeout(300)
    n = pg2.evaluate("""WS.projects.map(p => arr(p.activity).filter(a => /PT 1\\.4\\.1 one-time/.test(str(a.text))).length)""")
    check("after a reload it does not run twice", all(x <= 1 for x in n), n)
    check("no page errors", not errors, errors[:3])
    ctx.close(); b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
