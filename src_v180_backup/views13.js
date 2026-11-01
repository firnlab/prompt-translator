/* ===================== 1.3 VIEWS ===================== */
/* ---------- project content language ---------- */
function plangChip(p){ return `<button class="chip tap" data-a="proj-lang" title="${esc(t("plang.tip"))}" lang="${esc(p.lang)}">${ic("globe")}${esc(t("plang.chip", {l: langLabel(p.lang)}))}</button>`; }
function plangModal(){
  const p = curP(); if (!p) return "";
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(t("plang.title"))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="sub">${esc(t("plang.sub"))}</p>
    <div class="seg" role="group" aria-label="${esc(t("plang.title"))}">${LANGS.map(l => `<button class="${p.lang === l.id ? "on" : ""}" data-a="plang-set" data-l="${l.id}" lang="${l.id === "zh" ? "zh-CN" : l.id}">${esc(l.label)}</button>`).join("")}</div>
    <p class="hint">${esc(t("plang.note"))}</p>`;
}
/** when the reader's screen language differs from the project's language: a labelled, read-only translation of the current step */
function trBar(p){
  if (!p || p.lang === LANG) return "";
  const ph = p.focus.ph, on = !!UI.trOn;
  const its = on && !SPECIAL.includes(ph) ? itemsOf(p, ph) : [];
  const missing = its.filter(it => !trOf(p, it)).length;
  const head = `<div class="trbar row"><span>${ic("globe")} ${esc(t("tr.banner", {l: langLabel(p.lang)}))}</span>${btn("tr-toggle", on ? t("tr.hide") : t("tr.show", {l: langLabel(LANG)}), {cls: "sm"})}${on && missing ? aiBtn("tr-step", t("tr.do"), "L", {key: "translate"}) : ""}</div>`;
  if (!on) return head;
  const done = its.map(it => ({it, tr: trOf(p, it)})).filter(x => x.tr);
  return head + busyHTML("translate") + (done.length ? `<section class="panel trpanel" lang="${LANG === "zh" ? "zh-CN" : LANG}"><p class="small muted">${esc(t("tr.note", {l: langLabel(p.lang)}))}</p>
    <div class="list">${done.map(({it, tr}) => `<div class="item"><span class="iid mono">${esc(it.id)}</span><div class="body"><b>${esc(tr.title)}</b>${tr.body ? `<div class="small" style="white-space:pre-wrap">${esc(tr.body)}</div>` : ""}</div><span class="chip">${esc(t("tr.tag"))}</span></div>`).join("")}</div></section>` : "");
}

/* ---------- 1.3 item actions: the recommended one-click action · Edit · Refine… · More ----------
   Edit    = you change the text yourself; no AI, nothing else changes.
   Refine… = you tell PT what to change; PT proposes, you keep what is right (tick parts on/off, edit them) and refine again.
   More    = Ask why it's here · Research it · Won't fix / accept (with a reason) · Remove (with Undo).
   The one-click action (Confirm, Apply PT's fix, Mark validated, Suggest a mitigation) sits in front where the item has one. */
const ITEM_LIST = {req: "requirements", assumption: "assumptions", risk: "risks", test: "tests"};
function refSpec(ref, f){
  const [k, id] = ref.split(":");
  const base = {qa: "qa", req: "requirements", assumption: "assumptions", risk: "risks", test: "tests", section: "pkg.sections", component: "arch.components", finding: "findings"}[k];
  if (base) return `p:${base}.#${id}.${f}`;
  if (k === "ns") return `p:northStar.${f}`;
  if (k === "intake") return `p:intake.${id === "clean" ? "clean" : "raw"}`;
  if (k === "arch") return "p:arch.why";
  if (k === "und"){ const m = {root: "rootNeed", jtbd: "jtbd", walk: "walkthrough"}[id]; return m ? "p:understand." + m : null; }
  return null;
}
function fieldLabel(f){ const k = "fld." + f; const v = t(k); return v === k ? f : v; }
function editSpecs(p, ref){
  const k = itemKindOf(ref), o = itemObj(p, ref); if (!o) return [];
  return (ITEM_FIELDS[k] || []).filter(f => !["criteria", "priority"].includes(f)).map(f => ({f, spec: refSpec(ref, f), value: k === "und" ? str(o.text) : str(o[f])})).filter(x => x.spec);
}
function wontFixBtn(ref){
  const [k, id] = ref.split(":");
  const o = curP() ? itemObj(curP(), ref) : null; if (!o) return "";
  // only while it still applies: an open finding, an assumption not yet checked or accepted, a risk not yet accepted
  if (k === "finding" && o.status !== "open") return "";
  if (k === "assumption" && ["validated", "invalid", "accepted"].includes(o.status)) return "";
  if (k === "risk" && o.status === "accepted") return "";
  const a = {finding: ["finding-accept", "more.wontfix"], assumption: ["as-accept", "more.acceptas"], risk: ["risk-accept", "more.acceptrisk"]}[k];
  return a ? `<button class="mi" data-a="${a[0]}" data-id="${esc(id)}">${esc(t(a[1]))}</button>` : "";
}
function itemTools(ref, {more = [], edit = true, primary = ""} = {}){
  const p = curP(); if (!p) return "";
  const k = ref.split(":")[0], ed = edit && editSpecs(p, ref).length, open = UI.editRef === ref;
  const extra = more.map(m => `<button class="mi" data-a="${esc(m.a)}" ${m.attrs || ""}>${esc(m.label)}</button>`).join("");
  return `<span class="itools">${primary}${ed ? `<button class="btn xs ${open ? "primary" : "ghost"}" data-a="item-edit" data-ref="${esc(ref)}" title="${esc(t("it.tip.edit"))}">${ic("edit")}${esc(t("it.edit"))}</button>` : ""}<button class="btn xs ghost" data-a="item-tool" data-ref="${esc(ref)}" data-k="refine" title="${esc(t("it.tip.refine"))}">${ic("spark")}${esc(t("it.refine"))}</button><details class="more"><summary class="btn xs ghost" title="${esc(t("more.tip"))}">${esc(t("more.label"))} ▾</summary><div class="menu" role="menu">${extra}<button class="mi" data-a="item-why" data-ref="${esc(ref)}">${esc(t("more.why"))}</button><button class="mi" data-a="item-research" data-ref="${esc(ref)}">${esc(t("more.research"))}</button>${wontFixBtn(ref)}${ITEM_LIST[k] ? `<button class="mi danger" data-a="item-remove" data-ref="${esc(ref)}">${esc(t("more.remove"))}</button>` : ""}</div></details></span>`;
}
/** where the edit / ask / refine box of an item shows: in the inspector when it was opened there (and the inspector shows that item), else in the list.
    It is never on the screen twice, so there is only one text field to type into and read from. */
