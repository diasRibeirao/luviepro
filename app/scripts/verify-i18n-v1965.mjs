import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');

const expected="'Escolha uma cor para identificar este status no Kanban.':['Choose a color to identify this status on the Kanban board.','Elige un color para identificar este estado en el Kanban.'],";
const comma=src.includes(expected);
const serviceOrder=(src.match(/Ordem dos serviços atualizada/g)||[]).length;

console.log(`${comma?'OK  ':'FAIL'} comma after Kanban color translation`);
console.log(`${serviceOrder===1?'OK  ':'FAIL'} Ordem dos serviços atualizada -> ${serviceOrder}`);

if(!comma || serviceOrder!==1)process.exit(1);
console.log('\nv196.5 source verification passed.');
