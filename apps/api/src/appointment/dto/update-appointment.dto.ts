import { IsOptional, IsEnum, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
