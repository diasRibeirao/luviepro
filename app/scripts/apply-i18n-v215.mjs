import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível carregar compras", ["Unable to load purchases", "No fue posible cargar las compras"]],
  ["Informe um custo válido.", ["Enter a valid cost.", "Ingresa un costo válido."]],
  ["Recebimento parcial lançado no estoque", ["Partial receipt posted to inventory", "Recepción parcial registrada en el stock"]],
  ["Não foi possível receber a compra", ["Unable to receive purchase", "No fue posible recibir la compra"]],
  ["Não foi possível registrar pagamento", ["Unable to record payment", "No fue posible registrar el pago"]],
  ["Observações", ["Notes", "Observaciones"]],
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
console.log(`v215 - Compras`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
