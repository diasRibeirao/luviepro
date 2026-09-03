import { Injectable, Logger } from '@nestjs/common';
import { escapeHtml } from './security/html';

type MailMessage={from:string;to:string;subject:string;text:string;html:string};
type MailTransport={sendMail(message:MailMessage):Promise<unknown>;verify?():Promise<unknown>};
type NodemailerModule={createTransport(options:Record<string,unknown>):MailTransport};
const nodemailer=require('nodemailer') as NodemailerModule;

export type MailProvider='smtp'|'resend';
export type MailDelivery={sent:true}|{sent:false;reason:'not_configured'|'send_failed'};
export type MailStatus={
  provider:MailProvider;
  configured:boolean;
  from:string|null;
  host:string|null;
  port:number|null;
  secure:boolean|null;
  userConfigured:boolean;
  passwordConfigured:boolean;
  resendApiKeyConfigured:boolean;
};

@Injectable()
export class MailService {
  private readonly logger=new Logger(MailService.name);
  private transporter?:MailTransport;

  private provider():MailProvider{
    const configured=(process.env.MAIL_PROVIDER||'').trim().toLowerCase();
    if(configured==='resend'||configured==='smtp')return configured;
    return process.env.RESEND_API_KEY?.trim()?'resend':'smtp';
  }

  private smtpConfig(){
    const host=process.env.SMTP_HOST?.trim()||'';
    const port=Number(process.env.SMTP_PORT||587);
    const secure=process.env.SMTP_SECURE==='true'||port===465;
    const user=process.env.SMTP_USER?.trim()||'';
    const pass=process.env.SMTP_PASS||'';
    const from=(process.env.SMTP_FROM||user||'').trim();
    return {host,port,secure,user,pass,from};
  }

  private resendConfig(){
    const apiKey=process.env.RESEND_API_KEY?.trim()||'';
    const from=(process.env.RESEND_FROM||process.env.MAIL_FROM||'').trim();
    return {apiKey,from};
  }

  status():MailStatus{
    const provider=this.provider();
    const smtp=this.smtpConfig();
    const resend=this.resendConfig();
    if(provider==='resend'){
      return {provider,configured:!!(resend.apiKey&&resend.from),from:resend.from||null,host:null,port:null,secure:null,userConfigured:false,passwordConfigured:false,resendApiKeyConfigured:!!resend.apiKey};
    }
    return {provider,configured:!!(smtp.host&&smtp.from),from:smtp.from||null,host:smtp.host||null,port:smtp.port,secure:smtp.secure,userConfigured:!!smtp.user,passwordConfigured:!!smtp.pass,resendApiKeyConfigured:!!resend.apiKey};
  }

  private getTransporter():MailTransport|undefined{
    if(this.transporter)return this.transporter;
    const c=this.smtpConfig();
    if(!c.host)return undefined;
    this.transporter=nodemailer.createTransport({
      host:c.host,
      port:c.port,
      secure:c.secure,
      auth:c.user?{user:c.user,pass:c.pass}:undefined,
      disableFileAccess:true,
      disableUrlAccess:true,
      connectionTimeout:Number(process.env.SMTP_CONNECTION_TIMEOUT_MS||10000),
      greetingTimeout:Number(process.env.SMTP_GREETING_TIMEOUT_MS||10000),
      socketTimeout:Number(process.env.SMTP_SOCKET_TIMEOUT_MS||15000),
    });
    return this.transporter;
  }

  private async sendWithSmtp(to:string,subject:string,text:string,html:string):Promise<MailDelivery>{
    const transporter=this.getTransporter();
    const c=this.smtpConfig();
    if(!transporter||!c.from)return {sent:false,reason:'not_configured'};
    try{
      await transporter.sendMail({from:c.from,to,subject,text,html});
      return {sent:true};
    }catch(error){
      const e=error as {name?:string;message?:string;code?:string;command?:string;responseCode?:number};
      this.logger.error(`Falha SMTP: code=${e.code||'n/a'} responseCode=${e.responseCode||'n/a'} command=${e.command||'n/a'} message=${e.message||e.name||'erro desconhecido'}`);
      return {sent:false,reason:'send_failed'};
    }
  }

