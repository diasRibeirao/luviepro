import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../../mail.service';
import { AuthService } from '../auth/auth.service';
import { isPlanCode, periodEnd, periodPrice, planRank } from '../../plan-policy';
import { PlatformCreateTenantDto, PlatformPlanDto, PlatformTenantDto, PlatformUserDto } from './dto/platform.dto';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly db: PrismaService,
    private readonly mail: MailService,
    private readonly auth: AuthService,
  ) {}

  private invitationHash(token:string){return createHash('sha256').update(token).digest('hex');}
  private invitationUrl(token:string){const base=(process.env.APP_WEB_URL||'http://localhost:8081').replace(/\/$/,'');return `${base}/invite/${encodeURIComponent(token)}`;}
  private async audit(tenantId:string,action:string,entity:string,entityId?:string,metadata?:any){
    await this.db.auditLog.create({data:{tenantId,actorUserId:undefined,action,entity,entityId,metadata}}).catch(()=>undefined);
  }

  async overview(){
    const [tenants,activeTenants,users,clients,subscriptions,monthlyRevenue]=await Promise.all([
      this.db.tenant.count(),
      this.db.tenant.count({where:{status:'active'}}),
      this.db.user.count({where:{active:true}}),
      this.db.client.count({where:{active:true}}),
      this.db.subscription.count({where:{status:{in:['active','trial']}}}),
      this.db.subscription.aggregate({where:{status:{in:['active','trial']},period:'monthly'},_sum:{amountCents:true}}),
    ]);
    return {tenants,activeTenants,users,clients,subscriptions,monthlyRevenueCents:monthlyRevenue._sum.amountCents??0};
  }

  async tenants(){
    const rows=await this.db.tenant.findMany({
      select:{id:true,name:true,slug:true,plan:true,planPeriod:true,status:true,subscriptionExpiresAt:true,createdAt:true,_count:{select:{users:true,clients:true,subscriptions:true}},subscriptions:{where:{status:'scheduled'},select:{id:true,plan:true,period:true,startsAt:true,expiresAt:true,amountCents:true},orderBy:{startsAt:'asc'},take:1}},
      orderBy:{createdAt:'desc'},
    });
    return rows.map(({subscriptions,...tenant})=>({...tenant,scheduledSubscription:subscriptions[0]??null}));
  }

  subscriptions(){return this.db.subscription.findMany({select:{id:true,plan:true,period:true,amountCents:true,status:true,startsAt:true,expiresAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:200});}
  payments(){return this.db.payment.findMany({select:{id:true,provider:true,providerPaymentId:true,plan:true,period:true,amountCents:true,status:true,paymentMethod:true,paidAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},take:300});}
  users(){return this.db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}},orderBy:{createdAt:'desc'},take:500});}
  plans(){return this.db.planLimit.findMany({orderBy:{monthlyPriceCents:'asc'}});}

  async changeTenant(id:string,data:PlatformTenantDto){
    const tenant=await this.db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException('Empresa não encontrada');
    const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';
    if(data.plan&&planRank(plan)<planRank(tenant.plan)&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt.getTime()>Date.now()){
      const existing=await this.db.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});
      if(existing)throw new ConflictException('Já existe uma alteração de plano agendada para esta empresa');
      const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit)throw new BadRequestException('Plano indisponível');
      const startsAt=tenant.subscriptionExpiresAt,expiresAt=periodEnd(startsAt,period),subscription=await this.db.subscription.create({data:{tenantId:id,plan,period,amountCents:periodPrice(limit,period),status:'scheduled',startsAt,expiresAt}});
      await this.audit(id,'platform_schedule_downgrade','subscription',subscription.id,{plan,period,effectiveAt:startsAt});
      return {...tenant,scheduledSubscription:subscription};
    }
    return this.updateTenant(id,data);
  }

  async cancelScheduledChange(id:string){
    const scheduled=await this.db.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});
    if(!scheduled)throw new NotFoundException('Nenhuma alteração agendada para esta empresa');
    const cancelled=await this.db.subscription.update({where:{id:scheduled.id},data:{status:'cancelled'}});
    await this.audit(id,'platform_cancel_scheduled_change','subscription',scheduled.id,{plan:scheduled.plan,period:scheduled.period});
    return {ok:true,subscription:cancelled};
  }

  async createTenant(data:PlatformCreateTenantDto,platformAdminId:string){
    const email=String(data.ownerEmail??'').trim().toLowerCase(),company=String(data.company??'').trim(),ownerName=String(data.ownerName??'').trim();
    if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
    const pending=await this.db.userInvitation.findFirst({where:{email,status:'pending',expiresAt:{gt:new Date()}}});
    if(pending)throw new ConflictException('Já existe um convite pendente para este e-mail');
    const limit=await this.db.planLimit.findUnique({where:{plan:data.plan}});if(!limit)throw new BadRequestException('Plano indisponível');
    const amountCents=periodPrice(limit,data.period);
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
    await this.audit(result.tenant.id,'platform_create_tenant','tenant',result.tenant.id,{platformAdminId,plan:data.plan,period:data.period,email,delivery:delivery.sent?'sent':delivery.reason});
    return {tenant:result.tenant,invitation:{...result.invitation,delivery,inviteUrl}};
  }

  async updateTenant(id:string,data:PlatformTenantDto){
    const tenant=await this.db.tenant.findUnique({where:{id}});if(!tenant)throw new NotFoundException('Empresa não encontrada');
    const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';
    const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit)throw new BadRequestException('Plano indisponível');
    const amountCents=periodPrice(limit,period);
    const updated=await this.db.$transaction(async tx=>{
      const result=await tx.tenant.update({where:{id},data:{...(data.status!==undefined&&{status:data.status}),...(data.plan!==undefined&&{plan:data.plan}),...(data.planPeriod!==undefined&&{planPeriod:data.planPeriod})}});
      if(data.plan!==undefined||data.planPeriod!==undefined){
        const current=await tx.subscription.findFirst({where:{tenantId:id,status:{in:['active','trial']},expiresAt:{gte:new Date()}},orderBy:{expiresAt:'desc'}});
        if(current)await tx.subscription.update({where:{id:current.id},data:{plan,period,amountCents}});
        else{const startsAt=new Date(),expiresAt=new Date(startsAt);expiresAt.setDate(expiresAt.getDate()+14);await tx.subscription.create({data:{tenantId:id,plan,period,amountCents,status:'active',startsAt,expiresAt}});}
      }
      return result;
    });
    await this.audit(id,'platform_update_tenant','tenant',id,{...data,amountCents});
    return updated;
  }

  async updateUser(id:string,data:PlatformUserDto){
    const user=await this.db.user.findUnique({where:{id}});if(!user)throw new NotFoundException('Usuário não encontrado');
    const updated=await this.db.$transaction(async tx=>{
      const result=await tx.user.update({where:{id},data:{...(data.active!==undefined&&{active:data.active}),...(data.role!==undefined&&{role:data.role})},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}}});
      if(data.active===false)await tx.authSession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date(),revokedReason:'user_deactivated'}});
      return result;
    });
    await this.audit(user.tenantId,'platform_update_user','user',id,data);
    return updated;
  }

  async passwordReset(id:string){
    const user=await this.db.user.findUnique({where:{id}});if(!user)throw new NotFoundException('Usuário não encontrado');
    if(!user.active)throw new BadRequestException('Ative o usuário antes de enviar a recuperação de senha');
    return this.auth.forgotPassword(user.email);
  }

  async updatePlan(plan:string,data:PlatformPlanDto){
    if(!isPlanCode(plan))throw new BadRequestException('Plano inválido');
    const current=await this.db.planLimit.findUnique({where:{plan}});if(!current)throw new NotFoundException('Plano não encontrado');
    return this.db.planLimit.update({where:{plan},data});
  }
}
