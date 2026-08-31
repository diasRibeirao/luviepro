import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreateFinancialCategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsIn(['income','expense']) type!: 'income'|'expense';
}


export class UpdateFinancialCategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsIn(['income','expense']) type?: 'income'|'expense';
  @IsOptional() @IsBoolean() active?: boolean;
}


export class CreateFinancialPaymentMethodDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9_\-]+$/) @MaxLength(40) code?: string;
}

export class UpdateFinancialPaymentMethodDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateFinancialEntryDto {
  @IsIn(['income','expense']) type!: 'income'|'expense';
  @IsString() @MinLength(2) description!: string;
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsIn(['pending','paid']) status?: 'pending'|'paid';
  @IsOptional() @IsString() @MaxLength(40) method?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class PayFinancialEntryDto {
  @IsOptional() @IsString() @MaxLength(40) method?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
