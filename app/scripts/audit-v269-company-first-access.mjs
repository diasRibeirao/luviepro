import fs from 'node:fs';
const read=f=>fs.readFileSync(f,'utf8');
const checks=[
 ['Company compact tabs show all options',read('src/modules/settings/screens/CompanyScreen.tsx'),/compact\?<View style=\{\[s\.tabs,s\.tabsCompact\]\}/],
 ['Company compact tabs wrap',read('src/modules/settings/settings.styles.ts'),/tabsRowCompact:\{[^}]*flexWrap:'wrap'/],
 ['Company selected tab highlighted',read('src/modules/settings/settings.styles.ts'),/tabOn:\{[^}]*backgroundColor:theme\.white[^}]*borderColor:theme\.green2/],
 ['Company tabs joined to content',read('src/modules/settings/settings.styles.ts'),/content:\{[^}]*marginTop:-1/],
 ['Login exposes first access',read('src/modules/auth/screens/LoginScreen.tsx'),/router\.push\('\/first-access'\)/],
 ['First access route exists',read('app/(auth)/first-access.tsx'),/AcceptInviteScreen/],
 ['First access accepts manual code',read('src/modules/auth/screens/AcceptInviteScreen.tsx'),/CÓDIGO DE PRIMEIRO ACESSO/],
 ['First access accepts query token',read('src/modules/auth/screens/AcceptInviteScreen.tsx'),/useLocalSearchParams/],
 ['User creation explains mandatory first access',read('src/modules/access/screens/UsersManagementScreen.tsx'),/Primeiro acesso obrigatório/],
 ['User creation sends first access',read('src/modules/access/screens/UsersManagementScreen.tsx'),/Criar usuário e enviar primeiro acesso/],
];
let fail=0;console.log('v269 Company tabs + first access audit');
for(const [name,src,rx] of checks){const ok=rx.test(src);console.log(`${ok?'OK':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`FAIL ${fail} contract(s)`);process.exit(1)}
console.log('OK v269 app contracts complete');
