import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateSupplierDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class PurchaseItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsInt() @Min(0) unitCostCents!: number;
}

export class CreatePurchaseDto {
  @IsString() supplierId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseItemDto) items!: PurchaseItemDto[];
  @IsOptional() @IsDateString() expectedAt?: string;
  @IsOptional() @IsDateString() paymentDueAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePurchaseDto {
  @IsOptional() @IsIn(['ordered','partially_received','received','canceled']) status?: string;
  @IsOptional() @IsDateString() expectedAt?: string;
  @IsOptional() @IsDateString() paymentDueAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ReceivePurchaseItemDto {
  @IsString() itemId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class ReceivePurchaseDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceivePurchaseItemDto) items!: ReceivePurchaseItemDto[];
}

export class CreatePurchasePaymentDto {
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsString() @MaxLength(40) method?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
