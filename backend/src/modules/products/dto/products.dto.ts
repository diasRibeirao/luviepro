import { IsBoolean,IsIn,IsInt,IsOptional,IsString,Min,MinLength } from 'class-validator';
export class CreateProductDto{
 @IsString() @MinLength(2) name!:string; @IsString() @MinLength(1) sku!:string;
 @IsOptional() @IsString() categoryId?:string; @IsOptional() @IsString() description?:string;
 @IsOptional() @IsString() @MinLength(1) unit?:string; @IsOptional() @IsString() barcode?:string;
 @IsOptional() @IsString() supplierName?:string; @IsInt() @Min(0) costCents!:number; @IsInt() @Min(0) salePriceCents!:number;
 @IsOptional() @IsInt() @Min(0) minimumStock?:number; @IsOptional() @IsInt() @Min(0) initialStock?:number; @IsOptional() @IsString() imageUrl?:string; @IsOptional() @IsBoolean() active?:boolean;
}
export class UpdateProductDto extends CreateProductDto{}
export class CreateCategoryDto{@IsString() @MinLength(2) name!:string; @IsOptional() @IsBoolean() active?:boolean}
export class UpdateCategoryDto extends CreateCategoryDto{}
export class CreateProductUnitDto{ @IsString() @MinLength(1) code!:string; @IsString() @MinLength(2) name!:string; @IsOptional() @IsBoolean() active?:boolean; @IsOptional() @IsInt() @Min(0) sortOrder?:number }
export class UpdateProductUnitDto extends CreateProductUnitDto{}
export class StockMovementDto{
 @IsIn(['entry','exit','adjustment','loss','return']) type!:'entry'|'exit'|'adjustment'|'loss'|'return';
 @IsInt() quantity!:number; @IsOptional() @IsInt() @Min(0) unitCostCents?:number; @IsOptional() @IsString() reason?:string;
}
