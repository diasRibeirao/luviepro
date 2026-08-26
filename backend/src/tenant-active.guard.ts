import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
@Injectable() export class TenantActiveGuard implements CanActivate {
  constructor(private db:PrismaService,private reflector:Reflector){}
  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>('public',[ctx.getHandler(),ctx.getClass()]))return true;
    const tenantId=ctx.switchToHttp().getRequest().user?.tenantId;if(!tenantId)return true;
    const tenant=await this.db.tenant.findUnique({where:{id:tenantId},select:{status:true}});
    if(!tenant)throw new ForbiddenException('Tenant não encontrada');
    if(tenant.status==='suspended')throw new ForbiddenException('Conta suspensa');
    if(tenant.status==='cancelled')throw new ForbiddenException('Assinatura cancelada');
    return true;
  }
}
