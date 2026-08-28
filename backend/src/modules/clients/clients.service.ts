import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { capacityReached } from '../../entitlements';
import { CreateClientDto, UpdateClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly db:PrismaService){}

  private async audit(tenantId:string,actorUserId:string|undefined,action:string,entityId:string,metadata?:any){
    await this.db.auditLog.create({data:{tenantId,actorUserId,action,entity:'client',entityId,metadata}}).catch(()=>undefined);
  }

  private normalize(data:CreateClientDto|UpdateClientDto,current?:any){
    const value=(key:keyof CreateClientDto, fallback:any=null)=>{
      const incoming=(data as any)[key];
      if(incoming===undefined)return current ? current[key] : fallback;
      if(typeof incoming==='string')return incoming.trim()||null;
      return incoming;
    };
    const name=(data as any).name===undefined&&current?current.name:String((data as any).name??'').trim();
    return {
      type:value('type',current?.type??'individual')??'individual',
      name,
      legalName:value('legalName'),
      document:value('document'),
      stateRegistration:value('stateRegistration'),
      municipalRegistration:value('municipalRegistration'),
      contactName:value('contactName'),
      phone:value('phone'),
      whatsapp:value('whatsapp'),
      email:value('email'),
      zipCode:value('zipCode'),
      addressLine:value('addressLine'),
      addressNumber:value('addressNumber'),
      addressComplement:value('addressComplement'),
      neighborhood:value('neighborhood'),
      city:value('city'),
      state:value('state'),
      notes:value('notes'),
      active:(data as any).active===undefined?(current?.active??true):!!(data as any).active,
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
