import { AuditController } from './audit.controller';
import { Module } from '@nestjs/common'; import { AuditService } from './audit.service'; @Module({controllers:[AuditController],providers:[AuditService],exports:[AuditService]}) export class AuditModule {}
