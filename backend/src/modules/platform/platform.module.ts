import { PlatformController } from './platform.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformHealthService } from './platform-health.service';
import { PlatformBackupService } from './platform-backup.service';

@Module({controllers:[PlatformController],
  imports:[AuthModule],
  providers:[PlatformAdminService,PlatformHealthService,PlatformBackupService],
  exports:[PlatformAdminService],
})
export class PlatformModule {}
