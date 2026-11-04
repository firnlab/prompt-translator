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
    ("the key renewal leaves the build repository out of the pt-private key (cause 76)", [("v190_care.js", 'b: ["b1", "b2", "b3", "b4", "b5"]', 'b: ["b1", "b2", "b3", "b4"]')], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    ("the build repository's key page ignores Settings › General (cause 76)", [("v190_care.js", "`https://github.com/${encodeURI(buildRepo())}/settings/secrets/actions`", '"https://github.com/firnlab/tools/settings/secrets/actions"')], "python3 test/e2e190_care.py test/fixtures/synthetic.json"),
    # 1.10 PT's hands (e2e1100_hands must turn red; the made-up bundle and its made-up desktop-app browser)
    ("PT's hands may click (the guard lets a click through)", [("v1100_hands.js", 'const HANDS_MOVES = ["scroll_to", "hover", "wait"];', 'const HANDS_MOVES = ["scroll_to", "hover", "wait", "left_click"];')], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("PT's hands go to any site", [("v1100_hands.js", 'return x.protocol === "https:" && x.hostname === "github.com";', 'return /^https?:$/.test(x.protocol);')], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("a key on the page is kept and shown", [("v1100_hands.js", '  if (HANDS_SECRET.test(txt)) throw {code: "hands_secret"};\n', "")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("PT reads GitHub once, before its list is there", [("v1100_hands.js", "const HANDS_READS = 4,", "const HANDS_READS = 1,")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("outside the desktop app PT shows only a generic error", [("v1100_hands.js", 'if (["server_not_connected", "capability_disabled", "not_granted", "capability_removed", "server_not_found"].includes(c)) return t("hands.e.app");', "")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("a closed tab ends the check instead of opening a new one", [("v1100_hands.js", "throw e; HANDS.tab = null; }", "throw e; throw e; }")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("a label is taken for the pull request's title", [("v1100_hands.js", "if (/\\s/.test(x)){ title = x; break; } if (!word) word = x;", "title = x; break;")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("a key date after 'Never used •' is not read", [("v1100_hands.js", "const m = /(?:^|[•·]\\s*)(Expires|Expired)", "const m = /^(Expires|Expired)")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("the key check stops at the header, before the list", [("v1100_hands.js", "const txt = await handsRead(/Expire|No expiration/i);", "const txt = await handsRead(/Expire|No expiration|Generate new token/i);")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
    ("another login may use the owner's browser", [("v1100_hands.js", '  if (!handsOk()) throw {code: "hands_owner"};\n', "")], "python3 test/e2e1100_hands.py test/fixtures/synthetic.json"),
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
    # 1.9.1 judge and lab (e2e191_judge must turn red; the made-up bundle)
    ("a private tool's independent check is on without a tap", [("v191_judge.js", 'return chkActive(p) && chkGateOn(p, "judge"); }', "return chkActive(p); }")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the judge gets the builder's report before it commits", [("v191_judge.js", "brief: P.coll + \"/\" + P.id, builderReport: docId}", "brief: P.coll + \"/\" + P.id, builderReport: docId, report: o.builder != null ? o.builder : (p.report && p.report.raw) || null}")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the judge's verdict word alone makes it green", [("v191_judge.js", 'const green = !!job && job.status === "done" && verdict === "pass" && lines.every(l => l.pass === true) && !dis.length && floors.every(f => f.state === "pass" || f.state === "none") && committed;', 'const green = !!job && job.status === "done" && verdict === "pass";')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("a line the judge could not verify counts as passed", [("v191_judge.js", '{id, pass: false, evidence: "", missing: true}', '{id, pass: true, evidence: "", missing: true}')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("a failed independent check does not block the release", [("v191_judge.js", "try{ const G = jdgGate(p); if (G && G.block) miss.push(G.key); }", "try{ }")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("no runner blocks the release instead of a plain line", [("v191_judge.js", 'if (!jdgCan()) return {block: false, st: "nobg"};', 'if (!jdgCan()) return {block: true, st: "nobg", key: "jdg.g.none"};')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the judge starts by itself with automatic work off", [("v191_judge.js", '  if (by === "pt" && !autoOK()) return null;\n', "")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("a preview copy starts the judge", [("v191_judge.js", "function jdgCan(){ return !PT_PREVIEW && Store.mode", "function jdgCan(){ return Store.mode"), ("v191_judge.js", "if (!p || PT_PREVIEW || !jdgCan() || !jdgOn(p)) return null;", "if (!p || !jdgCan() || !jdgOn(p)) return null;"),
        ("v191_judge.js", 'PREVIEW_BLOCKED.push("judge");', "")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the judge's block card can be taken by a ★ on its own", [("v191_judge.js", 'cls: "block", who: "you", hard: true, tier: "block", noAuto: true, title: t("jdg.q"', 'cls: "block", who: "you", hard: false, tier: "wait", title: t("jdg.q"')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("a kit run is green without the judge's pass", [("v191_judge.js", "if (!R || !x || x.state !== \"running\" || !p || !job || !jdgOn(p) || !fl19Verdict(job).green) return orig.apply(this, arguments);", "return orig.apply(this, arguments);")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the second-lab row is applied without a key", [("v191_lab.js", '    if (!lab2Set()) return {ok: false, why: t("lab2.off.nokey")};', ""), ("v191_lab.js", 'if (id === "lab2" && v === "apply" && !lab2Set()){ toast(t("lab2.cant"), "err"); return false; }', "")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("a restore breaks on a tool that never had a judge record", [("v191_judge.js", "{ const orig = keepRecords; keepRecords = function(from, into){ const r = orig.apply(this, arguments); if (from && Array.isArray(from.judges)) into.judges = clone(from.judges); return r; }; }", 'KEEP_FIELDS.push("judges");')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("Settings asks for the second-lab key itself", [("v191_lab.js", '<label class="fld" style="flex:1 1 14em"><span>${esc(t("lab2.set.prov"))}</span>${sel}</label>', '<label class="fld" style="flex:1 1 14em"><span>${esc(t("lab2.set.prov"))}</span>${sel}</label><input type="password" data-bind="ws:settings.lab2.value" aria-label="key">')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("PART R hands the second-lab key to the builder", [("v191_lab.js", "reaches only its review script, never you. Never call another lab, never look for, print, log or write the key.", "is in your environment: send the diff to the provider with it.")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the second-lab provider list offers a lab the workflow cannot call", [("v191_lab.js", 'const LAB2_PROVIDERS = [["openai", "OpenAI"], ["google", "Google"]];', 'const LAB2_PROVIDERS = [["openai", "OpenAI"], ["google", "Google"], ["mistral", "Mistral"]];')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the second-lab week forgets the Claude weeks", [("v191_lab.js", 'lab2Week(ms).w % 2 === 0 ? P[1] : t("lab2.claude")', "P[1]")], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    ("the GitHub build issue drops the acceptance lines from tool.json", [("v191_lab.js", 'write "acceptance" as every acceptance line of PART C', 'write what you like')], "python3 test/e2e191_judge.py test/fixtures/synthetic.json"),
    # 2.0 Part A, the foundation (e2e200_foundation must turn red; the made-up bundle)
    ('the rules channel is left out of project prompts', [('v200_facts.js', '    if (b) s = s.replace(/^(\\[\\[task:[^\\]\\n]*\\]\\]\\n)/, m => m + b);', '    if (false) s = s.replace(/^(\\[\\[task:[^\\]\\n]*\\]\\]\\n)/, m => m + b);')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('the rules are left out when the project is long (the budget decides again)', [('v200_facts.js', 'b = o && o.proj ? factsRulesBlock(o.proj) : "";', 'b = o && o.proj && str(o.context).length < 1000 ? factsRulesBlock(o.proj) : "";')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ("another project's rules reach this project's prompt", [('v200_facts.js', 'b = o && o.proj ? factsRulesBlock(o.proj) : "";', 'b = o && o.proj ? factsRulesBlock(curP() || o.proj) : "";')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('a sentence that keeps the rule reads as a break (no negation check)', [('v200_facts.js', '    const neg = FACT_NEG.test(s);', '    const neg = false;')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('a proposal that breaks a rule is not asked again', [('v200_facts.js', 'function factsGuardWords(hits){ return hits.map(', 'function factsGuardWords(hits){ return [].map(')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an option blocked by a rule can still be taken', [('v200_facts.js', '    if (c && arr(o.keys).some(k => (c.options.find(x => x.k === k) || {}).blocked)){ toast(t("facts.blocked.take"), "err"); return null; }\n', '')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ("PT's ★ points at an option blocked by a rule", [('v200_facts.js', '    if (c.rec >= 0 && c.options[c.rec] && c.options[c.rec].blocked){ c.rec = -1; c.recWhy = ""; }\n', '')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an answered question is asked again (ask once off)', [('v200_facts.js', '  if (best && best.s >= 0.8) return {st: "known", by: best.x};', '  if (false) return {st: "known", by: best.x};')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an unclear question is never checked against the facts', [('v200_facts.js', '  return (best && best.s >= 0.4) || kw ? {st: "check"} : {st: "new"};', '  return {st: "new"};')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('a contradiction between two entries is not shown', [('v200_facts.js', '  if (!list.length) return [];\n  snapshot(q, t("facts.act.conflict"));', '  if (list.length >= 0) return [];\n  snapshot(q, t("facts.act.conflict"));')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('the workspace profile goes into project prompts again', [('core.js', "  // an entry of it enters a project only as a visible copy in that project's facts book (v200_facts.js)\n", '  // an entry of it enters a project only as a visible copy in that project\'s facts book (v200_facts.js)\n  if (WS.profile && arr(WS.profile.entries).length) P.push(ctxPart("user_profile", "- " + WS.profile.entries.map(e => e.text).join("\\n- "), 3));\n')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('the cone stars your choice on another tool again', [('v180_cone.js', '<span class="cone-ol">${esc(', '<span class="cone-ol">${WS.projects.some(q => q !== p && q.cone && q.cone.ans && q.cone.ans[d]) ? "★ " : ""}${esc(')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an error is not kept', [('v200_events.js', '  EV20.pending.push(x); if (EV20.pending.length > EV20_MAX) EV20.pending.shift();', '  if (EV20.pending.length > EV20_MAX) EV20.pending.shift();')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ("an error card keeps the project's text", [('v200_events.js', 'function ev20Clean(s){ return str(s).replace(', 'function ev20Clean(s){ return str(s); return str(s).replace(')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('Report to Improve PT starts empty', [('v200_events.js', 'return m && m.pre ? h.replace(', 'return false ? h.replace(')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an example that asks passes the check', [('v200_facts.js', 'function exAsks(text){ const s = str(text); return !!s.trim() && EX_ASK.some(rx => rx.test(s)); }', 'function exAsks(text){ return false; }')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('no receipt after an answer', [('v200_events.js', 'function rcpt20(p, what, where){ if (!p || !str(what).trim()) return;', 'function rcpt20(p, what, where){ return;')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('the examples loop goes back to a judged example', [('v200_events.js', 'const j = list.findIndex(x => !x.verdict); if (j >= 0 && j !== i){ loopOf(p).i = j; render(); }', 'const j = -1;')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ("two Next bars on a page (the bar outside the page bar's nav)", [('v200_events.js', 'return /<\\/nav>\\s*$/.test(h) ? h.replace(/<\\/nav>\\s*$/, n + "</nav>") : h + n;', 'return h + n;')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('the action column gets a fixed share of the row again', [('styles.css', 'justify-content:flex-end;max-width:100%}', 'justify-content:flex-end;max-width:46%}')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    ('an old process word is back (Out of scope)', [('strings.js', '"req.oos":["Not in this version"', '"req.oos":["Out of scope"')], "python3 test/e2e200_foundation.py test/fixtures/synthetic.json"),
    # 2.0 Part C, two faces of one ledger and the move to 2.0 (e2e200_modes must turn red; the made-up bundle)
    ("the chat files nothing into the facts book", [("v200_modes.js", "    const e = factsAdd(p, {kind: oneOf(str(f.kind), FACT_KINDS, \"fact\"), words: said,", "    const e = null && factsAdd(p, {kind: oneOf(str(f.kind), FACT_KINDS, \"fact\"), words: said,")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("the chat files feedback about PT into the project", [("v200_modes.js", 'const list = about === "pt" ? [] : [...arr(r && r.file), ...c20CodeFile(s)];', 'const list = [...arr(r && r.file), ...c20CodeFile(s)];')], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("a never is lost when the chat call fails (no filing by code)", [("v200_modes.js", "  if (C20_PT.test(text)) return [];\n", "  return [];\n")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("a chat answer that breaks your rule is shown", [("v200_modes.js", "function c20Guard(p, text){\n", "function c20Guard(p, text){ return {text, cut: null};\n")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("the chat asks details before the decision (no route-splitting rule)", [("v200_modes.js", "const stage = stage20Early(p) ? ST20_SPLIT : stage20RouteBlock(p);", "const stage = stage20RouteBlock(p);")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("a question in the chat is asked again (no ask once)", [("v200_modes.js", "  if (card) askOnceRun(p,", "  if (false) askOnceRun(p,")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("Pick's Decisions page and the chat's Decided tab differ", [("v200_modes.js", "return h.replace('</header>', '</header>' + d); }; }", "return h; }; }")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C2"),
    ("an answer after the decision is not watched by the Route alert", [("v200_modes.js", "try{ if (e && p && m20Chosen(p) && str(e.answer).trim()", "try{ if (false && e && p && m20Chosen(p) && str(e.answer).trim()")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C3"),
    ("the old modes are back", [("items.js", "const MODES = [];", "const MODES = [\"steps\"];")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C1"),
    ("the move makes no restore point first", [("v200_modes.js", "const rp = had || addRestore(p, {kind: \"migrate\"", "const rp = had || null && addRestore(p, {kind: \"migrate\"")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C4"),
    ("the move twice adds the rules twice (not idempotent)", [("v200_modes.js", "  for (const o of out){ if (m200Has(p, o.src.ref) || factsActive(p).some(e => askSim(factText(e), o.short || o.words) >= 0.8)) continue;", "  for (const o of out){"), ("v200_modes.js", '    if (M.routes.some(r => r.from === "arch:" + o.id)) continue;\n', "")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C4"),
    ("the move brings another project's rules", [("v200_modes.js", "  const ns = p.northStar || {}, out = [], lbl = t(\"c20.mig.label\");", "  const ns = (WS.projects.find(q => q !== p && q.northStar && str(q.northStar.constraints).trim()) || p).northStar || {}, out = [], lbl = t(\"c20.mig.label\");")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C4"),
    ("the move changes a field the project had", [("v200_modes.js", '  step("goal", () => { goal20Of(p); });', '  step("goal", () => { goal20Of(p); p.outOfScope = []; });')], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C4"),
    ("a confirmed 1.x choice is not the chosen route after the move", [("v200_modes.js", "  const ch = a.chosen && !a.chosenAssumed ? M.routes.find(r => r.from === \"arch:\" + a.chosen) : null;", "  const ch = null;")], "python3 test/e2e200_modes.py test/fixtures/synthetic.json --only C4"),
    # 2.0 Part B, the solution map and the new order (e2e200_map must turn red; the made-up bundle)
    ("a route that breaks your never is not greyed", [("v200_map.js", 'function m20Status(p, r){ return m20Breaks(p, r).length ? "blocked" :', 'function m20Status(p, r){ return false ? "blocked" :')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the map shows rule-breaking routes by default (filter off)", [("v200_map.js", "f: {rules: true, today: false, free: false}, sort", "f: {rules: false, today: false, free: false}, sort")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the lens calls run all at once", [("v200_map.js", "    res = await m20Pool(jobs, 2);", "    res = await m20Pool(jobs, 6);")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a multi-call search starts without naming its cost", [("v200_map.js", 'data-a="m20-ask" data-v="${what}"', 'data-a="m20-go" data-v="${what}"')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("one call for every angle (no lenses)", [("v200_map.js", "  const L = lenses || (kind === \"full\" || !M0.rounds.length ? M20_LENSES :", "  const L = lenses || (kind === \"full\" || !M0.rounds.length ? [\"buy\"] :")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a lens no longer asks for unusual answers", [("v200_map.js", "and make at least two of them unusual (typical below 0.2): the answers a quick list would miss.", "and list the usual ones.")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a route found twice is added twice (no merge)", [("v200_map.js", "    if (best && best.s >= 0.8){", "    if (false){")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a red-team break is not recorded as a correction", [("v200_map.js", "    for (const b of arr(redR.breaks)){", "    for (const b of []){")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the map claims saturation after one quiet round", [("v200_map.js", "sat: !!(last && prev && last.newN === 0 && prev.newN === 0 &&", "sat: !!(last && last.newN === 0 &&")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a goal change applies before its effect on the map is shown", [("v200_map.js", '  if (!M.routes.length){ snapshot(p, t("g20.act")); goal20Apply(p, f);', '  if (true){ snapshot(p, t("g20.act")); goal20Apply(p, f);')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("Take this without a restore point", [("v200_map.js", '  addRestore(p, {kind: "auto", label: t("m20.rp", {x: r.name})});\n', '')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the route decision is not in the facts book", [("v200_map.js", '  const e = factsAdd(p, {kind: "decision", words: t("m20.dec.fact"', '  const e = null && factsAdd(p, {kind: "decision", words: t("m20.dec.fact"')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("detail questions are asked before the route is chosen", [("v200_stage.js", "    if (!stage20Early(p)) return q;", "    return q;")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the pick prompt asks details before the decision (no route-splitting rule)", [("v200_stage.js", "try{ const add = stage20Early(o.proj) ?", "try{ const add = false ?")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("an older project is moved to the new order without the migration", [("v200_stage.js", "if (p && !had) p.order20 = false;", "")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a new fact that breaks the chosen route raises no alert", [("v200_map.js", "    try{ if (e && p && m20Read(p).routes.length && !(e.src", "    try{ if (false && e && p && m20Read(p).routes.length && !(e.src")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("every detail counts as route-bound (nothing carries over)", [("v200_map.js", "M.chosen = id; M.neutral = m20Refs(p);", "M.chosen = id; M.neutral = [];")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a proven route carries its project's rule words into the library", [("v200_map.js", '  if (P.entries.some(e => factKwHits(e, x) >= 1)) return "";\n', '')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("a route enters the library before its project launched", [("v200_map.js", "if (!r || !p.live || !WS.settings) return null;", "if (!r || !WS.settings) return null;")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("PT's ★ shows before you looked", [("v200_map.js", "const M = m20Read(p); if (!M.looked) return null;", "const M = m20Read(p);")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the shortlist takes more than 3", [("v200_map.js", "  if (M.short.length >= 3){", "  if (M.short.length >= 9){")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the comparison marks the best only by colour", [("v200_map.js", '${isB ? ` <b class="m20-best">(', '${false ? ` <b class="m20-best">(')], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the comparison shows rows that are the same for all", [("v200_map.js", "if (eq) same++; if (eq && !U.more.same) return \"\";", "if (eq) same++;")], "python3 test/e2e200_map.py test/fixtures/synthetic.json"),
    ("the checks ★ carries your choice on another tool again (e2e200_map's owner rule, tested in e2e180_checks)", [("v180_checks.js", "function chkStar(p, x){ const pt = chkPtStar(p, x); return {v: pt.v, why: pt.why, last: false, pt}; }",
        "function chkStar(p, x){ const pt = chkPtStar(p, x), q = arr(WS.projects).filter(y => y.id !== p.id).map(y => arr(y.checks && y.checks.rows).find(r => r && r.id === x.id && (r.v === 'apply' || r.v === 'skip'))).filter(Boolean)[0]; return q ? {v: q.v, why: t('chk.star.last', {x: '?'}), last: true, pt} : {v: pt.v, why: pt.why, last: false, pt}; }")], "python3 test/e2e180_checks.py test/fixtures/synthetic.json"),
    # 1.9.2 pseudo-localisation: a text that bypasses the strings, a long label that pushes a phone screen sideways
    ("a button label is written in English in the code", [("views_pages.js", '${esc(t("notes.add"))}</button></form>', 'Add note</button></form>')], "python3 test/pseudo19.py test/fixtures/synthetic.json"),
    ("the Build page shows the vault lines in English only", [("v170_vault.js", '${esc(STR["vault.use." + x.id] ? t("vault.use." + x.id) : x.use)}', '${esc(x.use)}')], "python3 test/pseudo19.py test/fixtures/synthetic.json"),
    ("the notes page keeps its fixed filter column on a phone", [("views_pages.js", '<div class="grid2 side220">', '<div class="grid2" style="grid-template-columns:220px minmax(0,1fr)">')], "python3 test/pseudo19.py test/fixtures/synthetic.json"),
    ("a row of buttons in a top bar is as wide as its longest label", [("styles18.css", ":is(.row,.topbar,.panel-h,.head,.controw,.fullstep)>:is(.row,.controw){min-width:0;max-width:100%}", "")], "python3 test/pseudo19.py test/fixtures/synthetic.json"),
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
