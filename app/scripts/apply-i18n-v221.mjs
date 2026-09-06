import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Aprovar orçamento?", ["Approve quote?", "¿Aprobar presupuesto?"]],
  ["Os produtos serão reservados no estoque. Se houver serviços, o projeto também será criado automaticamente.", ["Products will be reserved in inventory. If there are services, the project will also be created automatically.", "Los productos se reservarán en el stock. Si hay servicios, el proyecto también se creará automáticamente."]],
  ["Ao confirmar, o projeto será criado automaticamente.", ["When confirmed, the project will be created automatically.", "Al confirmar, el proyecto se creará automáticamente."]],
  ["Aprovar orçamento", ["Approve quote", "Aprobar presupuesto"]],
  ["Orçamento aprovado", ["Quote approved", "Presupuesto aprobado"]],
  ["Não foi possível aprovar", ["Unable to approve", "No fue posible aprobar"]],
  ["Não foi possível confirmar a venda", ["Unable to confirm sale", "No fue posible confirmar la venta"]],
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
console.log(`v221 - Orçamento - aprovação`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
