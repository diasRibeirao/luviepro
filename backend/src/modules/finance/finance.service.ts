import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateFinancialCategoryDto, CreateFinancialEntryDto, CreateFinancialPaymentMethodDto, PayFinancialEntryDto, UpdateFinancialCategoryDto, UpdateFinancialPaymentMethodDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(private db:PrismaService){}

  async summary(tenantId:string){
    const now=new Date();
    const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const tomorrow=new Date(todayStart.getTime()+86400000);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
    const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
    const [orders,purchases,orderReceived,purchasePaid,manual]=await Promise.all([
      this.db.order.findMany({where:{tenantId,status:{not:'canceled'}},select:{totalCents:true,amountPaidCents:true,paymentStatus:true,paymentDueAt:true}}),
      this.db.purchaseOrder.findMany({where:{tenantId,status:{not:'canceled'}},select:{totalCents:true,amountPaidCents:true,paymentStatus:true,paymentDueAt:true}}),
      this.db.orderPayment.findMany({where:{tenantId},select:{amountCents:true,paidAt:true}}),
      this.db.purchasePayment.findMany({where:{tenantId},select:{amountCents:true,paidAt:true}}),
      this.db.financialEntry.findMany({where:{tenantId,status:{not:'canceled'}},select:{type:true,status:true,amountCents:true,dueAt:true,paidAt:true}}),
    ]);
    const openOrders=orders.map(o=>({...o,open:Math.max(0,o.totalCents-o.amountPaidCents)})).filter(o=>o.open>0);
    const openPurchases=purchases.map(o=>({...o,open:Math.max(0,o.totalCents-o.amountPaidCents)})).filter(o=>o.open>0);
    const manualOpen=manual.filter(x=>x.status==='pending');
    const manualPaid=manual.filter(x=>x.status==='paid');
    const receivableCents=openOrders.reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='income').reduce((s,x)=>s+x.amountCents,0);
    const payableCents=openPurchases.reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amountCents,0);
    const overdueReceivableCents=openOrders.filter(o=>o.paymentDueAt&&o.paymentDueAt<todayStart).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='income'&&x.dueAt&&x.dueAt<todayStart).reduce((s,x)=>s+x.amountCents,0);
    const overduePayableCents=openPurchases.filter(o=>o.paymentDueAt&&o.paymentDueAt<todayStart).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='expense'&&x.dueAt&&x.dueAt<todayStart).reduce((s,x)=>s+x.amountCents,0);
    const dueTodayReceivableCents=openOrders.filter(o=>o.paymentDueAt&&o.paymentDueAt>=todayStart&&o.paymentDueAt<tomorrow).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='income'&&x.dueAt&&x.dueAt>=todayStart&&x.dueAt<tomorrow).reduce((s,x)=>s+x.amountCents,0);
    const dueTodayPayableCents=openPurchases.filter(o=>o.paymentDueAt&&o.paymentDueAt>=todayStart&&o.paymentDueAt<tomorrow).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='expense'&&x.dueAt&&x.dueAt>=todayStart&&x.dueAt<tomorrow).reduce((s,x)=>s+x.amountCents,0);
    const receivedCents=orderReceived.reduce((s,x)=>s+x.amountCents,0)+manualPaid.filter(x=>x.type==='income').reduce((s,x)=>s+x.amountCents,0);
    const paidCents=purchasePaid.reduce((s,x)=>s+x.amountCents,0)+manualPaid.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amountCents,0);
    const receivedMonthCents=orderReceived.filter(x=>x.paidAt>=monthStart&&x.paidAt<nextMonth).reduce((s,x)=>s+x.amountCents,0)+manualPaid.filter(x=>x.type==='income'&&x.paidAt&&x.paidAt>=monthStart&&x.paidAt<nextMonth).reduce((s,x)=>s+x.amountCents,0);
    const paidMonthCents=purchasePaid.filter(x=>x.paidAt>=monthStart&&x.paidAt<nextMonth).reduce((s,x)=>s+x.amountCents,0)+manualPaid.filter(x=>x.type==='expense'&&x.paidAt&&x.paidAt>=monthStart&&x.paidAt<nextMonth).reduce((s,x)=>s+x.amountCents,0);
    const pendingIncomeMonth=openOrders.filter(o=>o.paymentDueAt&&o.paymentDueAt>=monthStart&&o.paymentDueAt<nextMonth).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='income'&&x.dueAt&&x.dueAt>=monthStart&&x.dueAt<nextMonth).reduce((s,x)=>s+x.amountCents,0);
    const pendingExpenseMonth=openPurchases.filter(o=>o.paymentDueAt&&o.paymentDueAt>=monthStart&&o.paymentDueAt<nextMonth).reduce((s,o)=>s+o.open,0)+manualOpen.filter(x=>x.type==='expense'&&x.dueAt&&x.dueAt>=monthStart&&x.dueAt<nextMonth).reduce((s,x)=>s+x.amountCents,0);
    return {receivableCents,payableCents,overdueReceivableCents,overduePayableCents,dueTodayReceivableCents,dueTodayPayableCents,receivedCents,paidCents,netCashCents:receivedCents-paidCents,receivedMonthCents,paidMonthCents,netCashMonthCents:receivedMonthCents-paidMonthCents,projectedMonthCents:(receivedMonthCents+pendingIncomeMonth)-(paidMonthCents+pendingExpenseMonth)};
  }

  async entries(tenantId:string){
    const [incoming,outgoing,manual]=await Promise.all([
      this.db.orderPayment.findMany({where:{tenantId},include:{order:{include:{quote:{include:{client:true}}}}},orderBy:{paidAt:'desc'},take:150}),
      this.db.purchasePayment.findMany({where:{tenantId},include:{purchaseOrder:{include:{supplier:true}}},orderBy:{paidAt:'desc'},take:150}),
      this.db.financialEntry.findMany({where:{tenantId,status:'paid'},include:{category:true},orderBy:{paidAt:'desc'},take:150}),
    ]);
    return [
      ...incoming.map(x=>({id:x.id,source:'order',type:'income' as const,status:'paid',amountCents:x.amountCents,date:x.paidAt,dueAt:null,method:x.method,notes:x.notes,category:null,referenceId:x.orderId,referenceNumber:x.order.number,counterparty:x.order.quote.client.name,description:`Recebimento ${x.order.number}`})),
      ...outgoing.map(x=>({id:x.id,source:'purchase',type:'expense' as const,status:'paid',amountCents:x.amountCents,date:x.paidAt,dueAt:null,method:x.method,notes:x.notes,category:null,referenceId:x.purchaseOrderId,referenceNumber:x.purchaseOrder.number,counterparty:x.purchaseOrder.supplier.name,description:`Pagamento ${x.purchaseOrder.number}`})),
      ...manual.map(x=>({id:x.id,source:'manual',type:x.type as 'income'|'expense',status:x.status,amountCents:x.amountCents,date:x.paidAt??x.createdAt,dueAt:x.dueAt,method:x.method,notes:x.notes,category:x.category?.name??null,referenceId:x.id,referenceNumber:'Manual',counterparty:x.counterparty??'Lançamento manual',description:x.description})),
    ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,250);
  }

  async obligations(tenantId:string){
    const [orders,purchases,manual]=await Promise.all([
      this.db.order.findMany({where:{tenantId,status:{not:'canceled'},paymentStatus:{not:'paid'}},include:{quote:{include:{client:true}}},orderBy:{paymentDueAt:'asc'}}),
      this.db.purchaseOrder.findMany({where:{tenantId,status:{not:'canceled'},paymentStatus:{not:'paid'}},include:{supplier:true},orderBy:{paymentDueAt:'asc'}}),
      this.db.financialEntry.findMany({where:{tenantId,status:'pending'},include:{category:true},orderBy:{dueAt:'asc'}}),
    ]);
    return [
      ...orders.map(x=>({id:x.id,source:'order',type:'income' as const,status:'pending',amountCents:Math.max(0,x.totalCents-x.amountPaidCents),dueAt:x.paymentDueAt,description:`Pedido ${x.number}`,counterparty:x.quote.client.name,category:'Vendas',referenceNumber:x.number})),
      ...purchases.map(x=>({id:x.id,source:'purchase',type:'expense' as const,status:'pending',amountCents:Math.max(0,x.totalCents-x.amountPaidCents),dueAt:x.paymentDueAt,description:`Compra ${x.number}`,counterparty:x.supplier.name,category:'Compras',referenceNumber:x.number})),
      ...manual.map(x=>({id:x.id,source:'manual',type:x.type as 'income'|'expense',status:x.status,amountCents:x.amountCents,dueAt:x.dueAt,description:x.description,counterparty:x.counterparty??'',category:x.category?.name??'Sem categoria',referenceNumber:'Manual'})),
    ].filter(x=>x.amountCents>0).sort((a,b)=>{const ad=a.dueAt?new Date(a.dueAt).getTime():Number.MAX_SAFE_INTEGER;const bd=b.dueAt?new Date(b.dueAt).getTime():Number.MAX_SAFE_INTEGER;return ad-bd});
  }

  async report(tenantId:string,months=12){
    const safeMonths=Math.max(3,Math.min(24,Number(months)||12));
    const now=new Date();
    const start=new Date(now.getFullYear(),now.getMonth()-safeMonths+1,1);
    const end=new Date(now.getFullYear(),now.getMonth()+1,1);
    const [orderPayments,purchasePayments,manualPaid,openOrders,openPurchases,manualPending]=await Promise.all([
      this.db.orderPayment.findMany({where:{tenantId,paidAt:{gte:start,lt:end}},select:{amountCents:true,paidAt:true}}),
      this.db.purchasePayment.findMany({where:{tenantId,paidAt:{gte:start,lt:end}},select:{amountCents:true,paidAt:true}}),
      this.db.financialEntry.findMany({where:{tenantId,status:'paid',paidAt:{gte:start,lt:end}},include:{category:true}}),
      this.db.order.findMany({where:{tenantId,status:{not:'canceled'},paymentStatus:{not:'paid'}},select:{totalCents:true,amountPaidCents:true,paymentDueAt:true}}),
      this.db.purchaseOrder.findMany({where:{tenantId,status:{not:'canceled'},paymentStatus:{not:'paid'}},select:{totalCents:true,amountPaidCents:true,paymentDueAt:true}}),
      this.db.financialEntry.findMany({where:{tenantId,status:'pending'},include:{category:true}}),
    ]);
    const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const monthsMap=new Map<string,{key:string;label:string;incomeCents:number;expenseCents:number;netCents:number}>();
    for(let i=0;i<safeMonths;i++){
      const d=new Date(start.getFullYear(),start.getMonth()+i,1);
      monthsMap.set(key(d),{key:key(d),label:d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.',''),incomeCents:0,expenseCents:0,netCents:0});
    }
    const add=(date:Date,type:'income'|'expense',amount:number)=>{const row=monthsMap.get(key(date));if(!row)return;if(type==='income')row.incomeCents+=amount;else row.expenseCents+=amount;row.netCents=row.incomeCents-row.expenseCents};
    orderPayments.forEach(x=>add(x.paidAt,'income',x.amountCents));
    purchasePayments.forEach(x=>add(x.paidAt,'expense',x.amountCents));
    manualPaid.forEach(x=>x.paidAt&&add(x.paidAt,x.type as 'income'|'expense',x.amountCents));
    const cat=new Map<string,{name:string;type:'income'|'expense';amountCents:number}>();
    const addCat=(name:string,type:'income'|'expense',amount:number)=>{const k=`${type}:${name}`;const row=cat.get(k)??{name,type,amountCents:0};row.amountCents+=amount;cat.set(k,row)};
    orderPayments.forEach(x=>addCat('Vendas','income',x.amountCents));
    purchasePayments.forEach(x=>addCat('Compras','expense',x.amountCents));
    manualPaid.forEach(x=>addCat(x.category?.name??'Sem categoria',x.type as 'income'|'expense',x.amountCents));
    const projected=new Map<string,{key:string;incomeCents:number;expenseCents:number}>();
    const addProjected=(date:Date|null,type:'income'|'expense',amount:number)=>{if(!date)return;const k=key(date);if(!monthsMap.has(k))return;const row=projected.get(k)??{key:k,incomeCents:0,expenseCents:0};if(type==='income')row.incomeCents+=amount;else row.expenseCents+=amount;projected.set(k,row)};
    openOrders.forEach(x=>addProjected(x.paymentDueAt,'income',Math.max(0,x.totalCents-x.amountPaidCents)));
    openPurchases.forEach(x=>addProjected(x.paymentDueAt,'expense',Math.max(0,x.totalCents-x.amountPaidCents)));
    manualPending.forEach(x=>addProjected(x.dueAt,x.type as 'income'|'expense',x.amountCents));
    const monthly=Array.from(monthsMap.values()).map(x=>{const p=projected.get(x.key);return {...x,projectedIncomeCents:x.incomeCents+(p?.incomeCents??0),projectedExpenseCents:x.expenseCents+(p?.expenseCents??0),projectedNetCents:(x.incomeCents+(p?.incomeCents??0))-(x.expenseCents+(p?.expenseCents??0))}});
    const incomeCents=monthly.reduce((s,x)=>s+x.incomeCents,0),expenseCents=monthly.reduce((s,x)=>s+x.expenseCents,0);
    return {months:safeMonths,from:start,to:end,incomeCents,expenseCents,netCents:incomeCents-expenseCents,monthly,categories:Array.from(cat.values()).sort((a,b)=>b.amountCents-a.amountCents)};
  }

  categories(tenantId:string){return this.db.financialCategory.findMany({where:{tenantId,active:true},orderBy:[{type:'asc'},{sortOrder:'asc'},{name:'asc'}]})}
  async manageCategories(tenantId:string){
    const rows=await this.db.financialCategory.findMany({where:{tenantId},include:{_count:{select:{entries:true}}},orderBy:[{type:'asc'},{active:'desc'},{sortOrder:'asc'},{name:'asc'}]});
    return rows.map(({_count,...row})=>({...row,usageCount:_count.entries}));
  }
  async createCategory(tenantId:string,b:CreateFinancialCategoryDto){
    const name=b.name.trim();
    const exists=await this.db.financialCategory.findFirst({where:{tenantId,type:b.type,name:{equals:name,mode:'insensitive'}}});
    if(exists)return exists;
    const max=await this.db.financialCategory.aggregate({where:{tenantId,type:b.type},_max:{sortOrder:true}});
    return this.db.financialCategory.create({data:{tenantId,name,type:b.type,sortOrder:(max._max.sortOrder??0)+10}});
  }
  async updateCategory(tenantId:string,id:string,b:UpdateFinancialCategoryDto){
    const current=await this.db.financialCategory.findFirst({where:{id,tenantId}});if(!current)throw new NotFoundException('Categoria financeira não encontrada');
    const name=(b.name??current.name).trim(),type=b.type??current.type;
    const duplicate=await this.db.financialCategory.findFirst({where:{tenantId,type,name:{equals:name,mode:'insensitive'},id:{not:id}}});if(duplicate)throw new BadRequestException('Já existe uma categoria financeira com este nome e tipo');
    return this.db.financialCategory.update({where:{id},data:{name,type,active:b.active??current.active}});
  }
  async paymentMethods(tenantId:string){
    return this.db.financialPaymentMethod.findMany({where:{tenantId,active:true},orderBy:[{sortOrder:'asc'},{name:'asc'}]});
  }
  async managePaymentMethods(tenantId:string){
    const [rows,orderUsed,purchaseUsed,manualUsed]=await Promise.all([
      this.db.financialPaymentMethod.findMany({where:{tenantId},orderBy:[{active:'desc'},{sortOrder:'asc'},{name:'asc'}]}),
      this.db.orderPayment.groupBy({by:['method'],where:{tenantId,method:{not:null}},_count:{_all:true}}),
      this.db.purchasePayment.groupBy({by:['method'],where:{tenantId,method:{not:null}},_count:{_all:true}}),
      this.db.financialEntry.groupBy({by:['method'],where:{tenantId,method:{not:null}},_count:{_all:true}}),
    ]);
    const counts=new Map<string,number>();
    for(const list of [orderUsed,purchaseUsed,manualUsed])for(const row of list){const key=(row.method||'').trim().toLowerCase();if(key)counts.set(key,(counts.get(key)||0)+row._count._all)}
    return rows.map(row=>({...row,usageCount:counts.get(row.code.trim().toLowerCase())||0}));
  }
  async createPaymentMethod(tenantId:string,b:CreateFinancialPaymentMethodDto){
    const name=b.name.trim();
    const base=(b.code||name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')).slice(0,40);
    if(!base)throw new BadRequestException('Informe um nome válido para a forma de pagamento');
    const duplicateCode=await this.db.financialPaymentMethod.findFirst({where:{tenantId,code:base}});
    if(duplicateCode)throw new BadRequestException('Já existe uma forma de pagamento com este código');
    const duplicateName=await this.db.financialPaymentMethod.findFirst({where:{tenantId,name:{equals:name,mode:'insensitive'}}});
    if(duplicateName)throw new BadRequestException('Já existe uma forma de pagamento com este nome');
    const max=await this.db.financialPaymentMethod.aggregate({where:{tenantId},_max:{sortOrder:true}});
    return this.db.financialPaymentMethod.create({data:{tenantId,code:base,name,sortOrder:(max._max.sortOrder??0)+10}});
  }
  async updatePaymentMethod(tenantId:string,id:string,b:UpdateFinancialPaymentMethodDto){
    const current=await this.db.financialPaymentMethod.findFirst({where:{id,tenantId}});if(!current)throw new NotFoundException('Forma de pagamento não encontrada');
    const name=(b.name??current.name).trim();
    const duplicate=await this.db.financialPaymentMethod.findFirst({where:{tenantId,name:{equals:name,mode:'insensitive'},id:{not:id}}});if(duplicate)throw new BadRequestException('Já existe uma forma de pagamento com este nome');
    if(current.active&&b.active===false){const activeCount=await this.db.financialPaymentMethod.count({where:{tenantId,active:true}});if(activeCount<=1)throw new BadRequestException('Mantenha ao menos uma forma de pagamento ativa')}
    return this.db.financialPaymentMethod.update({where:{id},data:{name,active:b.active??current.active}});
  }
  private async validatePaymentMethod(tenantId:string,method?:string){
    if(!method)return;
    const code=method.trim().toLowerCase();
    const found=await this.db.financialPaymentMethod.findFirst({where:{tenantId,code,active:true}});
    if(!found)throw new BadRequestException('Forma de pagamento inválida ou inativa');
  }
  async createEntry(tenantId:string,b:CreateFinancialEntryDto,actorUserId?:string){
    if((b.status??'pending')==='paid')await this.validatePaymentMethod(tenantId,b.method);
    if(b.categoryId){const category=await this.db.financialCategory.findFirst({where:{id:b.categoryId,tenantId,active:true}});if(!category)throw new BadRequestException('Categoria financeira não encontrada');if(category.type!==b.type)throw new BadRequestException('A categoria não corresponde ao tipo do lançamento')}
    const status=b.status??'pending';
    const paidAt=status==='paid'?(b.paidAt?new Date(b.paidAt):new Date()):null;
    const entry=await this.db.financialEntry.create({data:{tenantId,categoryId:b.categoryId||null,type:b.type,status,description:b.description.trim(),counterparty:b.counterparty?.trim()||null,amountCents:b.amountCents,dueAt:b.dueAt?new Date(b.dueAt):null,paidAt,method:status==='paid'?(b.method||null):null,notes:b.notes?.trim()||null,actorUserId}});
    await this.db.auditLog.create({data:{tenantId,actorUserId:actorUserId??null,action:'create',entity:'financial_entry',entityId:entry.id,metadata:{type:entry.type,status:entry.status,amountCents:entry.amountCents}}}).catch(()=>undefined);
    return entry;
  }
  async payEntry(tenantId:string,id:string,b:PayFinancialEntryDto,actorUserId?:string){
    await this.validatePaymentMethod(tenantId,b.method);
    const current=await this.db.financialEntry.findFirst({where:{id,tenantId}});if(!current)throw new NotFoundException('Lançamento financeiro não encontrado');if(current.status==='canceled')throw new BadRequestException('Lançamento cancelado não pode ser pago');if(current.status==='paid')return current;
    const entry=await this.db.financialEntry.update({where:{id},data:{status:'paid',paidAt:b.paidAt?new Date(b.paidAt):new Date(),method:b.method||null,notes:b.notes?.trim()||current.notes}});
    await this.db.auditLog.create({data:{tenantId,actorUserId:actorUserId??null,action:'payment',entity:'financial_entry',entityId:id,metadata:{amountCents:entry.amountCents,type:entry.type}}}).catch(()=>undefined);return entry;
  }
  async cancelEntry(tenantId:string,id:string,actorUserId?:string){
    const current=await this.db.financialEntry.findFirst({where:{id,tenantId}});if(!current)throw new NotFoundException('Lançamento financeiro não encontrado');if(current.status==='paid')throw new BadRequestException('Lançamento já realizado não pode ser cancelado');
    const entry=await this.db.financialEntry.update({where:{id},data:{status:'canceled'}});await this.db.auditLog.create({data:{tenantId,actorUserId:actorUserId??null,action:'cancel',entity:'financial_entry',entityId:id}}).catch(()=>undefined);return entry;
  }
}
