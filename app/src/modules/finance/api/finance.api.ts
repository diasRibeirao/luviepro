import {api} from '../../../api';
export type FinanceSummary={receivableCents:number;payableCents:number;overdueReceivableCents:number;overduePayableCents:number;dueTodayReceivableCents:number;dueTodayPayableCents:number;receivedCents:number;paidCents:number;netCashCents:number;receivedMonthCents:number;paidMonthCents:number;netCashMonthCents:number;projectedMonthCents:number};
export type FinanceCategory={id:string;name:string;type:'income'|'expense';active:boolean;sortOrder:number;usageCount?:number};
export type FinancePaymentMethod={id:string;code:string;name:string;active:boolean;sortOrder:number;usageCount?:number};
export type FinanceEntry={id:string;source:'order'|'purchase'|'manual';type:'income'|'expense';status:string;amountCents:number;date:string;dueAt?:string|null;method?:string|null;notes?:string|null;category?:string|null;referenceId:string;referenceNumber:string;counterparty:string;description:string};
export type FinanceObligationItem={id:string;productId:string;productName:string;sku:string;unit:string;quantity:number;unitPriceCents:number;totalCents:number};
export type FinanceObligation={id:string;source:'order'|'purchase'|'manual';type:'income'|'expense';status:string;amountCents:number;dueAt?:string|null;description:string;counterparty:string;category:string;referenceNumber:string;quoteId?:string;quoteNumber?:string;orderStatus?:string;paymentStatus?:string;totalCents?:number;amountPaidCents?:number;paymentPlan?:'cash'|'installments';installments?:number;paymentLinkUrl?:string|null;clientEmail?:string|null;clientPhone?:string|null;clientWhatsapp?:string|null;items?:FinanceObligationItem[]};
export type CreateFinanceEntry={type:'income'|'expense';description:string;amountCents:number;categoryId?:string;counterparty?:string;dueAt?:string;status?:'pending'|'paid';method?:string;notes?:string;paidAt?:string};
export type FinanceReportMonth={key:string;label:string;incomeCents:number;expenseCents:number;netCents:number;projectedIncomeCents:number;projectedExpenseCents:number;projectedNetCents:number};
export type FinanceReportCategory={name:string;type:'income'|'expense';amountCents:number};
export type FinanceReport={months:number;from:string;to:string;incomeCents:number;expenseCents:number;netCents:number;monthly:FinanceReportMonth[];categories:FinanceReportCategory[]};
export const financeApi={
 summary:()=>api<FinanceSummary>('/finance/summary'),
 entries:()=>api<FinanceEntry[]>('/finance/entries'),
 obligations:()=>api<FinanceObligation[]>('/finance/obligations'),
 report:(months=12)=>api<FinanceReport>(`/finance/report?months=${months}`),
 categories:()=>api<FinanceCategory[]>('/finance/categories'),
 manageCategories:()=>api<FinanceCategory[]>('/finance/categories/manage'),
 paymentMethods:()=>api<FinancePaymentMethod[]>('/finance/payment-methods'),
 managePaymentMethods:()=>api<FinancePaymentMethod[]>('/finance/payment-methods/manage'),
 createCategory:(body:{name:string;type:'income'|'expense'})=>api<FinanceCategory>('/finance/categories',{method:'POST',body:JSON.stringify(body)}),
 updateCategory:(id:string,body:{name?:string;type?:'income'|'expense';active?:boolean})=>api<FinanceCategory>(`/finance/categories/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
 createPaymentMethod:(body:{name:string;code?:string})=>api<FinancePaymentMethod>('/finance/payment-methods',{method:'POST',body:JSON.stringify(body)}),
 updatePaymentMethod:(id:string,body:{name?:string;active?:boolean})=>api<FinancePaymentMethod>(`/finance/payment-methods/${id}`,{method:'PATCH',body:JSON.stringify(body)}),
 createEntry:(body:CreateFinanceEntry)=>api('/finance/entries',{method:'POST',body:JSON.stringify(body)}),
 payEntry:(id:string,body:{method?:string;notes?:string;paidAt?:string})=>api(`/finance/entries/${id}/pay`,{method:'PATCH',body:JSON.stringify(body)}),
 cancelEntry:(id:string)=>api(`/finance/entries/${id}/cancel`,{method:'PATCH',body:'{}'}),
};
