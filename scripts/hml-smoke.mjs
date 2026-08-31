const web=(process.env.HML_WEB_URL||'https://luviepro-hml.onrender.com').replace(/\/$/,'');
const api=(process.env.HML_API_URL||'https://luviepro-api-hml.onrender.com/api').replace(/\/$/,'');
const timeoutMs=Number(process.env.HML_SMOKE_TIMEOUT_MS||30000);

async function check(name,url,{json=false}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'luviepro-hml-smoke/1.0'}});
    const body=await res.text();
    if(!res.ok) throw new Error(`${res.status} ${res.statusText} ${body.slice(0,300)}`);
    if(json){
      const parsed=JSON.parse(body);
      if(parsed.status!=='ok')throw new Error(`status inesperado: ${parsed.status}`);
    }
    console.log(`OK  ${name} -> ${res.status}`);
  }finally{clearTimeout(timer)}
}

const checks=[
  ['Frontend HML',web,{}],
  ['API liveness',`${api}/health/live`,{json:true}],
  ['API readiness',`${api}/health`,{json:true}],
];
let failed=false;
for(const [name,url,opts] of checks){
  try{await check(name,url,opts)}catch(e){failed=true;console.error(`FAIL ${name} -> ${url}\n     ${e instanceof Error?e.message:e}`)}
}
if(failed)process.exit(1);
console.log('\nSmoke test HML concluído sem falhas.');
