import { IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class UpdateWorkingHoursDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}
