/* ===================== 2.0 Part A: the facts book (one per project), the rules channel, ask once, contradictions =====================
   The owner (2 Nov 2026): "We never log in to Google or Samsung — second time I have to tell this — find why and fix it" and
   "projects dont get other porjects rules, never". Why it happened: the rule lived in notes / answers / constraints as text with a low
   priority, the budget logic could leave it out and many steps asked projectContext for a subset (`only`) without it.
   1. The facts book (`p.ledger`, one per project, never shared): entries never / must / fact / decision / tool rule, each with the
      owner's words, PT's short form, where it came from, the date, and a status (active / replaced / withdrawn). A panel to see, add,
      edit and withdraw (the page "Facts book" next to Decisions, and More ⋯). factsBodyHTML(p) is the panel without the page, so a
      chat workspace can show it later as its "Decided" tab. "Find rules in this project": one AI pass proposes entries from what the
      project already holds (north star constraints, not in this version, constitution, notes, interview answers, picks and decisions);
      the owner ticks them and adds them in one batch (one Undo step).
   2. The rules channel: every project prompt (buildPrompt with proj) carries <your_rules> (never / must) and <your_facts> right after its
      task line, whole, also when the caller passes `only` (they are not part of projectContext, so its budget logic never sees them).
      The output check (runAI): before a proposal is shown, code looks for a rule's key words in a sentence that is not a negation (a
      "must" rule: its words in a negated sentence); a hit gets one quick-tier confirm; a confirmed violation is asked again once through
      runAI's check/repair path; what still breaks a rule is left out (recorded in the facts book) or, for an option of a pick, shown
      greyed as "blocked by your rule" and cannot be taken.
   3. Ask once: questions PT made (picks, interview) are matched against the answered questions, picks, decisions and active facts before
      they are shown (bigram similarity as pickSame; one quick-tier check only for the unclear ones); answered ones are not asked again
      and show "Already known: … (change)".
   4. Contradictions: a new or changed entry gets one quick-tier check against the active entries; a conflict shows both, quoted, with
      keep A / keep B / keep both.
   5. The workspace profile is no longer part of project prompts (core.js); an entry of it is copied into one project on request
      ("Copy into this project"), where it becomes that project's fact. */
const FACT_KINDS = ["never", "must", "fact", "decision", "tool"];
const FACT_RULES = ["never", "must"];
const FACT_SRC = ["you", "ns", "oos", "const", "note", "qa", "pick", "dec", "profile"];
const FACT_PROPS_MAX = 24, FACT_KNOWN_MAX = 40, FACT_BLOCKED_MAX = 40, FACT_HITS_MAX = 12, FACT_SRC_MAX = 60000;
/* a sentence that says no: the rule's words in it are not a proposal to break a never (and they break a must) */
const FACT_NEG = /\b(no|not|without|never|don't|doesn't|won't|cannot|can't|avoid|kein|keine|keinen|keinem|ohne|nicht|nie|niemals)\b|n't\b|不|没有|无需|禁止|绝不|别/i;
const FACT_STOP = new Set("a an the of to for in on at and or is are be will would should can could does do did which what who how when where your you we our us i me my this that these those with from it its by as into onto any all every only also than then there here never must always no not without don't doesn't won't avoid ever use using used make made get let lets via per tool tools thing things one der die das ein eine einer eines einen und oder ist sind wird werden soll sollte sollen kann können wir uns unser ich mich mein du dein deine mit von für im in am an auf den dem des zu zum zur nie niemals immer muss müssen kein keine keinen ohne nicht nur auch alle jede jeder jedes es".split(" "));

/* ---------- 0. the book ---------- */
{ const orig = blankProject; blankProject = function(name){ const p = orig(name); p.ledger = {v: 1, entries: [], props: [], conflicts: [], known: [], blocked: []}; return p; }; }   // ok:field the template default (normalizeProject fills it for older projects)
function factsRead(p){ const L = p && p.ledger; return L && typeof L === "object" ? {entries: arr(L.entries), props: arr(L.props), conflicts: arr(L.conflicts), known: arr(L.known), blocked: arr(L.blocked)} : {entries: [], props: [], conflicts: [], known: [], blocked: []}; }
function factsOf(p){ if (!p.ledger || typeof p.ledger !== "object") p.ledger = {v: 1}; const L = p.ledger; for (const k of ["entries", "props", "conflicts", "known", "blocked"]) L[k] = arr(L[k]); L.v = 1; return L; }   // ok:field the book's own default (blankProject has it; older projects get it here)
function factsActive(p, kinds){ return factsRead(p).entries.filter(e => e && e.status === "active" && (!kinds || kinds.includes(e.kind))); }
function factById(p, id){ return factsRead(p).entries.find(e => e.id === id) || null; }
function factText(e){ return str(e && (e.short || e.words)).trim(); }
function factNorm(s){ return str(s).replace(/\s+/g, " ").trim(); }
/** add one entry (the caller has opened the action: a click does that by itself) */
function factsAdd(p, {kind, words, short = "", src = null, kw = null, by = "you"}){
  const L = factsOf(p), w = factNorm(words); if (!w) return null;
  const e = {id: nextId(p, "F", L.entries), kind: oneOf(kind, FACT_KINDS, "fact"), words: w, short: factNorm(short) || w, kw: arr(kw).map(x => str(x).toLowerCase().trim()).filter(Boolean).slice(0, 8),
    src: src && FACT_SRC.includes(src.k) ? {k: src.k, ref: str(src.ref), label: str(src.label)} : {k: "you", ref: "", label: ""}, at: now(), by, status: "active", hist: []};
  L.entries.push(e); markRef(p, "fact:" + e.id, "added", {by: by === "pt" ? "pt" : "you"});
  return e;
}
function factKindLabel(k){ return t("facts.k." + oneOf(k, FACT_KINDS, "fact")); }
function factSrcLabel(e){ const s = e && e.src || {}; return t("facts.src." + oneOf(s.k, FACT_SRC, "you")) + (s.label ? " · " + s.label : ""); }

