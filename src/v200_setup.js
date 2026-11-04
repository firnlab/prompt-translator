/* ===================== 2.0 Part E: setup guides and the helper programs, declared in advance =====================
   The owner: "local helper programs on the Mac that the owner installs himself when a project needs one, and PT takes over and runs it
   (all categories except Calendar, Contacts, Music, Photos; no e-mail/Slack sorting)"; "never auto-install packages or connectors on the
   owner's devices". So PT installs nothing: it declares one program per category (HELPERS20, from official or well-known sources, tool
   names as their own pages give them), shows click-by-click install guides in three languages, checks whether each helper answers
   (host:<name> in the Claude desktop app, owner only — listTools never asks; "Check it's there" makes one read-only call where the helper
   has one), and a route that needs a helper says "Needs <program> — install guide" on its card.
   Categories left without a helper in 2.0 (no program whose tool names could be checked on its own official page, or the job is already
   PT's own): terminal / shell, databases, office documents, notes, browser automation outside the app's browser (PT's hands are the
   only browser), memory (the facts book is PT's memory), time. A different program per category needs a small update of this table.
   The guides (GUIDES20): the Claude GitHub App for firnlab, the GitHub connector in claude.ai, auto-merge for Dependabot pull requests
   only, a cloud scheduled task for the morning check, computer use in the desktop app, and one per helper. PT creates no scheduled task. */
const HELPERS20 = [
  {id: "files", cat: "files", prog: "Filesystem", by: "Model Context Protocol (reference server)", src: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem", server: "host:filesystem",
    tools: ["list_allowed_directories", "list_directory", "write_file"], probe: "list_allowed_directories", needs: "Node.js",
    config: `"filesystem": {\n  "command": "npx",\n  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/<you>/Documents/PT"]\n}`},
  {id: "git", cat: "code", prog: "Git", by: "Model Context Protocol (reference server)", src: "https://github.com/modelcontextprotocol/servers/tree/main/src/git", server: "host:git",
    tools: ["git_status"], probe: "git_status", needs: "uv",
    config: `"git": {\n  "command": "uvx",\n  "args": ["mcp-server-git", "--repository", "/Users/<you>/path/to/repo"]\n}`},
  {id: "fetch", cat: "web", prog: "Fetch", by: "Model Context Protocol (reference server)", src: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch", server: "host:fetch",
    tools: ["fetch"], probe: "", needs: "uv",
    config: `"fetch": {\n  "command": "uvx",\n  "args": ["mcp-server-fetch"]\n}`},
  {id: "blender", cat: "3d", prog: "Blender MCP", by: "community add-on (ahujasid/blender-mcp, not by the Blender Foundation)", src: "https://github.com/ahujasid/blender-mcp", server: "host:blender",
    tools: ["execute_blender_code"], probe: "execute_blender_code", probeIn: {code: "import bpy\nprint(len(bpy.data.objects))"}, probeAsk: true, needs: "Blender, uv",
    config: `"blender": {\n  "command": "uvx",\n  "args": ["mcp-for-blender"],\n  "env": {"DISABLE_TELEMETRY": "true"}\n}`}
];
const HELPERS20_OUT = ["calendar", "contacts", "music", "photos", "mailsort"];
const HELP20_KW = {files: /\b(files?|folders?|filesystem|finder|documents? folder|disk)\b|datei|ordner|文件/i, git: /\b(git|repositor(y|ies)|commits?)\b/i, fetch: /\b(fetch|web ?pages?|websites?|urls?|download pages?)\b|webseite|网页/i, blender: /\b(blender|3d|cad|mesh|render(ing)?)\b|三维/i};
const HELP20_OUT_KW = {calendar: /calendar|kalender|日历/i, contacts: /contacts|kontakte|adressbuch|联系人/i, music: /\bmusic\b|musik|音乐/i, photos: /\bphotos?\b|fotos?\b|照片|相册/i, mailsort: /(sort|triage|draft|reply|label)\w*\s+(e-?mails?|mails?|slack)|(e-?mail|mail|slack)\s+(sort|triage|draft|repl)\w*|邮件(分类|整理|草拟)/i};
const HELP20 = {st: {}, at: null, busy: "", note: {}, tried: false};

