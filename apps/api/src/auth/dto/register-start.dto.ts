import { IsEmail } from 'class-validator';

export class RegisterStartDto {
  @IsEmail()
  email!: string;
}
