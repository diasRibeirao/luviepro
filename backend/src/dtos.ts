import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, Max, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RefreshDto { @IsString() @MinLength(20) refreshToken!: string; }
export class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; }
export class RegisterDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) company!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(['starter','pro','business']) plan?: string;
  @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string;
}
export class UpdateAccountDto {
  @IsOptional() @IsString() name?: string; @IsOptional() @IsString() responsibleName?: string;
  @IsOptional() @IsString() phone?: string; @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() siteUrl?: string; @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() primaryColor?: string; @IsOptional() @IsString() secondaryColor?: string;
  @IsOptional() @IsString() proposalText?: string;
  @IsOptional() @IsString() legalName?: string; @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() stateRegistration?: string; @IsOptional() @IsString() municipalRegistration?: string;
  @IsOptional() @IsString() zipCode?: string; @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() addressNumber?: string; @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() neighborhood?: string; @IsOptional() @IsString() city?: string; @IsOptional() @IsString() state?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) proposalValidityDays?: number;
  @IsOptional() @IsString() proposalPaymentTerms?: string; @IsOptional() @IsString() proposalFooter?: string; @IsOptional() @IsString() pixKey?: string;
}
export class UpdatePlanDto { @IsIn(['starter','pro','business']) plan!: string; @IsOptional() @IsIn(['monthly','quarterly','semiannual','annual']) period?: string; }
export class ClientDto {
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
}
export class CalculateDto { @IsInt() @Min(0) dailyRateCents!:number; @IsInt() @Min(0) days!:number; @IsInt() @Min(0) people!:number; @IsInt() @Min(0) variableCostCents!:number; @IsInt() @Min(0) fixedCostCents!:number; @IsInt() @Min(0) safetyMarginBps!:number; }
class QuoteItemDto { @IsString() serviceId!:string; @IsOptional() @IsInt() @Min(0) days?:number; @IsOptional() @IsInt() @Min(0) people?:number; @IsOptional() @IsInt() @Min(0) dailyRateCents?:number; @IsOptional() @IsInt() @Min(0) variableCostCents?:number; @IsOptional() @IsInt() @Min(0) fixedCostCents?:number; @IsOptional() @IsInt() @Min(0) safetyMarginBps?:number; }
export class CreateQuoteDto { @IsString() clientId!:string; @IsArray() @ValidateNested({each:true}) @Type(()=>QuoteItemDto) items!:QuoteItemDto[]; @IsOptional() @IsInt() @Min(0) discountBps?:number; @IsOptional() @IsInt() @Min(1) validityDays?:number; @IsOptional() @IsString() notes?:string; }

export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsIn(['admin','commercial','operational','finance']) role!: string;
  @IsOptional() @IsString() customProfileId?: string;
}
export class AcceptInvitationDto {
  @IsString() @MinLength(8) password!: string;
}
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsIn(['admin','commercial','operational','finance']) role?: string;
  @IsOptional() @IsString() customProfileId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CreateAccessProfileDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @IsString({each:true}) permissions!: string[];
}
export class UpdateAccessProfileDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({each:true}) permissions?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}
export class QuoteStatusDto { @IsIn(['draft','sent','rejected']) status!: string; }
export class UpdateProjectDto {
  @IsOptional() @IsIn(['scheduled','in_progress','completed','cancelled']) status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}
export class CreateProjectTaskDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsIn(['low','medium','high']) priority?: string;
}
export class UpdateProjectTaskDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['pending','in_progress','completed']) status?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsIn(['low','medium','high']) priority?: string;
}
export class CreateProjectNoteDto { @IsString() @MinLength(2) content!: string; }

export class UpdateQuoteDto {
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>QuoteItemDto) items?: QuoteItemDto[];
  @IsOptional() @IsInt() @Min(0) @Max(10000) discountBps?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) validityDays?: number;
  @IsOptional() @IsString() notes?: string;
}

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
export class ServiceDto {
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
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceTeamMemberDto) team?: ServiceTeamMemberDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceCostDto) costs?: ServiceCostDto[];
  @IsOptional() @IsArray() @ValidateNested({each:true}) @Type(()=>ServiceStageDto) stages?: ServiceStageDto[];
}
export class PublicProposalDecisionDto {
  @IsIn(['approved','rejected']) decision!: string;
  @IsString() @MinLength(2) name!: string;
}

export class ChangePasswordDto { @IsString() @MinLength(8) currentPassword!: string; @IsString() @MinLength(8) newPassword!: string; }

export class CalendarEventDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['appointment','visit','meeting','deadline','personal']) type!: string;
  @IsString() startAt!: string;
  @IsOptional() @IsString() endAt?: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsIn(['none','weekly','monthly']) recurrence?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10080) reminderMinutes?: number;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() projectId?: string;
}
export class UpdateCalendarEventDto extends CalendarEventDto {
  @IsOptional() @IsIn(['active','cancelled']) status?: string;
}
export class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() agendaReminders?: boolean;
  @IsOptional() @IsBoolean() projectDeadlines?: boolean;
  @IsOptional() @IsBoolean() quoteExpirations?: boolean;
  @IsOptional() @IsBoolean() taskDeadlines?: boolean;
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(10080) reminderMinutes?: number;
}
