/* ===================== AI TASKS & DETERMINISTIC ENGINES ===================== */
const STATUS3 = ["unknown","assumed","confirmed"];
const ACAT = ["value","usability","viability","feasibility","gtm","legal"];
function oneOf(v, list, d){ return list.includes(v) ? v : d; }
function conf(v){ return oneOf(v, ["high","medium","low"], "medium"); }

/* ---------- 1. Clarify intake ---------- */
async function aiClarify(p){
  const raw = str(p.intake.raw).trim();
  if (!raw){ toast(t("cap.needraw"), "err"); return; }
  const prompt = buildPrompt("clarify", {
    rules:["golden","elicit","assume"],
    context: projectContext(p),
    body:`The person dumped a raw idea (in <raw_idea>). Turn it into a clean, unambiguous restatement that keeps every intention they expressed and invents nothing. Then extract a North Star, and list contradictions, unclear points and missing information that matter for building the solution. For each missing item say briefly why it matters. Mark how confident you are in the restatement.`,
    schema:`{"clean":"restated idea, 3-10 sentences","northStar":{"problem":"","goal":"","success":"measurable success measure or empty if unknown","users":"","constraints":"","now":"current state"},"contradictions":["…"],"ambiguities":["…"],"missing":[{"item":"…","why":"…"}],"confidence":"high|medium|low"}`
  });
  const r = await runAI("clarify", t("cap.clarifying"), prompt, {step:"capture", images: p._images || null});
  if (!r) return;
  snapshot(p);
  p.intake.clean = str(r.clean);
  p.intake.contradictions = arr(r.contradictions).map(str);
  p.intake.ambiguities = arr(r.ambiguities).map(str);
  p.intake.missing = arr(r.missing).map(m => typeof m === "string" ? {item:m, why:""} : {item:str(m.item), why:str(m.why)});
  p.intake.confidence = conf(r.confidence);
  const ns = r.northStar || {};
  p.nsDraft = {problem:str(ns.problem), goal:str(ns.goal), success:str(ns.success), users:str(ns.users), constraints:str(ns.constraints), now:str(ns.now)};
  touch(p); render();
}

/* ---------- 2. Understand ---------- */
async function aiUnderstand(p, kind){
  const bodies = {
    whys:`Run a "5 whys" analysis on the problem to find the root need. Produce 5 levels; each level is a question and your best-guess answer drawn from the project. Mark answers that are guesses so the person can correct them.`,
    jtbd:`State the job to be done: "When [situation], I want to [motivation], so I can [expected outcome]." Then list functional, emotional and social parts of the job.`,
    reframe:`Offer 4 genuinely different reframings of the problem (for example a narrower problem, a broader one, a problem behind the problem, and a non-AI reading). For each, say what would be built differently.`,
    walkthrough:`Narrate a realistic day-in-the-life of the finished solution in use, step by step with times (the "Ablauf"), from trigger to the person acting on the result. Then list the steps or decisions this walkthrough revealed as missing or undecided.`,
    premortem:`Run a pre-mortem: it is six months after launch and the solution failed. List 8 specific reasons it failed, each with likelihood (1-5), impact (1-5) and a mitigation.`,
    devil:`Act as a respectful devil's advocate. Give the strongest honest arguments that this plan is wrong or not worth building, and what evidence would settle each point.`
  };
  const schemas = {
    whys:`{"whys":[{"q":"Why …?","a":"…","guess":true}],"rootNeed":"…"}`,
    jtbd:`{"jtbd":"When …, I want to …, so I can …","functional":["…"],"emotional":["…"],"social":["…"]}`,
    reframe:`{"reframes":[{"text":"…","differently":"…"}]}`,
    walkthrough:`{"walkthrough":[{"time":"07:00","step":"…"}],"gaps":["…"]}`,
    premortem:`{"failures":[{"text":"…","likelihood":3,"impact":4,"mitigation":"…"}]}`,
    devil:`{"arguments":[{"point":"…","evidence":"what would settle it"}]}`
  };
  const prompt = buildPrompt("understand-" + kind, {rules:["assume","funnel","simple"], platform:true, context: projectContext(p), body: bodies[kind], schema: schemas[kind]});
  const r = await runAI("und-" + kind, t("und.running"), prompt, {step:"understand"});
  if (!r) return;
  snapshot(p);
  const u = p.understand;
  if (kind === "whys"){ u.whys = arr(r.whys).map(w => ({q:str(w.q), a:str(w.a), guess:!!w.guess})); u.rootNeed = str(r.rootNeed); }
  if (kind === "jtbd"){ u.jtbd = str(r.jtbd); u.jtbdParts = {functional:arr(r.functional).map(str), emotional:arr(r.emotional).map(str), social:arr(r.social).map(str)}; }
  if (kind === "reframe"){ u.reframes = arr(r.reframes).map(x => ({id:uid("rf"), text:str(x.text), differently:str(x.differently), chosen:false})); }
  if (kind === "walkthrough"){ u.walkSteps = arr(r.walkthrough).map(s => ({time:str(s.time), step:str(s.step)})); u.walkthrough = u.walkSteps.map(s => s.time + " " + s.step).join("\n"); u.walkGaps = arr(r.gaps).map(str); }
  if (kind === "premortem"){
    u.premortem = arr(r.failures).map(f => ({text:str(f.text), likelihood:clamp(num(f.likelihood,3),1,5), impact:clamp(num(f.impact,3),1,5), mitigation:str(f.mitigation)}));
    for (const f of u.premortem){ if (!p.risks.some(x => x.text === f.text)) p.risks.push({id:uid("rk"), text:f.text, likelihood:f.likelihood, impact:f.impact, mitigation:f.mitigation, status:"open", source:"premortem"}); }
    toast(t("und.premortemadded", {n: u.premortem.length}), "ok");
  }
  if (kind === "devil"){ u.devil = arr(r.arguments).map(a => ({point:str(a.point), evidence:str(a.evidence)})); }
  touch(p); render();
}

