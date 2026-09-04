function fulfillJson(route,status,body){
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
}

export const businessAccount={
  tenant:{
    name:'Luvie Eventos',plan:'business',responsibleName:'Maria Organizer',
    phone:'(18) 99999-0000',contactEmail:'contato@luvie.test',
    siteUrl:'https://luvie.test',instagram:'@luvie',
    legalName:'Luvie Eventos Ltda',document:'12.345.678/0001-90',
    zipCode:'16300-000',addressLine:'Rua Central',addressNumber:'100',
    neighborhood:'Centro',city:'Penápolis',state:'SP',
    proposalValidityDays:30,proposalPaymentTerms:'50% na entrada',
    proposalFooter:'Obrigada pela preferência.',pixKey:'pix@luvie.test',
    primaryColor:'#245B43',secondaryColor:'#C9A84C',proposalText:'Proposta comercial',
  },
  currentUser:{id:'user-e2e',name:'Maria Organizer',email:'maria@example.com',role:'owner',active:true},
  features:{customPdf:true,logoPdf:true,customRoles:true,auditAccess:true},
  usage:{clients:12,quotes:8,users:2},
  limit:{maxClients:-1,maxQuotesPerMonth:-1,maxUsers:10},
  entitlements:{remaining:{clients:null,quotes:null,users:8}},
};

export const settingsUsers=[
  {id:'owner-1',name:'Maria Organizer',email:'maria@example.com',role:'owner',active:true},
  {id:'user-2',name:'João Comercial',email:'joao@luvie.test',role:'commercial',active:true},
];

export const accessProfiles=[
  {id:'profile-1',name:'Produção',description:'Equipe de produção',permissions:['projects.read','projects.write','calendar.read'],active:true},
];

