import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const quote=fs.readFileSync(path.join(root,'src/modules/quotes/components/QuoteWizard.tsx'),'utf8');
const calc=fs.readFileSync(path.join(root,'src/modules/calculator/screens/CalculatorScreen.tsx'),'utf8');

const checks=[
  ['quote defines R$ 300 default P.O.',quote.includes('const DEFAULT_PO_DAILY_CENTS=30000;')],
  ['quote applies R$ 300 only as no-team fallback',quote.includes("const fallbackDailyCents=service.dailyRateCents>0?service.dailyRateCents:DEFAULT_PO_DAILY_CENTS")&&quote.includes("const budgetTeam=mapped.length?mapped:[{label:'P.O. responsável',value:toReais(fallbackDailyCents)}]")],
  ['quote keeps real team instead of duplicating fallback',quote.includes('minimumDailyCents:mapped.length?(service.dailyRateCents||0):fallbackDailyCents')],
  ['calculator defines R$ 300 default P.O.',calc.includes('const DEFAULT_PO_DAILY_CENTS=30000;')],
  ['calculator uses default for legacy service without team/daily',calc.includes('return service.dailyRateCents>0?service.dailyRateCents:DEFAULT_PO_DAILY_CENTS;')&&calc.includes('const poDaily=service.dailyRateCents>0?service.dailyRateCents:DEFAULT_PO_DAILY_CENTS;')],
  ['calculator sums reference daily for every selected service',calc.includes('selectedServices.reduce((sum,s)=>sum+serviceReferenceDaily(s),0)')],
];

let ok=0;
for(const [name,pass] of checks){
  console.log(`${pass?'OK  ':'FAIL'} ${name}`);
  if(pass)ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
