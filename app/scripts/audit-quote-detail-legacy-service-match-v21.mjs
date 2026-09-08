import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/modules/quotes/screens/QuoteDetailScreen.tsx',import.meta.url),'utf8');
const checks=[
  ['mantém prioridade do serviceId salvo',/configuredId[\s\S]*candidate\.id===configuredId/],
  ['faz fallback pelo nome do snapshot legado',/normalizedServiceName\(item\.serviceName\)[\s\S]*normalizedServiceName\(candidate\.name\)===target/],
  ['só aceita nome legado quando a correspondência é única',/byName\.length===1\?byName\[0\]:undefined/],
  ['usa o id recuperado do serviço no editor',/const serviceId=service\?\.id\?\?x\.configurationJson\?\.serviceId\?\?''/],
  ['preserva fallback de diária e custos do serviço',/dailyRateCents:x\.configurationJson\?\.dailyRateCents\?\?service\?\.dailyRateCents[\s\S]*variableCostCents:x\.configurationJson\?\.variableCostCents\?\?service\?\.variableCostCents[\s\S]*fixedCostCents:x\.configurationJson\?\.fixedCostCents\?\?service\?\.fixedCostCents/],
];
let ok=0;
for(const [name,re] of checks){const pass=re.test(source);console.log(`${pass?'OK  ':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
