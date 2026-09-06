import fs from 'node:fs';import path from 'node:path';
const accent=/[áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ]/;
const literal=/(?:'([^'\n]{2,180})'|"([^"\n]{2,180})"|`([^`\n]{2,180})`)/g;
function walk(d,o=[]){if(!fs.existsSync(d))return o;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(['.tsx','.ts'].includes(path.extname(e.name))&&e.name!=='i18n.tsx')o.push(p)}return o}
const i=fs.readFileSync(path.join('src','i18n.tsx'),'utf8'),s=i.indexOf('const exact:Record'),e=i.indexOf('\n};',s),b=s>=0&&e>=0?i.slice(s,e):i;
const done=new Set([...b.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]));
const out=[];for(const root of ['app','src'])for(const file of walk(root)){const src=fs.readFileSync(file,'utf8');let m;while((m=literal.exec(src))){const t=m[1]??m[2]??m[3];if(!accent.test(t)||done.has(t)||t.includes('${')||/[<>{}]/.test(t)||t.includes('http'))continue;out.push([file,t])}}
const unique=[...new Map(out.map(x=>[x[0]+'|'+x[1],x])).values()];
console.log('v260.1 refined i18n audit');console.log(`INFO clean untranslated accented literals: ${unique.length}`);for(const [f,t] of unique)console.log(` - ${f}: ${t}`);
if(unique.length)console.log('\\nINFO Remaining entries require classification: UI text vs internal/technical literal.');
else console.log('OK no clean untranslated accented literals found.');
