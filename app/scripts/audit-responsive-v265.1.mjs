import fs from 'node:fs';

const file='src/modules/clients/screens/ClientsScreen.tsx';
const src=fs.readFileSync(file,'utf8');
const checks=[
 ['rowNarrow referenced',/s\.rowNarrow/.test(src)],
 ['rowNarrow declared',/rowNarrow\s*:/.test(src)],
 ['avatarNarrow referenced',/s\.avatarNarrow/.test(src)],
 ['avatarNarrow declared',/avatarNarrow\s*:/.test(src)],
 ['mobileContact referenced',/s\.mobileContact/.test(src)],
 ['mobileContact declared',/mobileContact\s*:/.test(src)],
 ['modalActionsCompact declared',/modalActionsCompact\s*:/.test(src)]
];
let fail=0;
console.log('v265.1 Clients responsive style contract audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} style contract(s)`);process.exit(1)}
console.log('OK all referenced v265 responsive styles are declared');
