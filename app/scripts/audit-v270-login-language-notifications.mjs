import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const checks=[
 ['Login forgot below button',read('src/modules/auth/screens/LoginScreen.tsx'),/accessLinks/],
 ['Login first access below button',read('src/modules/auth/screens/LoginScreen.tsx'),/router\.push\('\/first-access'\)/],
 ['Language uses Brazil flag',read('src/i18n.tsx'),/🇧🇷/],
 ['Language uses US flag',read('src/i18n.tsx'),/🇺🇸/],
 ['Language uses Spain flag',read('src/i18n.tsx'),/🇪🇸/],
 ['Notifications has preferences action',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/(Preferências|Ocultar preferências)/],
 ['Notifications has all filter',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/filter==='all'/],
 ['Notifications has unread filter',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/filter==='unread'/],
 ['Notifications has read filter',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/filter==='read'/],
 ['Notifications mark all preserved',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/notifications\/read-all/],
 ['Notifications preferences API preserved',read('src/modules/notifications/screens/NotificationsScreen.tsx'),/notifications\/preferences/],
];
let fail=0;console.log('v270 Login + language + notifications audit');
for(const [name,src,rx] of checks){const ok=rx.test(src);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v270 contracts complete');
