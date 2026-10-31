/* ===================== AI TASKS & DETERMINISTIC ENGINES ===================== */
const STATUS3 = ["unknown","assumed","confirmed"];
const ACAT = ["value","usability","viability","feasibility","gtm","legal"];
function oneOf(v, list, d){ return list.includes(v) ? v : d; }
function conf(v){ return oneOf(v, ["high","medium","low"], "medium"); }

/* ---------- 1. Clarify intake ---------- */
async function aiClarify(p){
  const raw = str(p.intake.raw).trim();
  if (!raw){ toast(t("cap.needraw"), "err"); return; }
  const prompt = buildPrompt("clarify", {proj: p, 
    rules:["golden","elicit","assume"],
    context: projectContext(p),
    body:`The person dumped a raw idea (in <raw_idea>). Turn it into a clean, unambiguous restatement that keeps every intention they expressed and invents nothing. Then extract a North Star, and list contradictions, unclear points and missing information that matter for building the solution. For each missing item say briefly why it matters. Mark how confident you are in the restatement.`,
    schema:`{"clean":"restated idea, 3-10 sentences","northStar":{"problem":"","goal":"","success":"measurable success measure or empty if unknown","users":"","constraints":"","now":"current state"},"contradictions":["…"],"ambiguities":["…"],"missing":[{"item":"…","why":"…"}],"confidence":"high|medium|low"}`
  });
  const r = await runAI("clarify", t("cap.clarifying"), prompt, {pid: p && p.id, step:"capture", images: p._images || null, validate: o => o && str(o.clean).trim().length > 20 && o.northStar && typeof o.northStar === "object"});
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
  const prompt = buildPrompt("understand-" + kind, {proj: p, rules:["assume","funnel","simple"], platform:true, context: projectContext(p), body: bodies[kind], schema: schemas[kind]});
  const VAL = {whys: o => arr(o.whys).length > 0, jtbd: o => str(o.jtbd).trim(), reframe: o => arr(o.reframes).length > 0, walkthrough: o => arr(o.walkthrough).length > 0, premortem: o => arr(o.failures).length > 0, devil: o => arr(o.arguments).length > 0};
  const r = await runAI("und-" + kind, t("und.running"), prompt, {pid: p && p.id, step:"understand", validate: o => o && VAL[kind](o)});
  if (!r) return;
  snapshot(p);
  const u = p.understand;
  if (kind === "whys"){ u.whys = arr(r.whys).map(w => ({q:str(w.q), a:str(w.a), guess:!!w.guess})); u.rootNeed = str(r.rootNeed); }
  if (kind === "jtbd"){ u.jtbd = str(r.jtbd); u.jtbdParts = {functional:arr(r.functional).map(str), emotional:arr(r.emotional).map(str), social:arr(r.social).map(str)}; }
  if (kind === "reframe"){ u.reframes = arr(r.reframes).map(x => ({id:uid("rf"), text:str(x.text), differently:str(x.differently), chosen:false})); }
  if (kind === "walkthrough"){ u.walkSteps = arr(r.walkthrough).map(s => ({time:str(s.time), step:str(s.step)})); u.walkthrough = u.walkSteps.map(s => s.time + " " + s.step).join("\n"); u.walkGaps = arr(r.gaps).map(str); }
  if (kind === "premortem"){
    u.premortem = arr(r.failures).map(f => ({text:str(f.text), likelihood:clamp(num(f.likelihood,3),1,5), impact:clamp(num(f.impact,3),1,5), mitigation:str(f.mitigation)}));
    for (const f of u.premortem){ if (!p.risks.some(x => x.text === f.text || similar(x.text, f.text))){ const id = uid("rk"); p.risks.push({id, text:f.text, likelihood:f.likelihood, impact:f.impact, mitigation:f.mitigation, status:"open", source:"premortem"}); markPT(p, "risk:" + id, "added", t("why.premortem")); } }
    toast(t("und.premortemadded", {n: u.premortem.length}), "ok");
  }
  if (kind === "devil"){ u.devil = arr(r.arguments).map(a => ({point:str(a.point), evidence:str(a.evidence)})); }
  touch(p); render();
}

