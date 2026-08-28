import { AccountController } from './account.controller';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AccountService } from './account.service';
@Module({controllers:[AccountController],imports:[BillingModule],providers:[AccountService],exports:[AccountService]}) export class AccountModule {}
