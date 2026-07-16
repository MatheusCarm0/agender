import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
