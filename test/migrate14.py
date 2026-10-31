"""1.4 one-time repairs on a COPY of the real data (backup-140): what changes, that it is one Undo, that nothing is lost."""
import json, sys, pathlib
sys.argv = sys.argv[:1]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = new_ctx(b); pg = open_page(ctx)
    r = pg.evaluate("""WS.projects.map(p => ({id: p.id, name: p.name, lang: p.lang, m14: p.m14, log: (arr(p.activity).find(a => /PT 1.4/.test(a.text)) || {}).text || '', acts: arr(p.acts).filter(a => a.by === 'pt').map(a => a.label)}))""")
    for x in r: print(" ", x["name"], x["lang"], x["m14"] and x["m14"]["n"], "|", x["log"][:400])
    check("every project repaired once", all(x["m14"] for x in r), r)
    check("every project has a content language", all(x["lang"] in ("en", "de", "zh") for x in r))
    w = pg.evaluate("""(() => { const p = WS.projects.find(x => /^Watch/.test(x.name)); return {testing: p.assumptions.filter(a => a.status === 'testing').length, validated: p.assumptions.filter(a => a.status === 'validated').length, chosen: p.arch.chosen, drawnFor: p.arch.drawnFor, ph: p.findings.filter(f => ['fd-mvfrw5tsiqi89','fd-mvfvolde5gkn6'].includes(f.id)).map(f => f.status), noT: p.findings.filter(f => OPEN_F.includes(f.status) && !arr(f.targets).length).length, flags: p.flags.length, ptMarks: Object.values(p.marks || {}).filter(m => m.by === 'pt').length}; })()""")
    print("  Watch:", w)
    check("Watch: 15 confirmed assumptions validated", w["testing"] == 0 and w["validated"] >= 34, w)
    check("Watch: drawn design is the choice", w["chosen"] == "o3" and w["drawnFor"] == "o3", w)
    check("Watch: two false alarms closed", w["ph"] == ["wontfix", "wontfix"], w)
    check("Watch: every open problem has targets", w["noT"] == 0, w)
    check("Watch: one no-op mark removed (51 left)", w["flags"] == 51, w)
    check("Watch: PT's decisions are marked for checking", w["ptMarks"] >= 17, w)
    rc = pg.evaluate("""(() => { const p = WS.projects.find(x => /^Ricardo/.test(x.name)); const R = new Set(p.requirements.map(r => r.id)); return {waiting: p.findings.filter(f => f.status === 'waiting').length, legacy: p.findings.filter(f => f.legacy && f.status === 'done').length, dangling: p.tests.filter(x => arr(x.reqIds).some(r => !R.has(r))).length, parked: p.tests.filter(x => arr(x.oldReqIds).length).length, dims: p.pkg.sections.filter(s => arr(s.dims).length).length, migrated: Object.values(p.step || {}).filter(v => v && v.migrated).length, block: blockingItems(p).length}; })()""")
    print("  Ricardo:", rc)
    check("Ricardo: 66 v1 fixes stay done", rc["waiting"] == 0 and rc["legacy"] == 66, rc)
    check("Ricardo: dangling test links parked, not lost", rc["dangling"] == 0 and rc["parked"] == 13, rc)
    check("Ricardo: section dimension ids moved", rc["dims"] >= 3, rc)
    check("Ricardo: no step finished by the old migration", rc["migrated"] == 0, rc)
    jz = pg.evaluate("""WS.projects.map(p => p.lang)""")
    # one Undo takes the repairs back, and they do not run again
    u = pg.evaluate("""async () => { let p = WS.projects.find(x => /^Ricardo/.test(x.name)); openProject(p.id); const a1 = arr(p.acts).find(x => x.label === t('m141.act')); const a = arr(p.acts).find(x => x.label === t('m14.act'));
      // 1.4.1 ran its own tidy-up after the 1.4 repairs, so the 1.4 repairs are no longer the last action: they come back through their restore point
      if (a1 && a.rp && arr(p.restore).some(r => r.id === a.rp)){ doRestore(p, a.rp); await new Promise(r => setTimeout(r, 1500)); p = WS.projects.find(x => /^Ricardo/.test(x.name)); return {ok: true, viaRp: true, waiting: p.findings.filter(f => f.status === 'waiting').length, m14: !!p.m14, again: migrate14(p)}; }
      const ok = undoAct(p, a.id); await new Promise(r => setTimeout(r, 1500)); return {ok, big: !!a.big, rp: a.rp, waiting: p.findings.filter(f => f.status === 'waiting').length, m14: !!p.m14, again: migrate14(p)}; }""")
    check("one Undo takes the repairs back, and they do not run again", u["waiting"] == 66 and u["m14"] and u["again"] is None, u)
    ctx.close()
    # Second owner: the empty project takes her workspace language
    ctx = new_ctx(b); pg = open_page(ctx, pick="Second owner")
    jl = pg.evaluate("WS.projects.map(p => [p.name, p.lang, p.m14 && p.m14.n])")
    print("  Second owner:", jl)
    check("Second owner: every project is Chinese (also the empty one)", all(x[1] == "zh" for x in jl), jl)
    pg.evaluate("openProject(WS.projects[0].id)"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOTS / "second-home.png"))
    ctx.close()
    # the Bring-to-1.4 card on Watch's overview
    ctx = new_ctx(b); pg = open_page(ctx); watch(pg); pg.wait_for_timeout(300)
    check("Bring to 1.4 card on the overview", pg.locator(".b14 [data-a=crit-draft]").count() == 1)
    pg.screenshot(path=str(SHOTS / "watch-home-b14.png"))
    b.close()
print("ok:", len(oks), "failed:", len(fails), "page errors:", len(errors))
for f in fails: print("  FAIL", f)
for e in errors[:30]: print("  ERR", e)
