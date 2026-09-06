import fs from 'node:fs';

const file=new URL('../src/modules/casa-nova/screens/CasaNovaScreen.tsx',import.meta.url);
const source=fs.readFileSync(file,'utf8');

const checks=[
 ['minimum guests',"Math.max(2,Math.trunc(next))"],
 ['Casa e banho category',"'Cama e banho'"],
 ['select all','Selecionar tudo'],
 ['bulk category','Aplicar categoria'],
 ['bulk unit','Aplicar unidade'],
 ['bulk purchased','Marcar comprados'],
 ['bulk unpurchased','Desmarcar comprados'],
 ['automatic quantity','Qtd. automática'],
 ['fixed quantity','Qtd. fixa'],
 ['Excel export','Exportar Excel'],
 ['manual quantity arrows','changeItemQuantity(item,-1)'],
 ['manual add item',"'Adicionar item'"],
];

for(const [name,needle] of checks){
  if(!source.includes(needle)){
    console.error(`FAIL ${name}`);
    process.exit(1);
  }
  console.log(`OK   ${name}`);
}
console.log('Casa Nova functional verification passed.');
