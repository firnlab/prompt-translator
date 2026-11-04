/* ===================== 2.0 Part D: prompt tests, the Improve-PT loop, metrics =====================
   1. Prompt tests (p.ptest20, a record): for a project's final prompt (its package), PT runs up to five test inputs in ONE quick-tier call
      (the cost is on the button before the tap): the call answers each input as the tool would, following only the package, and says for
      each of the project's never / must entries whether the answer keeps it; code reads every answer for a never's key words in a sentence
      that is not a negation as well (a hit is a fail even when the call says it holds). No project rules go into the call as instructions
      to the tool: the test must show what the prompt itself does.
   2. Improve PT (WS.settings.ipt20): every report sent through "Improve PT" (header, rail, an error card, the chat's one tap) is kept in the
      workspace settings with its status (open / fixed in <version>). On a version change PT marks the reports whose ids are listed for that
      version in IMPROVE_FIXED as fixed and tells the owner once (a card in Settings › PT health and on the cockpit).
   3. Metrics (WS.settings.met20, never sent to Claude — no prompt or report reads them; saved with the workspace, so they are in "Export my data"): per project the questions PT showed, the
      questions it held back because they were answered before, the rule breaks it caught and repaired, the routes on the map, the time
      from the goal to the route decision; Settings › Metrics. */
const PT20_MAX = 5, PT20_RUNS = 5, PT20_PKG = 60000;
/* report ids fixed in a version (filled at release time from the Improve-PT inbox; ids only, never the words) */
const IMPROVE_FIXED = {"2.0.0": []};

/* ---------- 3. metrics (first: the other parts count into them) ---------- */
function m20MetOf(pid){ if (!WS || !WS.settings || !pid) return null; const S = WS.settings; if (!S.met20 || typeof S.met20 !== "object") S.met20 = {}; const M = S.met20[pid] = S.met20[pid] && typeof S.met20[pid] === "object" ? S.met20[pid] : {}; return M; }
function m20Metric(p, k, n = 1){ try{ const M = p && WS && WS._set ? m20MetOf(p.id) : null; if (!M || !n) return; M[k] = num(M[k], 0) + n; saveWs(); }catch(e){ onAppError(e && e.message, "metrics"); } }
function met20Row(p){
  const M = (WS.settings.met20 || {})[p.id] || {}, D = m20Decision(p);
  const g0 = str(M.goalAt || p.createdAt), d0 = D ? str(D.at) : "";
  const ms = g0 && d0 ? Date.parse(d0) - Date.parse(g0) : NaN;
  return {asked: num(M.asked, 0), twice: num(M.twice, 0), repaired: num(M.repaired, 0), routes: m20Read(p).routes.length, hands: num(M.hands, 0), ptests: num(M.ptests, 0), goalDec: Number.isFinite(ms) && ms >= 0 ? ms : null};
}
function met20Dur(ms){ if (ms == null) return t("met20.nodec"); const m = Math.round(ms / 60000); return m < 120 ? t("met20.min", {n: m}) : m < 2880 ? t("met20.h", {n: Math.round(m / 60)}) : t("met20.d", {n: Math.round(m / 1440)}); }
function met20HTML(){
  const ps = WS.projects.filter(p => p.status !== "archived");
  const rows = ps.map(p => { const R = met20Row(p); return `<tr data-pid="${esc(p.id)}"><th scope="row">${esc(p.name)}</th><td class="tnum">${R.asked}</td><td class="tnum">${R.twice}</td><td class="tnum">${R.repaired}</td><td class="tnum">${R.routes}</td><td>${esc(met20Dur(R.goalDec))}</td></tr>`; }).join("");
  return `<section class="panel met20" data-anchor="met20"><h3>${esc(t("met20.t"))}</h3><p class="small muted">${esc(t("met20.sub"))}</p>
    ${ps.length ? `<div class="met20-wrap"><table class="met20-t"><thead><tr><th scope="col">${esc(t("met20.c.p"))}</th><th scope="col">${esc(t("met20.c.asked"))}</th><th scope="col">${esc(t("met20.c.twice"))}</th><th scope="col">${esc(t("met20.c.rep"))}</th><th scope="col">${esc(t("met20.c.routes"))}</th><th scope="col">${esc(t("met20.c.time"))}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="small muted">${esc(t("met20.none"))}</p>`}
    <p class="small muted">${esc(t("met20.how"))}</p></section>`;
}
{ const orig = askOnceRun; askOnceRun = async function(p, items){
    const n = await orig.apply(this, arguments);
    try{ const L = arr(items).length; if (p && L){ m20Metric(p, "twice", num(n, 0)); m20Metric(p, "asked", Math.max(0, L - num(n, 0))); } }catch(e){ onAppError(e && e.message, "metrics:ask"); }
    return n; }; }
{ const orig = factsGuardHits; factsGuardHits = async function(p){
    const hits = await orig.apply(this, arguments);
    try{ if (p && arr(hits).length) m20Metric(p, "repaired", 1); }catch(e){ onAppError(e && e.message, "metrics:rules"); }
    return hits; }; }
{ const orig = goal20Confirm; goal20Confirm = function(p){
    const r = orig.apply(this, arguments);
    try{ const M = p && WS && WS._set ? m20MetOf(p.id) : null; if (M && !M.goalAt){ M.goalAt = now(); saveWs(); } }catch(e){ onAppError(e && e.message, "metrics:goal"); }
    return r; }; }

