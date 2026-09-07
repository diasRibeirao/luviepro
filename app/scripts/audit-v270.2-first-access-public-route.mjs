import fs from 'node:fs';
const flow=fs.readFileSync('src/modules/auth/authFlow.mjs','utf8');
const tests=fs.readFileSync('scripts/test-auth-flows.mjs','utf8');
const checks=[
 ['first-access is public auth route',/path==='\/first-access'/.test(flow)],
 ['public route test covers first-access',/['"]\/first-access['"]/.test(tests)],
 ['invite route remains public',/path\.startsWith\('\/invite\/'\)/.test(flow)],
 ['public proposal route remains public',/path\.startsWith\('\/p\/'\)/.test(flow)],
];
let fail=0;
console.log('v270.2 First Access public-route audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK First Access is reachable without authentication');
