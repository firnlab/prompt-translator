/* ===================== 1.10 PT's hands: the Claude desktop app's built-in browser (the owner's GO, 3 Nov 2026: "to the highest ceiling") =====================
   Verified first (3 Nov 2026, the separate page "PT Hands Probe" in the owner's desktop app, 7 of 7 steps): a page that declares the host
   server host:claude_browser opens a site in the app's browser (preview_start answers "… (tabId seed) …"), reads it (get_page_text),
   finds an element (find answers lines with ref_N), scrolls to it (computer scroll_to) and goes to another page (navigate). GitHub showed
   the owner's own login there (the Edit and Delete buttons of a release), so whatever the browser does, it does as the owner.
   What PT does with it (owner's login only; the platform allows host servers only for the artifact's owner):
   1. Checks on the owner's click (Health › "PT's hands"): the open pull requests of prompt-translator, the GitHub release of this
      version, the end dates of the fine-grained keys. PT opens the page, reads it and shows what it found, with the time it looked.
   2. "Take me there" next to the links of a click-by-click card (the yearly key renewal) and next to each open pull request: PT opens the
      page and moves the pointer onto the spot the next step names. The last click is always the owner's.
   The guard (handsCall is the only way to the browser): github.com addresses only; only the tools preview_start, navigate,
   get_page_text, find and computer; computer only scroll_to, hover and wait (no click, no typing, no key press, so PT cannot press a
   final button such as merge, delete or save, nor fill in a form); an answer that holds something shaped like a key (github_pat_…,
   ghp_…, sk-ant-…) is dropped at once and the step stops: PT never keeps or shows it. Nothing is stored: the findings live on this
   page until it is closed. Outside the desktop app every call fails (server_not_connected) → one line: open PT in the desktop app. */
const HANDS_SERVER = "host:claude_browser";
const HANDS_TOOLS = ["preview_start", "navigate", "get_page_text", "find", "computer"];
const HANDS_MOVES = ["scroll_to", "hover", "wait"];
const HANDS_SECRET = /github_pat_[A-Za-z0-9_]{20,}|\bgh[pousr]_[A-Za-z0-9]{30,}|sk-ant-[A-Za-z0-9_-]{16,}/;
const HANDS_REPO = "firnlab/prompt-translator";
const HANDS_READS = 4, HANDS_WAIT_S = 2, HANDS_SOON_DAYS = 30;
const HANDS = {mcp: undefined, tab: null, busy: "", res: {}};

