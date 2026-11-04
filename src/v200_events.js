/* ===================== 2.0 Part A: one Next and "✓ done", error cards kept, plain words that act =====================
   The owner (2 Nov 2026): "Why didn't it change so I see it's done? … How do I know what's next?", "the text field does nothing",
   "When I finished the last example it brought me to one I already answered … what is the next button?" and (3 Nov) "An error popped
   up bottom right – what was the issue, how do we fix it?".
   1. Receipts: after an answer or a text entry the project shows "✓ Saved: … → where it went" (rcpt20) until the next one or until it
      is closed; one Next bar under the page bar always names exactly one next step (the spine's next, the same as the cover's).
   2. The examples loop never lands on an example you judged while another one waits; when all are judged it says so and names the next.
   3. Errors: onAppError and a failed AI step are kept (technical text only, no project text: quoted text is replaced by "…") in the
      workspace's own storage (WS.settings.events, newest first, at most 20), shown as error cards in an Events list (what happened,
      what PT did, what you can do, the technical detail folded) until you dismiss them; "Report to Improve PT" fills the message with
      the technical detail. Error messages shown this session (toasts) get a "What happened?" link and stay in the list for this session.
   4. "Fix it together with me" became "PT drafts a fix, you pick what to keep": the draft starts at once. */
const EV20_MAX = 20;
const EV20 = {session: [], pending: [], busy: false, touches: 0};

