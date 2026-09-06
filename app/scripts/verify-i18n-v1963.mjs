import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
const src=fs.readFileSync(file,'utf8');

const exactStart=src.indexOf('const exact:Record');
if(exactStart<0)throw new Error('Objeto exact não encontrado.');
const exactEnd=src.indexOf('\n};',exactStart);
if(exactEnd<0)throw new Error('Fim do objeto exact não encontrado.');
const exact=src.slice(exactStart,exactEnd);

// Support both single-quoted and double-quoted property names.
const matches=[...exact.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)];
const counts=new Map();
for(const m of matches){
  const key=m[1]??m[2];
  counts.set(key,(counts.get(key)||0)+1);
}
const duplicates=[...counts.entries()].filter(([,count])=>count>1);

if(duplicates.length){
  console.error('FAIL duplicate i18n keys:');
  for(const [key,count] of duplicates)console.error(` - ${key}: ${count}`);
  process.exit(1);
}

const required=[
 'Ordem dos serviços atualizada',
 'Status dos projetos',
 'Catálogo, composição de custos e parâmetros de cobrança',
];
for(const key of required){
  const count=counts.get(key)||0;
  console.log(`${count===1?'OK  ':'FAIL'} ${key} -> ${count}`);
  if(count!==1)process.exitCode=1;
}
console.log('OK   no duplicate quoted i18n keys');
if(!process.exitCode)console.log('\nv196.3 i18n verification passed.');
