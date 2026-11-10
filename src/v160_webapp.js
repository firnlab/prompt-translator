/* ===================== 1.6.0 KIT 3: WEB APP + PAYMENTS =====================
   Decisions picked with the owner on 24 Oct 2026: hosting, payments, backend and login are decided per app — PT recommends by rule and
   shows every option with its cost; the owner decides. Build-or-use: PT scores its own build against an external builder (Lovable and
   the like) with the Balanced weights and the owner chooses. Prices re-checked on 10 Nov 2026 (2.2.0, item 7) on the vendors' own pages
   only (developers.cloudflare.com/pages/platform/limits, netlify.com/pricing, vercel.com/docs/plans/hobby and pro-plan,
   support.stripe.com Swiss pricing, docs.stripe.com/payments/twint, docs.lemonsqueezy.com fees, supabase.com/pricing and
   docs/guides/platform/spend-cap); the third-party survey of 16 Sep is no longer a source. Pages that could not be read that day
   (Paddle, Lovable) are named in the sentence with the date last read. */
const KIT_WEB_FACTS = `Hosting a web app (checked 10 Nov 2026 on the vendors' own pages): Cloudflare Pages free plan — 500 builds a month (one at a time), 100 custom domains per project, up to 20,000 files, Workers (server code) and D1 (SQL database) have free tiers; Netlify free — a 300-credit limit (a production deploy costs 15), paid from USD 9 a month (Personal); Vercel Hobby — personal, non-commercial use only, and at its limits a feature pauses until 30 days have passed, and it cannot deploy a private repository that belongs to a GitHub organisation such as firnlab (checked 7 Nov 2026 on vercel.com/docs/git), so for a private firnlab repository it is Pro USD 20 a month (one deploying seat, more seats USD 20 each) with USD 20 of monthly credit that expires at month end and spend-management alerts from USD 200 by default, or Cloudflare; GitHub Pages — free static hosting from the repository, no server code. Every one takes a custom domain; a domain is bought only when the app needs one.
Payments: Stripe — 2.9 % + CHF 0.30 per Swiss card and 3.25 % + CHF 0.30 per card issued outside Switzerland (checked 10 Nov 2026), TWINT available for a Swiss account (prices in CHF, CHF 0.50–5,000 per payment, refunds within 180 days; the website must show the legal name, address and terms before TWINT is approved), Checkout and Payment Links need no server of your own but a webhook to confirm; you are the seller and handle VAT and invoices. A merchant of record (Paddle, Lemon Squeezy) — Lemon Squeezy 5 % + USD 0.50 plus 1.5 % for payments outside the US and 0.5 % for subscriptions (checked 10 Nov 2026 on its own fee page); Paddle about 5 % + 50 c (its own page could not be read on 10 Nov 2026: re-check before the first sale); they are the seller, handle worldwide VAT, invoices and refunds, pay out to you; no TWINT. No monthly fee either way; an account is opened only when the first app sells.
Backend: Supabase — login (magic link, passkeys, Google/Apple), Postgres with row-level security, storage; Free pauses after 7 days without use, Pro from USD 25 a month with a spend cap that is on by default and blocks usage over quota until the next cycle, but never caps compute, custom domains, IPv4 addresses, extra disk IOPS, log drains, phone MFA or point-in-time recovery (checked 10 Nov 2026); right when users log in or pay. Cloudflare D1 + Workers — free tier, commercial allowed, no built-in login. None — a static app with the user's own browser or a Prompt Translator page as its store.
Builders: Lovable — about USD 25 a month plus credits (last read 23 Oct 2026; its own plans page could not be read on 10 Nov 2026 and its pricing changed on 31 Oct: re-check before choosing it); exports code to GitHub; lock-in is low once the code is in your repository. The build-or-use card scores both routes (PT builds in GitHub / an external builder) on effort, upkeep, CHF a month, lock-in, risk and ceiling, each 0–3 with weight 2 (Balanced): a total of 10 or less is a go, 11–18 a go with a note, 19 or more a rethink; a commodity part is bought or reused, a core part is built; build time is estimated × 1.5 plus a test pass; any part that holds personal data must show its row-level security and login check.
Rules for every web app: the code lives in the GitHub repository firnlab/<slug> (the owner's) with the quick gate; secrets only in the host's or GitHub's secret store, never in the client; Stripe is used with a restricted key per service (Stripe's own recommendation for keys given to AI agents, checked 7 Nov 2026 on docs.stripe.com/keys/restricted-api-keys), never the secret key, and every key lives only in GitHub's secret store; the client never decides a price or an entitlement — the server (or the payment provider's webhook, verified by signature) does; every webhook handler is idempotent (event id recorded) and replays are ignored; a failed payment, a refund and a cancelled subscription each have a tested path; personal data has a delete-my-account path; the app works on a phone first (16 px gutters, no horizontal scroll), with light and dark mode; a staging deployment and a production deployment, releases tagged in the repository.`;
const KIT_WEB_WORDS = ["web app", "webapp", "website", "web site", "landing page", "shop", "store", "checkout", "subscription", "subscribe", "sign up", "signup", "log in", "login", "account", "customers pay", "paywall", "saas", "online shop", "webseite", "webshop", "abo", "anmeld", "konto", "bezahl", "网站", "网页应用", "商店", "订阅", "登录", "账户", "支付"];
const KIT_WEB_STRONG = ["web app", "webapp", "website", "web site", "landing page", "online shop", "webshop", "saas", "webseite", "网站", "网页应用"];
const KIT_PAY_WORDS = ["pay", "payment", "price", "subscription", "subscribe", "checkout", "sell", "buy", "chf", "usd", "eur", "invoice", "bezahl", "preis", "abo", "verkauf", "kauf", "rechnung", "支付", "付款", "价格", "订阅", "购买", "发票"];
const KIT_LOGIN_WORDS = ["log in", "login", "sign in", "sign up", "signup", "account", "user", "member", "profile", "anmeld", "konto", "benutzer", "mitglied", "profil", "登录", "注册", "账户", "用户", "会员"];
const KIT_SERVER_WORDS = ["database", "save", "store", "history", "sync", "share", "multi-user", "team", "api", "webhook", "datenbank", "speicher", "verlauf", "teilen", "数据库", "保存", "历史", "同步", "共享"];
function kit3Text(p){ const ns = p.northStar || {}, comps = arr(p.arch && p.arch.components), home = (p.tool && p.tool.home) || {}; return [ns.goal, ns.users, ns.success, p.intake && p.intake.raw, ...comps.map(c => c.name + " " + c.role + " " + c.inputs + " " + c.outputs), home.where, home.parts, ...arr(p.requirements).map(r => r.title + " " + r.then)].map(str).join(" ").toLowerCase(); }
function kit3Applies(p){
  if (!p || !arr(p.arch && p.arch.components).length) return false;
  const home = str(p.tool && p.tool.home && p.tool.home.where).toLowerCase() + " " + str(p.tool && p.tool.home && p.tool.home.parts).toLowerCase();
  if (KIT_WEB_HOME.test(home)) return true;
  if (/artifact|scheduled|task|aufgabe|定时/.test(home)) return false;   // a page is kit 1, a scheduled tool kit 2
  const txt = kit3Text(p);
  return KIT_WEB_STRONG.some(w => txt.includes(w)) && !kitApplies(p);
}
function kit3Pays(p){ const txt = kit3Text(p); return KIT_PAY_WORDS.some(w => txt.includes(w)); }
function kit3Logs(p){ const txt = kit3Text(p); return KIT_LOGIN_WORDS.some(w => txt.includes(w)) || kit3Pays(p); }
const KIT_HOST = ["cloudflare", "github", "netlify", "vercel"], KIT_PAY = ["mor", "stripe", "none"], KIT_BACKEND = ["none", "cloudflare", "supabase"], KIT_LOGIN = ["magic", "social", "password"];
function kitHostRec(p){ const txt = kit3Text(p); if (!kit3Pays(p) && !kit3Logs(p) && !KIT_SERVER_WORDS.some(w => txt.includes(w))) return {kind: "github", why: t("kit.rec.host.github")}; return {kind: "cloudflare", why: t("kit.rec.host.cloudflare")}; }
function kitPayRec(p){ if (!kit3Pays(p)) return {kind: "none", why: t("kit.rec.pay.none")}; const txt = kit3Text(p); if (/switzerland|swiss|schweiz|twint|physical|ship|versand|瑞士|实物|邮寄/.test(txt)) return {kind: "stripe", why: t("kit.rec.pay.stripe")}; return {kind: "mor", why: t("kit.rec.pay.mor")}; }
function kitBackendRec(p){ const txt = kit3Text(p); if (kit3Logs(p)) return {kind: "supabase", why: t("kit.rec.backend.supabase")}; if (KIT_SERVER_WORDS.some(w => txt.includes(w))) return {kind: "cloudflare", why: t("kit.rec.backend.cloudflare")}; return {kind: "none", why: t("kit.rec.backend.none")}; }
function kitLoginRec(p){ return {kind: "magic", why: t("kit.rec.login.magic")}; }
const KIT3 = [
  {key: "host", allowed: KIT_HOST, rec: kitHostRec, q: "kit.q.host", opt: "kit.h.", tip: "kit.ht.", act: "kit.act.host", when: () => true},
  {key: "pay", allowed: KIT_PAY, rec: kitPayRec, q: "kit.q.pay", opt: "kit.p.", tip: "kit.pt.", act: "kit.act.pay", when: p => kit3Pays(p)},
  {key: "backend", allowed: KIT_BACKEND, rec: kitBackendRec, q: "kit.q.backend", opt: "kit.b.", tip: "kit.bt.", act: "kit.act.backend", when: () => true},
  {key: "login", allowed: KIT_LOGIN, rec: kitLoginRec, q: "kit.q.login", opt: "kit.l.", tip: "kit.lt.", act: "kit.act.login", when: p => kit3Logs(p)}
];
function kitSet3(p, d, kind, rec){ return kitSet(p, d.key, kind, {allowed: d.allowed, rec, qKey: d.q, optKey: d.opt, actKey: d.act, dests: ["handoff", "knowledge", "instructions"]}); }
function kit3Queue(p, add){
  if (!kit3Applies(p)) return;
  const cls = arr(p.pkg && p.pkg.sections).length ? "block" : "should";
  for (const d of KIT3) if (d.when(p) && !kitDecided(p, d.key, d.allowed)){ const rec = d.rec(p); add({kind: "kit-" + d.key, ref: "kit:" + d.key, ph: "arch", cls, who: "you", title: t(d.q), why: t("kit.q.why", {x: t(d.opt + rec.kind)})}); }
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); kit3Queue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    const d = x && KIT3.find(d => x.kind === "kit-" + d.key);
    if (d){ const O = [], rec = d.rec(p); for (const k of d.allowed) O.push({label: t(d.opt + k), run: () => kitSet3(p, d, k, rec), star: rec.kind === k, why: rec.kind === k ? rec.why : t(d.tip + k)}); return O; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ const d = KIT3.find(d => ref === "kit:" + d.key); return d ? t(d.q) : orig(p, ref, full); }; }

