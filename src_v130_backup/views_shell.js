/* ===================== ICONS ===================== */
const IC = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  note:'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h6"/>',
  book:'<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3"/><path d="M20 4v14h-6"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  play:'<path d="M7 4l13 8-13 8z"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  pin:'<path d="M12 17v5M8 3h8l-1 6 3 3H6l3-3z"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  log:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 3 3 0 0 1-3-3"/>',
  inbox:'<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  cmd:'<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
  route:'<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
  lanes:'<path d="M3 5h18M3 12h18M3 19h18"/><rect x="6" y="7" width="5" height="3" rx="1"/><rect x="13" y="14" width="5" height="3" rx="1"/>',
  bolt:'<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  ask:'<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9.5a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M12 14.5v.1"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'
};
function ic(name){ return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ""}</svg>`; }

/* ===================== SMALL COMPONENTS ===================== */
const COST = {L:"cost.l", M:"cost.m", H:"cost.h"};
function aiBtn(action, label, cost="M", {primary=false, attrs="", key=""} = {}){
  const running = key && AI.running.has(key);
  return `<button class="btn ai ${primary ? "primary" : ""}" data-a="${action}" ${attrs} data-cost="${esc(t(COST[cost]))}" title="${esc(t("cost.tip." + cost))}" ${running || (!key && AI.running.size) ? "disabled" : ""}>${ic("spark")}${esc(label)}</button>`;
}
function btn(action, label, {icon="", cls="", attrs="", title=""} = {}){ return `<button class="btn ${cls}" data-a="${action}" ${attrs} ${title ? `title="${esc(title)}"` : ""}>${icon ? ic(icon) : ""}${esc(label)}</button>`; }
function ibtn(action, icon, title, attrs=""){ return `<button class="iconbtn" data-a="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${attrs}>${ic(icon)}</button>`; }
function chip(text, cls=""){ return `<span class="chip ${cls}">${esc(text)}</span>`; }
function confChip(c){ if (!c) return ""; return `<span class="chip ${c === "high" ? "ok" : c === "low" ? "warn" : "acc"} conf" title="${esc(t("conf.tip"))}">${esc(t("conf." + c))}</span>`; }
function sevChip(s){ return `<span class="chip ${s === "critical" ? "crit" : s === "high" ? "warn" : s === "medium" ? "acc" : ""}">${esc(t("sev." + s))}</span>`; }
function statusDot(s){ return `<span class="dot ${s === "confirmed" ? "ok" : s === "assumed" ? "warn" : "mut"}" title="${esc(t("st." + (s || "unknown")))}"></span>`; }
function modelChip(step){
  if (guided()) return "";
  const m = modelFor(step);
  // name the model behind the tier (from the knowledge pack), so the chip is concrete
  const lbl = m.model ? modelLabel(m.model) : t("tier." + m.tier) + (tierModel(m.tier) ? " · ≈ " + tierModel(m.tier) : "");
  return `<button class="chip tap model ${m.own ? "sel" : ""}" data-a="model-step" data-step="${step}" title="${esc(m.own ? t("model.own") : t("model.auto") + " " + t("why." + (STEP_TIER[step] || "default")))}">${ic("brain")}${esc(m.own ? lbl : t("model.autolbl", {x: lbl}))}${m.effort ? " · " + esc(t("effort." + m.effort)) : ""}</button>`;
}
function modelLabel(id){ const m = kpModels().find(x => x.id === id); return m ? m.label : id; }
/* the selectable models come from the approved knowledge pack (retiring and retired ones are not offered) */
const MODELS = { map: fn => kpModels().filter(m => m.status === "active").map(fn), find: fn => kpModels().find(fn), filter: fn => kpModels().filter(fn) };
function head(title, sub="", right=""){
  const key = slug(title);
  const tools = UI.view === "project" ? `<span class="htools">${askToggle(key)}${reportToggle(key)}</span>` : "";
  return `<div class="panel-h"><div class="stack" style="gap:2px;flex:1;min-width:200px"><h2>${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ""}</div>${right}${tools}</div>${askSectionBox(key)}`;
}
function empty(text, action=""){ return `<div class="empty-state"><p>${esc(text)}</p>${action}</div>`; }
function noteMark(kind, itemId, label){
  const p = curP(); const n = WS.notes.filter(x => !x.deletedAt && x.anchor && x.anchor.itemId === itemId && x.anchor.projectId === (p && p.id)).length;
  return `<button class="anchor-dot" data-a="anchor-note" data-kind="${esc(kind)}" data-item="${esc(itemId)}" data-label="${esc(trunc(label, 80))}" title="${esc(t("note.anchor.tip"))}" aria-label="${esc(t("note.anchor.tip"))}">${n ? n : "+"}</button>`;
}
function researchBtn(topic){ return `<button class="chip tap" data-a="research" data-topic="${esc(trunc(topic, 200))}" title="${esc(t("res.tip"))}">${ic("globe")}${esc(t("res.btn"))}</button>`; }
function bindInput(spec, value, {ph="", type="text", id=""} = {}){ return `<input type="${type}" data-bind="${esc(spec)}" value="${esc(value)}" placeholder="${esc(ph)}" ${id ? `id="${id}"` : ""}>`; }
function bindArea(spec, value, {ph="", rows=3, cls="", id=""} = {}){ return `<textarea data-bind="${esc(spec)}" rows="${rows}" placeholder="${esc(ph)}" class="${cls}" ${id ? `id="${id}"` : ""}>${esc(value)}</textarea>`; }
function bindSelect(spec, value, opts){ return `<select data-bind="${esc(spec)}">${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(value) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`; }
function scoreBar(n){ let s = '<span class="score" aria-label="' + n + '/5">'; for (let i = 1; i <= 5; i++) s += `<i class="${i <= n ? "f" : ""}"></i>`; return s + "</span>"; }
function gauge(pct){ return `<div class="gauge"><div class="track"><i style="width:${clamp(pct,0,100)}%"></i></div><b class="tnum">${Math.round(pct)}%</b></div>`; }
function mdLite(s){
  const lines = esc(s).split("\n"); let out = "", inList = false;
  for (const l of lines){
    const m = l.match(/^\s*[-*]\s+(\[( |x)\]\s+)?(.*)$/i);
    if (m){ if (!inList){ out += "<ul>"; inList = true; } out += m[1] ? `<li class="ck">${m[2].toLowerCase() === "x" ? "☑" : "☐"} ${inline(m[3])}</li>` : `<li>${inline(m[3])}</li>`; continue; }
    if (inList){ out += "</ul>"; inList = false; }
    const h = l.match(/^#{1,3}\s+(.*)$/); if (h){ out += `<h4>${inline(h[1])}</h4>`; continue; }
    out += l.trim() ? `<div>${inline(l)}</div>` : "<div>&nbsp;</div>";
  }
  if (inList) out += "</ul>";
  return out;
  function inline(x){ return x.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
}

/* ===================== SHELL ===================== */
function render(){
  RENDERING = true;
  try{ renderInner(); } finally { RENDERING = false; PR_CACHE = null; }
}
function renderInner(){
  const root = document.getElementById("app"); if (!root) return;
  const main = root.querySelector(".main"); const scroll = main ? main.scrollTop : 0;
  const drawerBody = root.querySelector(".dr-body"); const dscroll = drawerBody ? drawerBody.scrollTop : 0;
  const act = document.activeElement; const actId = act && act.id; const actBind = act && !act.id && act.getAttribute && act.getAttribute("data-bind"); const selS = act && act.selectionStart, selE = act && act.selectionEnd;
  if (!UI.booted){ root.innerHTML = `<div class="lock"><div class="lock-card"><div class="row"><span class="pulse"></span><b>${esc(t("boot.loading"))}</b></div></div></div>`; return; }
  if (UI.firstRun){ root.innerHTML = firstRunView(); afterRender(); return; }
  if (UI.fatal){ root.innerHTML = `<div class="lock"><div class="lock-card stack"><b>${esc(t("fatal.t"))}</b><p class="small">${esc(t("fatal.p"))}</p><div class="row">${btn("retry-load", t("fatal.retry"), {icon: "arrow", cls: "primary"})}</div></div></div>`; return; }
  if (!UI.unlocked){ root.innerHTML = viewLock(); afterRender(); return; }
  const drawer = UI.drawer && (UI.view === "project" || (UI.panelTab || "notes") === "notes");
  root.innerHTML = `<div class="app ${drawer ? "with-drawer" : ""}" style="--dockw:${num(UI.dockW, 360)}px">${viewRail()}<main class="main" id="main"><div class="main-inner">${previewBanner()}${typeof offlineBar === "function" ? offlineBar() : ""}${typeof pinResetBanner === "function" ? pinResetBanner() : ""}${UI.loading ? `<div class="busy"><span class="pulse"></span>${esc(t("boot.loading"))}</div>` : viewMain()}</div></main>${drawer ? viewDrawer() : ""}</div>${viewOverlays()}`;
  const m2 = root.querySelector(".main"); if (m2) m2.scrollTop = scroll;
  const d2 = root.querySelector(".dr-body"); if (d2) d2.scrollTop = dscroll;
  const refocus = actId ? document.getElementById(actId) : actBind ? document.querySelector(`[data-bind="${CSS.escape(actBind)}"]`) : null;   // 1.3: bound fields without an id keep the cursor too
  if (refocus){ refocus.focus({preventScroll:true}); try{ if (selS != null) refocus.setSelectionRange(selS, selE); }catch(e){} }
  afterRender();
}
function afterRender(){
  for (const f of $$("iframe[data-srcdoc]")){ if (!f.dataset.done){ f.srcdoc = f.getAttribute("data-srcdoc"); f.dataset.done = "1"; } }
  setSave(saveState);
  if (typeof restoreDrafts === "function") restoreDrafts();
  if (typeof flashNew === "function") flashNew();
  drawMaps();
  for (const ta of $$("textarea[data-grow]")){ ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight, 150) + "px"; }
  if (UI.pulse){
    UI.pulse = false;
    requestAnimationFrame(() => { const el = document.querySelector("[data-focus]"); if (el){ el.scrollIntoView({block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); el.classList.add("pulse-once"); } });
  }
}
function previewBanner(){ return PT_PREVIEW ? `<div class="banner warnb" style="margin-bottom:8px"><span class="dot warn"></span><span><b>${esc(t("pv.banner.t"))}</b> ${esc(t("pv.banner"))}</span></div>` : ""; }
function viewMain(){
  if (UI.view === "project" && curP()) return viewProject(curP());
  if (UI.view === "notes") return viewNotes();
  if (UI.view === "library") return viewLibrary();
  if (UI.view === "insights") return viewInsights();
  if (UI.view === "settings") return viewSettings();
  return viewCockpit();
}
function viewRail(){
  const w = META.workspaces.find(x => x.id === WS.id) || {color:"#5aa2ff"};
  const inbox = WS.notes.filter(n => n.inbox && !n.deletedAt).length;
  const nav = (v, icon, label, extra="") => `<button class="nav-btn ${UI.view === v ? "on" : ""}" data-a="nav" data-v="${v}">${ic(icon)}<span>${esc(label)}</span>${extra}</button>`;
  const projs = WS.projects.filter(p => p.status !== "archived").slice(0, 14);
  return `<nav class="rail" aria-label="${esc(t("nav.main"))}">
    <div class="brand"><div class="brand-mark">PT</div><div><div class="brand-name">Prompt Translator</div><div class="brand-ver">${verChip()}</div><div class="brand-sub">${esc(t("brand.sub"))}</div></div></div>
    <button class="ws-switch" data-a="ws-menu" title="${esc(t("ws.switch"))}"><span class="ws-dot" style="background:${esc(w.color)}"></span><span class="ws-name">${esc(wsLabel(WS.name))}</span>${ic("layers")}</button>
    <div class="nav">
      ${nav("cockpit","home",t("nav.cockpit"))}
      ${nav("notes","note",t("nav.notes"), inbox ? `<span class="count tnum">${inbox}</span>` : "")}
      ${nav("library","book",t("nav.library"))}
      ${nav("insights","spark",t("nav.insights"))}
      ${nav("settings","gear",t("nav.settings"))}
    </div>
    <div class="nav nav-proj">
      <div class="nav-label">${esc(t("nav.projects"))}</div>
      ${projs.map(p => `<button class="nav-btn ${UI.view === "project" && UI.pid === p.id ? "on" : ""}" data-a="open-project" data-id="${p.id}"><span class="dot ${p.live ? "ok" : readinessScore(p) === 100 ? "ok" : "mut"}"></span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span></button>`).join("")}
      <button class="nav-btn" data-a="new-project">${ic("plus")}<span>${esc(t("proj.new"))}</span></button>
    </div>
    <div class="rail-foot">
      ${AI.running.size ? `<div class="row small" style="gap:6px" title="${esc([...AI.running.values()].map(j => j.label).join(" · "))}"><span class="pulse"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t("run.now", {x: [...AI.running.values()][0].label, n: AI.running.size}))}</span></div>` : ""}
      <span id="savestate" class="small muted"></span>
      <div class="row">${btn("palette", t("nav.palette"), {icon:"cmd", cls:"sm ghost", title:"Ctrl/⌘ K"})}${btn("dock-toggle", t("dock.btn"), {icon:"note", cls: UI.drawer && (UI.panelTab || "notes") === "notes" ? "sm primary" : "sm", title: t("dock.tip")})}</div>
      ${btn("tool-report", t("tr.improve"), {icon:"flag", cls:"sm ghost", attrs:'data-k="rail"'})}
      ${btn("lock", t("ws.lock"), {icon:"lock", cls:"sm ghost"})}
    </div>
  </nav>`;
}

