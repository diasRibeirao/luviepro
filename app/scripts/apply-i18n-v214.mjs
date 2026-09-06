import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível carregar os pedidos", ["Unable to load orders", "No fue posible cargar los pedidos"]],
  ["Não foi possível atualizar o pedido", ["Unable to update order", "No fue posible actualizar el pedido"]],
  ["Acompanhe recebimentos, operação e entrega das vendas", ["Track payments, operation and sales delivery", "Acompaña cobros, operación y entrega de ventas"]],
  ["Em operação", ["In operation", "En operación"]],
  ["Em separação", ["Picking", "En preparación"]],
  ["Os pedidos aparecem aqui após confirmar a venda de um orçamento aprovado.", ["Orders appear here after confirming the sale of an approved quote.", "Los pedidos aparecen aquí después de confirmar la venta de un presupuesto aprobado."]],
  ["Observação", ["Note", "Observación"]],
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
console.log(`v214 - Pedidos`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
