import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve('src/modules/calculator/screens/CalculatorScreen.tsx');
const src=fs.readFileSync(file,'utf8');
const checks=[
  ['P.O./equipe editável controla a diária',src.includes('const effectiveDaily=team.length?teamDaily:minimumDaily;')],
  ['não usa mais piso Math.max que bloqueia redução',!src.includes('const effectiveDaily=Math.max(teamDaily,minimumDaily);')],
  ['diária cadastrada segue como fallback',src.includes('team.length?teamDaily:minimumDaily')],
  ['texto explica que ajustes passam a valer',src.includes('Ajustes feitos nas linhas de equipe/P.O. abaixo passam a valer imediatamente no cálculo.')],
  ['rascunho do orçamento leva a diária efetivamente calculada',src.includes('minimumDailyCents:effectiveDaily')],
];
let ok=0;
for(const [label,pass] of checks){console.log(`${pass?'OK  ':'FAIL'} ${label}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
