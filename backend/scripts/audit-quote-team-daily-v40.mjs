import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/modules/quotes/quotes.service.ts',import.meta.url),'utf8');
const spec=fs.readFileSync(new URL('../src/modules/quotes/quotes.service.spec.ts',import.meta.url),'utf8');
const checks=[
  ['quote service loads team with service', /include:\{team:\{where:\{tenantId\}\},stages:/.test(source)],
  ['only included team members contribute', /filter\(member=>member\.included!==false\)/.test(source)],
  ['team daily is summed safely', /reduce\(\(sum,member\)=>sum\+Math\.max\(0,Number\(member\.dailyRateCents\)\|\|0\),0\)/.test(source)],
  ['team total precedes service base and R$ 300 fallback', /activeTeamDailyCents>0[\s\S]*activeTeamDailyCents[\s\S]*Number\(service\.dailyRateCents\)>0[\s\S]*30000/.test(source)],
  ['explicit quote override remains first priority', /input\.dailyRateCents!==undefined[\s\S]*\? input\.dailyRateCents/.test(source)],
  ['regression test covers active and inactive team members', /uses active service team daily total[\s\S]*included:false[\s\S]*48000/.test(spec)],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${checks.length} checks OK`);
if(ok!==checks.length)process.exit(1);
