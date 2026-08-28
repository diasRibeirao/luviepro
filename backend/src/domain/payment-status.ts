export type PaymentStatus='approved'|'pending'|'rejected'|'cancelled'|'refunded'|'charged_back'|'error';
const STATUS_MAP:Record<string,PaymentStatus>={approved:'approved',pending:'pending',in_process:'pending',rejected:'rejected',cancelled:'cancelled',refunded:'refunded',charged_back:'charged_back',error:'error'};
export function normalizePaymentStatus(status?:string|null):PaymentStatus{return STATUS_MAP[String(status??'').toLowerCase()]??'pending';}
export function isTerminalPaymentStatus(status:string){return ['approved','rejected','cancelled','refunded','charged_back'].includes(status);}
