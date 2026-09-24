import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
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

  // Ciclo personalizado em dias. Quando informado (>= 1), sobrepõe billingCycle
  // no cálculo do fim do ciclo. Ex.: 45 = cada ciclo dura 45 dias.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  cycleDurationDays?: number;

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
