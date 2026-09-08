import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const checks=[
 ['schema persiste conclusão',read('backend/prisma/schema.prisma').includes('onboardingCompletedAt   DateTime?')],
 ['migração preserva contas existentes',read('backend/prisma/migrations/20260908132000_tenant_onboarding_state/migration.sql').includes('UPDATE "Tenant" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP')],
 ['backend conclui onboarding',read('backend/src/modules/account/account.service.ts').includes('patch.onboardingCompletedAt=new Date()')],
 ['empresa envia conclusão',read('app/src/modules/settings/screens/CompanyScreen.tsx').includes('onboardingCompleted:onboarding?true:undefined')],
 ['shell bloqueia acesso antes da conclusão',read('app/src/components/AppShell.tsx').includes("account.tenant.onboardingCompletedAt==null&&path!=='/company'")],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
