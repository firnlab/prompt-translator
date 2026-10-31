/* ===================== 1.4.1 SHARED PIECES: full text with "more", one ✓/✗ control =====================
   1. Text is never cut in the data. Long text shows a few lines with "more"; the whole text is always on the page,
      so copying it gives everything. Buttons wrap instead of cutting their label.
   2. One verdict control everywhere (examples, the examples loop, test results): ✓ Good / ✗ Not good, shape + word
      + colour, pressed state for both, aria-pressed, keys Y / N where a screen has one current item. */

/* ---------- 1. full text, folded to a few lines ---------- */
UI.unclamp = UI.unclamp || new Set();
/** text folded to `lines` lines with a "more" button when it is longer (the button only appears when it is needed) */
function clampHTML(text, key, {lines = 2, cls = "", tag = "span", attrs = ""} = {}){
  const k = str(key) || "c" + hashStr(str(text)).toString(36);
  const open = UI.unclamp.has(k);
  return `<${tag} class="clampx ${open ? "open" : ""} ${cls}" data-clamp="${esc(k)}" style="--cl:${num(lines, 2)}" ${attrs}>${esc(text)}</${tag}>`;
}
/** after each render: a "more" button for every folded text that really is longer than its lines */
function clampButtons(){
  for (const el of document.querySelectorAll("[data-clamp]")){
    const nx = el.nextElementSibling, has = nx && nx.classList && nx.classList.contains("morebtn");
    const open = el.classList.contains("open");
    const over = open || el.scrollHeight > el.clientHeight + 2;
    if (over && !has){
      const b = document.createElement("button");
      b.type = "button"; b.className = "morebtn"; b.dataset.a = "clamp-toggle"; b.dataset.k = el.dataset.clamp;
      b.textContent = open ? t("more.less") : t("more.more"); b.setAttribute("aria-expanded", String(open));
      el.insertAdjacentElement("afterend", b);
    } else if (!over && has) nx.remove();
  }
}
Object.assign(ACTIONS, {
  "clamp-toggle": el => {
    const k = el.dataset.k; if (!k) return;
    if (UI.unclamp.has(k)) UI.unclamp.delete(k); else UI.unclamp.add(k);
    // no re-render: only this text opens or folds, nothing else on the screen moves
    for (const x of document.querySelectorAll(`[data-clamp="${CSS.escape(k)}"]`)){ x.classList.toggle("open", UI.unclamp.has(k)); const b = x.nextElementSibling; if (b && b.classList.contains("morebtn")){ b.textContent = UI.unclamp.has(k) ? t("more.less") : t("more.more"); b.setAttribute("aria-expanded", String(UI.unclamp.has(k))); } }
  }
});
ACT_NO.add("clamp-toggle");

/* ---------- 2. one verdict control ---------- */
/** ✓ / ✗ with the current verdict pressed; values default to good / bad (tests use pass / fail) */
function verdictCtl(action, attrs, cur, {good = "good", bad = "bad", lGood = t("vd.good"), lBad = t("vd.bad"), keys = false, size = ""} = {}){
  const b = (v, cls, icon, label, key) => `<button type="button" class="vbtn ${cls} ${size}" data-a="${esc(action)}" ${attrs} data-v="${esc(v)}" aria-pressed="${cur === v}" title="${esc(label)}${keys ? " (" + key + ")" : ""}">${ic(icon)}<span>${esc(label)}</span>${keys ? `<kbd aria-hidden="true">${key}</kbd>` : ""}</button>`;
  return `<span class="vctl" role="group" aria-label="${esc(t("vd.label"))}">${b(good, "good", "check", lGood, "Y")}${b(bad, "bad", "x", lBad, "N")}</span>`;
}

/** the "show in the panel" button that every item row has, in the same place (after its chips) */
function inspBtn(ref, label = ""){ return `<button class="iconbtn sm ibtn-insp" data-a="insp-open" data-ref="${esc(ref)}" title="${esc(t("insp.open"))}" aria-label="${esc(t("insp.open") + (label ? ": " + label : ""))}">${ic("layers")}</button>`; }
/* ---------- 3. hooks into every render ---------- */
function afterRender141(){
  try{ clampButtons(); }catch(e){}
  try{ if (typeof shellAfterRender === "function") shellAfterRender(); }catch(e){ onAppError(e && e.message, "shellAfterRender"); }
}

/* ---------- 3. menus always show in full (1.4.2) ----------
   A menu opened inside a list, panel or scroll box was cut off by that box (overflow). Every <details> menu now opens
   in the browser's top layer (popover) at a fixed place next to its button: below when there is room, above when not,
   kept inside the window, with its own scrolling when even that is too small. No container can clip it. */
function menuFloat(d){
  const m = d && d.querySelector(":scope > .menu"), s = d && d.querySelector(":scope > summary"); if (!m || !s) return;
  if (!d.open){ try{ if (m.matches(":popover-open")) m.hidePopover(); }catch(e){} m.classList.remove("float"); m.removeAttribute("style"); return; }   // ok:catch  popover support differs by browser; the menu then opens in place
  if (typeof m.showPopover === "function"){ if (!m.hasAttribute("popover")) m.setAttribute("popover", "manual"); try{ if (!m.matches(":popover-open")) m.showPopover(); }catch(e){} }   // ok:catch  popover support differs by browser; the menu then opens in place
  m.classList.add("float");
  Object.assign(m.style, {position: "fixed", margin: "0", inset: "auto", maxHeight: "", overflowY: ""});
  const r = s.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const mw = m.offsetWidth, mh = m.offsetHeight, below = vh - r.bottom - 10, above = r.top - 10;
  const down = mh <= below || below >= above, room = Math.max(120, down ? below : above);
  if (mh > room){ m.style.maxHeight = room + "px"; m.style.overflowY = "auto"; }
  const h = Math.min(mh, room);
  const top = down ? r.bottom + 4 : r.top - 4 - h;
  let left = m.classList.contains("right") ? r.right - mw : r.left;
  left = Math.max(8, Math.min(left, vw - mw - 8));
  m.style.top = Math.max(6, top) + "px"; m.style.left = left + "px";
}
document.addEventListener("toggle", e => { const d = e.target; if (d && d.tagName === "DETAILS" && d.querySelector(":scope > .menu")) menuFloat(d); }, true);
{ const again = () => { for (const m of document.querySelectorAll("details[open] > .menu.float")) menuFloat(m.parentElement); };
  window.addEventListener("resize", again); document.addEventListener("scroll", again, true); }

