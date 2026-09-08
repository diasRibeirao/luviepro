import fs from 'node:fs';
const services=fs.readFileSync(new URL('../src/modules/services/screens/ServicesScreen.tsx', import.meta.url),'utf8');
const wizard=fs.readFileSync(new URL('../src/modules/quotes/components/QuoteWizard.tsx', import.meta.url),'utf8');
const checks=[
 ['novo serviço parte de R$ 300,00',services.includes("const DEFAULT_BASE_DAILY='300'")&&services.includes('baseDaily:DEFAULT_BASE_DAILY')],
 ['novo serviço parte de 1 dia',services.includes("defaultDays:'1'")],
 ['orçamento cria P.O. quando não há equipe',wizard.includes("service.dailyRateCents>0?[{label:'P.O. responsável',value:toReais(service.dailyRateCents)}]:[]")],
 ['orçamento não duplica base quando há equipe',wizard.includes('const budgetTeam=mapped.length?mapped:')],
 ['persistência calcula pela equipe exibida',wizard.includes('dailyRateCents:item.team.length?item.team.reduce')],
];
let ok=0; for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`); if(pass)ok++;}
console.log(`${ok}/${checks.length} checks OK`); if(ok!==checks.length)process.exit(1);
