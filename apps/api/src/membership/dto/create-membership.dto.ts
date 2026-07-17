import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateMembershipDto {
  @IsString()
  clientId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsDateString()
  cycleStart?: string;
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended', 'cancelled', 'expired'])
  status?: 'pending' | 'active' | 'suspended' | 'cancelled' | 'expired';

  @IsOptional()
  @IsEnum(['unpaid', 'paid'])
  paymentStatus?: 'unpaid' | 'paid';
}
