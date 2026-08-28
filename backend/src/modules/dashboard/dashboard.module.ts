import { DashboardController } from './dashboard.controller';
import { Module } from '@nestjs/common'; import { DashboardService } from './dashboard.service'; @Module({controllers:[DashboardController],providers:[DashboardService],exports:[DashboardService]}) export class DashboardModule {}
