import fs from 'node:fs';

const smoke=fs.readFileSync(new URL('./hml-smoke.mjs',import.meta.url),'utf8');
const checks=[
  ['frontend HML',/Frontend HML/],
  ['API liveness',/health\/live/],
  ['API readiness',/health`/],
  ['catálogo público de planos',/\/plans/],
  ['preflight CORS',/method:'OPTIONS'/],
  ['origem CORS esperada',/access-control-allow-origin/],
  ['timeout configurável',/HML_SMOKE_TIMEOUT_MS/],
  ['falha encerra com código 1',/process\.exit\(1\)/],
];
let ok=0;
for(const [name,re] of checks){
  if(re.test(smoke)){console.log(`OK - ${name}`);ok++;}
  else console.log(`FAIL - ${name}`);
}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
