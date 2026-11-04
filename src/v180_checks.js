/* ===================== 1.8 checks: lenses per tool (all seven preselected), check rows for private tools (O4a), fix until green (repeat stop, cap 5, residual risk), tests 3x / 5x outward, facts by type =====================
   Decided with the owner (PLAN-1.8 §5 and the rounds O1, O3, O4 reading (a), "tap every check"; 25 Oct – 1 Nov 2026).
   1. The quality areas (the review lenses) are ticked per tool, all preselected, stored with the project (p.checks.rows) and changeable
      per tool. Tools other people use keep Legal and Output & usability (with accessibility) as fixed floors.
   2. Private tools (the owner's or the second owner's): every lens and gate that applies is a row you tap, apply or skip. PT never applies
      or skips one by itself and there is no tap for all of them. Each row says why it helps this tool, what it costs (units, CHF,
      minutes, taps), when it is not needed, and PT's ★ with one line why. (2.0: your choice on another tool is no longer
      a ★ here: no carry-over between projects.) Checks that do not apply to this tool (audience, what it reads and does) are no rows at
      all; the panel names them in one folded line. A lens runs only once its row is applied; a gate (tests, attack drill) likewise.
      Tools other people use keep today's behaviour: everything starts ticked, the floors cannot be unticked.
   3. Fix until green: the fixer and its independent checker go round until the checker confirms; the same fix proposed twice stops and
      shows before → after; 5 rounds is the breaker and the fifth writes down the residual risk (v14_fix.js). "Fix automatically" goes
      round the same way in whole passes (v14_finish.js calls fixNextRound).
   4. Tests run 3 times, 5 for tools that act outward (send, post, publish, pay, order); a tool passes only when every run passes.
   5. Facts expire by type with an error budget: prices 20 days, platform 45, law and policy 180, everything else 90 (O1 replaces the
      single 90-day rule). A fact past its budget is not used, and PT says so where it would have been used: in every prompt, on the kit
      options (no ★ on a stale fact), in the research PT passes on, and on the Check page. */

const FIX_CAP = 5;            // the breaker: at most 5 rounds of fixing, the fifth writes down the residual risk
const CHK_TRIALS_OUT = 5;     // tests run 5 times for a tool that acts outward (TRIALS = 3 otherwise)
const CHK_GATES = ["tests", "drill"];
const CHK_FLOORS = ["legal", "ux"];   // fixed for tools other people use: Legal and Output & usability (accessibility)
DIFF_NESTED.add("checks");    // Undo compares p.checks part by part: one row at a time, never the whole object

/* ---------- what the tool is: the signals the rows are pruned and explained by ---------- */
const CHK_PERSONAL = /\b(personal|customers?|clients?|patients?|employees?|contacts?|address(es)?|health|salary|donors?|birthday|phone numbers?)\b|personen|kunde|mitarbeit|kontakt|adresse|gesundheit|個人|个人|客户|员工|联系|地址|健康|工资/i;
const CHK_WEB = /\b(web|websites?|internet|online|search|scrap\w*|crawl\w*|rss|feeds?|news)\b|webseite|internetseite|\bsuche|网站|网络|网页|搜索|新闻/i;
const CHK_MONEY = /\b(pay|payments?|prices?|pricing|invest\w*|finance|financial|money|revenue|profit|invoices?|budget|chf|usd|eur)\b|finanz|\bgeld\b|umsatz|gewinn|preis|rechnung|投资|财务|收入|价格|付款|预算/i;
const CHK_DATA = /\b(data|datasets?|database|records?|spreadsheets?|csv|lists?|tables?|history|inventory|catalog)\b|daten|liste|tabelle|verlauf|数据|表格|清单|历史/i;
const CHK_AGENT = /\b(agents?|subagents?|schedul\w*|automat\w*|daily|weekly|hourly|loops?|unattended|background)\b|täglich|wöchentl|stündl|智能体|自动|定时|每天|每周|后台/i;
/* acting outward (owner, 31 Oct 2026: send, post, publish, pay, order) — nouns and set phrases that only look like it are taken out first */
const CHK_OUT = /\b(send|sends|sending|sent|e-?mails? (?:to|out)|mail out|post|posts|posted|posting|publish|publishes|published|publishing)\b|\bpay(?:s|ing)? (?:for|the|a|an|invoices?|bills?|out)\b|\b(?:make|makes|making|send|sends|sending|process|processes|processing) payments?\b|\b(?:buy|buys|buying|purchase|purchases|purchasing) (?:the|a|an|it|them|new|more|from|online|items|products|tickets|stock|shares)\b|\b(?:place|places|placed|placing) (?:an |the |a )?orders?\b|\border(?:s|ed|ing)? (?:the|a|an|it|them|new|more|from|online|supplies|items|products|groceries|food|stock|tickets)\b|versend|verschick|\bsenden\b|\bsendet\b|veröffentlich|bezahl|bestellt?\b|bestellen|\bposten\b|发送|寄出|发布|发帖|支付|付款|购买|下单|订购/i;
const CHK_NOT_OUT = /\b(?:people|customers|users|buyers|visitors|they|someone|others|clients|readers|sellers)\b[^.,;:\n]{0,50}?\b(?:buy|purchase|order|pay|send|post|publish)\w*|\b(?:blog|news|forum|social[- ]media|linkedin|instagram|a|the|this|each|every|new|latest|my|your|old|past) posts?\b|\bsent to me\b/gi;
function chkOutText(p){
  const a = (p && p.arch) || {}, ns = (p && p.northStar) || {};
  return [ns.goal, ns.success, p && p.intake && p.intake.raw, ...arr(a.components).map(c => [c.role, c.outputs].join(" ")), ...arr(p && p.requirements).map(r => [r.title, r.then].join(" "))].map(str).join(" \n ").replace(CHK_NOT_OUT, " ");
}
/** the word that makes the tool act outward ("" when it does not) */
function chkOutward(p){ if (!p) return ""; const m = CHK_OUT.exec(chkOutText(p)); return m ? m[0].trim().toLowerCase() : ""; }
/** how often every test runs for this tool: 3, or 5 when it acts outward */
function chkTrials(p){ return chkOutward(p) ? CHK_TRIALS_OUT : TRIALS; }
function chkSignals(p){
  const txt = typeof proofText === "function" ? proofText(p) : "", s = typeof secPlan === "function" ? secPlan(p) : {reads: [], acts: []};
  const ai = arr(p.arch && p.arch.components).filter(c => c.kind === "ai" || c.kind === "hybrid").length;
  return {reads: s.reads.map(c => str(c.name)), acts: s.acts.map(c => str(c.name)), ai, out: chkOutward(p), shared: chkShared(p),
    personal: CHK_PERSONAL.test(txt), web: CHK_WEB.test(txt), money: CHK_MONEY.test(txt), data: CHK_DATA.test(txt), agent: ai >= 2 || CHK_AGENT.test(txt)};
}

