/* ===================== 1.8 the cone: sentence -> tool families -> biggest cut -> gallery shrinks; D pick-then-verify, E say the ending; policy rows =====================
   Decided with the owner (PLAN-1.8 "Routing decided (31 Oct 2026): option C — the cone — with D and E as shortcuts", the unification round,
   "Owner decisions, 1 Nov 2026"; DESIGN-1.8-rev2 §12, §13, §16; placement after §14–15). Wraps the 1.8 start (v180_decide.js); nothing older changes.
   1. One sentence → PT infers 6–8 kinds of tool (families of endings from a tagged catalogue of shapes) + "something not here", shown as a
      gallery of cards: a sketch, what you get, for whom, uses AI or not, rough cost and time, and how many checks you will tap.
   2. One biggest-cut question at a time, pre-filled from the sentence ("from your sentence", the words underlined) or said as an assumption.
      Who it is for comes first (me / others / customers / me and others / not sure); "me and others" and "not sure" build private-first with
      portability on and never default a branch away (they stay, hatched). Then the question that cuts the most of what is left, until one
      or two kinds remain. Every answer carries a reversibility badge (cheap / some work / costly to change, with a number).
   3. The gallery shrinks visibly ("n of 37 cut"); cut cards fold into "Removed (n)" in about ¼ s (a fade with reduced motion), greyed and
      still tappable: why it was cut, and the way back.
   4. PT's ★ is revealed only after the cards were looked at (each card in view, scrolled through) or on tap, with a hedged first-person
      reason and what would change PT's mind. No decoy cards: only what the inference named (or what you asked for) is shown.
   5. Shortcuts: D "pick then verify" (tap a card: PT asks only the cuts that could rule it out, and who it is for); E "say the ending" (your
      words → the nearest kind, or a new kind marked unverified). (2.0: choices on other tools no longer pre-fill or star anything here.)
   6. The surviving kind defines the tool's check rows (its signals join chkSignals / chkOutward; "n checks to tap" on every card) and feeds
      the 1.8 start: research, risk, mock first, picks. Every answer and the kind itself are decision rows (ROW_SOURCES) with ids and events.
   7. Tools from 1.7: "re-run the cone once" (a few taps, pre-filled from what was decided; an answer that differs from an earlier decision
      never replaces it without your tap). Entry points for other screens (Health's day-one screen, the inbox):
        coneOffer(p) → the offer card's HTML ("" when it does not apply) · coneOfferable(p) → true/false
        coneRerun(p) → runs it once now (opens the Pick page) · coneDismiss(p) → "no thanks", once
        coneStart(p, sentence) → a new tool from one sentence (the cone, then the 1.8 start)
      Actions for markup elsewhere: data-a="cone-rerun" / "cone-norerun" with data-id="<project id>". */

const CONE_DIMS = ["aud", "out", "where", "when"];
const CONE_OPTS = {aud: ["me", "others", "customers", "both", "unsure"], out: ["no", "yes", "unsure"], where: ["page", "phone", "device", "chat", "unsure"], when: ["open", "timer", "event", "unsure"]};
const CONE_LET = {aud: {me: "m", others: "o", customers: "c"}, where: {page: "p", phone: "f", device: "d", chat: "c"}, when: {open: "o", timer: "t", event: "e"}};
/* how hard an answer is to change later: cheap · mid (some work) · costly — the number is in the string cone.rev.<dim>.<value> */
const CONE_REV = {aud: {me: "cheap", others: "mid", customers: "costly", both: "cheap", unsure: "cheap"}, out: {no: "cheap", yes: "costly", unsure: "cheap"},
  where: {page: "cheap", phone: "mid", device: "mid", chat: "cheap", unsure: "cheap"}, when: {open: "cheap", timer: "cheap", event: "mid", unsure: "cheap"}};
const CONE_FAMS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const CONE_SCAN_MS = 1200;   // the cards count as looked at when each one was in view and at least this long has passed
const CONE_FOLD_MS = 260;    // cut cards fold away in about a quarter of a second
/* the catalogue (TREE-1.8 §1, directions A–L, M = by hand stays the honest baseline in the picks). Per shape: id, family, who it can serve
   (m me · o others · c customers), acts outward by itself (0 no · 1 yes · 2 either), where it is used (p page · f phone · d device · c chat),
   what starts it (o you open it · t a timer · e an event), AI when it runs (0 none · 1 each run · 2 optional), CHF a month, hours to a first
   version, check signals (w web · p personal data · m money · d data · a runs by itself · r reads outside content). Rough, ESTIMATE. */
const CONE_CAT = [
  ["A1", "A", "m", 0, "c", "o", 1, [0, 0], [0.2, 1], ""], ["A2", "A", "mo", 0, "c", "o", 1, [0, 23], [0.5, 2], "d"], ["A3", "A", "mo", 0, "c", "o", 1, [0, 0], [1, 3], ""],
  ["B1", "B", "moc", 0, "pf", "o", 0, [0, 0], [1, 4], "d"], ["B2", "B", "moc", 0, "pf", "o", 0, [0, 0], [1, 4], "d"], ["B3", "B", "moc", 0, "pf", "o", 0, [0, 0], [1, 3], ""],
  ["B4", "B", "oc", 0, "pf", "o", 0, [0, 0], [1, 3], "pd"], ["B5", "B", "mo", 0, "pf", "o", 0, [0, 0], [0.5, 2], ""],
  ["C1", "C", "mo", 0, "pc", "t", 1, [0, 20], [2, 6], "wra"], ["C2", "C", "mo", 0, "pcf", "t", 1, [0, 20], [2, 6], "da"], ["C3", "C", "mo", 2, "pf", "te", 2, [0, 10], [2, 6], "wra"],
  ["C4", "C", "m", 2, "fc", "t", 0, [0, 0], [0.5, 2], ""],
  ["D1", "D", "mo", 1, "pcd", "et", 1, [5, 40], [4, 12], "prwa"], ["D2", "D", "mo", 1, "pc", "te", 1, [5, 40], [4, 12], "wa"], ["D3", "D", "m", 1, "pd", "et", 1, [5, 40], [6, 16], "mwa"],
  ["E1", "E", "oc", 2, "pf", "o", 0, [10, 60], [16, 60], "pmd"], ["E2", "E", "c", 1, "pf", "oe", 0, [10, 80], [20, 80], "pmd"], ["E3", "E", "oc", 0, "pf", "o", 0, [10, 40], [12, 40], "pd"],
  ["F1", "F", "moc", 0, "f", "o", 0, [0, 5], [3, 10], ""], ["F2", "F", "oc", 2, "f", "oe", 0, [8, 15], [20, 80], "p"],
  ["G1", "G", "moc", 0, "pc", "o", 1, [0, 20], [1, 4], ""], ["G2", "G", "m", 0, "df", "o", 1, [0, 10], [2, 8], "p"], ["G3", "G", "mo", 0, "cp", "o", 1, [0, 20], [1, 4], ""],
  ["G4", "G", "moc", 0, "pd", "o", 1, [0, 30], [3, 12], ""],
  ["H1", "H", "m", 2, "p", "t", 1, [20, 100], [8, 30], "ad"], ["H2", "H", "mo", 2, "p", "te", 1, [20, 150], [16, 60], "am"],
  ["I1", "I", "moc", 2, "pfdc", "ote", 2, [5, 30], [0.2, 1], "m"], ["I2", "I", "mo", 0, "pd", "o", 2, [0, 10], [6, 30], ""],
  ["J1", "J", "m", 2, "d", "ote", 2, [0, 0], [1, 6], "p"], ["J2", "J", "m", 0, "d", "o", 1, [0, 0], [2, 8], "p"], ["J3", "J", "mo", 2, "d", "te", 2, [0, 5], [4, 16], ""],
  ["K1", "K", "mo", 0, "p", "o", 0, [0, 0], [1, 4], "d"], ["K2", "K", "moc", 0, "pf", "ot", 0, [0, 10], [2, 8], "d"], ["K3", "K", "mo", 0, "pd", "t", 2, [0, 10], [3, 10], "da"],
  ["L1", "L", "mo", 2, "cd", "oe", 1, [0, 10], [2, 8], "r"], ["L2", "L", "mo", 1, "pd", "e", 2, [0, 20], [2, 8], "a"], ["L3", "L", "mo", 2, "pd", "te", 0, [0, 10], [2, 8], "d"]
].map(([id, f, aud, out, where, when, ai, cost, h, sig]) => ({id, f, aud, out, where, when, ai, cost, h, sig}));
const CONE_BY = new Map(CONE_CAT.map(s => [s.id, s]));
/* a tiny sketch per family, when the inference gave none (language-free) */
const CONE_SK = {A: "┌ chat ──────────┐\n│ you: …         │\n│ it:  ▤▤▤▤      │\n└────────────────┘", B: "┌ page ──────────┐\n│ ☐ ▤▤▤   ☐ ▤▤   │\n│ ☐ ▤▤    + add  │\n└────────────────┘",
  C: "⏰ Mon 07:00\n  ↓ checks · collects\n┌ note ──────────┐\n│ 3 new ▤▤▤      │\n└────────────────┘", D: "✉ in  →  ◎ agent\n         ↓ checks\n         ↗ sends · posts", E: "┌ app ── [log in]┐\n│ ▤▤▤  ▤▤▤  CHF  │\n│ 👤 👤 👤        │\n└────────────────┘",
  F: "┌──────┐\n│ ▤▤▤▤ │\n│ ◉  ◉ │\n│  ▭   │\n└──────┘", G: "text ─→ ◎ ─→ 🖼 🔊 ▶", H: "◎ lead\n├─ ◎ research\n├─ ◎ writer\n└─ ◎ checker → you ✓", I: "★ product\n  pay · rebuild · skip",
  J: "┌ laptop ────────┐\n│ ▤ files  ⚙ apps│\n└────────────────┘", K: "┌ chart ─────────┐\n│ ▁▃▅▇▅▆█        │\n│ Σ 1 284        │\n└────────────────┘", L: "[ app A ] ⇄ ◎ ⇄ [ app B ]"};
