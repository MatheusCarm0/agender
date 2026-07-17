import { IsString, MinLength } from 'class-validator';

export class StartOtpDto {
  @IsString()
  @MinLength(8)
  phone!: string;
}
