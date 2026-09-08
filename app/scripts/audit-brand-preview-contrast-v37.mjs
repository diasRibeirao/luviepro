import fs from 'node:fs';
const company=fs.readFileSync(new URL('../src/modules/settings/screens/CompanyScreen.tsx',import.meta.url),'utf8');
const checks=[
 ['preview contrast helper exists',company.includes('function previewReadableOn')],
 ['preview alpha helper exists',company.includes('function previewWithAlpha')],
 ['preview derives foreground from primary',company.includes('previewReadableOn(previewPrimary)')],
 ['preview derives muted text',company.includes('previewWithAlpha(previewForeground,.68)')],
 ['preview header uses derived foreground',company.includes('color:previewForeground')],
 ['preview subtitle uses derived muted color',company.includes('color:previewMuted')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'FAIL'} - ${name}`);if(pass)ok++;}
console.log(`${ok}/${checks.length} checks OK`);if(ok!==checks.length)process.exit(1);