/* ---------- the rows: which checks apply, their state, your earlier choice, PT's ★ ---------- */
function chkOf(p){ if (!p.checks || typeof p.checks !== "object") p.checks = {rows: []}; if (!Array.isArray(p.checks.rows)) p.checks.rows = []; return p.checks; }   // ok:field  checks is new in 1.8, made on first use (older projects have none); it is part of Undo and survives reload (e2e180_checks)
function chkRead(p){ return (p && p.checks) || {rows: []}; }
function chkRowOf(p, id){ return arr(chkRead(p).rows).find(r => r && r.id === id) || null; }
/** a tool other people use (customers, a team, or pages shared by default) keeps today's behaviour */
function chkShared(p){ const a = (p && p.audience) || {}; return a.customers === true || ["others", "customers", "team", "public"].includes(str(a.who)) || (typeof kitSettings === "function" && kitSettings().sharing === "shared"); }
function chkPrivate(p){ return !chkShared(p); }
function chkFloor(p, id){ return chkShared(p) && CHK_FLOORS.includes(id); }
/** rows exist once there is something to check: a first version, a design or a package (before that nothing changes) */
function chkActive(p){ return !!p && (typeof pgKitsReady === "function" ? pgKitsReady(p) : arr(p.arch && p.arch.components).length > 0); }
function chkName(id){ const l = LENSES.find(x => x.id === id); return l ? L(l) : t("chk.g." + id); }
/** apply · skip · open — a private tool's row is open until you tap it; a shared tool's row starts applied */
function chkState(p, id){
  if (chkFloor(p, id)) return "apply";
  const r = chkRowOf(p, id); if (r && (r.v === "apply" || r.v === "skip")) return r.v;
  return chkPrivate(p) ? "open" : "apply";
}
/** does a check apply to this tool at all (early pruning: the audience and what the tool reads and does) */
function chkApplies(p, id, S){
  const ev = [];
  if (S.reads.length) ev.push(t("chk.ev.reads", {x: S.reads.join(", ")}));
  if (S.acts.length) ev.push(t("chk.ev.acts", {x: S.acts.join(", ")}));
  const evOut = S.out ? t("chk.ev.out", {x: S.out}) : "";
  if (S.shared) return {ok: true, ev: t("chk.ev.shared")};
  switch (id){
    case "agent": return S.agent ? {ok: true, ev: S.ai >= 2 ? t("chk.ev.ai", {n: S.ai}) : t("chk.ev.sched")} : {ok: false, why: t("chk.pr.agent")};
    case "security": return S.reads.length || S.acts.length || S.personal || S.web || S.out ? {ok: true, ev: [...ev, evOut, S.personal ? t("chk.ev.personal") : "", S.web && !S.reads.length ? t("chk.ev.web") : ""].filter(Boolean).join(" · ")} : {ok: false, why: t("chk.pr.security")};
    case "legal": return S.personal || S.web || S.money ? {ok: true, ev: [S.personal ? t("chk.ev.personal") : "", S.web ? t("chk.ev.web") : "", S.money ? t("chk.ev.money") : ""].filter(Boolean).join(" · ")} : {ok: false, why: t("chk.pr.legal")};
    case "data": return S.data || S.web || S.reads.length ? {ok: true, ev: S.reads.length ? ev[0] : S.web ? t("chk.ev.web") : t("chk.ev.data")} : {ok: false, why: t("chk.pr.data")};
    case "drill": return S.reads.length || S.acts.length || S.web || S.out ? {ok: true, ev: [...ev, evOut].filter(Boolean).join(" · ") || t("chk.ev.web")} : {ok: false, why: t("chk.pr.drill")};
    case "tests": return {ok: true, ev: arr(p.tests).length ? t("chk.ev.tests", {n: arr(p.tests).length, k: chkTrials(p)}) : t("chk.ev.notests", {k: chkTrials(p)})};
    default: return {ok: true, ev: ""};
  }
}
/** every check of this tool: the rows (they apply) and the pruned ones (they do not, with the reason); kept for one render */
let CHK_CACHE = null;
function chkList(p){
  if (!chkActive(p)) return {rows: [], pruned: [], S: null};
  if (RENDERING && CHK_CACHE && CHK_CACHE.p === p) return CHK_CACHE.v;
  const S = chkSignals(p), rows = [], pruned = [];
  for (const id of [...LENSES.map(l => l.id), ...CHK_GATES]){
    const a = chkApplies(p, id, S), gate = CHK_GATES.includes(id);
    const x = {id, gate, ev: a.ev || "", floor: chkFloor(p, id), fixed: gate && S.shared, state: gate && S.shared ? "apply" : chkState(p, id)};
    if (a.ok) rows.push(x); else pruned.push(Object.assign(x, {why: a.why}));
  }
  const v = {rows, pruned, S};
  if (RENDERING) CHK_CACHE = {p, v};
  return v;
}
{ const orig = renderInner; renderInner = function(){ CHK_CACHE = null; try{ return orig.apply(this, arguments); } finally{ CHK_CACHE = null; } }; }
/* the tool's own words are read once per screen: the rows, the queue, the run count and the cost line all ask (cause 67, speed) */
let CHK_MEMO = null;
function chkMemo(p, k, fn){ if (!CHK_MEMO || !RENDERING || !p || typeof p !== "object") return fn(); let m = CHK_MEMO.get(p); if (!m) CHK_MEMO.set(p, m = Object.create(null)); return k in m ? m[k] : (m[k] = fn()); }
{ const orig = renderInner; renderInner = function(){ CHK_MEMO = new WeakMap(); try{ return orig.apply(this, arguments); } finally{ CHK_MEMO = null; } }; }
{ const orig = chkOutText; chkOutText = function(p){ return chkMemo(p, "txt", () => orig(p)); }; }
{ const orig = chkOutward; chkOutward = function(p){ return chkMemo(p, "out", () => orig(p)); }; }
{ const orig = chkSignals; chkSignals = function(p){ return chkMemo(p, "sig", () => orig(p)); }; }
function chkOpenRows(p, L0 = null){ return chkPrivate(p) ? (L0 || chkList(p)).rows.filter(x => x.state === "open" && !x.floor && !x.fixed) : []; }
/** is this lens part of the tool's review now (projects before the design behave as before: every lens) */
function chkLensOn(p, id, L0 = null){
  if (!chkActive(p)) return true;
  if (chkShared(p)) return chkState(p, id) !== "skip";
  return chkState(p, id) === "apply" && (L0 || chkList(p)).rows.some(x => x.id === id);
}
/** the lenses that are on for this tool, from one list of its checks */
function chkOnLenses(p, L0 = null){ const L1 = L0 || (chkActive(p) && chkPrivate(p) ? chkList(p) : null); return LENSES.map(l => l.id).filter(id => chkLensOn(p, id, L1)); }
/** is a gate (tests, attack drill) on: shared tools as before; private tools once its row is applied */
function chkGateOn(p, id, L0 = null){ if (!chkActive(p) || chkShared(p)) return true; return chkState(p, id) === "apply" && (L0 || chkList(p)).rows.some(x => x.id === id); }
/** PT's own ★: every quality area starts ticked (owner: all preselected); the gates by what the tool does */
function chkPtStar(p, x){
  if (x.id === "tests") return {v: "apply", why: chkOutward(p) ? t("chk.star.tests.out", {k: chkTrials(p), x: chkOutward(p)}) : t("chk.star.tests", {k: chkTrials(p)})};
  if (x.id === "drill") return {v: "apply", why: t("chk.star.drill")};
  return {v: "apply", why: t("chk.star.lens")};
}
/** the ★ shown: PT's own, from this tool alone. 2.0 (owner: "projects dont get other projects rules, never"): your choice on another tool
    is no longer carried over as a ★ or a "you chose this last time" line (that was a carry-over of another tool's choice as a suggestion) */
