/* =====================================================================
   1.2 FRONTIER & RIGHT-SIZING ENGINE
   One rule: choose the lowest rung, model and platform that clears every
   gate and meets the quality bar on real examples; climb only with a
   recorded reason; always show the ceiling.
   Every setting is "PT recommends (Auto), you can override" — like the
   automatic model choice.
   ===================================================================== */

/* ---------- knowledge pack: built-in seed + the pack the owner approved ---------- */
const KP_MODELS_BUILTIN = [
  {id:"claude-fable-5-1", label:"Claude Fable 5.1", short:"Fable 5.1", tier:"top", status:"active", notes:"Top tier for demanding reasoning and long-horizon agentic work; use when Opus 5.5 at higher effort still fails your tests.", src:"https://platform.claude.com/docs/en/models/overview", verified:"2026-10-19"},
  {id:"claude-opus-5-5", label:"Claude Opus 5.5", short:"Opus 5.5", tier:"complex", status:"active", released:"2026-09-22", retires:"2027-09-22", notes:"Recommended start for most work.", src:"https://platform.claude.com/docs/en/models/overview", verified:"2026-10-19"},
  {id:"claude-sonnet-5-5", label:"Claude Sonnet 5.5", short:"Sonnet 5.5", tier:"default", status:"active", released:"2026-09-28", retires:"2027-09-28", notes:"Balanced; replaces Sonnet 4.5.", src:"https://platform.claude.com/docs/en/models/overview", verified:"2026-10-19"},
  {id:"claude-haiku-5-5", label:"Claude Haiku 5.5", short:"Haiku 5.5", tier:"quick", status:"active", released:"2026-10-07", retires:"2027-10-07", notes:"Fastest and cheapest.", src:"https://platform.claude.com/docs/en/models/overview", verified:"2026-10-19"},
  {id:"claude-opus-5", label:"Claude Opus 5", short:"Opus 5", tier:"complex", status:"active", earliest:"2027-07-24", notes:"Older; Opus 5.5 does the same at lower cost.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-fable-5", label:"Claude Fable 5", short:"Fable 5", tier:"top", status:"active", earliest:"2027-06-09", notes:"Older; Fable 5.1 replaces it.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-sonnet-5", label:"Claude Sonnet 5", short:"Sonnet 5", tier:"default", status:"active", earliest:"2027-06-30", notes:"Older; Sonnet 5.5 replaces it.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-opus-4-8", label:"Claude Opus 4.8", short:"Opus 4.8", tier:"complex", status:"active", earliest:"2027-05-28", notes:"Older generation (temperature and forced tool use still work).", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-opus-4-7", label:"Claude Opus 4.7", short:"Opus 4.7", tier:"complex", status:"active", earliest:"2027-04-16", notes:"Older generation.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-opus-4-6", label:"Claude Opus 4.6", short:"Opus 4.6", tier:"complex", status:"active", earliest:"2027-02-05", notes:"Older generation.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-sonnet-4-6", label:"Claude Sonnet 4.6", short:"Sonnet 4.6", tier:"default", status:"active", earliest:"2027-02-17", notes:"Older generation.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-opus-4-5-20251101", label:"Claude Opus 4.5", short:"Opus 4.5", tier:"complex", status:"active", earliest:"2026-11-24", notes:"Active; may be retired from 24 Nov 2026 on (no date set yet). Move to Opus 5.5.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-haiku-4-5-20251001", label:"Claude Haiku 4.5", short:"Haiku 4.5", tier:"quick", status:"active", earliest:"2026-10-15", notes:"Active; may be retired any time now (earliest date passed). Move to Haiku 5.5.", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"},
  {id:"claude-sonnet-4-5-20250929", label:"Claude Sonnet 4.5", short:"Sonnet 4.5", tier:"default", status:"retiring", retires:"2026-11-30", replacement:"claude-sonnet-5-5", src:"https://platform.claude.com/docs/en/about-claude/model-deprecations", verified:"2026-10-23"}
];
const KP_TIER_BUILTIN = {complex:"Opus 5.5", default:"Sonnet 5.5", quick:"Haiku 5.5"};
const KP = {v: 0, at: KP_VERSION, by: "", source: "builtin", rules: KP_RULES, models: KP_MODELS_BUILTIN, platform: PLATFORM_PROFILE, facts: [], tierModel: KP_TIER_BUILTIN, log: [], proposals: [], loaded: false};
const KP_STALE_DAYS = 90;
function kpRules(){ return KP.rules; }
function kpModels(){ return KP.models; }
function tierModel(tier){ return (KP.tierModel || {})[tier] || ""; }
function kpStamp(){ return KP.source === "pack" ? str(KP.at).slice(0, 10) : KP_VERSION; }
function kpLabel(){ return KP.source === "pack" ? t("kp.packv", {v: KP.v, d: fmtDay(KP.at)}) : t("kp.builtin", {d: KP_VERSION}); }
function daysSince(d){ const x = new Date(d).getTime(); return isNaN(x) ? 9999 : Math.floor((Date.now() - x) / 864e5); }
function kpStale(item){ if (!item) return false; if (item.recheck) return new Date(item.recheck).getTime() < Date.now(); return !!item.verified && daysSince(item.verified) > KP_STALE_DAYS; }
function kpStaleItems(){ return [...KP.rules, ...KP.models, ...KP.facts].filter(kpStale); }
async function loadKP(){
  try{
    const pack = await Store.get("kp/pack");
    if (pack && pack.v){
      const byId = new Map(KP_RULES.map(r => [r.id, r]));
      for (const r of arr(pack.rules)) byId.set(r.id, Object.assign({}, byId.get(r.id) || {}, r));
      for (const id of arr(pack.retiredRules)) byId.delete(id);
      // 1.5.0: a built-in fact checked after the pack was approved wins (a model or the platform verified later is newer knowledge)
      const packDay = str(pack.at).slice(0, 10), mById = new Map(arr(pack.models).map(m => [m.id, m]));
      for (const m of KP_MODELS_BUILTIN){ const x = mById.get(m.id); if (!x || str(m.verified) > str(x.verified)) mById.set(m.id, m); }
      Object.assign(KP, {v: pack.v, at: pack.at, by: pack.by || "", source: "pack", rules: [...byId.values()], models: arr(pack.models).length ? [...mById.values()] : KP_MODELS_BUILTIN, platform: pack.platform && packDay >= KP_VERSION ? pack.platform : PLATFORM_PROFILE, facts: arr(pack.facts), tierModel: Object.assign({}, KP_TIER_BUILTIN, pack.tierModel || {}), log: arr(pack.log)});
    }
  }catch(e){ console.warn("kp", e); }
  if (Store.isOwner){ try{ KP.proposals = (await Store.list("kpprop")).sort((a, b) => str(b.at).localeCompare(str(a.at))); }catch(e){ KP.proposals = []; } }
  KP.loaded = true;
}
/** the pack as stored: only what differs from the built-in seed is needed, but the whole lists are kept for clarity */
function kpPackDoc(){
  return {v: KP.v, at: KP.at, by: KP.by, rules: KP.rules.filter(r => { const b = KP_RULES.find(x => x.id === r.id); return !b || JSON.stringify(b) !== JSON.stringify(r); }), retiredRules: KP_RULES.filter(b => !KP.rules.some(r => r.id === b.id)).map(b => b.id), models: KP.models, platform: KP.platform, facts: KP.facts, tierModel: KP.tierModel, log: KP.log.slice(-60)};
}
/** apply one approved proposal item to the live pack (owner only) */
function kpApply(item){
  const a = item.after || {};
  if (item.kind === "rule"){
    if (item.op === "retire") KP.rules = KP.rules.filter(r => r.id !== item.target);
    else { const i = KP.rules.findIndex(r => r.id === (a.id || item.target)); const rec = Object.assign({}, i >= 0 ? KP.rules[i] : {cat: "prompt"}, a, {verified: a.verified || today(), src: a.src || item.src}); if (i >= 0) KP.rules[i] = rec; else KP.rules = [...KP.rules, rec]; }
  } else if (item.kind === "model"){
    if (item.op === "retire") KP.models = KP.models.map(m => m.id === item.target ? Object.assign({}, m, {status: "retired"}) : m);
    else { const i = KP.models.findIndex(m => m.id === (a.id || item.target)); const rec = Object.assign({}, i >= 0 ? KP.models[i] : {}, a, {verified: a.verified || today(), src: a.src || item.src}); if (i >= 0) KP.models = KP.models.map((m, j) => j === i ? rec : m); else KP.models = [...KP.models, rec]; }
    if (a.tier && a.short && a.status === "active" && item.op !== "retire" && a.tierDefault) KP.tierModel = Object.assign({}, KP.tierModel, {[a.tier]: a.short});
  } else if (item.kind === "platform"){ if (a.text) KP.platform = str(a.text); }
  else { // fact or law snapshot
    const i = KP.facts.findIndex(f => f.id === (a.id || item.target));
    if (item.op === "retire") KP.facts = KP.facts.filter(f => f.id !== item.target);
    else { const rec = Object.assign({}, i >= 0 ? KP.facts[i] : {}, a, {kind: item.kind, verified: a.verified || today(), src: a.src || item.src}); if (i >= 0) KP.facts = KP.facts.map((f, j) => j === i ? rec : f); else KP.facts = [...KP.facts, rec]; }
  }
}
function today(){ return new Date().toISOString().slice(0, 10); }
/** decide a proposal item; approved items go into a new pack version (owner only) */
async function kpDecide(propId, itemIdx, decision){
  if (!Store.isOwner){ toast(t("kp.owneronly"), "err"); return; }
  const pr = KP.proposals.find(x => x.id === propId); if (!pr) return;
  const items = itemIdx === "all" ? arr(pr.items).filter(x => !x.status || x.status === "open") : [arr(pr.items)[num(itemIdx, -1)]].filter(Boolean);
  if (!items.length) return;
  let applied = 0;
  for (const it of items){ it.status = decision; it.decidedAt = now(); if (decision === "approved"){ kpApply(it); applied++; } }
  if (applied){
    KP.v = (KP.v || 0) + 1; KP.at = now(); KP.by = wsLabel(WS.name); KP.source = "pack";
    KP.log = [...arr(KP.log), {at: now(), v: KP.v, items: items.filter(i => i.status === "approved").map(i => i.op + " " + i.kind + " " + (i.target || (i.after || {}).id || ""))}];
    try{ await Store.putNow("kp/pack", kpPackDoc()); }catch(e){ toast(t("err.save"), "err"); return; }
  }
  // an approved model change asks every live tool for a re-check (mini-test / health check) in its inbox
  if (items.some(i => i.status === "approved" && i.kind === "model")) for (const lp of WS.projects.filter(x => !x.deletedAt && x.live)){ lp.inbox = arr(lp.inbox); lp.inbox.push({id: uid("ib"), key: "kp-" + pr.id, src: "auto", title: t("kp.recheck.t"), body: t("kp.recheck", {x: items.filter(i => i.kind === "model").map(i => i.target).join(", ")}), at: now(), on: true, k: "fix"}); touch(lp); }
  pr.status = arr(pr.items).every(x => x.status && x.status !== "open") ? "done" : "open";
  try{ await Store.putNow("kpprop/" + pr.id, pr); }catch(e){}
  toast(applied ? t("kp.applied", {n: applied, v: KP.v}) : t("kp.rejected"), "ok"); render();
}
/** models a project or a live tool depends on that retire within the warning window */
function retiringModels(days = 60){ return KP.models.filter(m => m.retires && m.status !== "retired" && (new Date(m.retires).getTime() - Date.now()) / 864e5 <= days && (new Date(m.retires).getTime() > Date.now() - 864e5)); }
function projUsesModel(p, m){ const s = (str(p.targetModel) + " " + str(p.pkg && p.pkg.targetModel) + " " + JSON.stringify(arr(p.arch && p.arch.components).map(c => c.model))).toLowerCase(); return s.includes(m.id.toLowerCase()) || s.includes(str(m.short).toLowerCase()); }

