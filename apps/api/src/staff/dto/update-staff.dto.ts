import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsEnum(['admin', 'professional', 'receptionist'])
  role?: 'admin' | 'professional' | 'receptionist';

  @IsOptional()
  @IsString()
  professionalId?: string | null;
}
