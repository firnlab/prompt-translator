/* ===================== APP STATE ===================== */
let META = {workspaces: [], last: null};
let WS = {id:null, name:"", settings:{}, profile:{entries:[]}, projects:[], notes:[], patterns:[], research:[], jobs:[], insights:null, profileSuggestions:[]};
const PT_VERSION = "1.3.0";
/* ---------- version next to the name: "newest" check (shared doc app/version: read by everyone, written by the owner's page) ---------- */
const APPV = {latest: PT_VERSION, newer: false, checked: false};
function verCmp(a, b){ const x = String(a || "0").split(".").map(n => parseInt(n, 10) || 0), y = String(b || "0").split(".").map(n => parseInt(n, 10) || 0); for (let i = 0; i < 3; i++){ if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }
function seeVersion(d){ const was = APPV.newer; APPV.checked = true; if (d && d.v && verCmp(d.v, PT_VERSION) > 0){ APPV.newer = true; APPV.latest = String(d.v); } else { APPV.newer = false; APPV.latest = PT_VERSION; } if (was !== APPV.newer && UI.booted) render(); }
async function checkVersion(){
  try{
    const d = await Store.get("app/version");
    if (Store.isOwner && (!d || verCmp(PT_VERSION, d.v) > 0)){ await Store.putNow("app/version", {v: PT_VERSION, at: now()}); seeVersion({v: PT_VERSION}); }
    else seeVersion(d);
  }catch(e){ APPV.checked = true; }
}
/** re-check when the tab comes back into view (the case that matters: an older tab left open) and every 10 minutes; no live listener needed */
let VER_WATCH = null;
function watchVersion(){
  if (VER_WATCH) return;
  VER_WATCH = setInterval(() => { if (document.visibilityState !== "hidden") checkVersion(); }, 10 * 60e3);
  try{ document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkVersion(); }); window.addEventListener("focus", () => checkVersion()); }catch(e){}
}
function verChip(){
  if (APPV.newer) return `<button class="ver-chip warn" data-a="ver-reload" title="${esc(t("ver.oldtip", {v: PT_VERSION, n: APPV.latest}))}"><span class="ver-old">${esc(PT_VERSION)} · </span>${esc(t("ver.newer", {v: APPV.latest}))}</button>`;
  return `<span class="ver-chip${APPV.checked ? " ok" : ""}" title="${esc(t(APPV.checked ? "ver.tip" : "ver.tipq", {v: PT_VERSION}))}">${esc(PT_VERSION)}${APPV.checked ? " ✓ " + esc(t("ver.newest")) : ""}</span>`;
}
const UI = {view:"cockpit", pid:null, phase:null, modal:null, palette:false, capture:false, drawer:false, unlocked:false, booted:false,
  notesFilter:"inbox", notesQuery:"", libTab:"patterns", setTab:"general", buildTab:"package", testTab:"cases", opTab:"inbox", logTab:"activity", revTab:"open", panelTab:"guide",
  open:new Set(), cardOpen:new Set(), itemBox:null, askSec:null, selPart:null, cmap:null, mapZoom:1, prevMode:null, pulse:false, fixAll:null, fixing:null, express:null,
  selFindings:new Set(), lensSel:new Set(LENSES.map(l => l.id)), triage:null, expanded:new Set(), qDraft:{}, qSel:{}, diff:null, confirm:null};
const UNDO = new Map();

const WS_DEFAULT_NAMES = ["My workspace","Mein Arbeitsbereich","\u6211\u7684\u5de5\u4f5c\u5340","我的工作区"];
function wsLabel(name){ return WS_DEFAULT_NAMES.includes(name) ? t("ws.default") : name; }
function wsPath(){ return Store.root() + "/ws-" + WS.id; }
function projPath(id){ return wsPath() + "/projects/" + id; }
function curP(){ return WS.projects.find(p => p.id === UI.pid) || null; }
function projName(id){ const p = WS.projects.find(x => x.id === id); return p ? p.name : ""; }

