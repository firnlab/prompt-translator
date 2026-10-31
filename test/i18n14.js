// 1.4 string check: every key used in the code exists in EN/DE/ZH, German has no ß, placeholders match
const fs=require('fs'), vm=require('vm');
const order=require('child_process').execSync("python3 -c \"import re;s=open('build.py').read();print(' '.join(re.search(r'order = \\[(.*?)\\]', s, re.S).group(1).replace('\\\"','').replace(',',' ').split()))\"").toString().trim().split(/\s+/);
const strFiles=order.filter(f=>/^(knowledge|strings)/.test(f));
const ctx={}; vm.createContext(ctx); vm.runInContext(strFiles.map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n')+'\n;this.STR=STR;', ctx);
const STR=ctx.STR;
const code=order.filter(f=>!/^(knowledge|strings)/.test(f)).map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n');
const used=new Set([...code.matchAll(/(?:^|[^a-zA-Z0-9_.])t\("([a-zA-Z0-9_.]+)"(?!\s*\+)/g)].map(m=>m[1]).filter(k=>!k.endsWith('.')));   // "key" + variable is a dynamic family
// keys built from a prefix + variable
const dyn=[...code.matchAll(/t\("([a-zA-Z0-9_.]+\.)"\s*\+/g)].map(m=>m[1]);
const missing=[...used].filter(k=>!STR[k]).sort();
const bad=[]; for(const k in STR){ const r=STR[k]; if(!Array.isArray(r)||r.length!==3||r.some(x=>!x)) bad.push(k); else if(r[1].includes('ß')) bad.push(k+' (ß)'); const v=x=>(x.match(/\{[a-z]+\}/g)||[]).sort().join(); if(Array.isArray(r)&&r.length===3&&(v(r[1])!==v(r[0])||v(r[2])!==v(r[0]))) bad.push(k+' (placeholders)'); }
console.log('used',used.size,'defined',Object.keys(STR).length,'dynamic prefixes',[...new Set(dyn)].join(' '));
console.log('MISSING',missing.length); console.log(missing.join('\n'));
console.log('BAD',bad.length, bad.slice(0,40).join('\n'));
