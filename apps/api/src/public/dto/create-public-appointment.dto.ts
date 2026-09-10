import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class CreatePublicAppointmentDto {
  @IsString()
  professionalId!: string;

  @IsString()
  serviceId!: string;

  @IsString()
  clientName!: string;

  @IsString()
  clientPhone!: string;

  // E-mail é obrigatório: é o canal de entrega de código/notificação no beta.
  @IsEmail()
  clientEmail!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
