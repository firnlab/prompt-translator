/* ===================== 1.4.1 EXAMPLES FIRST =====================
   People find out what they want by reacting to concrete examples. The loop:
     Show  – PT makes a round of examples (Learning 3, Guided 5, Pro 8; changeable per project)
     React – you judge each one: ✓ Good / ✗ Not good / can't tell, with a short reason if you like
     Rule  – PT turns your reactions into goal rules (new, or a new version of an existing one), "from n examples"
     Check – PT checks its rules on new examples (Learning 2, Guided 2, Pro 3): you judge first, then PT shows what its
             rules expected. Agreement counts as "checked on n of your examples" (the gates count that number).
   Every example lives on one Examples board (keeping the E ids), with where it came from, your verdict, your reason,
   and which rules it informs. "+ Add example" is always top right of the examples area and opens the same panel. */

/* ---------- 1. sizes, sources, helpers ---------- */
const LOOP_SIZE = {learn: [3, 2], guided: [5, 2], pro: [8, 3]};
function loopSize(p){ const d = LOOP_SIZE[levelOf(p)] || LOOP_SIZE.guided; const o = (p && p.loopSize) || {}; return [clamp(num(o.teach, d[0]), 1, 12), clamp(num(o.check, d[1]), 1, 6)]; }
const EX_SRC = ["pt","you","run","real","test","variant","copy"];
function exSrc(e){ return EX_SRC.includes(e.src) ? e.src : e.copiedFrom ? "copy" : e.by === "pt" ? "pt" : "you"; }
function exById(p, id){ return goalOf(p).examples.find(e => e.id === id) || null; }
function loopOf(p){ p.loop = p.loop && typeof p.loop === "object" ? p.loop : {phase: "idle", ids: [], checkIds: [], round: 0}; p.loop.ids = arr(p.loop.ids); p.loop.checkIds = arr(p.loop.checkIds); return p.loop; }
function loopRead(p){ return p.loop && typeof p.loop === "object" ? p.loop : {phase: "idle", ids: [], checkIds: [], round: 0}; }
/** the criteria an example informs (criteria point to examples with exIds; checks are recorded on the criterion) */
function exCrits(p, id){ return goalOf(p).criteria.filter(c => arr(c.exIds).includes(id) || arr(c.checked).includes(id) || arr(c.missed).includes(id)).map(c => c.id); }
function critChecked(c){ return arr(c && c.checked).length; }
function newExample(p, o){
  const g = goalOf(p), id = nextId(p, "E", g.examples);
  const e = Object.assign({id, input: "", output: "", verdict: "", why: "", files: [], by: "you", src: "you", at: now()}, o, {id});
  g.examples.push(e);
  if (e.by === "pt") markPT(p, "ex:" + id, "added", t("why.example")); else markRef(p, "ex:" + id, "added");
  return e;
}
function exTitle(e){ const s = str(e.input).replace(/<file name="[^"]*">[\s\S]*?<\/file>/g, "").trim(); return s || (arr(e.files)[0] ? arr(e.files)[0].name : str(e.output).trim().split("\n")[0] || t("goal.exnoinput")); }

/* ---------- 2. AI: a round of examples · rules from reactions + check examples · variants · judge calibration ---------- */
async function aiLoopShow(p, n, {aim = ""} = {}){
  const g = goalOf(p);
  const unclear = g.criteria.filter(c => c.unclear || !critChecked(c)).slice(0, 6).map(c => c.id + ": " + critLine(c));
  const prompt = buildPrompt("loop-show", {proj: p, rules: ["evals","golden"], context: projectContext(p),
    body: `Make ${n} realistic example${n > 1 ? "s" : ""} of what this tool will receive and what the finished tool would return, so the person can judge each one Good or Not good. The point is to find out what the person really wants (people discover their criteria by reacting to concrete results), so:
- vary them on purpose: typical cases, harder ones, and at least one where a plausible result is subtly wrong in a way the person may not have thought of;
- aim them where the goal is still unclear or not yet checked${unclear.length ? ":\n" + unclear.map(x => "  - " + x).join("\n") : "."}
- write each output complete, as the person would really see it, in the language the finished tool would use for that input; use plausible example content and say that it is an example;
- do not repeat the existing examples.${aim ? "\nThe person asked for: " + aim : ""}`,
    schema: `{"examples":[{"input":"…","output":"…","aim":"what this example is meant to find out, one short sentence"}]}`});
  return runAI("loop", t("loop.making", {n}), prompt, {pid: p.id, step: "require", images: await exampleImages(p, g.examples.filter(e => e.verdict)), validate: o => o && arr(o.examples).filter(e => str(e.input).trim() && str(e.output).trim()).length > 0});
}
async function aiLoopRule(p, judged, nCheck){
  const g = goalOf(p);
  const prompt = buildPrompt("loop-rule", {proj: p, rules: ["spec","evals"], context: projectContext(p, {only: ["north_star","goal_criteria","graded_examples","requirements"]}),
    body: `The person judged these examples (Good / Not good, often with a reason). Do two things.
1. Turn what their reactions show into goal criteria ("When [situation], the result [property]"): a Good says what must stay true, a Not good says what must change (often a negative case, "neg": true). If an existing criterion already says it, return that criterion's id with sharper wording instead of a new one. Say which examples each criterion comes from and, in "why", what in the reactions led to it. "when" holds only the situation without the word "When"; "then" holds only the property without "the result".
2. Make ${nCheck} NEW examples (different from all existing ones) that test these criteria, and for each say what you predict the person will judge ("good" or "bad") and which criteria decide it. Do not make them easy: include one where your criteria might be wrong.
<judged_now>${JSON.stringify(judged.map(e => ({id: e.id, verdict: e.verdict, why: str(e.why), input: trunc(str(e.input), 12000), output: trunc(str(e.output), 20000)})))}</judged_now>`,
    schema: `{"criteria":[{"id":"existing id or empty","when":"…","then":"…","kind":"rule|judge","neg":false,"clear":true,"unclear":"","fromExamples":["E1"],"why":"…"}],"checks":[{"input":"…","output":"…","pred":"good|bad","crit":["C1"],"why":"one sentence"}]}`});
  return runAI("loop", t("loop.ruling"), prompt, {pid: p.id, step: "require", images: await exampleImages(p, judged), validate: o => o && (arr(o.criteria).length > 0 || arr(o.checks).length > 0)});
}
/** apply criteria answers (shared by the loop and "criteria from your examples"): new ones assumed, existing ones get a new version */
function applyLoopCriteria(p, list, {round = 0} = {}){
  const gg = goalOf(p), out = [];
  for (const c of arr(list)){
    c.when = critClean(c.when, "when"); c.then = critClean(c.then, "then");
    if (!str(c.when).trim() || !str(c.then).trim()) continue;
    const ex = arr(c.fromExamples).map(str).filter(e => gg.examples.some(x => x.id === e));
    const cur = str(c.id) && gg.criteria.find(x => x.id === str(c.id));
    if (cur && cur.by === "you" && cur.st !== "assumed"){ cur.exIds = [...new Set([...arr(cur.exIds), ...ex])]; flag(p, "crit:" + cur.id, t("loop.title"), t("crit.line", {w: str(c.when), r: str(c.then)})); out.push({id: cur.id, kind: "suggest"}); continue; }
    if (cur){
      if (critClean(cur.when, "when") === c.when && critClean(cur.then, "then") === c.then){ cur.exIds = [...new Set([...arr(cur.exIds), ...ex])]; out.push({id: cur.id, kind: "same"}); continue; }
      const before = {when: cur.when, then: cur.then};
      critVersion(p, cur, "pt", str(c.why)); Object.assign(cur, {when: str(c.when), then: str(c.then), exIds: [...new Set([...arr(cur.exIds), ...ex])], round}); cur.st = "assumed";
      markPT(p, "crit:" + cur.id, "changed", str(c.why) || t("why.fromgrade")); out.push({id: cur.id, kind: "changed", before}); continue;
    }
    if (gg.criteria.some(x => similar(x.when + " " + x.then, c.when + " " + c.then))) continue;
    const id = nextId(p, "C", gg.criteria);
    gg.criteria.push({id, when: str(c.when), then: str(c.then), kind: oneOf(c.kind, ["rule","judge"], "judge"), neg: !!c.neg, st: "assumed", by: "pt", unclear: c.clear === false ? str(c.unclear) : "", exIds: ex, at: now(), v: 1, hist: [], lastWhy: str(c.why), round});
    markPT(p, "crit:" + id, "added", str(c.why) || t("why.fromgrade")); out.push({id, kind: "added"});
  }
  return out;
}
async function aiExVariants(p, base, n = 10){
  const prompt = buildPrompt("ex-variants", {proj: p, rules: ["evals","overfit","trifecta"], platform: true, context: projectContext(p),
    body: `Turn these judged examples into ${n} test cases that vary them: the same kind of input with changes that matter (harder wording, missing data, a different language, an attempt to make the tool misbehave inside the data, an empty or broken input). For each: the input given to the tool, simulated tool or data results so the run can be simulated without the internet, 2-4 pass criteria a reviewer can judge yes/no from the output alone (use the goal criteria), which example it varies ("fromEx") and which criteria it checks.
<examples>${JSON.stringify(base.map(e => ({id: e.id, verdict: e.verdict, why: str(e.why), never: !!e.never, input: trunc(str(e.input), 12000), output: trunc(str(e.output), 20000)})))}</examples>`,
    schema: `{"tests":[{"title":"…","category":"normal|edge|adversarial|empty|language","input":"…","simulated":"…","criteria":["…"],"fromEx":"E1","critIds":["C1"]}]}`});
  return runAI("ex-var", t("ex.varmaking", {n}), prompt, {pid: p.id, step: "test", validate: o => o && arr(o.tests).filter(x => arr(x.criteria).length).length > 0});
}
async function aiJudgeCal(p){
  const g = goalOf(p), list = g.examples.filter(e => (e.verdict === "good" || e.verdict === "bad") && str(e.output).trim()).slice(0, 24);
  if (list.length < 2 || !g.criteria.length){ toast(t("jc.need"), "err"); return null; }
  const prompt = `[[task:judge-cal]]
You are an impartial grader. For each example, decide whether the RESULT meets the goal criteria below (pass) or not (fail). Grade substance only, not style or length. Be strict and literal; do not guess what the person thinks.
<criteria>
${g.criteria.map(c => c.id + ": " + critLine(c) + (c.neg ? " (must NOT happen)" : "")).join("\n")}
</criteria>
${list.map(e => `<example id="${e.id}">\n<input>${trunc(str(e.input), 12000)}</input>\n<result>${trunc(str(e.output), 20000)}</result>\n</example>`).join("\n")}
Write each reason in ${langName(contentLang(p))}.
Reply with only JSON: {"verdicts":[{"id":"E1","pass":true,"why":"one sentence"}]}`;
  const r = await runAI("judge-cal", t("jc.running", {n: list.length}), prompt, {pid: p.id, step: "judge", fresh: true, validate: o => o && arr(o.verdicts).length > 0});
  if (!r) return null;
  snapshot(p, t("a141.judgecal"));
  let tp = 0, pos = 0, tn = 0, neg = 0; const dis = [];
  for (const e of list){ const v = arr(r.verdicts).find(x => str(x.id) === e.id); if (!v) continue; const jp = !!v.pass, up = e.verdict === "good"; if (up){ pos++; if (jp) tp++; } else { neg++; if (!jp) tn++; } if (jp !== up) dis.push({id: e.id, why: str(v.why)}); }
  p.judgeCal = {at: now(), n: pos + neg, tpr: pos >= 2 ? Math.round(tp / pos * 100) : null, tnr: neg >= 2 ? Math.round(tn / neg * 100) : null, dis, v: JUDGE_V};   // a side with fewer than 2 of your labels says nothing yet
  logAct(p, t("jc.done", {a: p.judgeCal.tpr ?? "—", b: p.judgeCal.tnr ?? "—", n: p.judgeCal.n}), {step: "test", important: true});
  touch(p); render(); return p.judgeCal;
}
/** how well the judge agrees with you (calibration on your examples; falls back to your verdicts on test results) */
function judgeAgree(p){ const c = p.judgeCal; if (c && c.n >= 2) return {n: c.n, tpr: c.tpr, tnr: c.tnr, at: c.at, src: "cal"}; const s = judgeStats(p); return s.n ? {n: s.n, tpr: s.pos >= 2 ? s.tpr : null, tnr: s.neg >= 2 ? s.tnr : null, src: "runs"} : null; }   // a side with fewer than 2 of your labels says nothing yet

/* ---------- 3. the loop ---------- */
async function loopStart(p, {aim = ""} = {}){
  const L = loopOf(p), [n] = loopSize(p);
  // examples you added that are not judged yet join the round first; PT makes the rest
  const own = goalOf(p).examples.filter(e => !e.verdict && e.use !== "check" && !(e.use === "teach" && e.src === "pt") && e.src !== "pt").slice(0, n);
  const need = Math.max(0, n - own.length);
  const round = num(L.round, 0) + 1;
  let made = [];
  let r = null;
  if (need){ r = await aiLoopShow(p, need, {aim}); if (!r) return null; }
  loopOf(p); goalOf(p); snapshot(p, t("a141.round"));   // also when only your own examples join (no AI call): the round is one Undo
  if (r){
    made = arr(r.examples).filter(e => str(e.input).trim() && str(e.output).trim()).slice(0, need).map(e => newExample(p, {input: str(e.input), output: str(e.output), aim: str(e.aim), by: "pt", src: "pt", round, use: "teach"})); }
  for (const e of own){ e.round = round; e.use = "teach"; }
  const L2 = loopOf(p);
  Object.assign(L2, {phase: "react", round, ids: [...own, ...made].map(e => e.id), checkIds: [], i: 0, at: now(), rules: [], guess: ""});
  logAct(p, t("loop.started", {n: L2.ids.length, r: round}), {step: "capture"});
  touch(p); render(); scrollToLoop(); return L2;
}
async function loopRule(p){
  const L = loopOf(p), g = goalOf(p);
  const judged = L.ids.map(id => exById(p, id)).filter(e => e && (e.verdict === "good" || e.verdict === "bad"));
  if (!judged.length){ toast(t("loop.needone"), "err"); return null; }
  const [, nCheck] = loopSize(p);
  const r = await aiLoopRule(p, judged, nCheck); if (!r) return null;
  snapshot(p, t("a141.rules"));
  const changed = applyLoopCriteria(p, r.criteria, {round: L.round});
  const checks = arr(r.checks).filter(e => str(e.input).trim() && str(e.output).trim()).slice(0, nCheck).map(e => newExample(p, {input: str(e.input), output: str(e.output), by: "pt", src: "pt", round: L.round, use: "check", pred: {v: oneOf(e.pred, ["good","bad"], "good"), crit: arr(e.crit).map(str).filter(c => g.criteria.some(x => x.id === c)), why: str(e.why)}}));
  for (const e of judged) e.used = now();
  Object.assign(loopOf(p), {phase: checks.length ? "check" : "done", rules: changed, checkIds: checks.map(e => e.id), i: 0});
  logAct(p, t("loop.ruled", {n: changed.filter(x => x.kind !== "same").length, c: checks.length}), {step: "capture", important: true});
  touch(p); render(); scrollToLoop(); return r;
}
/** a check example was judged: did PT's rules predict your verdict? */
function loopCheckJudged(p, e){
  if (!e || !e.pred || e.use !== "check") return;
  const judged = e.verdict === "good" || e.verdict === "bad", agree = judged && e.verdict === e.pred.v;
  e.agree = judged ? agree : null;
  for (const cid of arr(e.pred.crit)){ const c = critById(p, cid); if (!c) continue;
    c.checked = arr(c.checked).filter(x => x !== e.id); c.missed = arr(c.missed).filter(x => x !== e.id);
    if (!judged) continue;   // a verdict taken back or "can't tell" is no evidence either way
    (agree ? c.checked : c.missed).push(e.id);
    // the changed rule is confirmed again on a fresh example: the old checks need not be judged again
    if (agree) c.recheck = []; }
}
/** an example that is deleted takes its evidence with it (criteria, the loop, tests made from it) */
function exForget(p, id){
  const g = goalOf(p);
  for (const c of g.criteria){ for (const k of ["checked","missed","recheck","exIds"]) if (Array.isArray(c[k])) c[k] = c[k].filter(x => x !== id); }
  const L = p.loop; if (L && typeof L === "object"){ L.ids = arr(L.ids).filter(x => x !== id); L.checkIds = arr(L.checkIds).filter(x => x !== id); if (L.phase !== "idle" && !L.ids.length && !L.checkIds.length) L.phase = "idle"; }
  for (const x of arr(p.tests)) if (x.fromEx === id){ x.fromEx = ""; x.fromExGone = id; }
}
function loopCur(p){ const L = loopRead(p), ids = L.phase === "check" ? L.checkIds : L.ids; const list = ids.map(id => exById(p, id)).filter(Boolean); return {L, list, i: clamp(num(L.i, 0), 0, Math.max(0, list.length - 1))}; }
function scrollToLoop(){ setTimeout(() => { const el = document.getElementById("loop"); const m = document.querySelector(".main"); if (el && m){ const d = el.getBoundingClientRect().top - m.getBoundingClientRect().top - 12; if (Math.abs(d) > 40) m.scrollTop += d; } }, 30); }
function exMedia(e){ return arr(e.files).filter(f => f.type === "image").map(f => `<img class="exphoto" src="${esc(f.asset ? "/_blob/" + f.asset : f.data || f.thumb || "")}" alt="${esc(f.name)}" loading="lazy" data-t="${esc(f.thumb || "")}">`).join(""); }   // ok:raw (data: or /_blob/ images; import clears outside links, 2.1 B17)
/** one example, big, with the verdict control (used by the loop and the board's focus view) */
function exCard(p, e, {reveal = false, keys = true} = {}){
  const why = `<label class="fld exwhy"><span>${esc(t(e.verdict === "bad" ? "goal.whybad" : e.verdict === "good" ? "goal.whygood" : "ex.whyany"))}</span>${bindInput("p:goal.examples.#" + e.id + ".why", e.why, {ph: t("goal.whyph")})}</label>`;
  const rv = reveal && e.pred && e.verdict && e.verdict !== "unsure" ? `<div class="exreveal ${e.verdict === e.pred.v ? "ok" : "bad"}" role="status">${stSlot(e.verdict === e.pred.v ? "ok" : "warn")}<div><b>${esc(e.verdict === e.pred.v ? t("loop.agree") : t("loop.disagree"))}</b><div class="small">${esc(t("loop.ptexpected", {v: t(e.pred.v === "good" ? "vd.good" : "vd.bad"), c: arr(e.pred.crit).join(", ") || "—"}))}${e.pred.why ? " · " + esc(e.pred.why) : ""}</div></div>${e.verdict !== e.pred.v ? aiBtn("loop-fix", t("loop.sharpen"), "M", {attrs: `data-id="${esc(e.id)}"`, key: "loop"}) : ""}</div>` : "";
  return `<article class="excard" data-ex="${esc(e.id)}" id="exc-${esc(e.id)}">
    <div class="row exhead"><span class="iid mono">${esc(e.id)}</span>${chip(t("ex.src." + exSrc(e)))}${e.aim && e.verdict && levelOf(p) !== "pro" ? `<span class="small muted">${esc(e.aim)}</span>` : ""}<span style="flex:1"></span>${markChip(p, "ex:" + e.id)}</div>
    <div class="exio"><div class="stack"><span class="small muted">${esc(t("goal.input"))}</span>${clampHTML(exTitle(e), "exi:" + e.id, {lines: 6, cls: "prew exin", tag: "div"})}${exMedia(e)}</div>
      <div class="stack"><span class="small muted">${esc(t("goal.output"))}</span>${clampHTML(str(e.output) || "—", "exo:" + e.id, {lines: 14, cls: "prew exout", tag: "div"})}</div></div>
    <div class="row exverd">${verdictCtl("ex-grade", `data-id="${esc(e.id)}"`, e.verdict, {keys})}<button type="button" class="btn sm ghost ${e.verdict === "unsure" ? "on" : ""}" data-a="ex-grade" data-id="${esc(e.id)}" data-v="unsure" aria-pressed="${e.verdict === "unsure"}">${esc(t("ex.unsure"))}</button></div>
    ${e.verdict && e.verdict !== "unsure" ? why : ""}${rv}
  </article>`;
}
function loopCard(p){
  const L = loopRead(p), g = goalOf(p), [nT, nC] = loopSize(p), lv = levelOf(p);
  const sizeSel = `<label class="small row loopsize" style="gap:6px">${esc(t("loop.size"))}<select data-a-change="loop-size" data-k="teach" aria-label="${esc(t("loop.sizeteach"))}">${[1,2,3,4,5,6,8,10,12].map(n => `<option ${n === nT ? "selected" : ""}>${n}</option>`).join("")}</select>+<select data-a-change="loop-size" data-k="check" aria-label="${esc(t("loop.sizecheck"))}">${[1,2,3,4,5,6].map(n => `<option ${n === nC ? "selected" : ""}>${n}</option>`).join("")}</select>${esc(t("loop.tocheck"))}</label>`;
  const head = `<div class="row loophead"><div class="stack" style="gap:2px;flex:1;min-width:220px"><h2>${ic("spark")} ${esc(t("loop.title"))}${L.round ? ` <span class="chip">${esc(t("loop.round", {n: L.round}))}</span>` : ""}</h2><p class="sub">${esc(t("loop.sub"))}</p></div>${sizeSel}${addExampleBtn()}</div>`;
  const busy = busyHTML("loop");
  let body = "";
  if (L.phase === "react" || L.phase === "check"){
    const {list, i} = loopCur(p), e = list[i];
    const done = list.filter(x => x.verdict).length;
    const dots = `<div class="row loopdots" role="tablist" aria-label="${esc(t("loop.progress"))}">${list.map((x, j) => `<button class="ldot ${j === i ? "on" : ""} ${x.verdict ? "v-" + x.verdict : ""}" data-a="loop-go" data-i="${j}" aria-label="${esc(x.id + " · " + (x.verdict ? t(x.verdict === "good" ? "vd.good" : x.verdict === "bad" ? "vd.bad" : "ex.unsure") : t("ex.notyet")))}" aria-current="${j === i}">${j + 1}</button>`).join("")}<span class="small muted">${esc(t(L.phase === "check" ? "loop.checking" : "loop.reacting", {a: done, b: list.length}))}</span></div>`;
    const nav = `<div class="row"><button class="btn sm ghost" data-a="loop-go" data-i="${i - 1}" ${i ? "" : "disabled"}>‹ ${esc(t("nav14.prev"))} <kbd>K</kbd></button><button class="btn sm ghost" data-a="loop-go" data-i="${i + 1}" ${i < list.length - 1 ? "" : "disabled"}>${esc(t("nav14.next"))} › <kbd>J</kbd></button><span style="flex:1"></span>
      ${L.phase === "react" ? aiBtn("loop-rule", done < list.length ? t("loop.rulenow", {n: done}) : t("loop.rule"), "M", {primary: done === list.length, key: "loop", attrs: done ? "" : "disabled"}) : `<button class="btn sm ${done === list.length ? "primary" : ""}" data-a="loop-finish">${esc(t("loop.finishcheck"))}</button>`}</div>`;
    const guess = L.phase === "react" && lv === "learn" && done === list.length ? `<div class="moment"><b>${esc(t("loop.guess.t"))}</b><p class="small">${esc(t("loop.guess"))}</p>${bindInput("p:loop.guess", L.guess || "", {ph: t("loop.guessph")})}</div>` : "";
    // 2.2.0 (tool request of 2 Nov): when the last example is judged, say so and name the one next step
    const allDone = list.length && done === list.length ? `<p class="small ok-t loop-alldone" role="status">${ic("check")} ${esc(t(L.phase === "react" ? "loop.alldone.react" : "loop.alldone.check", {n: list.length}))}</p>` : "";
    body = `${dots}${e ? exCard(p, e, {reveal: L.phase === "check"}) : `<p class="small muted">${esc(t("loop.empty"))}</p>`}${guess}${allDone}${nav}`;
  } else if (L.phase === "done"){
    const rs = arr(L.rules).map(x => ({x, c: critById(p, x.id)})).filter(o => o.c);
    const checks = L.checkIds.map(id => exById(p, id)).filter(Boolean), agree = checks.filter(e => e.agree).length;
    body = `<div class="loopdone"><p><b>${esc(t("loop.donet", {n: L.round}))}</b> ${esc(checks.length ? t("loop.doneagree", {a: agree, b: checks.length}) : "")}</p>
      ${rs.length ? `<div class="list">${rs.map(({x, c}) => `<div class="item">${stSlot(c.st === "assumed" ? "as" : "ok")}<div class="body"><div class="row" style="gap:6px"><span class="iid mono">${esc(c.id)}</span>${chip("v" + num(c.v, 1))}${chip(t("loop.k." + x.kind), x.kind === "added" ? "acc" : "")}${chip(t("crit.checked", {n: critChecked(c)}), critChecked(c) ? "ok" : "warn")}</div>${clampHTML(critLine(c), "lr:" + c.id, {lines: 3})}${x.before ? `<details class="small"><summary>${esc(t("loop.before"))}</summary>${esc(t("crit.line", {w: critClean(x.before.when, "when"), r: critClean(x.before.then, "then")}))}</details>` : ""}${c.lastWhy ? `<span class="small muted">${esc(t("loop.because"))}: ${esc(c.lastWhy)}</span>` : ""}</div>${c.st === "assumed" ? `<button class="btn xs primary" data-a="crit-ok" data-id="${esc(c.id)}">${ic("check")}${esc(t("q.o.keep"))}</button>` : ""}<button class="btn xs ghost" data-a="item-edit" data-ref="crit:${esc(c.id)}">${ic("edit")}${esc(t("it.edit"))}</button></div>`).join("")}</div>` : `<p class="small muted">${esc(t("loop.norules"))}</p>`}
      <div class="row">${aiBtn("loop-start", t("loop.next", {n: nT}), "M", {primary: true, key: "loop"})}<button class="btn sm ghost" data-a="loop-reset">${esc(t("loop.close"))}</button></div></div>`;
  } else {
    const unjudged = g.examples.filter(e => !e.verdict).length;
    body = `<div class="loopidle">${lv !== "pro" ? `<p class="small">${esc(t("loop.how"))}</p>` : ""}
      <div class="row">${aiBtn("loop-start", t("loop.start", {n: nT, c: nC}), "M", {primary: true, key: "loop"})}${unjudged ? `<button class="btn sm" data-a="board-filter" data-v="todo">${esc(t("loop.judgeown", {n: unjudged}))}</button>` : ""}<span class="hint">${esc(t("loop.cost"))}</span></div></div>`;
  }
  return `<section class="panel loop" id="loop" data-anchor="loop">${head}${busy}${body}</section>`;
}
/* the keys of the loop: Y good · N not good · J/K next/previous (A = add example is global) */
function loopKeys(e, p){
  const L = loopRead(p); if (!(L.phase === "react" || L.phase === "check")) return false;
  if (!document.getElementById("loop") || UI.home || UI.finish) return false;
  const k = e.key.toLowerCase(), {list, i} = loopCur(p), ex = list[i]; if (!ex) return false;
  if (k === "y" || k === "n"){ e.preventDefault(); actOpen(p, t(k === "y" ? "vd.good" : "vd.bad") + " · " + ex.id); ACTIONS["ex-grade"]({dataset: {id: ex.id, v: k === "y" ? "good" : "bad"}, key: true}); actCloseSoon(p.id); return true; }
  if (k === "j" || k === "k"){ e.preventDefault(); ACTIONS["loop-go"]({dataset: {i: String(i + (k === "j" ? 1 : -1))}}); return true; }
  return false;
}

KEY_HOOKS.push(loopKeys);
/* ---------- 4. the Examples board ---------- */
const BOARD_F = ["all","todo","good","bad","golden","never","run","real","test"];
function boardList(p, f){
  const ex = goalOf(p).examples;
  return f === "todo" ? ex.filter(e => !e.verdict) : f === "good" ? ex.filter(e => e.verdict === "good") : f === "bad" ? ex.filter(e => e.verdict === "bad") : f === "golden" ? ex.filter(e => e.golden) : f === "never" ? ex.filter(e => e.never) : ["run","real","test"].includes(f) ? ex.filter(e => exSrc(e) === f) : ex;
}
function examplesBoard(p){
  const g = goalOf(p), f = BOARD_F.includes(UI.boardF) ? UI.boardF : "all", list = boardList(p, f).slice().reverse();
  const lim = UI.boardMore ? 400 : 24;
  const row = e => { const ref = "ex:" + e.id, open = UI.open.has(ref), cr = exCrits(p, e.id);
    return `<div class="exrow ${e.verdict ? "v-" + e.verdict : ""}" id="ir-${esc(ref)}" data-ref="${esc(ref)}"><div class="row" style="gap:8px"><span class="iid mono">${esc(e.id)}</span><button class="ititle linkish" data-a="ex-open" data-ref="${esc(ref)}" aria-expanded="${open}">${esc(exTitle(e))}</button>${chip(t("ex.src." + exSrc(e)))}${e.golden ? chip("★ " + t("ex.golden"), "acc") : ""}${e.never ? chip(t("ex.never"), "warn") : ""}${cr.map(c => `<button class="chip tap" data-a="insp-open" data-ref="crit:${esc(c)}">${esc(c)}</button>`).join("")}${markChip(p, ref)}${inspBtn(ref, e.id)}
      ${verdictCtl("ex-grade", `data-id="${esc(e.id)}"`, e.verdict, {size: "xs"})}</div>
      ${e.verdict && e.verdict !== "unsure" ? `<label class="fld"><span>${esc(t(e.verdict === "good" ? "goal.whygood" : "goal.whybad"))}</span>${bindInput("p:goal.examples.#" + e.id + ".why", e.why, {ph: t("goal.whyph")})}</label>` : ""}
      ${open ? `<div class="grid2"><label class="fld"><span>${esc(t("goal.input"))}</span>${bindArea("p:goal.examples.#" + e.id + ".input", e.input, {rows: 4})}</label><label class="fld"><span>${esc(t("goal.output"))}</span>${bindArea("p:goal.examples.#" + e.id + ".output", e.output, {rows: 8})}</label></div>${exMedia(e)}
        <div class="row">${arr(e.files).map((fl, i) => `<span class="chip file">${fl.thumb || (fl.data && /^data:image/.test(fl.data)) ? `<img src="${esc(fl.thumb || fl.data)}" alt="" class="thumb">` : ic("note")}${esc(fl.name)}${fl.private ? " · " + esc(t("goal.private")) : ""}${fl.local ? " · " + esc(t("ex.local")) : ""}<button class="iconbtn" style="width:18px;height:18px" data-a="ex-file-del" data-id="${esc(e.id)}" data-i="${i}" aria-label="${esc(t("btn.delete"))}">${ic("x")}</button></span>`).join("")}
        <label class="btn xs" style="cursor:pointer">${ic("plus")}${esc(t("goal.addfile"))}<input type="file" accept="image/*,.txt,.md,.csv,.json,.pdf" multiple data-a-change="ex-files" data-id="${esc(e.id)}" hidden></label>
        <label class="chk small"><input type="checkbox" data-bind="p:goal.examples.#${e.id}.golden" ${e.golden ? "checked" : ""}>${esc(t("ex.goldenlbl"))}</label><label class="chk small"><input type="checkbox" data-bind="p:goal.examples.#${e.id}.never" ${e.never ? "checked" : ""}>${esc(t("ex.neverlbl"))}</label>
        <label class="chk small"><input type="checkbox" data-a-change="ex-private" data-id="${esc(e.id)}" ${arr(e.files).some(x => x.private) || e.private ? "checked" : ""}>${esc(t("goal.privatelbl"))}</label><span style="flex:1"></span><button class="btn xs ghost" data-a="ex-del" data-id="${esc(e.id)}">${ic("trash")}${esc(t("btn.delete"))}</button></div>` : ""}</div>`; };
  const counts = Object.fromEntries(BOARD_F.map(k => [k, boardList(p, k).length]));
  return `<section class="panel exboard" id="exboard" data-anchor="exboard"><div class="row"><div class="stack" style="gap:2px;flex:1;min-width:220px"><h2>${esc(t("ex.board"))} <span class="chip tnum">${g.examples.length}</span></h2><p class="sub">${esc(t("ex.boardsub"))}</p></div>${addExampleBtn()}</div>
    <div class="row exfilters" role="tablist">${BOARD_F.filter(k => k === "all" || counts[k]).map(k => `<button class="chip tap ${f === k ? "sel" : ""}" role="tab" aria-selected="${f === k}" data-a="board-filter" data-v="${k}">${esc(t("ex.f." + k))} · ${counts[k]}</button>`).join("")}</div>
    ${list.length ? `<div class="exlist">${list.slice(0, lim).map(row).join("")}</div>${list.length > lim ? `<div class="row"><button class="btn sm ghost" data-a="board-more">${esc(t("xp.more", {n: list.length - lim}))}</button></div>` : ""}` : `<p class="small muted">${esc(t("ex.boardempty"))}</p>`}
    ${seedCard(p)}
  </section>`;
}
/** existing projects: bring in examples you already have (nothing runs without your click, no AI cost) */
function seedCard(p){
  const g = goalOf(p); if (UI.seedHide === p.id) return "";
  const lr = lastRun(p), outs = lr ? [...new Map(arr(lr.results).filter(x => str(x.output).trim()).map(x => [x.testId, x])).values()] : [];
  const have = new Set(g.examples.map(e => e.srcRef).filter(Boolean));
  const fresh = outs.filter(x => !have.has(lr.id + ":" + x.testId));
  if (fresh.length < 2) return "";
  return `<div class="seed">${ic("inbox")}<div class="stack" style="flex:1;gap:2px"><b>${esc(t("seed.t", {n: fresh.length}))}</b><span class="small muted">${esc(t("seed.sub"))}</span></div><button class="btn sm primary" data-a="seed-run">${esc(t("seed.go", {n: fresh.length}))}</button><button class="iconbtn sm" data-a="seed-hide" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>`;
}

/* ---------- 5. "+ Add example": one button, one panel, four ways ---------- */
function addExampleBtn(){ return `<button class="btn sm exaddbtn" data-a="ex-addpanel" title="${esc(t("ex.add"))} (A)">${ic("plus")}${esc(t("ex.add"))} <kbd>A</kbd></button>`; }
function addExampleOpen(){ UI.modal = {kind: "exadd", way: "type", wide: true}; render(); focusSoon("exa-in"); }
MODAL14.exadd = (m, p, hd) => {
  const ways = ["type","photo","run","pt"];
  const lr = lastRun(p), outs = lr ? [...new Map(arr(lr.results).filter(x => str(x.output).trim()).map(x => [x.testId, x])).values()] : [];
  const tab = ways.map(w => `<button class="tab ${m.way === w ? "on" : ""}" role="tab" aria-selected="${m.way === w}" data-a="exa-way" data-v="${w}">${ic(w === "type" ? "edit" : w === "photo" ? "plus" : w === "run" ? "play" : "spark")}${esc(t("exa.w." + w))}</button>`).join("");
  let body = "";
  if (m.way === "type") body = `<label class="fld"><span>${esc(t("goal.input"))}</span><textarea id="exa-in" rows="4" placeholder="${esc(t("exa.inph"))}">${esc(m.input || "")}</textarea></label><label class="fld"><span>${esc(t("goal.output"))}</span><textarea id="exa-out" rows="7" placeholder="${esc(t("exa.outph"))}">${esc(m.output || "")}</textarea></label>
      <div class="row">${verdictCtl("exa-verdict", "", m.verdict || "")}<input type="text" id="exa-why" placeholder="${esc(t("goal.whyph"))}" value="${esc(m.why || "")}" style="flex:1;min-width:200px"></div>
      <div class="row end"><button class="btn ghost" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" data-a="exa-save">${ic("plus")}${esc(t("exa.save"))}</button></div>`;
  else if (m.way === "photo") body = `<p class="small">${esc(t(ASSETS.api ? "exa.photo" : "exa.photofb"))}</p><label class="btn" style="cursor:pointer;align-self:flex-start">${ic("plus")}${esc(t("exa.pick"))}<input type="file" accept="image/*" multiple data-a-change="exa-photos" hidden></label>
      <label class="chk small"><input type="checkbox" id="exa-priv" ${m.priv ? "checked" : ""} data-a-change="exa-priv">${esc(t("goal.privatelbl"))}</label>${m.busy ? `<div class="busy"><span class="pulse"></span>${esc(t("exa.uploading"))}</div>` : ""}<p class="hint">${esc(t("exa.photohint"))}</p>`;
  else if (m.way === "run") body = outs.length ? `<p class="small muted">${esc(t("exa.runsub", {v: lr.versionNo}))}</p><div class="list">${outs.slice(0, 40).map(x => { const tc = arr(p.tests).find(y => y.id === x.testId) || {}; return `<div class="item"><span class="iid mono">${esc(x.testId)}</span><div class="body">${clampHTML(tc.title || tc.input || "", "er:" + x.testId, {lines: 2})}${clampHTML(str(x.output), "seedo:" + lr.id + ":" + x.testId, {lines: 2, cls: "small muted"})}</div><button class="btn xs" data-a="exa-fromrun" data-run="${esc(lr.id)}" data-t="${esc(x.testId)}">${ic("plus")}${esc(t("exa.use"))}</button></div>`; }).join("")}</div>` : `<p class="small muted">${esc(t("exa.noruns"))}</p>`;
  else body = `<p class="small">${esc(t("exa.ptsub"))}</p><input type="text" id="exa-aim" placeholder="${esc(t("exa.aimph"))}" value="${esc(m.aim || "")}"><div class="row">${aiBtn("exa-pt", t("exa.ptgo"), "L", {primary: true, key: "loop"})}<span class="hint">${esc(t("exa.ptcost"))}</span></div>${busyHTML("loop")}`;
  return `${hd(t("ex.add"))}<p class="sub">${esc(t("exa.sub"))}</p><div class="tabs" role="tablist">${tab}</div>${body}`;
};
/* photos: stored with the artifact when PT can (assets), otherwise a small preview stays in PT and the photo in your folder */
const ASSETS = {api: undefined};
async function assetsApi(){ if (ASSETS.api === undefined){ try{ ASSETS.api = (window.claude && window.claude.use) ? await window.claude.use("assets") : null; }catch(e){ ASSETS.api = null; } } return ASSETS.api; }
assetsApi().then(() => { if (UI.booted && UI.modal && UI.modal.kind === "exadd") render(); }).catch(() => {});
async function photoFile(f, priv){
  const {canvas} = await resizeImage(f, 240); const thumb = canvas.toDataURL("image/jpeg", .7);
  const api = await assetsApi();
  if (api){ try{ const {canvas: big} = await resizeImage(f, 2000); const blob = await new Promise(r => big.toBlob(r, "image/jpeg", .88)); const up = await api.upload(blob, {type: "image/jpeg"}); return {name: f.name, type: "image", asset: up.id, thumb, private: priv, at: now()}; }catch(e){ if (e && e.code === "quota_or_state") toast(t("exa.quota"), "err"); } }
  // fallback: a small preview in PT; the full photo stays in your folder
  let q = .8, max = 1000, data = ""; for (let i = 0; i < 4; i++){ const {canvas: c2} = await resizeImage(f, max); data = c2.toDataURL("image/jpeg", q); if (data.length < 160000) break; q -= .15; max = Math.round(max * .75); }
  return {name: f.name, type: "image", data: data.length < 200000 ? data : "", thumb, local: true, private: priv, at: now()};
}
/* images for the AI: the stored photo, else the preview */
{ const orig = exampleImages; exampleImages = async function(p, list){ const imgs = [];
  for (const e of arr(list)) for (const f of arr(e.files)){ if (f.type !== "image" || (f.private && UI.privOk !== p.id)) continue; const src = f.asset ? "/_blob/" + f.asset : f.data || f.thumb; if (!src) continue; try{ imgs.push(await (await fetch(src)).blob()); }catch(err){} }
  return imgs.slice(0, 6); }; }

/* ---------- 6. tests from examples ---------- */
/** every judged example becomes a test (deterministic, no AI): its input, the criteria it informs, and for a Not good one, what must not happen */
function testsFromExamples(p){
  const g = goalOf(p); let n = 0;
  // test runs are text only: an example that is only a photo cannot become a test (it stays an example for judging)
  const photoOnly = x => arr(x.files).some(f => f.type === "image") && !str(x.input).replace(/<file[\s\S]*?<\/file>/g, "").replace(/\S+\.(png|jpe?g|webp|gif|heic|heif)\b/gi, "").trim();
  for (const e of g.examples.filter(x => (x.verdict === "good" || x.verdict === "bad" || x.golden || x.never) && str(x.input).trim() && !photoOnly(x))){
    const cr = exCrits(p, e.id).map(id => critById(p, id)).filter(Boolean);
    const crit = cr.map(c => critLine(c));
    if (e.verdict === "bad" || e.never) crit.push(t("ex.t.mustnot", {x: str(e.why) || t("ex.t.likeex", {id: e.id})}));
    if (e.verdict === "good" && str(e.why)) crit.push(t("ex.t.keep", {x: e.why}));
    if (!crit.length) crit.push(t("ex.t.likegood", {id: e.id}));
    const cur = arr(p.tests).find(x => x.fromEx === e.id && !x.variant);
    if (cur){   // the test made from this example follows its current verdict and never flag
      const nx = {category: e.never ? "adversarial" : "normal", critIds: cr.map(c => c.id), criteria: crit, never: !!e.never, files: clone(arr(e.files)), input: str(e.input), title: e.id + " · " + exTitle(e)};
      if (JSON.stringify([cur.category, cur.critIds, cur.criteria, !!cur.never, str(cur.input), arr(cur.files).map(f => f.name)]) !== JSON.stringify([nx.category, nx.critIds, nx.criteria, nx.never, nx.input, nx.files.map(f => f.name)])){ Object.assign(cur, nx); markPT(p, "test:" + cur.id, "changed", t("why.fromex", {e: e.id})); n++; }
      continue;
    }
    const id = nextTestId(p);
    p.tests.push({id, title: e.id + " · " + exTitle(e), category: e.never ? "adversarial" : "normal", input: str(e.input), simulated: "", reqIds: [], critIds: cr.map(c => c.id), criteria: crit, heldOut: false, fromEx: e.id, never: !!e.never, files: clone(arr(e.files))});
    markPT(p, "test:" + id, "added", t("why.fromex", {e: e.id})); n++;
  }
  if (n){ logAct(p, t("ex.t.done", {n}), {step: "test", important: true}); touch(p); }
  return n;
}
async function variantsFromExamples(p, total = 30){
  const base = goalOf(p).examples.filter(e => (e.golden || e.never || e.verdict) && str(e.input).trim()).slice(0, 12);
  if (!base.length){ toast(t("ex.var.need"), "err"); return 0; }
  let made = 0;
  for (let i = 0; i < total; i += 10){
    const r = await aiExVariants(p, base, Math.min(10, total - i)); if (!r) break;
    snapshot(p, t("a141.variants"));   // each batch is a step of one group: Undo takes all batches back
    for (const x of arr(r.tests).filter(y => arr(y.criteria).length)){ const id = nextTestId(p);
      p.tests.push({id, title: str(x.title), category: oneOf(x.category, ["normal","edge","adversarial","empty","language"], "edge"), input: str(x.input), simulated: str(x.simulated), reqIds: [], critIds: arr(x.critIds).map(str).filter(c => critById(p, c)), criteria: arr(x.criteria).map(str).filter(Boolean), heldOut: made % 4 === 3, fromEx: str(x.fromEx), variant: true});
      markPT(p, "test:" + id, "added", t("why.variant", {e: str(x.fromEx)})); made++; }
    touch(p); render();
  }
  if (made) logAct(p, t("ex.var.done", {n: made}), {step: "test", important: true});
  return made;
}
/** the Prove gate: every "never" example's test must pass in the latest run */
function neverFails(p){ const lr = lastRun(p); if (!lr || lr.versionNo !== p.versionNo) return []; const ids = arr(p.tests).filter(x => x.never).map(x => x.id); return [...new Set(arr(lr.results).filter(r => ids.includes(r.testId) && !(r.userVerdict ? r.userVerdict === "pass" : r.pass)).map(r => r.testId))]; }
function examplesTestPanel(p){
  const g = goalOf(p), judged = g.examples.filter(e => e.verdict === "good" || e.verdict === "bad").length, fromEx = arr(p.tests).filter(x => x.fromEx).length, ja = judgeAgree(p);
  return `<section class="panel" id="extests">${head(t("ex.t.title"), t("ex.t.sub"))}
    <div class="row"><button class="btn sm primary" data-a="ex-tests" ${judged ? "" : "disabled"}>${ic("plus")}${esc(t("ex.t.make", {n: judged}))}</button>${aiBtn("ex-variants", t("ex.var.make"), "H", {key: "ex-var"})}<span class="hint">${esc(t("ex.t.have", {n: fromEx}))}</span></div>${busyHTML("ex-var")}
    <div class="row">${ja ? `${chip(t("judge.tpr") + " " + (ja.tpr != null ? ja.tpr + "%" : "—"), ja.tpr >= 80 ? "ok" : "warn")}${chip(t("judge.tnr") + " " + (ja.tnr != null ? ja.tnr + "%" : "—"), ja.tnr >= 80 ? "ok" : "warn")}<span class="small muted">${esc(t(ja.src === "cal" ? "jc.on" : "jc.onruns", {n: ja.n}))}</span>` : `<span class="small muted">${esc(t("jc.none"))}</span>`}${aiBtn("judge-cal", t("jc.run"), "M", {key: "judge-cal"})}</div>${busyHTML("judge-cal")}
    ${p.judgeCal && arr(p.judgeCal.dis).length ? `<details class="small"><summary>${esc(t("jc.dis", {n: p.judgeCal.dis.length}))}</summary><ul>${p.judgeCal.dis.map(d => `<li><button class="linkish" data-a="insp-open" data-ref="ex:${esc(d.id)}">${esc(d.id)}</button> · ${esc(d.why)}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}

/* ---------- 7. actions ---------- */
Object.assign(ACTIONS, {
  "loop-start": () => { const p = curP(); costGuard(p, "loop", () => loopStart(p)); },
  "loop-rule": () => { const p = curP(); const priv = goalOf(p).examples.some(e => arr(e.files).some(f => f.private)); const go = () => loopRule(p); if (priv && UI.privOk !== p.id){ confirmBox(t("goal.privq.t"), t("goal.privq"), t("goal.privyes"), () => { UI.privOk = p.id; go(); }); return; } go(); },
  "loop-go": el => { const p = curP(); const L = loopOf(p); const {list} = loopCur(p); L.i = clamp(num(el.dataset.i, 0), 0, Math.max(0, list.length - 1)); render(); },
  "loop-finish": () => { const p = curP(); const L = loopOf(p); L.phase = "done"; logAct(p, t("loop.checked", {n: L.checkIds.length}), {step: "capture"}); touch(p); render(); },
  "loop-reset": () => { const p = curP(); const L = loopOf(p); for (const id of L.ids){ const e = exById(p, id); if (e && !e.verdict && e.src !== "pt") delete e.use; } L.phase = "idle"; L.ids = []; L.checkIds = []; touch(p); render(); },
  "loop-fix": async el => { const p = curP(); const e = exById(p, el.dataset.id); if (!e) return; const r = await aiLoopRule(p, [e], 0); if (!r) return; snapshot(p, t("a141.rules")); const ch = applyLoopCriteria(p, r.criteria, {round: loopRead(p).round}); const L = loopOf(p); const RK = {added: 3, changed: 2, same: 1}; const by = {}; for (const x of [...arr(L.rules), ...ch]){ const k = x.id || JSON.stringify(x); if (!by[k] || (RK[x.kind] || 0) > (RK[by[k].kind] || 0)) by[k] = x; } L.rules = Object.values(by); touch(p); render(); toastUndo(t("loop.fixed", {n: ch.filter(x => x.kind !== "same").length})); },
  "ex-grade": el => { const p = curP(); const e = exById(p, el.dataset.id); if (!e) return;
    const v = el.dataset.v; e.verdict = e.verdict === v && !el.key ? "" : v; e.used = null; e.judgedAt = now();
    markRef(p, "ex:" + e.id, "decided"); loopCheckJudged(p, e);
    if (typeof skillEvidence === "function") skillEvidence(p, "judge");
    touch(p);
    // in the loop: go on to the next example that is not judged yet (a Not good asks for the reason first)
    const L = loopRead(p), {list, i} = loopCur(p);
    if ((L.phase === "react" || L.phase === "check") && list[i] && list[i].id === e.id && e.verdict && e.verdict !== "bad" && !(L.phase === "check" && e.pred)){ const nx = list.findIndex((x, j) => j > i && !x.verdict); if (nx >= 0) loopOf(p).i = nx; }
    render();
    if (e.verdict === "bad" || (e.verdict === "good" && !(L.phase === "react"))) setTimeout(() => { const f = document.querySelector(`[data-bind="p:goal.examples.#${e.id}.why"]`); if (f && !f.value && !el.key) f.focus({preventScroll: true}); }, 30); },
  "board-filter": el => { UI.boardF = el.dataset.v; UI.boardMore = false; render(); const b = document.getElementById("exboard"); if (b) b.scrollIntoView({block: "start"}); },
  "board-more": () => { UI.boardMore = true; render(); },
  "ex-addpanel": () => addExampleOpen(),
  "exa-way": el => { const m = UI.modal; if (!m) return; exaKeep(m); m.way = el.dataset.v; render(); if (m.way === "type") focusSoon("exa-in"); },
  "exa-verdict": el => { const m = UI.modal; if (!m) return; m.input = ($("#exa-in") || {}).value; m.output = ($("#exa-out") || {}).value; m.why = ($("#exa-why") || {}).value; m.verdict = m.verdict === el.dataset.v ? "" : el.dataset.v; render(); },
  "exa-save": () => { const p = curP(); const m = UI.modal; const input = str(($("#exa-in") || {}).value).trim(), output = str(($("#exa-out") || {}).value).trim(); if (!input && !output){ toast(t("exa.need"), "err"); return; }
    actOpen(p, t("ex.add")); const e = newExample(p, {input, output, verdict: m.verdict || "", why: str(($("#exa-why") || {}).value).trim(), by: "you", src: "you"}); exJoinRound(p, e); actClose(p.id); UI.modal = null; touch(p); render(); toastUndo(t("exa.added", {id: e.id})); },
  "exa-fromrun": el => { const p = curP(); const r = arr(p.runs).find(x => x.id === el.dataset.run); const x = r && arr(r.results).find(y => y.testId === el.dataset.t); if (!x) return; const tc = arr(p.tests).find(y => y.id === x.testId) || {};
    actOpen(p, t("ex.add")); const e = newExample(p, {input: str(tc.input), output: str(x.output), by: "you", src: "test", srcRef: r.id + ":" + x.testId}); exJoinRound(p, e); actClose(p.id); touch(p); render(); toastUndo(t("exa.added", {id: e.id})); },
  "exa-pt": async () => { const p = curP(); const aim = str(($("#exa-aim") || {}).value).trim(); const r = await aiLoopShow(p, 1, {aim}); if (!r) return; const x = arr(r.examples)[0]; if (!x) return; snapshot(p, t("ex.add")); const e = newExample(p, {input: str(x.input), output: str(x.output), aim: str(x.aim), by: "pt", src: "pt"}); exJoinRound(p, e); UI.modal = null; touch(p); render(); toastUndo(t("exa.added", {id: e.id})); },
  "ex-tests": () => { const p = curP(); const n = testsFromExamples(p); render(); toastUndo(n ? t("ex.t.done", {n}) : t("ex.t.none")); },
  "ex-variants": () => { const p = curP(); costGuard(p, "ex-variants", () => actGroup(() => variantsFromExamples(p, 30)), 30); },
  "judge-cal": () => { const p = curP(); aiJudgeCal(p); },
  "seed-run": () => { const p = curP(); const lr = lastRun(p); if (!lr) return; const have = new Set(goalOf(p).examples.map(e => e.srcRef).filter(Boolean)); let n = 0;
    for (const x of [...new Map(arr(lr.results).filter(y => str(y.output).trim()).map(y => [y.testId, y])).values()]){ if (have.has(lr.id + ":" + x.testId)) continue; const tc = arr(p.tests).find(y => y.id === x.testId) || {}; newExample(p, {input: str(tc.input), output: str(x.output), by: "you", src: "test", srcRef: lr.id + ":" + x.testId}); n++; }
    UI.boardF = "todo"; touch(p); render(); toastUndo(t("seed.done", {n})); },
  "seed-hide": () => { UI.seedHide = UI.pid; render(); }
});
["loop-go","board-filter","board-more","ex-addpanel","exa-way","exa-verdict","seed-hide"].forEach(a => ACT_NO.add(a));
/** an example you add while a round is open counts toward it */
function exJoinRound(p, e){ const L = loopRead(p); if (L.phase === "react" && e && !e.verdict){ const L2 = loopOf(p); L2.ids.push(e.id); e.round = L2.round; e.use = "teach"; } }
Object.assign(CHANGES, {
  "loop-size": el => { const p = curP(); p.loopSize = Object.assign({}, p.loopSize, {[el.dataset.k]: num(el.value, 1)}); touch(p); render(); },
  "exa-priv": el => { if (UI.modal) UI.modal.priv = el.checked; },
  "exa-photos": async el => { const p = curP(); const m = UI.modal; const files = Array.from(el.files || []).slice(0, 8); if (!files.length) return; m.busy = true; render(); let n = 0;
    actOpen(p, t("ex.add"));
    for (const f of files){ try{ const fl = await photoFile(f, !!m.priv); const e = newExample(p, {input: f.name, output: "", files: [fl], by: "you", src: "real", private: !!m.priv}); exJoinRound(p, e); n++; }catch(err){ toast(t("err.image"), "err"); } }
    actClose(p.id); m.busy = false; UI.modal = null; UI.boardF = "todo"; touch(p); render(); toastUndo(t("exa.photosadded", {n})); },
  "ex-files": async el => { const p = curP(); const e = exById(p, el.dataset.id); if (!e) return; const priv = !!e.private || arr(e.files).some(f => f.private);
    for (const f of Array.from(el.files || []).slice(0, 6)){
      try{
        if (/^image\//.test(f.type)) e.files.push(await photoFile(f, priv));
        else { const txt = (await readFiles([f]))[0]; if (txt){ e.files.push({name: f.name, type: "text", private: priv, at: now()}); e.input = (e.input ? e.input + "\n\n" : "") + "<file name=\"" + f.name + "\">\n" + trunc(txt.text, 20000) + "\n</file>"; } }
      }catch(err){ toast(t("err.image"), "err"); }
    }
    el.value = ""; touch(p); render(); }
});

/** the add-example panel keeps what you typed when you switch between the ways or the screen re-renders */
function exaKeep(m){ if (!m) return; const g = id => { const el = document.getElementById(id); return el ? el.value : null; }; const i = g("exa-in"), o = g("exa-out"), w = g("exa-why"); if (i != null) m.input = i; if (o != null) m.output = o; if (w != null) m.why = w; }
document.addEventListener("input", e => { const id = e.target && e.target.id; if (UI.modal && UI.modal.kind === "exadd" && (id === "exa-in" || id === "exa-out" || id === "exa-why")) exaKeep(UI.modal); });
