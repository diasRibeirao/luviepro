import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports:[AuthModule],
  providers:[PlatformAdminService],
  exports:[PlatformAdminService],
})
export class PlatformModule {}
