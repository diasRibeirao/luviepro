import fs from 'node:fs';

const checks=[
 ['src/modules/finance/screens/FinanceScreen.tsx',[
  ['narrow breakpoint',/const narrow=width<520/],
  ['narrow metrics',/metricsNarrow\s*:/],
  ['narrow toolbar',/toolbarNarrow\s*:/],
  ['narrow search',/searchWrapNarrow\s*:/],
  ['narrow date filter',/dateFilterNarrow\s*:/],
  ['narrow report card',/reportCardNarrow\s*:/],
  ['narrow report bars',/barRowNarrow\s*:/]
 ]],
 ['src/modules/casa-nova/screens/CasaNovaScreen.tsx',[
  ['narrow breakpoint',/const narrow=width<520/],
  ['narrow hero',/heroNarrow\s*:/],
  ['narrow guest card',/guestCardNarrow\s*:/],
  ['narrow header actions',/headerActionsNarrow\s*:/],
  ['narrow bulk actions',/bulkActionsNarrow\s*:/],
  ['narrow bulk selects',/bulkSelectNarrow\s*:/],
  ['compact add panel',/addPanelCompact\s*:/],
  ['narrow add panel',/addPanelNarrow\s*:/]
 ]]
];

let failed=0;
console.log('v267 Finance + Casa Nova responsive audit');
for(const [file,rules] of checks){
 const src=fs.readFileSync(file,'utf8');
 for(const [name,rx] of rules){
   const ok=rx.test(src);
   console.log(`${ok?'OK':'FAIL'} ${file} -> ${name}`);
   if(!ok) failed++;
 }
}
if(failed){console.error(`FAIL ${failed} responsive contract(s)`);process.exit(1)}
console.log('OK v267 responsive contracts complete');
console.log('INFO Static audit complements visual Web/Android/iOS validation.');