/* the sentence's own words for the local fallback (no AI): which families they point to */
const CONE_KW = {
  A: /\b(chat|prompt|skill|claude project|assistant)\b|聊天|助手|提示词/i,
  B: /\b(page|tracker|track|board|calculator|checklist|list|form|poll|log)\b|seite|liste|rechner|checkliste|formular|umfrage|页面|清单|看板|计算器|表单/i,
  C: /\b(every|daily|weekly|hourly|each (?:day|week|morning)|monday|morning|report|digest|watch|alert|remind\w*|radar|scout|news)\b|täglich|wöchentlich|jeden|bericht|erinner|每天|每周|每小时|报告|提醒|监控/i,
  D: /\b(send\w*|reply|replies|post\w*|publish\w*|order\w*|buy\w*)\b|sende|antwort|veröffentlich|bestell|kauf|发送|回复|发布|下单|购买/i,
  E: /\b(log ?in|sign[- ]?up|subscri\w*|members?|shop|store|booking|paid|payments?|accounts?)\b|anmeld|abo\b|mitglied|buchung|bezahl|konto|登录|注册|订阅|会员|商店|预订|付款/i,
  F: /\b(phone|iphone|android|mobile|app)\b|handy|smartphone|手机/i,
  G: /\b(images?|pictures?|photos?|illustrat\w*|voice|dictat\w*|speech|audio|podcast|slides?|presentation|video)\b|bild|foto|stimme|diktier|folien|präsentation|图片|照片|插图|语音|听写|幻灯片|视频/i,
  H: /\b(company|roles|team of agents|departments?)\b|firma|rollen|unternehmen|公司|角色/i,
  I: /\b(?:like|instead of|alternative to)\s+[A-Z][\w.]+|\bwie\s+[A-Z][\w.]+|\bstatt\s+[A-Z][\w.]+|像\s*[A-Za-z]/,
  J: /\b(laptop|computer|desktop|mac|pc|offline|local|raspberry|my files|shortcuts?)\b|rechner|lokal|dateien|电脑|本地|离线|文件/i,
  K: /\b(chart|graph|dashboard|numbers|spreadsheet|data|statistics|analy\w*|excel|csv)\b|diagramm|zahlen|tabelle|daten|statistik|auswert|图表|数据|表格|统计|分析/i,
  L: /\b(connect\w*|sync\w*|webhook|zapier|integrat\w*|mcp)\b|verbind|synchron|schnittstelle|连接|同步|集成/i};
const CONE_BASE = {B: 0.6, C: 0.5, A: 0.45, K: 0.4, J: 0.3, D: 0.25, G: 0.2, L: 0.2, F: 0.15, E: 0.15, H: 0.1, I: 0.05};
/* the sentence's own words that answer a question (the local pre-fill; the AI's spans are checked against the sentence the same way) */
const CONE_PRE = {
  aud: [["customers", /\b(?:my |our )?(?:customers?|clients?|subscribers?|buyers?|visitors?|the public|anyone|everyone)\b|kunden|abonnent|öffentlich|客户|顾客|订阅者|公众|所有人/i],
        ["others", /\b(?:my |our )?(?:team|colleagues?|family|friends|club|students|parents|neighbou?rs)\b|\bteam\b|kolleg\w*|familie|freunde|verein|schüler|eltern|团队|同事|家人|朋友|俱乐部|学生/i],
        ["me", /\b(?:just for me|only for me|for me|just me|only me|myself|my own)\b|nur für mich|für mich|nur ich|给我自己|我自己|只有我|只给我/i]],
  where: [["phone", /\b(?:phone|iphone|android|mobile|on the go)\b|handy|smartphone|unterwegs|手机/i], ["device", /\b(?:laptop|computer|desktop|offline|my files)\b|rechner|lokal|电脑|本地|离线/i],
          ["chat", /\b(?:in (?:the )?chat|claude chat|a prompt|a skill)\b|im chat|聊天/i], ["page", /\b(?:page|website|web page|site|board|dashboard|tracker|calculator|form)\b|seite|webseite|网页|页面|看板/i]],
  when: [["timer", /\b(?:every (?:day|week|morning|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hour|month)|daily|weekly|hourly|monthly|each (?:day|week|morning)|on a schedule)\b|täglich|wöchentlich|monatlich|jeden (?:tag|morgen|abend|montag|monat)|每天|每周|每月|每小时|定时/i],
         ["event", /\b(?:whenever|as soon as)\b|sobald|每当|一旦/i]]};
const CONE_UI = {foldT: 0};
const CONE_SEEN = {obs: null, sig: "", seen: new Set(), t0: 0, timer: 0};
DIFF_NESTED.add("cone");   // Undo compares the cone part by part (an answer, the pick, the kind)
COST_EST.cone = 3; COST_EST["cone-say"] = 2;

/* ---------- the record: p.cone ---------- */
function coneRead(p){ const c = p && p.cone; return c && typeof c === "object" ? c : null; }
/** for writing (inside an action): p.cone with its lists */
function coneOf(p){
  if (!p.cone || typeof p.cone !== "object") p.cone = {v: 1};   // ok:field  the cone is new in 1.8, made on first use (inside the action, so Undo takes it back; it survives reload: e2e180_cone)
  const c = p.cone; c.ans = c.ans && typeof c.ans === "object" ? c.ans : {}; c.fams = arr(c.fams); c.pre = c.pre && typeof c.pre === "object" ? c.pre : {};
  return c;
}
function coneAns(c){ return (c && c.ans && typeof c.ans === "object") ? c.ans : {}; }
/** is the cone on screen now: a new tool's start (mode cone, before the mock) or a re-run, until a kind is taken */
function coneActive(p){
  const c = coneRead(p); if (!c || c.ending || !["infer", "ask"].includes(c.state)) return false;
  if (c.rerun) return true;
  const k = pickRead(p), mf = k.mf; return !!(mf && mf.mode === "cone" && !k.mfMock);
}
/** the start switch for this idea: the cone (default for a new tool), questions first, or fast */
function coneStartMode(p){ const s = pickRead(p).start; return s === "fast" || s === "questions" ? s : "cone"; }

/* ---------- the catalogue: what fits, what is left, what to ask next ---------- */
function coneFits(s, d, v){
  if (!v || v === "unsure") return true;
  if (d === "aud") return v === "both" ? s.aud.includes("m") : s.aud.includes(CONE_LET.aud[v]);   // me and others: private first, so it must work for you
  if (d === "out") return v === "no" ? s.out !== 1 : s.out !== 0;
  return s[d].includes(CONE_LET[d][v]);
}
function coneFam(c, f){ return arr(c && c.fams).find(x => x && x.f === f) || null; }
function coneShapes(fam){ if (!fam || fam.custom) return []; const L = arr(fam.shapes).map(id => CONE_BY.get(id)).filter(s => s && s.f === fam.f); return L.length ? L : CONE_CAT.filter(s => s.f === fam.f); }
function coneLiveShapes(c, fam, ans = coneAns(c)){ return coneShapes(fam).filter(s => CONE_DIMS.every(d => !ans[d] || coneFits(s, d, ans[d].v))); }
function coneLive(c, fam, ans = coneAns(c)){ return !!fam && (fam.custom || coneLiveShapes(c, fam, ans).length > 0); }
function coneLiveFams(c, ans = coneAns(c)){ return arr(c && c.fams).filter(f => coneLive(c, f, ans)); }
/** the answers that cut a kind (one answer alone where it can; else the ones it fails together) */
function coneCutBy(c, fam){
  const S = coneShapes(fam), A = coneAns(c);
  const one = CONE_DIMS.filter(d => A[d] && !S.some(s => coneFits(s, d, A[d].v)));
  return one.length ? one : CONE_DIMS.filter(d => A[d] && S.some(s => !coneFits(s, d, A[d].v)));
}
/** shapes left of the whole catalogue ("n of 37 cut": the sentence cut the kinds not shown, the answers cut the rest) */
function coneCount(c){ const live = new Set(); for (const f of arr(c.fams)) for (const s of coneLiveShapes(c, f)) live.add(s.id); return {total: CONE_CAT.length, live: live.size, cut: CONE_CAT.length - live.size}; }
/** how many kinds an answer to d would cut, on average, each answer weighted by how many kinds it keeps */
function coneCutScore(c, d, fams = coneLiveFams(c)){
  let tot = 0, w = 0;
  for (const v of CONE_OPTS[d].filter(v => v !== "unsure")){
    const ans = Object.assign({}, coneAns(c), {[d]: {v}}), keep = fams.filter(f => coneLive(c, f, ans)).length;
    tot += keep * (fams.length - keep); w += keep;
  }
  return w ? tot / w : 0;
}
function coneCutsIf(c, d, v){ const fams = coneLiveFams(c), ans = Object.assign({}, coneAns(c), {[d]: {v}}); return fams.filter(f => !coneLive(c, f, ans)).length; }
/** the next question: who it is for first, then the biggest cut, until one or two kinds are left (null: nothing left to ask) */
function coneNextDim(c){
  const A = coneAns(c);
  if (!A.aud) return "aud";
  const fams = coneLiveFams(c); if (fams.length <= 2) return null;
  let best = null, bs = 0;
  for (const d of CONE_DIMS){ if (A[d]) continue; const s = coneCutScore(c, d, fams); if (s > bs + 1e-9){ bs = s; best = d; } }
  return best;
}
/** pick then verify: who it is for (it decides the checks and how private it starts), then only the questions that could rule the pick out */
function coneVerifyDims(c){
  const pk = c && c.picked, fam = pk ? coneFam(c, pk.f) : null; if (!fam) return [];
  const A = coneAns(c), out = A.aud ? [] : ["aud"];
  for (const d of CONE_DIMS){
    if (d === "aud" || A[d]) continue;
    if (fam.custom){ if (d === "out") out.push(d); continue; }   // a kind in your words: whether it acts outward decides its checks
    const S = coneLiveShapes(c, fam);
    if (CONE_OPTS[d].some(v => v !== "unsure" && !S.some(s => coneFits(s, d, v)))) out.push(d);
  }
  return out;
}
/** the question on screen now */
function coneCurDim(p){ const c = coneRead(p); if (!c || !coneActive(p) || c.state !== "ask") return null; return c.picked ? coneVerifyDims(c)[0] || null : coneNextDim(c); }
/** "me and others" / "not sure": a kind that works only one way stays (hatched), never defaulted away */
function coneHatched(c, fam){
  const a = coneAns(c).aud; if (!a || !["both", "unsure"].includes(a.v) || fam.custom) return false;
  return !coneLiveShapes(c, fam).some(s => s.aud.includes("m") && (s.aud.includes("o") || s.aud.includes("c")));
}

