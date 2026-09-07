import fs from 'node:fs';import path from 'node:path';
function walk(d,o=[]){if(!fs.existsSync(d))return o;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.tsx?$/.test(p))o.push(p)}return o}
const files=walk('src').filter(f=>!f.endsWith(`${path.sep}i18n.tsx`));
const risky=[];
for(const file of files){const src=fs.readFileSync(file,'utf8');const values=[...src.matchAll(/\b(?:width|minWidth)\s*:\s*(\d{3,})/g)].map(m=>Number(m[1])).filter(v=>v>=280);if(!values.length)continue;const responsive=/useWindowDimensions|Dimensions\.get|Platform\.OS|flexWrap|ScrollView[^>]*horizontal|width\s*:\s*["']100%["']/.test(src);if(!responsive)risky.push({file,values:[...new Set(values)].sort((a,b)=>a-b)});}
console.log('v262 responsive audit');console.log(`INFO risky fixed width candidates without responsive handling: ${risky.length}`);for(const r of risky)console.log(` - ${r.file}: ${r.values.join(', ')}`);if(risky.length){console.log('WARN review candidates above before closing responsive cycle');process.exitCode=1}else console.log('OK no risky fixed-width candidates found by static audit');
