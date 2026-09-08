import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const store=read('src/modules/quotes/calculatorQuoteDraft.ts');
const screen=read('src/modules/quotes/screens/QuotesScreen.tsx');
const checks=[
  ['draft persists in sessionStorage',store.includes("STORAGE_KEY='luviepro.calculatorQuoteDraft.v1'")&&store.includes('setItem(STORAGE_KEY,JSON.stringify(current))')],
  ['draft read is non destructive',store.includes('export function getCalculatorQuoteDraft')&&!store.includes('consumeCalculatorQuoteDraft')],
  ['stored draft is validated before reuse',store.includes('function isDraft')&&store.includes('if(!isDraft(parsed))')],
  ['invalid/stale draft can be removed',store.includes('removeItem(STORAGE_KEY)')&&store.includes('export function clearCalculatorQuoteDraft')],
  ['quotes screen uses idempotent read',screen.includes("getCalculatorQuoteDraft():undefined")||screen.includes("?getCalculatorQuoteDraft():undefined")],
  ['calculator draft is cleared only when flow closes',screen.includes("if(params.fromCalculator==='1')clearCalculatorQuoteDraft()")],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks OK`);
if(failed)process.exit(1);
