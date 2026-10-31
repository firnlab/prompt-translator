/* ===================== 1.0 ENGINE: items, change flags, readiness, restore points, releases ===================== */
const PHASE_IDS = ["capture","understand","interview","assume","require","arch","build","review","test","launch","release","operate"];
const PHASE_GROUPS = [{id:"define", phases:["capture","understand","interview","assume","require"]}, {id:"design", phases:["arch","build","review","test"]}, {id:"run", phases:["launch","release","operate"]}];
const PHASE_EN = {capture:"Capture", understand:"Understand", interview:"First-questions", assume:"Assumptions-risks", require:"Requirements", arch:"Architecture", build:"Build-brief", review:"Review", test:"Test", launch:"Launch", release:"Release", operate:"Operate"};
const MODES = ["steps","blueprint","journey","swimlanes","express"];
const SUGGEST = {capture:"express", understand:"express", interview:"steps", assume:"steps", require:"steps", arch:"blueprint", build:"blueprint", review:"steps", test:"steps", launch:"steps", release:"journey", operate:"swimlanes"};
const SPECIAL = ["launch","release","operate"];
const phName = id => t("ph." + id);
function projMode(p){ return MODES.includes(p.mode) ? p.mode : (MODES.includes(WS.settings.defaultMode) ? WS.settings.defaultMode : "steps"); }
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
const isRiskyA = a => a.impact * a.risk >= 12;
const isBigR = r => r.likelihood * r.impact >= 12;
const aHandled = a => ["validated","invalid","accepted"].includes(a.status);
const rHandled = r => (r.mitigation && ["mitigated","closed"].includes(r.status)) || r.status === "accepted";
const OPEN_F = ["open","waiting","signoff"];

/* ---------- parts (components) and links ---------- */
function compsFor(p, reqIds){ const ids = arr(reqIds); return arr(p.arch.components).filter(c => arr(c.reqIds).some(r => ids.includes(r))).map(c => c.id); }
function partsOfReq(p, rid){ return compsFor(p, [rid]); }
function lastRun(p){ return arr(p.runs).find(r => r.label !== "candidate") || null; }
function testResult(p, tid){
  const r = lastRun(p); if (!r) return null;
  const rs = r.results.filter(x => x.testId === tid); if (!rs.length) return null;
  return rs.every(x => x.pass) ? "pass" : "fail";
}
function isFlagged(p, ref){ return arr(p.flags).some(f => f.ref === ref); }

