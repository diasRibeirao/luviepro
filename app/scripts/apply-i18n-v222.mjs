import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível carregar a proposta", ["Unable to load proposal", "No fue posible cargar la propuesta"]],
  ["CONFERÊNCIA DE PRODUTOS ORGANIZADORES UTILIZADOS EM PROJETO", ["CHECKLIST OF ORGANIZING PRODUCTS USED IN THE PROJECT", "CONTROL DE PRODUCTOS ORGANIZADORES UTILIZADOS EN EL PROYECTO"]],
  ["ORDEM DE SERVIÇO PARA ORGANIZAÇÃO", ["ORGANIZATION SERVICE ORDER", "ORDEN DE SERVICIO DE ORGANIZACIÓN"]],
  ["Preparamos esta proposta com os serviços, condições e investimento para a realização do seu projeto.", ["We prepared this proposal with the services, terms and investment for your project.", "Preparamos esta propuesta con los servicios, condiciones e inversión para realizar tu proyecto."]],
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
console.log(`v222 - Proposta interna`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
