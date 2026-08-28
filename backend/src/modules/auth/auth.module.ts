import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { AuthSessionCleanupWorker } from './auth-session-cleanup.worker';
@Module({controllers:[AuthController],providers:[AuthSessionService,AuthSessionCleanupWorker,AuthService],exports:[AuthSessionService,AuthService]})
export class AuthModule {}
