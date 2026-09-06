import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const apiPath=path.join(root,'src','api.ts');
const layoutPath=path.join(root,'app','_layout.tsx');
const storagePath=path.join(root,'src','authStorage.web.ts');
const flowPath=path.join(root,'src','modules','auth','authFlow.mjs');

const api=fs.readFileSync(apiPath,'utf8');
const layout=fs.readFileSync(layoutPath,'utf8');
const storage=fs.readFileSync(storagePath,'utf8');
const flow=fs.readFileSync(flowPath,'utf8');

const checks=[
  ['web auth storage uses sessionStorage',storage.includes('window.sessionStorage.getItem(KEY)')&&storage.includes('window.sessionStorage.setItem(KEY,value)')],
  ['web auth key is v4',storage.includes("const KEY='luviepro.auth.v4'")],
  ['legacy web auth keys are cleaned',storage.includes("luviepro.auth.v3")&&storage.includes("luviepro.auth.v2")&&storage.includes('cleanupLegacy()')],
  ['restoreSession reads persisted web auth',api.includes("if(Platform.OS==='web'){const raw=await readAuth()")],
  ['web restore renews server session before completion',api.includes("session=parsed.session;return renew();")],
  ['refresh request identifies web auth client',api.includes("'X-Auth-Client':'web'")],
  ['failed refresh clears local session',api.includes("if(!res.ok){clearSession();return false;}")],
  ['layout awaits restoreSession before setting ready',layout.includes('await restoreSession();if(active)setReady(true)')],
  ['auth guard only runs after ready',layout.includes('if(!ready)return;const redirect=authGuardRedirect')],
  ['authenticated direct routes do not redirect to login',flow.includes("if(!authenticated&&!isPublicAuthRoute(path))return '/';")],
  ['tenant session is isolated from platform routes',flow.includes("if(path==='/platform'||path.startsWith('/platform/'))return '/home';")],
];

let failed=0;
for(const [name,pass] of checks){
  console.log(`${pass?'OK  ':'FAIL'} ${name}`);
  if(!pass)failed++;
}

if(failed){
  console.error(`\n${failed} auth persistence contract check(s) failed.`);
  process.exit(1);
}

console.log('\nAuth persistence source contract passed.');
console.log('INFO Web uses sessionStorage intentionally: reload in the same tab should persist,');
console.log('INFO but a new browser session/tab may require login depending on refresh-cookie state.');
