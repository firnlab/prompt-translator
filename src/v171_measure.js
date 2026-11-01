/* ===================== 1.7.1: owner-time baseline (PLAN-1.8 step 4, DESIGN-1.8-rev2 §0.12) =====================
   Counts how much of your time PT takes, so 1.8 can be held to "no more than 1.7". Nothing changes in what PT does.
   - a tap = a button or choice you press (a [data-a] action, a changed select or checkbox, a sent form); typing is not a tap
   - an active minute = a minute in which you tapped, typed or scrolled while PT was visible (reading without touching
     anything is not counted, so the number is a lower bound)
   Only numbers and PT's own action names are stored — never text you typed, never project content.
   Where: one small document per day and page load, <workspace>/metrics-<YYYY-MM-DD>/<tab id>, written by this page
   only (no two windows ever write the same document, so nothing is lost or double-counted). Stays in your login. */
const MET = {doc: null, path: "", day: "", lastMin: 0, dirty: false, recent: null, loading: false};
function metDay(d = new Date()){ const z = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
function metDoc(){
  if (typeof WS === "undefined" || !WS || !WS.id) return null;
  const day = metDay();
  if (!MET.doc || MET.day !== day || MET.doc.ws !== WS.id){
    if (MET.doc && MET.dirty) metFlush();
    MET.day = day; MET.path = wsPath() + "/metrics-" + day + "/" + TAB_ID; MET.doc = {v: 1, day, ws: WS.id, pt: PT_VERSION, taps: 0, min: 0, acts: {}, proj: {}, first: now(), last: now()};
  }
  return MET.doc;
}
function metProjId(){ try{ const p = UI.view === "project" ? curP() : null; return p ? p.id : ""; }catch(e){ return ""; } }   // ok:catch no project open = not per project
function metTap(name){
  const d = metDoc(); if (!d) return;
  d.taps++; const k = str(name).slice(0, 40) || "?"; d.acts[k] = (d.acts[k] || 0) + 1;
  const pid = metProjId(); if (pid){ const r = d.proj[pid] = d.proj[pid] || {t: 0, m: 0}; r.t++; }
  metActive(); MET.dirty = true;
}
function metActive(){
  if (document.visibilityState === "hidden") return;
  const d = metDoc(); if (!d) return;
  const m = Math.floor(Date.now() / 60000); d.last = now();
  if (m === MET.lastMin) return;
  MET.lastMin = m; d.min++;
  const pid = metProjId(); if (pid){ const r = d.proj[pid] = d.proj[pid] || {t: 0, m: 0}; r.m++; }
  MET.dirty = true;
}
function metFlush(){
  if (!MET.dirty || !MET.doc) return;
  MET.dirty = false;
  try{ Store.put(MET.path, MET.doc); }catch(e){ MET.dirty = true; }   // ok:catch retried at the next flush
}
document.addEventListener("click", e => {
  if (!e.isTrusted) return;
  const el = e.target.closest && e.target.closest("[data-a]"); if (!el) return;
  if (el.tagName === "LABEL" || (el.tagName === "INPUT" && el.type === "checkbox")) return;   // counted once, as a change
  if (typeof ACTIONS === "undefined" || !ACTIONS[el.dataset.a]) return;
  metTap(el.dataset.a);
}, true);
document.addEventListener("change", e => {
  if (!e.isTrusted) return;
  const el = e.target; if (!el.matches || !el.matches("select, input[type=checkbox], input[type=radio]")) return;
  metTap(el.dataset.aChange || (el.dataset.bind ? "set:" + str(el.dataset.bind).split(".").pop() : el.type));
}, true);
document.addEventListener("submit", e => {
  if (!e.isTrusted) return;
  const f = e.target.closest && e.target.closest("[data-form]"); if (f) metTap("form:" + f.dataset.form);
}, true);
for (const ev of ["keydown", "wheel", "touchstart", "pointerdown"]) document.addEventListener(ev, e => { if (e.isTrusted) metActive(); }, {capture: true, passive: true});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") metFlush(); });
window.addEventListener("pagehide", () => metFlush());
setInterval(metFlush, 60000);

/* the last 14 days for the Health tab (read once when the tab is opened; this window's own day is added live) */
async function metLoad(){
  if (MET.loading) return; MET.loading = true;
  const days = []; for (let i = 0; i < 14; i++) days.push(metDay(new Date(Date.now() - i * 86400000)));
  try{
    const lists = await Promise.all(days.map(d => Store.list(wsPath() + "/metrics-" + d).catch(() => [])));
    MET.recent = lists.flat().filter(x => x && x.id !== TAB_ID);
  }catch(e){ MET.recent = []; }   // ok:catch the row then says "not measured yet"
  MET.loading = false;
  if (UI.setTab === "health") render();
}
function metSummary(){
  const docs = arr(MET.recent).concat(MET.doc && MET.doc.ws === WS.id ? [MET.doc] : []);
  const days = new Set(docs.filter(d => d.taps || d.min).map(d => d.day));
  const taps = docs.reduce((s, d) => s + num(d.taps, 0), 0), min = docs.reduce((s, d) => s + num(d.min, 0), 0);
  const since = Date.now() - 14 * 86400000;
  const fresh = WS.projects.filter(p => Date.parse(p.createdAt) >= since).map(p => p.id);
  const per = fresh.map(id => docs.reduce((s, d) => { const r = d.proj && d.proj[id]; return r ? {t: s.t + num(r.t, 0), m: s.m + num(r.m, 0)} : s; }, {t: 0, m: 0}));
  const avg = k => per.length ? Math.round(per.reduce((s, r) => s + r[k], 0) / per.length) : 0;
  const first = docs.map(d => str(d.day)).filter(Boolean).sort()[0] || "";
  return {taps, min, days: days.size, newTools: per.length, tapsPerTool: avg("t"), minPerTool: avg("m"), first};
}
function metRowHTML(){
  if (MET.recent === null){ metLoad(); return `<div class="stack" style="gap:4px"><b class="small">${esc(t("hp.time"))}</b><p class="small muted">${esc(t("hp.time.loading"))}</p></div>`; }
  const s = metSummary();
  const line = s.taps || s.min ? t("hp.time.line", {taps: s.taps, min: s.min, days: s.days}) : t("hp.time.none");
  const tools = s.newTools ? t("hp.time.tools", {n: s.newTools, t: s.tapsPerTool, m: s.minPerTool}) : "";
  return `<div class="stack" style="gap:4px"><b class="small">${esc(t("hp.time"))}</b><p class="small muted">${esc(line)}${tools ? " " + esc(tools) : ""}</p><p class="small muted">${esc(t("hp.time.how", {d: s.first || metDay()}))}</p></div>`;
}
{ const orig = ptHealthHTML; ptHealthHTML = function(){ const h = orig(); return h.replace(/<\/div>$/, metRowHTML() + "</div>"); }; }
