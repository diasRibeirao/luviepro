import fs from 'node:fs';

const file=new URL('../src/modules/clients/screens/ClientsScreen.tsx',import.meta.url);
const source=fs.readFileSync(file,'utf8');

const checks=[
  ["automatic type function","const changeDocument=(raw:string)=>"],
  ["CNPJ threshold","digits.length>11?'company':'individual'"],
  ["single CPF/CNPJ field",'label="CPF/CNPJ"'],
  ["automatic helper",'Pessoa jurídica identificada automaticamente.'],
  ["document handler",'onChangeText={changeDocument}'],
];

for(const [name,needle] of checks){
  if(!source.includes(needle)){
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`OK   ${name}`);
}
console.log('Client CPF/CNPJ automatic type verification passed.');
