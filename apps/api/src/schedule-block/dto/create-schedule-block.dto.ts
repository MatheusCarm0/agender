import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateScheduleBlockDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
