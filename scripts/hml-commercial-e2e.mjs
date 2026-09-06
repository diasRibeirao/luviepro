const API_BASE=(process.env.LUVIEPRO_API_URL||'https://luviepro-api-hml.onrender.com').replace(/\/+$/,'');
const WRITE_MODE=process.env.LUVIEPRO_E2E_WRITE==='1';
const EMAIL=process.env.LUVIEPRO_E2E_EMAIL||'';
const PASSWORD=process.env.LUVIEPRO_E2E_PASSWORD||'';
const CHECKOUT_PLAN=(process.env.LUVIEPRO_E2E_PLAN||'pro').toLowerCase();
const CHECKOUT_PERIOD=(process.env.LUVIEPRO_E2E_PERIOD||'monthly').toLowerCase();

const expected={
  basic:{monthly:6990,quarterly:18873,semiannual:35649,annual:67104},
  starter:{monthly:9990,quarterly:26973,semiannual:50949,annual:95904},
  pro:{monthly:11990,quarterly:32373,semiannual:61149,annual:115104},
  business:{monthly:14990,quarterly:40473,semiannual:76449,annual:143904},
};

function ok(m){console.log(`OK   ${m}`)}
function warn(m){console.log(`WARN ${m}`)}
function fail(m){console.error(`FAIL ${m}`);process.exitCode=1}

async function request(path,options={}){
  const response=await fetch(`${API_BASE}${path}`,{
    ...options,
    headers:{Accept:'application/json','Content-Type':'application/json',...(options.headers||{})},
    signal:AbortSignal.timeout(30000),
  });
  const text=await response.text();
  let body=null;
  try{body=text?JSON.parse(text):null}catch{body=text}
  return {response,body,text};
}

function cookieFrom(response){
  const raw=response.headers.get('set-cookie')||'';
  if(!raw)return '';
  return raw.split(',').map(x=>x.trim().split(';')[0]).filter(Boolean).join('; ');
}

async function safeChecks(){
  console.log(`Commercial flow safe checks -> ${API_BASE}`);

  const plans=await request('/api/plans');
  if(plans.response.status!==200){fail(`GET /api/plans -> ${plans.response.status}`);return}
  if(!Array.isArray(plans.body)){fail('GET /api/plans did not return an array');return}
  ok('public plan catalog');

  for(const [code,prices] of Object.entries(expected)){
    const plan=plans.body.find(x=>String(x?.plan).toLowerCase()===code && x?.active!==false);
    if(!plan){fail(`${code} missing from active catalog`);continue}
    for(const [period,value] of Object.entries(prices)){
      const field=period==='monthly'?'monthlyPriceCents':
        period==='quarterly'?'quarterlyPriceCents':
        period==='semiannual'?'semiannualPriceCents':'annualPriceCents';
      if(plan[field]!==value)fail(`${code}.${field}: expected ${value}, got ${plan[field]}`);
    }
    if(!process.exitCode)ok(`${code} commercial prices`);
  }

  const anonymousCheckout=await request('/api/billing/checkout',{
    method:'POST',
    body:JSON.stringify({plan:'pro',period:'monthly'})
  });
  if([401,403].includes(anonymousCheckout.response.status))ok('checkout requires authenticated tenant owner');
  else fail(`anonymous checkout should be blocked; got ${anonymousCheckout.response.status}`);

  const invalidEmail=`e2e-invalid-plan-${Date.now()}@example.invalid`;
  const invalidRegister=await request('/api/auth/register',{
    method:'POST',
    body:JSON.stringify({
      company:'E2E Invalid Plan - DO NOT CREATE',
      name:'E2E Validation',
      phone:'11999999999',
      email:invalidEmail,
      password:'LuviePro!E2E#123',
      plan:'__invalid_plan__',
      period:'monthly'
    })
  });
  const invalidText=JSON.stringify(invalidRegister.body??'').toLowerCase();
  if(invalidRegister.response.status===400 && (invalidText.includes('plano')||invalidText.includes('plan'))){
    ok('registration rejects an invalid explicit plan before normal signup flow');
  }else{
    fail(`invalid-plan registration should return 400 plan error; got ${invalidRegister.response.status} ${invalidRegister.text.slice(0,180)}`);
  }
}

