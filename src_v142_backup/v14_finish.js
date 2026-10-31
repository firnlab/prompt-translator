/* ===================== 1.4 FINISH: from every mode, in one go =====================
   1. Plan: what PT can do on its own, with the cost before anything runs.
   2. Autopilot: close marks with no real change, merge duplicate problems, fix what blocks (checked fixes only, at most
      2 rounds per item), update the affected items layer by layer, run the tests once. A pass that does not reduce
      what blocks is taken back.
   3. Your decisions: one per screen, ★ preselected (Enter), 1/2/3 alternatives, L = later, W = won't fix (with a reason),
      "accept all like this" for PT's similar decisions.
   4. Check and publish: one summary with Undo all. */
const FIX_ORDER = ["crit-draft","judge-cal","update-affected","finding-confirm","finding-fix","lint-fix","risk-suggest","eng-suggest","crit-link","requirements","architecture","arch-redraw","proof-design","compile","early-check","review-run","seal-recheck","tests-missing","gen-tests","proof-tests","tests-run","tests-improve","trace-run","trace-close"];
const FIX_HEAVY = new Set(["review-run","seal-recheck","tests-run","tests-improve"]);
function fixUnits(p, fix, items){
  const W = TIER_WEIGHT;
  switch (fix){
    case "finding-fix": return fixCost(p, items.map(x => x.ref.slice(8)));
    case "update-affected": return Math.ceil(arr(p.flags).length / 25) * W.default;
    case "review-run": return LENSES.length * W.complex;
    case "seal-recheck": return 3 * W.complex;
    case "tests-run": return testRunCost(p);
    case "tests-improve": return W.complex + (arr(p.tests).filter(x => x.heldOut).length + 6) * (W.default + W.complex);
    case "early-check": return items.length * W.complex;
    case "risk-suggest": return items.length * W.default;
    default: return W.complex;
  }
}
/** what PT can do on its own now, grouped by kind of work, in the order that makes sense */
function finishPlan(p, sid = null){
  const q = queueOf(p).filter(x => x.who === "pt" && x.fix && x.cls !== "later" && FIX_ORDER.includes(x.fix) && (!sid || x.stage === sid));
  const groups = [];
  for (const fix of FIX_ORDER){ const items = q.filter(x => x.fix === fix); if (!items.length) continue; groups.push({fix, items, n: items.length, units: fixUnits(p, fix, items), heavy: FIX_HEAVY.has(fix), on: true}); }
  // the full test run is done once at the end (after the fixes), so it is always planned when tests exist and the package changes
  if ((!sid || sid === "prove" || sid === "build") && !groups.some(g => g.fix === "tests-run") && arr(p.tests).length && arr(p.pkg.sections).length && groups.some(g => ["finding-fix","lint-fix","update-affected","compile"].includes(g.fix))) groups.push({fix: "tests-run", items: [], n: 1, units: testRunCost(p), heavy: true, on: true, after: true});
  const you = queueOf(p).filter(x => (youOpen(x)) && !(x.who === "pt" && x.fix) && (!sid || x.stage === sid));
  return {groups, you, units: groups.reduce((n, g) => n + g.units, 0)};
}
/** one group of autopilot work */
async function finishRun1(p, g, sum){
  const F = UI.finish;
  const refs = g.items.map(x => x.ref);
  switch (g.fix){
    case "finding-fix": { const ids = refs.map(r => r.slice(8)).filter(id => { const f = arr(p.findings).find(x => x.id === id); return f && num(f.autoRounds, 0) < 2; });
      for (const id of ids){ const f = arr(p.findings).find(x => x.id === id); if (f) f.autoRounds = num(f.autoRounds, 0) + 1; }
      const s = await fixFindings(p, ids, {rounds: 2, quiet: true}); sum.fixed += s.fixed; sum.needYou += s.needYou; s.changed.forEach(r => sum.changed.add(r));
      // the items that depend on what was fixed: updated layer by layer (at most 2 layers, only direct dependents each time)
      let layer = [...s.changed];
      for (let d = 0; d < 2 && layer.length && !(F && F.stop); d++){ const u = await updateAffected(p, layer, {auto: true, layer: d + 1}); sum.updated += u.applied; layer = u.next; }
      return; }
    case "update-affected": { const u = await aiUpdateAffected(p, {auto: true}); sum.updated += u.applied || 0; sum.cleared += Math.max(0, g.n - (u.review || 0) - (u.applied || 0)); return; }
    case "finding-confirm": return aiConfirmFixes(p, refs.map(r => r.slice(8)));
    case "lint-fix": return aiLintFix(p);
    case "risk-suggest": for (const r of refs){ if (F && F.stop) break; await aiMitigate(p, r.slice(5)); } return;
    case "eng-suggest": return aiEngineSuggest(p);
    case "crit-draft": return aiDraftCriteria(p);
    case "judge-cal": return aiJudgeCal(p);
    case "crit-link": return aiLinkCriteria(p);
    case "requirements": return aiRequirements(p);
    case "architecture": return aiArchitecture(p);
    case "arch-redraw": return aiArchRedraw(p);
    case "compile": return aiCompile(p);
    case "early-check": for (const x of g.items){ if (F && F.stop) break; await aiEarlyCheck(p, x.arg || x.ref.split(":")[1]); } return;
    case "review-run": return aiReview(p, LENSES.map(l => l.id));
    case "seal-recheck": return aiSealRecheck(p, {tests: false});
    case "tests-missing": return aiMissingTests(p);
    case "gen-tests": return aiTests(p);
    case "proof-design": return aiProofDesign(p);
    case "proof-tests": return aiProofTests(p);
    case "tests-run": return aiRunTests(p, {trials: TRIALS});
    case "tests-improve": { await aiImprove(p); const c = p.candidate;
      // Fix for me: an improved version that passes more tests and is not much longer is used; otherwise it waits for you
      if (c && c.passRate != null && c.gate !== false && candidateBetter(p)){ adoptCandidate(p, {by: "pt"}); sum.fixed++; await aiRunTests(p, {trials: TRIALS}); }
      return; }
    case "trace-run": return aiTrace(p);
    case "trace-close": return aiCloseTraceGaps(p);
  }
}
function candidateBetter(p){
  const c = p.candidate; if (!c || c.passRate == null) return false;
  const last = arr(p.runs).find(r => r.label !== "candidate"), cr = arr(p.runs).find(r => r.id === c.runId);
  const ids = cr ? [...new Set(cr.results.map(r => r.testId))] : [];
  const base = last ? last.results.filter(r => ids.includes(r.testId)) : [];
  const basePct = base.length ? Math.round(base.filter(r => r.pass).length / base.length * 100) : 0;
  const lenOld = arr(p.pkg.sections).reduce((n, s) => n + str(s.content).length, 0), lenNew = arr(c.sections).reduce((n, s) => n + str(s.content).length, 0);
  return c.passRate > basePct && (!lenOld || lenNew / lenOld < 1.2);
}
function adoptCandidate(p, {by = "you"} = {}){
  const c = p.candidate; if (!c) return;
  snapshot(p, t("test.adopt"), {by});
  const before = new Map(arr(p.pkg.sections).map(s => [s.id, s.content]));
  p.pkg.sections = clone(c.sections); saveVersion(p, c.summary || t("ver.improved"));
  for (const s of p.pkg.sections) if (before.get(s.id) !== s.content){ if (by === "pt") markPT(p, "section:" + s.id, "changed", c.summary || t("ver.improved")); else markRef(p, "section:" + s.id, "changed"); }
  logDecision(p, t("test.adopt"), c.summary, c.passRate != null ? t("test.cand") + " " + c.passRate + "%" : "");
  p.candidate = null; touch(p);
}
/** merge problems that say the same thing (deterministic, no AI) */
function mergeDuplicates(p){
  const open = arr(p.findings).filter(f => OPEN_F.includes(f.status)); let n = 0;
  for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++){
    const a = open[i], b = open[j]; if (b.status === "done" || a.status === "done") continue;
    // the same problem about the same items: similar words alone are not enough ("R3 is vague" and "R7 is vague" are two problems)
    const ta = findingTargets(p, a).slice().sort().join("|"), tb = findingTargets(p, b).slice().sort().join("|");
    if ((a.section || "") === (b.section || "") && ta === tb && similar(a.issue, b.issue)){ b.status = "done"; b.doneAt = now(); b.dupOf = a.id; b.audit = arr(b.audit); b.audit.push({at: now(), what: t("fin.dup", {x: a.id}), by: "PT"}); n++; }
  }
  return n;
}
async function finishAutopilot(p){
  const F = UI.finish; if (!F) return;
  F.step = "run"; F.startAct = arr(p.acts).length ? p.acts[p.acts.length - 1].id : null; F.startAt = now();
  const sum = F.sum = {fixed: 0, needYou: 0, updated: 0, cleared: 0, merged: 0, rolled: 0, changed: new Set(), groups: []};
  { const rp = addRestore(p, {kind: "manual", label: t("fin.rp")}); const last = arr(p.restore).slice(-1)[0]; F.rp = rp ? rp.id : last ? last.id : null; }
  actOpen(p, t("fin.merge"), {by: "pt"}); sum.merged = mergeDuplicates(p); actClose(p.id);
  render();
  for (const g of F.plan.groups.filter(x => x.on)){
    if (F.stop) break;
    g.state = "running"; render();
    const fixing = ["finding-fix","lint-fix","tests-improve"].includes(g.fix);
    const blockBefore = queueCounts(p).block, snap0 = fixing ? JSON.stringify(p) : null;
    try{ await finishRun1(p, g, sum); g.state = "done"; }catch(e){ g.state = "failed"; onAppError(e && e.message, "finish:" + g.fix); }
    // stop rule: a fixing pass that leaves more blocking items than before is taken back (from the state before it, not from the Undo list)
    if (fixing && queueCounts(p).block > blockBefore){
      actOpen(p, t("fin.rolledact"), {by: "pt"});
      const back = JSON.parse(snap0);
      for (const k of ["acts","activity","restore","versions","versionNo","runs"]) back[k] = p[k];   // history stays; a new draft number is never reused
      replaceInPlace(p, back);
      actClose(p.id);
      logAct(p, t("fin.rolledact"), {important: true, kind: "fix"});
      g.state = "rolled"; sum.rolled++;
    }
    sum.groups.push({fix: g.fix, state: g.state});
    render();
  }
  F.step = "decide"; F.list = finishDecisions(p).map(x => x.key); F.i = 0;
  // "Approve, I'll check each change": the changes PT made come first, each with its Undo
  if (F.checkEach) UI.modal = {kind: "runreview", since: F.startAt, st: F.stage || null};
  logAct(p, t("fin.log", {a: sum.fixed, b: sum.updated, c: F.list.length}), {important: true, kind: "fix"});
  touch(p); render();
}
/** the decisions that need you, most important first; PT's own decisions come as batches by kind */
function finishDecisions(p){
  const F = UI.finish, ran = !!(F && F.sum), sid = F && F.stage;
  // marks "may need updating" are PT's work (autopilot); after it ran, the ones it could not decide come to you
  return queueOf(p).filter(x => (!sid || x.stage === sid) && ((youOpen(x)) ? !(x.who === "pt" && x.fix) : x.cls === "check" && (ran || !["flag","fwait"].includes(x.kind))));
}
function scrollToFinish(){ setTimeout(() => { const el = document.querySelector("[data-anchor=finish]"); const m = document.querySelector(".main"); if (el && m) m.scrollTop += el.getBoundingClientRect().top - m.getBoundingClientRect().top - 12; }, 30); }

