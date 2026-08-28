import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RedisService } from '../../redis.service';
import { MailService } from '../../mail.service';

@Global()
@Module({
  providers:[PrismaService,RedisService,MailService],
  exports:[PrismaService,RedisService,MailService],
})
export class CoreModule {}
