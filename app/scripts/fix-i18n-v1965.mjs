import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const current="'Escolha uma cor para identificar este status no Kanban.':['Choose a color to identify this status on the Kanban board.','Elige un color para identificar este estado en el Kanban.']";
const fixed=current+",";

const count=src.split(current).length-1;
console.log(`INFO target line occurrence(s): ${count}`);
if(count!==1) throw new Error(`Expected exactly 1 target occurrence, found ${count}`);

const already=src.includes(fixed);
if(already){
  console.log('OK   comma already present; no change required');
}else{
  src=src.replace(current,fixed);
  fs.writeFileSync(file,src,'utf8');
  console.log('OK   restored missing comma after Kanban color translation');
}

const out=fs.readFileSync(file,'utf8');
const target=(out.match(/Ordem dos serviços atualizada/g)||[]).length;
console.log(`INFO Ordem dos serviços atualizada occurrences: ${target}`);
if(target!==1) throw new Error(`Expected 1 service-order translation, found ${target}`);

console.log('\nv196.5 syntax repair complete.');
