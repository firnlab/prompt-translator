/* ===================== 1.4 SIX STAGES, THEIR GATES AND THE ONE QUEUE =====================
   Goal · Options · Design · Build · Prove · Release & run, with today's 12 steps inside.
   Every screen counts from queueOf(): Needs you / To check / Later / Done. Only concrete failures block (the stop rule). */
const STAGES = [
  {id: "goal",    steps: ["capture","understand"]},
  {id: "options", steps: ["interview","assume"]},
  {id: "design",  steps: ["require","arch"]},
  {id: "build",   steps: ["build"]},
  {id: "prove",   steps: ["review","test","launch"]},
  {id: "run",     steps: ["release","operate"]}
];
function stageOf(ph){ return (STAGES.find(s => s.steps.includes(ph)) || STAGES[0]).id; }
function stageById(id){ return STAGES.find(s => s.id === id) || STAGES[0]; }
const stName = id => t("stg." + id);
/** decisions that are hard to undo are never taken by PT on its own: the goal, the design, who uses the tool, red-line gates */
const HARD_REFS = ["ns", "arch:choice", "audience"];

/* ---------- the queue ---------- */
const CLS_ORDER = {block: 0, should: 1, check: 2, later: 3};
let Q_CACHE = null;
function qItem(o){ return Object.assign({cls: "should", who: "you", stage: stageOf(o.ph || "capture"), ph: "capture", why: "", fix: null, opts: null}, o, {key: (o.kind || "x") + "|" + o.ref + "|" + (o.fix || "")}); }
/** everything open in a project, classified once */
function queueOf(p){
  if (RENDERING && Q_CACHE && Q_CACHE.p === p) return Q_CACHE.q;
  const Q = [], add = o => Q.push(qItem(o));
  const ns = p.northStar || {}, g = p.goal || {criteria: [], examples: []};
  /* Goal */
  for (const k of ["problem","goal","success"]) if (!str(ns[k]).trim()) add({kind: "ns", ref: "ns", ph: "capture", cls: "block", title: t("bl.nsmissing", {f: t("ns." + k)}), why: t("q.why.ns"), fix: p.intake.clean || p.intake.raw ? (p.nsDraft ? null : "clarify") : null, act: "edit-ns"});
  if (p.nsAssumed || p.nsDraft) add({kind: "nsdecide", ref: "ns", ph: "capture", cls: "block", hard: true, title: p.nsDraft ? t("q.nsdraft") : t("bl.nsassumed"), why: t("q.why.hard"), act: p.nsDraft ? "ns-accept" : "ns-confirm"});
  const aud = p.audience || {};
  if (str(p.intake.raw).trim() && (aud.customers == null || aud.eu == null)) add({kind: "audience", ref: "audience", ph: "capture", cls: "block", hard: true, title: t("bl.audience"), why: t("q.why.audience")});
  const crits = arr(g.criteria);
  if (str(ns.goal).trim() && !crits.length) add({kind: "crit-none", ref: "goal", ph: "capture", cls: "block", title: t("q.nocrit"), why: t("q.why.crit"), fix: "crit-draft", who: "pt"});
  for (const c of crits.filter(c => c.st === "assumed")) add({kind: "crit", ref: "crit:" + c.id, ph: "capture", cls: "check", title: c.id + " · " + t("crit.line", {w: trunc(c.when, 60), r: trunc(c.then, 80)}), why: t("q.why.decided"), who: "pt", sim: "crit"});
  for (const c of crits.filter(c => c.unclear && c.st !== "assumed")) add({kind: "crit-unclear", ref: "crit:" + c.id, ph: "capture", cls: "should", title: t("q.critunclear", {id: c.id}), why: str(c.unclear)});
  /* Options: questions, assumptions, risks */
  for (const q of arr(p.pendingQs)) add({kind: "pq", ref: "pq:" + q.id, ph: "interview", cls: q.hard ? "block" : "should", hard: !!q.hard, title: q.text, why: q.why || t("q.why.question")});
  const cov = dimCoverage(p);
  if (str(ns.goal).trim() && !arr(p.pendingQs).length && !p.interviewReady && cov < 0.8 && !p.interviewStopped) add({kind: "dims", ref: "interview", ph: "interview", cls: "should", title: t("q.dims", {n: Math.round(cov * 100)}), why: t("q.why.dims"), fix: "go-interview", who: "pt"});
  for (const q of arr(p.qa).filter(q => q.st === "assumed")) add({kind: "qa", ref: "qa:" + q.id, ph: "interview", cls: "check", who: "pt", title: trunc(q.q, 120), why: t("q.why.answered", {a: trunc(q.answer, 80)}), sim: "qa"});
  for (const a of arr(p.assumptions).filter(a => !aHandled(a))){
    const risky = isRiskyA(a);
    add({kind: "assumption", ref: "assumption:" + a.id, ph: "assume", cls: risky ? "block" : "later", title: trunc(a.text, 140), why: risky ? t("q.why.riskyas", {i: a.impact, r: a.risk}) : t("q.why.as"), sim: "assumption"});
  }
  for (const r of arr(p.risks).filter(r => !rHandled(r))){
    const big = isBigR(r);
    add({kind: "risk", ref: "risk:" + r.id, ph: "assume", cls: big ? "block" : "later", title: trunc(r.text, 140), why: r.mitigation ? t("q.why.riskmit") : t("q.why.risk"), fix: r.mitigation ? null : "risk-suggest", who: r.mitigation ? "you" : "pt", sim: "risk"});
  }
  /* Design */
  const reqs = arr(p.requirements);
  if (str(ns.goal).trim() && PHASE_IDS.indexOf(p.phase) >= PHASE_IDS.indexOf("require") && !reqs.length) add({kind: "req-none", ref: "require", ph: "require", cls: "block", title: t("bl.noreqs"), fix: "requirements", who: "pt"});
  for (const r of reqs.filter(r => r.st === "assumed")) add({kind: "req", ref: "req:" + r.id, ph: "require", cls: "check", who: "pt", title: r.id + " · " + trunc(r.title || r.then, 100), why: t("q.why.decided"), sim: "req"});
  if (crits.length && reqs.length){ const nolink = reqs.filter(r => r.priority === "must" && !arr(r.critIds).length); if (nolink.length) add({kind: "req-crit", ref: "require", ph: "require", cls: "should", who: "pt", title: t("q.reqcrit", {n: nolink.length}), why: t("q.why.reqcrit"), fix: "crit-link"}); }
  const a = p.arch;
  if (reqs.length && PHASE_IDS.indexOf(p.phase) >= PHASE_IDS.indexOf("arch") && !arr(a.options).length) add({kind: "arch-none", ref: "arch", ph: "arch", cls: "block", title: t("q.noarch"), fix: "architecture", who: "pt"});
  if (arr(a.options).length && (a.chosenAssumed || !a.chosen)) add({kind: "archdecide", ref: "arch:choice", ph: "arch", cls: "block", hard: true, title: t("q.archdecide", {x: ((arr(a.options).find(o => o.id === (a.chosen || a.recommended)) || {}).name) || "—"}), why: t("q.why.hard")});
  if (a.drawnFor && a.chosen && a.drawnFor !== a.chosen) add({kind: "archredraw", ref: "arch:choice", ph: "arch", cls: "block", title: t("q.archredraw"), why: t("q.why.archredraw"), fix: "arch-redraw", who: "pt"});
  const eng0 = eng(p);
  for (const gx of GATES){
    const gg = gate(p, gx.id);
    if (gateOn(p, gx.id) && ["G1","G2","G6"].includes(gx.id) && !gateOverridden(p, gx.id) && num(dial(p, "rung").slice(1), 2) > 0) add({kind: "gatefired", ref: "engine:" + gx.id, ph: ["G1","G2"].includes(gx.id) ? "understand" : "arch", cls: "block", hard: true, title: t("bl.gatefired", {g: gx.id}), why: t("gate.fx." + gx.key)});
    else if (gx.must && !gg.ans && arr(a.options).length) add({kind: "gate", ref: "engine:" + gx.id, ph: ["G1","G2"].includes(gx.id) ? "understand" : "arch", cls: gg.sug ? "check" : "should", who: gg.sug ? "pt" : "you", title: t("bl.gate", {g: gx.id, q: t("gate." + gx.key)}), why: gg.sug ? t("q.why.gatesug", {a: t("eng.ans." + gg.sug.ans)}) : t("q.why.gate"), fix: gg.sug ? null : "eng-suggest", sim: "gate"});
  }
  if (eng0.scan.state !== "done" && str(ns.goal).trim()) add({kind: "scan", ref: "engine:scan", ph: "understand", cls: "later", who: "pt", title: t(eng0.scan.state === "running" ? "bl.scanrun" : "bl.scan"), why: t("q.why.optional"), fix: eng0.scan.state === "running" ? null : "frontier-local"});
  /* Build */
  const secs = arr(p.pkg.sections);
  if (arr(a.components).length && !secs.length) add({kind: "pkg-none", ref: "build", ph: "build", cls: "block", title: t("bl.nopkg"), fix: "compile", who: "pt"});
  const lint = lintPackage(p);
  const lintE = lint.filter(l => l.sev === "error"), lintW = lint.filter(l => l.sev === "warn");
  if (lintE.length) add({kind: "lint", ref: "build:lint", ph: "build", cls: "block", who: "pt", title: t("q.linterr", {n: lintE.length}), why: lintE.slice(0, 3).map(l => t(l.key, {d: l.detail || ""})).join(" · "), fix: "lint-fix"});
  if (lintW.length) add({kind: "lintw", ref: "build:lintw", ph: "build", cls: "later", who: "pt", title: t("q.lintwarn", {n: lintW.length}), why: lintW.slice(0, 3).map(l => t(l.key, {d: l.detail || ""})).join(" · "), fix: "lint-fix"});
  for (const f of arr(p.flags)){ const it = itemByRef(p, f.ref); if (!it && !/^(ns|arch:choice)$/.test(f.ref)) continue; add({kind: "flag", ref: f.ref, ph: it ? it.ph : PHASE_OF[f.ref.split(":")[0]] || "build", cls: "check", who: "pt", title: (it ? it.id + " · " + trunc(it.title, 90) : f.ref), why: t("flags.this", {x: f.why || f.because || ""}), fix: "update-affected", sim: "flag"}); }
  const cr = costRegression(p); if (cr) add({kind: "cost", ref: "cost", ph: "build", cls: "should", title: t("bl.cost", {a: cr.len, b: cr.out}), why: t("q.why.cost")});
  /* Prove: problems found by the reviewers and checks */
  for (const f of arr(p.findings)){
    if (f.status === "waiting"){ add({kind: "fwait", ref: "finding:" + f.id, ph: f.stage === "early" ? f.step || "require" : "review", cls: "check", who: "pt", title: trunc(f.issue, 140), why: t("q.why.waiting"), fix: "finding-confirm"}); continue; }
    if (!OPEN_F.includes(f.status)) continue;
    const cls = findingCls(f);
    const ph = f.stage === "early" ? (f.step || "require") : "review";
    if (f.needsYou) add({kind: "fyou", ref: "finding:" + f.id, ph, cls: cls === "later" ? "should" : cls, title: trunc(f.issue, 140), why: f.partly ? t("fx.partly", {a: f.partly.done, b: f.partly.total}) + " · " + str(f.needsYou.why) : str(f.needsYou.why), sim: "finding"});
    else add({kind: "finding", ref: "finding:" + f.id, ph, cls, who: "pt", title: trunc(f.issue, 140), why: t("sev." + f.severity) + (f.lens ? " · " + (LENSES.find(l => l.id === f.lens) ? L(LENSES.find(l => l.id === f.lens)) : t("chk.label", {s: phName(f.step || "require")})) : ""), fix: "finding-fix", sim: "finding"});
  }
  for (const f of arr(p.findings).filter(f => f.status === "accepted" && (f.legacy || (f.recheck && f.recheck < now())))) add({kind: "fstale", ref: "finding:" + f.id, ph: "review", cls: "later", title: trunc(f.issue, 140), why: t(f.legacy ? "bl.acclegacy" : "bl.accstale")});
  const ec = p.earlyChecks || {};
  if (reqs.length && !ec.require) add({kind: "early", ref: "check:require", ph: "require", cls: "should", who: "pt", title: t("bl.early", {s: phName("require")}), why: t("q.why.early"), fix: "early-check", arg: "require"});
  if (arr(a.components).length && !ec.arch) add({kind: "early", ref: "check:arch", ph: "arch", cls: "should", who: "pt", title: t("bl.early", {s: phName("arch")}), why: t("q.why.early"), fix: "early-check", arg: "arch"});
  if (secs.length && p.seal.review !== p.versionNo) add({kind: "review", ref: "review", ph: "review", cls: "block", who: "pt", title: p.seal.review ? t("seal.broken", {v: p.seal.review, c: p.versionNo}) : t("bl.noreview"), why: t("q.why.review"), fix: p.seal.review ? "seal-recheck" : "review-run"});
  if (reqs.length && secs.length){ const noTest = reqs.filter(r => !arr(p.tests).some(x => arr(x.reqIds).includes(r.id))); if (noTest.length) add({kind: "notest", ref: "test", ph: "test", cls: "should", who: "pt", title: t("q.notest", {n: noTest.length}), why: noTest.slice(0, 8).map(r => r.id).join(", "), fix: "tests-missing"}); }
  if (secs.length){
    const lr = lastRun(p);
    if (!arr(p.tests).length) add({kind: "test-none", ref: "test", ph: "test", cls: "block", who: "pt", title: t("q.notests"), fix: "gen-tests"});
    else if (!lr || lr.versionNo !== p.versionNo || (lr.trials || 1) < TRIALS || lr.incomplete) add({kind: "test-run", ref: "test", ph: "test", cls: "block", who: "pt", title: !lr ? t("bl.norun") : lr.versionNo !== p.versionNo ? t("bl.runold", {v: lr.versionNo}) : lr.incomplete ? t("q.runincomplete", {a: arr(lr.results).length, b: lr.expected || "?"}) : t("bl.runs3", {n: lr.trials || 1}), why: t("q.why.tests"), fix: "tests-run"});
    else {
      // a failure you confirmed yourself still blocks; a result you ruled "pass" does not
      const failIds = [...new Set(lr.results.filter(x => x.userVerdict ? x.userVerdict === "fail" : (!x.pass && !needsYou(x))).map(x => x.testId))];
      if (failIds.length) add({kind: "test-fail", ref: "test", ph: "test", cls: "block", who: "pt", title: t("q.testfail", {n: failIds.length}), why: failIds.slice(0, 8).join(", "), fix: p.candidate && p.candidate.passRate != null ? null : "tests-improve"});
      for (const x of lr.results.filter(needsYou)) add({kind: "judge", ref: "test:" + x.testId, ph: "test", cls: "block", title: t("bl.decide", {id: x.testId}), why: t("q.why.judge"), run: lr.id, xi: lr.results.indexOf(x)});
      if (arr(lr.skipped).length) add({kind: "test-skip", ref: "test", ph: "test", cls: "should", who: "pt", title: t("q.testskip", {n: lr.skipped.length}), why: lr.skipped.join(", "), fix: "tests-run"});
    }
    if (p.candidate && p.candidate.passRate != null) add({kind: "cand", ref: "test:cand", ph: "test", cls: "block", title: t("q.cand", {n: p.candidate.passRate}), why: p.candidate.summary || ""});
    if (!p.trace || p.trace.version !== p.versionNo) add({kind: "trace", ref: "trace", ph: "launch", cls: "should", who: "pt", title: p.trace ? t("bl.traceold") : t("bl.notrace"), why: t("q.why.trace"), fix: "trace-run"});
    else if (arr(p.trace.orphanReqs).length) add({kind: "trace-gap", ref: "trace", ph: "launch", cls: "should", who: "pt", title: t("q.tracegap", {n: p.trace.orphanReqs.length}), why: p.trace.orphanReqs.map(o => o.req).join(", "), fix: "trace-close"});
  }
  /* later: concerns, open questions, notes */
  for (const f of activeForesight(p).filter(f => !f.done)) add({kind: "concern", ref: "fs:" + f.id, ph: PHASE_IDS.includes(f.phase) ? f.phase : "arch", cls: "later", title: trunc(f.text, 140), why: f.ai ? t("q.why.concernai") : t("q.why.concern"), sim: "concern"});
  for (const q of arr(p.openQs).filter(q => !q.done)) add({kind: "oq", ref: "oq:" + q.id, ph: "interview", cls: "later", title: trunc(q.text, 140), why: t("bl.openq")});
  const unsorted = (WS.notes || []).filter(n => n.projectId === p.id && n.inbox && !n.deletedAt).length;
  if (unsorted) add({kind: "notes", ref: "notes", ph: p.focus.ph, cls: "later", title: t("bl.notes", {n: unsorted}), why: t("q.why.notes")});
  // what you put off with "Later" waits in Later (a blocking item still blocks publishing, so it stays where it is)
  { const lt = p.later || {}; for (const x of Q) if (lt[x.key] && (x.cls === "should" || x.cls === "check")) x.cls = "later"; }
  // one entry per key, most important first
  const seen = new Set(), out = [];
  for (const x of Q.sort((a1, b1) => CLS_ORDER[a1.cls] - CLS_ORDER[b1.cls] || STAGES.findIndex(s => s.id === a1.stage) - STAGES.findIndex(s => s.id === b1.stage) || PHASE_IDS.indexOf(a1.ph) - PHASE_IDS.indexOf(b1.ph))){ if (seen.has(x.key)) continue; seen.add(x.key); out.push(x); }
  if (RENDERING) Q_CACHE = {p, q: out};
  return out;
}
/** a finding blocks only when it is a concrete failure (stop rule); older findings without a class take it from their severity */
function findingCls(f){ if (f.cls) return f.cls; return ["critical"].includes(f.severity) ? "block" : f.severity === "high" ? "should" : f.severity === "medium" ? "should" : "later"; }
function queueCounts(p, stage = null){
  const q = queueOf(p).filter(x => !stage || x.stage === stage);
  const c = {block: 0, should: 0, check: 0, later: 0, you: 0, pt: 0, all: q.length};
  for (const x of q){ c[x.cls]++; if (x.cls === "block" || x.cls === "should") c[x.who === "pt" && x.fix ? "pt" : "you"]++; }
  return c;
}
/** before you can publish: only the blocking items count */
function blockingItems(p){ return queueOf(p).filter(x => x.cls === "block"); }
function copyUnlocked(p){ return arr(p.pkg.sections).length > 0 && !blockingItems(p).length; }
function beforeCopy(p){ return queueOf(p).map(x => Object.assign({}, x, {block: x.cls === "block", step: x.ph, go: x.ph, text: x.title})); }

