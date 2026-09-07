import fs from 'node:fs';
const src=fs.readFileSync('src/modules/notifications/screens/NotificationsScreen.tsx','utf8');
const checks=[
 ['uses native Modal',/import \{[^}]*Modal[^}]*\} from 'react-native'/],
 ['preferences opens modal',/setShowPrefs\(true\)/],
 ['modal closes with backdrop',/style=\{s\.backdrop\} onPress=\{onClose\}/],
 ['modal handles native back',/onRequestClose=\{onClose\}/],
 ['preferences API preserved',/notifications\/preferences/],
 ['mark all API preserved',/notifications\/read-all/],
 ['desktop modal max width',/maxWidth:560/],
 ['mobile modal adapts height',/modalCardNarrow:\{maxHeight:'(?:92|96)%'/],
 ['mobile footer stacks',/modalFooterNarrow:\{flexDirection:'column'/],
 ['preference descriptions present',/Receba avisos relacionados a compromissos/],
 ['auto-save message present',/As alterações são salvas automaticamente/],
];
let fail=0;
console.log('v271 Notification preferences modal audit');
for(const [name,rx] of checks){const ok=rx.test(src);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v271 notification preferences modal contracts complete');
console.log('INFO Visual validation still required on Web, Android and iOS.');
