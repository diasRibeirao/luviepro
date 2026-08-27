const value=(env:NodeJS.ProcessEnv,key:string)=>String(env[key]??'').trim();

export function validateRuntimeConfig(env:NodeJS.ProcessEnv=process.env){
  if(env.NODE_ENV!=='production')return;
  const errors:string[]=[];
  const required=['DATABASE_URL','JWT_SECRET','JWT_REFRESH_SECRET','CORS_ORIGINS','MERCADO_PAGO_ACCESS_TOKEN','MERCADO_PAGO_WEBHOOK_URL','MERCADO_PAGO_WEBHOOK_SECRET'];
  for(const key of required)if(!value(env,key))errors.push(`${key} não configurado`);
  const jwt=value(env,'JWT_SECRET'),refresh=value(env,'JWT_REFRESH_SECRET');
  if(jwt&&jwt.length<32)errors.push('JWT_SECRET deve possuir pelo menos 32 caracteres');
  if(refresh&&refresh.length<32)errors.push('JWT_REFRESH_SECRET deve possuir pelo menos 32 caracteres');
  if(jwt&&refresh&&jwt===refresh)errors.push('JWT_SECRET e JWT_REFRESH_SECRET devem ser diferentes');
  const origins=value(env,'CORS_ORIGINS').split(',').map(origin=>origin.trim()).filter(Boolean);
  if(origins.some(origin=>origin==='*'))errors.push('CORS_ORIGINS não pode utilizar curinga em produção');
  if(origins.some(origin=>!/^https:\/\//i.test(origin)))errors.push('CORS_ORIGINS deve conter somente origens HTTPS em produção');
  const webhook=value(env,'MERCADO_PAGO_WEBHOOK_URL');if(webhook&&!/^https:\/\//i.test(webhook))errors.push('MERCADO_PAGO_WEBHOOK_URL deve utilizar HTTPS');
  if(value(env,'MERCADO_PAGO_WEBHOOK_SECRET')&&value(env,'MERCADO_PAGO_WEBHOOK_SECRET').length<16)errors.push('MERCADO_PAGO_WEBHOOK_SECRET deve possuir pelo menos 16 caracteres');
  if(value(env,'MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS')==='true')errors.push('Webhooks sem assinatura não podem ser habilitados em produção');
  const trustProxy=value(env,'TRUST_PROXY_HOPS');if(trustProxy&&!/^\d+$/.test(trustProxy))errors.push('TRUST_PROXY_HOPS deve ser um número inteiro não negativo');
  if(errors.length)throw new Error(`Configuração de produção inválida:\n- ${errors.join('\n- ')}`);
}
