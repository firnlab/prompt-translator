/* ===================== 2.0 Part B: the new order — Goal → Map → Decide → Details → Build → Check → Launch → Operate =====================
   The owner (2 Nov 2026): PT asked detail questions (assumptions, requirements, examples) for a solution that was not chosen yet, and later
   a fact broke the solution after much work had gone into it. The independent design (§2): first the goal, then all routes on one map,
   then a decision with tripwires, and only then the details of the chosen route.
   This file is the reusable stage model (Part C builds Chat with structure and Pick on it):
   - STAGE20 (8 stages) mapped onto today's 12 phases (STAGE20_PHASES): capture + understand + interview → Goal; arch options → Map and
     Decide; assume + require → Details (for the chosen route only); build; review + test → Check; launch + release → Launch; operate.
   - stage20Rows(p, id): the visible checklist of a stage (3–6 rows, each {k, ok, label}); a stage is done when its rows are green.
   - stage20Of(p): the stage the project is at (the first one that is not done); stage20Next(p): the one Next of the new order (or null:
     the old spine's Next stands).
   - Before the decision (stage20Early) PT asks only questions that split routes: the pick and interview prompts say so, and the detail
     items of the queue (assumptions, risks, requirements) wait for the chosen route (they are kept, only not asked).
   The new order is on for projects made with 2.0 (p.order20); Part C moves the older projects over (additive migration). */
const STAGE20 = ["goal", "map", "decide", "details", "build", "check", "launch", "operate"];
const STAGE20_PHASES = {goal: ["capture", "understand", "interview"], map: ["arch"], decide: ["arch"], details: ["assume", "require"], build: ["build"], check: ["review", "test"], launch: ["launch", "release"], operate: ["operate"]};
const STAGE20_WAIT = ["assume", "require"];   // detail phases: asked only once a route is chosen

{ const orig = blankProject; blankProject = function(name){ const p = orig(name); p.order20 = true; return p; }; }
/* a project stored before 2.0 has no flag: it keeps its order (normalizeProject would copy the new project's flag onto it) */
{ const orig = normalizeProject; normalizeProject = function(p){ const had = !!p && Object.prototype.hasOwnProperty.call(p, "order20"); const r = orig.apply(this, arguments); if (p && !had) p.order20 = false; return r; }; }
function stage20On(p){ return !!p && p.order20 === true; }
/** the route the project took (the map's decision, or a 1.x architecture choice the person made) */
function stage20Decided(p){ if (!p) return false; if (typeof m20Chosen === "function" && m20Chosen(p)) return true; const a = p.arch || {}; return !!a.chosen && !a.chosenAssumed && !stage20On(p); }
/** before the decision: only questions that split routes */
function stage20Early(p){ return stage20On(p) && !stage20Decided(p); }
function stage20OfPhase(ph){ for (const id of STAGE20) if (STAGE20_PHASES[id].includes(ph)) return id; return "goal"; }