/* ---------- 1. key words of a rule (the code half of the output check) ---------- */
function factWords(s){ return str(s).toLowerCase().replace(/[“”«»"'’]/g, " ").split(/[^\p{L}\p{N}-]+/u).filter(Boolean); }
function factKw(e){
  if (arr(e.kw).length) return e.kw;
  const txt = factText(e) + " " + str(e.words), out = [];
  for (const w of factWords(txt)) if (w.length >= 3 && !FACT_STOP.has(w) && !/^\p{Script=Han}+$/u.test(w) && !out.includes(w)) out.push(w);
  for (const run of txt.match(/\p{Script=Han}+/gu) || []){ const r = run.replace(/不|没有|绝不|禁止|永远|必须|不要|别/g, " "); for (const part of r.split(" ")) for (let i = 0; i + 1 < part.length; i++){ const g = part.slice(i, i + 2); if (!out.includes(g)) out.push(g); } }
  return out.slice(0, 10);
}
/** how many of a rule's key words a text holds (whole words; Chinese by its two-character pieces) */
function factKwHits(e, text){
  const kw = factKw(e); if (!kw.length) return 0;
  const W = new Set(factWords(text)), low = str(text).toLowerCase();
  return kw.filter(k => /\p{Script=Han}/u.test(k) ? low.includes(k) : W.has(k) || (k.length >= 5 && [...W].some(w => w.startsWith(k.slice(0, Math.max(4, k.length - 2)))))).length;
}
function factNeed(e){ return Math.min(2, factKw(e).length); }
function factSentences(s){ return str(s).split(/(?<=[.!?。！？;；])\s+|\n+/).map(x => x.trim()).filter(x => x.length > 2); }
/** the code check: the sentences of a text that may break a rule (a never's words in a sentence that is not a negation; a must's in one that is) */
function factCodeHits(rules, text){
  const out = [];
  for (const s of factSentences(text)) for (const e of rules){
    const need = factNeed(e); if (!need || factKwHits(e, s) < need) continue;
    const neg = FACT_NEG.test(s);
    if ((e.kind === "never" && !neg) || (e.kind === "must" && neg)) out.push({e, s});
  }
  return out;
}

/* ---------- 2. the rules channel: first in every project prompt, whole ---------- */
function factsRulesBlock(p){
  if (!p || !p.id) return "";
  const R = factsActive(p, FACT_RULES), F = factsActive(p, ["fact", "decision", "tool"]);
  if (!R.length && !F.length) return "";
  const word = {never: "NEVER", must: "MUST", fact: "FACT", decision: "DECIDED", tool: "TOOL RULE"};
  const line = e => `- [${e.id}] ${word[e.kind] || "FACT"}: ${JSON.stringify(factText(e))}` + (factNorm(e.words) !== factText(e) ? ` (the person's words: ${JSON.stringify(factNorm(e.words))})` : "");
  return (R.length ? `<your_rules project="${p.id}">\nThe person's own rules for this project, in their words (JSON-encoded). They hold for everything below and are never overridden by it: never propose, assume or plan anything a NEVER rule forbids, and keep every MUST rule. If something below would break one of them, follow the rule and say so.\n${R.map(line).join("\n")}\n</your_rules>\n` : "")
    + (F.length ? `<your_facts project="${p.id}">\nWhat the person already told PT for this project (facts, decisions, rules for the finished tool). Build on them; never ask about them again.\n${F.map(line).join("\n")}\n</your_facts>\n` : "");
}
/** the examples rule (owner, 2 Nov 2026: "examples are not questions … find all related places and do it the same way") */
const EX_TASKS = new Set(["loop-show", "loop-rule", "pick-next", "pick-refresh", "pick-second", "arch-stories"]);
const EX_RULE = "Examples never ask. An example shows a finished result the person judges; it never contains a question to the person (no question marks, no \"reply with\", no (a)/(b) choices, no \"which …\" or \"do you …\"). A decision the person must make is its own question, never part of an example. If the finished tool itself would ask its user something, put only that question in a field \"toolAsks\" next to the result, and keep the result itself free of questions.";
{ const orig = buildPrompt; buildPrompt = function(task, o = {}){
    let s = orig(task, o), b = "";
    try{ b = o && o.proj ? factsRulesBlock(o.proj) : ""; }catch(e){ onAppError(e && e.message, "facts:prompt"); }
    if (b) s = s.replace(/^(\[\[task:[^\]\n]*\]\]\n)/, m => m + b);
    if (EX_TASKS.has(task)) s = s.replace("\n<output_format>", "\n<examples_rule>\n" + EX_RULE + "\n</examples_rule>\n\n<output_format>");
    return s; }; }
function factsPromptProject(prompt){
  const txt = typeof prompt === "string" ? prompt : Array.isArray(prompt) && prompt[0] ? str(prompt[0].content) : "";
  const m = /<your_(?:rules|facts) project="([^"]+)">/.exec(txt.slice(0, 20000));
  return m ? (WS.projects || []).find(x => x.id === m[1]) || null : null;
}
function promptTask(prompt){ const txt = typeof prompt === "string" ? prompt : Array.isArray(prompt) && prompt[0] ? str(prompt[0].content) : ""; const m = /\[\[task:([a-z0-9-]+)\]\]/.exec(txt.slice(0, 4000)); return m ? m[1] : ""; }   // ok:cut only the head of the prompt is searched for the task line

