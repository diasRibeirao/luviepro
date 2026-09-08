import fs from 'node:fs';
import path from 'node:path';

const read = p => fs.readFileSync(p, 'utf8');
const render = read('render.yaml');
const backendPackage = JSON.parse(read('backend/package.json'));
const appPackage = JSON.parse(read('app/package.json'));
const runtimeConfig = read('backend/src/runtime-config.ts');
const schema = read('backend/prisma/schema.prisma');
const migration = 'backend/prisma/migrations/20260908132000_tenant_onboarding_state/migration.sql';

const requiredSyncFalse = [
  'PLATFORM_ADMIN_NOTIFICATION_EMAIL',
  'PLATFORM_ADMIN_PASSWORD',
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MERCADO_PAGO_WEBHOOK_SECRET',
  'SMTP_PASS',
  'SMTP_FROM',
];

const checks = [
  ['render.yaml existe', fs.existsSync('render.yaml')],
  ['frontend usa Node 22.20.0', /name: luviepro-hml[\s\S]*?NODE_VERSION\s+value: 22\.20\.0/.test(render)],
  ['frontend publica app/dist', /staticPublishPath: app\/dist/.test(render)],
  ['frontend usa API HML com /api', /EXPO_PUBLIC_API_URL\s+value: https:\/\/luviepro-api-hml\.onrender\.com\/api/.test(render)],
  ['SPA rewrite para /index.html', /source: \/\*[\s\S]*?destination: \/index\.html/.test(render)],
  ['backend usa Node 22.20.0', /name: luviepro-api-hml[\s\S]*?NODE_VERSION\s+value: 22\.20\.0/.test(render)],
  ['backend build usa npm ci com devDependencies', render.includes('buildCommand: cd backend && npm ci --include=dev && npm run build')],
  ['backend start executa migrate deploy e system seed antes da API', backendPackage.scripts?.['render:start'] === 'npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod'],
  ['script render:start não executa seed de demonstração', !String(backendPackage.scripts?.['render:start'] ?? '').includes('prisma:seed')],
  ['app possui export:web', appPackage.scripts?.['export:web'] === 'expo export --platform web --output-dir dist'],
  ['health check aponta para liveness /api/health/live', render.includes('healthCheckPath: /api/health/live')],
  ['APP_ENV está como staging', /APP_ENV\s+value: staging/.test(render)],
  ['CORS inclui a URL do frontend', /CORS_ORIGINS\s+value: https:\/\/luviepro-hml\.onrender\.com/.test(render)],
  ['APP_WEB_URL aponta para o frontend', /APP_WEB_URL\s+value: https:\/\/luviepro-hml\.onrender\.com/.test(render)],
  ['JWT access é gerado pelo Render', /JWT_SECRET\s+generateValue: true/.test(render)],
  ['JWT refresh é gerado pelo Render', /JWT_REFRESH_SECRET\s+generateValue: true/.test(render)],
  ['Mercado Pago sandbox permitido em staging', /MERCADO_PAGO_USE_SANDBOX\s+value: "true"/.test(render) && runtimeConfig.includes('staging&&allowedInStaging')],
  ['Mercado Pago sem webhook não assinado', /MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS\s+value: "false"/.test(render)],
  ['migration do onboarding existe', fs.existsSync(migration)],
  ['schema contém onboardingCompletedAt', schema.includes('onboardingCompletedAt')],
  ['package-lock do backend existe', fs.existsSync('backend/package-lock.json')],
  ['package-lock do app existe', fs.existsSync('app/package-lock.json')],
  ['nenhum .env real está versionado no candidato', !['.env','app/.env','backend/.env'].some(fs.existsSync)],
  ['variáveis manuais estão declaradas como sync:false', requiredSyncFalse.every(key => new RegExp(`- key: ${key}\\s+sync: false`).test(render))],
];

let ok = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK' : 'FAIL'} - ${label}`);
  if (pass) ok += 1;
}

console.log(`\n${ok}/${checks.length} checks OK`);
console.log('\nATENÇÃO - confirmar manualmente no Render antes do deploy:');
for (const key of requiredSyncFalse) console.log(`- ${key}`);
console.log('- DATABASE_URL e REDIS_URL devem resolver pelos recursos existentes do Render.');
console.log('- Em staging, MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_WEBHOOK_SECRET são obrigatórios para o bootstrap.');

process.exitCode = ok === checks.length ? 0 : 1;
