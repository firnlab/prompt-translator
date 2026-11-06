/* ===================== 1.0 ACTIONS ===================== */
function pulseFocus(){ UI.pulse = true; }
function whereLabel(p){ const it = p.focus.id ? itemByRef(p, p.focus.id) : null; return phName(p.focus.ph) + (it ? " › " + (guided() ? "" : it.id + " ") + trunc(it.title, 60) : ""); }
function confirmItem(p, ref){
  const [kind, id] = ref.split(":");
  if (kind === "ns" || kind === "nsdraft"){ p.nsAssumed = false; if (p.nsDraft){ p.northStar = Object.assign({}, p.northStar, p.nsDraft); p.nsDraft = null; } }
  else if (kind === "arch"){ p.arch.chosenAssumed = false; if (!p.arch.chosen) p.arch.chosen = p.arch.recommended; }
  else if (kind === "und"){ if (id === "walk") p.understand.walkConfirmed = true; }
  else if (kind === "dim"){ const d = p.dims[id]; if (d) d.status = "confirmed"; }
  else { const o = itemObj(p, ref); if (o && o.st === "assumed") o.st = "ok"; if (kind === "qa" && o){ const d = p.dims[o.dim]; if (d && d.status === "assumed") d.status = "confirmed"; } if (kind === "assumption" && o && o.status === "untested") o.status = "testing"; }
  unflag(p, ref);
  logAct(p, t("act.confirmed1", {r: ref}), {kind: "confirm"});
}
const HEAVY = ["compile","review","run-tests","improve","architecture","fix-all","fix-all-findings","seal-recheck","update-prepare","update-deploy","pilot-run","health-run","build-job","collect","collect-all"];
/** "What Claude is doing": a short preview before anything heavy */
function withPreview(name, el, run){
  if (WS.settings.skipPreview && WS.settings.skipPreview[name]) return run();
  UI.modal = {kind: "preview", name, run};
  render();
}
async function rdFix(p, fix, ref, arg){
  UI.fixing = ref + fix; render();
  try{
    switch (fix){
      case "edit-ns": ACTIONS["edit-ns"](); break;
      case "ns-confirm": p.nsAssumed = false; break;
      case "dim-confirm": { const d = p.dims[ref.split(":")[1]]; if (d) d.status = "confirmed"; break; }
      case "go-interview": setPhase("interview"); await aiInterview(p); break;
      case "assume-handle": setPhase("assume", {id: ref}); UI.open.add(ref); break;
      case "risk-suggest": await aiMitigate(p, ref.split(":")[1]); break;
      case "risk-mitigated": { const r = p.risks.find(x => x.id === ref.split(":")[1]); if (r) r.status = "mitigated"; break; }
      case "early-check": await aiEarlyCheck(p, arg || ref.split(":")[1]); break;
      case "update-affected": await aiUpdateAffected(p); break;
      case "compile": await aiCompile(p); break;
      case "lint-fix": await aiLintFix(p); break;
      case "review-run": await aiReview(p, LENSES.map(l => l.id)); break;
      case "finding-fix": { const f = p.findings.find(x => x.id === ref.split(":")[1]); if (f){ if (f.section) await aiApplyFixes(p, [f.id]); else await aiFixEarly(p, f); } break; }
      case "finding-confirm": await aiConfirmFixes(p, [ref.split(":")[1]]); break;
      case "finding-signoff": setPhase("review", {id: ref}); UI.revTab = "signoff"; break;
      case "cost-ok": promptBox(t("rd.f.costok"), {ph: t("cost.reason"), yes: t("rd.f.costok")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } p.costOk = {draft: p.versionNo, reason: str(v).trim(), at: now()}; logAct(p, t("act.costok", {r: str(v).trim()}), {important: true}); touch(p); render(); }); break;
      case "frontier-scan": setPhase("understand", {id: "engine:scan"}); await frontierJob(p); break;
      case "frontier-local": setPhase("understand", {id: "engine:scan"}); await aiFrontierLocal(p); break;
      case "gate-open": setPhase(["G1","G2"].includes(arg) ? "understand" : "arch", {id: "engine:" + arg}); UI.open.add("gate:" + arg); break;
      case "trial-run": setPhase("arch", {id: "engine:trial"}); await aiTrialRun(p); break;
      case "mini-run": setPhase("arch", {id: "engine:mini"}); await aiMiniTest(p); break;
      case "finding-reaccept": setPhase("review", {id: ref}); UI.revTab = "accepted"; break;
      case "go": setPhase(arg || "require"); break;
      case "tests-missing": await aiMissingTests(p); break;
      case "tests-run": await aiRunTests(p, {trials: TRIALS}); break;
      case "tests-improve": UI.testTab = "improve"; setPhase("test"); await aiImprove(p); break;
      case "judge-decide": UI.testTab = "runs"; setPhase("test", {id: ref}); break;
      case "trace-run": await aiTrace(p); break;
      case "trace-close": await aiCloseTraceGaps(p); break;
      case "seal-recheck": await aiSealRecheck(p); break;
      case "oq-done": { const q = p.openQs.find(x => x.id === ref.split(":")[1]); if (q) q.done = true; break; }
      case "item-confirm": confirmItem(p, ref); break;
      case "fs-done": { const id = ref.slice(3); const f = p.foresight.find(x => x.id === id); if (f) f.done = true; else p.fsDone[id] = true; break; }
      case "open-notes": go("notes"); break;
      case "crit-draft": await aiDraftCriteria(p); break;
      case "crit-link": await aiLinkCriteria(p); break;
      case "arch-redraw": await aiArchRedraw(p); break;
      case "gen-tests": await aiTests(p); break;
      case "proof-design": await aiProofDesign(p); break;   // ok:undo  runAI with pid opens its own action
      case "proof-tests": await aiProofTests(p); break;   // ok:undo  runAI with pid opens its own action
      case "requirements": await aiRequirements(p); break;
      case "architecture": await aiArchitecture(p); break;
      case "clarify": await aiClarify(p); break;
      case "eng-suggest": await aiEngineSuggest(p); break;
    }
  } finally { UI.fixing = null; touch(p); render(); }
}
Object.assign(ACTIONS, {
  "goto": el => { const p = curP(); if (!p){ return; } const ref = el.dataset.ref || null; setPhase(el.dataset.ph, {id: ref}); if (ref) UI.open.add(ref); pulseFocus(); render(); if (el.dataset.scroll) setTimeout(() => { const x = document.getElementById(el.dataset.scroll); if (x) x.scrollIntoView({behavior: "smooth", block: "start"}); }, 60); },
  "phase": el => { if (el.dataset.ph === "log"){ UI.phase = "log"; render(); return; } setPhase(el.dataset.ph); },
  "set-guided": el => { WS.settings.guided = el.dataset.v === "1"; saveWs(); render(); },
  "set-layout": el => { WS.settings.layout = el.dataset.v; saveWs(); render(); },
  "panel": el => { const v = el.dataset.v; if (UI.drawer && UI.panelTab === v){ UI.drawer = false; } else { UI.drawer = true; UI.panelTab = v; } render(); if (UI.drawer && v === "guide") focusSoon("guide-in"); },
  "item-open": el => { const p = curP(); const ref = el.dataset.ref; if (p.focus.id === ref){ p.focus.id = null; UI.open.delete(ref); } else { const it = itemByRef(p, ref); p.focus = {ph: it ? it.ph : p.focus.ph, id: ref}; } UI.itemBox = null; render(); },
  "item-confirm": el => { const p = curP(); confirmItem(p, el.dataset.ref); touch(p); render(); toast(t("toast.confirmed"), "ok"); },
  "retry-load": () => { const f = UI.fatal; UI.fatal = null; if (f && f.kind === "ws") openWorkspace(f.id); else { UI.booted = false; render(); boot(); } },
  "fs-all": () => { UI.fsAll = !UI.fsAll; render(); },
  "confirm-all-assumed": () => { const p = curP(); confirmBox(t("as.confirmall"), t("as.confirmallq", {n: assumedItems(p).length}), t("btn.confirm"), () => { for (const i of assumedItems(p)) confirmItem(p, i.ref); touch(p); }); },
  "confirm-step": el => { const p = curP(); for (const i of itemsOf(p, el.dataset.ph).filter(i => i.st === "as" && i.kind !== "assumption")) confirmItem(p, i.ref); touch(p); render(); toast(t("toast.confirmed"), "ok"); },
  "confirmall": el => ACTIONS["confirm-step"](el),
  "item-tool": el => { UI.itemBox = {ref: el.dataset.ref, k: el.dataset.k, text: el.dataset.text || ""}; render(); focusSoon("it-in"); },
  "item-send": async el => { const p = curP(); const a = UI.itemBox; if (!a) return; const v = (nearField(el, "#it-in") || {}).value || a.text || ""; if (!v.trim()){ toast(t("it.need"), "err"); return; } a.text = v; render(); const r = await aiItemEdit(p, a.ref, a.k, v); if (!UI.itemBox) return; if (r && a.k === "ask") a.answer = r.answer; else if (r) a.prop = r; render(); },   // ok:undo (replaced by the 1.4 version in actions4.js, which applies results as a PT action)
  "item-retry": async el => { const a = UI.itemBox; if (!a) return; a.prop = null; render(); await ACTIONS["item-send"](el); },
  "item-accept": el => { const p = curP(); const a = UI.itemBox; if (!a || !a.prop) return; applyItemProposal(p, a.ref, a.prop, a.scope || "item"); UI.itemBox = null; render(); toast(t("it.applied"), "ok"); },
  "item-box-close": () => { UI.itemBox = null; render(); },
  "selpart": el => { UI.selPart = UI.selPart === el.dataset.v ? null : el.dataset.v; pulseFocus(); render(); },
  "clearsel": () => { UI.selPart = null; pulseFocus(); render(); },
  "map-zoom": el => { UI.mapZoom = clamp(Math.round(((UI.mapZoom || 1) + num(el.dataset.v) * .15) * 100) / 100, .55, 1.6); render(); },
  "map-full": () => { UI.modal = {kind: "map", wide: true}; render(); },
  "ask-section": el => { UI.askSec = UI.askSec && UI.askSec.k === el.dataset.k ? null : {k: el.dataset.k}; render(); focusSoon("ask-sec-in"); },
  "ask-section-close": () => { UI.askSec = null; render(); },
  "ask-section-send": async el => { const q = ($("#ask-sec-in") || {}).value || ""; if (!q.trim()) return; UI.askSec = {k: el.dataset.k, q}; render(); const a = await aiAskSection(curP(), el.dataset.k, q); if (UI.askSec && UI.askSec.k === el.dataset.k){ UI.askSec.answer = a || ""; render(); } },
  "tool-report": el => { const p = curP(); UI.modal = {kind: "toolreport", where: [t("nav." + UI.view) || UI.view, p ? p.name : "", p ? phName(p.focus.ph) : "", el.dataset.k && el.dataset.k !== "rail" ? el.dataset.k : ""].filter(Boolean).join(" › ")}; render(); focusSoon("tr-in"); },
  "card-open": el => { UI.cardOpen.add(el.dataset.ph); render(); },
  "card-close": el => { const p = curP(); p.cards = p.cards || {}; p.cards[el.dataset.ph] = true; UI.cardOpen.delete(el.dataset.ph); touch(p); render(); },
  "top": () => { const m = $(".main"); if (m) m.scrollTo({top: 0, behavior: "smooth"}); window.scrollTo({top: 0}); },
  "update-affected": () => aiUpdateAffected(curP()),
  "flags-show": () => { UI.modal = {kind: "flags"}; render(); },
  "early-check": el => aiEarlyCheck(curP(), el.dataset.v),
  "finding-fix": async el => { const p = curP(); const f = p.findings.find(x => x.id === el.dataset.id); if (!f) return; if (f.section) await aiApplyFixes(p, [f.id]); else await aiFixEarly(p, f); },
  "finding-confirm": el => aiConfirmFixes(curP(), [el.dataset.id]),
  "finding-signoff": el => { const p = curP(); const f = p.findings.find(x => x.id === el.dataset.id); f.status = "done"; f.doneAt = now(); f.audit = arr(f.audit); f.audit.push({at: now(), what: t("aud.signed"), by: wsLabel(WS.name)}); logAct(p, t("act.signed", {x: trunc(f.issue, 60)}), {step: "review", important: true}); touch(p); render(); },
  "finding-reopen": el => { const p = curP(); const f = p.findings.find(x => x.id === el.dataset.id); f.status = "open"; f.reopened = (f.reopened || 0) + 1; f.audit = arr(f.audit); f.audit.push({at: now(), what: t("aud.reopened"), by: wsLabel(WS.name)}); touch(p); render(); },
  "finding-accept": el => { const p = curP(); const f = p.findings.find(x => x.id === el.dataset.id); promptBox(t("acc.title"), {ph: t("acc.ph"), help: t("acc.help"), yes: t("acc.accept")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } f.status = "accepted"; f.reason = str(v).trim(); f.acceptedVersion = p.versionNo; f.recheck = new Date(Date.now() + 90 * 864e5).toISOString(); f.legacy = false; { const sec = arr(p.pkg.sections).find(s => s.id === f.section); f.acceptedHash = sec ? hashStr(sec.content) : ""; } f.audit = arr(f.audit); f.audit.push({at: now(), what: t("aud.accepted") + ": " + f.reason, by: wsLabel(WS.name)}); logAct(p, t("act.accepted", {x: trunc(f.issue, 60)}), {step: "review", important: true}); touch(p); }); },
  "finding-explain": el => { const p = curP(); aiExplainFinding(p, p.findings.find(x => x.id === el.dataset.id)); },
  "walk": () => { const p = curP(); const f = p.findings.find(x => x.status === "open"); if (f){ UI.revTab = "open"; setPhase("review", {id: "finding:" + f.id, keepScroll: true}); pulseFocus(); render(); } },
  "fix-all-findings": () => { const p = curP(); const ids = p.findings.filter(f => OPEN_F.includes(f.status) && !f.needsYou).map(f => f.id); costGuard(p, "fix", () => fixFindings(p, ids), fixCost(p, ids)); },
  "seal-recheck": el => withPreview("seal-recheck", el, () => aiSealRecheck(curP())),
  "judge-decide": el => { const p = curP(); const r = p.runs.find(x => x.id === el.dataset.run); const x = r.results[num(el.dataset.x)]; if (x.judgePass === undefined) x.judgePass = x.pass; x.userVerdict = el.dataset.v; x.pass = el.dataset.v === "pass"; finishRun(p, r); logAct(p, t("act.judged", {id: x.testId, v: t("verd." + el.dataset.v)}), {step: "test"}); touch(p); render(); },
  "qa-fold": () => { UI.qaFold = !UI.qaFold; render(); },
  "as-validate": el => { const p = curP(); const a = p.assumptions.find(x => x.id === el.dataset.id); promptBox(t("as.validate"), {ph: t("as.evidenceph"), yes: t("as.validate")}, v => { if (!str(v).trim()) return; a.status = "validated"; a.test = str(v).trim(); logAct(p, t("act.validated", {x: trunc(a.text, 60)}), {step: "assume"}); touch(p); }); },
  "as-accept": el => { const p = curP(); const a = p.assumptions.find(x => x.id === el.dataset.id); promptBox(t("acc.title"), {ph: t("acc.ph"), help: t("acc.help"), yes: t("acc.accept")}, v => { if (!str(v).trim()) return; a.status = "accepted"; a.reason = str(v).trim(); a.acceptedVersion = p.versionNo; touch(p); }); },
  "as-research": el => { const p = curP(); const a = p.assumptions.find(x => x.id === el.dataset.id); researchJob(p, t("res.assumption", {x: a.text}), "assume"); },
  "risk-suggest": el => aiMitigate(curP(), el.dataset.id),
  "risk-mitigated": el => { const p = curP(); const r = p.risks.find(x => x.id === el.dataset.id); r.status = "mitigated"; touch(p); render(); },
  "risk-accept": el => { const p = curP(); const r = p.risks.find(x => x.id === el.dataset.id); promptBox(t("acc.title"), {ph: t("acc.ph"), help: t("acc.help"), yes: t("acc.accept")}, v => { if (!str(v).trim()) return; r.status = "accepted"; r.reason = str(v).trim(); touch(p); }); },
  "ns-confirm": () => { const p = curP(); p.nsAssumed = false; touch(p); render(); },
  "rd-fix": el => { const p = curP(); if (el.dataset.fix === "go") { setPhase(el.dataset.arg || "require"); return; } rdFix(p, el.dataset.fix, el.dataset.ref, el.dataset.arg); },
  "fix-all": () => ACTIONS["finish-open"](),
  "rd-walk": () => { const p = curP(); const list = blockingItems(p).map(x => x.ref); if (list.length) goRef(list[0], {list}); },
  "brief-copy-line": async () => { const p = curP(); if (!copyUnlocked(p)){ toast(t("brief.lockedtoast"), "err"); return; } await storeBrief(p); await copyText(buildLoaderLine(p)); logAct(p, t("act.copied"), {step: "launch", important: true}); touch(p); render(); },
  "brief-copy-full": async () => { const p = curP(); if (!copyUnlocked(p)) return; const txt = await storeBrief(p); copyText(txt); },
  "brief-file": () => { const p = curP(); if (!copyUnlocked(p)) return; saveFile(stepFileName(p, "launch").replace(/\.json$/, "_build-brief.md"), buildBriefText(p)); },
  "build-job": el => withPreview("build-job", el, async () => { const p = curP(); await storeBrief(p); await buildJob(p); }),
  "copy-loader": () => { const p = curP(); const fv = (p.live && p.live.v) || nextRelease(p, "minor"); p.tool.fallbackV = fv; p.tool.fallbackN = arr(p.releases).length; touch(p); const fallback = (p.pkg.sections.find(s => s.dest === "instructions") || {content: ""}).content; copyText(t("setup.loadertext", {name: p.name, url: PT_URL, coll: wsPath() + "/releases", id: p.id}) + "\n\n<fallback_copy version=\"v" + fv + "\">\n" + fallback + "\n</fallback_copy>"); },
  "pilot-run": el => withPreview("pilot-run", el, () => pilotJob(curP())),
  "pilot-judge": () => aiJudgePilot(curP()),
  "report-check": async () => { const p = curP(); const id = (p.brief && p.brief.id) || briefId(p); let d = null; try{ d = await Store.get(wsPath() + "/reports/" + id); }catch(e){} if (!d){ toast(t("rel.noreport"), ""); return; } p.report = {at: now(), raw: d, check: checkReport(p, d), via: "storage", draft: (p.brief && p.brief.draft) || p.versionNo}; logAct(p, t("act.report", {ok: p.report.check.ok ? "✓" : "✗"}), {step: "release", important: true}); touch(p); render(); },
  "rollback": el => doRollback(curP(), el.dataset.v),
  "health-run": el => withPreview("health-run", el, () => healthJob(curP(), UI.hcDepth || "thorough")),
  "hc-depth": el => { UI.hcDepth = el.dataset.v; render(); },
  "collect": el => withPreview("collect", el, () => collectJob([curP()])),
  "collect-all": el => withPreview("collect-all", el, () => collectJob(WS.projects.filter(p => p.live))),
  "health-all": () => healthAllTools(),
  "pause-tool": () => { const p = curP(); if (importedLocked(p)){ toast(t("imp21.locked"), "err"); return; } const pause = !p.tool.paused; const ids = arr(p.tool.triggers).map(x => x.id).join(", ");
    confirmBox(pause ? t("op.pause") : t("op.resume"), (pause ? t("op.pauseq") : t("op.resumeq")) + (ids ? " " + t("op.pauseq.ids", {x: ids}) : ""), pause ? t("op.pause") : t("op.resume"), () => setToolPaused(p, pause)); },
  "inbox-toggle": el => { const p = curP(); const m = p.inbox.find(x => x.id === el.dataset.id); m.on = !m.on; touch(p); render(); },
  "inbox-done": el => { const p = curP(); const m = p.inbox.find(x => x.id === el.dataset.id); m.done = true; touch(p); render(); },
  "update-prepare": el => withPreview("update-prepare", el, () => aiPrepareUpdate(curP())),
  "update-deploy": el => withPreview("update-deploy", el, () => deployUpdate(curP())),
  "update-cancel": () => { const p = curP(); confirmBox(t("upd.cancel"), t("upd.cancelq"), t("upd.cancel"), () => { p.plan = null; touch(p); }); },
  "fb-inbox": el => { const p = curP(); const f = p.feedback.find(x => x.id === el.dataset.id); if (!f || !f.diagnosis) return; p.inbox.push({id: uid("ib"), src: "feedback", title: trunc(f.diagnosis.cause || f.comment, 140), body: f.diagnosis.fix, on: true, at: now(), k: "fix"}); f.status = "fixing"; touch(p); render(); toast(t("op.inboxed"), "ok"); },
  "research-run": el => researchJob(curP(), el.dataset.topic || "", (curP() || {focus: {}}).focus.ph),
  "restore-open": () => { UI.modal = {kind: "restore", wide: true}; UI.rpConfirm = null; UI.rpPreview = null; render(); },
  "rp-preview": async el => { const p = curP(); const id = el.dataset.id; if (UI.rpPreview && UI.rpPreview.id === id){ UI.rpPreview = null; render(); return; } UI.rpPreview = {id, data: null}; render(); const d = await loadRestore(p, id); if (UI.rpPreview && UI.rpPreview.id === id){ UI.rpPreview.data = d || {project: {}}; render(); } },
  "rp-restore": el => { const p = curP(); const r = p.restore.find(x => x.id === el.dataset.id); confirmBox(t("rp.restore"), t("rp.restoreq", {x: r ? (r.label || fmtDate(r.at)) : ""}), t("rp.restore"), () => doRestore(p, el.dataset.id)); },
  "rp-download": async el => { const p = curP(); const d = await loadRestore(p, el.dataset.id); if (!d){ toast(t("err.load"), "err"); return; } const r = d.meta || {}; saveFile(stepFileName(Object.assign({}, p, {versionNo: r.draft || 0}), r.step || p.focus.ph).replace(/\.json$/, "_restore.json"), JSON.stringify({app: "prompt-translator", version: PT_VERSION, exportedAt: now(), restorePoint: r, projects: [d.project]}, null, 1)); },
  "rp-delete": el => { UI.rpConfirm = el.dataset.id; render(); },
  "rp-delete-no": () => { UI.rpConfirm = null; render(); },
  "rp-delete-yes": el => { const p = curP(); const id = el.dataset.id; const gone = p.restore.find(x => x.id === id); Store.del(projPath(p.id) + "/restore/" + id); p.restore = p.restore.filter(x => x.id !== id);
    cleanRestoreParts(p, id, gone); UI.rpConfirm = null; logAct(p, t("act.rpdeleted"), {}); touch(p); render(); toast(t("rp.deleted"), "ok"); },
  "job-refresh": el => refreshJob(el.dataset.id),
  "job-cancel": el => { const j = WS.jobs.find(x => x.id === el.dataset.id); if (!j) return; confirmBox(t("job.cancel"), t("job.cancelq"), t("job.cancel"), () => { const un = JOB_WATCH.get(j.id); if (typeof un === "function") un(); JOB_WATCH.delete(j.id); j.status = "failed"; j.error = t("job.cancelled"); applyJob(j); }); },
  "update-start": el => { const p = curP(); const u = arr(p.updates).find(x => x.id === el.dataset.id); if (u) updateJob(p, u).then(() => render()); },
  "update-drop": el => { const p = curP(); const u = arr(p.updates).find(x => x.id === el.dataset.id); if (!u) return; u.state = "notverified"; u.result = {issues: [t("upd.dropped")]}; logAct(p, t("upd.dropped"), {important: true}); touch(p); render(); },
  "job-retry": async el => { const j = WS.jobs.find(x => x.id === el.dataset.id); if (!j) return; try{ await Runner.fire("PT job " + jobsColl() + " " + j.id); j.status = "sent"; j.error = ""; Store.put(jobsColl() + "/" + j.id, j); watchJob(j); }catch(e){ j.error = mcpErrText(e); toast(j.error, "err"); } render(); },
  "start-kind": el => { UI.startKind = el.dataset.v; render(); },
  "start-mode": el => { UI.startMode = el.dataset.v; render(); },
  "fu-dismiss": () => { WS.settings.firstUseDone = true; saveWs(); render(); },
  "guide-run": async el => { const p = curP(); const a = stepMainAction(el.dataset.ph); if (a === "und-all"){ await actGroup(async () => { for (const k of ["whys","jtbd","walkthrough"]) await aiUnderstand(p, k); }); return; } if (a === "und-premortem"){ await aiUnderstand(p, "premortem"); return; } if (a === "run-tests"){ return actGroup(async () => { if (!p.tests.length) await aiTests(p); return aiRunTests(p, {trials: 2}); }); } const fn = ACTIONS[a]; if (fn) fn(el); },
  "guide-act": el => { const id = el.dataset.id; if (id.startsWith("goto:")){ setPhase(id.slice(5)); return; } if (id === "fix-all"){ ACTIONS["finish-open"](); return; } const map = {"early-check": () => aiEarlyCheck(curP(), curP().focus.ph === "arch" ? "arch" : "require")}; withPreview(id, el, () => (map[id] ? map[id]() : ACTIONS[id] && ACTIONS[id](el))); },   // ok:move the person clicked the guide's step
  "copy-upgrade": () => copyText(upgradePrompt()),
  "dim-na": el => { const p = curP(); const id = el.dataset.ref.split(":")[1]; const d = DIMS.find(x => x.id === id); promptBox(t("rd.f.na"), {ph: t("rd.f.naph", {d: d ? L(d) : id}), yes: t("rd.f.na")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } p.dims[id] = {status: "na", summary: str(v).trim()}; logAct(p, t("act.na", {d: d ? L(d) : id}), {step: "interview"}); touch(p); }); },
  "runner-check": async () => { try{ const r = await Runner.ensure(); toast(r && r.id ? t("about.runnerok", {id: r.id}) : t("about.runnermissing", {id: Runner.id()}), r && r.id ? "ok" : "err"); }catch(e){ toast(mcpErrText(e), "err"); } render(); },
  "whatsnew": () => { UI.modal = {kind: "whatsnew", wide: true}; render(); },
  "preview-go": () => { const m = UI.modal; if (!m || m.kind !== "preview") return; const cb = m.run; if (($("#pv-skip") || {}).checked){ WS.settings.skipPreview = WS.settings.skipPreview || {}; WS.settings.skipPreview[m.name] = true; saveWs(); } UI.modal = null; render(); cb(); },
  "set-skip-reset": () => { WS.settings.skipPreview = {}; saveWs(); render(); toast(t("set.previewreset"), "ok"); },
  "und-run-all": async () => { const p = curP(); await actGroup(async () => { for (const k of ["whys","jtbd","reframe","walkthrough","premortem","devil"]) await aiUnderstand(p, k); }); }   // ok:undo (each step opens its action inside the group)
});
/* heavy actions from v1 also show the preview first */
for (const name of ["compile","review","run-tests","improve","architecture"]){ const orig = ACTIONS[name]; ACTIONS[name] = (el, e) => withPreview(name, el, () => orig(el, e)); }
ACTIONS["run-tests"] = (el) => withPreview("run-tests", el, () => { const p = curP(); const w = UI.runWhich || "all"; const ids = p.tests.filter(x => w === "all" || (w === "held" ? x.heldOut : !x.heldOut)).map(x => x.id); return aiRunTests(p, {ids, trials: num(UI.trials, TRIALS) || TRIALS}); });
ACTIONS["toggle-drawer"] = () => { UI.drawer = !UI.drawer; if (!UI.panelTab) UI.panelTab = "notes"; render(); };