function boxHostNow(ref){ const inInsp = UI.drawer && UI.inspRef === ref && (UI.panelTab || "details") !== "notes" && !UI.pinNotes; return UI.boxHost === "insp" && inInsp ? "insp" : "main"; }
function itemBox(ref, host = "main"){
  const p = curP();
  if ((UI.editRef === ref || (UI.itemBox && UI.itemBox.ref === ref)) && boxHostNow(ref) !== host) return host === "main" ? `<p class="small muted boxelsewhere">${ic("layers")}${esc(t("it.inpanel"))}</p>` : "";
  if (UI.editRef === ref && p){
    const sp = editSpecs(p, ref);
    return `<div class="editbox">${sp.map(s => `<label class="fld"><span>${esc(fieldLabel(s.f))}</span>${bindArea(s.spec, s.value, {rows: s.f === "content" ? 12 : Math.min(8, Math.max(2, Math.ceil(s.value.length / 90)))})}</label>`).join("")}<div class="row"><button class="btn sm primary" data-a="item-edit-done">${ic("check")}${esc(t("it.done"))}</button><span class="hint">${esc(t("it.edithint"))}</span></div></div>`;
  }
  const a = UI.itemBox; if (!a || a.ref !== ref) return "";
  const key = "item-" + ref;
  if (aiBusy(key)) return `<div class="askbox">${busyHTML(key)}</div>`;
  if (a.answer) return `<div class="proposal"><b>${esc(a.why ? t("more.why") : t("it.ask"))}</b><div>${mdLite(a.answer)}</div><div class="row"><button class="btn sm" data-a="item-box-close">${esc(t("btn.close"))}</button>${btn("item-tool", t("it.refine"), {cls: "sm ghost", attrs: `data-ref="${esc(ref)}" data-k="refine"`})}</div></div>`;
  if (a.prop) return proposalCard(p, ref, a);
  return `<div class="askbox"><label class="small muted" for="it-in">${esc(t(a.k === "ask" ? "it.ask" : "it.refine.l"))}</label><textarea id="it-in" rows="3" placeholder="${esc(t(a.k === "ask" ? "it.ph.ask" : "it.ph.refine"))}">${esc(a.text || "")}</textarea><div class="row"><button class="btn sm primary" data-a="item-send" data-ref="${esc(ref)}">${esc(t("ask.send"))}</button>${guided() ? "" : `<span class="chip model">${esc(t("tier." + (a.k === "ask" ? "quick" : "default")))}</span>`}<button class="btn sm ghost" data-a="item-box-close" data-discard="1">${esc(t("btn.cancel"))}</button></div></div>`;
}
/** PT's proposal as an editable card: every part can be ticked off or edited before accepting; "what's still off?" refines it without retyping */
function proposalCard(p, ref, a){
  const o = itemObj(p, ref) || {}, pr = a.prop, off = a.off || {}, ed = a.edit || {};
  const cur = f => Array.isArray(o[f]) ? o[f].join("\n") : str(o[f] ?? (f === "clean" ? p.intake.clean : f === "text" ? o.text : ""));
  const val = (f, v) => ed[f] != null ? ed[f] : Array.isArray(v) ? v.join("\n") : str(v);
  const rows = Object.entries(pr.fields || {}).map(([f, v]) => { const nv = val(f, v); return `<div class="pfield ${off["f:" + f] ? "off" : ""}"><label class="chk small"><input type="checkbox" data-a-change="pf-tick" data-k="f:${esc(f)}" ${off["f:" + f] ? "" : "checked"}><b>${esc(fieldLabel(f))}</b></label>
    <div class="diff">${lineDiff(cur(f), nv).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>
    <details ${ed[f] != null ? "open" : ""}><summary class="small">${esc(t("pf.editpart"))}</summary><textarea rows="${Math.min(10, Math.max(2, Math.ceil(nv.length / 90)))}" data-pfedit="${esc(f)}" id="pf-${esc(f)}">${esc(nv)}</textarea></details></div>`; }).join("");
  const ni = pr.newItem && typeof pr.newItem === "object" ? `<div class="pfield ${off.newItem ? "off" : ""}"><label class="chk small"><input type="checkbox" data-a-change="pf-tick" data-k="newItem" ${off.newItem ? "" : "checked"}><b>${esc(t("it.newitem"))}</b></label>${Object.entries(pr.newItem).filter(([, v]) => typeof v === "string" && v).map(([f, v]) => `<label class="fld"><span>${esc(fieldLabel(f))}</span><textarea rows="2" data-pfedit="new.${esc(f)}" id="pf-new-${esc(f)}">${esc(ed["new." + f] != null ? ed["new." + f] : v)}</textarea></label>`).join("")}</div>` : "";
  const tch = arr(pr.touches).filter(r => r !== ref);
  return `<div class="proposal"><div class="row"><b style="flex:1 1 12em">${esc(t("it.proposal"))}</b>${a.round > 1 ? `<span class="chip">${esc(t("pf.round", {n: a.round}))}</span>` : ""}</div>${pr.summary ? `<p>${esc(pr.summary)}</p>` : ""}
    <p class="small muted">${esc(t("pf.youasked"))} <i>${esc(trunc(a.text, 300))}</i>${a.notes && a.notes.length ? " · " + a.notes.map(n => `<i>${esc(trunc(n, 120))}</i>`).join(" · ") : ""}</p>
    ${rows}${ni}
    ${tch.length ? `<div class="small">${esc(t("it.touches"))}: ${tch.map(x => `<label class="chk small" style="display:inline-flex"><input type="checkbox" data-a-change="pf-tick" data-k="t:${esc(x)}" ${off["t:" + x] ? "" : "checked"}>${esc(x)}</label>`).join(" ")}</div>` : `<p class="small muted">${esc(t("it.nothingelse"))}</p>`}
    <div class="row refine"><input type="text" id="it-refine" placeholder="${esc(t("pf.stilloff"))}" style="flex:1;min-width:200px"><button class="btn sm" data-a="item-refine" data-ref="${esc(ref)}">${ic("spark")}${esc(t("pf.refine"))}</button></div>
    ${(() => { const n = depCount(p, ref); return `<div class="row">${n ? `<button class="btn sm primary" data-a="item-accept" data-ref="${esc(ref)}" data-scope="update" title="${esc(t("ch.update.tip"))}">${ic("check")}${esc(t("ch.acceptupdate", {n}))}</button><button class="btn sm" data-a="item-accept" data-ref="${esc(ref)}" data-scope="mark" title="${esc(t("ch.mark.tip"))}">${esc(t("ch.acceptonly", {n}))}</button>` : `<button class="btn sm primary" data-a="item-accept" data-ref="${esc(ref)}" data-scope="item">${ic("check")}${esc(t("pf.accept"))}</button>`}<button class="btn sm ghost" data-a="item-box-close" data-discard="1">${esc(t("btn.cancel"))}</button><span class="hint">${esc(t("pf.undo"))}</span></div>`; })()}</div>`;
}