/** the next free test id ("T" + highest number + 1): ids never repeat after a test was removed */
function nextTestId(p, add = 1){ const n = arr(p.tests).reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/^T/, ""), 10) || 0), 0); return "T" + (n + add); }
function blankProject(name){
  return {id:uid("p"), name: name || t("proj.untitled"), createdAt:now(), updatedAt:now(), phase:"capture", status:"active", depth:"standard",
    northStar:{problem:"",goal:"",success:"",users:"",constraints:"",now:""}, nsDraft:null,
    intake:{raw:"",clean:"",contradictions:[],ambiguities:[],missing:[],confidence:""},
    understand:{whys:[],rootNeed:"",jtbd:"",jtbdParts:null,reframes:[],walkthrough:"",walkSteps:[],walkGaps:[],premortem:[],devil:[]},
    dims:{}, qa:[], pendingQs:[], interviewReady:false, interviewReadyReason:"", coverageNote:"", drift:"",
    assumptions:[], risks:[], requirements:[], outOfScope:[], constitution:[],
    arch:{options:[],recommended:"",why:"",changeMind:"",chosen:"",components:[],links:[],humanSteps:[],dataPlan:[],costEstimate:"",mockupHtml:"",mockupCaption:""},
    targetModel:"claude-opus-5-5", pkg:{sections:[],targetModel:"",rationale:[]}, versionNo:0, versions:[], showMirror:false,
    findings:[], reviewVerdicts:{}, reviewedVersion:0, tests:[], runs:[], judge:{agree:0,total:0}, candidate:null,
    trace:null, setup:{}, decisions:[], openQs:[], nextAction:"", foresight:[], fsDone:{}, feedback:[], health:[], alignment:null, kp:KP_VERSION,
    /* 1.0 */
    schema:2, kind:"new", mode:"", focus:{ph:"capture", id:null}, cards:{}, nsAssumed:false,
    flags:[], restore:[], activity:[], earlyChecks:{require:null, arch:null}, seal:{review:0, test:0},
    brief:null, report:null, pilot:null, releases:[], live:null, inbox:[], plan:null, updates:[], tool:{home:"", artifacts:[], triggers:[], passport:true},
    guide:[], judge2:{}, existing:null, step:{},
    /* 1.2 */
    engine: blankEngine(), audience:{customers:null, eu:null}, usageMonth:{},
    /* 1.3: content language (the project owns it), new items shown on top, translations for other readers, problem snapshot for re-check */
    lang: LANG, newRefs:{}, tr:{}, probSnap:null};
}
/** content language of a project made before 1.3: read it from what was written (Chinese characters, then German markers), else English */
function guessContentLang(p){
  const txt = [str(p.intake && p.intake.clean), str(p.intake && p.intake.raw), str(p.northStar && p.northStar.goal), arr(p.requirements).slice(0, 8).map(r => str(r.title) + " " + str(r.then)).join(" ")].join(" ").slice(0, 6000);
  const cjk = (txt.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk > 20 && cjk > txt.length * 0.15) return "zh";
  const de = (txt.match(/\b(und|der|die|das|nicht|ist|mit|für|werden|eine?n?|auf|ich|wir|soll)\b/gi) || []).length, en = (txt.match(/\b(the|and|is|with|for|not|that|should|will|a|of|to)\b/gi) || []).length;
  return de > en * 1.2 && de > 8 ? "de" : "en";
}
function normalizeProject(p){
  const b = blankProject(p.name);
  const legacy = !p.schema || p.schema < 2;
  if (!p.lang) p.lang = guessContentLang(p);
  { const seen = new Set(); for (const x of arr(p.tests)){ if (seen.has(x.id)) x.id = nextTestId(p); seen.add(x.id); } }   // 1.3: repair duplicate test ids
  for (const k in b){ if (p[k] === undefined) p[k] = b[k]; }
  for (const k of ["northStar","intake","understand","arch","pkg","tool","seal","earlyChecks"]) for (const kk in b[k]) if (p[k][kk] === undefined) p[k][kk] = b[k][kk];
  if (legacy) migrateV1(p);
  eng(p);   // 1.2 engine fields (filled step by step; nothing is invented for older projects)
  if (!p.focus || !PHASE_IDS.includes(p.focus.ph)) p.focus = {ph: PHASE_IDS.includes(p.phase) ? p.phase : "capture", id: null};
  if (!PHASE_IDS.includes(p.phase)) p.phase = "capture";
  return p;
}
/* v1 → 1.0: nothing is dropped; new fields are derived from what exists */
function migrateV1(p){
  p.schema = 2;
  for (const q of arr(p.qa)){ if (!q.st) q.st = /recnote|empfohlen|推荐|\u63a8\u85a6/.test(str(q.answer)) ? "assumed" : "ok"; if (!q.options) q.options = []; }
  for (const r of arr(p.requirements)) if (!r.st) r.st = "ok";
  for (const f of arr(p.findings)){
    if (f.status === "fixed") f.status = "waiting";
    if (f.status === "dismissed"){ f.status = "accepted"; f.reason = f.reason || t("acc.v1"); f.acceptedVersion = f.version || 0; f.legacy = true; }
    f.audit = arr(f.audit); f.reopened = f.reopened || 0;
  }
  if (p.reviewedVersion) p.seal.review = p.reviewedVersion;
  const lr = arr(p.runs).find(r => r.label !== "candidate"); if (lr && lr.versionNo === p.versionNo) p.seal.test = p.versionNo;
  if (p.launchVersion && !p.releases.length) p.releases.push({v:"1.0", draft: p.launchVersion, at: p.updatedAt || now(), notes: [t("rel.migrated")], verified: false, legacy: true});
  if (p.releases.length) p.live = {v: p.releases[0].v, since: p.releases[0].at};
  p.activity.push({at: now(), text: t("act.migrated"), step: "", important: true});
  p._migratedNow = true;
}

