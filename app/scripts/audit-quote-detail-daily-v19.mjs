import fs from 'node:fs';
const path='app/src/modules/quotes/screens/QuoteDetailScreen.tsx';
const s=fs.readFileSync(path,'utf8');
const checks=[
 ['editor exposes daily rate',s.includes('Diária P.O./equipe (R$)')],
 ['daily rate is editable',s.includes('patchItemDailyRate(service.id,v)')],
 ['currency is converted to cents',s.includes('Math.round(parsed*100)')],
 ['daily rate has inline validation',s.includes("itemErrors[`${service.id}-dailyRate`]")],
 ['invalid/zero daily is blocked',s.includes("Informe a diária da P.O./equipe.")],
 ['saved payload already persists dailyRateCents',s.includes('dailyRateCents:x.dailyRateCents')],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\\n${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
