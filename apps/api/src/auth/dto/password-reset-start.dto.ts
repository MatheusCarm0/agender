import { IsEmail } from 'class-validator';

export class PasswordResetStartDto {
  @IsEmail()
  email!: string;
}
