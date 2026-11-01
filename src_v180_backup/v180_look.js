/* ===================== 1.8 look: style C (friendly expressive), ink blue, always light; status pills; quiet Live tick + the way back; 'Claude drafted this' and 'We assume' labels; motion only where it explains =====================
   Decided by the owner on 1 Nov 2026 (PLAN-1.8 "Look"). The colours, shapes, fonts and motion are in styles18.css; this file
   does what CSS alone cannot:
   1. light by default: new workspaces start light; a one-time step turns an existing workspace's "system" into "light"
      (an explicit "dark" stays); "system" still follows the device when chosen in Settings
   2. every status slot is a tinted pill with its glyph and a word
   3. one big main button per screen; state pills that already carry a glyph get no second one
   4. the quiet "Live" line when a tool version goes live in PT, with PT's own rollback (Reinstall) and what it does —
      a release cannot be taken back by Undo (releases and the live version survive Undo and restore on purpose)
   5. "Claude drafted this · you decide" on what Claude wrote for you to decide; "We assume … — change" where PT guessed
   6. Health: small sparklines for taps and active minutes per day */

/* ---------- 1. light by default ---------- */
{ const orig = createWorkspace; createWorkspace = async function(name, lang, extra = {}){ return orig(name, lang, Object.assign({theme: "light", look18: true}, extra)); }; }
/** one time per workspace: PT becomes light (owner, 1 Nov 2026: "always light"; an earlier "dark" or "system" is replaced once). Any theme chosen afterwards is kept */
function look18Migrate(){
  if (typeof WS === "undefined" || !WS || !WS._set || !WS.settings || WS.settings.look18) return false;
  WS.settings.theme = "light";
  WS.settings.look18 = true; saveWs();
  return true;
}
{ const orig = applySettings; applySettings = function(){
  look18Migrate();
  const r = orig.apply(this, arguments);
  const th = (WS && WS.settings && WS.settings.theme) || "light";
  document.documentElement.setAttribute("data-theme", ["light", "dark", "system"].includes(th) ? th : "light");   // "system" is set explicitly: without a theme PT is light
  return r;
}; }

/* ---------- 2. the status slot as a pill: glyph + word ---------- */
const ST_WORD18 = {ok: "look.st.ok", done: "look.st.done", as: "look.st.as", warn: "look.st.warn", bad: "look.st.bad", todo: "look.st.todo", cur: "look.st.cur", attn: "look.st.attn"};
{ const orig = stSlot; stSlot = function(st, label = ""){
  const h = orig(st, label), s = ST_SHAPE[st] ? st : "todo";
  return h.replace('class="sslot ', 'class="sslot pill18 ').replace(/<\/svg><\/span>$/, `</svg><span class="ssw" aria-hidden="true">${esc(t(ST_WORD18[s]))}</span></span>`);
}; }

/* ---------- 5a. labels (used by 3) ---------- */
function cl18HTML(){ return `<span class="cl18" data-cl18="1">${ic("edit")}${esc(t("look.claude"))}</span>`; }
function as18HTML(what, action, attrs = ""){ return `<span class="as18" data-as18="1"><span class="as18-w">${esc(t("look.assume"))}</span> ${esc(what)} — <button type="button" class="linkish" data-a="${action}" ${attrs}>${esc(t("look.assume.change"))}</button></span>`; }
function cl18Node(){ const s = document.createElement("span"); s.innerHTML = cl18HTML(); return s.firstChild; }

