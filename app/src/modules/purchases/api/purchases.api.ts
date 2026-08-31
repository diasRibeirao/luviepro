import {api} from '../../../api';
export type Supplier={id:string;name:string;document?:string;email?:string;phone?:string;contactName?:string;notes?:string;active:boolean};
export type PurchaseStatus='ordered'|'partially_received'|'received'|'canceled';
export type PurchasePaymentStatus='pending'|'partial'|'paid';
export type PurchasePayment={id:string;amountCents:number;method?:string;notes?:string;paidAt:string;createdAt:string};
export type PurchaseItem={id:string;productId:string;productName:string;sku:string;unit:string;quantity:number;receivedQuantity:number;unitCostCents:number;totalCents:number};
export type Purchase={id:string;number:string;status:PurchaseStatus;paymentStatus:PurchasePaymentStatus;amountPaidCents:number;notes?:string;expectedAt?:string;paymentDueAt?:string;totalCents:number;orderedAt:string;receivedAt?:string;paidAt?:string;supplier:Supplier;items:PurchaseItem[];payments:PurchasePayment[];createdAt:string};
export type PurchaseSummary={total:number;open:number;received:number;pendingUnits:number;orderedValueCents:number;payableCents:number;paidCents:number;overduePayableCents:number};
export const purchasesApi={
 list:()=>api<Purchase[]>('/purchases'), summary:()=>api<PurchaseSummary>('/purchases/summary'), suppliers:()=>api<Supplier[]>('/purchases/suppliers'),
 createSupplier:(p:{name:string;document?:string;email?:string;phone?:string;contactName?:string;notes?:string})=>api<Supplier>('/purchases/suppliers',{method:'POST',body:JSON.stringify(p)}),
 create:(p:{supplierId:string;expectedAt?:string;paymentDueAt?:string;notes?:string;items:{productId:string;quantity:number;unitCostCents:number}[]})=>api<Purchase>('/purchases',{method:'POST',body:JSON.stringify(p)}),
 update:(id:string,p:{status?:PurchaseStatus;expectedAt?:string;paymentDueAt?:string;notes?:string})=>api<Purchase>(`/purchases/${id}`,{method:'PATCH',body:JSON.stringify(p)}),
 receive:(id:string,items:{itemId:string;quantity:number}[])=>api<Purchase>(`/purchases/${id}/receive`,{method:'POST',body:JSON.stringify({items})}),
 addPayment:(id:string,p:{amountCents:number;method?:string;notes?:string;paidAt?:string})=>api<Purchase>(`/purchases/${id}/payments`,{method:'POST',body:JSON.stringify(p)}),
};