/* ---------- the options of one decision ---------- */
/** ★ (the recommended one, Enter), alternatives (1, 2, 3), later (L) and won't fix (W) where they make sense */
function qOptions(p, x){
  const O = [], o = (label, run, extra = {}) => O.push(Object.assign({label, run}, extra));
  const [k, id] = x.ref.split(":");
  switch (x.kind){
    case "ns": o(t("q.o.writens"), () => ACTIONS["edit-ns"](), {star: true, opens: true}); if (x.fix === "clarify") o(t("q.o.nsfromidea"), () => aiClarify(p)); break;
    case "nsdecide": o(t("q.o.nsok"), () => { if (p.nsDraft){ p.northStar = Object.assign({}, p.northStar, p.nsDraft); p.nsDraft = null; } p.nsAssumed = false; markRef(p, "ns", "confirmed"); logDecision(p, t("ns.title"), p.northStar.goal, t("dec.nsaccepted")); }, {star: true}); o(t("btn.edit"), () => ACTIONS["edit-ns"](), {opens: true}); break;
    case "audience": for (const [lbl, c0, e0] of [["q.o.aud.me", false, false], ["q.o.aud.cust", true, false], ["q.o.aud.eu", true, true]]) o(t(lbl), () => { p.audience = {customers: c0, eu: e0}; markRef(p, "audience", "decided"); logAct(p, t("act.audience", {x: "customers=" + c0 + ", eu=" + e0}), {step: "capture"}); }); break;
    case "crit": case "qa": case "req": o(t("q.o.keep"), () => { if (x.kind === "crit"){ const c = critById(p, id); if (c) c.st = "ok"; } else confirmItem(p, x.ref); markRef(p, x.ref, "confirmed"); }, {star: true, batch: true}); o(t("q.o.change"), () => goRef(x.ref), {opens: true}); break;
    case "crit-unchecked": case "crit-recheck": o(t("q.o.checknow"), () => { goRef("loop"); return loopStart(p); }, {star: true, opens: true}); o(t("q.o.judgeown"), () => { UI.boardF = "todo"; goRef("exboard"); }, {opens: true}); break;
    case "never-fail": o(t("q.o.lookat"), () => { UI.testTab = "runs"; goRef("test"); }, {star: true, opens: true}); break;
    case "judge-low": o(t("q.o.lookdis"), () => goRef("extests"), {star: true, opens: true}); break;
    case "crit-unclear": o(t("q.o.sharpen"), () => aiDraftCriteria(p, {link: false}), {star: true}); o(t("btn.edit"), () => goRef(x.ref), {opens: true}); break;
    case "pq": { const q = arr(p.pendingQs).find(y => y.id === id); if (q){ q.options.forEach((opt, i) => o(opt, () => answerQ(p, q.id, {choice: i}), {star: i === q.recommended && !q.hard, why: i === q.recommended ? q.recWhy : ""})); o(t("q.o.ownanswer"), () => goRef(x.ref), {opens: true}); } break; }
    case "dims": o(t("q.o.askmore"), () => aiInterview(p), {star: true}); o(t("q.o.enough"), () => { p.interviewStopped = true; }); break;
    case "assumption": { const a = arr(p.assumptions).find(y => y.id === id); if (a){ o(t("q.o.as.accept"), () => { a.status = "accepted"; a.reason = t("q.o.as.acceptwhy"); a.acceptedVersion = p.versionNo; markRef(p, x.ref, "decided"); }, {star: true, batch: true}); o(t("q.o.as.valid"), () => ACTIONS["as-validate"]({dataset: {id}}), {opens: true}); o(t("q.o.as.wrong"), () => { UI.cmWish = t("q.o.as.wrongwish", {x: a.text}); ACTIONS["dc-open"](); }, {opens: true}); } break; }
    case "risk": { const r = arr(p.risks).find(y => y.id === id); if (r){ if (r.mitigation) o(t("q.o.risk.mit"), () => { r.status = "mitigated"; markRef(p, x.ref, "decided"); }, {star: true, batch: true}); else o(t("rk.suggest"), () => aiMitigate(p, id), {star: true}); o(t("q.o.risk.accept"), () => ACTIONS["risk-accept"]({dataset: {id}}), {opens: true}); } break; }
    case "archdecide": for (const op of arr(p.arch.options)) o(t("q.o.arch.use", {x: op.name}) + (op.id === p.arch.recommended ? " (" + t("arch.recommended") + ")" : ""), () => ACTIONS["arch-choose"]({dataset: {id: op.id}})); break;
    case "gatefired": o(t("q.o.gate.follow"), () => { setDial(p, "rung", "R" + Math.max(0, gateEffect(p).maxRung)); }); o(t("q.o.gate.override"), () => ACTIONS["gate-override"]({dataset: {g: x.ref.slice(7)}}), {opens: true}); break;
    case "gate": { const gid = x.ref.slice(7), gg = gate(p, gid); if (gg.sug) o(t("q.o.gate.sug", {a: t("eng.ans." + gg.sug.ans)}), () => ACTIONS["gates-accept"]({dataset: {ids: gid}}), {star: true, batch: true, why: gg.sug.evidence}); for (const v of ["yes","no","unknown"]) if (!gg.sug || gg.sug.ans !== v) o(t("eng.ans." + v), () => ACTIONS["gate-set"]({dataset: {g: gid, v}})); break; }
    case "flag": o(t("it.stillok"), () => { unflag(p, x.ref); markRef(p, x.ref, "confirmed"); }, {star: true, batch: true}); o(t("q.o.lookat"), () => goRef(x.ref), {opens: true}); break;
    case "cost": o(t("rd.f.costok"), () => rdFix(p, "cost-ok", "cost"), {opens: true, star: true}); break;
    case "fyou": { const f = arr(p.findings).find(y => y.id === id); if (f){ if (f.proposal) o(t("fx.o.apply"), () => applyProposal(p, f), {star: true}); o(t("fx.o.revise"), () => { UI.itemBox = {ref: findingRef(p, f), k: "refine", text: f.issue + " — " + f.fix + (f.needsYou ? " (" + f.needsYou.why + ")" : ""), round: 0, notes: [], off: {}, edit: {}}; goRef(findingRef(p, f)); }, {opens: true}); o(t("fx.o.edit"), () => { UI.editRef = findingRef(p, f); UI.editStart = {ref: UI.editRef, text: itemSnapshotText(p, UI.editRef)}; goRef(UI.editRef); }, {opens: true}); o(t("fx.o.accept"), () => ACTIONS["finding-accept"]({dataset: {id}}), {opens: true}); } break; }
    case "finding": o(t("rev.fixauto"), () => fixFindings(p, [id]), {star: true}); o(t("rev.fixtogether"), () => { const f = arr(p.findings).find(y => y.id === id); UI.itemBox = {ref: findingRef(p, f), k: "refine", text: f.issue + " — " + f.fix, round: 0, notes: [], off: {}, edit: {}}; goRef(findingRef(p, f)); }, {opens: true}); break;
    case "fstale": o(t("acc.again"), () => ACTIONS["finding-accept"]({dataset: {id}}), {opens: true, star: true}); o(t("rev.reopen"), () => ACTIONS["finding-reopen"]({dataset: {id}})); break;
    case "judge": { const r = arr(p.runs).find(y => y.id === x.run); if (r){ o(t("judge.decidepass"), () => ACTIONS["judge-decide"]({dataset: {run: r.id, x: String(x.xi), v: "pass"}})); o(t("judge.decidefail"), () => ACTIONS["judge-decide"]({dataset: {run: r.id, x: String(x.xi), v: "fail"}})); o(t("q.o.lookat"), () => goRef(x.ref), {opens: true}); } break; }
    case "cand": o(t("test.adopt"), () => adoptCandidate(p), {star: candidateBetter(p)}); o(t("btn.discard"), () => { p.candidate = null; }); break;
    case "concern": o(t("rd.f.done"), () => rdFix(p, "fs-done", x.ref), {star: true, batch: true}); break;
    case "oq": o(t("rd.f.done"), () => rdFix(p, "oq-done", x.ref), {star: true}); break;
    default: if (x.fix) o(t(FIX_LABEL[x.fix] || "rd.f.go"), () => rdFix(p, x.fix, x.ref, x.arg), {star: true}); o(t("rd.goto"), () => goRef(x.ref), {opens: true});
  }
  return O;
}
async function qDo(p, x, i){
  const opts = qOptions(p, x), o = opts[i]; if (!o) return;
  actOpen(p, o.label + " · " + trunc(x.title, 40));
  const r = o.run(); actCloseSoon(p.id);
  if (r && r.then) await r;
  touch(p);
  if (o.opens) return "opened";
  return "done";
}

