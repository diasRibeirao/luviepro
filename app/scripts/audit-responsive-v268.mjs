import fs from 'node:fs';
const checks=[
['src/modules/settings/screens/SettingsScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow cards',/cardNarrow\s*:/]]],
['src/modules/settings/screens/FinancialCategoriesScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow row',/rowNarrow\s*:/],['narrow pagination',/paginationNarrow\s*:/]]],
['src/modules/settings/screens/PaymentMethodsScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow row',/rowNarrow\s*:/],['narrow pagination',/paginationNarrow\s*:/]]],
['src/modules/settings/screens/ProductCategoriesScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow row',/rowNarrow\s*:/]]],
['src/modules/settings/screens/ProductUnitsScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow row',/rowNarrow\s*:/]]],
['src/modules/access/screens/UsersManagementScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow row',/rowNarrow\s*:/]]],
['src/modules/platform/screens/PlatformScreen.tsx',[['narrow breakpoint',/narrow=width<520/],['narrow content',/contentNarrow\s*:/],['narrow actions',/headerActionsNarrow\s*:/]]],
['src/modules/platform/PlatformOverview.tsx',[['window dimensions',/useWindowDimensions/],['narrow metrics',/metricsNarrow\s*:/],['narrow panel',/panelNarrow\s*:/]]],
['src/modules/platform/PlatformLists.tsx',[['mobile top wraps',/mobileTop:\{[^}]*flexWrap:'wrap'/],['plan top wraps',/planTop:\{[^}]*flexWrap:'wrap'/]]],
['src/modules/platform/PlatformPagination.tsx',[['pagination wraps',/row:\{[^}]*flexWrap:'wrap'/]]],
];
let fail=0;console.log('v268 Settings + Platform responsive audit');
for(const [file,rules] of checks){const src=fs.readFileSync(file,'utf8');for(const [name,rx] of rules){const ok=rx.test(src);console.log(`${ok?'OK':'FAIL'} ${file} -> ${name}`);if(!ok)fail++;}}
if(fail){console.error(`FAIL ${fail} responsive contract(s)`);process.exit(1)}
console.log('OK v268 responsive contracts complete');
console.log('INFO Static audit complements visual Web/Android/iOS validation.');
