const API_BASE=(process.env.LUVIEPRO_API_URL||'https://luviepro-api-hml.onrender.com').replace(/\/+$/,'');
const EMAIL=process.env.LUVIEPRO_E2E_EMAIL||'';
const PASSWORD=process.env.LUVIEPRO_E2E_PASSWORD||'';

function ok(m){console.log(`OK   ${m}`)}
function info(m){console.log(`INFO ${m}`)}
function fail(m){console.error(`FAIL ${m}`);process.exitCode=1}

async function request(path,options={}){
  const response=await fetch(`${API_BASE}${path}`,{
    ...options,
    headers:{
      Accept:'application/json',
      'Content-Type':'application/json',
      ...(options.headers||{})
    },
    signal:AbortSignal.timeout(30000),
  });
  const text=await response.text();
  let body=null;
  try{body=text?JSON.parse(text):null}catch{body=text}
  return {response,body,text};
}

function cookieFrom(response){
  // Node fetch does not keep a browser cookie jar. Capture Set-Cookie manually
  // so this smoke test can reproduce credentials:'include' behavior.
  const raw=response.headers.get('set-cookie')||'';
  if(!raw)return '';
  return raw
    .split(/,(?=[^;,]+=)/g)
    .map(x=>x.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function main(){
  console.log(`Auth refresh HML -> ${API_BASE}`);

  if(!EMAIL||!PASSWORD){
    fail('Set LUVIEPRO_E2E_EMAIL and LUVIEPRO_E2E_PASSWORD.');
    return;
  }

  // Mirror the actual web client: login is marked with X-Auth-Client:web.
  const login=await request('/api/auth/login',{
    method:'POST',
    headers:{'X-Auth-Client':'web'},
    body:JSON.stringify({email:EMAIL,password:PASSWORD})
  });

  if(![200,201].includes(login.response.status)){
    fail(`login -> ${login.response.status} ${login.text.slice(0,180)}`);
    return;
  }
  ok('login with X-Auth-Client: web');

  let cookie=cookieFrom(login.response);
  const accessToken=login.body?.token||login.body?.accessToken||login.body?.access_token;

  if(!cookie){
    fail('web login returned no refresh-session cookie');
    info('The browser client depends on credentials: include + the refresh cookie.');
    return;
  }
  ok('refresh-session cookie received');

  const accountHeaders={Cookie:cookie};
  if(accessToken)accountHeaders.Authorization=`Bearer ${accessToken}`;

  const accountBefore=await request('/api/account',{headers:accountHeaders});
  if(accountBefore.response.status!==200){
    fail(`/api/account before refresh -> ${accountBefore.response.status} ${accountBefore.text.slice(0,180)}`);
    return;
  }
  ok(`/api/account before refresh (${accountBefore.body?.currentUser?.role||accountBefore.body?.user?.role||'role unknown'})`);

  // Mirror renew() from the frontend: cookie + X-Auth-Client:web, no bearer required.
  const refresh=await request('/api/auth/refresh',{
    method:'POST',
    headers:{
      Cookie:cookie,
      'X-Auth-Client':'web',
    },
    body:JSON.stringify({})
  });

  if(![200,201].includes(refresh.response.status)){
    fail(`POST /api/auth/refresh -> ${refresh.response.status} ${refresh.text.slice(0,220)}`);
    return;
  }
  ok('POST /api/auth/refresh');

  const rotatedCookie=cookieFrom(refresh.response);
  if(rotatedCookie){
    cookie=rotatedCookie;
    ok('refresh cookie rotated');
  }else{
    info('refresh response did not rotate cookie; reusing current cookie');
  }

  const refreshedToken=refresh.body?.token||refresh.body?.accessToken||refresh.body?.access_token;
  const afterHeaders={Cookie:cookie};
  if(refreshedToken)afterHeaders.Authorization=`Bearer ${refreshedToken}`;
  else if(accessToken)afterHeaders.Authorization=`Bearer ${accessToken}`;

  const accountAfter=await request('/api/account',{headers:afterHeaders});
  if(accountAfter.response.status!==200){
    fail(`/api/account after refresh -> ${accountAfter.response.status} ${accountAfter.text.slice(0,180)}`);
    return;
  }
  ok('/api/account after refresh');

  const beforeTenant=accountBefore.body?.tenant?.id||accountBefore.body?.tenantId||null;
  const afterTenant=accountAfter.body?.tenant?.id||accountAfter.body?.tenantId||null;
  if(beforeTenant&&afterTenant&&beforeTenant!==afterTenant){
    fail('tenant changed after refresh');
    return;
  }
  ok('tenant identity preserved');

  const beforeRole=accountBefore.body?.currentUser?.role||accountBefore.body?.user?.role||null;
  const afterRole=accountAfter.body?.currentUser?.role||accountAfter.body?.user?.role||null;
  if(beforeRole&&afterRole&&beforeRole!==afterRole){
    fail('role changed after refresh');
    return;
  }
  ok('role preserved');

  console.log('\nHML auth refresh validation passed.');
  info('Server-side web login + refresh continuity is working.');
  info('Final browser check remains Ctrl+F5 on an authenticated internal route.');
}

main().catch(e=>fail(e instanceof Error?(e.stack||e.message):String(e)));