/* ---------- what a kind means for the tool: its check rows ---------- */
/** the signals of a kind (and the answers), in the shape the check rows read (v180_checks.js chkApplies) */
function coneSig(p, c, fams, ans = coneAns(c)){
  const S = fams.flatMap(f => coneLiveShapes(c, f, ans).length ? coneLiveShapes(c, f, ans) : coneShapes(f));
  const has = ch => S.some(s => s.sig.includes(ch)), txt = str(c.sentence), ov = ans.out ? ans.out.v : "", av = ans.aud ? ans.aud.v : "";
  const out = ov === "yes" || (!ov && S.length > 0 && S.every(s => s.out === 1));
  return {reads: has("r") ? [t("cone.sig.reads")] : [], acts: out ? [t("cone.sig.acts")] : [], ai: S.some(s => s.ai === 1) ? (has("a") ? 2 : 1) : 0, out: out ? t("cone.sig.outword") : "",
    shared: av === "others" || av === "customers", personal: has("p") || CHK_PERSONAL.test(txt), web: has("w") || CHK_WEB.test(txt), money: has("m") || CHK_MONEY.test(txt), data: has("d") || CHK_DATA.test(txt), agent: has("a") || CHK_AGENT.test(txt)};
}
/** the checks a kind brings (the same rule the Check page uses) */
function coneCheckIds(p, S){ return [...LENSES.map(l => l.id), ...CHK_GATES].filter(id => { try{ return chkApplies(p, id, S).ok; }catch(e){ onAppError(e && e.message, "cone:checks"); return false; } }); }
/** the signals of the kind you took (null before) */
function coneEndSig(p){ const c = coneRead(p); if (!c || !c.ending) return null; const fam = coneFam(c, c.ending.f); return fam ? coneSig(p, c, [fam]) : null; }
/* the kind you took joins what the check rows know about the tool (its text may not say it yet): the rows follow from the ending */
{ const orig = chkSignals; chkSignals = function(p){
    const S = orig(p), e = p ? coneEndSig(p) : null; if (!e) return S;
    return Object.assign({}, S, {reads: S.reads.length ? S.reads : e.reads, acts: S.acts.length ? S.acts : e.acts, ai: Math.max(num(S.ai, 0), e.ai), out: S.out || e.out,
      personal: S.personal || e.personal, web: S.web || e.web, money: S.money || e.money, data: S.data || e.data, agent: S.agent || e.agent}); }; }
{ const orig = chkOutward; chkOutward = function(p){ const w = orig(p); if (w || !p) return w; const e = coneEndSig(p); return e && e.out ? e.out : ""; }; }

/* ---------- pre-fill: your earlier decision, your sentence, your last tool, or PT's assumption ---------- */
/** what a 1.7 tool (or this tool) already decided: who it is for */
function coneKnownFrom(p){
  const a = (p && p.audience) || {}, out = {};
  if (CONE_OPTS.aud.includes(str(a.who))) out.aud = {v: a.who, why: "who"};
  else if (a.customers === true) out.aud = {v: "customers", why: "customers"};
  else if (a.customers === false) out.aud = {v: "me", why: "nocust"};
  return out;
}
function coneKnownLabel(k){ return !k ? "" : k.why === "who" ? t("cone.o.aud." + k.v) : t(k.why === "customers" ? "cone.known.cust" : "cone.known.nocust"); }
/** an answer that would change an earlier decision (only who it is for is stored as a decision before the cone) */
function coneConflict(c, d, v){
  const k = d === "aud" && c && c.known ? c.known.aud : null; if (!k) return null;
  if (k.why === "who") return v !== k.v ? k : null;
  if (k.why === "customers") return v !== "customers" ? k : null;
  return v === "customers" ? k : null;
}
/* 2.0 (owner, 4 Nov 2026: "projects dont get other projects rules, never"): your choice on another tool no longer pre-fills or stars
   a question here (it was "you chose this last time"); each tool's cone starts from its own sentence and its own decisions only. */
function conePre(p, c, d){
  const k = c.known && c.known[d]; if (k && k.v) return {v: k.v, src: "earlier", label: coneKnownLabel(k)};
  const s = c.pre && c.pre[d];
  if (s && s.v && s.span) return {v: s.v, src: "sentence", span: s.span};
  if (s && s.v && s.v !== "unsure") return {v: s.v, src: "assumed"};
  return null;
}

/* ---------- the inference: one sentence → kinds of tool ---------- */
function coneLine(s, n){ return str(s).replace(/\s+/g, " ").trim().slice(0, n); }
function coneSketch(s){ const L = str(s).split("\n").slice(0, 6).map(l => l.slice(0, 32).replace(/\s+$/, "")); return L.join("\n").trim() ? L.join("\n") : ""; }
function coneFamDefault(f){ return {f, title: t("cone.f." + f), get: t("cone.f." + f + ".get"), sketch: "", shapes: CONE_CAT.filter(s => s.f === f).map(s => s.id)}; }
function coneRank(sentence){ const s = str(sentence); return CONE_FAMS.map(f => [f, (CONE_KW[f].test(s) ? 2 : 0) + CONE_BASE[f]]).sort((a, b) => b[1] - a[1]).map(x => x[0]); }
function coneLocalPre(sentence){
  const s = str(sentence), out = {};
  const aud = []; for (const [v, rx] of CONE_PRE.aud){ const m = rx.exec(s); if (m) aud.push([v, m[0].trim()]); }
  if (aud.length){ const me = aud.find(x => x[0] === "me"), other = aud.find(x => x[0] !== "me"); out.aud = me && other ? {v: "both", span: me[1], span2: other[1]} : {v: aud[0][0], span: aud[0][1]}; }
  { const m = CHK_OUT.exec(s.replace(CHK_NOT_OUT, " ")); if (m){ const i = s.toLowerCase().indexOf(m[0].trim().toLowerCase()); if (i >= 0) out.out = {v: "yes", span: s.slice(i, i + m[0].trim().length)}; } }
  for (const d of ["where", "when"]) for (const [v, rx] of CONE_PRE[d]){ const m = rx.exec(s); if (m){ out[d] = {v, span: m[0].trim()}; break; } }
  return out;
}
/** without the AI: the families the sentence's words point to (the general ones fill up to seven), its own words as pre-fill */
function coneLocal(sentence){ const fams = coneRank(sentence).slice(0, 7).map(coneFamDefault); return {fams, pre: coneLocalPre(sentence), star: {f: fams[0].f, why: t("cone.star.local"), doubt: t("cone.star.localdoubt")}}; }
/** the AI's answer, checked: known families only, at most 8, spans that really are in the sentence; never padded with kinds it did not name */
function coneClean(r, sentence){
  if (!r || !Array.isArray(r.fams)) return null;
  const seen = new Set(), fams = [];
  for (const x of r.fams){
    const f = str(x && x.f).trim().toUpperCase(); if (!CONE_FAMS.includes(f) || seen.has(f)) continue; seen.add(f);
    const ids = [...new Set(arr(x.shapes).map(s => str(s).trim().toUpperCase()).filter(id => CONE_BY.has(id) && CONE_BY.get(id).f === f))];
    fams.push({f, title: coneLine(x.title, 90) || t("cone.f." + f), get: coneLine(x.get, 220) || t("cone.f." + f + ".get"), sketch: coneSketch(x.sketch), shapes: ids.length ? ids : CONE_CAT.filter(s => s.f === f).map(s => s.id)});
    if (fams.length >= 8) break;
  }
  if (!fams.length) return null;
  const low = str(sentence).toLowerCase(), pre = {};
  for (const d of CONE_DIMS){ const x = r.pre && r.pre[d]; const v = str(x && x.v); if (!CONE_OPTS[d].includes(v)) continue; const span = coneLine(x.span, 120); pre[d] = {v, span: span && low.includes(span.toLowerCase()) ? span : ""}; }
  const loc = coneLocalPre(sentence); for (const d of CONE_DIMS) if (loc[d] && (!pre[d] || !pre[d].span)) pre[d] = loc[d];   // the sentence's own words beat an unsupported guess
  const sf = str(r.star && r.star.f).trim().toUpperCase();
  const star = fams.some(f => f.f === sf) ? {f: sf, why: coneLine(r.star.why, 300), doubt: coneLine(r.star.doubt, 220)} : null;
  return {fams, pre, star};
}
function coneCatJSON(){ return JSON.stringify(CONE_FAMS.map(f => ({family: f, name: (STR["cone.f." + f] || [f])[0], shapes: CONE_CAT.filter(s => s.f === f).map(s => ({id: s.id, name: (STR["cone.s." + s.id] || [s.id])[0], aud: s.aud, out: ["no", "yes", "either"][s.out], where: s.where, when: s.when, ai: ["none", "each run", "optional"][s.ai]}))}))); }
async function coneInfer(p){
  const ws0 = WS.id, c0 = coneRead(p); if (!c0 || c0.state !== "infer") return null;
  const sentence = str(c0.sentence);
  const prompt = buildPrompt("cone", {proj: p, rules: ["simple"], platform: true, context: projectContext(p, {only: ["north_star", "raw_idea", "clarified_idea", "decisions"]}),
    body: `The person wants a tool and said it in one sentence:
${untrusted("sentence", sentence)}
${c0.rerun ? "This tool already exists from an earlier version (its decisions are above): infer the kinds that fit what was decided, so the person can confirm the kind in a few taps.\n" : ""}Infer which kinds of tool could be the right ending, from this catalogue of families and their shapes. Tags per shape: aud = who it can serve (m me, o others such as a team or family, c customers or the public), out = whether it acts outward by itself (sends, posts, publishes, pays, orders), where = where it is used (p a page in the browser, f the phone, d the person's own computer or a device, c the Claude chat), when = what starts it (o the person opens it, t a timer, e an event), ai = whether it needs AI each time it runs.
<catalogue>${coneCatJSON()}</catalogue>
1. Choose the 6 to 8 families that could plausibly be what the person means, the likeliest first. Never invent a family and never add one only to fill the gallery: fewer is fine. For each: "title", the kind named in the person's own terms (at most 9 words); "get", what they would have in their hands, one sentence; "sketch", a tiny monospace sketch of what it looks like (at most 6 lines, at most 30 characters each); "shapes", the ids of that family's shapes that fit.
2. Pre-fill four questions from the sentence alone: aud (me|others|customers|both|unsure; both = the person and others), out (no|yes|unsure), where (page|phone|device|chat|unsure), when (open|timer|event|unsure). "span" = the exact words of the sentence the value comes from, copied character for character, or "" when the sentence does not say it (then the value is only your assumption).
3. "star": the family you would lean to; "why" in the first person and hedged ("I'd lean to … because …"); "doubt": what would change your mind.`,
    schema: `{"fams":[{"f":"B","title":"…","get":"…","sketch":"…","shapes":["B1","B2"]}],"pre":{"aud":{"v":"me","span":"…"},"out":{"v":"no","span":""},"where":{"v":"page","span":"…"},"when":{"v":"open","span":""}},"star":{"f":"B","why":"I'd lean to … because …","doubt":"…"}}`});
  const r = await runAI("cone", t("cone.busy"), prompt, {pid: p.id, step: "arch", validate: o => !!o && Array.isArray(o.fams) && o.fams.some(x => x && CONE_FAMS.includes(str(x.f).trim().toUpperCase()))});
  const q = pickLive(p, ws0); if (!q) return null;
  const c1 = coneRead(q); if (!c1 || c1.state !== "infer" || str(c1.sentence) !== sentence) return null;   // stopped or started again meanwhile
  actOpen(q, t("cone.busy"), {by: "pt"});
  const got = coneClean(r, sentence), c = coneOf(q);
  Object.assign(c, got || coneLocal(sentence), {state: "ask", local: !got, inferAt: now()});
  touch(q); actCloseSoon(q.id); render();
  return c;
}

