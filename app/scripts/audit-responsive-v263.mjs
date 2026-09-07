import fs from 'node:fs';import path from 'node:path';

const roots=[
 'src/modules/clients',
 'src/modules/services',
 'src/modules/products',
 'src/modules/quotes',
 'src/modules/projects',
 'src/modules/orders',
 'src/modules/purchases'
];

function walk(d,o=[]){if(!fs.existsSync(d))return o;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.(tsx|ts)$/.test(p))o.push(p)}return o}

const files=roots.flatMap(r=>walk(r));
const warnings=[];
for(const file of files){
 const src=fs.readFileSync(file,'utf8');
 const hasWindow=/useWindowDimensions/.test(src);
 const hasWrap=/flexWrap\s*:\s*['"]wrap['"]/.test(src);
 const largeFixed=[...src.matchAll(/\b(?:width|minWidth|maxWidth)\s*:\s*(\d{3,})/g)].map(m=>Number(m[1])).filter(v=>v>=320);
 const rowHeavy=(src.match(/flexDirection\s*:\s*['"]row['"]/g)||[]).length>=4;
 if(largeFixed.length&&!hasWindow&&!hasWrap) warnings.push(`${file}: fixed ${[...new Set(largeFixed)].join(', ')}`);
 if(rowHeavy&&!hasWindow&&!hasWrap) warnings.push(`${file}: row-heavy without explicit responsive handling`);
}
console.log('v263 daily screens responsive audit');
console.log(`INFO warning candidates: ${warnings.length}`);
for(const w of warnings) console.log(` - ${w}`);
if(!warnings.length) console.log('OK no obvious static responsive warnings in daily-use modules');
console.log('INFO Static audit complements, but does not replace, visual Web/Android/iOS testing.');