/* ---------- 0. the guard: the only way to the app's browser ---------- */
function handsOk(){ return !!(Store && Store.isOwner); }
function handsUrlOk(u){ try{ const x = new URL(str(u)); return x.protocol === "https:" && x.hostname === "github.com"; }catch(e){ return false; } }   // ok:catch not an address → refused
function handsText(p){
  if (p == null) return "";
  if (typeof p === "string") return p;
  if (Array.isArray(p.content)) return p.content.map(c => (c && typeof c.text === "string") ? c.text : "").join("\n");
  try{ return JSON.stringify(p); }catch(e){ return ""; }   // ok:catch an answer that cannot be written as text reads as empty
}
async function handsApi(){
  if (HANDS.mcp === undefined){ try{ HANDS.mcp = (window.claude && window.claude.use) ? await window.claude.use("mcp") : null; }catch(e){ HANDS.mcp = null; } }   // ok:catch no connections in this view → the "desktop app" line
  return HANDS.mcp;
}
/** one call to the app's browser, through the guard; answers the text of the reply (never kept when it holds a key) */
async function handsCall(tool, input){
  const a = Object.assign({}, input || {});
  if (!handsOk()) throw {code: "hands_owner"};
  if (!HANDS_TOOLS.includes(tool)) throw {code: "hands_guard", message: tool};
  if (tool === "computer" && !HANDS_MOVES.includes(str(a.action))) throw {code: "hands_guard", message: "computer " + str(a.action)};
  if ((tool === "preview_start" || tool === "navigate") && !handsUrlOk(a.url)) throw {code: "hands_guard", message: "address"};
  const m = await handsApi(); if (!m) throw {code: "capability_disabled"};
  const r = await m.callTool(HANDS_SERVER, tool, a);
  const txt = handsText(r && r.payload !== undefined ? r.payload : r);
  if (HANDS_SECRET.test(txt)) throw {code: "hands_secret"};
  return txt;
}
function handsTab(){ return HANDS.tab ? {tabId: HANDS.tab} : {}; }
/** open an address: in PT's tab when there is one, else a new tab of the app's browser */
async function handsOpen(url){
  if (HANDS.tab){
    try{ await handsCall("navigate", Object.assign({url}, handsTab())); return; }
    catch(e){ if (e && ["hands_guard", "hands_secret", "hands_owner", "cancelled", "server_not_connected", "capability_disabled", "not_granted", "not_in_manifest", "approval_required"].includes(e.code)) throw e; HANDS.tab = null; }   // the tab was closed: a new one
  }
  const txt = await handsCall("preview_start", {url});
  const m = /tab[_ ]?id["'\s:=(]+([A-Za-z0-9_-]+)/i.exec(txt); HANDS.tab = m ? m[1] : null;
}
/** the page's text; GitHub fills its lists after the page opens, so PT reads again (at most HANDS_READS times, 2 s apart) until want matches */
async function handsRead(want){
  let txt = "";
  for (let i = 0; i < HANDS_READS; i++){
    if (i) await handsCall("computer", Object.assign({action: "wait", duration: HANDS_WAIT_S}, handsTab()));
    txt = await handsCall("get_page_text", Object.assign({max_chars: 30000}, handsTab()));
    if (!want || want.test(txt)) return txt;
  }
  return txt;
}
function handsSignin(txt){ return /Sign in to GitHub|Username or email address/i.test(str(txt)) && !/Sign out/i.test(str(txt)); }
/** the element to point at: a button or link whose name holds q first, else the first match */
function handsRef(txt){
  const L = str(txt).split("\n").filter(l => /\bref_\d+\b/.test(l));
  const best = L.find(l => /^\s*-?\s*(button|link)\b/i.test(l)) || L[0];
  return best ? best.match(/\bref_\d+\b/)[0] : "";
}
/** move the pointer onto q (scroll it into view, then hover); false when q is not on the page */
async function handsPoint(q){
  const ref = handsRef(await handsCall("find", Object.assign({query: q}, handsTab())));
  if (!ref) return false;
  await handsCall("computer", Object.assign({action: "scroll_to", ref}, handsTab()));
  try{ await handsCall("computer", Object.assign({action: "hover", ref}, handsTab())); }catch(e){ if (e && e.code === "hands_secret") throw e; }   // ok:catch scrolled there; a hover the page refuses changes nothing
  return true;
}
/** what the owner reads when the browser cannot be used (one line per cause, never one generic banner) */
function handsErr(e){
  const c = str(e && e.code);
  if (["server_not_connected", "capability_disabled", "not_granted", "capability_removed", "server_not_found"].includes(c)) return t("hands.e.app");
  if (["not_in_manifest", "approval_required", "cancelled", "consent_required"].includes(c)) return t("hands.e.allow");
  if (c === "hands_secret") return t("hands.e.secret");
  if (c === "hands_guard") return t("hands.e.guard");
  if (c === "hands_owner") return t("hands.e.owner");
  if (c === "hands_signin") return t("hands.e.signin");
  return t("hands.e.other", {x: c || "error"});
}

/* ---------- 1. the checks (Health › PT's hands) ---------- */
/** the open pull requests: a list line "#26…" follows the line with its title */
function handsParsePrs(txt){
  const L = str(txt).split("\n").map(s => s.trim()), out = [];
  for (let i = 0; i < L.length; i++){
    const m = /^#(\d+)\b/.exec(L[i]); if (!m || out.some(x => x.n === +m[1])) continue;
    /* the real list puts the labels (one word each, "dependencies", "pt") between the title and "#N": the title is the nearest line
       above with a space in it, before the previous "#N" line; a lone word only when nothing else is there (seen 3 Nov 2026) */
    let title = "", word = "";
    for (let j = i - 1; j >= Math.max(0, i - 6); j--){
      const x = L[j]; if (!x || /^[·•|]+$/.test(x) || /^\d+$/.test(x)) continue; if (/^#\d+\b/.test(x)) break;
      if (/\s/.test(x)){ title = x; break; } if (!word) word = x;
    }
    title = title || word;
    out.push({n: +m[1], title: title.slice(0, 160)});
  }
  return out;
}
/** the fine-grained keys: a line "Expires on …" / "Expired on …" / "No expiration" belongs to the nearest name above it */
const HANDS_KEY_SKIP = /^(Last used|Never used|Expire|No expiration|Owner|Resource owner|Generated|Created|Delete|Regenerate|Revoke|Edit|Fine-grained|Personal access tokens|Tokens? \(classic\)|Generate new token)/i;
function handsParseKeys(txt){
  const L = str(txt).split("\n").map(s => s.trim()).filter(Boolean), out = [];
  for (let i = 0; i < L.length; i++){
    /* the real page writes "Never used •Expires on Wed, Nov 3 2027" on one line (seen 3 Nov 2026): the date may follow a • or · */
    const m = /(?:^|[•·]\s*)(Expires|Expired)\s+(?:on\s+)?(.+)$/i.exec(L[i]), none = /(?:^|[•·]\s*)No expiration/i.test(L[i]);
    if (!m && !none) continue;
    let name = ""; for (let j = i - 1; j >= Math.max(0, i - 4); j--){ if (!HANDS_KEY_SKIP.test(L[j])){ name = L[j]; break; } }
    if (!name) continue;
    if (none){ out.push({name: name.slice(0, 80), kind: "never"}); continue; }
    const d = Date.parse(m[2].replace(/^[A-Za-z]{3},\s*/, "").replace(/\.$/, ""));
    out.push(isNaN(d) ? {name: name.slice(0, 80), kind: "raw", raw: L[i].slice(0, 80)} : {name: name.slice(0, 80), kind: /^Expired/i.test(m[1]) || d < Date.now() ? "past" : "date", at: new Date(d).toISOString()});
  }
  return out;
}
const HANDS_CHECKS = {
  async prs(){
    await handsOpen(`https://github.com/${HANDS_REPO}/pulls`);
    const txt = await handsRead(/#\d+|No results matched|no open pull requests|There aren’t any open pull requests/i);
    if (handsSignin(txt)) throw {code: "hands_signin"};
    return {list: handsParsePrs(txt)};
  },
  async rel(){
    const v = PT_VERSION;
    await handsOpen(`https://github.com/${HANDS_REPO}/releases/tag/v${v}`);
    const txt = await handsRead(new RegExp("Prompt Translator " + v.replace(/\./g, "\\.") + "\\b|Not Found|not the web page", "i"));
    if (handsSignin(txt)) throw {code: "hands_signin"};
    return {v, found: new RegExp("Prompt Translator " + v.replace(/\./g, "\\.") + "\\b").test(txt) && !/not the web page/i.test(txt)};
  },
  async keys(){
    await handsOpen("https://github.com/settings/personal-access-tokens");
    const txt = await handsRead(/Expire|No expiration|Generate new token/i);
    if (handsSignin(txt)) throw {code: "hands_signin"};
    return {list: handsParseKeys(txt)};
  }
};
async function handsCheck(k){
  if (HANDS.busy || !HANDS_CHECKS[k]) return;
  HANDS.busy = k; render();
  try{ HANDS.res[k] = Object.assign({at: now(), ok: true}, await HANDS_CHECKS[k]()); }
  catch(e){ HANDS.res[k] = {at: now(), ok: false, err: handsErr(e), code: str(e && e.code)}; if (!e || !e.code) onAppError(str(e && e.message), "hands:" + k); }   // a browser answer with a code is shown above; only a fault in PT itself is an error
  finally{ HANDS.busy = ""; render(); }
}
/** "Take me there": open the address and point at q; the click stays the owner's */
async function handsGo(url, q){
  if (HANDS.busy) return;
  HANDS.busy = "go"; render();
  try{
    await handsOpen(url); await handsRead(null);
    const hit = q ? await handsPoint(q) : false;
    toast(q ? t(hit ? "hands.go.ok" : "hands.go.open", {q}) : t("hands.go.opened"), hit || !q ? "" : "err");
  }catch(e){ toast(handsErr(e), "err"); }
  finally{ HANDS.busy = ""; render(); }
}

/* ---------- 2. what the owner sees ---------- */
function handsGoBtn(url, q, label){
  if (!handsOk() || !handsUrlOk(url)) return "";
  return `<button class="btn xs ghost hands-go" data-a="hands-go" data-url="${esc(url)}" data-q="${esc(q || "")}"${HANDS.busy ? " disabled" : ""}>${ic("arrow")}${esc(label || t("hands.go"))}</button>`;
}
function handsDays(iso){ return Math.ceil((Date.parse(iso) - Date.now()) / 864e5); }
function handsResHTML(k){
  const R = HANDS.res[k]; if (HANDS.busy === k) return `<p class="small muted hands-res" data-k="${k}" aria-live="polite">${esc(t("hands.busy"))}</p>`;
  if (!R) return "";
  const at = `<span class="muted"> · ${esc(t("hands.at", {t: fmtDate(R.at)}))}</span>`;
  if (!R.ok) return `<p class="small warn-t hands-res" data-k="${k}" aria-live="polite">${esc(R.err)}${at}</p>`;
  if (k === "prs"){
    if (!R.list.length) return `<p class="small hands-res" data-k="prs" aria-live="polite">${esc(t("hands.prs.none"))}${at}</p>`;
    return `<div class="hands-res small" data-k="prs" aria-live="polite"><p class="small">${esc(t("hands.prs.some", {n: R.list.length}))}${at}</p><ul class="hr18-list">${R.list.map(x =>
      `<li><span>#${x.n} ${esc(x.title)}</span> ${handsGoBtn(`https://github.com/${HANDS_REPO}/pull/${x.n}`, "Merge pull request", t("hands.prs.go"))}</li>`).join("")}</ul></div>`;
  }
  if (k === "rel") return `<p class="small hands-res${R.found ? "" : " warn-t"}" data-k="rel" aria-live="polite">${esc(t(R.found ? "hands.rel.ok" : "hands.rel.no", {v: R.v}))}${at}</p>`;
  if (k === "keys"){
    if (!R.list.length) return `<p class="small hands-res" data-k="keys" aria-live="polite">${esc(t("hands.keys.none"))}${at}</p>`;
    const line = x => x.kind === "never" ? t("hands.keys.never", {name: x.name}) : x.kind === "raw" ? t("hands.keys.raw", {name: x.name, x: x.raw}) : x.kind === "past" ? t("hands.keys.past", {name: x.name, d: fmtDay(x.at)}) : t("hands.keys.line", {name: x.name, d: fmtDay(x.at), n: handsDays(x.at)});
    const soon = x => x.kind === "past" || (x.kind === "date" && handsDays(x.at) <= HANDS_SOON_DAYS);
    return `<div class="hands-res small" data-k="keys" aria-live="polite"><p class="small">${esc(t("hands.keys.some"))}${at}</p><ul class="hr18-list">${R.list.map(x => `<li${soon(x) ? ' class="warn-t"' : ""}>${esc(line(x))}${soon(x) ? " · " + esc(t("hands.keys.soon")) : ""}</li>`).join("")}</ul></div>`;
  }
  return "";
}
function handsHTML(){
  if (!handsOk()) return "";
  const b = (k, icn) => `<button class="btn sm" data-a="hands-check" data-k="${k}"${HANDS.busy ? " disabled" : ""}>${ic(icn)}${esc(t("hands.c." + k))}</button>`;
  return `<div class="stack hands" data-hands="1"><h4>${esc(t("hands.t"))}</h4><p class="small">${esc(t("hands.sub"))}</p><p class="small muted">${esc(t("hands.where"))}</p>
    <div class="row">${b("prs", "search")}${b("rel", "check")}${b("keys", "shield")}</div>${["prs", "rel", "keys"].map(handsResHTML).join("")}</div>`;
}
{ const orig = hr18HTML; hr18HTML = function(){ const h = orig.apply(this, arguments); let mine = ""; try{ mine = handsHTML(); }catch(e){ onAppError(e && e.message, "hands:health"); } return mine ? h.replace(/<\/div>\s*$/, m => mine + m) : h; }; }
/* the key renewal card: "Take me there" next to each link, pointing at the line the step names */
const HANDS_KEY_SPOTS = {a: {env: "build", tact: "CLAUDE_CODE_OAUTH_TOKEN"}, b: {pat: "pt-private", act: "PT_PRIVATE_TOKEN", tact: "PT_PRIVATE_TOKEN"}};
{ const orig = care19KeysHTML; care19KeysHTML = function(){
    const h = orig.apply(this, arguments); if (!handsOk()) return h;
    try{
      let part = 0;
      return h.replace(/<div class="row">([\s\S]*?)<\/div>/g, (whole, inner) => {
        const spots = HANDS_KEY_SPOTS[part++ === 0 ? "a" : "b"];
        return `<div class="row">` + inner.replace(/<a class="chip tap" href="([^"]+)"[\s\S]*?<\/a>/g, (a, href) => {
          const k = Object.keys(CARE19_LINKS).concat("tact").find(x => esc(care19Link(x)) === href);
          return a + (k && spots[k] ? handsGoBtn(care19Link(k), spots[k]) : "");
        }) + `</div>`;
      });
    }catch(e){ onAppError(e && e.message, "hands:keys"); return h; }
  }; }

Object.assign(ACTIONS, {
  "hands-check": (el) => handsCheck(el && el.dataset ? str(el.dataset.k) : ""),
  "hands-go": (el) => { const u = el && el.dataset ? str(el.dataset.url) : ""; return handsUrlOk(u) ? handsGo(u, str(el.dataset.q)) : undefined; }
});