/* ---------- 0. is a helper there (owner, desktop app) ---------- */
function helper20(id){ return HELPERS20.find(h => h.id === id) || null; }
function helper20Ready(id){ return HELP20.st[id] === "ready"; }
/** listTools never asks the person: a helper the app runs lists with its tools; one declared only in the page lists with empty descriptions */
async function helper20Detect(){
  if (HELP20.busy) return;
  HELP20.busy = "detect"; HELP20.tried = true;
  try{
    const m = handsOk() ? await handsApi() : null;
    if (!m || typeof m.listTools !== "function"){ for (const h of HELPERS20) HELP20.st[h.id] = "app"; return; }
    let S = [];
    try{ const r = await m.listTools(); S = arr(r && r.servers); }catch(e){ for (const h of HELPERS20) HELP20.st[h.id] = "app"; return; }   // ok:catch no list in this view → "open PT in the desktop app"
    for (const h of HELPERS20){
      const s = S.find(x => x && x.server === h.server), T = arr(s && s.tools);
      if (!s || !T.length || s.authStatus === "needs_reauth"){ HELP20.st[h.id] = "missing"; continue; }
      const live = s.authStatus === "connected" || T.some(x => str(x && x.description).trim());
      const miss = h.tools.filter(n => !T.some(x => x && x.name === n));
      HELP20.st[h.id] = !live ? "unchecked" : miss.length ? "old" : "ready";
      if (miss.length) HELP20.note[h.id] = miss.join(", ");
    }
  }finally{ HELP20.at = now(); HELP20.busy = ""; render(); }
}
/** one call to a helper: the owner's, only the tools declared for it, a key-shaped answer is dropped */
async function helper20Call(id, tool, input){
  const h = helper20(id);
  if (!handsOk()) throw {code: "hands_owner"};
  if (!h || !h.tools.includes(tool)) throw {code: "hands_guard", message: id + " " + tool};
  const m = await handsApi(); if (!m) throw {code: "capability_disabled"};
  const r = await m.callTool(h.server, tool, Object.assign({}, input || {}));
  const txt = handsText(r && r.payload !== undefined ? r.payload : r);
  if (HANDS_SECRET.test(txt)) throw {code: "hands_secret"};
  return txt;
}
function helper20Err(e){ const c = str(e && e.code); if (["server_not_connected", "server_not_found", "not_granted"].includes(c)) return t("su20.e.missing"); return handsErr(e); }
async function helper20Check(id){
  const h = helper20(id); if (!h || HELP20.busy) return;
  await helper20Detect();
  const probe = async () => {
    HELP20.busy = id; render();
    try{ const txt = await helper20Call(id, h.probe, id === "git" ? {repo_path: helper20Repo()} : h.probeIn || {}); HELP20.st[id] = "ready"; HELP20.note[id] = id === "files" ? str(txt).split("\n").map(s => s.trim()).filter(s => s.startsWith("/")).slice(0, 3).join(", ") : t("su20.probe.ok"); }
    catch(e){ HELP20.st[id] = "missing"; HELP20.note[id] = helper20Err(e); }
    finally{ HELP20.busy = ""; render(); }
    toast(t("su20.st." + (HELP20.st[id] || "missing"), {x: h.prog}), HELP20.st[id] === "ready" ? "ok" : "");
  };
  if (h.probe && ["ready", "unchecked"].includes(HELP20.st[id]) && (id !== "git" || helper20Repo())){
    if (h.probeAsk){ confirmBox(t("su20.check"), t("su20.probe." + id), t("su20.probe.yes"), () => { probe(); }); return; }   // a helper whose only tool runs code: what it runs is shown first
    await probe(); return;
  }
  toast(t("su20.st." + (HELP20.st[id] || "missing"), {x: h.prog}), HELP20.st[id] === "ready" ? "ok" : "");
}

