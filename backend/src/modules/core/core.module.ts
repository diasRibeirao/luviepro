import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { MailService } from '../../mail.service';
import { TrialService } from './trial.service';

@Global()
@Module({
  providers:[PrismaService,RedisService,MailService,TrialService],
  exports:[PrismaService,RedisService,MailService,TrialService],
})
export class CoreModule {}
