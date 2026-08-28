import { ServicesController } from './services.controller';
import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';

@Module({controllers:[ServicesController],
  providers:[ServicesService],
  exports:[ServicesService],
})
export class ServicesModule {}
