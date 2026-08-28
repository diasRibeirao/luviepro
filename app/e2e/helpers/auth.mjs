import { expect } from '@playwright/test';
import { defaultLoginResponse, mockLogin } from './api.mjs';

export async function waitForLogin(page){
  await expect(page.getByText('Bem-vinda de volta')).toBeVisible({timeout:8_000});
}

export async function loginAsUser(page,response=defaultLoginResponse){
  await mockLogin(page,{response});
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await waitForLogin(page);
  await page.getByPlaceholder('seu@email.com').fill(response.user.email);
  await page.getByPlaceholder('Sua senha').fill('senha-e2e');
  await page.getByText('Entrar',{exact:true}).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText(`Olá, ${response.user.name.split(' ')[0]}`)).toBeVisible();
}

export async function openClients(page){
  await page.getByRole('button',{name:'Clientes'}).first().click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByText('Gerencie pessoas, empresas e contatos da sua carteira')).toBeVisible();
}
