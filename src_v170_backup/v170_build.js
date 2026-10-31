/* ===================== 1.7.0 THE BUILD PAGE: WITHOUT A CHAT · DO IT FOR ME · REA JOB · YOUR OWN DEVICES =====================
   Decided with the owner on 25 Oct 2026.
   - Build without a chat: the build brief becomes a GitHub issue labelled "build" in the tools repository; the Claude Code GitHub Action
     (vault: claude-code-action, on the owner's subscription token stored only in GitHub secrets) builds, tests and opens a pull request.
     PT prepares the issue (title, label, body) and copies the brief; the owner pastes and creates it — two clicks, no chat.
   - Do it for me: every person step becomes a laptop task — a text a Claude session on the laptop performs in the browser, stopping at every
     gate (sign-up, payment, anything irreversible). Laptop only, never a cloud session. PT tracks the state per step.
   - REA job: when the owner chose the private take-apart route, the laptop task carries the guardrails in words (laptop only, licence
     allows, notes stay on the laptop, PT receives "done, N findings").
   - Your own devices: what is buildable and what is not, stated plainly in the brief (PART N). */
const BUILD_REPO_DEFAULT = "firnlab/tools";
function buildRepo(){ return str(kitSettings().repo).trim() || BUILD_REPO_DEFAULT; }
function buildIssue(p){
  const slug = typeof kitSlug === "function" ? kitSlug(p) : str(p.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const rel = p.releases.length ? nextRelease(p, releaseKind(arr(p.plan && p.plan.changes))) : "1.0";
  const title = `build: ${p.name} v${rel} (${slug})`;
  const head0 = `@claude Build the tool "${p.name}" v${rel} in this repository under ${slug}/ from the BUILD BRIEF below. Follow it exactly, step by step, with every check. Open one pull request with the tool, its tests, README.md (name, version, owner, where data lives) and cost.md / security.md; report in the PR what passed and what you could not do. Never add a key, a payment card or a paid service; list anything paid as a person step. Stop and ask in the issue before anything irreversible.\n\n`;
  const brief = buildBriefText(p);
  return {title, slug, label: "build", body: head0 + brief, short: brief.length + head0.length > 6500, url: `https://github.com/${buildRepo()}/issues/new?${new URLSearchParams({title, labels: "build", body: brief.length + head0.length > 6500 ? head0 + "(paste the BUILD BRIEF here — PT copied it to your clipboard)" : head0 + brief}).toString()}`};
}
/* ---------- laptop tasks: every person step, with the gate rules in words ---------- */
function personSteps(p){
  const S = [];
  for (const c of arr(p.arch && p.arch.components).filter(c => c.kind === "human")) S.push({id: "c:" + c.id, text: c.role || c.name, from: "design"});
  arr(p.arch && p.arch.humanSteps).forEach((h, i) => S.push({id: "h:" + i, text: str(h), from: "design"}));
  const rb = typeof kitDecided === "function" ? kitDecided(p, "rebuild", ["pay", "clean", "rea", "without"]) : null;
  if (rb && rb.kind === "rea") S.push({id: "rea", text: t("lt.rea.step", {x: typeof kit7Product === "function" ? kit7Product(p) : ""}), from: "rea"});
  if (rb && rb.kind === "pay") S.push({id: "pay", text: t("lt.pay.step", {x: typeof kit7Product === "function" ? kit7Product(p) : ""}), from: "pay"});
  return S;
}
function laptopOf(p){ if (!p.laptop) p.laptop = {}; return p.laptop; }   // ok:field  laptop state persists with the project and is written inside actions (Undo)
function laptopTaskText(p, s){
  const rules = t("lt.rules");
  const rea = s.from === "rea" ? "\n" + t("lt.rea.rules") : "";
  return `${t("lt.head", {x: p.name})}\n\n${t("lt.task")}: ${s.text}\n\n${rules}${rea}\n\n${t("lt.report")}`;
}
function laptopCard(p){
  const S = personSteps(p); if (!S.length) return "";
  const L = laptopOf(p);
  return `<section class="panel pg-laptop" data-anchor="laptop"><div class="row"><h3 style="flex:1 1 12em">${ic("cmd")} ${esc(t("lt.title"))}</h3><span class="small muted">${esc(t("lt.sub"))}</span></div>
    <div class="list">${S.map(s => { const st = (L[s.id] || {}).state || "todo"; return `<div class="item">${stSlot(st === "done" ? "ok" : st === "sent" ? "cur" : "todo")}<div class="body"><span class="small">${esc(s.text)}</span><span class="small muted">${esc(t("lt.from." + s.from))}${st === "sent" ? " · " + esc(t("lt.sent", {d: fmtDate(L[s.id].at)})) : st === "done" ? " · " + esc(t("lt.done", {d: fmtDate(L[s.id].at)})) : ""}</span></div><div class="row" style="gap:4px">${st !== "done" ? `<button class="btn xs ${st === "todo" ? "primary" : ""}" data-a="lt-copy" data-id="${esc(s.id)}">${ic("copy")}${esc(t("lt.copy"))}</button>` : ""}${st === "sent" ? `<button class="btn xs" data-a="lt-done" data-id="${esc(s.id)}">${ic("check")}${esc(t("lt.markdone"))}</button>` : st === "done" ? `<button class="btn xs ghost" data-a="lt-reset" data-id="${esc(s.id)}">${esc(t("lt.reset"))}</button>` : ""}</div></div>`; }).join("")}</div>
    <p class="hint">${esc(t("lt.hint"))}</p></section>`;
}
Object.assign(ACTIONS, {
  "lt-copy": el => { const p = curP(); if (!p) return; const s = personSteps(p).find(x => x.id === el.dataset.id); if (!s) return; copyText(laptopTaskText(p, s)); actOpen(p, t("lt.act.sent")); laptopOf(p)[s.id] = {state: "sent", at: now()}; touch(p); actCloseSoon(p.id); render(); toast(t("lt.copied"), ""); },
  "lt-done": el => { const p = curP(); if (!p) return; actOpen(p, t("lt.act.done")); laptopOf(p)[el.dataset.id] = {state: "done", at: now()}; touch(p); actCloseSoon(p.id); render(); },
  "lt-reset": el => { const p = curP(); if (!p) return; actOpen(p, t("lt.act.reset")); delete laptopOf(p)[el.dataset.id]; touch(p); actCloseSoon(p.id); render(); }
});
/* ---------- build without a chat ---------- */
function buildCard(p){
  const ready = arr(p.pkg && p.pkg.sections).length > 0;
  const issue = ready ? buildIssue(p) : null;
  const link = str(p.tool && p.tool.buildIssue).trim();
  return `<section class="panel pg-build" data-anchor="nochat"><div class="row"><h3 style="flex:1 1 12em">${ic("bolt")} ${esc(t("bw.title"))}</h3><span class="small muted">${esc(t("bw.repo", {x: buildRepo()}))}</span></div>
    <p class="small">${esc(t("bw.sub"))}</p>
    ${ready ? `<div class="row"><button class="btn primary" data-a="bw-copy">${ic("copy")}${esc(t("bw.copy"))}</button><a class="btn" href="${esc(issue.url)}" target="_blank" rel="noopener" data-a="bw-open">${ic("link")}${esc(t("bw.open"))}</a><span class="small muted">${esc(issue.short ? t("bw.paste") : t("bw.prefilled"))}</span></div>
      <label class="fld"><span>${esc(t("bw.link"))}</span><input type="text" data-bind="p:tool.buildIssue" value="${esc(link)}" placeholder="https://github.com/${esc(buildRepo())}/issues/…"></label>${link ? `<p class="small"><a class="chip tap" href="${esc(link)}" target="_blank" rel="noopener">${ic("link")}${esc(t("bw.follow"))}</a></p>` : ""}` : `<p class="small muted">${esc(t("bw.needs"))}</p>`}
    <details class="small"><summary>${esc(t("bw.setup"))}</summary><ol class="small"><li>${esc(t("bw.setup1", {x: buildRepo()}))}</li><li>${esc(t("bw.setup2"))}</li><li>${esc(t("bw.setup3"))}</li></ol><p class="small muted">${esc(t("bw.setupnote"))}</p></details></section>`;
}
ACTIONS["bw-copy"] = () => { const p = curP(); if (!p) return; const i = buildIssue(p); copyText(i.body); toast(t("bw.copied"), ""); };
ACTIONS["bw-open"] = () => {}; ACT_NO.add("bw-open");   // a plain link: the browser opens it, nothing else to do
/* ---------- your own devices: PART N ---------- */
const DEV_WORDS = /iphone|ios|ipad|android|phone os|custom os|jailbreak|firmware|smart tv|fernseher|television|apple watch|handy-betriebssystem|越狱|固件|电视|手机系统/i;
function deviceRoutes(p){
  const txt = [p.intake && p.intake.raw, (p.northStar || {}).goal, (p.northStar || {}).now].map(str).join(" ");
  if (!DEV_WORDS.test(txt)) return "";
  return `\nPART N · YOUR OWN DEVICES (Firnlab, decided 25 Oct 2026)\nBuildable, and the brief uses only these: (a) an app installed directly on the owner's iPhone in the EU (alternative distribution) or through TestFlight, so functions a store would reject still run; (b) Shortcuts and the phone's own automation; (c) apps that talk to a device's public, documented interface (TV, speaker, lamp); (d) the owner's own open device (an Android phone built to take a replacement system, a Raspberry Pi or a mini-PC) running the owner's own software, with the documented setup steps and a gate at each irreversible point.\nNot buildable, stated plainly and never attempted: replacing or modifying the operating system of the iPhone or of a device whose maker locks it, bypassing a device's protections, or reflashing firmware the maker does not publish for that purpose. Where an idea needs that, the brief names which part is buildable by (a)–(d) and which is not.\n`;
}
{ const orig = kitBriefPart; kitBriefPart = function(p){ return orig(p) + deviceRoutes(p); }; }

/* ---------- where it lives ---------- */
{ const orig = pgBody; pgBody = function(p, id){ const h = orig(p, id); if (id === "build") return buildCard(p) + laptopCard(p) + h; return h; }; }
