import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Permissions } from '../../permissions.guard';
import { Roles } from '../../roles.guard';
import { TenantRequest } from '../../request-user';
import { CreateOrderPaymentDto, UpdateOrderDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';
@Controller('orders')
export class OrdersController {
  constructor(private orders:OrdersService){}
  @Permissions('orders.read') @Get() list(@Req() r:TenantRequest){return this.orders.list(r.user.tenantId)}
  @Permissions('orders.read') @Get('summary') summary(@Req() r:TenantRequest){return this.orders.summary(r.user.tenantId)}
  @Permissions('orders.read') @Get(':id') detail(@Req() r:TenantRequest,@Param('id') id:string){return this.orders.detail(r.user.tenantId,id)}
  @Roles('owner','admin','commercial') @Permissions('orders.write') @Patch(':id') update(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:UpdateOrderDto){return this.orders.update(r.user.tenantId,id,b,r.user.sub)}
  @Roles('owner','admin','commercial') @Permissions('orders.write') @Post(':id/payments') payment(@Req() r:TenantRequest,@Param('id') id:string,@Body() b:CreateOrderPaymentDto){return this.orders.addPayment(r.user.tenantId,id,b,r.user.sub)}
}
