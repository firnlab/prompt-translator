const fs=require('fs'); const vm=require('vm');
const src=['knowledge.js','strings.js'].map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n')+'\n;this.STR=STR;this.KP=KP_RULES;this.FS=FORESIGHT;this.DIMS=DIMS;';
const ctx={}; vm.createContext(ctx); vm.runInContext(src,ctx);
const STR=ctx.STR;
const code=fs.readdirSync('src').filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n');
const used=new Set([...code.matchAll(/(?:^|[^a-zA-Z0-9_.])t\("([a-zA-Z0-9_.]+)"/g)].map(m=>m[1]).filter(k=>!k.endsWith('.')));
const fam={acat:['value','usability','viability','feasibility','gtm','legal'],akind:['none','prompt','workflow','agent','multi'],ast:['untested','testing','validated','invalid'],become:['requirement','assumption','question','risk','task','pattern','keep'],'build.tab':['package','lint','versions'],conf:['high','medium','low'],cost:['l','m','h'],'cost.tip':['L','M','H'],depth:['quick','standard','deep'],effort:['low','medium','high','auto'],fbs:['new','diagnosed','fixing','fixed'],fst:['fixed','dismissed'],judge:['agree','disagree'],kind:['ai','code','hybrid','human','platform'],'launch.missing':['line','test','both'],'lib.tab':['patterns','practices','research'],'log.tab':['decisions','open','foresight','research'],lsev:['error','warn','info'],ns:['problem','goal','success','users','constraints','now'],ntype:['idea','question','concern','decision','todo','source','recap','none'],'op.tab':['inbox','health','watch'],pri:['must','should','could'],rks:['open','mitigated','accepted','closed'],rksrc:['premortem','architecture','manual','notes'],score:['reliability','cost','safety','effort','maintainability','platformFit'],'set.tab':['general','models','workspaces','data','about'],sev:['critical','high','medium','low'],srcq:['primary','secondary','opinion'],st:['unknown','assumed','confirmed'],step:['capture','understand','interview','require','arch','build','review','test','launch','operate','notes','insights'],tcat:['normal','edge','adversarial','empty','language'],'test.tab':['cases','runs','improve','judge'],theme:['system','dark','light'],tier:['complex','default','quick','complex.d','default.d','quick.d'],und:['functional','emotional','social'],verd:['pass','fail','unknown'],next:['capture','understand','interview','assume','require','arch','build','review','test','launch','operate'],
'ai.err':['notgranted','disabled','rate','session','refused','empty','json','large','upstream','cancelled','image','unavailable'],
lint:['caps','verify','negative','vague','placeholder','long','nodone','noformat','noreason','nocadence','nofilename','skilldesc','skillname','dup','noinstr'],
rd:['ns','dims','assume','risks','reqtests','pkg','review','tests','trace','setup']};
for(const f in fam) for(const v of fam[f]) used.add(f+'.'+v);
let missing=[], incomplete=[], eszett=[];
for(const k of used){ const r=STR[k]; if(!r) missing.push(k); else if(r.length!==3||r.some(x=>!x)) incomplete.push(k); }
for(const k in STR){ if(STR[k][1].includes('ß')) eszett.push(k); }
// placeholder parity
let ph=[]; for(const k in STR){ const vars=r=>(r.match(/\{[a-z]+\}/g)||[]).sort().join(); const a=vars(STR[k][0]); if(vars(STR[k][1])!==a||vars(STR[k][2])!==a) ph.push(k); }
// knowledge items
let kmiss=[]; for(const x of [...ctx.KP,...ctx.FS]) for(const l of ['en','de','zh']) if(!x[l]) kmiss.push(x.id+':'+l);
for(const x of [...ctx.KP,...ctx.FS]) if((x.de||'').includes('ß')) eszett.push('kp:'+x.id);
for(const d of ctx.DIMS){ for(const l of ['en','de','zh']){ if(!d[l]||!d.cost[l]) kmiss.push(d.id+':'+l); } if((d.de+d.cost.de).includes('ß')) eszett.push('dim:'+d.id); }
const unused=Object.keys(STR).filter(k=>!used.has(k));
console.log('used',used.size,'defined',Object.keys(STR).length);
console.log('MISSING',missing); console.log('INCOMPLETE',incomplete); console.log('ESZETT',eszett); console.log('PLACEHOLDER MISMATCH',ph); console.log('KNOWLEDGE MISSING',kmiss); console.log('UNUSED',unused.length, unused.slice(0,40));
