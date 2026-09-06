import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateServiceDto, ServiceCostDto, ServiceStageDto, ServiceTeamMemberDto, UpdateServiceDto } from './dto/services.dto';
import type { Prisma } from '../../../../generated-prisma';


type CurrentServiceState = Partial<Record<Exclude<keyof CreateServiceDto,'team'|'costs'|'stages'>, unknown>> & {
  team?: Array<{role:string;dailyRateCents:number;included:boolean}>;
  costs?: Array<{type:string;description:string;amountCents:number}>;
  stages?: Array<{sequence:number;description:string;duration:string|null}>;
};

@Injectable()
export class ServicesService {
  constructor(private readonly db:PrismaService){}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entityId:string,metadata?:Prisma.InputJsonObject){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity:'service',entityId,metadata}}).catch(()=>undefined);
  }

  list(tenantId:string){
    return this.db.service.findMany({
      where:{tenantId},
      include:{
        team:{where:{tenantId},orderBy:{role:'asc'}},
        costs:{where:{tenantId},orderBy:{description:'asc'}},
        stages:{where:{tenantId},orderBy:{sequence:'asc'}},
      },
      orderBy:[{active:'desc'},{sortOrder:'asc'},{name:'asc'}],
    });
  }

  private normalize(tenantId:string,data:CreateServiceDto|UpdateServiceDto,current?:CurrentServiceState){
    const teamSource:ServiceTeamMemberDto[]=data.team===undefined&&current?.team
      ? current.team.map(x=>({role:x.role,dailyRateCents:x.dailyRateCents,included:x.included}))
      : (data.team??[]);
    const costsSource:ServiceCostDto[]=data.costs===undefined&&current?.costs
      ? current.costs.map(x=>({type:x.type,description:x.description,amountCents:x.amountCents}))
      : (data.costs??[]);
    const stagesSource:ServiceStageDto[]=data.stages===undefined&&current?.stages
      ? current.stages.map(x=>({sequence:x.sequence,description:x.description,duration:x.duration??undefined}))
      : (data.stages??[]);

    const team=teamSource.map(x=>({tenantId,role:String(x.role).trim(),dailyRateCents:Number(x.dailyRateCents),included:x.included!==false}));
    const costs=costsSource.map(x=>({tenantId,type:x.type,description:String(x.description).trim(),amountCents:Number(x.amountCents)}));
    const stages=stagesSource.map((x,i)=>({tenantId,sequence:Number(x.sequence??i+1),description:String(x.description).trim(),duration:x.duration||null})).sort((a,b)=>a.sequence-b.sequence);
    const teamDaily=team.filter(x=>x.included).reduce((sum,x)=>sum+x.dailyRateCents,0);
    const variable=costs.filter(x=>x.type==='variable').reduce((sum,x)=>sum+x.amountCents,0);
    const fixed=costs.filter(x=>x.type==='fixed').reduce((sum,x)=>sum+x.amountCents,0);
    const val=(key:keyof CreateServiceDto,fallback:unknown):unknown=>data[key]===undefined?(current?.[key]??fallback):data[key];

    return {
      name:String(val('name','')).trim(),
      code:String(val('code','')??'').trim()||null,
      description:String(val('description','')??'').trim()||null,
      category:String(val('category','')??'').trim()||null,
      billingUnit:String(val('billingUnit','daily')),
      dailyRateCents:team.length?teamDaily:Number(val('dailyRateCents',0)),
      defaultDays:Number(val('defaultDays',1)),
      people:Number(val('people',1)),
      variableCostCents:costs.length?variable:Number(val('variableCostCents',0)),
      fixedCostCents:costs.length?fixed:Number(val('fixedCostCents',0)),
      safetyMarginBps:Number(val('safetyMarginBps',2000)),
      variableCostMode:String(val('variableCostMode','per_day')),
      marginBase:String(val('marginBase','daily')),
      active:val('active',true)!==false,
      sortOrder:Number(val('sortOrder',current?.sortOrder??0)),
      team,costs,stages,
    };
  }

  async create(tenantId:string,data:CreateServiceDto,actorUserId?:string){
    const normalized=this.normalize(tenantId,data);
    let service:any;
    for(let attempt=0;attempt<3;attempt++){
      try{
        service=await this.db.$transaction(async tx=>{
          const n={...normalized};
          if(!n.sortOrder){
            const max=await tx.service.aggregate({where:{tenantId},_max:{sortOrder:true}});
            n.sortOrder=(max._max.sortOrder??0)+10;
          }
          return tx.service.create({
            data:{
              tenantId,name:n.name,code:n.code,description:n.description,category:n.category,billingUnit:n.billingUnit,
              dailyRateCents:n.dailyRateCents,defaultDays:n.defaultDays,people:n.people,variableCostCents:n.variableCostCents,
              fixedCostCents:n.fixedCostCents,safetyMarginBps:n.safetyMarginBps,variableCostMode:n.variableCostMode,
              marginBase:n.marginBase,active:n.active,sortOrder:n.sortOrder,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages},
            },
            include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}},
          });
        },{isolationLevel:'Serializable'});
        break;
      }catch(error){
        if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
        throw error;
      }
    }
    if(!service)throw new Error('Falha ao criar serviço após tentativas de concorrência');
    await this.audit(tenantId,actorUserId,'create',service.id,{name:service.name});
    return service;
  }

  async update(tenantId:string,id:string,data:UpdateServiceDto,actorUserId?:string){
    const current=await this.db.service.findFirst({
      where:{id,tenantId},
      include:{team:{where:{tenantId}},costs:{where:{tenantId}},stages:{where:{tenantId}}},
    });
    if(!current)throw new NotFoundException('Serviço não encontrado');
    const n=this.normalize(tenantId,data,current);
    const service=await this.db.$transaction(async tx=>{
      await Promise.all([
        tx.serviceTeamMember.deleteMany({where:{tenantId,serviceId:id}}),
        tx.serviceCost.deleteMany({where:{tenantId,serviceId:id}}),
        tx.serviceStage.deleteMany({where:{tenantId,serviceId:id}}),
      ]);
      return tx.service.update({
        where:{id},
        data:{
          name:n.name,code:n.code,description:n.description,category:n.category,billingUnit:n.billingUnit,
          dailyRateCents:n.dailyRateCents,defaultDays:n.defaultDays,people:n.people,variableCostCents:n.variableCostCents,
          fixedCostCents:n.fixedCostCents,safetyMarginBps:n.safetyMarginBps,variableCostMode:n.variableCostMode,
          marginBase:n.marginBase,active:n.active,sortOrder:n.sortOrder,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages},
        },
        include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}},
      });
    });
    await this.audit(tenantId,actorUserId,'update',id,{name:service.name,active:service.active});
    return service;
  }
  async reorder(tenantId:string,id:string,direction:'up'|'down',actorUserId?:string){
    let changed=false;
    for(let attempt=0;attempt<3;attempt++){
      try{
        changed=await this.db.$transaction(async tx=>{
          const current=await tx.service.findFirst({where:{id,tenantId}});
          if(!current)throw new NotFoundException('Serviço não encontrado');
          const neighbor=await tx.service.findFirst({
            where:{tenantId,id:{not:id},active:current.active,sortOrder:direction==='up'?{lt:current.sortOrder}:{gt:current.sortOrder}},
            orderBy:{sortOrder:direction==='up'?'desc':'asc'},
          });
          if(!neighbor)return false;
          await tx.service.update({where:{id:current.id},data:{sortOrder:neighbor.sortOrder}});
          await tx.service.update({where:{id:neighbor.id},data:{sortOrder:current.sortOrder}});
          return true;
        },{isolationLevel:'Serializable'});
        break;
      }catch(error){
        if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
        throw error;
      }
    }
    if(changed)await this.audit(tenantId,actorUserId,'reorder',id,{direction});
    return this.list(tenantId);
  }

}
