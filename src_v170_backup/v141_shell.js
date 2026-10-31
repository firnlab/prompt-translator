/* ===================== 1.4.1 THE SCREEN FRAME =====================
   Rail (left) · calm header with the level chip and "More ⋯" · stage bar and one strip · the canvas · ONE right-hand
   inspector (Details · Why · Notes · Activity; Pro adds Diff · History · Trace) that pushes the canvas, never covers it ·
   one status bar at the bottom (running work, saving, usage, keys). Long reviews are pages with a sticky bar.
   Breakpoints: <600 phone · 600–839 small · 840–1199 rail as icons · 1200–1599 · ≥1600. */

/* ---------- 1. the level: Learning · Guided · Pro (workspace, with a per-project override) ---------- */
const LEVELS = ["learn","guided","pro"];
function levelOf(p){ if (p && LEVELS.includes(p.level)) return p.level; const s = WS.settings || {}; return LEVELS.includes(s.help) ? s.help : (s.guided ? "guided" : "pro"); }
function levelChip(p){
  const lv = levelOf(p), own = p && LEVELS.includes(p.level);
  return `<details class="more lvl"><summary class="chip tap lvlchip lv-${lv}" title="${esc(t("lvl.tip"))}" aria-label="${esc(t("lvl.label") + ": " + t("help." + lv))}">${ic(lv === "learn" ? "book" : lv === "guided" ? "route" : "bolt")}<span>${esc(t("help." + lv))}</span>${own ? `<span class="lvlown">${esc(t("lvl.own"))}</span>` : ""} ▾</summary>
    <div class="menu" role="menu"><div class="menu-h small muted">${esc(t("lvl.choose"))}</div>
      ${LEVELS.map(x => `<button class="mi lvlopt ${x === lv ? "on" : ""}" role="menuitemradio" aria-checked="${x === lv}" data-a="level-set" data-v="${x}"><b>${esc(t("help." + x))}</b><span class="small muted">${esc(t("lvl.d." + x))}</span></button>`).join("")}
      ${p ? `<label class="chk small mi-chk"><input type="checkbox" data-a-change="level-own" ${own ? "checked" : ""}>${esc(t("lvl.onlyproj", {x: p.name}))}</label>` : ""}
      <p class="small muted" style="padding:4px 10px 6px;max-width:300px">${esc(t("lvl.nothinglost"))}</p></div></details>`;
}
Object.assign(ACTIONS, {
  "level-set": el => { const v = el.dataset.v; if (!LEVELS.includes(v)) return; const p = UI.view === "project" ? curP() : null;
    if (p && LEVELS.includes(p.level)){ p.level = v; touch(p); }
    else { WS.settings.help = v; WS.settings.guided = v !== "pro"; saveWs(); }
    closeMenus(); render(); toast(t("lvl.now", {x: t("help." + v)}), "ok"); },
  "set-help": el => ACTIONS["level-set"](el)
});
Object.assign(CHANGES, {
  "level-own": el => { const p = curP(); if (!p) return; if (el.checked) p.level = levelOf(null) ; else delete p.level; touch(p); render(); }
});
ACT_NO.add("level-set");

