export const defaultLoginResponse={
  token:'e2e-access-token',
  user:{id:'user-e2e',name:'Maria Organizer',email:'maria@example.com',role:'owner',permissions:[]},
  tenant:{plan:'pro'},
};

export function installDiagnostics(page){
  page.on('console',msg=>{
    if(['error','warning'].includes(msg.type())){
      const text=msg.text();
      // 401 é esperado em refresh sem sessão e login inválido.
      if(text.includes('status of 401'))return;
      console.log(`[browser:${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror',error=>{
    console.error(`[browser:pageerror] ${error.stack??error.message}`);
  });
  page.on('requestfailed',request=>{
    console.error(`[browser:requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText??'erro desconhecido'}`);
  });
}

function fulfillJson(route,status,body){
  return route.fulfill({
    status,
    contentType:'application/json',
    body:JSON.stringify(body),
  });
}

export async function mockBaseApi(page){
  await page.route(/\/api\/auth\/refresh\/?$/,route=>fulfillJson(route,401,{message:'Sessão ausente'}));
  await page.route(/\/api\/dashboard\/?$/,route=>fulfillJson(route,200,{
    clients:0,
    approvedRevenueCents:0,
    openPipelineCents:0,
    approvedQuotes:0,
    totalQuotes:0,
    pipeline:{draft:0,sent:0,approved:0,rejected:0},
    quotes:[],
    projects:[],
  }));
  await page.route(/\/api\/account\/?$/,route=>fulfillJson(route,200,{
    tenant:{plan:'pro'},
    usage:{clients:0},
    limit:{maxClients:50},
  }));
  await page.route(/\/api\/notifications\/unread-count\/?$/,route=>fulfillJson(route,200,{count:0}));
}

export async function mockLogin(page,{status=200,response=defaultLoginResponse}={}){
  await page.route(/\/api\/auth\/login\/?$/,route=>fulfillJson(
    route,
    status,
    status>=400?response:response,
  ));
}

export async function mockClientsApi(page,{initial=[],createError=null,updateError=null}={}){
  const clients=[...initial];

  await page.route(/\/api\/clients(?:\/[^/?#]+)?\/?$/,async route=>{
    const request=route.request();
    const method=request.method();
    const url=new URL(request.url());
    const parts=url.pathname.split('/').filter(Boolean);
    const id=parts.length>2?decodeURIComponent(parts.at(-1)):undefined;

    if(method==='GET'&&!id){
      return fulfillJson(route,200,clients);
    }

    if(method==='POST'&&!id){
      if(createError)return fulfillJson(route,createError.status??400,{message:createError.message??'Não foi possível cadastrar o cliente'});
      const payload=request.postDataJSON()??{};
      const created={
        id:`client-${clients.length+1}`,
        ...payload,
        createdAt:new Date().toISOString(),
      };
      clients.push(created);
      return fulfillJson(route,201,created);
    }

    if(method==='PATCH'&&id){
      if(updateError)return fulfillJson(route,updateError.status??400,{message:updateError.message??'Não foi possível atualizar o cliente'});
      const index=clients.findIndex(client=>client.id===id);
      if(index<0)return fulfillJson(route,404,{message:'Cliente não encontrado'});
      const payload=request.postDataJSON()??{};
      clients[index]={...clients[index],...payload};
      return fulfillJson(route,200,clients[index]);
    }

    return fulfillJson(route,405,{message:'Método não suportado pelo mock E2E'});
  });

  return clients;
}
