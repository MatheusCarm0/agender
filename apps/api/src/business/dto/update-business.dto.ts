import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsIn,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

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

  // Política de cobrança no agendamento (ver docs/pagamentos.md, Fluxo 2).
  @IsOptional()
  @IsIn(['none', 'deposit', 'full'])
  bookingPaymentPolicy?: 'none' | 'deposit' | 'full';

  // Obrigatório (1–100) quando a política é 'deposit' — senão a cobrança
  // calcularia 0 silenciosamente.
  @ValidateIf((o) => o.bookingPaymentPolicy === 'deposit')
  @IsInt()
  @Min(1)
  @Max(100)
  depositPercent?: number;
}
