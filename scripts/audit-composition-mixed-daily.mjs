import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app/src/modules/services/screens/ServicesScreen.tsx',import.meta.url),'utf8');
const checks=[
 ['filtra integrantes incluídos',/service\.team\?\?\[\]\)\.filter\(member=>member\.included!==false\)/],
 ['preserva equipe existente',/if\(members\.length\)return members\.map/],
 ['preserva diária de serviço sem equipe',/service\.dailyRateCents>0\?\[\{role:/],
 ['identifica P.O. responsável',/P\.O\. responsável/],
 ['mantém diária total como referência visual',/const dailyRateCents=selected\.reduce/],
];
let failed=0;
for(const [name,re] of checks){const ok=re.test(source);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log(`\n${checks.length}/${checks.length} checks OK`);
