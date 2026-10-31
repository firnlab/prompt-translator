/* ===================== 1.3 ACTIONS ===================== */
Object.assign(ACTIONS, {
  /* project content language */
  "proj-lang": () => { UI.modal = {kind: "plang"}; render(); },
  "plang-set": el => { const p = curP(); const l = el.dataset.l; if (!p || !["en","de","zh"].includes(l)) return; if (p.lang !== l){ snapshot(p); p.lang = l; logAct(p, t("plang.set", {l: langLabel(l)}), {important: true}); touch(p); } UI.modal = null; render(); toast(t("plang.set", {l: langLabel(l)}), "ok"); },
  "tr-toggle": () => { UI.trOn = !UI.trOn; render(); },
  "tr-step": () => { const p = curP(); if (p) aiTranslateStep(p, p.focus.ph); }
});

/* ---------- 1.3 draft safety net: nothing typed is ever lost ----------
   Every text box that is not bound to saved data keeps a draft per person, project and box. The draft survives
   re-renders (background saves, job updates), closing a box, reloading the page and losing the connection, and comes
   back when the box opens again. A draft is cleared only when its text was used (form sent, change accepted) or when
   the person presses Cancel / Discard. Clicking outside a popup never throws text away. */
const DRAFT_SKIP = new Set(["pin", "pal-in", "pin-code", "pin-new", "pin-owner", "rb-in", "q-find"]);   // rb-in: the raw editor always starts from the current brief; q-find: saved views set it   // secrets are never kept as drafts
let DRAFTS = null, DRAFT_WS = null, draftTimer = null;
function draftStoreKey(){ return "drafts:" + (WS.id || "boot"); }
function draftsLoad(){
  if (DRAFTS && DRAFT_WS === (WS.id || "boot")) return DRAFTS;
  DRAFT_WS = WS.id || "boot"; DRAFTS = {};
  const d = Store.lsGet(draftStoreKey()); const cut = Date.now() - 14 * 864e5;
  if (d && typeof d === "object") for (const [k, v] of Object.entries(d)) if (v && typeof v.v === "string" && v.at > cut) DRAFTS[k] = v;
  return DRAFTS;
}
function draftsSave(){ clearTimeout(draftTimer); draftTimer = setTimeout(() => { const d = draftsLoad(); const keys = Object.keys(d).sort((a, b) => d[b].at - d[a].at).slice(0, 200); const o = {}; for (const k of keys) o[k] = d[k]; Store.lsSet(draftStoreKey(), o); }, 300); }
function draftable(el){
  if (!el || !el.id || DRAFT_SKIP.has(el.id) || el.disabled || el.readOnly) return false;
  if (/^(pf-|rv-|it-refine$)/.test(el.id) || el.matches("[data-pfedit],[data-rvedit]")) return false;   // these boxes keep their own state
  if (el.tagName === "TEXTAREA") return !el.matches("[data-lines],[data-lines-test],[data-reqids]") && (!el.dataset.bind || el.dataset.bind.startsWith("ui:"));
  if (el.tagName === "INPUT") return ["text", "search", ""].includes(el.getAttribute("type") || "") && (!el.dataset.bind || el.dataset.bind.startsWith("ui:"));
  return false;
}
function draftKey(el){
  const m = UI.modal ? (UI.modal.kind + ":" + str(UI.modal.title || UI.modal.id || "")) : "";
  const box = UI.itemBox && el.id === "it-in" ? UI.itemBox.ref + ":" + UI.itemBox.k : "";
  return [UI.pid || "-", el.id, el.dataset.draft || "", el.closest(".overlay") ? m : "", box].join("|");
}
function draftPut(el){ if (!draftable(el)) return; const d = draftsLoad(), k = draftKey(el); if (str(el.value).trim()) d[k] = {v: el.value, at: Date.now(), base: d[k] && d[k].base != null ? d[k].base : el.defaultValue}; else delete d[k]; draftsSave(); }
function draftDrop(el){ const d = draftsLoad(); delete d[draftKey(el)]; draftsSave(); }
function draftDropIn(root){ if (!root) return; for (const el of root.querySelectorAll("input,textarea")) if (draftable(el)) draftDrop(el); }
/** after every render: put back what the person had typed */
function restoreDrafts(){
  const d = draftsLoad();
  for (const el of document.querySelectorAll("input[id],textarea[id]")){
    if (!draftable(el)) continue;
    const k = draftKey(el), x = d[k]; if (!x) continue;
    // popups prefilled from saved data (rename, North Star …): if that data changed since, the draft is stale – never overwrite newer data
    if (el.closest(".overlay") && x.base != null && x.base !== el.defaultValue){ delete d[k]; draftsSave(); continue; }
    if (el.value === x.v) continue;
    el.value = x.v;
    if (el.dataset.bind && el.dataset.bind.startsWith("ui:")) applyBind(el);
    if (el.matches("[data-qdraft]")) UI.qDraft[el.dataset.qdraft] = el.value;
    if (el.tagName === "TEXTAREA" && el.dataset.grow){ el.style.height = "auto"; el.style.height = Math.max(el.scrollHeight, 150) + "px"; }
  }
}
document.addEventListener("input", e => { if (draftable(e.target)) draftPut(e.target); }, true);
/* the backdrop closes a popup only when the press also started on the backdrop (a text selection that ends outside is not a click outside),
   and never while the popup holds typed text */
let LAST_DOWN = null;
document.addEventListener("mousedown", e => { LAST_DOWN = e.target; }, true);
function overlayHasText(){ const o = document.querySelector(".overlay .modal, .overlay .capture"); return !!o && [...o.querySelectorAll("input,textarea")].some(el => el.type !== "password" && el.type !== "checkbox" && el.type !== "radio" && str(el.value).trim() && el.id !== "pal-in"); }
ACTIONS["close-overlay"] = (el, e) => {
  if (e && e.target !== el) return;
  if (LAST_DOWN && LAST_DOWN !== el) return;
  if (UI.modal && UI.modal.sticky) return;
  if (overlayHasText()){ const m = document.querySelector(".overlay .modal, .overlay .capture"); if (m){ m.classList.remove("nudge"); void m.offsetWidth; m.classList.add("nudge"); } toast(t("draft.keep"), ""); return; }
  UI.modal = null; UI.palette = false; UI.capture = false; render();
};
/* boxes that are used by a button (not a form): the draft goes when the button is pressed */
const DRAFT_USED_BY = {"rp-save": ["rp-name"], "save-version": ["ver-reason"], "ask-section-send": ["ask-sec-in"], "exa-save": ["exa-in","exa-out","exa-why"], "exa-pt": ["exa-aim"], "rl-add": ["rl-in"]};
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-a]"); if (!b) return;
  for (const id of DRAFT_USED_BY[b.dataset.a] || []){ const el = document.getElementById(id); if (el && str(el.value).trim()) draftDrop(el); }
}, true);
/* Cancel / Discard buttons throw the draft away on purpose; the X, Esc and clicking outside keep it */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-discard]"); if (!b) return;
  const scope = b.closest(".modal, .capture, .askbox, .proposal, form, .panel") || document; draftDropIn(scope);
}, true);

