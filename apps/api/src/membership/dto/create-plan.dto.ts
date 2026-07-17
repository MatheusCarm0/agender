import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsEnum(['monthly', 'quarterly', 'yearly'])
  billingCycle?: 'monthly' | 'quarterly' | 'yearly';

  @IsEnum(['unlimited', 'limited'])
  usageLimitType!: 'unlimited' | 'limited';

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