/* ---------- stage gates ---------- */
/** what a stage needs before the next one: each check is passed or names what is missing */
function stageChecks(p, sid){
  const ns = p.northStar || {}, g = p.goal || {}, crits = arr(g.criteria), q = queueOf(p), C = [];
  const add = (id, ok) => C.push({id, ok: !!ok});
  const noBlock = st => !q.some(x => x.cls === "block" && x.stage === st);
  if (sid === "goal"){ add("goal.ns", ["problem","goal","success"].every(k => str(ns[k]).trim()) && !p.nsAssumed && !p.nsDraft); add("goal.aud", (p.audience || {}).customers != null && (p.audience || {}).eu != null); add("goal.crit", crits.length > 0); add("goal.block", noBlock("goal")); }
  if (sid === "options"){ add("opt.questions", !arr(p.pendingQs).some(x => x.hard) && (p.interviewReady || dimCoverage(p) >= 0.8 || p.interviewStopped)); add("opt.assume", !arr(p.assumptions).some(a => isRiskyA(a) && !aHandled(a))); add("opt.risks", !arr(p.risks).some(r => isBigR(r) && !rHandled(r))); }
  if (sid === "design"){ add("des.reqs", arr(p.requirements).length > 0); add("des.arch", !!p.arch.chosen && !p.arch.chosenAssumed && arr(p.arch.components).length > 0); add("des.block", noBlock("design")); }
  if (sid === "build"){ add("bld.pkg", arr(p.pkg.sections).length > 0); add("bld.lint", !lintPackage(p).some(l => l.sev === "error")); add("bld.flags", !arr(p.flags).length); }
  if (sid === "prove"){ add("prv.review", arr(p.pkg.sections).length && p.seal.review === p.versionNo); add("prv.tests", (() => { const lr = lastRun(p); return lr && lr.versionNo === p.versionNo && (lr.trials || 1) >= TRIALS && !lr.incomplete; })()); add("prv.block", !blockingItems(p).length); }
  if (sid === "run"){ add("run.live", !!p.live); }
  return C;
}
function stageDone(p, sid){ return stageChecks(p, sid).every(c => c.ok); }
/** readiness in %: share of stage checks passed up to Prove; 100 % only when nothing blocks */
function readinessScore(p){
  const C = ["goal","options","design","build","prove"].flatMap(s => stageChecks(p, s));
  const pc = Math.round(C.filter(c => c.ok).length / Math.max(1, C.length) * 100);
  return copyUnlocked(p) ? 100 : Math.min(99, pc);
}
function stageState(p, sid){
  const st = stageById(sid), cur = p.focus && st.steps.includes(p.focus.ph);
  const done = stageDone(p, sid), any = st.steps.some(ph => stepInfo(p, ph).state !== "todo");
  return cur ? "cur" : done ? "done" : any ? "attn" : "todo";
}
/** what PT decided on its own in a stage (shown as one batch at the stage gate: "accept all except") */
function decidedByPT(p, sid){ return queueOf(p).filter(x => x.cls === "check" && !["flag","fwait"].includes(x.kind) && (!sid || x.stage === sid)); }
