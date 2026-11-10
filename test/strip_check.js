/* 2.2.0 item 21: the built page leaves out comments that start a line. This check proves that nothing else changed: it builds the page with
   and without stripping and compares the two token streams with a real JavaScript parser (acorn, comments are not tokens). Any difference
   (a removed piece that was code or text) fails. acorn is installed under work/ (git-ignored) when missing; CI runs only data-free checks. */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.resolve(__dirname, ".."), W = path.join(ROOT, "work", "acorn");
let acorn; try{ acorn = require(path.join(W, "node_modules", "acorn")); }catch(e){
  fs.mkdirSync(W, {recursive: true}); cp.execSync("npm init -y >/dev/null 2>&1 && npm install acorn@8.14.0 --no-audit --no-fund >/dev/null 2>&1", {cwd: W, stdio: "inherit"});
  acorn = require(path.join(W, "node_modules", "acorn")); }
const js = f => { const h = fs.readFileSync(f, "utf8"); return h.slice(h.indexOf('<script>\n"use strict";') + 9, h.lastIndexOf("</script>")); };
const dist = path.join(ROOT, "dist", "prompt-translator.html"), keep = path.join(ROOT, "work", "strip-keep.html");
cp.execSync(`python3 build.py --keep-comments >/dev/null && cp ${JSON.stringify(dist)} ${JSON.stringify(keep)} && python3 build.py >/dev/null`, {cwd: ROOT});
const toks = s => { const out = []; for (const t of acorn.tokenizer(s, {ecmaVersion: "latest"})) out.push(t.type.label + "\u0000" + (t.value === undefined ? "" : String(t.value))); return out; };
const A = toks(js(keep)), B = toks(js(dist));
let diff = -1; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]){ diff = i; break; }
const saved = fs.statSync(keep).size - fs.statSync(dist).size;
console.log(diff < 0 ? `strip check: the same ${A.length} tokens with and without comments; ${saved} bytes saved` : `strip check: FAILED at token ${diff}: ${JSON.stringify(A[diff])} vs ${JSON.stringify(B[diff])}`);
process.exit(diff < 0 ? 0 : 1);
