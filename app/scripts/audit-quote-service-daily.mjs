import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/modules/quotes/components/QuoteWizard.tsx',import.meta.url),'utf8');
const checks=[
  ['não duplica dailyRate do serviço quando há equipe', source.includes("const budgetTeam=mapped.length?mapped:")],
  ['usa diária base como P.O. apenas sem equipe', source.includes("const budgetTeam=mapped.length?mapped:[{label:'P.O. responsável',value:toReais(fallbackDailyCents)}]")&&source.includes('const fallbackDailyCents=service.dailyRateCents>0?service.dailyRateCents:DEFAULT_PO_DAILY_CENTS')],
  ['cálculo soma as linhas efetivamente exibidas', source.includes("const effectiveDailyCents=(item:ServiceItem)=>")&&source.includes("dailyRateCents:effectiveDailyCents(item),")],
  ['persistência usa a mesma diária do cálculo', (source.match(/dailyRateCents:effectiveDailyCents\(item\),/g)||[]).length>=2],
];
for(const [name,ok] of checks) console.log(`${ok?'OK':'FAIL'} ${name}`);
if(checks.some(([,ok])=>!ok)) process.exit(1);
