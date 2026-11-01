/* ===================== 1.8 health rows, second owner's own note + Chinese first screen, 1.7 -> 1.8 migration =====================
   PLAN-1.8 (not-yet-brought-up round 4, 5, 6, 8, 10; unification round) and DESIGN-1.8-rev2 §0.12, §10, §14, §17 — PLAN wins.
   1. Health (Settings › Health): five rows — My tools (fleet), Honesty, Economy, Security, Your time. Each row: value · trend ·
      threshold · what happens when it turns red. Status = glyph + word + colour in four states: fine · watch (one bad signal) ·
      act (two or more: a red needs two signals) · not measured yet. Each row keeps its earlier reds and how they ended
      (<workspace>/health18/log). Only what PT can measure is shown; estimates say "estimate"; no data says "not measured yet".
      PT counts its own AI calls and approval answers per day — numbers only, never text — in <workspace>/health18-<day>/<tab id>
      (one document per page load, like 1.7.1's metrics).
   2. The second owner's first day: the first time a login that is not the owner's, or a workspace whose language is Chinese, opens
      1.8 — one screen in that workspace's language: what changed, the Example tool ("Try it", never pushed), her Sunday note time,
      and the cone once. Decided by login and workspace language, never by a name. Her settings live in her own workspace in her own
      login: her decisions never become the owner's defaults and the owner's never hers.
   3. Moving 1.7 -> 1.8, once per workspace, before anything else changes: one restore point per project ("Before 1.8", made from the
      project as it was stored); the decision rows come by projection (v180_rows.js takes this restore point for its "migrated"
      event); tools that existed get kit 1.7.0 in the fleet; the first month starts (boot18); one Undo — during the first 30 days —
      takes the move back. Nothing is ever deleted (restore points stay; the owner deletes them).
   4. PT checks itself: test/self18.py (accessibility and performance budgets on PT's own screens).
   5. Tool backups: "Export tool data" on each live tool's Run page says how the tool's own export works and where the file goes;
      timer tools' weekly snapshot is listed in the fleet row.
   6. Handover: the yearly restore check (export, import into a fresh workspace, open one tool) — one line in the Sunday note.
   Hooks for the other 1.8 parts:
   - the cone (v180_cone.js) fills cone18Ready / cone18Rerun (below); until then no cone offer is shown anywhere;
   - the Sunday note (v180_run.js) reads note18Get() (day and time), health18Lines() (rows that are not fine) and
     restoreCheck18Line({seen: true}) (the yearly line, null when not due);
   - approval dialogs of other parts add their modal kind to AR18_KINDS (their answers feed the fatigue measure);
   - boot18() says whether the first month runs (fixed thresholds, "research estimate" until 3 builds, recalibration from month 3). */

/* ---------- 0. hooks the other 1.8 parts fill (until then: off, nothing broken) ---------- */
/** The cone fills these by assignment (build.py allows one declaration per name), e.g. in v180_cone.js:
      cone18Ready = () => true;
      cone18Rerun = (p, {why}) => { … open the cone once for tool p …; return true; };   // why: "migrate" | "dayone"
    While cone18Ready() is false PT shows no cone offer (no button that does nothing). */
function cone18Ready(){ return false; }
function cone18Rerun(p, o){ return false; }
/** modal kinds that ask for an approval; their answers are counted for the fatigue measure (other parts add theirs) */
const AR18_KINDS = new Set(["confirm", "cost", "mig18undo"]);

