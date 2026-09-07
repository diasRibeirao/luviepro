import fs from 'node:fs';
const src=fs.readFileSync('src/modules/notifications/screens/NotificationsScreen.tsx','utf8');
const checks=[
 ['mobile modal root gets compact padding',/modalRootNarrow:\{paddingHorizontal:10,paddingVertical:10\}/],
 ['mobile modal keeps safe max height',/modalCardNarrow:\{maxHeight:'96%'/],
 ['mobile header is compact',/modalHeadNarrow:\{paddingHorizontal:16,paddingVertical:14/],
 ['mobile content has tighter padding',/modalContentNarrow:\{paddingHorizontal:14,paddingVertical:14\}/],
 ['mobile preference cards are compact',/preferenceRowCompact:\{minHeight:62/],
 ['mobile footer remains stacked',/modalFooterNarrow:\{flexDirection:'column',alignItems:'stretch'/],
 ['mobile conclude remains full width',/doneButtonNarrow:\{width:'100%'\}/],
 ['modal scroll is preserved',/<ScrollView style=\{s\.modalScroll\}/],
 ['native back close is preserved',/onRequestClose=\{onClose\}/],
];
let fail=0;
console.log('v271.2 Notification modal mobile audit');
for(const [name,rx] of checks){const ok=rx.test(src);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v271.2 responsive notification modal contracts complete');
