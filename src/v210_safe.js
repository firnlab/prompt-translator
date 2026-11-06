/* 2.1 A1 / A14 / B17 — one safety layer for values that come from outside (an imported backup, AI output, a scan):
   1. safe ids: every item id in a project, note, pattern or research entry is plain letters, digits, "_" or "-" (max 64).
      Anything else ("." "/" "#" quotes, markup) gets a fresh id, so it can never become a storage path, a selector
      or a data-bind path. Ids PT writes itself always pass (uid()).
   2. no prototype keys: "__proto__", "constructor" and "prototype" are dropped from imported data and never walked by
      a data-bind path.
   3. safe HTML at the sink: before the page is put on screen, event-handler attributes, script-like tags and
      script: / non-image data: links are removed. PT's own markup has none of these, so the fast path leaves it unchanged.
   4. no outside images from imports: image fields that point to another site (tracking pixels) are cleared. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SAFE_IMG_KEYS = new Set(["image", "thumb", "img", "photo"]);   // "src" and "data" only on an image file: elsewhere "src" is a source link (round trip, 2.1)
function safeIdOk(v){ return typeof v === "string" ? SAFE_ID.test(v) : (typeof v === "number" && Number.isFinite(v)); }
/** walk imported data: fix unsafe item ids, drop prototype keys and (imports only) outside image links. Returns how many things changed. */
function safeDeep(o, {imgs = false} = {}, depth = 0){
  if (!o || typeof o !== "object" || depth > 24) return 0;
  let n = 0;
  if (Array.isArray(o)){
    for (const x of o){
      if (x && typeof x === "object" && !Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, "id") && x.id != null && !safeIdOk(x.id)){ x.id = uid("x"); n++; }
      n += safeDeep(x, {imgs}, depth + 1);
    }
    return n;
  }
  for (const k of Object.keys(o)){
    if (SAFE_BAD_KEYS.has(k)){ delete o[k]; n++; continue; }
    const v = o[k];
    if (imgs && (SAFE_IMG_KEYS.has(k) || ((k === "src" || k === "data") && o.type === "image")) && typeof v === "string" && /^[\s\x00-\x1f]*(https?:|\/\/|\\\\)/i.test(v)){ o[k] = ""; n++; continue; }
    n += safeDeep(v, {imgs}, depth + 1);
  }
  return n;
}
/** an imported top-level record (project, note, pattern, research entry): its own id must be safe too */
function safeRecord(x, prefix, opts){
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  safeDeep(x, opts);
  if (!safeIdOk(x.id) || typeof x.id !== "string") x.id = uid(prefix);
  return x;
}
/** links PT puts in a page: https only (http for nothing, never script: or data:) */
function safeUrl(u){ const s = String(u ?? "").trim(); return /^https:\/\//i.test(s) ? s : ""; }

const SAFE_HTML_TRIGGER = /[\s\/"']on[a-z]+\s*=|script\s*(:|&)|<\s*\/?\s*(script|iframe|frame|object|embed|base|meta|link|style|template|noscript)\b|(href|src|action|formaction|xlink:href)\s*=\s*["']?[\s\x00-\x1f]*data\s*:(?!image\/(png|jpe?g|gif|webp)[;,])/i;
const SAFE_HTML_DROP = "script,iframe,frame,frameset,object,embed,base,meta,link,style,template,noscript";
/** clean a page's HTML before it goes on screen; PT's own markup takes the fast path and comes back unchanged */
function safeHTML(html){
  const s = String(html ?? "");
  if (!SAFE_HTML_TRIGGER.test(s)) return s;
  try{
    const tpl = document.createElement("template"); tpl.innerHTML = s;   // ok:raw (a template is inert: nothing runs, nothing loads)
    const f = tpl.content;
    for (const el of f.querySelectorAll(SAFE_HTML_DROP)) el.remove();
    for (const el of f.querySelectorAll("*")){
      for (const a of Array.from(el.attributes)){
        const nm = a.name.toLowerCase();
        if (nm.startsWith("on")){ el.removeAttribute(a.name); continue; }
        if (["href", "src", "action", "formaction", "xlink:href", "srcset", "poster", "background"].includes(nm)){
          const v = a.value.replace(/[\x00-\x20]/g, "").toLowerCase();
          if (/script:/.test(v) || (v.startsWith("data:") && !/^data:image\/(png|jpe?g|gif|webp)[;,]/.test(v))) el.removeAttribute(a.name);
        }
      }
    }
    return tpl.innerHTML;
  }catch(e){ return esc(s); }
}
/* example photos fall back to their thumbnail without an inline handler (2.1: the page carries no on…= attributes) */
document.addEventListener("error", e => { const im = e.target; if (im && im.classList && im.classList.contains("exphoto") && im.dataset.t && im.src !== im.dataset.t && !im.src.endsWith(im.dataset.t)) im.src = im.dataset.t; }, true);
