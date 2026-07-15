import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
