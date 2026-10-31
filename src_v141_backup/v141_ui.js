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