/* ---------- 1.3 network: retry now, offline notice, retry when back ---------- */
ACTIONS["save-retry"] = () => { Store.retryAll(); toast(t("save.retrying"), ""); };
try{ if (navigator.onLine === false) UI.offline = true; }catch(e){}
window.addEventListener("online", () => { UI.offline = false; Store.retryAll(); render(); toast(t("net.back"), "ok"); });
window.addEventListener("offline", () => { UI.offline = true; render(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Store.waiting()) Store.retryAll(); if (document.visibilityState === "hidden") for (const p of [...Store.queue.keys()]) Store.flushPath(p); });
function offlineBar(){ return UI.offline ? `<div class="offbar" role="status">${ic("info")} ${esc(t("net.off"))}</div>` : ""; }

/* ---------- 1.3 item actions ---------- */
/* a mark never downgrades what you did: added > edited / changed / answered > confirmed */
const MARK_RANK = {confirmed: 1, answered: 2, edited: 2, changed: 2, added: 3, decided: 0, fixed: 2};
/** what happened to an item, by whom and why; the change itself (before → after) is in the action, so Undo works from the mark */
function markRef(p, ref, w, {by = "you", why = ""} = {}){
  if (!p || !ref) return; p.marks = p.marks || {}; const cur = p.marks[ref];
  if (cur && (cur.by || "you") === by && (MARK_RANK[cur.w] || 0) > (MARK_RANK[w] || 0)){ cur.at = now(); return; }
  const o = ACT.open.get(p.id);
  const m = {w, at: now()}; if (by !== "you") m.by = by; if (why) m.why = trunc(str(why), 300); if (o) m.act = o.id;
  if (cur) m.prev = {w: cur.w, by: cur.by || "you", at: cur.at, ...(cur.act ? {act: cur.act} : {}), ...(cur.why ? {why: cur.why} : {})};
  p.marks[ref] = m;
}
function markPT(p, ref, w, why){ markRef(p, ref, w, {by: "pt", why}); }
function markNew(p, ref){ if (!p || !ref) return; p.newRefs = p.newRefs || {}; p.newRefs[ref] = now(); UI.flashRef = ref; }
function listRefs(p, k){ const L = {req: p.requirements, assumption: p.assumptions, risk: p.risks, test: p.tests, qa: p.qa}[k]; return arr(L).map(x => k + ":" + x.id); }
/** a toast with Undo for exactly the action that just happened, in the project it happened in */
function toastUndo(msg, p = curP()){
  toast(msg, "ok");
  if (!p) return;
  actClose(p.id);   // the action is complete now: its Undo is bound to it
  const a = lastAct(p); if (!a) return;
  // nothing was changed by what just happened: an older action is not offered for Undo here
  if (Date.now() - new Date(a.at).getTime() > 4000) return;
  const host = document.getElementById("toasts"); const el = host && host.lastElementChild;
  if (el){ const pid = p.id, id = a.id; const b = document.createElement("button"); b.className = "btn xs"; b.textContent = t("btn.undo1"); b.addEventListener("click", () => { const q = WS.projects.find(x => x.id === pid); if (q) undoAct(q, id); el.remove(); }); el.appendChild(document.createTextNode(" ")); el.appendChild(b); }
}
Object.assign(ACTIONS, {
  "item-tool": el => { const k = ["fix","adjust","change","add","refine"].includes(el.dataset.k) ? "refine" : el.dataset.k; UI.editRef = null; UI.itemBox = {ref: el.dataset.ref, k, text: el.dataset.text || "", round: 0, notes: [], off: {}, edit: {}}; render(); focusSoon("it-in"); },
  "item-edit": el => { UI.itemBox = null; UI.editRef = UI.editRef === el.dataset.ref ? null : el.dataset.ref; render(); },
  "item-edit-done": () => { UI.editRef = null; render(); },
  "item-send": async el => {
    const p = curP(); const a = UI.itemBox; if (!a) return;
    const v = (nearField(el, "#it-in") || {}).value || a.text || ""; if (!v.trim()){ toast(t("it.need"), "err"); return; }
    a.text = v; a.round = 1; a.notes = []; a.off = {}; a.edit = {}; render();
    const r = await aiItemEdit(p, a.ref, a.k, v);
    if (UI.itemBox !== a) return;
    if (r && a.k === "ask") a.answer = r.answer; else if (r) a.prop = r;
    render();
  },
  "item-refine": async el => {
    const p = curP(); const a = UI.itemBox; if (!a || !a.prop) return;
    const note = str((nearField(el, "#it-refine") || {}).value).trim(); if (!note){ toast(t("it.need"), "err"); focusSoon("it-refine"); return; }
    // what the person already edited by hand counts as their correction too
    const prev = {fields: Object.assign({}, a.prop.fields), newItem: a.prop.newItem};
    for (const [f, v] of Object.entries(a.edit || {})) if (!f.startsWith("new.")) prev.fields[f] = v;
    for (const k of Object.keys(a.off || {})) if (a.off[k] && k.startsWith("f:")) delete prev.fields[k.slice(2)];
    a.notes = [...arr(a.notes), note]; render();
    const r = await aiItemEdit(p, a.ref, "refine", a.text, {prev, notes: a.notes});
    if (UI.itemBox !== a) return;
    if (r){ a.prop = r; a.round = (a.round || 1) + 1; a.edit = {}; a.off = {}; const inp = $("#it-refine"); if (inp){ inp.value = ""; draftDrop(inp); } }
    render();
  },
  "item-accept": el => {
    const p = curP(); const a = UI.itemBox; if (!a || !a.prop) return;
    const pr = a.prop, off = a.off || {}, ed = a.edit || {};
    const fields = {};
    for (const [f, v] of Object.entries(pr.fields || {})){ if (off["f:" + f]) continue; let nv = ed[f] != null ? ed[f] : v; if (Array.isArray(v) && typeof nv === "string") nv = nv.split("\n").map(s => s.trim()).filter(Boolean); fields[f] = nv; }
    let newItem = null;
    if (pr.newItem && typeof pr.newItem === "object" && !off.newItem){ newItem = Object.assign({}, pr.newItem); for (const [k, v] of Object.entries(ed)) if (k.startsWith("new.")) newItem[k.slice(4)] = v; }
    const touches = arr(pr.touches).filter(x => !off["t:" + x]);
    if (!Object.keys(fields).length && !newItem){ toast(t("pf.nothing"), "err"); return; }
    const kind = a.ref.split(":")[0], before = new Set(listRefs(p, kind));
    const scope = el.dataset.scope || "item", textBefore = itemSnapshotText(p, a.ref);
    probSnap(p);
    const skip = arr(pr.touches).filter(x => off["t:" + x]);   // what you unticked under "also affects" is left alone
    applyItemProposal(p, a.ref, {fields, newItem, touches: scope === "mark" ? touches : [], skip, summary: pr.summary}, scope === "mark" ? "downstream" : "item");
    if (Object.keys(fields).length) markRef(p, a.ref, "changed");
    for (const r of listRefs(p, kind)) if (!before.has(r)){ markNew(p, r); markRef(p, r, "added"); }
    const box = document.getElementById("it-in"); if (box) draftDrop(box);
    { const d = draftsLoad(); for (const k of Object.keys(d)) if (k.includes("|it-in|") && k.endsWith("|" + a.ref + ":" + a.k)) delete d[k]; draftsSave(); }
    UI.itemBox = null; touch(p); render(); toastUndo(t("it.applied")); afterChange(p);
    if (scope === "update") updateAffected(p, [a.ref], {before: {[a.ref]: textBefore}, skip});
  },
  "item-box-close": () => { UI.itemBox = null; render(); },
  "item-why": el => { const p = curP(); const ref = el.dataset.ref; closeMenus(); UI.editRef = null; UI.itemBox = {ref, k: "ask", text: t("more.whyq"), why: true}; render(); aiItemEdit(p, ref, "ask", t("more.whyq")).then(r => { if (UI.itemBox && UI.itemBox.ref === ref && r){ UI.itemBox.answer = r.answer; render(); } }); },
  "item-research": el => {
    const p = curP(); const ref = el.dataset.ref; closeMenus();
    const [k, id] = ref.split(":"); if (k === "assumption"){ ACTIONS["as-research"]({dataset: {id}}); return; }
    const it = itemByRef(p, ref); researchJob(p, t("res.item", {x: trunc(it ? it.title : ref, 160)}), p.focus.ph);
  },
  "item-remove": el => {
    const p = curP(); const ref = el.dataset.ref; closeMenus(); const [k, id] = ref.split(":"); const list = ITEM_LIST[k]; if (!list) return;
    snapshot(p, t("more.remove") + " " + ref); probSnap(p);
    p[list] = arr(p[list]).filter(x => x.id !== id); unflag(p, ref);
    if (k === "req") for (const x of arr(p.tests)) x.reqIds = arr(x.reqIds).filter(r => r !== id);
    logAct(p, t("act.removed", {r: ref}), {kind: "edit"}); touch(p); render(); toastUndo(t("more.removed")); afterChange(p);
  }
});
Object.assign(CHANGES, {
  "pf-tick": el => { const a = UI.itemBox; if (!a) return; a.off = a.off || {}; a.off[el.dataset.k] = !el.checked; render(); }
});
document.addEventListener("input", e => { const el = e.target; if (el.matches && el.matches("[data-pfedit]") && UI.itemBox){ UI.itemBox.edit = UI.itemBox.edit || {}; UI.itemBox.edit[el.dataset.pfedit] = el.value; } });
function closeMenus(){ for (const d of document.querySelectorAll("details.more[open]")) d.open = false; }
document.addEventListener("click", e => { if (!e.target.closest("details.more")) closeMenus(); });

