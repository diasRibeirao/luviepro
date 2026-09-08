import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const first=read('src/modules/auth/screens/AcceptInviteScreen.tsx');
const company=read('src/modules/settings/screens/CompanyScreen.tsx');
const checks=[
  ['nova conta segue para empresa em modo onboarding', first.includes("router.replace('/company?onboarding=1')")],
  ['primeiro acesso não oferece atalho direto ao painel', !first.includes('Ir para o painel agora')],
  ['empresa reconhece parâmetro onboarding', company.includes("onboardingParam==='1'")],
  ['salvamento do onboarding conclui na home', company.includes("if(onboarding){Alert.alert('Configuração inicial concluída');router.replace('/home');return}")],
  ['ação do onboarding indica continuidade', company.includes('label={onboarding?"Salvar e continuar":"Salvar alterações"}')],
  ['título identifica primeiro acesso', company.includes('title={onboarding?"Primeiro acesso · Empresa":"Empresa"}')],
];
let failed=0;
for(const [name,ok] of checks){console.log(ok?'OK  ':'FAIL',name);if(!ok)failed++}
if(failed)process.exit(1);
console.log(`\n${checks.length}/${checks.length} verificações aprovadas.`);
