/* ===================== 2.2.0 · item 22 "My prompts where I type" (HANDOFF-item22.md; decisions D-2026-11-09-01..07, D-2026-11-10-04) =====================
   1 Registry: PRM_FIELDS = every PT field whose text goes to Claude or to PT's hands (they get a Prompts button); PRM_NOFIELDS = every other
     text field with the reason it has none. test/static_checks.js fails when a text field id is on neither list.
   2 The button is added after every render (afterRender) inside the field's own place, so a background render never loses it; typed and
     chosen text in a prompt field survives a render (PRM.drafts, cleared when its form is sent or the field goes away).
   3 The list is its own layer outside #app (a render never closes it), above popups; Esc or a tap outside closes only the list.
   4 Order: ★ first, then "Most used" (frecency: often + recent, counted on this device only, never in backups); or A–Z (setting).
   5 Choose puts the prompt at the cursor of the field the list was opened from; if that field is gone or doubled, it copies instead and says so.
     Blanks {{name}} (at most 7) are asked first; Choose stays off until all are filled.
   6 Auto-send (off on every device until switched on here): Chat Mode's box only, never with blanks, never an unopened Received prompt.
   7 Manage: add, edit (explicit Save), ★, category, delete into Deleted (n) → Restore; only the person empties Deleted (one click + confirm);
     a starter becomes yours with "Make my copy"; a key or token in the text blocks Save. Data stays in WS.patterns (title/desc/body where 2.1.1
     reads them; new fields cat, fav, deletedAt, updatedAt, src, opened only added), so a rollback to 2.1.1 keeps every prompt.
   claude.ai's own message box is out of reach for a page (no capability writes into it): Copy is the route there. */
const PRM_FIELDS = ["c20-in", "it-in", "it-refine", "cm-wish", "ask-sec-in", "exa-aim", "pk-dump-in", "pk-notice-in", "cone-say-in", "h20-in", "m20-q", "guide-in", "start-in", "cr-in", "res-topic", "mock-note-in"];
const PRM_NOFIELDS = {
  "pin-new": "a PIN", "pin-code": "a PIN", "pin-owner": "a PIN", "pin": "a PIN", "pr-in": "a generic answer box, also used for PINs",
  "pname": "a name", "np-name": "a name", "rp-name": "a name", "fr-name": "a name", "dc-title": "a name", "sn-v": "a version label", "su20-repo": "a repository name", "h20-site-in": "a site address",
  "q-find": "a search", "nq": "a search", "act-q": "a search", "pal-in": "a search",
  "rb-in": "the raw brief editor (code)", "exa-in": "an example's input (what the tool receives)", "exa-out": "an example's output (what the tool returns)", "exa-why": "the person's verdict reason",
  "sn-note": "a note", "an-text": "a note", "dr-new": "a note", "scratch": "a scratch note", "nn-text": "a note", "tfb-text": "a report to PT's owner", "tr-in": "a report to PT's owner", "ib18-text": "a report to PT's owner", "fb-comment": "a feedback comment", "cap-in": "a quick capture line",
  "rep-in": "a paste field", "fb-paste": "a paste field", "rl-in": "a paste field", "pk-import-in": "a paste field", "res-paste": "a paste field", "ex-in": "a paste field (an existing prompt)",
  "oos": "a list (one item per line)", "const": "a list (one item per line)", "ver-reason": "a decision record", "dc-choice": "a decision record", "dc-reason": "a decision record", "oq-text": "an open-question log line",
  "fa-words": "a rule kept word for word in the facts book", "m20-why": "a decision record", "m20-trip": "a decision record", "m20-higher": "a decision record", "pt20-in": "a test input for the tool", "sn-note2": "a note",
  "prm-q": "the prompt list's own search", "prm-e-title": "the prompt editor", "prm-e-desc": "the prompt editor", "prm-e-body": "the prompt editor", "prm-le-title": "the prompt editor", "prm-le-desc": "the prompt editor", "prm-le-body": "the prompt editor"
};
const PRM_CATS = ["fav", "used", "surface", "pick", "fold", "verify", "audit", "received", "map", "starter"];
const PRM_SETCATS = ["surface", "pick", "fold", "verify", "audit", "map"];
const PRM_MAX_BLANKS = 7;
const PRM = {open: false, cat: "", q: "", target: null, expanded: "", blanks: null, edit: null, drafts: new Map(), msg: ""};

/* ---------- settings (flat keys in WS.settings, kept by a backup) and device-only things (never in a backup) ---------- */
function prmSet(k, d){ const s = WS && WS.settings || {}; return s[k] === undefined ? d : s[k]; }
function prmBtnOn(){ return prmSet("prmBtn", true) !== false; }
function prmOpenOn(){ const v = prmSet("prmOpen", "used"); return PRM_CATS.includes(v) || v === "all" ? v : "used"; }
function prmOrder(){ return prmSet("prmOrder", "used") === "az" ? "az" : "used"; }
function prmStarters(){ return prmSet("prmStarters", true) !== false; }
function prmLS(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }   // ok:catch storage can be blocked; the default holds
function prmLSset(k, v){ try{ if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} }   // ok:catch storage can be blocked
function prmAutoSend(){ return prmLS("pt.prm.autosend") === "1"; }
function prmUseKey(){ return "pt.prm.use." + str(WS && WS.id); }
function prmUses(){ try{ const o = JSON.parse(prmLS(prmUseKey()) || "{}"); return o && typeof o === "object" ? o : {}; }catch(e){ return {}; } }   // ok:catch a broken count starts fresh
function prmCount(id){ const u = prmUses(); const x = u[id] && typeof u[id] === "object" ? u[id] : {n: 0, last: ""}; x.n = num(x.n, 0) + 1; x.last = now(); u[id] = x; prmLSset(prmUseKey(), JSON.stringify(u)); }
function prmScore(id, U){ const x = U[id]; if (!x) return 0; const age = Math.max(0, (Date.now() - Date.parse(str(x.last))) / 86400000) || 0; return num(x.n, 0) * Math.pow(0.5, age / 14); }

