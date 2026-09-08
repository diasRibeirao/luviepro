import fs from 'node:fs';
const file=new URL('../src/modules/quotes/screens/QuoteDetailScreen.tsx',import.meta.url);
const src=fs.readFileSync(file,'utf8');
const checks=[
 ['fallback padrão R$ 300',src.includes('const DEFAULT_PO_DAILY_CENTS=30000')],
 ['referência considera equipe ativa',src.includes("service.team?.filter(member=>member.included!==false)")],
 ['novo item usa referência efetiva',src.includes('dailyRateCents:serviceReferenceDailyCents(service),variableCostCents')],
 ['legado zero recupera referência efetiva',src.includes("(x.configurationJson?.dailyRateCents??0)>0?x.configurationJson!.dailyRateCents:serviceReferenceDailyCents(service)")],
 ['lista exibe a mesma referência',src.includes("base {money(serviceReferenceDailyCents(service))}")],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