/* ---------- the shared item model: every mode shows these, with one status scale ---------- */
function itemsOf(p, ph){
  const out = [];
  const add = (o) => { o.st = isFlagged(p, o.ref) && o.st === "ok" ? "warn" : o.st; o.flag = isFlagged(p, o.ref); out.push(o); };
  const ns = p.northStar, lint = ph === "build" ? lintPackage(p) : [];
  switch (ph){
    case "capture":
      if (p.intake.raw) add({ref:"intake:raw", kind:"intake", id:"I1", ph, title:t("cap.yours"), body:p.intake.raw, st:"ok", parts:[]});
      if (p.intake.clean) add({ref:"intake:clean", kind:"clean", id:"I2", ph, title:t("cap.cleaned"), body:p.intake.clean, st:"ok", parts:[]});
      if (ns.goal || ns.problem) add({ref:"ns", kind:"ns", id:"NS", ph, title:t("ns.title"), body:[ns.problem, ns.goal, ns.success].filter(Boolean).join(" · "), st: p.nsAssumed ? "as" : ([ns.problem, ns.goal, ns.success].every(Boolean) ? "ok" : "warn"), parts:[]});
      if (p.nsDraft) add({ref:"nsdraft", kind:"nsdraft", id:"NS?", ph, title:t("cap.nsproposal"), body:p.nsDraft.goal, st:"as", parts:[]});
      for (const c of arr(p.goal && p.goal.criteria)){ const res = critResult(p, c.id); add({ref:"crit:" + c.id, kind:"crit", id:c.id, ph, title: critLine(c), body: c.unclear || "", st: c.st === "assumed" ? "as" : res === "fail" ? "bad" : "ok", parts: [...new Set(arr(p.requirements).filter(r => arr(r.critIds).includes(c.id)).flatMap(r => partsOfReq(p, r.id)))], obj: c}); }
      break;
    case "understand": {
      const u = p.understand;
      if (u.rootNeed) add({ref:"und:root", kind:"und", id:"U1", ph, title:t("und.root"), body:u.rootNeed, st:"ok", parts:[]});
      if (u.jtbd) add({ref:"und:jtbd", kind:"und", id:"U2", ph, title:t("und.jtbd"), body:u.jtbd, st:"ok", parts:[]});
      if (arr(u.walkSteps).length) add({ref:"und:walk", kind:"und", id:"U3", ph, title:t("und.walk"), body:u.walkthrough, st: arr(u.walkGaps).length && !u.walkConfirmed ? "as" : "ok", parts:[]});
      if (arr(u.premortem).length) add({ref:"und:pm", kind:"und", id:"U4", ph, title:t("und.pm"), body:u.premortem.map(f => f.text).join(" · "), st:"ok", parts:[]});
      break; }
    case "interview":
      arr(p.qa).forEach((q, i) => add({ref:"qa:" + q.id, kind:"qa", id:"Q" + (i + 1), ph, title:q.q, body:q.answer, st: q.st === "assumed" ? "as" : "ok", parts:[], obj:q}));
      arr(p.pendingQs).forEach(q => add({ref:"pq:" + q.id, kind:"pq", id:"?", ph, title:q.text, body:q.why, st:"todo", parts:[], obj:q}));
      break;
    case "assume":
      arr(p.assumptions).forEach((a, i) => add({ref:"assumption:" + a.id, kind:"assumption", id:"A" + (i + 1), ph, title:a.text, body:t("acat." + a.category) + " · " + t("ast." + a.status), st: aHandled(a) ? "ok" : isRiskyA(a) ? "bad" : "as", parts:[], obj:a}));
      arr(p.risks).forEach((r, i) => add({ref:"risk:" + r.id, kind:"risk", id:"K" + (i + 1), ph, title:r.text, body:r.mitigation ? t("rk.mitigation") + ": " + r.mitigation : "", st: rHandled(r) ? "ok" : isBigR(r) ? "bad" : "warn", parts:[], obj:r}));
      break;
    case "require":
      arr(p.requirements).forEach(r => add({ref:"req:" + r.id, kind:"req", id:r.id, ph, title:r.title || trunc(r.then, 80), g:r.given, w:r.when, th:r.then, st: r.st === "assumed" ? "as" : "ok", parts: partsOfReq(p, r.id), obj:r}));
      break;
    case "arch": {
      const a = p.arch, opt = arr(a.options).find(o => o.id === (a.chosen || a.recommended));
      if (opt) add({ref:"arch:choice", kind:"choice", id:"AR", ph, title:opt.name, body:a.why, st: a.chosen ? "ok" : "as", parts:[]});
      arr(a.components).forEach(c => add({ref:"component:" + c.id, kind:"component", id:c.id.toUpperCase(), ph, title:c.name, body:c.role, st:"ok", parts:[c.id], obj:c}));
      break; }
    case "build":
      arr(p.pkg.sections).forEach((s, i) => { const own = lint.filter(l => l.sec === s.id); add({ref:"section:" + s.id, kind:"section", id:"B" + (i + 1), ph, title:s.title + (s.filename ? " · " + s.filename : ""), body:s.why || L(DEST[s.dest]), st: own.some(l => l.sev === "error") ? "bad" : own.some(l => l.sev === "warn") ? "warn" : "ok", parts: compsFor(p, s.reqIds), obj:s}); });
      break;
    case "review":
      arr(p.findings).filter(f => f.status !== "done" || UI.showAllFindings).forEach((f, i) => { const sec = arr(p.pkg.sections).find(s => s.id === f.section); add({ref:"finding:" + f.id, kind:"finding", id:"F" + (i + 1), ph, title:f.issue, body:f.fix, st: f.status === "open" ? "bad" : f.status === "done" || f.status === "accepted" ? "ok" : "warn", parts: sec ? compsFor(p, sec.reqIds) : [], obj:f}); });
      break;
    case "test":
      arr(p.tests).forEach(x => { const r = testResult(p, x.id); add({ref:"test:" + x.id, kind:"test", id:x.id, ph, title:x.title || trunc(x.input, 80), body:x.criteria.join(" · "), st: r === "pass" ? "ok" : r === "fail" ? "bad" : "todo", parts: compsFor(p, x.reqIds), obj:x}); });
      break;
  }
  const nr = p.newRefs || {};
  if (Object.keys(nr).length) return [...out.filter(o => nr[o.ref]), ...out.filter(o => !nr[o.ref])];
  return out;
}
function allItems(p){ return PHASE_IDS.flatMap(ph => SPECIAL.includes(ph) ? [] : itemsOf(p, ph)); }
let IT_CACHE = null;   // during one render the data does not change: items by ref are looked up once
function itemByRef(p, ref){
  if (RENDERING){ if (!IT_CACHE || IT_CACHE.p !== p) IT_CACHE = {p, m: new Map(allItems(p).map(i => [i.ref, i]))}; return IT_CACHE.m.get(ref) || null; }
  return allItems(p).find(i => i.ref === ref) || null;
}
function countSt(list){ const c = {ok:0, as:0, bad:0, warn:0, todo:0}; for (const i of list) c[i.st] = (c[i.st] || 0) + 1; return c; }
function partState(p, cid){
  const st = allItems(p).filter(i => i.kind !== "component" && i.parts.includes(cid)).map(i => i.st);
  if (st.includes("bad")) return "bad"; if (st.includes("warn")) return "warn"; if (st.includes("as")) return "as"; if (!st.length) return "todo"; return "ok";
}
function assumedItems(p){ return allItems(p).filter(i => i.st === "as"); }