/* ---------- the prompts: yours (WS.patterns) and PT's starters ---------- */
function prmOwnCat(x){ return PRM_SETCATS.includes(str(x.cat)) ? str(x.cat) : (str(x.src) === "import" ? "received" : ""); }
function prmAll(){
  const own = arr(WS.patterns).filter(x => x && !x.deletedAt).map(x => ({id: x.id, title: str(x.title), desc: str(x.desc), body: str(x.body), cat: prmOwnCat(x), fav: !!x.fav, own: true, outside: str(x.src) === "import", opened: !!x.opened, kind: str(x.kind)}));
  const st = prmStarters() ? STARTER_PATTERNS.map(x => ({id: x.id, title: str(x.en), desc: str(x.d && x.d.en), body: str(x.body), cat: "starter", fav: false, own: false, outside: false, opened: true, lang: "en"})) : [];
  return [...own, ...st];
}
function prmDeleted(){ return arr(WS.patterns).filter(x => x && x.deletedAt); }
function prmIn(x, cat){ if (!cat || cat === "all") return true; if (cat === "fav") return x.fav; if (cat === "used") return x.cat !== "starter" || !!prmUses()[x.id]; return x.cat === cat; }
function prmSorted(list){
  if (prmOrder() === "az") return list.slice().sort((a, b) => (b.fav - a.fav) || a.title.localeCompare(b.title));
  const U = prmUses();
  return list.slice().sort((a, b) => (b.fav - a.fav) || (prmScore(b.id, U) - prmScore(a.id, U)) || (a.cat === "starter") - (b.cat === "starter") || a.title.localeCompare(b.title));
}
function prmMatch(x, q){ if (!q) return true; const s = (x.title + " " + x.desc + " " + x.body).toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => s.includes(w)); }
function prmBlanks(body){ const out = []; for (const m of str(body).matchAll(/\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g)){ const k = m[1].trim(); if (k && !out.includes(k)) out.push(k); } return out; }
function prmFill(body, vals){ return str(body).replace(/\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g, (m, k) => { const v = vals[k.trim()]; return v == null ? m : v; }); }
/* a key or token in a prompt blocks Save: checked word by word (a whole-value check never fires on text with spaces) */
const PRM_KEY_RX = [/^sk-[A-Za-z0-9_-]{16,}$/, /^sk-ant-[A-Za-z0-9_-]{10,}$/, /^gh[pousr]_[A-Za-z0-9]{20,}$/, /^github_pat_[A-Za-z0-9_]{20,}$/, /^xox[abposr]-[A-Za-z0-9-]{10,}$/, /^AKIA[0-9A-Z]{16}$/, /^AIza[0-9A-Za-z_-]{30,}$/, /^(rk|sk|pk)_(live|test)_[A-Za-z0-9]{10,}$/, /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/, /^glpat-[A-Za-z0-9_-]{16,}$/];
function prmHasKey(text){ return str(text).split(/[\s"'`<>()[\]{},;]+/).some(w => w.length >= 16 && (PRM_KEY_RX.some(rx => rx.test(w)) || (/^[A-Za-z0-9+/_-]{40,}={0,2}$/.test(w) && /[0-9]/.test(w) && /[A-Z]/.test(w) && /[a-z]/.test(w)))); }

/* ---------- the button inside every prompt field ---------- */
function prmHostKey(el){ const h = el && el.closest(".overlay, .drawer, .insp, .main, .capture"); return h ? (h.classList.contains("overlay") ? "overlay" : h.classList.contains("drawer") ? "drawer" : h.classList.contains("insp") ? "insp" : h.classList.contains("capture") ? "capture" : "main") : "page"; }
function prmFieldsNow(id, host){ return [...document.querySelectorAll(`[id="${CSS.escape(id)}"]`)].filter(el => !host || prmHostKey(el) === host); }
function prmDecorate(){
  if (!prmBtnOn() || !document.getElementById("app")) return;
  for (const id of PRM_FIELDS){
    for (const el of document.querySelectorAll(`[id="${CSS.escape(id)}"]`)){
      if (el.type === "hidden" || el.dataset.prm === "1") continue;
      el.dataset.prm = "1";
      const b = document.createElement("button"); b.type = "button"; b.className = "btn xs ghost prm-btn"; b.dataset.prmFor = id;
      b.setAttribute("aria-label", t("prm.btn.aria")); b.innerHTML = `${ic("book")}<span>${esc(t("prm.btn"))}</span>`;
      const own = el.parentElement && el.parentElement.classList.contains("own") ? el.parentElement : null;
      (own || el).insertAdjacentElement("afterend", b);
      // keep a draft through renders: restore it when a render brought the field back empty
      const k = id + "|" + prmHostKey(el), d = PRM.drafts.get(k);
      if (d && !str(el.value)) el.value = d;
    }
  }
  // a draft whose field is gone is dropped (its text was copied when Choose could not place it)
  for (const k of [...PRM.drafts.keys()]){ const [id, host] = k.split("|"); if (!prmFieldsNow(id, host).length) PRM.drafts.delete(k); }
}
document.addEventListener("input", e => { const el = e.target; if (!el || !PRM_FIELDS.includes(el.id)) return; const k = el.id + "|" + prmHostKey(el); if (str(el.value)) PRM.drafts.set(k, el.value); else PRM.drafts.delete(k); }, true);
document.addEventListener("submit", e => { const f = e.target; if (f && f.querySelectorAll) for (const el of f.querySelectorAll("[id]")) if (PRM_FIELDS.includes(el.id)) PRM.drafts.delete(el.id + "|" + prmHostKey(el)); }, true);
/* forms that are sent without a submit event (Ctrl+Enter calls FORMS directly) also clear their drafts */
for (const name of Object.keys(FORMS)){ const orig = FORMS[name]; FORMS[name] = function(f){ try{ const form = f && f.querySelectorAll ? f : document.querySelector(`[data-form="${CSS.escape(name)}"]`); if (form) for (const el of form.querySelectorAll("[id]")) if (PRM_FIELDS.includes(el.id)) PRM.drafts.delete(el.id + "|" + prmHostKey(el)); }catch(e){} return orig.apply(this, arguments); }; }   // ok:catch clearing a draft never stops a send
document.addEventListener("pointerdown", e => { const b = e.target && e.target.closest && e.target.closest(".prm-btn"); if (!b) return; const id = b.dataset.prmFor, el = b.previousElementSibling && (b.previousElementSibling.id === id ? b.previousElementSibling : b.previousElementSibling.querySelector(`[id="${CSS.escape(id)}"]`));
  if (el) PRM.target = {id, host: prmHostKey(el), s: num(el.selectionStart, str(el.value).length), e: num(el.selectionEnd, str(el.value).length), label: prmFieldLabel(el)}; }, true);
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest(".prm-btn"); if (!b) return; e.preventDefault(); e.stopPropagation();
  if (!PRM.target || PRM.target.id !== b.dataset.prmFor){ const el = b.previousElementSibling; PRM.target = {id: b.dataset.prmFor, host: prmHostKey(b), s: str(el && el.value).length, e: str(el && el.value).length, label: prmFieldLabel(el)}; }
  prmOpen(); }, true);
function prmFieldLabel(el){ if (!el) return ""; const lab = el.closest("label") && el.closest("label").querySelector("span"); const l = (lab && lab.textContent) || (document.querySelector(`label[for="${CSS.escape(el.id)}"]`) || {}).textContent || el.getAttribute("placeholder") || el.getAttribute("aria-label") || ""; return trunc(str(l).trim(), 48); }   // ok:trunc a short "into:" label; the field itself shows the rest
{ const orig = afterRender; afterRender = function(){ const r = orig.apply(this, arguments); try{ prmDecorate(); }catch(e){ onAppError(e && e.message, "prm:decorate"); } return r; }; }

/* ---------- the list: its own layer outside #app ---------- */
function prmLayer(){ let L = document.getElementById("prm-layer"); if (!L){ L = document.createElement("div"); L.id = "prm-layer"; document.body.appendChild(L); L.addEventListener("click", prmClick); L.addEventListener("input", prmInput); L.addEventListener("compositionend", prmInput); } return L; }
function prmOpen(cat){ PRM.open = true; PRM.cat = cat || prmOpenOn(); PRM.q = ""; PRM.expanded = ""; PRM.blanks = null; PRM.edit = null; PRM.msg = ""; prmDraw(); setTimeout(() => { const q = document.getElementById("prm-q"); if (q) q.focus({preventScroll: true}); }, 20); }
function prmClose(){ PRM.open = false; PRM.blanks = null; PRM.edit = null; const L = document.getElementById("prm-layer"); if (L) L.innerHTML = ""; const tg = PRM.target; if (tg){ const f = prmFieldsNow(tg.id, tg.host); if (f.length === 1) try{ f[0].focus({preventScroll: true}); }catch(e){} } }   // ok:catch focus is best effort
function prmCatCount(cat, all){ return all.filter(x => prmIn(x, cat)).length; }
function prmRowHTML(x){
  const open = PRM.expanded === x.id, bl = prmBlanks(x.body);
  const chips = `${x.fav ? `<span class="chip acc">${ic("star")} ${esc(t("prm.fav"))}</span>` : ""}${x.cat && x.cat !== "starter" ? `<span class="chip">${esc(t("prm.cat." + x.cat))}</span>` : ""}${x.cat === "starter" ? `<span class="chip">${esc(t("prm.starter.en"))}</span>` : ""}${x.outside ? `<span class="chip warn">${ic("flag")} ${esc(t("prm.outside"))}</span>` : ""}${bl.length ? `<span class="chip">${esc(t("prm.blanks", {n: bl.length}))}</span>` : ""}`;
  return `<div class="prm-row ${open ? "open" : ""}" data-id="${esc(x.id)}">
    <button type="button" class="prm-head" data-p="toggle" data-id="${esc(x.id)}" aria-expanded="${esc(String(open))}"><b>${esc(x.title || t("prm.untitled"))}</b><span class="small muted">${esc(x.desc)}</span><span class="prm-chips">${chips}</span></button>
    <pre class="prm-body small ${open ? "" : "clamp"}">${esc(x.body)}</pre>
    <div class="row prm-acts"><button type="button" class="btn sm" data-p="copy" data-id="${esc(x.id)}">${ic("copy")} ${esc(t("btn.copy"))}</button><button type="button" class="btn sm primary" data-p="choose" data-id="${esc(x.id)}" ${PRM.target ? "" : "disabled"}>${ic("arrow")} ${esc(t("prm.choose"))}</button>
      ${x.own ? `<button type="button" class="btn sm ghost" data-p="fav" data-id="${esc(x.id)}" aria-pressed="${esc(String(x.fav))}">${ic("star")} ${esc(x.fav ? t("prm.unfav") : t("prm.dofav"))}</button><button type="button" class="btn sm ghost" data-p="edit" data-id="${esc(x.id)}">${ic("edit")} ${esc(t("btn.edit"))}</button>` : `<button type="button" class="btn sm ghost" data-p="mine" data-id="${esc(x.id)}">${ic("plus")} ${esc(t("prm.mine"))}</button>`}</div></div>`;
}
function prmBlanksHTML(){
  const B = PRM.blanks; const x = prmAll().find(y => y.id === B.id); if (!x) return "";
  const keys = prmBlanks(x.body), filled = keys.every(k => str(B.vals[k]).trim());
  return `<div class="prm-blanks stack"><h3>${esc(x.title)}</h3><p class="small muted">${esc(t("prm.blanks.lead"))}</p>
    ${keys.map((k, i) => `<label class="fld"><span>${esc(k)}</span><input type="text" data-blank="${esc(k)}" id="prm-b-${esc(String(i))}" value="${esc(str(B.vals[k]))}"></label>`).join("")}
    <div class="row"><button type="button" class="btn primary" data-p="fill" ${filled ? "" : "disabled"}>${ic("arrow")} ${esc(t("prm.choose"))}</button><button type="button" class="btn ghost" data-p="back">${esc(t("btn.back"))}</button></div></div>`;
}
function prmEditHTML(){
  const E = PRM.edit; const keys = prmBlanks(E.body), tooMany = keys.length > PRM_MAX_BLANKS, key = prmHasKey(E.body + " " + E.title + " " + E.desc);
  return `<div class="prm-edit stack"><h3>${esc(E.id ? t("prm.edit.t") : t("prm.new"))}</h3>
    <label class="fld"><span>${esc(t("prm.e.title"))}</span><input type="text" id="prm-e-title" data-e="title" value="${esc(E.title)}"></label>
    <label class="fld"><span>${esc(t("prm.e.desc"))}</span><input type="text" id="prm-e-desc" data-e="desc" value="${esc(E.desc)}"></label>
    <div class="row"><label class="fld"><span>${esc(t("prm.e.cat"))}</span><select data-e="cat"><option value="">${esc(t("prm.cat.none"))}</option>${PRM_SETCATS.map(c => `<option value="${c}" ${E.cat === c ? "selected" : ""}>${esc(t("prm.cat." + c))}</option>`).join("")}</select></label>
      <label class="chk"><input type="checkbox" data-e="fav" ${E.fav ? "checked" : ""}> ${esc(t("prm.fav"))}</label></div>
    <label class="fld"><span>${esc(t("prm.e.body"))}</span><textarea id="prm-e-body" data-e="body" rows="8">${esc(E.body)}</textarea><span class="small muted">${esc(t("prm.e.blankhint", {n: PRM_MAX_BLANKS}))}</span></label>
    ${key ? `<p class="small crit-t" role="alert">${ic("lock")} ${esc(t("prm.e.key"))}</p>` : ""}${tooMany ? `<p class="small crit-t" role="alert">${esc(t("prm.e.toomany", {n: PRM_MAX_BLANKS}))}</p>` : ""}
    <div class="row"><button type="button" class="btn primary" data-p="save" ${key || tooMany || !str(E.body).trim() || !str(E.title).trim() ? "disabled" : ""}>${ic("check")} ${esc(t("btn.save"))}</button><button type="button" class="btn ghost" data-p="back">${esc(t("btn.cancel"))}</button>
      ${E.id ? `<button type="button" class="btn ghost danger" data-p="del" data-id="${esc(E.id)}">${ic("trash")} ${esc(t("prm.del"))}</button>` : ""}</div></div>`;
}
function prmListHTML(){
  const all = prmAll(); const list = prmSorted(all.filter(x => prmIn(x, PRM.cat) && prmMatch(x, PRM.q)));
  if (!all.length) return `<p class="small muted">${esc(t("prm.empty"))}</p>`;
  return list.length ? list.map(prmRowHTML).join("") : `<p class="small muted">${esc(t("prm.none"))}</p>`;
}
function prmDraw(){
  const L = prmLayer(); if (!PRM.open){ L.innerHTML = ""; return; }
  const all = prmAll(), tg = PRM.target;
  const chips = ["all", ...PRM_CATS].filter(c => c === "all" || c === "used" || c === "fav" || prmCatCount(c, all)).map(c => `<button type="button" class="chip tap ${PRM.cat === c ? "sel" : ""}" data-p="cat" data-v="${c}" aria-pressed="${esc(String(PRM.cat === c))}">${esc(c === "all" ? t("prm.cat.all") : t("prm.cat." + c))}${c === "used" || c === "all" ? "" : " · " + prmCatCount(c, all)}</button>`).join("");
  const body = PRM.edit ? prmEditHTML() : PRM.blanks ? prmBlanksHTML() : `<div class="prm-chipsrow" role="group" aria-label="${esc(t("prm.cats"))}">${chips}</div>
      <label class="fld"><span class="sr20">${esc(t("prm.search"))}</span><input type="search" id="prm-q" placeholder="${esc(t("prm.search"))}" value="${esc(PRM.q)}" autocomplete="off"></label>
      <div class="prm-list" id="prm-list">${prmListHTML()}</div>
      <div class="row"><button type="button" class="btn sm" data-p="new">${ic("plus")} ${esc(t("prm.new"))}</button>${prmDeleted().length ? `<button type="button" class="btn sm ghost" data-p="lib">${esc(t("prm.deleted", {n: prmDeleted().length}))}</button>` : ""}</div>`;
  const html = `<div class="prm-back" data-p="close"></div><section class="prm-pop" role="dialog" aria-modal="true" aria-label="${esc(t("prm.title"))}">
    <div class="row prm-top"><h2 style="flex:1 1 10em">${ic("book")} ${esc(t("prm.title"))}</h2><button type="button" class="iconbtn" data-p="close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    ${tg ? `<p class="small muted prm-into">${esc(t("prm.into", {x: tg.label || t("prm.title")}))}</p>` : ""}${PRM.msg ? `<p class="small ok-t" role="status">${esc(PRM.msg)}</p>` : ""}
    ${body}</section>`;
  L.innerHTML = html;   // ok:raw (every value above is escaped)
}
function prmRedrawList(){ const el = document.getElementById("prm-list"); if (el) el.innerHTML = prmListHTML(); }
function prmInput(e){
  const el = e.target; if (!el) return;
  if (el.id === "prm-q"){ if (e.type === "input" && e.isComposing) return; PRM.q = el.value; prmRedrawList(); return; }   // Chinese typing: no redraw while composing
  if (el.dataset.blank != null && PRM.blanks){ PRM.blanks.vals[el.dataset.blank] = el.value; const keys = prmBlanks((prmAll().find(y => y.id === PRM.blanks.id) || {}).body); const b = document.querySelector("#prm-layer [data-p=fill]"); if (b) b.disabled = !keys.every(k => str(PRM.blanks.vals[k]).trim()); return; }
  if (el.dataset.e && PRM.edit){ PRM.edit[el.dataset.e] = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.e === "body" || el.dataset.e === "title" || el.dataset.e === "desc"){ const E = PRM.edit, key = prmHasKey(E.body + " " + E.title + " " + E.desc), many = prmBlanks(E.body).length > PRM_MAX_BLANKS; const s = document.querySelector("#prm-layer [data-p=save]"); if (s) s.disabled = key || many || !str(E.body).trim() || !str(E.title).trim();
      const pa = document.querySelector("#prm-layer .prm-edit"); if (pa && (key || many) !== !!pa.querySelector(".crit-t")){ const keep = document.activeElement && document.activeElement.id, ss = document.activeElement && document.activeElement.selectionStart; prmDraw(); const f = keep && document.getElementById(keep); if (f){ f.focus(); try{ f.setSelectionRange(ss, ss); }catch(er){} } } } }   // ok:catch selection on inputs that have none
}
document.addEventListener("change", e => { if (e.target && e.target.closest && e.target.closest("#prm-layer")) prmInput(e); }, true);