/* ---------- starting: a new tool, a re-run, the offer for 1.7 tools ---------- */
/** the cone as the start of a new tool (the 1.8 start's first step when the switch is on "kinds of tool first") */
function coneBegin(p){
  UI.pkIdeaBox = null; UI.pkAuto = Object.assign({}, UI.pkAuto, {[p.id]: 0});
  const s = str(p.intake.raw).trim() || str(p.northStar.goal).trim();
  actOpen(p, t("pk8.mf.act.start"));
  const k = pickOf(p); k.mf = {at: now(), mode: "cone"};
  const c = coneOf(p);
  Object.assign(c, {v: 1, sentence: s, at: now(), state: "infer", rerun: false, known: coneKnownFrom(p), fams: [], pre: {}, star: null, ans: {}, picked: null, ending: null, note: null, local: false});
  touch(p); actCloseSoon(p.id); render();
  costGuard(p, "cone", () => coneInfer(p));
  return null;
}
/** entry point: a new tool from one sentence (the cone, then the 1.8 start); a tool that already started gets the cone once instead */
function coneStart(p, sentence = ""){
  if (!p) return null;
  const s = str(sentence).trim(), k = pickRead(p);
  if (s && !str(p.intake.raw).trim()){ actOpen(p, t("cone.act.sentence")); p.intake.raw = s; touch(p); actClose(p.id); }
  if (k.mf || k.log.length || k.cards.length) return coneRerun(p);
  if (!str(p.intake.raw).trim() && !str(p.northStar.goal).trim()){ toast(t("pk8.needidea"), "err"); return null; }
  if (UI.pid !== p.id) openProject(p.id);
  if (typeof pgOn === "function" && pgOn(p)) pgOpen(p, "picks", {flash: "#pk-deck"});
  return coneBegin(p);
}
/** entry point: the cone once over a tool that already exists (a 1.7 tool, or "change the kind"); a few taps, nothing replaced without your tap */
function coneRerun(p){
  if (!p) return null;
  const s = str(p.intake.raw).trim() || str(p.northStar.goal).trim(); if (!s){ toast(t("pk8.needidea"), "err"); return null; }
  const c0 = coneRead(p), again = !!(c0 && arr(c0.fams).length && str(c0.sentence) === s);
  actOpen(p, t("cone.act.rerun"));
  const c = coneOf(p);
  Object.assign(c, {v: 1, sentence: s, at: now(), state: again ? "ask" : "infer", rerun: true, known: coneKnownFrom(p), ending: null, picked: null, note: null, dismissed: ""});
  if (!again) Object.assign(c, {fams: [], pre: {}, star: null});
  touch(p); actClose(p.id);
  if (UI.pid !== p.id) openProject(p.id);
  if (typeof pgOn === "function" && pgOn(p)) pgOpen(p, "picks", {flash: "#cone"}); else render();
  if (!again) costGuard(p, "cone", () => coneInfer(p));
  return c;
}
/** entry point: does this tool get the offer (a tool from before 1.8 that never had the cone, asked once) */
function coneOfferable(p){
  if (!p || p.status === "archived" || p.cone) return false;   // once: run, stopped or declined
  const k = pickRead(p); if (k.mf) return false;   // started in 1.8 (the cone, questions first or fast)
  if (!str(p.intake.raw).trim() && !str(p.northStar.goal).trim()) return false;
  return k.log.length > 0 || arr(p.decisions).length > 0 || arr(p.arch && p.arch.components).length > 0 || arr(p.pkg && p.pkg.sections).length > 0;
}
/** entry point: the offer card (Health's day-one screen shows it per tool; the cover and the Pick page show it too) */
function coneOffer(p){
  if (!coneOfferable(p)) return "";
  const id = esc(p.id);
  return `<section class="panel cone-offer" data-anchor="cone-offer" data-pid="${id}"><div class="row"><b style="flex:1 1 14em">${ic("layers")} ${esc(t("cone.offer.title", {x: p.name}))}</b><span class="chip">${esc(t("cone.offer.taps"))}</span></div>
    <p class="small">${esc(t("cone.offer.sub"))}</p><div class="row"><button class="btn sm primary" data-a="cone-rerun" data-id="${id}">${ic("arrow")}${esc(t("cone.offer.go"))}</button><button class="btn sm ghost" data-a="cone-norerun" data-id="${id}">${esc(t("cone.offer.no"))}</button></div></section>`;
}
/** entry point: "no thanks" — the offer does not come back (one Undo step) */
function coneDismiss(p){
  if (!coneOfferable(p)) return false;
  actOpen(p, t("cone.offer.no"));
  p.cone = {v: 1, dismissed: now(), ans: {}, fams: [], pre: {}};   // ok:field  the same record as a run (Undo takes it back)
  touch(p); actClose(p.id);
  return true;
}

