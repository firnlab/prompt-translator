/* ===================== 1.6.0 KIT 5: MEDIA (images, video, voice, designed output) =====================
   Decisions picked with the owner on 24 Oct 2026: engine per tool for images/video, voice and designed output — PT recommends by rule,
   every option with its cost, the owner decides; PT's own build (open models, own code, own page) is always one of the options; a hard
   media cap of CHF 10 per tool per month (the tool pauses and asks). Legal stance (owner, 24 Oct 2026): a private tool may reproduce
   a paid product's function for the owner's own use; anything published or sold uses open models or own code; PT names the licence of
   every model and whether commercial use is allowed; PT never publishes anything illegal. Facts checked 2026-10-23; prices are "about". */
const KIT_MEDIA_CAP_CHF = 10;
function kitMediaCap(){ return typeof kitSettings === "function" && kitSettings().cap != null ? num(kitSettings().cap, KIT_MEDIA_CAP_CHF) : KIT_MEDIA_CAP_CHF; }   // 1.7: editable in Settings
function kitMediaFacts(){ return KIT_MEDIA_FACTS.replace(/CHF __CAP__/g, "CHF " + kitMediaCap()); }
const KIT_MEDIA_FACTS = `Images and video: fal.ai (connector, prepaid credits, hundreds of open and commercial models; about USD 0.003–0.05 per image, video from about USD 0.05 per second; the prepaid balance is a natural cap); Google Gemini image models (Nano Banana 2.1 about USD 0.034–0.113 per image on the paid tier, which Swiss use requires; 18+; strong at editing and text in images; no video); open-weight models (Flux, Stable Diffusion families and others) run through fal.ai or on own hardware — their licences differ: some allow commercial use, some do not, so the licence is named for every model a tool uses.
Voice: the browser's own speech (free, on every phone and laptop, plainer voices, no account); ElevenLabs (connector; free about 10 minutes a month, Starter USD 5 a month; best voices and cloning of the owner's own voice only with consent); Gemini text-to-speech (pay per use on the paid tier). Speech-to-text: the browser's recognition (free, needs the internet on most devices) or Whisper-class open models (free to run, MIT-licensed weights).
Designed output: Prompt Translator's own page (an HTML artifact, free, edited through Prompt Translator; print through the browser); Canva (connector; free plan, Pro about USD 13 a month; templates, brand kit, print and social sizes); Gamma (connector; free 400 credits, Plus about USD 8 a month; decks). Media tools built by Prompt Translator always list its own build (own page, open models, own code) as one option with its cost, next to the external ones.
Legal line (the owner's decision): a private tool may rebuild a paid product's function for the owner's own use; anything published, sold or shared outside uses open models or own code and never copies a product's assets, branding, text or code; generated media carries no real person's face or voice without their consent and no other maker's logo or character; every tool records which model made each item and under which licence.
Rules: a hard media cap of CHF __CAP__ per tool per month — the tool keeps a price table in its knowledge, counts the spend of every generated item, pauses at the cap and asks the owner before continuing; every generated file is stored with its prompt, model, licence and cost; nothing is generated in a loop without a count limit; media accounts are opened only when the first tool needs them (person step with the cost).`;
const KIT_IMG_WORDS = ["image", "images", "picture", "photo", "illustration", "thumbnail", "video", "clip", "animation", "bild", "foto", "illustration", "视频", "图片", "图像", "照片", "插图", "动画"];
const KIT_VOICE_WORDS = ["voice", "speech", "speak", "read aloud", "narrat", "audio", "podcast", "dictat", "transcri", "stimme", "sprach", "vorlesen", "语音", "朗读", "音频", "播客", "转录"];
const KIT_DESIGN_WORDS = ["slides", "deck", "presentation", "poster", "flyer", "social graphic", "instagram", "logo", "brand", "print", "layout", "präsentation", "plakat", "folien", "幻灯片", "海报", "标志", "品牌", "版式"];
function kit5Text(p){ const ns = p.northStar || {}, comps = arr(p.arch && p.arch.components), home = (p.tool && p.tool.home) || {}; return [ns.goal, ns.success, p.intake && p.intake.raw, ...comps.map(c => c.name + " " + c.role + " " + c.inputs + " " + c.outputs), home.where, home.parts, ...arr(p.requirements).map(r => r.title + " " + r.then)].map(str).join(" ").toLowerCase(); }
function kit5Img(p){ const txt = kit5Text(p); return KIT_IMG_WORDS.some(w => txt.includes(w)); }
function kit5Voice(p){ const txt = kit5Text(p); return KIT_VOICE_WORDS.some(w => txt.includes(w)); }
function kit5Design(p){ const txt = kit5Text(p); return KIT_DESIGN_WORDS.some(w => txt.includes(w)); }
function kit5Applies(p){ return !!(p && arr(p.arch && p.arch.components).length && (kit5Img(p) || kit5Voice(p) || kit5Design(p))); }
function kit5Public(p){ const txt = kit5Text(p), aud = p.audience || {}; return aud.customers === true || /publish|sell|customers|public|share|veröffentl|verkauf|kunden|öffentlich|发布|销售|客户|公开/.test(txt); }
const KIT_IMG = ["fal", "gemini", "open"], KIT_VOICE = ["browser", "elevenlabs", "gemini"], KIT_DESIGN = ["own", "canva", "gamma"];
function kitImgRec(p){ const txt = kit5Text(p); if (/edit|retouch|text in|caption on|typography|bearbeit|retusch|编辑|修图/.test(txt)) return {kind: "gemini", why: t("kit.rec.img.gemini")}; if (kit5Public(p)) return {kind: "open", why: t("kit.rec.img.open")}; return {kind: "fal", why: t("kit.rec.img.fal")}; }
function kitVoiceRec(p){ return kit5Public(p) ? {kind: "elevenlabs", why: t("kit.rec.voice.eleven")} : {kind: "browser", why: t("kit.rec.voice.browser")}; }
function kitDesignRec(p){ const txt = kit5Text(p); if (/deck|slides|presentation|präsentation|folien|幻灯片/.test(txt)) return {kind: "gamma", why: t("kit.rec.design.gamma")}; if (/print|poster|flyer|instagram|social|brand|logo|plakat|品牌|海报|标志/.test(txt)) return {kind: "canva", why: t("kit.rec.design.canva")}; return {kind: "own", why: t("kit.rec.design.own")}; }
const KIT5 = [
  {key: "img", allowed: KIT_IMG, rec: kitImgRec, q: "kit.q.img", opt: "kit.i.", tip: "kit.it.", act: "kit.act.img", when: kit5Img},
  {key: "voice", allowed: KIT_VOICE, rec: kitVoiceRec, q: "kit.q.voice", opt: "kit.v.", tip: "kit.vt.", act: "kit.act.voice", when: kit5Voice},
  {key: "design", allowed: KIT_DESIGN, rec: kitDesignRec, q: "kit.q.design", opt: "kit.d.", tip: "kit.dt.", act: "kit.act.design", when: kit5Design}
];
function kitSet5(p, d, kind, rec){ return kitSet(p, d.key, kind, {allowed: d.allowed, rec, qKey: d.q, optKey: d.opt, actKey: d.act, dests: ["handoff", "knowledge", "instructions", "artifact"]}); }
function kit5Queue(p, add){
  if (!kit5Applies(p)) return;
  const cls = arr(p.pkg && p.pkg.sections).length ? "block" : "should";
  for (const d of KIT5) if (d.when(p) && !kitDecided(p, d.key, d.allowed)){ const rec = d.rec(p); add({kind: "kit-" + d.key, ref: "kit:" + d.key, ph: "arch", cls, who: "you", title: t(d.q), why: t("kit.q.why", {x: t(d.opt + rec.kind)})}); }
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); kit5Queue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    const d = x && KIT5.find(d => x.kind === "kit-" + d.key);
    if (d){ const O = [], rec = d.rec(p); for (const k of d.allowed) O.push({label: t(d.opt + k), run: () => kitSet5(p, d, k, rec), star: rec.kind === k, why: rec.kind === k ? rec.why : t(d.tip + k)}); return O; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ const d = KIT5.find(d => ref === "kit:" + d.key); return d ? t(d.q) : orig(p, ref, full); }; }