function chkStar(p, x){ const pt = chkPtStar(p, x); return {v: pt.v, why: pt.why, last: false, pt}; }
/** what a check costs: units of PT's weekly budget, minutes, CHF (it runs on your Claude plan) and taps */
function chkCost(p, x){
  if (x.id === "tests"){ const k = chkTrials(p), n = arr(p.tests).length; return {u: n ? testRunCost(p, k) : 10 * k * (TIER_WEIGHT.default * 2 + TIER_WEIGHT.complex), m: Math.max(1, Math.round((n || 10) * k * 3 * 15 / 60))}; }
  if (x.id === "drill") return {u: num(COST_EST.redteam, 8), m: 2};
  return {u: TIER_WEIGHT.complex, m: 1};
}
/** the person's tap: one Undo step, one decision line (for this tool only) */
function chkSet(p, id, v, {by = "you"} = {}){
  if (!p || !["apply", "skip"].includes(v) || chkFloor(p, id)) return false;
  const cur = chkRowOf(p, id); if (cur && cur.v === v) return true;
  actOpen(p, t("chk.act", {x: chkName(id), v: t("chk.o." + v)}));   // before the first write, so the tap is one Undo step
  const c = chkOf(p), row = {id, v, at: now(), by}, i = c.rows.findIndex(r => r && r.id === id);
  if (i >= 0) c.rows[i] = row; else c.rows.push(row);
  // a lens applied after this version's review has not looked at it yet: the review is due again (only that lens runs, see aiReview)
  if (v === "apply" && LENSES.some(l => l.id === id) && p.seal.review === p.versionNo && !chkRan(p, id)) p.seal = Object.assign({}, p.seal, {review: 0});
  if (v === "skip" && p.seal.review !== p.versionNo && !chkOnLenses(p).length) chkSeal(p);
  logDecision(p, t("chk.dec", {x: chkName(id)}), t("chk.o." + v), cur ? t("chk.dec.changed") : "");
  markRef(p, "chk:" + id, cur ? "changed" : "decided");
  logAct(p, t("chk.act", {x: chkName(id), v: t("chk.o." + v)}), {step: "review"});
  touch(p); actClose(p.id);
  return true;
}
/** which lenses looked at this version (a carried seal from 1.7 means all of them did) */
function chkRan(p, id){
  const r = chkRead(p).ran;
  if (!r) return p.seal.review === p.versionNo;   // sealed before 1.8: every lens ran
  return (r.v === p.versionNo || p.seal.review === p.versionNo) && arr(r.ids).includes(id);
}

