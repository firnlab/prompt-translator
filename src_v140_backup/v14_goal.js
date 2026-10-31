/* ===================== 1.4 THE GOAL AS AN EXECUTABLE, LIVING CONTRACT =====================
   The goal is defined through goal criteria ("When [situation], the result [property]") and graded examples
   (real inputs with a result you mark 👍 or 👎 and say why). Every criterion becomes a test; every requirement serves a
   criterion; "ready" means the criteria pass. New failures become criteria with one click. */
const GOAL_EMPTY = Object.freeze({criteria: Object.freeze([]), examples: Object.freeze([])});
function goalOf(p){
  // reading during a render never changes the project (no phantom "Other changes" step)
  if (RENDERING && !(p.goal && typeof p.goal === "object" && Array.isArray(p.goal.criteria) && Array.isArray(p.goal.examples))) return GOAL_EMPTY;
  p.goal = p.goal && typeof p.goal === "object" ? p.goal : {}; p.goal.criteria = arr(p.goal.criteria); p.goal.examples = arr(p.goal.examples); return p.goal; }
function critById(p, id){ return goalOf(p).criteria.find(c => c.id === id) || null; }
function critTests(p, id){ return arr(p.tests).filter(x => arr(x.critIds).includes(id)); }
/** does the criterion pass in the latest test run of the current draft? pass | fail | open (not checked) */
function critResult(p, id){
  const ts = critTests(p, id); if (!ts.length) return "open";
  const lr = lastRun(p); if (!lr || lr.versionNo !== p.versionNo) return "open";
  const rs = arr(lr.results).filter(x => ts.some(tt => tt.id === x.testId)); if (!rs.length) return "open";
  if (rs.some(x => !x.pass && !needsYou(x))) return "fail";
  // every test of the criterion must have run (a stopped run leaves some open), and nothing waits for your decision
  if (ts.some(tt => !rs.some(x => x.testId === tt.id)) || rs.some(needsYou)) return "open";
  return "pass";
}
/** how many criteria and examples a tool needs: sized to the tool (track) */
function goalSize(p){ const tr = track(p); return tr === "quick" ? {crit: 3, ex: 3} : tr === "full" ? {crit: 8, ex: 5} : {crit: 5, ex: 4}; }

