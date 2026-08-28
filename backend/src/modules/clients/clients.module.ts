import { ClientsController } from './clients.controller';
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Module({controllers:[ClientsController],
  providers:[ClientsService],
  exports:[ClientsService],
})
export class ClientsModule {}
