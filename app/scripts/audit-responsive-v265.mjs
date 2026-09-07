import fs from 'node:fs';

const checks=[
 ['src/modules/clients/screens/ClientsScreen.tsx',[
  ['narrow breakpoint',/narrow=width<520/],
  ['mobile contact',/mobileContact/],
  ['compact modal footer',/modalActionsCompact/]
 ]],
 ['src/modules/services/screens/ServicesScreen.tsx',[
  ['compact header',/headCompact/],
  ['compact card actions',/cardActionsCompact/],
  ['compact metrics',/metricsCompact/]
 ]],
 ['src/modules/products/screens/ProductsScreen.tsx',[
  ['narrow breakpoint',/narrow=width<520/],
  ['compact metrics',/metricsCompact/],
  ['compact stock',/stockCompact/],
  ['compact pagination',/paginationCompact/],
  ['narrow history',/historyNarrow/]
 ]]
];

let failed=0;
console.log('v265 operational screens responsive audit');
for(const [file,rules] of checks){
  const src=fs.readFileSync(file,'utf8');
  for(const [name,rx] of rules){
    const ok=rx.test(src);
    console.log(`${ok?'OK':'FAIL'} ${file} -> ${name}`);
    if(!ok) failed++;
  }
}
if(failed){
  console.error(`FAIL ${failed} responsive contract(s)`);
  process.exit(1);
}
console.log('OK Clients, Services and Products responsive contracts complete');
