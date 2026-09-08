import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const render = read('render.yaml');
const runtime = read('backend/src/runtime-config.ts');
const backendPackage = JSON.parse(read('backend/package.json'));
const tsconfig = JSON.parse(read('backend/tsconfig.json'));
const migration = read('backend/prisma/migrations/20260908132000_tenant_onboarding_state/migration.sql');

const hasKey = key => new RegExp(`- key: ${key}\\n(?:\\s{8,}.*\\n?)+`).test(render) || render.includes(`- key: ${key}`);
const hasHttpsValue = key => new RegExp(`- key: ${key}\\s+value: https://`, 'm').test(render);

const requiredAtBootstrap = [
  'DATABASE_URL','JWT_SECRET','JWT_REFRESH_SECRET','CORS_ORIGINS','APP_WEB_URL',
  'MERCADO_PAGO_ACCESS_TOKEN','MERCADO_PAGO_WEBHOOK_URL','MERCADO_PAGO_WEBHOOK_SECRET',
];

const checks = [
  ['todas as variáveis obrigatórias do bootstrap estão declaradas no render.yaml', requiredAtBootstrap.every(hasKey)],
  ['REDIS_URL está ligado ao Key Value do Render', /- key: REDIS_URL\s+fromService:\s+type: keyvalue\s+name: luviepro-redis-hml\s+property: connectionString/m.test(render)],
  ['DATABASE_URL está ligada ao PostgreSQL do Render', /- key: DATABASE_URL\s+fromDatabase:\s+name: luviepro-postgres-hml\s+property: connectionString/m.test(render)],
  ['APP_WEB_URL usa HTTPS', hasHttpsValue('APP_WEB_URL')],
  ['MERCADO_PAGO_WEBHOOK_URL usa HTTPS', hasHttpsValue('MERCADO_PAGO_WEBHOOK_URL')],
  ['CORS aponta somente para o frontend HTTPS de homologação', /- key: CORS_ORIGINS\s+value: https:\/\/luviepro-hml\.onrender\.com/m.test(render)],
  ['sandbox do Mercado Pago só é aceito pelo runtime em staging', runtime.includes("const staging=isStaging(env)") && runtime.includes("staging&&allowedInStaging")],
  ['webhook sem assinatura permanece bloqueado', /- key: MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS\s+value: "false"/m.test(render)],
  ['alteração direta de plano permanece bloqueada', /- key: ALLOW_DIRECT_PLAN_CHANGE\s+value: "false"/m.test(render)],
  ['start de produção aponta para build/src/main.js', backendPackage.scripts?.['start:prod'] === 'node build/src/main.js'],
  ['tsconfig compila src e prisma para build', tsconfig?.compilerOptions?.outDir === './build' && Array.isArray(tsconfig.include) && tsconfig.include.includes('src/**/*.ts') && tsconfig.include.includes('prisma/**/*.ts')],
  ['migration de onboarding adiciona a coluna', /ADD COLUMN "onboardingCompletedAt" TIMESTAMP\(3\)/.test(migration)],
  ['migration preserva tenants existentes como concluídos', /UPDATE "Tenant" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP/.test(migration)],
  ['render:start executa migrate deploy e system seed antes da API', backendPackage.scripts?.['render:start'] === 'npm run prisma:deploy && npm run prisma:system-seed && npm run start:prod'],
];

let ok=0;
for(const [label, pass] of checks){
  console.log(`${pass?'OK':'FAIL'} - ${label}`);
  if(pass) ok++;
}
console.log(`\n${ok}/${checks.length} checks OK`);
console.log('\nCONFIRMAÇÃO MANUAL OBRIGATÓRIA NO RENDER:');
console.log('- MERCADO_PAGO_ACCESS_TOKEN preenchido');
console.log('- MERCADO_PAGO_WEBHOOK_SECRET preenchido e com pelo menos 16 caracteres');
console.log('- PLATFORM_ADMIN_PASSWORD preenchido');
console.log('- SMTP_PASS e SMTP_FROM preenchidos se o worker de e-mail permanecer habilitado');
console.log('- DATABASE_URL e REDIS_URL resolvendo os recursos existentes');
process.exitCode = ok===checks.length?0:1;
