import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const main=read('backend/src/main.ts');
const health=read('backend/src/health.controller.ts');
const account=read('backend/src/modules/account/account.controller.ts');
const smoke=read('scripts/hml-smoke.mjs');
const render=read('render.yaml');

const checks=[
  ['API mantém prefixo global /api',/setGlobalPrefix\(['"]api['"]\)/.test(main)],
  ['CORS da API permanece habilitado com credenciais',/enableCors\(\{origin:h\.corsOrigin,credentials:true\}\)/.test(main)],
  ['liveness é público em health/live',/@Public\(\)\s*@Get\(['"]health\/live['"]\)/.test(health)],
  ['readiness é público em health',/@Public\(\)\s*@Get\(['"]health['"]\)/.test(health)],
  ['catálogo de planos é público em plans',/@Public\(\)\s*@Get\(['"]plans['"]\)/.test(account)],
  ['smoke consulta /api/health/live',/`\$\{api\}\/health\/live`/.test(smoke)],
  ['smoke consulta /api/health',/`\$\{api\}\/health`/.test(smoke)],
  ['smoke consulta catálogo /api/plans',/`\$\{api\}\/plans`/.test(smoke)],
  ['smoke testa preflight CORS em rota autenticada',/`\$\{api\}\/account`/.test(smoke)&&/method:'OPTIONS'/.test(smoke)],
  ['healthCheckPath do Render usa liveness',/healthCheckPath:\s*\/api\/health\/live/.test(render)],
  ['URL da API no frontend termina em /api',/EXPO_PUBLIC_API_URL\s+value:\s+https:\/\/luviepro-api-hml\.onrender\.com\/api/.test(render)],
  ['origem esperada do CORS coincide com frontend HML',/CORS_ORIGINS\s+value:\s+https:\/\/luviepro-hml\.onrender\.com/.test(render)],
];

let ok=0;
for(const [name,pass] of checks){
  console.log(`${pass?'OK':'FAIL'} - ${name}`);
  if(pass)ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
console.log('\nContrato de rotas HML coerente entre backend, blueprint Render e smoke pós-deploy.');
