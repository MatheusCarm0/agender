import { IsIn, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['basico', 'profissional', 'pro'])
  plan!: 'basico' | 'profissional' | 'pro';

  // Ciclo de cobrança. Default mensal quando omitido (retrocompatível).
  @IsOptional()
  @IsIn(['monthly', 'annual'])
  cycle?: 'monthly' | 'annual';
}