/* ===================== LOCK / WORKSPACE PICK ===================== */
function viewLock(){
  const w = UI.lockFor ? META.workspaces.find(x => x.id === UI.lockFor) : null;
  if (w && w.pinHash){
    return `<div class="lock"><div class="lock-card">
      <div class="row"><span class="ws-dot" style="background:${esc(w.color)}"></span><h2>${esc(wsLabel(w.name))}</h2></div>
      <p class="sub">${esc(t("lock.enterpin"))}</p>
      <form class="stack" data-form="unlock"><input type="password" id="pin" inputmode="numeric" autocomplete="off" placeholder="${esc(t("lock.pin"))}" aria-label="${esc(t("lock.pin"))}">
      ${UI.pinError ? `<p class="small" style="color:var(--crit)">${esc(t("lock.wrong"))}</p>` : ""}${UI.pinBusy ? `<p class="small muted"><span class="pulse"></span> ${esc(t("pin.checking"))}</p>` : ""}
      <div class="row"><button class="btn primary" type="submit" ${pinWait(w) || UI.pinBusy ? "disabled" : ""}>${ic("lock")}${esc(t("lock.open"))}</button><button class="btn ghost" type="button" data-a="lock-back">${esc(t("btn.back"))}</button></div></form>
      ${pinLockExtras(w)}
      <p class="hint">${esc(t("lock.honest"))}</p>
    </div></div>`;
  }
  return `<div class="lock"><div class="lock-card">
    <div class="brand" style="padding:0"><div class="brand-mark">PT</div><div><div class="brand-name">Prompt Translator</div><div class="brand-ver">${verChip()}</div><div class="brand-sub">${esc(t("brand.sub"))}</div></div></div>
    <h2>${esc(t("lock.who"))}</h2>
    <div class="ws-pick">${META.workspaces.map(x => `<button class="ws-opt" data-a="pick-ws" data-id="${x.id}"><span class="ws-dot" style="background:${esc(x.color)}"></span><span style="flex:1">${esc(wsLabel(x.name))}</span>${x.pinHash ? ic("lock") : ""}</button>`).join("")}</div>
    <div class="row">${LANGS.map(l => `<button class="chip tap ${LANG === l.id ? "sel" : ""}" data-a="boot-lang" data-l="${l.id}">${esc(l.label)}</button>`).join("")}</div>
  </div></div>`;
}