/* ---------- placing a prompt ---------- */
function prmPlace(text, x){
  const tg = PRM.target; const f = tg ? prmFieldsNow(tg.id, tg.host) : [];
  prmCount(x.id); prmMarkOpened(x);
  if (f.length !== 1){ copyText(text); prmClose(); toast(t("prm.gone"), ""); return false; }
  const el = f[0], v = str(el.value), s = clamp(num(tg.s, v.length), 0, v.length), e2 = clamp(num(tg.e, s), s, v.length);
  const sep = s > 0 && !/\s$/.test(v.slice(0, s)) ? " " : "";
  el.value = v.slice(0, s) + sep + text + v.slice(e2);
  el.dispatchEvent(new Event("input", {bubbles: true}));
  PRM.drafts.set(tg.id + "|" + tg.host, el.value);
  const caret = s + sep.length + text.length;
  prmClose();
  try{ el.focus({preventScroll: false}); el.setSelectionRange(caret, caret); }catch(er){}   // ok:catch some fields have no selection
  // auto-send: Chat Mode's box only, never with blanks (they are filled by now) or an unopened Received prompt
  if (prmAutoSend() && tg.id === "c20-in" && !prmBlanks(x.body).length && !(x.outside && !x.wasOpened)){ const form = el.closest("form"); if (form && FORMS["c20-say"]) FORMS["c20-say"](form); }
  return true;
}
function prmMarkOpened(x){ x.wasOpened = !!x.opened; if (!x.own) return; const p = arr(WS.patterns).find(y => y.id === x.id); if (p && !p.opened){ p.opened = true; Store.put(wsPath() + "/patterns/" + p.id, p); } }
function prmSave(){
  const E = PRM.edit; if (!E || prmHasKey(E.body + " " + E.title + " " + E.desc) || prmBlanks(E.body).length > PRM_MAX_BLANKS || !str(E.body).trim() || !str(E.title).trim()) return;
  let x = E.id ? arr(WS.patterns).find(y => y.id === E.id) : null;
  if (!x){ x = {id: uid("pt"), kind: "block", createdAt: now()}; WS.patterns.push(x); }
  Object.assign(x, {title: str(E.title).trim(), desc: str(E.desc).trim(), body: str(E.body), cat: PRM_SETCATS.includes(E.cat) ? E.cat : "", fav: !!E.fav, updatedAt: now(), opened: true});
  Store.put(wsPath() + "/patterns/" + x.id, x);
  PRM.edit = null; PRM.msg = t("prm.saved");
  return x;
}
function prmSoftDelete(id){ const x = arr(WS.patterns).find(y => y.id === id); if (!x) return; x.deletedAt = now(); Store.put(wsPath() + "/patterns/" + x.id, x); }
function prmRestore(id){ const x = arr(WS.patterns).find(y => y.id === id); if (!x) return; delete x.deletedAt; Store.put(wsPath() + "/patterns/" + x.id, x); }
function prmStarterCopy(id){ const s = STARTER_PATTERNS.find(y => y.id === id); if (!s) return null; const x = {id: uid("pt"), kind: "block", createdAt: now(), title: str(s.en), desc: str(s.d && s.d.en), body: str(s.body), cat: "", fav: false, opened: true, from: s.id}; WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); return x; }
function prmClick(e){
  const b = e.target && e.target.closest("[data-p]"); if (!b) return;
  const a = b.dataset.p, id = b.dataset.id, x = id ? prmAll().find(y => y.id === id) : null;
  e.stopPropagation();
  if (a === "close"){ prmClose(); return; }
  if (a === "cat"){ PRM.cat = b.dataset.v; PRM.expanded = ""; prmDraw(); return; }
  if (a === "toggle"){ PRM.expanded = PRM.expanded === id ? "" : id; if (x && PRM.expanded) prmMarkOpened(x); prmDraw(); return; }
  if (a === "copy" && x){ copyText(x.body); prmCount(x.id); prmMarkOpened(x); toast(t("prm.copied"), "ok"); return; }
  if (a === "choose" && x){ const bl = prmBlanks(x.body); if (bl.length){ PRM.blanks = {id: x.id, vals: {}}; prmDraw(); setTimeout(() => { const f = document.getElementById("prm-b-0"); if (f) f.focus(); }, 20); return; } prmPlace(x.body, x); return; }
  if (a === "fill" && PRM.blanks){ const y = prmAll().find(z => z.id === PRM.blanks.id); if (!y) return; const keys = prmBlanks(y.body); if (!keys.every(k => str(PRM.blanks.vals[k]).trim())) return; prmPlace(prmFill(y.body, PRM.blanks.vals), y); return; }
  if (a === "back"){ PRM.blanks = null; PRM.edit = null; prmDraw(); return; }
  if (a === "fav" && x && x.own){ const p = arr(WS.patterns).find(z => z.id === id); if (p){ p.fav = !p.fav; Store.put(wsPath() + "/patterns/" + p.id, p); } prmDraw(); return; }
  if (a === "new"){ PRM.edit = {id: "", title: "", desc: "", body: "", cat: PRM_SETCATS.includes(PRM.cat) ? PRM.cat : "", fav: PRM.cat === "fav"}; prmDraw(); setTimeout(() => { const f = document.getElementById("prm-e-title"); if (f) f.focus(); }, 20); return; }
  if (a === "edit" && x && x.own){ const p = arr(WS.patterns).find(z => z.id === id); PRM.edit = {id, title: str(p.title), desc: str(p.desc), body: str(p.body), cat: PRM_SETCATS.includes(p.cat) ? p.cat : "", fav: !!p.fav}; prmDraw(); return; }
  if (a === "save"){ prmSave(); prmDraw(); return; }
  if (a === "del"){ prmSoftDelete(id); PRM.edit = null; PRM.msg = t("prm.deleted.msg"); prmDraw(); return; }
  if (a === "mine" && x){ const c = prmStarterCopy(id); if (c){ PRM.msg = t("prm.mine.done"); PRM.expanded = c.id; } prmDraw(); return; }
  if (a === "lib"){ prmClose(); UI.libTab = "patterns"; UI.prmLibCat = "deleted"; go("library"); return; }
}
/* Esc closes only the list (capture phase: the popup behind never hears it) */
window.addEventListener("keydown", e => { if (!PRM.open || e.key !== "Escape" || e.isComposing) return; e.preventDefault(); e.stopImmediatePropagation(); prmClose(); }, true);

