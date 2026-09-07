import fs from 'node:fs';

const checks=[
 ['src/modules/quotes/screens/QuotesScreen.tsx',[
   ['narrow breakpoint',/narrow=width<520/],
   ['narrow stats',/statsNarrow\s*:/],
   ['narrow row',/rowNarrow\s*:/],
   ['mobile value',/valueMobile\s*:/],
   ['mobile modal header',/modalHeaderMobile\s*:/]
 ]],
 ['src/modules/projects/screens/ProjectsScreen.tsx',[
   ['narrow breakpoint',/narrow=width<520/],
   ['narrow summary',/summaryRowNarrow\s*:/],
   ['alerts wrap',/alerts:\{[^}]*flexWrap:'wrap'/],
   ['meta wraps',/metaRow:\{[^}]*flexWrap:'wrap'/],
   ['footer wraps',/footer:\{[^}]*flexWrap:'wrap'/]
 ]],
 ['src/modules/orders/screens/OrdersScreen.tsx',[
   ['narrow breakpoint',/narrow=width<520/],
   ['narrow metrics',/metricsNarrow\s*:/],
   ['narrow card',/cardNarrow\s*:/],
   ['item wraps',/item:\{[^}]*flexWrap:'wrap'/],
   ['payment rows wrap',/paymentRow:\{[^}]*flexWrap:'wrap'/]
 ]],
 ['src/modules/purchases/screens/PurchasesScreen.tsx',[
   ['narrow breakpoint',/narrow=width<520/],
   ['narrow metrics',/metricsNarrow\s*:/],
   ['narrow toolbar',/toolbarNarrow\s*:/],
   ['narrow card',/cardNarrow\s*:/],
   ['compact info',/infoCompact\s*:/],
   ['receive rows wrap',/receiveRow:\{[^}]*flexWrap:'wrap'/]
 ]]
];

let failed=0;
console.log('v266 Quotes / Projects / Orders / Purchases responsive audit');
for(const [file,rules] of checks){
 const src=fs.readFileSync(file,'utf8');
 for(const [name,rx] of rules){
   const ok=rx.test(src);
   console.log(`${ok?'OK':'FAIL'} ${file} -> ${name}`);
   if(!ok) failed++;
 }
}
if(failed){console.error(`FAIL ${failed} responsive contract(s)`);process.exit(1)}
console.log('OK v266 responsive contracts complete');
console.log('INFO Static audit complements visual Web/Android/iOS validation.');
