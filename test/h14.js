// Node VM harness for PT 1.4 logic (no browser): loads the built script with DOM stubs. Read-only on real data.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
function makeCtx(){
  const html = fs.readFileSync(path.join(ROOT, "dist/prompt-translator.html"), "utf8");
  let js = html.split("<script>")[1].split("</script>")[0].replace(/\nboot\(\);\s*$/, "\n");
  const noop = () => {};
  const listeners = {};
  const fakeEl = () => ({ addEventListener: noop, appendChild: noop, querySelector: () => null, querySelectorAll: () => [], setAttribute: noop, removeAttribute: noop, style: {setProperty: noop}, classList: {add: noop, remove: noop, contains: () => false}, dataset: {}, remove: noop, closest: () => null, matches: () => false });
  const doc = Object.assign(fakeEl(), { getElementById: () => null, createElement: () => fakeEl(), createTextNode: () => ({}), documentElement: fakeEl(), body: fakeEl(), activeElement: null, visibilityState: "visible", fonts: null, addEventListener: (k, f) => { (listeners[k] = listeners[k] || []).push(f); } });
  const timers = [];
  const ctx = { console, setTimeout: (f, ms) => { timers.push(f); return timers.length; }, clearTimeout: noop, setInterval: () => 0, clearInterval: noop, requestAnimationFrame: noop, document: doc, navigator: { language: "en", onLine: true, clipboard: {writeText: async () => {}} }, localStorage: { _m: {}, getItem(k){ return this._m[k] ?? null; }, setItem(k, v){ this._m[k] = String(v); }, removeItem(k){ delete this._m[k]; } }, matchMedia: () => ({ matches: false, addEventListener: noop }), CSS: { escape: s => s }, location: {}, crypto: require("crypto").webcrypto, TextEncoder, URL, Image: function(){}, btoa: s => Buffer.from(s, "binary").toString("base64"), atob: s => Buffer.from(s, "base64").toString("binary"), getComputedStyle: () => ({}) };
  ctx.window = { addEventListener: noop, claude: null, getSelection: () => null, innerWidth: 1280, document: doc, matchMedia: ctx.matchMedia };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  js += "\n;globalThis.__x = (s) => eval(s);";
  vm.runInContext(js, ctx, { filename: "pt.js" });
  ctx.flush = () => { let n = 0; while (timers.length && n < 1000){ const f = timers.shift(); try{ f(); }catch(e){ console.log("timer error", e.message); } n++; } };
  ctx.X = s => ctx.__x(s);
  return ctx;
}
function loadBackup(dir){
  const S = dir || "work/backup-140/data/users/me";
  const {load} = require(path.join(__dirname, "tools/load140.js"));
  process.env.BK = S;
  return load();
}
module.exports = {makeCtx, loadBackup};
