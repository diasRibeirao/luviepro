import { BillingController } from './billing.controller';
import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { SubscriptionService } from './subscription.service';
import { BillingReconciliationWorker } from './billing-reconciliation.worker';
@Module({controllers:[BillingController],providers:[SubscriptionService,BillingService,BillingReconciliationWorker],exports:[SubscriptionService,BillingService]})
export class BillingModule {}