/* ---------- persistence ---------- */
const saveTimers = new Map();
function touch(p){
  if (!p) return;
  p.updatedAt = now();
  clearTimeout(saveTimers.get(p.id));
  saveTimers.set(p.id, setTimeout(() => saveProject(p), 600));
}
function saveProject(p){
  const data = clone(p);
  delete data._images; delete data._migratedNow;
  let size = JSON.stringify(data).length;
  // big projects are split across documents by the Store; only trim old test outputs when a project gets huge
  if (size > 900000){
    for (const r of arr(data.runs).slice(3)) for (const x of arr(r.results)) x.output = trunc(x.output, 600);
    if (!UI.bigWarned){ UI.bigWarned = true; toast(t("err.big"), "err"); }
  }
  Store.put(projPath(p.id), data);
}
const saveWs = debounce(() => {
  Store.put(wsPath(), {name: WS.name, settings: WS.settings, profile: WS.profile, insights: WS.insights, profileSuggestions: WS.profileSuggestions});
}, 500);
function saveMeta(){ Store.put(Store.root() + "/meta", META); }
function snapshot(p, label){
  if (!p) return;
  const st = UNDO.get(p.id) || []; st.push(JSON.stringify(p)); if (st.length > 30) st.shift(); UNDO.set(p.id, st);
  /* every AI change gets an automatic restore point first */
  addRestore(p, {kind: "auto", label: label || t("rp.beforeai")});
}
function logAct(p, text, {step = "", important = false, kind = ""} = {}){
  if (!p) return;
  p.activity = arr(p.activity); p.activity.push({at: now(), text: str(text), step: step || (p.focus && p.focus.ph) || "", important, kind});
  if (p.activity.length > 600) p.activity = p.activity.slice(-600);
}
/** records that must survive undo, restore and save conflicts: restore points, releases, the live version, updates, the tool's parts */
const KEEP_FIELDS = ["restore","releases","live","updates","tool","brief","report"];
function keepRecords(from, into){
  for (const k of KEEP_FIELDS) into[k] = clone(from[k]);
  return into;
}
function undo(){
  const p = curP(); if (!p) return;
  const st = UNDO.get(p.id) || []; if (!st.length){ toast(t("toast.nothingundo"), ""); return; }
  const prev = keepRecords(p, JSON.parse(st.pop()));
  const i = WS.projects.findIndex(x => x.id === p.id); WS.projects[i] = prev; touch(prev); render(); toast(t("toast.undone"), "ok");
}