/* ---------- 3. Interview ---------- */
async function aiInterview(p){
  const depth = p.depth || "standard";
  const n = depth === "quick" ? 1 : depth === "deep" ? 3 : 2;
  const dimsDesc = DIMS.map(d => "- " + d.id + ": " + d.ai).join("\n");
  const prompt = buildPrompt("interview", {
    rules:["elicit","assume","golden","simple","trifecta","funnel"], platform:true, context: projectContext(p),
    body:`You are interviewing the person to get the complete picture before anything is designed. Coverage dimensions:\n${dimsDesc}\n
First, update every dimension's status from the answers so far: "confirmed" (the person said it clearly), "assumed" (you inferred it; state the assumption), or "unknown". Give a one-sentence summary per dimension.
Then choose the ${n} most valuable next question(s): pick the dimensions where a wrong guess would cost the most. Prefer concrete questions with 2-5 answer options the person can tap, mark your recommended option, and allow free text. Always cover "look" (look and output form) before stopping, because AI interviewers usually skip it. Do not repeat questions already answered.
Also extract new assumptions you are making (category: value|usability|viability|feasibility|gtm|legal; impact and risk 1-5), any concerns that will matter in a later phase (phase id one of: assume, require, arch, build, review, test, launch, operate), and flag drift if recent answers pull away from the North Star.
Stop rule: set ready=true only when no dimension that matters for this project is "unknown" and the riskiest ones are confirmed.`,
    schema:`{"dims":[{"id":"purpose","status":"unknown|assumed|confirmed","summary":"…"}],"questions":[{"dim":"look","text":"…","why":"why this matters now","options":["…","…"],"recommended":0}],"assumptions":[{"text":"…","category":"feasibility","impact":4,"risk":3}],"foresight":[{"phase":"arch","text":"…"}],"drift":"empty string or a one-sentence warning","ready":false,"readyReason":"…","coverageNote":"…"}`
  });
  const r = await runAI("interview", t("int.thinking"), prompt, {step:"interview"});
  if (!r) return;
  snapshot(p);
  for (const d of arr(r.dims)){ if (DIMS.some(x => x.id === d.id)){ const cur = p.dims[d.id] || {}; const st = oneOf(d.status, STATUS3, "unknown"); if (cur.status === "confirmed" && cur.locked) continue; p.dims[d.id] = {status: st, summary: str(d.summary) || cur.summary || ""}; } }
  p.pendingQs = arr(r.questions).slice(0, 3).map(q => ({id:uid("q"), dim: DIMS.some(d => d.id === q.dim) ? q.dim : "scope", text:str(q.text), why:str(q.why), options:arr(q.options).map(str).slice(0,6), recommended: num(q.recommended, -1)}));
  for (const a of arr(r.assumptions)){ const txt = str(a.text); if (txt && !p.assumptions.some(x => x.text === txt)) p.assumptions.push({id:uid("as"), text:txt, category:oneOf(a.category, ACAT, "feasibility"), impact:clamp(num(a.impact,3),1,5), risk:clamp(num(a.risk,3),1,5), status:"untested", test:""}); }
  for (const f of arr(r.foresight)){ const txt = str(f.text); if (txt && !p.foresight.some(x => x.text === txt)) p.foresight.push({id:uid("fs"), text:txt, phase:oneOf(f.phase, PHASES.map(x=>x.id), "arch"), done:false, ai:true}); }
  p.drift = str(r.drift);
  p.interviewReady = !!r.ready; p.interviewReadyReason = str(r.readyReason); p.coverageNote = str(r.coverageNote);
  touch(p); render();
}

/* ---------- 4. Requirements ---------- */
async function aiRequirements(p){
  const prompt = buildPrompt("requirements", {
    rules:["spec","golden","funnel","evals"], platform:true, context: projectContext(p),
    body:`Write the requirements for this solution as testable GIVEN / WHEN / THEN statements, prioritised must / should / could. Cover function, flow, outputs, look, quality bars and guardrails. Then write the explicit out-of-scope list and a short constitution (3-7 non-negotiable principles). Each requirement must be checkable by a test. Match the amount of specification to the size of the project.`,
    schema:`{"requirements":[{"title":"short name","given":"…","when":"…","then":"…","priority":"must|should|could","dim":"scope"}],"outOfScope":["…"],"constitution":["…"]}`
  });
  const r = await runAI("require", t("req.running"), prompt, {step:"require"});
  if (!r) return;
  snapshot(p);
  const keep = p.requirements.filter(x => x.manual);
  p.requirements = keep.concat(arr(r.requirements).map((x, i) => ({id:"R" + (keep.length + i + 1), title:str(x.title), given:str(x.given), when:str(x.when), then:str(x.then), priority:oneOf(x.priority, ["must","should","could"], "should"), dim:str(x.dim)})));
  p.outOfScope = arr(r.outOfScope).map(str);
  p.constitution = arr(r.constitution).map(str);
  touch(p); render();
}

/* ---------- 5. Architecture ---------- */
async function aiArchitecture(p){
  const prompt = buildPrompt("architecture", {
    rules:["simple","multi","delegate","state","funnel","trifecta","reversible","projects"], platform:true, context: projectContext(p),
    body:`Design the solution. First, list 3-5 real alternative approaches across the complexity ladder, including at least one no-build or minimal option (existing tool, manual step, plain code) if sensible, and single prompt / fixed workflow / single agent / orchestrator with workers where they apply. Score each 1-5 on reliability, cost (5 = cheapest), safety, effort to build (5 = least effort), maintainability, and platform fit with Claude Projects. Recommend one, explain why, and state what would change your mind.
Then, for the recommended approach, define components (kind: ai | code | hybrid | human | platform, following the rule: plain code for exact rules, AI only for open-ended parts, check AI output with rules), how they connect (links), the human steps (minimise them; the person wants the lowest possible human effort), the data plan (source, freshness, legal status), a rough usage estimate per run, and new risks this design introduces.`,
    schema:`{"options":[{"id":"o1","name":"…","kind":"none|prompt|workflow|agent|multi","summary":"…","scores":{"reliability":4,"cost":3,"safety":4,"effort":3,"maintainability":4,"platformFit":5},"pros":["…"],"cons":["…"]}],"recommended":"o2","why":"…","changeMind":"…","components":[{"id":"c1","name":"…","kind":"ai","role":"…","inputs":"…","outputs":"…","reason":"why this kind"}],"links":[{"from":"c1","to":"c2","label":"…"}],"humanSteps":["…"],"dataPlan":[{"source":"…","freshness":"…","legal":"…","risk":"…"}],"costEstimate":"…","risks":[{"text":"…","likelihood":3,"impact":3,"mitigation":"…"}]}`
  });
  const r = await runAI("arch", t("arch.running"), prompt, {step:"arch"});
  if (!r) return;
  snapshot(p);
  const a = p.arch;
  a.options = arr(r.options).map((o, i) => ({id:str(o.id) || "o" + (i+1), name:str(o.name), kind:oneOf(o.kind, ["none","prompt","workflow","agent","multi"], "workflow"), summary:str(o.summary), scores:Object.fromEntries(["reliability","cost","safety","effort","maintainability","platformFit"].map(k => [k, clamp(num((o.scores||{})[k],3),1,5)])), pros:arr(o.pros).map(str), cons:arr(o.cons).map(str)}));
  a.recommended = str(r.recommended) || (a.options[0] && a.options[0].id);
  a.why = str(r.why); a.changeMind = str(r.changeMind);
  a.components = arr(r.components).map((c, i) => ({id:str(c.id) || "c" + (i+1), name:str(c.name), kind:oneOf(c.kind, ["ai","code","hybrid","human","platform"], "ai"), role:str(c.role), inputs:str(c.inputs), outputs:str(c.outputs), reason:str(c.reason)}));
  a.links = arr(r.links).map(l => ({from:str(l.from), to:str(l.to), label:str(l.label)}));
  a.humanSteps = arr(r.humanSteps).map(str);
  a.dataPlan = arr(r.dataPlan).map(d => ({source:str(d.source), freshness:str(d.freshness), legal:str(d.legal), risk:str(d.risk)}));
  a.costEstimate = str(r.costEstimate);
  for (const k of arr(r.risks)){ const txt = str(k.text); if (txt && !p.risks.some(x => x.text === txt)) p.risks.push({id:uid("rk"), text:txt, likelihood:clamp(num(k.likelihood,3),1,5), impact:clamp(num(k.impact,3),1,5), mitigation:str(k.mitigation), status:"open", source:"architecture"}); }
  touch(p); render();
}
async function aiMockup(p){
  const prompt = buildPrompt("mockup", {
    rules:["golden"], context: projectContext(p),
    body:`Create a realistic visual mockup of what the person will SEE when the finished solution delivers its result (for example the report, board, ranked list or message). Use plausible example content clearly marked as example. Self-contained HTML with inline CSS only, no scripts, no external resources, readable at 900px width, light background. Match the look the person described if any.`,
    schema:`{"html":"<div>…</div>","caption":"one sentence describing what the mockup shows"}`
  });
  const r = await runAI("mockup", t("arch.mocking"), prompt, {step:"arch"});
  if (!r) return;
  p.arch.mockupHtml = str(r.html).replace(/<script[\s\S]*?<\/script>/gi, ""); p.arch.mockupCaption = str(r.caption);
  touch(p); render();
}

