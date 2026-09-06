import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível salvar a categoria", ["Unable to save category", "No fue posible guardar la categoría"]],
  ["A categoria deixará de ficar disponível em novos lançamentos.", ["The category will no longer be available for new transactions.", "La categoría dejará de estar disponible en nuevos movimientos."]],
  ["Não foi possível alterar a categoria", ["Unable to change category", "No fue posible modificar la categoría"]],
  ["Parametrize receitas e despesas usadas nos lançamentos financeiros.", ["Configure income and expense categories used in financial transactions.", "Configura ingresos y gastos usados en los movimientos financieros."]],
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
console.log(`v229 - Categorias financeiras`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
