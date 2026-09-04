import {Body,Controller,Delete,Get,Param,Patch,Post,Req} from '@nestjs/common';
import {Roles} from '../../roles.guard';
import {TenantRequest} from '../../request-user';
import {CasaNovaService} from './casa-nova.service';
import {BulkUpdateCasaNovaItemsDto,CasaNovaIdsDto,CreateCasaNovaItemDto,UpdateCasaNovaItemDto,UpdateCasaNovaListDto} from './dto/casa-nova.dto';

const CASA_NOVA_WRITE_ROLES=['owner','admin','commercial','operational','finance'] as const;

@Controller('casa-nova')
export class CasaNovaController{
  constructor(private service:CasaNovaService){}

  @Get()
  get(@Req()r:TenantRequest){return this.service.get(r.user.tenantId)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Patch()
  update(@Req()r:TenantRequest,@Body()b:UpdateCasaNovaListDto){return this.service.updateList(r.user.tenantId,b)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Post('essentials')
  essentials(@Req()r:TenantRequest){return this.service.addEssentials(r.user.tenantId)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Post('items')
  add(@Req()r:TenantRequest,@Body()b:CreateCasaNovaItemDto){return this.service.addItem(r.user.tenantId,b)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Patch('items/bulk')
  bulkUpdate(@Req()r:TenantRequest,@Body()b:BulkUpdateCasaNovaItemsDto){return this.service.bulkUpdateItems(r.user.tenantId,b)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Delete('items/bulk')
  bulkRemove(@Req()r:TenantRequest,@Body()b:CasaNovaIdsDto){return this.service.bulkRemoveItems(r.user.tenantId,b.ids)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Patch('items/:id')
  updateItem(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:UpdateCasaNovaItemDto){return this.service.updateItem(r.user.tenantId,id,b)}

  @Roles(...CASA_NOVA_WRITE_ROLES)
  @Delete('items/:id')
  remove(@Req()r:TenantRequest,@Param('id')id:string){return this.service.removeItem(r.user.tenantId,id)}
}
