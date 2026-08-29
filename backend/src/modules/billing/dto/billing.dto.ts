import { IsIn, IsOptional, IsString } from 'class-validator';
export class UpdatePlanDto { @IsString() plan!: string; @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string; }
export class CreateCheckoutDto { @IsString() plan!: string; @IsIn(['monthly','quarterly','semiannual','annual']) period!: string; }
export class MercadoPagoWebhookDto { id?:string|number; type?:string; action?:string; notification_id?:string|number; date_created?:string; created_at?:string; data?:{id?:string|number}; }
