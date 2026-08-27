import { validateRuntimeConfig } from './runtime-config';

const valid={NODE_ENV:'production',DATABASE_URL:'postgresql://db',JWT_SECRET:'a'.repeat(32),JWT_REFRESH_SECRET:'b'.repeat(32),CORS_ORIGINS:'https://app.luviepro.com.br',MERCADO_PAGO_ACCESS_TOKEN:'token',MERCADO_PAGO_WEBHOOK_URL:'https://api.luviepro.com.br/api/billing/webhooks/mercado-pago',MERCADO_PAGO_WEBHOOK_SECRET:'c'.repeat(24),MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS:'false',TRUST_PROXY_HOPS:'1'} as NodeJS.ProcessEnv;

describe('validateRuntimeConfig',()=>{
  it('não exige configuração externa no desenvolvimento',()=>expect(()=>validateRuntimeConfig({NODE_ENV:'development'})).not.toThrow());
  it('aceita configuração segura de produção',()=>expect(()=>validateRuntimeConfig(valid)).not.toThrow());
  it('rejeita segredos iguais, CORS HTTP e webhook sem assinatura',()=>expect(()=>validateRuntimeConfig({...valid,JWT_REFRESH_SECRET:valid.JWT_SECRET,CORS_ORIGINS:'http://localhost:8081',MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS:'true'})).toThrow(/devem ser diferentes[\s\S]*somente origens HTTPS[\s\S]*sem assinatura/));
  it('lista variáveis obrigatórias ausentes',()=>expect(()=>validateRuntimeConfig({NODE_ENV:'production'})).toThrow(/DATABASE_URL não configurado/));
});
