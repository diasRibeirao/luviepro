import fs from 'node:fs';

const file='src/modules/notifications/screens/NotificationsScreen.tsx';
const src=fs.readFileSync(file,'utf8');

const checks=[
  ['compact actions use valid justifyContent', /actionsCompact:\{justifyContent:'flex-start'\}/],
  ['invalid justifyContent stretch removed', !/justifyContent:'stretch'/.test(src)],
  ['narrow actions remain full width', /actionNarrow:\{width:'100%'\}/],
];

let fail=0;
console.log('v270.1 Notifications React Native style audit');
for (const check of checks) {
  const [name, rule] = check;
  const ok = typeof rule === 'boolean' ? rule : rule.test(src);
  console.log(`${ok?'OK':'FAIL'} ${name}`);
  if(!ok) fail++;
}
if(fail){
  console.error(`FAIL ${fail} style contract(s)`);
  process.exit(1);
}
console.log('OK Notifications style contract complete');
