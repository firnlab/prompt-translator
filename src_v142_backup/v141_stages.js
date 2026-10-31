/* ===================== 1.4.1 EXAMPLES IN EVERY STAGE =====================
   Goal       · problem cards (several ways to say what the real problem is; you judge them) + one recent real situation +
                a rough number (how often / how much it costs you now) that becomes the baseline of the success measure
   Options    · questions come as what-if situations (the interview engine, ★, one click)
   Design     · each option as "a day using it", the simplest one always included; your click is your decision
   Build      · the brief is tried on your example inputs right away; the results join the Examples board to judge
   Release    · real results you paste become examples; the success number is tracked against the baseline */

/* ---------- Goal: problem cards ---------- */
function problemOf(p){ p.problem = p.problem && typeof p.problem === "object" ? p.problem : {cards: [], situation: "", number: "", unit: "", log: []}; p.problem.cards = arr(p.problem.cards); p.problem.log = arr(p.problem.log); return p.problem; }
/** read-only view of the problem data; a partly filled object (for example only the situation typed in) still has its lists */
function problemRead(p){ const P = p.problem && typeof p.problem === "object" ? p.problem : {}; return Object.assign({situation: "", number: "", unit: ""}, P, {cards: arr(P.cards), log: arr(P.log)}); }
async function aiProblemCards(p){
  const P = problemRead(p);
  const prompt = buildPrompt("problem-cards", {proj: p, rules: ["elicit","simple"], context: projectContext(p, {only: ["north_star","clarified_idea","raw_idea","interview_answers"]}),
    body: `Before anything is designed, help the person see what the real problem is. Write 4 different ways to state the problem behind their idea, each as one plain sentence ("The real problem is …") with one short line on what would be built differently if that were the problem. Make them truly different (a symptom vs. the cause, a time problem vs. a quality problem, the person's problem vs. their customers' problem). Do not repeat these: ${JSON.stringify(arr(P.cards).map(c => c.text))}
Also ask for one recent real situation where the problem happened (one question), and suggest what to count to measure it (for example "minutes per listing" or "unsold items per week").`,
    schema: `{"cards":[{"text":"The real problem is …","differently":"…"}],"situationQ":"…","measure":{"what":"…","unit":"…"}}`});
  const r = await runAI("problem", t("pc.making"), prompt, {pid: p.id, step: "understand", validate: o => o && arr(o.cards).length > 0});
  if (!r) return null;
  problemOf(p); snapshot(p, t("a141.problem"));   // the object exists before the action, so Undo compares card by card
  const P2 = problemOf(p);
  for (const c of arr(r.cards).filter(c => str(c.text).trim()).slice(0, 5)){ const id = uid("pc"); P2.cards.push({id, text: str(c.text), differently: str(c.differently), verdict: "", by: "pt", at: now()}); }
  if (str(r.situationQ)) P2.situationQ = str(r.situationQ);
  if (r.measure && str(r.measure.what) && !P2.what){ P2.what = str(r.measure.what); P2.unit = P2.unit || str(r.measure.unit); }
  logAct(p, t("pc.made", {n: arr(r.cards).length}), {step: "understand"});
  touch(p); render(); return r;
}
function problemPanel(p){
  const P = problemRead(p);
  const card = c => `<div class="pcard2 ${c.verdict ? "v-" + c.verdict : ""}"><div class="stack" style="gap:2px;flex:1;min-width:220px">${clampHTML(c.text, "pc:" + c.id, {lines: 3, tag: "b"})}${c.differently ? `<span class="small muted">${esc(t("pc.differently"))}: ${esc(c.differently)}</span>` : ""}</div>${verdictCtl("pc-grade", `data-id="${esc(c.id)}"`, c.verdict, {lGood: t("pc.fits"), lBad: t("pc.notit"), size: "xs"})}</div>`;
  const good = P.cards.filter(c => c.verdict === "good");
  return `<section class="panel" id="problem" data-anchor="problem">${head(t("pc.title"), t("pc.sub"), aiBtn("pc-make", P.cards.length ? t("pc.more") : t("pc.make"), "L", {primary: !P.cards.length, key: "problem"}))}${busyHTML("problem")}
    ${P.cards.length ? `<div class="stack pcards">${P.cards.map(card).join("")}</div>` : `<p class="small muted">${esc(t("pc.empty"))}</p>`}
    ${good.length ? `<div class="row"><span class="small">${esc(t("pc.chosen", {n: good.length}))}</span>${str(p.northStar.problem) !== good[0].text ? `<button class="btn sm" data-a="pc-tons" data-id="${esc(good[0].id)}">${esc(t("pc.tons"))}</button>` : `<span class="chip ok">${esc(t("pc.inns"))}</span>`}</div>` : ""}
    <div class="grid2"><label class="fld"><span>${esc(P.situationQ || t("pc.situation"))}</span>${bindArea("p:problem.situation", P.situation || "", {rows: 3, ph: t("pc.situationph")})}</label>
      ${numberFields(p)}</div>
  </section>`;
}
function numberFields(p){
  const P = problemRead(p);
  return `<div class="stack" style="gap:6px"><span class="small muted">${esc(t("pc.number"))}</span><div class="row" style="gap:6px">${bindInput("p:problem.number", P.number || "", {ph: t("pc.numberph")})}${bindInput("p:problem.unit", P.unit || "", {ph: P.what || t("pc.unitph")})}</div><span class="hint">${esc(t("pc.numberhint"))}</span></div>`;
}
/** the number keeps coming back: baseline (Goal) → measured now (pilot / real use) */
function successPanel(p){
  const P = problemRead(p); if (!str(P.number).trim() && !P.log.length) return "";
  const last = P.log[P.log.length - 1];
  return `<section class="panel" id="success14">${head(t("sn.title"), t("sn.sub"))}
    <div class="row sngrid"><div class="stack"><span class="small muted">${esc(t("sn.before"))}</span><b class="snnum">${esc(P.number || "—")} ${esc(P.unit || "")}</b></div><div class="stack"><span class="small muted">${esc(t("sn.now"))}</span><b class="snnum">${last ? esc(last.v + " " + (P.unit || "")) : "—"}</b>${last ? `<span class="small muted">${esc(fmtDay(last.at))}${last.note ? " · " + esc(last.note) : ""}</span>` : ""}</div></div>
    <form class="row" data-form="sn-add"><input type="text" id="sn-v" placeholder="${esc(t("sn.vph"))}" style="max-width:160px"><input type="text" id="sn-note" placeholder="${esc(t("sn.noteph"))}" style="flex:1;min-width:180px"><button class="btn sm" type="submit">${ic("plus")}${esc(t("sn.add"))}</button></form>
    ${P.log.length > 1 ? `<div class="list">${P.log.slice().reverse().map(x => `<div class="item"><span class="mono small">${esc(fmtDay(x.at))}</span><div class="body small"><b>${esc(x.v)} ${esc(P.unit || "")}</b>${x.note ? " · " + esc(x.note) : ""}</div></div>`).join("")}</div>` : ""}</section>`;
}
FORMS["sn-add"] = () => { const p = curP(); const v = str(($("#sn-v") || {}).value).trim(); if (!v){ toast(t("sn.need"), "err"); return; } const P = problemOf(p); P.log.push({v, note: str(($("#sn-note") || {}).value).trim(), at: now()}); logAct(p, t("sn.logged", {v, u: P.unit || ""}), {important: true}); touch(p); render(); toastUndo(t("sn.logged", {v, u: P.unit || ""})); };