/* ---------- answering, picking, taking ---------- */
function coneApplyAud(p, v){
  const c = coneOf(p); if (!c.audWas) c.audWas = Object.assign({}, p.audience || {});
  p.audience = Object.assign({}, p.audience || {}, {who: v, customers: v === "customers", portable: v === "both" || v === "unsure"});
  markRef(p, "audience", "decided");
}
/** the kind is taken (inside the caller's action): the record, the checks it brings */
function coneTakeIn(p, c, f, via){
  const fam = coneFam(c, f); if (!fam || !coneLive(c, fam)) return false;
  const live = coneLiveShapes(c, fam);
  c.ending = {f, shape: live[0] ? live[0].id : "", title: str(fam.title), at: now(), via: str(via) || "cone", custom: !!fam.custom, checks: coneCheckIds(p, coneSig(p, c, [fam]))};
  c.state = "done"; c.picked = null; c.note = null;
  markRef(p, "cone:ending", "decided");
  logAct(p, t("cone.act.take", {x: fam.title}), {step: "capture"});
  return true;
}
/** after the kind: a new tool goes on with the 1.8 start (research, risk, mock first); a re-run just says it is recorded */
function coneAfterTake(p){
  const c = coneRead(p); if (!c || !c.ending) return;
  if (c.rerun){ toast(t("cone.rerun.done", {x: c.ending.title}), "ok"); return; }
  const id = p.id, ws0 = WS.id;
  setTimeout(() => { const q = pickLive({id}, ws0); if (q && !coneActive(q) && pk8Stage(q) === "mock" && !mockOf(q)) pk8Continue(q); }, 0);
}
function coneFoldStart(p, before, c){
  const after = new Set(coneLiveFams(c).map(f => f.f)), gone = before.filter(f => !after.has(f));
  if (!gone.length || c.ending) return;
  UI.coneFold = {pid: p.id, fs: gone};
  clearTimeout(CONE_UI.foldT); CONE_UI.foldT = setTimeout(() => { UI.coneFold = null; render(); }, CONE_FOLD_MS);
}
/** one answer: one Undo step, one decision row; an answer that differs from an earlier decision waits for your tap */
function coneAnswer(p, d, v, {replace = false} = {}){
  const c0 = coneRead(p); if (!c0 || !coneActive(p) || c0.state !== "ask" || !CONE_OPTS[d] || !CONE_OPTS[d].includes(v)) return false;
  if (coneConflict(c0, d, v) && !replace){ UI.coneConflict = {pid: p.id, d, v}; render(); return false; }   // nothing written yet: the earlier decision stays until you choose
  UI.coneConflict = null; UI.coneWhy = null;
  const before = coneLiveFams(c0).map(f => f.f), label = t("cone.act.ans", {x: t("cone.qs." + d)});
  actOpen(p, label);
  const c = coneOf(p);
  c.ans = Object.assign({}, c.ans, {[d]: {v, at: now(), via: c.picked ? "verify" : "ask"}}); c.note = null;
  if (d === "aud") coneApplyAud(p, v);
  if (c.picked){   // pick then verify: an answer that rules the pick out says so; the last answer that keeps it takes it
    const fam = coneFam(c, c.picked.f);
    if (!coneLive(c, fam)){ c.note = {k: "out", f: c.picked.f, d, v, at: now()}; c.picked = null; }
    else if (!coneVerifyDims(c).length) coneTakeIn(p, c, c.picked.f, c.picked.via);
  }
  touch(p); actCloseSoon(p.id);
  coneFoldStart(p, before, c);
  render(); toastUndo(label);
  if (c.ending) coneAfterTake(p);
  return true;
}
/** D: tap a kind now; PT asks only what could rule it out (it is taken at once when nothing could) */
function conePick(p, f){
  const c0 = coneRead(p), fam = coneFam(c0, f); if (!c0 || !coneActive(p) || c0.state !== "ask" || !fam || !coneLive(c0, fam)) return false;
  const label = t("cone.act.pick", {x: fam.title});
  actOpen(p, label);
  const c = coneOf(p); c.picked = {f, via: "pick", at: now()}; c.note = null; UI.coneConflict = null;
  const take = !coneVerifyDims(c).length; if (take) coneTakeIn(p, c, f, "pick");
  touch(p); actCloseSoon(p.id); render(); toastUndo(label);
  if (take) coneAfterTake(p);
  return true;
}
/** E: your words → the nearest kind (or a new one, unverified); then the questions that could rule it out, your earlier choices as ★ */
function coneSayClean(r, said){
  if (!r || typeof r !== "object") return null;
  const f = str(r.f).trim().toUpperCase(), fit = oneOf(str(r.fit), ["good", "partial", "none"], "partial");
  if (fit === "none" || !CONE_FAMS.includes(f)) return {f: "X", fit: "none", title: coneLine(r.title, 90) || coneLine(said, 90), why: coneLine(r.why, 240)};
  const sh = str(r.shape).trim().toUpperCase();
  return {f, shape: CONE_BY.has(sh) && CONE_BY.get(sh).f === f ? sh : "", fit, title: coneLine(r.title, 90) || coneLine(said, 90), why: coneLine(r.why, 240)};
}
function coneSayLocal(said){ const s = str(said), hit = CONE_FAMS.filter(f => CONE_KW[f].test(s)); return hit.length ? {f: coneRank(s).find(f => hit.includes(f)), shape: "", fit: "partial", title: coneLine(s, 90), why: t("cone.say.localwhy")} : {f: "X", fit: "none", title: coneLine(s, 90), why: ""}; }
async function coneSay(p, text){
  const ws0 = WS.id, said = str(text).trim(), c0 = coneRead(p); if (!said || !c0 || !coneActive(p) || c0.state !== "ask") return null;
  const prompt = buildPrompt("cone-say", {proj: p, rules: ["simple"], body: `The person is choosing what kind of tool to build. Their first sentence:
${untrusted("sentence", str(c0.sentence))}
Now they said what they want in their own words:
${untrusted("said", said)}
Map it to the nearest family and shape of this catalogue: <catalogue>${coneCatJSON()}</catalogue>
"fit": "good" when one family clearly is it, "partial" when it is close, "none" when no family fits (PT then keeps it as a new kind, marked unverified). "title": what they said, as the name of the kind, at most 9 words. "why": one sentence.`,
    schema: `{"f":"C","shape":"C2","fit":"good|partial|none","title":"…","why":"…"}`});
  const r = await runAI("cone-say", t("cone.say.busy"), prompt, {pid: p.id, quick: true, validate: o => !!o && typeof o === "object" && (CONE_FAMS.includes(str(o.f).trim().toUpperCase()) || str(o.fit) === "none")});
  const q = pickLive(p, ws0); if (!q || !coneActive(q)) return null;
  const m = coneSayClean(r, said) || coneSayLocal(said), label = t("cone.act.say", {x: m.title});
  actOpen(q, label);   // your words chose the kind: your own step
  const c = coneOf(q);
  if (m.f === "X") c.fams = [...c.fams.filter(x => x.f !== "X"), {f: "X", custom: true, title: m.title, get: t("cone.custom.get"), sketch: "", shapes: []}];
  else if (!coneFam(c, m.f)) c.fams = [...c.fams, Object.assign(coneFamDefault(m.f), {title: m.title || t("cone.f." + m.f), asked: true}, m.shape ? {shapes: [m.shape]} : {})];   // you asked for it: shown, not a decoy
  const fam = coneFam(c, m.f);
  if (!coneLive(c, fam)) c.note = {k: "said-cut", f: m.f, at: now()};
  else { c.picked = {f: m.f, via: "said", said, fit: m.fit, why: m.why, at: now()}; c.note = null; if (!coneVerifyDims(c).length) coneTakeIn(q, c, m.f, "said"); }
  delete UI.qDraft["cone-say"];
  touch(q); actCloseSoon(q.id); render(); toastUndo(label);
  if (c.ending) coneAfterTake(q);
  return c;
}

/* ---------- the start: the cone is the default for a new tool; "fast" goes straight to the mock as before ---------- */
{ const orig = pk8Begin; pk8Begin = function(p){
    if (!p || coneStartMode(p) !== "cone" || (!str(p.intake.raw).trim() && !str(p.northStar.goal).trim()) || (p.mock && p.mock.status && p.mock.status !== "open")) return orig(p);
    return coneBegin(p); }; }
{ const orig = pk8Stage; pk8Stage = function(p){ if (p && coneActive(p)) return "cone"; return orig(p); }; }
{ const orig = pk8StageHTML; pk8StageHTML = function(p, st){ return st === "cone" ? coneHTML(p) : orig(p, st); }; }
{ const orig = spineState; spineState = function(p){
    const s = orig(p); if (!p || !coneActive(p)) return s;
    return Object.assign({}, s, {next: Object.assign({}, s.next, {label: t("cone.next"), a: "goto-ref", ref: "#pk-deck"})}); }; }
{ const orig = designPass; designPass = async function(p){ if (p && coneActive(p)){ UI.pass = {pid: p.id, at: now(), assumed: [], steps: [], stop: t("cone.pass.first"), endAt: now()}; render(); return UI.pass; } return orig(p); }; }
/* the start switch: kinds of tool first (default) · questions first · fast */
{ const orig = pickStart; pickStart = function(p){
    let h = orig(p); const cur = coneStartMode(p);
    const lab = v => t(v === "cone" ? "cone.start.cone" : v === "fast" ? "pk8.start.fast" : "pk8.start.qs");
    const sw = `<div class="row pk8-start" role="group" aria-label="${esc(t("pk8.start.label"))}"><span class="small muted">${esc(t("pk8.start.label"))}</span><div class="seg">${["cone", "questions", "fast"].map(v => `<button class="${cur === v ? "on" : ""}" data-a="pk8-start" data-v="${v}" aria-pressed="${cur === v}">${esc(lab(v))}</button>`).join("")}</div><span class="hint">${esc(t(cur === "cone" ? "cone.start.tip" : cur === "fast" ? "pk8.start.fasttip" : "pk8.start.qstip"))}</span></div>`;
    h = h.replace(/<div class="row pk8-start"[\s\S]*?<span class="hint">[\s\S]*?<\/span><\/div>/, sw);
    return cur === "cone" ? h.split(esc(t("pk8.start.go"))).join(esc(t("cone.start.go"))) : h; }; }
ACTIONS["pk8-start"] = el => { const p = curP(); if (!p) return; const v = ["cone", "questions", "fast"].includes(el.dataset.v) ? el.dataset.v : "cone"; if (coneStartMode(p) === v) return;
  actOpen(p, t("pk8.start.label")); pickOf(p).start = v; touch(p); actCloseSoon(p.id); render(); };

/* ---------- every answer is a decision row (rows API), with its own id and events ---------- */
function coneRowSrc(p, add){
  const c = coneRead(p); if (!c || !c.v || c.dismissed) return;
  const A = coneAns(c), cur = coneCurDim(p);
  for (const d of CONE_DIMS){
    const a = A[d]; if (!a && cur !== d) continue;
    add({src: "cone:" + d, ref: "cone:" + d, branch: "U", stage: d === "aud" ? 2 : 1, target: d === "aud" ? "audience" : "", question: t("cone.q." + d),
      options: CONE_OPTS[d].map(v => ({label: t("cone.o." + d + "." + v), why: t("cone.rev." + d + "." + v)})), star: null, hard: d === "aud",
      decided: !!a, val: a ? str(a.v) : "", chosen: a ? t("cone.o." + d + "." + a.v) : "", by: "owner", at: a ? str(a.at) : str(c.at)});
  }
  if (c.ending){ const fam = coneFam(c, c.ending.f), st = c.star && coneFam(c, c.star.f);
    add({src: "cone:ending", ref: "cone:ending", branch: "U", stage: 1, question: t("cone.q.ending"), options: arr(c.fams).map(f => ({label: str(f.title), why: str(f.get)})),
      star: st ? {label: str(st.title), why: str(c.star.why)} : null, decided: true, val: c.ending.f + (c.ending.shape ? ":" + c.ending.shape : ""), chosen: str(c.ending.title) || (fam ? str(fam.title) : c.ending.f), by: "owner", at: str(c.ending.at)}); }
}
ROW_SOURCES.push(coneRowSrc);
{ const orig = goRef; goRef = function(ref, o = {}){
    const p = curP();
    if (p && /^cone(:|-|$)/.test(str(ref))){ const on = coneActive(p), tgt = on ? "#cone" : coneRead(p) && coneRead(p).ending ? "#cone-sum" : "#pk-deck";
      if (typeof pgOn === "function" && pgOn(p)){ pgOpen(p, "picks", {flash: tgt}); return; }
      UI.home = false; UI.finish = null; UI.flashRef = tgt; UI.navRef = tgt; UI.navTry = 0; render(); return; }
    return orig(ref, o); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ const r = str(ref); if (/^cone:/.test(r)){ const d = r.slice(5); return t(d === "ending" ? "cone.q.ending" : "cone.qs." + (CONE_DIMS.includes(d) ? d : "aud")); } return orig(p, ref, full); }; }

/* ---------- what the AI sees: the kind and the answers are decided by the person ---------- */
function coneContextBlock(p){
  const c = coneRead(p); if (!c || c.dismissed) return "";
  const A = coneAns(c); if (!c.ending && !Object.keys(A).length) return "";
  const fam = c.ending ? coneFam(c, c.ending.f) : null, sh = c.ending && CONE_BY.get(c.ending.shape);
  const o = {kind: fam ? (fam.custom ? "a new kind in the person's words (unverified)" : (STR["cone.f." + fam.f] || [fam.f])[0]) : "not chosen yet", title: fam ? str(fam.title) : "", shape: sh ? (STR["cone.s." + sh.id] || [sh.id])[0] : "",
    for_whom: A.aud ? A.aud.v : "open", acts_outward: A.out ? A.out.v : "open", where: A.where ? A.where.v : "open", starts: A.when ? A.when.v : "open", private_first_portable: !!(A.aud && ["both", "unsure"].includes(A.aud.v))};
  return `<kind_of_tool decided_by="the person">\n${JSON.stringify(o)}\nThese were answered by the person when choosing the kind of tool: build on them and never ask them again as picks. "open" is not decided yet. private_first_portable: build it for the person first, with its data kept ready to share later.\n</kind_of_tool>`;
}
{ const orig = projectContext; projectContext = function(p, o = {}){ const s = orig(p, o); if (!p || (o && o.only && !arr(o.only).includes("decisions"))) return s; const b = coneContextBlock(p); return b ? s + "\n" + b : s; }; }

