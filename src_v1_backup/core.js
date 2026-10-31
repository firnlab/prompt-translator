/* ===================== CORE ===================== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const uid = (p="x") => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const now = () => new Date().toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function trunc(s, n){ s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function arr(x){ return Array.isArray(x) ? x : []; }
function str(x){ return typeof x === "string" ? x : (x == null ? "" : String(x)); }
function num(x, d=0){ const n = Number(x); return Number.isFinite(n) ? n : d; }
function debounce(fn, ms){ let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
async function sha256(s){ try{ const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""); }catch(e){ let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))|0; return "h"+h; } }

/* ---------- i18n ---------- */
const LANGS = [{id:"en",label:"English"},{id:"de",label:"Deutsch"},{id:"zh",label:"繁體中文"}];
let LANG = "en";
function t(key, vars){
  const row = STR[key];
  let s = row ? (row[LANG === "en" ? 0 : LANG === "de" ? 1 : 2] || row[0]) : key;
  if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
  return s;
}
function L(o){ if (!o) return ""; return o[LANG] || o.en || ""; }
function langName(l){
  return l === "de" ? "German as written in Switzerland (always 'ss', never 'ß'; natural Swiss usage such as 'lancieren', 'allfällig')"
       : l === "zh" ? "Traditional Chinese as used in Taiwan (繁體中文，臺灣用語，例如：專案、程式、資料、使用者、設定)"
       : "English";
}
function fmtDate(iso){
  if (!iso) return "";
  try{ const loc = LANG === "de" ? "de-CH" : LANG === "zh" ? "zh-TW" : "en-GB";
    return new Date(iso).toLocaleString(loc, {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }catch(e){ return iso.slice(0,16); }
}
function fmtDay(iso){
  if (!iso) return "";
  try{ const loc = LANG === "de" ? "de-CH" : LANG === "zh" ? "zh-TW" : "en-GB";
    return new Date(iso).toLocaleDateString(loc, {day:"2-digit",month:"short",year:"numeric"}); }catch(e){ return iso.slice(0,10); }
}

/* ---------- Storage ---------- */
const Store = {
  mode: "local", db: null, uid: "local", queue: new Map(), busy: new Set(), mem: new Map(), status: "idle",
  async init(){
    try{
      if (window.claude && typeof window.claude.use === "function"){
        const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
        if (db && user){
          const id = await user.id();
          if (id){ this.db = db; this.uid = id; this.mode = "cloud"; }
        }
      }
    }catch(e){ console.warn("db init", e); }
    return this.mode;
  },
  root(){ return "data/users/" + this.uid; },
  lsGet(k){ try{ const v = localStorage.getItem("pt:" + k); return v ? JSON.parse(v) : null; }catch(e){ return this.mem.has(k) ? clone(this.mem.get(k)) : null; } },
  lsSet(k, v){ try{ localStorage.setItem("pt:" + k, JSON.stringify(v)); }catch(e){ this.mem.set(k, clone(v)); } },
  lsDel(k){ try{ localStorage.removeItem("pt:" + k); }catch(e){ this.mem.delete(k); } },
  async get(path){
    if (this.mode === "cloud"){
      try{ const s = await this.db.doc(path).get(); return s.exists ? clone(s.data()) : null; }
      catch(e){ console.warn("get", path, e); throw e; }
    }
    return this.lsGet("d:" + path);
  },
  async list(coll){
    if (this.mode === "cloud"){
      const s = await this.db.collection(coll).limit(1000).get();
      return s.docs.map(d => Object.assign({id: d.id}, clone(d.data())));
    }
    const idx = this.lsGet("i:" + coll) || [];
    return idx.map(id => { const d = this.lsGet("d:" + coll + "/" + id); return d ? Object.assign({id}, d) : null; }).filter(Boolean);
  },
  /* coalescing, one-write-at-a-time per document */
  put(path, data){
    this.queue.set(path, clone(data));
    this.flushPath(path);
  },
  async flushPath(path){
    if (this.busy.has(path)) return;
    while (this.queue.has(path)){
      const data = this.queue.get(path); this.queue.delete(path);
      this.busy.add(path); setSave("saving");
      try{
        if (this.mode === "cloud"){ await this.db.doc(path).set(data); }
        else {
          this.lsSet("d:" + path, data);
          const coll = path.split("/").slice(0, -1).join("/"), id = path.split("/").pop();
          const idx = this.lsGet("i:" + coll) || []; if (!idx.includes(id)){ idx.push(id); this.lsSet("i:" + coll, idx); }
        }
        setSave("saved");
      }catch(e){
        console.warn("save failed", path, e);
        this.lsSet("backup:" + path, data);
        setSave("error", e && e.code);
      }finally{ this.busy.delete(path); }
    }
  },
  async del(path){
    this.queue.delete(path);
    if (this.mode === "cloud"){ try{ await this.db.doc(path).delete(); }catch(e){ toast(t("err.save"), "err"); } return; }
    this.lsDel("d:" + path);
    const coll = path.split("/").slice(0, -1).join("/"), id = path.split("/").pop();
    const idx = (this.lsGet("i:" + coll) || []).filter(x => x !== id); this.lsSet("i:" + coll, idx);
  },
  pending(){ return this.queue.size + this.busy.size; }
};
let saveState = "idle";
function setSave(s, code){
  saveState = s;
  const el = document.getElementById("savestate");
  if (el){ el.textContent = s === "saving" ? t("save.saving") : s === "error" ? t("save.error") : s === "saved" ? (Store.mode === "cloud" ? t("save.saved") : t("save.local")) : ""; el.className = "small " + (s === "error" ? "chip crit" : "muted"); }
  if (s === "error" && code === "quota_exceeded") toast(t("err.quota"), "err");
}

/* ---------- Toasts ---------- */
function toast(msg, kind=""){
  let host = $("#toasts"); if (!host){ host = document.createElement("div"); host.id = "toasts"; host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div"); el.className = "toast " + kind; el.setAttribute("role","status"); el.textContent = msg;
  host.appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 7000 : 3500);
}
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); toast(t("toast.copied"), "ok"); return true; }
  catch(e){
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    let ok = false; try{ ok = document.execCommand("copy"); }catch(_){}
    ta.remove(); toast(ok ? t("toast.copied") : t("toast.copyfail"), ok ? "ok" : "err"); return ok;
  }
}
let downloadsApi;
async function saveFile(filename, data){
  try{
    if (downloadsApi === undefined) downloadsApi = (window.claude && window.claude.use) ? await window.claude.use("downloads") : null;
    if (!downloadsApi){ toast(t("err.nodownload"), "err"); return false; }
    await downloadsApi.save({filename, data}); toast(t("toast.saved", {f: filename}), "ok"); return true;
  }catch(e){ if (e && e.code !== "cancelled" && e.code !== "declined") toast(t("err.download"), "err"); return false; }
}

