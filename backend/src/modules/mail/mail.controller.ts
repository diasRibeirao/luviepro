import {Controller,Get,Post,Req} from '@nestjs/common';
import {Roles} from '../../roles.guard';
import {PlatformRequest} from '../../request-user';
import {PrismaService} from '../../prisma.service';
import {MailService} from '../../mail.service';

@Roles('platform_admin')
@Controller('platform/mail')
export class MailController {
 constructor(private readonly mail:MailService,private readonly db:PrismaService){}
 @Get('status') status(){return this.mail.status();}
 @Post('verify') verify(){return this.mail.verify();}
 @Post('test')
 async test(@Req() r:PlatformRequest){
  const admin=await this.db.platformAdmin.findFirst({where:{id:r.user.sub,active:true},select:{name:true,email:true}});
  if(!admin)return {sent:false,reason:'user_not_found'};
  const configured=(process.env.PLATFORM_ADMIN_NOTIFICATION_EMAIL||'').trim().toLowerCase();
  const loginEmail=admin.email.trim().toLowerCase();
  const to=configured||loginEmail;
  if(!this.isDeliverableEmail(to))return {sent:false,reason:'notification_email_not_configured'};
  const delivery=await this.mail.sendTest({to,name:admin.name});
  return {...delivery,to};
 }
 private isDeliverableEmail(value:string){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&!value.endsWith('.local');
 }
}