/* ---------- 2. the header: calm, with "More ⋯" (Pro can pin entries to the header) ---------- */
const MORE_ITEMS = [
  {a: "restore-open", icon: "clock", l: "rp.title"},
  {a: "dc-open", icon: "route", l: "dc.btn"},
  {a: "phase", icon: "log", l: "log.title", attrs: 'data-ph="log"'},
  {a: "recap", icon: "spark", l: "recap.end", ai: true},
  {a: "panel", icon: "ask", l: "panel.guide", attrs: 'data-v="why"'},
  {a: "palette", icon: "cmd", l: "nav.palette", key: "⌘K"},
  {a: "keys", icon: "info", l: "keys.title", key: "?"},
  {a: "tool-report", icon: "flag", l: "tr.improve", attrs: 'data-k="header"'},
  {a: "project-menu", icon: "gear", l: "proj.more"}
];
function morePins(){ return arr((WS.settings || {}).pins); }
function moreMenu(p){
  const pro = levelOf(p) === "pro", pins = morePins();
  const item = m => `<div class="mirow"><button class="mi" role="menuitem" data-a="${m.a}" ${m.attrs || ""}>${ic(m.icon)}<span>${esc(t(m.l))}</span>${m.key ? `<kbd>${esc(m.key)}</kbd>` : ""}${m.ai ? `<span class="chip model">${esc(t("cost.m"))}</span>` : ""}</button>${pro ? `<button class="iconbtn sm pinbtn ${pins.includes(m.a + (m.attrs || "")) ? "on" : ""}" data-a="pin-head" data-k="${esc(m.a + (m.attrs || ""))}" aria-pressed="${pins.includes(m.a + (m.attrs || ""))}" title="${esc(t("more.pin"))}" aria-label="${esc(t("more.pin") + ": " + t(m.l))}">${ic("pin")}</button>` : ""}</div>`;
  return `<details class="more hdrmore"><summary class="btn sm" aria-label="${esc(t("more.menu"))}">${esc(t("more.menu"))} ⋯</summary><div class="menu right" role="menu">${MORE_ITEMS.map(item).join("")}</div></details>`;
}
function pinnedHead(p){
  if (levelOf(p) !== "pro") return "";
  return morePins().map(k => MORE_ITEMS.find(m => m.a + (m.attrs || "") === k)).filter(Boolean).map(m => `<button class="btn sm ghost" data-a="${m.a}" ${m.attrs || ""}>${ic(m.icon)}${esc(t(m.l))}</button>`).join("");
}
/** honest progress: how many of the stage checks up to Prove are passed */
function progressChip(p){
  const C = ["goal","options","design","build","prove"].flatMap(s => stageChecks(p, s)), ok = C.filter(c => c.ok).length;
  const ready = copyUnlocked(p);
  return `<button class="chip tap ${ready ? "ok" : "warn"} tnum" data-a="home" title="${esc(t("hdr.checks.tip"))}">${ready ? ic("check") : ""}${esc(t("hdr.checks", {a: ok, b: C.length}))}</button>`;
}
function projectHeader(p){
  return `<div class="topbar">
    <div class="stack" style="gap:2px;flex:1;min-width:220px"><span class="crumb">${esc(wsLabel(WS.name))} › ${esc(t("nav.projects"))}</span>
      <input type="text" class="h1-input" data-bind="p:name" value="${esc(p.name)}" aria-label="${esc(t("proj.name"))}" id="pname"></div>
    <div class="row hdr-r">
      ${p.live ? chip(t("op.livev", {v: p.live.v}), "ok") : ""}
      ${levelChip(p)}${progressChip(p)}${plangChip(p)}
      ${pinnedHead(p)}
      ${ibtn("undo", "undo", t("btn.undo") + " (⌫)")}
      <button class="btn sm ${UI.drawer ? "primary" : ""}" data-a="insp-toggle" aria-pressed="${!!UI.drawer}" title="${esc(t("insp.tip"))}">${ic("layers")}${esc(t("insp.btn"))}</button>
      ${moreMenu(p)}
    </div></div>`;
}
Object.assign(ACTIONS, {
  "pin-head": el => { const k = el.dataset.k; const s = WS.settings; s.pins = arr(s.pins); s.pins = s.pins.includes(k) ? s.pins.filter(x => x !== k) : [...s.pins, k]; saveWs(); render(); },
  "keys": () => { UI.modal = {kind: "keys"}; render(); }
});
ACT_NO.add("pin-head"); ACT_NO.add("keys");

/* ---------- 3. the inspector ---------- */
function inspTabs(p){
  const proj = UI.view === "project" && p;
  const base = proj ? ["details","why","notes","activity"] : ["notes"];
  if (proj && levelOf(p) === "pro") base.push("diff","history","trace");
  return base;
}
function inspTab(p){ const tabs = inspTabs(p); let tb = UI.panelTab === "guide" ? "why" : UI.panelTab; if (UI.pinNotes) tb = "notes"; return tabs.includes(tb) ? tb : tabs.includes("details") && (UI.inspRef || UI.selPart) ? "details" : "notes"; }
/** open the inspector on an item (Notes pinned: the item opens in the canvas instead) */
function inspOpen(ref, tab = "details"){
  UI.inspRef = ref || null;
  if (UI.pinNotes && tab !== "notes"){ const p = curP(); if (p && ref) goRef(ref); return; }
  UI.drawer = true; UI.panelTab = tab; render();
}
function viewInspector(){
  const p = UI.view === "project" ? curP() : null;
  const tabs = inspTabs(p), tab = inspTab(p);
  const tabBtns = tabs.length > 1 ? `<div class="tabs insp-tabs" role="tablist">${tabs.map(x => `<button class="tab ${tab === x ? "on" : ""}" role="tab" aria-selected="${tab === x}" data-a="insp-tab" data-v="${x}">${esc(t("insp.t." + x))}</button>`).join("")}</div>` : "";
  let body = "";
  try{
    if (tab === "notes") body = notesDock();
    else if (tab === "details") body = `<div class="dr-body">${inspDetails(p)}</div>`;
    else if (tab === "why") body = inspWhy(p);
    else if (tab === "activity") body = `<div class="dr-body">${inspActivity(p)}</div>`;
    else if (tab === "diff") body = `<div class="dr-body">${inspDiff(p)}</div>`;
    else if (tab === "history") body = `<div class="dr-body">${inspHistory(p)}</div>`;
    else if (tab === "trace") body = `<div class="dr-body">${inspTrace(p)}</div>`;
  }catch(e){ onAppError(e && e.message, "inspector"); body = `<div class="dr-body"><p class="small muted">${esc(t("insp.err"))}</p></div>`; }
  return `<aside class="drawer insp" aria-label="${esc(t("insp.label"))}"><div class="dock-grip" data-grip="1" title="${esc(t("dock.resize"))}" aria-hidden="true"></div>
    <div class="dr-h"><h3>${esc(t("insp.label"))}</h3>${p ? `<button class="iconbtn sm ${UI.pinNotes ? "on" : ""}" data-a="insp-pin" aria-pressed="${!!UI.pinNotes}" title="${esc(t("insp.pinnotes"))}" aria-label="${esc(t("insp.pinnotes"))}">${ic("pin")}</button>` : ""}${ibtn("insp-toggle", "x", t("btn.close"))}</div>${tabBtns}${body}</aside>`;
}
function inspRefNow(p){ const r = UI.inspRef; if (!r || !p) return null;
  // every item the queue can point to can be shown here: list items, criteria, concerns, open questions, gates
  const ok = itemExists(p, r) || /^(ns|arch:choice|intake:|und:)/.test(r) || (r.startsWith("fs:") && activeForesight(p).some(f => f.id === r.slice(3))) || (typeof itemByRef === "function" && !!itemByRef(p, r)) || queueOf(p).some(x => x.ref === r);
  return ok ? r : null; }
