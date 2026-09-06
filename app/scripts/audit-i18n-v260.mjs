import fs from 'node:fs';
import path from 'node:path';

const roots=['app','src'];
const extensions=new Set(['.tsx','.ts']);
const skip=new Set(['i18n.tsx']);
const accent=/[áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ]/;
const literal=/(?:'([^'\n]{2,180})'|"([^"\n]{2,180})"|`([^`\n]{2,180})`)/g;

function walk(dir,out=[]){
  if(!fs.existsSync(dir)) return out;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p,out);
    else if(extensions.has(path.extname(e.name))&&!skip.has(e.name)) out.push(p);
  }
  return out;
}

const i18n=fs.readFileSync(path.join('src','i18n.tsx'),'utf8');
const start=i18n.indexOf('const exact:Record');
const end=i18n.indexOf('\n};',start);
const block=start>=0&&end>=0?i18n.slice(start,end):i18n;
const translated=new Set([...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]));

const remaining=[];
for(const root of roots){
  for(const file of walk(root)){
    const src=fs.readFileSync(file,'utf8');
    let m;
    while((m=literal.exec(src))){
      const text=m[1]??m[2]??m[3];
      if(!accent.test(text)) continue;
      if(text.includes('http')||text.includes('${')||text.length>180) continue;
      if(!translated.has(text)) remaining.push({file,text});
    }
  }
}
const unique=[...new Map(remaining.map(x=>[x.file+'|'+x.text,x])).values()];
console.log(`v260 final i18n audit`);
console.log(`INFO untranslated accented literals: ${unique.length}`);
for(const x of unique.slice(0,120)) console.log(` - ${x.file}: ${x.text}`);
if(unique.length) {
  console.log('\nINFO Audit found remaining literals. Review them before declaring 100% visual translation.');
} else {
  console.log('OK no untranslated accented literals found by static audit.');
}
