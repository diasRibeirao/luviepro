import fs from 'node:fs';

const render = fs.readFileSync('render.yaml', 'utf8');
const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
const migration = 'backend/prisma/migrations/20260908132000_tenant_onboarding_state/migration.sql';

const checks = [
  ['frontend fixa Node 22.20.0', /name: luviepro-hml[\s\S]*?envVars:[\s\S]*?- key: NODE_VERSION\s+value: 22\.20\.0/.test(render)],
  ['frontend usa a API de homologação', /EXPO_PUBLIC_API_URL\s+value: https:\/\/luviepro-api-hml\.onrender\.com\/api/.test(render)],
  ['backend fixa Node 22.20.0', /name: luviepro-api-hml[\s\S]*?- key: NODE_VERSION\s+value: 22\.20\.0/.test(render)],
  ['backend compila com dependências de desenvolvimento', render.includes('buildCommand: cd backend && npm ci --include=dev && npm run build')],
  ['start executa migrations e não executa seed', backendPackage.scripts?.['render:start'] === 'npm run prisma:deploy && npm run start:prod' && !backendPackage.scripts?.['render:start']?.includes('seed')],
  ['health check aponta para liveness /api/health/live', render.includes('healthCheckPath: /api/health/live')],
  ['migration do onboarding está presente', fs.existsSync(migration)],
  ['frontend mantém SPA rewrite', /source: \/\*\s+destination: \/index\.html/.test(render)],
];

let ok = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK' : 'FAIL'} - ${label}`);
  if (pass) ok += 1;
}
console.log(`\n${ok}/${checks.length} checks OK`);
process.exitCode = ok === checks.length ? 0 : 1;
