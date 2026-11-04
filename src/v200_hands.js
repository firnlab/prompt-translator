/* ===================== 2.0 Part D: PT's hands per project (forms and non-final clicks, the final-button stop) and the morning check =====================
   The owner (agreed for 2.0): "real clicks and typing in forms are OK; final buttons — merge, send, delete, pay, publish — and keys/passwords
   always stay mine". Independent design §6.2 and §4.9 (the action contract).
   1. Sites per project (p.hands20.sites): PT's hands open only pages of the project's own list, plus the github.com pages PT already reads
      (1.10). Clicks and typing need the site on the list (github.com included).
   2. A plan first (CaMeL-like): the owner says what to do; one call writes the steps BEFORE any page is opened; code vets them (sites,
      allowed kinds, no key or password typed, the final button turned into the owner's step). Page text never adds a step.
   3. The action contract is shown before anything runs: what, where, why, can it be undone, every step and whose it is.
   4. The final-button stop: a click whose label is a final word (merge, send, delete, pay, publish, submit, confirm, save … in en/de/zh),
      at plan time or when the page shows it, is never clicked: PT stops one step before, shows "Your click: <button>" and "Take me there"
      (opens the page, puts the pointer on the button). The guard (h20Call) refuses a click or a fill on any element PT did not clear the
      moment before (h20Clear: a click only on a non-final label, a fill only into a field that is not a key, password, code or card field).
   5. Logged per project (p.hands20log, a record: what, which site, how many steps, how it ended; no page text).
   The morning check (§ 9 below): on the owner's first open of a day PT re-runs the 1.10 GitHub checks (pull requests, key dates, the
   release), the tripwires of each chosen route against what came in since the last check, and the map's "Not possible yet" watch lines
   (platform knowledge changed; a watched page changed — read through the Fetch helper when it is installed), shows one summary card on the
   cockpit and raises a Route alert through m20WatchSoon for whatever changed for a project. PT creates no scheduled task itself (the guide
   in Settings › Setup shows how). */
const H20_TOOLS = ["preview_start", "navigate", "get_page_text", "find", "computer", "form_input"];
const H20_MOVES = ["scroll_to", "hover", "wait", "left_click"];
const H20_DO = ["type", "choose", "click"];
/* typing in forms (form_input) stays off in 2.0.0: the platform refuses to grant it to PT from a cloud publish ("publish that change
   from a local session"). Until it is granted, every type/choose step is the owner's, and PT's hands stop before it (no click runs
   after a field nobody filled yet). The typing code stays and is tested with this switched on. */
let H20_TYPE = false;
const H20_MAX = {sites: 20, steps: 12, log: 30};
/* a final button: what cannot be taken back or commits the owner (merge, send, delete, pay, publish, submit/confirm, save, install, agree …) */
const H20_FINAL = /\b(merge|squash|rebase|send|submit|pay|payment|buy|order|purchase|check ?out|delete|remove|erase|publish|post|confirm|subscribe|sign ?up|register|transfer|deploy|release|save|install|accept|agree|authori[sz]e|approve|grant|revoke|close account|cancel (my )?(subscription|account)|unsubscribe|donate|book now|reserve)\b|senden|absenden|abschicken|einreichen|bezahlen|zahlen|kaufen|bestellen|löschen|entfernen|veröffentlichen|bestätigen|zusammenführen|speichern|abonnieren|registrieren|überweisen|installieren|akzeptieren|zustimmen|genehmigen|buchen|spenden|发送|提交|支付|付款|购买|下单|删除|移除|发布|确认|合并|保存|订阅|注册|转账|安装|接受|同意|授权|批准|预订|捐/i;
/* a field PT never types into: keys, passwords, codes, card and account numbers, government ids */
const H20_SECRET_FIELD = /pass(word|code|phrase)?\b|\bpin\b|token|secret|api[ _-]?key|\bkey\b|one[- ]?time|\botp\b|2fa|two[- ]factor|verification code|security code|\bcvc\b|\bcvv\b|card number|credit card|\biban\b|account number|routing|\bssn\b|social security|passport|kennwort|passwort|schlüssel|bestätigungscode|kartennummer|kontonummer|ausweis|密码|密钥|令牌|验证码|卡号|账号|身份证|护照/i;
const H20 = {plan: null, busy: false, live: null, cleared: new Set(), url: ""};

