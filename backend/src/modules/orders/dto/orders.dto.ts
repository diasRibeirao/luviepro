import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const ORDER_STATUSES=['confirmed','preparing','ready','delivered','canceled'] as const;
export const PAYMENT_STATUSES=['pending','partial','paid','refunded'] as const;
export const DELIVERY_METHODS=['delivery','pickup'] as const;

export class UpdateOrderDto {
  @IsOptional() @IsIn(ORDER_STATUSES) status?: string;
  @IsOptional() @IsIn(DELIVERY_METHODS) deliveryMethod?: string;
  @IsOptional() @IsDateString() paymentDueAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class CreateOrderPaymentDto {
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsString() @MaxLength(80) method?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
