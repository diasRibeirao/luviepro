import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePurchaseDto, CreatePurchasePaymentDto, CreateSupplierDto, ReceivePurchaseDto, UpdatePurchaseDto, UpdateSupplierDto } from './dto/purchases.dto';

const includePurchase={supplier:true,items:{include:{product:true}},payments:{orderBy:{paidAt:'desc' as const}}} as const;

@Injectable()
export class PurchasesService {
  constructor(private db:PrismaService){}

  suppliers(tenantId:string){return this.db.supplier.findMany({where:{tenantId},orderBy:[{active:'desc'},{name:'asc'}]})}

  async createSupplier(tenantId:string,b:CreateSupplierDto){
    const document=b.document?.trim();
    if(document&&await this.db.supplier.findFirst({where:{tenantId,document}}))throw new ConflictException('Já existe um fornecedor com este CPF/CNPJ');
    return this.db.supplier.create({data:{tenantId,name:b.name.trim(),document:b.document?.trim()||null,email:b.email?.trim()||null,phone:b.phone?.trim()||null,contactName:b.contactName?.trim()||null,notes:b.notes?.trim()||null,active:b.active!==false}})
  }

  async updateSupplier(tenantId:string,id:string,b:UpdateSupplierDto){
    const supplier=await this.db.supplier.findFirst({where:{id,tenantId}});
    if(!supplier)throw new NotFoundException('Fornecedor não encontrado');

    const document=b.document?.trim();
    if(document&&await this.db.supplier.findFirst({where:{tenantId,document,id:{not:id}}}))throw new ConflictException('Já existe um fornecedor com este CPF/CNPJ');

    return this.db.supplier.update({where:{id},data:{
      ...(b.name!==undefined?{name:b.name.trim()}:{}),
      ...(b.document!==undefined?{document:b.document.trim()||null}:{}),
      ...(b.email!==undefined?{email:b.email.trim()||null}:{}),
      ...(b.phone!==undefined?{phone:b.phone.trim()||null}:{}),
      ...(b.contactName!==undefined?{contactName:b.contactName.trim()||null}:{}),
      ...(b.notes!==undefined?{notes:b.notes.trim()||null}:{}),
      ...(b.active!==undefined?{active:b.active}:{}),
    }});
  }

  list(tenantId:string){return this.db.purchaseOrder.findMany({where:{tenantId},include:includePurchase,orderBy:{createdAt:'desc'}})}

  async summary(tenantId:string){
    const rows=await this.db.purchaseOrder.findMany({where:{tenantId},select:{status:true,totalCents:true,amountPaidCents:true,paymentStatus:true,paymentDueAt:true,items:{select:{quantity:true,receivedQuantity:true}}}});
    const active=rows.filter(x=>x.status!=='canceled');
    const now=Date.now();
    return {
      total:rows.length,
      open:rows.filter(x=>['ordered','partially_received'].includes(x.status)).length,
      received:rows.filter(x=>x.status==='received').length,
      pendingUnits:rows.filter(x=>!['received','canceled'].includes(x.status)).reduce((s,x)=>s+x.items.reduce((a,i)=>a+Math.max(0,i.quantity-i.receivedQuantity),0),0),
      orderedValueCents:active.reduce((s,x)=>s+x.totalCents,0),
      payableCents:active.reduce((s,x)=>s+Math.max(0,x.totalCents-x.amountPaidCents),0),
      paidCents:active.reduce((s,x)=>s+x.amountPaidCents,0),
      overduePayableCents:active.filter(x=>x.paymentStatus!=='paid'&&x.paymentDueAt&&new Date(x.paymentDueAt).getTime()<now).reduce((s,x)=>s+Math.max(0,x.totalCents-x.amountPaidCents),0),
    };
  }

  async detail(tenantId:string,id:string){
    const row=await this.db.purchaseOrder.findFirst({where:{id,tenantId},include:includePurchase});
    if(!row)throw new NotFoundException('Compra não encontrada');
    return row;
  }

  async create(tenantId:string,b:CreatePurchaseDto,actor?:string){
    if(!b.items?.length)throw new BadRequestException('Adicione pelo menos um produto');
    const supplier=await this.db.supplier.findFirst({where:{id:b.supplierId,tenantId,active:true}});
    if(!supplier)throw new BadRequestException('Fornecedor inválido');
    const ids=[...new Set(b.items.map(i=>i.productId))];
    const products=await this.db.product.findMany({where:{tenantId,id:{in:ids},active:true}});
    if(products.length!==ids.length)throw new BadRequestException('Há produto inválido ou inativo na compra');
    const map=new Map(products.map(p=>[p.id,p]));
    const count=await this.db.purchaseOrder.count({where:{tenantId}});
    const number=`COMP-${String(count+1).padStart(5,'0')}`;
    const items=b.items.map(i=>{const p=map.get(i.productId)!;return {productId:p.id,productName:p.name,sku:p.sku,unit:p.unit,quantity:i.quantity,unitCostCents:i.unitCostCents,totalCents:i.quantity*i.unitCostCents}});
    const totalCents=items.reduce((s,i)=>s+i.totalCents,0);
    const row=await this.db.purchaseOrder.create({data:{tenantId,supplierId:supplier.id,number,totalCents,expectedAt:b.expectedAt?new Date(b.expectedAt):null,paymentDueAt:b.paymentDueAt?new Date(b.paymentDueAt):null,notes:b.notes?.trim()||null,items:{create:items}},include:includePurchase});
    await this.audit(tenantId,actor,'create',row.id,{number,totalCents});
    return row;
  }

