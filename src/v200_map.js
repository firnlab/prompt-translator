/* ===================== 2.0 Part B: the goal card, the live solution map, the coverage engine, deciding, tripwires, proven routes =====================
   The owner (2–3 Nov 2026): "Claude says that's all, but there is more", "show me all solutions, simple to frontier, and what is not possible
   yet", "PT also shows previous solutions that worked and offers them next to and the same like all other solutions", "projects dont get
   other projects rules, never". Independent design §2–§3 (sample: the clickable PT 2.0 sample).
   1. The goal card (p.goal20): outcome, for whom, the situation, success sign, where it must work, budget; per field "said by you" or
      "PT's guess — confirm"; your rules come from the facts book. Versioned (G1, G2 …); a change on a project with a map first shows its
      effect on the map (one quick-tier call: which routes rise, fall or drop out, and your chosen route) and applies only on "Apply"
      (a restore point before it).
   2. The map (p.map20, one field of the project, so a change is one write): routes with the 28 fields of §3.2 in 8 groups, statuses
      Possible today / With your work / With a helper / Not possible yet / Blocked by your rule (computed: a route that breaks an active
      never or must of the facts book stays visible, greyed, with the rule), the Not-possible-yet lane (why, how it could become possible,
      who could, what PT watches, closest today), map events (every round, correction and change as a visible diff).
   3. The coverage engine: six fixed lenses as separate calls (buy it; build with Claude; change the process, no tool; cheapest hack;
      frontier; inversion), each asked for unusual answers too (how typical each is); merged by code (bigram similarity) plus one
      quick-tier check for the unclear pairs; a red-team call finds gaps, explains empty grid cells and breaks routes (corrections are map
      events); the saturation record is on screen ("Searched N rounds · last round … · cells covered · likely still undiscovered: about …",
      a Chao1-style rough number); the stopping rule (2 rounds in a row with 0 new and every cell covered or explained → "searched to
      saturation on <date>", the button stays). Calls only on your tap, at most 2 at a time, the cost named before a multi-call action.
   4. Deciding: ☆ shortlist (max 3), ✕ Not for me with a reason (fed into the next round), Compare (same rows folded, the best marked with
      text), the full card, Prove it (one short check of the riskiest load-bearing assumption, cost first), Take this → a decision record
      (why, compared with, rejected and why, tripwires "we switch if …", cost of switching, why not a higher-ceiling route), a restore point
      before it, the decision in the facts book.
   5. Tripwires and the Route alert: a new fact, a failed test or a serious review finding that contradicts a load-bearing assumption or a
      tripwire of the chosen route (code for your rules, one quick-tier call for the rest, at most one per action) raises a card: what
      broke, how bad, what still stands, what carries over (route-neutral vs route-bound details), repair / look at the map again / keep
      and accept the risk / later.
   6. Map chat: the chips Missing any? · Higher ceiling? · Easier? · What breaks …? · Tell me everything you haven't shown, and a question
      in your words; each runs the matching lens or red-team call and shows a map diff card, never prose alone.
   7. Proven routes (workspace library, WS.settings.lib20): a route enters only after its project reached Launch, as an allow-listed
      template (family, rung, generic pattern, where it runs, actor kinds, a generic recipe, measured outcome, date); never the project's
      goal, facts, rules, decisions, requirements, people, data or names (a text that holds any of them is left out). On another project's
      map it stands next to the others with a "Worked before" badge and is re-checked against that project's own rules. */
const M20_LENSES = ["buy", "build", "process", "hack", "frontier", "inversion"];
const M20_STATUS = ["today", "work", "helper", "notyet", "blocked"];
const M20_WHERE = ["phone", "web", "desktop", "cloud", "local", "person"];
const M20_HOW = ["buy", "build", "combine"];
const M20_CELLS = M20_WHERE.flatMap(w => M20_HOW.map(h => w + ":" + h));
const M20_REJ = ["cost", "work", "trust", "rule", "other"];
const M20_GOAL = ["outcome", "whom", "situation", "success", "where", "budget"];
const M20_MAX = {routes: 60, notyet: 20, events: 40, rounds: 30, lib: 40, alerts: 20};
const M20_DIG = [["buy", "frontier"], ["process", "inversion"], ["build", "hack"], ["inversion", "frontier"], ["hack", "buy"], ["process", "build"]];
const M20_SEC = 22;   // seconds per default-tier lens call (measured: a 20-route map in 36 s; a lens asks for 4–6 routes)
const M20RUN = {pid: null, done: 0, total: 0, keys: [], label: "", stop: false};

/* ---------- 0. the data ---------- */
function m20Blank(){ return {v: 1, routes: [], notyet: [], rounds: [], cells: {}, short: [], rej: {}, chosen: null, decs: [], alerts: [], events: [], neutral: [], tags: {}, libChecked: false, looked: false, satAt: null, seenAt: null, nextR: 1, nextN: 1}; }
function m20Read(p){
  const M = p && p.map20 && typeof p.map20 === "object" ? p.map20 : null, B = m20Blank();
  if (!M) return B;
  const o = Object.assign(B, M);
  for (const k of ["routes", "notyet", "rounds", "short", "decs", "alerts", "events", "neutral"]) o[k] = arr(o[k]);
  for (const k of ["cells", "rej", "tags"]) o[k] = o[k] && typeof o[k] === "object" ? o[k] : {};
  return o;
}
function m20Of(p){ if (!p.map20 || typeof p.map20 !== "object") p.map20 = m20Blank(); const M = p.map20, B = m20Blank(); for (const k of Object.keys(B)) if (M[k] === undefined) M[k] = B[k]; return M; }   // ok:field the map's own default (read with m20Read everywhere)
function m20Route(p, id){ return m20Read(p).routes.find(r => r.id === id) || m20Read(p).notyet.find(r => r.id === id) || null; }
function m20Chosen(p){ const M = m20Read(p); return M.chosen ? M.routes.find(r => r.id === M.chosen) || null : null; }
function m20Decision(p){ return m20Read(p).decs.filter(d => d.status === "active").slice(-1)[0] || null; }
function m20Event(p, kind, text, {add = [], fix = [], cause = ""} = {}){
  const M = m20Of(p); M.events.unshift({id: uid("me"), at: now(), kind, text: str(text), add: arr(add), fix: arr(fix), cause});
  M.events = M.events.slice(0, M20_MAX.events);
}

/* ---------- 1. the goal card ---------- */
function goal20Read(p){
  const G = p && p.goal20 && typeof p.goal20 === "object" ? p.goal20 : null, ns = (p && p.northStar) || {};
  if (G) return {v: num(G.v, 1), f: Object.assign({}, G.f || {}), by: Object.assign({}, G.by || {}), noNevers: !!G.noNevers, skip: !!G.skip, hist: arr(G.hist), pend: G.pend || null};
  const f = {outcome: str(ns.goal), whom: str(ns.users), situation: str(ns.problem), success: str(ns.success), where: "", budget: ""}, by = {};
  for (const k of M20_GOAL) if (str(f[k]).trim()) by[k] = "pt";
  return {v: 1, f, by, noNevers: false, skip: false, hist: [], pend: null};
}
function goal20Of(p){ if (!p.goal20 || typeof p.goal20 !== "object"){ const G = goal20Read(p); p.goal20 = {v: G.v, f: G.f, by: G.by, noNevers: false, skip: false, hist: [], pend: null}; } return p.goal20; }   // ok:field the card starts from the north star (read with goal20Read everywhere)
function goal20Open(p){ const G = goal20Read(p); const open = ["outcome", "whom", "success"].filter(k => !(G.by[k] === "you" && str(G.f[k]).trim())); if (!factsActive(p, ["never"]).length && !G.noNevers) open.push("nevers"); return open; }
function goal20Clear(p){ return !goal20Open(p).length; }
/** the north star follows the card (one picture of the goal everywhere) */
function goal20Sync(p){ const G = goal20Of(p), ns = p.northStar = p.northStar || {}; if (str(G.f.outcome).trim()) ns.goal = G.f.outcome; if (str(G.f.whom).trim()) ns.users = G.f.whom; if (str(G.f.success).trim()) ns.success = G.f.success; if (str(G.f.situation).trim() && !str(ns.problem).trim()) ns.problem = G.f.situation; }   // ok:field the north star exists on every project
function goal20Confirm(p, k){ const G = goal20Of(p); if (!str(G.f[k]).trim()) return; G.by[k] = "you"; goal20Sync(p); rcpt20(p, t("g20.f." + k) + ": " + G.f[k], t("g20.where")); touch(p); }
/** a new version of the card; the old one stays in its history */
function goal20Apply(p, f, {why = ""} = {}){
  const G = goal20Of(p), ch = M20_GOAL.filter(k => k in f && str(f[k]).trim() !== str(G.f[k]).trim());
  if (!ch.length) return [];
  G.hist.push({v: G.v, f: clone(G.f), by: clone(G.by), at: now(), why}); G.hist = G.hist.slice(-20);
  for (const k of ch){ G.f[k] = str(f[k]).trim(); G.by[k] = "you"; }
  G.v++; G.pend = null; goal20Sync(p);
  if (m20Read(p).routes.length){
    m20Event(p, "goal", t("g20.ev", {v: G.v, x: ch.map(k => t("g20.f." + k)).join(", ")}));
    const D = m20Decision(p); if (D && ch.some(k => arr(D.fields).includes(k) || ["outcome", "whom", "success"].includes(k))){ D.recheck = {at: now(), v: G.v, fields: ch}; }
  }
  rcpt20(p, ch.map(k => t("g20.f." + k) + ": " + G.f[k]).join(" · "), t("g20.where.v", {v: G.v}));
  return ch;
}
/** a change on a project with a map: first its effect on the map (one quick call), applied only on "Apply" */
async function goal20Propose(p, f){
  const G = goal20Of(p), ch = M20_GOAL.filter(k => k in f && str(f[k]).trim() !== str(G.f[k]).trim());
  if (!ch.length){ toast(t("g20.same"), ""); return null; }
  const M = m20Read(p);
  if (!M.routes.length){ snapshot(p, t("g20.act")); goal20Apply(p, f); touch(p); render(); return null; }
  G.pend = {f: Object.fromEntries(ch.map(k => [k, str(f[k]).trim()])), at: now(), effects: null}; touch(p); render();
  const ws0 = WS.id;
  const prompt = buildPrompt("map-goalfit", {proj: p, rules: [], context: "",
    body: `The person wants to change their goal card. Say for each route on their map what the change does to it: "rise" (fits better), "fall" (fits worse), "out" (no longer reaches the goal) or "same", with one short reason.
<goal_now>${JSON.stringify(Object.fromEntries(ch.map(k => [k, str(G.f[k])])))}</goal_now>
<goal_new>${JSON.stringify(G.pend.f)}</goal_new>
<routes>${jsonFit(M.routes.map(r => ({id: r.id, name: r.name, what: r.line, fit: r.fitN})), 60000, x => x.id)}</routes>`,
    schema: `{"effects":[{"id":"R1","e":"rise|fall|out|same","why":"one short sentence"}]}`});
  const r = await runAI("map-goalfit", t("g20.busy"), prompt, {quick: true, validate: o => o && Array.isArray(o.effects)});
  const q = pickLive(p, ws0); if (!q) return null;
  const P = goal20Of(q).pend; if (!P) return null;
  P.effects = r ? arr(r.effects).filter(e => e && m20Read(q).routes.some(x => x.id === str(e.id))).map(e => ({id: str(e.id), e: oneOf(str(e.e), ["rise", "fall", "out", "same"], "same"), why: str(e.why)})) : [];
  P.failed = !r;
  touch(q); render();
  return P;
}
function goal20Take(p){
  const G = goal20Of(p), P = G.pend; if (!P) return;
  snapshot(p, t("g20.act"), {restore: true});
  const M = m20Of(p);
  for (const e of arr(P.effects)){ const r = M.routes.find(x => x.id === e.id); if (!r) continue;
    if (e.e === "rise") r.fitN = Math.min(5, num(r.fitN, 3) + 1); if (e.e === "fall") r.fitN = Math.max(0, num(r.fitN, 3) - 1);
    if (e.e === "out") r.goalOut = {why: e.why, v: G.v + 1}; else delete r.goalOut;
    if (e.e !== "same") r.corr = arr(r.corr).concat({at: now(), text: t("g20.corr." + e.e, {x: e.why})}); }
  goal20Apply(p, P.f, {why: "map"});
  touch(p); render();
}

