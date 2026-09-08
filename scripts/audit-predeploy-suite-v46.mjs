import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[];
const add=(name,pass,detail='')=>checks.push([name,Boolean(pass),detail]);

const renderYaml=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
const backendPkg=JSON.parse(fs.readFileSync(path.join(root,'backend/package.json'),'utf8'));
const appPkg=JSON.parse(fs.readFileSync(path.join(root,'app/package.json'),'utf8'));

const migrationRoot=path.join(root,'backend/prisma/migrations');
const migrationDirs=fs.readdirSync(migrationRoot,{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>entry.name)
  .sort();
const duplicateMigrationNames=migrationDirs.filter((name,index,array)=>index>0&&name===array[index-1]);
const migrationWithoutSql=migrationDirs.filter(name=>!fs.existsSync(path.join(migrationRoot,name,'migration.sql')));

add('não há diretórios de migration duplicados',duplicateMigrationNames.length===0,duplicateMigrationNames.join(', '));
add('todas as migrations possuem migration.sql',migrationWithoutSql.length===0,migrationWithoutSql.join(', '));
add('render:start executa migrate deploy e system seed antes do start:prod',backendPkg.scripts?.['render:start']==='npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod');
add('build backend usa npm ci e compila antes de iniciar',/buildCommand:\s*cd backend && npm ci --include=dev && npm run build/.test(renderYaml));
add('build frontend usa npm ci e export:web',/buildCommand:\s*cd app && npm ci && npm run export:web/.test(renderYaml));
add('backend possui package-lock',fs.existsSync(path.join(root,'backend/package-lock.json')));
add('frontend possui package-lock',fs.existsSync(path.join(root,'app/package-lock.json')));
add('backend lockfile identifica o pacote correto',JSON.parse(fs.readFileSync(path.join(root,'backend/package-lock.json'),'utf8')).name===backendPkg.name);
add('frontend lockfile identifica o pacote correto',JSON.parse(fs.readFileSync(path.join(root,'app/package-lock.json'),'utf8')).name===appPkg.name);

const suites=[
  ['preflight Render','scripts/audit-render-preflight-v43.mjs'],
  ['runtime/env Render','scripts/audit-render-runtime-env-v44.mjs'],
  ['smoke HML - contrato estático','scripts/audit-hml-smoke-v45.mjs'],
  ['contrato de rotas HML','scripts/audit-hml-route-contract-v49.mjs'],
  ['estratégia de health check Render','scripts/audit-render-health-strategy-v50.mjs'],
  ['system bootstrap Render','scripts/audit-render-system-bootstrap-v51.mjs'],
  ['runtime do system seed','scripts/audit-render-system-seed-runtime-v52.mjs'],
  ['runtime de e-mail','scripts/audit-mail-runtime-v53.mjs'],
  ['artefato/build Render','scripts/audit-build-artifact-v47.mjs'],
  ['segurança de release','scripts/audit-release-safety-v48.mjs'],
  ['render:start','backend/scripts/audit-render-start-v41.mjs'],
  ['diária/equipe no backend','backend/scripts/audit-quote-team-daily-v40.mjs'],
  ['onboarding obrigatório','app/scripts/audit-onboarding-required-fields-v39.mjs'],
];

for(const [name,script] of suites){
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,encoding:'utf8'});
  if(result.stdout)process.stdout.write(`\n=== ${name} ===\n${result.stdout}`);
  if(result.stderr)process.stderr.write(result.stderr);
  add(`suite ${name}`,result.status===0,result.status===0?'':`exit ${result.status}`);
}

console.log('\n=== Gate consolidado v46 ===');
let ok=0;
for(const [name,pass,detail] of checks){
  console.log(`${pass?'OK':'FAIL'} - ${name}${detail?` (${detail})`:''}`);
  if(pass)ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
console.log('\nPré-deploy estático aprovado. O smoke HTTP real deve ser executado após o deploy, em ambiente com acesso de rede.');
