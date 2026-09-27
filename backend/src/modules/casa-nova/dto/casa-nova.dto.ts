import {ArrayMaxSize,ArrayMinSize,IsArray,IsBoolean,IsInt,IsOptional,IsString,Max,MaxLength,Min,MinLength} from 'class-validator';
export const CASA_NOVA_CATEGORIES=['Cozinha e mesa','Eletrodomésticos','Mercado','Hortifruti','Cama e banho'] as const;
export class UpdateCasaNovaListDto{
  @IsOptional() @IsInt() @Min(2) @Max(999999) guests?:number;
  @IsOptional() @IsString() @MaxLength(80) clientId?:string|null;
}
export class CreateCasaNovaItemDto{
  @IsString() @MinLength(2) @MaxLength(80) itemName!:string;
  @IsString() @MinLength(2) @MaxLength(60) category!:string;
  @IsInt() @Min(1) baseQuantity!:number;
  @IsOptional() @IsInt() @Min(1) quantityOverride?:number|null;
  @IsString() @MinLength(1) @MaxLength(20) unit!:string;
  @IsOptional() @IsBoolean() isScalable?:boolean;
  @IsOptional() @IsString() @MaxLength(120) notes?:string;
}
export class UpdateCasaNovaItemDto{
  @IsOptional() @IsBoolean() checked?:boolean;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) itemName?:string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) category?:string;
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
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) category?:string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20) unit?:string;
  @IsOptional() @IsBoolean() isScalable?:boolean;
  @IsOptional() @IsBoolean() checked?:boolean;
}
