/* ===================== 1.6.0 KIT PIECE: AN EXISTING (PAID) PRODUCT =====================
   Decided with the owner on 24 Oct 2026: when an idea names a product that already does the job, PT puts the whole picture in front of
   the owner as one pick — pay for it, rebuild the function clean-room with open models, take it apart privately (REA), or do without —
   with the legal line stated plainly; PT recommends, the owner decides, and PT never publishes anything illegal. */
const KIT_REBUILD_FACTS = `When a paid product already does the job, four honest routes exist:
1. Pay for it — its price per month, what it gives, the lock-in; often the cheapest route in hours.
2. Rebuild the function clean-room — observe what the product does as a user and build the same behaviour with own code and open models (for dictation: Whisper-class models, MIT-licensed; for text: open-weight models with a commercial licence); legal for private and for public or sold use, because only the behaviour is rebuilt, never the code, the assets, the texts or the brand.
3. Take the product apart (reverse engineering, for example with the REA tool, which is MIT-licensed) — Swiss copyright law (URG Art. 21) allows decompiling only for interoperability; a product's terms of use almost always forbid reverse engineering; so this route is for the owner's own experimenting on the owner's own machine, never for anything that is published, sold, shared or that leaves that machine; REA itself is used only on software whose licence allows it.
4. Do without — what is lost, what the manual way costs.
Rules: a tool that is published, sold or shared with anyone uses route 1, 2 or 4 only; route 3 is never recommended and never appears in a build brief for a public tool; every rebuilt tool records which product's behaviour it follows and that no code, asset, text or brand was copied; the price of route 1 is checked on the maker's page at build time (cost when needed).`;
const KIT_REBUILD_WORDS = ["like ", "similar to", "the same as", "instead of paying", "instead of", "replace ", "copy of", "clone", "rebuild", "re-build", "reverse engineer", "take apart", "wie ", "ähnlich wie", "statt ", "nachbauen", "kopieren", "ersetzen", "类似", "像 ", "替代", "复刻", "克隆", "逆向"];
const KIT_PRODUCTS = ["wispr flow", "wisprflow", "whisper flow", "notion", "otter", "grammarly", "canva", "lovable", "chatgpt", "zapier", "make.com", "n8n", "todoist", "evernote", "obsidian", "readwise", "superhuman", "descript", "loom", "calendly", "typeform", "airtable", "jasper", "copy.ai", "midjourney", "elevenlabs", "dropbox", "1password", "spotify", "duolingo", "headspace", "strava"];
function kit7Text(p){ const ns = p.northStar || {}; return [p.intake && p.intake.raw, ns.goal, ns.problem, ns.now, ...arr(p.requirements).map(r => r.title + " " + r.then)].map(str).join(" ").toLowerCase(); }
const KIT_REBUILD_STRONG = /(?:instead of paying for|instead of|replace|clone of|copy of|rebuild|re-build|like|similar to|the same as|statt|nachbauen|kopieren|ersetzen|wie|ähnlich wie|替代|复刻|克隆|类似|像)\s+([A-Z][\w.]*(?:\s[A-Z][\w.]*)?)/;
function kit7Product(p){
  const txt = kit7Text(p);
  const named = KIT_PRODUCTS.find(x => new RegExp("(^|[^a-z0-9])" + x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)").test(txt));   // whole words only ("descript" never matches "description")
  if (named) return named;
  const m = KIT_REBUILD_STRONG.exec([p.intake && p.intake.raw, (p.northStar || {}).goal].map(str).join(" "));
  return m && !/^(The|A|An|I|It|This|That|My|Our|We|You|He|She|They|And|Or|For|To|In|On|At|With|Raw|Then|Also|If|When)$/.test(m[1]) ? m[1] : "";
}
function kit7Applies(p){
  if (!p || !str(p.intake && p.intake.raw).trim() && !str(p.northStar && p.northStar.goal).trim()) return false;
  const prod = kit7Product(p); if (!prod) return false;
  // a known product named at all, or any capitalised name after an explicit rebuild phrase
  return KIT_PRODUCTS.includes(prod) || /(?:instead of paying for|instead of|replace|clone of|copy of|rebuild|re-build|statt|nachbauen|kopieren|ersetzen|替代|复刻|克隆)\s+[A-Z]/.test([p.intake && p.intake.raw, (p.northStar || {}).goal].map(str).join(" "));
}
function kit7Public(p){ const aud = p.audience || {}; return aud.customers === true || /publish|sell|customers|public|share|veröffentl|verkauf|kunden|öffentlich|发布|销售|客户|公开/.test(kit7Text(p)); }
const KIT_REBUILD = ["pay", "clean", "rea", "without"];
function kitRebuildRec(p){ return {kind: "clean", why: t(kit7Public(p) ? "kit.rec.clean.public" : "kit.rec.clean.private", {x: kit7Product(p)})}; }
function kitSetRebuild(p, kind, rec){ return kitSet(p, "rebuild", kind, {allowed: KIT_REBUILD, rec, qKey: "kit.q.rebuild", optKey: "kit.rb.", actKey: "kit.act.rebuild", dests: ["handoff", "instructions", "knowledge"]}); }
function kit7Queue(p, add){
  if (!kit7Applies(p) || kitDecided(p, "rebuild", KIT_REBUILD)) return;
  const rec = kitRebuildRec(p);
  add({kind: "kit-rebuild", ref: "kit:rebuild", ph: "capture", cls: arr(p.pkg && p.pkg.sections).length ? "block" : "should", who: "you", hard: true, title: t("kit.q.rebuild", {x: kit7Product(p)}), why: t("kit.q.why", {x: t("kit.rb.clean")})});
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); kit7Queue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    if (x && x.kind === "kit-rebuild"){ const O = [], rec = kitRebuildRec(p), pub = kit7Public(p);
      for (const k of KIT_REBUILD){ if (k === "rea" && pub) continue;   // never offered for anything that leaves the owner's machine
        O.push({label: t("kit.rb." + k), run: () => kitSetRebuild(p, k, rec), star: rec.kind === k, why: rec.kind === k ? rec.why : t("kit.rbt." + k)}); }
      return O; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ return ref === "kit:rebuild" ? t("kit.q.rebuild", {x: p ? kit7Product(p) : ""}) : orig(p, ref, full); }; }
