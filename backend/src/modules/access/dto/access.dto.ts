import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateUserDto { @IsString() @MinLength(2) name!: string; @IsEmail() email!: string; @IsIn(['admin','commercial','operational','finance']) role!: string; @IsOptional() @IsString() customProfileId?: string; }
export class AcceptInvitationDto { @IsString() @MinLength(8) password!: string; }
export class UpdateUserDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsIn(['admin','commercial','operational','finance']) role?: string; @IsOptional() @IsString() customProfileId?: string; @IsOptional() @IsBoolean() active?: boolean; }
export class CreateAccessProfileDto { @IsString() @MinLength(2) name!: string; @IsOptional() @IsString() description?: string; @IsArray() @IsString({each:true}) permissions!: string[]; }
export class UpdateAccessProfileDto { @IsOptional() @IsString() @MinLength(2) name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsArray() @IsString({each:true}) permissions?: string[]; @IsOptional() @IsBoolean() active?: boolean; }
