/* ===================== 1.4 SAFE CHANGE ENGINE =====================
   When you change something, PT shows how many items depend on it. The default is "Save and update affected":
   PT proposes the update of every DIRECT dependent (old → new, "no change needed" allowed, your own edits unticked),
   you apply the ticked ones in one go with one Undo, then the next layer if there is one (at most 3 layers).
   "Save only this" marks the dependents "May need updating" instead. */
const MAX_LAYERS = 3;
function depCount(p, ref){ return depsOf(p, ref).filter(d => d.ref !== "ns" && d.ref !== "intake:clean").length; }
/** the buttons at the end of an edit: what happens to the items that depend on this one */
function editDoneButtons(p, ref){
  const st = UI.editStart && UI.editStart.ref === ref ? UI.editStart : null;
  const changed = st && st.text !== itemSnapshotText(p, ref);
  const n = changed ? depCount(p, ref) : 0;
  if (!changed || !n) return `<button class="btn sm primary" data-a="item-edit-done">${ic("check")}${esc(t("it.done"))}</button>`;
  return `<button class="btn sm primary" data-a="edit-save-update" data-ref="${esc(ref)}" title="${esc(t("ch.update.tip"))}">${ic("check")}${esc(t("ch.update", {n}))}</button><button class="btn sm" data-a="edit-save-mark" data-ref="${esc(ref)}" title="${esc(t("ch.mark.tip"))}">${esc(t("ch.mark", {n}))}</button>`;
}
/** what changed in the source items, for the AI (before → after) */
function changeNote(p, refs, before){ return refs.map(r => ({ref: r, before: trunc(str(before && before[r]), 6000), now: trunc(targetText(p, r), 6000)})); }
/** the marked items ("may need updating"): PT checks them all in one go; with auto, what is safe is applied (Finish) */
async function aiUpdateAffected(p, {auto = false} = {}){
  const fl = arr(p.flags).filter(f => itemExists(p, f.ref)); if (!fl.length) return {applied: 0};
  for (const f of arr(p.flags).filter(f => !itemExists(p, f.ref))) unflag(p, f.ref);   // marks of removed items go away
  const out = {applied: 0, review: 0, next: []};
  for (let i = 0; i < fl.length; i += 25){
    const chunk = fl.slice(i, i + 25), refs = chunk.map(f => f.ref);
    const r = await aiAffected(p, refs, [], null, chunk.map(f => ({ref: f.ref, because: str(f.because), why: str(f.why)})));
    if (!r) break;
    const rows = r.items.map(x => Object.assign(x, {on: x.action === "update" ? !handEditedRef(p, x.ref) : x.action === "ok", mine: handEditedRef(p, x.ref), edit: {}}));
    if (!auto){ UI.review = {mode: "affected", pid: p.id, items: rows, summary: r.summary, layer: 1, src: [], decision: [...new Set(chunk.map(f => f.because).filter(Boolean))].slice(0, 3).join(", ")}; UI.modal = {kind: "review", wide: true}; render(); return out; }
    actOpen(p, t("ch.act", {n: rows.length}), {by: "pt"});
    for (const x of rows){
      if (x.action === "ok"){ unflag(p, x.ref); markPT(p, x.ref, "confirmed", x.why); continue; }
      if (x.action === "update" && !x.mine && applyFields(p, x.ref, x.fields)){ unflag(p, x.ref); markPT(p, x.ref, "updated", x.why); out.applied++; out.next.push(x.ref); if (x.ref.startsWith("section:")){ const s0 = itemObj(p, x.ref); if (s0) s0.mirror = ""; } continue; }
      out.review++;
    }
    actClose(p.id);
  }
  if (out.next.some(r => r.startsWith("section:"))) saveVersion(p, t("ch.version"));
  touch(p); render();
  return out;
}
/** AI: for each direct dependent, is it still right, or how must it change? */
async function aiAffected(p, refs, srcRefs, before, reasons = null){
  const digest = refs.map(r => ({ref: r, kind: itemKindOf(r), fields: Object.fromEntries((ITEM_FIELDS[itemKindOf(r)] || []).map(f => { const o = itemObj(p, r) || {}; return [f, Array.isArray(o[f]) ? o[f] : str(o[f])]; })), why: srcRefs.length ? (depsOf(p, srcRefs[0]).find(d => d.ref === r) || {}).why || "" : ""}));
  const prompt = buildPrompt("affected", {proj: p, pkgEnglish: refs.some(r => r.startsWith("section:")), rules: ["spec","golden","short"], context: projectContext(p),
    body: `${srcRefs.length ? `Something the items below depend on was changed:\n<changed>${JSON.stringify(changeNote(p, srcRefs, before))}</changed>` : `These items were marked "may need updating" because something they depend on changed:\n<reasons>${JSON.stringify(reasons || [])}</reasons>\nUse the project as it is now to decide.`}
For each item below decide:
- "ok": still correct as it is (most items are; say so when nothing needs to change),
- "update" with "fields": the complete new value of only the fields that must change so the item follows the change (package sections: the complete section, never shortened),
- "review": only when you cannot decide without the person; say what to look at.
Change as little as possible and keep the person's wording where it still fits.
<items>${jsonFit(digest, 140000, x => x.ref)}</items>`,
    schema: `{"items":[{"ref":"req:R3","action":"ok|update|review","why":"one sentence","fields":{}}],"summary":"one sentence"}`});
  const r = await runAI("affected", t("ch.checking", {n: refs.length}), prompt, {pid: p.id, step: "check", validate: o => o && Array.isArray(o.items) && o.items.length > 0});
  if (!r) return null;
  const known = new Set(refs);
  const items = arr(r.items).filter(x => known.has(str(x.ref))).map(x => {
    const ref = str(x.ref), action = oneOf(x.action, ["ok","update","review"], "review");
    let fields = x.fields && typeof x.fields === "object" ? x.fields : {};
    // a package section that comes back much shorter was cut: it is shown for review, never applied
    if (action === "update" && ref.startsWith("section:")){ const o = itemObj(p, ref); if (o && str(fields.content).length < str(o.content).length * 0.6) return {ref, why: str(x.why) + " · " + t("ch.short"), action: "review", fields: {}}; }
    return {ref, why: str(x.why), action: action === "update" && !Object.keys(fields).length ? "review" : action, fields};
  });
  // anything the AI did not answer stays for review
  for (const ref of refs) if (!items.some(x => x.ref === ref)) items.push({ref, why: t("ch.noanswer"), action: "review", fields: {}});
  return {summary: str(r.summary), items};
}
/** your own edits are never overwritten without your tick */
function handEditedRef(p, ref){ const m = p.marks && p.marks[ref]; return !!m && (m.by || "you") === "you" && ["edited","added","answered","changed","fixed"].includes(m.w); }
/** start "update affected" for a change of these items: the proposal list opens; nothing changes until you apply it */
async function updateAffected(p, srcRefs, {before = null, layer = 1, auto = false, skip = []} = {}){
  const deps = [...new Set(srcRefs.flatMap(r => depsOf(p, r).map(d => d.ref)))].filter(r => !srcRefs.includes(r) && r !== "ns" && r !== "intake:clean" && !skip.includes(r));
  if (!deps.length){ if (!auto) toast(t("ch.none"), "ok"); return {applied: 0, next: []}; }
  const out = {applied: 0, next: [], review: 0};
  for (let i = 0; i < deps.length; i += 25){
    const chunk = deps.slice(i, i + 25);
    const r = await aiAffected(p, chunk, srcRefs, before);
    if (!r){ for (const ref of chunk) flag(p, ref, srcRefs.map(x => refLabel(p, x)).join(", "), t("ch.notchecked")); touch(p); render(); continue; }
    const rows = r.items.map(x => Object.assign(x, {on: x.action === "update" ? !handEditedRef(p, x.ref) : x.action === "ok", mine: handEditedRef(p, x.ref), edit: {}}));
    if (auto){
      // Finish: apply what is safe (updates of items you did not edit yourself, "still correct"), the rest stays marked for you
      actOpen(p, t("ch.act", {n: rows.length}), {by: "pt"});
      for (const x of rows){
        if (x.action === "ok"){ unflag(p, x.ref); continue; }
        if (x.action === "update" && !x.mine){ if (applyFields(p, x.ref, x.fields)){ unflag(p, x.ref); markPT(p, x.ref, "updated", x.why); out.applied++; out.next.push(x.ref); if (x.ref.startsWith("section:")){ const s = itemObj(p, x.ref); if (s) s.mirror = ""; } } continue; }
        flag(p, x.ref, srcRefs.map(y => refLabel(p, y)).join(", "), x.why); out.review++;
      }
      actClose(p.id);
      continue;
    }
    UI.review = {mode: "affected", pid: p.id, items: rows, summary: r.summary, layer, src: srcRefs, before, decision: srcRefs.map(x => refLabel(p, x)).join(", ")};
    UI.modal = {kind: "review", wide: true}; render();
    return out;   // the person applies it from the list
  }
  if (out.applied && arr(p.pkg.sections).length && out.next.some(r => r.startsWith("section:"))) saveVersion(p, t("ch.version"));
  touch(p); render();
  return out;
}
/** after applying a layer: the items that really changed may have dependents too (the next layer) */
function nextLayer(p, changedRefs){ return [...new Set(changedRefs.flatMap(r => depsOf(p, r).map(d => d.ref)))].filter(r => !changedRefs.includes(r) && r !== "ns" && r !== "intake:clean"); }