/* ---------- notes ---------- */
function addNote({text, type="", projectId=null, anchor=null, inbox=true, pinned=false, image=""}){
  const n = {id:uid("n"), text:str(text), type, projectId, anchor, inbox, pinned, noAI:false, tags:[], createdAt:now(), updatedAt:now(), history:[], deletedAt:null, image};
  WS.notes.unshift(n); saveNote(n); return n;
}
const noteTimers = new Map();
function saveNote(n){ clearTimeout(noteTimers.get(n.id)); noteTimers.set(n.id, setTimeout(() => Store.put(wsPath() + "/notes/" + n.id, n), 400)); }
function editNote(n, text){
  if (n.text === text) return;
  const last = n.history[0];
  if (!last || Date.now() - new Date(last.at).getTime() > 60000) n.history.unshift({at: n.updatedAt, text: n.text});
  n.history = n.history.slice(0, 15); n.text = text; n.updatedAt = now(); saveNote(n);
}
function purgeTrash(){
  const cutoff = Date.now() - 30 * 864e5;
  for (const n of WS.notes.filter(n => n.deletedAt && new Date(n.deletedAt).getTime() < cutoff)){ Store.del(wsPath() + "/notes/" + n.id); }
  WS.notes = WS.notes.filter(n => !(n.deletedAt && new Date(n.deletedAt).getTime() < cutoff));
}

