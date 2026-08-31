import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateOrderPaymentDto, UpdateOrderDto } from './dto/orders.dto';

const includeOrder={quote:{include:{client:true}},items:true,payments:{orderBy:{paidAt:'desc' as const}}} as const;

@Injectable()
export class OrdersService {
  constructor(private db:PrismaService){}
  list(tenantId:string){return this.db.order.findMany({where:{tenantId},include:includeOrder,orderBy:{createdAt:'desc'}})}
  async summary(tenantId:string){
    const orders=await this.db.order.findMany({where:{tenantId},select:{status:true,paymentStatus:true,totalCents:true,amountPaidCents:true,paymentDueAt:true}});
    const active=orders.filter(o=>o.status!=='canceled'); const now=Date.now();
    return {total:orders.length,open:orders.filter(o=>!['delivered','canceled'].includes(o.status)).length,awaitingPayment:active.filter(o=>o.paymentStatus!=='paid'&&o.paymentStatus!=='refunded').length,preparing:orders.filter(o=>['confirmed','preparing','ready'].includes(o.status)).length,delivered:orders.filter(o=>o.status==='delivered').length,paidRevenueCents:active.reduce((s,o)=>s+o.amountPaidCents,0),receivableCents:active.reduce((s,o)=>s+Math.max(0,o.totalCents-o.amountPaidCents),0),overdueReceivableCents:active.filter(o=>o.paymentStatus!=='paid'&&o.paymentDueAt&&new Date(o.paymentDueAt).getTime()<now).reduce((s,o)=>s+Math.max(0,o.totalCents-o.amountPaidCents),0)};
  }
  async detail(tenantId:string,id:string){const order=await this.db.order.findFirst({where:{id,tenantId},include:includeOrder});if(!order)throw new NotFoundException('Pedido não encontrado');return order}
  async update(tenantId:string,id:string,data:UpdateOrderDto,actorUserId?:string){
    const current=await this.db.order.findFirst({where:{id,tenantId},include:{items:true}}); if(!current)throw new NotFoundException('Pedido não encontrado');
    if(current.status==='canceled'&&data.status&&data.status!=='canceled')throw new BadRequestException('Pedido cancelado não pode ser reaberto');
    if(current.status==='delivered'&&data.status==='canceled')throw new BadRequestException('Pedido entregue não pode ser cancelado');
    const canceling=current.status!=='canceled'&&data.status==='canceled'; const now=new Date();
    const order=await this.db.$transaction(async tx=>{if(canceling){for(const item of current.items){const product=await tx.product.update({where:{id:item.productId},data:{stockQuantity:{increment:item.quantity}}});await tx.stockMovement.create({data:{tenantId,productId:item.productId,type:'return',quantity:item.quantity,balanceAfter:product.stockQuantity,unitCostCents:item.unitCostCents,reason:`Cancelamento ${current.number}`,referenceType:'order_cancel',referenceId:current.id,actorUserId}})}}
      return tx.order.update({where:{id},data:{...(data.status!==undefined?{status:data.status}:{}),...(data.deliveryMethod!==undefined?{deliveryMethod:data.deliveryMethod}:{}),...(data.paymentDueAt!==undefined?{paymentDueAt:data.paymentDueAt?new Date(data.paymentDueAt):null}:{}),...(data.notes!==undefined?{notes:data.notes}:{}),...(data.status==='delivered'&&!current.deliveredAt?{deliveredAt:now}:{}),...(data.status&&data.status!=='delivered'?{deliveredAt:null}:{}),...(canceling?{canceledAt:now}:{}),},include:includeOrder});});
    await this.db.auditLog.create({data:{tenantId,actorUserId:actorUserId??null,action:'update',entity:'order',entityId:id,metadata:{from:{status:current.status,paymentStatus:current.paymentStatus},to:{status:order.status,paymentStatus:order.paymentStatus},restocked:canceling}}}).catch(()=>undefined); return order;
  }
  async addPayment(tenantId:string,id:string,b:CreateOrderPaymentDto,actorUserId?:string){
    const current=await this.detail(tenantId,id); if(current.status==='canceled')throw new BadRequestException('Não é possível receber pagamento de pedido cancelado');
    if(b.method){const method=await this.db.financialPaymentMethod.findFirst({where:{tenantId,code:b.method.trim().toLowerCase(),active:true}});if(!method)throw new BadRequestException('Forma de pagamento inválida ou inativa')}
    const remaining=Math.max(0,current.totalCents-current.amountPaidCents); if(remaining<=0)throw new BadRequestException('Este pedido já está totalmente pago'); if(b.amountCents>remaining)throw new BadRequestException('O pagamento excede o saldo em aberto');
    const paidAt=b.paidAt?new Date(b.paidAt):new Date(); const result=await this.db.$transaction(async tx=>{await tx.orderPayment.create({data:{tenantId,orderId:id,amountCents:b.amountCents,method:b.method||null,notes:b.notes?.trim()||null,actorUserId,paidAt}});const amountPaidCents=current.amountPaidCents+b.amountCents;const paymentStatus=amountPaidCents>=current.totalCents?'paid':'partial';return tx.order.update({where:{id},data:{amountPaidCents,paymentStatus,paidAt:paymentStatus==='paid'?paidAt:null},include:includeOrder})});
    await this.db.auditLog.create({data:{tenantId,actorUserId:actorUserId??null,action:'payment',entity:'order',entityId:id,metadata:{amountCents:b.amountCents,paymentStatus:result.paymentStatus}}}).catch(()=>undefined); return result;
  }
}
