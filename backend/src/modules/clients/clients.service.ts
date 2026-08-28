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
    await this.assertCapacity(tenantId);
    const client=await this.db.client.create({data:{tenantId,...this.normalize(data)}});
    await this.audit(tenantId,actorUserId,'create',client.id,{type:client.type,document:client.document});
    return client;
  }

  async update(tenantId:string,id:string,data:UpdateClientDto,actorUserId?:string){
    const client=await this.db.client.findFirst({where:{id,tenantId}});
    if(!client)throw new NotFoundException('Cliente não encontrado');
    if(data.active===true&&!client.active)await this.assertCapacity(tenantId);
    const updated=await this.db.client.update({where:{id},data:this.normalize(data,client)});
    await this.audit(tenantId,actorUserId,'update',id,{type:updated.type,document:updated.document,active:updated.active});
    return updated;
  }
}
