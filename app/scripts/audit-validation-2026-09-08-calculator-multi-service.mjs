import fs from 'node:fs';
const file=new URL('../src/modules/calculator/screens/CalculatorScreen.tsx',import.meta.url);
const s=fs.readFileSync(file,'utf8');
const checks=[
 ['referência soma todos os serviços', /setMinimumDaily\(selectedServices\.reduce\(\(sum,s\)=>sum\+serviceReferenceDaily\(s\),0\)\)/],
 ['serviço sem equipe cria P.O.', /if\(!members\.length\)\{/],
 ['P.O. usa cadastrada ou fallback de R$ 300', /const poDaily=service\.dailyRateCents>0\?service\.dailyRateCents:DEFAULT_PO_DAILY_CENTS/],
 ['diária efetiva preserva edição/soma', /const effectiveDaily=team\.length\?teamDaily:minimumDaily/],
];
let fail=0;
for(const [name,re] of checks){const ok=re.test(s); console.log(`${ok?'OK':'FAIL'} ${name}`); if(!ok)fail++;}
if(fail)process.exit(1);
console.log(`\n${checks.length}/${checks.length} checks passaram.`);
