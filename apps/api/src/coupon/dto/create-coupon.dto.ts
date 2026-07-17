import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(['percent', 'fixed'])
  discountType!: 'percent' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsEnum(['all', 'service'])
  scope?: 'all' | 'service';

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perClientLimit?: number;

  @IsDateString()
  validFrom!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
