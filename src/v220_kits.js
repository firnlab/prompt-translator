/* ===================== 2.2.0 · vendor limits table (import SHOULD 16, merged with item 7) =====================
   What each vendor's spending limit really does, read on the vendor's own page (10 Nov 2026), shown in Settings › Knowledge.
   Kinds: "cap" (stops spending over quota), "pause" (the service pauses at its limit), "alert" (only warns), "prepaid" (the balance is
   the limit), "none" (no limit exists: PT's ceiling and the vendor's alerts are the control), "unchecked" (PT has not read what
   the limit does on the vendor's own page yet: the row says so and asks for a check before the vendor is used). Each row: when to set it (day one, before
   the first run), what is still billed with the limit on, the date checked and its source. Facts run on the 20-day price clock
   (factStale(d, "price")); past it the row says "check again" and PT does not lean on it. "Set" is ticked by the owner per workspace and
   kept in flat settings keys (vlSet_<id> = date) so a backup restore keeps it (v210_safe.js IMPORT_SETTINGS accepts the prefix). */
const VENDOR_LIMITS = [
  {id: "supabase", name: "Supabase Pro", kind: "cap", d: "2026-11-10", src: "https://supabase.com/docs/guides/platform/spend-cap"},
  {id: "vercelpro", name: "Vercel Pro", kind: "alert", d: "2026-11-10", src: "https://docs.vercel.com/docs/plans/pro-plan"},
  {id: "vercelhobby", name: "Vercel Hobby", kind: "pause", d: "2026-11-10", src: "https://vercel.com/docs/plans/hobby"},
  {id: "stripe", name: "Stripe", kind: "none", d: "2026-11-10", src: "https://support.stripe.com/questions/pricing-updates-for-businesses-in-switzerland"},
  {id: "cloudflare", name: "Cloudflare Pages", kind: "unchecked", d: "2026-11-10", src: "https://developers.cloudflare.com/pages/platform/limits"},
  {id: "netlify", name: "Netlify", kind: "unchecked", d: "2026-11-10", src: "https://netlify.com/pricing"},
  {id: "fal", name: "fal.ai", kind: "prepaid", d: "2026-11-10", src: "https://fal.ai/docs/documentation/model-apis/pricing"},
  {id: "gemini", name: "Gemini API", kind: "unchecked", d: "2026-11-10", src: "https://ai.google.dev/gemini-api/docs/pricing"},
  {id: "claudeapi", name: "Claude API (Console)", kind: "unchecked", d: "2026-11-10", src: "https://platform.claude.com/docs/en/models/opus-5-5/overview"},
  {id: "expo", name: "Expo EAS", kind: "unchecked", d: "2026-11-10", src: "https://expo.dev/pricing"},
  {id: "lemon", name: "Lemon Squeezy", kind: "none", d: "2026-11-10", src: "https://docs.lemonsqueezy.com/help/getting-started/fees"}
];
const VL_KINDS = ["cap", "pause", "alert", "prepaid", "none", "unchecked"];
function vlSetKey(id){ return "vlSet_" + String(id).replace(/[^a-z0-9]/g, ""); }
function vlIsSet(id){ const v = WS && WS.settings ? WS.settings[vlSetKey(id)] : ""; return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""; }
function vlRow(v){
  const stale = factStale(v.d, "price"), set = vlIsSet(v.id), kindWord = t("vl.kind." + v.kind);
  const srcLink = /^https:\/\//.test(v.src) ? `<a href="${esc(v.src)}" target="_blank" rel="noopener">${esc(t("vl.source"))}</a>` : "";   // ok:raw (fixed https vendor URLs from the table above)
  const kindChip = `<span class="chip ${v.kind === "cap" || v.kind === "prepaid" ? "ok" : v.kind === "none" ? "crit" : v.kind === "unchecked" ? "" : "warn"}" data-vl-kind="${esc(v.kind)}">${ic(v.kind === "none" ? "flag" : v.kind === "cap" || v.kind === "prepaid" ? "check" : "info")} ${esc(kindWord)}</span>`;
  const setCtl = v.kind === "none" || v.kind === "unchecked" ? `<span class="small muted">${esc(t("vl.noset"))}</span>`
    : set ? `<span class="chip ok" data-vl-set="1">${ic("check")} ${esc(t("vl.isset", {d: fmtDay(set)}))}</span> <button class="btn xs ghost" data-a="vl-unset" data-id="${esc(v.id)}">${esc(t("vl.unset"))}</button>`
    : `<button class="btn xs" data-a="vl-set" data-id="${esc(v.id)}">${esc(t("vl.markset"))}</button>`;
  return `<div class="item" data-vl="${esc(v.id)}"><div class="body"><span class="title"><span translate="no">${esc(v.name)}</span> ${kindChip}${stale ? ` <span class="chip warn" data-vl-stale="1">${ic("clock")} ${esc(t("vl.stale"))}</span>` : ""}</span>
    <span class="small">${esc(t("vl." + v.id + ".what"))}</span>
    <span class="small muted">${esc(t("vl." + v.id + ".billed"))}</span>
    <span class="small muted">${esc(t("vl.when"))} · ${esc(t("fact.checked", {d: fmtDay(v.d)}))} · ${srcLink}</span></div>
    <div class="acts">${setCtl}</div></div>`;
}
function vendorLimitsHTML(){
  return `<section class="panel" data-anchor="vendor-limits"><h3>${esc(t("vl.title"))}</h3><p class="small muted">${esc(t("vl.sub"))}</p>
    <div class="legend small">${VL_KINDS.map(k => `<span>${esc(t("vl.kind." + k))}: ${esc(t("vl.kindhelp." + k))}</span>`).join("")}</div>
    <div class="list">${VENDOR_LIMITS.map(vlRow).join("")}</div></section>`;
}
/* one plain-text line per vendor for a build brief (a tool that names a vendor gets its limit row) */
function vendorLimitsText(names){
  const want = arr(names).map(x => str(x).toLowerCase());
  return VENDOR_LIMITS.filter(v => !want.length || want.some(w => v.name.toLowerCase().includes(w) || v.id.includes(w)))
    .map(v => `${v.name} — ${t("vl.kind." + v.kind)}: ${t("vl." + v.id + ".what")} ${t("vl." + v.id + ".billed")} (${t("fact.checked", {d: fmtDay(v.d)})}${factStale(v.d, "price") ? ", " + t("vl.stale") : ""})`).join("\n");
}
{ const orig = knowledgeTab; knowledgeTab = function(){ return orig.apply(this, arguments) + vendorLimitsHTML(); }; }
Object.assign(ACTIONS, {
  "vl-set": el => { const id = el.dataset.id; if (!VENDOR_LIMITS.some(v => v.id === id)) return; WS.settings[vlSetKey(id)] = now().slice(0, 10); saveWs(); render(); },
  "vl-unset": el => { const id = el.dataset.id; if (!VENDOR_LIMITS.some(v => v.id === id)) return; delete WS.settings[vlSetKey(id)]; saveWs(); render(); }
});