/* ---------- 5. Architecture ---------- */
async function aiArchitecture(p){
  const prompt = buildPrompt("architecture", {proj: p, 
    rules:["simple","multi","delegate","state","funnel","trifecta","reversible","projects"], platform:true, context: projectContext(p),
    body:`<engine_evidence>\n${engineBrief(p)}\n</engine_evidence>\nRespect the engine evidence: never recommend a design above the maximum allowed rung unless the gate was overridden, prefer the lowest design that the trial evidence supports, and say which rung (R0-R5) each option is.\nDesign the solution. First, list 3-5 real alternative approaches across the complexity ladder, including at least one no-build or minimal option (existing tool, manual step, plain code) if sensible, and single prompt / fixed workflow / single agent / orchestrator with workers where they apply. Score each 1-5 on reliability, cost (5 = cheapest), safety, effort to build (5 = least effort), maintainability, and platform fit with Claude Projects. Recommend one, explain why, and state what would change your mind. For every option also write "a day using it": 4-6 short moments with a time of day from the person's point of view (what they do, what the tool does, where it can go wrong) and what it costs them in time; one option is always the simplest possible (no build).
Then, for the recommended approach, define components (kind: ai | code | hybrid | human | platform, following the rule: plain code for exact rules, AI only for open-ended parts, check AI output with rules), the requirement ids each component serves (reqIds), a model-and-effort plan for every AI part, where the finished tool lives (home: pick the best mix of artifact pages, scheduled tasks, a Claude Project, documents, skills or a code repository, and say why), how they connect (links), the human steps (minimise them; the person wants the lowest possible human effort), the data plan (source, freshness, legal status), a rough usage estimate per run, and new risks this design introduces.`,
    schema:`{"options":[{"id":"o1","name":"…","rung":"R0-R5","kind":"none|prompt|workflow|agent|multi","summary":"…","scores":{"reliability":4,"cost":3,"safety":4,"effort":3,"maintainability":4,"platformFit":5},"pros":["…"],"cons":["…"],"day":[{"time":"08:00","text":"…"}],"effort":"about 10 minutes a day"}],"recommended":"o2","why":"…","changeMind":"…","components":[{"id":"c1","name":"…","kind":"ai","role":"…","inputs":"…","outputs":"…","reason":"why this kind","reqIds":["R1"],"model":"for ai parts: fast|balanced|most capable, with effort low|medium|high and one reason"}],"home":{"where":"one of: artifact page | scheduled task | Claude Project | document | skill | code repository | mix","parts":"which part lives where","why":"one or two sentences"},"links":[{"from":"c1","to":"c2","label":"…"}],"humanSteps":["…"],"dataPlan":[{"source":"…","freshness":"…","legal":"…","risk":"…"}],"costEstimate":"…","risks":[{"text":"…","likelihood":3,"impact":3,"mitigation":"…"}]}`
  });
  const r = await runAI("arch", t("arch.running"), prompt, {pid: p && p.id, step:"arch", validate: o => arr(o.options).length > 0 && arr(o.components).length > 0});
  if (!r) return;
  snapshot(p, t("rp.before", {x: t("arch.title")}), {restore: arr(p.arch.components).length > 0});
  const a = p.arch, hadDesign = arr(a.components).length > 0, oldChosen = a.chosen;
  a.options = arr(r.options).map((o, i) => ({id:str(o.id) || "o" + (i+1), name:str(o.name), rung: oneOf(o.rung, RUNGS, ""), kind:oneOf(o.kind, ["none","prompt","workflow","agent","multi"], "workflow"), summary:str(o.summary), scores:Object.fromEntries(["reliability","cost","safety","effort","maintainability","platformFit"].map(k => [k, clamp(num((o.scores||{})[k],3),1,5)])), pros:arr(o.pros).map(str), cons:arr(o.cons).map(str), day: arr(o.day).map(d => ({time: str(d && d.time), text: str(d && d.text)})).filter(d => d.text), effortDay: str(o.effort), simplest: o.kind === "none"}));
  a.recommended = str(r.recommended) || (a.options[0] && a.options[0].id); a.drawnFor = a.recommended;
  a.why = str(r.why); a.changeMind = str(r.changeMind);
  a.components = arr(r.components).map((c, i) => ({id:str(c.id) || "c" + (i+1), name:str(c.name), kind:oneOf(c.kind, ["ai","code","hybrid","human","platform"], "ai"), role:str(c.role), inputs:str(c.inputs), outputs:str(c.outputs), reason:str(c.reason), reqIds:arr(c.reqIds).map(str), model:str(c.model)}));
  if (r.home) p.tool.home = {where:str(r.home.where), parts:str(r.home.parts), why:str(r.home.why)};
  // the parts are drawn for the recommended option: a choice of another option no longer matches them
  if (a.chosen && (a.chosen !== a.recommended || !a.options.some(o => o.id === a.chosen))){ a.chosen = ""; }
  if (!a.chosen){ a.chosen = a.recommended; a.chosenAssumed = true; markPT(p, "arch:choice", "decided", t("why.archrec")); }
  for (const c of a.components) markPT(p, "component:" + c.id, "added", t("why.archpart"));
  // a new design: the package built on the old one may need updating (only its sections, nothing else)
  if (hadDesign) for (const sx of arr(p.pkg.sections)) flag(p, "section:" + sx.id, t("arch.title"), t("lk.fromarch"));
  if (oldChosen && oldChosen !== a.chosen) logAct(p, t("act.archreset"), {step: "arch", important: true});
  logAct(p, t("act.ai", {x: t("arch.title")}), {step:"arch"});
  a.links = arr(r.links).map(l => ({from:str(l.from), to:str(l.to), label:str(l.label)}));
  a.humanSteps = arr(r.humanSteps).map(str);
  a.dataPlan = arr(r.dataPlan).map(d => ({source:str(d.source), freshness:str(d.freshness), legal:str(d.legal), risk:str(d.risk)}));
  a.costEstimate = str(r.costEstimate);
  { const ro = a.options.find(o => o.id === a.recommended); if (ro && ro.rung){ eng(p).archRung = ro.rung; engineRecompute(p); } }
  if (miniOn(p) && !arr(eng(p).mini.results).length && autoOK()) setTimeout(() => aiMiniTest(p), 800);   // decision: the mini-test runs by itself for the two leading settings
  for (const k of arr(r.risks)){ const txt = str(k.text); if (txt && !p.risks.some(x => x.text === txt)) p.risks.push({id:uid("rk"), text:txt, likelihood:clamp(num(k.likelihood,3),1,5), impact:clamp(num(k.impact,3),1,5), mitigation:str(k.mitigation), status:"open", source:"architecture"}); }
  touch(p); render();
}
async function aiMockup(p){
  const prompt = buildPrompt("mockup", {proj: p, 
    rules:["golden"], context: projectContext(p),
    body:`Create a realistic visual mockup of what the person will SEE when the finished solution delivers its result (for example the report, board, ranked list or message). Use plausible example content clearly marked as example. Self-contained HTML with inline CSS only, no scripts, no external resources, readable at 900px width, light background. Match the look the person described if any.`,
    schema:`{"html":"<div>…</div>","caption":"one sentence describing what the mockup shows"}`
  });
  const r = await runAI("mockup", t("arch.mocking"), prompt, {pid: p && p.id, step:"arch"});
  if (!r) return;
  p.arch.mockupHtml = str(r.html).replace(/<script[\s\S]*?<\/script>/gi, ""); p.arch.mockupCaption = str(r.caption);
  touch(p); render();
}