  private async sendWithResend(to:string,subject:string,text:string,html:string):Promise<MailDelivery>{
    const c=this.resendConfig();
    if(!c.apiKey||!c.from)return {sent:false,reason:'not_configured'};
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),Number(process.env.RESEND_TIMEOUT_MS||15000));
    try{
      const response=await fetch('https://api.resend.com/emails',{
        method:'POST',
        headers:{Authorization:`Bearer ${c.apiKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({from:c.from,to:[to],subject,text,html}),
        signal:controller.signal,
      });
      if(response.ok)return {sent:true};
      const body=(await response.text()).slice(0,800).replace(/\s+/g,' ');
      this.logger.error(`Falha Resend: status=${response.status} body=${body||'sem resposta'}`);
      return {sent:false,reason:'send_failed'};
    }catch(error){
      const e=error as {name?:string;message?:string};
      this.logger.error(`Falha Resend: ${e.name||'Error'} ${e.message||'erro desconhecido'}`);
      return {sent:false,reason:'send_failed'};
    }finally{
      clearTimeout(timer);
    }
  }

  private async send(to:string,subject:string,text:string,html:string):Promise<MailDelivery>{
    return this.provider()==='resend'?this.sendWithResend(to,subject,text,html):this.sendWithSmtp(to,subject,text,html);
  }

  async verify(){
    const status=this.status();
    if(!status.configured)return {ok:false,reason:'not_configured' as const,status};
    if(status.provider==='resend')return {ok:true,status,validation:'configuration' as const};
    const transporter=this.getTransporter();
    if(!transporter)return {ok:false,reason:'not_configured' as const,status};
    try{
      if(transporter.verify)await transporter.verify();
      return {ok:true,status,validation:'connection' as const};
    }catch(error){
      const e=error as {name?:string;message?:string;code?:string;responseCode?:number};
      this.logger.error(`Falha ao validar SMTP: code=${e.code||'n/a'} responseCode=${e.responseCode||'n/a'} message=${e.message||e.name||'erro desconhecido'}`);
      return {ok:false,reason:'send_failed' as const,status};
    }
  }

  async sendTest(input:{to:string;name:string}){
    const provider=this.provider()==='resend'?'Resend':'SMTP';
    return this.send(input.to,'Teste de e-mail do LuviePro',`Olá, ${input.name}. O envio de e-mail do LuviePro via ${provider} está configurado e funcionando corretamente.`,`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2>E-mail configurado com sucesso</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p><p>Este é um e-mail de teste do LuviePro enviado via <strong>${provider}</strong>. Se você recebeu esta mensagem, o envio está funcionando corretamente.</p></div>`);
  }
  async sendUserInvitation(input:{to:string;name:string;tenantName:string;roleLabel:string;inviteUrl:string;expiresAt:Date}):Promise<MailDelivery>{const expires=input.expiresAt.toLocaleString('pt-BR');return this.send(input.to,`Primeiro acesso ao ${input.tenantName} no LuviePro`,`Olá, ${input.name}. Você recebeu acesso a ${input.tenantName} no LuviePro como ${input.roleLabel}. Crie sua senha pelo link: ${input.inviteUrl}. O link expira em ${expires}.`,`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2>Seu primeiro acesso ao LuviePro</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p><p>Você recebeu acesso à empresa <strong>${escapeHtml(input.tenantName)}</strong> com o perfil <strong>${escapeHtml(input.roleLabel)}</strong>.</p><p>Para concluir seu primeiro acesso, crie sua senha individual.</p><p style="margin:28px 0"><a href="${input.inviteUrl}" style="background:#244d3b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Criar minha senha</a></p><p style="font-size:13px;color:#65736c">Este link expira em ${expires} e só pode ser utilizado uma vez.</p></div>`);}
  async sendAccessActivated(input:{to:string;name:string;tenantName:string;loginUrl:string}):Promise<MailDelivery>{return this.send(input.to,'Seu acesso ao LuviePro foi ativado',`Olá, ${input.name}. Seu acesso a ${input.tenantName} foi ativado. Entre em ${input.loginUrl}.`,`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2>Acesso ativado</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p><p>Seu primeiro acesso à empresa <strong>${escapeHtml(input.tenantName)}</strong> foi concluído com sucesso.</p><p style="margin:28px 0"><a href="${input.loginUrl}" style="background:#244d3b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Entrar no LuviePro</a></p></div>`);}
  async sendPasswordReset(input:{to:string;name:string;resetUrl:string;expiresAt:Date}):Promise<MailDelivery>{const expires=input.expiresAt.toLocaleString('pt-BR');return this.send(input.to,'Redefinição de senha do LuviePro',`Olá, ${input.name}. Redefina sua senha pelo link: ${input.resetUrl}. O link expira em ${expires}.`,`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2>Redefinição de senha</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p style="margin:28px 0"><a href="${input.resetUrl}" style="background:#244d3b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Criar nova senha</a></p><p style="font-size:13px;color:#65736c">O link expira em ${expires}. Se você não solicitou a alteração, ignore esta mensagem.</p></div>`);}
  async sendNotification(input:{to:string;name:string;title:string;message?:string|null;url?:string|null}):Promise<MailDelivery>{const action=input.url?`<p style="margin:24px 0"><a href="${input.url}" style="background:#244d3b;color:#fff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:700">Abrir no LuviePro</a></p>`:'';return this.send(input.to,input.title,`Olá, ${input.name}. ${input.title}${input.message?`: ${input.message}`:''}${input.url?` ${input.url}`:''}`,`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2>${escapeHtml(input.title)}</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p>${input.message?`<p>${escapeHtml(input.message)}</p>`:''}${action}<p style="font-size:12px;color:#65736c">Você recebe este e-mail porque habilitou notificações por e-mail no LuviePro.</p></div>`);}
}
