/* =====================================================================
   1.2 ENGINE TASKS: frontier scan, knowledge refresh, real-tool check,
   trial run, mini-test, engine suggestions, tests from real use
   ===================================================================== */
Object.assign(JOB_EST, {frontier: 45, kpcheck: 30, smoke: 20});

/** long runs write into the project object that is current when they finish (undo, restore or a save conflict may have replaced it) */
function liveP(p){ return (WS.projects || []).find(x => x.id === p.id) || p; }
/** the next setting the page can really measure (the page can ask for effort low, medium or high only) */
function nextMeasurable(id){ const i = SETTINGS_LADDER.findIndex(s => s.id === id); for (let j = i + 1; j < SETTINGS_LADDER.length; j++) if (["low","medium","high"].includes(SETTINGS_LADDER[j].effort)) return SETTINGS_LADDER[j]; return null; }
/* ---------- frontier scan (background, with live web research) ---------- */
function scanInputs(p){
  const u = p.understand || {};
  return {
    northStar: p.northStar, idea: trunc(str(p.intake.clean || p.intake.raw), 4000), rootNeed: str(u.rootNeed), jtbd: str(u.jtbd),
    requirements: arr(p.requirements).map(r => r.id + " " + r.title), audience: p.audience || {}, track: track(p),
    models: kpModels().filter(m => m.status === "active").map(m => ({id: m.id, short: m.short, tier: m.tier, notes: m.notes})),
    settings: SETTINGS_LADDER.map(s => s.id), platform: trunc(KP.platform, 3000), language: langName(contentLang(p))
  };
}
const SCAN_SCHEMA = `{"restated":"the task in one sentence","criterion":"one measurable success criterion","existing":[{"name":"…","url":"https://… (opened)","kind":"product|plugin|skill|connector|open-source|built-in|service","fit":0-100,"cost":"free|paid|unknown, one phrase","note":"what it covers and what it misses"}],"verdict":"adopt|buy|partial|build","verdictWhy":"two sentences","capability":[{"need":"requirement id or need","feature":"Claude feature that serves it","maturity":"ga|beta|preview|none","note":"one phrase"}],"flags":["gui|all-steps|99pct|sensitive-topic: one line each, only if they apply"],"gates":{"G1":{"ans":"yes|no|unknown","evidence":"one sentence with the source"},"G2":{},"G3":{},"G4":{},"G5":{},"G6":{},"G7":{}},"score":{"path":{"v":0,"why":"…"},"input":{},"rules":{},"breadth":{},"value":{},"errorcost":{},"capacity":{}},"rung":"R0-R5","setting":"one of the setting ids","autonomy":"L1-L5","ceiling":"the top option today in one sentence","whyNotCeiling":"one sentence","climbWhen":"a measurable trigger","sources":[{"title":"…","url":"…","date":"…"}]}`;
function scanInstructions(p, short){
  return `Frontier scan for the project "${p.name}" in Prompt Translator. The goal: find the highest ceiling of what current technology can do for this problem AND the lowest design that is good enough. Never recommend more machinery than the problem needs.
inputs holds the project summary, the current Claude models, the setting ids and the platform profile.
${short ? "This is the QUICK track: do steps 1, 2, 3 and 8 only (existing products and model fit), keep it brief." : ""}
1. Restate the task in one sentence and give one measurable success criterion.
2. Search the web for existing solutions: products, apps, plugins, Claude skills or connectors, built-in Claude features, open-source projects or services that already do this or most of it. Open every link before you list it. For each give fit 0-100 and what it misses.
3. Verdict: "adopt" (an existing tool or built-in feature does it), "buy" (a paid product does it well), "partial" (one covers part; build only the rest) or "build". Building when something fits above 80 needs a strong reason.
4. Capability fit: map each requirement or key need to the Claude feature that serves it and its maturity (ga, beta, preview, none).
5. Reliability flags, only if they apply: desktop or GUI control; workflows where every step must be right; anything needing 99% reliability; cyber, biology or frontier-AI topics (requests may be handed to older models).
6. Suggest an answer with evidence for each gate: G1 does an existing product already do this? G2 is the job really done today, at least about twice a month (answer "no" if not)? G3 must the output be exactly reproducible (invoices, VAT, legal figures)? G4 is the task strictly sequential (each step needs the previous)? G5 can a non-developer owner maintain the design (answer "no" if not)? G6 does it touch hiring, credit, education scoring, or personal legal, financial or medical advice? G7 does it combine private data, untrusted content and a way to send data out?
7. Score 0-2 with one reason each: path (0 steps known in advance, 2 cannot be known), input (0 clean tables, 2 free text or web), rules (0 one page, 2 many changing rules), breadth (0 one thread, 2 many independent searches), value (0 rare and low, 2 frequent and high), errorcost (0 easy to undo, 2 costly or permanent), capacity (0 low ability to maintain, 2 high).
8. Recommend the lowest design rung that clears the gates (R0 no new tool, R1 deterministic: spreadsheet, form or code, R2 a prompt, Project or skill, R3 a fixed workflow, scheduled task or page with a Claude call, R4 a single agent with tools, R5 several agents with one writer), the lowest model setting likely to pass (one of inputs.settings), and an autonomy level (L1 the person does it, L2 collaborates, L3 the tool acts and the person approves key steps, L4 the person only approves, L5 observes). Then describe the ceiling (the top option today, e.g. Fable 5.1 or Managed Agents), why the recommendation is not the ceiling, and a measurable trigger for climbing.
Write all human-readable text in ${langName(contentLang(p))}.
Write "result" as exactly this JSON shape: ${SCAN_SCHEMA}`;
}
async function frontierJob(p){
  const e = eng(p);
  if (e.scan.state === "running" && e.scan.job){ const j = WS.jobs.find(x => x.id === e.scan.job); if (j && !["done","failed","notsent"].includes(j.status)) return j; }
  if (!Runner.ready() || Store.mode !== "cloud") return aiFrontierLocal(p);
  const short = track(p) === "quick";
  e.scan = {state: "running", job: null, at: now(), result: e.scan.result || null, short};
  const job = await startJob("frontier", {projectId: p.id, title: p.name + " · " + t("eng.scan"), inputs: scanInputs(p), instructions: scanInstructions(p, short), onStart: j => { e.scan.job = j.id; touch(p); }});
  if (!job){ e.scan.state = e.scan.result ? "done" : "none"; touch(p); render(); return null; }
  if (job.status === "notsent"){ e.scan.state = e.scan.result ? "done" : "failed"; e.scan.error = job.error || ""; }   // could not start: say so and offer the scan without web search
  touch(p); render();
  return job;
}
/** without background runs (another login before setup, or offline): the same scan without live web search, clearly labelled */
async function aiFrontierLocal(p){
  const prompt = buildPrompt("frontier-local", {proj: p, rules: ["simple","multi","funnel","trifecta","gen5","opus55"], platform: true, context: projectContext(p),
    body: scanInstructions(p, track(p) === "quick").replace("Search the web for existing solutions", "From what you know (no live web search is available here; say so in each note), list existing solutions").replace("Open every link before you list it. ", "Give links only if you are sure they exist. ") + "\n<inputs>\n" + jsonFit(scanInputs(p), 36000) + "\n</inputs>",
    schema: SCAN_SCHEMA});
  const r = await runAI("frontier", t("eng.scanning"), prompt, {pid: p && p.id, step: "arch", validate: o => o && o.verdict});
  if (!r) return null;
  applyScan(liveP(p), r, {local: true});
  return r;
}
function applyScan(p, r, {local = false} = {}){
  const e = eng(p);
  const res = {
    restated: str(r.restated), criterion: str(r.criterion), local,
    existing: arr(r.existing).slice(0, 12).map(x => ({name: str(x.name), url: /^https?:\/\//.test(str(x.url)) ? str(x.url) : "", kind: str(x.kind), fit: clamp(num(x.fit, 0), 0, 100), cost: str(x.cost), note: str(x.note)})),
    verdict: oneOf(r.verdict, ["adopt","buy","partial","build"], "build"), verdictWhy: str(r.verdictWhy),
    capability: arr(r.capability).slice(0, 30).map(c => ({need: str(c.need), feature: str(c.feature), maturity: oneOf(c.maturity, ["ga","beta","preview","none"], "ga"), note: str(c.note)})),
    flags: arr(r.flags).map(str).slice(0, 8), rung: oneOf(r.rung, RUNGS, "R2"), setting: SETTINGS_LADDER.some(s => s.id === r.setting) ? r.setting : null, autonomy: oneOf(r.autonomy, AUTONOMY, "L3"),
    ceiling: str(r.ceiling), whyNotCeiling: str(r.whyNotCeiling), climbWhen: str(r.climbWhen),
    sources: arr(r.sources).slice(0, 20).map(s => ({title: str(s.title), url: str(s.url), date: str(s.date)})), kp: kpStamp()
  };
  e.scan = {state: "done", job: e.scan.job || null, at: now(), result: res, short: e.scan.short};
  for (const g of GATES){ const s = (r.gates || {})[g.id]; if (s && s.ans) e.gates[g.id] = Object.assign({}, e.gates[g.id] || {}, {sug: {ans: oneOf(s.ans, ["yes","no","unknown"], "unknown"), evidence: str(s.evidence)}}); }
  for (const d of SCORE_DIMS){ const s = (r.score || {})[d]; if (s && s.v != null){ e.score.auto[d] = clamp(num(s.v, 1), 0, 2); e.score.why = e.score.why || {}; e.score.why[d] = str(s.why); } }
  engineRecompute(p);
  logAct(p, t("act.scan", {v: t("eng.verdict." + res.verdict)}), {step: "understand", important: true});
  touch(p); render();
}

/* ---------- knowledge refresh (weekly task on Sundays + "Check now") ---------- */
function refreshInstructions(url){
  return `Weekly knowledge refresh for Prompt Translator (artifact ${url}). Find what changed in Claude models, the Claude platform, prompting best practice and the law snapshot, and write PROPOSALS only. Nothing is applied until the owner approves each item.
1. Read the current pack: ArtifactData "get", collection "kp", doc_id "pack" (it may not exist yet; then compare with the built-in list in the job's inputs, if any).
2. Read these primary sources with WebFetch: https://platform.claude.com/docs/en/models/overview, https://platform.claude.com/docs/en/about-claude/model-deprecations, https://support.claude.com/en/articles/12138966-release-notes, https://www.anthropic.com/news and https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices. For law items re-check the EU AI Act (Art. 50, Digital Omnibus) and Swiss FDPIC / Federal Council AI pages only when an item's recheck date has passed.
3. Compare. Propose an item only for a real change: a new or retired model, a new retirement date, a changed recommendation, a new platform feature or limit, a changed legal date. Mark "urgent": true for a model retirement within 60 days or a change that breaks existing tools.
4. Write ONE document with ArtifactData "set": collection "kpprop", doc_id "prop-<current UTC time as YYYY-MM-DD-HHMM>", data {"id":"prop-<that same YYYY-MM-DD-HHMM>","at":"<ISO time>","status":"open","summary":"<one sentence>","items":[{"op":"add|change|retire","kind":"rule|model|platform|fact|law","target":"<existing id or new id>","before":"<short>","after":{<the complete new record: for a rule id, cat, en, de, zh, ai, src, verified; for a model id, label, short, tier (top|complex|default|quick), status (active|retiring|retired), released, retires, replacement, notes, src, verified; for a fact or law id, text, en, de, zh, src, verified, recheck>},"why":"<one sentence>","src":"<url you opened>","urgent":false,"status":"open"}]}. German text uses "ss", never "ß"; Chinese is Simplified. If nothing changed, write the document with an empty items list and summary "No changes".
5. Never write to "kp/pack", never delete anything, never change any other document.`;
}
function kpRefreshJob(){
  if (!Store.isOwner){ toast(t("kp.owneronly"), "err"); return null; }
  return startJob("kpcheck", {title: t("kp.refresh"), inputs: {builtinModels: KP_MODELS_BUILTIN.map(m => ({id: m.id, status: m.status, retires: m.retires || ""})), ruleIds: kpRules().map(r => ({id: r.id, verified: r.verified || KP_VERSION, src: r.src || ""}))}, instructions: refreshInstructions(PT_URL) + `\nAlso write into this job's "result": {"proposal":"<the proposal doc id>","items":<number of items>}.`});
}

/* ---------- real-tool smoke check (gap 7): opens the published parts read-only ---------- */
function smokeJob(p){
  const arts = arr(p.tool.artifacts);
  if (!arts.length){ toast(t("smoke.none"), ""); return null; }
  const expect = arr(p.pkg.sections).filter(s => s.dest === "artifact").map(s => ({title: s.title, brief: trunc(s.content, 600)}));
  return startJob("smoke", {projectId: p.id, title: p.name + " · " + t("smoke.title"), inputs: {artifacts: arts, expect},
    instructions: `Check that the published parts of the tool "${p.name}" really work, without changing anything. For each url in inputs.artifacts: read it with the Artifact tool (action "read"; read only, never publish), confirm it loads, note its title, and compare its content with inputs.expect (what the page should show). List concrete problems (missing parts, errors, empty states that should have data). Do not change, publish or delete anything.
Write "result" as: {"ok":true|false,"items":[{"url":"…","ok":true|false,"title":"…","issues":["…"]}],"summary":"two sentences in ${langName(contentLang(p))}"}.`});
}
Object.assign(JOB_APPLY, {
  frontier(job, p){ if (!p) return; const r = job.result || {}; if (job.status === "done" && r.verdict){ applyScan(p, r); } else { const e = eng(p); e.scan.state = e.scan.result ? "done" : "failed"; e.scan.error = job.error || ""; } },
  kpcheck(){ loadKP().then(() => render()); },
  smoke(job, p){ if (!p) return; const r = job.result || {}; p.health = arr(p.health); p.health.push({at: now(), ok: job.status === "done" && r.ok !== false, kind: "smoke", summary: str(r.summary), items: arr(r.items)}); for (const it of arr(r.items).filter(x => x.ok === false)) p.inbox.push({id: uid("ib"), key: "smoke-" + job.id + "-" + it.url, src: "health", title: t("smoke.issue", {u: trunc(it.title || it.url, 60)}), body: arr(it.issues).join("\n"), at: now(), on: true, k: "fix"}); }
});

/* ---------- engine suggestions in the page (no web): score and gates G3–G7 ---------- */
async function aiEngineSuggest(p){
  const prompt = buildPrompt("engine-suggest", {proj: p, rules: ["simple","multi","funnel","trifecta"], context: projectContext(p),
    body: `Suggest the right-sizing score and the gates for this project from what is known. Never invent facts; answer "unknown" when the project does not say.
Score 0-2 with one reason each: path (0 steps known in advance, 2 cannot be known), input (0 clean tables, 2 free text or web), rules (0 one page, 2 many changing rules), breadth (0 one thread, 2 many independent searches), value (0 rare and low, 2 frequent and high), errorcost (0 easy to undo, 2 costly or permanent), capacity (0 low ability to maintain, 2 high).
Gates: G2 is the job done today at least about twice a month (no = not done)? G3 must output be exactly reproducible? G4 is the task strictly sequential? G5 can a non-developer owner maintain it (no = cannot)? G6 hiring, credit, education scoring, or personal legal, financial or medical advice? G7 private data + untrusted content + a way to send data out?`,
    schema: `{"score":{"path":{"v":1,"why":"…"},"input":{},"rules":{},"breadth":{},"value":{},"errorcost":{},"capacity":{}},"gates":{"G2":{"ans":"yes|no|unknown","evidence":"…"},"G3":{},"G4":{},"G5":{},"G6":{},"G7":{}}}`});
  const r = await runAI("eng-suggest", t("eng.suggesting"), prompt, {pid: p && p.id, step: "require"});
  if (!r) return;
  p = liveP(p); snapshot(p, t("eng.suggesting"));   // 1.6.0: its own action (ran unrecorded as an automatic step)
  const e = eng(p);
  for (const d of SCORE_DIMS){ const s = (r.score || {})[d]; if (s && s.v != null && e.score.auto[d] == null){ e.score.auto[d] = clamp(num(s.v, 1), 0, 2); e.score.why = e.score.why || {}; e.score.why[d] = str(s.why); } }
  for (const g of GATES){ const s = (r.gates || {})[g.id]; if (s && s.ans && !(e.gates[g.id] || {}).sug) e.gates[g.id] = Object.assign({}, e.gates[g.id] || {}, {sug: {ans: oneOf(s.ans, ["yes","no","unknown"], "unknown"), evidence: str(s.evidence)}}); }
  e.suggestAt = now(); engineRecompute(p); touch(p); render();
}

/* ---------- trial run: the job with a plain prompt on example cases ---------- */
async function aiTrialCases(p){
  // 1.4.1: the trial and the mini-test use your judged examples (the same ones as the tests), so they measure what you said is good
  const exs = arr(p.goal && p.goal.examples).filter(e => (e.verdict === "good" || e.verdict === "bad") && str(e.input).trim());
  if (exs.length >= 3){
    snapshot(p, t("eng.trial.draft"));   // 1.6.0: an automatic step records its own action (it ran unrecorded while the budget kept it off)
    const e0 = eng(p); e0.trial.runs = []; const keep = arr(e0.trial.cases).filter(c => c.real);
    e0.trial.cases = [...keep, ...exs.slice(0, 20 - keep.length).map(e => ({id: "", input: str(e.input), expect: e.verdict === "good" ? t("trial.exgood", {id: e.id, x: str(e.why) || trunc(str(e.output), 300)}) : t("trial.exbad", {id: e.id, x: str(e.why) || trunc(str(e.output), 300)}), kind: e.verdict === "good" ? "typical" : "tricky", real: false, fromEx: e.id}))].map((c, i) => Object.assign(c, {id: "C" + (i + 1)}));
    touch(p); render(); return;
  }
  const zh = p.lang === "zh" || /chinese|中文|chinesisch/i.test(JSON.stringify(p.northStar) + str(p.intake.raw));
  // 1.4: the trial measures the plain job, so the cases come from the goal and the idea only, with outcome-level expectations
  // (never project details such as ids, file names or a library that only a finished design would know)
  const prompt = buildPrompt("trial-cases", {proj: p, rules: ["evals"], context: projectContext(p, {only: ["north_star","goal_criteria","clarified_idea","raw_idea"]}),
    body: `Draft 12 realistic example cases for a trial run of this tool before anything is designed: 8 typical, 3 edge, 1 tricky. ${zh ? "Write 2 of them in Simplified Chinese, as a Chinese-speaking user would." : ""} Each case: the input the tool would get, and in one or two sentences what a good result must contain. Expectations are about the outcome a person would judge (useful, correct, complete, safe), never about internal details such as ids, file names, slugs, storage or a library that only a finished design would know. Each expectation must be checkable from the output alone.`,
    schema: `{"cases":[{"input":"…","expect":"…","kind":"typical|edge|tricky"}]}`});
  const r = await runAI("trial-cases", t("eng.trial.drafting"), prompt, {pid: p && p.id, step: "test", validate: o => arr(o.cases).length >= 5});
  if (!r) return;
  p = liveP(p); snapshot(p, t("eng.trial.draft"));   // 1.6.0: its own action
  const e = eng(p);
  e.trial.runs = [];   // new cases: old results no longer apply
  const keep = arr(e.trial.cases).filter(c => c.real);
  e.trial.cases = [...keep, ...arr(r.cases).slice(0, 20 - keep.length).map(c => ({id: "", input: str(c.input), expect: str(c.expect), kind: oneOf(c.kind, ["typical","edge","tricky"], "typical"), real: false}))].map((c, i) => Object.assign(c, {id: "C" + (i + 1)}));
  touch(p); render();
}
function plainPrompt(p, input){
  return `[[task:trial-plain]]
${str(p.northStar.goal) ? "Goal: " + p.northStar.goal + "\n" : ""}${str(p.northStar.users) ? "For: " + p.northStar.users + "\n" : ""}${arr(p.goal && p.goal.criteria).length ? "A good result: " + p.goal.criteria.filter(c => !c.neg).slice(0, 8).map(c => "when " + critClean(c.when, "when") + ", " + critClean(c.then, "then")).join("; ") + "\n" : ""}
${input}`;
}
async function judgeBatch(key, label, items, step = "judge", proj = null){
  const prompt = `[[task:trial-judge]]
You are an impartial grader. For each case, decide whether the OUTPUT meets what a good result must contain (EXPECT). Grade substance only, not style or length. Be strict.
${items.map(x => `<case id="${x.id}">\n<expect>${x.expect}</expect>\n<output>${trunc(x.out, 4000)}</output>\n</case>`).join("\n")}
Write each reason in ${langName(contentLang(proj))}.
Reply with only JSON: {"verdicts":[{"id":"C1","pass":true,"why":"one sentence"}]}`;
  const r = await runAI(key, label, prompt, {step, fresh: true});
  if (!r || !arr(r.verdicts).length) return null;   // no verdict is not a failure: nothing is recorded
  const m = new Map(arr(r.verdicts).map(v => [str(v.id), v]));
  return items.map(x => { const v = m.get(x.id); return {caseId: x.id, out: trunc(x.out, 2000), pass: !!(v && v.pass), why: str(v && v.why), judged: !!v}; });
}
async function aiTrialRun(p){
  const e = eng(p);
  if (!arr(e.trial.cases).length) await aiTrialCases(p);
  if (!arr(e.trial.cases).length) return;
  const s = settingById(dial(p, "setting"));
  const outs = [];
  let i = 0;
  for (const c of e.trial.cases){
    i++;
    const out = await runAI("trial", t("eng.trial.running", {i, n: e.trial.cases.length}), plainPrompt(p, c.input), {pid: p && p.id, json: false, tier: s.tier, fresh: true});
    if (out == null) break;
    outs.push({id: c.id, expect: c.expect, out});
  }
  if (!outs.length) return;
  const judged = await judgeBatch("trial-judge", t("eng.trial.judging"), outs, "judge", p);
  if (!judged){ toast(t("eng.judge.none"), "err"); return; }
  p = liveP(p); snapshot(p, t("eng.trial.run")); const e2 = eng(p);   // 1.6.0: its own action
  e2.trial.runs = judged; e2.trial.at = now(); e2.trial.v14 = true;
  const sm = trialSummary(p);
  logClimb(p, "trial", "R2 · " + s.short, sm.rate >= 90 ? "R2" : dial(p, "rung"), t("eng.trial.log", {a: sm.pass, b: sm.n}));
  logAct(p, t("act.trial", {a: sm.pass, b: sm.n}), {step: "arch", important: true});
  engineRecompute(p); touch(p); render();
}

/* ---------- mini-test: two settings × 5 cases × 3 tries ---------- */
async function sampleWith(key0, label, prompt, setting){
  const key = akey(key0);
  const sample = await getSample(); if (!sample) return null;
  if (AI.running.has(key)) return null;
  const ctl = new AbortController();
  AI.running.set(key, {ctl, text: "", label, started: Date.now(), tier: setting.tier, step: "test", pid: key.split("|")[0], k: key0}); renderBusy(key);
  try{
    countUsage((TIER_WEIGHT[setting.tier] || 3) * ({medium: 1, high: 1.4, xhigh: 1.9, max: 2.5}[setting.effort] || 1));
    // the owner asked for this comparison of named settings, so the model is named; if it cannot answer, the tier answers and we record that
    const opts = {signal: ctl.signal, modelTier: setting.tier, model: setting.model, cache: false};
    if (["low","medium","high"].includes(setting.effort)) opts.effort = setting.effort;   // the page can only ask for low, medium or high
    const r = await sample(prompt, opts);   // ok:rule  the tool's own prompt is measured as it will run, so PT adds nothing to it
    return {text: r.text, applied: r.modelApplied || "", tierApplied: r.modelTierApplied || setting.tier};
  }catch(e){ const code = e && e.code || "upstream_error"; if (code !== "cancelled") toast(t(AI_ERR[code] || "ai.err.upstream"), "err"); return null; }
  finally{ AI.running.delete(key); render(); }
}
async function aiMiniTest(p){
  const e = eng(p);
  if (!arr(e.trial.cases).length) await aiTrialCases(p);
  const cases = arr(e.trial.cases).slice(0, 5); if (!cases.length) return;
  const a0 = settingById(dial(p, "setting"));
  const a = ["low","medium","high"].includes(a0.effort) ? a0 : SETTINGS_LADDER.find(s => s.model === a0.model && s.effort === "high") || a0;
  const b = nextMeasurable(a.id);
  const settings = b ? [a, b] : [a];
  // 1.4: with a package, the mini-test runs the same harness as the tests (instructions AND knowledge files); before that, the plain prompt
  const hasPkg = arr(p.pkg.sections).some(s => s.dest === "instructions");
  const results = [];
  let n = 0; const total = settings.length * cases.length * 3;
  for (const s of settings){
    const runs = [];
    for (let k = 0; k < 3; k++){
      const outs = [];
      for (const c of cases){
        n++;
        const prompt = hasPkg ? agentTranscriptPrompt(p, {input: c.input, simulated: ""}, p.pkg.sections).replace("[[task:simulate]]", "[[task:mini]]") : plainPrompt(p, c.input).replace("[[task:trial-plain]]", "[[task:mini]]");
        const r = await sampleWith("mini", t("eng.mini.running", {i: n, n: total, s: s.short + " · " + s.effort}), prompt, s);
        if (!r){ break; }
        outs.push({id: c.id, expect: c.expect, out: r.text, applied: r.applied});
      }
      if (outs.length < cases.length) break;
      const judged = await judgeBatch("mini-judge", t("eng.trial.judging"), outs, "judge", p);
      if (!judged){ toast(t("eng.judge.none"), "err"); break; }
      judged.forEach((j, i) => runs.push(Object.assign(j, {try: k, applied: outs[i].applied})));
    }
    if (runs.length) results.push({setting: s.id, runs, named: runs.some(r => r.applied), at: now(), harness: hasPkg ? "package" : "plain", v14: true});
  }
  if (!results.length) return;
  p = liveP(p); snapshot(p, t("eng.mini"));   // 1.6.0: its own action (ran unrecorded as an automatic step)
  const em = eng(p);
  em.mini = Object.assign({}, em.mini, {results, at: now()});
  em.ceiling = ceilingCard(p);
  const [ra, rb] = results.map(miniSummary);
  if (rb && ra && rb.passK > ra.passK + 10) logClimb(p, "setting", a.id, b.id, t("eng.mini.log.up", {a: ra.passK, b: rb.passK}));
  logAct(p, t("act.mini", {x: results.map(r => settingById(r.setting).short + " " + settingById(r.setting).effort + " " + miniSummary(r).passK + "%").join(" · ")}), {step: "arch", important: true});
  touch(p); render();
}

/* ---------- a test from real use (gap 4) ---------- */
async function aiTestFromItem(p, item){
  const prompt = buildPrompt("test-from-use", {proj: p, rules: ["evals","overfit"], context: projectContext(p),
    body: `Turn this real-use item into one test case for the tool. Keep the real input (shorten if long), add simulated tool or data results so it can be run without the internet, the requirement ids it checks, and 2-4 pass criteria judged yes/no from the output alone.
<item>\nTitle: ${item.title}\nInput: ${item.input || ""}\nDetail: ${trunc(item.body, 2000)}\n</item>`,
    schema: `{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"…","reqIds":["R1"],"criteria":["…"]}`});
  const r = await runAI("totest-" + item.id, t("ib.totest"), prompt, {pid: p && p.id, step: "test", validate: o => arr(o.criteria).length > 0});
  if (!r) return;
  const id = nextTestId(p);
  p.tests.push({id, title: str(r.title), category: oneOf(r.category, ["normal","edge","adversarial","empty","language"], "edge"), input: str(r.input), simulated: str(r.simulated), reqIds: arr(r.reqIds).map(str), criteria: arr(r.criteria).map(str).filter(Boolean), heldOut: false, fromUse: true});
  item.testId = id;
  logAct(p, t("act.fromreal", {id}), {step: "test", important: true});
  touch(p); render();
}