/* ---------- workspaces ---------- */
const WS_COLORS = ["#5aa2ff","#f2b84b","#3fcf8e","#c08bff","#ff7d6b","#4fd1c5"];
/** the language last used on this device (for the "Who's working?" screen); the person's own saved language wins once a workspace opens */
function lastLang(){ const l = Store.lsGet("lastLang"); return ["en","de","zh"].includes(l) ? l : ""; }
function defaultLang(){ const l = (navigator.language || "en").toLowerCase(); return l.startsWith("de") ? "de" : l.startsWith("zh") ? "zh" : "en"; }
async function createWorkspace(name, lang, extra = {}){
  const w = {id: uid("w"), name: name || t("ws.default"), color: WS_COLORS[META.workspaces.length % WS_COLORS.length], pinHash: null, createdAt: now()};
  META.workspaces.push(w); saveMeta();
  Store.put(Store.root() + "/ws-" + w.id, {name: w.name, settings: Object.assign({lang: lang || LANG, theme:"system", tier:"auto", model:"", effort:"", stepModel:{}, defaultMode:"steps", guided:false, layout:"pages", weeklyBudget:400, warnAt:70, fileOnFinish:true, migrated10:true, seenVersion:""}, extra), profile:{entries:[]}});
  return w;
}
/* 1.0: one workspace per person — Owner and Second owner — on the shared login */
async function migrateWorkspaces10(){
  if (META.v10) return;
  META.v10 = true;
  // the owner's v1 default workspace becomes "Owner"; Second owner has her own login (decision D9), so no "Second owner" workspace is created here
  if (Store.isOwner && META.workspaces.length === 1 && WS_DEFAULT_NAMES.includes(META.workspaces[0].name)){
    const w = META.workspaces[0]; w.name = "Owner";
    try{ const d = await Store.get(Store.root() + "/ws-" + w.id); if (d){ d.name = "Owner"; Store.put(Store.root() + "/ws-" + w.id, d); } }catch(e){}
  }
  saveMeta();
}
/** an empty "Second owner" workspace left in the owner's login from 1.0 (she now has her own login) */
async function emptySecond ownerWs(){
  if (!Store.isOwner) return null;
  const w = META.workspaces.find(x => /second/i.test(x.name)); if (!w || META.workspaces.length < 2) return null;
  try{
    const base = Store.root() + "/ws-" + w.id;
    const lists = await Promise.all(["projects","notes","patterns","research","jobs"].map(c => Store.rawList(base + "/" + c)));
    return lists.some(l => l.length) ? null : w;
  }catch(e){ return null; }
}
async function removeWorkspace(w){
  META.workspaces = META.workspaces.filter(x => x.id !== w.id);
  if (META.last === w.id) META.last = META.workspaces[0] && META.workspaces[0].id;
  saveMeta();
  await Store.del(Store.root() + "/ws-" + w.id);
}
/** defaults per language for a new workspace: Chinese → Journey + Guided (as agreed for Second owner), otherwise Blueprint + Pro */
function wsDefaults(lang){ return lang === "zh" ? {guided: true, defaultMode: "journey"} : {guided: false, defaultMode: "blueprint"}; }
/* a save found newer data written elsewhere (another window, or the other person on the shared login) */
function onSaveConflict(path, remote, mine){
  if (/\/meta$/.test(path)){
    const byId = new Map(arr(remote.workspaces).map(w => [w.id, w]));
    const PIN_G = {hash: ["pinHash", "pinRec"], fails: ["pinFails", "pinUntil"], reset: ["pinResetAt", "pinResetBy"]};
    for (const w of arr(mine.workspaces)){
      const r = byId.get(w.id) || {}, m2 = Object.assign({}, r, w), touched = (typeof PIN_TOUCHED !== "undefined" && PIN_TOUCHED.get(w.id)) || new Set();
      for (const [g, fields] of Object.entries(PIN_G)) if (!touched.has(g) && byId.has(w.id)) for (const f of fields) m2[f] = r[f] === undefined ? null : r[f];
      byId.set(w.id, m2);
    }
    const merged = Object.assign({}, remote, mine, {workspaces: [...byId.values()]});
    META = clone(merged); delete META._rev;
    return merged;
  }
  const m = path.match(/\/projects\/([^/]+)$/);
  if (m){
    const i = WS.projects.findIndex(p => p.id === m[1]);
    if (i >= 0){
      // keep this window's version as a restore point, then load the newer one; restore lists of both are kept
      const mineP = WS.projects[i];
      addRestore(mineP, {kind: "conflict", label: t("rp.conflict")});
      const R = normalizeProject(remote);
      const byId = new Map(arr(R.restore).map(r => [r.id, r]));
      for (const r of arr(mineP.restore)) if (!byId.has(r.id)) byId.set(r.id, r);
      R.restore = [...byId.values()].sort((a, b) => str(a.at).localeCompare(str(b.at)));
      WS.projects[i] = R; toast(t("save.conflict"), "err"); render();
      const out = clone(R); delete out._images; return out;
    }
  }
  return null;
}
async function openWorkspace(id){
  const w = META.workspaces.find(x => x.id === id); if (!w) return;
  WS = {id: w.id, name: w.name, settings:{}, profile:{entries:[]}, projects:[], notes:[], patterns:[], research:[], jobs:[], insights:null, profileSuggestions:[]};
  UI.view = "cockpit"; UI.pid = null; UI.loading = true; UI.wsReady = false; render();
  try{
    const d = await Store.get(wsPath()) || {};
    WS.settings = Object.assign({lang: "en", theme:"system", tier:"auto", model:"", effort:"", stepModel:{}, defaultMode:"steps", guided:false, layout:"pages", weeklyBudget:400, warnAt:70, fileOnFinish:true, seenVersion:""}, d.settings || {});
    if (WS.settings.tier === "complex" && !WS.settings.model && !WS.settings.migrated10){ WS.settings.tier = "auto"; }
    if (!WS.settings.migrated10){ WS.settings.migrated10 = true; saveWs(); }
    // a language clicked on the "Who's working?" screen belongs to the person picked next, until they change it
    if (UI.pendingLang){ if (WS.settings.lang !== UI.pendingLang){ WS.settings.lang = UI.pendingLang; saveWs(); } UI.pendingLang = null; }
    // 1.2: Owner's default view is Blueprint / Pro (confirmed 19 Oct 2026); projects where a mode was chosen keep it
    if (!WS.settings.migrated12){ if (WS.name === "Owner" && (!WS.settings.defaultMode || WS.settings.defaultMode === "steps")){ WS.settings.defaultMode = "blueprint"; WS.settings.guided = false; } WS.settings.migrated12 = true; saveWs(); }
    if (typeof dockRestore === "function") dockRestore();
    WS.profile = d.profile || {entries:[]}; WS.insights = d.insights || null; WS.profileSuggestions = d.profileSuggestions || [];
    const [ps, ns, pt, rs, js] = await Promise.all([Store.list(wsPath() + "/projects"), Store.list(wsPath() + "/notes"), Store.list(wsPath() + "/patterns"), Store.list(wsPath() + "/research"), Store.list(wsPath() + "/jobs").catch(() => [])]);
    WS.jobs = js.sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
    const rawV1 = new Map(ps.filter(x => !x.schema || x.schema < 2).map(x => [x.id, clone(x)]));
    WS.projects = ps.map(normalizeProject).sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
    for (const p of WS.projects.filter(x => x._migratedNow)){
      delete p._migratedNow;
      // steps that were already finished in v1 count as done (no copy per step); one restore point keeps the state before 1.0
      p.step = p.step || {};
      for (const ph of PHASE_IDS) if (!p.step[ph] && stepDone(p, ph)) p.step[ph] = {done: true, at: now(), migrated: true};
      addRestore(p, {kind: "migrate", label: t("rp.premigrate"), source: rawV1.get(p.id)});   // the stored v1 data exactly as it was
      saveProject(p);
    }
    WS.notes = ns.sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
    WS.patterns = pt; WS.research = rs;
    purgeTrash();
  }catch(e){
    // nothing was written; show the problem and let the person retry
    console.warn(e); UI.loading = false; UI.fatal = {kind: "ws", id}; render(); return;
  }
  UI.fatal = null;
  META.last = id; saveMeta();
  applySettings(); UI.loading = false; UI.wsReady = true; UI.unlocked = true;
  emptySecond ownerWs().then(w => { UI.secondEmpty = !META.keepSecond owner && w && w.id !== WS.id ? w : null; if (UI.secondEmpty) render(); });
  if (UI.pinCode){ UI.modal = UI.pinCode; UI.pinCode = null; UI.pendingPinCode = false; }
  else if (WS.settings.seenVersion !== PT_VERSION){ UI.modal = {kind:"whatsnew", wide:true, from: WS.settings.seenVersion || ""}; WS.settings.seenVersion = PT_VERSION; saveWs(); }
  render();
  if (typeof resumeJobs === "function") resumeJobs();
}
function applySettings(){
  LANG = WS.settings.lang || LANG;
  if (WS.id) Store.lsSet("lastLang", LANG);
  document.documentElement.lang = LANG === "zh" ? "zh-CN" : LANG === "de" ? "de-CH" : "en";
  const th = WS.settings.theme || "system";
  if (th === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th);
}
function applyLangAttr(){ document.documentElement.lang = LANG === "zh" ? "zh-CN" : LANG === "de" ? "de-CH" : "en"; }
function lockNow(){ UI.unlocked = false; UI.lockFor = null; UI.pinForgot = null; UI.modal = null; render(); }