/* ---------- engine model per project ---------- */
const RUNGS = ["R0","R1","R2","R3","R4","R5"];
const RUNG_MULT = {R0: 0, R1: 0, R2: 1, R3: 1.5, R4: 4, R5: 15};   // token multipliers (Anthropic, Jun 2025: agent ≈4x, multi-agent ≈15x a chat)
const AUTONOMY = ["L1","L2","L3","L4","L5"];
const PLATFORMS = ["claude","code","managed"];
const TRACKS = ["quick","standard","full"];
const SETTINGS_LADDER = [
  {id:"haiku-medium", model:"claude-haiku-5-5", short:"Haiku 5.5", effort:"medium", tier:"quick"},
  {id:"sonnet-medium", model:"claude-sonnet-5-5", short:"Sonnet 5.5", effort:"medium", tier:"default"},
  {id:"sonnet-high", model:"claude-sonnet-5-5", short:"Sonnet 5.5", effort:"high", tier:"default"},
  {id:"opus-medium", model:"claude-opus-5-5", short:"Opus 5.5", effort:"medium", tier:"complex"},   // Opus 5.5's default (medium on 5.5 matches high on Opus 5)
  {id:"opus-high", model:"claude-opus-5-5", short:"Opus 5.5", effort:"high", tier:"complex"},
  {id:"opus-xhigh", model:"claude-opus-5-5", short:"Opus 5.5", effort:"xhigh", tier:"complex"},
  {id:"fable-high", model:"claude-fable-5-1", short:"Fable 5.1", effort:"high", tier:"complex"}
];
const GATES = [
  {id:"G1", key:"existing", must: true},
  {id:"G2", key:"value", must: true},
  {id:"G3", key:"exact", must: true},
  {id:"G4", key:"shape", must: true},
  {id:"G5", key:"maintain", must: false},
  {id:"G6", key:"redline", must: false},
  {id:"G7", key:"trifecta", must: false}
];
const SCORE_DIMS = ["path","input","rules","breadth","value","errorcost","capacity"];
function blankEngine(){
  return {v: 1, track: {auto: "standard", val: null}, scan: {state: "none", job: null, at: null, result: null},
    gates: {}, score: {auto: {}, val: {}}, dials: {rung: {auto: "R2", val: null}, setting: {auto: "sonnet-high", val: null}, platform: {auto: "claude", val: null}, autonomy: {auto: "L3", val: null}},
    trial: {on: null, cases: [], runs: [], at: null}, mini: {on: null, results: [], at: null}, climb: [], ceiling: null, suggestAt: null};
}
/** the tool's model has one source: the Model · effort dial (Build shows the same control) */
function syncTarget(p){ const s = settingById(dial(p, "setting")); p.targetModel = s.model; p.targetEffort = s.effort; }
function settingFromModel(id){ const m = str(id).toLowerCase(); return /fable|mythos/.test(m) ? "fable-high" : /opus-5-5|opus 5\.5/.test(m) ? "opus-medium" : /opus/.test(m) ? "opus-high" : /haiku/.test(m) ? "haiku-medium" : /sonnet/.test(m) ? "sonnet-high" : "opus-high"; }
function eng(p){ if (!p.engine || typeof p.engine !== "object"){ p.engine = blankEngine(); if (p.targetModel) p.engine.dials.setting.auto = settingFromModel(p.targetModel); } const b = blankEngine(); for (const k in b) if (p.engine[k] === undefined) p.engine[k] = b[k]; for (const k in b.dials) if (!p.engine.dials[k]) p.engine.dials[k] = b.dials[k]; return p.engine; }
/** the value in force: your choice if you made one, otherwise PT's recommendation */
function dial(p, k){ const d = eng(p).dials[k]; return d.val != null ? d.val : d.auto; }
function track(p){ const e = eng(p); return e.track.val || e.track.auto; }
function settingById(id){ return SETTINGS_LADDER.find(s => s.id === id) || SETTINGS_LADDER[2]; }
function nextSetting(id){ const i = SETTINGS_LADDER.findIndex(s => s.id === id); return SETTINGS_LADDER[Math.min(SETTINGS_LADDER.length - 1, i + 1)]; }
function scoreVal(p, d){ const s = eng(p).score; return s.val[d] != null ? s.val[d] : s.auto[d]; }

