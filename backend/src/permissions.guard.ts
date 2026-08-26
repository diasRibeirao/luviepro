import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Permissions=(...permissions:string[])=>SetMetadata('permissions',permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){
    const required=this.reflector.getAllAndOverride<string[]>('permissions',[ctx.getHandler(),ctx.getClass()]);
    if(!required?.length)return true;
    const user=ctx.switchToHttp().getRequest().user;
    if(!user?.customProfileId)return true;
    const granted=Array.isArray(user.permissions)?user.permissions:[];
    if(required.every(permission=>granted.includes(permission)))return true;
    throw new ForbiddenException('Seu perfil não possui permissão para esta operação');
  }
}
