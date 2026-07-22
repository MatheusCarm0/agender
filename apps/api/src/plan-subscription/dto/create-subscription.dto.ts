import { IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsIn(['basico', 'profissional', 'pro'])
  plan!: 'basico' | 'profissional' | 'pro';
}
