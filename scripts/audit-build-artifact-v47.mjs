import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backend=path.join(root,'backend');
const checks=[];
const add=(name,pass,detail='')=>checks.push([name,Boolean(pass),detail]);

const pkg=JSON.parse(fs.readFileSync(path.join(backend,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(backend,'package-lock.json'),'utf8'));
const tsconfig=JSON.parse(fs.readFileSync(path.join(backend,'tsconfig.json'),'utf8'));
const nest=JSON.parse(fs.readFileSync(path.join(backend,'nest-cli.json'),'utf8'));
const render=fs.readFileSync(path.join(root,'render.yaml'),'utf8');

const sourceRoot=String(nest.sourceRoot||'src').replace(/^\.\//,'');
const outDir=String(tsconfig.compilerOptions?.outDir||'').replace(/^\.\//,'').replace(/\/$/,'');
const expectedEntry=`${outDir}/${sourceRoot}/main.js`.replace(/\\/g,'/');

add('Nest sourceRoot é src',sourceRoot==='src',sourceRoot);
add('TypeScript outDir é build',outDir==='build',outDir);
add('fonte principal existe',fs.existsSync(path.join(backend,sourceRoot,'main.ts')));
add('start:prod aponta para o artefato esperado',pkg.scripts?.['start:prod']===`node ${expectedEntry}`,pkg.scripts?.['start:prod']||'ausente');
add('render:start migra e provisiona dados de sistema antes de iniciar',pkg.scripts?.['render:start']==='npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod');
add('build do Render executa nest build',/buildCommand:\s*cd backend && npm ci --include=dev && npm run build/.test(render));
add('start do Render usa render:start',/startCommand:\s*cd backend && npm run render:start/.test(render));

const rootLock=lock.packages?.['']||{};
add('lockfile v3 compatível com npm moderno',Number(lock.lockfileVersion)===3,String(lock.lockfileVersion));
add('lockfile pertence ao backend',lock.name===pkg.name && rootLock.name===pkg.name,`${lock.name}/${rootLock.name}`);

const declared={...(pkg.dependencies||{}),...(pkg.devDependencies||{})};
const lockDeclared={...(rootLock.dependencies||{}),...(rootLock.devDependencies||{})};
const missingFromLock=Object.keys(declared).filter(name=>!(name in lockDeclared));
const staleInLock=Object.keys(lockDeclared).filter(name=>!(name in declared));
const rangeMismatch=Object.keys(declared).filter(name=>name in lockDeclared && declared[name]!==lockDeclared[name]);
add('dependências declaradas existem no lock root',missingFromLock.length===0,missingFromLock.join(', '));
add('lock root não possui dependências declaradas obsoletas',staleInLock.length===0,staleInLock.join(', '));
add('ranges package.json e lock root coincidem',rangeMismatch.length===0,rangeMismatch.join(', '));

const prismaClient=lock.packages?.['node_modules/@prisma/client']?.version;
const prismaCli=lock.packages?.['node_modules/prisma']?.version;
add('Prisma Client e CLI resolvidos na mesma versão',Boolean(prismaClient)&&prismaClient===prismaCli,`${prismaClient||'ausente'} / ${prismaCli||'ausente'}`);

const nodeVersion=(render.match(/- key: NODE_VERSION\s*\n\s*value:\s*([^\s]+)/)||[])[1];
add('Render fixa Node 22.20.0',nodeVersion==='22.20.0',nodeVersion||'ausente');

console.log('=== Artefato/build Render v47 ===');
let ok=0;
for(const [name,pass,detail] of checks){
  console.log(`${pass?'OK':'FAIL'} - ${name}${detail?` (${detail})`:''}`);
  if(pass)ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
