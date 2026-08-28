import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditQueryDto } from './dto/audit.dto';
import { auditWhere } from './audit-query';

@Injectable()
export class AuditService {
  constructor(private readonly db:PrismaService){}

  async list(tenantId:string,filters:AuditQueryDto={}){
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId}});
    const limit=tenant?await this.db.planLimit.findUnique({where:{plan:tenant.plan}}):null;
    if(!limit?.auditAccess)throw new ForbiddenException('Histórico de atividades disponível no plano Business');
    const where=auditWhere(tenantId,filters);
    const take=Math.min(500,Math.max(1,Number(filters.limit)||200));
    const[logs,users]=await Promise.all([
      this.db.auditLog.findMany({where,orderBy:{createdAt:'desc'},take}),
      this.db.user.findMany({where:{tenantId},select:{id:true,name:true,email:true}}),
    ]);
    const actors=new Map(users.map(user=>[user.id,user]));
    let items=logs.map(log=>({...log,actor:log.actorUserId?actors.get(log.actorUserId)??null:null}));
    const search=String(filters.search??'').trim().toLowerCase();
    if(search)items=items.filter(log=>[log.action,log.entity,log.entityId,log.actor?.name,log.actor?.email,JSON.stringify(log.metadata??{})].some(value=>String(value??'').toLowerCase().includes(search)));
    return {items,total:items.length,actors:users};
  }
}
