import { expect, test } from '@playwright/test';

const loginResponse={
  token:'e2e-access-token',
  user:{id:'user-e2e',name:'Maria Organizer',email:'maria@example.com',role:'owner',permissions:[]},
  tenant:{plan:'pro'},
};

function installDiagnostics(page){
  page.on('console',msg=>{
    if(['error','warning'].includes(msg.type())){
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror',error=>{
    console.error(`[browser:pageerror] ${error.stack??error.message}`);
  });
  page.on('requestfailed',request=>{
    console.error(`[browser:requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText??'erro desconhecido'}`);
  });
}

async function mockBaseApi(page){
  await page.route(/\/api\/auth\/refresh\/?$/,route=>route.fulfill({
    status:401,
    contentType:'application/json',
    body:JSON.stringify({message:'Sessão ausente'}),
  }));
  await page.route(/\/api\/dashboard\/?$/,route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
      clients:0,
      approvedRevenueCents:0,
      openPipelineCents:0,
      approvedQuotes:0,
      totalQuotes:0,
      pipeline:{draft:0,sent:0,approved:0,rejected:0},
      quotes:[],
      projects:[],
    }),
  }));
  await page.route(/\/api\/account\/?$/,route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({tenant:{plan:'pro'},usage:{clients:0},limit:{maxClients:50}}),
  }));
  await page.route(/\/api\/notifications\/unread-count\/?$/,route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({count:0}),
  }));
}

async function waitForLogin(page){
  try{
    await expect(page.getByText('Bem-vinda de volta')).toBeVisible({timeout:8_000});
  }catch(error){
    const snapshot=(await page.locator('body').innerText().catch(()=>'' )).slice(0,1500);
    console.error(`[E2E] URL atual: ${page.url()}`);
    console.error(`[E2E] Título: ${await page.title().catch(()=>'(indisponível)')}`);
    console.error(`[E2E] BODY (até 1500 chars):\n${snapshot||'(vazio)'}`);
    throw error;
  }
}

test.beforeEach(async({page})=>{
  installDiagnostics(page);
  await mockBaseApi(page);
});

test('rota autenticada sem sessão retorna ao login',async({page})=>{
  await page.goto('/home',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await expect(page).toHaveURL(/\/$/);
});

test('login inválido apresenta o erro retornado pela API',async({page})=>{
  await page.route(/\/api\/auth\/login\/?$/,route=>route.fulfill({
    status:401,
    contentType:'application/json',
    body:JSON.stringify({message:'E-mail ou senha inválidos'}),
  }));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await page.getByPlaceholder('seu@email.com').fill('maria@example.com');
  await page.getByPlaceholder('Sua senha').fill('senha-incorreta');
  await page.getByText('Entrar',{exact:true}).click();
  await expect(page.getByText(/E-mail ou senha inválidos/)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('login válido abre o dashboard',async({page})=>{
  await page.route(/\/api\/auth\/login\/?$/,route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify(loginResponse),
  }));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await page.getByPlaceholder('seu@email.com').fill('maria@example.com');
  await page.getByPlaceholder('Sua senha').fill('senha-valida');
  await page.getByText('Entrar',{exact:true}).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Olá, Maria')).toBeVisible();
});

test('links de recuperação e cadastro navegam para as rotas públicas',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await page.getByText('Esqueceu a senha?').click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await page.getByText(/Criar conta grátis/).click();
  await expect(page).toHaveURL(/\/register$/);
});
