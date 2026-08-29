import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../roles.guard';
import { PlatformRequest } from '../../request-user';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformCreatePlanDto, PlatformCreateTenantDto, PlatformListQueryDto, PlatformPlanDto, PlatformTenantDto, PlatformUserDto } from './dto/platform.dto';

@Roles('platform_admin')
@Controller('platform')
export class PlatformController {
  constructor(private platform: PlatformAdminService) {}
  @Get('overview') overview(){return this.platform.overview()}
  @Get('tenants') tenants(@Query() query:PlatformListQueryDto){return this.platform.tenants(query)}
  @Get('subscriptions') subscriptions(@Query() query:PlatformListQueryDto){return this.platform.subscriptions(query)}
  @Get('payments') payments(@Query() query:PlatformListQueryDto){return this.platform.payments(query)}
  @Get('users') users(@Query() query:PlatformListQueryDto){return this.platform.users(query)}
  @Get('plans') plans(){return this.platform.plans()}
  @Post('plans') createPlan(@Body() body:PlatformCreatePlanDto){return this.platform.createPlan(body)}
  @Post('tenants') create(@Req() request:PlatformRequest,@Body() body:PlatformCreateTenantDto){return this.platform.createTenant(body,request.user.sub)}
  @Patch('tenants/:id') update(@Param('id') id:string,@Body() body:PlatformTenantDto){return this.platform.changeTenant(id,body)}
  @Post('tenants/:id/cancel-scheduled-change') cancel(@Param('id') id:string){return this.platform.cancelScheduledChange(id)}
  @Post('users/:id/password-reset') reset(@Param('id') id:string){return this.platform.passwordReset(id)}
  @Patch('users/:id') updateUser(@Param('id') id:string,@Body() body:PlatformUserDto){return this.platform.updateUser(id,body)}
  @Patch('plans/:plan') updatePlan(@Param('plan') plan:string,@Body() body:PlatformPlanDto){return this.platform.updatePlan(plan,body)}
}
