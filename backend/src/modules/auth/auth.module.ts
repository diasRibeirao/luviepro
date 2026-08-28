import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { AuthSessionCleanupWorker } from './auth-session-cleanup.worker';
import { BillingModule } from '../billing/billing.module';
@Module({controllers:[AuthController],imports:[BillingModule],providers:[AuthSessionService,AuthSessionCleanupWorker,AuthService],exports:[AuthSessionService,AuthService]})
export class AuthModule {}
