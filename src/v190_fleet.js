/* ===================== 1.9 fleet: when a kit changes, update all of your tools with one click ("GO kit x.y") =====================
   PLAN-1.9 B; DESIGN-1.8-rev2 §3 (P2 rev 2 "update once for all"), §15/§16 steps 5–7 (four-state list, put-live card, undo clause).
   1. Where: Health › My tools and Settings › General (the kit defaults, "Building blocks") say "n of your tools are behind kit x.y"
      with one button "Update my tools to kit x.y". It opens one put-live card (what is republished, that every previous version stays
      restorable, that the run stops at the first problem, the cost as an estimate). Its Start is the owner's GO for the whole run;
      nothing ever starts without that click (opening PT never starts a run).
   2. The run: one tool at a time, only the tools this login publishes. For each, the existing update job (v1.2 updateJob) with the new
      brief (the kit rules), the tool's acceptance lines (PART C, its tests), republish in place, then the live smoke twice in a row.
      Green = the job verified the update AND the last two live checks passed; anything else is red. Stop on the first red: that
      tool keeps its previous version live, the rest wait (listed), an Inbox line and a Sunday-note line say which tool and why;
      Continue tries that tool again after a fix (the same card, for what is left); Cancel keeps what is done. The list shows four
      states — waiting · running · done · needs you — with the time each took. The run lives in the workspace's settings
      (WS.settings.fleetRun; older runs in fleetPast), so leaving the page is fine: the next open watches the running job again
      (resumeJobs) and goes on.
   3. Other people's tools (a workspace marked as the second owner's — kit setting "second" — kept in the owner's login, or a tool
      marked p.sharedFrom): PT prepares the new version (stores the brief with the new kit) and lists it with "they publish it
      themselves". Never republished by this run. A tool with nothing to republish (no page, no scheduled task) is left out and said so.
   4. Never in a preview copy (the card says so; startJob refuses "update" there too). Every tool's start is one act of the project
      with a restore point ("Before kit x.y"); every result is applied as PT's own act (applyJob); the new page version is recorded in
      p.tool.versions with its kit, so the decision rows write their event.
   5. The kit version: KIT_VERSION when a part of PT defines it, else 1.8.0 (the 1.8 kit rules that every brief carries since 1.8.0).
      A tool's first release stamps the kit it was built with; a green kit run stamps the new kit. A 1.7 tool that was only updated
      in place keeps its old kit until a kit run rebuilds it (an update changes only the changed parts). */
const FL19_BASE = "1.8.0";
const FL19_STATES = ["waiting", "running", "done", "needs"];
const FL19_SLOT = {waiting: "todo", running: "cur", done: "done", needs: "bad"};
const FL19 = {starting: null, busy: false};

/* ---------- 0. the kit version, whose a tool is, what can be republished ---------- */
{ const orig = hr18KitNow; hr18KitNow = function(){ return orig.apply(this, arguments) || FL19_BASE; }; }
function fl19Kit(){ return hr18KitNow(); }
function fl19Stamp(p){ const v = arr(p && p.tool && p.tool.versions), last = v[v.length - 1] || {}; return str(p && p.tool && p.tool.kitVersion) || str(last.kitVersion) || str(last.kit); }
/* a tool first released after the move to 1.8 was built from a 1.8 brief (the 1.8 kit rules), even without a stamp */
{ const orig = hr18KitOf; hr18KitOf = function(p){
    const k = orig.apply(this, arguments);
    if (!p || fl19Stamp(p)) return k;
    const M = (typeof mig18 === "function" && mig18()) || {}, R = arr(p.releases), first = R[R.length - 1];
    return M.at && first && str(first.at) > str(M.at) && verCmp(k || "0", FL19_BASE) < 0 ? FL19_BASE : k; }; }