/* ---------- 0. the sites and the guard ---------- */
function h20Read(p){ const H = p && p.hands20 && typeof p.hands20 === "object" ? p.hands20 : {}; return {sites: arr(H.sites).map(s => str(s)).filter(Boolean)}; }
function h20Of(p){ if (!p.hands20 || typeof p.hands20 !== "object") p.hands20 = {sites: []}; p.hands20.sites = arr(p.hands20.sites); return p.hands20; }
function h20Host(u){ try{ const x = new URL(str(u)); return x.protocol === "https:" ? x.hostname.toLowerCase() : ""; }catch(e){ return ""; } }   // ok:catch not an address → no host (refused)
function h20Site(s){ let x = str(s).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[\/?#].*$/, "").replace(/^www\./, ""); return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(x) && x.length <= 120 ? x : ""; }
function h20OnList(p, h){ return h20Read(p).sites.some(s => h === s || h.endsWith("." + s) || h === "www." + s); }
/** may PT's hands open this address for this project: its own sites, plus the github.com pages PT already reads */
function h20SiteOk(p, u){ const h = h20Host(u); return !!h && (h === "github.com" || h20OnList(p, h)); }
/** may PT's hands click or type here: only on a site of the project's list (github.com too only when it is on the list) */
function h20WriteOk(p, u){ const h = h20Host(u); return !!h && h20OnList(p, h); }
function h20IsFinal(label){ return H20_FINAL.test(str(label)); }
function h20SecretField(line){ return H20_SECRET_FIELD.test(str(line)) || /type=["']?password|autocomplete=["']?(one-time-code|current-password|new-password|cc-)/i.test(str(line)); }
function h20SecretVal(v){ const s = str(v); return HANDS_SECRET.test(s) || (/^\S{28,}$/.test(s) && /\d/.test(s) && /[A-Za-z]/.test(s)); }
/** clear one element for one action, the moment before it: a click only on a label that is not final, a fill only into a field that is not secret */
function h20Clear(kind, ref, line){
  if (!ref) return false;
  if (kind === "c" && h20IsFinal(h20Label(line))) return false;
  if (kind === "t" && h20SecretField(line)) return false;
  H20.cleared.add(kind + ":" + ref); return true;
}
function h20Label(line){ const m = /"([^"]*)"/.exec(str(line)); return m ? m[1] : str(line).replace(/\[ref_\d+\]/, "").replace(/^\s*-\s*\w+\s*/, "").trim(); }
/** the only way PT's hands act for a project: the 1.10 rules (owner, key-shaped answers dropped) plus the project's sites, cleared clicks and fills */
async function h20Call(p, tool, input){
  const a = Object.assign({}, input || {});
  if (!handsOk()) throw {code: "hands_owner"};
  if (!H20_TOOLS.includes(tool)) throw {code: "hands_guard", message: tool};
  if (tool === "computer"){
    if (!H20_MOVES.includes(str(a.action))) throw {code: "hands_guard", message: "computer " + str(a.action)};
    if (a.action === "left_click"){ if (a.coordinate || !H20.cleared.has("c:" + str(a.ref))) throw {code: "hands_guard", message: "click not cleared"}; if (!h20WriteOk(p, H20.url)) throw {code: "hands_guard", message: "click off the list"}; H20.cleared.delete("c:" + a.ref); }
  }
  if (tool === "form_input"){
    if (!H20_TYPE) throw {code: "hands_guard", message: "typing is off"};
    if (!H20.cleared.has("t:" + str(a.ref))) throw {code: "hands_guard", message: "field not cleared"};
    if (h20SecretVal(a.value)) throw {code: "hands_secret"};
    if (!h20WriteOk(p, H20.url)) throw {code: "hands_guard", message: "typing off the list"};
    H20.cleared.delete("t:" + a.ref);
  }
  if ((tool === "preview_start" || tool === "navigate") && !h20SiteOk(p, a.url)) throw {code: "hands_guard", message: "address"};
  const m = await handsApi(); if (!m) throw {code: "capability_disabled"};
  const r = await m.callTool(HANDS_SERVER, tool, a);
  const txt = handsText(r && r.payload !== undefined ? r.payload : r);
  if (HANDS_SECRET.test(txt)) throw {code: "hands_secret"};
  if (tool === "preview_start" || tool === "navigate") H20.url = str(a.url);
  return txt;
}
async function h20Open(p, url){
  if (HANDS.tab){
    try{ await h20Call(p, "navigate", Object.assign({url}, handsTab())); return; }
    catch(e){ if (e && ["hands_guard", "hands_secret", "hands_owner", "cancelled", "server_not_connected", "capability_disabled", "not_granted", "not_in_manifest", "approval_required"].includes(e.code)) throw e; HANDS.tab = null; }   // the tab was closed: a new one
  }
  const txt = await h20Call(p, "preview_start", {url});
  const m = /tab[_ ]?id["'\s:=(]+([A-Za-z0-9_-]+)/i.exec(txt); HANDS.tab = m ? m[1] : null;
}
/** the page's address after a click (get_page_text starts with "URL: …"); a page off the list ends the steps */
async function h20Where(p){
  const txt = await h20Call(p, "get_page_text", Object.assign({max_chars: 4000}, handsTab()));
  const m = /^URL:\s*(\S+)/m.exec(txt); if (m) H20.url = m[1];
  return txt;
}
/** the element for a step: a field for type/choose, a button or link for click; answers {ref, line} or null */
async function h20Find(p, q, kind){
  const txt = await h20Call(p, "find", Object.assign({query: q}, handsTab()));
  const L = str(txt).split("\n").filter(l => /\bref_\d+\b/.test(l));
  const want = kind === "click" ? /^\s*-?\s*(button|link|menuitem|tab|checkbox|radio)\b/i : /^\s*-?\s*(textbox|searchbox|combobox|textarea|input|listbox|spinbutton|checkbox|radio)\b/i;
  const best = L.find(l => want.test(l)) || L[0];
  return best ? {ref: best.match(/\bref_\d+\b/)[0], line: best.trim()} : null;
}

/* ---------- 1. the plan, written before any page is opened ---------- */
const H20_SCHEMA = `{"what":"one plain line: what PT's hands will do","url":"https://… the page to open first","why":"one line: why this helps the project","undo":"yes|no|partly","undoHow":"how the person takes it back (or why it cannot be)","steps":[{"do":"type|choose|click","target":"the visible label of the field, option or button","value":"for type/choose: the text or option"}],"final":"the label of the button the person presses at the end (send, pay, publish …), or empty","yours":["fields only the person fills: passwords, keys, codes, card numbers"]}`;
function h20PlanPrompt(p, words){
  return buildPrompt("hands-plan", {proj: p, rules: [], context: projectContext(p, {only: ["north_star"]}),
    body: `The person asks PT's hands (the browser inside the Claude desktop app, acting for the person) to do something on a web page. Write the plan now, before any page is opened: page text will never add a step.
Rules for the plan:
- Only these sites: ${JSON.stringify(h20Read(p).sites.concat("github.com"))}. If the task needs another site, still give its address in "url" (PT will ask the person to add the site first).
- Steps are only "type" (into a field), "choose" (an option) and "click" (a button or link that is not final). At most ${H20_MAX.steps} steps.
- Never a final button (merge, send, delete, pay, buy, publish, submit, confirm, save, install, agree): stop one step before it and name it in "final". The person presses it.
- Never type keys, passwords, codes, card or account numbers: list such fields in "yours".
- Use only what the person said and what the project already knows; never invent personal data.
<request>${JSON.stringify(str(words).slice(0, 2000))}</request>`, schema: H20_SCHEMA});   // ok:cut the request is the person's few lines
}
/** code vets the plan: sites, step kinds, a final word ends the steps (the person's click), secret fields and key-shaped values become the person's */
function h20Vet(p, o, words){
  const P = {pid: p.id, at: now(), words: str(words).trim(), what: str(o && o.what).slice(0, 200), url: str(o && o.url).trim(), why: str(o && o.why).slice(0, 240), undo: oneOf(str(o && o.undo), ["yes", "no", "partly"], "partly"), undoHow: str(o && o.undoHow).slice(0, 240), steps: [], final: str(o && o.final).slice(0, 80), yours: arr(o && o.yours).map(x => str(x).slice(0, 80)).filter(Boolean).slice(0, 6), host: ""};   // ok:cut field caps of an AI answer
  P.host = h20Host(P.url); P.siteOk = !!P.host && h20WriteOk(p, P.url);
  for (const s of arr(o && o.steps).slice(0, H20_MAX.steps)){
    const d = oneOf(str(s && s.do), H20_DO, ""), target = str(s && s.target).trim().slice(0, 80), value = str(s && s.value).slice(0, 400);   // ok:cut field caps of an AI answer
    if (!d || !target) continue;
    if (d === "click" && h20IsFinal(target)){ P.final = target; break; }   // PT stops one step before a final button
    if (d !== "click" && (h20SecretField(target) || h20SecretVal(value))){ if (!P.yours.includes(target)) P.yours.push(target); continue; }
    if (d !== "click" && !H20_TYPE){ if (!P.yours.includes(target)) P.yours.push(target); P.held = true; continue; }
    if (P.held) continue;   // typing is off: after the first field the rest is the owner's
    P.steps.push({do: d, target, value: d === "click" ? "" : value});
  }
  if (P.held) P.yours = P.yours.slice(0, H20_MAX.steps);
  if (P.final && !P.held && !h20IsFinal(P.final) && P.steps.length < H20_MAX.steps){ P.steps.push({do: "click", target: P.final, value: ""}); P.final = ""; }   // a "final" that is not final is an ordinary step
  return P;
}
async function h20MakePlan(p, words){
  if (!str(words).trim() || H20.busy) return;
  const ws0 = WS.id;
  const out = await runAI("hands-plan", t("h20.busy.plan"), h20PlanPrompt(p, words), {pid: p.id, step: "build", validate: o => o && typeof o.url === "string" && Array.isArray(o.steps)});   // ok:undo the plan changes nothing in the project (it lives on this page until Run or Cancel)
  const q = pickLive(p, ws0); if (!out || !q) return;
  H20.plan = h20Vet(q, out, words); H20.live = null; m20Metric(q, "hands");
  render(); setTimeout(() => { const e = document.querySelector(".h20-contract"); if (e) e.scrollIntoView({block: "nearest"}); }, 30);   // ok:move the plan the person asked for, shown where it appears
}

/* ---------- 2. running the steps (only after the contract was shown and the person said Run) ---------- */
function h20LogAdd(p, x){ p.hands20log = arr(p.hands20log); p.hands20log.unshift(Object.assign({id: uid("hl"), at: now()}, x)); p.hands20log = p.hands20log.slice(0, H20_MAX.log); }
async function h20Run(p){
  const P = H20.plan; if (!P || P.pid !== p.id || H20.busy || !P.siteOk) return;
  H20.busy = true; H20.cleared.clear();
  const L = H20.live = {pid: p.id, steps: [{do: "open", target: P.host, st: "run"}].concat(P.steps.map(s => Object.assign({st: "wait"}, s))), end: "", final: P.final, url: P.url, why: ""};
  render();
  const set = (i, st, why = "") => { L.steps[i].st = st; if (why) L.steps[i].why = why; render(); };
  try{
    await h20Open(p, P.url); await handsRead(null); set(0, "ok");
    for (let i = 1; i < L.steps.length; i++){
      const s = L.steps[i]; set(i, "run");
      const el = await h20Find(p, s.target, s.do);
      if (!el){ set(i, "stop", t("h20.why.nofind", {x: s.target})); L.end = "stopped"; break; }
      if (s.do === "click"){
        if (!h20Clear("c", el.ref, el.line)){ set(i, "yours"); L.final = h20Label(el.line) || s.target; L.end = "final"; L.steps.length = i + 1; break; }   // the page shows a final button where the plan had an ordinary one
        await h20Call(p, "computer", Object.assign({action: "left_click", ref: el.ref, action_summary: t("h20.sum.click", {x: s.target})}, handsTab()));
        await h20Where(p);
        if (!h20WriteOk(p, H20.url)){ set(i, "stop", t("h20.why.left", {x: h20Host(H20.url) || "?"})); L.end = "stopped"; break; }
      } else {
        if (!h20Clear("t", el.ref, el.line)){ set(i, "yours", t("h20.why.secret")); L.end = "stopped"; break; }
        await h20Call(p, "form_input", Object.assign({ref: el.ref, value: s.value, action_summary: t("h20.sum.type", {x: s.target})}, handsTab()));
      }
      set(i, "ok");
    }
    if (!L.end) L.end = L.final ? "final" : "done";
    if (L.end === "final"){ const f = await h20Find(p, L.final, "click"); if (f){ await h20Call(p, "computer", Object.assign({action: "scroll_to", ref: f.ref}, handsTab())); try{ await h20Call(p, "computer", Object.assign({action: "hover", ref: f.ref}, handsTab())); }catch(e){ if (e && e.code === "hands_secret") throw e; } } }   // ok:catch a hover the page refuses changes nothing
  }catch(e){
    const i = L.steps.findIndex(x => x.st === "run"); if (i >= 0) set(i, "stop", handsErr(e));
    L.end = "stopped"; L.why = handsErr(e);
    if (!e || !e.code) onAppError(str(e && e.message), "hands20:run");
  }finally{
    H20.cleared.clear(); H20.busy = false;
    const q = liveP(p);
    if (q){ h20LogAdd(q, {what: P.what || P.words.slice(0, 120), host: P.host, n: L.steps.filter(x => x.st === "ok").length, end: L.end, final: L.end === "final" ? L.final : ""}); touch(q); }   // ok:cut the log keeps a short line
    render();
  }
}
/** Take me there (the person's final click): open the page and point at the button */
async function h20Go(p, url, label){
  if (H20.busy || !h20SiteOk(p, url)) return;
  H20.busy = true; render();
  try{ await h20Open(p, url); await handsRead(null); const f = await h20Find(p, label, "click");
    if (f){ await h20Call(p, "computer", Object.assign({action: "scroll_to", ref: f.ref}, handsTab())); try{ await h20Call(p, "computer", Object.assign({action: "hover", ref: f.ref}, handsTab())); }catch(e){ if (e && e.code === "hands_secret") throw e; } }   // ok:catch a hover the page refuses changes nothing
    toast(t(f ? "hands.go.ok" : "hands.go.open", {q: label}), f ? "" : "err"); }
  catch(e){ toast(handsErr(e), "err"); }
  finally{ H20.busy = false; render(); }
}

/* ---------- 3. what the owner sees: the project's hands page ---------- */
function h20Open20(p){ if (!p) return; pushNav(); UI.hands20View = p.id; UI.factsView = null; UI.rowsView = null; UI.home = false; UI.finish = null; render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; }
function h20StepLine(s){
  const k = s.do === "open" ? t("h20.do.open", {x: s.target}) : s.do === "click" ? t("h20.do.click", {x: s.target}) : s.do === "choose" ? t("h20.do.choose", {x: s.target, v: s.value}) : t("h20.do.type", {x: s.target, v: s.value});
  return k;
}
function h20ContractHTML(p){
  const P = H20.plan; if (!P || P.pid !== p.id) return "";
  const L = H20.live && H20.live.pid === p.id ? H20.live : null;
  const ST = {wait: "·", run: "…", ok: "✓", stop: "✗", yours: "✋"};
  const rows = (L ? L.steps : [{do: "open", target: P.host || P.url}].concat(P.steps)).map((s, i) => `<li class="h20-step st-${esc(s.st || "plan")}"><span aria-hidden="true">${ST[s.st] || (i + 1) + "."}</span> ${esc(h20StepLine(s))}${s.why ? ` <span class="small muted">· ${esc(s.why)}</span>` : ""}</li>`).join("");
  const yours = P.yours.map(f => `<li class="h20-step yours"><span aria-hidden="true">✋</span> ${esc(t("h20.yours.type", {x: f}))}</li>`).join("");
  const fin = (L ? L.final : P.final) ? `<li class="h20-step yours final"><span aria-hidden="true">✋</span> <b>${esc(t("h20.yours.click", {x: L ? L.final : P.final}))}</b></li>` : "";
  const block = !P.host ? t("h20.block.url") : !P.siteOk ? t("h20.block.site", {x: P.host}) : "";
  const end = L && !H20.busy ? `<div class="h20-end small ${L.end === "stopped" ? "warn-t" : ""}" role="status">${esc(t("h20.end." + (L.end || "done"), {x: L.final}))}${L.why ? " · " + esc(L.why) : ""}
      ${L.end === "final" ? `<div class="row"><button class="btn sm primary" data-a="h20-go" data-url="${esc(H20.url || P.url)}" data-q="${esc(L.final)}">${ic("arrow")}${esc(t("h20.go"))}</button><span class="small muted">${esc(t("h20.go.sub"))}</span></div>` : ""}</div>` : "";
  return `<section class="panel h20-contract" data-anchor="h20-contract" aria-labelledby="h20c-h"><h3 id="h20c-h">${ic("shield")} ${esc(t("h20.c.t"))}</h3>
    <dl class="h20-kv"><dt>${esc(t("h20.c.what"))}</dt><dd>${esc(P.what || P.words)}</dd><dt>${esc(t("h20.c.where"))}</dt><dd>${esc(P.host || "—")} <span class="small muted">${esc(P.url)}</span></dd>
    <dt>${esc(t("h20.c.why"))}</dt><dd>${esc(P.why || "—")}</dd><dt>${esc(t("h20.c.undo"))}</dt><dd>${esc(t("h20.undo." + P.undo))}${P.undoHow ? " · " + esc(P.undoHow) : ""}</dd></dl>
    <h4>${esc(t("h20.c.steps"))}</h4><ol class="h20-steps">${rows}${yours}${fin}</ol>
    <p class="small muted">${esc(t("h20.c.never"))}</p>${P.held ? `<p class="small muted h20-notype">${esc(t("h20.notype"))}</p>` : ""}
    ${block ? `<p class="small warn-t">${esc(block)}</p>${P.host && !P.siteOk && h20Site(P.host) ? `<div class="row"><button class="btn sm" data-a="h20-site-plan">${ic("plus")}${esc(t("h20.site.addthis", {x: h20Site(P.host)}))}</button></div>` : ""}` : ""}
    ${L ? end : `<div class="row"><button class="btn sm primary" data-a="h20-run" ${block || H20.busy ? "disabled" : ""}>${ic("play")}${esc(t("h20.run"))}</button><button class="btn sm ghost" data-a="h20-cancel">${esc(t("btn.cancel"))}</button></div>`}
    ${L && !H20.busy ? `<div class="row"><button class="btn xs ghost" data-a="h20-cancel">${esc(t("h20.close"))}</button></div>` : ""}</section>`;
}
function h20LogHTML(p){
  const L = arr(p.hands20log).slice(0, 10); if (!L.length) return "";
  return `<details class="h20-log"><summary class="small">${esc(t("h20.log.t", {n: arr(p.hands20log).length}))}</summary><ul class="small">${L.map(x => `<li>${esc(fmtDate(x.at))} · ${esc(x.host)} · ${esc(x.what)} · ${esc(t("h20.log.end." + oneOf(x.end, ["done", "final", "stopped"], "stopped"), {n: x.n, x: x.final}))}</li>`).join("")}</ul></details>`;
}
function h20BodyHTML(p){
  const S = h20Read(p).sites;
  const sites = `<section class="panel h20-sites" data-anchor="h20-sites"><h3>${esc(t("h20.sites.t"))}</h3><p class="small muted">${esc(t("h20.sites.sub"))}</p>
    <div class="row h20-chips">${S.length ? S.map(s => `<span class="chip h20-site">${esc(s)}<button class="iconbtn xs" data-a="h20-site-del" data-v="${esc(s)}" aria-label="${esc(t("h20.site.del", {x: s}))}" title="${esc(t("h20.site.del", {x: s}))}">${ic("x")}</button></span>`).join("") : `<span class="small muted">${esc(t("h20.sites.none"))}</span>`}<span class="chip muted">github.com · ${esc(t("h20.sites.gh"))}</span></div>
    <form class="row" data-form="h20-site-add"><label class="fld" style="flex:1 1 14em"><span>${esc(t("h20.site.add"))}</span><input type="text" id="h20-site-in" placeholder="anydesk.com" autocomplete="off"></label><button class="btn sm" type="submit">${ic("plus")}${esc(t("btn.add"))}</button></form></section>`;
  const ask = `<section class="panel h20-ask" data-anchor="h20-ask"><h3>${esc(t("h20.ask.t"))}</h3><p class="small muted">${esc(t("h20.ask.sub"))}</p>
    <form class="stack" data-form="h20-plan"><textarea id="h20-in" rows="2" placeholder="${esc(t("h20.ask.ph"))}">${esc(UI.qDraft["h20-plan"] || "")}</textarea>
    <div class="row"><button class="btn sm primary ai" type="submit" data-cost="${esc(t(COST.M))}" ${H20.busy || AI.running.size ? "disabled" : ""}>${ic("spark")}${esc(t("h20.ask.go"))}</button><span class="small muted">${esc(t("h20.ask.cost"))}</span></div></form>${busyHTML("hands-plan")}</section>`;
  return `<section class="panel h20-intro"><p class="small">${esc(t("h20.sub"))}</p><p class="small muted">${esc(handsOk() ? t("hands.where") : t("hands.e.owner"))}</p></section>${sites}${ask}${h20ContractHTML(p)}${h20LogHTML(p)}`;
}
function h20ViewHTML(p){
  return `<div class="pg h20-view" data-page="hands20" data-anchor="page-hands20">${pgBar(p)}<header class="pg-head"><h2>${ic("bolt")} ${esc(t("h20.title"))}</h2></header>${h20BodyHTML(p)}</div>`;
}
{ const orig = modeBody; modeBody = function(p){ return p && UI.hands20View === p.id && !UI.factsView ? h20ViewHTML(p) : orig(p); }; }
{ const orig = pgOpen; pgOpen = function(){ UI.hands20View = null; return orig.apply(this, arguments); }; }
{ const orig = goRef; goRef = function(){ UI.hands20View = null; return orig.apply(this, arguments); }; }
{ const orig = popNav; popNav = function(){ UI.hands20View = null; return orig.apply(this, arguments); }; }
{ const orig = factsOpen; factsOpen = function(){ UI.hands20View = null; return orig.apply(this, arguments); }; }
{ const orig = openProject; openProject = function(){ UI.hands20View = null; H20.plan = null; H20.live = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["home"]; ACTIONS["home"] = function(){ UI.hands20View = null; return orig.apply(this, arguments); }; }
MORE_ITEMS.splice(2, 0, {a: "h20-open", icon: "bolt", l: "h20.title"});
/* the route card: what PT's hands do in this route and which sites the project allows */
{ const orig = m20CardHTML; m20CardHTML = function(p, id){
    const h = orig.apply(this, arguments); const r = p && m20Route(p, id); if (!r || !str(r.actors && r.actors.hands).trim()) return h;
    try{ const S = h20Read(p).sites;
      const line = `<p class="small h20-route" data-h20-route="${esc(r.id)}">${ic("bolt")} ${esc(S.length ? t("h20.route.sites", {x: S.join(", ")}) : t("h20.route.nosites"))} <button class="btn xs ghost" data-a="h20-open">${esc(t("h20.route.manage"))}</button></p>`;
      return h.replace(/<\/article>\s*$/, line + "</article>"); }
    catch(e){ onAppError(e && e.message, "hands20:card"); return h; } }; }

Object.assign(ACTIONS, {
  "h20-open": () => h20Open20(curP()),
  "h20-site-del": (el) => { const p = curP(); if (!p) return; const H = h20Of(p), s = str(el.dataset.v); H.sites = H.sites.filter(x => x !== s); rcpt20(p, t("h20.rc.del", {x: s}), t("h20.title")); touch(p); render(); },
  "h20-site-plan": () => { const p = curP(), P = H20.plan; if (!p || !P || P.pid !== p.id) return; const s = h20Site(P.host); if (!s) return; const H = h20Of(p); if (!H.sites.includes(s)) H.sites.push(s); P.siteOk = h20WriteOk(p, P.url); rcpt20(p, t("h20.rc.add", {x: s}), t("h20.title")); touch(p); render(); },
  "h20-run": () => { const p = curP(); if (p) h20Run(p); },
  "h20-cancel": () => { H20.plan = null; H20.live = null; render(); },
  "h20-go": (el) => { const p = curP(); if (p) h20Go(p, str(el.dataset.url), str(el.dataset.q)); }
});
Object.assign(FORMS, {
  "h20-site-add": () => { const p = curP(); if (!p) return; const el = $("#h20-site-in"), s = h20Site(el && el.value); if (!s){ toast(t("h20.site.bad"), "err"); return; }
    const H = h20Of(p); if (H.sites.includes(s)){ toast(t("h20.site.have", {x: s}), ""); return; } if (H.sites.length >= H20_MAX.sites){ toast(t("h20.site.max", {n: H20_MAX.sites}), "err"); return; }
    H.sites.push(s); rcpt20(p, t("h20.rc.add", {x: s}), t("h20.title")); touch(p); render(); focusSoon("h20-site-in"); },
  "h20-plan": () => { const p = curP(); if (!p) return; const v = str(($("#h20-in") || {}).value).trim(); if (!v){ toast(t("h20.ask.need"), "err"); return; } UI.qDraft["h20-plan"] = v; h20MakePlan(p, v); }
});
["h20-open", "h20-cancel", "h20-go"].forEach(a => ACT_NO.add(a));

/* ---------- 9. the morning check ---------- */
const MC20 = {busy: false};
function mc20Day(d = new Date()){ return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function mc20Read(){ const M = WS && WS.settings && WS.settings.morning20; return M && typeof M === "object" ? M : null; }
function mc20Due(){ return handsOk() && !!WS && !!WS._set && !window.__ptNoMorning && str((mc20Read() || {}).day) !== mc20Day(); }
const MC20_URL = /https:\/\/[^\s"'<>()]+/;
/** what came in since the last check for a project with a chosen route: facts, failed tests, serious findings (the tripwires' inputs) */
function mc20Since(p, at){
  if (!at || !m20Chosen(p)) return [];
  const T = Date.parse(at), after = x => Date.parse(str(x)) > T, out = [];
  for (const e of factsActive(p)) if (after(e.at)) out.push({kind: FACT_RULES.includes(e.kind) ? "rule" : "fact", text: factText(e), ref: "fact:" + e.id});
  for (const r of arr(p.runs).filter(r => after(r.at))) for (const x of arr(r.results).filter(x => x && x.pass === false).slice(0, 3)){ const tt = arr(p.tests).find(y => y.id === x.testId); if (tt) out.push({kind: "test", text: t("m20.al.test", {x: str(tt.title)}), ref: "test:" + x.testId + ":" + str(r.id || r.at)}); }
  for (const f of arr(p.findings).filter(f => after(f.at) && ["critical", "high"].includes(f.severity))) out.push({kind: "finding", text: str(f.issue), ref: "finding:" + f.id});
  return out.slice(0, 8);
}
async function mc20Run(){
  if (MC20.busy || !handsOk() || !WS || !WS._set) return;
  MC20.busy = true; const ws0 = WS.id; render();
  const prev = mc20Read() || {}, day = mc20Day(), R = {day, at: now(), lines: [], prs: arr(prev.prs), kp: KP_VERSION, watch: Object.assign({}, prev.watch || {}), seen: false, calls: 0};
  const line = (k, text, st = "ok", extra = {}) => R.lines.push(Object.assign({k, st, text: str(text).slice(0, 300)}, extra));   // ok:cut a summary line
  try{
    /* 1. GitHub through the app's browser (1.10 checks; their results also show in PT health) */
    let app = true;
    for (const k of ["prs", "keys", "rel"]){
      if (!app) break;
      try{ const x = await HANDS_CHECKS[k](); HANDS.res[k] = Object.assign({at: now(), ok: true}, x);
        if (k === "prs"){ const ns = x.list.map(y => y.n), nu = x.list.filter(y => !arr(prev.prs).includes(y.n));
          line("prs", x.list.length ? t("mc20.prs", {n: x.list.length}) + (prev.day && nu.length ? " · " + t("mc20.prs.new", {x: nu.map(y => "#" + y.n + " " + y.title).join(", ")}) : "") : t("hands.prs.none"), prev.day && nu.length ? "new" : "ok"); R.prs = ns; }
        if (k === "keys"){ const soon = x.list.filter(y => y.kind === "past" || (y.kind === "date" && handsDays(y.at) <= HANDS_SOON_DAYS));
          line("keys", soon.length ? t("mc20.keys.soon", {x: soon.map(y => y.name).join(", ")}) : t("mc20.keys.ok", {n: x.list.length}), soon.length ? "warn" : "ok"); }
        if (k === "rel") line("rel", t(x.found ? "hands.rel.ok" : "hands.rel.no", {v: x.v}), x.found ? "ok" : "warn");
      }catch(e){
        const c = str(e && e.code); HANDS.res[k] = {at: now(), ok: false, err: handsErr(e), code: c};
        if (["server_not_connected", "capability_disabled", "not_granted", "capability_removed", "server_not_found", "not_in_manifest", "approval_required", "cancelled", "consent_required", "hands_owner"].includes(c)){ app = false; line("app", t("mc20.app", {x: handsErr(e)}), "skip"); }
        else line(k, handsErr(e), "warn");
        if (!e || !e.code) onAppError(str(e && e.message), "morning:" + k);
      }
    }
    /* 2. per project: the tripwires (what came in since the last check) and the "Not possible yet" watch lines */
    const fetchOk = typeof helper20Ready === "function" && helper20Ready("fetch");
    for (const p of WS.projects.filter(x => x.status !== "archived")){
      if (WS.id !== ws0) break;
      const M = m20Read(p); if (!M.routes.length && !M.notyet.length) continue;
      const items = mc20Since(p, prev.at), seen = [];
      if (prev.kp && prev.kp !== KP_VERSION) for (const n of M.notyet.filter(n => ["platform", "model", "vendor"].includes(n.blocker)).slice(0, 4)) items.push({kind: "watch", text: t("mc20.kp.item", {x: n.name, w: n.watch || n.change}), ref: "morning:kp:" + KP_VERSION + ":" + n.id});
      let changed = 0, watched = 0;
      if (fetchOk) for (const n of M.notyet.slice(0, 6)){
        const u = (MC20_URL.exec(str(n.watch)) || MC20_URL.exec(str(n.evidence)) || [])[0]; if (!u) continue;
        watched++;
        try{ const txt = await helper20Call("fetch", "fetch", {url: u, max_length: 20000}); R.calls++;
          const k = p.id + ":" + n.id, hsh = hashStr(str(txt).replace(/\s+/g, " "));
          if (R.watch[k] && R.watch[k] !== hsh){ changed++; items.push({kind: "watch", text: t("mc20.watch.item", {x: n.name, u}), ref: "morning:" + day + ":" + n.id}); m20Event(p, "watch", t("mc20.watch.ev", {x: n.name})); touch(p); seen.push(n.name); }
          R.watch[k] = hsh; }
        catch(e){ line("watch", t("mc20.watch.fail", {x: n.name, e: helper20Err(e)}), "warn"); }
      }
      for (const it of items) m20WatchSoon(p, it);
      const ny = M.notyet.length;
      line("proj", t("mc20.proj", {x: p.name, n: items.length}) + (ny ? " · " + (fetchOk ? t("mc20.watch.n", {n: watched, c: changed}) : t("mc20.watch.nofetch", {n: ny})) : "") + (seen.length ? " · " + t("mc20.watch.changed", {x: seen.join(", ")}) : ""), items.length || changed ? "new" : "ok", {pid: p.id});
    }
    if (typeof mc20HelperLines === "function") await mc20HelperLines(line);
    if (prev.kp && prev.kp !== KP_VERSION) line("kp", t("mc20.kp", {a: prev.kp, b: KP_VERSION}), "new");
  }catch(e){ onAppError(e && e.message, "morning"); line("err", t("mc20.err"), "warn"); }
  finally{
    MC20.busy = false;
    if (WS.id === ws0){ WS.settings.morning20 = R; saveWs(); }
    render();
  }
}
function mc20CardHTML(){
  if (!handsOk()) return "";
  if (MC20.busy) return `<section class="panel mc20" data-mc20="busy" aria-live="polite"><h3>${ic("clock")} ${esc(t("mc20.t"))}</h3><p class="small">${esc(t("mc20.busy"))}</p></section>`;
  const M = mc20Read(); if (!M || M.seen || M.day !== mc20Day()) return "";
  const IC20 = {ok: "✓", new: "●", warn: "!", skip: "–"};
  return `<section class="panel mc20" data-mc20="card" aria-labelledby="mc20-h"><h3 id="mc20-h">${ic("clock")} ${esc(t("mc20.t"))} <span class="small muted">· ${esc(fmtDate(M.at))}</span></h3>
    <ul class="mc20-lines">${arr(M.lines).map(l => `<li class="mc20-l st-${esc(l.st)}" data-k="${esc(l.k)}"><span aria-hidden="true">${IC20[l.st] || "·"}</span> ${esc(l.text)}${l.pid && l.st === "new" ? ` <button class="btn xs ghost" data-a="open-project" data-id="${esc(l.pid)}">${esc(t("mc20.open"))}</button>` : ""}</li>`).join("")}</ul>
    <p class="small muted">${esc(t("mc20.sub"))}</p>
    <div class="row"><button class="btn sm primary" data-a="mc20-seen">${ic("check")}${esc(t("mc20.seen"))}</button><button class="btn sm ghost" data-a="mc20-run">${esc(t("mc20.again"))}</button><button class="btn sm ghost" data-a="setup20-guide" data-g="cloud">${esc(t("mc20.cloud"))}</button></div></section>`;
}
{ const orig = viewCockpit; viewCockpit = function(){ const h = orig.apply(this, arguments); let c = ""; try{ c = mc20CardHTML(); }catch(e){ onAppError(e && e.message, "morning:card"); } return c ? c + h : h; }; }
{ const orig = openWorkspace; openWorkspace = async function(id){
    MC20.busy = false;
    const r = await orig.apply(this, arguments);
    try{ if (UI.wsReady && !UI.fatal && WS.id === id && mc20Due()) setTimeout(() => { if (mc20Due()) mc20Run(); }, 1200); }catch(e){ onAppError(e && e.message, "morning:open"); }
    return r; }; }
Object.assign(ACTIONS, {
  "mc20-seen": () => { const M = mc20Read(); if (!M) return; M.seen = true; saveWs(); render(); },
  "mc20-run": () => mc20Run()
});
["mc20-seen", "mc20-run"].forEach(a => ACT_NO.add(a));

const V200D_CSS = `
.h20-chips{gap:6px;align-items:center}
.h20-site{display:inline-flex;align-items:center;gap:4px}
.h20-kv{display:grid;grid-template-columns:minmax(6em,max-content) 1fr;gap:4px 12px;margin:0}
.h20-kv dt{color:var(--muted);font-size:13px}
.h20-kv dd{margin:0;min-width:0;overflow-wrap:break-word}
.h20-steps{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:3px}
.h20-step{display:flex;gap:6px;align-items:baseline;min-width:0;overflow-wrap:break-word}
.h20-step.yours{font-weight:600}
.h20-step.st-stop{color:var(--warn,inherit)}
.h20-end{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:8px}
.mc20-lines{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}
.mc20-l{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;min-width:0;overflow-wrap:break-word}
.mc20-l.st-warn,.mc20-l.st-new{font-weight:600}
@media (max-width:600px){.h20-kv{grid-template-columns:1fr}.h20-kv dt{margin-top:4px}}
`;
function v200dCss(){ try{ if (document.getElementById("v200d-css")) return; const s = document.createElement("style"); s.id = "v200d-css"; s.textContent = V200D_CSS; document.head.appendChild(s); }catch(e){ onAppError(e && e.message, "v200d:css"); } }
v200dCss();