/* ---------- 1. receipts and the one Next ---------- */
function rcpt20(p, what, where){ if (!p || !str(what).trim()) return; UI.rcpt20 = {pid: p.id, what: str(what).replace(/\s+/g, " ").trim(), where: str(where), at: Date.now()}; }
function nx20HTML(p){
  const R = UI.rcpt20 && UI.rcpt20.pid === p.id ? UI.rcpt20 : null, K = UI.known20 && UI.known20.pid === p.id && arr(UI.known20.list).length ? UI.known20 : null, B = UI.blocked20 && UI.blocked20.pid === p.id ? UI.blocked20 : null;
  const rc = R ? `<div class="rc20" role="status" aria-live="polite"><span class="rc20-ok">${ic("check")}${esc(t("rc.saved"))}</span><span class="rc20-what">${clampHTML(R.what, "rc20", {lines: 2})}</span><span class="rc20-where">→ ${esc(R.where)}</span><button class="iconbtn sm" data-a="rc20-close" title="${esc(t("btn.close"))}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>` : "";
  const kn = K ? `<div class="rc20 known20" role="status"><span class="rc20-ok">${ic("check")}${esc(t("ask.known"))}</span><span class="rc20-what">${K.list.map(k => `${esc(k.q)} → <b>${esc(k.a)}</b> <button class="btn xs ghost" data-a="ask-change" data-ref="${esc(k.ref)}">${esc(t("ask.change"))}</button>`).join(" · ")}</span><button class="iconbtn sm" data-a="known-close" title="${esc(t("btn.close"))}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>` : "";
  const bl = B ? `<div class="rc20 blocked20-n" role="status"><span class="rc20-ok">${ic("shield")}${esc([B.n ? t("facts.blocked.n", {n: B.n}) : "", B.k ? t("facts.blocked.k", {n: B.k}) : ""].filter(Boolean).join(" · "))}</span><span class="rc20-what">“${esc(B.rule)}”</span><button class="btn xs ghost" data-a="facts-open">${esc(t("facts.title"))}</button><button class="iconbtn sm" data-a="blocked-close" title="${esc(t("btn.close"))}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>` : "";
  let nx = ""; try{ nx = pgNextBtn(p); }catch(e){ onAppError(e && e.message, "next:button"); }
  return `<div class="nx20" data-anchor="next">${rc}${kn}${bl}<div class="row nx20-next"><span class="small muted">${esc(t("sp.next.label"))}</span>${nx}</div></div>`;
}
/* inside the page bar's nav, so wherever the bar is left out (Pick inside a page) the Next goes with it: one Next per screen */
{ const orig = pgBar; pgBar = function(p){ const h = orig(p); let n = ""; try{ n = p ? nx20HTML(p) : ""; }catch(e){ onAppError(e && e.message, "next:bar"); } return /<\/nav>\s*$/.test(h) ? h.replace(/<\/nav>\s*$/, n + "</nav>") : h + n; }; }
{ const orig = openProject; openProject = function(){ UI.rcpt20 = null; return orig.apply(this, arguments); }; }
/* where an answer or a text goes */
{ const orig = answerQ; answerQ = function(p, qid){ const id = orig.apply(this, arguments); if (id){ const a = arr(p.qa).find(x => x.id === id); if (a) rcpt20(p, a.q + " → " + a.answer, t("rc.w.qa")); } return id; }; }
{ const orig = pickAnswer; pickAnswer = function(p, cid, o = {}){ const e = orig.apply(this, arguments); if (e && !o.assumed && str(e.answer).trim()) rcpt20(p, str(e.q) + " → " + str(e.answer), t("rc.w.pick")); return e; }; }
{ const orig = coneAnswer; coneAnswer = function(p, d, v){ const r = orig.apply(this, arguments); try{ const a = coneAns(coneRead(p) || {})[d]; if (a && a.v === v) rcpt20(p, t("cone.qs." + d) + " → " + t("cone.o." + d + "." + v), t("rc.w.cone")); }catch(e){ onAppError(e && e.message, "rcpt:cone"); } return r; }; }
{ const orig = addNote; addNote = function(o = {}){ const n = orig.apply(this, arguments); const p = o && o.projectId && UI.view === "project" ? curP() : null; if (p && p.id === o.projectId && str(o.text).trim()) rcpt20(p, o.text, t("rc.w.note")); return n; }; }
{ const orig = touch; touch = function(){ EV20.touches++; return orig.apply(this, arguments); }; }
/* the text forms of a project: what you wrote is shown with where it went (only when the form really changed something) */
const RC20_FORMS = {"ns": "rc.w.ns", "decision": "rc.w.dec", "openq": "rc.w.openq", "pk-notice": "rc.w.notice", "pk-dump": "rc.w.dump", "mock-note": "rc.w.mock", "cone-say": "rc.w.cone", "pk8-qs": "rc.w.start", "iv19-area": "rc.w.qa", "sn-add": "rc.w.und"};
for (const [k, where] of Object.entries(RC20_FORMS)){
  const orig = FORMS[k]; if (!orig) continue;
  FORMS[k] = function(f){
    const p = curP(), el = f && f.querySelector && f.querySelector("textarea, input[type=text]"), txt = str(el && el.value).trim(), n0 = EV20.touches, r0 = UI.rcpt20;
    const out = orig.apply(this, arguments);
    const done = () => { if (p && txt && EV20.touches !== n0 && UI.rcpt20 === r0){ rcpt20(p, txt, t(where)); render(); } };
    if (out && typeof out.then === "function") out.then(done, () => {}); else done();   // ok:catch the form shows its own failure
    return out;
  };
}
/* the examples loop: never back to one you judged while another waits; all judged → it says so and names the next */
{ const orig = ACTIONS["ex-grade"]; ACTIONS["ex-grade"] = function(el){
    const p = curP(), r = orig.apply(this, arguments); if (!p) return r;
    const e = exById(p, el.dataset.id), L = loopRead(p);
    if (!e || !e.verdict || (L.phase !== "react" && L.phase !== "check")) return r;
    const {list, i} = loopCur(p), cur = list[i];
    /* only in the teach round: in the check round the reveal (what PT's rules expected) stays on screen */
    if (L.phase === "react" && cur && cur.verdict && !(e.verdict === "bad" && cur.id === e.id && !str(e.why).trim())){ const j = list.findIndex(x => !x.verdict); if (j >= 0 && j !== i){ loopOf(p).i = j; render(); } }
    const left = list.filter(x => !x.verdict).length;
    rcpt20(p, exTitle(e) + " → " + t(e.verdict === "good" ? "ex.v.good" : e.verdict === "bad" ? "ex.v.bad" : "ex.unsure"), left ? t("rc.w.ex.left", {n: left}) : t(L.phase === "react" ? "rc.w.ex.done" : "rc.w.ex.checked"));
    render(); return r; }; }
