import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const checks=[];
const add=(name,ok)=>checks.push([name,!!ok]);
const services=read('src/modules/services/screens/ServicesScreen.tsx');
const clients=read('src/modules/clients/screens/ClientsScreen.tsx');
const quotes=read('src/modules/quotes/components/QuoteWizard.tsx');
add('services default to persisted manual order',services.includes("[sort,setSort]=useState('manual')"));
add('optional email validates only when informed',clients.includes("if(form.email.trim()&&!isValidEmail(form.email))"));
add('blank email is omitted from payload',clients.includes("email:form.email.trim()||undefined"));
add('P.O. inherits service base daily',quotes.includes("{label:'P.O. responsável',value:toReais(service.dailyRateCents||0)}"));
const editableCalc="dailyRateCents:item.team.length?item.team.reduce((sum,line)=>sum+toCents(line.value),0):item.minimumDailyCents";
add('live calculation follows edited team/P.O.',quotes.includes(editableCalc));
add('saved quote follows edited team/P.O.',quotes.split(editableCalc).length>=3);
add(
  'client form keeps email string while API payload allows omission',
  /email:string;/.test(read('src/modules/clients/types/client.types.ts')) &&
  /SaveClientPayload=Omit<ClientForm,'email'>&\{email\?:string\}/.test(read('src/modules/clients/api/clients.api.ts'))
);
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);if(failed)process.exit(1);