/* ---------- the screen ---------- */
function coneSentHTML(p, c){
  const s = str(c.sentence); if (!s) return "";
  const low = s.toLowerCase(), marks = [];
  for (const sp of CONE_DIMS.flatMap(d => c.pre && c.pre[d] ? [str(c.pre[d].span), str(c.pre[d].span2)] : []).filter(Boolean)){
    const i = low.indexOf(sp.toLowerCase()); if (i < 0 || marks.some(m => i < m[1] && i + sp.length > m[0])) continue; marks.push([i, i + sp.length]); }
  marks.sort((a, b) => a[0] - b[0]);
  let h = "", at = 0; for (const [a, b] of marks){ h += esc(s.slice(at, a)) + `<u>${esc(s.slice(a, b))}</u>`; at = b; } h += esc(s.slice(at));
  return `<p class="cone-sent"><span class="small muted">${esc(t("cone.sent"))}</span> «${h}» ${coneActive(p) ? `<button class="linkish small" data-a="cone-resent">${esc(t("cone.sent.edit"))}</button>` : ""}</p>`;
}
function coneRevChip(d, v){ const r = (CONE_REV[d] || {})[v] || "cheap"; return `<span class="cone-rev ${r}" title="${esc(t("cone.rev." + d + "." + v))}">${esc(t("cone.rev." + r))}</span>`; }
function coneDoneHTML(p, c){
  const A = coneAns(c), L = CONE_DIMS.filter(d => A[d]); if (!L.length) return "";
  return `<div class="cone-done" aria-label="${esc(t("cone.done"))}">${L.map(d => `<span class="chip cone-a" data-d="${d}"><span>${esc(t("cone.qs." + d))}: <b>${esc(t("cone.o." + d + "." + A[d].v))}</b></span>${coneRevChip(d, A[d].v)}${coneActive(p) ? `<button class="iconbtn cone-x" data-a="cone-x" data-d="${d}" aria-label="${esc(t("cone.x", {x: t("cone.qs." + d)}))}" title="${esc(t("cone.x", {x: t("cone.qs." + d)}))}">${ic("x")}</button>` : ""}</span>`).join("")}</div>`;
}
function coneQHTML(p, c, d){
  const pre = conePre(p, c, d), fam = c.picked ? coneFam(c, c.picked.f) : null, fams = coneLiveFams(c);
  const why = fam ? t(d === "aud" ? "cone.why.vaud" : "cone.why.verify", {x: fam.title}) : d === "aud" ? t("cone.why.aud") : t("cone.why.cut", {n: Math.max(0, ...CONE_OPTS[d].map(v => coneCutsIf(c, d, v)))});
  const preLine = !pre ? "" : pre.src === "sentence" ? `<p class="small cone-pre">${esc(t("cone.pre.sentence", {x: pre.span}))}</p>` : pre.src === "earlier" ? `<p class="small cone-pre">${esc(t("cone.pre.earlier", {x: pre.label}))}</p>`
    : `<p class="small cone-pre"><span class="as18"><span class="as18-w">${esc(t("look.assume"))}</span> ${esc(t("cone.pre.assumed", {x: t("cone.o." + d + "." + pre.v)}))}</span></p>`;
  const opts = CONE_OPTS[d].map(v => { const n = fams.length ? coneCutsIf(c, d, v) : 0;
    return `<button class="btn cone-opt ${pre && pre.v === v ? "pre" : ""}" data-a="cone-ans" data-d="${d}" data-v="${v}"><span class="cone-ol">${esc(t("cone.o." + d + "." + v))}</span>${coneRevChip(d, v)}<span class="cone-revt">${esc(t("cone.rev." + d + "." + v))}</span>${n ? `<span class="cone-cutn">${esc(t("cone.cuts", {n}))}</span>` : ""}</button>`; }).join("");
  return `<div class="cone-q" id="cone-q" data-anchor="cone:${d}" data-d="${d}"><h3>${esc(t("cone.q." + d))}</h3><p class="small muted">${esc(why)}</p>${preLine}
    <div class="cone-opts" role="group" aria-label="${esc(t("cone.q." + d))}">${opts}</div></div>`;
}
function coneConflictHTML(p, c){
  const x = UI.coneConflict, k = c.known && c.known[x.d], a = coneKnownLabel(k), b = t("cone.o." + x.d + "." + x.v);
  return `<div class="cone-q cone-conflict" id="cone-q" data-anchor="cone:${esc(x.d)}"><h3>${esc(t("cone.conf.title"))}</h3><p class="small">${esc(t("cone.conf.line", {a, b}))}</p>
    <div class="row"><button class="btn sm" data-a="cone-keep">${esc(t("cone.conf.keep", {x: a}))}</button><button class="btn sm" data-a="cone-replace">${esc(t("cone.conf.replace", {x: b}))}</button></div></div>`;
}
function coneTakeHTML(p, c){
  const live = c.picked ? [coneFam(c, c.picked.f)].filter(Boolean) : coneLiveFams(c);
  if (!live.length) return `<div class="cone-q cone-take" id="cone-q"><h3>${esc(t("cone.take.none"))}</h3><p class="small muted">${esc(t("cone.take.nonesub"))}</p></div>`;
  return `<div class="cone-q cone-take" id="cone-q" data-anchor="cone:ending"><h3>${esc(t(live.length === 1 ? "cone.take.one" : live.length === 2 ? "cone.take.two" : "cone.take.many", {n: live.length}))}</h3><p class="small muted">${esc(t("cone.take.sub"))}</p>
    <div class="cone-takes">${live.map(f => `<div class="row cone-tk"><span style="flex:1 1 12em"><b>${esc(f.title)}</b>${f.custom ? ` <span class="chip warn">${esc(t("cone.unverified"))}</span>` : ""}</span><button class="btn sm primary" data-a="cone-take" data-f="${esc(f.f)}">${ic("arrow")}${esc(t("cone.take.go"))}</button></div>`).join("")}</div></div>`;
}
function coneNoteHTML(c){
  const n = c.note; if (!n) return "";
  const fam = coneFam(c, n.f), name = fam ? fam.title : n.f;
  if (n.k === "out") return `<p class="small warn-t cone-note" role="status">${esc(t("cone.note.out", {x: name, q: t("cone.qs." + n.d), a: t("cone.o." + n.d + "." + n.v)}))}</p>`;
  if (n.k === "said-cut") return `<p class="small warn-t cone-note" role="status">${esc(t("cone.note.saidcut", {x: name, y: fam ? coneCutBy(c, fam).map(d => t("cone.qs." + d)).join(", ") : ""}))}</p>`;
  return "";
}
function coneStarShown(p){ return !!(p && UI.coneStar && UI.coneStar[p.id]); }
function coneStarHTML(p, c){
  const s = c.star, fam = s && coneFam(c, s.f); if (!fam) return "";
  if (!coneStarShown(p)) return `<p class="small cone-star hid" aria-live="polite">★ ${esc(t("cone.star.hid"))} <button class="linkish" data-a="cone-star">${esc(t("cone.star.show"))}</button></p>`;
  const live = coneLive(c, fam);
  return `<p class="small cone-star" aria-live="polite">★ <b>${esc(t("cone.star.mine", {x: fam.title}))}</b>${s.why ? " — " + esc(s.why) : ""}${s.doubt ? ` <span class="muted">· ${esc(t("cone.star.doubt", {x: s.doubt}))}</span>` : ""}${live ? "" : ` <span class="muted">· ${esc(t("cone.star.cut"))}</span>`}</p>`;
}
function coneRange(a, b){ return a === b ? String(a) : a + "–" + b; }
function coneCardHTML(p, c, fam, {cut = false, fold = false} = {}){
  const S = cut ? coneShapes(fam) : coneLiveShapes(c, fam), all = coneShapes(fam), f = esc(fam.f);
  const star = coneStarShown(p) && c.star && c.star.f === fam.f, picked = c.picked && c.picked.f === fam.f, hatched = !cut && coneHatched(c, fam);
  const aud = new Set(S.flatMap(s => s.aud.split(""))), ais = new Set(S.map(s => s.ai));
  const ai = fam.custom ? t("cone.unknown") : ais.size === 1 && ais.has(0) ? t("cone.ai.none") : ais.size === 1 && ais.has(1) ? t("cone.ai.run") : t("cone.ai.opt");
  const lo = k => Math.min(...S.map(s => s[k][0])), hi = k => Math.max(...S.map(s => s[k][1]));
  const cost = S.length ? (hi("cost") === 0 ? t("cone.cost0") : t("cone.cost", {x: coneRange(lo("cost"), hi("cost"))})) : t("cone.unknown");
  const time = S.length ? t("cone.time", {x: coneRange(lo("h"), hi("h"))}) : t("cone.unknown");
  const outs = new Set(S.map(s => s.out)), out = fam.custom ? t("cone.unknown") : outs.size === 1 && outs.has(1) ? t("cone.out.yes") : outs.has(1) || outs.has(2) ? t("cone.out.opt") : t("cone.out.no");
  const sig = coneSig(p, c, [fam]), n = coneCheckIds(p, sig).length;
  const audChips = ["m", "o", "c"].map(x => `<span class="chip ${aud.has(x) ? "" : "off"}">${esc(t("cone.who." + x))}</span>`).join("");
  const shapes = fam.custom ? "" : `<p class="small cone-shapes">${all.map(s => S.includes(s) ? esc(t("cone.s." + s.id)) : `<s>${esc(t("cone.s." + s.id))}</s>`).join(" · ")}</p>`;
  const why = cut && UI.coneWhy && UI.coneWhy.pid === p.id && UI.coneWhy.f === fam.f;
  const act = fold ? "" : cut ? `<button class="btn xs ghost" data-a="cone-why" data-f="${f}" aria-expanded="${!!why}">${esc(t("cone.why.cutbtn"))}</button>`
    : picked ? `<span class="chip acc">${esc(t("cone.picked.chip"))}</span>` : coneActive(p) && c.state === "ask" ? `<button class="btn sm" data-a="cone-pick" data-f="${f}">${ic("check")}${esc(t("cone.pick"))}</button>` : "";
  const whyHTML = why ? `<div class="cone-why small">${coneCutBy(c, fam).map(d => `<div class="row" style="gap:6px"><span style="flex:1 1 10em">${esc(t("cone.cutby", {q: t("cone.qs." + d), a: t("cone.o." + d + "." + coneAns(c)[d].v)}))}</span><button class="btn xs" data-a="cone-x" data-d="${d}">${esc(t("cone.cutback"))}</button></div>`).join("")}</div>` : "";
  return `<article class="cone-card ${cut ? "cut" : ""} ${fold ? "fold18" : ""} ${star ? "star" : ""} ${picked ? "picked" : ""} ${hatched ? "hatched" : ""} ${fam.custom ? "custom" : ""}" role="listitem" data-f="${f}" id="cone-${f}" ${fold ? 'aria-hidden="true"' : ""}>
    <pre class="cone-sk" aria-hidden="true">${esc(fam.sketch || CONE_SK[fam.f] || "")}</pre>
    <h4>${star ? "★ " : ""}${esc(fam.title)}${fam.custom ? ` <span class="chip warn">${esc(t("cone.unverified"))}</span>` : ""}</h4>
    <p class="small">${esc(fam.get)}</p>
    <dl class="cone-attrs"><dt>${esc(t("cone.attr.who"))}</dt><dd class="cone-aud">${audChips}</dd><dt>${esc(t("cone.attr.ai"))}</dt><dd>${esc(ai)}</dd><dt>${esc(t("cone.attr.cost"))}</dt><dd>${esc(cost)}</dd><dt>${esc(t("cone.attr.time"))}</dt><dd>${esc(time)}</dd><dt>${esc(t("cone.attr.out"))}</dt><dd>${esc(out)}</dd><dt>${esc(t("cone.attr.chk"))}</dt><dd class="cone-chk" data-n="${n}">${esc(t(sig.shared ? "cone.chk.on" : "cone.chk.tap", {n}))}</dd></dl>
    ${shapes}${hatched ? `<p class="small muted">${esc(t("cone.hatch"))}</p>` : ""}${whyHTML}<div class="row cone-cardact">${act}</div></article>`;
}
function coneNotHereHTML(p){
  const busy = AI.running.has(akey("cone-say", p.id));
  return `<article class="cone-card cone-nothere" role="listitem" id="cone-nothere"><h4>${esc(t("cone.nothere"))}</h4><p class="small">${esc(t("cone.nothere.sub"))}</p>
    <form class="stack" data-form="cone-say"><label class="fld"><span>${esc(t("cone.say.label"))}</span><span class="row own"><input type="text" id="cone-say-in" value="${esc(UI.qDraft["cone-say"] || "")}" placeholder="${esc(t("cone.say.ph"))}">${pickMic("cone-say-in")}</span></label>
    ${busy ? busyHTML("cone-say") : `<div class="row"><button class="btn sm" type="submit">${ic("arrow")}${esc(t("cone.say.go"))}</button></div>`}</form></article>`;
}
/** the cone on the Pick page's deck (the 1.8 start's stage "cone") */
function coneHTML(p){
  const c = coneRead(p) || {}, busy = AI.running.has(akey("cone", p.id));
  const top = `<section class="panel cone" id="cone" data-anchor="cone">${head(t(c.rerun ? "cone.title.rerun" : "cone.title"), t(c.rerun ? "cone.sub.rerun" : "cone.sub"))}${coneSentHTML(p, c)}`;
  const foot = `<div class="row cone-foot">${btn("cone-skip", t(c.rerun ? "cone.stop" : "cone.skip"), {cls: "sm ghost"})}</div>`;
  if (c.state === "infer") return top + `<p class="small">${ic("clock")} ${esc(t("cone.busy"))}</p>${busyHTML("cone")}${busy ? "" : `<div class="row">${btn("cone-retry", t("cone.retry"), {icon: "spark", cls: "sm"})}</div>`}${foot}</section>`;
  const fams = arr(c.fams), live = coneLiveFams(c), cnt = coneCount(c), d = coneCurDim(p);
  const fold = UI.coneFold && UI.coneFold.pid === p.id ? arr(UI.coneFold.fs) : [];
  const shown = fams.filter(f => live.includes(f) || fold.includes(f.f)), removed = fams.filter(f => !live.includes(f) && !fold.includes(f.f));
  const conflict = UI.coneConflict && UI.coneConflict.pid === p.id && c.known && c.known[UI.coneConflict.d];
  const q = conflict ? coneConflictHTML(p, c) : d ? coneQHTML(p, c, d) : coneTakeHTML(p, c);
  const pk = c.picked && coneFam(c, c.picked.f);
  const picked = pk ? `<p class="small cone-picked">${esc(t(c.picked.via === "said" ? "cone.picked.said" : "cone.picked", {x: pk.title}))} <button class="linkish" data-a="cone-unpick">${esc(t("cone.unpick"))}</button></p>` : "";
  const local = c.local ? `<p class="small muted cone-local">${esc(t("cone.local"))} <button class="linkish" data-a="cone-again">${esc(t("cone.again"))}</button></p>` : "";
  const count = `<div class="cone-count" role="status"><b>${esc(t("cone.left", {n: live.length}))}</b><span class="small muted">${esc(t("cone.cut", {a: cnt.cut, b: cnt.total}))}</span></div>`;
  const remOpen = !!(UI.coneRem && UI.coneRem[p.id]);
  const rem = removed.length ? `<details class="cone-removed" ${remOpen ? "open" : ""}><summary class="small" data-a="cone-rem">${esc(t("cone.removed", {n: removed.length}))}</summary><div class="cone-gal cut" role="list">${removed.map(f => coneCardHTML(p, c, f, {cut: true})).join("")}</div></details>` : "";
  return top + local + count + coneDoneHTML(p, c) + coneNoteHTML(c) + picked + q
    + `<p class="small cone-short">${esc(t("cone.short.d"))} <button class="linkish" data-a="cone-sayfocus">${esc(t("cone.short.e"))}</button></p>`
    + coneStarHTML(p, c)
    + `<div class="cone-gal live" role="list" aria-label="${esc(t("cone.gal"))}">${shown.map(f => coneCardHTML(p, c, f, {fold: !live.includes(f), cut: !live.includes(f)})).join("")}${coneNotHereHTML(p)}</div>`
    + rem + foot + `</section>`;
}
/** after the kind was taken: one line with what was decided, and the way to change it */
function coneSumHTML(p){
  const c = coneRead(p); if (!c || !c.ending || coneActive(p)) return "";
  const e = c.ending, A = coneAns(c), fam = coneFam(c, e.f), sig = fam ? coneSig(p, c, [fam]) : null, n = arr(e.checks).length;
  const ans = CONE_DIMS.filter(d => A[d]).map(d => `<span class="chip">${esc(t("cone.qs." + d))}: ${esc(t("cone.o." + d + "." + A[d].v))}</span>`).join("");
  return `<section class="panel cone-sum" id="cone-sum" data-anchor="cone:ending"><div class="row" style="gap:6px"><span class="small muted">${esc(t("cone.sum.kind"))}</span><b style="flex:1 1 12em">${esc(e.title)}</b>${e.custom ? `<span class="chip warn">${esc(t("cone.unverified"))}</span>` : ""}<button class="btn xs ghost" data-a="cone-change">${esc(t("cone.sum.change"))}</button></div>
    <div class="row cone-sumrow">${ans}<span class="chip">${esc(t(sig && sig.shared ? "cone.sum.chkon" : "cone.sum.chk", {n}))}</span>${A.aud && ["both", "unsure"].includes(A.aud.v) ? `<span class="chip">${esc(t("cone.portable"))}</span>` : ""}</div></section>`;
}
/* the Pick page: the offer for a tool from before 1.8, or what the cone decided, above the deck */
{ const orig = modePick; modePick = function(p){
    const h = orig(p); if (!p || coneActive(p)) return h;
    const add = coneOffer(p) || coneSumHTML(p); if (!add) return h;
    const m = /<div class="pk-deck"[^>]*>/.exec(h); return m ? h.slice(0, m.index + m[0].length) + add + h.slice(m.index + m[0].length) : add + h; }; }
