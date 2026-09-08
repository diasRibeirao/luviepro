import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const service=fs.readFileSync(path.join(root,'src/modules/services/services.service.ts'),'utf8');
const spec=fs.readFileSync(path.join(root,'src/modules/services/services.service.spec.ts'),'utf8');

const checks=[
  ['backend only overrides base daily when the active team sum is positive', /dailyRateCents:teamDaily>0\?teamDaily:Number\(val\('dailyRateCents',0\)\)/.test(service)],
  ['legacy team presence no longer zeroes the configured base daily', !/dailyRateCents:team\.length\?teamDaily/.test(service)],
  ['regression test covers zero-rate team with R$ 300 base', /preserves the configured base daily when the team exists but all included rates are zero/.test(spec)],
  ['regression test expects 30000 cents', /expect\(result\.dailyRateCents\)\.toBe\(30000\)/.test(spec)],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