  async update(tenantId:string,id:string,b:UpdatePurchaseDto,actor?:string){
    const current=await this.detail(tenantId,id);
    if(current.status==='received'&&b.status==='canceled')throw new BadRequestException('Compra já recebida não pode ser cancelada');
    if(b.status==='canceled'&&current.items.some(i=>i.receivedQuantity>0))throw new BadRequestException('Compra com recebimento parcial não pode ser cancelada');
    if(b.status==='canceled'&&current.amountPaidCents>0)throw new BadRequestException('Compra com pagamento registrado não pode ser cancelada');
    const row=await this.db.purchaseOrder.update({where:{id},data:{...(b.status?{status:b.status}:{}),...(b.expectedAt!==undefined?{expectedAt:b.expectedAt?new Date(b.expectedAt):null}:{}),...(b.paymentDueAt!==undefined?{paymentDueAt:b.paymentDueAt?new Date(b.paymentDueAt):null}:{}),...(b.notes!==undefined?{notes:b.notes.trim()||null}:{}),...(b.status==='canceled'?{canceledAt:new Date()}:{}),},include:includePurchase});
    await this.audit(tenantId,actor,'update',id,{status:row.status});
    return row;
  }

  async receive(tenantId:string,id:string,b:ReceivePurchaseDto,actor?:string){
    const current=await this.detail(tenantId,id);
    if(['received','canceled'].includes(current.status))throw new BadRequestException('Esta compra não aceita novos recebimentos');
    if(!b.items?.length)throw new BadRequestException('Informe ao menos um item para receber');
    const requested=new Map(b.items.map(i=>[i.itemId,i.quantity]));
    for(const [itemId,q] of requested){
      const item=current.items.find(i=>i.id===itemId);
      if(!item)throw new BadRequestException('Item inválido na compra');
      if(item.receivedQuantity+q>item.quantity)throw new BadRequestException(`Quantidade de ${item.productName} excede o saldo pendente`);
    }
    return this.db.$transaction(async tx=>{
      for(const [itemId,q] of requested){
        const item=current.items.find(i=>i.id===itemId)!;
        const updatedItem=await tx.purchaseOrderItem.updateMany({where:{id:itemId,purchaseOrderId:id,receivedQuantity:{lte:item.quantity-q}},data:{receivedQuantity:{increment:q}}});
        if(updatedItem.count!==1)throw new BadRequestException(`O recebimento de ${item.productName} foi alterado por outra operação. Atualize a compra e tente novamente.`);
        const before=await tx.product.findUniqueOrThrow({where:{id:item.productId}});
        const oldQty=Math.max(0,before.stockQuantity);
        const newQty=oldQty+q;
        const weightedCost=newQty>0?Math.round(((oldQty*before.costCents)+(q*item.unitCostCents))/newQty):item.unitCostCents;
        const p=await tx.product.update({where:{id:item.productId},data:{stockQuantity:{increment:q},costCents:weightedCost}});
        await tx.stockMovement.create({data:{tenantId,productId:item.productId,type:'entry',quantity:q,balanceAfter:p.stockQuantity,unitCostCents:item.unitCostCents,reason:`Recebimento ${current.number}`,referenceType:'purchase',referenceId:current.id,actorUserId:actor}});
      }
      const after=await tx.purchaseOrder.findUniqueOrThrow({where:{id},include:includePurchase});
      const complete=after.items.every(i=>i.receivedQuantity>=i.quantity);
      const any=after.items.some(i=>i.receivedQuantity>0);
      const status=complete?'received':any?'partially_received':'ordered';
      return tx.purchaseOrder.update({where:{id},data:{status,receivedAt:complete?new Date():null},include:includePurchase});
    });
  }

  async addPayment(tenantId:string,id:string,b:CreatePurchasePaymentDto,actor?:string){
    const current=await this.detail(tenantId,id);
    if(b.method){const method=await this.db.financialPaymentMethod.findFirst({where:{tenantId,code:b.method.trim().toLowerCase(),active:true}});if(!method)throw new BadRequestException('Forma de pagamento inválida ou inativa')}
    if(current.status==='canceled')throw new BadRequestException('Não é possível pagar uma compra cancelada');
    const remaining=Math.max(0,current.totalCents-current.amountPaidCents);
    if(remaining<=0)throw new BadRequestException('Esta compra já está totalmente paga');
    if(b.amountCents>remaining)throw new BadRequestException('O pagamento excede o saldo em aberto');
    const paidAt=b.paidAt?new Date(b.paidAt):new Date();
    const result=await this.db.$transaction(async tx=>{
      await tx.purchasePayment.create({data:{tenantId,purchaseOrderId:id,amountCents:b.amountCents,method:b.method||null,notes:b.notes?.trim()||null,actorUserId:actor,paidAt}});
      const amountPaidCents=current.amountPaidCents+b.amountCents;
      const paymentStatus=amountPaidCents>=current.totalCents?'paid':'partial';
      return tx.purchaseOrder.update({where:{id},data:{amountPaidCents,paymentStatus,paidAt:paymentStatus==='paid'?paidAt:null},include:includePurchase});
    });
    await this.audit(tenantId,actor,'payment',id,{amountCents:b.amountCents,paymentStatus:result.paymentStatus});
    return result;
  }

  private audit(tenantId:string,actor:string|undefined,action:string,id:string,metadata:any){return this.db.auditLog.create({data:{tenantId,actorUserId:actor,action,entity:'purchase_order',entityId:id,metadata}}).catch(()=>undefined)}
}