/* ---------- projects ---------- */
function newProject(name, {raw = "", mode = "", kind = "new"} = {}){
  const p = blankProject(name); p.mode = mode || WS.settings.defaultMode || "steps"; p.kind = kind;
  if (raw) p.intake.raw = raw;
  WS.projects.unshift(p); logAct(p, t("act.created"), {step:"capture", important:true}); touch(p);
  UI.view = "project"; UI.pid = p.id; UI.phase = "capture"; UI.prevMode = null; UI.selPart = null; UI.cmap = null; UI.itemBox = null; p.focus = {ph:"capture", id:null}; render();
  setTimeout(() => { const el = document.getElementById("raw"); if (el && !raw) el.focus(); }, 30);
  return p;
}
function openProject(id, phase){
  const p = WS.projects.find(x => x.id === id); if (!p) return;
  if (typeof resetBase === "function") resetBase(p);
  UI.view = "project"; UI.pid = id; UI.phase = phase || (p.focus && p.focus.ph) || p.phase || "capture"; p.focus = {ph: UI.phase, id: phase ? null : (p.focus && p.focus.id) || null}; UI.briefing = true; UI.selPart = null; UI.prevMode = null; UI.cmap = null; UI.itemBox = null; render();
  const m = document.querySelector(".main"); if (m) m.scrollTop = 0;
}
/* moving between steps never loses anything; finishing a step saves a milestone restore point and offers its file */
function setPhase(ph, {id = null, keepScroll = false} = {}){
  const p = curP(); if (!p) return;
  const from = UI.phase;
  if (from !== ph && PHASE_IDS.includes(ph)){ if (p.newRefs && Object.keys(p.newRefs).length){ p.newRefs = {}; touch(p); } if (typeof resetBase === "function") resetBase(p); }
  UI.view = "project"; UI.modal = null; UI.phase = ph; UI.selPart = null; UI.ask = null;
  if (PHASE_IDS.includes(ph)){
    p.focus = {ph, id};
    if (PHASE_IDS.indexOf(ph) > PHASE_IDS.indexOf(p.phase)) p.phase = ph;
    if (from && from !== ph && PHASE_IDS.includes(from) && PHASE_IDS.indexOf(ph) > PHASE_IDS.indexOf(from)) finishStep(p, from);
    if (PHASE_IDS.indexOf(ph) > PHASE_IDS.indexOf(from || "capture")){ autoResearch(p, ph); autoEngine(p, ph); }
    touch(p);
  }
  render();
  if (!keepScroll){ const m = document.querySelector(".main"); if (m) m.scrollTop = 0; }
}
function logDecision(p, title, choice, reason){ p.decisions.push({id:uid("d"), at:now(), title, choice, reason: reason || ""}); }

