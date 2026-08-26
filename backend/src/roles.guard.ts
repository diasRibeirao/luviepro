import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export const Roles=(...roles:string[])=>SetMetadata('roles',roles);
@Injectable() export class RolesGuard implements CanActivate {
  constructor(private reflector:Reflector){}
  canActivate(ctx:ExecutionContext){const roles=this.reflector.getAllAndOverride<string[]>('roles',[ctx.getHandler(),ctx.getClass()]);if(!roles?.length)return true;const role=ctx.switchToHttp().getRequest().user?.role;if(!role||!roles.includes(role))throw new ForbiddenException('Você não possui permissão para esta operação');return true;}
}
