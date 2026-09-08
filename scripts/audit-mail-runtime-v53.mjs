import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('backend/src/runtime-config.ts');
const mail=read('backend/src/mail.service.ts');
const health=read('backend/src/modules/platform/platform-health.service.ts');
const render=read('render.yaml');
const spec=read('backend/src/mail.service.spec.ts');
const checks=[
 ['worker de e-mail está habilitado no HML',/NOTIFICATION_EMAIL_WORKER_ENABLED\s*\n\s*value:\s*["']true["']/.test(render)],
 ['SMTP do Render usa autenticação',/SMTP_USER\s*\n\s*value:\s*["']?apikey["']?/.test(render)],
 ['senha SMTP permanece segredo manual',/SMTP_PASS\s*\n\s*sync:\s*false/.test(render)],
 ['runtime detecta worker habilitado',/NOTIFICATION_EMAIL_WORKER_ENABLED/.test(runtime)&&/emailWorkerEnabled/.test(runtime)],
 ['runtime exige host SMTP com worker',/SMTP_HOST não configurado com worker de e-mail habilitado/.test(runtime)],
 ['runtime exige remetente SMTP com worker',/SMTP_FROM não configurado com worker de e-mail habilitado/.test(runtime)],
 ['runtime exige senha para SMTP autenticado',/SMTP_PASS não configurado para SMTP autenticado/.test(runtime)],
 ['MailService não considera SMTP autenticado sem senha como configurado',/authenticated=!smtp\.user\|\|!!smtp\.pass/.test(mail)&&/smtp\.host&&smtp\.from&&authenticated/.test(mail)],
 ['envio SMTP recusa autenticação sem senha',/c\.user&&!c\.pass/.test(mail)],
 ['diagnóstico da plataforma considera senha SMTP',/SMTP_USER\?\.trim\(\).*SMTP_PASS\?\.trim\(\)/s.test(health)],
 ['regressão cobre SMTP autenticado sem senha',/does not report authenticated SMTP as configured without a password/.test(spec)],
];
let ok=0;
for(const [label,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${label}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
