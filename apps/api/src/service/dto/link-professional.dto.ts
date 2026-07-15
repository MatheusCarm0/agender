import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkProfessionalDto {
  @IsString()
  professionalId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  priceOverride?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationOverride?: number;
}
