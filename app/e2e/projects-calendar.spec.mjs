import { expect, test } from '@playwright/test';
import { installDiagnostics, mockBaseApi } from './helpers/api.mjs';
import { loginAsUser } from './helpers/auth.mjs';
import {
  calendarEventToday,
  calendarVisitToday,
  mockCalendarApi,
  mockProjectsApi,
  projectAlpha,
  projectBeta,
} from './helpers/projects-calendar.mjs';

async function openProjects(page){
  await page.getByRole('button',{name:'Projetos'}).first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText('Acompanhe entregas, prazos e andamento da operação')).toBeVisible();
}

async function openCalendar(page){
  await page.getByRole('button',{name:'Agenda'}).first().click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByText('Compromissos, projetos e prazos em um único lugar')).toBeVisible();
}

test.beforeEach(async({page})=>{
  installDiagnostics(page);
  await mockBaseApi(page);
});

test('quadro de projetos exibe status, cliente e orçamento',async({page})=>{
  await mockProjectsApi(page,{initial:[projectAlpha,projectBeta]});
  await loginAsUser(page);
  await openProjects(page);

  await expect(page.getByText('Casamento Aurora',{exact:true})).toBeVisible();
  await expect(page.getByText('Evento Horizonte',{exact:true})).toBeVisible();
  await expect(page.getByText('OSO-001',{exact:true})).toBeVisible();
  await expect(page.getByText('2 projeto(s)')).toBeVisible();
});

test('busca de projetos filtra por cliente ou orçamento',async({page})=>{
  await mockProjectsApi(page,{initial:[projectAlpha,projectBeta]});
  await loginAsUser(page);
  await openProjects(page);

  await page.getByPlaceholder('Buscar projeto, cliente ou orçamento...').fill('Horizonte');
  await expect(page.getByText('Evento Horizonte',{exact:true})).toBeVisible();
  await expect(page.getByText('Casamento Aurora',{exact:true})).toHaveCount(0);
  await expect(page.getByText('1 projeto(s)')).toBeVisible();
});

test('filtro de atraso mantém somente projeto crítico',async({page})=>{
  await mockProjectsApi(page,{initial:[projectAlpha,projectBeta]});
  await loginAsUser(page);
  await openProjects(page);

  await page.getByText('Com atraso',{exact:true}).click();
  await expect(page.getByText('Casamento Aurora',{exact:true})).toBeVisible();
  await expect(page.getByText('Evento Horizonte',{exact:true})).toHaveCount(0);
  await expect(page.getByText('1 atrasada(s)',{exact:true})).toBeVisible();
});

test('abre detalhe do projeto e exibe tarefas e acompanhamento',async({page})=>{
  await mockProjectsApi(page,{initial:[projectAlpha,projectBeta]});
  await loginAsUser(page);
  await openProjects(page);

  await page.getByText('Casamento Aurora',{exact:true}).click();
  await expect(page).toHaveURL(/\/projects\/project-alpha$/);
  await expect(page.getByText('Planejamento / observações gerais')).toBeVisible();
  await expect(page.getByText('Confirmar flores',{exact:true})).toBeVisible();
  await expect(page.getByText('Cliente confirmou o cronograma.')).toBeVisible();
});

test('adiciona tarefa ao projeto e recarrega o detalhe',async({page})=>{
  const projects=await mockProjectsApi(page,{initial:[projectAlpha]});
  await loginAsUser(page);
  await openProjects(page);
  await page.getByText('Casamento Aurora',{exact:true}).click();
  await expect(page).toHaveURL(/\/projects\/project-alpha$/);

  await page.getByPlaceholder('Nova tarefa do projeto').fill('Separar materiais');
  await page.getByText('Adicionar tarefa',{exact:true}).click();

  await expect(page.getByText('Separar materiais',{exact:true})).toBeVisible();
  expect(projects[0].tasks.some(task=>task.title==='Separar materiais')).toBeTruthy();
});

test('agenda exibe compromissos do dia selecionado',async({page})=>{
  await mockCalendarApi(page,{initial:[calendarEventToday(),calendarVisitToday()]});
  await loginAsUser(page);
  await openCalendar(page);

  await expect(page.getByText('Reunião com cliente',{exact:true})).toBeVisible();
  await expect(page.getByText('Visita técnica',{exact:true})).toBeVisible();
  await expect(page.getByText('Escritório principal')).toBeVisible();
});

test('filtro da agenda exibe somente o tipo selecionado',async({page})=>{
  await mockCalendarApi(page,{initial:[calendarEventToday(),calendarVisitToday()]});
  await loginAsUser(page);
  await openCalendar(page);

  await page.getByText('Reunião',{exact:true}).first().click();
  await expect(page.getByText('Reunião com cliente',{exact:true})).toBeVisible();
  await expect(page.getByText('Visita técnica',{exact:true})).toHaveCount(0);
});

test('agenda apresenta estado vazio quando o dia não possui compromissos',async({page})=>{
  await mockCalendarApi(page,{initial:[]});
  await loginAsUser(page);
  await openCalendar(page);

  await expect(page.getByText('Nenhum compromisso neste dia.')).toBeVisible();
});

test('cria evento e atualiza a agenda',async({page})=>{
  const events=await mockCalendarApi(page,{initial:[]});
  await loginAsUser(page);
  await openCalendar(page);

  await page.getByRole('button',{name:'Novo evento'}).click();
  await expect(page.getByRole('heading',{name:'Novo evento',exact:true})).toBeVisible();
  await page.getByPlaceholder('Ex.: Visita técnica ao cliente').fill('Reunião de produção');
  await page.getByPlaceholder('Ex.: Residência do cliente').fill('Sala 2');
  await page.getByText('Criar evento',{exact:true}).click();

  await expect(page.getByText('Reunião de produção',{exact:true})).toBeVisible();
  await expect(page.getByText(/Sala 2/)).toBeVisible();
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('appointment');
});

test('validação impede criação de evento sem título',async({page})=>{
  const events=await mockCalendarApi(page,{initial:[]});
  await loginAsUser(page);
  await openCalendar(page);

  await page.getByRole('button',{name:'Novo evento'}).click();
  await page.getByText('Criar evento',{exact:true}).click();

  await expect(page.getByText('Informe o título do evento.')).toBeVisible();
  expect(events).toHaveLength(0);
});