/* ---------- 3. the output check: code first, one quick-tier confirm on a hit, repaired once, then left out or greyed ---------- */
const FACT_GUARD = {cache: new Map()};   // rule id + sentence → does it break the rule (the quick check's verdict)
const FACT_SKIP_KEYS = new Set(["id", "ids", "ref", "refs", "k", "key", "target", "kind", "url", "src", "status", "verdict", "dim", "category", "priority", "lang", "rec", "recBasis", "fromExamples", "critIds", "reqIds", "touches", "toolAsks"]);
function factStrings(node, out = [], key = "", depth = 0){
  if (depth > 8 || out.length > 400) return out;
  if (typeof node === "string"){ if (!FACT_SKIP_KEYS.has(key) && node.trim().length > 2) out.push(node); return out; }
  if (Array.isArray(node)){ for (const x of node) factStrings(x, out, key, depth + 1); return out; }
  if (node && typeof node === "object") for (const k of Object.keys(node)) if (!FACT_SKIP_KEYS.has(k) && k !== "_blocked") factStrings(node[k], out, k, depth + 1);
  return out;
}
function factGuardKey(e, s){ return e.id + "|" + factText(e) + "|" + s; }
/** the sentences of an answer that break a rule (code hits confirmed by one quick-tier call; no answer from it counts as a break) */
async function factsGuardHits(p, rules, out){
  const hits = [], seen = new Set();
  for (const txt of factStrings(out)) for (const h of factCodeHits(rules, txt)){ const k = factGuardKey(h.e, h.s); if (!seen.has(k)){ seen.add(k); hits.push(h); } }
  const ask = hits.filter(h => !FACT_GUARD.cache.has(factGuardKey(h.e, h.s))).slice(0, FACT_HITS_MAX);
  if (ask.length){
    const prompt = `[[task:facts-guard]]
You check what an AI step proposed against the person's own rules for their project. For each numbered sentence, decide whether it proposes, assumes, plans or requires something the rule given with it forbids (a NEVER rule) or leaves out what it demands (a MUST rule). A sentence that only names the rule, refuses it or keeps it does not break it.
<checks>
${JSON.stringify(ask.map((h, i) => ({i, rule_kind: h.e.kind, rule: factText(h.e), sentence: h.s})))}
</checks>
Reply with only JSON: {"verdicts":[{"i":0,"breaks":true,"why":"one short sentence"}]}`;
    const r = await runAI("facts-guard-" + uid("g"), t("facts.guard.busy"), prompt, {quick: true, validate: o => o && Array.isArray(o.verdicts)});
    ask.forEach((h, i) => { const v = r ? arr(r.verdicts).find(x => x && num(x.i, -1) === i) : null; FACT_GUARD.cache.set(factGuardKey(h.e, h.s), v ? v.breaks !== false : true); });
    if (FACT_GUARD.cache.size > 600) FACT_GUARD.cache.clear();
  }
  return hits.filter(h => FACT_GUARD.cache.get(factGuardKey(h.e, h.s)) !== false);
}
/** what still breaks a rule after the one repair: an option of a pick is kept greyed (_blocked), anything else in a list is left out and recorded */
function factsGuardApply(p, rules, out, task){
  const breaks = (s) => { for (const h of factCodeHits(rules, s)) if (FACT_GUARD.cache.get(factGuardKey(h.e, h.s)) !== false) return h; return null; };
  const gone = [];
  const walk = (node, key) => {
    if (typeof node === "string") return FACT_SKIP_KEYS.has(key) ? null : breaks(node);
    if (Array.isArray(node)){
      for (let i = node.length - 1; i >= 0; i--){ const x = node[i], h = walk(x, key); if (!h) continue;
        if (key === "options" && x && typeof x === "object"){ x._blocked = {id: h.e.id, rule: factText(h.e), s: h.s}; continue; }
        gone.push({h, text: typeof x === "string" ? x : factStrings(x).slice(0, 3).join(" · ")}); node.splice(i, 1); }
      return null;
    }
    if (node && typeof node === "object"){ let first = null; for (const k of Object.keys(node)){ if (k === "_blocked" || FACT_SKIP_KEYS.has(k)) continue; const h = walk(node[k], k); if (h && !first) first = h; } return first; }
    return null;
  };
  const top = walk(out, "");
  if (top) gone.push({h: top, text: top.s, kept: true});
  if (!gone.length || !p || !(WS.projects || []).includes(p)) return 0;
  const L = factsOf(p);
  for (const g of gone) L.blocked.unshift({at: now(), task, rule: g.h.e.id, short: factText(g.h.e), text: g.text, kept: !!g.kept});
  L.blocked = L.blocked.slice(0, FACT_BLOCKED_MAX);
  UI.blocked20 = {pid: p.id, n: gone.length, rule: factText(gone[0].h.e), at: Date.now()};
  touch(p);
  return gone.length;
}
/** the problems runAI asks again about (once): each sentence that breaks a rule, with the rule */
function factsGuardWords(hits){ return hits.map(h => `this part breaks the person's rule [${h.e.id}] ${h.e.kind === "never" ? "NEVER" : "MUST"} ${JSON.stringify(factText(h.e))}: ${JSON.stringify(h.s)} — leave it out or change it so the rule is kept`); }

