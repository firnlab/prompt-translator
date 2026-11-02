/* ===================== 1.7.0 THE VAULT: THE OPEN TOOLS PT AND ITS TOOLS RELY ON =====================
   Chosen by the owner on 25 Oct 2026 (vault/vault.json, mirrored monthly by the vault workflow with checksum and licence check).
   VAULT is injected at build time from vault/vault.json. A brief names the tools from the vault that fit the tool (PART O), each with
   its licence and the day it was checked; a tool PT builds never installs anything the brief did not name. */
function vaultGroups(p){
  const G = new Set(["security"]);
  const txt = [p.intake && p.intake.raw, (p.northStar || {}).goal, ...arr(p.arch && p.arch.components).map(c => [c.name, c.role, c.inputs, c.outputs].join(" "))].map(str).join(" ").toLowerCase();
  if (typeof kit5Applies === "function" && kit5Applies(p) && typeof kit5Voice === "function" && kit5Voice(p)) G.add("voice");
  if (/dictat|transcri|speech|voice|diktier|sprach|语音|听写|转写/.test(txt)) G.add("voice");
  if (typeof kit4Applies === "function" && kit4Applies(p)) G.add("phone");
  if (typeof kit3Applies === "function" && kit3Applies(p)) G.add("web");
  if (/offline|local model|on my laptop|no credits|zero credits|lokal|offline|本地|离线/.test(txt)) G.add("local models");
  const rb = typeof kitDecided === "function" ? kitDecided(p, "rebuild", ["pay", "clean", "rea", "without"]) : null;
  if (rb && (rb.kind === "rea" || rb.kind === "clean")) G.add("reverse engineering");
  if (arr(p.arch && p.arch.components).some(c => c.kind === "ai" || c.kind === "hybrid")) G.add("agent infrastructure");
  return G;
}
function vaultTools(p){ const G = vaultGroups(p); return VAULT.tools.filter(t => G.has(t.group)); }
function vaultBriefPart(p){
  if (!arr(p.arch && p.arch.components).length) return "";
  const rb = typeof kitDecided === "function" ? kitDecided(p, "rebuild", ["pay", "clean", "rea", "without"]) : null;
  const T = vaultTools(p).filter(t => t.group !== "reverse engineering" || (rb && rb.kind === "rea") || t.id === "mitmproxy");
  if (!T.length) return "";
  return `\nPART O · TOOLS FROM THE FIRNLAB VAULT (chosen 25 Oct 2026, mirrored monthly, licences checked ${VAULT.checked})\nUse only these open tools where the brief needs them; install nothing the brief does not name; record each one used in licences.md with its version and licence:\n${T.map(t => `- ${t.name} (${t.repo}; ${t.licence || "licence recorded per release"}) — ${t.use}${t.install ? " — install: " + t.install : ""}`).join("\n")}\n`;
}
{ const orig = kitBriefPart; kitBriefPart = function(p){ return orig(p) + vaultBriefPart(p); }; }
function vaultCard(p){
  if (!arr(p.arch && p.arch.components).length) return "";
  const rb = typeof kitDecided === "function" ? kitDecided(p, "rebuild", ["pay", "clean", "rea", "without"]) : null;
  const T = vaultTools(p).filter(t => t.group !== "reverse engineering" || (rb && rb.kind === "rea") || t.id === "mitmproxy");
  if (!T.length) return "";
  return `<section class="panel pg-vault" data-anchor="vault"><div class="row"><h3 style="flex:1 1 12em">${ic("lock")} ${esc(t("vault.title"))}</h3><span class="small muted">${esc(t("vault.sub", {d: fmtDay(VAULT.checked)}))}</span></div>
    <div class="list">${T.map(x => `<div class="item">${stSlot("ok")}<div class="body"><b class="small"><span translate="no">${esc(x.name)}</span> <span class="muted">· ${x.licence ? `<span translate="no">${esc(x.licence)}</span>` : esc(t("vault.nolic"))}</span></b><span class="small muted"${STR["vault.use." + x.id] ? "" : ' lang="en"'}>${esc(STR["vault.use." + x.id] ? t("vault.use." + x.id) : x.use)}</span></div></div>`).join("")}</div></section>`;
}
{ const orig = pgBody; pgBody = function(p, id){ const h = orig(p, id); if (id === "build") return h.replace('<section class="pg-details', vaultCard(p) + '<section class="pg-details'); return h; }; }
