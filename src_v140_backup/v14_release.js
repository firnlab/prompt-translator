/* ===================== 1.4 TOOL STATES: Working copy · Green checkpoint · Live · Publish · Reinstall =====================
   The working copy is what you edit (no number). A green checkpoint is saved by itself whenever nothing blocks.
   Live is the published version (v1, v2 …). Publish only when the goal criteria pass. Reinstall brings an earlier
   published version back live and keeps your working copy. */
function workHash(p){ return hashStr(JSON.stringify([arr(p.pkg.sections).map(s => [s.id, s.content]), arr(goalOf(p).criteria).map(c => [c.id, c.when, c.then]), arr(p.requirements).map(r => [r.id, r.given, r.when, r.then])])); }
/** a green checkpoint whenever nothing blocks and the work differs from the last one (a restore point you can go back to) */
function ensureCheckpoint(p){
  if (!p || !arr(p.pkg.sections).length || !copyUnlocked(p)) return;
  const h = workHash(p); if (p.checkpoint && p.checkpoint.h === h) return;
  const rp = addRestore(p, {kind: "checkpoint", label: t("cp.label", {d: fmtDate(now())})});
  p.checkpoint = {at: now(), h, rp: rp ? rp.id : (p.checkpoint && p.checkpoint.rp) || null, draft: p.versionNo};
  logAct(p, t("act.checkpoint"), {important: true});
  setTimeout(() => touch(p), 0);
}
function changesSinceCheckpoint(p){ if (!p.checkpoint) return null; return arr(p.acts).filter(a => a.at > p.checkpoint.at && !a.undone).length; }
function toolStates(p){
  const cp = p.checkpoint, n = changesSinceCheckpoint(p), live = p.live;
  return `<section class="panel toolstates" id="states14"><h3>${esc(t("ts.title"))}</h3><div class="tsgrid">
    <div class="ts">${stSlot("cur")}<b>${esc(t("ts.wc"))}</b><span class="small muted">${esc(cp ? (n ? t("ts.wc.diff", {n}) : t("ts.wc.same")) : t("ts.wc.none"))}</span></div>
    <div class="ts">${stSlot(cp ? "ok" : "todo")}<b>${esc(t("ts.cp"))}</b><span class="small muted">${esc(cp ? t("ts.cp.at", {d: fmtDate(cp.at)}) : t("ts.cp.none"))}</span>${cp && cp.rp ? `<button class="btn xs ghost" data-a="rp-restore" data-id="${esc(cp.rp)}">${esc(t("ts.cp.back"))}</button>` : ""}</div>
    <div class="ts">${stSlot(live ? "ok" : "todo")}<b>${esc(t("ts.live"))}</b><span class="small muted">${esc(live ? t("ts.live.v", {v: live.v, d: fmtDay(live.since)}) : t("ts.live.none"))}</span></div>
  </div></section>`;
}
function phRelease(p){
  relAckSync(p);
  const rep = p.report, chk = rep && rep.check, pl = p.pilot;
  const nextV = nextRelease(p, releaseKind(arr(p.plan && p.plan.changes)));
  const gate = releaseGate(p), can = !gate.length, g = goalOf(p);
  const repCur = chk && rep.draft === p.versionNo, plCur = pl && pl.draft === p.versionNo;
  const notChecked = g.criteria.filter(c => critResult(p, c.id) === "open"), failing = g.criteria.filter(c => critResult(p, c.id) === "fail");
  const person = arr(p.arch.components).filter(c => c.kind === "platform" || c.kind === "human");
  const youDid = (rep && rep.youDid) || {};
  const line = (ok, label, extra = "") => `<div class="item">${stSlot(ok ? "ok" : "bad")}<div class="body"><span>${label}</span>${extra}</div></div>`;
  const checks = [
    line(copyUnlocked(p), esc(t("pub.c.block")), copyUnlocked(p) ? "" : `<button class="btn xs primary" data-a="finish-open">${esc(t("fin.btn"))}</button>`),
    line(!failing.length || UI.relCritFail, esc(t("pub.c.crit", {a: g.criteria.length - failing.length - notChecked.length, b: g.criteria.length})), failing.length ? `<span class="small warn-t">${esc(failing.map(c => c.id).join(", "))}</span><label class="chk small"><input type="checkbox" data-bind="ui:relCritFail" data-rerender="1" ${UI.relCritFail ? "checked" : ""}>${esc(t("pub.critfailok"))}</label>` : ""),
    notChecked.length ? line(UI.relNotChecked, esc(t("pub.c.notchecked", {n: notChecked.length})), `<span class="small muted">${esc(notChecked.map(c => c.id + " " + trunc(c.then, 40)).join(" · "))}</span><label class="chk small"><input type="checkbox" data-bind="ui:relNotChecked" data-rerender="1" ${UI.relNotChecked ? "checked" : ""}>${esc(t("pub.notcheckedok"))}</label>`) : "",
    line((repCur && chk.ok) || (p.tool.installed && p.tool.installed.draft === p.versionNo) || p.releases.length, esc(t("pub.c.setup")), `${repCur && !chk.ok ? `<span class="small warn-t">${esc(t("rel.repgaps"))}</span>` : ""}<label class="chk small"><input type="checkbox" data-a-change="installed" ${p.tool.installed && p.tool.installed.draft === p.versionNo ? "checked" : ""}>${esc(t("pub.installed"))}</label>${person.length ? `<div class="small">${esc(t("pub.person"))} ${person.map(c => `<label class="chk small" style="display:inline-flex"><input type="checkbox" data-a-change="youdid" data-id="${esc(c.id)}" ${youDid[c.id] ? "checked" : ""}>${esc(c.name)}</label>`).join(" ")}</div>` : ""}`),
    line((plCur && pl.state === "ok") || (p.pilotSkip && p.pilotSkip.draft === p.versionNo), esc(t("rel.c.pilot")), `${!plCur ? btn("goto", t("pilot.run"), {cls: "xs", attrs: 'data-ph="launch" data-scroll="brief"'}) : ""}${p.pilotSkip && p.pilotSkip.draft === p.versionNo ? `<span class="small muted">${esc(t("pub.nopilot", {r: p.pilotSkip.reason}))}</span>` : btn("pilot-skip", t("pub.skippilot"), {cls: "xs ghost"})}${plCur && pl.incomplete ? `<span class="small warn-t">${esc(t("pub.pilotincomplete"))}</span>` : ""}`),
    plCur && pl.state === "ok" ? line(!!pl.judge2 && (pl.judge2.agree || UI.relOverride), esc(t("rel.c.judges")), `${!pl.judge2 ? aiBtn("pilot-judge", t("rel.judge"), "L", {key: "pjudge"}) : ""}${pl.judge2 && !pl.judge2.agree ? `<label class="chk small"><input type="checkbox" data-bind="ui:relOverride" data-rerender="1" ${UI.relOverride ? "checked" : ""}>${esc(t("rel.override"))}</label>` : ""}`) : "",
    plCur && pilotWorse(pl) ? line(UI.relWorseOk, esc(t("rel.g.worse")), `<label class="chk small"><input type="checkbox" data-bind="ui:relWorseOk" data-rerender="1" ${UI.relWorseOk ? "checked" : ""}>${esc(t("rel.worseok"))}</label>`) : ""
  ].join("");
  const reportBox = `<details class="panel flat" ${repCur ? "" : "open"}><summary><b>${esc(t("rel.report"))}</b> <span class="small muted">${esc(t("rel.report.sub"))}</span></summary>
    <div class="row">${btn("report-check", t("rel.checkreport"), {icon: "search", cls: "sm"})}<span class="hint">${esc(t("rel.reporthint"))}</span></div>
    <form class="stack" data-form="report-paste"><textarea id="rep-in" rows="3" placeholder="${esc(t("rel.pasteph"))}"></textarea><div class="row end"><button class="btn sm" type="submit">${esc(t("rel.readpaste"))}</button></div></form>
    ${chk ? `<div class="row">${chip(chk.ok ? t("rel.repok") : t("rel.repgaps"), chk.ok ? "ok" : "crit")}${chip(t("rel.parts", {a: chk.built, b: chk.parts}))}${chip(t("rel.checks", {a: chk.checks - chk.failedChecks, b: chk.checks}))}</div>${chk.missingParts.length ? `<p class="small warn-t">${esc(t("rel.missingparts", {x: chk.missingParts.join(", ")}))}</p>` : ""}${chk.failedTests.length ? `<p class="small warn-t">${esc(t("rel.failedtests", {x: chk.failedTests.join(", ")}))}</p>` : ""}${chk.personSteps.length ? `<div class="small"><b>${esc(t("rel.yoursteps"))}</b><ul>${chk.personSteps.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}` : ""}</details>`;
  const hist = p.releases.length ? `<section class="panel">${head(t("rel.history"))}<div class="list">${p.releases.map(r => `<div class="item"><span class="mono" style="color:var(--accent)">v${esc(r.v)}</span><div class="body"><span class="title">${esc(fmtDate(r.at))}${p.live && p.live.v === r.v ? " · " + esc(t("rel.live")) : ""}</span>${arr(r.notes).length ? `<ul class="small" style="margin:0;padding-left:18px">${r.notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div><div class="acts" style="flex-direction:column">${btn("tool-card", t("rel.toolcard"), {icon: "dl", cls: "sm ghost", attrs: `data-v="${esc(r.v)}"`})}${!(p.live && p.live.v === r.v) ? btn("rollback", t("rel.reinstallbtn", {v: r.v}), {cls: "sm ghost", attrs: `data-v="${esc(r.v)}"`}) : ""}</div></div>`).join("")}</div></section>` : "";
  return `${toolStates(p)}
  <section class="panel" id="publish14">${head(t("pub.title", {v: nextV}), t("pub.sub"))}<div class="list">${checks}</div>
    <label class="chk"><input type="checkbox" id="rel-sign" ${UI.relSign ? "checked" : ""} data-bind="ui:relSign" data-rerender="1">${esc(t("rel.sign", {v: nextV}))}</label>
    <div class="row">${btn("release", t("pub.do", {v: nextV}), {icon: "check", cls: "primary lg", attrs: can && UI.relSign ? "" : "disabled"})}${!can ? `<span class="hint">${esc(t("pub.left", {n: gate.length}))}</span>` : ""}</div>${busyHTML("pjudge")}
    ${reportBox}</section>${hist}`;
}
MODAL14.reinstall = (m, p, hd) => `${hd(t("rel.reinstall", {v: m.v}))}<p>${esc(t("rel.reinstallq", {v: m.v, c: p.live ? p.live.v : "—"}))}</p>
  <label class="chk"><input type="checkbox" data-bind="ui:reinstallWc" ${UI.reinstallWc ? "checked" : ""}>${esc(t("rel.reinstallwc", {v: m.v}))}</label>
  <div class="row end"><button class="btn ghost" data-a="modal-close">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="reinstall-go" data-v="${esc(m.v)}">${esc(t("rel.reinstallbtn", {v: m.v}))}</button></div>`;
Object.assign(ACTIONS, {
  "reinstall-go": el => doReinstall(curP(), el.dataset.v, {workingCopy: !!UI.reinstallWc}),
  "pilot-skip": () => { const p = curP(); promptBox(t("pub.skippilot"), {ph: t("pub.skipwhy"), yes: t("pub.skippilot")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } p.pilotSkip = {draft: p.versionNo, reason: str(v).trim(), at: now()}; logAct(p, t("act.pilotskip", {r: str(v).trim()}), {important: true}); touch(p); }); },
  "release": () => { const p = curP(); const v = nextRelease(p, releaseKind(arr(p.plan && p.plan.changes))); confirmBox(t("pub.do", {v}), t("pub.confirm", {v}), t("pub.do", {v}), () => doRelease(p)); }
});
Object.assign(CHANGES, {
  "installed": el => { const p = curP(); p.tool.installed = el.checked ? {draft: p.versionNo, at: now()} : null; touch(p); render(); },
  "youdid": el => { const p = curP(); p.report = p.report || {at: now(), raw: {}, check: null, via: "you", draft: p.versionNo}; p.report.youDid = p.report.youDid || {}; p.report.youDid[el.dataset.id] = el.checked; if (p.report.raw && p.report.check) p.report.check = checkReport(p, p.report.raw); touch(p); render(); }
});