/* PT drafts the fix at once; you pick what to keep (the box shows the draft field by field with a tick each) */
{ const orig = ACTIONS["item-tool"]; ACTIONS["item-tool"] = function(el){ const r = orig.apply(this, arguments);
    if (el && el.dataset && el.dataset.k === "fix" && el.dataset.text && ACTIONS["item-send"]) setTimeout(() => { if (document.getElementById("it-in")) ACTIONS["item-send"]({dataset: {ref: el.dataset.ref}}); }, 30);
    return r; }; }
Object.assign(ACTIONS, { "rc20-close": () => { UI.rcpt20 = null; render(); } });
ACT_NO.add("rc20-close");

/* ---------- 2. errors: kept, explained, until dismissed ---------- */
/** technical text only: quoted text (where project words could sit) becomes "…", one line, at most 240 characters */
function ev20Clean(s){ return str(s).replace(/"[^"\n]{12,}"|'[^'\n]{12,}'|“[^”\n]{12,}”|«[^»\n]{12,}»|「[^」\n]{6,}」/g, "\"…\"").replace(/\s+/g, " ").trim().slice(0, 240); }
function ev20List(){ return arr(WS && WS.settings && WS.settings.events); }
function ev20Store(){
  if (EV20.busy || !WS || !WS.settings || !WS._set) return false;
  EV20.busy = true;
  try{ const L = ev20List().slice(); for (const x of EV20.pending.splice(0)){ const d = L.find(y => y.kind === x.kind && y.code === x.code && y.msg === x.msg && y.src === x.src); if (d){ d.n = num(d.n, 1) + 1; d.at = x.at; L.splice(L.indexOf(d), 1); L.unshift(d); } else L.unshift(x); }
    const fresh = L.length !== ev20List().length || L[0] !== ev20List()[0];
    WS.settings.events = L.slice(0, EV20_MAX); saveWs();
    if (fresh && !EV20.renderT) EV20.renderT = setTimeout(() => { EV20.renderT = null; try{ render(); }catch(e){ console.warn("PT events render", e); } }, 0); }   // ok:catch a new card shows on the next screen anyway
  catch(e){ try{ console.warn("PT events", e); }catch(_){ /* ok:catch nothing more to do */ } }
  finally{ EV20.busy = false; }
  return true;
}
function ev20Add(o){
  if (EV20.busy) return null;
  const x = {id: uid("ev"), at: now(), kind: oneOf(o.kind, ["error", "ai"], "error"), code: ev20Clean(o.code).slice(0, 60), msg: ev20Clean(o.msg), src: ev20Clean(o.src).slice(0, 120), step: ev20Clean(o.step).slice(0, 40), v: PT_VERSION, n: 1};
  EV20.pending.push(x); if (EV20.pending.length > EV20_MAX) EV20.pending.shift();
  ev20Store();
  return x;
}
/** core.js runAI: a step that ended without an answer */
function ev20AI(code, step){ if (str(code) === "cancelled") return; ev20Add({kind: "ai", code: str(code) || "upstream_error", msg: "", src: "runAI", step}); }
{ const orig = onAppError; onAppError = function(msg, src){ const last = ERRS[ERRS.length - 1], r = orig.apply(this, arguments); if (ERRS[ERRS.length - 1] !== last) ev20Add({kind: "error", msg, src}); return r; }; }
{ const orig = openWorkspace; openWorkspace = function(){ const r = orig.apply(this, arguments); const go = () => { if (EV20.pending.length && WS._set) ev20Store(); }; if (r && typeof r.then === "function") r.then(go, () => {}); else setTimeout(go, 0); return r; }; }   // ok:catch a workspace that does not open shows its own message
/* a message shown at the bottom right gets "What happened?" and stays in the list for this session (its text may hold project words, so it is never stored) */
{ const orig = toast; toast = function(msg, kind = ""){
    const r = orig.apply(this, arguments);
    if (kind === "err"){
      EV20.session.unshift({id: uid("es"), at: now(), msg: str(msg)}); EV20.session = EV20.session.slice(0, EV20_MAX);
      try{ const host = document.getElementById("toasts"), el = host && host.lastElementChild; if (el && !el.dataset.a){ el.dataset.a = "events-open"; el.dataset.why = t("ev20.why"); el.title = t("ev20.why"); el.classList.add("toast-why"); } }   // the whole message opens the list (its text stays as it was)
      catch(e){ console.warn("toast link", e); }   // ok:catch the message itself is shown
    }
    return r; }; }
