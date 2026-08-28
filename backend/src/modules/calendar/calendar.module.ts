import { CalendarController } from './calendar.controller';
import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Module({controllers:[CalendarController], providers: [CalendarService], exports: [CalendarService] })
export class CalendarModule {}
