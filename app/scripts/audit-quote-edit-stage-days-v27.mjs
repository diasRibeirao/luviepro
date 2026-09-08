import fs from 'node:fs';
const file='src/modules/quotes/screens/QuoteDetailScreen.tsx';
const source=fs.readFileSync(file,'utf8');
const checks=[
  ['imports projectDaysFromStages',source.includes("import {projectDaysFromStages} from '../../../servicePlanning';")],
  ['new item edit uses stages to derive days',source.includes('days:String(projectDaysFromStages(service.stages,service.defaultDays||1))')],
  ['keeps at least one day fallback',source.includes('service.defaultDays||1')],
  ['keeps service stages on the edit row',source.includes("stages:(service.stages??[]).map(stage=>({description:stage.description??'',duration:stage.duration}))")],
  ['daily reference remains centralized',source.includes('dailyRateCents:serviceReferenceDailyCents(service)')]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} - ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks OK`);
if(failed)process.exit(1);
