import { IsString, IsInt, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfter?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