/* ---------- change flags ("may need updating") ---------- */
function flag(p, ref, because, why = ""){ p.flags = arr(p.flags); if (!p.flags.some(f => f.ref === ref)) p.flags.push({ref, because, why, at: now()}); }
function unflag(p, ref){ p.flags = arr(p.flags).filter(f => f.ref !== ref); }
/** called after a user or AI change of one item: marks only the items that directly depend on it (1.4 link graph) */
function markDownstream(p, ref, skip = []){
  const because = ref === "ns" ? t("ns.title") : (typeof refLabel === "function" ? refLabel(p, ref) : ref);
  const out = [];
  for (const d of depsOf(p, ref)){ if (d.ref === "ns" || d.ref === "intake:clean" || skip.includes(d.ref)) continue; flag(p, d.ref, because, d.why); out.push(d.ref); }
  return out;
}

/* ---------- step progress ---------- */
/* during one render the data does not change, so step progress is worked out once per render */
let PR_CACHE = null, RENDERING = false;
function phaseProgress10(p){
  if (!RENDERING) return phaseProgress10Raw(p);
  if (PR_CACHE && PR_CACHE.p === p) return PR_CACHE.v;
  const v = phaseProgress10Raw(p); PR_CACHE = {p, v}; return v;
}
function phaseProgress10Raw(p){
  const pr = phaseProgress(p);
  pr.release = p.releases.length ? 1 : p.pilot && p.pilot.state === "ok" ? .7 : p.report ? .4 : 0;
  pr.operate = p.live ? .5 + (arr(p.updates).length || arr(p.health).length ? .5 : 0) : 0;
  pr.launch = readinessScore(p) / 100;
  return pr;
}
/** the next step with open work, in order (the same "done" as every other screen: stepInfo) */
function nextBest10(p){
  for (const ph of PHASE_IDS){ if (ph === "operate") break; if (stepInfo(p, ph).state !== "done") return {phase: ph, key: "next." + ph}; }
  return {phase:"operate", key:"next.operate"};
}

