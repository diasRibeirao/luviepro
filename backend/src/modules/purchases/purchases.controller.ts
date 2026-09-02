import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Permissions } from '../../permissions.guard';
import { Roles } from '../../roles.guard';
import { TenantRequest } from '../../request-user';
import { CreatePurchaseDto, CreatePurchasePaymentDto, CreateSupplierDto, ReceivePurchaseDto, UpdatePurchaseDto, UpdateSupplierDto } from './dto/purchases.dto';
import { PurchasesService } from './purchases.service';
@Controller('purchases')
export class PurchasesController {
  constructor(private service:PurchasesService){}
  @Permissions('quotes.read') @Get() list(@Req()r:TenantRequest){return this.service.list(r.user.tenantId)}
  @Permissions('quotes.read') @Get('summary') summary(@Req()r:TenantRequest){return this.service.summary(r.user.tenantId)}
  @Permissions('quotes.read') @Get('suppliers') suppliers(@Req()r:TenantRequest){return this.service.suppliers(r.user.tenantId)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post('suppliers') createSupplier(@Req()r:TenantRequest,@Body()b:CreateSupplierDto){return this.service.createSupplier(r.user.tenantId,b)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Patch('suppliers/:id') updateSupplier(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:UpdateSupplierDto){return this.service.updateSupplier(r.user.tenantId,id,b)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post() create(@Req()r:TenantRequest,@Body()b:CreatePurchaseDto){return this.service.create(r.user.tenantId,b,r.user.sub)}
  @Permissions('quotes.read') @Get(':id') detail(@Req()r:TenantRequest,@Param('id')id:string){return this.service.detail(r.user.tenantId,id)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Patch(':id') update(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:UpdatePurchaseDto){return this.service.update(r.user.tenantId,id,b,r.user.sub)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post(':id/receive') receive(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:ReceivePurchaseDto){return this.service.receive(r.user.tenantId,id,b,r.user.sub)}
  @Roles('owner','admin','commercial') @Permissions('quotes.write') @Post(':id/payments') addPayment(@Req()r:TenantRequest,@Param('id')id:string,@Body()b:CreatePurchasePaymentDto){return this.service.addPayment(r.user.tenantId,id,b,r.user.sub)}
}
