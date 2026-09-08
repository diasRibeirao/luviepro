import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[];
const add=(name,pass,detail='')=>checks.push([name,Boolean(pass),detail]);
const render=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
const gitignore=fs.readFileSync(path.join(root,'.gitignore'),'utf8');

const mustIgnore=['node_modules/','.env','dist/','build/','coverage/'];
for(const entry of mustIgnore){
  add(`.gitignore protege ${entry}`,gitignore.split(/\r?\n/).map(v=>v.trim()).includes(entry));
}

const requiredSecretKeys=[
  'PLATFORM_ADMIN_NOTIFICATION_EMAIL',
  'PLATFORM_ADMIN_PASSWORD',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'SMTP_PASS',
  'SMTP_FROM',
];
for(const key of requiredSecretKeys){
  const block=new RegExp(`- key: ${key}\\s*\\n\\s*sync: false`);
  add(`${key} permanece manual no Render`,block.test(render));
}

const forbiddenInlineSecrets=[
  /MERCADO_PAGO_ACCESS_TOKEN\s*\n\s*value:/,
  /MERCADO_PAGO_WEBHOOK_SECRET\s*\n\s*value:/,
  /PLATFORM_ADMIN_PASSWORD\s*\n\s*value:/,
  /SMTP_PASS\s*\n\s*value:/,
];
add('render.yaml não contém segredos críticos inline',forbiddenInlineSecrets.every(re=>!re.test(render)));

add('JWT_SECRET é gerado pelo Render',/- key: JWT_SECRET\s*\n\s*generateValue: true/.test(render));
add('JWT_REFRESH_SECRET é gerado pelo Render',/- key: JWT_REFRESH_SECRET\s*\n\s*generateValue: true/.test(render));
add('produção de homologação mantém sandbox do Mercado Pago',/- key: APP_ENV\s*\n\s*value: staging/.test(render)&&/- key: MERCADO_PAGO_USE_SANDBOX\s*\n\s*value: "true"/.test(render));
add('webhook sem assinatura permanece bloqueado',/- key: MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS\s*\n\s*value: "false"/.test(render));
add('alteração direta de plano permanece bloqueada',/- key: ALLOW_DIRECT_PLAN_CHANGE\s*\n\s*value: "false"/.test(render));

const envCandidates=['.env','backend/.env','app/.env'];
const presentEnv=envCandidates.filter(file=>fs.existsSync(path.join(root,file)));
add('candidato não contém arquivos .env reais',presentEnv.length===0,presentEnv.join(', '));

console.log('=== Segurança de release Render v48 ===');
let ok=0;
for(const [name,pass,detail] of checks){
  console.log(`${pass?'OK':'FAIL'} - ${name}${detail?` (${detail})`:''}`);
  if(pass)ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
