import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
export class RefreshDto { @IsOptional() @IsString() @MinLength(20) refreshToken?: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; }
export class ForgotPasswordDto { @IsEmail() email!: string; }
export class ResetPasswordDto { @IsString() @MinLength(20) token!: string; @IsString() @MinLength(8) password!: string; }
export class RegisterDto { @IsString() @MinLength(2) name!: string; @IsString() @MinLength(2) company!: string; @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() plan?: string; @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string; }
export class ChangePasswordDto { @IsString() @MinLength(8) currentPassword!: string; @IsString() @MinLength(8) newPassword!: string; }
