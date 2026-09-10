import { IsString, IsEmail, MinLength, Length } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Código de 6 dígitos enviado por e-mail em POST /auth/register/start.
  @IsString()
  @Length(6, 6)
  code!: string;
}