/* ---------- AI engine ---------- */
let sampleApi;
const AI = { running: new Map() }; // key -> {ctl, text, label}
async function getSample(){
  if (sampleApi === undefined){ try{ sampleApi = (window.claude && window.claude.use) ? await window.claude.use("sample") : null; }catch(e){ sampleApi = null; } }
  return sampleApi;
}
function modelFor(step){
  const s = WS.settings || {};
  const o = (s.stepModel || {})[step] || {};
  return { tier: o.tier || s.tier || "complex", model: o.model !== undefined ? o.model : (s.model || ""), effort: o.effort || s.effort || "" };
}
const AI_ERR = {
  not_granted:"ai.err.notgranted", sampling_disabled:"ai.err.disabled", not_declared:"ai.err.disabled", capability_disabled:"ai.err.disabled", capability_removed:"ai.err.disabled",
  rate_limited:"ai.err.rate", session_expired:"ai.err.session", refused:"ai.err.refused", empty_completion:"ai.err.empty", invalid_json:"ai.err.json",
  prompt_too_large:"ai.err.large", upstream_error:"ai.err.upstream", cancelled:"ai.err.cancelled", image_rejected:"ai.err.image"
};
/** run an AI call bound to a UI key. json=true returns parsed value. */
async function runAI(key, label, prompt, {json=true, step="default", images=null, quick=false} = {}){
  const sample = await getSample();
  if (!sample){ toast(t("ai.err.unavailable"), "err"); return null; }
  if (AI.running.has(key)) return null;
  const ctl = new AbortController();
  const job = {ctl, text:"", label, started: Date.now()};
  AI.running.set(key, job); renderBusy(key);
  const m = quick ? {tier:"quick", model:"", effort:""} : modelFor(step);
  const opts = { signal: ctl.signal, onText: ({text}) => { job.text = text; updateStream(key, text); } };
  if (m.tier) opts.modelTier = m.tier;
  if (m.model) opts.model = m.model;
  if (m.effort) opts.effort = m.effort;
  if (images && images.length) opts.images = images;
  try{
    let out;
    if (json){ out = await sample.json(prompt, opts); }
    else { const r = await sample(prompt, opts); out = r.text; if (r.truncated) toast(t("ai.truncated"), "err"); }
    return out;
  }catch(e){
    const code = e && e.code || "upstream_error";
    if (code !== "cancelled") toast(t(AI_ERR[code] || "ai.err.upstream"), "err");
    return null;
  }finally{
    AI.running.delete(key); render();
  }
}
function stopAI(key){ const j = AI.running.get(key); if (j) j.ctl.abort(); }
function busyHTML(key){
  const j = AI.running.get(key); if (!j) return "";
  return `<div class="busy" data-busy="${esc(key)}" role="status"><span class="pulse"></span><div class="stack" style="flex:1;gap:4px"><b>${esc(j.label)}</b><div class="stream" data-stream="${esc(key)}">${j.text ? esc(trunc(j.text, 1600)) : esc(t("ai.thinking"))}</div></div><button class="btn sm" data-a="ai-stop" data-key="${esc(key)}">${t("btn.stop")}</button></div>`;
}
function renderBusy(){ render(); }
function updateStream(key, text){ const el = document.querySelector(`[data-stream="${CSS.escape(key)}"]`); if (el){ el.textContent = trunc(text, 1600); el.scrollTop = el.scrollHeight; } }

