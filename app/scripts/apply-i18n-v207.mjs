import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["A confirmação da senha não confere.", ["Password confirmation does not match.", "La confirmación de la contraseña no coincide."]],
  ["Mínimo de 8 caracteres", ["Minimum 8 characters", "Mínimo 8 caracteres"]],
  ["Use pelo menos 8 caracteres e evite senhas utilizadas em outros serviços.", ["Use at least 8 characters and avoid passwords used on other services.", "Usa al menos 8 caracteres y evita contraseñas utilizadas en otros servicios."]],
  ["Redefinir senha", ["Reset password", "Restablecer contraseña"]],
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
console.log(`v207 - Redefinição de senha`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
