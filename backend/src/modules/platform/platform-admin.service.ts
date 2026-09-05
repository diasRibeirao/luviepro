import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../../mail.service';
import { AuthService } from '../auth/auth.service';
import { periodEnd, periodPrice } from '../../plan-policy';
import { pagination } from '../../http/pagination';
import { PlatformCreatePlanDto, PlatformCreateTenantDto, PlatformListQueryDto, PlatformMasterCreateDto, PlatformMasterUpdateDto, PlatformPlanDto, PlatformTenantDto, PlatformUserDto } from './dto/platform.dto';

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

  private usesPagination(query?:PlatformListQueryDto){return Boolean(query&&Object.values(query).some(value=>value!==undefined&&value!==''));}
  private pageResult<T>(items:T[],total:number,page:number,pageSize:number){return {items,total,page,pageSize,totalPages:Math.max(1,Math.ceil(total/pageSize))};}

  async tenants(query?:PlatformListQueryDto){
    const paged=this.usesPagination(query),p=pagination(query?.page,query?.pageSize);
    const q=query?.q?.trim();
    const where:any={
      ...(query?.status&&query.status!=='all'&&{status:query.status}),
      ...(query?.plan&&query.plan!=='all'&&{plan:query.plan}),
      ...(q&&{OR:[{name:{contains:q,mode:'insensitive'}},{slug:{contains:q,mode:'insensitive'}},{contactEmail:{contains:q,mode:'insensitive'}}]}),
    };
    const select={id:true,name:true,slug:true,plan:true,planPeriod:true,status:true,subscriptionExpiresAt:true,createdAt:true,_count:{select:{users:true,clients:true,subscriptions:true}},subscriptions:{where:{status:'scheduled'},select:{id:true,plan:true,period:true,startsAt:true,expiresAt:true,amountCents:true},orderBy:{startsAt:'asc' as const},take:1}};
    const [rows,total]=await Promise.all([
      this.db.tenant.findMany({where,select,orderBy:{createdAt:'desc'},...(paged&&{skip:p.skip,take:p.take})}),
      paged?this.db.tenant.count({where}):Promise.resolve(0),
    ]);
    const items=rows.map(({subscriptions,...tenant})=>({...tenant,scheduledSubscription:subscriptions[0]??null}));
    return paged?this.pageResult(items,total,p.page,p.pageSize):items;
  }

  async subscriptions(query?:PlatformListQueryDto){const paged=this.usesPagination(query),p=pagination(query?.page,query?.pageSize);const q=query?.q?.trim();const where:any={...(query?.status&&query.status!=='all'&&{status:query.status}),...(query?.plan&&query.plan!=='all'&&{plan:query.plan}),...(query?.tenantId&&query.tenantId!=='all'&&{tenantId:query.tenantId}),...(q&&{OR:[{tenant:{name:{contains:q,mode:'insensitive'}}},{plan:{contains:q,mode:'insensitive'}}]})};const args:any={where,select:{id:true,plan:true,period:true,amountCents:true,status:true,startsAt:true,expiresAt:true,createdAt:true,tenant:{select:{id:true,name:true,slug:true}}},orderBy:{createdAt:'desc'},...(paged?{skip:p.skip,take:p.take}:{take:200})};const[items,total]=await Promise.all([this.db.subscription.findMany(args),paged?this.db.subscription.count({where}):Promise.resolve(0)]);return paged?this.pageResult(items,total,p.page,p.pageSize):items;}
  async payments(query?:PlatformListQueryDto){const paged=this.usesPagination(query),p=pagination(query?.page,query?.pageSize);const q=query?.q?.trim();const where:any={...(query?.status&&query.status!=='all'&&{status:query.status}),...(query?.plan&&query.plan!=='all'&&{plan:query.plan}),...(query?.tenantId&&query.tenantId!=='all'&&{tenantId:query.tenantId}),...(q&&{OR:[{tenant:{name:{contains:q,mode:'insensitive'}}},{providerPaymentId:{contains:q,mode:'insensitive'}},{externalReference:{contains:q,mode:'insensitive'}},{paymentMethod:{contains:q,mode:'insensitive'}},{providerStatusDetail:{contains:q,mode:'insensitive'}}]})};const args:any={where,select:{id:true,provider:true,providerPaymentId:true,providerPreferenceId:true,externalReference:true,plan:true,period:true,amountCents:true,status:true,paymentMethod:true,providerStatus:true,providerStatusDetail:true,paidAt:true,createdAt:true,updatedAt:true,tenant:{select:{id:true,name:true,slug:true}},_count:{select:{webhookEvents:true}},webhookEvents:{select:{id:true,status:true,eventType:true,attempts:true,lastError:true,processedAt:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'},take:1}},orderBy:{createdAt:'desc'},...(paged?{skip:p.skip,take:p.take}:{take:300})};const[items,total]=await Promise.all([this.db.payment.findMany(args),paged?this.db.payment.count({where}):Promise.resolve(0)]);const rows=items.map(({webhookEvents,...payment}:any)=>({...payment,lastWebhook:webhookEvents?.[0]??null}));return paged?this.pageResult(rows,total,p.page,p.pageSize):rows;}
  async users(query?:PlatformListQueryDto){const paged=this.usesPagination(query),p=pagination(query?.page,query?.pageSize);const q=query?.q?.trim();const where:any={...(query?.status&&query.status!=='all'&&{active:query.status==='active'}),...(query?.plan&&query.plan!=='all'&&{tenant:{plan:query.plan}}),...(query?.tenantId&&query.tenantId!=='all'&&{tenantId:query.tenantId}),...(q&&{OR:[{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}},{tenant:{name:{contains:q,mode:'insensitive'}}}]})};const args:any={where,select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}},orderBy:{createdAt:'desc'},...(paged?{skip:p.skip,take:p.take}:{take:500})};const[items,total]=await Promise.all([this.db.user.findMany(args),paged?this.db.user.count({where}):Promise.resolve(0)]);return paged?this.pageResult(items,total,p.page,p.pageSize):items;}
  async masters(query:PlatformListQueryDto|undefined,currentAdminId:string){
    const paged=this.usesPagination(query),p=pagination(query?.page,query?.pageSize);
    const q=query?.q?.trim();
    const where:any={...(query?.status&&query.status!=='all'&&{active:query.status==='active'}),...(q&&{OR:[{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]})};
    const select={id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,updatedAt:true};
    const [items,total] = await Promise.all([
      this.db.platformAdmin.findMany({
        where,
        select,
        orderBy:[{active:'desc'},{name:'asc'}],
        skip:paged ? p.skip : 0,
        take:paged ? p.take : 100,
      }),
      paged ? this.db.platformAdmin.count({where}) : Promise.resolve(0),
    ]);
    const rows=items.map(item=>({...item,current:item.id===currentAdminId}));
    return paged?this.pageResult(rows,total,p.page,p.pageSize):rows;
  }

  async createMaster(data:PlatformMasterCreateDto){
    const email=String(data.email).trim().toLowerCase(),name=String(data.name).trim();
    if(await this.db.platformAdmin.findUnique({where:{email}}))throw new ConflictException('Este e-mail já é um usuário Master');
    if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já pertence a um usuário de empresa');
    const passwordHash=await hash(randomBytes(48).toString('hex'),12);
    const master=await this.db.platformAdmin.create({data:{name,email,passwordHash,role:'platform_admin',active:true},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,updatedAt:true}});
    const delivery=await this.auth.forgotPassword(email);
    return {...master,current:false,firstAccessRequested:true,delivery};
  }

  async updateMaster(id:string,data:PlatformMasterUpdateDto,currentAdminId:string){
    if(id===currentAdminId&&data.active===false)throw new BadRequestException('Você não pode inativar o próprio usuário Master');
    const email=data.email?.trim().toLowerCase();
    let updated=null;
    for(let attempt=0;attempt<3&&!updated;attempt++){
      try{
        updated=await this.db.$transaction(async tx=>{
          const master=await tx.platformAdmin.findUnique({where:{id}});
          if(!master)throw new NotFoundException('Usuário Master não encontrado');
          if(data.active===false&&master.active){
            const active=await tx.platformAdmin.count({where:{active:true}});
            if(active<=1)throw new BadRequestException('A plataforma precisa manter pelo menos um usuário Master ativo');
          }
          if(email&&email!==master.email){
            if(await tx.platformAdmin.findUnique({where:{email}}))throw new ConflictException('Este e-mail já é utilizado por outro Master');
            if(await tx.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já pertence a um usuário de empresa');
          }
          const value=await tx.platformAdmin.update({where:{id},data:{...(data.name!==undefined&&{name:data.name.trim()}),...(email&&{email}),...(data.active!==undefined&&{active:data.active})},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,updatedAt:true}});
          if(data.active===false)await tx.authSession.updateMany({where:{platformAdminId:id,revokedAt:null},data:{revokedAt:new Date(),revokedReason:'platform_admin_deactivated'}});
          return value;
        },{isolationLevel:'Serializable'});
      }catch(error){
        const code=(error as {code?:string})?.code;
        if(code==='P2034'&&attempt<2)continue;
        if(code==='P2002')throw new ConflictException('Este e-mail já é utilizado por outro Master');
        throw error;
      }
    }
    if(!updated)throw new ConflictException('O usuário Master foi alterado por outra operação. Atualize a lista e tente novamente');
    return {...updated,current:id===currentAdminId};
  }

  async masterPasswordReset(id:string){
    const master=await this.db.platformAdmin.findUnique({where:{id}});
    if(!master)throw new NotFoundException('Usuário Master não encontrado');
    if(!master.active)throw new BadRequestException('Ative o usuário Master antes de enviar a recuperação de senha');
    return this.auth.forgotPassword(master.email);
  }

  plans(){return this.db.planLimit.findMany({orderBy:[{sortOrder:'asc'},{monthlyPriceCents:'asc'}]});}

  async changeTenant(id:string,data:PlatformTenantDto){
    const tenant=await this.db.tenant.findUnique({where:{id}});
    if(!tenant)throw new NotFoundException('Empresa não encontrada');
    const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';
    const [targetPlan,currentPlan]=await Promise.all([this.db.planLimit.findUnique({where:{plan}}),this.db.planLimit.findUnique({where:{plan:tenant.plan}})]);
    if(!targetPlan||(!targetPlan.active&&plan!==tenant.plan))throw new BadRequestException('Plano indisponível');
    if(data.plan&&targetPlan.sortOrder<(currentPlan?.sortOrder??0)&&tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt.getTime()>Date.now()){
      let subscription=null;
      for(let attempt=0;attempt<3&&!subscription;attempt++){
        try{
          subscription=await this.db.$transaction(async tx=>{
            const freshTenant=await tx.tenant.findUnique({where:{id}});
            if(!freshTenant)throw new NotFoundException('Empresa não encontrada');
            const existing=await tx.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});
            if(existing)throw new ConflictException('Já existe uma alteração de plano agendada para esta empresa');
            const limit=await tx.planLimit.findUnique({where:{plan}});
            if(!limit?.active)throw new BadRequestException('Plano indisponível');
            const startsAt=freshTenant.subscriptionExpiresAt!;
            return tx.subscription.create({data:{tenantId:id,plan,period,amountCents:periodPrice(limit,period),status:'scheduled',startsAt,expiresAt:periodEnd(startsAt,period)}});
          },{isolationLevel:'Serializable'});
        }catch(error){
          if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
          throw error;
        }
      }
      if(!subscription)throw new ConflictException('A alteração de plano foi modificada por outra operação. Tente novamente.');
      await this.audit(id,'platform_schedule_downgrade','subscription',subscription.id,{plan,period,effectiveAt:subscription.startsAt});
      return {...tenant,scheduledSubscription:subscription};
    }
    return this.updateTenant(id,data);
  }

  async cancelScheduledChange(id:string){
    const scheduled=await this.db.subscription.findFirst({where:{tenantId:id,status:'scheduled'}});
    if(!scheduled)throw new NotFoundException('Nenhuma alteração agendada para esta empresa');
    const claimed=await this.db.subscription.updateMany({where:{id:scheduled.id,tenantId:id,status:'scheduled'},data:{status:'cancelled'}});
    if(claimed.count!==1)throw new ConflictException('A alteração agendada já foi processada ou cancelada por outra operação');
    const cancelled=await this.db.subscription.findUniqueOrThrow({where:{id:scheduled.id}});
    await this.audit(id,'platform_cancel_scheduled_change','subscription',scheduled.id,{plan:scheduled.plan,period:scheduled.period});
    return {ok:true,subscription:cancelled};
  }

  async createTenant(data:PlatformCreateTenantDto,platformAdminId:string){
    const email=String(data.ownerEmail??'').trim().toLowerCase(),company=String(data.company??'').trim(),ownerName=String(data.ownerName??'').trim();
    const now=new Date(),trialEnd=new Date(now);trialEnd.setDate(trialEnd.getDate()+14);
    const slug=`${company.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'empresa'}-${Date.now().toString(36)}`;
    const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+Number(process.env.INVITATION_TTL_HOURS||48)*3600000);
    let result=null;
    for(let attempt=0;attempt<3&&!result;attempt++){
      try{
        result=await this.db.$transaction(async tx=>{
          if(await tx.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');
          const pending=await tx.userInvitation.findFirst({where:{email,status:'pending',expiresAt:{gt:new Date()}}});
          if(pending)throw new ConflictException('Já existe um convite pendente para este e-mail');
          const limit=await tx.planLimit.findUnique({where:{plan:data.plan}});
          if(!limit?.active)throw new BadRequestException('Plano indisponível');
          const amountCents=periodPrice(limit,data.period);
          const tenant=await tx.tenant.create({data:{name:company,slug,responsibleName:ownerName,phone:data.phone||null,contactEmail:email,plan:data.plan,planPeriod:data.period,subscriptionExpiresAt:trialEnd}});
          await tx.subscription.create({data:{tenantId:tenant.id,plan:data.plan,period:data.period,amountCents,status:'trial',startsAt:now,expiresAt:trialEnd}});
          const invitation=await tx.userInvitation.create({data:{tenantId:tenant.id,name:ownerName,email,role:'owner',tokenHash:this.invitationHash(token),expiresAt},select:{id:true,email:true,name:true,expiresAt:true}});
          return {tenant,invitation};
        },{isolationLevel:'Serializable'});
      }catch(error){
        const code=(error as {code?:string})?.code;
        if(code==='P2034'&&attempt<2)continue;
        if(code==='P2002')throw new ConflictException('Este e-mail ou empresa já foi cadastrado por outra operação');
        throw error;
      }
    }
    if(!result)throw new ConflictException('O cadastro da empresa foi alterado por outra operação. Tente novamente.');
    const inviteUrl=this.invitationUrl(token);let delivery:{sent:boolean;reason?:string}={sent:false,reason:'not_configured'};
    try{delivery=await this.mail.sendUserInvitation({to:email,name:ownerName,tenantName:company,roleLabel:'Proprietário',inviteUrl,expiresAt});}catch{delivery={sent:false,reason:'send_failed'};}
    await this.audit(result.tenant.id,'platform_create_tenant','tenant',result.tenant.id,{platformAdminId,plan:data.plan,period:data.period,ownerEmail:email,delivery:delivery.sent?'sent':delivery.reason});
    return {...result.tenant,invitation:{...result.invitation,delivery,inviteUrl}};
  }

  async updateTenant(id:string,data:PlatformTenantDto){
    const tenant=await this.db.tenant.findUnique({where:{id}});if(!tenant)throw new NotFoundException('Empresa não encontrada');
    const plan=data.plan??tenant.plan,period=data.planPeriod??tenant.planPeriod??'monthly';
    const limit=await this.db.planLimit.findUnique({where:{plan}});if(!limit||(!limit.active&&plan!==tenant.plan))throw new BadRequestException('Plano indisponível');
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
    if(user.role==='owner'&&data.role&&data.role!=='owner')throw new BadRequestException('O proprietário não pode ser rebaixado por esta manutenção. Use um fluxo de transferência de propriedade');
    if(user.role!=='owner'&&data.role==='owner')throw new BadRequestException('Use um fluxo de transferência de propriedade para definir outro proprietário');
    const email=data.email?.trim().toLowerCase();
    if(email&&email!==user.email){if(await this.db.user.findUnique({where:{email}}))throw new ConflictException('Este e-mail já possui acesso ao LuviePro');if(await this.db.platformAdmin.findUnique({where:{email}}))throw new ConflictException('Este e-mail pertence a um usuário Master');}
    const updated=await this.db.$transaction(async tx=>{
      const result=await tx.user.update({where:{id},data:{...(data.name!==undefined&&{name:data.name.trim()}),...(email&&{email}),...(data.active!==undefined&&{active:data.active}),...(data.role!==undefined&&{role:data.role})},select:{id:true,name:true,email:true,role:true,active:true,lastLoginAt:true,createdAt:true,tenant:{select:{id:true,name:true,plan:true,status:true}}}});
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
    for(let attempt=0;attempt<3;attempt++){
      try{
        return await this.db.$transaction(async tx=>{
          const current=await tx.planLimit.findUnique({where:{plan}});
          if(!current)throw new NotFoundException('Plano não encontrado');
          if(data.active===false){
            const scheduled=await tx.subscription.count({where:{plan,status:'scheduled'}});
            if(scheduled)throw new ConflictException('Cancele as alterações agendadas deste plano antes de inativá-lo');
          }
          return tx.planLimit.update({where:{plan},data});
        },{isolationLevel:'Serializable'});
      }catch(error){
        if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
        throw error;
      }
    }
    throw new ConflictException('O plano foi alterado por outra operação. Atualize a lista e tente novamente.');
  }

  async createPlan(data:PlatformCreatePlanDto){
    const plan=data.plan.trim().toLowerCase();
    for(let attempt=0;attempt<3;attempt++){
      try{
        return await this.db.$transaction(async tx=>{
          if(await tx.planLimit.findUnique({where:{plan}}))throw new ConflictException('Já existe um plano com este código');
          const sortOrder=data.sortOrder??((await tx.planLimit.aggregate({_max:{sortOrder:true}}))._max.sortOrder??0)+10;
          return tx.planLimit.create({data:{...data,plan,name:data.name.trim(),description:data.description?.trim()||null,active:data.active??true,sortOrder}});
        },{isolationLevel:'Serializable'});
      }catch(error){
        const code=(error as {code?:string})?.code;
        if(code==='P2034'&&attempt<2)continue;
        if(code==='P2002')throw new ConflictException('Já existe um plano com este código');
        throw error;
      }
    }
    throw new ConflictException('O catálogo de planos foi alterado por outra operação. Tente novamente.');
  }
}
