import {Module} from '@nestjs/common';
import {CasaNovaController} from './casa-nova.controller';
import {CasaNovaService} from './casa-nova.service';
@Module({controllers:[CasaNovaController],providers:[CasaNovaService]}) export class CasaNovaModule{}
