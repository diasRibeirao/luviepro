import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean,IsIn,IsInt,IsOptional,IsString,Max,MaxLength,Min,MinLength} from 'class-validator';
export const CASA_NOVA_CATEGORIES=['Cozinha e mesa','Eletrodomésticos','Mercado','Hortifruti','Cama e banho'] as const;
export class UpdateCasaNovaListDto{@IsInt() @Min(2) @Max(999999) guests!:number}
export class CreateCasaNovaItemDto{
  @IsString() @MinLength(2) @MaxLength(80) itemName!:string;
  @IsIn(CASA_NOVA_CATEGORIES) category!:string;
  @IsInt() @Min(1) baseQuantity!:number;
  @IsOptional() @IsInt() @Min(1) quantityOverride?:number|null;
  @IsString() @MinLength(1) @MaxLength(20) unit!:string;
  @IsOptional() @IsBoolean() isScalable?:boolean;
  @IsOptional() @IsString() @MaxLength(120) notes?:string;
}
export class UpdateCasaNovaItemDto{
  @IsOptional() @IsBoolean() checked?:boolean;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) itemName?:string;
  @IsOptional() @IsIn(CASA_NOVA_CATEGORIES) category?:string;
  @IsOptional() @IsInt() @Min(1) baseQuantity?:number;
  @IsOptional() quantityOverride?:number|null;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unit?:string;
  @IsOptional() @IsBoolean() isScalable?:boolean;
  @IsOptional() @IsString() @MaxLength(120) notes?:string;
}
export class CasaNovaIdsDto{
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({each:true}) ids!:string[];
}
export class BulkUpdateCasaNovaItemsDto extends CasaNovaIdsDto{
  @IsOptional() @IsIn(CASA_NOVA_CATEGORIES) category?:string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unit?:string;
  @IsOptional() @IsBoolean() isScalable?:boolean;
  @IsOptional() @IsBoolean() checked?:boolean;
}
