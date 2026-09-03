import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class PlatformAdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class PlatformTenantDto {
  @IsOptional()
  @IsIn(['active', 'suspended', 'cancelled'])
  status?: 'active' | 'suspended' | 'cancelled';

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'semiannual', 'annual'])
  planPeriod?: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
}

export class PlatformUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['owner', 'admin', 'commercial', 'operational', 'finance'])
  role?: 'owner' | 'admin' | 'commercial' | 'operational' | 'finance';
}

export class PlatformCreateTenantDto {
  @IsString()
  @MinLength(2)
  company!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  plan!: string;

  @IsIn(['monthly', 'quarterly', 'semiannual', 'annual'])
  period!: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
}

export class PlatformPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxClients?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxQuotesPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quarterlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  semiannualPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  annualPriceCents?: number;
}

export class PlatformCreatePlanDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,30}$/, {
    message: 'O código deve usar letras minúsculas, números e hífen',
  })
  plan!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsInt()
  @Min(-1)
  maxClients!: number;

  @IsInt()
  @Min(-1)
  maxQuotesPerMonth!: number;

  @IsInt()
  @Min(1)
  maxUsers!: number;

  @IsInt()
  @Min(0)
  monthlyPriceCents!: number;

  @IsInt()
  @Min(0)
  quarterlyPriceCents!: number;

  @IsInt()
  @Min(0)
  semiannualPriceCents!: number;

  @IsInt()
  @Min(0)
  annualPriceCents!: number;
}

export class PlatformListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
export class PlatformMasterCreateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;
}

export class PlatformMasterUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