/* ---------- 3. after every render: the main button, glyphs, labels ---------- */
const G18_STATE = ".chip.ok,.chip.warn,.chip.crit,.chip.st-ok,.chip.st-warn,.chip.st-bad,.chip.st-as";
function look18Visible(el){ return !!(el && el.getClientRects().length && !el.closest("details:not([open]) > :not(summary)")); }
function look18After(){
  // state pills that already show a glyph (an icon, ✓, ○, ★ …) keep only their own
  for (const c of document.querySelectorAll(G18_STATE)){
    if (c.classList.contains("g18") || c.classList.contains("g18n")) continue;
    const txt = (c.textContent || "").trim();
    c.classList.add(c.querySelector("svg") || /^[^\p{L}\p{N}]/u.test(txt) ? "g18" : "g18n");
  }
  // one big main button per screen: the first big primary, else the first full-size primary (and one in an open dialog)
  const roots = [document.querySelector(".main-inner"), document.querySelector(".overlay .modal"), document.querySelector(".lock-card")].filter(Boolean);
  for (const root of roots){
    if (root.querySelector(".btn.cta18")) continue;
    const cands = [...root.querySelectorAll(".btn.primary")].filter(b => !b.closest(".overlay") || root.closest(".overlay")).filter(look18Visible);
    const pick = cands.find(b => b.classList.contains("lg")) || cands.find(b => !b.classList.contains("xs") && !b.classList.contains("sm"));
    if (pick) pick.classList.add("cta18");
  }
  look18Labels();
}
{ const orig = afterRender; afterRender = function(){ const r = orig.apply(this, arguments); try{ look18After(); }catch(e){ onAppError(e && e.message, "look18"); } return r; }; }

/* ---------- 5. Claude's text labelled, PT's guesses said plainly ---------- */
function look18Labels(){
  // cards where Claude / PT put a ★ on an option or wrote the reason for it: pick cards, interview questions, Finish decisions
  for (const c of document.querySelectorAll(".pk-card:not([data-l18]), .qcard:not(.pk-card):not([data-l18]), .finish .dcard:not([data-l18])")){
    if (!c.querySelector(".pk-opt.rec, .pk-why, .opt.rec, .dopt.star")) continue;
    c.dataset.l18 = "1";
    const tag = c.querySelector(":scope > .pk-tag");
    if (tag) tag.appendChild(cl18Node()); else { const d = document.createElement("div"); d.className = "cl18-row"; d.appendChild(cl18Node()); c.prepend(d); }
  }
  // review findings (the issue and the fix were written by the reviewer, Claude)
  for (const f of document.querySelectorAll('[id^="ir-finding:"]:not([data-l18])')){ f.dataset.l18 = "1"; const row = f.querySelector(":scope > .body > .row"); if (row) row.appendChild(cl18Node()); }
  // drafts: the North Star draft PT proposes
  for (const b of document.querySelectorAll('[data-a="ns-accept"]')){ const sec = b.closest("section.panel"); if (!sec || sec.dataset.l18) continue; sec.dataset.l18 = "1"; const d = document.createElement("div"); d.className = "cl18-row"; d.appendChild(cl18Node()); const h = sec.querySelector(".panel-h, h2, h3"); if (h && h.parentNode === sec) h.after(d); else sec.prepend(d); }
  // the North Star PT filled in itself: "We assume this North Star — change"
  for (const c of document.querySelectorAll(".northstar .chip.st-as")){ const s = document.createElement("span"); s.innerHTML = as18HTML(t("look.assume.ns"), "edit-ns"); c.replaceWith(s.firstChild); }
  // interview answers PT assumed: "We assume <answer> — change"
  for (const row of document.querySelectorAll(".qa14.as:not([data-l18])")){
    row.dataset.l18 = "1";
    const b = row.querySelector(".ititle > b"), ch = row.querySelector('[data-a="qa-reanswer"]'); if (!b || !ch) continue;
    const w = document.createElement("span"); w.className = "as18-w"; w.textContent = t("look.assume") + " ";
    const go = document.createElement("button"); go.type = "button"; go.className = "linkish"; go.dataset.a = "qa-reanswer"; go.dataset.id = ch.dataset.id; go.textContent = t("look.assume.change");
    b.before(w); b.after(" — ", go);
  }
  // ★ answers taken in one go without asking (pick overview and summary): "We assume this ★ answer — change"
  const taken = t("pk.assumed");
  for (const c of document.querySelectorAll(".pk-dec .chip, .pk-sum .chip")){
    if ((c.textContent || "").trim() !== taken) continue;
    const row = c.closest(".pk-dec"), ch = row && row.querySelector('[data-a="pk-change"]');
    const s = document.createElement("span"); s.innerHTML = ch ? as18HTML(t("look.assume.pick"), "pk-change", `data-id="${esc(ch.dataset.id)}"`) : `<span class="as18"><span class="as18-w">${esc(t("look.assume"))}</span> ${esc(t("look.assume.pick"))}</span>`;
    c.replaceWith(s.firstChild);
  }
}
/* the proposal PT drafts for an item ("Fix for me", "refine"): labelled at its head */
{ const orig = proposalCard; proposalCard = function(p, ref, a){ return orig(p, ref, a).replace('<div class="proposal">', '<div class="proposal">' + `<div class="cl18-row">${cl18HTML()}</div>`); }; }