/* ---------- 4. examples never ask (the code half of the examples rule) ---------- */
const EX_ASK = [/[?？]/, /\b(reply|answer|respond) with\b/i, /\(\s*[a-c1-3]\s*\)[^()\n]{0,80}\(\s*[a-c1-3]\s*\)/i, /(^|[.!:;]\s*)which\b|\bwhich (one|of)\b/i, /\b(do|would|should|could|can|will) (you|i)\b|\bshall i\b|\bare you\b/i,
  /\bantworte(t)? mit\b|\bantwort mit\b/i, /\b(welche[rsnm]?|möchtest du|willst du|soll ich|kannst du|hast du|bist du)\b/i, /请回复|请回答|回复\s*[“"]?[AaBb12]|哪个|哪一个|你想|你要不要|是否需要|要不要/];
function exAsks(text){ const s = str(text); return !!s.trim() && EX_ASK.some(rx => rx.test(s)); }
/** split a result into what it shows and the question in it (the question goes out: "The tool would ask: …") */
function exSplitAsk(text){
  const S = factSentences(text), q = S.filter(exAsks), rest = S.filter(s => !exAsks(s));
  if (!q.length) return {rest: str(text), ask: ""};
  const keep = str(text).split("\n").filter(l => !q.some(x => l.includes(x)) && !exAsks(l)).join("\n").trim();
  return {rest: keep || rest.join(" ").trim(), ask: q.join(" ")};
}
function exFields(task, out){
  const F = [];
  if (!out || typeof out !== "object") return F;
  if (task === "loop-show") arr(out.examples).forEach((e, i) => { if (e && typeof e === "object") F.push({o: e, f: "output", n: i + 1}); });
  if (task === "loop-rule") arr(out.checks).forEach((e, i) => { if (e && typeof e === "object") F.push({o: e, f: "output", n: i + 1}); });
  if (/^pick-/.test(task)) arr(out.cards).forEach((c, i) => arr(c && c.options).forEach((o, j) => { if (o && typeof o === "object"){ F.push({o, f: "ex", n: (i + 1) + "." + (j + 1)}); F.push({o, f: "out", n: (i + 1) + "." + (j + 1)}); } }));
  return F.filter(x => str(x.o[x.f]).trim());
}
function exAskWords(task, out){ return exFields(task, out).filter(x => exAsks(x.o[x.f])).map(x => `example ${x.n}: its result asks a question (${JSON.stringify(str(x.o[x.f]).slice(0, 160))}). Examples never ask: write the finished result. If the finished tool would really ask its user something, put only that question in "toolAsks" and keep the result without it.`); }   // ok:cut the repair note quotes the start of the result; the result itself is kept whole
const EX_ASKS = new Map();   // a cleaned result → the question that was in it (newExample picks it up as "The tool would ask")
function exAskClean(task, out){
  let n = 0;
  for (const x of exFields(task, out)){
    const own = str(x.o.toolAsks).trim();
    if (!exAsks(x.o[x.f])){ if (own && x.f !== "ex") EX_ASKS.set(str(x.o[x.f]).trim(), own); continue; }
    const sp = exSplitAsk(x.o[x.f]); x.o[x.f] = sp.rest; x.o.toolAsks = [own, sp.ask].filter(Boolean).join(" "); n++;
    if (x.f !== "ex" && sp.rest.trim()) EX_ASKS.set(sp.rest.trim(), x.o.toolAsks);
  }
  if (EX_ASKS.size > 200) EX_ASKS.clear();
  return n;
}
{ const orig = newExample; newExample = function(p, o){ const e = orig.apply(this, arguments); const k = str(e && e.output).trim(); if (k && EX_ASKS.has(k)){ e.toolAsks = EX_ASKS.get(k); EX_ASKS.delete(k); } return e; }; }

/* ---------- the two checks inside runAI (one repair through its check path; what is left over is cleaned after) ---------- */
{ const orig = runAI; runAI = async function(key0, label, prompt, o = {}){
    const task = promptTask(prompt), p = factsPromptProject(prompt);
    const rules = p && o.json !== false && !/^(facts-|ask-once)/.test(task) ? factsActive(p, FACT_RULES) : [], exT = o.json !== false && EX_TASKS.has(task);
    if (!rules.length && !exT) return orig.apply(this, arguments);
    const check0 = o.check;
    const o2 = Object.assign({}, o, {check: async out => {
      const a = check0 ? arr(await check0(out)) : [];
      let b = []; try{ b = rules.length ? factsGuardWords(await factsGuardHits(p, rules, out)) : []; }catch(e){ onAppError(e && e.message, "facts:guard"); }
      return [...a, ...b, ...(exT ? exAskWords(task, out) : [])]; }});
    const r = await orig.call(this, key0, label, prompt, o2);
    if (r && typeof r === "object"){
      try{ if (rules.length) factsGuardApply(liveP(p), rules, r, task); if (exT) exAskClean(task, r); }catch(e){ onAppError(e && e.message, "facts:clean"); }
    }
    return r; }; }

/* a pick option that still breaks a rule stays visible, greyed, and cannot be taken; the ★ never points at it */
{ const orig = pickCleanCard; pickCleanCard = function(c0, round, k){
    const c = orig.apply(this, arguments); if (!c || !c0) return c;
    for (const o of c.options){ const s = arr(c0.options).find(x => x && (str(x.label) || str(x.text)) === o.label); if (!s) continue;
      if (s._blocked) o.blocked = {id: str(s._blocked.id), rule: str(s._blocked.rule)}; if (str(s.toolAsks).trim()) o.toolAsks = str(s.toolAsks).trim(); }
    if (c.rec >= 0 && c.options[c.rec] && c.options[c.rec].blocked){ c.rec = -1; c.recWhy = ""; }
    return c; }; }
{ const orig = pickOptHTML; pickOptHTML = function(p, c, o, i, ctx){
    if (o && o.blocked) return `<div class="pk-opt blocked20" data-blocked="${esc(o.blocked.id)}"><div class="pk-btn" aria-disabled="true"><span class="pk-k">${esc(o.k)}</span><span class="pk-l">${esc(o.label)}</span></div>
      <p class="small blocked20-why">${ic("shield")} ${esc(t("facts.blocked.opt", {x: o.blocked.rule}))}</p></div>`;
    const h = orig.apply(this, arguments);
    return o && o.toolAsks ? h.replace(/<\/div>$/, `<p class="small toolasks20"><b>${esc(t("ex.toolasks"))}</b> ${esc(o.toolAsks)}</p></div>`) : h; }; }
{ const orig = pickAnswer; pickAnswer = function(p, cid, o = {}){
    const c = p && pickRead(p).cards.find(x => x.id === cid);
    if (c && arr(o.keys).some(k => (c.options.find(x => x.k === k) || {}).blocked)){ toast(t("facts.blocked.take"), "err"); return null; }
    return orig.apply(this, arguments); }; }
{ const orig = pickStarable; pickStarable = function(p){ return orig(p).filter(c => !(c.options[c.rec] || {}).blocked); }; }
/* an example result with the question taken out shows it, labelled, as the tool's own turn */
{ const orig = exCard; exCard = function(p, e){ const h = orig.apply(this, arguments); return e && str(e.toolAsks).trim() ? h.replace('<div class="row exverd">', `<p class="small toolasks20"><b>${esc(t("ex.toolasks"))}</b> ${esc(e.toolAsks)}</p><div class="row exverd">`) : h; }; }

/* ---------- 5. find rules in this project: one AI pass over what the project holds, confirmed in one batch ---------- */
function factsSources(p){
  const S = [], ns = p.northStar || {};
  if (str(ns.constraints).trim()) S.push({k: "ns", ref: "ns", text: str(ns.constraints)});
  arr(p.outOfScope).forEach((x, i) => { if (str(x).trim()) S.push({k: "oos", ref: "oos:" + (i + 1), text: str(x)}); });
  arr(p.constitution).forEach((x, i) => { if (str(x).trim()) S.push({k: "const", ref: "const:" + (i + 1), text: str(x)}); });
  for (const n of (WS.notes || []).filter(n => n.projectId === p.id && !n.deletedAt && !n.noAI).slice(-40)) S.push({k: "note", ref: "note:" + n.id, text: str(n.text)});
  for (const q of arr(p.qa)) if (str(q.answer).trim()) S.push({k: "qa", ref: "qa:" + q.id, text: "Q: " + str(q.q) + "\nA: " + str(q.answer)});
  for (const e of arr(p.pick && p.pick.log)) if (str(e.answer).trim()) S.push({k: "pick", ref: "pe:" + e.id, text: "Q: " + str(e.q) + "\nA: " + str(e.answer) + (str(e.own).trim() ? "\nOwn words: " + str(e.own) : "")});
  for (const d of arr(p.decisions)) if (!d.replaced && !d.pick && str(d.choice).trim()) S.push({k: "dec", ref: "dec:" + str(d.id), text: str(d.title) + ": " + str(d.choice)});
  return S;
}
function factInSource(src, quote){ const q = factNorm(quote).toLowerCase(); if (q.length < 3) return null; return src.find(s => factNorm(s.text).toLowerCase().includes(q)) || src.find(s => pickSame(s.text, quote)) || null; }
function factsFindWords(src, o){ return arr(o && o.entries).filter(e => e && str(e.quote).trim() && !factInSource(src, e.quote)).slice(0, 8).map(e => `the quote ${JSON.stringify(str(e.quote).slice(0, 120))} is not in the material: quote the person's exact words, or leave the entry out`); }   // ok:cut the repair note quotes the start of the quote
async function factsFind(p){
  const src = factsSources(p); if (!src.length){ toast(t("facts.find.none"), ""); return null; }
  const ws0 = WS.id;
  const prompt = buildPrompt("facts-find", {proj: p, rules: ["elicit"], context: "",
    body: `Read what this project already holds (the material below: constraints, what is not in this version, the constitution, notes, interview answers, picks and decisions) and list the person's binding statements as facts-book entries:
- "never": something that must never happen or never be used ("we never log in to Google"); "must": something that must always hold; "fact": a fact about the person's situation; "decision": something the person decided; "tool": a rule for how the finished tool behaves.
- Quote the person's own words exactly in "quote" (copied from the material, never invented), give PT's short form in "short" (one plain sentence), the source kind in "src" and the ref of the material in "ref", and 2-5 key words of the entry in "kw" (in the project's language, the words a proposal breaking it would contain).
- Only what the person really said or decided; leave out guesses, PT's own drafts and anything already in <your_rules> or <your_facts>. At most ${FACT_PROPS_MAX} entries, the binding ones (never / must) first.
<material>
${untrusted("project_material", jsonFit(src.map(s => ({src: s.k, ref: s.ref, text: s.text})), FACT_SRC_MAX, x => x.ref))}
</material>`,
    schema: `{"entries":[{"kind":"never|must|fact|decision|tool","quote":"the person's exact words","short":"PT's short form","src":"ns|oos|const|note|qa|pick|dec","ref":"the ref","kw":["…"]}]}`});
  const r = await runAI("facts-find", t("facts.find.busy"), prompt, {pid: p.id, step: "interview", validate: o => o && Array.isArray(o.entries), check: o => factsFindWords(src, o)});
  if (!r) return null;
  const q = pickLive(p, ws0); if (!q) return null;
  snapshot(q, t("facts.act.find"));
  const L = factsOf(q), have = [...L.entries.filter(e => e.status === "active").map(factText), ...L.props.map(x => x.short)];
  let n = 0;
  for (const e of arr(r.entries)){
    if (L.props.length >= FACT_PROPS_MAX) break;
    const s = factInSource(src, e && e.quote); if (!s) continue;   // the cleaner: an entry without the person's words is left out
    const short = factNorm(e.short) || factNorm(e.quote); if (have.some(h => pickSame(h, short) || pickSame(h, e.quote))) continue;
    L.props.push({id: uid("fp"), kind: oneOf(str(e.kind), FACT_KINDS, "fact"), words: factNorm(e.quote), short, kw: arr(e.kw).map(str).slice(0, 6), src: {k: oneOf(s.k, FACT_SRC, "you"), ref: s.ref, label: ""}, at: now()});
    have.push(short); n++;
  }
  logAct(q, t("facts.find.done", {n}), {step: "interview"});
  touch(q); render();
  if (!n) toast(t("facts.find.nothing"), "");
  return n;
}
/** the batch: every ticked proposal becomes an entry (one Undo step), then the contradiction check */
function factsTakeProps(p){
  const L = factsOf(p), off = (UI.factsOff && UI.factsOff[p.id]) || {}, take = L.props.filter(x => !off[x.id]);
  if (!take.length){ toast(t("facts.props.none"), ""); return []; }
  const ids = take.map(x => factsAdd(p, {kind: x.kind, words: x.words, short: x.short, src: x.src, kw: x.kw, by: "pt"})).filter(Boolean).map(e => e.id);
  L.props = []; if (UI.factsOff) delete UI.factsOff[p.id];
  logAct(p, t("facts.props.added", {n: ids.length}), {step: "interview", important: true});
  rcpt20(p, ids.map(id => factText(factById(p, id))).join(" · "), t("rc.w.facts"));
  touch(p); render();
  factsConflictSoon(p, ids);
  return ids;
}

/* ---------- 6. contradictions: one quick-tier check when an entry is added or changed ---------- */
function factsConflictSoon(p, ids){ setTimeout(() => { factsConflict(p, ids).catch(e => onAppError(e && e.message, "facts:conflict")); }, 0); }
async function factsConflict(p, ids){
  const act = factsActive(p), mine = act.filter(e => ids.includes(e.id)), others = act.filter(e => !ids.includes(e.id));
  if (!mine.length || (!others.length && mine.length < 2)) return null;
  const ws0 = WS.id;
  const prompt = buildPrompt("facts-conflict", {proj: p, rules: [], context: "",
    body: `The person keeps a facts book for this project. Check whether a NEW entry contradicts another active entry: both cannot hold at the same time, or keeping one breaks the other. A narrower, more specific or additional entry is no contradiction. Only real contradictions; none is a fine answer.
<new>${JSON.stringify(mine.map(e => ({id: e.id, kind: e.kind, text: factText(e)})))}</new>
<active>${JSON.stringify(others.map(e => ({id: e.id, kind: e.kind, text: factText(e)})))}</active>`,
    schema: `{"conflicts":[{"a":"id of the older entry","b":"id of the new entry","why":"one short sentence"}]}`});
  const r = await runAI("facts-conflict", t("facts.conf.busy"), prompt, {quick: true, validate: o => o && Array.isArray(o.conflicts)});
  if (!r) return null;
  const q = pickLive(p, ws0); if (!q) return null;
  const L = factsOf(q), live = new Set(factsActive(q).map(e => e.id));
  const list = arr(r.conflicts).filter(c => c && live.has(str(c.a)) && live.has(str(c.b)) && str(c.a) !== str(c.b) && (ids.includes(str(c.a)) || ids.includes(str(c.b))))
    .filter(c => !L.conflicts.some(x => x.status === "open" && [x.a, x.b].sort().join() === [str(c.a), str(c.b)].sort().join())).slice(0, 6);
  if (!list.length) return [];
  snapshot(q, t("facts.act.conflict"));
  for (const c of list){ const [a, b] = ids.includes(str(c.a)) && !ids.includes(str(c.b)) ? [str(c.b), str(c.a)] : [str(c.a), str(c.b)]; L.conflicts.push({id: uid("fc"), a, b, why: str(c.why), at: now(), status: "open"}); }
  touch(q); render();
  return list;
}
function factsResolve(p, cid, how){
  const L = factsOf(p), c = L.conflicts.find(x => x.id === cid); if (!c || c.status !== "open") return;
  const A = factById(p, c.a), B = factById(p, c.b);
  if (how === "a" && B){ B.status = "replaced"; B.replacedBy = c.a; B.why = t("facts.conf.whykept", {x: c.a}); }
  if (how === "b" && A){ A.status = "replaced"; A.replacedBy = c.b; A.why = t("facts.conf.whykept", {x: c.b}); }
  c.status = how === "both" ? "both" : "kept-" + how; c.done = now();
  rcpt20(p, how === "both" ? t("facts.conf.both") : factText(how === "a" ? A : B), t("rc.w.facts"));
  touch(p); render();
}

/* ---------- 7. ask once: what is already known is not asked again ---------- */
function askPool(p){
  const out = [];
  for (const q of arr(p.qa)) if (str(q.answer).trim()) out.push({ref: "qa:" + q.id, q: str(q.q), a: str(q.answer)});
  for (const e of arr(p.pick && p.pick.log)) if (str(e.q).trim()) out.push({ref: "pe:" + e.id, q: str(e.q), a: str(e.answer)});
  for (const d of arr(p.decisions)) if (!d.replaced && !d.pick && str(d.title).trim()) out.push({ref: "dec:" + str(d.id), q: str(d.title), a: str(d.choice)});
  for (const e of factsActive(p)) out.push({ref: "fact:" + e.id, q: factText(e), a: factNorm(e.words), fact: e});
  return out;
}
function askSim(a, b){ const A = pickGrams(a), B = pickGrams(b); if (!A.size || !B.size) return pickNorm(a) === pickNorm(b) ? 1 : 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); }
/** code first: known (as pickSame), unclear (worth one quick check) or new */
function askMatch(p, text, pool = askPool(p)){
  let best = null; for (const x of pool){ const s = askSim(text, x.q); if (!best || s > best.s) best = {x, s}; }
  if (best && best.s >= 0.8) return {st: "known", by: best.x};
  const kw = pool.some(x => x.fact && factNeed(x.fact) && factKwHits(x.fact, text) >= factNeed(x.fact));
  return (best && best.s >= 0.4) || kw ? {st: "check"} : {st: "new"};
}
async function askOnceAI(p, items, pool){
  const prompt = buildPrompt("ask-once", {proj: p, rules: [], context: "",
    body: `PT wants to ask the person these questions. For each one, say whether something the person already said or decided (the entries below) answers it, so it must not be asked again: give that entry's ref, or "none". Only when the entry really answers the question.
<questions>${JSON.stringify(items.map((x, i) => ({i, q: x.q})))}</questions>
<entries>${jsonFit(pool.map(x => ({ref: x.ref, q: x.q, a: x.a})), 40000, x => x.ref)}</entries>`,
    schema: `{"known":[{"i":0,"ref":"qa:… | pe:… | dec:… | fact:F1 | none"}]}`});
  const r = await runAI("ask-once-" + uid("a"), t("ask.busy"), prompt, {quick: true, validate: o => o && Array.isArray(o.known)});
  const out = new Map(); if (!r) return out;
  for (const k of arr(r.known)){ const i = num(k && k.i, -1), x = pool.find(y => y.ref === str(k && k.ref)); if (i >= 0 && i < items.length && x) out.set(i, x); }
  return out;
}
function askRecord(p, q, by, where){
  const L = factsOf(p); L.known.unshift({at: now(), q: str(q), ref: by.ref, a: str(by.a), where}); L.known = L.known.slice(0, FACT_KNOWN_MAX);
  const K = UI.known20 && UI.known20.pid === p.id ? UI.known20 : (UI.known20 = {pid: p.id, list: []}); K.list.unshift({q: str(q), ref: by.ref, a: str(by.a)}); K.list = K.list.slice(0, 3);
}
/** the questions just made: the known ones go (recorded), the unclear ones wait hidden for one quick check */
async function askOnceRun(p, items, {drop, where}){
  if (!items.length) return 0;
  const pool = askPool(p); if (!pool.length) return 0;
  let n = 0; const unclear = [];
  for (const x of items){ const m = askMatch(p, x.q, pool); if (m.st === "known"){ drop(x); askRecord(p, x.q, m.by, where); n++; } else if (m.st === "check") unclear.push(x); }
  if (n){ touch(p); render(); }
  if (!unclear.length) return n;
  UI.ask1Wait = UI.ask1Wait || new Set(); for (const x of unclear) UI.ask1Wait.add(x.id); render();
  let res = new Map();
  try{ res = await askOnceAI(p, unclear, pool); }
  finally{ for (const x of unclear) UI.ask1Wait.delete(x.id); }
  const q = (WS.projects || []).includes(p) ? p : null;
  if (q && res.size){ snapshot(q, t("ask.act")); unclear.forEach((x, i) => { const by = res.get(i); if (by){ drop(x); askRecord(q, x.q, by, where); n++; } }); touch(q); }
  render();
  return n;
}
{ const orig = pickOpenCards; pickOpenCards = function(p){ const L = orig(p), W = UI.ask1Wait; return W && W.size ? L.filter(c => !W.has(c.id)) : L; }; }
{ const orig = pickQueue; pickQueue = function(p, add){ const W = UI.ask1Wait; return orig(p, x => { if (W && W.size && W.has(str(x.ref).slice(5))) return; add(x); }); }; }
{ const orig = qCard; qCard = function(p, q){ return UI.ask1Wait && q && UI.ask1Wait.has(q.id) ? "" : orig.apply(this, arguments); }; }
{ const orig = aiPickNext; aiPickNext = async function(p){
    const ws0 = WS.id, before = new Set(pickRead(p).cards.map(c => c.id));
    const r = await orig.apply(this, arguments);
    try{ const q = pickLive(p, ws0); if (q){ const fresh = pickRead(q).cards.filter(c => !before.has(c.id) && !c.qkey);
        await askOnceRun(q, fresh.map(c => ({id: c.id, q: c.q})), {where: "pick", drop: x => { const k = pickOf(q); k.cards = k.cards.filter(c => c.id !== x.id); }}); } }
    catch(e){ onAppError(e && e.message, "ask-once:pick"); }
    return r; }; }
{ const orig = aiInterview; aiInterview = async function(p){
    const ws0 = WS.id, before = new Set(arr(p.pendingQs).map(q => q.id));
    const r = await orig.apply(this, arguments);
    try{ const q = pickLive(p, ws0); if (q){ const fresh = arr(q.pendingQs).filter(x => !before.has(x.id));
        await askOnceRun(q, fresh.map(x => ({id: x.id, q: x.text})), {where: "interview", drop: x => { q.pendingQs = arr(q.pendingQs).filter(y => y.id !== x.id); }}); } }
    catch(e){ onAppError(e && e.message, "ask-once:interview"); }
    return r; }; }
/** "(change)": the place the earlier answer lives */
function askChange(p, ref){
  const [k, id] = [str(ref).split(":")[0], str(ref).slice(str(ref).indexOf(":") + 1)];
  if (k === "fact"){ factsOpen(p); UI.factsEdit = id; render(); focusSoon("fe-" + id); return; }
  if (k === "pe" && ACTIONS["pk-change"]){ ACTIONS["pk-change"]({dataset: {id}}); return; }
  if (k === "qa"){ UI.reanswer = id; goRef("qa:" + id); return; }
  if (ACTIONS["rows-open"]) ACTIONS["rows-open"]();
}

/* ---------- 8. the page: next to Decisions, and in More ⋯ ---------- */
function factsOpen(p){ if (!p) return; pushNav(); UI.factsView = p.id; UI.rowsView = null; UI.home = false; UI.finish = null; render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; }
{ const orig = pgBar; pgBar = function(p){
    let h = orig(p); const on = UI.factsView === p.id, n = factsActive(p).length;
    if (on) h = h.replace(/(class="sp-st [a-z]+ )here"/g, '$1"').replace(/aria-current="true"/g, 'aria-current="false"');
    const b = `<span class="sp-line"></span><button class="btn xs ghost sp-facts ${on ? "sel" : ""}" data-a="facts-open" aria-current="${on}">${ic("shield")}<span>${esc(t("facts.title"))}${n ? " · " + n : ""}</span></button>`;
    return /<\/div><\/nav>/.test(h) ? h.replace(/<\/div><\/nav>/, b + "</div></nav>") : h + b; }; }
{ const orig = modeBody; modeBody = function(p){ return p && UI.factsView === p.id ? factsViewHTML(p) : orig(p); }; }
{ const orig = pgOpen; pgOpen = function(){ UI.factsView = null; return orig.apply(this, arguments); }; }
{ const orig = goRef; goRef = function(){ UI.factsView = null; return orig.apply(this, arguments); }; }
{ const orig = popNav; popNav = function(){ UI.factsView = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["home"]; ACTIONS["home"] = function(){ UI.factsView = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["rows-open"]; ACTIONS["rows-open"] = function(){ UI.factsView = null; return orig.apply(this, arguments); }; }
{ const orig = openProject; openProject = function(){ UI.factsView = null; UI.factsEdit = null; UI.ask1Wait = null; UI.known20 = null; UI.blocked20 = null; return orig.apply(this, arguments); }; }
MORE_ITEMS.splice(1, 0, {a: "facts-open", icon: "shield", l: "facts.title"});

function factsViewHTML(p){
  return `<div class="pg facts-view" data-page="facts" data-anchor="page-facts">${pgBar(p)}<header class="pg-head"><h2>${ic("shield")} ${esc(t("facts.title"))}</h2></header>${factsBodyHTML(p)}</div>`;
}
function factRowHTML(p, e){
  const ed = UI.factsEdit === e.id, off = e.status !== "active";
  const meta = `${esc(factSrcLabel(e))} · ${esc(fmtDate(e.at))}${e.by === "pt" ? " · " + esc(t("facts.by.pt")) : ""}${off ? " · " + esc(t("facts.st." + (e.status === "replaced" ? "replaced" : "withdrawn"))) + (e.replacedBy ? " → " + esc(e.replacedBy) : "") : ""}`;
  const body = ed ? `<form class="stack" data-form="facts-edit" data-id="${esc(e.id)}"><label class="fld"><span>${esc(t("facts.words"))}</span><textarea id="fe-${esc(e.id)}" rows="2">${esc(e.words)}</textarea></label>
      <div class="row"><button class="btn sm primary" type="submit">${ic("check")}${esc(t("btn.save"))}</button><button class="btn sm ghost" type="button" data-a="facts-edit" data-id="${esc(e.id)}">${esc(t("btn.cancel"))}</button></div></form>`
    : `<div class="fact20-text">“${clampHTML(e.words, "fw:" + e.id, {lines: 3})}”</div>${factNorm(e.words) !== factText(e) ? `<div class="small">${esc(t("facts.short"))} ${clampHTML(factText(e), "fs:" + e.id, {lines: 2})}</div>` : ""}<div class="small muted">${meta}</div>`;
  const acts = ed ? "" : off ? `<button class="btn xs ghost" data-a="facts-back" data-id="${esc(e.id)}">${ic("undo")}${esc(t("facts.useagain"))}</button>`
    : `<button class="btn xs ghost" data-a="facts-edit" data-id="${esc(e.id)}">${ic("edit")}${esc(t("btn.edit"))}</button><button class="btn xs ghost" data-a="facts-withdraw" data-id="${esc(e.id)}">${ic("x")}${esc(t("facts.withdraw"))}</button>`;
  return `<div class="item fact20 ${off ? "off" : ""}" id="ir-fact:${esc(e.id)}" data-anchor="fact:${esc(e.id)}" data-fact="${esc(e.id)}">${stSlot(off ? "todo" : FACT_RULES.includes(e.kind) ? "warn" : "ok")}<div class="body">${body}</div>${acts ? `<div class="qacts">${acts}</div>` : ""}</div>`;
}
function factsBodyHTML(p){
  const R = factsRead(p), act = R.entries.filter(e => e.status === "active"), old = R.entries.filter(e => e.status !== "active");
  const off = (UI.factsOff && UI.factsOff[p.id]) || {};
  const kindOpts = FACT_KINDS.map(k => `<option value="${k}">${esc(factKindLabel(k))}</option>`).join("");
  const add = `<form class="stack facts-add" data-form="facts-add"><div class="row"><label class="fld" style="flex:0 1 12em"><span>${esc(t("facts.kind"))}</span><select id="fa-kind">${kindOpts}</select></label>
      <label class="fld" style="flex:1 1 18em"><span>${esc(t("facts.words"))}</span><textarea id="fa-words" rows="2" placeholder="${esc(t("facts.ph"))}">${esc(UI.qDraft["facts-add"] || "")}</textarea></label></div>
      <div class="row"><button class="btn sm primary" type="submit">${ic("plus")}${esc(t("facts.add"))}</button>${aiBtn("facts-find", t("facts.find"), "M", {key: "facts-find"})}<span class="hint">${esc(t("facts.find.sub"))}</span></div></form>${busyHTML("facts-find")}`;
  const props = R.props.length ? `<section class="panel facts-props" data-anchor="facts-props"><h3>${esc(t("facts.props.t", {n: R.props.length}))}</h3><p class="small muted">${esc(t("facts.props.sub"))}</p><div class="list">${R.props.map(x =>
      `<label class="item chk fprop20"><input type="checkbox" data-a-change="facts-tick" data-id="${esc(x.id)}" ${off[x.id] ? "" : "checked"}><span class="body"><b class="small">${esc(factKindLabel(x.kind))}</b> “${esc(x.words)}”${factNorm(x.words) !== factNorm(x.short) ? `<span class="small"> · ${esc(t("facts.short"))} ${esc(x.short)}</span>` : ""}<span class="small muted"> · ${esc(t("facts.src." + x.src.k))}</span></span></label>`).join("")}</div>
      <div class="row"><button class="btn sm primary" data-a="facts-take">${ic("check")}${esc(t("facts.props.take", {n: R.props.filter(x => !off[x.id]).length}))}</button><button class="btn sm ghost" data-a="facts-drop">${esc(t("facts.props.drop"))}</button></div></section>` : "";
  const conf = R.conflicts.filter(c => c.status === "open").map(c => { const A = factById(p, c.a), B = factById(p, c.b); if (!A || !B) return "";
      return `<section class="panel facts-conf" data-anchor="facts-conf:${esc(c.id)}" role="alert"><h3>${ic("flag")} ${esc(t("facts.conf.t"))}</h3><p class="small">${esc(c.why)}</p>
        <div class="grid2 conf20"><blockquote class="small"><b>A · ${esc(factKindLabel(A.kind))}</b><br>“${esc(A.words)}”</blockquote><blockquote class="small"><b>B · ${esc(factKindLabel(B.kind))}</b><br>“${esc(B.words)}”</blockquote></div>
        <div class="row"><button class="btn sm" data-a="facts-resolve" data-id="${esc(c.id)}" data-v="a">${esc(t("facts.conf.a"))}</button><button class="btn sm" data-a="facts-resolve" data-id="${esc(c.id)}" data-v="b">${esc(t("facts.conf.b"))}</button><button class="btn sm ghost" data-a="facts-resolve" data-id="${esc(c.id)}" data-v="both">${esc(t("facts.conf.both"))}</button></div></section>`; }).join("");
  const groups = FACT_KINDS.map(k => { const L = act.filter(e => e.kind === k); return L.length ? `<section class="panel facts-g" data-kind="${k}"><h3>${esc(t("facts.g." + k))} · ${L.length}</h3><div class="list">${L.map(e => factRowHTML(p, e)).join("")}</div></section>` : ""; }).join("");
  const prof = arr(WS.profile && WS.profile.entries).filter(e => str(e.text).trim());
  const copied = new Set(R.entries.filter(e => e.src && e.src.k === "profile").map(e => e.src.ref));
  const profH = prof.length ? `<details class="facts-prof"><summary class="small">${esc(t("facts.prof.t", {n: prof.length}))}</summary><p class="small muted">${esc(t("facts.prof.sub"))}</p><div class="list">${prof.map(e =>
      `<div class="item"><div class="body small">${esc(e.text)}</div><div class="qacts">${copied.has(e.id) ? `<span class="chip ok">${ic("check")}${esc(t("facts.prof.done"))}</span>` : `<button class="btn xs" data-a="facts-copyprof" data-id="${esc(e.id)}">${ic("copy")}${esc(t("facts.prof.copy"))}</button>`}</div></div>`).join("")}</div></details>` : "";
  const known = R.known.length ? `<details class="facts-known"><summary class="small">${esc(t("facts.known.t", {n: R.known.length}))}</summary><ul class="small">${R.known.map(k => `<li>${esc(k.q)} → ${esc(k.a)} <span class="muted">· ${esc(fmtDate(k.at))}</span></li>`).join("")}</ul></details>` : "";
  const blocked = R.blocked.length ? `<details class="facts-blocked"><summary class="small">${esc(t("facts.blocked.t", {n: R.blocked.length}))}</summary><ul class="small">${R.blocked.map(b => `<li><span class="muted">${esc(t("facts.blocked.by", {x: b.short}))}</span> ${esc(b.text)}</li>`).join("")}</ul></details>` : "";
  const olds = old.length ? `<details class="facts-old"><summary class="small">${esc(t("facts.old.t", {n: old.length}))}</summary><div class="list">${old.map(e => factRowHTML(p, e)).join("")}</div></details>` : "";
  return `<section class="panel facts20" data-anchor="facts"><p class="small muted">${esc(t("facts.sub"))}</p>${add}</section>${props}${conf}${groups || `<p class="small muted">${esc(t("facts.empty"))}</p>`}${olds}${known}${blocked}${profH}`;
}

Object.assign(ACTIONS, {
  "facts-open": () => factsOpen(curP()),
  "facts-find": () => { const p = curP(); if (p) factsFind(p); },
  "facts-take": () => { const p = curP(); if (p) factsTakeProps(p); },
  "facts-drop": () => { const p = curP(); if (!p) return; factsOf(p).props = []; touch(p); render(); },
  "facts-edit": (el) => { UI.factsEdit = UI.factsEdit === el.dataset.id ? null : el.dataset.id; render(); if (UI.factsEdit) focusSoon("fe-" + UI.factsEdit); },
  "facts-withdraw": (el) => { const p = curP(), e = p && factById(p, el.dataset.id); if (!e) return; e.status = "withdrawn"; e.withdrawnAt = now(); rcpt20(p, factText(e), t("rc.w.withdrawn")); touch(p); render(); },
  "facts-back": (el) => { const p = curP(), e = p && factById(p, el.dataset.id); if (!e) return; e.status = "active"; delete e.replacedBy; touch(p); render(); factsConflictSoon(p, [e.id]); },
  "facts-resolve": (el) => { const p = curP(); if (p) factsResolve(p, el.dataset.id, el.dataset.v); },
  "facts-copyprof": (el) => { const p = curP(), x = p && arr(WS.profile && WS.profile.entries).find(e => e.id === el.dataset.id); if (!x) return;
    const e = factsAdd(p, {kind: "fact", words: x.text, src: {k: "profile", ref: x.id, label: ""}}); if (!e) return; rcpt20(p, factText(e), t("rc.w.facts")); touch(p); render(); factsConflictSoon(p, [e.id]); },
  "ask-change": (el) => askChange(curP(), el.dataset.ref),
  "known-close": () => { UI.known20 = null; render(); },
  "blocked-close": () => { UI.blocked20 = null; render(); }
});
["facts-open", "facts-edit", "known-close", "blocked-close", "ask-change"].forEach(a => ACT_NO.add(a));
Object.assign(CHANGES, { "facts-tick": (el) => { const p = curP(); if (!p) return; UI.factsOff = UI.factsOff || {}; const o = UI.factsOff[p.id] = UI.factsOff[p.id] || {}; if (el.checked) delete o[el.dataset.id]; else o[el.dataset.id] = true; render(); } });
FORMS["facts-add"] = f => { const p = curP(); if (!p) return; const w = str((f.querySelector("#fa-words") || {}).value).trim(), k = str((f.querySelector("#fa-kind") || {}).value);
  if (!w){ toast(t("facts.need"), "err"); return; }
  const e = factsAdd(p, {kind: k, words: w}); if (!e) return; delete UI.qDraft["facts-add"];
  logAct(p, t("facts.added", {x: e.id}), {step: "interview"}); rcpt20(p, factText(e), t("rc.w.factsk", {k: factKindLabel(e.kind)}));
  touch(p); render(); factsConflictSoon(p, [e.id]); };
FORMS["facts-edit"] = f => { const p = curP(), e = p && factById(p, f.dataset.id); if (!e) return; const w = factNorm((f.querySelector("#fe-" + e.id) || {}).value);
  if (!w){ toast(t("facts.need"), "err"); return; }
  if (w !== e.words){ e.hist = arr(e.hist); e.hist.push({at: now(), words: e.words, short: e.short}); if (factText(e) === e.words) e.short = w; e.words = w; e.kw = []; e.at = now(); }
  UI.factsEdit = null; rcpt20(p, factText(e), t("rc.w.facts")); touch(p); render(); factsConflictSoon(p, [e.id]); };
document.addEventListener("input", e => { const el = e.target; if (el && el.id === "fa-words") UI.qDraft["facts-add"] = el.value; });