const EV20_AI = {rate_limited: "busy", overloaded: "busy", upstream_error: "noanswer", server_unavailable: "noanswer", timeout: "noanswer", invalid_json: "unreadable", empty_completion: "unreadable", offline: "offline", unavailable: "unavailable", quota_exceeded: "quota", usage_limit: "quota"};
function ev20Kind(e){ return e.kind === "ai" ? (EV20_AI[e.code] || "ai") : "fault"; }
function ev20Detail(e){ return ["Prompt Translator " + e.v, e.kind === "ai" ? "AI step" + (e.step ? " (" + e.step + ")" : "") + ": " + e.code : "error: " + e.msg, e.src ? "at " + e.src : "", (e.n > 1 ? e.n + "× · last " : "") + e.at].filter(Boolean).join(" · "); }
function ev20Card(e){
  const k = ev20Kind(e);
  return `<article class="ev20 panel" data-ev="${esc(e.id)}" role="group" aria-label="${esc(t("ev20.c." + k))}"><div class="row">${stSlot("bad")}<b style="flex:1 1 14em">${esc(t("ev20.c." + k))}</b><span class="small muted">${esc(fmtDate(e.at))}${e.n > 1 ? " · " + esc(t("ev20.times", {n: e.n})) : ""}</span></div>
    <p class="small"><b>${esc(t("ev20.did"))}</b> ${esc(t(e.kind === "ai" ? "ev20.did.ai" : "ev20.did.fault"))}</p>
    <p class="small"><b>${esc(t("ev20.next"))}</b> ${esc(t("ev20.n." + k))}</p>
    <details class="small"><summary>${esc(t("ev20.tech"))}</summary><code class="ev20-tech">${esc(ev20Detail(e))}</code></details>
    <div class="row"><button class="btn sm" data-a="ev20-report" data-id="${esc(e.id)}">${ic("flag")}${esc(t("ev20.report"))}</button><button class="btn sm ghost" data-a="ev20-dismiss" data-id="${esc(e.id)}">${ic("check")}${esc(t("ev20.dismiss"))}</button></div></article>`;
}
function ev20HTML(){
  const L = ev20List(), S = EV20.session;
  return `<div class="stack ev20-list">${L.length ? L.map(ev20Card).join("") : `<p class="small muted">${esc(t("ev20.none"))}</p>`}
    ${S.length ? `<details class="ev20-session" open><summary class="small">${esc(t("ev20.session", {n: S.length}))}</summary><ul class="small">${S.map(x => `<li><span class="muted">${esc(fmtDate(x.at))}</span> ${esc(x.msg)}</li>`).join("")}</ul></details>` : ""}
    <p class="small muted">${esc(t("ev20.where"))}</p></div>`;
}
MODAL14.events = (m, p, hd) => `${hd(t("ev20.title"))}<p class="sub">${esc(t("ev20.sub"))}</p>${ev20HTML()}`;   // ok:esc hd() builds the escaped heading
/* the Events list is reachable from the status bar (while there are any) and from Settings › PT health */
{ const orig = statusBar; statusBar = function(){ const h = orig(); const n = ev20List().length; if (!n) return h; return h.replace('<span id="savestate"', `<button class="chip tap warn ev20-chip" data-a="events-open">${ic("flag")}${esc(t("ev20.chip", {n}))}</button><span id="savestate"`); }; }
{ const orig = hr18HTML; hr18HTML = function(){ const h = orig.apply(this, arguments); let mine = ""; try{ mine = `<div class="stack ev20-health" data-ev20="1"><h4>${esc(t("ev20.title"))}</h4>${ev20HTML()}</div>`; }catch(e){ onAppError(e && e.message, "events:health"); } return h.replace(/<\/div>\s*$/, m => mine + m); }; }
/* "Report to Improve PT": the message starts with the technical detail */
{ const orig = toolReportModal; toolReportModal = function(m){ const h = orig.apply(this, arguments); return m && m.pre ? h.replace('placeholder="' + esc(t("tr.ph")) + '"></textarea>', 'placeholder="' + esc(t("tr.ph")) + '">' + esc(m.pre) + "</textarea>") : h; }; }
Object.assign(ACTIONS, {
  "events-open": () => { UI.modal = {kind: "events"}; render(); },
  "ev20-dismiss": (el) => { if (!WS.settings) return; WS.settings.events = ev20List().filter(e => e.id !== el.dataset.id); saveWs(); render(); },
  "ev20-report": (el) => { const e = ev20List().find(x => x.id === el.dataset.id); if (!e) return; UI.modal = {kind: "toolreport", where: t("ev20.title"), pre: t("ev20.pre") + "\n" + ev20Detail(e) + "\n\n"}; render(); focusSoon("tr-in"); }
});
["events-open", "ev20-dismiss", "ev20-report"].forEach(a => ACT_NO.add(a));