function kit3PromptBlock(p){
  if (!kit3Applies(p)) return "";
  const lines = KIT3.filter(d => d.when(p)).map(d => { const dec = kitDecided(p, d.key, d.allowed), rec = d.rec(p); const W = KIT_WEB_WORDING[d.key]; return `- ${W.label}: ${dec ? "DECIDED by the person — " + W[dec.kind] + ". Build exactly this." : "not decided yet. Prompt Translator recommends " + W[rec.kind] + " (" + rec.why + "). Design for that, list every option with its cost in the options, and name it as the open decision."}`; });
  return `\n<kit_web_app facts_checked="${KIT_CHECKED}">\n${KIT_WEB_FACTS}\nDecisions for this app:\n${lines.join("\n")}\n- Build or use: score the build-or-use card for (a) Prompt Translator builds it in firnlab/${kitSlug(p)} and (b) an external builder, and put BOTH as options with their monthly cost, effort in hours and the card's total; the person chooses.\n</kit_web_app>`;
}
const KIT_WEB_WORDING = {
  host: {label: "Hosting", cloudflare: "Cloudflare Pages (free, commercial allowed; Workers and D1 free tiers for server parts)", github: "GitHub Pages (free, static only, from the repository)", netlify: "Netlify (free 300 credits a month, commercial allowed; paid from USD 9)", vercel: "Vercel Pro (USD 20 a month; the Hobby plan is personal use only)"},
  pay: {label: "Payments", mor: "a merchant of record (Paddle or Lemon Squeezy, about 5 % + 50 c; they handle VAT, invoices and refunds)", stripe: "Stripe (about 2.9 % + CHF 0.30, TWINT; you handle VAT and invoices; webhook-confirmed)", none: "no payments in this app"},
  backend: {label: "Backend", none: "none (static app; data in the user's browser or a Prompt Translator page)", cloudflare: "Cloudflare D1 + Workers (free tier; no built-in login)", supabase: "Supabase (login, Postgres with row-level security; Pro USD 25 a month once it has paying users)"},
  login: {label: "Login", magic: "e-mail magic link, passkeys offered after the first sign-in", social: "Google / Apple sign-in (their consoles and reviews are person steps)", password: "e-mail and password (reset flow, breach check and rate limit required)"}
};
KIT_PROMPT_PARTS.push(kit3PromptBlock);
function kit3BriefSteps(p){
  if (!kit3Applies(p)) return [];
  const g = k => kitDecided(p, k, (KIT3.find(d => d.key === k) || {}).allowed || []), sl = kitSlug(p), S = [];
  const host = g("host"), pay = g("pay"), be = g("backend"), lg = g("login");
  S.push({title: "Repository and hosting · Firnlab kit 3", body: `Code in the GitHub repository firnlab/${sl} (create it private if missing; quick gate workflow copied from the Prompt Translator repository; releases tagged). Hosting: ${host ? KIT_WEB_WORDING.host[host.kind] : "not decided — deploy to GitHub Pages for now and list the decision as a person step"}; one staging and one production deployment; secrets only in the host's or GitHub's secret store. Phone first, light and dark mode.`,
    check: "the staging URL opens at 390 px and 1280 px (no horizontal scroll, dark and light); the repository has the gate workflow and a tag; no secret appears in the client bundle (search it)."});
  if (kit3Pays(p)) S.push({title: "Payments", body: pay && pay.kind !== "none" ? `${KIT_WEB_WORDING.pay[pay.kind]}. Prices and entitlements are decided by the server or the provider's webhook (signature verified), never by the client; every webhook handler records the event id and ignores replays; test the paths: successful payment, failed payment, refund, cancelled subscription. The provider account is opened by the person (person step) when this app first sells; until then use the provider's test mode.` : "Payments are not decided yet: build with the provider's test mode behind an interface so either provider fits; list the decision as a person step.",
    check: "in test mode: one successful payment grants the entitlement, a replayed webhook grants nothing twice, a refund removes it, a tampered client price is rejected."});
  S.push({title: "Backend and data", body: be ? (be.kind === "none" ? "No backend: data stays in the user's browser (export and import buttons) or in a Prompt Translator page (kit 1 rules)." : be.kind === "cloudflare" ? "Cloudflare D1 + Workers: every table has an owner column; the Worker checks ownership on every read and write; a delete-my-data path exists." : "Supabase: every table has row-level security (users read and write only their own rows; the owner's service key stays server-side); a delete-my-account path removes the user's rows and files; the Free project is upgraded to Pro by the person only once the app has paying users (person step with the cost).") : "Backend not decided yet: build the static version and list the decision as a person step.",
    check: "one user cannot read or change another user's row (test with two accounts); delete-my-account leaves no row behind."});
  if (kit3Logs(p)) S.push({title: "Login", body: lg ? KIT_WEB_WORDING.login[lg.kind] + ". Sessions expire; a signed-out user sees the public pages only." : "Login not decided yet: e-mail magic link for now, behind an interface; list the decision as a person step.", check: "sign in on a phone and a laptop; a stale link is refused; a signed-out visit shows no private data."});
  return S;
}
{ const orig = kitBriefSteps; kitBriefSteps = function(p){ return [...orig(p), ...kit3BriefSteps(p)]; }; }
{ const orig = kitBriefPart; kitBriefPart = function(p){ return orig(p) + (kit3Applies(p) ? `\nPART I · WEB APP RULES (Firnlab kit 3, facts checked ${KIT_CHECKED})\n${KIT_WEB_FACTS}\nDecided: ${KIT3.filter(d => d.when(p)).map(d => d.key + " = " + ((kitDecided(p, d.key, d.allowed) || {}).kind || "open")).join(" · ")}.` : ""); }; }
PROOF_MODES.push({id: "money", tr: KIT_PAY_WORDS,
  ai: "Money is decided server-side: the client never sets a price or an entitlement; a payment counts only when the provider's webhook (signature verified) says so; every webhook is idempotent; failed payments, refunds and cancellations each have a tested path; no payment secret ever reaches the client."});
PROOF_IDS.push("money");
