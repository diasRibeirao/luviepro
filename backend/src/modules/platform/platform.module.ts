import { PlatformController } from './platform.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformAdminService } from './platform-admin.service';

@Module({controllers:[PlatformController],
  imports:[AuthModule],
  providers:[PlatformAdminService],
  exports:[PlatformAdminService],
})
export class PlatformModule {}