Object.assign(CHANGES, {
  "item-scope": el => { if (UI.itemBox) UI.itemBox.scope = el.value; },
  "ex-files": async el => { UI.exFiles = await readFiles(Array.from(el.files || []).slice(0, 8)); render(); }
});
Object.assign(FORMS, {
  "start": () => { const raw = ($("#start-in").value || "").trim(); const name = ($("#np-name").value || "").trim(); if (!raw && !name){ toast(t("start.need"), "err"); focusSoon("start-in"); return; } const mode = UI.startMode || WS.settings.defaultMode || "steps"; const p = newProject(name || suggestName(raw), {raw, mode}); UI.startMode = null; UI.startText = ""; UI.startName = ""; if (mode === "express") setTimeout(() => focusSoon("raw"), 40); toast(t("start.made", {m: t("m." + mode)}), "ok"); },
  "existing": async () => { const txt = ($("#ex-in").value || "").trim(); const files = arr(UI.exFiles); const all = [txt, ...files.map(f => `<file name="${f.name}">\n${f.text}\n</file>`)].filter(Boolean).join("\n\n"); if (!all.trim()){ toast(t("ex.need"), "err"); return; } const p = newProject(t("ex.newname"), {raw: all, mode: WS.settings.defaultMode, kind: "existing"}); UI.exFiles = null; UI.exText = ""; UI.startKind = "new"; await aiExisting(p, all); },
  "guide": async () => { const p = curP(); const q = ($("#guide-in").value || "").trim(); if (!q) return; $("#guide-in").value = ""; const r = await aiGuide(p, q); if (r){ if (p){ p.guide = arr(p.guide); p.guide.push(r); if (p.guide.length > 40) p.guide = p.guide.slice(-40); logAct(p, t("act.guide", {q: trunc(q, 60)}), {kind: "guide"}); touch(p); } else { UI.guideWs = arr(UI.guideWs); UI.guideWs.push(r); } render(); } },
  "change-request": async () => { const p = curP(); const v = ($("#cr-in").value || "").trim(); if (!v) return; const it = {id: uid("ib"), src: "yours", title: trunc(v, 140), body: v, on: true, at: now(), k: "change"}; p.inbox.push(it); touch(p); render(); const r = await aiImpactParts(p, v); if (r){ it.refs = r.refs; touch(p); render(); } },
  "report-paste": () => { const p = curP(); const o = parseReport(($("#rep-in").value || "")); if (!o){ toast(t("rel.pasteerr"), "err"); return; } p.report = {at: now(), raw: o, check: checkReport(p, o), via: "paste", draft: (p.brief && p.brief.draft) || p.versionNo}; touch(p); render(); },
  "tool-report": () => { const v = ($("#tr-in").value || "").trim(); if (!v) return; const x = {id: uid("tf"), text: v, where: UI.modal.where || "", at: now(), ws: WS.name, status: "open", version: PT_VERSION}; Store.put("toolfeedback/" + x.id, x); WS.toolfb = [x, ...arr(WS.toolfb)]; UI.modal = null; render(); toast(t("tfb.sent"), "ok"); },
  "rp-save": () => { const p = curP(); const v = ($("#rp-name").value || "").trim() || t("rp.manual"); addRestore(p, {kind: "manual", label: v}); touch(p); render(); toast(t("rp.saved"), "ok"); }
});
function suggestName(raw){ const s = str(raw).replace(/\s+/g, " ").trim(); if (!s) return ""; const first = s.split(/[.!?。！？\n]/)[0]; return trunc(first, 48); }