/** the right-sizing score suggests the starting rung; error cost lowers autonomy; capacity caps the rung */
/** does the tool run on its own (scheduled / unattended)? One check for rung floor, trial run and track.
    Looks at the design first, then what the person said and what the scan found (an imported existing tool has no design yet). */
const SCHED_RX = /schedul|\bcron\b|weekly|daily|hourly|every (?:mon|tue|wed|thu|fri|sat|sun|week|day|morning|night|hour)|unattended|wöchentl|täglich|stündl|jeden (?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|tag|morgen)|geplante aufgabe|定时|每周|每天|每日|每小时/i;
function runsOnItsOwn(p){
  const comps = arr(p.arch && p.arch.components).map(c => str(c.name) + " " + str(c.role)).join(" ");
  const home = str(p.tool && p.tool.home && p.tool.home.where) + " " + str(p.arch && p.arch.home && p.arch.home.where);
  if (arr(p.pkg && p.pkg.sections).some(s => s.dest === "scheduled")) return true;
  const r = eng(p).scan.result || {};
  const said = str(p.intake && p.intake.raw).slice(0, 6000) + " " + str(r.restated) + " " + arr(r.capability).map(c => str(c.feature) + " " + str(c.need)).join(" ");
  return SCHED_RX.test(comps + " " + home) || SCHED_RX.test(said);
}
function rungFromScore(p){
  const v = d => num(scoreVal(p, d), 1);
  if (SCORE_DIMS.every(d => scoreVal(p, d) == null)) return null;
  let r = 2;
  if (v("input") === 0 && v("rules") <= 1 && v("path") === 0) r = 1;      // clean inputs, few rules, known steps: deterministic
  if (v("rules") === 2 || v("value") === 2) r = Math.max(r, 3);           // many changing rules or high frequent value: workflow / scheduled
  if (v("path") === 2) r = Math.max(r, 4);                                  // steps cannot be known in advance: an agent
  if (v("breadth") === 2 && v("path") >= 1 && !gateOn(p, "G4")) r = Math.max(r, 5); // many independent searches, not sequential
  if (v("capacity") === 0) r = Math.min(r, 3);                              // little capacity to maintain: cap
  if (v("value") === 0) r = Math.min(r, 2);
  return "R" + r;
}
function autonomyCap(p){ const e = num(scoreVal(p, "errorcost"), 1); return e === 2 ? "L2" : e === 1 ? "L3" : "L4"; }
function gate(p, id){ return eng(p).gates[id] || {}; }
/** a gate "fires" when its answer says the cheaper / safer path applies */
function gateOn(p, id){
  const a = gate(p, id).ans; if (!a) return false;
  return {G1: a === "yes", G2: a === "no", G3: a === "yes", G4: a === "yes", G5: a === "no", G6: a === "yes", G7: a === "yes"}[id];
}
function gateOverridden(p, id){ return !!(gate(p, id).override && gate(p, id).override.reason); }
/** what each fired gate does to the design */
function gateEffect(p){
  const fx = {maxRung: 5, minRung: 0, stop: false, notes: []};
  if (gateOn(p, "G1") && !gateOverridden(p, "G1")){ fx.maxRung = Math.min(fx.maxRung, 0); fx.notes.push("G1"); }
  if (gateOn(p, "G2") && !gateOverridden(p, "G2")){ fx.maxRung = Math.min(fx.maxRung, 0); fx.notes.push("G2"); }
  if (gateOn(p, "G3") && !gateOverridden(p, "G3")){ fx.notes.push("G3"); }   // deterministic core: R1 for the exact part, AI only at the edges
  if (gateOn(p, "G4")){ fx.maxRung = Math.min(fx.maxRung, 4); fx.notes.push("G4"); }
  if (gateOn(p, "G5") && !gateOverridden(p, "G5")){ fx.maxRung = Math.min(fx.maxRung, 3); fx.notes.push("G5"); }
  if (gateOn(p, "G6") && !gateOverridden(p, "G6")){ fx.stop = true; fx.notes.push("G6"); }
  if (gateOn(p, "G7")){ fx.notes.push("G7"); }
  return fx;
}
/** recompute every Auto value from the evidence (never touches your own choices) */
function engineRecompute(p){
  const e = eng(p), fx = gateEffect(p);
  // the designed option (which saw all evidence) comes first, then the score, then the scan's first guess
  let r = e.archRung || rungFromScore(p) || (e.scan.result && e.scan.result.rung) || e.dials.rung.auto || "R2";
  let n = num(String(r).slice(1), 2);
  // evidence beats estimates: when the plain prompt already passes the trial, PT recommends staying low (moving down counts as success)
  const tr = trialSummary(p);
  const own = runsOnItsOwn(p);
  if (tr && tr.rate >= 90) n = Math.min(n, own ? 3 : 2);
  // a tool that runs on its own is R3 by definition (fixed workflow or scheduled task); only a fired gate (e.g. G1 existing product) goes lower
  if (own) n = Math.max(n, 3);
  n = Math.min(n, fx.maxRung); n = Math.max(n, fx.minRung);
  e.dials.rung.auto = "R" + n;
  const scanSet = e.scan.result && e.scan.result.setting;
  e.dials.setting.auto = SETTINGS_LADDER.some(s => s.id === scanSet) ? scanSet : n >= 4 ? "opus-high" : n === 3 ? "sonnet-high" : n <= 1 ? "haiku-medium" : "sonnet-medium";
  e.dials.platform.auto = "claude";   // code route and Managed Agents stay off until the code route ships (D6)
  const cap = autonomyCap(p);
  e.dials.autonomy.auto = AUTONOMY.indexOf(cap) < AUTONOMY.indexOf("L3") ? cap : "L3";   // D3: act, you approve key steps
  // track: quick for small low-risk work, full for agents, scheduled or risky tools
  const risky = num(scoreVal(p, "errorcost"), 1) === 2 || gateOn(p, "G7") || gateOn(p, "G6");
  e.track.auto = n <= 2 && !risky && !own ? "quick" : n >= 4 || risky || own ? "full" : "standard";
  syncTarget(p);
}
/** the trial run is recommended for anything that runs on its own or uses tools */
function trialRecommended(p){
  const n = num(String(dial(p, "rung")).slice(1), 2);
  return n >= 3 || runsOnItsOwn(p) || track(p) === "full";
}
function trialOn(p){ const tr = eng(p).trial; return tr.on != null ? tr.on : trialRecommended(p) && track(p) !== "quick"; }
function miniOn(p){ const m = eng(p).mini; return m.on != null ? m.on : track(p) !== "quick"; }
function trialSummary(p){
  const tr = eng(p).trial; const rs = arr(tr.runs); if (!rs.length || !tr.v14) return null;   // runs from before 1.4 measured the wrong thing: not used
  const pass = rs.filter(r => r.pass).length;
  return {n: rs.length, pass, rate: Math.round(pass / rs.length * 100), fails: rs.filter(r => !r.pass)};
}
/** pass^3: share of cases that pass in all tries; usage per success uses the tier weight as a proxy (no token counts in claude.ai) */
function miniSummary(res){
  const cases = [...new Set(arr(res.runs).map(r => r.caseId))];
  const all = cases.filter(id => arr(res.runs).filter(r => r.caseId === id).every(r => r.pass));
  const flips = cases.filter(id => { const rs = arr(res.runs).filter(r => r.caseId === id); return rs.some(r => r.pass) && rs.some(r => !r.pass); });
  const succ = arr(res.runs).filter(r => r.pass).length;
  const w = (TIER_WEIGHT[settingById(res.setting).tier] || 3) * ({medium: 1, high: 1.4, xhigh: 1.9, max: 2.5}[settingById(res.setting).effort] || 1);
  const usage = arr(res.runs).length * w;
  return {passK: cases.length ? Math.round(all.length / cases.length * 100) : 0, flip: cases.length ? Math.round(flips.length / cases.length * 100) : 0, perSuccess: succ ? Math.round(usage / succ * 10) / 10 : null, n: cases.length, tries: arr(res.runs).length};
}
const QUALITY_BAR = 80;   // pass^3 target in %
/** the ceiling card: recommended vs the top option today, with evidence and the climb trigger */
function ceilingCard(p){
  const e = eng(p), rec = {rung: dial(p, "rung"), setting: settingById(dial(p, "setting")), platform: dial(p, "platform"), autonomy: dial(p, "autonomy")};
  const top = {rung: gateOn(p, "G4") ? "R4" : "R5", setting: SETTINGS_LADDER[SETTINGS_LADDER.length - 1], platform: "managed", autonomy: "L4"};
  const m = arr(e.mini.results).filter(r => r.v14).map(r => Object.assign({setting: r.setting}, miniSummary(r)));
  const recM = m.find(x => x.setting === rec.setting.id), upM = m.find(x => x.setting !== rec.setting.id);
  const scan = e.scan.result || {};
  const recN = num(rec.rung.slice(1), 2);
  const why = scan.whyNotCeiling || (recN <= 2 ? t("ceil.why.simple") : recM && recM.passK >= QUALITY_BAR ? t("ceil.why.enough", {n: recM.passK}) : t("ceil.why.default"));
  const climb = scan.climbWhen || t("ceil.climb.default", {n: QUALITY_BAR});
  return {rec, top, recM, upM, why, climb, mult: RUNG_MULT[rec.rung], topMult: RUNG_MULT[top.rung], at: now()};
}
/** the climb log: every move up needs a reason; moving down counts as success */
function logClimb(p, what, from, to, reason){ eng(p).climb.push({at: now(), what, from, to, reason: str(reason)}); }