/* ---------- 2. routes: normalise what an AI step proposed, the status, your rules ---------- */
const M20_FIT_F = ["outcome", "whom", "success", "where", "budget", "situation"];
function m20Lvl(x){ return Math.max(1, Math.min(4, Math.round(num(x, 2)))); }
function m20Norm(x, {lens = "", round = 0} = {}){
  if (!x || typeof x !== "object" || !str(x.name).trim()) return null;
  const S = (v, n = 600) => str(v).replace(/\s+/g, " ").trim().slice(0, n), L = (v, n = 6, k = 300) => arr(v).map(y => S(typeof y === "object" && y ? y.text || y.step || "" : y, k)).filter(Boolean).slice(0, n);   // ok:cut field caps of an AI answer, not shown text
  const fit = arr(x.fit).filter(f => f && typeof f === "object").map(f => ({f: oneOf(str(f.f), M20_FIT_F, "outcome"), v: oneOf(str(f.v), ["yes", "part", "no"], "part"), why: S(f.why, 240)})).slice(0, 8);
  const fitN = fit.length ? Math.round(5 * fit.reduce((n, f) => n + (f.v === "yes" ? 1 : f.v === "part" ? 0.5 : 0), 0) / fit.length) : Math.max(0, Math.min(5, Math.round(num(x.fitN, 3))));
  const A = x.actors && typeof x.actors === "object" ? x.actors : {};
  const m = x.money && typeof x.money === "object" ? x.money : {};
  return {name: S(x.name, 80), fam: S(x.fam, 60) || t("m20.fam.other"), line: S(x.line, 300), day: L(x.day, 5), lvl: m20Lvl(x.lvl), lvlWhy: S(x.lvlWhy, 200), typical: Math.max(0, Math.min(1, num(x.typical, 0.5))),
    fit, fitN, notv: S(x.notv, 300), actors: {claude: S(A.claude, 300), hands: S(A.hands, 300), helper: S(A.helper, 300), you: S(A.you, 300), others: S(A.others, 300)},
    setupMin: Math.max(0, Math.round(num(x.setupMin, 0))), weeklyMin: Math.max(0, Math.round(num(x.weeklyMin, 0))),
    helper: x.helper && typeof x.helper === "object" && str(x.helper.name).trim() ? {name: S(x.helper.name, 60), does: S(x.helper.does, 200), effort: S(x.helper.effort, 100), perms: S(x.helper.perms, 200)} : null,
    first: S(x.first, 60), money: {once: S(m.once, 40), monthly: S(m.monthly, 40), perUse: S(m.perUse, 60), who: S(m.who, 80), free: S(m.free, 160)}, usage: S(x.usage, 160),
    risks: arr(x.risks).filter(r => r && str(r.text).trim()).slice(0, 3).map(r => ({text: S(r.text, 200), l: oneOf(str(r.l), ["low", "medium", "high"], "medium"), i: oneOf(str(r.i), ["low", "medium", "high"], "medium")})),
    assume: L(x.assume, 5, 240).map((a, i) => ({id: "a" + (i + 1), text: a, checked: "", at: ""})),
    lock: S(x.lock, 240), rev: S(x.rev, 240), maint: S(x.maint, 240), data: S(x.data, 300), logins: S(x.logins, 200),
    status: oneOf(str(x.status), ["today", "work", "helper", "notyet"], "work"), conf: oneOf(str(x.conf), ["high", "medium", "low"], "low"), evidence: S(x.evidence, 300) || t("m20.ev.reason"),
    where: oneOf(str(x.where), M20_WHERE, "web"), how: oneOf(str(x.how), M20_HOW, "build"), up: S(x.up, 120), down: S(x.down, 120),
    pattern: S(x.pattern, 80), recipe: L(x.recipe, 6, 160), aiBreaks: arr(x.breaks).map(b => str(b).trim()).filter(Boolean).slice(0, 6), lenses: lens ? [lens] : [], found: {lens, round}, corr: [], at: now()};
}
function m20NormNy(x){
  if (!x || typeof x !== "object" || !str(x.name).trim()) return null;
  const S = (v, n = 300) => str(v).replace(/\s+/g, " ").trim().slice(0, n);   // ok:cut field caps of an AI answer
  return {name: S(x.name, 80), why: S(x.why), blocker: oneOf(str(x.blocker), ["platform", "law", "vendor", "model", "device", "cost", "never"], "platform"), evidence: S(x.evidence) || t("m20.ev.reason"),
    sure: oneOf(str(x.sure), ["high", "medium", "low"], "medium"), change: S(x.change), who: oneOf(str(x.who), ["anthropic", "vendor", "law", "community", "you"], "vendor"), watch: S(x.watch), near: S(x.near, 120), at: now()};
}
function m20Text(r){ return [r.name, r.line, ...arr(r.day), r.notv, ...Object.values(r.actors || {}), r.helper ? r.helper.name + " " + r.helper.does : "", r.data, r.logins, ...arr(r.recipe)].map(s => str(s).trim().replace(/[.!?。]+$/, "")).filter(Boolean).join(". "); }
function m20Breaks(p, r){ return arr(r.breaks).filter(b => { const e = factById(p, b.id); return e && e.status === "active" && FACT_RULES.includes(e.kind); }); }
function m20Status(p, r){ return m20Breaks(p, r).length ? "blocked" : r.goalOut ? "notyet" : oneOf(r.status, M20_STATUS, "work"); }
/** your rules on every route: code finds the sentences, one quick-tier call confirms the unclear ones (cached), a confirmed one greys the route */
async function m20RulesCheck(p, routes){
  const rules = factsActive(p, FACT_RULES); if (!rules.length || !routes.length){ for (const r of routes) r.breaks = []; return 0; }
  let hits = [];
  try{ hits = await factsGuardHits(p, rules, {found: routes.map(r => m20Text(r))}); }catch(e){ onAppError(e && e.message, "map:rules"); }
  let n = 0;
  for (const r of routes){
    const txt = m20Text(r), mine = hits.filter(h => txt.includes(h.s)), ai = arr(r.aiBreaks).filter(id => rules.some(e => e.id === id));
    const b = [...mine.map(h => ({id: h.e.id, rule: factText(h.e), s: h.s})), ...ai.filter(id => !mine.some(h => h.e.id === id)).map(id => ({id, rule: factText(factById(p, id)), s: ""}))];
    const was = arr(r.breaks).length; r.breaks = b; if (b.length && !was) n++;
  }
  return n;
}

/* ---------- 3. the coverage engine ---------- */
function m20Cost(calls){ return {n: calls, min: Math.max(1, Math.ceil(Math.ceil(calls / 2) * M20_SEC / 60))}; }
function m20Coverage(p){
  const M = m20Read(p), all = [...M.routes, ...M.notyet], cov = new Set();
  for (const r of M.routes) cov.add(r.where + ":" + r.how);
  for (const c of Object.keys(M.cells)) if (M.cells[c] && M.cells[c].why) cov.add(c);
  const lensesDone = new Set(M.rounds.flatMap(r => arr(r.lenses)).filter(l => M20_LENSES.includes(l))).size;
  const f1 = M.routes.filter(r => arr(r.lenses).length === 1).length, f2 = M.routes.filter(r => arr(r.lenses).length === 2).length;
  const est = M.rounds.length < 2 ? null : Math.round(f1 * (f1 - 1) / (2 * (f2 + 1)));   // Chao1 (bias-corrected): routes found by one call only vs by two; meaningless after one round
  const last = M.rounds[M.rounds.length - 1] || null, prev = M.rounds[M.rounds.length - 2] || null;
  const covered = M20_CELLS.filter(c => M.routes.some(r => r.where + ":" + r.how === c)).length, explained = M20_CELLS.filter(c => !M.routes.some(r => r.where + ":" + r.how === c) && M.cells[c] && M.cells[c].why).length;
  return {rounds: M.rounds.length, last, lastNew: last ? last.newN : null, lastCorr: last ? last.corrN : 0, covered, explained, cells: M20_CELLS.length, cellsOpen: M20_CELLS.length - covered - explained,
    est, lensesDone, n: all.length, sat: !!(last && prev && last.newN === 0 && prev.newN === 0 && M20_CELLS.length - covered - explained === 0)};
}
const M20_LENS_FRAME = {
  buy: "BUY IT: existing products, apps and services that reach the goal as they are, or with settings.",
  build: "BUILD IT WITH CLAUDE: claude.ai pages (artifacts), Projects, scheduled runs, agents, PT's hands in the desktop app (open pages, fill forms, click buttons that are not final), a local helper program the person installs.",
  process: "CHANGE THE PROCESS, NO TOOL: a person, a habit, an agreement, a setting on a device the people already own.",
  hack: "CHEAPEST HACK THAT WORKS TOMORROW: the smallest, crudest thing that reaches the goal with what exists today, even if it is ugly.",
  frontier: "FRONTIER: what the best-equipped team in 2026 would do: agents, local helpers, hands, new devices; also what is not possible yet and why.",
  inversion: "INVERSION: what would make the goal unnecessary, or reach it from the other side (the other person's side, the vendor's side, the device maker's side)."
};
const M20_SCHEMA = `{"found":[{"name":"at most 5 words","fam":"a family (a group of similar routes)","line":"what you get, one line","day":["3-5 short steps of a day with it: who does what, what appears (results only, never a question to the person)"],"lvl":"1 simple … 4 frontier","lvlWhy":"why it sits there","typical":"0.0-1.0: how typical an answer this is","fit":[{"f":"outcome|whom|success|where|budget","v":"yes|part|no","why":""}],"notv":"what this route will not do","actors":{"claude":"","hands":"PT's hands in the browser, if any","helper":"a helper program, if any","you":"the person's steps (final buttons, keys, payments are always theirs)","others":""},"setupMin":0,"weeklyMin":0,"helper":{"name":"","does":"","effort":"","perms":""},"first":"time to a first working version","money":{"once":"CHF","monthly":"CHF per month","perUse":"","who":"who pays","free":"free tier limits"},"usage":"Claude messages to build and run","risks":[{"text":"","l":"low|medium|high","i":"low|medium|high"}],"assume":["what must be true for it to work (load-bearing)"],"lock":"accounts, terms, what if the vendor changes","rev":"cost to leave later, what carries over","maint":"what breaks over time","data":"where data lives, who sees it, who must agree","logins":"logins and keys needed and who holds them (never PT)","status":"today|work|helper|notyet","conf":"high|medium|low","evidence":"sources with dates, or: PT's reasoning, not checked","where":"phone|web|desktop|cloud|local|person","how":"buy|build|combine","up":"a higher route it can grow into","down":"the simpler fallback","pattern":"a generic name of this route's shape that says nothing about this project, its people or data","recipe":["generic build steps, nothing about this project"],"breaks":["ids of the person's rules this route breaks (it stays on the map, greyed)"]}],"notyet":[{"name":"","why":"why not possible yet","blocker":"platform|law|vendor|model|device|cost|never","evidence":"","sure":"high|medium|low","change":"what would have to change","who":"anthropic|vendor|law|community|you","watch":"the signpost to watch and how PT can watch it","near":"the closest route possible today"}]}`;
function m20GoalJSON(p){ const G = goal20Read(p), o = {}; for (const k of M20_GOAL) if (str(G.f[k]).trim()) o[k] = G.f[k] + (G.by[k] === "you" ? "" : " (PT's guess, not confirmed: treat as an assumption)"); return o; }
function m20Known(p){ const M = m20Read(p); return M.routes.map(r => ({id: r.id, name: r.name, what: r.line, where: r.where, how: r.how, lvl: r.lvl, status: m20Status(p, r), fit: r.fitN, lib: r.lib ? "worked before" : undefined})); }
function m20RejNote(p){ const M = m20Read(p), R = Object.entries(M.rej).map(([id, x]) => { const r = m20Route(p, id); return r ? {route: r.name, reason: t("m20.rej." + oneOf(x.why, M20_REJ, "other"), {}), own: str(x.own)} : null; }).filter(Boolean);
  return R.length ? `\n<not_for_me>The person rejected these routes, with their reason. Look for variants without that weak point (for "too much work": lower-effort variants; "too expensive": cheaper ones).\n${JSON.stringify(R)}\n</not_for_me>` : ""; }
function m20LensPrompt(p, lens, {extra = "", n = 5} = {}){
  return buildPrompt("map-lens", {proj: p, rules: ["simple", "golden"], platform: true, context: projectContext(p, {only: ["north_star", "goal_criteria"]}),
    body: `You map ways ("routes") to reach the person's goal. This call looks from ONE angle only:
${M20_LENS_FRAME[lens]}
Give ${n} routes from this angle. Say for each how typical an answer it is ("typical" 0–1), and make at least two of them unusual (typical below 0.2): the answers a quick list would miss. A route is one complete way: what gets built or bought, who does what, where it runs, what it costs. Never pad the list with near-copies; fewer real routes are better than decoys.
Also list what is NOT possible yet from this angle (with why, what would have to change, who could change it, and the closest route possible today).
Rules: a route that breaks one of the person's rules is still listed, with the rule's id in "breaks"; PT shows it greyed. Money in CHF. Never claim a fact as checked unless it is common knowledge; else write "PT's reasoning, not checked" in evidence. "day" shows results only and never asks the person anything.
<goal_card>${JSON.stringify(m20GoalJSON(p))}</goal_card>
<on_the_map_already>${jsonFit(m20Known(p), 40000, x => x.id)}</on_the_map_already>${m20LibPromptBlock(p)}${m20RejNote(p)}${extra}`,
    schema: M20_SCHEMA});
}
function m20RedPrompt(p, {focus = null, everything = false, question = ""} = {}){
  const M = m20Read(p), open = M20_CELLS.filter(c => !M.routes.some(r => r.where + ":" + r.how === c) && !(M.cells[c] && M.cells[c].why));
  return buildPrompt(question ? "map-ask" : "map-redteam", {proj: p, rules: ["simple"], platform: true, context: projectContext(p, {only: ["north_star", "goal_criteria"]}),
    body: `${question ? `The person asks about the routes on their map. Answer in two or three plain sentences in "answer", and put every route your answer adds into "missing" and every route it shows to be wrong into "breaks", so the map changes with it.\n<question>${JSON.stringify(question)}</question>\n` : ""}You are the red team for the person's solution map. ${focus ? `Look hardest at route ${focus.id} ("${focus.name}"): why would it fail for THIS goal?` : "(a) Find routes that are missing from the map (other angles, unusual ones), and (b) break existing routes: why would each fail for THIS goal?"} A break lowers a route's status or fit, with the reason; only real breaks. ${everything ? "Tell everything not shown yet: every missing route, every break, and for each grid cell without a route either a route or one line why it is not meaningful." : "For each open grid cell, add a route or say in one line why it is not meaningful."}
Grid cells are "where it runs:how" (where: ${M20_WHERE.join(", ")}; how: ${M20_HOW.join(", ")}). Open cells: ${JSON.stringify(open)}.
Also list in "tried" the angles you tried (plain words). Saying there is nothing new is fine; never claim the map is complete.
<goal_card>${JSON.stringify(m20GoalJSON(p))}</goal_card>
<map>${jsonFit(m20Known(p), 60000, x => x.id)}</map>${m20RejNote(p)}`,
    schema: `{${question ? `"answer":"two or three plain sentences",` : ""}"missing":${M20_SCHEMA.slice(M20_SCHEMA.indexOf("["), M20_SCHEMA.indexOf(',"notyet"'))},"breaks":[{"id":"R3","why":"one plain sentence","status":"today|work|helper|notyet","fitDrop":0}],"cells":[{"cell":"phone:buy","why":"not meaningful because …"}],"tried":["angle"]}`});
}
/** a merge: the same route found again counts for both lenses (code: bigram similarity; one quick-tier call for unclear pairs) */
function m20Sim(a, b){ return askSim(a.name + " " + a.line, b.name + " " + b.line); }
async function m20MergeCheck(p, pairs){
  if (!pairs.length) return new Set();
  const prompt = buildPrompt("map-merge", {proj: p, rules: [], context: "", body: `Are these pairs of routes the same way to reach the goal (only worded differently)? Two routes that differ in who acts, where it runs or what gets built are different.
<pairs>${JSON.stringify(pairs.map((x, i) => ({i, a: {name: x.a.name, what: x.a.line}, b: {name: x.b.name, what: x.b.line}})))}</pairs>`,
    schema: `{"same":[0]}`});
  const r = await runAI("map-merge-" + uid("m"), t("m20.busy.merge"), prompt, {quick: true, validate: o => o && Array.isArray(o.same)});
  return new Set(r ? arr(r.same).map(x => num(x, -1)) : []);
}
/** put new routes on the map; returns {added, merged} */
async function m20Merge(p, found, ny, {lens, round}){
  const M = m20Of(p), added = [], merged = [], unclear = [];
  const fresh = [];
  for (const x of found){
    let best = null; for (const r of [...M.routes, ...fresh]){ const s = m20Sim(x, r); if (!best || s > best.s) best = {r, s}; }
    if (best && best.s >= 0.8){ if (!best.r.lenses.includes(lens)) best.r.lenses.push(lens); merged.push(best.r.id || best.r.name); continue; }
    if (best && best.s >= 0.4) unclear.push({a: x, b: best.r}); else fresh.push(x);
  }
  const same = await m20MergeCheck(p, unclear.slice(0, 10));
  unclear.forEach((u, i) => { if (same.has(i) && i < 10){ if (!u.b.lenses.includes(lens)) u.b.lenses.push(lens); merged.push(u.b.id || u.b.name); } else fresh.push(u.a); });
  const q = liveP(p), M2 = m20Of(q);
  for (const x of fresh){ if (M2.routes.length >= M20_MAX.routes) break; if (x.status === "notyet"){ const n = m20NormNy({name: x.name, why: x.evidence, evidence: x.evidence, near: x.down}); if (n && !M2.notyet.some(y => pickSame(y.name, n.name))){ n.id = "N" + M2.nextN++; M2.notyet.push(n); added.push(n.id); } continue; }
    x.id = "R" + M2.nextR++; x.found = {lens, round}; M2.routes.push(x); added.push(x.id); }
  for (const n of ny){ if (M2.notyet.length >= M20_MAX.notyet) break; if (M2.notyet.some(y => pickSame(y.name, n.name))) continue; n.id = "N" + M2.nextN++; M2.notyet.push(n); added.push(n.id); }
  return {added, merged};
}
async function m20Pool(jobs, n = 2){
  const out = new Array(jobs.length); let i = 0;
  const lane = async () => { while (i < jobs.length && !M20RUN.stop){ const k = i++; try{ out[k] = await jobs[k](); }catch(e){ out[k] = null; onAppError(e && e.message, "map:call"); } M20RUN.done++; render(); } };
  await Promise.all(Array.from({length: Math.min(n, jobs.length)}, lane));
  return out;
}
function m20Busy(p){ return M20RUN.pid === (p && p.id) && M20RUN.total > 0; }
/** one round: the lens calls (2 at a time), the red-team call, the merge, your rules, the saturation record. kind: full | dig | chip:<x> | ask */
async function m20Round(p, {kind = "full", lenses = null, red = true, focus = null, everything = false, question = ""} = {}){
  if (m20Busy(p) || M20RUN.total){ toast(t("m20.busy.one"), ""); return null; }
  const ws0 = WS.id, M0 = m20Of(p), n = M0.rounds.length + 1;
  const L = lenses || (kind === "full" || !M0.rounds.length ? M20_LENSES : M20_DIG[(M0.rounds.length - 1) % M20_DIG.length]);
  const lib = m20LibRoutes(p).filter(x => !M0.routes.some(r => r.lib === x.lib));
  if (lib.length){ snapshot(p, t("m20.act.lib")); for (const x of lib){ x.id = "R" + M0.nextR++; M0.routes.push(x); } m20Event(p, "lib", t("m20.ev.lib", {n: lib.length}), {add: lib.map(x => x.id)}); touch(p); }
  const keys = [];
  const jobs = L.map(lens => async () => { const key = "map-lens-" + lens; keys.push(key);
    const r = await runAI(key, t("m20.busy.lens", {x: t("m20.lens." + lens)}), m20LensPrompt(p, lens, {extra: kind === "full" ? "" : `\n<round>This is round ${n}. Look for what the earlier rounds missed: unusual routes only, no variants of routes on the map.</round>`}), {pid: p.id, step: "arch", validate: o => o && Array.isArray(o.found)});
    return r ? {lens, r} : null; });
  M20RUN.stop = false; M20RUN.pid = p.id; M20RUN.done = 0; M20RUN.total = jobs.length + (red ? 1 : 0) + (question ? 1 : 0); M20RUN.keys = keys; M20RUN.label = t("m20.run.round", {n}); render();
  let res = [], redR = null;
  try{
    res = await m20Pool(jobs, 2);
    if ((red || question) && !M20RUN.stop){ keys.push(question ? "map-ask" : "map-redteam");
      const q0 = pickLive(p, ws0); redR = q0 ? await runAI(question ? "map-ask" : "map-redteam", t(question ? "m20.busy.ask" : "m20.busy.red"), m20RedPrompt(q0, {focus, everything, question}), {pid: p.id, step: "review", tier: "complex", validate: o => o && Array.isArray(o.missing) && Array.isArray(o.breaks)}) : null;
      M20RUN.done++; render(); }
  }finally{ M20RUN.pid = null; M20RUN.total = 0; M20RUN.done = 0; M20RUN.keys = []; }
  const q = pickLive(p, ws0); if (!q) return null;
  const ok = res.filter(Boolean);
  if (!ok.length && !redR){ render(); return null; }
  snapshot(q, t("m20.act.round", {n}));
  const M = m20Of(q); let added = [], merged = [], fixed = [];
  for (const {lens, r} of ok){ const f = arr(r.found).map(x => m20Norm(x, {lens, round: n})).filter(Boolean);
    const ny = arr(r.notyet).map(m20NormNy).filter(Boolean);
    const m = await m20Merge(q, f, ny, {lens, round: n}); added = added.concat(m.added); merged = merged.concat(m.merged); }
  if (redR){
    const miss = arr(redR.missing).map(x => m20Norm(x, {lens: "red", round: n})).filter(Boolean);
    const m = await m20Merge(q, miss, [], {lens: "red", round: n}); added = added.concat(m.added); merged = merged.concat(m.merged);
    for (const b of arr(redR.breaks)){ const r = M.routes.find(x => x.id === str(b && b.id)); if (!r || !str(b.why).trim()) continue;
      const st = oneOf(str(b.status), ["today", "work", "helper", "notyet"], r.status), drop = Math.max(0, Math.min(3, Math.round(num(b.fitDrop, 0))));
      if (st === r.status && !drop && arr(r.corr).some(c => c.text === str(b.why))) continue;
      r.corr = arr(r.corr).concat({at: now(), round: n, text: str(b.why).slice(0, 300), from: r.status, to: st}); r.status = st; r.fitN = Math.max(0, num(r.fitN, 3) - drop); fixed.push(r.id); }   // ok:cut a correction's reason is stored at most 300 characters
    for (const c of arr(redR.cells)){ const k = str(c && c.cell); if (M20_CELLS.includes(k) && str(c.why).trim() && !M.routes.some(r => r.where + ":" + r.how === k)) M.cells[k] = {why: str(c.why).slice(0, 200), round: n}; }   // ok:cut a cell's reason is short by its nature
  }
  const fresh = M.routes.filter(r => added.includes(r.id));
  await m20RulesCheck(q, M.routes);
  const q2 = pickLive(p, ws0); if (!q2) return null;
  const M2 = m20Of(q2);
  const tried = arr(redR && redR.tried).map(str).filter(Boolean).slice(0, 8);
  const rd = {n, at: now(), kind, lenses: ok.map(x => x.lens).concat(redR ? ["red"] : []), calls: L.length + (redR ? 1 : 0), newN: added.length, merged: [...new Set(merged)].length, corrN: fixed.length, notyetChecked: ok.length > 0, tried};
  M2.rounds.push(rd); M2.rounds = M2.rounds.slice(-M20_MAX.rounds);
  if (M2.routes.some(r => r.lib)) M2.libChecked = true;
  const C = m20Coverage(q2); if (C.sat && !M2.satAt) M2.satAt = now();
  m20Event(q2, "round", t("m20.ev.round", {n}), {add: added, fix: fixed, cause: kind});
  if (redR && str(redR.answer).trim()) M2.events[0].answer = str(redR.answer).slice(0, 800);   // ok:cut the answer is a few sentences
  if (redR && tried.length) M2.events[0].tried = tried;
  logAct(q2, t("m20.log.round", {n, a: added.length, c: fixed.length}), {step: "arch", important: true});
  touch(q2); render();
  return {added, merged, fixed, fresh};
}

