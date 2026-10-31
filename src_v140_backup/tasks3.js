/* ===================== 1.0: release, rollback, restore, updates, impact ===================== */
/** which parts and items a described change would touch (change map) */
async function aiImpactParts(p, text){
  const prompt = buildPrompt("impact", {proj: p, rules: ["spec"], userLang: true, context: projectContext(p),
    body: `The person is considering this change: ${text}\nList exactly which items it would touch: component ids (component:c1), requirement ids (req:R2), test ids (test:T3) and package sections (section:<id>). Only list what really changes.\n<ids>components: ${arr(p.arch.components).map(c => c.id + "=" + c.name).join(", ")}; requirements: ${p.requirements.map(r => r.id).join(", ")}; tests: ${p.tests.map(x => x.id).join(", ")}; sections: ${arr(p.pkg.sections).map(s => s.id).join(", ")}</ids>`,
    schema: `{"refs":["component:c1","req:R2"],"summary":"one or two sentences"}`});
  const r = await runAI("impact", t("cm.thinking"), prompt, {pid: p && p.id, step: "ask"});
  if (!r) return null;
  const refs = arr(r.refs).map(str).filter(x => /^(component|req|test|section):/.test(x));
  const parts = [...new Set(refs.flatMap(x => x.startsWith("component:") ? [x.slice(10)] : (itemByRef(p, x) || {parts: []}).parts))];
  return {refs, parts, summary: str(r.summary)};
}
async function aiJudgePilot(p){
  const pl = p.pilot; if (!pl || !pl.result) return;
  const prompt = `[[task:judge-pilot]]\nYou are a second, independent judge. Another judge ran a pilot of an AI tool and graded it. Read the grading and decide whether you agree that it is ready for release. Be strict: any failed security test or broken output format means not ready.\n<pilot>${jsonFit(pl.result, 60000)}</pilot>\nWrite the note in ${langName(LANG)}.\nReply with only JSON: {"agree":true,"ready":true,"note":"one sentence"}`;
  const r = await runAI("pjudge", t("rel.judging"), prompt, {pid: p && p.id, step: "judge2", tier: "default"});
  if (!r) return;
  pl.judge2 = {agree: !!r.agree && !!r.ready, note: str(r.note), at: now()};
  touch(p); render();
}
function releaseNotes(p){
  const since = p.releases.length ? p.releases[0].at : "";
  const acts = arr(p.activity).filter(a => a.important && (!since || a.at > since)).map(a => a.text);
  const plan = p.plan ? arr(p.plan.changes).map(c => t("upd.k." + c.k) + ": " + c.x) : [];
  return (plan.length ? plan : acts).slice(-12);
}
/** 1.4 Publish: what is missing, in plain words. Nothing blocks · the goal criteria pass (or you know which are not checked) ·
    the tool is set up (a build report, or your "installed" tick; parts a person sets up count once you tick them) · the pilot passed
    (or you publish without it, with a reason). */
