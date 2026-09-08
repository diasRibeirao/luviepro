import fs from 'node:fs';

const file='src/modules/quotes/components/QuoteWizard.tsx';
const source=fs.readFileSync(file,'utf8');
const checks=[
  ['helper de diária de referência existe',source.includes('const serviceReferenceDailyCents=(service:QuoteServiceOption)=>')],
  ['serviço sem equipe e diária zero usa R$ 300',source.includes('return service.dailyRateCents>0?service.dailyRateCents:DEFAULT_PO_DAILY_CENTS;')],
  ['equipe incluída é considerada na referência',source.includes("service.team?.filter(member=>member.included!==false)??[]")],
  ['soma diária da equipe quando aplicável',source.includes('const teamDaily=members.reduce((sum,member)=>sum+Math.max(0,Number(member.dailyRateCents)||0),0);')],
  ['lista de serviços usa referência coerente',source.includes('{money(serviceReferenceDailyCents(service))}')],
  ['lista não mostra mais diretamente dailyRateCents cru',!source.includes('<Text style={s.baseValue}>{money(service.dailyRateCents)}</Text>')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK  ':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