/* ---------- small helpers ---------- */
function hr18On(){ return typeof WS !== "undefined" && !!WS && !!WS.id && !!WS.settings; }
function hr18Tz(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich"; }catch(e){ return "Europe/Zurich"; } }   // ok:catch an old browser without time zones: Zürich, as the owner decided for the note
function hr18Days(a, b = Date.now()){ const x = Date.parse(str(a)); return isNaN(x) ? 0 : Math.floor((b - x) / 86400000); }
function hr18Plus(iso, days){ const x = Date.parse(str(iso)); return isNaN(x) ? "" : new Date(x + days * 86400000).toISOString(); }
/** status pill: glyph + word + colour (the 1.8 look's pill, with the health words) */
const HR18_SHAPE = {ok: "ok", watch: "warn", act: "bad", none: "todo"};
function hr18Pill(st){
  const s = HR18_SHAPE[st] || "todo", w = t("hr.st." + (HR18_SHAPE[st] ? st : "none"));
  return `<span class="sslot pill18 ss-${s} hr18-pill" role="img" aria-label="${esc(w)}"><svg viewBox="0 0 18 18" aria-hidden="true">${ST_SHAPE[s]}</svg><span class="ssw" aria-hidden="true">${esc(w)}</span></span>`;
}

/* ===================== 3. moving 1.7 -> 1.8 ===================== */
const MIG18 = {raw: null, ran: null, quiet: false, busy: false};
const MIG18_UNDO_DAYS = 30;
/* settings that mark one-time steps or hold this file's own records: never part of what the move changed or what its Undo sets back */
const MIG18_KEEP = /^(look18|migrated\d+|m\d+|mig18|so18|note18|hr18|rc18|exp18|usage|seenVersion|digestSeen|levelAsked|modeBefore\d+)$/;
function mig18(){ return hr18On() ? WS.settings.mig18 || null : null; }
/** a moved project counts as changed since the move once it is saved through touch (every change by you or by PT goes through it;
    filling in defaults while a screen is drawn does not) */
function mig18Touched(p){
  const M = mig18(); if (!M || M.undone || !p || !p.id || !M.rps || !M.rps[p.id] || (M.touched && M.touched[p.id]) || !arr(WS.projects).includes(p)) return;
  M.touched = Object.assign({}, M.touched, {[p.id]: now()}); saveWs();
}
{ const orig = touch; touch = function(p){ try{ mig18Touched(p); }catch(e){ console.warn("1.8 move: changed since", e); } return orig.apply(this, arguments); }; }   // ok:catch at worst the Undo restores a project that did not change (nothing is lost)
/* the project exactly as it was stored, kept while a workspace that was not moved yet opens (the restore point is made from it) */
{ const orig = normalizeProject; normalizeProject = function(p){
    try{ if (MIG18.raw && p && p.id && !MIG18.raw.has(p.id) && hr18On() && WS._set && !WS.settings.mig18) MIG18.raw.set(p.id, clone(p)); }catch(e){ console.warn("1.8 move: copy as stored", e); }   // ok:catch without the copy the restore point is made from the loaded project
    return orig.apply(this, arguments); }; }
/** the move itself: runs once per workspace when it opens, before the 1.8 parts change anything (applySettings, below) */
function mig18Run(){
  const before = {}; for (const [k, v] of Object.entries(WS.settings)) if (!MIG18_KEEP.test(k)) before[k] = v === undefined ? null : clone(v);
  const rps = {}, kit = {};
  for (const p of WS.projects){
    try{
      const raw = MIG18.raw && MIG18.raw.get(p.id);
      const rp = addRestore(p, {kind: "migrate", label: t("mig.rp"), source: raw || null}) || arr(p.restore).slice(-1)[0] || null;   // the same content as the last restore point: that one is labelled "Before 1.8" too
      if (rp){ rps[p.id] = rp.id; saveProject(p); }
      if (p.live || arr(p.tool && p.tool.versions).length) kit[p.id] = "1.7.0";   // DESIGN §10: tools built so far are kit 1.7.0 in the fleet
    }catch(e){ onAppError(e && e.message, "mig18"); }
  }
  WS.settings.mig18 = {v: 1, at: now(), from: str(WS.settings.seenVersion), pt: PT_VERSION, n: WS.projects.length, rps, kit, touched: {}, changed: {}, undone: null, cone: {}};
  MIG18.before = before;
  saveWs();
  MIG18.ran = {ws: WS.id, n: Object.keys(rps).length};
}
/** after the first open: which settings the 1.8 parts changed while it opened (its Undo sets back exactly those, if you did not change them since) */
function mig18Changed(){
  const M = mig18(), B = MIG18.before; MIG18.before = null; if (!M || !B) return;
  const keys = new Set([...Object.keys(B), ...Object.keys(WS.settings)].filter(k => !MIG18_KEEP.test(k)));
  for (const k of keys){ const a = B[k] === undefined ? null : B[k], b = WS.settings[k] === undefined ? null : WS.settings[k]; if (JSON.stringify(a) !== JSON.stringify(b)) M.changed[k] = {from: a, to: clone(b)}; }
  if (Object.keys(M.changed).length) saveWs();
}
function mig18CanUndo(){ const M = mig18(); return !!M && !M.undone && Object.keys(M.rps || {}).length > 0 && hr18Days(M.at) < MIG18_UNDO_DAYS; }
/** one Undo for the whole move: every moved project back to "Before 1.8" (unchanged ones stay), the settings the move changed set back */
async function mig18UndoGo(){
  const M = mig18(); if (!M || M.undone || MIG18.busy) return 0;
  MIG18.busy = true; MIG18.quiet = true; let n = 0;
  try{
    for (const [pid, rid] of Object.entries(M.rps || {})){
      const p = WS.projects.find(x => x.id === pid); if (!p || !arr(p.restore).some(r => r.id === rid)) continue;
      if (!(M.touched || {})[pid]) continue;   // nothing changed since the move: it stays as it is
      await doRestore(p, rid); n++;
    }
    for (const [k, c] of Object.entries(M.changed || {})){
      if (MIG18_KEEP.test(k) || JSON.stringify(WS.settings[k] === undefined ? null : WS.settings[k]) !== JSON.stringify(c.to)) continue;   // you changed it since: yours stays
      if (c.from === null) delete WS.settings[k]; else WS.settings[k] = clone(c.from);
    }
    M.undone = {at: now(), n}; saveWs(); applySettings();
  }finally{ MIG18.busy = false; MIG18.quiet = false; }
  UI.modal = null; render(); toast(t("mig.done", {n}), "ok");
  return n;
}
{ const orig = toast; toast = function(msg, kind = ""){ if (MIG18.quiet && msg === t("rp.restored")) return; return orig.apply(this, arguments); }; }
/* v180_rows.js makes a restore point for a 1.7 project's "migrated" event: the move's own restore point is that point */
{ const orig = rowRestore; rowRestore = function(p, label, kind){
    if (kind === "migrate"){ const M = mig18(), id = M && M.rps && p && M.rps[p.id], r = id && arr(p.restore).find(x => x.id === id); if (r) return r; }
    return orig.apply(this, arguments); }; }
{ const orig = applySettings; applySettings = function(){
    try{ if (MIG18.raw && hr18On() && WS._set && !WS.settings.mig18 && Array.isArray(WS.projects)) mig18Run(); }catch(e){ onAppError(e && e.message, "mig18:run"); }
    return orig.apply(this, arguments); }; }
{ const orig = openWorkspace; openWorkspace = async function(id){
    hr18Reset();
    MIG18.raw = new Map(); MIG18.ran = null; MIG18.before = null;
    let r; try{ r = await orig.apply(this, arguments); } finally { MIG18.raw = null; }
    try{ mig18After(); }catch(e){ onAppError(e && e.message, "mig18:after"); }
    return r; }; }
function mig18After(){
  if (!hr18On() || !UI.wsReady) return;
  const ran = MIG18.ran && MIG18.ran.ws === WS.id ? MIG18.ran : null; MIG18.ran = null;
  if (ran) mig18Changed();
  if (so18Due()) so18Show();
  else if (ran && ran.n && !(UI.modal && UI.modal.kind === "whatsnew")) mig18Toast(ran.n);   // What's new already says it, with the same Undo
  const ws = WS.id; setTimeout(() => hr18Daily(ws), 4000);
}
/** the move's line with its Undo (8 s, longer while it has the focus) */
function mig18Toast(n){
  let host = document.getElementById("toasts"); if (!host){ host = document.createElement("div"); host.id = "toasts"; host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div"); el.className = "toast ok mig18-toast"; el.setAttribute("role", "status");
  el.appendChild(document.createTextNode(t("mig.toast", {n}) + " "));
  const b = document.createElement("button"); b.className = "btn xs"; b.dataset.a = "mig18-undo"; b.textContent = t("mig.undo"); el.appendChild(b);
  host.appendChild(el);
  const end = () => { if (el.contains(document.activeElement)){ setTimeout(end, 8000); return; } el.remove(); };
  setTimeout(end, 8000);
}
function mig18ConeMark(pid, st){ const M = mig18(); if (!M || !pid) return; M.cone = Object.assign({}, M.cone, {[pid]: {st, at: now()}}); saveWs(); }
/** the move in Health: what happened, its Undo, the cone once per tool (when the cone exists), the first month */
function mig18PanelHTML(){
  const M = mig18(); if (!M) return "";
  const n = Object.keys(M.rps || {}).length;
  const line = M.undone ? t("mig.undone", {d: fmtDate(M.undone.at), n: M.undone.n}) : n ? t("mig.line", {d: fmtDate(M.at), n}) : t("mig.fresh", {d: fmtDate(M.at)});
  const undo = mig18CanUndo() ? `<div class="row"><button class="btn sm" data-a="mig18-undo">${ic("undo")}${esc(t("mig.undo"))}</button></div>` : !M.undone && n ? `<p class="small muted">${esc(t("mig.late"))}</p>` : "";
  const tools = M.undone || !cone18Ready() ? [] : WS.projects.filter(p => M.rps && M.rps[p.id] && p.status !== "archived" && !p.example18);
  const cone = tools.length ? `<p class="small">${esc(t("mig.cone"))}</p><ul class="hr18-list">${tools.map(p => { const c = (M.cone || {})[p.id];
      return `<li class="row"><span style="flex:1 1 12em">${esc(p.name)}</span>${c ? `<span class="small muted">${esc(c.st === "done" ? t("mig.cone.done", {d: fmtDay(c.at)}) : t("mig.cone.skipped"))}</span>` : `<button class="btn sm" data-a="mig18-cone" data-pid="${esc(p.id)}">${esc(t("mig.cone.go"))}</button><button class="btn sm ghost" data-a="mig18-cone-skip" data-pid="${esc(p.id)}">${esc(t("mig.cone.skip"))}</button>`}</li>`; }).join("")}</ul>` : "";
  return `<div class="stack mig18-panel" data-mig18="1"><h4>${esc(t("mig.title"))}</h4><p class="small">${esc(line)}</p>${undo}${cone}</div>`;
}
MODAL14.mig18undo = (m, p, hd) => {
  const M = mig18(); if (!M) return hd(t("mig.q.title"));
  const head = hd(t("mig.q.title"));
  return `${head}<p>${esc(t("mig.q.lead", {d: fmtDate(M.at)}))}</p><ul class="small"><li>${esc(t("mig.q.keep"))}</li><li>${esc(t("mig.q.same"))}</li><li>${esc(t("mig.q.new"))}</li></ul>
    <p class="small muted">${esc(t("mig.q.cannot"))}</p><div class="row end"><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="mig18-undo-go">${ic("undo")}${esc(t("mig.q.go"))}</button></div>`;
};
/* What's new names the move and its Undo (no extra heading: the list of versions keeps one heading per version) */
{ const orig = whatsNewModal; whatsNewModal = function(m){
    const h = orig.apply(this, arguments), M = mig18(); if (!M || !mig18CanUndo()) return h;
    return h.replace(/(<p class="lead">[\s\S]*?<\/p>)/, `$1<div class="panel flat mig18-wn"><p class="small">${esc(t("mig.wn", {n: Object.keys(M.rps || {}).length}))} <button type="button" class="linkish" data-a="mig18-undo">${esc(t("mig.undo"))}</button></p></div>`); }; }

/** the first month after the move (DESIGN §10, where it applies): fixed thresholds, raw counts for your own tools, cost figures are
    research estimates until 3 builds are logged, proposals to recalibrate start in month 3. Other parts ask boot18() */
function boot18(){
  const M = mig18(), since = M ? str(M.at) : "", day = since ? hr18Days(since) + 1 : 0;
  const builds = arr(hr18On() ? WS.jobs : []).filter(j => j && j.kind === "build" && j.status === "done").length;
  return {on: !!M && day <= 30, since, day, until: since ? hr18Plus(since, 30) : "", builds, buildsNeeded: 3, estimateOnly: builds < 3, recalFrom: since ? hr18Plus(since, 60) : "", fixedThresholds: true, rawCounts: true};
}

/* ===================== 2. the second owner's first day ===================== */
function so18(){ return (hr18On() && WS.settings.so18) || {}; }
/** by login and language only: a login that is not the owner's, or a workspace in Chinese */
function so18Eligible(){ return hr18On() && (!Store.isOwner || WS.settings.lang === "zh"); }
function so18Due(){ return so18Eligible() && !!mig18() && !so18().shown; }
function so18Show(){
  if (UI.modal && UI.modal.kind !== "whatsnew") return;   // a PIN code to note down comes first; the screen waits for the next open
  UI.modal = {kind: "so18", wide: true};
  WS.settings.so18 = Object.assign({}, so18(), {shown: now()}, cone18Ready() && so18ConeTarget() ? {coneOffered: now()} : {});
  saveWs(); render();
}
/** the tool the cone walks through on day one: the most recently changed own project */
function so18ConeTarget(){ return arr(WS.projects).filter(p => p && !p.example18 && p.status !== "archived").sort((a, b) => str(b.updatedAt).localeCompare(str(a.updatedAt)))[0] || null; }
function so18Close(done){
  const sel = document.getElementById("so18-time");
  if (sel && note18Set(str(sel.value), "dayone") && done) toast(t("so.note.saved", {x: sel.value}), "ok");
  WS.settings.so18 = Object.assign({}, so18(), {seen: now()}); saveWs();
  UI.modal = null; render();
}
/** the Example tool: made on "Try it" only, from fixed text in the workspace language, no AI call; archive it any time */
function so18Example(){
  const ex = WS.projects.find(x => x.example18 && x.status !== "archived"); if (ex){ openProject(ex.id); return ex; }
  const p = newProject(t("so.ex.name"), {raw: t("so.ex.raw")});
  actOpen(p, t("so.ex.h"), {by: "you"});
  p.example18 = true;
  Object.assign(p.northStar, {problem: t("so.ex.problem"), goal: t("so.ex.goal"), users: t("so.ex.users"), success: t("so.ex.success")});
  for (const k of ["1", "2", "3"]) p.requirements.push({id: nextReqId(p), title: t("so.ex.r" + k + "t"), given: t("so.ex.r" + k + "g"), when: t("so.ex.r" + k + "w"), then: t("so.ex.r" + k + "h"), priority: "must", dim: "", st: "ok", manual: true});
  logDecision(p, t("so.ex.d1q"), t("so.ex.d1a"), t("so.ex.dwhy")); logDecision(p, t("so.ex.d2q"), t("so.ex.d2a"), t("so.ex.dwhy"));
  logAct(p, t("so.ex.h"), {important: true});
  actClose(p.id); touch(p); render();
  return p;
}
function so18Hours(cur){ const H = []; for (let h = 6; h <= 22; h++) H.push(String(h).padStart(2, "0") + ":00"); if (cur && !H.includes(cur)) H.push(cur); return H.sort(); }
MODAL14.so18 = (m, p0, hd) => {
  const M = mig18(), moved = M ? Object.keys(M.rps || {}).length : 0, ex = WS.projects.find(x => x.example18 && x.status !== "archived"), N = note18Get();
  const cone = cone18Ready() && !!so18ConeTarget(), head = hd(t("so.title"));
  return `${head}<p class="lead">${esc(t("so.lead"))}</p>
    <ul class="so18-list">${["c1", "c2", "c3", "c4", "c5"].map(k => `<li>${esc(t("so." + k))}</li>`).join("")}</ul>
    <p class="small">${esc(moved ? t("so.moved", {n: moved}) : t("so.moved0"))}${mig18CanUndo() ? ` <button type="button" class="linkish" data-a="mig18-undo">${esc(t("mig.undo"))}</button>` : ""}</p>
    <section class="so18-ex" aria-label="${esc(t("so.ex.h"))}"><b class="small">${esc(t("so.ex.h"))}</b>
      <div class="so18-sketch">${hr18Pill("ok")}<div class="so18-sk-t"><b>${esc(t("so.ex.name"))}</b><span class="small muted">${esc(t("so.ex.line"))}</span></div><button class="btn sm" data-a="so18-example">${ic("play")}${esc(t(ex ? "so.ex.open" : "so.ex.try"))}</button></div>
      <p class="small muted">${esc(t("so.ex.note"))}</p></section>
    <label class="fld so18-note"><span>${esc(t("so.note.h"))} · ${esc(t("so.note.label"))}</span><select id="so18-time">${so18Hours(N.time).map(h => `<option value="${h}" ${h === N.time ? "selected" : ""}>${h}</option>`).join("")}</select><span class="hint">${esc(t("so.note.sub"))}</span></label>
    ${cone ? `<div class="so18-cone"><p class="small">${esc(t("so.cone"))}</p><div class="row"><button class="btn sm" data-a="so18-cone">${esc(t("so.cone.go"))}</button></div></div>` : ""}
    <div class="row end"><button class="btn primary" data-a="so18-done">${ic("check")}${esc(t("so.done"))}</button></div>`;
};

/* ---------- the Sunday note time: per workspace (her own note in her own login); default Sunday 14:00 Zürich (owner, 31 Oct 2026) ---------- */
/** for the Sunday note (v180_run.js): {day: 0 = Sunday, time "HH:MM", tz, set: chosen by the person, by: "default" | "dayone" | "settings"} */
function note18Get(){
  const n = (hr18On() && WS.settings.note18) || {};
  return {day: 0, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(str(n.time)) ? n.time : "14:00", tz: str(n.tz) || "Europe/Zurich", set: !!n.at, by: str(n.by) || "default", at: str(n.at)};
}
function note18Set(time, by = "settings"){
  if (!hr18On() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(str(time))) return false;
  WS.settings.note18 = {day: 0, time, tz: hr18Tz(), at: now(), by}; saveWs(); return true;
}
function note18SettingsHTML(){
  const N = note18Get();
  return `<div class="stack note18-set"><h3>${esc(t("so.set.h"))}</h3><p class="small muted">${esc(t("so.set.sub"))}</p><label class="fld" style="max-width:18em"><span>${esc(t("so.note.label"))}</span><select data-a-change="so18-note-time">${so18Hours(N.time).map(h => `<option value="${h}" ${h === N.time ? "selected" : ""}>${h}</option>`).join("")}</select></label></div>`;
}
{ const orig = viewSettings; viewSettings = function(){ const h = orig.apply(this, arguments); if (UI.setTab !== "general") return h; try{ return h.replace(/(<div class="stack lg">)/, "$1" + note18SettingsHTML()); }catch(e){ return h; } }; }   // ok:catch without the block Settings still shows

/* ===================== 1. health: counting (numbers only) ===================== */
const HR18 = {doc: null, path: "", day: "", dirty: false, prompts: new Map(), modal: null, modalAt: 0, modalWords: 0, recent: null, met28: null, log: null, audit: null, loading: false, logT: 0};
function hr18Doc(){
  if (!hr18On()) return null;
  const day = metDay();
  if (!HR18.doc || HR18.day !== day || HR18.doc.ws !== WS.id){
    if (HR18.doc && HR18.dirty) hr18Flush();
    HR18.day = day; HR18.path = wsPath() + "/health18-" + day + "/" + TAB_ID;
    HR18.doc = {v: 1, day, ws: WS.id, pt: PT_VERSION, ai: {tasks: 0, calls: 0, fail: 0, out: 0, tok: 0, cached: 0, units: 0, quick: 0, def: 0, complex: 0}, ar: {fast: 0, read: 0, cancel: 0}};
  }
  return HR18.doc;
}
function hr18Flush(){
  if (!HR18.dirty || !HR18.doc) return;
  HR18.dirty = false;
  try{ Store.put(HR18.path, HR18.doc); }catch(e){ HR18.dirty = true; }   // ok:catch retried at the next flush
}
function hr18Reset(){ hr18Flush(); clearTimeout(HR18.logT); Object.assign(HR18, {doc: null, path: "", day: "", dirty: false, recent: null, met28: null, log: null, audit: null, loading: false, modal: null}); }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") hr18Flush(); });
window.addEventListener("pagehide", () => hr18Flush());
setInterval(hr18Flush, 60000);
/** estimated tokens of a text: about 4 characters per token, one per Chinese/Japanese/Korean character */
function hr18Tokens(s){ s = str(s); const cjk = (s.match(/[　-鿿가-힯＀-￯]/g) || []).length; return Math.round(cjk + (s.length - cjk) / 4); }
function hr18AiCall(input, opts, out, ok){
  const d = hr18Doc(); if (!d) return;
  const A = d.ai; A.calls++; HR18.dirty = true;
  if (!ok){ A.fail++; return; }
  const tier = str(opts && opts.modelTier) || "default";
  A[tier === "quick" ? "quick" : tier === "complex" || tier === "top" ? "complex" : "def"]++;
  A.units += TIER_WEIGHT[tier] || 3;
  const text = str(out); A.out += text.length; A.tok += hr18Tokens(text);
  // the runtime replays an identical request for 5 minutes unless it was sent with cache: false — such a call counts as cached (an estimate)
  const key = hash64(typeof input === "string" ? input : JSON.stringify(input)) + "|" + tier + "|" + str(opts && opts.model), at = Date.now(), last = HR18.prompts.get(key);
  if (!(opts && opts.cache === false) && last && at - last < 300000) A.cached++;
  HR18.prompts.delete(key); HR18.prompts.set(key, at); if (HR18.prompts.size > 400) HR18.prompts.delete(HR18.prompts.keys().next().value);
}
/** PT's AI calls pass through here (the same calls, the same answers); only counts are kept */
function hr18WrapSample(s){
  const rec = (input, opts, out, ok) => { try{ hr18AiCall(input, opts, out, ok); }catch(e){ console.warn("health: count", e); } };   // ok:catch counting never stops an AI call
  const w = function(input, opts){ return s(input, opts).then(r => { rec(input, opts, r && r.text, true); return r; }, e => { rec(input, opts, "", false); throw e; }); };
  w.json = function(input, opts){ return s.json(input, opts).then(r => { rec(input, opts, r == null ? "" : JSON.stringify(r), true); return r; }, e => { rec(input, opts, "", false); throw e; }); };
  for (const k of Object.keys(s)) if (!(k in w)) w[k] = typeof s[k] === "function" ? (...a) => s[k](...a) : s[k];
  if (typeof s.limits === "function" && !w.limits) w.limits = (...a) => s.limits(...a);
  return w;
}
{ const orig = getSample; let base = null, wrapped = null;
  getSample = async function(){ const s = await orig.apply(this, arguments); if (!s || typeof s !== "function") return s; if (s !== base){ base = s; wrapped = hr18WrapSample(s); } return wrapped; }; }
/* a task = one AI step PT runs (with its repairs and escalations); steps per task = model calls ÷ tasks */
function hr18Task(orig){ return async function(){ const d = hr18Doc(), c0 = d ? d.ai.calls : 0; try{ return await orig.apply(this, arguments); } finally { if (d && d === HR18.doc && d.ai.calls > c0){ d.ai.tasks++; HR18.dirty = true; } } }; }
{ const orig = runAI; runAI = hr18Task(orig); }
{ const orig = sampleWith; sampleWith = hr18Task(orig); }
/* approval dialogs: answered after reading time, or a "no" = a considered answer; faster than reading = clicking through */
function ar18Counts(m){
  if (!m) return false; if (AR18_KINDS.has(m.kind)) return true;
  const el = document.querySelector(".overlay .modal"); return !!(el && el.querySelector('[data-a="confirm-yes"], .btn.danger'));
}
/** reading time: about 80 ms a word (faster than skimming, ~700 words a minute), at least 1 s, at most 2.5 s; a Chinese character counts as half a word */
function ar18ReadMs(words){ return Math.min(2500, Math.max(1000, Math.round(words * 80))); }
function ar18Seen(){
  const m = UI.modal; if (m === HR18.modal || (!m && !HR18.modal)) return;
  HR18.modal = m && ar18Counts(m) ? m : null; if (!HR18.modal) return;
  HR18.modalAt = Date.now();
  const txt = str((document.querySelector(".overlay .modal") || {}).innerText), cjk = (txt.match(/[　-鿿]/g) || []).length;
  HR18.modalWords = txt.replace(/[　-鿿]/g, " ").split(/\s+/).filter(Boolean).length + cjk / 2;
}
function ar18Answer(kind){ const d = hr18Doc(); if (!d) return; d.ar[kind]++; HR18.dirty = true; HR18.modal = null; }
{ const orig = afterRender; afterRender = function(){ const r = orig.apply(this, arguments); try{ ar18Seen(); }catch(e){ onAppError(e && e.message, "ar18"); } return r; }; }
document.addEventListener("click", e => {
  if (!e.isTrusted) return;
  const m = HR18.modal; if (!m || UI.modal !== m) return;
  const el = e.target.closest && e.target.closest("[data-a]"); if (!el || !el.closest(".overlay")) return;
  const a = el.dataset.a, cancel = (a === "modal-close" || !!el.dataset.discard) || (a === "close-overlay" && e.target === el);
  const yes = !cancel && a !== "close-overlay" && (a === "confirm-yes" || el.matches(".btn.primary, .btn.danger"));
  if (!cancel && !yes) return;
  ar18Answer(cancel ? "cancel" : Date.now() - HR18.modalAt < ar18ReadMs(HR18.modalWords) ? "fast" : "read");
}, true);
document.addEventListener("keydown", e => { if (e.isTrusted && e.key === "Escape" && HR18.modal && UI.modal === HR18.modal && !e.isComposing) ar18Answer("cancel"); }, true);

/* ===================== 1. health: reading the days ===================== */
async function hr18Load(){
  if (HR18.loading || !hr18On()) return; HR18.loading = true;
  const ws = WS.id, base = wsPath(), days = []; for (let i = 0; i < 28; i++) days.push(metDay(new Date(Date.now() - i * 86400000)));
  try{
    const [mine, met, log, audit] = await Promise.all([
      Promise.all(days.slice(0, 14).map(d => Store.list(base + "/health18-" + d).catch(() => []))),
      Promise.all(days.map(d => Store.list(base + "/metrics-" + d).catch(() => []))),
      Store.get(base + "/health18/log").catch(() => null),
      Store.get(Store.root() + "/audit18-summary").catch(() => null)]);
    if (!hr18On() || WS.id !== ws) return;
    HR18.recent = mine.flat().filter(x => x && x.id !== TAB_ID); HR18.met28 = met.flat().filter(x => x && x.id !== TAB_ID);
    HR18.log = hr18LogNorm(log); HR18.audit = audit && typeof audit === "object" ? audit : null;
  }catch(e){ if (WS.id === ws){ HR18.recent = []; HR18.met28 = []; HR18.log = hr18LogNorm(null); } }   // ok:catch the rows then say "not measured yet"
  finally{ HR18.loading = false; }
  if (UI.view === "settings" && UI.setTab === "health" && WS.id === ws) render();
}
/** once per open (after the first render): the day's values for the trends, and whether a row turned red */
async function hr18Daily(ws){
  if (!hr18On() || WS.id !== ws || !UI.wsReady) return;
  try{ if (MET.recent === null) await metLoad(); await hr18Load(); if (!hr18On() || WS.id !== ws || !HR18.log) return; hr18Track(hr18Rows()); }
  catch(e){ console.warn("health: the day's values", e); }   // ok:catch the next open tries again
}
function hr18LogNorm(x){ const L = x && typeof x === "object" ? x : {}; return {v: 1, days: L.days && typeof L.days === "object" ? L.days : {}, cur: L.cur && typeof L.cur === "object" ? L.cur : {}, reds: arr(L.reds)}; }
function hr18LogSave(){
  clearTimeout(HR18.logT); if (!hr18On()) return;
  const ws = WS.id, path = wsPath() + "/health18/log", L = HR18.log;
  HR18.logT = setTimeout(() => { if (hr18On() && WS.id === ws && HR18.log === L) Store.put(path, L); }, 1200);
}
/** the day's values and the row states into the log: a row turning red opens an entry, leaving red closes it with what came after */
function hr18Track(rows){
  const L = HR18.log; if (!L) return;
  const day = metDay(), snap = {}; let ch = false;
  for (const r of rows) Object.assign(snap, r.snap || {});
  if (JSON.stringify(L.days[day] || null) !== JSON.stringify(snap)){
    L.days[day] = snap; ch = true;
    const keys = Object.keys(L.days).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete L.days[k];
  }
  for (const r of rows){
    const was = str(L.cur[r.id]), st = r.status; if (st === was) continue;
    L.cur[r.id] = st; ch = true;
    if (st === "act") L.reds.push({row: r.id, from: now(), sig: r.signals.filter(s => s.bad).map(s => s.id)});
    else if (was === "act"){ const o = L.reds.slice().reverse().find(x => x.row === r.id && !x.to); if (o){ o.to = now(); o.after = st; } }
  }
  const per = {}; L.reds = L.reds.slice().reverse().filter(x => (per[x.row] = (per[x.row] || 0) + 1) <= 8).reverse();
  if (ch) hr18LogSave();
}

/* ===================== 1. health: the five rows ===================== */
function hr18Docs(){ return arr(HR18.recent).concat(HR18.doc && hr18On() && HR18.doc.ws === WS.id ? [HR18.doc] : []); }
function hr18ByDay(){
  const by = {};
  for (const d of hr18Docs()){
    if (!d || !d.day) continue;
    const x = by[d.day] = by[d.day] || {calls: 0, tasks: 0, fail: 0, tok: 0, cached: 0, units: 0, quick: 0, def: 0, complex: 0, fast: 0, read: 0, cancel: 0};
    const A = d.ai || {}, R = d.ar || {};
    for (const k of ["calls", "tasks", "fail", "tok", "cached", "units", "quick", "def", "complex"]) x[k] += num(A[k], 0);
    for (const k of ["fast", "read", "cancel"]) x[k] += num(R[k], 0);
  }
  return by;
}
/** a trend from the log's days (plus today's value), at most 14 points */
function hr18Series(key, today){
  const L = HR18.log, day = metDay(), out = [];
  if (L) for (const d of Object.keys(L.days).sort()) if (d !== day && L.days[d] && L.days[d][key] != null) out.push(num(L.days[d][key], 0));
  if (today != null) out.push(num(today, 0));
  return out.slice(-14);
}
function hr18Live(){ return arr(hr18On() ? WS.projects : []).filter(p => p && p.live && p.status !== "archived" && !p.example18); }
function hr18KitNow(){ try{ return typeof KIT_VERSION === "string" ? KIT_VERSION : ""; }catch(e){ return ""; } }   // ok:catch the kits part defines KIT_VERSION; without it "behind" is not measured
function hr18KitOf(p){
  const v = arr(p && p.tool && p.tool.versions), last = v[v.length - 1] || {}, M = mig18() || {};
  return str(p && p.tool && p.tool.kitVersion) || str(last.kitVersion) || str(last.kit) || str((M.kit || {})[p && p.id]) || (p && (p.live || v.length) ? "1.7.0" : "");
}
function hr18Failing(p){
  const wk = Date.now() - 7 * 86400000, u = arr(p.updates).slice(-1)[0];
  if (u && /fail|error/.test(str(u.state))) return true;
  return arr(WS.jobs).some(j => j && j.projectId === p.id && j.status === "failed" && Date.parse(j.createdAt) >= wk);
}
function hr18Timer(p){ if (arr(p.tool && p.tool.triggers).length || (kitRead(p) || {}).engine) return true; try{ return !!kit2Applies(p); }catch(e){ return false; } }   // ok:catch an unreadable design: not counted as a timer tool
function hr18ToolUrl(p){ const v = arr(p.tool && p.tool.versions), last = v[v.length - 1]; const a = arr(p.tool && p.tool.artifacts)[0]; return str(last && last.url) || str(a && (a.url || a)) || ""; }
function hr18Status(r){ if (!r.measured) return "none"; const bad = r.signals.filter(s => s.bad).length; return bad >= 2 ? "act" : bad === 1 ? "watch" : "ok"; }
const HR18_BUDGET = {price: 20, platform: 45, policy: 180, other: FACT_DAYS};
function hr18FactKind(id){ id = str(id); return id === "kits" ? "price" : id === "kp" || id === "research" || id.startsWith("plat:") ? "platform" : /legal|policy|law/.test(id) ? "policy" : "other"; }
/** the dated facts PT uses (factList of every project, once each), with their type, budget and age (O1: facts by type) */
function hr18Facts(){
  const seen = new Map(), add = x => { if (x && x.d){ const k = str(x.id) + "|" + str(x.d); if (!seen.has(k)) seen.set(k, x); } };
  const ps = arr(WS.projects).filter(p => p && p.status !== "archived" && !p.example18);
  for (const p of ps){ let L = []; try{ L = factList(p); }catch(e){ L = []; } L.forEach(add); }   // ok:catch a project whose facts cannot be read adds none
  if (!ps.length){ try{ factList(null).forEach(add); }catch(e){ console.warn("health: facts", e); } }   // ok:catch no facts then
  return [...seen.values()].map(x => { const kind = str(x.kind) || hr18FactKind(x.id), budget = num(x.budget, 0) || HR18_BUDGET[kind] || FACT_DAYS, age = factAge(x.d), past = age > budget;
    return {label: str(x.label), kind, budget, age, past, csb: past && !factStale(x.d, kind)}; });
}
function hr18Fleet(){
  const live = hr18Live(), kn = hr18KitNow(), ex = WS.settings.exp18 || {};
  const behind = kn ? live.filter(p => verCmp(hr18KitOf(p) || "1.7.0", kn) < 0) : [], failing = live.filter(hr18Failing), timers = live.filter(hr18Timer);
  const tools = live.map(p => { const st = failing.includes(p) ? "failing" : behind.includes(p) ? "behind" : "ok";
    return `<li>${esc(t("hr.f.tool", {name: p.name, k: hr18KitOf(p) || "—", st: t("hr.f.st." + st)}))} · <span class="muted">${esc(ex[p.id] ? t("hr.f.exp", {d: fmtDay(ex[p.id])}) : t("hr.f.exp.never"))}</span></li>`; }).join("");
  const snaps = timers.map(p => { const k = hr18KitOf(p) || "1.7.0"; return `<li>${esc(t(verCmp(k, "1.8.0") >= 0 ? "hr.f.snap.on" : "hr.f.snap.off", {name: p.name, k}))}</li>`; }).join("");
  return {id: "fleet", title: t("hr.f.title"), measured: live.length > 0, value: live.length ? t("hr.f.val", {n: live.length, b: kn ? behind.length : "—", f: failing.length}) : t("hr.f.none"),
    signals: [{id: "behind", bad: behind.length > 0, nm: !kn, text: kn ? t("hr.f.behind", {n: behind.length, k: kn}) : t("hr.f.behind.nm")}, {id: "failing", bad: failing.length > 0, text: t("hr.f.failing", {n: failing.length})}],
    threshold: t("hr.f.th"), consequence: t("hr.f.do"), snap: {live: live.length, behind: behind.length, failing: failing.length}, spark: {key: "live", today: live.length, what: t("hr.f.spk")},
    extra: `${tools ? `<ul class="hr18-list small">${tools}</ul>` : ""}<div class="small"><b>${esc(t("hr.f.snap"))}</b>${snaps ? `<ul class="hr18-list">${snaps}</ul>` : ` <span class="muted">${esc(t("hr.f.snap.none"))}</span>`}</div>`};
}
function hr18Honesty(){
  const F = hr18Facts(), past = F.filter(x => x.past), csb = F.filter(x => x.csb);
  let abst = 0;
  for (const p of arr(WS.projects).filter(p => p && p.status !== "archived" && !p.example18)){ const k = pickRead(p);
    for (const c of k.cards) if (arr(c.options).length >= 2 && !(c.rec >= 0)) abst++;
    for (const e of k.log){ const c = e.card || {}; if (arr(c.options).length >= 2 && !(c.rec >= 0)) abst++; } }
  const list = past.map(x => `<li>${esc(t("hr.h.fact", {x: x.label, k: t("hr.h.kind." + (["price", "platform", "policy"].includes(x.kind) ? x.kind : "other")), a: x.age, b: x.budget}))}</li>`).join("");
  return {id: "honesty", title: t("hr.h.title"), measured: F.length > 0, value: F.length ? t("hr.h.val", {p: past.length, c: csb.length, a: abst}) : t("hr.h.none"),
    signals: [{id: "past", bad: past.length > 0, text: t("hr.h.past", {n: past.length})}, {id: "csb", bad: csb.length > 0, text: t("hr.h.csb", {n: csb.length})}, {id: "abst", bad: false, nm: true, text: t("hr.h.abst", {n: abst})}],
    threshold: t("hr.h.th"), consequence: t("hr.h.do"), snap: {past: past.length, csb: csb.length}, spark: {key: "past", today: past.length, what: t("hr.h.spk")},
    extra: list ? `<ul class="hr18-list small">${list}</ul>` : ""};
}
function hr18Economy(){
  const by = hr18ByDay(), days = Object.keys(by).sort(), today = by[metDay()] || {units: 0};
  const sum = k => days.reduce((s, d) => s + by[d][k], 0), calls = sum("calls") - sum("fail"), tasks = sum("tasks");
  const tok = calls ? Math.round(sum("tok") / calls) : 0, steps = tasks ? Math.round(sum("calls") / tasks * 10) / 10 : 0, cached = calls ? Math.round(sum("cached") / calls * 100) : 0;
  const budgetDay = (num(WS.settings.weeklyBudget, 400) || 400) / 7;
  const last7 = []; for (let i = 0; i < 7; i++){ const d = metDay(new Date(Date.now() - i * 86400000)); if (by[d]) last7.push(by[d].units); }
  const over = last7.filter(u => u > budgetDay).length;
  // Wh per 1,000 output tokens by model level (rough, from public per-answer estimates of 0.24–0.3 Wh for ~500 tokens; larger models more)
  const whK = {quick: 0.2, def: 0.6, complex: 1.2}, nCalls = sum("quick") + sum("def") + sum("complex");
  const whPerTask = tasks && nCalls ? Math.round(sum("tok") / 1000 * ((sum("quick") * whK.quick + sum("def") * whK.def + sum("complex") * whK.complex) / nCalls) / tasks * 100) / 100 : 0;
  const plan = num(WS.settings.hr18 && WS.settings.hr18.planChf, 0), avgUnits = days.length ? sum("units") / days.length : 0;
  const chf = plan > 0 && calls ? Math.round(plan / 30 * (avgUnits / budgetDay) * 100) / 100 : null;
  const B = boot18(), first = days.findIndex(d => by[d].calls > 0);
  const series = []; if (first >= 0) for (let i = 13; i >= 0; i--){ const d = metDay(new Date(Date.now() - i * 86400000)); if (d >= days[first]) series.push(by[d] ? by[d].units : 0); }
  return {id: "economy", title: t("hr.e.title"), measured: calls > 0, estimate: calls > 0, value: calls ? t("hr.e.val", {u: Math.round(today.units), tok, s: steps, c: cached}) : t("hr.e.none"),
    signals: [{id: "over", bad: over >= 3, text: t("hr.e.over", {n: over})}, {id: "steps", bad: steps > 1.5, text: t("hr.e.steps", {s: steps})}],
    threshold: t("hr.e.th"), consequence: t("hr.e.do"), snap: {units: Math.round(today.units)}, spark: {vals: series, what: t("hr.e.spk")},
    extra: `<ul class="hr18-list small"><li>${esc(chf != null ? t("hr.e.chf", {x: chf.toFixed(2)}) : t("hr.e.chf.nm"))}</li>${calls ? `<li>${esc(t("hr.e.wh", {x: whPerTask}))}</li><li>${esc(t("hr.e.tiers", {q: sum("quick"), d: sum("def"), c: sum("complex")}))}</li>` : ""}${B.estimateOnly ? `<li>${esc(t("hr.e.boot", {n: B.builds}))}</li>` : ""}</ul>
      <label class="fld hr18-plan"><span>${esc(t("hr.e.plan"))}</span><input type="number" min="0" step="1" inputmode="numeric" data-a-change="hr18-plan" value="${plan > 0 ? esc(String(plan)) : ""}"></label><p class="small muted">${esc(t("hr.e.how"))}</p>`};
}
function hr18Security(){
  const ps = arr(WS.projects).filter(p => p && p.status !== "archived" && !p.example18);
  const open = ps.reduce((s, p) => s + arr(p.findings).filter(f => f && f.status === "open" && /secur|privacy|inject|redteam/i.test(str(f.lens))).length + arr(p.redteam && p.redteam.cases).filter(c => c && !c.defended && c.status === "open").length, 0);
  const due = hr18Live().filter(p => { try{ return rtDue(p); }catch(e){ return false; } }).length;   // ok:catch an unreadable drill record counts as not due
  const A = HR18.audit && HR18.audit.actions, known = !!(A && num(A.total, 0) > 0), unpinned = known ? Math.max(0, num(A.total, 0) - num(A.pinned, 0)) : 0;
  return {id: "security", title: t("hr.s.title"), measured: true, value: t("hr.s.val", {f: open, d: due, a: known ? num(A.pinned, 0) + "/" + num(A.total, 0) : "—"}),
    signals: [{id: "find", bad: open > 0, text: t("hr.s.find", {n: open})}, {id: "due", bad: due > 0, text: t("hr.s.due", {n: due})}, {id: "pin", bad: unpinned > 0, nm: !known, text: known ? t("hr.s.pin", {a: num(A.pinned, 0), b: num(A.total, 0), d: fmtDay(HR18.audit.at)}) : t("hr.s.pin.nm")}],
    threshold: t("hr.s.th"), consequence: t("hr.s.do"), snap: {open, due}, spark: {key: "open", today: open, what: t("hr.s.spk")}};
}
function hr18Owner(){
  const s = metSummary(), daily = look18Daily(), today = daily[daily.length - 1] || {taps: 0, min: 0};
  const docs = arr(HR18.met28).concat(MET.doc && MET.doc.ws === WS.id ? [MET.doc] : []), M = mig18(), cut = M ? str(M.at).slice(0, 10) : "";
  // taps per new tool: only tools started since the counting began (an older tool's first taps were never counted)
  const d14 = metDay(new Date(Date.now() - 13 * 86400000)), first = docs.map(d => str(d && d.day)).filter(Boolean).sort()[0] || "", from = first > d14 ? first : d14;
  const fresh = arr(WS.projects).filter(p => p && !p.example18 && first && str(p.createdAt).slice(0, 10) >= from).map(p => p.id);
  const per = fresh.map(id => docs.reduce((n, d) => n + num(d && d.proj && d.proj[id] && d.proj[id].t, 0), 0));
  const nt = per.length, tpt = nt ? Math.round(per.reduce((a, b) => a + b, 0) / nt) : 0;
  const byDay = {}; for (const d of docs) if (d && d.day) byDay[d.day] = (byDay[d.day] || 0) + num(d.taps, 0);
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const before = Object.entries(byDay).filter(([d, n]) => cut && d < cut && n > 0).map(x => x[1]), after = Object.entries(byDay).filter(([d, n]) => cut && d > cut && n > 0).map(x => x[1]);
  const baseOK = before.length >= 3 && after.length >= 3;
  const by = hr18ByDay(); let fast = 0, read = 0, cancel = 0; for (const x of Object.values(by)){ fast += x.fast; read += x.read; cancel += x.cancel; }
  const n = fast + read + cancel, rate = n ? Math.round((read + cancel) / n * 100) : 0, arOK = n >= 10;
  const acts = {}; for (const d of arr(MET.recent).concat(MET.doc && MET.doc.ws === WS.id ? [MET.doc] : [])) for (const [k, v] of Object.entries((d && d.acts) || {})) acts[k] = (acts[k] || 0) + num(v, 0);
  const top = Object.entries(acts).filter(([k]) => k !== "nav").sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {id: "owner", title: t("hr.o.title"), measured: MET.recent !== null && (s.taps > 0 || s.min > 0), value: t("hr.o.val", {t: today.taps, m: today.min, p: nt ? tpt : "—", r: arOK ? rate + " %" : "—"}),
    signals: [{id: "tool", bad: nt > 0 && tpt > 8, nm: !nt, text: nt ? t("hr.o.tool", {t: tpt, n: nt}) : t("hr.o.tool.nm")},
      {id: "base", bad: baseOK && avg(after) > avg(before) * 1.1, nm: !baseOK, text: baseOK ? t("hr.o.base", {a: avg(after), b: avg(before)}) : t("hr.o.base.nm")},
      {id: "ar", bad: arOK && rate < 80, nm: !arOK, text: arOK ? t("hr.o.ar", {r: rate, n}) : t("hr.o.ar.nm", {n})}],
    threshold: t("hr.o.th"), consequence: t("hr.o.do"), snap: {taps: today.taps}, spark: {vals: daily.map(d => d.taps), what: t("look.spk.taps")},
    extra: `${top.length ? `<p class="small">${esc(t("hr.o.top", {x: ""}))}${top.map(([k, v]) => `<span class="mono">${esc(k)}</span> ${v}`).join(" · ")}</p>` : ""}<p class="small muted">${esc(t("hr.o.how"))}</p>`};
}
/** the five rows (each computed on its own: one that cannot be read shows "not measured yet", the others still show) */
function hr18Rows(){
  if (!hr18On()) return [];
  const out = [];
  for (const [id, f] of [["fleet", hr18Fleet], ["honesty", hr18Honesty], ["economy", hr18Economy], ["security", hr18Security], ["owner", hr18Owner]]){
    let r;
    try{ r = f(); }catch(e){ onAppError(e && e.message, "health:" + id); r = {id, title: t("hr." + id[0] + ".title"), measured: false, value: t("hr.st.none"), signals: [], threshold: "", consequence: "", snap: {}}; }
    r.status = hr18Status(r);
    if (r.spark && !r.spark.vals) r.spark.vals = hr18Series(r.spark.key, r.spark.today);
    out.push(r);
  }
  return out;
}
/** for the Sunday note (v180_run.js): one line per row that is not fine (watch or act); [] when all are fine or nothing is measured */
function health18Lines(){
  try{ return hr18Rows().filter(r => r.status === "watch" || r.status === "act").map(r => ({id: r.id, status: r.status, text: t("hr.line", {row: r.title, st: t("hr.st." + r.status), x: r.value})})); }
  catch(e){ onAppError(e && e.message, "health18Lines"); return []; }
}

/* ===================== 1. health: the screen ===================== */
function hr18Spark(sp){
  if (!sp || arr(sp.vals).length < 2) return `<p class="small muted hr18-spk">${esc(t("hr.trend.wait"))}</p>`;
  const svg = spark18(sp.vals, sp.what).replace(/aria-label="[^"]*"/, `aria-label="${esc(t("hr.spk.aria", {what: sp.what, list: sp.vals.join(", ")}))}"`);
  return `<figure class="hr18-spk"><figcaption class="small">${esc(sp.what)} · <b>${esc(String(sp.vals[sp.vals.length - 1]))}</b></figcaption>${svg}</figure>`;
}
function hr18RedsHTML(r){
  const L = HR18.log, reds = L ? L.reds.filter(x => x.row === r.id) : [];
  if (!reds.length) return `<p class="small muted">${esc(t("hr.reds.none"))}</p>`;
  const sig = x => arr(x.sig).map(id => t("hr.sig." + id)).join(", ");
  return `<details class="hr18-reds"><summary class="small">${esc(t("hr.reds", {n: reds.length}))}</summary><ul class="small hr18-list">${reds.slice().reverse().map(x => `<li>${esc(x.to ? t("hr.red.line", {a: fmtDay(x.from), b: fmtDay(x.to), x: sig(x), y: t("hr.st." + (x.after || "ok"))}) : t("hr.red.open", {a: fmtDay(x.from), x: sig(x)}))}</li>`).join("")}</ul></details>`;
}
function hr18RowHTML(r){
  const sig = r.signals.map(s => `<li>${s.bad ? "✗" : s.nm || !r.measured ? "○" : "✓"} ${esc(s.text)}</li>`).join("");   // nothing measured yet: no ✓ either
  return `<div class="hr18-row" data-hr18="${esc(r.id)}" data-st="${esc(r.status)}">
    <div class="hr18-head">${hr18Pill(r.status)}<h4>${esc(r.title)}</h4><span class="hr18-val small">${esc(r.value)}${r.estimate ? ` <span class="muted">(${esc(t("hr.est"))})</span>` : ""}</span></div>
    <div class="hr18-body">${hr18Spark(r.spark)}<dl class="hr18-kv small">${sig ? `<dt>${esc(t("hr.k.sig"))}</dt><dd><ul class="hr18-sig">${sig}</ul></dd>` : ""}${r.threshold ? `<dt>${esc(t("hr.k.th"))}</dt><dd>${esc(r.threshold)}</dd>` : ""}${r.consequence ? `<dt>${esc(t("hr.k.do"))}</dt><dd>${esc(r.consequence)}</dd>` : ""}</dl></div>
    ${r.extra || ""}${hr18RedsHTML(r)}</div>`;
}
function hr18HTML(){
  if (HR18.recent === null && !HR18.loading) hr18Load();
  const rows = hr18Rows(); if (HR18.log) hr18Track(rows);
  const B = boot18();
  return `<div class="stack lg hr18" data-hr18="1"><div class="stack" style="gap:4px"><h3>${esc(t("hr.title"))}</h3><p class="small muted">${esc(t("hr.sub"))}</p>${B.on ? `<p class="small">${esc(t("hr.boot", {d: B.day, n: B.builds, r: fmtDay(B.recalFrom)}))}</p>` : ""}</div>
    <div class="hr18-rows">${rows.map(hr18RowHTML).join("")}</div>${mig18PanelHTML()}${rc18PanelHTML()}</div>`;
}
{ const orig = ptHealthHTML; ptHealthHTML = function(){
    const h = orig.apply(this, arguments);
    let mine = ""; try{ mine = hr18HTML(); }catch(e){ onAppError(e && e.message, "health18"); }
    return mine + h.replace(/<h3>[^<]*<\/h3>/, `<h3>${esc(t("hr.more"))}</h3>`); }; }

/* ===================== 5. tool backups: "Export tool data" on each live tool's Run page ===================== */
function exp18Card(p){
  const last = (WS.settings.exp18 || {})[p.id];
  return `<section class="panel pg-exp18" data-anchor="exp18"><div class="row"><h3 style="flex:1 1 12em">${ic("dl")} ${esc(t("hr.exp.title"))}</h3><button class="btn sm" data-a="exp18-open" data-pid="${esc(p.id)}">${ic("dl")}${esc(t("hr.exp.btn"))}</button></div>
    <p class="small muted">${esc(last ? t("hr.exp.last", {d: fmtDate(last)}) : t("hr.exp.never"))}</p></section>`;
}
{ const orig = pgBody; pgBody = function(p, id){ const h = orig.apply(this, arguments); return id === "run" && p && p.live && !p.example18 ? h + exp18Card(p) : h; }; }
MODAL14.exp18 = (m, p0, hd) => {
  const p = WS.projects.find(x => x.id === m.pid); if (!p) return hd(t("hr.exp.title"));
  const k = hr18KitOf(p) || "1.7.0", url = hr18ToolUrl(p), old = verCmp(k, "1.8.0") < 0, head = hd(t("hr.exp.title"));
  return `${head}<p class="small muted"><b>${esc(p.name)}</b> · ${esc(t("hr.exp.kit", {k}))}</p><p>${esc(t("hr.exp.lead"))}</p>
    <ol class="small">${["s1", "s2", "s3"].map(s => `<li>${esc(t("hr.exp." + s))}</li>`).join("")}</ol>
    ${hr18Timer(p) ? `<p class="small">${esc(t("hr.exp.timer"))}</p>` : ""}${old ? `<p class="small warn-t">${esc(t("hr.exp.old", {k}))}</p>` : ""}
    <div class="row end">${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${ic("link")}${esc(t("hr.exp.open"))}</a>` : ""}<button class="btn primary" data-a="exp18-done" data-pid="${esc(p.id)}">${ic("check")}${esc(t("hr.exp.done"))}</button></div>`;
};

/* ===================== 6. handover: the yearly restore check ===================== */
function rc18State(){
  const s = (hr18On() && WS.settings.rc18) || {}, M = mig18();
  const base = [str(s.last), str(s.shown), M ? str(M.at) : ""].filter(Boolean).sort().pop() || "";
  const next = base ? hr18Plus(base, 365) : "";
  return {last: str(s.last), shown: str(s.shown), next, due: !!next && Date.now() >= Date.parse(next)};
}
/** for the Sunday note (v180_run.js): the one line once a year — null when not due. Pass {seen: true} when the note shows it:
    it then comes back only a year later (or a year after the check is done) */
function restoreCheck18Line({seen = false} = {}){
  const st = rc18State(); if (!st.due) return null;
  if (seen){ WS.settings.rc18 = Object.assign({}, WS.settings.rc18, {shown: now()}); saveWs(); }
  return {key: "rc18", text: t("hr.rc.line"), action: "rc18-open"};
}
function restoreCheck18Done(){ if (!hr18On()) return; WS.settings.rc18 = Object.assign({}, WS.settings.rc18, {last: now()}); saveWs(); }
function rc18PanelHTML(){
  const st = rc18State(); if (!mig18()) return "";
  return `<div class="stack rc18-panel"><h4>${esc(t("hr.rc.title"))}</h4><p class="small">${esc(st.last ? t("hr.rc.next", {a: fmtDay(st.last), b: fmtDay(st.next)}) : t("hr.rc.never", {b: fmtDay(st.next)}))}</p><div class="row"><button class="btn sm" data-a="rc18-open">${ic("info")}${esc(t("hr.rc.btn"))}</button></div></div>`;
}
MODAL14.rc18 = (m, p, hd) => `${hd(t("hr.rc.head"))}<p class="small">${esc(t("hr.rc.why"))}</p>
  <ol class="small rc18-steps"><li>${esc(t("hr.rc.s1"))} <button class="btn xs" data-a="export-ws">${ic("dl")}${esc(t("data.export"))}</button></li><li>${esc(t("hr.rc.s2"))}</li><li>${esc(t("hr.rc.s3"))}</li></ol>
  <div class="row"><button class="btn sm" data-a="rc18-pick">${ic("search")}${esc(t("hr.rc.file"))}</button><input type="file" id="rc18-in" accept="application/json,.json" data-a-change="rc18-file" hidden></div>
  ${m.res ? `<p class="small ${m.res.ok ? "" : "warn-t"}" role="status">${m.res.ok ? "✓" : "✗"} ${esc(m.res.text)}</p>` : ""}
  <div class="row end"><button class="btn primary" data-a="rc18-done">${ic("check")}${esc(t("hr.rc.done"))}</button></div>`;
/** read a backup file and compare it with this workspace: nothing is written */
async function rc18File(el){
  const f = el.files && el.files[0]; if (!f) return;
  let res;
  try{
    const d = JSON.parse(await f.text()); if (!d || d.app !== "prompt-translator") throw new Error("format");
    const P = arr(d.projects), dec = P.reduce((s, p) => s + arr(p && p.decisions).length, 0), nn = arr(d.notes).length;
    const P2 = WS.projects.length, dec2 = WS.projects.reduce((s, p) => s + arr(p.decisions).length, 0), nn2 = WS.notes.length;
    const same = P.length === P2 && dec === dec2 && nn === nn2;
    res = {ok: same, text: same ? t("hr.rc.ok", {p: P.length, d: dec, n: nn}) : t("hr.rc.diff", {p: P.length, d: dec, n: nn, p2: P2, d2: dec2, n2: nn2})};
  }catch(e){ res = {ok: false, text: t("hr.rc.bad")}; }   // ok:catch said on screen
  el.value = "";
  if (UI.modal && UI.modal.kind === "rc18"){ UI.modal.res = res; render(); }
  return res;
}

/* ===================== PT checks itself (test/self18.py): a status the self check found without a name ===================== */
/** the rail's project dots show ready / not ready by shape (✓ or an empty ring); a screen reader now hears it too */
function hr18NameDots(){
  for (const d of document.querySelectorAll(".nav-proj .dot:not([aria-label])")){ d.setAttribute("role", "img"); d.setAttribute("aria-label", t(d.classList.contains("ok") ? "hr.dot.ok" : "hr.dot.mut")); }
}
{ const orig = afterRender; afterRender = function(){ const r = orig.apply(this, arguments); try{ hr18NameDots(); }catch(e){ onAppError(e && e.message, "hr18:dots"); } return r; }; }

/* ===================== actions ===================== */
Object.assign(ACTIONS, {
  "mig18-undo": () => { if (!mig18CanUndo()) return; document.querySelectorAll(".mig18-toast").forEach(x => x.remove()); UI.modal = {kind: "mig18undo"}; render(); },
  "mig18-undo-go": () => mig18UndoGo(),
  "mig18-cone": el => { const p = WS.projects.find(x => x.id === el.dataset.pid); if (!p || !cone18Ready()) return; const ok = cone18Rerun(p, {why: "migrate"}); if (ok !== false) mig18ConeMark(p.id, "done"); render(); },
  "mig18-cone-skip": el => { mig18ConeMark(str(el.dataset.pid), "skip"); render(); },
  "so18-done": () => so18Close(true),
  "so18-example": () => { so18Close(false); so18Example(); },
  "so18-cone": () => { const p = so18ConeTarget(); so18Close(false); if (!p || !cone18Ready()) return; const ok = cone18Rerun(p, {why: "dayone"}); WS.settings.so18 = Object.assign({}, so18(), {cone: {at: now(), pid: p.id, opened: ok !== false}}); if (ok !== false) mig18ConeMark(p.id, "done"); saveWs(); render(); },
  "exp18-open": el => { UI.modal = {kind: "exp18", pid: str(el.dataset.pid)}; render(); },
  "exp18-done": el => { WS.settings.exp18 = Object.assign({}, WS.settings.exp18, {[str(el.dataset.pid)]: now()}); saveWs(); UI.modal = null; render(); toast(t("hr.exp.noted"), "ok"); },
  "rc18-open": () => { UI.modal = {kind: "rc18"}; render(); },
  "rc18-pick": () => { const i = document.getElementById("rc18-in"); if (i) i.click(); },
  "rc18-done": () => { restoreCheck18Done(); UI.modal = null; render(); toast(t("hr.rc.saved"), "ok"); }
});
/* they change workspace settings or open a dialog, not a project (the Example tool records its own action) */
for (const a of ["mig18-undo", "mig18-undo-go", "mig18-cone", "mig18-cone-skip", "so18-done", "so18-example", "so18-cone", "exp18-open", "exp18-done", "rc18-open", "rc18-pick", "rc18-done"]) ACT_NO.add(a);
Object.assign(CHANGES, {
  "so18-note-time": el => { if (note18Set(str(el.value), "settings")) toast(t("so.note.saved", {x: el.value}), "ok"); },
  "hr18-plan": el => { WS.settings.hr18 = Object.assign({}, WS.settings.hr18, {planChf: Math.max(0, num(el.value, 0))}); saveWs(); render(); },
  "rc18-file": el => rc18File(el)
});

/* ===================== the look of the rows (tokens of the 1.8 look; no new colours) ===================== */
const HR18_CSS = `
.hr18-rows{display:flex;flex-direction:column;gap:10px}
.hr18-row{border:1px solid var(--line);border-radius:16px;background:var(--surface-2);padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.hr18-row[data-st="watch"]{border-color:var(--warn)}
.hr18-row[data-st="act"]{border-color:var(--crit);border-width:2px}
.hr18-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.hr18-head h4{margin:0;font-size:15px}
.hr18-val{flex:1 1 16em;min-width:0;font-variant-numeric:tabular-nums;overflow-wrap:break-word}
.hr18-body{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:flex-start}
.hr18-spk{margin:0;flex:0 1 auto;display:flex;flex-direction:column;gap:2px;min-width:0;max-width:100%}
.hr18-spk figcaption{color:var(--fg-2);font-variant-numeric:tabular-nums}
.hr18-spk svg{display:block;width:160px;max-width:100%;height:36px;overflow:visible}
.hr18-spk .sl{fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
.hr18-spk .sa{fill:var(--accent-soft);stroke:none}
.hr18-spk .sd{fill:var(--accent)}
.hr18-kv{flex:1 1 20em;min-width:0;margin:0;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 12px}
.hr18-kv dt{font-weight:600;color:var(--fg)}
.hr18-kv dd{margin:0;color:var(--fg-2);overflow-wrap:break-word;min-width:0}
.hr18-sig,.hr18-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.hr18-list li{overflow-wrap:break-word;min-width:0}
.hr18-plan{max-width:18em}
.mig18-panel,.rc18-panel{border-top:1px solid var(--line);padding-top:10px}
.mig18-panel h4,.rc18-panel h4{margin:0}
.so18-list{margin:4px 0 8px;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.so18-ex{border:1px solid var(--line);border-radius:16px;background:var(--surface-2);padding:10px 12px;display:flex;flex-direction:column;gap:6px;margin:8px 0}
.so18-sketch{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:8px 10px}
.so18-sk-t{display:flex;flex-direction:column;gap:2px;flex:1 1 14em;min-width:0}
.so18-note{margin:8px 0}
.so18-note select{max-width:12em}
@media (max-width:599px){
  .hr18-kv{grid-template-columns:minmax(0,1fr)}
  .hr18-kv dd{margin-bottom:4px}
  .hr18-row{padding:10px 12px}
}`;
function hr18Css(){ if (typeof document === "undefined" || document.getElementById("hr18-css")) return; const s = document.createElement("style"); s.id = "hr18-css"; s.textContent = HR18_CSS; (document.head || document.body).appendChild(s); }
hr18Css();

/* ===================== 1.8 integration: the Sunday note reads Health, the yearly restore check and the compile-to-code proposals ===================== */
{ const orig = wk18Build; wk18Build = async function(){
    const doc = await orig.apply(this, arguments);
    if (doc){ try{
      doc.health = health18Lines().slice(0, 6);
      const rc = restoreCheck18Line({seen: true}); doc.rc = rc ? rc.text : "";
      doc.compile = (typeof kitCompileProposals === "function" ? kitCompileProposals(WS.projects) : []).slice(0, 8).map(x => str(x.text));
      if (doc.health.length || doc.rc || doc.compile.length){ await Store.putNow(wk18Path(doc.key), doc); RUN18.notes.set(doc.key, doc); }
    }catch(e){ onAppError(e && e.message, "wk18:health"); } }
    return doc; }; }
{ const orig = wk18Entries; wk18Entries = function(n){
    const E = orig(n);
    for (const h of arr(n.health)) E.push({sec: "health", secs: wk18Secs(h.text, true), html: `<div class="item wk18-h">${stSlot(h.status === "act" ? "bad" : "attn")}<div class="body"><span class="small">${esc(h.text)}</span></div></div>`});
    if (n.rc) E.push({sec: "health", secs: wk18Secs(n.rc, true), html: `<div class="item wk18-rc">${stSlot("attn")}<div class="body"><span class="small">${esc(n.rc)}</span></div><button class="btn xs" data-a="rc18-open">${esc(t("wk.rc.open"))}</button></div>`});
    for (const c of arr(n.compile)) E.push({sec: "tools", secs: wk18Secs(c, false), html: `<div class="item wk18-cp">${stSlot("todo")}<div class="body"><span class="small">${esc(c)}</span></div></div>`});
    return E; }; }