/* ---------- the rows in the one queue (private tools), with their options ---------- */
function chkQueue(p, add){
  if (!chkActive(p)) return;
  // tier "wait" + noAuto: PT waits for you here; no auto-take of a ★ may answer a check row (owner, O4 reading (a))
  const L0 = chkList(p);
  if (chkPrivate(p)) for (const x of chkOpenRows(p, L0)) add({kind: "chk", ref: "chk:" + x.id, ph: "review", cls: "block", who: "you", hard: false, tier: "wait", noAuto: true, title: t("chk.q", {x: chkName(x.id)}), why: chkStar(p, x).why});
  // an outward tool whose tests ran 3 times needs 5 (the old rule asks only below 3)
  if (!chkGateOn(p, "tests", L0) || !arr(p.pkg.sections).length || !arr(p.tests).length) return;
  const lr = lastRun(p), k = chkTrials(p);
  if (lr && lr.versionNo === p.versionNo && !lr.incomplete && (lr.trials || 1) >= TRIALS && (lr.trials || 1) < k) add({kind: "test-run", ref: "test", ph: "test", cls: "block", who: "pt", title: t("chk.runs.need", {n: lr.trials || 1, k}), why: t("chk.runs.why", {k}), fix: "tests-run"});
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); chkQueue(p, add); }; }
/* what the queue says about reviews and tests follows the rows: a check that is not applied is not PT's work */
{ const orig = queueOf; queueOf = function(p){
    if (RENDERING && Q_CACHE && Q_CACHE.p === p) return Q_CACHE.q;
    const q = orig(p);
    if (!p || !chkActive(p)) return q;
    const L0 = chkList(p), lensOn = chkOnLenses(p, L0).length > 0, testsOn = chkGateOn(p, "tests", L0), k = chkTrials(p), out = chkOutward(p);   // a shared tool: both are on (today's behaviour)
    for (let i = q.length - 1; i >= 0; i--){
      const x = q[i];
      // no quality area applied (yet): the review is not PT's work; the open rows ask first, and skipping them all seals (chkSet)
      if (x.kind === "review" && !lensOn){ q.splice(i, 1); continue; }
      if (!["test-none", "test-run", "notest", "test-skip", "proof-tests"].includes(x.kind)) continue;
      // tests not applied (open or skipped): no run is asked for; failures of earlier runs stay
      if (!testsOn){ q.splice(i, 1); continue; }
      if (x.kind === "test-run"){ const lr = lastRun(p); if (lr && lr.versionNo === p.versionNo && !lr.incomplete && (lr.trials || 1) < k) x.title = t("chk.runs.need", {n: lr.trials || 1, k}); x.why = t("chk.runs.why", {k}) + (out ? " " + t("chk.runs.out", {x: out}) : ""); }
    }
    return q; }; }
{ const orig = qOptions; qOptions = function(p, x){
    if (x && x.kind === "chk"){ const id = str(x.ref).slice(4), r = chkList(p).rows.find(y => y.id === id); if (!r) return [];
      const s = chkStar(p, r);
      // one option per answer, never "batch": every check is its own tap (owner, 31 Oct 2026)
      return ["apply", "skip"].map(v => ({label: t("chk.o." + v), star: s.v === v, why: v === "apply" ? t("chk.h." + id) : t("chk.n." + id), run: () => chkSet(p, id, v)})); }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ return str(ref).startsWith("chk:") ? t("chk.ref", {x: chkName(str(ref).slice(4))}) : orig(p, ref, full); }; }
{ const orig = goRef; goRef = function(ref, o = {}){
    const p = curP();
    if (p && str(ref).startsWith("chk:")){
      if (typeof pgOn === "function" && pgOn(p)){ pgOpen(p, "review"); UI.flashRef = ref; UI.navRef = ref; UI.navTry = 0; render(); return; }   // pgOpen scrolls to the top: the row is brought into view by the render after it
      UI.home = false; UI.finish = null; setPhase("review"); UI.flashRef = ref; UI.navRef = ref; UI.navTry = 0; render(); return; }
    return orig(ref, o); }; }
/* the Check page shows the rows in their own panel; its "what you decide" block lists the rest */
{ const orig = pgYou; pgYou = function(p, id){ const L0 = orig(p, id); return id === "review" ? L0.filter(x => x.kind !== "chk") : L0; }; }