/* ---------- the checklists ---------- */
function stage20Rows(p, id){
  const R = [], row = (k, ok, vars) => R.push({k, ok: !!ok, label: t("st20.r." + k, vars || {})});   // ok:verdict a checklist row is done or not, there is no third state
  const M = typeof m20Read === "function" ? m20Read(p) : null, G = typeof goal20Read === "function" ? goal20Read(p) : null;
  switch (id){
    case "goal": {
      const by = f => !!G && G.by[f] === "you" && !!str(G.f[f]).trim();
      row("outcome", by("outcome")); row("whom", by("whom")); row("success", by("success"));
      row("nevers", factsActive(p, ["never"]).length || (G && G.noNevers), {n: factsActive(p, ["never"]).length});
      row("split", !pickDeck(p).filter(c => !c.qkey).length);
      break; }
    case "map": {
      const C = M ? m20Coverage(p) : null;
      row("lenses", C && C.lensesDone >= M20_LENSES.length, {n: C ? C.lensesDone : 0, k: M20_LENSES.length});
      row("notyet", M && M.rounds.length && M.notyet.length + M.rounds.filter(r => r.notyetChecked).length > 0);
      row("quiet", C && C.lastNew === 0, {n: C ? C.lastNew : 0});
      row("cells", C && C.cellsOpen === 0, {n: C ? C.cellsOpen : 0});
      row("rules", M && M.rounds.length);
      row("proven", M && M.rounds.length && (M.libChecked || !m20LibRoutes(p).length));
      row("ceiling", M && M.routes.some(r => r.lvl >= 4));
      break; }
    case "decide": {
      const D = M && typeof m20Decision === "function" ? m20Decision(p) : null;
      row("short", M && (M.short.length || D));
      row("compared", D ? arr(D.compared).length || M.routes.some(r => r.proof) : M && (M.short.length >= 2 || M.routes.some(r => r.proof)));
      row("taken", !!D);
      row("tripwires", D && arr(D.trip).length, {n: D ? arr(D.trip).length : 0});
      row("higher", D && str(D.higher).trim());
      break; }
    case "details": {
      const q = stage20Decided(p) ? queueOf(p).filter(x => STAGE20_WAIT.includes(x.ph) && youOpen(x)) : [1];
      row("asked", !q.length, {n: q.length});
      row("assumptions", arr(p.assumptions).length);
      row("requirements", arr(p.requirements).length);
      break; }
    case "build":
      row("parts", arr(p.arch && p.arch.components).length || arr(p.pkg && p.pkg.sections).length);
      row("brief", !!p.brief);
      break;
    case "check": {
      const open = M ? M.alerts.filter(a => ["open", "later"].includes(a.status)).length : 0;
      row("review", p.seal && p.seal.review && p.seal.review === p.versionNo);
      row("tests", arr(p.runs).length);
      row("alerts", !open, {n: open});
      row("ceiling2", M && typeof m20Decision === "function" && m20Decision(p) && str(m20Decision(p).higher).trim());
      break; }
    case "launch": row("live", !!p.live); break;
    case "operate": row("runs", !!p.live && arr(p.runs).length); break;
  }
  return R;
}
function stage20Done(p, id){
  if (id === "goal" && stage20Decided(p)) return true;   // a route was taken: the goal was clear enough for it
  if (id === "map" && stage20Decided(p)) return true;
  if (id === "decide") return stage20Decided(p);
  return stage20Rows(p, id).every(r => r.ok);
}
/** the stage the project is at: the first that is not done (the decision counts for everything before it) */
function stage20Of(p){
  if (!stage20On(p)) return stage20OfPhase(p.phase);
  for (const id of STAGE20) if (!stage20Done(p, id)) return id;
  return "operate";
}
/** the one Next of the new order, or null when the old spine's Next stands (after the decision, or with picks waiting) */
function stage20Next(p){
  if (!stage20On(p) || !str(p.northStar && p.northStar.goal).trim()) return null;
  const M = typeof m20Read === "function" ? m20Read(p) : null;
  if (M){ const al = M.alerts.find(a => a.status === "open"); if (al) return {a: "m20-open", v: "alert", label: t("st20.next.alert")}; }
  if (stage20Decided(p)) return null;
  if (pickDeck(p).filter(c => !c.qkey).length) return null;   // the route-splitting picks come first
  const G = goal20Read(p);
  if (!goal20Clear(p) && !G.skip) return {a: "m20-open", v: "goal", label: t("st20.next.goal", {n: goal20Open(p).length})};
  if (!M || !M.routes.length) return {a: "m20-open", v: "map", label: t("st20.next.map")};
  if (M.short.length >= 2) return {a: "m20-open", v: "compare", label: t("st20.next.compare", {n: M.short.length})};
  return {a: "m20-open", v: "map", label: t("st20.next.short")};
}
{ const orig = spineState; spineState = function(p){
    const s = orig(p); let n = null;
    try{ n = stage20Next(p); }catch(e){ onAppError(e && e.message, "stage:next"); }
    if (n) s.next = n;
    return s; }; }
{ const orig = pgNextBtn; pgNextBtn = function(p, o = {}){
    const nx = spineState(p).next;
    if (nx && nx.a === "m20-open") return `<button class="btn ${o.big ? "lg" : "sm"} primary" data-a="m20-open" data-v="${esc(nx.v || "map")}">${ic("arrow")}${esc(nx.label)}</button>`;
    return orig.apply(this, arguments); }; }