/* ---------- 3. the look (text first; buttons follow the text, never a fixed share of the row) ---------- */
const V200_CSS = `
.nx20{display:flex;flex-direction:column;gap:6px;margin:6px 0 2px}
.nx20-next{gap:8px;align-items:center}
.rc20{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;padding:7px 10px;border-radius:12px;border:1px solid var(--ok);background:var(--ok-soft,var(--bg-2));font-size:13.5px}
.rc20 .rc20-ok{display:inline-flex;align-items:center;gap:5px;font-weight:600;color:var(--ok)}
.rc20 .rc20-what{flex:1 1 16em;max-width:100%;overflow-wrap:break-word}
.rc20 .rc20-where{color:var(--muted)}
.rc20.known20{border-color:var(--accent)}.rc20.known20 .rc20-ok{color:var(--accent)}
.rc20.blocked20-n{border-color:var(--warn)}.rc20.blocked20-n .rc20-ok{color:var(--warn)}
.fact20 .body{flex:1 1 18em;max-width:100%}
.fact20.off{opacity:.7}
.fact20-text{overflow-wrap:break-word}
.fprop20{display:flex;gap:8px;align-items:flex-start;cursor:pointer}
.fprop20 .body{flex:1 1 18em}
.conf20 blockquote{margin:0;padding:8px 10px;border-left:3px solid var(--warn);background:var(--bg-2);border-radius:6px;overflow-wrap:break-word}
.pk-opt.blocked20{opacity:.6;filter:grayscale(1)}
.pk-opt.blocked20 .pk-btn{cursor:not-allowed;text-decoration:line-through}
.blocked20-why{margin:4px 0 0;color:var(--warn)}
.toolasks20{margin:6px 0 0;padding:6px 8px;border-left:3px solid var(--accent);background:var(--bg-2);border-radius:6px}
.ev20 .ev20-tech{display:block;white-space:pre-wrap;overflow-wrap:break-word;font-size:12px}
.toast.toast-why{cursor:pointer}
.toast.toast-why::after{content:" · " attr(data-why);text-decoration:underline;white-space:nowrap}
.sp-facts.sel{box-shadow:inset 0 0 0 2px var(--accent)}
.pg-bar .sp-facts{flex:0 0 auto;white-space:nowrap}
`;
function v200Css(){ try{ if (document.getElementById("v200-css")) return; const s = document.createElement("style"); s.id = "v200-css"; s.textContent = V200_CSS; (document.head || document.documentElement).appendChild(s); }catch(e){ console.warn("2.0: no styles", e); } }   // ok:catch without its sheet the page still works, plainer
v200Css();
