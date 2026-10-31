/* ===================== 1.4.1 ONE-TIME TIDY-UP =====================
   Runs once per project when 1.4.1 first loads it. Everything is one action "PT 1.4.1: one-time tidy-up" (one Undo),
   with a restore point of the state before, and one line in the project log listing what changed. Each step runs on
   its own: a step that fails changes nothing and the others still run. Restore points are never touched. */
/* the design choices you confirmed yourself after 1.4 had called your choice "an automatic placeholder"
   (Watch Photo editor tool: you confirmed "Fixed workflow" (o3) on 21 Oct 2026) */
const M141_ARCH_OWN = {"p-mvf7qpwqud0aj": {opt: "o3", d: "2026-10-21"}};
const M141_PLACEHOLDER = /automatic placeholder|automatischer Platzhalter|自动占位/;
const M141_ARCHLOG = /\s·\s(Design choice set to the one that was drawn|Entwurfswahl auf den gezeichneten gesetzt|设计选择改为已绘制的方案)[:：][^·]*?(?=\s·\s|$)/;
const M14_LOGHEAD = /^(PT 1\.4 one-time tidy-up \(|PT 1\.4 einmalige Bereinigung \(|PT 1\.4 一次性整理（)(\d+)/;

/** a criterion text that 1.4.0 cut with "…" is restored from the test it came from, when that test still has the full text */
function m141Uncut(p, c, k){
  const s = str(c[k]); if (!/…$/.test(s) || !c.fromTest) return false;
  const tc = arr(p.tests).find(x => x && x.id === c.fromTest); if (!tc) return false;
  const head = s.replace(/…$/, "").trim(); if (head.length < 8) return false;
  const cands = [tc.title, tc.input, ...arr(tc.criteria), arr(tc.criteria).join("; ")].map(x => critClean(str(x), k)).filter(Boolean);
  const full = cands.find(x => x.length > head.length && x.startsWith(head));
  if (!full) return false;
  c[k] = full; return true;
}

function migrate141(p){
  if (!p || p.m141) return null;
  const done = [], errs = [], pre = clone(p);
  const step = (name, fn) => { try{ fn(); }catch(e){ errs.push(name); onAppError(e && e.message, "migrate141:" + name); } };
  actOpen(p, t("m141.act"), {by: "pt"});
  const g = p.goal && typeof p.goal === "object" ? goalOf(p) : null;
  // 1. goal criteria: the frame words ("When …", "the result …") come out of the stored text, cut texts come back, every rule gets a version
  if (g) step("criteria", () => {
    let nClean = 0, nUncut = 0, nVer = 0;
    for (const c of g.criteria){
      if (!c || typeof c !== "object") continue;
      if (m141Uncut(p, c, "when")) nUncut++;
      if (m141Uncut(p, c, "then")) nUncut++;
      if (critNormalize(c)) nClean++;
      if (!num(c.v)){ c.v = 1; nVer++; }
      c.hist = arr(c.hist);
    }
    if (nClean) done.push(t("m141.clean", {n: nClean}));
    if (nUncut) done.push(t("m141.uncut", {n: nUncut}));
    if (nVer) done.push(t("m141.ver", {n: nVer}));
  });
  // 2. examples say where they came from (you, PT, a photo, a test run …) for the examples board
  if (g) step("examples", () => {
    let nEx = 0;
    for (const e of g.examples){ if (!e || typeof e !== "object") continue; if (!EX_SRC.includes(e.src)){ e.src = exSrc(e); nEx++; } e.files = arr(e.files); }
    if (nEx) done.push(t("m141.ex", {n: nEx}));
  });
  // 3. a design choice you confirmed yourself: yours, and PT's wrong reason ("an automatic placeholder") goes from the mark and the log
  step("arch", () => {
    const own = M141_ARCH_OWN[p.id], ar = p.arch || {}, mk = p.marks && p.marks["arch:choice"];
    if (!own || ar.chosen !== own.opt || !mk || mk.by !== "pt" || !M141_PLACEHOLDER.test(str(mk.why))) return;
    ar.chosenAssumed = false;
    p.marks["arch:choice"] = {w: "decided", at: now()};   // yours: no PT reason, no PT history
    for (const a of arr(p.activity)){
      const s = str(a.text); if (!M14_LOGHEAD.test(s) || !M141_ARCHLOG.test(s)) continue;
      if (!a.was) a.was = s;   // the wording before is kept with the entry (not shown)
      a.text = s.replace(M141_ARCHLOG, "").replace(M14_LOGHEAD, (m0, h, n) => h + Math.max(0, num(n) - 1));
    }
    const o = arr(ar.options).find(x => x.id === ar.chosen), name = (o && o.name) || ar.chosen;
    p.decisions = arr(p.decisions); logDecision(p, t("arch.title"), name, t("m141.arch.dec", {d: fmtDay(own.d)}));
    done.push(t("m141.arch", {x: name}));
  });
  // 4. the problem statements from Understand (reframes) become the problem cards; the ones you chose count as "fits"
  step("problem", () => {
    const rf = arr(p.understand && p.understand.reframes).filter(x => x && str(x.text).trim());
    if (!rf.length || problemRead(p).cards.length) return;
    const P = problemOf(p);
    for (const r of rf) P.cards.push({id: uid("pc"), text: str(r.text), differently: str(r.differently), verdict: r.chosen ? "good" : "", by: "pt", at: now(), fromReframe: r.id});
    done.push(t("m141.pc", {n: P.cards.length, k: P.cards.filter(c => c.verdict === "good").length}));
  });
  const a = actClose(p.id); if (a) a.m141 = true;
  if (done.length){ const rp = addRestore(p, {kind: "migrate", label: t("m141.rp"), source: pre}); if (a && rp) a.rp = rp.id; }
  p.m141 = {at: now(), n: done.length};   // outside the action: an Undo of the tidy-up does not make it run again
  if (errs.length) p.m141.errs = errs;
  actRebase(p);
  if (done.length) logAct(p, t("m141.log", {n: done.length}) + ": " + done.join(" · "), {important: true, kind: "edit"});
  return done;
}
/** workspace: people who already use PT are not asked for their level again (it stays what it was) */
function migrate141ws(){
  const s = WS && WS.settings; if (!s || s.m141) return false;
  // this runs at the first start of 1.4.1: a workspace that already has projects belongs to someone who uses PT
  if (arr(WS.projects).length && !s.levelAsked) s.levelAsked = "m141";
  s.m141 = now(); return true;
}
/* Undo of the tidy-up also brings back the 1.4 log line it shortened (the log itself is not part of an action) */
{ const orig = undoAct; undoAct = function(p, id){
    const a = p && arr(p.acts).find(x => x.id === id); const ok = orig(p, id);
    try{ if (ok && a && (a.m141 || a.label === t("m141.act"))) for (const x of arr(p.activity)) if (x.was){ x.text = x.was; delete x.was; } }catch(e){}
    return ok; }; }