/* ---------- 1. prompt tests ---------- */
function pt20Read(p){ const X = p && p.ptest20 && typeof p.ptest20 === "object" ? p.ptest20 : {}; return {inputs: arr(X.inputs).map(str).filter(Boolean), runs: arr(X.runs)}; }
function pt20Of(p){ if (!p.ptest20 || typeof p.ptest20 !== "object") p.ptest20 = {}; const X = p.ptest20; X.inputs = arr(X.inputs); X.runs = arr(X.runs); return X; }
function pt20Pkg(p){ return arr(p && p.pkg && p.pkg.sections).filter(s => str(s.content).trim()).map(s => `--- ${str(s.id)} · ${str(s.title)} ---\n${str(s.content)}`).join("\n\n"); }
/** the inputs: your own first, then the project's tests (never / adversarial first), then examples */
function pt20Inputs(p){
  const own = pt20Read(p).inputs.map(text => ({text, src: "you"}));
  const ts = arr(p.tests).filter(x => str(x.input).trim()).sort((a, b) => (b.never || b.category === "adversarial" ? 1 : 0) - (a.never || a.category === "adversarial" ? 1 : 0)).map(x => ({text: str(x.input), src: "test", ref: x.id}));
  const ex = arr(p.goal && p.goal.examples).filter(e => str(e.input).trim()).map(e => ({text: str(e.input), src: "ex", ref: e.id}));
  const seen = new Set(), out = [];
  for (const x of [...own, ...ts, ...ex]){ const k = x.text.trim().toLowerCase(); if (seen.has(k)) continue; seen.add(k); out.push(x); if (out.length >= PT20_MAX) break; }
  return out;
}
function pt20InJSON(ins){ return ins.map((x, i) => ({i, text: x.text.slice(0, 2000)})); }   // ok:cut one test input stays short
function pt20Prompt(pkg, ins, rules){
  return `[[task:ptest-run]]
You test a finished prompt: the instructions of a person's Claude tool. For each input, first answer it exactly as the tool would, following ONLY the tool prompt below (it is the tool's whole setup). Then check that answer against each of the person's rules listed at the end (NEVER: the answer must not do, propose or assume it; MUST: the answer must do it, where the input calls for it) and say for each whether the answer keeps it. Be strict; a rule the input does not touch is kept.
<tool_prompt>
${pkg}
</tool_prompt>
<inputs>${JSON.stringify(pt20InJSON(ins))}</inputs>
<rules>${JSON.stringify(rules.map(e => ({id: e.id, kind: e.kind.toUpperCase(), rule: factText(e)})))}</rules>
Reply with only JSON: {"results":[{"i":0,"answer":"the tool's answer, at most 1200 characters","rules":[{"id":"F1","holds":true,"why":"one short sentence"}]}]}`;   // ok:cut one test input stays short
}
async function pt20Run(p){
  const pkg = pt20Pkg(p), ins = pt20Inputs(p), rules = factsActive(p, FACT_RULES);
  if (!pkg || !ins.length || !rules.length) return null;
  const ws0 = WS.id;
  const out = await runAI("ptest-run", t("pt20.busy", {n: ins.length}), pt20Prompt(pkg.slice(0, PT20_PKG), ins, rules), {pid: p.id, quick: true, fresh: true, validate: o => o && Array.isArray(o.results)});   // ok:cut the package is capped for one quick call
  const q = pickLive(p, ws0); if (!out || !q) return null;
  const nevers = rules.filter(e => e.kind === "never");
  const items = ins.map((x, i) => {
    const r = arr(out.results).find(y => y && num(y.i, -1) === i) || {}, ans = str(r.answer).slice(0, 1200);   // ok:cut the answer as the call gave it
    const code = new Set(factCodeHits(nevers, ans).map(h => h.e.id));
    const rs = rules.map(e => { const v = arr(r.rules).find(y => y && str(y.id) === e.id); const said = v ? v.holds !== false : null;
      return {id: e.id, kind: e.kind, rule: factText(e).slice(0, 200), ok: said !== false && !code.has(e.id), code: code.has(e.id), why: v ? str(v.why).slice(0, 240) : t("pt20.noverdict"), judged: said !== null}; });   // ok:cut short fields of the record
    return {i, input: x.text.slice(0, 400), src: x.src, ref: str(x.ref), answer: ans, rules: rs, pass: !!str(r.answer).trim() && rs.every(y => y.ok), empty: !str(r.answer).trim()};   // ok:cut the record keeps the start of the input
  });
  const run = {id: uid("pt"), at: now(), v: num(q.versionNo, 0), n: items.length, pass: items.filter(x => x.pass).length, items};
  const X = pt20Of(q); X.runs = [run, ...X.runs].slice(0, PT20_RUNS);
  m20Metric(q, "ptests", 1);
  rcpt20(q, t("pt20.done", {a: run.pass, b: run.n}), t("pt20.t")); touch(q); render();
  return run;
}
function pt20HTML(p){
  const pkg = pt20Pkg(p), ins = pt20Inputs(p), rules = factsActive(p, FACT_RULES), R = pt20Read(p), last = R.runs[0];
  const why = !pkg ? t("pt20.need.pkg") : !rules.length ? t("pt20.need.rules") : !ins.length ? t("pt20.need.in") : "";
  const srcW = {you: t("pt20.src.you"), test: t("pt20.src.test"), ex: t("pt20.src.ex")};
  const list = ins.length ? `<ol class="pt20-in small">${ins.map(x => `<li><span class="muted">${esc(srcW[x.src] || "")}${x.ref ? " " + esc(x.ref) : ""}</span> ${clampHTML(x.text, "pti:" + p.id + ":" + hashStr(x.text), {lines: 2})}${x.src === "you" ? ` <button class="iconbtn xs" data-a="pt20-del" data-v="${esc(x.text)}" aria-label="${esc(t("pt20.del"))}" title="${esc(t("pt20.del"))}">${ic("x")}</button>` : ""}</li>`).join("")}</ol>` : "";
  const res = last ? `<div class="pt20-res" data-run="${esc(last.id)}"><p class="small"><b>${esc(t("pt20.sum", {a: last.pass, b: last.n}))}</b> <span class="muted">· ${esc(fmtDate(last.at))} · ${esc(t("pt20.ver", {v: last.v}))}</span></p>
      <ul class="pt20-list">${arr(last.items).map(x => `<li class="pt20-it ${x.pass ? "ok" : "bad"}"><span aria-hidden="true">${x.pass ? "✓" : "✗"}</span> <span class="sr20">${esc(t(x.pass ? "pt20.pass" : "pt20.fail"))}</span><div class="body"><div class="small">${clampHTML(x.input, "ptr:" + last.id + ":" + x.i, {lines: 2})}</div>
        ${x.empty ? `<div class="small warn-t">${esc(t("pt20.empty"))}</div>` : `<details class="small"><summary>${esc(t("pt20.answer"))}</summary><div class="pt20-ans">${esc(x.answer)}</div></details>`}
        ${arr(x.rules).filter(r => !r.ok).map(r => `<div class="small warn-t">${esc(t(r.kind === "never" ? "pt20.broke.never" : "pt20.broke.must", {x: r.rule}))}${r.code ? " · " + esc(t("pt20.bycode")) : ""}${r.why ? " · " + esc(r.why) : ""}</div>`).join("")}</div></li>`).join("")}</ul></div>` : "";
  return `<section class="panel pt20" data-anchor="pt20"><h3>${ic("check")} ${esc(t("pt20.t"))}</h3><p class="small muted">${esc(t("pt20.sub"))}</p>
    ${list}<form class="row" data-form="pt20-add"><label class="fld" style="flex:1 1 16em"><span>${esc(t("pt20.add"))}</span><input type="text" id="pt20-in" autocomplete="off" placeholder="${esc(t("pt20.add.ph"))}"></label><button class="btn sm" type="submit" ${R.inputs.length >= PT20_MAX ? "disabled" : ""}>${ic("plus")}${esc(t("btn.add"))}</button></form>
    ${why ? `<p class="small muted pt20-why">${esc(why)}</p>` : `<div class="row">${aiBtn("pt20-run", t("pt20.run", {n: ins.length}), "L", {primary: true, key: "ptest-run"})}<span class="small muted">${esc(t("pt20.cost"))}</span></div>`}${busyHTML("ptest-run")}${res}</section>`;
}
{ const orig = factsViewHTML; factsViewHTML = function(p){ const h = orig.apply(this, arguments); let x = ""; try{ x = pt20HTML(p); }catch(e){ onAppError(e && e.message, "ptest:facts"); } return x ? h.replace(/<\/div>\s*$/, x + "</div>") : h; }; }
{ const orig = examplesTestPanel; examplesTestPanel = function(p){ const h = orig.apply(this, arguments); let x = ""; try{ x = pt20HTML(p); }catch(e){ onAppError(e && e.message, "ptest:test"); } return h + x; }; }
COST_EST["pt20-run"] = 1;

