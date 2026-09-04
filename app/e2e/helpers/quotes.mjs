function fulfillJson(route,status,body){
  return route.fulfill({
    status,
    contentType:'application/json',
    body:JSON.stringify(body),
  });
}

export const quoteClient={
  id:'client-quote-1',
  name:'Empresa Aurora',
  city:'Penápolis',
  phone:'(18) 99999-1000',
  email:'contato@aurora.example.com',
};

export const quoteService={
  id:'service-quote-1',
  name:'Decoração Premium',
  code:'DEC-PREMIUM',
  description:'Projeto completo de decoração',
  active:true,
  defaultDays:2,
  people:2,
  dailyRateCents:50000,
  variableCostCents:10000,
  fixedCostCents:20000,
  safetyMarginBps:1000,
};

export const existingQuote={
  id:'quote-1',
  number:'OSO-001',
  status:'draft',
  createdAt:'2026-08-20T12:00:00.000Z',
  validUntil:null,
  totalCents:120000,
  finalTotalCents:120000,
  client:{name:'Empresa Aurora'},
};

function detailFrom(record){
  return {
    id:record.id,
    number:record.number,
    status:record.status,
    version:1,
    discountBps:0,
    validityDays:30,
    notes:'',
    publicToken:null,
    validUntil:record.validUntil??null,
    sentAt:null,
    clientDecision:null,
    clientDecisionName:null,
    finalTotalCents:record.finalTotalCents??record.totalCents,
    totalCents:record.totalCents,
    client:{name:record.client.name},
    items:[{
      id:'item-1',
      serviceName:'Decoração Premium',
      days:2,
      people:2,
      totalCents:record.totalCents,
      stages:[],
      configurationJson:{
        serviceId:quoteService.id,
        dailyRateCents:quoteService.dailyRateCents,
        variableCostCents:quoteService.variableCostCents,
        fixedCostCents:quoteService.fixedCostCents,
        safetyMarginBps:quoteService.safetyMarginBps,
      },
    }],
  };
}

export async function mockQuotesApi(page,{
  initial=[existingQuote],
  clients=[quoteClient],
  services=[quoteService],
  createError=null,
}={}){
  const quotes=[...initial];

  await page.route(/\/api\/clients\/?$/,route=>fulfillJson(route,200,clients));
  await page.route(/\/api\/services\/?$/,route=>fulfillJson(route,200,services));
  // O wizard atual também consulta produtos, mesmo quando o orçamento usado no cenário é de serviço.
  await page.route(/\/api\/products\/?$/,route=>{
    if(route.request().method()!=='GET')return fulfillJson(route,405,{message:'Método não suportado'});
    return fulfillJson(route,200,[]);
  });

  await page.route(/\/api\/pricing\/calculate\/?$/,route=>{
    const payload=route.request().postDataJSON()??{};
    const daily=Number(payload.dailyRateCents??0);
    const days=Math.max(1,Number(payload.days??1));
    const people=Math.max(1,Number(payload.people??1));
    const variable=Number(payload.variableCostCents??0)*days;
    const fixed=Number(payload.fixedCostCents??0);
    const labor=daily*days*people;
    const base=labor+variable+fixed;
    const margin=Math.round(base*Number(payload.safetyMarginBps??0)/10000);
    return fulfillJson(route,200,{
      dailyRateCents:daily,
      laborCents:labor,
      variableCents:variable,
      fixedCents:fixed,
      marginCents:margin,
      totalCents:base+margin,
    });
  });

  await page.route(/\/api\/quotes\/?$/,route=>{
    const method=route.request().method();
    if(method==='GET')return fulfillJson(route,200,quotes);

    if(method==='POST'){
      if(createError){
        return fulfillJson(
          route,
          createError.status??422,
          {message:createError.message??'Não foi possível criar o orçamento'},
        );
      }
      const payload=route.request().postDataJSON()??{};
      const client=clients.find(item=>item.id===payload.clientId)??clients[0];
      const created={
        id:`quote-${quotes.length+1}`,
        number:`OSO-${String(quotes.length+1).padStart(3,'0')}`,
        status:'draft',
        createdAt:new Date().toISOString(),
        validUntil:null,
        totalCents:154000,
        finalTotalCents:154000,
        client:{name:client?.name??'Cliente'},
      };
      quotes.push(created);
      return fulfillJson(route,201,detailFrom(created));
    }

    return fulfillJson(route,405,{message:'Método não suportado pelo mock de orçamentos'});
  });

  await page.route(/\/api\/quotes\/([^/?#]+)\/versions\/?$/,route=>fulfillJson(route,200,[
    {id:'version-1',version:1,createdAt:'2026-08-20T12:00:00.000Z'},
  ]));
  await page.route(/\/api\/quotes\/([^/?#]+)\/timeline\/?$/,route=>fulfillJson(route,200,[
    {type:'created',at:'2026-08-20T12:00:00.000Z',title:'Orçamento criado'},
  ]));
  await page.route(/\/api\/quotes\/([^/?#]+)\/?$/,route=>{
    const id=decodeURIComponent(new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1));
    const quote=quotes.find(item=>item.id===id);
    if(!quote)return fulfillJson(route,404,{message:'Orçamento não encontrado'});
    return fulfillJson(route,200,detailFrom(quote));
  });

  return quotes;
}