/* ---------- 4. one way to remove an item (1.4.2) ----------
   Two delete paths existed (the bin icon and More → Remove) and the bin left references behind (tests still pointing
   to a deleted requirement, flags, marks). Both now use removeItem(), which also forgets every reference to the item:
   lists of ids anywhere in the project (…Ids, ids, checked, missed, recheck), single links (fromEx, srcRef), flags, new-marks. */
const REF_HISTORY = new Set(["acts", "restore", "activity", "versions", "releases", "live", "updates", "tool", "brief", "report", "log", "hist", "runs"]);   // history keeps what happened (a past run of a removed test stays as it was)
function forgetRefs(p, id, ref){
  const walk = (o, depth) => { if (!o || typeof o !== "object" || depth > 6) return;
    if (Array.isArray(o)){ for (const x of o) walk(x, depth + 1); return; }
    for (const k of Object.keys(o)){ if (depth === 0 && REF_HISTORY.has(k)) continue; const v = o[k];
      if (Array.isArray(v) && (/Ids$|^ids$|^checked$|^missed$|^recheck$|^touches$|^refs$/.test(k))) o[k] = v.filter(x => x !== id && x !== ref);
      else if (typeof v === "string" && (v === id || v === ref) && /^(fromEx|srcRef|ref|for|target)$/.test(k)) o[k] = "";
      else walk(v, depth + 1); } };
  walk(p, 0);
}
function removeItem(p, ref){
  const [k, id] = String(ref).split(":"); const list = ITEM_LIST[k]; if (!p || !list) return false;
  p[list] = arr(p[list]).filter(x => x.id !== id);
  forgetRefs(p, id, ref); unflag(p, ref);
  if (p.newRefs) delete p.newRefs[ref];
  return true;
}
{ const orig = ACTIONS["item-remove"];
  ACTIONS["item-remove"] = el => { const p = curP(); const ref = el.dataset.ref; closeMenus(); const [k] = String(ref).split(":"); if (!ITEM_LIST[k]) return orig(el);
    const label = refLabel(p, ref, true) || ref; snapshot(p, t("more.remove") + " " + label); probSnap(p); removeItem(p, ref);
    logAct(p, t("act.removed", {r: label}), {kind: "edit"}); touch(p); render(); toastUndo(t("more.removed")); afterChange(p); };
  ACTIONS["del-item"] = el => { const kind = Object.keys(ITEM_LIST).find(k => ITEM_LIST[k] === el.dataset.list); const p = curP();
    if (!kind){ confirmBox(t("btn.delete"), t("confirm.item"), t("btn.delete"), () => { snapshot(p); p[el.dataset.list] = arr(p[el.dataset.list]).filter(x => x.id !== el.dataset.id); touch(p); render(); toast(t("toast.deleted"), "ok"); }); return; }
    ACTIONS["item-remove"]({dataset: {ref: kind + ":" + el.dataset.id}}); };
}


/* ---------- 5. people never see internal ids (1.4.2, class "raw ids shown"): AI text that names "as-mvf…" shows the item's label ---------- */
const RAW_ID = /\b[a-z]{1,3}-(?=[a-z0-9]*\d)[a-z0-9]{9,}\b/g;   // uid() shape: prefix, dash, base-36 time + random (always has a digit)
function idLabels(p){
  const m = new Map();
  try{ for (const i of allItems(p)){ const o = i.obj; if (o && o.id && RAW_ID.test(String(o.id))){ const title = str(i.title).split(/\s+/).slice(0, 6).join(" "); m.set(String(o.id), (guided() ? "" : i.id + " ") + "“" + title + (str(i.title).split(/\s+/).length > 6 ? " …" : "") + "”"); } RAW_ID.lastIndex = 0; } }catch(e){}   // ok:catch  labels are a nicety; the text stays as written
  for (const f of arr(p.findings)) if (f && f.id && !m.has(f.id)) m.set(String(f.id), "“" + str(f.issue).split(/\s+/).slice(0, 6).join(" ") + " …”");
  return m;
}
function humanIds(){
  const p = typeof curP === "function" ? curP() : null, app = document.querySelector(".app"); if (!p || !app) return;
  let labels = null; const tw = document.createTreeWalker(app, NodeFilter.SHOW_TEXT); const hits = []; let n;
  while ((n = tw.nextNode())){ RAW_ID.lastIndex = 0; if (RAW_ID.test(n.nodeValue) && !n.parentElement.closest("textarea, input, code, pre, [contenteditable]")) hits.push(n); }
  if (!hits.length) return;
  labels = idLabels(p);
  for (const node of hits) node.nodeValue = node.nodeValue.replace(RAW_ID, id => labels.get(id) || id);
}
