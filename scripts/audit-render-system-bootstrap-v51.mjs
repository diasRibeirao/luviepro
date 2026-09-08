import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'backend/package.json'),'utf8'));
const render=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
const systemSeed=fs.readFileSync(path.join(root,'backend/prisma/system-seed.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'backend/prisma/migrations/20260908205500_ensure_commercial_plan_catalog/migration.sql'),'utf8');
const demoSeed=fs.readFileSync(path.join(root,'backend/prisma/seed.ts'),'utf8');

const checks=[];
const add=(name,pass)=>checks.push([name,Boolean(pass)]);
add('render:start executa migrate deploy, system seed e start:prod nessa ordem',pkg.scripts?.['render:start']==='npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod');
add('system seed possui script dedicado',pkg.scripts?.['prisma:system-seed']==='tsx prisma/system-seed.ts');
add('system seed cria somente administrador de plataforma',/platformAdmin\.(findUnique|create)/.test(systemSeed)&&!/(tenant|client|service|project)\.(create|upsert)/.test(systemSeed));
add('system seed preserva administrador já existente sem update',/if\(existing\)[\s\S]*?return;/.test(systemSeed)&&!/platformAdmin\.update/.test(systemSeed));
add('system seed exige senha apenas para criação',/if\(password\.length<8\)/.test(systemSeed)&&/platformAdmin\.create/.test(systemSeed));
add('catálogo possui migration própria',fs.existsSync(path.join(root,'backend/prisma/migrations/20260908205500_ensure_commercial_plan_catalog/migration.sql')));
for(const code of ['basic','starter','pro','business'])add(`migration garante plano ${code}`,new RegExp(`'${code}'`).test(migration));
add('migration usa upsert por conflito',/ON CONFLICT \("plan"\) DO UPDATE SET/.test(migration));
add('render.yaml declara e-mail do administrador',/key:\s*PLATFORM_ADMIN_EMAIL[\s\S]*?value:\s*master@luviepro\.local/.test(render));
add('render.yaml mantém senha do administrador como segredo manual',/key:\s*PLATFORM_ADMIN_PASSWORD\s*\n\s*sync:\s*false/.test(render));
add('seed de demonstração continua fora do render:start',!pkg.scripts?.['render:start']?.includes('prisma:seed'));
add('seed manual de demonstração continua disponível',pkg.scripts?.['render:seed']==='npm run prisma:seed'&&/DEMO_SEED/.test(demoSeed));

let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
