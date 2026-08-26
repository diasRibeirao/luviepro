import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
@Injectable() export class AuthGuard implements CanActivate {
  constructor(private jwt:JwtService,private reflector:Reflector){}
  async canActivate(ctx:ExecutionContext){
    if(this.reflector.getAllAndOverride<boolean>('public',[ctx.getHandler(),ctx.getClass()])) return true;
    const req=ctx.switchToHttp().getRequest(); const token=req.headers.authorization?.replace(/^Bearer /,'');
    if(!token) throw new UnauthorizedException('Token ausente');
    try{const payload=await this.jwt.verifyAsync(token);if(payload.typ&&payload.typ!=='access')throw new Error('tipo inválido');req.user=payload;return true;}catch{throw new UnauthorizedException('Token inválido ou expirado');}
  }
}
