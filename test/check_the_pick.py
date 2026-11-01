"""Check the Pick checks: put known Pick and protection bugs back into a COPY of the sources, one at a time, build it, and make sure
the Pick tests catch each one (the test named for it must turn red). A test that stays green with its bug back is broken.
Run: python3 test/check_the_pick.py        (about 20 minutes; never touches src/)"""
import pathlib, shutil, subprocess, sys, tempfile, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
C, E, B = "python3 test/pick_contract.py", "python3 test/e2e15.py", "python3 test/e2e15b.py"
D = "python3 test/e2e180_decide.py"   # 1.8 deciding
CN = "python3 test/e2e180_cone.py test/fixtures/synthetic.json"   # 1.8 the cone
# (name, [(file, old, new), …], test that must fail)
M = [
    ("research questions keep people's names", [("v150_pick.js", "for (const n of [...people, ...people.flatMap(n => n.split(/[\\s._-]+/))].filter(v => v.trim().length > 2)) x = x.replace(rx(n), \"[name]\");", "")], C),
    # 1.8 (owner): hard picks DO show PT's ★ now ("a hard pick gets a ★" is no longer a bug); the bug is a hard ★ taken by itself
    ("a hard pick's ★ is taken by 'take all ★'", [("v150_pick.js", "pickOpenCards(p).filter(c => !c.qkey && !c.hard && c.rec >= 0", "pickOpenCards(p).filter(c => !c.qkey && c.rec >= 0"),
        ("v180_decide.js", "return orig(p).filter(c => !c.hard && !pk8CardCallFirst(p, c));", "return orig(p);"),
        ("v180_decide.js", "if (c && o.assumed && (c.hard || (cf && !call))) return null;", "")], C),
    ("a blog confirms what a platform can do", [("v150_pick.js", "if (x.kind === \"platform\" && status && status !== \"unknown\" && !first) status = \"unknown\";", "")], C),
    ("Undo leaves a pick open and decided", [("v150_pick.js", "try{ if (p && pickCoherent(p)){ touch(p); actRebase(p); } }", "try{ }")], C),
    ("an AI answer that breaks a card rule is used without asking again", [("v150_pick.js", "check: o => arr(o.cards).flatMap(c => pickCardChecks(c, k, lang))});\n  if (!r) return null;\n  const q = pickLive(p, ws0); if (!q) return null;\n  const kk = pickOf(q);\n  const asked", "});\n  if (!r) return null;\n  const q = pickLive(p, ws0); if (!q) return null;\n  const kk = pickOf(q);\n  const asked")], B),
    ("research that never reports back keeps hard picks waiting", [("v150_pick.js", "if (Date.now() - Date.parse(r.at || 0) >= 45 * 60 * 1000) return false;", "")], E),
    ("\"I ran it\" marks the stand-ins as tested", [("v150_pick.js", " && !stand.some(s0 => similar(s0, x.part))){ x.status = \"tested\";", "){ x.status = \"tested\";")], B),
    ("a new platform keeps the old platform's parts", [("v150_pick.js", "k.platformParts = []; k.platCheck = null;", "k.platCheck = null;")], B),
    ("Later in Finish and Later in Pick are two things", [("v150_pick.js", "function pickIsParked(p, c){ return !!c.parked || !!((p && p.later) || {})[pickLaterKey(c)]; }", "function pickIsParked(p, c){ return !!c.parked; }")], B),
    ("own words go into the prompt raw", [("v150_pick.js", "${untrusted(\"own_words\", own)}", "<own_words>${own}</own_words>")], E),
    ("a run writes into a project that was deleted meanwhile", [("v150_pick.js", "  const q = pickLive(p, ws0); if (!q) return null;\n  const kk = pickOf(q);\n  const asked", "  const q = liveP(p);\n  const kk = pickOf(q);\n  const asked"),
        ("app.js", "if (WS && Array.isArray(WS.projects) && !WS.projects.some(x => x.id === p.id)) return;", ""),
        ("app.js", "if (WS.id === ws0 && WS.projects.includes(p)) saveProject(p);", "if (WS.id === ws0) saveProject(p);")], B),
    ("a background result joins the try's Undo", [("tasks2.js", "{by: \"pt\", alone: true}", "{by: \"pt\"}")], B),
    ("a failed workspace load writes the workspace", [("app.js", "if (!w || w !== WS || !w._set) return;", "if (!w) return;"), ("v150_pick.js", "if (UI.wsReady && !UI.fatal && WS.id === id) pickDefaultsOnce();", "pickDefaultsOnce();")], B),
    ("a changed measure gets a new criterion id", [("v150_pick.js", "const c0 = reuse.shift();", "const c0 = null; reuse.length && 0;")], B),
    ("findings that instruct the AI reach the prompts", [("core.js", "arr(p.pick.findings).filter(f => f && f.screened && !f.flagged)", "arr(p.pick.findings).filter(f => f && f.screened)")], B),
    ("a storage decision made before its Undo step opens splits into two steps", [("v160_kits.js", 'actOpen(p, t("kit.act.storage"));   // before the first write (kitOf makes the field), so the decision is one Undo step\n  const k = kitOf(p);', 'const k = kitOf(p);\n  actOpen(p, t("kit.act.storage"));')], "python3 test/e2e16.py"),
    ("a tool without a page gets the page build steps", [("v160_kits.js", "  if (!kitApplies(p)) return [];\n  const st = kitStorageDecided(p), S = kitSettings(), caps", "  if (!p) return [];\n  const st = kitStorageDecided(p), S = kitSettings(), caps")], "python3 test/e2e16.py"),
    ("a weekly tool gets the daily watchdog", [("v160_kits.js", "  return /hourly|daily|weekday|every day|every morning|täglich|stündl|jeden tag|jeden morgen|每天|每小时|每个工作日/.test(kit2Text(p));", "  return true;")], "python3 test/e2e16.py"),
    ("a pasted company record is treated as an ordinary design", [("v160_company.js", 'function looksLikeCompanyRecord(text){ const s = str(text); return (s.match(/\\bSR-\\d+\\b/g) || []).length >= 10 ||', 'function looksLikeCompanyRecord(text){ const s = str(text); return false && (s.match(/\\bSR-\\d+\\b/g) || []).length >= 10 ||')], "python3 test/e2e16.py"),
    ("an employee tool forgets its company's rules", [("v160_company.js", 'const co = companyOfEmployee(p), e = companyOf(p), rules = co ? companyRulesText(co) : "";', 'const co = companyOfEmployee(p), e = companyOf(p), rules = "";')], "python3 test/e2e16.py"),
    ("a web app in a repository is treated as a plain page", [("v160_webapp.js", "  if (KIT_WEB_HOME.test(home)) return true;\n  if (/artifact|scheduled|task|aufgabe|定时/.test(home)) return false;", "  if (KIT_WEB_HOME.test(home)) return false;\n  if (/artifact|scheduled|task|aufgabe|定时/.test(home)) return false;")], "python3 test/e2e16.py"),
    ("a published media tool is treated as private", [("v160_media.js", "function kit5Public(p){ const txt = kit5Text(p), aud = p.audience || {}; return aud.customers === true ||", "function kit5Public(p){ const txt = kit5Text(p), aud = p.audience || {}; return false; aud.customers === true ||")], "python3 test/e2e16.py"),
    ("a customers' phone app is treated as private", [("v160_phone.js", "function kit4Private(p){ const aud = p.audience || {}; return aud.customers !== true &&", "function kit4Private(p){ const aud = p.audience || {}; return true || aud.customers !== true &&")], "python3 test/e2e16.py"),
    ("the budget throttles the automatic steps again", [("v160_spine.js", "autoOK = function(){ return !!(WS && WS.settings && WS.settings.autoJobs !== false); };", "autoOK = function(){ return !!(WS && WS.settings && WS.settings.autoJobs !== false) && usagePct() < 70; };")], "python3 test/e2e16.py"),
    ("a missing result pick is not noticed", [("v160_spine.js", "  return pickReady(p).filter(x => !x.ok && SP_GAP[x.id]).map(x => x.id).filter(id => !open.some(c => SP_GAP[id].includes(c.target)));", "  return [];")], "python3 test/e2e16.py"),
    ("PT's drafts ask once per item again", [("v160_spine.js", '    for (const x of queueOf(p).filter(x => x.cls === "check" && SP_BATCH[x.kind] && qOptions(p, x).some(o => o.batch))) (groups[x.kind] = groups[x.kind] || []).push(x);', '    for (const x of []) (groups[x.kind] = groups[x.kind] || []).push(x);')], "python3 test/e2e16.py"),
    ("what was recorded is not shown", [("v160_spine.js", "if (e && e.id && !o.assumed && !o.fromSaid) UI.pkLast = {pid: p.id, eid: e.id, at: Date.now()};", "if (false) UI.pkLast = {pid: p.id, eid: e.id, at: Date.now()};")], "python3 test/e2e16.py"),
    ("the protections are approved in one click", [("v150_pick.js", "o(t(\"pk.pf.look\"), () => goRef(\"proof\"), {star: true, opens: true});", "o(t(\"pk.pf.ok\"), () => {}, {star: true, batch: true});")], B),
    # 1.7.0: the pages, honesty, the drill, the mock (e2e17 must turn red)
    ("the Bauplan does nothing again (the Design page loses the map)", [("v170_pages.js", 'const map = comps.length ? `<section class="panel pg-map" data-anchor="bauplan">', 'const map = false ? `<section class="panel pg-map" data-anchor="bauplan">')], "python3 test/e2e17.py"),
    ("kit decisions come all at once before the design", [("v170_pages.js", "{ const orig = kitQueue; kitQueue = function(p, add){ if (pgKitsReady(p)) return orig(p, add); return orig(p, x => { if (!/^kit-/.test(str(x && x.kind)) || PG_KIT_EARLY.test(x.kind)) add(x); }); }; }", "")], "python3 test/e2e17.py"),
    ("a stale fact is not flagged", [("v170_honest.js", "function factStale(d){ return factAge(d) > FACT_DAYS; }", "function factStale(d){ return false; }")], "python3 test/e2e17.py"),
    ("a part that reads and acts is not flagged", [("v170_honest.js", "const both = comps.filter(c => reads.includes(c) && acts.includes(c));", "const both = [];")], "python3 test/e2e17.py"),
    ("the mock runs unsandboxed", [("v170_more.js", 'sandbox="allow-scripts"', 'sandbox="allow-scripts allow-same-origin"')], "python3 test/e2e17.py"),
    ("an undefended attack never reaches the queue", [("v170_honest.js", "{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); rtQueue(p, add); }; }", "")], "python3 test/e2e17.py"),
    ("Finish hides what it changed", [("v170_pages.js", 'if (F && UI.finish === F && F.step === "done" && F.startAt) return h.replace(/<\\/section>\\s*$/, pgChangeList(p, F.startAt) + "</section>");', "")], "python3 test/e2e17.py"),
    # 1.8 checks, fixing and facts (e2e180_checks must turn red)
    ("a private tool's check row is applied without a tap", [("v180_checks.js", 'return chkPrivate(p) ? "open" : "apply";', 'return "apply";')], "python3 test/e2e180_checks.py"),
    ("a tool that acts outward runs its tests only 3 times", [("v180_checks.js", "function chkTrials(p){ return chkOutward(p) ? CHK_TRIALS_OUT : TRIALS; }", "function chkTrials(p){ return TRIALS; }")], "python3 test/e2e180_checks.py"),
    ("a fix proposed twice is tried again", [("v14_fix.js", "if (round > 1 && fixRepeats(seen, changed, after)){", "if (false){")], "python3 test/e2e180_checks.py"),
    ("the fifth round leaves no residual risk", [("v14_fix.js", "capped: round === rounds && rounds >= FIX_CAP && !(UI.finish && UI.finish.stop)", "capped: false")], "python3 test/e2e180_checks.py"),
    ("a price past its budget is still used (one 90-day rule again)", [("v180_checks.js", "const FACT_BUDGET = {price: 20, platform: 45, policy: 180, other: 90};", "const FACT_BUDGET = {price: 90, platform: 90, policy: 90, other: 90};")], "python3 test/e2e180_checks.py"),
    # 1.8 deciding (e2e180_decide must turn red)
    ("your call first shows the ★ before your call", [("v180_decide.js", 'const card = cf && !call ? Object.assign({}, c, {rec: -1, recWhy: "", mind: ""}) : cf ? Object.assign({}, c, {recWhy: ""}) : c;', "const card = c;")], D),
    ("a first version needs the measure again", [("v180_decide.js", 'return orig(p).filter(x => x.id !== "measure");', "return orig(p);")], D),
    ("the picks come before the mock", [("v180_decide.js", "if (!k.mf && !k.log.length && !k.cards.length) return pk8Begin(p);", "if (false) return pk8Begin(p);")], D),
    ("a technical risk skips the quick try", [("v180_decide.js", 'if (r && r.risk === "technical") return pk8SpikeStart(q, r);', "")], D),
    ("a round makes three cards again", [("v180_decide.js", "if (!need.length && (o == null || o.n == null || o.n === 3)) o = Object.assign({}, o, {n: PK8_ROUND});", "")], D),
    ("the four routes show before the price is read", [("v180_decide.js", 'if (x && x.kind === "kit-rebuild"){ if (pk8PriceWaits(p)) return;', 'if (x && x.kind === "kit-rebuild"){ if (false) return;')], D),
    ("the Bauplan opens by default", [("v180_decide.js", "const open = !!(UI.pk8Map && UI.pk8Map[p.id]);", "const open = true;")], D),
    # 1.8 the cone (e2e180_cone must turn red; the made-up bundle, so no real data is needed)
    ("the cone is not the default start for a new tool", [("v180_cone.js", 'function coneStartMode(p){ const s = pickRead(p).start; return s === "fast" || s === "questions" ? s : "cone"; }', 'function coneStartMode(p){ const s = pickRead(p).start; return s === "cone" || s === "questions" ? s : "fast"; }')], CN),
    ("the gallery shows kinds the inference never named (decoys)", [("v180_cone.js", "  if (!fams.length) return null;", "  for (const f of coneRank(sentence)) if (fams.length < 8 && !fams.some(x => x.f === f)) fams.push(coneFamDefault(f));\n  if (!fams.length) return null;")], CN),
    ("an answer cuts nothing in the gallery", [("v180_cone.js", '  if (!v || v === "unsure") return true;', "  return true;")], CN),
    ("who it is for is not asked first", [("v180_cone.js", 'if (!A.aud) return "aud";', 'if (!A.aud && Object.keys(A).length >= 3) return "aud";')], CN),
    ("cut cards vanish without a way back", [("v180_cone.js", "const rem = removed.length ?", "const rem = false ?")], CN),
    ("the cone shows PT's ★ before the cards were looked at", [("v180_cone.js", "function coneStarShown(p){ return !!(p && UI.coneStar && UI.coneStar[p.id]); }", "function coneStarShown(p){ return !!p; }")], CN),
    ("pick then verify asks every question", [("v180_cone.js", '    if (CONE_OPTS[d].some(v => v !== "unsure" && !S.some(s => coneFits(s, d, v)))) out.push(d);', "    out.push(d);")], CN),
    ("a 1.7 tool's earlier decision is replaced without a tap", [("v180_cone.js", "  if (coneConflict(c0, d, v) && !replace){", "  if (false && coneConflict(c0, d, v) && !replace){")], CN),
    ("a cone answer is not a decision row", [("v180_cone.js", "ROW_SOURCES.push(coneRowSrc);", "")], CN),
    ("the kind's outward action does not reach the checks", [("v180_cone.js", 'return e && e.out ? e.out : "";', 'return "";')], CN),
]