/* ---------- 4. proven routes: a template library across projects, allow-listed, never a project's rules ---------- */
function m20LibList(){ return arr(WS && WS.settings && WS.settings.lib20); }
/** the words of a project that must never leave it: its name, the names in its goal card, every facts-book entry */
function m20Private(p){
  const G = goal20Read(p), names = new Set();
  for (const s of [p.name, ...M20_GOAL.map(k => G.f[k]), str(p.northStar && p.northStar.users)]) for (const w of str(s).match(/\b\p{Lu}[\p{L}'-]{2,}/gu) || []) names.add(w.toLowerCase());
  return {name: str(p.name).toLowerCase().trim(), names, entries: factsRead(p).entries};
}
/** one text of a template: kept only when it holds nothing of the project (a rule's or fact's key word, a name, the goal) */
function m20LibText(P, s, n = 160){
  const x = str(s).replace(/\s+/g, " ").trim(); if (!x) return "";
  const low = x.toLowerCase();
  if (P.name.length >= 3 && low.includes(P.name)) return "";
  if ((x.match(/\b\p{Lu}[\p{L}'-]{2,}/gu) || []).some(w => P.names.has(w.toLowerCase()))) return "";
  if (P.entries.some(e => factKwHits(e, x) >= 1)) return "";
  return x.length > n ? "" : x;
}
/** a route of a launched project enters the library as a template (allow-listed fields only) */
function m20LibAdd(p){
  const r = m20Chosen(p); if (!r || !p.live || !WS.settings) return null;
  const P = m20Private(p), from = hash64(p.id), src = hash64(p.id + "|" + r.id);
  const pattern = m20LibText(P, r.pattern, 80) || t("m20.lib.pat", {x: t("m20.where." + r.where), y: t("m20.how." + r.how)});
  const lr = lastRun(p), open = arr(p.findings).filter(f => f.status === "open" && ["critical", "high"].includes(f.severity)).length;
  const e = {id: "", src, from, fam: m20LibText(P, r.fam, 60) || t("m20.fam.other"), lvl: m20Lvl(r.lvl), pattern, where: oneOf(r.where, M20_WHERE, "web"), how: oneOf(r.how, M20_HOW, "build"),
    actors: Object.keys(r.actors || {}).filter(k => str(r.actors[k]).trim() && ["claude", "hands", "helper", "you", "others"].includes(k)),
    recipe: arr(r.recipe).map(s => m20LibText(P, s)).filter(Boolean).slice(0, 6),
    outcome: {since: str(p.live.since).slice(0, 10), checks: lr && lr.passRate != null ? num(lr.passRate) : null, incidents: open}, at: now()};
  const L = m20LibList().filter(x => x.src !== src);
  e.id = "L" + (Math.max(0, ...m20LibList().map(x => num(str(x.id).slice(1)))) + 1);
  WS.settings.lib20 = [e, ...L].slice(0, M20_MAX.lib); saveWs();
  m20Event(p, "lib", t("m20.ev.libadd", {x: r.name}));
  return e;
}
/** the templates of the other projects, as routes on this map (re-checked here like any other) */
function m20LibRoutes(p){
  const me = hash64(p.id);
  return m20LibList().filter(e => e && e.from !== me).map(e => { const r = m20Norm({name: e.pattern, fam: e.fam, line: t("m20.lib.line"), lvl: e.lvl, where: e.where, how: e.how, status: "work", conf: "low", evidence: t("m20.lib.ev"), recipe: e.recipe, pattern: e.pattern}, {lens: "lib", round: 0});
    if (!r) return null; r.lib = e.id; r.libOut = e.outcome; r.lenses = ["lib"]; return r; }).filter(Boolean);
}
function m20LibPromptBlock(p){
  const me = hash64(p.id), L = m20LibList().filter(e => e && e.from !== me);
  return L.length ? `\n<proven_templates>Route shapes that worked in the person's other projects (templates only: nothing of those projects' rules or facts). Treat them like any other route: judge them against THIS goal and THIS project's rules.\n${JSON.stringify(L.map(e => ({pattern: e.pattern, fam: e.fam, where: e.where, how: e.how, recipe: e.recipe})))}\n</proven_templates>` : "";
}

/* ---------- 5. deciding ---------- */
function m20Short(p, id){
  const M = m20Of(p), i = M.short.indexOf(id);
  if (i >= 0){ M.short.splice(i, 1); return true; }
  if (M.short.length >= 3){ toast(t("m20.short.full"), "err"); return false; }
  const r = m20Route(p, id); if (!r || m20Status(p, r) === "blocked"){ toast(t("m20.short.blocked"), "err"); return false; }
  M.short.push(id); delete M.rej[id]; rcpt20(p, t("m20.short.done", {x: r.name, n: M.short.length}), t("m20.where.short")); return true;
}
function m20Reject(p, id, why, own = ""){
  const M = m20Of(p), r = m20Route(p, id); if (!r) return;
  M.rej[id] = {why: oneOf(why, M20_REJ, "other"), own: str(own).trim().slice(0, 200), at: now()}; M.short = M.short.filter(x => x !== id);   // ok:cut the reason in your words, short by its nature
  rcpt20(p, t("m20.rej.done", {x: r.name, y: t("m20.rej." + M.rej[id].why)}), t("m20.where.rej"));
}
/** PT's ★: shown only after you looked at a full card or the comparison; never on a blocked route; it names what it loses */
function m20Star(p){
  const M = m20Read(p); if (!M.looked) return null;
  const ok = M.routes.filter(r => !["blocked", "notyet"].includes(m20Status(p, r)) && !M.rej[r.id]);
  if (!ok.length) return null;
  return ok.slice().sort((a, b) => num(b.fitN) - num(a.fitN) || num(a.setupMin) + num(a.weeklyMin) * 4 - (num(b.setupMin) + num(b.weeklyMin) * 4))[0];
}
function m20Money(r){ const m = str(r.money && r.money.monthly).match(/\d+(?:[.,]\d+)?/); return m ? num(m[0].replace(",", ".")) : /free|gratis|0/i.test(str(r.money && r.money.monthly)) ? 0 : 999; }
async function m20Prove(p, id){
  const r = m20Route(p, id); if (!r) return null;
  const ws0 = WS.id;
  const prompt = buildPrompt("map-prove", {proj: p, rules: ["simple"], platform: true, context: projectContext(p, {only: ["north_star"]}),
    body: `Prove it: take the riskiest load-bearing assumption of this route (the one that, if false, breaks the route for this goal) and check it as well as you can from what you know. Say plainly if you could only reason about it (no web, no test), and how the person could check it for real in a few minutes.
<route>${JSON.stringify({id: r.id, name: r.name, what: r.line, mustBeTrue: arr(r.assume).map(a => ({id: a.id, text: a.text})), risks: arr(r.risks).map(x => x.text)})}</route>
<goal_card>${JSON.stringify(m20GoalJSON(p))}</goal_card>`,
    schema: `{"aid":"a1","assumption":"the assumption, in plain words","verdict":"holds|fails|unclear","why":"two plain sentences","how":"PT's reasoning only | known fact","check":"how the person can check it for real"}`});
  const out = await runAI("map-prove", t("m20.busy.prove", {x: r.name}), prompt, {pid: p.id, step: "arch", validate: o => o && ["holds", "fails", "unclear"].includes(str(o.verdict))});
  const q = pickLive(p, ws0); if (!out || !q) return null;
  const R = m20Route(q, id); if (!R) return null;
  snapshot(q, t("m20.act.prove", {x: R.name}));
  const a = arr(R.assume).find(x => x.id === str(out.aid)) || arr(R.assume)[0];
  R.proof = {at: now(), aid: a ? a.id : "", text: str(out.assumption).slice(0, 300) || (a ? a.text : ""), verdict: str(out.verdict), why: str(out.why).slice(0, 500), how: str(out.how).slice(0, 80), check: str(out.check).slice(0, 300)};   // ok:cut the check's own short fields
  if (a){ a.checked = out.verdict === "holds" ? "ok" : out.verdict === "fails" ? "no" : "unclear"; a.at = now(); }
  if (out.verdict === "fails"){ R.conf = "low"; R.corr = arr(R.corr).concat({at: now(), text: t("m20.prove.failed", {x: R.proof.text})}); m20Event(q, "corr", t("m20.ev.prove.no", {x: R.name}), {fix: [R.id]}); }
  else m20Event(q, "prove", t("m20.ev.prove", {x: R.name, v: t("m20.prove.v." + out.verdict)}));
  touch(q); render();
  return R.proof;
}
/** the refs of the details (route-neutral when they were there before the decision, route-bound when made after it) */
function m20Refs(p){
  return [...arr(p.requirements).map(r => "req:" + r.id), ...arr(p.assumptions).map(a => "assumption:" + a.id), ...arr(p.risks).map(r => "risk:" + r.id), ...arr(p.qa).filter(q => str(q.answer).trim()).map(q => "qa:" + q.id),
    ...arr(p.pick && p.pick.log).map(e => "pe:" + e.id), ...arr(p.goal && p.goal.criteria).map(c => "crit:" + c.id)];
}
function m20RefLabel(p, ref){
  const [k, id] = [str(ref).split(":")[0], str(ref).slice(str(ref).indexOf(":") + 1)];
  if (k === "pe"){ const e = arr(p.pick && p.pick.log).find(x => x.id === id); return e ? str(e.q) + " → " + str(e.answer) : ref; }
  if (k === "qa"){ const q = arr(p.qa).find(x => x.id === id); return q ? str(q.q) + " → " + str(q.answer) : ref; }
  return refLabel(p, ref);
}
function m20Bound(p, ref){ const M = m20Read(p); if (M.tags[ref]) return M.tags[ref] !== "n"; return !M.neutral.includes(ref); }
/** how much of the work carries over to another route: the goal, your facts and rules and every route-neutral detail */
function m20Carry(p){
  const refs = m20Refs(p), bound = refs.filter(r => m20Bound(p, r)), facts = factsActive(p).length;
  const total = refs.length + facts + 1, keep = total - bound.length;
  return {pct: Math.round(100 * keep / Math.max(1, total)), keep, total, bound, facts, neutral: refs.length - bound.length};
}
function m20Take(p, id, {why = "", trip = [], higher = "", rejWhy = {}} = {}){
  const M = m20Of(p), r = M.routes.find(x => x.id === id); if (!r) return null;
  if (m20Status(p, r) === "blocked"){ toast(t("m20.short.blocked"), "err"); return null; }
  addRestore(p, {kind: "auto", label: t("m20.rp", {x: r.name})});
  const others = M.short.filter(x => x !== id), old = m20Decision(p);
  if (old){ old.status = "replaced"; old.replacedBy = id; const f = factById(p, old.fact); if (f && f.status === "active"){ f.status = "replaced"; f.replacedBy = null; } }
  const e = factsAdd(p, {kind: "decision", words: t("m20.dec.fact", {x: r.name, y: str(why).trim() || t("m20.take.whysug0")}), src: {k: "dec", ref: "route:" + id, label: t("m20.title")}});
  const D = {id: uid("rd"), at: now(), route: id, name: r.name, why: str(why).trim(), compared: others, rejected: others.map(o => ({id: o, why: oneOf(rejWhy[o], M20_REJ, "other")})),
    trip: arr(trip).map(s => str(s).trim()).filter(Boolean).slice(0, 8).map((s, i) => ({id: "t" + (i + 1), text: s})), switchCost: str(r.rev), higher: str(higher).trim(), fact: e ? e.id : "", status: "active", fields: ["outcome", "whom", "success"]};
  M.decs.push(D); M.chosen = id; M.neutral = m20Refs(p); M.tags = {};
  for (const o of others) if (!M.rej[o]) M.rej[o] = {why: D.rejected.find(x => x.id === o).why, own: "", at: now(), dec: true};
  m20Event(p, "dec", t("m20.ev.dec", {x: r.name}), {fix: [id]});
  logDecision(p, t("m20.dec.title"), r.name, str(why));
  logAct(p, t("m20.ev.dec", {x: r.name}), {step: "arch", important: true});
  rcpt20(p, t("m20.ev.dec", {x: r.name}), t("m20.where.dec"));
  return D;
}

/* ---------- 6. tripwires and the Route alert ---------- */
const M20W = {q: new Map(), t: null};
function m20WatchSoon(p, item){
  if (!p || !m20Read(p).routes.length) return;
  const L = M20W.q.get(p.id) || []; L.push(item); M20W.q.set(p.id, L);
  clearTimeout(M20W.t); M20W.t = setTimeout(() => { const all = [...M20W.q.entries()]; M20W.q.clear(); for (const [pid, items] of all){ const q = arr(WS.projects).find(x => x.id === pid); if (q) m20Watch(q, items).catch(e => onAppError(e && e.message, "map:watch")); } }, 0);
}
/** new facts, failed tests, serious findings → your rules on every route (code + one quick confirm), the chosen route's assumptions and tripwires (one quick call) */
async function m20Watch(p, items){
  const ws0 = WS.id, M0 = m20Read(p);
  if (items.some(x => x.kind === "rule")){
    const before = new Map(M0.routes.map(r => [r.id, m20Status(p, r)]));
    const q0 = pickLive(p, ws0); if (!q0) return;
    const R = m20Of(q0).routes.map(r => Object.assign({}, r));
    await m20RulesCheck(q0, R);
    const q = pickLive(p, ws0); if (!q) return;
    const M = m20Of(q), grey = [];
    for (const x of R){ const r = M.routes.find(y => y.id === x.id); if (!r) continue; r.breaks = x.breaks; if (m20Status(q, r) === "blocked" && before.get(r.id) !== "blocked") grey.push(r.id); }
    if (grey.length){ snapshot(q, t("m20.act.rules")); m20Event(q, "block", t("m20.ev.block", {n: grey.length}), {fix: grey}); M.short = M.short.filter(id => !grey.includes(id)); }
    const ch = m20Chosen(q);
    if (ch && grey.includes(ch.id)){ const b = m20Breaks(q, ch)[0]; m20AlertAdd(q, {src: items.find(x => x.kind === "rule"), on: "rule", what: b ? b.rule : "", how: "blocks", why: b && b.s ? b.s : t("m20.al.rulewhy")}); }
    touch(q); render();
  }
  const q1 = pickLive(p, ws0), ch = q1 && m20Chosen(q1), D = q1 && m20Decision(q1);
  if (!ch) return;
  const on = [...arr(ch.assume).map(a => ({id: a.id, text: a.text})), ...arr(D && D.trip).map(x => ({id: x.id, text: x.text}))];
  const its = items.filter(x => str(x.text).trim()).slice(0, 8);
  if (!on.length || !its.length) return;
  const prompt = buildPrompt("map-alert", {proj: q1, rules: [], context: "",
    body: `The person chose a route. Check whether any of the new items below contradicts something that must stay true for that route (its load-bearing assumptions "a…") or one of the tripwires the person set ("t…": "we switch if …" — a tripwire fires when the item says its condition is now true). Only real contradictions; none is a fine answer.
<route>${JSON.stringify({name: ch.name, what: ch.line})}</route>
<must_stay_true>${JSON.stringify(on)}</must_stay_true>
<new_items>${JSON.stringify(its.map((x, i) => ({i, kind: x.kind, text: x.text})))}</new_items>`,
    schema: `{"hits":[{"i":0,"on":"a1|t1","how":"blocks|worse|cost","why":"one plain sentence"}]}`});
  const r = await runAI("map-alert-" + uid("w"), t("m20.busy.alert"), prompt, {quick: true, validate: o => o && Array.isArray(o.hits)});
  const q = pickLive(p, ws0); if (!r || !q) return;
  let n = 0;
  for (const h of arr(r.hits)){ const it = its[num(h && h.i, -1)], o = on.find(x => x.id === str(h && h.on)); if (!it || !o) continue;
    if (m20AlertAdd(q, {src: it, on: o.id, what: o.text, how: oneOf(str(h.how), ["blocks", "worse", "cost"], "worse"), why: str(h.why)})) n++; }
  if (n){ touch(q); render(); }
}
function m20AlertAdd(p, {src, on, what, how, why}){
  const M = m20Of(p), ch = m20Chosen(p); if (!ch || !src) return null;
  if (M.alerts.some(a => a.route === ch.id && a.ref === str(src.ref) && a.on === on && ["open", "later"].includes(a.status))) return null;
  snapshot(p, t("m20.act.alert"));
  const a = {id: uid("ra"), at: now(), route: ch.id, ref: str(src.ref), kind: str(src.kind), text: str(src.text).slice(0, 400), on, what: str(what).slice(0, 300), how, why: str(why).slice(0, 400), status: "open"};   // ok:cut the alert quotes the start of the item; the item itself stays where it is
  M.alerts.unshift(a); M.alerts = M.alerts.slice(0, M20_MAX.alerts);
  m20Event(p, "alert", t("m20.ev.alert", {x: ch.name}), {fix: [ch.id]});
  return a;
}
/** the routes that still stand: not the chosen one, not blocked, not leaning on the broken assumption */
function m20Stands(p, a){
  return m20Read(p).routes.filter(r => r.id !== a.route && !["blocked", "notyet"].includes(m20Status(p, r)) && !arr(r.assume).some(x => askSim(x.text, a.what) >= 0.4))
    .sort((x, y) => num(y.fitN) - num(x.fitN)).slice(0, 3);
}
async function m20Repair(p, aid){
  const M = m20Read(p), a = M.alerts.find(x => x.id === aid), r = a && m20Route(p, a.route); if (!a || !r) return null;
  const ws0 = WS.id;
  const prompt = buildPrompt("map-repair", {proj: p, rules: ["simple"], platform: true, context: projectContext(p, {only: ["north_star"]}),
    body: `A new item breaks the person's chosen route. Say whether the route can be repaired so it still reaches the goal, and how (plain steps, what it costs in money and the person's time). If it cannot, say so plainly.
<route>${JSON.stringify({name: r.name, what: r.line, mustBeTrue: arr(r.assume).map(x => x.text)})}</route>
<what_broke>${JSON.stringify({item: a.text, breaks: a.what, why: a.why})}</what_broke>`,
    schema: `{"ok":true,"repair":"one or two plain sentences","steps":["…"],"cost":"money and time"}`});
  const out = await runAI("map-repair", t("m20.busy.repair"), prompt, {pid: p.id, step: "arch", validate: o => o && typeof o.ok === "boolean"});
  const q = pickLive(p, ws0); if (!out || !q) return null;
  const A = m20Read(q).alerts.find(x => x.id === aid); if (!A) return null;
  snapshot(q, t("m20.act.repair"));
  A.repair = {ok: !!out.ok, text: str(out.repair).slice(0, 500), steps: arr(out.steps).map(s => str(s).slice(0, 200)).slice(0, 6), cost: str(out.cost).slice(0, 160), at: now()};   // ok:cut ok:verdict the repair's own short fields; ok is the model's yes/no
  touch(q); render();
  return A.repair;
}
function m20AlertSet(p, aid, st, {reason = ""} = {}){
  const M = m20Of(p), a = M.alerts.find(x => x.id === aid); if (!a) return;
  const r = m20Route(p, a.route), D = m20Decision(p);
  a.status = st; a.done = now();
  if (st === "kept"){ a.reason = str(reason).trim(); if (D) D.trip = arr(D.trip).concat({id: "t" + (arr(D.trip).length + 1), text: t("m20.al.accepted", {x: a.what})}); factsAdd(p, {kind: "decision", words: t("m20.al.keepfact", {x: r ? r.name : "", y: a.what, z: a.reason}), src: {k: "dec", ref: "alert:" + a.id, label: t("m20.title")}}); }   // ok:id the tripwire ids count up per decision
  if (st === "repaired" && r && a.repair){ r.corr = arr(r.corr).concat({at: now(), text: t("m20.al.repaired", {x: a.repair.text})}); }
  if (st === "map"){ const s = m20Stands(p, a)[0]; M.short = s ? [s.id] : []; }
  m20Event(p, "alert", t("m20.al.ev." + st, {x: r ? r.name : ""}));
  rcpt20(p, t("m20.al.ev." + st, {x: r ? r.name : ""}), t("m20.where.alert"));
}
{ const orig = factsAdd; factsAdd = function(p, o){
    const e = orig.apply(this, arguments);
    try{ if (e && p && m20Read(p).routes.length && !(e.src && e.src.k === "dec" && /^(route|alert):/.test(str(e.src.ref)))) m20WatchSoon(p, {kind: FACT_RULES.includes(e.kind) ? "rule" : "fact", text: factText(e), ref: "fact:" + e.id}); }catch(x){ onAppError(x && x.message, "map:fact"); }
    return e; }; }
{ const orig = finishRun; finishRun = function(p, run){
    const r = orig.apply(this, arguments);
    try{ if (p && m20Chosen(p) && run && !run.incomplete){ const bad = arr(run.results).filter(x => x && x.pass === false); const tests = [...new Set(bad.map(x => x.testId))].slice(0, 4);
        for (const id of tests){ const tt = arr(p.tests).find(x => x.id === id); if (tt) m20WatchSoon(p, {kind: "test", text: t("m20.al.test", {x: str(tt.title)}), ref: "test:" + id + ":" + str(run.id || run.at)}); } } }
    catch(x){ onAppError(x && x.message, "map:test"); }
    return r; }; }
{ const orig = aiReview; aiReview = async function(p){
    const before = new Set(arr(p && p.findings).map(f => f.id));
    const r = await orig.apply(this, arguments);
    try{ const q = p && liveP(p); if (q && m20Chosen(q)) for (const f of arr(q.findings).filter(f => !before.has(f.id) && ["critical", "high"].includes(f.severity)).slice(0, 4)) m20WatchSoon(q, {kind: "finding", text: str(f.issue), ref: "finding:" + f.id}); }
    catch(x){ onAppError(x && x.message, "map:finding"); }
    return r; }; }
{ const orig = doRelease; doRelease = async function(p){
    const r = await orig.apply(this, arguments);
    try{ const q = p && liveP(p); if (q && q.live && m20Chosen(q)){ m20LibAdd(q); touch(q); } }catch(x){ onAppError(x && x.message, "map:library"); }
    return r; }; }

/* ---------- 7. map chat: each chip runs a lens or red-team call and shows a map diff card ---------- */
function m20Focus(p){ const M = m20Read(p); return m20Chosen(p) || (M.short[0] && m20Route(p, M.short[0])) || m20Star(p) || M.routes.find(r => m20Status(p, r) !== "blocked") || null; }
function m20ChipPlan(p, k){
  const M = m20Read(p), used = {}; for (const r of M.rounds) for (const l of arr(r.lenses)) used[l] = (used[l] || 0) + 1;
  const least = M20_LENSES.slice().sort((a, b) => (used[a] || 0) - (used[b] || 0)).slice(0, 2);
  return {missing: {lenses: least, red: true}, higher: {lenses: ["frontier"], red: false}, easier: {lenses: ["hack", "process"], red: false},
    breaks: {lenses: [], red: true, focus: m20Focus(p)}, all: {lenses: [], red: true, everything: true}}[k] || null;
}
function m20Calls(plan){ return arr(plan.lenses).length + (plan.red ? 1 : 0); }
async function m20Chip(p, k, question = ""){
  if (k === "ask"){ if (!str(question).trim()) return null; return m20Round(p, {kind: "ask", lenses: [], red: false, question: str(question).trim()}); }
  const plan = m20ChipPlan(p, k); if (!plan) return null;
  return m20Round(p, Object.assign({kind: "chip:" + k}, plan));
}

/* ---------- 8. the page ---------- */
function m20UI(p){ const U = UI.m20 && UI.m20.pid === p.id ? UI.m20 : null; return U; }
function m20Open(p, v = "map", id = null){
  if (!p) return; pushNav();
  const U = m20UI(p) || {pid: p.id, f: {rules: true, today: false, free: false}, sort: "fit", more: {}};
  UI.m20 = Object.assign(U, {v: oneOf(v, ["map", "goal", "card", "compare", "take", "alert"], "map"), id, confirm: null, rej: null, keep: null});
  if (["card", "compare"].includes(UI.m20.v) && m20Read(p).routes.length && !m20Read(p).looked){ m20Of(p).looked = true; touch(p); }
  UI.factsView = null; UI.rowsView = null; UI.home = false; UI.finish = null;
  UI.m20Seen = UI.m20Seen || {}; UI.m20Seen[p.id] = m20Read(p).events.length ? m20Read(p).events[0].id : "";
  render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0;
  if (id && UI.m20.v === "map") focusSoon("m20r-" + id);
}
const M20_ICON = {today: "✓", work: "✎", helper: "⚙", notyet: "◷", blocked: "⛔"};
function m20Badge(st){ return `<span class="m20-badge b-${esc(st)}"><span aria-hidden="true">${M20_ICON[st] || "•"}</span> ${esc(t("m20.st." + st))}</span>`; }
function m20Fit(n){ const k = Math.max(0, Math.min(5, Math.round(num(n)))); return `<span class="m20-fit" title="${esc(t("m20.fit.of", {n: k}))}"><span aria-hidden="true">${"●".repeat(k)}${"○".repeat(5 - k)}</span><span class="sr20">${esc(t("m20.fit.of", {n: k}))}</span></span>`; }
function m20Min(n){ return n ? t("m20.min", {n}) : t("m20.min0"); }
function m20RouteRow(p, r){
  const M = m20Read(p), st = m20Status(p, r), sl = M.short.includes(r.id), star = m20Star(p), U = m20UI(p) || {}, B = m20Breaks(p, r);
  const lbl = r.id + " · " + r.name;
  const rej = U.rej === r.id ? `<div class="m20-rejq" role="group" aria-label="${esc(t("m20.rej.q", {x: r.name}))}"><span class="small">${esc(t("m20.rej.q", {x: r.name}))}</span>${M20_REJ.map(k => `<button class="btn xs" data-a="m20-rejwhy" data-id="${esc(r.id)}" data-v="${k}">${esc(t("m20.rej." + k))}</button>`).join("")}<button class="btn xs ghost" data-a="m20-rej" data-id="${esc(r.id)}">${esc(t("btn.cancel"))}</button></div>` : "";
  return `<div class="m20-r st-${esc(st)} ${M.chosen === r.id ? "chosen" : ""} ${sl ? "short" : ""}" id="m20r-${esc(r.id)}" data-route="${esc(r.id)}" tabindex="-1">
    <button class="m20-nm linkish" data-a="m20-open" data-v="card" data-id="${esc(r.id)}">${star && star.id === r.id ? `<span class="m20-star" title="${esc(t("m20.star.t"))}">★ ${esc(t("m20.star.row"))} · </span>` : ""}${M.chosen === r.id ? `<span class="m20-chosen">${esc(t("m20.chosen"))} · </span>` : ""}${esc(lbl)}</button>
    <div class="m20-acts">${st === "blocked" ? "" : `<button class="iconbtn m20-sl" aria-pressed="${sl}" data-a="m20-short" data-id="${esc(r.id)}" title="${esc(t(sl ? "m20.short.off" : "m20.short.on"))}" aria-label="${esc(t(sl ? "m20.short.off" : "m20.short.on") + ": " + lbl)}">${sl ? "★" : "☆"}</button>`}<button class="iconbtn m20-x" data-a="m20-rej" data-id="${esc(r.id)}" title="${esc(t("m20.rej.t"))}" aria-label="${esc(t("m20.rej.t") + ": " + lbl)}">✕</button></div>
    <div class="m20-facts">${m20Badge(st)}${r.lib ? `<span class="m20-badge b-prev">${esc(t("m20.lib.badge", {d: str(r.libOut && r.libOut.since)}))}</span>` : ""}${arr(r.corr).length ? `<span class="m20-badge b-corr">${esc(t("m20.corrected"))}</span>` : ""}
      <span>${esc(t("m20.c.fit"))} ${m20Fit(r.fitN)}</span><span>${esc(t("m20.c.work"))} <b>${esc(m20Min(r.setupMin))}</b>${r.weeklyMin ? ` + <b>${esc(t("m20.minw", {n: r.weeklyMin}))}</b>` : ""}</span><span>${esc(t("m20.c.money"))} <b>${esc(str(r.money && r.money.monthly) || "?")}</b></span><span>${esc(t("m20.c.first"))} <b>${esc(r.first || "?")}</b></span></div>
    ${B.length ? `<p class="small m20-why">${esc(t("m20.blocked.why", {x: B.map(b => b.rule).join(" · ")}))}</p>` : r.goalOut ? `<p class="small m20-why">${esc(t("m20.goalout", {x: r.goalOut.why}))}</p>` : ""}${rej}</div>`;
}
function m20Visible(p){
  const M = m20Read(p), U = m20UI(p) || {f: {rules: true}};
  return M.routes.filter(r => { const st = m20Status(p, r); if (M.rej[r.id]) return false; if (U.f.rules && st === "blocked") return false; if (U.f.today && st !== "today") return false; if (U.f.free && m20Money(r) > 0) return false; return st !== "notyet" || r.goalOut; });
}
function m20Sorted(p, list){
  const s = (m20UI(p) || {}).sort || "fit", w = r => num(r.setupMin) + 4 * num(r.weeklyMin);
  const by = {fit: (a, b) => num(b.fitN) - num(a.fitN), cheap: (a, b) => m20Money(a) - m20Money(b), work: (a, b) => w(a) - w(b), fast: (a, b) => str(a.first).length - str(b.first).length, high: (a, b) => b.lvl - a.lvl || num(b.fitN) - num(a.fitN)}[s];
  return list.slice().sort(by);
}
function m20CoverHTML(p){
  const M = m20Read(p), C = m20Coverage(p);
  if (!M.rounds.length) return `<section class="panel m20-cover" data-anchor="m20-cover"><p>${esc(t("m20.cover.none"))}</p>${m20GoBtn(p, "full")}</section>`;
  const last = C.last, lastTxt = t("m20.cover.last", {a: last.newN, c: last.corrN});
  return `<section class="panel m20-cover" data-anchor="m20-cover" aria-label="${esc(t("m20.cover.t"))}">
    <p class="m20-sat">${esc(t("m20.cover.rec", {n: C.rounds, x: lastTxt, a: C.covered + C.explained, b: C.cells}))}${C.cellsOpen ? " · " + esc(t("m20.cover.open", {n: C.cellsOpen})) : ""} · ${esc(C.est == null ? t("m20.cover.est0") : t("m20.cover.est", {n: C.est}))}</p>
    ${M.satAt ? `<p class="small m20-satd">${esc(t("m20.cover.sat", {d: fmtDate(M.satAt)}))}</p>` : ""}
    <p class="small muted">${esc(t("m20.cover.never"))}</p>
    ${arr(last.tried).length ? `<p class="small muted">${esc(t("m20.cover.tried", {x: last.tried.join(", ")}))}</p>` : ""}
    <div class="row">${m20GoBtn(p, "dig")}${C.cellsOpen ? `<details class="small m20-cells"><summary>${esc(t("m20.cover.cells"))}</summary><ul>${M20_CELLS.filter(c => !M.routes.some(r => r.where + ":" + r.how === c)).map(c => `<li>${esc(t("m20.where." + c.split(":")[0]))} · ${esc(t("m20.how." + c.split(":")[1]))}: ${M.cells[c] ? esc(M.cells[c].why) : `<b>${esc(t("m20.cover.unexpl"))}</b>`}</li>`).join("")}</ul></details>` : ""}</div></section>`;
}
/** a multi-call action names its cost first (Start / Cancel); a one-call chip says it on the button */
function m20GoBtn(p, what){
  const M = m20Read(p), calls = what === "full" ? M20_LENSES.length + 1 : 3, c = m20Cost(calls), busy = m20Busy(p) || AI.running.size > 0;
  return `<button class="btn sm ${what === "full" ? "primary" : ""}" data-a="m20-ask" data-v="${what}" ${busy ? "disabled" : ""}>${ic("spark")}${esc(t(what === "full" ? "m20.go.full" : "m20.go.dig"))}<span class="small m20-cost"> · ${esc(t("m20.cost", {n: c.n, m: c.min}))}</span></button>`;
}
function m20ConfirmHTML(p){
  const U = m20UI(p); if (!U || !U.confirm) return "";
  const k = U.confirm, M = m20Read(p);
  let calls = 1, what = "";
  if (k === "full"){ calls = M20_LENSES.length + 1; what = t("m20.cf.full"); }
  else if (k === "dig"){ calls = 3; what = t("m20.cf.dig"); }
  else if (/^chip:/.test(k)){ const plan = m20ChipPlan(p, k.slice(5)); calls = plan ? m20Calls(plan) : 1; what = t("m20.chip." + k.slice(5) + ".what"); }
  else if (/^prove:/.test(k)){ const r = m20Route(p, k.slice(6)); what = t("m20.cf.prove", {x: r ? r.name : ""}); }
  const c = m20Cost(calls);
  return `<section class="panel m20-confirm" role="alertdialog" aria-labelledby="m20-cf-h" data-anchor="m20-confirm"><h3 id="m20-cf-h">${esc(what)}</h3>
    <p>${esc(calls === 1 ? t("m20.cost1") : t("m20.cost.long", {n: c.n, m: c.min}))}</p><p class="small muted">${esc(t("m20.cost.plan"))}</p>
    <div class="row"><button class="btn sm primary" id="m20-cf-go" data-a="m20-go" data-v="${esc(k)}">${ic("spark")}${esc(t("m20.cf.go"))}</button><button class="btn sm ghost" data-a="m20-cancel">${esc(t("btn.cancel"))}</button></div></section>`;
}
function m20ProgressHTML(p){
  if (!m20Busy(p)) return "";
  return `<div class="busy m20-busy" role="status" aria-live="polite"><span class="pulse"></span><div class="stack" style="flex:1 1 12em;gap:4px"><b>${esc(M20RUN.label)}</b><span class="small">${esc(t("m20.run.n", {a: M20RUN.done, b: M20RUN.total}))}</span></div><button class="btn sm" data-a="m20-stop">${esc(t("btn.stop"))}</button></div>`;
}
function m20DiffHTML(p, e){
  if (!e) return "";
  const nm = id => { const r = m20Route(p, id); return r ? r.id + " · " + r.name : id; };
  const add = arr(e.add), fix = arr(e.fix);
  return `<section class="panel m20-diff" data-anchor="m20-diff"><div class="small muted">${esc(t("m20.diff.k"))} · ${esc(fmtDate(e.at))}</div><h3>${esc(e.text)}</h3>
    ${e.answer ? `<p>${esc(e.answer)}</p>` : ""}
    <ul class="m20-dl">${add.map(id => `<li class="add"><span aria-hidden="true">+</span> <button class="linkish" data-a="m20-goto" data-id="${esc(id)}">${esc(nm(id))}</button> <span class="sr20">${esc(t("m20.diff.added"))}</span></li>`).join("")}${fix.map(id => `<li class="fix"><span aria-hidden="true">~</span> <button class="linkish" data-a="m20-goto" data-id="${esc(id)}">${esc(nm(id))}</button> <span class="small">${esc(t("m20.diff.fixed"))}</span></li>`).join("")}${!add.length && !fix.length ? `<li>${esc(t("m20.diff.none"))}</li>` : ""}</ul>
    ${arr(e.tried).length ? `<p class="small muted">${esc(t("m20.cover.tried", {x: e.tried.join(", ")}))}</p>` : ""}
    <p class="small muted">${esc(t("m20.diff.short", {n: m20Read(p).short.length}))}</p></section>`;
}
function m20ChatHTML(p){
  const f = m20Focus(p), busy = m20Busy(p) || AI.running.size > 0;
  const chip = (k, lbl) => { const plan = m20ChipPlan(p, k), calls = plan ? m20Calls(plan) : 1; return `<button class="btn xs m20-chip" data-a="${calls > 1 ? "m20-ask" : "m20-go"}" data-v="chip:${k}" ${busy || (k === "breaks" && !f) ? "disabled" : ""} title="${esc(calls > 1 ? t("m20.cost", {n: calls, m: m20Cost(calls).min}) : t("m20.cost1"))}">${esc(lbl)}</button>`; };
  return `<section class="panel m20-chat" aria-label="${esc(t("m20.chat.t"))}" data-anchor="m20-chat"><h3>${esc(t("m20.chat.t"))}</h3>
    <div class="row m20-chips">${chip("missing", t("m20.chip.missing"))}${chip("higher", t("m20.chip.higher"))}${chip("easier", t("m20.chip.easier"))}${chip("breaks", t("m20.chip.breaks", {x: f ? f.id : "…"}))}${chip("all", t("m20.chip.all"))}</div>
    <form class="row m20-askf" data-form="m20-ask"><label class="fld" style="flex:1 1 16em"><span class="sr20">${esc(t("m20.chat.ph"))}</span><input id="m20-q" type="text" placeholder="${esc(t("m20.chat.ph"))}" value="${esc(UI.qDraft["m20-q"] || "")}"></label><button class="btn sm" type="submit" ${busy ? "disabled" : ""}>${esc(t("m20.chat.send"))}</button></form>
    <p class="small muted">${esc(t("m20.chat.sub"))}</p></section>`;
}
function m20AlertHTML(p, a){
  const r = m20Route(p, a.route), stands = m20Stands(p, a), C = m20Carry(p), U = m20UI(p) || {};
  const how = t("m20.al.how." + a.how);
  return `<section class="panel m20-alert st-${esc(a.status)}" role="alert" data-anchor="m20-alert:${esc(a.id)}" id="m20a-${esc(a.id)}"><div class="small m20-ak"><span aria-hidden="true">⚠</span> ${esc(t("m20.al.k"))}${a.status === "later" ? " · " + esc(t("m20.al.later")) : ""}</div>
    <h3>${esc(t("m20.al.h", {x: r ? r.name : "", y: a.what}))}</h3>
    <dl class="m20-kv"><dt>${esc(t("m20.al.what"))}</dt><dd>“${esc(a.text)}” <span class="small muted">· ${esc(t("m20.al.src." + oneOf(a.kind, ["rule", "fact", "test", "finding"], "fact")))} · ${esc(fmtDate(a.at))}</span></dd>
      <dt>${esc(t("m20.al.bad"))}</dt><dd><b>${esc(how)}</b> · ${esc(a.why)}</dd>
      <dt>${esc(t("m20.al.stands"))}</dt><dd>${stands.length ? stands.map(s => `<button class="linkish" data-a="m20-open" data-v="card" data-id="${esc(s.id)}">${esc(s.id + " · " + s.name)}</button> ${m20Fit(s.fitN)}`).join(" · ") : esc(t("m20.al.none"))}</dd>
      <dt>${esc(t("m20.al.carry"))}</dt><dd>${esc(t("m20.al.carryv", {n: C.pct, f: C.facts, a: C.neutral, b: C.bound.length}))}</dd></dl>
    ${a.repair ? `<div class="m20-repair"><b>${esc(t(a.repair.ok ? "m20.al.rep.ok" : "m20.al.rep.no"))}</b> ${esc(a.repair.text)}${arr(a.repair.steps).length ? `<ol class="small">${a.repair.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}${a.repair.cost ? `<p class="small">${esc(t("m20.al.rep.cost", {x: a.repair.cost}))}</p>` : ""}${a.repair.ok ? `<button class="btn xs primary" data-a="m20-al" data-id="${esc(a.id)}" data-v="repaired">${esc(t("m20.al.rep.use"))}</button>` : ""}</div>` : busyHTML("map-repair")}
    ${U.keep === a.id ? `<form class="stack" data-form="m20-keep" data-id="${esc(a.id)}"><label class="fld"><span>${esc(t("m20.al.keepwhy"))}</span><textarea id="m20-keep-${esc(a.id)}" rows="2">${esc(t("m20.al.keepsug"))}</textarea></label><div class="row"><button class="btn sm primary" type="submit">${esc(t("m20.al.keep"))}</button><button class="btn sm ghost" type="button" data-a="m20-keepq" data-id="">${esc(t("btn.cancel"))}</button></div></form>` : ""}
    ${["open", "later"].includes(a.status) ? `<div class="row m20-alopts">${aiBtn("m20-repair", t("m20.al.repair"), "M", {key: "map-repair", attrs: `data-id="${esc(a.id)}"`})}<button class="btn xs" data-a="m20-al" data-id="${esc(a.id)}" data-v="map">${esc(t("m20.al.map"))}</button><button class="btn xs" data-a="m20-keepq" data-id="${esc(a.id)}">${esc(t("m20.al.keep"))}</button>${a.status === "open" ? `<button class="btn xs ghost" data-a="m20-al" data-id="${esc(a.id)}" data-v="later">${esc(t("m20.al.lateri"))}</button>` : ""}</div>` : `<p class="small">${esc(t("m20.al.st." + a.status))}${a.reason ? " · “" + esc(a.reason) + "”" : ""}</p>`}
    ${C.bound.length ? `<details class="small"><summary>${esc(t("m20.al.boundlist", {n: C.bound.length}))}</summary><ul>${C.bound.slice(0, 30).map(ref => `<li>${esc(m20RefLabel(p, ref))} <button class="btn xs ghost" data-a="m20-tag" data-ref="${esc(ref)}">${esc(t("m20.al.neutral"))}</button></li>`).join("")}</ul></details>` : ""}</section>`;
}
function m20DecHTML(p){
  const D = m20Decision(p); if (!D) return "";
  const nm = id => { const r = m20Route(p, id); return r ? r.id + " · " + r.name : id; };
  return `<section class="panel m20-dec" data-anchor="m20-dec"><div class="small muted"><span aria-hidden="true">✓</span> ${esc(t("m20.dec.k"))} · ${esc(fmtDate(D.at))}</div><h3>${esc(t("m20.dec.h", {x: nm(D.route)}))}</h3>
    <dl class="m20-kv"><dt>${esc(t("m20.dec.why"))}</dt><dd>${esc(D.why || t("m20.take.whysug0"))}</dd>
      <dt>${esc(t("m20.dec.cmp"))}</dt><dd>${D.compared.length ? esc(D.compared.map(nm).join(" · ")) : esc(t("m20.dec.nocmp"))}</dd>
      ${D.rejected.length ? `<dt>${esc(t("m20.dec.rej"))}</dt><dd>${esc(D.rejected.map(x => nm(x.id) + ": " + t("m20.rej." + x.why)).join(" · "))}</dd>` : ""}
      <dt>${esc(t("m20.dec.trip"))}</dt><dd>${D.trip.length ? `<ul>${D.trip.map(x => `<li>${esc(x.text)}</li>`).join("")}</ul>` : esc(t("m20.dec.notrip"))}</dd>
      <dt>${esc(t("m20.dec.switch"))}</dt><dd>${esc(D.switchCost || t("m20.unknown"))}</dd>
      ${D.higher ? `<dt>${esc(t("m20.dec.higher"))}</dt><dd>${esc(D.higher)}</dd>` : ""}</dl>
    ${D.recheck ? `<p class="small m20-why">${esc(t("m20.dec.recheck", {v: D.recheck.v}))}</p>` : ""}
    <p class="small muted">${esc(t("m20.dec.watch"))}</p></section>`;
}
function m20MapHTML(p){
  const M = m20Read(p), U = m20UI(p), vis = m20Sorted(p, m20Visible(p)), hidden = M.routes.filter(r => m20Status(p, r) === "blocked" && !M.rej[r.id]).length;
  const filt = `<div class="row m20-filters" role="group" aria-label="${esc(t("m20.flt.t"))}"><button class="chip tap" aria-pressed="${!!U.f.rules}" data-a="m20-f" data-v="rules">${esc(t("m20.flt.rules"))}${U.f.rules && hidden ? " · " + esc(t("m20.flt.hidden", {n: hidden})) : ""}</button><button class="chip tap" aria-pressed="${!!U.f.today}" data-a="m20-f" data-v="today">${esc(t("m20.flt.today"))}</button><button class="chip tap" aria-pressed="${!!U.f.free}" data-a="m20-f" data-v="free">${esc(t("m20.flt.free"))}</button>
    <label class="small m20-sort">${esc(t("m20.sort"))} <select data-a-change="m20-sort">${["fit", "cheap", "work", "fast", "high"].map(s => `<option value="${s}" ${U.sort === s ? "selected" : ""}>${esc(t("m20.sort." + s))}</option>`).join("")}</select></label></div>`;
  const shortBar = M.short.length >= 2 ? `<div class="row m20-shortbar"><button class="btn sm primary" data-a="m20-open" data-v="compare">${esc(t("m20.cmp.go", {n: M.short.length}))}</button><span class="small">${esc(M.short.map(id => { const r = m20Route(p, id); return r ? r.id + " · " + r.name : id; }).join(" · "))}</span></div>`
    : `<p class="small muted">${esc(t(M.short.length ? "m20.short.one" : "m20.short.hint"))}</p>`;
  const lanes = [1, 2, 3, 4].map(l => { const rs = vis.filter(r => r.lvl === l); if (!rs.length) return "";
    const key = "lane" + l, open = U.more[key], show = open ? rs : rs.slice(0, 5);
    return `<section class="m20-lane" aria-label="${esc(t("m20.lvl." + l))}"><h4>${esc(t("m20.lvl." + l))} · ${rs.length}</h4>${show.map(r => m20RouteRow(p, r)).join("")}${rs.length > show.length ? `<button class="btn xs ghost" data-a="m20-more" data-v="${key}">${esc(t("m20.more", {n: rs.length - show.length}))}</button>` : ""}</section>`; }).join("");
  const ny = M.notyet.length ? `<section class="m20-lane m20-ny" aria-label="${esc(t("m20.ny.t"))}"><h4>${esc(t("m20.ny.t"))} · ${M.notyet.length}</h4>${M.notyet.map(n => `<div class="m20-r st-notyet" id="m20r-${esc(n.id)}" tabindex="-1"><span class="m20-nm"><b>${esc(n.id + " · " + n.name)}</b></span><div class="m20-facts">${m20Badge("notyet")}<span class="small">${esc(t("m20.ny.blocker." + n.blocker))}</span></div>
      <dl class="m20-kv small"><dt>${esc(t("m20.ny.why"))}</dt><dd>${esc(n.why || t("m20.unknown"))} <span class="muted">(${esc(t("m20.ny.sure", {x: t("m20.conf." + n.sure)}))} · ${esc(n.evidence)})</span></dd><dt>${esc(t("m20.ny.how"))}</dt><dd>${esc(n.change || t("m20.unknown"))}</dd><dt>${esc(t("m20.ny.who"))}</dt><dd>${esc(t("m20.ny.who." + n.who))}</dd><dt>${esc(t("m20.ny.watch"))}</dt><dd>${esc(n.watch || t("m20.ny.watch0"))}</dd><dt>${esc(t("m20.ny.near"))}</dt><dd>${esc(n.near || t("m20.unknown"))}</dd></dl></div>`).join("")}</section>` : "";
  const rj = Object.keys(M.rej).filter(id => m20Route(p, id));
  const rejH = rj.length ? `<p class="small m20-rejl">${esc(t("m20.rej.list"))} ${esc(rj.map(id => { const r = m20Route(p, id); return r.id + " · " + r.name + " (" + t("m20.rej." + M.rej[id].why) + ")"; }).join(", "))} <button class="btn xs ghost" data-a="m20-unrej">${esc(t("m20.rej.back"))}</button></p>` : "";
  const alerts = M.alerts.filter(a => ["open", "later"].includes(a.status)).map(a => m20AlertHTML(p, a)).join("");
  const wait = stage20Waiting(p);
  const lastEv = M.events[0];
  return `${m20ConfirmHTML(p)}${m20ProgressHTML(p)}${alerts}${m20GoalStrip(p)}${m20CoverHTML(p)}${lastEv && ["round", "block", "goal", "corr", "alert"].includes(lastEv.kind) && M.rounds.length ? m20DiffHTML(p, lastEv) : ""}${m20DecHTML(p)}
    ${M.routes.length || M.notyet.length ? `${filt}${shortBar}<div class="m20-ladder">${lanes || `<p class="small muted">${esc(t("m20.none.vis"))}</p>`}${ny}</div>${rejH}` : ""}
    ${wait ? `<p class="small muted m20-wait">${esc(t("m20.wait", {n: wait}))}</p>` : ""}
    ${M.rounds.length ? m20ChatHTML(p) : ""}${m20EventsHTML(p)}`;
}
function m20EventsHTML(p){
  const E = m20Read(p).events; if (!E.length) return "";
  return `<details class="m20-evs small"><summary>${esc(t("m20.evs.t", {n: E.length}))}</summary><ul>${E.slice(0, 30).map(e => `<li><span class="muted">${esc(fmtDate(e.at))}</span> ${esc(e.text)}${arr(e.add).length ? " · +" + esc(e.add.join(", ")) : ""}${arr(e.fix).length ? " · ~" + esc(e.fix.join(", ")) : ""}</li>`).join("")}</ul></details>`;
}
function m20GoalStrip(p){
  const G = goal20Read(p), open = goal20Open(p), nev = factsActive(p, ["never"]);
  return `<section class="panel m20-goal" data-anchor="m20-goal"><div class="row"><b style="flex:1 1 14em">${esc(t("g20.k", {v: G.v}))}</b><button class="btn xs" data-a="m20-open" data-v="goal">${esc(t(open.length ? "g20.check" : "g20.change"))}</button></div>
    <p>${G.f.outcome ? esc(G.f.outcome) : `<span class="muted">${esc(t("g20.none"))}</span>`}${G.f.success ? ` <span class="small"><b>${esc(t("g20.f.success"))}:</b> ${esc(G.f.success)}</span>` : ""}</p>
    ${nev.length ? `<p class="small"><b>${esc(t("g20.nevers"))}</b> ${esc(nev.map(factText).join(" · "))}</p>` : ""}
    ${open.length ? `<p class="small m20-why">${esc(t(G.skip ? "g20.assumed" : "g20.open", {x: open.map(k => t(k === "nevers" ? "g20.nevers0" : "g20.f." + k)).join(", ")}))}</p>` : ""}</section>`;
}
function goal20HTML(p){
  const G = goal20Read(p), nev = factsActive(p, ["never", "must"]), P = G.pend;
  const rowH = k => `<div class="item g20-row" data-f="${k}">${stSlot(G.by[k] === "you" && str(G.f[k]).trim() ? "ok" : str(G.f[k]).trim() ? "as" : "todo")}<div class="body"><b class="small">${esc(t("g20.f." + k))}</b><span>${str(G.f[k]).trim() ? esc(G.f[k]) : `<span class="muted">${esc(t("g20.empty"))}</span>`}</span>
      <span class="small muted">${esc(G.by[k] === "you" ? t("g20.by.you") : str(G.f[k]).trim() ? t("g20.by.pt") : t("g20.f." + k + ".h"))}</span></div>${G.by[k] !== "you" && str(G.f[k]).trim() ? `<div class="qacts"><button class="btn xs primary" data-a="g20-ok" data-v="${k}">${ic("check")}${esc(t("g20.ok"))}</button></div>` : ""}</div>`;
  const diff = P ? `<section class="panel m20-gdiff" role="alert" data-anchor="g20-diff"><h3>${esc(t("g20.diff.t"))}</h3><ul class="small">${Object.entries(P.f).map(([k, v]) => `<li><b>${esc(t("g20.f." + k))}</b>: “${esc(G.f[k] || "—")}” → “${esc(v)}”</li>`).join("")}</ul>
      ${P.effects ? (() => { const E = arr(P.effects), c = e => E.filter(x => x.e === e), ch = m20Chosen(p), ce = ch && E.find(x => x.id === ch.id), nm = id => { const r = m20Route(p, id); return r ? r.id + " · " + r.name : id; };
        return `<p>${esc(t("g20.diff.sum", {a: c("rise").length, b: c("fall").length, c: c("out").length}))}</p><ul class="small m20-dl">${E.filter(x => x.e !== "same").map(x => `<li class="${x.e === "rise" ? "add" : "fix"}"><span aria-hidden="true">${x.e === "rise" ? "↑" : x.e === "fall" ? "↓" : "✕"}</span> ${esc(nm(x.id))}: ${esc(t("g20.e." + x.e))} · ${esc(x.why)}</li>`).join("")}</ul>${ch ? `<p><b>${esc(t("g20.diff.yours", {x: ch.name}))}</b> ${esc(t("g20.diff.y." + (ce ? ce.e : "same")))}</p>` : ""}${P.failed ? `<p class="small m20-why">${esc(t("g20.diff.failed"))}</p>` : ""}`; })() : busyHTML("map-goalfit")}
      <div class="row"><button class="btn sm primary" data-a="g20-take" ${P.effects ? "" : "disabled"}>${esc(t("g20.apply"))}</button><button class="btn sm ghost" data-a="g20-drop">${esc(t("g20.undo"))}</button><button class="btn sm ghost" data-a="m20-open" data-v="map">${esc(t("g20.showmap"))}</button></div></section>` : "";
  const form = UI.g20Edit === p.id ? `<form class="stack panel" data-form="g20-edit"><h3>${esc(t("g20.change"))}</h3>${M20_GOAL.map(k => `<label class="fld"><span>${esc(t("g20.f." + k))}</span><textarea id="g20-${k}" rows="2" placeholder="${esc(t("g20.f." + k + ".h"))}">${esc(G.f[k] || "")}</textarea></label>`).join("")}
      <div class="row"><button class="btn sm primary" type="submit">${ic("check")}${esc(t(m20Read(p).routes.length ? "g20.preview" : "btn.save"))}</button><button class="btn sm ghost" type="button" data-a="g20-edit">${esc(t("btn.cancel"))}</button></div><p class="small muted">${esc(t(m20Read(p).routes.length ? "g20.preview.sub" : "g20.save.sub"))}</p></form>` : "";
  return `${diff}<section class="panel g20" data-anchor="g20"><div class="row"><h3 style="flex:1 1 12em">${esc(t("g20.k", {v: G.v}))}</h3><button class="btn xs" data-a="g20-edit">${ic("edit")}${esc(t("g20.change"))}</button></div><p class="small muted">${esc(t("g20.sub"))}</p>
    <div class="list">${M20_GOAL.map(rowH).join("")}
      <div class="item g20-row" data-f="nevers">${stSlot(nev.length || G.noNevers ? "ok" : "todo")}<div class="body"><b class="small">${esc(t("g20.nevers"))}</b><span>${nev.length ? esc(nev.map(e => factKindLabel(e.kind) + ": " + factText(e)).join(" · ")) : G.noNevers ? esc(t("g20.nonevers")) : `<span class="muted">${esc(t("g20.nevers.h"))}</span>`}</span><span class="small muted">${esc(t("g20.nevers.src"))}</span></div>
        <div class="qacts"><button class="btn xs" data-a="facts-open">${esc(t("g20.nevers.add"))}</button>${nev.length ? "" : `<button class="btn xs ghost" data-a="g20-nonevers" aria-pressed="${G.noNevers}">${esc(t("g20.nonevers"))}</button>`}</div></div></div>
    ${G.hist.length ? `<details class="small"><summary>${esc(t("g20.hist", {n: G.hist.length}))}</summary><ul>${G.hist.slice().reverse().map(h => `<li>G${esc(String(h.v))} · ${esc(fmtDate(h.at))}: ${esc(trunc(str(h.f.outcome), 160))}</li>`).join("")}</ul></details>` : ""}   // ok:trunc a history line; the full goal is in that version
    <div class="row">${goal20Clear(p) ? `<span class="small"><span aria-hidden="true">✓</span> ${esc(t("g20.clear"))}</span>` : `<span class="small m20-why">${esc(t("g20.open", {x: goal20Open(p).map(k => t(k === "nevers" ? "g20.nevers0" : "g20.f." + k)).join(", ")}))}</span>${G.skip ? "" : `<button class="btn xs ghost" data-a="g20-skip">${esc(t("g20.skip"))}</button>`}`}<button class="btn sm primary" data-a="m20-open" data-v="map">${esc(t("g20.tomap"))}</button></div></section>${form}`;
}
function m20CardHTML(p, id){
  const r = m20Route(p, id); if (!r) return `<p class="small muted">${esc(t("m20.gone"))}</p>`;
  if (!r.fit && r.blocker) return `<p class="small muted">${esc(t("m20.gone"))}</p>`;
  const M = m20Read(p), st = m20Status(p, r), star = m20Star(p), B = m20Breaks(p, r), un = t("m20.unknown");
  const G = (k, rows) => `<section class="m20-grp" aria-labelledby="m20g-${k}"><h4 id="m20g-${k}">${esc(t("m20.g." + k))}</h4><dl class="m20-kv">${rows.filter(Boolean).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${b}</dd>`).join("")}</dl></section>`;
  const E = s => str(s).trim() ? esc(s) : `<span class="muted">${esc(un)}</span>`;
  const rules = factsActive(p, FACT_RULES);
  return `<div class="row m20-cardbar"><button class="btn xs" data-a="m20-open" data-v="map" data-id="${esc(r.id)}">← ${esc(t("m20.back"))}</button><span style="flex:1 1 1em"></span>
      ${st === "blocked" ? "" : `<button class="btn xs" aria-pressed="${M.short.includes(r.id)}" data-a="m20-short" data-id="${esc(r.id)}">${M.short.includes(r.id) ? "★ " + esc(t("m20.short.off")) : "☆ " + esc(t("m20.short.on"))}</button>`}
      <button class="btn xs" data-a="m20-ask" data-v="prove:${esc(r.id)}" ${AI.running.size ? "disabled" : ""}>${esc(t("m20.prove"))}</button>
      ${st === "blocked" || st === "notyet" || M.chosen === r.id ? "" : `<button class="btn xs primary" data-a="m20-open" data-v="take" data-id="${esc(r.id)}">${esc(t("m20.take"))}</button>`}</div>
    ${m20ConfirmHTML(p)}${busyHTML("map-prove")}
    <article class="panel m20-card" data-anchor="m20-card:${esc(r.id)}"><h3>${star && star.id === r.id ? "★ " : ""}${esc(r.id + " · " + r.name)}</h3><p>${E(r.line)}</p><div class="m20-facts">${m20Badge(st)}${r.lib ? `<span class="m20-badge b-prev">${esc(t("m20.lib.badge", {d: str(r.libOut && r.libOut.since)}))}</span>` : ""}</div>
    ${B.length ? `<p class="m20-why">${esc(t("m20.blocked.why", {x: B.map(b => b.rule).join(" · ")}))}</p>` : ""}
    ${r.proof ? `<p class="m20-proof small"><b>${esc(t("m20.prove.h"))}</b> ${esc(r.proof.text)} → <b>${esc(t("m20.prove.v." + r.proof.verdict))}</b> · ${esc(r.proof.why)} <span class="muted">(${esc(r.proof.how || t("m20.ev.reason"))} · ${esc(fmtDate(r.proof.at))})</span>${r.proof.check ? `<br>${esc(t("m20.prove.check", {x: r.proof.check}))}` : ""}</p>` : ""}
    ${G("a", [[t("m20.f.fam"), E(r.fam)], [t("m20.f.day"), arr(r.day).length ? `<ol>${r.day.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : E("")], [t("m20.f.lvl"), esc(t("m20.lvl." + r.lvl)) + (r.lvlWhy ? " · " + esc(r.lvlWhy) : "")], [t("m20.f.where"), esc(t("m20.where." + r.where) + " · " + t("m20.how." + r.how))]])}
    ${G("b", [[t("m20.f.fit"), arr(r.fit).length ? `<ul>${r.fit.map(f => `<li><span aria-hidden="true">${f.v === "yes" ? "✓" : f.v === "part" ? "◐" : "✗"}</span> ${esc(t("g20.f." + f.f))}: ${esc(t("m20.fitv." + f.v))}${f.why ? " · " + esc(f.why) : ""}</li>`).join("")}</ul>` : m20Fit(r.fitN)],
      [t("m20.f.rules"), rules.length ? `<ul>${rules.map(e => { const b = B.find(x => x.id === e.id); return `<li><span aria-hidden="true">${b ? "✗" : "✓"}</span> ${esc(factText(e))}: ${esc(t(b ? "m20.rule.broken" : "m20.rule.kept"))}${b && b.s ? " · “" + esc(b.s) + "”" : ""}</li>`; }).join("")}</ul>` : esc(t("m20.rule.none"))], [t("m20.f.notv"), E(r.notv)]])}
    ${G("c", [[t("m20.a.claude"), E(r.actors.claude)], [t("m20.a.hands"), E(r.actors.hands)], [t("m20.a.helper"), r.helper ? esc(r.helper.name + ": " + r.helper.does + (r.helper.effort ? " · " + r.helper.effort : "") + (r.helper.perms ? " · " + t("m20.helper.perms", {x: r.helper.perms}) : "")) : E(r.actors.helper)], [t("m20.a.you"), E(r.actors.you) + `<br><span class="small">${esc(t("m20.work.v", {a: m20Min(r.setupMin), b: t("m20.minw", {n: r.weeklyMin})}))}</span>`], [t("m20.a.others"), E(r.actors.others)],
      str(r.actors.hands).trim() || r.helper || str(r.actors.helper).trim() ? [t("m20.a.where"), esc(t("m20.a.desktop"))] : null])}
    ${G("d", [[t("m20.c.first"), E(r.first)], [t("m20.f.money"), esc([r.money.once && t("m20.money.once", {x: r.money.once}), r.money.monthly && t("m20.money.month", {x: r.money.monthly}), r.money.perUse && t("m20.money.use", {x: r.money.perUse})].filter(Boolean).join(" · ") || un) + (r.money.who ? " · " + esc(t("m20.money.who", {x: r.money.who})) : "") + (r.money.free ? `<br><span class="small">${esc(r.money.free)}</span>` : "")], [t("m20.f.usage"), E(r.usage)]])}
    ${G("e", [[t("m20.f.risks"), arr(r.risks).length ? `<ul>${r.risks.map(x => `<li>${esc(x.text)} <span class="small muted">(${esc(t("m20.risk.li", {l: t("m20.lmh." + x.l), i: t("m20.lmh." + x.i)}))})</span></li>`).join("")}</ul>` : E("")],
      [t("m20.f.assume"), arr(r.assume).length ? `<ul>${r.assume.map(a => `<li>${esc(a.text)} <span class="small muted">· ${esc(t("m20.chk." + (a.checked || "none")))}</span></li>`).join("")}</ul>` : E("")], [t("m20.f.lock"), E(r.lock)], [t("m20.f.rev"), E(r.rev)], [t("m20.f.maint"), E(r.maint)]])}
    ${G("f", [[t("m20.f.data"), E(r.data)], [t("m20.f.logins"), E(r.logins)]])}
    ${G("g", [[t("m20.f.status"), m20Badge(st)], [t("m20.f.conf"), esc(t("m20.conf." + r.conf)) + " · " + E(r.evidence)], r.lib ? [t("m20.f.lib"), esc(t("m20.lib.out", {d: str(r.libOut && r.libOut.since), c: r.libOut && r.libOut.checks != null ? r.libOut.checks + " %" : "?", n: r.libOut ? num(r.libOut.incidents) : 0}))] : null,
      [t("m20.f.found"), esc(r.found && r.found.lens === "lib" ? t("m20.found.lib") : t("m20.found.v", {x: t("m20.lens." + (M20_LENSES.includes(r.found && r.found.lens) ? r.found.lens : "red")), n: r.found ? r.found.round : 0})) + (arr(r.lenses).length > 1 ? " · " + esc(t("m20.found.also", {n: r.lenses.length})) : "")],
      arr(r.corr).length ? [t("m20.f.corr"), `<ul>${r.corr.map(c => `<li>${esc(c.text)} <span class="small muted">· ${esc(fmtDate(c.at))}</span></li>`).join("")}</ul>`] : null])}
    ${G("h", [[t("m20.f.up"), E(r.up)], [t("m20.f.down"), E(r.down)], [t("m20.f.star"), star ? (star.id === r.id ? esc(t("m20.star.me", {x: arr(r.risks)[0] ? r.risks[0].text : t("m20.unknown")})) : esc(t("m20.star.other", {x: star.id + " · " + star.name}))) : esc(t("m20.star.wait"))]])}
    </article>`;
}
function m20CompareHTML(p){
  const M = m20Read(p), rs = M.short.map(id => m20Route(p, id)).filter(Boolean);
  if (rs.length < 2) return `<p class="small muted">${esc(t("m20.short.hint"))}</p>`;
  const w = r => num(r.setupMin) + 4 * num(r.weeklyMin);
  const rows = [["fit", r => num(r.fitN), r => m20Fit(r.fitN), "max"], ["work", w, r => esc(t("m20.work.v", {a: m20Min(r.setupMin), b: t("m20.minw", {n: r.weeklyMin})})), "min"], ["money", m20Money, r => esc(str(r.money.monthly) || "?"), "min"],
    ["first", r => r.first, r => esc(r.first || "?")], ["status", r => m20Status(p, r), r => m20Badge(m20Status(p, r))], ["goal", r => arr(r.fit).map(f => f.f + f.v).join(), r => esc(arr(r.fit).map(f => t("g20.f." + f.f) + " " + t("m20.fitv." + f.v)).join(" · "))],
    ["risks", r => arr(r.risks).map(x => x.text).join(), r => esc(arr(r.risks).map(x => x.text).join(" · "))], ["assume", r => arr(r.assume).map(x => x.text).join(), r => esc(arr(r.assume).map(x => x.text).join(" · "))],
    ["rev", r => r.rev, r => esc(r.rev)], ["data", r => r.data, r => esc(r.data)], ["conf", r => r.conf, r => esc(t("m20.conf." + r.conf))], ["lvl", r => r.lvl, r => esc(t("m20.lvl." + r.lvl)), "max"]];
  const U = m20UI(p) || {}; let same = 0;
  const body = rows.map(([k, key, show, best]) => { const v = rs.map(key); const eq = v.every(x => JSON.stringify(x) === JSON.stringify(v[0]));
    if (eq) same++; if (eq && !U.more.same) return "";
    const b = best ? (best === "max" ? Math.max(...v.map(num)) : Math.min(...v.map(num))) : null;
    return `<tr><th scope="row">${esc(t("m20.cmp." + k))}</th>${rs.map((r, i) => { const isB = best && !eq && num(v[i]) === b; return `<td class="${isB ? "best" : ""}">${show(r)}${isB ? ` <b class="m20-best">(${esc(t(best === "max" ? "m20.cmp.best" : "m20.cmp.lowest"))})</b>` : ""}</td>`; }).join("")}</tr>`; }).join("");
  const star = m20Star(p);
  return `<div class="row"><button class="btn xs" data-a="m20-open" data-v="map">← ${esc(t("m20.back"))}</button></div><h3>${esc(t("m20.cmp.t"))}</h3>
    <div class="m20-tbl"><table><thead><tr><th></th>${rs.map(r => `<th scope="col">${esc(r.id + " · " + r.name)}</th>`).join("")}</tr></thead><tbody>${body}
      <tr><th></th>${rs.map(r => `<td><button class="btn xs" data-a="m20-ask" data-v="prove:${esc(r.id)}">${esc(t("m20.prove"))}</button> ${M.chosen === r.id ? `<b>${esc(t("m20.chosen"))}</b>` : `<button class="btn xs primary" data-a="m20-open" data-v="take" data-id="${esc(r.id)}">${esc(t("m20.take"))}</button>`}</td>`).join("")}</tr></tbody></table></div>
    ${same ? `<p class="small muted">${esc(t("m20.cmp.same", {n: same}))} <button class="btn xs ghost" data-a="m20-more" data-v="same">${esc(t(U.more.same ? "m20.cmp.fold" : "m20.cmp.show"))}</button></p>` : ""}
    ${m20ConfirmHTML(p)}${busyHTML("map-prove")}
    ${star ? `<section class="panel"><div class="small muted">★ ${esc(t("m20.star.t"))}</div><p>${esc(t("m20.star.cmp", {x: star.id + " · " + star.name, y: arr(star.risks)[0] ? star.risks[0].text : t("m20.unknown")}))}</p></section>` : ""}`;
}
function m20TakeHTML(p, id){
  const r = m20Route(p, id), M = m20Read(p); if (!r) return `<p class="small muted">${esc(t("m20.gone"))}</p>`;
  const others = M.short.filter(x => x !== id), higher = M.routes.filter(x => x.lvl > r.lvl && !["blocked", "notyet"].includes(m20Status(p, x)) && !M.rej[x.id]).sort((a, b) => b.lvl - a.lvl)[0];
  const trip = [...arr(r.assume).slice(0, 2).map(a => t("m20.take.tripsug", {x: a.text})), ...arr(r.risks).filter(x => x.l === "high").slice(0, 1).map(x => t("m20.take.risksug", {x: x.text}))].join("\n");
  return `<div class="row"><button class="btn xs" data-a="m20-open" data-v="card" data-id="${esc(r.id)}">← ${esc(t("m20.back.card"))}</button></div>
    <form class="panel stack m20-take" data-form="m20-take" data-id="${esc(r.id)}"><h3>${esc(t("m20.take.h", {x: r.id + " · " + r.name}))}</h3><p class="small muted">${esc(t("m20.take.sub"))}</p>
      <label class="fld"><span>${esc(t("m20.dec.why"))}</span><textarea id="m20-why" rows="2">${esc(t("m20.take.whysug", {f: num(r.fitN), w: m20Min(r.setupMin), m: str(r.money.monthly) || "?"}))}</textarea></label>
      <div class="fld"><span>${esc(t("m20.dec.cmp"))}</span><p class="small">${others.length ? esc(others.map(o => { const x = m20Route(p, o); return x ? x.id + " · " + x.name : o; }).join(" · ")) : esc(t("m20.dec.nocmp"))}</p></div>
      ${others.map(o => { const x = m20Route(p, o); return x ? `<label class="fld"><span>${esc(t("m20.take.rejq", {x: x.id + " · " + x.name}))}</span><select id="m20-rw-${esc(o)}">${M20_REJ.map(k => `<option value="${k}" ${(M.rej[o] || {}).why === k ? "selected" : ""}>${esc(t("m20.rej." + k))}</option>`).join("")}</select></label>` : ""; }).join("")}
      <label class="fld"><span>${esc(t("m20.dec.trip"))}</span><textarea id="m20-trip" rows="3">${esc(trip)}</textarea><span class="small muted">${esc(t("m20.take.tripsub"))}</span></label>
      ${higher ? `<label class="fld"><span>${esc(t("m20.take.higher", {x: higher.id + " · " + higher.name}))}</span><textarea id="m20-higher" rows="2">${esc(t("m20.take.highsug"))}</textarea></label>` : `<input type="hidden" id="m20-higher" value="${esc(t("m20.take.highest"))}">`}
      <div class="fld"><span>${esc(t("m20.dec.switch"))}</span><p class="small">${esc(r.rev || t("m20.unknown"))}</p></div>
      <div class="row"><button class="btn sm primary" type="submit">${ic("check")}${esc(t("m20.take.go"))}</button><span class="small muted">${esc(t("m20.take.rp"))}</span></div></form>`;
}
function m20ViewHTML(p){
  const U = m20UI(p), M = m20Read(p);
  const tabs = [["goal", t("g20.tab")], ["map", t("m20.tab", {n: M.routes.length})], ["compare", t("m20.cmp.tab", {n: M.short.length})]];
  const v = U.v === "card" ? m20CardHTML(p, U.id) : U.v === "compare" ? m20CompareHTML(p) : U.v === "take" ? m20TakeHTML(p, U.id) : U.v === "goal" ? goal20HTML(p) : m20MapHTML(p);
  return `<div class="pg m20-view" data-page="map20" data-anchor="page-map20">${pgBar(p)}<header class="pg-head"><h2>${ic("layers")} ${esc(t("m20.title"))}</h2></header>
    ${stage20StripHTML(p)}<details class="small st20-d"><summary>${esc(t("st20.rows", {x: t("st20.s." + stage20Of(p))}))}</summary>${stage20RowsHTML(p, stage20Of(p))}</details>
    <nav class="row m20-tabs" aria-label="${esc(t("m20.title"))}">${tabs.map(([k, l]) => `<button class="btn xs ${U.v === k || (k === "map" && ["card", "take"].includes(U.v)) ? "primary" : "ghost"}" data-a="m20-open" data-v="${k}" aria-current="${U.v === k}">${esc(l)}</button>`).join("")}</nav>
    <div class="m20-body">${v}</div></div>`;
}

/* ---------- 9. wiring: the page bar, the Next bar, navigation ---------- */
{ const orig = pgBar; pgBar = function(p){
    let h = orig(p); const on = !!m20UI(p), M = m20Read(p);
    if (!stage20On(p) && !M.routes.length) return h;
    if (on) h = h.replace(/(class="sp-st [a-z]+ )here"/g, '$1"').replace(/aria-current="true"/g, 'aria-current="false"');
    const seen = UI.m20Seen && UI.m20Seen[p.id], fresh = M.events.length && M.events[0].id !== seen && !on ? M.events.findIndex(e => e.id === seen) : 0;
    const b = `<span class="sp-line"></span><button class="btn xs ghost sp-map20 ${on ? "sel" : ""}" data-a="m20-open" data-v="map" aria-current="${on}">${ic("layers")}<span>${esc(t("m20.bar", {n: M.routes.length}))}${fresh ? " · " + esc(t("m20.bar.new", {n: fresh < 0 ? M.events.length : fresh})) : ""}</span></button>`;
    return /<\/div><\/nav>/.test(h) ? h.replace(/<\/div><\/nav>/, b + "</div></nav>") : h + b; }; }
{ const orig = modeBody; modeBody = function(p){ return p && m20UI(p) && !UI.factsView ? m20ViewHTML(p) : orig(p); }; }
{ const orig = pgOpen; pgOpen = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = goRef; goRef = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = popNav; popNav = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = factsOpen; factsOpen = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["home"]; ACTIONS["home"] = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["rows-open"]; ACTIONS["rows-open"] = function(){ UI.m20 = null; return orig.apply(this, arguments); }; }
{ const orig = openProject; openProject = function(){ UI.m20 = null; UI.g20Edit = null; return orig.apply(this, arguments); }; }
{ const orig = nx20HTML; nx20HTML = function(p){
    const h = orig(p), L = m20Read(p).alerts.filter(a => a.status === "later");
    if (!L.length) return h;
    const r = m20Route(p, L[0].route);
    return h.replace('<div class="row nx20-next">', `<div class="rc20 m20-later" role="status"><span class="rc20-ok"><span aria-hidden="true">⚠</span> ${esc(t("m20.al.k"))}</span><span class="rc20-what">${esc(t("m20.al.h", {x: r ? r.name : "", y: L[0].what}))}</span><button class="btn xs" data-a="m20-open" data-v="alert">${esc(t("m20.al.look"))}</button></div><div class="row nx20-next">`); }; }
MORE_ITEMS.splice(1, 0, {a: "m20-open", icon: "layers", l: "m20.title"});

Object.assign(ACTIONS, {
  "m20-open": (el) => { const p = curP(); if (!p) return; const v = str(el.dataset.v) || "map"; if (v === "alert"){ m20Open(p, "map"); const a = m20Read(p).alerts.find(x => ["open", "later"].includes(x.status)); if (a) focusSoon("m20a-" + a.id); return; } m20Open(p, v, el.dataset.id || null); },
  "m20-goto": (el) => { const p = curP(); if (p) m20Open(p, "map", el.dataset.id); },
  "m20-f": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.f[el.dataset.v] = !U.f[el.dataset.v]; render(); },
  "m20-more": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.more[el.dataset.v] = !U.more[el.dataset.v]; render(); },
  "m20-ask": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.confirm = str(el.dataset.v); render(); focusSoon("m20-cf-go"); },
  "m20-cancel": () => { const p = curP(), U = p && m20UI(p); if (!U) return; U.confirm = null; render(); },
  "m20-go": (el) => { const p = curP(); if (!p) return; const k = str(el.dataset.v), U = m20UI(p); if (U) U.confirm = null;
    if (k === "full" || k === "dig") m20Round(p, {kind: k === "full" && !m20Read(p).rounds.length ? "full" : "dig"});   // the first round: all six angles; later ones: a new pair
    else if (/^chip:/.test(k)) m20Chip(p, k.slice(5));
    else if (/^prove:/.test(k)) m20Prove(p, k.slice(6));
    render(); },
  "m20-stop": () => { M20RUN.stop = true; for (const k of M20RUN.keys) stopAI(k); render(); },   // the calls not started yet never start
  "m20-short": (el) => { const p = curP(); if (!p) return; m20Short(p, el.dataset.id); touch(p); render(); },
  "m20-rej": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.rej = U.rej === el.dataset.id ? null : el.dataset.id; render(); },
  "m20-rejwhy": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; m20Reject(p, el.dataset.id, el.dataset.v); U.rej = null; touch(p); render(); },
  "m20-unrej": () => { const p = curP(); if (!p) return; const M = m20Of(p); for (const k of Object.keys(M.rej)) if (!M.rej[k].dec) delete M.rej[k]; touch(p); render(); },
  "m20-repair": (el) => { const p = curP(); if (p) m20Repair(p, el.dataset.id); },
  "m20-al": (el) => { const p = curP(); if (!p) return; m20AlertSet(p, el.dataset.id, el.dataset.v); touch(p); render(); if (el.dataset.v === "map") m20Open(p, "map"); },
  "m20-keepq": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.keep = el.dataset.id || null; render(); if (U.keep) focusSoon("m20-keep-" + U.keep); },
  "m20-tag": (el) => { const p = curP(); if (!p) return; const M = m20Of(p), k = str(el.dataset.ref); M.tags[k] = "n"; touch(p); render(); },
  "g20-ok": (el) => { const p = curP(); if (!p) return; goal20Confirm(p, str(el.dataset.v)); render(); },
  "g20-edit": () => { const p = curP(); if (!p) return; UI.g20Edit = UI.g20Edit === p.id ? null : p.id; render(); if (UI.g20Edit) focusSoon("g20-outcome"); },
  "g20-nonevers": () => { const p = curP(); if (!p) return; const G = goal20Of(p); G.noNevers = !G.noNevers; if (G.noNevers) rcpt20(p, t("g20.nonevers"), t("g20.where")); touch(p); render(); },
  "g20-skip": () => { const p = curP(); if (!p) return; goal20Of(p).skip = true; touch(p); m20Open(p, "map"); },
  "g20-take": () => { const p = curP(); if (p) goal20Take(p); },
  "g20-drop": () => { const p = curP(); if (!p) return; goal20Of(p).pend = null; touch(p); render(); }
});
["m20-open", "m20-goto", "m20-f", "m20-more", "m20-ask", "m20-cancel", "m20-stop", "m20-rej", "m20-keepq", "g20-edit", "m20-go", "m20-repair"].forEach(a => ACT_NO.add(a));
Object.assign(CHANGES, { "m20-sort": (el) => { const p = curP(), U = p && m20UI(p); if (!U) return; U.sort = oneOf(el.value, ["fit", "cheap", "work", "fast", "high"], "fit"); render(); } });
FORMS["m20-ask"] = f => { const p = curP(); if (!p) return; const q = str((f.querySelector("#m20-q") || {}).value).trim(); if (!q){ toast(t("m20.chat.need"), "err"); return; } delete UI.qDraft["m20-q"]; m20Chip(p, "ask", q); render(); };
FORMS["m20-keep"] = f => { const p = curP(); if (!p) return; const id = f.dataset.id, w = str((f.querySelector("#m20-keep-" + id) || {}).value).trim(); if (!w){ toast(t("m20.al.keepneed"), "err"); return; } m20AlertSet(p, id, "kept", {reason: w}); const U = m20UI(p); if (U) U.keep = null; touch(p); render(); };
FORMS["m20-take"] = f => { const p = curP(); if (!p) return; const id = f.dataset.id, M = m20Read(p), v = s => str((f.querySelector(s) || {}).value);
  const rejWhy = {}; for (const o of M.short.filter(x => x !== id)) rejWhy[o] = v("#m20-rw-" + o);
  const D = m20Take(p, id, {why: v("#m20-why"), trip: v("#m20-trip").split("\n"), higher: v("#m20-higher"), rejWhy}); if (!D) return;
  touch(p); m20Open(p, "map"); };
FORMS["g20-edit"] = f => { const p = curP(); if (!p) return; const o = {}; for (const k of M20_GOAL){ const el = f.querySelector("#g20-" + k); if (el) o[k] = str(el.value); }
  UI.g20Edit = null; goal20Propose(p, o).catch(e => onAppError(e && e.message, "goal:propose")); render(); };
document.addEventListener("input", e => { const el = e.target; if (el && el.id === "m20-q") UI.qDraft["m20-q"] = el.value; });

/* ---------- 10. the look (text first; status by word and sign, never by colour alone; 24 px targets; no sideways scroll on a phone) ---------- */
const V200M_CSS = `
.sr20{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.st20{display:flex;flex-wrap:wrap;gap:4px;list-style:none;margin:4px 0 6px;padding:0}
.st20-s{font-size:12.5px;padding:2px 9px;border-radius:99px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.st20-s.done{color:var(--ok);border-color:var(--ok)}
.st20-s.now{color:var(--accent);border-color:var(--accent);font-weight:600}
.st20-rows{list-style:none;margin:4px 0;padding:0;display:flex;flex-direction:column;gap:2px}
.st20-rows li.ok{color:var(--ok)}
.m20-tabs{gap:6px;margin:6px 0}
.m20-body{display:flex;flex-direction:column;gap:10px}
.m20-body>.panel,.m20-body>section{margin:0}
.m20-sat{font-weight:600;margin:0 0 4px}
.m20-cost{font-weight:400;opacity:.85}
.m20-filters{gap:6px;align-items:center}
.m20-filters .chip.tap[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft);color:var(--fg)}
.m20-sort select{min-height:24px}
.m20-ladder{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17em),1fr));gap:12px;align-items:start}
.m20-lane{display:flex;flex-direction:column;gap:6px;min-width:0}
.m20-lane h4{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.m20-r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--bg-2);min-height:44px}
.m20-r .m20-nm{font-weight:600;min-height:24px;overflow-wrap:break-word}
.m20-r .m20-acts{display:flex;gap:4px;align-items:start}
.m20-r .m20-acts .iconbtn{border:1px solid var(--line);min-width:30px;min-height:30px}
.m20-r .m20-sl[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.m20-r .m20-facts,.m20-card .m20-facts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12.5px}
.m20-r.short{border-color:var(--accent)}
.m20-r.chosen{border-color:var(--ok);box-shadow:0 0 0 1px var(--ok)}
.m20-r.st-blocked{opacity:.7;background:repeating-linear-gradient(135deg,transparent 0 8px,var(--line) 8px 9px)}
.m20-r.st-blocked .m20-nm{text-decoration:line-through}
.m20-r .m20-why,.m20-r .m20-rejq,.m20-r dl{grid-column:1/-1;margin:0}
.m20-why{color:var(--warn)}
.m20-rejq{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.m20-badge{font-size:11.5px;border-radius:99px;padding:1px 8px;border:1px solid currentColor;white-space:nowrap}
.b-today{color:var(--ok)}.b-work{color:var(--accent)}.b-helper{color:var(--warn)}.b-notyet{color:var(--muted)}.b-blocked{color:var(--crit)}.b-prev{color:var(--warn)}.b-corr{color:var(--warn)}
.m20-fit{letter-spacing:1px;color:var(--accent)}
.m20-kv{display:grid;grid-template-columns:minmax(7em,30%) minmax(0,1fr);gap:4px 12px;margin:4px 0}
.m20-kv dt{color:var(--muted)}.m20-kv dd{margin:0;overflow-wrap:break-word;min-width:0}
.m20-kv ul,.m20-kv ol{margin:0;padding-left:1.2em}
.m20-grp h4{margin:10px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}
.m20-card h3{margin:0 0 4px}
.m20-cardbar{gap:6px;flex-wrap:wrap}
.m20-tbl{overflow-x:auto;max-width:100%}
.m20-tbl table{border-collapse:collapse;font-size:13px;width:100%;min-width:min(100%,32em)}
.m20-tbl th,.m20-tbl td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:break-word}
.m20-tbl td.best{color:var(--ok)}
.m20-dl{list-style:none;padding:0;margin:4px 0}
.m20-dl .add{color:var(--ok)}.m20-dl .fix{color:var(--warn)}
.m20-alert{border:1px solid var(--warn);background:var(--warn-soft)}
.m20-alert .m20-ak{font-weight:600;color:var(--warn);text-transform:uppercase;letter-spacing:.05em}
.m20-alopts,.m20-chips{gap:6px;flex-wrap:wrap}
.m20-dec{border:1px solid var(--ok)}
.m20-confirm{border:1px solid var(--accent)}
.m20-goal p{margin:2px 0}
.m20-gdiff{border:1px solid var(--accent)}
.sp-map20.sel{box-shadow:inset 0 0 0 2px var(--accent)}
.pg-bar .sp-map20{flex:0 0 auto;white-space:nowrap}
.g20-row .body{flex:1 1 18em;max-width:100%;display:flex;flex-direction:column;gap:2px;overflow-wrap:break-word}
.m20-take textarea,.g20 textarea{width:100%}
@media (max-width:600px){.m20-kv{grid-template-columns:minmax(0,1fr)}.m20-kv dt{margin-top:4px}}
`;
function v200mCss(){ try{ if (document.getElementById("v200m-css")) return; const s = document.createElement("style"); s.id = "v200m-css"; s.textContent = V200M_CSS; (document.head || document.documentElement).appendChild(s); }catch(e){ console.warn("2.0 map: no styles", e); } }   // ok:catch without its sheet the map still works, plainer
v200mCss();
