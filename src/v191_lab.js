/* ===================== 1.9.1 second opinion from another lab: a check row, the key's place in Settings, the review inside the GitHub build =====================
   PLAN-1.9 A; PLAN-1.8 video round 1 (cross-lab review as a check row), 2 (must-fix / unsure / overthinking, no review loop), 7 (alternate labs).
   1. The row "Second opinion from another lab" (lab2) is a gate of every tool with the honest assessment both ways; PT's ★ is "apply"
      where a mistake hurts others or costs money (others use it, it acts outward, it handles money) and "skip" otherwise; the cost per
      review is an estimate in CHF (the provider bills the owner's key, outside the Claude plan). It is tapped like every row (O4a) —
      for tools other people use too, because it spends money outside the plan (never applied without a tap).
   2. It works only where a key exists, and only in the GitHub build (firnlab/tools): the key lives only in GitHub's secret store.
      Settings › General (kit defaults, "Building blocks") says "Second-lab key: not added" or "added in GitHub as SECOND_LAB_API_KEY
      (provider: …)"; the owner sets it by hand. PT has no field for a key, never asks for one and never sees one: the setting only
      records that the owner added it and which provider it is. Without it the row says why and cannot be applied (it is not a row you
      tap, not in the queue, not counted; failing features stay off).
   3. Applied and the key marked: the build brief (PART R) and the GitHub build issue tell the build to run the review and record it in
      the build report as reviews: [{lab, week, findings: [{text, judged: must-fix|unsure|overthinking, fixed}], residual}]. The builder
      judges each finding; only agreed must-fix are fixed; unsure → one more opinion, then residual risk; never a review loop; the lab
      alternates week by week where the key reaches more than one lab. A build through the runner skips it ("only in GitHub builds"),
      and the row and the Build page say so.
   4. PT shows the reviews of a build report next to it (Release) and the newest on the row. */
const LAB2_PROVIDERS = [["openai", "OpenAI", ["OpenAI"]], ["google", "Google", ["Google"]], ["mistral", "Mistral", ["Mistral"]], ["xai", "xAI", ["xAI"]], ["openrouter", "OpenRouter", ["OpenAI", "Google"]]];
const LAB2_JUDGED = ["must-fix", "unsure", "overthinking"];
CHK_GATES.push("lab2");

