export type StandardPaymentPlan={depositCents:number;installments:number;installmentCents:number;lastInstallmentCents:number;cashCents:number};
export function standardPaymentPlan(totalCents:number,depositBps=3000,installments=10):StandardPaymentPlan{
  const safeTotal=Math.max(0,Math.round(totalCents||0));
  const safeInstallments=Math.max(1,Math.round(installments||1));
  const depositCents=Math.round(safeTotal*depositBps/10000);
  const balance=Math.max(0,safeTotal-depositCents);
  const installmentCents=Math.floor(balance/safeInstallments);
  const lastInstallmentCents=balance-installmentCents*(safeInstallments-1);
  return {depositCents,installments:safeInstallments,installmentCents,lastInstallmentCents,cashCents:safeTotal};
}
