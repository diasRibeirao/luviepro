import fs from 'node:fs';
const read=(file)=>fs.readFileSync(file,'utf8');
const controller=read('src/modules/platform/platform.controller.ts');
const service=read('src/modules/platform/platform-health.service.ts');
const moduleFile=read('src/modules/platform/platform.module.ts');
const checks=[
 ['Platform health service exists',fs.existsSync('src/modules/platform/platform-health.service.ts')],
 ['Endpoint is under platform controller',controller.includes("@Controller('platform')")&&controller.includes("@Get('health')")],
 ['Platform controller remains role restricted',controller.includes("@Roles('platform_admin')")],
 ['Health service checks PostgreSQL',service.includes('SELECT 1')],
 ['Health service checks Redis',service.includes('this.redis.ping()')],
 ['Health service checks Prisma migrations',service.includes('"_prisma_migrations"')],
 ['Health service only reports Mercado Pago configuration state',service.includes('MERCADO_PAGO_ACCESS_TOKEN')&&service.includes('configured: mercadoPagoConfigured')],
 ['Health service only reports mail configuration state',service.includes('MAIL_PROVIDER')&&service.includes('configured: mailConfigured')],
 ['Platform module registers health provider',moduleFile.includes('PlatformHealthService')],
 ['No environment secret values are returned',!service.includes('accessToken:')&&!service.includes('webhookSecret:')&&!service.includes('databaseUrl:')],
];
let fail=0;
console.log('v272.1 Platform health audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v272.1 platform health contracts complete');