/* ---------- Library › Prompts: categories, list, editor (explicit Save), Deleted ---------- */
function prmLibHTML(){
  const all = prmAll(), cat = UI.prmLibCat || prmOpenOn(), del = prmDeleted();
  const cats = ["all", ...PRM_CATS].map(c => `<button type="button" class="nav-btn ${cat === c ? "on" : ""}" data-a="prm-libcat" data-v="${c}">${esc(c === "all" ? t("prm.cat.all") : t("prm.cat." + c))}<span class="count">${c === "used" ? "" : prmCatCount(c, all)}</span></button>`).join("")
    + `<button type="button" class="nav-btn ${cat === "deleted" ? "on" : ""}" data-a="prm-libcat" data-v="deleted">${esc(t("prm.deleted.cat"))}<span class="count">${del.length}</span></button>`;
  let list;
  if (cat === "deleted"){
    list = del.length ? del.map(x => `<div class="item" data-prm-del="${esc(x.id)}"><div class="body"><span class="title">${esc(str(x.title))}</span><span class="small muted">${esc(t("prm.deleted.at", {d: fmtDay(x.deletedAt)}))}</span></div><div class="acts"><button class="btn xs" data-a="prm-restore" data-id="${esc(x.id)}">${ic("undo")} ${esc(t("prm.restore"))}</button></div></div>`).join("")
      + `<div class="row"><button class="btn sm ghost danger" data-a="prm-empty">${ic("trash")} ${esc(t("prm.empty.bin"))}</button><span class="small muted">${esc(t("prm.empty.sub"))}</span></div>` : `<p class="small muted">${esc(t("prm.deleted.none"))}</p>`;
  } else {
    const L2 = prmSorted(all.filter(x => prmIn(x, cat)));
    list = L2.length ? L2.map(x => `<div class="item prm-lrow" data-prm-lib="${esc(x.id)}"><div class="body"><span class="title">${x.fav ? ic("star") + " " : ""}${esc(x.title || t("prm.untitled"))}</span><span class="small muted">${esc(x.desc)}</span>
        <span class="row" style="gap:4px">${x.cat && x.cat !== "starter" ? `<span class="chip">${esc(t("prm.cat." + x.cat))}</span>` : ""}${x.cat === "starter" ? `<span class="chip">${esc(t("prm.starter.en"))}</span>` : ""}${x.outside ? `<span class="chip warn">${esc(t("prm.outside"))}</span>` : ""}</span></div>
        <div class="acts">${btn("pat-copy", t("btn.copy"), {icon: "copy", cls: "xs", attrs: `data-id="${esc(x.id)}" data-own="${x.own ? 1 : 0}"`})}${btn("pat-insert", t("lib.insert"), {icon: "plus", cls: "xs", attrs: `data-id="${esc(x.id)}" data-own="${x.own ? 1 : 0}"`})}${btn("pat-skill", t("lib.mkskill"), {cls: "xs ghost", attrs: `data-id="${esc(x.id)}" data-own="${x.own ? 1 : 0}"`})}
          ${x.own ? `<button class="btn xs ghost" data-a="prm-libedit" data-id="${esc(x.id)}">${ic("edit")} ${esc(t("btn.edit"))}</button>` : `<button class="btn xs ghost" data-a="prm-libmine" data-id="${esc(x.id)}">${ic("plus")} ${esc(t("prm.mine"))}</button>`}</div></div>`).join("") : `<p class="small muted">${esc(all.length ? t("prm.none") : t("prm.empty"))}</p>`;
  }
  const E = UI.prmLibEdit;
  const ed = E ? `<section class="panel prm-libed stack" data-anchor="prm-libed"><h3>${esc(E.id ? t("prm.edit.t") : t("prm.new"))}</h3>
      <label class="fld"><span>${esc(t("prm.e.title"))}</span><input type="text" id="prm-le-title" value="${esc(E.title)}"></label>
      <label class="fld"><span>${esc(t("prm.e.desc"))}</span><input type="text" id="prm-le-desc" value="${esc(E.desc)}"></label>
      <div class="row"><label class="fld"><span>${esc(t("prm.e.cat"))}</span><select id="prm-le-cat"><option value="">${esc(t("prm.cat.none"))}</option>${PRM_SETCATS.map(c => `<option value="${c}" ${E.cat === c ? "selected" : ""}>${esc(t("prm.cat." + c))}</option>`).join("")}</select></label><label class="chk"><input type="checkbox" id="prm-le-fav" ${E.fav ? "checked" : ""}> ${esc(t("prm.fav"))}</label></div>
      <label class="fld"><span>${esc(t("prm.e.body"))}</span><textarea id="prm-le-body" rows="10">${esc(E.body)}</textarea><span class="small muted">${esc(t("prm.e.blankhint", {n: PRM_MAX_BLANKS}))}</span></label>
      ${E.err ? `<p class="small crit-t" role="alert">${esc(E.err)}</p>` : ""}
      <div class="row"><button class="btn primary" data-a="prm-libsave">${ic("check")} ${esc(t("btn.save"))}</button><button class="btn ghost" data-a="prm-libcancel">${esc(t("btn.cancel"))}</button>${E.id ? `<button class="btn ghost danger" data-a="prm-libdel" data-id="${esc(E.id)}">${ic("trash")} ${esc(t("prm.del"))}</button>` : ""}</div></section>` : "";
  return `<div class="prm-lib"><nav class="prm-libcats" aria-label="${esc(t("prm.cats"))}">${cats}</nav><div class="stack prm-liblist"><div class="row"><button class="btn sm" data-a="prm-libnew">${ic("plus")} ${esc(t("prm.new"))}</button><span class="hint">${esc(t("prm.lib.hint"))}</span></div><div class="list">${list}</div></div>${ed}</div>`;
}
{ const orig = viewLibrary; viewLibrary = function(){
    const h = orig.apply(this, arguments); if (UI.libTab !== "patterns") return h;
    const i = h.indexOf('<div class="tabs"'); if (i < 0) return h;
    const j = h.indexOf("</div>", i); return j > 0 ? h.slice(0, j + 6) + prmLibHTML() : h; }; }   // the tabs hold only buttons; the patterns body after them is replaced