export async function mockSettingsApi(page,{account=businessAccount}={}){
  let accountState=structuredClone(account);
  const users=settingsUsers.map(x=>({...x}));
  const invites=[];
  const profiles=accessProfiles.map(x=>({...x,permissions:[...(x.permissions??[])]}));

  await page.route(/\/api\/account\/?$/,route=>fulfillJson(route,200,accountState));

  // Configurações carrega catálogos auxiliares de Produtos e Financeiro em paralelo.
  // Nos E2E eles precisam ser interceptados para a inicialização da tela não falhar.
  await page.route(/\/api\/products\/units\/?$/,route=>fulfillJson(route,200,[]));
  await page.route(/\/api\/products\/categories\/?$/,route=>fulfillJson(route,200,[]));
  await page.route(/\/api\/finance\/categories\/manage\/?$/,route=>fulfillJson(route,200,[]));
  await page.route(/\/api\/finance\/payment-methods\/manage\/?$/,route=>fulfillJson(route,200,[]));

  await page.route(/\/api\/account\/settings\/?$/,route=>{
    if(route.request().method()!=='PATCH')return fulfillJson(route,405,{message:'Método não suportado'});
    const payload=route.request().postDataJSON()??{};
    accountState={...accountState,tenant:{...accountState.tenant,...payload}};
    return fulfillJson(route,200,accountState.tenant);
  });

  await page.route(/\/api\/account\/password\/?$/,route=>{
    if(route.request().method()!=='PATCH')return fulfillJson(route,405,{message:'Método não suportado'});
    return fulfillJson(route,200,{ok:true});
  });

  await page.route(/\/api\/users\/?$/,route=>{
    const method=route.request().method();
    if(method==='GET')return fulfillJson(route,200,users);
    if(method==='POST'){
      const payload=route.request().postDataJSON()??{};
      const invite={
        id:`invite-${invites.length+1}`,name:payload.name,email:payload.email,
        role:payload.role,status:'pending',expiresAt:'2099-01-01T12:00:00.000Z',
        inviteUrl:`https://e2e.invalid/invite/token-${invites.length+1}`,
        delivery:{sent:true},
      };
      invites.push(invite);
      return fulfillJson(route,201,invite);
    }
    return fulfillJson(route,405,{message:'Método não suportado'});
  });

  await page.route(/\/api\/users\/([^/?#]+)\/?$/,route=>{
    const id=new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
    const user=users.find(x=>x.id===id);
    if(!user)return fulfillJson(route,404,{message:'Usuário não encontrado'});
    if(route.request().method()==='PATCH'){
      Object.assign(user,route.request().postDataJSON()??{});
      return fulfillJson(route,200,user);
    }
    return fulfillJson(route,405,{message:'Método não suportado'});
  });

  await page.route(/\/api\/user-invitations\/?$/,route=>fulfillJson(route,200,invites));

  await page.route(/\/api\/user-invitations\/([^/?#]+)\/(resend|cancel)\/?$/,route=>{
    const parts=new URL(route.request().url()).pathname.split('/').filter(Boolean);
    const id=parts.at(-2),action=parts.at(-1);
    const invite=invites.find(x=>x.id===id);
    if(!invite)return fulfillJson(route,404,{message:'Convite não encontrado'});
    if(action==='cancel'){invite.status='cancelled';return fulfillJson(route,200,invite);}
    return fulfillJson(route,200,{...invite,inviteUrl:`https://e2e.invalid/invite/renewed-${id}`,delivery:{sent:true}});
  });

  await page.route(/\/api\/access-profiles\/?$/,route=>{
    const method=route.request().method();
    if(method==='GET')return fulfillJson(route,200,profiles);
    if(method==='POST'){
      const payload=route.request().postDataJSON()??{};
      const created={id:`profile-${profiles.length+1}`,active:true,...payload};
      profiles.push(created);return fulfillJson(route,201,created);
    }
    return fulfillJson(route,405,{message:'Método não suportado'});
  });

  await page.route(/\/api\/access-profiles\/([^/?#]+)\/?$/,route=>{
    const id=new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
    const profile=profiles.find(x=>x.id===id);
    if(!profile)return fulfillJson(route,404,{message:'Perfil não encontrado'});
    if(route.request().method()==='PATCH'){
      Object.assign(profile,route.request().postDataJSON()??{});
      return fulfillJson(route,200,profile);
    }
    return fulfillJson(route,405,{message:'Método não suportado'});
  });

  await page.route(/\/api\/audit(?:\?.*)?$/,route=>fulfillJson(route,200,{items:[],actors:[]}));

  return {users,invites,profiles,get account(){return accountState}};
}

export const planLimits=[
  {plan:'starter',monthlyPriceCents:4990,quarterlyPriceCents:13470,semiannualPriceCents:25440,annualPriceCents:47900,maxClients:30,maxQuotesPerMonth:10,maxUsers:1},
  {plan:'pro',monthlyPriceCents:9990,quarterlyPriceCents:26970,semiannualPriceCents:50940,annualPriceCents:95900,maxClients:150,maxQuotesPerMonth:50,maxUsers:3},
  {plan:'business',monthlyPriceCents:17990,quarterlyPriceCents:48570,semiannualPriceCents:91740,annualPriceCents:172700,maxClients:-1,maxQuotesPerMonth:-1,maxUsers:10},
];

export function approvedPayment(){
  return {id:'pay-approved',plan:'business',period:'monthly',billingAction:'renewal',status:'approved',amountCents:17990,createdAt:'2026-08-20T12:00:00.000Z',providerPaymentId:'mp-approved'};
}
export function rejectedPayment(){
  return {id:'pay-rejected',plan:'business',period:'monthly',billingAction:'renewal',status:'rejected',amountCents:17990,createdAt:'2026-08-21T12:00:00.000Z',providerPaymentId:'mp-rejected',providerStatusDetail:'cc_rejected_insufficient_amount'};
}
export function pendingPayment(){
  return {id:'pay-pending',plan:'business',period:'monthly',billingAction:'renewal',status:'pending',amountCents:17990,createdAt:new Date().toISOString(),providerPaymentId:'mp-pending'};
}

export async function mockBillingApi(page,{payments=[approvedPayment(),rejectedPayment(),pendingPayment()],checkoutError=null}={}){
  const history=payments.map(x=>({...x}));
  await page.route(/\/api\/plans\/?$/,route=>fulfillJson(route,200,planLimits));
  await page.route(/\/api\/billing\/payments\/?$/,route=>fulfillJson(route,200,history));

  await page.route(/\/api\/billing\/checkout\/?$/,route=>{
    if(checkoutError)return fulfillJson(route,checkoutError.status??422,{message:checkoutError.message??'Pagamento indisponível'});
    const payload=route.request().postDataJSON()??{};
    return fulfillJson(route,201,{
      checkoutUrl:'https://checkout.e2e.invalid/session',
      reused:false,
      billingAction:payload.plan==='starter'?'downgrade':'renewal',
    });
  });

  await page.route(/\/api\/billing\/payments\/([^/?#]+)\/reconcile\/?$/,route=>{
    const parts=new URL(route.request().url()).pathname.split('/').filter(Boolean);
    const id=parts.at(-2);
    const payment=history.find(x=>x.id===id);
    if(payment)payment.status='approved';
    return fulfillJson(route,200,{status:'approved'});
  });

  await page.route(/\/api\/billing\/mercado-pago\/return\/([^/?#]+)\/reconcile\/?$/,route=>fulfillJson(route,200,{status:'approved'}));
  return history;
}

export const projectStatusItems=[
  {id:'status-1',key:'scheduled',name:'Agendados',color:'#C9A84C',active:true,position:1},
  {id:'status-2',key:'in_progress',name:'Em andamento',color:'#2F6B4F',active:true,position:2},
  {id:'status-3',key:'completed',name:'Concluídos',color:'#6F8C78',active:true,position:3},
];

export async function mockProjectStatusesCrud(page){
  const statuses=projectStatusItems.map(x=>({...x}));
  await page.route(/\/api\/project-statuses(?:\/[^/?#]+)?\/?$/,route=>{
    const method=route.request().method();
    const parts=new URL(route.request().url()).pathname.split('/').filter(Boolean);
    const id=parts.length>2?parts.at(-1):undefined;
    if(method==='GET'&&!id)return fulfillJson(route,200,statuses);
    if(method==='POST'&&!id){
      const payload=route.request().postDataJSON()??{};
      const created={id:`status-${statuses.length+1}`,key:`custom_${statuses.length+1}`,active:true,position:statuses.length+1,...payload};
      statuses.push(created);return fulfillJson(route,201,created);
    }
    const item=statuses.find(x=>x.id===id);
    if(!item)return fulfillJson(route,404,{message:'Status não encontrado'});
    if(method==='PATCH'){Object.assign(item,route.request().postDataJSON()??{});return fulfillJson(route,200,item);}
    if(method==='DELETE'){statuses.splice(statuses.indexOf(item),1);return route.fulfill({status:204,body:''});}
    return fulfillJson(route,405,{message:'Método não suportado'});
  });
  return statuses;
}