/* ---------- the edit, refine, answer and choice flows offer the same two buttons ---------- */
Object.assign(ACTIONS, {
  "item-edit": el => { const p = curP(); UI.itemBox = null; const ref = el.dataset.ref; if (UI.editRef === ref){ UI.editRef = null; UI.editStart = null; } else { UI.editRef = ref; UI.editStart = {ref, text: itemSnapshotText(p, ref)}; } render(); },
  "item-edit-done": () => { UI.editRef = null; UI.editStart = null; render(); },
  "edit-save-mark": el => { const p = curP(); const ref = el.dataset.ref; actOpen(p, t("ch.mark", {n: depCount(p, ref)})); const n = markDownstream(p, ref).length; actClose(p.id); UI.editRef = null; UI.editStart = null; touch(p); render(); toastUndo(t("ch.marked", {n})); },
  "edit-save-update": el => { const p = curP(); const ref = el.dataset.ref; const before = {[ref]: UI.editStart && UI.editStart.text}; UI.editRef = null; UI.editStart = null; render(); updateAffected(p, [ref], {before}); },
  "rv-next": () => { const p = curP(), r = UI.review; if (!p || !r || !r.nextRefs) return; const src = r.nextRefs; updateAffected(p, src, {layer: (r.layer || 1) + 1, before: r.nextBefore || null}); },
  "mark-show": el => { UI.modal = {kind: "mark", ref: el.dataset.ref}; render(); },
  "mark-undo": el => { const p = curP(); undoAct(p, el.dataset.act); UI.modal = null; render(); }
});
/* "Apply" in the list: the ticked rows in one action with one Undo; then the next layer is offered */
{ const orig = ACTIONS["rv-apply"]; ACTIONS["rv-apply"] = el => {
  const p = curP(), r = UI.review; if (!p || !r || r.pid !== p.id) return;
  if (r.mode !== "affected") return orig(el);
  const on = r.items.filter(x => x.on); if (!on.length) return;
  const changed = [], bf = {};
  for (const x of on) if (x.action === "update") bf[x.ref] = targetText(p, x.ref);
  for (const x of on){
    if (x.action === "ok"){ unflag(p, x.ref); markPT(p, x.ref, "confirmed", x.why); continue; }
    if (x.action === "update"){ const f = {}; for (const [k, v] of Object.entries(x.fields)) f[k] = x.edit[k] != null ? (Array.isArray(v) ? x.edit[k].split("\n").map(s => s.trim()).filter(Boolean) : x.edit[k]) : v; if (applyFields(p, x.ref, f)){ unflag(p, x.ref); markPT(p, x.ref, "updated", x.why); changed.push(x.ref); if (x.ref.startsWith("section:")){ const s = itemObj(p, x.ref); if (s) s.mirror = ""; } } continue; }
    if (x.action === "review") flag(p, x.ref, r.decision || "", x.why);
  }
  // rows you left unticked keep a mark, so nothing is forgotten
  for (const x of r.items.filter(y => !y.on && y.action !== "ok")) flag(p, x.ref, r.decision || "", x.why);
  if (changed.some(ref => ref.startsWith("section:"))) saveVersion(p, t("ch.version"));
  logAct(p, t("ch.applied", {n: changed.length}) + " · " + trunc(r.decision || "", 80), {important: true, kind: "edit"});
  r.applied = on.length;
  const nx = (r.layer || 1) < MAX_LAYERS ? nextLayer(p, changed) : [];
  r.nextRefs = nx.length ? changed : null; r.nextN = nx.length; r.nextBefore = nx.length ? Object.fromEntries(changed.map(rf => [rf, bf[rf] || ""])) : null;
  touch(p); render(); toastUndo(t("ch.appliedt", {n: on.length})); afterChange(p);
}; }