/* ===================== COCKPIT ===================== */
function viewCockpit(){
  const ps = WS.projects.filter(p => UI.showArchived ? p.status === "archived" : p.status !== "archived");
  const last = WS.projects.filter(p => p.status !== "archived")[0];
  let brief = "";
  if (last){
    const nb = nextBest10(last);
    const rec = WS.notes.find(n => n.projectId === last.id && n.type === "recap" && !n.deletedAt);
    brief = `<div class="briefing"><h3>${esc(t("cock.resume"))}</h3>
      <div class="row" style="justify-content:space-between"><b style="font-size:15px">${esc(last.name)}</b><span class="small muted">${esc(t("cock.lastworked"))} ${esc(fmtDate(last.updatedAt))}</span></div>
      ${rec ? `<div class="small note-md">${mdLite(trunc(rec.text, 600))}</div>` : ""}
      <div class="row"><span>${esc(t("next.label"))}: <b>${esc(last.nextAction || t(nb.key))}</b></span>${btn("open-project", t("cock.continue"), {icon:"arrow", cls:"primary sm", attrs:`data-id="${last.id}"`})}</div></div>`;
  }
  const cards = ps.map(p => {
    const sc = readinessScore(p), nb = nextBest10(p), m = projMode(p);
    const risks = p.risks.filter(r => r.status === "open" && r.likelihood * r.impact >= 12).length;
    return `<button class="pcard" data-a="open-project" data-id="${p.id}">
      <div class="row" style="justify-content:space-between"><h3>${esc(p.name)}</h3>${p.live ? chip(t("op.livev", {v: p.live.v}), "ok") : chip(phName(p.phase), "acc")}</div>
      <p class="small muted" style="min-height:2.6em">${esc(trunc(p.northStar.goal || p.intake.clean || p.intake.raw || t("cock.nogoal"), 140))}</p>
      <div class="stack" style="gap:3px"><span class="small muted">${esc(t("rd.title"))}</span>${gauge(sc)}</div>
      <div class="row small">${risks ? chip(t("cock.risks", {n: risks}), "warn") : chip(t("cock.norisks"), "ok")}${chip(t("m." + m))}<span class="muted">${esc(fmtDay(p.updatedAt))}</span></div>
      <div class="small"><span class="muted">${esc(t("next.label"))}:</span> ${esc(p.nextAction || t(nb.key))}</div>
    </button>`;
  }).join("");
  const firstUse = !WS.settings.firstUseDone ? `<section class="panel stack fu"><div class="row" style="justify-content:space-between"><h3>${esc(t("fu.title"))}</h3>${btn("fu-dismiss", t("btn.close"), {cls:"sm ghost"})}</div><ol class="small">${[1,2,3,4,5].map(i => `<li>${esc(t("fu." + i))}</li>`).join("")}</ol></section>` : "";
  const lives = WS.projects.filter(p => p.live && p.status !== "archived");
  const live = lives.length ? `<section class="panel stack"><div class="row" style="justify-content:space-between"><h3>${esc(t("hc.alltitle"))}</h3><div class="row">${btn("health-all", t("hc.all"), {icon:"heart", cls:"sm"})}${btn("collect-all", t("op.collect"), {icon:"inbox", cls:"sm"})}</div></div>
    <div class="list">${lives.map(p => { const h = (UI.healthAll || {})[p.id]; return `<div class="item"><span class="dot ${h ? (h.ok ? "ok" : "bad") : "todo"}" style="margin-top:7px"></span><div class="body"><span class="title">${esc(p.name)} · v${esc(p.live.v)}</span><span class="small muted">${esc(h ? h.line : t("hc.notyet"))}</span></div>${btn("open-project", t("btn.open"), {cls:"sm ghost", attrs:`data-id="${p.id}" data-phase="operate"`})}</div>`; }).join("")}</div></section>` : "";
  return `<div class="topbar"><div class="stack" style="gap:2px;flex:1"><span class="crumb">${esc(wsLabel(WS.name))}</span><h1>${esc(t("nav.cockpit"))}</h1></div></div>
    ${cockpitEngine()}
    <section class="panel start stack">
      <div class="row" style="justify-content:space-between"><h2>${esc(t("start.title"))}</h2><div class="seg" role="tablist">${["new","existing"].map(k => `<button class="${(UI.startKind || "new") === k ? "on" : ""}" data-a="start-kind" data-v="${k}">${esc(t("start." + k))}</button>`).join("")}</div></div>
      ${(UI.startKind || "new") === "new" ? `<form class="stack" data-form="start">
        <label class="fld"><span>${esc(t("start.idea"))}</span><textarea id="start-in" class="bigfield" rows="7" placeholder="${esc(t("start.ph"))}" data-grow="1" data-bind="ui:startText">${esc(UI.startText || "")}</textarea></label>
        <div class="stack" style="gap:6px"><span class="small muted">${esc(t("start.mode"))}</span><div class="mcards">${MODES.map(m => `<button type="button" class="mcard" data-a="start-mode" data-v="${m}" aria-pressed="${(UI.startMode || WS.settings.defaultMode || "steps") === m}">${m === (WS.settings.defaultMode || "steps") ? `<span class="chip">${esc(t("start.default"))}</span>` : ""}<b class="row">${ic(MODE_ICON[m])}${esc(t("m." + m))}</b><small>${esc(t("mg." + m))}</small></button>`).join("")}</div></div>
        <div class="row"><input type="text" id="np-name" placeholder="${esc(t("start.nameph"))}" aria-label="${esc(t("proj.name"))}" style="flex:1;min-width:200px;max-width:380px" data-bind="ui:startName" value="${esc(UI.startName || "")}"><button class="btn primary lg" type="submit">${ic("plus")}${esc(t("start.go"))}</button></div>
        <p class="hint">${esc(t("start.hint"))}</p></form>`
      : `<form class="stack" data-form="existing">
        <p class="small">${esc(t("ex.lead"))}</p>
        <textarea id="ex-in" class="bigfield" rows="9" placeholder="${esc(t("ex.ph"))}" data-bind="ui:exText">${esc(UI.exText || "")}</textarea>
        <div class="row"><label class="btn sm" style="cursor:pointer">${ic("plus")}${esc(t("ex.files"))}<input type="file" accept=".md,.txt,.json,.pdf,text/plain,text/markdown,application/json,application/pdf" multiple data-a-change="ex-files" hidden></label>${UI.exFiles && UI.exFiles.length ? chip(t("ex.filesn", {n: UI.exFiles.length}), "acc") : ""}<span style="flex:1"></span><button class="btn primary ai" type="submit" data-cost="${esc(t("cost.h"))}">${ic("spark")}${esc(t("ex.go"))}</button></div>
        <p class="hint">${esc(t("ex.hint"))}</p>${busyHTML("existing")}${busyHTML("review")}${busyHTML("fix")}${busyHTML("confirm")}</form>`}
    </section>
    ${firstUse}${brief}${live}
    <div class="panel-h"><h2>${esc(UI.showArchived ? t("cock.archived") : t("cock.projects"))}</h2>${btn("toggle-archived", UI.showArchived ? t("cock.showactive") : t("cock.showarchived"), {cls:"ghost sm"})}</div>
    ${ps.length ? `<div class="proj-grid">${cards}</div>` : empty(UI.showArchived ? t("cock.noarchived") : t("cock.empty"))}
    ${jobsPanel()}`;
}
function jobsPanel(){
  const js = arr(WS.jobs).slice(0, 8); if (!js.length) return "";
  return `<section class="panel stack"><h3>${esc(t("job.title"))}</h3><div class="list">${js.map(jobLine).join("")}</div></section>`;
}
function jobLine(j){
  const st = j.status, live = !["done","failed","notsent"].includes(st);
  const stuck = live && Date.now() - new Date(j.createdAt).getTime() > 90 * 60000;
  return `<div class="item"><span class="dot ${st === "done" ? "ok" : st === "failed" || st === "notsent" ? "bad" : "cur"}" style="margin-top:7px"></span><div class="body"><span class="title">${esc(t("job." + j.kind))}${j.title ? " · " + esc(trunc(j.title, 80)) : ""}</span><span class="small muted">${esc(t("jst." + st))} · ${esc(fmtDate(j.createdAt))}${arr(j.steps).length ? " · " + esc(t("job.steps", {n: arr(j.steps).filter(x => x.status === "done").length})) : ""}${j.error ? " · " + esc(trunc(j.error, 140)) : ""}</span>${live ? `<span class="small">${esc(t(stuck ? "job.stuck" : "job.wait"))}</span>` : ""}</div>${live ? btn("job-refresh", t("job.refresh"), {cls:"sm ghost", attrs:`data-id="${j.id}"`}) : ""}${stuck ? btn("job-retry", t("job.resend"), {cls:"sm", attrs:`data-id="${j.id}"`}) + btn("job-cancel", t("job.cancel"), {cls:"sm ghost", attrs:`data-id="${j.id}"`}) : ""}${st === "notsent" ? btn("job-retry", t("job.retry"), {cls:"sm", attrs:`data-id="${j.id}"`}) : ""}</div>`;
}

