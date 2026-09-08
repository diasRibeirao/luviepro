import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src/modules/services/screens/ServicesScreen.tsx');
const source=fs.readFileSync(file,'utf8');
const checks=[
  ['ordenação desc usa diária efetiva', source.includes("sort==='value-desc'?serviceReferenceDailyCents(b)-serviceReferenceDailyCents(a)")],
  ['ordenação asc usa diária efetiva', source.includes("sort==='value-asc'?serviceReferenceDailyCents(a)-serviceReferenceDailyCents(b)")],
  ['não ordena mais pelo dailyRateCents bruto no menu de valor', !source.includes("sort==='value-desc'?(b.dailyRateCents||0)-(a.dailyRateCents||0)")],
  ['helper de diária efetiva está importado', source.includes('serviceReferenceDailyCents')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length) process.exit(1);