/* ---------- readiness to a true 100% ---------- */
/** cost and length guard (gap 1): ≥20% longer package or longer outputs than the live release counts as a regression */
function pkgLen(p){ return arr(p.pkg && p.pkg.sections).reduce((n, s) => n + str(s.content).length, 0); }
function outLen(p){ const r = arr(p.runs).find(x => x.label !== "candidate"); if (!r || !arr(r.results).length) return 0; return Math.round(r.results.reduce((n, x) => n + str(x.output).length, 0) / r.results.length); }
function costRegression(p){
  const rel = arr(p.releases)[0]; if (!rel || rel.draft === p.versionNo) return null;
  const a = rel.len ? Math.round((pkgLen(p) / rel.len - 1) * 100) : 0, b = rel.outLen && outLen(p) ? Math.round((outLen(p) / rel.outLen - 1) * 100) : 0;
  if (a < 20 && b < 20) return null;
  if (p.costOk && p.costOk.draft === p.versionNo) return null;
  return {len: a, out: b};
}
function acceptedRisks(p){ return arr(p.findings).filter(f => f.status === "accepted").length + arr(p.assumptions).filter(a => a.status === "accepted").length + arr(p.risks).filter(r => r.status === "accepted").length; }

/* ---------- restore points (only the person deletes them) ---------- */
function projSnapshot(p){
  const s = clone(p); delete s._images; delete s.restore;
  let body = JSON.stringify(s);
  // restore points are full copies (the Store splits big ones); only very old test outputs are shortened in huge projects
  if (body.length > 900000){ for (const r of arr(s.runs).slice(3)) for (const x of arr(r.results)) x.output = trunc(x.output, 600); body = JSON.stringify(s); }
  return {s, body};
}
function addRestore(p, {kind = "auto", label = "", step = "", source = null} = {}){
  if (!p || !WS.id) return null;
  const {s, body} = projSnapshot(source || p);
  const h = hashStr(body);
  p.restore = arr(p.restore);
  const last = p.restore[p.restore.length - 1];
  if (last && last.h === h){
    // nothing changed since the last restore point: keep one copy and add this label to it
    if (kind !== "auto"){ last.milestone = true; last.kind = last.kind === "auto" ? kind : last.kind; if (label && !str(last.label).includes(label)) last.label = trunc((last.label ? last.label + " · " : "") + label, 200); }
    return null;
  }
  const r = {id: uid("rp"), at: now(), kind, label: str(label), step: step || (p.focus && p.focus.ph) || p.phase, h, size: body.length, milestone: kind !== "auto", draft: p.versionNo || 0};
  // the shared parts this point uses (unchanged parts are stored once for all restore points of the project)
  r.parts = Store.split({project: s}, true).head._parts || [];
  p.restore.push(r);
  Store.put(projPath(p.id) + "/restore/" + r.id, {meta: r, project: s});
  return r;
}
/** after the owner deleted a restore point: remove only the shared parts that NO stored restore point uses (checked in storage, not only in this window) */
async function cleanRestoreParts(p, rid, gone){
  const base = projPath(p.id);
  try{
    const heads = (await Store.rawList(base + "/restore")).filter(h => h.id !== rid);
    const keep = new Set([...heads.flatMap(h => arr(h._parts)), ...arr(p.restore).flatMap(x => arr(x.parts))]);
    for (const pid of arr(gone && gone.parts)) if (!keep.has(pid)){ Store.rpKnown.delete(base + "/rparts/" + pid); await Store.rawDel(base + "/rparts/" + pid).catch(() => {}); }
    // a 1.0-format restore point kept its own parts under restore/<id>/parts
    for (const pid of arr(gone && gone.ownParts)) await Store.rawDel(base + "/restore/" + rid + "/parts/" + pid).catch(() => {});
  }catch(e){ console.warn("restore cleanup", e); }   // when in doubt, keep the parts
}
async function loadRestore(p, rid){ try{ return await Store.get(projPath(p.id) + "/restore/" + rid); }catch(e){ return null; } }
/** Claude's recommendations: never deletes, only suggests with a reason */
function restoreAdvice(p){
  const RP = arr(p.restore), out = {};
  for (let i = 0; i < RP.length - 1; i++) if (RP[i].h === RP[i + 1].h) out[RP[i].id] = t("rp.rec.same");
  for (let i = 0; i < RP.length; i++){
    const r = RP[i]; if (r.milestone || out[r.id]) continue;
    const day = r.at.slice(0, 10);
    if (RP.slice(i + 1).some(x => x.milestone && x.at.slice(0, 10) === day)) out[r.id] = t("rp.rec.milestone");
  }
  if (storageEstimate().pct >= 70) for (const r of RP.filter(x => !x.milestone).slice(0, 20)) out[r.id] = out[r.id] || t("rp.rec.storage");
  return out;
}
function storageEstimate(){
  let n = 2 + WS.notes.length + WS.patterns.length + WS.research.length + arr(WS.jobs).length;
  for (const p of WS.projects) n += 1 + (p.versionNo || 0) + arr(p.restore).length;
  n *= Math.max(1, META.workspaces.length) / 1;   /* rough: other workspaces assumed similar */
  return {n: Math.round(n), pct: Math.min(100, Math.round(n / 25000 * 100))};
}