/* ---------- 4. the quiet "Live" line ---------- */
const LIVE18 = {seen: new Map(), mute: new Set(), timer: 0};
function live18Key(p){ return (WS && WS.id ? WS.id : "") + ":" + p.id; }
/** what is live now, per project, as PT found it (a project PT has not seen yet counts from its first change on) */
function live18Seed(){ if (typeof WS === "undefined" || !WS || !Array.isArray(WS.projects)) return; for (const p of WS.projects) if (p && p.id && !LIVE18.seen.has(live18Key(p))) LIVE18.seen.set(live18Key(p), p.live ? str(p.live.v) : ""); }
function live18Check(p){
  if (!p || !p.id || !WS || !WS.id) return;
  const k = live18Key(p), cur = p.live ? str(p.live.v) : "";
  if (!LIVE18.seen.has(k)){ LIVE18.seen.set(k, cur); return; }
  const was = LIVE18.seen.get(k); LIVE18.seen.set(k, cur);
  if (!cur || cur === was) return;
  live18Show(p, cur, was || str(p.live && p.live.from));
}
function live18Close(){ clearTimeout(LIVE18.timer); for (const el of document.querySelectorAll(".live18")) el.remove(); }
function live18Show(p, v, prev){
  live18Close();
  // the line says it once: PT's own "released" / "live again" toasts for this version are left out
  LIVE18.mute = new Set([t("rel.done", {v}), t("rel.reinstalled", {v})]); setTimeout(() => { LIVE18.mute = new Set(); }, 1500);
  for (const el of document.querySelectorAll("#toasts .toast")) if (LIVE18.mute.has(el.textContent)) el.remove();
  const back = prev && prev !== v && arr(p.releases).some(r => r.v === prev) ? prev : "";
  let host = document.getElementById("toasts"); if (!host){ host = document.createElement("div"); host.id = "toasts"; host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div"); el.className = "live18"; el.setAttribute("role", "status"); el.dataset.pid = p.id; el.dataset.v = v;
  el.innerHTML = `<span class="lv-tick" aria-hidden="true">${ic("check")}</span><span class="lv-t"><b>${esc(t("look.live"))}</b> · ${esc(t("look.live.line", {name: p.name, v}))}<span class="lv-what">${esc(back ? t("look.live.back", {v: back, c: v}) : t("look.live.first"))}</span></span>${back ? `<button class="btn sm" data-a="live18-back" data-pid="${esc(p.id)}" data-v="${esc(back)}">${ic("undo")}${esc(t("rel.reinstallbtn", {v: back}))}</button>` : ""}<button class="iconbtn" data-a="live18-close" aria-label="${esc(t("look.live.close"))}" title="${esc(t("look.live.close"))}">${ic("x")}</button>`;
  host.prepend(el);
  LIVE18.timer = setTimeout(() => { if (el.contains(document.activeElement)){ LIVE18.timer = setTimeout(live18Close, 15000); return; } el.classList.add("fold18"); setTimeout(() => el.remove(), 320); }, 45000);
}
{ const orig = touch; touch = function(p){ const r = orig.apply(this, arguments); try{ live18Check(p); }catch(e){ onAppError(e && e.message, "live18"); } return r; }; }
{ const orig = toast; toast = function(msg, kind = ""){ if (LIVE18.mute.has(msg)) return; return orig(msg, kind); }; }
// what is live when a workspace opens is the starting point (applySettings runs once the projects are loaded, before finished jobs are applied)
{ const orig = applySettings; applySettings = function(){ const r = orig.apply(this, arguments); try{ live18Seed(); }catch(e){} return r; }; }   // ok:catch a missing seed only means the next change is counted from there
// a newer project version loaded from elsewhere (another window) is not "put live" by you here
{ const orig = onSaveConflict; onSaveConflict = function(path, remote, mine){ const r = orig.apply(this, arguments); try{ for (const p of arr(WS && WS.projects)) LIVE18.seen.set(live18Key(p), p.live ? str(p.live.v) : ""); }catch(e){} return r; }; }   // ok:catch the seen list is rebuilt at the next change
Object.assign(ACTIONS, {
  /* PT's rollback: the earlier version becomes live again; the dialog says what happens and nothing changes before you confirm */
  "live18-back": el => { const p = WS.projects.find(x => x.id === el.dataset.pid); if (!p) return; live18Close(); if (!(UI.view === "project" && UI.pid === p.id)) openProject(p.id); doRollback(p, el.dataset.v); },
  "live18-close": () => live18Close()
});

/* ---------- 6. Health: your time in PT, per day ---------- */
/** the last 14 days, oldest first: taps and active minutes per day (all page loads of this workspace) */
function look18Daily(){
  const docs = arr(MET.recent).concat(MET.doc && WS && MET.doc.ws === WS.id ? [MET.doc] : []);
  const out = []; for (let i = 13; i >= 0; i--){ const d = metDay(new Date(Date.now() - i * 86400000)); out.push(docs.filter(x => x && x.day === d).reduce((s, x) => ({day: d, taps: s.taps + num(x.taps, 0), min: s.min + num(x.min, 0)}), {day: d, taps: 0, min: 0})); }
  return out;
}
function spark18Day(d){ try{ return new Date(d + "T12:00:00").toLocaleDateString(LANG === "de" ? "de-CH" : LANG === "zh" ? "zh-CN" : "en-GB", {day: "numeric", month: "short"}); }catch(e){ return d; } }   // ok:catch an odd date shows as written
function spark18(vals, what){
  const W = 168, H = 36, n = vals.length, max = Math.max(1, ...vals), x = i => 3 + i * (W - 6) / Math.max(1, n - 1), y = v => H - 3 - v / max * (H - 8);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${H - 1} L${pts.split(" ").join(" L")} L${x(n - 1).toFixed(1)},${H - 1} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("look.spk.aria", {what, list: vals.join(", ")}))}"><path class="sa" d="${area}"/><polyline class="sl" points="${pts}"/><circle class="sd" cx="${x(n - 1).toFixed(1)}" cy="${y(vals[n - 1]).toFixed(1)}" r="2.6"/></svg>`;
}
function spark18HTML(){
  const days = look18Daily(), taps = days.map(d => d.taps), mins = days.map(d => d.min);
  const fig = (vals, key) => `<figure><figcaption><span>${esc(t(key))}</span><span class="muted">${esc(t("look.spk.today"))} <b>${vals[vals.length - 1]}</b> · ${esc(t("look.spk.peak", {n: Math.max(0, ...vals)}))}</span></figcaption>${spark18(vals, t(key))}<span class="sx" aria-hidden="true"><span>${esc(spark18Day(days[0].day))}</span><span>${esc(t("look.spk.today"))}</span></span></figure>`;
  return `<div class="spk18" data-spk18="1">${fig(taps, "look.spk.taps")}${fig(mins, "look.spk.min")}</div>`;
}
{ const orig = metRowHTML; metRowHTML = function(){ const h = orig.apply(this, arguments); if (MET.recent === null) return h; try{ return h.replace(/<\/div>$/, spark18HTML() + "</div>"); }catch(e){ return h; } }; }   // ok:catch without the sparklines the row still shows the numbers