/** what the engine knows, for the architecture, compile and brief prompts */
function engineBrief(p){
  const e = eng(p), r = e.scan.result, fx = gateEffect(p), tr = trialSummary(p), s = settingById(dial(p, "setting"));
  const L0 = [];
  if (r) L0.push(`Frontier scan (${fmtDay(e.scan.at)}${r.local ? ", without live web search" : ""}): verdict ${r.verdict} — ${r.verdictWhy}. Existing: ${r.existing.slice(0, 5).map(x => x.name + " (fit " + x.fit + ")").join("; ") || "none found"}. Ceiling today: ${r.ceiling}.`);
  L0.push("Gates: " + GATES.map(g => g.id + "=" + (gate(p, g.id).ans || "open") + (gateOverridden(p, g.id) ? " (overridden: " + gate(p, g.id).override.reason + ")" : "")).join(", ") + ".");
  if (fx.notes.length) L0.push("Gate effects: " + fx.notes.map(n => ({G1: "an existing product fits: recommend adopting it, build only with the recorded reason", G2: "value not proven: stay at R0 (prompt or checklist)", G3: "exact output: deterministic core, AI only at the edges", G4: "sequential task: no multi-agent design", G5: "limited maintenance capacity: at most R3", G6: "red-line domain: stop and get advice", G7: "lethal trifecta: remove one leg or add a human approval"})[n]).join("; ") + ".");
  L0.push(`Recommended dials: design ${dial(p, "rung")} (max allowed R${fx.maxRung}), model ${s.short} · effort ${s.effort}, platform ${dial(p, "platform")}, autonomy ${dial(p, "autonomy")}. Track ${track(p)}.`);
  if (tr) L0.push(`Trial run with a plain prompt: ${tr.pass}/${tr.n} cases passed. Failures: ${tr.fails.slice(0, 5).map(f => f.caseId + " " + f.why).join("; ") || "none"}.`);
  return L0.join("\n");
}
/** PART E of the build brief: the agreed level, so the build chat neither over- nor under-builds */
function engineBriefPart(p){
  const c = ceilingCard(p), s = settingById(dial(p, "setting"));
  return [`Design rung: ${dial(p, "rung")} (R0 no new tool, R1 deterministic, R2 prompt/Project/skill, R3 fixed workflow or scheduled task, R4 one agent with tools, R5 several agents with one writer). Do not add parts above this rung.`,
    `Model for the tool's AI parts: ${s.short}, effort ${s.effort}, where the platform lets you choose. Claude 5 models: no prefill, no thinking budgets, no temperature settings.`,
    `Autonomy: ${dial(p, "autonomy")}. Anything outward-facing, irreversible, involving money or logins waits for the person's approval.`,
    `Ceiling today (not built now): ${c.top.rung} · ${c.top.setting.short} ${c.top.setting.effort} · ${c.top.platform}. Why not now: ${c.why}. Climb when: ${c.climb}.`,
    ...GATES.filter(g => gateOverridden(p, g.id)).map(g => `${g.id} overridden by the person: ${gate(p, g.id).override.reason}`)].join("\n");
}
/* ---------- trifecta meter (G7) ---------- */
function trifecta(p){
  const txt = (JSON.stringify(arr(p.arch.components)) + " " + JSON.stringify(arr(p.arch.dataPlan)) + " " + str(p.northStar.constraints)).toLowerCase();
  const legs = {
    private: /personal|private|customer|kunde|email|e-mail|gmail|drive|calendar|bank|health|account|login|個人|个人|客户|邮件/.test(txt),
    untrusted: /web|search|scrap|crawl|email|upload|document|pdf|rss|feed|internet|网页|搜索|文件/.test(txt),
    outbound: /send|post|publish|email|message|slack|webhook|share|upload|senden|veröffentl|发送|发布/.test(txt)
  };
  return {legs, all: legs.private && legs.untrusted && legs.outbound};
}