const KIT_MEDIA_WORDING = {
  img: {label: "Images and video", fal: "fal.ai (prepaid credits; the chosen model's licence named; about USD 0.003–0.05 per image)", gemini: "Google Gemini image models (paid tier, about USD 0.034–0.113 per image; editing and text in images; no video)", open: "an open-weight model with a licence that allows this use, run through fal.ai or own code (the licence named per model)"},
  voice: {label: "Voice", browser: "the browser's own speech and recognition (free, no account)", elevenlabs: "ElevenLabs (free minutes first, Starter USD 5 a month; cloning only of the owner's own voice with consent)", gemini: "Gemini text-to-speech (pay per use on the paid tier)"},
  design: {label: "Designed output", own: "Prompt Translator's own page (HTML artifact, free; print through the browser)", canva: "Canva (free plan; Pro about USD 13 a month for brand kit and templates)", gamma: "Gamma (free 400 credits; Plus about USD 8 a month)"}
};
function kit5PromptBlock(p){
  if (!kit5Applies(p)) return "";
  const lines = KIT5.filter(d => d.when(p)).map(d => { const dec = kitDecided(p, d.key, d.allowed), rec = d.rec(p), W = KIT_MEDIA_WORDING[d.key]; return `- ${W.label}: ${dec ? "DECIDED by the person — " + W[dec.kind] + ". Build exactly this." : "not decided yet. Prompt Translator recommends " + W[rec.kind] + " (" + rec.why + "). Design for that and list every option with its cost; Prompt Translator's own build is always one of them."}`; });
  return `\n<kit_media facts_checked="${KIT_CHECKED}">\n${kitMediaFacts()}\nThis tool is ${kit5Public(p) ? "PUBLIC or sold: open models or own code only, nothing copied from a paid product" : "PRIVATE to the owner: rebuilding a paid product's function for own use is allowed; the licence of every model is still named"}.\nDecisions for this tool:\n${lines.join("\n")}\n- Media cap: CHF ${KIT_MEDIA_CAP_CHF} a month for this tool, hard stop with a question to the owner.\n</kit_media>`;
}
KIT_PROMPT_PARTS.push(kit5PromptBlock);
function kit5BriefSteps(p){
  if (!kit5Applies(p)) return [];
  const S = [], g = k => kitDecided(p, k, (KIT5.find(d => d.key === k) || {}).allowed || []);
  const parts = KIT5.filter(d => d.when(p)).map(d => { const dec = g(d.key); return KIT_MEDIA_WORDING[d.key].label + ": " + (dec ? KIT_MEDIA_WORDING[d.key][dec.kind] : "not decided — build with the free option (browser voice / own page / an open model) behind an interface and list the decision as a person step"); });
  S.push({title: "Media engines · Firnlab kit 5", body: `${parts.join(". ")}. Every generated item is stored with its prompt, model, licence and cost; ${kit5Public(p) ? "this tool is public or sold: only models whose licence allows commercial use, nothing copied from a paid product, no real person's face or voice without consent, no other maker's logo or character" : "this tool is private to the owner: the licence of every model is still recorded"}. Accounts (fal.ai, ElevenLabs, Canva, Gamma, Google) are opened by the person when first needed — list each as a person step with its cost; until then the tool runs with the free option.`,
    check: "one generated item exists with prompt, model, licence and cost recorded; the licence allows this tool's use; no account was created by the build."});
  S.push({title: "Media cap", body: `A price table (per image, per second of video, per 1,000 characters of speech) lives in the tool's knowledge (prices.md, dated); every generation adds its cost to this month's total in the tool's storage; at CHF ${kitMediaCap()} the tool stops generating, shows the total and asks the owner before continuing; no generation runs in a loop without a count limit.`,
    check: "set the month's total to CHF 9.99 by hand, generate once more: the tool stops and asks; reset: it continues."});
  return S;
}
{ const orig = kitBriefSteps; kitBriefSteps = function(p){ return [...orig(p), ...kit5BriefSteps(p)]; }; }
{ const orig = kitBriefPart; kitBriefPart = function(p){ return orig(p) + (kit5Applies(p) ? `\nPART J · MEDIA RULES (Firnlab kit 5, facts checked ${KIT_CHECKED})\n${kitMediaFacts()}\nDecided: ${KIT5.filter(d => d.when(p)).map(d => d.key + " = " + ((kitDecided(p, d.key, d.allowed) || {}).kind || "open")).join(" · ")} · cap CHF ${KIT_MEDIA_CAP_CHF}/month · ${kit5Public(p) ? "public" : "private"}.` : ""); }; }
PROOF_MODES.push({id: "cap", tr: [...KIT_IMG_WORDS, ...KIT_VOICE_WORDS, ...KIT_DESIGN_WORDS],
  ai: "Generated media is capped and traceable: a hard monthly spend cap per tool stops generation and asks the owner; every generated item records its prompt, model, licence and cost; only models whose licence allows the tool's use; no real person's face or voice without consent, no other maker's logo or character."});
PROOF_IDS.push("cap");
