import { expect, test } from '@playwright/test';
import { installDiagnostics, mockBaseApi } from './helpers/api.mjs';
import { loginAsUser } from './helpers/auth.mjs';
import { existingQuote, mockQuotesApi } from './helpers/quotes.mjs';

async function openQuotes(page){
  await page.getByRole('button',{name:'Orçamentos'}).first().click();
  await expect(page).toHaveURL(/\/quotes$/);
  await expect(page.getByText('Acompanhe propostas, valores e andamento comercial.')).toBeVisible();
}

async function openWizard(page){
  await page.getByRole('button',{name:'Novo orçamento'}).click();
  await expect(page.getByText('Selecionar cliente',{exact:true})).toBeVisible();
}

async function advanceWizardToReview(page){
  await openWizard(page);
  await expect(page.getByText('Empresa Aurora',{exact:true})).toBeVisible();
  await page.getByText('Empresa Aurora',{exact:true}).click();
  await page.getByText('Próximo',{exact:true}).click();

  await expect(page.getByText('Adicionar serviços',{exact:true})).toBeVisible();
  await page.getByText('Decoração Premium',{exact:true}).click();
  await page.getByText('Próximo',{exact:true}).click();

  await expect(page.getByText('Calcular orçamento',{exact:true})).toBeVisible();
  await expect(page.getByText('Total do orçamento',{exact:true})).toBeVisible();
  await page.getByText('Próximo',{exact:true}).click();

  await expect(page.getByText('Revisão Final',{exact:true})).toBeVisible();
  await expect(page.getByText('Empresa Aurora',{exact:true})).toBeVisible();
  await expect(page.getByText('Decoração Premium',{exact:true})).toBeVisible();
}

test.beforeEach(async({page})=>{
  installDiagnostics(page);
  await mockBaseApi(page);
});

test('lista orçamentos autenticados',async({page})=>{
  await mockQuotesApi(page,{initial:[existingQuote]});
  await loginAsUser(page);
  await openQuotes(page);

  await expect(page.getByText('ORC-001')).toBeVisible();
  await expect(page.getByText('Empresa Aurora')).toBeVisible();
  await expect(page.getByText('1 resultado(s)')).toBeVisible();
});

test('busca filtra orçamento pelo número ou cliente',async({page})=>{
  await mockQuotesApi(page,{
    initial:[
      existingQuote,
      {
        ...existingQuote,
        id:'quote-2',
        number:'ORC-002',
        client:{name:'Cliente Horizonte'},
        createdAt:'2026-08-21T12:00:00.000Z',
      },
    ],
  });
  await loginAsUser(page);
  await openQuotes(page);

  await page.getByPlaceholder('Buscar orçamento ou cliente...').fill('Horizonte');
  await expect(page.getByText('ORC-002')).toBeVisible();
  await expect(page.getByText('Cliente Horizonte')).toBeVisible();
  await expect(page.getByText('ORC-001')).toHaveCount(0);
  await expect(page.getByText('1 resultado(s)')).toBeVisible();
});

test('wizard carrega cliente e serviço disponíveis',async({page})=>{
  await mockQuotesApi(page,{initial:[]});
  await loginAsUser(page);
  await openQuotes(page);
  await openWizard(page);

  await expect(page.getByText('Empresa Aurora',{exact:true})).toBeVisible();
  await page.getByText('Próximo',{exact:true}).click();
  await expect(page.getByText('Decoração Premium',{exact:true})).toBeVisible();
  await expect(page.getByText('DEC-PREMIUM',{exact:true})).toBeVisible();
});

test('cria orçamento pelo wizard e atualiza a lista',async({page})=>{
  const quotes=await mockQuotesApi(page,{initial:[]});
  await loginAsUser(page);
  await openQuotes(page);
  await advanceWizardToReview(page);

  await page.getByText('Salvar orçamento',{exact:true}).click();

  await expect(page.getByText('Orçamento criado')).toBeVisible();
  await expect(page.getByText('ORC-001')).toBeVisible();
  await expect(page.locator('#root').getByText('Empresa Aurora',{exact:true}).first()).toBeVisible();
  expect(quotes).toHaveLength(1);
  expect(quotes[0].status).toBe('draft');
});

test('erro ao criar orçamento mantém revisão aberta e informa usuário',async({page})=>{
  await mockQuotesApi(page,{
    initial:[],
    createError:{status:422,message:'Não foi possível calcular os itens do orçamento'},
  });
  await loginAsUser(page);
  await openQuotes(page);
  await advanceWizardToReview(page);

  await page.getByText('Salvar orçamento',{exact:true}).click();

  await expect(page.getByText('Erro ao criar orçamento')).toBeVisible();
  await expect(page.getByText('Não foi possível calcular os itens do orçamento')).toBeVisible();
  await expect(page.getByText('Revisão Final',{exact:true})).toBeVisible();
});

test('abre detalhe de orçamento pela listagem',async({page})=>{
  await mockQuotesApi(page,{initial:[existingQuote]});
  await loginAsUser(page);
  await openQuotes(page);

  await page.getByText('ORC-001',{exact:true}).first().click();
  await expect(page).toHaveURL(/\/quote\/quote-1$/);
  await expect(page.getByText('Visualizar proposta / PDF',{exact:true})).toBeVisible();
  await expect(page.getByText('Empresa Aurora',{exact:true}).last()).toBeVisible();
});
