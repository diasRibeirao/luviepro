import fs from 'node:fs';

const files=[
 'src/modules/finance/screens/FinanceScreen.tsx',
 'src/modules/casa-nova/screens/CasaNovaScreen.tsx'
];
const names=[
 'metricsNarrow','toolbarNarrow','tabsNarrow','filtersNarrow','searchWrap','searchWrapNarrow',
 'kindNarrow','dateFilterNarrow','reportToolbarNarrow','reportCardNarrow','monthRowNarrow',
 'monthLabelNarrow','barRowNarrow','barLabelNarrow','barAmountNarrow',
 'heroNarrow','guestCardNarrow','guestRowNarrow','summaryNarrow','listHeaderNarrow',
 'headerActionsNarrow','filtersNarrow','bulkBarNarrow','bulkActionsNarrow','bulkSelectNarrow',
 'addPanelCompact','addPanelNarrow','twoNarrow'
];

let failed=0;
console.log('v267 responsive style reference audit');
for(const file of files){
 const src=fs.readFileSync(file,'utf8');
 for(const name of names){
   const referenced=new RegExp(`s\\.${name}\\b`).test(src);
   if(!referenced) continue;
   const declared=new RegExp(`${name}\\s*:`).test(src);
   console.log(`${declared?'OK':'FAIL'} ${file} -> ${name} declared`);
   if(!declared) failed++;
 }
}
if(failed){console.error(`FAIL ${failed} referenced style(s) without declaration`);process.exit(1)}
console.log('OK all v267 referenced responsive styles are declared');
