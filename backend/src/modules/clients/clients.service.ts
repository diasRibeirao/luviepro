import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import type { Prisma } from '../../../../generated-prisma';
import { auditMetadata, type AuditMetadata } from '../../observability/audit-metadata';
import { capacityReached } from '../../entitlements';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly db:PrismaService){}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entityId:string,metadata?:AuditMetadata){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity:'client',entityId,metadata:auditMetadata(metadata)}}).catch(()=>undefined);
  }

  private normalize(data:CreateClientDto|UpdateClientDto,current?:Prisma.ClientGetPayload<Record<string, never>>):Prisma.ClientUncheckedCreateWithoutTenantInput {
    const input=data as UpdateClientDto;
    const text=(key:keyof UpdateClientDto,fallback:string|null=null):string|null=>{
      const incoming=input[key];
      if(incoming===undefined)return current ? ((current[key as keyof typeof current] as string|null|undefined)??fallback) : fallback;
      if(typeof incoming!=='string')return fallback;
      return incoming.trim()||null;
    };
    const name=input.name===undefined&&current?current.name:String(input.name??'').trim();
    return {
      type:text('type',current?.type??'individual')??'individual',
      name,
      legalName:text('legalName'), document:text('document'), stateRegistration:text('stateRegistration'),
      municipalRegistration:text('municipalRegistration'), contactName:text('contactName'), phone:text('phone'),
      whatsapp:text('whatsapp'), email:text('email'), zipCode:text('zipCode'), addressLine:text('addressLine'),
      addressNumber:text('addressNumber'), addressComplement:text('addressComplement'), neighborhood:text('neighborhood'),
      city:text('city'), state:text('state'), notes:text('notes'),
      active:input.active===undefined?(current?.active??true):input.active,
    };
  }

  private async assertCapacity(tenantId:string){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});
    if(!tenant)throw new NotFoundException('Tenant não encontrada');
    const limit=await this.db.planLimit.findUnique({where:{plan:tenant.plan}});
    if(!limit)return;
    const used=await this.db.client.count({where:{tenantId,active:true}});
    if(capacityReached(limit.maxClients<0?null:limit.maxClients,used))throw new BadRequestException('Limite de clientes do plano atingido');
  }

  list(tenantId:string){return this.db.client.findMany({where:{tenantId},orderBy:{name:'asc'}});}

  async create(tenantId:string,data:CreateClientDto,actorUserId?:string){
    const normalized=this.normalize(data);
    let client=null;
    for(let attempt=0;attempt<3&&!client;attempt++){
      try{
        client=await this.db.$transaction(async tx=>{
          const tenant=await tx.tenant.findUnique({where:{id:tenantId}});
          if(!tenant)throw new NotFoundException('Tenant não encontrada');
          const limit=await tx.planLimit.findUnique({where:{plan:tenant.plan}});
          if(limit){
            const used=await tx.client.count({where:{tenantId,active:true}});
            if(capacityReached(limit.maxClients<0?null:limit.maxClients,used))throw new BadRequestException('Limite de clientes do plano atingido');
          }
          return tx.client.create({data:{tenantId,...normalized}});
        },{isolationLevel:'Serializable'});
      }catch(error){
        if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
        throw error;
      }
    }
    if(!client)throw new BadRequestException('O cadastro de clientes foi alterado por outra operação. Tente novamente.');
    await this.audit(tenantId,actorUserId,'create',client.id,{type:client.type,document:client.document});
    return client;
  }

  async update(tenantId:string,id:string,data:UpdateClientDto,actorUserId?:string){
    let updated=null;
    for(let attempt=0;attempt<3&&!updated;attempt++){
      try{
        updated=await this.db.$transaction(async tx=>{
          const client=await tx.client.findFirst({where:{id,tenantId}});
          if(!client)throw new NotFoundException('Cliente não encontrado');
          if(data.active===true&&!client.active){
            const tenant=await tx.tenant.findUnique({where:{id:tenantId}});
            if(!tenant)throw new NotFoundException('Tenant não encontrada');
            const limit=await tx.planLimit.findUnique({where:{plan:tenant.plan}});
            if(limit){
              const used=await tx.client.count({where:{tenantId,active:true}});
              if(capacityReached(limit.maxClients<0?null:limit.maxClients,used))throw new BadRequestException('Limite de clientes do plano atingido');
            }
          }
          return tx.client.update({where:{id},data:this.normalize(data,client)});
        },{isolationLevel:'Serializable'});
      }catch(error){
        if((error as {code?:string})?.code==='P2034'&&attempt<2)continue;
        throw error;
      }
    }
    if(!updated)throw new BadRequestException('O cliente foi alterado por outra operação. Atualize a lista e tente novamente.');
    await this.audit(tenantId,actorUserId,'update',id,{type:updated.type,document:updated.document,active:updated.active});
    return updated;
  }
}
