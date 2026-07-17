import { IsOptional, IsBoolean, IsNumber, IsDateString, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perClientLimit?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
