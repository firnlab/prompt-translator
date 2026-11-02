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
    ("kit decisions come all at once before the design", [("v170_pages.js", "{ const orig = kitQueue; kitQueue = function(p, add){ if (pgKitsReady(p)) return orig(p, add); return orig(p, x => { if (!/^kit-/.test(str(x && x.kind)) || PG_KIT_EARLY.test(x.kind)) add(x); }); }; }", ""),
        ("v160_kits.js", "function kitApplies(p){\n  if (!p || !arr(p.arch && p.arch.components).length) return false;", "function kitApplies(p){\n  if (!p) return false;")], "python3 test/e2e17.py"),
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
    # 1.8.1 creating scheduled tasks (e2e180_run must turn red; the made-up bundle)
    ("a scheduled task is created with notifications but without a new session per run", [("core.js", "Object.assign({}, input, {create_new_session_on_fire: true})", "Object.assign({}, input)")], "python3 test/e2e180_run.py test/fixtures/synthetic.json"),
    ("any refusal of a new scheduled task is tried again", [("core.js", 'if (/create_new_session_on_fire|notifications/i.test(msg) && ("notifications" in a || "create_new_session_on_fire" in a)){', 'if (true){')], "python3 test/e2e180_run.py test/fixtures/synthetic.json"),
    # 1.8.2 the cloud environment (cause 70)
    ("a scheduled task created from PT gets no cloud environment", [("core.js", 'if (/environment_id/i.test(msg) && envs.length){', 'if (false){')], "python3 test/e2e180_run.py test/fixtures/synthetic.json"),
    ("a self-hosted pool is taken before a cloud environment", [("core.js", 'envs.find(x => x.startsWith("env_")) || ', '')], "python3 test/e2e180_run.py test/fixtures/synthetic.json"),
    # 1.9 fleet (e2e190_fleet must turn red; the made-up bundle)
    ("the next tool starts after one green live check", [("v190_fleet.js", 'if (n >= 2 && runs[n - 1] && runs[n - 1].ok === true && runs[n - 2] && runs[n - 2].ok === true) return {green: true, why: ""};', 'if (runs[n - 1] && runs[n - 1].ok === true) return {green: true, why: ""};')], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("the kit run goes on after a red", [("v190_fleet.js", "  else { R.stoppedAt = x.end; R.reason = x.note; }", "  else setTimeout(fl19Next, 0);")], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("another person's tool is republished by the kit run", [("v190_fleet.js", '  if (p && str(p.sharedFrom)) return "shared";\n', "")], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("the kit run starts without its put-live card", [("v190_fleet.js", 'UI.modal = {kind: "fl19go", mode: "start", wide: true}; render(); },', 'fl19Start("start"); },')], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("a stored kit run does not go on when PT opens again", [("v190_fleet.js", "    try{ if (WS && WS.id === id) fl19Resume(); }catch(e){", "    try{ }catch(e){")], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("a preview copy runs the kit update", [("v190_fleet.js", '  if (PT_PREVIEW){ toast(t("pv.blocked"), "err"); return null; }   // a preview copy never republishes real tools\n', "")], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    ("Cancel lets the waiting tools of the kit run start", [("v190_fleet.js", '  const nx = R.cancelledAt ? null : R.tools.find(x => x.state === "waiting");', '  const nx = R.tools.find(x => x.state === "waiting");')], "python3 test/e2e190_fleet.py test/fixtures/synthetic.json"),
    # 1.9 care (e2e190_care / plain_browser must turn red; the made-up bundle)
    ("a full export is not recorded (the export reminder never goes away)", [("v190_care.js", "if (full) Promise.resolve(r).then(ok => { if (ok === true) care19Exported(); }, () => null);", "")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("a failed download counts as a saved export", [("v190_care.js", "if (ok === true) care19Exported();", "care19Exported();")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the AI ceiling is proposed before February 2027", [("v190_care.js", "str(key) < CARE19_CEIL_FROM || ", "")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the AI ceiling is proposed with fewer than 60 days of counts", [("v190_care.js", "if (days < CARE19_CEIL_MIN_DAYS) return null;", "")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("automatic AI work goes on above the ceiling", [("v190_care.js", "{ const orig = autoOK; autoOK = function(){ return orig.apply(this, arguments) && !care19Over(); }; }", "")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("an AI step you start above the ceiling runs without asking", [("v190_care.js", '      if (!(await care19Ask())) throw {code: "cancelled"};\n', "")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("push on leaves the old Sunday task running", [("v190_care.js", "  if (cur && cur !== id){ try{ await Runner.setEnabled(cur, false); }", "  if (false){ try{ await Runner.setEnabled(cur, false); }")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the push task runs without the noteworthy-only rule", [("v190_care.js", "prompt: want ? care19PushPrompt(coll) : wk18Prompt(coll)", "prompt: wk18Prompt(coll)")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the key renewal shows before 4 Oct 2027", [("v190_care.js", "const day = care19Day(ms); if (day < CARE19_KEYS_FROM) return false;", "const day = care19Day(ms);")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the server-backed key is recorded without a monthly limit", [("v190_care.js", 'if (!(v >= 1)){ m.err = true; m.limit = ""; render(); focusSoon("care19-limit"); return; }', ""),
        ("v190_care.js", "const v = Math.floor(num(limit, 0)); if (!p || !(v >= 1)) return false;", "const v = Math.floor(num(limit, 0)); if (!p) return false;")], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the viewer outside claude.ai writes to the browser's storage", [("v190_care.js", '    VIEW19.sel = -1;\n  }catch(e){ VIEW19.err = t("care.v.bad"); }', '    VIEW19.sel = -1; try{ localStorage.setItem("pt:v19", "1"); }catch(e2){ console.warn(e2); }\n  }catch(e){ VIEW19.err = t("care.v.bad"); }')], "python3 test/plain_browser.py test/fixtures/synthetic.json"),
    ("PT outside claude.ai falls back to the editable local mode", [("v190_care.js", "if (view19Wanted()){ for (let i = 0;", "if (false){ for (let i = 0;")], "python3 test/plain_browser.py test/fixtures/synthetic.json"),
    # 1.9 scan (self-scan, 4×4 interview, what changed; e2e190_scan must turn red; the made-up bundle)
    ("a shortcut is offered for a step that changes something", [("v190_scan.js", "function scan19Safe(name){ const b = scan19Base(name); return SCAN19_SAFE.has(b) && ACT_NO.has(b); }", "function scan19Safe(name){ return true; }")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a sequence of only moving around is proposed", [("v190_scan.js", "if (new Set(w).size < 2 || scan19Pure(w)) continue;", "if (new Set(w).size < 2) continue;")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a declined workflow comes back before its count doubles", [("v190_scan.js", 'if (d.d === "no") return c.n >= 2 * Math.max(1, num(d.n, 1));', 'if (d.d === "no") return true;')], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("the self-scan runs before Saturday 22:00", [("v190_scan.js", "if (back === 0 && z.h < 22) back = 7;", "")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a proposal becomes a shortcut by itself", [("v190_scan.js", "      if (doc.scan.length){ await Store.putNow(wk18Path(doc.key), doc);", '      for (const x of doc.scan) if (x.safe) setTimeout(() => scan19Answer(x.sig, "yes"), 0);\n      if (doc.scan.length){ await Store.putNow(wk18Path(doc.key), doc);')], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a risky change to a live tool goes ahead without the interview", [("v190_interview.js", "  return {need: why.length > 0 && !small, why, rows: changed.length, small};", "  return {need: false, why, rows: changed.length, small};")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a small private change waits for the interview", [("v190_interview.js", "  const small = n <= 1 && (fixOnly || n === 0) && !data && changed.length <= IV19_ROWS;   // one fix, or nothing recorded as changed", '  const small = false; if (!why.length) why.push("out");')], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("a skipped interview area leaves no residual-risk row", [("v190_interview.js", "      if (skip || left.length){", "      if (false){")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("interview answers are not decision rows", [("v190_interview.js", "ROW_SOURCES.push(function iv19Rows(p, add){", "(function iv19Rows(p, add){")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
    ("what changed is listed under the wrong version", [("v190_interview.js", "evs.filter(e => str(e.at) > from && str(e.at) <= to)", "evs.filter(e => str(e.at) <= from)")], "python3 test/e2e190_scan.py test/fixtures/synthetic.json"),
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