/* ---------- the panel: one row per check, with the honest assessment both ways ---------- */
function chkCostLine(p, x){ const c = chkCost(p, x); return t("chk.cost", {u: c.u, l: weekLeft(), m: c.m}); }
function chkRowHTML(p, x){
  const st = x.state, star = chkStar(p, x), name = chkName(x.id), locked = x.floor || x.fixed;
  const pill = st === "apply" ? `<span class="chip st-ok">${ic("check")}${esc(t("chk.st.apply"))}</span>` : st === "skip" ? `<span class="chip">${esc(t("chk.st.skip"))}</span>` : `<span class="chip warn">${esc(t("chk.st.open"))}</span>`;
  const btns = locked ? `<span class="small muted">${esc(t(x.floor ? "chk.floor" : "chk.fixed"))}</span>`
    : ["apply", "skip"].map(v => `<button class="btn xs ${st === v ? "on" : st === "open" && star.v === v ? "primary" : ""}" data-a="chk-set" data-id="${esc(x.id)}" data-v="${v}" aria-pressed="${st === v}">${st === "open" && star.v === v ? "★ " : ""}${esc(t("chk.o." + v))}</button>`).join("");
  const pass = x.id === "tests" ? chkPassLine(p) : "";
  return `<div class="item chk-row chk-${esc(st)}" data-anchor="chk:${esc(x.id)}" id="chk-${esc(x.id)}">${stSlot(st === "apply" ? "ok" : st === "skip" ? "todo" : "attn", t("chk.st." + st))}<div class="body">
      <div class="row" style="gap:6px"><b>${esc(name)}</b>${pill}${star.last ? `<span class="chip">${esc(t("chk.lastchip"))}</span>` : ""}</div>
      ${locked ? "" : `<span class="small chk-star">★ ${esc(t("chk.o." + star.v))} — ${esc(star.why)}</span>`}
      <span class="small"><b>${esc(t("chk.helps"))}</b> ${esc(t("chk.h." + x.id))}${x.ev ? " " + esc(t("chk.here", {x: x.ev})) : ""}</span>
      <span class="small"><b>${esc(t("chk.costs"))}</b> ${esc(chkCostLine(p, x))}</span>
      <span class="small"><b>${esc(t("chk.notneeded"))}</b> ${esc(t("chk.n." + x.id))}</span>
      ${star.last && star.pt.v !== star.v ? `<span class="small muted">${esc(t("chk.ptview", {x: t("chk.o." + star.pt.v), y: star.pt.why}))}</span>` : ""}${pass}
    </div><div class="qacts">${btns}</div></div>`;
}
function chkPanel(p){
  if (!chkActive(p)) return "";
  const L0 = chkList(p), priv = chkPrivate(p), open = L0.rows.filter(x => x.state === "open" && !x.floor && !x.fixed).length;
  const on = L0.rows.filter(x => x.state === "apply").length, skip = L0.rows.filter(x => x.state === "skip").length;
  const pruned = L0.pruned.length ? `<details class="chk-pruned"><summary class="small">${esc(t("chk.pruned", {n: L0.pruned.length}))}</summary><ul class="small">${L0.pruned.map(x => `<li><b>${esc(chkName(x.id))}</b> — ${esc(x.why)}</li>`).join("")}</ul></details>` : "";
  return `<section class="panel pg-checks" data-anchor="checks"><div class="row"><h3 style="flex:1 1 12em">${ic("shield")} ${esc(t("chk.panel.title"))}</h3><span class="small muted">${esc(t("chk.count", {a: on, s: skip, o: open}))}</span></div>
    <p class="small muted">${esc(t(priv ? "chk.sub.priv" : "chk.sub.shared"))}</p>
    ${open ? `<p class="small warn-t">${esc(t("chk.open", {n: open}))}</p>` : ""}
    <div class="list">${L0.rows.map(x => chkRowHTML(p, x)).join("")}</div>${pruned}${fixResidualHTML(p)}</section>`;
}
ACTIONS["chk-set"] = el => { const p = curP(); if (!p) return; if (chkSet(p, str(el.dataset.id), str(el.dataset.v))){ render(); toastUndo(t("chk.act", {x: chkName(str(el.dataset.id)), v: t("chk.o." + str(el.dataset.v))})); } };
{ const orig = pgBody; pgBody = function(p, id){ const h = orig(p, id); return id === "review" ? chkPanel(p) + h : h; }; }
/* the step view of the review: the same rows, and the lens chips are this tool's ticks (they were one list for every project) */
{ const orig = phReview; phReview = function(p){
    UI.lensSel = new Set(chkOnLenses(p));
    const h = orig(p);
    return (typeof pgOn === "function" && pgOn(p)) ? h : chkPanel(p) + h; }; }
CHANGES.lens = el => { const p = curP(), id = str(el.dataset.id);
  if (p && chkActive(p) && !chkFloor(p, id)){ chkSet(p, id, el.checked ? "apply" : "skip"); }
  else { if (el.checked) UI.lensSel.add(id); else UI.lensSel.delete(id); }
  render(); };

/* ---------- the review runs the lenses that are on; the seal counts those ---------- */
function chkSeal(p){
  const r = chkRead(p).ran, L0 = chkList(p), on = chkOnLenses(p, L0);
  if (!arr(p.pkg && p.pkg.sections).length) return false;
  if (!on.length && chkOpenRows(p, L0).some(x => !x.gate)) return false;
  if (on.length && !(r && r.v === p.versionNo && on.every(id => arr(r.ids).includes(id)))) return false;
  if (!on.length) chkOf(p).ran = {v: p.versionNo, ids: []};   // you skipped every quality area: sealed without a review, and a lens applied later runs
  p.reviewedVersion = p.versionNo; p.seal = Object.assign({}, p.seal, {review: p.versionNo});
  return true;
}
{ const orig = aiReview; aiReview = async function(p, lensIds, o = {}){
    if (!p || !chkActive(p)) return orig(p, lensIds, o);
    const L0 = chkList(p), onAll = chkOnLenses(p, L0), on = arr(lensIds).filter(id => onAll.includes(id)), c = chkRead(p).ran, lensOpen = chkOpenRows(p, L0).filter(x => !x.gate).length;
    // a review that was due again only because a lens was applied later runs that lens alone
    const run = !o.onlySections && p.seal.review !== p.versionNo && c && c.v === p.versionNo ? on.filter(id => !arr(c.ids).includes(id)) : on;
    if (!run.length){
      if (!on.length && lensOpen){ toast(t("chk.rev.tapfirst", {n: lensOpen}), "err"); return false; }
      if (!o.onlySections && chkSeal(p)){ touch(p); render(); }
      return true;
    }
    const done = await orig(p, run, o);
    if (done && !o.onlySections){ const q = liveP(p) || p, c2 = chkOf(q); c2.ran = {v: q.versionNo, ids: [...new Set([...(c2.ran && c2.ran.v === q.versionNo ? arr(c2.ran.ids) : []), ...run])]}; chkSeal(q); touch(q); render(); }
    return done; }; }