/* ---------- 6. Compile ---------- */
function modelGuidance(target){
  if (/opus-5|opus 5/i.test(target)) return kpText(["opus5"]);
  if (/fable/i.test(target)) return kpText(["fable"]);
  return "";
}
async function aiCompile(p){
  const target = p.targetModel || "claude-opus-5-5";
  const prev = p.pkg && arr(p.pkg.sections).length ? "\n<current_package>\n" + JSON.stringify(p.pkg.sections.map(s => ({id:s.id, dest:s.dest, title:s.title, content:s.content}))).slice(0, 30000) + "\n</current_package>\nImprove the current package rather than starting over; keep what works." : "";
  const prompt = buildPrompt("compile", {
    rules:["golden","why","positive","short","calm","examples","xml","action","delegate","state","trifecta","reversible","projects","funnel"], platform:true,
    context: projectContext(p, {full:true}) + prev,
    body:`Compile the complete, ready-to-paste Claude Project package for the chosen architecture. Write all package content in English. Target model: ${target}. ${modelGuidance(target)}
Produce only the sections this design actually needs, each mapped to where it goes:
- dest "instructions": the Project instructions (short, clear, reasons attached, positive phrasing, structured with XML tags; include the definition of done and the output format).
- dest "knowledge": reference files with an exact file name (e.g. scoring-rubric.md, sources.md, examples.md, tasks.json for state).
- dest "scheduled": scheduled task prompts with cadence (hourly | daily | weekly | weekdays | manual) and a time if relevant.
- dest "subagent": delegation briefs only if the design uses subagents (objective, boundaries, tools, return format).
- dest "skill": a skill only if a reusable procedure is worth loading on demand (name kebab-case, description under 200 characters).
- dest "artifact": a brief for building a results page/board if the design needs one.
- dest "handoff": prompts to paste into a Claude chat to build parts that need building.
Every line must earn its place. Map each section to the requirement ids it serves. Do not include generic "double-check your work" instructions for Opus 5 models.`,
    schema:`{"sections":[{"id":"instructions","dest":"instructions|knowledge|scheduled|subagent|skill|artifact|handoff","title":"…","filename":"only for knowledge/skill","cadence":"only for scheduled","content":"full text","reqIds":["R1"],"why":"one sentence on why this section exists"}],"rationale":["key design choices, in the person's language"]}`,
    userLang: true
  });
  const r = await runAI("compile", t("build.compiling"), prompt, {step:"build"});
  if (!r) return;
  snapshot(p);
  const secs = arr(r.sections).map((s, i) => ({id:str(s.id) || "s" + (i+1), dest:oneOf(s.dest, Object.keys(DEST), "knowledge"), title:str(s.title), filename:str(s.filename), cadence:str(s.cadence), content:str(s.content), reqIds:arr(s.reqIds).map(str), why:str(s.why), mirror:""}));
  if (!secs.length){ toast(t("ai.err.empty"), "err"); return; }
  const ids = new Set(); secs.forEach((s, i) => { if (ids.has(s.id)) s.id = s.id + "-" + i; ids.add(s.id); });
  p.pkg = {sections: secs, targetModel: target, rationale: arr(r.rationale).map(str), compiledAt: now(), kp: KP_VERSION};
  saveVersion(p, t("ver.compiled"));
  touch(p); render();
}
async function aiMirror(p){
  if (LANG === "en"){ toast(t("build.mirror.en"), ""); return; }
  const secs = arr(p.pkg.sections);
  if (!secs.length) return;
  const prompt = buildPrompt("mirror", {
    rules:[], userLang:false,
    body:`Translate each section's content into ${langName(LANG)} so the person can check exactly what their agent is told. Translate meaning in context, not word by word; keep XML tags, file names, code, JSON keys and placeholders unchanged. Keep the structure line by line where possible.\n\n<sections>\n${JSON.stringify(secs.map(s => ({id:s.id, content:s.content}))).slice(0, 60000)}\n</sections>`,
    schema:`{"sections":[{"id":"…","mirror":"translated content"}]}`
  });
  const r = await runAI("mirror", t("build.mirroring"), prompt, {step:"build"});
  if (!r) return;
  for (const m of arr(r.sections)){ const s = secs.find(x => x.id === m.id); if (s){ s.mirror = str(m.mirror); s.mirrorLang = LANG; } }
  p.showMirror = true; touch(p); render();
}

