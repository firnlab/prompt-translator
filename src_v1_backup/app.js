/* ===================== APP STATE ===================== */
let META = {workspaces: [], last: null};
let WS = {id:null, name:"", settings:{}, profile:{entries:[]}, projects:[], notes:[], patterns:[], research:[], insights:null, profileSuggestions:[]};
const UI = {view:"cockpit", pid:null, phase:null, modal:null, palette:false, capture:false, drawer:false, unlocked:false, booted:false,
  notesFilter:"inbox", notesQuery:"", libTab:"patterns", setTab:"general", buildTab:"package", testTab:"cases", opTab:"inbox", logTab:"decisions",
  selFindings:new Set(), lensSel:new Set(LENSES.map(l => l.id)), triage:null, expanded:new Set(), qDraft:{}, qSel:{}, diff:null, confirm:null};
const UNDO = new Map();

const WS_DEFAULT_NAMES = ["My workspace","Mein Arbeitsbereich","我的工作區"];
function wsLabel(name){ return WS_DEFAULT_NAMES.includes(name) ? t("ws.default") : name; }
function wsPath(){ return Store.root() + "/ws-" + WS.id; }
function projPath(id){ return wsPath() + "/projects/" + id; }
function curP(){ return WS.projects.find(p => p.id === UI.pid) || null; }
function projName(id){ const p = WS.projects.find(x => x.id === id); return p ? p.name : ""; }

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
    trace:null, setup:{}, decisions:[], openQs:[], nextAction:"", foresight:[], fsDone:{}, feedback:[], health:[], alignment:null, kp:KP_VERSION};
}
function normalizeProject(p){
  const b = blankProject(p.name);
  for (const k in b){ if (p[k] === undefined) p[k] = b[k]; }
  for (const k of ["northStar","intake","understand","arch","pkg"]) for (const kk in b[k]) if (p[k][kk] === undefined) p[k][kk] = b[k][kk];
  return p;
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
  delete data._images;
  let size = JSON.stringify(data).length;
  if (size > 230000){
    for (const r of data.runs) for (const x of r.results) x.output = trunc(x.output, 600);
    data.runs = data.runs.slice(0, 3);
    size = JSON.stringify(data).length;
    if (size > 240000){ toast(t("err.big"), "err"); }
  }
  Store.put(projPath(p.id), data);
}
const saveWs = debounce(() => {
  Store.put(wsPath(), {name: WS.name, settings: WS.settings, profile: WS.profile, insights: WS.insights, profileSuggestions: WS.profileSuggestions});
}, 500);
function saveMeta(){ Store.put(Store.root() + "/meta", META); }
function snapshot(p){
  if (!p) return;
  const st = UNDO.get(p.id) || []; st.push(JSON.stringify(p)); if (st.length > 30) st.shift(); UNDO.set(p.id, st);
}
function undo(){
  const p = curP(); if (!p) return;
  const st = UNDO.get(p.id) || []; if (!st.length){ toast(t("toast.nothingundo"), ""); return; }
  const prev = JSON.parse(st.pop());
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
function defaultLang(){ const l = (navigator.language || "en").toLowerCase(); return l.startsWith("de") ? "de" : l.startsWith("zh") ? "zh" : "en"; }
async function createWorkspace(name, lang){
  const w = {id: uid("w"), name: name || t("ws.default"), color: WS_COLORS[META.workspaces.length % WS_COLORS.length], pinHash: null, createdAt: now()};
  META.workspaces.push(w); saveMeta();
  Store.put(Store.root() + "/ws-" + w.id, {name: w.name, settings: {lang: lang || LANG, theme:"system", tier:"complex", model:"", effort:"", stepModel:{}}, profile:{entries:[]}});
  return w;
}
async function openWorkspace(id){
  const w = META.workspaces.find(x => x.id === id); if (!w) return;
  WS = {id: w.id, name: w.name, settings:{}, profile:{entries:[]}, projects:[], notes:[], patterns:[], research:[], insights:null, profileSuggestions:[]};
  UI.view = "cockpit"; UI.pid = null; UI.loading = true; render();
  try{
    const d = await Store.get(wsPath()) || {};
    WS.settings = Object.assign({lang: LANG, theme:"system", tier:"complex", model:"", effort:"", stepModel:{}}, d.settings || {});
    WS.profile = d.profile || {entries:[]}; WS.insights = d.insights || null; WS.profileSuggestions = d.profileSuggestions || [];
    const [ps, ns, pt, rs] = await Promise.all([Store.list(wsPath() + "/projects"), Store.list(wsPath() + "/notes"), Store.list(wsPath() + "/patterns"), Store.list(wsPath() + "/research")]);
    WS.projects = ps.map(normalizeProject).sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
    WS.notes = ns.sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
    WS.patterns = pt; WS.research = rs;
    purgeTrash();
  }catch(e){ console.warn(e); toast(t("err.load"), "err"); }
  META.last = id; saveMeta();
  applySettings(); UI.loading = false; UI.unlocked = true; render();
}
function applySettings(){
  LANG = WS.settings.lang || LANG;
  document.documentElement.lang = LANG === "zh" ? "zh-Hant-TW" : LANG === "de" ? "de-CH" : "en";
  const th = WS.settings.theme || "system";
  if (th === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th);
}
function lockNow(){ UI.unlocked = false; UI.lockFor = null; UI.modal = null; render(); }

/* ---------- projects ---------- */
function newProject(name){
  const p = blankProject(name); WS.projects.unshift(p); touch(p);
  UI.view = "project"; UI.pid = p.id; UI.phase = "capture"; render();
  setTimeout(() => { const el = document.getElementById("raw"); if (el) el.focus(); }, 30);
}
function openProject(id, phase){
  const p = WS.projects.find(x => x.id === id); if (!p) return;
  UI.view = "project"; UI.pid = id; UI.phase = phase || p.phase || "capture"; UI.briefing = true; render();
  const m = document.querySelector(".main"); if (m) m.scrollTop = 0;
}
function setPhase(ph){ const p = curP(); if (!p) return; UI.view = "project"; UI.modal = null; UI.phase = ph; if (PHASES.some(x => x.id === ph)) { p.phase = ph; touch(p); } render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; }
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
  r.obj[r.key] = v; b.after();
  if (b.note) { b.note.updatedAt = now(); saveNote(b.note); }
}

/* ---------- boot ---------- */
async function boot(){
  LANG = defaultLang(); applySettings();
  render();
  await Store.init();
  try{ META = await Store.get(Store.root() + "/meta") || {workspaces: [], last: null}; }catch(e){ META = {workspaces:[], last:null}; }
  if (!META.workspaces.length){ const w = await createWorkspace(t("ws.default"), LANG); META.last = w.id; saveMeta(); }
  UI.booted = true;
  const needPick = META.workspaces.length > 1 || META.workspaces.some(w => w.pinHash);
  if (!needPick) await openWorkspace(META.workspaces[0].id);
  else render();
  getSample();
}
window.addEventListener("beforeunload", e => { if (Store.pending()) { e.preventDefault(); e.returnValue = ""; } });