function inspPick(p){
  const q = queueOf(p).filter(x => x.ph === p.focus.ph && /:/.test(x.ref)).slice(0, 8);
  return `<p class="small muted">${esc(t("insp.pick"))}</p>${q.length ? `<div class="list">${q.map(x => `<button class="item linkish" data-a="insp-open" data-ref="${esc(x.ref)}">${stSlot(x.cls === "block" ? "bad" : x.cls === "check" ? "as" : "warn")}<span class="body">${clampHTML(x.title, "ip:" + x.key, {lines: 2})}</span></button>`).join("")}</div>` : ""}`;
}
function inspDetails(p){
  if (!p) return "";
  if (UI.selPart) return partPanel(p, UI.selPart);
  const ref = inspRefNow(p); if (!ref) return inspPick(p);
  const it = itemByRef(p, ref), o = itemObj(p, ref) || {};
  const title = it ? it.title : refLabel(p, ref, true);
  const body = it && it.g ? `<div class="gwt"><b>${esc(t("req.given"))}</b><span>${esc(it.g)}</span><b>${esc(t("req.when"))}</b><span>${esc(it.w)}</span><b>${esc(t("req.then"))}</b><span>${esc(it.th)}</span></div>`
    : it && it.body ? `<div class="small prew">${esc(it.body)}</div>` : ref.startsWith("crit:") && o.unclear ? `<p class="small warn-t">${esc(o.unclear)}</p>` : "";
  if (ref.startsWith("ex:")){ const e = exById(p, ref.slice(3)); if (e) return `<div class="stack">${exCard(p, e, {reveal: true, keys: false})}<div class="row">${exCrits(p, e.id).map(c => `<button class="chip tap" data-a="insp-open" data-ref="crit:${esc(c)}">${esc(c)}</button>`).join("")}<button class="btn xs ghost" data-a="goto-ref" data-ref="exboard">${ic("arrow")}${esc(t("ex.board"))}</button></div></div>`; }
  const uses = usesOf(p, ref), deps = depsOf(p, ref);
  const critEx = ref.startsWith("crit:") ? (() => { const c = critById(p, ref.slice(5)); if (!c) return ""; const ids = [...new Set([...arr(c.exIds), ...arr(c.checked), ...arr(c.missed)])]; const es = ids.map(id => exById(p, id)).filter(Boolean);
    return `<div class="stack" style="gap:6px"><div class="row"><b class="small" style="flex:1">${esc(t("insp.examples", {n: es.length}))} · ${esc(t("crit.checked", {n: critChecked(c)}))}</b>${addExampleBtn()}</div>${es.length ? `<div class="list">${es.map(e => `<button class="item linkish" data-a="insp-open" data-ref="ex:${esc(e.id)}"><span class="iid mono">${esc(e.id)}</span><span class="body small">${clampHTML(exTitle(e), "ie:" + e.id, {lines: 2})}</span>${e.verdict ? chip(t(e.verdict === "good" ? "vd.good" : e.verdict === "bad" ? "vd.bad" : "ex.unsure"), e.verdict === "good" ? "ok" : e.verdict === "bad" ? "crit" : "") : ""}${arr(c.checked).includes(e.id) ? chip(t("insp.checkedhere"), "ok") : arr(c.missed).includes(e.id) ? chip(t("insp.missedhere"), "warn") : ""}</button>`).join("")}</div>` : `<p class="small muted">${esc(t("insp.noexamples"))}</p>`}</div>`; })() : "";
  return `<div class="stack">
    <div class="row" style="gap:6px">${it ? stSlot(it.st) : ""}<span class="iid mono">${esc(it ? it.id : ref)}</span>${markChip(p, ref)}</div>
    <h3 class="insp-title">${esc(title)}</h3>${body}
    <div class="row">${it && it.st === "as" ? quickPrimary(it) : ""}${["intake","nsdraft","pq","choice"].includes(it && it.kind) ? "" : itemTools(ref)}<button class="btn xs ghost" data-a="goto-ref" data-ref="${esc(ref)}">${ic("arrow")}${esc(t("insp.showin", {s: it ? phName(it.ph) : ""}))}</button></div>${itemBox(ref, "insp")}
    ${critEx}
    ${uses.length ? `<div class="stack" style="gap:4px"><span class="small muted">${esc(t("insp.uses"))}</span><div class="row" style="gap:4px">${uses.slice(0, 12).map(r => `<button class="chip tap" data-a="insp-open" data-ref="${esc(r)}">${esc(refLabel(p, r, true))}</button>`).join("")}</div></div>` : ""}
    ${deps.length ? `<div class="stack" style="gap:4px"><span class="small muted">${esc(t("insp.usedby", {n: deps.length}))}</span><div class="row" style="gap:4px">${deps.slice(0, 16).map(d => `<button class="chip tap" data-a="insp-open" data-ref="${esc(d.ref)}" title="${esc(d.why)}">${esc(refLabel(p, d.ref, true))}</button>`).join("")}</div></div>` : ""}
  </div>`;
}
/** Why: who decided this and why (with Undo), what it is built on; without an item: what this screen is for, and Ask PT */
function inspWhy(p){
  if (!p) return `<div class="dr-body"></div>`;
  const ref = inspRefNow(p);
  if (ref){
    const mk = markOf(p, ref) || null, a = mk && mk.act ? arr(p.acts).find(x => x.id === mk.act) : null;
    const es = a ? arr(a.patch).filter(e => entryRef(e) === ref) : [];
    const txt = v => v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join("\n") : (ITEM_FIELDS[itemKindOf(ref)] || Object.keys(v)).map(f => v[f] != null ? fieldLabel(f) + ": " + (Array.isArray(v[f]) ? v[f].join(" | ") : str(v[f])) : "").filter(Boolean).join("\n");
    const diff = es.map(e => `<div class="diff">${lineDiff(txt(e.before), txt(e.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("");
    return `<div class="dr-body"><div class="stack">
      <b>${esc(refLabel(p, ref, true))}</b>
      ${mk ? `<p class="small">${esc(mk.by === "pt" ? t("mk.pt." + mk.w) : t("mk." + mk.w))} · ${esc(fmtDate(mk.at))}</p>${mk.why ? `<p class="small"><b>${esc(t("mk.why"))}:</b> ${esc(mk.why)}</p>` : ""}` : `<p class="small muted">${esc(t("insp.nomark"))}</p>`}
      ${diff}
      <div class="row">${a && !a.undone ? btn("mark-undo", t("mk.undo"), {icon: "undo", cls: "sm", attrs: `data-act="${esc(a.id)}"`}) : a && a.undone ? `<span class="small muted">${esc(t("mk.undone"))}</span>` : ""}${ptVersionOf(p, ref) ? btn("mark-revert", t("mk.revert"), {icon: "undo", cls: "sm ghost", attrs: `data-ref="${esc(ref)}"`}) : ""}</div>
      <div class="row"><button class="btn sm" data-a="item-why" data-ref="${esc(ref)}">${ic("ask")}${esc(t("more.why"))}</button></div>${itemBox(ref, "insp")}
    </div></div>`;
  }
  const hist = arr(p.guide).slice(-8), ph = p.focus.ph;
  return `<div class="dr-body stack">
      <div class="panel flat stack" style="gap:6px"><b>${esc(t("guide.screen", {x: phName(UI.phase === "log" ? ph : UI.phase || ph)}))}</b><p class="small">${esc(t("help." + ph))}</p>
      <div class="small">${blockingItems(p).slice(0, 4).map(x => `<div>• ${esc(x.title)}</div>`).join("") || esc(t("guide.allgood"))}</div></div>
      ${hist.map(g => `<div class="gq"><div class="small muted">${esc(g.q)}</div><div class="note-md">${mdLite(g.answer)}</div>${arr(g.actions).length ? `<div class="row">${g.actions.map(a => `<button class="btn sm" data-a="guide-act" data-id="${esc(a.id)}">${esc(a.label || a.id)}</button>`).join("")}</div>` : ""}</div>`).join("")}
      ${busyHTML("guide")}
    </div>
    <form class="stack" data-form="guide" style="padding:12px 14px;border-top:1px solid var(--line)"><textarea id="guide-in" rows="3" placeholder="${esc(t("guide.ph"))}"></textarea><div class="row end"><button class="btn sm primary" type="submit">${ic("ask")}${esc(t("ask.send"))}</button></div></form>`;
}
/** three levels of Undo: this change · this run (Finish) · the whole project (restore points) */
function inspActivity(p){
  if (!p) return "";
  actClose(p.id);
  const ref = inspRefNow(p);
  const acts = arr(p.acts).slice().reverse().filter(a => !ref || arr(a.refs).includes(ref)).slice(0, 25);
  const fin = UI.finish && UI.finish.pid === p.id && UI.finish.startAt ? UI.finish : null;
  return `<div class="stack">
    <p class="small muted">${esc(ref ? t("insp.act.item", {x: refLabel(p, ref, true)}) : t("insp.act.all"))}${ref ? ` <button class="btn xs ghost" data-a="insp-clear">${esc(t("insp.act.showall"))}</button>` : ""}</p>
    ${acts.length ? `<div class="list">${acts.map(a => `<div class="item"><div class="body"><span class="small ${a.undone ? "muted" : ""}" style="${a.undone ? "text-decoration:line-through" : ""}">${esc(a.label)}</span><span class="small muted">${esc(fmtDate(a.at))} · ${esc(a.by === "pt" ? t("insp.bypt") : t("insp.byyou"))}${a.refs && a.refs.length ? " · " + esc(a.refs.slice(0, 3).join(", ")) + (a.refs.length > 3 ? " …" : "") : ""}</span></div>${!a.undone && !a.undoOf ? `<button class="btn xs" data-a="act-undo" data-id="${esc(a.id)}">${ic("undo")}${esc(t("btn.undo"))}</button>` : ""}</div>`).join("")}</div>` : `<p class="small muted">${esc(t("insp.act.none"))}</p>`}
    <div class="stack" style="gap:6px;border-top:1px solid var(--line);padding-top:10px"><b class="small">${esc(t("insp.undo3"))}</b>
      <div class="row">${fin ? `<button class="btn sm" data-a="finish-undoall">${ic("undo")}${esc(t("fin.undoall"))}</button>` : ""}<button class="btn sm ghost" data-a="restore-open">${ic("clock")}${esc(t("rp.title"))}</button></div>
      <p class="small muted">${esc(t("insp.undo3.sub"))}</p></div>
  </div>`;
}
function inspDiff(p){
  const ref = inspRefNow(p); if (!ref) return inspPick(p);
  const a = arr(p.acts).slice().reverse().find(x => arr(x.patch).some(e => entryRef(e) === ref));
  if (!a) return `<p class="small muted">${esc(t("insp.nodiff"))}</p>`;
  const txt = v => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 1);
  return `<p class="small"><b>${esc(a.label)}</b> · ${esc(fmtDate(a.at))}</p>${arr(a.patch).filter(e => entryRef(e) === ref).map(e => `<div class="diff">${lineDiff(txt(e.before), txt(e.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("")}`;
}
function inspHistory(p){
  const ref = inspRefNow(p); if (!ref) return inspPick(p);
  const c = ref.startsWith("crit:") ? critById(p, ref.slice(5)) : null;
  const vers = c ? arr(c.hist).slice().reverse() : [];
  const acts = arr(p.acts).filter(a => arr(a.refs).includes(ref)).slice().reverse();
  return `${c ? `<h4>${esc(t("insp.versions", {n: num(c.v, 1)}))}</h4><div class="list"><div class="item"><span class="chip acc">v${num(c.v, 1)}</span><div class="body small">${esc(critLine(c))}</div></div>${vers.map(h => `<div class="item"><span class="chip">v${h.v}</span><div class="body small"><span>${esc(t("crit.line", {w: critClean(h.when, "when"), r: critClean(h.then, "then")}))}</span><span class="muted">${esc(fmtDate(h.at))} · ${esc(h.by === "pt" ? t("insp.bypt") : t("insp.byyou"))}${h.why ? " · " + esc(h.why) : ""}</span></div></div>`).join("")}</div>` : ""}
    <h4>${esc(t("insp.changes"))}</h4>${acts.length ? `<div class="list">${acts.map(a => `<div class="item"><div class="body small"><span>${esc(a.label)}</span><span class="muted">${esc(fmtDate(a.at))}${a.undone ? " · " + esc(t("mk.undone")) : ""}</span></div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("insp.act.none"))}</p>`}`;
}
function inspTrace(p){
  const ref = inspRefNow(p); if (!ref) return inspPick(p);
  const up = usesOf(p, ref), down = depsOf(p, ref);
  const row = (r, why) => `<button class="item linkish" data-a="insp-open" data-ref="${esc(r)}"><span class="iid mono">${esc(r)}</span><span class="body small">${clampHTML(refLabel(p, r, true), "ia:" + r, {lines: 2})}${why ? `<span class="muted"> · ${esc(why)}</span>` : ""}</span></button>`;
  return `<h4>${esc(t("insp.uses"))}</h4>${up.length ? `<div class="list">${up.map(r => row(r, "")).join("")}</div>` : `<p class="small muted">—</p>`}<h4>${esc(t("insp.usedby", {n: down.length}))}</h4>${down.length ? `<div class="list">${down.map(d => row(d.ref, d.why)).join("")}</div>` : `<p class="small muted">—</p>`}`;
}
Object.assign(ACTIONS, {
  "insp-toggle": () => { UI.drawer = !UI.drawer; if (UI.drawer && !UI.panelTab) UI.panelTab = UI.inspRef ? "details" : "notes"; dockSave(); render(); },
  "insp-tab": el => { UI.panelTab = el.dataset.v; if (UI.pinNotes && el.dataset.v !== "notes") UI.pinNotes = false; render(); if (el.dataset.v === "why" && !UI.inspRef) focusSoon("guide-in"); },
  "insp-open": el => inspOpen(el.dataset.ref, "details"),
  "insp-clear": () => { UI.inspRef = null; render(); },
  "insp-pin": () => { UI.pinNotes = !UI.pinNotes; if (UI.pinNotes) UI.panelTab = "notes"; Store.lsSet("pinNotes", UI.pinNotes ? 1 : 0); render(); },
  "act-undo": el => { const p = curP(); if (p) undoAct(p, el.dataset.id); },
  "mark-show": el => { const ref = el.dataset.ref; UI.inspRef = ref; UI.drawer = true; UI.panelTab = UI.pinNotes ? "notes" : "why"; if (UI.pinNotes){ UI.modal = {kind: "mark", ref}; } render(); },
  "mark-revert": el => { const p = curP(); const ref = el.dataset.ref; const v = ptVersionOf(p, ref); if (!v) return;
    actOpen(p, t("mk.revert") + " · " + refLabel(p, ref, true));
    for (const e of v.es){ if (e.whole){ setAt(p, e.path, e.after == null ? null : clone(e.after)); continue; } const list = getAt(p, e.path); if (!Array.isArray(list)) continue; const key = listKey(e.path), i = list.findIndex(x => x && String(x[key]) === String(e.id)); if (i >= 0 && e.after) list[i] = clone(e.after); }
    markPT(p, ref, v.m.w, v.m.why); actClose(p.id); touch(p); render(); toastUndo(t("mk.reverted")); }
});
["insp-toggle","insp-tab","insp-open","insp-clear","insp-pin","mark-show"].forEach(a => ACT_NO.add(a));
{ const orig = ACTIONS["panel"]; ACTIONS["panel"] = (el, e) => { const v = el.dataset.v === "guide" ? "why" : el.dataset.v; if (v === "why") UI.inspRef = null; orig({dataset: {v}}, e); }; }
/** PT's version of an item you changed later: the "↶" next to the mark brings it back */
function ptVersionOf(p, ref){
  const m = markOf(p, ref); if (!p || !m || (m.by || "you") !== "you" || !m.prev || m.prev.by !== "pt" || !m.prev.act) return null;
  const a = arr(p.acts).find(x => x.id === m.prev.act && !x.undone); if (!a) return null;
  const es = arr(a.patch).filter(e => entryRef(e) === ref && e.after != null); if (!es.length) return null;
  return {es, m: m.prev};
}

/** a selected map part: in the inspector; with Notes pinned it opens in the canvas below the map */
function partInline(p){ return UI.selPart && (UI.pinNotes || !UI.drawer) ? partPanel(p, UI.selPart) : ""; }
{ const orig = ACTIONS["selpart"]; ACTIONS["selpart"] = (el, e) => { orig(el, e); if (UI.selPart && !UI.pinNotes){ UI.drawer = true; UI.panelTab = "details"; UI.inspRef = null; render(); } }; }
/* ---------- 4. the status bar: running work, saving, usage, keys (it never covers a dialog) ---------- */
function statusBar(){
  const run = [...AI.running.entries()], done = TRAY.done.filter(d => !AI.running.has(d.key));
  const pname = pid => pid && pid !== "ws" && pid !== UI.pid ? (WS.projects.find(x => x.id === pid) || {}).name || "" : "";
  const rows = run.slice(0, 2).map(([k, j]) => `<div class="sbjob" role="status"><span class="pulse"></span><b class="tl">${esc(j.label)}</b>${pname(j.pid) ? `<span class="chip">${esc(pname(j.pid))}</span>` : ""}<span class="tstream" data-stream="${esc(k)}">${esc(j.text ? j.text.replace(/\s+/g, " ").slice(-220) : t("ai.thinking"))}</span><button class="btn xs" data-a="ai-stop" data-key="${esc(k)}">${esc(t("sb.stop"))}</button></div>`).join("")
    + (run.length > 2 ? `<span class="small muted">${esc(t("tray.more", {n: run.length - 2}))}</span>` : "")
    + done.slice(-2).map(d => `<div class="sbjob done">${stSlot("ok")}<span class="tl">${esc(t("tray.done", {x: d.label}))}</span>${pname(d.pid) ? `<span class="chip">${esc(pname(d.pid))}</span>` : ""}${d.ph && d.pid && d.pid !== "ws" ? `<button class="btn xs primary" data-a="tray-show" data-pid="${esc(d.pid)}" data-ph="${esc(d.ph)}">${esc(t("tray.show"))}</button>` : ""}<button class="iconbtn sm" data-a="tray-close" data-key="${esc(d.key)}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>`).join("");
  const u = usagePct(), p = UI.view === "project" ? curP() : null, pro = levelOf(p) === "pro";
  const w = (WS.settings || {}).usage || {}, units = w.week === weekKey() ? Math.round(num(w.units, 0)) : 0;
  return `<footer class="sbar" aria-label="${esc(t("sb.label"))}">
    <div class="sb-jobs" aria-live="polite">${rows || `<span class="small muted">${esc(t("sb.idle"))}</span>`}</div>
    <span id="savestate" class="small muted"></span>
    <button class="sb-usage ${u >= num((WS.settings || {}).warnAt, 70) ? "warn" : ""}" data-a="nav" data-v="settings" title="${esc(t("usage.tip"))}">${esc(pro ? t("sb.usagepro", {n: u, u: units}) : t("usage.chip", {n: u}))}</button>
    <button class="iconbtn sm" data-a="keys" title="${esc(t("keys.title"))} (?)" aria-label="${esc(t("keys.title"))}">?</button>
    ${phoneNav()}
  </footer>`;
}
/** phones: the main places as a bottom bar */
function phoneNav(){
  const p = UI.view === "project" ? curP() : null;
  const b = (a, icon, label, attrs = "", on = false) => `<button class="pnav ${on ? "on" : ""}" data-a="${a}" ${attrs}>${ic(icon)}<span>${esc(label)}</span></button>`;
  return `<nav class="pnavbar" aria-label="${esc(t("nav.main"))}">${p ? b("home", "home", t("home.title"), "", UI.home) + b("stage", "route", t("pn.step"), `data-v="${stageOf(p.focus.ph)}"`, !UI.home) : b("nav", "home", t("nav.cockpit"), 'data-v="cockpit"', UI.view === "cockpit")}${b("insp-toggle", "layers", t("insp.btn"), "", !!UI.drawer)}${b("palette", "cmd", t("pn.more"))}</nav>`;
}
/* a dialog shows what is running in its own header (the status bar stays behind it) */
function modalRunLine(){
  const run = [...AI.running.values()]; if (!run.length) return "";
  return `<div class="mrun small" role="status"><span class="pulse"></span>${esc(t("run.now", {x: run[0].label, n: run.length}))}</div>`;
}

/* ---------- 5. long reviews are pages (sticky bar, tick all/none per group, counter) ---------- */
const PAGE_KINDS = new Set(["review","batch","runreview"]);
function isPageModal(m = UI.modal){ return !!(m && PAGE_KINDS.has(m.kind) && UI.view === "project"); }
Object.assign(ACTIONS, {
  "rv-tickgrp": el => { const p = curP(), r = UI.review; if (!p || !r) return; const on = el.dataset.on === "1"; for (const x of r.items){ const it = itemByRef(p, x.ref); if ((it ? it.ph : "capture") === el.dataset.ph) x.on = on; } render(); }
});
ACT_NO.add("rv-tickgrp"); ACT_NO.add("batch-preview"); ACT_NO.add("batch-back");
function pageView(p){
  return `<section class="rpage" data-anchor="page" aria-label="${esc(t("pg.label"))}">${modalBody(UI.modal)}</section>`;
}
/* leaving the page (another step, the overview, another project) closes it; the "update affected" rule then marks the rest */
for (const a of ["goto","stage","home","open-project","nav","goto-ref","q-goto","finish-open","tray-show","phase"]){
  const orig = ACTIONS[a]; if (!orig) continue;
  ACTIONS[a] = (el, e) => { if (isPageModal() && !(a === "q-goto" && UI.modal.kind === "batch")) UI.modal = null; return orig(el, e); };
}

/* ---------- 6. one key map for the whole of PT (never while typing) ---------- */
/** screens with their own current item add a key handler here (the examples loop, design options …) */
const KEY_HOOKS = [];
const KEYMAP = [["Enter","keys.enter"],["Y","keys.y"],["N","keys.n"],["B","keys.b"],["1–9","keys.num"],["A","keys.a"],["L","keys.l"],["W","keys.w"],["J / K","keys.jk"],["⌫","keys.bs"],["⌘K","keys.k"],["?","keys.q"],["Esc","keys.esc"]];
MODAL14.keys = (m, p, hd) => `${hd(t("keys.title"))}<p class="sub">${esc(t("keys.sub"))}</p><div class="keygrid">${KEYMAP.map(([k, l]) => `<kbd>${esc(k)}</kbd><span>${esc(t(l))}</span>`).join("")}</div>`;
function typingNow(){ const a = document.activeElement; return !!(a && a.matches && a.matches("input,textarea,select,[contenteditable],[contenteditable] *")); }
document.addEventListener("keydown", e => {
  if (e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!UI.unlocked || typingNow()) return;
  // "?" never replaces another dialog or page (a recovery code shown once, a review page)
  if (e.key === "?" ){ if ((UI.modal && UI.modal.kind !== "keys") || UI.palette || UI.capture) return; e.preventDefault(); UI.modal = UI.modal ? null : {kind: "keys"}; render(); return; }
  if (UI.modal || UI.palette || UI.capture) return;   // pages (review, batch, run review) and dialogs: no global keys, no Backspace undo
  const p = UI.view === "project" ? curP() : null; if (!p) return;
  // the examples loop and other screens with one current item handle their own keys first
  for (const h of KEY_HOOKS){ try{ if (h(e, p)) return; }catch(err){} }
  if (e.key === "Backspace"){ e.preventDefault(); undo(); return; }
  const k = e.key.toLowerCase();
  if ((k === "j" || k === "k") && UI.finish && UI.finish.step === "decide"){ e.preventDefault(); ACTIONS["fin-nav"]({dataset: {d: k === "j" ? "1" : "-1"}}); return; }
  if ((k === "j" || k === "k") && UI.home && !UI.finish){ e.preventDefault(); const rows = [...document.querySelectorAll(".qrow .qtitle")]; if (!rows.length) return; const i = rows.indexOf(document.activeElement); const n = clamp(i + (k === "j" ? 1 : -1), 0, rows.length - 1); rows[i < 0 ? 0 : n].focus(); return; }
  if (k === "a" && typeof addExampleOpen === "function" && document.querySelector("[data-a=ex-addpanel]")){ e.preventDefault(); addExampleOpen(); return; }
});

/* ---------- 7. after each render ---------- */
/* the bottom sheet / full-screen panel ends exactly at the status bar, whatever its height (one line, jobs row, phone nav) */
function sbarMeasure(){ const b = document.querySelector(".sbar"); const h = b ? Math.ceil(b.getBoundingClientRect().height) : 0; if (h) document.documentElement.style.setProperty("--sbarH", h + "px"); }
{ let ro = null; try{ ro = new ResizeObserver(() => sbarMeasure()); }catch(e){} window.__sbarRO = ro; window.addEventListener("resize", () => sbarMeasure()); }
function shellAfterRender(){
  try{ sbarMeasure(); const b = document.querySelector(".sbar"); if (window.__sbarRO && b && b !== window.__sbarEl){ window.__sbarRO.disconnect(); window.__sbarRO.observe(b); window.__sbarEl = b; } }catch(e){}
  document.body.classList.toggle("lv-pro", levelOf(UI.view === "project" ? curP() : null) === "pro");
  // a menu closes after its choice; only one menu is open at a time
  pageSeenObserve();
}
/* the review page counts what you have looked at ("viewed 4 of 12"); a changed list starts again */
let SEEN_OBS = null;
function pageSeenObserve(){
  const m = UI.modal; if (!m || !isPageModal(m)) { if (SEEN_OBS){ SEEN_OBS.disconnect(); SEEN_OBS = null; } return; }
  m.seen = m.seen || {}; if (SEEN_OBS) SEEN_OBS.disconnect();
  SEEN_OBS = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting && en.intersectionRatio >= 0.6){ const k = en.target.dataset.seen; if (k && !m.seen[k]){ m.seen[k] = 1; const c = document.getElementById("seen-count"); if (c) c.textContent = t("pg.seen", {a: Object.keys(m.seen).length, b: num(c.dataset.n, 0)}); } } }, {threshold: [0.6]});
  for (const el of document.querySelectorAll(".rpage [data-seen]")) SEEN_OBS.observe(el);
}
/* the inspector remembers whether Notes is pinned */
try{ UI.pinNotes = !!Store.lsGet("pinNotes"); }catch(e){}
