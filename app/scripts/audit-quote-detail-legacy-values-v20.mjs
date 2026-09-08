import fs from 'node:fs';
const file=new URL('../src/modules/quotes/screens/QuoteDetailScreen.tsx', import.meta.url);
const src=fs.readFileSync(file,'utf8');
const checks=[
 ['localiza o serviço original ao editar orçamento',/allServices\.find\(\(candidate:ServiceOption\)=>candidate\.id===serviceId\)/],
 ['usa diária salva e faz fallback para serviço',/dailyRateCents:x\.configurationJson\?\.dailyRateCents\?\?service\?\.dailyRateCents/],
 ['faz fallback dos custos variável e fixo',/variableCostCents:x\.configurationJson\?\.variableCostCents\?\?service\?\.variableCostCents[\s\S]*fixedCostCents:x\.configurationJson\?\.fixedCostCents\?\?service\?\.fixedCostCents/],
 ['faz fallback da margem de segurança',/safetyMarginBps:x\.configurationJson\?\.safetyMarginBps\?\?service\?\.safetyMarginBps/],
 ['preserva etapas do orçamento e usa serviço quando legado não possui etapas',/x\.stages\?\.length\?x\.stages:\(service\?\.stages\?\?\[\]\)/],
];
let ok=0;
for(const [name,re] of checks){const pass=re.test(src);console.log(`${pass?'OK':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