/* ---------- finishing a step: milestone + one file per finished step ---------- */
function stepFileName(p, ph){
  const d = new Date(), pad = n => String(n).padStart(2, "0");
  const stamp = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" + pad(d.getHours()) + "-" + pad(d.getMinutes());
  const name = String(p.name || "project").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "project";
  const idx = pad(PHASE_IDS.indexOf(ph) + 1);
  const who = String(wsLabel(WS.name)).replace(/[^\p{L}\p{N}]+/gu, "-");
  return `${name}_${stamp}_draft${pad(p.versionNo || 0)}_${idx}-${PHASE_EN[ph] || ph}_${who}.json`;
}
const STEP_THR = {capture:.9, understand:.75, interview:.8, assume:.6, require:.8, arch:.9, build:.95, review:.9, test:.7, launch:1, release:1, operate:2};
function stepDone(p, ph){ return phaseProgress10(p)[ph] >= STEP_THR[ph]; }
function finishStep(p, ph){
  p.step = p.step || {};
  if (p.step[ph] && p.step[ph].done) return;
  if (!stepDone(p, ph)) return;
  p.step[ph] = {done: true, at: now()};
  addRestore(p, {kind: "step", label: t("rp.stepdone", {s: phName(ph)}), step: ph});
  logAct(p, t("act.stepdone", {s: phName(ph)}), {step: ph, important: true});
  if (WS.settings.fileOnFinish !== false){
    const data = JSON.stringify({app:"prompt-translator", version: PT_VERSION, exportedAt: now(), step: ph, projects:[projSnapshot(p).s]}, null, 1);
    setTimeout(() => saveFile(stepFileName(p, ph), data), 200);
  }
}

/* ---------- releases of built tools: v1.0 → v1.0.1 (fix) → v1.1 (change) → v2.0 (big) ---------- */
/** published versions of a tool are v1, v2, v3 … (a tool released before 1.4 with dotted numbers keeps counting that way) */
function nextRelease(p, kind){
  const cur = p.releases.length ? p.releases[0].v : null;
  if (!cur) return "1";
  if (/^\d+$/.test(String(cur))) return String(num(cur, 0) + 1);
  const [a, b, c] = cur.split(".").map(x => num(x, 0));
  if (kind === "big") return (a + 1) + ".0";
  if (kind === "fix") return a + "." + b + "." + ((c || 0) + 1);
  return a + "." + (b + 1);
}
function releaseKind(changes){ const ks = arr(changes).map(c => c.k); if (ks.includes("big")) return "big"; if (ks.some(k => k === "change" || k === "add" || k === "remove")) return "change"; return "fix"; }