ONLY = next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--only=")), None)   # 1.8: run the planted bugs whose name or test contains this text
if ONLY: M = [m for m in M if ONLY in m[0] or ONLY in m[2]]
import re as _re
def run(tmp, cmd):
    r = subprocess.run(cmd, shell=True, cwd=tmp, capture_output=True, text=True, timeout=1800)
    out = r.stdout + r.stderr
    # 1.8: e2e17 ends with "N ok, 0 failed, page errors: 0" — that form counts as green too (before, its planted bugs always read as caught)
    return r.returncode == 0 and ("failed: 0" in out or bool(_re.search(r"\b0 failed\b", out))) and "page errors: 0" in out, out

with tempfile.TemporaryDirectory() as td:
    tmp = pathlib.Path(td)
    for d in ("src", "test", "vault"): shutil.copytree(ROOT / d, tmp / d, ignore=shutil.ignore_patterns("*.html", "*.png", "shots*", "__pycache__"))   # 1.7: build.py reads vault/vault.json
    shutil.copy(ROOT / "build.py", tmp / "build.py"); (tmp / "dist").mkdir()
    os.symlink((ROOT / "work").resolve(), tmp / "work")
    b = subprocess.run("python3 build.py", shell=True, cwd=tmp, capture_output=True, text=True)
    if b.returncode != 0: print("the copy does not build — nothing can be checked:\n" + (b.stdout + b.stderr)[-800:]); sys.exit(1)
    missed = []
    for name, subs, test in M:
        saved = {}
        ok = True
        for f, old, new in subs:
            fp = tmp / "src" / f; s = saved.get(f, fp.read_text()); saved.setdefault(f, s)
            cur = fp.read_text()
            if old not in cur: missed.append(f"{name}: the code it changes is gone — update this script ({old[:60]})"); ok = False; break
            fp.write_text(cur.replace(old, new, 1))
        if ok:
            subprocess.run("python3 build.py", shell=True, cwd=tmp, capture_output=True)
            passed, out = run(tmp, test)
            print(("caught  " if not passed else "MISSED  ") + name + "  (" + test.split("/")[-1] + ")", flush=True)
            if passed: missed.append(f"{name}: {test} stayed green")
        for f, s in saved.items(): (tmp / "src" / f).write_text(s)
    print(f"\nplanted Pick bugs: {len(M)}, MISSED {len(missed)}")
    for m in missed: print("  " + m)
    sys.exit(1 if missed else 0)
