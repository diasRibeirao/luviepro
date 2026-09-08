const web=(process.env.HML_WEB_URL||'https://luviepro-hml.onrender.com').replace(/\/$/,'');
const api=(process.env.HML_API_URL||'https://luviepro-api-hml.onrender.com/api').replace(/\/$/,'');
const timeoutMs=Number(process.env.HML_SMOKE_TIMEOUT_MS||30000);
const expectedOrigin=process.env.HML_EXPECTED_ORIGIN||web;

async function request(name,url,{json=false,method='GET',headers={}}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{method,redirect:'follow',signal:controller.signal,headers:{'user-agent':'luviepro-hml-smoke/1.1',...headers}});
    const body=method==='HEAD'?'':await res.text();
    if(!res.ok) throw new Error(`${res.status} ${res.statusText} ${body.slice(0,300)}`);
    if(json){
      const parsed=JSON.parse(body);
      if(parsed.status!=='ok')throw new Error(`status inesperado: ${parsed.status}`);
    }
    console.log(`OK  ${name} -> ${res.status}`);
    return {res,body};
  }finally{clearTimeout(timer)}
}

async function checkCors(){
  const {res}=await request('CORS preflight',`${api}/account`,{
    method:'OPTIONS',
    headers:{
      Origin:expectedOrigin,
      'Access-Control-Request-Method':'GET',
      'Access-Control-Request-Headers':'authorization,content-type',
    },
  });
  const allowOrigin=res.headers.get('access-control-allow-origin');
  if(allowOrigin!==expectedOrigin){
    throw new Error(`Access-Control-Allow-Origin inesperado: ${allowOrigin||'(ausente)'}`);
  }
}

async function checkPublicPlans(){
  const {body}=await request('Catálogo público de planos',`${api}/plans`);
  const parsed=JSON.parse(body);
  if(!Array.isArray(parsed)||parsed.length===0)throw new Error('catálogo público de planos vazio ou inválido');
}

const checks=[
  ['Frontend HML',()=>request('Frontend HML',web)],
  ['API liveness',()=>request('API liveness',`${api}/health/live`,{json:true})],
  ['API readiness',()=>request('API readiness',`${api}/health`,{json:true})],
  ['Catálogo público de planos',checkPublicPlans],
  ['CORS preflight',checkCors],
];

let failed=false;
for(const [name,fn] of checks){
  try{await fn()}catch(e){failed=true;console.error(`FAIL ${name}\n     ${e instanceof Error?e.message:e}`)}
}
if(failed)process.exit(1);
console.log('\nSmoke test HML concluído sem falhas.');
