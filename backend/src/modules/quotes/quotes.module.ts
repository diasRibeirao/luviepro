import { QuotesController } from './quotes.controller';
import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
@Module({controllers:[QuotesController],providers:[QuotesService],exports:[QuotesService]})
export class QuotesModule {}
