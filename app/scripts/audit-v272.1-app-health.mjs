import fs from 'node:fs';

const read=(file)=>fs.readFileSync(file,'utf8');
const checks=[
 ['Platform tab contract includes health',read('src/modules/platform/contracts.ts').includes("'health'")],
 ['Platform sidebar exposes Saúde do aplicativo',read('src/modules/platform/PlatformSidebar.tsx').includes('Saúde do aplicativo')],
 ['Platform screen renders PlatformHealth',read('src/modules/platform/screens/PlatformScreen.tsx').includes("tab==='health'?<PlatformHealth/>")],
 ['Platform health screen exists',fs.existsSync('src/modules/platform/PlatformHealth.tsx')],
 ['Health screen calls protected platform endpoint',read('src/modules/platform/PlatformHealth.tsx').includes("api<PlatformHealthPayload>('/platform/health')")],
 ['Frontend diagnostics collect latency and error classes',read('src/api.ts').includes('apiDiagnosticsSnapshot')&&read('src/api.ts').includes('operationalFailures')&&read('src/api.ts').includes('slowRequests')],
 ['Health screen documents sensitive-data exclusion',read('src/modules/platform/PlatformHealth.tsx').includes('não incluem senhas, tokens')],
];
let fail=0;
console.log('v272.1 App health audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v272.1 app health contracts complete');
