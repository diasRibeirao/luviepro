import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');
const entries=new Map([
  ["Configure as variáveis SMTP no backend.", ["Configure the SMTP variables in the backend.", "Configura las variables SMTP en el backend."]],
  ["Não foi possível testar o SMTP", ["Unable to test SMTP", "No fue posible probar SMTP"]],
  ["Configuração dos e-mails de primeiro acesso, recuperação de senha e notificações.", ["Configuration of first-access, password recovery and notification emails.", "Configuración de correos de primer acceso, recuperación de contraseña y notificaciones."]],
  ["SMTP ainda não validado", ["SMTP not validated yet", "SMTP aún no validado"]],
  ["Confira as variáveis de ambiente do serviço backend.", ["Check the backend service environment variables.", "Verifica las variables de entorno del servicio backend."]],
  ["Não configurado", ["Not configured", "No configurado"]],
  ["Segurança", ["Security", "Seguridad"]],
  ["Usuário SMTP", ["SMTP user", "Usuario SMTP"]],
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
console.log(`v228 - SMTP / E-mail`);
console.log(`OK existing: ${entries.size-missing.length}`);
console.log(`OK added: ${missing.length}`);
