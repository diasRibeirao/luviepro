import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
@Module({imports:[CoreModule],controllers:[FinanceController],providers:[FinanceService],exports:[FinanceService]})
export class FinanceModule {}
