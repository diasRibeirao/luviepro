import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Permissions } from '../../permissions.guard';
import { Roles } from '../../roles.guard';
import { TenantRequest } from '../../request-user';
import { CreateFinancialCategoryDto, CreateFinancialEntryDto, PayFinancialEntryDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';
@Controller('finance')
export class FinanceController {
  constructor(private finance:FinanceService){}
  @Permissions('finance.read') @Get('summary') summary(@Req() r:TenantRequest){return this.finance.summary(r.user.tenantId)}
  @Permissions('finance.read') @Get('entries') entries(@Req() r:TenantRequest){return this.finance.entries(r.user.tenantId)}
  @Permissions('finance.read') @Get('obligations') obligations(@Req() r:TenantRequest){return this.finance.obligations(r.user.tenantId)}
  @Permissions('finance.read') @Get('report') report(@Req() r:TenantRequest,@Query('months') months?:string){return this.finance.report(r.user.tenantId,Number(months)||12)}
  @Permissions('finance.read') @Get('categories') categories(@Req() r:TenantRequest){return this.finance.categories(r.user.tenantId)}
  @Roles('owner','admin','finance') @Permissions('finance.read') @Post('categories') createCategory(@Req() r:TenantRequest,@Body() b:CreateFinancialCategoryDto){return this.finance.createCategory(r.user.tenantId,b)}
  @Roles('owner','admin','finance') @Permissions('finance.read') @Post('entries') createEntry(@Req() r:TenantRequest,@Body() b:CreateFinancialEntryDto){return this.finance.createEntry(r.user.tenantId,b,r.user.sub)}
  @Roles('owner','admin','finance') @Permissions('finance.read') @Patch('entries/:id/pay') payEntry(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:PayFinancialEntryDto){return this.finance.payEntry(r.user.tenantId,id,b,r.user.sub)}
  @Roles('owner','admin','finance') @Permissions('finance.read') @Patch('entries/:id/cancel') cancelEntry(@Req() r:TenantRequest,@Param('id') id:string){return this.finance.cancelEntry(r.user.tenantId,id,r.user.sub)}
}
