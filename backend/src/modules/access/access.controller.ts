import { Body,Controller,Get,Param,Patch,Post,Req,Res } from '@nestjs/common';
import { Public } from '../../public.decorator';
import { Roles } from '../../roles.guard';
import { TenantRequest } from '../../request-user';
import { AcceptInvitationDto,CreateAccessProfileDto,CreateUserDto,UpdateAccessProfileDto,UpdateUserDto } from './dto/access.dto';
import { AccessManagementService } from './access-management.service';
import { AuthService } from '../auth/auth.service';

@Controller()
export class AccessController {
  constructor(private access:AccessManagementService,private auth:AuthService){}
  @Public() @Get('auth/invitations/:token') invitation(@Param('token') t:string){return this.access.invitationInfo(t)}
  @Public() @Post('auth/invitations/:token/accept')
  async accept(@Param('token') t:string,@Body() b:AcceptInvitationDto){
    return this.access.acceptInvitation(t,b.password);
  }
  @Roles('owner','admin') @Get('users') users(@Req() r:TenantRequest){return this.access.users(r.user.tenantId)}
  @Roles('owner') @Post('users') create(@Req() r:TenantRequest,@Body() b:CreateUserDto){return this.access.createUser(r.user.tenantId,b,r.user.sub)}
  @Roles('owner') @Patch('users/:id') update(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateUserDto){return this.access.updateUser(r.user.tenantId,id,b,r.user.sub)}
  @Roles('owner') @Post('users/:id/password-reset') async passwordReset(@Req() r:TenantRequest,@Param('id') id:string){const user=await this.access.passwordResetTarget(r.user.tenantId,id,r.user.sub);return this.auth.forgotPassword(user.email)}
  @Roles('owner') @Get('user-invitations') invitations(@Req() r:TenantRequest){return this.access.userInvitations(r.user.tenantId)}
  @Roles('owner') @Post('user-invitations/:id/resend') resend(@Req() r:TenantRequest,@Param('id') id:string){return this.access.resendUserInvitation(r.user.tenantId,id,r.user.sub)}
  @Roles('owner') @Patch('user-invitations/:id/cancel') cancel(@Req() r:TenantRequest,@Param('id') id:string){return this.access.cancelUserInvitation(r.user.tenantId,id,r.user.sub)}
  @Roles('owner') @Get('access-profiles') profiles(@Req() r:TenantRequest){return this.access.accessProfiles(r.user.tenantId)}
  @Roles('owner') @Post('access-profiles') createProfile(@Req() r:TenantRequest,@Body() b:CreateAccessProfileDto){return this.access.createAccessProfile(r.user.tenantId,b,r.user.sub)}
  @Roles('owner') @Patch('access-profiles/:id') updateProfile(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateAccessProfileDto){return this.access.updateAccessProfile(r.user.tenantId,id,b,r.user.sub)}
}
