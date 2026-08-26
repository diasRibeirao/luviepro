import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
function context(user:any):any{return {getHandler:()=>function(){},getClass:()=>class{},switchToHttp:()=>({getRequest:()=>({user})})};}
describe('PermissionsGuard',()=>{
  it('não interfere em perfis padrão',()=>{const reflector={getAllAndOverride:()=>['clients.write']} as unknown as Reflector;expect(new PermissionsGuard(reflector).canActivate(context({role:'commercial'}))).toBe(true);});
  it('permite perfil personalizado com a permissão',()=>{const reflector={getAllAndOverride:()=>['clients.write']} as unknown as Reflector;expect(new PermissionsGuard(reflector).canActivate(context({role:'admin',customProfileId:'p1',permissions:['clients.write']}))).toBe(true);});
  it('nega perfil personalizado sem a permissão',()=>{const reflector={getAllAndOverride:()=>['clients.write']} as unknown as Reflector;expect(()=>new PermissionsGuard(reflector).canActivate(context({role:'admin',customProfileId:'p1',permissions:['clients.read']}))).toThrow(ForbiddenException);});
});
