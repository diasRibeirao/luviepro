import { Module } from '@nestjs/common';
import { ProjectsCalendarService } from './projects-calendar.service';
@Module({providers:[ProjectsCalendarService],exports:[ProjectsCalendarService]})
export class ProjectsModule {}