/* ---------- 7. Review (red team) ---------- */
async function aiReview(p, lensIds){
  const secs = arr(p.pkg.sections);
  if (!secs.length){ toast(t("rev.needpkg"), "err"); return; }
  let added = 0;
  for (const lid of lensIds){
    const lens = LENSES.find(l => l.id === lid); if (!lens) continue;
    const prompt = buildPrompt("review-" + lid, {
      role:`You are an independent reviewer who did NOT write this package. Your only job is to find real problems through one lens: ${lens.en}. You are rigorous and fair: report only issues that matter, never pad the list, and say so when the package is sound.`,
      rules: null, platform:true, context: projectContext(p),
      body:`Lens: ${lens.en}. Focus: ${lens.ai}\n\n<package target_model="${esc(p.pkg.targetModel || "")}">\n${JSON.stringify(secs.map(s => ({id:s.id, dest:s.dest, title:s.title, cadence:s.cadence, content:s.content}))).slice(0, 50000)}\n</package>\n\nReport findings with severity (critical | high | medium | low), the section id and a short quote of where, the issue, and a concrete fix (exact replacement text when possible). Maximum 8 findings.`,
      schema:`{"findings":[{"severity":"high","section":"instructions","where":"short quote","issue":"…","fix":"…"}],"verdict":"one sentence overall assessment"}`
    });
    const r = await runAI("review", t("rev.running", {lens: L(lens)}), prompt, {step:"review"});
    if (!r) break;
    p.reviewVerdicts = p.reviewVerdicts || {}; p.reviewVerdicts[lid] = str(r.verdict);
    for (const f of arr(r.findings)){
      p.findings.push({id:uid("fd"), lens:lid, severity:oneOf(f.severity, ["critical","high","medium","low"], "medium"), section:str(f.section), where:str(f.where), issue:str(f.issue), fix:str(f.fix), status:"open", version:p.versionNo, at:now()});
      added++;
    }
    touch(p);
  }
  p.reviewedVersion = p.versionNo;
  toast(t("rev.done", {n: added}), "ok"); render();
}
async function aiApplyFixes(p, ids){
  const fs = p.findings.filter(f => ids.includes(f.id) && f.status === "open");
  if (!fs.length) return;
  const secs = p.pkg.sections;
  const prompt = buildPrompt("applyfix", {
    rules:["golden","why","positive","short","calm"], userLang:true,
    body:`Apply these review fixes to the package. Change only what each fix requires; keep everything else identical. Keep package content in English.\n\n<fixes>\n${JSON.stringify(fs.map(f => ({id:f.id, section:f.section, where:f.where, issue:f.issue, fix:f.fix})))}\n</fixes>\n\n<package>\n${JSON.stringify(secs.map(s => ({id:s.id, content:s.content}))).slice(0, 60000)}\n</package>`,
    schema:`{"sections":[{"id":"only sections you changed","content":"full new content"}],"applied":["finding ids applied"],"summary":"one sentence describing the changes, in the person's language"}`
  });
  const r = await runAI("fix", t("rev.fixing"), prompt, {step:"review"});
  if (!r) return;
  snapshot(p);
  for (const s of arr(r.sections)){ const cur = secs.find(x => x.id === s.id); if (cur && str(s.content)){ cur.content = str(s.content); cur.mirror = ""; } }
  const applied = arr(r.applied).map(str);
  for (const f of fs){ if (applied.includes(f.id) || !applied.length){ f.status = "fixed"; f.fixedAt = now(); } }
  saveVersion(p, str(r.summary) || t("ver.fixes"));
  touch(p); render();
}

/* ---------- 8. Tests, simulation, judging ---------- */
async function aiTests(p){
  const prompt = buildPrompt("tests", {
    rules:["evals","overfit","trifecta"], platform:true, context: projectContext(p),
    body:`Create a test set for this solution: 8-14 cases across categories normal, edge, adversarial (including prompt-injection inside data), empty-or-broken input, and wrong-language input. Each case: the situation/input given to the agent, simulated tool or data results the agent would see (so the run can be simulated without the internet), the requirement ids it checks, and 2-4 pass criteria that a reviewer can judge yes/no from the output alone. Mark about a quarter of the cases as heldOut=true; those are kept back to check improvements honestly.`,
    schema:`{"tests":[{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"tool/data results the agent sees","reqIds":["R1"],"criteria":["…"],"heldOut":false}]}`
  });
  const r = await runAI("tests", t("test.generating"), prompt, {step:"test"});
  if (!r) return;
  snapshot(p);
  const start = p.tests.length;
  arr(r.tests).forEach((x, i) => p.tests.push({id:"T" + (start + i + 1), title:str(x.title), category:oneOf(x.category, ["normal","edge","adversarial","empty","language"], "normal"), input:str(x.input), simulated:str(x.simulated), reqIds:arr(x.reqIds).map(str), criteria:arr(x.criteria).map(str).filter(Boolean), heldOut:!!x.heldOut}));
  touch(p); render();
}
function agentTranscriptPrompt(p, test, sections){
  const instr = sections.filter(s => s.dest === "instructions").map(s => s.content).join("\n\n");
  const know = sections.filter(s => s.dest === "knowledge").map(s => `<file name="${esc(s.filename || s.title)}">\n${trunc(s.content, 6000)}\n</file>`).join("\n");
  const sched = sections.filter(s => s.dest === "scheduled" || s.dest === "subagent").map(s => `<${s.dest} title="${esc(s.title)}">\n${trunc(s.content, 4000)}\n</${s.dest}>`).join("\n");
  return `[[task:simulate]]
You are now the AI agent configured by the setup below, running inside a Claude Project. Behave exactly as this setup makes you behave — follow its instructions, including their gaps and flaws; do not fix or improve them. You have no live internet in this simulation: wherever you would call a tool or search, use the simulated results provided, and mark anything you would have to invent as [SIMULATED].

<project_instructions>
${instr}
</project_instructions>
<project_knowledge>
${know}
</project_knowledge>
${sched ? "<task_prompts>\n" + sched + "\n</task_prompts>" : ""}

<simulated_tool_results>
${test.simulated || "(none)"}
</simulated_tool_results>

<user_or_trigger>
${test.input}
</user_or_trigger>

Produce exactly the output the agent would deliver.`;
}
async function aiRunTests(p, {ids=null, trials=1, versionLabel=null, sections=null} = {}){
  const secs = sections || p.pkg.sections;
  if (!arr(secs).length){ toast(t("rev.needpkg"), "err"); return null; }
  const list = p.tests.filter(x => !ids || ids.includes(x.id));
  if (!list.length){ toast(t("test.none"), "err"); return null; }
  const run = {id:uid("run"), versionNo: versionLabel ?? p.versionNo, at:now(), trials, results:[], label: versionLabel != null ? String(versionLabel) : ""};
  let i = 0;
  for (const test of list){
    for (let k = 0; k < trials; k++){
      i++;
      const out = await runAI("sim", t("test.simulating", {i, n: list.length * trials, id: test.id}), agentTranscriptPrompt(p, test, secs), {json:false, step:"test"});
      if (out == null){ p.runs.unshift(run); finishRun(p, run); return run; }
      const judgePrompt = `[[task:judge]]
You are an impartial grader. Judge the AGENT OUTPUT below against each criterion separately. Grade only substance: ignore length, formatting and writing style, and do not reward an answer for being longer. If the output does not give enough evidence for a criterion, answer "unknown". Be strict and literal.

<test_input>
${test.input}
</test_input>
<agent_output>
${trunc(out, 20000)}
</agent_output>
<criteria>
${test.criteria.map((c, j) => (j + 1) + ". " + c).join("\n")}
</criteria>

Write each reason in ${langName(LANG)}.
Reply with only JSON: {"verdicts":[{"criterion":1,"verdict":"pass|fail|unknown","reason":"one sentence"}]}`;
      const jr = await runAI("judge", t("test.judging", {id: test.id}), judgePrompt, {step:"test"});
      const verdicts = arr(jr && jr.verdicts).map(v => ({c: num(v.criterion, 0), v: oneOf(v.verdict, ["pass","fail","unknown"], "unknown"), reason: str(v.reason)}));
      const pass = verdicts.length > 0 && verdicts.every(v => v.v === "pass");
      run.results.push({testId:test.id, trial:k, output: trunc(out, 3000), verdicts, pass, heldOut: !!test.heldOut});
    }
  }
  p.runs.unshift(run); finishRun(p, run);
  return run;
}
function finishRun(p, run){
  const tests = [...new Set(run.results.map(r => r.testId))];
  const pr = run.results.length ? run.results.filter(r => r.pass).length / run.results.length : 0;
  const consistent = tests.length ? tests.filter(id => run.results.filter(r => r.testId === id).every(r => r.pass)).length / tests.length : 0;
  run.passRate = Math.round(pr * 100); run.consistency = Math.round(consistent * 100);
  p.runs = p.runs.slice(0, 6);
  const v = arr(p.versions).find(x => x.no === run.versionNo); if (v){ v.passRate = run.passRate; v.consistency = run.consistency; }
  touch(p); render();
}
async function aiImprove(p){
  const last = p.runs[0];
  if (!last){ toast(t("test.runfirst"), "err"); return; }
  const fails = last.results.filter(r => !r.pass && !r.heldOut).slice(0, 8);
  if (!fails.length){ toast(t("test.nofails"), "ok"); return; }
  const failText = fails.map(f => { const tc = p.tests.find(x => x.id === f.testId) || {}; return `<failure test="${f.testId}">\nInput: ${trunc(tc.input, 600)}\nCriteria: ${arr(tc.criteria).join(" | ")}\nVerdicts: ${f.verdicts.map(v => v.c + ":" + v.v + " " + v.reason).join(" | ")}\nOutput excerpt: ${trunc(f.output, 1200)}\n</failure>`; }).join("\n");
  const prompt = buildPrompt("improve", {
    rules:["golden","why","positive","short","calm","overfit"], userLang:true,
    body:`Improve the package so these failures are fixed in a general way — not by special-casing the test inputs. Diagnose the cause of each failure first, then rewrite only what is needed. Prefer shorter, clearer text over adding rules. Keep content in English.\n\n${failText}\n\n<package>\n${JSON.stringify(p.pkg.sections.map(s => ({id:s.id, dest:s.dest, content:s.content}))).slice(0, 50000)}\n</package>`,
    schema:`{"diagnosis":["cause per failure, in the person's language"],"sections":[{"id":"only changed sections","content":"full new content"}],"summary":"one sentence, in the person's language"}`
  });
  const r = await runAI("improve", t("test.improving"), prompt, {step:"test"});
  if (!r) return;
  const cand = clone(p.pkg.sections);
  for (const s of arr(r.sections)){ const c = cand.find(x => x.id === s.id); if (c && str(s.content)){ c.content = str(s.content); c.mirror = ""; } }
  p.candidate = {sections: cand, diagnosis: arr(r.diagnosis).map(str), summary: str(r.summary), at: now()};
  touch(p); render();
  // honest check on held-out + failed cases
  const held = p.tests.filter(x => x.heldOut).map(x => x.id);
  const failedIds = fails.map(f => f.testId);
  const ids = [...new Set([...failedIds, ...held])];
  const candRun = await aiRunTests(p, {ids, trials:1, versionLabel: "candidate", sections: cand});
  if (candRun){ p.candidate.passRate = candRun.passRate; p.candidate.runId = candRun.id; touch(p); render(); }
}

