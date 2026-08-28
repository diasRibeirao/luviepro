import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/services.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly db:PrismaService){}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entityId:string,metadata?:any){
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
      orderBy:[{active:'desc'},{name:'asc'}],
    });
  }

  private normalize(tenantId:string,data:CreateServiceDto|UpdateServiceDto,current?:any){
    const teamSource:any[]=data.team===undefined&&current?.team
      ? current.team.map((x:any)=>({role:x.role,dailyRateCents:x.dailyRateCents,included:x.included}))
      : (data.team??[]);
    const costsSource:any[]=data.costs===undefined&&current?.costs
      ? current.costs.map((x:any)=>({type:x.type,description:x.description,amountCents:x.amountCents}))
      : (data.costs??[]);
    const stagesSource:any[]=data.stages===undefined&&current?.stages
      ? current.stages.map((x:any)=>({sequence:x.sequence,description:x.description,duration:x.duration}))
      : (data.stages??[]);

    const team=teamSource.map(x=>({tenantId,role:String(x.role).trim(),dailyRateCents:Number(x.dailyRateCents),included:x.included!==false}));
    const costs=costsSource.map(x=>({tenantId,type:x.type,description:String(x.description).trim(),amountCents:Number(x.amountCents)}));
    const stages=stagesSource.map((x,i)=>({tenantId,sequence:Number(x.sequence??i+1),description:String(x.description).trim(),duration:x.duration||null})).sort((a,b)=>a.sequence-b.sequence);
    const teamDaily=team.filter(x=>x.included).reduce((sum,x)=>sum+x.dailyRateCents,0);
    const variable=costs.filter(x=>x.type==='variable').reduce((sum,x)=>sum+x.amountCents,0);
    const fixed=costs.filter(x=>x.type==='fixed').reduce((sum,x)=>sum+x.amountCents,0);
    const val=(key:keyof CreateServiceDto,fallback:any)=>((data as any)[key]===undefined?(current?.[key]??fallback):(data as any)[key]);

    return {
      name:String(val('name','')).trim(),
      code:String(val('code','')??'').trim()||null,
      description:String(val('description','')??'').trim()||null,
      category:String(val('category','')??'').trim()||null,
      billingUnit:val('billingUnit','daily'),
      dailyRateCents:team.length?teamDaily:Number(val('dailyRateCents',0)),
      defaultDays:Number(val('defaultDays',1)),
      people:Number(val('people',1)),
      variableCostCents:costs.length?variable:Number(val('variableCostCents',0)),
      fixedCostCents:costs.length?fixed:Number(val('fixedCostCents',0)),
      safetyMarginBps:Number(val('safetyMarginBps',2000)),
      variableCostMode:val('variableCostMode','per_day'),
      marginBase:val('marginBase','daily'),
      active:val('active',true)!==false,
      team,costs,stages,
    };
  }

  async create(tenantId:string,data:CreateServiceDto,actorUserId?:string){
    const n=this.normalize(tenantId,data);
    const service=await this.db.service.create({
      data:{
        tenantId,name:n.name,code:n.code,description:n.description,category:n.category,billingUnit:n.billingUnit,
        dailyRateCents:n.dailyRateCents,defaultDays:n.defaultDays,people:n.people,variableCostCents:n.variableCostCents,
        fixedCostCents:n.fixedCostCents,safetyMarginBps:n.safetyMarginBps,variableCostMode:n.variableCostMode,
        marginBase:n.marginBase,active:n.active,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages},
      },
      include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}},
    });
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
          marginBase:n.marginBase,active:n.active,team:{create:n.team},costs:{create:n.costs},stages:{create:n.stages},
        },
        include:{team:true,costs:true,stages:{orderBy:{sequence:'asc'}}},
      });
    });
    await this.audit(tenantId,actorUserId,'update',id,{name:service.name,active:service.active});
    return service;
  }
}
