import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'backend/package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'backend/package-lock.json'),'utf8'));
const seed=fs.readFileSync(path.join(root,'backend/prisma/system-seed.ts'),'utf8');

const checks=[];
const add=(name,pass)=>checks.push([name,Boolean(pass)]);
add('render:start mantém system seed antes do start:prod',pkg.scripts?.['render:start']==='npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod');
add('system seed continua executado por tsx',pkg.scripts?.['prisma:system-seed']==='tsx prisma/system-seed.ts');
add('tsx é dependência de produção',Boolean(pkg.dependencies?.tsx)&&!pkg.devDependencies?.tsx);
add('package-lock registra tsx como dependência de produção',Boolean(lock.packages?.['']?.dependencies?.tsx)&&!lock.packages?.['']?.devDependencies?.tsx);
add('pacote tsx no lock não está marcado como dev-only',lock.packages?.['node_modules/tsx']?.dev!==true);
add('system seed localiza administrador antes de criar',/platformAdmin\.findUnique/.test(seed)&&/platformAdmin\.create/.test(seed));
add('administrador existente é preservado sem update',/if\(existing\)[\s\S]*?return;/.test(seed)&&!/platformAdmin\.update/.test(seed));
add('system seed não redefine passwordHash existente',!/if\(existing\)[\s\S]*?passwordHash[\s\S]*?return;/.test(seed));
add('senha mínima é exigida para criação',/if\(password\.length<8\)/.test(seed));
add('novo administrador é criado ativo como platform_admin',/platformAdmin\.create\(\{data:\{[^}]*role:'platform_admin',active:true/.test(seed));
add('system seed fecha Prisma ao terminar',/\.finally\(\(\)=>db\.\$disconnect\(\)\)/.test(seed));

let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