/* ---------- 2. the Improve-PT loop ---------- */
function ipt20List(){ return arr(WS && WS.settings && WS.settings.ipt20); }
function ipt20Add(x){
  if (!x || !x.id || !WS || !WS._set) return;
  const L = ipt20List(); if (L.some(y => y.id === x.id)) return;
  WS.settings.ipt20 = [{id: str(x.id), at: str(x.at) || now(), v: str(x.version) || PT_VERSION, where: str(x.where).slice(0, 160), text: str(x.text).slice(0, 400), status: str(x.status) === "fixed" ? "fixed" : "open"}, ...L].slice(0, 80);   // ok:cut the list keeps the start of a report
  saveWs();
}
/** on a version change: the reports listed as fixed up to this version are marked, and the owner is told once */
function ipt20Version(){
  if (!WS || !WS._set || str(WS.settings.ipt20v) === PT_VERSION) return 0;
  let n = 0; const ids = [];
  for (const [v, list] of Object.entries(IMPROVE_FIXED)){ if (verCmp(v, PT_VERSION) > 0) continue;
    for (const x of ipt20List()) if (arr(list).includes(x.id) && x.status !== "fixed"){ x.status = "fixed"; x.fixed = v; n++; ids.push(x.id); } }
  WS.settings.ipt20v = PT_VERSION;
  if (n) WS.settings.ipt20news = {v: PT_VERSION, n, ids, at: now()};
  saveWs();
  return n;
}
function ipt20NewsHTML(){
  const N = WS && WS.settings && WS.settings.ipt20news; if (!N || !N.n) return "";
  return `<section class="panel ipt20-news" data-ipt20="news" role="status"><p><b>${esc(t("ipt20.news", {n: N.n, v: N.v}))}</b></p><div class="row"><button class="btn sm" data-a="ipt20-see">${esc(t("ipt20.see"))}</button><button class="btn sm ghost" data-a="ipt20-ok">${ic("check")}${esc(t("ipt20.ok"))}</button></div></section>`;
}
function ipt20HTML(){
  const L = ipt20List(), open = L.filter(x => x.status !== "fixed").length;
  return `<section class="panel ipt20" data-anchor="ipt20"><h3>${ic("flag")} ${esc(t("ipt20.t"))}</h3><p class="small muted">${esc(t("ipt20.sub", {n: L.length, o: open}))}</p>${ipt20NewsHTML()}
    ${L.length ? `<ul class="ipt20-list">${L.slice(0, 40).map(x => `<li class="ipt20-it" data-id="${esc(x.id)}" data-st="${esc(x.status)}">${chip(x.status === "fixed" ? t("ipt20.fixed", {v: x.fixed || ""}) : t("ipt20.open"), x.status === "fixed" ? "ok" : "warn")} <span class="small">${clampHTML(x.text, "ipt:" + x.id, {lines: 2})}</span> <span class="small muted">· ${esc(fmtDate(x.at))} · ${esc(x.v)}${x.where ? " · " + esc(x.where) : ""}</span></li>`).join("")}</ul>` : `<p class="small muted">${esc(t("ipt20.none"))}</p>`}
    <div class="row"><button class="btn sm ghost" data-a="tool-report" data-k="ipt20">${ic("flag")}${esc(t("tr.improve"))}</button></div></section>`;
}
{ const orig = FORMS["tool-report"]; FORMS["tool-report"] = function(){
    const before = new Set(arr(WS.toolfb).map(x => x && x.id));
    const r = orig.apply(this, arguments);
    try{ for (const x of arr(WS.toolfb)) if (x && !before.has(x.id)) ipt20Add(x); }catch(e){ onAppError(e && e.message, "ipt20:add"); }
    return r; }; }
{ const orig = loadToolFeedback; loadToolFeedback = async function(){
    const r = await orig.apply(this, arguments);
    try{ const ws = WS && WS.name; for (const x of arr(WS.toolfb).slice().reverse()) if (x && (!x.ws || x.ws === ws)) ipt20Add(x); }catch(e){ onAppError(e && e.message, "ipt20:load"); }
    return r; }; }
{ const orig = openWorkspace; openWorkspace = async function(id){
    const r = await orig.apply(this, arguments);
    try{ if (UI.wsReady && !UI.fatal && WS.id === id && ipt20Version()) render(); }catch(e){ onAppError(e && e.message, "ipt20:version"); }
    return r; }; }
{ const orig = viewCockpit; viewCockpit = function(){ const h = orig.apply(this, arguments); let c = ""; try{ c = ipt20NewsHTML(); }catch(e){ onAppError(e && e.message, "ipt20:card"); } return c ? c + h : h; }; }

