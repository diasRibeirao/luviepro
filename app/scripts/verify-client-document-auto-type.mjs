import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const file=path.join(root,'src','modules','clients','screens','ClientsScreen.tsx');
const src=fs.readFileSync(file,'utf8');

const checks=[
 ['document change infers company after CPF length',src.includes("digits.length>11?'company':'individual'")],
 ['save derives company from 14 digits',src.includes("documentDigits.length===14?'company'")],
 ['save derives individual from 11 digits',src.includes("documentDigits.length===11?'individual':form.type")],
 ['validation uses effective type',src.includes('documentMessage(form.document,effectiveType)')],
 ['payload persists effective type',src.includes('{...form,type:effectiveType,whatsapp:')],
 ['CNPJ company fields remain automatic in UI',src.includes("form.type==='company'&&<><FormField label=\"Inscrição estadual\"")],
];

let failed=0;
for(const [name,pass] of checks){
  console.log(`${pass?'OK  ':'FAIL'} ${name}`);
  if(!pass)failed++;
}

if(failed){
  console.error(`\n${failed} client document auto-type check(s) failed.`);
  process.exit(1);
}
console.log('\nClient CPF/CNPJ automatic persistence verification passed.');