/* ---------- 9. Traceability ---------- */
async function aiTrace(p){
  const prompt = buildPrompt("trace", {
    rules:["spec"], userLang:true,
    body:`Build a traceability map. For each requirement, list the package lines (short exact quotes, max 12 words each) that implement it and the test ids that check it. Then list requirements with no implementing line or no test, and package lines that no requirement asks for (possible bloat).\n\n<requirements>\n${p.requirements.map(r => r.id + ": GIVEN " + r.given + " WHEN " + r.when + " THEN " + r.then).join("\n")}\n</requirements>\n<tests>\n${p.tests.map(x => x.id + ": " + x.title + " [" + x.reqIds.join(",") + "]").join("\n")}\n</tests>\n<package>\n${JSON.stringify(p.pkg.sections.map(s => ({id:s.id, content:s.content}))).slice(0, 50000)}\n</package>`,
    schema:`{"map":[{"req":"R1","lines":[{"section":"instructions","quote":"…"}],"tests":["T1"]}],"orphanReqs":[{"req":"R3","missing":"line|test|both"}],"orphanLines":[{"section":"…","quote":"…","note":"…"}]}`
  });
  const r = await runAI("trace", t("launch.tracing"), prompt, {step:"launch"});
  if (!r) return;
  p.trace = {map: arr(r.map).map(m => ({req:str(m.req), lines:arr(m.lines).map(l => ({section:str(l.section), quote:str(l.quote)})), tests:arr(m.tests).map(str)})),
    orphanReqs: arr(r.orphanReqs).map(o => ({req:str(o.req), missing:oneOf(o.missing, ["line","test","both"], "both")})),
    orphanLines: arr(r.orphanLines).map(o => ({section:str(o.section), quote:str(o.quote), note:str(o.note)})), at: now(), version: p.versionNo};
  touch(p); render();
}

