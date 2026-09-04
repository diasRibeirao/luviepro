import {Body,Controller,Delete,Get,Param,Patch,Post,Req} from '@nestjs/common';
import {TenantRequest} from '../../request-user';
import {CasaNovaService} from './casa-nova.service';
import {BulkUpdateCasaNovaItemsDto,CasaNovaIdsDto,CreateCasaNovaItemDto,UpdateCasaNovaItemDto,UpdateCasaNovaListDto} from './dto/casa-nova.dto';


@Controller('casa-nova')
export class CasaNovaController{
  constructor(private service:CasaNovaService){}

  @Get()
  get(@Req()r:TenantRequest){return this.service.get(r.user.tenantId)}

  @Patch()
  update(@Req()r:TenantRequest,@Body()b:UpdateCasaNovaListDto){return this.service.updateList(r.user.tenantId,b)}

  @Post('essentials')
  essentials(@Req()r:TenantRequest){return this.service.addEssentials(r.user.tenantId)}

  @Post('items')
  add(@Req()r:TenantRequest,@Body()b:CreateCasaNovaItemDto){return this.service.addItem(r.user.tenantId,b)}

  @Patch('items/bulk')
  bulkUpdate(@Req()r:TenantRequest,@Body()b:BulkUpdateCasaNovaItemsDto){return this.service.bulkUpdateItems(r.user.tenantId,b)}

  @Delete('items/bulk')
  bulkRemove(@Req()r:TenantRequest,@Body()b:CasaNovaIdsDto){return this.service.bulkRemoveItems(r.user.tenantId,b.ids)}

  @Patch('items/:id')
  updateItem(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:UpdateCasaNovaItemDto){return this.service.updateItem(r.user.tenantId,id,b)}

  @Delete('items/:id')
  remove(@Req()r:TenantRequest,@Param('id')id:string){return this.service.removeItem(r.user.tenantId,id)}
}
