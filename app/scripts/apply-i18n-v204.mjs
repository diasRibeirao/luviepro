import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Perfil, assinatura e segurança do seu acesso", ["Profile, subscription and access security", "Perfil, suscripción y seguridad de tu acceso"]],
  ["Responsável", ["Owner", "Responsable"]],
  ["Não informado", ["Not provided", "No informado"]],
  ["Orçamentos no mês", ["Quotes this month", "Presupuestos del mes"]],
  ["Segurança e acesso", ["Security and access", "Seguridad y acceso"]],
  ["Não foi possível carregar os dados da conta.", ["Unable to load account data.", "No fue posible cargar los datos de la cuenta."]],
  ["Você precisará entrar novamente para acessar o LuviePro.", ["You will need to sign in again to access LuviePro.", "Tendrás que iniciar sesión nuevamente para acceder a LuviePro."]],
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
console.log(`v204 - Conta / Perfil`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