/* ---------- Settings: Metrics tab; the Improve list in PT health ---------- */
{ const orig = viewSettings; viewSettings = function(){
    let h = orig.apply(this, arguments);
    try{
      h = h.replace(/(<button class="tab[^"]*" data-a="tab" data-t="setTab" data-v="health">[\s\S]*?<\/button>)/, `$1<button class="tab ${UI.setTab === "setup20" ? "on" : ""}" data-a="tab" data-t="setTab" data-v="setup20">${esc(t("set.tab.setup20"))}</button><button class="tab ${UI.setTab === "metrics" ? "on" : ""}" data-a="tab" data-t="setTab" data-v="metrics">${esc(t("set.tab.metrics"))}</button>`);
      if (UI.setTab === "metrics") h = h.replace(/<section class="panel">([\s\S]*?)<\/section>/, met20HTML());
      if (UI.setTab === "setup20") h = h.replace(/<section class="panel">([\s\S]*?)<\/section>/, setup20HTML());
      if (UI.setTab === "health") h = h.replace(/(<\/section>)(?![\s\S]*<\/section>)/, "$1" + ipt20HTML());
    }catch(e){ onAppError(e && e.message, "settings20"); }
    return h; }; }

Object.assign(ACTIONS, {
  "pt20-run": () => { const p = curP(); if (p) costGuard(p, "pt20-run", () => pt20Run(p), 1); },
  "pt20-del": (el) => { const p = curP(); if (!p) return; const X = pt20Of(p), v = str(el.dataset.v); X.inputs = X.inputs.filter(x => x !== v); touch(p); render(); },
  "ipt20-ok": () => { if (!WS.settings.ipt20news) return; WS.settings.ipt20news = null; saveWs(); render(); },
  "ipt20-see": () => { WS.settings.ipt20news = null; saveWs(); UI.modal = null; UI.view = "settings"; UI.setTab = "health"; render(); setTimeout(() => { const e = document.querySelector(".ipt20"); if (e) e.scrollIntoView({block: "start"}); }, 0); }
});
Object.assign(FORMS, {
  "pt20-add": () => { const p = curP(); if (!p) return; const el = $("#pt20-in"), v = str(el && el.value).trim(); if (!v){ toast(t("pt20.add.need"), "err"); return; }
    const X = pt20Of(p); if (X.inputs.includes(v)) return; if (X.inputs.length >= PT20_MAX){ toast(t("pt20.max", {n: PT20_MAX}), "err"); return; }
    X.inputs.push(v.slice(0, 2000)); rcpt20(p, v, t("pt20.t")); touch(p); render(); focusSoon("pt20-in"); }   // ok:cut one test input
});
["ipt20-ok", "ipt20-see"].forEach(a => ACT_NO.add(a));
for (const k of ["ptest20", "hands20log"]) DIFF_SKIP.add(k);   // records, never part of an Undo

const V200L_CSS = `
.met20-wrap{overflow-x:auto;max-width:100%;position:relative}
.met20-t{border-collapse:collapse;width:100%;font-size:14px}
.met20-t th,.met20-t td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.met20-t td.tnum{text-align:right}
.pt20-in{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:2px}
.pt20-list,.ipt20-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.pt20-it{display:flex;gap:8px;align-items:flex-start;min-width:0}
.pt20-it .body{min-width:0;flex:1 1 auto;overflow-wrap:break-word}
.pt20-ans{white-space:pre-wrap;overflow-wrap:break-word;max-height:16em;overflow:auto}
.ipt20-it{display:flex;gap:6px;flex-wrap:wrap;align-items:baseline;min-width:0;overflow-wrap:break-word}
`;
function v200lCss(){ try{ if (document.getElementById("v200l-css")) return; const s = document.createElement("style"); s.id = "v200l-css"; s.textContent = V200L_CSS; document.head.appendChild(s); }catch(e){ onAppError(e && e.message, "v200l:css"); } }
v200lCss();
