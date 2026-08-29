import { Body,Controller,Delete,Get,Param,Post,Req,Res,UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../public.decorator';
import { Roles } from '../../roles.guard';
import { PlatformRequest, TenantRequest } from '../../request-user';
import { PlatformAdminLoginDto } from '../platform/dto/platform.dto';
import { ForgotPasswordDto,LoginDto,RefreshDto,RegisterDto,ResetPasswordDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { clearRefreshCookie,isWebAuthClient,readRefreshCookie,webSessionResponse } from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(private auth:AuthService,private sessions:AuthSessionService){}

  private deliver<T extends { refreshToken: string }>(req:Request,res:Response,value:T){return isWebAuthClient(req)?webSessionResponse(res,value):value;}

  @Public() @Post('login')
  async login(@Body() b:LoginDto,@Req() req:Request,@Res({passthrough:true}) res:Response){return this.deliver(req,res,await this.auth.login(b.email,b.password));}

  @Public() @Post('platform-login')
  async platformLogin(@Body() b:PlatformAdminLoginDto,@Req() req:Request,@Res({passthrough:true}) res:Response){return this.deliver(req,res,await this.auth.platformLogin(b.email,b.password));}

  @Public() @Post('forgot-password') forgot(@Body() b:ForgotPasswordDto){return this.auth.forgotPassword(b.email)}
  @Public() @Post('reset-password') reset(@Body() b:ResetPasswordDto){return this.auth.resetPassword(b.token,b.password)}

  @Public() @Post('register')
  async register(@Body() b:RegisterDto,@Req() req:Request,@Res({passthrough:true}) res:Response){return this.deliver(req,res,await this.auth.register(b));}

  @Public() @Post('refresh')
  async refresh(@Body() b:RefreshDto,@Req() req:Request,@Res({passthrough:true}) res:Response){
    const web=isWebAuthClient(req);
    const refreshToken=web?readRefreshCookie(req):b.refreshToken;
    if(!refreshToken){if(web)clearRefreshCookie(res);throw new UnauthorizedException('Sessão expirada');}
    try{
      const value=await this.auth.refresh(refreshToken);
      return web?webSessionResponse(res,value):value;
    }catch(error){if(web)clearRefreshCookie(res);throw error;}
  }

  @Roles('platform_admin','owner','admin','commercial','operational','finance')
  @Post('logout')
  async logout(@Req() r:TenantRequest|PlatformRequest,@Res({passthrough:true}) res:Response){
    clearRefreshCookie(res);
    if(r.user.role==='platform_admin'){
      await this.sessions.revokePlatform(r.user.sub,r.user.sid);
      return {ok:true};
    }
    return this.auth.logout(r.user.sub,r.user.tenantId,r.user.sid);
  }

  @Get('sessions') list(@Req() r:TenantRequest){return this.sessions.listTenantSessions(r.user.sub,r.user.tenantId,r.user.sid)}
  @Delete('sessions/:id') revoke(@Req() r:TenantRequest,@Param('id') id:string){return this.sessions.revokeTenantSession(r.user.sub,r.user.tenantId,id)}
  @Delete('sessions') revokeOthers(@Req() r:TenantRequest){return this.sessions.revokeOtherTenantSessions(r.user.sub,r.user.tenantId,r.user.sid)}
}
