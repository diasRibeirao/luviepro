import fs from 'node:fs';
import path from 'node:path';

const file=path.resolve('src/modules/services/screens/ServicesScreen.tsx');
const source=fs.readFileSync(file,'utf8');
const checks=[
  ['edição usa diária efetiva/fallback', source.includes('baseDaily:reais(serviceReferenceDailyCents(x))')],
  ['card usa diária efetiva', source.includes('<Text style={s.metric}>{money(serviceReferenceDailyCents(x))}</Text>')],
  ['composição exibe diária efetiva', source.includes('{money(serviceReferenceDailyCents(service))} · {service.team?.length||0} equipe')],
  ['helper central continua importado', source.includes('activeServiceTeam,serviceReferenceDailyCents,serviceTeamDailyCents')],
  ['não exibe diária bruta no card', !source.includes('<Text style={s.metric}>{money(x.dailyRateCents)}</Text>')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`); if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
