// read-only loader for a backup folder (default: backup-140); assembles split projects
const fs=require('fs'),path=require('path');
const S=process.env.BK || '/tmp/claude-0/-home-claude/7c3b61ed-ba30-5911-b48f-fdb261d43dba/scratchpad/backup-140/data/users/me';
function load(){
  const out=[];
  for(const w of fs.readdirSync(S).filter(f=>/^ws-.*\.json$/.test(f))){
    const wid=w.slice(3,-5); const pd=path.join(S,'ws-'+wid,'projects');
    if(!fs.existsSync(pd)) continue;
    for(const f of fs.readdirSync(pd).filter(f=>f.endsWith('.json'))){
      const pid=f.slice(0,-5); const head=JSON.parse(fs.readFileSync(path.join(pd,f),'utf8')); let p=Object.assign({},head);
      if(head._parts){ const pieces={}; for(const id of head._parts){ const fp=path.join(pd,pid,'parts',id+'.json'); pieces[id]=fs.existsSync(fp)?JSON.parse(fs.readFileSync(fp,'utf8')).s:null; }
        for(const [k,list] of Object.entries(head._fields||{})){ const v=JSON.parse(list.map(id=>pieces[id]).join('')); const at=k.indexOf('~'); if(at>0){const a=k.slice(0,at),b=k.slice(at+1); p[a]=Object.assign({},p[a]||{}); p[a][b]=v;} else p[k]=v; }
        delete p._fields; delete p._parts; }
      out.push({wid,pid,p});
    }
  }
  return out;
}
module.exports={load,S};
if(require.main===module){ for(const {wid,pid,p} of load()){ const pk=(p.pkg&&p.pkg.sections||[]).reduce((n,s)=>n+(s.content||'').length,0);
  console.log(wid.slice(0,8),pid,JSON.stringify(p.name),'lang',p.lang,'phase',p.phase,'bytes',JSON.stringify(p).length,'reqs',(p.requirements||[]).length,'tests',(p.tests||[]).length,'secs',(p.pkg&&p.pkg.sections||[]).length,'pkgchars',pk,'findings',(p.findings||[]).length,'open',(p.findings||[]).filter(f=>['open','waiting','signoff'].includes(f.status)).length,'flags',(p.flags||[]).length,'assum',(p.assumptions||[]).length,'risks',(p.risks||[]).length,'qa',(p.qa||[]).length,'fs',(p.foresight||[]).length,'rel',(p.releases||[]).map(r=>r.v).join(','),'live',p.live&&p.live.v,'comps',(p.arch.components||[]).length,'chosen',p.arch.chosen,'rec',p.arch.recommended,'rp',(p.restore||[]).length); } }