/* ---------- 6. Compile ---------- */
/** the rules that apply to the tool's target model (5 generation: shared rules + the model's own) */
function modelRuleIds(target){
  const t0 = str(target).toLowerCase(), ids = [];
  if (/opus|sonnet|haiku|fable|mythos/.test(t0)) ids.push("gen5");
  if (/opus-5-5|opus 5\.5/.test(t0)) ids.push("opus55"); else if (/opus-5|opus 5/.test(t0)) ids.push("opus5", "opus55");
  if (/sonnet-5|sonnet 5/.test(t0)) ids.push("sonnet55");
  if (/haiku-5|haiku 5/.test(t0)) ids.push("haiku55");
  if (/fable|mythos/.test(t0)) ids.push("fable");
  return ids;
}
function modelGuidance(target){ const ids = modelRuleIds(target); return ids.length ? kpText(ids) : ""; }
/** which best-practice rules each review lens receives */
const LENS_RULES = {intent:["spec","elicit","golden"], prompt:["prompt","gen5","opus55","sonnet55","haiku55","fable","action"], agent:["agent"], security:["safety"], cost:["simple","multi","funnel","gen5","sonnet55","haiku55"], legal:["law","trifecta"], maintain:["state","projects","spec"], ux:["golden","examples"], product:["simple","spec"], data:["funnel","evals","overfit"]};
async function aiCompile(p){
  const target = p.targetModel || "claude-opus-5-5";
  const prev = p.pkg && arr(p.pkg.sections).length ? "\n<current_package>\n" + jsonFit(p.pkg.sections.map(s => ({id:s.id, dest:s.dest, title:s.title, content:s.content})), 120000) + "\n</current_package>\nImprove the current package rather than starting over; keep what works." : "";
  const prompt = buildPrompt("compile", {proj: p, pkgEnglish: true, 
    rules:["golden","why","positive","short","calm","examples","xml","action","delegate","state","trifecta","reversible","projects","funnel","gen5", ...(p.audience && p.audience.eu ? ["law-art50"] : []), ...(p.audience && (p.audience.customers || p.audience.eu) ? ["law-ch"] : [])], platform:true,
    context: projectContext(p, {full:true}) + prev,
    body:`<engine_evidence>\n${engineBrief(p)}\n</engine_evidence>\nCompile the complete, ready-to-paste Claude Project package for the chosen architecture, at the recommended design rung and autonomy level (approval steps for outward-facing, irreversible, money or login actions). Write all package content in English. Target model: ${target}. ${modelGuidance(target)}
Produce only the sections this design actually needs, each mapped to where it goes:
- dest "instructions": the Project instructions (short, clear, reasons attached, positive phrasing, structured with XML tags; include the definition of done and the output format).
- dest "knowledge": reference files with an exact file name (e.g. scoring-rubric.md, sources.md, examples.md, tasks.json for state).
- dest "scheduled": scheduled task prompts with cadence (hourly | daily | weekly | weekdays | manual) and a time if relevant.
- dest "subagent": delegation briefs only if the design uses subagents (objective, boundaries, tools, return format).
- dest "skill": a skill only if a reusable procedure is worth loading on demand (name kebab-case, at most 64 characters, without "claude" or "anthropic"; description ideally under 200 characters, never over 1,024).
- dest "artifact": a brief for building a results page/board if the design needs one.
- dest "handoff": prompts to paste into a Claude chat to build parts that need building.
Every line must earn its place. Map each section to the requirement ids it serves. Do not include generic "double-check your work" instructions for Opus 5 models.`,
    schema:`{"sections":[{"id":"instructions","dest":"instructions|knowledge|scheduled|subagent|skill|artifact|handoff","title":"…","filename":"only for knowledge/skill","cadence":"only for scheduled","content":"full text","reqIds":["R1"],"why":"one sentence on why this section exists"}],"rationale":["key design choices, in the project's content language"]}`,
    userLang: true
  });
  const r = await runAI("compile", t("build.compiling"), prompt, {pid: p && p.id, step:"build", validate: o => arr(o.sections).length > 0});
  if (!r) return;
  snapshot(p, t("rp.before", {x: t("build.title")}));
  const secs = arr(r.sections).map((s, i) => ({id:str(s.id) || "s" + (i+1), dest:oneOf(s.dest, Object.keys(DEST), "knowledge"), title:str(s.title), filename:str(s.filename), cadence:str(s.cadence), content:str(s.content), reqIds:arr(s.reqIds).map(str), why:str(s.why), mirror:""}));
  if (!secs.length){ toast(t("ai.err.empty"), "err"); return; }
  const ids = new Set(); secs.forEach((s, i) => { if (ids.has(s.id)) s.id = s.id + "-" + i; ids.add(s.id); });
  p.pkg = {sections: secs, targetModel: target, rationale: arr(r.rationale).map(str), compiledAt: now(), kp: kpStamp()};
  saveVersion(p, t("ver.compiled"));
  for (const x of secs) unflag(p, "section:" + x.id);
  logAct(p, t("act.ai", {x: t("build.title")}) + " · " + t("draft.n", {n: p.versionNo}), {step:"build", important:true});
  touch(p); render();
}
async function aiMirror(p){
  if (LANG === "en"){ toast(t("build.mirror.en"), ""); return; }
  const secs = arr(p.pkg.sections);
  if (!secs.length) return;
  const prompt = buildPrompt("mirror", {proj: p, 
    rules:[], userLang:false,
    body:`Translate each section's content into ${langName(LANG)} so the person can check exactly what their agent is told. Translate meaning in context, not word by word; keep XML tags, file names, code, JSON keys and placeholders unchanged. Keep the structure line by line where possible.\n\n<sections>\n${jsonFit(secs.map(s => ({id:s.id, content:s.content})), 120000)}\n</sections>`,
    schema:`{"sections":[{"id":"…","mirror":"translated content"}]}`
  });
  const r = await runAI("mirror", t("build.mirroring"), prompt, {pid: p && p.id, step:"build"});
  if (!r) return;
  for (const m of arr(r.sections)){ const s = secs.find(x => x.id === m.id); if (s){ s.mirror = str(m.mirror); s.mirrorLang = LANG; } }
  p.showMirror = true; touch(p); render();
}

