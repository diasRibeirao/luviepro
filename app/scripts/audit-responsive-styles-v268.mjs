import fs from 'node:fs';
const files=[
'src/modules/settings/screens/SettingsScreen.tsx',
'src/modules/settings/screens/FinancialCategoriesScreen.tsx',
'src/modules/settings/screens/PaymentMethodsScreen.tsx',
'src/modules/settings/screens/ProductCategoriesScreen.tsx',
'src/modules/settings/screens/ProductUnitsScreen.tsx',
'src/modules/access/screens/UsersManagementScreen.tsx',
'src/modules/platform/screens/PlatformScreen.tsx',
'src/modules/platform/PlatformOverview.tsx'
];
const names=['noticeNarrow','groupHeadNarrow','cardNarrow','summaryNarrow','toolbarNarrow','rowNarrow','paginationNarrow','contentNarrow','headerActionsNarrow','metricsNarrow','gridNarrow','panelNarrow'];
let fail=0;console.log('v268 responsive style reference audit');
for(const file of files){const src=fs.readFileSync(file,'utf8');for(const name of names){if(!new RegExp(`(?:s|styles)\\.${name}\\b`).test(src))continue;const ok=new RegExp(`${name}\\s*:`).test(src);console.log(`${ok?'OK':'FAIL'} ${file} -> ${name} declared`);if(!ok)fail++;}}
if(fail){console.error(`FAIL ${fail} referenced style(s) without declaration`);process.exit(1)}
console.log('OK all v268 referenced responsive styles are declared');