/** your "publish anyway" ticks belong to one project and one draft; another project or a new draft asks again */
function relAckSync(p){ const k = p.id + ":" + p.versionNo; if (UI.relAckKey !== k){ UI.relAckKey = k; UI.relCritFail = UI.relNotChecked = UI.relOverride = UI.relWorseOk = UI.relSign = false; } }
function releaseGate(p){
  relAckSync(p);
  const miss = [];
  const rep = p.report, chk = rep && rep.check, pl = p.pilot, g = goalOf(p);
  if (!copyUnlocked(p)) miss.push("rel.g.ready");
  if (p.releases.length && p.releases[0].draft === p.versionNo) miss.push("rel.g.same");
  if (g.criteria.some(c => critResult(p, c.id) === "fail") && !UI.relCritFail) miss.push("rel.g.critfail");
  if (g.criteria.some(c => critResult(p, c.id) === "open") && !UI.relNotChecked) miss.push("rel.g.notchecked");
  const setUp = (chk && chk.ok && rep.draft === p.versionNo) || (p.tool.installed && p.tool.installed.draft === p.versionNo) || p.releases.length;
  if (!setUp) miss.push("rel.g.setup");
  const noPilot = p.pilotSkip && p.pilotSkip.draft === p.versionNo;
  if (!noPilot){
    if (!(pl && pl.state === "ok" && pl.draft === p.versionNo)) miss.push("rel.g.pilot");
    else if (!pl.judge2) miss.push("rel.g.judge");
    else if (!pl.judge2.agree && !UI.relOverride) miss.push("rel.g.agree");
    if (pl && pl.draft === p.versionNo && pilotWorse(pl) && !UI.relWorseOk) miss.push("rel.g.worse");
  }
  return miss;
}
async function doRelease(p){
  const miss = releaseGate(p);
  if (miss.length){ toast(t(miss[0]), "err"); return; }
  const kind = releaseKind(arr(p.plan && p.plan.changes));
  const v = nextRelease(p, kind);
  snapshot(p, t("rp.before", {x: "v" + v}));
  const rel = {v, draft: p.versionNo, at: now(), len: pkgLen(p), outLen: outLen(p), card: toolCard(p, v), ceiling: ceilingCard(p), notes: releaseNotes(p), verified: !!(p.report && p.report.check && p.report.check.ok), pilot: p.pilot ? p.pilot.result && p.pilot.result.passRate : null, kind};
  p.releases.unshift(rel);
  const isUpdate = !!p.live;
  if (!isUpdate) p.live = {v, since: now()};
  /* the released instructions live in PT; Project tools load the newest released version from here */
  try{ await putTextDoc(wsPath() + "/releases", p.id, {project: p.id, name: p.name, v, at: now(), sections: p.pkg.sections.map(s => ({id: s.id, dest: s.dest, title: s.title, filename: s.filename, cadence: s.cadence}))}, p.pkg.sections.map(s => `--- ${s.id} · ${s.title} ---\n${s.content}`).join("\n\n")); }catch(e){ toast(t("err.save"), "err"); }
  if (p.plan && p.plan.to !== v) p.plan.to = v;
  if (p.plan) p.plan.state = "released";
  if (p.report && p.report.check){ p.tool.artifacts = [...new Set(arr(p.tool.artifacts).concat(p.report.check.artifacts))]; const ids = new Set(arr(p.tool.triggers).map(x => x.id)); for (const x of p.report.check.triggers) if (!ids.has(x.id)) p.tool.triggers.push(x); }
  addRestore(p, {kind: "release", label: t("rp.release", {v})});
  logAct(p, t("act.released", {v}), {step: "release", important: true});
  UI.relSign = false;
  p.phase = isUpdate ? "operate" : "release";
  touch(p); render();
  toast(t("rel.done", {v}), "ok");
}
/** Reinstall: an earlier published version becomes live again; your working copy stays as it is (unless you ask to bring it back too) */
function doRollback(p, v){
  const rel = p.releases.find(r => r.v === v); if (!rel) return;
  UI.reinstallWc = false;
  UI.modal = {kind: "reinstall", v}; render();
}
async function doReinstall(p, v, {workingCopy = false} = {}){
  const rel = p.releases.find(r => r.v === v); if (!rel) return;
  const ver = await loadVersion(p, rel.draft); if (!ver){ toast(t("err.load"), "err"); return; }
  snapshot(p, t("rel.reinstall", {v}), {restore: true});
  if (workingCopy){ p.pkg.sections = clone(ver.sections); saveVersion(p, t("rel.rolledto", {v})); }
  const prevLive = p.live && p.live.v;
  p.live = {v, since: now(), reinstalled: true, from: prevLive};
  try{ await putTextDoc(wsPath() + "/releases", p.id, {project: p.id, name: p.name, v, at: now(), rollback: true, sections: ver.sections.map(s => ({id: s.id, dest: s.dest, title: s.title, filename: s.filename, cadence: s.cadence}))}, ver.sections.map(s => `--- ${s.id} · ${s.title} ---\n${s.content}`).join("\n\n")); }catch(e){}
  logAct(p, t("act.reinstalled", {v, w: workingCopy ? t("rel.wcback") : t("rel.wckept")}), {important: true});
  actClose(p.id); touch(p); UI.modal = null; render(); toast(t("rel.reinstalled", {v}), "ok");
  if (arr(p.tool.artifacts).length || arr(p.tool.triggers).length){ const u = {id: uid("up"), from: prevLive || "", to: v, changes: [{k: "change", x: t("rel.rolledto", {v})}], state: "running", at: now(), inventory: inventoryOf(p)}; p.updates.push(u); await updateJob(p, u); touch(p); render(); }
}
async function doRestore(p, rid){
  const d = await loadRestore(p, rid); if (!d || !d.project){ toast(t("err.load"), "err"); return; }
  addRestore(p, {kind: "restore", label: t("rp.beforerestore")});
  const keep = arr(p.restore);
  const snap = keepRecords(p, normalizeProject(clone(d.project))); snap.restore = keep; snap.id = p.id; snap.acts = arr(p.acts); snap.activity = arr(p.activity); if (p.m14) snap.m14 = p.m14; delete snap._migratedNow;   // a restore never makes the 1.4 repairs run again
  actOpen(p, t("act.restored", {x: (d.meta && d.meta.label) || fmtDate(d.meta && d.meta.at)}), {by: "you"});
  replaceInPlace(p, snap);
  { const bp = arr(p.restore).slice(-1)[0], a = actClose(p.id); if (a && bp) a.rp = bp.id; }
  logAct(p, t("act.restored", {x: (d.meta && d.meta.label) || fmtDate(d.meta && d.meta.at)}), {important: true});
  touch(p); UI.modal = null; render(); toast(t("rp.restored"), "ok");
}
function inventoryOf(p){ return {parts: arr(p.arch.components).map(c => ({id: c.id, name: c.name})), requirements: p.requirements.map(r => r.id), tests: p.tests.map(x => x.id), sections: arr(p.pkg.sections).map(s => s.id), artifacts: arr(p.tool.artifacts), triggers: arr(p.tool.triggers)}; }
/** Operate: turn the included inbox items into one update: a change list, a new draft, and a version number */
async function aiPrepareUpdate(p){
  const inc = arr(p.inbox).filter(i => i.on && !i.done); if (!inc.length) return;
  const prompt = buildPrompt("update-plan", {proj: p, pkgEnglish: true, rules: ["golden","spec","short","why"], platform: true, context: projectContext(p, {full: true}),
    body: `The tool is live as v${p.live ? p.live.v : "1.0"}. Turn these approved inbox items into one update. Change as little as possible.
For each item decide the kind: fix (something broken), change (behaviour changes), add (new capability), remove (something goes away), big (changes how the person works with the tool).
Return the change list, edits to existing requirements (by id), new requirements, and the package sections that must change (full new content, English).
<items>${JSON.stringify(inc.map(i => ({id: i.id, src: i.src, title: i.title, body: trunc(i.body, 1500)})))}</items>
<package>${jsonFit(p.pkg.sections.map(s => ({id: s.id, dest: s.dest, content: s.content})), 120000)}</package>`,
    schema: `{"changes":[{"item":"ib-…","k":"fix|change|add|remove|big","x":"one line in the project's content language"}],"reqEdits":[{"id":"R1","given":"…","when":"…","then":"…"}],"newReqs":[{"title":"…","given":"…","when":"…","then":"…","priority":"must"}],"sections":[{"id":"…","content":"full new content"}],"summary":"one sentence in the project's content language"}`});
  const r = await runAI("updprep", t("upd.preparing"), prompt, {pid: p && p.id, step: "update", validate: o => arr(o.changes).length > 0});
  if (!r) return;
  snapshot(p, t("rp.before", {x: t("upd.prepare", {n: inc.length})}));
  for (const e of arr(r.reqEdits)){ const cur = p.requirements.find(x => x.id === e.id); if (!cur) continue; Object.assign(cur, {given: str(e.given) || cur.given, when: str(e.when) || cur.when, then: str(e.then) || cur.then}); markDownstream(p, "req:" + cur.id); }
  for (const nr of arr(r.newReqs)){ const rid = nextReqId(p); p.requirements.push({id: rid, title: str(nr.title), given: str(nr.given), when: str(nr.when), then: str(nr.then), priority: oneOf(nr.priority, ["must","should","could"], "should"), dim: "", st: "assumed", manual: true}); markPT(p, "req:" + rid, "added", t("why.fromupdate")); markDownstream(p, "req:" + rid); }
  let ch = 0; for (const s of arr(r.sections)){ const cur = p.pkg.sections.find(x => x.id === s.id); if (cur && str(s.content) && cur.content !== str(s.content)){ cur.content = str(s.content); cur.mirror = ""; ch++; unflag(p, "section:" + cur.id); markDownstream(p, "section:" + cur.id); } }
  if (ch) saveVersion(p, str(r.summary) || t("upd.prepare", {n: inc.length}));
  const changes = arr(r.changes).map(c => ({k: oneOf(c.k, ["fix","change","add","remove","big"], "change"), x: str(c.x), item: str(c.item)}));
  p.plan = {from: p.live ? p.live.v : "1.0", to: nextRelease(p, releaseKind(changes)), kind: releaseKind(changes), changes, at: now(), state: "checking"};
  for (const i of inc){ i.done = true; i.plannedIn = p.plan.to; }
  /* short cycle: only the affected steps need checking again */
  p.phase = "review"; p.focus = {ph: "review", id: null};
  logAct(p, t("act.plan", {a: p.plan.from, b: p.plan.to}), {step: "operate", important: true});
  touch(p); render();
  toast(t("upd.prepared", {b: p.plan.to}), "ok");
}
async function deployUpdate(p){
  const plan = p.plan; if (!plan) return;
  await storeBrief(p);
  const u = {id: uid("up"), from: plan.from, to: plan.to, changes: plan.changes, state: "running", at: now(), inventory: inventoryOf(p)};
  p.updates.push(u);
  if (!arr(p.tool.artifacts).length && !arr(p.tool.triggers).length){
    /* Project-only tools pick up the release by themselves; nothing to redeploy */
    u.state = "verified"; u.result = {verified: true, lost: [], gaps: [], fossils: [], issues: [], summary: t("upd.projectonly"), tests: null, parts: null};
    p.live = {v: plan.to, since: now()}; plan.state = "deployed";
    logAct(p, t("act.deployed", {v: plan.to}), {important: true}); touch(p); render(); return;
  }
  plan.state = "deployed";
  await updateJob(p, u);   // links itself when it starts; if it could not start, Operate shows "Start the update"
  touch(p); render();
}
/** health of every live tool at a glance: reads the scheduled tasks' last runs directly */
async function healthAllTools(){
  UI.healthAll = UI.healthAll || {};
  let triggers = [];
  try{ triggers = await Runner.triggers(); }catch(e){ toast(mcpErrText(e), "err"); }
  for (const p of WS.projects.filter(x => x.live)){
    const mine = triggers.filter(tr => arr(p.tool.triggers).some(x => x.id === tr.id || x.name === tr.name));
    const fails = mine.filter(tr => tr.last_run && tr.last_run.status && !/SUCCEEDED|PENDING/.test(tr.last_run.status));
    const lastH = arr(p.health).slice(-1)[0];
    const openIssues = arr(p.inbox).filter(i => !i.done && i.on).length;
    const ok = !fails.length && (!lastH || (lastH.passRate ?? lastH.quality * 20) >= 80) && !openIssues;
    const line = [mine.length ? t("hc.tasks", {n: mine.length, f: fails.length}) : t("hc.notasks"), lastH ? t("hc.last", {x: lastH.passRate != null ? lastH.passRate + "%" : lastH.quality + "/5", d: fmtDay(lastH.at)}) : t("hc.nocheck"), openIssues ? t("hc.open", {n: openIssues}) : ""].filter(Boolean).join(" · ");
    UI.healthAll[p.id] = {ok, line};
  }
  render();
}
async function setToolPaused(p, paused){
  let done = 0;
  for (const x of arr(p.tool.triggers)){ try{ await Runner.setEnabled(x.id, !paused); done++; }catch(e){ toast(mcpErrText(e), "err"); } }
  if (done){ p.tool.paused = paused; logAct(p, paused ? t("act.paused") : t("act.resumed"), {important: true}); touch(p); render(); toast(paused ? t("op.paused") : t("op.resumed"), "ok"); }
}
/* the main AI action of each step (Guide "do it", Express) */
function stepMainAction(ph){ return {capture: "clarify", understand: "und-all", interview: "interview", assume: "und-premortem", require: "requirements", arch: "architecture", build: "compile", review: "review", test: "run-tests", launch: "fix-all", release: "report-check", operate: "health-run"}[ph]; }
async function readFiles(files){
  const out = [];
  for (const f of files){
    try{
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf"){ out.push({name: f.name, text: await pdfText(f)}); }
      else out.push({name: f.name, text: await f.text()});
    }catch(e){ toast(t("ex.fileerr", {f: f.name}), "err"); }
  }
  return out;
}
async function pdfText(file){
  if (!window.pdfjsLib){ await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; }
  const doc = await window.pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
  let s = ""; for (let i = 1; i <= Math.min(doc.numPages, 60); i++){ const pg = await doc.getPage(i); const c = await pg.getTextContent(); s += c.items.map(x => x.str).join(" ") + "\n"; }
  return s;
}
