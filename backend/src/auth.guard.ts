import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
@Injectable() export class AuthGuard implements CanActivate {
  constructor(private jwt:JwtService,private reflector:Reflector){}
  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>('public',[ctx.getHandler(),ctx.getClass()])) return true;
    const req=ctx.switchToHttp().getRequest(); const token=req.headers.authorization?.replace(/^Bearer /,'');
    if(!token) throw new UnauthorizedException('Token ausente');
    try{req.user=await this.jwt.verifyAsync(token); return true;}catch{throw new UnauthorizedException('Token inválido');}
  }
}
