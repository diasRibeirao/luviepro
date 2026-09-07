import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/modules/auth/screens/RegisterScreen.tsx',import.meta.url),'utf8');
const checks=[
  ['duplicate-email state exists',source.includes('emailAlreadyRegistered')],
  ['register conflict is mapped to email field',source.includes("email:'Este e-mail já possui uma conta no LuviePro.'")],
  ['existing-account guidance explains access management',source.includes('use o gerenciamento de acessos')],
  ['existing-account login CTA is rendered',source.includes('Entrar com esta conta')&&source.includes("router.replace('/login')")],
  ['editing email clears duplicate-account state',source.includes('setEmailAlreadyRegistered(false);setFieldErrors')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exit(1);
