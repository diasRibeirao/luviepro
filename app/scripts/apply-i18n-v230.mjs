import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível salvar a forma de pagamento", ["Unable to save payment method", "No fue posible guardar el método de pago"]],
  ["A forma de pagamento deixará de ficar disponível em novos lançamentos.", ["The payment method will no longer be available for new transactions.", "El método de pago dejará de estar disponible en nuevos movimientos."]],
  ["Não foi possível alterar a forma de pagamento", ["Unable to change payment method", "No fue posible modificar el método de pago"]],
  ["A forma ativa ficará disponível no Financeiro, Vendas e Compras.", ["The active method will be available in Finance, Sales and Purchases.", "El método activo estará disponible en Finanzas, Ventas y Compras."]],
  ["Ex.: PIX, Cartão, Transferência", ["E.g.: PIX, Card, Bank transfer", "Ej.: PIX, Tarjeta, Transferencia"]],
  ["Código interno", ["Internal code", "Código interno"]],
  ["O código é preservado para manter o histórico das movimentações.", ["The code is preserved to maintain transaction history.", "El código se conserva para mantener el historial de movimientos."]],
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
console.log(`v230 - Formas de pagamento`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