Object.assign(ACTIONS, {
  "prm-libcat": el => { UI.prmLibCat = el.dataset.v; render(); },
  "prm-libnew": () => { UI.prmLibEdit = {id: "", title: "", desc: "", body: "", cat: PRM_SETCATS.includes(UI.prmLibCat) ? UI.prmLibCat : "", fav: UI.prmLibCat === "fav"}; render(); focusSoon("prm-le-title"); },
  "prm-libedit": el => { const p = arr(WS.patterns).find(z => z.id === el.dataset.id); if (!p) return; UI.prmLibEdit = {id: p.id, title: str(p.title), desc: str(p.desc), body: str(p.body), cat: PRM_SETCATS.includes(p.cat) ? p.cat : "", fav: !!p.fav}; render(); focusSoon("prm-le-title"); },
  "prm-libcancel": () => { UI.prmLibEdit = null; render(); },
  "prm-libsave": () => { const E = UI.prmLibEdit; if (!E) return; const v = id => ($("#" + id) || {}).value;   // ok:raw (fixed editor field ids)
    Object.assign(E, {title: str(v("prm-le-title")), desc: str(v("prm-le-desc")), body: str(v("prm-le-body")), cat: str(v("prm-le-cat")), fav: !!($("#prm-le-fav") || {}).checked});
    if (!E.title.trim() || !E.body.trim()){ E.err = t("prm.e.need"); render(); return; }
    if (prmHasKey(E.body + " " + E.title + " " + E.desc)){ E.err = t("prm.e.key"); render(); return; }
    if (prmBlanks(E.body).length > PRM_MAX_BLANKS){ E.err = t("prm.e.toomany", {n: PRM_MAX_BLANKS}); render(); return; }
    PRM.edit = Object.assign({}, E); prmSave(); UI.prmLibEdit = null; render(); toast(t("prm.saved"), "ok"); },
  "prm-libdel": el => { prmSoftDelete(el.dataset.id); UI.prmLibEdit = null; render(); toast(t("prm.deleted.msg"), ""); },
  "prm-libmine": el => { const c = prmStarterCopy(el.dataset.id); if (c){ UI.prmLibEdit = {id: c.id, title: c.title, desc: c.desc, body: c.body, cat: "", fav: false}; render(); toast(t("prm.mine.done"), "ok"); } },
  "prm-restore": el => { prmRestore(el.dataset.id); render(); toast(t("prm.restored"), "ok"); },
  "prm-empty": () => confirmBox(t("prm.empty.bin"), t("prm.empty.confirm", {n: prmDeleted().length}), t("prm.empty.yes"), () => { for (const x of prmDeleted()) Store.del(wsPath() + "/patterns/" + x.id); WS.patterns = arr(WS.patterns).filter(x => !x.deletedAt); }),
  /* the old permanent delete goes into Deleted too */
  "pat-del": el => { prmSoftDelete(el.dataset.id); render(); toast(t("prm.deleted.msg"), ""); }
});
Object.assign(CHANGES, {
  "prm-set": el => { const k = el.dataset.k; if (!["prmBtn", "prmOpen", "prmOrder", "prmStarters"].includes(k)) return; const v = el.type === "checkbox" ? el.checked : el.value; WS.settings[k] = v; saveWs(); render(); },
  "prm-autosend": el => { prmLSset("pt.prm.autosend", el.checked ? "1" : null); render(); }
});
/* imported prompts are marked as from outside (Received when no category came with them) and unopened */
{ const orig = importBackup; importBackup = function(d, fname){ const before = new Set(arr(WS.patterns).map(x => x.id)); const r = orig.apply(this, arguments); for (const x of arr(WS.patterns)) if (!before.has(x.id)){ x.src = "import"; x.opened = false; if (!PRM_SETCATS.includes(str(x.cat))) x.cat = ""; if (typeof x.fav !== "boolean") x.fav = false; Store.put(wsPath() + "/patterns/" + x.id, x); } return r; }; }

