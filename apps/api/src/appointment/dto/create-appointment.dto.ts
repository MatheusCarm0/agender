import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsString()
  clientName!: string;

  @IsString()
  clientPhone!: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
