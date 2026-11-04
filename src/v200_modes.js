/* ===================== 2.0.0 PART C — TWO FACES OF ONE LEDGER: PICK AND CHAT WITH STRUCTURE =====================
   The owner (3–4 Nov 2026): "scrap all modes, only keep and improve the Pick mode, and make a new mode Chat with structure that
   can do all we want … as seamless, understandable, user-friendly, automatic, logical and visually matching as maximally possible".
   - Two faces only: Pick (the deck, the pages) and Chat with structure (talk freely; PT answers, files what it learns into the
     facts book with "✓ Noted" receipts, keeps the goal card and the live map beside the conversation, shows the one Next and
     small chips so the owner rarely types). Both read and write the same project: p.ledger (Part A), p.goal20 / p.map20 (Part B),
     p.pick (cards and answers). A question PT asks in the chat IS a pick card, so what is answered in one face is answered in the other.
   - Every AI answer of the chat passes Part A's rules check (buildPrompt with proj: <your_rules> first, runAI's check); the order
     goal → map → decide → details holds (before the decision the route-splitting rule, after it <chosen_route>).
   - Steps, Blueprint, Journey, Swimlanes and Express are gone (their data stays readable: they were views over one item model).
   - The move to 2.0 (once per project, when its workspace opens): a restore point "Before 2.0" first, then additive only — the
     project's own rules into its facts book, its 1.x design options onto its map (a confirmed choice = the chosen route), p.mode
     to a face; nothing is removed; nothing comes from another project. */

MODES.push("chat");
IC.chat20 = '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>';
MODE_ICON.chat = "chat20";
FACT_SRC.push("chat");
FACT_SKIP_KEYS.add("said"); FACT_SKIP_KEYS.add("norm");   // the person's own words in a chat answer are theirs, not a proposal to check against their rules
EX_TASKS.add("chat20");   // the question card in a chat answer is a pick card: its examples never ask
const C20_MAX = 160, C20_CTX = 10, C20_FILE_MAX = 6;
const C20_TABS = ["goal", "map", "decided", "plan", "events"];
const C20_NEVER = /\b(never|nie|niemals|nicht|no|kein|keine|keinen)\b|绝不|从不|不要|不能|不得/i;
const C20_MUST = /\b(must|always|muss|müssen|immer)\b|必须|一定要|总是/i;
const C20_PT = /\b(PT|Prompt Translator)\b|\b(this|the) (button|screen|page|tab|card|chip|menu)\b|\b(dieser|diese|dieses|der|die|das) (Knopf|Bildschirm|Seite|Karte|Reiter)\b|这个(按钮|页面|屏幕|卡片)/i;

/* ---------- 1. data: the conversation of one project (never shared with another project) ---------- */
function c20Blank(){ return {v: 1, msgs: [], n: 0}; }
function c20Read(p){ const C = p && p.chat20 && typeof p.chat20 === "object" ? p.chat20 : null; return C ? {v: 1, msgs: arr(C.msgs), n: num(C.n, 0)} : c20Blank(); }
function c20Of(p){ if (!p.chat20 || typeof p.chat20 !== "object") p.chat20 = c20Blank(); const C = p.chat20; C.msgs = arr(C.msgs); C.n = num(C.n, C.msgs.length); C.v = 1; return C; }   // ok:field the conversation's own default (blankProject has it; older projects get it here)
function c20Add(p, m){ const C = c20Of(p); const x = Object.assign({id: "c" + (++C.n), at: now()}, m); C.msgs.push(x); if (C.msgs.length > C20_MAX) C.msgs = C.msgs.slice(-C20_MAX); return x; }
{ const orig = blankProject; blankProject = function(name){ const p = orig(name); p.chat20 = c20Blank(); p.m200 = {v: 1, at: now(), fresh: true}; return p; }; }   // ok:field the template default: a new project needs no move to 2.0
/* a project stored before 2.0 has no move record: normalizeProject would copy the new project's one onto it */
const M200 = {raw: null, ran: null};
{ const orig = normalizeProject; normalizeProject = function(p){
    const had = !!p && Object.prototype.hasOwnProperty.call(p, "m200");
    try{ if (!had && M200.raw && p && p.id && !M200.raw.has(p.id)) M200.raw.set(p.id, clone(p)); }catch(e){ console.warn("2.0 move: copy as stored", e); }   // ok:catch without the copy the restore point is made from the loaded project
    const r = orig.apply(this, arguments);
    if (p && !had) delete p.m200;
    return r; }; }