/* ---------- details wait for the route ---------- */
const STAGE20_HELD = new WeakMap();   // project → how many detail items wait for the route (counted when the queue is made)
{ const orig = queueOf; queueOf = function(p){
    const q = orig(p);
    if (!stage20Early(p)) return q;
    const keep = q.filter(x => !STAGE20_WAIT.includes(x.ph)); STAGE20_HELD.set(p, q.length - keep.length);
    return keep; }; }
function stage20Waiting(p){ if (!stage20Early(p)) return 0; queueOf(p); return STAGE20_HELD.get(p) || 0; }

/* ---------- the prompts: route-splitting before the decision, the chosen route after ---------- */
const ST20_SPLIT = `\n<stage>The project is before its route decision (Goal stage). Ask only questions with route-splitting value: an answer must remove or promote a whole family of ways to reach the goal (for example "must it work on calls?", "who uses it?", "may it cost money each month?"). Questions about how one particular way would work (its details, assumptions, requirements, test cases, examples of output) wait until the person has chosen a route: do not ask them now.</stage>`;
function stage20RouteBlock(p){
  const r = typeof m20Chosen === "function" ? m20Chosen(p) : null; if (!r) return "";
  return `\n<chosen_route>The person chose this route; ask and propose only what this route needs (details of other routes are out).\n${JSON.stringify({id: r.id, name: r.name, what: r.line, mustBeTrue: arr(r.assume).map(a => a.text)})}\n</chosen_route>`;
}
{ const orig = buildPrompt; buildPrompt = function(task, o){
    if (o && o.proj && typeof o.body === "string" && ["pick-next", "pick-refresh", "pick-second", "interview", "requirements", "assumptions"].includes(task)){
      try{ const add = stage20Early(o.proj) ? (["pick-next", "pick-refresh", "pick-second", "interview"].includes(task) ? ST20_SPLIT : "") : stage20RouteBlock(o.proj); if (add) o = Object.assign({}, o, {body: o.body + add}); }
      catch(e){ onAppError(e && e.message, "stage:prompt"); }
    }
    return orig(task, o); }; }

/* ---------- the stage strip (the map page shows it; Part C's two modes reuse it) ---------- */
function stage20StripHTML(p){
  const cur = stage20Of(p);
  return `<ol class="st20" aria-label="${esc(t("st20.title"))}">${STAGE20.map(id => { const done = STAGE20.indexOf(id) < STAGE20.indexOf(cur) || stage20Done(p, id) && id !== cur, here = id === cur;
    return `<li class="st20-s ${done ? "done" : here ? "now" : ""}" ${here ? 'aria-current="step"' : ""}><span aria-hidden="true">${done ? "✓" : here ? "●" : "○"}</span> ${esc(t("st20.s." + id))}<span class="sr20">${esc(done ? t("st20.done") : here ? t("st20.here") : t("st20.todo"))}</span></li>`; }).join("")}</ol>`;
}
function stage20RowsHTML(p, id){
  const R = stage20Rows(p, id); if (!R.length) return "";
  return `<ul class="st20-rows" aria-label="${esc(t("st20.rows", {x: t("st20.s." + id)}))}">${R.map(r => `<li class="${r.ok ? "ok" : "todo"}"><span aria-hidden="true">${r.ok ? "✓" : "○"}</span> ${esc(r.label)}<span class="sr20"> · ${esc(r.ok ? t("st20.done") : t("st20.todo"))}</span></li>`).join("")}</ul>`;
}
/* the page track follows the new Next: the goal card lives on the Idea page, the map and the decision on Design */
{ const orig = pgNextPage; pgNextPage = function(s){ const nx = s && s.next || {}; if (nx.a === "m20-open") return nx.v === "goal" ? "idea" : "design"; return orig.apply(this, arguments); }; }
