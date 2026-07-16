import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateRecurringBlockDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
