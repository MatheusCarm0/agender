import { IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  coverUrl?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, { message: 'Subdomain must contain only lowercase letters, numbers and hyphens' })
  subdomain?: string;
}