/* the cover: the offer, under what the tool is */
{ const orig = coverHTML; coverHTML = function(p){ const h = orig(p); const o = coneOffer(p); return o ? h + o : h; }; }

/* ---------- the ★ shows once every card was looked at (in view, scrolled through) or on tap ---------- */
function coneWatch(){
  if (CONE_SEEN.obs) CONE_SEEN.obs.disconnect();
  const p = UI.view === "project" ? curP() : null, g = document.querySelector(".cone .cone-gal.live");
  if (!p || !g || coneStarShown(p) || typeof IntersectionObserver !== "function") return;
  const c = coneRead(p); if (!c || !c.star) return;
  const sig = p.id + "|" + arr(c.fams).map(f => f.f).join("");
  if (CONE_SEEN.sig !== sig){ CONE_SEEN.sig = sig; CONE_SEEN.seen = new Set(); CONE_SEEN.t0 = Date.now(); }
  if (!CONE_SEEN.obs) CONE_SEEN.obs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.5 && e.target.dataset.f) CONE_SEEN.seen.add(e.target.dataset.f); coneScanCheck(); }, {threshold: [0, 0.5, 1]});
  for (const el of g.querySelectorAll(".cone-card[data-f]:not(.cut)")) CONE_SEEN.obs.observe(el);
}
function coneScanCheck(){
  const p = UI.view === "project" ? curP() : null, c = p && coneRead(p); if (!c || coneStarShown(p) || !coneActive(p)) return;
  if (!CONE_SEEN.sig.startsWith(p.id + "|")) return;
  const live = coneLiveFams(c).filter(f => !f.custom).map(f => f.f);
  if (!live.length || !live.every(f => CONE_SEEN.seen.has(f))) return;
  const wait = CONE_SCAN_MS - (Date.now() - CONE_SEEN.t0);
  clearTimeout(CONE_SEEN.timer);
  if (wait > 0){ CONE_SEEN.timer = setTimeout(coneScanCheck, wait + 20); return; }
  UI.coneStar = Object.assign({}, UI.coneStar, {[p.id]: "scan"}); render();
}
{ const orig = afterRender; afterRender = function(){ const r = orig.apply(this, arguments); try{ coneWatch(); }catch(e){ onAppError(e && e.message, "cone:watch"); } return r; }; }

