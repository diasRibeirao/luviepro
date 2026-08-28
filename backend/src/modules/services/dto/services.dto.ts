import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

export class ServiceTeamMemberDto {
  @IsString() @MinLength(2) role!: string;
  @IsInt() @Min(0) dailyRateCents!: number;
  @IsOptional() @IsBoolean() included?: boolean;
}
export class ServiceCostDto {
  @IsIn(['variable','fixed']) type!: string;
  @IsString() @MinLength(2) description!: string;
  @IsInt() @Min(0) amountCents!: number;
}
export class ServiceStageDto {
  @IsInt() @Min(1) sequence!: number;
  @IsString() @MinLength(2) description!: string;
  @IsOptional() @IsString() duration?: string;
}

export class CreateServiceDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsIn(['daily','hour','project','month','unit']) billingUnit!: string;
  @IsInt() @Min(0) dailyRateCents!: number;
  @IsInt() @Min(1) defaultDays!: number;
  @IsInt() @Min(1) people!: number;
  @IsInt() @Min(0) variableCostCents!: number;
  @IsInt() @Min(0) fixedCostCents!: number;
  @IsInt() @Min(0) @Max(10000) safetyMarginBps!: number;
  @IsOptional() @IsIn(['per_day','per_person','per_person_day','fixed']) variableCostMode?: string;
  @IsOptional() @IsIn(['daily','subtotal']) marginBase?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceTeamMemberDto) team?: ServiceTeamMemberDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceCostDto) costs?: ServiceCostDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceStageDto) stages?: ServiceStageDto[];
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(['daily','hour','project','month','unit']) billingUnit?: string;
  @IsOptional() @IsInt() @Min(0) dailyRateCents?: number;
  @IsOptional() @IsInt() @Min(1) defaultDays?: number;
  @IsOptional() @IsInt() @Min(1) people?: number;
  @IsOptional() @IsInt() @Min(0) variableCostCents?: number;
  @IsOptional() @IsInt() @Min(0) fixedCostCents?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10000) safetyMarginBps?: number;
  @IsOptional() @IsIn(['per_day','per_person','per_person_day','fixed']) variableCostMode?: string;
  @IsOptional() @IsIn(['daily','subtotal']) marginBase?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceTeamMemberDto) team?: ServiceTeamMemberDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceCostDto) costs?: ServiceCostDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceStageDto) stages?: ServiceStageDto[];
}

// Compatibilidade temporária com imports anteriores.
export class ServiceDto extends CreateServiceDto {}
