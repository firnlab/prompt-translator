/* ===================== 1.4 ONE PROJECT TRUTH =====================
   1. Every change is an action with its own Undo (not "the last whole-project snapshot").
   2. Item ids are never reused.
   3. One link graph: what depends on what (used by "update affected", the impact count and the map).
   4. One status model and one count source for every screen.
   5. A safety net for unexpected errors. */

/* ---------- 1. actions and Undo ----------
   An action records, item by item, what it changed (before → after). Undo puts back exactly those items,
   only where nobody changed them again since; later changes elsewhere are kept. The last actions are saved
   with the project, so Undo also works after a reload. */
const ACT = {open: new Map(), base: new Map(), n: 0, grpNow: null};
/** run several AI steps as one Undo: every action opened inside fn shares one group, and Undo takes them all back together */
async function actGroup(fn){ const prev = ACT.grpNow; ACT.grpNow = ACT.grpNow || uid("g"); try{ return await fn(); } finally { ACT.grpNow = prev; } }
/* 1.4 dialogs register themselves here (modalBody looks them up) */
const MODAL14 = {};
/* fields that are records, logs or screen state: never part of an Undo */
const DIFF_SKIP = new Set(["seenAt","m14","checkpoint","restore","releases","live","updates","tool","brief","report","activity","updatedAt","_rev","acts","versions","versionNo","guide","tr","_images","_migratedNow","newRefs","usageMonth","focus","cards","mode","phase","step","autoRes","lastRecap","probSnap","schema","createdAt","id","kp","seq","lastWhere","m141"]);
/* one level deeper for these objects; lists of records are compared record by record */
const DIFF_NESTED = new Set(["pkg","arch","goal","engine","problem","loop"]);
function listKey(path){ return path === "flags" ? "ref" : "id"; }
function isRecList(v, key){ return Array.isArray(v) && v.length > 0 && v.every(x => x && typeof x === "object" && x[key] != null); }
function diffField(path, a, b, out){
  const key = listKey(path);
  if ((isRecList(a, key) || !arr(a).length) && (isRecList(b, key) || !arr(b).length) && (Array.isArray(a) || Array.isArray(b)) && (arr(a).length || arr(b).length)){
    const A = new Map(arr(a).map((x, i) => [String(x[key]), {i, j: JSON.stringify(x), x}])), B = new Map(arr(b).map((x, i) => [String(x[key]), {i, j: JSON.stringify(x), x}]));
    for (const [id, y] of B){ const x = A.get(id); if (!x) out.push({path, id, pos: y.i, before: null, after: y.x}); else if (x.j !== y.j) out.push({path, id, pos: y.i, before: x.x, after: y.x}); }
    for (const [id, x] of A) if (!B.has(id)) out.push({path, id, pos: x.i, before: x.x, after: null});
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({path, before: a === undefined ? null : a, after: b === undefined ? null : b, whole: true});
}
function projDiff(a, b){
  const out = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys){
    if (DIFF_SKIP.has(k)) continue;
    if ((DIFF_NESTED.has(k) || (k === "marks" && ![...Object.keys(a[k] || {}), ...Object.keys(b[k] || {})].some(s => s.includes(".")))) && a[k] && b[k] && typeof a[k] === "object" && typeof b[k] === "object"){
      const sk = new Set([...Object.keys(a[k]), ...Object.keys(b[k])]);
      for (const s of sk) diffField(k + "." + s, a[k][s], b[k][s], out);
      continue;
    }
    diffField(k, a ? a[k] : undefined, b ? b[k] : undefined, out);
  }
  return out;
}
function getAt(p, path){ return path.split(".").reduce((o, s) => o == null ? undefined : o[s], p); }
function setAt(p, path, v){ const segs = path.split("."); let o = p; for (let i = 0; i < segs.length - 1; i++){ if (o[segs[i]] == null || typeof o[segs[i]] !== "object") o[segs[i]] = {}; o = o[segs[i]]; } if (v === null || v === undefined) delete o[segs[segs.length - 1]]; else o[segs[segs.length - 1]] = v; }
/** the ref of the item a diff entry is about (for labels and marks) */
const PATH_KIND = {"requirements": "req", "assumptions": "assumption", "risks": "risk", "tests": "test", "qa": "qa", "findings": "finding", "pkg.sections": "section", "arch.components": "component", "goal.criteria": "crit", "goal.examples": "ex", "pendingQs": "pq"};
function entryRef(e){ const k = PATH_KIND[e.path]; if (k && e.id != null) return k + ":" + e.id; if (e.path === "northStar") return "ns"; if (/^arch\.(why|chosen|changeMind|costEstimate|recommended|chosenAssumed)$/.test(e.path)) return "arch:choice"; if (e.path === "outOfScope") return "oos:all"; if (e.path === "constitution") return "const:all"; return null; }
function actOpen(p, label, {by = "you", grp = null} = {}){
  if (!p || !p.id) return;
  grp = grp || ACT.grpNow || null;
  const cur = ACT.open.get(p.id);
  if (cur){ if (cur.label === label && Date.now() - cur.t < 30) return; actClose(p.id); }
  // a change made outside any action since the last one (rare) becomes its own step first, so it is never mixed into this one
  try{
    const s1 = JSON.stringify(p), b0 = ACT.base.get(p.id);
    if (b0 && b0 !== s1){ ACT.open.set(p.id, {id: "a" + Date.now().toString(36) + (++ACT.n), s0: b0, label: t("u14.loose"), by: "you", t: Date.now()}); actClose(p.id); }
    ACT.open.set(p.id, {id: "a" + Date.now().toString(36) + (++ACT.n), s0: s1, label: str(label), by, grp, t: Date.now()});
  }catch(e){}
}
/** the project was replaced from outside (load, save conflict): the next action starts from here */
function actRebase(p){ if (p && p.id){ ACT.open.delete(p.id); try{ ACT.base.set(p.id, JSON.stringify(p)); }catch(e){} } }
/** close the open action of a project: what changed becomes one Undo step */
function actClose(pid){
  const o = ACT.open.get(pid); if (!o) return null;
  ACT.open.delete(pid);
  const p = WS.projects.find(x => x.id === pid); if (!p) return null;
  let patch, s1;
  try{ s1 = JSON.stringify(p); patch = projDiff(JSON.parse(o.s0), JSON.parse(s1)); }catch(e){ return null; }
  ACT.base.set(pid, s1);
  if (!patch.length) return null;
  const a = {id: o.id, at: now(), label: o.label, by: o.by, ...(o.grp ? {grp: o.grp} : {}), patch, refs: [...new Set(patch.map(entryRef).filter(Boolean))].slice(0, 40)};
  // a very big change (a restore, the one-time repairs) is not kept as a patch, so it never pushes the rest of the Undo history out;
  // it is undone through its restore point while it is the last action
  if (JSON.stringify(patch).length > 150000){ a.patch = []; a.big = true; }
  p.acts = arr(p.acts); p.acts.push(a);
  // keep the last 25 actions, and no more than about 250 KB of them in the saved project
  while (p.acts.length > 25) p.acts.shift();
  let size = JSON.stringify(p.acts).length; while (size > 320000 && p.acts.length > 1){ p.acts.shift(); size = JSON.stringify(p.acts).length; }
  return a;
}
function actCloseSoon(pid){ setTimeout(() => { actClose(pid); }, 0); }
function lastAct(p){ actClose(p.id); return arr(p.acts).filter(a => !a.undone).slice(-1)[0] || null; }
/** take back one action: only the items it changed, and only where they are still as the action left them */
function undoAct(p, id){
  actClose(p.id);
  const a = arr(p.acts).find(x => x.id === id); if (!a){ toast(t("toast.nothingundo"), ""); return false; }
  // steps that belong together (a fix and its check) are undone together, latest first
  if (a.grp && !a._inGrp){ const g = arr(p.acts).filter(x => x.grp === a.grp && !x.undone).reverse(), ug = "u" + uid("g"); let ok = false; for (const x of g){ x._inGrp = ug; try{ ok = undoAct(p, x.id) || ok; } finally { delete x._inGrp; } } return ok; }
  if (a.undone){ toast(t("u14.already"), ""); return false; }
  if (a.big){
    const last = arr(p.acts).filter(x => !x.undone).slice(-1)[0];
    if (a.rp && last && last.id === a.id && arr(p.restore).some(r => r.id === a.rp)){ a.undone = now(); doRestore(p, a.rp); return true; }
    toast(t("u14.big"), "err"); return false;
  }
  actOpen(p, t("u14.undoof", {x: a.label}), {by: "you"});
  let done = 0, kept = 0;
  for (const e of a.patch.slice().reverse()){
    if (e.whole){
      const cur = getAt(p, e.path);
      if (JSON.stringify(cur === undefined ? null : cur) !== JSON.stringify(e.after)){ kept++; continue; }
      setAt(p, e.path, e.before == null ? null : clone(e.before)); done++;
      continue;
    }
    let list = getAt(p, e.path); if (!Array.isArray(list)){ list = []; setAt(p, e.path, list); }
    const key = listKey(e.path), i = list.findIndex(x => x && String(x[key]) === String(e.id));
    const curJ = i >= 0 ? JSON.stringify(list[i]) : "null";
    if (curJ !== JSON.stringify(e.after)){ kept++; continue; }
    if (e.before == null){ if (i >= 0) list.splice(i, 1); }
    else if (i >= 0) list[i] = clone(e.before);
    else list.splice(Math.min(e.pos, list.length), 0, clone(e.before));
    done++;
  }
  // marks this action left ("Fixed by PT", "Changed by PT") go back to what they were
  for (const [ref, m] of Object.entries(p.marks || {})) if (m && m.act === a.id){ if (m.prev) p.marks[ref] = {w: m.prev.w, at: m.prev.at, ...(m.prev.by && m.prev.by !== "you" ? {by: m.prev.by} : {})}; else delete p.marks[ref]; }
  a.undone = now();
  const u = actClose(p.id); if (u){ u.undoOf = a.id; if (typeof a._inGrp === "string") u.grp = a._inGrp; }   // undoing a group is one step too (so Undo again brings all of it back)
  logAct(p, t("act.undone", {x: a.label}), {kind: "edit"});
  touch(p); render();
  toast(kept ? t("u14.partly", {n: done, k: kept}) : t("toast.undone"), kept ? "" : "ok");
  if (typeof afterChange === "function") afterChange(p);
  return true;
}
/* every click, form and edit in a project is one action (empty ones are dropped) */
const ACT_NO = new Set(["undo","item-open","goto","phase","mode","tab","toggle-exp","panel","toggle-drawer","dock-toggle","palette","nav","open-project","modal-close","close-overlay","map-zoom","map-full","selpart","clearsel","lens14","q14-key","tray-close","tray-show","fold14","top","rc-show","rc-close","xp-more","xp-fold","card-open","fs-all","qa-fold","tr-toggle","ask-section","ask-section-close","item-box-close","item-edit","item-tool","restore-open","rp-preview","dc-open","flags-show","whatsnew","walk","rd-walk","bm-toggle","set-help","help-seg","goto-ref","pt-link","focus-item","cmap","lens14","map-detail","map-list","q-tab","q-more","home","stage","finish-open","finish-exit","nav-step","nav-back","nav-close","tray-show","tray-close","q-goto","mark-show","dec-batch","ex-open","q-editopt","qa-reanswer","qa-pick","fin-nav","q-walk","q-show","finish-resume","cost-go"]);
function actLabelOf(el){
  const txt = str(el.getAttribute && (el.getAttribute("aria-label") || el.textContent)).replace(/\s+/g, " ").trim();
  const ref = el.dataset && (el.dataset.ref || (el.dataset.id ? "" : ""));
  return trunc(txt || el.dataset.a, 60) + (ref ? " · " + ref : "");
}
document.addEventListener("click", e => {
  const el = e.target.closest && e.target.closest("[data-a]"); if (!el || ACT_NO.has(el.dataset.a)) return;
  const p = UI.view === "project" ? curP() : null; if (!p) return;
  actOpen(p, actLabelOf(el), {by: "you"}); actCloseSoon(p.id);
}, true);
document.addEventListener("submit", e => {
  const p = UI.view === "project" ? curP() : null; if (!p) return;
  const f = e.target.closest && e.target.closest("[data-form]"); if (!f) return;
  actOpen(p, t("u14.form", {x: f.dataset.form}), {by: "you"}); actCloseSoon(p.id);
}, true);
/* typing into a field of the project: one action from entering the field until leaving it */
document.addEventListener("focusin", e => {
  const el = e.target; if (!el.matches || !el.matches("[data-bind^='p:'],[data-lines],[data-lines-test],[data-reqids]")) return;
  const p = curP(); if (!p) return;
  const ref = typeof refFromPath === "function" && el.dataset.bind ? refFromPath(el.dataset.bind.slice(2)) : null;
  actOpen(p, t("u14.edit", {x: ref ? refLabel(p, ref) : fieldLabel(str(el.dataset.bind || el.id).split(".").pop())}), {by: "you"});
}, true);
document.addEventListener("focusout", e => {
  const el = e.target; if (!el.matches || !el.matches("[data-bind^='p:'],[data-lines],[data-lines-test],[data-reqids]")) return;
  const p = curP(); if (p) setTimeout(() => { const a = document.activeElement; if (!(a && a.matches && a.matches("[data-bind^='p:']"))) actClose(p.id); }, 0);
}, true);

