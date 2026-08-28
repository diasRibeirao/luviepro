import { expect, test } from '@playwright/test';
import { installDiagnostics, mockBaseApi, mockClientsApi } from './helpers/api.mjs';
import { loginAsUser, openClients } from './helpers/auth.mjs';

const maria={
  id:'client-1',
  type:'individual',
  name:'Maria Silva',
  document:'123.456.789-01',
  email:'maria.silva@example.com',
  phone:'(18) 99999-1111',
  city:'Penápolis',
  state:'SP',
  createdAt:'2026-08-01T12:00:00.000Z',
};

const acme={
  id:'client-2',
  type:'company',
  name:'Acme Eventos',
  legalName:'Acme Eventos Ltda',
  document:'12.345.678/0001-99',
  contactName:'João',
  email:'contato@acme.example.com',
  city:'São Paulo',
  state:'SP',
  createdAt:'2026-08-02T12:00:00.000Z',
};

test.beforeEach(async({page})=>{
  installDiagnostics(page);
  await mockBaseApi(page);
});

test('lista clientes autenticados',async({page})=>{
  await mockClientsApi(page,{initial:[maria,acme]});
  await loginAsUser(page);
  await openClients(page);

  await expect(page.getByText('Maria Silva')).toBeVisible();
  await expect(page.getByText('Acme Eventos')).toBeVisible();
  await expect(page.getByText('2 resultado(s)')).toBeVisible();
});

test('exibe estado vazio quando não existem clientes',async({page})=>{
  await mockClientsApi(page,{initial:[]});
  await loginAsUser(page);
  await openClients(page);

  await expect(page.getByText('Nenhum cliente encontrado')).toBeVisible();
  await expect(page.getByText('Revise a busca ou cadastre um novo cliente.')).toBeVisible();
});

test('pesquisa filtra a carteira de clientes',async({page})=>{
  await mockClientsApi(page,{initial:[maria,acme]});
  await loginAsUser(page);
  await openClients(page);

  await page.getByPlaceholder('Buscar por nome, CPF/CNPJ, cidade ou contato...').fill('Acme');
  await expect(page.getByText('Acme Eventos')).toBeVisible();
  await expect(page.getByText('Maria Silva')).toHaveCount(0);
  await expect(page.getByText('1 resultado(s)')).toBeVisible();
});

test('cadastro valida nome obrigatório antes de chamar a API',async({page})=>{
  await mockClientsApi(page,{initial:[]});
  await loginAsUser(page);
  await openClients(page);

  await page.getByRole('button',{name:'Novo cliente'}).click();
  await expect(page.getByRole('heading',{name:'Novo cliente',exact:true})).toBeVisible();
  await page.getByText('Cadastrar cliente',{exact:true}).click();

  await expect(page.getByText('Informe o nome completo do cliente.')).toBeVisible();
  await expect(page.getByText('Revise os campos destacados')).toBeVisible();
});

test('cadastra cliente e atualiza a listagem',async({page})=>{
  const clients=await mockClientsApi(page,{initial:[]});
  await loginAsUser(page);
  await openClients(page);

  await page.getByRole('button',{name:'Novo cliente'}).click();
  await page.getByLabel('Nome completo').fill('Ana Souza');
  await page.getByLabel('E-mail').fill('ana@example.com');
  await page.getByRole('textbox',{name:'Cidade',exact:true}).fill('Penápolis');
  await page.getByLabel('UF').fill('sp');
  await page.getByText('Cadastrar cliente',{exact:true}).click();

  await expect(page.getByText('Cliente cadastrado')).toBeVisible();
  await expect(page.getByText('Ana Souza')).toBeVisible();
  await expect(page.getByText('1 resultado(s)')).toBeVisible();
  expect(clients).toHaveLength(1);
  expect(clients[0].state).toBe('SP');
});

test('edita cliente existente e reflete os novos dados',async({page})=>{
  const clients=await mockClientsApi(page,{initial:[maria]});
  await loginAsUser(page);
  await openClients(page);

  await page.getByRole('button',{name:'Editar Maria Silva'}).click();
  await expect(page.getByText('Editar cliente',{exact:true})).toBeVisible();
  await page.getByLabel('Nome completo').fill('Maria Oliveira');
  await page.getByText('Salvar alterações',{exact:true}).click();

  await expect(page.getByText('Cliente atualizado')).toBeVisible();
  await expect(page.getByText('Maria Oliveira')).toBeVisible();
  await expect(page.getByText('Maria Silva')).toHaveCount(0);
  expect(clients[0].name).toBe('Maria Oliveira');
});

test('erro da API no cadastro mantém o modal e informa o usuário',async({page})=>{
  await mockClientsApi(page,{
    initial:[],
    createError:{status:409,message:'Já existe um cliente com este documento'},
  });
  await loginAsUser(page);
  await openClients(page);

  await page.getByRole('button',{name:'Novo cliente'}).click();
  await page.getByLabel('Nome completo').fill('Cliente Duplicado');
  await page.getByText('Cadastrar cliente',{exact:true}).click();

  await expect(page.getByText('Não foi possível salvar')).toBeVisible();
  await expect(page.getByText('Já existe um cliente com este documento')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Novo cliente',exact:true})).toBeVisible();
});