/* ---------- tool card (one page, frozen at each release) ---------- */
function toolCard(p, v){
  const c = ceilingCard(p), s = settingById(dial(p, "setting"));
  const acc = arr(p.findings).filter(f => f.status === "accepted").map(f => "- " + trunc(f.issue, 140) + (f.reason ? " — " + trunc(f.reason, 100) : ""));
  return [`# ${p.name} · v${v}`, "",
    `**Purpose:** ${str(p.northStar.goal) || "—"}`, `**Problem:** ${str(p.northStar.problem) || "—"}`, `**Success measure:** ${str(p.northStar.success) || "—"}`, `**Users:** ${str(p.northStar.users) || "—"}`, "",
    `**Where it lives:** ${str(p.tool.home && p.tool.home.where) || "—"}`, `**Design rung:** ${dial(p, "rung")} · **Model:** ${s.short} · ${s.effort} · **Autonomy:** ${dial(p, "autonomy")} · **Platform:** ${dial(p, "platform")}`,
    `**Ceiling today:** ${c.top.rung} · ${c.top.setting.short} ${c.top.setting.effort} · ${c.top.platform}. Why not: ${c.why}. Climb when: ${c.climb}`, "",
    `**Data used:** ${arr(p.arch.dataPlan).map(d => d.source).join("; ") || "—"}`,
    `**Audience:** ${p.audience && p.audience.customers ? "customers" : "personal / internal"}${p.audience && p.audience.eu ? ", people in the EU (Art. 50 disclosure applies)" : ""}`,
    `**Human approvals:** ${arr(p.arch.humanSteps).join("; ") || "—"}`,
    `**Tests:** ${arr(p.tests).length} cases · last run ${p.runs[0] ? p.runs[0].passRate + "% · all " + (p.runs[0].trials || 1) + " runs pass " + (p.runs[0].passK ?? p.runs[0].consistency) + "%" : "—"}`,
    `**Accepted risks:**`, ...(acc.length ? acc : ["- none"]), "",
    `**Knowledge pack:** ${kpLabel()} · **Owner:** ${wsLabel(WS.name)} · **Released:** ${fmtDate(now())}`].join("\n");
}