/* ---------- 2. ids are never reused ---------- */
function idNum(id, prefix){ const m = String(id || "").match(new RegExp("^" + prefix + "(\\d+)$")); return m ? parseInt(m[1], 10) : 0; }
/** the next free id with this prefix ("R", "T", "C", "E"): one higher than any id this project ever used */
function nextId(p, prefix, list){
  p.seq = p.seq || {};
  const used = arr(list).reduce((m, x) => Math.max(m, idNum(x.id, prefix)), 0);
  const n = Math.max(used, num(p.seq[prefix], 0)) + 1;
  p.seq[prefix] = n;
  return prefix + n;
}
function nextReqId(p){ return nextId(p, "R", p.requirements); }

/* ---------- 3. the link graph: what depends on what ----------
   Edges point from the item that is used to the items built on it. "Update affected" and the impact count use
   only the DIRECT dependents of a change (one layer at a time), never "everything". */
function sigWords(s){ return new Set(str(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 4)); }
function textLinked(a, b, min = 3){ const A = sigWords(a), B = sigWords(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n >= Math.min(min, Math.max(1, Math.floor(Math.min(A.size, B.size) / 2))); }
function reqText(r){ return [r.title, r.given, r.when, r.then].join(" "); }
function compsOfReq(p, rid){ return arr(p.arch.components).filter(c => arr(c.reqIds).includes(rid)); }
/** direct dependents of one item, with the reason shown to the person */
let DEP_CACHE = null;
function depsOf(p, ref){
  if (RENDERING){ if (!DEP_CACHE || DEP_CACHE.p !== p) DEP_CACHE = {p, m: new Map()}; if (!DEP_CACHE.m.has(ref)) DEP_CACHE.m.set(ref, depsOf0(p, ref)); return DEP_CACHE.m.get(ref); }
  return depsOf0(p, ref);
}
function depsOf0(p, ref){
  const [kind, id] = ref.split(":"), out = new Map();
  const add = (r, why) => { if (r !== ref && !out.has(r)) out.set(r, why); };
  const crits = arr(p.goal && p.goal.criteria), reqs = arr(p.requirements);
  if (kind === "ns" || kind === "intake"){
    if (kind === "intake" && id === "raw" && p.intake.clean) add("intake:clean", t("lk.fromidea"));
    if (kind === "intake" && id === "clean") add("ns", t("lk.fromidea"));
    if (kind === "ns"){
      if (crits.length) crits.forEach(c => add("crit:" + c.id, t("lk.fromgoal")));
      else reqs.forEach(r => add("req:" + r.id, t("lk.fromgoal")));
    }
  }
  if (kind === "crit"){
    reqs.filter(r => arr(r.critIds).includes(id)).forEach(r => add("req:" + r.id, t("lk.fromcrit", {c: id})));
    arr(p.tests).filter(x => arr(x.critIds).includes(id)).forEach(x => add("test:" + x.id, t("lk.fromcrit", {c: id})));
  }
  if (kind === "ex") crits.filter(c => arr(c.exIds).includes(id)).forEach(c => add("crit:" + c.id, t("lk.fromex", {e: id})));
  if (kind === "qa"){
    const q = arr(p.qa).find(x => x.id === id);
    if (q){
      const linked = reqs.filter(r => arr(r.qaIds).includes(id) || (r.dim && r.dim === q.dim && textLinked(q.q + " " + q.answer, reqText(r), 2)));
      (linked.length ? linked : reqs.filter(r => textLinked(q.q + " " + q.answer, reqText(r)))).forEach(r => add("req:" + r.id, t("lk.fromanswer")));
      crits.filter(c => textLinked(q.q + " " + q.answer, c.when + " " + c.then)).forEach(c => add("crit:" + c.id, t("lk.fromanswer")));
    }
  }
  if (kind === "assumption"){
    const a = arr(p.assumptions).find(x => x.id === id);
    if (a) reqs.filter(r => arr(r.asIds).includes(id) || textLinked(a.text, reqText(r))).forEach(r => add("req:" + r.id, t("lk.fromassume")));
  }
  if (kind === "risk"){
    const k = arr(p.risks).find(x => x.id === id);
    if (k) reqs.filter(r => r.fromRisk === id || arr(r.riskIds).includes(id)).forEach(r => add("req:" + r.id, t("lk.fromrisk")));
  }
  if (kind === "req"){
    arr(p.tests).filter(x => arr(x.reqIds).includes(id)).forEach(x => add("test:" + x.id, t("lk.fromreq", {r: id})));
    arr(p.pkg.sections).filter(s => arr(s.reqIds).includes(id)).forEach(s => add("section:" + s.id, t("lk.fromreq", {r: id})));
    compsOfReq(p, id).forEach(c => add("component:" + c.id, t("lk.fromreq", {r: id})));
    if (!arr(p.pkg.sections).some(s => arr(s.reqIds).includes(id)) && arr(p.pkg.sections).length){ const s = arr(p.pkg.sections).find(x => x.dest === "instructions") || p.pkg.sections[0]; add("section:" + s.id, t("lk.fromreq", {r: id})); }
  }
  if (kind === "arch") arr(p.arch.components).forEach(c => add("component:" + c.id, t("lk.fromarch")));
  if (kind === "component"){
    const c = arr(p.arch.components).find(x => x.id === id);
    const rids = arr(c && c.reqIds);
    const secs = arr(p.pkg.sections).filter(s => arr(s.reqIds).some(r => rids.includes(r)) || (c && (str(s.content).includes(c.name) || str(s.title).includes(c.name))));
    secs.forEach(s => add("section:" + s.id, t("lk.frompart", {x: c ? c.name : id})));
  }
  if (kind === "section"){
    const s = arr(p.pkg.sections).find(x => x.id === id);
    if (s) arr(p.tests).filter(x => arr(x.reqIds).some(r => arr(s.reqIds).includes(r))).forEach(x => add("test:" + x.id, t("lk.fromsec", {x: s.title})));
  }
  // only items that still exist
  return [...out.entries()].filter(([r]) => r === "ns" || r === "intake:clean" || itemExists(p, r)).map(([r, why]) => ({ref: r, why}));
}
function itemExists(p, ref){
  const [k, id] = ref.split(":");
  if (k === "crit") return arr(p.goal && p.goal.criteria).some(c => c.id === id);
  if (k === "ex") return arr(p.goal && p.goal.examples).some(c => c.id === id);
  return !!itemObj(p, ref);
}
/** what an item is built on (the other direction), for the item's thread */
function usesOf(p, ref){
  const [kind, id] = ref.split(":"), out = [];
  if (kind === "req"){ const r = arr(p.requirements).find(x => x.id === id); if (r){ arr(r.critIds).forEach(c => out.push("crit:" + c)); if (r.fromRisk) out.push("risk:" + r.fromRisk); arr(r.qaIds).forEach(q => out.push("qa:" + q)); } }
  if (kind === "test"){ const x = arr(p.tests).find(y => y.id === id); if (x){ arr(x.critIds).forEach(c => out.push("crit:" + c)); arr(x.reqIds).forEach(r => out.push("req:" + r)); } }
  if (kind === "section"){ const s = arr(p.pkg.sections).find(y => y.id === id); if (s) arr(s.reqIds).forEach(r => out.push("req:" + r)); }
  if (kind === "component"){ const c = arr(p.arch.components).find(y => y.id === id); if (c) arr(c.reqIds).forEach(r => out.push("req:" + r)); }
  if (kind === "crit"){ const c = arr(p.goal && p.goal.criteria).find(y => y.id === id); if (c){ out.push("ns"); arr(c.exIds).forEach(e => out.push("ex:" + e)); } }
  return out.filter(r => r === "ns" || itemExists(p, r));
}

/* ---------- 4. one status model ----------
   Every item has one of five states, shown everywhere with the same name, shape and colour:
   ok = done · as = decided by PT, check it · warn = may need updating · bad = problem · todo = not done yet.
   stepInfo() is the one source for every count and every "done" on every screen. */
const ST_ORDER = ["bad","warn","as","todo","ok"];
let SI_CACHE = null;
function stepInfo(p, ph){
  if (RENDERING && SI_CACHE && SI_CACHE.p === p && SI_CACHE.m.has(ph)) return SI_CACHE.m.get(ph);
  const its = SPECIAL.includes(ph) ? [] : itemsOf(p, ph), c = countSt(its);
  const open = (c.bad || 0) + (c.warn || 0) + (c.as || 0) + (c.todo || 0);
  const pr = phaseProgress10(p)[ph] || 0;
  let state;
  if (ph === "operate") state = p.live ? (open ? "attn" : "done") : "todo";
  else if (ph === "launch") state = copyUnlocked(p) ? "done" : arr(p.pkg.sections).length ? "attn" : "todo";
  else if (ph === "release") state = arr(p.releases).length ? "done" : copyUnlocked(p) ? "attn" : "todo";
  else if (!its.length) state = pr >= STEP_THR[ph] ? "done" : pr > 0 ? "attn" : "todo";
  else if ((c.todo || 0) === its.length) state = "todo";
  else if (open) state = "attn";
  else state = pr >= STEP_THR[ph] ? "done" : "attn";   // nothing open, but the step's own work is not complete yet
  // one truth for "done" (1.0–1.4.2: a step showed ✓ while the queue still had a blocker there, e.g. "the goal has no criteria"): a blocker in the step means it is not done
  if (state === "done" && queueOf(p).some(x => x.ph === ph && x.cls === "block")) state = "attn";
  const v = {its, c, open, state, pr};
  if (RENDERING){ if (!SI_CACHE || SI_CACHE.p !== p) SI_CACHE = {p, m: new Map()}; SI_CACHE.m.set(ph, v); }
  return v;
}
function phaseState(p, ph){ if (ph === (p.focus && p.focus.ph)) return "cur"; return stepInfo(p, ph).state; }

/* ---------- 5. a safety net for unexpected errors ----------
   Nothing is lost: the data stays as it was, the error is shown in plain words with a way to report it. */
const ERRS = [];
function onAppError(msg, src){
  const m = trunc(str(msg), 300);
  if (/ResizeObserver|Script error\.?$|sandboxed|Failed to fetch dynamically/i.test(m)) return;
  ERRS.push({at: now(), msg: m, src: trunc(str(src), 200), v: PT_VERSION});
  if (ERRS.length > 30) ERRS.shift();
  try{ console.warn("PT error", m, src); }catch(e){}
  if (UI.lastErrAt && Date.now() - UI.lastErrAt < 4000) return;
  UI.lastErrAt = Date.now();
  try{ toast(t("err.unexpected", {x: trunc(m, 120)}), "err"); }catch(e){}
}
window.addEventListener("error", e => onAppError(e && (e.message || (e.error && e.error.message)), e && (e.filename + ":" + e.lineno)));
window.addEventListener("unhandledrejection", e => { const r = e && e.reason; onAppError(r && (r.message || r.code) || String(r), "promise"); });