/* a seal carried to a new version by the recheck carries the lenses that ran with it */
{ const orig = aiSealRecheck; aiSealRecheck = async function(p, o = {}){
    const v0 = chkRead(p).ran;
    await orig(p, o);
    const q = liveP(p) || p;
    if (chkActive(q) && q.seal.review === q.versionNo && v0 && v0.v !== q.versionNo){ chkOf(q).ran = {v: q.versionNo, ids: arr(v0.ids)}; touch(q); } }; }
{ const orig = designPass; designPass = async function(p){
    const P = await orig(p);
    if (P && P.done && chkActive(p) && chkOpenRows(p).length && !P.stop){ P.stop = t("chk.pass.stop", {n: chkOpenRows(p).length}); render(); }
    return P; }; }

/* ---------- tests: 3 runs, 5 for a tool that acts outward; it passes only when every run passes ---------- */
{ const orig = aiRunTests; aiRunTests = async function(p, o = {}){ const k = chkTrials(p); return orig(p, Object.assign({}, o, o.trials === TRIALS && k > TRIALS ? {trials: k} : {})); }; }
{ const orig = testRunCost; testRunCost = function(p, trials){ return orig(p, trials == null ? chkTrials(p) : trials); }; }
{ const orig = stageChecks; stageChecks = function(p, sid){
    const C = orig(p, sid);
    if (sid === "prove"){ const x = C.find(c => c.id === "prv.tests"); if (x){ const lr = lastRun(p); x.ok = chkGateOn(p, "tests") ? !!(lr && lr.versionNo === p.versionNo && (lr.trials || 1) >= chkTrials(p) && !lr.incomplete) : chkState(p, "tests") === "skip"; }
      const y = C.find(c => c.id === "prv.review"); if (y && chkActive(p) && !chkOnLenses(p).length) y.ok = !chkOpenRows(p).some(z => !z.gate); }
    return C; }; }
/* a test or a review not applied by you is not planned by "Fix automatically" */
{ const orig = finishPlan; finishPlan = function(p, sid = null){
    const pl = orig(p, sid);
    if (p && chkActive(p) && !chkShared(p)){
      const L0 = chkList(p), testsOn = chkGateOn(p, "tests", L0), lensOn = chkOnLenses(p, L0).length > 0;
      const drop = g => (["tests-run", "gen-tests", "tests-missing", "proof-tests"].includes(g.fix) && !testsOn) || (["review-run", "seal-recheck"].includes(g.fix) && !lensOn);
      pl.groups = pl.groups.filter(g => !drop(g)); pl.units = pl.groups.reduce((n, g) => n + g.units, 0); }
    return pl; }; }
/** pass^k of the last run: every run of every test must pass */
function chkPassK(p){
  const lr = lastRun(p); if (!lr) return null;
  const k = chkTrials(p), res = arr(lr.results), fails = res.filter(x => x.userVerdict ? x.userVerdict === "fail" : x.pass !== true).length;
  return {k, trials: lr.trials || 1, runs: res.length, fails, current: lr.versionNo === p.versionNo, pass: lr.versionNo === p.versionNo && !lr.incomplete && (lr.trials || 1) >= k && res.length > 0 && fails === 0};
}
function chkPassLine(p){
  const x = chkPassK(p); if (!x) return `<span class="small muted">${esc(t("chk.pass.none", {k: chkTrials(p)}))}</span>`;
  const msg = x.pass ? t("chk.pass.ok", {n: x.runs, k: x.k}) : !x.current ? t("chk.pass.old") : x.trials < x.k ? t("chk.pass.few", {n: x.trials, k: x.k}) : t("chk.pass.bad", {f: x.fails, n: x.runs});
  return `<span class="small ${x.pass ? "ok-t" : "warn-t"}">${esc(msg)}</span>`;
}
/* the attack drill is due only once you applied it (a drill that runs by itself must not start on an open row) */
{ const orig = rtDue; rtDue = function(p){ return chkGateOn(p, "drill") && orig(p); }; }

/* ---------- fix until green: whole passes of "Fix automatically" (v14_finish.js calls this after each pass) ---------- */
/** a short fingerprint of what a pass works on: the blocking work PT can do and the text it changes */
function fixSig(p, allowed){
  const block = queueOf(p).filter(x => x.cls === "block" && x.who === "pt" && x.fix && (!allowed || allowed.includes(x.fix))).map(x => x.key).sort();
  const body = JSON.stringify([block, arr(p.pkg && p.pkg.sections).map(s => [s.id, s.content]), arr(p.requirements).map(r => [r.id, r.title, r.then]), arr(p.findings).map(f => [f.id, f.status]), arr(p.tests).map(x => [x.id, x.criteria])]);
  let h = 5381; for (let i = 0; i < body.length; i++) h = ((h << 5) + h + body.charCodeAt(i)) | 0;
  return {block, h: String(h)};
}
{ const orig = finishAutopilot; finishAutopilot = async function(p){
    const F = UI.finish;
    if (F){ const allowed = F.plan.groups.filter(g => g.on).map(g => g.fix); F.loop = {allowed, sigs: [fixSig(p, allowed).h], rounds: [], end: ""}; }
    return orig(p); }; }