/* ---------- 0. the key's record (never the key), the week's lab ---------- */
function lab2Prov(id){ return LAB2_PROVIDERS.find(x => x[0] === id) || null; }
function lab2ProvName(id){ const P = lab2Prov(id); return !P ? "" : P[2].length > 1 ? t("lab2.prov.multi", {x: P[1], y: P[2].join(", ")}) : P[1]; }
/** the owner marked SECOND_LAB_API_KEY as added in GitHub, with its provider */
function lab2Set(){ const s = WS && WS.settings && WS.settings.lab2; return s && typeof s === "object" && s.key === "github" && lab2Prov(str(s.provider)) ? s : null; }
/** ISO week (labs alternate week by week) */
function lab2Week(ms = Date.now()){
  const d = new Date(ms), u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), day = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - day);
  const y = u.getUTCFullYear(), w = Math.ceil(((u - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return {y, w, label: y + "-W" + String(w).padStart(2, "0")};
}
function lab2Lab(s = lab2Set(), ms = Date.now()){ const P = s ? lab2Prov(str(s.provider)) : null; return P ? P[2][lab2Week(ms).w % P[2].length] : ""; }
/** the review runs for this tool: the key is marked and you applied the row */
function lab2On(p){ return !!p && !!lab2Set() && chkActive(p) && (chkRowOf(p, "lab2") || {}).v === "apply"; }
/** the tool was built through background runs (the runner has no key): no review there */
function lab2ByRunner(p){ const r = p && p.report; return !!r && r.via === "runner" && num(r.draft, -1) === num(p.versionNo, -2); }

/* ---------- 1. the row ---------- */
function lab2Hurts(S){ const w = []; if (S && S.shared) w.push(t("lab2.ev.shared")); if (S && S.out) w.push(t("lab2.ev.out", {x: S.out})); if (S && S.money) w.push(t("lab2.ev.money")); return w; }
{ const orig = chkApplies; chkApplies = function(p, id, S){
    if (id !== "lab2") return orig.apply(this, arguments);
    if (!lab2Set()) return {ok: false, why: t("lab2.off.nokey")};   // without the key it is no check here (chkList shows it as an off row)
    return {ok: true, ev: lab2Hurts(S).join(" · ") || t("lab2.ev.none")}; }; }
{ const orig = chkPtStar; chkPtStar = function(p, x){
    if (!x || x.id !== "lab2") return orig.apply(this, arguments);
    const w = lab2Hurts(chkSignals(p));
    return w.length ? {v: "apply", why: t("lab2.star.yes", {x: w.join(", ")})} : {v: "skip", why: t("lab2.star.no")}; }; }
/** the off row, out of the pruned list; the review spends money outside the plan, so even a tool other people use taps it */
{ const orig = chkList; chkList = function(p){
    const v = orig.apply(this, arguments);
    if (!v || !Array.isArray(v.rows)) return v;
    const i = arr(v.pruned).findIndex(x => x && x.id === "lab2"); if (i >= 0) v.off = v.pruned.splice(i, 1);
    const x = v.rows.find(y => y.id === "lab2");
    if (x && x.fixed){ const r = chkRowOf(p, "lab2"); x.fixed = false; x.state = r && (r.v === "apply" || r.v === "skip") ? r.v : "open"; }
    return v; }; }
{ const orig = chkSet; chkSet = function(p, id, v){ if (id === "lab2" && v === "apply" && !lab2Set()){ toast(t("lab2.cant"), "err"); return false; } return orig.apply(this, arguments); }; }
/** a tool other people use: an open row waits in the queue too (not blocking: its other gates apply as before) */
{ const orig = kitQueue; kitQueue = function(p, add){
    orig(p, add);
    if (!p || !lab2Set() || !chkActive(p) || !chkShared(p)) return;
    const r = chkRowOf(p, "lab2"); if (r && (r.v === "apply" || r.v === "skip")) return;
    const x = chkList(p).rows.find(y => y.id === "lab2"); if (!x) return;
    add({kind: "chk", ref: "chk:lab2", ph: "review", cls: "should", who: "you", hard: false, tier: "wait", noAuto: true, title: t("chk.q", {x: chkName("lab2")}), why: chkStar(p, x).why}); }; }
/** the cost of one review: tokens of the diff and the acceptance lines, at frontier-model prices (an estimate; the provider's list decides) */
function lab2Cost(p){
  const len = arr(p && p.pkg && p.pkg.sections).reduce((n, s) => n + str(s && s.content).length, 0) + arr(p && p.tests).length * 400 + 6000;
  const inTok = Math.round(len / 4 * 2) + 2000, outTok = 4000, up = x => Math.max(0.05, Math.ceil(x * 20) / 20);
  return {k: Math.round(inTok / 1000), a: up((inTok * 2 + outTok * 8) / 1e6), b: up((inTok * 15 + outTok * 60) / 1e6 * 2), m: Math.max(2, Math.min(20, Math.round(inTok / 4000) + 2))};
}
function lab2CostLine(p){ const c = lab2Cost(p), s = lab2Set(); return t("lab2.cost", {a: c.a.toFixed(2), b: c.b.toFixed(2), k: c.k, p: s ? lab2Prov(s.provider)[1] : t("lab2.prov.any"), m: c.m}); }
{ const orig = chkCostLine; chkCostLine = function(p, x){ return x && x.id === "lab2" ? lab2CostLine(p) : orig.apply(this, arguments); }; }
/** what the row adds: where it runs, this week's lab, a runner build, the newest review */
function lab2RowExtra(p){
  const s = lab2Set(); if (!s) return "";
  const W = lab2Week(), R = lab2Reviews(p.report && p.report.raw), last = R[R.length - 1];
  const L = [`<span class="small muted">${esc(t("lab2.only"))} ${esc(t("lab2.week", {w: W.label, x: lab2Lab(s)}))}</span>`];
  if (lab2ByRunner(p) && lab2On(p)) L.push(`<span class="small warn-t lab2-runner">${esc(t("lab2.runner"))}</span>`);
  if (last) L.push(`<span class="small">${esc(lab2RevLine(last))}</span>`);
  return L.join("");
}
{ const orig = chkRowHTML; chkRowHTML = function(p, x){
    const h = orig.apply(this, arguments);
    if (!x || x.id !== "lab2") return h;
    let add = ""; try{ add = lab2RowExtra(p); }catch(e){ onAppError(e && e.message, "lab2:row"); }
    const i = h.lastIndexOf('</div><div class="qacts">');
    return add && i >= 0 ? h.slice(0, i) + add + h.slice(i) : h; }; }
/** without the key: one row that says why, with nothing to tap */
function lab2OffRowHTML(p){
  const x = {id: "lab2", gate: true, ev: "", floor: false, fixed: false, state: "off"}, star = chkStar(p, x), name = chkName("lab2");
  return `<div class="item chk-row chk-off" data-anchor="chk:lab2" id="chk-lab2">${stSlot("todo", t("lab2.st.off"))}<div class="body">
      <div class="row" style="gap:6px"><b>${esc(name)}</b><span class="chip">${esc(t("lab2.st.off"))}</span></div>
      <span class="small warn-t lab2-off">${esc(t("lab2.off.nokey"))}</span>
      <span class="small"><b>${esc(t("chk.helps"))}</b> ${esc(t("chk.h.lab2"))}</span>
      <span class="small"><b>${esc(t("chk.costs"))}</b> ${esc(lab2CostLine(p))}</span>
      <span class="small muted">${esc(t("lab2.off.star", {x: t("chk.o." + star.v), y: star.why}))}</span>
    </div></div>`;
}
{ const orig = chkPanel; chkPanel = function(p){
    const h = orig.apply(this, arguments);
    try{
      if (!h || !chkActive(p) || !arr(chkList(p).off).length) return h;
      const start = h.indexOf('<div class="list">'); if (start < 0) return h;
      let end = h.length; for (const m of ['<details class="chk-pruned"', '<div class="stack chk-repeat"', '<div class="stack chk-residual"', "</section>"]){ const k = h.indexOf(m, start); if (k >= 0 && k < end) end = k; }
      const close = h.lastIndexOf("</div>", end); if (close < start) return h;
      return h.slice(0, close) + lab2OffRowHTML(p) + h.slice(close);
    }catch(e){ onAppError(e && e.message, "lab2:panel"); return h; } }; }

/* ---------- 2. the brief (PART R), the GitHub build issue, the Build page ---------- */
function lab2BriefPart(p){
  const s = lab2Set(), P = lab2Prov(s.provider), W = lab2Week(), lab = lab2Lab(s), next = lab2Lab(s, Date.now() + 7 * 86400000);
  const alt = P[2].length > 1 ? `Labs alternate week by week: this is ISO week ${W.label}, so this week's reviewer is ${lab} (next week: ${next}).` : `Only one other lab is behind this key (${lab}): it reviews every week; the alternation starts when the key reaches a second lab.`;
  return `\nPART R · SECOND-LAB REVIEW (only in the GitHub build; Firnlab 1.9.1)
Run this part only when you are the GitHub build workflow in ${buildRepo()} and the repository secret SECOND_LAB_API_KEY is available to this run (provider: ${P[1]}). Never print, log, echo, commit or write the key anywhere; use it only in the request to the provider. In any other build (Prompt Translator's background runner, a chat, a laptop): skip this part, write "reviews": [] and "reviewSkipped": "only in GitHub builds" into the build report, and go on.
${alt}
1. After every check in PART A passed and before you open the pull request, send the reviewer the diff of this build and PART C (the acceptance lines), nothing else (no key, no personal data). Ask for findings only: what is wrong, unsafe or missing, each with where and why.
2. Judge every finding yourself: "must-fix" (it breaks an acceptance line, a security or accessibility floor, or loses data), "unsure", or "overthinking" (style, taste, or a risk the requirements already accept).
3. Fix only the must-fix findings you agree with, then run the affected checks again. Never send the fixes back for another review: there is no review loop.
4. For each "unsure" finding ask one more opinion, once (the other lab behind the key if it has one, otherwise a fresh Claude session without your notes). Still unsure: do not fix it; write it under "residual" with why.
5. Record it in the build report: "reviews": [{"lab": "${lab}", "week": "${W.label}", "findings": [{"text": "…", "judged": "must-fix|unsure|overthinking", "fixed": true|false}], "residual": ["…"]}]. The provider bills each call to the owner's key (its spending limit is set at the provider): one review of the diff, plus at most one more opinion per unsure finding.`;
}
{ const orig = buildBriefText; buildBriefText = function(p){ const s = orig.apply(this, arguments); return lab2On(p) ? s + lab2BriefPart(p) : s; }; }
{ const orig = buildIssue; buildIssue = function(p){
    const r = orig.apply(this, arguments);
    if (!r || !lab2On(p)) return r;
    const s = lab2Set(), line = ` This build runs the second-lab review of PART R with the repository secret SECOND_LAB_API_KEY (provider: ${lab2Prov(s.provider)[1]}): never print or log the key, record the review in the report.`;
    const ins = b => { const i = str(b).indexOf("\n\n"); return i < 0 ? str(b) + line : b.slice(0, i) + line + b.slice(i); };
    r.body = ins(r.body);
    try{ const u = new URL(r.url); u.searchParams.set("body", ins(u.searchParams.get("body") || "")); r.url = u.toString(); }catch(e){ onAppError(e && e.message, "lab2:issue"); }
    return r; }; }
{ const orig = buildCard; buildCard = function(p){
    const h = orig.apply(this, arguments);
    if (!lab2On(p)) return h;
    const line = `<p class="small lab2-bld" data-anchor="lab2-build">${esc(t("lab2.bld", {x: lab2Lab()}))}</p>`;
    const i = h.lastIndexOf("</section>"); return i >= 0 ? h.slice(0, i) + line + h.slice(i) : h + line; }; }

/* ---------- 3. the reviews of a build report ---------- */
function lab2Reviews(rep){
  return arr(rep && rep.reviews).filter(r => r && typeof r === "object").slice(0, 6).map(r => ({lab: str(r.lab).slice(0, 60), week: str(r.week).slice(0, 12),
    findings: arr(r.findings).filter(f => f && str(f.text).trim()).slice(0, 40).map(f => ({text: str(f.text).slice(0, 400), judged: oneOf(str(f.judged).toLowerCase(), LAB2_JUDGED, "unsure"), fixed: f.fixed === true})),
    residual: arr(r.residual).map(x => str(typeof x === "string" ? x : x && x.text).trim()).filter(Boolean).slice(0, 20).map(s => s.slice(0, 400))}));
}
function lab2Count(r){ const c = {n: r.findings.length, m: 0, f: 0, u: 0, o: 0, open: 0}; for (const x of r.findings){ if (x.judged === "must-fix"){ c.m++; if (x.fixed) c.f++; else c.open++; } else if (x.judged === "unsure") c.u++; else c.o++; } return c; }
function lab2RevLine(r){ const c = lab2Count(r); return t("lab2.rev.line", {lab: r.lab || "—", w: r.week || "—", n: c.n, m: c.m, f: c.f, u: c.u, o: c.o}); }
function lab2ReviewsHTML(p){
  const rep = p && p.report, raw = (rep && rep.raw) || {}, R = lab2Reviews(raw), skipped = str(raw.reviewSkipped).trim();
  if (!R.length && !skipped && !lab2On(p)) return "";
  const one = r => { const c = lab2Count(r);
    return `<div class="stack lab2-r" style="gap:2px"><span class="small"><b>${esc(lab2RevLine(r))}</b></span>
      ${c.open ? `<span class="small warn-t">${esc(t("lab2.rev.unfixed", {n: c.open}))}</span>` : ""}
      ${r.findings.length ? `<details class="small"><summary>${esc(t("lab2.rev.findings", {n: r.findings.length}))}</summary><ul class="lab2-f">${r.findings.map(f => `<li data-judged="${esc(f.judged)}" data-fixed="${f.fixed ? 1 : 0}"><b>${esc(t("lab2.j." + f.judged.replace("-", "")))}</b> · ${esc(t(f.fixed ? "lab2.fixed" : "lab2.notfixed"))} — ${esc(f.text)}</li>`).join("")}</ul></details>` : ""}
      ${r.residual.length ? `<div class="small"><b>${esc(t("lab2.rev.res"))}</b><ul class="lab2-res">${r.residual.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>`; };
  const body = R.length ? R.map(one).join("") : `<span class="small ${skipped ? "muted" : "warn-t"}">${esc(skipped ? t("lab2.rev.skipped", {x: skipped}) : rep ? t("lab2.rev.none") : t("lab2.rev.later"))}</span>`;
  return `<div class="panel flat lab2-rev" data-anchor="lab2-reviews"><b>${esc(t("lab2.rev.title"))}</b>${rep && rep.draft ? `<span class="small muted">${esc(t("draft.n", {n: rep.draft}))}</span>` : ""}${body}</div>`;
}
{ const orig = phRelease; phRelease = function(p){
    let h = orig.apply(this, arguments);
    try{ const box = lab2ReviewsHTML(p), at = h.indexOf('id="publish14"'), end = at >= 0 ? h.indexOf("</section>", at) : -1;
      if (box && end >= 0) h = h.slice(0, end) + box + h.slice(end); }catch(e){ onAppError(e && e.message, "lab2:release"); }
    return h; }; }

/* ---------- 4. Settings › General (the kit defaults, "Building blocks"): the key's record ---------- */
function lab2SettingsHTML(){
  const s = lab2Set(), raw = (WS && WS.settings && WS.settings.lab2) || {}, prov = str(UI.lab2Prov || raw.provider), P = lab2Prov(prov);
  const opts = [["", t("lab2.set.pick")], ...LAB2_PROVIDERS.map(x => [x[0], lab2ProvName(x[0])])];
  const sel = `<select data-a-change="lab2-prov" aria-label="${esc(t("lab2.set.prov"))}">${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === prov ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
  const labs = P ? (P[2].length > 1 ? t("lab2.set.alt", {x: P[2].join(" · "), w: lab2Week().label, y: lab2Lab({provider: prov})}) : t("lab2.set.one", {x: P[2][0]})) : "";
  return `<div class="stack lab2-set" data-lab2="settings" style="gap:6px"><h4>${esc(t("lab2.set.title"))}</h4>
    <p class="small"><b class="lab2-state">${esc(s ? t("lab2.set.on", {p: lab2ProvName(s.provider)}) : t("lab2.set.none"))}</b></p>
    <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="fld" style="flex:1 1 14em"><span>${esc(t("lab2.set.prov"))}</span>${sel}</label>
      ${s ? `<button class="btn sm ghost" data-a="lab2-set" data-v="none">${esc(t("lab2.set.remove"))}</button>` : `<button class="btn sm" data-a="lab2-set" data-v="github">${ic("check")}${esc(t("lab2.set.add"))}</button>`}</div>
    ${labs ? `<p class="small muted">${esc(labs)}</p>` : ""}
    <p class="small muted">${esc(t("lab2.set.how", {r: buildRepo()}))}</p></div>`;
}
{ const orig = kitDefaultsHTML; kitDefaultsHTML = function(){ let c = ""; try{ c = lab2SettingsHTML(); }catch(e){ onAppError(e && e.message, "lab2:settings"); } return orig.apply(this, arguments) + c; }; }
function lab2Mark(v){
  const raw = (WS.settings && WS.settings.lab2) || {}, prov = str(UI.lab2Prov || raw.provider);
  if (v === "github" && !lab2Prov(prov)){ toast(t("lab2.set.needprov"), "err"); return false; }
  WS.settings.lab2 = {key: v === "github" ? "github" : "", provider: prov, at: now(), by: Store.isOwner !== false ? "owner" : "second"};
  UI.lab2Prov = ""; saveWs(); render();
  toast(t(v === "github" ? "lab2.set.saved" : "lab2.set.cleared", {p: lab2ProvName(prov)}), "ok");
  return true;
}
Object.assign(ACTIONS, {"lab2-set": el => lab2Mark(str(el.dataset.v))});
Object.assign(CHANGES, {"lab2-prov": el => { const v = str(el.value); if (lab2Set()){ if (lab2Prov(v)){ WS.settings.lab2 = Object.assign({}, WS.settings.lab2, {provider: v, at: now()}); saveWs(); } } else UI.lab2Prov = v; render(); }});
ACT_NO.add("lab2-set");   // a workspace setting, not a step of a tool