async function checkoutWriteCheck(){
  if(!WRITE_MODE){
    console.log('\nSAFE MODE complete. No checkout/payment record was created.');
    console.log('Set LUVIEPRO_E2E_WRITE=1 plus LUVIEPRO_E2E_EMAIL/PASSWORD to validate one real HML checkout.');
    return;
  }

  if(!EMAIL||!PASSWORD){
    fail('WRITE MODE requires LUVIEPRO_E2E_EMAIL and LUVIEPRO_E2E_PASSWORD');
    return;
  }
  if(!expected[CHECKOUT_PLAN]||expected[CHECKOUT_PLAN][CHECKOUT_PERIOD]===undefined){
    fail(`invalid plan/period for WRITE MODE: ${CHECKOUT_PLAN}/${CHECKOUT_PERIOD}`);
    return;
  }

  const login=await request('/api/auth/login',{
    method:'POST',
    body:JSON.stringify({email:EMAIL,password:PASSWORD})
  });
  if(login.response.status!==200 && login.response.status!==201){
    fail(`login failed -> ${login.response.status} ${login.text.slice(0,180)}`);
    return;
  }
  ok('tenant login');

  let cookie=cookieFrom(login.response);
  const token=login.body?.token||login.body?.accessToken||login.body?.access_token;
  const headers={};
  if(cookie)headers.Cookie=cookie;
  if(token)headers.Authorization=`Bearer ${token}`;
  if(!cookie&&!token){
    fail('login succeeded but no session cookie/token was found');
    return;
  }

  const account=await request('/api/account',{headers});
  if(account.response.status!==200){
    fail(`GET /api/account failed -> ${account.response.status}`);
    return;
  }
  const currentRole=String(account.body?.currentUser?.role||account.body?.user?.role||'').toLowerCase();
  ok(`authenticated account (${account.body?.tenant?.plan||'plan unknown'})`);
  console.log(`INFO authenticated role: ${currentRole||'unknown'}`);

  if(currentRole!=='owner'){
    fail(`checkout requires role owner, but authenticated role is ${currentRole||'unknown'}`);
    console.log('INFO Use the tenant owner account for WRITE MODE. No checkout was attempted.');
    return;
  }

  const checkout=await request('/api/billing/checkout',{
    method:'POST',
    headers,
    body:JSON.stringify({plan:CHECKOUT_PLAN,period:CHECKOUT_PERIOD})
  });
  if(checkout.response.status!==200 && checkout.response.status!==201){
    fail(`checkout failed -> ${checkout.response.status} ${checkout.text.slice(0,240)}`);
    return;
  }

  const body=checkout.body||{};
  if(!body.paymentId)fail('checkout response missing paymentId');
  else ok(`checkout paymentId ${body.paymentId}`);

  if(!body.preferenceId)fail('checkout response missing preferenceId');
  else ok('Mercado Pago preferenceId');

  if(!body.checkoutUrl)fail('checkout response missing checkoutUrl');
  else ok('Mercado Pago checkoutUrl');

  if(body.billingAction)ok(`billingAction ${body.billingAction}`);
  if(body.sandbox===true)ok('Mercado Pago sandbox mode');
  else warn('checkout response did not report sandbox=true; verify HML Mercado Pago configuration');

  const expectedAmount=expected[CHECKOUT_PLAN][CHECKOUT_PERIOD];
  console.log(`Expected catalog amount for ${CHECKOUT_PLAN}/${CHECKOUT_PERIOD}: R$ ${(expectedAmount/100).toFixed(2).replace('.',',')}`);
  console.log('WRITE MODE creates/reuses a checkout payment record. Do not complete payment unless you intentionally want to test settlement/webhook.');
}

async function main(){
  await safeChecks();
  if(process.exitCode)return;
  await checkoutWriteCheck();
  if(!process.exitCode)console.log('\nHML commercial end-to-end validation passed.');
}

main().catch(e=>fail(e instanceof Error?(e.stack||e.message):String(e)));