/* ===================== PROJECT FRAME ===================== */
function viewProject(p){
  const ns = p.northStar;
  if (!p.focus || !PHASE_IDS.includes(p.focus.ph)) p.focus = {ph: UI.phase && PHASE_IDS.includes(UI.phase) ? UI.phase : "capture", id: null};
  if (UI.phase !== "log") UI.phase = p.focus.ph;
  const nsCell = (k, label) => `<div class="stack" style="gap:2px;min-width:0"><span class="ns-k">${esc(label)}</span><span class="ns-v ${ns[k] ? "" : "empty"}">${esc(ns[k] || t("ns.empty"))}</span></div>`;
  const nb = nextBest10(p);
  const fs = activeForesight(p).filter(f => f.phase === p.focus.ph && !f.done);
  const rec = UI.briefing && p.lastRecap ? WS.notes.find(n => n.projectId === p.id && n.type === "recap" && !n.deletedAt) : null;
  const al = p.alignment, score = readinessScore(p);
  const head1 = `
  <div class="topbar">
    <div class="stack" style="gap:2px;flex:1;min-width:220px"><span class="crumb">${esc(wsLabel(WS.name))} › ${esc(t("nav.projects"))}</span>
      <input type="text" class="h1-input" data-bind="p:name" value="${esc(p.name)}" aria-label="${esc(t("proj.name"))}" id="pname"></div>
    <div class="row">
      ${p.live ? chip(t("op.livev", {v: p.live.v}), "ok") : ""}
      <span class="chip ${score === 100 ? "ok" : "warn"} tnum" title="${esc(t("rd.title"))}">${esc(t("rd.title"))} ${score}%</span>
      ${plangChip(p)}
      ${guided() ? "" : `<span class="chip tnum" title="${esc(t("usage.tip"))}">${esc(t("usage.chip", {n: usagePct()}))}</span>`}
      ${ibtn("undo","undo",t("btn.undo"))}
      ${btn("restore-open", t("rp.title"), {icon:"clock", cls:"sm"})}
      ${btn("panel", t("panel.guide"), {icon:"ask", cls: UI.drawer && UI.panelTab === "guide" ? "sm primary" : "sm", attrs:'data-v="guide"'})}
      ${btn("panel", t("notes.drawer"), {icon:"note", cls: UI.drawer && UI.panelTab === "notes" ? "sm primary" : "sm", attrs:'data-v="notes"'})}
      ${btn("dc-open", t("dc.btn"), {icon:"route", cls:"sm"})}
      ${btn("phase", t("log.title"), {icon:"log", cls: UI.phase === "log" ? "sm primary" : "sm ghost", attrs:'data-ph="log"'})}
      ${aiBtn("recap", t("recap.end"), "M", {key:"recap"})}
      ${ibtn("project-menu","gear",t("proj.more"))}
    </div>
  </div>
  <section class="northstar" aria-label="${esc(t("ns.title"))}">
    <svg class="ns-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${IC.target}</svg>
    <div class="stack" style="gap:10px;min-width:0"><div class="row"><b class="ns-title">${esc(t("ns.title"))}</b>${p.nsAssumed ? `<span class="chip st-as">${esc(t("ist.as"))}</span><button class="btn xs" data-a="ns-confirm">${ic("check")}${esc(t("btn.confirm"))}</button>` : ""}<span class="small muted">${esc(t("ns.sub"))}</span></div>
      <div class="ns-grid">${nsCell("problem", t("ns.problem"))}${nsCell("goal", t("ns.goal"))}${nsCell("success", t("ns.success"))}</div></div>
    <div class="stack" style="gap:6px">${btn("edit-ns", t("btn.edit"), {icon:"edit", cls:"sm"})}${aiBtn("align", t("ns.check"), "M", {key:"align"})}</div>
  </section>
  ${busyHTML("align")}
  ${al ? `<div class="panel" style="border-color:${al.aligned ? "var(--ok)" : "var(--warn)"}"><div class="row"><b>${esc(al.aligned ? t("ns.aligned") : t("ns.drift"))}</b><span class="small muted">${esc(fmtDate(al.at))}</span>${ibtn("dismiss-align","x",t("btn.close"))}</div>${[...al.issues, ...al.uncovered].length ? `<ul class="small" style="margin:0;padding-left:18px">${[...al.issues.map(x => `<li>${esc(x)}</li>`), ...al.uncovered.map(x => `<li>${esc(t("ns.uncovered"))}: ${esc(x)}</li>`)].join("")}</ul>` : ""}</div>` : ""}`;
  if (UI.phase === "log") return head1 + `<div class="controw top"><button class="btn ghost" data-a="goto" data-ph="${p.focus.ph}">← ${esc(phName(p.focus.ph))}</button></div>` + phLog(p) + `<div class="controw bottom"><span style="flex:1"></span><button class="btn ghost" data-a="top">${ic("up")}${esc(t("btn.top"))}</button></div>`;
  return head1 + `
  ${modeBar(p)}
  ${learnPanel(p)}
  ${guided() ? guideBox(p) : `<div class="nextbar"><span class="lbl">${esc(t("next.label"))}</span><span class="txt">${esc(p.nextAction || t(nb.key))}</span>${nb.phase !== p.focus.ph ? btn("goto", t("next.go", {ph: phName(nb.phase)}), {icon:"arrow", cls:"sm primary", attrs:`data-ph="${nb.phase}"`}) : ""}</div>`}
  ${bannersHTML(p)}
  ${trBar(p)}
  ${recheckBar(p)}
  ${rec ? `<div class="briefing"><div class="row"><h3 style="flex:1">${esc(t("cock.resume"))}</h3>${ibtn("dismiss-brief","x",t("btn.close"))}</div><div class="small note-md">${mdLite(rec.text)}</div></div>` : ""}
  ${p.drift && p.focus.ph === "interview" ? `<div class="panel" style="border-color:var(--warn)"><div class="row">${ic("flag")}<b>${esc(t("int.drift"))}</b></div><p>${esc(p.drift)}</p></div>` : ""}
  ${fs.length ? `<div class="panel flat" style="padding:10px 14px"><div class="row"><b class="small fs-label">${esc(t("fs.now"))}</b>${fs.slice(0, UI.fsAll ? 999 : 3).map(f => `<span class="chip warn wrap">${esc(f.text)} <button class="iconbtn" style="width:18px;height:18px" data-a="fs-done" data-id="${esc(f.id)}" title="${esc(t("fs.done"))}" aria-label="${esc(t("fs.done"))}">${ic("check")}</button></span>`).join("")}${fs.length > 3 ? `<button class="btn sm ghost" data-a="fs-all">${esc(UI.fsAll ? t("fs.less") : t("fs.more", {n: fs.length - 3}))}</button>` : ""}</div></div>` : ""}
  ${modeBody(p)}`;
}
function viewPhase(p){
  switch (UI.phase){
    case "capture": return phCapture(p);
    case "understand": return phUnderstand(p);
    case "interview": return phInterview(p);
    case "assume": return phAssume(p);
    case "require": return phRequire(p);
    case "arch": return phArch(p);
    case "build": return phBuild(p);
    case "review": return phReview(p);
    case "test": return phTest(p);
    case "launch": return phLaunch(p);
    case "release": return phRelease(p);
    case "operate": return phOperate(p);
    case "log": return phLog(p);
  }
  return phCapture(p);
}