/* ---------- AI: draft criteria, draft sample results, turn grades into criteria, link requirements and tests ---------- */
async function exampleImages(p, list){
  const imgs = [];
  for (const e of list) for (const f of arr(e.files)) if (f.data && /^data:image\//.test(f.data) && (!f.private || UI.privOk === p.id)){ try{ imgs.push(await (await fetch(f.data)).blob()); }catch(err){} }
  return imgs.slice(0, 6);
}
async function aiDraftCriteria(p, {link = true} = {}){
  const g = goalOf(p), sz = goalSize(p);
  const prompt = buildPrompt("goal-criteria", {proj: p, rules: ["spec","evals","golden"], context: projectContext(p),
    body: `Write the goal criteria for this tool: ${sz.crit - 1} to ${sz.crit + 2} statements that together say what a good result is. Each one has the form "When [situation], the result [property]". Rules:
- Each criterion is checkable from the tool's output alone (a test can judge it).
- Two experts reading it would judge the same output the same way; if that is doubtful, set "clear": false and say why in "unclear".
- Mark each as "rule" (a plain rule can check it: format, length, presence of a field, a number range) or "judge" (needs judgement).
- Include at least one negative case ("neg": true: something that must NOT happen) when the tool can do harm or embarrass the person.
- Base them on the goal, the success measure, the graded examples and the person's answers; never invent features.
${g.criteria.length ? "Keep the meaning of the existing criteria; only add what is missing or sharpen an unclear one (return it with its id).\n<existing>" + JSON.stringify(g.criteria.map(c => ({id: c.id, when: c.when, then: c.then, kind: c.kind, neg: !!c.neg}))) + "</existing>" : ""}
${link && arr(p.requirements).length ? "Then link every requirement id to the criteria it serves (\"links\")." : ""}`,
    schema: `{"criteria":[{"id":"C1 only when you sharpen an existing one, else empty","when":"…","then":"…","kind":"rule|judge","neg":false,"clear":true,"unclear":"","fromExamples":["E1"]}],"links":[{"req":"R1","crit":["C1"]}]}`});
  const r = await runAI("goal", t("goal.drafting"), prompt, {pid: p.id, step: "require", images: await exampleImages(p, g.examples), validate: o => o && arr(o.criteria).filter(c => str(c.when).trim() && str(c.then).trim()).length > 0});
  if (!r) return null;
  snapshot(p, t("goal.drafted"));
  const gg = goalOf(p); let added = 0;
  for (const c of arr(r.criteria)){
    if (!str(c.when).trim() || !str(c.then).trim()) continue;
    const cur = str(c.id) && gg.criteria.find(x => x.id === str(c.id));
    if (cur){ if (cur.by === "you" && cur.st !== "assumed") continue; Object.assign(cur, {when: str(c.when), then: str(c.then), kind: oneOf(c.kind, ["rule","judge"], "judge"), neg: !!c.neg, unclear: c.clear === false ? str(c.unclear) || t("goal.unclear") : ""}); markPT(p, "crit:" + cur.id, "changed", t("why.critsharp")); continue; }
    if (gg.criteria.some(x => similar(x.when + " " + x.then, c.when + " " + c.then))) continue;
    const id = nextId(p, "C", gg.criteria);
    gg.criteria.push({id, when: str(c.when), then: str(c.then), kind: oneOf(c.kind, ["rule","judge"], "judge"), neg: !!c.neg, st: "assumed", by: "pt", unclear: c.clear === false ? str(c.unclear) || t("goal.unclear") : "", exIds: arr(c.fromExamples).map(str).filter(e => gg.examples.some(x => x.id === e)), at: now()});
    markPT(p, "crit:" + id, "added", t("why.crit")); added++;
  }
  if (link) applyCritLinks(p, r.links);
  logAct(p, t("act.goalcrit", {n: added}), {step: "capture", important: true});
  touch(p); render();
  return r;
}
function applyCritLinks(p, links){
  const ids = new Set(goalOf(p).criteria.map(c => c.id)); let n = 0;
  for (const l of arr(links)){
    const r = arr(p.requirements).find(x => x.id === str(l.req)); if (!r) continue;
    const cs = arr(l.crit).map(str).filter(c => ids.has(c)); if (!cs.length) continue;
    const before = arr(r.critIds).join();
    r.critIds = [...new Set([...arr(r.critIds), ...cs])];
    if (r.critIds.join() !== before){ n++; if (!(p.marks && p.marks["req:" + r.id] && (p.marks["req:" + r.id].by || "you") === "you")) markPT(p, "req:" + r.id, "updated", t("why.critlink", {c: r.critIds.join(", ")})); }
  }
  return n;
}
async function aiLinkCriteria(p){
  const g = goalOf(p); if (!g.criteria.length || !arr(p.requirements).length) return null;
  const prompt = buildPrompt("goal-link", {proj: p, rules: ["spec","evals"], context: projectContext(p, {only: ["north_star","goal_criteria","requirements"]}),
    body: `Link every requirement to the goal criteria it serves, and every test to the criteria it checks. A requirement that serves no criterion is listed under "orphans" with one sentence why (it may be unnecessary, or a criterion is missing).
<tests>${jsonFit(arr(p.tests).map(x => ({id: x.id, title: x.title, criteria: x.criteria, reqIds: x.reqIds})), 40000)}</tests>`,
    schema: `{"links":[{"req":"R1","crit":["C1"]}],"tests":[{"test":"T1","crit":["C1"]}],"orphans":[{"req":"R9","why":"…"}]}`});
  const r = await runAI("goal-link", t("goal.linking"), prompt, {pid: p.id, step: "require", validate: o => o && Array.isArray(o.links)});
  if (!r) return null;
  snapshot(p, t("goal.linked"));
  const n = applyCritLinks(p, r.links);
  const ids = new Set(goalOf(p).criteria.map(c => c.id));
  for (const l of arr(r.tests)){ const x = arr(p.tests).find(y => y.id === str(l.test)); if (!x) continue; const cs = arr(l.crit).map(str).filter(c => ids.has(c)); if (cs.length) x.critIds = [...new Set([...arr(x.critIds), ...cs])]; }
  goalOf(p).orphans = arr(r.orphans).map(o => ({req: str(o.req), why: str(o.why)})).filter(o => arr(p.requirements).some(x => x.id === o.req));
  logAct(p, t("act.goallink", {n}), {step: "require"});
  touch(p); render(); return r;
}
/** PT drafts sample results for real inputs, so you can grade them 👍/👎 (this is how most people find out what they really want) */
async function aiDraftExamples(p){
  const g = goalOf(p), sz = goalSize(p);
  const prompt = buildPrompt("goal-examples", {proj: p, rules: ["evals","golden"], context: projectContext(p),
    body: `Draft ${sz.ex} realistic example inputs this tool will get, and for each a sample result as the finished tool would deliver it (complete, as the person would see it). Make them different from each other: typical, a harder one, and one where a weak tool would go wrong. Use plausible example content and say it is an example. The person will grade each result 👍 or 👎 and say why; their reasons become the goal criteria.
${g.examples.length ? "Existing examples (do not repeat them):\n" + JSON.stringify(g.examples.map(e => ({input: trunc(e.input, 300)}))) : ""}`,
    schema: `{"examples":[{"input":"…","output":"…"}]}`});
  const r = await runAI("goal-ex", t("goal.exdrafting"), prompt, {pid: p.id, step: "require", validate: o => o && arr(o.examples).filter(e => str(e.input).trim() && str(e.output).trim()).length > 0});
  if (!r) return null;
  snapshot(p, t("goal.exdrafted"));
  const gg = goalOf(p);
  for (const e of arr(r.examples).filter(e => str(e.input).trim() && str(e.output).trim())){ const id = nextId(p, "E", gg.examples); gg.examples.push({id, input: str(e.input), output: str(e.output), verdict: "", why: "", files: [], by: "pt", at: now()}); markPT(p, "ex:" + id, "added", t("why.example")); }
  touch(p); render(); return r;
}
/** your grades and reasons become criteria (new ones, or sharper existing ones) */
async function aiCriteriaFromGrades(p){
  const g = goalOf(p), graded = g.examples.filter(e => e.verdict && str(e.why).trim());
  if (!graded.length){ toast(t("goal.needgrades"), "err"); return null; }
  const prompt = buildPrompt("goal-fromgrades", {proj: p, rules: ["spec","evals"], context: projectContext(p, {only: ["north_star","goal_criteria","graded_examples","requirements"]}),
    body: `The person graded these sample results and said why. Turn every reason into a goal criterion ("When [situation], the result [property]"): a 👍 reason says what must stay true, a 👎 reason says what must change (often a negative case, "neg": true). If an existing criterion already says it, return that criterion's id with sharper wording instead of a new one. Say which example each criterion comes from.`,
    schema: `{"criteria":[{"id":"existing id or empty","when":"…","then":"…","kind":"rule|judge","neg":false,"clear":true,"unclear":"","fromExamples":["E1"]}]}`});
  const r = await runAI("goal", t("goal.fromgrades"), prompt, {pid: p.id, step: "require", images: await exampleImages(p, graded), validate: o => o && arr(o.criteria).length > 0});
  if (!r) return null;
  snapshot(p, t("goal.fromgrades"));
  const gg = goalOf(p); let n = 0;
  for (const c of arr(r.criteria)){
    if (!str(c.when).trim() || !str(c.then).trim()) continue;
    const ex = arr(c.fromExamples).map(str).filter(e => gg.examples.some(x => x.id === e));
    const cur = str(c.id) && gg.criteria.find(x => x.id === str(c.id));
    // a criterion you wrote yourself is never rewritten: it gets the examples and a mark with PT's suggestion
    if (cur && cur.by === "you"){ cur.exIds = [...new Set([...arr(cur.exIds), ...ex])]; flag(p, "crit:" + cur.id, t("goal.fromgrades"), t("crit.line", {w: str(c.when), r: str(c.then)})); n++; continue; }
    if (cur){ Object.assign(cur, {when: str(c.when), then: str(c.then), exIds: [...new Set([...arr(cur.exIds), ...ex])]}); cur.st = "assumed"; markPT(p, "crit:" + cur.id, "changed", t("why.fromgrade")); n++; continue; }
    const id = nextId(p, "C", gg.criteria);
    gg.criteria.push({id, when: str(c.when), then: str(c.then), kind: oneOf(c.kind, ["rule","judge"], "judge"), neg: !!c.neg, st: "assumed", by: "pt", unclear: c.clear === false ? str(c.unclear) : "", exIds: ex, at: now()});
    markPT(p, "crit:" + id, "added", t("why.fromgrade")); n++;
  }
  for (const e of graded) e.used = now();
  touch(p); render(); toast(t("goal.fromgradesdone", {n}), "ok"); return r;
}
/** a failed test or a bad real result becomes a criterion with one click (deterministic, marked as yours) */
function critFromFailure(p, {when, then, testId = "", neg = false}){
  const g = goalOf(p);
  if (g.criteria.some(c => similar(c.when + " " + c.then, when + " " + then))){ toast(t("goal.already"), ""); return null; }
  const id = nextId(p, "C", g.criteria);
  g.criteria.push({id, when: str(when), then: str(then), kind: "judge", neg: !!neg, st: "ok", by: "you", exIds: [], at: now(), fromTest: testId});
  if (testId){ const x = arr(p.tests).find(y => y.id === testId); if (x) x.critIds = [...new Set([...arr(x.critIds), id])]; }
  markRef(p, "crit:" + id, "added"); markDownstream(p, "crit:" + id);
  return id;
}

/* ---------- views ---------- */
function critLine(c){ return t("crit.line", {w: c.when, r: c.then}); }
function goalPanel(p){
  const g = goalOf(p), sz = goalSize(p), busy = aiBusy("goal") || aiBusy("goal-ex") || aiBusy("goal-link");
  const crit = g.criteria.map(c => {
    const ref = "crit:" + c.id, res = critResult(p, c.id), st = c.st === "assumed" ? "as" : isFlagged(p, ref) ? "warn" : res === "fail" ? "bad" : "ok";
    const editing = UI.editRef === ref;
    return `<div class="irow crow ${editing ? "open" : ""}" id="ir-${esc(ref)}" ${p.focus.id === ref ? "data-focus" : ""}><div class="ihead-wrap">${stSlot(st)}<span class="iid mono">${esc(c.id)}</span><span class="ititle">${esc(critLine(c))}</span>
      <span class="chips">${chip(t(c.kind === "rule" ? "crit.rule" : "crit.judge"))}${c.neg ? chip(t("crit.neg"), "warn") : ""}${c.unclear ? `<span class="chip warn" title="${esc(c.unclear)}">${esc(t("crit.unclear"))}</span>` : ""}${chip(t("crit.res." + res), res === "pass" ? "ok" : res === "fail" ? "crit" : "")}${markChip(p, ref)}</span>
      <span class="itools">${c.st === "assumed" ? `<button class="btn xs primary" data-a="crit-ok" data-id="${esc(c.id)}">${ic("check")}${esc(t("btn.confirm"))}</button>` : ""}<button class="btn xs ghost" data-a="item-edit" data-ref="${esc(ref)}">${ic("edit")}${esc(t("it.edit"))}</button><button class="btn xs ghost" data-a="crit-del" data-id="${esc(c.id)}" title="${esc(t("more.remove"))}" aria-label="${esc(t("more.remove"))}">${ic("trash")}</button></span></div>
      ${editing ? `<div class="editbox grid2"><label class="fld"><span>${esc(t("crit.when"))}</span>${bindArea("p:goal.criteria.#" + c.id + ".when", c.when, {rows: 2})}</label><label class="fld"><span>${esc(t("crit.then"))}</span>${bindArea("p:goal.criteria.#" + c.id + ".then", c.then, {rows: 2})}</label><div class="row">${bindSelect("p:goal.criteria.#" + c.id + ".kind", c.kind, [["judge", t("crit.judge")], ["rule", t("crit.rule")]])}<label class="chk small"><input type="checkbox" data-bind="p:goal.criteria.#${c.id}.neg" ${c.neg ? "checked" : ""}>${esc(t("crit.neg"))}</label><span style="flex:1"></span>${editDoneButtons(p, ref)}</div></div>` : ""}</div>`;
  }).join("");
  const ex = g.examples.map(e => {
    const ref = "ex:" + e.id, open = UI.open.has(ref) || UI.editRef === ref;
    return `<div class="exrow ${e.verdict ? "v-" + e.verdict : ""}" id="ir-${esc(ref)}"><div class="row" style="gap:8px"><span class="iid mono">${esc(e.id)}</span><button class="ititle linkish" data-a="ex-open" data-ref="${esc(ref)}" aria-expanded="${open}">${esc(trunc(e.input, 140) || t("goal.exnoinput"))}</button>${markChip(p, ref)}
      <span class="row" style="gap:4px"><button class="btn xs ${e.verdict === "good" ? "primary" : ""}" data-a="ex-grade" data-id="${esc(e.id)}" data-v="good" aria-pressed="${e.verdict === "good"}" title="${esc(t("goal.good"))}">👍</button><button class="btn xs ${e.verdict === "bad" ? "danger" : ""}" data-a="ex-grade" data-id="${esc(e.id)}" data-v="bad" aria-pressed="${e.verdict === "bad"}" title="${esc(t("goal.bad"))}">👎</button></span></div>
      ${e.verdict ? `<label class="fld"><span>${esc(t(e.verdict === "good" ? "goal.whygood" : "goal.whybad"))}</span>${bindInput("p:goal.examples.#" + e.id + ".why", e.why, {ph: t("goal.whyph")})}</label>` : ""}
      ${open ? `<div class="grid2"><label class="fld"><span>${esc(t("goal.input"))}</span>${bindArea("p:goal.examples.#" + e.id + ".input", e.input, {rows: 3})}</label><label class="fld"><span>${esc(t("goal.output"))}</span>${bindArea("p:goal.examples.#" + e.id + ".output", e.output, {rows: 6})}</label></div>
        <div class="row">${arr(e.files).map((f, i) => `<span class="chip file">${f.data && /^data:image/.test(f.data) ? `<img src="${esc(f.data)}" alt="" class="thumb">` : ic("note")}${esc(trunc(f.name, 30))}${f.private ? " · " + esc(t("goal.private")) : ""}<button class="iconbtn" style="width:18px;height:18px" data-a="ex-file-del" data-id="${esc(e.id)}" data-i="${i}" aria-label="${esc(t("btn.delete"))}">${ic("x")}</button></span>`).join("")}
        <label class="btn xs" style="cursor:pointer">${ic("plus")}${esc(t("goal.addfile"))}<input type="file" accept="image/*,.txt,.md,.csv,.json,.pdf" multiple data-a-change="ex-files" data-id="${esc(e.id)}" hidden></label>
        <label class="chk small"><input type="checkbox" data-a-change="ex-private" data-id="${esc(e.id)}" ${arr(e.files).some(f => f.private) || e.private ? "checked" : ""}>${esc(t("goal.privatelbl"))}</label><span style="flex:1"></span><button class="btn xs ghost" data-a="ex-del" data-id="${esc(e.id)}">${ic("trash")}${esc(t("btn.delete"))}</button></div>` : ""}</div>`;
  }).join("");
  const graded = g.examples.filter(e => e.verdict && str(e.why).trim() && !e.used).length;
  const pass = g.criteria.filter(c => critResult(p, c.id) === "pass").length, notChecked = g.criteria.filter(c => critResult(p, c.id) === "open").length;
  return `<section class="panel goalp" id="goal">
    ${head(t("goal.title"), t("goal.sub"), `<span class="chip tnum">${esc(t("goal.count", {n: g.criteria.length, p: pass, o: notChecked}))}</span>`)}
    ${g.criteria.length ? `<div class="ilist">${crit}</div>` : `<p class="small muted">${esc(t("goal.nocrit", {n: sz.crit}))}</p>`}
    <div class="row">${aiBtn("crit-draft", g.criteria.length ? t("goal.more") : t("goal.draft", {n: sz.crit}), "M", {primary: !g.criteria.length, key: "goal"})}${btn("crit-add", t("goal.add"), {icon: "plus", cls: "sm"})}${g.criteria.length && arr(p.requirements).length ? aiBtn("crit-link", t("goal.link"), "L", {key: "goal-link"}) : ""}${busy ? "" : `<span class="hint">${esc(t("goal.hint"))}</span>`}</div>
    ${busyHTML("goal")}${busyHTML("goal-link")}
    <h3 class="sub3">${esc(t("goal.extitle"))}</h3><p class="small muted">${esc(t("goal.exsub"))}</p>
    ${ex ? `<div class="exlist">${ex}</div>` : ""}
    <div class="row">${aiBtn("ex-draft", t("goal.exdraft", {n: sz.ex}), "M", {key: "goal-ex"})}${btn("ex-add", t("goal.exadd"), {icon: "plus", cls: "sm"})}${graded ? aiBtn("crit-fromgrades", t("goal.usegrades", {n: graded}), "L", {primary: true, key: "goal"}) : ""}${otherGoals(p).length ? btn("goal-reuse", t("goal.reuse"), {icon: "copy", cls: "sm ghost"}) : ""}</div>${busyHTML("goal-ex")}
  </section>`;
}
function otherGoals(p){ return WS.projects.filter(x => x.id !== p.id && arr(x.goal && x.goal.criteria).length); }
MODAL14.reuse = (m, p) => reuseModal(p);
function reuseModal(p){
  const others = otherGoals(p), sel = UI.reuse || {};
  return `<div class="row"><h2 style="flex:1">${esc(t("goal.reuse"))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div><p class="sub">${esc(t("goal.reusesub"))}</p>
    ${others.map(o => `<section class="panel flat"><h3>${esc(o.name)}</h3>${goalOf(o).criteria.map(c => `<label class="chk small"><input type="checkbox" data-a-change="reuse-tick" data-k="${esc(o.id + "|" + c.id)}" ${sel[o.id + "|" + c.id] ? "checked" : ""}>${esc(c.id)} · ${esc(critLine(c))}</label>`).join("")}${goalOf(o).examples.length ? `<label class="chk small"><input type="checkbox" data-a-change="reuse-tick" data-k="${esc(o.id + "|ex")}" ${sel[o.id + "|ex"] ? "checked" : ""}>${esc(t("goal.reuseex", {n: goalOf(o).examples.length}))}</label>` : ""}</section>`).join("")}
    <div class="row end"><button class="btn ghost" data-a="modal-close">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="reuse-apply">${ic("copy")}${esc(t("goal.reusego"))}</button></div>`;
}

/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  "crit-draft": () => { const p = curP(); costGuard(p, "crit-draft", () => aiDraftCriteria(p)); },
  "crit-link": () => { const p = curP(); aiLinkCriteria(p); },
  "crit-fromgrades": () => { const p = curP(); const priv = goalOf(p).examples.some(e => arr(e.files).some(f => f.private)); if (priv && UI.privOk !== p.id){ confirmBox(t("goal.privq.t"), t("goal.privq"), t("goal.privyes"), () => { UI.privOk = p.id; aiCriteriaFromGrades(p); }); return; } aiCriteriaFromGrades(p); },
  "crit-add": () => { const p = curP(); const g = goalOf(p); const id = nextId(p, "C", g.criteria); g.criteria.push({id, when: "", then: "", kind: "judge", neg: false, st: "ok", by: "you", exIds: [], at: now()}); markRef(p, "crit:" + id, "added"); UI.editRef = "crit:" + id; UI.editStart = {ref: "crit:" + id, text: ""}; touch(p); render(); setTimeout(() => { const el = document.querySelector(`[data-bind="p:goal.criteria.#${id}.when"]`); if (el) el.focus(); }, 30); },
  "crit-ok": el => { const p = curP(); const c = critById(p, el.dataset.id); if (!c) return; c.st = "ok"; markRef(p, "crit:" + c.id, "confirmed"); touch(p); render(); toastUndo(t("toast.confirmed")); },
  "crit-del": el => { const p = curP(); const g = goalOf(p); const id = el.dataset.id; g.criteria = g.criteria.filter(c => c.id !== id); for (const r of arr(p.requirements)) if (arr(r.critIds).includes(id)) r.critIds = r.critIds.filter(x => x !== id); for (const x of arr(p.tests)) if (arr(x.critIds).includes(id)) x.critIds = x.critIds.filter(y => y !== id); unflag(p, "crit:" + id); touch(p); render(); toastUndo(t("more.removed")); },
  "ex-draft": () => { const p = curP(); costGuard(p, "ex-draft", () => aiDraftExamples(p)); },
  "ex-add": () => { const p = curP(); const g = goalOf(p); const id = nextId(p, "E", g.examples); g.examples.push({id, input: "", output: "", verdict: "", why: "", files: [], by: "you", at: now()}); markRef(p, "ex:" + id, "added"); UI.open.add("ex:" + id); touch(p); render(); setTimeout(() => { const el = document.querySelector(`[data-bind="p:goal.examples.#${id}.input"]`); if (el) el.focus(); }, 30); },
  "ex-open": el => { const r = el.dataset.ref; UI.open.has(r) ? UI.open.delete(r) : UI.open.add(r); render(); },
  "ex-grade": el => { const p = curP(); const e = goalOf(p).examples.find(x => x.id === el.dataset.id); if (!e) return; e.verdict = e.verdict === el.dataset.v ? "" : el.dataset.v; e.used = null; markRef(p, "ex:" + e.id, "decided"); touch(p); render(); setTimeout(() => { const f = document.querySelector(`[data-bind="p:goal.examples.#${e.id}.why"]`); if (f && !f.value) f.focus(); }, 30); },
  "ex-del": el => { const p = curP(); const g = goalOf(p); g.examples = g.examples.filter(x => x.id !== el.dataset.id); touch(p); render(); toastUndo(t("more.removed")); },
  "ex-file-del": el => { const p = curP(); const e = goalOf(p).examples.find(x => x.id === el.dataset.id); if (!e) return; e.files.splice(num(el.dataset.i), 1); touch(p); render(); },
  "crit-fromfail": el => { const p = curP(); const r = arr(p.runs).find(x => x.id === el.dataset.run); const x = r && r.results[num(el.dataset.x)]; if (!x) return; const tc = arr(p.tests).find(y => y.id === x.testId) || {criteria: []}; const failed = arr(x.verdicts).filter(v => v.v !== "pass").map(v => tc.criteria[v.c - 1]).filter(Boolean); const id = critFromFailure(p, {when: trunc(tc.title || tc.input, 160), then: failed[0] || trunc(tc.criteria.join("; "), 200), testId: tc.id}); if (id){ touch(p); render(); toastUndo(t("goal.fromfaildone", {id})); } },
  "goal-reuse": () => { UI.reuse = {}; UI.modal = {kind: "reuse", wide: true}; render(); },
  "reuse-apply": () => { const p = curP(); const g = goalOf(p); let n = 0;
    for (const [k, on] of Object.entries(UI.reuse || {})){ if (!on) continue; const [pid, cid] = k.split("|"); const o = WS.projects.find(x => x.id === pid); if (!o) continue;
      if (cid === "ex"){ for (const e of goalOf(o).examples){ const id = nextId(p, "E", g.examples); g.examples.push(Object.assign(clone(e), {id, by: "you", copiedFrom: o.name, at: now()})); n++; } continue; }
      const c = critById(o, cid); if (!c || g.criteria.some(x => similar(x.when + x.then, c.when + c.then))) continue; const id = nextId(p, "C", g.criteria); g.criteria.push(Object.assign(clone(c), {id, st: "ok", by: "you", copiedFrom: o.name, exIds: [], at: now()})); markRef(p, "crit:" + id, "added"); n++; }
    UI.modal = null; touch(p); render(); toastUndo(t("goal.reused", {n})); }
});
Object.assign(CHANGES, {
  "ex-files": async el => { const p = curP(); const e = goalOf(p).examples.find(x => x.id === el.dataset.id); if (!e) return; const priv = !!e.private || arr(e.files).some(f => f.private);
    for (const f of Array.from(el.files || []).slice(0, 6)){
      try{
        if (/^image\//.test(f.type)){ let q = .8, max = 1000, data = ""; for (let i = 0; i < 4; i++){ const {canvas} = await resizeImage(f, max); data = canvas.toDataURL("image/jpeg", q); if (data.length < 160000) break; q -= .15; max = Math.round(max * .75); } if (data.length >= 200000){ toast(t("err.imagebig"), "err"); continue; } e.files.push({name: f.name, type: "image", data, private: priv, at: now()}); }
        else { const txt = (await readFiles([f]))[0]; if (txt){ e.files.push({name: f.name, type: "text", private: priv, at: now()}); e.input = (e.input ? e.input + "\n\n" : "") + "<file name=\"" + f.name + "\">\n" + trunc(txt.text, 20000) + "\n</file>"; } }
      }catch(err){ toast(t("err.image"), "err"); }
    }
    el.value = ""; touch(p); render(); },
  "ex-private": el => { const p = curP(); const e = goalOf(p).examples.find(x => x.id === el.dataset.id); if (!e) return; e.private = el.checked; for (const f of arr(e.files)) f.private = el.checked; touch(p); render(); },
  "reuse-tick": el => { UI.reuse = UI.reuse || {}; UI.reuse[el.dataset.k] = el.checked; }
});