/* ---------- Design: a day using each option ---------- */
async function aiArchStories(p){
  const a = p.arch; if (!arr(a.options).length) return null;
  const prompt = buildPrompt("arch-stories", {proj: p, rules: ["simple","reversible"], context: projectContext(p, {only: ["north_star","goal_criteria","requirements","interview_answers"]}),
    body: `For each design option below, write "a day using it": 4-6 short moments with a time of day, from the person's point of view (what they do, what the tool does, where it can go wrong), ending with what it costs them in time. Plain words, no jargon. If none of the options is the simplest possible one (no build: an existing tool, a manual step or plain code), add one with id "simplest".
<options>${JSON.stringify(a.options.map(o => ({id: o.id, name: o.name, summary: o.summary, kind: o.kind})))}</options>`,
    schema: `{"stories":[{"id":"o1","day":[{"time":"08:00","text":"…"}],"effort":"about 10 minutes a day"}],"simplest":{"name":"…","summary":"…","day":[{"time":"…","text":"…"}],"effort":"…"}}`});
  const r = await runAI("arch-stories", t("ds.making"), prompt, {pid: p.id, step: "arch", validate: o => o && arr(o.stories).length > 0});
  if (!r) return null;
  snapshot(p, t("a141.stories"));
  for (const s of arr(r.stories)){ const o = a.options.find(x => x.id === str(s.id)); if (o){ o.day = arr(s.day).map(d => ({time: str(d.time), text: str(d.text)})).filter(d => d.text); o.effortDay = str(s.effort); } }
  const none = a.options.find(o => o.simplest || o.kind === "none");
  if (r.simplest && none && !arr(none.day).length){ none.day = arr(r.simplest.day).map(d => ({time: str(d.time), text: str(d.text)})).filter(d => d.text); none.effortDay = none.effortDay || str(r.simplest.effort); }
  // one "simplest" option at most (1.4.0 options without a story are kind "none"); a new id never collides with a gap
  if (r.simplest && str(r.simplest.name) && !none){ let k = a.options.length + 1; while (a.options.some(o => o.id === "o" + k)) k++; a.options.push({id: "o" + k, name: str(r.simplest.name), summary: str(r.simplest.summary), kind: "none", rung: "R0", scores: {reliability: 3, cost: 5, safety: 5, effort: 5, maintainability: 4, platformFit: 3}, pros: [], cons: [], simplest: true, day: arr(r.simplest.day).map(d => ({time: str(d.time), text: str(d.text)})), effortDay: str(r.simplest.effort)}); }
  logAct(p, t("ds.made"), {step: "arch"}); touch(p); render(); return r;
}
function optionCards(p){
  const a = p.arch, keys = ["reliability","cost","safety","effort","maintainability","platformFit"];
  const noStory = a.options.some(o => !arr(o.day).length);
  return `${noStory ? `<div class="row">${aiBtn("ds-make", t("ds.make"), "M", {key: "arch-stories"})}<span class="hint">${esc(t("ds.hint"))}</span></div>${busyHTML("arch-stories")}` : ""}
    <div class="optcards">${a.options.map((o, i) => `<article class="optcard ${o.id === a.chosen && !a.chosenAssumed ? "chosen" : ""} ${o.id === a.recommended ? "rec" : ""}">
      <div class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap"><kbd>${i + 1}</kbd><b class="optname">${esc(o.name)}</b></div>
      <div class="row" style="gap:6px">${o.id === a.recommended ? `<span class="chip acc">★ ${esc(t("arch.recommended"))}</span>` : ""}${o.simplest || o.kind === "none" ? chip(t("ds.simplest"), "ok") : ""}${o.rung ? chip(o.rung) : ""}${chip(t("akind." + o.kind))}</div>
      <p class="small">${esc(o.summary)}</p>
      ${arr(o.day).length ? `<ol class="dayline">${o.day.map(d => `<li><span class="mono small">${esc(d.time)}</span><span>${esc(d.text)}</span></li>`).join("")}</ol>${o.effortDay ? `<p class="small"><b>${esc(t("ds.costs"))}:</b> ${esc(o.effortDay)}</p>` : ""}` : ""}
      <details class="small"><summary>${esc(t("ds.scores"))}</summary><div class="kv">${keys.map(k => `<dt>${esc(t("score." + k))}</dt><dd>${scoreBar(num((o.scores || {})[k], 3))}</dd>`).join("")}</div>${arr(o.pros).length ? `<p style="color:var(--ok)">+ ${esc(o.pros.join(" · "))}</p>` : ""}${arr(o.cons).length ? `<p style="color:var(--crit)">− ${esc(o.cons.join(" · "))}</p>` : ""}</details>
      <div class="row">${o.id === a.chosen && !a.chosenAssumed ? `<span class="chip ok">${ic("check")}${esc(t("ds.yours"))}</span>` : `<button class="btn sm ${o.id === a.recommended ? "primary" : ""}" data-a="arch-choose" data-id="${esc(o.id)}">${esc(t("ds.choose"))}</button>`}</div>
    </article>`).join("")}</div>
    ${a.why ? `<div class="grid2"><div class="panel flat"><h4>${esc(t("arch.why"))}</h4><p>${esc(a.why)}</p></div><div class="panel flat"><h4>${esc(t("arch.changemind"))}</h4><p>${esc(a.changeMind)}</p></div></div>` : ""}`;
}

