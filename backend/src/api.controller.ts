import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, SetMetadata, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiService } from './api.service'; import { HealthService } from './health.service'; import { NotificationsService } from './modules/notifications/notifications.service'; import { Roles } from './roles.guard'; import { Permissions } from './permissions.guard';
import { PlatformRequest, TenantRequest } from './request-user';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginDto, RefreshDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './modules/auth/dto/auth.dto';
import { CreateUserDto, UpdateUserDto, AcceptInvitationDto, CreateAccessProfileDto, UpdateAccessProfileDto } from './modules/access/dto/access.dto';
import { CreateCheckoutDto, UpdatePlanDto } from './modules/billing/dto/billing.dto';
import { CalculateDto, CreateQuoteDto, UpdateQuoteDto, QuoteStatusDto, PublicProposalDecisionDto } from './modules/quotes/dto/quotes.dto';
import { UpdateProjectDto, CreateProjectStatusDto, UpdateProjectStatusDto, CreateProjectTaskDto, UpdateProjectTaskDto, CreateProjectNoteDto } from './modules/projects/dto/projects.dto';
import { CalendarEventDto, UpdateCalendarEventDto } from './modules/calendar/dto/calendar.dto';
import { NotificationPreferencesDto } from './modules/notifications/dto/notifications.dto';
import { CreateClientDto, UpdateClientDto } from './modules/clients/dto/clients.dto';
import { CreateServiceDto, UpdateServiceDto } from './modules/services/dto/services.dto';
import { PlatformAdminLoginDto, PlatformCreateTenantDto, PlatformPlanDto, PlatformTenantDto, PlatformUserDto } from './modules/platform/dto/platform.dto';
import { UpdateAccountDto } from './modules/account/dto/account.dto';
import { AuditQueryDto } from './modules/audit/dto/audit.dto';
const Public=()=>SetMetadata('public',true);
@Controller() export class ApiController {
  constructor(private api:ApiService,private healthService:HealthService,private notificationsService:NotificationsService){}
  @Public() @Get('health/live') live(){return this.healthService.live();} @Public() @Get('health') health(){return this.healthService.ready();}
  @Public() @Post('auth/login') login(@Body() b:LoginDto){return this.api.login(b.email,b.password);}
  @Public() @Post('auth/platform-login') platformLogin(@Body() b:PlatformAdminLoginDto){return this.api.platformLogin(b.email,b.password);}
  @Roles('platform_admin') @Get('platform/overview') platformOverview(){return this.api.platformOverview();}
  @Roles('platform_admin') @Get('platform/tenants') platformTenants(){return this.api.platformTenants();}
  @Roles('platform_admin') @Get('platform/subscriptions') platformSubscriptions(){return this.api.platformSubscriptions();}
  @Roles('platform_admin') @Get('platform/payments') platformPayments(){return this.api.platformPayments();}
  @Roles('platform_admin') @Get('platform/users') platformUsers(){return this.api.platformUsers();}
  @Roles('platform_admin') @Get('platform/plans') platformPlans(){return this.api.platformPlans();}
  @Roles('platform_admin') @Post('platform/tenants') platformCreateTenant(@Req() r:PlatformRequest,@Body() b:PlatformCreateTenantDto){return this.api.platformCreateTenant(b,r.user.sub);}
  @Roles('platform_admin') @Patch('platform/tenants/:id') platformUpdateTenant(@Param('id') id:string,@Body() b:PlatformTenantDto){return this.api.platformChangeTenant(id,b);}
  @Roles('platform_admin') @Post('platform/tenants/:id/cancel-scheduled-change') platformCancelScheduledChange(@Param('id') id:string){return this.api.platformCancelScheduledChange(id);}
  @Roles('platform_admin') @Post('platform/users/:id/password-reset') platformPasswordReset(@Param('id') id:string){return this.api.platformPasswordReset(id);}
  @Roles('platform_admin') @Patch('platform/users/:id') platformUpdateUser(@Param('id') id:string,@Body() b:PlatformUserDto){return this.api.platformUpdateUser(id,b);}
  @Roles('platform_admin') @Patch('platform/plans/:plan') platformUpdatePlan(@Param('plan') plan:string,@Body() b:PlatformPlanDto){return this.api.platformUpdatePlan(plan,b);}
  @Public() @Post('auth/forgot-password') forgotPassword(@Body() b:ForgotPasswordDto){return this.api.forgotPassword(b.email);}
  @Public() @Post('auth/reset-password') resetPassword(@Body() b:ResetPasswordDto){return this.api.resetPassword(b.token,b.password);}
  @Public() @Post('auth/register') register(@Body() b:RegisterDto){return this.api.register(b);}
  @Public() @Get('auth/invitations/:token') invitationInfo(@Param('token') token:string){return this.api.invitationInfo(token);}
  @Public() @Post('auth/invitations/:token/accept') acceptInvitation(@Param('token') token:string,@Body() b:AcceptInvitationDto){return this.api.acceptInvitation(token,b.password);}
  @Public() @Post('auth/refresh') refresh(@Body() b:RefreshDto){return this.api.refresh(b.refreshToken);}
  @Post('auth/logout') logout(@Req() r:TenantRequest){return this.api.logout(r.user.sub,r.user.tenantId,r.user.sid);}
  @Get('auth/sessions') authSessions(@Req() r:TenantRequest){return this.api.listAuthSessions(r.user.sub,r.user.tenantId,r.user.sid);}
  @Delete('auth/sessions/:sessionId') revokeAuthSession(@Req() r:TenantRequest,@Param('sessionId') sessionId:string){return this.api.revokeAuthSession(r.user.sub,r.user.tenantId,sessionId);}
  @Delete('auth/sessions') revokeOtherAuthSessions(@Req() r:TenantRequest){return this.api.revokeOtherAuthSessions(r.user.sub,r.user.tenantId,r.user.sid);}
  @Public() @Get('plans') plans(){return this.api.plans();}
  @Public() @Get('public/proposals/:token') publicProposal(@Param('token') token:string){return this.api.publicProposal(token);}
  @Public() @Post('public/proposals/:token/decision') decidePublicProposal(@Param('token') token:string,@Body() b:PublicProposalDecisionDto){return this.api.decidePublicProposal(token,b.decision as 'approved'|'rejected',b.name);} @Get('account') account(@Req() r:TenantRequest){return this.api.account(r.user.tenantId,r.user.sub);}
  @Roles('owner','admin') @Permissions('settings.manage') @Patch('account/settings') updateAccount(@Req() r:TenantRequest,@Body() b:UpdateAccountDto){return this.api.updateAccount(r.user.tenantId,b,r.user.sub);}
  @Roles('owner','admin') @Permissions('settings.manage') @Post('account/logo') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2*1024*1024}})) uploadLogo(@Req() r:TenantRequest,@UploadedFile() file:any){return this.api.uploadLogo(r.user.tenantId,file,r.user.sub);}
  @Roles('owner','admin') @Permissions('settings.manage') @Post('account/logo/remove') removeLogo(@Req() r:TenantRequest){return this.api.removeLogo(r.user.tenantId,r.user.sub);}
  @Patch('account/password') changePassword(@Req() r:TenantRequest,@Body() b:ChangePasswordDto){return this.api.changePassword(r.user.tenantId,r.user.sub,b.currentPassword,b.newPassword);}
  @Roles('owner') @Patch('account/plan') updatePlan(@Req() r:TenantRequest,@Body() b:UpdatePlanDto){return this.api.updatePlan(r.user.tenantId,b.plan,b.period,r.user.sub);}
  @Roles('owner') @Post('billing/checkout') createCheckout(@Req() r:TenantRequest,@Body() b:CreateCheckoutDto){return this.api.createCheckout(r.user.tenantId,r.user.sub,b.plan,b.period);}
  @Roles('owner','admin') @Get('billing/payments') billingPayments(@Req() r:TenantRequest){return this.api.billingPayments(r.user.tenantId);}
  @Roles('owner','admin') @Get('billing/metrics') billingMetrics(@Req() r:TenantRequest){return this.api.billingMetrics(r.user.tenantId);}
  @Roles('owner','admin') @Post('billing/payments/:id/reconcile') reconcilePayment(@Req() r:TenantRequest,@Param('id') id:string){return this.api.reconcilePayment(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin') @Post('billing/mercado-pago/return/:paymentId/reconcile') reconcileMercadoPagoReturn(@Req() r:TenantRequest,@Param('paymentId') paymentId:string){return this.api.reconcileMercadoPagoReturn(r.user.tenantId,paymentId,r.user.sub);}
  @Public() @Post('billing/webhooks/mercado-pago') mercadoPagoWebhook(@Body() b:any,@Query('data.id') dataId:string,@Query('id') id:string,@Headers('x-signature') signature:string,@Headers('x-request-id') requestId:string){return this.api.mercadoPagoWebhook(b,dataId||id,signature,requestId);}

  @Roles('owner','admin') @Get('users') users(@Req() r:TenantRequest){return this.api.users(r.user.tenantId);}
  @Roles('owner') @Post('users') createUser(@Req() r:TenantRequest,@Body() b:CreateUserDto){return this.api.createUser(r.user.tenantId,b,r.user.sub);}
  @Roles('owner') @Get('user-invitations') userInvitations(@Req() r:TenantRequest){return this.api.userInvitations(r.user.tenantId);}
  @Roles('owner') @Post('user-invitations/:id/resend') resendUserInvitation(@Req() r:TenantRequest,@Param('id') id:string){return this.api.resendUserInvitation(r.user.tenantId,id,r.user.sub);}
  @Roles('owner') @Patch('user-invitations/:id/cancel') cancelUserInvitation(@Req() r:TenantRequest,@Param('id') id:string){return this.api.cancelUserInvitation(r.user.tenantId,id,r.user.sub);}
  @Roles('owner') @Patch('users/:id') updateUser(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateUserDto){return this.api.updateUser(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner') @Get('access-profiles') accessProfiles(@Req() r:TenantRequest){return this.api.accessProfiles(r.user.tenantId);}
  @Roles('owner') @Post('access-profiles') createAccessProfile(@Req() r:TenantRequest,@Body() b:CreateAccessProfileDto){return this.api.createAccessProfile(r.user.tenantId,b,r.user.sub);}
  @Roles('owner') @Patch('access-profiles/:id') updateAccessProfile(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateAccessProfileDto){return this.api.updateAccessProfile(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Permissions('audit.read') @Get('audit-logs') auditLogs(@Req() r:TenantRequest,@Query() q:AuditQueryDto){return this.api.auditLogs(r.user.tenantId,q);}
  @Permissions('calendar.read') @Get('calendar') calendar(@Req() r:TenantRequest){return this.api.calendar(r.user.tenantId);}
  @Roles('owner','admin','commercial','operational') @Permissions('calendar.write') @Post('calendar') createCalendarEvent(@Req() r:TenantRequest,@Body() b:CalendarEventDto){return this.api.createCalendarEvent(r.user.tenantId,r.user.sub,b);}
  @Roles('owner','admin','commercial','operational') @Permissions('calendar.write') @Patch('calendar/:id') updateCalendarEvent(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateCalendarEventDto){return this.api.updateCalendarEvent(r.user.tenantId,id,r.user.sub,b);}
  @Roles('owner','admin','commercial','operational') @Permissions('calendar.write') @Patch('calendar/:id/cancel') cancelCalendarEvent(@Req() r:TenantRequest,@Param('id') id:string){return this.api.cancelCalendarEvent(r.user.tenantId,id,r.user.sub);}
  @Get('notifications') notifications(@Req() r:TenantRequest){return this.notificationsService.list(r.user.tenantId,r.user.sub);}
  @Get('notifications/unread-count') unreadNotifications(@Req() r:TenantRequest){return this.notificationsService.unreadCount(r.user.tenantId,r.user.sub);}
  @Patch('notifications/read-all') readAllNotifications(@Req() r:TenantRequest){return this.notificationsService.readAll(r.user.tenantId,r.user.sub);}
  @Patch('notifications/:id/read') readNotification(@Req() r:TenantRequest,@Param('id') id:string){return this.notificationsService.read(r.user.tenantId,r.user.sub,id);}
  @Get('notifications/preferences') notificationPreferences(@Req() r:TenantRequest){return this.notificationsService.preferencesFor(r.user.tenantId,r.user.sub);}
  @Patch('notifications/preferences') updateNotificationPreferences(@Req() r:TenantRequest,@Body() b:NotificationPreferencesDto){return this.notificationsService.updatePreferences(r.user.tenantId,r.user.sub,b);}
  @Permissions('dashboard.read') @Get('dashboard') dashboard(@Req() r:TenantRequest){return this.api.dashboard(r.user.tenantId);} @Permissions('clients.read') @Get('clients') clients(@Req() r:TenantRequest){return this.api.clients(r.user.tenantId);}
  @Roles('owner','admin','commercial') @Permissions('clients.write') @Post('clients') createClient(@Req() r:TenantRequest,@Body() b:CreateClientDto){return this.api.createClient(r.user.tenantId,b,r.user.sub);} @Roles('owner','admin','commercial') @Permissions('clients.write') @Patch('clients/:id') updateClient(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateClientDto){return this.api.updateClient(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('services.write') @Post('services') createService(@Req() r:TenantRequest,@Body() b:CreateServiceDto){return this.api.createService(r.user.tenantId,b,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('services.write') @Patch('services/:id') updateService(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateServiceDto){return this.api.updateService(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('quotes.read') @Get('quotes/:id/timeline') quoteTimeline(@Req() r:TenantRequest,@Param('id') id:string){return this.api.quoteTimeline(r.user.tenantId,id);}
  @Roles('owner','admin','commercial') @Permissions('quotes.read') @Get('quotes/:id/versions') quoteVersions(@Req() r:TenantRequest,@Param('id') id:string){return this.api.quoteVersions(r.user.tenantId,id);}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Patch('quotes/:id') updateQuote(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateQuoteDto){return this.api.updateQuote(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post('quotes/:id/share') shareQuote(@Req() r:TenantRequest,@Param('id') id:string){return this.api.shareQuote(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post('quotes/:id/share/revoke') revokeQuoteShare(@Req() r:TenantRequest,@Param('id') id:string){return this.api.revokeQuoteShare(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post('quotes/:id/duplicate') duplicateQuote(@Req() r:TenantRequest,@Param('id') id:string){return this.api.duplicateQuote(r.user.tenantId,id,r.user.sub);}
  @Permissions('services.read') @Get('services') services(@Req() r:TenantRequest){return this.api.services(r.user.tenantId);} @Permissions('quotes.read') @Get('quotes') quotes(@Req() r:TenantRequest){return this.api.quotes(r.user.tenantId);} @Permissions('quotes.read') @Get('quotes/:id') quoteDetail(@Req() r:TenantRequest,@Param('id') id:string){return this.api.quote(r.user.tenantId,id);} @Permissions('projects.read') @Get('projects') projects(@Req() r:TenantRequest){return this.api.projects(r.user.tenantId);} @Permissions('projects.read') @Get('projects/:id') project(@Req() r:TenantRequest,@Param('id') id:string){return this.api.project(r.user.tenantId,id);}
  @Public() @Post('pricing/calculate') calculate(@Body() b:CalculateDto){return this.api.calculate(b);} @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post('quotes') createQuote(@Req() r:TenantRequest,@Body() b:CreateQuoteDto){return this.api.createQuote(r.user.tenantId,b,r.user.sub);} @Roles('owner','admin','commercial') @Permissions('quotes.write') @Patch('quotes/:id/status') quoteStatus(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:QuoteStatusDto){return this.api.updateQuoteStatus(r.user.tenantId,id,b.status,r.user.sub);} @Roles('owner','admin','commercial') @Permissions('quotes.write') @Patch('quotes/:id/approve') approve(@Req() r:TenantRequest,@Param('id') id:string){return this.api.approve(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin','operational') @Permissions('projects.write') @Patch('projects/:id') updateProject(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateProjectDto){return this.api.updateProject(r.user.tenantId,id,b,r.user.sub);}
  @Permissions('projects.read') @Get('project-statuses') projectStatuses(@Req() r:TenantRequest){return this.api.projectStatuses(r.user.tenantId);}
  @Roles('owner','admin') @Permissions('projects.write') @Post('project-statuses') createProjectStatus(@Req() r:TenantRequest,@Body() b:CreateProjectStatusDto){return this.api.createProjectStatus(r.user.tenantId,b,r.user.sub);}
  @Roles('owner','admin') @Permissions('projects.write') @Patch('project-statuses/:id') updateProjectStatus(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateProjectStatusDto){return this.api.updateProjectStatus(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin') @Permissions('projects.write') @Delete('project-statuses/:id') deleteProjectStatus(@Req() r:TenantRequest,@Param('id') id:string){return this.api.deleteProjectStatus(r.user.tenantId,id,r.user.sub);}
  @Roles('owner','admin','operational') @Permissions('projects.write') @Post('projects/:id/notes') createProjectNote(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:CreateProjectNoteDto){return this.api.createProjectNote(r.user.tenantId,id,b.content,r.user.sub);}
  @Roles('owner','admin','operational') @Permissions('projects.write') @Post('projects/:id/tasks') createProjectTask(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:CreateProjectTaskDto){return this.api.createProjectTask(r.user.tenantId,id,b,r.user.sub);}
  @Roles('owner','admin','operational') @Permissions('projects.write') @Patch('projects/:projectId/tasks/:taskId') updateProjectTask(@Req() r:TenantRequest,@Param('projectId') projectId:string,@Param('taskId') taskId:string,@Body() b:UpdateProjectTaskDto){return this.api.updateProjectTask(r.user.tenantId,projectId,taskId,b,r.user.sub);}
}
