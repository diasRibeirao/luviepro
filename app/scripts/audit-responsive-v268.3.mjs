import fs from 'node:fs';

const file='src/modules/platform/PlatformOverview.tsx';
const src=fs.readFileSync(file,'utf8');

const checks=[
 ['react-native import includes useWindowDimensions',/import\s*\{[^}]*\buseWindowDimensions\b[^}]*\}\s*from\s*['"]react-native['"]/],
 ['declares width and narrow',/const \{width\}=useWindowDimensions\(\);const narrow=width<520/],
 ['metrics use narrow',/styles\.metrics,narrow&&styles\.metricsNarrow/],
 ['grid uses narrow',/styles\.grid,narrow&&styles\.gridNarrow/],
 ['Panel receives narrow',/<Panel narrow=\{narrow\}/],
 ['Panel declares narrow prop',/narrow:boolean/],
 ['Panel uses narrow safely',/styles\.panel,narrow&&styles\.panelNarrow/],
];

let fail=0;
console.log('v268.3 PlatformOverview import/scope audit');
for(const [name,rx] of checks){
  const ok=rx.test(src);
  console.log(`${ok?'OK':'FAIL'} ${name}`);
  if(!ok) fail++;
}
if(fail){
  console.error(`FAIL ${fail} contract(s)`);
  process.exit(1);
}
console.log('OK PlatformOverview import and narrow scope complete');
