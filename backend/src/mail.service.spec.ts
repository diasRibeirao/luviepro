import { MailService } from './mail.service';

describe('MailService',()=>{
  const original={...process.env};
  afterEach(()=>{process.env={...original};jest.restoreAllMocks();});

  it('returns not_configured when SMTP is absent',async()=>{
    process.env.MAIL_PROVIDER='smtp';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    await expect(new MailService().sendPasswordReset({to:'a@b.com',name:'A',resetUrl:'https://example.test',expiresAt:new Date()})).resolves.toEqual({sent:false,reason:'not_configured'});
  });

  it('uses Resend HTTPS when configured',async()=>{
    process.env.MAIL_PROVIDER='resend';
    process.env.RESEND_API_KEY='re_test';
    process.env.RESEND_FROM='LuviePro <onboarding@resend.dev>';
    const fetchMock=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'email_123'}),{status:200,headers:{'Content-Type':'application/json'}}));
    await expect(new MailService().sendTest({to:'a@b.com',name:'A'})).resolves.toEqual({sent:true});
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails',expect.objectContaining({method:'POST',headers:expect.objectContaining({Authorization:'Bearer re_test'})}));
  });

  it('adds the LuviePro display name when SMTP_FROM is only an email address',()=>{
    process.env.MAIL_PROVIDER='smtp';
    process.env.SMTP_HOST='smtp.example.com';
    process.env.SMTP_FROM='no-reply@example.com';
    delete process.env.MAIL_FROM_NAME;
    expect(new MailService().status().from).toBe('LuviePro <no-reply@example.com>');
  });

  it('uses MAIL_FROM_NAME when the sender is configured as a bare email',()=>{
    process.env.MAIL_PROVIDER='resend';
    process.env.RESEND_API_KEY='re_test';
    process.env.RESEND_FROM='no-reply@example.com';
    process.env.MAIL_FROM_NAME='LuviePro HML';
    expect(new MailService().status().from).toBe('LuviePro HML <no-reply@example.com>');
  });

  it('preserves an explicitly formatted sender',()=>{
    process.env.MAIL_PROVIDER='resend';
    process.env.RESEND_API_KEY='re_test';
    process.env.RESEND_FROM='Equipe LuviePro <contato@example.com>';
    process.env.MAIL_FROM_NAME='Outro nome';
    expect(new MailService().status().from).toBe('Equipe LuviePro <contato@example.com>');
  });

});
