import { IsString, Length, IsEmail } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
