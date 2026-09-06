import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Fiscal e endereço", ["Tax and address", "Fiscal y dirección"]],
  ["Dados cadastrais, fiscais, identidade e informações comerciais da empresa.", ["Company registration, tax, identity and commercial information.", "Datos registrales, fiscales, identidad e información comercial de la empresa."]],
  ["Salvar alterações", ["Save changes", "Guardar cambios"]],
  ["Informações institucionais e de contato da empresa.", ["Company institutional and contact information.", "Información institucional y de contacto de la empresa."]],
  ["Nome da responsável", ["Owner name", "Nombre de la responsable"]],
  ["Dados fiscais e endereço", ["Tax data and address", "Datos fiscales y dirección"]],
]);

const start=src.indexOf('const exact:Record');
if(start<0) throw new Error('Objeto exact de i18n não encontrado.');
const end=src.indexOf('\n};',start);
if(end<0) throw new Error('Fim do objeto exact de i18n não encontrado.');
let block=src.slice(start,end);
const keys=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]);
const existing=new Set(keys);
const missing=[];
for(const [key,pair] of entries){
  if(!existing.has(key)) missing.push(` ${JSON.stringify(key)}:[${JSON.stringify(pair[0])},${JSON.stringify(pair[1])}],`);
}
if(missing.length){
  block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
  src=src.slice(0,start)+block+src.slice(end);
  fs.writeFileSync(file,src,'utf8');
}
console.log(`v224 - Empresa`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
