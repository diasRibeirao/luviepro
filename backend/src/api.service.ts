import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from './prisma.service';
import { MailService } from './mail.service';
type Calc={dailyRateCents:number;days:number;people:number;variableCostCents:number;fixedCostCents:number;safetyMarginBps:number;variableCostMode?:string};
@Injectable() export class ApiService {
  constructor(private db:PrismaService,private jwt:JwtService,private mail:MailService){}
  private refreshSecret(){const secret=process.env.JWT_REFRESH_SECRET??(process.env.NODE_ENV==='production'?undefined:'local-dev-refresh-secret');if(!secret)throw new Error('JWT_REFRESH_SECRET não configurado');return secret;}
  private async issueSession(u:any){
    const effectiveTenant=await this.activateScheduledSubscriptionIfDue(u.tenantId,u.tenant);if(effectiveTenant)u={...u,tenant:effectiveTenant};
    const profile=u.customProfileId?(u.customProfile??await this.db.accessProfile.findFirst({where:{id:u.customProfileId,tenantId:u.tenantId,active:true}})):null;
    if(u.customProfileId&&!profile)throw new ForbiddenException('Seu perfil de acesso está inativo ou indisponível');
    const permissions=profile&&Array.isArray(profile.permissions)?profile.permissions as string[]:[];
    const payload={sub:u.id,tenantId:u.tenantId,role:u.role,plan:u.tenant.plan,customProfileId:profile?.id??null,permissions};
    const token=await this.jwt.signAsync({...payload,typ:'access'},{expiresIn:'15m'});
    const refreshToken=await this.jwt.signAsync({...payload,typ:'refresh'},{secret:this.refreshSecret(),expiresIn:'30d'});
    await this.db.user.update({where:{id:u.id},data:{refreshTokenHash:await hash(refreshToken,10)}});
    return {token,refreshToken,user:{id:u.id,name:u.name,email:u.email,role:u.role,customProfileId:profile?.id??null,customProfileName:profile?.name??null,permissions},tenant:u.tenant};
  }
  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entity:string,entityId?:string,metadata?:any){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity,entityId,metadata}}).catch(()=>undefined);
  }
  calculate(x:Calc){for(const v of Object.values(x))if(typeof v==='number'&&(!Number.isInteger(v)||v<0))throw new BadRequestException('Use inteiros não negativos; dinheiro em centavos.');const laborCents=x.dailyRateCents*x.days;const mode=x.variableCostMode??'per_day';const variableCents=mode==='fixed'?x.variableCostCents:mode==='per_person'?x.variableCostCents*x.people:mode==='per_person_day'?x.variableCostCents*x.people*x.days:x.variableCostCents*x.days;const subtotal=laborCents+variableCents+x.fixedCostCents;const marginCents=Math.round(x.dailyRateCents*x.safetyMarginBps/10000);return {laborCents,variableCents,fixedCents:x.fixedCostCents,marginCents,totalCents:subtotal+marginCents};}
  async login(email:string,password:string){
    const normalized=email.trim().toLowerCase();
    const u=await this.db.user.findUnique({where:{email:normalized},include:{tenant:true,customProfile:true}});
    if(!u){const platform=await (this.db as any).platformAdmin?.findUnique({where:{email:normalized}});if(platform)return this.platformLogin(normalized,password);throw new UnauthorizedException('E-mail ou senha inválidos');}
    const now=new Date();
    if(u.lockedUntil&&u.lockedUntil.getTime()>now.getTime()){
      await this.audit(u.tenantId,u.id,'login_blocked','user',u.id,{reason:'temporary_lock'});
      throw new UnauthorizedException('Acesso temporariamente bloqueado. Tente novamente em alguns minutos.');
    }
    if(!u.active){await this.audit(u.tenantId,u.id,'login_failed','user',u.id,{reason:'inactive'});throw new UnauthorizedException('E-mail ou senha inválidos');}
    if(!await compare(password,u.passwordHash)){
      const attempts=(u.failedLoginAttempts??0)+1;
      const lockedUntil=attempts>=5?new Date(now.getTime()+15*60*1000):null;
      await this.db.user.update({where:{id:u.id},data:{failedLoginAttempts:lockedUntil?0:attempts,lockedUntil}});
      await this.audit(u.tenantId,u.id,lockedUntil?'account_locked':'login_failed','user',u.id,{reason:'invalid_credentials',attempts,lockMinutes:lockedUntil?15:0});
      throw new UnauthorizedException(lockedUntil?'Acesso temporariamente bloqueado após várias tentativas. Tente novamente em 15 minutos.':'E-mail ou senha inválidos');
    }
    await this.db.user.update({where:{id:u.id},data:{failedLoginAttempts:0,lockedUntil:null,lastLoginAt:now}});
    const session=await this.issueSession({...u,lastLoginAt:now,failedLoginAttempts:0,lockedUntil:null});
    await this.audit(u.tenantId,u.id,'login_success','user',u.id);return session;
  }
  async platformLogin(email:string,password:string){const admin=await (this.db as any).platformAdmin.findUnique({where:{email:email.trim().toLowerCase()}});if(!admin||!admin.active||!await compare(password,admin.passwordHash))throw new UnauthorizedException('E-mail ou senha inválidos');const payload={sub:admin.id,role:'platform_admin',platformAdmin:true};const token=await this.jwt.signAsync({...payload,typ:'access'},{expiresIn:'15m'});const refreshToken=await this.jwt.signAsync({...payload,typ:'refresh'},{secret:this.refreshSecret(),expiresIn:'30d'});await (this.db as any).platformAdmin.update({where:{id:admin.id},data:{lastLoginAt:new Date(),refreshTokenHash:await hash(refreshToken,10)}});return {token,refreshToken,user:{id:admin.id,name:admin.name,email:admin.email,role:'platform_admin'},platform:true};}
  async platformOverview(){const now=new Date();const [tenants,activeTenants,users,clients,subscriptions,monthlyRevenue]=await Promise.all([this.db.tenant.count(),this.db.tenant.count({where:{status:'active'}}),this.db.user.count({where:{active:true}}),this.db.client.count({where:{active:true}}),this.db.subscription.count({where:{status:{in:['active','trial']}}}),this.db.subscription.aggregate({where:{status:{in:['active','trial']},period:'monthly'},_sum:{amountCents:true}})]);return {tenants,activeTenants,users,clients,subscriptions,monthlyRevenueCents:monthlyRevenue._sum.amountCents??0};}
  async platformTenants(){return this.db.tenant.findMany({select:{id:true,name:true,slug:true,plan:true,planPeriod:true,status:true,subscriptionExpiresAt:true,createdAt:true,_count:{select:{users:true,clients:true,subscriptions:true}}},orderBy:{createdAt:'desc'}});}
  async platformSubscriptions(){return this.db.subscription.findMany({select:{id:true,plan:true,period:true,amountCents:true,status:true,startsAt:true,expiresAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:200});}
  async platformPayments(){return this.db.payment.findMany({select:{id:true,provider:true,providerPaymentId:true,plan:true,period:true,amountCents:true,status:true,paymentMethod:true,paidAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:300});}
  async platformUsers(){return this.db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}},orderBy:{createdAt:'desc'},take:500});}
  async platformPlans(){return this.db.planLimit.findMany({orderBy:{monthlyPriceCents:'asc'}});}
  async platformUpdateTenant(id:string,data:any){const tenant=await this.db.tenant.findUnique({where:{id}});if(!tenant)throw new NotFoundException('Empresa não encontrada');const updated=await this.db.tenant.update({where:{id},data:{...(data.status!==undefined&&{status:data.status}),...(data.plan!==undefined&&{plan:data.plan}),...(data.planPeriod!==undefined&&{planPeriod:data.planPeriod})}});await this.audit(id,undefined,'platform_update_tenant','tenant',id,data);return updated;}
  async platformUpdateUser(id:string,data:any){const user=await this.db.user.findUnique({where:{id}});if(!user)throw new NotFoundException('Usuário não encontrado');const updated=await this.db.user.update({where:{id},data:{...(data.active!==undefined&&{active:data.active}),...(data.role!==undefined&&{role:data.role}),...(!data.active&&data.active!==undefined&&{refreshTokenHash:null})},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}}});await this.audit(user.tenantId,undefined,'platform_update_user','user',id,data);return updated;}
  async platformUpdatePlan(plan:string,data:any){if(!['starter','pro','business'].includes(plan))throw new BadRequestException('Plano inválido');const current=await this.db.planLimit.findUnique({where:{plan}});if(!current)throw new NotFoundException('Plano não encontrado');return this.db.planLimit.update({where:{plan},data});}
  async refresh(refreshToken:string){
    let payload:any;try{payload=await this.jwt.verifyAsync(refreshToken,{secret:this.refreshSecret()});}catch{throw new UnauthorizedException('Sessão expirada');}
    if(payload.typ!=='refresh')throw new UnauthorizedException('Token de renovação inválido');
    const u=await this.db.user.findUnique({where:{id:payload.sub},include:{tenant:true,customProfile:true}});if(!u?.active||!u.refreshTokenHash||!await compare(refreshToken,u.refreshTokenHash))throw new UnauthorizedException('Sessão revogada');
    if(u.tenant.status!=='active'||(u.tenant.subscriptionExpiresAt&&u.tenant.subscriptionExpiresAt.getTime()<Date.now()))throw new ForbiddenException('Conta indisponível ou assinatura expirada');
    return this.issueSession(u);
  }
  async logout(userId:string,tenantId:string){await this.db.user.updateMany({where:{id:userId,tenantId},data:{refreshTokenHash:null}});await this.audit(tenantId,userId,'logout','user',userId);return {ok:true};}
  async forgotPassword(email:string){const normalized=email.trim().toLowerCase();const user=await this.db.user.findUnique({where:{email:normalized}});const response:any={ok:true,message:'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.'};if(!user?.active)return response;const raw=randomBytes(32).toString('hex'),tokenHash=createHash('sha256').update(raw).digest('hex'),expiresAt=new Date(Date.now()+60*60*1000);const store=(this.db as any).passwordResetToken;await store.updateMany({where:{userId:user.id,usedAt:null},data:{usedAt:new Date()}});await store.create({data:{userId:user.id,tokenHash,expiresAt}});const appUrl=(process.env.APP_URL||'http://localhost:8081').replace(/\/$/,'');const resetUrl=`${appUrl}/reset-password?token=${raw}`;const sent=await this.mail.sendPasswordReset({to:user.email,name:user.name,resetUrl,expiresAt});if(process.env.NODE_ENV!=='production'&&!sent.sent)response.devResetUrl=resetUrl;await this.audit(user.tenantId,user.id,'password_reset_requested','user',user.id,{emailSent:sent.sent});return response;}
  async resetPassword(token:string,password:string){const tokenHash=createHash('sha256').update(token).digest('hex'),store=(this.db as any).passwordResetToken;const record=await store.findUnique({where:{tokenHash},include:{user:true}});if(!record||record.usedAt||record.expiresAt.getTime()<Date.now()||!record.user.active)throw new BadRequestException('Link de redefinição inválido ou expirado');await this.db.$transaction(async tx=>{await tx.user.update({where:{id:record.userId},data:{passwordHash:await hash(password,12),passwordChangedAt:new Date(),refreshTokenHash:null,failedLoginAttempts:0,lockedUntil:null}});await (tx as any).passwordResetToken.updateMany({where:{userId:record.userId,usedAt:null},data:{usedAt:new Date()}})});await this.audit(record.user.tenantId,record.userId,'password_reset_completed','user',record.userId);return {ok:true};}
  async register(data:any){const email=String(data.email??'').trim().toLowerCase(),password=String(data.password??''),name=String(data.name??'').trim(),company=String(data.company??'').trim();if(!email||!name||!company||password.length<8)throw new BadRequestException('Informe empresa, responsável, e-mail e senha com pelo menos 8 caracteres');if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já está cadastrado');const plan=['starter','pro','business'].includes(data.plan)?data.plan:'starter';const period=['monthly','quarterly','semiannual','annual'].includes(data.period)?data.period:'monthly';const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit)throw new BadRequestException('Plano indisponível');const amountCents=period==='annual'?limit.annualPriceCents:period==='semiannual'?limit.semiannualPriceCents:period==='quarterly'?limit.quarterlyPriceCents:limit.monthlyPriceCents;const now=new Date(),trialEnd=new Date(now);trialEnd.setDate(trialEnd.getDate()+14);const slug=`${company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'empresa'}-${Date.now().toString(36)}`;const result=await this.db.$transaction(async tx=>{const tenant=await tx.tenant.create({data:{name:company,slug,responsibleName:name,phone:data.phone,contactEmail:email,plan,planPeriod:period,subscriptionExpiresAt:trialEnd}});const user=await tx.user.create({data:{tenantId:tenant.id,name,email,passwordHash:await hash(password,12),role:'owner'}});await tx.subscription.create({data:{tenantId:tenant.id,plan,period,amountCents,status:'trial',startsAt:now,expiresAt:trialEnd}});return {tenant,user}});await this.audit(result.tenant.id,result.user.id,'register','tenant',result.tenant.id,{plan,period});return this.issueSession({...result.user,tenant:result.tenant});}
  plans(){return this.db.planLimit.findMany({orderBy:{monthlyPriceCents:'asc'}});}
  async account(tenantId:string,userId?:string){
    const tenant=await this.activateScheduledSubscriptionIfDue(tenantId);if(!tenant)throw new NotFoundException('Conta não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});
    const month=new Date();month.setDate(1);month.setHours(0,0,0,0);const now=new Date();
    const[clients,quotes,users,pendingInvitations,currentUser]=await Promise.all([
      this.db.client.count({where:{tenantId,active:true}}),
      this.db.quote.count({where:{tenantId,createdAt:{gte:month}}}),
      this.db.user.count({where:{tenantId,active:true}}),
      this.db.userInvitation.count({where:{tenantId,status:'pending',expiresAt:{gt:now}}}),
      userId?this.db.user.findFirst({where:{id:userId,tenantId},select:{id:true,name:true,email:true,role:true,customProfileId:true,customProfile:{select:{id:true,name:true}},active:true,lastLoginAt:true,lockedUntil:true,passwordChangedAt:true}}):Promise.resolve(null)
    ]);
    return {tenant,limit,currentUser,usage:{clients,quotes,users,pendingInvitations,userSeatsUsed:users+pendingInvitations},features:{customPdf:!!limit?.customPdf,logoPdf:limit?.logoPdf!==false,premiumTemplates:!!limit?.premiumTemplates,projectManagement:limit?.projectManagement??'basic',advancedReports:!!limit?.advancedReports,exportData:!!limit?.exportData,standardRoles:!!limit?.standardRoles,customRoles:!!limit?.customRoles,granularPermissions:!!limit?.granularPermissions,auditAccess:!!limit?.auditAccess}};
  }
  async updateAccount(tenantId:string,data:any,actorUserId?:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});if(!tenant)throw new NotFoundException('Conta não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});
    const customFields=['primaryColor','secondaryColor','proposalText'];
    if(!limit?.customPdf&&customFields.some(field=>data[field]!==undefined))throw new ForbiddenException('Personalização avançada disponível nos planos Pro e Business');
    const common=['name','responsibleName','phone','contactEmail','siteUrl','instagram','legalName','document','stateRegistration','municipalRegistration','zipCode','addressLine','addressNumber','addressComplement','neighborhood','city','state','proposalValidityDays','proposalPaymentTerms','proposalFooter','pixKey'];
    const patch:any={}; for(const field of common) if(data[field]!==undefined) patch[field]=data[field]||null;
    if(data.proposalValidityDays!==undefined)patch.proposalValidityDays=data.proposalValidityDays;
    if(limit?.customPdf){for(const field of customFields)if(data[field]!==undefined)patch[field]=data[field]||null;}
    const updated=await this.db.tenant.update({where:{id:tenantId},data:patch});
    await this.audit(tenantId,actorUserId,'update','tenant',tenantId);return updated;
  }
  async uploadLogo(tenantId:string,file:any,actorUserId?:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});if(!tenant)throw new NotFoundException('Conta não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});if(limit?.logoPdf===false)throw new ForbiddenException('Logo na proposta indisponível neste plano');
    if(!file?.buffer||!file?.mimetype)throw new BadRequestException('Selecione uma imagem para o logo');
    const allowed=['image/png','image/jpeg','image/webp'];if(!allowed.includes(file.mimetype))throw new BadRequestException('Formato inválido. Use PNG, JPG ou WebP.');
    if(file.size>2*1024*1024)throw new BadRequestException('O logo deve ter no máximo 2 MB');
    const logoUrl=`data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const updated=await this.db.tenant.update({where:{id:tenantId},data:{logoUrl}});
    await this.audit(tenantId,actorUserId,'upload_logo','tenant',tenantId,{mimeType:file.mimetype,size:file.size});return updated;
  }
  async removeLogo(tenantId:string,actorUserId?:string){
    const updated=await this.db.tenant.update({where:{id:tenantId},data:{logoUrl:null}}).catch(()=>null);if(!updated)throw new NotFoundException('Conta não encontrada');
    await this.audit(tenantId,actorUserId,'remove_logo','tenant',tenantId);return updated;
  }
  async changePassword(tenantId:string,userId:string,currentPassword:string,newPassword:string){const user=await this.db.user.findFirst({where:{id:userId,tenantId}});if(!user||!await compare(currentPassword,user.passwordHash))throw new BadRequestException('Senha atual inválida');if(currentPassword===newPassword)throw new BadRequestException('A nova senha deve ser diferente da atual');await this.db.user.update({where:{id:userId},data:{passwordHash:await hash(newPassword,12),refreshTokenHash:null,passwordChangedAt:new Date(),failedLoginAttempts:0,lockedUntil:null}});await this.audit(tenantId,userId,'change_password','user',userId);return {ok:true};}

  async updatePlan(tenantId:string,plan:string,period='monthly',actorUserId?:string){
    if(!['starter','pro','business'].includes(plan))throw new BadRequestException('Plano inválido');
    if(!['monthly','quarterly','semiannual','annual'].includes(period))throw new BadRequestException('Período inválido');
    const targetLimit=await this.db.planLimit.findUnique({where:{plan}});
    const now=new Date();
    const [activeUsers,pendingInvitations]=await Promise.all([
      this.db.user.count({where:{tenantId,active:true}}),
      this.db.userInvitation.count({where:{tenantId,status:'pending',expiresAt:{gt:now}}})
    ]);
    const used=activeUsers+pendingInvitations;
    if(targetLimit&&targetLimit.maxUsers>=0&&used>targetLimit.maxUsers)throw new BadRequestException(`Cancele convites pendentes ou desative ${used-targetLimit.maxUsers} acesso(s) antes de mudar para este plano`);
    if(process.env.ALLOW_DIRECT_PLAN_CHANGE!=='true')throw new ForbiddenException('Alteração direta de plano desabilitada. Use o fluxo de cobrança ou o painel da plataforma.');
    const updated=await this.db.tenant.update({where:{id:tenantId},data:{plan,planPeriod:period}});
    await this.audit(tenantId,actorUserId,'change_plan','tenant',tenantId,{plan,period});
    return updated;
  }
  private mercadoPagoToken(){const token=process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();if(!token)throw new BadRequestException('Mercado Pago ainda não foi configurado. Informe MERCADO_PAGO_ACCESS_TOKEN no backend.');return token;}
  private mercadoPagoSandbox(){return process.env.MERCADO_PAGO_USE_SANDBOX==='true';}
  private periodPrice(limit:any,period:string){return period==='annual'?limit.annualPriceCents:period==='semiannual'?limit.semiannualPriceCents:period==='quarterly'?limit.quarterlyPriceCents:limit.monthlyPriceCents;}
  private periodEnd(start:Date,period:string){const end=new Date(start);if(period==='annual')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+(period==='semiannual'?6:period==='quarterly'?3:1));return end;}
  private planRank(plan:string){return ({starter:1,pro:2,business:3} as Record<string,number>)[plan]??0;}
  private billingAction(currentPlan:string,targetPlan:string,expiresAt?:Date|null){if(!expiresAt||expiresAt.getTime()<=Date.now())return 'new_subscription';if(currentPlan===targetPlan)return 'renewal';return this.planRank(targetPlan)>this.planRank(currentPlan)?'upgrade':'downgrade';}
  private async activateScheduledSubscriptionIfDue(tenantId:string,currentTenant?:any){
    const now=new Date();const scheduled=await this.db.subscription.findFirst({where:{tenantId,status:'scheduled',startsAt:{lte:now}},orderBy:{startsAt:'asc'}});
    if(!scheduled)return currentTenant??this.db.tenant.findUnique({where:{id:tenantId}});
    return this.db.$transaction(async tx=>{await tx.subscription.updateMany({where:{tenantId,status:{in:['active','trial']}},data:{status:'replaced'}});await tx.subscription.update({where:{id:scheduled.id},data:{status:'active'}});return tx.tenant.update({where:{id:tenantId},data:{plan:scheduled.plan,planPeriod:scheduled.period,subscriptionExpiresAt:scheduled.expiresAt,status:'active'}});});
  }
  async billingPayments(tenantId:string){await this.activateScheduledSubscriptionIfDue(tenantId);return this.db.payment.findMany({where:{tenantId},select:{id:true,provider:true,providerPaymentId:true,providerPreferenceId:true,plan:true,period:true,amountCents:true,status:true,billingAction:true,paymentMethod:true,providerStatus:true,providerStatusDetail:true,currency:true,payerEmail:true,paidAt:true,cancelledAt:true,refundedAt:true,chargebackAt:true,createdAt:true,updatedAt:true,subscription:{select:{id:true,status:true,startsAt:true,expiresAt:true}}},orderBy:{createdAt:'desc'},take:100});}
  async reconcileMercadoPagoReturn(tenantId:string,providerPaymentId:string,actorUserId?:string){
    if(!providerPaymentId)throw new BadRequestException('Identificador do pagamento não informado');
    const remote=await this.fetchMercadoPagoPayment(providerPaymentId);
    const externalReference=String(remote.external_reference||'');
    if(!externalReference)throw new BadRequestException('Pagamento sem referência externa');
    const local=await this.db.payment.findFirst({where:{tenantId,externalReference}});
    if(!local)throw new NotFoundException('Cobrança correspondente não encontrada');
    const result=await this.processMercadoPagoPayment(remote,local);
    await this.audit(tenantId,actorUserId,'reconcile_checkout_return','payment',local.id,{providerPaymentId:String(providerPaymentId),status:result.status});
    return result;
  }
  async createCheckout(tenantId:string,actorUserId:string,plan:string,period:string){
    if(!['starter','pro','business'].includes(plan))throw new BadRequestException('Plano inválido');if(!['monthly','quarterly','semiannual','annual'].includes(period))throw new BadRequestException('Período inválido');
    const token=this.mercadoPagoToken();
    const [tenant,limit,user]=await Promise.all([this.activateScheduledSubscriptionIfDue(tenantId),this.db.planLimit.findUnique({where:{plan}}),this.db.user.findFirst({where:{id:actorUserId,tenantId}})]);
    if(!tenant||!limit||!user)throw new NotFoundException('Conta, usuário ou plano não encontrado');
    const amountCents=this.periodPrice(limit,period);if(amountCents<=0)throw new BadRequestException('Este plano não possui preço configurado para o período selecionado');
    const action=this.billingAction(tenant.plan,plan,tenant.subscriptionExpiresAt);const effectiveAt=action==='downgrade'&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt>new Date()?tenant.subscriptionExpiresAt:new Date();
    const externalReference=`luviepro_${tenantId}_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const payment=await this.db.payment.create({data:{tenantId,externalReference,plan,period,amountCents,status:'pending',billingAction:action,currency:'BRL',payerEmail:user.email}});
    const appUrl=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');const webhookUrl=process.env.MERCADO_PAGO_WEBHOOK_URL?.trim();const hasUsableReturn=!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(appUrl);
    const periodLabel=({monthly:'mensal',quarterly:'trimestral',semiannual:'semestral',annual:'anual'} as Record<string,string>)[period]??period;
    const body:any={items:[{id:`${plan}-${period}`,title:`LuviePro ${plan[0].toUpperCase()+plan.slice(1)} — ${periodLabel}`,description:`Assinatura LuviePro (${periodLabel})`,currency_id:'BRL',quantity:1,unit_price:amountCents/100}],payer:{email:user.email},external_reference:externalReference,metadata:{payment_id:payment.id,tenant_id:tenantId,plan,period,billing_action:action},statement_descriptor:'LUVIEPRO'};
    if(hasUsableReturn){body.back_urls={success:`${appUrl}/plans?payment=success`,pending:`${appUrl}/plans?payment=pending`,failure:`${appUrl}/plans?payment=failure`};body.auto_return='approved';}if(webhookUrl?.startsWith('https://'))body.notification_url=webhookUrl;
    let response:Response;try{response=await fetch('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':payment.id},body:JSON.stringify(body)});}catch{await this.db.payment.update({where:{id:payment.id},data:{status:'error'}});throw new BadRequestException('Não foi possível conectar ao Mercado Pago');}
    const result:any=await response.json().catch(()=>({}));if(!response.ok){await this.db.payment.update({where:{id:payment.id},data:{status:'error',raw:result}});throw new BadRequestException(result?.message||'Mercado Pago recusou a criação do checkout');}
    const checkoutUrl=(this.mercadoPagoSandbox()?result.sandbox_init_point:result.init_point)||result.init_point;if(!checkoutUrl){await this.db.payment.update({where:{id:payment.id},data:{status:'error',raw:result}});throw new BadRequestException('Mercado Pago não retornou uma URL de checkout');}
    await this.db.payment.update({where:{id:payment.id},data:{providerPreferenceId:String(result.id),checkoutUrl,raw:result}});await this.audit(tenantId,actorUserId,'create_checkout','payment',payment.id,{plan,period,amountCents,provider:'mercado_pago',billingAction:action,sandbox:this.mercadoPagoSandbox(),effectiveAt});
    return {paymentId:payment.id,preferenceId:result.id,checkoutUrl,webhookConfigured:!!body.notification_url,sandbox:this.mercadoPagoSandbox(),billingAction:action,effectiveAt};
  }
  private validMercadoPagoSignature(dataId:string,signature?:string,requestId?:string){
    const secret=process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();if(!secret)return process.env.NODE_ENV!=='production'&&process.env.MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS==='true';if(!signature||!requestId||!dataId)return false;
    const parts=Object.fromEntries(signature.split(',').map(part=>part.trim().split('=',2))) as Record<string,string>;if(!parts.ts||!parts.v1)return false;const manifest=`id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${parts.ts};`;const expected=createHmac('sha256',secret).update(manifest).digest('hex');const received=parts.v1;return expected.length===received.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(received));
  }
  private async fetchMercadoPagoPayment(providerPaymentId:string){const response=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(providerPaymentId)}`,{headers:{Authorization:`Bearer ${this.mercadoPagoToken()}`}});if(!response.ok)throw new BadRequestException('Pagamento não encontrado no Mercado Pago');return response.json() as Promise<any>;}
  private mapMercadoPagoStatus(status:string){return ({approved:'approved',pending:'pending',in_process:'pending',rejected:'rejected',cancelled:'cancelled',refunded:'refunded',charged_back:'charged_back'} as Record<string,string>)[status]||String(status||'pending');}
  private async processMercadoPagoPayment(remote:any,local:any){
    const paymentId=String(remote.id||'');const mapped=this.mapMercadoPagoStatus(remote.status);const remoteAmount=Math.round(Number(remote.transaction_amount??0)*100);const remoteCurrency=String(remote.currency_id||'BRL');
    if(String(remote.external_reference||'')!==local.externalReference)throw new BadRequestException('Referência do pagamento não confere');if(remoteAmount!==local.amountCents)throw new BadRequestException('Valor confirmado pelo Mercado Pago não confere com a cobrança');if(remoteCurrency!=='BRL')throw new BadRequestException('Moeda do pagamento não confere com a cobrança');
    const now=new Date();const common:any={providerPaymentId:paymentId,status:mapped,providerStatus:String(remote.status||mapped),providerStatusDetail:remote.status_detail?String(remote.status_detail):null,paymentMethod:remote.payment_type_id||remote.payment_method_id||null,currency:remoteCurrency,payerEmail:remote.payer?.email||local.payerEmail||null,raw:remote};
    if(mapped==='approved'&&local.status!=='approved'){
      common.paidAt=remote.date_approved?new Date(remote.date_approved):now;const tenant=await this.activateScheduledSubscriptionIfDue(local.tenantId);if(!tenant)throw new NotFoundException('Conta da cobrança não encontrada');
      const action=local.billingAction||this.billingAction(tenant.plan,local.plan,tenant.subscriptionExpiresAt);let start=now;if(action==='renewal'&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt>now)start=tenant.subscriptionExpiresAt;if(action==='downgrade'&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt>now)start=tenant.subscriptionExpiresAt;const expiresAt=this.periodEnd(start,local.period);const scheduled=start.getTime()>now.getTime()+1000;
      await this.db.$transaction(async tx=>{
        if(!scheduled){await tx.subscription.updateMany({where:{tenantId:local.tenantId,status:{in:['active','trial']}},data:{status:'replaced'}});}
        const subscription=await tx.subscription.create({data:{tenantId:local.tenantId,plan:local.plan,period:local.period,amountCents:local.amountCents,status:scheduled?'scheduled':'active',startsAt:start,expiresAt}});
        if(action==='renewal'){await tx.tenant.update({where:{id:local.tenantId},data:{plan:local.plan,planPeriod:local.period,subscriptionExpiresAt:expiresAt,status:'active'}});}else if(!scheduled){await tx.tenant.update({where:{id:local.tenantId},data:{plan:local.plan,planPeriod:local.period,subscriptionExpiresAt:expiresAt,status:'active'}});}
        await tx.payment.update({where:{id:local.id},data:{...common,subscriptionId:subscription.id}});
      });
      await this.audit(local.tenantId,undefined,'payment_approved','payment',local.id,{providerPaymentId:paymentId,plan:local.plan,period:local.period,billingAction:action,effectiveAt:start,expiresAt});
    }else{
      if(mapped==='cancelled')common.cancelledAt=now;if(mapped==='refunded')common.refundedAt=now;if(mapped==='charged_back')common.chargebackAt=now;await this.db.payment.update({where:{id:local.id},data:common});
      if((mapped==='refunded'||mapped==='charged_back')&&local.subscriptionId){const subscription=await this.db.subscription.findUnique({where:{id:local.subscriptionId}});if(subscription){await this.db.subscription.update({where:{id:subscription.id},data:{status:subscription.status==='scheduled'?'cancelled':'payment_review'}});}}
      if(['rejected','cancelled','refunded','charged_back'].includes(mapped))await this.audit(local.tenantId,undefined,`payment_${mapped}`,'payment',local.id,{providerPaymentId:paymentId,statusDetail:remote.status_detail||null});
    }
    return {ok:true,status:mapped,paymentId:local.id};
  }
  async mercadoPagoWebhook(body:any,dataId?:string,signature?:string,requestId?:string){const paymentId=String(dataId||body?.data?.id||'');if(!paymentId)return {ok:true,ignored:true};if(!this.validMercadoPagoSignature(paymentId,signature,requestId))throw new UnauthorizedException('Assinatura do webhook inválida');const remote=await this.fetchMercadoPagoPayment(paymentId);const externalReference=String(remote.external_reference||'');const local=await this.db.payment.findFirst({where:{OR:[{externalReference},{providerPaymentId:paymentId}]}});if(!local)return {ok:true,ignored:true};return this.processMercadoPagoPayment(remote,local);}
  async reconcilePayment(tenantId:string,id:string,actorUserId:string){const local=await this.db.payment.findFirst({where:{id,tenantId}});if(!local)throw new NotFoundException('Cobrança não encontrada');if(!local.providerPaymentId){
      if(!local.externalReference)throw new BadRequestException('Cobrança sem referência externa');const search=await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(local.externalReference)}`,{headers:{Authorization:`Bearer ${this.mercadoPagoToken()}`}});if(!search.ok)throw new BadRequestException('Não foi possível consultar a cobrança no Mercado Pago');const result:any=await search.json();const remote=result?.results?.[0];if(!remote)throw new BadRequestException('Pagamento ainda não localizado no Mercado Pago');const processed=await this.processMercadoPagoPayment(remote,local);await this.audit(tenantId,actorUserId,'reconcile_payment','payment',id,{providerPaymentId:String(remote.id)});return processed;
    }const remote=await this.fetchMercadoPagoPayment(local.providerPaymentId);const processed=await this.processMercadoPagoPayment(remote,local);await this.audit(tenantId,actorUserId,'reconcile_payment','payment',id,{providerPaymentId:local.providerPaymentId});return processed;}
  users(tenantId:string){return this.db.user.findMany({where:{tenantId},select:{id:true,name:true,email:true,role:true,customProfileId:true,customProfile:{select:{id:true,name:true,active:true}},active:true,createdAt:true,updatedAt:true},orderBy:[{role:'asc'},{name:'asc'}]});}
  private invitationHash(token:string){return createHash('sha256').update(token).digest('hex');}
  private invitationUrl(token:string){const base=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');return `${base}/invite/${encodeURIComponent(token)}`;}
  private readonly permissionCatalog=['dashboard.read','clients.read','clients.write','services.read','services.write','quotes.read','quotes.write','projects.read','projects.write','calendar.read','calendar.write','finance.read','settings.manage','users.manage','audit.read'];
  private normalizePermissions(values:any){const set=new Set(Array.isArray(values)?values.map(String):[]);return this.permissionCatalog.filter(code=>set.has(code));}
  async accessProfiles(tenantId:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;
    if(!limit?.customRoles)throw new ForbiddenException('Perfis personalizados estão disponíveis no plano Business');
    return this.db.accessProfile.findMany({where:{tenantId},orderBy:[{active:'desc'},{name:'asc'}]});
  }
  async createAccessProfile(tenantId:string,data:any,actorUserId:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;
    if(!limit?.customRoles||!limit?.granularPermissions)throw new ForbiddenException('Perfis personalizados e permissões granulares estão disponíveis no plano Business');
    const name=String(data.name??'').trim();if(name.length<2)throw new BadRequestException('Informe o nome do perfil');
    const permissions=this.normalizePermissions(data.permissions);if(!permissions.length)throw new BadRequestException('Selecione pelo menos uma permissão');
    const exists=await this.db.accessProfile.findFirst({where:{tenantId,name:{equals:name,mode:'insensitive'}}});if(exists)throw new ConflictException('Já existe um perfil com este nome');
    const created=await this.db.accessProfile.create({data:{tenantId,name,description:data.description?.trim()||null,permissions}});
    await this.audit(tenantId,actorUserId,'create','access_profile',created.id,{name,permissions});return created;
  }
  async updateAccessProfile(tenantId:string,id:string,data:any,actorUserId:string){
    const profile=await this.db.accessProfile.findFirst({where:{id,tenantId}});if(!profile)throw new NotFoundException('Perfil não encontrado');
    const patch:any={};if(data.name!==undefined)patch.name=String(data.name).trim();if(data.description!==undefined)patch.description=data.description?.trim()||null;if(data.permissions!==undefined){const permissions=this.normalizePermissions(data.permissions);if(!permissions.length)throw new BadRequestException('Selecione pelo menos uma permissão');patch.permissions=permissions;}if(data.active!==undefined)patch.active=!!data.active;
    if(data.active===false){const assigned=await this.db.user.count({where:{tenantId,customProfileId:id,active:true}});if(assigned>0)throw new BadRequestException('Desative ou altere os usuários vinculados antes de inativar este perfil');}
    const updated=await this.db.accessProfile.update({where:{id},data:patch});await this.audit(tenantId,actorUserId,'update','access_profile',id,patch);return updated;
  }
  private async resolveCustomProfile(tenantId:string,customProfileId?:string){if(!customProfileId)return null;const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;if(!limit?.customRoles)throw new ForbiddenException('Perfis personalizados estão disponíveis no plano Business');const profile=await this.db.accessProfile.findFirst({where:{id:customProfileId,tenantId,active:true}});if(!profile)throw new BadRequestException('Perfil personalizado inválido ou inativo');return profile;}
  private roleLabel(role:string){return ({admin:'Administrador',commercial:'Comercial',operational:'Operacional',finance:'Financeiro'} as Record<string,string>)[role]??role;}
  private async accessCapacity(tenantId:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});
    if(!tenant)throw new NotFoundException('Conta não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});
    const now=new Date();
    const [active,pending]=await Promise.all([
      this.db.user.count({where:{tenantId,active:true}}),
      this.db.userInvitation.count({where:{tenantId,status:'pending',expiresAt:{gt:now}}})
    ]);
    return {tenant,limit,active,pending,used:active+pending};
  }
  async userInvitations(tenantId:string){
    const now=new Date();
    await this.db.userInvitation.updateMany({where:{tenantId,status:'pending',expiresAt:{lte:now}},data:{status:'expired'}});
    return this.db.userInvitation.findMany({where:{tenantId,status:{in:['pending','expired']}},select:{id:true,name:true,email:true,role:true,customProfileId:true,customProfile:{select:{id:true,name:true}},status:true,expiresAt:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'}});
  }
  async createUser(tenantId:string,data:any,actorUserId:string){
    const {tenant,limit,used}=await this.accessCapacity(tenantId);
    if(tenant.plan==='starter')throw new BadRequestException('O plano Starter permite somente o proprietário. Faça upgrade para adicionar usuários');
    if(limit&&limit.maxUsers>=0&&used>=limit.maxUsers)throw new BadRequestException('Limite de usuários do plano atingido. Convites pendentes também reservam vagas');
    const customProfile=await this.resolveCustomProfile(tenantId,data.customProfileId);
    if(!customProfile&&!limit?.standardRoles&&data.role!=='admin')throw new ForbiddenException('Perfis de acesso estão disponíveis nos planos Pro e Business');
    const email=String(data.email).trim().toLowerCase();
    if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
    const current=await this.db.userInvitation.findFirst({where:{tenantId,email,status:'pending',expiresAt:{gt:new Date()}}});
    if(current)throw new ConflictException('Já existe um convite pendente para este e-mail');
    const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+Number(process.env.INVITATION_TTL_HOURS||48)*3600000);
    const invitation=await this.db.userInvitation.create({data:{tenantId,name:String(data.name).trim(),email,role:customProfile?'admin':data.role,customProfileId:customProfile?.id??null,tokenHash:this.invitationHash(token),invitedByUserId:actorUserId,expiresAt},select:{id:true,name:true,email:true,role:true,customProfileId:true,customProfile:{select:{id:true,name:true}},status:true,expiresAt:true,createdAt:true}});
    const inviteUrl=this.invitationUrl(token);
    let delivery:any={sent:false,reason:'not_configured'};
    try{delivery=await this.mail.sendUserInvitation({to:email,name:invitation.name,tenantName:tenant.name,roleLabel:invitation.customProfile?.name??this.roleLabel(invitation.role),inviteUrl,expiresAt});}
    catch{delivery={sent:false,reason:'send_failed'};}
    await this.audit(tenantId,actorUserId,'invite','user_invitation',invitation.id,{role:invitation.role,email,delivery:delivery.sent?'sent':delivery.reason});
    return {...invitation,delivery,inviteUrl};
  }
  async resendUserInvitation(tenantId:string,id:string,actorUserId:string){
    const invitation=await this.db.userInvitation.findFirst({where:{id,tenantId},include:{tenant:true,customProfile:true}});
    if(!invitation)throw new NotFoundException('Convite não encontrado');
    if(invitation.status==='accepted'||invitation.status==='cancelled')throw new BadRequestException('Este convite não pode ser reenviado');
    if(invitation.status!=='pending'||invitation.expiresAt.getTime()<=Date.now()){
      const {limit,used}=await this.accessCapacity(tenantId);
      if(limit&&limit.maxUsers>=0&&used>=limit.maxUsers)throw new BadRequestException('Limite de usuários do plano atingido');
    }
    if(await this.db.user.findUnique({where:{email:invitation.email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
    const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+Number(process.env.INVITATION_TTL_HOURS||48)*3600000);
    const updated=await this.db.userInvitation.update({where:{id},data:{tokenHash:this.invitationHash(token),status:'pending',expiresAt,invitedByUserId:actorUserId}});
    const inviteUrl=this.invitationUrl(token);
    let delivery:any={sent:false,reason:'not_configured'};
    try{delivery=await this.mail.sendUserInvitation({to:updated.email,name:updated.name,tenantName:invitation.tenant.name,roleLabel:invitation.customProfile?.name??this.roleLabel(updated.role),inviteUrl,expiresAt});}
    catch{delivery={sent:false,reason:'send_failed'};}
    await this.audit(tenantId,actorUserId,'resend_invite','user_invitation',id,{email:updated.email,delivery:delivery.sent?'sent':delivery.reason});
    return {id:updated.id,status:updated.status,expiresAt:updated.expiresAt,delivery,inviteUrl};
  }
  async cancelUserInvitation(tenantId:string,id:string,actorUserId:string){
    const invitation=await this.db.userInvitation.findFirst({where:{id,tenantId}});
    if(!invitation)throw new NotFoundException('Convite não encontrado');
    if(invitation.status!=='pending'&&invitation.status!=='expired')throw new BadRequestException('Este convite não pode ser cancelado');
    const updated=await this.db.userInvitation.update({where:{id},data:{status:'cancelled'}});
    await this.audit(tenantId,actorUserId,'cancel_invite','user_invitation',id,{email:updated.email});
    return {ok:true};
  }
  async invitationInfo(token:string){
    const invitation=await this.db.userInvitation.findUnique({where:{tokenHash:this.invitationHash(token)},include:{tenant:true,customProfile:true}});
    if(!invitation||invitation.status!=='pending')throw new NotFoundException('Convite inválido ou indisponível');
    if(invitation.customProfileId&&!invitation.customProfile?.active)throw new BadRequestException('O perfil associado a este convite está inativo. Solicite um novo convite');
    if(invitation.tenant.status!=='active'||(invitation.tenant.subscriptionExpiresAt&&invitation.tenant.subscriptionExpiresAt.getTime()<Date.now()))throw new ForbiddenException('A conta da empresa está indisponível ou com assinatura expirada');
    if(invitation.expiresAt.getTime()<=Date.now()){await this.db.userInvitation.update({where:{id:invitation.id},data:{status:'expired'}});throw new BadRequestException('Este convite expirou. Solicite um novo convite ao administrador');}
    return {name:invitation.name,email:invitation.email,role:invitation.role,roleLabel:invitation.customProfile?.name??this.roleLabel(invitation.role),customProfileId:invitation.customProfileId,tenantName:invitation.tenant.name,expiresAt:invitation.expiresAt};
  }
  async acceptInvitation(token:string,password:string){
    const tokenHash=this.invitationHash(token);
    const invitation=await this.db.userInvitation.findUnique({where:{tokenHash},include:{tenant:true,customProfile:true}});
    if(!invitation||invitation.status!=='pending')throw new NotFoundException('Convite inválido ou indisponível');
    if(invitation.customProfileId&&!invitation.customProfile?.active)throw new BadRequestException('O perfil associado a este convite está inativo. Solicite um novo convite');
    if(invitation.tenant.status!=='active'||(invitation.tenant.subscriptionExpiresAt&&invitation.tenant.subscriptionExpiresAt.getTime()<Date.now()))throw new ForbiddenException('A conta da empresa está indisponível ou com assinatura expirada');
    if(invitation.expiresAt.getTime()<=Date.now()){await this.db.userInvitation.update({where:{id:invitation.id},data:{status:'expired'}});throw new BadRequestException('Este convite expirou. Solicite um novo convite');}
    if(await this.db.user.findUnique({where:{email:invitation.email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
    const limit=await this.db.planLimit.findUnique({where:{plan:invitation.tenant.plan}});
    const active=await this.db.user.count({where:{tenantId:invitation.tenantId,active:true}});
    if(limit&&limit.maxUsers>=0&&active>=limit.maxUsers)throw new BadRequestException('A empresa atingiu o limite de usuários do plano. Fale com o administrador');
    const user=await this.db.$transaction(async tx=>{
      const created=await tx.user.create({data:{tenantId:invitation.tenantId,name:invitation.name,email:invitation.email,passwordHash:await hash(password,12),role:invitation.role,customProfileId:invitation.customProfileId,active:true}});
      await tx.userInvitation.update({where:{id:invitation.id},data:{status:'accepted',acceptedAt:new Date()}});
      return created;
    });
    await this.audit(invitation.tenantId,user.id,'accept_invite','user_invitation',invitation.id,{role:user.role,email:user.email});
    return this.issueSession({...user,tenant:invitation.tenant});
  }
  async updateUser(tenantId:string,id:string,data:any,actorUserId:string){
    const user=await this.db.user.findFirst({where:{id,tenantId}});if(!user)throw new NotFoundException('Usuário não encontrado');
    if(user.role==='owner'&&id!==actorUserId)throw new ForbiddenException('O usuário proprietário não pode ser alterado');
    if(id===actorUserId&&(data.active===false||data.role&&data.role!=='owner'||data.customProfileId))throw new BadRequestException('Você não pode remover seu próprio acesso de proprietário');
    if(data.active===true&&!user.active){const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;const activeUsers=await this.db.user.count({where:{tenantId,active:true}});if(limit&&limit.maxUsers>=0&&activeUsers>=limit.maxUsers)throw new BadRequestException('Limite de usuários do plano atingido');}
    const customProfile=data.customProfileId===undefined?undefined:await this.resolveCustomProfile(tenantId,data.customProfileId||undefined);
    const updated=await this.db.user.update({where:{id},data:{name:data.name??user.name,role:user.role==='owner'?'owner':(customProfile?'admin':(data.role??user.role)),...(customProfile!==undefined?{customProfileId:customProfile?.id??null}:{}),active:data.active??user.active,...(data.active===false?{refreshTokenHash:null}:{})},select:{id:true,name:true,email:true,role:true,customProfileId:true,customProfile:{select:{id:true,name:true}},active:true,createdAt:true,updatedAt:true}});
    await this.audit(tenantId,actorUserId,'update','user',id,{role:updated.role,customProfileId:updated.customProfileId,active:updated.active});return updated;
  }
  async auditLogs(tenantId:string,filters:any={}){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;if(!limit?.auditAccess)throw new ForbiddenException('Histórico de atividades disponível no plano Business');
    const where:any={tenantId};
    if(filters.action)where.action=String(filters.action);
    if(filters.entity)where.entity=String(filters.entity);
    if(filters.actorUserId)where.actorUserId=String(filters.actorUserId);
    const from=filters.from?new Date(String(filters.from)):null,to=filters.to?new Date(String(filters.to)):null;
    if(from&&!Number.isNaN(from.getTime())||to&&!Number.isNaN(to.getTime())){where.createdAt={};if(from&&!Number.isNaN(from.getTime()))where.createdAt.gte=from;if(to&&!Number.isNaN(to.getTime())){to.setHours(23,59,59,999);where.createdAt.lte=to;}}
    const take=Math.min(500,Math.max(1,Number(filters.take)||200));
    const[logs,users]=await Promise.all([this.db.auditLog.findMany({where,orderBy:{createdAt:'desc'},take}),this.db.user.findMany({where:{tenantId},select:{id:true,name:true,email:true}})]);const actors=new Map(users.map(u=>[u.id,u]));
    let result=logs.map(log=>({...log,actor:log.actorUserId?actors.get(log.actorUserId)??null:null}));
    const search=String(filters.search??'').trim().toLowerCase();if(search)result=result.filter((log:any)=>[log.action,log.entity,log.entityId,log.actor?.name,log.actor?.email,JSON.stringify(log.metadata??{})].some(v=>String(v??'').toLowerCase().includes(search)));
    return {items:result,total:result.length,actors:users};
  }
  async dashboard(tenantId:string){
    const now=new Date();const soon=new Date(now.getTime()+7*86400000);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const nextMonthStart=new Date(now.getFullYear(),now.getMonth()+1,1);
    const prevMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1);
    const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const [clients,quotes,projects,revenue,totalQuotes,approvedQuotes,draftQuotes,sentQuotes,rejectedQuotes,openValue,expiringQuotes,currentMonthClients,previousMonthClients,currentMonthQuotes,previousMonthQuotes,currentMonthRevenue,previousMonthRevenue,overdueProjects]=await Promise.all([
      this.db.client.count({where:{tenantId,active:true}}),
      this.db.quote.findMany({where:{tenantId},include:{client:true},orderBy:{createdAt:'desc'},take:5}),
      this.db.project.findMany({where:{tenantId,status:{in:['scheduled','in_progress']}},include:{client:true,tasks:{where:{tenantId,status:{not:'completed'}},orderBy:{dueDate:'asc'}}},orderBy:[{progress:'desc'},{name:'asc'}]}),
      this.db.quote.aggregate({where:{tenantId,status:'approved'},_sum:{finalTotalCents:true}}),
      this.db.quote.count({where:{tenantId}}),this.db.quote.count({where:{tenantId,status:'approved'}}),
      this.db.quote.count({where:{tenantId,status:'draft'}}),this.db.quote.count({where:{tenantId,status:'sent'}}),this.db.quote.count({where:{tenantId,status:'rejected'}}),
      this.db.quote.aggregate({where:{tenantId,status:{in:['draft','sent']}},_sum:{finalTotalCents:true}}),
      this.db.quote.findMany({where:{tenantId,status:'sent',clientDecision:null,validUntil:{gte:now,lte:soon}},include:{client:true},orderBy:{validUntil:'asc'},take:5}),
      this.db.client.count({where:{tenantId,createdAt:{gte:monthStart,lt:nextMonthStart}}}),
      this.db.client.count({where:{tenantId,createdAt:{gte:prevMonthStart,lt:monthStart}}}),
      this.db.quote.count({where:{tenantId,createdAt:{gte:monthStart,lt:nextMonthStart}}}),
      this.db.quote.count({where:{tenantId,createdAt:{gte:prevMonthStart,lt:monthStart}}}),
      this.db.quote.aggregate({where:{tenantId,status:'approved',approvedAt:{gte:monthStart,lt:nextMonthStart}},_sum:{finalTotalCents:true}}),
      this.db.quote.aggregate({where:{tenantId,status:'approved',approvedAt:{gte:prevMonthStart,lt:monthStart}},_sum:{finalTotalCents:true}}),
      this.db.project.findMany({where:{tenantId,status:{in:['scheduled','in_progress']}},include:{client:true,tasks:{where:{tenantId,status:{not:'completed'}},orderBy:{dueDate:'asc'}}},orderBy:[{endDate:'asc'},{name:'asc'}]})
    ]);
    const delta=(current:number,previous:number)=>previous===0?(current===0?0:100):Math.round((current-previous)*100/previous);
    const currentRevenue=currentMonthRevenue._sum.finalTotalCents??0;const previousRevenue=previousMonthRevenue._sum.finalTotalCents??0;
    const overdue=overdueProjects.filter((project:any)=>project.endDate&&new Date(project.endDate)<startOfToday||project.tasks?.some((task:any)=>task.dueDate&&new Date(task.dueDate)<startOfToday)).map((project:any)=>({...project,tasks:(project.tasks??[]).filter((task:any)=>task.dueDate&&new Date(task.dueDate)<startOfToday)})).slice(0,5);
    return {clients,quotes,projects,approvedRevenueCents:revenue._sum.finalTotalCents??0,openPipelineCents:openValue._sum.finalTotalCents??0,totalQuotes,approvedQuotes,pipeline:{draft:draftQuotes,sent:sentQuotes,approved:approvedQuotes,rejected:rejectedQuotes},expiringQuotes,overdueProjects:overdue,period:{currentMonth:{clients:currentMonthClients,quotes:currentMonthQuotes,approvedRevenueCents:currentRevenue},previousMonth:{clients:previousMonthClients,quotes:previousMonthQuotes,approvedRevenueCents:previousRevenue},delta:{clients:delta(currentMonthClients,previousMonthClients),quotes:delta(currentMonthQuotes,previousMonthQuotes),approvedRevenue:delta(currentRevenue,previousRevenue)}}};
  }

  clients(tenantId:string){return this.db.client.findMany({where:{tenantId},orderBy:{name:'asc'}});}
  private clientData(data:any){return {type:data.type??'individual',name:String(data.name).trim(),legalName:data.legalName?.trim()||null,document:data.document?.trim()||null,stateRegistration:data.stateRegistration?.trim()||null,municipalRegistration:data.municipalRegistration?.trim()||null,contactName:data.contactName?.trim()||null,phone:data.phone?.trim()||null,whatsapp:data.whatsapp?.trim()||null,email:data.email?.trim()||null,zipCode:data.zipCode?.trim()||null,addressLine:data.addressLine?.trim()||null,addressNumber:data.addressNumber?.trim()||null,addressComplement:data.addressComplement?.trim()||null,neighborhood:data.neighborhood?.trim()||null,city:data.city?.trim()||null,state:data.state?.trim()||null,address:[data.addressLine,data.addressNumber,data.neighborhood].filter(Boolean).join(', ')||null,notes:data.notes?.trim()||null};}
  async createClient(tenantId:string,data:any,actorUserId?:string){await this.assertLimit(tenantId,'clients');const client=await this.db.client.create({data:{tenantId,...this.clientData(data)}});await this.audit(tenantId,actorUserId,'create','client',client.id,{type:client.type,document:client.document});return client;}
  async updateClient(tenantId:string,id:string,data:any,actorUserId?:string){const client=await this.db.client.findFirst({where:{id,tenantId}});if(!client)throw new NotFoundException('Cliente não encontrado');const updated=await this.db.client.update({where:{id},data:this.clientData(data)});await this.audit(tenantId,actorUserId,'update','client',id,{type:updated.type,document:updated.document});return updated;}
  services(tenantId:string){return this.db.service.findMany({where:{tenantId},include:{team:{where:{tenantId},orderBy:{role:'asc'}},costs:{where:{tenantId},orderBy:{description:'asc'}},stages:{where:{tenantId},orderBy:{sequence:'asc'}}},orderBy:[{active:'desc'},{name:'asc'}]});}
  private normalizeServiceData(tenantId:string,data:any){
    const team=(data.team??[]).map((x:any)=>({tenantId,role:String(x.role).trim(),dailyRateCents:Number(x.dailyRateCents),included:x.included!==false}));
    const costs=(data.costs??[]).map((x:any)=>({tenantId,type:x.type,description:String(x.description).trim(),amountCents:Number(x.amountCents)}));
    const stages=(data.stages??[]).map((x:any,i:number)=>({tenantId,sequence:Number(x.sequence??i+1),description:String(x.description).trim(),duration:x.duration||null})).sort((a:any,b:any)=>a.sequence-b.sequence);
    const teamDaily=team.filter((x:any)=>x.included).reduce((sum:number,x:any)=>sum+x.dailyRateCents,0);
    const variable=costs.filter((x:any)=>x.type==='variable').reduce((sum:number,x:any)=>sum+x.amountCents,0);
    const fixed=costs.filter((x:any)=>x.type==='fixed').reduce((sum:number,x:any)=>sum+x.amountCents,0);
    return {name:String(data.name).trim(),code:data.code?.trim()||null,description:data.description?.trim()||null,category:data.category?.trim()||null,billingUnit:data.billingUnit??'daily',dailyRateCents:team.length?teamDaily:Number(data.dailyRateCents),defaultDays:Number(data.defaultDays),people:Number(data.people),variableCostCents:costs.length?variable:Number(data.variableCostCents),fixedCostCents:costs.length?fixed:Number(data.fixedCostCents),safetyMarginBps:Number(data.safetyMarginBps),active:data.active!==false,team,costs,stages};
  }
  async createService(tenantId:string,data:any,actorUserId?:string){const n=this.normalizeServiceData(tenantId,data);const service=await this.db.service.create({data:{tenantId,name:n.name,code:n.code,description:n.description,category:n.category,billingUnit:n.billingUnit,dailyRateCents:n.dailyRateCents,defaultDays:n.defaultDays,people:n.people,variableCostCents:n.variableCostCents,fixedCostCents:n.fixedCostCents,safetyMarginBps:n.safetyMarginBps,active:n.active,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages}},include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}}});await this.audit(tenantId,actorUserId,'create','service',service.id,{name:service.name});return service;}
  async updateService(tenantId:string,id:string,data:any,actorUserId?:string){const current=await this.db.service.findFirst({where:{id,tenantId}});if(!current)throw new NotFoundException('Serviço não encontrado');const n=this.normalizeServiceData(tenantId,data);const service=await this.db.$transaction(async tx=>{await Promise.all([tx.serviceTeamMember.deleteMany({where:{tenantId,serviceId:id}}),tx.serviceCost.deleteMany({where:{tenantId,serviceId:id}}),tx.serviceStage.deleteMany({where:{tenantId,serviceId:id}})]);return tx.service.update({where:{id},data:{name:n.name,code:n.code,description:n.description,category:n.category,billingUnit:n.billingUnit,dailyRateCents:n.dailyRateCents,defaultDays:n.defaultDays,people:n.people,variableCostCents:n.variableCostCents,fixedCostCents:n.fixedCostCents,safetyMarginBps:n.safetyMarginBps,active:n.active,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages}},include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}}})});await this.audit(tenantId,actorUserId,'update','service',id,{name:service.name,active:service.active});return service;}
  quotes(tenantId:string){return this.db.quote.findMany({where:{tenantId},include:{client:true,items:true},orderBy:{createdAt:'desc'}});}
  async quote(tenantId:string,id:string){const quote=await this.db.quote.findFirst({where:{tenantId,id},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}},project:true}});if(!quote)throw new NotFoundException('Orçamento não encontrado');return quote;}
  async shareQuote(tenantId:string,id:string,actorUserId?:string){const quote=await this.db.quote.findFirst({where:{id,tenantId}});if(!quote)throw new NotFoundException('Orçamento não encontrado');if(['approved','rejected'].includes(quote.status))throw new BadRequestException('Esta proposta já foi finalizada');const now=new Date();const validUntil=quote.validUntil??new Date(now.getTime()+quote.validityDays*86400000);const publicToken=quote.publicToken??randomBytes(24).toString('hex');const updated=await this.db.quote.update({where:{id},data:{publicToken,publicSharedAt:quote.publicSharedAt??now,status:'sent',sentAt:quote.sentAt??now,validUntil}});await this.audit(tenantId,actorUserId,'share','quote',id,{number:updated.number,reused:!!quote.publicToken});return {token:publicToken,path:`/p/${publicToken}`,validUntil:updated.validUntil};}
  async revokeQuoteShare(tenantId:string,id:string,actorUserId?:string){const quote=await this.db.quote.findFirst({where:{id,tenantId}});if(!quote)throw new NotFoundException('Orçamento não encontrado');if(!quote.publicToken)return {ok:true};await this.db.quote.update({where:{id},data:{publicToken:null,publicSharedAt:null}});await this.audit(tenantId,actorUserId,'revoke_share','quote',id,{number:quote.number});return {ok:true};}
  async publicProposal(token:string){const q=await this.db.quote.findUnique({where:{publicToken:token},include:{tenant:true,client:true,items:{include:{stages:{orderBy:{sequence:'asc'}}}}}});if(!q)throw new NotFoundException('Proposta não encontrada');const now=Date.now();const expired=!!q.validUntil&&q.validUntil.getTime()<now;const remainingDays=q.validUntil?Math.max(0,Math.ceil((q.validUntil.getTime()-now)/86400000)):null;return {number:q.number,status:q.status,totalCents:q.totalCents,discountBps:q.discountBps,finalTotalCents:q.finalTotalCents,validityDays:q.validityDays,notes:q.notes,sentAt:q.sentAt,validUntil:q.validUntil,expired,remainingDays,clientDecision:q.clientDecision,clientDecisionAt:q.clientDecisionAt,clientDecisionName:q.clientDecisionName,client:{name:q.client.name,type:q.client.type,legalName:q.client.legalName,document:q.client.document,city:q.client.city,state:q.client.state,addressLine:q.client.addressLine,addressNumber:q.client.addressNumber,neighborhood:q.client.neighborhood},tenant:{name:q.tenant.name,legalName:q.tenant.legalName,document:q.tenant.document,stateRegistration:q.tenant.stateRegistration,municipalRegistration:q.tenant.municipalRegistration,addressLine:q.tenant.addressLine,addressNumber:q.tenant.addressNumber,addressComplement:q.tenant.addressComplement,neighborhood:q.tenant.neighborhood,city:q.tenant.city,state:q.tenant.state,responsibleName:q.tenant.responsibleName,phone:q.tenant.phone,contactEmail:q.tenant.contactEmail,siteUrl:q.tenant.siteUrl,instagram:q.tenant.instagram,proposalText:q.tenant.proposalText,proposalPaymentTerms:q.tenant.proposalPaymentTerms,proposalFooter:q.tenant.proposalFooter,pixKey:q.tenant.pixKey,primaryColor:q.tenant.primaryColor,secondaryColor:q.tenant.secondaryColor,logoUrl:q.tenant.logoUrl},items:q.items.map(i=>({serviceName:i.serviceName,days:i.days,people:i.people,totalCents:i.totalCents,stages:i.stages.map(st=>({sequence:st.sequence,description:st.description,duration:st.duration}))}))};}
  async decidePublicProposal(token:string,decision:'approved'|'rejected',name:string){const quote=await this.db.quote.findUnique({where:{publicToken:token},include:{client:true}});if(!quote)throw new NotFoundException('Proposta não encontrada');if(quote.clientDecision||['approved','rejected'].includes(quote.status))throw new ConflictException('Esta proposta já recebeu uma resposta');if(quote.status!=='sent')throw new BadRequestException('Esta proposta ainda não está disponível para resposta');if(quote.validUntil&&quote.validUntil.getTime()<Date.now())throw new BadRequestException('Esta proposta está vencida');const now=new Date();if(decision==='approved'){await this.db.$transaction(async tx=>{await tx.quote.update({where:{id:quote.id},data:{status:'approved',approvedAt:now,clientDecision:'approved',clientDecisionAt:now,clientDecisionName:name.trim()}});await tx.project.upsert({where:{quoteId:quote.id},update:{},create:{tenantId:quote.tenantId,clientId:quote.clientId,quoteId:quote.id,name:`${quote.number} — ${quote.client.name}`}})});}else await this.db.quote.update({where:{id:quote.id},data:{status:'rejected',clientDecision:'rejected',clientDecisionAt:now,clientDecisionName:name.trim()}});await this.audit(quote.tenantId,undefined,`client_${decision}`,'quote',quote.id,{name:name.trim(),number:quote.number});return {ok:true,status:decision};}
  async projectStatuses(tenantId:string){const store=(this.db as any).projectStatus;const count=await store.count({where:{tenantId}});if(!count)await store.createMany({data:[{tenantId,key:'scheduled',name:'Agendados',color:'#C9A84C',position:0},{tenantId,key:'in_progress',name:'Em andamento',color:'#2F6B4F',position:1},{tenantId,key:'completed',name:'Concluídos',color:'#6F8C78',position:2}]});return store.findMany({where:{tenantId},orderBy:[{position:'asc'},{name:'asc'}]});}
  async createProjectStatus(tenantId:string,data:any,userId?:string){const store=(this.db as any).projectStatus;const key=data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');if(!key)throw new BadRequestException('Nome de status inválido');const exists=await store.findUnique({where:{tenantId_key:{tenantId,key}}});if(exists)throw new ConflictException('Já existe um status com este nome');const status=await store.create({data:{tenantId,key,name:data.name.trim(),color:data.color??'#2F6B4F',position:data.position??await store.count({where:{tenantId}})}});await this.audit(tenantId,userId,'create','project_status',status.id,{key,name:status.name});return status;}
  async updateProjectStatus(tenantId:string,id:string,data:any,userId?:string){const store=(this.db as any).projectStatus;const status=await store.findFirst({where:{id,tenantId}});if(!status)throw new NotFoundException('Status não encontrado');if(data.active===false){const inUse=await this.db.project.count({where:{tenantId,status:status.key}});if(inUse)throw new BadRequestException(`Este status possui ${inUse} projeto(s). Mova os projetos antes de desativar.`);}const updated=await store.update({where:{id},data:{name:data.name?.trim()??status.name,color:data.color??status.color,position:data.position??status.position,active:data.active??status.active}});await this.audit(tenantId,userId,'update','project_status',id,{name:updated.name,active:updated.active});return updated;}
  async deleteProjectStatus(tenantId:string,id:string,userId?:string){const store=(this.db as any).projectStatus;const status=await store.findFirst({where:{id,tenantId}});if(!status)throw new NotFoundException('Status não encontrado');const inUse=await this.db.project.count({where:{tenantId,status:status.key}});if(inUse)throw new BadRequestException(`Este status possui ${inUse} projeto(s). Mova os projetos antes de excluir.`);await store.delete({where:{id}});await this.audit(tenantId,userId,'delete','project_status',id,{name:status.name});return {ok:true};}
  projects(tenantId:string){return this.db.project.findMany({where:{tenantId},include:{client:true,quote:true,tasks:{where:{tenantId},orderBy:[{status:'asc'},{dueDate:'asc'},{createdAt:'asc'}]}},orderBy:{name:'asc'}});}
  async project(tenantId:string,id:string){const project=await this.db.project.findFirst({where:{id,tenantId},include:{client:true,quote:true,tasks:{where:{tenantId},orderBy:[{status:'asc'},{priority:'desc'},{dueDate:'asc'},{createdAt:'asc'}]},activityNotes:{where:{tenantId},orderBy:{createdAt:'desc'},take:30}}});if(!project)throw new NotFoundException('Projeto não encontrado');return project;}
  async quoteTimeline(tenantId:string,id:string){const quote=await this.db.quote.findFirst({where:{id,tenantId},select:{id:true,createdAt:true,updatedAt:true,sentAt:true,approvedAt:true,clientDecision:true,clientDecisionAt:true,clientDecisionName:true,status:true,version:true}});if(!quote)throw new NotFoundException('Orçamento não encontrado');const logs=await this.db.auditLog.findMany({where:{tenantId,entity:'quote',entityId:id},orderBy:{createdAt:'asc'}});const events:any[]=[{type:'created',title:'Orçamento criado',at:quote.createdAt}];for(const log of logs){const m:any=log.metadata??{};if(log.action==='update')events.push({type:'version',title:`Versão ${m.version??''} salva`.trim(),at:log.createdAt,detail:m.itemsChanged?'Serviços e valores atualizados':'Condições atualizadas'});else if(log.action==='change_status')events.push({type:'status',title:m.to==='sent'?'Proposta enviada':m.to==='rejected'?'Orçamento recusado':'Status alterado',at:log.createdAt,detail:m.to});else if(log.action==='share')events.push({type:'share',title:'Link público compartilhado',at:log.createdAt});else if(log.action==='revoke_share')events.push({type:'share',title:'Link público revogado',at:log.createdAt});else if(log.action==='approve')events.push({type:'approved',title:'Orçamento aprovado internamente',at:log.createdAt});else if(log.action==='client_approved')events.push({type:'approved',title:'Cliente aprovou a proposta',at:log.createdAt,detail:m.name});else if(log.action==='client_rejected')events.push({type:'rejected',title:'Cliente recusou a proposta',at:log.createdAt,detail:m.name});else if(log.action==='duplicate')events.push({type:'duplicate',title:'Orçamento duplicado',at:log.createdAt});}
    return events.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());}
  async quoteVersions(tenantId:string,id:string){const quote=await this.db.quote.findFirst({where:{id,tenantId},select:{id:true}});if(!quote)throw new NotFoundException('Orçamento não encontrado');return this.db.quoteVersion.findMany({where:{tenantId,quoteId:id},orderBy:{version:'desc'}});}
  private quoteSnapshot(q:any){return {clientId:q.clientId,number:q.number,status:q.status,totalCents:q.totalCents,discountBps:q.discountBps,finalTotalCents:q.finalTotalCents,validityDays:q.validityDays,notes:q.notes,sentAt:q.sentAt,approvedAt:q.approvedAt,validUntil:q.validUntil,items:(q.items??[]).map((i:any)=>({serviceName:i.serviceName,days:i.days,people:i.people,laborCents:i.laborCents,variableCents:i.variableCents,fixedCents:i.fixedCents,marginCents:i.marginCents,totalCents:i.totalCents,configurationJson:i.configurationJson,stages:i.stages??[]}))};}
  private async buildQuoteItems(tenantId:string,inputs:any[]){const items=[] as any[];for(const input of inputs){const service=await this.db.service.findFirst({where:{id:input.serviceId,tenantId,active:true},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}});if(!service)throw new NotFoundException('Serviço não encontrado ou inativo');const days=input.days??service.defaultDays,people=input.people??service.people;const calc=this.calculate({dailyRateCents:input.dailyRateCents??service.dailyRateCents,days,people,variableCostCents:input.variableCostCents??service.variableCostCents,fixedCostCents:input.fixedCostCents??service.fixedCostCents,safetyMarginBps:input.safetyMarginBps??service.safetyMarginBps});items.push({tenantId,serviceName:service.name,days,people,...calc,configurationJson:{serviceId:service.id,dailyRateCents:input.dailyRateCents??service.dailyRateCents,variableCostCents:input.variableCostCents??service.variableCostCents,fixedCostCents:input.fixedCostCents??service.fixedCostCents,safetyMarginBps:input.safetyMarginBps??service.safetyMarginBps},stages:{create:service.stages.map(st=>({tenantId,sequence:st.sequence,description:st.description,duration:st.duration}))}});}return items;}
  async updateQuote(tenantId:string,id:string,data:any,actorUserId?:string){
    const quote=await this.db.quote.findFirst({where:{id,tenantId},include:{items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}}}});
    if(!quote)throw new NotFoundException('Orçamento não encontrado');
    if(quote.status!=='draft')throw new BadRequestException('Somente orçamentos em rascunho podem ser editados');
    const nextDiscount=data.discountBps??quote.discountBps;const nextValidity=data.validityDays??quote.validityDays;const nextNotes=data.notes===undefined?quote.notes:data.notes;
    const newItems=data.items?await this.buildQuoteItems(tenantId,data.items):null;const totalCents=newItems?newItems.reduce((sum:number,i:any)=>sum+i.totalCents,0):quote.totalCents;const finalTotalCents=Math.round(totalCents*(10000-nextDiscount)/10000);
    const updated=await this.db.$transaction(async tx=>{await tx.quoteVersion.create({data:{tenantId,quoteId:id,version:quote.version,snapshot:this.quoteSnapshot(quote),createdById:actorUserId}});if(newItems)await tx.quoteItem.deleteMany({where:{tenantId,quoteId:id}});return tx.quote.update({where:{id},data:{discountBps:nextDiscount,validityDays:nextValidity,notes:nextNotes,totalCents,finalTotalCents,version:{increment:1},publicToken:null,publicSharedAt:null,clientDecision:null,clientDecisionAt:null,clientDecisionName:null,...(newItems?{items:{create:newItems}}:{})},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}},project:true}});});
    await this.audit(tenantId,actorUserId,'update','quote',id,{version:updated.version,itemsChanged:!!newItems});return updated;
  }
  async duplicateQuote(tenantId:string,id:string,actorUserId?:string){await this.assertLimit(tenantId,'quotes');const source=await this.db.quote.findFirst({where:{id,tenantId},include:{client:true,items:{where:{tenantId},include:{stages:{where:{tenantId},orderBy:{sequence:'asc'}}}}}});if(!source)throw new NotFoundException('Orçamento não encontrado');const year=new Date().getFullYear();const seq=await this.db.quoteSequence.upsert({where:{tenantId_year:{tenantId,year}},create:{tenantId,year,lastNumber:1},update:{lastNumber:{increment:1}}});const duplicated=await this.db.quote.create({data:{tenantId,clientId:source.clientId,number:`ORC-${year}-${String(seq.lastNumber).padStart(3,'0')}`,status:'draft',totalCents:source.totalCents,discountBps:source.discountBps,finalTotalCents:source.finalTotalCents,validityDays:source.validityDays,notes:source.notes,items:{create:source.items.map(i=>({tenantId,serviceName:i.serviceName,days:i.days,people:i.people,laborCents:i.laborCents,variableCents:i.variableCents,fixedCents:i.fixedCents,marginCents:i.marginCents,totalCents:i.totalCents,configurationJson:i.configurationJson??undefined,stages:{create:i.stages.map(st=>({tenantId,sequence:st.sequence,description:st.description,duration:st.duration,completed:false}))}}))}},include:{client:true,items:true}});await this.audit(tenantId,actorUserId,'duplicate','quote',duplicated.id,{sourceQuoteId:id,sourceNumber:source.number,number:duplicated.number});return duplicated;}
  async createQuote(tenantId:string,data:any,actorUserId?:string){await this.assertLimit(tenantId,'quotes');const client=await this.db.client.findFirst({where:{id:data.clientId,tenantId}});if(!client)throw new NotFoundException('Cliente não encontrado');const items=await this.buildQuoteItems(tenantId,data.items);const totalCents=items.reduce((sum:number,i:any)=>sum+i.totalCents,0);const discountBps=Math.max(0,Math.min(10000,Number(data.discountBps??0)));const finalTotalCents=Math.round(totalCents*(10000-discountBps)/10000);const year=new Date().getFullYear();const seq=await this.db.quoteSequence.upsert({where:{tenantId_year:{tenantId,year}},create:{tenantId,year,lastNumber:1},update:{lastNumber:{increment:1}}});const quote=await this.db.quote.create({data:{tenantId,clientId:client.id,number:`ORC-${year}-${String(seq.lastNumber).padStart(3,'0')}`,totalCents,discountBps,finalTotalCents,validityDays:Number(data.validityDays??30),notes:data.notes,items:{create:items}},include:{client:true,items:{include:{stages:true}}}});await this.audit(tenantId,actorUserId,'create','quote',quote.id,{number:quote.number,finalTotalCents});return quote;}
  async updateQuoteStatus(tenantId:string,id:string,status:string,actorUserId?:string){const quote=await this.db.quote.findFirst({where:{id,tenantId}});if(!quote)throw new NotFoundException('Orçamento não encontrado');if(quote.clientDecision)throw new BadRequestException('A decisão registrada pelo cliente não pode ser reaberta');const allowed:any={draft:['sent'],sent:['draft','rejected'],rejected:['draft']};if(!allowed[quote.status]?.includes(status))throw new BadRequestException(`Não é possível alterar orçamento ${quote.status} para ${status}`);const now=new Date();const validUntil=status==='sent'?new Date(now.getTime()+quote.validityDays*86400000):quote.validUntil;const updated=await this.db.quote.update({where:{id},data:{status,sentAt:status==='sent'?now:quote.sentAt,validUntil:status==='sent'?validUntil:quote.validUntil}});await this.audit(tenantId,actorUserId,'change_status','quote',id,{from:quote.status,to:status});return updated;}
  async updateProject(tenantId:string,id:string,data:any,actorUserId?:string){const project=await this.db.project.findFirst({where:{id,tenantId}});if(!project)throw new NotFoundException('Projeto não encontrado');const progress=data.progress===undefined?project.progress:Math.min(100,Math.max(0,data.progress));const status=data.status??project.status;const normalizedProgress=status==='completed'?100:progress;const updated=await this.db.project.update({where:{id},data:{status,progress:normalizedProgress,notes:data.notes??project.notes,startDate:data.startDate?new Date(data.startDate):project.startDate,endDate:data.endDate?new Date(data.endDate):project.endDate},include:{client:true,quote:true,tasks:{where:{tenantId},orderBy:{createdAt:'asc'}}}});await this.audit(tenantId,actorUserId,'update','project',id,{status:updated.status,progress:updated.progress});return updated;}
  async createProjectNote(tenantId:string,projectId:string,content:string,actorUserId?:string){const project=await this.db.project.findFirst({where:{id:projectId,tenantId}});if(!project)throw new NotFoundException('Projeto não encontrado');const author=actorUserId?await this.db.user.findFirst({where:{id:actorUserId,tenantId},select:{name:true}}):null;const note=await this.db.projectNote.create({data:{tenantId,projectId,authorUserId:actorUserId,authorName:author?.name,content:content.trim()}});await this.audit(tenantId,actorUserId,'create_note','project',projectId,{noteId:note.id});return note;}
  async createProjectTask(tenantId:string,projectId:string,data:any,actorUserId?:string){const project=await this.db.project.findFirst({where:{id:projectId,tenantId}});if(!project)throw new NotFoundException('Projeto não encontrado');const task=await this.db.projectTask.create({data:{tenantId,projectId,title:data.title.trim(),description:data.description,priority:data.priority??'medium',dueDate:data.dueDate?new Date(data.dueDate):undefined}});await this.audit(tenantId,actorUserId,'create','project_task',task.id,{projectId,title:task.title});return task;}
  async updateProjectTask(tenantId:string,projectId:string,taskId:string,data:any,actorUserId?:string){const task=await this.db.projectTask.findFirst({where:{id:taskId,projectId,tenantId}});if(!task)throw new NotFoundException('Tarefa não encontrada');const status=data.status??task.status;const updated=await this.db.projectTask.update({where:{id:taskId},data:{title:data.title??task.title,description:data.description??task.description,status,priority:data.priority??task.priority,dueDate:data.dueDate?new Date(data.dueDate):task.dueDate,completedAt:status==='completed'?(task.completedAt??new Date()):null}});const [total,done]=await Promise.all([this.db.projectTask.count({where:{projectId,tenantId}}),this.db.projectTask.count({where:{projectId,tenantId,status:'completed'}})]);if(total>0)await this.db.project.update({where:{id:projectId},data:{progress:Math.round(done*100/total),status:done===total?'completed':'in_progress'}});await this.audit(tenantId,actorUserId,'update','project_task',taskId,{projectId,status});return updated;}
  async approve(tenantId:string,id:string,actorUserId?:string){const quote=await this.db.quote.findFirst({where:{id,tenantId},include:{client:true}});if(!quote)throw new NotFoundException('Orçamento não encontrado');if(!['draft','sent','approved'].includes(quote.status))throw new BadRequestException('Transição de status inválida');const q=await this.db.$transaction(async tx=>{const updated=await tx.quote.update({where:{id},data:{status:'approved',approvedAt:quote.approvedAt??new Date()}});await tx.project.upsert({where:{quoteId:id},update:{},create:{tenantId,clientId:quote.clientId,quoteId:id,name:`${quote.number} — ${quote.client.name}`}});return updated;});await this.audit(tenantId,actorUserId,'approve','quote',id,{number:quote.number});return q;}

  calendar(tenantId:string){const from=new Date();from.setMonth(from.getMonth()-1);const to=new Date();to.setMonth(to.getMonth()+6);return this.db.calendarEvent.findMany({where:{tenantId,startAt:{gte:from,lte:to}},orderBy:{startAt:'asc'}});}
  async createCalendarEvent(tenantId:string,userId:string,data:any){
    const startAt=new Date(data.startAt);const endAt=data.endAt?new Date(data.endAt):null;
    if(Number.isNaN(startAt.getTime())||endAt&&Number.isNaN(endAt.getTime()))throw new BadRequestException('Data do compromisso inválida');
    if(endAt&&endAt<startAt)throw new BadRequestException('O término deve ser posterior ao início');
    if(data.clientId&&!await this.db.client.findFirst({where:{id:data.clientId,tenantId}}))throw new NotFoundException('Cliente não encontrado');
    if(data.projectId&&!await this.db.project.findFirst({where:{id:data.projectId,tenantId}}))throw new NotFoundException('Projeto não encontrado');
    const event=await this.db.calendarEvent.create({data:{tenantId,createdById:userId,title:data.title.trim(),description:data.description?.trim()||null,type:data.type,startAt,endAt,allDay:!!data.allDay,location:data.location?.trim()||null,recurrence:data.recurrence??'none',reminderMinutes:data.reminderMinutes??60,clientId:data.clientId||null,projectId:data.projectId||null}});
    await this.audit(tenantId,userId,'create','calendar_event',event.id,{title:event.title,startAt:event.startAt});return event;
  }
  async cancelCalendarEvent(tenantId:string,id:string,userId:string){const event=await this.db.calendarEvent.findFirst({where:{id,tenantId}});if(!event)throw new NotFoundException('Compromisso não encontrado');const updated=await this.db.calendarEvent.update({where:{id},data:{status:'cancelled'}});await this.audit(tenantId,userId,'cancel','calendar_event',id,{title:event.title});return updated;}
  async updateCalendarEvent(tenantId:string,id:string,userId:string,data:any){
    const event=await this.db.calendarEvent.findFirst({where:{id,tenantId}});if(!event)throw new NotFoundException('Compromisso não encontrado');
    const startAt=data.startAt===undefined?event.startAt:new Date(data.startAt);const endAt=data.endAt===undefined?event.endAt:(data.endAt?new Date(data.endAt):null);
    if(Number.isNaN(startAt.getTime())||endAt&&Number.isNaN(endAt.getTime()))throw new BadRequestException('Data do compromisso inválida');
    if(endAt&&endAt<startAt)throw new BadRequestException('O término deve ser posterior ao início');
    if(data.clientId&&!await this.db.client.findFirst({where:{id:data.clientId,tenantId}}))throw new NotFoundException('Cliente não encontrado');
    if(data.projectId&&!await this.db.project.findFirst({where:{id:data.projectId,tenantId}}))throw new NotFoundException('Projeto não encontrado');
    const updated=await this.db.calendarEvent.update({where:{id},data:{...(data.title!==undefined?{title:data.title.trim()}:{}),...(data.description!==undefined?{description:data.description?.trim()||null}:{}),...(data.type!==undefined?{type:data.type}:{}),...(data.startAt!==undefined?{startAt}:{}),...(data.endAt!==undefined?{endAt}:{}),...(data.allDay!==undefined?{allDay:data.allDay}:{}),...(data.location!==undefined?{location:data.location?.trim()||null}:{}),...(data.recurrence!==undefined?{recurrence:data.recurrence}:{}),...(data.reminderMinutes!==undefined?{reminderMinutes:data.reminderMinutes}:{}),...(data.clientId!==undefined?{clientId:data.clientId||null}:{}),...(data.projectId!==undefined?{projectId:data.projectId||null}:{}),...(data.status!==undefined?{status:data.status}:{}),}});
    await this.audit(tenantId,userId,'update','calendar_event',id,{title:updated.title,startAt:updated.startAt});return updated;
  }
  private async syncNotifications(tenantId:string,userId:string){
    const prefs=await this.notificationPreferences(tenantId,userId);const now=new Date();const horizon=new Date(now.getTime()+7*86400000);
    const [events,tasks,quotes]=await Promise.all([
      prefs.agendaReminders?this.db.calendarEvent.findMany({where:{tenantId,status:'active',startAt:{gte:now,lte:horizon}}}):[],
      prefs.taskDeadlines?this.db.projectTask.findMany({where:{tenantId,status:{not:'completed'},dueDate:{gte:now,lte:horizon}},include:{project:true}}):[],
      prefs.quoteExpirations?this.db.quote.findMany({where:{tenantId,status:'sent',validUntil:{gte:now,lte:horizon}}}):[]
    ]);
    const rows=[
      ...events.map((x:any)=>({key:`calendar:${x.id}:${x.startAt.toISOString()}`,type:'agenda',title:`Compromisso: ${x.title}`,message:`Agendado para ${x.startAt.toLocaleString('pt-BR')}`,route:'/calendar',entityId:x.id})),
      ...tasks.map((x:any)=>({key:`task:${x.id}:${x.dueDate.toISOString()}`,type:'task_due',title:`Prazo: ${x.title}`,message:x.project?.name,route:`/project/${x.projectId}`,entityId:x.id})),
      ...quotes.map((x:any)=>({key:`quote:${x.id}:${x.validUntil.toISOString()}`,type:'quote_expiring',title:`Proposta ${x.number} próxima do vencimento`,message:`Válida até ${x.validUntil.toLocaleDateString('pt-BR')}`,route:`/quote/${x.id}`,entityId:x.id}))
    ];
    await Promise.all(rows.map(row=>this.db.userNotification.upsert({where:{userId_key:{userId,key:row.key}},update:{title:row.title,message:row.message,route:row.route},create:{tenantId,userId,...row}})));
  }
  async notifications(tenantId:string,userId:string){await this.syncNotifications(tenantId,userId);return this.db.userNotification.findMany({where:{tenantId,userId,archivedAt:null},orderBy:{createdAt:'desc'},take:100});}
  async unreadNotifications(tenantId:string,userId:string){await this.syncNotifications(tenantId,userId);return {count:await this.db.userNotification.count({where:{tenantId,userId,readAt:null,archivedAt:null}})};}
  async readNotification(tenantId:string,userId:string,id:string){const result=await this.db.userNotification.updateMany({where:{id,tenantId,userId},data:{readAt:new Date()}});if(!result.count)throw new NotFoundException('Notificação não encontrada');return {ok:true};}
  async readAllNotifications(tenantId:string,userId:string){await this.db.userNotification.updateMany({where:{tenantId,userId,readAt:null},data:{readAt:new Date()}});return {ok:true};}
  notificationPreferences(tenantId:string,userId:string){return this.db.notificationPreference.upsert({where:{userId},update:{},create:{tenantId,userId}});}
  updateNotificationPreferences(tenantId:string,userId:string,data:any){return this.db.notificationPreference.upsert({where:{userId},update:data,create:{tenantId,userId,...data}});}
  private async assertLimit(tenantId:string,resource:'clients'|'quotes'){const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});if(!tenant)throw new NotFoundException('Tenant não encontrada');const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});if(!limit)return;if(resource==='clients'&&limit.maxClients>=0&&await this.db.client.count({where:{tenantId,active:true}})>=limit.maxClients)throw new BadRequestException('Limite de clientes do plano atingido');if(resource==='quotes'&&limit.maxQuotesPerMonth>=0){const start=new Date();start.setDate(1);start.setHours(0,0,0,0);if(await this.db.quote.count({where:{tenantId,createdAt:{gte:start}}})>=limit.maxQuotesPerMonth)throw new BadRequestException('Limite mensal de orçamentos atingido');}}
}