/** after pass n: go round again (true) only while PT can still fix something that blocks, the pass changed something and the cap allows */
function fixNextRound(p, F, round){
  const L = F && F.loop; if (!L) return false;
  L.rounds.push({n: round, groups: F.plan.groups.filter(g => g.on).map(g => ({fix: g.fix, state: g.state}))});
  if (F.stop || UI.finish !== F){ L.end = "stopped"; return false; }
  const s = fixSig(p, L.allowed);
  if (!s.block.length){ L.end = "green"; return false; }
  if (L.sigs.includes(s.h)){ L.end = "repeat"; logAct(p, t("fix.loop.repeat", {n: round}), {important: true, kind: "fix"}); return false; }   // the pass changed nothing: the next would propose the same again
  L.sigs.push(s.h);
  if (round >= FIX_CAP){ L.end = "cap"; fixResidual(p, round); return false; }
  const next = finishPlan(p, F.stage).groups.filter(g => L.allowed.includes(g.fix));
  const units = next.reduce((n, g) => n + g.units, 0);
  if (!next.length){ L.end = "green"; return false; }
  if (units > weekLeft()){ L.end = "budget"; return false; }
  for (const g of next){ g.on = true; g.state = ""; }
  F.plan = Object.assign({}, F.plan, {groups: next, units});
  render();
  return true;
}
/** the fifth pass ends with what is still at risk, written down for you (kept with the tool, shown on the Check page) */
function fixResidual(p, rounds){
  const items = queueOf(p).filter(x => x.cls === "block").slice(0, 12).map(x => ({title: str(x.title), why: str(x.why), ref: str(x.ref)}));
  actOpen(p, t("fix.res.act", {n: rounds}), {by: "pt"});
  chkOf(p).residual = {at: now(), rounds, items};
  logAct(p, t("fix.res.log", {n: rounds, b: items.length}), {important: true, kind: "fix"});
  actClose(p.id);
}
function fixResidualHTML(p){
  const R = chkRead(p).residual, fs = arr(p.findings).filter(f => f.residual && OPEN_F.includes(f.status));
  const rep = arr(p.findings).filter(f => f.proposal && f.proposal.repeat && OPEN_F.includes(f.status) && (str(f.before) || str(f.after)));
  const diff = f => `<details><summary class="small">${esc(t("rev.beforeafter"))}</summary><div class="diff small">${lineDiff(str(f.before), str(f.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div></details>`;
  const repHTML = rep.length ? `<div class="stack chk-repeat" data-anchor="repeat" style="gap:4px"><b class="small warn-t">${esc(t("fix.rep.title"))}</b><ul class="small">${rep.map(f => `<li><button class="linkish" data-a="goto-ref" data-ref="finding:${esc(f.id)}">${esc(f.issue)}</button> — ${esc(str(f.proposal.note))}${diff(f)}</li>`).join("")}</ul></div>` : "";
  if (!(R && arr(R.items).length) && !fs.length) return repHTML;
  return repHTML + `<div class="stack chk-residual" data-anchor="residual" style="gap:4px"><b class="small warn-t">${esc(t("fix.res.title"))}</b>
    ${R && arr(R.items).length ? `<p class="small">${esc(t("fix.res.sub", {n: R.rounds, d: fmtDate(R.at)}))}</p><ul class="small">${R.items.map(x => `<li><button class="linkish" data-a="goto-ref" data-ref="${esc(x.ref)}">${esc(x.title)}</button>${x.why ? " — " + esc(x.why) : ""}</li>`).join("")}</ul>` : ""}
    ${fs.length ? `<ul class="small">${fs.map(f => `<li><button class="linkish" data-a="goto-ref" data-ref="finding:${esc(f.id)}">${esc(f.residual.text)}</button>${diff(f)}</li>`).join("")}</ul>` : ""}</div>`;
}
function fixLoopHTML(p, F){
  const L = F && F.loop; if (!L || !L.rounds.length) return "";
  const n = L.rounds.length, end = L.end || (F.step === "run" ? "running" : "");
  const msg = end === "running" ? t("fix.loop.running", {n: n + 1, c: FIX_CAP}) : t("fix.loop." + (["green", "repeat", "cap", "budget", "stopped"].includes(end) ? end : "green"), {n, c: FIX_CAP});
  return `<section class="panel fix-loop" data-anchor="fixloop"><p class="small ${end === "green" ? "ok-t" : end === "running" ? "" : "warn-t"}">${ic("bolt")} ${esc(msg)}</p>${end === "repeat" && F.startAt && F.step !== "done" && typeof pgChangeList === "function" ? pgChangeList(p, F.startAt) : ""}${end === "cap" ? fixResidualHTML(p) : ""}</section>`;
}
{ const orig = finishView; finishView = function(p){ const F = UI.finish, h = orig(p); return F && F.loop && UI.finish === F ? fixLoopHTML(p, F) + h : h; }; }

/* ---------- facts by type, with an error budget (O1, 31 Oct 2026) ---------- */
const FACT_BUDGET = {price: 20, platform: 45, policy: 180, other: 90};
function factBudget(type){ return FACT_BUDGET[type] || FACT_BUDGET.other; }
/** the type of a fact: given, or known from its source (the platform knowledge and the kit facts are platform facts) */
function factTypeOf(d, type = ""){ if (FACT_BUDGET[type]) return type; if (d && (d === KP_VERSION || d === KIT_CHECKED)) return "platform"; return "other"; }
{ const orig = factStale; factStale = function(d, type = ""){ const ty = factTypeOf(d, type); return ty === "other" ? orig(d) : factAge(d) > factBudget(ty); }; }
/** a fact may be used only within its budget */
function factUsable(d, type = ""){ return !!d && !factStale(d, type); }
{ const orig = factChip; factChip = function(d, label = "", type = ""){
    if (!d) return "";
    const ty = factTypeOf(d, type), stale = factStale(d, ty), n = factBudget(ty);
    return `<span class="chip ${stale ? "warn" : ""} fact" data-type="${esc(ty)}" title="${esc(t(stale ? "fact.t.stale" : "fact.t.ok", {n, x: t("fact.ty." + ty)}))}">${label ? esc(label) + " · " : ""}${esc(t("fact.checked", {d: fmtDay(d)}))}${stale ? " · " + esc(t("fact.notused")) : ""}</span>`; }; }
