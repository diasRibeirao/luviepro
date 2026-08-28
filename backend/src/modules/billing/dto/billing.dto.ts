import { IsIn, IsOptional } from 'class-validator';
export class UpdatePlanDto { @IsIn(['starter','pro','business']) plan!: string; @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string; }
export class CreateCheckoutDto { @IsIn(['starter','pro','business']) plan!: string; @IsIn(['monthly','quarterly','semiannual','annual']) period!: string; }