/* ---------- 2. the face: which one is shown, and the switch ---------- */
function c20St(p){
  if (!UI.c20 || UI.c20.pid !== p.id) UI.c20 = {pid: p.id, on: true, tab: c20DefTab(p), side: "chat"};
  return UI.c20;
}
function c20DefTab(p){ const M = m20Read(p); return M.routes.length || M.notyet.length ? "map" : "goal"; }
/** the conversation is on screen: the Chat face, and no page, facts book, decisions list or finish run opened over it */
function c20Show(p){
  if (!p || projMode(p) !== "chat" || UI.view !== "project") return false;
  if (UI.factsView === p.id || UI.rowsView === p.id || (UI.finish && UI.finish.pid === p.id) || isPageModal()) return false;
  return !!c20St(p).on;
}
function face20Set(p, v){
  if (!p || !MODES.includes(v)) return;
  const was = projMode(p);
  if (was !== v){ p.mode = v; touch(p); }
  UI.factsView = null; UI.rowsView = null; UI.finish = null; UI.pg = null;
  if (v === "chat"){ const S = c20St(p); S.on = true; UI.home = false; }
  else { UI.m20 = null; UI.home = true; if (UI.c20 && UI.c20.pid === p.id) UI.c20.on = false; }
  render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0;
  if (was !== v) toast(t("face.switched", {x: t("m." + v)}), "ok");
  if (v === "chat") focusSoon("c20-in");
}
modeBar = function(p){
  if (!p) return "";
  const m = projMode(p), on = x => m === x && (x !== "chat" || c20Show(p));
  return `<div class="seg face20" role="group" aria-label="${esc(t("face.label"))}">${["chat", "pick"].map(x => `<button class="${m === x ? "on" : ""}" data-a="face20" data-v="${x}" aria-pressed="${m === x}" ${on(x) ? 'aria-current="true"' : ""} title="${esc(t("face.tip." + x))}">${ic(MODE_ICON[x])}<span class="mode-l">${esc(t("m." + x))}</span></button>`).join("")}</div>`;
};
/* the switch is always in the status line (also on the cover and in the chat) */
{ const orig = statusLine; statusLine = function(p){
    const h = orig(p);
    if (!p || h.includes('class="seg face20"')) return h;
    return h.replace('<span style="flex:1"></span>', '<span style="flex:1"></span>' + modeBar(p)); }; }
{ const orig = modeBody; modeBody = function(p){ return c20Show(p) ? c20HTML(p) : orig(p); }; }
{ const orig = homeView; homeView = function(p){ return c20Show(p) ? c20HTML(p) : orig(p); }; }
/* leaving the conversation for a page; Cover / Home / the face switch bring it back */
{ const orig = pgOpen; pgOpen = function(p){ if (p && UI.c20 && UI.c20.pid === p.id) UI.c20.on = false; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["home"]; ACTIONS["home"] = function(){ const p = curP(); if (p && projMode(p) === "chat"){ c20St(p).on = true; UI.pg = null; } return orig.apply(this, arguments); }; }
{ const orig = openProject; openProject = function(id){ if (UI.c20 && UI.c20.pid !== id) UI.c20 = null; return orig.apply(this, arguments); }; }
/* in the chat, the map, the goal card and the decision open in the workspace beside the conversation (one picture, never a jump away) */
{ const orig = m20Open; m20Open = function(p, v = "map"){
    if (p && projMode(p) === "chat" && UI.view === "project" && (c20St(p).on || UI.home)){ const S = c20St(p); S.on = true; S.tab = v === "goal" ? "goal" : "map"; S.side = "ws"; }
    return orig.apply(this, arguments); }; }
/* the one Next in the chat: "next pick" is the question in the conversation, "describe your idea" is the composer */
{ const orig = pgNextBtn; pgNextBtn = function(p, o = {}){
    if (!c20Show(p)) return orig.apply(this, arguments);
    const nx = spineState(p).next || {};
    if (nx.a === "goto-ref" && (nx.ref === "#pk-deck" || nx.ref === "goal")) return `<button class="btn ${o.big ? "lg" : "sm"} primary" data-a="c20-focus" data-v="${nx.ref === "goal" ? "say" : "card"}">${ic("arrow")}${esc(nx.ref === "goal" ? t("c20.next.say") : nx.label)}</button>`;
    return orig.apply(this, arguments); }; }

/* ---------- 3. the conversation: one call per message, filed into the facts book ---------- */
const C20_SCHEMA = `{"reply":"your answer to the person, 1-4 short sentences in plain words","about":"tool|pt|both","file":[{"kind":"never|must|fact|decision|tool","said":"the person's exact words from the newest message","norm":"PT's short form, one plain sentence"}],"goal":{"outcome":"","whom":"","situation":"","success":"","where":"","budget":""},"cards":[${PK_CARD_SCHEMA}],"next":"map|goal|none"}`;
function c20Ctx(p){
  const C = c20Read(p), last = C.msgs.filter(m => m.by === "you" || m.by === "pt").slice(-C20_CTX);
  return last.map(m => ({by: m.by === "you" ? "person" : "PT", text: str(m.text).slice(0, 1200)}));   // ok:cut the last turns as context; the whole conversation stays stored
}
function c20GoalJSON(p){ const G = goal20Read(p), o = {}; for (const k of M20_GOAL) o[k] = str(G.f[k]).trim() ? (G.by[k] === "you" ? {said: G.f[k]} : {guess: G.f[k]}) : "empty"; return o; }
function c20MapJSON(p){
  const M = m20Read(p), ch = m20Chosen(p);
  return {routes: M.routes.slice(0, 30).map(r => ({id: r.id, name: r.name, status: m20Status(p, r)})), shortlisted: M.short, chosen: ch ? {id: ch.id, name: ch.name} : null};
}
function c20Decided(p){ return pickRead(p).log.filter(e => str(e.answer).trim()).slice(-30).map(e => ({q: str(e.q), a: str(e.answer)})); }
function c20Prompt(p, text){
  const stage = stage20Early(p) ? ST20_SPLIT : stage20RouteBlock(p);
  return buildPrompt("chat20", {proj: p, rules: ["elicit", "simple"], context: projectContext(p, {max: 14000}),
    body: `You are Prompt Translator's partner in "Chat with structure": the person talks freely about the tool they want built; you answer briefly AND file what they said, so nothing is asked twice and nothing they ruled out comes back.
Read the newest message against the conversation so far, the goal card, what is decided and the map.
1. "file": each rule, fact or decision the newest message states about the TOOL or the person's situation: "never" (must never happen or be used), "must" (must always hold), "fact" (about the person's world), "decision" (a choice), "tool" (how the finished tool behaves). "said" quotes the person's own words exactly from the newest message; "norm" is your short form. Leave out what <your_rules> or <your_facts> already hold, and anything you guess.
2. "about": "pt" when the message is feedback about Prompt Translator itself (its screens, buttons, flow, wording) and not about the tool: then file nothing; "both" when it holds both; else "tool".
3. "goal": only for goal fields that are "empty" or a guess, your best one-sentence guess from what the person said (leave the others out).
4. "cards": at most one question, only when one answer would help most now, in Pick's card shape (2-4 options the person can tap). Never a question the facts, the decided list or the goal card already answer.
5. "next": "map" when the goal is clear enough to look at all ways to reach it, "goal" when the goal card should be checked first, else "none".
6. "reply": answer the person; when you filed something, say so in a few words. Never promise what PT cannot do.${stage}
<goal>${JSON.stringify(c20GoalJSON(p))}</goal>
<decided>${jsonFit(c20Decided(p), 12000, x => x.q)}</decided>
<map>${JSON.stringify(c20MapJSON(p))}</map>
<conversation>${JSON.stringify(c20Ctx(p).slice(0, -1))}</conversation>
<message>${JSON.stringify(str(text))}</message>`,
    schema: C20_SCHEMA});
}
function c20InMsg(text, said){ const q = factNorm(said).toLowerCase(), m = factNorm(text).toLowerCase(); return q.length >= 3 && (m.includes(q) || pickSame(m, q)); }
function c20Checks(p, text, o){
  const lang = contentLang(p), k = pickRead(p);
  const bad = arr(o && o.file).filter(f => f && str(f.said).trim() && !c20InMsg(text, f.said)).slice(0, 4).map(f => `the quote ${JSON.stringify(str(f.said).slice(0, 120))} is not in the newest message: quote the person's exact words, or leave the entry out`);   // ok:cut the repair note quotes the start
  return [...bad, ...arr(o && o.cards).slice(0, 1).flatMap(c => pickCardChecks(c, k, lang))];
}
async function c20AI(p, text){
  const prompt = c20Prompt(p, text);
  return runAI("chat20", t("c20.busy"), prompt, {pid: p.id, step: "interview", validate: o => o && typeof o.reply === "string" && !!o.reply.trim(), check: o => c20Checks(p, text, o)});
}
/** what code sees by itself in a message: a rule with "never" / "must" (a rule is never lost because a call failed or missed it) */
function c20CodeFile(text){
  if (C20_PT.test(text)) return [];
  return factSentences(text).filter(s => C20_NEVER.test(s) || C20_MUST.test(s)).slice(0, 3).map(s => ({kind: C20_NEVER.test(s) ? "never" : "must", said: s, norm: s, code: true}));
}
/** file one message: new entries into the facts book (the ones it already holds are named, not added twice) */
function c20File(p, text, list, ref){
  const out = {filed: [], known: []}, seen = [];
  for (const f of list){
    if (out.filed.length >= C20_FILE_MAX) break;
    const said = factNorm(f && f.said), norm = factNorm(f && f.norm) || said;
    if (!said || !c20InMsg(text, said) || seen.some(s => askSim(s, norm) >= 0.8 || askSim(s, said) >= 0.8)) continue;
    seen.push(norm);
    const have = factsActive(p).find(e => askSim(factText(e), norm) >= 0.8 || askSim(factNorm(e.words), said) >= 0.8);
    if (have){ out.known.push(have.id); continue; }
    const e = factsAdd(p, {kind: oneOf(str(f.kind), FACT_KINDS, "fact"), words: said, short: norm, src: {k: "chat", ref, label: t("c20.src")}, by: "you"});
    if (e) out.filed.push(e.id);
  }
  return out;
}
function c20Goal(p, g){
  if (!g || typeof g !== "object") return [];
  const G = goal20Of(p), ns = p.northStar = p.northStar || {}, NS = {outcome: "goal", whom: "users", success: "success", situation: "problem"}, done = [];   // ok:field the north star exists on every project
  for (const k of M20_GOAL){ const v = factNorm(g[k]); if (!v || G.by[k] === "you" || str(G.f[k]).trim()) continue;
    G.f[k] = v; G.by[k] = "pt"; done.push(k);
    if (NS[k] && !str(ns[NS[k]]).trim()) ns[NS[k]] = v; }   // ok:field the north star exists on every project; it follows the card's guess only where it was empty
  return done;
}
const C20RUN = {pid: null, n: 0};
async function c20Send(p, text){
  const s = str(text).trim(); if (!p || !s) return null;
  if (AI.running.has(akey("chat20", p.id))){ toast(t("c20.wait"), ""); return null; }
  const ws0 = WS.id;
  actOpen(p, t("c20.act.you")); const you = c20Add(p, {by: "you", text: s}); touch(p); actClose(p.id);
  render(); c20Scroll();
  const r = await c20AI(p, s);
  const q = pickLive(p, ws0); if (!q) return null;
  return c20Apply(q, you, r);
}
function c20Apply(p, you, r){
  const s = str(you.text), ref = "chat:" + you.id;
  actOpen(p, t("c20.act", {x: trunc(s, 40)}), {by: "pt"});
  const about = r ? oneOf(str(r.about), ["tool", "pt", "both"], "tool") : (C20_PT.test(s) ? "pt" : "tool");
  const list = about === "pt" ? [] : [...arr(r && r.file), ...c20CodeFile(s)];
  const F = c20File(p, s, list, ref);
  const goal = r && about !== "pt" ? c20Goal(p, r.goal) : [];
  let card = null;
  if (r && about !== "pt"){ const k = pickOf(p), asked = k.cards.map(c => c.q);   // a question answered before goes through ask once below (dropped and named, never asked again)
    for (const c0 of arr(r.cards).slice(0, 1)){ const c = pickCleanCard(c0, k.session.n, k); if (!c || asked.some(a => pickSame(a, c.q))) continue; c.by = "chat"; c.chat = you.id; k.cards.unshift(c); markPT(p, "pick:" + c.id, "added", t("c20.why.card")); card = c.id; } }
  const G = r ? c20Guard(p, str(r.reply).trim()) : {text: "", cut: null};
  const pt = c20Add(p, {by: "pt", text: r ? G.text || t("c20.cut.all") : t("c20.fail"), cut: G.cut, fail: !r, about, filed: F.filed, known: F.known, goal, card, next: r ? oneOf(str(r.next), ["map", "goal", "none"], "none") : "none", to: you.id});
  if (F.filed.length) rcpt20(p, F.filed.map(id => factText(factById(p, id))).join(" · "), t("rc.w.facts"));
  logAct(p, t("c20.log", {n: F.filed.length}), {step: "interview"});
  touch(p); actClose(p.id);
  if (F.filed.length) factsConflictSoon(p, F.filed);
  if (card) askOnceRun(p, [{id: card, q: pickCard(p, card).q}], {where: "chat", drop: x => { const k = pickOf(p); k.cards = k.cards.filter(c => c.id !== x.id); const m = c20Read(p).msgs.find(y => y.id === pt.id); if (m){ m.card = null; m.dropped = true; } }}).catch(e => onAppError(e && e.message, "ask-once:chat"));
  render(); c20Scroll();
  return pt;
}
/** the reply still breaks a rule after the one repair: those sentences are left out (named), never shown as advice */
function c20Guard(p, text){
  const rules = factsActive(p, FACT_RULES); if (!rules.length) return {text, cut: null};
  const hits = factCodeHits(rules, text).filter(h => FACT_GUARD.cache.get(factGuardKey(h.e, h.s)) !== false); if (!hits.length) return {text, cut: null};
  const bad = new Set(hits.map(h => h.s)), keep = factSentences(text).filter(s => !bad.has(s));
  return {text: keep.join(" "), cut: {n: bad.size, rule: factText(hits[0].e), id: hits[0].e.id}};
}
function c20Scroll(){ setTimeout(() => { const L = document.querySelector(".c20-log"); if (L) L.scrollTop = L.scrollHeight; }, 30); }
/** feedback about PT goes to Improve PT, never into the project */
function c20ToolFile(p, mid){
  const m = c20Read(p).msgs.find(x => x.id === mid); if (!m) return;
  const you = c20Read(p).msgs.find(x => x.id === m.to); if (!you) return;
  actOpen(p, t("c20.act.tool"));
  const e = factsAdd(p, {kind: "tool", words: you.text, short: you.text, src: {k: "chat", ref: "chat:" + you.id, label: t("c20.src")}, by: "you"});
  if (e){ m.filed = arr(m.filed).concat(e.id); m.about = "tool"; rcpt20(p, factText(e), t("rc.w.facts")); }
  touch(p); actClose(p.id); render();
}

/* ---------- 4. the screen: the conversation and the workspace (goal · map · decided · plan · events) ---------- */
function c20KindWord(k){ return t("c20.k." + oneOf(k, FACT_KINDS, "fact")); }
function c20MsgHTML(p, m){
  if (m.by === "you") return `<div class="c20-m you" id="c20m-${esc(m.id)}"><div class="c20-who">${esc(t("c20.you"))}</div><div class="c20-b">${esc(m.text)}</div></div>`;
  if (m.by === "sys") return `<div class="c20-m sys" id="c20m-${esc(m.id)}"><div class="c20-b small">${ic("info")} ${esc(m.text)}</div></div>`;
  const notes = [];
  for (const id of arr(m.filed)){ const e = factById(p, id); if (!e) continue; const off = e.status !== "active";
    notes.push(`<div class="c20-note ${off ? "off" : ""}" role="status"><span class="rc20-ok">${ic("check")}${esc(t(off ? "c20.noted.off" : "c20.noted", {k: c20KindWord(e.kind)}))}</span> <span class="c20-nw">“${esc(factText(e))}”</span> <span class="small muted">${esc(e.id)}</span>${off ? "" : `<button class="btn xs ghost" data-a="c20-fedit" data-id="${esc(e.id)}" aria-label="${esc(t("btn.edit") + ": " + factText(e))}">${ic("edit")}</button><button class="btn xs ghost" data-a="facts-withdraw" data-id="${esc(e.id)}" aria-label="${esc(t("c20.undo1") + ": " + factText(e))}">${ic("undo")}${esc(t("c20.undo1"))}</button>`}</div>`); }
  for (const id of arr(m.known)){ const e = factById(p, id); if (e) notes.push(`<div class="c20-note known"><span>${ic("check")}${esc(t("c20.known"))}</span> <span class="c20-nw">“${esc(factText(e))}”</span> <span class="small muted">${esc(e.id)}</span></div>`); }
  if (arr(m.goal).length) notes.push(`<div class="c20-note"><span>${ic("target")}${esc(t("c20.goal", {x: m.goal.map(k => t("g20.f." + k)).join(", ")}))}</span> <button class="btn xs" data-a="m20-open" data-v="goal">${esc(t("g20.check"))}</button></div>`);
  if (m.about === "pt" || m.about === "both") notes.push(`<div class="c20-note about"><span>${ic("flag")}${esc(t(m.about === "pt" ? "c20.about.pt" : "c20.about.both"))}</span> <button class="btn xs" data-a="c20-ipt" data-id="${esc(m.id)}">${esc(t("c20.about.send"))}</button>${m.about === "pt" ? `<button class="btn xs ghost" data-a="c20-istool" data-id="${esc(m.id)}">${esc(t("c20.about.tool"))}</button>` : ""}</div>`);
  if (m.cut) notes.push(`<div class="c20-note about"><span>${ic("shield")}${esc(t("c20.cut", {n: m.cut.n}))}</span> <span class="c20-nw">“${esc(m.cut.rule)}”</span> <span class="small muted">${esc(m.cut.id)}</span></div>`);
  if (m.dropped) notes.push(`<div class="c20-note known"><span>${ic("check")}${esc(t("c20.dropped"))}</span></div>`);
  if (m.card && pickCard(p, m.card)) notes.push(`<div class="c20-note"><span>${ic("arrow")}${esc(t("c20.card.below"))}</span></div>`);
  else if (m.card && pickRead(p).log.some(e => e.cid === m.card)){ const e = pickRead(p).log.find(x => x.cid === m.card); notes.push(`<div class="c20-note"><span>${ic("check")}${esc(t("c20.card.done"))}</span> <span class="c20-nw">${esc(e.q)} → <b>${esc(e.answer)}</b></span></div>`); }
  if (m.fail) notes.push(`<div class="row"><button class="btn xs" data-a="c20-retry" data-id="${esc(m.to || "")}">${esc(t("c20.retry"))}</button></div>`);
  return `<div class="c20-m pt" id="c20m-${esc(m.id)}"><div class="c20-who">PT</div><div class="c20-b">${mdLite(m.text)}</div>${notes.join("")}</div>`;
}
function c20Chips(p){
  const M = m20Read(p), out = [], busy = AI.running.size > 0 || m20Busy(p);
  const G = goal20Read(p);
  if (!str(G.f.outcome).trim()) out.push({a: "c20-say", v: t("c20.chip.idea.say"), l: t("c20.chip.idea")});
  else {
    if (!goal20Clear(p) && !G.skip) out.push({a: "m20-open", v: "goal", l: t("c20.chip.goal")});
    if (!M.routes.length) out.push({a: "m20-open", v: "map", l: t("c20.chip.map")});
    else if (!m20Chosen(p)) out.push({a: "m20-open", v: M.short.length >= 2 ? "compare" : "map", l: t(M.short.length >= 2 ? "c20.chip.compare" : "c20.chip.short", {n: M.short.length})});
  }
  out.push({a: "c20-say", v: t("c20.chip.never.say"), l: t("c20.chip.never"), fill: true});
  out.push({a: "c20-say", v: t("c20.chip.next.say"), l: t("c20.chip.next")});
  return out.map(c => `<button class="btn xs c20-chip" data-a="${c.a}" ${c.a === "c20-say" ? `data-t="${esc(c.v)}" ${c.fill ? 'data-fill="1"' : ""}` : `data-v="${esc(c.v)}"`} ${busy && c.a === "c20-say" && !c.fill ? "disabled" : ""}>${esc(c.l)}</button>`).join("");
}
function c20CardHTML(p){
  const d = pickDeck(p); if (!d.length) return "";
  const c = d[0];
  return `<section class="c20-ask" aria-label="${esc(t("c20.ask.t"))}" data-anchor="c20-ask"><div class="small muted c20-askh">${ic("pick")} ${esc(t("c20.ask.t"))}${d.length > 1 ? " · " + esc(t("c20.ask.more", {n: d.length - 1})) : ""}</div>${pickCardHTML(p, c, "chat")}</section>`;
}
function c20DecidedHTML(p){
  const dec = factsActive(p, ["decision"]), log = pickRead(p).log.filter(e => str(e.answer).trim() && !e.assumed), D = m20Decision(p);
  const rows = dec.map(e => { const rt = /^route:/.test(str(e.src && e.src.ref)) ? m20Route(p, str(e.src.ref).slice(6)) : null;
    return `<div class="item">${stSlot("ok")}<div class="body"><span class="small">${rt ? `<b>${esc(t("c20.dec.route", {x: rt.id + " · " + rt.name}))}</b> · ` : ""}${esc(factText(e))}</span><span class="small muted">${esc(e.id)} · ${esc(factSrcLabel(e))} · ${esc(fmtDate(e.at))}</span></div></div>`; }).join("");
  const picks = log.slice(-40).reverse().map(e => `<div class="item">${stSlot("ok")}<div class="body"><span class="small"><b>${esc(e.q)}</b> → ${esc(e.answer)}</span><span class="small muted">${esc(t(e.from === "second" ? "c20.dec.second" : "c20.dec.pick"))} · ${esc(fmtDate(e.at))}</span></div><div class="qacts"><button class="btn xs ghost" data-a="pk-change" data-id="${esc(e.id)}">${esc(t("int.change"))}</button></div></div>`).join("");
  return `<section class="panel c20-dec" data-anchor="decided20"><h3>${esc(t("c20.dec.t", {n: dec.length + log.length}))}</h3><p class="small muted">${esc(t("c20.dec.sub"))}</p>
    ${D ? "" : `<p class="small">${esc(t(stage20On(p) ? "c20.dec.noroute" : "c20.dec.noroute1"))}</p>`}
    ${rows ? `<div class="list">${rows}</div>` : ""}${picks ? `<h4 class="small">${esc(t("c20.dec.picks", {n: log.length}))}</h4><div class="list">${picks}</div>` : ""}${!rows && !picks ? `<p class="small muted">${esc(t("c20.dec.none"))}</p>` : ""}</section>`;
}
function c20PlanHTML(p){
  const cur = stage20Of(p), wait = stage20Waiting(p);
  return `<section class="panel c20-plan" data-anchor="plan20"><h3>${esc(t("c20.plan.t"))}</h3><p class="small muted">${esc(t(stage20On(p) ? "c20.plan.sub" : "c20.plan.sub1"))}</p>
    ${STAGE20.map(id => `<details class="c20-st" ${id === cur ? "open" : ""}><summary><b>${esc(t("st20.s." + id))}</b> ${stage20Done(p, id) ? `<span class="small" style="color:var(--ok)">✓ ${esc(t("st20.done"))}</span>` : id === cur ? `<span class="small">● ${esc(t("st20.here"))}</span>` : ""}</summary>${stage20RowsHTML(p, id)}</details>`).join("")}
    ${wait ? `<p class="small muted">${esc(t("m20.wait", {n: wait}))}</p>` : ""}
    <div class="row"><button class="btn xs" data-a="face20" data-v="pick">${ic("pick")}${esc(t("c20.plan.pick"))}</button></div></section>`;
}
function c20EventsHTML(p){
  const own = m20EventsHTML(p), errs = ev20List().length;
  return `<section class="panel c20-evs" data-anchor="events20"><h3>${esc(t("c20.ev.t"))}</h3>${own || `<p class="small muted">${esc(t("c20.ev.none"))}</p>`}${errs ? `<div class="row"><button class="btn xs" data-a="events-open">${esc(t("c20.ev.errs", {n: errs}))}</button></div>` : ""}</section>`;
}
function c20WsHTML(p){
  const S = c20St(p), M = m20Read(p), tab = oneOf(S.tab, C20_TABS, "goal"), U = m20UI(p);
  const lbl = {goal: t("g20.tab"), map: t("m20.tab", {n: M.routes.length}), decided: t("c20.tab.decided"), plan: t("c20.tab.plan"), events: t("c20.tab.events")};
  let body = "";
  if (tab === "goal") body = goal20HTML(p);
  else if (tab === "map"){ if (!U){ UI.m20 = {pid: p.id, f: {rules: true, today: false, free: false}, sort: "fit", more: {}, v: "map", id: null}; }
    const V = m20UI(p); body = V.v === "card" ? m20CardHTML(p, V.id) : V.v === "compare" ? m20CompareHTML(p) : V.v === "take" ? m20TakeHTML(p, V.id) : m20MapHTML(p);
    if (V.v !== "map") body = `<div class="row"><button class="btn xs ghost" data-a="m20-open" data-v="map">← ${esc(t("c20.ws.back"))}</button></div>` + body; }
  else if (tab === "decided") body = c20DecidedHTML(p) + `<section class="panel">${factsBodyHTML(p)}</section>`;
  else if (tab === "plan") body = c20PlanHTML(p);
  else body = c20EventsHTML(p);
  return `<aside class="c20-ws ${S.side === "ws" ? "on" : ""}" aria-label="${esc(t("c20.ws"))}"><nav class="row c20-tabs" role="tablist" aria-label="${esc(t("c20.ws"))}">${C20_TABS.map(k => `<button class="btn xs ${k === tab ? "primary" : "ghost"}" role="tab" aria-selected="${k === tab}" data-a="c20-tab" data-v="${k}">${esc(lbl[k])}</button>`).join("")}</nav><div class="c20-wsb m20-body">${body}</div></aside>`;
}
function c20HTML(p){
  v200cCss();
  const C = c20Read(p), S = c20St(p), busy = AI.running.has(akey("chat20", p.id));
  const empty = !C.msgs.length ? `<div class="c20-m pt"><div class="c20-who">PT</div><div class="c20-b">${esc(t(str(goal20Read(p).f.outcome).trim() ? "c20.hello.back" : "c20.hello"))}</div></div>` : "";
  const log = `<div class="c20-log" role="log" aria-live="polite" aria-label="${esc(t("c20.log.t"))}" tabindex="0">${empty}${C.msgs.map(m => c20MsgHTML(p, m)).join("")}${busyHTML("chat20")}</div>`;
  const form = `<form class="c20-say" data-form="c20-say"><label class="sr20" for="c20-in">${esc(t("c20.ph"))}</label><textarea id="c20-in" rows="2" placeholder="${esc(t("c20.ph"))}">${esc(UI.qDraft["c20-in"] || "")}</textarea><div class="row">${pickMic("c20-in")}<button class="btn primary" type="submit" ${busy ? "disabled" : ""}>${esc(t("c20.send"))}</button></div></form><p class="small muted c20-hint">${esc(t("c20.hint"))}</p>`;
  const conv = `<section class="c20-conv ${S.side === "ws" ? "" : "on"}" aria-label="${esc(t("c20.conv"))}">${log}${c20CardHTML(p)}<div class="row c20-chips" role="group" aria-label="${esc(t("c20.chips"))}">${c20Chips(p)}</div>${form}</section>`;
  const sw = `<div class="seg c20-sw" role="group" aria-label="${esc(t("c20.ws"))}"><button class="${S.side !== "ws" ? "on" : ""}" data-a="c20-side" data-v="chat" aria-pressed="${S.side !== "ws"}">${esc(t("c20.conv"))}</button><button class="${S.side === "ws" ? "on" : ""}" data-a="c20-side" data-v="ws" aria-pressed="${S.side === "ws"}">${esc(t("c20.ws"))}</button></div>`;
  let nx = ""; try{ nx = nx20HTML(p); }catch(e){ onAppError(e && e.message, "chat:next"); }
  return `<div class="c20" data-page="chat20" data-anchor="page-chat20"><header class="c20-top">${stage20StripHTML(p)}${nx}</header>${sw}<div class="c20-grid">${conv}${c20WsHTML(p)}</div></div>`;
}

/* ---------- 5. Pick, improved: the order holds, the decided list comes from the same book ---------- */
/** before the route is decided, the Picks page leads to the decision (the details wait): goal card → map → shortlist → compare */
function c20PickDecideHTML(p){
  if (!stage20Early(p) || (UI.pgInPage && pgCur(p) !== "picks")) return "";
  const M = m20Read(p), G = goal20Read(p), nx = stage20Next(p);
  const top = m20Sorted(p, M.routes.filter(r => m20Status(p, r) !== "blocked" && !M.rej[r.id])).slice(0, 3);
  const rows = top.map(r => `<div class="item"><div class="body"><b class="small">${esc(r.id + " · " + r.name)}</b><span class="small">${esc(r.line)}</span><span class="row small">${m20Badge(m20Status(p, r))}${m20Fit(r.fitN)}</span></div><div class="qacts"><button class="btn xs ${M.short.includes(r.id) ? "primary" : ""}" data-a="m20-short" data-id="${esc(r.id)}" aria-pressed="${M.short.includes(r.id)}">${esc(M.short.includes(r.id) ? t("c20.pk.shorted") : t("c20.pk.short"))}</button><button class="btn xs ghost" data-a="m20-open" data-v="card" data-id="${esc(r.id)}">${esc(t("c20.pk.card"))}</button></div></div>`).join("");
  const wait = stage20Waiting(p);
  return `<section class="panel c20-pkdec" data-anchor="pick-decide"><div class="small muted">${esc(t("c20.pk.k"))}</div><h3>${esc(t(!M.routes.length ? "c20.pk.h.map" : M.short.length >= 2 ? "c20.pk.h.cmp" : "c20.pk.h.short"))}</h3>
    <p class="small">${esc(t("c20.pk.sub"))}${wait ? " " + esc(t("m20.wait", {n: wait})) : ""}</p>${stage20StripHTML(p)}
    ${rows ? `<div class="list">${rows}</div>` : ""}
    <div class="row">${nx ? `<button class="btn sm primary" data-a="${esc(nx.a)}" data-v="${esc(nx.v || "map")}">${ic("arrow")}${esc(nx.label)}</button>` : ""}<button class="btn sm ghost" data-a="m20-open" data-v="map">${ic("layers")}${esc(t("m20.bar", {n: M.routes.length}))}</button>${str(G.f.outcome).trim() ? "" : `<button class="btn sm ghost" data-a="m20-open" data-v="goal">${esc(t("g20.tab"))}</button>`}</div></section>`;
}
{ const orig = modePick; modePick = function(p){ const h = orig(p); let d = ""; try{ d = c20PickDecideHTML(p); }catch(e){ onAppError(e && e.message, "pick:decide"); } return d ? h.replace('<div class="pk-deck" id="pk-deck" data-anchor="pk-deck">', d + '<div class="pk-deck" id="pk-deck" data-anchor="pk-deck">') : h; }; }
/* the Decisions page of Pick lists the same book the chat's Decided tab does */
{ const orig = rowsViewHTML; rowsViewHTML = function(p){ const h = orig(p); let d = ""; try{ d = c20DecidedHTML(p); }catch(e){ onAppError(e && e.message, "rows:decided"); } return h.replace('</header>', '</header>' + d); }; }
/* an answer given in either face is a new fact that may break the chosen route (the Route alert watches it) */
{ const orig = pickAnswer; pickAnswer = function(p, cid, o = {}){
    const e = orig.apply(this, arguments);
    try{ if (e && p && m20Chosen(p) && str(e.answer).trim() && !o.assumed) m20WatchSoon(p, {kind: "fact", text: str(e.q) + " → " + str(e.answer), ref: "pick:" + e.id}); }catch(x){ onAppError(x && x.message, "pick:watch"); }
    return e; }; }

/* ---------- 6. the move to 2.0 (once per project; restore point first; additive; never across projects) ---------- */
function m200Lvl(kind){ return {none: 1, prompt: 1, workflow: 2, agent: 3, multi: 4}[str(kind)] || 2; }
function m200Has(p, ref){ return factsRead(p).entries.some(e => e.src && e.src.ref === ref) || factsRead(p).props.some(x => x.src && x.src.ref === ref); }
/** the project's own rules (its constraints, what is not in this version, its constitution) as facts-book entries; never another project's */
function m200Rules(p){
  const ns = p.northStar || {}, out = [], lbl = t("c20.mig.label");
  factSentences(ns.constraints).forEach((s, i) => out.push({kind: FACT_NEG.test(s) ? "never" : "must", words: s, src: {k: "ns", ref: "ns:" + (i + 1), label: lbl}}));
  arr(p.outOfScope).forEach((x, i) => { if (str(x).trim()) out.push({kind: "never", words: str(x), short: t("c20.mig.oos", {x: factNorm(x)}), src: {k: "oos", ref: "oos:" + (i + 1), label: lbl}}); });
  arr(p.constitution).forEach((x, i) => { if (str(x).trim()) out.push({kind: FACT_NEG.test(str(x)) ? "never" : "must", words: str(x), src: {k: "const", ref: "const:" + (i + 1), label: lbl}}); });
  let n = 0;
  for (const o of out){ if (m200Has(p, o.src.ref) || factsActive(p).some(e => askSim(factText(e), o.short || o.words) >= 0.8)) continue; const e = factsAdd(p, Object.assign({by: "pt"}, o)); if (e){ e.m200 = true; n++; } }
  return n;
}
/** the 1.x design options become routes on the map ("from your earlier design, not re-checked"); a choice you confirmed is the chosen route */
function m200Routes(p){
  const a = p.arch || {}, opts = arr(a.options).filter(o => o && str(o.name).trim()); if (!opts.length) return {n: 0, chosen: false};
  const M = m20Of(p); let n = 0;
  for (const o of opts){
    if (M.routes.some(r => r.from === "arch:" + o.id)) continue;
    const r = m20Norm({name: o.name, line: str(o.summary), lvl: m200Lvl(o.kind), status: "work", fitN: 3, evidence: t("c20.mig.evidence"), conf: "low", how: o.kind === "none" ? "buy" : "build"}, {lens: "", round: 0});
    if (!r) continue; r.id = "R" + M.nextR++; r.from = "arch:" + o.id; r.old = true; r.breaks = []; M.routes.push(r); n++;
  }
  let chosen = false;
  const ch = a.chosen && !a.chosenAssumed ? M.routes.find(r => r.from === "arch:" + a.chosen) : null;
  if (ch && !M.chosen){
    const nm = (opts.find(o => o.id === a.chosen) || {}).name || ch.name;
    const e = m200Has(p, "route:" + ch.id) ? null : factsAdd(p, {kind: "decision", words: t("c20.mig.dec", {x: nm}), src: {k: "dec", ref: "route:" + ch.id, label: t("c20.mig.label")}, by: "you"});
    M.decs.push({id: uid("rd"), at: now(), route: ch.id, name: ch.name, why: t("c20.mig.decwhy"), compared: [], rejected: [], trip: [], switchCost: "", higher: "", fact: e ? e.id : "", status: "active", fields: ["outcome", "whom", "success"], m200: true});
    M.chosen = ch.id; M.neutral = m20Refs(p); M.tags = {}; chosen = true;
  }
  if (n) m20Event(p, "lib", t("c20.mig.ev", {n}), {add: M.routes.filter(r => r.old).map(r => r.id)});
  return {n, chosen: chosen || !!(M.chosen && M.routes.some(r => r.id === M.chosen))};
}
/** the new order only where it is safe: a decided route, or no detail work yet (a project mid-way keeps its order and is told how to switch) */
function m200Order(p, chosen){
  if (stage20On(p)) return "on";
  const details = arr(p.requirements).length + arr(p.assumptions).length + arr(p.risks).length + arr(p.tests).length + arr(p.pkg && p.pkg.sections).length;
  if (chosen || !details){ p.order20 = true; return chosen ? "decided" : "early"; }
  return "kept";
}
/* the fields the move may write (its own, additive ones); every other field of the project must be exactly as before (a hash per field) */
const M200_OWN = new Set(["restore", "ledger", "map20", "goal20", "chat20", "m200", "order20", "mode", "modeBefore200", "seq", "marks", "updatedAt"]);
const M200_CURSOR = new Set(["focus", "seenAt"]);   // where the cursor is and when the project was last opened: not content
function m200Prints(p){ const o = {}; for (const k of Object.keys(p)) if (!M200_OWN.has(k) && !M200_CURSOR.has(k) && !k.startsWith("_")) o[k] = hashStr(JSON.stringify(p[k]) || ""); return o; }
function m200Changed(p, fp){ return Object.keys(fp).filter(k => hashStr(JSON.stringify(p[k]) || "") !== fp[k]); }
function m200Run(p, raw){
  if (!p || p.m200) return null;
  const names = arr(STR["c20.mig.rp"]), had = arr(p.restore).find(r => names.some(n => str(r.label).includes(n)));   // run again (a record lost): the point made the first time stands
  const rp = had || addRestore(p, {kind: "migrate", label: t("c20.mig.rp"), source: raw || null}) || arr(p.restore).slice(-1)[0] || null;   // the same content as the last restore point: that one is labelled "Before 2.0" too
  const fp = m200Prints(p);
  const rec = {v: 1, at: now(), rp: rp ? rp.id : "", from: {mode: str(p.mode), before: str(p.modeBefore160)}, rules: 0, routes: 0, order: "", errs: [], prints: fp};
  const step = (name, fn) => { try{ fn(); }catch(e){ rec.errs.push(name); onAppError(e && e.message, "m200:" + name); } };
  step("mode", () => { if (!MODES.includes(p.mode)){ if (p.mode) p.modeBefore200 = p.mode; p.mode = "pick"; } });
  step("goal", () => { goal20Of(p); });
  step("rules", () => { rec.rules = m200Rules(p); });
  let chosen = false;
  step("routes", () => { const R = m200Routes(p); rec.routes = R.n; chosen = R.chosen; });
  step("order", () => { rec.order = m200Order(p, chosen); });
  step("chat", () => { c20Of(p); if (!c20Read(p).msgs.some(m => m.m200)) c20Add(p, {by: "sys", m200: true, text: t("c20.mig.msg." + (rec.order || "kept"), {r: rec.rules, n: rec.routes})}); });
  rec.changed = m200Changed(p, fp);   // checked by code: the move changed none of the fields the project had (only its own new ones)
  p.m200 = rec;
  touch(p);
  return rec;
}
function m200All(){
  if (!WS || !Array.isArray(WS.projects)) return 0;
  let n = 0;
  for (const p of WS.projects){ if (p.m200) continue; try{ if (m200Run(p, M200.raw && M200.raw.get(p.id))) n++; }catch(e){ onAppError(e && e.message, "m200"); } }
  return n;
}
{ const orig = openWorkspace; openWorkspace = async function(id){
    M200.raw = new Map(); let r;
    try{ r = await orig.apply(this, arguments); }
    finally{ try{ if (UI.wsReady && !UI.fatal && WS.id === id && WS._set) M200.ran = {ws: id, n: m200All()}; }catch(e){ onAppError(e && e.message, "m200:all"); } M200.raw = null; }
    if (M200.ran && M200.ran.n) render();
    return r; }; }

/* ---------- 7. actions ---------- */
Object.assign(ACTIONS, {
  "face20": (el) => face20Set(curP(), str(el.dataset.v)),
  "mode": (el) => face20Set(curP(), str(el.dataset.v)),   // the 1.x name still works (palette, old links): only the two faces exist
  "c20-tab": (el) => { const p = curP(); if (!p) return; const v = oneOf(str(el.dataset.v), C20_TABS, "goal"); if (v === "map" || v === "goal"){ m20Open(p, v); return; } const S = c20St(p); S.tab = v; S.side = "ws"; render(); },
  "c20-side": (el) => { const p = curP(); if (!p) return; c20St(p).side = el.dataset.v === "ws" ? "ws" : "chat"; render(); },
  "c20-say": (el) => { const p = curP(); if (!p) return; const v = str(el.dataset.t); if (el.dataset.fill){ UI.qDraft["c20-in"] = v; render(); focusSoon("c20-in"); return; } c20Send(p, v); },
  "c20-focus": (el) => { const p = curP(); if (!p) return; const S = c20St(p); S.side = "chat"; render(); if (el.dataset.v === "card"){ const x = document.querySelector(".c20-ask"); if (x){ x.scrollIntoView({block: "nearest"}); const b = x.querySelector("button[data-a]"); if (b) b.focus(); } } else focusSoon("c20-in"); },
  "c20-retry": (el) => { const p = curP(); if (!p) return; const m = c20Read(p).msgs.find(x => x.id === el.dataset.id); if (m) c20Send(p, m.text); },
  "c20-fedit": (el) => { const p = curP(); if (!p) return; factsOpen(p); UI.factsEdit = el.dataset.id; render(); focusSoon("fe-" + el.dataset.id); },
  "c20-ipt": (el) => { const p = curP(); if (!p) return; const m = c20Read(p).msgs.find(x => x.id === el.dataset.id), you = m && c20Read(p).msgs.find(x => x.id === m.to); UI.modal = {kind: "toolreport", where: t("m.chat"), pre: you ? str(you.text) + "\n\n" : ""}; render(); focusSoon("tr-in"); },
  "c20-istool": (el) => { const p = curP(); if (p) c20ToolFile(p, el.dataset.id); }
});
["face20", "mode", "c20-tab", "c20-side", "c20-focus", "c20-fedit", "c20-ipt"].forEach(a => ACT_NO.add(a));
FORMS["c20-say"] = f => { const p = curP(); if (!p) return; const el = f.querySelector("#c20-in"), v = str(el && el.value).trim(); if (!v){ toast(t("c20.need"), "err"); focusSoon("c20-in"); return; } delete UI.qDraft["c20-in"]; if (el) el.value = ""; c20Send(p, v); };
document.addEventListener("input", e => { const el = e.target; if (el && el.id === "c20-in") UI.qDraft["c20-in"] = el.value; });
document.addEventListener("keydown", e => { const el = e.target; if (el && el.id === "c20-in" && e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.isComposing){ e.preventDefault(); const f = el.closest("form"); if (f && FORMS["c20-say"]) FORMS["c20-say"](f); } });

/* ---------- 8. the look (text first; one family with the map's cards; 24 px targets; no sideways scroll on a phone) ---------- */
const V200C_CSS = `
.face20 button{min-height:30px}
.face20 button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}
.c20{display:flex;flex-direction:column;gap:10px;min-width:0}
.c20-top{display:flex;flex-direction:column;gap:4px;min-width:0}
.c20-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:14px;align-items:start;min-width:0}
.c20-conv,.c20-ws{display:flex;flex-direction:column;gap:10px;min-width:0}
.c20-ws{position:sticky;top:8px;max-height:calc(100vh - 120px);overflow:auto;border-left:1px solid var(--line);padding-left:12px}
.c20-log{display:flex;flex-direction:column;gap:10px;max-height:min(62vh,760px);overflow-y:auto;overflow-x:hidden;padding:4px 2px}
.c20-m{display:flex;flex-direction:column;gap:4px;max-width:100%;min-width:0}
.c20-m.you{align-items:flex-end}
.c20-m .c20-who{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.c20-m .c20-b{border:1px solid var(--line);border-radius:12px;padding:9px 12px;background:var(--bg-2);overflow-wrap:break-word;max-width:min(100%,46em);white-space:pre-wrap}
.c20-m.pt .c20-b{white-space:normal}
.c20-m.you .c20-b{background:var(--accent-soft);border-color:var(--accent)}
.c20-m.sys .c20-b{background:transparent;border-style:dashed}
.c20-note{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:12.5px;border-left:3px solid var(--ok);padding:3px 8px;max-width:100%}
.c20-note .rc20-ok,.c20-note>span:first-child{display:inline-flex;gap:4px;align-items:center;font-weight:600;color:var(--ok)}
.c20-note.known{border-left-color:var(--muted)}.c20-note.known>span:first-child{color:var(--muted)}
.c20-note.about{border-left-color:var(--warn)}.c20-note.about>span:first-child{color:var(--warn)}
.c20-note.off{opacity:.6;text-decoration:line-through}
.c20-nw{overflow-wrap:break-word;min-width:0}
.c20-ask{border:1px solid var(--accent);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:0}
.c20-ask .pk-card{margin:0;border:0;box-shadow:none;padding:4px}
.c20-chips{gap:6px;flex-wrap:wrap}
.c20-chip{min-height:30px}
.c20-say{display:flex;flex-direction:column;gap:6px}
.c20-say textarea{width:100%;min-height:3.2em;resize:vertical}
.c20-say .row{justify-content:flex-end}
.c20-tabs{gap:4px;flex-wrap:wrap}
.c20-tabs .btn{min-height:28px}
.c20-wsb{display:flex;flex-direction:column;gap:10px;min-width:0}
.c20-sw{display:none}
.c20-st summary{cursor:pointer;min-height:24px}
.c20-pkdec{border:1px solid var(--accent)}
.c20-dec h4{margin:8px 0 2px}
@media (max-width:1000px){.c20-grid{grid-template-columns:minmax(0,1fr)}.c20-sw{display:flex;align-self:flex-start}.c20-conv:not(.on),.c20-ws:not(.on){display:none}.c20-ws{position:static;max-height:none;border-left:0;padding-left:0}.c20-log{max-height:none}}
`;
function v200cCss(){ try{ if (document.getElementById("v200c-css")) return; const s = document.createElement("style"); s.id = "v200c-css"; s.textContent = V200C_CSS; (document.head || document.documentElement).appendChild(s); }catch(e){ console.warn("2.0 chat: style", e); } }   // ok:catch without the extra style the chat still works (plain layout)
v200cCss();