/* ---------- 7. Review (red team) ---------- */
async function aiReview(p, lensIds, {onlySections = null} = {}){
  const secs = arr(p.pkg.sections).filter(s => !onlySections || onlySections.includes(s.id));
  if (!secs.length){ toast(t("rev.needpkg"), "err"); return; }
  let added = 0, reopened = 0, n = 0, ran = 0;
  const known = p.findings.filter(f => OPEN_F.includes(f.status) || f.status === "accepted").map(f => "- [" + f.status + "] " + f.section + ": " + trunc(f.issue, 160)).join("\n");
  for (const lid of lensIds){
    const lens = LENSES.find(l => l.id === lid); if (!lens) continue;
    const prompt = buildPrompt("review-" + lid, {proj: p, 
      role:`You are an independent reviewer who did NOT write this package. Your only job is to find real problems through one lens: ${lens.en}. You are rigorous and fair: report only issues that matter, never pad the list, and say so when the package is sound.`,
      rules: [...(LENS_RULES[lid] || []), ...(lid === "prompt" || lid === "cost" ? modelRuleIds(p.pkg.targetModel || p.targetModel) : [])], platform:true, context: projectContext(p),
      body:`Lens: ${lens.en}. Focus: ${lens.ai}\n${known ? "\nThese problems are already known (do not report them again; only report new ones):\n" + known + "\n" : ""}\n<package target_model="${esc(p.pkg.targetModel || "")}">\n${jsonFit(secs.map(s => ({id:s.id, dest:s.dest, title:s.title, cadence:s.cadence, content:s.content})), 120000)}\n</package>\n\nReport findings with severity (critical | high | medium | low), the section id and a short quote of where, the issue, and a concrete fix (exact replacement text when possible).
Stop rule: set "block": true only for a concrete failure — a realistic input for which the tool would give a wrong, unsafe or unusable result — and say which input in "evidence". Style, wording and "could be better" are never blocking. At most 3 blocking and 5 other findings. If the package is sound for this lens, return an empty list.`,
      schema:`{"findings":[{"severity":"high","block":false,"evidence":"the realistic input that fails, only when block is true","section":"instructions","where":"short quote","issue":"…","fix":"…"}],"verdict":"one sentence overall assessment"}`
    });
    n++;
    const r = await runAI("review", t("rev.running", {lens: L(lens)}) + " (" + n + "/" + lensIds.length + ")", prompt, {step:"review", pid: p && p.id, validate: o => o && Array.isArray(o.findings) && typeof o.verdict === "string"});
    if (!r) break;
    ran++;
    p.reviewVerdicts = p.reviewVerdicts || {}; p.reviewVerdicts[lid] = str(r.verdict);
    let nb = 0, ns = 0;
    for (const f of arr(r.findings)){
      const issue = str(f.issue), sec = str(f.section);
      if (!issue) continue;
      /* a problem you dismissed or accepted with a reason is never raised again; a known one is not added twice */
      if (p.findings.some(x => ["accepted","wontfix"].includes(x.status) && similar(x.issue, issue))) continue;
      if (p.findings.some(x => OPEN_F.includes(x.status) && x.section === sec && similar(x.issue, issue))) continue;
      const block = !!f.block && !!str(f.evidence).trim() && nb < 3;
      if (!block && ns >= 5) continue;
      block ? nb++ : ns++;
      const sev = oneOf(f.severity, ["critical","high","medium","low"], "medium");
      const cls = block ? "block" : sev === "low" ? "later" : "should";
      const prev = p.findings.find(x => x.status === "done" && x.section === sec && similar(x.issue, issue));
      if (prev){ prev.status = "open"; prev.cls = cls; prev.reopened = (prev.reopened || 0) + 1; prev.audit = arr(prev.audit); prev.audit.push({at: now(), what: t("aud.reopened"), by: t("aud.reviewer")}); reopened++; continue; }
      const nf = {id:uid("fd"), lens:lid, severity: sev, cls, evidence: str(f.evidence), section:sec, where:str(f.where), issue, fix:str(f.fix), status:"open", version:p.versionNo, at:now(), audit:[{at: now(), what: t("aud.found"), by: t("aud.reviewer")}], reopened:0, stage: onlySections ? "recheck" : "review", step: "review"};
      nf.targets = findingTargets(p, nf);
      p.findings.push(nf);
      added++;
    }
    touch(p);
  }
  // the seal needs a complete review: every lens ran and answered, on the whole package
  const complete = ran === lensIds.length;
  if (complete && !onlySections && LENSES.every(l => lensIds.includes(l.id))){ p.reviewedVersion = p.versionNo; p.seal.review = p.versionNo; }
  logAct(p, t("act.review", {n: added, r: reopened}), {step:"review", important: added > 0});
  toast(t("rev.done", {n: added}) + (reopened ? " · " + t("rev.reopened", {n: reopened}) : ""), "ok"); render();
  return complete;
}
/* ---------- 8. Tests, simulation, judging ---------- */
async function aiTests(p){
  const prompt = buildPrompt("tests", {proj: p, 
    rules:["evals","overfit","trifecta"], platform:true, context: projectContext(p),
    body:`Create a test set for this solution: 8-14 cases across categories normal, edge, adversarial (including prompt-injection inside data), empty-or-broken input, and wrong-language input. Each case: the situation/input given to the agent, simulated tool or data results the agent would see (so the run can be simulated without the internet), the requirement ids it checks, and 2-4 pass criteria that a reviewer can judge yes/no from the output alone. Mark about a quarter of the cases as heldOut=true; those are kept back to check improvements honestly.`,
    schema:`{"tests":[{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"tool/data results the agent sees","reqIds":["R1"],"critIds":["C1"],"criteria":["…"],"heldOut":false}]}`
  });
  const r = await runAI("tests", t("test.generating"), prompt, {pid: p && p.id, step:"test", validate: o => arr(o.tests).filter(x => arr(x.criteria).length).length > 0});
  if (!r) return;
  snapshot(p);
  arr(r.tests).filter(x => arr(x.criteria).length).forEach(x => { const id = nextTestId(p); p.tests.push({id, title:str(x.title), category:oneOf(x.category, ["normal","edge","adversarial","empty","language"], "normal"), input:str(x.input), simulated:str(x.simulated), reqIds:arr(x.reqIds).map(str).filter(r0 => p.requirements.some(q => q.id === r0)), critIds: arr(x.critIds).map(str), criteria:arr(x.criteria).map(str).filter(Boolean), heldOut:!!x.heldOut}); markPT(p, "test:" + id, "added", t("why.tests")); });
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
/** judge instructions version: stored on every result so judge changes are visible (gap 3) */
const JUDGE_V = "j2-2026-10-19";
const TRIALS = 3;   // every test runs 3 times; "all 3 pass" (pass^3) and flips are reported
/** a result a person should decide: judges disagree, a criterion is unknown, or the judge was unsure */
function needsYou(x){ return !x.userVerdict && ((x.judge2 && x.judge2 !== (x.judgePass ?? x.pass ? "pass" : "fail")) || x.unknown || (x.conf != null && x.conf < 0.7)); }
/** how often the judge agrees with the person: TPR = it passes what you pass, TNR = it fails what you fail */
function judgeStats(p){
  let tp = 0, pos = 0, tn = 0, neg = 0; const versions = new Set();
  for (const r of arr(p.runs)) for (const x of arr(r.results)){
    if (x.jv) versions.add(x.jv);
    if (!x.userVerdict) continue;
    const jp = x.judgePass ?? x.pass;
    if (x.userVerdict === "pass"){ pos++; if (jp) tp++; } else { neg++; if (!jp) tn++; }
  }
  return {n: pos + neg, pos, neg, tpr: pos ? Math.round(tp / pos * 100) : 0, tnr: neg ? Math.round(tn / neg * 100) : 0, versions: [...versions]};
}
async function aiRunTests(p, {ids=null, trials=1, versionLabel=null, sections=null} = {}){
  const secs = sections || p.pkg.sections;
  if (!arr(secs).length){ toast(t("rev.needpkg"), "err"); return null; }
  const list = p.tests.filter(x => !ids || ids.includes(x.id));
  if (!list.length){ toast(t("test.none"), "err"); return null; }
  const run = {id:uid("run"), versionNo: versionLabel ?? p.versionNo, at:now(), trials, results:[], label: versionLabel != null ? String(versionLabel) : "", expected: list.length * trials};
  if (versionLabel == null) snapshot(p, t("rp.before", {x: t("test.run")}));
  let i = 0;
  for (const test of list){
    for (let k = 0; k < trials; k++){
      i++;
      const out = await runAI("sim", t("test.simulating", {i, n: list.length * trials, id: test.id}), agentTranscriptPrompt(p, test, secs), {pid: p && p.id, json:false, step:"test", fresh:true});
      if (out == null){ run.incomplete = true; p.runs.unshift(run); finishRun(p, run); return run; }   // stopped or failed: kept, but it never counts as a complete run
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

Write each reason in ${langName(contentLang())}. Also say how sure you are overall (0 to 1): below 0.7 means a close call a person should look at.
Reply with only JSON: {"verdicts":[{"criterion":1,"verdict":"pass|fail|unknown","reason":"one sentence"}],"confidence":0.9}`;
      const jr = await runAI("judge", t("test.judging", {id: test.id}), judgePrompt, {pid: p && p.id, step:"judge", fresh:true});   // judge 1: complex class; judge 2 below: a different class
      // every criterion needs a verdict: a missing one is "unknown" (a person decides), and no answer at all is not a result
      if (!jr || !arr(jr.verdicts).length){ run.skipped = arr(run.skipped); run.skipped.push(test.id); continue; }
      const got = arr(jr.verdicts).map(v => ({c: num(v.criterion, 0), v: oneOf(v.verdict, ["pass","fail","unknown"], "unknown"), reason: str(v.reason)}));
      const verdicts = test.criteria.map((c, j) => got.find(v => v.c === j + 1) || {c: j + 1, v: "unknown", reason: t("judge.noanswer")});
      const pass = verdicts.length > 0 && verdicts.every(v => v.v === "pass");
      const unknown = verdicts.some(v => v.v === "unknown");
      const conf = jr && jr.confidence != null ? clamp(num(jr.confidence, 1), 0, 1) : null;
      /* second judge from a different model class; disagreement goes to the person */
      let judge2 = null;
      if (versionLabel == null){
        const j2 = await runAI("judge2", t("test.judging2", {id: test.id}), judgePrompt.replace("[[task:judge]]", "[[task:judge2]]"), {pid: p && p.id, step:"judge2", tier: "default", fresh:true});
        const v2 = arr(j2 && j2.verdicts); if (v2.length) judge2 = v2.every(v => v.verdict === "pass") ? "pass" : v2.some(v => v.verdict === "unknown") && !v2.some(v => v.verdict === "fail") ? "unknown" : "fail";
      }
      run.results.push({testId:test.id, trial:k, output: trunc(out, 3000), verdicts, pass, judgePass: pass, unknown, conf, jv: JUDGE_V, judge2, sameFamily: true, heldOut: !!test.heldOut, category: test.category});
    }
  }
  p.runs.unshift(run); finishRun(p, run);
  const covered = !ids || p.tests.every(x => ids.includes(x.id));
  if (versionLabel == null && covered && run.results.length === list.length * trials){ p.seal.test = p.versionNo; }
  if (versionLabel == null) for (const id of [...new Set(run.results.map(r => r.testId))]) unflag(p, "test:" + id);
  logAct(p, t("act.tests", {r: run.passRate, n: list.length, k: trials}), {step:"test", important:true});
  return run;
}
function finishRun(p, run){
  const tests = [...new Set(run.results.map(r => r.testId))];
  const pr = run.results.length ? run.results.filter(r => r.pass).length / run.results.length : 0;
  const consistent = tests.length ? tests.filter(id => run.results.filter(r => r.testId === id).every(r => r.pass)).length / tests.length : 0;
  run.passRate = Math.round(pr * 100); run.consistency = Math.round(consistent * 100);
  // pass^k: share of tests that pass in every run; flip rate: share of tests whose result changes between runs
  const flips = tests.filter(id => { const rs = run.results.filter(r => r.testId === id); return rs.length > 1 && rs.some(r => r.pass) && rs.some(r => !r.pass); });
  run.passK = run.consistency; run.flipRate = tests.length ? Math.round(flips.length / tests.length * 100) : 0; run.flips = flips;
  p.runs = p.runs.slice(0, 12);
  const v = arr(p.versions).find(x => x.no === run.versionNo); if (v){ v.passRate = run.passRate; v.consistency = run.consistency; }
  touch(p); render();
}
async function aiImprove(p){
  const last = p.runs[0];
  if (!last){ toast(t("test.runfirst"), "err"); return; }
  const fails = last.results.filter(r => !r.pass && !r.heldOut).slice(0, 8);
  if (!fails.length){ toast(t("test.nofails"), "ok"); return; }
  const failText = fails.map(f => { const tc = p.tests.find(x => x.id === f.testId) || {}; return `<failure test="${f.testId}">\nInput: ${trunc(tc.input, 600)}\nCriteria: ${arr(tc.criteria).join(" | ")}\nVerdicts: ${f.verdicts.map(v => v.c + ":" + v.v + " " + v.reason).join(" | ")}\nOutput excerpt: ${trunc(f.output, 1200)}\n</failure>`; }).join("\n");
  const prompt = buildPrompt("improve", {proj: p, pkgEnglish: true, 
    rules:["golden","why","positive","short","calm","overfit"], userLang:true,
    body:`Improve the package so these failures are fixed in a general way — not by special-casing the test inputs. Diagnose the cause of each failure first, then rewrite only what is needed. Prefer shorter, clearer text over adding rules. \n\n${failText}\n\n<package>\n${jsonFit(p.pkg.sections.map(s => ({id:s.id, dest:s.dest, content:s.content})), 120000)}\n</package>`,
    schema:`{"diagnosis":["cause per failure, in the project's content language"],"sections":[{"id":"only changed sections","content":"full new content"}],"summary":"one sentence, in the project's content language"}`
  });
  const r = await runAI("improve", t("test.improving"), prompt, {pid: p && p.id, step:"improve"});
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
  const prompt = buildPrompt("trace", {proj: p, 
    rules:["spec"], userLang:true,
    body:`Build a traceability map. For each requirement, list the package lines (short exact quotes, max 12 words each) that implement it and the test ids that check it. Then list requirements with no implementing line or no test, and package lines that no requirement asks for (possible bloat).\n\n<requirements>\n${p.requirements.map(r => r.id + ": GIVEN " + r.given + " WHEN " + r.when + " THEN " + r.then).join("\n")}\n</requirements>\n<tests>\n${p.tests.map(x => x.id + ": " + x.title + " [" + x.reqIds.join(",") + "]").join("\n")}\n</tests>\n<package>\n${jsonFit(p.pkg.sections.map(s => ({id:s.id, content:s.content})), 120000)}\n</package>`,
    schema:`{"map":[{"req":"R1","lines":[{"section":"instructions","quote":"…"}],"tests":["T1"]}],"orphanReqs":[{"req":"R3","missing":"line|test|both"}],"orphanLines":[{"section":"…","quote":"…","note":"…"}]}`
  });
  const r = await runAI("trace", t("launch.tracing"), prompt, {pid: p && p.id, step:"launch", validate: o => o && Array.isArray(o.map) && arr(o.map).length >= Math.min(arr(p.requirements).length, 1) && Array.isArray(o.orphanReqs)});
  if (!r) return;
  p.trace = {map: arr(r.map).map(m => ({req:str(m.req), lines:arr(m.lines).map(l => ({section:str(l.section), quote:str(l.quote)})), tests:arr(m.tests).map(str)})),
    orphanReqs: arr(r.orphanReqs).map(o => ({req:str(o.req), missing:oneOf(o.missing, ["line","test","both"], "both")})),
    orphanLines: arr(r.orphanLines).map(o => ({section:str(o.section), quote:str(o.quote), note:str(o.note)})), at: now(), version: p.versionNo};
  touch(p); render();
}

/* ---------- 10. Feedback diagnosis ---------- */
async function aiDiagnose(p, fb){
  const prompt = buildPrompt("diagnose", {proj: p, pkgEnglish: true, 
    rules:["evals","golden","why","short"], context: projectContext(p),
    body:`The person pasted a REAL result from their running solution, with their comment. Diagnose: did it fail, and if so which category (specification gap | prompt wording | missing data or knowledge | tool or platform limit | model behaviour | wrong expectation)? Point to the exact package section and line responsible, propose a concrete fix (replacement text in English), and write a new regression test case so this failure can never return unnoticed.\n\n<real_result>\n${trunc(fb.pasted, 12000)}\n</real_result>\n<person_comment>\n${fb.comment || ""}\n</person_comment>\n<package>\n${jsonFit(p.pkg.sections.map(s => ({id:s.id, content:s.content})), 120000)}\n</package>`,
    schema:`{"ok":false,"category":"…","cause":"…","section":"instructions","line":"short quote","fix":"exact replacement or addition","test":{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"…","criteria":["…"]},"quality":3}`
  });
  const r = await runAI("diag-" + fb.id, t("op.diagnosing"), prompt, {pid: p && p.id, step:"operate"});
  if (!r) return;
  fb.diagnosis = {ok:!!r.ok, category:str(r.category), cause:str(r.cause), section:str(r.section), line:str(r.line), fix:str(r.fix), test: r.test ? {title:str(r.test.title), category:oneOf(r.test.category, ["normal","edge","adversarial","empty","language"], "edge"), input:str(r.test.input), simulated:str(r.test.simulated), criteria:arr(r.test.criteria).map(str)} : null};
  fb.quality = clamp(num(r.quality, 3), 1, 5);
  fb.status = "diagnosed";
  p.health.push({at: fb.at, quality: fb.quality, note: trunc(fb.comment || fb.diagnosis.cause, 140), fb: fb.id});
  touch(p); render();
}
async function aiApplyFeedbackFix(p, fb){
  const d = fb.diagnosis; if (!d) return;
  if (d.test){ p.tests.push({id: nextTestId(p), title:d.test.title, category:d.test.category, input:d.test.input, simulated:d.test.simulated, reqIds:[], criteria:d.test.criteria, heldOut:false, fromFeedback:fb.id}); }
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
  const prompt = buildPrompt("recap", {proj: p, 
    rules:[], context: projectContext(p),
    body:`Write a short end-of-session recap for the person's future self: what was decided this session, what is still open, and the single best next action. Use the decision log and recent changes.\n<recent_decisions>\n${p.decisions.slice(-10).map(d => d.title + ": " + d.choice).join("\n")}\n</recent_decisions>\n<phase>${p.phase}</phase>`,
    schema:`{"decided":["…"],"open":["…"],"next":"…"}`
  });
  const r = await runAI("recap", t("recap.writing"), prompt, {pid: p && p.id, step:"notes", quick:false});
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
  const prompt = buildPrompt("align", {proj: p, 
    rules:[], context: projectContext(p),
    body:`Check whether the current state of the project still serves the North Star exactly. List any drift, scope creep, or parts of the goal that nothing currently addresses.${arr(p.pkg && p.pkg.sections).length ? "\n<package>\n" + jsonFit(p.pkg.sections.map(s => ({id:s.id, content:trunc(s.content, 3000)})), 120000) + "\n</package>" : ""}`,
    schema:`{"aligned":true,"issues":["…"],"uncovered":["…"]}`
  });
  const r = await runAI("align", t("ns.checking"), prompt, {pid: p && p.id, step:"review"});
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
    const gen5 = /opus|sonnet-5|sonnet 5|haiku-5|haiku 5|fable|mythos/i.test(target);
    if (gen5 && /(double[- ]check|re-?check|verify (your|the) (work|answer|output)|final verification)/i.test(c)) out.push({sev:"warn", sec:s.id, key:"lint.verify", rule:"opus55"});
    if (/\bbudget_tokens\b|\btemperature\s*[:=]|\btop_[pk]\b|\bprefill/i.test(c)) out.push({sev:"warn", sec:s.id, key:"lint.gen5param", rule:"gen5"});
    if (gen5 && /\bonly (report|flag|list|mention|include) (the )?(high|critical|important|major|severe|top)\b/i.test(c)) out.push({sev:"info", sec:s.id, key:"lint.sevfilter", rule:"opus55"});
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
      // Anthropic's limit is 1,024 characters; shorter than 200 triggers more reliably
      if (desc.length > 1024) out.push({sev:"error", sec:s.id, key:"lint.skilldesc", rule:"projects", detail:String(desc.length)});
      else if (desc.length > 200) out.push({sev:"warn", sec:s.id, key:"lint.skilldesclong", rule:"projects", detail:String(desc.length)});
      const nm = c.match(/name:\s*(.+)/i), nmv = nm ? nm[1].trim() : "";
      if (nm && (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nmv) || nmv.length > 64)) out.push({sev:"error", sec:s.id, key:"lint.skillname", rule:"projects"});
      if (nm && /claude|anthropic/i.test(nmv)) out.push({sev:"error", sec:s.id, key:"lint.skillreserved", rule:"projects"});
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
  pr.understand = [arr(u.whys).length, u.jtbd, arr(u.reframes).length || (typeof problemRead === "function" && problemRead(p).cards.some(c => c.verdict === "good")), u.walkthrough].filter(Boolean).length / 4;
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
function activeForesight(p){
  const text = (JSON.stringify(p.northStar) + " " + str(p.intake.raw) + " " + str(p.intake.clean) + " " + p.qa.map(q => q.answer).join(" ")).toLowerCase();
  const auto = {"f-look": (p.dims.look || {}).status === "confirmed", "f-stop": !!p.interviewReady, "f-premortem": arr(p.understand.premortem).length > 0, "f-done": p.requirements.some(r => /done|complete|fertig/i.test(r.then + r.title)), "f-cost": !!p.arch.costEstimate, "f-rollback": !!p.launchVersion, "f-tests": p.tests.some(x => x.heldOut)};
  const cat = FORESIGHT.filter(f => !f.tr.length || f.tr.some(w => text.includes(w))).map(f => ({id:f.id, phase:f.phase, text:L(f), done: !!(p.fsDone || {})[f.id] || !!auto[f.id]}));
  const ai = p.foresight.map(f => ({id:f.id, phase:f.phase, text:f.text, done:f.done, ai:true}));
  // decision D8: who uses the tool switches on the EU transparency and Swiss data-protection concerns
  const aud = p.audience || {};
  const law = [];
  if (aud.eu) law.push({id:"f-art50", phase:"arch", text: t("fs.art50"), done: !!(p.fsDone || {})["f-art50"]});
  if (aud.customers || aud.eu) law.push({id:"f-fdpic", phase:"arch", text: t("fs.fdpic"), done: !!(p.fsDone || {})["f-fdpic"]});
  return cat.concat(ai, law);
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
