import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível carregar o financeiro", ["Unable to load finance data", "No fue posible cargar los datos financieros"]],
  ["Informe a descrição do lançamento.", ["Enter the transaction description.", "Ingresa la descripción del movimiento."]],
  ["Movimentação registrada", ["Transaction recorded", "Movimiento registrado"]],
  ["Não foi possível salvar lançamento", ["Unable to save transaction", "No fue posible guardar el movimiento"]],
  ["Não foi possível baixar a conta", ["Unable to settle the account", "No fue posible liquidar la cuenta"]],
  ["Não foi possível atualizar o relatório", ["Unable to update report", "No fue posible actualizar el informe"]],
  ["Em separação", ["Picking", "En preparación"]],
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
console.log(`v217 - Financeiro - operação`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
