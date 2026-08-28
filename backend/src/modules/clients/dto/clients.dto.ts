import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsIn(['individual','company']) type!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() stateRegistration?: string;
  @IsOptional() @IsString() municipalRegistration?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateClientDto {
  @IsOptional() @IsIn(['individual','company']) type?: string;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() stateRegistration?: string;
  @IsOptional() @IsString() municipalRegistration?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

// Compatibilidade temporária com imports anteriores.
export class ClientDto extends CreateClientDto {}
