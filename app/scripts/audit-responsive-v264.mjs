import fs from 'node:fs';

const file='src/modules/quotes/screens/QuoteProposalScreen.tsx';
const src=fs.readFileSync(file,'utf8');
const checks=[
 ['uses window dimensions',/useWindowDimensions/.test(src)],
 ['compact breakpoint',/const compact=width<640/.test(src)],
 ['tablet breakpoint',/const tablet=width>=640&&width<900/.test(src)],
 ['compact paper',/paperCompact/.test(src)],
 ['compact header',/headerCompact/.test(src)],
 ['compact rows',/rowCompact/.test(src)],
 ['compact total',/totalBoxCompact/.test(src)],
 ['print CSS preserved',/@media print/.test(src)&&/#proposal-page/.test(src)]
];
let fail=0;
console.log('v264 QuoteProposal responsive audit');
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} responsive contract(s)`);process.exit(1)}
console.log('OK QuoteProposal responsive contracts complete');
