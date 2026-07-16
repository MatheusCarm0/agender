import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @IsEnum(['none', 'percent', 'fixed'])
  commissionType?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  commissionValue?: number;
}