/* ---------- binding helpers ---------- */
function resolvePath(root, path){
  const segs = path.split(".");
  let o = root;
  for (let i = 0; i < segs.length - 1; i++){
    const s = segs[i];
    if (s.startsWith("#")){ o = arr(o).find(x => x.id === s.slice(1)); } else { if (o[s] == null) o[s] = {}; o = o[s]; }
    if (o == null) return null;
  }
  return {obj: o, key: segs[segs.length - 1]};
}
function bindRoot(spec){
  const [scope, ...rest] = spec.split(":");
  if (scope === "p") return {root: curP(), path: rest.join(":"), after: () => touch(curP())};
  if (scope === "ws") return {root: WS, path: rest.join(":"), after: () => { saveWs(); }};
  if (scope === "note"){ const [id, ...pp] = rest; const n = WS.notes.find(x => x.id === id); return {root: n, path: pp.join(":"), after: () => {}, note: n}; }
  if (scope === "pat"){ const [id, ...pp] = rest; const x = WS.patterns.find(y => y.id === id); return {root: x, path: pp.join(":"), after: () => Store.put(wsPath() + "/patterns/" + x.id, x)}; }
  if (scope === "ui") return {root: UI, path: rest.join(":"), after: () => {}};
  return null;
}
function applyBind(el){
  const spec = el.getAttribute("data-bind"); const b = bindRoot(spec); if (!b || !b.root) return;
  let v = el.type === "checkbox" ? el.checked : el.value;
  if (el.type === "number" || el.dataset.num) v = num(v, 0);
  if (b.note && b.path === "text"){ editNote(b.note, v); return; }
  const r = resolvePath(b.root, b.path); if (!r) return;
  const changed = r.obj[r.key] !== v;
  r.obj[r.key] = v;
  if (changed && spec.startsWith("p:")) handEdited(b.root, b.path);
  b.after();
  if (b.note) { b.note.updatedAt = now(); saveNote(b.note); }
}
/** a hand edit counts like any other change: the seal breaks when checked text changes, and dependent items are marked */
function handEdited(p, path){
  if (!p) return;
  if (typeof markEditedPath === "function") markEditedPath(p, path);
  const m = path.match(/^(pkg\.sections|requirements|tests)\.#([^.]+)\.(.+)$/);
  if (m){
    const [, list, id, field] = m;
    if (list === "pkg.sections" && field === "content"){
      if (p.seal.review === p.versionNo || p.seal.test === p.versionNo){ p.seal = {review: 0, test: 0}; logAct(p, t("act.sealbroken"), {kind: "seal"}); }
      markDownstream(p, "section:" + id);
    } else if (list === "requirements" && ["title","given","when","then","priority"].includes(field)) markDownstream(p, "req:" + id);
    else if (list === "tests" && field === "heldOut"){ /* only how the test is used */ }
    return;
  }
  if (/^(northStar|nsDraft)\./.test(path)) markDownstream(p, "ns");
}

/* ---------- boot ---------- */
async function boot(){
  await Store.init();
  LANG = lastLang() || "en"; applySettings();
  render();
  Store.onConflict = onSaveConflict;
  // a failed read must never lead to a write: retry, then stop and offer Retry
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++){
    try{ META = await Store.get(Store.root() + "/meta") || {workspaces: [], last: null}; ok = true; }
    catch(e){ await new Promise(r => setTimeout(r, 600 * (i + 1))); }
  }
  if (!ok){ UI.fatal = {kind: "boot"}; UI.booted = true; render(); return; }
  META.workspaces = arr(META.workspaces);
  await loadKP();
  await checkVersion(); watchVersion();
  if (!META.workspaces.length && !Store.isOwner){ META.v10 = true; UI.firstRun = {name: "", lang: defaultLang()}; UI.booted = true; render(); return; }
  if (!META.workspaces.length){ const w = await createWorkspace("Owner", LANG, wsDefaults(LANG)); META.last = w.id; saveMeta(); }
  await migrateWorkspaces10();
  UI.booted = true;
  const needPick = META.workspaces.length > 1 || META.workspaces.some(w => w.pinHash);
  if (!needPick) await openWorkspace(META.workspaces[0].id);
  else render();
  getSample();
}
window.addEventListener("beforeunload", e => { if (Store.pending()) { e.preventDefault(); e.returnValue = ""; } });

