import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'partial'])
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
