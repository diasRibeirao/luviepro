import { AccessController } from './access.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessManagementService } from './access-management.service';
@Module({controllers:[AccessController],imports:[AuthModule],providers:[AccessManagementService],exports:[AccessManagementService]})
export class AccessModule {}