/* ---------- 1.3 what you did shows on the item (B2) and new items come first (B4) ---------- */
const PATH_REF = [[/^goal\.criteria\.#([^.]+)\./, "crit"], [/^goal\.examples\.#([^.]+)\./, "ex"], [/^requirements\.#([^.]+)\./, "req"], [/^assumptions\.#([^.]+)\./, "assumption"], [/^risks\.#([^.]+)\./, "risk"], [/^tests\.#([^.]+)\./, "test"], [/^qa\.#([^.]+)\./, "qa"], [/^findings\.#([^.]+)\./, "finding"], [/^pkg\.sections\.#([^.]+)\./, "section"], [/^arch\.components\.#([^.]+)\./, "component"]];
function refFromPath(path){
  for (const [rx, k] of PATH_REF){ const m = path.match(rx); if (m) return k + ":" + m[1]; }
  if (path.startsWith("northStar.")) return "ns";
  return {"intake.raw": "intake:raw", "intake.clean": "intake:clean", "understand.rootNeed": "und:root", "understand.jtbd": "und:jtbd", "understand.walkthrough": "und:walk", "arch.why": "arch:choice"}[path] || null;
}
function markEditedPath(p, path){ const ref = refFromPath(path); if (ref){ markRef(p, ref, "edited"); recheckSoon(p); } }
for (const [name, kind] of [["add-req", "req"], ["add-test", "test"], ["add-risk", "risk"], ["add-assumption", "assumption"]]){
  const orig = ACTIONS[name]; if (!orig) continue;
  ACTIONS[name] = el => { const p = curP(); const before = new Set(listRefs(p, kind)); orig(el); for (const r of listRefs(p, kind)) if (!before.has(r)){ markNew(p, r); markRef(p, r, "added"); } touch(p); render(); };
}
{ const orig = ACTIONS["item-confirm"]; ACTIONS["item-confirm"] = el => { const p = curP(); probSnap(p); orig(el); markRef(p, el.dataset.ref, "confirmed"); afterChange(p); }; }
/** new items first, in the order they were added; everything else in its normal order */
function newFirst(p, kind, list){
  const nr = p && p.newRefs || {}; const isN = x => !!nr[kind + ":" + x.id];
  return [...list.filter(isN).sort((a, b) => str(nr[kind + ":" + b.id]).localeCompare(str(nr[kind + ":" + a.id]))), ...list.filter(x => !isN(x))];
}
/** after a render: bring a just-added item into view and light it up once */
function flashNew(){
  const ref = UI.flashRef; if (!ref) return; UI.flashRef = null;
  const find = () => refEl(ref);
  const el = find();
  if (!el && UI.navRef === ref){ navFallback(ref); return; }
  UI.navRef = null;
  if (el){ UI.jumped = true; const far = Math.abs(el.getBoundingClientRect().top - innerHeight / 2) > innerHeight * 1.5; el.scrollIntoView({behavior: far || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center"}); el.classList.add("flash"); setTimeout(() => { const e2 = find(); if (e2) e2.classList.remove("flash"); }, 2400);
    // look the field up again when focusing: another render may have replaced the element in between
    setTimeout(() => { const e2 = find(); const f = e2 && e2.querySelector("input,textarea"); if (f && !str(f.value).trim()) f.focus({preventScroll: true}); }, 350); }
}

/* ---------- 1.3 re-check (B3): since you started this step, which problems your changes solved ---------- */
const PROB_BASE = new Map();
function problemKeys(p){ const s = new Set(); try{ for (const i of allItems(p)) if (i.st === "bad" || i.st === "warn") s.add(i.ref); for (const f of arr(p.flags)) s.add(f.ref); }catch(e){} return s; }
function resetBase(p){ if (!p) return; PROB_BASE.set(p.id, {keys: problemKeys(p), at: now(), ph: p.focus && p.focus.ph}); UI.rc = null; }
function probSnap(p){ if (p && !PROB_BASE.has(p.id)) resetBase(p); }
let rcTimer = null;
function recheckSoon(p){ clearTimeout(rcTimer); rcTimer = setTimeout(() => afterChange(p), 1200); }
function afterChange(p){
  if (!p || UI.pid !== p.id) return; probSnap(p);
  const base = PROB_BASE.get(p.id), now2 = problemKeys(p);
  const solved = [...base.keys].filter(k => !now2.has(k)), added = [...now2].filter(k => !base.keys.has(k));
  const next = solved.length || added.length ? {pid: p.id, solved, added, open: now2.size} : null;
  const sig = x => x ? x.solved.join() + "/" + x.added.join() + "/" + x.open : "";
  if (sig(next) !== sig(UI.rc)){ UI.rc = next; if (!RENDERING) render(); }
}
function refLabel(p, ref, full = false){ const it = itemByRef(p, ref); return it ? (guided() ? "" : it.id + " ") + (full ? str(it.title) : trunc(it.title, 50)) : ref; }
function recheckBar(p){
  const r = UI.rc; if (!p || !r || r.pid !== p.id) return "";
  const flagged = arr(p.flags).length;
  const list = (refs, cls) => refs.slice(0, 12).map(ref => `<button class="chip tap ${cls}" data-a="goto-ref" data-ref="${esc(ref)}">${esc(refLabel(p, ref))}</button>`).join(" ");
  return `<div class="rcbar" role="status"><div class="row"><span class="rc-sum">${r.solved.length ? `<b class="ok-t">${ic("check")} ${esc(t("rc.solved", {n: r.solved.length}))}</b>` : ""}${r.added.length ? ` · <b class="warn-t">${esc(t("rc.new", {n: r.added.length}))}</b>` : ""} · <span class="muted">${esc(t("rc.open", {n: r.open}))}</span></span>
    <span style="flex:1"></span>${flagged ? aiBtn("recheck-pt", t("rc.withpt", {n: flagged}), "M", {key: "recheck"}) : ""}${btn("rc-show", UI.rcOpen ? t("rc.hide") : t("rc.show"), {cls: "sm ghost"})}${ibtn("rc-close", "x", t("btn.close"))}</div>
    ${UI.rcOpen ? `<div class="stack" style="gap:6px;margin-top:8px">${r.solved.length ? `<div class="small"><b>${esc(t("rc.solvedl"))}</b> ${list(r.solved, "ok")}</div>` : ""}${r.added.length ? `<div class="small"><b>${esc(t("rc.newl"))}</b> ${list(r.added, "warn")}</div>` : ""}</div>` : ""}${busyHTML("recheck")}</div>`;
}
Object.assign(ACTIONS, {
  "rc-show": () => { UI.rcOpen = !UI.rcOpen; render(); },
  "rc-close": () => { const p = curP(); resetBase(p); UI.rcOpen = false; render(); },
});

/* ---------- 1.3 decisions, change my mind, review list ---------- */
Object.assign(ACTIONS, {
  "dc-open": () => { UI.modal = {kind: "decisions", wide: true}; render(); focusSoon("cm-wish"); },
  "cm-from": el => { UI.cmWish = t("cm.about", {x: el.dataset.t}) + " "; const ta = $("#cm-wish"); if (ta){ ta.value = UI.cmWish; draftPut(ta); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } },
  "cm-find": async () => {
    const p = curP(); const ta = $("#cm-wish"); const wish = str(ta ? ta.value : UI.cmWish).trim();
    if (!wish){ toast(t("cm.need"), "err"); focusSoon("cm-wish"); return; }
    UI.cmWish = wish; render();
    const r = await aiImpact(p, wish); if (!r) return;
    UI.review = Object.assign(r, {mode: "impact", wish, pid: p.id}); UI.modal = {kind: "review", wide: true}; render();
  },
  "recheck-pt": () => aiUpdateAffected(curP()),
  "rv-apply": () => {
    const p = curP(), r = UI.review; if (!p || !r || r.pid !== p.id) return;
    const on = r.items.filter(x => x.on); if (!on.length) return;
    snapshot(p, r.mode === "recheck" ? t("rv.recheck") : t("dc.changed")); probSnap(p);
    let n = 0;
    for (const x of on){
      const [k, id] = x.ref.split(":");
      if (x.action === "remove" && ITEM_LIST[k]){ p[ITEM_LIST[k]] = arr(p[ITEM_LIST[k]]).filter(o => o.id !== id); if (k === "req") for (const tt of arr(p.tests)) tt.reqIds = arr(tt.reqIds).filter(q => q !== id); unflag(p, x.ref); n++; continue; }
      if (x.action === "update"){ const f = {}; for (const [fk, v] of Object.entries(x.fields)) f[fk] = x.edit[fk] != null ? (Array.isArray(v) ? x.edit[fk].split("\n").map(s => s.trim()).filter(Boolean) : x.edit[fk]) : v; if (applyFields(p, x.ref, f, {confirm: true})){ unflag(p, x.ref); markRef(p, x.ref, "changed"); n++; } continue; }
      if (x.action === "ok"){ unflag(p, x.ref); n++; continue; }
      if (x.action === "review"){ flag(p, x.ref, r.decision || t("rv.recheck")); n++; }
    }
    if (r.mode === "impact"){
      const id = uid("d"); p.decisions.push({id, at: now(), title: t("dc.changed"), choice: r.decision || r.wish, reason: r.wish, old: r.old, changed: true, refs: on.map(x => x.ref)});
    }
    logAct(p, (r.mode === "recheck" ? t("rv.recheck") : t("dc.changed")) + ": " + n + " · " + trunc(r.decision || r.wish || "", 80), {important: true, kind: "edit"});
    r.applied = n; if (r.mode === "impact"){ UI.cmWish = ""; const d = draftsLoad(); for (const k of Object.keys(d)) if (k.includes("|cm-wish|")) delete d[k]; draftsSave(); }
    touch(p); render(); afterChange(p);
  },
  "cm-verify": async () => { const p = curP(), r = UI.review; if (!p || !r) return; const v = await aiImpact(p, r.wish || r.decision, {verify: true, decision: r.decision}); if (!v) return; UI.review = Object.assign(v, {mode: "verify", wish: r.wish, decision: r.decision || v.decision, old: r.old, pid: p.id}); render(); }
});
Object.assign(CHANGES, { "rv-tick": el => { const r = UI.review; if (!r) return; const x = r.items[num(el.dataset.i, -1)]; if (x){ x.on = el.checked; render(); } } });
document.addEventListener("input", e => { const el = e.target; if (el.matches && el.matches("[data-rvedit]") && UI.review){ const [i, f] = el.dataset.rvedit.split(":"); const x = UI.review.items[num(i, -1)]; if (x){ x.edit[f] = el.value; } } });

/* ---------- 1.3 quick mode: accept all, fold, keyboard ---------- */
Object.assign(ACTIONS, {
  "xp-more": () => { UI.xMore = true; render(); },
  "confirm-all-as": () => { const p = curP(); const list = assumedItems(p).filter(i => i.kind !== "assumption"); if (!list.length) return; snapshot(p, t("xp.acceptall", {n: list.length})); probSnap(p); for (const i of list){ confirmItem(p, i.ref); markRef(p, i.ref, "confirmed"); } touch(p); render(); toastUndo(t("xp.accepted", {n: list.length})); afterChange(p); },
  "xp-fold": el => { UI.xOpen = UI.xOpen || new Set(); const ph = el.dataset.ph; if (UI.xOpen.has(ph)) UI.xOpen.delete(ph); else UI.xOpen.add(ph); render(); }
});
document.addEventListener("keydown", e => {
  if (e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!UI.unlocked || UI.lockFor) return;
  const p = UI.view === "project" ? curP() : null; if (!p || projMode(p) !== "express" || UI.modal || UI.palette || UI.capture) return;
  const a = document.activeElement; if (a && a.matches && a.matches("input,textarea,select,button,a,summary,[contenteditable]")) return;   // a focused control handles its own keys
  const list = arr(UI.xList); if (!list.length) return;
  const k = e.key.toLowerCase(); let i = Math.max(0, list.indexOf(UI.xSel));
  if (k === "arrowdown" || k === "j"){ e.preventDefault(); i = UI.xSel ? Math.min(list.length - 1, i + 1) : 0; }
  else if (k === "arrowup" || k === "k"){ e.preventDefault(); i = Math.max(0, i - 1); }
  else if (k === "enter" && UI.xSel){ e.preventDefault(); const it = itemByRef(p, UI.xSel); if (it && it.st === "as" && !["intake","nsdraft","pq"].includes(it.kind)){ if (it.kind === "assumption") ACTIONS["as-validate"]({dataset: {id: it.obj.id}}); else ACTIONS["item-confirm"]({dataset: {ref: it.ref}}); } else if (it && it.flag) ACTIONS["item-unflag"]({dataset: {ref: it.ref}}); return; }
  else if (k === "e" && UI.xSel){ e.preventDefault(); ACTIONS["item-edit"]({dataset: {ref: UI.xSel}}); return; }
  else if (k === "r" && UI.xSel){ e.preventDefault(); ACTIONS["item-tool"]({dataset: {ref: UI.xSel, k: "refine"}}); return; }
  else return;
  UI.xSel = list[i]; UI.open.add(UI.xSel); render();
  const el = document.getElementById("ir-" + UI.xSel); if (el) el.scrollIntoView({block: "nearest"});
});

/* ---------- 1.3 notes panel actions (C1) ---------- */
function dockSave(){ Store.lsSet("dock", {open: !!UI.drawer && (UI.panelTab || "notes") === "notes", w: num(UI.dockW, 360)}); }
function dockRestore(){ const d = Store.lsGet("dock"); if (d){ UI.dockW = clamp(num(d.w, 360), 280, 720); if (d.open){ UI.drawer = true; UI.panelTab = "notes"; } } }
Object.assign(ACTIONS, {
  "dock-toggle": () => { const on = UI.drawer && (UI.panelTab || "notes") === "notes"; UI.drawer = !on; UI.panelTab = "notes"; dockSave(); render(); if (UI.drawer) focusSoon("scratch"); },
  "dock-scope": el => { UI.dockScope = el.dataset.v; render(); },
  "scratch-tonote": () => { const sc = scratchNote(); if (!sc || !sc.text.trim()) return; const n = addNote({text: sc.text, projectId: UI.view === "project" ? UI.pid : null, inbox: true}); n.links = arr(sc.links); saveNote(n); sc.links = []; editNote(sc, ""); render(); toast(t("dock.kept"), "ok"); },
  "pt-link": el => {
    const tg = str(el.dataset.t);
    if (tg.startsWith("view:")){ UI.view = tg.slice(5); render(); return; }
    const [, pid, ph, ...ref] = tg.split(":"); const r = ref.join(":");
    if (!WS.projects.find(x => x.id === pid)) return;
    openProject(pid, ph); if (r){ setPhase(ph, {id: r}); UI.open.add(r); UI.flashRef = r; } render();
  }
});
{ const orig = ACTIONS["toggle-drawer"]; ACTIONS["toggle-drawer"] = (el, e) => { orig(el, e); dockSave(); }; }
{ const orig = ACTIONS["panel"]; ACTIONS["panel"] = (el, e) => { orig(el, e); dockSave(); }; }
/* drag the panel's left edge to resize it (280–720 px) */
document.addEventListener("mousedown", e => {
  const g = e.target.closest && e.target.closest("[data-grip]"); if (!g) return; e.preventDefault();
  const app = document.querySelector(".app"); const x0 = e.clientX, w0 = num(UI.dockW, 360);
  const move = ev => { UI.dockW = clamp(w0 + (x0 - ev.clientX), 280, 720); if (app) app.style.setProperty("--dockw", UI.dockW + "px"); };
  const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); dockSave(); };
  document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
});
/* select text in PT → "Add to note" appears next to it; the quote goes into the scratch pad with a link back */
let CLIP = null;
function clipHide(){ const b = document.getElementById("clipbtn"); if (b) b.remove(); CLIP = null; }
document.addEventListener("mouseup", e => {
  if (e.target.closest && e.target.closest("#clipbtn")) return;
  setTimeout(() => {
    if (!UI.unlocked || !WS.id) return;
    const s = window.getSelection && window.getSelection(); const txt = s ? str(s.toString()).trim() : "";
    const a = document.activeElement;
    if (!txt || txt.length < 3 || (a && a.matches && a.matches("input,textarea")) || !s.rangeCount){ clipHide(); return; }
    const node = s.anchorNode; const host = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!host || !host.closest(".main, .drawer .dr-body, .modal") || host.closest(".scratch")){ clipHide(); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    CLIP = {text: txt.slice(0, 4000), src: clipSource(node)};
    let b = document.getElementById("clipbtn"); if (!b){ b = document.createElement("button"); b.id = "clipbtn"; b.className = "btn sm primary clipbtn"; b.type = "button"; document.body.appendChild(b); b.addEventListener("mousedown", ev => ev.preventDefault()); b.addEventListener("click", clipNow); }
    b.innerHTML = `${ic("note")}${esc(t("dock.clip"))}`;
    b.style.top = Math.max(8, r.top - 40) + "px"; b.style.left = Math.min(window.innerWidth - 160, Math.max(8, r.left + r.width / 2 - 60)) + "px";
  }, 10);
});
document.addEventListener("scroll", () => clipHide(), true);
function clipNow(){
  if (!CLIP) return; const sc = scratchNote(); if (!sc) return;
  const quote = CLIP.text.split("\n").map(l => "> " + l).join("\n");
  // readable text in the pad; the link back is kept next to it and shown as a button under the pad
  const line = `${quote}\n— ${CLIP.src.label} · ${fmtDate(now())}\n`;
  sc.links = [...arr(sc.links).filter(l => l.target !== CLIP.src.target), {target: CLIP.src.target, label: CLIP.src.label, at: now()}].slice(-20);
  editNote(sc, (sc.text ? sc.text.replace(/\s*$/, "") + "\n\n" : "") + line); saveNote(sc);
  try{ window.getSelection().removeAllRanges(); }catch(e){}
  clipHide(); UI.drawer = true; UI.panelTab = "notes"; dockSave(); render(); toast(t("dock.clipped"), "ok");
  const ta = document.getElementById("scratch"); if (ta) ta.scrollTop = ta.scrollHeight;
}
/* the blueprint re-places its labels when the window size changes or the fonts finish loading */
{ let rz = null; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { try{ drawMaps(); }catch(e){} }, 150); }); try{ document.fonts && document.fonts.ready.then(() => { try{ drawMaps(); }catch(e){} }); }catch(e){} }

