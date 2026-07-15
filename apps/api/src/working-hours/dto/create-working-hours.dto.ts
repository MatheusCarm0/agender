import { IsString, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateWorkingHoursDto {
  @IsString()
  professionalId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;
}