/* ---------- 1. what PT does with each helper ---------- */
/** Filesystem: save the project's prompt package as a NEW file in the folder you allowed (never overwrites, never deletes) */
async function helper20SavePrompt(p){
  if (!p || !helper20Ready("files") || HELP20.busy) return;
  const pkg = pt20Pkg(p); if (!pkg){ toast(t("pt20.need.pkg"), "err"); return; }
  HELP20.busy = "files"; render();
  try{
    const dirs = str(await helper20Call("files", "list_allowed_directories", {})).split("\n").map(s => s.trim()).filter(s => s.startsWith("/"));
    if (!dirs.length){ toast(t("su20.files.nodir"), "err"); return; }
    const dir = dirs[0].replace(/\/+$/, ""), base = (str(p.name).replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "-") || "prompt").slice(0, 60) + "-v" + num(p.versionNo, 0);   // ok:cut a file name
    const have = str(await helper20Call("files", "list_directory", {path: dir}));
    let name = base + ".md", n = 2; while (have.includes(name) && n < 50) name = base + "-" + (n++) + ".md";
    const path = dir + "/" + name;
    confirmBox(t("su20.files.t"), t("su20.files.contract", {x: path}), t("su20.files.yes"), async () => {
      try{ await helper20Call("files", "write_file", {path, content: pkg}); toast(t("su20.files.done", {x: path}), "ok"); }
      catch(e){ toast(helper20Err(e), "err"); }
    });
  }catch(e){ toast(helper20Err(e), "err"); }
  finally{ HELP20.busy = ""; render(); }
}
function helper20Repo(){ return str(WS && WS.settings && WS.settings.helpers20 && WS.settings.helpers20.repo).trim(); }
/** Git (morning check): changes not yet committed in the folder you named */
async function mc20HelperLines(line){
  const repo = helper20Repo();
  if (!repo || !helper20Ready("git")) return;
  try{ const txt = str(await helper20Call("git", "git_status", {repo_path: repo}));
    const n = txt.split("\n").filter(l => /^\s*(modified:|new file:|deleted:|renamed:|both modified:)/.test(l)).length + (/Untracked files/.test(txt) ? 1 : 0);
    line("git", n ? t("su20.git.changes", {x: repo, n}) : t("su20.git.clean", {x: repo}), n ? "new" : "ok"); }
  catch(e){ line("git", t("su20.git.fail", {x: repo, e: helper20Err(e)}), "warn"); }
}
/** which helper a route names (its helper field and actors): one of HELPERS20, an excluded category, or none */
function helper20OfRoute(r){
  const txt = [r && r.helper ? r.helper.name + " " + r.helper.does : "", r && r.actors ? r.actors.helper : ""].join(" ");
  if (!txt.trim()) return null;
  for (const k of HELPERS20_OUT) if (HELP20_OUT_KW[k].test(txt)) return {out: k};
  for (const h of HELPERS20) if (HELP20_KW[h.id].test(txt)) return {h};
  return {none: true};
}
{ const orig = m20CardHTML; m20CardHTML = function(p, id){
    const h = orig.apply(this, arguments); const r = p && m20Route(p, id); const H = r && helper20OfRoute(r); if (!H) return h;
    try{
      if (!HELP20.tried && handsOk()) setTimeout(() => helper20Detect(), 0);
      const line = H.out ? `<p class="small warn-t su20-route" data-su20="out">${esc(t("su20.route.out", {x: t("su20.out." + H.out)}))}</p>`
        : H.none ? `<p class="small muted su20-route" data-su20="none">${esc(t("su20.route.none"))} <button class="btn xs ghost" data-a="setup20-guide" data-g="helpers">${esc(t("su20.route.list"))}</button></p>`
        : helper20Ready(H.h.id) ? `<p class="small su20-route" data-su20="ready">${ic("check")} ${esc(t("su20.route.ready", {x: H.h.prog}))}</p>`
        : `<p class="small su20-route" data-su20="needs">${ic("gear")} ${esc(t("su20.route.needs", {x: H.h.prog}))} <button class="btn xs" data-a="setup20-guide" data-g="h-${esc(H.h.id)}">${esc(t("su20.route.guide"))}</button></p>`;
      return h.replace(/<\/article>\s*$/, line + "</article>"); }
    catch(e){ onAppError(e && e.message, "setup20:card"); return h; } }; }
{ const orig = pt20HTML; pt20HTML = function(p){ const h = orig.apply(this, arguments);
    return helper20Ready("files") && pt20Pkg(p) ? h.replace(/<\/section>\s*$/, `<div class="row"><button class="btn sm ghost" data-a="su20-save" ${HELP20.busy ? "disabled" : ""}>${ic("dl")}${esc(t("su20.files.save"))}</button><span class="small muted">${esc(t("su20.files.sub"))}</span></div></section>`) : h; }; }

