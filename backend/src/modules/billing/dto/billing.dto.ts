import { IsIn, IsOptional } from 'class-validator';
export class UpdatePlanDto { @IsIn(['starter','pro','business']) plan!: string; @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string; }
export class CreateCheckoutDto { @IsIn(['starter','pro','business']) plan!: string; @IsIn(['monthly','quarterly','semiannual','annual']) period!: string; }
export class MercadoPagoWebhookDto { id?:string|number; type?:string; action?:string; notification_id?:string|number; date_created?:string; created_at?:string; data?:{id?:string|number}; }
