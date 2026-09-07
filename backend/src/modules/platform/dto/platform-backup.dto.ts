import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlatformCreateBackupDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
