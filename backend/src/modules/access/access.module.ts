import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessManagementService } from './access-management.service';
@Module({imports:[AuthModule],providers:[AccessManagementService],exports:[AccessManagementService]})
export class AccessModule {}
