import fs from 'node:fs';

const files=[
 'src/modules/quotes/screens/QuotesScreen.tsx',
 'src/modules/projects/screens/ProjectsScreen.tsx',
 'src/modules/orders/screens/OrdersScreen.tsx',
 'src/modules/purchases/screens/PurchasesScreen.tsx'
];
const names=['statsNarrow','rowNarrow','valueMobile','modalHeaderMobile','modalHeading','pageNarrow','summaryRowNarrow','metricsNarrow','cardNarrow','badgesNarrow','toolbarNarrow','headNarrow','infoCompact','actionsCompact'];
let failed=0;
console.log('v266 responsive style reference audit');
for(const file of files){
 const src=fs.readFileSync(file,'utf8');
 for(const name of names){
   const referenced=new RegExp(`(?:s|m)\\.${name}\\b`).test(src);
   if(!referenced) continue;
   const declared=new RegExp(`${name}\\s*:`).test(src);
   console.log(`${declared?'OK':'FAIL'} ${file} -> ${name} declared`);
   if(!declared) failed++;
 }
}
if(failed){console.error(`FAIL ${failed} referenced style(s) without declaration`);process.exit(1)}
console.log('OK all v266 referenced responsive styles are declared');