/* keys 1–9 choose the numbered design option (the choice is one action with Undo) */
KEY_HOOKS.push((e, p) => {
  if (!/^[1-9]$/.test(e.key) || UI.home || UI.finish || p.focus.ph !== "arch" || !document.querySelector(".optcards")) return false;
  const btn = document.querySelectorAll(".optcard")[num(e.key) - 1]; const b = btn && btn.querySelector("[data-a=arch-choose]"); if (!b) return false;
  e.preventDefault(); b.click(); return true;
});
/* ---------- Build: try the brief on your examples ---------- */
async function aiExRun(p, n = 3){
  const secs = arr(p.pkg.sections); if (!secs.length){ toast(t("rev.needpkg"), "err"); return 0; }
  const src = goalOf(p).examples.filter(e => str(e.input).trim() && exSrc(e) !== "run" && (e.verdict === "good" || e.verdict === "bad" || e.golden)).slice(-n);
  if (!src.length){ toast(t("xr.need"), "err"); return 0; }
  let made = 0;
  for (const e of src){
    const out = await runAI("ex-run", t("xr.running", {i: made + 1, n: src.length, id: e.id}), agentTranscriptPrompt(p, {input: str(e.input), simulated: ""}, secs), {pid: p.id, json: false, step: "test", fresh: true});
    if (out == null) break;
    if (!made) snapshot(p, t("a141.exrun"));
    newExample(p, {input: str(e.input), output: str(out), by: "pt", src: "run", srcRef: e.id, draft: p.versionNo, files: clone(arr(e.files))}); made++;
    touch(p); render();
  }
  if (made) logAct(p, t("xr.done", {n: made, v: p.versionNo}), {step: "build", important: true});
  return made;
}
function exRunPanel(p){
  if (!arr(p.pkg.sections).length) return "";
  const g = goalOf(p), runs = g.examples.filter(e => exSrc(e) === "run"), open = runs.filter(e => !e.verdict).length;
  const can = g.examples.filter(e => str(e.input).trim() && exSrc(e) !== "run" && (e.verdict === "good" || e.verdict === "bad" || e.golden)).length;
  return `<section class="panel" id="exrun">${head(t("xr.title"), t("xr.sub"))}
    <div class="row">${aiBtn("xr-run", t("xr.go", {n: Math.min(3, can)}), "M", {primary: can > 0 && !runs.length, key: "ex-run", attrs: can ? "" : "disabled"})}${open ? `<button class="btn sm" data-a="xr-judge">${esc(t("xr.judge", {n: open}))}</button>` : ""}<span class="hint">${esc(can ? t("xr.cost", {n: Math.min(3, can)}) : t("xr.need"))}</span></div>${busyHTML("ex-run")}
    ${runs.length ? `<div class="list">${runs.slice(-6).reverse().map(e => `<div class="item"><span class="iid mono">${esc(e.id)}</span><div class="body">${clampHTML(str(e.output), "xr:" + e.id, {lines: 3, cls: "small prew"})}<span class="small muted">${esc(t("xr.from", {e: e.srcRef || "", v: e.draft || ""}))}</span></div>${verdictCtl("ex-grade", `data-id="${esc(e.id)}"`, e.verdict, {size: "xs"})}</div>`).join("")}</div>` : ""}
  </section>`;
}

