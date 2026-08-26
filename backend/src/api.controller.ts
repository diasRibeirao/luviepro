import { Body, Controller, Get, Param, Patch, Post, Req, SetMetadata, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiService } from './api.service'; import { HealthService } from './health.service'; import { Roles } from './roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CalculateDto, CalendarEventDto, ClientDto, CreateProjectTaskDto, CreateProjectNoteDto, CreateQuoteDto, CreateUserDto, LoginDto, NotificationPreferencesDto, QuoteStatusDto, RefreshDto, RegisterDto, UpdateAccountDto, UpdatePlanDto, UpdateProjectDto, UpdateProjectTaskDto, UpdateQuoteDto, UpdateUserDto, ServiceDto, PublicProposalDecisionDto, ChangePasswordDto } from './dtos';
const Public=()=>SetMetadata('public',true);
@Controller() export class ApiController {
  constructor(private api:ApiService,private healthService:HealthService){}
  @Public() @Get('health/live') live(){return this.healthService.live();} @Public() @Get('health') health(){return this.healthService.ready();}
  @Public() @Post('auth/login') login(@Body() b:LoginDto){return this.api.login(b.email,b.password);}
  @Public() @Post('auth/register') register(@Body() b:RegisterDto){return this.api.register(b);}
  @Public() @Post('auth/refresh') refresh(@Body() b:RefreshDto){return this.api.refresh(b.refreshToken);}
  @Post('auth/logout') logout(@Req() r:any){return this.api.logout(r.user.sub,r.user.tenantId);}
  @Public() @Get('plans') plans(){return this.api.plans();}
  @Public() @Get('public/proposals/:token') publicProposal(@Param('token') token:string){return this.api.publicProposal(token);}
  @Public() @Post('public/proposals/:token/decision') decidePublicProposal(@Param('token') token:string,@Body() b:PublicProposalDecisionDto){return this.api.decidePublicProposal(token,b.decision as 'approved'|'rejected',b.name);} @Get('account') account(@Req() r:any){return this.api.account(r.user.tenantId,r.user.sub);}
  @Roles('owner','admin') @Patch('account/settings') updateAccount(@Req() r:any,@Body() b:UpdateAccountDto){return this.api.updateAccount(r.user.tenantId,b,r.user.sub);}
  @Roles('owner','admin') @Post('account/logo') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2*1024*1024}})) uploadLogo(@Req() r:any,@UploadedFile() file:any){return this.api.uploadLogo(r.user.tenantId,file,r.user.sub);}
  @Roles('owner','admin') @Post('account/logo/remove') removeLogo(@Req() r:any){return this.api.removeLogo(r.user.tenantId,r.user.sub);}
  @Patch('account/password') changePassword(@Req() r:any,@Body() b:ChangePasswordDto){return this.api.changePassword(r.user.tenantId,r.user.sub,b.currentPassword,b.newPassword);}
  @Roles('owner') @Patch('account/plan') updatePlan(@Req() r:any,@Body() b:UpdatePlanDto){return this.api.updatePlan(r.user.tenantId,b.plan,b.period,r.user.sub);}

  @Roles('owner','admin') @Get('users') users(@Req() r:any){return this.api.users(r.user.tenantId);}
  @Roles('owner') @Post('users') createUser(@Req() r:any,@Body() b:CreateUserDto){return this.api.createUser(r.user.tenantId,b,r.user.sub);}
  @Roles('owner') @Patch('users/:id') updateUser(@Req() r:any,@Param('id') id:string,@Body() b:UpdateUserDto){return this.api.updateUser(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Get('audit-logs') auditLogs(@Req() r:any){return this.api.auditLogs(r.user.tenantId);}
  @Get('calendar') calendar(@Req() r:any){return this.api.calendar(r.user.tenantId);}
  @Roles('owner','admin') @Post('calendar') createCalendarEvent(@Req() r:any,@Body() b:CalendarEventDto){return this.api.createCalendarEvent(r.user.tenantId,r.user.sub,b);}
  @Roles('owner','admin') @Patch('calendar/:id/cancel') cancelCalendarEvent(@Req() r:any,@Param('id') id:string){return this.api.cancelCalendarEvent(r.user.tenantId,id,r.user.sub);}
  @Get('notifications') notifications(@Req() r:any){return this.api.notifications(r.user.tenantId,r.user.sub);}
  @Get('notifications/unread-count') unreadNotifications(@Req() r:any){return this.api.unreadNotifications(r.user.tenantId,r.user.sub);}
  @Patch('notifications/read-all') readAllNotifications(@Req() r:any){return this.api.readAllNotifications(r.user.tenantId,r.user.sub);}
  @Patch('notifications/:id/read') readNotification(@Req() r:any,@Param('id') id:string){return this.api.readNotification(r.user.tenantId,r.user.sub,id);}
  @Get('notifications/preferences') notificationPreferences(@Req() r:any){return this.api.notificationPreferences(r.user.tenantId,r.user.sub);}
  @Patch('notifications/preferences') updateNotificationPreferences(@Req() r:any,@Body() b:NotificationPreferencesDto){return this.api.updateNotificationPreferences(r.user.tenantId,r.user.sub,b);}
  @Get('dashboard') dashboard(@Req() r:any){return this.api.dashboard(r.user.tenantId);} @Get('clients') clients(@Req() r:any){return this.api.clients(r.user.tenantId);}
  @Roles('owner','admin') @Post('clients') createClient(@Req() r:any,@Body() b:ClientDto){return this.api.createClient(r.user.tenantId,b,r.user.sub);} @Roles('owner','admin') @Patch('clients/:id') updateClient(@Req() r:any,@Param('id') id:string,@Body() b:ClientDto){return this.api.updateClient(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Post('services') createService(@Req() r:any,@Body() b:ServiceDto){return this.api.createService(r.user.tenantId,b,r.user.sub);}
  @Roles('owner','admin') @Patch('services/:id') updateService(@Req() r:any,@Param('id') id:string,@Body() b:ServiceDto){return this.api.updateService(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Get('quotes/:id/timeline') quoteTimeline(@Req() r:any,@Param('id') id:string){return this.api.quoteTimeline(r.user.tenantId,id);}
  @Roles('owner','admin') @Get('quotes/:id/versions') quoteVersions(@Req() r:any,@Param('id') id:string){return this.api.quoteVersions(r.user.tenantId,id);}
  @Roles('owner','admin') @Patch('quotes/:id') updateQuote(@Req() r:any,@Param('id') id:string,@Body() b:UpdateQuoteDto){return this.api.updateQuote(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Post('quotes/:id/share') shareQuote(@Req() r:any,@Param('id') id:string){return this.api.shareQuote(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin') @Post('quotes/:id/share/revoke') revokeQuoteShare(@Req() r:any,@Param('id') id:string){return this.api.revokeQuoteShare(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin') @Post('quotes/:id/duplicate') duplicateQuote(@Req() r:any,@Param('id') id:string){return this.api.duplicateQuote(r.user.tenantId,id,r.user.sub);}
  @Get('services') services(@Req() r:any){return this.api.services(r.user.tenantId);} @Get('quotes') quotes(@Req() r:any){return this.api.quotes(r.user.tenantId);} @Get('quotes/:id') quoteDetail(@Req() r:any,@Param('id') id:string){return this.api.quote(r.user.tenantId,id);} @Get('projects') projects(@Req() r:any){return this.api.projects(r.user.tenantId);} @Get('projects/:id') project(@Req() r:any,@Param('id') id:string){return this.api.project(r.user.tenantId,id);}
  @Public() @Post('pricing/calculate') calculate(@Body() b:CalculateDto){return this.api.calculate(b);} @Roles('owner','admin') @Post('quotes') createQuote(@Req() r:any,@Body() b:CreateQuoteDto){return this.api.createQuote(r.user.tenantId,b,r.user.sub);} @Roles('owner','admin') @Patch('quotes/:id/status') quoteStatus(@Req() r:any,@Param('id') id:string,@Body() b:QuoteStatusDto){return this.api.updateQuoteStatus(r.user.tenantId,id,b.status,r.user.sub);} @Roles('owner','admin') @Patch('quotes/:id/approve') approve(@Req() r:any,@Param('id') id:string){return this.api.approve(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin') @Patch('projects/:id') updateProject(@Req() r:any,@Param('id') id:string,@Body() b:UpdateProjectDto){return this.api.updateProject(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Post('projects/:id/notes') createProjectNote(@Req() r:any,@Param('id') id:string,@Body() b:CreateProjectNoteDto){return this.api.createProjectNote(r.user.tenantId,id,b.content,r.user.sub);}
  @Roles('owner','admin') @Post('projects/:id/tasks') createProjectTask(@Req() r:any,@Param('id') id:string,@Body() b:CreateProjectTaskDto){return this.api.createProjectTask(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Patch('projects/:projectId/tasks/:taskId') updateProjectTask(@Req() r:any,@Param('projectId') projectId:string,@Param('taskId') taskId:string,@Body() b:UpdateProjectTaskDto){return this.api.updateProjectTask(r.user.tenantId,projectId,taskId,b,r.user.sub);}
}
