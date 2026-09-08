import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const render=read('render.yaml');
const controller=read('backend/src/health.controller.ts');
const service=read('backend/src/health.service.ts');
const smoke=read('scripts/hml-smoke.mjs');

const checks=[
  ['Render usa liveness como health check de processo',/healthCheckPath:\s*\/api\/health\/live/.test(render)],
  ['controller expõe GET health/live',/@Get\(['"]health\/live['"]\)/.test(controller)],
  ['controller expõe readiness GET health',/@Get\(['"]health['"]\)/.test(controller)],
  ['liveness é rota pública',/@Public\(\)\s*@Get\(['"]health\/live['"]\)/.test(controller)],
  ['readiness é rota pública',/@Public\(\)\s*@Get\(['"]health['"]\)/.test(controller)],
  ['liveness não consulta Postgres',/live\(\)\{return \{status:['"]ok['"]/.test(service)],
  ['readiness consulta Postgres com timeout',/withTimeout\(this\.db\.\$queryRaw/.test(service)],
  ['readiness consulta Redis com timeout',/withTimeout\(this\.redis\.ping\(\)/.test(service)],
  ['readiness retorna erro quando dependências degradam',/ServiceUnavailableException/.test(service)],
  ['smoke pós-deploy testa liveness',/\/health\/live/.test(smoke)],
  ['smoke pós-deploy testa readiness separadamente',/API readiness/.test(smoke)&&/`\$\{api\}\/health`/.test(smoke)],
];

let ok=0;
console.log('=== Estratégia de health check Render v50 ===');
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