/** a research finding's type: platform findings, prices, law; the date it was checked is the research run's */
function factOfFinding(f, at){
  const tx = str(f && f.text);
  const type = f && f.kind === "platform" ? "platform" : /\b(chf|usd|eur|price|prices|pricing|costs?|fee|fees|per month|subscription)\b|\$\s?\d|€|preis|kosten|gebühr|价格|费用|收费/i.test(tx) ? "price" : /\b(law|legal|gdpr|ndsg|regulation|act|licen[cs]e|terms|policy|copyright)\b|gesetz|recht|lizenz|datenschutz|法律|法规|许可|条款|政策/i.test(tx) ? "policy" : "other";
  return {type, d: str((f && f.at) || at).slice(0, 10)};
}
function factResearchPast(p){
  const k = p && typeof pickRead === "function" ? pickRead(p) : null; if (!k || !k.research || !k.research.at) return [];
  return arr(k.findings).filter(f => f && f.screened && !f.flagged).filter(f => { const x = factOfFinding(f, k.research.at); return factStale(x.d, x.type); });
}
/** the facts PT relies on, each with its type and budget (the kit facts hold platform facts, prices and law) */
function factTyped(p){
  const out = [];
  for (const x of factList(p)){
    if (x.id === "kits"){ out.push(Object.assign({}, x, {type: "platform"}), {id: "kitprice", label: t("fact.kitprice"), d: x.d, type: "price"}, {id: "kitlaw", label: t("fact.kitlaw"), d: x.d, type: "policy"}); continue; }
    out.push(Object.assign({}, x, {type: x.id === "kp" || str(x.id).startsWith("plat:") ? "platform" : "other"}));
  }
  return out.map(x => Object.assign(x, {n: factBudget(x.type), past: factStale(x.d, x.type)}));
}
{ const orig = factsBlock; factsBlock = function(p){
    const F = factTyped(p), past = F.filter(x => x.past), rp = factResearchPast(p);
    return `<section class="panel pg-facts" data-anchor="facts"><div class="row"><h3 style="flex:1 1 12em">${ic("clock")} ${esc(t("fact.title"))}</h3><span class="small muted">${esc(t("fact.budgets", {a: FACT_BUDGET.price, b: FACT_BUDGET.platform, c: FACT_BUDGET.policy, d: FACT_BUDGET.other}))}</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap">${F.map(x => factChip(x.d, x.label, x.type)).join("")}</div>
      ${past.length ? `<p class="small warn-t">${esc(t("fact.pastlist", {x: past.map(x => x.label).join(", ")}))}</p>` : ""}
      ${rp.length ? `<p class="small warn-t">${esc(t("fact.research.past", {n: rp.length}))}</p>` : ""}</section>`; }; }
/** every prompt says which facts are past their budget and must not be used as facts */
function factPromptBlock(p){
  const F = factTyped(p), past = F.filter(x => x.past), en = {price: "prices", platform: "platform facts", policy: "law and policy", other: "other facts"};
  return `\n<honesty facts_checked="${KIT_CHECKED}" platform_knowledge="${KP_VERSION}" budget_days="price ${FACT_BUDGET.price}, platform ${FACT_BUDGET.platform}, law and policy ${FACT_BUDGET.policy}, other ${FACT_BUDGET.other}"${past.length ? ' past_budget="' + [...new Set(past.map(x => x.type))].join(",") + '"' : ""}>\nEvery legal, price and platform claim in the output names the date it was checked. Facts have an age budget by type: prices ${FACT_BUDGET.price} days, platform facts ${FACT_BUDGET.platform} days, law and policy ${FACT_BUDGET.policy} days, everything else ${FACT_BUDGET.other} days. A claim older than its budget, or with no date, is not used as a fact: write "re-check before you rely on it" with its date instead.${past.length ? "\nPAST THEIR BUDGET — do not use these as facts; where one would be used, say that it is past its age budget and must be checked again:\n" + past.map(x => `- ${en[x.type]} from the ${x.id === "kp" ? "platform knowledge" : x.id.startsWith("plat:") ? "platform check" : x.id === "research" ? "research" : "Firnlab kit facts"} (checked ${x.d}, budget ${x.n} days)`).join("\n") : ""} No legal claim is stated as settled law; where it is grey, say so and point to real legal advice. Numbers carry their source; estimates say "estimate".\n</honesty>`;
}
{ const i = KIT_PROMPT_PARTS.indexOf(honestyPromptBlock); if (i >= 0) KIT_PROMPT_PARTS[i] = factPromptBlock; else KIT_PROMPT_PARTS.push(factPromptBlock); }
/* a kit option whose platform facts are past their budget gets no ★ (PT does not recommend on a fact it may not use) and says why */
{ const orig = qOptions; qOptions = function(p, x){
    const O = orig(p, x);
    if (x && /^kit-/.test(str(x.kind)) && Array.isArray(O) && factStale(KIT_CHECKED, "platform")) for (const o of O){ if (o && !o.factPast){ o.factPast = true; o.star = false; o.why = (o.why ? o.why + " · " : "") + t("fact.option.past", {n: FACT_BUDGET.platform}); } }
    return O; }; }
/* research past its budget is left out of what PT passes on, and the prompt says so */
{ const orig = projectContext; projectContext = function(p, o = {}){
    const gone = factResearchPast(p);
    if (!gone.length || !p.pick) return orig(p, o);
    const all = p.pick.findings; p.pick.findings = all.filter(f => !gone.includes(f));
    try{ const s = orig(p, o); return (!o || !o.only || arr(o.only).includes("pick_research")) ? s + `\n<facts_past_budget>${gone.length} research findings are left out: they are past their age budget (prices ${FACT_BUDGET.price} days, platform ${FACT_BUDGET.platform}, law and policy ${FACT_BUDGET.policy}, other ${FACT_BUDGET.other}). Do not state them as facts; say that a re-check is needed where they would matter.</facts_past_budget>` : s; }
    finally{ p.pick.findings = all; } }; }