const KIT_REBUILD_WORDING = {pay: "pay for the product (its current price is checked on the maker's page; a person step)", clean: "rebuild the function clean-room: the behaviour observed as a user, own code and open models with a commercial licence, nothing copied (no code, assets, texts or brand)", rea: "take the product apart privately (REA, MIT) for the owner's own experimenting on the owner's own machine only — nothing of it is published, sold, shared or leaves that machine; REA only on software whose licence allows it", without: "do without the product; the manual way is described with its cost in time"};
function kit7PromptBlock(p){
  if (!kit7Applies(p)) return "";
  const dec = kitDecided(p, "rebuild", KIT_REBUILD), rec = kitRebuildRec(p);
  return `\n<kit_existing_product facts_checked="${KIT_CHECKED}" product="${esc(kit7Product(p))}">\n${KIT_REBUILD_FACTS}\nThis tool is ${kit7Public(p) ? "PUBLIC, sold or shared: routes 1, 2 and 4 only" : "PRIVATE to the owner"}.\nDecision: ${dec ? "DECIDED by the person — " + KIT_REBUILD_WORDING[dec.kind] + ". Build exactly this." : "not decided yet. Prompt Translator recommends to " + KIT_REBUILD_WORDING[rec.kind] + " (" + rec.why + "). Put every route into the options with its price, hours and legal line; the person decides."}\n</kit_existing_product>`;
}
KIT_PROMPT_PARTS.push(kit7PromptBlock);
function kit7BriefSteps(p){
  if (!kit7Applies(p)) return [];
  const dec = kitDecided(p, "rebuild", KIT_REBUILD), k = dec ? dec.kind : "clean", prod = kit7Product(p);
  const body = {pay: `Pay for ${prod}: list as a person step with the current price from the maker's page and the exact plan; the tool connects to it only through its official interface.`,
    clean: `Rebuild ${prod}'s function clean-room: write down the behaviour as observed by a user (inputs, outputs, flows) in behaviour.md; implement it with own code and open models whose licence allows this tool's use (name each model and licence in licences.md); copy no code, asset, text or brand; the About section says "built from observed behaviour, nothing copied".`,
    rea: `Private experiment only: this tool stays on the owner's machine; nothing is published, sold or shared; REA is used only where the licence allows; the brief contains no step that publishes any part of it.`,
    without: `No product: the tool describes the manual way with its time cost and does the rest.`}[k];
  return [{title: `Existing product · ${prod} · Firnlab`, body: body + (dec ? "" : " (The person has not decided the route yet: build the clean-room version and list the decision as a person step.)"),
    check: k === "clean" ? "behaviour.md and licences.md exist; a search of the code and assets finds nothing taken from the product; every model's licence allows this use." : k === "rea" ? "nothing in the brief publishes, shares or sells any part; the tool runs on the owner's machine only." : "the person step names the plan and the price, or the manual way is described."}];
}
{ const orig = kitBriefSteps; kitBriefSteps = function(p){ return [...orig(p), ...kit7BriefSteps(p)]; }; }
PROOF_MODES.push({id: "clean", tr: [...KIT_REBUILD_WORDS.map(w => w.trim()), ...KIT_PRODUCTS],
  ai: "Nothing copied: a tool that follows an existing product's behaviour rebuilds it from observation with own code and licensed open models; it carries none of the product's code, assets, texts or brand; a privately taken-apart product never leaves the owner's machine."});
PROOF_IDS.push("clean");
