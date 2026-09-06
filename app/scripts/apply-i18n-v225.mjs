import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Cadastros auxiliares usados no catálogo e no estoque.", ["Auxiliary records used in the catalog and inventory.", "Registros auxiliares usados en el catálogo y el stock."]],
  ["Mantenha as unidades disponíveis no cadastro de produtos, como un, cx, kit, pct, m ou kg.", ["Maintain the units available for products, such as unit, box, kit, package, m or kg.", "Mantén las unidades disponibles para productos, como un, caja, kit, paquete, m o kg."]],
  ["Cadastros auxiliares usados em receitas, despesas e relatórios.", ["Auxiliary records used in income, expenses and reports.", "Registros auxiliares usados en ingresos, gastos e informes."]],
  ["Usuários e regras de acesso à empresa.", ["Users and company access rules.", "Usuarios y reglas de acceso a la empresa."]],
  ["Gerencie usuários, convites e acessos da empresa.", ["Manage company users, invitations and access.", "Gestiona usuarios, invitaciones y accesos de la empresa."]],
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
console.log(`v225 - Configurações`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
