import assert from 'node:assert/strict';
import test from 'node:test';
import {authGuardRedirect,isPublicAuthRoute,postLoginRoute,runLogin,runLogout} from '../src/modules/auth/authFlow.mjs';

const standardSession={token:'token',user:{id:'u1',name:'Usuário',email:'user@example.com'},tenant:{plan:'pro'}};

test('login comum estabelece sessão e direciona para /home',async()=>{
  let established;
  const route=await runLogin('user@example.com','secret',async(email,password)=>{
    assert.equal(email,'user@example.com');
    assert.equal(password,'secret');
    return standardSession;
  },session=>{established=session});
  assert.equal(route,'/home');
  assert.equal(established,standardSession);
});

test('login de plataforma direciona para /platform',async()=>{
  const response={...standardSession,platform:true};
  assert.equal(postLoginRoute(response),'/platform');
  assert.equal(await runLogin('admin@example.com','secret',async()=>response,()=>undefined),'/platform');
});

test('falha de login é propagada e não estabelece sessão',async()=>{
  let established=false;
  const expected=new Error('Credenciais inválidas');
  await assert.rejects(()=>runLogin('user@example.com','wrong',async()=>{throw expected},()=>{established=true}),expected);
  assert.equal(established,false);
});

test('rota autenticada sem sessão redireciona para login',()=>{
  assert.equal(authGuardRedirect(false,'/home'),'/');
  assert.equal(authGuardRedirect(false,'/projects/p1'),'/');
  assert.equal(authGuardRedirect(false,'/casa-nova'),'/');
  assert.equal(isPublicAuthRoute('/casa-nova'),false);
});

test('rotas públicas permanecem acessíveis sem sessão',()=>{
  for(const path of ['/','/register','/forgot-password','/reset-password','/invite/token-1','/p/public-token']){
    assert.equal(isPublicAuthRoute(path),true,path);
    assert.equal(authGuardRedirect(false,path),undefined,path);
  }
});

test('usuário autenticado no login ou cadastro segue para /home',()=>{
  assert.equal(authGuardRedirect(true,'/'),'/home');
  assert.equal(authGuardRedirect(true,'/register'),'/home');
  assert.equal(authGuardRedirect(true,'/account'),undefined);
});

test('sessão da plataforma permanece isolada das rotas de tenant',()=>{
  assert.equal(authGuardRedirect(true,'/',true),'/platform');
  assert.equal(authGuardRedirect(true,'/home',true),'/platform');
  assert.equal(authGuardRedirect(true,'/account',true),'/platform');
  assert.equal(authGuardRedirect(true,'/platform',true),undefined);
});

test('sessão de tenant não acessa o painel da plataforma',()=>{
  assert.equal(authGuardRedirect(true,'/platform',false),'/home');
});

test('logout confirmado encerra sessão antes de voltar ao login',async()=>{
  const calls=[];
  const result=await runLogout(async()=>{calls.push('confirm');return true},async()=>{calls.push('logout')},route=>calls.push(`replace:${route}`));
  assert.equal(result,true);
  assert.deepEqual(calls,['confirm','logout','replace:/']);
});

test('logout cancelado não encerra sessão nem navega',async()=>{
  const calls=[];
  const result=await runLogout(async()=>false,async()=>{calls.push('logout')},route=>calls.push(`replace:${route}`));
  assert.equal(result,false);
  assert.deepEqual(calls,[]);
});
