import fs from 'node:fs';import path from 'node:path';
function walk(d,o=[]){if(!fs.existsSync(d))return o;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.tsx'))o.push(p)}return o}
const files=walk('src/modules').filter(f=>f.includes(`${path.sep}screens${path.sep}`)||f.includes(`${path.sep}components${path.sep}`));
const findings=[];
for(const file of files){
 const src=fs.readFileSync(file,'utf8');
 const fixed=[...src.matchAll(/\b(?:width|minWidth|maxWidth)\s*:\s*(\d{3,})/g)].map(m=>Number(m[1])).filter(v=>v>=280);
 const responsive=/useWindowDimensions|Platform\.OS|flexWrap|ScrollView[^>]*horizontal/.test(src);
 if(fixed.length&&!responsive)findings.push({file,fixed:[...new Set(fixed)].sort((a,b)=>a-b)});
}
console.log('v261 responsive audit');
console.log(`INFO screens/components with large fixed widths and no explicit responsive handling: ${findings.length}`);
for(const f of findings)console.log(` - ${f.file}: ${f.fixed.join(', ')}`);
console.log('INFO This is a static warning list, not a build failure.');
