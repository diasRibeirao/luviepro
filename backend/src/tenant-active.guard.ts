import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { ALLOW_PAYMENT_REVIEW_KEY } from './payment-review.decorator';
import { ALLOW_BILLING_RESTRICTED_KEY } from './billing-restricted.decorator';

@Injectable()
export class TenantActiveGuard implements CanActivate {
  constructor(private db:PrismaService,private reflector:Reflector){}

  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>('public',[ctx.getHandler(),ctx.getClass()]))return true;

    const req=ctx.switchToHttp().getRequest();
    const principal=req.user;
    const tenantId=principal?.tenantId;
    const userId=principal?.sub;
    const sessionId=principal?.sid;
    const isPlatform=principal?.role==='platform_admin'||principal?.platformAdmin===true;

    if(!userId)throw new UnauthorizedException('Sessão inválida');
    if(!sessionId)throw new UnauthorizedException('Sessão inválida');

    const now=new Date();

    if(isPlatform){
      const [session,admin]=await Promise.all([
        this.db.authSession.findFirst({
          where:{id:sessionId,platformAdminId:userId,revokedAt:null,expiresAt:{gt:now}},
          select:{id:true},
        }),
        this.db.platformAdmin.findFirst({where:{id:userId,active:true},select:{id:true}}),
      ]);
      if(!session)throw new UnauthorizedException('Sessão revogada ou expirada');
      if(!admin)throw new ForbiddenException('Usuário Master inativo');
      return true;
    }

    if(!tenantId)throw new UnauthorizedException('Sessão inválida');

    const [session,tenant,user]=await Promise.all([
      this.db.authSession.findFirst({
        where:{id:sessionId,userId,tenantId,revokedAt:null,expiresAt:{gt:now}},
        select:{id:true},
      }),
      this.db.tenant.findUnique({where:{id:tenantId},select:{status:true,subscriptionExpiresAt:true}}),
      this.db.user.findFirst({where:{id:userId,tenantId},select:{active:true}}),
    ]);

    if(!session)throw new UnauthorizedException('Sessão revogada ou expirada');
    if(!tenant)throw new ForbiddenException('Tenant não encontrada');
    if(!user?.active)throw new ForbiddenException('Usuário inativo');
    if(tenant.status==='suspended')throw new ForbiddenException('Conta suspensa');
    if(tenant.status==='cancelled')throw new ForbiddenException('Assinatura cancelada');

    const allowPaymentReview=this.reflector.getAllAndOverride<boolean>(ALLOW_PAYMENT_REVIEW_KEY,[ctx.getHandler(),ctx.getClass()]);
    const allowRestrictedBilling=this.reflector.getAllAndOverride<boolean>(ALLOW_BILLING_RESTRICTED_KEY,[ctx.getHandler(),ctx.getClass()]);
    if(tenant.status==='payment_review'&&!allowPaymentReview&&!allowRestrictedBilling)throw new ForbiddenException('Assinatura em análise por estorno ou contestação de pagamento');

    const expired=tenant.status==='expired'||!!(tenant.subscriptionExpiresAt&&tenant.subscriptionExpiresAt.getTime()<Date.now());
    if(expired&&!allowRestrictedBilling)throw new ForbiddenException('Assinatura ou período de teste expirado');

    return true;
  }
}