/* ---------- 1.3 marks: what you did is visible on every item ---------- */
function markOf(p, ref){ return p && p.marks && p.marks[ref] || null; }
/** who did what to an item: "Edited by you", "Changed by PT · reason" – the chip opens what changed, with Undo */
function markChip(p, ref){
  const m = markOf(p, ref), isNew = p && p.newRefs && p.newRefs[ref];
  const pt = m && m.by === "pt";
  const label = m ? (pt ? t("mk.pt." + m.w) : t("mk." + m.w)) : "";
  return (isNew ? `<span class="chip new">${esc(t("mk.new"))}</span>` : "") + (m ? `<button class="chip tap mk mk-${esc(m.w)} ${pt ? "mk-pt" : ""}" data-a="mark-show" data-ref="${esc(ref)}" title="${esc((m.why ? m.why + " · " : "") + fmtDate(m.at))}">${ic(pt ? "spark" : m.w === "confirmed" ? "check" : "edit")}${esc(label)}</button>${typeof ptVersionOf === "function" && ptVersionOf(p, ref) ? `<button class="iconbtn sm revbtn" data-a="mark-revert" data-ref="${esc(ref)}" title="${esc(t("mk.revert"))}" aria-label="${esc(t("mk.revert"))}">${ic("undo")}</button>` : ""}` : "");
}

