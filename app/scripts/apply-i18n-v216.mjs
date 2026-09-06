import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Não foi possível carregar produtos", ["Unable to load products", "No fue posible cargar los productos"]],
  ["Informe o SKU ou código do produto.", ["Enter the product SKU or code.", "Ingresa el SKU o código del producto."]],
  ["A nova categoria já foi selecionada no produto.", ["The new category has already been selected for the product.", "La nueva categoría ya fue seleccionada en el producto."]],
  ["Não foi possível salvar a categoria", ["Unable to save category", "No fue posible guardar la categoría"]],
  ["Não foi possível alterar a categoria", ["Unable to change category", "No fue posible modificar la categoría"]],
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
console.log(`v216 - Produtos - validações`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
