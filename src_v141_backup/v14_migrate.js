/* ===================== 1.4 ONE-TIME REPAIRS =====================
   Run once per project when 1.4 first loads it. Everything is one action "PT 1.4: one-time repairs" (one Undo),
   written to the project log, and what PT decided about content is marked "Decided by PT" so it shows in To check.
   Nothing is deleted: legacy links are parked next to the item (oldReqIds, dims), restore points are never touched. */
const M14_PHANTOM = {"fd-mvfrw5tsiqi89": "m14.phantom", "fd-mvfvolde5gkn6": "m14.blind"};
function migrate14(p){
  if (!p || p.m14) return null;
  const done = [];
  const lang = p.lang, pre = clone(p);
  actOpen(p, t("m14.act"), {by: "pt"});
  try{
    // 1. the content language is stored (an empty project takes the workspace language)
    if (lang) done.push(t("m14.lang", {l: langLabel(lang)}));
    // 2. assumptions you confirmed that 1.3 left in "testing" count as validated
    const acts = arr(p.activity);
    for (const a of arr(p.assumptions).filter(x => x.status === "testing")){
      const hit = acts.find(x => /^(Confirmed|Bestätigt|已确认)/.test(str(x.text)) && str(x.text).includes(a.id));
      if (!hit) continue;
      a.status = "validated"; a.test = str(a.test) || t("m14.youconfirmed", {d: fmtDate(hit.at)});
      markPT(p, "assumption:" + a.id, "decided", t("m14.as.why", {d: fmtDate(hit.at)}));
      done.push(t("m14.as", {x: trunc(a.text, 60)}));
    }
    // 3. an automatic placeholder choice that differs from the design PT drew: the drawn design is the choice
    const ar = p.arch || {};
    if (ar.chosenAssumed && ar.chosen && ar.recommended && ar.chosen !== ar.recommended && arr(ar.options).some(o => o.id === ar.recommended) && arr(ar.components).length){
      const from = (arr(ar.options).find(o => o.id === ar.chosen) || {}).name || ar.chosen, to = (arr(ar.options).find(o => o.id === ar.recommended) || {}).name || ar.recommended;
      ar.chosen = ar.recommended; ar.drawnFor = ar.recommended; ar.chosenAssumed = false;
      markPT(p, "arch:choice", "decided", t("m14.arch.why", {a: from, b: to}));
      done.push(t("m14.arch", {a: from, b: to}));
    }
    // 4. problems PT itself created (its own cut-off, the old checker that saw only part of the text) are closed as false alarms
    for (const f of arr(p.findings)){
      const k = M14_PHANTOM[f.id]; if (!k || !OPEN_F.includes(f.status)) continue;
      f.status = "wontfix"; f.reason = t(k); f.audit = arr(f.audit); f.audit.push({at: now(), what: t("m14.closed") + ": " + t(k), by: "PT"});
      markPT(p, "finding:" + f.id, "decided", t(k));
      done.push(t("m14.phantomx", {x: trunc(f.issue, 60)}));
    }
    // 5. v1 problems marked "fixed" that 1.0 turned into "waiting" (no before/after to check): finished work stays finished
    const legacy = arr(p.findings).filter(f => f.status === "waiting" && !str(f.before) && !str(f.after) && !arr(f.audit).length);
    for (const f of legacy){ f.status = "done"; f.legacy = true; f.doneAt = f.doneAt || f.at || now(); f.fixedBy = "you"; f.audit = [{at: now(), what: t("m14.legacy"), by: "PT"}]; }
    if (legacy.length) done.push(t("m14.legacyn", {n: legacy.length}));
    // 6. every open problem knows which items it is about (so "Fix for me" changes the right ones)
    let tg = 0;
    for (const f of arr(p.findings).filter(x => OPEN_F.includes(x.status) && !arr(x.targets).length)){
      const parent = f.from && arr(p.findings).find(y => y.id === f.from);
      f.targets = parent && arr(parent.targets).length ? parent.targets.slice() : findingTargets(p, f);
      if (!f.step && parent) f.step = parent.step;
      tg++;
    }
    if (tg) done.push(t("m14.targets", {n: tg}));
    // 7. links to requirements that no longer exist are parked, not lost
    const R = new Set(arr(p.requirements).map(r => r.id));
    let park = 0;
    for (const x of arr(p.tests)){ const bad = arr(x.reqIds).filter(r => !R.has(r)); if (!bad.length) continue; x.oldReqIds = [...new Set([...arr(x.oldReqIds), ...bad])]; x.reqIds = arr(x.reqIds).filter(r => R.has(r)); park++; }
    for (const s of arr(p.pkg && p.pkg.sections)){ const dimIds = arr(s.reqIds).filter(r => DIMS.some(d => d.id === r)); if (!dimIds.length) continue; s.dims = [...new Set([...arr(s.dims), ...dimIds])]; s.reqIds = arr(s.reqIds).filter(r => !dimIds.includes(r)); park++; }
    if (park) done.push(t("m14.park", {n: park}));
    // 8. steps the 1.0 migration called "finished" while work is open count by what is really there
    let st = 0; for (const [k, v] of Object.entries(p.step || {})) if (v && v.migrated){ delete p.step[k]; st++; }
    if (st) done.push(t("m14.steps", {n: st}));
    // 9. one mark left by a fix that changed nothing (Watch, 19 Oct 23:25, "because North Star")
    const before = arr(p.flags).length;
    p.flags = arr(p.flags).filter(f => !(f.because === "North Star" && str(f.at) >= "2026-10-19T23:25:50" && str(f.at) <= "2026-10-19T23:26:30"));
    if (p.flags.length < before) done.push(t("m14.flags", {n: before - p.flags.length}));
  }catch(e){ onAppError(e && e.message, "migrate14"); }
  const a = actClose(p.id);
  // more than the language changed: a restore point of the state before the repairs (Undo uses it while the repairs are the last action)
  if (done.length > (lang ? 1 : 0)){ const rp = addRestore(p, {kind: "migrate", label: t("m14.rp"), source: pre}); if (a && rp) a.rp = rp.id; }
  p.m14 = {at: now(), n: done.length};   // outside the action: an Undo of the repairs does not make them run again
  actRebase(p);
  if (done.length) logAct(p, t("m14.log", {n: done.length}) + ": " + done.join(" · "), {important: true, kind: "edit"});
  return done;
}
/* the overview card for a project that has no goal criteria yet: PT drafts them from what is already there (cost first) */
function bringTo14Card(p){
  if (!p || goalOf(p).criteria.length || !arr(p.requirements).length || UI.hide14 === p.id) return "";
  const n = COST_EST["crit-draft"] || 8;
  return `<section class="panel b14"><div class="row"><h3 style="flex:1">${ic("spark")} ${esc(t("m14.card.t"))}</h3><button class="iconbtn" data-a="b14-hide" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="small">${esc(t("m14.card", {r: arr(p.requirements).length}))}</p>
    <div class="row">${aiBtn("crit-draft", t("m14.card.go", {n}), "M", {primary: true, key: "goal"})}<span class="hint">${esc(t("m14.card.hint"))}</span></div>${busyHTML("goal")}</section>`;
}
Object.assign(ACTIONS, {
  "b14-hide": () => { UI.hide14 = UI.pid; render(); }
});
