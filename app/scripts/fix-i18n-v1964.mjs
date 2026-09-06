import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const inline=", 'Ordem dos serviços atualizada':['Service order updated','Orden de servicios actualizada'],";
const standalone="\n 'Ordem dos serviços atualizada':['Service order updated','Orden de servicios actualizada'],";

const inlineCount=src.split(inline).length-1;
const standaloneCount=src.split(standalone).length-1;

console.log(`INFO inline occurrence(s): ${inlineCount}`);
console.log(`INFO standalone occurrence(s): ${standaloneCount}`);

if(inlineCount>0){
  src=src.replace(inline,'');
  fs.writeFileSync(file,src,'utf8');
  console.log('OK   removed inline duplicate occurrence');
}else{
  console.log('OK   no inline duplicate found');
}

const finalSrc=fs.readFileSync(file,'utf8');
const total=(finalSrc.match(/Ordem dos serviços atualizada/g)||[]).length;
console.log(`INFO total occurrences after fix: ${total}`);

if(total!==1){
  throw new Error(`Expected exactly 1 occurrence after fix, found ${total}`);
}

console.log('\nv196.4 duplicate cleanup complete.');
