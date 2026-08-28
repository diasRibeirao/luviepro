import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from './prisma.service';
import { MailService } from './mail.service';
import { RedisService } from './redis.service';
import { isBillingPeriod, isPlanCode, periodEnd, periodPrice, planRank } from './plan-policy';
import { entitlementSnapshot } from './entitlements';
import { BillingService } from './modules/billing/billing.service';
import { SubscriptionService } from './modules/billing/subscription.service';
import { AUTH_SECURITY } from './modules/auth/auth-security';
import { AuthService } from './modules/auth/auth.service';
import { AuthSessionService } from './modules/auth/auth-session.service';
import { AccessManagementService } from './modules/access/access-management.service';
import { ProjectsCalendarService } from './modules/projects/projects-calendar.service';
import { QuotesService } from './modules/quotes/quotes.service';
import { ClientsService } from './modules/clients/clients.service';
import { CreateClientDto, UpdateClientDto } from './modules/clients/dto/clients.dto';
import { ServicesService } from './modules/services/services.service';
import { CreateServiceDto, UpdateServiceDto } from './modules/services/dto/services.dto';
type Calc={dailyRateCents:number;days:number;people:number;variableCostCents:number;fixedCostCents:number;safetyMarginBps:number;variableCostMode?:string};
type AuditLogFilters={action?:string;entity?:string;actorUserId?:string;search?:string;from?:string;to?:string;limit?:number};
@Injectable() export class ApiService {
  constructor(private db:PrismaService,private jwt:JwtService,private mail:MailService,@Optional() private redis?:RedisService,@Optional() private billing?:BillingService,@Optional() private subscriptions?:SubscriptionService,@Optional() private auth?:AuthService,@Optional() private authSessions?:AuthSessionService,@Optional() private accessManagement?:AccessManagementService,@Optional() private projectsCalendar?:ProjectsCalendarService,@Optional() private quotesDomain?:QuotesService,@Optional() private clientsDomain?:ClientsService,@Optional() private servicesDomain?:ServicesService){}
  private subscriptionService(){return this.subscriptions??new SubscriptionService(this.db);}
  private billingService(){return this.billing??new BillingService(this.db,this.subscriptionService(),this.redis);}
  private sessionService(){return this.authSessions??new AuthSessionService(this.db,this.jwt,this.subscriptionService());}
  private authService(){return this.auth??new AuthService(this.db,this.mail,this.sessionService());}
  private accessService(){return this.accessManagement??new AccessManagementService(this.db,this.mail,this.sessionService());}
  private projectsService(){return this.projectsCalendar??new ProjectsCalendarService(this.db);}
  private quotesService(){return this.quotesDomain??new QuotesService(this.db);}
  private clientsService(){return this.clientsDomain??new ClientsService(this.db);}
  private servicesService(){return this.servicesDomain??new ServicesService(this.db);}
  private issueSession(u:any){return this.sessionService().issueTenant(u);}
  private invitationHash(token:string){return createHash('sha256').update(token).digest('hex');}
  private invitationUrl(token:string){const base=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');return `${base}/invite/${encodeURIComponent(token)}`;}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entity:string,entityId?:string,metadata?:any){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity,entityId,metadata}}).catch(()=>undefined);
  }
  calculate(x:Calc){for(const v of Object.values(x))if(typeof v==='number'&&(!Number.isInteger(v)||v<0))throw new BadRequestException('Use inteiros não negativos; dinheiro em centavos.');const laborCents=x.dailyRateCents*x.days;const mode=x.variableCostMode??'per_day';const variableCents=mode==='fixed'?x.variableCostCents:mode==='per_person'?x.variableCostCents*x.people:mode==='per_person_day'?x.variableCostCents*x.people*x.days:x.variableCostCents*x.days;const subtotal=laborCents+variableCents+x.fixedCostCents;const marginCents=Math.round(x.dailyRateCents*x.safetyMarginBps/10000);return {laborCents,variableCents,fixedCents:x.fixedCostCents,marginCents,totalCents:subtotal+marginCents};}
  login(email:string,password:string){return this.authService().login(email,password);}
  platformLogin(email:string,password:string){return this.authService().platformLogin(email,password);}
  async platformOverview(){const now=new Date();const [tenants,activeTenants,users,clients,subscriptions,monthlyRevenue]=await Promise.all([this.db.tenant.count(),this.db.tenant.count({where:{status:'active'}}),this.db.user.count({where:{active:true}}),this.db.client.count({where:{active:true}}),this.db.subscription.count({where:{status:{in:['active','trial']}}}),this.db.subscription.aggregate({where:{status:{in:['active','trial']},period:'monthly'},_sum:{amountCents:true}})]);return {tenants,activeTenants,users,clients,subscriptions,monthlyRevenueCents:monthlyRevenue._sum.amountCents??0};}
  async platformTenants(){const rows=await this.db.tenant.findMany({select:{id:true,name:true,slug:true,plan:true,planPeriod:true,status:true,subscriptionExpiresAt:true,createdAt:true,_count:{select:{users:true,clients:true,subscriptions:true}},subscriptions:{where:{status:'scheduled'},select:{id:true,plan:true,period:true,startsAt:true,expiresAt:true,amountCents:true},orderBy:{startsAt:'asc'},take:1}},orderBy:{createdAt:'desc'}});return rows.map(({subscriptions,...tenant})=>({...tenant,scheduledSubscription:subscriptions[0]??null}));}
  async platformSubscriptions(){return this.db.subscription.findMany({select:{id:true,plan:true,period:true,amountCents:true,status:true,startsAt:true,expiresAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:200});}
  async platformPayments(){return this.db.payment.findMany({select:{id:true,provider:true,providerPaymentId:true,plan:true,period:true,amountCents:true,status:true,paymentMethod:true,paidAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:300});}
  async platformUsers(){return this.db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}},orderBy:{createdAt:'desc'},take:500});}
  async platformPlans(){return this.db.planLimit.findMany({orderBy:{monthlyPriceCents:'asc'}});}
  async platformChangeTenant(id:string,data:any){const tenant=await this.db.tenant.findUnique({where:{id}});if(!tenant)throw new NotFoundException('Empresa não encontrada');const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';if(data.plan&&planRank(plan)<planRank(tenant.plan)&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt.getTime()>Date.now()){const existing=await this.db.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});if(existing)throw new ConflictException('Já existe uma alteração de plano agendada para esta empresa');const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit)throw new BadRequestException('Plano indisponível');const startsAt=tenant.subscriptionExpiresAt,expiresAt=periodEnd(startsAt,period),subscription=await this.db.subscription.create({data:{tenantId:id,plan,period,amountCents:periodPrice(limit,period),status:'scheduled',startsAt,expiresAt}});await this.audit(id,undefined,'platform_schedule_downgrade','subscription',subscription.id,{plan,period,effectiveAt:startsAt});return {...tenant,scheduledSubscription:subscription};}return this.platformUpdateTenant(id,data);}
  async platformCancelScheduledChange(id:string){const scheduled=await this.db.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});if(!scheduled)throw new NotFoundException('Nenhuma alteração agendada para esta empresa');const cancelled=await this.db.subscription.update({where:{id:scheduled.id},data:{status:'cancelled'}});await this.audit(id,undefined,'platform_cancel_scheduled_change','subscription',scheduled.id,{plan:scheduled.plan,period:scheduled.period});return {ok:true,subscription:cancelled};}
  async platformCreateTenant(data:any,platformAdminId:string){
    const email=String(data.ownerEmail??'').trim().toLowerCase(),company=String(data.company??'').trim(),ownerName=String(data.ownerName??'').trim();
    if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
    const pending=await this.db.userInvitation.findFirst({where:{email,status:'pending',expiresAt:{gt:new Date()}}});
    if(pending)throw new ConflictException('Já existe um convite pendente para este e-mail');
    const limit=await this.db.planLimit.findUnique({where:{plan:data.plan}});if(!limit)throw new BadRequestException('Plano indisponível');
    const amountCents=data.period==='annual'?limit.annualPriceCents:data.period==='semiannual'?limit.semiannualPriceCents:data.period==='quarterly'?limit.quarterlyPriceCents:limit.monthlyPriceCents;
    const now=new Date(),trialEnd=new Date(now);trialEnd.setDate(trialEnd.getDate()+14);
    const slug=`${company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'empresa'}-${Date.now().toString(36)}`;
    const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+Number(process.env.INVITATION_TTL_HOURS||48)*3600000);
    const result=await this.db.$transaction(async tx=>{
      const tenant=await tx.tenant.create({data:{name:company,slug,responsibleName:ownerName,phone:data.phone||null,contactEmail:email,plan:data.plan,planPeriod:data.period,subscriptionExpiresAt:trialEnd}});
      await tx.subscription.create({data:{tenantId:tenant.id,plan:data.plan,period:data.period,amountCents,status:'trial',startsAt:now,expiresAt:trialEnd}});
      const invitation=await tx.userInvitation.create({data:{tenantId:tenant.id,name:ownerName,email,role:'owner',tokenHash:this.invitationHash(token),expiresAt},select:{id:true,email:true,name:true,expiresAt:true}});
      return {tenant,invitation};
    });
    const inviteUrl=this.invitationUrl(token);let delivery:any={sent:false,reason:'not_configured'};
    try{delivery=await this.mail.sendUserInvitation({to:email,name:ownerName,tenantName:company,roleLabel:'Proprietário',inviteUrl,expiresAt});}catch{delivery={sent:false,reason:'send_failed'};}
    await this.audit(result.tenant.id,undefined,'platform_create_tenant','tenant',result.tenant.id,{platformAdminId,plan:data.plan,period:data.period,email,delivery:delivery.sent?'sent':delivery.reason});
    return {tenant:result.tenant,invitation:{...result.invitation,delivery,inviteUrl}};
  }
  async platformUpdateTenant(id:string,data:any){const tenant=await this.db.tenant.findUnique({where:{id}});if(!tenant)throw new NotFoundException('Empresa não encontrada');const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit)throw new BadRequestException('Plano indisponível');const amountCents=period==='annual'?limit.annualPriceCents:period==='semiannual'?limit.semiannualPriceCents:period==='quarterly'?limit.quarterlyPriceCents:limit.monthlyPriceCents;const updated=await this.db.$transaction(async tx=>{const result=await tx.tenant.update({where:{id},data:{...(data.status!==undefined&&{status:data.status}),...(data.plan!==undefined&&{plan:data.plan}),...(data.planPeriod!==undefined&&{planPeriod:data.planPeriod})}});if(data.plan!==undefined||data.planPeriod!==undefined){const current=await tx.subscription.findFirst({where:{tenantId:id,status:{in:['active','trial']},expiresAt:{gte:new Date()}},orderBy:{expiresAt:'desc'}});if(current)await tx.subscription.update({where:{id:current.id},data:{plan,period,amountCents}});else{const startsAt=new Date(),expiresAt=new Date(startsAt);expiresAt.setDate(expiresAt.getDate()+14);await tx.subscription.create({data:{tenantId:id,plan,period,amountCents,status:'active',startsAt,expiresAt}})}}return result});await this.audit(id,undefined,'platform_update_tenant','tenant',id,{...data,amountCents});return updated;}
  async platformUpdateUser(id:string,data:any){const user=await this.db.user.findUnique({where:{id}});if(!user)throw new NotFoundException('Usuário não encontrado');const updated=await this.db.$transaction(async tx=>{const result=await tx.user.update({where:{id},data:{...(data.active!==undefined&&{active:data.active}),...(data.role!==undefined&&{role:data.role})},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}}});if(data.active===false)await tx.authSession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date(),revokedReason:'user_deactivated'}});return result;});await this.audit(user.tenantId,undefined,'platform_update_user','user',id,data);return updated;}
  async platformPasswordReset(id:string){const user=await this.db.user.findUnique({where:{id}});if(!user)throw new NotFoundException('Usuário não encontrado');if(!user.active)throw new BadRequestException('Ative o usuário antes de enviar a recuperação de senha');return this.forgotPassword(user.email);}
  async platformUpdatePlan(plan:string,data:any){if(!isPlanCode(plan))throw new BadRequestException('Plano inválido');const current=await this.db.planLimit.findUnique({where:{plan}});if(!current)throw new NotFoundException('Plano não encontrado');return this.db.planLimit.update({where:{plan},data});}
  refresh(refreshToken:string){return this.authService().refresh(refreshToken);}
  logout(userId:string,tenantId:string,sessionId?:string){return this.authService().logout(userId,tenantId,sessionId);}
  listAuthSessions(userId:string,tenantId:string,currentSessionId?:string){return this.sessionService().listTenantSessions(userId,tenantId,currentSessionId);}
  revokeAuthSession(userId:string,tenantId:string,targetSessionId:string){return this.sessionService().revokeTenantSession(userId,tenantId,targetSessionId);}
  revokeOtherAuthSessions(userId:string,tenantId:string,currentSessionId?:string){return this.sessionService().revokeOtherTenantSessions(userId,tenantId,currentSessionId);}
  forgotPassword(email:string){return this.authService().forgotPassword(email);}
  resetPassword(token:string,password:string){return this.authService().resetPassword(token,password);}
  register(data:any){return this.authService().register(data);}
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
    const entitlements=entitlementSnapshot(limit,{clients,quotes,users,pendingInvitations});
    return {tenant,limit,currentUser,usage:entitlements.usage,features:entitlements.features,entitlements};
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
  async changePassword(tenantId:string,userId:string,currentPassword:string,newPassword:string){const user=await this.db.user.findFirst({where:{id:userId,tenantId}});if(!user||!await compare(currentPassword,user.passwordHash))throw new BadRequestException('Senha atual inválida');if(currentPassword===newPassword)throw new BadRequestException('A nova senha deve ser diferente da atual');const now=new Date();await this.db.$transaction(async tx=>{await tx.user.update({where:{id:userId},data:{passwordHash:await hash(newPassword,AUTH_SECURITY.bcryptRounds),passwordChangedAt:now,failedLoginAttempts:0,lockedUntil:null}});await tx.authSession.updateMany({where:{userId,tenantId,revokedAt:null},data:{revokedAt:now,revokedReason:'password_changed'}});});await this.audit(tenantId,userId,'change_password','user',userId);return {ok:true};}

  async updatePlan(tenantId:string,plan:string,period='monthly',actorUserId?:string){
    if(!isPlanCode(plan))throw new BadRequestException('Plano inválido');
    if(!isBillingPeriod(period))throw new BadRequestException('Período inválido');
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
  private activateScheduledSubscriptionIfDue(tenantId:string,currentTenant?:any){return this.subscriptionService().activateScheduledIfDue(tenantId,currentTenant);}
  billingPayments(tenantId:string){return this.billingService().payments(tenantId);}
  reconcileMercadoPagoReturn(tenantId:string,providerPaymentId:string,actorUserId?:string){return this.billingService().reconcileReturn(tenantId,providerPaymentId,actorUserId);}
  createCheckout(tenantId:string,actorUserId:string,plan:string,period:string){return this.billingService().createCheckout(tenantId,actorUserId,plan,period);}
  mercadoPagoWebhook(body:any,dataId?:string,signature?:string,requestId?:string){return this.billingService().webhook(body,dataId,signature,requestId);}
  reconcilePayment(tenantId:string,id:string,actorUserId:string){return this.billingService().reconcile(tenantId,id,actorUserId);}
  billingMetrics(tenantId:string){return this.billingService().metrics(tenantId);}
  users(tenantId:string){return this.accessService().users(tenantId);}
  accessProfiles(tenantId:string){return this.accessService().accessProfiles(tenantId);}
  createAccessProfile(tenantId:string,data:any,actorUserId:string){return this.accessService().createAccessProfile(tenantId,data,actorUserId);}
  updateAccessProfile(tenantId:string,id:string,data:any,actorUserId:string){return this.accessService().updateAccessProfile(tenantId,id,data,actorUserId);}
  userInvitations(tenantId:string){return this.accessService().userInvitations(tenantId);}
  createUser(tenantId:string,data:any,actorUserId:string){return this.accessService().createUser(tenantId,data,actorUserId);}
  resendUserInvitation(tenantId:string,id:string,actorUserId:string){return this.accessService().resendUserInvitation(tenantId,id,actorUserId);}
  cancelUserInvitation(tenantId:string,id:string,actorUserId:string){return this.accessService().cancelUserInvitation(tenantId,id,actorUserId);}
  invitationInfo(token:string){return this.accessService().invitationInfo(token);}
  acceptInvitation(token:string,password:string){return this.accessService().acceptInvitation(token,password);}
  updateUser(tenantId:string,id:string,data:any,actorUserId:string){return this.accessService().updateUser(tenantId,id,data,actorUserId);}

  async auditLogs(tenantId:string,filters:AuditLogFilters={}){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;if(!limit?.auditAccess)throw new ForbiddenException('Histórico de atividades disponível no plano Business');
    const where:any={tenantId};
    if(filters.action)where.action=String(filters.action);
    if(filters.entity)where.entity=String(filters.entity);
    if(filters.actorUserId)where.actorUserId=String(filters.actorUserId);
    const from=filters.from?new Date(String(filters.from)):null,to=filters.to?new Date(String(filters.to)):null;
    if(from&&!Number.isNaN(from.getTime())||to&&!Number.isNaN(to.getTime())){where.createdAt={};if(from&&!Number.isNaN(from.getTime()))where.createdAt.gte=from;if(to&&!Number.isNaN(to.getTime())){to.setHours(23,59,59,999);where.createdAt.lte=to;}}
    const take=Math.min(500,Math.max(1,Number(filters.limit)||200));
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

  clients(tenantId:string){return this.clientsService().list(tenantId);}

  createClient(tenantId:string,data:CreateClientDto,actorUserId?:string){return this.clientsService().create(tenantId,data,actorUserId);}
  updateClient(tenantId:string,id:string,data:UpdateClientDto,actorUserId?:string){return this.clientsService().update(tenantId,id,data,actorUserId);}
  services(tenantId:string){return this.servicesService().list(tenantId);}

  createService(tenantId:string,data:CreateServiceDto,actorUserId?:string){return this.servicesService().create(tenantId,data,actorUserId);}
  updateService(tenantId:string,id:string,data:UpdateServiceDto,actorUserId?:string){return this.servicesService().update(tenantId,id,data,actorUserId);}
  quotes(tenantId:string){return this.quotesService().quotes(tenantId);}
  quote(tenantId:string,id:string){return this.quotesService().quote(tenantId,id);}
  shareQuote(tenantId:string,id:string,actorUserId?:string){return this.quotesService().shareQuote(tenantId,id,actorUserId);}
  revokeQuoteShare(tenantId:string,id:string,actorUserId?:string){return this.quotesService().revokeQuoteShare(tenantId,id,actorUserId);}
  publicProposal(token:string){return this.quotesService().publicProposal(token);}
  decidePublicProposal(token:string,decision:'approved'|'rejected',name:string){return this.quotesService().decidePublicProposal(token,decision,name);}
  projectStatuses(tenantId:string){return this.projectsService().projectStatuses(tenantId);}
  createProjectStatus(tenantId:string,data:any,userId?:string){return this.projectsService().createProjectStatus(tenantId,data,userId);}
  updateProjectStatus(tenantId:string,id:string,data:any,userId?:string){return this.projectsService().updateProjectStatus(tenantId,id,data,userId);}
  deleteProjectStatus(tenantId:string,id:string,userId?:string){return this.projectsService().deleteProjectStatus(tenantId,id,userId);}
  projects(tenantId:string){return this.projectsService().projects(tenantId);}
  project(tenantId:string,id:string){return this.projectsService().project(tenantId,id);}
  quoteTimeline(tenantId:string,id:string){return this.quotesService().quoteTimeline(tenantId,id);}
  quoteVersions(tenantId:string,id:string){return this.quotesService().quoteVersions(tenantId,id);}


  updateQuote(tenantId:string,id:string,data:any,actorUserId?:string){return this.quotesService().updateQuote(tenantId,id,data,actorUserId);}
  duplicateQuote(tenantId:string,id:string,actorUserId?:string){return this.quotesService().duplicateQuote(tenantId,id,actorUserId);}
  createQuote(tenantId:string,data:any,actorUserId?:string){return this.quotesService().createQuote(tenantId,data,actorUserId);}
  updateQuoteStatus(tenantId:string,id:string,status:string,actorUserId?:string){return this.quotesService().updateQuoteStatus(tenantId,id,status,actorUserId);}
  updateProject(tenantId:string,id:string,data:any,actorUserId?:string){return this.projectsService().updateProject(tenantId,id,data,actorUserId);}
  createProjectNote(tenantId:string,projectId:string,content:string,actorUserId?:string){return this.projectsService().createProjectNote(tenantId,projectId,content,actorUserId);}
  createProjectTask(tenantId:string,projectId:string,data:any,actorUserId?:string){return this.projectsService().createProjectTask(tenantId,projectId,data,actorUserId);}
  updateProjectTask(tenantId:string,projectId:string,taskId:string,data:any,actorUserId?:string){return this.projectsService().updateProjectTask(tenantId,projectId,taskId,data,actorUserId);}
  approve(tenantId:string,id:string,actorUserId?:string){return this.quotesService().approve(tenantId,id,actorUserId);}

  calendar(tenantId:string){return this.projectsService().calendar(tenantId);}
  createCalendarEvent(tenantId:string,userId:string,data:any){return this.projectsService().createCalendarEvent(tenantId,userId,data);}
  cancelCalendarEvent(tenantId:string,id:string,userId:string){return this.projectsService().cancelCalendarEvent(tenantId,id,userId);}
  updateCalendarEvent(tenantId:string,id:string,userId:string,data:any){return this.projectsService().updateCalendarEvent(tenantId,id,userId,data);}

}