/* ---------- Prompt assembly ---------- */
function kpText(ids){ return KP_RULES.filter(r => !ids || ids.includes(r.id) || ids.includes(r.cat)).map(r => "- " + r.ai).join("\n"); }
function projectContext(p, {full=false, max=48000} = {}){
  if (!p) return "";
  const parts = [];
  const ns = p.northStar || {};
  parts.push("<north_star>\nProblem: " + str(ns.problem) + "\nGoal: " + str(ns.goal) + "\nSuccess measure: " + str(ns.success) + "\nUsers: " + str(ns.users) + "\nConstraints: " + str(ns.constraints) + "\nCurrent state: " + str(ns.now) + "\n</north_star>");
  if (p.intake && p.intake.raw) parts.push("<raw_idea>\n" + trunc(p.intake.raw, full ? 8000 : 3000) + "\n</raw_idea>");
  if (p.intake && p.intake.clean) parts.push("<clarified_idea>\n" + trunc(p.intake.clean, 4000) + "\n</clarified_idea>");
  const und = p.understand || {};
  const u = [];
  if (arr(und.whys).length) u.push("5 whys: " + und.whys.map(w => w.a ? w.q + " → " + w.a : w.q).join(" | "));
  if (und.jtbd) u.push("Job to be done: " + und.jtbd);
  if (arr(und.reframes).filter(r => r.chosen).length) u.push("Chosen reframe: " + und.reframes.filter(r => r.chosen).map(r => r.text).join("; "));
  if (und.walkthrough) u.push("Day-in-the-life: " + trunc(und.walkthrough, 2500));
  if (u.length) parts.push("<understanding>\n" + u.join("\n") + "\n</understanding>");
  const dims = DIMS.map(d => { const s = (p.dims || {})[d.id] || {}; return "- " + d.id + " [" + (s.status || "unknown") + "]: " + str(s.summary); }).join("\n");
  parts.push("<dimensions>\n" + dims + "\n</dimensions>");
  const qa = arr(p.qa).filter(q => q.answer).slice(-40).map(q => "Q (" + q.dim + "): " + q.q + "\nA: " + trunc(q.answer, 600)).join("\n");
  if (qa) parts.push("<interview_answers>\n" + qa + "\n</interview_answers>");
  if (arr(p.assumptions).length) parts.push("<assumptions>\n" + p.assumptions.map(a => "- [" + a.id + "] (" + a.category + ", impact " + a.impact + ", risk " + a.risk + ", " + a.status + ") " + a.text).join("\n") + "\n</assumptions>");
  if (arr(p.risks).length) parts.push("<risks>\n" + p.risks.map(r => "- [" + r.id + "] " + r.text + " | mitigation: " + str(r.mitigation) + " | " + r.status).join("\n") + "\n</risks>");
  if (arr(p.requirements).length) parts.push("<requirements>\n" + p.requirements.map(r => "- [" + r.id + "] (" + r.priority + ") GIVEN " + r.given + " WHEN " + r.when + " THEN " + r.then).join("\n") + "\n</requirements>");
  if (arr(p.outOfScope).length) parts.push("<out_of_scope>\n- " + p.outOfScope.join("\n- ") + "\n</out_of_scope>");
  if (arr(p.constitution).length) parts.push("<constitution>\n- " + p.constitution.join("\n- ") + "\n</constitution>");
  const a = p.arch || {};
  if (a.chosen || a.recommended){
    const opt = arr(a.options).find(o => o.id === (a.chosen || a.recommended));
    parts.push("<architecture>\nChosen: " + (opt ? opt.name + " (" + opt.kind + "): " + opt.summary : str(a.chosen)) +
      "\nComponents:\n" + arr(a.components).map(c => "- " + c.name + " [" + c.kind + "] " + c.role + " | in: " + str(c.inputs) + " | out: " + str(c.outputs)).join("\n") +
      (arr(a.humanSteps).length ? "\nHuman steps: " + a.humanSteps.join("; ") : "") +
      (arr(a.dataPlan).length ? "\nData plan: " + a.dataPlan.map(d => d.source + " (" + d.freshness + ", " + d.legal + ")").join("; ") : "") + "\n</architecture>");
  }
  const notes = (WS.notes || []).filter(n => n.projectId === p.id && !n.noAI && !n.deletedAt).slice(-25);
  if (notes.length) parts.push("<user_notes>\n" + notes.map(n => "- " + (n.type ? "[" + n.type + "] " : "") + trunc(n.text, 400) + (n.anchor ? " (about: " + n.anchor.label + ")" : "")).join("\n") + "\n</user_notes>");
  const research = (WS.research || []).filter(r => r.projectId === p.id).slice(-8);
  if (research.length) parts.push("<research_findings>\n" + research.map(r => "- " + r.topic + " (" + (r.at || "").slice(0,10) + "): " + trunc(r.summary || "", 900)).join("\n") + "\n</research_findings>");
  if (WS.profile && arr(WS.profile.entries).length) parts.push("<user_profile>\n- " + WS.profile.entries.map(e => e.text).join("\n- ") + "\n</user_profile>");
  let s = parts.join("\n\n");
  if (s.length > max) s = s.slice(0, max) + "\n[context truncated]";
  return s;
}
function buildPrompt(task, {role, rules, platform=false, context="", body, schema, userLang=true}){
  return `[[task:${task}]]
${role || "You are the engine inside Prompt Translator, a professional tool that turns a person's ideas into complete, tested Claude Project setups. You think and act like a senior IT project lead, solutions architect and prompt engineer working for this one person. You are direct, concrete and honest about uncertainty, and you keep the person's North Star goal in view at every step."}

<best_practices researched="${KP_VERSION}">
${kpText(rules)}
</best_practices>
${platform ? "\n<platform>\n" + PLATFORM_PROFILE + "\n</platform>\n" : ""}
${context ? "<project>\n" + context + "\n</project>\n" : ""}
<task>
${body}
</task>

<language>
${userLang ? "Write every human-readable text value in " + langName(LANG) + ". Keep JSON keys, ids and enum values in English exactly as specified." : ""}
</language>

<output_format>
Reply with only one JSON value, no prose before or after.
${schema}
</output_format>`;
}