/* 1.2 engine runs by itself where PT recommends it (every setting can be switched off per project):
   the frontier scan once the idea is understood, score and gate suggestions after the requirements, the mini-test once options exist */
function autoEngine(p, ph){
  const e = eng(p), at = PHASE_IDS.indexOf(ph);
  if (at >= PHASE_IDS.indexOf("interview") && e.scan.state === "none" && str(p.intake.raw).trim() && e.autoScan !== false) setTimeout(() => frontierJob(p), 300);
  if (at >= PHASE_IDS.indexOf("arch") && !e.suggestAt && arr(p.requirements).length) setTimeout(() => aiEngineSuggest(p), 600);
  if (ph === "arch" && trialOn(p) && !arr(e.trial.runs).length && arr(p.requirements).length) setTimeout(() => aiTrialRun(p), 900);
}
/* automatic online research at key steps (runs in the background, proposes, never applies) */
const AUTO_RES = {understand: "res.auto.understand", arch: "res.auto.arch", build: "res.auto.build"};
function autoResearch(p, ph){
  if (!AUTO_RES[ph] || WS.settings.autoResearch === false || Store.mode !== "cloud" || !Runner.ready()) return;
  p.autoRes = p.autoRes || {};
  if (p.autoRes[ph] || usagePct() >= (WS.settings.warnAt || 70)) return;
  const goal = p.northStar.goal || p.intake.clean || p.intake.raw; if (!str(goal).trim()) return;
  p.autoRes[ph] = now();
  const topic = t(AUTO_RES[ph], {g: trunc(goal, 300), m: modelLabel(p.targetModel)});
  setTimeout(() => researchJob(p, topic, ph).then(j => { if (j) toast(t("res.autostarted"), ""); }), 400);
}
