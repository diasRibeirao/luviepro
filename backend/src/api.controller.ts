import { Body, Controller, Get, Param, Patch, Post, Req, SetMetadata } from '@nestjs/common';
import { ApiService } from './api.service';
import { HealthService } from './health.service';
const Public=()=>SetMetadata('public',true);
@Controller() export class ApiController {
  constructor(private api:ApiService,private healthService:HealthService){}
  @Public() @Get('health/live') live(){return this.healthService.live();}
  @Public() @Get('health') health(){return this.healthService.ready();}
  @Public() @Post('auth/login') login(@Body() b:any){return this.api.login(b.email,b.password);}
  @Public() @Post('auth/register') register(@Body() b:any){return this.api.register(b);}
  @Public() @Get('plans') plans(){return this.api.plans();}
  @Get('account') account(@Req() r:any){return this.api.account(r.user.tenantId);}
  @Patch('account/settings') updateAccount(@Req() r:any,@Body() b:any){return this.api.updateAccount(r.user.tenantId,b);}
  @Patch('account/plan') updatePlan(@Req() r:any,@Body() b:any){return this.api.updatePlan(r.user.tenantId,b.plan,b.period);}
  @Get('dashboard') dashboard(@Req() r:any){return this.api.dashboard(r.user.tenantId);}
  @Get('clients') clients(@Req() r:any){return this.api.clients(r.user.tenantId);}
  @Post('clients') createClient(@Req() r:any,@Body() b:any){return this.api.createClient(r.user.tenantId,b);}
  @Patch('clients/:id') updateClient(@Req() r:any,@Param('id') id:string,@Body() b:any){return this.api.updateClient(r.user.tenantId,id,b);}
  @Get('services') services(@Req() r:any){return this.api.services(r.user.tenantId);}
  @Get('quotes') quotes(@Req() r:any){return this.api.quotes(r.user.tenantId);}
  @Get('quotes/:id') quoteDetail(@Req() r:any,@Param('id') id:string){return this.api.quote(r.user.tenantId,id);}
  @Get('projects') projects(@Req() r:any){return this.api.projects(r.user.tenantId);}
  @Public() @Post('pricing/calculate') calculate(@Body() b:any){return this.api.calculate(b);}
  @Post('quotes') createQuote(@Req() r:any,@Body() b:any){return this.api.createQuote(r.user.tenantId,b);}
  @Patch('quotes/:id/approve') approve(@Req() r:any,@Param('id') id:string){return this.api.approve(r.user.tenantId,id);}
}
