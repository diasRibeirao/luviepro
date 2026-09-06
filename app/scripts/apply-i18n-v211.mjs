import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Calculadora Rápida", ["Quick Calculator", "Calculadora rápida"]],
  ["Monte o projeto com um ou mais serviços e simule o preço em tempo real.", ["Build the project with one or more services and simulate the price in real time.", "Arma el proyecto con uno o más servicios y simula el precio en tiempo real."]],
  ["Serviços do projeto", ["Project services", "Servicios del proyecto"]],
  ["Parâmetros", ["Parameters", "Parámetros"]],
  ["Margem de segurança (%)", ["Safety margin (%)", "Margen de seguridad (%)"]],
  ["diária por profissional", ["daily rate per professional", "tarifa diaria por profesional"]],
  ["P.O. responsável", ["Responsible P.O.", "P.O. responsable"]],
  ["Despesas diárias", ["Daily expenses", "Gastos diarios"]],
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
console.log(`v211 - Calculadora`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
