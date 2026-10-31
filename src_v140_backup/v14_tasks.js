/* ===================== 1.4 TASKS THAT NEVER THROW AWAY YOUR WORK =====================
   Requirements: the first draft is written directly (marked "Decided by PT"); a redo becomes a proposal list:
   your confirmed and edited requirements are kept, ids are never reused, nothing is removed without your tick. */
async function aiRequirements(p, {assumed = true} = {}){
  const had = arr(p.requirements).length > 0;
  const prompt = buildPrompt("requirements", {proj: p, rules: ["spec","golden","funnel","evals"], platform: true, context: projectContext(p),
    body: `Write the requirements for this solution as testable GIVEN / WHEN / THEN statements, prioritised must / should / could. Cover function, flow, outputs, look, quality bars and guardrails. Every requirement serves at least one goal criterion (give their ids in "crit"). Then write the explicit out-of-scope list and a short constitution (3-7 non-negotiable principles). Each requirement must be checkable by a test. Match the amount of specification to the size of the project.
${had ? `The project already has requirements (in <project>). Return the complete list as it should be now: keep the id of every requirement you keep or change ("id"), leave "id" empty for new ones, and list the ids you would remove under "remove" with one sentence why. Keep the wording of requirements that are still right.` : ""}`,
    schema: `{"requirements":[{"id":"R1 or empty","title":"short name","given":"…","when":"…","then":"…","priority":"must|should|could","dim":"scope","crit":["C1"]}],"remove":[{"id":"R7","why":"…"}],"outOfScope":["…"],"constitution":["…"]}`});
  const r = await runAI("require", t("req.running"), prompt, {pid: p.id, step: "require", validate: o => arr(o.requirements).filter(x => str(x.then).trim()).length > 0});
  if (!r) return null;
  const crits = new Set(arr(p.goal && p.goal.criteria).map(c => c.id));
  const clean = x => ({title: str(x.title), given: str(x.given), when: str(x.when), then: str(x.then), priority: oneOf(x.priority, ["must","should","could"], "should"), dim: str(x.dim), critIds: arr(x.crit).map(str).filter(c => crits.has(c))});
  if (!had){
    snapshot(p, t("rp.before", {x: t("req.title")}));
    for (const x of arr(r.requirements).filter(x => str(x.then).trim())){ const id = nextReqId(p); p.requirements.push(Object.assign({id, st: assumed ? "assumed" : "ok"}, clean(x))); markPT(p, "req:" + id, "added", t("why.reqs")); }
    p.outOfScope = arr(r.outOfScope).map(str); p.constitution = arr(r.constitution).map(str);
    logAct(p, t("act.ai", {x: t("req.title")}), {step: "require"});
    touch(p); render(); return r;
  }
  // a redo: a list of proposals, nothing changes until you apply it
  const items = [], seen = new Set();
  for (const x of arr(r.requirements).filter(x => str(x.then).trim())){
    const nx = clean(x);
    let cur = str(x.id) && arr(p.requirements).find(q => q.id === str(x.id));
    if (!cur) cur = arr(p.requirements).find(q => !seen.has(q.id) && similar(reqText(q), reqText(nx)));
    if (cur){
      seen.add(cur.id);
      const fields = {}; for (const f of ["title","given","when","then","priority"]) if (str(nx[f]) && str(nx[f]) !== str(cur[f])) fields[f] = nx[f];
      if (Object.keys(fields).length) items.push({ref: "req:" + cur.id, action: "update", why: t("rd.redo.upd"), fields, on: !handEditedRef(p, "req:" + cur.id) && cur.st !== "ok", mine: handEditedRef(p, "req:" + cur.id) || cur.st === "ok", edit: {}, crit: nx.critIds});
      else if (nx.critIds.length && nx.critIds.join() !== arr(cur.critIds).join()) items.push({ref: "req:" + cur.id, action: "link", why: t("rd.redo.link", {c: nx.critIds.join(", ")}), fields: {}, on: true, edit: {}, crit: nx.critIds});
    } else items.push({ref: "req:new" + items.length, action: "add", why: t("rd.redo.add"), fields: nx, on: true, edit: {}, isNew: true});
  }
  for (const x of arr(r.remove)){ const cur = arr(p.requirements).find(q => q.id === str(x.id)); if (!cur || seen.has(cur.id)) continue; const mine = handEditedRef(p, "req:" + cur.id) || cur.st === "ok" || cur.manual; items.push({ref: "req:" + cur.id, action: "remove", why: str(x.why) || t("rd.redo.rem"), fields: {}, on: !mine, mine, edit: {}}); }
  UI.review = {mode: "redo", pid: p.id, items, summary: t("rd.redo.sum", {a: items.filter(x => x.action === "add").length, u: items.filter(x => x.action === "update").length, r: items.filter(x => x.action === "remove").length}), decision: t("req.title"), oos: arr(r.outOfScope).map(str), cons: arr(r.constitution).map(str)};
  UI.modal = {kind: "review", wide: true}; render();
  return r;
}
/* the proposal list of a redo: applied in one action with one Undo */
{ const orig = ACTIONS["rv-apply"]; ACTIONS["rv-apply"] = el => {
  const p = curP(), r = UI.review; if (!p || !r || r.pid !== p.id) return;
  if (r.mode !== "redo") return orig(el);
  const on = r.items.filter(x => x.on); let n = 0;
  for (const x of on){
    if (x.action === "add"){ const f = Object.assign({}, x.fields); for (const [k, v] of Object.entries(x.edit || {})) f[k] = v; const id = nextReqId(p); p.requirements.push(Object.assign({id, st: "assumed"}, f)); markPT(p, "req:" + id, "added", t("why.reqs")); markNew(p, "req:" + id); n++; continue; }
    const [, id] = x.ref.split(":"); const cur = arr(p.requirements).find(q => q.id === id); if (!cur) continue;
    if (x.action === "remove"){ p.requirements = p.requirements.filter(q => q.id !== id); for (const tt of arr(p.tests)) tt.reqIds = arr(tt.reqIds).filter(q => q !== id); unflag(p, x.ref); n++; continue; }
    if (x.action === "update"){ const f = {}; for (const [k, v] of Object.entries(x.fields)) f[k] = x.edit[k] != null ? x.edit[k] : v; applyFields(p, x.ref, f); cur.st = "assumed"; markPT(p, x.ref, "changed", x.why); markDownstream(p, x.ref); n++; }
    if (arr(x.crit).length) cur.critIds = [...new Set(x.crit)];
    if (x.action === "link") n++;
  }
  if (arr(r.oos).length) p.outOfScope = r.oos; if (arr(r.cons).length) p.constitution = r.cons;
  logAct(p, t("rd.redo.done", {n}), {step: "require", important: true});
  r.applied = n; touch(p); render(); toastUndo(t("ch.appliedt", {n})); afterChange(p);
}; }
/** the parts were drawn for one option and another was chosen: draw the parts for the chosen one */
async function aiArchRedraw(p){
  const a = p.arch, opt = arr(a.options).find(o => o.id === a.chosen); if (!opt) return null;
  const prompt = buildPrompt("arch-redraw", {proj: p, rules: ["simple","multi","delegate","state","trifecta","reversible","projects"], platform: true, context: projectContext(p),
    body: `The person chose the option "${opt.name}" (${opt.kind}${opt.rung ? ", " + opt.rung : ""}): ${opt.summary}
The parts currently drawn belong to another option. Draw the parts for the chosen option: components (kind ai | code | hybrid | human | platform; plain code for exact rules, AI only for open-ended parts), the requirement ids each serves, how they connect, the human steps, the data plan and a rough usage estimate per run. Reuse a current component (same id) when it stays the same.`,
    schema: `{"components":[{"id":"c1","name":"…","kind":"ai","role":"…","inputs":"…","outputs":"…","reason":"…","reqIds":["R1"],"model":"…"}],"links":[{"from":"c1","to":"c2","label":"…"}],"humanSteps":["…"],"dataPlan":[{"source":"…","freshness":"…","legal":"…","risk":"…"}],"costEstimate":"…"}`});
  const r = await runAI("arch", t("arch.redrawing", {x: opt.name}), prompt, {pid: p.id, step: "arch", validate: o => arr(o.components).length > 0});
  if (!r) return null;
  snapshot(p, t("arch.redraw"), {restore: true});
  a.components = arr(r.components).map((c, i) => ({id: str(c.id) || "c" + (i + 1), name: str(c.name), kind: oneOf(c.kind, ["ai","code","hybrid","human","platform"], "ai"), role: str(c.role), inputs: str(c.inputs), outputs: str(c.outputs), reason: str(c.reason), reqIds: arr(c.reqIds).map(str), model: str(c.model)}));
  a.links = arr(r.links).map(l => ({from: str(l.from), to: str(l.to), label: str(l.label)}));
  a.humanSteps = arr(r.humanSteps).map(str); a.dataPlan = arr(r.dataPlan).map(d => ({source: str(d.source), freshness: str(d.freshness), legal: str(d.legal), risk: str(d.risk)})); a.costEstimate = str(r.costEstimate);
  a.drawnFor = a.chosen;
  for (const c of a.components) markPT(p, "component:" + c.id, "added", t("why.archpart"));
  for (const sx of arr(p.pkg.sections)) flag(p, "section:" + sx.id, t("arch.title"), t("lk.fromarch"));
  logAct(p, t("act.archredraw", {x: opt.name}), {step: "arch", important: true});
  touch(p); render(); return r;
}
Object.assign(ACTIONS, {
  "requirements": () => { const p = curP(); costGuard(p, "requirements", () => aiRequirements(p)); },
  "arch-redraw": () => aiArchRedraw(curP()),
  "arch-choose": el => { const p = curP(); const o = arr(p.arch.options).find(x => x.id === el.dataset.id); if (!o) return;
    const prev = p.arch.chosen; p.arch.chosen = o.id; p.arch.chosenAssumed = false; if (!p.arch.drawnFor) p.arch.drawnFor = p.arch.recommended;
    markRef(p, "arch:choice", "decided"); logDecision(p, t("arch.title"), o.name, o.id === p.arch.recommended ? p.arch.why : t("dec.override"));
    if (prev && prev !== o.id) for (const sx of arr(p.pkg.sections)) flag(p, "section:" + sx.id, t("arch.title"), t("lk.fromarch"));
    touch(p); render(); toastUndo(t("arch.chosenmsg", {name: o.name})); afterChange(p); }
});