/* ---------- 10. Feedback diagnosis ---------- */
async function aiDiagnose(p, fb){
  const prompt = buildPrompt("diagnose", {
    rules:["evals","golden","why","short"], context: projectContext(p),
    body:`The person pasted a REAL result from their running solution, with their comment. Diagnose: did it fail, and if so which category (specification gap | prompt wording | missing data or knowledge | tool or platform limit | model behaviour | wrong expectation)? Point to the exact package section and line responsible, propose a concrete fix (replacement text in English), and write a new regression test case so this failure can never return unnoticed.\n\n<real_result>\n${trunc(fb.pasted, 12000)}\n</real_result>\n<person_comment>\n${fb.comment || ""}\n</person_comment>\n<package>\n${JSON.stringify(p.pkg.sections.map(s => ({id:s.id, content:s.content}))).slice(0, 40000)}\n</package>`,
    schema:`{"ok":false,"category":"…","cause":"…","section":"instructions","line":"short quote","fix":"exact replacement or addition","test":{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"…","criteria":["…"]},"quality":3}`
  });
  const r = await runAI("diag-" + fb.id, t("op.diagnosing"), prompt, {step:"operate"});
  if (!r) return;
  fb.diagnosis = {ok:!!r.ok, category:str(r.category), cause:str(r.cause), section:str(r.section), line:str(r.line), fix:str(r.fix), test: r.test ? {title:str(r.test.title), category:oneOf(r.test.category, ["normal","edge","adversarial","empty","language"], "edge"), input:str(r.test.input), simulated:str(r.test.simulated), criteria:arr(r.test.criteria).map(str)} : null};
  fb.quality = clamp(num(r.quality, 3), 1, 5);
  fb.status = "diagnosed";
  p.health.push({at: fb.at, quality: fb.quality, note: trunc(fb.comment || fb.diagnosis.cause, 140), fb: fb.id});
  touch(p); render();
}
async function aiApplyFeedbackFix(p, fb){
  const d = fb.diagnosis; if (!d) return;
  if (d.test){ p.tests.push({id:"T" + (p.tests.length + 1), title:d.test.title, category:d.test.category, input:d.test.input, simulated:d.test.simulated, reqIds:[], criteria:d.test.criteria, heldOut:false, fromFeedback:fb.id}); }
  const f = {id:uid("fd"), lens:"feedback", severity:"high", section:d.section, where:d.line, issue:d.cause, fix:d.fix, status:"open", version:p.versionNo, at:now()};
  p.findings.push(f);
  fb.status = "fixing"; touch(p);
  await aiApplyFixes(p, [f.id]);
  fb.status = "fixed"; touch(p); render();
}

/* ---------- 11. Notes AI ---------- */
async function aiTriage(notes){
  if (!notes.length){ toast(t("notes.inboxempty"), ""); return; }
  const prompt = buildPrompt("triage", {
    rules:["assume","spec"], userLang:true,
    body:`Sort these inbox notes. For each, propose what it should become in its project: requirement, assumption, question (for the interview), risk, task (next action / open question), pattern (reusable prompt block), or keep (stays a note). Give the cleaned text for the new item and a one-line reason. Never drop information.\n\n<notes>\n${notes.map(n => `<note id="${n.id}" project="${esc(projName(n.projectId))}">${trunc(n.text, 1200)}</note>`).join("\n")}\n</notes>`,
    schema:`{"items":[{"noteId":"…","become":"requirement|assumption|question|risk|task|pattern|keep","text":"…","reason":"…"}]}`
  });
  const r = await runAI("triage", t("notes.triaging"), prompt, {step:"notes"});
  if (!r) return null;
  return arr(r.items).map(i => ({noteId:str(i.noteId), become:oneOf(i.become, ["requirement","assumption","question","risk","task","pattern","keep"], "keep"), text:str(i.text), reason:str(i.reason), accept:true}));
}
async function aiTranslateNote(n, target){
  const prompt = `[[task:translate]]\nTranslate the note below into ${langName(target)}. Translate the meaning in context so it reads naturally; keep names, links and code unchanged. Reply with only the translation.\n\n<note>\n${n.text}\n</note>`;
  return await runAI("tr-" + n.id, t("notes.translating"), prompt, {json:false, quick:true});
}
async function aiRecap(p){
  const prompt = buildPrompt("recap", {
    rules:[], context: projectContext(p),
    body:`Write a short end-of-session recap for the person's future self: what was decided this session, what is still open, and the single best next action. Use the decision log and recent changes.\n<recent_decisions>\n${p.decisions.slice(-10).map(d => d.title + ": " + d.choice).join("\n")}\n</recent_decisions>\n<phase>${p.phase}</phase>`,
    schema:`{"decided":["…"],"open":["…"],"next":"…"}`
  });
  const r = await runAI("recap", t("recap.writing"), prompt, {step:"notes", quick:false});
  if (!r) return;
  const text = "## " + t("recap.decided") + "\n" + arr(r.decided).map(x => "- " + str(x)).join("\n") + "\n## " + t("recap.open") + "\n" + arr(r.open).map(x => "- " + str(x)).join("\n") + "\n## " + t("recap.next") + "\n" + str(r.next);
  addNote({text, type:"recap", projectId:p.id, inbox:false, pinned:false});
  p.nextAction = str(r.next); p.lastRecap = now();
  touch(p); render(); toast(t("recap.saved"), "ok");
}

/* ---------- 12. Insights & profile ---------- */
async function aiInsights(){
  const ps = WS.projects.filter(p => !p.deletedAt);
  if (!ps.length){ toast(t("ins.none"), ""); return; }
  const prompt = buildPrompt("insights", {
    rules:["evals","elicit"], userLang:true,
    body:`Look across all of this person's projects. Find (1) stable preferences and constraints worth remembering for future projects (style, risk appetite, recurring limits, language), and (2) recurring weaknesses or gaps (things their projects often miss, failure patterns). Be specific and evidence-based.\n\n<projects>\n${ps.map(p => `<p name="${esc(p.name)}">\n${trunc(projectContext(p, {max:6000}), 6000)}\nFindings: ${p.findings.slice(-15).map(f => f.lens + "/" + f.severity + ": " + trunc(f.issue,140)).join(" | ")}\nFeedback: ${p.feedback.slice(-8).map(f => f.diagnosis ? f.diagnosis.category : "").join(", ")}\n</p>`).join("\n")}\n</projects>`,
    schema:`{"preferences":["…"],"patterns":[{"text":"…","evidence":"…"}]}`
  });
  const r = await runAI("insights", t("ins.running"), prompt, {step:"insights"});
  if (!r) return;
  WS.insights = {at:now(), patterns: arr(r.patterns).map(x => ({text:str(x.text), evidence:str(x.evidence)}))};
  WS.profileSuggestions = arr(r.preferences).map(str).filter(x => !WS.profile.entries.some(e => e.text === x));
  saveWs(); render();
}

/* ---------- 13. Skills ---------- */
async function aiSkill(source){
  const prompt = buildPrompt("skill", {
    rules:["short","why","positive"], userLang:false,
    body:`Turn this reusable block into a Claude Skill. Name: kebab-case, at most 40 characters. Description: under 200 characters, saying what it does and exactly when to use it (this is all Claude sees before loading it). Body: concise SKILL.md instructions (under 300 lines), positive phrasing with reasons. Write in English.\n\n<block>\n${trunc(source, 12000)}\n</block>`,
    schema:`{"name":"…","description":"…","body":"markdown instructions"}`
  });
  const r = await runAI("skill", t("lib.skilling"), prompt, {step:"build"});
  if (!r) return null;
  let name = str(r.name).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "my-skill";
  let desc = str(r.description).replace(/\s+/g, " ").trim(); if (desc.length > 199) desc = desc.slice(0, 196) + "…";
  return {name, description: desc, body: str(r.body)};
}

