import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["O primeiro acesso foi criado. Configure o SMTP para envio automático.", ["The first access was created. Configure SMTP for automatic sending.", "El primer acceso fue creado. Configura SMTP para el envío automático."]],
  ["Não foi possível enviar o convite", ["Unable to send invitation", "No fue posible enviar la invitación"]],
  ["Informe o nome do usuário.", ["Enter the user's name.", "Ingresa el nombre del usuario."]],
  ["Informe um e-mail válido.", ["Enter a valid email address.", "Ingresa un correo electrónico válido."]],
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
console.log(`v208 - Convite / primeiro acesso`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