/* ---------- views ---------- */
function finishView(p){
  const F = UI.finish;
  const exit = `<button class="btn ghost sm" data-a="finish-exit">${ic("x")}${esc(t("fin.exit"))}</button>`;
  if (F.step === "plan"){
    const pl = F.plan, left = weekLeft();
    return `<section class="panel finish" data-anchor="finish"><div class="row"><h2 style="flex:1 1 12em">${ic("bolt")} ${esc(F.stage ? t("fin.titlest", {s: stName(F.stage)}) : t("fin.title"))}</h2>${exit}</div>
      <p class="lead">${esc(t("fin.lead"))}</p>
      ${pl.groups.length ? `<h3>${esc(t("fin.auto", {n: pl.groups.reduce((n, g) => n + g.n, 0)}))}</h3><div class="list">${pl.groups.map((g, i) => `<label class="item"><input type="checkbox" data-a-change="fin-tick" data-i="${i}" ${g.on ? "checked" : ""}><div class="body"><b>${esc(t("fin.g." + g.fix, {n: g.n}) === "fin.g." + g.fix ? t(FIX_LABEL[g.fix] || "rd.f.go") + " (" + g.n + ")" : t("fin.g." + g.fix, {n: g.n}))}</b>${clampHTML(g.items.map(x => x.title).join(" · "), "fg:" + g.fix, {lines: 2, cls: "small muted"})}</div><span class="chip ${g.heavy ? "warn" : ""} tnum">≈ ${g.units}</span></label>`).join("")}</div>` : `<p class="small muted">${esc(t("fin.noauto"))}</p>`}
      <p class="small ${pl.groups.filter(g => g.on).reduce((n, g) => n + g.units, 0) > left ? "warn-t" : "muted"}">${esc(t("fin.cost", {n: pl.groups.filter(g => g.on).reduce((n, g) => n + g.units, 0), l: left}))}</p>
      <h3>${esc(t("fin.yours", {n: pl.you.length + decidedByPT(p).length}))}</h3><p class="small muted">${esc(t("fin.yourssub"))}</p>
      <div class="row">${pl.groups.some(g => g.on) ? `<button class="btn primary lg" data-a="finish-go">${ic("play")}${esc(t("fin.go"))}</button>` : ""}<button class="btn ${pl.groups.some(g => g.on) ? "" : "primary lg"}" data-a="finish-decide">${esc(t("fin.decideonly"))}</button></div></section>`;
  }
  if (F.step === "run"){
    const s = F.sum || {};
    return `<section class="panel finish"><div class="row"><h2 style="flex:1 1 12em">${ic("bolt")} ${esc(t("fin.running"))}</h2><button class="btn sm" data-a="finish-stop">${esc(t("btn.stop"))}</button></div>
      <div class="list">${F.plan.groups.filter(g => g.on).map(g => `<div class="item">${stSlot(g.state === "done" ? "ok" : g.state === "running" ? "cur" : g.state === "failed" || g.state === "rolled" ? "bad" : "todo")}<div class="body"><b>${esc(t("fin.g." + g.fix, {n: g.n}) === "fin.g." + g.fix ? t(FIX_LABEL[g.fix] || "rd.f.go") : t("fin.g." + g.fix, {n: g.n}))}</b>${g.state === "rolled" ? `<span class="small warn-t">${esc(t("fin.rolled"))}</span>` : ""}</div></div>`).join("")}</div>
      <p class="small muted">${esc(t("fin.sofar", {a: s.fixed || 0, b: s.updated || 0, c: s.needYou || 0}))}</p></section>`;
  }
  if (F.step === "decide"){
    const list = F.list.map(k => queueOf(p).find(x => x.key === k)).filter(Boolean);
    const open = list.filter(x => !(F.handled || {})[x.key]);
    if (!open.length){ F.step = "done"; return finishView(p); }
    const i = clamp(F.i, 0, open.length - 1), x = open[i], opts = qOptions(p, x), star = opts.findIndex(o => o.star);
    const like = x.sim ? open.filter(y => y.sim === x.sim && y.kind === x.kind && y.key !== x.key && qOptions(p, y).some(o => o.star && o.batch)) : [];
    return `<section class="panel finish decide" data-anchor="finish"><div class="row"><h2 style="flex:1 1 12em">${esc(t("fin.decision", {i: i + 1, n: open.length}))}</h2><button class="btn ghost sm" data-a="finish-done">${esc(t("fin.skipall"))}</button>${exit}</div>
      <div class="dcard ${x.hard ? "hard" : ""}">${x.hard ? `<div class="hardq">${ic("shield")}<div><b>${esc(t("hq.t"))}</b><p class="small">${esc(t("hq." + (["ns","nsdecide","audience","archdecide","gatefired","pq"].includes(x.kind) ? x.kind : "other")))}</p></div></div>` : ""}<div class="row small muted">${stSlot(x.cls === "block" ? "bad" : x.cls === "check" ? "as" : "warn")}<span>${esc(stName(x.stage))} › ${esc(phName(x.ph))}</span>${x.hard ? `<span class="chip warn">${esc(t("int.hard"))}</span>` : ""}<span style="flex:1"></span><button class="btn xs ghost" data-a="goto-ref" data-ref="${esc(x.ref)}">${esc(t("rd.goto"))}</button></div>
        <h3 class="dtitle">${esc(fullTitle(p, x))}</h3>${x.why ? `<p class="small">${esc(x.why)}</p>` : ""}${finishExamples(p, x)}
        <div class="dopts">${opts.map((o, j) => `<button class="dopt ${j === star ? "star" : ""}" data-a="fin-opt" data-i="${j}" data-key="${esc(x.key)}">${j < 9 ? `<kbd>${j === star ? "↵" : j + 1}</kbd>` : ""}${j === star ? `<span class="star" aria-hidden="true">★</span>` : ""}<span>${esc(o.label)}</span>${o.why ? `<span class="small muted">${esc(o.why)}</span>` : ""}</button>`).join("")}</div>
        <div class="row"><button class="btn sm ghost" data-a="fin-later" data-key="${esc(x.key)}"><kbd>L</kbd> ${esc(t("fin.later"))}</button>${x.kind === "finding" || x.kind === "fyou" ? `<button class="btn sm ghost" data-a="fin-wont" data-key="${esc(x.key)}"><kbd>W</kbd> ${esc(t("fin.wont"))}</button>` : ""}${like.length ? `<button class="btn sm" data-a="fin-alllike" data-key="${esc(x.key)}">${esc(t("fin.alllike", {n: like.length + 1}))}</button>` : ""}<span style="flex:1"></span><button class="btn xs ghost" data-a="fin-nav" data-d="-1" ${i ? "" : "disabled"}>‹</button><button class="btn xs ghost" data-a="fin-nav" data-d="1" ${i < open.length - 1 ? "" : "disabled"}>›</button></div></div>
      <p class="hint">${esc(t("fin.keys"))}</p></section>`;
  }
  // done: the summary
  const s = F.sum || {fixed: 0, updated: 0, needYou: 0}, c = queueCounts(p), ready = copyUnlocked(p);
  return `<section class="panel finish done" data-anchor="finish"><div class="row"><h2 style="flex:1 1 12em">${esc(ready ? t("fin.readyt") : t("fin.donet"))}</h2>${exit}</div>
    <div class="sumgrid"><div><b class="tnum">${s.fixed || 0}</b><span>${esc(t("fin.s.fixed"))}</span></div><div><b class="tnum">${s.updated || 0}</b><span>${esc(t("fin.s.updated"))}</span></div><div><b class="tnum">${Object.keys(F.handled || {}).length}</b><span>${esc(t("fin.s.decided"))}</span></div><div><b class="tnum">${c.block}</b><span>${esc(t("fin.s.block"))}</span></div></div>
    ${ready ? `<p>${esc(t("fin.ready"))}</p>` : c.block ? `<p class="small">${esc(t("fin.stillblock", {n: c.block}))}</p><div class="list">${blockingItems(p).slice(0, 8).map(x => `<div class="item">${stSlot("bad")}<div class="body"><button class="linkish" data-a="goto-ref" data-ref="${esc(x.ref)}">${esc(x.title)}</button><span class="small muted">${esc(x.why)}</span></div></div>`).join("")}</div>` : ""}
    <div class="row">${ready ? `<button class="btn primary lg" data-a="goto" data-ph="release">${ic("play")}${esc(t("fin.topublish"))}</button>` : `<button class="btn primary" data-a="finish-open">${esc(t("fin.again"))}</button>`}${F.startAt ? `<button class="btn" data-a="finish-undoall">${ic("undo")}${esc(t("fin.undoall"))}</button>` : ""}</div></section>`;
}
/** a decision about a rule shows the examples behind it, one Good and one Not good where there are */
function finishExamples(p, x){
  if (!str(x.ref).startsWith("crit:")) return "";
  const c = critById(p, x.ref.slice(5)); if (!c) return "";
  const es = [...new Set([...arr(c.exIds), ...arr(c.checked)])].map(id => exById(p, id)).filter(Boolean);
  const pick = [es.find(e => e.verdict === "good"), es.find(e => e.verdict === "bad")].filter(Boolean);
  if (!pick.length) return "";
  return `<div class="fexpair">${pick.map(e => `<div class="fex ${e.verdict}"><div class="row small"><span class="iid mono">${esc(e.id)}</span>${chip(t(e.verdict === "good" ? "vd.good" : "vd.bad"), e.verdict === "good" ? "ok" : "crit")}</div>${clampHTML(str(e.output) || exTitle(e), "fx:" + e.id, {lines: 4, cls: "small prew"})}${e.why ? `<span class="small muted">${esc(e.why)}</span>` : ""}</div>`).join("")}</div>`;
}
function fullTitle(p, x){ const it = /:/.test(x.ref) ? itemByRef(p, x.ref) : null; if (x.kind === "finding"){ const f = arr(p.findings).find(y => "finding:" + y.id === x.ref); if (f) return f.issue; } return it && it.title && it.title.length > x.title.length ? it.title : x.title; }
/* ---------- the overview: the queue next to the map ---------- */
function homeView(p){
  const tab = UI.qTab || "you", q = queueOf(p);
  const groups = {you: q.filter(x => youOpen(x)), check: q.filter(x => x.cls === "check" && (!UI.qFilter || x.kind === UI.qFilter)), later: q.filter(x => x.cls === "later")};
  // the order you saw stays the same while you work; new items come at the end
  const ord = UI.qOrder = UI.qOrder && UI.qOrder.pid === p.id ? UI.qOrder : {pid: p.id, keys: {}};
  for (const [g, list] of Object.entries(groups)){ const known = ord.keys[g] = ord.keys[g] || []; for (const x of list) if (!known.includes(x.key)) known.push(x.key); list.sort((a, b) => known.indexOf(a.key) - known.indexOf(b.key)); }
  const row = x => { const opts = qOptions(p, x), star = opts.findIndex(o => o.star);
    return `<div class="qrow" id="q-${esc(x.key)}">${stSlot(x.cls === "block" ? "bad" : x.cls === "check" ? "as" : x.cls === "later" ? "todo" : "warn")}<div class="qbody"><button class="qtitle linkish" data-a="q-goto" data-ref="${esc(x.ref)}" data-g="${esc(tab)}" data-clamp="q:${esc(x.key)}" style="--cl:2">${esc(x.title)}</button>${clampHTML(stName(x.stage) + " › " + phName(x.ph) + (x.why ? " · " + x.why : ""), "qw:" + x.key, {lines: 2, cls: "small muted"})}${star >= 0 ? clampHTML(t("q.starline", {x: opts[star].label}), "qs:" + x.key, {lines: 2, cls: "small qstar"}) : ""}</div>
      <div class="qacts">${x.who === "pt" && x.fix && x.cls !== "check" ? `<span class="chip acc">${esc(t("q.ptcan"))}</span>` : ""}${star >= 0 ? `<button class="btn xs primary" data-a="q-do" data-key="${esc(x.key)}" data-i="${star}" title="${esc(opts[star].label)}">${esc(t("q.usestar"))}</button>` : opts.length ? `<button class="btn xs" data-a="q-goto" data-ref="${esc(x.ref)}" data-g="${esc(tab)}">${esc(t("q.decide"))}</button>` : ""}</div></div>`; };
  const doneList = Object.entries(p.marks || {}).sort((a, b) => str(b[1].at).localeCompare(str(a[1].at))).slice(0, 30);
  const body = tab === "done" ? (doneList.length ? doneList.map(([ref, m]) => `<div class="qrow">${stSlot("ok")}<div class="qbody"><button class="qtitle linkish" data-a="goto-ref" data-ref="${esc(ref)}">${esc(refLabel(p, ref))}</button>${clampHTML((m.by === "pt" ? t("mk.pt." + m.w) : t("mk." + m.w)) + " · " + fmtDate(m.at) + (m.why ? " · " + m.why : ""), "qd:" + ref, {lines: 2, cls: "small muted"})}</div><div class="qacts"><button class="btn xs ghost" data-a="mark-show" data-ref="${esc(ref)}">${esc(t("q.what"))}</button></div></div>`).join("") : `<p class="small muted">${esc(t("q.nodone"))}</p>`)
    : groups[tab].length ? groups[tab].slice(0, UI.qMore ? 400 : 40).map(row).join("") + (groups[tab].length > 40 && !UI.qMore ? `<div class="row"><button class="btn sm ghost" data-a="q-more">${esc(t("xp.more", {n: groups[tab].length - 40}))}</button></div>` : "") : `<p class="small muted">${esc(t("q.empty." + tab))}</p>`;
  const c = queueCounts(p), plan = finishPlan(p);
  return `<div class="home14">${typeof bringTo14Card === "function" ? bringTo14Card(p) : ""}
    <section class="panel ovq" data-anchor="queue"><div class="row"><h2 style="flex:1 1 12em">${esc(t("home.queue"))}</h2>${c.block || c.should || decidedByPT(p).length ? `<button class="btn primary" data-a="finish-open">${ic("bolt")}${esc(t("fin.btnn", {n: c.block + c.should, u: plan.units}))}</button>` : ""}</div>
      <div class="tabs" role="tablist">${[["you", groups.you.length], ["check", groups.check.length], ["later", groups.later.length], ["done", doneList.length]].map(([k, n]) => `<button class="tab ${tab === k ? "on" : ""}" role="tab" aria-selected="${tab === k}" data-a="q-tab" data-v="${k}">${esc(t("q.tab." + k))} · ${n}</button>`).join("")}</div>
      ${tab === "check" && groups.check.length > 1 ? `<div class="row"><button class="btn sm" data-a="dec-batch" data-st="">${esc(t("gate.decided", {n: groups.check.length}))}</button></div>` : ""}
      ${levelOf(p) === "pro" && tab !== "done" ? `<div class="seg" role="group" aria-label="${esc(t("qt.view"))}">${["list","table"].map(v => `<button class="${(UI.qView || "list") === v ? "on" : ""}" data-a="q-view" data-v="${v}">${esc(t("qt.v." + v))}</button>`).join("")}</div>` : ""}
      ${levelOf(p) === "pro" && UI.qView === "table" && tab !== "done" ? queueTable(p, groups[tab], tab) : `<div class="qlist">${body}</div>`}</section>
    <section class="panel ovmap" data-anchor="ovmap">${typeof overviewMap === "function" ? overviewMap(p) : ""}</section>
  </div>`;
}
/* "check each change": what PT changed in this run, each with its Undo (a page) */
MODAL14.runreview = (m, p, hd) => {
  actClose(p.id);
  const acts = arr(p.acts).filter(a => a.by === "pt" && a.at >= m.since && !a.undoOf);
  const txt = v => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 1);
  return `${hd(t("rr.title", {n: acts.length}))}<p class="sub">${esc(t("rr.sub"))}</p>
    ${acts.length ? `<div class="list">${acts.map(a => `<div class="item" data-seen="${esc(a.id)}"><div class="body"><div class="row"><b style="flex:1 1 12em">${esc(a.label)}</b><span class="small muted">${esc(fmtDate(a.at))}</span></div><span class="small muted">${esc(arr(a.refs).map(r => refLabel(p, r)).slice(0, 6).join(" · "))}</span>${arr(a.patch).length ? `<details class="rvdiff"><summary class="small">${esc(t("rr.show", {n: a.patch.length}))}</summary>${a.patch.slice(0, 6).map(e => `<div class="diff">${lineDiff(txt(e.before), txt(e.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("")}</details>` : ""}</div>${a.undone ? `<span class="small muted">${esc(t("mk.undone"))}</span>` : `<button class="btn xs" data-a="act-undo" data-id="${esc(a.id)}">${ic("undo")}${esc(t("btn.undo"))}</button>`}</div>`).join("")}</div>` : `<p class="small muted">${esc(t("rr.none"))}</p>`}
    <div class="row end rvbar"><span class="small muted" id="seen-count" data-n="${acts.length}">${esc(t("pg.seen", {a: Object.keys(m.seen || {}).length, b: acts.length}))}</span><span style="flex:1"></span><button class="btn primary" data-a="modal-close">${ic("check")}${esc(t("rr.keep"))}</button></div>`;
};
/* "PT decided N things · check them": one list, accept all except the ones you untick */
MODAL14.batch = (m, p, hd) => {
  const list = decidedByPT(p, m.st || null), off = m.off || {};
  // a changed list starts the "viewed" count again
  const sig = list.map(x => x.key).join("|"); if (m.sig !== sig){ m.sig = sig; m.seen = {}; m.preview = false; }
  const on = list.filter(x => !off[x.key]);
  const star = x => { const os = qOptions(p, x), k = os.findIndex(o => o.star && o.batch); return k >= 0 ? os[k].label : ""; };
  if (m.preview) return `${hd(t("batch.preview", {n: on.length}))}<p class="sub">${esc(t("batch.previewsub"))}</p>
    <div class="list">${on.map(x => `<div class="item">${stSlot("as")}<div class="body">${clampHTML(x.title, "bp:" + x.key, {lines: 2})}<span class="small"><b>→ ${esc(star(x) || t("batch.nochange"))}</b></span></div></div>`).join("")}</div>
    <div class="row end rvbar"><button class="btn ghost" data-a="batch-back">← ${esc(t("btn.back"))}</button><span style="flex:1"></span><button class="btn primary" data-a="batch-apply">${ic("check")}${esc(t("batch.apply", {n: on.length}))}</button></div>`;
  return `${hd(t("batch.title", {n: list.length}))}<p class="sub">${esc(t("batch.sub"))}</p>
    <div class="list">${list.map(x => `<label class="item" data-seen="${esc(x.key)}"><input type="checkbox" data-a-change="batch-tick" data-k="${esc(x.key)}" ${off[x.key] ? "" : "checked"}><div class="body">${clampHTML(x.title, "bt:" + x.key, {lines: 3, tag: "b"})}${clampHTML(stName(x.stage) + " › " + phName(x.ph) + " · " + x.why, "bw:" + x.key, {lines: 2, cls: "small muted"})}</div><button class="btn xs ghost" data-a="q-goto" data-ref="${esc(x.ref)}">${esc(t("rd.goto"))}</button><button class="btn xs ghost" data-a="mark-show" data-ref="${esc(x.ref)}">${esc(t("q.what"))}</button></label>`).join("")}</div>
    <div class="row end rvbar"><span class="small muted" id="seen-count" data-n="${list.length}">${esc(t("pg.seen", {a: Object.keys(m.seen || {}).length, b: list.length}))}</span><span style="flex:1"></span><button class="btn ghost" data-a="modal-close">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="batch-preview" ${on.length ? "" : "disabled"}>${esc(t("batch.topreview", {n: on.length}))} →</button></div>`;
};
Object.assign(ACTIONS, {
  "finish-open": el => { const p = curP(); const sid = el && el.dataset && el.dataset.st || null; UI.home = false; UI.finishPaused = null; UI.finish = {pid: p.id, step: "plan", plan: finishPlan(p, sid), stage: sid}; render(); scrollToFinish(); },
  "finish-exit": () => { UI.finish = null; UI.finishPaused = null; render(); },
  "finish-go": () => { const p = curP(); const F = UI.finish; if (!F) return; const units = F.plan.groups.filter(g => g.on).reduce((n, g) => n + g.units, 0); costGuard(p, "finish", () => finishAutopilot(p), units); },
  "finish-stop": () => { if (UI.finish) UI.finish.stop = true; for (const [k, j] of AI.running) if (j.pid === UI.pid) j.ctl.abort(); render(); },
  "finish-decide": () => { const p = curP(); const F = UI.finish; F.step = "decide"; F.list = finishDecisions(p).map(x => x.key); F.i = 0; render(); scrollToFinish(); },
  "finish-done": () => { if (UI.finish){ UI.finish.step = "done"; render(); } },
  "finish-undoall": () => { const p = curP(); const F = UI.finish; if (!F || !F.startAt) return; confirmBox(t("fin.undoall"), t("fin.undoallq"), t("fin.undoall"), async () => { if (F.rp && arr(p.restore).some(r => r.id === F.rp)){ UI.finish = null; await doRestore(p, F.rp); return; } const made = arr(p.acts).filter(a => a.at >= F.startAt && !a.undone && !a.undoOf).reverse(); for (const a of made) undoAct(p, a.id); UI.finish = null; render(); }); },
  "fin-opt": async el => { const p = curP(); const F = UI.finish; const x = queueOf(p).find(y => y.key === el.dataset.key); if (!x) return; const r = await qDo(p, x, num(el.dataset.i)); F.handled = F.handled || {}; if (r !== "opened") F.handled[x.key] = true; render(); },
  "fin-later": el => { const p = curP(); const F = UI.finish; const x = queueOf(p).find(y => y.key === el.dataset.key); if (!x) return; F.handled = F.handled || {}; F.handled[x.key] = "later"; p.later = p.later || {}; p.later[x.key] = now(); touch(p); render(); },
  "fin-wont": el => { const p = curP(); const x = queueOf(p).find(y => y.key === el.dataset.key); if (!x) return; const id = x.ref.split(":")[1]; promptBox(t("fin.wont"), {ph: t("acc.ph"), help: t("fin.wonthelp"), yes: t("fin.wont")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } const f = arr(p.findings).find(y => y.id === id); if (f){ f.status = "wontfix"; f.reason = str(v).trim(); f.audit = arr(f.audit); f.audit.push({at: now(), what: t("fin.wontdone") + ": " + f.reason, by: wsLabel(WS.name)}); markRef(p, x.ref, "decided"); } UI.finish.handled = UI.finish.handled || {}; UI.finish.handled[x.key] = true; touch(p); render(); }); },
  "fin-alllike": async el => { const p = curP(); const F = UI.finish; const x = queueOf(p).find(y => y.key === el.dataset.key); if (!x) return; const same = queueOf(p).filter(y => y.sim === x.sim && y.kind === x.kind && !(F.handled || {})[y.key]); F.handled = F.handled || {}; actOpen(p, t("fin.alllike", {n: same.length})); for (const y of same){ const os = qOptions(p, y), k = os.findIndex(o => o.star && o.batch); if (k >= 0){ os[k].run(); F.handled[y.key] = true; } } actClose(p.id); touch(p); render(); toastUndo(t("fin.alllikedone", {n: same.length})); },
  "fin-nav": el => { const F = UI.finish; if (!F) return; F.i = Math.max(0, num(F.i, 0) + num(el.dataset.d)); render(); },
  "q-tab": el => { UI.qTab = el.dataset.v; UI.qFilter = null; UI.qMore = false; if (UI.qSel2) UI.qSel2.keys = {}; render(); },
  "q-more": () => { UI.qMore = true; render(); },
  "q-goto": el => { const p = curP(); const tab = el.dataset.g || UI.qTab || "you"; const q = queueOf(p); const list = (tab === "check" ? q.filter(x => x.cls === "check") : tab === "later" ? q.filter(x => x.cls === "later") : q.filter(x => youOpen(x))).map(x => x.ref); UI.modal = null; goRef(el.dataset.ref, {list}); },
  "q-do": async el => { const p = curP(); const x = queueOf(p).find(y => y.key === el.dataset.key); if (!x) return; const r = await qDo(p, x, num(el.dataset.i)); if (r !== "opened") toastUndo(t("q.done")); render(); },
  "batch-preview": () => { const m = UI.modal; if (m && m.kind === "batch"){ m.preview = true; render(); const mn = document.querySelector(".main"); if (mn) mn.scrollTop = 0; } },
  "batch-back": () => { const m = UI.modal; if (m && m.kind === "batch"){ m.preview = false; render(); } },
  "dec-batch": el => { UI.modal = {kind: "batch", st: el.dataset.st || null, off: {}, wide: true}; render(); },
  "batch-apply": () => { const p = curP(); const m = UI.modal; if (!m) return; const list = decidedByPT(p, m.st || null).filter(x => !(m.off || {})[x.key]); actOpen(p, t("batch.apply", {n: list.length})); let n = 0; for (const x of list){ const os = qOptions(p, x), k = os.findIndex(o => o.star && o.batch); if (k >= 0){ os[k].run(); n++; } } actClose(p.id); UI.modal = null; touch(p); render(); toastUndo(t("batch.done", {n})); }
});
Object.assign(CHANGES, {
  "fin-tick": el => { const F = UI.finish; if (F && F.plan.groups[num(el.dataset.i)]) F.plan.groups[num(el.dataset.i)].on = el.checked; render(); },
  "batch-tick": el => { const m = UI.modal; if (!m) return; m.off = m.off || {}; m.off[el.dataset.k] = !el.checked; render(); }
});
/* keys in the decision screen: Enter = ★, 1–9 = an answer, L = later, W = won't fix, ← → = previous / next */
document.addEventListener("keydown", e => {
  if (e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey) return;
  const F = UI.finish; if (!F || F.step !== "decide" || UI.modal || UI.palette) return;
  const a = document.activeElement; if (a && a.matches && a.matches("input,textarea,select,[contenteditable]")) return;
  const card = document.querySelector(".finish.decide"); if (!card) return;
  const opts = [...card.querySelectorAll(".dopt")], star = card.querySelector(".dopt.star");
  if (e.key === "Enter" && star && !(a && a.matches && a.matches("button"))){ e.preventDefault(); star.click(); return; }
  if (/^[1-9]$/.test(e.key) && opts[num(e.key) - 1]){ e.preventDefault(); opts[num(e.key) - 1].click(); return; }
  if (e.key.toLowerCase() === "l"){ const b = card.querySelector("[data-a=fin-later]"); if (b){ e.preventDefault(); b.click(); } return; }
  if (e.key.toLowerCase() === "w"){ const b = card.querySelector("[data-a=fin-wont]"); if (b){ e.preventDefault(); b.click(); } return; }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); ACTIONS["fin-nav"]({dataset: {d: e.key === "ArrowRight" ? "1" : "-1"}}); }
});