/* ===================== DRAWER (contextual notes) ===================== */
function viewDrawer(){
  const p = curP();
  const tab = UI.panelTab || "notes";
  const tabs = !p || UI.view !== "project" ? "" : `<div class="tabs" role="tablist" style="margin:0 10px">${["guide","notes"].map(x => `<button class="tab ${tab === x ? "on" : ""}" data-a="panel" data-v="${x}">${esc(x === "guide" ? t("panel.guide") : t("notes.drawer"))}</button>`).join("")}</div>`;
  let body;
  if (tab === "guide" && p && UI.view === "project"){
    const hist = arr(p && p.guide).slice(-8);
    body = `<div class="dr-body stack">
      <div class="panel flat stack" style="gap:6px"><b>${esc(t("guide.screen", {x: p ? phName(UI.phase === "log" ? p.focus.ph : UI.phase) : ""}))}</b><p class="small">${esc(t("help." + (p ? p.focus.ph : "capture")))}</p>
      ${p ? `<div class="small">${readiness10(p).filter(r => r.score < 10).slice(0, 4).map(r => `<div>• ${esc(t(r.key))} ${r.score}/10</div>`).join("") || esc(t("guide.allgood"))}</div>` : ""}</div>
      ${hist.map((g, i) => `<div class="gq"><div class="small muted">${esc(g.q)}</div><div class="note-md">${mdLite(g.answer)}</div>${arr(g.actions).length ? `<div class="row">${g.actions.map(a => `<button class="btn sm" data-a="guide-act" data-id="${esc(a.id)}">${esc(a.label || a.id)}</button>`).join("")}</div>` : ""}</div>`).join("")}
      ${busyHTML("guide")}
    </div>
    <form class="stack" data-form="guide" style="padding:12px 14px;border-top:1px solid var(--line)"><textarea id="guide-in" rows="3" placeholder="${esc(t("guide.ph"))}"></textarea><div class="row end"><button class="btn sm primary" type="submit">${ic("ask")}${esc(t("ask.send"))}</button></div></form>`;
  } else body = notesDock();
  return `<aside class="drawer" aria-label="${esc(t("panel.label"))}"><div class="dock-grip" data-grip="1" title="${esc(t("dock.resize"))}" aria-hidden="true"></div>
    <div class="dr-h"><h3>${esc(tab === "guide" && UI.view === "project" ? t("panel.guide") : t("notes.drawer"))}</h3>${ibtn("toggle-drawer","x",t("btn.close"))}</div>${tabs}${body}
  </aside>`;
}
function noteCard(n, {compact=false} = {}){
  const editing = UI.editNote === n.id;
  const p = n.projectId ? WS.projects.find(x => x.id === n.projectId) : null;
  let changed = false;
  if (n.anchor && n.anchor.snapshot != null && p){ const cur = itemText(p, n.anchor.kind, n.anchor.itemId); changed = cur != null && cur !== n.anchor.snapshot; }
  const typeOpts = [["",t("ntype.none")],["idea",t("ntype.idea")],["question",t("ntype.question")],["concern",t("ntype.concern")],["decision",t("ntype.decision")],["todo",t("ntype.todo")],["source",t("ntype.source")],["recap",t("ntype.recap")]];
  return `<div class="note ${n.pinned ? "pinned" : ""}" data-note="${n.id}">
    <div class="nm">${n.type ? chip(t("ntype." + n.type), "acc") : ""}${n.inbox ? chip(t("notes.inbox"), "warn") : ""}${n.noAI ? chip(t("notes.noai")) : ""}${!compact && p ? `<span>${esc(p.name)}</span>` : ""}<span>${esc(fmtDate(n.updatedAt))}</span></div>
    ${n.anchor ? `<span class="anchor" data-a="goto-anchor" data-id="${n.id}">${ic("link")}${esc(trunc(n.anchor.label, 70))}${changed ? ` <span class="chip warn">${esc(t("note.changed"))}</span>` : ""}</span>` : ""}
    ${editing ? `<textarea data-bind="note:${n.id}:text" rows="5" id="ne-${n.id}">${esc(n.text)}</textarea>
      <div class="row">${bindSelect("note:" + n.id + ":type", n.type || "", typeOpts)}${!compact ? bindSelect("note:" + n.id + ":projectId", n.projectId || "", [["", t("notes.personal")], ...WS.projects.map(x => [x.id, x.name])]) : ""}</div>
      <label class="chk small"><input type="checkbox" data-bind="note:${n.id}:noAI" ${n.noAI ? "checked" : ""}>${esc(t("notes.noai.lbl"))}</label>
      <label class="small btn sm" style="cursor:pointer">${ic("plus")}${esc(t("notes.image"))}<input type="file" accept="image/*" data-a-change="note-image" data-id="${n.id}" hidden></label>`
      : `<div class="nt note-md">${mdLite(n.text)}</div>`}${arr(n.links).length ? `<div class="row" style="gap:4px">${n.links.slice(-6).map(l => `<button class="chip tap" data-a="pt-link" data-t="${esc(l.target)}">↗ ${esc(trunc(l.label, 40))}</button>`).join("")}</div>` : ""}
    ${n.image ? `<img src="${esc(n.image)}" alt="${esc(t("notes.imgalt"))}">` : ""}
    ${n.translation ? `<div class="small" style="border-left:2px solid var(--accent);padding-left:8px;white-space:pre-wrap">${esc(n.translation)}</div>` : ""}
    ${busyHTML("tr-" + n.id)}
    <div class="row" style="gap:2px">
      ${n.deletedAt ? btn("note-restore", t("btn.restore"), {cls:"sm", attrs:`data-id="${n.id}"`}) :
      `${ibtn("note-edit", editing ? "check" : "edit", editing ? t("btn.done") : t("btn.edit"), `data-id="${n.id}"`)}
      ${ibtn("note-pin","pin", n.pinned ? t("notes.unpin") : t("notes.pin"), `data-id="${n.id}"`)}
      ${n.inbox ? ibtn("note-file","check",t("notes.file"),`data-id="${n.id}"`) : ""}
      ${ibtn("note-translate","globe",t("notes.translate"),`data-id="${n.id}"`)}
      ${ibtn("note-copy","copy",t("btn.copy"),`data-id="${n.id}"`)}
      ${n.history.length ? ibtn("note-history","log",t("notes.history"),`data-id="${n.id}"`) : ""}
      ${ibtn("note-del","trash",t("btn.delete"),`data-id="${n.id}"`)}`}
    </div>
  </div>`;
}
function itemText(p, kind, id){
  try{
    if (kind === "dim") return str((p.dims[id] || {}).summary);
    if (kind === "req"){ const r = p.requirements.find(x => x.id === id); return r ? r.given + r.when + r.then : null; }
    if (kind === "assumption"){ const r = p.assumptions.find(x => x.id === id); return r ? r.text : null; }
    if (kind === "risk"){ const r = p.risks.find(x => x.id === id); return r ? r.text : null; }
    if (kind === "section"){ const r = p.pkg.sections.find(x => x.id === id); return r ? r.content : null; }
    if (kind === "test"){ const r = p.tests.find(x => x.id === id); return r ? r.input + r.criteria.join("") : null; }
    if (kind === "component"){ const r = p.arch.components.find(x => x.id === id); return r ? r.role : null; }
    if (kind === "ns") return JSON.stringify(p.northStar);
  }catch(e){}
  return null;
}