/* ---------- actions ---------- */
function coneP(el){ const id = el && el.dataset ? str(el.dataset.id) : ""; return (id && WS.projects.find(x => x.id === id)) || curP(); }
Object.assign(ACTIONS, {
  "cone-ans": el => { const p = curP(); if (p) coneAnswer(p, str(el.dataset.d), str(el.dataset.v)); },
  "cone-pick": el => { const p = curP(); if (p) conePick(p, str(el.dataset.f)); },
  "cone-take": el => { const p = curP(); if (!p || !coneActive(p)) return; const c0 = coneRead(p), fam = coneFam(c0, str(el.dataset.f)); if (!fam || !coneLive(c0, fam)) return;
    const label = t("cone.act.take", {x: fam.title}); actOpen(p, label); const c = coneOf(p); coneTakeIn(p, c, fam.f, c.picked ? c.picked.via : "cone"); touch(p); actCloseSoon(p.id); render(); toastUndo(label); coneAfterTake(p); },
  "cone-x": el => { const p = curP(), d = str(el.dataset.d), c0 = p && coneRead(p); if (!c0 || !coneActive(p) || !coneAns(c0)[d]) return;
    const label = t("cone.act.back", {x: t("cone.qs." + d)}); actOpen(p, label); const c = coneOf(p), A = Object.assign({}, c.ans); delete A[d]; c.ans = A; c.note = null;
    if (d === "aud" && c.audWas) p.audience = Object.assign({}, c.audWas);
    touch(p); actCloseSoon(p.id); UI.coneWhy = null; UI.coneConflict = null; render(); toastUndo(label); },
  "cone-unpick": () => { const p = curP(), c0 = p && coneRead(p); if (!c0 || !coneActive(p) || !c0.picked) return; actOpen(p, t("cone.unpick")); coneOf(p).picked = null; touch(p); actCloseSoon(p.id); render(); toastUndo(t("cone.unpick")); },
  "cone-replace": () => { const p = curP(), x = UI.coneConflict; if (p && x && x.pid === p.id) coneAnswer(p, x.d, x.v, {replace: true}); },
  "cone-keep": () => { const p = curP(), x = UI.coneConflict, c = p && coneRead(p); if (!c || !x || x.pid !== p.id) return; const k = c.known && c.known[x.d]; UI.coneConflict = null; if (k) coneAnswer(p, x.d, k.v); else render(); },
  "cone-skip": () => { const p = curP(), c0 = p && coneRead(p); if (!c0 || !coneActive(p)) return; const label = t(c0.rerun ? "cone.stop" : "cone.skip");
    actOpen(p, label); const c = coneOf(p); c.state = c.rerun ? "stopped" : "skipped"; c.picked = null; touch(p); actCloseSoon(p.id); render(); toastUndo(label);
    if (!c.rerun){ const id = p.id, ws0 = WS.id; setTimeout(() => { const q = pickLive({id}, ws0); if (q && pk8Stage(q) === "mock" && !mockOf(q)) pk8Continue(q); }, 0); } },
  "cone-retry": () => { const p = curP(), c = p && coneRead(p); if (c && c.state === "infer" && !AI.running.has(akey("cone", p.id))) return costGuard(p, "cone", () => coneInfer(p)); },
  "cone-again": () => { const p = curP(), c0 = p && coneRead(p); if (!c0 || !coneActive(p)) return; actOpen(p, t("cone.again")); coneOf(p).state = "infer"; touch(p); actClose(p.id); render(); return costGuard(p, "cone", () => coneInfer(p)); },
  "cone-resent": () => { const p = curP(), c0 = p && coneRead(p); if (!c0 || !coneActive(p)) return;
    promptBox(t("cone.sent.edit"), {value: str(c0.sentence), yes: t("btn.save")}, v => { const s = str(v).trim(); if (!s || s === str(c0.sentence)) return;
      actOpen(p, t("cone.sent.edit")); const c = coneOf(p); if (str(p.intake.raw).trim() === str(c.sentence) || !str(p.intake.raw).trim()) p.intake.raw = s;
      Object.assign(c, {sentence: s, state: "infer", fams: [], pre: {}, star: null, picked: null, note: null}); touch(p); actClose(p.id); render(); costGuard(p, "cone", () => coneInfer(p)); }); },
  "cone-change": () => { const p = curP(); if (p) coneRerun(p); },
  "cone-rerun": el => { const p = coneP(el); if (p) coneRerun(p); },
  "cone-norerun": el => { const p = coneP(el); if (p && coneDismiss(p)){ render(); toastUndo(t("cone.offer.no"), p); } },
  "cone-star": () => { const p = curP(); if (!p) return; UI.coneStar = Object.assign({}, UI.coneStar, {[p.id]: "tap"}); render(); },
  "cone-why": el => { const p = curP(), f = str(el.dataset.f); if (!p) return; UI.coneWhy = UI.coneWhy && UI.coneWhy.pid === p.id && UI.coneWhy.f === f ? null : {pid: p.id, f}; UI.coneRem = Object.assign({}, UI.coneRem, {[p.id]: true}); render(); },
  "cone-rem": () => { const p = curP(); if (!p) return; UI.coneRem = Object.assign({}, UI.coneRem, {[p.id]: !(UI.coneRem && UI.coneRem[p.id])}); render(); },
  "cone-sayfocus": () => focusSoon("cone-say-in")
});
for (const a of ["cone-star", "cone-why", "cone-rem", "cone-sayfocus", "cone-retry"]) ACT_NO.add(a);
FORMS["cone-say"] = f => { const p = curP(); if (!p) return; const v = str((f.querySelector("#cone-say-in") || {}).value).trim(); if (!v){ toast(t("cone.say.need"), "err"); return; } UI.qDraft["cone-say"] = v; return costGuard(p, "cone-say", () => coneSay(p, v)); };
document.addEventListener("input", e => { const el = e.target; if (el && el.id === "cone-say-in") UI.qDraft["cone-say"] = el.value; });

/* ---------- the look of the cone (motion: cut cards fold, reduced motion fades — styles18.css .fold18) ---------- */
const CONE_CSS = `
.cone .cone-sent{margin:4px 0 2px;line-height:1.55;overflow-wrap:break-word}
.cone .cone-sent u{text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:3px}
.cone-count{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin:6px 0}
.cone-count b{font-size:17px}
.cone-done{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.cone-a{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:100%;white-space:normal}
.cone-a .iconbtn{width:26px;height:26px;min-width:26px;min-height:26px}
.cone-q{border:1px solid var(--line);border-radius:16px;background:var(--surface-2);padding:12px 14px;display:flex;flex-direction:column;gap:6px;margin:8px 0}
.cone-q h3{margin:0;font-size:16px;overflow-wrap:break-word}
.cone-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,12.5em),1fr));gap:8px}
.cone .btn.cone-opt{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;white-space:normal;height:auto;min-height:44px;padding:8px 12px;border-radius:14px;max-width:100%}
.cone .btn.cone-opt.pre{box-shadow:inset 0 0 0 2px var(--accent)}
.cone-ol{font-weight:600;overflow-wrap:break-word}
.cone-rev{display:inline-block;font-size:11.5px;line-height:1.5;border-radius:999px;padding:0 8px;background:var(--ok-soft);color:var(--ok);font-weight:600}
.cone-rev.mid{background:var(--signal-soft);color:var(--signal)}
.cone-rev.costly{background:var(--crit-soft);color:var(--crit)}
.cone-revt,.cone-cutn{font-size:12px;color:var(--muted);font-weight:400;overflow-wrap:break-word}
.cone-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,15em),1fr));gap:10px;margin:8px 0}
.cone-card{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0;box-shadow:var(--shadow-sm)}
.cone-card h4{margin:0;font-size:15px;overflow-wrap:break-word}
.cone-card.star{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}
.cone-card.picked{border-color:var(--accent);background:var(--accent-soft)}
.cone-card.hatched{background-image:repeating-linear-gradient(135deg,transparent 0 9px,var(--bg-2) 9px 11px)}
.cone-card.cut{opacity:.62;filter:grayscale(1);box-shadow:none}
.cone-card.custom{border-style:dashed}
.cone-nothere{border-style:dashed;background:var(--surface-2)}
.cone-sk{font:11.5px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:6px 8px;margin:0;white-space:pre;overflow:hidden;max-width:100%;color:var(--fg-2)}
.cone-attrs{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;font-size:12.5px;margin:0}
.cone-attrs dt{color:var(--muted)}
.cone-attrs dd{margin:0;overflow-wrap:break-word;min-width:0}
.cone-aud{display:flex;gap:4px;flex-wrap:wrap}
.cone-aud .chip.off{opacity:.45;text-decoration:line-through}
.cone-shapes{margin:0;color:var(--fg-2)}
.cone-shapes s{color:var(--muted)}
.cone-star{border-left:3px solid var(--accent);padding-left:8px;margin:6px 0}
.cone-removed>summary{cursor:pointer;padding:4px 0}
.cone-takes{display:flex;flex-direction:column;gap:6px}
.cone-foot{margin-top:6px}
.cone-sumrow{gap:4px;flex-wrap:wrap}
.pk8-start .seg{flex-wrap:wrap;max-width:100%}
.pk8-start .seg button{white-space:normal}
`;
function coneCSS(){ try{ if (document.getElementById("cone18-css")) return; const s = document.createElement("style"); s.id = "cone18-css"; s.textContent = CONE_CSS; (document.head || document.documentElement).appendChild(s); }catch(e){ console.warn("cone: no styles", e); } }   // ok:catch  without its sheet the cone still works, plainer
coneCSS();
