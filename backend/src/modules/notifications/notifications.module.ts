import { NotificationsController } from './notifications.controller';
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
@Module({controllers:[NotificationsController],providers:[NotificationsService],exports:[NotificationsService]})
export class NotificationsModule {}
