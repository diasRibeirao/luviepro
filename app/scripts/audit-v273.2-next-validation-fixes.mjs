import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const checks=[];
const add=(name,ok)=>checks.push([name,Boolean(ok)]);

const register=read('src/modules/auth/screens/RegisterScreen.tsx');
const quoteDetail=read('src/modules/quotes/screens/QuoteDetailScreen.tsx');

add(
  'first access password validation matches backend minimum of 8',
  register.includes("if(password.length<8)next.password='A senha deve ter pelo menos 8 caracteres.';") &&
  !register.includes("password.length<6")
);

add(
  'quote detail has explicit back button to quotes',
  quoteDetail.includes("router.push('/quotes' as Href)") &&
  quoteDetail.includes('name="arrow-back"') &&
  quoteDetail.includes('>Voltar</Text>')
);

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'OK  ':'FAIL'} ${name}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exit(1);