/* ---------- Settings › General › Prompts ---------- */
function prmSettingsHTML(){
  const sel = (k, v, opts) => `<select data-a-change="prm-set" data-k="${k}">${opts.map(o => `<option value="${o[0]}" ${String(v) === o[0] ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;   // ok:raw (fixed setting keys and values)
  return `<section class="panel stack prm-settings" data-anchor="prm-settings"><h3>${ic("book")} ${esc(t("prm.set.t"))}</h3>
    <label class="chk"><input type="checkbox" data-a-change="prm-set" data-k="prmBtn" ${prmBtnOn() ? "checked" : ""}> ${esc(t("prm.set.btn"))}</label>
    <div class="grid3"><label class="fld"><span>${esc(t("prm.set.open"))}</span>${sel("prmOpen", prmOpenOn(), [["used", t("prm.cat.used")], ["fav", t("prm.cat.fav")], ["all", t("prm.cat.all")]])}</label>
      <label class="fld"><span>${esc(t("prm.set.order"))}</span>${sel("prmOrder", prmOrder(), [["used", t("prm.set.order.used")], ["az", t("prm.set.order.az")]])}</label></div>
    <label class="chk"><input type="checkbox" data-a-change="prm-set" data-k="prmStarters" ${prmStarters() ? "checked" : ""}> ${esc(t("prm.set.starters"))}</label>
    <label class="chk"><input type="checkbox" data-a-change="prm-autosend" ${prmAutoSend() ? "checked" : ""}> ${esc(t("prm.set.auto"))}</label>
    <p class="small muted">${esc(t("prm.set.device"))}</p></section>`;
}
{ const orig = viewSettings; viewSettings = function(){ const h = orig.apply(this, arguments); return UI.setTab === "general" ? h + prmSettingsHTML() : h; }; }
for (const k of ["prmBtn", "prmOpen", "prmOrder", "prmStarters"]) if (!IMPORT_SETTINGS.includes(k)) IMPORT_SETTINGS.push(k);