/* ---------- Release & run: real results become examples ---------- */
function realPanel(p){
  return `<section class="panel" id="real14">${head(t("rl.title"), t("rl.sub"))}
    <textarea id="rl-in" rows="5" placeholder="${esc(t("rl.ph"))}"></textarea>
    <div class="row">${verdictCtl("rl-verdict", "", UI.rlV || "")}<button class="btn sm primary" data-a="rl-add">${ic("plus")}${esc(t("rl.add"))}</button><span class="hint">${esc(t("rl.hint"))}</span></div></section>`;
}

/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  "pc-make": () => { const p = curP(); costGuard(p, "problem", () => aiProblemCards(p)); },
  "pc-grade": el => { const p = curP(); const c = problemOf(p).cards.find(x => x.id === el.dataset.id); if (!c) return; c.verdict = c.verdict === el.dataset.v ? "" : el.dataset.v; if (typeof skillEvidence === "function") skillEvidence(p, "problem"); touch(p); render(); },
  "pc-tons": el => { const p = curP(); const c = problemOf(p).cards.find(x => x.id === el.dataset.id); if (!c) return; p.northStar.problem = c.text; markRef(p, "ns", "edited"); markDownstream(p, "ns"); logDecision(p, t("ns.problem"), c.text, t("pc.fromcard")); touch(p); render(); toastUndo(t("pc.tonsdone")); },
  "ds-make": () => { const p = curP(); costGuard(p, "arch-stories", () => aiArchStories(p)); },
  "xr-run": () => { const p = curP(); const n = Math.min(3, goalOf(p).examples.filter(e => str(e.input).trim() && exSrc(e) !== "run" && (e.verdict || e.golden)).length); costGuard(p, "ex-run", () => aiExRun(p, 3), n * 3); },
  "xr-judge": () => { UI.boardF = "run"; goRef("exboard"); },
  "rl-verdict": el => { UI.rlV = UI.rlV === el.dataset.v ? "" : el.dataset.v; const ta = $("#rl-in"); const keep = ta ? ta.value : ""; render(); const t2 = $("#rl-in"); if (t2) t2.value = keep; },
  "rl-add": () => { const p = curP(); const txt = str(($("#rl-in") || {}).value).trim(); if (!txt){ toast(t("rl.need"), "err"); return; }
    const parts = txt.split(/\n\s*(?:---+|===+)\s*\n|\n{3,}/).map(s => s.trim()).filter(Boolean).slice(0, 20); let n = 0;
    for (const s of parts){ newExample(p, {input: "", output: s, verdict: UI.rlV || "", by: "you", src: "real", draft: p.live ? p.live.v : p.versionNo}); n++; }
    UI.rlV = ""; logAct(p, t("rl.added", {n}), {step: "operate", important: true}); touch(p); render(); toastUndo(t("rl.added", {n})); }
});
ACT_NO.add("rl-verdict"); ACT_NO.add("xr-judge");