/* ---------- what changed: the mark on an item opens this ---------- */
MODAL14.mark = (m, p, hd) => {
  const ref = m.ref, mk = markOf(p, ref) || {};
  const a = mk.act ? arr(p.acts).find(x => x.id === mk.act) : null;
  const es = a ? a.patch.filter(e => entryRef(e) === ref) : [];
  const txt = v => v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.join("\n") : (ITEM_FIELDS[itemKindOf(ref)] || Object.keys(v)).map(f => v[f] != null ? fieldLabel(f) + ": " + (Array.isArray(v[f]) ? v[f].join(" | ") : str(v[f])) : "").filter(Boolean).join("\n");
  const diff = es.map(e => `<div class="diff">${lineDiff(txt(e.before), txt(e.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("");
  return `${hd(t("mk.title"))}<p><b>${esc(refLabel(p, ref))}</b></p>
    <p class="small">${esc((mk.by === "pt" ? t("mk.pt." + mk.w) : t("mk." + mk.w)))} · ${esc(fmtDate(mk.at))}</p>
    ${mk.why ? `<p class="small"><b>${esc(t("mk.why"))}:</b> ${esc(mk.why)}</p>` : ""}
    ${diff || `<p class="small muted">${esc(a ? t("mk.nodiff") : t("mk.nodiff"))}</p>`}
    <div class="row end">${a && !a.undone ? btn("mark-undo", t("mk.undo"), {icon: "undo", cls: "sm", attrs: `data-act="${esc(a.id)}"`}) : a && a.undone ? `<span class="small muted">${esc(t("mk.undone"))}</span>` : ""}${btn("goto-ref", t("rd.goto"), {cls: "sm ghost", attrs: `data-ref="${esc(ref)}"`})}${btn("modal-close", t("btn.close"), {cls: "sm primary"})}</div>`;
};

/* ---------- cost before heavy runs, and a stop before the budget is exceeded ---------- */
const COST_EST = {"crit-draft": 8, "ex-draft": 8, "crit-link": 3, "finish": 0, "compile": 8, "review": 80, "architecture": 8, "requirements": 8, "interview": 8, "tests-run": 0, "improve": 8};
function weekLeft(){ const u = (WS.settings || {}).usage || {}; const budget = num((WS.settings || {}).weeklyBudget, 400) || 400; return Math.max(0, budget - (u.week === weekKey() ? num(u.units, 0) : 0)); }
function testRunCost(p, trials = TRIALS){ return arr(p.tests).length * trials * (TIER_WEIGHT.default + TIER_WEIGHT.complex + TIER_WEIGHT.default); }
/** run something that costs usage: when it is more than what is left this week, ask first (never silently) */
function costGuard(p, name, run, units = null){
  const n = units != null ? units : name === "tests-run" ? testRunCost(p) : (COST_EST[name] || 3);
  const left = weekLeft();
  const u = (WS.settings || {}).usage || {};
  if (n > left && n > 8 && u.noAsk !== weekKey()){ UI.modal = {kind: "cost", n, left, run}; render(); return; }
  return run();
}
MODAL14.cost = (m, p, hd) => `${hd(t("cost.over.t"))}<p>${esc(t("cost.over", {n: Math.round(m.n), l: Math.round(m.left)}))}</p><p class="small muted">${esc(t("cost.estnote"))}</p>
  <div class="row end"><button class="btn ghost" data-a="modal-close">${esc(t("btn.cancel"))}</button><button class="btn" data-a="cost-go" data-v="noask">${esc(t("cost.noask"))}</button><button class="btn primary" data-a="cost-go">${ic("play")}${esc(t("cost.over.yes"))}</button></div>`;
Object.assign(ACTIONS, {
  "cost-go": el => { const m = UI.modal; if (!m || m.kind !== "cost") return; if (el.dataset.v === "noask"){ WS.settings.usage = Object.assign({}, WS.settings.usage, {noAsk: weekKey()}); if (typeof saveWs === "function") saveWs(); } UI.modal = null; render(); m.run(); }
});

/* the "update affected" list was closed without applying (Cancel, X, Esc, a click outside, another step):
   the dependents that may need a change get the mark "May need updating", so nothing is forgotten */
function settleAffected(){
  const r = UI.review; if (!r || r.mode !== "affected" || r.applied || r.settled || (UI.modal && UI.modal.kind === "review")) return;
  r.settled = true;
  const p = WS.projects && WS.projects.find(x => x.id === r.pid); if (!p) return;
  const rows = arr(r.items).filter(x => x.action !== "ok"); if (!rows.length) return;
  actOpen(p, t("ch.marked", {n: rows.length}), {by: "you"});
  for (const x of rows) flag(p, x.ref, r.decision || "", x.why);
  actClose(p.id); touch(p);
  setTimeout(() => toast(t("ch.marked", {n: rows.length}), ""), 0);
}
