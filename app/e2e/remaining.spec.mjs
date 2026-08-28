import { expect,test } from '@playwright/test';
import { defaultLoginResponse,installDiagnostics,mockBaseApi } from './helpers/api.mjs';
import { loginAsUser } from './helpers/auth.mjs';
import {
  businessAccount,mockBillingApi,mockProjectStatusesCrud,mockSettingsApi,
  pendingPayment,rejectedPayment,
} from './helpers/remaining.mjs';

async function openAuthenticatedRoute(page,path){
  const routes={
    '/account':()=>page.getByRole('button',{name:'Minha conta',exact:true}).click(),
    '/settings':()=>page.getByRole('button',{name:'Configurações',exact:true}).click(),
    '/project-statuses':()=>page.getByRole('button',{name:'Status dos projetos',exact:true}).click(),
    '/plans':async()=>{
      const planButton=page.getByRole('button',{name:/^Plano .+ utilizados$/}).first();
      await expect(planButton).toBeVisible();
      await planButton.click();
    },
  };
  const navigate=routes[path];
  if(!navigate)throw new Error(`Rota E2E sem navegação interna configurada: ${path}`);
  await navigate();
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`));
}

async function expectAnyVisible(locator,label){
  const count=await locator.count();
  for(let index=0;index<count;index++){
    if(await locator.nth(index).isVisible())return;
  }
  throw new Error(`Nenhuma ocorrência visível encontrada para: ${label}`);
}

test.beforeEach(async({page})=>{
  installDiagnostics(page);
  await mockBaseApi(page);
});

test('minha conta exibe empresa, assinatura e perfil de acesso',async({page})=>{
  await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/account');
  await expect(page.getByText('Luvie Eventos',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('BUSINESS',{exact:true}).last()).toBeVisible();
  await expect(page.getByText(/Proprietário na empresa Luvie Eventos/)).toBeVisible();
});

test('configurações business exibem usuários, perfis e auditoria',async({page})=>{
  await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await expect(page.getByText('Usuários e acessos',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Perfis e permissões',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Auditoria',{exact:true}).first()).toBeVisible();
});

test('salva dados principais da empresa',async({page})=>{
  const state=await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');

  await page.getByRole('textbox').first().fill('Luvie Produções');
  await page.getByText('Salvar alterações',{exact:true}).click();
  await expect(page.getByText('Configurações salvas',{exact:true})).toBeVisible();
  expect(state.account.tenant.name).toBe('Luvie Produções');
});

test('usuários e acessos lista pessoas licenciadas',async({page})=>{
  await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await page.getByText('Usuários e acessos',{exact:true}).first().click();
  await expect(page.getByText('João Comercial',{exact:true})).toBeVisible();
  await expect(page.getByText('2 / 10',{exact:true})).toBeVisible();
});

test('envia convite de usuário válido',async({page})=>{
  const state=await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await page.getByText('Usuários e acessos',{exact:true}).first().click();

  const fields=page.getByRole('textbox');
  await fields.nth(0).fill('Ana Financeiro');
  await fields.nth(1).fill('ana@luvie.test');
  await page.getByText('Financeiro',{exact:true}).first().click();
  await page.getByText('Enviar convite',{exact:true}).click();

  await expect(page.getByText('Convite enviado',{exact:true})).toBeVisible();
  await expect(page.getByText('Ana Financeiro',{exact:true})).toBeVisible();
  expect(state.invites).toHaveLength(1);
});

test('perfil personalizado business é exibido',async({page})=>{
  await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await page.getByText('Perfis e permissões',{exact:true}).first().click();
  await expect(page.getByText('Produção',{exact:true}).last()).toBeVisible();
  await expect(page.getByText(/3 permissões/)).toBeVisible();
});

test('cria perfil personalizado com permissão de dashboard',async({page})=>{
  const state=await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await page.getByText('Perfis e permissões',{exact:true}).first().click();

  await page.getByRole('textbox').first().fill('Gestão');
  await page.getByText('dashboard.read',{exact:true}).locator('..').click();
  await page.getByText('Criar perfil',{exact:true}).click();

  await expect(page.getByText('Perfil criado',{exact:true})).toBeVisible();
  await expect(page.getByText('Gestão',{exact:true})).toBeVisible();
  expect(state.profiles.some(x=>x.name==='Gestão')).toBeTruthy();
});

test('segurança altera senha quando confirmação confere',async({page})=>{
  await mockSettingsApi(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/settings');
  await page.getByText('Segurança',{exact:true}).first().click();

  const textboxes=page.getByRole('textbox');
  await textboxes.nth(0).fill('senha-atual');
  await textboxes.nth(1).fill('nova-senha-123');
  await textboxes.nth(2).fill('nova-senha-123');
  await page.getByText('Alterar senha',{exact:true}).click();
  await expect(page.getByText('Senha alterada',{exact:true})).toBeVisible();
});

test('plano starter não exibe perfis personalizados nem auditoria para proprietário',async({page})=>{
  const starter={
    ...businessAccount,
    tenant:{...businessAccount.tenant,plan:'starter'},
    features:{customPdf:false,logoPdf:true,customRoles:false,auditAccess:false},
    limit:{maxClients:30,maxQuotesPerMonth:10,maxUsers:1},
  };
  await mockSettingsApi(page,{account:starter});
  const login={...defaultLoginResponse,tenant:{plan:'starter'}};
  await loginAsUser(page,login);
  await openAuthenticatedRoute(page,'/settings');

  await expect(page.getByText('Usuários e acessos',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Perfis e permissões',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Auditoria',{exact:true})).toHaveCount(0);
});

test('status de projetos lista colunas configuradas',async({page})=>{
  await mockProjectStatusesCrud(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/project-statuses');
  await expect(page.getByText('Agendados',{exact:true})).toBeVisible();
  await expect(page.getByText('Em andamento',{exact:true})).toBeVisible();
  await expect(page.getByText('Concluídos',{exact:true})).toBeVisible();
});

test('cria novo status de projeto',async({page})=>{
  const statuses=await mockProjectStatusesCrud(page);
  await loginAsUser(page);
  await openAuthenticatedRoute(page,'/project-statuses');
  await page.getByRole('button',{name:'Novo status'}).click();
  await page.getByPlaceholder('Ex.: Aguardando cliente').fill('Aguardando fornecedor');
  await page.getByText('Salvar status',{exact:true}).click();
  await expect(page.getByText('Status salvo',{exact:true})).toBeVisible();
  await expect(page.getByText('Aguardando fornecedor',{exact:true})).toBeVisible();
  expect(statuses.some(x=>x.name==='Aguardando fornecedor')).toBeTruthy();
});

test('planos exibem três opções e plano atual',async({page})=>{
  await mockSettingsApi(page);
  await mockBillingApi(page);
  await loginAsUser(page,{...defaultLoginResponse,tenant:{plan:'business'}});
  await openAuthenticatedRoute(page,'/plans');
  await expect(page.getByText('Starter',{exact:true}).last()).toBeVisible();
  await expect(page.getByText('Pro',{exact:true}).last()).toBeVisible();
  await expect(page.getByText('Business',{exact:true}).last()).toBeVisible();
  await expect(page.getByText('PLANO ATUAL',{exact:true})).toBeVisible();
});

test('billing exibe pagamentos aprovados, recusados e pendentes',async({page})=>{
  await mockSettingsApi(page);
  await mockBillingApi(page);
  await loginAsUser(page,{...defaultLoginResponse,tenant:{plan:'business'}});
  await openAuthenticatedRoute(page,'/plans');
  await expect(page.getByText('Histórico de pagamentos',{exact:true})).toBeVisible();
  await expectAnyVisible(page.getByText(/· Aprovado(?: ·|$)/),'Aprovado');
  await expectAnyVisible(page.getByText(/· Recusado(?: ·|$)/),'Recusado');
  await expectAnyVisible(page.getByText(/· Pendente(?: ·|$)/),'Pendente');
});

test('pagamento recusado oferece nova tentativa',async({page})=>{
  await mockSettingsApi(page);
  await mockBillingApi(page,{payments:[rejectedPayment()]});
  await loginAsUser(page,{...defaultLoginResponse,tenant:{plan:'business'}});
  await openAuthenticatedRoute(page,'/plans');
  await expect(page.getByText('Tentar novamente',{exact:true})).toBeVisible();
  await expect(page.getByText(/Limite ou saldo insuficiente/)).toBeVisible();
});

test('pagamento pendente permite atualizar status',async({page})=>{
  const history=await mockBillingApi(page,{payments:[pendingPayment()]});
  await mockSettingsApi(page);
  await loginAsUser(page,{...defaultLoginResponse,tenant:{plan:'business'}});
  await openAuthenticatedRoute(page,'/plans');
  await page.getByText('Atualizar status',{exact:true}).click();
  await expect(page.getByText('Status atualizado',{exact:true})).toBeVisible();
  expect(history[0].status).toBe('approved');
});

test('erro no checkout é informado ao usuário',async({page})=>{
  await mockSettingsApi(page);
  await mockBillingApi(page,{payments:[],checkoutError:{status:422,message:'Checkout temporariamente indisponível'}});
  await loginAsUser(page,{...defaultLoginResponse,tenant:{plan:'business'}});
  await openAuthenticatedRoute(page,'/plans');
  await page.getByText('Mudar para pro',{exact:true}).click();
  await expect(page.getByText('Checkout temporariamente indisponível',{exact:true})).toBeVisible();
});
