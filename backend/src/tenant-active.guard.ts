import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
@Injectable() export class TenantActiveGuard implements CanActivate {
  constructor(private db:PrismaService,private reflector:Reflector){}
  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>('public',[ctx.getHandler(),ctx.getClass()]))return true;
    const req=ctx.switchToHttp().getRequest(); const tenantId=req.user?.tenantId; const userId=req.user?.sub;
    if(!tenantId)return true;
    const [tenant,user]=await Promise.all([
      this.db.tenant.findUnique({where:{id:tenantId},select:{status:true,subscriptionExpiresAt:true}}),
      userId?this.db.user.findFirst({where:{id:userId,tenantId},select:{active:true}}):Promise.resolve(null)
    ]);
    if(!tenant)throw new ForbiddenException('Tenant não encontrada');
    if(userId&&!user?.active)throw new ForbiddenException('Usuário inativo');
    if(tenant.status==='suspended')throw new ForbiddenException('Conta suspensa');
    if(tenant.status==='cancelled')throw new ForbiddenException('Assinatura cancelada');
    if(tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt.getTime()<Date.now())throw new ForbiddenException('Assinatura ou período de teste expirado');
    return true;
  }
}
