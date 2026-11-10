/* ===================== 1.6.0 KIT 4: PHONE APP =====================
   Decisions picked with the owner on 24 Oct 2026: the path (installable web app or native via Expo) and the first store are decided per
   app — PT recommends, every option with its cost, the owner decides; private apps install as a web app from a private link; native
   files are built on Expo's free tier, the laptop when it runs out. Facts checked 2026-10-23; store fees as published by Apple and Google. */
const KIT_PHONE_FACTS = `An installable web app (PWA): one web page with a manifest and a service worker; "Add to Home Screen" on iPhone and Android; no store, no account, no review; updates the moment the page is republished; offline through the service worker; on iPhone it has less background and push ability than a native app and no access to some sensors. Cost CHF 0; it is hosted like a web app (kit 3) or lives as a Prompt Translator page (kit 1).
A native app via Expo (React Native): one code base for iPhone and Android, built in the cloud by Expo EAS (free plan up to 15 Android and 15 iOS builds, Starter USD 19 a month plus usage; checked 10 Nov 2026) or on the owner's laptop (free, slower); distributed through the stores — Apple Developer Program USD 99 a year and App Review; Google Play USD 25 once (store fees last read 23 Oct 2026, not re-checked on 10 Nov) and a review with a 14-day closed test for new personal accounts — or privately: TestFlight (iPhone, up to 100 testers, needs the Apple account), Google Play internal testing, or a direct Android file.
Rules for every phone app: phone first (one hand, 16 px gutters, large tap targets, no horizontal scroll), light and dark mode, works offline for what it already loaded, asks for camera, location or notifications only when first used and keeps working when refused, keeps the person's data where the person decided (kit 1 and kit 3 rules), stores nothing personal in analytics, and has a delete-my-data path. Store accounts are opened only when the first native app needs them (person step with the cost); a private app never needs one.`;
const KIT_PHONE_WORDS = ["phone app", "mobile app", "iphone app", "android app", "ios app", "app for my phone", "on my phone", "home screen", "app store", "play store", "native app", "handy-app", "smartphone-app", "手机应用", "手机 app", "安卓", "iphone 应用", "应用商店"];
const KIT_NATIVE_WORDS = ["push notification", "background", "bluetooth", "nfc", "health data", "healthkit", "widget", "app store", "play store", "in-app purchase", "offline-first", "camera roll", "contacts", "benachrichtigung", "hintergrund", "推送", "后台", "蓝牙", "应用商店", "应用内购买"];
function kit4Text(p){ const ns = p.northStar || {}, comps = arr(p.arch && p.arch.components), home = (p.tool && p.tool.home) || {}; return [ns.goal, ns.users, p.intake && p.intake.raw, ...comps.map(c => c.name + " " + c.role + " " + c.outputs), home.where, home.parts, ...arr(p.requirements).map(r => r.title + " " + r.then)].map(str).join(" ").toLowerCase(); }
function kit4Applies(p){ if (!p || !arr(p.arch && p.arch.components).length) return false; const home = str(p.tool && p.tool.home && p.tool.home.where).toLowerCase() + " " + str(p.tool && p.tool.home && p.tool.home.parts).toLowerCase(); if (/phone app|mobile app|native app|expo|手机应用/.test(home)) return true; const txt = kit4Text(p); return KIT_PHONE_WORDS.some(w => txt.includes(w)); }
function kit4Private(p){ const aud = p.audience || {}; return aud.customers !== true && !/customers|public|users|sell|publish|kunden|öffentlich|verkauf|客户|公开|销售/.test(kit4Text(p)); }
const KIT_PATH = ["pwa", "native"], KIT_STORE = ["android", "ios", "both"];
function kitPathRec(p){ const txt = kit4Text(p); return KIT_NATIVE_WORDS.some(w => txt.includes(w)) ? {kind: "native", why: t("kit.rec.path.native")} : {kind: "pwa", why: t("kit.rec.path.pwa")}; }
function kitStoreRec(p){ const txt = kit4Text(p); return /iphone|ios|apple|swiss|schweiz|瑞士/.test(txt) && !/android/.test(txt) ? {kind: "ios", why: t("kit.rec.store.ios")} : {kind: "android", why: t("kit.rec.store.android")}; }
function kit4Native(p){ const d = kitDecided(p, "path", KIT_PATH); return d ? d.kind === "native" : kitPathRec(p).kind === "native"; }
const KIT4 = [
  {key: "path", allowed: KIT_PATH, rec: kitPathRec, q: "kit.q.path", opt: "kit.pa.", tip: "kit.pat.", act: "kit.act.path", when: () => true},
  {key: "store", allowed: KIT_STORE, rec: kitStoreRec, q: "kit.q.store", opt: "kit.s.", tip: "kit.st.", act: "kit.act.store", when: p => kit4Native(p) && !kit4Private(p)}
];
function kitSet4(p, d, kind, rec){ return kitSet(p, d.key, kind, {allowed: d.allowed, rec, qKey: d.q, optKey: d.opt, actKey: d.act, dests: ["handoff", "knowledge", "instructions"]}); }
function kit4Queue(p, add){
  if (!kit4Applies(p)) return;
  const cls = arr(p.pkg && p.pkg.sections).length ? "block" : "should";
  for (const d of KIT4) if (d.when(p) && !kitDecided(p, d.key, d.allowed)){ const rec = d.rec(p); add({kind: "kit-" + d.key, ref: "kit:" + d.key, ph: "arch", cls, who: "you", title: t(d.q), why: t("kit.q.why", {x: t(d.opt + rec.kind)})}); }
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); kit4Queue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    const d = x && KIT4.find(d => x.kind === "kit-" + d.key);
    if (d){ const O = [], rec = d.rec(p); for (const k of d.allowed) O.push({label: t(d.opt + k), run: () => kitSet4(p, d, k, rec), star: rec.kind === k, why: rec.kind === k ? rec.why : t(d.tip + k)}); return O; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ const d = KIT4.find(d => ref === "kit:" + d.key); return d ? t(d.q) : orig(p, ref, full); }; }
