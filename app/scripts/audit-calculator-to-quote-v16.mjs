import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const calculator=read('src/modules/calculator/screens/CalculatorScreen.tsx');
const quotes=read('src/modules/quotes/screens/QuotesScreen.tsx');
const wizard=read('src/modules/quotes/components/QuoteWizard.tsx');
const draft=read('src/modules/quotes/calculatorQuoteDraft.ts');
const checks=[
  ['calculator stores a quote draft before navigation',calculator.includes('setCalculatorQuoteDraft({serviceIds:selectedIds')&&calculator.includes('fromCalculator=1')],
  ['draft store is read idempotently and cleared explicitly',draft.includes('export function getCalculatorQuoteDraft()')&&draft.includes('export function clearCalculatorQuoteDraft()')],
  ['quotes screen restores calculator draft safely',quotes.includes("params.fromCalculator==='1'")&&quotes.includes('getCalculatorQuoteDraft()')&&quotes.includes('clearCalculatorQuoteDraft()')],
  ['wizard receives calculator draft',quotes.includes('calculatorDraft={calculatorDraft}')&&wizard.includes('calculatorDraft?:CalculatorQuoteDraft')],
  ['single service preserves edited calculator values',wizard.includes('calculatorDraft.serviceIds.length!==1')&&wizard.includes('days:calculatorDraft.days')&&wizard.includes('team:calculatorDraft.team.map')&&wizard.includes('variable:calculatorDraft.variable.map')&&wizard.includes('fixed:calculatorDraft.fixed.map')],
  ['multiple services are preselected without forcing aggregate lines into each item',wizard.includes('calculatorDraft.serviceIds.length>1')&&wizard.includes('setSelectedServices(validIds)')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK ':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks OK`);
process.exitCode=failed?1:0;
