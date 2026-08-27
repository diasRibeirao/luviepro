const value=(env:NodeJS.ProcessEnv,key:string)=>String(env[key]??'').trim();
const isHttps=(input:string)=>/^https:\/\//i.test(input);

export function validateRuntimeConfig(env:NodeJS.ProcessEnv=process.env){
  if(env.NODE_ENV!=='production')return;
  const errors:string[]=[];
  const required=['DATABASE_URL','JWT_SECRET','JWT_REFRESH_SECRET','CORS_ORIGINS','APP_WEB_URL','MERCADO_PAGO_ACCESS_TOKEN','MERCADO_PAGO_WEBHOOK_URL','MERCADO_PAGO_WEBHOOK_SECRET','SMTP_HOST','SMTP_FROM'];
  for(const key of required)if(!value(env,key))errors.push(`${key} não configurado`);

  const jwt=value(env,'JWT_SECRET'),refresh=value(env,'JWT_REFRESH_SECRET');
  if(jwt&&jwt.length<32)errors.push('JWT_SECRET deve possuir pelo menos 32 caracteres');
  if(refresh&&refresh.length<32)errors.push('JWT_REFRESH_SECRET deve possuir pelo menos 32 caracteres');
  if(jwt&&refresh&&jwt===refresh)errors.push('JWT_SECRET e JWT_REFRESH_SECRET devem ser diferentes');

  const appWebUrl=value(env,'APP_WEB_URL');
  if(appWebUrl&&!isHttps(appWebUrl))errors.push('APP_WEB_URL deve utilizar HTTPS em produção');
  const origins=value(env,'CORS_ORIGINS').split(',').map(origin=>origin.trim()).filter(Boolean);
  if(origins.some(origin=>origin==='*'))errors.push('CORS_ORIGINS não pode utilizar curinga em produção');
  if(origins.some(origin=>!isHttps(origin)))errors.push('CORS_ORIGINS deve conter somente origens HTTPS em produção');
  if(appWebUrl&&origins.length&&!origins.includes(appWebUrl))errors.push('CORS_ORIGINS deve incluir APP_WEB_URL');

  const webhook=value(env,'MERCADO_PAGO_WEBHOOK_URL');
  if(webhook&&!isHttps(webhook))errors.push('MERCADO_PAGO_WEBHOOK_URL deve utilizar HTTPS');
  if(value(env,'MERCADO_PAGO_WEBHOOK_SECRET')&&value(env,'MERCADO_PAGO_WEBHOOK_SECRET').length<16)errors.push('MERCADO_PAGO_WEBHOOK_SECRET deve possuir pelo menos 16 caracteres');
  if(value(env,'MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS')==='true')errors.push('Webhooks sem assinatura não podem ser habilitados em produção');
  if(value(env,'MERCADO_PAGO_USE_SANDBOX')==='true')errors.push('MERCADO_PAGO_USE_SANDBOX deve estar desabilitado em produção');
  if(value(env,'ALLOW_DIRECT_PLAN_CHANGE')==='true')errors.push('ALLOW_DIRECT_PLAN_CHANGE deve estar desabilitado em produção');

  const redisUrl=value(env,'REDIS_URL'),redisPassword=value(env,'REDIS_PASSWORD');
  if(!redisUrl&&!redisPassword)errors.push('Configure REDIS_URL ou REDIS_PASSWORD para autenticar o Redis em produção');
  if(redisUrl&&!/^rediss?:\/\//i.test(redisUrl))errors.push('REDIS_URL deve utilizar redis:// ou rediss://');

  const smtpPort=value(env,'SMTP_PORT');if(smtpPort&&(!/^\d+$/.test(smtpPort)||Number(smtpPort)<1||Number(smtpPort)>65535))errors.push('SMTP_PORT inválida');
  const trustProxy=value(env,'TRUST_PROXY_HOPS');if(trustProxy&&!/^\d+$/.test(trustProxy))errors.push('TRUST_PROXY_HOPS deve ser um número inteiro não negativo');
  if(errors.length)throw new Error(`Configuração de produção inválida:\n- ${errors.join('\n- ')}`);
}