/* ---------- 1.3 my decisions + change my mind (B5) ---------- */
function decisionsModal(){
  const p = curP(); if (!p) return "";
  const ds = arr(p.decisions).slice().reverse();
  const opt = arr(p.arch.options).find(o => o.id === (p.arch.chosen || p.arch.recommended));
  const core = [
    p.northStar.goal ? {title: t("ns.goal"), choice: p.northStar.goal, ref: "ns"} : null,
    opt ? {title: t("dc.arch"), choice: opt.name, ref: "arch:choice"} : null
  ].filter(Boolean);
  const row = (d, i) => `<div class="item ${d.supersededBy ? "muted" : ""}"><div class="body"><div class="row"><b>${esc(d.title)}</b>${d.supersededBy ? `<span class="chip">${esc(t("dc.replaced"))}</span>` : ""}${d.changed ? `<span class="chip mk mk-changed">${esc(t("dc.changedmind"))}</span>` : ""}<span class="small muted">${esc(fmtDate(d.at))}</span></div><div>${esc(d.choice)}</div>${d.reason ? `<div class="small muted">${esc(d.reason)}</div>` : ""}${d.old ? `<div class="small muted">${esc(t("dc.replaces"))} ${esc(d.old)}</div>` : ""}</div>${d.supersededBy ? "" : `<div class="acts">${btn("cm-from", t("dc.change"), {cls: "sm", attrs: `data-t="${esc(trunc(d.title + ": " + d.choice, 200))}"`})}</div>`}</div>`;
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(t("dc.title"))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="sub">${esc(t("dc.sub"))}</p>
    <section class="panel cm"><h3>${esc(t("cm.title"))}</h3><p class="small muted">${esc(t("cm.sub"))}</p>
      <textarea id="cm-wish" rows="3" placeholder="${esc(t("cm.ph"))}">${esc(UI.cmWish || "")}</textarea>
      <div class="row">${aiBtn("cm-find", t("cm.find"), "M", {primary: true, key: "impact"})}<span class="hint">${esc(t("cm.hint"))}</span></div>${busyHTML("impact")}</section>
    ${core.length ? `<h3>${esc(t("dc.core"))}</h3><div class="list">${core.map(row).join("")}</div>` : ""}
    <h3>${esc(t("dc.log"))}</h3>${ds.length ? `<div class="list">${ds.map(row).join("")}</div>` : `<p class="small muted">${esc(t("dc.none"))}</p>`}`;
}
/** the review list: what PT proposes to change because of a decision (or a re-check); nothing changes until the person applies the ticked rows */
function reviewModal(){
  const p = curP(), r = UI.review; if (!p || !r) return "";
  const groups = {};
  for (const x of r.items){ const it = itemByRef(p, x.ref); const ph = it ? it.ph : "capture"; (groups[ph] = groups[ph] || []).push({x, it}); }
  const act = x => t("rv.act." + x.action);
  const row = ({x, it}, i) => { const o = itemObj(p, x.ref) || {}; const idx = r.items.indexOf(x);
    const fields = x.action === "add" ? `<div class="gwt small">${["title","given","when","then"].filter(f => x.fields[f]).map(f => `<b>${esc(fieldLabel(f))}</b><span class="add">${esc(x.fields[f])}</span>`).join("")}</div>` : x.action === "update" ? Object.entries(x.fields).map(([f, v]) => { const cur = Array.isArray(o[f]) ? o[f].join("\n") : str(itemKindOf(x.ref) === "und" ? o.text : o[f]); const nv = x.edit[f] != null ? x.edit[f] : Array.isArray(v) ? v.join("\n") : str(v);
      return `<details class="rvdiff" ${r.items.length <= 6 || UI.rvOpen === idx ? "open" : ""}><summary class="small">${esc(t("rv.showchange", {f: fieldLabel(f)}))}</summary><div class="diff">${lineDiff(cur, nv).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div></details><details><summary class="small">${esc(t("pf.editpart"))}</summary><textarea rows="3" data-rvedit="${idx}:${esc(f)}" id="rv-${idx}-${esc(f)}">${esc(nv)}</textarea></details>`; }).join("") : "";
    return `<div class="item rv ${x.on ? "" : "off"}" data-seen="${idx}"><label class="chk"><input type="checkbox" data-a-change="rv-tick" data-i="${idx}" ${x.on ? "checked" : ""} aria-label="${esc(t("rv.tick"))}"></label><div class="body"><div class="row"><span class="iid mono">${esc(it ? it.id : x.isNew ? t("rv.new") : x.ref)}</span><b style="flex:1 1 12em">${clampHTML(it ? it.title : x.isNew ? (x.fields.title || x.fields.then) : x.ref, "rv:" + x.ref, {lines: 2})}</b><span class="chip rv-${esc(x.action)}">${esc(act(x))}</span></div><div class="small">${esc(x.why)}</div>${x.mine && x.action === "update" ? `<div class="small warn-t">${esc(t("rv.mine"))}</div>` : ""}${fields}</div></div>`; };
  const n = r.items.filter(x => x.on).length;
  const head = r.mode === "recheck" ? t("rv.recheck") : r.mode === "verify" ? t("rv.verify") : r.mode === "affected" ? t("rv.affected", {n: r.items.length, l: r.layer || 1}) : r.mode === "redo" ? t("rv.redo") : t("rv.impact");
  const verified = r.mode === "verify" && !r.items.length;
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(head)}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    ${r.decision ? `<div class="panel flat"><div><b>${esc(t("rv.decision"))}</b> ${esc(r.decision)}</div>${r.old ? `<div class="small muted">${esc(t("dc.replaces"))} ${esc(r.old)}</div>` : ""}</div>` : ""}
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ""}
    ${verified ? `<div class="panel" style="border-color:var(--ok);background:var(--ok-soft)"><b>${ic("check")} ${esc(t("rv.zero"))}</b></div>` : ""}
    ${r.applied && r.mode === "affected" ? `<div class="panel" style="border-color:var(--ok)"><b>${esc(t("rv.applied", {n: r.applied}))}</b> ${r.nextRefs ? aiBtn("rv-next", t("rv.nextlayer", {n: r.nextN}), "M", {primary: true, key: "affected"}) : `<span class="small muted">${esc(t("rv.nomore"))}</span>`} ${btn("modal-close", t("btn.close"), {cls: "sm"})}</div>` : r.applied && r.mode === "redo" ? `<div class="panel" style="border-color:var(--ok)"><b>${esc(t("rv.applied", {n: r.applied}))}</b> ${btn("modal-close", t("btn.close"), {cls: "sm primary"})}</div>` : r.applied ? `<div class="panel" style="border-color:var(--ok)"><b>${esc(t("rv.applied", {n: r.applied}))}</b> ${aiBtn("cm-verify", t("rv.didwork"), "M", {primary: true, key: "impact"})}</div>${busyHTML("impact")}` : ""}
    ${!r.applied && r.items.length ? `<p class="small muted">${esc(t("rv.howto"))}</p>${PHASE_IDS.filter(ph => groups[ph]).map(ph => `<div class="row grp-h"><h3 style="flex:1 1 12em">${esc(phName(ph))} · ${groups[ph].length}</h3><button class="btn xs ghost" data-a="rv-tickgrp" data-ph="${ph}" data-on="1">${esc(t("rv.all"))}</button><button class="btn xs ghost" data-a="rv-tickgrp" data-ph="${ph}" data-on="0">${esc(t("rv.none0"))}</button></div><div class="list">${groups[ph].map(row).join("")}</div>`).join("")}
      <div class="row end rvbar"><span class="small muted" id="seen-count" data-n="${r.items.length}">${esc(t("pg.seen", {a: Object.keys((UI.modal && UI.modal.seen) || {}).length, b: r.items.length}))}</span><span class="small tnum">${esc(t("rv.ticked", {a: n, b: r.items.length}))}</span><span style="flex:1"></span><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="rv-apply" ${n ? "" : "disabled"}>${ic("check")}${esc(t("rv.apply", {n}))}</button></div>` : ""}
    ${!r.applied && !r.items.length && !verified ? `<p>${esc(t("rv.none"))}</p>` : ""}`;
}

/* ---------- 1.3 notes always at hand (C1): one docked panel on every page ----------
   A scratch pad at the top (always there, saved as you type), quick add, and your notes below (this project or all).
   Selected text anywhere in PT can be added with one click; it keeps a link back to where it came from. */
function scratchNote(){
  const all = WS.notes.filter(x => x.type === "scratch" && !x.deletedAt).sort((a, b) => (!!str(b.text).trim() - !!str(a.text).trim()) || str(a.createdAt).localeCompare(str(b.createdAt)));
  if (all.length) return all[0];
  if (!WS.id || UI.loading || !UI.wsReady) return null;   // only once the workspace's notes are loaded
  return addNote({text: "", type: "scratch", inbox: false, pinned: true});
}
const PT_LINK = /\[\[pt:([^\]|]+)\|([^\]]*)\]\]/g;
function noteLinks(text){ const out = []; let m; PT_LINK.lastIndex = 0; while ((m = PT_LINK.exec(str(text)))) out.push({target: m[1], label: m[2]}); return out; }
function notesDock(){
  const p = UI.view === "project" ? curP() : null, sc = scratchNote();
  const scope = UI.dockScope || (p ? "project" : "all");
  const notes = WS.notes.filter(n => !n.deletedAt && n.type !== "scratch" && (scope === "all" || !p || n.projectId === p.id)).sort((a, b) => (b.pinned - a.pinned) || str(b.updatedAt).localeCompare(str(a.updatedAt))).slice(0, 60);
  const links = sc ? [...arr(sc.links), ...noteLinks(sc.text)] : [];
  return `<div class="dock-notes">
    ${sc ? `<div class="scratch"><div class="row"><b class="small" style="flex:1">${ic("note")} ${esc(t("dock.scratch"))}</b><span class="small muted" id="sc-state">${esc(t("dock.autosave"))}</span></div>
      <textarea id="scratch" class="scratch-ta" data-bind="note:${sc.id}:text" rows="9" placeholder="${esc(t("dock.scratchph"))}">${esc(sc.text)}</textarea>
      ${links.length ? `<div class="row" style="gap:4px">${links.slice(-8).map(l => `<button class="chip tap" data-a="pt-link" data-t="${esc(l.target)}">↗ ${esc(trunc(l.label, 40))}</button>`).join("")}</div>` : ""}
      <div class="row">${btn("scratch-tonote", t("dock.keep"), {cls: "xs", attrs: sc.text.trim() ? "" : "disabled"})}<span class="hint">${esc(t("dock.cliphint"))}</span></div></div>` : ""}
    <form class="stack" data-form="drawer-note" style="padding:10px 14px;border-bottom:1px solid var(--line)"><textarea id="dr-new" rows="2" placeholder="${esc(t("notes.quickph"))}"></textarea><div class="row end"><button class="btn sm primary" type="submit">${ic("plus")}${esc(t("notes.add"))}</button></div></form>
    ${p ? `<div class="seg" style="margin:8px 14px 0">${["project", "all"].map(s => `<button class="${scope === s ? "on" : ""}" data-a="dock-scope" data-v="${s}">${esc(t("dock.scope." + s))}</button>`).join("")}</div>` : ""}
    <div class="dr-body">${notes.length ? notes.map(n => noteCard(n, {compact: true})).join("") : `<p class="small muted">${esc(t("notes.drawerempty"))}</p>`}</div></div>`;
}
/** where a clipped selection comes from, as a PT link: project › step › item */
function clipSource(node){
  const p = UI.view === "project" ? curP() : null;
  const host = node && (node.nodeType === 1 ? node : node.parentElement);
  const row = host && host.closest("[id^='ir-'], [id^='as-'], [data-ref]");
  const ref = row ? (row.dataset.ref || row.id.replace(/^ir-/, "").replace(/^as-/, "assumption:")) : "";
  if (!p) return {target: "view:" + UI.view, label: t("nav." + UI.view) === "nav." + UI.view ? UI.view : t("nav." + UI.view)};
  const it = ref ? itemByRef(p, ref) : null;
  return {target: `p:${p.id}:${(it && it.ph) || p.focus.ph}:${ref}`, label: `${trunc(p.name, 30)} › ${phName((it && it.ph) || p.focus.ph)}${it ? " · " + it.id : ""}`};
}