/** "second": the second owner's workspace kept in the owner's login; "shared": a tool marked as someone else's. Never republished here. */
function fl19Other(p){
  if (p && str(p.sharedFrom)) return "shared";
  const k = (WS && WS.settings && WS.settings.kit) || {};
  return Store.isOwner !== false && k.second === true ? "second" : "";
}
function fl19Pages(p){
  const T = (p && p.tool) || {};
  return [...new Set(arr(T.artifacts).map(a => str(a && typeof a === "object" ? a.url : a)).concat(arr(T.versions).map(x => str(x && x.url))).filter(u => /^https:\/\/claude\.ai\//.test(u)))];
}
function fl19Parts(p){ return fl19Pages(p).length > 0 || arr(p && p.tool && p.tool.triggers).length > 0; }
/* private tools first, tools other people use last: a problem with a kit shows on a tool only you use */
function fl19Rank(p){ return typeof kit18Customer === "function" && kit18Customer(p) ? 2 : typeof chkShared === "function" && chkShared(p) ? 1 : 0; }
function fl19Behind(){ const k = fl19Kit(); return hr18Live().filter(p => verCmp(hr18KitOf(p) || "1.7.0", k) < 0); }
/** another person's tool whose new version for this kit was prepared already (a run lists it; it is not offered again) */
function fl19Prepared(p, k){ return [...arr(hr18On() ? WS.settings.fleetPast : []), fl19Run()].some(R => R && R.kit === k && arr(R.others).some(o => o.pid === p.id && o.at)); }
/** what a run would do now: run (own, something to republish), others (prepared for their owners), nothing (left out) */
function fl19Plan(){
  const k = fl19Kit(), B = fl19Behind(), mine = B.filter(p => !fl19Other(p));
  return {kit: k, run: mine.filter(fl19Parts).sort((a, b) => fl19Rank(a) - fl19Rank(b) || str(a.name).localeCompare(str(b.name))),
    nothing: mine.filter(p => !fl19Parts(p)), others: B.filter(p => fl19Other(p) && !fl19Prepared(p, k)), mine};
}
function fl19Run(){ const R = hr18On() ? WS.settings.fleetRun : null; return R && typeof R === "object" && Array.isArray(R.tools) ? R : null; }
function fl19Live(R = fl19Run()){ return !!R && !R.doneAt; }
function fl19Cur(R){ return R ? R.tools.find(x => x.state === "running") || null : null; }
function fl19P(pid){ return arr(WS && WS.projects).find(p => p.id === pid) || null; }
function fl19Name(x){ const p = fl19P(x.pid); return p ? str(p.name) : str(x.name); }
function fl19Cut(s, n = 240){ return str(s).replace(/\s+/g, " ").trim().slice(0, n); }
function fl19Dur(ms){
  const m = Math.floor(Math.max(0, ms) / 60000);
  return m < 1 ? t("fleet.dur.lt") : m < 60 ? t("fleet.dur.min", {n: m}) : t("fleet.dur.h", {h: Math.floor(m / 60), m: m % 60});
}
function fl19Clock(iso){ try{ return new Date(iso).toLocaleTimeString(LANG === "de" ? "de-CH" : LANG === "zh" ? "zh-CN" : "en-GB", {hour: "2-digit", minute: "2-digit"}); }catch(e){ return str(iso).slice(11, 16); } }   // ok:catch an odd time shows as written
function fl19ElText(at, end){ if (!at) return ""; const a = Date.parse(at), b = end ? Date.parse(end) : Date.now(); return isNaN(a) ? "" : t(end ? "fleet.el.took" : "fleet.el.run", {d: fl19Dur(b - a)}); }
function fl19Units(n){ return n * num(typeof JOB_EST === "object" && JOB_EST ? JOB_EST.update : 0, 80); }
function fl19Blocked(){ return PT_PREVIEW ? t("fleet.preview") : Store.mode !== "cloud" ? t("run.err.noapp") : !Runner.ready() ? t("run.err.norunner") : ""; }

/* ---------- 1. a release stamps its kit; the brief names it ---------- */
/* the first release is a full build from the brief: it carries the kit of that brief. A later release of a tool with pages or
   scheduled tasks updates only what changed, so it keeps the tool's kit (a kit run is what moves it to a new kit). A tool with
   nothing to republish (it reads its released instructions from PT) is all in its release: each release brings the current kit. */
function fl19StampBuild(p, kit, from = 0){
  if (!p || !p.tool || !kit) return;
  p.tool.kitVersion = kit;
  for (const x of arr(p.tool.versions).slice(from)) if (x && !x.kitVersion) x.kitVersion = kit;
}
{ const orig = kitRecordVersions; kitRecordVersions = function(p, v){
    const n0 = arr(p && p.tool && p.tool.versions).length, r = orig.apply(this, arguments);
    try{ if (p && (!fl19Parts(p) || (arr(p.releases).length === 1 && !fl19Stamp(p)))) fl19StampBuild(p, (p.brief && p.brief.kit) || fl19Kit(), n0); }catch(e){ onAppError(e && e.message, "fleet:stamp"); }
    return r; }; }
{ const orig = storeBrief; storeBrief = function(p){ const r = orig.apply(this, arguments); try{ if (p && p.brief) p.brief.kit = fl19Kit(); }catch(e){ onAppError(e && e.message, "fleet:brief"); } return r; }; }
{ const orig = buildBriefText; buildBriefText = function(p){
    const k = fl19Kit();
    return orig.apply(this, arguments) + `\nKit version ${k} (the Firnlab kits as of this version): write "kitVersion": "${k}" into the tool's tool.json (firnlab/tools/<slug>/) and add "kit": "${k}" to the build report.`; }; }

/* ---------- 2. the run ---------- */
/** the update job of a kit run: the existing update job, told what the kit run needs (acceptance lines, republish in place, the live
    check twice in a row, the previous version back on a red). Set only while updateJob calls startJob (synchronously). */
{ const orig = startJob; startJob = function(kind, o = {}){
    const S = kind === "update" ? FL19.starting : null;
    if (!S) return orig.apply(this, arguments);
    const {run, x, p} = S, pages = fl19Pages(p), prev = arr(p.tool && p.tool.versions).filter(v => v && v.url && v.version).map(v => ({url: v.url, version: v.version}));
    const acc = arr(p.tests).map(q => ({id: str(q.id), title: str(q.title), input: str(q.input).slice(0, 600), criteria: arr(q.criteria).map(str)}));
    const on = o.onStart;
    o = Object.assign({}, o, {title: p.name + " · kit " + x.from + " → " + run.kit,
      inputs: Object.assign({}, o.inputs, {fleet: run.id, kit: {from: x.from, to: run.kit}, acceptance: acc, pages, previous: prev, smoke: {inARow: 2}}),
      onStart: job => { if (on) on(job); x.jobId = job.id; saveWs(); },
      instructions: str(o.instructions) + `

This update moves the tool to kit version ${run.kit} (it was built with kit version ${x.from}). The owner started it with one click for the whole kit run (the GO); it is one tool of a run that updates the owner's tools one after another.
- Rebuild what the kit changes, following the new build brief (its PART P and the kit steps carry kit ${run.kit}); keep everything else as it is and keep all stored data.
- Acceptance lines: inputs.acceptance (PART C of the brief) — run every line before you republish. A failing line means: do not republish; report it in "tests" and "issues".${acc.length ? "" : " This tool has no acceptance lines: the live check is its only check."}
- Republish in place: the pages in inputs.pages (and inputs.artifacts) keep their url; claude.ai keeps the previous version, so it stays restorable. Change scheduled tasks only where the kit needs it. Write "kitVersion": "${run.kit}" into the tool's tool.json in firnlab/tools if it has one.
- Live check, twice in a row: after the republish open the published tool and run its main path, then do it again. Report every run, in order, as "smoke":{"runs":[{"ok":true|false,"at":"<ISO time>","note":"one line"}]}. The next tool starts only after two passing runs in a row.
- If a live check fails, or the update cannot be verified: republish the previous version (inputs.previous lists each page's version id before this update) so the previous version stays live, set "rolledBack": true and "verified": false.
- Also report "versions":[{"url":"<page url>","version":"<the live version id after your last publish>"}] and "kit":"${run.kit}".`});
    return orig.call(this, kind, o); }; }

async function fl19Start(mode = "start"){
  if (PT_PREVIEW){ toast(t("pv.blocked"), "err"); return null; }   // a preview copy never republishes real tools
  if (!hr18On()) return null;
  let R = fl19Run();
  if (mode === "continue"){
    if (!fl19Live(R) || fl19Cur(R)) return null;
    for (const x of R.tools) if (x.state === "needs"){ x.state = "waiting"; x.end = ""; }
    R.stoppedAt = ""; R.reason = "";
  } else {
    if (fl19Live(R)) return null;
    const P = fl19Plan(); if (!P.run.length && !P.others.length) return null;
    if (R) WS.settings.fleetPast = arr(WS.settings.fleetPast).concat([R]).slice(-5);
    R = {v: 1, id: uid("fl"), kit: P.kit, startedAt: now(), by: Store.isOwner !== false ? "owner" : "second",
      tools: P.run.map(p => ({pid: p.id, name: str(p.name), from: hr18KitOf(p) || "1.7.0", state: "waiting", jobId: "", up: "", at: "", end: "", note: "", tries: 0})),
      others: P.others.map(p => ({pid: p.id, name: str(p.name), from: hr18KitOf(p) || "1.7.0", why: fl19Other(p), at: ""})),
      nothing: P.nothing.map(p => ({pid: p.id, name: str(p.name), from: hr18KitOf(p) || "1.7.0"})),
      est: fl19Units(P.run.length), stoppedAt: "", reason: "", stops: [], cancelledAt: "", doneAt: ""};
    WS.settings.fleetRun = R;
  }
  saveWs(); UI.modal = null; render();
  if (R.tools.length) toast(t("fleet.started", {k: R.kit}), "ok");
  if (mode !== "continue") await fl19Prepare(R);
  await fl19Next();
  return R;
}
/** other people's tools: the brief with the new kit is stored; they publish it themselves (never republished here) */
async function fl19Prepare(R){
  for (const o of arr(R.others)){
    const p = fl19P(o.pid); if (!p || o.at) continue;
    try{ await storeBrief(p); }catch(e){ onAppError(e && e.message, "fleet:prepare"); continue; }
    o.at = now(); o.brief = str(p.brief && p.brief.id);
    logAct(p, t("fleet.act.prep", {k: R.kit}), {important: true}); touch(p);
  }
  saveWs();
}
async function fl19Next(){
  const R = fl19Run(); if (!fl19Live(R) || FL19.busy || PT_PREVIEW) return;
  if (R.stoppedAt) return;   // a red waits for you: Continue or Cancel
  if (fl19Cur(R)) return;    // the running job is watched (startJob, resumeJobs); its result calls this again
  const nx = R.cancelledAt ? null : R.tools.find(x => x.state === "waiting");
  if (!nx){ R.doneAt = now(); saveWs(); render(); if (!R.cancelledAt) toast(t("fleet.done.toast", {k: R.kit}), "ok"); return; }
  FL19.busy = true;
  try{ await fl19StartTool(R, nx); }
  finally{ FL19.busy = false; }
}
async function fl19StartTool(R, x){
  const ws0 = WS.id, p = fl19P(x.pid);
  if (!p || !p.live || p.status === "archived") return fl19Red(R, x, null, t("fleet.why.gone"));
  if (fl19Other(p)) return fl19Red(R, x, p, t("fleet.why.other"));
  Object.assign(x, {state: "running", at: now(), end: "", note: "", jobId: "", tries: num(x.tries, 0) + 1});
  saveWs(); render();
  actOpen(p, t("fleet.act.start", {k: R.kit}), {by: "pt", alone: true});
  const rp = addRestore(p, {kind: "fleet", label: t("fleet.rp", {k: R.kit})}) || arr(p.restore).slice(-1)[0];
  x.rp = rp ? str(rp.id) : "";
  const v = str(p.live.v);
  const u = {id: uid("up"), from: v, to: v, changes: [{k: "change", x: t("fleet.change", {a: x.from, b: R.kit})}], state: "running", at: now(), inventory: inventoryOf(p), fleet: R.id, kit: R.kit};
  p.updates = arr(p.updates); p.updates.push(u); x.up = u.id;
  logAct(p, t("fleet.act.start", {k: R.kit}), {important: true, kind: "job"});
  touch(p); actClose(p.id);
  try{ await storeBrief(p); }   // the brief with the new kit rules, as an update stores it before its job
  catch(e){ u.state = "notsent"; touch(p); return fl19Red(R, x, p, t("fleet.why.brief", {x: fl19Cut(e && e.message, 160)})); }
  if (WS.id !== ws0 || !WS.projects.includes(p)) return;   // the workspace changed meanwhile: the stored run starts this tool again on the next open (no job was made)
  FL19.starting = {run: R, x, p};
  let pr; try{ pr = updateJob(p, u); } finally { FL19.starting = null; }
  const job = await pr;
  if (WS.id !== ws0) return;
  if (!job){ u.state = "notsent"; touch(p); return fl19Red(R, x, p, t("fleet.why.nostart")); }
  x.jobId = job.id;
  if (job.status === "notsent"){ u.state = "notsent"; touch(p); return fl19Red(R, x, p, t("fleet.why.notsent", {x: fl19Cut(job.error, 160)})); }
  saveWs(); render();
}
/** green = the job verified the update AND the last two live checks passed (two greens in a row); anything else is red, with why */
function fl19Verdict(job){
  const r = (job && job.result) || {};
  if (!job || job.status === "notsent") return {green: false, why: t("fleet.why.notsent", {x: fl19Cut(job && job.error, 160)})};
  if (job.status !== "done") return {green: false, why: t("fleet.why.failed", {x: fl19Cut(job.error || r.error || r.summary, 160) || "—"})};
  const back = r.rolledBack === true ? " · " + t("fleet.why.back") : "";
  if (r.verified !== true){
    const T = r.tests || {}, first = [...arr(r.lost), ...arr(r.gaps), ...arr(r.issues), ...arr(r.fossils)].map(s => fl19Cut(s, 160)).find(Boolean);
    if (num(T.total, 0) > 0 && num(T.passed, 0) < num(T.total, 0)) return {green: false, why: t("fleet.why.tests", {a: num(T.passed, 0), b: num(T.total, 0)}) + (first ? " · " + first : "") + back};
    return {green: false, why: (first ? t("fleet.why.check", {x: first}) : t("fleet.why.notver")) + back};
  }
  const runs = arr(r.smoke && r.smoke.runs), n = runs.length;
  if (!n) return {green: false, why: t("fleet.why.nosmoke") + back};
  if (n >= 2 && runs[n - 1] && runs[n - 1].ok === true && runs[n - 2] && runs[n - 2].ok === true) return {green: true, why: ""};
  const bad = runs.slice().reverse().find(z => z && z.ok !== true);
  return {green: false, why: (bad ? t("fleet.why.smoke", {x: fl19Cut(bad.note, 160) || "—"}) : t("fleet.why.once")) + back};
}
function fl19Red(R, x, p, why){
  x.state = "needs"; x.end = now(); x.note = fl19Cut(why, 300);
  R.stops = arr(R.stops).concat([{pid: x.pid, name: p ? str(p.name) : x.name, why: x.note, at: x.end}]).slice(-40);
  if (R.cancelledAt) R.doneAt = now();
  else { R.stoppedAt = x.end; R.reason = x.note; }
  if (p){ logAct(p, t("fleet.act.stop", {k: R.kit, why: x.note}), {important: true, kind: "job"}); touch(p); }
  saveWs(); render();
  toast(t("fleet.stopped.toast", {x: p ? p.name : x.name, why: x.note}), "err");
  return null;
}
/** the job's result, applied inside applyJob (PT's own act): green → the new kit is stamped, the next tool starts; red → stop */
function fl19Judge(R, x, job, p, live0){
  if (!R || !x || x.state !== "running") return;
  const g = fl19Verdict(job), r = job.result || {}, u = p ? arr(p.updates).find(y => y.job === job.id || y.id === x.up) : null;
  if (!g.green){
    if (u && u.state === "verified") u.state = "notverified";
    if (p && live0) p.live = live0;   // the previous version stays live (the runner put it back: rolledBack)
    return fl19Red(R, x, p, g.why);
  }
  x.state = "done"; x.end = now(); x.note = "";
  if (p){
    const pages = new Set(fl19Pages(p)), n0 = arr(p.tool.versions).length;
    p.tool.versions = arr(p.tool.versions);
    for (const y of arr(r.versions)){ const url = str(y && y.url), ver = str(y && y.version);
      if (!pages.has(url) || !ver || p.tool.versions.some(z => z.url === url && z.version === ver)) continue;
      p.tool.versions.push({url, version: ver, v: p.live ? str(p.live.v) : "", at: now(), kitVersion: R.kit, fleet: R.id});
      rowHint(p, {src: "ver:" + url + "@" + ver, cause: "fleet", rp: str(x.rp), ms: 10000}); }   // the page's new version is a decision row: its event names the kit run and the restore point before it
    fl19StampBuild(p, R.kit, n0);
    logAct(p, t("fleet.act.done", {k: R.kit}), {important: true, kind: "job"}); touch(p);
  }
  saveWs();
  setTimeout(fl19Next, 0);
}
function fl19ToolOfJob(R, job){ return R && job && job.inputs && job.inputs.fleet === R.id ? R.tools.find(x => x.jobId === job.id) || null : null; }
{ const orig = JOB_APPLY.update; JOB_APPLY.update = function(job, p){
    const R = fl19Run(), x = fl19ToolOfJob(R, job), live0 = x && p && p.live ? clone(p.live) : null;
    const r = orig.apply(this, arguments);
    if (x) try{ fl19Judge(R, x, job, p, live0); }catch(e){ onAppError(e && e.message, "fleet:apply"); }
    return r; }; }
function fl19Cancel(){
  const R = fl19Run(); if (!fl19Live(R)) return;
  R.cancelledAt = now();
  if (!fl19Cur(R)) R.doneAt = R.cancelledAt;   // a running tool finishes (its job cannot be called back); nothing else starts
  saveWs(); render(); toast(t("fleet.cancelled.toast"), "");
}
/** on every open of the workspace: the stored run goes on where it was (never a new run: that is always your click) */
function fl19Resume(){
  const R = fl19Run(); if (!fl19Live(R) || PT_PREVIEW || !UI.wsReady) return;
  const x = fl19Cur(R);
  if (x){
    const job = x.jobId ? arr(WS.jobs).find(j => j.id === x.jobId) : null;
    if (!x.jobId){ x.state = "waiting"; x.at = ""; saveWs(); }   // the page closed before its job was made: no job exists, it starts again
    else if (!job) return void fl19Red(R, x, fl19P(x.pid), t("fleet.why.lost"));
    else if (job.status === "notsent") return void fl19Red(R, x, fl19P(x.pid), t("fleet.why.notsent", {x: fl19Cut(job.error, 160)}));
    else if (["done", "failed"].includes(job.status) && job.applied){ fl19Judge(R, x, job, fl19P(x.pid), null); return; }   // applied while the run was not written yet
    else return;   // still running: resumeJobs watches it, its result goes on from there
  }
  fl19Next();
}
{ const orig = openWorkspace; openWorkspace = async function(id){
    const r = await orig.apply(this, arguments);
    try{ if (WS && WS.id === id) fl19Resume(); }catch(e){ onAppError(e && e.message, "fleet:resume"); }
    return r; }; }

/* ---------- 3. what you see: the card (Health › My tools, Settings › General), the put-live card, the Inbox, the Sunday note ---------- */
function fl19Pill(st){
  const w = t("fleet.st." + st);
  return stSlot(FL19_SLOT[st] || "todo", w).replace(/(<span class="ssw"[^>]*>)[^<]*(<\/span>)/, "$1" + esc(w) + "$2");
}
function fl19ItemHTML(R, x){
  const el = x.at ? `<span class="small muted" data-fl19-at="${esc(x.at)}" data-fl19-end="${esc(x.end || "")}">${esc(fl19ElText(x.at, x.end))}</span>` : "";
  return `<li class="fl19-it" data-pid="${esc(x.pid)}" data-st="${esc(x.state)}">${fl19Pill(x.state)}<span class="fl19-n small">${esc(t("fleet.it", {name: fl19Name(x), a: x.from, b: R.kit}))}</span>${el}${x.note ? `<span class="fl19-why small">${esc(x.note)}</span>` : ""}</li>`;
}
function fl19Names(L){ return L.map(p => str(p.name)).join(", "); }
function fl19CardHTML(where){
  if (!hr18On()) return "";
  const R = fl19Run(), P = fl19Plan(), k = P.kit, live = hr18Live();
  if (!live.length && !R) return "";
  const blocked = fl19Blocked(), canStart = !fl19Live(R) && (P.run.length > 0 || P.others.length > 0);
  const startBtn = canStart && !blocked ? `<button class="btn sm primary" data-a="fl19-go">${ic("arrow")}${esc(t(P.run.length ? "fleet.btn" : "fleet.btn.prep", {k}))}</button>` : "";
  const head = P.mine.length ? t(P.mine.length === 1 ? "fleet.head1" : "fleet.head", {n: P.mine.length, k}) : P.others.length ? t("fleet.head.others", {n: P.others.length, k}) : t("fleet.none", {k});
  const lines = [];
  if (!fl19Live(R)){
    if (P.run.length) lines.push(`<p class="small muted">${esc(t("fleet.sub"))}</p>`);
    if (P.nothing.length) lines.push(`<p class="small">${esc(t("fleet.nothing", {x: fl19Names(P.nothing), k}))}</p>`);
    if (P.others.length) lines.push(`<p class="small">${esc(t("fleet.others", {x: fl19Names(P.others)}))}</p>`);
    if (blocked && (P.run.length || P.others.length)) lines.push(`<p class="small fl19-block">${esc(blocked)}</p>`);
  }
  let run = "";
  if (R){
    const d = R.tools.filter(x => x.state === "done").length, n = R.tools.length, cur = fl19Cur(R);
    const stopped = fl19Live(R) && R.stoppedAt && !cur, sx = stopped ? R.tools.find(x => x.state === "needs") : null;
    const h = !fl19Live(R) ? (R.cancelledAt ? t("fleet.run.cancelled", {t: fmtDate(R.cancelledAt)}) + " · " : "") + t("fleet.run.end", {k: R.kit, d, n})
      : stopped ? t("fleet.run.stop", {x: sx ? fl19Name(sx) : "—", why: R.reason}) : t("fleet.run.head", {k: R.kit, d, n});
    const acts = !fl19Live(R) ? "" : stopped
      ? (blocked ? "" : `<button class="btn sm primary" data-a="fl19-continue">${ic("arrow")}${esc(t("fleet.continue"))}</button>`) + `<button class="btn sm ghost" data-a="fl19-cancel">${esc(t("fleet.cancel"))}</button>`
      : R.cancelledAt ? "" : `<button class="btn sm ghost" data-a="fl19-cancel">${esc(t("fleet.cancel"))}</button>`;
    const since = fl19Live(R) ? `<p class="small muted">${esc(t("fleet.run.since", {t: fl19Clock(R.startedAt), d: fl19Dur(Date.now() - Date.parse(R.startedAt))}))}${R.cancelledAt ? " · " + esc(t("fleet.run.cancelling")) : ""}</p>` : "";
    const prep = arr(R.others).length ? `<div class="stack" style="gap:4px"><b class="small">${esc(t("fleet.prep.list"))}</b><ul class="fl19-list">${R.others.map(o => `<li class="fl19-it" data-pid="${esc(o.pid)}" data-st="prepared"><span class="fl19-n small">${esc(t("fleet.it", {name: fl19Name(o), a: o.from, b: R.kit}))} · ${esc(o.at ? t("fleet.prepared") : t("fleet.st.waiting"))}</span>${o.at ? `<button class="btn xs ghost" data-a="fl19-copy" data-pid="${esc(o.pid)}">${ic("copy")}${esc(t("fleet.copy"))}</button>` : ""}</li>`).join("")}</ul></div>` : "";
    if (where === "settings") run = `<div class="fl19-head"><b class="small">${esc(h)}</b>${fl19Live(R) ? `<button class="btn xs ghost" data-a="fl19-see">${esc(t("fleet.see.health"))}</button>` : ""}</div>`;
    else run = `<div class="fl19-head"><b class="small">${esc(h)}</b>${acts}</div>${since}${stopped ? `<p class="small">${esc(t("fleet.run.stop.sub", {x: sx ? fl19Name(sx) : "—"}))}</p>` : ""}
      ${n ? `<ul class="fl19-list" aria-label="${esc(t("fleet.title"))}">${R.tools.map(x => fl19ItemHTML(R, x)).join("")}</ul>` : ""}${prep}`;
  }
  const top = fl19Live(R) ? "" : `<div class="fl19-head"><b class="small">${esc(head)}</b>${startBtn}</div>${lines.join("")}`;
  return `<div class="fl19 stack" data-fl19="${esc(where)}">${where === "settings" ? `<h4>${esc(t("fleet.title"))}</h4>` : ""}${top}${run}</div>`;
}
/* Health › My tools: the line, the button and the run; what happens when the row turns red now names the kit run */
{ const orig = hr18Fleet; hr18Fleet = function(){
    const r = orig.apply(this, arguments);
    try{ r.extra = str(r.extra) + fl19CardHTML("health"); r.consequence = t("fleet.do", {k: fl19Kit()}); }catch(e){ onAppError(e && e.message, "fleet:health"); }
    return r; }; }
/* Settings › General, under the kit defaults ("Building blocks") */
{ const orig = kitDefaultsHTML; kitDefaultsHTML = function(){ let c = ""; try{ c = fl19CardHTML("settings"); }catch(e){ onAppError(e && e.message, "fleet:settings"); } return orig.apply(this, arguments) + c; }; }

/* the put-live card: the consequences of the whole run; Start is the GO (no auto-focus on it) */
MODAL14.fl19go = (m, p0, hd) => {
  const R = fl19Run(), cont = m.mode === "continue", k = cont && R ? R.kit : fl19Kit();
  let run, others = [], nothing = [];
  if (cont){ if (!fl19Live(R)) return hd(t("fleet.q.cont.title", {k})); run = R.tools.filter(x => x.state !== "done").map(x => fl19P(x.pid)).filter(Boolean); }
  else { const P = fl19Plan(); run = P.run; others = P.others; nothing = P.nothing; }
  if (!run.length && !others.length) return `${hd(t("fleet.q.title", {k}))}<p class="small muted">${esc(t("fleet.none", {k}))}</p>`;
  const acc = run.map(p => { const n = arr(p.tests).length; return n > 1 ? t("fleet.q.accn", {name: p.name, n}) : t(n ? "fleet.q.acc1" : "fleet.q.acc0", {name: p.name}); }).join(" · ");
  const u = fl19Units(run.length), left = Math.round(weekLeft());
  const L = run.length ? [t("fleet.q.what", {k, x: fl19Names(run)}), t("fleet.q.acc", {x: acc}), t("fleet.q.keep"), t("fleet.q.stop"), t("fleet.q.cost", {u, l: left}) + (u > left ? " " + t("fleet.q.over") : "")] : [];
  if (others.length) L.push(t("fleet.q.others", {x: fl19Names(others)}));
  if (nothing.length) L.push(t("fleet.q.nothing", {x: fl19Names(nothing), k}));
  const cols = [["r", "rt"], ["k", "kt"], ["c", "ct"]].map(([a, b]) => `<div><b class="small">${esc(t("fleet.q.u." + a))}</b><p class="small">${esc(t("fleet.q.u." + b))}</p></div>`).join("");
  const nx = cont && R ? R.tools.find(x => x.state === "needs") : null;
  const prepOnly = !cont && !run.length;
  return `${hd(cont ? t("fleet.q.cont.title", {k}) : prepOnly ? t("fleet.btn.prep", {k}) : t("fleet.q.title", {k}))}
    <p>${esc(cont ? t("fleet.q.cont.lead", {x: nx ? fl19Name(nx) : fl19Names(run.slice(0, 1))}) : t("fleet.q.lead"))}</p>
    <div class="fl19-q"><ul class="small">${L.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    ${prepOnly ? "" : `<b class="small">${esc(t("fleet.q.undo"))}</b><div class="fl19-cols">${cols}</div>`}
    <div class="row end"><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="${cont ? "fl19-continue-go" : "fl19-start"}">${ic("arrow")}${esc(cont ? t("fleet.continue") : prepOnly ? t("fleet.btn.prep", {k}) : t("fleet.q.go"))}</button></div>`;
};
AR18_KINDS.add("fl19go");   // its answers feed the approval-fatigue measure

/* the Inbox: one line while the run works or waits for you */
function fl19InboxLine(){
  const R = fl19Run(); if (!fl19Live(R)) return "";
  const cur = fl19Cur(R), n = R.tools.length;
  if (cur){ const i = R.tools.indexOf(cur) + 1;
    return `<div class="item fl19-line" data-st="running">${stSlot("cur")}<div class="body"><span class="small"><b>${esc(t("fleet.ib.run", {k: R.kit, i, n, x: fl19Name(cur)}))}</b></span><span class="small muted" data-fl19-at="${esc(cur.at)}" data-fl19-end="">${esc(fl19ElText(cur.at, ""))}</span></div><div class="qacts"><button class="btn xs" data-a="fl19-see">${esc(t("fleet.see"))}</button></div></div>`; }
  if (!R.stoppedAt) return "";
  const sx = R.tools.find(x => x.state === "needs"), w = R.tools.filter(x => x.state === "waiting").map(fl19Name);
  return `<div class="item fl19-line" data-st="needs">${stSlot("bad")}<div class="body"><span class="small"><b>${esc(t("fleet.ib.stop", {k: R.kit, x: sx ? fl19Name(sx) : "—", why: R.reason}))}</b></span><span class="small muted">${esc(t("fleet.ib.sub", {w: w.length ? w.join(", ") : t("fleet.ib.none")}))}</span></div><div class="qacts"><button class="btn xs" data-a="fl19-see">${esc(t("fleet.see"))}</button></div></div>`;
}
{ const orig = ib18HomeHTML; ib18HomeHTML = function(){
    const h = orig.apply(this, arguments); let line = "";
    try{ line = fl19InboxLine(); }catch(e){ onAppError(e && e.message, "fleet:inbox"); }
    return line && h ? h.replace('<div class="list">', '<div class="list">' + line) : h; }; }

/* the Sunday note: a stop names the tool and why (and whether it still waits); tools moved to the new kit get one line */
function fl19NoteLines(from, to){
  const inWin = iso => { const x = Date.parse(iso); return !isNaN(x) && x >= Date.parse(from) && x < Date.parse(to); };
  const out = [], runs = [...arr(WS.settings.fleetPast), WS.settings.fleetRun].filter(R => R && Array.isArray(R.tools));
  for (const R of runs){
    const live = fl19Live(R) && R.stoppedAt, still = live ? R.tools.find(x => x.state === "needs") : null;
    for (const s of arr(R.stops)) if (inWin(s.at) || (still && s.pid === still.pid && s.at === R.stoppedAt))
      out.push({k: "stop", pid: s.pid, text: t("fleet.note.stop", {k: R.kit, x: s.name, why: s.why}) + (still && s.pid === still.pid && s.at === R.stoppedAt ? " · " + t("fleet.note.still") : "")});
    const done = R.tools.filter(x => x.state === "done" && inWin(x.end));
    if (done.length) out.push({k: "done", text: t("fleet.note.done", {k: R.kit, x: done.map(fl19Name).join(", ")})});
  }
  return out.slice(-12);
}
{ const orig = wk18Build; wk18Build = async function(){
    const doc = await orig.apply(this, arguments);
    if (doc){ try{ doc.fleet = fl19NoteLines(doc.from, doc.to); if (doc.fleet.length){ await Store.putNow(wk18Path(doc.key), doc); RUN18.notes.set(doc.key, doc); } }catch(e){ onAppError(e && e.message, "wk18:fleet"); } }
    return doc; }; }
{ const orig = wk18Entries; wk18Entries = function(n){
    const E = orig(n);
    for (const f of arr(n && n.fleet)) E.push(f.k === "stop"
      ? {sec: "wait", secs: wk18Secs(f.text, true), html: `<div class="item wk18-fl">${stSlot("bad")}<div class="body"><span class="small">${esc(f.text)}</span></div><div class="qacts"><button class="btn xs" data-a="fl19-see">${esc(t("fleet.see"))}</button></div></div>`}
      : {sec: "tools", secs: wk18Secs(f.text, false), html: `<div class="item wk18-fl">${stSlot("done")}<div class="body"><span class="small">${esc(f.text)}</span></div></div>`});
    return E; }; }

/* the time each tool took, kept current without redrawing the page (nothing moves while you read or type) */
setInterval(() => { try{ for (const el of document.querySelectorAll("[data-fl19-at]")) el.textContent = fl19ElText(el.dataset.fl19At, el.dataset.fl19End); }catch(e){ onAppError(e && e.message, "fleet:tick"); } }, 15000);

/* ---------- 4. actions ---------- */
Object.assign(ACTIONS, {
  "fl19-go": () => { if (fl19Blocked()){ toast(fl19Blocked(), "err"); return; } UI.modal = {kind: "fl19go", mode: "start", wide: true}; render(); },
  "fl19-start": () => fl19Start("start"),
  "fl19-continue": () => { if (fl19Blocked()){ toast(fl19Blocked(), "err"); return; } UI.modal = {kind: "fl19go", mode: "continue", wide: true}; render(); },
  "fl19-continue-go": () => fl19Start("continue"),
  "fl19-cancel": () => fl19Cancel(),
  "fl19-see": () => { UI.modal = null; UI.view = "settings"; UI.setTab = "health"; render(); setTimeout(() => { const e = document.querySelector('.fl19[data-fl19="health"]'); if (e) e.scrollIntoView({block: "center"}); }, 0); },
  "fl19-copy": el => { const p = fl19P(str(el.dataset.pid)); if (p) copyText(buildBriefText(p)); }
});
/* they change the workspace's run or open a dialog; each tool's own start and result are acts of that tool */
for (const a of ["fl19-go", "fl19-start", "fl19-continue", "fl19-continue-go", "fl19-cancel", "fl19-see", "fl19-copy"]) ACT_NO.add(a);

/* ---------- 5. the look (tokens of the 1.8 look; no new colours) ---------- */
const FL19_CSS = `
.fl19{border-top:1px solid var(--line);padding-top:10px;min-width:0}
.fl19 h4{margin:0}
.fl19-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.fl19-head b{flex:1 1 14em;min-width:0;overflow-wrap:break-word}
.fl19-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.fl19-it{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;min-width:0}
.fl19-n{flex:1 1 12em;min-width:0;overflow-wrap:break-word}
.fl19-why{flex:1 1 100%;color:var(--fg-2);overflow-wrap:break-word;min-width:0}
.fl19-block{color:var(--warn)}
.fl19-q{background:var(--warn-soft);color:var(--fg);border-radius:16px;padding:10px 14px;margin:8px 0}
.fl19-q ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.fl19-q li{overflow-wrap:break-word}
.fl19-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 14px;margin:6px 0 10px}
.fl19-cols p{margin:2px 0 0;color:var(--fg-2);overflow-wrap:break-word}
@media (max-width:599px){ .fl19-cols{grid-template-columns:minmax(0,1fr)} }`;
function fl19Css(){ if (typeof document === "undefined" || document.getElementById("fl19-css")) return; const s = document.createElement("style"); s.id = "fl19-css"; s.textContent = FL19_CSS; (document.head || document.body).appendChild(s); }
fl19Css();
