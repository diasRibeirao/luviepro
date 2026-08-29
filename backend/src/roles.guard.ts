import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export const Roles=(...roles:string[])=>SetMetadata('roles',roles);
@Injectable() export class RolesGuard implements CanActivate {
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){
    const roles=this.reflector.getAllAndOverride<string[]>('roles',[ctx.getHandler(),ctx.getClass()]);
    const role=ctx.switchToHttp().getRequest().user?.role;
    if(role==='platform_admin'&&!roles?.includes('platform_admin'))throw new ForbiddenException('Acesso restrito ao painel da plataforma');
    if(!roles?.length)return true;
    if(!role||!roles.includes(role))throw new ForbiddenException('Você não possui permissão para esta operação');
    return true;
  }
}