/* ---------- 2. the guides (click by click; the owner does each step) ---------- */
const GUIDES20 = [
  {id: "app", n: 5, links: {1: "https://github.com/apps/claude"}},
  {id: "connector", n: 5, links: {1: "https://claude.ai/customize/connectors"}},
  {id: "automerge", n: 5, links: {1: "https://github.com/firnlab/prompt-translator/settings"}},
  {id: "cloud", n: 6, links: {1: "https://claude.ai/code/routines"}},
  {id: "computer", n: 5, links: {1: "https://claude.com/download"}}
];
function setup20GuideHTML(id, steps, links, extra = ""){
  const open = UI.su20Open === id;
  return `<details class="su20-g" id="su20-g-${esc(id)}" data-g="${esc(id)}"${open ? " open" : ""}><summary><b>${esc(t("su20.g." + id + ".t"))}</b> <span class="small muted">· ${esc(t("su20.g." + id + ".why"))}</span></summary>
    <ol class="su20-steps">${steps.map((s, i) => `<li>${esc(s)}${links && links[i + 1] ? ` <a class="chip tap" href="${esc(links[i + 1])}" target="_blank" rel="noopener">${ic("link")}${esc(t("su20.open"))}</a>${handsGoBtn(links[i + 1], "", t("hands.go"))}` : ""}</li>`).join("")}</ol>${extra}</details>`;
}
function setup20HelperGuide(h){
  const k = "su20.h." + h.id + ".";
  const steps = [1, 2, 3, 4, 5].map(i => t(k + i)).filter(s => s && !s.startsWith("su20."));
  const extra = `<p class="small">${esc(t("su20.h.config"))}</p><pre class="su20-pre"><code>${esc(h.config)}</code></pre><p class="small muted">${esc(t("su20.h.name", {x: h.server.slice(5)}))} · ${esc(t("su20.h.remove"))}</p>`;
  // 2.0: an Intel Mac gets no ready-made build of "cryptography" from 49 on (PyPI, 4 Nov 2026), so uv tries to compile it and fails
  const intel = /uv/.test(h.needs) ? `<p class="small">${esc(t("su20.h.intel"))}</p>` : "";
  return setup20GuideHTML("h-" + h.id, steps, {}, extra + intel);
}
function setup20HTML(){
  if (handsOk() && !HELP20.busy && (!HELP20.at || Date.now() - Date.parse(HELP20.at) > 30000)) setTimeout(() => helper20Detect(), 0);   // listTools never asks: looked up again when the tab opens after a while
  const ST = {ready: "ok", unchecked: "warn", old: "warn", missing: "", app: ""};
  const rows = HELPERS20.map(h => { const st = HELP20.st[h.id] || (HELP20.busy === "detect" ? "busy" : "missing");
    return `<tr data-helper="${esc(h.id)}" data-st="${esc(st)}"><th scope="row">${esc(t("su20.cat." + h.cat))}</th><td><b>${esc(h.prog)}</b><br><span class="small muted">${esc(h.by)}</span></td>
      <td>${chip(t("su20.st." + st, {x: h.prog}), ST[st] || "")}${HELP20.note[h.id] ? `<br><span class="small muted">${esc(HELP20.note[h.id])}</span>` : ""}</td><td class="small">${esc(t("su20.does." + h.id))}</td>
      <td><div class="row"><button class="btn xs" data-a="su20-check" data-id="${esc(h.id)}" ${HELP20.busy ? "disabled" : ""}>${esc(t("su20.check"))}</button><button class="btn xs ghost" data-a="setup20-guide" data-g="h-${esc(h.id)}">${esc(t("su20.route.guide"))}</button></div></td></tr>`; }).join("");
  const repo = str(WS.settings.helpers20 && WS.settings.helpers20.repo);
  return `<section class="panel su20" data-anchor="su20"><h3>${esc(t("su20.t"))}</h3><p class="small muted">${esc(t("su20.sub"))}</p>
    <p class="small muted">${esc(handsOk() ? t("su20.where") : t("hands.e.owner"))}</p>
    <h4 id="su20-g-helpers">${esc(t("su20.helpers"))}</h4><div class="met20-wrap"><table class="met20-t su20-t"><thead><tr><th scope="col">${esc(t("su20.c.cat"))}</th><th scope="col">${esc(t("su20.c.prog"))}</th><th scope="col">${esc(t("su20.c.st"))}</th><th scope="col">${esc(t("su20.c.does"))}</th><th scope="col" aria-label="${esc(t("su20.c.acts"))}"></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">${esc(t("su20.out", {x: HELPERS20_OUT.map(k => t("su20.out." + k)).join(", ")}))} ${esc(t("su20.left"))}</p>
    <form class="row" data-form="su20-repo"><label class="fld" style="flex:1 1 18em"><span>${esc(t("su20.repo"))}</span><input type="text" id="su20-repo" value="${esc(repo)}" placeholder="/Users/you/code/prompt-translator" autocomplete="off"></label><button class="btn sm" type="submit">${esc(t("btn.save"))}</button></form>
    <h4>${esc(t("su20.guides"))}</h4><p class="small muted">${esc(t("su20.guides.sub"))}</p>
    ${GUIDES20.map(g => setup20GuideHTML(g.id, Array.from({length: g.n}, (_, i) => t("su20.g." + g.id + "." + (i + 1))), g.links)).join("")}
    ${HELPERS20.map(setup20HelperGuide).join("")}</section>`;
}
Object.assign(ACTIONS, {
  "setup20-guide": (el) => { const g = str(el && el.dataset && el.dataset.g); UI.su20Open = g; UI.modal = null; UI.view = "settings"; UI.setTab = "setup20"; render(); setTimeout(() => { const e = document.getElementById("su20-g-" + g); if (e){ if (e.tagName === "DETAILS") e.open = true; e.scrollIntoView({block: "start"}); } }, 0); },
  "su20-check": (el) => helper20Check(str(el.dataset.id)),
  "su20-save": () => helper20SavePrompt(curP())
});
Object.assign(FORMS, {
  "su20-repo": () => { const v = str(($("#su20-repo") || {}).value).trim(); WS.settings.helpers20 = Object.assign({}, WS.settings.helpers20, {repo: v.slice(0, 300)}); saveWs(); toast(t("su20.repo.saved"), "ok"); render(); }   // ok:cut a folder path
});
["setup20-guide", "su20-check"].forEach(a => ACT_NO.add(a));

const V200E_CSS = `
.su20-t td,.su20-t th{font-size:13px}
.su20-g{border-top:1px solid var(--line);padding:6px 0}
.su20-g summary{cursor:pointer;overflow-wrap:break-word}
.su20-steps{margin:6px 0;padding-left:22px;display:flex;flex-direction:column;gap:4px}
.su20-steps li{overflow-wrap:break-word;min-width:0}
.su20-pre{max-width:100%;overflow-x:auto;font-size:12px;padding:8px;border:1px solid var(--line);border-radius:8px;white-space:pre}
`;
function v200eCss(){ try{ if (document.getElementById("v200e-css")) return; const s = document.createElement("style"); s.id = "v200e-css"; s.textContent = V200E_CSS; document.head.appendChild(s); }catch(e){ onAppError(e && e.message, "v200e:css"); } }
v200eCss();