/* ---------- 14. Alignment check ---------- */
async function aiAlign(p){
  const prompt = buildPrompt("align", {
    rules:[], context: projectContext(p),
    body:`Check whether the current state of the project still serves the North Star exactly. List any drift, scope creep, or parts of the goal that nothing currently addresses.${arr(p.pkg && p.pkg.sections).length ? "\n<package>\n" + JSON.stringify(p.pkg.sections.map(s => ({id:s.id, content:trunc(s.content, 3000)}))).slice(0, 25000) + "\n</package>" : ""}`,
    schema:`{"aligned":true,"issues":["…"],"uncovered":["…"]}`
  });
  const r = await runAI("align", t("ns.checking"), prompt, {step:"review"});
  if (!r) return;
  p.alignment = {at:now(), aligned: !!r.aligned, issues: arr(r.issues).map(str), uncovered: arr(r.uncovered).map(str)};
  touch(p); render();
}

/* ---------- 15. Research bridge (deterministic) ---------- */
function researchBrief(p, topic){
  return `I'm building: ${p ? str(p.northStar.goal || p.name) : "an AI solution"}.
Research topic: ${topic}

Please search the web thoroughly and use current, primary sources where possible (official documentation, original research, reputable publications). Prefer sources from the last 12 months and note each source's date.

When you are done, reply with a short summary and then exactly one JSON block in a \`\`\`json code fence with this shape, so my tool can read it in automatically:
\`\`\`json
{"topic":"${topic.replace(/"/g, "'")}","summary":"what matters for my project, 5-10 sentences","whatWorks":["…"],"whatFails":["…"],"recommendations":["…"],"sources":[{"title":"…","url":"…","date":"YYYY-MM","quality":"primary|secondary|opinion"}],"expires":"YYYY-MM (when this should be re-checked)"}
\`\`\``;
}
function parseResearch(text){
  const m = String(text).match(/```json\s*([\s\S]*?)```/i);
  let raw = m ? m[1] : text;
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try{ const o = JSON.parse(raw.slice(a, b + 1)); return o && typeof o === "object" ? o : null; }catch(e){ return null; }
}