/* ---------- 1.3 help level (C3): Learning · Guided · Pro, plus the Mini-map switch ----------
   Learning = Guided plus: what each step makes and where that is used later, one tip at a time, and the build map
   (the whole tool as its parts, like a watch: movement, modules, case – each step is one part of the build). */
function helpLevel(){ return levelOf(UI.view === "project" ? curP() : null); }
const STEP_FLOW = {capture: ["understand","interview","require"], understand: ["interview","require","arch"], interview: ["assume","require","arch"], assume: ["require","test"], require: ["arch","build","test"], arch: ["build","review"], build: ["review","test","launch"], review: ["test","launch"], test: ["launch","release"], launch: ["release"], release: ["operate"], operate: ["capture"]};
function helpSeg(){ const h = helpLevel(); return `<div class="seg" role="group" aria-label="${esc(t("help.level"))}">${["learn","guided","pro"].map(x => `<button class="${h === x ? "on" : ""}" data-a="set-help" data-v="${x}" title="${esc(t("help.tip." + x))}">${esc(t("help." + x))}</button>`).join("")}</div>`; }
/** the recommended one-click action on a closed row (quick mode: no need to open the item first) */
function quickPrimary(it){
  if (it.flag) return `<button class="btn xs primary qp" data-a="item-unflag" data-ref="${esc(it.ref)}" title="${esc(t("it.stillok.tip"))}">${ic("check")}${esc(t("it.stillok"))}</button>`;
  if (it.st !== "as") return "";
  if (it.kind === "assumption") return it.obj ? `<button class="btn xs primary qp" data-a="as-validate" data-id="${esc(it.obj.id)}" title="${esc(t("as.validate.tip"))}">${ic("check")}${esc(t("as.validate"))}</button>` : "";
  if (["intake","nsdraft","pq"].includes(it.kind)) return "";
  return `<button class="btn xs primary qp" data-a="item-confirm" data-ref="${esc(it.ref)}">${ic("check")}${esc(t("btn.confirm"))}</button>`;
}
