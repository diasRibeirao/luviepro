import { Injectable } from '@nestjs/common';
const nodemailer:any=require('nodemailer');

@Injectable()
export class MailService {
  private transporter:any;
  private getTransporter(){
    if(this.transporter)return this.transporter;
    const host=process.env.SMTP_HOST;
    if(!host)return undefined;
    const port=Number(process.env.SMTP_PORT||587);
    this.transporter=nodemailer.createTransport({
      host,
      port,
      secure:process.env.SMTP_SECURE==='true'||port===465,
      auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined,
    });
    return this.transporter;
  }
  async sendUserInvitation(input:{to:string;name:string;tenantName:string;roleLabel:string;inviteUrl:string;expiresAt:Date}){
    const transporter=this.getTransporter();
    if(!transporter)return {sent:false,reason:'not_configured'} as const;
    const from=process.env.SMTP_FROM||process.env.SMTP_USER||'LuviePro <no-reply@luviepro.local>';
    const expires=input.expiresAt.toLocaleString('pt-BR');
    await transporter.sendMail({
      from,to:input.to,subject:`Convite para acessar ${input.tenantName} no LuviePro`,
      text:`Olá, ${input.name}. Você foi convidado para acessar ${input.tenantName} no LuviePro como ${input.roleLabel}. Defina sua senha pelo link: ${input.inviteUrl}. O convite expira em ${expires}.`,
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#183326"><h2 style="margin-bottom:8px">Você foi convidado para o LuviePro</h2><p>Olá, <strong>${escapeHtml(input.name)}</strong>.</p><p>Você recebeu acesso à empresa <strong>${escapeHtml(input.tenantName)}</strong> com o perfil <strong>${escapeHtml(input.roleLabel)}</strong>.</p><p style="margin:28px 0"><a href="${input.inviteUrl}" style="background:#244d3b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Definir minha senha</a></p><p style="font-size:13px;color:#65736c">Este convite expira em ${expires}. Se você não esperava este convite, ignore esta mensagem.</p></div>`,
    });
    return {sent:true} as const;
  }
}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c] as string));}