/* ===================== DETERMINISTIC ENGINES ===================== */
const VAGUE = /\b(etc\.?|as needed|appropriate(ly)?|various|and so on|if necessary|some kind of|as required|stuff|things like)\b/gi;
function lintPackage(p){
  const out = [];
  const secs = arr(p.pkg && p.pkg.sections);
  if (!secs.length) return out;
  const target = str(p.pkg.targetModel || p.targetModel);
  const seen = new Map();
  for (const s of secs){
    const c = s.content || "";
    const caps = c.match(/\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT|DO NOT|DON'T|ONLY)\b/g);
    if (caps && caps.length >= 2) out.push({sev:"warn", sec:s.id, key:"lint.caps", rule:"calm", detail: [...new Set(caps)].join(", ")});
    if (/opus/i.test(target) && /(double[- ]check|re-?check|verify (your|the) (work|answer|output)|final verification)/i.test(c)) out.push({sev:"warn", sec:s.id, key:"lint.verify", rule:"opus5"});
    const neg = (c.match(/\b(don't|do not|never|avoid|must not)\b/gi) || []).length, lines = c.split("\n").filter(x => x.trim()).length;
    if (neg >= 6 && neg / Math.max(lines,1) > 0.25) out.push({sev:"info", sec:s.id, key:"lint.negative", rule:"positive", detail:String(neg)});
    const vg = c.match(VAGUE); if (vg) out.push({sev:"info", sec:s.id, key:"lint.vague", rule:"golden", detail:[...new Set(vg.map(x => x.toLowerCase()))].join(", ")});
    if (/\[(…|\.\.\.|todo|tbd|describe[^\]]*)\]|\bTODO\b|\bTBD\b/i.test(c)) out.push({sev:"error", sec:s.id, key:"lint.placeholder", rule:"golden"});
    if (s.dest === "instructions"){
      if (c.length > 7000) out.push({sev:"warn", sec:s.id, key:"lint.long", rule:"short", detail:String(c.length)});
      if (!/(done|complete|finished|success|definition)/i.test(c)) out.push({sev:"warn", sec:s.id, key:"lint.nodone", rule:"spec"});
      if (!/(format|structure|return|output|deliver)/i.test(c)) out.push({sev:"warn", sec:s.id, key:"lint.noformat", rule:"golden"});
      if (!/(because|so that|since|to ensure|so the|which means|this matters)/i.test(c)) out.push({sev:"info", sec:s.id, key:"lint.noreason", rule:"why"});
    }
    if (s.dest === "scheduled" && !s.cadence) out.push({sev:"warn", sec:s.id, key:"lint.nocadence", rule:"projects"});
    if (s.dest === "knowledge" && !s.filename) out.push({sev:"warn", sec:s.id, key:"lint.nofilename", rule:"projects"});
    if (s.dest === "skill"){
      const dm = c.match(/description:\s*(.+)/i); const desc = dm ? dm[1].trim() : "";
      if (desc.length >= 200) out.push({sev:"error", sec:s.id, key:"lint.skilldesc", rule:"projects", detail:String(desc.length)});
      const nm = c.match(/name:\s*(.+)/i); if (nm && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nm[1].trim())) out.push({sev:"error", sec:s.id, key:"lint.skillname", rule:"projects"});
    }
    for (const line of c.split("\n").map(x => x.trim()).filter(x => x.length > 40)){
      if (seen.has(line) && seen.get(line) !== s.id) { out.push({sev:"info", sec:s.id, key:"lint.dup", rule:"short", detail: trunc(line, 60)}); break; }
      seen.set(line, s.id);
    }
  }
  if (!secs.some(s => s.dest === "instructions")) out.push({sev:"error", sec:"", key:"lint.noinstr", rule:"projects"});
  return out;
}

function dimCoverage(p){
  let c = 0; for (const d of DIMS){ const s = (p.dims[d.id] || {}).status; c += s === "confirmed" ? 1 : s === "assumed" ? 0.5 : 0; }
  return c / DIMS.length;
}
function phaseProgress(p){
  const pr = {};
  const ns = p.northStar || {};
  pr.capture = (p.intake.raw ? .3 : 0) + (p.intake.clean ? .3 : 0) + ([ns.problem, ns.goal, ns.success].filter(Boolean).length / 3) * .4;
  const u = p.understand;
  pr.understand = [arr(u.whys).length, u.jtbd, arr(u.reframes).length, u.walkthrough].filter(Boolean).length / 4;
  pr.interview = p.interviewReady ? 1 : Math.min(.95, dimCoverage(p));
  pr.assume = (Math.min(p.assumptions.length, 3) / 3) * .4 + (arr(u.premortem).length ? .3 : 0) + (p.risks.length ? .3 : 0);
  pr.require = (p.requirements.length ? .6 : 0) + (p.outOfScope.length ? .2 : 0) + (p.constitution.length ? .2 : 0);
  pr.arch = (p.arch.options.length ? .3 : 0) + (p.arch.chosen ? .4 : 0) + (p.arch.components.length ? .3 : 0);
  const lint = lintPackage(p);
  pr.build = arr(p.pkg.sections).length ? .7 + (lint.some(l => l.sev === "error") ? 0 : .3) : 0;
  const openHigh = p.findings.filter(f => f.status === "open" && (f.severity === "critical" || f.severity === "high")).length;
  pr.review = p.findings.length || p.reviewedVersion ? .5 + (openHigh ? 0 : .5) : 0;
  const lr = p.runs.find(r => r.label !== "candidate");
  pr.test = (p.tests.length ? .4 : 0) + (lr ? .6 * (lr.passRate / 100) : 0);
  const steps = SETUP_STEPS.filter(s => (p.setup || {})[s.id]).length;
  pr.launch = steps / SETUP_STEPS.length;
  pr.operate = (p.health.length ? .5 : 0) + (p.feedback.some(f => f.status === "fixed" || (f.diagnosis && f.diagnosis.ok)) ? .5 : 0);
  for (const k in pr) pr[k] = clamp(pr[k], 0, 1);
  return pr;
}
function readiness(p){
  const items = [];
  const ns = p.northStar || {};
  const add = (key, w, frac, detail="") => items.push({key, w, frac: clamp(frac, 0, 1), detail});
  add("rd.ns", 10, [ns.problem, ns.goal, ns.success].filter(Boolean).length / 3);
  add("rd.dims", 15, dimCoverage(p) / .7, Math.round(dimCoverage(p) * 100) + "%");
  const risky = p.assumptions.filter(a => a.impact * a.risk >= 12);
  add("rd.assume", 10, risky.length ? risky.filter(a => a.status === "validated" || a.status === "invalid").length / risky.length : (p.assumptions.length ? 1 : 0), risky.length ? risky.filter(a => a.status === "untested" || a.status === "testing").length + " " + t("rd.open") : "");
  const bigR = p.risks.filter(r => r.likelihood * r.impact >= 12);
  add("rd.risks", 10, bigR.length ? bigR.filter(r => r.mitigation && r.status !== "open").length / bigR.length : (p.risks.length ? 1 : 0));
  const reqT = p.requirements.length ? p.requirements.filter(r => p.tests.some(x => x.reqIds.includes(r.id))).length / p.requirements.length : 0;
  add("rd.reqtests", 10, reqT, Math.round(reqT * 100) + "%");
  const lint = lintPackage(p);
  add("rd.pkg", 10, arr(p.pkg.sections).length ? (lint.some(l => l.sev === "error") ? .5 : 1) : 0);
  const openHigh = p.findings.filter(f => f.status === "open" && (f.severity === "critical" || f.severity === "high")).length;
  add("rd.review", 10, p.reviewedVersion ? (openHigh ? 0.3 : 1) : 0, openHigh ? openHigh + " " + t("rd.open") : "");
  const lr = p.runs.find(r => r.label !== "candidate");
  add("rd.tests", 10, lr ? clamp(lr.passRate / 80, 0, 1) * (lr.trials > 1 ? 1 : .85) : 0, lr ? lr.passRate + "%" : "");
  add("rd.trace", 5, p.trace ? (p.trace.orphanReqs.length ? .5 : 1) : 0);
  const steps = SETUP_STEPS.filter(s => (p.setup || {})[s.id]).length;
  add("rd.setup", 10, steps / SETUP_STEPS.length, steps + "/" + SETUP_STEPS.length);
  const score = Math.round(items.reduce((s, i) => s + i.w * i.frac, 0));
  return {score, items};
}
function nextBest(p){
  const pr = phaseProgress(p);
  const order = ["capture","understand","interview","assume","require","arch","build","review","test","launch","operate"];
  const thr = {capture:.95, understand:.5, interview:.95, assume:.7, require:.8, arch:.95, build:.95, review:.95, test:.75, launch:.99, operate:2};
  for (const ph of order){ if (pr[ph] < thr[ph]) return {phase: ph, key: "next." + ph}; }
  return {phase:"operate", key:"next.operate"};
}
function activeForesight(p){
  const text = (JSON.stringify(p.northStar) + " " + str(p.intake.raw) + " " + str(p.intake.clean) + " " + p.qa.map(q => q.answer).join(" ")).toLowerCase();
  const auto = {"f-look": (p.dims.look || {}).status === "confirmed", "f-stop": !!p.interviewReady, "f-premortem": arr(p.understand.premortem).length > 0, "f-done": p.requirements.some(r => /done|complete|fertig/i.test(r.then + r.title)), "f-cost": !!p.arch.costEstimate, "f-rollback": !!p.launchVersion, "f-tests": p.tests.some(x => x.heldOut)};
  const cat = FORESIGHT.filter(f => !f.tr.length || f.tr.some(w => text.includes(w))).map(f => ({id:f.id, phase:f.phase, text:L(f), done: !!(p.fsDone || {})[f.id] || !!auto[f.id]}));
  const ai = p.foresight.map(f => ({id:f.id, phase:f.phase, text:f.text, done:f.done, ai:true}));
  return cat.concat(ai);
}

/* ---------- versions ---------- */
function saveVersion(p, reason){
  p.versionNo = (p.versionNo || 0) + 1;
  const v = {no: p.versionNo, at: now(), reason: str(reason), sections: clone(p.pkg.sections), targetModel: p.pkg.targetModel || ""};
  p.versions = arr(p.versions); p.versions.unshift({no: v.no, at: v.at, reason: v.reason});
  p.versions = p.versions.slice(0, 60);
  Store.put(projPath(p.id) + "/versions/v" + v.no, v);
  VCACHE.set(p.id + ":" + v.no, v);
}
const VCACHE = new Map();
async function loadVersion(p, no){
  const k = p.id + ":" + no; if (VCACHE.has(k)) return VCACHE.get(k);
  try{ const v = await Store.get(projPath(p.id) + "/versions/v" + no); if (v) VCACHE.set(k, v); return v; }catch(e){ return null; }
}
function lineDiff(a, b){
  const A = String(a || "").split("\n"), B = String(b || "").split("\n");
  const n = A.length, m = B.length;
  if (n * m > 400000) return [{t:"del", s:a}, {t:"add", s:b}];
  const dp = Array.from({length:n+1}, () => new Uint16Array(m+1));
  for (let i = n-1; i >= 0; i--) for (let j = m-1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m){ if (A[i] === B[j]){ out.push({t:"eq", s:A[i]}); i++; j++; } else if (dp[i+1][j] >= dp[i][j+1]){ out.push({t:"del", s:A[i++]}); } else { out.push({t:"add", s:B[j++]}); } }
  while (i < n) out.push({t:"del", s:A[i++]}); while (j < m) out.push({t:"add", s:B[j++]});
  return out;
}
