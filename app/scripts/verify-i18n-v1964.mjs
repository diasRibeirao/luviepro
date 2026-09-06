import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
const src=fs.readFileSync(file,'utf8');

const target='Ordem dos serviços atualizada';
const total=(src.match(new RegExp(target,'g'))||[]).length;
console.log(`${total===1?'OK  ':'FAIL'} ${target} -> ${total}`);

const badInline="], 'Ordem dos serviços atualizada':";
const inlineLeft=src.includes(badInline);
console.log(`${!inlineLeft?'OK  ':'FAIL'} inline duplicate removed`);

if(total!==1 || inlineLeft)process.exit(1);
console.log('\nv196.4 verification passed.');
