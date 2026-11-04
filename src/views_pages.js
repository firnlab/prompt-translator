/* ===================== NOTES PAGE ===================== */
function viewNotes(){
  const f = UI.notesFilter, q = UI.notesQuery.trim().toLowerCase();
  let list = WS.notes.filter(n => f === "trash" ? n.deletedAt : !n.deletedAt);
  if (q && f !== "trash"){ list = list.filter(n => (n.text + " " + (n.anchor ? n.anchor.label : "") + " " + projName(n.projectId) + " " + (n.type ? t("ntype." + n.type) : "")).toLowerCase().includes(q)); }
  else if (f === "inbox") list = list.filter(n => n.inbox);
  if (!q && f === "pinned") list = list.filter(n => n.pinned);
  if (!q && f === "personal") list = list.filter(n => !n.projectId);
  if (!q && f.startsWith("p:")) list = list.filter(n => n.projectId === f.slice(2));
  list.sort((a,b) => (b.pinned - a.pinned) || (b.updatedAt||"").localeCompare(a.updatedAt||""));
  const cnt = k => k === "inbox" ? WS.notes.filter(n => n.inbox && !n.deletedAt).length : k === "pinned" ? WS.notes.filter(n => n.pinned && !n.deletedAt).length : k === "personal" ? WS.notes.filter(n => !n.projectId && !n.deletedAt).length : k === "trash" ? WS.notes.filter(n => n.deletedAt).length : WS.notes.filter(n => !n.deletedAt).length;
  const fbtn = (k, label) => `<button class="nav-btn ${f === k ? "on" : ""}" data-a="notes-filter" data-f="${k}"><span>${esc(label)}</span><span class="count tnum">${cnt(k)}</span></button>`;
  const tri = UI.triage;
  let body;
  if (f === "claude") body = viewToolFeedback();
  else body = `
    ${f === "inbox" ? `<div class="panel flat"><div class="row"><p class="lead" style="flex:1">${esc(t("notes.inboxlead"))}</p>${modelChip("notes")}${aiBtn("triage", t("notes.triage"), "M", {primary:true, key:"triage"})}</div>${busyHTML("triage")}</div>` : ""}
    ${tri ? `<section class="panel" style="border-color:var(--accent)">${head(t("notes.triageres"), t("notes.triageres.sub"))}<div class="list">${tri.map((it, i) => { const n = WS.notes.find(x => x.id === it.noteId); if (!n) return ""; return `<div class="item"><input type="checkbox" data-a-change="tri-accept" data-i="${i}" ${it.accept ? "checked" : ""} style="margin-top:4px;accent-color:var(--accent)" aria-label="${esc(t("notes.accept"))}"><div class="body"><span class="small muted">${esc(trunc(n.text, 140))}</span><div class="row"><span>→</span><select data-a-change="tri-become" data-i="${i}">${["requirement","assumption","question","risk","task","pattern","keep"].map(b => `<option value="${b}" ${it.become === b ? "selected" : ""}>${esc(t("become." + b))}</option>`).join("")}</select><span class="small" style="flex:1">${esc(it.text)}</span></div><span class="small muted">${esc(it.reason)}</span>${!n.projectId && !["pattern","keep"].includes(it.become) ? `<span class="small" style="color:var(--warn)">${esc(t("notes.needproject"))}</span>` : ""}</div></div>`; }).join("")}</div><div class="row end">${btn("tri-cancel", t("btn.cancel"), {cls:"ghost"})}${btn("tri-apply", t("notes.applytri"), {icon:"check", cls:"primary"})}</div></section>` : ""}
    ${list.length ? `<div class="grid2">${list.map(n => noteCard(n)).join("")}</div>` : empty(f === "inbox" ? t("notes.inboxempty") : f === "trash" ? t("notes.trashempty") : t("notes.none"))}
    ${f === "trash" && list.length ? `<p class="hint">${esc(t("notes.trashhint"))}</p>` : ""}`;
  return `<div class="topbar"><div class="stack" style="gap:2px;flex:1"><span class="crumb">${esc(wsLabel(WS.name))}</span><h1>${esc(t("nav.notes"))}</h1></div>
      <input type="search" id="nq" value="${esc(UI.notesQuery)}" placeholder="${esc(t("notes.search"))}" data-bind="ui:notesQuery" data-rerender="1" style="max-width:320px" aria-label="${esc(t("notes.search"))}"></div>
    <form class="panel" data-form="new-note" style="flex-direction:row;align-items:flex-start;gap:10px;flex-wrap:wrap"><textarea id="nn-text" rows="2" placeholder="${esc(t("notes.quickph"))}" style="flex:1;min-width:240px"></textarea>
      <select id="nn-proj" style="width:auto;max-width:220px" aria-label="${esc(t("notes.project"))}"><option value="">${esc(t("notes.personal"))}</option>${WS.projects.filter(p => p.status !== "archived").map(p => `<option value="${p.id}" ${f === "p:" + p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
      <button class="btn primary" type="submit">${ic("plus")}${esc(t("notes.add"))}</button></form>
    <div class="grid2 side220">
      <nav class="stack" style="gap:2px" aria-label="${esc(t("notes.filters"))}">
        ${fbtn("inbox", t("notes.inbox"))}${fbtn("all", t("notes.all"))}${fbtn("pinned", t("notes.pinned"))}${fbtn("personal", t("notes.personal"))}
        <div class="nav-label">${esc(t("nav.projects"))}</div>
        ${WS.projects.map(p => `<button class="nav-btn ${f === "p:" + p.id ? "on" : ""}" data-a="notes-filter" data-f="p:${p.id}"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span><span class="count tnum">${WS.notes.filter(n => n.projectId === p.id && !n.deletedAt).length}</span></button>`).join("")}
        <div class="nav-label">${esc(t("notes.more"))}</div>
        ${fbtn("trash", t("notes.trash"))}
        <button class="nav-btn ${f === "claude" ? "on" : ""}" data-a="notes-filter" data-f="claude">${ic("flag")}<span>${esc(t("notes.toolreq"))}</span></button>
      </nav>
      <div class="stack lg" style="min-width:0">${body}</div>
    </div>`;
}
function viewToolFeedback(){
  const items = arr(WS.toolfb);
  return `<section class="panel">${head(t("tfb.title"), t("tfb.sub"), btn("copy-upgrade", t("tfb.upgrade"), {icon:"copy", cls:"sm primary"}))}
    <p class="hint">${esc(t("tfb.upgradehint"))}</p>
    <form class="stack" data-form="toolfb"><textarea id="tfb-text" rows="4" placeholder="${esc(t("tfb.ph"))}"></textarea><div class="row end"><button class="btn primary" type="submit">${ic("plus")}${esc(t("tfb.send"))}</button></div></form>
    ${UI.tfbLoading ? `<div class="busy"><span class="pulse"></span>${esc(t("boot.loading"))}</div>` : items.length ? `<div class="list">${items.map(x => `<div class="item"><div class="body"><span style="white-space:pre-wrap">${esc(x.text)}</span><span class="meta">${esc(fmtDate(x.at))}${x.where ? " · " + esc(x.where) : ""} ${chip(wsLabel(x.ws || ""))} ${x.status === "done" ? chip(t("tfb.done"), "ok") : chip(t("tfb.open"))}</span></div></div>`).join("")}</div>` : empty(t("tfb.empty"))}</section>`;
}

/* ===================== LIBRARY ===================== */
function viewLibrary(){
  const tabs = ["patterns","practices","research"].map(x => `<button class="tab ${UI.libTab === x ? "on" : ""}" data-a="tab" data-t="libTab" data-v="${x}">${esc(t("lib.tab." + x))}</button>`).join("");
  let body = "";
  if (UI.libTab === "patterns"){
    const mine = WS.patterns.filter(x => !x.deletedAt);
    const card = (pt, own) => `<div class="panel" style="gap:8px"><div class="row"><b style="flex:1 1 12em">${esc(own ? pt.title : L(pt))}</b>${own ? chip(t("lib.yours"), "acc") : chip(t("lib.starter"))}${pt.kind === "skill" ? chip(t("lib.skill"), "ok") : ""}</div>
      <p class="small muted">${esc(own ? pt.desc : L(pt.d))}</p>
      ${own && pt.evidence ? `<p class="small">${ic("check")} ${esc(pt.evidence)}</p>` : ""}
      ${own && UI.expanded.has("pt-" + pt.id) ? `<label class="fld"><span>${esc(t("lib.ptitle"))}</span>${bindInput("pat:" + pt.id + ":title", pt.title)}</label><label class="fld"><span>${esc(t("lib.pdesc"))}</span>${bindInput("pat:" + pt.id + ":desc", pt.desc)}</label>${bindArea("pat:" + pt.id + ":body", pt.body, {rows:10, cls:"code", id:"pb-" + pt.id})}` : `<pre class="prompt" style="max-height:200px;border:1px solid var(--line);border-radius:6px;padding:8px;background:var(--bg-2)">${esc(pt.body)}</pre>`}
      <div class="row">${btn("pat-copy", t("btn.copy"), {icon:"copy", cls:"sm", attrs:`data-id="${pt.id}" data-own="${own ? 1 : 0}"`})}${btn("pat-insert", t("lib.insert"), {icon:"plus", cls:"sm", attrs:`data-id="${pt.id}" data-own="${own ? 1 : 0}"`})}${btn("pat-skill", t("lib.mkskill"), {icon:"layers", cls:"sm", attrs:`data-id="${pt.id}" data-own="${own ? 1 : 0}"`})}${own ? ibtn("toggle-exp", UI.expanded.has("pt-" + pt.id) ? "check" : "edit", t("btn.edit"), `data-k="pt-${pt.id}"`) + ibtn("pat-del","trash",t("btn.delete"),`data-id="${pt.id}"`) : ""}</div></div>`;
    body = `<div class="row">${btn("pat-new", t("lib.newpattern"), {icon:"plus", cls:"sm"})}<span class="hint">${esc(t("lib.patternhint"))}</span></div>
      ${mine.length ? `<h3>${esc(t("lib.yourpatterns"))}</h3><div class="grid2">${mine.map(x => card(x, true)).join("")}</div>` : ""}
      <h3>${esc(t("lib.starterpatterns"))}</h3><div class="grid2">${STARTER_PATTERNS.map(x => card(x, false)).join("")}</div>`;
  } else if (UI.libTab === "practices"){
    body = `<div class="row"><p class="lead" style="flex:1">${esc(t("lib.kplead", {d: fmtDay(kpStamp())}))}</p>${researchBtn(t("lib.kpupdate", {d: kpStamp()}))}</div>
      ${Object.keys(KP_CATS).map(c => `<div class="stack"><h3>${esc(L(KP_CATS[c]))}</h3><div class="list">${kpRules().filter(r => r.cat === c).map(r => `<div class="item"><span class="dot" style="background:var(--accent);margin-top:7px"></span><div class="body"><span>${esc(L(r))}</span></div></div>`).join("")}</div></div>`).join("")}
      <div class="stack"><h3>${esc(t("lib.sources"))}</h3><div class="small">${KP_SOURCES.map(s => `<div><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></div>`).join("")}</div></div>`;
  } else {
    body = `<div class="row">${btn("research", t("res.new"), {icon:"globe", cls:"sm", attrs:'data-topic=""'})}</div>${WS.research.length ? WS.research.slice().reverse().map(r => `<div class="stack" style="gap:4px"><span class="small muted">${esc(projName(r.projectId) || t("notes.personal"))}</span>${researchCard(r)}</div>`).join("") : empty(t("res.empty"))}`;
  }
  return `<div class="topbar"><div class="stack" style="gap:2px;flex:1"><span class="crumb">${esc(wsLabel(WS.name))}</span><h1>${esc(t("nav.library"))}</h1></div></div><div class="tabs" role="tablist">${tabs}</div>${body}`;
}

/* ===================== INSIGHTS ===================== */
function viewInsights(){
  const ins = WS.insights;
  return `<div class="topbar"><div class="stack" style="gap:2px;flex:1"><span class="crumb">${esc(wsLabel(WS.name))}</span><h1>${esc(t("nav.insights"))}</h1></div><div class="row">${modelChip("insights")}${aiBtn("insights", t("ins.run"), "H", {primary:true, key:"insights"})}</div></div>
  ${busyHTML("insights")}
  <section class="panel">${head(t("ins.profile"), t("ins.profile.sub"), btn("prof-add", t("btn.add"), {icon:"plus", cls:"sm"}))}
    ${WS.profile.entries.length ? `<div class="list">${WS.profile.entries.map(e => `<div class="item"><div class="body">${bindInput("ws:profile.entries.#" + e.id + ".text", e.text)}</div>${ibtn("prof-del","trash",t("btn.delete"),`data-id="${e.id}"`)}</div>`).join("")}</div>` : empty(t("ins.profileempty"))}
    ${arr(WS.profileSuggestions).length ? `<h4>${esc(t("ins.suggested"))}</h4><div class="list">${WS.profileSuggestions.map((s, i) => `<div class="item"><div class="body"><span>${esc(s)}</span></div><div class="acts">${btn("prof-accept", t("btn.add"), {cls:"sm", attrs:`data-i="${i}"`})}${ibtn("prof-reject","x",t("btn.discard"),`data-i="${i}"`)}</div></div>`).join("")}</div>` : ""}
  </section>
  <section class="panel">${head(t("ins.patterns"), ins ? t("ins.at", {d: fmtDate(ins.at)}) : t("ins.patterns.sub"))}
    ${ins && ins.patterns.length ? `<div class="list">${ins.patterns.map(x => `<div class="item"><div class="body"><span class="title">${esc(x.text)}</span><span class="small muted">${esc(x.evidence)}</span></div></div>`).join("")}</div>` : empty(t("ins.empty"))}
  </section>
  <section class="panel">${head(t("ins.stats"))}<div class="grid3">
    ${[["ins.s.projects", WS.projects.length],["ins.s.versions", WS.projects.reduce((s,p) => s + (p.versionNo||0), 0)],["ins.s.findings", WS.projects.reduce((s,p) => s + p.findings.filter(f => f.status === "fixed").length, 0)],["ins.s.tests", WS.projects.reduce((s,p) => s + p.tests.length, 0)],["ins.s.feedback", WS.projects.reduce((s,p) => s + p.feedback.length, 0)],["ins.s.notes", WS.notes.filter(n => !n.deletedAt).length]].map(([k, v]) => `<div class="panel" style="gap:2px"><span class="small muted">${esc(t(k))}</span><b style="font-family:var(--f-display);font-size:26px" class="tnum">${v}</b></div>`).join("")}
  </div></section>`;
}

/* ===================== SETTINGS ===================== */
function viewSettings(){
  const s = WS.settings;
  const tabs = ["general","models","knowledge","workspaces","data","about"].map(x => `<button class="tab ${UI.setTab === x ? "on" : ""}" data-a="tab" data-t="setTab" data-v="${x}">${esc(t("set.tab." + x))}</button>`).join("");
  let body = "";
  if (UI.setTab === "general"){
    body = `<div class="stack lg">
      <div class="stack"><h3>${esc(t("set.lang"))}</h3><div class="seg">${LANGS.map(l => `<button class="${LANG === l.id ? "on" : ""}" data-a="set-lang" data-l="${l.id}">${esc(l.label)}</button>`).join("")}</div><p class="hint">${esc(t("set.langhint"))}</p></div>
      <div class="stack"><h3>${esc(t("set.work"))}</h3><div class="grid3">
        <label class="fld"><span>${esc(t("set.defmode"))}</span>${bindSelect("ws:settings.defaultMode", projMode(null), MODES.map(m => [m, t("m." + m)]))}</label>
        <div class="fld"><span>${esc(t("help.level"))}</span>${helpSeg()}<span class="hint">${esc(t("help.tip." + helpLevel()))}</span></div>
        </div>
        <label class="chk"><input type="checkbox" data-bind="ws:settings.fileOnFinish" ${s.fileOnFinish !== false ? "checked" : ""}>${esc(t("set.fileonfinish"))}</label>
        <label class="chk"><input type="checkbox" data-bind="ws:settings.autoResearch" ${s.autoResearch !== false ? "checked" : ""}>${esc(t("set.autoresearch"))}</label>
        <div class="row">${btn("set-skip-reset", t("set.previewreset.btn"), {cls:"sm ghost"})}</div></div>
      <div class="stack"><h3>${esc(t("set.budget"))}</h3><p class="small muted">${esc(t("usage.chip", {n: usagePct()}))} · ${esc(t("sp.budget.info"))}</p></div>
      <div class="stack"><h3>${esc(t("set.theme"))}</h3><div class="seg">${["system","dark","light"].map(x => `<button class="${(s.theme||"system") === x ? "on" : ""}" data-a="set-theme" data-v="${x}">${esc(t("theme." + x))}</button>`).join("")}</div></div>
      <div class="stack"><h3>${esc(t("set.shortcuts"))}</h3><dl class="kv"><dt class="mono">Ctrl/⌘ K</dt><dd>${esc(t("set.sc.palette"))}</dd><dt class="mono">Alt N</dt><dd>${esc(t("set.sc.capture"))}</dd><dt class="mono">Esc</dt><dd>${esc(t("set.sc.close"))}</dd></dl></div></div>`;
  } else if (UI.setTab === "models"){
    const steps = ["clarify","understand","interview","assume","require","arch","build","review","fix","check","test","judge","judge2","improve","release","operate","update","item","ask","guide","notes","insights"];
    body = `<p class="lead">${esc(t("set.models.lead2"))}</p>
      <div class="grid3"><label class="fld"><span>${esc(t("model.tier"))}</span>${bindSelect("ws:settings.tier", s.tier || "auto", ["auto","complex","default","quick"].map(x => [x, x === "auto" ? t("tier.auto") : t("tier." + x)]))}</label>
      <label class="fld"><span>${esc(t("model.named"))}</span>${bindSelect("ws:settings.model", s.model || "", [["", t("model.auto")], ...MODELS.map(m => [m.id, m.label])])}</label>
      <label class="fld"><span>${esc(t("model.effort"))}</span>${bindSelect("ws:settings.effort", s.effort || "", [["", t("effort.auto")], ["low", t("effort.low")], ["medium", t("effort.medium")], ["high", t("effort.high")]])}</label></div>
      <p class="hint">${esc(t("model.hint"))}</p>
      <h3>${esc(t("set.perstep"))}</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("set.step"))}</th><th>${esc(t("model.current"))}</th><th></th></tr></thead><tbody>${steps.map(st => `<tr><td>${esc(t("step." + st))}</td><td>${modelChip(st)}</td><td>${(s.stepModel || {})[st] ? btn("model-reset", t("model.usedefault"), {cls:"sm ghost", attrs:`data-step="${st}"`}) : ""}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (UI.setTab === "workspaces"){
    body = `<div class="panel" style="border-color:var(--warn)"><b>${esc(t("ws.honest.t"))}</b><p class="small">${esc(t("ws.honest"))}</p></div>
      <div class="list">${META.workspaces.map(w => `<div class="item"><span class="ws-dot" style="background:${esc(w.color)};margin-top:7px"></span><div class="body"><div class="row"><b>${esc(wsLabel(w.name))}</b>${w.id === WS.id ? chip(t("ws.current"), "acc") : ""}${w.pinHash ? chip(t("ws.haspin"), "ok") : chip(t("ws.nopin"))}</div></div>
        <div class="acts">${w.id !== WS.id ? btn("ws-open", t("ws.open"), {cls:"sm", attrs:`data-id="${w.id}"`}) : ""}${btn("ws-rename", t("ws.rename"), {cls:"sm", attrs:`data-id="${w.id}"`})}${w.id === WS.id ? btn("ws-pin", w.pinHash ? t("ws.changepin") : t("ws.setpin"), {cls:"sm", attrs:`data-id="${w.id}"`}) + (w.pinHash ? btn("ws-unpin", t("ws.removepin"), {cls:"sm ghost", attrs:`data-id="${w.id}"`}) : "") : ""}</div></div>`).join("")}</div>
      <div class="row">${btn("ws-new", t("ws.new"), {icon:"plus", cls:"primary"})}</div><p class="hint">${esc(t("ws.newhint"))}</p>`;
  } else if (UI.setTab === "knowledge"){
    body = knowledgeTab();
  } else if (UI.setTab === "data"){
    body = `<dl class="kv"><dt>${esc(t("data.mode"))}</dt><dd>${esc(Store.mode === "cloud" ? t("data.cloud") : t("data.local"))}</dd></dl>
      <div class="stack"><h3>${esc(t("data.backup"))}</h3><p class="small muted">${esc(t("data.backup.sub"))}</p><div class="row">${btn("export-ws", t("data.export"), {icon:"dl"})}<label class="btn" style="cursor:pointer">${ic("plus")}${esc(t("data.import"))}<input type="file" accept="application/json,.json" data-a-change="import-ws" hidden></label></div></div>
      ${curP() ? `<div class="stack"><h3>${esc(t("data.spec"))}</h3><div class="row">${btn("export-spec", t("data.specdl"), {icon:"dl"})}</div></div>` : ""}`;
  } else {
    body = `<div class="stack lg"><p class="lead">${esc(t("about.p1"))}</p><p class="lead">${esc(t("about.p2"))}</p><p class="lead">${esc(t("about.p3"))}</p>
      <dl class="kv"><dt>${esc(t("op.kp"))}</dt><dd>${esc(kpLabel())}</dd><dt>${esc(t("about.version"))}</dt><dd>${esc(PT_VERSION)}</dd><dt>${esc(t("about.runner"))}</dt><dd class="mono small">${esc(Runner.id())}</dd></dl>
      <div class="row">${btn("whatsnew", t("wn.open"), {icon:"info", cls:"sm"})}${btn("copy-upgrade", t("tfb.upgrade"), {icon:"copy", cls:"sm"})}${btn("runner-check", t("about.runnercheck"), {icon:"play", cls:"sm ghost"})}</div>
      <h3>${esc(t("cl.title"))}</h3>${CHANGELOG.map(c => `<div class="stack"><h4>${esc(c.v)} · ${esc(fmtDay(c.d))}</h4>${changelogHTML(c)}</div>`).join("")}</div>`;
  }
  return `<div class="topbar"><div class="stack" style="gap:2px;flex:1"><span class="crumb">${esc(wsLabel(WS.name))}</span><h1>${esc(t("nav.settings"))}</h1></div></div><div class="tabs" role="tablist">${tabs}</div><section class="panel">${body}</section>`;
}

/* ===================== OVERLAYS ===================== */
let PALETTE_CMDS = () => {
  const c = [
    {k:"nav-cockpit", l:t("nav.cockpit"), run:() => go("cockpit")},
    {k:"nav-notes", l:t("nav.notes"), run:() => go("notes")},
    {k:"nav-library", l:t("nav.library"), run:() => go("library")},
    {k:"nav-insights", l:t("nav.insights"), run:() => go("insights")},
    {k:"nav-settings", l:t("nav.settings"), run:() => go("settings")},
    {k:"new-project", l:t("proj.new"), run:() => newProject()},
    {k:"capture", l:t("nav.capture"), hint:"Alt N", run:() => { UI.capture = true; render(); focusSoon("cap-in"); }},
    {k:"lock", l:t("ws.lock"), run:() => lockNow()}
  ];
  if (curP()){
    PHASES.forEach((ph, i) => c.push({k:"ph-" + ph.id, l:t("pal.phase", {n: i+1, ph: L(ph)}), run:() => setPhase(ph.id)}));
    c.push({k:"log", l:t("log.title"), run:() => setPhase("log")});
    c.push({k:"drawer", l:t("notes.drawer"), run:() => { UI.drawer = !UI.drawer; render(); }});
    c.push({k:"undo", l:t("btn.undo"), run:() => undo()});
  }
  WS.projects.forEach(p => c.push({k:"p-" + p.id, l:t("pal.open", {name: p.name}), run:() => openProject(p.id)}));
  return c;
};
function viewOverlays(){
  let h = "";
  if (UI.palette){
    const q = (UI.palQ || "").toLowerCase();
    const cmds = PALETTE_CMDS().filter(c => !q || c.l.toLowerCase().includes(q)).slice(0, 14);
    UI.palSel = clamp(UI.palSel || 0, 0, Math.max(0, cmds.length - 1));
    h += `<div class="overlay" data-a="close-overlay"><div class="modal palette" role="dialog" aria-label="${esc(t("nav.palette"))}" data-stop="1"><input type="text" id="pal-in" value="${esc(UI.palQ || "")}" placeholder="${esc(t("pal.ph"))}" autocomplete="off"><div class="pal-list">${cmds.map((c, i) => `<button class="pal-item ${i === UI.palSel ? "on" : ""}" data-a="pal-run" data-k="${esc(c.k)}">${esc(c.l)}${c.hint ? `<span class="k">${esc(c.hint)}</span>` : ""}</button>`).join("") || `<p class="small muted" style="padding:10px">${esc(t("pal.none"))}</p>`}</div></div></div>`;
  }
  if (UI.capture){
    const p = curP();
    h += `<div class="overlay" data-a="close-overlay"><form class="capture" data-form="capture" data-stop="1" role="dialog" aria-label="${esc(t("nav.capture"))}"><input type="text" id="cap-in" placeholder="${esc(t("cap.quickph"))}" autocomplete="off"><div class="row small muted"><span style="flex:1">${esc(p ? t("cap.into", {name: p.name}) : t("cap.intopersonal"))}</span><span>Enter ↵ · Esc</span></div></form></div>`;
  }
  if (UI.modal && !(typeof isPageModal === "function" && isPageModal())) h += `<div class="overlay" data-a="close-overlay"><div class="modal ${UI.modal.wide ? "wide" : ""}" role="dialog" aria-modal="true" data-stop="1">${typeof modalRunLine === "function" ? modalRunLine() : ""}${modalBody(UI.modal)}</div></div>`;
  return h;
}
function modalBody(m){
  const close = `<button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}" title="${esc(t("btn.close"))}">${ic("x")}</button>`;
  const hd = title => `<div class="row"><h2 style="flex:1 1 12em">${esc(title)}</h2>${close}</div>`;
  const p = curP();
  switch (m.kind){
    case "ns": return `${hd(t("ns.title"))}<p class="sub">${esc(t("ns.sub"))}</p><form class="stack" data-form="ns">${["problem","goal","success","users","constraints","now"].map(k => `<label class="fld"><span>${esc(t("ns." + k))}</span><textarea id="ns-${k}" rows="2">${esc(p.northStar[k])}</textarea></label>`).join("")}<div class="row end"><button class="btn ghost" type="button" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button>${depCount(p, "ns") ? `<button class="btn" type="submit" data-scope="mark" title="${esc(t("ch.mark.tip"))}">${esc(t("ch.mark", {n: depCount(p, "ns")}))}</button><button class="btn primary" type="submit" data-scope="update" title="${esc(t("ch.update.tip"))}">${ic("check")}${esc(t("ch.update", {n: depCount(p, "ns")}))}</button>` : `<button class="btn primary" type="submit">${ic("check")}${esc(t("btn.save"))}</button>`}</div></form>`;
    case "anchor": {
      const ns = WS.notes.filter(n => !n.deletedAt && n.anchor && n.anchor.itemId === m.item && n.anchor.projectId === p.id);
      return `${hd(t("note.about"))}<p class="small muted">${esc(m.label)}</p>${ns.map(n => noteCard(n, {compact:true})).join("")}<form class="stack" data-form="anchor"><textarea id="an-text" rows="3" placeholder="${esc(t("notes.quickph"))}"></textarea><div class="row end"><button class="btn primary" type="submit">${ic("plus")}${esc(t("notes.add"))}</button></div></form>`;
    }
    case "research": {
      const brief = researchBrief(p, m.topic || "…");
      return `${hd(t("res.title"))}<p class="sub">${esc(t("res.how"))}</p>
        <label class="fld"><span>${esc(t("res.topic"))}</span><input type="text" id="res-topic" value="${esc(m.topic)}" data-res-topic="1"></label>
        <div class="row"><b class="small" style="flex:1">${esc(t("res.step1"))}</b>${btn("res-copy", t("res.copybrief"), {icon:"copy", cls:"sm primary"})}</div>
        <pre class="prompt" style="max-height:180px;border:1px solid var(--line);border-radius:6px;padding:8px;background:var(--bg-2)" id="res-brief">${esc(brief)}</pre>
        <b class="small">${esc(t("res.step2"))}</b>
        <form class="stack" data-form="research"><textarea id="res-paste" rows="6" placeholder="${esc(t("res.pasteph"))}"></textarea>${m.err ? `<p class="small" style="color:var(--crit)">${esc(t("res.parseerr"))}</p>` : ""}<div class="row end"><button class="btn primary" type="submit">${ic("check")}${esc(t("res.readin"))}</button></div></form>`;
    }
    case "model": {
      const o = (WS.settings.stepModel || {})[m.step] || {};
      return `${hd(t("model.for", {s: t("step." + m.step)}))}<p class="sub">${esc(t("model.lead"))}</p>
        <form class="stack" data-form="model" data-step="${m.step}">
          <label class="fld"><span>${esc(t("model.tier"))}</span><select id="m-tier"><option value="">${esc(t("model.usedefault"))}</option>${["complex","default","quick"].map(x => `<option value="${x}" ${o.tier === x ? "selected" : ""}>${esc(t("tier." + x))} — ${esc(t("tier." + x + ".d"))}</option>`).join("")}</select></label>
          <label class="fld"><span>${esc(t("model.named"))}</span><select id="m-model"><option value="">${esc(t("model.auto"))}</option>${MODELS.map(x => `<option value="${x.id}" ${o.model === x.id ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></label>
          <label class="fld"><span>${esc(t("model.effort"))}</span><select id="m-effort"><option value="">${esc(t("effort.auto"))}</option>${["low","medium","high"].map(x => `<option value="${x}" ${o.effort === x ? "selected" : ""}>${esc(t("effort." + x))}</option>`).join("")}</select></label>
          <p class="hint">${esc(t("model.hint"))}</p>
          <div class="row end"><button class="btn ghost" type="button" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" type="submit">${ic("check")}${esc(t("btn.save"))}</button></div></form>`;
    }
    case "diff": {
      const v = m.version;
      if (!v) return `${hd(t("ver.compare"))}<div class="busy"><span class="pulse"></span>${esc(t("boot.loading"))}</div>`;
      const ids = [...new Set([...v.sections.map(s => s.id), ...p.pkg.sections.map(s => s.id)])];
      return `${hd(t("ver.diff", {a: v.no, b: p.versionNo}))}${ids.map(id => { const A = v.sections.find(s => s.id === id), B = p.pkg.sections.find(s => s.id === id); if (A && B && A.content === B.content) return ""; return `<h4>${esc((B || A).title)}</h4><div class="diff">${lineDiff(A ? A.content : "", B ? B.content : "").map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`; }).join("") || `<p class="muted">${esc(t("ver.same"))}</p>`}`;
    }
    case "confirm": return `${hd(m.title)}<p>${esc(m.text)}</p><div class="row end"><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn danger" data-a="confirm-yes">${esc(m.yes || t("btn.delete"))}</button></div>`;
    case "prompt": return `${hd(m.title)}<form class="stack" data-form="prompt"><input type="${m.type || "text"}" id="pr-in" value="${esc(m.value || "")}" placeholder="${esc(m.ph || "")}" ${m.type === "password" ? 'inputmode="numeric" autocomplete="off"' : ""}>${m.help ? `<p class="hint">${esc(m.help)}</p>` : ""}<div class="row end"><button class="btn ghost" type="button" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" type="submit">${ic("check")}${esc(m.yes || t("btn.save"))}</button></div></form>`;
    case "projmenu": return `${hd(t("proj.more"))}<div class="stack">
        ${btn("export-spec", t("data.specdl"), {icon:"dl"})}${btn("export-project", t("proj.exportjson"), {icon:"dl"})}${btn("dup-project", t("proj.duplicate"), {icon:"copy"})}
        ${btn("archive-project", p.status === "archived" ? t("proj.unarchive") : t("proj.archive"), {icon:"inbox"})}${btn("delete-project", t("proj.delete"), {icon:"trash", cls:"danger"})}</div>`;
    case "wsmenu": return `${hd(t("ws.switch"))}<div class="ws-pick">${META.workspaces.map(x => `<button class="ws-opt" data-a="ws-open" data-id="${x.id}"><span class="ws-dot" style="background:${esc(x.color)}"></span><span style="flex:1">${esc(wsLabel(x.name))}</span>${x.id === WS.id ? chip(t("ws.current"), "acc") : ""}${x.pinHash ? ic("lock") : ""}</button>`).join("")}</div><div class="row">${btn("ws-new", t("ws.new"), {icon:"plus", cls:"sm"})}${btn("lock", t("ws.lock"), {icon:"lock", cls:"sm"})}${btn("nav", t("ws.manage"), {icon:"gear", cls:"sm ghost", attrs:'data-v="settings" data-settab="workspaces"'})}</div>`;
    case "skill": {
      const s = m.skill;
      if (!s) return `${hd(t("lib.mkskill"))}${busyHTML("skill") || `<div class="busy"><span class="pulse"></span>${esc(t("lib.skilling"))}</div>`}`;
      return `${hd(t("lib.skillready"))}<dl class="kv"><dt>${esc(t("lib.sname"))}</dt><dd class="mono">${esc(s.name)}</dd><dt>${esc(t("lib.sdesc"))}</dt><dd>${esc(s.description)} ${chip(s.description.length + "/200", s.description.length < 200 ? "ok" : "crit")}</dd></dl><pre class="prompt" style="max-height:300px;border:1px solid var(--line);border-radius:6px;padding:8px">${esc(skillMd(s))}</pre><p class="hint">${esc(t("lib.skillhint"))}</p><div class="row end">${btn("skill-save", t("lib.saveas"), {icon:"star", cls:"sm"})}${btn("skill-copy", t("btn.copy"), {icon:"copy", cls:"sm"})}${btn("skill-zip", t("lib.skillzip"), {icon:"dl", cls:"sm primary"})}</div>`;
    }
    case "history": {
      const n = WS.notes.find(x => x.id === m.id);
      return `${hd(t("notes.history"))}${n.history.map((h, i) => `<div class="panel flat"><div class="row"><span class="small muted" style="flex:1">${esc(fmtDate(h.at))}</span>${btn("note-revert", t("notes.revert"), {cls:"sm", attrs:`data-id="${n.id}" data-i="${i}"`})}</div><div class="small" style="white-space:pre-wrap">${esc(h.text)}</div></div>`).join("")}`;
    }
    case "restore": return restoreModal(p);
    case "whatsnew": return whatsNewModal(m);
    case "plang": return plangModal();
    case "pincode": return pinCodeModal(m);
    case "decisions": return decisionsModal();
    case "review": return reviewModal();
    case "map": return mapModal(p);
    case "toolreport": return toolReportModal(m);
    case "flags": return `${hd(t("flags.title"))}<div class="list">${arr(p.flags).map(f => { const it = itemByRef(p, f.ref); return `<div class="item"><span class="dot warn" style="margin-top:7px"></span><div class="body"><span class="title">${esc(it ? (it.id + " " + it.title) : f.ref)}</span><span class="small muted">${esc(t("flags.because", {x: f.because || "—"}))}</span></div>${it ? btn("goto", t("rd.goto"), {cls:"sm", attrs:`data-ph="${it.ph}" data-ref="${esc(f.ref)}"`}) : ""}</div>`; }).join("") || empty(t("flags.none"))}</div><div class="row end">${aiBtn("update-affected", t("flags.update"), "M", {primary:true, key:"upd-req"})}</div>`;
    case "preview": return `${hd(t("pv.title"))}<p>${esc(t("pv." + m.name, {}) === "pv." + m.name ? t("pv.generic") : t("pv." + m.name))}</p><dl class="kv"><dt>${esc(t("pv.reads"))}</dt><dd>${esc(t("pv.reads.x"))}</dd><dt>${esc(t("pv.changes"))}</dt><dd>${esc(t("pv.changes.x"))}</dd><dt>${esc(t("pv.keeps"))}</dt><dd>${esc(t("pv.keeps.x"))}</dd><dt>${esc(t("pv.cost"))}</dt><dd>${esc(t("cost.h"))} · ${esc(t("usage.chip", {n: usagePct()}))}</dd></dl><label class="chk small"><input type="checkbox" id="pv-skip">${esc(t("pv.skip"))}</label><div class="row end"><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="preview-go">${ic("play")}${esc(t("pv.go"))}</button></div>`;
    case "insert": return `${hd(t("lib.insert"))}<p class="sub">${esc(t("lib.insertsub"))}</p><div class="stack">${WS.projects.map(x => `<button class="ws-opt" data-a="pat-insert-to" data-pid="${x.id}"><span style="flex:1">${esc(x.name)}</span>${arr(x.pkg.sections).length ? chip(t("lib.hasinstr"), "ok") : chip(t("lib.noinstr"))}</button>`).join("") || empty(t("cock.empty"))}</div>`;
  }
  if (MODAL14[m.kind]) return MODAL14[m.kind](m, p, hd);
  return "";
}
function skillMd(s){ return `---\nname: ${s.name}\ndescription: ${s.description}\n---\n\n${s.body}`; }
function focusSoon(id){ setTimeout(() => { const el = document.getElementById(id); if (el) el.focus(); }, 20); }
function go(v){ UI.view = v; UI.modal = null; render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; }