const KIT_PHONE_WORDING = {
  path: {label: "Path", pwa: "an installable web app (CHF 0, no store, instant updates; hosted per kit 3 or as a Prompt Translator page)", native: "a native app via Expo (React Native), built on EAS's free tier, the laptop when it runs out"},
  store: {label: "First store", android: "Google Play first (USD 25 once, 14-day closed test for a new account)", ios: "the App Store first (Apple Developer USD 99 a year, App Review)", both: "both stores (USD 124 the first year, two reviews)"}
};
function kit4PromptBlock(p){
  if (!kit4Applies(p)) return "";
  const lines = KIT4.filter(d => d.when(p)).map(d => { const dec = kitDecided(p, d.key, d.allowed), rec = d.rec(p), W = KIT_PHONE_WORDING[d.key]; return `- ${W.label}: ${dec ? "DECIDED by the person — " + W[dec.kind] + ". Build exactly this." : "not decided yet. Prompt Translator recommends " + W[rec.kind] + " (" + rec.why + "). Design for that and list every option with its cost."}`; });
  return `\n<kit_phone_app facts_checked="${KIT_CHECKED}">\n${KIT_PHONE_FACTS}\nThis app is ${kit4Private(p) ? "PRIVATE (the owner, maybe one more person): it installs as a web app from a private link; no store account" : "for other people"}.\nDecisions for this app:\n${lines.join("\n")}\n</kit_phone_app>`;
}
KIT_PROMPT_PARTS.push(kit4PromptBlock);
function kit4BriefSteps(p){
  if (!kit4Applies(p)) return [];
  const path = kitDecided(p, "path", KIT_PATH), store = kitDecided(p, "store", KIT_STORE), native = kit4Native(p), S = [];
  if (!native || !path) S.push({title: "Installable web app · Firnlab kit 4", body: `Build the app as an installable web app: a manifest (name, icons 192 and 512 px, theme colours for light and dark), a service worker that caches the app shell and what was loaded, "Add to Home Screen" explained once on first visit (iPhone: Share › Add to Home Screen). ${kit4Private(p) ? "Private: the link is shared only with the person; nothing is listed anywhere." : "Hosted per the web-app rules."}${path ? "" : " (The person has not decided the path yet: this is the default; list the decision as a person step.)"}`,
    check: "install it on an iPhone and an Android phone from the link; open it offline — the last screen still shows; a permission refused once leaves the app working."});
  if (native && path) S.push({title: "Native app via Expo · Firnlab kit 4", body: `Expo (React Native) project in the GitHub repository firnlab/${kitSlug(p)}; EAS Build on the free tier (the laptop as the fallback, set up once as a person step); ${kit4Private(p) ? "private distribution: TestFlight / internal testing or a direct Android file — the person decides which account to open, if any" : store ? KIT_PHONE_WORDING.store[store.kind] : "the first store is not decided yet — list it as a person step with both costs"}. Store accounts are opened by the person (person step with the exact cost); until then builds are internal.`,
    check: "one EAS build succeeds and installs on a test phone; permissions are asked at first use only; the store listing texts exist in the app's language; no account was created by the build."});
  return S;
}
{ const orig = kitBriefSteps; kitBriefSteps = function(p){ return [...orig(p), ...kit4BriefSteps(p)]; }; }
{ const orig = kitBriefPart; kitBriefPart = function(p){ return orig(p) + (kit4Applies(p) ? `\nPART K · PHONE APP RULES (Firnlab kit 4, facts checked ${KIT_CHECKED})\n${KIT_PHONE_FACTS}\nDecided: ${KIT4.filter(d => d.when(p)).map(d => d.key + " = " + ((kitDecided(p, d.key, d.allowed) || {}).kind || "open")).join(" · ") || "path = open"} · ${kit4Private(p) ? "private" : "for others"}.` : ""); }; }