/* ---------- 1.3 help level and tips ---------- */
Object.assign(ACTIONS, {
  "set-help": el => { const v = el.dataset.v; if (!["learn","guided","pro"].includes(v)) return; WS.settings.help = v; WS.settings.guided = v !== "pro"; saveWs(); render(); },
  "set-guided": el => ACTIONS["set-help"]({dataset: {v: el.dataset.v === "1" ? "guided" : "pro"}}),

});

/* ---------- 1.3 PIN (C4): stored with PBKDF2 + salt, recovery code shown once, slower after wrong tries, never locks forever ----------
   The PIN only separates people who share one Claude login; it is not encryption. Recovery, in order: the recovery code,
   the owner (first workspace) with their own PIN, or a reset that waits 24 hours and is visible to everyone on this login. */
const PIN_IT = 600000;
function pinWeak(v){ v = str(v); return v.length < 4 ? t("ws.pinshort") : (/^(\d)\1+$/.test(v) || "0123456789".includes(v) || "9876543210".includes(v)) ? t("pin.weak") : ""; }
/* which PIN fields this window changed (the save merge keeps the other window's values for the rest) */
const PIN_TOUCHED = new Map();
function pinTouch(w, g){ const s = PIN_TOUCHED.get(w.id) || new Set(); s.add(g); PIN_TOUCHED.set(w.id, s); }
const b64 = u8 => btoa(String.fromCharCode(...u8)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pbkdf2(secret, salt, it = PIN_IT){ const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name: "PBKDF2", hash: "SHA-256", salt, iterations: it}, k, 256)); }
async function pinRecord(secret){ const salt = crypto.getRandomValues(new Uint8Array(16)); return "pbkdf2$" + PIN_IT + "$" + b64(salt) + "$" + b64(await pbkdf2(secret, salt)); }
async function pinMatches(rec, secret, wid){
  if (!rec) return false;
  if (rec.startsWith("pbkdf2$")){ const [, it, s, h] = rec.split("$"); const got = b64(await pbkdf2(secret, unb64(s), num(it, PIN_IT))); return got === h; }
  return rec === await sha256(wid + ":" + secret);   // before 1.3
}
function newRecoveryCode(){ const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const r = crypto.getRandomValues(new Uint8Array(12)); const c = [...r].map(x => A[x % A.length]).join(""); return c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8); }
const normCode = c => str(c).toUpperCase().replace(/[^A-Z0-9]/g, "");
function pinWait(w){ const u = w.pinUntil ? new Date(w.pinUntil).getTime() - Date.now() : 0; return u > 0 ? Math.ceil(u / 1000) : 0; }
function pinFailed(w){ pinTouch(w, "fails"); w.pinFails = (w.pinFails || 0) + 1; const n = w.pinFails - 4; if (n > 0){ const secs = [30, 60, 300, 900][Math.min(n - 1, 3)]; w.pinUntil = new Date(Date.now() + secs * 1000).toISOString(); } saveMeta(); }
async function setPin(w, v){
  w.pinHash = await pinRecord(v); const code = newRecoveryCode(); w.pinRec = await pinRecord(normCode(code));
  w.pinFails = 0; w.pinUntil = null; w.pinResetAt = null; ["hash", "fails", "reset"].forEach(g => pinTouch(w, g)); saveMeta();
  // the code is shown once and cannot be clicked away by accident; on the lock screen it waits until the workspace is open
  UI.pinCode = {kind: "pincode", code, ws: w.id, sticky: true};
  if (!UI.pendingPinCode){ UI.modal = UI.pinCode; UI.pinCode = null; } render();
}
FORMS["unlock"] = async () => {
  const w = META.workspaces.find(x => x.id === UI.lockFor); if (!w) return;
  if (pinWait(w)){ render(); return; }
  const v = ($("#pin") || {}).value || ""; UI.pinBusy = true; render();
  const ok = await pinMatches(w.pinHash, v, w.id); UI.pinBusy = false;
  if (ok){ if (!w.pinHash.startsWith("pbkdf2$")){ w.pinHash = await pinRecord(v); pinTouch(w, "hash"); } pinTouch(w, "fails"); if (w.pinResetAt) pinTouch(w, "reset"); w.pinFails = 0; w.pinUntil = null; if (w.pinResetAt){ w.pinResetAt = null; w.pinResetBy = null; } saveMeta(); UI.pinError = false; UI.lockFor = null; UI.pinForgot = null; openWorkspace(w.id); }
  else { pinFailed(w); UI.pinError = true; render(); focusSoon("pin"); }
};
ACTIONS["ws-pin"] = el => { const w = META.workspaces.find(x => x.id === el.dataset.id); promptBox(t("ws.setpin"), {type: "password", ph: t("lock.pin"), help: t("pin.help2")}, async v => { v = str(v); const why = pinWeak(v); if (why){ toast(why, "err"); ACTIONS["ws-pin"](el); return; } await setPin(w, v); toast(t("ws.pinset"), "ok"); }); };
{ const orig = ACTIONS["ws-unpin"]; ACTIONS["ws-unpin"] = el => { const w = META.workspaces.find(x => x.id === el.dataset.id); if (w){ ["hash", "fails", "reset"].forEach(g => pinTouch(w, g)); w.pinRec = null; w.pinResetAt = null; w.pinFails = 0; w.pinUntil = null; } orig(el); }; }
Object.assign(ACTIONS, {
  "pin-forgot": () => { UI.pinForgot = {step: "menu"}; render(); },
  "pin-forgot-back": () => { UI.pinForgot = null; render(); focusSoon("pin"); },
  "pin-use-code": async () => {
    const w = META.workspaces.find(x => x.id === UI.lockFor); const c = normCode(($("#pin-code") || {}).value);
    if (!w || !c) return; if (pinWait(w)){ render(); return; }
    UI.pinBusy = true; render(); const ok = w.pinRec && await pinMatches(w.pinRec, c, w.id); UI.pinBusy = false;
    if (!ok){ pinFailed(w); UI.pinForgot = {step: "code", error: true}; render(); return; }
    UI.pinForgot = {step: "new", ws: w.id}; render(); focusSoon("pin-new");
  },
  "pin-owner": async () => {
    const w = META.workspaces.find(x => x.id === UI.lockFor), o = META.workspaces[0]; if (!w || !o || o.id === w.id) return;
    if (o.pinHash){ const v = ($("#pin-owner") || {}).value || ""; if (pinWait(o)){ render(); return; } UI.pinBusy = true; render(); const ok = await pinMatches(o.pinHash, v, o.id); UI.pinBusy = false; if (!ok){ pinFailed(o); UI.pinForgot = {step: "owner", error: true}; render(); return; } }
    else { UI.pinForgot = {step: "owner", error: true, nopin: true}; render(); return; }   // an owner without a PIN cannot vouch: use the 24-hour reset
    UI.pinForgot = {step: "new", ws: w.id}; render(); focusSoon("pin-new");
  },
  "pin-delay": () => { const w = META.workspaces.find(x => x.id === UI.lockFor); if (!w) return; pinTouch(w, "reset"); w.pinResetAt = new Date(Date.now() + 24 * 3600e3).toISOString(); w.pinResetBy = now(); saveMeta(); UI.pinForgot = {step: "delay"}; render(); },
  "pin-delay-cancel": el => { const w = META.workspaces.find(x => x.id === el.dataset.id); if (!w) return; pinTouch(w, "reset"); w.pinResetAt = null; w.pinResetBy = null; saveMeta(); render(); toast(t("pin.cancelled"), "ok"); },
  "pin-set-new": async () => {
    const w = META.workspaces.find(x => x.id === UI.lockFor); const v = str(($("#pin-new") || {}).value);
    if (!w || !UI.pinForgot || UI.pinForgot.step !== "new" || UI.pinForgot.ws !== w.id) return;   // only for the workspace that was just verified
    const why = pinWeak(v); if (why){ toast(why, "err"); return; }
    UI.pendingPinCode = true; await setPin(w, v); UI.pinForgot = null; UI.lockFor = null; openWorkspace(w.id);
  },
  "pincode-done": () => { UI.modal = null; UI.pinCode = null; render(); }
});
/** a delayed reset that has waited 24 hours lets the person in to choose a new PIN */
function pinResetReady(w){ return w && w.pinResetAt && new Date(w.pinResetAt).getTime() <= Date.now(); }
function pinLockExtras(w){
  const wait = pinWait(w), f = UI.pinForgot;
  const waitMsg = wait ? `<p class="small" style="color:var(--warn)">${esc(t("pin.wait", {s: wait}))}</p>` : "";
  if (pinResetReady(w) && (!f || f.step !== "new")) return `${waitMsg}<div class="panel flat stack"><b>${esc(t("pin.ready"))}</b><input type="password" id="pin-new" inputmode="numeric" autocomplete="new-password" placeholder="${esc(t("pin.newph"))}">${btn("pin-ready-set", t("pin.setnew"), {cls: "sm primary"})}</div>`;
  if (!f) return `${waitMsg}${w.pinResetAt ? `<p class="small muted">${esc(t("pin.pending", {d: fmtDate(w.pinResetAt)}))}</p>` : ""}<button class="btn sm ghost" type="button" data-a="pin-forgot">${esc(t("pin.forgot"))}</button>`;
  const o = META.workspaces[0], ownerOther = o && o.id !== w.id;
  if (f.step === "menu") return `<div class="panel flat stack"><b>${esc(t("pin.forgot"))}</b>
    ${w.pinRec ? `<button class="btn sm" type="button" data-a="pin-step" data-v="code">${esc(t("pin.bycode"))}</button>` : ""}
    ${ownerOther ? `<button class="btn sm" type="button" data-a="pin-step" data-v="owner">${esc(t("pin.byowner", {o: wsLabel(o.name)}))}</button>` : ""}
    <button class="btn sm ghost" type="button" data-a="pin-delay">${esc(t("pin.bydelay"))}</button>
    <p class="hint">${esc(t("pin.nodata"))}</p><button class="btn xs ghost" type="button" data-a="pin-forgot-back">${esc(t("btn.back"))}</button></div>`;
  if (f.step === "code") return `<div class="panel flat stack"><b>${esc(t("pin.bycode"))}</b><input type="text" id="pin-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX">${f.error ? `<p class="small" style="color:var(--crit)">${esc(t("pin.codewrong"))}</p>` : ""}${waitMsg}<div class="row">${btn("pin-use-code", t("pin.check"), {cls: "sm primary"})}<button class="btn sm ghost" type="button" data-a="pin-forgot">${esc(t("btn.back"))}</button></div></div>`;
  if (f.step === "owner") return `<div class="panel flat stack"><b>${esc(t("pin.byowner", {o: wsLabel(o.name)}))}</b>${f.nopin ? `<p class="small">${esc(t("pin.ownernopin", {o: wsLabel(o.name)}))}</p>` : `<input type="password" id="pin-owner" inputmode="numeric" autocomplete="off" placeholder="${esc(t("pin.ownerph", {o: wsLabel(o.name)}))}">`}${f.error && !f.nopin ? `<p class="small" style="color:var(--crit)">${esc(t("lock.wrong"))}</p>` : ""}${waitMsg}<div class="row">${f.nopin ? btn("pin-delay", t("pin.bydelay"), {cls: "sm"}) : btn("pin-owner", t("pin.check"), {cls: "sm primary"})}<button class="btn sm ghost" type="button" data-a="pin-forgot">${esc(t("btn.back"))}</button></div></div>`;
  if (f.step === "delay") return `<div class="panel flat stack"><b>${esc(t("pin.delayset"))}</b><p class="small">${esc(t("pin.delaytext", {d: fmtDate(w.pinResetAt)}))}</p><button class="btn xs ghost" type="button" data-a="pin-forgot-back">${esc(t("btn.back"))}</button></div>`;
  if (f.step === "new") return `<div class="panel flat stack"><b>${esc(t("pin.setnew"))}</b><input type="password" id="pin-new" inputmode="numeric" autocomplete="new-password" placeholder="${esc(t("pin.newph"))}"><div class="row">${btn("pin-set-new", t("pin.setnew"), {cls: "sm primary"})}</div></div>`;
  return "";
}
ACTIONS["pin-step"] = el => { UI.pinForgot = {step: el.dataset.v}; render(); focusSoon(el.dataset.v === "code" ? "pin-code" : "pin-owner"); };
ACTIONS["pin-ready-set"] = () => { const w = META.workspaces.find(x => x.id === UI.lockFor); if (!pinResetReady(w)) return; UI.pinForgot = {step: "new", ws: w.id}; ACTIONS["pin-set-new"](); };
/* leaving the PIN screen in any way forgets an unfinished recovery */
for (const name of ["lock-back", "pick-ws", "ws-open"]){ const orig = ACTIONS[name]; if (orig) ACTIONS[name] = (el, e) => { UI.pinForgot = null; return orig(el, e); }; }
/** banner on every workspace of this login while a PIN reset is waiting (so the other person notices) */
function pinResetBanner(){ const ws = META.workspaces.filter(w => w.pinResetAt && !pinResetReady(w)); return ws.map(w => `<div class="offbar row">${ic("lock")} <span style="flex:1">${esc(t("pin.banner", {w: wsLabel(w.name), d: fmtDate(w.pinResetAt)}))}</span>${w.id === WS.id ? btn("pin-delay-cancel", t("pin.cancel"), {cls: "sm", attrs: `data-id="${w.id}"`}) : ""}</div>`).join(""); }
function pinCodeModal(m){ return `<h2>${esc(t("pin.codetitle"))}</h2><p>${esc(t("pin.codetext"))}</p><div class="panel flat" style="text-align:center"><b class="mono" style="font-size:22px;letter-spacing:2px">${esc(m.code)}</b></div><div class="row end">${btn("copy-text", t("btn.copy"), {cls: "sm", attrs: `data-text="${esc(m.code)}"`})}${btn("pincode-done", t("pin.saved"), {cls: "sm primary"})}</div>`; }
ACTIONS["copy-text"] = el => copyText(str(el.dataset.text));
ACTIONS["item-unflag"] = el => { const p = curP(); probSnap(p); unflag(p, el.dataset.ref); markRef(p, el.dataset.ref, "confirmed"); touch(p); render(); toastUndo(t("it.stillok.done")); afterChange(p); };

/* 1.4.2: a field belongs to the box of the button that was clicked. Read it there first (never the first match on the page). */
function nearField(el, sel){
  const box = el && el.closest && el.closest(".askbox, .proposal, .editbox, .insp, .irow, .item, .modal, .panel, form");
  return (box && box.querySelector(sel)) || document.querySelector(sel);
}
/* the box opens where its button was pressed: in the inspector or in the list */
for (const name of ["item-tool", "item-edit", "item-why", "item-research"]){ const orig = ACTIONS[name]; if (!orig) continue;
  ACTIONS[name] = (el, e) => { UI.boxHost = el && el.closest && el.closest(".insp") ? "insp" : "main"; return orig(el, e); }; }
