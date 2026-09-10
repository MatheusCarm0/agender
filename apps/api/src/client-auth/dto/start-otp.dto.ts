import { IsEmail } from 'class-validator';

export class StartOtpDto {
  @IsEmail()
  email!: string;
}
