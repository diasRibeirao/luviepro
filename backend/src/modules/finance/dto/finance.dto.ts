import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateFinancialCategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsIn(['income','expense']) type!: 'income'|'expense';
}

export class CreateFinancialEntryDto {
  @IsIn(['income','expense']) type!: 'income'|'expense';
  @IsString() @MinLength(2) description!: string;
  @IsInt() @Min(1) amountCents!: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsIn(['pending','paid']) status?: 'pending'|'paid';
  @IsOptional() @IsIn(['pix','cash','bank_transfer','card','boleto','other']) method?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class PayFinancialEntryDto {
  @IsOptional() @IsIn(['pix','cash','bank_transfer','card','boleto','other']) method?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
