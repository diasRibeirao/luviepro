import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function context(role?:string):any{
  return {
    getHandler:()=>function(){},
    getClass:()=>class{},
    switchToHttp:()=>({getRequest:()=>({user:{role}})}),
  };
}

describe('RolesGuard',()=>{
  it('permite role autorizada',()=>{
    const reflector={getAllAndOverride:()=>['owner','admin']} as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context('admin'))).toBe(true);
  });

  it('nega role sem permissão',()=>{
    const reflector={getAllAndOverride:()=>['owner']} as unknown as Reflector;
    expect(()=>new RolesGuard(reflector).canActivate(context('admin'))).toThrow(ForbiddenException);
  });

  it('impede administrador da plataforma de acessar rota de tenant sem autorização explícita',()=>{
    const reflector={getAllAndOverride:()=>undefined} as unknown as Reflector;
    expect(()=>new RolesGuard(reflector).canActivate(context('platform_admin'))).toThrow(ForbiddenException);
  });

  it('permite administrador da plataforma em rota explicitamente autorizada',()=>{
    const reflector={getAllAndOverride:()=>['platform_admin']} as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context('platform_admin'))).toBe(true);
  });
});
