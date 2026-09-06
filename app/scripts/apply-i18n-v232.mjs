import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível salvar a unidade", ["Unable to save unit", "No fue posible guardar la unidad"]],
  ["Não foi possível alterar a unidade", ["Unable to change unit", "No fue posible modificar la unidad"]],
  ["Unidades disponíveis no cadastro e movimentação de produtos.", ["Units available for product registration and movement.", "Unidades disponibles en el registro y movimiento de productos."]],
  ["Buscar por unidade ou código...", ["Search by unit or code...", "Buscar por unidad o código..."]],
  ["Sigla / código", ["Abbreviation / code", "Sigla / código"]],
  ["Ordem de exibição", ["Display order", "Orden de visualización"]],
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
console.log(`v232 - Unidades de produto`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