/* ---------- monthly digest and urgent items (shown in PT only) ---------- */
function monthKey(d = new Date()){ return d.toISOString().slice(0, 7); }
function urgentItems(){
  const out = [];
  for (const m of retiringModels(30)) for (const p of WS.projects.filter(x => !x.deletedAt && x.live && projUsesModel(x, m))) out.push({kind: "retire", text: t("urg.retire", {m: m.label, d: fmtDay(m.retires), p: p.name}), pid: p.id});
  for (const p of WS.projects.filter(x => !x.deletedAt && x.live)){ const h = arr(p.health)[arr(p.health).length - 1]; if (h && h.ok === false) out.push({kind: "broken", text: t("urg.broken", {p: p.name}), pid: p.id}); }
  for (const pr of KP.proposals.filter(x => x.status !== "done")) for (const it of arr(pr.items).filter(i => i.urgent && (!i.status || i.status === "open"))) out.push({kind: "kp", text: t("urg.kp", {x: trunc(it.why || it.target || "", 90)}), prop: pr.id});
  return out;
}
function digest(month = monthKey(new Date(Date.now() - 15 * 864e5))){
  const inMonth = d => str(d).slice(0, 7) === month;
  const live = WS.projects.filter(p => !p.deletedAt && p.live);
  const releases = WS.projects.flatMap(p => arr(p.releases).filter(r => inMonth(r.at)).map(r => ({p: p.name, v: r.v})));
  const inbox = WS.projects.reduce((n, p) => n + arr(p.inbox).filter(i => !i.done).length, 0);
  const props = KP.proposals.filter(x => x.status !== "done").reduce((n, x) => n + arr(x.items).filter(i => !i.status || i.status === "open").length, 0);
  const climb = live.map(p => ({p, s: climbSuggestion(p)})).filter(x => x.s);
  return {month, live: live.length, releases, inbox, props, stale: kpStaleItems().length, retiring: retiringModels(60), climb};
}
/** would a newer model or a lower setting serve this live tool as well? (monthly climb-or-descend review) */
function climbSuggestion(p){
  const e = eng(p), m = arr(e.mini.results).filter(r => r.v14).map(r => Object.assign({setting: r.setting}, miniSummary(r)));
  const cur = m.find(x => x.setting === dial(p, "setting"));
  const lower = SETTINGS_LADDER[Math.max(0, SETTINGS_LADDER.findIndex(s => s.id === dial(p, "setting")) - 1)];
  if (cur && cur.passK >= 95 && lower && lower.id !== dial(p, "setting")) return t("dig.down", {p: p.name, s: lower.short + " · " + lower.effort});
  if (cur && cur.passK < QUALITY_BAR) return t("dig.up", {p: p.name, n: cur.passK});
  if (KP.at && e.mini.at && new Date(KP.at) > new Date(e.mini.at) && KP.log.some(l => new Date(l.at) > new Date(e.mini.at) && arr(l.items).some(i => /model/.test(i)))) return t("dig.newmodel", {p: p.name});
  return null;
}
