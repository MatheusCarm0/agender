import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(['admin', 'professional', 'receptionist'])
  role!: 'admin' | 'professional' | 'receptionist';

  @IsOptional()
  @IsString()
  professionalId?: string;
}
