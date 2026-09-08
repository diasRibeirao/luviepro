import fs from 'node:fs';
const path='src/modules/services/screens/ServicesScreen.tsx';
const s=fs.readFileSync(path,'utf8');
const checks=[
  ['default P.O. cents constant',s.includes("const DEFAULT_BASE_DAILY_CENTS=30000")],
  ['composition helper exists',s.includes('const compositionDailyCents=(service:ServiceRecord)=>')],
  ['team daily has precedence',s.includes('if(teamDaily>0)return teamDaily')],
  ['legacy zero daily falls back to 300',s.includes('service.dailyRateCents>0?service.dailyRateCents:DEFAULT_BASE_DAILY_CENTS')],
  ['fallback P.O. line uses effective daily',s.includes('const fallbackDaily=compositionDailyCents(service)')&&s.includes("value:reais(fallbackDaily)")],
  ['composed base daily sums effective values',s.includes('selected.reduce((sum,service)=>sum+compositionDailyCents(service),0)')],
];
for(const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
const failed=checks.filter(([,ok])=>!ok).length;
console.log(`\n${checks.length-failed}/${checks.length} checks OK`);
if(failed) process.exit(1);
